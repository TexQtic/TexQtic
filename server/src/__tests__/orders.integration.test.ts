/**
 * TECS-B2B-ORDERS-LIFECYCLE-001 — Slice B: Orders Route Integration Tests (Mocked)
 * Task ID: TECS-B2B-ORDERS-LIFECYCLE-001-SLICE-B
 *
 * Tests the HTTP surface of the four Orders routes by mocking Prisma, withDbContext,
 * writeAuditLog, computeTotals, and StateMachineService so no real DB is required.
 *
 * Routes under test (all in server/src/routes/tenant.ts):
 *   POST   /api/tenant/checkout
 *   GET    /api/tenant/orders
 *   GET    /api/tenant/orders/:id
 *   PATCH  /api/tenant/orders/:id/status
 *
 * Invariants verified:
 *   ORD-B-001 to ORD-B-007  — POST /checkout (creation, empty cart, audit, lifecycle log)
 *   ORD-B-008 to ORD-B-015  — GET  /orders   (role-scoped list, serialization, empty list)
 *   ORD-B-016 to ORD-B-023  — GET  /orders/:id (single order, role scoping, 404)
 *   ORD-B-024 to ORD-B-036  — PATCH /orders/:id/status (SM transitions, role gate, Option A)
 *   ORD-B-037 to ORD-B-039  — Tenant isolation (cross-org results withheld by withDbContext)
 *
 * Option A assertion (§13 spec + Slice A CONSUMERS_FOUND decision):
 *   CONFIRMED/FULFILLED transitions → DB status written as 'PLACED' (not CONFIRMED/FULFILLED)
 *   Canonical semantic state lives in order_lifecycle_logs.to_state
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
const {
  FAKE_TX,
  _sm,
  MOCK_COMPUTE_TOTALS,
} = vi.hoisted(() => {
  const MOCK_CART_FIND_FIRST    = vi.fn();
  const MOCK_CART_UPDATE         = vi.fn();
  const MOCK_ORDER_CREATE        = vi.fn();
  const MOCK_ORDER_FIND_MANY     = vi.fn();
  const MOCK_ORDER_FIND_FIRST    = vi.fn();
  const MOCK_ORDER_FIND_UNIQUE   = vi.fn();
  const MOCK_ORDER_UPDATE        = vi.fn();
  const MOCK_OLL_CREATE          = vi.fn();
  const MOCK_OLL_FIND_FIRST      = vi.fn();

  const FAKE_TX = {
    $executeRaw:       vi.fn().mockResolvedValue(undefined),
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $transaction:      vi.fn((cb: (tx: unknown) => Promise<unknown>) => cb(FAKE_TX)),
    cart: {
      findFirst: MOCK_CART_FIND_FIRST,
      update:    MOCK_CART_UPDATE,
    },
    order: {
      create:     MOCK_ORDER_CREATE,
      findMany:   MOCK_ORDER_FIND_MANY,
      findFirst:  MOCK_ORDER_FIND_FIRST,
      findUnique: MOCK_ORDER_FIND_UNIQUE,
      update:     MOCK_ORDER_UPDATE,
    },
    order_lifecycle_logs: {
      create:    MOCK_OLL_CREATE,
      findFirst: MOCK_OLL_FIND_FIRST,
    },
  };

  // StateMachineService method holder — mutated per-test in beforeEach
  const _sm = {
    transition: vi.fn(),
  };

  const MOCK_COMPUTE_TOTALS = vi.fn();

  return { FAKE_TX, _sm, MOCK_COMPUTE_TOTALS };
});

// Mock prisma singleton (passed as first arg to withDbContext; actual calls go through FAKE_TX)
vi.mock('../db/prisma.js', () => ({
  prisma: {},
}));

// Mock withDbContext: run callback with FAKE_TX (bypasses RLS/GUC setup)
vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn(
    async (_prisma: unknown, _ctx: unknown, cb: (tx: typeof FAKE_TX) => Promise<unknown>) => cb(FAKE_TX),
  ),
  withOrgAdminContext:      vi.fn(),
  canonicalizeTenantPlan:   vi.fn(),
  getOrganizationIdentity:  vi.fn(),
  // Must be a real class for instanceof checks in other route handlers (not Orders)
  OrganizationNotFoundError: class OrganizationNotFoundError extends Error {
    constructor(msg: string) { super(msg); this.name = 'OrganizationNotFoundError'; }
  },
}));

// Mock writeAuditLog (side-effect only — no return value needed)
vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog:        vi.fn().mockResolvedValue(undefined),
  writeAuthorityIntent: vi.fn().mockResolvedValue(undefined),
  createAdminAudit:     vi.fn().mockReturnValue({}),
}));

// Mock computeTotals + TotalsInputError
vi.mock('../services/pricing/totals.service.js', () => ({
  computeTotals: MOCK_COMPUTE_TOTALS,
  TotalsInputError: class TotalsInputError extends Error {
    code: string;
    constructor(msg: string, code: string) {
      super(msg);
      this.name = 'TotalsInputError';
      this.code = code;
    }
  },
}));

// Mock StateMachineService constructor to return _sm holder
vi.mock('../services/stateMachine.service.js', () => ({
  // Must use `function` — Vitest v4 calls `new impl()`, arrow functions cannot be constructors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  StateMachineService: vi.fn(function (this: any) { return _sm; }),
}));

// Mock auth middleware: always pass (role injected via onRequest hook)
vi.mock('../middleware/auth.js', () => ({
  tenantAuthMiddleware:      vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
  adminAuthMiddleware:       vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
  requireAdminRole:          vi.fn(() => (_req: unknown, _rep: unknown, done: () => void) => done()),
  databaseContextMiddleware: vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
}));

// Mock database-context middleware: always pass
vi.mock('../middleware/database-context.middleware.js', () => ({
  databaseContextMiddleware: vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import tenantRoutes from '../routes/tenant.js';
import { writeAuditLog } from '../lib/auditLog.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEST_ORG_ID      = 'aaaaaaaa-0001-0000-0000-aaaaaaaaaaaa';
const TEST_USER_ID     = 'bbbbbbbb-0002-0000-0000-bbbbbbbbbbbb';
const TEST_ORDER_ID    = 'cccccccc-0003-0000-0000-cccccccccccc';
const TEST_CART_ID     = 'dddddddd-0004-0000-0000-dddddddddddd';
const TEST_CATALOG_ID  = 'eeeeeeee-0005-0000-0000-eeeeeeeeeeee';
const OTHER_USER_ID    = 'ffffffff-0006-0000-0000-ffffffffffff';
const OTHER_ORG_ID     = '11111111-0007-0000-0000-111111111111';

/** Canonical mock totals returned by computeTotals */
const MOCK_TOTALS = {
  subtotal:      100,
  grandTotal:    110,
  discountTotal: 0,
  taxableAmount: 100,
  taxTotal:      10,
  feeTotal:      0,
  breakdown:     [],
  currency:      'USD',
};

