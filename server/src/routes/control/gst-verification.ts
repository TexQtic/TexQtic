/**
 * Control-plane GST Verification Routes — TTP Slice 2
 *
 * GET    /api/control/gst-verification              — list all pending (review_outcome IS NULL)
 * GET    /api/control/gst-verification/:orgId       — get full record for org (admin view)
 * PATCH  /api/control/gst-verification/:orgId       — record review outcome + optional notes
 *
 * Auth: adminAuthMiddleware is inherited from the parent control plugin (control.ts addHook).
 * PATCH is restricted to SUPER_ADMIN role.
 *
 * On APPROVED: advances organizations.status from PENDING_VERIFICATION → VERIFICATION_APPROVED
 * if and only if the current status is exactly PENDING_VERIFICATION.
 *
 * Governance: TTP Slice 2, TEXQTIC-TRADETRUST-PAY-DESIGN-001
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
  GstVerificationService,
  GstNotFoundError,
} from '../../services/gstVerification.service.js';
import { TTP_GST_REVIEW_OUTCOME } from '../../ttp/ttp.constants.js';

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
 * Mirrors withAdminContext() in control.ts.
 */
async function withGstAdminReadContext<T>(
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
 * Required for organizations table writes (control-plane write surface).
 * Mirrors withOrgAdminWriteContext() in control.ts.
 */
async function withGstAdminWriteContext<T>(
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

const reviewBodySchema = z.object({
  review_outcome: z.enum([
    TTP_GST_REVIEW_OUTCOME.APPROVED,
    TTP_GST_REVIEW_OUTCOME.REJECTED,
    TTP_GST_REVIEW_OUTCOME.NEEDS_MORE_INFO,
  ]),
  review_notes: z.string().trim().min(1).max(2000).optional().nullable(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlGstVerificationRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/control/gst-verification
   * List all pending GST verifications (review_outcome IS NULL), ordered oldest-first.
   */
  fastify.get('/', async (request, reply) => {
    if (!request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
    }

    try {
      const records = await withGstAdminReadContext(async tx => {
        const svc = new GstVerificationService(makeTxBoundPrisma(tx));
        return svc.listPendingVerifications();
      });

      return sendSuccess(reply, { gst_verifications: records, count: records.length });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[TTP-GST] GET /control/gst-verification list error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to list GST verifications', 500);
    }
  });

  /**
   * GET /api/control/gst-verification/:orgId
   * Get full GST verification record for a specific org (admin view, all fields).
   */
  fastify.get('/:orgId', async (request, reply) => {
    if (!request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
    }

    const paramsResult = orgIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error.errors);
    }

    const { orgId } = paramsResult.data;

    try {
      const record = await withGstAdminReadContext(async tx => {
        const svc = new GstVerificationService(makeTxBoundPrisma(tx));
        return svc.getVerificationByOrgIdAdmin(orgId);
      });

      if (!record) {
        return sendNotFound(reply, 'GST verification record not found for this organization');
      }

      return sendSuccess(reply, { gst_verification: record });
    } catch (error: unknown) {
      fastify.log.error({ err: error, orgId }, '[TTP-GST] GET /control/gst-verification/:orgId error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to retrieve GST verification', 500);
    }
  });

  /**
   * PATCH /api/control/gst-verification/:orgId
   * Record admin review outcome (APPROVED / REJECTED / NEEDS_MORE_INFO) with optional notes.
   * On APPROVED: conditionally advances organizations.status from PENDING_VERIFICATION.
   * Restricted to SUPER_ADMIN role.
   */
  fastify.patch(
    '/:orgId',
    { preHandler: requireAdminRole('SUPER_ADMIN') },
    async (request, reply) => {
      if (!request.adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
      }

      const paramsResult = orgIdParamSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }

      const bodyResult = reviewBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }

      const { orgId } = paramsResult.data;
      const { review_outcome, review_notes } = bodyResult.data;
      const adminId = request.adminId;

      try {
        const result = await withGstAdminWriteContext(orgId, adminId, async tx => {
          const svc = new GstVerificationService(makeTxBoundPrisma(tx));
          const updated = await svc.adminReviewVerification(orgId, adminId, {
            review_outcome,
            review_notes: review_notes ?? null,
          });

          await writeAuditLog(
            tx,
            createAdminAudit(adminId, 'control.gst_verification.reviewed', 'gst_verifications', {
              orgId,
              review_outcome,
              review_notes: review_notes ?? null,
            }),
          );

          return updated;
        });

        return sendSuccess(reply, { gst_verification: result });
      } catch (error: unknown) {
        if (error instanceof GstNotFoundError) {
          return sendNotFound(reply, error.message);
        }
        fastify.log.error(
          { err: error, orgId, adminId },
          '[TTP-GST] PATCH /control/gst-verification/:orgId error',
        );
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to record GST review outcome', 500);
      }
    },
  );
};

export default controlGstVerificationRoutes;
