import type { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { z } from 'zod';
import { Prisma, type EventLog } from '@prisma/client';
import { adminAuthMiddleware, requireAdminRole } from '../middleware/auth.js';
import { sendSuccess, sendError, sendForbidden, sendNotFound, sendUnauthorized, sendValidationError } from '../utils/response.js';
import { randomUUID } from 'node:crypto';
import { withDbContext, type DatabaseContext } from '../lib/database-context.js';
import { prisma } from '../db/prisma.js';
import { writeAuditLog, createAdminAudit, writeAuthorityIntent } from '../lib/auditLog.js';
import controlEscalationRoutes from './control/escalation.g022.js';
import controlTradesRoutes from './control/trades.g017.js';
import controlEscrowRoutes from './control/escrow.g018.js';
import controlSettlementRoutes from './control/settlement.js';
import controlCertificationRoutes from './control/certifications.g019.js';
import adminTraceabilityRoutes from './admin/traceability.g016.js';
import controlPlaneAiRoutes from './control/ai.g028.js';

// ── Admin context helper (G-004) ──────────────────────────────────────────────
// Canonical replacement for withDbContextLegacy({ isAdmin: true }).
// Uses canonical withDbContext (texqtic_app role + transaction-local SET LOCAL),
// then sets app.is_admin = 'true' so _admin_all RLS policies grant
// cross-tenant access on tables that enforce RLS (e.g. audit_logs).
const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

async function withAdminContext<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  const ctx: DatabaseContext = {
    orgId:     ADMIN_SENTINEL_ID,
    actorId:   ADMIN_SENTINEL_ID,
    realm:     'control',
    requestId: randomUUID(),
  };
  return withDbContext(prisma, ctx, async tx => {
    // Admin RLS bypass: flag checked by _admin_all policies
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
    return callback(tx);
  });
}

const requireSuperAdminReadAccess: preHandlerHookHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
  done,
) => {
  if (!request.isAdmin || !request.adminRole) {
    sendUnauthorized(reply, 'Admin authentication required');
    done();
    return;
  }

  if (request.adminRole !== 'SUPER_ADMIN') {
    sendForbidden(reply, 'Requires one of: SUPER_ADMIN');
    done();
    return;
  }

  done();
};

