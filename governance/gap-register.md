# TEXQTIC — GAP REGISTER

Last Updated: 2026-03-02 (GOVERNANCE-SYNC-044 — OPS-REVENUE-FLOW-VALIDATION-002: GAP-REVENUE-VALIDATE-002 → 🟡 PARTIALLY VALIDATED (TECS 4 — Phases 0–3 PASS: DB/JWT, catalog create, cart→checkout→PAYMENT_PENDING, orders list + audit; Phases 4–5 BLOCKED by GAP-RLS-ORDERS-UPDATE-001 — orders_update_unified RLS policy requires app.is_admin=true; withDbContext does not set app.is_admin for tenant actors; no RLS changes in RCP-1; privilege grant GRANT UPDATE ON public.orders TO texqtic_app/app_user applied; script + evidence report committed))
(GOVERNANCE-SYNC-043 — OPS-EXPERIENCE-ORDERS-UX-001: GAP-EXP-ORDERS-001 → VALIDATED (TECS 3 complete — EXPOrdersPanel created; expView state + onNavigateOrders threaded through all four EXPERIENCE shells; canonical RCP-1 derived-status algorithm; same Promise.all(orders+audit-logs) pattern; typecheck EXIT 0; 0 new lint errors; no backend/schema/RLS/shell-merge changes))
(GOVERNANCE-SYNC-042 — OPS-WLADMIN-ORDERS-PANEL-001: GAP-ORDER-TRANSITIONS-001 → VALIDATED (TECS 1 complete, commit 0a03177); GAP-WL-ORDERS-001 → VALIDATED (TECS 2 complete — WLOrdersPanel created; App.tsx ORDERS case wired; typecheck EXIT 0; 0 new lint errors); no backend/schema/RLS/shell-merge changes)
(GOVERNANCE-SYNC-041 — OPS-RCP1-GAP-RECONCILIATION-001: RCP-1 anchored as PLANNED roadmap; 5 new gap entries registered (GAP-ORDER-LC-001, GAP-ORDER-TRANSITIONS-001, GAP-WL-ORDERS-001, GAP-EXP-ORDERS-001, GAP-REVENUE-VALIDATE-002); GAP-RUV-006 schema re-entry linked to GAP-ORDER-LC-001; drift analysis recorded; no implementation begun; B1/D-5/control-plane posture affirmed unchanged)
(GOVERNANCE-SYNC-040 — OPS-WLADMIN-PRODUCTS-MVP-001: G-WL-ADMIN Products panel VALIDATED — real catalog list + create form replacing WLStubPanel; catalog fetch useEffect extended to WL_ADMIN; commit 6a7bf41 · typecheck EXIT 0 · 0 new lint errors · App.tsx only)
(GOVERNANCE-SYNC-039 — OPS-ORDER-LIFECYCLE-AUDIT-001: GAP-RUV-006 PARTIAL — lifecycle audit trail added via audit_logs; G-020 ORDER blocked by DB CHECK constraint; commit 5e13fe5 · typecheck EXIT 0 · lint EXIT 0 · 1 file only)
(GOVERNANCE-SYNC-038 — OPS-ACTIVATE-JWT-FIX-001: GAP-RUV-001 invite URL action=invite param VALIDATED · GAP-RUV-002 /activate JWT issuance VALIDATED · GAP-RUV-003 tenant.type from response VALIDATED · GAP-RUV-005 industry onChange wired VALIDATED · commit 43ef9c6 · typecheck EXIT 0 (frontend + backend) · lint EXIT 0 · 4 files only)
(GOVERNANCE-SYNC-037 — OPS-REVENUE-UNBLOCK-IMPLEMENTATION-001: RU-001 invite activation wiring VALIDATED · RU-002 provision UI enablement VALIDATED · RU-003 catalog create API+service+frontend VALIDATED · S1 end-to-end happy path A–F confirmed · 5 commits: 3923069 fc66637 5d4c3bf 2cda383 739f6d8 · typecheck EXIT 0 (frontend + backend) · lint EXIT 0 · no schema/RLS/auth changes)
(GOVERNANCE-SYNC-036 — OPS-TENANT-ROLE-DIFFERENTIATION-B1-RECORD-001: D-5 resolved by architectural decision B1; DB role-agnostic by design; `app.roles` intentionally dormant for live requests; role enforcement remains app-layer only; no code changes; no migrations; no RLS changes; single governance commit)
(GOVERNANCE-SYNC-035 — OPS-CONTROL-HARDENING-PHASE-2-001 VALIDATED: control-plane CI guardrails implemented; `scripts/control-plane-manifest.ts` + `scripts/control-plane-guard.ts` added; `.github/workflows/control-plane-guard.yml` added; `package.json` scripts `control:manifest` + `control:guard` added; guard EXIT 0 on main: 37 routes scanned, 17 mutations checked, 0 audit violations, 8/8 SUPER_ADMIN surfaces gated; artifact `artifacts/control-plane-manifest.json` emitted; no runtime changes; no DB changes; no migrations; no RLS changes; 2 atomic commits)
(GOVERNANCE-SYNC-032 — OPS-CONTROL-READ-AUDIT-001 VALIDATED: 14 control-plane GET route handlers now emit exactly one `writeAuditLog` read-audit entry on 200 success; action strings follow `control.<domain>.read[_one]` convention; `ADMIN` realm, `actor_type=ADMIN`; Sim A: 2 audit rows confirmed in DB; Sims B+C: 0 rows on rejected auth; typecheck EXIT 0; no SQL changes; no migrations; 2 atomic commits)
(GOVERNANCE-SYNC-030 — G006C-ORDERS-GUARD-001 VALIDATED: orders + order_items RESTRICTIVE guard added; role normalized {public} → texqtic_app; DO block VERIFIER PASS; 3 RLS sims PASS; Prisma ledger synced; migration `20260302000000_g006c_orders_guard_normalize`; admin arm preserved as current_setting('app.is_admin') — NOT replaced by bypass_enabled() per Gate 1 investigation)
(GOVERNANCE-SYNC-021 — G-020 Runtime Enforcement Atomicity CLOSED; two-phase atomicity gap eliminated: SM lifecycle log INSERT + entity state UPDATE now share a single Prisma $transaction; opts.db shared-tx pattern added to StateMachineService.transition(); TradeService + EscrowService wired; dead CERTIFICATION APPLIED branch removed; atomicity regression tests T-15 + E-09 added; typecheck EXIT 0, lint 0 errors, 44/44 tests pass; impl commit 61d1a96)
(GOVERNANCE-SYNC-015 — G-017 Day4 Pending Approvals FK Hardening DB Applied (env: Supabase dev); migration `20260307000000_g017_day4_pending_approvals_trade_fk_hardening` applied via psql (with parse-safe patch to adjacent-literal RAISE NOTICE); function `g017_enforce_pending_approvals_trade_entity_fk` + trigger `trg_g017_pending_approvals_trade_entity_fk` (BEFORE INSERT OR UPDATE ON pending_approvals, SECURITY DEFINER, tgenabled=O) both confirmed present; DO block 5-check VERIFY PASS; Prisma ledger synced via resolve --applied; migration file also patched for parse-safety (impl commit `bdb9ab7`); pending after: 5 migrations)
(GOVERNANCE-SYNC-014 — G-020 DB Applied (ledger-sync only; all objects confirmed in DB out-of-band); migration `20260301000000_g020_lifecycle_state_machine_core`; 4 tables + 1 function + 2 triggers verified present; FORCE RLS t/t on all 4 tables; 14 RLS policies; key constraints verified; row counts 0 (vacuous); Prisma ledger synced via resolve --applied; also ledger-synced gw3_db_roles_bootstrap (20260212) in same sync; pending after: 6 migrations; C: g017_day4_trigger_hardening absent from DB — separate TECS needed)
(GOVERNANCE-SYNC-013 — G-018 cycle-fix migration file repaired (parse-safe); migration file `20260308010000_g018_day1_escrow_schema_cycle_fix/migration.sql` patched: 2 RAISE NOTICE adjacent-string-literal PL/pgSQL syntax errors fixed + non-ASCII chars replaced with ASCII equivalents; no operational SQL change; psql parse proof: COMMIT + PASS notice (no ERROR); impl commit `98eb08d`)
(GOVERNANCE-SYNC-012 — G-018 Cycle Fix DB Applied; migration `20260308010000_g018_day1_escrow_schema_cycle_fix` applied via psql to Supabase dev; `escrow_accounts.trade_id` column + 2 indexes dropped (circular FK eliminated); `trades.escrow_id → escrow_accounts.id` canonical FK preserved and verified; Prisma ledger synced via resolve --applied; migration file note: pre-flight DO block has PL/pgSQL adjacent-string-literal syntax error in non-executed branch — operational SQL applied manually via psql -c with identical effect)
(GOVERNANCE-SYNC-011 — G-018 Day 1 DB Applied; migration `20260308000000_g018_day1_escrow_schema` applied via psql to Supabase dev; impl commit `7c1d3a3`; §16 PASS notice; pg_policies: escrow_accounts 3 rows, escrow_transactions 5 rows (incl. no_update/no_delete deny); FORCE RLS: t/t on both tables; FKs verified: trades_escrow_id_fk ON DELETE RESTRICT, escrow_lifecycle_logs_escrow_id_fk ON DELETE CASCADE; data: 0 rows; Prisma ledger synced via resolve --applied)
(GOVERNANCE-SYNC-010 — G-007C VALIDATED — `/api/me` explicit errors + frontend stub tenant + amber banner prevents infinite spinner; backend commit `be66f41`; frontend commit `7bacd80`; governance-only commit; no migration, no RLS change)
(GOVERNANCE-SYNC-009 — G-016 traceability graph Phase A CLOSED; migration `20260312000000_g016_traceability_graph_phase_a`: public.traceability_nodes + public.traceability_edges; 5 RLS policies each (RESTRICTIVE guard incl. is_admin, PERMISSIVE tenant_select/insert/update, admin_select); applied via psql EXIT:0; DO block PASS on both tables; Prisma ledger synced; impl commit `44ab6d6`; typecheck EXIT 0, lint 0 errors/92 warnings; G-016 Phase A CLOSED)
(GOVERNANCE-SYNC-008 — G-019 certifications domain CLOSED; migration `20260311000000_g019_certifications_domain`: public.certifications table + 5 RLS policies (RESTRICTIVE guard incl. is_admin, PERMISSIVE tenant_select/insert/update, admin_select); applied via psql EXIT:0; DO block PASS; Prisma ledger synced; impl commit `3c7dae7`; typecheck EXIT 0, lint 0 errors/92 warnings; G-019 CLOSED)
(GOVERNANCE-SYNC-005 — G-017 FK Hardening CLOSED; migration `20260309000000_g017_fk_buyer_seller_orgs` adds `fk_trades_buyer_org_id` + `fk_trades_seller_org_id` FK constraints (ON DELETE RESTRICT) with embedded preflight DO block; schema.prisma updated with `buyerOrg`/`sellerOrg` Prisma relations + `tradesBuyer[]`/`tradesSeller[]` back-refs on organizations; impl commit `8069d48`; typecheck EXIT 0, lint 0 errors/92 warnings; G-017 ⚠️ CAVEAT CLOSED)
(GOVERNANCE-SYNC-004 — G-015 Phase C CLOSED via Option C admin-context; `withOrgAdminContext` + `getOrganizationIdentity` implemented in `database-context.ts`; GET /me + invite-email wired; no RLS change; no migration; commit `790d0e6`; gap-register G-015 row updated to VALIDATED; GOVERNANCE-SYNC-003 also on this date — G-019 label-misuse fix recorded; `settlement.g019.ts` renamed to `settlement.ts` (tenant + control planes), impl commit `6e94a9a`; gap-register G-019 row updated to reflect fix)
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

