# TECS-B2B-ORDERS-LIFECYCLE-001 — Repo-Truth Audit

**Status:** AUDIT COMPLETE  
**Classification:** `ORDERS_SUBSTANTIALLY_IMPLEMENTED`  
**Audit Date:** 2026-06 (HEAD = 91b6503)  
**Audit Scope:** Read-only investigation — no code changes made.  
**Allowlisted Output File:** `docs/TECS-B2B-ORDERS-LIFECYCLE-001-REPO-TRUTH-AUDIT.md`

---

## 0. Methodology

This audit inspects actual repo artefacts only: Prisma schema, migration SQL, backend route source, frontend component source, service source, runtime descriptors, and test files. Governance documents and design plans are referenced as context only and are never treated as evidence of implementation.

Evidence chain: `server/prisma/schema.prisma` → `server/src/routes/tenant.ts` (PR-A block) → `server/src/services/stateMachine.service.ts` → `server/scripts/seed_state_machine.ts` → `components/Tenant/EXPOrdersPanel.tsx` → `components/WhiteLabelAdmin/WLOrdersPanel.tsx` → `services/cartService.ts` → `App.tsx` → `runtime/sessionRuntimeDescriptor.ts` → `server/prisma/migrations/` → `server/prisma/ops/`.

---

## 1. Executive Summary

The TexQtic Orders domain is **substantially implemented end-to-end** as of HEAD = 91b6503. The implementation covers: Prisma schema with full RLS, a state machine with 4 lifecycle states and 4 directed transitions, 4 backend REST routes (POST checkout, GET list, GET detail, PATCH status), two parallel frontend panels (EXPERIENCE + WL_ADMIN), a complete API client integration, and a live end-to-end validation script.

The Orders implementation represents a **B2C-style marketplace checkout model** (buyer places order from their tenant catalog cart). It is intentionally not a bilateral B2B supplier-side order. The Trade domain (RFQ → Trade) is a separate model with no FK to the Orders table; there is no RFQ-to-Order conversion path.

Five known gaps exist: (1) DB `order.status` column still writes PLACED for both CONFIRMED and FULFILLED despite the DB enum being extended, (2) no control-plane Orders admin view, (3) no automated integration tests for Order routes, (4) no buyer-to-supplier designation in the Order model, (5) Orders list is capped at 20 with no cursor/offset pagination.

---

## 2. Database Schema — Repo Truth

### 2.1 `orders` table (`schema.prisma` lines ~450–470)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `tenantId` | UUID FK → Tenant | RLS key: `app.org_id` GUC |
| `userId` | UUID FK → User | Buyer user (non-nullable) |
| `cartId` | UUID FK → Cart (nullable) | Cart that originated the order |
| `status` | `OrderStatus` enum | Default: `PAYMENT_PENDING` |
| `currency` | String | Default: `USD` |
| `subtotal` | Decimal(12,2) | |
| `total` | Decimal(12,2) | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

Relations: `items[]`, `order_lifecycle_logs[]`, `cart` (nullable), `tenant`, `user`.

Indexes: `cartId`, `(tenantId, createdAt DESC)`, `tenantId`, `userId`.

**FORCE RLS:** Yes (applied by migration `20260223050000_g006c_rls_orders_consolidation`).

### 2.2 `order_items` table (`schema.prisma` lines ~429–450)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `tenantId` | UUID FK → Tenant | |
| `orderId` | UUID FK → Order CASCADE | |
| `catalogItemId` | UUID FK → CatalogItem (nullable) | Catalog reference — nullable for delinked items |
| `sku` | String (nullable) | Snapshot at order time |
| `name` | String | Snapshot at order time |
| `quantity` | Int | |
| `unitPrice` | Decimal(10,2) | Snapshot at order time |
| `lineTotal` | Decimal(12,2) | |
| `createdAt` | DateTime | |

Indexes: `catalogItemId`, `orderId`, `tenantId`.

### 2.3 `order_lifecycle_logs` table (migration `20260315000005_gap_order_lc_001_schema_foundation`)

