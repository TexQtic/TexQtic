import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import controlRoutes from '../routes/control.js';
import tenantRoutes from '../routes/tenant.js';
import { prisma } from '../db/prisma.js';

/**
 * GATE E.2 — CROSS-REALM ISOLATION INTEGRITY TESTS
 *
 * Purpose: Verify that Tenant JWTs cannot access Admin endpoints, and Admin JWTs cannot access Tenant endpoints.
 *
 * Scope:
 * - Realm boundaries: control (admin), tenant (tenant + me/cart/catalog)
 * - JWT claim validation: tenantId vs adminId
 * - Middleware enforcement: tenantAuthMiddleware vs adminAuthMiddleware
 * - Expected responses: 401 UNAUTHORIZED, 403 FORBIDDEN (WRONG_REALM)
 *
 * Governance:
 * - server/src/middleware/tenantAuth.ts: enforces tenantId + userId claims
 * - server/src/middleware/adminAuth.ts: enforces adminId + role claims
 * - server/src/routes/control.ts: requires adminAuth
 * - server/src/routes/tenant.ts, me.ts, cart.ts, catalog.ts: require tenantAuth
 *
 * Test Coverage:
 * 1. TEST 1: Tenant JWT cannot access /api/control/* (admin endpoints) → 401/403
 * 2. TEST 2: Admin JWT cannot access /api/me (tenant endpoints) → 401/403
 * 3. TEST 3: Tenant JWT CAN access /api/me (tenant endpoints) → 200 OK
 * 4. TEST 4: Admin JWT CAN access /api/control/* (admin endpoints) → 200 OK
 * 5. TEST 5: No JWT rejected on protected endpoints → 401
 * 6. TEST 6: Public endpoints accessible → 200 OK
 *
 * Decision:
 * For realm mismatches, we expect:
 * - 401 UNAUTHORIZED (if JWT is rejected before realm check)
 * - 403 FORBIDDEN with error.code = "WRONG_REALM" (if JWT is valid but wrong realm)
 *
 * This test verifies the middleware correctly rejects cross-realm attempts.
 */

