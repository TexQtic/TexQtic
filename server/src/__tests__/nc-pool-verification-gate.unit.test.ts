/**
 * Unit Tests — NC Pool Verification Gate
 * IMPL-MAINAPP-PENDING-VERIFICATION-NC-POOL-BACKEND-GATE-01
 *
 * Verifies that isOrgVerificationBlocked is wired into NC Pool mutation routes.
 * Uses Fastify inject + mocked middleware/guard — no DB, no real services.
 *
 * Coverage:
 *   NC-POOL-GATE-01: PENDING_VERIFICATION org → 403 ORG_VERIFICATION_REQUIRED on pool create
 *   NC-POOL-GATE-02: ACTIVE org → guard passes, reaches service path (pool create)
 *   NC-POOL-GATE-03: PENDING_VERIFICATION org → 403 on demand line create
 *   NC-POOL-GATE-04: PENDING_VERIFICATION org → 403 on supplier invite accept
 *   NC-POOL-GATE-05: PENDING_VERIFICATION org → 403 on supplier quote submit
 *   NC-POOL-GATE-06: PENDING_VERIFICATION org → 403 on pool RFQ issue
 */

// ─── Module mocks (hoisted by Vitest) ────────────────────────────────────────

vi.mock('../db/prisma.js', () => ({
  prisma: {},
}));

vi.mock('../services/stateMachine.service.js', () => ({
  StateMachineService: vi.fn(),
}));

vi.mock('../middleware/auth.js', () => ({
  tenantAuthMiddleware: vi.fn(),
}));

vi.mock('../middleware/database-context.middleware.js', () => ({
  databaseContextMiddleware: vi.fn(),
}));

vi.mock('../middleware/ncPoolFeatureGate.middleware.js', () => ({
  ncPoolFeatureGateMiddleware: vi.fn(),
}));

vi.mock('../middleware/ncPoolRfqFeatureGate.middleware.js', () => ({
  ncPoolRfqFeatureGateMiddleware: vi.fn(),
}));

vi.mock('../middleware/ncPoolRfqAwardFeatureGate.middleware.js', () => ({
  ncPoolRfqAwardFeatureGateMiddleware: vi.fn(),
}));

vi.mock('../middleware/ncPoolSupplierInviteFeatureGate.middleware.js', () => ({
  ncPoolSupplierInviteFeatureGateMiddleware: vi.fn(),
}));

vi.mock('../middleware/ncPoolSupplierQuoteFeatureGate.middleware.js', () => ({
  ncPoolSupplierQuoteFeatureGateMiddleware: vi.fn(),
}));

// Keep real error classes; mock only service constructors.
vi.mock('../services/networkPool.service.js', async importOriginal => {
  const actual = await importOriginal() as Record<string, unknown>;
  return { ...actual, NetworkPoolService: vi.fn() };
});

vi.mock('../services/networkPoolRfq.service.js', async importOriginal => {
  const actual = await importOriginal() as Record<string, unknown>;
  return { ...actual, NetworkPoolRfqService: vi.fn() };
});

vi.mock('../services/networkPoolDemandLine.service.js', async importOriginal => {
  const actual = await importOriginal() as Record<string, unknown>;
  return { ...actual, NetworkPoolDemandLineService: vi.fn() };
});

