import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

import poolRoutes from './pools.js';

function authHeaders(orgId: string, userId: string, userRole: string = 'MEMBER') {
  return {
    'x-test-auth': '1',
    'x-test-org-id': orgId,
    'x-test-user-id': userId,
    'x-test-user-role': userRole,
  };
}

describe.skipIf(!hasDb)('Network Commerce Pool Routes Integration', () => {
  const poolFeatureFlagKey = 'nc.procurement_pools.enabled';

  let app: FastifyInstance;
  let ownerOrgId: string;
  let memberOrgId: string;
  let otherOrgId: string;
  let ownerUserId: string;
  let memberUserId: string;
  let otherUserId: string;
  let testRunId: string;
  let originalPoolFeatureFlag: { enabled: boolean; description: string | null; value: string | null } | null = null;
  const createdPoolIds = new Set<string>();

  async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify();
    await fastify.register(poolRoutes, { prefix: '/api/tenant/network-commerce/pools' });
    await fastify.ready();
    return fastify;
  }

  function makePoolRef(tag: string): string {
    return `ROUTE-HARNESS-${testRunId}-${tag}`;
  }

  async function setGlobalPoolFlag(enabled: boolean): Promise<void> {
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.upsert({
        where: { key: poolFeatureFlagKey },
        create: {
          key: poolFeatureFlagKey,
          enabled,
          description: 'NC pool routes feature gate (integration test)',
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
      const orgIds = [ownerOrgId, memberOrgId, otherOrgId];
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

  async function ensurePoolGateEnabled(): Promise<void> {
    await setGlobalPoolFlag(true);
    await enablePoolGateForTestTenants();
  }

  async function createPoolAs(
    orgId: string,
    userId: string,
    userRole: string,
    overrides?: Record<string, unknown>,
  ) {
    const payload = {
      pool_ref: makePoolRef(randomUUID().slice(0, 8)),
      commodity_category: 'COTTON_YARN',
      target_qty: 1000,
      qty_unit: 'KG',
      ...overrides,
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/tenant/network-commerce/pools',
      headers: authHeaders(orgId, userId, userRole),
      payload,
    });

    return { res, payload };
  }

  async function createPoolAsOwner(overrides?: Record<string, unknown>) {
    return createPoolAs(ownerOrgId, ownerUserId, 'OWNER', overrides);
  }

  async function createPoolAsOtherOrg(overrides?: Record<string, unknown>) {
    return createPoolAs(otherOrgId, otherUserId, 'OWNER', overrides);
  }

  async function openPoolAsOwner(poolId: string, reason: string = 'open for route integration') {
    return app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/open`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { reason },
    });
  }

  async function setPoolState(poolId: string, stateKey: string) {
    await withBypassForSeed(prisma, async tx => {
      const state = await tx.lifecycleState.findUnique({
        where: {
          entityType_stateKey: { entityType: 'POOL', stateKey },
        },
        select: { id: true },
      });

      if (!state) {
        throw new Error(`Missing lifecycle state: ${stateKey}`);
      }

      await tx.networkPool.update({
        where: { id: poolId },
        data: { lifecycleStateId: state.id },
      });
    });
  }

  async function createOpenPoolForJoinTests() {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);

    const createBody = create.res.json() as any;
    const poolId = createBody.data.id as string;
    createdPoolIds.add(poolId);

    const openRes = await openPoolAsOwner(poolId, 'open for join test');
    expect(openRes.statusCode).toBe(200);

    return poolId;
  }

  beforeAll(async () => {
    app = await buildApp();

    ownerOrgId = randomUUID();
    memberOrgId = randomUUID();
    otherOrgId = randomUUID();
    ownerUserId = randomUUID();
    memberUserId = randomUUID();
    otherUserId = randomUUID();

    await seedTenantForTest(ownerOrgId, 'nc-route-owner');
    await seedTenantForTest(memberOrgId, 'nc-route-member');
    await seedTenantForTest(otherOrgId, 'nc-route-other');

    await withBypassForSeed(prisma, async tx => {
      const row = await tx.featureFlag.findUnique({
        where: { key: poolFeatureFlagKey },
        select: { enabled: true, description: true, value: true },
      });
      originalPoolFeatureFlag = row;
    });
  });

  beforeEach(async () => {
    testRunId = randomUUID();
    await setGlobalPoolFlag(true);
    await enablePoolGateForTestTenants();
  });

  afterEach(async () => {
    const ids = [...createdPoolIds];
    createdPoolIds.clear();

    await withBypassForSeed(prisma, async tx => {
      if (ids.length > 0) {
        await tx.networkPoolMembership.deleteMany({ where: { poolId: { in: ids } } });
        await tx.networkPool.deleteMany({ where: { id: { in: ids } } });
      }

      await tx.tenantFeatureOverride.deleteMany({
        where: {
          key: poolFeatureFlagKey,
          tenantId: { in: [ownerOrgId, memberOrgId, otherOrgId] },
        },
      });
    }).catch(() => {
      // Best-effort cleanup for route tests.
    });

    // Restore global feature flag so concurrent test suites are not disrupted.
    await ensurePoolGateEnabled();
  });

  afterAll(async () => {
    await app.close();

    await withBypassForSeed(prisma, async tx => {
      await tx.networkPoolMembership.deleteMany({
        where: { orgId: { in: [ownerOrgId, memberOrgId, otherOrgId] } },
      });

      await tx.networkPool.deleteMany({
        where: {
          OR: [
            { orgId: { in: [ownerOrgId, memberOrgId, otherOrgId] } },
            { poolRef: { startsWith: 'ROUTE-HARNESS-' } },
          ],
        },
      });

      await tx.tenantFeatureOverride.deleteMany({
        where: {
          key: poolFeatureFlagKey,
          tenantId: { in: [ownerOrgId, memberOrgId, otherOrgId] },
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
      // Lifecycle logs are immutable and may prevent full tenant cleanup.
    });
  });

  // Feature gate (FGR-01..FGR-05)

  it('FGR-01 missing flag create -> 503 FEATURE_DISABLED and no row created', async () => {
    await removeGlobalPoolFlag();

    const poolRef = makePoolRef('MISSING-FLAG');
    const create = await createPoolAsOwner({ pool_ref: poolRef });

    expect(create.res.statusCode).toBe(503);
    expect((create.res.json() as any).error.code).toBe('FEATURE_DISABLED');

    const count = await withBypassForSeed(prisma, tx =>
      tx.networkPool.count({ where: { orgId: ownerOrgId, poolRef } }),
    );
    expect(count).toBe(0);
  });

  it('FGR-02 disabled flag open -> 503 FEATURE_DISABLED', async () => {
    await setGlobalPoolFlag(false);

    const open = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}/open`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { reason: 'flag disabled' },
    });

    expect(open.statusCode).toBe(503);
    expect((open.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('FGR-03 disabled flag join -> 503 FEATURE_DISABLED', async () => {
    await setGlobalPoolFlag(false);

    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 100, qty_unit: 'KG' },
    });

    expect(join.statusCode).toBe(503);
    expect((join.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('FGR-04 disabled flag read pool -> 503 FEATURE_DISABLED', async () => {
    await setGlobalPoolFlag(false);

    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(read.statusCode).toBe(503);
    expect((read.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('FGR-05 disabled flag read membership -> 503 FEATURE_DISABLED', async () => {
    await setGlobalPoolFlag(false);

    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}/membership`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(read.statusCode).toBe(503);
    expect((read.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  // Create pool (CPR-01..CPR-06)

  it('CPR-01 valid create -> 201 DRAFT', async () => {
    const { res } = await createPoolAsOwner();
    expect(res.statusCode).toBe(201);
    const body = res.json() as any;
    createdPoolIds.add(body.data.id);
    expect(body.data.lifecycle_state_key).toBe('DRAFT');
  });

  it('CPR-02 negative target_qty -> 400 INVALID_INPUT', async () => {
    const { res } = await createPoolAsOwner({ target_qty: -1 });
    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('CPR-03 missing commodity_category -> 400 INVALID_INPUT', async () => {
    const { res } = await createPoolAsOwner({ commodity_category: undefined });
    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('CPR-04 open_at >= close_at -> 400 INVALID_INPUT', async () => {
    const at = new Date().toISOString();
    const { res } = await createPoolAsOwner({ open_at: at, close_at: at });
    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('CPR-05 unauthenticated -> 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tenant/network-commerce/pools',
      payload: {
        pool_ref: makePoolRef('UNAUTH'),
        commodity_category: 'COTTON_YARN',
        target_qty: 100,
        qty_unit: 'KG',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('CPR-06 duplicate pool_ref same org -> 409', async () => {
    const poolRef = makePoolRef('DUP');

    const first = await createPoolAsOwner({ pool_ref: poolRef });
    expect(first.res.statusCode).toBe(201);
    const firstBody = first.res.json() as any;
    createdPoolIds.add(firstBody.data.id);

    const second = await createPoolAsOwner({ pool_ref: poolRef });
    expect(second.res.statusCode).toBe(409);
  });

  // Open pool (OPR-01..OPR-06)

  it('OPR-01 valid owner open -> 200 OPEN', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);
    const poolId = (create.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);

    const open = await openPoolAsOwner(poolId, 'owner opens pool');
    expect(open.statusCode).toBe(200);
    expect((open.json() as any).data.lifecycle_state_key).toBe('OPEN');
  });

  it('OPR-02 non-owner open -> 404 POOL_NOT_FOUND', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);
    const poolId = (create.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);

    const open = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/open`,
      headers: authHeaders(otherOrgId, otherUserId, 'MEMBER'),
      payload: { reason: 'non-owner attempt' },
    });

    expect(open.statusCode).toBe(404);
    expect((open.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('OPR-03 non-existent pool -> 404 POOL_NOT_FOUND', async () => {
    const open = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}/open`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { reason: 'missing pool' },
    });

    expect(open.statusCode).toBe(404);
    expect((open.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('OPR-04 already OPEN -> 422 INVALID_STATE', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);
    const poolId = (create.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);

    const firstOpen = await openPoolAsOwner(poolId, 'first open');
    expect(firstOpen.statusCode).toBe(200);

    const secondOpen = await openPoolAsOwner(poolId, 'second open');
    expect(secondOpen.statusCode).toBe(422);
    expect((secondOpen.json() as any).error.code).toBe('INVALID_STATE');
  });

  it('OPR-05 missing reason -> 400 INVALID_INPUT', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);
    const poolId = (create.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);

    const open = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/open`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: {},
    });

    expect(open.statusCode).toBe(400);
    expect((open.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('OPR-06 body contains actor_type -> 400 VALIDATION_ERROR', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);
    const poolId = (create.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);

    const open = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/open`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { reason: 'open', actor_type: 'TENANT_ADMIN' },
    });

    expect(open.statusCode).toBe(400);
    expect((open.json() as any).error.code).toBe('VALIDATION_ERROR');
  });

  // Join pool (JPR-01..JPR-07)

  it('JPR-01 join OPEN pool -> 201 PENDING', async () => {
    const poolId = await createOpenPoolForJoinTests();

    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 300, qty_unit: 'KG' },
    });

    expect(join.statusCode).toBe(201);
    expect((join.json() as any).data.status).toBe('PENDING');
  });

  it('JPR-02 join AGGREGATING pool -> 201', async () => {
    const poolId = await createOpenPoolForJoinTests();
    await setPoolState(poolId, 'AGGREGATING');

    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 250, qty_unit: 'KG' },
    });

    expect(join.statusCode).toBe(201);
    expect((join.json() as any).data.status).toBe('PENDING');
  });

  it('JPR-03 join DRAFT pool -> 422 INVALID_STATE', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);
    const poolId = (create.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);

    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 100, qty_unit: 'KG' },
    });

    expect(join.statusCode).toBe(422);
    expect((join.json() as any).error.code).toBe('INVALID_STATE');
  });

  it('JPR-04 negative declared_qty -> 400 INVALID_INPUT', async () => {
    const poolId = await createOpenPoolForJoinTests();

    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: -1, qty_unit: 'KG' },
    });

    expect(join.statusCode).toBe(400);
    expect((join.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('JPR-05 duplicate membership -> 409 DUPLICATE_MEMBERSHIP', async () => {
    const poolId = await createOpenPoolForJoinTests();

    const first = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 100, qty_unit: 'KG' },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 200, qty_unit: 'KG' },
    });

    expect(second.statusCode).toBe(409);
    expect((second.json() as any).error.code).toBe('DUPLICATE_MEMBERSHIP');
  });

  it('JPR-06 non-existent pool -> 404 POOL_NOT_FOUND', async () => {
    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 100, qty_unit: 'KG' },
    });

    expect(join.statusCode).toBe(404);
    expect((join.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('JPR-07 unauthenticated -> 401', async () => {
    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}/join`,
      payload: { declared_qty: 100, qty_unit: 'KG' },
    });

    expect(join.statusCode).toBe(401);
  });

  // Read pool (RPR-01..RPR-04)

  it('RPR-01 read own pool -> 200', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);
    const poolId = (create.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);

    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(read.statusCode).toBe(200);
    expect((read.json() as any).data.id).toBe(poolId);
  });

  it('RPR-02 read other org pool -> 404 POOL_NOT_FOUND', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);
    const poolId = (create.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);

    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}`,
      headers: authHeaders(otherOrgId, otherUserId, 'MEMBER'),
    });

    expect(read.statusCode).toBe(404);
    expect((read.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('RPR-03 read non-existent pool -> 404 POOL_NOT_FOUND', async () => {
    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(read.statusCode).toBe(404);
    expect((read.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('RPR-04 unauthenticated -> 401', async () => {
    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}`,
    });

    expect(read.statusCode).toBe(401);
  });

  // Read membership (MRP-01..MRP-05)

  it('MRP-01 read own membership -> 200', async () => {
    const poolId = await createOpenPoolForJoinTests();

    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 100, qty_unit: 'KG' },
    });
    expect(join.statusCode).toBe(201);

    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/membership`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(read.statusCode).toBe(200);
    expect((read.json() as any).data.pool_id).toBe(poolId);
  });

  it('MRP-02 read other org membership -> 404 POOL_MEMBERSHIP_NOT_FOUND', async () => {
    const poolId = await createOpenPoolForJoinTests();

    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 120, qty_unit: 'KG' },
    });
    expect(join.statusCode).toBe(201);

    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/membership`,
      headers: authHeaders(otherOrgId, otherUserId, 'MEMBER'),
    });

    expect(read.statusCode).toBe(404);
    expect((read.json() as any).error.code).toBe('POOL_MEMBERSHIP_NOT_FOUND');
  });

  it('MRP-03 membership missing -> 404 POOL_MEMBERSHIP_NOT_FOUND', async () => {
    const poolId = await createOpenPoolForJoinTests();

    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${poolId}/membership`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(read.statusCode).toBe(404);
    expect((read.json() as any).error.code).toBe('POOL_MEMBERSHIP_NOT_FOUND');
  });

  it('MRP-04 pool missing -> 404 route-consistent not-found', async () => {
    await ensurePoolGateEnabled();

    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}/membership`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(read.statusCode).toBe(404);
    const code = (read.json() as any).error.code;
    expect(['POOL_NOT_FOUND', 'POOL_MEMBERSHIP_NOT_FOUND']).toContain(code);
  });

  it('MRP-05 unauthenticated -> 401', async () => {
    const read = await app.inject({
      method: 'GET',
      url: `/api/tenant/network-commerce/pools/${randomUUID()}/membership`,
    });

    expect(read.statusCode).toBe(401);
  });

  // Discovery owner/joined list (DLR-01..DLR-23)

  it('DLR-01 owner list returns only caller-owned pools', async () => {
    await ensurePoolGateEnabled();

    const owned = await createPoolAsOwner({ commodity_category: 'COTTON_YARN' });
    expect(owned.res.statusCode).toBe(201);
    const ownedId = (owned.res.json() as any).data.id as string;
    createdPoolIds.add(ownedId);

    const other = await createPoolAsOtherOrg({ commodity_category: 'COTTON_YARN' });
    expect(other.res.statusCode).toBe(201);
    const otherId = (other.res.json() as any).data.id as string;
    createdPoolIds.add(otherId);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(list.statusCode).toBe(200);
    const items = ((list.json() as any).data.data ?? []) as Array<any>;
    expect(items.some(i => i.id === ownedId)).toBe(true);
    expect(items.some(i => i.id === otherId)).toBe(false);
  });

  it('DLR-02 owner list excludes pools owned by other orgs', async () => {
    await ensurePoolGateEnabled();

    const other = await createPoolAsOtherOrg({ commodity_category: 'WOOL' });
    expect(other.res.statusCode).toBe(201);
    const otherId = (other.res.json() as any).data.id as string;
    createdPoolIds.add(otherId);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(list.statusCode).toBe(200);
    const items = ((list.json() as any).data.data ?? []) as Array<any>;
    expect(items.find(i => i.id === otherId)).toBeUndefined();
  });

  it('DLR-03 owner list includes target_qty', async () => {
    const created = await createPoolAsOwner({ target_qty: 4321.123456 });
    expect(created.res.statusCode).toBe(201);
    const poolId = (created.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(list.statusCode).toBe(200);
    const item = (((list.json() as any).data.data ?? []) as Array<any>).find(i => i.id === poolId);
    expect(item).toBeTruthy();
    expect(item.target_qty).toBeTruthy();
  });

  it('DLR-04 owner list does not expose metadata/member_count/aggregate demand', async () => {
    await ensurePoolGateEnabled();

    const created = await createPoolAsOwner({ metadata: { confidential: true } });
    expect(created.res.statusCode).toBe(201);
    const poolId = (created.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(list.statusCode).toBe(200);
    const item = (((list.json() as any).data.data ?? []) as Array<any>).find(i => i.id === poolId);
    expect(item).toBeTruthy();
    expect(item.metadata).toBeUndefined();
    expect(item.member_count).toBeUndefined();
    expect(item.aggregate_declared_qty).toBeUndefined();
  });

  it('DLR-05 owner list pagination limit/offset works', async () => {
    for (let i = 0; i < 3; i += 1) {
      const created = await createPoolAsOwner({ pool_ref: makePoolRef(`OWN-PAGE-${i}-${randomUUID().slice(0, 4)}`) });
      expect(created.res.statusCode).toBe(201);
      createdPoolIds.add((created.res.json() as any).data.id as string);
    }

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools?limit=1&offset=1',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(list.statusCode).toBe(200);
    const payload = (list.json() as any).data;
    expect(payload.data.length).toBeLessThanOrEqual(1);
    expect(payload.pagination.limit).toBe(1);
    expect(payload.pagination.offset).toBe(1);
  });

  it('DLR-06 owner list filters by commodity_category', async () => {
    const cotton = await createPoolAsOwner({ commodity_category: 'COTTON_YARN' });
    expect(cotton.res.statusCode).toBe(201);
    createdPoolIds.add((cotton.res.json() as any).data.id as string);

    const wool = await createPoolAsOwner({ commodity_category: 'WOOL_YARN' });
    expect(wool.res.statusCode).toBe(201);
    createdPoolIds.add((wool.res.json() as any).data.id as string);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools?commodity_category=WOOL_YARN',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(list.statusCode).toBe(200);
    const items = ((list.json() as any).data.data ?? []) as Array<any>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every(i => i.commodity_category === 'WOOL_YARN')).toBe(true);
  });

  it('DLR-07 owner list filters by lifecycle_state_key', async () => {
    const opened = await createPoolAsOwner();
    expect(opened.res.statusCode).toBe(201);
    const openedId = (opened.res.json() as any).data.id as string;
    createdPoolIds.add(openedId);
    const openRes = await openPoolAsOwner(openedId, 'open for owner list filter');
    expect(openRes.statusCode).toBe(200);

    const draft = await createPoolAsOwner();
    expect(draft.res.statusCode).toBe(201);
    createdPoolIds.add((draft.res.json() as any).data.id as string);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools?lifecycle_state_key=OPEN',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(list.statusCode).toBe(200);
    const items = ((list.json() as any).data.data ?? []) as Array<any>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every(i => i.lifecycle_state_key === 'OPEN')).toBe(true);
  });

  it('DLR-08 owner list filters by qty_unit', async () => {
    const kg = await createPoolAsOwner({ qty_unit: 'KG' });
    expect(kg.res.statusCode).toBe(201);
    createdPoolIds.add((kg.res.json() as any).data.id as string);

    const mt = await createPoolAsOwner({ qty_unit: 'MT' });
    expect(mt.res.statusCode).toBe(201);
    createdPoolIds.add((mt.res.json() as any).data.id as string);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools?qty_unit=MT',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(list.statusCode).toBe(200);
    const items = ((list.json() as any).data.data ?? []) as Array<any>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every(i => i.qty_unit === 'MT')).toBe(true);
  });

  it('DLR-09 owner list invalid query returns 400 INVALID_INPUT', async () => {
    const invalidLimit = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools?limit=0',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });
    expect(invalidLimit.statusCode).toBe(400);
    expect((invalidLimit.json() as any).error.code).toBe('INVALID_INPUT');

    const invalidRange = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools?open_from=2026-01-02T00:00:00.000Z&open_to=2026-01-01T00:00:00.000Z',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });
    expect(invalidRange.statusCode).toBe(400);
    expect((invalidRange.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('DLR-10 owner list blocked by disabled/missing feature flag -> 503 FEATURE_DISABLED', async () => {
    await setGlobalPoolFlag(false);
    const disabled = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });
    expect(disabled.statusCode).toBe(503);
    expect((disabled.json() as any).error.code).toBe('FEATURE_DISABLED');

    await removeGlobalPoolFlag();
    const missing = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools',
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });
    expect(missing.statusCode).toBe(503);
    expect((missing.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('DLR-11 unauthenticated owner list returns 401', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools',
    });
    expect(list.statusCode).toBe(401);
  });

  it('DLR-12 joined list returns only pools where caller has membership', async () => {
    const poolA = await createOpenPoolForJoinTests();
    const joinA = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolA}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 100, qty_unit: 'KG' },
    });
    expect(joinA.statusCode).toBe(201);

    const poolBCreate = await createPoolAsOwner();
    expect(poolBCreate.res.statusCode).toBe(201);
    const poolB = (poolBCreate.res.json() as any).data.id as string;
    createdPoolIds.add(poolB);
    const poolBOpen = await openPoolAsOwner(poolB, 'open for non-joined control');
    expect(poolBOpen.statusCode).toBe(200);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(list.statusCode).toBe(200);
    const items = ((list.json() as any).data.data ?? []) as Array<any>;
    expect(items.some(i => i.id === poolA)).toBe(true);
    expect(items.some(i => i.id === poolB)).toBe(false);
  });

  it('DLR-13 joined list excludes pools where caller has no membership', async () => {
    const poolCreate = await createPoolAsOwner();
    expect(poolCreate.res.statusCode).toBe(201);
    const poolId = (poolCreate.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);
    const open = await openPoolAsOwner(poolId, 'open for exclusion check');
    expect(open.statusCode).toBe(200);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(list.statusCode).toBe(200);
    const items = ((list.json() as any).data.data ?? []) as Array<any>;
    expect(items.find(i => i.id === poolId)).toBeUndefined();
  });

  it('DLR-14 joined list includes caller own membership fields only', async () => {
    const poolId = await createOpenPoolForJoinTests();

    const memberJoin = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 210, qty_unit: 'KG' },
    });
    expect(memberJoin.statusCode).toBe(201);

    const otherJoin = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(otherOrgId, otherUserId, 'MEMBER'),
      payload: { declared_qty: 999, qty_unit: 'KG' },
    });
    expect(otherJoin.statusCode).toBe(201);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(list.statusCode).toBe(200);
    const item = (((list.json() as any).data.data ?? []) as Array<any>).find(i => i.id === poolId);
    expect(item).toBeTruthy();
    expect(item.membership_id).toBeTruthy();
    expect(item.membership_status).toBe('PENDING');
    expect(item.declared_qty).toBe('210');
    expect(item.membership_qty_unit).toBe('KG');
    expect(item.joined_at).toBeTruthy();
  });

  it('DLR-15 joined list does not expose target_qty', async () => {
    const poolId = await createOpenPoolForJoinTests();
    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 200, qty_unit: 'KG' },
    });
    expect(join.statusCode).toBe(201);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(list.statusCode).toBe(200);
    const item = (((list.json() as any).data.data ?? []) as Array<any>).find(i => i.id === poolId);
    expect(item).toBeTruthy();
    expect(item.target_qty).toBeUndefined();
  });

  it('DLR-16 joined list does not expose owner identity', async () => {
    const poolId = await createOpenPoolForJoinTests();
    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 200, qty_unit: 'KG' },
    });
    expect(join.statusCode).toBe(201);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(list.statusCode).toBe(200);
    const item = (((list.json() as any).data.data ?? []) as Array<any>).find(i => i.id === poolId);
    expect(item).toBeTruthy();
    expect(item.org_id).toBeUndefined();
    expect(item.owner_org_id).toBeUndefined();
    expect(item.owner_org_name).toBeUndefined();
  });

  it('DLR-17 joined list does not expose other member details', async () => {
    const poolId = await createOpenPoolForJoinTests();
    const memberJoin = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 120, qty_unit: 'KG' },
    });
    expect(memberJoin.statusCode).toBe(201);

    const otherJoin = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(otherOrgId, otherUserId, 'MEMBER'),
      payload: { declared_qty: 875, qty_unit: 'KG' },
    });
    expect(otherJoin.statusCode).toBe(201);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(list.statusCode).toBe(200);
    const item = (((list.json() as any).data.data ?? []) as Array<any>).find(i => i.id === poolId);
    expect(item).toBeTruthy();
    expect(item.member_list).toBeUndefined();
    expect(item.other_members).toBeUndefined();
    expect(item.other_member_details).toBeUndefined();
  });

  it('DLR-18 joined list does not expose member count / aggregate demand / metadata', async () => {
    const created = await createPoolAsOwner({ metadata: { shouldHide: true } });
    expect(created.res.statusCode).toBe(201);
    const poolId = (created.res.json() as any).data.id as string;
    createdPoolIds.add(poolId);
    const opened = await openPoolAsOwner(poolId, 'open for joined denylist checks');
    expect(opened.statusCode).toBe(200);

    const join = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/join`,
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
      payload: { declared_qty: 50, qty_unit: 'KG' },
    });
    expect(join.statusCode).toBe(201);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(list.statusCode).toBe(200);
    const item = (((list.json() as any).data.data ?? []) as Array<any>).find(i => i.id === poolId);
    expect(item).toBeTruthy();
    expect(item.member_count).toBeUndefined();
    expect(item.aggregate_declared_qty).toBeUndefined();
    expect(item.metadata).toBeUndefined();
    expect(item.allocation_pct).toBeUndefined();
    expect(item.allocated_qty).toBeUndefined();
  });

  it('DLR-19 joined list pagination works', async () => {
    for (let i = 0; i < 2; i += 1) {
      const created = await createPoolAsOwner({ pool_ref: makePoolRef(`JOIN-PAGE-${i}-${randomUUID().slice(0, 4)}`) });
      expect(created.res.statusCode).toBe(201);
      const poolId = (created.res.json() as any).data.id as string;
      createdPoolIds.add(poolId);
      const opened = await openPoolAsOwner(poolId, 'open for joined pagination');
      expect(opened.statusCode).toBe(200);
      const join = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/pools/${poolId}/join`,
        headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
        payload: { declared_qty: 10 + i, qty_unit: 'KG' },
      });
      expect(join.statusCode).toBe(201);
    }

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined?limit=1&offset=1',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(list.statusCode).toBe(200);
    const payload = (list.json() as any).data;
    expect(payload.data.length).toBeLessThanOrEqual(1);
    expect(payload.pagination.limit).toBe(1);
    expect(payload.pagination.offset).toBe(1);
  });

  it('DLR-20 joined list filters by commodity_category', async () => {
    const wool = await createPoolAsOwner({ commodity_category: 'WOOL_JOIN' });
    expect(wool.res.statusCode).toBe(201);
    const woolId = (wool.res.json() as any).data.id as string;
    createdPoolIds.add(woolId);
    expect((await openPoolAsOwner(woolId, 'open wool')).statusCode).toBe(200);

    const cotton = await createPoolAsOwner({ commodity_category: 'COTTON_JOIN' });
    expect(cotton.res.statusCode).toBe(201);
    const cottonId = (cotton.res.json() as any).data.id as string;
    createdPoolIds.add(cottonId);
    expect((await openPoolAsOwner(cottonId, 'open cotton')).statusCode).toBe(200);

    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/tenant/network-commerce/pools/${woolId}/join`,
          headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
          payload: { declared_qty: 10, qty_unit: 'KG' },
        })
      ).statusCode,
    ).toBe(201);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/tenant/network-commerce/pools/${cottonId}/join`,
          headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
          payload: { declared_qty: 20, qty_unit: 'KG' },
        })
      ).statusCode,
    ).toBe(201);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined?commodity_category=WOOL_JOIN',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(list.statusCode).toBe(200);
    const items = ((list.json() as any).data.data ?? []) as Array<any>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every(i => i.commodity_category === 'WOOL_JOIN')).toBe(true);
  });

  it('DLR-21 joined list filters by lifecycle_state_key', async () => {
    const openPool = await createPoolAsOwner();
    expect(openPool.res.statusCode).toBe(201);
    const openId = (openPool.res.json() as any).data.id as string;
    createdPoolIds.add(openId);
    expect((await openPoolAsOwner(openId, 'open for lifecycle filter')).statusCode).toBe(200);

    const aggPool = await createPoolAsOwner();
    expect(aggPool.res.statusCode).toBe(201);
    const aggId = (aggPool.res.json() as any).data.id as string;
    createdPoolIds.add(aggId);
    expect((await openPoolAsOwner(aggId, 'open before aggregating')).statusCode).toBe(200);
    await setPoolState(aggId, 'AGGREGATING');

    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/tenant/network-commerce/pools/${openId}/join`,
          headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
          payload: { declared_qty: 11, qty_unit: 'KG' },
        })
      ).statusCode,
    ).toBe(201);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/tenant/network-commerce/pools/${aggId}/join`,
          headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
          payload: { declared_qty: 22, qty_unit: 'KG' },
        })
      ).statusCode,
    ).toBe(201);

    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined?lifecycle_state_key=AGGREGATING',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });

    expect(list.statusCode).toBe(200);
    const items = ((list.json() as any).data.data ?? []) as Array<any>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every(i => i.lifecycle_state_key === 'AGGREGATING')).toBe(true);
  });

  it('DLR-22 joined list blocked by disabled/missing feature flag -> 503 FEATURE_DISABLED', async () => {
    await setGlobalPoolFlag(false);
    const disabled = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });
    expect(disabled.statusCode).toBe(503);
    expect((disabled.json() as any).error.code).toBe('FEATURE_DISABLED');

    await removeGlobalPoolFlag();
    const missing = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined',
      headers: authHeaders(memberOrgId, memberUserId, 'MEMBER'),
    });
    expect(missing.statusCode).toBe(503);
    expect((missing.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('DLR-23 unauthenticated joined list returns 401', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/api/tenant/network-commerce/pools/joined',
    });
    expect(list.statusCode).toBe(401);
  });

  // ── Pool Order (PORDER-01..08) ─────────────────────────────────────────────

  it('PORDER-01 ALLOCATED pool order -> 200 ORDERED', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);

    const createBody = create.res.json() as any;
    const poolId = createBody.data.id as string;
    createdPoolIds.add(poolId);

    await setPoolState(poolId, 'ALLOCATED');

    const order = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/order`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { reason: 'Pool fully allocated — triggering order' },
    });

    expect(order.statusCode).toBe(200);
    const orderBody = order.json() as any;
    expect(orderBody.data.lifecycle_state_key).toBe('ORDERED');
    expect(orderBody.data.id).toBe(poolId);
  });

  it('PORDER-02 non-ALLOCATED pool (DRAFT) -> 422 INVALID_STATE', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);

    const createBody = create.res.json() as any;
    const poolId = createBody.data.id as string;
    createdPoolIds.add(poolId);

    // Pool stays in DRAFT — no setPoolState call

    const order = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/order`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { reason: 'Attempting order from DRAFT' },
    });

    expect(order.statusCode).toBe(422);
    expect((order.json() as any).error.code).toBe('INVALID_STATE');
  });

  it('PORDER-03 other org cannot order owner pool -> 404 POOL_NOT_FOUND', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);

    const createBody = create.res.json() as any;
    const poolId = createBody.data.id as string;
    createdPoolIds.add(poolId);

    await setPoolState(poolId, 'ALLOCATED');

    const order = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/order`,
      headers: authHeaders(otherOrgId, otherUserId, 'OWNER'),
      payload: { reason: 'Cross-tenant attempt must be blocked' },
    });

    expect(order.statusCode).toBe(404);
    expect((order.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('PORDER-04 non-existent pool -> 404 POOL_NOT_FOUND', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000099';

    const order = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${fakeId}/order`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { reason: 'Order for non-existent pool' },
    });

    expect(order.statusCode).toBe(404);
    expect((order.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('PORDER-05 feature gate disabled -> 503 FEATURE_DISABLED', async () => {
    await setGlobalPoolFlag(false);

    const order = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/00000000-0000-0000-0000-000000000001/order`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { reason: 'Gate disabled test' },
    });

    expect(order.statusCode).toBe(503);
    expect((order.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('PORDER-06 missing reason -> 400 VALIDATION_ERROR', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);

    const createBody = create.res.json() as any;
    const poolId = createBody.data.id as string;
    createdPoolIds.add(poolId);

    const order = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/order`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: {},
    });

    expect(order.statusCode).toBe(400);
  });

  it('PORDER-07 body contains unknown field (strict) -> 400 VALIDATION_ERROR', async () => {
    const create = await createPoolAsOwner();
    expect(create.res.statusCode).toBe(201);

    const createBody = create.res.json() as any;
    const poolId = createBody.data.id as string;
    createdPoolIds.add(poolId);

    const order = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/${poolId}/order`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { reason: 'Valid reason', actor_type: 'TENANT_ADMIN' },
    });

    expect(order.statusCode).toBe(400);
  });

  it('PORDER-08 unauthenticated order -> 401', async () => {
    const order = await app.inject({
      method: 'POST',
      url: `/api/tenant/network-commerce/pools/00000000-0000-0000-0000-000000000001/order`,
      payload: { reason: 'Unauthenticated attempt' },
    });

    expect(order.statusCode).toBe(401);
  });
});
