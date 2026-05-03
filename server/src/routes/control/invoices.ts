/**
 * Control-plane Invoice Routes — TTP Slice 4: Invoice Domain
 *
 * GET    /api/control/invoices              — list invoices (cross-tenant, admin)
 * GET    /api/control/invoices/:invoiceId   — get invoice detail (admin)
 * PATCH  /api/control/invoices/:invoiceId/transition — admin lifecycle transition
 *
 * Auth: adminAuthMiddleware inherited from parent control plugin (control.ts addHook).
 * PATCH is restricted to SUPER_ADMIN role.
 *
 * Admin transitions (§34 seeds, PLATFORM_ADMIN):
 *   SUBMITTED    → UNDER_REVIEW
 *   UNDER_REVIEW → VERIFIED        (requires_maker_checker=true; MC gate enforced)
 *   UNDER_REVIEW → INELIGIBLE
 *   VERIFIED     → SUPERSEDED
 *   DISPUTED     → UNDER_REVIEW    (re-open after dispute resolution)
 *   INELIGIBLE   → UNDER_REVIEW    (reconsideration)
 *   DRAFT/SUBMITTED/UNDER_REVIEW/DISPUTED → WITHDRAWN
 *
 * Governance: TTP Slice 4, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { requireAdminRole } from '../../middleware/auth.js';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
} from '../../utils/response.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog, createAdminAudit } from '../../lib/auditLog.js';
import {
  InvoiceService,
  InvoiceNotFoundError,
  InvoiceTerminalStateError,
  InvoiceTransitionNotAllowedError,
  InvoiceMakerCheckerRequiredError,
} from '../../services/invoice.service.js';
import {
  TTP_INVOICE_STATE,
} from '../../ttp/ttp.constants.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

// ─── Utilities ────────────────────────────────────────────────────────────────

function makeTxBoundPrisma(tx: Prisma.TransactionClient): PrismaClient {
  return new Proxy(tx as unknown as PrismaClient, {
    get(target, prop) {
      if (prop === '$transaction') {
        return (cb: (client: Prisma.TransactionClient) => Promise<unknown>) => cb(tx);
      }
      return (target as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

/**
 * Admin read context — cross-tenant read access via app.is_admin flag.
 */
async function withInvoiceAdminReadContext<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const ctx: DatabaseContext = {
    orgId: ADMIN_SENTINEL_ID,
    actorId: ADMIN_SENTINEL_ID,
    realm: 'control',
    requestId: randomUUID(),
  };
  return withDbContext(prisma, ctx, async tx => {
    await (tx as unknown as PrismaClient).$executeRaw`SET LOCAL app.is_admin = 'true'`;
    return callback(tx);
  });
}

/**
 * Admin write context — org-scoped write with RLS admin flag + session config.
 */
async function withInvoiceAdminWriteContext<T>(
  orgId: string,
  adminId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.org_id', $1, true)`, orgId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.actor_id', $1, true)`, adminId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'admin', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.request_id', $1, true)`, randomUUID());
    await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'off', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
    return callback(tx);
  });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

const invoiceIdParamSchema = z.object({ invoiceId: uuidSchema });