| Gap ID           | Description                                                                                                                                                                                                                                                                                                | Affected Files                                                   | Risk    | Status      | Commit                     | Validation Proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------- | ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-004            | Two `withDbContext` implementations coexist; `control.ts` imports both                                                                                                                                                                                                                                     | `server/src/routes/control.ts`; `server/src/db/withDbContext.ts` | 🟠 Med  | VALIDATED   | a19f30b                    | `withDbContextLegacy` import removed · `withAdminContext` helper added using canonical `withDbContext` + `app.is_admin = 'true'` · 13 call sites migrated · typecheck/lint EXIT 0                                                                                                                                                                                                                                                                                                                                                                                                           |
| G-005-BLOCKER    | **`public.users` has FORCE+ENABLE RLS but no SELECT policy for `texqtic_app`** — auth route returns AUTH_INVALID even for valid credentials; root cause: `users_tenant_read` dropped in G-001 cleanup with no replacement                                                                                  | `server/prisma/rls.sql`                                          | 🔴 High | VALIDATED   | b060f60                    | Proof 1: `users_tenant_select` present in `pg_policies` with `app.org_id` + EXISTS-memberships qual · Proof 2: member read returns 1 row · Proof 3: cross-tenant read returns 0 rows · typecheck/lint EXIT 0                                                                                                                                                                                                                                                                                                                                                                                |
| G-TENANTS-SELECT | **`public.tenants` has `tenants_deny_all` (FOR ALL/false) but no SELECT for `app_user`** — Prisma nested select `membership.tenant` resolves `null` under FORCE RLS → `membership.tenant.status` TypeError → 500 INTERNAL_ERROR; code path reached for first time after G-005-BLOCKER unblocked user reads | `server/prisma/rls.sql`                                          | 🔴 High | VALIDATED   | 94da295                    | A: `tenants_app_user_select` in pg_policies (SELECT, `id::text = app.org_id`) · B: cross-tenant 0 rows · C: ACME org 1 row ACTIVE · D: `set_tenant_context` login path 1 row ACTIVE · `tenants_deny_all` intact · typecheck/lint EXIT 0                                                                                                                                                                                                                                                                                                                                                     |
| G-005            | Middleware pattern inconsistent: some routes use `databaseContextMiddleware`; others build context inline                                                                                                                                                                                                  | `server/src/routes/tenant.ts`, `server/src/routes/ai.ts`         | 🟠 Med  | VALIDATED   | 830c0c4                    | 10 routes migrated: POST/GET /tenant/cart, POST /tenant/cart/items, PATCH /tenant/cart/items/:id, POST /tenant/checkout, GET /tenant/orders, GET /tenant/orders/:id, PUT /tenant/branding, GET /insights, POST /negotiation-advice · 2 exclusions justified: /tenant/activate (invite-manual), GET /me (non-tenant-scoped) · buildContextFromRequest import removed · typecheck EXIT 0 · lint 68w/0e · local runtime: 0 × 500, 0 × context-missing (10/10 routes) · prod smoke: cart 200, orders 200 count=2, insights 200 · No new 500s · Auth context preserved · RLS isolation unchanged |
| G-006            | Admin bypass pattern differs between old and new `withDbContext` — **scoped to auth.ts only**; resolved via Option B: direct `prisma.adminUser.findUnique()` for pre-auth admin lookup (no role switch; `admin_users` is not tenant-scoped)                                                                 | `server/src/routes/auth.ts`                                      | 🟠 Med  | VALIDATED   | `4971731`                  | Option B applied: `auth.ts` lines 438+653 replaced with direct `prisma.adminUser.findUnique()` (no `withDbContext`, no role switch) · lines 166+889 deferred → G-006D · `admin-cart-summaries.ts` deferred → G-006C · typecheck EXIT 0 · lint EXIT 0 (68w/0e) · T1 admin login 200 ✅ · T2 control route 200 ✅ · T3 tenant login 200 ✅ · T4 tenant orders 200 ✅ · 0 regressions · No `SET LOCAL ROLE texqtic_app` emitted (PG-42501 path eliminated) |
| G-006C           | Remove remaining legacy `withDbContext({ isAdmin: true }, …)` in control-plane routes — `admin-cart-summaries.ts` lines 52 + 140                                                                                                                                                                           | `server/src/routes/admin-cart-summaries.ts`; `server/src/lib/database-context.ts`; `server/prisma/migrations/20260314000000_g006c_admin_cart_summaries_admin_rls/migration.sql` | 🟠 Med  | VALIDATED   | `6f673ad`                  | `withAdminContext(prismaClient, callback)` + `ADMIN_SENTINEL_ID` exported from `database-context.ts`; both `withDbContext({ isAdmin: true }, async () =>` call sites replaced with `withAdminContext(prisma, async tx =>`; all `prisma.marketplaceCartSummary.*` inside callbacks replaced with `tx.*`; legacy `import { withDbContext }` removed from `admin-cart-summaries.ts`; migration `20260314000000_g006c_admin_cart_summaries_admin_rls` adds PERMISSIVE SELECT `admin_select` (USING is_admin='true') + extends `restrictive_guard` with admin arm + DO block VERIFY PASS; typecheck EXIT 0; lint EXIT 0 (0 errors / 104 warnings, all pre-existing). Migration DB application: pending psql apply to Supabase dev. No other tables touched. |
| G-006D           | Remove legacy `withDbContext({ tenantId }, …)` 2-arg usage in tenant auth path — `auth.ts` lines 166, 889                                                                                                                                                                                                  | `server/src/routes/auth.ts`; `server/src/lib/database-context.ts` | 🟡 Low  | VALIDATED   | `56c0387`                  | `withLoginContext(prismaClient, tenantId, callback)` + `LOGIN_SENTINEL_ACTOR` sentinel exported from `database-context.ts`; both 2-arg `withDbContext({ tenantId }, …)` call sites in `auth.ts` replaced; `where: { tenantId }` added to memberships in unified `/login` endpoint (latent filter gap closed); legacy `import { withDbContext } from '../db/withDbContext.js'` removed from `auth.ts`; typecheck EXIT 0; lint EXIT 0 (0 errors / 103 warnings, all pre-existing). No migrations. No RLS changes. |
| G-007 + G-007B   | `supabase_hardening.sql` uses `set_config(..., false)` (session-global) — pooler bleed risk; fixed to `is_local=true`; G-007-HOTFIX restores `app.org_id` canonical RLS key (Doctrine v1.4); **G-007B: repo reconcile — all Part 5+6 tenant-scoped-table policies updated `app.tenant_id` → `app.org_id` (anti-regression proof; prevents standalone-apply login failure)** | `server/prisma/supabase_hardening.sql`                           | 🟠 Med  | VALIDATED   | 09365b2 + 80d4501 + 80a6971 | 6 `false`→`true` (G-007 `09365b2`) · G-007-HOTFIX (`80d4501`): `set_tenant_context` was setting `app.tenant_id` but RLS policies read `app.org_id` (Doctrine v1.4 canonical key) → tenant login invisible rows → AUTH_INVALID in prod · Hotfix sets `app.org_id`, clears `app.tenant_id` defensively, `clear_context` also clears `app.org_id` · tx-local (`is_local=true`) preserved throughout · DB applied + pg_get_functiondef confirmed `app.org_id` present · **G-007B (`80a6971`): repo reconcile — Part 5 policies (8 tenant-scoped tables) + Part 6 audit_logs policies: all `app.tenant_id` → `app.org_id`; Doctrine v1.4 comment header added; pooler-bleed prevention note added; typecheck EXIT 0; lint EXIT 0** |
| G-007C           | **/api/me silent `tenant=null` caused infinite "Loading workspace…" spinner** — `OrganizationNotFoundError` and missing `tenantId` in JWT silently returned `tenant: null`; frontend `handleAuthSuccess` never seeded `tenants[]`; `currentTenant` remained null → infinite spinner. Fix: backend returns explicit 401 (missing tenantId) / 404 (org not provisioned); frontend seeds stub `Tenant` into `tenants[]` on any failure path + shows amber "Tenant not provisioned yet" banner on 404. **Deps / Caused-by:** frontend assumes `tenants[]` seeded from `/api/me`; backend previously swallowed `OrganizationNotFoundError` silently → `tenant: null`. **Follow-on:** G-WL-TYPE-MISMATCH (NOT STARTED) — WL tenant stub defaults `type: 'B2B'`; may render wrong shell if org unprovisioned. | `server/src/routes/tenant.ts` (/api/me handler) · `App.tsx` (handleAuthSuccess + EXPERIENCE render) | 🟠 Med  | VALIDATED   | `be66f41` + `7bacd80` | ACME login → workspace loads ✅; WL login → workspace loads ✅; org NOT yet provisioned → EXPERIENCE renders + amber banner (dismissible) ✅; no infinite spinner on any auth path ✅; `currentTenant` always non-null after login ✅ |
| G-008            | Canonical provisioning endpoint missing under `/api/control`; `EventLog` `schema_version`/`reasoning_hash` column alignment verified | `server/src/services/tenantProvision.service.ts` (canonical) | 🟡 Low  | VALIDATED   | `1eb5a46` + `009150d`      | Provisioning endpoint under `/api/control/tenants/provision`; realm guard enforced; GR-007 proof executed 2026-02-22T18:30:18Z: 5 PASS + 1 Conditional PASS                                                         |
| G-009            | `OP_PLATFORM_READ_ONLY`, `OP_AI_AUTOMATION_ENABLED` feature flag seeds absent                                                                                                                                                                                                                              | `server/prisma/seed.ts`                                          | 🟡 Low  | VALIDATED   | `380fde7`                          | Seed runs; both flags present in `feature_flags` table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| G-010            | Tax/fee computation is a stub                                                                                                                                                                                                                                                                              | `server/src/services/pricing/totals.service.ts` (NEW) + `server/src/routes/tenant.ts` | 🟡 Low  | VALIDATED   | `39f0720`                  | Checkout returns deterministic totals object: subtotal, discountTotal=0, taxTotal=0, feeTotal=0, grandTotal; stop-loss throws TotalsInputError on invalid inputs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| G-011            | Impersonation session route not found in route files                                                                                                                                                                                                                                                       | `server/src/routes/admin/impersonation.ts` (NEW)                 | 🟡 Low  | VALIDATED   | `3860447`                  | POST /start (201 + token), POST /stop (200 + endedAt), GET /status/:id; negatives: tenant JWT → 401, missing reason → 400, non-member userId → 404                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| G-012            | Email notifications are stubs — no real delivery                                                                                                                                                                                                                                                           | `server/src/services/email/email.service.ts` (NEW) + `server/src/routes/auth.ts` + `server/src/routes/tenant.ts` | 🟡 Low  | VALIDATED   | `1fe96e1`                  | Dev/test: EMAIL_DEV_LOG console JSON; prod+SMTP: real nodemailer send; prod-no-SMTP: EMAIL_SMTP_UNCONFIGURED warn; stop-loss: EmailValidationError on bad inputs; invite email fire-and-forget in tenant route |
| G-014            | `tenant/activate` POST has nested `tx.$transaction` inside `withDbContext` (double-transaction nesting)                                                                                                                                                                                                    | `server/src/routes/tenant.ts`                                    | 🟠 Med  | VALIDATED   | `c451662`                  | Activation flow works in single transaction; no nested tx                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

---

## Regressions / Incidents (Post-Validation)

| Gap ID | Symptom | Root Cause | Fix | Caused-by Chain | Follow-on |
|--------|---------|------------|-----|-----------------|-----------|
| G-007C | Infinite "Loading workspace…" spinner after tenant login | `handleAuthSuccess` seeded `tenants[]` only on `me.tenant` truthy; both failure paths (`else` + `catch`) only called `setCurrentTenantId`, leaving `tenants[]` empty → `currentTenant` null → spinner looped forever | Backend: `/api/me` explicit 401/404 instead of `tenant: null`. Frontend: stub `Tenant` always pushed to `tenants[]`; `APIError` 404 path shows amber banner. | G-015 Phase C introduced `getOrganizationIdentity` in `/api/me`; `OrganizationNotFoundError` was silently swallowed; missing `tenantId` JWT had no guard | G-WL-TYPE-MISMATCH (**VALIDATED** `65ab907`+`ef46214`) · G-WL-ADMIN (**VALIDATED** `46a60e4`) |

---

# INFRASTRUCTURE & RUNTIME GAPS

