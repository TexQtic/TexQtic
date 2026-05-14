/**
 * Network Commerce Invoice Tenant Routes
 * TEXQTIC-NC-PHASE1-NC-INVOICE-COMPLETE-001
 *
 * Read-only tenant routes for Network Commerce pool invoices.
 * Write surface (createNetworkInvoice) is deferred — invoked internally by pool lifecycle events.
 *
 * D-017-A: orgId is ALWAYS sourced from request.dbContext.orgId — never from params/query/body.
 * Non-leaking: wrong-org access returns 404, not 403.
 *
 * Routes:
 *   GET /:poolId/invoices              — list NC invoices for a pool
 *   GET /:poolId/invoices/:invoiceId   — get a single NC invoice by id
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { ncPoolFeatureGateMiddleware } from '../../middleware/ncPoolFeatureGate.middleware.js';
import { prisma } from '../../db/prisma.js';
import { sendError, sendNotFound, sendSuccess } from '../../utils/response.js';
import {
  NetworkInvoiceService,
} from '../../services/networkInvoice.service.js';

// ─── Param Schemas ────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

const poolIdParamSchema = z.object({ poolId: uuidSchema });

const poolAndInvoiceParamSchema = z.object({
  poolId:    uuidSchema,
  invoiceId: uuidSchema,
});

// ─── Routes ───────────────────────────────────────────────────────────────────

const networkInvoiceRoutes: FastifyPluginAsync = async fastify => {

  // ── GET /:poolId/invoices ────────────────────────────────────────────────────

  fastify.get(
    '/:poolId/invoices',
    {
      onRequest:  [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendError(reply, 'VALIDATION_ERROR', 'Validation failed', 422, paramResult.error.errors);

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        // Pool ownership check — non-leaking 404 if pool not found for this org
        const ownerScopedPool = await prisma.networkPool.findFirst({
          where: { id: poolId, orgId },
          select: { id: true },
        });

        if (!ownerScopedPool) {
          return sendError(reply, 'POOL_NOT_FOUND', 'Network pool not found', 404);
        }

        const svc = new NetworkInvoiceService(prisma);
        const records = await svc.listNetworkInvoicesForPool(orgId, poolId);

        return sendSuccess(reply, { invoices: records, count: records.length }, 200);
      } catch (err) {
        request.log.error(err, 'network-commerce.invoices.list');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list network invoices', 500);
      }
    },
  );

  // ── GET /:poolId/invoices/:invoiceId ─────────────────────────────────────────

  fastify.get(
    '/:poolId/invoices/:invoiceId',
    {
      onRequest:  [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolAndInvoiceParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendError(reply, 'VALIDATION_ERROR', 'Validation failed', 422, paramResult.error.errors);

      const { poolId, invoiceId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkInvoiceService(prisma);
        const record = await svc.getNetworkInvoiceById(orgId, invoiceId);

        if (!record) {
          return sendNotFound(reply, 'Network invoice not found');
        }

        // Pool-scope check — invoice must belong to the requested pool (non-leaking 404)
        if (record.network_entity_id !== poolId) {
          return sendNotFound(reply, 'Network invoice not found');
        }

        return sendSuccess(reply, { invoice: record }, 200);
      } catch (err) {
        request.log.error(err, 'network-commerce.invoices.get');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to read network invoice', 500);
      }
    },
  );
};

export default networkInvoiceRoutes;
