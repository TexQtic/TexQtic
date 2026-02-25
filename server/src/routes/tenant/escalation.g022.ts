/**
 * G-022 Day 3 — Tenant Plane Escalation Routes
 *
 * Fastify plugin — registered at /api/tenant/escalations
 *
 * Routes:
 *   GET  /api/tenant/escalations   — list own org's escalation events
 *   POST /api/tenant/escalations   — tenant-initiated escalation (LEVEL_0 / LEVEL_1 only)
 *
 * Constitutional compliance:
 *   D-022-A  Severity monotonicity enforced by EscalationService (Layer 1)
 *   D-022-B  Org freeze derived from escalation_events only
 *   D-022-C  Kill switch never auto-toggled from tenant routes
 *   D-022-D  Override path is control-only; tenant can only create root escalations
 *
 * Tenant scope constraint:
 *   - orgId is ALWAYS derived from JWT (tenantId claim) — NEVER accepted from client body.
 *   - Tenant-initiated escalations are restricted to LEVEL_0 and LEVEL_1 by service layer.
 *   - LEVEL_2+ requires PLATFORM_ADMIN or TENANT_ADMIN via control plane.
 *
 * Audit guarantee:
 *   ESCALATION_CREATED audit written in same Prisma transaction as escalation INSERT.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog } from '../../lib/auditLog.js';
import { EscalationService } from '../../services/escalation.service.js';
import type { PrismaClient } from '@prisma/client';

// ─── Zod schemas ───────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Tenant-initiated escalations: only LEVEL_0 and LEVEL_1 permitted.
 * The EscalationService enforces this for SYSTEM_AUTOMATION; for TENANT_ADMIN
 * the route enforces the level cap.
 */
const tenantSeveritySchema = z
  .number()
  .int()
  .min(0)
  .max(1, 'Tenant-initiated escalations are restricted to LEVEL_0 and LEVEL_1') as z.ZodType<0 | 1>;

const tenantCreateBodySchema = z.object({
  entityType: z.enum(['TRADE', 'ESCROW', 'APPROVAL', 'LIFECYCLE_LOG']),
  entityId:   uuidSchema,
  reason:     z.string().min(1).max(2000).trim(),
  severityLevel: tenantSeveritySchema,
});

const tenantListQuerySchema = z.object({
  entityType: z.enum(['TRADE', 'ESCROW', 'APPROVAL', 'LIFECYCLE_LOG', 'ORG', 'GLOBAL']).optional(),
  entityId:   uuidSchema.optional(),
  status:     z.enum(['OPEN', 'RESOLVED', 'OVERRIDDEN']).optional(),
  limit:      z.coerce.number().int().min(1).max(100).optional(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantEscalationRoutes: FastifyPluginAsync = async fastify => {

  // ─── GET /api/tenant/escalations ───────────────────────────────────────────
  /**
   * List escalation events for the authenticated tenant's org.
   * orgId is derived from the JWT tenantId — never from the client.
   * RLS via withDbContext enforces the org boundary at DB level.
   */
  fastify.get(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const queryResult = tenantListQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }
      const query = queryResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const svc = new EscalationService(tx as unknown as PrismaClient);
          return svc.listEscalations({
            orgId:      dbContext.orgId,
            entityType: query.entityType,
            entityId:   query.entityId,
            status:     query.status,
            limit:      query.limit,
          });
        });

        if (result.status !== 'OK') {
          return sendError(reply, result.code, result.message, 500);
        }

        return sendSuccess(reply, { escalations: result.rows, count: result.count });
      } catch (err) {
        fastify.log.error({ err }, '[G-022] GET /tenant/escalations error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list escalations', 500);
      }
    },
  );

  // ─── POST /api/tenant/escalations ──────────────────────────────────────────
  /**
   * Create a tenant-initiated escalation event (LEVEL_0 or LEVEL_1 only).
   * orgId is derived from JWT — client body MUST NOT set org boundary.
   * LEVEL_2+ requires a control-plane admin action.
   * Audit written in same transaction as escalation INSERT.
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

      const bodyResult = tenantCreateBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const svc = new EscalationService(tx as unknown as PrismaClient);
          const createResult = await svc.createEscalation({
            orgId:                dbContext.orgId,          // D-022: from JWT, not client body
            entityType:           body.entityType,
            entityId:             body.entityId,
            source:               'MANUAL',
            severityLevel:        body.severityLevel,
            triggeredByActorType: 'TENANT_ADMIN',
            triggeredByPrincipal: userId,
            reason:               body.reason,
            freezeRecommendation: false,                    // D-022-C: tenant cannot set this
          });

          if (createResult.status !== 'CREATED') {
            return createResult;
          }

          // Audit in same transaction
          await writeAuditLog(tx as unknown as PrismaClient, {
            realm:     'TENANT',
            tenantId:  dbContext.orgId,
            actorType: 'USER',
            actorId:   userId,
            action:    'ESCALATION_CREATED',
            entity:    'escalation_event',
            entityId:  createResult.escalationEventId,
            metadataJson: {
              orgId:          dbContext.orgId,
              entityType:     body.entityType,
              entityId:       body.entityId,
              severityLevel:  body.severityLevel,
              source:         'MANUAL',
              reason:         body.reason,
              escalationId:   createResult.escalationEventId,
            },
          });

          return createResult;
        });

        if (result.status !== 'CREATED') {
          return sendError(reply, (result as any).code ?? 'ESCALATION_ERROR', (result as any).message, 422);
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
        fastify.log.error({ err }, '[G-022] POST /tenant/escalations error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to create escalation', 500);
      }
    },
  );
};

export default tenantEscalationRoutes;
