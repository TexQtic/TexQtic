# TEXQTIC — GAP REGISTER

Last Updated: 2026-02-22 (G-005-BLOCKER VALIDATED; users RLS SELECT policy restored)
Doctrine Version: v1.4

---

## Status Legend

- NOT STARTED
- IN PROGRESS
- VALIDATED
- LOCKED

---

# WAVE 2 — Stabilization

## 🔴 Critical Path

| Gap ID | Description                                                                                           | Affected Files                                                      | Risk    | Status    | Commit  | Validation Proof                                                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-001  | **RLS policies check `app.tenant_id`; new routes set `app.org_id`** — policies do not fire            | `server/prisma/rls.sql`; `server/src/lib/database-context.ts`       | 🔴 High | VALIDATED | 1389ed7 | Step 1: 0 policies reference `app.tenant_id` · Step 2: 20 policies reference `app.org_id` · Step 3: cross-tenant 0 rows                              |
| G-002  | `FORCE ROW LEVEL SECURITY` missing on `carts`, `orders`, `order_items`, `catalog_items`, `cart_items` | `server/prisma/rls.sql`; `server/prisma/supabase_hardening.sql`     | 🔴 High | VALIDATED | 2d16e73 | All 13 tables: relrowsecurity=true, relforcerowsecurity=true · cross-tenant COUNT’s 0 · positive control passes                                      |
| G-003  | `orders` and `order_items` RLS policies absent from all SQL files                                     | `server/prisma/rls.sql`                                             | 🔴 High | VALIDATED | no-code | Live policies already correct: SELECT+INSERT+admin_all on both tables referencing `app.org_id` · cross-tenant COUNT 0                                |
| G-013  | CI cross-tenant 0-row proof not automated                                                             | `server/scripts/ci/rls-proof.ts`; `.github/workflows/rls-proof.yml` | 🟠 Med  | VALIDATED | 7f474ab | Step 1: 0 `app.tenant_id` policy refs · Step 2: Tenant A cross-tenant 0, own-count 2 · Step 3: Tenant B cross-tenant 0, own-count 0 · non-vacuous ✅ |

---

## 🟡 Stabilization

| Gap ID        | Description                                                                                                                                                                                                               | Affected Files                                                   | Risk    | Status      | Commit  | Validation Proof                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------- | ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G-004         | Two `withDbContext` implementations coexist; `control.ts` imports both                                                                                                                                                    | `server/src/routes/control.ts`; `server/src/db/withDbContext.ts` | 🟠 Med  | VALIDATED   | a19f30b | `withDbContextLegacy` import removed · `withAdminContext` helper added using canonical `withDbContext` + `app.is_admin = 'true'` · 13 call sites migrated · typecheck/lint EXIT 0                            |
| G-005-BLOCKER | **`public.users` has FORCE+ENABLE RLS but no SELECT policy for `texqtic_app`** — auth route returns AUTH_INVALID even for valid credentials; root cause: `users_tenant_read` dropped in G-001 cleanup with no replacement | `server/prisma/rls.sql`                                          | 🔴 High | VALIDATED   | b060f60 | Proof 1: `users_tenant_select` present in `pg_policies` with `app.org_id` + EXISTS-memberships qual · Proof 2: member read returns 1 row · Proof 3: cross-tenant read returns 0 rows · typecheck/lint EXIT 0 |
| G-005         | Middleware pattern inconsistent: some routes use `databaseContextMiddleware`; others build context inline                                                                                                                 | `server/src/routes/tenant.ts`                                    | 🟠 Med  | NOT STARTED | —       | All tenant routes use `[tenantAuthMiddleware, databaseContextMiddleware]`                                                                                                                                    |
| G-006         | Admin bypass pattern differs between old and new `withDbContext`                                                                                                                                                          | `server/prisma/rls.sql`; `server/src/lib/database-context.ts`    | 🟠 Med  | NOT STARTED | —       | Admin context sets correct session variable for bypass                                                                                                                                                       |
| G-007         | `supabase_hardening.sql` uses `set_config(..., false)` (session-global) — pooler bleed risk                                                                                                                               | `server/prisma/supabase_hardening.sql`                           | 🟠 Med  | NOT STARTED | —       | All `set_config` calls use `true` (transaction-local)                                                                                                                                                        |
| G-008         | `EventLog` schema missing `schema_version` and `reasoning_hash` FK                                                                                                                                                        | `server/prisma/schema.prisma`                                    | 🟡 Low  | NOT STARTED | —       | Prisma schema shows both fields; `pg_class` confirms columns                                                                                                                                                 |
| G-009         | `OP_PLATFORM_READ_ONLY`, `OP_AI_AUTOMATION_ENABLED` feature flag seeds absent                                                                                                                                             | `server/prisma/seed.ts`                                          | 🟡 Low  | NOT STARTED | —       | Seed runs; both flags present in `feature_flags` table                                                                                                                                                       |
| G-010         | Tax/fee computation is a stub                                                                                                                                                                                             | `server/src/routes/tenant.ts:631`                                | 🟡 Low  | NOT STARTED | —       | Checkout response includes non-zero tax field                                                                                                                                                                |
| G-011         | Impersonation session route not found in route files                                                                                                                                                                      | `server/src/routes/control.ts`                                   | 🟡 Low  | NOT STARTED | —       | POST/DELETE impersonation endpoints respond correctly                                                                                                                                                        |
| G-012         | Email notifications are stubs — no real delivery                                                                                                                                                                          | `server/src/lib/emailStubs.ts`                                   | 🟡 Low  | NOT STARTED | —       | Email provider integration test passes                                                                                                                                                                       |
| G-014         | `tenant/activate` POST has nested `tx.$transaction` inside `withDbContext` (double-transaction nesting)                                                                                                                   | `server/src/routes/tenant.ts`                                    | 🟠 Med  | NOT STARTED | —       | Activation flow works in single transaction; no nested tx                                                                                                                                                    |

