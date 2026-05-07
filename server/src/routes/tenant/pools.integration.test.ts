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

  async function createPoolAsOwner(overrides?: Record<string, unknown>) {
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
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload,
    });

    return { res, payload };
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
});
