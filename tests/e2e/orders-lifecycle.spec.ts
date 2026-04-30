/**
 * TECS-B2B-ORDERS-LIFECYCLE-001 — Slice F
 * Orders Lifecycle Runtime QA
 *
 * Test groups:
 *   ORD-01 — Checkout creates order in PAYMENT_PENDING state
 *   ORD-02 — OWNER confirms order (PAYMENT_PENDING → CONFIRMED)
 *   ORD-03 — OWNER fulfills order (CONFIRMED → FULFILLED)
 *   ORD-04 — Terminal state enforcement (FULFILLED → CANCELLED rejected with 409)
 *   ORD-05 — Order detail returns full lifecycle log chain
 *   ORD-06 — MEMBER role: GET only own orders (BLOCKED_BY_AUTH)
 *   ORD-07 — MEMBER role: PATCH /orders/:id/status → 403 (BLOCKED_BY_AUTH)
 *   ORD-08 — Cross-tenant order isolation: foreign-org order returns 404
 *   ORD-09 — WL_ADMIN Orders view (BLOCKED_BY_AUTH)
 *   ORD-10 — Anti-leakage: no internal/forbidden fields in Orders API responses
 *
 * Target: https://app.texqtic.com
 * Mode: STATE-MUTATING — creates and transitions real orders against the QA tenant.
 *   One order is created per run (via POST /api/tenant/checkout).
 *   Requires an active cart with items for qa-b2b; if absent → ORD-01 is skipped
 *   and ORD-02 through ORD-05 cascade-skip via BLOCKED_BY_ORD01.
 *
 * Auth: Method A (file .auth/*.json) preferred; Method B (env vars) fallback.
 *
 * QA actors:
 *   qa-b2b      → OWNER in their B2B tenant; primary actor for checkout + lifecycle transitions
 *   qa-buyer-b  → OWNER in a DIFFERENT tenant; cross-tenant isolation probe (ORD-08)
 *   MEMBER actor → .auth/qa-buyer-member.json (qa.wl.member@texqtic.com, MEMBER in QA WL tenant)
 *   WL_ADMIN    → .auth/qa-wl-admin.json (qa.wl@texqtic.com, OWNER in QA WL tenant)
 *
 * Lifecycle state model (Option A — order_lifecycle_logs is canonical):
 *   orders.status DB field may read "PLACED" for CONFIRMED/FULFILLED semantic states.
 *   lifecycleState in API response reflects latest order_lifecycle_logs.to_state.
 *   Tests assert lifecycleState, NOT raw orders.status.
 *
 * Sequential dependency (tests share session-scoped state):
 *   ORD-01 populates mainOrderId and orderLifecycleState.
 *   ORD-02 transitions mainOrderId to CONFIRMED and updates orderLifecycleState.
 *   ORD-03 transitions mainOrderId to FULFILLED and updates orderLifecycleState.
 *   ORD-04 asserts FULFILLED → CANCELLED is rejected (409) proving terminal enforcement.
 *   ORD-05 verifies full log chain on the same order.
 *   ORD-02..05 skip with BLOCKED_BY_ORD01 if mainOrderId was not captured.
 *
 * Run:
 *   $ptBin = "C:\Users\PARESH\AppData\Local\npm-cache\_npx\420ff84f11983ee5\node_modules\.bin\playwright.cmd"
 *   & $ptBin test tests/e2e/orders-lifecycle.spec.ts --reporter=list
 *
 * NOTE: Do NOT use --project=chromium. The playwright.config.ts project is named 'api'.
 */

// Note: @playwright/test is an npx / QA-only dependency — not a project devDependency.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error @playwright/test resolved via npx at test run time
import { test, expect } from '@playwright/test';
// @ts-expect-error @playwright/test resolved via npx at test run time
import type { APIRequestContext } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'https://app.texqtic.com').replace(/\/$/, '');

// ─── QA identity constants ────────────────────────────────────────────────────
const QA_BUYER_A_EMAIL = 'qa.buyer.wvg.a@texqtic.com';
const QA_BUYER_B_EMAIL = 'qa.buyer@texqtic.com';

