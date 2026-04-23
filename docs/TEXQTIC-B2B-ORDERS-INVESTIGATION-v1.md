# TEXQTIC-B2B-ORDERS-INVESTIGATION-v1

**Sub-family:** B2B Orders  
**Investigation type:** Read-only repo-truth audit  
**Mode:** Investigation only — no implementation, no schema changes, no migrations  
**Date:** 2026-07  
**Authored by:** GitHub Copilot governance investigation pass  

---

## 1. Purpose

This document provides a complete, evidence-based audit of the Orders sub-family within the TexQtic B2B workspace. It establishes verified repo-truth for what is implemented, what is operationally blocked, what is absent, and what the correct first bounded implementation unit should be to advance Orders toward launch readiness.

This investigation is part of a sequential four-part B2B investigation series:
1. B2B Supplier RFQ Inbox — closed (`docs/TEXQTIC-B2B-SUPPLIER-RFQ-INBOX-INVESTIGATION-v1.md`)
2. B2B View My RFQs — closed (`docs/TEXQTIC-B2B-VIEW-MY-RFQS-INVESTIGATION-v1.md`)
3. B2B Catalog — closed (`docs/TEXQTIC-B2B-CATALOG-INVESTIGATION-v1.md`)
4. **B2B Orders — this document**

---

## 2. Scope

| Layer | In scope |
|---|---|
| Schema models | `Order`, `OrderItem`, `order_lifecycle_logs`, `OrderStatus` enum, `Cart` (checkout dependency) |
| Backend routes | `POST /api/tenant/checkout`, `GET /api/tenant/orders`, `GET /api/tenant/orders/:id`, `PATCH /api/tenant/orders/:id/status` |
| Frontend (EXP shell) | `components/Tenant/EXPOrdersPanel.tsx` |
| Frontend (WL_ADMIN shell) | `components/WhiteLabelAdmin/WLOrdersPanel.tsx` |
| App wiring | `App.tsx` — orders render path, `ORDER_CONFIRMED` appState, checkout confirmation screen |
| Runtime manifest | `runtime/sessionRuntimeDescriptor.ts` — `orders_operations` route group |
| SM service types | `server/src/services/stateMachine.types.ts` — `EntityType.ORDER` |
| API contract | `shared/contracts/openapi.tenant.json` — all orders and checkout entries |
| Tests | `tests/` and `server/tests/` — orders-related test coverage |
| Governance archive | `governance/archive/` — gap register history for GAP-ORDER-LC-001 and GAP-RLS-ORDERS-UPDATE-001 |
| Operational validation | `docs/rcp1/OPS-REVENUE-FLOW-VALIDATION-002.md` — end-to-end revenue flow evidence |

Out of scope (investigation only): RLS policy changes, schema migrations, new routes, frontend enhancements, payment gateway integration.

---

## 3. Source Artifacts / Repo Areas Reviewed

