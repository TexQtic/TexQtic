/**
 * G-019 — Tenant Plane Certification Routes
 *
 * Fastify plugin — registered at /api/tenant/certifications
 *
 * Routes:
 *   POST  /api/tenant/certifications                  — create certification (SUBMITTED)
 *   GET   /api/tenant/certifications                  — list certifications (own org)
 *   GET   /api/tenant/certifications/:id              — get certification detail
 *   PATCH /api/tenant/certifications/:id              — update metadata (not state)
 *   POST  /api/tenant/certifications/:id/transition   — advance lifecycle state
 *
 * Constitutional compliance:
 *   D-017-A  orgId ALWAYS derived from JWT/dbContext — NEVER from request body
 *   D-020-C  aiTriggered=true requires "HUMAN_CONFIRMED:" prefix in reason
 *   D-020-D  reason is mandatory for create and transition
 *   Audit written via writeAuditLog (within same withDbContext scope)
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog } from '../../lib/auditLog.js';
import { CertificationService } from '../../services/certification.g019.service.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import { EscalationService } from '../../services/escalation.service.js';
import { SanctionsService } from '../../services/sanctions.service.js';

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Proxy that wraps a TransactionClient so that calls to .$transaction(cb)
 * execute cb(tx) within the current open transaction, preserving RLS context
 * while allowing CertificationService to call this.db.$transaction() internally.
 */
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

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const createCertBodySchema = z.object({
  certificationType:  z.string().min(1).max(100).trim(),
  reason:             z.string().min(1).max(2000).trim(),
  issuedAt:           z.string().datetime({ offset: true }).optional().nullable(),
  expiresAt:          z.string().datetime({ offset: true }).optional().nullable(),
  createdByUserId:    uuidSchema.optional().nullable(),
  // D-017-A: orgId MUST NOT be in the body
  orgId:              z.never({ message: 'orgId must not be set in request body' }).optional(),
});

const updateCertBodySchema = z.object({
  certificationType:  z.string().min(1).max(100).trim().optional(),
  issuedAt:           z.string().datetime({ offset: true }).optional().nullable(),
  expiresAt:          z.string().datetime({ offset: true }).optional().nullable(),
  // D-017-A: orgId MUST NOT be in the body
  orgId:              z.never({ message: 'orgId must not be set in request body' }).optional(),
});

const transitionCertBodySchema = z.object({
  toStateKey:   z.string().min(1).max(100).trim().toUpperCase(),
  reason:       z.string().min(1).max(2000).trim(),
  actorRole:    z.string().min(1).max(100).trim(),
  aiTriggered:  z.boolean().optional().default(false),
  // D-017-A: orgId MUST NOT be in the body
  orgId:        z.never({ message: 'orgId must not be set in request body' }).optional(),
});

const listQuerySchema = z.object({
  stateKey: z.string().max(50).trim().toUpperCase().optional(),
  limit:    z.coerce.number().int().min(1).max(200).optional().default(50),
  offset:   z.coerce.number().int().min(0).optional().default(0),
});

