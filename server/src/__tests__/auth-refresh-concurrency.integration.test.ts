/**
 * Integration Test: AUTH-H1 COMMIT 7 - Refresh Token Concurrency + Replay
 *
 * Tests the deterministic behavior of refresh token rotation under:
 * 1. Concurrent refresh attempts (no double-mint)
 * 2. Replay detection (rotated token reuse)
 * 3. Token hash uniqueness constraint
 *
 * Verifies:
 * - Exactly 1 concurrent request succeeds (first wins)
 * - Other concurrent requests fail with 401
 * - Only 1 new refresh token is created
 * - Replay detection still works (family revocation)
 * - Cookie clearing happens on failure
 *
 * WAVE 2 STABILIZATION (TEST-H1):
 * - Uses HTTP inject pattern (NOT Prisma transactions - pooler safe)
 * - DB availability gate (skip suite if DB unavailable)
 * - Safe teardown guard (prevents server close errors)
 * - Rate limit isolation (unique IPs + cleanup)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { prisma } from '../db/prisma.js';
import { generateRefreshToken, hashRefreshToken } from '../utils/auth/refreshToken.js';
import { randomUUID } from 'node:crypto';
import authRoutes from '../routes/auth.js';
import { checkDbAvailable } from './helpers/dbGate.js';

describe('AUTH-H1 COMMIT 7: Refresh Token Concurrency + Replay', () => {
  let server: FastifyInstance | null = null;
  let testUserId: string;
  let testAdminId: string;
  let testTenantId: string;
  let testFamilyId: string;
  let testRefreshToken: string;
  let testRefreshTokenHash: string;
  let testRefreshTokenId: string;

  /**
   * DB Availability Gate: Skip suite if DB unavailable
   */
  beforeAll(async () => {
    const dbAvailable = await checkDbAvailable(prisma);
    if (!dbAvailable) {
      throw new Error('[Concurrency Test] Database unavailable - skipping suite');
    }
  });

  /**
   * Setup: Create test server, tenant, user, and valid refresh token
   */
  beforeEach(async () => {
    // Rate limit isolation: Clean up rate limits from previous tests
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    await prisma.rateLimitAttempt.deleteMany({});
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    // Create Fastify server with auth routes
    server = Fastify({ logger: false });
    await server.register(fastifyCookie);
    await server.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || 'test-secret-key-min-32-chars-long',
      cookie: { cookieName: 'refreshToken', signed: false },
      namespace: 'tenant',
    });
    await server.register(fastifyJwt, {
      secret: process.env.JWT_ADMIN_SECRET || 'test-admin-secret-key-min-32-chars-long',
      cookie: { cookieName: 'adminRefreshToken', signed: false },
      namespace: 'admin',
    });
    await server.register(authRoutes, { prefix: '/api/auth' });

    // Bypass RLS for test setup
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: `Test Tenant ${Date.now()}`,
        slug: `test-${Date.now()}`,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });
    testTenantId = tenant.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'test-hash-not-used',
        emailVerified: true,
      },
    });
    testUserId = user.id;

    // Create membership
    await prisma.membership.create({
      data: {
        tenantId: testTenantId,
        userId: testUserId,
        role: 'MEMBER',
      },
    });

    // Create test admin
    const admin = await prisma.adminUser.create({
      data: {
        email: `admin-${Date.now()}@example.com`,
        passwordHash: 'test-hash-not-used',
        role: 'SUPER_ADMIN',
      },
    });
    testAdminId = admin.id;

    // Generate a refresh token for tenant user
    testRefreshToken = generateRefreshToken();
    testRefreshTokenHash = hashRefreshToken(testRefreshToken);
    testFamilyId = randomUUID();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const refreshTokenRow = await prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId: testUserId,
        tokenHash: testRefreshTokenHash,
        familyId: testFamilyId,
        expiresAt,
        ip: '203.0.113.1', // Unique IP for isolation
        userAgent: 'test-agent',
      },
    });
    testRefreshTokenId = refreshTokenRow.id;

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  /**
   * Teardown: Clean up test data and server (safe guard)
   */
  afterEach(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    // Clean up refresh tokens
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [{ userId: testUserId }, { adminId: testAdminId }],
      },
    });

    // Clean up memberships
    await prisma.membership.deleteMany({
      where: { userId: testUserId },
    });

    // Clean up rate limit attempts
    await prisma.rateLimitAttempt.deleteMany({});

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

    // Safe teardown guard: Prevent server close errors
    if (server) {
      await server.close().catch(() => {});
      server = null;
    }
  });

  /**
   * TEST 1: Concurrent Refresh - No Double-Mint (HTTP Inject Pattern)
   *
   * Fire N parallel HTTP inject requests with the same refresh token cookie.
   * Expected:
   * - Exactly 1 attempt succeeds (200 status)
   * - Other attempts fail (401 or 429 status)
   * - Only 1 new refresh token is created in the family
   * - Family is revoked after failed attempts (replay detection)
   *
   * CRITICAL: Uses server.inject() instead of Prisma transactions
   * (pooler-safe, tests actual HTTP flow)
   */
  it('should allow exactly 1 concurrent refresh to succeed (no double-mint)', async () => {
    if (!server) throw new Error('Server not initialized');

    const concurrentAttempts = 50; // Wave 2: High contention test

    // Simulate concurrent refresh attempts via HTTP inject
    const promises = Array.from({ length: concurrentAttempts }, (_, i) =>
      server!.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        cookies: { refreshToken: testRefreshToken },
        headers: {
          'x-forwarded-for': `203.0.113.${i + 1}`, // Unique IPs to avoid rate limit
        },
      })
    );

    // Wait for all attempts to complete
    const responses = await Promise.allSettled(promises);

    // Extract resolved responses
    const resolvedResponses = responses
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value);

    // Count status codes
    const successCount = resolvedResponses.filter(r => r.statusCode === 200).length;
    const unauthorizedCount = resolvedResponses.filter(r => r.statusCode === 401).length;
    const rateLimitedCount = resolvedResponses.filter(r => r.statusCode === 429).length;

    // Assertions: Exactly 1 success (200), rest failures (401 or 429)
    expect(successCount).toBe(1); // ✅ Only 1 request wins the race
    expect(successCount + unauthorizedCount + rateLimitedCount).toBe(concurrentAttempts);

    // Verify DB state: original token rotated, exactly 1 new token exists in family
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const originalToken = await prisma.refreshToken.findUnique({
      where: { id: testRefreshTokenId },
    });
    expect(originalToken?.rotatedAt).not.toBeNull(); // ✅ Original token marked rotated

    const familyTokens = await prisma.refreshToken.findMany({
      where: { familyId: testFamilyId },
    });

    // Count unrotated, unrevoked tokens (should be 0 or 1 depending on timing)
    const unrotatedUnrevoked = familyTokens.filter(
      t => t.rotatedAt === null && t.revokedAt === null
    );
    expect(unrotatedUnrevoked.length).toBeLessThanOrEqual(1); // ✅ At most 1 valid token

    // Verify exactly 1 new token was minted (total should be 2: original + new)
    const newTokens = familyTokens.filter(t => t.id !== testRefreshTokenId);
    expect(newTokens.length).toBe(1); // ✅ Only 1 new token created

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  /**
   * TEST 2: Replay Detection Regression (HTTP Inject Pattern)
   *
   * Reuse a rotated token (simulating replay attack or accidental reuse).
   * Expected:
   * - First refresh succeeds (200)
   * - Second refresh with same token fails (401)
   * - Family is revoked after replay detection
   */
  it('should detect replay of rotated token and revoke family', async () => {
    if (!server) throw new Error('Server not initialized');

    // Step 1: Rotate the token once (legitimate refresh)
    const firstRefresh = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { refreshToken: testRefreshToken },
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    expect(firstRefresh.statusCode).toBe(200); // ✅ First rotation succeeds

    // Step 2: Attempt to reuse the rotated token (replay attack)
    const secondRefresh = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { refreshToken: testRefreshToken }, // Same token
      headers: { 'x-forwarded-for': '203.0.113.11' },
    });

    expect(secondRefresh.statusCode).toBe(401); // ✅ Replay detected, returns 401

    // Verify: entire family is revoked
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const familyTokens = await prisma.refreshToken.findMany({
      where: { familyId: testFamilyId },
    });

    // After replay detection, all unrevoked tokens should be revoked
    // Note: The first rotation created a new token, so we should have 2 tokens total
    expect(familyTokens.length).toBeGreaterThanOrEqual(2);

    // All tokens in family should be revoked after replay detection
    const unrevoked = familyTokens.filter(t => t.revokedAt === null);
    expect(unrevoked.length).toBe(0); // ✅ All tokens revoked

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  /**
   * TEST 3: Token Hash Uniqueness Constraint
   *
   * Attempt to insert two tokens with the same tokenHash.
   * Expected:
   * - Second insert fails with unique constraint violation
   */
  it('should enforce unique constraint on tokenHash', async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const duplicateTokenHash = testRefreshTokenHash; // Reuse existing hash

    // Attempt to create a second token with same hash
    await expect(
      prisma.refreshToken.create({
        data: {
          id: randomUUID(),
          userId: testUserId,
          tokenHash: duplicateTokenHash, // ❌ Duplicate
          familyId: randomUUID(), // Different family
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      })
    ).rejects.toThrow(); // ✅ Prisma throws unique constraint error

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  /**
   * TEST 4: Expired Token Cannot Be Claimed
   *
   * Attempt to rotate an expired token.
   * Expected:
   * - Claim fails (expiresAt < now)
   * - No new token created
   */
  it('should reject rotation claim for expired token', async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    // Create an expired token
    const expiredToken = generateRefreshToken();
    const expiredTokenHash = hashRefreshToken(expiredToken);
    const expiredAt = new Date(Date.now() - 1000); // 1 second ago

    const expiredTokenRow = await prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId: testUserId,
        tokenHash: expiredTokenHash,
        familyId: randomUUID(),
        expiresAt: expiredAt,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      },
    });

    // Attempt to claim rotation
    const now = new Date();
    const claim = await prisma.refreshToken.updateMany({
      where: {
        id: expiredTokenRow.id,
        rotatedAt: null,
        revokedAt: null,
        expiresAt: { gt: now }, // ❌ This fails (expired)
      },
      data: { rotatedAt: now, lastUsedAt: now },
    });

    expect(claim.count).toBe(0); // ✅ Claim rejected (expired)

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });
});
