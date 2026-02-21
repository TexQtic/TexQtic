# TEXQTIC — GAP REGISTER

Last Updated: 2026-02-21 (G-001 + G-002 VALIDATED)
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

| Gap ID | Description                                                                                           | Affected Files                                                  | Risk    | Status      | Commit  | Validation Proof                                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------- | ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| G-001  | **RLS policies check `app.tenant_id`; new routes set `app.org_id`** — policies do not fire            | `server/prisma/rls.sql`; `server/src/lib/database-context.ts`   | 🔴 High | VALIDATED   | 1389ed7 | Step 1: 0 policies reference `app.tenant_id` · Step 2: 20 policies reference `app.org_id` · Step 3: cross-tenant 0 rows |
| G-002  | `FORCE ROW LEVEL SECURITY` missing on `carts`, `orders`, `order_items`, `catalog_items`, `cart_items` | `server/prisma/rls.sql`; `server/prisma/supabase_hardening.sql` | 🔴 High | VALIDATED   | 2d16e73 | All 13 tables: relrowsecurity=true, relforcerowsecurity=true · cross-tenant COUNT’s 0 · positive control passes |
| G-003  | `orders` and `order_items` RLS policies absent from all SQL files                                     | `server/prisma/rls.sql`                                         | 🔴 High | NOT STARTED | —       | `pg_policies` shows SELECT + INSERT policies for both tables                                                            |
| G-013  | CI cross-tenant 0-row proof not automated                                                             | `server/prisma/verify-rls-data.ts`; CI config                   | 🟠 Med  | NOT STARTED | —       | Test suite runs 0-row assertion against Supabase on PR                                                                  |

---

## 🟡 Stabilization

| Gap ID | Description                                                                                               | Affected Files                                                   | Risk   | Status      | Commit | Validation Proof                                                          |
| ------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ | ----------- | ------ | ------------------------------------------------------------------------- |
| G-004  | Two `withDbContext` implementations coexist; `control.ts` imports both                                    | `server/src/routes/control.ts`; `server/src/db/withDbContext.ts` | 🟠 Med | NOT STARTED | —      | `grep -r "withDbContextLegacy"` returns no results                        |
| G-005  | Middleware pattern inconsistent: some routes use `databaseContextMiddleware`; others build context inline | `server/src/routes/tenant.ts`                                    | 🟠 Med | NOT STARTED | —      | All tenant routes use `[tenantAuthMiddleware, databaseContextMiddleware]` |
| G-006  | Admin bypass pattern differs between old and new `withDbContext`                                          | `server/prisma/rls.sql`; `server/src/lib/database-context.ts`    | 🟠 Med | NOT STARTED | —      | Admin context sets correct session variable for bypass                    |
| G-007  | `supabase_hardening.sql` uses `set_config(..., false)` (session-global) — pooler bleed risk               | `server/prisma/supabase_hardening.sql`                           | 🟠 Med | NOT STARTED | —      | All `set_config` calls use `true` (transaction-local)                     |
| G-008  | `EventLog` schema missing `schema_version` and `reasoning_hash` FK                                        | `server/prisma/schema.prisma`                                    | 🟡 Low | NOT STARTED | —      | Prisma schema shows both fields; `pg_class` confirms columns              |
| G-009  | `OP_PLATFORM_READ_ONLY`, `OP_AI_AUTOMATION_ENABLED` feature flag seeds absent                             | `server/prisma/seed.ts`                                          | 🟡 Low | NOT STARTED | —      | Seed runs; both flags present in `feature_flags` table                    |
| G-010  | Tax/fee computation is a stub                                                                             | `server/src/routes/tenant.ts:631`                                | 🟡 Low | NOT STARTED | —      | Checkout response includes non-zero tax field                             |
| G-011  | Impersonation session route not found in route files                                                      | `server/src/routes/control.ts`                                   | 🟡 Low | NOT STARTED | —      | POST/DELETE impersonation endpoints respond correctly                     |
| G-012  | Email notifications are stubs — no real delivery                                                          | `server/src/lib/emailStubs.ts`                                   | 🟡 Low | NOT STARTED | —      | Email provider integration test passes                                    |
| G-014  | `tenant/activate` POST has nested `tx.$transaction` inside `withDbContext` (double-transaction nesting)   | `server/src/routes/tenant.ts`                                    | 🟠 Med | NOT STARTED | —      | Activation flow works in single transaction; no nested tx                 |

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