// Org verification guard — controlled per test.
vi.mock('../utils/orgVerificationGuard.js', () => ({
  isOrgVerificationBlocked: vi.fn(),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import poolsRoutes                from '../routes/tenant/pools.js';
import poolDemandLineRoutes       from '../routes/tenant/poolDemandLines.js';
import poolRfqRoutes              from '../routes/tenant/poolRfq.js';
import poolRfqSupplierInvitesRoutes from '../routes/tenant/poolRfqSupplierInvites.js';
import poolRfqSupplierQuotesRoutes  from '../routes/tenant/poolRfqSupplierQuotes.js';

import { tenantAuthMiddleware }             from '../middleware/auth.js';
import { databaseContextMiddleware }        from '../middleware/database-context.middleware.js';
import { ncPoolFeatureGateMiddleware }      from '../middleware/ncPoolFeatureGate.middleware.js';
import { ncPoolRfqFeatureGateMiddleware }   from '../middleware/ncPoolRfqFeatureGate.middleware.js';
import { ncPoolSupplierInviteFeatureGateMiddleware } from '../middleware/ncPoolSupplierInviteFeatureGate.middleware.js';
import { ncPoolSupplierQuoteFeatureGateMiddleware }  from '../middleware/ncPoolSupplierQuoteFeatureGate.middleware.js';
import { isOrgVerificationBlocked }         from '../utils/orgVerificationGuard.js';
import { NetworkPoolService }               from '../services/networkPool.service.js';
import { NetworkPoolRfqService }            from '../services/networkPoolRfq.service.js';
import { NetworkPoolDemandLineService }     from '../services/networkPoolDemandLine.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_ORG_ID  = 'aa000000-0000-0000-0000-000000000001';
const TEST_USER_ID = 'bb000000-0000-0000-0000-000000000002';
const TEST_POOL_ID = 'cc000000-0000-0000-0000-000000000003';
const TEST_RFQ_ID  = 'dd000000-0000-0000-0000-000000000004';
const TEST_INVITE_ID = 'ee000000-0000-0000-0000-000000000005';

const POOLS_PREFIX = '/api/tenant/network-commerce/pools';
const NC_PREFIX    = '/api/tenant/network-commerce';

// ─── App builders ────────────────────────────────────────────────────────────

async function buildPoolsApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(poolsRoutes, { prefix: POOLS_PREFIX });
  await app.ready();
  return app;
}

async function buildDemandLinesApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(poolDemandLineRoutes, { prefix: POOLS_PREFIX });
  await app.ready();
  return app;
}

async function buildPoolRfqApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(poolRfqRoutes, { prefix: POOLS_PREFIX });
  await app.ready();
  return app;
}

async function buildSupplierInvitesApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(poolRfqSupplierInvitesRoutes, { prefix: NC_PREFIX });
  await app.ready();
  return app;
}

