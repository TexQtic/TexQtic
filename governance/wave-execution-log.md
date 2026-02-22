# TEXQTIC — WAVE EXECUTION LOG

---

## Entry Template

### Wave X — \<Wave Name\>

Start Date:
End Date:
Branch:
Tag:

#### Objective

Brief description of what this wave accomplishes.

#### Gaps Included

- G-XXX
- G-XXX

#### Commits

- \<commit hash\> — description
- \<commit hash\> — description

#### Validation Evidence

- RLS Proof:
- Cross-Tenant Test:
- Regression Flow:

#### Coverage Matrix Impact

What moved from Partial → Implemented?

#### Governance Notes

Lessons learned / adjustments required.

---

# Wave 2 — Stabilization (In Progress)

Start Date: 2026-02-21
End Date: —
Branch: main
Tag: —

#### Objective

Unify RLS tenant context variable from `app.tenant_id` (legacy) to `app.org_id` (canonical per Decision-0001). Enforce FORCE RLS on commerce tables. Add orders/order_items policies. Standardize middleware and clean up dual-context pattern.

#### G-001 — VALIDATED 2026-02-21

- Commit `25a5519` — initial context variable substitution in all policy bodies (`rls.sql`)
- Commit `1389ed7` — add comprehensive legacy DROP POLICY cleanup block (old per-op naming: `_tenant_select/_insert/_update/_delete` variants dropped; orphan `tenants_tenant_read` + `users_tenant_read` dropped)
- Proof run output:
  - Step 1: 0 policies reference `app.tenant_id` ✅
  - Step 2: 20 policies reference `app.org_id` ✅
  - Step 3: Cross-tenant isolation — WL context reads 0 non-WL cart rows ✅

#### G-002 — VALIDATED 2026-02-21

- Commit `2d16e73` — `migrations/pr-g002-force-rls.sql` ENABLE + FORCE RLS on 13 tenant-scoped tables
- Applied via psql to live Supabase
- Proof run output:
  - Step 1: All 13 tables relrowsecurity=true, relforcerowsecurity=true ✅
    - Tables covered: ai_budgets, ai_usage_meters, audit_logs, cart_items, carts, catalog_items, invites, memberships, order_items, orders, tenant_branding, tenant_domains, tenant_feature_overrides
  - Step 2: Cross-tenant carts COUNT(\*) = 0 (WL context, non-WL filter) ✅
  - Step 3: Positive control — WL own carts query succeeded without error ✅

#### G-003 — VALIDATED 2026-02-21 (no SQL change required)

- No commit — live policies were already correct (applied in prior hardening waves)
- Phase 1 audit result (6 policies for orders + order_items):
  - `orders_tenant_select` (SELECT) — USING `app.org_id IS NOT NULL AND app.org_id <> '' AND tenant_id = app.org_id::uuid` ✅
  - `orders_tenant_insert` (INSERT) — WITH CHECK same predicate ✅
  - `orders_admin_all` (ALL) — USING `app.is_admin = 'true'` ✅
  - `order_items_tenant_select` (SELECT) — same predicate ✅
  - `order_items_tenant_insert` (INSERT) — WITH CHECK same predicate ✅
  - `order_items_admin_all` (ALL) — admin bypass ✅
- `app.tenant_id` references: 0 ✅
- Phase 3 proof:
  - Cross-tenant orders COUNT(\*) = 0 (WL context, non-WL filter) ✅
  - Positive control (own-tenant orders COUNT) = 0, no error ✅

#### Quality Gate Decision — 2026-02-21