const certIdParamSchema = z.object({ id: uuidSchema });

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantCertificationRoutes: FastifyPluginAsync = async fastify => {

  // ─── POST /api/tenant/certifications ────────────────────────────────────
  /**
   * Create a certification in SUBMITTED lifecycle state.
   * orgId derived exclusively from authenticated JWT (dbContext.orgId).
   */
  fastify.post(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      const bodyResult = createCertBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const txBound = makeTxBoundPrisma(tx);
        const escalationSvc = new EscalationService(txBound);
        const sanctionsSvc  = new SanctionsService(txBound);
        const svc = new CertificationService(
          txBound,
          new StateMachineService(txBound, escalationSvc, sanctionsSvc),
          sanctionsSvc,
        );

        const result = await svc.createCertification({
          orgId:             dbContext.orgId,
          certificationType: body.certificationType,
          reason:            body.reason,
          issuedAt:          body.issuedAt ? new Date(body.issuedAt) : null,
          expiresAt:         body.expiresAt ? new Date(body.expiresAt) : null,
          createdByUserId:   body.createdByUserId ?? userId,
        });

        if (result.status === 'ERROR') {
          const httpStatus =
            result.code === 'REASON_REQUIRED' || result.code === 'INVALID_INPUT' ? 400
            : result.code === 'INVALID_LIFECYCLE_STATE' ? 500
            : 400;
          return sendError(reply, result.code, result.message, httpStatus);
        }

        // Audit: certification created
        await writeAuditLog(tx, {
          realm:       'TENANT',
          tenantId:    dbContext.orgId,
          actorType:   'USER',
          actorId:     userId,
          action:      'CERTIFICATION_CREATED',
          entity:      'certification',
          entityId:    result.certificationId,
          afterJson:   {
            certificationId:   result.certificationId,
            certificationType: body.certificationType,
            stateKey:          result.stateKey,
            reason:            body.reason,
          },
        });

        reply.code(201);
        return sendSuccess(reply, {
          certificationId:   result.certificationId,
          stateKey:          result.stateKey,
          certificationType: body.certificationType.toUpperCase(),
        });
      });
    },
  );

  // ─── GET /api/tenant/certifications ─────────────────────────────────────
  /**
   * List certifications for the authenticated org (tenant-scoped).
   */
  fastify.get(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const queryResult = listQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }
      const query = queryResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const txBound = makeTxBoundPrisma(tx);
        const escalationSvc = new EscalationService(txBound);
        const sanctionsSvc  = new SanctionsService(txBound);
        const svc = new CertificationService(
          txBound,
          new StateMachineService(txBound, escalationSvc, sanctionsSvc),
          sanctionsSvc,
        );

        const result = await svc.listCertifications(dbContext.orgId, {
          stateKey: query.stateKey,
          limit:    query.limit,
          offset:   query.offset,
        });

        if (result.status === 'ERROR') {
          return sendError(reply, result.code, result.message, 500);
        }

        return sendSuccess(reply, {
          items:  result.items,
          total:  result.total,
          limit:  query.limit,
          offset: query.offset,
        });
      });
    },
  );

  // ─── GET /api/tenant/certifications/:id ─────────────────────────────────
  /**
   * Get a single certification by id (tenant-scoped).
   */
  fastify.get(
    '/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const paramResult = certIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id } = paramResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const txBound = makeTxBoundPrisma(tx);
        const escalationSvc = new EscalationService(txBound);
        const sanctionsSvc  = new SanctionsService(txBound);
        const svc = new CertificationService(
          txBound,
          new StateMachineService(txBound, escalationSvc, sanctionsSvc),
          sanctionsSvc,
        );

        const result = await svc.getCertification(id, dbContext.orgId);

        if (result.status === 'ERROR') {
          const httpStatus = result.code === 'NOT_FOUND' ? 404 : 500;
          return sendError(reply, result.code, result.message, httpStatus);
        }

        return sendSuccess(reply, result.certification);
      });
    },
  );

  // ─── PATCH /api/tenant/certifications/:id ───────────────────────────────
  /**
   * Update certification metadata (certificationType, issuedAt, expiresAt).
   * Lifecycle state is NOT updated via this endpoint — use /transition.
   */
  fastify.patch(
    '/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      const paramResult = certIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id } = paramResult.data;

      const bodyResult = updateCertBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const txBound = makeTxBoundPrisma(tx);
        const escalationSvc = new EscalationService(txBound);
        const sanctionsSvc  = new SanctionsService(txBound);
        const svc = new CertificationService(
          txBound,
          new StateMachineService(txBound, escalationSvc, sanctionsSvc),
          sanctionsSvc,
        );

        const result = await svc.updateCertification({
          certificationId:   id,
          orgId:             dbContext.orgId,
          certificationType: body.certificationType,
          issuedAt:          body.issuedAt !== undefined
            ? (body.issuedAt ? new Date(body.issuedAt) : null)
            : undefined,
          expiresAt:         body.expiresAt !== undefined
            ? (body.expiresAt ? new Date(body.expiresAt) : null)
            : undefined,
        });

        if (result.status === 'ERROR') {
          const httpStatus =
            result.code === 'NOT_FOUND' ? 404
            : result.code === 'INVALID_INPUT' ? 400
            : 500;
          return sendError(reply, result.code, result.message, httpStatus);
        }

        // Audit
        await writeAuditLog(tx, {
          realm:     'TENANT',
          tenantId:  dbContext.orgId,
          actorType: 'USER',
          actorId:   userId,
          action:    'CERTIFICATION_UPDATED',
          entity:    'certification',
          entityId:  id,
          afterJson: body as unknown as import('@prisma/client').Prisma.JsonValue,
        });

        return sendSuccess(reply, { certificationId: result.certificationId });
      });
    },
  );

  // ─── POST /api/tenant/certifications/:id/transition ─────────────────────
  /**
   * Advance certification lifecycle state via StateMachineService.
   * entity_type='CERTIFICATION' is hard-coded in the service — never caller-supplied.
   */
  fastify.post(
    '/:id/transition',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      const paramResult = certIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id } = paramResult.data;

      const bodyResult = transitionCertBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const txBound = makeTxBoundPrisma(tx);
        const escalationSvc = new EscalationService(txBound);
        const sanctionsSvc  = new SanctionsService(txBound);
        const svc = new CertificationService(
          txBound,
          new StateMachineService(txBound, escalationSvc, sanctionsSvc),
          sanctionsSvc,
        );

        const result = await svc.transitionCertification({
          certificationId: id,
          orgId:           dbContext.orgId,
          toStateKey:      body.toStateKey,
          reason:          body.reason,
          actorRole:       body.actorRole,
          actorUserId:     userId,
          actorAdminId:    null,
          aiTriggered:     body.aiTriggered,
        });

        if (result.status === 'ERROR') {
          const httpStatus =
            result.code === 'NOT_FOUND' ? 404
            : result.code === 'REASON_REQUIRED' || result.code === 'INVALID_INPUT' ? 400
            : result.code === 'TRANSITION_NOT_APPLIED' ? 422
            : 500;
          return sendError(reply, result.code, result.message, httpStatus);
        }

        // Audit
        await writeAuditLog(tx, {
          realm:     'TENANT',
          tenantId:  dbContext.orgId,
          actorType: 'USER',
          actorId:   userId,
          action:    `CERTIFICATION_TRANSITION_${result.status}`,
          entity:    'certification',
          entityId:  id,
          afterJson: {
            certificationId: id,
            toStateKey:      body.toStateKey,
            smStatus:        result.status,
            newStateKey:     result.newStateKey,
            reason:          body.reason,
          },
        });

        return sendSuccess(reply, {
          certificationId: id,
          status:          result.status,
          newStateKey:     result.newStateKey,
        });
      });
    },
  );
};

export default tenantCertificationRoutes;