describe('Gate E.2 — Cross-Realm Isolation', () => {
  let server: FastifyInstance;

  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-min-32-chars-long';
  const JWT_ADMIN_SECRET =
    process.env.JWT_ADMIN_SECRET || 'test-admin-secret-key-min-32-chars-long';

  // Test tenant data
  let tenantId: string;
  let userId: string;

  // Test admin data
  let adminId: string;

  beforeEach(async () => {
    // Step 1: Create test tenant, user, and admin with bypass
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const tenant = await prisma.tenant.create({
      data: {
        id: randomUUID(),
        name: `Gate E.2 Test ${Date.now()}`,
        slug: `gate-e2-${Date.now()}`,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `test-${Date.now()}@gate-e2.local`,
        passwordHash: await bcrypt.hash('test-password', 10),
        emailVerified: true,
      },
    });
    userId = user.id;

    await prisma.membership.create({
      data: {
        tenantId,
        userId,
        role: 'MEMBER',
      },
    });

    const admin = await prisma.adminUser.create({
      data: {
        id: randomUUID(),
        email: `admin-${Date.now()}@gate-e2.local`,
        passwordHash: await bcrypt.hash('admin-password', 10),
        role: 'SUPER_ADMIN',
      },
    });
    adminId = admin.id;

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    // Step 2: Create Fastify server with JWT and routes
    server = Fastify({ logger: false });

    await server.register(fastifyCookie);
    await server.register(fastifyJwt, {
      secret: JWT_SECRET,
      namespace: 'tenant',
      jwtVerify: 'tenantJwtVerify',
      jwtSign: 'tenantJwtSign',
      cookie: { cookieName: 'refreshToken', signed: false },
    });
    await server.register(fastifyJwt, {
      secret: process.env.JWT_ADMIN_SECRET || 'test-admin-secret-key-min-32-chars-long',
      namespace: 'admin',
      jwtVerify: 'adminJwtVerify',
      jwtSign: 'adminJwtSign',
      cookie: { cookieName: 'adminRefreshToken', signed: false },
    });

    await server.register(controlRoutes, { prefix: '/api/control' });
    await server.register(tenantRoutes, { prefix: '/api' });

    await server.register(async fastify => {
      fastify.get('/health', async () => ({ status: 'ok' }));
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();

    // Cleanup with bypass
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    await prisma.membership.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.adminUser.deleteMany({ where: { id: adminId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  /**
   * TEST 1: Tenant JWT cannot access /api/control/* (admin endpoints)
   * Expected: 401 UNAUTHORIZED or 403 FORBIDDEN (WRONG_REALM)
   */
  it('should reject tenant JWT on admin endpoints (401/403)', async () => {
    const tenantToken = jwt.sign({ userId, tenantId, type: 'access' }, JWT_SECRET, {
      expiresIn: '15m',
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/control/tenants',
      headers: {
        authorization: `Bearer ${tenantToken}`,
      },
    });

    expect([401, 403]).toContain(response.statusCode);

    if (response.statusCode === 403) {
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('WRONG_REALM');
    }
  });

  /**
   * TEST 2: Admin JWT cannot access /api/me (tenant endpoints)
   * Expected: 401 UNAUTHORIZED or 403 FORBIDDEN (WRONG_REALM)
   * NOTE: May be 401 because tenantAuthMiddleware runs first and sees no tenantId
   */
  it('should reject admin JWT on tenant endpoints (401/403)', async () => {
    const adminToken = jwt.sign(
      { adminId, role: 'super_admin', type: 'access' },
      JWT_ADMIN_SECRET,
      {
        expiresIn: '15m',
      }
    );

    const response = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect([401, 403]).toContain(response.statusCode);

    if (response.statusCode === 403) {
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('WRONG_REALM');
    }
  });

  /**
   * TEST 3: Tenant JWT CAN access /api/me (tenant endpoints)
   * Expected: 200 OK
   * Decision: This verifies tenant JWT works in tenant realm (positive case).
   */
  it('should allow tenant JWT on tenant endpoints (200 OK)', async () => {
    const tenantToken = jwt.sign({ userId, tenantId, type: 'access' }, JWT_SECRET, {
      expiresIn: '15m',
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: {
        authorization: `Bearer ${tenantToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  /**
   * TEST 4: Admin JWT CAN access /api/control/* (admin endpoints)
   * Expected: 200 OK
   * Decision: This verifies admin JWT works in admin realm (positive case).
   * Uses /system/health (minimal DB deps, deterministic)
   */
  it('should allow admin JWT on admin endpoints (200 OK)', async () => {
    const adminToken = jwt.sign(
      { adminId, role: 'super_admin', type: 'access' },
      JWT_ADMIN_SECRET,
      {
        expiresIn: '15m',
      }
    );

    const response = await server.inject({
      method: 'GET',
      url: '/api/control/system/health',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.overall).toMatch(/HEALTHY|DEGRADED/);
  });

  /**
   * TEST 5: No JWT rejected on protected endpoints
   * Expected: 401 UNAUTHORIZED
   */
  it('should reject requests with no JWT on protected endpoints (401)', async () => {
    const tenantResponse = await server.inject({
      method: 'GET',
      url: '/api/me',
    });

    expect(tenantResponse.statusCode).toBe(401);

    const adminResponse = await server.inject({
      method: 'GET',
      url: '/api/control/system/health',
    });

    expect(adminResponse.statusCode).toBe(401);
  });

  /**
   * TEST 6: Public endpoints accessible without JWT
   * Expected: 200 OK
   */
  it('should allow public endpoints without JWT (200 OK)', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });
});

/**
 * Decision Log:
 * - Realm mismatch rejection can be 401 (middleware rejects JWT before realm check)
 *   or 403 with WRONG_REALM (JWT valid but wrong realm).
 * - Both are acceptable; middleware decides based on execution order.
 * - Positive cases (TEST 3, TEST 4) confirm correct-realm access works.
 */
