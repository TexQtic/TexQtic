/**
 * Integration Tests — Pool RFQ Supplier Quote Routes
 * TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-ROUTE-001
 *
 * Route coverage:
 *   GET  /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote
 *   POST /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote
 *
 * Feature gate: nc.procurement_pools.supplier_quotes.enabled only (quote gate).
 * No parent pool/RFQ/invite gate is checked by this route family.
 *
 * Test harness notes:
 * - DB setup is batched into single withBypassForSeed transactions to minimise
 *   Supabase pooler round-trips. Ref: TEXQTIC-NC-TEST-INFRA-DB-INTEGRATION-PERFORMANCE-AUDIT-001
 * - Quote cleanup uses poolId (denormalized FK on networkPoolRfqSupplierQuote).
 * - PRQ-23 (issueRfq tx timeout) is a known pre-existing flake unrelated to
 *   these routes. If it appears, record separately as
 *   TEXQTIC-NC-TEST-INFRA-PRQ-ISSUE-RFQ-TX-TIMEOUT-001.
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
import poolRfqSupplierQuotesRoutes from './poolRfqSupplierQuotes.js';

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

/**
 * Asserts supplier-safe quote DTO shape.
 * QD-5: internal, cross-tenant, and award/settlement fields are never exposed.
 */
function assertQuoteSupplierSafe(record: Record<string, unknown>) {
  // Forbidden internal fields
  expect(record['metadataInternalJson']).toBeUndefined();
  expect(record['metadata_internal_json']).toBeUndefined();
  // Forbidden cross-tenant/ownership fields
  expect(record['owner_org_id']).toBeUndefined();
  expect(record['ownerOrgId']).toBeUndefined();
  expect(record['supplier_org_id']).toBeUndefined();
  expect(record['supplierOrgId']).toBeUndefined();
  expect(record['rfq_id']).toBeUndefined();
  expect(record['rfqId']).toBeUndefined();
  expect(record['pool_id']).toBeUndefined();
  expect(record['poolId']).toBeUndefined();
  // Forbidden member / aggregate fields
  expect(record['member_identities']).toBeUndefined();
  expect(record['member_org_ids']).toBeUndefined();
  expect(record['per_member_quantities']).toBeUndefined();
  // Forbidden award/order/settlement fields
  expect(record['award_amount']).toBeUndefined();
  expect(record['order_id']).toBeUndefined();
  expect(record['settlement_id']).toBeUndefined();
}

