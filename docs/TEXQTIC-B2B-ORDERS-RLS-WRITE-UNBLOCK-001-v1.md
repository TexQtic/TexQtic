# TEXQTIC-B2B-ORDERS-RLS-WRITE-UNBLOCK-001-v1

**Unit ID:** ORDERS-RLS-WRITE-UNBLOCK-001  
**TECS ID:** OPS-RLS-ORDERS-UPDATE-001  
**Gap:** GAP-RLS-ORDERS-UPDATE-001  
**Type:** DB-layer ops fix — RLS policy extension  
**Mode:** IMPLEMENTATION — MINIMAL-DIFF, SQL-ONLY  
**Date applied:** 2026-04-23  
**Status:** VERIFIED

---

## 1. Purpose

Unblock tenant-side order lifecycle writes by extending the `orders_update_unified` RLS policy
on `public.orders` to include a tenant-scoped UPDATE arm. This resolves the single P0 blocker
identified in `docs/TEXQTIC-B2B-ORDERS-INVESTIGATION-v1.md`.

---

## 2. Scope

**In scope:**
- SQL ops fix: extend `orders_update_unified` policy with tenant arm on `public.orders`
- Verification: `pg_policies` query confirming both arms present in USING and WITH CHECK

**Not in scope** (explicit exclusions — see §10):
- App code, route logic, state machine changes
- Prisma migrations
- OpenAPI contract sync
- Order pagination
- Service-layer extraction
- Settlement, escrow, payment gateway
- Supplier visibility into orders

---

## 3. Source Artifacts Reviewed

- `docs/TEXQTIC-B2B-ORDERS-INVESTIGATION-v1.md` — B2B Orders investigation (commit `6e8b609`)
- `docs/rcp1/OPS-REVENUE-FLOW-VALIDATION-002.md` — Phase 4 validation results confirming PATCH routes blocked (P2025)
- `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql` — SQL ops file (authored 2026-03-03, committed in prior wave)
- `server/prisma/ops/rcp1_orders_update_grant.sql` — GRANT UPDATE already applied in RCP-1 wave
- `server/src/routes/tenant.ts` — PATCH route logic confirmed correct at application layer
- `governance/control/NEXT-ACTION.md` — HOLD-FOR-BOUNDARY-TIGHTENING, ZERO_OPEN_DECISION_CONTROL confirmed
- `TECS.md` — static gate requirements (typecheck + lint), gap lifecycle

---

## 4. Confirmed Root Cause

<!-- CONFIRMED REPO TRUTH -->

The `orders_update_unified` RLS policy on `public.orders` previously authorized UPDATE only via
the admin arm:

```sql
current_setting('app.is_admin'::text, true) = 'true'::text
```

`withDbContext` sets `app.org_id`, `app.actor_id`, `app.realm`, `app.request_id`, and
`app.bypass_rls=off` for tenant actors. It intentionally does **NOT** set `app.is_admin` (D-5/B1
constitutional design).

Result: tenant actors could **SELECT** orders (`orders_select_unified` has a correct tenant arm),
but all UPDATE operations silently found no matching rows under RLS, causing Prisma to return
`P2025` ("Record to update not found") — surfaced as HTTP 500 on `PATCH /api/tenant/orders/:id/status`.

The GRANT `UPDATE ON TABLE public.orders TO texqtic_app` was already in place
(`rcp1_orders_update_grant.sql`) — the missing piece was the RLS USING/WITH CHECK tenant arm.

**Evidence from OPS-REVENUE-FLOW-VALIDATION-002.md Phase 4:**
- `PATCH /api/tenant/orders/:id/status` → `CONFIRMED`: HTTP 500, Prisma P2025
- `PATCH /api/tenant/orders/:id/status` → `CANCELLED`: HTTP 500, Prisma P2025
- `PATCH /api/tenant/orders/:id/status` → `FULFILLED` from `PAYMENT_PENDING`: HTTP 409 (SM guard
  correctly rejects — this was NOT blocked by RLS, the state machine guard fired first) ✅
- `GET /api/tenant/orders` → HTTP 200, records visible ✅ (SELECT arm was correct)

---

## 5. SQL Policy Before

Policy `orders_update_unified` on `public.orders` prior to fix (admin arm only — no tenant arm):

```sql
CREATE POLICY orders_update_unified ON public.orders
  AS PERMISSIVE FOR UPDATE TO texqtic_app
  USING (
    (current_setting('app.is_admin'::text, true) = 'true'::text)
  )
  WITH CHECK (
    (current_setting('app.is_admin'::text, true) = 'true'::text)
  );
```

---

## 6. SQL Policy After

<!-- IMPLEMENTED IN THIS UNIT -->

Policy `orders_update_unified` on `public.orders` after fix (tenant arm + admin arm):