const listQuerySchema = z.object({
  org_id: uuidSchema.optional(),
  trade_id: uuidSchema.optional(),
  state_key: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const transitionBodySchema = z.object({
  to_state_key: z.enum(
    [
      TTP_INVOICE_STATE.UNDER_REVIEW,
      TTP_INVOICE_STATE.VERIFIED,
      TTP_INVOICE_STATE.INELIGIBLE,
      TTP_INVOICE_STATE.SUPERSEDED,
      TTP_INVOICE_STATE.WITHDRAWN,
    ],
    {
      errorMap: () => ({
        message:
          'to_state_key must be one of: UNDER_REVIEW, VERIFIED, INELIGIBLE, SUPERSEDED, WITHDRAWN',
      }),
    },
  ),
  reason: z.string().trim().min(1).max(2000),
  maker_user_id: uuidSchema.optional().nullable(),
  checker_user_id: uuidSchema.optional().nullable(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlInvoiceRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/control/invoices
   * List invoices cross-tenant (admin view). Supports filters: org_id, trade_id, state_key.
   */
  fastify.get('/', async (request, reply) => {
    if (!request.adminId) return sendError(reply, 'UNAUTHORIZED', 'Admin auth required', 401);

    const queryResult = listQuerySchema.safeParse(request.query);
    if (!queryResult.success) return sendValidationError(reply, queryResult.error.errors);

    try {
      const records = await withInvoiceAdminReadContext(async tx => {
        const svc = new InvoiceService(makeTxBoundPrisma(tx));
        return svc.adminListInvoices(queryResult.data);
      });
      return sendSuccess(reply, records);
    } catch (err) {
      request.log.error(err, 'control.invoice.list');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to list invoices', 500);
    }
  });

  /**
   * GET /api/control/invoices/:invoiceId
   * Get a single invoice with full admin detail.
   */
  fastify.get('/:invoiceId', async (request, reply) => {
    if (!request.adminId) return sendError(reply, 'UNAUTHORIZED', 'Admin auth required', 401);

    const paramResult = invoiceIdParamSchema.safeParse(request.params);
    if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

    const { invoiceId } = paramResult.data;

    try {
      const record = await withInvoiceAdminReadContext(async tx => {
        const svc = new InvoiceService(makeTxBoundPrisma(tx));
        return svc.adminGetInvoice(invoiceId);
      });
      return sendSuccess(reply, record);
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) return sendNotFound(reply, err.message);
      request.log.error(err, 'control.invoice.get');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to get invoice', 500);
    }
  });

  /**
   * PATCH /api/control/invoices/:invoiceId/transition
   *
   * Admin lifecycle transition. Restricted to SUPER_ADMIN role.
   * UNDER_REVIEW → VERIFIED requires maker_user_id + checker_user_id when
   * gross_amount >= ttp_maker_checker_threshold_inr feature flag (OQ-TTP-003).
   */
  fastify.patch(
    '/:invoiceId/transition',
    { preHandler: requireAdminRole('SUPER_ADMIN') },
    async (request, reply) => {
      if (!request.adminId) return sendError(reply, 'UNAUTHORIZED', 'Admin auth required', 401);

      const paramResult = invoiceIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = transitionBodySchema.safeParse(request.body);
      if (!bodyResult.success) return sendValidationError(reply, bodyResult.error.errors);

      const adminId = request.adminId;
      const { invoiceId } = paramResult.data;
      const { to_state_key, reason, maker_user_id, checker_user_id } = bodyResult.data;

      try {
        // First, load the invoice to get its org_id for the write context
        let orgId: string;
        const invoiceForOrg = await withInvoiceAdminReadContext(async tx => {
          const svc = new InvoiceService(makeTxBoundPrisma(tx));
          return svc.adminGetInvoice(invoiceId);
        });
        orgId = invoiceForOrg.org_id;

        const record = await withInvoiceAdminWriteContext(orgId, adminId, async tx => {
          const svc = new InvoiceService(makeTxBoundPrisma(tx));
          return svc.adminTransition(adminId, invoiceId, {
            to_state_key,
            reason,
            maker_user_id: maker_user_id ?? null,
            checker_user_id: checker_user_id ?? null,
          });
        });

        await writeAuditLog(prisma, createAdminAudit(adminId, 'INVOICE_ADMIN_TRANSITION', 'invoice', {
          invoice_id: invoiceId,
          to_state_key,
          org_id: orgId,
        }));

        return sendSuccess(reply, record);
      } catch (err) {
        if (err instanceof InvoiceNotFoundError) return sendNotFound(reply, err.message);
        if (err instanceof InvoiceTerminalStateError)
          return sendError(reply, 'TERMINAL_STATE', err.message, 422);
        if (err instanceof InvoiceTransitionNotAllowedError)
          return sendError(reply, 'TRANSITION_NOT_ALLOWED', err.message, 422);
        if (err instanceof InvoiceMakerCheckerRequiredError)
          return sendError(reply, 'MAKER_CHECKER_REQUIRED', err.message, 422);
        request.log.error(err, 'control.invoice.transition');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to transition invoice', 500);
      }
    },
  );
};

export default controlInvoiceRoutes;