| Source | Key sections |
|---|---|
| `server/prisma/schema.prisma` | Lines 358–415 (Cart, CartItem), 414–455 (OrderItem, Order), 1139–1160 (order_lifecycle_logs), 1300–1308 (OrderStatus enum) |
| `server/src/routes/tenant.ts` | Lines 2490–2870 (checkout, GET list, GET detail, PATCH status routes + `serializeTenantOrder()`) |
| `components/Tenant/EXPOrdersPanel.tsx` | Full file (1–350) |
| `components/WhiteLabelAdmin/WLOrdersPanel.tsx` | Full file (1–350) |
| `App.tsx` | Lines 21 (import), 851–856 (WL_ADMIN_VIEWS), 1846–1847 (confirmedOrderId state), 3722 (WL_ADMIN case 'orders'), 4213–4214 (EXP case 'orders'), 5482–5535 (Cart checkout callback, ORDER_CONFIRMED render) |
| `runtime/sessionRuntimeDescriptor.ts` | Lines 336–375 (WORKSPACE_ORDERS_ROUTE_GROUP, WL_ADMIN_ORDERS_ROUTE_GROUP), 487 (b2b_workspace allowedRouteGroups), 380–436 (shell route key arrays) |
| `server/src/services/stateMachine.types.ts` | Lines 1–120 (EntityType union, TransitionRequest, result types) |
| `shared/contracts/openapi.tenant.json` | Lines 2665–2870 (checkout, GET /orders, GET /orders/{id}, PATCH /orders/{id}/status) |
| `services/cartService.ts` | Lines 100–200 (checkout function, CheckoutResult interface) |
| `docs/rcp1/OPS-REVENUE-FLOW-VALIDATION-002.md` | Full file — phase results, GAP-RLS-ORDERS-UPDATE-001, schema mismatch mapping |
| `governance/archive/ARCHIVED-gap-register-2026-03.md` | GAP-ORDER-LC-001 full lifecycle (GOVERNANCE-SYNC-057 through -063) |
| `governance/archive/ARCHIVED-tracker-2026-Q2.md` | Lines 145, 211, 281, 310, 316 (GAP-ORDER-LC-001 closure record) |
| `tests/routing-001.test.ts` | checkout export assertion |
| `tests/session-runtime-descriptor.test.ts` | orders_operations route group tests |
| `tests/runtime-verification-tenant-enterprise.test.ts` | orders route key in navigation surface assertions |

---

## 4. Intended Product Role of Orders

Orders is the post-checkout state management surface for B2B tenant workspaces. Its intended product roles are:

**Buyer-side (Tenant MEMBER/VIEWER):**
- View all orders they personally placed (filtered by userId in backend)
- Track order status from PAYMENT_PENDING through CONFIRMED and FULFILLED
- Access order history as a running record of commerce activity

**Operator-side (Tenant OWNER/ADMIN):**
- View all tenant orders (cross-user, within `org_id`)
- Transition order status: PAYMENT_PENDING → CONFIRMED, CONFIRMED → FULFILLED, CONFIRMED → CANCELLED, PAYMENT_PENDING → CANCELLED
- Manage fulfilment lifecycle with an auditable state machine trail

**WL_ADMIN operator:**
- Same lifecycle management via `WLOrdersPanel` with enhanced filter, search, and pagination
- Constrained to their tenant's orders only (RLS-enforced)

Orders is **not** a settlement surface, **not** a payment gateway surface, and **not** a cross-tenant supplier-facing surface. Supplier visibility into buyer orders is explicitly absent by design (no cross-tenant `supplierId` FK in the Order model).

---

## 5. Confirmed Repo-Truth Implementation Status

| Component | Status | Notes |
|---|---|---|
| `Order` schema model | ✅ EXISTS | All core fields present |
| `OrderItem` schema model | ✅ EXISTS | 9 fields; catalogItemId optional |
| `order_lifecycle_logs` model | ✅ EXISTS | Full SM log table with indexes |
| `OrderStatus` enum (5 states) | ✅ EXISTS | PAYMENT_PENDING, PLACED, CANCELLED, CONFIRMED, FULFILLED |
| Cart model (checkout dependency) | ✅ EXISTS | ACTIVE/CHECKED_OUT status; relation to Order[] |
| SM EntityType `ORDER` | ✅ EXISTS | In `stateMachine.types.ts` EntityType union |
| SM ORDER allowed_transitions (4 rows) | ✅ SEEDED | PAYMENT_PENDING→CONFIRMED/CANCELLED, CONFIRMED→FULFILLED/CANCELLED |
| `POST /api/tenant/checkout` route | ✅ OPERATIONAL | End-to-end validated in OPS-REVENUE-FLOW-VALIDATION-002 |
| `GET /api/tenant/orders` route | ✅ OPERATIONAL | End-to-end validated; includes lifecycle logs |
| `GET /api/tenant/orders/:id` route | ✅ OPERATIONAL | Role-scoped read |
| `PATCH /api/tenant/orders/:id/status` route | ⚠️ CODE CORRECT — DB BLOCKED | SM logic, transition guards, and audit write are correct; fails at DB layer due to GAP-RLS-ORDERS-UPDATE-001 |
| `EXPOrdersPanel.tsx` | ✅ OPERATIONAL | Full orders UI surface for EXPERIENCE shell |
| `WLOrdersPanel.tsx` | ✅ OPERATIONAL | Full orders UI surface for WL_ADMIN shell |
| `ORDER_CONFIRMED` app state | ✅ EXISTS | Post-checkout confirmation screen with "View My Orders" CTA |
| `orders_operations` route group | ✅ REGISTERED | In B2B workspace, Aggregator, B2C, WL_ADMIN manifests |
| `GAP-ORDER-LC-001` | ✅ CLOSED | Canonical lifecycle state from `order.lifecycleState` via `order_lifecycle_logs`; archived GOVERNANCE-SYNC-063 |
| `GAP-RLS-ORDERS-UPDATE-001` | ❌ OPEN | `orders_update_unified` RLS policy has no tenant arm; UPDATE blocked in production for all tenant actors |