| Gap ID    | Description                                                          | Files                                                                          | Risk   | Status    | Commit      | Validation Proof                                                                                                        |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ | --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| G-BCR-001 | `bcrypt@5.1.1` native binding fails on Node 24+ — server cannot start | `server/package.json`, `server/src/lib/authTokens.ts`, `server/src/routes/auth.ts`, `server/src/routes/tenant.ts`, `server/src/services/tenantProvision.service.ts`, `server/prisma/seed.ts`, 7 test files | 🟠 Med  | VALIDATED | `3f16bf6`   | bcryptjs@3.0.3 (pure-JS); `GET /health` → 200 on Node 24; hash/compare proof recorded; tsc EXIT 0; eslint EXIT 0 |

> Policy: Wave work may proceed when **server gates pass** (`pnpm -C server run typecheck` + `pnpm -C server run lint`). Root `pnpm run lint` is deferred until G-QG-001 is resolved.

| Gap ID   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Wave             | Risk   | Status      | Commit | Validation Proof                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ | ----------- | ------ | -------------------------------------------------- |
| G-QG-001 | **Frontend ESLint debt blocks root lint gate** — 23 errors across 11 files: `App.tsx` (unused vars), `Auth/ForgotPassword.tsx` + `Auth/TokenHandler.tsx` + `Auth/VerifyEmail.tsx` (`React` not defined / unused vars), `Auth/AuthFlows.tsx` (unused var), `Cart/Cart.tsx` (unused vars), `ControlPlane/AuditLogs.tsx` + `ControlPlane/TenantRegistry.tsx` (unused vars), `ControlPlane/EventStream.tsx` (setState-in-effect), `constants.tsx` (unused imports), `services/apiClient.ts` (`AbortController` not defined) | Wave 3 / cleanup | 🟡 Low | NOT STARTED | —      | `pnpm run lint` exits 0 with no errors or warnings |

---

# WAVE 3 — Canonical Doctrine Buildout

## RLS Entropy Elimination

| Gap ID        | Description                                                                                                              | Affected Files                                                                                                                                                                                                                   | Risk    | Status      | Migration Timestamp Range          | Validation Proof                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| G-006C (RLS)  | **Multiple permissive RLS policies per command per table** — Supabase Performance Advisor flagged policy sprawl across 11 tables; eliminates OR-policy explosion before G-016–G-023 domains are added | `server/prisma/migrations/20260223010000…20260223110000` (11 migration files) | 🟠 Med  | IN PROGRESS | 20260223010000 – 20260223110000    | Pending `prisma migrate deploy` per table; verification SQL embedded in each migration; cross-tenant 0-row proof blocks per migration |

**Tables in scope (apply in order):**
`audit_logs` → `carts` → `cart_items` → `catalog_items` → `orders` → `order_items` → `memberships` → `tenant_branding` → `tenant_domains` → `event_logs` → `impersonation_sessions`

**Expected end state per table:**
- 1 permissive policy per command (SELECT / INSERT / UPDATE / DELETE)
- RESTRICTIVE guard policies untouched
- FORCE RLS: unchanged
- Cross-tenant 0-row proof: PASS
- Supabase Performance Advisor: cleared

---

## Schema Domain Buildout

> **GOVERNANCE-SYNC-001 (2026-02-27):** Table expanded with Commit + Validation Proof columns. All statuses corrected per drift-detection audit `2066313`. False G-015 Phase C ✅ entry in wave-execution-log retracted. Source: `docs/audits/GAP-015-016-017-019-VALIDATION-REPORT.md`.

