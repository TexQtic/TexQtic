/**
 * Integration Tests — Network Commerce Pool Lifecycle Log Routes
 * TEXQTIC-NC-PHASE1-LIFECYCLE-LOG-READ-001
 *
 * D-017-A: orgId always from JWT/dbContext. Non-leaking 404 for wrong-org.
 * Read-only surface. No mutation. No payment / money movement.
 *
 * Test IDs:
 *   NLL-INT-01  unauthenticated GET → 401
 *   NLL-INT-02  feature gate off → 503
 *   NLL-INT-03  invalid poolId UUID → 422
 *   NLL-INT-04  pool not found for org → 404 POOL_NOT_FOUND
 *   NLL-INT-05  pool exists, no logs → 200 empty data array
 *   NLL-INT-06  pool with lifecycle log entries → 200 with data
 *   NLL-INT-07  wrong-org non-leaking → 404 POOL_NOT_FOUND
 *   NLL-INT-08  pagination: limit/offset params respected
 *   NLL-INT-09  route is read-only — no DB writes from GET
 *   NLL-INT-10  actor_admin_id is NOT present in response body (security gate)
 */

import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '../../db/prisma.js';
import { Prisma } from '@prisma/client';
import { withBypassForSeed } from '../../lib/database-context.js';
import { hasDb } from '../../__tests__/helpers/dbGate.js';
import { seedTenantForTest } from '../../__tests__/helpers/seedRls.js';

vi.mock('../../middleware/auth.js', () => {
  return {
    tenantAuthMiddleware: async (request: any, reply: any) => {
      const rawAuth = request.headers['x-test-auth'];
      const auth = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
      if (auth !== '1') {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        });
      }

      const rawOrgId    = request.headers['x-test-org-id'];
      const rawUserId   = request.headers['x-test-user-id'];
      const rawUserRole = request.headers['x-test-user-role'];
      const orgId    = Array.isArray(rawOrgId)    ? rawOrgId[0]    : rawOrgId;
      const userId   = Array.isArray(rawUserId)   ? rawUserId[0]   : rawUserId;
      const userRole = Array.isArray(rawUserRole) ? rawUserRole[0] : rawUserRole;

      if (!orgId || !userId) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid token payload' },
        });
      }

      request.userId   = String(userId);
      request.tenantId = String(orgId);
      request.userRole = userRole ? String(userRole) : 'MEMBER';
      request.user     = { userId: String(userId), tenantId: String(orgId) };
      return;
    },
  };
});

import networkLifecycleRoutes from './networkLifecycle.js';

function authHeaders(orgId: string, userId: string, userRole: string = 'OWNER') {
  return {
    'x-test-auth':      '1',
    'x-test-org-id':    orgId,
    'x-test-user-id':   userId,
    'x-test-user-role': userRole,
  };
}