- Command: `pnpm run typecheck` → EXIT 0 ✅ (after fix: implicit-any in `tenant.ts:662/678` resolved — `cartItems` typed const + `typeof cartItems[number]` callbacks)
- Command: `pnpm run lint` → EXIT 1 ❌ — 23 errors, 1 warning in FRONTEND files only (pre-existing debt, unrelated to Wave-2 RLS work)
- Command: `pnpm -C server run typecheck` → EXIT 0 ✅
- Command: `pnpm -C server run lint` → EXIT 0 ✅ (67 warnings, 0 errors — warnings-only, not blocked)
- **Decision:** Adopt server-scope gate split for Wave-2 execution. Root lint deferred, tracked as G-QG-001 (Wave 3 / cleanup bucket). Wave-2 tasks MAY proceed when server gates pass.
- Frontend lint failures summary:
  - `App.tsx` — unused vars (`tenantsLoading`, `tenantsError`) + missing `useEffect` dep
  - `Auth/ForgotPassword.tsx`, `Auth/TokenHandler.tsx`, `Auth/VerifyEmail.tsx` — `React` not defined in JSX
  - `Auth/AuthFlows.tsx` — `AUTH_DEBUG` unused
  - `Cart/Cart.tsx` — `LoadingState` unused, `currentQuantity` unused arg
  - `ControlPlane/AuditLogs.tsx`, `ControlPlane/TenantRegistry.tsx` — `LoadingState` unused
  - `ControlPlane/EventStream.tsx` — `EmptyState` unused + setState-in-effect
  - `constants.tsx` — `TenantType`, `TenantConfig`, `TenantStatus` unused imports
  - `services/apiClient.ts` — `AbortController` not defined (2 occurrences)

#### G-013 — VALIDATED 2026-02-21

- Commit `7f474ab` — `feat(ci): add PR-gated RLS cross-tenant 0-row proof (G-013)`
- Files: `server/scripts/ci/rls-proof.ts`, `.github/workflows/rls-proof.yml`, `server/package.json` (script `ci:rls-proof`)
- Gate outputs prior to commit:
  - `pnpm -C server run typecheck` → EXIT 0 ✅
  - `pnpm -C server run lint` → EXIT 0 ✅ (67 warnings, 0 errors)
- Proof run output (`pnpm run ci:rls-proof`):
  - Step 1 — Legacy policy variable check: `app.tenant_id` references = **0** ✅
  - Step 2 — Tenant A (ACME) isolation: cross-tenant rows = **0**, own-tenant rows = **2** (non-vacuous) ✅
  - Step 3 — Tenant B (WL) isolation: cross-tenant rows = **0**, own-tenant rows = **0** (positive control executed) ✅
  - Result: `ALL STEPS PASS — RLS isolation verified (G-013)` EXIT 0
- CI workflow: `.github/workflows/rls-proof.yml` — triggers on `pull_request` → `[main, develop]`
  - Required secrets: `DATABASE_URL`, `CI_TENANT_A_ID`, `CI_TENANT_B_ID`
  - Steps: checkout → Node 22 → pnpm → install → validate secrets → typecheck → lint → ci:rls-proof
  - Missing secrets → hard FAIL (silence is never a pass)

#### Gaps In Progress

- G-004 — Stabilization: unify control plane DB context (VALIDATED, governance pending commit)

---

#### G-004 — VALIDATED 2026-02-21

- Commit `a19f30b` — `fix(control): unify db context usage to canonical pattern (G-004)`
- File changed: `server/src/routes/control.ts` (1 file, 44 insertions, 23 deletions)
- Changes:
  - Removed `import { withDbContext as withDbContextLegacy } from '../db/withDbContext.js'`
  - Added `import { randomUUID } from 'node:crypto'`
  - Added `import { Prisma, type EventLog } from '@prisma/client'` (EventLog type for 3 map callbacks)
  - Added module-level `withAdminContext<T>` helper: uses canonical `withDbContext` + `SET LOCAL ROLE texqtic_app` + `app.is_admin = 'true'` for cross-tenant admin reads
  - Migrated 13 `withDbContextLegacy({ isAdmin: true })` call sites: 7 read routes (prisma → tx), 6 authority-intent write routes (`_tx` unused param, `writeAuthorityIntent(prisma, ...)` preserved)
  - Replaced dynamic `(await import('node:crypto')).randomUUID()` with static `randomUUID()` in provision route