Append-only lifecycle audit log. Created by GAP-ORDER-LC-001 B1 migration.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `order_id` | UUID FK → orders(id) CASCADE | |
| `tenant_id` | UUID (denormalised) | RLS canonical arm |
| `from_state` | Text (nullable) | `null` on initial creation |
| `to_state` | Text NOT NULL CHECK (non-empty) | Semantic state key |
| `actor_id` | UUID (nullable) | Single consolidated actor UUID |
| `realm` | Text | `admin` / `system` / `tenant` |
| `request_id` | UUID (nullable) | |
| `created_at` | Timestamptz | Default: `now()` |

Constraints: `order_lifecycle_logs_order_fk` (FK → orders ON DELETE CASCADE), `order_lifecycle_logs_to_state_nonempty` (CHECK).

Indexes: `(order_id, created_at DESC)`, `(tenant_id, created_at DESC)`, `(to_state, created_at DESC)`.

**FORCE RLS:** Yes. 1 RESTRICTIVE guard + 4 PERMISSIVE policies (INSERT/SELECT/immutability blocks).

Grants applied: `server/prisma/ops/order_lifecycle_logs_grants.sql` — SELECT, INSERT granted to `texqtic_app` and `app_user`.

### 2.4 `OrderStatus` enum (`schema.prisma` line 1430)

```prisma
enum OrderStatus {
  PAYMENT_PENDING
  PLACED
  CANCELLED
  CONFIRMED
  FULFILLED
  @@map("order_status")
}
```

All 5 values are present in `schema.prisma` AND in the DB enum (extended by ops migration `20260315000007_ops_orders_status_enum_001` which added `CONFIRMED` and `FULFILLED`).

**Known discrepancy:** Route comment at `tenant.ts` line 6039 says "enum only has PAYMENT_PENDING | PLACED | CANCELLED" — this comment is **stale** (it was accurate before the ops migration). The PATCH route still maps CONFIRMED/FULFILLED → PLACED for `order.status` DB writes, but this is intentional code logic, not an enum limitation. See Gap GAP-ORDERS-DB-STATUS-MAPPING below.

### 2.5 Trade / Escrow (adjacent domain — no FK to orders)

The `Trade` model (`table trades`) has `sourceRfqId` (nullable FK → rfqs), `buyerOrgId`, `sellerOrgId`, `escrow_id`. There is **no FK from `trades` to `orders`**. The two domains (Cart-to-Order vs RFQ-to-Trade) are parallel and independent paths. No `order_id` field exists on `trades` or vice-versa.

---

## 3. RLS Policy Inventory

Source: migration `20260223050000_g006c_rls_orders_consolidation` + ops script `rcp1_orders_update_unified_tenant_arm.sql`.

| Command | Policy Name | Grantee Scope |
|---|---|---|
| SELECT | `orders_select_unified` | Tenant (own `tenantId`) OR admin |
| INSERT | `orders_insert_unified` | Tenant (own `tenantId`) OR admin |
| UPDATE | `orders_update_unified` | Initially admin-only; extended by `rcp1_orders_update_unified_tenant_arm.sql` to also allow tenant role for own-tenant rows |
| DELETE | `orders_delete_unified` | Admin only |

`order_lifecycle_logs` RLS: tenant may SELECT own rows (scoped by `tenant_id`); INSERT allowed by tenant + admin; UPDATE/DELETE blocked (immutability).

---

## 4. State Machine — Repo Truth

Source: `server/scripts/seed_state_machine.ts` sections 7–8.

### 4.1 ORDER lifecycle states (4 rows in `lifecycle_states`)

| State Key | isTerminal | isIrreversible | severityLevel | requiresMakerChecker |
|---|---|---|---|---|
| `PAYMENT_PENDING` | false | false | 0 | false |
| `CONFIRMED` | false | false | 0 | false |
| `FULFILLED` | **true** | **true** | 0 | false |
| `CANCELLED` | **true** | **true** | 1 | false |

