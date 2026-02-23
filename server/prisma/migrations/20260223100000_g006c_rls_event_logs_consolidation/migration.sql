-- ============================================================================
-- G-006C: RLS Policy Consolidation — event_logs
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Doctrine v1.4 compliance: single permissive policy per command per role.
-- Supabase Performance Advisor: eliminates multiple-permissive-policy warnings.
-- ============================================================================
--
-- INSPECTION QUERY (run before applying):
-- SELECT policyname, cmd, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'event_logs'
-- ORDER BY cmd, permissive;
--
-- BEFORE STATE (permissive policies per command):
--   SELECT : event_logs_tenant_select, event_logs_bypass_select   (2 → flagged)
--   INSERT : event_logs_tenant_insert, event_logs_bypass_insert   (2 → flagged)
--   RESTRICTIVE guard (event_logs_guard) — kept unchanged
--   No UPDATE/DELETE policies: immutability enforced by FORCE RLS
--
-- AFTER STATE:
--   SELECT : event_logs_select_unified  (1)
--   INSERT : event_logs_insert_unified  (1)
--   RESTRICTIVE guard (event_logs_guard) — unchanged
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies
-- ============================================================================
-- SELECT: 2 policies → 1 unified
DROP POLICY IF EXISTS event_logs_tenant_select ON public.event_logs;
DROP POLICY IF EXISTS event_logs_bypass_select ON public.event_logs;
-- INSERT: 2 policies → 1 unified
DROP POLICY IF EXISTS event_logs_tenant_insert ON public.event_logs;
DROP POLICY IF EXISTS event_logs_bypass_insert ON public.event_logs;
-- Safety: drop any legacy naming variants
DROP POLICY IF EXISTS event_logs_tenant_access ON public.event_logs;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
-- NOTE: event_logs is append-only (immutable). No UPDATE/DELETE policies.
-- ============================================================================
-- SELECT unified: tenant org-scoped read OR test bypass
CREATE POLICY event_logs_select_unified ON public.event_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
-- INSERT unified: org-scoped write with explicit tenant_id enforcement
CREATE POLICY event_logs_insert_unified ON public.event_logs AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- UPDATE/DELETE remain denied by FORCE RLS (event_logs is append-only).
-- NOTE: event_logs_guard (RESTRICTIVE, FOR ALL) is intentionally NOT dropped.
-- NOTE: No UPDATE/DELETE policies created — event_logs is immutable (append-only).
-- ============================================================================
-- STEP 3: Verify
-- ============================================================================
DO $$
DECLARE v_rls_enabled boolean;
v_rls_forced boolean;
v_select_count int;
v_insert_count int;
BEGIN
SELECT relrowsecurity,
  relforcerowsecurity INTO v_rls_enabled,
  v_rls_forced
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'event_logs'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-006C FAIL: event_logs RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-006C FAIL: event_logs FORCE RLS not set';
END IF;
SELECT COUNT(*) INTO v_select_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'event_logs'
  AND cmd = 'SELECT'
  AND permissive = 'PERMISSIVE';
SELECT COUNT(*) INTO v_insert_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'event_logs'
  AND cmd = 'INSERT'
  AND permissive = 'PERMISSIVE';
IF v_select_count <> 1 THEN RAISE EXCEPTION 'G-006C FAIL: expected 1 permissive SELECT policy on event_logs, found %',
v_select_count;
END IF;
IF v_insert_count <> 1 THEN RAISE EXCEPTION 'G-006C FAIL: expected 1 permissive INSERT policy on event_logs, found %',
v_insert_count;
END IF;
RAISE NOTICE 'G-006C PASS: event_logs — SELECT: %, INSERT: %, FORCE RLS: %',
v_select_count,
v_insert_count,
v_rls_forced;
END $$;
COMMIT;
-- ============================================================================
-- POST-DEPLOY VERIFICATION (run separately):
-- SELECT tablename, cmd, permissive, count(*)
-- FROM pg_policies WHERE tablename = 'event_logs'
-- GROUP BY tablename, cmd, permissive ORDER BY cmd;
-- Expected: 1 PERMISSIVE SELECT, 1 PERMISSIVE INSERT, 1 RESTRICTIVE ALL
--
-- CROSS-TENANT ISOLATION PROOF:
-- BEGIN;
-- SET LOCAL ROLE texqtic_app;
-- SELECT set_config('app.org_id',    '<orgA_uuid>', true);
-- SELECT set_config('app.realm',     'tenant',      true);
-- SELECT set_config('app.bypass_rls','off',         true);
-- SELECT set_config('app.roles',     'MEMBER',      true);
-- SELECT count(*) FROM event_logs WHERE tenant_id = '<orgB_uuid>';
-- -- Expected: 0 rows
-- ROLLBACK;
-- ============================================================================
-- ROLLBACK PLAN:
-- 1. DROP POLICY IF EXISTS event_logs_select_unified ON public.event_logs;
-- 2. DROP POLICY IF EXISTS event_logs_insert_unified ON public.event_logs;
-- 3. Recreate from git: event_logs_tenant_select, event_logs_bypass_select,
--    event_logs_tenant_insert, event_logs_bypass_insert
--    (source: 20260214105859_db_hardening_wave_01_gate_d3_rls_audit_logs_event_logs)
-- ============================================================================