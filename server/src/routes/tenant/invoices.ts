/**
 * Tenant Invoice Routes — TTP Slice 4: Invoice Domain
 *
 * POST   /api/tenant/invoices              — create invoice (seller)
 * GET    /api/tenant/invoices              — list invoices (seller)
 * GET    /api/tenant/invoices/:invoiceId   — get invoice detail (seller)
 * POST   /api/tenant/invoices/:invoiceId/transition — lifecycle transition (seller)
 *
 * D-017-A: org_id derived from JWT/dbContext only. z.never() rejects org_id from body.
 * Seller-scope: only invoices where org_id = authenticated org are accessible.
 * Tenant transition: only DRAFT→SUBMITTED is permitted via this route.
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
  sendForbidden,
} from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog } from '../../lib/auditLog.js';
import {
  InvoiceService,
  InvoiceNotFoundError,
  InvoiceTradeNotFoundError,
  InvoiceSellerMismatchError,
  InvoiceCurrencyMismatchError,
  InvoiceDuplicateNumberError,
  InvoiceTerminalStateError,
  InvoiceTransitionNotAllowedError,
} from '../../services/invoice.service.js';
import { TTP_INVOICE_STATE } from '../../ttp/ttp.constants.js';

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

// D-017-A: org_id must never come from request body
const createBodySchema = z.object({
  org_id: z
    .never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) })
    .optional(),
  trade_id: uuidSchema,
  invoice_number: z.string().trim().min(1).max(100),
  invoice_date: z.string().datetime({ offset: true }),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  currency: z.string().trim().min(3).max(10),
  gross_amount: z.number().positive(),
  document_url: z.string().url().max(1000).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

const transitionBodySchema = z.object({
  to_state_key: z.literal(TTP_INVOICE_STATE.SUBMITTED, {
    errorMap: () => ({ message: `to_state_key must be 'SUBMITTED' for tenant transitions` }),
  }),
  reason: z.string().trim().min(1).max(2000),
});

const invoiceIdParamSchema = z.object({ invoiceId: uuidSchema });

const listQuerySchema = z.object({
  trade_id: uuidSchema.optional(),
  state_key: z.string().optional(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantInvoiceRoutes: FastifyPluginAsync = async fastify => {
  /**
   * POST /api/tenant/invoices
   * Create an invoice in DRAFT state for the authenticated seller org.
   */
  fastify.post(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const bodyResult = createBodySchema.safeParse(request.body);
      if (!bodyResult.success) return sendValidationError(reply, bodyResult.error.errors);

      const orgId = dbContext.orgId;
      const userId = (request as any).userId ?? null;

      try {
        const record = await withDbContext(prisma, dbContext, async tx => {
          const svc = new InvoiceService(makeTxBoundPrisma(tx));
          const inv = await svc.createInvoice(orgId, userId, bodyResult.data);
          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: orgId,
            actorType: 'USER',
            actorId: userId,
            action: 'invoice.created',
            entity: 'invoices',
            entityId: inv.id,
            afterJson: { invoice_number: inv.invoice_number, trade_id: inv.trade_id },
          });
          return inv;
        });

        return sendSuccess(reply, record, 201);
      } catch (err) {
        if (err instanceof InvoiceTradeNotFoundError) return sendNotFound(reply, err.message);
        if (err instanceof InvoiceSellerMismatchError) return sendForbidden(reply, err.message);
        if (err instanceof InvoiceCurrencyMismatchError)
          return sendError(reply, 'CURRENCY_MISMATCH', err.message, 422);
        if (err instanceof InvoiceDuplicateNumberError)
          return sendError(reply, 'DUPLICATE_INVOICE_NUMBER', err.message, 409);
        request.log.error(err, 'invoice.create');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to create invoice', 500);
      }
    },
  );

  /**
   * GET /api/tenant/invoices
   * List invoices for the authenticated seller org.
   */
  fastify.get(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const queryResult = listQuerySchema.safeParse(request.query);
      if (!queryResult.success) return sendValidationError(reply, queryResult.error.errors);

      const orgId = dbContext.orgId;

      try {
        const records = await withDbContext(prisma, dbContext, async tx => {
          const svc = new InvoiceService(makeTxBoundPrisma(tx));
          return svc.listInvoices(orgId, queryResult.data);
        });
        return sendSuccess(reply, records);
      } catch (err) {
        request.log.error(err, 'invoice.list');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list invoices', 500);
      }
    },
  );

  /**
   * GET /api/tenant/invoices/:invoiceId
   * Get a single invoice detail for the authenticated seller org.
   */
  fastify.get(
    '/:invoiceId',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = invoiceIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const orgId = dbContext.orgId;
      const { invoiceId } = paramResult.data;

      try {
        const record = await withDbContext(prisma, dbContext, async tx => {
          const svc = new InvoiceService(makeTxBoundPrisma(tx));
          return svc.getInvoice(orgId, invoiceId);
        });
        return sendSuccess(reply, record);
      } catch (err) {
        if (err instanceof InvoiceNotFoundError) return sendNotFound(reply, err.message);
        request.log.error(err, 'invoice.get');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to get invoice', 500);
      }
    },
  );

  /**
   * POST /api/tenant/invoices/:invoiceId/transition
   * Tenant seller lifecycle transition. Only DRAFT→SUBMITTED is permitted.
   */
  fastify.post(
    '/:invoiceId/transition',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = invoiceIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = transitionBodySchema.safeParse(request.body);
      if (!bodyResult.success) return sendValidationError(reply, bodyResult.error.errors);

      const orgId = dbContext.orgId;
      const userId = (request as any).userId ?? null;
      const { invoiceId } = paramResult.data;
      const { to_state_key, reason } = bodyResult.data;

      try {
        const record = await withDbContext(prisma, dbContext, async tx => {
          const svc = new InvoiceService(makeTxBoundPrisma(tx));
          const inv = await svc.tenantTransition(orgId, invoiceId, to_state_key, reason, userId);
          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: orgId,
            actorType: 'USER',
            actorId: userId,
            action: 'invoice.transitioned',
            entity: 'invoices',
            entityId: invoiceId,
            afterJson: { to_state_key },
          });
          return inv;
        });

        return sendSuccess(reply, record);
      } catch (err) {
        if (err instanceof InvoiceNotFoundError) return sendNotFound(reply, err.message);
        if (err instanceof InvoiceTerminalStateError)
          return sendError(reply, 'TERMINAL_STATE', err.message, 422);
        if (err instanceof InvoiceTransitionNotAllowedError)
          return sendError(reply, 'TRANSITION_NOT_ALLOWED', err.message, 422);
        request.log.error(err, 'invoice.transition');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to transition invoice', 500);
      }
    },
  );
};

export default tenantInvoiceRoutes;