| Gap ID | Description | Status | Commit(s) | Validation Proof / Notes |
| ------ | ----------- | ------ | --------- | ------------------------ |
| G-015  | `organizations` table — Phase A: introduce org table + RLS + dual-write trigger; Phase B: deferred FK `organizations.id → tenants.id`; **Phase C: read cutover to `organizations` as canonical identity — IMPLEMENTED via Option C (admin-context; no RLS change; no migration)** | VALIDATED | Phase A: `bb9a898` · Phase B: `a838bd8` · Phase C: `790d0e6` | Phase A ✅ table + trigger + 3 RLS policies (admin-realm-only); Phase B ✅ deferred FK, parity-check preflight; Phase C ✅ implemented via Option C (GOVERNANCE-SYNC-004, 2026-02-27): `withOrgAdminContext` + `getOrganizationIdentity` + `OrganizationNotFoundError` added to `database-context.ts`; GET /me and invite-email paths wired; **tenant realm reads remain blocked by org RESTRICTIVE guard policy** (no RLS change); typecheck EXIT 0 · lint 0 errors |
| G-016  | `traceability_nodes` and `traceability_edges` tables — Phase A schema + RLS + service + tenant/admin routes — **IMPLEMENTED** (`44ab6d6`) | VALIDATED | `44ab6d6` | ✅ migration `20260312000000_g016_traceability_graph_phase_a`: public.traceability_nodes (org_id FK→organizations ON DELETE RESTRICT, UNIQUE(org_id,batch_id), INDEX(org_id,node_type), meta JSONB, visibility, geo_hash, updated_at trigger) + public.traceability_edges (org_id FK→organizations, from_node_id/to_node_id FK→traceability_nodes ON DELETE CASCADE, edge_type, transformation_id, meta JSONB; 2x partial UNIQUE indexes for NULL/NOT NULL transformation_id, 2x graph traversal indexes); ENABLE+FORCE RLS on both tables; 5 policies each (RESTRICTIVE guard incl. is_admin pass-through, PERMISSIVE tenant_select/insert/update, PERMISSIVE admin_select); GRANT SELECT/INSERT/UPDATE TO texqtic_app; DO block PASS (both tables); **DB APPLIED ✅ (GOVERNANCE-SYNC-009, 2026-02-27, env: Supabase dev)**: psql EXIT:0 + migrate resolve --applied; pg_policies: 5 rows each verified; relrowsecurity=t relforcerowsecurity=t on both tables; constraints: pkey + org_id FK on nodes; pkey + org_id FK + from_node_id FK + to_node_id FK on edges; data: 0 rows (vacuous — structure proven by DO block PASS notice); TraceabilityService: createNode/listNodes/createEdge/listEdges/getNodeNeighbors; meta 16KB stop-loss; tenant routes: POST+GET /nodes · GET /nodes/:id/neighbors · POST+GET /edges; admin control routes: GET /traceability/nodes · GET /traceability/edges (cross-tenant, is_admin context); wired in tenant.ts + control.ts; Prisma: TraceabilityNode + TraceabilityEdge models + organizations back-refs; typecheck EXIT 0 · lint 0 errors/92 warnings |
| G-017  | `trades` + `trade_events` tables + RLS + lifecycle FK + Day 4 pending_approvals trigger hardening + FK hardening for buyer/seller org refs + admin-plane SELECT RLS | VALIDATED | `96b9a1c` `3bc0c0f` `b557cb5` `0bb9cf3` `8069d48` `2512508` `7350164` `bdb9ab7` | ✅ schema + RLS (RESTRICTIVE guard + PERMISSIVE SELECT/INSERT) + lifecycle FK + route (`trades.g017.ts`) + service (`trade.g017.service.ts`) + 17 tests; **FK HARDENING CLOSED (GOVERNANCE-SYNC-005)**: migration `20260309000000_g017_fk_buyer_seller_orgs` adds 2 FK constraints (ON DELETE RESTRICT); embedded preflight DO block; Prisma schema updated; **DB APPLIED ✅ (GOVERNANCE-SYNC-006, 2026-02-27, env: Supabase dev)**: psql + resolve --applied; **ADMIN-PLANE RLS CLOSED ✅ (GOVERNANCE-SYNC-007, 2026-02-27)**: migration `20260310000000_g017_trades_admin_rls` adds `trades_admin_select` + `trade_events_admin_select` (PERMISSIVE SELECT, USING `is_admin=true`); RESTRICTIVE guards on both tables rebuilt with `OR current_setting('app.is_admin',true)='true'`; pattern mirrors GATE-TEST-003 (audit_logs); migration DO block verified all 6 policy invariants (PASS); pg_policies proof: 6 rows — guards RESTRICTIVE with admin pred, tenant_select scoped to current_org_id (isolation preserved), admin_select PERMISSIVE SELECT; data in dev: 0 rows trades/trade_events (vacuous data proof — policy structure proven via DO block); Prisma ledger synced; no admin INSERT/UPDATE/DELETE (SELECT only per scope); gap register was incorrectly NOT STARTED — corrected GOVERNANCE-SYNC-001; **Day4 FK Hardening DB Applied ✅ (GOVERNANCE-SYNC-015, 2026-02-28, env: Supabase dev)**: migration `20260307000000_g017_day4_pending_approvals_trade_fk_hardening` applied via psql (migration file first patched: adjacent-literal RAISE NOTICE in verification DO block merged into single literal, impl commit `bdb9ab7`); function `g017_enforce_pending_approvals_trade_entity_fk` created (RETURNS trigger, LANGUAGE plpgsql, SECURITY DEFINER, SET search_path=public); trigger `trg_g017_pending_approvals_trade_entity_fk` (BEFORE INSERT OR UPDATE ON pending_approvals FOR EACH ROW) created; tgrelid=pending_approvals, tgenabled=O; DO block 5-check VERIFY PASS (function EXISTS, trigger EXISTS, tgenabled=O, pending_approvals EXISTS, trades EXISTS); trigger/function counts post-apply: 1/1; SQLSTATE P0003 enforcement; Prisma ledger synced via resolve --applied; required for pending_approvals → trade entity FK integrity; **trades_domain Ledger-Sync ✅ (GOVERNANCE-SYNC-016, 2026-02-28)**: migration `20260306000000_g017_trades_domain` ledger-synced (resolve-only, no psql apply); `public.trades` + `public.trade_events` confirmed present in DB via to_regclass; applied out-of-band previously as G-017 Day1 schema prerequisite; row counts: trades=0, trade_events=0 (vacuous) |
| G-018  | `escrow_accounts` table + lifecycle FK + Day 3 tenant+control routes | VALIDATED | `7c1d3a3` `efeb752` `8d7d2ee` `98eb08d` | ✅ schema + RLS + service (ledger + lifecycle + governance) + routes (tenant + control); **Day 1 DB Applied ✅ (GOVERNANCE-SYNC-011, 2026-02-28, env: Supabase dev)**: psql apply (migration `20260308000000_g018_day1_escrow_schema`, commit `7c1d3a3`) + resolve --applied; §16 PASS notice; RLS t/t on both tables; FKs verified; **Cycle Fix DB Applied ✅ (GOVERNANCE-SYNC-012, 2026-02-28, env: Supabase dev)**: psql apply (migration `20260308010000_g018_day1_escrow_schema_cycle_fix`) + resolve --applied; `escrow_accounts.trade_id` + 2 indexes dropped; `trades.escrow_id → escrow_accounts.id` canonical FK preserved (ON DELETE RESTRICT); RLS t/t on both escrow tables unchanged; verification PASS; **Migration File Repaired ✅ (GOVERNANCE-SYNC-013, 2026-02-28)**: patched 2 RAISE NOTICE adjacent-string-literal PL/pgSQL syntax errors + non-ASCII chars (em dash `—`, Unicode arrow `→`) replaced with ASCII (`--`, `->`); no operational SQL change; psql parse proof: COMMIT + PASS notice (no ERROR); impl commit `98eb08d` |
| G-019  | `certifications` table — schema + RLS + service + tenant/admin routes — **IMPLEMENTED** (`3c7dae7`) | VALIDATED | `3c7dae7` | ✅ migration `20260311000000_g019_certifications_domain`: public.certifications (org_id FK→organizations ON DELETE RESTRICT, lifecycle_state_id FK→lifecycle_states ON DELETE RESTRICT, CHECK expires_after_issued, partial UNIQUE per-pending + full UNIQUE per-issued); ENABLE+FORCE RLS; 5 policies (RESTRICTIVE guard incl. is_admin pass-through, PERMISSIVE tenant_select/insert/update, PERMISSIVE admin_select); updated_at trigger; GRANT SELECT/INSERT/UPDATE TO texqtic_app; DO block PASS; **DB APPLIED ✅ (GOVERNANCE-SYNC-008, 2026-02-27, env: Supabase dev)**: psql EXIT:0 + migrate resolve --applied; pg_policies: 5 rows verified; relrowsecurity=t relforcerowsecurity=t; constraints: pkey + 2 FKs + CHECK; data: 0 rows (vacuous — structure proven by DO block); CertificationService: create/list/get/update/transition (entity_type='CERTIFICATION' enforced); tenant routes: POST / · GET / · GET /:id · PATCH /:id · POST /:id/transition; admin control routes: GET / · GET /:id (cross-tenant, is_admin context); wired in tenant.ts + control.ts; typecheck EXIT 0 · lint 0 errors/92 warnings |
| G-020  | State machine transition tables (trade, escrow, certification lifecycle) **+ G-020 Runtime Enforcement Atomicity (GOVERNANCE-SYNC-021)** | VALIDATED | `aec967f` `9c3ca28` `61d1a96` | ✅ schema + RLS + seed (43-edge graph across TRADE/ESCROW/CERTIFICATION entities) + `StateMachineService` transition enforcement + 20 tests; CLOSED per wave log; **DB Applied ✅ (GOVERNANCE-SYNC-014, 2026-02-28, env: Supabase dev)**: all 4 tables (`lifecycle_states`, `allowed_transitions`, `trade_lifecycle_logs`, `escrow_lifecycle_logs`) + `prevent_lifecycle_log_update_delete` fn + 2 immutable-log triggers confirmed present in DB out-of-band (applied as prerequisite for G-017 trades); pre-flight guard blocks re-apply (lifecycle_states already existed); FORCE RLS t/t on all 4 tables; 14 RLS policies (lifecycle_states: 2, allowed_transitions: 2, trade_lifecycle_logs: 5, escrow_lifecycle_logs: 5); key constraints: pkey+unique on lifecycle_states, pkey+unique+2FKs+3CHECKs on allowed_transitions, pkey+FKs+CHECKs on log tables; row counts: 0 (vacuous — structure proven by constraints/policies); Prisma ledger synced via resolve --applied; **Runtime Enforcement Atomicity CLOSED ✅ (GOVERNANCE-SYNC-021, 2026-02-28)**: two-phase atomicity gap eliminated — `StateMachineService.transition()` accepts `opts?.db` (shared `PrismaClient`); when provided, SM log write uses `opts.db` directly (no nested `$transaction`); `TradeService.transitionTrade()` wraps SM log INSERT + `trade.lifecycleStateId` UPDATE + `tradeEvent` INSERT in ONE `$transaction`; `EscrowService.transitionEscrow()` wraps SM log INSERT + `$executeRaw UPDATE escrow_accounts.lifecycle_state_id` in ONE `$transaction`; dead CERTIFICATION APPLIED branch removed (SM always returns `CERTIFICATION_LOG_DEFERRED`); atomicity regression tests T-15 (trade) + E-09 (escrow) added; typecheck EXIT 0, lint 0 errors, 44/44 tests pass |
| G-021  | Maker-Checker dual-signature enforcement **+ G-021 Runtime Enforcement Wiring (GOVERNANCE-SYNC-022)** | VALIDATED | `407013a` `de3be8f` `9c15026` | ✅ schema + RLS + replay integrity hash + `maker_id ≠ checker_id` DB trigger + active-uniqueness constraint + idempotency + 29 tests; CLOSED per wave log; **DB Applied ✅ (GOVERNANCE-SYNC-017, 2026-03-01, env: Supabase dev)**: all objects confirmed present in DB out-of-band prior to ledger sync; pre-flight guard blocks re-apply (`pending_approvals` already existed); resolve-only path; 10 RLS policies (pg_policies: 10); ENABLE+FORCE RLS: t/t on both tables (`pending_approvals`, `approval_signatures`); 2 trigger functions (`prevent_approval_signature_modification`, `check_maker_checker_separation`); 2 triggers on `approval_signatures` (immutability BEFORE UPDATE/DELETE + D-021-C AFTER INSERT); partial unique index `pending_approvals_active_unique` (D-021-B: WHERE status IN (REQUESTED, ESCALATED)); row counts: 0/0 (vacuous — structure proven by RLS + triggers + index + constraints); Prisma ledger synced via resolve --applied; **Runtime Enforcement Wiring CLOSED ✅ (GOVERNANCE-SYNC-022, 2026-02-28)**: Fix A — `TradeService` constructor `_makerChecker` unused-underscore removed; `makerChecker` now stored + called on PENDING_APPROVAL; `trade.g017.types.ts` PENDING_APPROVAL result gains `approvalId?: string`; Fix A2 — tenant + control trade transition routes construct `MakerCheckerService` and inject into `TradeService`; Fix B — control-plane escrow route gains POST `/:escrowId/transition` endpoint with MC injection (mirrors tenant plane); Fix C — `buildService()` in `routes/internal/makerChecker.ts` injects `EscalationService` into SM + MC so `verifyAndReplay()` enforces freeze checks (D-022-D); Implementation commit `9c15026`; 19/19 tests pass (17 trade + 2 makerChecker); typecheck EXIT 0 · lint 0 errors; pending migrations = 0 BEFORE + AFTER; **Depends on G-020 SM enforcement boundary; integrates with G-022 escalation freeze checks**; **Prevents trade lifecycle dead-end where PENDING_APPROVAL had no pending_approvals row** |
| G-022  | Escalation levels + kill-switch mechanism **+ G-022 Runtime Enforcement — CERTIFICATION Freeze Wiring (GOVERNANCE-SYNC-023)** | VALIDATED | `e138ff0` `5d8e43c` `e8d0811` | ✅ schema + RLS + `EscalationService` (freeze gate D-022-B/C) + tenant routes (LEVEL_0/1) + control routes (upgrade/resolve) + 28 tests (23 Day2 + 5 Day3); **DB Applied ✅ (GOVERNANCE-SYNC-018, 2026-02-28, env: Supabase dev)**: `escalation_events` table + 2 trigger functions (`escalation_events_immutability`, `escalation_severity_upgrade_check`) + 2 triggers confirmed present in DB out-of-band; pre-flight guard blocks re-apply (escalation_events already existed); resolve-only path; ENABLE+FORCE RLS: t/t; 4 RLS policies (tenant_select, admin_select, tenant_insert, admin_insert); 5 indexes (pkey + entity_freeze + org_freeze + org_id + parent); D-022-A severity upgrade trigger ✅; D-022-B org freeze via entity_type=ORG ✅; row count: 0 (vacuous); Prisma ledger synced via resolve --applied; **GAP-G022-01 CLOSED ✅ (GOVERNANCE-SYNC-023, 2026-02-28)**: CERTIFICATION routes (`certifications.g019.ts`) — all 5 SM instantiation sites now inject `EscalationService` (createCertification, listCertifications, getCertification, updateCertification, transitionCertification); SM Step 3.5 org-level freeze checks now enforced for all CERTIFICATION operations; 2 tests added (T-G022-CERT-ORG-FROZEN: org freeze blocks CERTIFICATION transition ✅, T-G022-CERT-NOT-FROZEN: no freeze → SM proceeds to CERTIFICATION_LOG_DEFERRED ✅); **GAP-G022-02 REGISTERED**: `'CERTIFICATION'` absent from `EscalationEntityType` union and DB `escalation_events` CHECK constraint — entity-level freeze for individual CERTIFICATION rows deferred; requires `EscalationEntityType` enum extension + DB migration (separate TECS); T-G022-CERT-ENTITY-FROZEN intentionally absent |
| GATE-TEST-003 | `audit_logs` admin SELECT + RESTRICTIVE guard admin predicate fix | VALIDATED | — | ✅ migration `20260304000000_gatetest003_audit_logs_admin_select`: drops+recreates `audit_logs_guard` RESTRICTIVE policy adding `current_setting('app.is_admin',true)='true'` predicate; adds `audit_logs_admin_select` PERMISSIVE SELECT (admin context, `tenant_id IS NULL` rows only); VERIFY DO block passes 5 invariant checks; parse-safe (no adjacent literals, no non-ASCII in RAISE strings); tenant isolation unchanged; **DB Applied ✅ (GOVERNANCE-SYNC-019, 2026-02-28, env: Supabase dev)**: all objects confirmed present in DB out-of-band; resolve-only path; FORCE RLS t/t on `audit_logs`; 6 total policies (`audit_logs_guard` RESTRICTIVE + `audit_logs_select_unified` PERMISSIVE SELECT + `audit_logs_admin_select` PERMISSIVE SELECT + `audit_logs_insert_unified` + `audit_logs_no_update` + `audit_logs_no_delete`); `has_admin_predicate=t` ✅; PERMISSIVE SELECT policies = 2 (matches VERIFY check); `audit_logs` row count: 55 (live data); Prisma ledger synced via resolve --applied |
| G-023  | `reasoning_logs` table + `reasoning_hash` FK for AI events | VALIDATED | `48a7fd3` `2f432ad` | ✅ schema (reasoning_logs + audit_logs FK) + service (emit reasoning_log per AI call) + wave log evidence doc; **DB Applied ✅ (GOVERNANCE-SYNC-020, 2026-02-28, env: Supabase dev)**: `reasoning_logs` table + `audit_logs.reasoning_log_id` FK column + fn `reasoning_logs_immutability` + trigger `trg_reasoning_logs_immutability` + 3 RLS policies + 4 indexes all confirmed present in DB out-of-band; resolve-only path (migration uses CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS patterns); ENABLE+FORCE RLS: t/t; 3 policies (`reasoning_logs_guard` RESTRICTIVE ALL, `reasoning_logs_tenant_select` PERMISSIVE SELECT, `reasoning_logs_tenant_insert` PERMISSIVE INSERT); 4 indexes on reasoning_logs (pkey + created_at + request_id + tenant_id); immutability trigger enabled=O (append-only, bypass-rls DELETE escape for test seed only); `audit_logs.reasoning_log_id` FK ✅ (col_exists=1); row counts: reasoning_logs=23 (live AI audit data), audit_logs with reasoning_log_id IS NOT NULL=5 (FK live and used); Prisma ledger synced via resolve --applied; **🎉 MILESTONE: All 57 migrations ledger-synced. `Database schema is up to date!`** |
| G-024  | `sanctions` table — runtime enforcement for sanctioned orgs/entities | VALIDATED | `a133123` | M scope; migration `20260313000000_g024_sanctions_domain` adds `public.sanctions` table + SECURITY DEFINER enforcement functions; SanctionsService injected into StateMachineService(3.5a), TradeService(buyer+seller), CertificationService, EscrowService(create+RELEASE); 7 route files wired; replay-safe via SM.transition() path; T-G024-01..06 (6/6 PASS); typecheck EXIT 0; lint 0 errors; **DB Migration APPLIED ✅ (OPS-ENV-002 + OPS-DB-RECOVER-001, 2026-03-01, env: Supabase prod)**; **CLOSED (GOVERNANCE-SYNC-024 / GOVERNANCE-SYNC-026, 2026-03-13 / 2026-03-01)** |

---

# WAVE 4 — Governance + Infrastructure

| Gap ID | Description                                                         | Status      | Notes                                      |
| ------ | ------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| G-025  | DPP snapshot views (`dpp_product_passport`) — MISSING               | NOT STARTED | XL scope; regulator-facing read models     |
| G-026  | Custom domain routing / tenant resolution (white-label) — stub only | NOT STARTED | L scope; edge runtime + Prisma constraints |
| G-027  | The Morgue (Level 1+ failure event bundles) — MISSING               | NOT STARTED | L scope; post-mortem + regulator review    |
| G-028  | Insight caching / vector store / inference separation for AI        | NOT STARTED | XL scope; future AI infrastructure         |
| G-WL-TYPE-MISMATCH | WL tenant renders as wrong shell/type when org is unprovisioned — stub defaulted `type: 'B2B'`; WL org in provisioning gap rendered B2B/Enterprise sidebar | **VALIDATED** | `65ab907` (backend) · `ef46214` (frontend). Backend: `tenantType: string\|null` in login response via `getOrganizationIdentity`; fail-open on `OrganizationNotFoundError`. Frontend: `LoginResponse.tenantType` typed; `stubType` enum-validated from `data.tenantType` (AGGREGATOR fallback); both stub paths fixed. Happy path unchanged. Gates: tsc EXIT 0 · eslint 0 errors · gate-e-4-audit login PASS. |
| G-WL-ADMIN | WL Store Admin back-office surface missing — WL OWNER/ADMIN landed on storefront shell; no back-office access to Branding, Staff, Products, Collections, Orders, Domains | **VALIDATED** | `46a60e4`. `'WL_ADMIN'` appState added. Router rule: WHITE_LABEL + OWNER/ADMIN → `WL_ADMIN` in all handleAuthSuccess paths. `WhiteLabelAdminShell` in Shells.tsx: sidebar with 6 panels (no B2B chrome). BRANDING→WhiteLabelSettings, STAFF→TeamManagement; PRODUCTS/COLLECTIONS/ORDERS/DOMAINS→WLStubPanel (stub). Provision banner compatible. "← Storefront" link restores WhiteLabelShell. Gates: tsc EXIT 0 · eslint 0 errors. Follow-ons: Products, Collections, Orders, Domains full panels (Wave 4). |

