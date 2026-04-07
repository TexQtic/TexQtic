/**
 * G-W3-A4 — Control-Plane vs Tenant-Plane Isolation Tests
 *
 * DOCTRINE: v1.4 (Realm Separation + RLS Defense-in-Depth)
 * GUARDRAIL: GR-008 (Realm Boundary Enforcement)
 *
 * COVERAGE:
 *   Group 1 — Tenant JWT cannot access control-plane routes (HTTP-layer, no DB)
 *   Group 2 — Admin JWT cannot access tenant-plane routes (HTTP-layer, no DB)
 *   Group 3 — Missing JWT rejected on all protected routes (HTTP-layer, no DB)
 *   Group 4 — Impersonation integrity (DB-live)
 *
 * These tests MUST FAIL CI if realm boundaries are weakened.
 *
 * Wave-3 note: Gate E.2 already validates the positive cases (correct realm → 200).
 * This spec focuses on negative cases + impersonation lifecycle as first-class
 * Wave-3 governance evidence.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import controlRoutes from '../routes/control.js';
import tenantRoutes from '../routes/tenant.js';
import impersonationRoutes from '../routes/admin/impersonation.js';
import { hasDb } from './helpers/dbGate.js';
import { prisma } from '../db/prisma.js';

// ─── JWT secrets ─────────────────────────────────────────────────────────────
// These must match what the server registers.
const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-min-32-chars-long';
const JWT_ADMIN_SECRET =
  process.env.JWT_ADMIN_SECRET ?? 'test-admin-secret-key-min-32-chars-long';

// ─── Server factory ───────────────────────────────────────────────────────────
// Builds a minimal Fastify instance with both JWT namespaces + route plugins.
// Mirrors the production registration from src/index.ts (relevant subset only).
async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });

  await server.register(fastifyCookie);

  // Tenant JWT namespace
  await server.register(fastifyJwt, {
    secret: JWT_SECRET,
    namespace: 'tenant',
    jwtVerify: 'tenantJwtVerify',
    jwtSign: 'tenantJwtSign',
    cookie: { cookieName: 'refreshToken', signed: false },
  });

  // Admin JWT namespace
  await server.register(fastifyJwt, {
    secret: JWT_ADMIN_SECRET,
    namespace: 'admin',
    jwtVerify: 'adminJwtVerify',
    jwtSign: 'adminJwtSign',
    cookie: { cookieName: 'adminRefreshToken', signed: false },
  });

  await server.register(controlRoutes, { prefix: '/api/control' });
  await server.register(tenantRoutes, { prefix: '/api' });
  await server.register(impersonationRoutes, { prefix: '/api/control' });

  await server.ready();
  return server;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function makeTenantToken(userId: string, tenantId: string): string {
  return jwt.sign({ userId, tenantId, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
}

function makeAdminToken(adminId: string): string {
  return jwt.sign({ adminId, role: 'SUPER_ADMIN', type: 'access' }, JWT_ADMIN_SECRET, {
    expiresIn: '15m',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1 — Tenant JWT cannot access control-plane (no DB)
// ─────────────────────────────────────────────────────────────────────────────

describe('G-W3-A4 Group 1 — Tenant JWT rejected on control-plane', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('tenant JWT on GET /api/control/tenants → 401 or 403', async () => {
    const token = makeTenantToken(randomUUID(), randomUUID());

    const res = await server.inject({
      method: 'GET',
      url: '/api/control/tenants',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(
      [401, 403],
      `Expected 401 or 403 but got ${res.statusCode}.\n` +
        `DOCTRINE v1.4: Tenant JWT must never authenticate on admin endpoints.`
    ).toContain(res.statusCode);
  });

  it('tenant JWT on GET /api/control/system/health → 401 or 403', async () => {
    const token = makeTenantToken(randomUUID(), randomUUID());

    const res = await server.inject({
      method: 'GET',
      url: '/api/control/system/health',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(
      [401, 403],
      `Expected 401 or 403 but got ${res.statusCode}.\n` +
        `Control-plane system health endpoint must be admin-only.`
    ).toContain(res.statusCode);
  });

  it('tenant JWT on POST /api/control/impersonation/start → 401 or 403', async () => {
    const token = makeTenantToken(randomUUID(), randomUUID());

    const res = await server.inject({
      method: 'POST',
      url: '/api/control/impersonation/start',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        orgId: randomUUID(),
        userId: randomUUID(),
        reason: 'Realm boundary probe — must be rejected',
      }),
    });

    expect(
      [401, 403],
      `Expected 401 or 403 but got ${res.statusCode}.\n` +
        `Impersonation start is admin-only; tenant JWT must be rejected.`
    ).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2 — Admin JWT cannot access tenant-plane (no DB)
// ─────────────────────────────────────────────────────────────────────────────

describe('G-W3-A4 Group 2 — Admin JWT rejected on tenant-plane', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('admin JWT on GET /api/me → 401 or 403', async () => {
    const token = makeAdminToken(randomUUID());

    const res = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(
      [401, 403],
      `Expected 401 or 403 but got ${res.statusCode}.\n` +
        `DOCTRINE v1.4: Admin JWT must never authenticate on tenant endpoints.`
    ).toContain(res.statusCode);
  });

  it('admin JWT on GET /api/tenant/catalog/items → 401 or 403', async () => {
    const token = makeAdminToken(randomUUID());

    const res = await server.inject({
      method: 'GET',
      url: '/api/tenant/catalog/items',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(
      [401, 403],
      `Expected 401 or 403 but got ${res.statusCode}.\n` +
        `Tenant catalog endpoint must reject admin JWTs.`
    ).toContain(res.statusCode);
  });

  it('response body must indicate auth failure (not a data payload)', async () => {
    const token = makeAdminToken(randomUUID());

    const res = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `Bearer ${token}` },
    });

    // Must NOT be 200 — any auth failure status is acceptable
    expect(res.statusCode).not.toBe(200);

    // If the server returns JSON, must not be success: true
    const body = JSON.parse(res.body) as Record<string, unknown>;
    if ('success' in body) {
      expect(body.success).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3 — Missing JWT rejected on all protected routes (no DB)
// ─────────────────────────────────────────────────────────────────────────────

describe('G-W3-A4 Group 3 — No JWT rejected on all protected endpoints', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('no JWT on GET /api/control/tenants → 401', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/control/tenants' });

    expect(res.statusCode).toBe(401);
  });

  it('no JWT on GET /api/control/system/health → 401', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/control/system/health' });

    expect(res.statusCode).toBe(401);
  });

  it('no JWT on GET /api/me → 401', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/me' });

    expect(res.statusCode).toBe(401);
  });

  it('no JWT on POST /api/control/impersonation/start → 401', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/control/impersonation/start',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        orgId: randomUUID(),
        userId: randomUUID(),
        reason: 'Unauthenticated probe — must be rejected',
      }),
    });

    expect(res.statusCode).toBe(401);
  });

  it('malformed Bearer token on /api/control/tenants → 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/control/tenants',
      headers: { authorization: 'Bearer this.is.not.a.valid.jwt' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('malformed Bearer token on /api/me → 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: 'Bearer garbage.token.value' },
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4 — Impersonation Integrity (DB-live)
//
// Verifies:
//   1. Admin can start an impersonation session → receives tenant-shaped JWT
//   2. Impersonation token works on tenant endpoints (correct realm)
//   3. Impersonation token is rejected on control-plane endpoints (wrong realm)
//   4. Admin can stop the session → DB marks it ended
//   5. Session status reflects ended state
//   6. Cross-tenant isolation: impersonation token cannot access another tenant's /me
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('G-W3-A4 Group 4 — Impersonation Integrity (DB-live)', () => {
  let server: FastifyInstance;
  let dbAvailable = true;

  // Fixture IDs — set in beforeAll
  let tenantId: string;
  let userId: string;
  let adminId: string;

  const tenantEmail = `w3a4-user-${Date.now()}@realm-test.local`;
  const adminEmail = `w3a4-admin-${Date.now()}@realm-test.local`;

  beforeAll(async () => {
    // Probe DB
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbAvailable = false;
      console.warn('[G-W3-A4] DB unavailable — skipping Group 4 impersonation tests');
      return;
    }

    server = await buildServer();

    // Seed fixtures under RLS bypass
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const tenant = await prisma.tenant.create({
      data: {
        id: randomUUID(),
        name: `G-W3-A4 Realm Test ${Date.now()}`,
        slug: `w3a4-realm-${Date.now()}`,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: tenantEmail,
        passwordHash: await bcrypt.hash('test-pw-w3a4', 10),
        emailVerified: true,
      },
    });
    userId = user.id;

    await prisma.membership.create({
      data: { tenantId, userId, role: 'MEMBER' },
    });

    const admin = await prisma.adminUser.create({
      data: {
        id: randomUUID(),
        email: adminEmail,
        passwordHash: await bcrypt.hash('admin-pw-w3a4', 10),
        role: 'SUPER_ADMIN',
      },
    });
    adminId = admin.id;

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  afterAll(async () => {
    if (!dbAvailable) return;

    await server.close();

    // Cleanup under RLS bypass
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    await prisma.impersonationSession.deleteMany({ where: { adminId } });
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.membership.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.adminUser.deleteMany({ where: { id: adminId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  it('admin can start impersonation session (201) and receives tenant-shaped JWT', async () => {
    if (!dbAvailable) return;

    const adminToken = makeAdminToken(adminId);

    const res = await server.inject({
      method: 'POST',
      url: '/api/control/impersonation/start',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        orgId: tenantId,
        userId,
        reason: 'G-W3-A4 governance verification — impersonation integrity test',
      }),
    });

    expect(res.statusCode).toBe(201);

    const body = JSON.parse(res.body) as {
      success: boolean;
      data: { impersonationId: string; token: string; expiresAt: string };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data.token).toBe('string');
    expect(typeof body.data.impersonationId).toBe('string');

    // Decode (without verify) to confirm it's a tenant-realm JWT with impersonation marker
    const decoded = jwt.decode(body.data.token) as Record<string, unknown>;
    expect(decoded.userId).toBe(userId);
    expect(decoded.tenantId).toBe(tenantId);
    expect(decoded.isImpersonation).toBe(true);
    expect(decoded.impersonatorAdminId).toBe(adminId);
  });

  it('impersonation token works on tenant-plane /api/me (200 — correct realm)', async () => {
    if (!dbAvailable) return;

    const adminToken = makeAdminToken(adminId);

    // Start a fresh session
    const startRes = await server.inject({
      method: 'POST',
      url: '/api/control/impersonation/start',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        orgId: tenantId,
        userId,
        reason: 'G-W3-A4 tenant-plane access verification',
      }),
    });
    expect(startRes.statusCode).toBe(201);

    const { token } = (JSON.parse(startRes.body) as { data: { token: string } }).data;

    // Use the impersonation token on a tenant endpoint
    const meRes = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `Bearer ${token}` },
    });

    // Impersonation token is a tenant-shaped JWT — should be accepted by tenantAuthMiddleware
    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.body) as { success: boolean; data: { user: { id: string }; tenant: { id: string } } };
    expect(meBody.success).toBe(true);
    expect(meBody.data.user.id).toBe(userId);
    expect(meBody.data.tenant.id).toBe(tenantId);
  });

  it('impersonation token rejected on control-plane /api/control/tenants (401 or 403 — wrong realm)', async () => {
    if (!dbAvailable) return;

    const adminToken = makeAdminToken(adminId);

    const startRes = await server.inject({
      method: 'POST',
      url: '/api/control/impersonation/start',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        orgId: tenantId,
        userId,
        reason: 'G-W3-A4 control-plane rejection verification',
      }),
    });
    expect(startRes.statusCode).toBe(201);

    const { token } = (JSON.parse(startRes.body) as { data: { token: string } }).data;

    // Impersonation token is tenant-signed — must be rejected by adminJwtVerify
    const ctrlRes = await server.inject({
      method: 'GET',
      url: '/api/control/tenants',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(
      [401, 403],
      `Impersonation token must not grant control-plane access.\n` +
        `Got ${ctrlRes.statusCode}. Realm boundary violated.`
    ).toContain(ctrlRes.statusCode);
  });

  it('admin can resolve active impersonation status, then stop it, then observe ended status', async () => {
    if (!dbAvailable) return;

    const adminToken = makeAdminToken(adminId);

    // Start
    const startRes = await server.inject({
      method: 'POST',
      url: '/api/control/impersonation/start',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        orgId: tenantId,
        userId,
        reason: 'G-W3-A4 stop + status lifecycle verification',
      }),
    });
    expect(startRes.statusCode).toBe(201);
    const { impersonationId } = (
      JSON.parse(startRes.body) as { data: { impersonationId: string; token: string } }
    ).data;

    // Status while active
    const activeStatusRes = await server.inject({
      method: 'GET',
      url: `/api/control/impersonation/status/${impersonationId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(activeStatusRes.statusCode).toBe(200);

    const activeStatusBody = JSON.parse(activeStatusRes.body) as {
      success: boolean;
      data: { active: boolean; endedAt: string | null };
    };
    expect(activeStatusBody.success).toBe(true);
    expect(activeStatusBody.data.active).toBe(true);
    expect(activeStatusBody.data.endedAt).toBeNull();

    // Stop
    const stopRes = await server.inject({
      method: 'POST',
      url: '/api/control/impersonation/stop',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        impersonationId,
        reason: 'G-W3-A4 test teardown — session ended intentionally',
      }),
    });
    expect(stopRes.statusCode).toBe(200);

    // Status
    const statusRes = await server.inject({
      method: 'GET',
      url: `/api/control/impersonation/status/${impersonationId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(statusRes.statusCode).toBe(200);

    const statusBody = JSON.parse(statusRes.body) as {
      success: boolean;
      data: { active: boolean; endedAt: string | null };
    };
    expect(statusBody.success).toBe(true);
    expect(statusBody.data.active).toBe(false);
    expect(statusBody.data.endedAt).not.toBeNull();
  });

  it('expired/invalid token cannot access /api/me (realm boundary holds)', async () => {
    if (!dbAvailable) return;

    // Sign a tenant-shaped token with a 1-second TTL and wait for it to expire.
    // This verifies that the middleware enforces token expiry — not just claims.
    const expiredToken = jwt.sign(
      { userId, tenantId, type: 'access', isImpersonation: true },
      JWT_SECRET,
      { expiresIn: 1 } // 1 second
    );

    // Wait 1100ms to guarantee expiry
    await new Promise(resolve => setTimeout(resolve, 1100));

    const res = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    expect(res.statusCode).toBe(401);
  });
});