Note: `PLACED` is a DB enum value but is **not** a `lifecycle_states` row for ORDER. It exists only as a DB status alias; `order_lifecycle_logs` does not use it.

### 4.2 ORDER allowed_transitions (4 directed edges in `allowed_transitions`)

| From | To | Allowed Actor Types |
|---|---|---|
| `PAYMENT_PENDING` | `CONFIRMED` | `SYSTEM_AUTOMATION`, `TENANT_ADMIN` |
| `CONFIRMED` | `FULFILLED` | `SYSTEM_AUTOMATION`, `TENANT_ADMIN`, `PLATFORM_ADMIN` |
| `CONFIRMED` | `CANCELLED` | `TENANT_USER`, `TENANT_ADMIN`, `PLATFORM_ADMIN` |
| `PAYMENT_PENDING` | `CANCELLED` | `TENANT_USER`, `TENANT_ADMIN`, `PLATFORM_ADMIN` |

No `requiresMakerChecker` for any ORDER transition. No `requiresEscalation`.

Verifier seed script asserts: `lifecycle_states ORDER expected 4, got N` and `allowed_transitions ORDER expected 4, got N` (lines 898–899).

### 4.3 StateMachineService ORDER handling

Source: `server/src/services/stateMachine.service.ts` lines 414–510.

The `StateMachineService.transition()` method has a dedicated `if (normalizedEntityType === 'ORDER')` branch that:
- Writes `order_lifecycle_logs` row atomically (via caller-provided `opts.db` shared-tx or standalone `$transaction`).
- On terminal state (`FULFILLED` or `CANCELLED`): creates a `morgue_entries` row (G-027 pattern; deduplicates by `entity_type + entity_id + final_state`).
- Realm derivation: `PLATFORM_ADMIN` or `actorAdminId` set → `'admin'`; `SYSTEM_AUTOMATION` → `'system'`; all others → `'tenant'`.

---

## 5. Backend Routes — Repo Truth

Source: `server/src/routes/tenant.ts`, comment block `// PR-A: Orders + Checkout` at line 5782.

No Order routes exist outside of `tenant.ts`. `control.ts` has no Order admin endpoints. The `tenant/` subdirectory (`trades.g017.ts`, `documents.ts`) has no Order-domain code.

### 5.1 `POST /api/tenant/checkout` (line 5790)

**Auth:** `tenantAuthMiddleware` + `databaseContextMiddleware` (G-005). `checkoutUserId` = `dbContext.actorId` — NOT from client body.

**Logic (single Prisma transaction):**
1. Find ACTIVE cart for `checkoutUserId` with items and catalog metadata.
2. Guard: `CART_NOT_FOUND` → 404; `CART_EMPTY` → 400.
3. Compute totals via `computeTotals()` (canonical G-010 function). `TotalsInputError` → 400.
4. `tx.order.create({status: 'PAYMENT_PENDING', currency, subtotal, total, items: { create: [...] }})` — items snapshot `name`, `sku`, `unitPrice`, `lineTotal`.
5. `tx.cart.update({status: 'CHECKED_OUT'})`.
6. `writeAuditLog(...)` — action: `order.CHECKOUT_COMPLETED`, entity: `order`.
7. `tx.order_lifecycle_logs.create({from_state: null, to_state: 'PAYMENT_PENDING', ...})` — initial lifecycle entry.

**Response (HTTP 201):** `{ orderId, status, currency, itemCount, totals: { subtotal, discountTotal, taxableAmount, taxTotal, feeTotal, grandTotal, breakdown } }`.

### 5.2 `GET /api/tenant/orders` (line 5953)

**Auth:** `tenantAuthMiddleware` + `databaseContextMiddleware`.

**Role gate:** OWNER/ADMIN → `where: undefined` (all tenant orders); MEMBER → `where: { userId }` (own orders only).

**Query:** `tx.order.findMany({ include: { items: true, order_lifecycle_logs: { orderBy: {created_at:'desc'}, take: 5, select: {from_state,to_state,realm,created_at} } }, orderBy: {createdAt:'desc'}, take: 20 })`.

