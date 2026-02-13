/**
 * Integration Test: Gate C.2 — Pilot Route RLS Contract Tests
 *
 * Validates route-level RLS enforcement for GET /api/tenant/catalog/items.
 * Extends Gate C.1 from DB-level smoke to HTTP-level verification.
 *
 * OBJECTIVES:
 * - Verify tenant isolation at HTTP layer (not just DB layer)
 * - Confirm req.dbContext + withDbContext enforce RLS policies
 * - Prove fail-closed behavior (missing token → 401)
 * - Deterministic execution (no flakes, explicit ordering, 3/3 passes)
 *
 * ALLOWED SCOPE (Safe-Write Mode):
 * - Test file only (no production routes modified)
 * - Uses existing test helpers (seedRls, cleanupRls, rlsContext)
 * - HTTP-level assertions with real JWT tokens
 *
 * DOCTRINE COMPLIANCE:
 * - Tag-based cleanup by testRunId only
 * - No Promise.all for core assertions (sequential execution)
 * - Explicit orderBy for deterministic results
 * - Uses withBypassForSeed ONLY (NODE_ENV=test enforced)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';
import { withBypassForSeed } from '../lib/database-context.js';
import { cleanupCatalogItemsByTag, verifyCleanupComplete } from './helpers/cleanupRls.js';
import { seedTenantForTest, seedCatalogItemsForOrg } from './helpers/seedRls.js';
import tenantRoutes from '../routes/tenant.js';
import { databaseContextMiddleware } from '../middleware/database-context.middleware.js';

describe('Gate C.2 — Pilot Route RLS Contract Tests', () => {
  let server: FastifyInstance | null = null;
  let testRunId: string;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let tokenA: string;
  let tokenB: string;

  /**
   * Setup: Create test orgs, users, catalog items, and Fastify server with auth
   */
  beforeEach(async () => {
    // Generate unique test run identifier for tag-based cleanup
    testRunId = randomUUID();

    // Create unique org IDs
    orgAId = randomUUID();
    orgBId = randomUUID();

    // Step 1: Seed tenants using bypass
    await seedTenantForTest(orgAId, testRunId);
    await seedTenantForTest(orgBId, testRunId);

    // Step 2: Create users and memberships using bypass
    await withBypassForSeed(prisma, async tx => {
      const passwordHash = await bcrypt.hash('test-password', 10);

      // Create User A (belongs to Org A)
      const userA = await tx.user.create({
        data: {
          id: randomUUID(),
          email: `user-a-${testRunId}@test.local`,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      userAId = userA.id;

      // Create membership for User A → Org A
      await tx.membership.create({
        data: {
          tenantId: orgAId,
          userId: userAId,
          role: 'OWNER',
        },
      });

      // Create User B (belongs to Org B)
      const userB = await tx.user.create({
        data: {
          id: randomUUID(),
          email: `user-b-${testRunId}@test.local`,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      userBId = userB.id;

      // Create membership for User B → Org B
      await tx.membership.create({
        data: {
          tenantId: orgBId,
          userId: userBId,
          role: 'OWNER',
        },
      });
    });

    // Step 3: Seed catalog items (2 for Org A, 3 for Org B)
    await seedCatalogItemsForOrg(orgAId, testRunId, 2);
    await seedCatalogItemsForOrg(orgBId, testRunId, 3);

    // Step 4: Create Fastify server with JWT and routes
    server = Fastify({ logger: false });
    await server.register(fastifyCookie, { secret: 'test-secret' });

    // Register JWT plugin for tenant realm
    await server.register(fastifyJwt, {
      secret: config.JWT_ACCESS_SECRET,
      namespace: 'tenant',
      jwtVerify: 'tenantJwtVerify',
      jwtSign: 'tenantJwtSign',
    });

    // Register tenant routes with auth + database context middleware chain
    await server.register(async fastify => {
      // CRITICAL: Middleware execution order
      // 1. Decode JWT, populate request.userId/tenantId (tenantAuthMiddleware)
      // 2. Build context from authenticated claims (databaseContextMiddleware)
      
      // Step 1: Decode JWT and verify authentication
      fastify.addHook('onRequest', async (request, reply) => {
        try {
          await request.tenantJwtVerify({ onlyCookie: false });
          const payload = request.user as any;
          
          if (!payload.userId || !payload.tenantId) {
            return reply.code(401).send({ success: false, error: 'Invalid token payload' });
          }
          
          request.userId = payload.userId;
          request.tenantId = payload.tenantId;
        } catch {
          return reply.code(401).send({ success: false, error: 'Invalid or expired token' });
        }
      });
      
      // Step 2: Build database context from authenticated request
      fastify.addHook('onRequest', databaseContextMiddleware);
      
      await fastify.register(tenantRoutes, { prefix: '/api' });
    });

    await server.ready();

    // Step 5: Generate JWT tokens for User A and User B
    // Use jsonwebtoken directly for test token generation
    tokenA = jwt.sign({ userId: userAId, tenantId: orgAId }, config.JWT_ACCESS_SECRET, {
      expiresIn: '1h',
    });
    tokenB = jwt.sign({ userId: userBId, tenantId: orgBId }, config.JWT_ACCESS_SECRET, {
      expiresIn: '1h',
    });
  }, 30000);

  /**
   * Teardown: Clean up test data and server
   */
  afterEach(async () => {
    // Step 1: Close server FIRST to release all pending connections/transactions
    if (server) {
      await server.close().catch(() => {});
      server = null;
    }
    
    // Step 2: Tag-based cleanup (removes catalog items by testRunId)
    await cleanupCatalogItemsByTag(testRunId);

    // Verify cleanup succeeded
    const isClean = await verifyCleanupComplete(testRunId);
    expect(isClean).toBe(true);

    // Step 3: Clean up tenants, users, and memberships using bypass
    await withBypassForSeed(prisma, async tx => {
      // Delete memberships
      await tx.membership.deleteMany({
        where: {
          OR: [{ tenantId: orgAId }, { tenantId: orgBId }],
        },
      });

      // Delete users
      await tx.user.deleteMany({
        where: {
          id: { in: [userAId, userBId] },
        },
      });

      // Delete tenants (tag contains testRunId)
      await tx.tenant.deleteMany({
        where: {
          name: { contains: testRunId },
        },
      });
    });
  });

  /**
   * TEST 1: Org A token returns ONLY Org A items
   *
   * Verifies:
   * - HTTP layer enforces RLS via req.dbContext + withDbContext
   * - Org A user sees exactly 2 items (seeded count)
   * - All returned items belong to Org A (verified by testRunId tag)
   */
  it('Org A token returns only Org A catalog items (2 items)', async () => {
    const response = await server!.inject({
      method: 'GET',
      url: '/api/tenant/catalog/items',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    // Assert HTTP success
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    const items = body.data.items as Array<{ id: string; sku: string; tenantId: string }>;

    // Assert count matches seeded data
    expect(items.length).toBe(2);

    // Assert all items belong to Org A (verified by tenantId)
    for (const item of items) {
      expect(item.tenantId).toBe(orgAId);
      expect(item.sku).toContain(testRunId); // Verify tagged item
    }
  });

  /**
   * TEST 2: Org B token returns ONLY Org B items
   *
   * Verifies:
   * - Tenant isolation at HTTP layer
   * - Org B user sees exactly 3 items (seeded count)
   * - All returned items belong to Org B
   */
  it('Org B token returns only Org B catalog items (3 items)', async () => {
    const response = await server!.inject({
      method: 'GET',
      url: '/api/tenant/catalog/items',
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    // Assert HTTP success
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    const items = body.data.items as Array<{ id: string; sku: string; tenantId: string }>;

    // Assert count matches seeded data
    expect(items.length).toBe(3);

    // Assert all items belong to Org B (verified by tenantId)
    for (const item of items) {
      expect(item.tenantId).toBe(orgBId);
      expect(item.sku).toContain(testRunId); // Verify tagged item
    }
  });

  /**
   * TEST 3: Cross-tenant isolation — Org A cannot see Org B items
   *
   * Verifies:
   * - RLS policies enforce strict tenant boundaries
   * - Org A token NEVER returns Org B SKUs
   * - No data leakage across tenant boundaries
   */
  it('Cross-tenant isolation: Org A cannot see Org B items', async () => {
    // Fetch items using Org A token
    const responseA = await server!.inject({
      method: 'GET',
      url: '/api/tenant/catalog/items',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    expect(responseA.statusCode).toBe(200);
    const bodyA = JSON.parse(responseA.body);
    const itemsA = bodyA.data.items as Array<{ id: string; sku: string; tenantId: string }>;

    // Fetch items using Org B token
    const responseB = await server!.inject({
      method: 'GET',
      url: '/api/tenant/catalog/items',
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    expect(responseB.statusCode).toBe(200);
    const bodyB = JSON.parse(responseB.body);
    const itemsB = bodyB.data.items as Array<{ id: string; sku: string; tenantId: string }>;

    // Assert Org A items do not overlap with Org B items (by ID)
    const itemAIds = new Set(itemsA.map(item => item.id));
    const itemBIds = new Set(itemsB.map(item => item.id));

    for (const idA of itemAIds) {
      expect(itemBIds.has(idA)).toBe(false); // No shared IDs
    }

    // Assert Org A items have ONLY Org A tenantId
    for (const item of itemsA) {
      expect(item.tenantId).toBe(orgAId);
      expect(item.tenantId).not.toBe(orgBId);
    }

    // Assert Org B items have ONLY Org B tenantId
    for (const item of itemsB) {
      expect(item.tenantId).toBe(orgBId);
      expect(item.tenantId).not.toBe(orgAId);
    }
  }, 30000);

  /**
   * TEST 4: Fail-closed — Missing token returns 401
   *
   * Verifies:
   * - Route requires authentication (no anonymous access)
   * - Missing Authorization header → 401 Unauthorized
   * - Enforces fail-closed security posture
   */
  it('Fail-closed: Missing token returns 401 Unauthorized', async () => {
    const response = await server!.inject({
      method: 'GET',
      url: '/api/tenant/catalog/items',
      // NO Authorization header
    });

    // Assert 401 Unauthorized
    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  /**
   * TEST 5: Invalid token returns 401
   *
   * Verifies:
   * - Route validates JWT signature
   * - Invalid/malformed token → 401 Unauthorized
   * - No data access with forged credentials
   */
  it('Invalid token returns 401 Unauthorized', async () => {
    const response = await server!.inject({
      method: 'GET',
      url: '/api/tenant/catalog/items',
      headers: {
        Authorization: 'Bearer invalid-token-12345',
      },
    });

    // Assert 401 Unauthorized
    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });
});
