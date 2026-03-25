/**
 * G-017 Day 3 — Trade Routes Integration Tests (Mocked)
 * Task ID: G-017-DAY3-ROUTES-INTEGRATION
 *
 * Tests the HTTP surface of tenant + control trade routes by mocking Prisma,
 * withDbContext, writeAuditLog, and TradeService so no real DB is required.
 *
 * Invariants verified:
 *   D-017-A  tenantId always from JWT/dbContext; rejected from body
 *   Audit factories invoked in the same "transaction" as the mutation
 *   HTTP status codes match service outcomes
 *   Proxy / service integration path intact end-to-end (smoke)
 *
 * 13 tests covering:
 *   Tenant POST /trades — happy path, body tenantId rejection, validation, service ERROR
 *   Tenant POST /trades/:id/transition — APPLIED, PENDING, ERROR, service error
 *   Control GET /trades — list
 *   Control POST /trades/:id/transition — APPLIED, NOT_FOUND, FROZEN
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';

// ── Module mocks ──────────────────────────────────────────────────────────────

/**
 * vi.hoisted() guarantees these run before ALL vi.mock() factories.
 * Factories reference them by closure so the references survive hoisting.
 */
const { MOCK_TRADE_FINDMANY, FAKE_TX, _svc } = vi.hoisted(() => {
  const MOCK_TRADE_FINDMANY = vi.fn();
  const FAKE_TX = {
    $executeRaw:       vi.fn().mockResolvedValue(undefined),
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    trade: { findMany: MOCK_TRADE_FINDMANY },
  };
  // Module-level service method holders — mutated in beforeEach per-test
  const _svc = {
    createTrade: vi.fn(),
    createEscrowForTrade: vi.fn(),
    transitionTrade: vi.fn(),
  };
  return { MOCK_TRADE_FINDMANY, FAKE_TX, _svc };
});

// Mock prisma singleton
vi.mock('../db/prisma.js', () => ({ prisma: {} }));

// Mock withDbContext: run callback with a fake tx that has $executeRaw + trade model
vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn(
    async (_prisma: unknown, _ctx: unknown, cb: (tx: typeof FAKE_TX) => Promise<unknown>) => cb(FAKE_TX),
  ),
}));

// Mock auditLog writer (side-effect only)
vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog:        vi.fn().mockResolvedValue(undefined),
  writeAuthorityIntent: vi.fn().mockResolvedValue(undefined),
  createAdminAudit:     vi.fn().mockReturnValue({}),
}));

// Factory mock: TradeService constructor returns the _svc holder object.
// The _svc methods are replaced in beforeEach so each test gets fresh fns.
// Note: vi.mock factories CAN reference vi.hoisted() variables (no hoisting issue).
vi.mock('../services/trade.g017.service.js', () => ({
   
  TradeService: vi.fn(function () { return _svc; }),
}));

// Mock EscalationService + StateMachineService (dependencies of TradeService ctor)
// Must use `function` keyword — Vitest v4 calls `new impl()`, arrow functions cannot be constructors.
vi.mock('../services/escalation.service.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EscalationService: vi.fn(function (this: any) { return this; }),
}));
vi.mock('../services/stateMachine.service.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  StateMachineService: vi.fn(function (this: any) { return this; }),
}));

// Mock auth middleware: always pass
vi.mock('../middleware/auth.js', () => ({
  tenantAuthMiddleware:      vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
  adminAuthMiddleware:       vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
  databaseContextMiddleware: vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
}));

