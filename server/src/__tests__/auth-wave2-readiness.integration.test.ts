/**
 * Integration Test: AUTH-H1 Wave 2 Readiness Gate
 *
 * Validates production readiness of authentication system after commits 7-9:
 * - Production refresh stress testing (200+ cycles)
 * - Replay simulation (immediate + cross-realm)
 * - Logout idempotency + revocation
 * - Audit event integrity (no secret leakage)
 *
 * Guardrails:
 * - No contract changes
 * - No auth logic changes
 * - No schema changes
 * - Test-only validation infrastructure
 *
 * WAVE 2 STABILIZATION (TEST-H1):
 * - DB availability gate (skip suite if DB unavailable)
 * - Safe teardown guard (prevents server close errors)
 * - Rate limit isolation (beforeEach cleanup + unique IPs)
 * - Audit event polling (handles async propagation)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db/prisma.js';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import authRoutes from '../routes/auth.js';
import bcrypt from 'bcrypt';
import { config } from '../config/index.js';
import { checkDbAvailable } from './helpers/dbGate.js';
import { expectAuditEventually } from './helpers/auditPolling.js';

describe('AUTH-H1 Wave 2 Readiness Gate', () => {
  let server: FastifyInstance | null = null;
  let testTenantId: string;
  let testAdminId: string;
  let testUserId: string;
  let testUserEmail: string;
  let testAdminEmail: string;

  /**
   * DB Availability Gate: Skip suite if DB unavailable
   */
  beforeAll(async () => {
    const dbAvailable = await checkDbAvailable(prisma);
    if (!dbAvailable) {
      throw new Error('[Wave 2 Readiness] Database unavailable - skipping suite');
    }
  });

  /**
   * Setup: Create test tenant, admin, user, and Fastify server
   * TEST-H3: Wrapped in explicit transaction with timeout to prevent pooler timeout errors
   */
  beforeEach(async () => {
    // Rate limit isolation: Clean up rate limits from previous tests
    await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        await tx.rateLimitAttempt.deleteMany({});
      },
      { timeout: 20000, maxWait: 20000 }
    );

    // Seed test data in a single transaction (bypass RLS + create entities)
    const result = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

        // Create test tenant
        const tenant = await tx.tenant.create({
          data: {
            name: `Test Tenant Wave2 ${Date.now()}`,
            slug: `test-tenant-wave2-${Date.now()}`,
            plan: 'FREE',
          },
        });

        // Create test user (VERIFIED for happy path tests)
        const passwordHash = await bcrypt.hash('password123', 10);
        const userEmail = `user-wave2-${Date.now()}@example.com`;
        const user = await tx.user.create({
          data: {
            email: userEmail,
            passwordHash,
            emailVerified: true,
            emailVerifiedAt: new Date(), // ✅ Commit 9: Must be set for verified users
          },
        });

        // Create tenant membership
        await tx.membership.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            role: 'OWNER',
          },
        });

        // Create test admin
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        const adminEmail = `admin-wave2-${Date.now()}@example.com`;
        const admin = await tx.adminUser.create({
          data: {
            email: adminEmail,
            passwordHash: adminPasswordHash,
            role: 'SUPER_ADMIN',
          },
        });

        return { tenant, user, userEmail, admin, adminEmail };
      },
      { timeout: 20000, maxWait: 20000 }
    );

    // Store IDs for test use
    testTenantId = result.tenant.id;
    testUserId = result.user.id;
    testUserEmail = result.userEmail;
    testAdminId = result.admin.id;
    testAdminEmail = result.adminEmail;

    // Create Fastify server for HTTP testing
    server = Fastify({ logger: false });
    await server.register(fastifyCookie, { secret: 'test-secret' });

    // Register JWT plugins (tenant and admin realms)
    await server.register(fastifyJwt, {
      secret: config.JWT_ACCESS_SECRET,
      namespace: 'tenant',
      jwtVerify: 'tenantJwtVerify',
      jwtSign: 'tenantJwtSign',
    });
    await server.register(fastifyJwt, {
      secret: config.JWT_ADMIN_ACCESS_SECRET,
      namespace: 'admin',
      jwtVerify: 'adminJwtVerify',
      jwtSign: 'adminJwtSign',
    });

    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.ready();
  });

  /**
   * Teardown: Clean up test data and server (safe guard)
   * TEST-H3: Wrapped in explicit transaction with timeout to prevent pooler timeout errors
   */
  afterEach(async () => {
    // Cleanup in a single transaction (bypass RLS + delete entities)
    await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

        // Clean up memberships
        await tx.membership.deleteMany({
          where: { tenantId: testTenantId },
        });

        // Clean up refresh tokens
        await tx.refreshToken.deleteMany({
          where: {
            OR: [{ userId: testUserId }, { adminId: testAdminId }],
          },
        });

        // Clean up audit logs
        await tx.auditLog.deleteMany({
          where: {
            OR: [{ actorId: testUserId }, { actorId: testAdminId }],
          },
        });

        // Clean up rate limit attempts (prevent cross-test rate limiting)
        await tx.rateLimitAttempt.deleteMany({});

        // Clean up users
        await tx.user.deleteMany({
          where: { id: testUserId },
        });

        // Clean up admins
        await tx.adminUser.deleteMany({
          where: { id: testAdminId },
        });

        // Clean up tenants
        await tx.tenant.deleteMany({
          where: { id: testTenantId },
        });
      },
      { timeout: 20000, maxWait: 20000 }
    );

    // Safe teardown guard: Prevent server close errors
    if (server) {
      await server.close().catch(() => {});
      server = null;
    }
  });

  /**
   * TEST A: Production Refresh Stress (200 cycles)
   *
   * Simulates production refresh token rotation over many cycles:
   * - login → refresh → refresh → ... (200+ times)
   * - Verifies no growth anomalies (rotatedAt populated, revokedAt null)
   * - Confirms familyId remains consistent
   * - Ensures exactly 1 active token per rotation step
   */
  it('should survive 200 refresh cycles without state anomalies', async () => {
    const REFRESH_CYCLES = 200;

    // Step 1: Login to get initial refresh token
    const loginResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: testUserEmail,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    // Diagnostic: Print response if not 200
    if (loginResponse.statusCode !== 200) {
      const body = JSON.parse(loginResponse.body);
      throw new Error(
        `Production stress test login failed: ${loginResponse.statusCode}. ` +
          `Error: ${body.error?.code || 'unknown'}, Message: ${body.error?.message || 'none'}`
      );
    }

    expect(loginResponse.statusCode).toBe(200);
    let currentCookie = loginResponse.headers['set-cookie'];
    expect(currentCookie).toBeDefined();

    // Extract familyId from first refresh token
    const familyId = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        const tokens = await tx.refreshToken.findMany({
          where: { userId: testUserId, revokedAt: null },
        });
        expect(tokens.length).toBe(1);
        return tokens[0].familyId;
      },
      { timeout: 20000, maxWait: 20000 }
    );

    // Step 2: Run N refresh cycles
    for (let cycle = 1; cycle <= REFRESH_CYCLES; cycle++) {
      const refreshResponse = await server!.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: currentCookie,
        },
      });

      // Assert each refresh succeeds
      expect(refreshResponse.statusCode).toBe(200);

      // Update cookie for next cycle
      const newCookie = refreshResponse.headers['set-cookie'];
      expect(newCookie).toBeDefined();
      currentCookie = newCookie;

      // Verify state every 50 cycles
      if (cycle % 50 === 0) {
        const familyTokens = await prisma.$transaction(
          async tx => {
            await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
            return await tx.refreshToken.findMany({
              where: { familyId },
            });
          },
          { timeout: 20000, maxWait: 20000 }
        );

        // Exactly 1 unrotated token (current)
        const unrotatedTokens = familyTokens.filter(t => t.rotatedAt === null);
        expect(unrotatedTokens.length).toBe(1);

        // Unrotated token should not be revoked
        expect(unrotatedTokens[0].revokedAt).toBeNull();

        // All rotated tokens should be older
        const rotatedTokens = familyTokens.filter(t => t.rotatedAt !== null);
        expect(rotatedTokens.length).toBeGreaterThan(0);
      }
    }

    // Final verification: check family state
    const finalTokens = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        return await tx.refreshToken.findMany({
          where: { familyId },
        });
      },
      { timeout: 20000, maxWait: 20000 }
    );

    // Should have REFRESH_CYCLES + 1 tokens total (initial + rotations)
    expect(finalTokens.length).toBe(REFRESH_CYCLES + 1);

    // Exactly 1 unrotated, unrevoked
    const activeFinalTokens = finalTokens.filter(t => t.rotatedAt === null && t.revokedAt === null);
    expect(activeFinalTokens.length).toBe(1);

    // REFRESH_CYCLES rotated (marked rotatedAt)
    const rotatedFinalTokens = finalTokens.filter(t => t.rotatedAt !== null);
    expect(rotatedFinalTokens.length).toBe(REFRESH_CYCLES);

    // All tokens should share familyId
    expect(finalTokens.every(t => t.familyId === familyId)).toBe(true);
  }, 30_000);

  /**
   * TEST B1: Immediate Replay Detection
   *
   * Use token A to refresh → get token B → try token A again
   * Expected:
   * - Token A fails with 401 (already rotated)
   * - Family is revoked
   * - Cookie is cleared
   */
  it('should detect immediate replay and revoke family', async () => {
    // Step 1: Login
    const loginResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: `user-wave2-${testUserId.slice(0, 8)}@example.com`,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const initialCookie = loginResponse.headers['set-cookie'];

    const initialTokens = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        return await tx.refreshToken.findMany({
          where: { userId: testUserId, revokedAt: null },
        });
      },
      { timeout: 20000, maxWait: 20000 }
    );
    const familyId = initialTokens[0].familyId;

    // Step 2: Refresh once (token A → token B)
    const firstRefreshResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: initialCookie,
      },
    });

    expect(firstRefreshResponse.statusCode).toBe(200);
    const newCookie = firstRefreshResponse.headers['set-cookie'];
    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(initialCookie); // ✅ Cookie rotated

    // Step 3: Try token A again (replay attack)
    const replayResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: initialCookie, // ❌ Reusing old cookie
      },
    });

    // Assert replay detected
    expect(replayResponse.statusCode).toBe(401);
    const replayBody = JSON.parse(replayResponse.body);
    expect(replayBody.status).toBe('error');

    // Cookie should be cleared
    const clearCookie = replayResponse.headers['set-cookie'];
    expect(clearCookie).toContain('Max-Age=0');

    // Verify family revoked
    const familyTokens = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        return await tx.refreshToken.findMany({
          where: { familyId },
        });
      },
      { timeout: 20000, maxWait: 20000 }
    );

    // All tokens should be revoked
    expect(familyTokens.every(t => t.revokedAt !== null)).toBe(true);
  });

  /**
   * TEST B2: Cross-Realm Replay Safety
   *
   * Ensure tenant cookie cannot be used for admin refresh and vice-versa.
   * Expected:
   * - Tenant cookie → admin refresh = 401
   * - Admin cookie → tenant refresh = 401
   * - Audit event emitted with realm mismatch indication (if implemented)
   */
  it('should reject cross-realm cookie reuse', async () => {
    // Step 1: Login as tenant user
    const tenantLoginResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: testUserEmail,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    // Diagnostic: Print response if not 200
    if (tenantLoginResponse.statusCode !== 200) {
      const body = JSON.parse(tenantLoginResponse.body);
      throw new Error(
        `Cross-realm tenant login failed: ${tenantLoginResponse.statusCode}. ` +
          `Error: ${body.error?.code || 'unknown'}, Message: ${body.error?.message || 'none'}`
      );
    }

    expect(tenantLoginResponse.statusCode).toBe(200);
    const tenantCookie = tenantLoginResponse.headers['set-cookie'];

    // Step 2: Login as admin user
    const adminLoginResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/admin/login',
      payload: {
        email: testAdminEmail,
        password: 'admin123',
      },
    });

    // Diagnostic: Print response if not 200
    if (adminLoginResponse.statusCode !== 200) {
      const body = JSON.parse(adminLoginResponse.body);
      throw new Error(
        `Cross-realm admin login failed: ${adminLoginResponse.statusCode}. ` +
          `Error: ${body.error?.code || 'unknown'}, Message: ${body.error?.message || 'none'}`
      );
    }

    expect(adminLoginResponse.statusCode).toBe(200);
    const adminCookie = adminLoginResponse.headers['set-cookie'];

    // Step 3: Try tenant cookie on admin refresh (should fail)
    // Note: Current implementation may not have explicit realm checking,
    // but token lookup will fail (no adminId in tenant token)
    const crossAttempt1 = await server!.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: tenantCookie,
      },
    });

    // Should fail (token not found or realm mismatch)
    expect(crossAttempt1.statusCode).toBe(401);

    // Step 4: Try admin cookie on tenant refresh (should fail)
    const crossAttempt2 = await server!.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: adminCookie,
      },
    });

    // Should fail (token not found or realm mismatch)
    expect(crossAttempt2.statusCode).toBe(401);

    // Note: Both cookies should work with their own realm
    const tenantRefresh = await server!.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: tenantCookie,
      },
    });
    expect(tenantRefresh.statusCode).toBe(200); // ✅ Tenant cookie valid for tenant refresh

    const adminRefresh = await server!.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: adminCookie,
      },
    });
    expect(adminRefresh.statusCode).toBe(200); // ✅ Admin cookie valid for admin refresh
  });

  /**
   * TEST D1: Logout Idempotency
   *
   * Call logout twice and verify:
   * - Cookies cleared both times
   * - revokedAt set and remains stable
   * - Audit events emitted correctly
   */
  it('should handle logout idempotency correctly', async () => {
    // Step 1: Login
    const loginResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: testUserEmail,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    // Diagnostic: Print response if not 200
    if (loginResponse.statusCode !== 200) {
      const body = JSON.parse(loginResponse.body);
      throw new Error(
        `Replay test login failed: ${loginResponse.statusCode}. ` +
          `Error: ${body.error?.code || 'unknown'}, Message: ${body.error?.message || 'none'}`
      );
    }

    expect(loginResponse.statusCode).toBe(200);
    const initialCookie = loginResponse.headers['set-cookie'];

    const { tokenId } = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        const initialTokens = await tx.refreshToken.findMany({
          where: { userId: testUserId, revokedAt: null },
        });
        expect(initialTokens.length).toBe(1);
        return { tokenId: initialTokens[0].id };
      },
      { timeout: 20000, maxWait: 20000 }
    );

    // Step 2: First logout
    const firstLogoutResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        cookie: initialCookie,
      },
    });

    expect(firstLogoutResponse.statusCode).toBe(200);

    // Verify cookie cleared
    const firstClearCookie = firstLogoutResponse.headers['set-cookie'];
    expect(firstClearCookie).toContain('Max-Age=0');

    // Verify revokedAt set
    const firstRevokedAt = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        const tokenAfterFirstLogout = await tx.refreshToken.findUnique({
          where: { id: tokenId },
        });
        expect(tokenAfterFirstLogout?.revokedAt).not.toBeNull();
        return tokenAfterFirstLogout?.revokedAt;
      },
      { timeout: 20000, maxWait: 20000 }
    );

    // Step 3: Second logout (idempotent)
    const secondLogoutResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        cookie: initialCookie,
      },
    });

    // Should still succeed (idempotent behavior)
    expect(secondLogoutResponse.statusCode).toBe(200);

    // Verify cookie cleared again
    const secondClearCookie = secondLogoutResponse.headers['set-cookie'];
    expect(secondClearCookie).toContain('Max-Age=0');

    // Verify revokedAt remains stable (not updated)
    await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        const tokenAfterSecondLogout = await tx.refreshToken.findUnique({
          where: { id: tokenId },
        });
        expect(tokenAfterSecondLogout?.revokedAt?.getTime()).toBe(firstRevokedAt?.getTime());
      },
      { timeout: 20000, maxWait: 20000 }
    );
  });

  /**
   * TEST E1: Audit Event Integrity - Login Success
   *
   * Verify audit event emitted correctly for successful tenant login
   * and that no secrets are leaked
   */
  it('should emit audit event for tenant login success without secrets', async () => {
    const loginResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: testUserEmail,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    // Diagnostic: Print response if not 200
    if (loginResponse.statusCode !== 200) {
      const body = JSON.parse(loginResponse.body);
      throw new Error(
        `E1 audit test login failed: ${loginResponse.statusCode}. ` +
          `Error: ${body.error?.code || 'unknown'}, Message: ${body.error?.message || 'none'}`
      );
    }

    expect(loginResponse.statusCode).toBe(200);

    // Verify audit event (with eventual consistency polling)
    const auditEvents = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        return await expectAuditEventually(
          () =>
            tx.auditLog.findMany({
              where: {
                actorId: testUserId,
                action: 'AUTH_LOGIN_SUCCESS',
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            }),
          results => results.length >= 1,
          1000, // 1 second timeout
          50 // 50ms polling interval
        );
      },
      { timeout: 20000, maxWait: 20000 }
    );

    expect(auditEvents.length).toBe(1);
    const event = auditEvents[0];

    // Verify no secrets in metadata
    const metadataStr = JSON.stringify(event.metadataJson);
    expect(metadataStr).not.toContain('password');
    expect(metadataStr).not.toContain('token');
    expect(metadataStr).not.toContain('passwordHash');

    // Verify basic audit structure
    expect(event.actorId).toBe(testUserId);
    expect(event.actorType).toBe('USER');
  });

  /**
   * TEST E2: Audit Event Integrity - Rate Limit Enforced
   *
   * Trigger rate limit and verify audit event emitted without secrets
   *
   * TEST-H2 Fix: Use existing VERIFIED user email with WRONG password
   * - User exists and is verified (passes verification gate)
   * - Wrong password triggers auth failure (drives rate limiter)
   * - After 5 failed attempts, 6th should return 429
   */
  it('should emit audit event for rate limit enforcement without secrets', async () => {
    // Use existing verified test user's email with WRONG password
    const testEmail = testUserEmail; // ✅ Verified user from setup
    const testPassword = 'wrongpassword123'; // ❌ Wrong password

    // Fire 6 failed login attempts to trigger rate limit (tenant threshold = 5)
    const attempts = Array.from({ length: 6 }, () =>
      server!.inject({
        method: 'POST',
        url: '/api/auth/tenant/login',
        payload: {
          email: testEmail,
          password: testPassword,
          tenantId: testTenantId,
        },
        headers: {
          'X-Forwarded-For': '192.168.1.100', // Consistent IP for rate limiting
        },
      })
    );

    const responses = await Promise.all(attempts);

    // Last attempt should be rate limited (429)
    const rateLimitedResponse = responses[responses.length - 1];

    // Diagnostic: Print response if not 429
    if (rateLimitedResponse.statusCode !== 429) {
      const body = JSON.parse(rateLimitedResponse.body);
      throw new Error(
        `Expected 429, got ${rateLimitedResponse.statusCode}. ` +
          `Error: ${body.error?.code || 'unknown'}, Message: ${body.error?.message || 'none'}`
      );
    }

    expect(rateLimitedResponse.statusCode).toBe(429);

    const body = JSON.parse(rateLimitedResponse.body);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(rateLimitedResponse.headers['retry-after']).toBeDefined();

    // Verify audit event emitted (with eventual consistency polling)
    const auditEvents = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        return await expectAuditEventually(
          () =>
            tx.auditLog.findMany({
              where: {
                action: 'AUTH_RATE_LIMIT_ENFORCED',
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            }),
          results => results.length >= 1,
          1000, // 1 second timeout
          50 // 50ms polling interval
        );
      },
      { timeout: 20000, maxWait: 20000 }
    );

    expect(auditEvents.length).toBeGreaterThan(0);
    const event = auditEvents[0];

    // Verify no secrets in metadata
    const metadataStr = JSON.stringify(event.metadataJson);
    expect(metadataStr).not.toContain('password');
    expect(metadataStr).not.toContain(testEmail); // Email should be hashed in rate limit context
    expect(metadataStr).not.toContain('token');
  }, 20_000); // Extended timeout: multiple HTTP calls + DB cleanup + audit polling

  /**
   * TEST E3: Audit Event Integrity - Email Not Verified
   *
   * Trigger email verification gate and verify audit event emitted
   */
  it('should emit audit event for unverified email without secrets', async () => {
    // Create unverified user with unique email to avoid rate limiting
    const passwordHash = await bcrypt.hash('password123', 10);
    const uniqueTimestamp = Date.now() + Math.random(); // Extra uniqueness

    const unverifiedUser = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

        const user = await tx.user.create({
          data: {
            email: `unverified-wave2-${uniqueTimestamp}@example.com`,
            passwordHash,
            emailVerified: false, // ❌ Not verified
            emailVerifiedAt: null, // ❌ Explicitly null (Commit 9 invariant)
          },
        });

        // Create tenant membership
        await tx.membership.create({
          data: {
            tenantId: testTenantId,
            userId: user.id,
            role: 'MEMBER',
          },
        });

        return user;
      },
      { timeout: 20000, maxWait: 20000 }
    );

    // Attempt login
    const loginResponse = await server!.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: unverifiedUser.email,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    // Should be blocked with 401 (NOT_VERIFIED)
    if (loginResponse.statusCode !== 401) {
      const body = JSON.parse(loginResponse.body);
      throw new Error(
        `Expected 401 for unverified user, got ${loginResponse.statusCode}. ` +
          `Error: ${body.error?.code || 'unknown'}, Message: ${body.error?.message || 'none'}`
      );
    }

    expect(loginResponse.statusCode).toBe(401);
    const body = JSON.parse(loginResponse.body);
    expect(body.error.code).toBe('AUTH_UNVERIFIED');

    // Verify audit event (with eventual consistency polling)
    const auditEvents = await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        return await expectAuditEventually(
          () =>
            tx.auditLog.findMany({
              where: {
                actorId: unverifiedUser.id,
                action: 'AUTH_LOGIN_FAILED',
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            }),
          results => results.length >= 1,
          1000, // 1 second timeout
          50 // 50ms polling interval
        );
      },
      { timeout: 20000, maxWait: 20000 }
    );

    expect(auditEvents.length).toBe(1);
    const event = auditEvents[0];

    // Verify reason code present in metadata
    expect(event.metadataJson).toBeDefined();
    if (typeof event.metadataJson === 'object' && event.metadataJson !== null) {
      expect((event.metadataJson as any).reasonCode).toBe('NOT_VERIFIED');
    }

    // Verify no secrets
    const metadataStr = JSON.stringify(event.metadataJson);
    expect(metadataStr).not.toContain('password');
    expect(metadataStr).not.toContain('token');

    // Cleanup
    await prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        await tx.membership.deleteMany({
          where: { userId: unverifiedUser.id },
        });
        await tx.user.delete({
          where: { id: unverifiedUser.id },
        });
      },
      { timeout: 20000, maxWait: 20000 }
    );
  }, 20_000); // Extended timeout: user creation + login + DB cleanup + audit polling
});
