import type { FastifyPluginAsync } from 'fastify';
import { adminAuthMiddleware } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';
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
};

export default controlRoutes;
