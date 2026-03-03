-- ============================================================================
-- G-006C P2: RLS Unify — impersonation_sessions
-- TECS ID  : G-006C-P2-IMPERSONATION_SESSIONS-RLS-UNIFY-001
-- Date     : 2026-03-03
-- Doctrine : v1.4
-- Pattern  : Admin-only variant of Wave 3 Tail canonical pattern.
--            impersonation_sessions is a CONTROL-PLANE ONLY table.
--            Tenant JWT access must be REJECTED (test: line 149,
--            gate-d7-impersonation-sessions-rls.integration.test.ts).
--
-- Problem:
--   impersonation_sessions has 5 non-canonical policies:
--   1. RESTRICTIVE guard named `restrictive_guard` applies to {public}
--      (all roles), is missing the is_admin arm, and has a non-standard
--      WITH CHECK clause (guards must use USING only).
--   2. PERMISSIVE SELECT/INSERT/UPDATE use OR bypass_enabled() as admin arm
--      instead of is_admin='true'.
--   3. PERMISSIVE DELETE has NO admin arm at all — only bypass_enabled().
--      CRITICAL: any actor with bypass can delete impersonation sessions
--      without admin context.
--   This migration rebuilds all policies to the admin-only Wave 3 Tail pattern.
--
-- Admin-only design intent:
--   impersonation_sessions is scoped to admin actors ONLY.
--   - tenant_id column records the impersonated tenant but does NOT restrict
--     access (it is metadata, not a RLS predicate).
--   - Actor arm: admin_id = app.current_actor_id()
--   - Guard: require_admin_context() (not require_org_context())
--   - NO tenant arm in any PERMISSIVE policy.
--   - Tenant JWTs are rejected by the RESTRICTIVE guard via require_admin_context().
--
-- BEFORE (5 policies, non-canonical):
--   restrictive_guard                     RESTRICTIVE ALL  {public}      — require_admin_context() OR bypass_enabled()  [wrong role; no is_admin; WITH CHECK on guard]
--   impersonation_sessions_select_unified PERMISSIVE  SEL  {texqtic_app} — (require_admin_context() AND admin_id=current_actor_id()) OR bypass_enabled()  [wrong admin arm]
--   impersonation_sessions_insert_unified PERMISSIVE  INS  {texqtic_app} — same WITH CHECK pattern  [wrong admin arm]
--   impersonation_sessions_update_unified PERMISSIVE  UPD  {texqtic_app} — same USING+WITH CHECK  [wrong admin arm]
--   impersonation_sessions_delete_unified PERMISSIVE  DEL  {texqtic_app} — bypass_enabled() ONLY  [NO admin arm — CRITICAL]
--
-- AFTER (canonical admin-only Wave 3 Tail pattern):
--   impersonation_sessions_guard           RESTRICTIVE ALL  {texqtic_app} — require_admin_context() OR is_admin='true' OR bypass_enabled()
--   impersonation_sessions_select_unified  PERMISSIVE  SEL  {texqtic_app} — (require_admin_context() AND admin_id=current_actor_id()) OR is_admin='true'
--   impersonation_sessions_insert_unified  PERMISSIVE  INS  {texqtic_app} — (require_admin_context() AND admin_id=current_actor_id()) OR is_admin='true'
--   impersonation_sessions_update_unified  PERMISSIVE  UPD  {texqtic_app} — (require_admin_context() AND admin_id=current_actor_id()) OR is_admin='true'
--   impersonation_sessions_delete_unified  PERMISSIVE  DEL  {texqtic_app} — (require_admin_context() AND admin_id=current_actor_id()) OR is_admin='true'
-- ============================================================================
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- STEP 1: Drop all existing policies for impersonation_sessions
-- Covers: current non-canonical set + non-standard guard name + legacy variants
-- NOTE: Existing guard is named `restrictive_guard` (non-standard) — must be
-- explicitly dropped by that name in addition to the canonical name.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS restrictive_guard ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_guard ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_guard_policy ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_select_unified ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_insert_unified ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_update_unified ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_delete_unified ON public.impersonation_sessions;
-- legacy gate-d7 / safety-net variants
DROP POLICY IF EXISTS admin_select ON public.impersonation_sessions;
DROP POLICY IF EXISTS admin_insert ON public.impersonation_sessions;
DROP POLICY IF EXISTS admin_update ON public.impersonation_sessions;
DROP POLICY IF EXISTS admin_delete ON public.impersonation_sessions;
DROP POLICY IF EXISTS bypass_select ON public.impersonation_sessions;
DROP POLICY IF EXISTS bypass_insert ON public.impersonation_sessions;
DROP POLICY IF EXISTS bypass_update ON public.impersonation_sessions;
DROP POLICY IF EXISTS bypass_delete ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_admin_select ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_admin_insert ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_admin_update ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_admin_delete ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_bypass_select ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_bypass_insert ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_bypass_update ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_bypass_delete ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_admin_access ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_admin_all ON public.impersonation_sessions;
-- ─────────────────────────────────────────────────────────────
-- STEP 2: Confirm FORCE RLS (should already be t/t from G-002)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions FORCE ROW LEVEL SECURITY;
-- ─────────────────────────────────────────────────────────────
-- STEP 3: RESTRICTIVE guard — admin-only Wave 3 Tail pattern
-- FOR ALL TO texqtic_app — USING only (no WITH CHECK on a guard).
-- Passes for: admin context, platform admin (is_admin), test/seed bypass.
-- SECURITY NOTE: require_admin_context() (not require_org_context()) because
-- this is an admin-only table. Tenant JWTs fail the guard — denied.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY impersonation_sessions_guard ON public.impersonation_sessions AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_admin_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
-- ─────────────────────────────────────────────────────────────
-- STEP 4: PERMISSIVE unified policies — one per command
-- Actor arm: admin_id = app.current_actor_id() (admin-only; no tenant arm)
-- Admin arm: current_setting('app.is_admin', true) = 'true'
--            (NOT bypass_enabled() — see Gate 1 / GOVERNANCE-SYNC-030)
-- SECURITY NOTE: DELETE previously had NO admin arm (bypass_enabled only).
-- All commands now require admin_id match OR is_admin='true'.
-- tenant_id column is metadata only — NOT used as RLS predicate.
-- ─────────────────────────────────────────────────────────────
-- SELECT unified
CREATE POLICY impersonation_sessions_select_unified ON public.impersonation_sessions AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_admin_context()
      AND admin_id = app.current_actor_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- INSERT unified
