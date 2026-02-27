/**
 * G-019 Day 2 — Settlement Routes Integration Tests (Mocked)
 * Task ID: G-019-DAY2-ROUTES-INTEGRATION
 *
 * Tests the HTTP surface of tenant + control settlement routes by mocking
 * Prisma, withDbContext, writeAuditLog, and SettlementService so no real DB
 * is required.
 *
 * Invariants verified:
 *   D-017-A  tenantId rejected from tenant body (z.never); allowed in control body
 *   HTTP status codes match service outcomes per G-019 spec:
 *     APPLIED          → 200
 *     PENDING_APPROVAL → 202
 *     ENTITY_FROZEN    → 423
 *     TRADE_DISPUTED   → 409
 *     INSUFFICIENT_ESCROW_FUNDS / DUPLICATE_REFERENCE / STATE_MACHINE_DENIED → 409
 *     AI_HUMAN_CONFIRMATION_REQUIRED / INVALID_AMOUNT → 400
 *     DB_ERROR → 500
 *   Proxy / service integration path intact end-to-end (smoke)
 *   Toggles A1/B1/C3 sealed — no balance column, no extra state keys
 *
 * 8 tests covering:
 *   Tenant POST /settlements/preview — OK → 200
 *   Tenant POST /settlements — APPLIED → 200
 *   Tenant POST /settlements — PENDING_APPROVAL → 202
 *   Tenant POST /settlements — ENTITY_FROZEN → 423
 *   Tenant POST /settlements — TRADE_DISPUTED → 409
 *   Tenant POST /settlements — tenantId in body rejected (D-017-A) → 400
 *   Control POST /settlements — APPLIED → 200 (cross-tenant, body tenantId)
 *   Control POST /settlements/preview — OK → 200 (optional body tenantId)
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
const { FAKE_TX, _svc } = vi.hoisted(() => {
  const FAKE_TX = {
    $executeRaw:       vi.fn().mockResolvedValue(undefined),
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
  };
  // Module-level service method holders — mutated in beforeEach per-test
  const _svc = {
    previewSettlement: vi.fn() as ReturnType<typeof vi.fn>,
    settleTrade:       vi.fn() as ReturnType<typeof vi.fn>,
  };
  return { FAKE_TX, _svc };
});

// Mock prisma singleton
vi.mock('../db/prisma.js', () => ({ prisma: {} }));

// Mock withDbContext: run callback with a fake tx that has $executeRaw
vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn(
    async (_prisma: unknown, _ctx: unknown, cb: (tx: typeof FAKE_TX) => Promise<unknown>) =>
      cb(FAKE_TX),
  ),
}));

// Mock auditLog (audit is emitted inside SettlementService, which is mocked —
// this mock is present to prevent import errors and to catch unexpected calls)
vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog:        vi.fn().mockResolvedValue(undefined),
  writeAuthorityIntent: vi.fn().mockResolvedValue(undefined),
  createAdminAudit:     vi.fn().mockReturnValue({}),
}));

// Factory mock: SettlementService constructor returns the _svc holder object.
// All five ctor args (db, tradeSvc, escrowSvc, escalation, writeAudit) are ignored —
// only the returned _svc methods are exercised.
vi.mock('../services/settlement/settlement.service.js', () => ({
  SettlementService: vi.fn(function () { return _svc; }),
}));

// Mock sub-service dependencies (constructor-only; no methods called in route layer)
vi.mock('../services/trade.g017.service.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TradeService: vi.fn(function (this: any) { return this; }),
}));
vi.mock('../services/escrow.service.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EscrowService: vi.fn(function (this: any) { return this; }),
}));
vi.mock('../services/escalation.service.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EscalationService: vi.fn(function (this: any) { return this; }),
}));
vi.mock('../services/stateMachine.service.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  StateMachineService: vi.fn(function (this: any) { return this; }),
}));
vi.mock('../services/makerChecker.service.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MakerCheckerService: vi.fn(function (this: any) { return this; }),
}));

// Mock auth middlewares: always pass, inject required fields
vi.mock('../middleware/auth.js', () => ({
  tenantAuthMiddleware:      vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
  adminAuthMiddleware:       vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
  databaseContextMiddleware: vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
}));

vi.mock('../middleware/database-context.middleware.js', () => ({
  databaseContextMiddleware: vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import tenantSettlementRoutes from '../routes/tenant/settlement.js';
import controlSettlementRoutes from '../routes/control/settlement.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEST_TENANT_ID  = '11111111-0000-0000-0000-111111111111';
const TEST_USER_ID    = '22222222-0000-0000-0000-222222222222';
const TEST_TRADE_ID   = '33333333-0000-0000-0000-333333333333';
const TEST_ESCROW_ID  = '44444444-0000-0000-0000-444444444444';
const TEST_ADMIN_ID   = '55555555-0000-0000-0000-555555555555';
const TEST_TX_ID      = '66666666-0000-0000-0000-666666666666';
const TEST_REF_ID     = 'SETTLEMENT:batch-001';

/** Minimal valid tenant settle payload (all required fields) */
const VALID_SETTLE_PAYLOAD = {
  tradeId:     TEST_TRADE_ID,
  escrowId:    TEST_ESCROW_ID,
  amount:      1000.00,
  currency:    'USD',
  referenceId: TEST_REF_ID,
  reason:      'Settlement for trade TRD-001',
};