---

## 6. Frontend Status

### EXPOrdersPanel.tsx (EXPERIENCE shell)

**File:** `components/Tenant/EXPOrdersPanel.tsx`  
**Shell constraint:** EXPERIENCE only; must not be imported by WL_ADMIN.  
**Wired in App.tsx:** `case 'orders': return <EXPOrdersPanel onBack={...} />` at line 4213.

| Feature | Status |
|---|---|
| Order list fetch (`GET /api/tenant/orders`) | ✅ IMPLEMENTED |
| Current user fetch (`getCurrentUser()`) for role gate | ✅ IMPLEMENTED (safe-fail) |
| `canonicalStatus(order)` via `order.lifecycleState` | ✅ IMPLEMENTED (GAP-ORDER-LC-001 pattern) |
| Status badge display | ✅ IMPLEMENTED |
| Action buttons (CONFIRMED, FULFILLED, CANCELLED) | ✅ IMPLEMENTED |
| Role gate: OWNER/ADMIN only see action buttons | ✅ IMPLEMENTED |
| Confirm dialog before state transition | ✅ IMPLEMENTED |
| `PATCH /api/tenant/orders/:id/status` call | ✅ IMPLEMENTED — blocked at DB layer |
| `LifecycleHistory` sub-component (newest 5 logs) | ✅ IMPLEMENTED |
| Empty state | ✅ IMPLEMENTED |
| No filter / no search / no pagination | ⚠️ ABSENT (backend `take: 20` hardcoded) |
| Dedicated `orderService.ts` | ❌ ABSENT — API calls made directly via `tenantGet`/`tenantPatch` |

### WLOrdersPanel.tsx (WL_ADMIN shell)

**File:** `components/WhiteLabelAdmin/WLOrdersPanel.tsx`  
**Shell constraint:** WL_ADMIN only; must not be imported by EXPERIENCE.  
**Wired in App.tsx:** `case 'orders': return <WLOrdersPanel />` at line 3722.

| Feature | Status |
|---|---|
| Same core features as EXPOrdersPanel | ✅ ALL PRESENT |
| No `getCurrentUser()` call | ✅ CORRECT (WL_ADMIN shell guarantees OWNER/ADMIN) |
| Client-side status filter (ALL / 5 states) | ✅ IMPLEMENTED |
| Client-side search by order ID | ✅ IMPLEMENTED |
| Client-side pagination (PAGE_SIZE = 25) | ✅ IMPLEMENTED |
| Same DB-layer PATCH blocker applies | ❌ BLOCKED (same GAP-RLS-ORDERS-UPDATE-001 root cause) |

### App.tsx — ORDER_CONFIRMED appState

Post-checkout confirmation screen (`appState === 'ORDER_CONFIRMED'`):
- Displays truncated orderId (`confirmedOrderId.slice(0, 8)…`)
- "View My Orders" button: `navigateTenantManifestRoute('orders')` → clears `confirmedOrderId`
- "Continue Shopping" button: `navigateTenantDefaultManifestRoute()` → clears `confirmedOrderId`
- `confirmedOrderId` state set by `Cart`'s `onCheckoutSuccess` callback (`setConfirmedOrderId(result.orderId)`)

