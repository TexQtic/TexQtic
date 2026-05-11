/**
 * Integration Tests — Pool RFQ Supplier Invite Owner Routes
 * TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-ROUTE-001
 *
 * Covers:
 *   ORI-01..ORI-15  — Feature gate / auth / role (all 4 routes)
 *   ORI-16..ORI-30  — Validation (send + cancel bodies)
 *   ORI-31..ORI-36  — Service error mapping (send invite errors)
 *   ORI-37..ORI-45  — Success behavior (send, list, get)
 *   ORI-46..ORI-50  — Success behavior (cancel)
 *
 * OD-6: All owner invite routes require the 3-gate chain:
 *   ncPoolFeatureGateMiddleware → ncPoolRfqFeatureGateMiddleware
 *   → ncPoolSupplierInviteFeatureGateMiddleware
 *
 * Cleanup FK order:
 *   invites → rfq_lines → rfqs → snapshot_lines → snapshots
 *   → demand_lines → memberships → pools
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

      const rawOrgId     = request.headers['x-test-org-id'];
      const rawUserId    = request.headers['x-test-user-id'];
      const rawUserRole  = request.headers['x-test-user-role'];
      const orgId        = Array.isArray(rawOrgId)    ? rawOrgId[0]    : rawOrgId;
      const userId       = Array.isArray(rawUserId)   ? rawUserId[0]   : rawUserId;
      const userRole     = Array.isArray(rawUserRole) ? rawUserRole[0] : rawUserRole;

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

import poolRfqRoutes from './poolRfq.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(orgId: string, userId: string, userRole: string = 'OWNER') {
  return {
    'x-test-auth':      '1',
    'x-test-org-id':    orgId,
    'x-test-user-id':   userId,
    'x-test-user-role': userRole,
  };
}

describe.skipIf(!hasDb)('Network Commerce Pool RFQ Supplier Invite Owner Route Integration', () => {
  const poolFeatureFlagKey   = 'nc.procurement_pools.enabled';
  const rfqFeatureFlagKey    = 'nc.procurement_pools.rfq.enabled';
  const inviteFeatureFlagKey = 'nc.procurement_pools.supplier_invites.enabled';

  let app:            FastifyInstance;
  let ownerOrgId:     string;
  let otherOrgId:     string;
  let supplierOrgId:  string;
  let ownerUserId:    string;
  let testRunId:      string;

  let originalPoolFlagState:   { enabled: boolean; description: string | null; value: string | null } | null = null;
  let originalRfqFlagState:    { enabled: boolean; description: string | null; value: string | null } | null = null;
  let originalInviteFlagState: { enabled: boolean; description: string | null; value: string | null } | null = null;

  const createdPoolIds = new Set<string>();

  // ─── App Builder ────────────────────────────────────────────────────────────

  async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify();
    await fastify.register(poolRfqRoutes, { prefix: '/api/tenant/network-commerce/pools' });
    await fastify.ready();
    return fastify;
  }

  // ─── Naming Helpers ──────────────────────────────────────────────────────────

  function makePoolRef(tag: string): string {
    return `ORI-POOL-${testRunId}-${tag}`;
  }

  function makeLineRef(tag: string): string {
    return `ORI-LINE-${testRunId}-${tag}`;
  }

  // ─── Feature Flag Helpers ─────────────────────────────────────────────────────

  async function removeGlobalFlag(key: string): Promise<void> {
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.deleteMany({ where: { key } });
    });
  }

  async function ensureAllGatesEnabled(): Promise<void> {
    // Batch all 9 flag upserts into one withBypassForSeed transaction to reduce
    // Supabase pooler round-trips. Previously 6 separate transactions; batching
    // prevents hookTimeout under Supabase load at 50-test depth.
    // (recovery packet: TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-TEST-INFRA-RECOVERY-001)
    await withBypassForSeed(prisma, async tx => {
      for (const key of [poolFeatureFlagKey, rfqFeatureFlagKey, inviteFeatureFlagKey]) {
        await tx.featureFlag.upsert({
          where:  { key },
          create: { key, enabled: true, description: `ORI test — ${key}` },
          update: { enabled: true },
        });
      }
      for (const key of [poolFeatureFlagKey, rfqFeatureFlagKey, inviteFeatureFlagKey]) {
        for (const orgId of [ownerOrgId, otherOrgId, supplierOrgId]) {
          await tx.tenantFeatureOverride.upsert({
            where:  { tenantId_key: { tenantId: orgId, key } },
            create: { tenantId: orgId, key, enabled: true },
            update: { enabled: true },
          });
        }
      }
    });
  }

  // ─── Fixture Helpers ──────────────────────────────────────────────────────────

  /** Creates a pool in the given lifecycle state. Returns poolId. */
  async function createPoolFixture(
    orgId: string,
    stateKey: string = 'AGGREGATING',
  ): Promise<string> {
    return withBypassForSeed(prisma, async tx => {
      const state = await tx.lifecycleState.findUnique({
        where:  { entityType_stateKey: { entityType: 'POOL', stateKey } },
        select: { id: true },
      });
      if (!state) throw new Error(`Missing lifecycle state: POOL/${stateKey}`);

      const pool = await tx.networkPool.create({
        data: {
          id:                randomUUID(),
          orgId,
          poolRef:           makePoolRef(randomUUID().slice(0, 8)),
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

  /**
   * Creates the full chain needed to send an invite:
   *   pool (CLOSED_FOR_BIDS) + demand line (LOCKED_FOR_RFQ)
   *   + snapshot (CAPTURED) + snapshot line + RFQ (ISSUED).
   *
   * Returns { poolId, rfqId, snapshotId }.
   */
  async function createIssuedRfqFixture(orgId: string): Promise<{
    poolId:     string;
    rfqId:      string;
    snapshotId: string;
  }> {
    return withBypassForSeed(prisma, async tx => {
      // 1. Pool in CLOSED_FOR_BIDS
      const poolState = await tx.lifecycleState.findUnique({
        where:  { entityType_stateKey: { entityType: 'POOL', stateKey: 'CLOSED_FOR_BIDS' } },
        select: { id: true },
      });
      if (!poolState) throw new Error('Missing lifecycle state: POOL/CLOSED_FOR_BIDS');

      const poolId = randomUUID();
      await tx.networkPool.create({
        data: {
          id:                poolId,
          orgId,
          poolRef:           makePoolRef(randomUUID().slice(0, 8)),
          commodityCategory: 'COTTON_YARN',
          targetQty:         new Prisma.Decimal(1000),
          qtyUnit:           'KG',
          lifecycleStateId:  poolState.id,
          createdByUserId:   ownerUserId,
        },
      });
      createdPoolIds.add(poolId);

      // 2. Demand line in LOCKED_FOR_RFQ
      const lineRef = makeLineRef(randomUUID().slice(0, 8));
      const lineId  = randomUUID();
      await tx.networkPoolDemandLine.create({
        data: {
          id:                          lineId,
          ownerOrgId:                  orgId,
          poolId,
          lineRef,
          commodityCategory:           'COTTON_YARN',
          qty:                         new Prisma.Decimal(500),
          qtyUnit:                     'KG',
          status:                      'LOCKED_FOR_RFQ',
          lockedAt:                    new Date(),
          sourceType:                  'OWNER_DIRECT',
          normalizedFromMemberInput:   false,
          revisionNo:                  1,
        },
      });

      // 3. Snapshot in CAPTURED
      const snapshotId = randomUUID();
      await tx.networkPoolDemandSnapshot.create({
        data: {
          id:              snapshotId,
          ownerOrgId:      orgId,
          poolId,
          snapshotRef:     randomUUID(),
          snapshotVersion: 1,
          basis:           'RFQ_ISSUE',
          status:          'CAPTURED',
          capturedAt:      new Date(),
          lineCount:       1,
          totalQty:        new Prisma.Decimal(500),
          qtyUnit:         'KG',
        },
      });

      // 4. Snapshot line
      await tx.networkPoolDemandSnapshotLine.create({
        data: {
          id:                        randomUUID(),
          snapshotId,
          ownerOrgId:                orgId,
          poolId,
          demandLineId:              lineId,
          sourceLineRef:             lineRef,
          sourceRevisionNo:          1,
          commodityCategory:         'COTTON_YARN',
          qty:                       new Prisma.Decimal(500),
          qtyUnit:                   'KG',
          sourceType:                'OWNER_DIRECT',
          normalizedFromMemberInput: false,
        },
      });

      // 5. RFQ in ISSUED
      const rfqId = randomUUID();
      await tx.networkPoolRfq.create({
        data: {
          id:                 rfqId,
          ownerOrgId:         orgId,
          poolId,
          snapshotId,
          rfqRef:             randomUUID(),
          rfqVersion:         1,
          status:             'ISSUED',
          issueBasis:         'SNAPSHOT_LOCK',
          issuedAt:           new Date(),
          issuedByUserId:     ownerUserId,
          supplierInviteMode: 'INVITE_ONLY',
          lineCount:          1,
          totalQty:           new Prisma.Decimal(500),
          qtyUnit:            'KG',
        },
      });

      return { poolId, rfqId, snapshotId };
    });
  }

  /**
   * Creates a full invite fixture: issued RFQ chain + one PENDING invite.
   * Returns { poolId, rfqId, inviteId }.
   */
  async function createInviteFixture(
    ownerOrg: string,
    supplierOrg: string,
    overrides?: { status?: string; cancelledAt?: Date | null; acceptedAt?: Date | null; declinedAt?: Date | null },
  ): Promise<{ poolId: string; rfqId: string; inviteId: string }> {
    const { poolId, rfqId } = await createIssuedRfqFixture(ownerOrg);

    return withBypassForSeed(prisma, async tx => {
      const inviteId = randomUUID();
      await tx.networkPoolRfqSupplierInvite.create({
        data: {
          id:              inviteId,
          ownerOrgId:      ownerOrg,
          supplierOrgId:   supplierOrg,
          rfqId,
          poolId,
          inviteRef:       randomUUID(),
          status:          overrides?.status ?? 'PENDING',
          invitedAt:       new Date(),
          invitedByUserId: ownerUserId,
          cancelledAt:     overrides?.cancelledAt ?? null,
          acceptedAt:      overrides?.acceptedAt  ?? null,
          declinedAt:      overrides?.declinedAt  ?? null,
        },
      });

      return { poolId, rfqId, inviteId };
    });
  }

  // ─── beforeAll / beforeEach / afterEach / afterAll ──────────────────────────

  beforeAll(async () => {
    app = await buildApp();

    ownerOrgId    = randomUUID();
    otherOrgId    = randomUUID();
    supplierOrgId = randomUUID();
    ownerUserId   = randomUUID();

    await seedTenantForTest(ownerOrgId,    'ori-route-owner');
    await seedTenantForTest(otherOrgId,    'ori-route-other');
    await seedTenantForTest(supplierOrgId, 'ori-route-supplier');

    await withBypassForSeed(prisma, async tx => {
      for (const key of [poolFeatureFlagKey, rfqFeatureFlagKey, inviteFeatureFlagKey]) {
        const row = await tx.featureFlag.findUnique({
          where:  { key },
          select: { enabled: true, description: true, value: true },
        });
        if (key === poolFeatureFlagKey)   originalPoolFlagState   = row;
        if (key === rfqFeatureFlagKey)    originalRfqFlagState    = row;
        if (key === inviteFeatureFlagKey) originalInviteFlagState = row;
      }
    });
  });

  beforeEach(async () => {
    testRunId = randomUUID().slice(0, 8);
    await ensureAllGatesEnabled();
  });

  afterEach(async () => {
    const poolIds = [...createdPoolIds];
    createdPoolIds.clear();

    await withBypassForSeed(prisma, async tx => {
      if (poolIds.length > 0) {
        // Test-harness cleanup alignment with immutable DB semantics (recovery packet:
        // TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-TEST-INFRA-RECOVERY-001):
        //
        // network_pool_demand_snapshot_lines is immutable after insert — trigger
        // prevent_snapshot_line_mutation raises P0001 on any UPDATE or DELETE.
        // Attempting deleteMany on this table, or on any parent table whose FK has
        // onDelete:Cascade to it (network_pool_demand_snapshots, network_pool_demand_lines,
        // network_pools), causes the entire withBypassForSeed transaction to abort. Over 50
        // tests this accumulates un-returned connections and exhausts the Supabase pooler.
        //
        // Only delete rows not bound by the immutability constraint. Snapshot-scoped rows
        // (snapshot_lines, snapshots, demand_lines, pools) are left in DB — they are scoped
        // to test-run UUIDs and do not affect subsequent test correctness.
        await tx.networkPoolRfqSupplierInvite.deleteMany({ where: { poolId: { in: poolIds } } });
        await tx.networkPoolRfqLine.deleteMany({ where: { poolId: { in: poolIds } } });
        await tx.networkPoolRfq.deleteMany({ where: { poolId: { in: poolIds } } });
        await tx.networkPoolMembership.deleteMany({ where: { poolId: { in: poolIds } } });
        // networkPoolDemandSnapshotLine, networkPoolDemandSnapshot, networkPoolDemandLine,
        // and networkPool intentionally omitted — immutable trigger prevents cleanup.
      }

      await tx.tenantFeatureOverride.deleteMany({
        where: {
          key:      { in: [poolFeatureFlagKey, rfqFeatureFlagKey, inviteFeatureFlagKey] },
          tenantId: { in: [ownerOrgId, otherOrgId, supplierOrgId] },
        },
      });
    }).catch(() => {
      // Best-effort cleanup.
    });
    // ensureAllGatesEnabled() intentionally omitted here — beforeEach already
    // calls it before every test, so a trailing restore in afterEach is redundant.
    // Removing it saves one batched transaction per test (50 round-trips across this suite).
    // Ref: TEXQTIC-NC-TEST-INFRA-DB-INTEGRATION-PERFORMANCE-AUDIT-001
  });

  afterAll(async () => {
    await app.close();

    await withBypassForSeed(prisma, async tx => {
      const pools = await tx.networkPool.findMany({
        where: {
          OR: [
            { orgId: { in: [ownerOrgId, otherOrgId, supplierOrgId] } },
            { poolRef: { startsWith: 'ORI-POOL-' } },
          ],
        },
        select: { id: true },
      });
      const allPoolIds = pools.map((p: { id: string }) => p.id);

      if (allPoolIds.length > 0) {
        // Immutable snapshot-line guard: same constraint as afterEach.
        // Only delete rows not bound by the prevent_snapshot_line_mutation trigger.
        await tx.networkPoolRfqSupplierInvite.deleteMany({ where: { poolId: { in: allPoolIds } } });
        await tx.networkPoolRfqLine.deleteMany({ where: { poolId: { in: allPoolIds } } });
        await tx.networkPoolRfq.deleteMany({ where: { poolId: { in: allPoolIds } } });
        await tx.networkPoolMembership.deleteMany({ where: { poolId: { in: allPoolIds } } });
        // networkPoolDemandSnapshotLine, networkPoolDemandSnapshot, networkPoolDemandLine,
        // and networkPool intentionally omitted — immutable trigger prevents cleanup.
      }

      // Restore feature flag states
      for (const [key, original] of [
        [poolFeatureFlagKey,   originalPoolFlagState],
        [rfqFeatureFlagKey,    originalRfqFlagState],
        [inviteFeatureFlagKey, originalInviteFlagState],
      ] as const) {
        if (original) {
          await tx.featureFlag.upsert({
            where:  { key },
            create: { key, enabled: original.enabled, description: original.description, value: original.value },
            update: { enabled: original.enabled, description: original.description, value: original.value },
          });
        } else {
          await tx.featureFlag.deleteMany({ where: { key } });
        }
      }

      await tx.tenantFeatureOverride.deleteMany({
        where: {
          key:      { in: [poolFeatureFlagKey, rfqFeatureFlagKey, inviteFeatureFlagKey] },
          tenantId: { in: [ownerOrgId, otherOrgId, supplierOrgId] },
        },
      });
    }).catch(() => {
      // Best-effort final cleanup.
    });
  });

  // ─── Feature Gate / Auth / Role — Send Invite (ORI-01..ORI-06) ──────────────

  it('ORI-01 unauthenticated send invite -> 401', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: { 'x-test-auth': '0', 'x-test-org-id': ownerOrgId, 'x-test-user-id': ownerUserId },
      payload: { supplier_org_id: supplierOrgId },
    });

    expect(res.statusCode).toBe(401);
  });

  it('ORI-02 MEMBER role send invite -> 403 FORBIDDEN', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'MEMBER'),
      payload: { supplier_org_id: supplierOrgId },
    });

    expect(res.statusCode).toBe(403);
    expect((res.json() as any).error.code).toBe('FORBIDDEN');
  });

  it('ORI-03 pool flag disabled send invite -> 503 FEATURE_DISABLED', async () => {
    await removeGlobalFlag(poolFeatureFlagKey);

    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId },
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('ORI-04 rfq sub-flag disabled send invite -> 503 FEATURE_DISABLED', async () => {
    await removeGlobalFlag(rfqFeatureFlagKey);

    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId },
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('ORI-05 invite sub-flag disabled send invite -> 503 FEATURE_DISABLED', async () => {
    await removeGlobalFlag(inviteFeatureFlagKey);

    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId },
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('ORI-06 all flags on + OWNER -> handler reached (service-level error expected)', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId },
    });

    // Gate passed: expect service-level error, not gate/auth error
    expect(res.statusCode).not.toBe(503);
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).not.toBe(401);
  });

  // ─── Feature Gate / Auth — List + Get + Cancel (ORI-07..ORI-15) ─────────────

  it('ORI-07 unauthenticated list invites -> 401', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: { 'x-test-auth': '0', 'x-test-org-id': ownerOrgId, 'x-test-user-id': ownerUserId },
    });

    expect(res.statusCode).toBe(401);
  });

  it('ORI-08 MEMBER role list invites -> 403 FORBIDDEN', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'MEMBER'),
    });

    expect(res.statusCode).toBe(403);
    expect((res.json() as any).error.code).toBe('FORBIDDEN');
  });

  it('ORI-09 invite flag disabled list invites -> 503 FEATURE_DISABLED', async () => {
    await removeGlobalFlag(inviteFeatureFlagKey);

    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('ORI-10 unauthenticated get invite -> 401', async () => {
    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}`,
      headers: { 'x-test-auth': '0', 'x-test-org-id': ownerOrgId, 'x-test-user-id': ownerUserId },
    });

    expect(res.statusCode).toBe(401);
  });

  it('ORI-11 MEMBER role get invite -> 403 FORBIDDEN', async () => {
    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'MEMBER'),
    });

    expect(res.statusCode).toBe(403);
    expect((res.json() as any).error.code).toBe('FORBIDDEN');
  });

  it('ORI-12 invite flag disabled get invite -> 503 FEATURE_DISABLED', async () => {
    await removeGlobalFlag(inviteFeatureFlagKey);

    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  it('ORI-13 unauthenticated cancel invite -> 401', async () => {
    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: { 'x-test-auth': '0', 'x-test-org-id': ownerOrgId, 'x-test-user-id': ownerUserId },
      payload: {},
    });

    expect(res.statusCode).toBe(401);
  });

  it('ORI-14 MEMBER role cancel invite -> 403 FORBIDDEN', async () => {
    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'MEMBER'),
      payload: {},
    });

    expect(res.statusCode).toBe(403);
    expect((res.json() as any).error.code).toBe('FORBIDDEN');
  });

  it('ORI-15 invite flag disabled cancel invite -> 503 FEATURE_DISABLED', async () => {
    await removeGlobalFlag(inviteFeatureFlagKey);

    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: {},
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  // ─── Validation — Send Invite Body (ORI-16..ORI-25) ──────────────────────────

  it('ORI-16 send invite missing supplier_org_id -> 400 INVALID_INPUT', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('ORI-17 send invite supplier_org_id not a UUID -> 400 INVALID_INPUT', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: 'not-a-uuid' },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('ORI-18 send invite expires_at invalid string -> 400 INVALID_INPUT', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId, expires_at: 'not-a-date' },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('ORI-19 send invite valid expires_at ISO -> not 400', async () => {
    const poolId      = randomUUID();
    const rfqId       = randomUUID();
    const futureDate  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId, expires_at: futureDate },
    });

    // Validation passed; service-level error expected (pool not found)
    expect(res.statusCode).not.toBe(400);
    expect(res.statusCode).toBe(404); // POOL_NOT_FOUND
  });

  it('ORI-20 send invite supplier_message over 2000 chars -> 400 INVALID_INPUT', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId, supplier_message: 'x'.repeat(2001) },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('ORI-21 org_id in send invite body -> 400', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId, org_id: ownerOrgId },
    });

    expect(res.statusCode).toBe(400);
  });

  it('ORI-22 owner_org_id in send invite body -> 400', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId, owner_org_id: ownerOrgId },
    });

    expect(res.statusCode).toBe(400);
  });

  it('ORI-23 pool_id in send invite body -> 400', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId, pool_id: poolId },
    });

    expect(res.statusCode).toBe(400);
  });

  it('ORI-24 rfq_id in send invite body -> 400', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId, rfq_id: rfqId },
    });

    expect(res.statusCode).toBe(400);
  });

  it('ORI-25 unknown field in send invite body -> 400', async () => {
    const poolId = randomUUID();
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId, unexpected_field: 'value' },
    });

    expect(res.statusCode).toBe(400);
  });

  // ─── Validation — Cancel Invite Body (ORI-26..ORI-30) ────────────────────────

  it('ORI-26 cancel invite empty body -> not 400 (cancel_reason is optional)', async () => {
    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: {},
    });

    // Validation passed; service-level error expected (invite not found)
    expect(res.statusCode).not.toBe(400);
    expect(res.statusCode).toBe(404);
  });

  it('ORI-27 cancel invite cancel_reason over 2000 chars -> 400 INVALID_INPUT', async () => {
    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { cancel_reason: 'x'.repeat(2001) },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('ORI-28 status in cancel invite body -> 400', async () => {
    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { status: 'CANCELLED' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('ORI-29 org_id in cancel invite body -> 400', async () => {
    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { org_id: ownerOrgId },
    });

    expect(res.statusCode).toBe(400);
  });

  it('ORI-30 unknown field in cancel invite body -> 400', async () => {
    const poolId    = randomUUID();
    const rfqId     = randomUUID();
    const inviteId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { sneaky_field: 'value' },
    });

    expect(res.statusCode).toBe(400);
  });

  // ─── Service Error Mapping — Send Invite (ORI-31..ORI-36) ───────────────────

  it('ORI-31 pool not found -> 404 POOL_NOT_FOUND', async () => {
    const poolId = randomUUID(); // does not exist
    const rfqId  = randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId },
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  it('ORI-32 pool in AGGREGATING state -> 422 INVALID_STATE', async () => {
    // Pool in AGGREGATING (not CLOSED_FOR_BIDS) — sendInvite requires CLOSED_FOR_BIDS
    const poolId = await createPoolFixture(ownerOrgId, 'AGGREGATING');
    const rfqId  = randomUUID();

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId },
    });

    expect(res.statusCode).toBe(422);
    expect((res.json() as any).error.code).toBe('INVALID_STATE');
  });

  it('ORI-33 RFQ not found -> 404 RFQ_NOT_FOUND', async () => {
    // Pool in CLOSED_FOR_BIDS, but random rfqId (does not exist)
    const { poolId } = await createIssuedRfqFixture(ownerOrgId);
    const rfqId      = randomUUID(); // does not exist

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId },
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('RFQ_NOT_FOUND');
  });

  it('ORI-34 supplier org not found or inactive -> 400 INVALID_INPUT', async () => {
    const { poolId, rfqId } = await createIssuedRfqFixture(ownerOrgId);
    const nonExistentOrgId  = randomUUID(); // not in organizations table

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: nonExistentOrgId },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('ORI-35 owner org invited as own supplier -> 400 INVALID_INPUT', async () => {
    const { poolId, rfqId } = await createIssuedRfqFixture(ownerOrgId);

    // ownerOrgId is ACTIVE in organizations (seeded) but self-invite is rejected
    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: ownerOrgId },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as any).error.code).toBe('INVALID_INPUT');
  });

  it('ORI-36 duplicate invite (same rfq + supplier) -> 409 SUPPLIER_INVITE_ALREADY_SENT', async () => {
    // OD-1: second invite for same (rfq, supplier) is rejected
    const { poolId, rfqId } = await createInviteFixture(ownerOrgId, supplierOrgId);

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId },
    });

    expect(res.statusCode).toBe(409);
    expect((res.json() as any).error.code).toBe('SUPPLIER_INVITE_ALREADY_SENT');
  });

  // ─── Success Behavior — Send Invite (ORI-37..ORI-42) ─────────────────────────

  it('ORI-37 send invite success -> 201', async () => {
    const { poolId, rfqId } = await createIssuedRfqFixture(ownerOrgId);

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId },
    });

    expect(res.statusCode).toBe(201);
    expect((res.json() as any).success).toBe(true);
  });

  it('ORI-38 send invite response DTO shape (OD-5: no metadataInternalJson)', async () => {
    const { poolId, rfqId } = await createIssuedRfqFixture(ownerOrgId);

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { supplier_org_id: supplierOrgId, supplier_message: 'Please respond' },
    });

    expect(res.statusCode).toBe(201);
    const data = (res.json() as any).data;

    // Required DTO fields
    expect(data.id).toBeDefined();
    expect(data.owner_org_id).toBe(ownerOrgId);
    expect(data.supplier_org_id).toBe(supplierOrgId);
    expect(data.rfq_id).toBe(rfqId);
    expect(data.pool_id).toBe(poolId);
    expect(data.invite_ref).toBeDefined();
    expect(data.status).toBe('PENDING');
    expect(data.invited_at).toBeDefined();
    expect(data.supplier_message).toBe('Please respond');
    expect(data.accepted_at).toBeNull();
    expect(data.declined_at).toBeNull();
    expect(data.cancelled_at).toBeNull();

    // OD-5: internal fields must NOT be present
    expect(data.metadata_internal_json).toBeUndefined();
    expect(data.metadataInternalJson).toBeUndefined();
  });

  it('ORI-39 list invites empty pool RFQ -> 200, empty array', async () => {
    const { poolId, rfqId } = await createIssuedRfqFixture(ownerOrgId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(res.statusCode).toBe(200);
    expect((res.json() as any).success).toBe(true);
    expect(Array.isArray((res.json() as any).data)).toBe(true);
    expect((res.json() as any).data).toHaveLength(0);
  });

  it('ORI-40 list invites after sendInvite -> returns 1 record', async () => {
    const { poolId, rfqId, inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(res.statusCode).toBe(200);
    const data = (res.json() as any).data as any[];
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.some((r: any) => r.id === inviteId)).toBe(true);
  });

  it('ORI-41 list invites scoped to org (cross-tenant isolation)', async () => {
    // ownerOrgId has an invite; otherOrgId has no invite for same RFQ
    const { poolId, rfqId } = await createInviteFixture(ownerOrgId, supplierOrgId);

    // otherOrgId authenticates but the pool and RFQ belong to ownerOrgId
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(otherOrgId, ownerUserId, 'OWNER'),
    });

    // Returns empty array (not 403 / not leaking cross-tenant data)
    expect(res.statusCode).toBe(200);
    expect((res.json() as any).data).toHaveLength(0);
  });

  it('ORI-42 ADMIN role can send invite -> 201', async () => {
    const { poolId, rfqId } = await createIssuedRfqFixture(ownerOrgId);
    const adminUserId       = randomUUID();

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
      headers: authHeaders(ownerOrgId, adminUserId, 'ADMIN'),
      payload: { supplier_org_id: supplierOrgId },
    });

    // ADMIN role must not be blocked (role gate: userRole.includes('ADMIN') || userRole === 'OWNER')
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).toBe(201);
  });

  // ─── Success Behavior — Get Invite (ORI-43..ORI-45) ──────────────────────────

  it('ORI-43 get invite success -> 200 with correct shape', async () => {
    const { poolId, rfqId, inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(res.statusCode).toBe(200);
    const data = (res.json() as any).data;

    expect(data.id).toBe(inviteId);
    expect(data.owner_org_id).toBe(ownerOrgId);
    expect(data.supplier_org_id).toBe(supplierOrgId);
    expect(data.rfq_id).toBe(rfqId);
    expect(data.pool_id).toBe(poolId);
    expect(data.status).toBe('PENDING');
    // OD-5: no internal fields
    expect(data.metadata_internal_json).toBeUndefined();
    expect(data.metadataInternalJson).toBeUndefined();
  });

  it('ORI-44 get invite cross-tenant -> 404 SUPPLIER_INVITE_NOT_FOUND (non-leaking)', async () => {
    const { poolId, rfqId, inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

    // otherOrgId does not own this invite — must not leak its existence
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}`,
      headers: authHeaders(otherOrgId, ownerUserId, 'OWNER'),
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('SUPPLIER_INVITE_NOT_FOUND');
  });

  it('ORI-45 get invite with wrong rfqId in path -> 404 SUPPLIER_INVITE_NOT_FOUND', async () => {
    const { poolId, inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);
    const wrongRfqId           = randomUUID(); // invite's actual rfqId does not match

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${wrongRfqId}/invites/${inviteId}`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('SUPPLIER_INVITE_NOT_FOUND');
  });

  // ─── Success Behavior — Cancel Invite (ORI-46..ORI-50) ───────────────────────

  it('ORI-46 cancel PENDING invite -> 200, status=CANCELLED', async () => {
    const { poolId, rfqId, inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect((res.json() as any).success).toBe(true);
    expect((res.json() as any).data.status).toBe('CANCELLED');
    expect((res.json() as any).data.cancelled_at).not.toBeNull();
  });

  it('ORI-47 cancel invite with cancel_reason -> 200, reason preserved', async () => {
    const { poolId, rfqId, inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: { cancel_reason: 'No longer required' },
    });

    expect(res.statusCode).toBe(200);
    expect((res.json() as any).data.cancel_reason).toBe('No longer required');
    expect((res.json() as any).data.status).toBe('CANCELLED');
  });

  it('ORI-48 cancel already-CANCELLED invite -> 422 INVALID_TRANSITION', async () => {
    // OD-2: CANCELLED is terminal — cannot cancel again
    const { poolId, rfqId, inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId, {
      status:      'CANCELLED',
      cancelledAt: new Date(),
    });

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: {},
    });

    expect(res.statusCode).toBe(422);
    expect((res.json() as any).error.code).toBe('INVALID_TRANSITION');
  });

  it('ORI-49 cancel invite wrong org -> 404 SUPPLIER_INVITE_NOT_FOUND (non-leaking)', async () => {
    const { poolId, rfqId, inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(otherOrgId, ownerUserId, 'OWNER'),
      payload: {},
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('SUPPLIER_INVITE_NOT_FOUND');
  });

  it('ORI-50 cancel invite response has no metadataInternalJson (OD-5)', async () => {
    const { poolId, rfqId, inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

    const res = await app.inject({
      method:  'POST',
      url:     `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
      headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const data = (res.json() as any).data;
    expect(data.metadata_internal_json).toBeUndefined();
    expect(data.metadataInternalJson).toBeUndefined();
  });
});
