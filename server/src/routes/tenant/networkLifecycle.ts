/**
 * Network Commerce — Pool Lifecycle Log Read Routes
 * TEXQTIC-NC-PHASE1-LIFECYCLE-LOG-READ-001
 *
 * D-017-A: orgId is ALWAYS sourced from request.dbContext.orgId — never from
 * params, query, or body. Wrong-org access returns non-leaking 404.
 *
 * Routes (registered with prefix `/tenant/network-commerce/pools`):
 *   GET /:poolId/lifecycle — list lifecycle log entries for a pool (newest-first)
 *
 * Read-only surface. No mutation. No feature-flag gating beyond ncPoolFeatureGate.
 * No payment, payout, escrow release, or money movement.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { ncPoolFeatureGateMiddleware } from '../../middleware/ncPoolFeatureGate.middleware.js';
import { prisma } from '../../db/prisma.js';
import { sendError, sendSuccess } from '../../utils/response.js';
import {
  NetworkLifecycleLogService,
  LifecycleLogPoolNotFoundError,
} from '../../services/networkLifecycleLog.service.js';

// ─── Param / Query Schemas ────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

const poolIdParamSchema = z.object({ poolId: uuidSchema });

const lifecycleQuerySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

const networkLifecycleRoutes: FastifyPluginAsync = async fastify => {

  // ── GET /:poolId/lifecycle ───────────────────────────────────────────────────
  // List lifecycle log entries for a pool, scoped to the calling org.
  // Newest entries first (descending created_at).
  // Supports limit/offset pagination.

  fastify.get(
    '/:poolId/lifecycle',
    {
      onRequest:  [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        const firstMessage = paramResult.error.errors[0]?.message ?? 'Invalid poolId';
        return sendError(reply, 'INVALID_INPUT', firstMessage, 422);
      }

      const queryResult = lifecycleQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        const firstMessage = queryResult.error.errors[0]?.message ?? 'Invalid query parameters';
        return sendError(reply, 'INVALID_INPUT', firstMessage, 400);
      }

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;
      const { limit, offset } = queryResult.data;

      try {
        const svc = new NetworkLifecycleLogService(prisma);
        const result = await svc.listPoolLifecycleLogs(orgId, poolId, { limit, offset });

        return sendSuccess(reply, {
          data:       result.items,
          pagination: result.pagination,
        });
      } catch (err) {
        if (err instanceof LifecycleLogPoolNotFoundError) {
          return sendError(reply, 'POOL_NOT_FOUND', 'Network pool not found', 404);
        }
        request.log.error(err, 'network-commerce.lifecycle.list');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to read lifecycle log', 500);
      }
    },
  );
};

export default networkLifecycleRoutes;