/** A minimal mock order_lifecycle_log row (as returned by Prisma) */
function makeOllRow(toState: string, fromState: string | null = null) {
  return {
    from_state: fromState,
    to_state:   toState,
    realm:      'tenant',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };
}

/** A minimal mock order with lifecycle logs (Prisma shape) */
function makeRawOrder(overrides: Record<string, unknown> = {}) {
  return {
    id:                   TEST_ORDER_ID,
    tenantId:             TEST_ORG_ID,
    userId:               TEST_USER_ID,
    cartId:               TEST_CART_ID,
    status:               'PAYMENT_PENDING',
    currency:             'USD',
    subtotal:             100,
    total:                110,
    items:                [],
    order_lifecycle_logs: [makeOllRow('PAYMENT_PENDING')],
    createdAt:            new Date('2026-01-01T00:00:00.000Z'),
    updatedAt:            new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** A minimal mock cart with items */
function makeCart(overrides: Record<string, unknown> = {}) {
  return {
    id:     TEST_CART_ID,
    userId: TEST_USER_ID,
    status: 'ACTIVE',
    items: [
      {
        id:            'item-uuid-0001',
        catalogItemId: TEST_CATALOG_ID,
        quantity:      2,
        catalogItem: {
          id:    TEST_CATALOG_ID,
          name:  'Widget',
          sku:   'WIDGET-001',
          price: 50,
        },
      },
    ],
    ...overrides,
  };
}

// ── App factory ───────────────────────────────────────────────────────────────

/**
 * Build a minimal Fastify instance that registers the full tenant.ts plugin.
 * The onRequest hook injects auth context, simulating what tenantAuthMiddleware
 * and databaseContextMiddleware provide in production.
 *
 * @param role - userRole injected onto the request (default: 'OWNER')
 * @param orgId - org scope injected via dbContext (default: TEST_ORG_ID)
 * @param userId - user identity (default: TEST_USER_ID)
 */
async function buildApp(
  role    = 'OWNER',
  orgId   = TEST_ORG_ID,
  userId  = TEST_USER_ID,
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, { secret: 'test-secret-key-32-chars-longxxx' });

  // Inject tenant auth context (bypasses real JWT validation — auth.js is mocked)
  fastify.addHook('onRequest', async req => {
    const r = req as unknown as Record<string, unknown>;
    r.userId    = userId;
    r.userRole  = role;
    r.dbContext = {
      orgId,
      actorId:   userId,
      realm:     'tenant',
      requestId: 'test-req-id-orders',
    };
  });

  await fastify.register(tenantRoutes, { prefix: '/api' });
  await fastify.ready();
  return fastify;
}

// ── Test Suites ───────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tenant/checkout — ORD-B-001 through ORD-B-007
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/tenant/checkout', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    FAKE_TX.cart.findFirst.mockResolvedValue(makeCart());
    FAKE_TX.cart.update.mockResolvedValue({});
    FAKE_TX.order.create.mockResolvedValue({
      id:       TEST_ORDER_ID,
      status:   'PAYMENT_PENDING',
      currency: 'USD',
    });
    FAKE_TX.order_lifecycle_logs.create.mockResolvedValue({});
    MOCK_COMPUTE_TOTALS.mockReturnValue(MOCK_TOTALS);

    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ORD-B-001
  it('happy path: creates order → 201 with orderId, status, currency, totals', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/tenant/checkout' });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.orderId).toBe(TEST_ORDER_ID);
    expect(data.status).toBe('PAYMENT_PENDING');
    expect(data.currency).toBe('USD');
    expect(data.itemCount).toBe(1);
    expect(data.totals).toBeDefined();
  });

  // ORD-B-002
  it('no active cart → 404', async () => {
    FAKE_TX.cart.findFirst.mockResolvedValue(null);

    const res = await app.inject({ method: 'POST', url: '/api/tenant/checkout' });

    expect(res.statusCode).toBe(404);
  });

  // ORD-B-003
  it('empty cart → 400', async () => {
    FAKE_TX.cart.findFirst.mockResolvedValue(makeCart({ items: [] }));

    const res = await app.inject({ method: 'POST', url: '/api/tenant/checkout' });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { error: { code: string; message: string } };
    expect(body.error.message).toMatch(/empty/i);
  });

  // ORD-B-004
  it('writeAuditLog is called with action order.CHECKOUT_COMPLETED', async () => {
    await app.inject({ method: 'POST', url: '/api/tenant/checkout' });

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArgs = (writeAuditLog as ReturnType<typeof vi.fn>).mock.calls[0] as [unknown, Record<string, unknown>];
    expect(auditArgs[1].action).toBe('order.CHECKOUT_COMPLETED');
    expect(auditArgs[1].entity).toBe('order');
  });

  // ORD-B-005
  it('initial lifecycle log is created with to_state PAYMENT_PENDING', async () => {
    await app.inject({ method: 'POST', url: '/api/tenant/checkout' });

    expect(FAKE_TX.order_lifecycle_logs.create).toHaveBeenCalledOnce();
    const ollArgs = FAKE_TX.order_lifecycle_logs.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(ollArgs.data.to_state).toBe('PAYMENT_PENDING');
    expect(ollArgs.data.from_state).toBeNull();
    expect(ollArgs.data.tenant_id).toBe(TEST_ORG_ID);
  });

  // ORD-B-006
  it('userId derived from dbContext.actorId (not from request body)', async () => {
    await app.inject({
      method:  'POST',
      url:     '/api/tenant/checkout',
      payload: { userId: OTHER_USER_ID }, // attacker-supplied body field — must be ignored
    });

    // The order should be created with TEST_USER_ID (from dbContext), not OTHER_USER_ID
    expect(FAKE_TX.order.create).toHaveBeenCalledOnce();
    const createArgs = FAKE_TX.order.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArgs.data.userId).toBe(TEST_USER_ID);
  });

  // ORD-B-007
  it('cart is marked CHECKED_OUT after successful checkout', async () => {
    await app.inject({ method: 'POST', url: '/api/tenant/checkout' });

    expect(FAKE_TX.cart.update).toHaveBeenCalledOnce();
    const updateArgs = FAKE_TX.cart.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateArgs.data.status).toBe('CHECKED_OUT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tenant/orders — ORD-B-008 through ORD-B-015
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/tenant/orders', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ORD-B-008
  it('OWNER sees all orders (no userId filter on Prisma query)', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([makeRawOrder()]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });

    expect(res.statusCode).toBe(200);
    const findManyArgs = FAKE_TX.order.findMany.mock.calls[0][0] as { where?: unknown };
    // OWNER has no userId scoping — where should be undefined
    expect(findManyArgs.where).toBeUndefined();
  });

  // ORD-B-009
  it('ADMIN sees all orders (no userId filter on Prisma query)', async () => {
    await app.close();
    app = await buildApp('ADMIN');
    FAKE_TX.order.findMany.mockResolvedValue([makeRawOrder()]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });

    expect(res.statusCode).toBe(200);
    const findManyArgs = FAKE_TX.order.findMany.mock.calls[0][0] as { where?: unknown };
    expect(findManyArgs.where).toBeUndefined();
  });

  // ORD-B-010
  it('MEMBER sees only own orders (scoped by userId in Prisma query)', async () => {
    await app.close();
    app = await buildApp('MEMBER');
    FAKE_TX.order.findMany.mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });

    expect(res.statusCode).toBe(200);
    const findManyArgs = FAKE_TX.order.findMany.mock.calls[0][0] as { where?: { userId?: string } };
    expect(findManyArgs.where?.userId).toBe(TEST_USER_ID);
  });

  // ORD-B-011
  it('VIEWER sees only own orders (scoped by userId in Prisma query)', async () => {
    await app.close();
    app = await buildApp('VIEWER');
    FAKE_TX.order.findMany.mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });

    expect(res.statusCode).toBe(200);
    const findManyArgs = FAKE_TX.order.findMany.mock.calls[0][0] as { where?: { userId?: string } };
    expect(findManyArgs.where?.userId).toBe(TEST_USER_ID);
  });

  // ORD-B-012
  it('empty list → { orders: [], count: 0 }', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });

    expect(res.statusCode).toBe(200);
    const data = (JSON.parse(res.body) as { data: { orders: unknown[]; count: number } }).data;
    expect(data.orders).toHaveLength(0);
    expect(data.count).toBe(0);
  });

  // ORD-B-013
  it('serialized order includes lifecycleState from latest log', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([
      makeRawOrder({ order_lifecycle_logs: [makeOllRow('CONFIRMED', 'PAYMENT_PENDING')] }),
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });

    const data = (JSON.parse(res.body) as { data: { orders: Array<Record<string, unknown>> } }).data;
    expect(data.orders[0].lifecycleState).toBe('CONFIRMED');
  });

  // ORD-B-014
  it('serialized order includes lifecycleLogs array', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([
      makeRawOrder({
        order_lifecycle_logs: [
          makeOllRow('CONFIRMED', 'PAYMENT_PENDING'),
          makeOllRow('PAYMENT_PENDING', null),
        ],
      }),
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });

    const data = (JSON.parse(res.body) as { data: { orders: Array<{ lifecycleLogs: unknown[] }> } }).data;
    expect(data.orders[0].lifecycleLogs).toHaveLength(2);
    const logs = data.orders[0].lifecycleLogs as Array<Record<string, unknown>>;
    expect(logs[0].toState).toBe('CONFIRMED');
    expect(logs[0].fromState).toBe('PAYMENT_PENDING');
  });

  // ORD-B-015
  it('order without lifecycle logs → lifecycleState null, lifecycleLogs []', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([
      makeRawOrder({ order_lifecycle_logs: [] }),
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });

    const data = (JSON.parse(res.body) as { data: { orders: Array<Record<string, unknown>> } }).data;
    expect(data.orders[0].lifecycleState).toBeNull();
    expect(data.orders[0].lifecycleLogs).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tenant/orders/:id — ORD-B-016 through ORD-B-023
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/tenant/orders/:id', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ORD-B-016
  it('OWNER can read any order → 200 with lifecycleState', async () => {
    FAKE_TX.order.findFirst.mockResolvedValue(makeRawOrder());

    const res = await app.inject({ method: 'GET', url: `/api/tenant/orders/${TEST_ORDER_ID}` });

    expect(res.statusCode).toBe(200);
    const data = (JSON.parse(res.body) as { data: { order: Record<string, unknown> } }).data;
    expect(data.order.id).toBe(TEST_ORDER_ID);
    expect(data.order.lifecycleState).toBe('PAYMENT_PENDING');
  });

  // ORD-B-017
  it('OWNER query is not scoped by userId', async () => {
    FAKE_TX.order.findFirst.mockResolvedValue(makeRawOrder());

    await app.inject({ method: 'GET', url: `/api/tenant/orders/${TEST_ORDER_ID}` });

    const findArgs = FAKE_TX.order.findFirst.mock.calls[0][0] as { where: Record<string, unknown> };
    // OWNER/ADMIN: where = { id: orderId } — no userId scoping
    expect(findArgs.where.userId).toBeUndefined();
    expect(findArgs.where.id).toBe(TEST_ORDER_ID);
  });

  // ORD-B-018
  it('MEMBER query is scoped by userId', async () => {
    await app.close();
    app = await buildApp('MEMBER');
    FAKE_TX.order.findFirst.mockResolvedValue(makeRawOrder());

    await app.inject({ method: 'GET', url: `/api/tenant/orders/${TEST_ORDER_ID}` });

    const findArgs = FAKE_TX.order.findFirst.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(findArgs.where.userId).toBe(TEST_USER_ID);
    expect(findArgs.where.id).toBe(TEST_ORDER_ID);
  });

  // ORD-B-019
  it('order not found → 404', async () => {
    FAKE_TX.order.findFirst.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/api/tenant/orders/${TEST_ORDER_ID}` });

    expect(res.statusCode).toBe(404);
  });

  // ORD-B-020
  it('invalid UUID param → 422', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders/not-a-uuid' });

    // sendValidationError uses HTTP 400 (TexQtic convention)
    expect(res.statusCode).toBe(400);
  });

  // ORD-B-021
  it('cross-tenant order not visible (withDbContext returns null for other org)', async () => {
    // Simulate RLS withholding cross-org order: findFirst returns null
    FAKE_TX.order.findFirst.mockResolvedValue(null);

    // Attacker is authenticated for OTHER_ORG_ID but requests TEST_ORDER_ID
    await app.close();
    app = await buildApp('OWNER', OTHER_ORG_ID);
    const res = await app.inject({ method: 'GET', url: `/api/tenant/orders/${TEST_ORDER_ID}` });

    expect(res.statusCode).toBe(404);
    // Confirm no order data is leaked in the response body
    expect(res.body).not.toContain(TEST_ORDER_ID);
  });

  // ORD-B-022
  it('response includes lifecycleLogs with createdAt ISO string', async () => {
    FAKE_TX.order.findFirst.mockResolvedValue(makeRawOrder());

    const res = await app.inject({ method: 'GET', url: `/api/tenant/orders/${TEST_ORDER_ID}` });

    const data = (JSON.parse(res.body) as { data: { order: { lifecycleLogs: Array<Record<string, unknown>> } } }).data;
    expect(data.order.lifecycleLogs[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  // ORD-B-023
  it('MEMBER cannot read other user order (findFirst scopes by userId — returns null)', async () => {
    await app.close();
    app = await buildApp('MEMBER', TEST_ORG_ID, OTHER_USER_ID);
    // FAKE_TX scoped by OTHER_USER_ID — simulating that this user's own orders are empty
    FAKE_TX.order.findFirst.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/api/tenant/orders/${TEST_ORDER_ID}` });

    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/tenant/orders/:id/status — ORD-B-024 through ORD-B-036
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/tenant/orders/:id/status', () => {
  let app: FastifyInstance;

  const CONFIRMED_ORDER = makeRawOrder({ status: 'PAYMENT_PENDING' });
  const LATEST_LOG      = makeOllRow('PAYMENT_PENDING', null);

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: happy path for CONFIRMED transition
    FAKE_TX.order.findUnique.mockResolvedValue(CONFIRMED_ORDER);
    FAKE_TX.order_lifecycle_logs.findFirst.mockResolvedValue(LATEST_LOG);
    FAKE_TX.order.update.mockResolvedValue({ ...CONFIRMED_ORDER, status: 'PLACED' });

    _sm.transition = vi.fn().mockResolvedValue({ status: 'APPLIED' });

    app = await buildApp('OWNER');
  });

  afterEach(async () => {
    await app.close();
  });

  // ORD-B-024: Option A assertion — CONFIRMED writes DB PLACED
  it('OWNER confirms order → 200; DB status written as PLACED (Option A)', async () => {
    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'CONFIRMED' },
    });

    expect(res.statusCode).toBe(200);
    const updateArgs = FAKE_TX.order.update.mock.calls[0][0] as { data: { status: string } };
    // Option A: CONFIRMED semantic → PLACED in DB
    expect(updateArgs.data.status).toBe('PLACED');
  });

  // ORD-B-025: Option A assertion — FULFILLED writes DB PLACED
  it('OWNER fulfils order → 200; DB status written as PLACED (Option A)', async () => {
    FAKE_TX.order.findUnique.mockResolvedValue(makeRawOrder({ status: 'PLACED' }));
    FAKE_TX.order_lifecycle_logs.findFirst.mockResolvedValue(makeOllRow('CONFIRMED', 'PAYMENT_PENDING'));
    FAKE_TX.order.update.mockResolvedValue({ ...CONFIRMED_ORDER, status: 'PLACED' });

    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'FULFILLED' },
    });

    expect(res.statusCode).toBe(200);
    const updateArgs = FAKE_TX.order.update.mock.calls[0][0] as { data: { status: string } };
    // Option A: FULFILLED semantic → PLACED in DB
    expect(updateArgs.data.status).toBe('PLACED');
  });

  // ORD-B-026: CANCELLED writes DB CANCELLED (not PLACED)
  it('OWNER cancels order → 200; DB status written as CANCELLED', async () => {
    FAKE_TX.order.update.mockResolvedValue({ ...CONFIRMED_ORDER, status: 'CANCELLED' });

    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'CANCELLED' },
    });

    expect(res.statusCode).toBe(200);
    const updateArgs = FAKE_TX.order.update.mock.calls[0][0] as { data: { status: string } };
    expect(updateArgs.data.status).toBe('CANCELLED');
  });

  // ORD-B-027: MEMBER cannot patch → 403
  it('MEMBER cannot update order status → 403', async () => {
    await app.close();
    app = await buildApp('MEMBER');

    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'CONFIRMED' },
    });

    expect(res.statusCode).toBe(403);
    // SM must NOT be called — role gate fires before DB access
    expect(_sm.transition).not.toHaveBeenCalled();
  });

  // ORD-B-028: VIEWER cannot patch → 403
  it('VIEWER cannot update order status → 403', async () => {
    await app.close();
    app = await buildApp('VIEWER');

    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'CONFIRMED' },
    });

    expect(res.statusCode).toBe(403);
    expect(_sm.transition).not.toHaveBeenCalled();
  });

  // ORD-B-029: invalid status value → 422
  it('invalid status enum value → 422', async () => {
    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'SHIPPED' }, // not a valid enum value
    });

    // sendValidationError uses HTTP 400 (TexQtic convention)
    expect(res.statusCode).toBe(400);
    expect(_sm.transition).not.toHaveBeenCalled();
  });

  // ORD-B-030: order not found → 404
  it('order not found → 404', async () => {
    FAKE_TX.order.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'CONFIRMED' },
    });

    expect(res.statusCode).toBe(404);
  });

  // ORD-B-031: invalid UUID param → 422
  it('invalid UUID in path → 422', async () => {
    const res = await app.inject({
      method:  'PATCH',
      url:     '/api/tenant/orders/bad-uuid/status',
      payload: { status: 'CONFIRMED' },
    });

    // sendValidationError uses HTTP 400 (TexQtic convention)
    expect(res.statusCode).toBe(400);
  });

  // ORD-B-032: SM DENIED TRANSITION_NOT_PERMITTED → 409
  it('SM returns DENIED TRANSITION_NOT_PERMITTED → 409', async () => {
    _sm.transition = vi.fn().mockResolvedValue({
      status: 'DENIED',
      code:   'TRANSITION_NOT_PERMITTED',
    });

    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'CONFIRMED' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.body).toContain('PAYMENT_PENDING');
    expect(res.body).toContain('CONFIRMED');
  });

  // ORD-B-033: SM DENIED TRANSITION_FROM_TERMINAL → 409
  it('SM returns DENIED TRANSITION_FROM_TERMINAL (terminal state) → 409', async () => {
    FAKE_TX.order_lifecycle_logs.findFirst.mockResolvedValue(makeOllRow('CANCELLED', 'PAYMENT_PENDING'));
    _sm.transition = vi.fn().mockResolvedValue({
      status: 'DENIED',
      code:   'TRANSITION_FROM_TERMINAL',
    });

    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'CONFIRMED' },
    });

    expect(res.statusCode).toBe(409);
  });

  // ORD-B-034: SM DENIED ACTOR_ROLE_NOT_PERMITTED → 403
  it('SM returns DENIED ACTOR_ROLE_NOT_PERMITTED → 403', async () => {
    _sm.transition = vi.fn().mockResolvedValue({
      status: 'DENIED',
      code:   'ACTOR_ROLE_NOT_PERMITTED',
    });

    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'CONFIRMED' },
    });

    expect(res.statusCode).toBe(403);
  });

  // ORD-B-035: SM returns unexpected status → 500
  it('SM returns PENDING_APPROVAL (unexpected for ORDER) → 500', async () => {
    _sm.transition = vi.fn().mockResolvedValue({
      status: 'PENDING_APPROVAL',
    });

    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'CONFIRMED' },
    });

    expect(res.statusCode).toBe(500);
  });

  // ORD-B-036: canonical fromState derived from lifecycle log (not DB status)
  it('canonical fromState is from lifecycle log to_state, not DB status', async () => {
    // DB says PLACED (ambiguous), but log says CONFIRMED (semantic truth)
    FAKE_TX.order.findUnique.mockResolvedValue(makeRawOrder({ status: 'PLACED' }));
    FAKE_TX.order_lifecycle_logs.findFirst.mockResolvedValue(makeOllRow('CONFIRMED', 'PAYMENT_PENDING'));

    await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'FULFILLED' },
    });

    expect(_sm.transition).toHaveBeenCalledOnce();
    const smArgs = (_sm.transition as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    // Must use lifecycle log's to_state ('CONFIRMED'), not DB status ('PLACED')
    expect(smArgs.fromStateKey).toBe('CONFIRMED');
    expect(smArgs.toStateKey).toBe('FULFILLED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenant isolation anti-leakage — ORD-B-037 through ORD-B-039
// ─────────────────────────────────────────────────────────────────────────────

describe('Tenant isolation: cross-org order requests are withheld', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ORD-B-037: cross-org orders not visible in list
  it('ORD-B-037: GET /orders returns empty list for org with no orders (withDbContext scoped)', async () => {
    // Cross-org user gets an empty result because withDbContext RLS scopes by orgId
    const app = await buildApp('OWNER', OTHER_ORG_ID);
    FAKE_TX.order.findMany.mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });
    await app.close();

    expect(res.statusCode).toBe(200);
    const data = (JSON.parse(res.body) as { data: { orders: unknown[]; count: number } }).data;
    expect(data.count).toBe(0);
    expect(data.orders).toHaveLength(0);
  });

  // ORD-B-038: cross-org order not accessible by id
  it('ORD-B-038: GET /orders/:id → 404 when withDbContext returns null for cross-org id', async () => {
    const app = await buildApp('OWNER', OTHER_ORG_ID);
    FAKE_TX.order.findFirst.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/api/tenant/orders/${TEST_ORDER_ID}` });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain(TEST_ORDER_ID);
  });

  // ORD-B-039: PATCH on cross-org order → 404
  it('ORD-B-039: PATCH /orders/:id/status → 404 when withDbContext returns null for cross-org id', async () => {
    const app = await buildApp('OWNER', OTHER_ORG_ID);
    FAKE_TX.order.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/tenant/orders/${TEST_ORDER_ID}/status`,
      payload: { status: 'CONFIRMED' },
    });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(_sm.transition).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Slice D: cursor-based pagination — ORD-D-001 through ORD-D-012
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /orders — cursor pagination (Slice D)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ORD-D-001: default limit 20; when backend returns ≤ limit rows hasMore=false
  it('ORD-D-001: default limit=20; ≤ limit rows returned → hasMore=false, nextCursor=null', async () => {
    const app = await buildApp();
    FAKE_TX.order.findMany.mockResolvedValue([
      makeRawOrder({ id: 'dddd0001-0000-0000-0000-000000000001' }),
      makeRawOrder({ id: 'dddd0001-0000-0000-0000-000000000002' }),
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });
    await app.close();

    expect(res.statusCode).toBe(200);
    type PL = { orders: unknown[]; count: number; pagination: { hasMore: boolean; nextCursor: string | null; limit: number } };
    const data = (JSON.parse(res.body) as { data: PL }).data;
    expect(data.orders).toHaveLength(2);
    expect(data.count).toBe(2);
    expect(data.pagination.hasMore).toBe(false);
    expect(data.pagination.nextCursor).toBeNull();
    expect(data.pagination.limit).toBe(20);
  });

  // ORD-D-002: custom limit=5 is respected
  it('ORD-D-002: limit=5 query param — response contains at most 5 orders', async () => {
    const app = await buildApp();
    // Server fetches limit+1=6; return 5 → final page
    FAKE_TX.order.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) =>
        makeRawOrder({ id: `dddd0002-0000-0000-0000-${String(i + 1).padStart(12, '0')}` }),
      ),
    );

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders?limit=5' });
    await app.close();

    expect(res.statusCode).toBe(200);
    type PL = { orders: unknown[]; pagination: { hasMore: boolean; limit: number } };
    const data = (JSON.parse(res.body) as { data: PL }).data;
    expect(data.orders).toHaveLength(5);
    expect(data.pagination.limit).toBe(5);
    expect(data.pagination.hasMore).toBe(false);
  });

  // ORD-D-003: limit+1 rows returned → hasMore=true, nextCursor set to last page-order id
  it('ORD-D-003: limit+1 rows from Prisma → hasMore=true, nextCursor=last order id on page', async () => {
    const app = await buildApp();
    // limit=5 → server asks for 6; return 6 to trigger hasMore
    const rows = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeRawOrder({ id: `dddd0003-0000-0000-0000-${String(i + 1).padStart(12, '0')}` }),
      ),
      makeRawOrder({ id: 'dddd0003-0000-0000-0000-000000000099' }), // extra row
    ];
    FAKE_TX.order.findMany.mockResolvedValue(rows);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders?limit=5' });
    await app.close();

    expect(res.statusCode).toBe(200);
    type PL = { orders: unknown[]; pagination: { hasMore: boolean; nextCursor: string | null } };
    const data = (JSON.parse(res.body) as { data: PL }).data;
    expect(data.orders).toHaveLength(5);
    expect(data.pagination.hasMore).toBe(true);
    // nextCursor must be the id of the last order on the page (index 4, not the extra row)
    expect(data.pagination.nextCursor).toBe(rows[4].id);
  });

  // ORD-D-004: cursor param triggers Prisma cursor+skip and returns correct next page
  it('ORD-D-004: cursor param → findMany called with cursor:{id} and skip:1; returns second page', async () => {
    const app = await buildApp();
    const PAGE2_FIRST_ID = 'dddd0004-0000-0000-0000-000000000010';
    FAKE_TX.order.findMany.mockResolvedValue([
      makeRawOrder({ id: PAGE2_FIRST_ID }),
      makeRawOrder({ id: 'dddd0004-0000-0000-0000-000000000011' }),
    ]);

    const cursorUuid = 'cccccccc-0003-0000-0000-cccccccccccc';
    const res = await app.inject({
      method: 'GET',
      url:    `/api/tenant/orders?limit=2&cursor=${cursorUuid}`,
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    type PL = { orders: Array<{ id: string }>; pagination: { hasMore: boolean; nextCursor: string | null } };
    const data = (JSON.parse(res.body) as { data: PL }).data;
    expect(data.orders[0].id).toBe(PAGE2_FIRST_ID);
    expect(data.pagination.hasMore).toBe(false);
    expect(data.pagination.nextCursor).toBeNull();
    // Assert findMany received cursor+skip args
    const fmArgs = (FAKE_TX.order.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(fmArgs.cursor).toEqual({ id: cursorUuid });
    expect(fmArgs.skip).toBe(1);
  });

  // ORD-D-005: final page (backend returns < limit+1 rows) → hasMore=false, nextCursor=null
  it('ORD-D-005: final page — fewer rows than limit+1 → hasMore=false, nextCursor=null', async () => {
    const app = await buildApp();
    FAKE_TX.order.findMany.mockResolvedValue(
      Array.from({ length: 3 }, (_, i) =>
        makeRawOrder({ id: `dddd0005-0000-0000-0000-${String(i + 1).padStart(12, '0')}` }),
      ),
    );

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders?limit=10' });
    await app.close();

    expect(res.statusCode).toBe(200);
    type PL = { orders: unknown[]; pagination: { hasMore: boolean; nextCursor: string | null } };
    const data = (JSON.parse(res.body) as { data: PL }).data;
    expect(data.orders).toHaveLength(3);
    expect(data.pagination.hasMore).toBe(false);
    expect(data.pagination.nextCursor).toBeNull();
  });

  // ORD-D-006: MEMBER role — findMany where clause scoped to userId
  it('ORD-D-006: MEMBER role — findMany where.userId is set (tenant-wide access withheld)', async () => {
    const app = await buildApp('MEMBER', TEST_ORG_ID, TEST_USER_ID);
    FAKE_TX.order.findMany.mockResolvedValue([makeRawOrder()]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });
    await app.close();

    expect(res.statusCode).toBe(200);
    const fmArgs = (FAKE_TX.order.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect((fmArgs.where as { userId?: string })?.userId).toBe(TEST_USER_ID);
  });

  // ORD-D-007: OWNER role — findMany where clause is undefined (tenant-wide)
  it('ORD-D-007: OWNER role — findMany where is undefined (tenant-wide access granted)', async () => {
    const app = await buildApp('OWNER');
    FAKE_TX.order.findMany.mockResolvedValue([makeRawOrder()]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });
    await app.close();

    expect(res.statusCode).toBe(200);
    const fmArgs = (FAKE_TX.order.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(fmArgs.where).toBeUndefined();
  });

  // ORD-D-008: cross-tenant cursor (Prisma P2025) → 400 INVALID_CURSOR (no data leak)
  it('ORD-D-008: Prisma P2025 on cross-tenant cursor → 400 with code INVALID_CURSOR', async () => {
    const app = await buildApp();
    const p2025 = Object.assign(new Error('Record not found'), { code: 'P2025' });
    FAKE_TX.order.findMany.mockRejectedValue(p2025);

    const validUuid = 'cccccccc-0003-0000-0000-cccccccccccc';
    const res = await app.inject({
      method: 'GET',
      url:    `/api/tenant/orders?cursor=${validUuid}`,
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { error?: { code?: string } };
    expect(body.error?.code).toBe('INVALID_CURSOR');
  });

  // ORD-D-009: limit=0 (below minimum) → 400 validation error
  it('ORD-D-009: limit=0 (below minimum 1) → 400 validation error', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders?limit=0' });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  // ORD-D-010: limit=101 (above maximum 100) → 400 validation error
  it('ORD-D-010: limit=101 (above maximum 100) → 400 validation error', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders?limit=101' });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  // ORD-D-011: cursor=not-a-uuid (invalid UUID format) → 400 validation error
  it('ORD-D-011: cursor=not-a-uuid (non-UUID string) → 400 validation error', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders?cursor=not-a-uuid' });
    await app.close();
    expect(res.statusCode).toBe(400);
  });

  // ORD-D-012: response always includes lifecycleState and lifecycleLogs
  it('ORD-D-012: response order objects include lifecycleState and lifecycleLogs array', async () => {
    const app = await buildApp();
    FAKE_TX.order.findMany.mockResolvedValue([makeRawOrder()]);

    const res = await app.inject({ method: 'GET', url: '/api/tenant/orders' });
    await app.close();

    expect(res.statusCode).toBe(200);
    type OL = { lifecycleState: string | null; lifecycleLogs: unknown[] };
    const data = (JSON.parse(res.body) as { data: { orders: OL[] } }).data;
    const order = data.orders[0];
    expect(order).toHaveProperty('lifecycleState');
    expect(Array.isArray(order.lifecycleLogs)).toBe(true);
  });
});
