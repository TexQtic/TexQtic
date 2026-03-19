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
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { hasDb } from './helpers/dbGate.js';
import { prisma } from '../db/prisma.js';
import { withBypassForSeed } from '../lib/database-context.js';
import { cleanupCatalogItemsByTag, verifyCleanupComplete } from './helpers/cleanupRls.js';
import { seedTenantForTest, seedCatalogItemsForOrg } from './helpers/seedRls.js';
import tenantRoutes from '../routes/tenant.js';
import { databaseContextMiddleware } from '../middleware/database-context.middleware.js';

describe.skipIf(!hasDb)('Gate C.2 — Pilot Route RLS Contract Tests', () => {
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

describe.skipIf(!hasDb)('TECS-RFQ-BUYER-RESPONSE-READ-001 — Buyer RFQ detail reads', () => {
  let server: FastifyInstance | null = null;
  let testRunId: string;
  let buyerOrgId: string;
  let supplierOrgId: string;
  let otherBuyerOrgId: string;
  let buyerUserId: string;
  let supplierUserId: string;
  let otherBuyerUserId: string;
  let buyerToken: string;
  let supplierToken: string;
  let otherBuyerToken: string;
  let catalogItemId: string;
  let respondedRfqId: string;
  let openRfqId: string;

  beforeEach(async () => {
    testRunId = randomUUID();
    buyerOrgId = randomUUID();
    supplierOrgId = randomUUID();
    otherBuyerOrgId = randomUUID();

    await seedTenantForTest(buyerOrgId, testRunId);
    await seedTenantForTest(supplierOrgId, testRunId);
    await seedTenantForTest(otherBuyerOrgId, testRunId);

    await withBypassForSeed(prisma, async tx => {
      const passwordHash = await bcrypt.hash('test-password', 10);

      const buyerUser = await tx.user.create({
        data: {
          id: randomUUID(),
          email: `buyer-${testRunId}@test.local`,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      buyerUserId = buyerUser.id;

      const supplierUser = await tx.user.create({
        data: {
          id: randomUUID(),
          email: `supplier-${testRunId}@test.local`,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      supplierUserId = supplierUser.id;

      const otherBuyerUser = await tx.user.create({
        data: {
          id: randomUUID(),
          email: `other-buyer-${testRunId}@test.local`,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      otherBuyerUserId = otherBuyerUser.id;

      await tx.membership.createMany({
        data: [
          {
            tenantId: buyerOrgId,
            userId: buyerUserId,
            role: 'OWNER',
          },
          {
            tenantId: supplierOrgId,
            userId: supplierUserId,
            role: 'OWNER',
          },
          {
            tenantId: otherBuyerOrgId,
            userId: otherBuyerUserId,
            role: 'OWNER',
          },
        ],
      });

      const catalogItem = await tx.catalogItem.create({
        data: {
          id: randomUUID(),
          tenantId: supplierOrgId,
          name: `RFQ Supplier Item [tag:${testRunId}]`,
          sku: `RFQ-${testRunId}`,
          description: `RFQ response read fixture for ${testRunId}`,
          price: 25,
          active: true,
        },
      });
      catalogItemId = catalogItem.id;

      const respondedRfq = await tx.rfq.create({
        data: {
          id: randomUUID(),
          orgId: buyerOrgId,
          supplierOrgId,
          catalogItemId,
          quantity: 5,
          buyerMessage: 'Please confirm availability',
          status: 'RESPONDED',
          createdByUserId: buyerUserId,
        },
      });
      respondedRfqId = respondedRfq.id;

      await tx.rfqSupplierResponse.create({
        data: {
          rfqId: respondedRfqId,
          supplierOrgId,
          message: 'We can supply this request within 10 business days.',
          createdByUserId: supplierUserId,
        },
      });

      const openRfq = await tx.rfq.create({
        data: {
          id: randomUUID(),
          orgId: buyerOrgId,
          supplierOrgId,
          catalogItemId,
          quantity: 3,
          buyerMessage: 'Need lead time confirmation',
          status: 'OPEN',
          createdByUserId: buyerUserId,
        },
      });
      openRfqId = openRfq.id;
    });

    server = Fastify({ logger: false });
    await server.register(fastifyCookie, { secret: 'test-secret' });
    await server.register(fastifyJwt, {
      secret: config.JWT_ACCESS_SECRET,
      namespace: 'tenant',
      jwtVerify: 'tenantJwtVerify',
      jwtSign: 'tenantJwtSign',
    });

    await server.register(async fastify => {
      fastify.addHook('onRequest', async (request, reply) => {
        try {
          await request.tenantJwtVerify({ onlyCookie: false });
          const payload = request.user as { userId?: string; tenantId?: string };

          if (!payload.userId || !payload.tenantId) {
            return reply.code(401).send({ success: false, error: 'Invalid token payload' });
          }

          request.userId = payload.userId;
          request.tenantId = payload.tenantId;
        } catch {
          return reply.code(401).send({ success: false, error: 'Invalid or expired token' });
        }
      });

      fastify.addHook('onRequest', databaseContextMiddleware);
      await fastify.register(tenantRoutes, { prefix: '/api' });
    });

    await server.ready();

    buyerToken = jwt.sign({ userId: buyerUserId, tenantId: buyerOrgId }, config.JWT_ACCESS_SECRET, {
      expiresIn: '1h',
    });
    supplierToken = jwt.sign({ userId: supplierUserId, tenantId: supplierOrgId }, config.JWT_ACCESS_SECRET, {
      expiresIn: '1h',
    });
    otherBuyerToken = jwt.sign({ userId: otherBuyerUserId, tenantId: otherBuyerOrgId }, config.JWT_ACCESS_SECRET, {
      expiresIn: '1h',
    });
  }, 30000);

  afterEach(async () => {
    if (server) {
      await server.close().catch(() => {});
      server = null;
    }

    await withBypassForSeed(prisma, async tx => {
      await tx.rfqSupplierResponse.deleteMany({
        where: {
          rfqId: { in: [respondedRfqId, openRfqId] },
        },
      });

      await tx.rfq.deleteMany({
        where: {
          id: { in: [respondedRfqId, openRfqId] },
        },
      });

      await tx.catalogItem.deleteMany({ where: { id: catalogItemId } });

      await tx.membership.deleteMany({
        where: {
          OR: [
            { tenantId: buyerOrgId },
            { tenantId: supplierOrgId },
            { tenantId: otherBuyerOrgId },
          ],
        },
      });

      await tx.user.deleteMany({
        where: {
          id: { in: [buyerUserId, supplierUserId, otherBuyerUserId] },
        },
      });

      await tx.tenant.deleteMany({
        where: {
          id: { in: [buyerOrgId, supplierOrgId, otherBuyerOrgId] },
        },
      });
    });
  }, 30000);

  it('buyer can read a bounded supplier response for its own RFQ', async () => {
    const response = await server!.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/${respondedRfqId}`,
      headers: {
        Authorization: `Bearer ${buyerToken}`,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.rfq.id).toBe(respondedRfqId);
    expect(body.data.rfq.status).toBe('RESPONDED');
    expect(body.data.rfq.supplier_org_id).toBe(supplierOrgId);
    expect(body.data.rfq.supplier_response).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        supplier_org_id: supplierOrgId,
        message: 'We can supply this request within 10 business days.',
        submitted_at: expect.any(String),
        created_at: expect.any(String),
      })
    );
    expect(body.data.rfq.supplier_response).not.toHaveProperty('created_by_user_id');
    expect(body.data.rfq.supplier_response).not.toHaveProperty('price');
    expect(body.data.rfq.supplier_response).not.toHaveProperty('currency');
    expect(body.data.rfq.supplier_response).not.toHaveProperty('total');
  });

  it('buyer sees a stable null response when no supplier response exists', async () => {
    const response = await server!.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/${openRfqId}`,
      headers: {
        Authorization: `Bearer ${buyerToken}`,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.rfq.id).toBe(openRfqId);
    expect(body.data.rfq.status).toBe('OPEN');
    expect(body.data.rfq.supplier_response).toBeNull();
  });

  it('cross-tenant buyers cannot read another buyer org response through the buyer path', async () => {
    const response = await server!.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/${respondedRfqId}`,
      headers: {
        Authorization: `Bearer ${otherBuyerToken}`,
      },
    });

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('supplier tenants cannot use the buyer detail path to read buyer RFQs', async () => {
    const response = await server!.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/${respondedRfqId}`,
      headers: {
        Authorization: `Bearer ${supplierToken}`,
      },
    });

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('single-response semantics remain unchanged after buyer-visible reads are added', async () => {
    const firstResponse = await server!.inject({
      method: 'POST',
      url: `/api/tenant/rfqs/inbox/${openRfqId}/respond`,
      headers: {
        Authorization: `Bearer ${supplierToken}`,
      },
      payload: {
        message: 'Availability confirmed for the requested quantity.',
      },
    });

    expect(firstResponse.statusCode).toBe(201);

    const secondResponse = await server!.inject({
      method: 'POST',
      url: `/api/tenant/rfqs/inbox/${openRfqId}/respond`,
      headers: {
        Authorization: `Bearer ${supplierToken}`,
      },
      payload: {
        message: 'Attempted second response should be rejected.',
      },
    });

    expect(secondResponse.statusCode).toBe(409);

    const secondBody = JSON.parse(secondResponse.body);
    expect(secondBody.success).toBe(false);
    expect(secondBody.error.code).toBe('RFQ_ALREADY_RESPONDED');

    const buyerRead = await server!.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/${openRfqId}`,
      headers: {
        Authorization: `Bearer ${buyerToken}`,
      },
    });

    expect(buyerRead.statusCode).toBe(200);

    const buyerReadBody = JSON.parse(buyerRead.body);
    expect(buyerReadBody.data.rfq.status).toBe('RESPONDED');
    expect(buyerReadBody.data.rfq.supplier_response).toEqual(
      expect.objectContaining({
        message: 'Availability confirmed for the requested quantity.',
        supplier_org_id: supplierOrgId,
      })
    );
  });
});