const controlRoutes: FastifyPluginAsync = async fastify => {
  // All control routes require admin auth
  fastify.addHook('onRequest', adminAuthMiddleware);

  /**
   * GET /api/control/tenants
   * List all tenants (admin only)
   */
  fastify.get('/tenants', async (request, reply) => {
    const adminId = request.adminId ?? 'unknown';
    const tenants = await withAdminContext(async tx => {
      return await tx.tenant.findMany({
        include: {
          domains: true,
          branding: true,
          _count: {
            select: {
              memberships: true,
              auditLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    await writeAuditLog(prisma, createAdminAudit(adminId, 'control.tenants.read', 'tenant', { count: tenants.length }));
    return sendSuccess(reply, { tenants });
  });

  /**
   * GET /api/control/tenants/:id
   * Get tenant details (admin only)
   */
  fastify.get('/tenants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const adminId = request.adminId ?? 'unknown';

    const tenant = await withAdminContext(async tx => {
      return await tx.tenant.findUnique({
        where: { id },
        include: {
          domains: true,
          branding: true,
          aiBudget: true,
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  emailVerified: true,
                },
              },
            },
          },
        },
      });
    });

    if (!tenant) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
      });
    }

    await writeAuditLog(prisma, createAdminAudit(adminId, 'control.tenants.read_one', 'tenant', { tenantId: id }));
    return sendSuccess(reply, { tenant });
  });

  /**
   * GET /api/control/audit-logs
   * List all audit logs (admin only)
   *
   * D-3 fix (G-006C-AUDIT-LOGS-UNIFY-001): admin read access is now itself audited.
   * The audit write uses the existing writeAuditLog(prisma, ...) pattern (postgres role)
   * matching all other admin audit writes in this file. One entry per request, not per row.
   */
  fastify.get('/audit-logs', async (request, reply) => {
    // adminId guaranteed by adminAuthMiddleware
    const adminId = request.adminId ?? 'unknown';

    const query = request.query as {
      tenantId?: string;
      action?: string;
      limit?: string;
    };

    const logs = await withAdminContext(async tx => {
      return await tx.auditLog.findMany({
        where: {
          ...(query.tenantId && { tenantId: query.tenantId }),
          ...(query.action && { action: query.action }),
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit ? parseInt(query.limit) : 50,
        include: {
          tenant: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      });
    });

    // D-3: Audit the admin read (one entry per request, no loop risk)
    await writeAuditLog(
      prisma,
      createAdminAudit(adminId, 'ADMIN_AUDIT_LOG_VIEW', 'audit_log', {
        filterTenantId: query.tenantId ?? null,
        filterAction: query.action ?? null,
        filterLimit: query.limit ? parseInt(query.limit) : 50,
        resultCount: logs.length,
      })
    );

    return sendSuccess(reply, { logs, count: logs.length });
  });

  /**
   * GET /api/control/feature-flags
   * List all feature flags (admin only)
   */
  fastify.get('/feature-flags', async (request, reply) => {
    const adminId = request.adminId ?? 'unknown';
    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });

    await writeAuditLog(prisma, createAdminAudit(adminId, 'control.feature_flags.read', 'feature_flag', { count: flags.length }));
    return sendSuccess(reply, { flags });
  });

  /**
   * PUT /api/control/feature-flags/:key
   * Upsert a feature flag (admin only)
   * Wave 5A: Stateful mutation using existing FeatureFlag model
   */
  fastify.put('/feature-flags/:key', { preHandler: requireAdminRole('SUPER_ADMIN') }, async (request, reply) => {
    try {
      // Early guard for adminId (guaranteed by middleware)
      if (!request.adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
      }
      const adminId = request.adminId;

      const { key } = request.params as { key: string };

      const bodySchema = z.object({
        enabled: z.boolean(),
        description: z.string().optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { enabled, description } = parseResult.data;

      // Get existing flag for audit trail
      const existingFlag = await prisma.featureFlag.findUnique({
        where: { key },
      });

      // Upsert the feature flag
      const flag = await prisma.featureFlag.upsert({
        where: { key },
        create: {
          key,
          enabled,
          description,
        },
        update: {
          enabled,
          ...(description !== undefined && { description }),
        },
      });

      // Write audit log
      await writeAuditLog(
        prisma,
        createAdminAudit(
          adminId,
          existingFlag ? 'control.feature_flag.updated' : 'control.feature_flag.created',
          'feature_flag',
          {
            key,
            enabled,
            description,
            beforeEnabled: existingFlag?.enabled,
            afterEnabled: flag.enabled,
          }
        )
      );

      return sendSuccess(reply, { flag });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Feature Flag Upsert] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Feature flag upsert failed', 500);
    }
  });

  /**
   * GET /api/control/events
   * Read immutable event logs (admin only)
   * Doctrine v1.4 Event Backbone read surface
   */
  fastify.get('/events', async (request, reply) => {
    const adminId = request.adminId ?? 'unknown';
    try {
      // Query parameter validation
      const querySchema = z.object({
        tenant_id: z.string().uuid('Invalid tenant_id format').optional(),
        event_name: z.string().max(100, 'event_name too long').optional(),
        from: z.string().datetime('Invalid from date format').optional(),
        to: z.string().datetime('Invalid to date format').optional(),
        limit: z
          .string()
          .transform(val => parseInt(val, 10))
          .refine(val => val > 0 && val <= 200, 'limit must be between 1 and 200')
          .optional(),
        cursor: z.string().uuid('Invalid cursor format').optional(),
      });

      // Validate query parameters
      const queryResult = querySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }

      const { tenant_id, event_name, from, to, limit = 50, cursor } = queryResult.data;

      // Build filter conditions
      const where: Prisma.EventLogWhereInput = {};

      if (tenant_id) {
        where.tenantId = tenant_id;
      }

      if (event_name) {
        where.name = event_name;
      }

      if (from || to) {
        where.occurredAt = {};
        if (from) {
          where.occurredAt.gte = new Date(from);
        }
        if (to) {
          where.occurredAt.lte = new Date(to);
        }
      }

      // Cursor-based pagination (id < cursor for descending order)
      if (cursor) {
        where.id = { lt: cursor };
      }

      // Execute query within admin context
      const events = await withAdminContext(async tx => {
        return await tx.eventLog.findMany({
          where,
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take: limit,
        });
      });

      // Compute next cursor (if more results exist)
      const nextCursor = events.length === limit ? events[events.length - 1].id : null;

      await writeAuditLog(prisma, createAdminAudit(adminId, 'control.events.read', 'event_log', {
        filterTenantId: tenant_id ?? null,
        filterEventName: event_name ?? null,
        from: from ?? null,
        to: to ?? null,
        limit,
        count: events.length,
      }));
      return sendSuccess(reply, {
        events,
        count: events.length,
        nextCursor,
      });
    } catch (error) {
      return sendError(
        reply,
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        500
      );
    }
  });

  /**
   * GET /api/control/finance/payouts
   * List finance payout authority intents (admin only)
   * Backed by EventLog - returns payout-related authority decisions
   */
  fastify.get('/finance/payouts', async (request, reply) => {
    const adminId = request.adminId ?? 'unknown';
    try {
      const payoutEvents: EventLog[] = await withAdminContext(async tx => {
        return await tx.eventLog.findMany({
          where: {
            name: {
              startsWith: 'finance.payout.',
            },
          },
          orderBy: { occurredAt: 'desc' },
          take: 100,
        });
      });

      // Map events to payout-like shape
      const payouts = payoutEvents.map(event => ({
        id: event.entityId,
        eventId: event.id,
        status: event.name.includes('approved') ? 'APPROVED' : 'REJECTED',
        decision: event.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
        decidedAt: event.occurredAt.toISOString(),
        decidedBy: event.actorId,
        reason: (event.payloadJson as any)?.reason || null,
        metadata: event.metadataJson,
      }));

      await writeAuditLog(prisma, createAdminAudit(adminId, 'control.finance.payouts.read', 'event_log', { count: payouts.length }));
      return sendSuccess(reply, { payouts });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Finance Payouts List] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch payouts', 500);
    }
  });

  /**
   * GET /api/control/compliance/requests
   * List compliance request authority intents (admin only)
   * Backed by EventLog - returns compliance-related authority decisions
   */
  fastify.get('/compliance/requests', async (request, reply) => {
    const adminId = request.adminId ?? 'unknown';
    try {
      const complianceEvents: EventLog[] = await withAdminContext(async tx => {
        return await tx.eventLog.findMany({
          where: {
            name: {
              startsWith: 'compliance.request.',
            },
          },
          orderBy: { occurredAt: 'desc' },
          take: 100,
        });
      });

      // Map events to compliance request shape
      const requests = complianceEvents.map(event => ({
        id: event.entityId,
        eventId: event.id,
        status: event.name.includes('approved') ? 'APPROVED' : 'REJECTED',
        decision: event.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
        decidedAt: event.occurredAt.toISOString(),
        decidedBy: event.actorId,
        reason: (event.payloadJson as any)?.reason || null,
        metadata: event.metadataJson,
      }));

      await writeAuditLog(prisma, createAdminAudit(adminId, 'control.compliance.requests.read', 'event_log', { count: requests.length }));
      return sendSuccess(reply, { requests });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Compliance Requests List] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch compliance requests', 500);
    }
  });

  /**
   * GET /api/control/disputes
   * List disputed trades with canonical trade provenance (admin only)
   * Backed by trade rows in DISPUTED lifecycle state; operator history is attached
   * only when a dispute authority intent exists for the same canonical trade id.
   */
  fastify.get('/disputes', async (request, reply) => {
    const adminId = request.adminId ?? 'unknown';
    try {
      const disputes = await withAdminContext(async tx => {
        const disputedTrades: Array<{
          id: string;
          tenantId: string;
          tradeReference: string;
          updatedAt: Date;
        }> = await tx.trade.findMany({
          where: {
            lifecycleState: {
              stateKey: 'DISPUTED',
            },
          },
          select: {
            id: true,
            tenantId: true,
            tradeReference: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        });

        if (disputedTrades.length === 0) {
          return [];
        }

        const tradeIds = disputedTrades.map((trade: { id: string }) => trade.id);
        const disputeEvents: EventLog[] = await tx.eventLog.findMany({
          where: {
            name: {
              startsWith: 'dispute.',
            },
            entityId: {
              in: tradeIds,
            },
          },
          orderBy: { occurredAt: 'desc' },
        });

        const latestEventByTradeId = new Map<string, EventLog>();
        for (const event of disputeEvents) {
          if (!latestEventByTradeId.has(event.entityId)) {
            latestEventByTradeId.set(event.entityId, event);
          }
        }

        return disputedTrades.map((trade: {
          id: string;
          tenantId: string;
          tradeReference: string;
          updatedAt: Date;
        }) => {
          const latestEvent = latestEventByTradeId.get(trade.id);

          return {
            entityType: 'TRADE' as const,
            entityId: trade.id,
            orgId: trade.tenantId,
            tradeReference: trade.tradeReference,
            eventId: latestEvent?.id ?? null,
            status: 'DISPUTED',
            decision: latestEvent?.name.split('.').pop()?.toUpperCase() ?? null,
            decidedAt: latestEvent?.occurredAt.toISOString() ?? null,
            decidedBy: latestEvent?.actorId ?? null,
            resolution: (latestEvent?.payloadJson as any)?.resolution ?? null,
            notes: (latestEvent?.payloadJson as any)?.notes ?? null,
            metadata: latestEvent?.metadataJson ?? null,
          };
        });
      });

      await writeAuditLog(prisma, createAdminAudit(adminId, 'control.disputes.read', 'trade', { count: disputes.length }));
      return sendSuccess(reply, { disputes });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Disputes List] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch disputes', 500);
    }
  });

  /**
   * GET /api/control/admin-access-registry
   * Bounded control-plane admin identity registry (SUPER_ADMIN only)
   *
   * TECS-FBW-ADMINRBAC-REGISTRY-READ-001
   * Returns only current internal control-plane identities + bounded role posture.
   * No invite/revoke/role-change mutation behavior is authorized here.
   */
  fastify.get(
    '/admin-access-registry',
    { preHandler: requireSuperAdminReadAccess },
    async (request, reply) => {
      const adminId = request.adminId ?? 'unknown';
      const adminRole = request.adminRole ?? 'unknown';

      try {
        const adminRows = await prisma.adminUser.findMany({
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [
            { role: 'asc' },
            { email: 'asc' },
          ],
        });

        const admins = adminRows.map(row => ({
          id: row.id,
          email: row.email,
          role: row.role,
          accessClass: row.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'PLATFORM_ADMIN',
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }));

        await writeAuditLog(
          prisma,
          createAdminAudit(adminId, 'control.admin_access_registry.read', 'admin_user', {
            viewerRole: adminRole,
            resultCount: admins.length,
          })
        );

        return sendSuccess(reply, { admins, count: admins.length });
      } catch (error: unknown) {
        fastify.log.error({ err: error }, '[Admin Access Registry] Error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch admin access registry', 500);
      }
    }
  );

  /**
   * DELETE /api/control/admin-access-registry/:id
   * Bounded revoke/remove for existing non-SUPER_ADMIN control-plane admins.
   *
   * TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001
   * Scope locks preserved:
   * - control-plane only
   * - SUPER_ADMIN actor only
   * - existing non-SUPER_ADMIN target only
   * - no self-revoke
   * - no peer-SUPER_ADMIN revoke/remove
   * - immediate refresh-token invalidation
   */
  fastify.delete('/admin-access-registry/:id', async (request, reply) => {
    if (!request.isAdmin || !request.adminId || !request.adminRole) {
      return sendUnauthorized(reply, 'Admin authentication required');
    }

    const actorId = request.adminId;
    const actorRole = request.adminRole;

    const paramsSchema = z.object({
      id: z.string().uuid('Invalid admin id format'),
    });

    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error.errors);
    }

    const { id: targetAdminId } = paramsResult.data;

    if (actorRole !== 'SUPER_ADMIN') {
      await writeAuditLog(
        prisma,
        createAdminAudit(actorId, 'control.admin_access_registry.revoke.denied', 'admin_user', {
          actorRole,
          targetAdminId,
          reason: 'ACTOR_NOT_SUPER_ADMIN',
        })
      );

      return sendForbidden(reply, 'Requires one of: SUPER_ADMIN');
    }

    if (targetAdminId === actorId) {
      await writeAuditLog(
        prisma,
        createAdminAudit(actorId, 'control.admin_access_registry.revoke.denied', 'admin_user', {
          actorRole,
          targetAdminId,
          reason: 'SELF_REVOKE_BLOCKED',
        })
      );

      return sendForbidden(reply, 'Self-revoke is not allowed');
    }

    try {
      const targetAdmin = await prisma.adminUser.findUnique({
        where: { id: targetAdminId },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (!targetAdmin) {
        await writeAuditLog(
          prisma,
          createAdminAudit(actorId, 'control.admin_access_registry.revoke.failed', 'admin_user', {
            actorRole,
            targetAdminId,
            reason: 'TARGET_NOT_FOUND',
          })
        );

        return sendNotFound(reply, 'Admin access target not found');
      }

      if (targetAdmin.role === 'SUPER_ADMIN') {
        await writeAuditLog(
          prisma,
          createAdminAudit(actorId, 'control.admin_access_registry.revoke.denied', 'admin_user', {
            actorRole,
            targetAdminId: targetAdmin.id,
            targetAdminRole: targetAdmin.role,
            reason: 'PEER_SUPER_ADMIN_PROTECTED',
          })
        );

        return sendForbidden(reply, 'Peer SUPER_ADMIN revoke/remove is not allowed');
      }

      const revokeResult = await prisma.$transaction(async tx => {
        const deletedRefreshTokens = await tx.refreshToken.deleteMany({
          where: { adminId: targetAdmin.id },
        });

        await tx.adminUser.delete({
          where: { id: targetAdmin.id },
        });

        return {
          refreshTokensInvalidated: deletedRefreshTokens.count,
        };
      });

      await writeAuditLog(
        prisma,
        createAdminAudit(actorId, 'control.admin_access_registry.revoke.succeeded', 'admin_user', {
          actorRole,
          targetAdminId: targetAdmin.id,
          targetAdminEmail: targetAdmin.email,
          targetAdminRole: targetAdmin.role,
          refreshTokensInvalidated: revokeResult.refreshTokensInvalidated,
        })
      );

      return sendSuccess(reply, {
        revokedAdminId: targetAdmin.id,
        refreshTokensInvalidated: revokeResult.refreshTokensInvalidated,
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error, actorId, targetAdminId }, '[Admin Access Registry Revoke] Error');

      await writeAuditLog(
        prisma,
        createAdminAudit(actorId, 'control.admin_access_registry.revoke.failed', 'admin_user', {
          actorRole,
          targetAdminId,
          reason: 'INTERNAL_ERROR',
        })
      );

      return sendError(reply, 'INTERNAL_ERROR', 'Failed to revoke admin access', 500);
    }
  });

  /**
   * GET /api/control/whoami
   * Superadmin capability proof surface (OPS-SUPERADMIN-CAPABILITY-001)
   *
   * Returns the calling admin's identity and capability context.
   * No DB access — purely derived from the verified JWT (adminAuthMiddleware).
   * contextMode indicates which DB helper would be used for this admin tier.
   */
  fastify.get('/whoami', async (request, reply) => {
    const adminId   = request.adminId   ?? 'unknown';
    const adminRole = request.adminRole ?? 'unknown';
    const isSuperAdmin = adminRole === 'SUPER_ADMIN';
    return sendSuccess(reply, {
      adminId,
      adminRole,
      isSuperAdmin,
      dbFlagsPreview: {
        contextMode: isSuperAdmin ? 'superadmin' : 'admin',
      },
    });
  });

  /**
   * GET /api/control/system/health
   * System health overview (admin only)
   * Returns computed health based on available telemetry (minimal implementation)
   */
  fastify.get('/system/health', async (_request, reply) => {
    try {
      // Compute minimal health from database connectivity
      const dbHealth = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 as result`;
      const isDbHealthy = dbHealth && dbHealth.length > 0;

      return sendSuccess(reply, {
        services: [
          {
            name: 'Database',
            status: isDbHealthy ? 'UP' : 'DOWN',
            lastCheck: new Date().toISOString(),
          },
          {
            name: 'API',
            status: 'UP',
            lastCheck: new Date().toISOString(),
          },
        ],
        overall: isDbHealthy ? 'HEALTHY' : 'DEGRADED',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[System Health] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch system health', 500);
    }
  });

  // NOTE (G-008): Tenant provisioning is now implemented as a canonical governed endpoint
  // via the tenantProvisionRoutes plugin: POST /api/control/tenants/provision
  // The legacy handler was removed (fix commit G-008) to prevent duplicate-route collisions
  // and to enforce Doctrine v1.4 (single atomic tx, org_id-only, tx-local context, admin assertion).
  // See: server/src/routes/admin/tenantProvision.ts + server/src/services/tenantProvision.service.ts

  /**
   * Wave 5B: Finance Authority Intents
   * POST /api/control/finance/payouts/:payout_id/approve
   * POST /api/control/finance/payouts/:payout_id/reject
   */
  fastify.post('/finance/payouts/:payout_id/approve', { preHandler: requireAdminRole('SUPER_ADMIN') }, async (request, reply) => {
    try {
      // Early guard for adminId (guaranteed by middleware)
      if (!request.adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
      }
      const adminId = request.adminId;

      const { payout_id } = request.params as { payout_id: string };
      const idempotencyKey = request.headers['idempotency-key'] as string;

      if (!idempotencyKey) {
        return sendValidationError(reply, [
          { message: 'Idempotency-Key header is required', path: ['headers', 'idempotency-key'] },
        ]);
      }

      const bodySchema = z.object({
        reason: z.string().optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { reason } = parseResult.data;

      const result = await withAdminContext(async _tx => {
        return await writeAuthorityIntent(prisma, {
          eventType: 'finance.payout.approved',
          targetType: 'payout',
          targetId: payout_id,
          adminId: adminId,
          payload: { reason },
          idempotencyKey,
        });
      });

      return reply.code(result.wasReplay ? 200 : 201).send({ success: true, data: result.event });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Finance Payout Approve] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Approval failed', 500);
    }
  });

  fastify.post('/finance/payouts/:payout_id/reject', { preHandler: requireAdminRole('SUPER_ADMIN') }, async (request, reply) => {
    try {
      // Early guard for adminId (guaranteed by middleware)
      if (!request.adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
      }
      const adminId = request.adminId;

      const { payout_id } = request.params as { payout_id: string };
      const idempotencyKey = request.headers['idempotency-key'] as string;

      if (!idempotencyKey) {
        return sendValidationError(reply, [
          { message: 'Idempotency-Key header is required', path: ['headers', 'idempotency-key'] },
        ]);
      }

      const bodySchema = z.object({
        reason: z.string().optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { reason } = parseResult.data;

      const result = await withAdminContext(async _tx => {
        return await writeAuthorityIntent(prisma, {
          eventType: 'finance.payout.rejected',
          targetType: 'payout',
          targetId: payout_id,
          adminId: adminId,
          payload: { reason },
          idempotencyKey,
        });
      });

      return reply.code(result.wasReplay ? 200 : 201).send({ success: true, data: result.event });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Finance Payout Reject] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Rejection failed', 500);
    }
  });

  /**
   * Wave 5B: Compliance Authority Intents
   * POST /api/control/compliance/requests/:request_id/approve
   * POST /api/control/compliance/requests/:request_id/reject
   */
  fastify.post('/compliance/requests/:request_id/approve', async (request, reply) => {
    try {
      // Early guard for adminId (guaranteed by middleware)
      if (!request.adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
      }
      const adminId = request.adminId;

      const { request_id } = request.params as { request_id: string };
      const idempotencyKey = request.headers['idempotency-key'] as string;

      if (!idempotencyKey) {
        return sendValidationError(reply, [
          { message: 'Idempotency-Key header is required', path: ['headers', 'idempotency-key'] },
        ]);
      }

      const bodySchema = z.object({
        reason: z.string().optional(),
        notes: z.string().optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { reason, notes } = parseResult.data;

      const result = await withAdminContext(async _tx => {
        return await writeAuthorityIntent(prisma, {
          eventType: 'compliance.request.approved',
          targetType: 'compliance_request',
          targetId: request_id,
          adminId: adminId,
          payload: { reason, notes },
          idempotencyKey,
        });
      });

      return reply.code(result.wasReplay ? 200 : 201).send({ success: true, data: result.event });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Compliance Request Approve] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Approval failed', 500);
    }
  });

  fastify.post('/compliance/requests/:request_id/reject', async (request, reply) => {
    try {
      // Early guard for adminId (guaranteed by middleware)
      if (!request.adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
      }
      const adminId = request.adminId;

      const { request_id } = request.params as { request_id: string };
      const idempotencyKey = request.headers['idempotency-key'] as string;

      if (!idempotencyKey) {
        return sendValidationError(reply, [
          { message: 'Idempotency-Key header is required', path: ['headers', 'idempotency-key'] },
        ]);
      }

      const bodySchema = z.object({
        reason: z.string().optional(),
        notes: z.string().optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { reason, notes } = parseResult.data;

      const result = await withAdminContext(async _tx => {
        return await writeAuthorityIntent(prisma, {
          eventType: 'compliance.request.rejected',
          targetType: 'compliance_request',
          targetId: request_id,
          adminId: adminId,
          payload: { reason, notes },
          idempotencyKey,
        });
      });

      return reply.code(result.wasReplay ? 200 : 201).send({ success: true, data: result.event });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Compliance Request Reject] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Rejection failed', 500);
    }
  });

  /**
   * Wave 5B: Dispute Authority Intents
   * POST /api/control/disputes/:dispute_id/resolve
   * POST /api/control/disputes/:dispute_id/escalate
   */
  fastify.post('/disputes/:dispute_id/resolve', async (request, reply) => {
    try {
      // Early guard for adminId (guaranteed by middleware)
      if (!request.adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
      }
      const adminId = request.adminId;

      const { dispute_id } = request.params as { dispute_id: string };
      const idempotencyKey = request.headers['idempotency-key'] as string;

      if (!idempotencyKey) {
        return sendValidationError(reply, [
          { message: 'Idempotency-Key header is required', path: ['headers', 'idempotency-key'] },
        ]);
      }

      const bodySchema = z.object({
        resolution: z.string().optional(),
        notes: z.string().optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { resolution, notes } = parseResult.data;

      const trade = await prisma.trade.findUnique({
        where: { id: dispute_id },
        select: {
          id: true,
          tenantId: true,
          lifecycleState: { select: { stateKey: true } },
        },
      });

      if (!trade) {
        return sendError(reply, 'TRADE_NOT_FOUND', `Trade ${dispute_id} not found`, 404);
      }

      if (trade.lifecycleState.stateKey !== 'DISPUTED') {
        return sendError(reply, 'TRADE_NOT_DISPUTED', `Trade ${dispute_id} is not in DISPUTED state`, 409);
      }

      const result = await withAdminContext(async _tx => {
        return await writeAuthorityIntent(prisma, {
          eventType: 'dispute.resolved',
          targetType: 'trade',
          targetId: trade.id,
          adminId: adminId,
          tenantId: trade.tenantId,
          payload: {
            entityType: 'TRADE',
            orgId: trade.tenantId,
            resolution,
            notes,
          },
          idempotencyKey,
        });
      });

      return reply.code(result.wasReplay ? 200 : 201).send({ success: true, data: result.event });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Dispute Resolve] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Resolution failed', 500);
    }
  });

  fastify.post('/disputes/:dispute_id/escalate', async (request, reply) => {
    try {
      // Early guard for adminId (guaranteed by middleware)
      if (!request.adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
      }
      const adminId = request.adminId;

      const { dispute_id } = request.params as { dispute_id: string };
      const idempotencyKey = request.headers['idempotency-key'] as string;

      if (!idempotencyKey) {
        return sendValidationError(reply, [
          { message: 'Idempotency-Key header is required', path: ['headers', 'idempotency-key'] },
        ]);
      }

      const bodySchema = z.object({
        resolution: z.string().optional(),
        notes: z.string().optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { resolution, notes } = parseResult.data;

      const trade = await prisma.trade.findUnique({
        where: { id: dispute_id },
        select: {
          id: true,
          tenantId: true,
          lifecycleState: { select: { stateKey: true } },
        },
      });

      if (!trade) {
        return sendError(reply, 'TRADE_NOT_FOUND', `Trade ${dispute_id} not found`, 404);
      }

      if (trade.lifecycleState.stateKey !== 'DISPUTED') {
        return sendError(reply, 'TRADE_NOT_DISPUTED', `Trade ${dispute_id} is not in DISPUTED state`, 409);
      }

      const result = await withAdminContext(async _tx => {
        return await writeAuthorityIntent(prisma, {
          eventType: 'dispute.escalated',
          targetType: 'trade',
          targetId: trade.id,
          adminId: adminId,
          tenantId: trade.tenantId,
          payload: {
            entityType: 'TRADE',
            orgId: trade.tenantId,
            resolution,
            notes,
          },
          idempotencyKey,
        });
      });

      return reply.code(result.wasReplay ? 200 : 201).send({ success: true, data: result.event });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Dispute Escalate] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Escalation failed', 500);
    }
  });

  // ─── G-022: Escalation governance routes ──────────────────────────────────
  // POST /api/control/escalations
  // POST /api/control/escalations/:id/upgrade
  // POST /api/control/escalations/:id/resolve
  // GET  /api/control/escalations
  await fastify.register(controlEscalationRoutes, { prefix: '/escalations' });

  // ─── G-017: Trade governance routes ──────────────────────────────────────────
  // GET  /api/control/trades
  // POST /api/control/trades/:id/transition
  await fastify.register(controlTradesRoutes, { prefix: '/trades' });

  // ─── G-018: Escrow governance routes ─────────────────────────────────────────
  // GET /api/control/escrows
  // GET /api/control/escrows/:escrowId
  await fastify.register(controlEscrowRoutes, { prefix: '/escrows' });

  // ─── G-019: Settlement governance routes ──────────────────────────────────────
  // POST /api/control/settlements/preview
  // POST /api/control/settlements
  await fastify.register(controlSettlementRoutes, { prefix: '/settlements' });

  // ─── G-019: Certification governance routes ────────────────────────────────────
  // GET /api/control/certifications
  // GET /api/control/certifications/:id
  await fastify.register(controlCertificationRoutes, { prefix: '/certifications' });
  // ─── G-016: Traceability Graph governance routes (Phase A) ───────────────────────
  // GET /api/control/traceability/nodes
  // GET /api/control/traceability/edges
  await fastify.register(adminTraceabilityRoutes, { prefix: '/traceability' });

  // ─── G-028 C1: Control-plane AI insights — Slice 1 ───────────────────────────
  // GET  /api/control/ai/health   — SUPER_ADMIN health probe
  // POST /api/control/ai/insights — SUPER_ADMIN platform-level AI insights
  await fastify.register(controlPlaneAiRoutes, { prefix: '/ai' });
};

export default controlRoutes;
