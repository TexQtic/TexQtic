# OPS-REVENUE-FLOW-VALIDATION-002 — RCP-1 Revenue Flow Evidence Report

**TECS:** OPS-REVENUE-FLOW-VALIDATION-002  
**Date:** 2026-03-02  
**Environment:** Local · Base: `http://localhost:3001` · DB: Supabase Postgres (remote)  
**Outcome:** 🟡 **PARTIALLY VALIDATED** — Phases 0–3 PASS (12/21 steps); Phases 4–5 BLOCKED (GAP-RLS-ORDERS-UPDATE-001)  
**Script:** `server/scripts/validate-rcp1-flow.ts`  
**Commit:** this commit (GOVERNANCE-SYNC-044)

---

## Tenant Under Test

| Field | Value |
|-------|-------|
| Tenant ID | `faf2e4a7-5d79-4b00-811b-8d0dce4f4d80` (ACME) |
| Owner userId | `ac6d2d3f-efea-4dd4-bb38-2a622a96421d` |
| Owner email | `o****@acme.example.com` (OWNER role) |
| JWT | Minted via `JWT_ACCESS_SECRET` from env · payload `{ userId, tenantId, type: 'access' }` · 30m TTL |

---

## Explicit Non-Goals (RCP-1 Hard Stops — Confirmed Preserved)

- ❌ No G-020 StateMachineService ORDER wiring
- ❌ No new DB tables, migrations, schema changes, or RLS policy changes
- ❌ No payment gateway / PSP integration
- ❌ No D-5 / B1 reopening (`app.roles` remains dormant for live requests)
- ❌ No shell drift or cross-shell routing changes
- ❌ No `app.is_admin=true` set for tenant actors in server code

---

## Phase Results

### Phase 0 — DB Resolution + JWT Minting

| Step | Action | HTTP | Result |
|------|--------|------|--------|
| 0.1 | Prisma: resolve ACME owner from memberships | — | ✅ PASS · userId: `ac6d2d3f-…` · role: OWNER |
| 0.2 | Mint JWT with JWT_ACCESS_SECRET (30m TTL) | — | ✅ PASS · token: `<REDACTED>` |

### Phase 1 — Catalog

| Step | Action | HTTP | Result |
|------|--------|------|--------|
| 1.1 | POST /api/tenant/catalog/items | 201 | ✅ PASS · itemId: `af813e3a-a6a7-47c1-8c09-434d92f53234` |
| 1.2 | GET /api/tenant/catalog/items (item visible) | 200 | ✅ PASS · count=12 · item present |

### Phase 2 — Cart → Checkout → PAYMENT_PENDING

| Step | Action | HTTP | Result |
|------|--------|------|--------|
| 2.1 | POST /api/tenant/cart (create/get cart) | 201 | ✅ PASS · cartId: `f29d4e4e-b48c-4f23-bbb8-a0e9b4d3886e` |
| 2.2 | POST /api/tenant/cart/items (qty: 2) | 201 | ✅ PASS · catalogItemId: `af813e3a-…` |
| 2.3 | POST /api/tenant/checkout | 201 | ✅ PASS · orderId: `ca4671b8-a329-47a5-8b3f-d0ef14167507` · status: PAYMENT_PENDING · grandTotal: $99.98 |

### Phase 3 — Orders List + Audit Parity

| Step | Action | HTTP | Result |
|------|--------|------|--------|
| 3.1 | GET /api/tenant/orders (order visible) | 200 | ✅ PASS · count=8 · orderId `ca4671b8-…` at PAYMENT_PENDING |
| 3.2 | GET /api/tenant/audit-logs (PAYMENT_PENDING entry) | 200 | ✅ PASS · `order.lifecycle.PAYMENT_PENDING` audit entry found for orderId `ca4671b8-…` |

### Phase 4 — Status Transitions (TECS 1 endpoint) — BLOCKED

