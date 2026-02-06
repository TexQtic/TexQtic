import type { FastifyPluginAsync } from 'fastify';
import { tenantAuthMiddleware } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';
import { withDbContext } from '../db/withDbContext.js';
import { prisma } from '../db/prisma.js';

const tenantRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/me
   * Get current authenticated user (tenant realm)
   */
  fastify.get('/me', { onRequest: tenantAuthMiddleware }, async (request, reply) => {
    const { userId, tenantId, userRole } = request;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        status: true,
        plan: true,
      },
    });

    return sendSuccess(reply, {
      user,
      tenant,
      role: userRole,
    });
  });

  /**
   * GET /api/tenant/audit-logs
   * Get audit logs for current tenant only
   */
  fastify.get('/tenant/audit-logs', { onRequest: tenantAuthMiddleware }, async (request, reply) => {
    const { tenantId } = request;

    const logs = await withDbContext({ tenantId }, async () => {
      return await prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    return sendSuccess(reply, { logs, count: logs.length });
  });

  /**
   * GET /api/tenant/memberships
   * Get memberships for current tenant (tests RLS)
   */
  fastify.get(
    '/tenant/memberships',
    { onRequest: tenantAuthMiddleware },
    async (request, reply) => {
      const { tenantId } = request;

      const memberships = await withDbContext({ tenantId }, async () => {
        return await prisma.membership.findMany({
          where: { tenantId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                emailVerified: true,
              },
            },
          },
        });
      });

      return sendSuccess(reply, { memberships, count: memberships.length });
    }
  );
};

export default tenantRoutes;