// ─── Method A: file-based auth state (.auth/*.json — gitignored) ──────────────
interface StoredAuthState { token: string; orgId: string; }

function loadStoredAuth(name: string): StoredAuthState | null {
  try {
    const file = join(process.cwd(), '.auth', `${name}.json`);
    if (!existsSync(file)) return null;
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const s = parsed as StoredAuthState;
    if (typeof s.token === 'string' && s.token.length > 0 &&
        typeof s.orgId === 'string' && s.orgId.length > 0) {
      return s;
    }
    return null;
  } catch { return null; }
}

const storedOwner   = loadStoredAuth('qa-b2b');          // qa-b2b — OWNER; primary actor for checkout + lifecycle
const storedBuyer2  = loadStoredAuth('qa-buyer-b');      // OWNER in a different B2B tenant
const storedMember  = loadStoredAuth('qa-buyer-member'); // MEMBER role in QA WL tenant (ORD-06/07)
const storedWlAdmin = loadStoredAuth('qa-wl-admin');     // WL_ADMIN (OWNER in QA WL tenant) (ORD-09)
const FILE_AUTH_AVAILABLE = storedOwner !== null && storedBuyer2 !== null;

// ─── Method B: env-var credentials (fallback) ─────────────────────────────────
const QA_BUYER_A_ORG_ID   = process.env.QA_BUYER_A_ORG_ID   ?? '';
const QA_BUYER_A_PASSWORD = process.env.QA_BUYER_A_PASSWORD ?? '';
const QA_BUYER_B_ORG_ID   = process.env.QA_BUYER_B_ORG_ID   ?? '';
const QA_BUYER_B_PASSWORD = process.env.QA_BUYER_B_PASSWORD ?? '';
const ENV_AUTH_AVAILABLE =
  QA_BUYER_A_ORG_ID.length > 0 && QA_BUYER_A_PASSWORD.length > 0 &&
  QA_BUYER_B_ORG_ID.length > 0 && QA_BUYER_B_PASSWORD.length > 0;

// ─── Auth availability ────────────────────────────────────────────────────────
const CREDENTIALS_AVAILABLE = FILE_AUTH_AVAILABLE || ENV_AUTH_AVAILABLE;
const AUTH_METHOD: 'file' | 'env' | 'none' =
  FILE_AUTH_AVAILABLE ? 'file' : ENV_AUTH_AVAILABLE ? 'env' : 'none';

// ─── Session-scoped tokens (populated in beforeAll) ───────────────────────────
let tokenOwner   = ''; // qa-b2b — primary actor (OWNER)
let ownerOrgId   = ''; // qa-b2b's org UUID
let tokenBuyer2  = ''; // qa-buyer-b — cross-tenant probe actor (ORD-08)
let tokenMember  = ''; // qa-buyer-member — MEMBER role (ORD-06/07)
let tokenWlAdmin = ''; // qa-wl-admin — WL_ADMIN/OWNER in QA WL tenant (ORD-09)

// ─── Runtime IDs (populated progressively by tests) ──────────────────────────
let mainOrderId        = ''; // set by ORD-01 on successful checkout
let orderLifecycleState = ''; // updated by ORD-01→02→03 as state transitions occur

// ─── Collected response bodies for anti-leakage scan (ORD-10) ────────────────
const collectedResponses: string[] = [];

