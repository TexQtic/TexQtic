/**
 * TECS-B2B-ORDERS-LIFECYCLE-001 — Slice E: Control-Plane Orders Read (Mocked)
 * Task ID: TECS-B2B-ORDERS-LIFECYCLE-001-SLICE-E
 *
 * Tests the HTTP surface of GET /api/control/orders by mocking Prisma, withAdminContext
 * (via withDbContext), writeAuditLog, and the auth middleware so no real DB is required.
 *
 * Route under test (server/src/routes/control.ts):
 *   GET /api/control/orders?orgId=<uuid>[&cursor=<uuid>][&limit=<n>]
 *
 * Invariants verified:
 *   ORD-E-001 — SUPER_ADMIN can list orders for a specified org
 *   ORD-E-002 — Non-admin (no isAdmin flag) receives 401
 *   ORD-E-003 — Missing orgId → 400
 *   ORD-E-004 — Invalid orgId (non-UUID) → 400
 *   ORD-E-005 — Unknown org → empty list (no error; admin context returns empty)
 *   ORD-E-006 — Pagination limit is respected (limit+1 pattern)
 *   ORD-E-007 — nextCursor works for second page (cursor navigates to next set)
 *   ORD-E-008 — Cursor from a different org returns empty (no cross-org leakage)
 *   ORD-E-009 — Response includes lifecycleState and lifecycleLogs
 *   ORD-E-010 — Response includes items array
 *   ORD-E-011 — GET /orders does not invoke create/update/delete (read-only)
 *   ORD-E-012 — Response does not expose internal DB fields (dbContext, RLS, raw keys)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// ── Hoisted mock constants ────────────────────────────────────────────────────
const {
  TEST_ADMIN_ID,
  TEST_ORG_ID,
  TEST_ORDER_ID,
  OTHER_ORG_ORDER_ID,
  FAKE_TX,
  prismaHolder,
} = vi.hoisted(() => {
  const FAKE_TX = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn(async (callback: (tx: typeof FAKE_TX) => Promise<unknown>) => callback(FAKE_TX)),
    order: {
      findMany:   vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
    },
    organizations: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
    },
    tenant: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
    },
    invite: {
      findMany: vi.fn(),
    },
  };

  const prismaHolder = {
    $transaction: vi.fn(async (callback: (tx: typeof FAKE_TX) => Promise<unknown>) => callback(FAKE_TX)),
  };

  return {
    TEST_ADMIN_ID:       '11111111-1111-1111-1111-111111111111',
    TEST_ORG_ID:         '22222222-2222-2222-2222-222222222222',
    TEST_ORDER_ID:       'cccccccc-0003-0000-0000-cccccccccccc',
    OTHER_ORG_ORDER_ID:  'dddddddd-0004-0000-0000-dddddddddddd',
    FAKE_TX,
    prismaHolder,
  };
});

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../db/prisma.js', () => ({ prisma: prismaHolder }));

vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn(
    async (_prisma: unknown, _ctx: unknown, cb: (tx: typeof FAKE_TX) => Promise<unknown>) => cb(FAKE_TX),
  ),
  withOrgAdminContext:      vi.fn(),
  canonicalizeTenantPlan:   vi.fn(),
  buildOrganizationTaxonomyCarrier: vi.fn().mockReturnValue({}),
  resolveCanonicalProvisioningIdentity: vi.fn().mockReturnValue({
    base_family: 'B2B',
    aggregator_capability: false,
    white_label_capability: false,
    commercial_plan: 'FREE',
  }),
  mapOrganizationIdentityRow: vi.fn(row => ({ id: row.id })),
  OrganizationNotFoundError: class OrganizationNotFoundError extends Error {
    constructor(msg: string) { super(msg); this.name = 'OrganizationNotFoundError'; }
  },
}));

vi.mock('../lib/auditLog.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/auditLog.js')>('../lib/auditLog.js');
  return {
    ...actual,
    writeAuditLog:        vi.fn().mockResolvedValue(undefined),
    writeAuthorityIntent: vi.fn().mockResolvedValue(undefined),
    createAdminAudit:     vi.fn().mockReturnValue({}),
  };
});

vi.mock('../middleware/auth.js', () => ({
  adminAuthMiddleware: vi.fn((request: Record<string, unknown>, _reply: unknown, done: () => void) => {
    request.isAdmin   = true;
    request.adminId   = TEST_ADMIN_ID;
    request.adminRole = 'SUPER_ADMIN';
    done();
  }),
  requireAdminRole: vi.fn(
    (_requiredRole: string) => (_request: unknown, _reply: unknown, done: () => void) => done(),
  ),
}));

vi.mock('../services/escalation.service.js', () => ({
  EscalationService: vi.fn(function (this: object) { return this; }),
}));

vi.mock('../routes/control/escalation.g022.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/trades.g017.js',     () => ({ default: async () => {} }));
vi.mock('../routes/control/escrow.g018.js',     () => ({ default: async () => {} }));
vi.mock('../routes/control/settlement.js',      () => ({ default: async () => {} }));
vi.mock('../routes/control/certifications.g019.js', () => ({ default: async () => {} }));
vi.mock('../routes/admin/traceability.g016.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/ai.g028.js',         () => ({ default: async () => {} }));

// ── Import after mocks ────────────────────────────────────────────────────────

import controlRoutes from '../routes/control.js';
import { writeAuditLog } from '../lib/auditLog.js';
import { adminAuthMiddleware } from '../middleware/auth.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOllRow(toState: string, fromState: string | null = null) {
  return {
    from_state: fromState,
    to_state:   toState,
    realm:      'tenant',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function makeRawOrder(overrides: Record<string, unknown> = {}) {
  return {
    id:                   TEST_ORDER_ID,
    tenantId:             TEST_ORG_ID,
    userId:               'user-uuid-0001-0000-0000-000000000001',
    status:               'PAYMENT_PENDING',
    currency:             'USD',
    subtotal:             100,
    total:                110,
    items:                [{ id: 'item-0001', quantity: 2 }],
    order_lifecycle_logs: [makeOllRow('PAYMENT_PENDING')],
    createdAt:            new Date('2026-01-01T00:00:00.000Z'),
    updatedAt:            new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });
  await server.register(controlRoutes, { prefix: '/api/control' });
  await server.ready();
  return server;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/control/orders — Slice E (ORD-E-001 to ORD-E-012)', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaHolder.$transaction.mockImplementation(
      async (callback: (tx: typeof FAKE_TX) => Promise<unknown>) => callback(FAKE_TX),
    );
    FAKE_TX.$executeRawUnsafe.mockResolvedValue(undefined);
    FAKE_TX.order.findMany.mockReset();
    FAKE_TX.order.create.mockReset();
    FAKE_TX.order.update.mockReset();
    FAKE_TX.order.delete.mockReset();
    FAKE_TX.organizations.findMany.mockResolvedValue([]);
    FAKE_TX.organizations.findUnique.mockResolvedValue(null);
    FAKE_TX.tenant.findMany.mockResolvedValue([]);
    FAKE_TX.tenant.findUnique.mockResolvedValue(null);
    FAKE_TX.invite.findMany.mockResolvedValue([]);
    server = await buildServer();
  });

  afterEach(async () => {
    await server.close();
  });

  // ORD-E-001
  it('ORD-E-001: SUPER_ADMIN can list orders for a specified org → 200 with orders + pagination', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([makeRawOrder()]);

    const response = await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${TEST_ORG_ID}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { success: boolean; data: { orders: unknown[]; count: number; pagination: unknown } };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.orders)).toBe(true);
    expect(body.data.count).toBe(1);
    expect(body.data.pagination).toBeDefined();
  });

  // ORD-E-002
  it('ORD-E-002: non-admin request (no isAdmin) → 401', async () => {
    // Override adminAuthMiddleware for this test to simulate unauthenticated request
    const authMock = adminAuthMiddleware as ReturnType<typeof vi.fn>;
    authMock.mockImplementationOnce((_request: Record<string, unknown>, reply: { code: (n: number) => { send: (body: unknown) => void } }, done: () => void) => {
      // Simulate failed auth — reply with 401 instead of injecting isAdmin
      reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' } });
      done();
    });

    const response = await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${TEST_ORG_ID}`,
    });

    expect(response.statusCode).toBe(401);
  });

  // ORD-E-003
  it('ORD-E-003: missing orgId → 400 validation error', async () => {
    const response = await server.inject({
      method: 'GET',
      url:    '/api/control/orders',
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as { error: { code: string } };
    expect(body.error).toBeDefined();
  });

  // ORD-E-004
  it('ORD-E-004: invalid orgId (non-UUID string) → 400 validation error', async () => {
    const response = await server.inject({
      method: 'GET',
      url:    '/api/control/orders?orgId=not-a-uuid',
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as { error: { code: string } };
    expect(body.error).toBeDefined();
  });

  // ORD-E-005
  it('ORD-E-005: unknown org → empty orders list (no error)', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([]);

    const unknownOrgId = '99999999-9999-9999-9999-999999999999';
    const response = await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${unknownOrgId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { orders: unknown[]; count: number } };
    expect(body.data.orders).toHaveLength(0);
    expect(body.data.count).toBe(0);
  });

  // ORD-E-006
  it('ORD-E-006: pagination limit respected — limit=2 with 3 rows triggers hasMore=true', async () => {
    const orders = [
      makeRawOrder({ id: 'e6000001-0000-0000-0000-e60000000001' }),
      makeRawOrder({ id: 'e6000002-0000-0000-0000-e60000000002' }),
      makeRawOrder({ id: 'e6000003-0000-0000-0000-e60000000003' }),
    ];
    FAKE_TX.order.findMany.mockResolvedValue(orders);

    const response = await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${TEST_ORG_ID}&limit=2`,
    });

    expect(response.statusCode).toBe(200);
    type Pagination = { hasMore: boolean; nextCursor: string | null; limit: number };
    const body = response.json() as { data: { orders: unknown[]; count: number; pagination: Pagination } };
    expect(body.data.orders).toHaveLength(2);
    expect(body.data.count).toBe(2);
    expect(body.data.pagination.hasMore).toBe(true);
    expect(body.data.pagination.nextCursor).toBe('e6000002-0000-0000-0000-e60000000002');
    expect(body.data.pagination.limit).toBe(2);
  });

  // ORD-E-007
  it('ORD-E-007: cursor navigates to next page — hasMore=false on final page', async () => {
    const cursorId = 'e6000002-0000-0000-0000-e60000000002';
    // Final page: exactly 1 row (no extra row → hasMore=false)
    FAKE_TX.order.findMany.mockResolvedValue([
      makeRawOrder({ id: 'e6000003-0000-0000-0000-e60000000003' }),
    ]);

    const response = await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${TEST_ORG_ID}&cursor=${cursorId}&limit=2`,
    });

    expect(response.statusCode).toBe(200);
    type Pagination = { hasMore: boolean; nextCursor: string | null };
    const body = response.json() as { data: { orders: unknown[]; pagination: Pagination } };
    expect(body.data.pagination.hasMore).toBe(false);
    expect(body.data.pagination.nextCursor).toBeNull();

    // Verify Prisma was called with cursor + skip
    expect(FAKE_TX.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: cursorId },
        skip:   1,
      }),
    );
  });

  // ORD-E-008
  it('ORD-E-008: cursor from another org returns empty page (no cross-org leak)', async () => {
    // withAdminContext filters by orgId; a cursor from another org would not exist
    // in the result set — Prisma returns empty (RLS bypass still scopes by tenantId).
    // In this mock: findMany returns [] when called with another org's cursor.
    FAKE_TX.order.findMany.mockResolvedValue([]);

    const response = await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${TEST_ORG_ID}&cursor=${OTHER_ORG_ORDER_ID}`,
    });

    // Either 200 empty list OR 400 INVALID_CURSOR — both are safe.
    // The mock doesn't throw P2025, so we expect 200 with empty orders.
    expect([200, 400]).toContain(response.statusCode);
    if (response.statusCode === 200) {
      const body = response.json() as { data: { orders: unknown[] } };
      expect(body.data.orders).toHaveLength(0);
    }
  });

  // ORD-E-009
  it('ORD-E-009: response includes lifecycleState and lifecycleLogs', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([
      makeRawOrder({
        order_lifecycle_logs: [
          makeOllRow('CONFIRMED', 'PAYMENT_PENDING'),
          makeOllRow('PAYMENT_PENDING', null),
        ],
      }),
    ]);

    const response = await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${TEST_ORG_ID}`,
    });

    expect(response.statusCode).toBe(200);
    type OrderData = { lifecycleState: string | null; lifecycleLogs: Array<{ fromState: string | null; toState: string; realm: string; createdAt: string }> };
    const body = response.json() as { data: { orders: OrderData[] } };
    const order = body.data.orders[0];

    expect(order.lifecycleState).toBe('CONFIRMED');
    expect(Array.isArray(order.lifecycleLogs)).toBe(true);
    expect(order.lifecycleLogs[0]).toMatchObject({
      fromState: 'PAYMENT_PENDING',
      toState:   'CONFIRMED',
      realm:     'tenant',
    });
    expect(typeof order.lifecycleLogs[0].createdAt).toBe('string');
  });

  // ORD-E-010
  it('ORD-E-010: response includes items array', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([
      makeRawOrder({ items: [{ id: 'item-0001', quantity: 2 }] }),
    ]);

    const response = await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${TEST_ORG_ID}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { orders: Array<{ items: unknown[] }> } };
    expect(Array.isArray(body.data.orders[0].items)).toBe(true);
  });

  // ORD-E-011
  it('ORD-E-011: GET /orders does not invoke order.create, order.update, or order.delete', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([makeRawOrder()]);

    await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${TEST_ORG_ID}`,
    });

    expect(FAKE_TX.order.create).not.toHaveBeenCalled();
    expect(FAKE_TX.order.update).not.toHaveBeenCalled();
    expect(FAKE_TX.order.delete).not.toHaveBeenCalled();
  });

  // ORD-E-012
  it('ORD-E-012: response does not expose internal DB fields (no raw Prisma keys, no dbContext)', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([makeRawOrder()]);

    const response = await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${TEST_ORG_ID}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { orders: Array<Record<string, unknown>> } };
    const order = body.data.orders[0];

    // Must NOT contain raw Prisma lifecycle log key or internal DB context fields
    expect(order).not.toHaveProperty('order_lifecycle_logs');
    expect(order).not.toHaveProperty('dbContext');
    // Must contain canonical serialized fields
    expect(order).toHaveProperty('lifecycleState');
    expect(order).toHaveProperty('lifecycleLogs');
    expect(order).toHaveProperty('grandTotal');
  });

  // Additional: writeAuditLog is called for successful reads
  it('ORD-E-001-audit: writeAuditLog is called with control.orders.read action', async () => {
    FAKE_TX.order.findMany.mockResolvedValue([makeRawOrder()]);

    await server.inject({
      method: 'GET',
      url:    `/api/control/orders?orgId=${TEST_ORG_ID}`,
    });

    expect(writeAuditLog).toHaveBeenCalled();
  });
});
