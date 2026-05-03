/**
 * Tenant Buyer Invoice Approval Routes — TTP Slice 4: Invoice Domain
 *
 * GET  /api/tenant/trades/:tradeId/invoice-approval
 *   — buyer views invoices raised against their trade (buyer_org_id scope)
 *
 * POST /api/tenant/invoices/:invoiceId/buyer-action
 *   — buyer acknowledges (ACKNOWLEDGE) or disputes (DISPUTE) an invoice
 *
 * Buyer visibility constraint: responses MUST NOT expose credit assessment data,
 * CIBIL data, internal risk notes, partner-routing stubs, finance-readiness payload,
 * internal org UUIDs, or admin-only notes.
 *
 * D-017-A: buyerOrgId derived from JWT/dbContext only. z.never() rejects org_id from body.
 *
 * Governance: TTP Slice 4, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
} from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog } from '../../lib/auditLog.js';
import {
  InvoiceService,
  InvoiceBuyerMismatchError,
  InvoiceTerminalStateError,
  InvoiceBuyerActionNotAllowedError,
} from '../../services/invoice.service.js';

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

// ─── Schemas ──────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

const tradeIdParamSchema = z.object({ tradeId: uuidSchema });
const invoiceIdParamSchema = z.object({ invoiceId: uuidSchema });

// D-017-A: org_id must never come from request body
const buyerActionBodySchema = z.object({
  org_id: z
    .never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) })
    .optional(),
  action: z.enum(['ACKNOWLEDGE', 'DISPUTE'], {
    errorMap: () => ({ message: "action must be 'ACKNOWLEDGE' or 'DISPUTE'" }),
  }),
  reason: z.string().trim().min(1).max(2000),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantInvoiceApprovalRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/tenant/trades/:tradeId/invoice-approval
   *
   * Buyer views all invoices raised against a trade where they are the buyer.
   * Returns buyer-safe records only (no seller-internal, credit, or admin fields).
   */
  fastify.get(
    '/trades/:tradeId/invoice-approval',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = tradeIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const buyerOrgId = dbContext.orgId;
      const { tradeId } = paramResult.data;

      try {
        const records = await withDbContext(prisma, dbContext, async tx => {
          const svc = new InvoiceService(makeTxBoundPrisma(tx));
          return svc.getBuyerInvoicesForTrade(buyerOrgId, tradeId);
        });
        return sendSuccess(reply, records);
      } catch (err) {
        request.log.error(err, 'invoice-approval.list');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to retrieve invoice approval data', 500);
      }
    },
  );

  /**
   * POST /api/tenant/invoices/:invoiceId/buyer-action
   *
   * Buyer acknowledges or disputes an invoice.
   *   ACKNOWLEDGE: audit-only log entry; no state change.
   *   DISPUTE:     transitions invoice to DISPUTED from SUBMITTED or UNDER_REVIEW.
   *
   * buyer_org_id is validated against authenticated org inside the service.
   */
  fastify.post(
    '/invoices/:invoiceId/buyer-action',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = invoiceIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = buyerActionBodySchema.safeParse(request.body);
      if (!bodyResult.success) return sendValidationError(reply, bodyResult.error.errors);

      const buyerOrgId = dbContext.orgId;
      const userId = (request as any).userId ?? null;
      const { invoiceId } = paramResult.data;
      const { action, reason } = bodyResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const svc = new InvoiceService(makeTxBoundPrisma(tx));
          const res = await svc.buyerAction(buyerOrgId, invoiceId, action, reason, userId);
          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: buyerOrgId,
            actorType: 'USER',
            actorId: userId,
            action: `invoice.buyer.${action.toLowerCase()}`,
            entity: 'invoices',
            entityId: invoiceId,
            afterJson: { action, new_state_key: res.new_state_key },
          });
          return res;
        });

        return sendSuccess(reply, result);
      } catch (err) {
        if (err instanceof InvoiceBuyerMismatchError) return sendNotFound(reply, 'Invoice not found');
        if (err instanceof InvoiceTerminalStateError)
          return sendError(reply, 'TERMINAL_STATE', err.message, 422);
        if (err instanceof InvoiceBuyerActionNotAllowedError)
          return sendError(reply, 'BUYER_ACTION_NOT_ALLOWED', err.message, 422);
        request.log.error(err, 'invoice.buyer-action');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to process buyer action', 500);
      }
    },
  );
};

export default tenantInvoiceApprovalRoutes;
