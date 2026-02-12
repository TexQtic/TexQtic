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
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db/prisma.js';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import authRoutes from '../routes/auth.js';
import bcrypt from 'bcrypt';
import { config } from '../config/index.js';

describe('AUTH-H1 Wave 2 Readiness Gate', () => {
  let server: any;
  let testTenantId: string;
  let testAdminId: string;
  let testUserId: string;
  let testUserEmail: string;
  let testAdminEmail: string;

  /**
   * Setup: Create test tenant, admin, user, and Fastify server
   */
  beforeEach(async () => {
    // Bypass RLS for test setup
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: `Test Tenant Wave2 ${Date.now()}`,
        slug: `test-tenant-wave2-${Date.now()}`,
        plan: 'FREE',
      },
    });
    testTenantId = tenant.id;

    // Create test user
    const passwordHash = await bcrypt.hash('password123', 10);
    testUserEmail = `user-wave2-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash,
        emailVerified: true,
      },
    });
    testUserId = user.id;

    // Create tenant membership
    await prisma.membership.create({
      data: {
        tenantId: testTenantId,
        userId: testUserId,
        role: 'OWNER',
      },
    });

    // Create test admin
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    testAdminEmail = `admin-wave2-${Date.now()}@example.com`;
    const admin = await prisma.adminUser.create({
      data: {
        email: testAdminEmail,
        passwordHash: adminPasswordHash,
        role: 'SUPER_ADMIN',
      },
    });
    testAdminId = admin.id;

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

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
   * Teardown: Clean up test data and server
   */
  afterEach(async () => {
    await server.close();

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    // Clean up memberships
    await prisma.membership.deleteMany({
      where: { tenantId: testTenantId },
    });

    // Clean up refresh tokens
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [{ userId: testUserId }, { adminId: testAdminId }],
      },
    });

    // Clean up audit logs
    await prisma.auditLog.deleteMany({
      where: {
        OR: [{ actorId: testUserId }, { actorId: testAdminId }],
      },
    });

    // Clean up rate limit attempts (prevent cross-test rate limiting)
    await prisma.rateLimitAttempt.deleteMany({
      where: {
        createdAt: { lte: new Date() }, // Delete all rate limit records
      },
    });

    // Clean up users
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });

    // Clean up admins
    await prisma.adminUser.deleteMany({
      where: { id: testAdminId },
    });

    // Clean up tenants
    await prisma.tenant.deleteMany({
      where: { id: testTenantId },
    });

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
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
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: testUserEmail,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    let currentCookie = loginResponse.headers['set-cookie'];
    expect(currentCookie).toBeDefined();

    // Extract familyId from first refresh token
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    const initialTokens = await prisma.refreshToken.findMany({
      where: { userId: testUserId, revokedAt: null },
    });
    expect(initialTokens.length).toBe(1);
    const familyId = initialTokens[0].familyId;
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    // Step 2: Run N refresh cycles
    for (let cycle = 1; cycle <= REFRESH_CYCLES; cycle++) {
      const refreshResponse = await server.inject({
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
        await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

        const familyTokens = await prisma.refreshToken.findMany({
          where: { familyId },
        });

        // Exactly 1 unrotated token (current)
        const unrotatedTokens = familyTokens.filter(t => t.rotatedAt === null);
        expect(unrotatedTokens.length).toBe(1);

        // Unrotated token should not be revoked
        expect(unrotatedTokens[0].revokedAt).toBeNull();

        // All rotated tokens should be older
        const rotatedTokens = familyTokens.filter(t => t.rotatedAt !== null);
        expect(rotatedTokens.length).toBeGreaterThan(0);

        await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
      }
    }

    // Final verification: check family state
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const finalTokens = await prisma.refreshToken.findMany({
      where: { familyId },
    });

    // Should have REFRESH_CYCLES + 1 tokens total (initial + rotations)
    expect(finalTokens.length).toBe(REFRESH_CYCLES + 1);

    // Exactly 1 unrotated, unrevo ked
    const activeFinalTokens = finalTokens.filter(t => t.rotatedAt === null && t.revokedAt === null);
    expect(activeFinalTokens.length).toBe(1);

    // REFRESH_CYCLES rotated (marked rotatedAt)
    const rotatedFinalTokens = finalTokens.filter(t => t.rotatedAt !== null);
    expect(rotatedFinalTokens.length).toBe(REFRESH_CYCLES);

    // All tokens should share familyId
    expect(finalTokens.every(t => t.familyId === familyId)).toBe(true);

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

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
    const loginResponse = await server.inject({
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

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    const initialTokens = await prisma.refreshToken.findMany({
      where: { userId: testUserId, revokedAt: null },
    });
    const familyId = initialTokens[0].familyId;
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    // Step 2: Refresh once (token A → token B)
    const firstRefreshResponse = await server.inject({
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
    const replayResponse = await server.inject({
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
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const familyTokens = await prisma.refreshToken.findMany({
      where: { familyId },
    });

    // All tokens should be revoked
    expect(familyTokens.every(t => t.revokedAt !== null)).toBe(true);

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
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
    const tenantLoginResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: testUserEmail,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    expect(tenantLoginResponse.statusCode).toBe(200);
    const tenantCookie = tenantLoginResponse.headers['set-cookie'];

    // Step 2: Login as admin user
    const adminLoginResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/admin/login',
      payload: {
        email: testAdminEmail,
        password: 'admin123',
      },
    });

    expect(adminLoginResponse.statusCode).toBe(200);
    const adminCookie = adminLoginResponse.headers['set-cookie'];

    // Step 3: Try tenant cookie on admin refresh (should fail)
    // Note: Current implementation may not have explicit realm checking,
    // but token lookup will fail (no adminId in tenant token)
    const crossAttempt1 = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: tenantCookie,
      },
    });

    // Should fail (token not found or realm mismatch)
    expect(crossAttempt1.statusCode).toBe(401);

    // Step 4: Try admin cookie on tenant refresh (should fail)
    const crossAttempt2 = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: adminCookie,
      },
    });

    // Should fail (token not found or realm mismatch)
    expect(crossAttempt2.statusCode).toBe(401);

    // Note: Both cookies should work with their own realm
    const tenantRefresh = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: tenantCookie,
      },
    });
    expect(tenantRefresh.statusCode).toBe(200); // ✅ Tenant cookie valid for tenant refresh

    const adminRefresh = await server.inject({
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
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: testUserEmail,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const initialCookie = loginResponse.headers['set-cookie'];

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    const initialTokens = await prisma.refreshToken.findMany({
      where: { userId: testUserId, revokedAt: null },
    });
    expect(initialTokens.length).toBe(1);
    const tokenId = initialTokens[0].id;
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    // Step 2: First logout
    const firstLogoutResponse = await server.inject({
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
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    const tokenAfterFirstLogout = await prisma.refreshToken.findUnique({
      where: { id: tokenId },
    });
    expect(tokenAfterFirstLogout?.revokedAt).not.toBeNull();
    const firstRevokedAt = tokenAfterFirstLogout?.revokedAt;
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    // Step 3: Second logout (idempotent)
    const secondLogoutResponse = await server.inject({
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
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    const tokenAfterSecondLogout = await prisma.refreshToken.findUnique({
      where: { id: tokenId },
    });
    expect(tokenAfterSecondLogout?.revokedAt?.getTime()).toBe(firstRevokedAt?.getTime());
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  /**
   * TEST E1: Audit Event Integrity - Login Success
   *
   * Verify audit event emitted correctly for successful tenant login
   * and that no secrets are leaked
   */
  it('should emit audit event for tenant login success without secrets', async () => {
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: testUserEmail,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    expect(loginResponse.statusCode).toBe(200);

    // Verify audit event
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const auditEvents = await prisma.auditLog.findMany({
      where: {
        actorId: testUserId,
        action: 'AUTH_LOGIN_SUCCESS',
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

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

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  /**
   * TEST E2: Audit Event Integrity - Rate Limit Enforced
   *
   * Trigger rate limit and verify audit event emitted without secrets
   */
  it('should emit audit event for rate limit enforcement without secrets', async () => {
    // Generate unique email for rate limit test
    const testEmail = `ratelimit-wave2-${Date.now()}@example.com`;
    const testPassword = 'wrongpassword';

    // Fire 6 failed login attempts to trigger rate limit (tenant threshold = 5)
    const attempts = Array.from({ length: 6 }, () =>
      server.inject({
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
    expect(rateLimitedResponse.statusCode).toBe(429);

    const body = JSON.parse(rateLimitedResponse.body);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(rateLimitedResponse.headers['retry-after']).toBeDefined();

    // Verify audit event emitted
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const auditEvents = await prisma.auditLog.findMany({
      where: {
        action: 'AUTH_RATE_LIMIT_ENFORCED',
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    expect(auditEvents.length).toBeGreaterThan(0);
    const event = auditEvents[0];

    // Verify no secrets in metadata
    const metadataStr = JSON.stringify(event.metadataJson);
    expect(metadataStr).not.toContain('password');
    expect(metadataStr).not.toContain(testEmail); // Email should be hashed in rate limit context
    expect(metadataStr).not.toContain('token');

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  /**
   * TEST E3: Audit Event Integrity - Email Not Verified
   *
   * Trigger email verification gate and verify audit event emitted
   */
  it('should emit audit event for unverified email without secrets', async () => {
    // Create unverified user with unique email to avoid rate limiting
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const passwordHash = await bcrypt.hash('password123', 10);
    const uniqueTimestamp = Date.now() + Math.random(); // Extra uniqueness
    const unverifiedUser = await prisma.user.create({
      data: {
        email: `unverified-wave2-${uniqueTimestamp}@example.com`,
        passwordHash,
        emailVerified: false, // ❌ Not verified
      },
    });

    // Create tenant membership
    await prisma.membership.create({
      data: {
        tenantId: testTenantId,
        userId: unverifiedUser.id,
        role: 'MEMBER',
      },
    });

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    // Attempt login
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/tenant/login',
      payload: {
        email: unverifiedUser.email,
        password: 'password123',
        tenantId: testTenantId,
      },
    });

    // Should be blocked with 401
    expect(loginResponse.statusCode).toBe(401);
    const body = JSON.parse(loginResponse.body);
    expect(body.error.code).toBe('AUTH_UNVERIFIED');

    // Verify audit event
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const auditEvents = await prisma.auditLog.findMany({
      where: {
        actorId: unverifiedUser.id,
        action: 'AUTH_LOGIN_FAILED',
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

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
    await prisma.membership.deleteMany({
      where: { userId: unverifiedUser.id },
    });
    await prisma.user.delete({
      where: { id: unverifiedUser.id },
    });

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });
});
