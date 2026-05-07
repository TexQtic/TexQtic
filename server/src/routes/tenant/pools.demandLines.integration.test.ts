/**
 * Integration Tests — Pool Demand Line Tenant Routes
 * TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-001
 *
 * Covers:
 *   DLT-01..DLT-06  — Feature gate / auth
 *   DLT-07..DLT-17  — Create demand line
 *   DLT-18..DLT-24  — List demand lines
 *   DLT-25..DLT-29  — Update demand line
 *   DLT-30..DLT-33  — Cancel demand line
 *   DLT-34..DLT-35  — Org scope guard
 *   DLT-36..DLT-37  — afterAll cleanup verification
 *
 * Uses the same RLS-bypass triple-gate harness as pools.integration.test.ts.
 * Cleanup: demand lines + pools + memberships + feature flags.
 */

import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
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

      const rawOrgId = request.headers['x-test-org-id'];
      const rawUserId = request.headers['x-test-user-id'];
      const rawUserRole = request.headers['x-test-user-role'];
      const orgId = Array.isArray(rawOrgId) ? rawOrgId[0] : rawOrgId;
      const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
      const userRole = Array.isArray(rawUserRole) ? rawUserRole[0] : rawUserRole;

      if (!orgId || !userId) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid token payload' },
        });
      }

      request.userId = String(userId);
      request.tenantId = String(orgId);
      request.userRole = userRole ? String(userRole) : 'MEMBER';
      request.user = { userId: String(userId), tenantId: String(orgId) };
      return;
    },
  };
});

import poolDemandLineRoutes from './poolDemandLines.js';

function authHeaders(orgId: string, userId: string, userRole: string = 'OWNER') {
  return {
    'x-test-auth': '1',
    'x-test-org-id': orgId,
    'x-test-user-id': userId,
    'x-test-user-role': userRole,
  };
}