---

## Ops / Infrastructure Gaps

| Gap ID | Description | Status | Notes |
| ------ | ----------- | ------ | ----- |
| OPS-ENV-001 | Prisma migration env var naming mismatch: `MIGRATION_DATABASE_URL` (schema.prisma) vs `DIRECT_DATABASE_URL` (TECS prompts + copilot-instructions). Caused 3 consecutive prod deploy blocks during G-024 migration cycle. | **VALIDATED** | Option A: standardized on `DIRECT_DATABASE_URL`. `schema.prisma directUrl` updated. Preflight script (`server/scripts/prisma-env-preflight.ts`) blocks TX_POOLER (exit 1). Deploy wrapper (`server/scripts/migrate-deploy.ts`) auto-loads .env. `package.json` scripts: `prisma:preflight`, `migrate:deploy:prod`. Docs: `docs/ops/prisma-migrations.md`. Proof: 4/4 exit code tests PASS. typecheck EXIT 0. GOVERNANCE-SYNC-025. |
| OPS-ENV-002 | Rename `MIGRATION_DATABASE_URL` → `DIRECT_DATABASE_URL` in `server/.env` (gitignored) and deploy G-024 to production. | **VALIDATED** | `server/.env` key renamed (no tracked change). Preflight: DIRECT_DATABASE_URL, SESSION_POOLER (aws-1-*:5432), EXIT 0. G-024 deploy: SUCCESS — "Applying migration `20260313000000_g024_sanctions_domain`". Post-deploy: "Database schema is up to date!" (0 pending). GOVERNANCE-SYNC-026. |
| OPS-DB-RECOVER-001 | `_prisma_migrations` stuck row for `20260223020000_g006c_rls_carts_consolidation` (finished_at=NULL, applied_steps_count=0 from Mar-1 failed deploy attempt). Blocked G-024 deploy. | **VALIDATED** | Investigation: all carts unified policies already present in DB (carts_select/insert/update/delete_unified + FORCE RLS). Path B chosen: `UPDATE _prisma_migrations SET finished_at=NOW(), applied_steps_count=1 WHERE migration_name='20260223020000_g006c_rls_carts_consolidation' AND finished_at IS NULL AND rolled_back_at IS NULL` — 1 row affected. Deploy unblocked. GOVERNANCE-SYNC-026. |

---

# REVENUE UNBLOCK — OPS-REVENUE-UNBLOCK-IMPLEMENTATION-001

**TECS:** OPS-REVENUE-UNBLOCK-IMPLEMENTATION-001  
**Date:** 2026-03-02  
**Commits:** `3923069` `fc66637` `5d4c3bf` `2cda383` `739f6d8`  
**Scope:** RU-001 (invite activation wiring) · RU-002 (provision UI enablement) · RU-003 (catalog create API + service + frontend inline form)  
**Gates:** typecheck EXIT 0 (frontend + backend) · lint EXIT 0 (0 errors, 1 pre-existing warning)  
**Non-goals preserved:** No schema changes · No migrations · No RLS changes · No auth middleware edits · No new dependencies · No route plugins added outside tenant.ts allowlist

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| RU-001 | **Invite activation wiring** — `action=invite` URL token was intercepted by TokenHandler; `pendingInviteToken` state missing in App root; `activateTenant` never called on onboarding completion; OnboardingFlow step 2 had no email/password fields | `App.tsx` · `components/Onboarding/OnboardingFlow.tsx` | 🟠 Med | VALIDATED | `5d4c3bf` `739f6d8` | `action=invite` URL detection routes to ONBOARDING (not TOKEN_HANDLER) ✅ · `pendingInviteToken` state seeded from URL param ✅ · OnboardingFlow step 2 "Set Up Your Account" collects `email` + `password` ✅ · `activateTenant({inviteToken, userData})` called exactly once on step 4 completion ✅ · On success: `tenants[]` seeded, `currentTenantId` set, `pendingInviteToken` cleared, transition to EXPERIENCE ✅ · typecheck EXIT 0 · lint EXIT 0 |
| RU-002 | **Provision UI enablement** — "Provision New Tenant" button was `disabled` with note "will be enabled in Wave 5"; no modal or form existed; `provisionTenant` service function had no UI entry point | `components/ControlPlane/TenantRegistry.tsx` | 🟡 Low | VALIDATED | `2cda383` `739f6d8` | Provision button enabled (removed `disabled` flag) ✅ · Modal opens with form (orgName, ownerEmail, ownerPassword) ✅ · `handleProvision`: auto-slugifies orgName, calls `provisionTenant({name, slug, type:'B2B', ownerEmail, ownerPassword})` ✅ · On success: shows orgId + slug + next-step guidance for invite link ✅ · Tenant list refreshed via `fetchTenants()` ✅ · All form labels a11y-compliant (`htmlFor`/`id`) ✅ · typecheck EXIT 0 · lint EXIT 0 |
| RU-003 | **Catalog item creation** — `POST /api/tenant/catalog/items` endpoint absent; `catalogService.ts` had no write ops; no frontend UI to add items; `catalog.item.created` audit action did not exist | `server/src/routes/tenant.ts` · `services/catalogService.ts` · `App.tsx` | 🟠 Med | VALIDATED | `3923069` `fc66637` `5d4c3bf` `739f6d8` | `POST /api/tenant/catalog/items`: `tenantAuthMiddleware` + `databaseContextMiddleware` guards ✅ · Role guard: OWNER or ADMIN only ✅ · Zod schema: `name` (required), `sku?`, `description?`, `price` (positive), `moq` (int, default 1) ✅ · `withDbContext` → `tx.catalogItem.create` (RLS-safe) ✅ · `writeAuditLog(action: 'catalog.item.created')` ✅ · Returns 201 with created item ✅ · `createCatalogItem(payload)` added to `catalogService.ts` via `tenantPost` ✅ · Inline "+ Add Item" form in B2B (Wholesale Catalog) + B2C (New Arrivals) shells ✅ · typecheck EXIT 0 · lint EXIT 0 |

### S1 Happy Path — Validated (2026-03-02)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| A | Control Plane → Tenant Registry → "Provision New Tenant" → fill form | Success modal: orgId + slug shown; tenant list refreshed | ✅ VALIDATED |
| B | Use invite member flow → capture `?token=<token>&action=invite` URL | Token routed to ONBOARDING — distinct from `reset-password`/`verify-email` (TokenHandler bypassed) | ✅ VALIDATED |
| C | Open invite URL → OnboardingFlow step 2 collects email+password → "Complete Activation" | `POST /api/tenant/activate` called exactly once → transitions to EXPERIENCE | ✅ VALIDATED |
| D | OWNER in B2B or B2C → "+ Add Item" → fill name/price/[sku] → Save | Item prepended to product list; `catalog.item.created` audit row written | ✅ VALIDATED |
| E | Member adds item to cart → checkout | Order appears in orders list | ✅ VALIDATED |
| F | Audit trail check | `control.tenants.provisioned` + `user.activated` + `catalog.item.created` + checkout audit — all present | ✅ VALIDATED |

---

# REVENUE UNBLOCK — OPS-ACTIVATE-JWT-FIX-001

**TECS:** OPS-ACTIVATE-JWT-FIX-001  
**Date:** 2026-03-02  
**Commit:** `43ef9c6`  
**Scope:** GAP-RUV-001 (invite URL action param) · GAP-RUV-002 (activate JWT issuance) · GAP-RUV-003 (tenant type from response) · GAP-RUV-005 (industry field data integrity)  
**Gates:** typecheck EXIT 0 (frontend + backend) · lint EXIT 0 (0 errors, pre-existing warnings only)  
**Non-goals preserved:** No schema changes · No migrations · No RLS changes · No auth middleware edits · No new dependencies · No new routes

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| GAP-RUV-001 | **Invite email URL missing `action=invite` param** — invite link generated as `?token=<tok>` only; `App.tsx` `useEffect` routes to ONBOARDING only when `action=invite` present; without it, user lands in TOKEN_HANDLER (password-reset handler) and never reaches activation form | `server/src/services/email/email.service.ts` | 🔴 Revenue Blocker | VALIDATED | `43ef9c6` | `sendInviteMemberEmail` URL now `?token=<tok>&action=invite` ✅ · invite click routes to ONBOARDING (not TOKEN_HANDLER) ✅ |
| GAP-RUV-002 | **`POST /api/tenant/activate` returned no JWT** — backend `sendSuccess` response contained `{user, tenant, membership}` with no `token` field; `setToken()` was never called; all post-activation EXPERIENCE API calls hit `tenantAuthMiddleware` → 401 | `server/src/routes/tenant.ts` | 🔴 Revenue Blocker | VALIDATED | `43ef9c6` | `/activate` calls `reply.tenantJwtSign({userId, tenantId, role})` after `withDbContext` commits ✅ · response includes `{token, user, tenant:{id,name,slug,type}, membership}` ✅ · same JWT claim shape as `/api/auth/login` ✅ · no new signing helper · no new DB queries ✅ |
| GAP-RUV-003 | **`App.tsx` hardcoded `type: 'B2B'` after activation** — `onComplete` in ONBOARDING seeded tenant stub with `type: 'B2B'` regardless of actual provisioned type; WHITE_LABEL invite-activated users would land in B2B EXPERIENCE shell instead of WL shell; `setToken()` was also absent | `App.tsx` | 🟠 User abandonment | VALIDATED | `43ef9c6` | `setToken(raw.token, 'TENANT')` called before `setAppState('EXPERIENCE')` ✅ · `type: (raw.tenant.type ?? 'B2B') as TenantType` — derives type from server response, not hardcoded ✅ · `setToken` import added to `apiClient` import line ✅ |
| GAP-RUV-005 | **`OnboardingFlow.tsx` industry input uncontrolled** — step 1 `<input id="industry">` had no `value` or `onChange`; `formData.industry` was always `''`; data silently dropped on submit; `tenantData.industry` always received undefined | `components/Onboarding/OnboardingFlow.tsx` | 🟡 Data integrity | VALIDATED | `43ef9c6` | `value={formData.industry}` + `onChange={e => setFormData({...formData, industry: e.target.value})}` wired ✅ · field now controlled; data flows into `tenantData.industry` on activate ✅ |

---

# REVENUE UNBLOCK — OPS-ORDER-LIFECYCLE-AUDIT-001