**Serialisation (`serializeTenantOrder()`):** Strips raw `order_lifecycle_logs`; exposes `lifecycleState` (latest `to_state` or null) and `lifecycleLogs` array.

**Response (HTTP 200):** `{ orders: [...], count: N }`. Orders list capped at 20 (no pagination).

### 5.3 `GET /api/tenant/orders/:id` (line 5991)

**Auth/role:** Same role-based scoping as list. UUID param validated via Zod.

**Query:** `tx.order.findFirst({ where: canReadTenantWideOrders ? {id} : {id, userId}, include: { items, order_lifecycle_logs } })`.

**Response (HTTP 200):** `{ order }` with items and lifecycle logs. HTTP 404 if not found or out of scope.

### 5.4 `PATCH /api/tenant/orders/:id/status` (line 6029)

**Auth:** `tenantAuthMiddleware` + `databaseContextMiddleware`.

**Role gate (app-layer):** OWNER/ADMIN only → 403 for MEMBER/VIEWER. Documented as B1/D-5 preserved (no DB GUC role check).

**Body schema (Zod):** `{ status: z.enum(['CONFIRMED','FULFILLED','CANCELLED']), reason?: string(1–2000) }`.

**Canonical from-state resolution:** Reads latest `order_lifecycle_logs` row for the order; falls back to `order.status` if no log row exists (handles historical orders created before lifecycle log infrastructure).

**SM call:** `StateMachineService.transition({ entityType: 'ORDER', fromStateKey: canonicalFromState, toStateKey: requestedStatus, actorType: 'TENANT_ADMIN', ... })`. SM validates `allowed_transitions` and writes `order_lifecycle_logs` row atomically.

**SM error mapping:**
- `DENIED / TRANSITION_NOT_PERMITTED` → HTTP 409 `ORDER_STATUS_INVALID_TRANSITION`
- `DENIED / TRANSITION_FROM_TERMINAL` → HTTP 409
- `DENIED / ACTOR_ROLE_NOT_PERMITTED` → HTTP 403
- Other SM errors → HTTP 500

**DB status update (after SM APPLIED):** `CONFIRMED` → DB `PLACED`; `FULFILLED` → DB `PLACED`; `CANCELLED` → DB `CANCELLED`. This mapping is intentional design: `order_lifecycle_logs` is the canonical semantic state source; `order.status` is an approximation. See Gap GAP-ORDERS-DB-STATUS-MAPPING.

**Response (HTTP 200):** `{ order }` — the updated Order row (DB status, not semantic status).

---

## 6. Frontend UI — Repo Truth

### 6.1 `components/Tenant/EXPOrdersPanel.tsx`

**EXPERIENCE shell** Orders panel. TECS ID: OPS-EXPERIENCE-ORDERS-UX-001 / GAP-EXP-ORDERS-001.

- Fetches `GET /api/tenant/orders` and `getCurrentUser()` in parallel (`Promise.all`).
- Role gates action buttons client-side: OWNER/ADMIN may trigger transitions; MEMBER/VIEWER sees order list only (TECS-FBW-AT-006).
- `canonicalStatus(order)`: derives display status from `order.status` + `lifecycleState` in priority order: CANCELLED > FULFILLED > CONFIRMED > PAYMENT_PENDING > PLACED.
- Action buttons per derived status: PAYMENT_PENDING → [Confirm, Cancel]; CONFIRMED/PLACED → [Fulfill, Cancel]; FULFILLED/CANCELLED → [] (terminal, no buttons).
- `PATCH /api/tenant/orders/:id/status` called via `tenantPatch()` on confirm dialog acceptance.
- Renders: orders table with status badge (colour-coded per all 5 derived statuses), lifecycle history (up to 5 log entries), confirm dialog with irreversibility warning for CANCEL.

### 6.2 `components/WhiteLabelAdmin/WLOrdersPanel.tsx`

**WL_ADMIN shell** Orders panel. TECS ID: OPS-WLADMIN-ORDERS-PANEL-001 / GAP-WL-ORDERS-001.

