/**
 * Control-plane TTP Eligibility Routes — TTP Slice 3
 *
 * POST  /api/control/ttp/eligibility/:orgId  — create eligibility assessment (SUPER_ADMIN)
 * GET   /api/control/ttp/eligibility/:orgId  — get assessment history + latest
 *
 * Auth: adminAuthMiddleware is inherited from the parent control plugin (control.ts addHook).
 * POST is restricted to SUPER_ADMIN role.
 *
 * Pre-conditions for POST:
 *   - org must have an APPROVED gst_verifications record.
 *   - risk_tier / eligibility_outcome combination must be valid:
 *     - tier 0 (THIN_FILE) → outcome must be MANUAL_REVIEW
 *     - ELIGIBLE → tier must be >= 1
 *
 * On ELIGIBLE with tier >= 1: updates organizations.risk_score to risk_tier.
 *
 * WARNING: No live CIBIL or credit bureau pull is performed in this phase.
 *          This is a manual admin assessment gate only.
 *
 * Governance: TTP Slice 3, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { requireAdminRole } from '../../middleware/auth.js';
import { ttpFeatureGateMiddleware } from '../../middleware/ttpFeatureGate.middleware.js';
import {
  sendSuccess,
  sendError,
  sendValidationError,
} from '../../utils/response.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog, createAdminAudit } from '../../lib/auditLog.js';
import {
  TtpEligibilityService,
  EligibilityGstPrerequisiteError,
  EligibilityTierOutcomeMismatchError,
} from '../../services/ttpEligibility.service.js';
import { TTP_ELIGIBILITY_OUTCOME } from '../../ttp/ttp.constants.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

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
 * Mirrors withGstAdminReadContext in gst-verification.ts.
 */
async function withTtpAdminReadContext<T>(
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
 * Admin write context — org-scoped, native connection role.
 * Required for ttp_eligibility_assessments + organizations table writes.
 * Mirrors withGstAdminWriteContext in gst-verification.ts.
 */
async function withTtpAdminWriteContext<T>(
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

const orgIdParamSchema = z.object({ orgId: uuidSchema });

const createAssessmentBodySchema = z.object({
  risk_tier: z.number().int().min(0).max(3),
  eligibility_outcome: z.enum([
    TTP_ELIGIBILITY_OUTCOME.ELIGIBLE,
    TTP_ELIGIBILITY_OUTCOME.INELIGIBLE,
    TTP_ELIGIBILITY_OUTCOME.MANUAL_REVIEW,
  ]),
  max_invoice_amount: z.number().positive().optional().nullable(),
  currency: z.string().trim().min(1).max(10).optional().nullable(),
  assessment_notes: z.string().trim().min(1).max(5000).optional().nullable(),
  valid_until: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable()
    .transform(v => (v ? new Date(v) : null)),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlTtpEligibilityRoutes: FastifyPluginAsync = async fastify => {
  /**
   * POST /api/control/ttp/eligibility/:orgId
   *
   * Create a new eligibility assessment for an org.
   * Requires GST approval. Validates tier / outcome combination.
   * On ELIGIBLE with tier >= 1: updates organizations.risk_score.
   * Restricted to SUPER_ADMIN role.
   */
  fastify.post(
    '/:orgId',
    { preHandler: [requireAdminRole('SUPER_ADMIN'), ttpFeatureGateMiddleware] },
    async (request, reply) => {
      if (!request.adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
      }

      const paramsResult = orgIdParamSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }

      const bodyResult = createAssessmentBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }

      const { orgId } = paramsResult.data;
      const {
        risk_tier,
        eligibility_outcome,
        max_invoice_amount,
        currency,
        assessment_notes,
        valid_until,
      } = bodyResult.data;
      const adminId = request.adminId;

      try {
        const result = await withTtpAdminWriteContext(orgId, adminId, async tx => {
          const svc = new TtpEligibilityService(makeTxBoundPrisma(tx));

          const assessment = await svc.createAssessment(orgId, adminId, {
            risk_tier,
            eligibility_outcome,
            max_invoice_amount: max_invoice_amount ?? null,
            currency: currency ?? null,
            assessment_notes: assessment_notes ?? null,
            valid_until: valid_until ?? null,
          });

          await writeAuditLog(
            tx,
            createAdminAudit(
              adminId,
              'control.ttp_eligibility.assessment_created',
              'ttp_eligibility_assessments',
              {
                orgId,
                risk_tier,
                eligibility_outcome,
                assessment_id: assessment.id,
              },
            ),
          );

          return assessment;
        });

        return reply.status(201).send({
          success: true,
          data: { assessment: result },
        });
      } catch (error: unknown) {
        if (error instanceof EligibilityGstPrerequisiteError) {
          return sendError(reply, 'PRECONDITION_FAILED', error.message, 422);
        }
        if (error instanceof EligibilityTierOutcomeMismatchError) {
          return sendError(reply, 'VALIDATION_ERROR', error.message, 422);
        }
        fastify.log.error(
          { err: error, orgId, adminId },
          '[TTP-ELIGIBILITY] POST /control/ttp/eligibility/:orgId error',
        );
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to create eligibility assessment', 500);
      }
    },
  );

  /**
   * GET /api/control/ttp/eligibility/:orgId
   *
   * Get assessment history (newest-first) and the latest assessment for an org.
   * Returns { assessments, latest, count }.
   */
  fastify.get('/:orgId', { preHandler: [ttpFeatureGateMiddleware] }, async (request, reply) => {
    if (!request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
    }

    const paramsResult = orgIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error.errors);
    }

    const { orgId } = paramsResult.data;

    try {
      const { assessments, latest } = await withTtpAdminReadContext(async tx => {
        const svc = new TtpEligibilityService(makeTxBoundPrisma(tx));
        const allAssessments = await svc.listAssessments(orgId);
        const latestAssessment = await svc.getLatestAssessment(orgId);
        return { assessments: allAssessments, latest: latestAssessment };
      });

      return sendSuccess(reply, {
        assessments,
        latest,
        count: assessments.length,
      });
    } catch (error: unknown) {
      fastify.log.error(
        { err: error, orgId },
        '[TTP-ELIGIBILITY] GET /control/ttp/eligibility/:orgId error',
      );
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to retrieve eligibility assessments', 500);
    }
  });
};

export default controlTtpEligibilityRoutes;