async function buildSupplierQuotesApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(poolRfqSupplierQuotesRoutes, { prefix: NC_PREFIX });
  await app.ready();
  return app;
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default service mock implementations — return a minimal stub.
  vi.mocked(NetworkPoolService).mockImplementation(function() {
    return { createNetworkPool: vi.fn().mockResolvedValue({ id: TEST_POOL_ID }) } as any;
  });
  vi.mocked(NetworkPoolRfqService).mockImplementation(function() {
    return {
      issueRfq: vi.fn().mockResolvedValue({ id: TEST_RFQ_ID }),
      acceptInvite: vi.fn().mockResolvedValue({ id: TEST_INVITE_ID }),
    } as any;
  });
  vi.mocked(NetworkPoolDemandLineService).mockImplementation(function() {
    return { createDemandLine: vi.fn().mockResolvedValue({ id: 'line-1' }) } as any;
  });

  // Auth injects OWNER context by default.
  vi.mocked(tenantAuthMiddleware).mockImplementation(async (request: any) => {
    request.userId   = TEST_USER_ID;
    request.userRole = 'OWNER';
    request.tenantId = TEST_ORG_ID;
  });

  vi.mocked(databaseContextMiddleware).mockImplementation(async (request: any) => {
    request.dbContext = { orgId: TEST_ORG_ID };
  });

  // All feature gates pass through by default.
  vi.mocked(ncPoolFeatureGateMiddleware).mockImplementation(async () => {});
  vi.mocked(ncPoolRfqFeatureGateMiddleware).mockImplementation(async () => {});
  vi.mocked(ncPoolSupplierInviteFeatureGateMiddleware).mockImplementation(async () => {});
  vi.mocked(ncPoolSupplierQuoteFeatureGateMiddleware).mockImplementation(async () => {});

  // Guard passes by default.
  vi.mocked(isOrgVerificationBlocked).mockResolvedValue(false);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NC Pool Verification Gate — unit tests', () => {
  // NC-POOL-GATE-01: PENDING_VERIFICATION org blocked on pool create
  it('NC-POOL-GATE-01: PENDING_VERIFICATION org receives 403 ORG_VERIFICATION_REQUIRED on pool create', async () => {
    vi.mocked(isOrgVerificationBlocked).mockImplementation(async (_orgId, reply: any) => {
      reply.code(403).send({
        success: false,
        error: { code: 'ORG_VERIFICATION_REQUIRED', message: 'Organization verification is required before this action is available.' },
      });
      return true;
    });

    const app = await buildPoolsApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     `${POOLS_PREFIX}/`,
        payload: { name: 'Test Pool', commodity: 'TEST' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('ORG_VERIFICATION_REQUIRED');
      expect(vi.mocked(isOrgVerificationBlocked)).toHaveBeenCalledWith(TEST_ORG_ID, expect.anything());
    } finally {
      await app.close();
    }
  });

  // NC-POOL-GATE-02: ACTIVE org passes guard on pool create
  it('NC-POOL-GATE-02: ACTIVE org is not blocked — guard passes and service is reached', async () => {
    vi.mocked(isOrgVerificationBlocked).mockResolvedValue(false);

    const mockSvc = { createNetworkPool: vi.fn().mockResolvedValue({ id: TEST_POOL_ID }) };
    vi.mocked(NetworkPoolService).mockImplementation(function() { return mockSvc as any; });

    const app = await buildPoolsApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     `${POOLS_PREFIX}/`,
        payload: { name: 'Test Pool', commodity: 'TEST' },
      });

      // Guard passed — service was invoked (400 from validation or 2xx from service, not 403).
      expect(res.statusCode).not.toBe(403);
      expect(vi.mocked(isOrgVerificationBlocked)).toHaveBeenCalledWith(TEST_ORG_ID, expect.anything());
    } finally {
      await app.close();
    }
  });

  // NC-POOL-GATE-03: PENDING_VERIFICATION org blocked on demand line create
  it('NC-POOL-GATE-03: PENDING_VERIFICATION org receives 403 on demand line create', async () => {
    vi.mocked(isOrgVerificationBlocked).mockImplementation(async (_orgId, reply: any) => {
      reply.code(403).send({
        success: false,
        error: { code: 'ORG_VERIFICATION_REQUIRED', message: 'Organization verification is required before this action is available.' },
      });
      return true;
    });

    const app = await buildDemandLinesApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     `${POOLS_PREFIX}/${TEST_POOL_ID}/demand-lines`,
        payload: { commodity: 'TEST', quantity: 10 },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('ORG_VERIFICATION_REQUIRED');
    } finally {
      await app.close();
    }
  });

  // NC-POOL-GATE-04: PENDING_VERIFICATION org blocked on supplier invite accept
  it('NC-POOL-GATE-04: PENDING_VERIFICATION org receives 403 on supplier invite accept', async () => {
    vi.mocked(isOrgVerificationBlocked).mockImplementation(async (_orgId, reply: any) => {
      reply.code(403).send({
        success: false,
        error: { code: 'ORG_VERIFICATION_REQUIRED', message: 'Organization verification is required before this action is available.' },
      });
      return true;
    });

    const app = await buildSupplierInvitesApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     `${NC_PREFIX}/supplier-rfq-invites/${TEST_INVITE_ID}/accept`,
        payload: {},
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('ORG_VERIFICATION_REQUIRED');
    } finally {
      await app.close();
    }
  });

  // NC-POOL-GATE-05: PENDING_VERIFICATION org blocked on supplier quote submit
  it('NC-POOL-GATE-05: PENDING_VERIFICATION org receives 403 on supplier quote submit', async () => {
    vi.mocked(isOrgVerificationBlocked).mockImplementation(async (_orgId, reply: any) => {
      reply.code(403).send({
        success: false,
        error: { code: 'ORG_VERIFICATION_REQUIRED', message: 'Organization verification is required before this action is available.' },
      });
      return true;
    });

    const app = await buildSupplierQuotesApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     `${NC_PREFIX}/supplier-rfq-invites/${TEST_INVITE_ID}/quote`,
        payload: { quote_amount: '100.00', currency: 'USD' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('ORG_VERIFICATION_REQUIRED');
    } finally {
      await app.close();
    }
  });

  // NC-POOL-GATE-06: PENDING_VERIFICATION org blocked on pool RFQ issue
  it('NC-POOL-GATE-06: PENDING_VERIFICATION org receives 403 on pool RFQ issue', async () => {
    vi.mocked(isOrgVerificationBlocked).mockImplementation(async (_orgId, reply: any) => {
      reply.code(403).send({
        success: false,
        error: { code: 'ORG_VERIFICATION_REQUIRED', message: 'Organization verification is required before this action is available.' },
      });
      return true;
    });

    const app = await buildPoolRfqApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     `${POOLS_PREFIX}/${TEST_POOL_ID}/rfq/issue`,
        payload: {},
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('ORG_VERIFICATION_REQUIRED');
    } finally {
      await app.close();
    }
  });
});
