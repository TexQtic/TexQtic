/**
 * Network Commerce — Settlement Visibility Routes
 * TEXQTIC-NC-PHASE1-POOL-SETTLE-001
 *
 * TradeTrust Pay doctrine:
 *   TexQtic is NOT a payment executor, PSP, escrow custodian, lender, or funder.
 *   These routes expose settlement VISIBILITY only.
 *   The /compute endpoint creates PENDING rows — it does NOT trigger or release.
 *
 * D-017-A: orgId is ALWAYS sourced from request.dbContext.orgId — never from
 * params, query, or body.  Wrong-org access returns 404 (non-leaking).
 *
 * Routes (registered with prefix `/tenant/network-commerce/pools`):
 *   GET  /:poolId/settlement          — read existing settlement splits + payment-term metadata
 *   POST /:poolId/settlement/preview  — non-mutating preview of how splits would be computed
 *   POST /:poolId/settlement/compute  — gated: creates PENDING splits (503 when flag disabled)
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { ncPoolFeatureGateMiddleware } from '../../middleware/ncPoolFeatureGate.middleware.js';
import { prisma } from '../../db/prisma.js';
import { sendError, sendSuccess } from '../../utils/response.js';
import {
  NetworkSettlementSplitService,
  NetworkSettlementSplitPoolNotFoundError,
  NetworkSettlementSplitFeatureDisabledError,
  NetworkSettlementSplitAlreadyExistsError,
  NetworkSettlementSplitInvalidInputError,
} from '../../services/networkSettlementSplit.service.js';

// ─── Param Schemas ────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

const poolIdParamSchema = z.object({ poolId: uuidSchema });

// ─── Error mapper ─────────────────────────────────────────────────────────────

function mapSettlementServiceError(
  reply: Parameters<typeof sendError>[0],
  err: unknown,
): boolean {
  if (err instanceof NetworkSettlementSplitPoolNotFoundError) {
    sendError(reply, 'POOL_NOT_FOUND', 'Network pool not found', 404);
    return true;
  }
  if (err instanceof NetworkSettlementSplitFeatureDisabledError) {
    sendError(reply, 'FEATURE_DISABLED', 'Settlement waterfall feature is disabled.', 503);
    return true;
  }
  if (err instanceof NetworkSettlementSplitAlreadyExistsError) {
    sendError(reply, 'CONFLICT', 'Settlement splits already exist for this pool', 409);
    return true;
  }
  if (err instanceof NetworkSettlementSplitInvalidInputError) {
    sendError(reply, 'INVALID_INPUT', err.message, 422);
    return true;
  }
  return false;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const networkSettlementRoutes: FastifyPluginAsync = async fastify => {

  // ── GET /:poolId/settlement ──────────────────────────────────────────────────
  // Read existing settlement split rows + payment-term metadata.
  // No mutations. Returns empty payableSplits when none exist yet.

  fastify.get(
    '/:poolId/settlement',
    {
      onRequest:  [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Validation failed', 422, paramResult.error.errors);
      }

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkSettlementSplitService(prisma);
        const result = await svc.getPoolSettlementStatus(orgId, poolId);
        return sendSuccess(reply, result, 200);
      } catch (err) {
        if (mapSettlementServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.settlement.get');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to read settlement status', 500);
      }
    },
  );

  // ── POST /:poolId/settlement/preview ─────────────────────────────────────────
  // Non-mutating: computes what splits WOULD look like without persisting.
  // No settlement feature-flag check — preview is always accessible to NC-enabled orgs.

  fastify.post(
    '/:poolId/settlement/preview',
    {
      onRequest:  [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Validation failed', 422, paramResult.error.errors);
      }

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkSettlementSplitService(prisma);
        const result = await svc.computePoolSettlementPreview(orgId, poolId);
        return sendSuccess(reply, result, 200);
      } catch (err) {
        if (mapSettlementServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.settlement.preview');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to compute settlement preview', 500);
      }
    },
  );

  // ── POST /:poolId/settlement/compute ─────────────────────────────────────────
  // Gated by nc.settlement_waterfall.enabled.
  // Creates PENDING split rows — does NOT trigger, release, or disburse.
  // Returns 503 FEATURE_DISABLED when the feature flag is off.
  // Returns 409 CONFLICT when PENDING splits already exist (idempotency guard).

  fastify.post(
    '/:poolId/settlement/compute',
    {
      onRequest:  [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Validation failed', 422, paramResult.error.errors);
      }

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkSettlementSplitService(prisma);
        const splits = await svc.createPoolSettlementSplits(orgId, poolId);
        return sendSuccess(reply, { payableSplits: splits, count: splits.length }, 201);
      } catch (err) {
        if (mapSettlementServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.settlement.compute');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to compute settlement splits', 500);
      }
    },
  );
};

export default networkSettlementRoutes;
