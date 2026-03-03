/**
 * RCP-1 Revenue Flow Validation — OPS-REVENUE-FLOW-VALIDATION-002 / GAP-ORDER-LC-001-UX-VALIDATION-001 (B5)
 *
 * Validation ceiling: PAYMENT_PENDING + SM-driven transitions (CONFIRMED / FULFILLED / CANCELLED).
 * Lifecycle proof: order_lifecycle_logs (Prisma direct) replaces audit_logs lifecycle seam check.
 *   order.lifecycle.* audit writes were REMOVED in B4 (GAP-ORDER-LC-001-BACKEND-INTEGRATION-001).
 *   Canonical state is now: latest order_lifecycle_logs.to_state (written by StateMachineService).
 * Non-goals (LOCKED): payment gateway, new endpoints, schema migrations, RLS, UI display changes.
 *
 * Pattern: same as proof-g001/002/003.ts — Prisma for DB reads, HTTP for API calls,
 * JWT signed with JWT_ACCESS_SECRET (same approach as integration tests).
 *
 * Allowlist: server/scripts/** (proof scripts precedent: proof-g001.ts, proof-g002.ts, proof-g003.ts)
 *
 * Run: pnpm -C server exec tsx scripts/validate-rcp1-flow.ts
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import jwt from 'jsonwebtoken';

config(); // load server/.env

const BASE_URL = 'http://localhost:3001';
const ACME_TENANT_ID = 'faf2e4a7-5d79-4b00-811b-8d0dce4f4d80';
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
if (!JWT_ACCESS_SECRET) { console.error('FATAL: JWT_ACCESS_SECRET not set'); process.exit(1); }

/**
 * --only-transitions: skip Phases 1–3 (data-setup) and run Phases 4–5 only.
 * Requires the server to be running and at least one PAYMENT_PENDING order in
 * the ACME tenant DB. Resolves ORDER_ID and CATALOG_ITEM_ID from DB automatically.
 *
 * Usage:
 *   pnpm -C server exec tsx scripts/validate-rcp1-flow.ts --only-transitions
 */
const ONLY_TRANSITIONS = process.argv.includes('--only-transitions');

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

let PASS = 0; let FAIL = 0;
const pass = (msg: string, data?: unknown) => { PASS++; console.log(`  ✅ PASS — ${msg}`, data !== undefined ? JSON.stringify(data) : ''); };
const fail = (msg: string, data?: unknown) => { FAIL++; console.error(`  ❌ FAIL — ${msg}`, data !== undefined ? JSON.stringify(data) : ''); };
const step = (n: string, label: string) => console.log(`\n─── STEP ${n}: ${label} ───────────────────────────────────────`);
const phase = (n: number, label: string) => console.log(`\n${'═'.repeat(60)}\n PHASE ${n}: ${label}\n${'═'.repeat(60)}`);

async function api<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      'Authorization': `Bearer ${token}`,
      'X-Texqtic-Realm': 'tenant',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  // API wraps responses: { success, data: { ... } } OR { success, error }
  // We unwrap the outer envelope so callers access .data.X directly.
  const envelope = await res.json() as { success?: boolean; data?: T; error?: unknown };
  return { status: res.status, data: (envelope.data ?? envelope) as T };
}

function mintToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, type: 'access' },
    JWT_ACCESS_SECRET!,
    { expiresIn: '30m' },
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const RUN_START = new Date();
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  OPS-REVENUE-FLOW-VALIDATION-002 — RCP-1 Live Evidence Run   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Run at: ${new Date().toISOString()} | Base: ${BASE_URL}`);

  // ── Phase 0: Resolve ACME owner userId from DB ───────────────────────────
  phase(0, 'Resolve ACME tenant owner from DB');
  step('0.1', 'Query memberships for ACME tenant');
  const memberships = await prisma.membership.findMany({
    where: { tenantId: ACME_TENANT_ID, role: { in: ['OWNER', 'ADMIN'] } },
    include: { user: { select: { id: true, email: true } } },
    take: 1,
  });
  if (memberships.length === 0) {
    fail('No OWNER/ADMIN membership found for ACME tenant');
    process.exit(1);
  }
  const member = memberships[0]!;
  const OWNER_USER_ID = member.user.id;
  const OWNER_EMAIL_REDACTED = member.user.email.replace(/(?<=.).(?=.*@)/g, '*');
  pass(`Owner resolved | userId: ${OWNER_USER_ID} | email: ${OWNER_EMAIL_REDACTED}`);
  console.log(`  tenantId: ${ACME_TENANT_ID} | role: ${member.role}`);

  const TOKEN = mintToken(OWNER_USER_ID, ACME_TENANT_ID);
  pass('Tenant JWT minted (JWT_ACCESS_SECRET from env, 30m TTL, token: <REDACTED>)');

  // CATALOG_ITEM_ID / ORDER_ID are set inside Phases 1–2, or resolved from DB
  // when --only-transitions is used (checked after Phase 3 block below).
  let CATALOG_ITEM_ID = '';
  let ORDER_ID = '';

  if (!ONLY_TRANSITIONS) {
  // ── Phase 1: Catalog create ───────────────────────────────────────────────
  phase(1, 'Catalog — create test item');
  step('1.1', 'POST /api/tenant/catalog/items');
  const itemName = `RCP1-Validation-${Date.now()}`;
  const createItem = await api<{ item?: { id: string; name: string } }>(
    'POST', '/api/tenant/catalog/items', TOKEN,
    { name: itemName, price: 49.99, sku: `VSKU-${Date.now()}`, description: 'TECS 4 validation item' },
  );
  console.log(`  → HTTP ${createItem.status} | name=${itemName}`);
  if (createItem.status === 201 && createItem.data.item?.id) {
    pass(`Catalog item created | id: ${createItem.data.item.id}`);
  } else {
    fail(`Catalog create failed`, createItem.data);
    process.exit(1);
  }
  CATALOG_ITEM_ID = createItem.data.item!.id;

  step('1.2', 'GET /api/tenant/catalog/items (verify item is visible)');
  const listItems = await api<{ items?: { id: string }[] }>(
    'GET', '/api/tenant/catalog/items?limit=20', TOKEN,
  );
  console.log(`  → HTTP ${listItems.status} | count=${listItems.data.items?.length ?? 0}`);
  if (listItems.status === 200 && listItems.data.items?.some(i => i.id === CATALOG_ITEM_ID)) {
    pass(`Item visible in catalog list | id: ${CATALOG_ITEM_ID}`);
  } else {
    fail('Catalog item not visible in list', listItems.data);
  }

  // ── Phase 2: Cart → Checkout → PAYMENT_PENDING order ────────────────────
  phase(2, 'Cart → Checkout → PAYMENT_PENDING order');
  step('2.1', 'POST /api/tenant/cart (create/get cart)');
  const cartResp = await api<{ cart?: { id: string } }>('POST', '/api/tenant/cart', TOKEN);
  console.log(`  → HTTP ${cartResp.status}`);
  if (!(cartResp.status === 200 || cartResp.status === 201) || !cartResp.data.cart?.id) {
    fail('Cart create/get failed', cartResp.data); process.exit(1);
  }
  const CART_ID = cartResp.data.cart!.id;
  pass(`Cart ready | id: ${CART_ID}`);

  step('2.2', 'POST /api/tenant/cart/items (add catalog item)');
  const addItem = await api<{ cart?: { id: string } }>(
    'POST', '/api/tenant/cart/items', TOKEN,
    { catalogItemId: CATALOG_ITEM_ID, quantity: 2 },
  );
  console.log(`  → HTTP ${addItem.status}`);
  if (addItem.status === 200 || addItem.status === 201) {
    pass(`Item added to cart | catalogItemId: ${CATALOG_ITEM_ID} | qty: 2`);
  } else {
    fail('Cart add-item failed', addItem.data);
  }

  step('2.3', 'POST /api/tenant/checkout (place order)');
  const checkout = await api<{ orderId?: string; status?: string; totals?: { grandTotal?: number } }>(
    'POST', '/api/tenant/checkout', TOKEN,
  );
  const ckOrderId   = checkout.data.orderId;
  const ckStatus    = checkout.data.status;
  const ckTotal     = checkout.data.totals?.grandTotal;
  console.log(`  → HTTP ${checkout.status} | status=${ckStatus} | grandTotal=${ckTotal}`);
  if (checkout.status === 201 && ckOrderId) {
    pass(`Order created at PAYMENT_PENDING | orderId: ${ckOrderId} | status: ${ckStatus} | grandTotal: $${ckTotal}`);
    if (ckStatus !== 'PAYMENT_PENDING') {
      fail(`Expected PAYMENT_PENDING but got ${ckStatus}`);
    }
  } else {
    fail('Checkout failed', checkout.data); process.exit(1);
  }
  ORDER_ID = ckOrderId!;

  // ── Phase 3: Orders visible in WL_ADMIN + EXPERIENCE (same endpoint) ─────
  phase(3, 'Orders list — WL_ADMIN + EXPERIENCE parity');
  step('3.1', 'GET /api/tenant/orders (both shells use this endpoint)');
  const ordersList = await api<{ orders?: { id: string; status: string }[]; count?: number }>(
    'GET', '/api/tenant/orders', TOKEN,
  );
  console.log(`  → HTTP ${ordersList.status} | count=${ordersList.data.count}`);
  const foundOrder = ordersList.data.orders?.find(o => o.id === ORDER_ID);
  if (ordersList.status === 200 && foundOrder) {
    pass(`Order visible in orders list | orderId: ${ORDER_ID} | status: ${foundOrder.status}`);
  } else {
    fail('Order not found in orders list', { orderId: ORDER_ID, firstFew: ordersList.data.orders?.slice(0, 2) });
  }

  step('3.2', 'Prisma: order_lifecycle_logs — verify PAYMENT_PENDING lifecycle entry for checkout');
  // GAP-ORDER-LC-001 B4: checkout now writes to order_lifecycle_logs (not audit_logs).
  // Verify via direct Prisma query (DB-layer proof — no HTTP round-trip needed).
  const ppLifecycleLog = await prisma.order_lifecycle_logs.findFirst({
    where: { order_id: ORDER_ID, to_state: 'PAYMENT_PENDING' },
  });
  if (ppLifecycleLog) {
    pass(`lifecycle log: PAYMENT_PENDING found | order_id: ${ORDER_ID} | log.id: ${ppLifecycleLog.id} | from: ${ppLifecycleLog.from_state ?? 'null'} → PAYMENT_PENDING`);
  } else {
    fail(`lifecycle log: PAYMENT_PENDING NOT found in order_lifecycle_logs for order_id: ${ORDER_ID}`);
  }

  } // end if (!ONLY_TRANSITIONS)
  else {
  // --only-transitions: Phases 1–3 skipped. Resolve ORDER_ID + CATALOG_ITEM_ID from DB.
  console.log('\n─── ONLY-TRANSITIONS MODE: resolving test data from DB ──────────────────────');
  const existingOrder = await prisma.order.findFirst({
    where: { tenantId: ACME_TENANT_ID, status: 'PAYMENT_PENDING' },
    orderBy: { createdAt: 'desc' },
  });
  if (!existingOrder) {
    fail('No PAYMENT_PENDING order found for ACME tenant — run without --only-transitions first to create one');
    await prisma.$disconnect(); process.exit(1);
  }
  ORDER_ID = existingOrder.id;
  pass(`Resolved ORDER_ID (PAYMENT_PENDING) | id: ${ORDER_ID}`);

  const existingItem = await prisma.catalogItem.findFirst({ where: { tenantId: ACME_TENANT_ID } });
  if (!existingItem) {
    fail('No catalog item found for ACME tenant — run without --only-transitions first to create one');
    await prisma.$disconnect(); process.exit(1);
  }
  CATALOG_ITEM_ID = existingItem.id;
  pass(`Resolved CATALOG_ITEM_ID | id: ${CATALOG_ITEM_ID}`);
  } // end else (ONLY_TRANSITIONS)

  // ── Phase 4: Status transitions + audit verification ─────────────────────
  phase(4, 'Status transitions (TECS 1 endpoint) + audit verification');

  // ── 4A: CONFIRM (PAYMENT_PENDING → CONFIRMED) ─────────────────────
  step('4A.1', `PATCH /api/tenant/orders/${ORDER_ID}/status { status: CONFIRMED }`);
  const confirmResp = await api<{ order?: { status: string } }>(
    'PATCH', `/api/tenant/orders/${ORDER_ID}/status`, TOKEN,
    { status: 'CONFIRMED' },
  );
  console.log(`  → HTTP ${confirmResp.status} | DB status=${confirmResp.data.order?.status}`);
  if (confirmResp.status === 200) {
    pass(`CONFIRM transition accepted | DB status: ${confirmResp.data.order?.status}`);
    console.log('  NOTE: DB status maps CONFIRMED→PLACED (schema enum limitation; lifecycle log holds canonical CONFIRMED state)');
    if (confirmResp.data.order?.status !== 'PLACED') {
      fail(`Expected DB status PLACED (CONFIRMED alias) but got: ${confirmResp.data.order?.status}`);
    }
  } else {
    fail(`CONFIRM transition failed | HTTP ${confirmResp.status}`, confirmResp.data);
  }

  step('4A.2', 'Prisma: order_lifecycle_logs — verify CONFIRMED lifecycle entry');
  // GAP-ORDER-LC-001 B4: SM transition writes to order_lifecycle_logs (not audit_logs).
  const confirmLog = await prisma.order_lifecycle_logs.findFirst({
    where: { order_id: ORDER_ID, to_state: 'CONFIRMED' },
  });
  if (confirmLog) {
    pass(`lifecycle log: CONFIRMED ✓ | order_id: ${ORDER_ID} | from: ${confirmLog.from_state} → CONFIRMED | log.id: ${confirmLog.id}`);
  } else {
    fail(`lifecycle log: CONFIRMED NOT found in order_lifecycle_logs for order_id: ${ORDER_ID}`);
  }

  // ── 4B: FULFILL (CONFIRMED/PLACED → FULFILLED) ────────────────────
  step('4B.1', `PATCH /api/tenant/orders/${ORDER_ID}/status { status: FULFILLED }`);
  const fulfillResp = await api<{ order?: { status: string } }>(
    'PATCH', `/api/tenant/orders/${ORDER_ID}/status`, TOKEN,
    { status: 'FULFILLED' },
  );
  console.log(`  → HTTP ${fulfillResp.status} | DB status=${fulfillResp.data.order?.status}`);
  if (fulfillResp.status === 200) {
    pass(`FULFILL transition accepted | DB status: ${fulfillResp.data.order?.status}`);
    console.log('  NOTE: DB status remains PLACED after FULFILLED (enum limitation; order_lifecycle_logs.to_state is canonical source)');
  } else {
    fail(`FULFILL transition failed | HTTP ${fulfillResp.status}`, fulfillResp.data);
  }

  step('4B.2', 'Prisma: order_lifecycle_logs — verify FULFILLED lifecycle entry');
  const fulfillLog = await prisma.order_lifecycle_logs.findFirst({
    where: { order_id: ORDER_ID, to_state: 'FULFILLED' },
  });
  if (fulfillLog) {
    pass(`lifecycle log: FULFILLED ✓ | order_id: ${ORDER_ID} | from: ${fulfillLog.from_state} → FULFILLED | log.id: ${fulfillLog.id} | DB status stays PLACED`);
  } else {
    fail(`lifecycle log: FULFILLED NOT found in order_lifecycle_logs for order_id: ${ORDER_ID}`);
  }

  // G-027: morgue_entries verification — FULFILLED terminal state
  step('4B.G1', 'G-027: morgue_entries — verify FULFILLED morgue entry written atomically');
  const fulfillMorgue = await prisma.morgue_entries.findFirst({
    where: { entity_type: 'ORDER', entity_id: ORDER_ID, final_state: 'FULFILLED' },
  });
  if (fulfillMorgue) {
    pass(`morgue entry: FULFILLED ✓ | entity_id: ${ORDER_ID} | final_state: FULFILLED | morgue.id: ${fulfillMorgue.id}`);
  } else {
    fail(`morgue entry: FULFILLED NOT found in morgue_entries for entity_id: ${ORDER_ID}`);
  }

  // ── 4C: CANCEL validation on a SECOND fresh order ────────────────────────
  phase(4, '(cont.) CANCEL path — fresh order at PAYMENT_PENDING');
  step('4C.0', 'Create a second order for CANCEL validation');
  // Cart is consumed by checkout; create fresh cart
  const cart2 = await api<{ cart?: { id: string } }>('POST', '/api/tenant/cart', TOKEN);
  const CART2_ID = cart2.data.cart?.id;
  pass(`Cart2 created | id: ${CART2_ID}`);

  const addItem2 = await api<{ cart?: { id: string } }>('POST', '/api/tenant/cart/items', TOKEN,
    { catalogItemId: CATALOG_ITEM_ID, quantity: 1 });
  pass(`Item added to cart2 | HTTP ${addItem2.status}`);

  const checkout2 = await api<{ orderId?: string; status?: string }>(
    'POST', '/api/tenant/checkout', TOKEN,
  );
  if (checkout2.status !== 201 || !checkout2.data.orderId) {
    fail('Second checkout failed', checkout2.data); process.exit(1);
  }
  const ORDER2_ID = checkout2.data.orderId!;
  pass(`Order2 created | id: ${ORDER2_ID} | status: ${checkout2.data.status}`);

  step('4C.1', `PATCH /api/tenant/orders/${ORDER2_ID}/status { status: CANCELLED }`);
  const cancelResp = await api<{ order?: { status: string } }>(
    'PATCH', `/api/tenant/orders/${ORDER2_ID}/status`, TOKEN,
    { status: 'CANCELLED' },
  );
  console.log(`  → HTTP ${cancelResp.status} | DB status=${cancelResp.data.order?.status}`);
  if (cancelResp.status === 200 && cancelResp.data.order?.status === 'CANCELLED') {
    pass(`CANCEL transition accepted | DB status: CANCELLED ✓ (maps 1:1 — no schema workaround needed)`);
  } else {
    fail(`CANCEL transition failed | HTTP ${cancelResp.status}`, cancelResp.data);
  }

  step('4C.2', 'Prisma: order_lifecycle_logs — verify CANCELLED lifecycle entry');
  const cancelLog = await prisma.order_lifecycle_logs.findFirst({
    where: { order_id: ORDER2_ID, to_state: 'CANCELLED' },
  });
  if (cancelLog) {
    pass(`lifecycle log: CANCELLED ✓ | order_id: ${ORDER2_ID} | from: ${cancelLog.from_state} → CANCELLED | log.id: ${cancelLog.id}`);
  } else {
    fail(`lifecycle log: CANCELLED NOT found in order_lifecycle_logs for order_id: ${ORDER2_ID}`);
  }

  // G-027: morgue_entries verification — CANCELLED terminal state
  step('4C.G1', 'G-027: morgue_entries — verify CANCELLED morgue entry written atomically');
  const cancelMorgue = await prisma.morgue_entries.findFirst({
    where: { entity_type: 'ORDER', entity_id: ORDER2_ID, final_state: 'CANCELLED' },
  });
  if (cancelMorgue) {
    pass(`morgue entry: CANCELLED ✓ | entity_id: ${ORDER2_ID} | final_state: CANCELLED | morgue.id: ${cancelMorgue.id}`);
  } else {
    fail(`morgue entry: CANCELLED NOT found in morgue_entries for entity_id: ${ORDER2_ID}`);
  }

  step('4C.3', 'Verify CANCEL is terminal — attempt second transition should fail');
  const cancelAgain = await api<{ error?: { code?: string } }>(
    'PATCH', `/api/tenant/orders/${ORDER2_ID}/status`, TOKEN,
    { status: 'CONFIRMED' },
  );
  console.log(`  → HTTP ${cancelAgain.status} | code=${cancelAgain.data.error?.code}`);
  if (cancelAgain.status === 409) {
    pass(`Terminal state enforced | HTTP 409 | code: ${cancelAgain.data.error?.code}`);
  } else {
    fail(`Expected 409 CANCELLED terminal; got HTTP ${cancelAgain.status}`, cancelAgain.data);
  }

  // ── Phase 5: Canonical lifecycle log seam verification ───────────────────
  // GAP-ORDER-LC-001 B4/B5: order_lifecycle_logs is now the canonical semantic source.
  // Audit-log derivation removed — lifecycle state verified via direct Prisma query.
  //
  // STOP CONDITION NOTE (B5 / GOVERNANCE-SYNC-060):
  //   WLOrdersPanel + EXPOrdersPanel still derive status from audit_logs (GET /api/tenant/audit-logs).
  //   B4 removed order.lifecycle.* audit writes — those entries no longer exist for new orders.
  //   UI display of CONFIRMED/FULFILLED is now BROKEN for new orders (regresses to 'Placed').
  //   Required fix: GET /api/tenant/orders must include `lifecycleState: string | null` per order
  //   (query order_lifecycle_logs ORDER BY created_at DESC LIMIT 1 per order_id).
  //   server/src/routes/tenant.ts is NOT in B5 allowlist — backend fix deferred to TECS B6.
  phase(5, 'Canonical lifecycle log seam (order_lifecycle_logs) — state chain verification');

  step('5.1', 'Fetch order list + Prisma lifecycle logs to verify state chain for ORDER_ID');
  const finalOrders = await api<{ orders?: { id: string; status: string }[] }>(
    'GET', '/api/tenant/orders', TOKEN,
  );

  const o1 = finalOrders.data.orders?.find(o => o.id === ORDER_ID);
  const o2 = finalOrders.data.orders?.find(o => o.id === ORDER2_ID);

  // Canonical state: latest order_lifecycle_logs.to_state (written by SM in B4).
  const o1LifecycleLogs = await prisma.order_lifecycle_logs.findMany({
    where: { order_id: ORDER_ID },
    orderBy: { created_at: 'asc' },
  });
  const o2LifecycleLogs = await prisma.order_lifecycle_logs.findMany({
    where: { order_id: ORDER2_ID },
    orderBy: { created_at: 'asc' },
  });

  const o1CanonicalState = o1LifecycleLogs.at(-1)?.to_state ?? 'NO_LOG';
  const o1StateChain = o1LifecycleLogs.map(l => `${l.from_state ?? 'null'}→${l.to_state}`).join(' | ');
  console.log(`\n  Order1 (CONFIRM→FULFILL path):`);
  console.log(`    DB status         : ${o1?.status}`);
  console.log(`    Lifecycle chain   : ${o1StateChain || '(no log entries)'}`);
  console.log(`    Canonical state   : ${o1CanonicalState}`);
  if (o1CanonicalState === 'FULFILLED') {
    pass(`Order1 canonical state = FULFILLED ✓ (DB=PLACED — lifecycle log is semantic truth)`);
  } else {
    fail(`Order1 canonical state should be FULFILLED, got ${o1CanonicalState}`);
  }

  const o2CanonicalState = o2LifecycleLogs.at(-1)?.to_state ?? 'NO_LOG';
  const o2StateChain = o2LifecycleLogs.map(l => `${l.from_state ?? 'null'}→${l.to_state}`).join(' | ');
  console.log(`\n  Order2 (CANCEL path):`);
  console.log(`    DB status         : ${o2?.status}`);
  console.log(`    Lifecycle chain   : ${o2StateChain || '(no log entries)'}`);
  console.log(`    Canonical state   : ${o2CanonicalState}`);
  if (o2CanonicalState === 'CANCELLED') {
    pass(`Order2 canonical state = CANCELLED ✓ (DB=CANCELLED — direct mapping ✓)`);
  } else {
    fail(`Order2 canonical state should be CANCELLED, got ${o2CanonicalState}`);
  }

  step('5.2', 'Verify full state chain integrity for ORDER_ID (PAYMENT_PENDING → CONFIRMED → FULFILLED)');
  // In --only-transitions mode the reused order may have accumulated lifecycle logs from prior
  // test runs. Scope to only entries created in THIS run (created_at >= RUN_START) so the chain
  // reflects the transitions executed in this script session only.
  const thisRunLogs = await prisma.order_lifecycle_logs.findMany({
    where: { order_id: ORDER_ID, created_at: { gte: RUN_START } },
    orderBy: { created_at: 'asc' },
  });
  // Build full state sequence: [from_state of first log, ...all to_state values].
  // expectedChain = ['PAYMENT_PENDING', 'CONFIRMED', 'FULFILLED'] (3 states visited)
  const expectedChain = ['PAYMENT_PENDING', 'CONFIRMED', 'FULFILLED'];
  const actualChain = thisRunLogs.length > 0
    ? [thisRunLogs[0].from_state, ...thisRunLogs.map(l => l.to_state)]
    : [];
  console.log(`    Expected chain  : ${expectedChain.join(' → ')}`);
  console.log(`    Actual chain    : ${actualChain.join(' → ')} (${thisRunLogs.length} log(s) from this run)`);
  if (JSON.stringify(actualChain) === JSON.stringify(expectedChain)) {
    pass(`Full lifecycle chain verified ✓ | PAYMENT_PENDING → CONFIRMED → FULFILLED`);
  } else {
    fail(`Lifecycle chain mismatch | expected ${expectedChain.join('→')} | got ${actualChain.join('→')}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  VALIDATION SUMMARY                                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  PASS: ${String(PASS).padEnd(53)}║`);
  console.log(`║  FAIL: ${String(FAIL).padEnd(53)}║`);
  console.log(`║  orderId (CONFIRM+FULFILL): ${ORDER_ID.slice(0, 36)}║`);
  console.log(`║  orderId (CANCEL):          ${ORDER2_ID.slice(0, 36)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nOUTCOME: ${FAIL === 0 ? '✅ ALL PASS — GAP-REVENUE-VALIDATE-002 → VALIDATED' : `❌ ${FAIL} FAIL(s) — see above`}`);

  await prisma.$disconnect();
}

main().catch(err => { console.error('FATAL:', err); prisma.$disconnect(); process.exit(1); });