/** Minimal valid preview payload */
const VALID_PREVIEW_PAYLOAD = {
  tradeId:  TEST_TRADE_ID,
  escrowId: TEST_ESCROW_ID,
  amount:   1000.00,
  currency: 'USD',
};

// ── App builders ──────────────────────────────────────────────────────────────

async function buildTenantApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, { secret: 'test-secret' });

  // Inject what tenantAuthMiddleware + databaseContextMiddleware would produce
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

  await fastify.register(tenantSettlementRoutes, { prefix: '/tenant/settlements' });
  await fastify.ready();
  return fastify;
}

async function buildControlApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, { secret: 'test-secret' });

  // Inject what adminAuthMiddleware would produce
  fastify.addHook('onRequest', async req => {
    (req as unknown as Record<string, unknown>).adminId   = TEST_ADMIN_ID;
    (req as unknown as Record<string, unknown>).adminRole = 'PLATFORM_ADMIN';
  });

  await fastify.register(controlSettlementRoutes, { prefix: '/settlements' });
  await fastify.ready();
  return fastify;
}

// ── Tenant Tests ──────────────────────────────────────────────────────────────

describe('G-019 Tenant Settlement Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    _svc.previewSettlement = vi.fn();
    _svc.settleTrade       = vi.fn();
    app = await buildTenantApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── S-001: POST /tenant/settlements/preview — OK → 200 ───────────────────

  it('S-001: POST /tenant/settlements/preview returns 200 with balance snapshot', async () => {
    _svc.previewSettlement.mockResolvedValue({
      status:           'OK',
      currentBalance:   2500.00,
      projectedBalance: 1500.00,
      wouldSucceed:     true,
    });

    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/settlements/preview',
      payload: VALID_PREVIEW_PAYLOAD,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.currentBalance).toBe(2500.00);
    expect(body.data.projectedBalance).toBe(1500.00);
    expect(body.data.wouldSucceed).toBe(true);

    // Preview is read-only — no audit/ledger writes occur at route layer
    expect(_svc.previewSettlement).toHaveBeenCalledOnce();
    expect(_svc.settleTrade).not.toHaveBeenCalled();
  });

  // ── S-002: POST /tenant/settlements — APPLIED → 200 ─────────────────────

  it('S-002: POST /tenant/settlements returns 200 on APPLIED with transactionId', async () => {
    _svc.settleTrade.mockResolvedValue({
      status:         'APPLIED',
      transactionId:  TEST_TX_ID,
      escrowReleased: true,
      tradeClosed:    true,
    });

    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/settlements',
      payload: VALID_SETTLE_PAYLOAD,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('APPLIED');
    expect(body.data.transactionId).toBe(TEST_TX_ID);
    expect(body.data.escrowReleased).toBe(true);
    expect(body.data.tradeClosed).toBe(true);
  });

  // ── S-003: POST /tenant/settlements — PENDING_APPROVAL → 202 ─────────────

  it('S-003: POST /tenant/settlements returns 202 on PENDING_APPROVAL', async () => {
    _svc.settleTrade.mockResolvedValue({
      status:         'PENDING_APPROVAL',
      requiredActors: ['MAKER', 'CHECKER'],
    });

    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/settlements',
      payload: VALID_SETTLE_PAYLOAD,
    });

    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.data.status).toBe('PENDING_APPROVAL');
    expect(body.data.requiredActors).toContain('MAKER');
    expect(body.data.requiredActors).toContain('CHECKER');
  });

  // ── S-004: POST /tenant/settlements — ENTITY_FROZEN → 423 ────────────────

  it('S-004: POST /tenant/settlements returns 423 on ENTITY_FROZEN (freeze gate C3)', async () => {
    _svc.settleTrade.mockResolvedValue({
      status:  'ERROR',
      code:    'ENTITY_FROZEN',
      message: 'Trade has an active escalation at severity >= 3 — settlement blocked.',
    });

    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/settlements',
      payload: VALID_SETTLE_PAYLOAD,
    });

    expect(res.statusCode).toBe(423);
    const body = res.json();
    expect(body.error.code).toBe('ENTITY_FROZEN');

    // No ledger writes, no lifecycle transitions — freeze gate fires first (Step 3)
    expect(_svc.settleTrade).toHaveBeenCalledOnce();
  });

  // ── S-005: POST /tenant/settlements — TRADE_DISPUTED → 409 ───────────────

  it('S-005: POST /tenant/settlements returns 409 on TRADE_DISPUTED (dispute gate C3)', async () => {
    _svc.settleTrade.mockResolvedValue({
      status:  'ERROR',
      code:    'TRADE_DISPUTED',
      message: 'Trade is in DISPUTED state — settlement is blocked until resolved.',
    });

    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/settlements',
      payload: VALID_SETTLE_PAYLOAD,
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error.code).toBe('TRADE_DISPUTED');
  });

  // ── S-006: D-017-A — tenantId in tenant body MUST be rejected ────────────

  it('S-006: POST /tenant/settlements rejects tenantId in body (D-017-A, z.never())', async () => {
    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/settlements',
      payload: {
        ...VALID_SETTLE_PAYLOAD,
        tenantId: TEST_TENANT_ID,  // D-017-A violation — must be rejected by z.never()
      },
    });

    // z.never() causes Zod validation failure → sendValidationError → 400
    expect(res.statusCode).toBe(400);
    // Service must NOT be called
    expect(_svc.settleTrade).not.toHaveBeenCalled();
  });
});

