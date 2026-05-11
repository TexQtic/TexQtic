/**
 * Integration Tests — Pool RFQ Supplier Invite Supplier Routes
 * TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-ROUTE-001
 */

import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

import { prisma } from '../../db/prisma.js';
import { withBypassForSeed } from '../../lib/database-context.js';
import { hasDb } from '../../__tests__/helpers/dbGate.js';
import { seedTenantForTest } from '../../__tests__/helpers/seedRls.js';
import poolRfqRoutes from './poolRfq.js';
import poolRfqSupplierInvitesRoutes from './poolRfqSupplierInvites.js';

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

function authHeaders(orgId: string, userId: string, role: string = 'MEMBER') {
  return {
    'x-test-auth': '1',
    'x-test-org-id': orgId,
    'x-test-user-id': userId,
    'x-test-user-role': role,
  };
}

function assertSupplierSafeShape(record: Record<string, unknown>) {
  expect(record['metadataInternalJson']).toBeUndefined();
  expect(record['metadata_internal_json']).toBeUndefined();
  expect(record['owner_org_id']).toBeUndefined();
  expect(record['cancel_reason']).toBeUndefined();
  expect(record['lines']).toBeUndefined();
  expect(record['rfq_lines']).toBeUndefined();
  expect(record['snapshot_lines']).toBeUndefined();
  expect(record['member_identities']).toBeUndefined();
  expect(record['member_org_ids']).toBeUndefined();
  expect(record['per_member_quantities']).toBeUndefined();
  expect(record['quote_amount']).toBeUndefined();
  expect(record['award_amount']).toBeUndefined();
  expect(record['order_id']).toBeUndefined();
  expect(record['settlement_id']).toBeUndefined();
}

