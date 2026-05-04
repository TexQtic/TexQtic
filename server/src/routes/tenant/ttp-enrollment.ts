/**
 * Tenant TTP Enrollment Routes — TTP Slice 7
 *
 * GET  /api/tenant/trades/:tradeId/ttp-enrollment
 *   Returns the current enrollment state for the trade's seller org.
 *   Actor must be buyer or seller party.
 *
 * POST /api/tenant/trades/:tradeId/ttp-enrollment
 *   Requests TTP enrollment for the seller org (idempotent).
 *   Only the seller org (or buyer as proxy) can initiate enrollment.
 *   D-017-A: org_id is NEVER accepted from request body.
 *
 * Boundaries:
 *   - No VPC generation, no partner routing, no escrow mutations.
 *   - No ttp_enabled activation.
 *   - No payment or financing implication.
 *   - Enrollment is org-scoped (seller org). Trade provides party context only.
 *
 * Error mapping:
 *   EnrollmentTradeNotFoundError   → 404
 *   EnrollmentPartyMismatchError   → 403
 *   EnrollmentAlreadyActiveError   → 409
 *
 * Governance: TTP Slice 7, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendValidationError,
} from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import {
  TtpEnrollmentService,
  EnrollmentTradeNotFoundError,
  EnrollmentPartyMismatchError,
  EnrollmentAlreadyActiveError,
} from '../../services/ttpEnrollment.service.js';

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

// D-017-A: org_id is NEVER accepted from request body — use z.never() to block it
const requestEnrollmentBodySchema = z.object({
  reason: z.string().max(500).optional(),
  // org_id explicitly blocked at schema level (D-017-A)
  org_id: z.never({ message: 'org_id must not be provided in request body' }).optional(),
  tenant_id: z.never({ message: 'tenant_id must not be provided in request body' }).optional(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantTtpEnrollmentRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/tenant/trades/:tradeId/ttp-enrollment
   * Returns the current enrollment state for the trade.
   * Actor must be buyer or seller party.
   */
  fastify.get(
    '/trades/:tradeId/ttp-enrollment',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = tradeIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const actorOrgId = dbContext.orgId;
      const { tradeId } = paramResult.data;

      try {
        const enrollment = await withDbContext(prisma, dbContext, async tx => {
          const svc = new TtpEnrollmentService(makeTxBoundPrisma(tx));
          return svc.getEnrollment({ tradeId, actorOrgId });
        });

        return sendSuccess(reply, enrollment);
      } catch (err) {
        if (err instanceof EnrollmentTradeNotFoundError) {
          return sendNotFound(reply, 'Trade not found');
        }
        if (err instanceof EnrollmentPartyMismatchError) {
          return sendError(reply, 'FORBIDDEN', err.message, 403);
        }
        request.log.error(err, 'ttp-enrollment.get');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to retrieve TTP enrollment', 500);
      }
    },
  );

  /**
   * POST /api/tenant/trades/:tradeId/ttp-enrollment
   * Request TTP enrollment for the seller org of the trade (idempotent).
   * Actor must be buyer or seller party.
   * D-017-A: org_id must never come from request body.
   */
  fastify.post(
    '/trades/:tradeId/ttp-enrollment',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = tradeIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = requestEnrollmentBodySchema.safeParse(request.body);
      if (!bodyResult.success) return sendValidationError(reply, bodyResult.error.errors);

      const actorOrgId = dbContext.orgId;
      const actorUserId = (request as any).userId ?? null;
      const { tradeId } = paramResult.data;
      const { reason } = bodyResult.data;

      try {
        const enrollment = await withDbContext(prisma, dbContext, async tx => {
          const svc = new TtpEnrollmentService(makeTxBoundPrisma(tx));
          return svc.requestEnrollment({ tradeId, actorOrgId, actorUserId, reason });
        });

        return sendSuccess(reply, enrollment, 201);
      } catch (err) {
        if (err instanceof EnrollmentTradeNotFoundError) {
          return sendNotFound(reply, 'Trade not found');
        }
        if (err instanceof EnrollmentPartyMismatchError) {
          return sendError(reply, 'FORBIDDEN', err.message, 403);
        }
        if (err instanceof EnrollmentAlreadyActiveError) {
          return sendError(reply, 'CONFLICT', err.message, 409);
        }
        request.log.error(err, 'ttp-enrollment.post');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to submit TTP enrollment request', 500);
      }
    },
  );
};

export default tenantTtpEnrollmentRoutes;