---

# QUALITY GATE DEBT

> Policy: Wave work may proceed when **server gates pass** (`pnpm -C server run typecheck` + `pnpm -C server run lint`). Root `pnpm run lint` is deferred until G-QG-001 is resolved.

| Gap ID   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Wave             | Risk   | Status      | Commit | Validation Proof                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ | ----------- | ------ | -------------------------------------------------- |
| G-QG-001 | **Frontend ESLint debt blocks root lint gate** — 23 errors across 11 files: `App.tsx` (unused vars), `Auth/ForgotPassword.tsx` + `Auth/TokenHandler.tsx` + `Auth/VerifyEmail.tsx` (`React` not defined / unused vars), `Auth/AuthFlows.tsx` (unused var), `Cart/Cart.tsx` (unused vars), `ControlPlane/AuditLogs.tsx` + `ControlPlane/TenantRegistry.tsx` (unused vars), `ControlPlane/EventStream.tsx` (setState-in-effect), `constants.tsx` (unused imports), `services/apiClient.ts` (`AbortController` not defined) | Wave 3 / cleanup | 🟡 Low | NOT STARTED | —      | `pnpm run lint` exits 0 with no errors or warnings |

---

# WAVE 3 — Canonical Doctrine Buildout

| Gap ID | Description                                                                                          | Status      | Notes                                         |
| ------ | ---------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------- |
| G-015  | `organizations` table naming divergence; missing `org_type`, `risk_score`, `status=banned` invariant | NOT STARTED | Requires Prisma migration + SQL               |
| G-016  | `traceability_nodes` and `traceability_edges` tables — MISSING                                       | NOT STARTED | XL scope; supply chain graph                  |
| G-017  | `trades` table + `version_id` optimistic locking — MISSING                                           | NOT STARTED | XL scope; contractual commerce unit           |
| G-018  | `escrow_accounts` table — MISSING                                                                    | NOT STARTED | XL scope; requires trade FK                   |
| G-019  | `certifications` table — MISSING                                                                     | NOT STARTED | L scope; GOTS/OEKO-TEX/etc.                   |
| G-020  | State machine transition tables (trade, escrow, certification) — MISSING                             | NOT STARTED | XL scope; DB-level physical laws              |
| G-021  | Maker-Checker dual-signature enforcement — MISSING                                                   | NOT STARTED | XL scope; `maker_id != checker_id` constraint |
| G-022  | Escalation levels + Kill-switch mechanism — MISSING                                                  | NOT STARTED | L scope; Level 0–3 + Read-Only mode           |
| G-023  | `reasoning_hash` / `reasoning_logs` FK for AI events — MISSING                                       | NOT STARTED | M scope; AI explainability                    |
| G-024  | `sanctions` table — MISSING                                                                          | NOT STARTED | M scope                                       |

---

# WAVE 4 — Governance + Infrastructure

| Gap ID | Description                                                         | Status      | Notes                                      |
| ------ | ------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| G-025  | DPP snapshot views (`dpp_product_passport`) — MISSING               | NOT STARTED | XL scope; regulator-facing read models     |
| G-026  | Custom domain routing / tenant resolution (white-label) — stub only | NOT STARTED | L scope; edge runtime + Prisma constraints |
| G-027  | The Morgue (Level 1+ failure event bundles) — MISSING               | NOT STARTED | L scope; post-mortem + regulator review    |
| G-028  | Insight caching / vector store / inference separation for AI        | NOT STARTED | XL scope; future AI infrastructure         |

---

# Future Waves (5+)

| Proposed Gap                           | Rationale                              | Assigned Wave |
| -------------------------------------- | -------------------------------------- | ------------- |
| DPP export signature bundles           | Regulator-facing export with audit URI | W4+           |
| Multi-region tenant routing            | Geographic isolation for compliance    | W5            |
| AI model drift detection + auto-freeze | Safety boundary for AI automation      | W5            |
| Real-time event streaming (WebSocket)  | Live audit feed for control plane      | W5            |
