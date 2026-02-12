import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';
import { withDbContext } from '../db/withDbContext.js';
import { prisma } from '../db/prisma.js';
import {
  generateSecureToken,
  hashToken,
  verifyTokenHash,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  getPasswordResetExpiry,
} from '../lib/authTokens.js';
import { sendPasswordResetEmail, sendEmailVerificationEmail } from '../lib/emailStubs.js';
import { writeAuditLog, createAuthAudit } from '../lib/auditLog.js';

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

    // Extract client metadata for audit logging
    const clientIp = request.ip;
    const userAgent = request.headers['user-agent'];

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
          // Log failed tenant login
          await writeAuditLog(
            prisma,
            createAuthAudit({
              action: 'AUTH_LOGIN_FAILED',
              realm: 'TENANT',
              tenantId,
              actorId: null,
              email,
              reasonCode: 'INVALID_CREDENTIALS',
              ip: clientIp,
              userAgent,
            })
          );
          return sendError(reply, 'AUTH_INVALID', 'Invalid credentials', 401);
        }

        if ('error' in result) {
          if (result.error === 'NO_MEMBERSHIP') {
            // Log failed login - no membership
            await writeAuditLog(
              prisma,
              createAuthAudit({
                action: 'AUTH_LOGIN_FAILED',
                realm: 'TENANT',
                tenantId,
                actorId: null,
                email,
                reasonCode: 'NO_MEMBERSHIP',
                ip: clientIp,
                userAgent,
              })
            );
            return sendError(reply, 'AUTH_FORBIDDEN', 'User is not a member of this tenant', 403);
          }
          if (result.error === 'INACTIVE_TENANT') {
            // Log failed login - inactive tenant
            await writeAuditLog(
              prisma,
              createAuthAudit({
                action: 'AUTH_LOGIN_FAILED',
                realm: 'TENANT',
                tenantId,
                actorId: null,
                email,
                reasonCode: 'INACTIVE_TENANT',
                ip: clientIp,
                userAgent,
              })
            );
            return sendError(reply, 'AUTH_FORBIDDEN', 'Tenant is inactive', 403);
          }
        }

        // Generate tenant JWT token
        const token = await reply.tenantJwtSign({
          userId: result.user.id,
          tenantId: result.membership.tenantId,
          role: result.membership.role,
        });

        // Log successful tenant login
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_LOGIN_SUCCESS',
            realm: 'TENANT',
            tenantId: result.membership.tenantId,
            actorId: result.user.id,
            email: result.user.email,
            reasonCode: 'SUCCESS',
            ip: clientIp,
            userAgent,
          })
        );

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
        // Log failed admin login
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_LOGIN_FAILED',
            realm: 'ADMIN',
            tenantId: null,
            actorId: null,
            email,
            reasonCode: 'INVALID_CREDENTIALS',
            ip: clientIp,
            userAgent,
          })
        );
        return sendError(reply, 'AUTH_INVALID', 'Invalid credentials', 401);
      }

      // Generate admin JWT token using namespaced JWT method on reply
      const token = await reply.adminJwtSign({
        adminId: result.id,
        role: result.role,
      });

      // Log successful admin login
      await writeAuditLog(
        prisma,
        createAuthAudit({
          action: 'AUTH_LOGIN_SUCCESS',
          realm: 'ADMIN',
          tenantId: null,
          actorId: result.id,
          email: result.email,
          reasonCode: 'SUCCESS',
          ip: clientIp,
          userAgent,
        })
      );

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

    // Extract client metadata for audit logging
    const clientIp = request.ip;
    const userAgent = request.headers['user-agent'];

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
        // Log failed admin login
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_LOGIN_FAILED',
            realm: 'ADMIN',
            tenantId: null,
            actorId: null,
            email,
            reasonCode: 'INVALID_CREDENTIALS',
            ip: clientIp,
            userAgent,
          })
        );
        return sendError(reply, 'AUTH_INVALID', 'Invalid credentials', 401);
      }

      // Generate admin JWT token using namespaced JWT method on reply
      const token = await reply.adminJwtSign({
        adminId: result.id,
        role: result.role,
      });

      // Log successful admin login
      await writeAuditLog(
        prisma,
        createAuthAudit({
          action: 'AUTH_LOGIN_SUCCESS',
          realm: 'ADMIN',
          tenantId: null,
          actorId: result.id,
          email: result.email,
          reasonCode: 'SUCCESS',
          ip: clientIp,
          userAgent,
        })
      );

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

    // Extract client metadata for audit logging
    const clientIp = request.ip;
    const userAgent = request.headers['user-agent'];

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
        // Log failed tenant login
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_LOGIN_FAILED',
            realm: 'TENANT',
            tenantId,
            actorId: null,
            email,
            reasonCode: 'INVALID_CREDENTIALS',
            ip: clientIp,
            userAgent,
          })
        );
        return sendError(reply, 'AUTH_INVALID', 'Invalid credentials', 401);
      }

      if ('error' in result && result.error === 'NO_MEMBERSHIP') {
        // Log failed login - no membership
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_LOGIN_FAILED',
            realm: 'TENANT',
            tenantId,
            actorId: null,
            email,
            reasonCode: 'NO_MEMBERSHIP',
            ip: clientIp,
            userAgent,
          })
        );
        return sendError(reply, 'AUTH_FORBIDDEN', 'User is not a member of this tenant', 403);
      }

      // Generate tenant JWT token
      const token = await request.tenantJwtSign({
        userId: result.user.id,
        tenantId: result.membership.tenantId,
        role: result.membership.role,
      });

      // Log successful tenant login
      await writeAuditLog(
        prisma,
        createAuthAudit({
          action: 'AUTH_LOGIN_SUCCESS',
          realm: 'TENANT',
          tenantId: result.membership.tenantId,
          actorId: result.user.id,
          email: result.user.email,
          reasonCode: 'SUCCESS',
          ip: clientIp,
          userAgent,
        })
      );

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

  /**
   * POST /api/auth/forgot-password
   * Request password reset token
   *
   * Request: { email: string }
   * Response: { success: true, message: "If email exists, reset link sent" }
   *
   * Security: Always returns success to prevent user enumeration
   * Token: 30-minute expiry, single-use, hashed storage
   */
  fastify.post('/forgot-password', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email('Invalid email format'),
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { email } = parseResult.data;

    try {
      // Look up user (no RLS context needed for email lookup)
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });

      // If user exists, create reset token
      if (user) {
        const resetToken = generateSecureToken();
        const tokenHash = await hashToken(resetToken);
        const expiresAt = getPasswordResetExpiry();

        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
        });

        // Send reset email (stubbed - logs to console)
        await sendPasswordResetEmail(email, resetToken, fastify);

        // Write audit log (no tenant context for password reset)
        await writeAuditLog(prisma, {
          realm: 'TENANT',
          tenantId: null,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'auth.password.reset_requested',
          entity: 'user',
          entityId: user.id,
          metadataJson: { email },
        });
      }

      // Always return success (prevent user enumeration)
      return sendSuccess(reply, {
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Forgot Password] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to process request', 500);
    }
  });

  /**
   * POST /api/auth/reset-password
   * Reset password using token
   *
   * Request: { token: string, newPassword: string }
   * Response: { success: true, message: "Password reset successful" }
   *
   * Validates: token not expired, not used, matches hash
   * Enforces: password policy (min 6 chars via validation)
   * Security: marks token as used, single-use enforcement
   */
  fastify.post('/reset-password', async (request, reply) => {
    const bodySchema = z.object({
      token: z.string().min(1, 'Token is required'),
      newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { token, newPassword } = parseResult.data;

    try {
      // Find all non-expired, unused tokens
      const tokens = await prisma.passwordResetToken.findMany({
        where: {
          expiresAt: { gte: new Date() },
          usedAt: null,
        },
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      });

      // Find matching token by verifying hash
      let matchedToken: (typeof tokens)[0] | null = null;
      for (const t of tokens) {
        if (await verifyTokenHash(token, t.tokenHash)) {
          matchedToken = t;
          break;
        }
      }

      if (!matchedToken) {
        return sendError(reply, 'AUTH_INVALID', 'Invalid or expired reset token', 400);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password and mark token as used (in transaction)
      await prisma.$transaction(async tx => {
        await tx.user.update({
          where: { id: matchedToken.userId },
          data: { passwordHash },
        });

        await tx.passwordResetToken.update({
          where: { id: matchedToken.id },
          data: { usedAt: new Date() },
        });

        // Write audit log
        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: null,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'auth.password.reset_completed',
          entity: 'user',
          entityId: matchedToken.userId,
          metadataJson: { email: matchedToken.user.email },
        });
      });

      return sendSuccess(reply, {
        message: 'Password reset successful. You can now log in with your new password.',
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Reset Password] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to reset password', 500);
    }
  });

  /**
   * POST /api/auth/verify-email
   * Verify email address using JWT token
   *
   * Request: { token: string (JWT) }
   * Response: { success: true, message: "Email verified successfully" }
   *
   * Token: JWT-based (self-contained), 30-minute expiry
   * Updates: emailVerified flag and emailVerifiedAt timestamp
   */
  fastify.post('/verify-email', async (request, reply) => {
    const bodySchema = z.object({
      token: z.string().min(1, 'Token is required'),
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { token } = parseResult.data;

    try {
      // Verify JWT token
      const payload = await verifyEmailVerificationToken(fastify, token);
      if (!payload) {
        return sendError(reply, 'AUTH_INVALID', 'Invalid or expired verification token', 400);
      }

      // Check if user exists and not already verified
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, emailVerified: true },
      });

      if (!user) {
        return sendError(reply, 'AUTH_INVALID', 'User not found', 404);
      }

      if (user.emailVerified) {
        return sendSuccess(reply, {
          message: 'Email already verified.',
        });
      }

      // Update user email verification status
      await prisma.$transaction(async tx => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });

        // Write audit log
        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: null,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'auth.email.verified',
          entity: 'user',
          entityId: user.id,
          metadataJson: { email: user.email },
        });
      });

      return sendSuccess(reply, {
        message: 'Email verified successfully. You can now access all features.',
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Verify Email] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to verify email', 500);
    }
  });

  /**
   * POST /api/auth/resend-verification
   * Resend email verification token
   *
   * Request: { email: string }
   * Response: { success: true, message: "Verification email sent" }
   *
   * Rate limiting: Should be implemented at API gateway level (not in this handler)
   * Security: Always returns success to prevent user enumeration
   */
  fastify.post('/resend-verification', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email('Invalid email format'),
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { email } = parseResult.data;

    try {
      // Look up user
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, emailVerified: true },
      });

      // If user exists and not verified, send verification email
      if (user && !user.emailVerified) {
        const verificationToken = await generateEmailVerificationToken(
          fastify,
          user.id,
          user.email
        );
        await sendEmailVerificationEmail(email, verificationToken, fastify);

        // Write audit log
        await writeAuditLog(prisma, {
          realm: 'TENANT',
          tenantId: null,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'auth.email.verification_resent',
          entity: 'user',
          entityId: user.id,
          metadataJson: { email },
        });
      }

      // Always return success (prevent user enumeration)
      return sendSuccess(reply, {
        message: 'If an unverified account exists, a verification email has been sent.',
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Resend Verification] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to process request', 500);
    }
  });
};

export default authRoutes;