Parallel implementation to `EXPOrdersPanel`. Same data endpoints, same `canonicalStatus()` logic, same role gate. Intentionally separate component (shell separation doctrine B1/D-5). Must never be imported by EXPERIENCE shell.

### 6.3 `App.tsx` — Integration Points

```
Line 18:  import { WLOrdersPanel } from './components/WhiteLabelAdmin/WLOrdersPanel';
Line 21:  import { EXPOrdersPanel } from './components/Tenant/EXPOrdersPanel';
Line 1126: WL_ADMIN_VIEWS includes 'ORDERS'
Line 4368: case 'orders': return <WLOrdersPanel />;        // WL_ADMIN shell router
Line 5010: case 'orders': return <EXPOrdersPanel onBack={...} />;  // EXPERIENCE shell router
Line 6802: navigateTenantManifestRoute('orders');           // "View My Orders" CTA
```

### 6.4 `services/cartService.ts` — Checkout API Client

```typescript
export async function checkout(): Promise<CheckoutResult> {
  return tenantPost<CheckoutResult>('/api/tenant/checkout', {});
}

export interface CheckoutResult {
  orderId: string;
  status: string;
  // ...
  totals: CheckoutTotals;
}
```

---

## 7. Runtime Surface — Repo Truth

Source: `runtime/sessionRuntimeDescriptor.ts`.

| Key | Value | Evidence |
|---|---|---|
| RouteGroupKey | `'orders_operations'` | Line 107 |
| RouteKey | `'orders'` | Line 116 |
| Feature gate | `orders_operations: 'feature-gated'` | Line 264 |
| WORKSPACE\_ORDERS\_ROUTE\_GROUP | `defineRuntimeRouteGroup('orders_operations', [...])` | Line 337 |
| WL\_ADMIN\_ORDERS\_ROUTE\_GROUP | `defineRuntimeRouteGroup('orders_operations', [...])` | Line 375 |
| `allowedRouteGroups` | `'orders_operations'` present across B2B_ENTERPRISE, B2B_BUYER, B2C_SMB, WL_ADMIN manifests | Lines 489, 510, 532, 556, 580 |

Orders route group is registered in all major manifest entries. Navigation via `navigateTenantManifestRoute('orders')`.

---

## 8. RFQ-to-Order Seam — Repo Truth

### What exists

The `Trade` model has `sourceRfqId` (nullable FK → `rfqs` table via `"trade_source_rfq"` relation). This represents an RFQ-originated Trade. Trade has `buyerOrgId` / `sellerOrgId` (both org-scoped, bilateral B2B).

### What does NOT exist

- No FK from `Trade` → `Order`.
- No FK from `Order` → `Trade` or `Rfq`.
- No backend route that converts a Trade or RFQ response to an Order.
- No `supplierOrgId` or `supplierTenantId` field on the `Order` model.
- No seller-side acknowledgment or order dispatch route.

### Conclusion

RFQ-to-Order is **not implemented**. Cart-to-Order (marketplace checkout) and RFQ-to-Trade are two entirely separate, non-connected paths. The `Trade` domain models bilateral B2B negotiation; the `Order` domain models single-tenant buyer checkout orders from catalog.

---

## 9. Test Coverage — Repo Truth

### What exists

| Artefact | Type | Scope |
|---|---|---|
| `server/scripts/validate-rcp1-flow.ts` | Manual end-to-end script | Full cart→checkout→lifecycle transitions chain (Phases 0–5); verifies PAYMENT_PENDING→CONFIRMED→FULFILLED via HTTP + Prisma direct |
| `tests/b2b-buyer-catalog-pdp-page.test.ts` | Frontend unit | Asserts `not.toContain('place order')` (B2B context — correct negative assertion) |
| `server/src/__tests__/gate-d2-carts-rls.integration.test.ts` | Integration | Cart RLS isolation — adjacent but exercises checkout pre-conditions |

### What does NOT exist