**TECS:** OPS-ORDER-LIFECYCLE-AUDIT-001  
**Date:** 2026-03-02  
**Commit:** `5e13fe5`  
**Scope:** GAP-RUV-006 (order lifecycle audit trail — PARTIAL)  
**Gates:** typecheck EXIT 0 (backend) · lint EXIT 0 (0 errors, pre-existing warnings only)  
**Non-goals preserved:** No schema changes · No migrations · No RLS changes · No stateMachine edits · No new dependencies

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| GAP-RUV-006 | **Order lifecycle audit trail — PARTIAL** — G-020 `StateMachineService` supports only `EntityType = 'TRADE' \| 'ESCROW' \| 'CERTIFICATION'`; `LifecycleState` schema has DB-level `CHECK entity_type IN ('TRADE', 'ESCROW', 'CERTIFICATION')` constraint; wiring ORDER into G-020 requires schema migration + new log table + seed data (all out-of-scope). **Interim:** structured lifecycle audit event `action: 'order.lifecycle.PAYMENT_PENDING'` added to checkout tx via existing `writeAuditLog`; recorded inside `withDbContext` transaction (rolls back atomically on failure); `metadataJson` contains `{ fromState: null, toState: 'PAYMENT_PENDING', trigger: 'checkout.completed', orderId, cartId }`. **Re-entry condition:** OPS-ORDER-LIFECYCLE-SCHEMA-001 (separate schema/migration wave) must add `ORDER` to `LifecycleState` CHECK constraint, create `order_lifecycle_logs` table, add ORDER lifecycle seed states, and extend `StateMachineService` before full G-020 wiring is possible. | `server/src/routes/tenant.ts` | 🟡 Operability | PARTIAL (audit-only) | `5e13fe5` | `audit_logs` row with `action='order.lifecycle.PAYMENT_PENDING'`, `entity='order'`, `entityId=<orderId>`, `metadataJson.fromState=null`, `metadataJson.toState='PAYMENT_PENDING'`, `metadataJson.trigger='checkout.completed'` ✅ · `order.CHECKOUT_COMPLETED` audit preserved ✅ · checkout tx rolls back atomically if lifecycle audit insert fails ✅ · typecheck EXIT 0 · lint EXIT 0 |

---

# WL ADMIN — OPS-WLADMIN-PRODUCTS-MVP-001

**TECS:** OPS-WLADMIN-PRODUCTS-MVP-001  
**Date:** 2026-03-02  
**Commit:** `6a7bf41`  
**Scope:** G-WL-ADMIN Products panel — VALIDATED  
**Gates:** typecheck EXIT 0 (frontend) · lint: 0 new errors (pre-existing G-QG-001 debt in non-allowlisted files unchanged)  
**Non-goals preserved:** No server/src changes · No schema/migrations/RLS changes · No new dependencies · Collections/Orders/Domains remain stub

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| G-WL-ADMIN (Products panel) | **WL_ADMIN Products panel was WLStubPanel** — OWNER/ADMIN WL users could not manage inventory from the Store Admin console; Products nav item rendered a "Coming Soon" stub. **Fix:** `case 'PRODUCTS'` in `renderWLAdminContent()` replaced with a real panel reusing shared catalog state (`products`, `catalogLoading`, `catalogError`), shared form state (`showAddItemForm`, `addItemFormData`, `addItemLoading`, `addItemError`), shared handler (`handleCreateItem`) and existing services (`getCatalogItems`, `createCatalogItem`). Catalog `useEffect` extended to fire on `appState === 'WL_ADMIN'`. Labels prefixed `wl-` to avoid DOM `id` conflicts with B2B panel inputs. 403 from API surfaced via `addItemError`. Collections/Orders/Domains remain WLStubPanel. | `App.tsx` | 🟡 Operability | **VALIDATED** | `6a7bf41` | A) WL OWNER → Products → Add Item form visible → create item → item appears in grid → `catalog.item.created` audit row written ✅ · B) Catalog loads on enter (useEffect fires for WL_ADMIN) ✅ · C) Empty state: "No products yet" message shown ✅ · D) Error state: API error text displayed ✅ · typecheck EXIT 0 · 0 new lint errors |

**Re-entry conditions:**
- Collections panel: OPS-WLADMIN-COLLECTIONS-001
- Orders panel: OPS-WLADMIN-ORDERS-001
- Domains panel: OPS-WLADMIN-DOMAINS-001

---

# RCP-1 — Revenue Domain Completion Plan (Phase 1)

**Anchored:** 2026-03-02  
**Governance Sync:** GOVERNANCE-SYNC-041  
**Reconciliation TECS:** OPS-RCP1-GAP-RECONCILIATION-001  
**Scope:** Tenant Commerce Domain (revenue readiness) across Enterprise + White-label tenants, without shell drift.

## Objective
Complete the minimal revenue-operational loop so that:
- Tenants can sell (catalog present + manageable)
- Buyers can purchase (cart + checkout)
- Orders can be operationally managed (status progression + audit)
- WL_ADMIN and EXPERIENCE shells expose the same *capability set* (not merged planes)
- Governance and audit invariants remain enforced

## Explicit Non-Goals (Hard Stops)
- DOES NOT extend G-020 StateMachineService to ORDER (blocked by schema prerequisite)
- DOES NOT introduce new DB tables, migrations, schema changes, or RLS policy changes
- DOES NOT reopen D-5 (B1) — `app.roles` remains dormant for live requests; no DB-level role gates
- DOES NOT merge WL_ADMIN and EXPERIENCE shells; no cross-shell routing changes that erode appState boundaries
- DOES NOT implement payment gateway / PSP integration
- DOES NOT refactor components "for cleanliness" unless required by revenue correctness

## Canonical Drift Correction
The earlier draft notion of "OPS-ORDER-DOMAIN-STATE-GUARD-001 (lifecycle)" is corrected:
- Phase 1 implements **app-layer order status progression + audit**, not G-020 lifecycle.
- Full ORDER lifecycle state machine wiring requires a separate schema wave (see GAP-ORDER-LC-001).

## RCP-1 — Ordered TECS Sequence (Phase 1)
1. **OPS-ORDER-STATUS-TRANSITIONS-001**
   - Add app-layer guarded order status transitions with audit (no schema, no SM).
2. **OPS-WLADMIN-ORDERS-PANEL-001**
   - Replace WL_ADMIN Orders stub with real orders list + actions; consumes existing tenant APIs + transitions endpoint.
3. **OPS-EXPERIENCE-ORDERS-UX-001**
   - Ensure EXPERIENCE shell order management UX reaches parity with WL_ADMIN (capability parity, not shared plane).
4. **OPS-REVENUE-FLOW-VALIDATION-002**
   - E2E validation with explicit ceiling: PAYMENT_PENDING + app-layer transitions; verify audit trail.

## RCP-1 Commerce Gaps / Work Items (Formal Entries)

| Gap / Work ID | Description | Domain | Severity | Status | Dependencies | Notes / Stop Conditions |
|---|---|---|---|---|---|---|
| GAP-ORDER-LC-001 | ORDER lifecycle schema prerequisite (Future Wave): add ORDER to LifecycleState CHECK constraint; add order lifecycle log table + RLS; seed ORDER states; extend SM EntityType union | Backend / DB | 🔴 HIGH | PLANNED (RCP-1) — **BLOCKED (schema approval required)** | — | Non-goals: does not implement UI/route guards. This is a prerequisite for "true" ORDER state machine wiring. |
| GAP-ORDER-TRANSITIONS-001 | App-layer order status transitions (Phase 1): PAYMENT_PENDING→CONFIRMED; CONFIRMED→FULFILLED/CANCELLED; OWNER/ADMIN only; audit `order.lifecycle.<state>` | Backend | 🟠 MED | **VALIDATED** — commit `0a03177` (TECS 1) | Existing orders APIs + audit infra | Must not touch G-020 SM. Must not add schema. Must use existing audit_logs. |
| GAP-WL-ORDERS-001 | WL_ADMIN Orders panel: replace WLStubPanel; render orders list + status actions; consume transitions endpoint | Frontend / WL_ADMIN | 🟠 MED | **VALIDATED** — this commit (TECS 2) | GAP-ORDER-TRANSITIONS-001 | Must not merge shells. May reuse presentational components only if shell-local state remains distinct. |
| GAP-EXP-ORDERS-001 | EXPERIENCE Orders UX parity: ensure order list + details + status actions exist and match WL_ADMIN capabilities | Frontend / EXPERIENCE | 🟡 LOW-MED | **VALIDATED** — this commit (TECS 3) | GAP-ORDER-TRANSITIONS-001 | Must not create a second backend path. Use same transition endpoint. |
| GAP-REVENUE-VALIDATE-002 | Revenue flow validation pass: provision → invite → activate → catalog → cart → checkout → order list → status transition → audit verification; ceiling = PAYMENT_PENDING + transitions | QA / Cross-cutting | 🟡 LOW | 🟡 **PARTIALLY VALIDATED** — this commit (TECS 4) | Completion of above TECS | Phases 0–3 VALIDATED (12/21 steps PASS). Phases 4–5 BLOCKED by GAP-RLS-ORDERS-UPDATE-001. Validated ceiling: catalog create → cart → checkout → PAYMENT_PENDING order → orders list → audit trail. TECS 1 endpoint logic correct; non-executable due to RLS policy gating in current posture. |
| GAP-RLS-ORDERS-UPDATE-001 | **Orders UPDATE blocked by RLS policy** — `orders_update_unified` policy (FOR UPDATE TO texqtic_app) has USING + WITH CHECK: `current_setting('app.is_admin', true) = 'true'`; withDbContext sets app.org_id/actor_id/realm/request_id + bypass_rls=off, but does NOT set app.is_admin (B1 decision: tenant actor context must not claim admin); row is visible via orders_select_unified (tenant-scoped SELECT) but invisible to UPDATE; privilege grant GRANT UPDATE applied (PG 42501 resolved → P2025 reveals row-policy block) | Backend / DB / RLS | 🔴 HIGH | 🔴 **BLOCKED** (RLS policy change required — post-RCP-1 wave) | GAP-REVENUE-VALIDATE-002, GAP-ORDER-TRANSITIONS-001 | Fix options: (A1) update orders_update_unified USING+CHECK to add `OR (app.require_org_context() AND tenant_id = app.current_org_id())` arm — RLS policy change, intentional future-wave only. (A2) set app.is_admin=true for OWNER/ADMIN in PATCH endpoint — risks blurring admin identity at DB layer, not acceptable. Neither applied in RCP-1. Re-entry condition: post-RCP-1 wave with explicit RLS governance sign-off. |

## Linkages to Existing Gaps
- **GAP-RUV-006 (Order lifecycle audit)** remains the canonical record:
  - Current: audit-only lifecycle entry at checkout (PAYMENT_PENDING)
  - Full lifecycle (G-020 style) is blocked until **GAP-ORDER-LC-001**
  - RCP-1 Phase 1 proceeds via **GAP-ORDER-TRANSITIONS-001** (app-layer transitions + audit) without schema changes.

---

# Future Waves (5+)

| Proposed Gap                           | Rationale                              | Assigned Wave |
| -------------------------------------- | -------------------------------------- | ------------- |
| DPP export signature bundles           | Regulator-facing export with audit URI | W4+           |
| Multi-region tenant routing            | Geographic isolation for compliance    | W5            |
| AI model drift detection + auto-freeze | Safety boundary for AI automation      | W5            |
| Real-time event streaming (WebSocket)  | Live audit feed for control plane      | W5            |

---

# Role Model + RLS Vocabulary Anchor (2026-03-01)

> **Anchored:** 2026-03-01. Investigation basis: TECS WAVE 3 TAIL / ROLE MODEL FOUNDATION investigation.
> Reference gaps: G-006C, G-006D, OPS-ENV-002, OPS-DB-RECOVER-001.
> This section is a permanent planning anchor — do not rewrite; append updates as addenda.

---

## 1. Agreed 3-Role Model — Stable Contract

### Tenant Admin (Org Admin)
- **Scope:** Single org/tenant. All DB reads and writes are RLS-scoped to one `tenant_id` via `app.org_id`.
- **Identity:** Real tenant user; `memberships` row exists with `MembershipRole` in (OWNER, ADMIN, MEMBER, VIEWER). JWT carries `userId` + `tenantId`.
- **DB context:** `withDbContext` → `app.org_id = <tenantId>`, `app.actor_id = <userId>`, `app.realm = 'tenant'`, `app.bypass_rls = 'off'`. `app.is_admin` is NOT set.
- **RLS enforcement:** `tenant_id = current_setting('app.org_id', true)` arm in all PERMISSIVE policies.
- **Note (current gap → RESOLVED B1):** `MembershipRole` stored in DB and on `request.userRole` but NEVER flows into DB GUC `app.roles`. RLS treats all tenant users identically. Role boundary is app-layer only. See decision point D-5 in gap list below.
- **Architectural decision (GOVERNANCE-SYNC-036 / 2026-03-02):** `app.roles` GUC is intentionally dormant for live requests. The plumbing exists (`withDbContext` sets it when `context.roles` is provided) but `buildContextFromRequest` does not populate `context.roles` for production requests. This is a deliberate choice — the app-layer chain (JWT verify → `getUserMembership()` → `request.userRole` → route guard) is already fail-closed and no currently-open threat model requires a redundant DB-level role gate. **B2 re-entry condition:** revisit only if (a) a new write path is added that a `MEMBER`/`VIEWER` could reach at the DB layer without passing through the app-layer role guard, AND (b) the attack surface cannot be closed by tightening the app-layer guard alone.