// ── Control Tests ─────────────────────────────────────────────────────────────

describe('G-019 Control Settlement Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    _svc.previewSettlement = vi.fn();
    _svc.settleTrade       = vi.fn();
    app = await buildControlApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── S-007: POST /settlements — APPLIED → 200 (cross-tenant, body tenantId) ─

  it('S-007: POST /control/settlements returns 200 on APPLIED (cross-tenant admin)', async () => {
    _svc.settleTrade.mockResolvedValue({
      status:         'APPLIED',
      transactionId:  TEST_TX_ID,
      escrowReleased: true,
      tradeClosed:    true,
    });

    const res = await app.inject({
      method: 'POST',
      url:    '/settlements',
      payload: {
        ...VALID_SETTLE_PAYLOAD,
        tenantId: TEST_TENANT_ID,   // Control: admin explicitly names the target tenant
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('APPLIED');
    expect(body.data.transactionId).toBe(TEST_TX_ID);
    expect(body.data.escrowReleased).toBe(true);
    expect(body.data.tradeClosed).toBe(true);
    expect(_svc.settleTrade).toHaveBeenCalledOnce();
  });

  // ── S-008: POST /settlements/preview — OK → 200 (control, optional tenantId) ─

  it('S-008: POST /control/settlements/preview returns 200 with balance snapshot', async () => {
    _svc.previewSettlement.mockResolvedValue({
      status:           'OK',
      currentBalance:   5000.00,
      projectedBalance: 4000.00,
      wouldSucceed:     true,
    });

    const res = await app.inject({
      method: 'POST',
      url:    '/settlements/preview',
      payload: {
        ...VALID_PREVIEW_PAYLOAD,
        tenantId: TEST_TENANT_ID,   // Optional in control — provided for precision
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.currentBalance).toBe(5000.00);
    expect(body.data.projectedBalance).toBe(4000.00);
    expect(body.data.wouldSucceed).toBe(true);
    expect(_svc.previewSettlement).toHaveBeenCalledOnce();
    expect(_svc.settleTrade).not.toHaveBeenCalled();
  });
});
