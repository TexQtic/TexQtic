/**
 * Tenant TTP Summary Routes — TTP Slice 7
 *
 * GET /api/tenant/trades/:tradeId/ttp-summary
 *   Returns a read-only TTP readiness summary for the authenticated org's trade.
 *
 * Boundary enforcement:
 *   - READ-ONLY: no mutations, no lifecycle transitions.
 *   - No raw_bureau_json / raw_verification_json exposed.
 *   - No admin notes or internal risk details in response.
 *   - No partner routing payload or transmission details.
 *   - No escrow or payment information.
 *   - actor org MUST be buyer or seller party on the trade.
 *
 * Error mapping:
 *   TtpSummaryTradeNotFoundError  → 404
 *   TtpSummaryPartyMismatchError  → 403 FORBIDDEN
 *
 * Governance: TTP Slice 7, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { ttpFeatureGateMiddleware } from '../../middleware/ttpFeatureGate.middleware.js';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendValidationError,
} from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import {
  TtpSummaryService,
  TtpSummaryTradeNotFoundError,
  TtpSummaryPartyMismatchError,
} from '../../services/ttpSummary.service.js';

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

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantTtpSummaryRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/tenant/trades/:tradeId/ttp-summary
   *
   * Returns a read-only TTP readiness summary for the trade.
   * Actor must be buyer or seller party.
   * Response contains NO raw bureau/GST payloads, NO admin notes,
   * NO partner routing payload, NO payment-related fields.
   */
  fastify.get(
    '/trades/:tradeId/ttp-summary',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ttpFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = tradeIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const actorOrgId = dbContext.orgId;
      const actorUserId = (request as any).userId ?? null;
      const { tradeId } = paramResult.data;

      try {
        const summary = await withDbContext(prisma, dbContext, async tx => {
          const svc = new TtpSummaryService(makeTxBoundPrisma(tx), prisma);
          return svc.getTradeTtpSummary({ tradeId, actorOrgId, actorUserId });
        });

        return sendSuccess(reply, summary);
      } catch (err) {
        if (err instanceof TtpSummaryTradeNotFoundError) {
          return sendNotFound(reply, 'Trade not found');
        }
        if (err instanceof TtpSummaryPartyMismatchError) {
          return sendError(reply, 'FORBIDDEN', err.message, 403);
        }
        request.log.error(err, 'ttp-summary.get');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to retrieve TTP summary', 500);
      }
    },
  );
};

export default tenantTtpSummaryRoutes;