- Gate outputs (post-implementation):
  - `pnpm -C server run typecheck` → EXIT 0 ✅
  - `pnpm -C server run lint` → EXIT 0 ✅ (68 warnings, 0 errors)
- Verification: `Get-Content control.ts | Select-String 'withDbContextLegacy' | Where notmatch '^//'` → 0 results ✅

---

#### G-005-BLOCKER — VALIDATED 2026-02-22

- Commit `b060f60` — `fix(rls): add tenant-scoped SELECT policy for public.users (login unblock)`
- File changed: `server/prisma/rls.sql` (1 file, 20 insertions, 3 deletions)
- Root cause:
  - `supabase_hardening.sql` applied `ENABLE + FORCE ROW LEVEL SECURITY` on `public.users`
  - G-001 legacy cleanup dropped `users_tenant_read` without a replacement
  - `texqtic_app` with any `app.org_id` context returned 0 rows (PostgreSQL deny-all when FORCE RLS + no policy)
  - Auth route: `withDbContext({ tenantId }, tx => tx.user.findUnique(...))` → `result = null` → `AUTH_INVALID 401`
- Fix:
  - Added `users_tenant_select` policy: `EXISTS (memberships m WHERE m.user_id = users.id AND m.tenant_id = app.org_id::uuid) OR is_admin = 'true'`
  - Pattern consistent with all other tenant-scoped tables; no cross-tenant reads possible
- Applied via: `psql --dbname="$DATABASE_URL" -v ON_ERROR_STOP=1 --file=prisma/rls.sql` → APPLY_EXIT:0
- Proof 1 (policy in pg_policies):
  - `users_tenant_select` present · cmd=SELECT · qual contains `app.org_id` + `EXISTS (memberships m ...)` ✅
- Proof 2 (member read):
  - `SET LOCAL ROLE texqtic_app; set_config('app.org_id', ACME_UUID)` → `SELECT ... owner@acme.example.com` → **1 row** ✅
- Proof 3 (cross-tenant blocked):
  - `SET LOCAL ROLE texqtic_app; set_config('app.org_id', WL_UUID)` → `SELECT ... owner@acme.example.com` → **0 rows** ✅
- Gate outputs:
  - `pnpm -C server run typecheck` → EXIT 0 ✅
  - `pnpm -C server run lint` → EXIT 0 ✅ (68 warnings, 0 errors)

---

#### G-TENANTS-SELECT — VALIDATED 2026-02-22

- Commit `94da295` — `fix(rls): allow app_user select on tenants scoped by app.org_id`
- File changed: `server/prisma/rls.sql` (1 file, 14 insertions, 1 deletion)
- Root cause:
  - `supabase_hardening.sql` installed `tenants_deny_all` (FOR ALL USING false) on `public.tenants` as defence-in-depth
  - No matching SELECT policy existed for `app_user` (NOBYPASSRLS role)
  - Prisma fetches `membership.tenant` as a nested relation during login; FORCE RLS → 0 rows → Prisma resolves relation as `null`
  - `auth.ts` reads `membership.tenant.status` without null guard → TypeError → 500 INTERNAL_ERROR `"Login failed"`
  - This code path was unreachable before G-005-BLOCKER (user reads returned 0 → `result = null` → 401, never reached membership.tenant)
- Fix:
  - Added `tenants_app_user_select` policy: `id::text = current_setting('app.org_id', true) OR is_admin = 'true'`
  - Exposure strictly one row: `tenants.id == app.org_id` — no tenant listing possible without org_id
  - `tenants_deny_all` (FOR ALL/false) remains intact; permissive policies are OR-combined per Postgres semantics — it continues blocking anon/authenticated roles
- Applied via: `psql "--dbname=$dbUrl" -f __apply_tenants_policy.sql` → APPLY_EXIT:0
- Proof A (policy in pg_policies):
  - `tenants_app_user_select` present · cmd=SELECT · qual=`id::text = app.org_id OR is_admin = 'true'` ✅
  - `tenants_deny_all` still present · cmd=ALL · qual=false ✅