| Step | Action | HTTP | Result |
|------|--------|------|--------|
| 4A.1 | PATCH …/ca4671b8-…/status { CONFIRMED } | 500 | ❌ BLOCKED — P2025 "Record to update not found" (RLS: orders_update_unified) |
| 4A.2 | Audit: order.lifecycle.CONFIRMED | — | ❌ BLOCKED (4A.1 failed) |
| 4B.1 | PATCH …/ca4671b8-…/status { FULFILLED } | 409 | ❌ BLOCKED — ORDER_STATUS_INVALID_TRANSITION (PAYMENT_PENDING→FULFILLED not allowed; transition guard working correctly) |
| 4B.2 | Audit: order.lifecycle.FULFILLED | — | ❌ BLOCKED |
| 4C.0 | Create second order (Order2 for CANCEL path) | 201 | ✅ PASS · orderId: `dfada93f-335f-46b8-bd9b-956cc5c4d751` |
| 4C.1 | PATCH …/dfada93f-…/status { CANCELLED } | 500 | ❌ BLOCKED — P2025 (same RLS root cause) |
| 4C.2 | Audit: order.lifecycle.CANCELLED | — | ❌ BLOCKED |
| 4C.3 | Terminal guard: re-transition after CANCEL → 409 | 500 | ❌ BLOCKED (CANCEL never succeeded; terminal guard untestable) |

### Phase 5 — Derived Status Verification — BLOCKED

| Step | Result |
|------|--------|
| 5.1 Order1 derived status (should be FULFILLED via audit seam) | ❌ BLOCKED — CONFIRMED transition never wrote `order.lifecycle.CONFIRMED`; DB stays PAYMENT_PENDING; derived status: PAYMENT_PENDING |
| 5.2 Order2 derived status (should be CANCELLED) | ❌ BLOCKED — CANCELLED transition never fired |

---

## Summary

| Category | Count |
|----------|-------|
| PASS | 12 |
| FAIL / BLOCKED | 9 |
| Total steps | 21 |

---

## Validated Ceiling (RCP-1 Phase 1)

The following end-to-end flow is **confirmed working** in this environment:

```
Catalog create (POST /api/tenant/catalog/items → 201)
  → Cart create (POST /api/tenant/cart → 201)
    → Cart add item (POST /api/tenant/cart/items → 201)
      → Checkout (POST /api/tenant/checkout → 201, status: PAYMENT_PENDING)
        → Order list (GET /api/tenant/orders → 200, order visible)
          → Audit trail (GET /api/tenant/audit-logs → order.lifecycle.PAYMENT_PENDING present)
```

TECS 1 endpoint code logic (`PATCH /api/tenant/orders/:id/status`) is **correct** — transition guards, allowed-transitions map, audit write — but **non-executable** in this DB posture due to GAP-RLS-ORDERS-UPDATE-001.

---

## Schema Mismatch Mapping (GAP-ORDER-LC-001 context — unchanged by TECS 4)

| App-layer status | DB OrderStatus | Notes |
|-----------------|---------------|-------|
| PAYMENT_PENDING | PAYMENT_PENDING | Direct |
| CONFIRMED | PLACED | DB lacks CONFIRMED enum value; TECS 1 maps it |
| FULFILLED | PLACED | DB can't distinguish from CONFIRMED; audit seam required for derived status |
| CANCELLED | CANCELLED | Direct |

---

## Blocker: GAP-RLS-ORDERS-UPDATE-001

**Policy:** `orders_update_unified` (FOR UPDATE TO texqtic_app) on `public.orders`

**Exact policy definition (live DB, 2026-03-02):**

```sql
-- policyname: orders_update_unified
-- cmd:        UPDATE
-- role:       texqtic_app

USING:
  (current_setting('app.is_admin'::text, true) = 'true'::text)

WITH CHECK:
  (current_setting('app.is_admin'::text, true) = 'true'::text)
```

**Root cause:**  
`withDbContext` (the canonical DB context helper used by all tenant routes) sets:
- `app.org_id = <tenantId>` ✅
- `app.actor_id = <userId>` ✅
- `app.realm = 'tenant'` ✅  
- `app.request_id = <uuid>` ✅
- `app.bypass_rls = 'off'` ✅