// ─── Anti-leakage fields that must NOT appear in any Orders API response ──────
const ANTI_LEAKAGE_FIELDS: string[] = [
  'DATABASE_URL',
  'DIRECT_DATABASE_URL',
  'SHADOW_DATABASE_URL',
  'serviceRole',
  'app.org_id',
  'dbContext',
  'RLS',
  'allowed_transitions',
  'order_lifecycle_logs',     // raw snake_case DB field — must be stripped by serializeTenantOrder
  'password',
  'token',
  'secret',
  'catalogVisibilityPolicyMode',
  'catalog_visibility_policy_mode',
  'relationshipState',
  'internalReason',
  'supplierPolicy',
  'denialReason',
  '_prisma',
  'tenantPlan',
  'orgContext',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loginQA(
  request: APIRequestContext,
  email: string,
  password: string,
  tenantId: string
): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/auth/tenant/login`, {
    data: { email, password, tenantId },
  });
  expect(res.status()).toBe(200);
  const body = await res.json() as { success: boolean; data: { token: string } };
  expect(body.success).toBe(true);
  return body.data.token;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function captureResponse(body: unknown): void {
  try { collectedResponses.push(JSON.stringify(body)); } catch { /* un-serializable — skip */ }
}

// ─── Before all: authenticate QA actors ──────────────────────────────────────
test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
  if (AUTH_METHOD === 'file') {
    tokenOwner   = storedOwner!.token;
    ownerOrgId   = storedOwner!.orgId;
    tokenBuyer2  = storedBuyer2?.token  ?? '';
    tokenMember  = storedMember?.token  ?? '';
    tokenWlAdmin = storedWlAdmin?.token ?? '';
  } else if (AUTH_METHOD === 'env') {
    tokenOwner  = await loginQA(request, QA_BUYER_A_EMAIL, QA_BUYER_A_PASSWORD, QA_BUYER_A_ORG_ID);
    ownerOrgId  = QA_BUYER_A_ORG_ID;
    tokenBuyer2 = await loginQA(request, QA_BUYER_B_EMAIL, QA_BUYER_B_PASSWORD, QA_BUYER_B_ORG_ID);
  }
  // Cart fixture: ensure qa-b2b has at least one item in cart for ORD-01 checkout.
  if (tokenOwner) {
    const cartCheckRes = await request.get(`${BASE_URL}/api/tenant/cart`, {
      headers: authHeaders(tokenOwner),
    });
    const cartCheckBody = await cartCheckRes.json() as {
      success: boolean;
      data: { cart: { items: unknown[] } | null };
    };
    const existingCart = cartCheckBody.data?.cart;
    const cartEmpty = !existingCart || !Array.isArray(existingCart.items) || existingCart.items.length === 0;
    if (cartEmpty) {
      const catalogRes = await request.get(`${BASE_URL}/api/tenant/catalog/items?limit=5`, {
        headers: authHeaders(tokenOwner),
      });
      const catalogBody = await catalogRes.json() as {
        data: { items: Array<{ id: string; moq: number; active: boolean }> };
      };
      const item = catalogBody.data?.items?.find((i) => i.active !== false) ?? catalogBody.data?.items?.[0];
      if (item) {
        await request.post(`${BASE_URL}/api/tenant/cart/items`, {
          headers: authHeaders(tokenOwner),
          data: { catalogItemId: item.id, quantity: item.moq ?? 1 },
        });
      }
    }
  }
  // mainOrderId is NOT pre-populated — ORD-01 creates it.
  // ORD-02 through ORD-05 skip if mainOrderId remains empty.
});

// ─── ORD-01: Checkout creates PAYMENT_PENDING order ──────────────────────────
test('ORD-01 checkout: POST /api/tenant/checkout creates PAYMENT_PENDING order', async ({
  request,
}: {
  request: APIRequestContext;
}) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no credentials available');

  // Step 1: Verify active cart exists and has items
  const cartRes = await request.get(`${BASE_URL}/api/tenant/cart`, {
    headers: authHeaders(tokenOwner),
  });
  expect(cartRes.status()).toBe(200);
  const cartBody = await cartRes.json() as {
    success: boolean;
    data: { cart: { id: string; items: unknown[] } | null };
  };
  expect(cartBody.success).toBe(true);
  captureResponse(cartBody);

  const cart = cartBody.data.cart;
  const cartHasItems = cart !== null && Array.isArray(cart.items) && cart.items.length > 0;

  test.skip(
    !cartHasItems,
    'BLOCKED_BY_DATA_FIXTURE: qa-buyer-a has no active cart with items; ' +
    'run the QA seed to add at least one item to their cart before this spec can create orders'
  );

  // Step 2: Checkout the active cart
  const checkoutRes = await request.post(`${BASE_URL}/api/tenant/checkout`, {
    headers: authHeaders(tokenOwner),
    data: {},
  });
  expect(checkoutRes.status()).toBe(201);
  const checkoutBody = await checkoutRes.json() as {
    success: boolean;
    data: {
      orderId: string;
      status: string;
      currency: string;
      itemCount: number;
      totals: { grandTotal: number };
    };
  };
  expect(checkoutBody.success).toBe(true);
  captureResponse(checkoutBody);

  // Response shape assertions
  expect(checkoutBody.data).toHaveProperty('orderId');
  expect(typeof checkoutBody.data.orderId).toBe('string');
  expect(checkoutBody.data.orderId.length).toBeGreaterThan(0);
  expect(checkoutBody.data.status).toBe('PAYMENT_PENDING');
  expect(checkoutBody.data.itemCount).toBeGreaterThan(0);
  expect(typeof checkoutBody.data.totals.grandTotal).toBe('number');
  expect(checkoutBody.data.totals.grandTotal).toBeGreaterThan(0);

  // Capture for downstream tests
  mainOrderId        = checkoutBody.data.orderId;
  orderLifecycleState = 'PAYMENT_PENDING';

  // Step 3: Verify order appears in the list with correct lifecycleState
  const ordersRes = await request.get(`${BASE_URL}/api/tenant/orders`, {
    headers: authHeaders(tokenOwner),
  });
  expect(ordersRes.status()).toBe(200);
  const ordersBody = await ordersRes.json() as {
    success: boolean;
    data: {
      orders: Array<{ id: string; lifecycleState: string | null }>;
      count: number;
      pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
    };
  };
  expect(ordersBody.success).toBe(true);
  captureResponse(ordersBody);

  const found = ordersBody.data.orders.find((o) => o.id === mainOrderId);
  expect(found, `New order ${mainOrderId} not found in GET /orders list`).toBeDefined();
  // lifecycleState comes from order_lifecycle_logs.to_state (canonical SM source)
  expect(found?.lifecycleState).toBe('PAYMENT_PENDING');
});

// ─── ORD-02: OWNER confirms order ────────────────────────────────────────────
test('ORD-02 confirm: PATCH /api/tenant/orders/:id/status → CONFIRMED', async ({
  request,
}: {
  request: APIRequestContext;
}) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no credentials available');
  test.skip(!mainOrderId, 'BLOCKED_BY_ORD01: mainOrderId not set; ORD-01 was skipped or failed');

  const res = await request.patch(
    `${BASE_URL}/api/tenant/orders/${mainOrderId}/status`,
    { headers: authHeaders(tokenOwner), data: { status: 'CONFIRMED' } }
  );
  expect(res.status()).toBe(200);
  const body = await res.json() as { success: boolean; data: { order: { id: string } } };
  expect(body.success).toBe(true);
  captureResponse(body);

  // PATCH returns raw DB order (Option A: DB status may be "PLACED" for CONFIRMED)
  // Verify canonical lifecycle state via GET /orders/:id
  const detailRes = await request.get(
    `${BASE_URL}/api/tenant/orders/${mainOrderId}`,
    { headers: authHeaders(tokenOwner) }
  );
  expect(detailRes.status()).toBe(200);
  const detailBody = await detailRes.json() as {
    success: boolean;
    data: { order: { id: string; lifecycleState: string | null } };
  };
  expect(detailBody.success).toBe(true);
  captureResponse(detailBody);

  expect(detailBody.data.order.lifecycleState).toBe('CONFIRMED');
  orderLifecycleState = 'CONFIRMED';
});

// ─── ORD-03: OWNER fulfills order ────────────────────────────────────────────
test('ORD-03 fulfill: PATCH /api/tenant/orders/:id/status → FULFILLED', async ({
  request,
}: {
  request: APIRequestContext;
}) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no credentials available');
  test.skip(!mainOrderId, 'BLOCKED_BY_ORD01: mainOrderId not set');
  test.skip(
    orderLifecycleState !== 'CONFIRMED',
    `BLOCKED_BY_ORD02: expected CONFIRMED state but got "${orderLifecycleState}"`
  );

  const res = await request.patch(
    `${BASE_URL}/api/tenant/orders/${mainOrderId}/status`,
    { headers: authHeaders(tokenOwner), data: { status: 'FULFILLED' } }
  );
  expect(res.status()).toBe(200);
  const body = await res.json() as { success: boolean; data: { order: { id: string } } };
  expect(body.success).toBe(true);
  captureResponse(body);

  // Verify canonical lifecycle state via GET /orders/:id
  const detailRes = await request.get(
    `${BASE_URL}/api/tenant/orders/${mainOrderId}`,
    { headers: authHeaders(tokenOwner) }
  );
  expect(detailRes.status()).toBe(200);
  const detailBody = await detailRes.json() as {
    success: boolean;
    data: { order: { id: string; lifecycleState: string | null } };
  };
  expect(detailBody.success).toBe(true);
  captureResponse(detailBody);

  expect(detailBody.data.order.lifecycleState).toBe('FULFILLED');
  orderLifecycleState = 'FULFILLED';
});

// ─── ORD-04: Terminal state enforcement ──────────────────────────────────────
test('ORD-04 terminal: PATCH FULFILLED → CANCELLED → 409 INVALID_TRANSITION', async ({
  request,
}: {
  request: APIRequestContext;
}) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no credentials available');
  test.skip(!mainOrderId, 'BLOCKED_BY_ORD01: mainOrderId not set');
  test.skip(
    orderLifecycleState !== 'FULFILLED',
    `BLOCKED_BY_ORD03: expected FULFILLED state but got "${orderLifecycleState}"`
  );

  // Attempt to cancel a FULFILLED order — SM must reject (FULFILLED is terminal)
  const res = await request.patch(
    `${BASE_URL}/api/tenant/orders/${mainOrderId}/status`,
    { headers: authHeaders(tokenOwner), data: { status: 'CANCELLED' } }
  );
  expect(res.status()).toBe(409);

  const body = await res.json() as {
    success: boolean;
    error: { code: string; message: string };
  };
  expect(body.success).toBe(false);
  captureResponse(body);

  // Response: { success: false, error: { code: 'ORDER_STATUS_INVALID_TRANSITION', message: '...' } }
  expect(body.error?.code).toMatch(/INVALID_TRANSITION|ORDER_STATUS_INVALID_TRANSITION/);
  expect(typeof body.error?.message).toBe('string');
  expect(body.error.message.length).toBeGreaterThan(0);
});

// ─── ORD-05: Order detail returns full lifecycle log chain ────────────────────
test('ORD-05 detail: GET /api/tenant/orders/:id returns full lifecycle log chain', async ({
  request,
}: {
  request: APIRequestContext;
}) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no credentials available');
  test.skip(!mainOrderId, 'BLOCKED_BY_ORD01: mainOrderId not set');

  const res = await request.get(
    `${BASE_URL}/api/tenant/orders/${mainOrderId}`,
    { headers: authHeaders(tokenOwner) }
  );
  expect(res.status()).toBe(200);
  const body = await res.json() as {
    success: boolean;
    data: {
      order: {
        id: string;
        lifecycleState: string | null;
        lifecycleLogs: Array<{
          fromState: string | null;
          toState: string;
          realm: string;
          createdAt: string;
        }>;
        grandTotal: number | string; // Prisma Decimal serialized as string in JSON
        currency: string;
        items: unknown[];
      };
    };
  };
  expect(body.success).toBe(true);
  captureResponse(body);

  const order = body.data.order;

  // Identity
  expect(order.id).toBe(mainOrderId);

  // Canonical lifecycle state from order_lifecycle_logs
  expect(order.lifecycleState).toBe(orderLifecycleState);

  // Lifecycle log chain: desc-ordered logs covering full transition history
  expect(Array.isArray(order.lifecycleLogs)).toBe(true);
  expect(order.lifecycleLogs.length).toBeGreaterThanOrEqual(1);

  // Each log entry has required fields
  for (const log of order.lifecycleLogs) {
    expect(typeof log.toState).toBe('string');
    expect(log.toState.length).toBeGreaterThan(0);
    expect(typeof log.realm).toBe('string');
    expect(typeof log.createdAt).toBe('string');
    // fromState is null for the initial PAYMENT_PENDING entry
    expect(log.fromState === null || typeof log.fromState === 'string').toBe(true);
  }

  // If ORD-02 and ORD-03 ran (FULFILLED path), all three states must be present in logs
  if (orderLifecycleState === 'FULFILLED') {
    const logStates = order.lifecycleLogs.map((l) => l.toState);
    expect(logStates).toContain('PAYMENT_PENDING');
    expect(logStates).toContain('CONFIRMED');
    expect(logStates).toContain('FULFILLED');
  }

  // Financial shape (grandTotal may be string-serialized Prisma Decimal — coerce to Number)
  expect(Number(order.grandTotal)).toBeGreaterThan(0);
  expect(typeof order.currency).toBe('string');
  expect(order.currency.length).toBe(3); // ISO 4217 e.g. "USD"

  // Items present
  expect(Array.isArray(order.items)).toBe(true);
  expect(order.items.length).toBeGreaterThan(0);
});

// ─── ORD-06: MEMBER role — own-orders scope ─────────────────────────────────
test('ORD-06 member-scope: MEMBER GET /api/tenant/orders sees only own orders', async ({
  request,
}: {
  request: APIRequestContext;
}) => {
  test.skip(
    tokenMember.length === 0,
    'BLOCKED_BY_AUTH: no MEMBER token available (.auth/qa-buyer-member.json missing or invalid)'
  );

  // MEMBER role: GET /api/tenant/orders — canReadTenantWideOrders=false adds WHERE userId= filter.
  // Response is 200 with an array of the MEMBER's own orders (empty list is a valid safe state).
  const res = await request.get(`${BASE_URL}/api/tenant/orders`, {
    headers: authHeaders(tokenMember),
  });
  expect(res.status()).toBe(200);
  const body = await res.json() as {
    success: boolean;
    data: { orders: Array<{ userId?: string }>; count: number; pagination: unknown };
  };
  expect(body.success).toBe(true);
  captureResponse(body);

  // Valid structure: orders array is present
  expect(Array.isArray(body.data?.orders)).toBe(true);

  // If multiple orders returned, all must share the same userId (MEMBER's own records only)
  const orders = body.data.orders;
  if (orders.length > 1) {
    const firstUserId = orders[0].userId;
    for (const o of orders) {
      expect(o.userId).toBe(firstUserId);
    }
  }
});

// ─── ORD-07: MEMBER role — PATCH denied ─────────────────────────────────────
test('ORD-07 member-deny: MEMBER PATCH /api/tenant/orders/:id/status → 403', async ({
  request,
}: {
  request: APIRequestContext;
}) => {
  test.skip(
    tokenMember.length === 0,
    'BLOCKED_BY_AUTH: no MEMBER token available (.auth/qa-buyer-member.json missing or invalid)'
  );

  // MEMBER role: PATCH /api/tenant/orders/:id/status → 403 FORBIDDEN.
  // Route gate (tenant.ts) checks role before DB lookup: only OWNER/ADMIN may mutate status.
  // A MEMBER token always receives FORBIDDEN regardless of order ownership.
  // Use mainOrderId if captured; fall back to a sentinel UUID (role gate fires before RLS).
  const targetId = mainOrderId.length > 0 ? mainOrderId : '00000000-0000-4000-8000-000000000001';
  const res = await request.patch(
    `${BASE_URL}/api/tenant/orders/${targetId}/status`,
    {
      headers: authHeaders(tokenMember),
      data: { status: 'CONFIRMED' },
    }
  );
  expect(res.status()).toBe(403);
  const body = await res.json() as { success: boolean; error: { code: string } };
  expect(body.success).toBe(false);
  expect(body.error?.code).toBe('FORBIDDEN');
  captureResponse(body);
});

// ─── ORD-08: Cross-tenant isolation — foreign order returns 404 ───────────────
test('ORD-08 cross-tenant: qa-buyer-b cannot read qa-b2b order → 404', async ({
  request,
}: {
  request: APIRequestContext;
}) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no credentials available');
  test.skip(
    tokenBuyer2.length === 0,
    'BLOCKED_BY_AUTH: no qa-buyer-b token available (.auth/qa-buyer-b.json missing or invalid)'
  );
  test.skip(
    !mainOrderId,
    'BLOCKED_BY_ORD01: mainOrderId not set; no order to probe cross-tenant against'
  );

  // qa-buyer-b sends GET for an order that belongs to qa-b2b's tenant.
  // RLS (Supabase row-level security) scopes query to qa-buyer-b's org_id → order not found.
  const res = await request.get(
    `${BASE_URL}/api/tenant/orders/${mainOrderId}`,
    { headers: authHeaders(tokenBuyer2) }
  );
  expect(res.status()).toBe(404);

  const body = await res.json() as { success: boolean; error: { code: string } };
  expect(body.success).toBe(false);
  expect(body.error?.code).toBe('NOT_FOUND');
  captureResponse(body);
});

// ─── ORD-09: WL_ADMIN Orders view ───────────────────────────────────────────
test('ORD-09 wl-admin: WL_ADMIN can view Orders panel for managed tenants', async ({
  request,
}: {
  request: APIRequestContext;
}) => {
  test.skip(
    tokenWlAdmin.length === 0,
    'BLOCKED_BY_AUTH: no WL_ADMIN token available (.auth/qa-wl-admin.json missing or invalid)'
  );

  // WL_ADMIN (OWNER role in QA WL tenant): GET /api/tenant/orders → 200.
  // canReadTenantWideOrders=true for OWNER → no userId filter; sees all tenant orders.
  const res = await request.get(`${BASE_URL}/api/tenant/orders`, {
    headers: authHeaders(tokenWlAdmin),
  });
  expect(res.status()).toBe(200);
  const body = await res.json() as {
    success: boolean;
    data: { orders: unknown[]; count: number; pagination: unknown };
  };
  expect(body.success).toBe(true);
  captureResponse(body);

  // Valid structure: orders array, count, and pagination all present
  expect(Array.isArray(body.data?.orders)).toBe(true);
  expect(typeof body.data?.count).toBe('number');
  expect(body.data?.pagination).toBeDefined();
});

// ─── ORD-10: Anti-leakage scan across all Orders API responses ────────────────
test('ORD-10 anti-leakage: Orders API responses contain no internal/forbidden fields', async ({
  request,
}: {
  request: APIRequestContext;
}) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no credentials available');

  // Collect fresh responses to ensure coverage even if earlier tests were skipped
  const ordersRes = await request.get(`${BASE_URL}/api/tenant/orders`, {
    headers: authHeaders(tokenOwner),
  });
  const ordersBody = await ordersRes.json() as unknown;
  captureResponse(ordersBody);

  if (mainOrderId) {
    const detailRes = await request.get(
      `${BASE_URL}/api/tenant/orders/${mainOrderId}`,
      { headers: authHeaders(tokenOwner) }
    );
    const detailBody = await detailRes.json() as unknown;
    captureResponse(detailBody);
  }

  // Also probe GET /api/tenant/cart to verify no leakage in cart response
  const cartRes = await request.get(`${BASE_URL}/api/tenant/cart`, {
    headers: authHeaders(tokenOwner),
  });
  const cartBody = await cartRes.json() as unknown;
  captureResponse(cartBody);

  // Flatten all captured response texts for scanning
  const allResponseText = collectedResponses.join('\n');

  for (const field of ANTI_LEAKAGE_FIELDS) {
    // Check for field as a JSON key: "field" (with double quotes as would appear in serialized JSON)
    expect(
      allResponseText,
      `Anti-leakage violation: field "${field}" must not appear in any Orders API response`
    ).not.toContain(`"${field}"`);
  }
});
