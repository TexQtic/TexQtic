import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendRateLimitExceeded,
} from '../utils/response.js';
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
import {
  hashRateLimitKey,
  recordAttempt,
  getAttemptCount,
  calculateRetryAfter,
} from '../utils/rateLimit/index.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  createRefreshSession,
} from '../utils/auth/index.js';
import { config } from '../config/index.js';

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
        // ENFORCEMENT MODE: Check rate limit BEFORE recording attempt
        const emailNormalized = email.toLowerCase();
        const ipKey = hashRateLimitKey(`ip:${clientIp}`);
        const emailKey = hashRateLimitKey(`email:${emailNormalized}`);

        // Check current attempt counts for both dimensions
        const ipCount = await getAttemptCount({
          key: ipKey,
          windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
        });
        const emailCount = await getAttemptCount({
          key: emailKey,
          windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
        });

        const isIpLimited = ipCount >= config.RATE_LIMIT_TENANT_LOGIN_MAX;
        const isEmailLimited = emailCount >= config.RATE_LIMIT_TENANT_LOGIN_MAX;

        if (isIpLimited || isEmailLimited) {
          // Determine which dimension(s) triggered
          const trigger: 'ip' | 'email' | 'both' =
            isIpLimited && isEmailLimited ? 'both' : isIpLimited ? 'ip' : 'email';

          // ENFORCEMENT: Log rate limit enforcement event
          await writeAuditLog(
            prisma,
            createAuthAudit({
              action: 'AUTH_RATE_LIMIT_ENFORCED',
              realm: 'TENANT',
              tenantId,
              actorId: null,
              email,
              reasonCode: 'RATE_LIMIT_THRESHOLD',
              ip: clientIp,
              userAgent,
              rateLimitTrigger: trigger,
            })
          );
          console.warn(
            `[Rate Limiter ENFORCED] Tenant login blocked - trigger: ${trigger}, ip: ${clientIp.substring(0, 8)}..., email: ${emailNormalized.substring(0, 8)}...`
          );

          // BLOCK: Return 429 with Retry-After header
          const retryAfter = calculateRetryAfter(config.RATE_LIMIT_WINDOW_MINUTES);
          return sendRateLimitExceeded(reply, retryAfter, 'Too many login attempts');
        }

        // Under threshold: record attempts for both dimensions
        await recordAttempt({
          key: ipKey,
          endpoint: '/api/auth/login',
          realm: 'TENANT',
          windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
        });
        await recordAttempt({
          key: emailKey,
          endpoint: '/api/auth/login',
          realm: 'TENANT',
          windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
        });

        const result = await withDbContext({ tenantId }, async () => {
          // Look up user by email
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              passwordHash: true,
              emailVerified: true,
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

          // Check email verification (COMMIT 9: enforcement)
          if (!user.emailVerified) {
            return { error: 'NOT_VERIFIED' as const };
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
          if (result.error === 'NOT_VERIFIED') {
            // Log failed login - email not verified
            await writeAuditLog(
              prisma,
              createAuthAudit({
                action: 'AUTH_LOGIN_FAILED',
                realm: 'TENANT',
                tenantId,
                actorId: null,
                email,
                reasonCode: 'NOT_VERIFIED',
                ip: clientIp,
                userAgent,
              })
            );
            return sendError(reply, 'AUTH_UNVERIFIED', 'Email verification required', 401);
          }
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

        // Issue refresh token (HttpOnly cookie) - fail-open
        try {
          const refreshToken = generateRefreshToken();
          const refreshTokenHash = hashRefreshToken(refreshToken);
          const refreshExpiresAt = new Date(
            Date.now() + config.REFRESH_TOKEN_TTL_DAYS_TENANT * 24 * 60 * 60 * 1000
          );

          await prisma.refreshToken.create({
            data: createRefreshSession({
              userId: result.user.id,
              tokenHash: refreshTokenHash,
              expiresAt: refreshExpiresAt,
              ip: clientIp,
              userAgent,
            }),
          });

          // Set refresh token cookie (HttpOnly, Secure in prod)
          reply.setCookie('texqtic_rt_tenant', refreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: config.REFRESH_TOKEN_TTL_DAYS_TENANT * 24 * 60 * 60,
          });

          // Log refresh token issuance (non-blocking)
          try {
            await writeAuditLog(
              prisma,
              createAuthAudit({
                action: 'AUTH_REFRESH_ISSUED',
                realm: 'TENANT',
                tenantId: result.membership.tenantId,
                actorId: result.user.id,
                email: result.user.email,
                reasonCode: 'SUCCESS',
                ip: clientIp,
                userAgent,
              })
            );
          } catch (auditError) {
            // Non-blocking: log error but continue
            fastify.log.error({ err: auditError }, '[Refresh Token] Audit logging failed');
          }
        } catch (error) {
          // Fail-open: log error but don't block login
          fastify.log.error({ err: error }, '[Refresh Token] Issuance failed - login continues');
        }

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
      // ENFORCEMENT MODE: Check rate limit BEFORE recording attempt
      const emailNormalized = email.toLowerCase();
      const ipKey = hashRateLimitKey(`ip:${clientIp}`);
      const emailKey = hashRateLimitKey(`email:${emailNormalized}`);

      // Check current attempt counts for both dimensions
      const ipCount = await getAttemptCount({
        key: ipKey,
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });
      const emailCount = await getAttemptCount({
        key: emailKey,
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });

      const isIpLimited = ipCount >= config.RATE_LIMIT_ADMIN_LOGIN_MAX;
      const isEmailLimited = emailCount >= config.RATE_LIMIT_ADMIN_LOGIN_MAX;

      if (isIpLimited || isEmailLimited) {
        // Determine which dimension(s) triggered
        const trigger: 'ip' | 'email' | 'both' =
          isIpLimited && isEmailLimited ? 'both' : isIpLimited ? 'ip' : 'email';

        // ENFORCEMENT: Log rate limit enforcement event
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_RATE_LIMIT_ENFORCED',
            realm: 'ADMIN',
            tenantId: null,
            actorId: null,
            email,
            reasonCode: 'RATE_LIMIT_THRESHOLD',
            ip: clientIp,
            userAgent,
            rateLimitTrigger: trigger,
          })
        );
        console.warn(
          `[Rate Limiter ENFORCED] Admin login blocked - trigger: ${trigger}, ip: ${clientIp.substring(0, 8)}..., email: ${emailNormalized.substring(0, 8)}...`
        );

        // BLOCK: Return 429 with Retry-After header
        const retryAfter = calculateRetryAfter(config.RATE_LIMIT_WINDOW_MINUTES);
        return sendRateLimitExceeded(reply, retryAfter, 'Too many login attempts');
      }

      // Under threshold: record attempts for both dimensions
      await recordAttempt({
        key: ipKey,
        endpoint: '/api/auth/login',
        realm: 'ADMIN',
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });
      await recordAttempt({
        key: emailKey,
        endpoint: '/api/auth/login',
        realm: 'ADMIN',
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });

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

      // Issue refresh token (HttpOnly cookie)
      const refreshToken = generateRefreshToken();
      const refreshTokenHash = hashRefreshToken(refreshToken);
      const refreshExpiresAt = new Date(
        Date.now() + config.REFRESH_TOKEN_TTL_DAYS_ADMIN * 24 * 60 * 60 * 1000
      );

      await prisma.refreshToken.create({
        data: createRefreshSession({
          adminId: result.id,
          tokenHash: refreshTokenHash,
          expiresAt: refreshExpiresAt,
          ip: clientIp,
          userAgent,
        }),
      });

      // Set refresh token cookie (HttpOnly, Secure in prod)
      reply.setCookie('texqtic_rt_admin', refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: config.REFRESH_TOKEN_TTL_DAYS_ADMIN * 24 * 60 * 60,
      });

      // Log refresh token issuance (non-blocking)
      try {
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_REFRESH_ISSUED',
            realm: 'ADMIN',
            tenantId: null,
            actorId: result.id,
            email: result.email,
            reasonCode: 'SUCCESS',
            ip: clientIp,
            userAgent,
          })
        );
      } catch (error) {
        // Non-blocking: log error but continue
        fastify.log.error({ err: error }, '[Refresh Token] Audit logging failed');
      }

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
      // ENFORCEMENT MODE: Check rate limit BEFORE recording attempt
      const emailNormalized = email.toLowerCase();
      const ipKey = hashRateLimitKey(`ip:${clientIp}`);
      const emailKey = hashRateLimitKey(`email:${emailNormalized}`);

      // Check current attempt counts for both dimensions
      const ipCount = await getAttemptCount({
        key: ipKey,
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });
      const emailCount = await getAttemptCount({
        key: emailKey,
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });

      const isIpLimited = ipCount >= config.RATE_LIMIT_ADMIN_LOGIN_MAX;
      const isEmailLimited = emailCount >= config.RATE_LIMIT_ADMIN_LOGIN_MAX;

      if (isIpLimited || isEmailLimited) {
        // Determine which dimension(s) triggered
        const trigger: 'ip' | 'email' | 'both' =
          isIpLimited && isEmailLimited ? 'both' : isIpLimited ? 'ip' : 'email';

        // ENFORCEMENT: Log rate limit enforcement event
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_RATE_LIMIT_ENFORCED',
            realm: 'ADMIN',
            tenantId: null,
            actorId: null,
            email,
            reasonCode: 'RATE_LIMIT_THRESHOLD',
            ip: clientIp,
            userAgent,
            rateLimitTrigger: trigger,
          })
        );
        console.warn(
          `[Rate Limiter ENFORCED] Admin login blocked - trigger: ${trigger}, ip: ${clientIp.substring(0, 8)}..., email: ${emailNormalized.substring(0, 8)}...`
        );

        // BLOCK: Return 429 with Retry-After header
        const retryAfter = calculateRetryAfter(config.RATE_LIMIT_WINDOW_MINUTES);
        return sendRateLimitExceeded(reply, retryAfter, 'Too many login attempts');
      }

      // Under threshold: record attempts for both dimensions
      await recordAttempt({
        key: ipKey,
        endpoint: '/api/auth/admin/login',
        realm: 'ADMIN',
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });
      await recordAttempt({
        key: emailKey,
        endpoint: '/api/auth/admin/login',
        realm: 'ADMIN',
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });

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

      // Issue refresh token (HttpOnly cookie) - fail-open
      try {
        const refreshToken = generateRefreshToken();
        const refreshTokenHash = hashRefreshToken(refreshToken);
        const refreshExpiresAt = new Date(
          Date.now() + config.REFRESH_TOKEN_TTL_DAYS_ADMIN * 24 * 60 * 60 * 1000
        );

        await prisma.refreshToken.create({
          data: createRefreshSession({
            adminId: result.id,
            tokenHash: refreshTokenHash,
            expiresAt: refreshExpiresAt,
            ip: clientIp,
            userAgent,
          }),
        });

        // Set refresh token cookie (HttpOnly, Secure in prod)
        reply.setCookie('texqtic_rt_admin', refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: config.REFRESH_TOKEN_TTL_DAYS_ADMIN * 24 * 60 * 60,
        });

        // Log refresh token issuance (non-blocking)
        try {
          await writeAuditLog(
            prisma,
            createAuthAudit({
              action: 'AUTH_REFRESH_ISSUED',
              realm: 'ADMIN',
              tenantId: null,
              actorId: result.id,
              email: result.email,
              reasonCode: 'SUCCESS',
              ip: clientIp,
              userAgent,
            })
          );
        } catch (auditError) {
          // Non-blocking: log error but continue
          fastify.log.error({ err: auditError }, '[Refresh Token] Audit logging failed');
        }
      } catch (error) {
        // Fail-open: log error but don't block login
        fastify.log.error({ err: error }, '[Refresh Token] Issuance failed - login continues');
      }

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
      // ENFORCEMENT MODE: Check rate limit BEFORE recording attempt
      const emailNormalized = email.toLowerCase();
      const ipKey = hashRateLimitKey(`ip:${clientIp}`);
      const emailKey = hashRateLimitKey(`email:${emailNormalized}`);

      // Check current attempt counts for both dimensions
      const ipCount = await getAttemptCount({
        key: ipKey,
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });
      const emailCount = await getAttemptCount({
        key: emailKey,
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });

      const isIpLimited = ipCount >= config.RATE_LIMIT_TENANT_LOGIN_MAX;
      const isEmailLimited = emailCount >= config.RATE_LIMIT_TENANT_LOGIN_MAX;

      if (isIpLimited || isEmailLimited) {
        // Determine which dimension(s) triggered
        const trigger: 'ip' | 'email' | 'both' =
          isIpLimited && isEmailLimited ? 'both' : isIpLimited ? 'ip' : 'email';

        // ENFORCEMENT: Log rate limit enforcement event
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_RATE_LIMIT_ENFORCED',
            realm: 'TENANT',
            tenantId,
            actorId: null,
            email,
            reasonCode: 'RATE_LIMIT_THRESHOLD',
            ip: clientIp,
            userAgent,
            rateLimitTrigger: trigger,
          })
        );
        console.warn(
          `[Rate Limiter ENFORCED] Tenant login blocked - trigger: ${trigger}, ip: ${clientIp.substring(0, 8)}..., email: ${emailNormalized.substring(0, 8)}...`
        );

        // BLOCK: Return 429 with Retry-After header
        const retryAfter = calculateRetryAfter(config.RATE_LIMIT_WINDOW_MINUTES);
        return sendRateLimitExceeded(reply, retryAfter, 'Too many login attempts');
      }

      // Under threshold: record attempts for both dimensions
      await recordAttempt({
        key: ipKey,
        endpoint: '/api/auth/tenant/login',
        realm: 'TENANT',
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });
      await recordAttempt({
        key: emailKey,
        endpoint: '/api/auth/tenant/login',
        realm: 'TENANT',
        windowMinutes: config.RATE_LIMIT_WINDOW_MINUTES,
      });

      // Execute DB query within tenant RLS context
      const result = await withDbContext({ tenantId }, async () => {
        // Look up user by email
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            emailVerified: true,
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

        // Check email verification (COMMIT 9: enforcement)
        if (!user.emailVerified) {
          return { error: 'NOT_VERIFIED' as const };
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

      if ('error' in result) {
        if (result.error === 'NOT_VERIFIED') {
          // Log failed login - email not verified
          await writeAuditLog(
            prisma,
            createAuthAudit({
              action: 'AUTH_LOGIN_FAILED',
              realm: 'TENANT',
              tenantId,
              actorId: null,
              email,
              reasonCode: 'NOT_VERIFIED',
              ip: clientIp,
              userAgent,
            })
          );
          return sendError(reply, 'AUTH_UNVERIFIED', 'Email verification required', 401);
        }
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

      // Issue refresh token (HttpOnly cookie) - fail-open
      try {
        const refreshToken = generateRefreshToken();
        const refreshTokenHash = hashRefreshToken(refreshToken);
        const refreshExpiresAt = new Date(
          Date.now() + config.REFRESH_TOKEN_TTL_DAYS_TENANT * 24 * 60 * 60 * 1000
        );

        await prisma.refreshToken.create({
          data: createRefreshSession({
            userId: result.user.id,
            tokenHash: refreshTokenHash,
            expiresAt: refreshExpiresAt,
            ip: clientIp,
            userAgent,
          }),
        });

        // Set refresh token cookie (HttpOnly, Secure in prod)
        reply.setCookie('texqtic_rt_tenant', refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: config.REFRESH_TOKEN_TTL_DAYS_TENANT * 24 * 60 * 60,
        });

        // Log refresh token issuance (non-blocking)
        try {
          await writeAuditLog(
            prisma,
            createAuthAudit({
              action: 'AUTH_REFRESH_ISSUED',
              realm: 'TENANT',
              tenantId: result.membership.tenantId,
              actorId: result.user.id,
              email: result.user.email,
              reasonCode: 'SUCCESS',
              ip: clientIp,
              userAgent,
            })
          );
        } catch (auditError) {
          // Non-blocking: log error but continue
          fastify.log.error({ err: auditError }, '[Refresh Token] Audit logging failed');
        }
      } catch (error) {
        // Fail-open: log error but don't block login
        fastify.log.error({ err: error }, '[Refresh Token] Issuance failed - login continues');
      }

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

  /**
   * POST /api/auth/refresh
   * Refresh access token using HttpOnly refresh token cookie
   *
   * Request: No body (uses cookie: texqtic_rt_tenant OR texqtic_rt_admin)
   * Response: { success: true, data: { token: string } }
   *
   * Security: Strict single-use rotation with family tracking
   * - Consumes refresh token (marks as rotated)
   * - Issues new refresh token (same family)
   * - Detects replay (reuse of rotated token) → revokes entire family
   * - Fail-closed: any invalid state returns 401
   *
   * Realm separation:
   * - texqtic_rt_tenant → tenant realm refresh
   * - texqtic_rt_admin → admin realm refresh
   * - Cannot fall back between realms
   */
  fastify.post('/refresh', async (request, reply) => {
    const clientIp = (request.headers['x-forwarded-for'] as string) || request.ip;
    const userAgent = request.headers['user-agent'] || 'unknown';

    try {
      // 1) Determine realm from cookie (strict, no fallback)
      const tenantRefreshCookie = request.cookies.texqtic_rt_tenant;
      const adminRefreshCookie = request.cookies.texqtic_rt_admin;

      let realm: 'TENANT' | 'ADMIN';
      let rawRefreshToken: string;

      if (tenantRefreshCookie) {
        realm = 'TENANT';
        rawRefreshToken = tenantRefreshCookie;
      } else if (adminRefreshCookie) {
        realm = 'ADMIN';
        rawRefreshToken = adminRefreshCookie;
      } else {
        // No refresh cookie present
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_REFRESH_FAILED',
            realm: 'TENANT',
            tenantId: null,
            actorId: null,
            email: null,
            reasonCode: 'INVALID_TOKEN',
            ip: clientIp,
            userAgent,
          })
        );
        return sendError(reply, 'AUTH_INVALID', 'No refresh token provided', 401);
      }

      // 2) Hash token and lookup in DB
      const tokenHash = hashRefreshToken(rawRefreshToken);
      const refreshTokenRow = await prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!refreshTokenRow) {
        // Token not found
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_REFRESH_FAILED',
            realm,
            tenantId: null,
            actorId: null,
            email: null,
            reasonCode: 'INVALID_TOKEN',
            ip: clientIp,
            userAgent,
          })
        );
        return sendError(reply, 'AUTH_INVALID', 'Invalid refresh token', 401);
      }

      // Check if revoked
      if (refreshTokenRow.revokedAt !== null) {
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_REFRESH_FAILED',
            realm,
            tenantId: refreshTokenRow.userId ? null : null, // tenantId not stored in RefreshToken
            actorId: refreshTokenRow.userId || refreshTokenRow.adminId,
            email: null,
            reasonCode: 'REVOKED',
            ip: clientIp,
            userAgent,
          })
        );
        return sendError(reply, 'AUTH_INVALID', 'Refresh token revoked', 401);
      }

      // Check if expired
      if (refreshTokenRow.expiresAt < new Date()) {
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_REFRESH_FAILED',
            realm,
            tenantId: null,
            actorId: refreshTokenRow.userId || refreshTokenRow.adminId,
            email: null,
            reasonCode: 'EXPIRED',
            ip: clientIp,
            userAgent,
          })
        );
        return sendError(reply, 'AUTH_INVALID', 'Refresh token expired', 401);
      }

      // 3) Replay detection: if token already rotated, revoke family
      if (refreshTokenRow.rotatedAt !== null) {
        // Replay attempt detected - revoke entire family
        await prisma.refreshToken.updateMany({
          where: {
            familyId: refreshTokenRow.familyId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        // Clear the refresh cookie
        const cookieName = realm === 'TENANT' ? 'texqtic_rt_tenant' : 'texqtic_rt_admin';
        reply.setCookie(cookieName, '', {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        });

        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_REFRESH_REPLAY_DETECTED',
            realm,
            tenantId: null,
            actorId: refreshTokenRow.userId || refreshTokenRow.adminId,
            email: null,
            reasonCode: 'ROTATED_REPLAY',
            ip: clientIp,
            userAgent,
          })
        );

        return sendError(reply, 'AUTH_INVALID', 'Token replay detected - family revoked', 401);
      }

      // 4) Realm integrity check
      if (realm === 'TENANT' && (!refreshTokenRow.userId || refreshTokenRow.adminId !== null)) {
        // Tenant cookie but token belongs to admin or has no userId
        await prisma.refreshToken.updateMany({
          where: {
            familyId: refreshTokenRow.familyId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_REFRESH_FAILED',
            realm,
            tenantId: null,
            actorId: refreshTokenRow.userId || refreshTokenRow.adminId,
            email: null,
            reasonCode: 'REALM_MISMATCH',
            ip: clientIp,
            userAgent,
          })
        );

        return sendError(reply, 'AUTH_INVALID', 'Realm mismatch', 401);
      }

      if (realm === 'ADMIN' && (!refreshTokenRow.adminId || refreshTokenRow.userId !== null)) {
        // Admin cookie but token belongs to tenant user or has no adminId
        await prisma.refreshToken.updateMany({
          where: {
            familyId: refreshTokenRow.familyId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_REFRESH_FAILED',
            realm,
            tenantId: null,
            actorId: refreshTokenRow.userId || refreshTokenRow.adminId,
            email: null,
            reasonCode: 'REALM_MISMATCH',
            ip: clientIp,
            userAgent,
          })
        );

        return sendError(reply, 'AUTH_INVALID', 'Realm mismatch', 401);
      }

      // 5) Issue new token pair (atomic rotation with concurrency protection)
      const newPlaintextRefreshToken = generateRefreshToken();
      const newRefreshTokenHash = hashRefreshToken(newPlaintextRefreshToken);

      const ttlDays =
        realm === 'TENANT'
          ? config.REFRESH_TOKEN_TTL_DAYS_TENANT
          : config.REFRESH_TOKEN_TTL_DAYS_ADMIN;
      const newExpiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

      const now = new Date();

      // Try atomic rotation claim
      let claimSucceeded = false;

      await prisma.$transaction(async tx => {
        // Atomic rotation claim: only succeed if token is still fresh (not rotated/revoked/expired)
        // This prevents concurrent refresh attempts from both succeeding
        const claim = await tx.refreshToken.updateMany({
          where: {
            id: refreshTokenRow.id,
            rotatedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: {
            rotatedAt: now,
            lastUsedAt: now,
          },
        });

        // If claim failed (count !== 1), exit transaction cleanly (don't create new token)
        if (claim.count !== 1) {
          return; // Exit transaction without changes
        }

        // Claim succeeded - create new refresh token in same family
        await tx.refreshToken.create({
          data: {
            id: randomUUID(),
            userId: refreshTokenRow.userId,
            adminId: refreshTokenRow.adminId,
            tokenHash: newRefreshTokenHash,
            familyId: refreshTokenRow.familyId,
            expiresAt: newExpiresAt,
            ip: clientIp,
            userAgent,
          },
        });

        claimSucceeded = true;
      });

      // If claim failed, handle as concurrent/replay attempt (OUTSIDE transaction)
      if (!claimSucceeded) {
        // Revoke entire family
        await prisma.refreshToken.updateMany({
          where: {
            familyId: refreshTokenRow.familyId,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

        // Clear the refresh cookie
        const cookieName = realm === 'TENANT' ? 'texqtic_rt_tenant' : 'texqtic_rt_admin';
        reply.setCookie(cookieName, '', {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        });

        // Audit the concurrent/replay attempt
        await writeAuditLog(
          prisma,
          createAuthAudit({
            action: 'AUTH_REFRESH_REPLAY_DETECTED',
            realm,
            tenantId: null,
            actorId: refreshTokenRow.userId || refreshTokenRow.adminId,
            email: null,
            reasonCode: 'ROTATED_REPLAY',
            ip: clientIp,
            userAgent,
          })
        );

        return sendError(reply, 'AUTH_INVALID', 'Token replay detected - family revoked', 401);
      }

      // 6) Issue new access JWT
      let accessToken: string;
      let email: string | null = null;
      let tenantId: string | null = null;

      if (realm === 'TENANT') {
        // Resolve tenant user + membership
        if (!refreshTokenRow.userId) {
          // Should never happen due to realm check, but satisfy TypeScript
          return sendError(reply, 'AUTH_INVALID', 'Invalid token state', 401);
        }

        const user = await prisma.user.findUnique({
          where: { id: refreshTokenRow.userId },
          select: {
            id: true,
            email: true,
            memberships: {
              select: {
                tenantId: true,
                role: true,
              },
            },
          },
        });

        if (!user || user.memberships.length === 0) {
          // User or membership no longer exists
          await writeAuditLog(
            prisma,
            createAuthAudit({
              action: 'AUTH_REFRESH_FAILED',
              realm,
              tenantId: null,
              actorId: refreshTokenRow.userId,
              email: null,
              reasonCode: 'INVALID_TOKEN',
              ip: clientIp,
              userAgent,
            })
          );
          return sendError(reply, 'AUTH_INVALID', 'User or membership not found', 401);
        }

        email = user.email;
        tenantId = user.memberships[0].tenantId;

        accessToken = await reply.tenantJwtSign({
          userId: user.id,
          tenantId: user.memberships[0].tenantId,
          role: user.memberships[0].role,
        });
      } else {
        // ADMIN realm
        if (!refreshTokenRow.adminId) {
          // Should never happen due to realm check, but satisfy TypeScript
          return sendError(reply, 'AUTH_INVALID', 'Invalid token state', 401);
        }

        const admin = await prisma.adminUser.findUnique({
          where: { id: refreshTokenRow.adminId },
          select: {
            id: true,
            email: true,
            role: true,
          },
        });

        if (!admin) {
          // Admin no longer exists
          await writeAuditLog(
            prisma,
            createAuthAudit({
              action: 'AUTH_REFRESH_FAILED',
              realm,
              tenantId: null,
              actorId: refreshTokenRow.adminId,
              email: null,
              reasonCode: 'INVALID_TOKEN',
              ip: clientIp,
              userAgent,
            })
          );
          return sendError(reply, 'AUTH_INVALID', 'Admin not found', 401);
        }

        email = admin.email;

        accessToken = await reply.adminJwtSign({
          adminId: admin.id,
          role: admin.role,
        });
      }

      // 7) Set new refresh cookie
      const cookieName = realm === 'TENANT' ? 'texqtic_rt_tenant' : 'texqtic_rt_admin';
      reply.setCookie(cookieName, newPlaintextRefreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ttlDays * 24 * 60 * 60,
      });

      // 8) Audit success
      await writeAuditLog(
        prisma,
        createAuthAudit({
          action: 'AUTH_REFRESH_SUCCESS',
          realm,
          tenantId,
          actorId: refreshTokenRow.userId || refreshTokenRow.adminId,
          email,
          reasonCode: 'SUCCESS',
          ip: clientIp,
          userAgent,
        })
      );

      // 9) Response (contract unchanged)
      return sendSuccess(reply, { token: accessToken });
    } catch (error: unknown) {
      // All errors: fail-closed
      fastify.log.error({ err: error }, '[Refresh Token] Error');
      return sendError(reply, 'AUTH_INVALID', 'Token refresh failed', 401);
    }
  });

  /**
   * POST /api/auth/logout
   * Logout endpoint - revokes refresh token and clears cookie
   *
   * Request: No body (reads cookies: texqtic_rt_tenant OR texqtic_rt_admin)
   * Response: { success: true, data: { ok: true } }
   *
   * Security: Fail-open behavior
   * - Always returns success (200 OK) even if token not found or DB operation fails
   * - Idempotent: safe to call multiple times
   * - Clears refresh cookie(s) regardless of DB state
   * - Revokes refresh token in DB if found (sets revokedAt, lastUsedAt)
   *
   * Realm detection:
   * - Based on cookie presence (texqtic_rt_tenant vs texqtic_rt_admin)
   * - If both cookies present: security violation, revoke both
   */
  fastify.post('/logout', async (request, reply) => {
    const clientIp = (request.headers['x-forwarded-for'] as string) || request.ip;
    const userAgent = request.headers['user-agent'] || 'unknown';

    try {
      const tenantRefreshCookie = request.cookies.texqtic_rt_tenant;
      const adminRefreshCookie = request.cookies.texqtic_rt_admin;

      // Determine trigger and detect cookie violations
      let trigger: 'tenant' | 'admin' | 'both' = 'tenant';
      const cookiesToRevoke: Array<{ name: string; token: string; realm: 'TENANT' | 'ADMIN' }> = [];

      if (tenantRefreshCookie && adminRefreshCookie) {
        // Both cookies present - security violation
        trigger = 'both';
        cookiesToRevoke.push({
          name: 'texqtic_rt_tenant',
          token: tenantRefreshCookie,
          realm: 'TENANT',
        });
        cookiesToRevoke.push({
          name: 'texqtic_rt_admin',
          token: adminRefreshCookie,
          realm: 'ADMIN',
        });

        // Audit realm violation (non-blocking)
        try {
          await writeAuditLog(
            prisma,
            createAuthAudit({
              action: 'AUTH_REALM_VIOLATION',
              realm: 'TENANT',
              tenantId: null,
              actorId: null,
              email: null,
              reasonCode: 'BOTH_COOKIES',
              ip: clientIp,
              userAgent,
              metadataJson: { trigger, violation: 'both_cookies' },
            })
          );
        } catch {
          // Non-blocking: audit write must not prevent logout
        }
      } else if (tenantRefreshCookie) {
        trigger = 'tenant';
        cookiesToRevoke.push({
          name: 'texqtic_rt_tenant',
          token: tenantRefreshCookie,
          realm: 'TENANT',
        });
      } else if (adminRefreshCookie) {
        trigger = 'admin';
        cookiesToRevoke.push({
          name: 'texqtic_rt_admin',
          token: adminRefreshCookie,
          realm: 'ADMIN',
        });
      }

      // No cookies present - nothing to revoke
      if (cookiesToRevoke.length === 0) {
        try {
          await writeAuditLog(
            prisma,
            createAuthAudit({
              action: 'AUTH_LOGOUT_NOOP',
              realm: 'TENANT',
              tenantId: null,
              actorId: null,
              email: null,
              reasonCode: 'NO_SESSION',
              ip: clientIp,
              userAgent,
              metadataJson: { trigger: 'none' },
            })
          );
        } catch {
          // Non-blocking: audit write must not prevent logout
        }
        return sendSuccess(reply, { ok: true });
      }

      // Revoke tokens (fail-open: wrap in try/catch)
      for (const { token, realm: tokenRealm } of cookiesToRevoke) {
        try {
          const tokenHash = hashRefreshToken(token);
          const refreshTokenRow = await prisma.refreshToken.findFirst({
            where: { tokenHash },
          });

          if (refreshTokenRow) {
            // Validate realm-mismatch: cookie realm must match DB row realm
            const dbIsAdminRealm = refreshTokenRow.adminId !== null;
            const cookieIsAdminRealm = tokenRealm === 'ADMIN';
            if (dbIsAdminRealm !== cookieIsAdminRealm) {
              // Realm mismatch: cookie says TENANT but DB says ADMIN (or vice versa)
              try {
                await writeAuditLog(
                  prisma,
                  createAuthAudit({
                    action: 'AUTH_REALM_VIOLATION',
                    realm: tokenRealm,
                    tenantId: null,
                    actorId: refreshTokenRow.userId || refreshTokenRow.adminId,
                    email: null,
                    reasonCode: 'COOKIE_DB_REALM_MISMATCH',
                    ip: clientIp,
                    userAgent,
                    metadataJson: {
                      trigger,
                      cookieRealm: tokenRealm,
                      dbRealm: dbIsAdminRealm ? 'ADMIN' : 'TENANT',
                    },
                  })
                );
              } catch {
                // Non-blocking: audit write must not prevent logout
              }
              // Continue with revocation despite mismatch (logout is fail-open)
            }

            if (refreshTokenRow.revokedAt === null) {
              // Token exists and not yet revoked
              await prisma.refreshToken.update({
                where: { id: refreshTokenRow.id },
                data: {
                  revokedAt: new Date(),
                  lastUsedAt: new Date(),
                },
              });

              // Audit successful logout (non-blocking)
              try {
                await writeAuditLog(
                  prisma,
                  createAuthAudit({
                    action: 'AUTH_LOGOUT_SUCCESS',
                    realm: tokenRealm,
                    tenantId: null,
                    actorId: refreshTokenRow.userId || refreshTokenRow.adminId,
                    email: null,
                    reasonCode: 'SUCCESS',
                    ip: clientIp,
                    userAgent,
                    metadataJson: { trigger },
                  })
                );
              } catch {
                // Non-blocking: audit write must not prevent logout
              }
            } else {
              // Token already revoked (non-blocking)
              try {
                await writeAuditLog(
                  prisma,
                  createAuthAudit({
                    action: 'AUTH_LOGOUT_NOOP',
                    realm: tokenRealm,
                    tenantId: null,
                    actorId: refreshTokenRow.userId || refreshTokenRow.adminId,
                    email: null,
                    reasonCode: 'ALREADY_REVOKED',
                    ip: clientIp,
                    userAgent,
                    metadataJson: { trigger },
                  })
                );
              } catch {
                // Non-blocking: audit write must not prevent logout
              }
            }
          } else {
            // Token not found in DB (non-blocking)
            try {
              await writeAuditLog(
                prisma,
                createAuthAudit({
                  action: 'AUTH_LOGOUT_NOOP',
                  realm: tokenRealm,
                  tenantId: null,
                  actorId: null,
                  email: null,
                  reasonCode: 'TOKEN_NOT_FOUND',
                  ip: clientIp,
                  userAgent,
                  metadataJson: { trigger },
                })
              );
            } catch {
              // Non-blocking: audit write must not prevent logout
            }
          }
        } catch (error) {
          // Fail-open: log error but continue (non-blocking)
          fastify.log.error(
            { err: error },
            `[Logout] Failed to revoke token for realm ${tokenRealm}`
          );
          try {
            await writeAuditLog(
              prisma,
              createAuthAudit({
                action: 'AUTH_LOGOUT_FAILED',
                realm: tokenRealm,
                tenantId: null,
                actorId: null,
                email: null,
                reasonCode: 'ERROR',
                ip: clientIp,
                userAgent,
                metadataJson: { trigger, error: 'revoke_failed' },
              })
            );
          } catch {
            // Non-blocking: audit write must not prevent logout
          }
        }
      }

      // Clear BOTH cookies unconditionally (fail-open guarantee)
      reply.setCookie('texqtic_rt_tenant', '', {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      reply.setCookie('texqtic_rt_admin', '', {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });

      // Always return success (fail-open)
      return sendSuccess(reply, { ok: true });
    } catch (error: unknown) {
      // Fail-open: even on unexpected error, clear cookies and return success
      fastify.log.error({ err: error }, '[Logout] Unexpected error');

      // Attempt to clear cookies
      try {
        reply.setCookie('texqtic_rt_tenant', '', {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        });
        reply.setCookie('texqtic_rt_admin', '', {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        });
      } catch {
        // Even cookie clearing failed, still return success
      }

      return sendSuccess(reply, { ok: true });
    }
  });
};

export default authRoutes;