describe.skipIf(!hasDb)('Network Commerce Pool Lifecycle Log Routes Integration', () => {
  const poolFeatureFlagKey = 'nc.procurement_pools.enabled';

  let app: FastifyInstance;
  let ownerOrgId:  string;
  let otherOrgId:  string;
  let ownerUserId: string;
  let testRunId:   string;

  let originalPoolFeatureFlag: { enabled: boolean; description: string | null; value: string | null } | null = null;

  const createdPoolIds: Set<string>           = new Set();
  const createdLogIds:  Set<string>           = new Set();

  // ─── App Builder ──────────────────────────────────────────────────────────

  async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify();
    await fastify.register(networkLifecycleRoutes, { prefix: '/api/tenant/network-commerce/pools' });
    await fastify.ready();
    return fastify;
  }

  // ─── Feature Flag Helpers ─────────────────────────────────────────────────

  async function removeGlobalPoolFlag(): Promise<void> {
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.deleteMany({ where: { key: poolFeatureFlagKey } });
    });
  }

  async function ensurePoolGateEnabled(): Promise<void> {
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.upsert({
        where:  { key: poolFeatureFlagKey },
        create: { key: poolFeatureFlagKey, enabled: true, description: 'NC lifecycle route integration test' },
        update: { enabled: true },
      });

      for (const orgId of [ownerOrgId, otherOrgId]) {
        await tx.tenantFeatureOverride.upsert({
          where:  { tenantId_key: { tenantId: orgId, key: poolFeatureFlagKey } },
          create: { tenantId: orgId, key: poolFeatureFlagKey, enabled: true },
          update: { enabled: true },
        });
      }
    });
  }

  // ─── Fixture Helpers ──────────────────────────────────────────────────────

  async function createPoolFixture(orgId: string): Promise<string> {
    return withBypassForSeed(prisma, async tx => {
      const state = await tx.lifecycleState.findUnique({
        where:  { entityType_stateKey: { entityType: 'POOL', stateKey: 'AGGREGATING' } },
        select: { id: true },
      });
      if (!state) throw new Error('Missing lifecycle state: POOL/AGGREGATING');

      const pool = await tx.networkPool.create({
        data: {
          id:                randomUUID(),
          orgId,
          poolRef:           `NLL-TEST-${testRunId}-${randomUUID().slice(0, 8)}`,
          commodityCategory: 'COTTON_YARN',
          targetQty:         new Prisma.Decimal(500),
          qtyUnit:           'KG',
          lifecycleStateId:  state.id,
          createdByUserId:   ownerUserId,
        },
        select: { id: true },
      });

      createdPoolIds.add(pool.id);
      return pool.id;
    });
  }

  async function createLogFixture(
    orgId:        string,
    poolId:       string,
    fromStateKey: string,
    toStateKey:   string,
    actorUserId:  string,
  ): Promise<string> {
    return withBypassForSeed(prisma, async tx => {
      const log = await tx.networkLifecycleLog.create({
        data: {
          id:          randomUUID(),
          orgId,
          entityType:  'POOL',
          entityId:    poolId,
          fromStateKey,
          toStateKey,
          actorType:   'TENANT_ADMIN',
          actorRole:   'ORG_ADMIN',
          actorUserId,
          aiTriggered: false,
          reason:      `NLL integration test [run:${testRunId}]`,
          requestId:   'test-request-id',
        },
        select: { id: true },
      });

      createdLogIds.add(log.id);
      return log.id;
    });
  }

  // ─── Setup / Teardown ─────────────────────────────────────────────────────

  beforeAll(async () => {
    testRunId = randomUUID().slice(0, 8);

    // Persist original pool feature flag state
    originalPoolFeatureFlag = await withBypassForSeed(prisma, async tx => {
      const row = await tx.featureFlag.findUnique({
        where:  { key: poolFeatureFlagKey },
        select: { enabled: true, description: true, value: true },
      });
      return row ?? null;
    });

    ownerOrgId  = randomUUID();
    otherOrgId  = randomUUID();
    await seedTenantForTest(ownerOrgId, `nll-owner-${testRunId}`);
    await seedTenantForTest(otherOrgId, `nll-other-${testRunId}`);
    ownerUserId = randomUUID();

    await ensurePoolGateEnabled();
    app = await buildApp();
  });

  afterAll(async () => {
    // NOTE: networkLifecycleLog rows are IMMUTABLE (G-020 D-020-D append-only enforcement).
    // Lifecycle log rows inserted during test setup cannot be deleted — they persist as
    // test data. createdLogIds tracks what was inserted for documentation purposes only.

    // Clean up pool rows
    if (createdPoolIds.size > 0) {
      await withBypassForSeed(prisma, async tx => {
        await tx.networkPool.deleteMany({
          where: { id: { in: [...createdPoolIds] } },
        });
      });
    }

    // Restore original pool feature flag state
    await withBypassForSeed(prisma, async tx => {
      if (originalPoolFeatureFlag !== null) {
        await tx.featureFlag.upsert({
          where:  { key: poolFeatureFlagKey },
          create: { key: poolFeatureFlagKey, ...originalPoolFeatureFlag },
          update: { enabled: originalPoolFeatureFlag.enabled },
        });
      } else {
        await tx.featureFlag.deleteMany({ where: { key: poolFeatureFlagKey } });
      }
    });

    // Clean up tenant overrides
    await withBypassForSeed(prisma, async tx => {
      await tx.tenantFeatureOverride.deleteMany({
        where: {
          tenantId: { in: [ownerOrgId, otherOrgId] },
          key: poolFeatureFlagKey,
        },
      });
    });

    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── NLL-INT-01: unauthenticated → 401 ────────────────────────────────────

  it('NLL-INT-01: unauthenticated GET /:poolId/lifecycle returns 401', async () => {
    const poolId = randomUUID();
    const res = await app.inject({
      method: 'GET',
      url:    `/api/tenant/network-commerce/pools/${poolId}/lifecycle`,
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ─── NLL-INT-02: feature gate off → 503 ───────────────────────────────────

  it('NLL-INT-02: feature gate off returns 503', async () => {
    await removeGlobalPoolFlag();

    const poolId = randomUUID();
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/lifecycle`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    await ensurePoolGateEnabled(); // restore for subsequent tests

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  // ─── NLL-INT-03: invalid poolId UUID → 422 ────────────────────────────────

  it('NLL-INT-03: invalid poolId UUID returns 422', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/not-a-uuid/lifecycle`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  // ─── NLL-INT-04: pool not found for org → 404 POOL_NOT_FOUND ──────────────

  it('NLL-INT-04: pool not found for org returns 404 POOL_NOT_FOUND', async () => {
    const missingPoolId = randomUUID();
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${missingPoolId}/lifecycle`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('POOL_NOT_FOUND');
  });

  // ─── NLL-INT-05: pool exists, no logs → 200 empty data ────────────────────

  it('NLL-INT-05: pool with no lifecycle logs returns 200 with empty data array', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/lifecycle`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.data)).toBe(true);
    expect(body.data.data).toHaveLength(0);
    expect(body.data.pagination.total).toBe(0);
  });

  // ─── NLL-INT-06: pool with lifecycle log entries → 200 with data ──────────

  it('NLL-INT-06: pool with lifecycle log entries returns 200 with entries', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    await createLogFixture(ownerOrgId, poolId, 'DRAFT', 'OPEN', ownerUserId);
    await createLogFixture(ownerOrgId, poolId, 'OPEN',  'AGGREGATING', ownerUserId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/lifecycle`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.data)).toBe(true);
    expect(body.data.data.length).toBeGreaterThanOrEqual(2);
    expect(body.data.pagination.total).toBeGreaterThanOrEqual(2);

    const entry = body.data.data[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('entity_type', 'POOL');
    expect(entry).toHaveProperty('entity_id', poolId);
    expect(entry).toHaveProperty('from_state_key');
    expect(entry).toHaveProperty('to_state_key');
    expect(entry).toHaveProperty('actor_type');
    expect(entry).toHaveProperty('actor_role');
    expect(entry).toHaveProperty('ai_triggered');
    expect(entry).toHaveProperty('reason');
    expect(entry).toHaveProperty('created_at');
    expect(typeof entry.created_at).toBe('string');
  });

  // ─── NLL-INT-07: wrong-org non-leaking → 404 POOL_NOT_FOUND ───────────────

  it('NLL-INT-07: wrong-org access returns non-leaking 404 POOL_NOT_FOUND', async () => {
    // Pool belongs to ownerOrgId; otherOrgId tries to read it
    const poolId = await createPoolFixture(ownerOrgId);
    await createLogFixture(ownerOrgId, poolId, 'DRAFT', 'OPEN', ownerUserId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/lifecycle`,
      headers: authHeaders(otherOrgId, randomUUID()),
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('POOL_NOT_FOUND');
  });

  // ─── NLL-INT-08: pagination params respected ──────────────────────────────

  it('NLL-INT-08: limit=1 pagination returns only 1 entry when multiple exist', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    await createLogFixture(ownerOrgId, poolId, 'DRAFT',      'OPEN',         ownerUserId);
    await createLogFixture(ownerOrgId, poolId, 'OPEN',       'AGGREGATING',  ownerUserId);
    await createLogFixture(ownerOrgId, poolId, 'AGGREGATING', 'CLOSED_FOR_BIDS', ownerUserId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/lifecycle?limit=1&offset=0`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.data).toHaveLength(1);
    expect(body.data.pagination.total).toBeGreaterThanOrEqual(3);
    expect(body.data.pagination.limit).toBe(1);
    expect(body.data.pagination.offset).toBe(0);
  });

  // ─── NLL-INT-09: route is read-only — no DB writes from GET ───────────────

  it('NLL-INT-09: GET lifecycle route does not write any rows', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const countBefore = await withBypassForSeed(prisma, async tx =>
      tx.networkLifecycleLog.count({ where: { entityType: 'POOL', entityId: poolId } }),
    );

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/lifecycle`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });
    expect(res.statusCode).toBe(200);

    const countAfter = await withBypassForSeed(prisma, async tx =>
      tx.networkLifecycleLog.count({ where: { entityType: 'POOL', entityId: poolId } }),
    );

    expect(countAfter).toBe(countBefore);
  });

  // ─── NLL-INT-10: actor_admin_id not in response body ──────────────────────

  it('NLL-INT-10: actor_admin_id is NOT present in response body (security gate)', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    await createLogFixture(ownerOrgId, poolId, 'DRAFT', 'OPEN', ownerUserId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/lifecycle`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    for (const entry of body.data.data) {
      expect(entry).not.toHaveProperty('actor_admin_id');
      expect(entry).not.toHaveProperty('impersonation_id');
    }
  });
});
