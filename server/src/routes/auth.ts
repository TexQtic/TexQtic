import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';
import { withDbContext } from '../db/withDbContext.js';
import { prisma } from '../db/prisma.js';

/**
 * Password verification using bcrypt
 */
async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return await bcrypt.compare(password, passwordHash);
}

/**
 * Authentication Routes
 *
 * Provides login endpoints for both admin and tenant realms.
 * Uses namespace-based JWT signing from @fastify/jwt.
 *
 * RLS ENFORCEMENT: All database queries are wrapped in withDbContext()
 * to ensure Postgres Row Level Security policies are enforced.
 */
const authRoutes: FastifyPluginAsync = async fastify => {
  /**
   * POST /api/auth/login
   * Unified login endpoint (auto-detects admin vs tenant)
   *
   * Request: { email: string, password: string, tenantId?: string }
   * Response: { success: true, data: { token: string, user: { id, email, role, tenantId } } }
   *
   * Logic:
   * - If tenantId provided → attempt tenant login
   * - If tenantId not provided → attempt admin login
   */
  fastify.post('/login', async (request, reply) => {
    // Validate request body
    const bodySchema = z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
      tenantId: z.string().uuid('Invalid tenant ID format').optional(),
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { email, password, tenantId } = parseResult.data;

    try {
      // If tenantId provided, attempt tenant login
      if (tenantId) {
        const result = await withDbContext({ tenantId }, async () => {
          // Look up user by email
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              passwordHash: true,
              memberships: {
                where: { tenantId },
                select: {
                  tenantId: true,
                  role: true,
                  tenant: {
                    select: {
                      status: true,
                    },
                  },
                },
              },
            },
          });

          if (!user) {
            return null;
          }

          // Verify password using bcrypt
          const isValidPassword = await verifyPassword(password, user.passwordHash);
          if (!isValidPassword) {
            return null;
          }

          // Check membership for this tenant
          const membership = user.memberships[0];
          if (!membership) {
            return { error: 'NO_MEMBERSHIP' as const };
          }

          // Check if tenant is active
          if (membership.tenant.status !== 'ACTIVE') {
            return { error: 'INACTIVE_TENANT' as const };
          }

          return {
            user: {
              id: user.id,
              email: user.email,
            },
            membership,
          };
        });

        if (!result) {
          return sendError(reply, 'AUTH_INVALID', 'Invalid credentials', 401);
        }

        if ('error' in result) {
          if (result.error === 'NO_MEMBERSHIP') {
            return sendError(reply, 'AUTH_FORBIDDEN', 'User is not a member of this tenant', 403);
          }
          if (result.error === 'INACTIVE_TENANT') {
            return sendError(reply, 'AUTH_FORBIDDEN', 'Tenant is inactive', 403);
          }
        }

        // Generate tenant JWT token
        const token = await reply.tenantJwtSign({
          userId: result.user.id,
          tenantId: result.membership.tenantId,
          role: result.membership.role,
        });

        return sendSuccess(reply, {
          token,
          user: {
            id: result.user.id,
            email: result.user.email,
            role: 'TENANT',
            tenantId: result.membership.tenantId,
          },
        });
      }

      // No tenantId provided → attempt admin login
      const result = await withDbContext({ isAdmin: true }, async () => {
        // Look up admin user
        const admin = await prisma.adminUser.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
          },
        });

        if (!admin) {
          return null;
        }

        // Verify password using bcrypt
        const isValidPassword = await verifyPassword(password, admin.passwordHash);
        if (!isValidPassword) {
          return null;
        }

        return admin;
      });

      if (!result) {
        return sendError(reply, 'AUTH_INVALID', 'Invalid credentials', 401);
      }

      // Generate admin JWT token using namespaced JWT method on reply
      const token = await reply.adminJwtSign({
        adminId: result.id,
        role: result.role,
      });

      return sendSuccess(reply, {
        token,
        user: {
          id: result.id,
          email: result.email,
          role: 'ADMIN',
          tenantId: null,
        },
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Unified Login] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Login failed', 500);
    }
  });

  /**
   * POST /api/auth/admin/login
   * Admin login endpoint
   *
   * Request: { email: string, password: string }
   * Response: { success: true, data: { token: string, admin: { id, email, role } } }
   *
   * AdminRole enum: SUPER_ADMIN | SUPPORT | ANALYST
   */
  fastify.post('/admin/login', async (request, reply) => {
    // Validate request body
    const bodySchema = z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { email, password } = parseResult.data;

    try {
      // Execute DB query within admin RLS context
      const result = await withDbContext({ isAdmin: true }, async () => {
        // Look up admin user
        const admin = await prisma.adminUser.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
          },
        });

        if (!admin) {
          return null;
        }

        // Verify password using bcrypt
        const isValidPassword = await verifyPassword(password, admin.passwordHash);
        if (!isValidPassword) {
          return null;
        }

        return admin;
      });

      if (!result) {
        return sendError(reply, 'AUTH_INVALID', 'Invalid credentials', 401);
      }

      // Generate admin JWT token using namespaced JWT method on reply
      const token = await reply.adminJwtSign({
        adminId: result.id,
        role: result.role,
      });

      return sendSuccess(reply, {
        token,
        admin: {
          id: result.id,
          email: result.email,
          role: result.role,
        },
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Admin Login] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Login failed', 500);
    }
  });

  /**
   * POST /api/auth/tenant/login
   * Tenant user login endpoint
   *
   * Request: { email: string, password: string, tenantId: string (uuid) }
   * Response: { success: true, data: { token: string, user: { id, email }, membership: { tenantId, role } } }
   *
   * MembershipRole enum: OWNER | ADMIN | MEMBER | VIEWER
   */
  fastify.post('/tenant/login', async (request, reply) => {
    // Validate request body
    const bodySchema = z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      tenantId: z.string().uuid('Invalid tenant ID format'),
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { email, password, tenantId } = parseResult.data;

    try {
      // Execute DB query within tenant RLS context
      const result = await withDbContext({ tenantId }, async () => {
        // Look up user by email
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            memberships: {
              where: { tenantId },
              select: {
                tenantId: true,
                role: true,
              },
            },
          },
        });

        if (!user) {
          return null;
        }

        // Verify password using bcrypt
        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          return null;
        }

        // Check membership for this tenant
        const membership = user.memberships[0];
        if (!membership) {
          return { error: 'NO_MEMBERSHIP' as const };
        }

        return {
          user: {
            id: user.id,
            email: user.email,
          },
          membership,
        };
      });

      if (!result) {
        return sendError(reply, 'AUTH_INVALID', 'Invalid credentials', 401);
      }

      if ('error' in result && result.error === 'NO_MEMBERSHIP') {
        return sendError(reply, 'AUTH_FORBIDDEN', 'User is not a member of this tenant', 403);
      }

      // Generate tenant JWT token
      const token = await request.tenantJwtSign({
        userId: result.user.id,
        tenantId: result.membership.tenantId,
        role: result.membership.role,
      });

      return sendSuccess(reply, {
        token,
        user: result.user,
        membership: result.membership,
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Tenant Login] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Login failed', 500);
    }
  });
};

export default authRoutes;