describe.skipIf(!hasDb)(
  'Network Commerce Supplier Invite Supplier Route Integration',
  () => {
    const poolFeatureFlagKey = 'nc.procurement_pools.enabled';
    const rfqFeatureFlagKey = 'nc.procurement_pools.rfq.enabled';
    const inviteFeatureFlagKey = 'nc.procurement_pools.supplier_invites.enabled';

    let app: FastifyInstance;
    let ownerOrgId: string;
    let supplierOrgId: string;
    let supplierOrg2Id: string;
    let otherOrgId: string;
    let supplierUserId: string;
    let ownerUserId: string;
    let testRunId: string;

    let originalPoolFlagState: { enabled: boolean; description: string | null; value: string | null } | null = null;
    let originalRfqFlagState: { enabled: boolean; description: string | null; value: string | null } | null = null;
    let originalInviteFlagState: { enabled: boolean; description: string | null; value: string | null } | null = null;

    const createdPoolIds = new Set<string>();

    async function buildApp(): Promise<FastifyInstance> {
      const fastify = Fastify();
      await fastify.register(poolRfqRoutes, { prefix: '/api/tenant/network-commerce/pools' });
      await fastify.register(poolRfqSupplierInvitesRoutes, { prefix: '/api/tenant/network-commerce' });
      await fastify.ready();
      return fastify;
    }

    function makePoolRef(tag: string): string {
      return `SRI-POOL-${testRunId}-${tag}`;
    }

    function makeLineRef(tag: string): string {
      return `SRI-LINE-${testRunId}-${tag}`;
    }

    async function setGlobalFlag(key: string, enabled: boolean): Promise<void> {
      await withBypassForSeed(prisma, async tx => {
        await tx.featureFlag.upsert({
          where: { key },
          create: { key, enabled, description: `SRI test - ${key}` },
          update: { enabled },
        });
      });
    }

    async function enableFlagForTenants(key: string, enabled: boolean): Promise<void> {
      await withBypassForSeed(prisma, async tx => {
        for (const orgId of [ownerOrgId, supplierOrgId, supplierOrg2Id, otherOrgId]) {
          await tx.tenantFeatureOverride.upsert({
            where: { tenantId_key: { tenantId: orgId, key } },
            create: { tenantId: orgId, key, enabled },
            update: { enabled },
          });
        }
      });
    }

    async function ensureDefaultFlagsEnabled(): Promise<void> {
      await setGlobalFlag(poolFeatureFlagKey, true);
      await setGlobalFlag(rfqFeatureFlagKey, true);
      await setGlobalFlag(inviteFeatureFlagKey, true);
      await enableFlagForTenants(poolFeatureFlagKey, true);
      await enableFlagForTenants(rfqFeatureFlagKey, true);
      await enableFlagForTenants(inviteFeatureFlagKey, true);
    }

    async function createIssuedRfqFixture(orgId: string): Promise<{ poolId: string; rfqId: string }> {
      return withBypassForSeed(prisma, async tx => {
        const poolState = await tx.lifecycleState.findUnique({
          where: { entityType_stateKey: { entityType: 'POOL', stateKey: 'CLOSED_FOR_BIDS' } },
          select: { id: true },
        });
        if (!poolState) throw new Error('Missing lifecycle state: POOL/CLOSED_FOR_BIDS');

        const poolId = randomUUID();
        await tx.networkPool.create({
          data: {
            id: poolId,
            orgId,
            poolRef: makePoolRef(randomUUID().slice(0, 8)),
            commodityCategory: 'COTTON_YARN',
            targetQty: new Prisma.Decimal(1000),
            qtyUnit: 'KG',
            lifecycleStateId: poolState.id,
            createdByUserId: ownerUserId,
          },
        });
        createdPoolIds.add(poolId);

        const lineRef = makeLineRef(randomUUID().slice(0, 8));
        const lineId = randomUUID();
        await tx.networkPoolDemandLine.create({
          data: {
            id: lineId,
            ownerOrgId: orgId,
            poolId,
            lineRef,
            commodityCategory: 'COTTON_YARN',
            qty: new Prisma.Decimal(500),
            qtyUnit: 'KG',
            status: 'LOCKED_FOR_RFQ',
            lockedAt: new Date(),
            sourceType: 'OWNER_DIRECT',
            normalizedFromMemberInput: false,
            revisionNo: 1,
          },
        });

        const snapshotId = randomUUID();
        await tx.networkPoolDemandSnapshot.create({
          data: {
            id: snapshotId,
            ownerOrgId: orgId,
            poolId,
            snapshotRef: randomUUID(),
            snapshotVersion: 1,
            basis: 'RFQ_ISSUE',
            status: 'CAPTURED',
            capturedAt: new Date(),
            lineCount: 1,
            totalQty: new Prisma.Decimal(500),
            qtyUnit: 'KG',
          },
        });

        const rfqId = randomUUID();
        await tx.networkPoolRfq.create({
          data: {
            id: rfqId,
            ownerOrgId: orgId,
            poolId,
            snapshotId,
            rfqRef: randomUUID(),
            rfqVersion: 1,
            status: 'ISSUED',
            issueBasis: 'SNAPSHOT_LOCK',
            issuedAt: new Date(),
            issuedByUserId: ownerUserId,
            supplierInviteMode: 'INVITE_ONLY',
            lineCount: 1,
            totalQty: new Prisma.Decimal(500),
            qtyUnit: 'KG',
          },
        });

        return { poolId, rfqId };
      });
    }

    async function createInviteFixture(
      ownerOrg: string,
      supplierOrg: string,
      overrides?: {
        status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
        acceptedAt?: Date | null;
        declinedAt?: Date | null;
        cancelledAt?: Date | null;
        expiresAt?: Date | null;
        declineReason?: string | null;
      },
    ): Promise<{ poolId: string; rfqId: string; inviteId: string }> {
      const { poolId, rfqId } = await createIssuedRfqFixture(ownerOrg);
      return withBypassForSeed(prisma, async tx => {
        const inviteId = randomUUID();
        await tx.networkPoolRfqSupplierInvite.create({
          data: {
            id: inviteId,
            ownerOrgId: ownerOrg,
            supplierOrgId: supplierOrg,
            rfqId,
            poolId,
            inviteRef: randomUUID(),
            status: overrides?.status ?? 'PENDING',
            invitedAt: new Date(),
            invitedByUserId: ownerUserId,
            acceptedAt: overrides?.acceptedAt ?? null,
            declinedAt: overrides?.declinedAt ?? null,
            cancelledAt: overrides?.cancelledAt ?? null,
            expiresAt: overrides?.expiresAt ?? null,
            declineReason: overrides?.declineReason ?? null,
          },
        });
        return { poolId, rfqId, inviteId };
      });
    }

    beforeAll(async () => {
      app = await buildApp();

      ownerOrgId = randomUUID();
      supplierOrgId = randomUUID();
      supplierOrg2Id = randomUUID();
      otherOrgId = randomUUID();
      supplierUserId = randomUUID();
      ownerUserId = randomUUID();

      await seedTenantForTest(ownerOrgId, 'sri-owner');
      await seedTenantForTest(supplierOrgId, 'sri-supplier-1');
      await seedTenantForTest(supplierOrg2Id, 'sri-supplier-2');
      await seedTenantForTest(otherOrgId, 'sri-other');

      await withBypassForSeed(prisma, async tx => {
        originalPoolFlagState = await tx.featureFlag.findUnique({
          where: { key: poolFeatureFlagKey },
          select: { enabled: true, description: true, value: true },
        });
        originalRfqFlagState = await tx.featureFlag.findUnique({
          where: { key: rfqFeatureFlagKey },
          select: { enabled: true, description: true, value: true },
        });
        originalInviteFlagState = await tx.featureFlag.findUnique({
          where: { key: inviteFeatureFlagKey },
          select: { enabled: true, description: true, value: true },
        });
      });
    });

    beforeEach(async () => {
      testRunId = randomUUID().slice(0, 8);
      await ensureDefaultFlagsEnabled();
    });

    afterEach(async () => {
      await withBypassForSeed(prisma, async tx => {
        const poolIds = Array.from(createdPoolIds);
        if (poolIds.length > 0) {
          await tx.networkPoolRfqSupplierInvite.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolRfqLine.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolRfq.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolDemandSnapshot.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolDemandLine.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolMembership.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPool.deleteMany({ where: { id: { in: poolIds } } });
          createdPoolIds.clear();
        }

        await tx.tenantFeatureOverride.deleteMany({
          where: {
            key: { in: [poolFeatureFlagKey, rfqFeatureFlagKey, inviteFeatureFlagKey] },
            tenantId: { in: [ownerOrgId, supplierOrgId, supplierOrg2Id, otherOrgId] },
          },
        });
      });
    });

    afterAll(async () => {
      await app.close();

      await withBypassForSeed(prisma, async tx => {
        for (const [key, original] of [
          [poolFeatureFlagKey, originalPoolFlagState],
          [rfqFeatureFlagKey, originalRfqFlagState],
          [inviteFeatureFlagKey, originalInviteFlagState],
        ] as const) {
          if (original) {
            await tx.featureFlag.upsert({
              where: { key },
              create: {
                key,
                enabled: original.enabled,
                description: original.description,
                value: original.value,
              },
              update: {
                enabled: original.enabled,
                description: original.description,
                value: original.value,
              },
            });
          } else {
            await tx.featureFlag.deleteMany({ where: { key } });
          }
        }
      });
    });

    it('SRI-01 unauthenticated request returns 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tenant/network-commerce/supplier-rfq-invites',
      });

      expect(res.statusCode).toBe(401);
      expect((res.json() as any).error.code).toBe('UNAUTHORIZED');
    });

    it('SRI-02 supplier invite feature gate disabled returns 503', async () => {
      await setGlobalFlag(inviteFeatureFlagKey, false);

      const res = await app.inject({
        method: 'GET',
        url: '/api/tenant/network-commerce/supplier-rfq-invites',
        headers: authHeaders(supplierOrgId, supplierUserId),
      });

      expect(res.statusCode).toBe(503);
      expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
    });

    it('SRI-03 parent pool/RFQ flags do not block supplier routes when invite flag is enabled', async () => {
      await setGlobalFlag(poolFeatureFlagKey, false);
      await setGlobalFlag(rfqFeatureFlagKey, false);
      await setGlobalFlag(inviteFeatureFlagKey, true);
      await enableFlagForTenants(inviteFeatureFlagKey, true);

      const res = await app.inject({
        method: 'GET',
        url: '/api/tenant/network-commerce/supplier-rfq-invites',
        headers: authHeaders(supplierOrgId, supplierUserId),
      });

      expect(res.statusCode).toBe(200);
      expect((res.json() as any).success).toBe(true);
      expect(Array.isArray((res.json() as any).data)).toBe(true);
    });

    it('SRI-04 list returns own invites only', { timeout: 15000 }, async () => {
      const mine = await createInviteFixture(ownerOrgId, supplierOrgId);
      const other = await createInviteFixture(ownerOrgId, supplierOrg2Id);

      const res = await app.inject({
        method: 'GET',
        url: '/api/tenant/network-commerce/supplier-rfq-invites',
        headers: authHeaders(supplierOrgId, supplierUserId),
      });

      expect(res.statusCode).toBe(200);
      const rows = (res.json() as any).data as Array<Record<string, unknown>>;
      expect(rows.some(r => r['id'] === mine.inviteId)).toBe(true);
      expect(rows.some(r => r['id'] === other.inviteId)).toBe(false);
    });

    it('SRI-05 view own invite returns 200', { timeout: 15000 }, async () => {
      const { inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });

      expect(res.statusCode).toBe(200);
      expect((res.json() as any).success).toBe(true);
      expect((res.json() as any).data.id).toBe(inviteId);
    });

    it('SRI-06 wrong supplier receives non-leaking 404', { timeout: 15000 }, async () => {
      const { inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}`,
        headers: authHeaders(supplierOrg2Id, supplierUserId),
      });

      expect(res.statusCode).toBe(404);
      expect((res.json() as any).error.code).toBe('SUPPLIER_INVITE_NOT_FOUND');
    });

    it('SRI-07 accept pending invite succeeds', { timeout: 15000 }, async () => {
      const { inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/accept`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { note: 'We accept' },
      });

      expect(res.statusCode).toBe(200);
      expect((res.json() as any).data.status).toBe('ACCEPTED');
    });

    it('SRI-08 decline pending invite succeeds', { timeout: 15000 }, async () => {
      const { inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/decline`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { declineReason: 'Not feasible' },
      });

      expect(res.statusCode).toBe(200);
      expect((res.json() as any).data.status).toBe('DECLINED');
      expect((res.json() as any).data.decline_reason).toBeUndefined();
    });

    it('SRI-09 invalid transitions return 422', { timeout: 15000 }, async () => {
      const { inviteId: acceptedId } = await createInviteFixture(ownerOrgId, supplierOrgId, {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      });

      let res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${acceptedId}/accept`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: {},
      });
      expect(res.statusCode).toBe(422);
      expect((res.json() as any).error.code).toBe('INVALID_TRANSITION');

      const { inviteId: expiredId } = await createInviteFixture(ownerOrgId, supplierOrgId, {
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 60_000),
      });

      res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${expiredId}/decline`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: {},
      });
      expect(res.statusCode).toBe(422);
      expect((res.json() as any).error.code).toBe('INVALID_TRANSITION');
    });

    it('SRI-10 strict body validation rejects forbidden/unknown fields', { timeout: 15000 }, async () => {
      const { inviteId: acceptId } = await createInviteFixture(ownerOrgId, supplierOrgId);
      let res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${acceptId}/accept`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { status: 'ACCEPTED' },
      });
      expect(res.statusCode).toBe(400);
      expect((res.json() as any).success).toBe(false);

      const { inviteId: declineId } = await createInviteFixture(ownerOrgId, supplierOrgId);
      res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${declineId}/decline`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { random_field: 'x' },
      });
      expect(res.statusCode).toBe(400);
      expect((res.json() as any).success).toBe(false);
    });

    it('SRI-11 privacy contract: supplier responses do not expose internal/member/other supplier data', {
      timeout: 20000,
    }, async () => {
      const first = await createInviteFixture(ownerOrgId, supplierOrgId);
      const second = await createInviteFixture(ownerOrgId, supplierOrgId);
      await createInviteFixture(ownerOrgId, supplierOrg2Id);

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/tenant/network-commerce/supplier-rfq-invites',
        headers: authHeaders(supplierOrgId, supplierUserId),
      });

      expect(listRes.statusCode).toBe(200);
      const listRows = (listRes.json() as any).data as Array<Record<string, unknown>>;
      expect(listRows.length).toBeGreaterThanOrEqual(2);
      for (const row of listRows) {
        assertSupplierSafeShape(row);
      }
      expect(listRows.some(r => r['id'] === first.inviteId)).toBe(true);
      expect(listRows.some(r => r['id'] === second.inviteId)).toBe(true);
      expect(listRows.every(r => r['supplier_org_id'] === undefined)).toBe(true);

      const viewRes = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${first.inviteId}`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });
      expect(viewRes.statusCode).toBe(200);
      const viewRow = (viewRes.json() as any).data as Record<string, unknown>;
      assertSupplierSafeShape(viewRow);
    });
  },
);
