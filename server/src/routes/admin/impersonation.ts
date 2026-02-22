/**
 * G-011: Control-plane impersonation routes
 *
 * Allows an authorized admin to:
 *  - Start an impersonation session (POST /impersonation/start)
 *    Returns a time-bounded, tenant-shaped JWT with isImpersonation=true.
 *  - Stop an impersonation session (POST /impersonation/stop)
 *    Marks session endedAt + writes audit event.
 *  - Get session status (GET /impersonation/status/:impersonationId)
 *    Returns session metadata (no token).
 *
 * Registered at /api/control (admin realm — mapped in realmGuard ENDPOINT_REALM_MAP).
 *
 * Token revocation note (G-011):
 *   Issued tokens are valid until exp (30 min TTL). The stop endpoint sets endedAt
 *   in DB and writes an IMPERSONATION_STOP audit event. Real-time revocation in
 *   tenantAuthMiddleware is out-of-scope (middleware outside allowlist). Short TTL
 *   is the primary revocation mechanism. See governance for threat-model coverage.
 *
 * Doctrine v1.4 compliance:
 *   - orgId passed as tenantId in token = canonical app.org_id value
 *   - No app.tenant_id used as real scoping key
 *   - All DB writes use postgres/BYPASSRLS (control-plane table)
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { adminAuthMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../db/prisma.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import {
  startImpersonation,
  stopImpersonation,
  getImpersonationStatus,
  ImpersonationAbortError,
} from '../../services/impersonation.service.js';

const startBodySchema = z.object({
  orgId: z.string().uuid('orgId must be a valid UUID'),
  userId: z.string().uuid('userId must be a valid UUID'),
  reason: z.string().min(10, 'reason must be at least 10 characters').max(500).trim(),
});

const stopBodySchema = z.object({
  impersonationId: z.string().uuid('impersonationId must be a valid UUID'),
  reason: z.string().min(10, 'reason must be at least 10 characters').max(500).trim(),
});

const impersonationRoutes: FastifyPluginAsync = async fastify => {
  // All routes in this plugin are admin-only
  fastify.addHook('onRequest', adminAuthMiddleware);

  /**
   * POST /api/control/impersonation/start
   *
   * Start a time-bounded impersonation session for a tenant user.
   * Returns a tenant-shaped JWT with explicit isImpersonation marker.
   */
  fastify.post('/impersonation/start', async (request, reply) => {
    try {
      const parseResult = startBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendError(reply, 'VALIDATION_ERROR', parseResult.error.errors[0]?.message ?? 'Invalid request body', 400);
      }

      // Admin identity — set by adminAuthMiddleware
      if (!request.isAdmin || !request.adminId || !request.adminRole) {
        return sendError(reply, 'FORBIDDEN', 'Admin authentication required', 403);
      }

      const result = await startImpersonation(prisma, request.adminId, parseResult.data);

      // Sign a TENANT-realm JWT with impersonation marker.
      // Claims: userId + tenantId (canonical org_id) satisfy tenantAuthMiddleware.
      // Extra claims: isImpersonation, impersonatorAdminId, impersonationId — for traceability.
      // exp embedded as seconds-since-epoch to enforce 30-min TTL.
      const expSecs = Math.floor(result.expiresAt.getTime() / 1000);
      const token = await reply.tenantJwtSign({
        userId: result.userId,
        tenantId: result.orgId, // canonical Doctrine v1.4 org_id = tenants.id
        role: result.membershipRole,
        isImpersonation: true,
        impersonatorAdminId: request.adminId,
        impersonationId: result.impersonationId,
        exp: expSecs,
      });

      return reply.status(201).send({
        success: true,
        data: {
          impersonationId: result.impersonationId,
          token,
          expiresAt: result.expiresAt.toISOString(),
        },
      });
    } catch (error: unknown) {
      if (error instanceof ImpersonationAbortError) {
        const statusMap: Record<string, number> = {
          TENANT_NOT_FOUND: 404,
          TENANT_INACTIVE: 422,
          USER_NOT_MEMBER: 404,
        };
        const status = statusMap[error.code] ?? 400;
        return sendError(reply, error.code, error.message, status);
      }
      fastify.log.error({ err: error }, '[Impersonation] start error');
      return sendError(reply, 'INTERNAL_ERROR', 'Impersonation start failed', 500);
    }
  });

  /**
   * POST /api/control/impersonation/stop
   *
   * Revoke an active impersonation session.
   * Sets endedAt in DB and writes IMPERSONATION_STOP audit event.
   * Stop reason is persisted to the audit log (not to the session row — schema constraint).
   */
  fastify.post('/impersonation/stop', async (request, reply) => {
    try {
      const parseResult = stopBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendError(reply, 'VALIDATION_ERROR', parseResult.error.errors[0]?.message ?? 'Invalid request body', 400);
      }

      if (!request.isAdmin || !request.adminId || !request.adminRole) {
        return sendError(reply, 'FORBIDDEN', 'Admin authentication required', 403);
      }

      await stopImpersonation(
        prisma,
        request.adminId,
        request.adminRole,
        parseResult.data.impersonationId,
        parseResult.data.reason
      );

      return sendSuccess(reply, { ended: true });
    } catch (error: unknown) {
      if (error instanceof ImpersonationAbortError) {
        const statusMap: Record<string, number> = {
          SESSION_NOT_FOUND: 404,
          NOT_AUTHORIZED: 403,
          ALREADY_ENDED: 409,
          ALREADY_EXPIRED: 409,
        };
        const status = statusMap[error.code] ?? 400;
        return sendError(reply, error.code, error.message, status);
      }
      fastify.log.error({ err: error }, '[Impersonation] stop error');
      return sendError(reply, 'INTERNAL_ERROR', 'Impersonation stop failed', 500);
    }
  });

  /**
   * GET /api/control/impersonation/status/:impersonationId
   *
   * Return current status of an impersonation session.
   * Does not return the token (single-issuance at start time).
   */
  fastify.get<{ Params: { impersonationId: string } }>(
    '/impersonation/status/:impersonationId',
    async (request, reply) => {
      try {
        if (!request.isAdmin || !request.adminId || !request.adminRole) {
          return sendError(reply, 'FORBIDDEN', 'Admin authentication required', 403);
        }

        const { impersonationId } = request.params;
        if (!impersonationId?.match(/^[0-9a-f-]{36}$/i)) {
          return sendError(reply, 'VALIDATION_ERROR', 'impersonationId must be a valid UUID', 400);
        }

        const status = await getImpersonationStatus(
          prisma,
          request.adminId,
          request.adminRole,
          impersonationId
        );

        return sendSuccess(reply, status);
      } catch (error: unknown) {
        if (error instanceof ImpersonationAbortError) {
          const statusMap: Record<string, number> = {
            SESSION_NOT_FOUND: 404,
            NOT_AUTHORIZED: 403,
          };
          const status = statusMap[error.code] ?? 400;
          return sendError(reply, error.code, error.message, status);
        }
        fastify.log.error({ err: error }, '[Impersonation] status error');
        return sendError(reply, 'INTERNAL_ERROR', 'Impersonation status lookup failed', 500);
      }
    }
  );
};

export default impersonationRoutes;