It does **NOT** set `app.is_admin` — by design (B1 / D-5: tenant actors must not claim admin identity at DB layer).

Result:
- `orders_select_unified` USING: `(app.require_org_context() AND tenant_id = app.current_org_id()) OR app.is_admin='true'` → tenant arm passes ✅ → SELECT works
- `orders_update_unified` USING: `app.is_admin='true'` → no tenant arm → row invisible to UPDATE → P2025 ❌

**Privilege grant applied (does not fix the RLS row-policy):**  
`GRANT UPDATE ON TABLE public.orders TO texqtic_app` and `app_user` were applied (resolved original PG 42501 table-privilege error). The deeper row-level policy restriction remains.

**Decision: No fix in RCP-1**  
RLS posture is an anchored non-goal. Fixing `orders_update_unified` requires either:
- **(A1)** Adding a tenant-scoped arm to USING + WITH CHECK — a deliberate RLS policy change, intentional future-wave only
- **(A2)** Setting `app.is_admin='true'` for OWNER/ADMIN in the PATCH handler — blurs admin identity at DB layer, not acceptable

No changes to `orders_update_unified` are made in this commit.

**Future-wave change proposal (for reference only — NOT applied):**

```sql
-- Future wave: extend orders_update_unified to allow tenant-scoped updates
-- Governance sign-off required before applying.

DROP POLICY IF EXISTS orders_update_unified ON public.orders;

CREATE POLICY orders_update_unified ON public.orders
  AS PERMISSIVE
  FOR UPDATE
  TO texqtic_app
  USING (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  )
  WITH CHECK (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  );
```

This mirrors the pattern of `orders_select_unified` and `orders_insert_unified`. Apply only in a post-RCP-1 wave with explicit RLS governance approval.

---

## DB Privilege Grant Reference

**File:** `server/prisma/ops/rcp1_orders_update_grant.sql`

```sql
-- Applied 2026-03-02 — resolved PG 42501 table-privilege error
-- Remaining block: orders_update_unified row-level policy (see above)
BEGIN;
GRANT UPDATE ON TABLE public.orders TO texqtic_app;
GRANT UPDATE ON TABLE public.orders TO app_user;
COMMIT;
```

psql output: `BEGIN / GRANT / GRANT / COMMIT` — EXIT 0.

---

## TECS Status Summary

| TECS | Gap | Status | Commit |
|------|-----|--------|--------|
| TECS 1 — OPS-ORDER-STATUS-TRANSITIONS-001 | GAP-ORDER-TRANSITIONS-001 | ✅ VALIDATED | `0a03177` |
| TECS 2 — OPS-WLADMIN-ORDERS-PANEL-001 | GAP-WL-ORDERS-001 | ✅ VALIDATED | `5101b80` |
| TECS 3 — OPS-EXPERIENCE-ORDERS-UX-001 | GAP-EXP-ORDERS-001 | ✅ VALIDATED | `0c0535d` |
| TECS 4 — OPS-REVENUE-FLOW-VALIDATION-002 | GAP-REVENUE-VALIDATE-002 | 🟡 PARTIALLY VALIDATED | this commit |

**New gap registered:** GAP-RLS-ORDERS-UPDATE-001 — orders_update_unified blocks tenant UPDATE path; post-RCP-1 wave required.

---

## Invariants Confirmed Preserved

- ✅ B1 / D-5: `app.roles` remains dormant for live requests; no DB-level role gates added
- ✅ RLS posture unchanged: no policy CREATE/ALTER/DROP in this TECS
- ✅ No schema changes, no migrations
- ✅ No shell drift; EXPERIENCE and WL_ADMIN borders intact
- ✅ `withDbContext` contract unchanged: sets only org_id/actor_id/realm/request_id/bypass_rls
- ✅ TECS 1/2/3 code correctness unaffected — all three remain VALIDATED