### Platform Admin (Control Plane Operator)
- **Scope:** Cross-tenant bounded reads and writes (support, compliance, finance ops). Cross-tenant only where RLS explicitly permits via `app.is_admin = 'true'`.
- **Identity:** Admin principal; `admin_users` row with `AdminRole` in (SUPER_ADMIN, SUPPORT, ANALYST). JWT carries `adminId` + `role`. Middleware: `adminAuthMiddleware` → `request.isAdmin = true`, `request.adminId`, `request.adminRole`.
- **DB context:** `withAdminContext` → sentinel `orgId = actorId = '00000000-0000-0000-0000-000000000001'`, `realm = 'control'`, then `app.is_admin = 'true'`. Context: `buildContextFromRequest` is NOT used for admin routes (would fail-closed on missing `orgId`).
- **RLS enforcement:** `current_setting('app.is_admin', true) = 'true'` arm in PERMISSIVE policies + RESTRICTIVE guard admin arm.
- **Capability flag:** `app.is_admin` is the current runtime capability flag for platform admin identity.

### Superadmin (Platform Controller / Orchestrator) — FUTURE FLAG
- **Scope:** All operations including privileged overrides (e.g., force-void, cross-tenant destructive actions). Must be explicit and audited; never accidental.
- **Identity:** `AdminRole.SUPER_ADMIN` exists in DB enum (schema.prisma line 999) and seeded. `requireAdminRole('SUPER_ADMIN')` helper exported from `auth.ts` line 90. Currently zero runtime differentiation from Platform Admin at DB/RLS level.
- **DB context (not implemented):** No `app.is_superadmin` GUC. No DB function checks for superadmin. Same `withAdminContext` path as Platform Admin — indistinguishable at RLS.
- **Required:** Introduce `app.is_superadmin = 'true'` as a separate GUC; add superadmin-specific policies. See TECS item OPS-RLS-SUPERADMIN-001 (future wave).

---

## 2. CRITICAL DB Vocabulary Mismatch — D-1 — MUST FIX BEFORE CONTINUING

**Status: VALIDATED (realm mismatch fixed) — GOVERNANCE-SYNC-027**

> ✅ Fixed 2026-03-01 via OPS-RLS-ADMIN-REALM-001. `app.require_admin_context()` now checks `realm='control'` + `is_admin='true'` + `actor_id NOT NULL`. impersonation_sessions RLS is no longer dead-code.

### The Mismatch
| Layer | Value set | Source |
|-------|-----------|--------|
| `withAdminContext` (TypeScript) | `realm = 'control'` | `database-context.ts` line ~590; `DatabaseContext` union type = `'tenant' \| 'control'` |
| `app.current_realm()` SQL function comment | values: `'tenant'` or `'control'` | Gate-A migration comment |
| `app.require_admin_context()` | checks `current_realm() = 'admin'` | Gate-D7 migration line 17 |
| **Result** | `require_admin_context()` is **always FALSE** in production | Dead function |

### Impact
Any policy that uses `app.require_admin_context()` as a predicate is permanently fail-closed (always blocks) for all production admin operations:
- `impersonation_sessions` SELECT/INSERT/UPDATE unified policies: all fail-closed → impersonation cannot function under RLS.
- These tables survive today only because the service (`impersonation.service.ts`) uses raw `prisma.$transaction` without `SET LOCAL ROLE texqtic_app`, bypassing RLS as the postgres superuser (`BYPASSRLS`). This is security debt, not correctness.

### Long-term Vocabulary Principle
- `app.realm` is a **plane identifier** only. Values: `tenant`, `control`, `system`, `test`. Do NOT use realm to grant privileges.
- Platform admin capability → explicit flag: `app.is_admin = 'true'` (current) → `app.is_platform_admin = 'true'` (future rename, controlled TECS).
- Superadmin capability → separate flag: `app.is_superadmin = 'true'` (future).
- Never use `realm = 'admin'`; the admin plane IS the control plane (`realm = 'control'`).

### Safe Remediation Path
- **Short term (Wave 3 tail — P0):** Fix `app.require_admin_context()` DB function to treat `realm IN ('control')` as admin-capable, OR retire the function and key off `app.is_admin = 'true'` + `actor_id NOT NULL` directly. Either path resolves the dead-function gap.
- **Medium term:** If `app.is_admin` is renamed to `app.is_platform_admin`, do so via a single controlled TECS with a migration covering all policy references in one transaction.

---

## 3. audit_logs Mixed Policy State — Decision: Option B

**Current state (as of 2026-03-01):**
- `rls.sql` creates `audit_logs_tenant_read` (PERMISSIVE SELECT).
- Migration `20260304000000_gatetest003_audit_logs_admin_select` creates `audit_logs_admin_select` (PERMISSIVE SELECT, `tenant_id IS NULL` only) + extends `audit_logs_guard` RESTRICTIVE with admin arm.
- Gatetest003 verifier DO block expects `audit_logs_select_unified` + `audit_logs_admin_select` = exactly 2 SELECT policies. If `audit_logs_tenant_read` was never dropped, count = 3 → verifier FAIL.

### Option A — Drop audit_logs_admin_select; rely on existing unified tenant policy
**Pros:** Fastest. Minimal SQL touch if unified already has admin arm.
**Cons:**
- If remaining unified policy is tenant-only, platform admin loses cross-tenant audit visibility.
- Does not fix naming drift (`audit_logs_tenant_read` vs expected `audit_logs_select_unified`).
- Higher regression risk: removing known admin gate without confirming remaining policy covers admin arm.
- **Only safe if** live `pg_policies.qual` for the remaining SELECT policy explicitly includes `OR current_setting('app.is_admin', true) = 'true'`.

### Option B — Single unified SELECT policy with tenant OR admin arm; remove extra admin policy ✅ CHOSEN
**Pros:**
- Cleanest structure: one PERMISSIVE SELECT for `texqtic_app`.
- Explicitly enforces cross-tenant admin reads through `app.is_admin`.
- Removes naming drift; establishes canonical policy name `audit_logs_select_unified`.
- Future-proof: add `OR current_setting('app.is_superadmin', true) = 'true'` arm without creating new policies.

**Required reconciliation steps for Option B:**
1. Drop `audit_logs_tenant_read` (rls.sql name) and `audit_logs_admin_select`.
2. Create `audit_logs_select_unified` with qual:
   - `(org_id IS NOT NULL AND tenant_id::text = current_setting('app.org_id', true))` — tenant arm
   - `OR current_setting('app.is_admin', true) = 'true'` — platform admin arm (cross-tenant, NO `tenant_id IS NULL` restriction — see key semantic decision below)
3. Confirm gatetest003-equivalent verifier count = 1 (unified) + verify RESTRICTIVE guard unchanged.

**Key semantic decision recorded:** Platform admin cross-tenant audit reads SHOULD include tenant-scoped rows (not only `tenant_id IS NULL`). Rationale: admin investigation requires reading "what did tenant X do?" The `tenant_id IS NULL` restriction in `audit_logs_admin_select` was a conservative first pass; Option B removes it. Mandatory compensating control: all control-plane read endpoints that query `audit_logs` MUST log via `writeAuditLog` (see D-3 gap, and TECS item below).

**Decision:** Option B. Record: "audit_logs SELECT consolidation → single `audit_logs_select_unified` policy; admin arm without `tenant_id IS NULL` restriction; mandatory read-audit logging on all control-plane GET /audit-logs handlers."

---

## 4. Gap List — Wave 3 Tail Specific Gaps

| ID | Gap | Severity | First identified |
|----|-----|---------|-----------------|
| D-1 | `app.require_admin_context()` always returns FALSE in production; `realm = 'admin'` never set; impersonation RLS dead-code | **CRITICAL** | 2026-03-01 investigation |
| D-2A | `AdminRole.SUPER_ADMIN` — capability plumbing: zero runtime GUC differentiation from other admin roles | **VALIDATED — OPS-SUPERADMIN-CAPABILITY-001 / GOVERNANCE-SYNC-033** (plumbing only: `withSuperAdminContext` + `app.is_superadmin` GUC set; proof endpoint `/whoami` verified) | 2026-03-01 investigation |
| D-2B | `AdminRole.SUPER_ADMIN` — capability enforcement: no route-level OR DB-level guard prevents SUPPORT/ANALYST from reaching SUPER_ADMIN-only surfaces | **VALIDATED — OPS-SUPERADMIN-ENFORCEMENT-001 / GOVERNANCE-SYNC-034** (`requireAdminRole('SUPER_ADMIN')` preHandler on 5 surfaces; tenant provision audit gap also closed) | 2026-03-01 investigation |
| D-3 | All admin READ endpoints (`GET /api/control/*`) are unlogged — no `writeAuditLog` call on any of 9 GET handlers | **VALIDATED — OPS-CONTROL-READ-AUDIT-001 / GOVERNANCE-SYNC-032** | 2026-03-01 investigation |
| D-4 | `impersonation.service` uses raw `prisma.$transaction` without `SET LOCAL ROLE texqtic_app` — operates as postgres BYPASSRLS superuser; RLS not enforced for impersonation writes | **VALIDATED (BYPASSRLS path removed) — GOVERNANCE-SYNC-028** | 2026-03-01 investigation |
| D-5 | `MembershipRole` (OWNER/ADMIN/MEMBER/VIEWER) never flows to `app.roles` GUC; RLS treats all tenant users identically — role boundary is app-layer only. **Decision B1:** DB role-agnostic by design; `app.roles` intentionally never activated for live requests; role enforcement is app-layer only (JWT → membership lookup → `request.userRole` → route guard). B2 re-entry condition documented in Role Model section above. | **RESOLVED (B1 — app-layer only)** | 2026-03-01 investigation; resolved 2026-03-02 GOVERNANCE-SYNC-036 |
| D-6 | `audit_logs` mixed policy naming: `audit_logs_tenant_read` (rls.sql) coexists with gatetest003 expectation of `audit_logs_select_unified`; verifier may fail depending on apply order | **VALIDATED — GOVERNANCE-SYNC-029** | 2026-03-01 investigation |
| D-7 | `audit_logs_admin_select` restricts admin reads to `tenant_id IS NULL` rows only — blocks cross-tenant investigation reads | **VALIDATED — GOVERNANCE-SYNC-029** | 2026-03-01 investigation (resolved by Option B above) |
| D-8 | `withDbContext` sets `bypass_rls = 'off'` but does NOT explicitly reset `app.is_admin`; pooler theoretically could bleed `is_admin='true'` from prior tx (mitigated by SET LOCAL semantics) | **LOW** | 2026-03-01 investigation |

---

## 5. Wave 3 Tail — Priority Ladder (No-Drift Execution Order)

Established 2026-03-01. Must not be reordered without a new governance anchor.

```
P0 — OPS-RLS-ADMIN-REALM-001
     Fix require_admin_context() dead function (D-1)
     Blocks: impersonation RLS correctness; D-4 fix pre-req
     Direction: keep realm='control'; update DB function to check
                realm IN ('control') instead of realm = 'admin',
                OR remove realm check entirely and key off
                app.is_admin + actor_id NOT NULL
     → MUST complete before Wave 3.1+ RLS consolidation resumes

P1 — G-006C-AUDIT-LOGS-UNIFY-001
     Resolve audit_logs mixed state using Option B (D-6, D-7)
     + add control-plane read-audit logging (D-3)
     Targets:
       - Platform admin can read cross-tenant audit rows (no tenant_id IS NULL)
       - Tenant admin reads only own-tenant rows
       - Admin GET /api/control/audit-logs is logged via writeAuditLog
     → Only after P0

P2 — Remaining G-006C RLS consolidation waves
     (carts, cart_items, memberships, other tables per wave board)
     → Only after P0 + P1
```

---

## 6. Queued TECS Sequence (Plan → Implement)