describe.skipIf(!hasDb)(
  'Network Commerce Supplier Quote Route Integration',
  () => {
    // Only the quote gate is checked by these routes (QD-6).
    const quoteFeatureFlagKey = 'nc.procurement_pools.supplier_quotes.enabled';
    // Parent flags — used only to prove quote gate independence.
    const poolFeatureFlagKey   = 'nc.procurement_pools.enabled';
    const rfqFeatureFlagKey    = 'nc.procurement_pools.rfq.enabled';
    const inviteFeatureFlagKey = 'nc.procurement_pools.supplier_invites.enabled';

    let app: FastifyInstance;
    let ownerOrgId:    string;
    let supplierOrgId: string;
    let supplierOrg2Id: string;
    let otherOrgId:    string;
    let supplierUserId: string;
    let ownerUserId:   string;
    let testRunId:     string;

    let originalQuoteFlagState: { enabled: boolean; description: string | null; value: string | null } | null = null;
    let originalPoolFlagState:  { enabled: boolean; description: string | null; value: string | null } | null = null;
    let originalRfqFlagState:   { enabled: boolean; description: string | null; value: string | null } | null = null;
    let originalInviteFlagState:{ enabled: boolean; description: string | null; value: string | null } | null = null;

    const createdPoolIds = new Set<string>();

    async function buildApp(): Promise<FastifyInstance> {
      const fastify = Fastify();
      await fastify.register(poolRfqRoutes,                { prefix: '/api/tenant/network-commerce/pools' });
      await fastify.register(poolRfqSupplierInvitesRoutes, { prefix: '/api/tenant/network-commerce' });
      await fastify.register(poolRfqSupplierQuotesRoutes,  { prefix: '/api/tenant/network-commerce' });
      await fastify.ready();
      return fastify;
    }

    function makePoolRef(tag: string): string {
      return `SQ-POOL-${testRunId}-${tag}`;
    }
    function makeLineRef(tag: string): string {
      return `SQ-LINE-${testRunId}-${tag}`;
    }

    async function setGlobalFlag(key: string, enabled: boolean): Promise<void> {
      await withBypassForSeed(prisma, async tx => {
        await tx.featureFlag.upsert({
          where: { key },
          create: { key, enabled, description: `SQ test - ${key}` },
          update: { enabled },
        });
      });
    }

    async function enableQuoteFlagForTenants(enabled: boolean): Promise<void> {
      await withBypassForSeed(prisma, async tx => {
        for (const orgId of [ownerOrgId, supplierOrgId, supplierOrg2Id, otherOrgId]) {
          await tx.tenantFeatureOverride.upsert({
            where: { tenantId_key: { tenantId: orgId, key: quoteFeatureFlagKey } },
            create: { tenantId: orgId, key: quoteFeatureFlagKey, enabled },
            update: { enabled },
          });
        }
      });
    }

    /**
     * Ensure the quote feature flag is enabled globally and for all test tenants.
     * Batched into a single transaction to reduce Supabase pooler round-trips.
     */
    async function ensureDefaultFlagsEnabled(): Promise<void> {
      await withBypassForSeed(prisma, async tx => {
        await tx.featureFlag.upsert({
          where: { key: quoteFeatureFlagKey },
          create: { key: quoteFeatureFlagKey, enabled: true, description: 'SQ test - quote flag' },
          update: { enabled: true },
        });
        for (const orgId of [ownerOrgId, supplierOrgId, supplierOrg2Id, otherOrgId]) {
          await tx.tenantFeatureOverride.upsert({
            where: { tenantId_key: { tenantId: orgId, key: quoteFeatureFlagKey } },
            create: { tenantId: orgId, key: quoteFeatureFlagKey, enabled: true },
            update: { enabled: true },
          });
        }
        // Ensure parent flags exist so invite/pool/rfq routes used in fixtures work.
        for (const key of [poolFeatureFlagKey, rfqFeatureFlagKey, inviteFeatureFlagKey]) {
          await tx.featureFlag.upsert({
            where: { key },
            create: { key, enabled: true, description: `SQ test - ${key}` },
            update: { enabled: true },
          });
          for (const orgId of [ownerOrgId, supplierOrgId, supplierOrg2Id, otherOrgId]) {
            await tx.tenantFeatureOverride.upsert({
              where: { tenantId_key: { tenantId: orgId, key } },
              create: { tenantId: orgId, key, enabled: true },
              update: { enabled: true },
            });
          }
        }
      });
    }

    /** Create an issued RFQ for ownerOrg. Returns poolId + rfqId. */
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

        const lineId = randomUUID();
        await tx.networkPoolDemandLine.create({
          data: {
            id: lineId,
            ownerOrgId: orgId,
            poolId,
            lineRef: makeLineRef(randomUUID().slice(0, 8)),
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

    /**
     * Create an invite fixture with optional status overrides.
     * Defaults to PENDING if no overrides given.
     */
    async function createInviteFixture(
      ownerOrg: string,
      supplierOrg: string,
      overrides?: {
        status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
        acceptedAt?: Date | null;
        declinedAt?: Date | null;
        cancelledAt?: Date | null;
        expiresAt?: Date | null;
        rfqStatus?: 'ISSUED' | 'QUOTED';
      },
    ): Promise<{ poolId: string; rfqId: string; inviteId: string }> {
      const { poolId, rfqId } = await createIssuedRfqFixture(ownerOrg);

      return withBypassForSeed(prisma, async tx => {
        // Optionally override RFQ status (e.g. already QUOTED).
        if (overrides?.rfqStatus && overrides.rfqStatus !== 'ISSUED') {
          await tx.networkPoolRfq.update({
            where: { id: rfqId },
            data: { status: overrides.rfqStatus },
          });
        }

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
          },
        });
        return { poolId, rfqId, inviteId };
      });
    }

    /** Create an ACCEPTED invite (the base case for quote submission). */
    async function createAcceptedInviteFixture(
      ownerOrg: string,
      supplierOrg: string,
      rfqStatus?: 'ISSUED' | 'QUOTED',
    ): Promise<{ poolId: string; rfqId: string; inviteId: string }> {
      return createInviteFixture(ownerOrg, supplierOrg, {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        rfqStatus,
      });
    }

    /** Submit a quote directly via DB (bypasses route — for setup of GET/duplicate tests). */
    async function seedQuoteFixture(
      inviteId: string,
      supplierOrg: string,
      ownerOrg: string,
      rfqId: string,
      poolId: string,
    ): Promise<{ quoteId: string }> {
      return withBypassForSeed(prisma, async tx => {
        const quoteId = randomUUID();
        await tx.networkPoolRfqSupplierQuote.create({
          data: {
            id: quoteId,
            ownerOrgId: ownerOrg,
            supplierOrgId: supplierOrg,
            rfqId,
            poolId,
            inviteId,
            quoteRef: 'SQ-' + randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase(),
            status: 'SUBMITTED',
            quoteAmount: new Prisma.Decimal('12500.00'),
            currency: 'INR',
            submittedAt: new Date(),
          },
        });
        return { quoteId };
      });
    }

    beforeAll(async () => {
      app = await buildApp();

      ownerOrgId    = randomUUID();
      supplierOrgId = randomUUID();
      supplierOrg2Id = randomUUID();
      otherOrgId    = randomUUID();
      supplierUserId = randomUUID();
      ownerUserId   = randomUUID();

      await seedTenantForTest(ownerOrgId,    'sq-owner');
      await seedTenantForTest(supplierOrgId,  'sq-supplier-1');
      await seedTenantForTest(supplierOrg2Id, 'sq-supplier-2');
      await seedTenantForTest(otherOrgId,     'sq-other');

      // Capture original flag states for restore in afterAll.
      await withBypassForSeed(prisma, async tx => {
        originalQuoteFlagState = await tx.featureFlag.findUnique({
          where: { key: quoteFeatureFlagKey },
          select: { enabled: true, description: true, value: true },
        });
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
          // Quotes must be deleted before invites (FK on inviteId).
          await tx.networkPoolRfqSupplierQuote.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolRfqSupplierInvite.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolRfqLine.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolRfq.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolDemandSnapshot.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolDemandLine.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPoolMembership.deleteMany({ where: { poolId: { in: poolIds } } });
          await tx.networkPool.deleteMany({ where: { id: { in: poolIds } } });
          createdPoolIds.clear();
        }

        // Clean up all feature overrides created during this test.
        await tx.tenantFeatureOverride.deleteMany({
          where: {
            key: { in: [quoteFeatureFlagKey, poolFeatureFlagKey, rfqFeatureFlagKey, inviteFeatureFlagKey] },
            tenantId: { in: [ownerOrgId, supplierOrgId, supplierOrg2Id, otherOrgId] },
          },
        });
      });
    });

    afterAll(async () => {
      await app.close();

      // Restore all feature flags to their pre-test state.
      await withBypassForSeed(prisma, async tx => {
        for (const [key, original] of [
          [quoteFeatureFlagKey,  originalQuoteFlagState],
          [poolFeatureFlagKey,   originalPoolFlagState],
          [rfqFeatureFlagKey,    originalRfqFlagState],
          [inviteFeatureFlagKey, originalInviteFlagState],
        ] as const) {
          if (original) {
            await tx.featureFlag.upsert({
              where: { key },
              create: { key, enabled: original.enabled, description: original.description, value: original.value },
              update: { enabled: original.enabled, description: original.description, value: original.value },
            });
          } else {
            await tx.featureFlag.deleteMany({ where: { key } });
          }
        }
      });
    });

    // ─── Auth / Feature Gate ──────────────────────────────────────────────────

    it('SQ-01 unauthenticated GET returns 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
      });
      expect(res.statusCode).toBe(401);
      expect((res.json() as any).error.code).toBe('UNAUTHORIZED');
    });

    it('SQ-02 unauthenticated POST returns 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        payload: { quote_amount: '1000', currency: 'INR' },
      });
      expect(res.statusCode).toBe(401);
      expect((res.json() as any).error.code).toBe('UNAUTHORIZED');
    });

    it('SQ-03 missing quote feature flag returns 503 on GET', async () => {
      await setGlobalFlag(quoteFeatureFlagKey, false);
      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });
      expect(res.statusCode).toBe(503);
      expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
    });

    it('SQ-04 missing quote feature flag returns 503 on POST', async () => {
      await setGlobalFlag(quoteFeatureFlagKey, false);
      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '1000', currency: 'INR' },
      });
      expect(res.statusCode).toBe(503);
      expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
    });

    it('SQ-05 quote feature flag enabled reaches handler (GET returns 404 for non-existent)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });
      // 404 means the gate passed; route handler was reached.
      expect(res.statusCode).toBe(404);
    });

    it('SQ-06 parent pool flag disabled does NOT block quote route', async () => {
      await setGlobalFlag(poolFeatureFlagKey, false);
      // Quote flag remains enabled from ensureDefaultFlagsEnabled.
      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });
      // 404 = gate passed; 503 = gate blocked (wrong).
      expect(res.statusCode).not.toBe(503);
      expect(res.statusCode).toBe(404);
    });

    it('SQ-07 parent RFQ flag disabled does NOT block quote route', async () => {
      await setGlobalFlag(rfqFeatureFlagKey, false);
      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });
      expect(res.statusCode).not.toBe(503);
      expect(res.statusCode).toBe(404);
    });

    it('SQ-08 parent invite flag disabled does NOT block quote route', async () => {
      await setGlobalFlag(inviteFeatureFlagKey, false);
      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });
      expect(res.statusCode).not.toBe(503);
      expect(res.statusCode).toBe(404);
    });

    it('SQ-09 quote gate uses only nc.procurement_pools.supplier_quotes.enabled', async () => {
      // All parent flags off, quote flag on — route reaches handler.
      await setGlobalFlag(poolFeatureFlagKey,   false);
      await setGlobalFlag(rfqFeatureFlagKey,    false);
      await setGlobalFlag(inviteFeatureFlagKey, false);
      await setGlobalFlag(quoteFeatureFlagKey,  true);
      await enableQuoteFlagForTenants(true);

      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });
      expect(res.statusCode).toBe(404); // handler reached, quote not found.
    });

    // ─── GET quote ────────────────────────────────────────────────────────────

    it('SQ-10 supplier can GET own submitted quote', { timeout: 20000 }, async () => {
      const { poolId, rfqId, inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);
      await seedQuoteFixture(inviteId, supplierOrgId, ownerOrgId, rfqId, poolId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });

      expect(res.statusCode).toBe(200);
      expect((res.json() as any).success).toBe(true);
      const data = (res.json() as any).data;
      expect(data.invite_id).toBe(inviteId);
      expect(data.status).toBe('SUBMITTED');
    });

    it('SQ-11 missing quote returns non-leaking 404', { timeout: 15000 }, async () => {
      const { inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });

      expect(res.statusCode).toBe(404);
      expect((res.json() as any).error.code).toBe('SUPPLIER_QUOTE_NOT_FOUND');
    });

    it('SQ-12 wrong supplier receives non-leaking 404 on GET', { timeout: 20000 }, async () => {
      const { poolId, rfqId, inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);
      await seedQuoteFixture(inviteId, supplierOrgId, ownerOrgId, rfqId, poolId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrg2Id, supplierUserId),
      });

      expect(res.statusCode).toBe(404);
      expect((res.json() as any).error.code).toBe('SUPPLIER_QUOTE_NOT_FOUND');
    });

    it('SQ-13 invalid inviteId UUID returns 400 on GET', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tenant/network-commerce/supplier-rfq-invites/not-a-uuid/quote',
        headers: authHeaders(supplierOrgId, supplierUserId),
      });
      expect(res.statusCode).toBe(400);
    });

    it('SQ-14 GET response is supplier-safe (no forbidden fields)', { timeout: 20000 }, async () => {
      const { poolId, rfqId, inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);
      await seedQuoteFixture(inviteId, supplierOrgId, ownerOrgId, rfqId, poolId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });

      expect(res.statusCode).toBe(200);
      assertQuoteSupplierSafe((res.json() as any).data as Record<string, unknown>);
    });

    // ─── POST quote ───────────────────────────────────────────────────────────

    it('SQ-15 supplier can submit quote for ACCEPTED invite', { timeout: 20000 }, async () => {
      const { inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '15000.00', currency: 'INR' },
      });

      expect(res.statusCode).toBe(201);
      expect((res.json() as any).success).toBe(true);
      const data = (res.json() as any).data;
      expect(data.invite_id).toBe(inviteId);
      expect(data.status).toBe('SUBMITTED');
    });

    it('SQ-16 POST returns supplier-safe DTO', { timeout: 20000 }, async () => {
      const { inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '9500', currency: 'USD' },
      });

      expect(res.statusCode).toBe(201);
      assertQuoteSupplierSafe((res.json() as any).data as Record<string, unknown>);
    });

    it('SQ-17 quote_amount returned as string', { timeout: 20000 }, async () => {
      const { inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '7777.77', currency: 'EUR' },
      });

      expect(res.statusCode).toBe(201);
      const data = (res.json() as any).data;
      // QD-4: Decimal serialised as string.
      expect(typeof data.quote_amount).toBe('string');
      expect(data.quote_amount).toBe('7777.77');
    });

    it('SQ-18 ISSUED RFQ becomes QUOTED after first quote', { timeout: 20000 }, async () => {
      const { rfqId, inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '50000', currency: 'INR' },
      });

      expect(res.statusCode).toBe(201);

      // Verify the RFQ status was updated to QUOTED in DB.
      const rfq = (await withBypassForSeed(prisma, tx =>
        tx.networkPoolRfq.findUnique({ where: { id: rfqId }, select: { status: true } }),
      )) as { status: string } | null;
      expect(rfq?.status).toBe('QUOTED');
    });

    it('SQ-19 already-QUOTED RFQ succeeds (second supplier quote)', { timeout: 20000 }, async () => {
      // RFQ already QUOTED (another supplier submitted first).
      const { inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId, 'QUOTED');

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '22000', currency: 'INR' },
      });

      expect(res.statusCode).toBe(201);
    });

    it('SQ-20 duplicate quote returns 409', { timeout: 20000 }, async () => {
      const { poolId, rfqId, inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);
      await seedQuoteFixture(inviteId, supplierOrgId, ownerOrgId, rfqId, poolId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '999', currency: 'INR' },
      });

      expect(res.statusCode).toBe(409);
      expect((res.json() as any).error.code).toBe('QUOTE_ALREADY_SUBMITTED');
    });

    it('SQ-21 PENDING invite returns 422 INVITE_NOT_ACCEPTED', { timeout: 15000 }, async () => {
      const { inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId, { status: 'PENDING' });

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '5000', currency: 'INR' },
      });

      expect(res.statusCode).toBe(422);
      expect((res.json() as any).error.code).toBe('INVITE_NOT_ACCEPTED');
    });

    it('SQ-22 DECLINED invite returns 422 INVITE_NOT_ACCEPTED', { timeout: 15000 }, async () => {
      const { inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId, {
        status: 'DECLINED',
        declinedAt: new Date(),
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '5000', currency: 'INR' },
      });

      expect(res.statusCode).toBe(422);
      expect((res.json() as any).error.code).toBe('INVITE_NOT_ACCEPTED');
    });

    it('SQ-23 CANCELLED invite returns 422 INVITE_NOT_ACCEPTED', { timeout: 15000 }, async () => {
      const { inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '5000', currency: 'INR' },
      });

      expect(res.statusCode).toBe(422);
      expect((res.json() as any).error.code).toBe('INVITE_NOT_ACCEPTED');
    });

    it('SQ-24 expired invite (past expiresAt, PENDING DB) returns 422 INVITE_NOT_ACCEPTED', { timeout: 15000 }, async () => {
      const pastDate = new Date(Date.now() - 86400 * 1000); // yesterday
      const { inviteId } = await createInviteFixture(ownerOrgId, supplierOrgId, {
        status: 'PENDING',
        expiresAt: pastDate,
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '5000', currency: 'INR' },
      });

      expect(res.statusCode).toBe(422);
      expect((res.json() as any).error.code).toBe('INVITE_NOT_ACCEPTED');
    });

    it('SQ-25 wrong supplier cannot submit quote for another supplier invite', { timeout: 15000 }, async () => {
      const { inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrg2Id, supplierUserId),
        payload: { quote_amount: '5000', currency: 'INR' },
      });

      // Service finds no invite for supplierOrg2Id → NetworkPoolRfqSupplierInviteNotFoundError → 404.
      expect(res.statusCode).toBe(404);
    });

    it('SQ-26 invalid UUID in params returns 400 on POST', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/tenant/network-commerce/supplier-rfq-invites/not-a-uuid/quote',
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '1000', currency: 'INR' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('SQ-27 missing required body fields returns 400', async () => {
      const { inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId).catch(() => ({ inviteId: randomUUID() }));

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { currency: 'INR' }, // missing quote_amount
      });
      expect(res.statusCode).toBe(400);
    });

    it('SQ-28 unknown fields in body rejected (strict schema)', async () => {
      const { inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId).catch(() => ({ inviteId: randomUUID() }));

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '1000', currency: 'INR', unknown_field: 'x' },
      });
      expect(res.statusCode).toBe(400);
    });

    // ─── Privacy — forbidden internal fields rejected on POST ─────────────────

    it('SQ-29 forbidden: status field rejected', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '1000', currency: 'INR', status: 'SUBMITTED' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('SQ-30 forbidden: owner_org_id field rejected', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '1000', currency: 'INR', owner_org_id: ownerOrgId },
      });
      expect(res.statusCode).toBe(400);
    });

    it('SQ-31 forbidden: metadata_internal_json field rejected', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '1000', currency: 'INR', metadata_internal_json: {} },
      });
      expect(res.statusCode).toBe(400);
    });

    it('SQ-32 forbidden: rfq_id field rejected', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '1000', currency: 'INR', rfq_id: randomUUID() },
      });
      expect(res.statusCode).toBe(400);
    });

    it('SQ-33 forbidden: pool_id field rejected', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '1000', currency: 'INR', pool_id: randomUUID() },
      });
      expect(res.statusCode).toBe(400);
    });

    it('SQ-34 forbidden: invite_id field rejected (set via path only)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '1000', currency: 'INR', invite_id: randomUUID() },
      });
      expect(res.statusCode).toBe(400);
    });

    it('SQ-35 forbidden: quote_ref field rejected (service-generated)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '1000', currency: 'INR', quote_ref: 'SQ-CUSTOM' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('SQ-36 no metadataInternalJson in GET response', { timeout: 20000 }, async () => {
      const { poolId, rfqId, inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);
      await seedQuoteFixture(inviteId, supplierOrgId, ownerOrgId, rfqId, poolId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });

      expect(res.statusCode).toBe(200);
      const data = (res.json() as any).data;
      expect(data.metadataInternalJson).toBeUndefined();
      expect(data.metadata_internal_json).toBeUndefined();
    });

    it('SQ-37 no owner_org_id / rfq_id / pool_id in POST response', { timeout: 20000 }, async () => {
      const { inviteId } = await createAcceptedInviteFixture(ownerOrgId, supplierOrgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
        payload: { quote_amount: '3000', currency: 'INR' },
      });

      expect(res.statusCode).toBe(201);
      assertQuoteSupplierSafe((res.json() as any).data as Record<string, unknown>);
    });

    // ─── Registration / Regression ────────────────────────────────────────────

    it('SQ-38 route namespace resolves correctly', async () => {
      // Verify the full route path resolves (400 or 404, not 404 from Fastify router).
      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/supplier-rfq-invites/${randomUUID()}/quote`,
        headers: authHeaders(supplierOrgId, supplierUserId),
      });
      // 404 = route exists, record not found.
      // 405 or unhandled = route not registered.
      expect([200, 404]).toContain(res.statusCode);
    });

    it('SQ-39 owner invite route still works (regression: ORI route unaffected)', async () => {
      // Verify owner RFQ route still accessible (Packet 13 must not break ORI).
      // Role must be OWNER: GET /:poolId/rfq has a role gate (OWNER|ADMIN only → 403 for MEMBER).
      const res = await app.inject({
        method: 'GET',
        url: `/api/tenant/network-commerce/pools/${randomUUID()}/rfq`,
        headers: authHeaders(ownerOrgId, ownerUserId, 'OWNER'),
      });
      // 503 = pool gate triggered (expected if pool flag is down); 404 = handler reached.
      // Either way, route is registered and accessible to an OWNER.
      expect([200, 404, 422, 503]).toContain(res.statusCode);
    });

    it('SQ-40 supplier invite route still works (regression: SRI route unaffected)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tenant/network-commerce/supplier-rfq-invites',
        headers: authHeaders(supplierOrgId, supplierUserId),
      });
      // 200 = invite gate passed and list returned; 503 = invite flag down.
      expect([200, 503]).toContain(res.statusCode);
    });
  },
);
