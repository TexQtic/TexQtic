/**
 * G-022 Day 3 — Control Plane Escalation Routes
 *
 * Fastify plugin — registered at /api/control/escalations
 *
 * Routes:
 *   POST   /api/control/escalations                  — create root escalation
 *   POST   /api/control/escalations/:id/upgrade      — upgrade severity
 *   POST   /api/control/escalations/:id/resolve      — resolve or override
 *   GET    /api/control/escalations                  — list (filtered)
 *
 * Constitutional compliance:
 *   D-022-A  Monotonic severity chain enforced by EscalationService (Layer 1)
 *            + DB trigger (Layer 2)
 *   D-022-B  Org freeze derived from escalation_events only — no org boolean
 *   D-022-C  freeze_recommendation is informational; kill switch never auto-toggled here
 *   D-022-D  Override path: escalation row + audit BOTH written in same tx
 *
 * Audit guarantee:
 *   Every mutation writes an audit_log row in the SAME Prisma transaction as the
 *   escalation_events INSERT (atomic — no partial-write risk).
 *
 * RLS note:
 *   withDbContext sets app.org_id = target orgId (admin body/param-derived).
 *   escalation_tenant_insert policy allows INSERT when app.org_id matches row org_id.
 *   Admin SELECT uses withAdminContext (app.is_admin = 'true') for cross-org reads.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { adminAuthMiddleware, requireAdminRole } from '../../middleware/auth.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { randomUUID } from 'node:crypto';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog, createAdminAudit } from '../../lib/auditLog.js';
import { EscalationService } from '../../services/escalation.service.js';
import type { PrismaClient } from '@prisma/client';

// ─── Shared Zod schemas ────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');
const escalationIdParam = z.object({ id: uuidSchema });

const severitySchema = z
  .number()
  .int()
  .min(0)
  .max(4) as z.ZodType<0 | 1 | 2 | 3 | 4>;

const entityTypeSchema = z.enum([
  'TRADE',
  'ESCROW',
  'APPROVAL',
  'LIFECYCLE_LOG',
  'ORG',
  'GLOBAL',
]);

const actorTypeSchema = z.enum([
  'PLATFORM_ADMIN',
  'TENANT_ADMIN',
  'SYSTEM_AUTOMATION',
  'SERVICE_LAYER',
]);

const sourceSchema = z.enum(['STATE_MACHINE', 'APPROVAL', 'MANUAL', 'SYSTEM']);

// ─── Route body schemas ────────────────────────────────────────────────────────

const createBodySchema = z.object({
  /** Target org for the escalation — admin specifies explicitly */
  orgId:                  uuidSchema,
  entityType:             entityTypeSchema,
  entityId:               uuidSchema,
  source:                 sourceSchema,
  severityLevel:          severitySchema,
  triggeredByActorType:   actorTypeSchema,
  triggeredByPrincipal:   z.string().min(1).max(500),
  reason:                 z.string().min(1).max(2000).trim(),
  freezeRecommendation:   z.boolean().optional(),
});

const upgradeBodySchema = z.object({
  newSeverityLevel:       severitySchema,
  reason:                 z.string().min(1).max(2000).trim(),
  source:                 sourceSchema.optional().default('MANUAL'),
  triggeredByActorType:   actorTypeSchema.optional().default('PLATFORM_ADMIN'),
});

const resolveBodySchema = z.object({
  resolutionStatus:   z.enum(['RESOLVED', 'OVERRIDDEN']),
  reason:             z.string().min(1).max(2000).trim(),
});

const listQuerySchema = z.object({
  orgId:       uuidSchema.optional(),
  entityType:  entityTypeSchema.optional(),
  entityId:    uuidSchema.optional(),
  status:      z.enum(['OPEN', 'RESOLVED', 'OVERRIDDEN']).optional(),
  limit:       z.coerce.number().int().min(1).max(200).optional(),
});

// ─── Helper — set RLS context to target org, then run callback ─────────────────