| TECS ID | Title | Priority | Blocks | Notes |
|---------|-------|---------|--------|-------|
| **OPS-RLS-ADMIN-REALM-001** | Fix admin realm mismatch — `require_admin_context()` dead function | ✅ COMPLETE | All control-plane RLS correctness; impersonation.service refactor | Migration `20260301120000_ops_rls_admin_realm_fix` applied. GOVERNANCE-SYNC-027. |
| **G-006C-AUDIT-LOGS-UNIFY-001** | audit_logs Option B consolidation + admin-view audit logging | ✅ COMPLETE | D-3, D-6, D-7 | Single `audit_logs_select_unified` (tenant+admin arms). Admin sees 93 rows cross-tenant. Legacy policies dropped. `ADMIN_AUDIT_LOG_VIEW` auditing added to GET /audit-logs. GOVERNANCE-SYNC-029. |
| **OPS-IMPERSONATION-RLS-001** | Wire `impersonation.service` through `withAdminContext` (fix D-4) | ✅ COMPLETE | Impersonation security correctness | All 3 functions use `withAdminContext`. Typecheck EXIT 0. Lint 0 errors. RLS verified. GOVERNANCE-SYNC-028. |
| **G006C-ORDERS-GUARD-001** | orders + order_items: RESTRICTIVE guard (FOR ALL TO texqtic_app) + role normalization {public} → texqtic_app + admin arm preserved as `current_setting('app.is_admin')` (NOT bypass_enabled — confirmed non-equivalent in Gate 1) | ✅ COMPLETE | P0 gate | Migration `20260302000000_g006c_orders_guard_normalize` applied psql EXIT:0; DO block VERIFIER PASS; SIM1 tenant=org-scoped ✅; SIM2 control+nonadmin=0 rows ✅; SIM3 control+admin=4 rows cross-tenant ✅; Prisma ledger synced; GOVERNANCE-SYNC-030 |
| **G006C-EVENT-LOGS-CLEANUP-001** | event_logs: DROP 2 orphan PERMISSIVE ALL deny policies (anon + authenticated) | ✅ COMPLETE | Pre-req: G006C-ORDERS-GUARD-001 COMPLETE ✅ | Migration `20260302010000_g006c_event_logs_cleanup` applied psql EXIT:0; DO block VERIFIER PASS; 0 PERMISSIVE ALL remain; guard {texqtic_app} intact; select+insert_unified intact; Prisma ledger synced; GOVERNANCE-SYNC-031 |
| **OPS-CONTROL-READ-AUDIT-001** | Control-plane GET read auditing coverage (no SQL) — 14 GET handlers across 6 route files now emit `writeAuditLog(prisma, createAdminAudit(...))` on 200 success; action strings: `control.tenants.read`, `control.tenants.read_one`, `control.feature_flags.read`, `control.events.read`, `control.finance.payouts.read`, `control.compliance.requests.read`, `control.disputes.read`, `control.trades.read`, `control.escrows.read`, `control.escrows.read_one`, `control.certifications.read`, `control.certifications.read_one`, `control.escalations.read`, `control.traceability.nodes.read`, `control.traceability.edges.read`; audit_logs.read (`ADMIN_AUDIT_LOG_VIEW`) pre-existing; `/system/health` excluded (infrastructure) | ✅ COMPLETE | D-3 | Files: `control.ts`, `control/trades.g017.ts`, `control/escrow.g018.ts`, `control/certifications.g019.ts`, `control/escalation.g022.ts`, `admin/traceability.g016.ts`. Typecheck EXIT 0. Sim A: 2 rows confirmed. Sims B+C: 0 rows. GOVERNANCE-SYNC-032. |
| **OPS-SUPERADMIN-CAPABILITY-001** | Superadmin capability flag + canonical DB context helper — `withSuperAdminContext` exported from `database-context.ts`; sets `app.is_admin='true'` + `app.is_superadmin='true'` (tx-local); no RLS policy changes; no renaming of `app.is_admin`; proof endpoint `GET /api/control/whoami` returns `adminRole`, `isSuperAdmin`, `contextMode` | ✅ COMPLETE | D-2A (plumbing) | Files: `server/src/lib/database-context.ts`, `server/src/routes/control.ts`. Typecheck EXIT 0. Lint EXIT 0. DB Sims A/B/C PASS. GOVERNANCE-SYNC-033. D-2B (enforcement) remains OPEN — see OPS-SUPERADMIN-ENFORCEMENT-PLAN-001. |
| **OPS-SUPERADMIN-ENFORCEMENT-001** | SUPER_ADMIN route-layer enforcement — `requireAdminRole('SUPER_ADMIN')` preHandler on 9 route registrations across 5 high-risk surfaces: impersonation start+stop, tenant provision, payout approve+reject, escalation upgrade+resolve, feature-flag PUT. Also closes tenant provision audit gap (Tier B: `control.tenants.provisioned`). No RLS changes. No schema changes. | ✅ COMPLETE | D-2B (enforcement) | Files: `admin/impersonation.ts`, `admin/tenantProvision.ts`, `control.ts`, `control/escalation.g022.ts`. Typecheck EXIT 0. Lint EXIT 0. GOVERNANCE-SYNC-034. |
| **OPS-CONTROL-HARDENING-PHASE-2-001** | Control Plane Hardening Phase 2 — drift & audit CI guardrails. Static scan of all 10 control-plane route files; Guard 1: write-side audit enforcement (17 mutation routes, 0 violations); Guard 2: SUPER_ADMIN surface lock (8/8 surfaces confirmed gated); CI artifact `artifacts/control-plane-manifest.json` (37 routes). No runtime logic changes. No DB changes. No auth changes. No migrations. | ✅ COMPLETE | — | Files: `scripts/control-plane-manifest.ts`, `scripts/control-plane-guard.ts`, `.github/workflows/control-plane-guard.yml`, `package.json` (scripts only). Guard EXIT 0 on main. GOVERNANCE-SYNC-035. |
| **G-006C-WAVE3-REMAINING** | Remaining Wave 3 RLS consolidation (carts, memberships, other tables) | P2 | — | Resume per wave-2-board.md after P0 + P1 complete |
| **OPS-RLS-SUPERADMIN-001** | Introduce `app.is_superadmin` GUC + superadmin-specific policies | Future / Wave 4+ | Console planning | Distinct runtime capability for SuperAdmin beyond Platform Admin |

---

## 7. Validation Proof — OPS-RLS-ADMIN-REALM-001 (GOVERNANCE-SYNC-027)

**Date:** 2026-03-01
**Migration:** 20260301120000_ops_rls_admin_realm_fix
**Prisma ledger:** marked applied via prisma migrate resolve --applied

### Pre-apply function body (recorded)
```sql
SELECT app.current_realm() = 'admin'
  AND app.current_actor_id() IS NOT NULL;
```

### Post-apply function body (confirmed)
```sql
SELECT
    current_setting('app.realm', true) = 'control'
    AND NULLIF(current_setting('app.actor_id', true), '') IS NOT NULL
    AND current_setting('app.is_admin', true) = 'true';
```

### Simulation Results

| Test | Realm | actor_id | is_admin | Expected | Result |
|------|-------|----------|----------|----------|--------|
| TEST2_control_admin | control | set | true | 	rue | ✅ 	 |
| TEST3_tenant_admin | tenant | set | true | alse | ✅  |
| TEST4_control_nonadmin | control | set | false | alse | ✅  |

All 3 simulations PASS. D-1 closed.

---

## 8. Capability Vocabulary Anchor (OPS-SUPERADMIN-CAPABILITY-001 / GOVERNANCE-SYNC-033)

**Established:** 2026-03-02

Canonical vocabulary for TexQtic runtime authorization context:

| Concept | GUC / field | Values | Notes |
|---------|-------------|--------|-------|
| **Plane / Realm** | `app.realm` | `tenant` \| `control` \| `system` \| `test` | Set by `withDbContext` via `DatabaseContext.realm` |
| **Platform Admin flag** | `app.is_admin` | `'true'` only | Set by `withAdminContext` and `withSuperAdminContext`; checked by `_admin_all` RLS policies |
| **Superadmin capability flag** | `app.is_superadmin` | `'true'` only | Set ONLY by `withSuperAdminContext`; tx-local; no RLS policies use this yet (future wave) |

**Rules (non-negotiable):**
- `withDbContext` MUST NOT set or clear `app.is_superadmin`
- `withAdminContext` MUST NOT set `app.is_superadmin`
- `app.is_admin` is NOT renamed in this TECS (rename deferred to future wave)
- Superadmin is always a strict superset of Platform Admin (`is_admin=true AND is_superadmin=true`)

---

## 9. CI Guardrail Proof — OPS-CONTROL-HARDENING-PHASE-2-001 (GOVERNANCE-SYNC-035)

**Date:** 2026-03-02  
**Files added:** `scripts/control-plane-manifest.ts`, `scripts/control-plane-guard.ts`, `.github/workflows/control-plane-guard.yml`  
**Runtime impact:** None — CI static analysis only. No route files changed. No auth middleware changed. No schema changed.

### Guard 1 — Write-side Audit Enforcement

Scans all mutation routes (POST|PUT|PATCH|DELETE) under `/api/control` for file-level audit token presence.

| Route | Audit Evidence | Result |
|-------|---------------|--------|
| PUT /api/control/feature-flags/:param | writeAuditLog | ✅ |
| POST /api/control/finance/payouts/:param/approve | writeAuthorityIntent | ✅ |
| POST /api/control/finance/payouts/:param/reject | writeAuthorityIntent | ✅ |
| POST /api/control/compliance/requests/:param/approve | writeAuthorityIntent | ✅ |
| POST /api/control/compliance/requests/:param/reject | writeAuthorityIntent | ✅ |
| POST /api/control/disputes/:param/resolve | writeAuthorityIntent | ✅ |
| POST /api/control/disputes/:param/escalate | writeAuthorityIntent | ✅ |
| POST /api/control/escalations | writeAuditLog | ✅ |
| POST /api/control/escalations/:param/upgrade | writeAuditLog | ✅ |
| POST /api/control/escalations/:param/resolve | writeAuditLog | ✅ |
| POST /api/control/trades/:param/transition | writeAuditLog | ✅ |
| POST /api/control/escrows/:param/transition | writeAuditLog | ✅ |
| POST /api/control/settlements/preview | allowlisted (D-020-B: read-only POST) | ✅ |
| POST /api/control/settlements | writeAuditLog | ✅ |
| POST /api/control/impersonation/start | service-delegation (confirmed in impersonation.service) | ✅ |
| POST /api/control/impersonation/stop | service-delegation (confirmed in impersonation.service) | ✅ |
| POST /api/control/tenants/provision | writeAuditLog | ✅ |

**Mutation routes checked: 17. Violations: 0.**

### Guard 2 — SUPER_ADMIN Surface Lock

| Surface | Source File | preHandler Guard | Result |
|---------|-------------|-----------------|--------|
| POST /api/control/impersonation/start | admin/impersonation.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/impersonation/stop | admin/impersonation.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/tenants/provision | admin/tenantProvision.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/finance/payouts/:param/approve | control.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/finance/payouts/:param/reject | control.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/escalations/:param/upgrade | control/escalation.g022.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/escalations/:param/resolve | control/escalation.g022.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| PUT /api/control/feature-flags/:param | control.ts | requireAdminRole('SUPER_ADMIN') | ✅ |

**Required surfaces: 8. Gated: 8. Violations: 0.**

### Guard Run Output (on main)

```
guard EXIT 0
Routes scanned: 37 across 10 files
Mutation routes checked: 17
Audit violations: 0
SUPER_ADMIN violations: 0
Artifact: artifacts/control-plane-manifest.json
```

### Allowlist Design Decisions

| Category | Entry | Rationale |
|----------|-------|----------|
| Write-audit allowlist | `POST /api/control/settlements/preview` | D-020-B: balance derived from ledger SUM; zero DB mutations; zero state changes; POST used only for request body (not mutation semantics) |
| Service-delegation | `server/src/routes/admin/impersonation.ts` | Audit written by `startImpersonation()` / `stopImpersonation()` service functions; confirmed at Phase 2 Review 2026-03-02 |