CREATE POLICY impersonation_sessions_insert_unified ON public.impersonation_sessions AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_admin_context()
      AND admin_id = app.current_actor_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- UPDATE unified (USING + WITH CHECK both required)
CREATE POLICY impersonation_sessions_update_unified ON public.impersonation_sessions AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (
      app.require_admin_context()
      AND admin_id = app.current_actor_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  ) WITH CHECK (
    (
      app.require_admin_context()
      AND admin_id = app.current_actor_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- DELETE unified
-- Previously: bypass_enabled() ONLY — no admin arm. Now: full admin_id + is_admin arms.
CREATE POLICY impersonation_sessions_delete_unified ON public.impersonation_sessions AS PERMISSIVE FOR DELETE TO texqtic_app USING (
  (
    app.require_admin_context()
    AND admin_id = app.current_actor_id()
  )
  OR current_setting('app.is_admin'::text, true) = 'true'::text
);
-- ─────────────────────────────────────────────────────────────
-- STEP 5: Self-verifier DO block
-- Raises on any invariant violation → triggers ROLLBACK.
-- Checks: FORCE RLS, exactly 1 RESTRICTIVE guard (FOR ALL),
-- exactly 1 PERMISSIVE per command, 0 {public} policies,
-- is_admin arm present in guard, SELECT, and DELETE.
-- ADMIN-ONLY GUARDRAIL: verifier checks is_admin in DELETE (NOT tenant_id —
-- this is an admin-only table; tenant_id is metadata, not a RLS predicate).
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_force_rls BOOLEAN;
v_guard_count INT;
v_perm_select INT;
v_perm_insert INT;
v_perm_update INT;
v_perm_delete INT;
v_public_count INT;
v_guard_qual TEXT;
v_sel_qual TEXT;
v_del_qual TEXT;
BEGIN -- Assert FORCE RLS enabled
SELECT relforcerowsecurity INTO v_force_rls
FROM pg_class
WHERE relname = 'impersonation_sessions';
IF NOT v_force_rls THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions — relforcerowsecurity is false';
END IF;
-- Assert exactly 1 RESTRICTIVE guard
SELECT COUNT(*) INTO v_guard_count
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'RESTRICTIVE';
IF v_guard_count <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions — expected 1 RESTRICTIVE guard, found %',
v_guard_count;
END IF;
-- Assert guard predicate includes both is_admin and require_admin_context
-- (admin-only: guard uses require_admin_context, not require_org_context)
SELECT qual INTO v_guard_qual
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'RESTRICTIVE';
IF v_guard_qual NOT LIKE '%is_admin%' THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions guard — missing is_admin arm in USING predicate';
END IF;
IF v_guard_qual NOT LIKE '%require_admin_context%' THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions guard — missing require_admin_context arm in USING predicate (must not be require_org_context)';
END IF;
-- Assert exactly 1 PERMISSIVE policy per command
SELECT COUNT(*) INTO v_perm_select
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'SELECT';
IF v_perm_select <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions — expected 1 PERMISSIVE SELECT, found %',
v_perm_select;
END IF;
SELECT COUNT(*) INTO v_perm_insert
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'INSERT';
IF v_perm_insert <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions — expected 1 PERMISSIVE INSERT, found %',
v_perm_insert;
END IF;
SELECT COUNT(*) INTO v_perm_update
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'UPDATE';
IF v_perm_update <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions — expected 1 PERMISSIVE UPDATE, found %',
v_perm_update;
END IF;
SELECT COUNT(*) INTO v_perm_delete
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'DELETE';
IF v_perm_delete <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions — expected 1 PERMISSIVE DELETE, found %',
v_perm_delete;
END IF;
-- Assert PERMISSIVE SELECT predicate includes is_admin arm
SELECT qual INTO v_sel_qual
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'SELECT';
IF v_sel_qual NOT LIKE '%is_admin%' THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions SELECT — missing is_admin arm (bypass_enabled wrongly used?)';
END IF;
-- Assert PERMISSIVE DELETE predicate includes is_admin arm
-- ADMIN-ONLY NOTE: We do NOT check for tenant_id in DELETE — impersonation_sessions
-- is admin-only; tenant_id is metadata, not a RLS predicate.
-- Previously DELETE had NO admin arm (bypass_enabled only) — this is the critical fix.
SELECT qual INTO v_del_qual
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'DELETE';
IF v_del_qual NOT LIKE '%is_admin%' THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions DELETE — missing is_admin arm (CRITICAL: previously bypass_enabled only)';
END IF;
-- Assert no {public} role policies remain
-- SECURITY GUARDRAIL: impersonation_sessions is a control-plane admin table.
-- Any {public} policy is a critical misconfiguration (tenant JWTs rejected by guard).
SELECT COUNT(*) INTO v_public_count
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND roles::text = '{public}';
IF v_public_count <> 0 THEN RAISE EXCEPTION 'VERIFIER FAIL: impersonation_sessions — found % {public} policies, expected 0 (admin-only security violation)',
v_public_count;
END IF;
RAISE NOTICE 'VERIFIER PASS: impersonation_sessions — guard=1 RESTRICTIVE FOR ALL (require_admin_context + is_admin arm present), SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each (is_admin arm present), DELETE critical fix applied (had bypass_enabled only), FORCE RLS=%, no {public} policies',
v_force_rls;
END;
$$;
COMMIT;
-- ============================================================================
-- CROSS-TENANT ISOLATION PROOF (run manually after psql apply):
-- SIM1 — admin context, own sessions visible:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '00000000-0000-0000-0000-000000000001', true);
--   SELECT set_config('app.actor_id',   '<admin_uuid>',  true);
--   SELECT set_config('app.realm',      'control',       true);
--   SELECT set_config('app.is_admin',   'true',          true);
--   SELECT set_config('app.bypass_rls', 'off',           true);
--   SELECT count(*) FROM public.impersonation_sessions; -- Expected: sessions for this admin
--   ROLLBACK;
--
-- SIM2 — tenant JWT must return 0 rows (rejected at guard):
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '<tenantA_uuid>', true);
--   SELECT set_config('app.realm',      'tenant',         true);
--   SELECT set_config('app.bypass_rls', 'off',            true);
--   SELECT count(*) FROM public.impersonation_sessions; -- Expected: 0
--   ROLLBACK;
--
-- SIM3 — is_admin='true' without realm: cross-session visibility:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '00000000-0000-0000-0000-000000000001', true);
--   SELECT set_config('app.actor_id',   '00000000-0000-0000-0000-000000000001', true);
--   SELECT set_config('app.realm',      'control', true);
--   SELECT set_config('app.is_admin',   'true',    true);
--   SELECT set_config('app.bypass_rls', 'off',     true);
--   SELECT count(*) FROM public.impersonation_sessions; -- Expected: all sessions
--   ROLLBACK;
--
-- SIM4 — DELETE without admin context must be blocked:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   -- no app.actor_id set as admin, no is_admin, no bypass
--   DELETE FROM public.impersonation_sessions WHERE id = '<any_uuid>'; -- Expected: 0 rows affected
--   ROLLBACK;
-- ============================================================================
-- APPLY:
--   $u = (Get-Content server/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
--   psql "--dbname=$u" "--variable=ON_ERROR_STOP=1" "--file=server/prisma/migrations/20260315000004_g006c_p2_impersonation_sessions_rls_unify/migration.sql"
--   pnpm -C server exec prisma migrate resolve --applied 20260315000004_g006c_p2_impersonation_sessions_rls_unify
-- ============================================================================