async function withEscalationAdminContext<T>(
  orgId: string,
  adminId: string,
  callback: (tx: Parameters<typeof withDbContext>[2] extends (tx: infer TX) => unknown ? TX : never) => Promise<T>,
): Promise<T> {
  return withDbContext(
    prisma,
    {
      orgId,
      actorId:   adminId,
      realm:     'control',
      requestId: randomUUID(),
    },
    async tx => {
      // Admin bypass flag (mirrors withAdminContext pattern in control.ts).
      // Required so _admin_all audit_log policies permit the audit INSERT.
      await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
      return callback(tx);
    },
  );
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlEscalationRoutes: FastifyPluginAsync = async fastify => {
  fastify.addHook('onRequest', adminAuthMiddleware);

  // ─── POST /api/control/escalations ─────────────────────────────────────────
  /**
   * Create a root-level escalation event for any org.
   * Admin specifies orgId in body. Audit log written in SAME transaction.
   */
  fastify.post('/', async (request, reply) => {
    if (!request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
    }
    const adminId = request.adminId;

    const parseResult = createBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }
    const body = parseResult.data;

    try {
      const result = await withEscalationAdminContext(body.orgId, adminId, async tx => {
        const svc = new EscalationService(tx as unknown as PrismaClient);
        const createResult = await svc.createEscalation({
          orgId:                body.orgId,
          entityType:           body.entityType,
          entityId:             body.entityId,
          source:               body.source,
          severityLevel:        body.severityLevel,
          triggeredByActorType: body.triggeredByActorType,
          triggeredByPrincipal: body.triggeredByPrincipal,
          reason:               body.reason,
          freezeRecommendation: body.freezeRecommendation,
        });

        if (createResult.status !== 'CREATED') {
          return createResult;
        }

        // D-022: audit in same transaction as escalation INSERT
        await writeAuditLog(tx as unknown as PrismaClient, {
          realm:      'ADMIN',
          tenantId:   body.orgId,
          actorType:  'ADMIN',
          actorId:    adminId,
          action:     'ESCALATION_CREATED',
          entity:     'escalation_event',
          entityId:   createResult.escalationEventId,
          metadataJson: {
            orgId:          body.orgId,
            entityType:     body.entityType,
            entityId:       body.entityId,
            severityLevel:  body.severityLevel,
            source:         body.source,
            reason:         body.reason,
            escalationId:   createResult.escalationEventId,
          },
        });

        return createResult;
      });

      if (result.status !== 'CREATED') {
        return sendError(reply, result.code ?? 'ESCALATION_ERROR', result.message, 422);
      }

      return sendSuccess(
        reply,
        {
          escalationEventId: result.escalationEventId,
          createdAt:         result.createdAt,
        },
        201,
      );
    } catch (err) {
      fastify.log.error({ err }, '[G-022] POST /escalations error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to create escalation', 500);
    }
  });

  // ─── POST /api/control/escalations/:id/upgrade ─────────────────────────────
  /**
   * Upgrade the severity of an existing OPEN escalation.
   * D-022-A: new severity must be strictly > parent severity.
   * Audit written in same transaction.
   */
  fastify.post('/:id/upgrade', { preHandler: requireAdminRole('SUPER_ADMIN') }, async (request, reply) => {
    if (!request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
    }
    const adminId = request.adminId;

    const paramsResult = escalationIdParam.safeParse(request.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error.errors);
    }
    const { id: parentEscalationId } = paramsResult.data;

    const bodyResult = upgradeBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return sendValidationError(reply, bodyResult.error.errors);
    }
    const body = bodyResult.data;

    try {
      // Step 1: Fetch parent to determine orgId for RLS context (admin-level read)
      const parent = await prisma.escalationEvent.findUnique({
        where: { id: parentEscalationId },
        select: { orgId: true, entityType: true, entityId: true, severityLevel: true, status: true },
      });

      if (!parent) {
        return sendError(reply, 'ESCALATION_NOT_FOUND', `Escalation ${parentEscalationId} not found`, 404);
      }

      // Step 2: Upgrade + audit in same transaction, RLS context = parent org
      const result = await withEscalationAdminContext(parent.orgId, adminId, async tx => {
        const svc = new EscalationService(tx as unknown as PrismaClient);
        const upgradeResult = await svc.upgradeEscalation({
          parentEscalationId,
          severityLevel:        body.newSeverityLevel,
          reason:               body.reason,
          source:               body.source,
          triggeredByActorType: body.triggeredByActorType,
          triggeredByPrincipal: adminId,
        });

        if (upgradeResult.status !== 'UPGRADED') {
          return upgradeResult;
        }

        await writeAuditLog(tx as unknown as PrismaClient, {
          realm:     'ADMIN',
          tenantId:  parent.orgId,
          actorType: 'ADMIN',
          actorId:   adminId,
          action:    'ESCALATION_UPGRADED',
          entity:    'escalation_event',
          entityId:  upgradeResult.escalationEventId,
          metadataJson: {
            orgId:              parent.orgId,
            parentEscalationId,
            entityType:         parent.entityType,
            entityId:           parent.entityId,
            previousSeverity:   parent.severityLevel,
            newSeverity:        body.newSeverityLevel,
            reason:             body.reason,
            newEscalationId:    upgradeResult.escalationEventId,
          },
        });

        return upgradeResult;
      });

      if (result.status !== 'UPGRADED') {
        const httpCode =
          result.code === 'ESCALATION_NOT_FOUND'   ? 404 :
          result.code === 'ESCALATION_NOT_OPEN'    ? 409 : 422;
        return sendError(reply, result.code ?? 'ESCALATION_ERROR', result.message, httpCode);
      }

      return sendSuccess(reply, {
        escalationEventId: result.escalationEventId,
        createdAt:         result.createdAt,
      }, 201);
    } catch (err) {
      fastify.log.error({ err }, '[G-022] POST /escalations/:id/upgrade error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to upgrade escalation', 500);
    }
  });

  // ─── POST /api/control/escalations/:id/resolve ─────────────────────────────
  /**
   * Resolve or override an existing OPEN escalation.
   * D-022-D: OVERRIDDEN path requires severity >= 2 (enforced by service).
   * Audit event (ESCALATION_RESOLVED or ESCALATION_OVERRIDDEN) written in same tx.
   */
  fastify.post('/:id/resolve', { preHandler: requireAdminRole('SUPER_ADMIN') }, async (request, reply) => {
    if (!request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
    }
    const adminId = request.adminId;

    const paramsResult = escalationIdParam.safeParse(request.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error.errors);
    }
    const { id: escalationEventId } = paramsResult.data;

    const bodyResult = resolveBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return sendValidationError(reply, bodyResult.error.errors);
    }
    const body = bodyResult.data;

    try {
      // Fetch original for orgId context
      const original = await prisma.escalationEvent.findUnique({
        where: { id: escalationEventId },
        select: { orgId: true, entityType: true, entityId: true, severityLevel: true, status: true },
      });

      if (!original) {
        return sendError(reply, 'ESCALATION_NOT_FOUND', `Escalation ${escalationEventId} not found`, 404);
      }

      const result = await withEscalationAdminContext(original.orgId, adminId, async tx => {
        const svc = new EscalationService(tx as unknown as PrismaClient);

        if (body.resolutionStatus === 'RESOLVED') {
          const resolveResult = await svc.resolveEscalation({
            escalationEventId,
            resolvedByPrincipal: adminId,
            resolutionReason:    body.reason,
          });

          if (resolveResult.status !== 'RESOLVED') {
            return { ...resolveResult, action: 'RESOLVED' as const };
          }

          await writeAuditLog(tx as unknown as PrismaClient, {
            realm:     'ADMIN',
            tenantId:  original.orgId,
            actorType: 'ADMIN',
            actorId:   adminId,
            action:    'ESCALATION_RESOLVED',
            entity:    'escalation_event',
            entityId:  resolveResult.escalationEventId,
            metadataJson: {
              orgId:              original.orgId,
              originalId:         escalationEventId,
              entityType:         original.entityType,
              entityId:           original.entityId,
              resolutionEscId:    resolveResult.escalationEventId,
              resolvedByPrincipal: adminId,
              reason:             body.reason,
            },
          });

          return { ...resolveResult, action: 'RESOLVED' as const };
        } else {
          // OVERRIDDEN — D-022-D path
          const overrideResult = await svc.overrideEscalation({
            escalationEventId,
            resolvedByPrincipal: adminId,
            resolutionReason:    body.reason,
          });

          if (overrideResult.status !== 'OVERRIDDEN') {
            return { ...overrideResult, action: 'OVERRIDDEN' as const };
          }

          // D-022-D: override row + audit BOTH in same transaction
          await writeAuditLog(tx as unknown as PrismaClient, {
            realm:     'ADMIN',
            tenantId:  original.orgId,
            actorType: 'ADMIN',
            actorId:   adminId,
            action:    'ESCALATION_OVERRIDDEN',
            entity:    'escalation_event',
            entityId:  overrideResult.escalationEventId,
            metadataJson: {
              orgId:               original.orgId,
              originalId:          escalationEventId,
              entityType:          original.entityType,
              entityId:            original.entityId,
              overrideEscId:       overrideResult.escalationEventId,
              resolvedByPrincipal: adminId,
              reason:              body.reason,
            },
          });

          return { ...overrideResult, action: 'OVERRIDDEN' as const };
        }
      });

      if (result.status !== 'RESOLVED' && result.status !== 'OVERRIDDEN') {
        const httpCode =
          result.code === 'ESCALATION_NOT_FOUND'  ? 404 :
          result.code === 'ESCALATION_NOT_OPEN'   ? 409 :
          result.code === 'OVERRIDE_LEVEL_TOO_LOW' ? 422 : 422;
        return sendError(reply, (result as any).code ?? 'ESCALATION_ERROR', (result as any).message, httpCode);
      }

      return sendSuccess(reply, {
        escalationEventId: result.escalationEventId,
        resolutionStatus:  result.status,
        action:            result.action,
      }, 200);
    } catch (err) {
      fastify.log.error({ err }, '[G-022] POST /escalations/:id/resolve error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to resolve/override escalation', 500);
    }
  });

  // ─── GET /api/control/escalations ──────────────────────────────────────────
  /**
   * List escalations (admin cross-org view).
   * Query: orgId, entityType, entityId, status, limit.
   * orgId is required for RLS context — admin must specify the target org.
   */
  fastify.get('/', async (request, reply) => {
    if (!request.adminId) {
      return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
    }
    const adminId = request.adminId;

    const queryResult = listQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error.errors);
    }
    const query = queryResult.data;

    // orgId is required for list (scope boundary)
    if (!query.orgId) {
      return sendError(reply, 'VALIDATION_ERROR', 'orgId query parameter is required', 400);
    }

    try {
      const result = await withEscalationAdminContext(query.orgId, adminId, async tx => {
        const svc = new EscalationService(tx as unknown as PrismaClient);
        return svc.listEscalations({
          orgId:      query.orgId!,
          entityType: query.entityType,
          entityId:   query.entityId,
          status:     query.status,
          limit:      query.limit,
        });
      });

      if (result.status !== 'OK') {
        return sendError(reply, result.code, result.message, 500);
      }

      await writeAuditLog(prisma, createAdminAudit(adminId, 'control.escalations.read', 'escalation', { orgId: query.orgId, limit: query.limit, count: result.count }));
      return sendSuccess(reply, { escalations: result.rows, count: result.count });
    } catch (err) {
      fastify.log.error({ err }, '[G-022] GET /escalations error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to list escalations', 500);
    }
  });
};

export default controlEscalationRoutes;
