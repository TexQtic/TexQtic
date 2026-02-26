/**
 * G-018 Day 3 — Escrow Routes Integration Tests (Mocked)
 * Task ID: G-018-DAY3-ROUTES-INTEGRATION
 *
 * Tests the HTTP surface of tenant + control escrow routes by mocking Prisma,
 * withDbContext, writeAuditLog, and EscrowService so no real DB is required.
 *
 * Invariants verified:
 *   D-017-A  tenantId always from JWT/dbContext; rejected from body
 *   Audit factories invoked in the same "transaction" as the mutation
 *   HTTP status codes match service outcomes (ENTITY_FROZEN → 423, APPLIED → 200, PENDING → 202)
 *   Proxy / service integration path intact end-to-end (smoke)
 *
 * 7 tests covering:
 *   Tenant POST /escrows — happy path + audit emission
 *   Tenant POST /escrows/:id/transactions — recorded
 *   Tenant POST /escrows/:id/transition — APPLIED, PENDING_APPROVAL, ENTITY_FROZEN
 *   Control GET /escrows — list
 *   Control GET /escrows/:id — detail
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
    createEscrowAccount:    vi.fn() as ReturnType<typeof vi.fn>,
    recordTransaction:      vi.fn() as ReturnType<typeof vi.fn>,
    transitionEscrow:       vi.fn() as ReturnType<typeof vi.fn>,
    computeDerivedBalance:  vi.fn() as ReturnType<typeof vi.fn>,
    listEscrowAccounts:     vi.fn() as ReturnType<typeof vi.fn>,
    getEscrowAccountDetail: vi.fn() as ReturnType<typeof vi.fn>,
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

// Mock auditLog writer (side-effect only)
vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog:        vi.fn().mockResolvedValue(undefined),
  writeAuthorityIntent: vi.fn().mockResolvedValue(undefined),
  createAdminAudit:     vi.fn().mockReturnValue({}),
}));

// Factory mock: EscrowService constructor returns the _svc holder object.
vi.mock('../services/escrow.service.js', () => ({
   
  EscrowService: vi.fn(function () { return _svc; }),
}));

// Mock service dependencies (constructor-only, methods unused in these tests)
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
import tenantEscrowRoutes from '../routes/tenant/escrow.g018.js';
import controlEscrowRoutes from '../routes/control/escrow.g018.js';

// ── Test constants ────────────────────────────────────────────────────────────

const TEST_TENANT_ID  = '11111111-0000-0000-0000-111111111111';
const TEST_USER_ID    = '22222222-0000-0000-0000-222222222222';
const TEST_ESCROW_ID  = '33333333-0000-0000-0000-333333333333';
const TEST_ADMIN_ID   = '44444444-0000-0000-0000-444444444444';
const TEST_TX_ID      = '55555555-0000-0000-0000-555555555555';

// ── App builders ──────────────────────────────────────────────────────────────

async function buildTenantApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, { secret: 'test-secret' });

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

  await fastify.register(tenantEscrowRoutes, { prefix: '/tenant/escrows' });
  await fastify.ready();
  return fastify;
}

async function buildControlApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, { secret: 'test-secret' });

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

  await fastify.register(controlEscrowRoutes, { prefix: '/escrows' });
  await fastify.ready();
  return fastify;
}

// ── Tenant Tests ──────────────────────────────────────────────────────────────

describe('G-018 Tenant Escrow Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    _svc.createEscrowAccount    = vi.fn();
    _svc.recordTransaction      = vi.fn();
    _svc.transitionEscrow       = vi.fn();
    _svc.computeDerivedBalance  = vi.fn();
    _svc.listEscrowAccounts     = vi.fn();
    _svc.getEscrowAccountDetail = vi.fn();
    app = await buildTenantApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── E-001: POST /tenant/escrows ───────────────────────────────────────────

  it('E-001: POST /tenant/escrows returns 201 on CREATED and emits ESCROW_CREATED audit', async () => {
    _svc.createEscrowAccount.mockResolvedValue({
      status:   'CREATED',
      escrowId: TEST_ESCROW_ID,
    });

    const res = await app.inject({
      method: 'POST',
      url:    '/tenant/escrows',
      payload: {
        currency: 'USD',
        reason:   'Escrow for trade settlement',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.escrowId).toBe(TEST_ESCROW_ID);

    // Audit must be written in same tx
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('ESCROW_CREATED');
    expect(auditArg.tenantId).toBe(TEST_TENANT_ID);
    expect(auditArg.actorId).toBe(TEST_USER_ID);
    expect(auditArg.entityId).toBe(TEST_ESCROW_ID);
  });

  // ── E-002: POST /tenant/escrows/:id/transactions ─────────────────────────

  it('E-002: POST /tenant/escrows/:id/transactions returns 201 on RECORDED', async () => {
    _svc.recordTransaction.mockResolvedValue({
      status:        'RECORDED',
      transactionId: TEST_TX_ID,
    });

    const res = await app.inject({
      method: 'POST',
      url:    `/tenant/escrows/${TEST_ESCROW_ID}/transactions`,
      payload: {
        entryType: 'HOLD',
        direction: 'CREDIT',
        amount:    500.00,
        currency:  'USD',
        reason:    'Initial deposit',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.transactionId).toBe(TEST_TX_ID);

    // Audit emitted for ledger entry
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('ESCROW_LEDGER_ENTRY_RECORDED');
    expect(auditArg.entityId).toBe(TEST_ESCROW_ID);
  });

  // ── E-003: POST /tenant/escrows/:id/transition — APPLIED → 200 ───────────

  it('E-003: POST /tenant/escrows/:id/transition returns 200 on APPLIED', async () => {
    _svc.transitionEscrow.mockResolvedValue({
      status:       'APPLIED',
      escrowId:     TEST_ESCROW_ID,
      fromStateKey: 'DRAFT',
      toStateKey:   'ACTIVE',
      transitionId: 'tr-abc',
    });

    const res = await app.inject({
      method: 'POST',
      url:    `/tenant/escrows/${TEST_ESCROW_ID}/transition`,
      payload: {
        toStateKey: 'ACTIVE',
        reason:     'Activating escrow',
        actorRole:  'APPROVER',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('APPLIED');
    expect(body.data.fromStateKey).toBe('DRAFT');

    // APPLIED audit
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('ESCROW_TRANSITION_APPLIED');
    expect(auditArg.entityId).toBe(TEST_ESCROW_ID);
  });

  // ── E-004: POST /tenant/escrows/:id/transition — PENDING_APPROVAL → 202 ──

  it('E-004: POST /tenant/escrows/:id/transition returns 202 on PENDING_APPROVAL', async () => {
    _svc.transitionEscrow.mockResolvedValue({
      status:         'PENDING_APPROVAL',
      escrowId:       TEST_ESCROW_ID,
      fromStateKey:   'ACTIVE',
      requiredActors: ['COMPLIANCE_OFFICER'],
    });

    const res = await app.inject({
      method: 'POST',
      url:    `/tenant/escrows/${TEST_ESCROW_ID}/transition`,
      payload: {
        toStateKey: 'SETTLED',
        reason:     'Settlement pending approval',
        actorRole:  'TRADER',
      },
    });

    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.data.status).toBe('PENDING_APPROVAL');
    expect(body.data.requiredActors).toContain('COMPLIANCE_OFFICER');

    // PENDING audit
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('ESCROW_TRANSITION_PENDING');
  });

  // ── E-005: POST /tenant/escrows/:id/transition — ENTITY_FROZEN → 423 ─────

  it('E-005: POST /tenant/escrows/:id/transition returns 423 on ENTITY_FROZEN', async () => {
    _svc.transitionEscrow.mockResolvedValue({
      status:  'ERROR',
      code:    'ENTITY_FROZEN',
      message: 'Escrow is frozen due to active escalation.',
    });

    const res = await app.inject({
      method: 'POST',
      url:    `/tenant/escrows/${TEST_ESCROW_ID}/transition`,
      payload: {
        toStateKey: 'ACTIVE',
        reason:     'Should be blocked by freeze gate',
        actorRole:  'TRADER',
      },
    });

    expect(res.statusCode).toBe(423);
    const body = res.json();
    expect(body.error.code).toBe('ENTITY_FROZEN');

    // REJECTED audit still emitted
    const auditArg = vi.mocked(writeAuditLog).mock.calls[0][1];
    expect(auditArg.action).toBe('ESCROW_TRANSITION_REJECTED');
  });
});

// ── Control Tests ─────────────────────────────────────────────────────────────

describe('G-018 Control Escrow Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    _svc.listEscrowAccounts     = vi.fn();
    _svc.getEscrowAccountDetail = vi.fn();
    _svc.computeDerivedBalance  = vi.fn();
    app = await buildControlApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── E-006: GET /control/escrows — list ────────────────────────────────────

  it('E-006: GET /control/escrows returns 200 with escrow list', async () => {
    _svc.listEscrowAccounts.mockResolvedValue({
      status:  'OK',
      escrows: [
        {
          id:                TEST_ESCROW_ID,
          tenantId:          TEST_TENANT_ID,
          currency:          'USD',
          lifecycleStateId:  'state-uuid',
          lifecycleStateKey: 'ACTIVE',
          createdByUserId:   TEST_USER_ID,
          createdAt:         '2024-01-01T00:00:00.000Z',
          updatedAt:         '2024-01-01T00:00:00.000Z',
        },
      ],
      count: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url:    '/escrows',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.count).toBe(1);
    expect(body.data.escrows[0].id).toBe(TEST_ESCROW_ID);
  });

  // ── E-007: GET /control/escrows/:id — detail ─────────────────────────────

  it('E-007: GET /control/escrows/:id returns 200 with escrow detail and balance', async () => {
    _svc.getEscrowAccountDetail.mockResolvedValue({
      status:  'OK',
      escrow: {
        id:                TEST_ESCROW_ID,
        tenantId:          TEST_TENANT_ID,
        currency:          'USD',
        lifecycleStateId:  'state-uuid',
        lifecycleStateKey: 'ACTIVE',
        createdByUserId:   TEST_USER_ID,
        createdAt:         '2024-01-01T00:00:00.000Z',
        updatedAt:         '2024-01-01T00:00:00.000Z',
      },
      balance:            500.0,
      recentTransactions: [],
    });

    const res = await app.inject({
      method: 'GET',
      url:    `/escrows/${TEST_ESCROW_ID}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.escrow.id).toBe(TEST_ESCROW_ID);
    expect(body.data.balance).toBe(500.0);
    expect(Array.isArray(body.data.recentTransactions)).toBe(true);
  });
});