```sql
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

**Ops file:** `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql`  
(authored 2026-03-03; committed in prior wave; applied to live DB before or during this unit)

---

## 7. Why No Migration Is Required

RLS policies are **not tracked by Prisma migrations**. They are applied directly to the database
and are invisible to `prisma migrate`. Applying this SQL ops file:
- Does not change any table schema, column types, or indexes
- Does not affect Prisma's schema introspection
- Is confirmed by `prisma db pull` returning clean (no drift) after application

`prisma db pull` output after application: **no schema changes detected**.

---

## 8. Verification

<!-- VERIFIED -->

### 8.1 Pre-apply state query

Query executed on live DB via psql interactive session (connection via `server/.env` DATABASE_URL):

```sql
SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname='public'
    AND tablename='orders'
    AND policyname='orders_update_unified';
```

**Result (post-apply state — already correct at session start):**

```
      policyname       |  cmd   | qual                                                                                                                                   | with_check
-----------------------+--------+----------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------
 orders_update_unified | UPDATE | ((app.require_org_context() AND (tenant_id = app.current_org_id())) OR (current_setting('app.is_admin'::text, true) = 'true'::text)) | ((app.require_org_context() AND (tenant_id = app.current_org_id())) OR (current_setting('app.is_admin'::text, true) = 'true'::text))
(1 row)
```

USING and WITH CHECK both contain `require_org_context` (tenant arm) AND `is_admin` (admin arm).

### 8.2 Prisma db pull

```
pnpm exec prisma db pull
```

Output: `Run prisma generate to generate Prisma Client.` — standard clean completion.  
No schema drift. No model changes required.

### 8.3 Static gates

```
pnpm run typecheck
```

Result: 6 pre-existing errors in `src/routes/tenant.ts` (2), `src/services/tenantProvision.service.test.ts` (1),
`src/types/tenantProvision.types.ts` (3). **Zero new errors introduced by this unit** (no TypeScript
files were modified). All errors exist in the baseline prior to this unit.

```
pnpm run lint
```

Result: **0 errors**, 164 pre-existing warnings. Zero new errors introduced by this unit.

---

## 9. Expected Functional Outcome

After this fix, tenant actors (with `OWNER` or `ADMIN` role as enforced by the application-layer
PATCH route guard) can successfully execute lifecycle transitions:

| Transition | Before Fix | After Fix |
|---|---|---|
| `PAYMENT_PENDING` → `CONFIRMED` | HTTP 500, P2025 | HTTP 200 |
| `CONFIRMED` → `FULFILLED` | HTTP 500, P2025 | HTTP 200 |
| `PAYMENT_PENDING` → `CANCELLED` | HTTP 500, P2025 | HTTP 200 |
| `PAYMENT_PENDING` → `FULFILLED` (invalid SM transition) | HTTP 409 (SM guard) | HTTP 409 (unchanged) |
| `GET /api/tenant/orders` (SELECT) | HTTP 200 (unchanged) | HTTP 200 (unchanged) |

Application-layer role gate (`OWNER`/`ADMIN` check in PATCH handler) remains the primary
authorization boundary. `MEMBER` role still receives HTTP 403 before RLS is evaluated.

---

## 10. Explicit Exclusions from Scope

The following items were identified in the investigation but are explicitly **OUT OF SCOPE** for
this unit:

- **Order pagination** — no pagination concern in this unit; the investigation noted cursor-based
  pagination as a future improvement, not a P0 blocker
- **OpenAPI contract sync** — `PATCH /api/tenant/orders/:id/status` response schema has minor
  drift; this is a separate future unit
- **Service-layer extraction** — PATCH route business logic is inlined in `tenant.ts`; extraction
  is a separate refactor concern
- **Settlement and escrow finalization** — FULFILLED→settlement flow is a separate future unit
- **Supplier visibility into orders** — B2B supplier `GET /api/tenant/orders` scope is a
  separate future unit
- **Payment gateway** — out of scope for this platform layer
- **App code changes** — no route, middleware, or service code was modified by this unit

---

## 11. Follow-On Units That Remain Separate

The following gaps identified in the investigation remain open and require separate authorized units:

| Gap ID | Description |
|---|---|
| `GAP-ORDERS-OPENAPI-SYNC-001` | `PATCH /api/tenant/orders/:id/status` response schema drift from OpenAPI contract |
| `GAP-ORDERS-PAGINATION-001` | Orders list endpoint missing cursor-based pagination |
| `GAP-ORDERS-SERVICE-EXTRACT-001` | PATCH handler business logic inlined in `tenant.ts` (service-layer extraction) |
| `GAP-ORDERS-SUPPLIER-VISIBILITY-001` | Supplier-scoped order visibility (B2B multi-party) |
| `GAP-ORDERS-SETTLEMENT-001` | FULFILLED → settlement/escrow finalization flow |

These remain OPEN in the gap register and require fresh authorized units before implementation.
