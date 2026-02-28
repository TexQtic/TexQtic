/**
 * G-021 Day 3 — Internal Maker-Checker Approval Routes
 *
 * INTERNAL-ONLY: These routes require the `X-Texqtic-Internal: true` header.
 * Any request without this header receives 403 before auth runs.
 *
 * Two route groups, separated by realm:
 *
 *   Tenant (org-scoped, tenant JWT):
 *     GET  /api/internal/gov/approvals
 *     GET  /api/internal/gov/approvals/:id
 *     POST /api/internal/gov/approvals/:id/sign
 *     POST /api/internal/gov/approvals/:id/replay
 *
 *   Control plane (admin JWT, cross-org capable):
 *     GET  /api/control/internal/gov/approvals
 *     GET  /api/control/internal/gov/approvals/:id
 *     POST /api/control/internal/gov/approvals/:id/sign
 *     POST /api/control/internal/gov/approvals/:id/replay
 *
 * Internal-only enforcement:
 *   Header `X-Texqtic-Internal: true` is checked in an `onRequest` hook BEFORE
 *   auth middleware fires. Missing or wrong header → 403 NOT_INTERNAL_REQUEST.
 *   This prevents accidental exposure to public callers without touching auth middleware.
 *
 * Realm alignment with realmGuard:
 *   - /api/internal/gov/* maps to 'tenant' by realmGuard default catch-all.
 *   - /api/control/internal/gov/* maps to 'admin' by realmGuard /api/control prefix.
 *   No realmGuard changes needed.
 *
 * Doctrine v1.4 compliance:
 *   - All org boundaries enforced via orgId from JWT.
 *   - D-021-A/B/C enforced by MakerCheckerService.
 *   - aiTriggered forced false in replay (no AI replay authority).
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { tenantAuthMiddleware, adminAuthMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../db/prisma.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import { MakerCheckerService } from '../../services/makerChecker.service.js';
import { EscalationService } from '../../services/escalation.service.js';
import { SanctionsService } from '../../services/sanctions.service.js';
import type { SignerActorType } from '../../services/makerChecker.types.js';

// ─── Internal‐only header guard ───────────────────────────────────────────────

const INTERNAL_HEADER = 'x-texqtic-internal';
const INTERNAL_VALUE  = 'true';

async function internalOnlyGuard(request: FastifyRequest, reply: FastifyReply) {
  const headerValue = request.headers[INTERNAL_HEADER];
  if (headerValue !== INTERNAL_VALUE) {
    return sendError(
      reply,
      'NOT_INTERNAL_REQUEST',
      'This endpoint is restricted to internal service calls. ' +
      'Set X-Texqtic-Internal: true header to proceed.',
      403,
    );
  }
}

// ─── Shared Zod schemas ────────────────────────────────────────────────────────

const uuidSchema   = z.string().uuid('Must be a valid UUID');
const approvalIdParam = z.object({ id: uuidSchema });

const signBodySchema = z.object({
  decision:        z.enum(['APPROVE', 'REJECT']),
  reason:          z.string().min(5, 'reason must be at least 5 characters').max(1000).trim(),
  signerActorType: z.enum(['CHECKER', 'PLATFORM_ADMIN']),
  signerUserId:    z.string().uuid().nullable().optional(),
  signerAdminId:   z.string().uuid().nullable().optional(),
  signerRole:      z.string().min(1).max(200).trim(),
  impersonationId: z.string().uuid().nullable().optional(),
});

const replayBodySchema = z.object({
  callerActorType:      z.enum(['CHECKER', 'PLATFORM_ADMIN']).optional(),
  callerImpersonationId: z.string().uuid().nullable().optional(),
}).optional();

const tenantQueueQuerySchema = z.object({
  status:     z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'ESCALATED']).optional(),
  entityType: z.enum(['TRADE', 'ESCROW', 'CERTIFICATION']).optional(),
});

const adminQueueQuerySchema = z.object({
  orgId:      z.string().uuid().optional(),
  status:     z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'ESCALATED']).optional(),
  entityType: z.enum(['TRADE', 'ESCROW', 'CERTIFICATION']).optional(),
});

// ─── Service factory ──────────────────────────────────────────────────────────

// G-021 Fix C: inject EscalationService so verifyAndReplay() performs freeze
// checks (D-022-D) before replaying APPROVED transitions through StateMachineService.
// G-024: inject SanctionsService so sanctions imposed after MAKER submission
// block the CHECKER replay (replay safety guarantee).
function buildService(): MakerCheckerService {
  const escalation = new EscalationService(prisma);
  const sanctions  = new SanctionsService(prisma);
  const sm = new StateMachineService(prisma, escalation, sanctions);
  return new MakerCheckerService(prisma, sm, escalation);
}

// ─────────────────────────────────────────────────────────────────────────────
// TENANT APPROVAL ROUTES
// Registered at: /api/internal/gov (via index.ts → routes/internal/index.ts)
// Realm: TENANT — requires tenant JWT
// ─────────────────────────────────────────────────────────────────────────────

export const tenantApprovalRoutes: FastifyPluginAsync = async fastify => {
  // Step 1: Internal header guard fires before auth
  fastify.addHook('onRequest', internalOnlyGuard);

  // Step 2: Tenant JWT auth for all routes in this plugin
  fastify.addHook('onRequest', tenantAuthMiddleware);

  // ─── GET /approvals ───────────────────────────────────────────────────────
  // List REQUESTED + ESCALATED approvals for the authenticated org.
  fastify.get('/approvals', async (request, reply) => {
    if (!request.tenantId || !request.userId) {
      return sendError(reply, 'UNAUTHORIZED', 'Tenant authentication required', 401);
    }

    const parseResult = tenantQueueQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendError(reply, 'VALIDATION_ERROR', parseResult.error.errors[0]?.message ?? 'Invalid query', 400);
    }

    try {
      const svc = buildService();
      const { status, entityType } = parseResult.data;
      const queue = await svc.getControlPlaneQueue({
        scope:      'TENANT',
        orgId:      request.tenantId,
        status:     status ? [status] : undefined,
        entityType: entityType ?? undefined,
      });
      return sendSuccess(reply, { approvals: queue, count: queue.length });
    } catch (err) {
      return sendError(reply, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
    }
  });

  // ─── GET /approvals/:id ───────────────────────────────────────────────────
  fastify.get('/approvals/:id', async (request, reply) => {
    if (!request.tenantId) {
      return sendError(reply, 'UNAUTHORIZED', 'Tenant authentication required', 401);
    }

    const parsedParams = approvalIdParam.safeParse(request.params);
    if (!parsedParams.success) {
      return sendError(reply, 'VALIDATION_ERROR', 'Invalid approval ID', 400);
    }

    try {
      const svc = buildService();
      const approval = await svc.getApprovalById(parsedParams.data.id, request.tenantId);
      if (!approval) {
        return sendError(reply, 'NOT_FOUND', `Approval ${parsedParams.data.id} not found`, 404);
      }
      return sendSuccess(reply, { approval });
    } catch (err) {
      return sendError(reply, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
    }
  });

  // ─── POST /approvals/:id/sign ─────────────────────────────────────────────
  fastify.post('/approvals/:id/sign', async (request, reply) => {
    if (!request.tenantId || !request.userId) {
      return sendError(reply, 'UNAUTHORIZED', 'Tenant authentication required', 401);
    }

    const parsedParams = approvalIdParam.safeParse(request.params);
    if (!parsedParams.success) {
      return sendError(reply, 'VALIDATION_ERROR', 'Invalid approval ID', 400);
    }

    const parsedBody = signBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return sendError(reply, 'VALIDATION_ERROR', parsedBody.error.errors[0]?.message ?? 'Invalid request body', 400);
    }

    const body = parsedBody.data;
    try {
      const svc = buildService();
      const result = await svc.signApproval({
        approvalId:      parsedParams.data.id,
        orgId:           request.tenantId,
        decision:        body.decision,
        reason:          body.reason,
        signerActorType: body.signerActorType as SignerActorType,
        signerUserId:    body.signerUserId ?? request.userId,
        signerAdminId:   body.signerAdminId ?? null,
        signerRole:      body.signerRole,
        impersonationId: body.impersonationId ?? null,
      });

      if (result.status === 'ERROR') {
        const httpCode =
          result.code === 'APPROVAL_NOT_FOUND' ? 404 :
          result.code === 'APPROVAL_EXPIRED' ? 410 :
          result.code === 'MAKER_CHECKER_SAME_PRINCIPAL' ? 403 : 400;
        return sendError(reply, result.code, result.message, httpCode);
      }

      return sendSuccess(reply, result, 200);
    } catch (err) {
      return sendError(reply, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
    }
  });

  // ─── POST /approvals/:id/replay ───────────────────────────────────────────
  fastify.post('/approvals/:id/replay', async (request, reply) => {
    if (!request.tenantId || !request.userId) {
      return sendError(reply, 'UNAUTHORIZED', 'Tenant authentication required', 401);
    }

    const parsedParams = approvalIdParam.safeParse(request.params);
    if (!parsedParams.success) {
      return sendError(reply, 'VALIDATION_ERROR', 'Invalid approval ID', 400);
    }

    const parsedBody = replayBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return sendError(reply, 'VALIDATION_ERROR', parsedBody.error.errors[0]?.message ?? 'Invalid request body', 400);
    }

    try {
      const svc = buildService();
      const result = await svc.verifyAndReplay({
        approvalId:            parsedParams.data.id,
        orgId:                 request.tenantId,
        callerActorType:       parsedBody.data?.callerActorType as SignerActorType | undefined,
        callerUserId:          request.userId,
        callerImpersonationId: parsedBody.data?.callerImpersonationId ?? null,
      });

      if (result.status === 'ERROR') {
        const httpCode =
          result.code === 'APPROVAL_NOT_FOUND' ? 404 :
          result.code === 'ALREADY_REPLAYED' ? 409 :
          result.code === 'PAYLOAD_INTEGRITY_VIOLATION' ? 422 :
          result.code === 'APPROVAL_EXPIRED' ? 410 :
          result.code === 'MAKER_CHECKER_SAME_PRINCIPAL' ? 403 : 400;
        return sendError(reply, result.code, result.message, httpCode);
      }

      return sendSuccess(reply, result, 200);
    } catch (err) {
      return sendError(reply, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CONTROL-PLANE APPROVAL ROUTES
// Registered at: /api/control/internal/gov (via index.ts → routes/internal/index.ts)
// Realm: ADMIN — requires admin JWT
// /api/control/* maps to 'admin' realm in realmGuard — no guard edit needed.
// ─────────────────────────────────────────────────────────────────────────────

export const adminApprovalRoutes: FastifyPluginAsync = async fastify => {
  // Step 1: Internal header guard fires before auth
  fastify.addHook('onRequest', internalOnlyGuard);

  // Step 2: Admin JWT auth for all routes in this plugin
  fastify.addHook('onRequest', adminAuthMiddleware);

  // ─── GET /approvals ───────────────────────────────────────────────────────
  // List approvals — admin can filter by orgId or see all pending.
  fastify.get('/approvals', async (request, reply) => {
    if (!request.isAdmin || !request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
    }

    const parseResult = adminQueueQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendError(reply, 'VALIDATION_ERROR', parseResult.error.errors[0]?.message ?? 'Invalid query', 400);
    }

    try {
      const svc = buildService();
      const { orgId, status, entityType } = parseResult.data;
      const queue = await svc.getControlPlaneQueue({
        scope:      'CONTROL_PLANE',
        orgId:      orgId ?? undefined,
        status:     status ? [status] : undefined,
        entityType: entityType ?? undefined,
      });
      return sendSuccess(reply, { approvals: queue, count: queue.length });
    } catch (err) {
      return sendError(reply, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
    }
  });

  // ─── GET /approvals/:id ───────────────────────────────────────────────────
  // Fetch a single approval — admin may access any org.
  fastify.get('/approvals/:id', async (request, reply) => {
    if (!request.isAdmin) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
    }

    const parsedParams = approvalIdParam.safeParse(request.params);
    if (!parsedParams.success) {
      return sendError(reply, 'VALIDATION_ERROR', 'Invalid approval ID', 400);
    }

    try {
      const svc = buildService();
      // Admin version: no orgId scope restriction
      const approval = await svc.getApprovalById(parsedParams.data.id);
      if (!approval) {
        return sendError(reply, 'NOT_FOUND', `Approval ${parsedParams.data.id} not found`, 404);
      }
      return sendSuccess(reply, { approval });
    } catch (err) {
      return sendError(reply, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
    }
  });

  // ─── POST /approvals/:id/sign ─────────────────────────────────────────────
  fastify.post('/approvals/:id/sign', async (request, reply) => {
    if (!request.isAdmin || !request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
    }

    const parsedParams = approvalIdParam.safeParse(request.params);
    if (!parsedParams.success) {
      return sendError(reply, 'VALIDATION_ERROR', 'Invalid approval ID', 400);
    }

    const parsedBody = signBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return sendError(reply, 'VALIDATION_ERROR', parsedBody.error.errors[0]?.message ?? 'Invalid body', 400);
    }

    const body = parsedBody.data;
    try {
      const svc = buildService();
      const result = await svc.signApproval({
        approvalId:      parsedParams.data.id,
        decision:        body.decision,
        reason:          body.reason,
        signerActorType: 'PLATFORM_ADMIN',
        signerUserId:    body.signerUserId ?? null,
        signerAdminId:   body.signerAdminId ?? request.adminId,
        signerRole:      body.signerRole,
        impersonationId: body.impersonationId ?? null,
      });

      if (result.status === 'ERROR') {
        const httpCode =
          result.code === 'APPROVAL_NOT_FOUND' ? 404 :
          result.code === 'APPROVAL_EXPIRED' ? 410 :
          result.code === 'MAKER_CHECKER_SAME_PRINCIPAL' ? 403 : 400;
        return sendError(reply, result.code, result.message, httpCode);
      }

      return sendSuccess(reply, result, 200);
    } catch (err) {
      return sendError(reply, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
    }
  });

  // ─── POST /approvals/:id/replay ───────────────────────────────────────────
  fastify.post('/approvals/:id/replay', async (request, reply) => {
    if (!request.isAdmin || !request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin authentication required', 401);
    }

    const parsedParams = approvalIdParam.safeParse(request.params);
    if (!parsedParams.success) {
      return sendError(reply, 'VALIDATION_ERROR', 'Invalid approval ID', 400);
    }

    const parsedBody = replayBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return sendError(reply, 'VALIDATION_ERROR', parsedBody.error.errors[0]?.message ?? 'Invalid body', 400);
    }

    try {
      const svc = buildService();
      const result = await svc.verifyAndReplay({
        approvalId:            parsedParams.data.id,
        callerActorType:       'PLATFORM_ADMIN',
        callerAdminId:         request.adminId,
        callerImpersonationId: parsedBody.data?.callerImpersonationId ?? null,
      });

      if (result.status === 'ERROR') {
        const httpCode =
          result.code === 'APPROVAL_NOT_FOUND' ? 404 :
          result.code === 'ALREADY_REPLAYED' ? 409 :
          result.code === 'PAYLOAD_INTEGRITY_VIOLATION' ? 422 :
          result.code === 'APPROVAL_EXPIRED' ? 410 :
          result.code === 'MAKER_CHECKER_SAME_PRINCIPAL' ? 403 : 400;
        return sendError(reply, result.code, result.message, httpCode);
      }

      return sendSuccess(reply, result, 200);
    } catch (err) {
      return sendError(reply, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
    }
  });
};
