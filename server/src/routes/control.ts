import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { adminAuthMiddleware } from '../middleware/auth.js';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';
import { withDbContext } from '../db/withDbContext.js';
import { prisma } from '../db/prisma.js';

const controlRoutes: FastifyPluginAsync = async fastify => {
  // All control routes require admin auth
  fastify.addHook('onRequest', adminAuthMiddleware);

  /**
   * GET /api/control/tenants
   * List all tenants (admin only)
   */
  fastify.get('/tenants', async (request, reply) => {
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
  fastify.get('/feature-flags', async (request, reply) => {
    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });

    return sendSuccess(reply, { flags });
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
      const where: any = {};

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
};

export default controlRoutes;
