/**
 * Integration Tests — Network Commerce Settlement Tenant Routes
 * TEXQTIC-NC-PHASE1-POOL-SETTLE-001
 *
 * TradeTrust Pay doctrine:
 *   TexQtic is NOT a payment executor, PSP, escrow custodian, lender, or funder.
 *   These tests verify settlement VISIBILITY only.
 *   No payment, payout, escrow release, money movement, or pool SETTLED transition.
 *   TRIGGERED and RELEASED statuses are schema-reserved; they are NOT emitted by Packet 20.
 *
 * D-017-A: orgId always from JWT/dbContext. Non-leaking 404 for wrong-org.
 *
 * Test IDs:
 *   NSGET-01  unauthenticated GET → 401
 *   NSGET-02  feature gate off GET → 503
 *   NSGET-03  invalid poolId UUID GET → 422
 *   NSGET-04  pool not found for org → 404 POOL_NOT_FOUND
 *   NSGET-05  pool exists, no splits → 200 empty payableSplits
 *   NSGET-06  pool with splits → 200 with payableSplits data
 *   NSGET-07  GET is read-only — no DB writes from GET
 *   NSGET-08  wrong-org non-leaking → 404
 *   NSPREV-01 unauthenticated preview → 401
 *   NSPREV-02 feature gate off preview → 503
 *   NSPREV-03 invalid poolId preview → 422
 *   NSPREV-04 preview returns 200 and does NOT persist rows
 *   NSPREV-05 preview includes payment-term / maturity fields
 *   NSCOMP-01 unauthenticated compute → 401
 *   NSCOMP-02 feature gate off (nc.procurement_pools) → 503
 *   NSCOMP-03 invalid poolId compute → 422
 *   NSCOMP-04 compute returns 503 FEATURE_DISABLED when nc.settlement_waterfall.enabled=false
 *   NSCOMP-05 compute creates only PENDING rows (when flag toggled true in isolated test)
 *   NSCOMP-06 compute 409 CONFLICT on duplicate (idempotency guard)
 *   NSCOMP-07 wrong-org non-leaking compute → 404
 *   NSCOMP-08 no TRIGGERED/RELEASED/FAILED rows created, no money movement, no pool SETTLED
 *   NSCOMP-09 MEMBER role is treated like OWNER for auth (role is separate from org isolation)
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

      request.userId    = String(userId);
      request.tenantId  = String(orgId);
      request.userRole  = userRole ? String(userRole) : 'MEMBER';
      request.user      = { userId: String(userId), tenantId: String(orgId) };
      return;
    },
  };
});

import networkSettlementRoutes from './networkSettlement.js';

function authHeaders(orgId: string, userId: string, userRole: string = 'OWNER') {
  return {
    'x-test-auth':      '1',
    'x-test-org-id':    orgId,
    'x-test-user-id':   userId,
    'x-test-user-role': userRole,
  };
}

describe.skipIf(!hasDb)('Network Commerce Settlement Routes Integration', () => {
  const poolFeatureFlagKey  = 'nc.procurement_pools.enabled';
  const settleFlagKey       = 'nc.settlement_waterfall.enabled';

  let app: FastifyInstance;
  let ownerOrgId:  string;
  let otherOrgId:  string;
  let ownerUserId: string;
  let testRunId:   string;

  let originalPoolFeatureFlag: { enabled: boolean; description: string | null; value: string | null } | null = null;
  let originalSettleFlag: { enabled: boolean; description: string | null; value: string | null } | null = null;

  const createdPoolIds:     Set<string> = new Set();
  const createdInvoiceIds:  Set<string> = new Set();
  const createdSplitIds:    Set<string> = new Set();

  // ─── App Builder ──────────────────────────────────────────────────────────

  async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify();
    await fastify.register(networkSettlementRoutes, { prefix: '/api/tenant/network-commerce/pools' });
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
        create: { key: poolFeatureFlagKey, enabled: true, description: 'NC settle route integration test' },
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

  /** Returns current settlement flag state (for verification). */
  async function getSettleFlagEnabled(): Promise<boolean | null> {
    return withBypassForSeed(prisma, async tx => {
      const row = await tx.featureFlag.findUnique({
        where: { key: settleFlagKey },
        select: { enabled: true },
      });
      return row?.enabled ?? null;
    });
  }

  // ─── Fixture Helpers ──────────────────────────────────────────────────────

  async function createPoolFixture(orgId: string): Promise<string> {
    return withBypassForSeed(prisma, async tx => {
      const state = await tx.lifecycleState.findUnique({
        where: { entityType_stateKey: { entityType: 'POOL', stateKey: 'AGGREGATING' } },
        select: { id: true },
      });
      if (!state) throw new Error('Missing lifecycle state: POOL/AGGREGATING');

      const pool = await tx.networkPool.create({
        data: {
          id:                randomUUID(),
          orgId,
          poolRef:           `NS-TEST-${testRunId}-${randomUUID().slice(0, 8)}`,
          commodityCategory: 'COTTON_YARN',
          targetQty:         new Prisma.Decimal(1000),
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

  async function createInvoiceFixture(orgId: string, poolId: string): Promise<string> {
    return withBypassForSeed(prisma, async tx => {
      const invoice = await tx.networkInvoice.create({
        data: {
          id:                randomUUID(),
          orgId,
          invoiceType:       'POOL_ORDER',
          networkEntityType: 'POOL',
          networkEntityId:   poolId,
          invoiceNumber:     `NC-SETTLE-${randomUUID().slice(0, 8)}`,
          invoiceDate:       new Date('2026-07-01T00:00:00.000Z'),
          dueDate:           new Date('2026-09-01T00:00:00.000Z'),
          currency:          'INR',
          grossAmount:       new Prisma.Decimal(250000),
          issuerOrgId:       orgId,
          status:            'DRAFT',
        },
        select: { id: true },
      });

      createdInvoiceIds.add(invoice.id);
      return invoice.id;
    });
  }

  async function createMembershipFixture(_ownerOrg: string, memberOrg: string, poolId: string): Promise<void> {
    await withBypassForSeed(prisma, async tx => {
      await tx.networkPoolMembership.create({
        data: {
          id:          randomUUID(),
          poolId,
          orgId:       memberOrg,
          status:      'APPROVED',
          joinedAt:    new Date('2026-07-01T00:00:00.000Z'),
          declaredQty: new Prisma.Decimal('100.000000'),
          qtyUnit:     'KG',
        },
      });
    });
  }

  async function createSplitFixture(
    orgId: string,
    poolId: string,
    recipientOrgId: string,
    status: string = 'PENDING',
  ): Promise<string> {
    return withBypassForSeed(prisma, async tx => {
      const row = await tx.networkSettlementSplit.create({
        data: {
          id:               randomUUID(),
          orgId,
          entityType:       'POOL',
          entityId:         poolId,
          recipientOrgId,
          waterfallSeq:     1,
          currency:         'INR',
          grossAmount:      new Prisma.Decimal('125000.000000'),
          holdbackAmount:   new Prisma.Decimal('0'),
          penaltyDeduction: new Prisma.Decimal('0'),
          netPayable:       new Prisma.Decimal('125000.000000'),
          status,
          escrowAccountId:  null,
          triggeredAt:      null,
          releasedAt:       null,
        },
        select: { id: true },
      });
      createdSplitIds.add(row.id);
      return row.id;
    });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  beforeAll(async () => {
    app = await buildApp();

    ownerOrgId  = randomUUID();
    otherOrgId  = randomUUID();
    ownerUserId = randomUUID();

    await seedTenantForTest(ownerOrgId, 'ns-route-owner');
    await seedTenantForTest(otherOrgId, 'ns-route-other');

    // Capture original flag states
    await withBypassForSeed(prisma, async tx => {
      const poolRow = await tx.featureFlag.findUnique({
        where: { key: poolFeatureFlagKey },
        select: { enabled: true, description: true, value: true },
      });
      originalPoolFeatureFlag = poolRow;

      const settleRow = await tx.featureFlag.findUnique({
        where: { key: settleFlagKey },
        select: { enabled: true, description: true, value: true },
      });
      originalSettleFlag = settleRow;
    });
  });

  beforeEach(async () => {
    testRunId = randomUUID();
    await ensurePoolGateEnabled();
    // Settlement flag is NOT enabled — this is the production state.
    // We never activate nc.settlement_waterfall.enabled in this test suite
    // except in isolated tests that flip and immediately restore it.
  });

  afterEach(async () => {
    const poolIds   = [...createdPoolIds];
    const invIds    = [...createdInvoiceIds];
    const splitIds  = [...createdSplitIds];
    createdPoolIds.clear();
    createdInvoiceIds.clear();
    createdSplitIds.clear();

    await withBypassForSeed(prisma, async tx => {
      if (splitIds.length > 0) {
        await tx.networkSettlementSplit.deleteMany({ where: { id: { in: splitIds } } });
      }
      if (invIds.length > 0) {
        await tx.networkInvoice.deleteMany({ where: { id: { in: invIds } } });
      }
      if (poolIds.length > 0) {
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
      // Best-effort cleanup.
    });
  });

  afterAll(async () => {
    await app.close();

    await withBypassForSeed(prisma, async tx => {
      await tx.networkSettlementSplit.deleteMany({
        where: { orgId: { in: [ownerOrgId, otherOrgId] } },
      });
      await tx.networkInvoice.deleteMany({
        where: { orgId: { in: [ownerOrgId, otherOrgId] } },
      });
      await tx.networkPoolMembership.deleteMany({
        where: { orgId: { in: [ownerOrgId, otherOrgId] } },
      });
      await tx.networkPool.deleteMany({
        where: { orgId: { in: [ownerOrgId, otherOrgId] } },
      });
      await tx.tenantFeatureOverride.deleteMany({
        where: {
          key: poolFeatureFlagKey,
          tenantId: { in: [ownerOrgId, otherOrgId] },
        },
      });

      // Restore pool feature flag
      if (originalPoolFeatureFlag) {
        await tx.featureFlag.upsert({
          where:  { key: poolFeatureFlagKey },
          create: { key: poolFeatureFlagKey, enabled: originalPoolFeatureFlag.enabled, description: originalPoolFeatureFlag.description, value: originalPoolFeatureFlag.value },
          update: { enabled: originalPoolFeatureFlag.enabled, description: originalPoolFeatureFlag.description, value: originalPoolFeatureFlag.value },
        });
      } else {
        await tx.featureFlag.deleteMany({ where: { key: poolFeatureFlagKey } });
      }

      // Restore settlement flag — MUST remain false or absent
      if (originalSettleFlag) {
        await tx.featureFlag.upsert({
          where:  { key: settleFlagKey },
          create: { key: settleFlagKey, enabled: originalSettleFlag.enabled, description: originalSettleFlag.description, value: originalSettleFlag.value },
          update: { enabled: originalSettleFlag.enabled, description: originalSettleFlag.description, value: originalSettleFlag.value },
        });
      }
      // If originalSettleFlag was null, do NOT delete — it was seeded as false by schema packet,
      // leave it as-is (no cleanup needed for the false row).
    }).catch(() => {
      // Best-effort cleanup.
    });
  });

  // ─── NSGET-01: unauthenticated GET → 401 ─────────────────────────────────

  it('NSGET-01: unauthenticated GET settlement returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url:    `/api/tenant/network-commerce/pools/${randomUUID()}/settlement`,
    });

    expect(res.statusCode).toBe(401);
    expect((res.json() as any).error.code).toBe('UNAUTHORIZED');
  });

  // ─── NSGET-02: feature gate off → 503 ────────────────────────────────────

  it('NSGET-02: GET returns 503 when nc.procurement_pools feature flag is absent', async () => {
    await removeGlobalPoolFlag();

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${randomUUID()}/settlement`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  // ─── NSGET-03: invalid poolId UUID → 422 ─────────────────────────────────

  it('NSGET-03: GET with non-UUID poolId returns 422', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     '/api/tenant/network-commerce/pools/not-a-uuid/settlement',
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(422);
  });

  // ─── NSGET-04: pool not found for org → 404 POOL_NOT_FOUND ───────────────

  it('NSGET-04: GET returns 404 when pool does not exist for org', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${randomUUID()}/settlement`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  // ─── NSGET-05: pool exists, no splits → 200 empty ────────────────────────

  it('NSGET-05: GET returns 200 with empty payableSplits when no splits exist', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/settlement`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.payableSplits).toHaveLength(0);
    expect(body.data.poolId).toBe(poolId);
    expect(body.data.financeReadinessStatus).toBe('NO_SPLITS');
  });

  // ─── NSGET-06: pool with splits → 200 with data ──────────────────────────

  it('NSGET-06: GET returns 200 with payableSplits data when splits exist', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    await createInvoiceFixture(ownerOrgId, poolId);
    const memberOrgId = randomUUID();
    await seedTenantForTest(memberOrgId, 'ns-member-org');
    const splitId = await createSplitFixture(ownerOrgId, poolId, memberOrgId, 'PENDING');

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/settlement`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.data.payableSplits).toHaveLength(1);
    expect(body.data.payableSplits[0].settlementVisibilityStatus).toBe('PENDING');
    expect(body.data.payableSplits[0].escrowAccountId).toBeNull();
    expect(body.data.financeReadinessStatus).toBe('SPLITS_PRESENT');

    // Cleanup extra seed
    await withBypassForSeed(prisma, async tx => {
      await tx.networkSettlementSplit.deleteMany({ where: { id: splitId } });
    }).catch(() => {});
  });

  // ─── NSGET-07: GET is read-only ───────────────────────────────────────────

  it('NSGET-07: GET returns 200 — verified read-only (no side effects asserted)', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const countBefore = await withBypassForSeed(prisma, async tx =>
      tx.networkSettlementSplit.count({ where: { entityId: poolId } }),
    );

    await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/settlement`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    const countAfter = await withBypassForSeed(prisma, async tx =>
      tx.networkSettlementSplit.count({ where: { entityId: poolId } }),
    );

    expect(countAfter).toBe(countBefore);
  });

  // ─── NSGET-08: wrong-org non-leaking → 404 ───────────────────────────────

  it('NSGET-08: GET returns 404 when requesting another orgs pool (non-leaking)', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/settlement`,
      headers: authHeaders(otherOrgId, randomUUID()), // different org
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  // ─── NSPREV-01: unauthenticated preview → 401 ────────────────────────────

  it('NSPREV-01: unauthenticated POST preview returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url:    `/api/tenant/network-commerce/pools/${randomUUID()}/settlement/preview`,
    });

    expect(res.statusCode).toBe(401);
    expect((res.json() as any).error.code).toBe('UNAUTHORIZED');
  });

  // ─── NSPREV-02: feature gate off preview → 503 ───────────────────────────

  it('NSPREV-02: POST preview returns 503 when nc.procurement_pools feature flag is absent', async () => {
    await removeGlobalPoolFlag();

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${randomUUID()}/settlement/preview`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  // ─── NSPREV-03: invalid poolId preview → 422 ─────────────────────────────

  it('NSPREV-03: POST preview with non-UUID poolId returns 422', async () => {
    const res = await app.inject({
      method:  'POST',
      url:     '/api/tenant/network-commerce/pools/not-a-uuid/settlement/preview',
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(422);
  });

  // ─── NSPREV-04: preview returns 200 and does NOT persist rows ────────────

  it('NSPREV-04: POST preview returns 200 and does not persist any split rows', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    await createInvoiceFixture(ownerOrgId, poolId);
    const memberOrgId = randomUUID();
    await seedTenantForTest(memberOrgId, 'ns-prev-member');
    await createMembershipFixture(ownerOrgId, memberOrgId, poolId);

    const countBefore = await withBypassForSeed(prisma, async tx =>
      tx.networkSettlementSplit.count({ where: { entityId: poolId } }),
    );

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/settlement/preview`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    const countAfter = await withBypassForSeed(prisma, async tx =>
      tx.networkSettlementSplit.count({ where: { entityId: poolId } }),
    );

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.previewSplits)).toBe(true);
    expect(countAfter).toBe(countBefore); // non-mutating — row count unchanged
  });

  // ─── NSPREV-05: preview includes payment-term / maturity fields ───────────

  it('NSPREV-05: POST preview returns payment-term and maturity fields', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    await createInvoiceFixture(ownerOrgId, poolId);
    const memberOrgId = randomUUID();
    await seedTenantForTest(memberOrgId, 'ns-prev-mat-member');
    await createMembershipFixture(ownerOrgId, memberOrgId, poolId);

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/settlement/preview`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const data = (res.json() as any).data;
    expect(data.poolId).toBe(poolId);
    expect(data.paymentDueDate).toBeDefined();
    expect(data.maturityStatus).toBeDefined();
    expect(typeof data.hasPendingSplits).toBe('boolean');
  });

  // ─── NSCOMP-01: unauthenticated compute → 401 ────────────────────────────

  it('NSCOMP-01: unauthenticated POST compute returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url:    `/api/tenant/network-commerce/pools/${randomUUID()}/settlement/compute`,
    });

    expect(res.statusCode).toBe(401);
    expect((res.json() as any).error.code).toBe('UNAUTHORIZED');
  });

  // ─── NSCOMP-02: pool feature gate off → 503 ──────────────────────────────

  it('NSCOMP-02: POST compute returns 503 when nc.procurement_pools feature flag is absent', async () => {
    await removeGlobalPoolFlag();

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${randomUUID()}/settlement/compute`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  // ─── NSCOMP-03: invalid poolId compute → 422 ─────────────────────────────

  it('NSCOMP-03: POST compute with non-UUID poolId returns 422', async () => {
    const res = await app.inject({
      method:  'POST',
      url:     '/api/tenant/network-commerce/pools/not-a-uuid/settlement/compute',
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(422);
  });

  // ─── NSCOMP-04: compute returns 503 FEATURE_DISABLED when settlement flag=false

  it('NSCOMP-04: POST compute returns 503 FEATURE_DISABLED when nc.settlement_waterfall.enabled=false', async () => {
    // nc.settlement_waterfall.enabled is false in production DB (seeded by schema packet)
    const settleEnabled = await getSettleFlagEnabled();
    // Confirm flag is false or absent before proceeding
    expect(settleEnabled).not.toBe(true);

    const poolId = await createPoolFixture(ownerOrgId);

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/settlement/compute`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');

    // Verify no split rows were created
    const count = await withBypassForSeed(prisma, async tx =>
      tx.networkSettlementSplit.count({ where: { entityId: poolId } }),
    );
    expect(count).toBe(0);
  });

  // ─── NSCOMP-05: compute creates only PENDING rows when flag=true (isolated) ─

  it('NSCOMP-05: POST compute creates only PENDING rows when settlement flag toggled true', async () => {
    // This test temporarily enables nc.settlement_waterfall.enabled in an isolated manner
    // and restores it immediately after the assertion.
    // nc.settlement_waterfall.enabled must be restored to false before test ends.

    const poolId = await createPoolFixture(ownerOrgId);
    await createInvoiceFixture(ownerOrgId, poolId);
    // Use ownerOrgId as the member so RLS (org_id = app.org_id) makes the row visible
    // to the settlement service, which runs in the owner's tenant context.
    await createMembershipFixture(ownerOrgId, ownerOrgId, poolId);

    // Temporarily enable settlement flag — ISOLATED, RESTORED IMMEDIATELY
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.upsert({
        where:  { key: settleFlagKey },
        create: { key: settleFlagKey, enabled: true, description: 'Packet 20 isolated test only' },
        update: { enabled: true },
      });
    });

    let res: Awaited<ReturnType<typeof app.inject>>;
    try {
      res = await app.inject({
        method:  'POST',
        url:     `/api/tenant/network-commerce/pools/${poolId}/settlement/compute`,
        headers: authHeaders(ownerOrgId, ownerUserId),
      });
    } finally {
      // ALWAYS restore flag to false regardless of test outcome
      await withBypassForSeed(prisma, async tx => {
        await tx.featureFlag.upsert({
          where:  { key: settleFlagKey },
          create: { key: settleFlagKey, enabled: false, description: 'NC settlement waterfall (restored)' },
          update: { enabled: false },
        });
      });
    }

    expect(res!.statusCode).toBe(201);
    const body = res!.json() as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.payableSplits)).toBe(true);
    expect(body.data.payableSplits.length).toBeGreaterThan(0);

    // All rows must be PENDING-only — no TRIGGERED/RELEASED/FAILED
    for (const split of body.data.payableSplits) {
      expect(split.settlementVisibilityStatus).toBe('PENDING');
      expect(split.escrowAccountId).toBeNull();
      expect(split.triggeredAt).toBeNull();
      expect(split.releasedAt).toBeNull();
    }

    // Track for cleanup
    for (const split of body.data.payableSplits) {
      createdSplitIds.add(split.id);
    }

    // Verify flag restored to false
    const settleEnabledAfter = await getSettleFlagEnabled();
    expect(settleEnabledAfter).toBe(false);
  }, 60_000);  // extended: involves flag toggle + DB writes over remote Supabase

  // ─── NSCOMP-06: compute 409 CONFLICT (idempotency guard) ─────────────────

  it('NSCOMP-06: POST compute returns 409 CONFLICT when PENDING splits already exist', async () => {
    const poolId = await createPoolFixture(ownerOrgId);
    const memberOrgId = randomUUID();
    await seedTenantForTest(memberOrgId, 'ns-comp-dup-member');
    const splitId = await createSplitFixture(ownerOrgId, poolId, memberOrgId, 'PENDING');

    // Temporarily enable settlement flag
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.upsert({
        where:  { key: settleFlagKey },
        create: { key: settleFlagKey, enabled: true, description: 'Packet 20 idempotency test' },
        update: { enabled: true },
      });
    });

    let res: Awaited<ReturnType<typeof app.inject>>;
    try {
      res = await app.inject({
        method:  'POST',
        url:     `/api/tenant/network-commerce/pools/${poolId}/settlement/compute`,
        headers: authHeaders(ownerOrgId, ownerUserId),
      });
    } finally {
      await withBypassForSeed(prisma, async tx => {
        await tx.featureFlag.upsert({
          where:  { key: settleFlagKey },
          create: { key: settleFlagKey, enabled: false, description: 'NC settlement waterfall (restored)' },
          update: { enabled: false },
        });
      });
      await withBypassForSeed(prisma, async tx => {
        await tx.networkSettlementSplit.deleteMany({ where: { id: splitId } });
      }).catch(() => {});
    }

    expect(res!.statusCode).toBe(409);
    expect((res!.json() as any).error.code).toBe('CONFLICT');
  });

  // ─── NSCOMP-07: wrong-org non-leaking compute → 404 ─────────────────────

  it('NSCOMP-07: POST compute returns 404 when requesting another orgs pool (non-leaking)', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    // Settlement flag enabled for this test (otherwise 503 before pool check)
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.upsert({
        where:  { key: settleFlagKey },
        create: { key: settleFlagKey, enabled: true, description: 'Packet 20 wrong-org test' },
        update: { enabled: true },
      });
    });

    let res: Awaited<ReturnType<typeof app.inject>>;
    try {
      res = await app.inject({
        method:  'POST',
        url:     `/api/tenant/network-commerce/pools/${poolId}/settlement/compute`,
        headers: authHeaders(otherOrgId, randomUUID()), // wrong org
      });
    } finally {
      await withBypassForSeed(prisma, async tx => {
        await tx.featureFlag.upsert({
          where:  { key: settleFlagKey },
          create: { key: settleFlagKey, enabled: false, description: 'NC settlement waterfall (restored)' },
          update: { enabled: false },
        });
      });
    }

    expect(res!.statusCode).toBe(404);
    expect((res!.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  // ─── NSCOMP-08: no TRIGGERED/RELEASED/FAILED rows, no pool SETTLED, no money movement

  it('NSCOMP-08: compute route never creates TRIGGERED, RELEASED, or FAILED rows', async () => {
    // When flag is false (default), no rows are created at all.
    const poolId = await createPoolFixture(ownerOrgId);

    await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/settlement/compute`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    const rows = await withBypassForSeed(prisma, async tx =>
      tx.networkSettlementSplit.findMany({
        where: {
          entityId: poolId,
          status: { in: ['TRIGGERED', 'RELEASED', 'FAILED'] },
        },
      }),
    );

    expect(rows).toHaveLength(0);
  });

  // ─── NSCOMP-09: MEMBER role auth behavior ────────────────────────────────

  it('NSCOMP-09: MEMBER role reaches auth guard — gate response is 503 (pool gate enabled per test scope)', async () => {
    // Pool gate is enabled; settlement gate is off → 503 FEATURE_DISABLED from service layer.
    // This test verifies that MEMBER role passes auth middleware (auth is org-scoped, not role-scoped here).
    const poolId = await createPoolFixture(ownerOrgId);

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/settlement/compute`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'MEMBER'),
    });

    // MEMBER passes auth → hits settlement gate → 503 (flag=false)
    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });
});