- Proof B (negative control — cross-tenant):
  - `SET LOCAL ROLE app_user; set_config('app.org_id', ACME_UUID)` → `SELECT id FROM tenants WHERE id = WL_UUID` → **0 rows** ✅
- Proof C (positive control — same-tenant):
  - `SET LOCAL ROLE app_user; set_config('app.org_id', ACME_UUID)` → `SELECT id, status FROM tenants WHERE id = ACME_UUID` → **1 row, ACTIVE** ✅
- Proof D (login path via set_tenant_context):
  - `SET LOCAL ROLE app_user; set_tenant_context(ACME_UUID)` → `SELECT id, status FROM tenants WHERE id = ACME_UUID` → **1 row, ACTIVE** ✅
- Gate outputs:
  - `pnpm -C server run typecheck` → EXIT 0 ✅
  - `pnpm -C server run lint` → EXIT 0 ✅ (68 warnings, 0 errors)
- Risk assessment:
  - Row exposure: strictly `tenants.id == app.org_id` — one row max, no listing
  - Aligns with Doctrine v1.4 canonical context = `app.org_id`
  - `tenants_deny_all` remains as baseline guardrail for non-app_user roles
- Follow-up (not in scope): add null guard `membership.tenant?.status` in auth.ts to convert future RLS denials to 401/403 instead of 500 (Wave 2 tail hardening)

---

# Wave History

### Wave DB-RLS-0001 — RLS Context Model Foundation

Start Date: 2026-02-12
End Date: 2026-02-21 (ongoing / Phase-1 baseline)
Branch: main
Tag: —

#### Objective

Establish constitutional RLS enforcement via transaction-local context. Implement `withDbContext` (canonical), `buildContextFromRequest`, `databaseContextMiddleware`. Validate commerce flow (auth → cart → checkout → orders) as Phase-1 baseline.

#### Gaps Included

- G-001 (partially — new context model implemented; policy migration pending)
- G-003 (partially — `orders`/`order_items` policies confirmed missing)

#### Commits

- (See git log — Phase-1 commerce flow implementation)

#### Validation Evidence

- RLS Proof: `server/prisma/verify-rls-data.ts` — manual; not CI-gated
- Cross-Tenant Test: Manual psql verification on `orders`/`order_items`
- Regression Flow: Phase-1 commerce flow validated end-to-end

#### Coverage Matrix Impact

- Commerce Core: Cart lifecycle → **Implemented**
- Commerce Core: Checkout → **Implemented**
- Commerce Core: Orders + OrderItems → **Implemented**
- Auth / JWT claims → **Implemented**
- Realm guard → **Implemented**
- AI budget enforcement → **Implemented**
- Audit log (commerce + admin) → **Implemented**

#### Governance Notes

- Critical divergence found: `app.tenant_id` (old policies) vs `app.org_id` (new context) — G-001 must be Priority 1 in Wave 2
- Two `withDbContext` implementations exist — G-004 must be resolved before Wave 2 tests are meaningful
- `orders`/`order_items` RLS policies appear absent — G-003 is 🔴 Critical

---

### Wave 2 — Monolith Stabilization

Start Date: —
End Date: —
Branch: wave-2-stabilization (planned)
Tag: —

#### Objective

Unify RLS context variable (`app.org_id`), add missing policies for `orders`/`order_items`, FORCE RLS on commerce tables, remove legacy `withDbContext`, standardize middleware, and add CI cross-tenant 0-row proof.

#### Gaps Included

- G-001, G-002, G-003, G-004, G-005, G-006, G-007, G-008, G-009, G-010, G-011, G-012, G-013, G-014

#### Commits

— (not started)

#### Validation Evidence

— (not started)

#### Coverage Matrix Impact

— (pending)

#### Governance Notes

— (pending)
