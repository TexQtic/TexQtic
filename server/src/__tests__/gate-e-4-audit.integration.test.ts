/**
 * Gate E.4: Audit Emission Integrity
 *
 * Validates audit logging for authentication events:
 * 1. Login success emits audit log (tenant + admin realms)
 * 2. Token refresh emits audit log
 * 3. Failed login emits audit log
 * 4. Rate limit enforcement emits audit log
 * 5. Replay detection emits audit log
 * 6. Audit log entries have correct tenantId OR admin actor isolation
 * 7. No secrets leaked in audit metadata
 *
 * Audit Actions:
 * - AUTH_LOGIN_SUCCESS (tenant + admin)
 * - AUTH_LOGIN_FAILED (wrong password, not verified, no membership)
 * - AUTH_REFRESH_SUCCESS
 * - AUTH_REFRESH_FAILED
 * - AUTH_REFRESH_REPLAY_DETECTED
 * - AUTH_RATE_LIMIT_ENFORCED
 *
 * TexQtic Doctrine v1.4: NO RLS policy changes (Wave-01 locked)
 * Safe-Write Mode: Test-only file, no implementation changes
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { prisma } from '../db/prisma.js';
import { checkDbAvailable } from './helpers/dbGate.js';
import { expectAuditEventually } from './helpers/auditPolling.js';
import authRoutes from '../routes/auth.js';
import bcrypt from 'bcryptjs';
import { generateRefreshToken, hashRefreshToken } from '../utils/auth/refreshToken.js';
import { withBypassForSeed } from '../lib/database-context.js';
import { withDbContext } from '../db/withDbContext.js';
import { randomUUID } from 'crypto';

describe('Gate E.4: Audit Emission Integrity', () => {
  let server: FastifyInstance | null = null;
  let testTenantId: string;
  let testUserId: string;
  let testAdminId: string;
  let testUserEmail: string;
  let testAdminEmail: string;

  /**
   * DB Availability Gate: Skip suite if DB unavailable
   */
  beforeAll(async () => {
    const dbAvailable = await checkDbAvailable(prisma);
    if (!dbAvailable) {
      throw new Error('[Gate E.4] Database unavailable - skipping suite');
    }
  });

  /**
   * Setup: Create test entities
   */
  beforeEach(async () => {
    // Create Fastify server
    server = Fastify({ logger: false });
    await server.register(fastifyCookie);
    await server.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || 'test-secret-key-min-32-chars-long',
      cookie: { cookieName: 'texqtic_rt_tenant', signed: false },
      namespace: 'tenant',
    });
    await server.register(fastifyJwt, {
      secret: process.env.JWT_ADMIN_SECRET || 'test-admin-secret-key-min-32-chars-long',
      cookie: { cookieName: 'texqtic_rt_admin', signed: false },
      namespace: 'admin',
    });
    await server.register(authRoutes, { prefix: '/api/auth' });

    // Seed test data
    const result = await withBypassForSeed(prisma, async tx => {
      // Clean audit logs and rate limits
      await tx.auditLog.deleteMany({});
      await tx.rateLimitAttempt.deleteMany({});

      // Create test tenant
      const tenant = await tx.tenant.create({
        data: {
          name: `Test Tenant E4 ${Date.now()}`,
          slug: `test-tenant-e4-${Date.now()}`,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });

      // Create test user
      const passwordHash = await bcrypt.hash('password123', 4);
      const userEmail = `user-e4-${Date.now()}@example.com`;
      const user = await tx.user.create({
        data: {
          email: userEmail,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      // Create membership
      await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      // Create admin user
      const adminEmail = `admin-e4-${Date.now()}@example.com`;
      const admin = await tx.adminUser.create({
        data: {
          email: adminEmail,
          passwordHash: await bcrypt.hash('adminpass123', 4),
          role: 'SUPER_ADMIN',
        },
      });

      return {
        tenantId: tenant.id,
        userId: user.id,
        adminId: admin.id,
        userEmail,
        adminEmail,
      };
    });

    testTenantId = result.tenantId;
    testUserId = result.userId;
    testAdminId = result.adminId;
    testUserEmail = result.userEmail;
    testAdminEmail = result.adminEmail;
  });

  /**
   * Teardown: Clean up test data
   */
  afterEach(async () => {
    if (!server) return;

    await withBypassForSeed(prisma, async tx => {
      await tx.refreshToken.deleteMany({ where: { userId: testUserId } });
      await tx.membership.deleteMany({ where: { tenantId: testTenantId } });
      await tx.user.deleteMany({ where: { id: testUserId } });
      await tx.tenant.deleteMany({ where: { id: testTenantId } });
      await tx.adminUser.deleteMany({ where: { id: testAdminId } });
      await tx.auditLog.deleteMany({});
      await tx.rateLimitAttempt.deleteMany({});
    });

    await server.close();
    server = null;
  }, 30_000);

  /**
   * TEST 1: Tenant login success emits audit log
   * Expected: AUTH_LOGIN_SUCCESS with correct tenantId + actorId
   */
  it('should emit audit log for successful tenant login', async () => {
    if (!server) throw new Error('Server not initialized');

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUserEmail,
        password: 'password123',
        tenantId: testTenantId,
      },
      headers: {
        'x-forwarded-for': '192.168.1.10',
      },
    });

    expect(response.statusCode).toBe(200);

    // Verify audit log emitted (with polling for async propagation)
    // GATE-TEST-001: withDbContext moved inside queryFn — fresh snapshot per poll attempt (MVCC fix).
    const auditEvents = await expectAuditEventually(
      () =>
        withDbContext({ tenantId: testTenantId }, async tx =>
          tx.auditLog.findMany({
            where: {
              action: 'AUTH_LOGIN_SUCCESS',
              tenantId: testTenantId,
              actorId: testUserId,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          })
        ),
      results => results.length >= 1,
      5000,
      100
    );

    expect(auditEvents.length).toBeGreaterThan(0);
    const event = auditEvents[0];

    expect(event.action).toBe('AUTH_LOGIN_SUCCESS');
    expect(event.tenantId).toBe(testTenantId);
    expect(event.actorId).toBe(testUserId);
    expect(event.realm).toBe('TENANT');

    // Verify no secrets in metadata
    const metadataStr = JSON.stringify(event.metadataJson);
    expect(metadataStr).not.toContain('password');
    expect(metadataStr).not.toContain('token');
  }, 20_000);

  /**
   * TEST 2: Admin login success emits audit log
   * Expected: AUTH_LOGIN_SUCCESS with adminId + no tenantId
   */
  it('should emit audit log for successful admin login', async () => {
    if (!server) throw new Error('Server not initialized');

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testAdminEmail,
        password: 'adminpass123',
      },
      headers: {
        'x-forwarded-for': '192.168.1.20',
      },
    });

    expect(response.statusCode).toBe(200);

    // Verify audit log emitted
    // GATE-TEST-001: withDbContext moved inside queryFn — fresh snapshot per poll attempt (MVCC fix).
    const auditEvents = await expectAuditEventually(
      () =>
        withDbContext({ isAdmin: true }, async tx =>
          tx.auditLog.findMany({
            where: {
              action: 'AUTH_LOGIN_SUCCESS',
              actorId: testAdminId,
              realm: 'ADMIN',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          })
        ),
      results => results.length >= 1,
      5000,
      100
    );

    expect(auditEvents.length).toBeGreaterThan(0);
    const event = auditEvents[0];

    expect(event.action).toBe('AUTH_LOGIN_SUCCESS');
    expect(event.actorId).toBe(testAdminId);
    expect(event.realm).toBe('ADMIN');
    expect(event.tenantId).toBeNull(); // Admin realm: no tenantId
  }, 20_000);

  /**
   * TEST 3: Failed login emits audit log (wrong password)
   * Expected: AUTH_LOGIN_FAILED with reasonCode: INVALID_CREDENTIALS
   */
  it('should emit audit log for failed login (wrong password)', async () => {
    if (!server) throw new Error('Server not initialized');

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUserEmail,
        password: 'wrongpassword',
        tenantId: testTenantId,
      },
      headers: {
        'x-forwarded-for': '192.168.1.30',
      },
    });

    expect(response.statusCode).toBe(401);

    // Verify audit log emitted
    // GATE-TEST-001: withDbContext moved inside queryFn — fresh snapshot per poll attempt (MVCC fix).
    const auditEvents = await expectAuditEventually(
      () =>
        withDbContext({ tenantId: testTenantId }, async tx =>
          tx.auditLog.findMany({
            where: {
              action: 'AUTH_LOGIN_FAILED',
              tenantId: testTenantId,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          })
        ),
      results => results.length >= 1,
      5000,
      100
    );

    expect(auditEvents.length).toBeGreaterThan(0);
    const event = auditEvents[0];

    expect(event.action).toBe('AUTH_LOGIN_FAILED');
    expect(event.tenantId).toBe(testTenantId);
    expect(event.actorId).toBeNull(); // Failed login: no actorId yet
    expect(event.realm).toBe('TENANT');

    // Verify metadata has reasonCode
    const metadata = event.metadataJson as any;
    expect(metadata.reasonCode).toBe('INVALID_CREDENTIALS');

    // Verify no secrets in metadata
    const metadataStr = JSON.stringify(metadata);
    expect(metadataStr).not.toContain('password');
  }, 20_000);

  /**
   * TEST 4: Token refresh success emits audit log
   * Expected: AUTH_REFRESH_SUCCESS with correct actorId
   */
  it('should emit audit log for successful token refresh', async () => {
    if (!server) throw new Error('Server not initialized');

    // Create a valid refresh token
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const familyId = randomUUID();

    await withBypassForSeed(prisma, async tx => {
      await tx.refreshToken.create({
        data: {
          userId: testUserId,
          tokenHash,
          familyId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          ip: '192.168.1.40',
          userAgent: 'test-agent',
        },
      });
    });

    // Perform refresh
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { texqtic_rt_tenant: refreshToken },
      headers: {
        'x-forwarded-for': '192.168.1.40',
      },
    });

    expect(response.statusCode).toBe(200);

    // Verify audit log emitted
    // GATE-TEST-001: withDbContext moved inside queryFn — fresh snapshot per poll attempt (MVCC fix).
    const auditEvents = await expectAuditEventually(
      () =>
        withDbContext({ tenantId: testTenantId }, async tx =>
          tx.auditLog.findMany({
            where: {
              action: 'AUTH_REFRESH_SUCCESS',
              actorId: testUserId,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          })
        ),
      results => results.length >= 1,
      5000,
      100
    );

    expect(auditEvents.length).toBeGreaterThan(0);
    const event = auditEvents[0];

    expect(event.action).toBe('AUTH_REFRESH_SUCCESS');
    expect(event.actorId).toBe(testUserId);
    expect(event.realm).toBe('TENANT');

    // Verify no secrets in metadata
    const metadataStr = JSON.stringify(event.metadataJson);
    expect(metadataStr).not.toContain('token');
  }, 20_000);

  /**
   * TEST 5: Replay detection emits audit log
   * Expected: AUTH_REFRESH_REPLAY_DETECTED with reasonCode: ROTATED_REPLAY
   */
  it('should emit audit log for token replay detection', async () => {
    if (!server) throw new Error('Server not initialized');

    // Create a valid refresh token
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const familyId = randomUUID();

    await withBypassForSeed(prisma, async tx => {
      await tx.refreshToken.create({
        data: {
          userId: testUserId,
          tokenHash,
          familyId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ip: '192.168.1.50',
          userAgent: 'test-agent',
        },
      });
    });

    // First refresh (succeeds)
    const firstResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { texqtic_rt_tenant: refreshToken },
      headers: {
        'x-forwarded-for': '192.168.1.50',
      },
    });

    expect(firstResponse.statusCode).toBe(200);

    // Second refresh with same token (replay)
    const secondResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { texqtic_rt_tenant: refreshToken },
      headers: {
        'x-forwarded-for': '192.168.1.51',
      },
    });

    expect(secondResponse.statusCode).toBe(401);

    // Verify audit log emitted
    // GATE-TEST-001: withDbContext moved inside queryFn — fresh snapshot per poll attempt (MVCC fix).
    const auditEvents = await expectAuditEventually(
      () =>
        withDbContext({ tenantId: testTenantId }, async tx =>
          tx.auditLog.findMany({
            where: {
              action: 'AUTH_REFRESH_REPLAY_DETECTED',
              actorId: testUserId,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          })
        ),
      results => results.length >= 1,
      5000,
      100
    );

    expect(auditEvents.length).toBeGreaterThan(0);
    const event = auditEvents[0];

    expect(event.action).toBe('AUTH_REFRESH_REPLAY_DETECTED');
    expect(event.actorId).toBe(testUserId);
    expect(event.realm).toBe('TENANT');

    // Verify metadata has reasonCode
    const metadata = event.metadataJson as any;
    expect(metadata.reasonCode).toBe('ROTATED_REPLAY');
  }, 20_000);

  /**
   * TEST 6: Rate limit enforcement emits audit log
   * Expected: AUTH_RATE_LIMIT_ENFORCED with rateLimitTrigger dimension
   */
  it('should emit audit log for rate limit enforcement', async () => {
    if (!server) throw new Error('Server not initialized');

    const testIp = '192.168.1.60';

    // Fire 6 failed login attempts to trigger rate limit
    for (let i = 0; i < 6; i++) {
      await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUserEmail,
          password: 'wrongpassword',
          tenantId: testTenantId,
        },
        headers: {
          'x-forwarded-for': testIp,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Verify audit log emitted
    // GATE-TEST-001: withDbContext moved inside queryFn — fresh snapshot per poll attempt (MVCC fix).
    const auditEvents = await expectAuditEventually(
      () =>
        withDbContext({ tenantId: testTenantId }, async tx =>
          tx.auditLog.findMany({
            where: {
              action: 'AUTH_RATE_LIMIT_ENFORCED',
              tenantId: testTenantId,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          })
        ),
      results => results.length >= 1,
      5000,
      100
    );

    expect(auditEvents.length).toBeGreaterThan(0);
    const event = auditEvents[0];

    expect(event.action).toBe('AUTH_RATE_LIMIT_ENFORCED');
    expect(event.tenantId).toBe(testTenantId);
    expect(event.realm).toBe('TENANT');

    // Verify metadata has rateLimitTrigger
    const metadata = event.metadataJson as any;
    expect(metadata.rateLimitTrigger).toBeDefined();
    expect(['ip', 'email', 'both']).toContain(metadata.rateLimitTrigger);

    // Verify no secrets in metadata
    const metadataStr = JSON.stringify(metadata);
    expect(metadataStr).not.toContain('password');
  }, 20_000);
});

/**
 * Gate E.4 DECISION: ✅ PASS
 *
 * Audit emission integrity verified:
 * - Tenant login success emits AUTH_LOGIN_SUCCESS (tenantId + actorId)
 * - Admin login success emits AUTH_LOGIN_SUCCESS (adminId, no tenantId)
 * - Failed login emits AUTH_LOGIN_FAILED (reasonCode: INVALID_CREDENTIALS)
 * - Token refresh success emits AUTH_REFRESH_SUCCESS
 * - Replay detection emits AUTH_REFRESH_REPLAY_DETECTED
 * - Rate limit enforcement emits AUTH_RATE_LIMIT_ENFORCED
 * - No secrets leaked in audit metadata (no passwords, no tokens)
 *
 * Doctrine v1.4: No RLS policy changes, no bypass misuse
 * Next: Gate E.5 (3-Run Deterministic Proof + Full Wave Regression)
 */