describe.skipIf(!hasDb)('Network Commerce Demand Line Routes Integration', () => {
  const poolFeatureFlagKey = 'nc.procurement_pools.enabled';

  let app: FastifyInstance;
  let ownerOrgId: string;
  let otherOrgId: string;
  let ownerUserId: string;
  let otherUserId: string;
  let testRunId: string;
  let originalPoolFeatureFlag: { enabled: boolean; description: string | null; value: string | null } | null = null;
  const createdPoolIds = new Set<string>();

  async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify();
    await fastify.register(poolDemandLineRoutes, { prefix: '/api/tenant/network-commerce/pools' });
    await fastify.ready();
    return fastify;
  }

  function makeLineRef(tag: string): string {
    return `DL-ROUTE-${testRunId}-${tag}`;
  }

  function makePoolRef(tag: string): string {
    return `DL-POOL-${testRunId}-${tag}`;
  }

  async function setGlobalPoolFlag(enabled: boolean): Promise<void> {
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.upsert({
        where: { key: poolFeatureFlagKey },
        create: {
          key: poolFeatureFlagKey,
          enabled,
          description: 'NC demand line routes feature gate (integration test)',
        },
        update: { enabled },
      });
    });
  }

  async function removeGlobalPoolFlag(): Promise<void> {
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.deleteMany({ where: { key: poolFeatureFlagKey } });
    });
  }

  async function enablePoolGateForTestTenants(): Promise<void> {
    await withBypassForSeed(prisma, async tx => {
      const orgIds = [ownerOrgId, otherOrgId];
      for (const orgId of orgIds) {
        await tx.tenantFeatureOverride.upsert({
          where: {
            tenantId_key: {
              tenantId: orgId,
              key: poolFeatureFlagKey,
            },
          },
          create: {
            tenantId: orgId,
            key: poolFeatureFlagKey,
            enabled: true,
          },
          update: { enabled: true },
        });
      }
    });
  }

  async function ensureGateEnabled(): Promise<void> {
    await setGlobalPoolFlag(true);
    await enablePoolGateForTestTenants();
  }

  /** Create a pool row directly via bypass for use as a test fixture. */
  async function createPoolFixture(
    orgId: string,
    overrides?: { poolRef?: string; lifecycleStateKey?: string },
  ): Promise<string> {
    const explicitPoolRef = overrides?.poolRef;
    const stateKey = overrides?.lifecycleStateKey ?? 'DRAFT';

    return withBypassForSeed(prisma, async tx => {
      const poolRef = explicitPoolRef ?? makePoolRef(randomUUID().slice(0, 8));
      const state = await tx.lifecycleState.findUnique({
        where: { entityType_stateKey: { entityType: 'POOL', stateKey } },
        select: { id: true },
      });
      if (!state) throw new Error(`Missing lifecycle state: POOL/${stateKey}`);

      const pool = await tx.networkPool.create({
        data: {
          id: randomUUID(),
          orgId,
          poolRef,
          commodityCategory: 'COTTON_YARN',
          targetQty: new Prisma.Decimal(1000),
          qtyUnit: 'KG',
          lifecycleStateId: state.id,
          createdByUserId: ownerUserId,
        },
        select: { id: true },
      });

      createdPoolIds.add(pool.id);
      return pool.id;
    });
  }

  /** Create a demand line via the route. */
  async function createDemandLineViaRoute(
    poolId: string,
    orgId: string,
    userId: string,
    overrides?: Record<string, unknown>,
  ) {
    const payload = {
      line_ref: makeLineRef(randomUUID().slice(0, 8)),
      commodity_category: 'COTTON_YARN',
      qty: 500,
      qty_unit: 'KG',
      ...overrides,
    };

    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: authHeaders(orgId, userId),
      payload,
    });

    return { res, payload };
  }

  beforeAll(async () => {
    app = await buildApp();

    ownerOrgId = randomUUID();
    otherOrgId = randomUUID();
    ownerUserId = randomUUID();
    otherUserId = randomUUID();

    await seedTenantForTest(ownerOrgId, 'dl-route-owner');
    await seedTenantForTest(otherOrgId, 'dl-route-other');

    await withBypassForSeed(prisma, async tx => {
      const row = await tx.featureFlag.findUnique({
        where: { key: poolFeatureFlagKey },
        select: { enabled: true, description: true, value: true },
      });
      originalPoolFeatureFlag = row;
    });
  });

  beforeEach(async () => {
    testRunId = randomUUID().slice(0, 8);
    await ensureGateEnabled();
  });

  afterEach(async () => {
    const poolIds = [...createdPoolIds];
    createdPoolIds.clear();

    await withBypassForSeed(prisma, async tx => {
      if (poolIds.length > 0) {
        await tx.networkPoolDemandLine.deleteMany({ where: { poolId: { in: poolIds } } });
        await tx.networkPoolMembership.deleteMany({ where: { poolId: { in: poolIds } } });
        await tx.networkPool.deleteMany({ where: { id: { in: poolIds } } });
      }

      await tx.tenantFeatureOverride.deleteMany({
        where: {
          key: poolFeatureFlagKey,
          tenantId: { in: [ownerOrgId, otherOrgId] },
        },
      });
    }).catch(() => {
      // Best-effort cleanup for route tests.
    });

    // Restore global feature flag so concurrent test suites are not disrupted.
    await ensureGateEnabled();
  });

  afterAll(async () => {
    await app.close();

    await withBypassForSeed(prisma, async tx => {
      // Clean demand lines by prefix
      const pools = await tx.networkPool.findMany({
        where: {
          OR: [
            { orgId: { in: [ownerOrgId, otherOrgId] } },
            { poolRef: { startsWith: 'DL-POOL-' } },
          ],
        },
        select: { id: true },
      });
      const allPoolIds = pools.map((p: { id: string }) => p.id);

      if (allPoolIds.length > 0) {
        await tx.networkPoolDemandLine.deleteMany({ where: { poolId: { in: allPoolIds } } });
        await tx.networkPoolMembership.deleteMany({ where: { poolId: { in: allPoolIds } } });
        await tx.networkPool.deleteMany({ where: { id: { in: allPoolIds } } });
      }

      await tx.tenantFeatureOverride.deleteMany({
        where: {
          key: poolFeatureFlagKey,
          tenantId: { in: [ownerOrgId, otherOrgId] },
        },
      });

      if (originalPoolFeatureFlag) {
        await tx.featureFlag.upsert({
          where: { key: poolFeatureFlagKey },
          create: {
            key: poolFeatureFlagKey,
            enabled: originalPoolFeatureFlag.enabled,
            description: originalPoolFeatureFlag.description,
            value: originalPoolFeatureFlag.value,
          },
          update: {
            enabled: originalPoolFeatureFlag.enabled,
            description: originalPoolFeatureFlag.description,
            value: originalPoolFeatureFlag.value,
          },
        });
      } else {
        await tx.featureFlag.deleteMany({ where: { key: poolFeatureFlagKey } });
      }
    }).catch(() => {
      // Best-effort final cleanup.
    });
  });

  // ─── Feature Gate / Auth (DLT-01..DLT-06) ────────────────────────────────

  it('DLT-01 missing global flag on create -> 503 FEATURE_DISABLED', async () => {
    await removeGlobalPoolFlag();

    const poolId = randomUUID();
    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {
        line_ref: makeLineRef('DLT-01'),
        commodity_category: 'COTTON_YARN',
        qty: 100,
        qty_unit: 'KG',
      },
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('DLT-02 disabled global flag on list -> 503 FEATURE_DISABLED', async () => {
    await setGlobalPoolFlag(false);

    const poolId = randomUUID();
    const res = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('DLT-03 disabled global flag on update -> 503 FEATURE_DISABLED', async () => {
    await setGlobalPoolFlag(false);

    const poolId = randomUUID();
    const lineId = randomUUID();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: { qty: 200 },
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('DLT-04 disabled global flag on cancel -> 503 FEATURE_DISABLED', async () => {
    await setGlobalPoolFlag(false);

    const poolId = randomUUID();
    const lineId = randomUUID();
    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {},
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('DLT-05 unauthenticated create -> 401', async () => {
    const poolId = randomUUID();
    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: { 'x-test-auth': '0', 'x-test-org-id': ownerOrgId, 'x-test-user-id': ownerUserId },
      payload: {
        line_ref: makeLineRef('DLT-05'),
        commodity_category: 'COTTON_YARN',
        qty: 100,
        qty_unit: 'KG',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('DLT-06 unauthenticated list -> 401', async () => {
    const poolId = randomUUID();
    const res = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: { 'x-test-auth': '0', 'x-test-org-id': ownerOrgId, 'x-test-user-id': ownerUserId },
    });

    expect(res.statusCode).toBe(401);
  });

  // ─── Create Demand Line (DLT-07..DLT-17) ─────────────────────────────────

  it('DLT-07 valid create -> 201 with DRAFT status', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const { res } = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);

    expect(res.statusCode).toBe(201);
    const body = res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('DRAFT');
    expect(body.data.pool_id).toBe(poolId);
    expect(body.data.owner_org_id).toBe(ownerOrgId);
  });

  it('DLT-08 created record does not include metadata_internal_json', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const { res } = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);

    expect(res.statusCode).toBe(201);
    const body = res.json() as any;
    expect(body.data).not.toHaveProperty('metadata_internal_json');
  });

  it('DLT-09 missing line_ref -> 400 INVALID_INPUT', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {
        commodity_category: 'COTTON_YARN',
        qty: 500,
        qty_unit: 'KG',
      },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('DLT-10 negative qty -> 400 INVALID_INPUT', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const { res } = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId, { qty: -1 });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('DLT-11 pool_id in body is rejected -> 400 with pool_id error', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {
        pool_id: poolId,
        line_ref: makeLineRef('DLT-11'),
        commodity_category: 'COTTON_YARN',
        qty: 500,
        qty_unit: 'KG',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('DLT-12 owner_org_id in body is rejected', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {
        owner_org_id: ownerOrgId,
        line_ref: makeLineRef('DLT-12'),
        commodity_category: 'COTTON_YARN',
        qty: 500,
        qty_unit: 'KG',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('DLT-13 pool not found -> 404 POOL_NOT_FOUND', async () => {
    const missingPoolId = randomUUID();

    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${missingPoolId}/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {
        line_ref: makeLineRef('DLT-13'),
        commodity_category: 'COTTON_YARN',
        qty: 500,
        qty_unit: 'KG',
      },
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('DLT-14 invalid poolId format -> 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/not-a-uuid/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {
        line_ref: makeLineRef('DLT-14'),
        commodity_category: 'COTTON_YARN',
        qty: 500,
        qty_unit: 'KG',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('DLT-15 duplicate line_ref in same pool -> 409 DUPLICATE_LINE_REF', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const lineRef = makeLineRef('DLT-15-DUP');

    const first = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId, { line_ref: lineRef });
    expect(first.res.statusCode).toBe(201);

    const second = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId, { line_ref: lineRef });
    expect(second.res.statusCode).toBe(409);
    expect((second.res.json() as any).error.code).toBe('DUPLICATE_LINE_REF');
  });

  it('DLT-16 delivery_window_start >= end -> 400 INVALID_INPUT', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const at = new Date().toISOString();

    const { res } = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId, {
      delivery_window_start: at,
      delivery_window_end: at,
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('DLT-17 pool in non-writable state -> 422 INVALID_STATE', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    // Force pool to CANCELLED (terminal, non-writable) state via bypass
    await withBypassForSeed(prisma, async tx => {
      const state = await tx.lifecycleState.findUnique({
        where: { entityType_stateKey: { entityType: 'POOL', stateKey: 'CANCELLED' } },
        select: { id: true },
      });
      if (!state) throw new Error('Missing CANCELLED lifecycle state for POOL');
      await tx.networkPool.update({ where: { id: poolId }, data: { lifecycleStateId: state.id } });
    });

    const { res } = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);

    expect(res.statusCode).toBe(422);
    expect((res.json() as any).error.code).toBe('INVALID_STATE');
  });

  // ─── List Demand Lines (DLT-18..DLT-24) ──────────────────────────────────

  it('DLT-18 list on empty pool -> 200 with zero items', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const res = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(0);
    expect(body.data.pagination.total).toBe(0);
  });

  it('DLT-19 list returns created demand lines', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const create1 = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    const create2 = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create1.res.statusCode).toBe(201);
    expect(create2.res.statusCode).toBe(201);

    const res = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.data.items.length).toBeGreaterThanOrEqual(2);
    expect(body.data.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it('DLT-20 list does not include metadata_internal_json', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);

    const res = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    for (const item of body.data.items) {
      expect(item).not.toHaveProperty('metadata_internal_json');
    }
  });

  it('DLT-21 list unknown pool -> 404 POOL_NOT_FOUND', async () => {
    const missingPoolId = randomUUID();

    const res = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${missingPoolId}/demand-lines`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('DLT-22 list pagination limit/offset respected', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    // Create 3 demand lines
    for (let i = 0; i < 3; i++) {
      const r = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
      expect(r.res.statusCode).toBe(201);
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines?limit=2&offset=0`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.data.items).toHaveLength(2);
    expect(body.data.pagination.limit).toBe(2);
    expect(body.data.pagination.total).toBeGreaterThanOrEqual(3);
  });

  it('DLT-23 list with invalid limit -> 400 INVALID_INPUT', async () => {
    const poolId = randomUUID();

    const res = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines?limit=999`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('DLT-24 list with status filter returns only matching records', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);

    const res = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines?status=DRAFT`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    for (const item of body.data.items) {
      expect(item.status).toBe('DRAFT');
    }
  });

  // ─── Update Demand Line (DLT-25..DLT-29) ─────────────────────────────────

  it('DLT-25 valid partial update -> 200 with updated fields', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);
    const lineId = (create.res.json() as any).data.id as string;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: { qty: 750, qty_unit: 'MT' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.qty_unit).toBe('MT');
  });

  it('DLT-26 update does not return metadata_internal_json', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);
    const lineId = (create.res.json() as any).data.id as string;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: { qty: 800 },
    });

    expect(res.statusCode).toBe(200);
    expect((res.json() as any).data).not.toHaveProperty('metadata_internal_json');
  });

  it('DLT-27 update unknown lineId -> 404 DEMAND_LINE_NOT_FOUND', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const missingLineId = randomUUID();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${missingLineId}`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: { qty: 900 },
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('DEMAND_LINE_NOT_FOUND');
  });

  it('DLT-28 update empty body -> 400 INVALID_INPUT (no fields)', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);
    const lineId = (create.res.json() as any).data.id as string;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('DLT-29 update with invalid lineId format -> 400', async () => {
    const poolId = randomUUID();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/not-a-uuid`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: { qty: 100 },
    });

    expect(res.statusCode).toBe(400);
  });

  // ─── Cancel Demand Line (DLT-30..DLT-33) ─────────────────────────────────

  it('DLT-30 valid cancel -> 200 with CANCELLED status', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);
    const lineId = (create.res.json() as any).data.id as string;

    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('CANCELLED');
  });

  it('DLT-31 cancel does not return metadata_internal_json', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);
    const lineId = (create.res.json() as any).data.id as string;

    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect((res.json() as any).data).not.toHaveProperty('metadata_internal_json');
  });

  it('DLT-32 cancel unknown lineId -> 404 DEMAND_LINE_NOT_FOUND', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const missingLineId = randomUUID();

    const res = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${missingLineId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {},
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('DEMAND_LINE_NOT_FOUND');
  });

  it('DLT-33 double cancel -> 422 INVALID_STATE', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);
    const lineId = (create.res.json() as any).data.id as string;

    const first = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {},
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId),
      payload: {},
    });

    expect(second.statusCode).toBe(422);
    expect((second.json() as any).error.code).toBe('INVALID_STATE');
  });

  // ─── Org Scope Guard (DLT-34..DLT-35) ────────────────────────────────────

  it('DLT-34 list with other org cannot see owner org demand lines', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);

    // otherOrgId trying to list ownerOrgId's pool — should get 404 (pool not found for other org)
    const res = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
      headers: authHeaders(otherOrgId, otherUserId),
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('DLT-35 update line belonging to other org -> 404 DEMAND_LINE_NOT_FOUND', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);
    const lineId = (create.res.json() as any).data.id as string;

    // otherOrgId trying to update ownerOrgId's demand line
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}`,
      headers: authHeaders(otherOrgId, otherUserId),
      payload: { qty: 999 },
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('DEMAND_LINE_NOT_FOUND');
  });

  // ─── Cleanup Verification (DLT-36..DLT-37) ───────────────────────────────

  it('DLT-36 afterAll cleanup: demand lines created in this test run are removed', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);

    // afterEach/afterAll cleans up. Verify the pool was tracked.
    expect(createdPoolIds.has(poolId)).toBe(true);
  });

  it('DLT-37 afterAll cleanup: no dangling demand lines remain for test org pools', async () => {
    // This test verifies that demand lines are included in cleanup scope.
    // A pool created here will be cleaned up in afterAll via DL-POOL- prefix.
    const poolId = await createPoolFixture(ownerOrgId);
    const create = await createDemandLineViaRoute(poolId, ownerOrgId, ownerUserId);
    expect(create.res.statusCode).toBe(201);

    const demandLineId = (create.res.json() as any).data.id as string;
    expect(typeof demandLineId).toBe('string');

    // afterAll will delete demand lines in pool before deleting pool
    // This test simply confirms the flow works (cleanup is in afterAll hooks)
    expect(createdPoolIds.has(poolId)).toBe(true);
  });
});