- No dedicated `orders.integration.test.ts` in `server/src/__tests__/`.
- No jest tests for `POST /api/tenant/checkout`.
- No jest tests for `GET /api/tenant/orders`.
- No jest tests for `PATCH /api/tenant/orders/:id/status`.
- No jest tests for `serializeTenantOrder()` or `canonicalStatus()`.

---

## 10. Security and Tenant Isolation Audit

| Control | Status | Evidence |
|---|---|---|
| `checkoutUserId` derived from `dbContext.actorId` (not client body) | ✅ CORRECT | `tenant.ts` line 5797 |
| `withDbContext()` sets `app.org_id` GUC before every Prisma query | ✅ CORRECT | `databaseContextMiddleware` + `withDbContext` wrapping all order queries |
| MEMBER role sees only own orders (`where: { userId }`) | ✅ CORRECT | Lines 5965, 6008 |
| PATCH status endpoint role-gated to OWNER/ADMIN only (app-layer) | ✅ CORRECT | Lines 6061–6063 |
| SM validates actor type via `allowed_transitions.allowedActorType` | ✅ CORRECT | `stateMachine.service.ts` |
| `order.status` not taken from client body — only `requestedStatus` enum validated | ✅ CORRECT | Zod body schema limits to `['CONFIRMED','FULFILLED','CANCELLED']` |
| RLS FORCE on `orders` and `order_lifecycle_logs` | ✅ CORRECT | Migrations confirmed |
| Audit log written on checkout (`order.CHECKOUT_COMPLETED`) | ✅ CORRECT | `tenant.ts` lines 5868–5883 |
| No sensitive data in checkout response (no internal IDs beyond orderId) | ✅ CORRECT | Response shape at lines 5897–5906 |
| `order_lifecycle_logs` immutable (UPDATE/DELETE blocked) | ✅ CORRECT | RLS migration policy |

No cross-tenant leakage vectors identified for Order routes.

---

## 11. Gap Matrix

| Gap ID | Category | Description | Severity |
|---|---|---|---|
| GAP-ORDERS-DB-STATUS-MAPPING | Design Debt | `PATCH /tenant/orders/:id/status` maps CONFIRMED and FULFILLED → DB `PLACED`. The DB enum and `schema.prisma` now include CONFIRMED/FULFILLED (after ops migration `20260315000007`), but the code still uses the old mapping. Route comment at line 6039 is stale. `order_lifecycle_logs` remains the canonical semantic state. | Low — intentional, documented |
| GAP-ORDERS-NO-CONTROL-ADMIN | Missing Feature | No control-plane Order admin route in `control.ts`. Platform admins cannot view or manage Orders. | Medium |
| GAP-ORDERS-NO-INTEGRATION-TESTS | Test Coverage | No automated jest integration tests for any of the 4 Order routes. Only `validate-rcp1-flow.ts` (manual script) exercises the end-to-end path. | Medium |
| GAP-ORDERS-NO-RFQ-CONVERSION | Missing Feature | No RFQ-to-Order or Trade-to-Order conversion. B2B procurement via RFQ stays in the Trade domain; no Order is created from that path. | Low — architectural decision |
| GAP-ORDERS-LIST-NO-PAGINATION | Missing Feature | `GET /api/tenant/orders` capped at `take: 20` with no cursor or offset pagination. | Low |
| GAP-ORDERS-PLACED-STATE-ORPHANED | Design Debt | DB enum value `PLACED` exists but has no row in `lifecycle_states` for ORDER and no SM transitions use it. It is a legacy status that can appear in `order.status` only as an alias for CONFIRMED/FULFILLED. | Low |
| GAP-ORDERS-NO-SUPPLIER-SIDE | Scope Boundary | No supplier-side order acknowledgment, dispatch, or cross-tenant visibility for Orders. The Order model is single-tenant buyer-only. | Low — by design |

---

## 12. Migration History (Orders-Related)