// Mock database-context middleware
vi.mock('../middleware/database-context.middleware.js', () => ({
  databaseContextMiddleware: vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { writeAuditLog } from '../lib/auditLog.js';
import tenantTradesRoutes from '../routes/tenant/trades.g017.js';
import controlTradesRoutes from '../routes/control/trades.g017.js';

// ── Test helpers ──────────────────────────────────────────────────────────────

const TEST_TENANT_ID  = '11111111-0000-0000-0000-111111111111';
const TEST_USER_ID    = '22222222-0000-0000-0000-222222222222';
const TEST_TRADE_ID   = '33333333-0000-0000-0000-333333333333';
const TEST_ADMIN_ID   = '44444444-0000-0000-0000-444444444444';
const BUYER_ORG_ID    = '55555555-0000-0000-0000-555555555555';
const SELLER_ORG_ID   = '66666666-0000-0000-0000-666666666666';

/**
 * Build a minimal Fastify instance with JWT + cookie plugins that inject
 * dbContext and userId onto each request (simulating what the real auth
 * middleware does so business logic can read them).
 */
async function buildTenantApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, { secret: 'test-secret' });

  // Decorate request to mimic auth middleware output
  fastify.addHook('onRequest', async req => {
    (req as unknown as Record<string, unknown>).userId    = TEST_USER_ID;
    (req as unknown as Record<string, unknown>).tenantId  = TEST_TENANT_ID;
    (req as unknown as Record<string, unknown>).userRole  = 'TENANT_ADMIN';
    (req as unknown as Record<string, unknown>).dbContext = {
      orgId:     TEST_TENANT_ID,
      actorId:   TEST_USER_ID,
      realm:     'tenant',
      requestId: 'test-req-id',
    };
  });

  await fastify.register(tenantTradesRoutes, { prefix: '/tenant/trades' });
  await fastify.ready();
  return fastify;
}

async function buildControlApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, { secret: 'test-secret' });

  // Decorate request to mimic admin auth middleware output
  fastify.addHook('onRequest', async req => {
    (req as unknown as Record<string, unknown>).adminId   = TEST_ADMIN_ID;
    (req as unknown as Record<string, unknown>).adminRole = 'PLATFORM_ADMIN';
    (req as unknown as Record<string, unknown>).dbContext = {
      orgId:     TEST_TENANT_ID,
      actorId:   TEST_ADMIN_ID,
      realm:     'control',
      requestId: 'test-req-id',
    };
  });

  await fastify.register(controlTradesRoutes, { prefix: '/trades' });
  await fastify.ready();
  return fastify;
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('G-017 Tenant Trade Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    MOCK_TRADE_FINDMANY.mockResolvedValue([]);
    // Reset _svc method mocks for isolation — factory closure ensures route picks these up
    _svc.createTrade     = vi.fn();
    _svc.createEscrowForTrade = vi.fn();
    _svc.transitionTrade = vi.fn();
    app = await buildTenantApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /tenant/trades — happy path ──────────────────────────────────────

  it('T-001: POST /tenant/trades returns 201 on CREATED', async () => {
    _svc.createTrade.mockResolvedValue({
      status:         'CREATED',
      tradeId:        TEST_TRADE_ID,
      tradeReference: 'TRD-0001',
    });

    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/trades',
      payload: {
        buyerOrgId:     BUYER_ORG_ID,
        sellerOrgId:    SELLER_ORG_ID,
        tradeReference: 'TRD-0001',
        currency:       'USD',
        grossAmount:    1000,
        reason:         'Trade creation reason',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.tradeId).toBe(TEST_TRADE_ID);
    expect(body.data.tradeReference).toBe('TRD-0001');
  });

  it('T-002: POST /tenant/trades writes audit in same tx (writeAuditLog called)', async () => {
    _svc.createTrade.mockResolvedValue({
      status:         'CREATED',
      tradeId:        TEST_TRADE_ID,
      tradeReference: 'TRD-0001',
    });

    await app.inject({
      method: 'POST',
      url:    '/tenant/trades',
      payload: {
        buyerOrgId:     BUYER_ORG_ID,
        sellerOrgId:    SELLER_ORG_ID,
        tradeReference: 'TRD-0001',
        currency:       'USD',
        grossAmount:    1000,
        reason:         'Audit emission test',
      },
    });

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('TRADE_CREATED');
    expect(auditArg.tenantId).toBe(TEST_TENANT_ID);
    expect(auditArg.actorId).toBe(TEST_USER_ID);
    expect(auditArg.entityId).toBe(TEST_TRADE_ID);
  });

  // ── D-017-A: tenantId from body MUST be rejected ──────────────────────────

  it('T-003: POST /tenant/trades rejects tenantId in request body (zod never())', async () => {
    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/trades',
      payload: {
        tenantId:       TEST_TENANT_ID,   // D-017-A violation — must be rejected
        buyerOrgId:     BUYER_ORG_ID,
        sellerOrgId:    SELLER_ORG_ID,
        tradeReference: 'TRD-FORBIDDEN',
        currency:       'USD',
        grossAmount:    500,
        reason:         'Should be rejected',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  // ── Validation errors ──────────────────────────────────────────────────────

  it('T-004: POST /tenant/trades returns 400 for invalid currency (not 3 chars)', async () => {
    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/trades',
      payload: {
        buyerOrgId:     BUYER_ORG_ID,
        sellerOrgId:    SELLER_ORG_ID,
        tradeReference: 'TRD-X',
        currency:       'INVALID',
        grossAmount:    100,
        reason:         'bad currency',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('T-005: POST /tenant/trades returns 422 when TradeService returns ERROR', async () => {
    _svc.createTrade.mockResolvedValue({
      status:  'ERROR',
      code:    'DB_ERROR',
      message: 'Unique constraint on tradeReference',
    });

    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/trades',
      payload: {
        buyerOrgId:     BUYER_ORG_ID,
        sellerOrgId:    SELLER_ORG_ID,
        tradeReference: 'TRD-DUP',
        currency:       'GBP',
        grossAmount:    200,
        reason:         'Duplicate trade',
      },
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.error.code).toBe('DB_ERROR');
  });

  it('T-005b: POST /tenant/trades/:id/escrow returns 201 when continuity escrow is created', async () => {
    _svc.createEscrowForTrade.mockResolvedValue({
      status: 'CREATED',
      tradeId: TEST_TRADE_ID,
      escrowId: '77777777-0000-0000-0000-777777777777',
      currency: 'USD',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/trades/${TEST_TRADE_ID}/escrow`,
      payload: {
        reason: 'Create escrow from trade context',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.tradeId).toBe(TEST_TRADE_ID);
    expect(body.data.escrowId).toBe('77777777-0000-0000-0000-777777777777');
  });

  it('T-005c: POST /tenant/trades/:id/escrow emits TRADE_ESCROW_LINKED audit', async () => {
    _svc.createEscrowForTrade.mockResolvedValue({
      status: 'CREATED',
      tradeId: TEST_TRADE_ID,
      escrowId: '77777777-0000-0000-0000-777777777777',
      currency: 'USD',
    });

    await app.inject({
      method: 'POST',
      url: `/tenant/trades/${TEST_TRADE_ID}/escrow`,
      payload: {
        reason: 'Audit escrow linkage',
      },
    });

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('TRADE_ESCROW_LINKED');
    const meta = auditArg.metadataJson as Record<string, unknown>;
    expect(meta.escrowId).toBe('77777777-0000-0000-0000-777777777777');
  });

  it('T-005d: POST /tenant/trades/:id/escrow rejects tenantId in request body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/trades/${TEST_TRADE_ID}/escrow`,
      payload: {
        reason: 'Should fail',
        tenantId: TEST_TENANT_ID,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(_svc.createEscrowForTrade).not.toHaveBeenCalled();
  });

  // ── POST /tenant/trades/:id/transition ────────────────────────────────────

  it('T-006: POST /tenant/trades/:id/transition returns 200 on APPLIED', async () => {
    _svc.transitionTrade.mockResolvedValue({
      status:       'APPLIED',
      tradeId:      TEST_TRADE_ID,
      fromStateKey: 'DRAFT',
      toStateKey:   'ACTIVE',
      transitionId: 'tx-001',
    });

    const res = await app.inject({
      method: 'POST',
      url:    `/tenant/trades/${TEST_TRADE_ID}/transition`,
      payload: {
        toStateKey: 'ACTIVE',
        reason:     'Human approved',
        actorRole:  'TENANT_ADMIN',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('APPLIED');
    expect(body.data.fromStateKey).toBe('DRAFT');
    expect(body.data.toStateKey).toBe('ACTIVE');
  });

  it('T-007: POST /tenant/trades/:id/transition emits APPLIED audit', async () => {
    _svc.transitionTrade.mockResolvedValue({
      status:       'APPLIED',
      tradeId:      TEST_TRADE_ID,
      fromStateKey: 'DRAFT',
      toStateKey:   'ACTIVE',
      transitionId: 'tx-002',
    });

    await app.inject({
      method: 'POST',
      url:    `/tenant/trades/${TEST_TRADE_ID}/transition`,
      payload: {
        toStateKey: 'ACTIVE',
        reason:     'Audit smoke test',
        actorRole:  'TENANT_ADMIN',
      },
    });

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('TRADE_TRANSITION_APPLIED');
    const meta7 = auditArg.metadataJson as Record<string, unknown>;
    expect(meta7.fromStateKey).toBe('DRAFT');
    expect(meta7.toStateKey).toBe('ACTIVE');
  });

  it('T-008: POST /tenant/trades/:id/transition returns 202 on PENDING_APPROVAL', async () => {
    _svc.transitionTrade.mockResolvedValue({
      status:         'PENDING_APPROVAL',
      tradeId:        TEST_TRADE_ID,
      fromStateKey:   'DRAFT',
      toStateKey:     'ACTIVE',
      requiredActors: ['MAKER', 'CHECKER'],
    });

    const res = await app.inject({
      method: 'POST',
      url:    `/tenant/trades/${TEST_TRADE_ID}/transition`,
      payload: {
        toStateKey: 'ACTIVE',
        reason:     'Needs approval',
        actorRole:  'MAKER',
      },
    });

    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.data.status).toBe('PENDING_APPROVAL');
    expect(body.data.requiredActors).toContain('CHECKER');
  });

  it('T-008b: POST /tenant/trades/:id/transition emits PENDING audit', async () => {
    _svc.transitionTrade.mockResolvedValue({
      status:         'PENDING_APPROVAL',
      tradeId:        TEST_TRADE_ID,
      fromStateKey:   'DRAFT',
      toStateKey:     'ACTIVE',
      requiredActors: ['MAKER', 'CHECKER'],
    });

    await app.inject({
      method: 'POST',
      url:    `/tenant/trades/${TEST_TRADE_ID}/transition`,
      payload: { toStateKey: 'ACTIVE', reason: 'Pending audit test', actorRole: 'MAKER' },
    });

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('TRADE_TRANSITION_PENDING');
    const meta8b = auditArg.metadataJson as Record<string, unknown>;
    expect(meta8b.requiredActors).toEqual(['MAKER', 'CHECKER']);
  });

  it('T-009: POST /tenant/trades/:id/transition returns 423 on FROZEN_BY_ESCALATION', async () => {
    _svc.transitionTrade.mockResolvedValue({
      status:  'ERROR',
      code:    'FROZEN_BY_ESCALATION',
      message: 'Entity is frozen due to escalation',
    });

    const res = await app.inject({
      method: 'POST',
      url:    `/tenant/trades/${TEST_TRADE_ID}/transition`,
      payload: {
        toStateKey: 'ACTIVE',
        reason:     'Trying frozen entity',
        actorRole:  'TENANT_ADMIN',
      },
    });

    expect(res.statusCode).toBe(423);
  });

  it('T-009b: POST /tenant/trades/:id/transition emits REJECTED audit on ERROR', async () => {
    _svc.transitionTrade.mockResolvedValue({
      status:  'ERROR',
      code:    'STATE_MACHINE_ERROR',
      message: 'SM denied',
    });

    await app.inject({
      method: 'POST',
      url:    `/tenant/trades/${TEST_TRADE_ID}/transition`,
      payload: { toStateKey: 'ACTIVE', reason: 'Reject audit test', actorRole: 'TENANT_ADMIN' },
    });

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('TRADE_TRANSITION_REJECTED');
    const meta9b = auditArg.metadataJson as Record<string, unknown>;
    expect(meta9b.errorCode).toBe('STATE_MACHINE_ERROR');
  });

  it('T-010: transition rejects tenantId in body (zod never())', async () => {
    const res = await app.inject({
      method: 'POST',
      url:    `/tenant/trades/${TEST_TRADE_ID}/transition`,
      payload: {
        tenantId:   TEST_TENANT_ID,   // D-017-A violation
        toStateKey: 'ACTIVE',
        reason:     'Should fail',
        actorRole:  'TENANT_ADMIN',
      },
    });

    expect(res.statusCode).toBe(400);
    // Ensure TradeService was NOT invoked
    expect(_svc.transitionTrade).not.toHaveBeenCalled();
  });

  // ── GET /tenant/trades — list (BLK-FBW-002-B-001 resolution) ─────────────

  it('T-011: GET /tenant/trades returns 200 with org-scoped trade list', async () => {
    MOCK_TRADE_FINDMANY.mockResolvedValue([
      { id: TEST_TRADE_ID, tenantId: TEST_TENANT_ID, lifecycleState: { stateKey: 'DRAFT' } },
    ]);

    const res = await app.inject({ method: 'GET', url: '/tenant/trades' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data.trades)).toBe(true);
    expect(body.data.count).toBe(1);
    expect(body.data.trades[0].tenantId).toBe(TEST_TENANT_ID);
  });

  it('T-012: GET /tenant/trades returns empty list when no trades exist', async () => {
    MOCK_TRADE_FINDMANY.mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/tenant/trades' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.trades).toEqual([]);
    expect(body.data.count).toBe(0);
  });
});

// ── Control Plane Trade Routes ────────────────────────────────────────────────

describe('G-017 Control Trade Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset _svc method mocks for isolation
    _svc.createTrade     = vi.fn();
    _svc.createEscrowForTrade = vi.fn();
    _svc.transitionTrade = vi.fn();
    MOCK_TRADE_FINDMANY.mockResolvedValue([
      { id: TEST_TRADE_ID, tenantId: TEST_TENANT_ID, lifecycleState: { stateKey: 'DRAFT' } },
    ]);
    app = await buildControlApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('C-001: GET /trades returns 200 with trade list', async () => {
    const res = await app.inject({ method: 'GET', url: '/trades' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data.trades)).toBe(true);
    expect(body.data.count).toBe(1);
  });

  it('C-002: POST /trades/:id/transition returns 200 on APPLIED', async () => {
    _svc.transitionTrade.mockResolvedValue({
      status:       'APPLIED',
      tradeId:      TEST_TRADE_ID,
      fromStateKey: 'DRAFT',
      toStateKey:   'ACTIVE',
    });

    const res = await app.inject({
      method: 'POST',
      url:    `/trades/${TEST_TRADE_ID}/transition`,
      payload: {
        orgId:      TEST_TENANT_ID,
        toStateKey: 'ACTIVE',
        reason:     'Admin-driven transition',
        actorRole:  'PLATFORM_ADMIN',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('APPLIED');
  });

  it('C-002b: POST /trades/:id/transition writes TRADE_TRANSITION_APPLIED audit (realm=ADMIN)', async () => {
    _svc.transitionTrade.mockResolvedValue({
      status:       'APPLIED',
      tradeId:      TEST_TRADE_ID,
      fromStateKey: 'DRAFT',
      toStateKey:   'ACTIVE',
    });

    await app.inject({
      method: 'POST',
      url:    `/trades/${TEST_TRADE_ID}/transition`,
      payload: {
        orgId:      TEST_TENANT_ID,
        toStateKey: 'ACTIVE',
        reason:     'Control audit test',
        actorRole:  'PLATFORM_ADMIN',
      },
    });

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('TRADE_TRANSITION_APPLIED');
    expect(auditArg.realm).toBe('ADMIN');
    expect(auditArg.actorType).toBe('ADMIN');
  });

  it('C-003: POST /trades/:id/transition returns 404 on NOT_FOUND', async () => {
    _svc.transitionTrade.mockResolvedValue({
      status:  'ERROR',
      code:    'NOT_FOUND',
      message: 'Trade not found',
    });

    const res = await app.inject({
      method: 'POST',
      url:    `/trades/${TEST_TRADE_ID}/transition`,
      payload: {
        orgId:      TEST_TENANT_ID,
        toStateKey: 'ACTIVE',
        reason:     'Missing trade',
        actorRole:  'PLATFORM_ADMIN',
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it('C-004: POST /trades/:id/transition returns 423 on FROZEN_BY_ESCALATION', async () => {
    _svc.transitionTrade.mockResolvedValue({
      status:  'ERROR',
      code:    'FROZEN_BY_ESCALATION',
      message: 'Trade is frozen',
    });

    const res = await app.inject({
      method: 'POST',
      url:    `/trades/${TEST_TRADE_ID}/transition`,
      payload: {
        orgId:      TEST_TENANT_ID,
        toStateKey: 'SETTLED',
        reason:     'Freeze block test',
        actorRole:  'PLATFORM_ADMIN',
      },
    });

    expect(res.statusCode).toBe(423);
  });
});
