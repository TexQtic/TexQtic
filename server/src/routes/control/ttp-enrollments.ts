/**
 * Control Plane TTP Enrollment Routes — TTP Slice 7
 *
 * Registered under prefix: /ttp (→ full paths /ttp/enrollments[/:tradeId])
 *
 * GET    /api/control/ttp/enrollments           — list enrollments (filters: status, orgId, tradeId)
 * GET    /api/control/ttp/enrollments/:tradeId  — get enrollment detail for a trade
 * PATCH  /api/control/ttp/enrollments/:tradeId  — review (approve/reject/suspend/cancel)
 *
 * Auth:  requireAdminRole('SUPER_ADMIN') on all routes
 *
 * Boundaries:
 *   - No VPC generation, no partner routing, no escrow mutations.
 *   - No ttp_enabled activation.
 *   - No payment or financing implication.
 *   - Approval gates: seller GST APPROVED + eligibility exists + not expired.
 *
 * Error mapping:
 *   EnrollmentTradeNotFoundError            → 404
 *   EnrollmentReviewGstError                → 422 (gate failure)
 *   EnrollmentReviewEligibilityMissingError → 422 (gate failure)
 *   EnrollmentReviewEligibilityExpiredError → 422 (gate failure)
 *   EnrollmentReviewOutcomeInvalidError     → 400
 *
 * Governance: TTP Slice 7, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { requireAdminRole } from '../../middleware/auth.js';
import { ttpFeatureGateMiddleware } from '../../middleware/ttpFeatureGate.middleware.js';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendValidationError,
} from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import type { DatabaseContext } from '../../lib/database-context.js';
import {
  TtpEnrollmentService,
  EnrollmentTradeNotFoundError,
  EnrollmentReviewGstError,
  EnrollmentReviewEligibilityMissingError,
  EnrollmentReviewEligibilityExpiredError,
  EnrollmentReviewOutcomeInvalidError,
} from '../../services/ttpEnrollment.service.js';
import { TTP_ENROLLMENT_REVIEW_OUTCOME } from '../../ttp/ttp.constants.js';

// ─── Sentinel / context ───────────────────────────────────────────────────────

const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

async function withAdminReadContext<T>(
  callback: (db: PrismaClient) => Promise<T>,
): Promise<T> {
  const ctx: DatabaseContext = {
    orgId: ADMIN_SENTINEL_ID,
    actorId: ADMIN_SENTINEL_ID,
    realm: 'control',
    requestId: randomUUID(),
  };
  return withDbContext(prisma, ctx, async tx => {
    await (tx as unknown as PrismaClient).$executeRaw`SET LOCAL app.is_admin = 'true'`;
    return callback(tx as unknown as PrismaClient);
  });
}

async function withAdminWriteContext<T>(
  orgId: string,
  adminId: string,
  callback: (db: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.org_id', $1, true)`, orgId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.actor_id', $1, true)`, adminId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'admin', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.request_id', $1, true)`, randomUUID());
    await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'off', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
    return callback(tx as unknown as PrismaClient);
  });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');
const tradeIdParamSchema = z.object({ tradeId: uuidSchema });

const listQuerySchema = z.object({
  status: z.string().optional(),
  orgId: z.string().uuid().optional(),
  tradeId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
});

const reviewBodySchema = z.object({
  outcome: z.enum([
    TTP_ENROLLMENT_REVIEW_OUTCOME.APPROVED,
    TTP_ENROLLMENT_REVIEW_OUTCOME.REJECTED,
    TTP_ENROLLMENT_REVIEW_OUTCOME.SUSPENDED,
    TTP_ENROLLMENT_REVIEW_OUTCOME.CANCELLED,
  ]),
  notes: z.string().max(1000).optional(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlTtpEnrollmentRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/control/ttp/enrollments
   * List all TTP enrollments with optional filters.
   */
  fastify.get(
    '/enrollments',
    { preHandler: [requireAdminRole('SUPER_ADMIN'), ttpFeatureGateMiddleware] },
    async (request, reply) => {
      const queryResult = listQuerySchema.safeParse(request.query);
      if (!queryResult.success) return sendValidationError(reply, queryResult.error.errors);

      const { status, orgId, tradeId, limit } = queryResult.data;

      try {
        const enrollments = await withAdminReadContext(async db => {
          const svc = new TtpEnrollmentService(db);
          return svc.adminListEnrollments({ status, orgId, tradeId, limit });
        });
        return sendSuccess(reply, enrollments);
      } catch (err) {
        request.log.error(
          { event: 'ttp.route.error', route: 'GET /api/control/ttp/enrollments', errMsg: err instanceof Error ? err.message : String(err) },
          'ttp.route.error',
        );
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list TTP enrollments', 500);
      }
    },
  );

  /**
   * GET /api/control/ttp/enrollments/:tradeId
   * Get enrollment detail for a specific trade.
   */
  fastify.get(
    '/enrollments/:tradeId',
    { preHandler: [requireAdminRole('SUPER_ADMIN'), ttpFeatureGateMiddleware] },
    async (request, reply) => {
      const paramResult = tradeIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const { tradeId } = paramResult.data;

      try {
        const enrollment = await withAdminReadContext(async db => {
          const svc = new TtpEnrollmentService(db);
          return svc.adminGetEnrollment(tradeId);
        });
        return sendSuccess(reply, enrollment);
      } catch (err) {
        if (err instanceof EnrollmentTradeNotFoundError) {
          return sendNotFound(reply, 'Trade not found');
        }
        request.log.error(
          { event: 'ttp.route.error', route: 'GET /api/control/ttp/enrollments/:tradeId', tradeId, errMsg: err instanceof Error ? err.message : String(err) },
          'ttp.route.error',
        );
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to retrieve TTP enrollment', 500);
      }
    },
  );

  /**
   * PATCH /api/control/ttp/enrollments/:tradeId
   * Admin review: approve, reject, suspend, or cancel enrollment.
   * Approval gates enforced by TtpEnrollmentService.adminReviewEnrollment.
   */
  fastify.patch(
    '/enrollments/:tradeId',
    { preHandler: [requireAdminRole('SUPER_ADMIN'), ttpFeatureGateMiddleware] },
    async (request, reply) => {
      const paramResult = tradeIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = reviewBodySchema.safeParse(request.body);
      if (!bodyResult.success) return sendValidationError(reply, bodyResult.error.errors);

      const { tradeId } = paramResult.data;
      const { outcome, notes } = bodyResult.data;
      const adminId = (request as any).adminId ?? ADMIN_SENTINEL_ID;

      try {
        // Get seller org for write context (need trade to find seller)
        const tradeRow = await withAdminReadContext(async db => {
          return (db as any).trade.findUnique({
            where: { id: tradeId },
            select: { sellerOrgId: true },
          });
        });
        if (!tradeRow) return sendNotFound(reply, 'Trade not found');

        const sellerOrgId = tradeRow.sellerOrgId;

        const enrollment = await withAdminWriteContext(sellerOrgId, adminId, async db => {
          const svc = new TtpEnrollmentService(db);
          return svc.adminReviewEnrollment({ tradeId, adminId, outcome, notes });
        });

        return sendSuccess(reply, enrollment);
      } catch (err) {
        if (err instanceof EnrollmentTradeNotFoundError) {
          return sendNotFound(reply, 'Trade not found');
        }
        if (err instanceof EnrollmentReviewEligibilityExpiredError) {
          request.log.info(
            { event: 'ttp.eligibility.expired', route: 'PATCH /api/control/ttp/enrollments/:tradeId', tradeId, errMsg: (err as Error).message },
            'ttp.eligibility.expired',
          );
          return sendError(reply, 'UNPROCESSABLE_ENTITY', (err as Error).message, 422);
        }
        if (
          err instanceof EnrollmentReviewGstError ||
          err instanceof EnrollmentReviewEligibilityMissingError
        ) {
          request.log.info(
            { event: 'ttp.enrollment.gate_failed', route: 'PATCH /api/control/ttp/enrollments/:tradeId', tradeId, errMsg: (err as Error).message },
            'ttp.enrollment.gate_failed',
          );
          return sendError(reply, 'UNPROCESSABLE_ENTITY', (err as Error).message, 422);
        }
        if (err instanceof EnrollmentReviewOutcomeInvalidError) {
          return sendError(reply, 'BAD_REQUEST', (err as Error).message, 400);
        }
        request.log.error(
          { event: 'ttp.route.error', route: 'PATCH /api/control/ttp/enrollments/:tradeId', tradeId, errMsg: err instanceof Error ? err.message : String(err) },
          'ttp.route.error',
        );
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to review TTP enrollment', 500);
      }
    },
  );
};

export default controlTtpEnrollmentRoutes;
