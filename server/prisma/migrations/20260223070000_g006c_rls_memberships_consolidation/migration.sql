-- ============================================================================
-- G-006C: RLS Policy Consolidation — memberships
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Doctrine v1.4 compliance: single permissive policy per command per role.
-- Supabase Performance Advisor: eliminates multiple-permissive-policy warnings.
-- ============================================================================
--
-- INSPECTION QUERY (run before applying):
-- SELECT policyname, cmd, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'memberships'
-- ORDER BY cmd, permissive;
--
-- BEFORE STATE (permissive policies per command):
--   SELECT : memberships_tenant_select, memberships_bypass_select   (2 → flagged)
--   INSERT : memberships_tenant_insert, memberships_bypass_insert   (2 → flagged)
--   UPDATE : memberships_tenant_update, memberships_bypass_update   (2 → flagged)
--   DELETE : memberships_tenant_delete, memberships_bypass_delete   (2 → flagged)
--   RESTRICTIVE guard (memberships_guard_require_context) — kept unchanged
--   Possible legacy: memberships_tenant_access (FROM rls.sql era) — dropped if exists
--
-- AFTER STATE:
--   SELECT : memberships_select_unified  (1)
--   INSERT : memberships_insert_unified  (1)
--   UPDATE : memberships_update_unified  (1)
--   DELETE : memberships_delete_unified  (1)
--   RESTRICTIVE guard (memberships_guard_require_context) — unchanged
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies (tenant + bypass per command)
-- ============================================================================
DROP POLICY IF EXISTS memberships_tenant_select ON public.memberships;
DROP POLICY IF EXISTS memberships_bypass_select ON public.memberships;
DROP POLICY IF EXISTS memberships_tenant_insert ON public.memberships;
DROP POLICY IF EXISTS memberships_bypass_insert ON public.memberships;
DROP POLICY IF EXISTS memberships_tenant_update ON public.memberships;
DROP POLICY IF EXISTS memberships_bypass_update ON public.memberships;
DROP POLICY IF EXISTS memberships_tenant_delete ON public.memberships;
DROP POLICY IF EXISTS memberships_bypass_delete ON public.memberships;
-- Safety: drop rls.sql-era legacy FOR ALL policy if it still exists
DROP POLICY IF EXISTS memberships_tenant_access ON public.memberships;
-- Additional mb_bypass_* variants found in DB:
DROP POLICY IF EXISTS mb_bypass_select ON public.memberships;
DROP POLICY IF EXISTS mb_bypass_insert ON public.memberships;
DROP POLICY IF EXISTS mb_bypass_update ON public.memberships;
DROP POLICY IF EXISTS mb_bypass_delete ON public.memberships;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
-- ============================================================================
-- SELECT unified
CREATE POLICY memberships_select_unified ON public.memberships AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND memberships.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- INSERT unified
CREATE POLICY memberships_insert_unified ON public.memberships AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND memberships.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- UPDATE unified
CREATE POLICY memberships_update_unified ON public.memberships AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (
      app.require_org_context()
      AND memberships.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  ) WITH CHECK (
    (
      app.require_org_context()
      AND memberships.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- DELETE unified
CREATE POLICY memberships_delete_unified ON public.memberships AS PERMISSIVE FOR DELETE TO texqtic_app USING (
  (
    app.require_org_context()
    AND memberships.tenant_id = app.current_org_id()
  )
  OR app.bypass_enabled()
);
-- NOTE: memberships_guard_require_context (RESTRICTIVE, FOR ALL) is intentionally NOT dropped.
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
WHERE c.relname = 'memberships'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-006C FAIL: memberships RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-006C FAIL: memberships FORCE RLS not set';
END IF;
FOR rec IN
SELECT cmd,
  COUNT(*) AS cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'memberships'
  AND permissive = 'PERMISSIVE'
GROUP BY cmd LOOP IF rec.cnt > 1 THEN RAISE EXCEPTION 'G-006C FAIL: memberships still has % permissive policies for cmd=%',
  rec.cnt,
  rec.cmd;
END IF;
RAISE NOTICE 'G-006C PASS: memberships cmd=% permissive_count=%',
rec.cmd,
rec.cnt;
END LOOP;
RAISE NOTICE 'G-006C PASS: memberships consolidation verified. FORCE RLS: %',
v_rls_forced;
END $$;
COMMIT;
-- ============================================================================
-- POST-DEPLOY VERIFICATION (run separately):
-- SELECT tablename, cmd, permissive, count(*)
-- FROM pg_policies WHERE tablename = 'memberships'
-- GROUP BY tablename, cmd, permissive ORDER BY cmd;
-- Expected: 1 PERMISSIVE per SELECT/INSERT/UPDATE/DELETE, 1 RESTRICTIVE ALL
--
-- CROSS-TENANT ISOLATION PROOF:
-- BEGIN;
-- SET LOCAL ROLE texqtic_app;
-- SELECT set_config('app.org_id',    '<orgA_uuid>', true);
-- SELECT set_config('app.realm',     'tenant',      true);
-- SELECT set_config('app.bypass_rls','off',         true);
-- SELECT set_config('app.roles',     'MEMBER',      true);
-- SELECT count(*) FROM memberships WHERE tenant_id = '<orgB_uuid>';
-- -- Expected: 0 rows
-- ROLLBACK;
-- ============================================================================
-- ROLLBACK PLAN:
-- 1. DROP unified policies: memberships_select_unified, memberships_insert_unified,
--    memberships_update_unified, memberships_delete_unified
-- 2. Recreate from git:
--    memberships_tenant_select/insert/update/delete,
--    memberships_bypass_select/insert/update/delete
--    (source: 20260213045000_db_hardening_wave_01_gate_d1_memberships_invites_rls)
-- ============================================================================