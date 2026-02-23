-- ============================================================================
-- G-006C: RLS Policy Consolidation — impersonation_sessions
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Doctrine v1.4 compliance: single permissive policy per command per role.
-- Supabase Performance Advisor: eliminates multiple-permissive-policy warnings.
-- ============================================================================
--
-- SPECIAL NOTE: impersonation_sessions is a CONTROL-PLANE table.
-- Actor isolation (admin_id = current_actor_id()) is preserved.
-- Uses app.require_admin_context() (NOT app.require_org_context()).
--
-- INSPECTION QUERY (run before applying):
-- SELECT policyname, cmd, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'impersonation_sessions'
-- ORDER BY cmd, permissive;
--
-- BEFORE STATE (permissive policies per command):
--   SELECT : admin_select, bypass_select (via bypass_select),
--            bypass_operations (via FOR ALL)                (3 → flagged)
--   INSERT : admin_insert, bypass_operations (via FOR ALL) (2 → flagged)
--   UPDATE : admin_update, bypass_operations (via FOR ALL) (2 → flagged)
--   DELETE : bypass_operations (via FOR ALL)               (1)
--   RESTRICTIVE guard (restrictive_guard) — kept unchanged
--
-- AFTER STATE:
--   SELECT : impersonation_sessions_select_unified  (1) — admin actor OR bypass
--   INSERT : impersonation_sessions_insert_unified  (1) — admin actor OR bypass
--   UPDATE : impersonation_sessions_update_unified  (1) — admin actor OR bypass
--   DELETE : impersonation_sessions_delete_unified  (1) — bypass only
--   RESTRICTIVE guard (restrictive_guard) — unchanged
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies
-- ============================================================================
-- SELECT: 3 policies (admin_select + bypass_select + bypass_operations via FOR ALL)
DROP POLICY IF EXISTS admin_select ON public.impersonation_sessions;
DROP POLICY IF EXISTS bypass_select ON public.impersonation_sessions;
-- INSERT/UPDATE/DELETE covered by bypass_operations FOR ALL
DROP POLICY IF EXISTS admin_insert ON public.impersonation_sessions;
DROP POLICY IF EXISTS admin_update ON public.impersonation_sessions;
DROP POLICY IF EXISTS bypass_operations ON public.impersonation_sessions;
-- Safety: drop any legacy naming variants
DROP POLICY IF EXISTS impersonation_sessions_tenant_access ON public.impersonation_sessions;
-- Additional impersonation_sessions_admin_* variants found in DB:
DROP POLICY IF EXISTS impersonation_sessions_admin_access ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_admin_select ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_admin_insert ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_admin_update ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_admin_delete ON public.impersonation_sessions;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
-- Actor isolation preserved: admin_id = app.current_actor_id()
-- Admin context preserved: app.require_admin_context() (realm='admin' + actor_id set)
-- ============================================================================
-- SELECT unified
CREATE POLICY impersonation_sessions_select_unified ON public.impersonation_sessions AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_admin_context()
      AND impersonation_sessions.admin_id = app.current_actor_id()
    )
    OR app.bypass_enabled()
  );
-- INSERT unified
CREATE POLICY impersonation_sessions_insert_unified ON public.impersonation_sessions AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_admin_context()
      AND impersonation_sessions.admin_id = app.current_actor_id()
    )
    OR app.bypass_enabled()
  );
-- UPDATE unified (admin can end their own session)
CREATE POLICY impersonation_sessions_update_unified ON public.impersonation_sessions AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (
      app.require_admin_context()
      AND impersonation_sessions.admin_id = app.current_actor_id()
    )
    OR app.bypass_enabled()
  ) WITH CHECK (
    (
      app.require_admin_context()
      AND impersonation_sessions.admin_id = app.current_actor_id()
    )
    OR app.bypass_enabled()
  );
-- DELETE unified: test bypass only (no admin DELETE — admin can only end sessions via UPDATE)
CREATE POLICY impersonation_sessions_delete_unified ON public.impersonation_sessions AS PERMISSIVE FOR DELETE TO texqtic_app USING (app.bypass_enabled());
-- NOTE: restrictive_guard (RESTRICTIVE, FOR ALL) is intentionally NOT dropped.
-- ============================================================================
-- STEP 3: Verify
-- ============================================================================
DO $$
DECLARE v_rls_enabled boolean;
v_rls_forced boolean;
rec RECORD;
BEGIN
SELECT relrowsecurity,
  relforcerowsecurity INTO v_rls_enabled,
  v_rls_forced
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'impersonation_sessions'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-006C FAIL: impersonation_sessions RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-006C FAIL: impersonation_sessions FORCE RLS not set';
END IF;
FOR rec IN
SELECT cmd,
  COUNT(*) AS cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
GROUP BY cmd LOOP IF rec.cnt > 1 THEN RAISE EXCEPTION 'G-006C FAIL: impersonation_sessions still has % permissive policies for cmd=%',
  rec.cnt,
  rec.cmd;
END IF;
RAISE NOTICE 'G-006C PASS: impersonation_sessions cmd=% permissive_count=%',
rec.cmd,
rec.cnt;
END LOOP;
RAISE NOTICE 'G-006C PASS: impersonation_sessions consolidation verified. FORCE RLS: %',
v_rls_forced;
END $$;
COMMIT;
-- ============================================================================
-- POST-DEPLOY VERIFICATION (run separately):
-- SELECT tablename, cmd, permissive, count(*)
-- FROM pg_policies WHERE tablename = 'impersonation_sessions'
-- GROUP BY tablename, cmd, permissive ORDER BY cmd;
-- Expected: 1 PERMISSIVE per SELECT/INSERT/UPDATE/DELETE, 1 RESTRICTIVE ALL
--
-- IMPERSONATION ISOLATION PROOF:
-- BEGIN;
-- SET LOCAL ROLE texqtic_app;
-- SELECT set_config('app.realm',     'admin',         true);
-- SELECT set_config('app.actor_id',  '<adminA_uuid>', true);
-- SELECT set_config('app.bypass_rls','off',           true);
-- SELECT count(*) FROM impersonation_sessions WHERE admin_id = '<adminB_uuid>';
-- -- Expected: 0 rows (actor isolation enforced)
-- ROLLBACK;
-- ============================================================================
-- ROLLBACK PLAN:
-- 1. DROP unified policies: impersonation_sessions_select_unified,
--    impersonation_sessions_insert_unified, impersonation_sessions_update_unified,
--    impersonation_sessions_delete_unified
-- 2. Recreate from git:
--    admin_select, admin_insert, admin_update,
--    bypass_select, bypass_operations
--    (source: 20260215000000_db_hardening_wave_01_gate_d7_rls_impersonation_sessions)
-- ============================================================================