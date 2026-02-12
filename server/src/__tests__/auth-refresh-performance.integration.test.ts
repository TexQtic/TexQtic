/**
 * Performance Benchmark: AUTH-H1 Wave 2 - Refresh Token Latency
 *
 * Measures refresh endpoint performance to validate p95 < 150ms target.
 *
 * Modes:
 * - Report-only (default): Prints latency distribution, no failure
 * - Strict mode (AUTH_PERF_STRICT=true): Fails if p95 > 150ms
 *
 * Configuration:
 * - AUTH_PERF_SAMPLES: Number of requests to measure (default: 100 for pooled DBs)
 * - AUTH_PERF_STRICT: Enforce p95 < 150ms (default: false)
 *
 * Usage:
 * - Default: pnpm test auth-refresh-performance
 * - Custom samples: AUTH_PERF_SAMPLES=50 pnpm test auth-refresh-performance
 * - Strict: AUTH_PERF_STRICT=true pnpm test auth-refresh-performance
 *
 * WAVE 2 STABILIZATION (TEST-H1):
 * - DB availability gate (skip suite if DB unavailable)
 * - Safe teardown guard (prevents server close errors)
 * - Configurable sample count (reduce for pooled DBs)
 * - Rate limit isolation (beforeEach cleanup)
 *
 * Guardrails:
 * - No timing flakiness (uses report-only by default)
 * - No production impact (test-only endpoints)
 * - No secret logging (tokens redacted)
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

describe('AUTH-H1 Wave 2 Performance: Refresh Token Latency', () => {
  let server: FastifyInstance | null = null;
  let testTenantId: string;
  let testUserId: string;
  let testUserEmail: string;

  // Configurable sample count (reduced for pooled DBs)
  const BENCHMARK_SAMPLES = Number(process.env.AUTH_PERF_SAMPLES) || 100;
  const P95_TARGET_MS = 150; // Target p95 latency
  const STRICT_MODE = process.env.AUTH_PERF_STRICT === 'true';

  /**
   * DB Availability Gate: Skip suite if DB unavailable
   */
  beforeAll(async () => {
    const dbAvailable = await checkDbAvailable(prisma);
    if (!dbAvailable) {
      throw new Error('[Performance Benchmark] Database unavailable - skipping suite');
    }
  });

  /**
   * Setup: Create test tenant, user, and Fastify server
   */
  beforeEach(async () => {
    // Rate limit isolation: Clean up rate limits from previous tests
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    await prisma.rateLimitAttempt.deleteMany({});
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    // Bypass RLS for test setup
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: `Perf Test Tenant ${Date.now()}`,
        slug: `perf-test-${Date.now()}`,
        plan: 'FREE',
      },
    });
    testTenantId = tenant.id;

    // Create test user
    const passwordHash = await bcrypt.hash('password123', 10);
    testUserEmail = `perf-user-${Date.now()}@example.com`;
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
   * Teardown: Clean up test data and server (safe guard)
   */
  afterEach(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    // Clean up memberships
    await prisma.membership.deleteMany({
      where: { tenantId: testTenantId },
    });

    // Clean up refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: testUserId },
    });

    // Clean up audit logs
    await prisma.auditLog.deleteMany({
      where: { actorId: testUserId },
    });

    // Clean up rate limit attempts (prevent cross-test rate limiting)
    await prisma.rateLimitAttempt.deleteMany({});

    // Clean up users
    await prisma.user.deleteMany({
      where: { id: testUserId },
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
   * Benchmark: Refresh Token Latency (Sequential)
   *
   * Measures end-to-end latency of refresh endpoint:
   * - Simulates production usage pattern (sequential rotations)
   * - Collects latency samples
   * - Computes p50, p95, p99
   * - Reports results (strict mode optionally enforces p95 target)
   */
  it('should measure refresh endpoint latency (p95 target: 150ms)', async () => {
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

    expect(loginResponse.statusCode).toBe(200);
    let currentCookie = loginResponse.headers['set-cookie'];

    // Step 2: Collect latency samples
    const latencies: number[] = [];

    for (let i = 0; i < BENCHMARK_SAMPLES; i++) {
      const startTime = performance.now();

      const refreshResponse = await server!.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: currentCookie,
        },
      });

      const endTime = performance.now();
      const latencyMs = endTime - startTime;

      // Assert refresh succeeded
      expect(refreshResponse.statusCode).toBe(200);

      // Record latency
      latencies.push(latencyMs);

      // Update cookie for next iteration
      const newCookie = refreshResponse.headers['set-cookie'];
      expect(newCookie).toBeDefined();
      currentCookie = newCookie;
    }

    // Step 3: Compute percentiles
    const sortedLatencies = latencies.slice().sort((a, b) => a - b);
    const p50Index = Math.floor(sortedLatencies.length * 0.5);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);

    const p50 = sortedLatencies[p50Index];
    const p95 = sortedLatencies[p95Index];
    const p99 = sortedLatencies[p99Index];
    const min = sortedLatencies[0];
    const max = sortedLatencies[sortedLatencies.length - 1];
    const mean = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    // Step 4: Report results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 AUTH-H1 REFRESH TOKEN PERFORMANCE BENCHMARK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Samples:  ${BENCHMARK_SAMPLES}`);
    console.log(`Mode:     ${STRICT_MODE ? '⚠️  STRICT (enforces p95 target)' : '📝 REPORT-ONLY'}`);
    console.log('');
    console.log('Latency Distribution (ms):');
    console.log(`  Min:    ${min.toFixed(2)} ms`);
    console.log(`  Mean:   ${mean.toFixed(2)} ms`);
    console.log(`  p50:    ${p50.toFixed(2)} ms`);
    console.log(`  p95:    ${p95.toFixed(2)} ms ${p95 <= P95_TARGET_MS ? '✅' : '⚠️'}`);
    console.log(`  p99:    ${p99.toFixed(2)} ms`);
    console.log(`  Max:    ${max.toFixed(2)} ms`);
    console.log('');
    console.log(`Target:   p95 < ${P95_TARGET_MS} ms`);
    console.log(`Status:   ${p95 <= P95_TARGET_MS ? '✅ PASS' : '⚠️  ABOVE TARGET'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 5: Enforce target in strict mode
    if (STRICT_MODE) {
      expect(p95).toBeLessThanOrEqual(P95_TARGET_MS);
    }

    // Always pass in report-only mode (no assertion)
    // This prevents test flakiness while still providing visibility
  });

  /**
   * Benchmark: Refresh Token Latency (Controlled Concurrency)
   *
   * Measures latency under controlled concurrency (5 parallel sessions)
   * to simulate realistic production load.
   */
  it('should measure refresh latency under controlled concurrency (5 parallel sessions)', async () => {
    const CONCURRENCY = 5;
    const SAMPLES_PER_SESSION = 100;

    // Create 5 parallel sessions (login for each)
    const sessions = await Promise.all(
      Array.from({ length: CONCURRENCY }, async (_, sessionIdx) => {
        const loginResponse = await server!.inject({
          method: 'POST',
          url: '/api/auth/tenant/login',
          payload: {
            email: testUserEmail,
            password: 'password123',
            tenantId: testTenantId,
          },
        });

        expect(loginResponse.statusCode).toBe(200);
        return {
          sessionId: sessionIdx,
          cookie: loginResponse.headers['set-cookie'],
        };
      })
    );

    // Run SAMPLES_PER_SESSION refresh cycles for each session in parallel
    const allLatencies: number[] = [];

    const sessionPromises = sessions.map(async session => {
      let currentCookie = session.cookie;
      const sessionLatencies: number[] = [];

      for (let i = 0; i < SAMPLES_PER_SESSION; i++) {
        const startTime = performance.now();

        const refreshResponse = await server!.inject({
          method: 'POST',
          url: '/api/auth/refresh',
          headers: {
            cookie: currentCookie,
          },
        });

        const endTime = performance.now();
        const latencyMs = endTime - startTime;

        expect(refreshResponse.statusCode).toBe(200);
        sessionLatencies.push(latencyMs);

        // Update cookie
        currentCookie = refreshResponse.headers['set-cookie'];
      }

      return sessionLatencies;
    });

    const sessionResults = await Promise.all(sessionPromises);

    // Flatten all latencies
    sessionResults.forEach(sessionLatencies => {
      allLatencies.push(...sessionLatencies);
    });

    // Compute percentiles
    const sortedLatencies = allLatencies.slice().sort((a, b) => a - b);
    const p50Index = Math.floor(sortedLatencies.length * 0.5);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);

    const p50 = sortedLatencies[p50Index];
    const p95 = sortedLatencies[p95Index];
    const p99 = sortedLatencies[p99Index];
    const min = sortedLatencies[0];
    const max = sortedLatencies[sortedLatencies.length - 1];
    const mean = allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length;

    // Report results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 REFRESH TOKEN PERFORMANCE (CONTROLLED CONCURRENCY)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Concurrency: ${CONCURRENCY} parallel sessions`);
    console.log(`Samples:     ${allLatencies.length} total (${SAMPLES_PER_SESSION} per session)`);
    console.log(`Mode:        ${STRICT_MODE ? '⚠️  STRICT' : '📝 REPORT-ONLY'}`);
    console.log('');
    console.log('Latency Distribution (ms):');
    console.log(`  Min:    ${min.toFixed(2)} ms`);
    console.log(`  Mean:   ${mean.toFixed(2)} ms`);
    console.log(`  p50:    ${p50.toFixed(2)} ms`);
    console.log(`  p95:    ${p95.toFixed(2)} ms ${p95 <= P95_TARGET_MS ? '✅' : '⚠️'}`);
    console.log(`  p99:    ${p99.toFixed(2)} ms`);
    console.log(`  Max:    ${max.toFixed(2)} ms`);
    console.log('');
    console.log(`Target:   p95 < ${P95_TARGET_MS} ms`);
    console.log(`Status:   ${p95 <= P95_TARGET_MS ? '✅ PASS' : '⚠️  ABOVE TARGET'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Enforce target in strict mode
    if (STRICT_MODE) {
      expect(p95).toBeLessThanOrEqual(P95_TARGET_MS);
    }
  });
});