This is a fully functional post-checkout confirmation flow for all tenant workspace types.

---

## 7. Backend Status

### `POST /api/tenant/checkout` (line ~2502)

- Role gate: None (any authenticated tenant member)
- Loads active cart → validates non-empty → calls `computeTotals()` → creates `Order` + `OrderItem[]` + marks cart `CHECKED_OUT` in a single transaction → writes `audit_log (order.lifecycle.CHECKOUT_COMPLETED)` → writes initial `order_lifecycle_logs` row (`from_state: null, to_state: 'PAYMENT_PENDING'`)
- Returns 201: `{ orderId, status, currency, itemCount, totals: { subtotal, discountTotal, taxableAmount, taxTotal, feeTotal, grandTotal, breakdown } }`
- Error cases: `CART_NOT_FOUND` (404), `CART_EMPTY` (400), `INVALID_LINE_ITEM` (400)
- **DB status: ✅ OPERATIONAL** — end-to-end validated in OPS-REVENUE-FLOW-VALIDATION-002.md Phase 2–3

### `GET /api/tenant/orders` (line ~2665)

- Role behavior: OWNER/ADMIN sees all tenant orders; MEMBER/VIEWER sees only their own (userId filter)
- Pagination: `take: 20` hardcoded — does NOT honour `limit` or `cursor` query params despite OpenAPI contract documenting them
- Includes: full `items[]`, newest 5 `order_lifecycle_logs` (from_state, to_state, realm, created_at)
- Serialized via `serializeTenantOrder()`: adds `grandTotal`, `lifecycleState` (latest log's `to_state`), `lifecycleLogs`
- **DB status: ✅ OPERATIONAL** — SELECT passes via `orders_select_unified` tenant arm

### `GET /api/tenant/orders/:id` (line ~2703)

- Role-scoped: OWNER/ADMIN reads any order; MEMBER/VIEWER reads only own orders (userId check post-fetch)
- Returns `{ order }` or 404
- **DB status: ✅ OPERATIONAL** — SELECT passes via `orders_select_unified` tenant arm

### `PATCH /api/tenant/orders/:id/status` (line ~2744)

- Role guard: OWNER/ADMIN only (403 for MEMBER/VIEWER)
- Body: `status` (CONFIRMED | FULFILLED | CANCELLED), `reason` (optional, 1–2000 chars)
- SM-driven: `StateMachineService.transition()` with `entityType: 'ORDER'`
- Derives canonical from-state from latest `order_lifecycle_logs` row
- DB update: CONFIRMED→PLACED, FULFILLED→PLACED, CANCELLED→CANCELLED on `orders.status`; `order_lifecycle_logs` written atomically by SM service
- Returns `{ order }` or 409 (invalid transition) or 403 or 500
- **DB status: ❌ BLOCKED** — `orders_update_unified` RLS policy has no tenant arm:
  ```
  USING: (current_setting('app.is_admin'::text, true) = 'true'::text)
  ```
  `withDbContext` does not set `app.is_admin` for tenant actors (by design, D-5/B1). All UPDATE attempts fail with Prisma `P2025` ("Record to update not found"). The SELECT policy (`orders_select_unified`) has a correct tenant arm and is unaffected.

---

## 8. Schema / Data-Model Status

### Present fields — `Order` model

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `tenantId` | FK → Tenant | org_id scoped |
| `userId` | FK → User | Buyer identity |
| `cartId` | FK → Cart (optional) | Nullable after cart checkout |
| `status` | OrderStatus | Default PAYMENT_PENDING |
| `currency` | String(3) | Default "USD" |
| `subtotal` | Decimal(12,2) | |
| `total` | Decimal(12,2) | |
| `createdAt` / `updatedAt` | DateTime | |
| `items` | OrderItem[] | |
| `order_lifecycle_logs` | order_lifecycle_logs[] | |
| `cart` | Cart? | |
| `tenant` / `user` | Relations | |

### Absent fields — confirmed missing

| Missing field | Impact |
|---|---|
| `supplierId` / seller-side FK | No cross-tenant supplier link; orders are buyer-tenant scoped only |
| `shippingAddress` / delivery fields | No logistics data model; fulfilment is status-only |
| `fulfillmentDate` / `expectedDeliveryDate` | No delivery scheduling |
| `paymentIntentId` / PSP reference | No payment gateway integration |
| `invoiceId` / invoice relation | No invoice linkage from order |
| `rfqId` / RFQ relation | No traceability from RFQ to Order in schema |
| `notes` / buyer instructions | No buyer-side text fields |
| Soft-delete / cancellation reason on Order | Reason only in `order_lifecycle_logs` via SM |

### `OrderStatus` enum — dual-write architecture

The Prisma schema defines 5 enum values: `PAYMENT_PENDING`, `PLACED`, `CANCELLED`, `CONFIRMED`, `FULFILLED`.

The PATCH route maps:
- CONFIRMED → PLACED (DB write)
- FULFILLED → PLACED (DB write)
- CANCELLED → CANCELLED (DB write)
- PAYMENT_PENDING is the only write at checkout

`order_lifecycle_logs` holds the canonical semantic state (`to_state` = CONFIRMED | FULFILLED | CANCELLED | PAYMENT_PENDING). The frontend `canonicalStatus()` function reads `order.lifecycleState` (derived from the latest lifecycle log's `to_state`), not `order.status` directly.

This pattern is intentional and fully closed (GAP-ORDER-LC-001 ✅ CLOSED).

**Note on schema history:** An earlier version of the DB only had 3 enum values (PAYMENT_PENDING / PLACED / CANCELLED). The Prisma schema has since been extended to include CONFIRMED and FULFILLED in the enum, though the PATCH route still maps them to PLACED at the DB level by design.

---

## 9. Workflow / Status Gap Analysis

### Allowed state machine transitions (seeded — GOVERNANCE-SYNC-057)

```
PAYMENT_PENDING → CONFIRMED    (TENANT_ADMIN allowed)
PAYMENT_PENDING → CANCELLED    (TENANT_ADMIN allowed)
CONFIRMED       → FULFILLED    (TENANT_ADMIN allowed)
CONFIRMED       → CANCELLED    (TENANT_ADMIN allowed)
```

Terminal states: `FULFILLED`, `CANCELLED` (no transitions out)

**PAYMENT_PENDING → FULFILLED is explicitly not allowed** — confirmed correct; terminal guard returns 409 (validated in OPS-REVENUE-FLOW-VALIDATION-002.md Phase 4B.1).

### Live execution gap

| Workflow step | Status | Blocker |
|---|---|---|
| Buyer: add to cart → checkout → order created at PAYMENT_PENDING | ✅ WORKS | None |
| Buyer: view own orders list (MEMBER role) | ✅ WORKS | None |
| Operator: view all tenant orders (OWNER/ADMIN) | ✅ WORKS | None |
| Operator: view order detail | ✅ WORKS | None |
| Operator: PATCH PAYMENT_PENDING → CONFIRMED | ❌ BLOCKED | GAP-RLS-ORDERS-UPDATE-001: `orders_update_unified` has no tenant arm |
| Operator: PATCH CONFIRMED → FULFILLED | ❌ BLOCKED | Same root cause |
| Operator: PATCH → CANCELLED (from any state) | ❌ BLOCKED | Same root cause |

### Contract-to-implementation drift

| Item | OpenAPI contract says | Backend actually does |
|---|---|---|
| `GET /api/tenant/orders` — pagination | Accepts `limit` (1–100, default 20) and `cursor` (UUID) query params | Ignores both; hardcodes `take: 20` |
| `PATCH /api/tenant/orders/{id}/status` — body | Only `status` field documented | Also accepts `reason` (optional string, 1–2000 chars) — undocumented |

---

## 10. Permissions / Persona Access Analysis

### Backend role enforcement

| Route | MEMBER | VIEWER | OWNER | ADMIN |
|---|---|---|---|---|
| `POST /api/tenant/checkout` | ✅ Own orders only | ✅ Own orders only | ✅ | ✅ |
| `GET /api/tenant/orders` | ✅ Own orders (userId filter) | ✅ Own orders (userId filter) | ✅ All orders | ✅ All orders |
| `GET /api/tenant/orders/:id` | ✅ Own orders only | ✅ Own orders only | ✅ Any order | ✅ Any order |
| `PATCH /api/tenant/orders/:id/status` | ❌ 403 | ❌ 403 | ⚠️ 500 (RLS blocked) | ⚠️ 500 (RLS blocked) |

### Frontend role enforcement (EXPOrdersPanel)

- Action buttons (CONFIRMED, FULFILLED, CANCELLED) are hidden from MEMBER/VIEWER via `userRole` check
- Confirm dialog shown before any transition (for OWNER/ADMIN)
- `getCurrentUser()` safe-fails: if auth unavailable, action buttons are hidden (conservative default)

### Cross-tenant isolation

- `tenantId` (`org_id`) is the canonical isolation boundary on all Order reads and writes
- `orders_select_unified` enforces `tenant_id = app.current_org_id()` ✅
- No cross-tenant supplier FK exists in the Order model — a supplier cannot access buyer orders from another tenant. This is by design: B2B Orders is a single-tenant operational surface, not a marketplace matching surface.
- `withDbContext` sets `app.org_id`, `app.actor_id`, `app.realm`, `app.request_id` — never sets `app.is_admin` for tenant actors (D-5/B1 constitutional)

---

## 11. Dependency Analysis

### Order ← Cart (checkout dependency)

A `POST /api/tenant/checkout` requires:
1. An active `Cart` (status = ACTIVE) with at least one `CartItem` for the authenticated user
2. At least one valid `CatalogItem` referenced by the cart items
3. `computeTotals()` must return non-zero subtotal/total

All three dependencies are fully operational per OPS-REVENUE-FLOW-VALIDATION-002.md Phase 1–2.

### Order ← StateMachineService (lifecycle dependency)

`PATCH /api/tenant/orders/:id/status` depends on:
1. `EntityType.ORDER` registered in SM types ✅ (GOVERNANCE-SYNC-058)
2. ORDER lifecycle states in `lifecycle_states` table ✅ (seeded)
3. ORDER allowed_transitions (4 rows) in `allowed_transitions` ✅ (GOVERNANCE-SYNC-057)
4. `order_lifecycle_logs` table + RLS + Prisma model ✅ (GOVERNANCE-SYNC-058 + 060A)
5. `orders_update_unified` RLS policy with tenant arm ❌ MISSING (GAP-RLS-ORDERS-UPDATE-001)

### Order ← Frontend service layer

There is **no dedicated `orderService.ts`** in `services/`. API calls are made directly from panel components via `tenantGet` / `tenantPatch` imported from the tenant API client. This is functional but diverges from the service-layer pattern used by other B2B sub-families (e.g., `rfqService.ts`, `catalogService.ts`).

### Orders → Settlement / Escrow / Invoicing

No linkage exists in the Order schema to:
- Escrow accounts (no `escrowId` FK)
- Settlement records (no `settlementId` FK)
- Invoice model (no `invoiceId` FK)

These are deliberate Phase 2+ concerns and are correctly absent here.

### RFQ → Order traceability

No `rfqId` field exists in the Order model. If a buyer navigates from an RFQ to checkout, the resulting order carries no record of the originating RFQ. This is a Phase 2+ traceability gap, not a current blocker.

---

## 12. Launch-Readiness Classification

**Classification: FLOW-PARTIAL — READ OPERATIONAL, WRITE BLOCKED**

| Capability | Readiness |
|---|---|
| Checkout (cart → order at PAYMENT_PENDING) | ✅ LAUNCH-READY |
| Order list read (all roles) | ✅ LAUNCH-READY |
| Order detail read (all roles) | ✅ LAUNCH-READY |
| Post-checkout confirmation screen | ✅ LAUNCH-READY |
| Status transition (CONFIRMED / FULFILLED / CANCELLED) | ❌ BLOCKED — requires `orders_update_unified` RLS fix |
| Lifecycle history display | ✅ LAUNCH-READY (reads `order_lifecycle_logs` via SELECT) |
| WL_ADMIN orders surface | ✅ LAUNCH-READY for reads; ❌ BLOCKED for transitions |
| Backend pagination (limit/cursor) | ⚠️ PARTIAL — contract documents params, backend ignores them |
| `reason` field in PATCH OpenAPI contract | ⚠️ ABSENT — backend accepts it, contract doesn't document it |
| Dedicated `orderService.ts` | ⚠️ ABSENT — direct calls work but deviate from service-layer pattern |

**The single blocking item for full launch-readiness is the `orders_update_unified` RLS policy.** The code, frontend, SM wiring, DB tables, seeds, and lifecycle log pattern are all complete and correct. Only the DB-layer UPDATE policy is missing a tenant arm.

---

## 13. Exact Missing Pieces

### P0 — Required for any write-path launch

**GAP-RLS-ORDERS-UPDATE-001: `orders_update_unified` must gain a tenant arm**

Current policy (admin-only):
```sql
USING: (current_setting('app.is_admin'::text, true) = 'true'::text)
```

Required change (documented in OPS-REVENUE-FLOW-VALIDATION-002.md as Future Wave A1):
```sql
DROP POLICY IF EXISTS orders_update_unified ON public.orders;
CREATE POLICY orders_update_unified ON public.orders
  AS PERMISSIVE FOR UPDATE TO texqtic_app
  USING (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  )
  WITH CHECK (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  );
```

This is a deliberate RLS SQL change requiring governance sign-off before execution.

### P1 — Contract accuracy

**Backend pagination not implemented despite OpenAPI contract documentation:**
- `GET /api/tenant/orders` contract documents `limit` (1–100) and `cursor` (UUID) params
- Backend hardcodes `take: 20` and ignores both params
- Resolution options: (A) implement cursor pagination in backend, or (B) remove params from contract and document the fixed-page behaviour

**`reason` field absent from PATCH OpenAPI contract body schema:**
- Backend accepts optional `reason` (string, 1–2000 chars) in `PATCH /api/tenant/orders/{id}/status`
- Contract only documents `status` field
- Resolution: add `reason` as optional property to contract schema

### P2 — Code quality / consistency

**No dedicated `orderService.ts`:**
- Panel components call `tenantGet`/`tenantPatch` directly
- Other sub-families (catalog, RFQ) have dedicated service modules
- Not a blocker; a consistency gap only

---

## 14. Recommended First Bounded Implementation Unit

**Title:** `ORDERS-RLS-WRITE-UNBLOCK-001`  
**Scope:** Apply `orders_update_unified` RLS policy tenant arm to unblock PATCH writes in production

**Allowlist (Modify):**
- `server/prisma/ops/orders_update_unified.sql` (new ops file — SQL only, no migration)

**Allowlist (Read-only):**
- `docs/rcp1/OPS-REVENUE-FLOW-VALIDATION-002.md` (reference for proposed SQL)
- `server/src/routes/tenant.ts` (verify PATCH route logic; no changes)
- `governance/decisions/` (new governance decision required before SQL apply)

**Sequence:**
1. Governance sign-off on `orders_update_unified` extension (new governance decision file)
2. Author `server/prisma/ops/orders_update_unified.sql` with the documented Future Wave A1 SQL
3. Apply via `psql -f ... (DATABASE_URL)` — no Prisma migration required (RLS policy only)
4. Verify: `psql` query confirms policy exists with tenant arm
5. Run `pnpm -C server exec prisma db pull` — confirm no schema drift
6. Restart server
7. Re-execute OPS-REVENUE-FLOW-VALIDATION-002 Phase 4 steps — PATCH → CONFIRMED → FULFILLED → CANCELLED should all succeed
8. Update gap register: GAP-RLS-ORDERS-UPDATE-001 → CLOSED

**Expected outcome:** Full end-to-end order lifecycle operational:
```
Checkout → PAYMENT_PENDING → CONFIRMED → FULFILLED (or CANCELLED)
```
Both EXPOrdersPanel and WLOrdersPanel write operations unblocked. No code changes required.

---

## 15. Recommended Sequencing After That

After `ORDERS-RLS-WRITE-UNBLOCK-001`:

| Unit | Scope | Pre-condition |
|---|---|---|
| `ORDERS-CONTRACT-SYNC-001` | Fix OpenAPI contract pagination params (remove or implement) + add `reason` field to PATCH body | UNBLOCK-001 complete |
| `ORDERS-BACKEND-PAGINATION-001` | Implement cursor-based pagination in `GET /api/tenant/orders` | CONTRACT-SYNC-001 decides approach |
| `ORDERS-SERVICE-LAYER-001` | Extract `orderService.ts` with `getOrders()`, `getOrder()`, `updateOrderStatus()` | Optional; consistency improvement |
| `ORDERS-INTEGRATION-TEST-001` | Write orders integration test covering checkout → CONFIRMED → FULFILLED + terminal state enforcement | UNBLOCK-001 complete; tests require live DB or mock |
| `ORDERS-RFQ-TRACEABILITY-001` | Add `rfqId` FK to Order schema (optional, Phase 2) | Requires schema migration governance |

---

## 16. What Should NOT Be Mixed Into the First Implementation Cycle

The following items must **not** be absorbed into `ORDERS-RLS-WRITE-UNBLOCK-001` or any subsequent single order-lifecycle unit:

| Item | Reason to exclude |
|---|---|
| Payment gateway / PSP integration | Phase 2+ concern; requires external service wiring, secrets governance, financial correctness review |
| Invoice model linkage (`invoiceId` on Order) | Requires new DB table, migration, RLS — separate governance unit |
| Shipping / logistics fields | No logistics data model exists; adding fields requires schema wave |
| Cross-tenant supplier order visibility | Requires architectural decision on tenancy model expansion; no `supplierId` today |
| Settlement / escrow FK linkage | Settlement sub-family governance required separately |
| RFQ → Order traceability (`rfqId`) | Schema change; cascade impact on RFQ investigation findings |
| Maker-Checker pattern on order status transitions | G-021 Maker-Checker currently governs TRADE/ESCROW only; extending to ORDER is a separate governance unit |
| Escalation service wiring for ORDER | `EscalationEntityType` does not include ORDER; extension requires dedicated governance |
| Broad orders refactor (panel UX redesign, new status flows) | Violates minimal-diff discipline; unblock DB first, then refine incrementally |
| Pagination backend rewrite concurrent with RLS fix | Should be a distinct unit; mixing increases risk surface for the single blocking fix |

---

## Summary

The B2B Orders sub-family is **more complete than any other B2B sub-family investigated in this series.** The schema, SM wiring, frontend panels, checkout flow, order list/detail reads, and lifecycle log pattern are all fully implemented and verified. The end-to-end read path is production-valid.

The single blocker to full operational status is `GAP-RLS-ORDERS-UPDATE-001`: the `orders_update_unified` RLS policy lacks a tenant arm, making all `PATCH /api/tenant/orders/:id/status` writes fail with `P2025` for every tenant actor. The fix is a single SQL RLS policy update, documented in `OPS-REVENUE-FLOW-VALIDATION-002.md` as Future Wave A1. No code changes, no migrations, no new tables are required to unblock it.

Once the RLS gap is resolved, the complete B2B order lifecycle — from cart checkout through PAYMENT_PENDING → CONFIRMED → FULFILLED (or CANCELLED) — will be fully operational for both EXPOrdersPanel and WLOrdersPanel.
