/**
 * Tenant GST Verification Routes — TTP Slice 2
 *
 * POST /api/tenant/gst-verification  — submit / re-submit GST details for admin review
 * GET  /api/tenant/gst-verification  — get own GST verification status
 *
 * D-017-A: org_id is derived from JWT only. z.never() rejects tenantId / org_id from body.
 * raw_verification_json is NOT included in any tenant response.
 * No live GST portal API — manual admin-review workflow only.
 *
 * Governance: TTP Slice 2, TEXQTIC-TRADETRUST-PAY-DESIGN-001
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
  sendForbidden,
} from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog } from '../../lib/auditLog.js';
import {
  GstVerificationService,
  GstAlreadyApprovedError,
} from '../../services/gstVerification.service.js';

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

// D-017-A: tenantId / org_id must never come from the request body.
const submitBodySchema = z.object({
  tenantId: z
    .never({ errorMap: () => ({ message: 'tenantId must not be provided in request body' }) })
    .optional(),
  org_id: z
    .never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) })
    .optional(),
  gstin: z.string().trim().min(1).max(15),
  legal_name_on_gst: z.string().trim().min(1).max(500),
  state_code: z.string().trim().min(1).max(10),
  registration_type: z.string().trim().min(1).max(50),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantGstVerificationRoutes: FastifyPluginAsync = async fastify => {
  /**
   * POST /api/tenant/gst-verification
   * Submit or re-submit GST verification details for admin review.
   * Tenant cannot resubmit if the existing record has review_outcome = APPROVED.
   * Returns 201 on first submission; also 201 on accepted re-submission.
   */
  fastify.post(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const bodyResult = submitBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }

      const { gstin, legal_name_on_gst, state_code, registration_type } = bodyResult.data;
      const orgId = dbContext.orgId;

      // Validate GSTIN format before hitting the database
      const gstinValidation = new GstVerificationService(prisma).validateGstin(gstin);
      if (!gstinValidation.valid) {
        return sendValidationError(reply, [{ path: ['gstin'], message: gstinValidation.error }]);
      }

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const svc = new GstVerificationService(makeTxBoundPrisma(tx));
          const record = await svc.submitVerification(orgId, {
            gstin,
            legal_name_on_gst,
            state_code,
            registration_type,
          });

          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: orgId,
            actorType: 'USER',
            actorId: dbContext.actorId,
            action: 'gst_verification.submitted',
            entity: 'gst_verifications',
            entityId: record.id,
            afterJson: {
              gstin: record.gstin,
              state_code: record.state_code,
              registration_type: record.registration_type,
            },
          });

          return record;
        });

        return sendSuccess(reply, { gst_verification: result }, 201);
      } catch (error: unknown) {
        if (error instanceof GstAlreadyApprovedError) {
          return sendForbidden(reply, error.message);
        }
        fastify.log.error({ err: error, orgId }, '[TTP-GST] POST /tenant/gst-verification error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to submit GST verification', 500);
      }
    },
  );

  /**
   * GET /api/tenant/gst-verification
   * Get own GST verification status.
   * Returns { gst_verification: null } if no submission has been made.
   * raw_verification_json is not included in this response.
   */
  fastify.get(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const orgId = dbContext.orgId;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const svc = new GstVerificationService(makeTxBoundPrisma(tx));
          return svc.getVerificationByOrgId(orgId);
        });

        return sendSuccess(reply, { gst_verification: result ?? null });
      } catch (error: unknown) {
        fastify.log.error({ err: error, orgId }, '[TTP-GST] GET /tenant/gst-verification error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to retrieve GST verification', 500);
      }
    },
  );
};

export default tenantGstVerificationRoutes;
