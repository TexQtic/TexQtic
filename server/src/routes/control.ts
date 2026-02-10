import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { adminAuthMiddleware } from '../middleware/auth.js';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';
import { withDbContext } from '../db/withDbContext.js';
import { prisma } from '../db/prisma.js';
import { writeAuditLog, createAdminAudit, writeAuthorityIntent } from '../lib/auditLog.js';

const controlRoutes: FastifyPluginAsync = async fastify => {
  // All control routes require admin auth
  fastify.addHook('onRequest', adminAuthMiddleware);

  /**
   * GET /api/control/tenants
   * List all tenants (admin only)
   */
  fastify.get('/tenants', async (_request, reply) => {
    const tenants = await withDbContext({ isAdmin: true }, async () => {
      return await prisma.tenant.findMany({
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

    return sendSuccess(reply, { tenants });
  });

  /**
   * GET /api/control/tenants/:id
   * Get tenant details (admin only)
   */
  fastify.get('/tenants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const tenant = await withDbContext({ isAdmin: true }, async () => {
      return await prisma.tenant.findUnique({
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

    return sendSuccess(reply, { tenant });
  });

  /**
   * GET /api/control/audit-logs
   * List all audit logs (admin only)
   */
  fastify.get('/audit-logs', async (request, reply) => {
    const query = request.query as {
      tenantId?: string;
      action?: string;
      limit?: string;
    };

    const logs = await withDbContext({ isAdmin: true }, async () => {
      return await prisma.auditLog.findMany({
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

    return sendSuccess(reply, { logs, count: logs.length });
  });

  /**
   * GET /api/control/feature-flags
   * List all feature flags (admin only)
   */
  fastify.get('/feature-flags', async (_request, reply) => {
    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });

    return sendSuccess(reply, { flags });
  });

  /**
   * PUT /api/control/feature-flags/:key
   * Upsert a feature flag (admin only)
   * Wave 5A: Stateful mutation using existing FeatureFlag model
   */
  fastify.put('/feature-flags/:key', async (request, reply) => {
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
      const events = await withDbContext({ isAdmin: true }, async () => {
        return await prisma.eventLog.findMany({
          where,
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take: limit,
        });
      });

      // Compute next cursor (if more results exist)
      const nextCursor = events.length === limit ? events[events.length - 1].id : null;

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
  fastify.get('/finance/payouts', async (_request, reply) => {
    try {
      const payoutEvents = await withDbContext({ isAdmin: true }, async () => {
        return await prisma.eventLog.findMany({
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
  fastify.get('/compliance/requests', async (_request, reply) => {
    try {
      const complianceEvents = await withDbContext({ isAdmin: true }, async () => {
        return await prisma.eventLog.findMany({
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

      return sendSuccess(reply, { requests });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Compliance Requests List] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch compliance requests', 500);
    }
  });

  /**
   * GET /api/control/disputes
   * List dispute authority intents (admin only)
   * Backed by EventLog - returns dispute-related authority decisions
   */
  fastify.get('/disputes', async (_request, reply) => {
    try {
      const disputeEvents = await withDbContext({ isAdmin: true }, async () => {
        return await prisma.eventLog.findMany({
          where: {
            name: {
              startsWith: 'dispute.',
            },
          },
          orderBy: { occurredAt: 'desc' },
          take: 100,
        });
      });

      // Map events to dispute shape
      const disputes = disputeEvents.map(event => ({
        id: event.entityId,
        eventId: event.id,
        status: event.name.includes('resolved') ? 'RESOLVED' : 'ESCALATED',
        decision: event.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
        decidedAt: event.occurredAt.toISOString(),
        decidedBy: event.actorId,
        resolution: (event.payloadJson as any)?.resolution || null,
        notes: (event.payloadJson as any)?.notes || null,
        metadata: event.metadataJson,
      }));

      return sendSuccess(reply, { disputes });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Disputes List] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch disputes', 500);
    }
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

  /**
   * POST /api/control/tenants/provision
   * Admin-initiated tenant provisioning
   * Creates a tenant with default branding and invited owner
   *
   * This is the ONLY way to create tenants - no public signup
   */
  fastify.post('/tenants/provision', async (request, reply) => {
    try {
      // Early guard for adminId (guaranteed by middleware)
      if (!request.adminId) {
        return sendError(reply, 'UNAUTHORIZED', 'Admin ID missing', 401);
      }
      const adminId = request.adminId;

      const bodySchema = z.object({
        name: z.string().min(1, 'Tenant name is required').max(255),
        slug: z
          .string()
          .min(1, 'Slug is required')
          .max(100)
          .regex(/^[a-z0-9-]+$/),
        type: z.enum(['B2B', 'B2C', 'INTERNAL']),
        ownerEmail: z.string().email('Invalid owner email'),
        ownerPassword: z.string().min(6, 'Password must be at least 6 characters'),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { name, slug, type, ownerEmail, ownerPassword } = parseResult.data;

      // Hash password
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(ownerPassword, 10);

      // Create tenant, user, membership, and default branding in a transaction
      const result = await withDbContext({ isAdmin: true }, async () => {
        return await prisma.$transaction(async tx => {
          // Create tenant
          const tenant = await tx.tenant.create({
            data: {
              name,
              slug,
              type,
              status: 'ACTIVE',
              plan: 'FREE',
            },
          });

          // Create default branding
          await tx.tenantBranding.create({
            data: {
              tenantId: tenant.id,
              logoUrl: null,
              themeJson: {
                primaryColor: '#4F46E5',
                secondaryColor: '#10B981',
              },
            },
          });

          // Create owner user
          const user = await tx.user.create({
            data: {
              email: ownerEmail,
              passwordHash,
              emailVerified: false,
            },
          });

          // Create owner membership
          const membership = await tx.membership.create({
            data: {
              userId: user.id,
              tenantId: tenant.id,
              role: 'OWNER',
            },
          });

          return { tenant, user, membership };
        });
      });

      // Write audit log
      await writeAuditLog(prisma, {
        tenantId: result.tenant.id,
        realm: 'ADMIN',
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'tenant.provisioned',
        entity: 'tenant',
        entityId: result.tenant.id,
        metadataJson: {
          tenantName: name,
          tenantSlug: slug,
          ownerEmail,
        },
      });

      return sendSuccess(reply, {
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          type: result.tenant.type,
          status: result.tenant.status,
        },
        owner: {
          id: result.user.id,
          email: result.user.email,
        },
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Tenant Provisioning] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Provisioning failed', 500);
    }
  });

  /**
   * Wave 5B: Finance Authority Intents
   * POST /api/control/finance/payouts/:payout_id/approve
   * POST /api/control/finance/payouts/:payout_id/reject
   */
  fastify.post('/finance/payouts/:payout_id/approve', async (request, reply) => {
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

      const result = await withDbContext({ isAdmin: true }, async () => {
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

  fastify.post('/finance/payouts/:payout_id/reject', async (request, reply) => {
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

      const result = await withDbContext({ isAdmin: true }, async () => {
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

      const result = await withDbContext({ isAdmin: true }, async () => {
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

      const result = await withDbContext({ isAdmin: true }, async () => {
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

      const result = await withDbContext({ isAdmin: true }, async () => {
        return await writeAuthorityIntent(prisma, {
          eventType: 'dispute.resolved',
          targetType: 'dispute',
          targetId: dispute_id,
          adminId: adminId,
          payload: { resolution, notes },
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

      const result = await withDbContext({ isAdmin: true }, async () => {
        return await writeAuthorityIntent(prisma, {
          eventType: 'dispute.escalated',
          targetType: 'dispute',
          targetId: dispute_id,
          adminId: adminId,
          payload: { resolution, notes },
          idempotencyKey,
        });
      });

      return reply.code(result.wasReplay ? 200 : 201).send({ success: true, data: result.event });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Dispute Escalate] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Escalation failed', 500);
    }
  });
};

export default controlRoutes;
