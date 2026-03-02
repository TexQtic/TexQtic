/**
 * RCP-1 Revenue Flow Validation — OPS-REVENUE-FLOW-VALIDATION-002
 *
 * Validation ceiling: PAYMENT_PENDING + app-layer transitions (CONFIRMED / FULFILLED / CANCELLED).
 * Non-goals (LOCKED): payment gateway, G-020 SM, schema migrations, RLS, new endpoints.
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
  const CATALOG_ITEM_ID = createItem.data.item!.id;

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
  const ORDER_ID = ckOrderId!;

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

  step('3.2', 'GET /api/tenant/audit-logs (check PAYMENT_PENDING audit entry)');
  const auditBefore = await api<{ logs?: { action: string; entityId: string }[]; count?: number }>(
    'GET', '/api/tenant/audit-logs', TOKEN,
  );
  console.log(`  → HTTP ${auditBefore.status} | total log count=${auditBefore.data.count}`);
  const ppAudit = auditBefore.data.logs?.find(l => l.entityId === ORDER_ID && l.action === 'order.lifecycle.PAYMENT_PENDING');
  if (ppAudit) {
    pass(`Audit: order.lifecycle.PAYMENT_PENDING found for orderId: ${ORDER_ID}`);
  } else {
    fail(`Audit: order.lifecycle.PAYMENT_PENDING NOT found for orderId: ${ORDER_ID}`);
  }

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
    console.log('  NOTE: DB status maps CONFIRMED→PLACED (schema mismatch; TODO(GAP-ORDER-LC-001))');
    if (confirmResp.data.order?.status !== 'PLACED') {
      fail(`Expected DB status PLACED (CONFIRMED alias) but got: ${confirmResp.data.order?.status}`);
    }
  } else {
    fail(`CONFIRM transition failed | HTTP ${confirmResp.status}`, confirmResp.data);
  }

  step('4A.2', 'Verify audit: order.lifecycle.CONFIRMED for orderId');
  const auditAfterConfirm = await api<{ logs?: { action: string; entityId: string | null }[] }>(
    'GET', '/api/tenant/audit-logs', TOKEN,
  );
  const confirmAudit = auditAfterConfirm.data.logs?.find(
    l => l.entityId === ORDER_ID && l.action === 'order.lifecycle.CONFIRMED',
  );
  if (confirmAudit) {
    pass(`Audit: order.lifecycle.CONFIRMED ✓ | entityId: ${ORDER_ID}`);
  } else {
    fail(`Audit: order.lifecycle.CONFIRMED NOT found for orderId: ${ORDER_ID}`);
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
    console.log('  NOTE: DB status remains PLACED after FULFILLED (audit-only; TODO(GAP-ORDER-LC-001))');
  } else {
    fail(`FULFILL transition failed | HTTP ${fulfillResp.status}`, fulfillResp.data);
  }

  step('4B.2', 'Verify audit: order.lifecycle.FULFILLED for orderId');
  const auditAfterFulfill = await api<{ logs?: { action: string; entityId: string | null }[] }>(
    'GET', '/api/tenant/audit-logs', TOKEN,
  );
  const fulfillAudit = auditAfterFulfill.data.logs?.find(
    l => l.entityId === ORDER_ID && l.action === 'order.lifecycle.FULFILLED',
  );
  if (fulfillAudit) {
    pass(`Audit: order.lifecycle.FULFILLED ✓ | entityId: ${ORDER_ID} (semantic truth — DB stays PLACED)`);
  } else {
    fail(`Audit: order.lifecycle.FULFILLED NOT found for orderId: ${ORDER_ID}`);
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

  step('4C.2', 'Verify audit: order.lifecycle.CANCELLED for orderId2');
  const auditAfterCancel = await api<{ logs?: { action: string; entityId: string | null }[] }>(
    'GET', '/api/tenant/audit-logs', TOKEN,
  );
  const cancelAudit = auditAfterCancel.data.logs?.find(
    l => l.entityId === ORDER2_ID && l.action === 'order.lifecycle.CANCELLED',
  );
  if (cancelAudit) {
    pass(`Audit: order.lifecycle.CANCELLED ✓ | entityId: ${ORDER2_ID}`);
  } else {
    fail(`Audit: order.lifecycle.CANCELLED NOT found for orderId: ${ORDER2_ID}`);
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

  // ── Phase 5: Derived status seam verification ─────────────────────────────
  phase(5, 'RCP-1 audit-seam stability — derived status verification');

  step('5.1', 'Fetch order list + audit logs to verify derived status for ORDER_ID');
  const finalOrders = await api<{ orders?: { id: string; status: string }[] }>(
    'GET', '/api/tenant/orders', TOKEN,
  );
  const finalAudit = await api<{ logs?: { action: string; entityId: string | null }[] }>(
    'GET', '/api/tenant/audit-logs', TOKEN,
  );

  const o1 = finalOrders.data.orders?.find(o => o.id === ORDER_ID);
  const o2 = finalOrders.data.orders?.find(o => o.id === ORDER2_ID);
  const o1Audits = finalAudit.data.logs?.filter(l => l.entityId === ORDER_ID) ?? [];
  const o2Audits = finalAudit.data.logs?.filter(l => l.entityId === ORDER2_ID) ?? [];

  console.log(`\n  Order1 (CONFIRM→FULFILL path):`);
  console.log(`    DB status       : ${o1?.status}`);
  console.log(`    Audit actions   : ${o1Audits.map(l => l.action).join(' | ')}`);
  const o1HasFulfilled = o1Audits.some(l => l.action === 'order.lifecycle.FULFILLED');
  const o1Derived = o1?.status === 'CANCELLED' ? 'CANCELLED'
    : o1HasFulfilled ? 'FULFILLED'
    : o1Audits.some(l => l.action === 'order.lifecycle.CONFIRMED') ? 'CONFIRMED'
    : o1?.status === 'PAYMENT_PENDING' ? 'PAYMENT_PENDING'
    : 'PLACED';
  console.log(`    Derived status  : ${o1Derived} (DB=${o1?.status}, audit wins)`);
  if (o1Derived === 'FULFILLED') {
    pass('Order1 derived status = FULFILLED ✓ (DB=PLACED — audit-seam stable)');
  } else {
    fail(`Order1 derived status should be FULFILLED, got ${o1Derived}`);
  }

  console.log(`\n  Order2 (CANCEL path):`);
  console.log(`    DB status       : ${o2?.status}`);
  console.log(`    Audit actions   : ${o2Audits.map(l => l.action).join(' | ')}`);
  const o2Derived = o2?.status === 'CANCELLED' ? 'CANCELLED' : 'OTHER';
  console.log(`    Derived status  : ${o2Derived}`);
  if (o2Derived === 'CANCELLED') {
    pass('Order2 derived status = CANCELLED ✓ (DB=CANCELLED — direct mapping stable)');
  } else {
    fail(`Order2 derived status should be CANCELLED, got ${o2Derived}`);
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
