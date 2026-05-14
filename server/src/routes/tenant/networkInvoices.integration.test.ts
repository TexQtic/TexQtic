/**
 * Integration Tests — Network Commerce Invoice Tenant Routes
 * TEXQTIC-NC-PHASE1-NC-INVOICE-COMPLETE-001
 *
 * Covers:
 *   NILIST-01  unauthenticated list → 401
 *   NILIST-02  feature gate off list → 503
 *   NILIST-03  invalid poolId UUID list → 422
 *   NILIST-04  pool not found for org → 404 POOL_NOT_FOUND
 *   NILIST-05  pool exists, no invoices → 200 empty
 *   NILIST-06  pool exists with invoice → 200 with data
 *   NIGET-01   unauthenticated get → 401
 *   NIGET-02   feature gate off get → 503
 *   NIGET-03   invalid invoiceId UUID get → 422
 *   NIGET-04   invoice not found → 404
 *   NIGET-05   invoice exists but for different pool → 404
 *   NIGET-06   valid pool + invoice → 200
 *
 * D-017-A: orgId always from JWT/dbContext. Non-leaking 404 for wrong-org access.
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

import networkInvoiceRoutes from './networkInvoices.js';

function authHeaders(orgId: string, userId: string, userRole: string = 'OWNER') {
  return {
    'x-test-auth':      '1',
    'x-test-org-id':    orgId,
    'x-test-user-id':   userId,
    'x-test-user-role': userRole,
  };
}

describe.skipIf(!hasDb)('Network Commerce Invoice Routes Integration', () => {
  const poolFeatureFlagKey = 'nc.procurement_pools.enabled';

  let app: FastifyInstance;
  let ownerOrgId:  string;
  let otherOrgId:  string;
  let ownerUserId: string;
  let testRunId:   string;

  let originalPoolFeatureFlag: { enabled: boolean; description: string | null; value: string | null } | null = null;

  const createdPoolIds    = new Set<string>();
  const createdInvoiceIds = new Set<string>();

  // ─── App Builder ──────────────────────────────────────────────────────────

  async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify();
    await fastify.register(networkInvoiceRoutes, { prefix: '/api/tenant/network-commerce/pools' });
    await fastify.ready();
    return fastify;
  }

  // ─── Feature Flag Helpers ─────────────────────────────────────────────────

  async function removeGlobalPoolFlag(): Promise<void> {
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.deleteMany({ where: { key: poolFeatureFlagKey } });
    });
  }

  async function ensureGateEnabled(): Promise<void> {
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.upsert({
        where:  { key: poolFeatureFlagKey },
        create: { key: poolFeatureFlagKey, enabled: true, description: 'NC invoice route integration test' },
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

  /** Create a pool in AGGREGATING state via bypass. Returns poolId. */
  async function createPoolFixture(orgId: string): Promise<string> {
    return withBypassForSeed(prisma, async tx => {
      const state = await tx.lifecycleState.findUnique({
        where: { entityType_stateKey: { entityType: 'POOL', stateKey: 'AGGREGATING' } },
        select: { id: true },
      });
      if (!state) throw new Error('Missing lifecycle state: POOL/AGGREGATING');

      const pool = await tx.networkPool.create({
        data: {
          id:               randomUUID(),
          orgId,
          poolRef:          `NI-TEST-${testRunId}-${randomUUID().slice(0, 8)}`,
          commodityCategory: 'COTTON_YARN',
          targetQty:        new Prisma.Decimal(1000),
          qtyUnit:          'KG',
          lifecycleStateId: state.id,
          createdByUserId:  ownerUserId,
        },
        select: { id: true },
      });

      createdPoolIds.add(pool.id);
      return pool.id;
    });
  }

  /** Seed a DRAFT network invoice directly via bypass. Returns invoiceId. */
  async function createInvoiceFixture(
    orgId: string,
    poolId: string,
    overrides?: { invoiceNumber?: string },
  ): Promise<string> {
    return withBypassForSeed(prisma, async tx => {
      const invoice = await tx.networkInvoice.create({
        data: {
          id:                randomUUID(),
          orgId,
          invoiceType:       'POOL_ORDER',
          networkEntityType: 'POOL',
          networkEntityId:   poolId,
          invoiceNumber:     overrides?.invoiceNumber ?? `NC-INV-${randomUUID().slice(0, 8)}`,
          invoiceDate:       new Date('2026-01-01T00:00:00.000Z'),
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

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  beforeAll(async () => {
    app = await buildApp();

    ownerOrgId  = randomUUID();
    otherOrgId  = randomUUID();
    ownerUserId = randomUUID();

    await seedTenantForTest(ownerOrgId, 'ni-route-owner');
    await seedTenantForTest(otherOrgId, 'ni-route-other');

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
    await ensureGateEnabled();
  });

  afterEach(async () => {
    const poolIds    = [...createdPoolIds];
    const invoiceIds = [...createdInvoiceIds];
    createdPoolIds.clear();
    createdInvoiceIds.clear();

    await withBypassForSeed(prisma, async tx => {
      if (invoiceIds.length > 0) {
        await tx.networkInvoice.deleteMany({ where: { id: { in: invoiceIds } } });
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

    await ensureGateEnabled();
  });

  afterAll(async () => {
    await app.close();

    await withBypassForSeed(prisma, async tx => {
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

      if (originalPoolFeatureFlag) {
        await tx.featureFlag.upsert({
          where:  { key: poolFeatureFlagKey },
          create: {
            key:         poolFeatureFlagKey,
            enabled:     originalPoolFeatureFlag.enabled,
            description: originalPoolFeatureFlag.description,
            value:       originalPoolFeatureFlag.value,
          },
          update: {
            enabled:     originalPoolFeatureFlag.enabled,
            description: originalPoolFeatureFlag.description,
            value:       originalPoolFeatureFlag.value,
          },
        });
      } else {
        await tx.featureFlag.deleteMany({ where: { key: poolFeatureFlagKey } });
      }
    }).catch(() => {
      // Lifecycle state and lifecycle log entries are immutable; best-effort cleanup only.
    });
  });

  // ─── NILIST-01: unauthenticated list → 401 ────────────────────────────────

  it('NILIST-01: unauthenticated list request returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url:    `/api/tenant/network-commerce/pools/${randomUUID()}/invoices`,
    });

    expect(res.statusCode).toBe(401);
    expect((res.json() as any).error.code).toBe('UNAUTHORIZED');
  });

  // ─── NILIST-02: feature gate off list → 503 ───────────────────────────────

  it('NILIST-02: list returns 503 when global feature flag is absent', async () => {
    await removeGlobalPoolFlag();

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${randomUUID()}/invoices`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  // ─── NILIST-03: invalid UUID list → 422 ──────────────────────────────────

  it('NILIST-03: list with non-UUID poolId returns 422', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     '/api/tenant/network-commerce/pools/not-a-uuid/invoices',
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(422);
  });

  // ─── NILIST-04: pool not found for org → 404 ─────────────────────────────

  it('NILIST-04: list returns 404 when pool does not belong to caller org', async () => {
    // Pool created for otherOrg — ownerOrg cannot see it
    const otherPool = await createPoolFixture(otherOrgId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${otherPool}/invoices`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(404);
    expect((res.json() as any).error.code).toBe('POOL_NOT_FOUND');
  });

  // ─── NILIST-05: pool exists, no invoices → 200 empty ─────────────────────

  it('NILIST-05: list returns 200 with empty array when pool has no invoices', async () => {
    const poolId = await createPoolFixture(ownerOrgId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/invoices`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.invoices).toEqual([]);
    expect(body.data.count).toBe(0);
  });

  // ─── NILIST-06: pool exists with invoice → 200 with data ─────────────────

  it('NILIST-06: list returns 200 with invoice data when invoices exist', async () => {
    const poolId    = await createPoolFixture(ownerOrgId);
    const invoiceId = await createInvoiceFixture(ownerOrgId, poolId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/invoices`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.count).toBe(1);
    expect(body.data.invoices).toHaveLength(1);
    expect(body.data.invoices[0].id).toBe(invoiceId);
    expect(body.data.invoices[0].org_id).toBe(ownerOrgId);
    expect(body.data.invoices[0].invoice_type).toBe('POOL_ORDER');
    expect(body.data.invoices[0].network_entity_id).toBe(poolId);
  });

  // ─── NIGET-01: unauthenticated get → 401 ─────────────────────────────────

  it('NIGET-01: unauthenticated get request returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url:    `/api/tenant/network-commerce/pools/${randomUUID()}/invoices/${randomUUID()}`,
    });

    expect(res.statusCode).toBe(401);
    expect((res.json() as any).error.code).toBe('UNAUTHORIZED');
  });

  // ─── NIGET-02: feature gate off get → 503 ────────────────────────────────

  it('NIGET-02: get returns 503 when global feature flag is absent', async () => {
    await removeGlobalPoolFlag();

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${randomUUID()}/invoices/${randomUUID()}`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(503);
    expect((res.json() as any).error.code).toBe('FEATURE_DISABLED');
  });

  // ─── NIGET-03: invalid invoiceId UUID get → 422 ──────────────────────────

  it('NIGET-03: get with non-UUID invoiceId returns 422', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${randomUUID()}/invoices/not-a-uuid`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(422);
  });

  // ─── NIGET-04: invoice not found → 404 ───────────────────────────────────

  it('NIGET-04: get returns 404 for non-existent invoice', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${randomUUID()}/invoices/${randomUUID()}`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(404);
  });

  // ─── NIGET-05: invoice exists but for different pool → 404 ───────────────

  it('NIGET-05: get returns 404 when invoice belongs to a different pool (non-leaking)', async () => {
    const poolA    = await createPoolFixture(ownerOrgId);
    const poolB    = await createPoolFixture(ownerOrgId);
    // Invoice is for poolB, not poolA
    const invoiceId = await createInvoiceFixture(ownerOrgId, poolB);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolA}/invoices/${invoiceId}`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(404);
  });

  // ─── NIGET-06: valid pool + invoice → 200 ────────────────────────────────

  it('NIGET-06: get returns 200 with invoice record for valid pool + invoiceId', async () => {
    const poolId    = await createPoolFixture(ownerOrgId);
    const invoiceId = await createInvoiceFixture(ownerOrgId, poolId);

    const res = await app.inject({
      method:  'GET',
      url:     `/api/tenant/network-commerce/pools/${poolId}/invoices/${invoiceId}`,
      headers: authHeaders(ownerOrgId, ownerUserId),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.invoice.id).toBe(invoiceId);
    expect(body.data.invoice.org_id).toBe(ownerOrgId);
    expect(body.data.invoice.invoice_type).toBe('POOL_ORDER');
    expect(body.data.invoice.network_entity_id).toBe(poolId);
    expect(body.data.invoice.status).toBe('DRAFT');
    expect(body.data.invoice.currency).toBe('INR');
  });
});