| Migration | Description |
|---|---|
| `20260223050000_g006c_rls_orders_consolidation` | Consolidated Orders RLS to 4 unified policies |
| `20260223060000_g006c_rls_order_items_consolidation` | Consolidated OrderItems RLS |
| `20260302000000_g006c_orders_guard` | Pre-req for event_logs cleanup |
| `20260315000005_gap_order_lc_001_schema_foundation` | GAP-ORDER-LC-001 B1: creates `order_lifecycle_logs` table, extends `allowed_transitions.entity_type` CHECK to include ORDER, seeds 4 ORDER lifecycle_states rows |
| `20260315000007_ops_orders_status_enum_001` | OPS-ORDERS-STATUS-ENUM-001: extends `order_status` enum to include CONFIRMED and FULFILLED |
| `server/prisma/ops/rcp1_orders_update_grant.sql` | Grants UPDATE on `orders` to `texqtic_app` + `app_user` |
| `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql` | Extends `orders_update_unified` RLS policy to allow tenant-scoped UPDATE |
| `server/prisma/ops/order_lifecycle_logs_grants.sql` | Grants SELECT + INSERT on `order_lifecycle_logs` to `texqtic_app` + `app_user` |

---

## 13. Implementation Completeness Assessment

| Layer | Status | Notes |
|---|---|---|
| Prisma schema — `orders` model | ✅ Complete | All fields, relations, indexes present |
| Prisma schema — `order_items` model | ✅ Complete | Price snapshot fields present |
| Prisma schema — `order_lifecycle_logs` model | ✅ Complete | FORCE RLS, correct FK + indexes |
| DB enum `OrderStatus` | ✅ Complete | All 5 values (PAYMENT_PENDING, PLACED, CANCELLED, CONFIRMED, FULFILLED) |
| RLS policies — `orders` | ✅ Complete | 4 unified policies; UPDATE extended for tenant arm |
| RLS policies — `order_lifecycle_logs` | ✅ Complete | FORCE RLS + immutability blocks |
| State machine lifecycle_states (ORDER) | ✅ Complete | 4 states seeded |
| State machine allowed_transitions (ORDER) | ✅ Complete | 4 directed edges; no MakerChecker for Orders |
| StateMachineService ORDER branch | ✅ Complete | Writes lifecycle log + morgue on terminal |
| `POST /api/tenant/checkout` | ✅ Complete | Atomic transaction; lifecycle log written; totals canonical |
| `GET /api/tenant/orders` | ✅ Complete | Role-gated; lifecycle enrichment (B6a) |
| `GET /api/tenant/orders/:id` | ✅ Complete | UUID validation; role-gated |
| `PATCH /api/tenant/orders/:id/status` | ✅ Complete | SM-driven; canonical from-state from lifecycle log |
| `EXPOrdersPanel` (EXPERIENCE shell) | ✅ Complete | Full table + status badges + actions + confirm dialog |
| `WLOrdersPanel` (WL_ADMIN shell) | ✅ Complete | Parallel to EXP; shell-separated |
| `App.tsx` routing wiring | ✅ Complete | Both shells; "View My Orders" CTA |
| `cartService.checkout()` API client | ✅ Complete | `tenantPost('/api/tenant/checkout', {})` |
| Runtime route group registration | ✅ Complete | `orders_operations` in all major manifests |
| Control-plane Order admin | ❌ Missing | No Order routes in `control.ts` |
| Integration tests (jest) | ❌ Missing | Manual script only |
| RFQ-to-Order conversion | ❌ Not implemented | Architectural boundary decision |
| Payment gateway integration | ❌ Stub | PAYMENT_PENDING is permanent until SM transitions |

---

## 14. Repo-Truth Classification

**`ORDERS_SUBSTANTIALLY_IMPLEMENTED`**

The marketplace cart-to-order lifecycle is complete end-to-end. All four backend routes are present and wired to the state machine. Both frontend shell panels are implemented. RLS, grants, and lifecycle logging are fully applied. The primary gaps are operational (no control-plane admin view, no automated tests) rather than functional blockers for the buyer marketplace flow.

---

*Audit conducted: read-only investigation only. No files modified. HEAD = 91b6503.*
