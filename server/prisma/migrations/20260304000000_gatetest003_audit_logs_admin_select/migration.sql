-- ============================================================================
-- GATE-TEST-003: audit_logs — Admin-Context SELECT Pass-through
-- Purpose: Allow admin context (app.is_admin = 'true') to SELECT from
--          audit_logs for tenant_id IS NULL rows (admin-realm audit events).
-- Root cause: audit_logs_guard RESTRICTIVE requires require_org_context() OR
--             bypass_enabled(). Both are FALSE for withDbContext({ isAdmin: true }).
--             This blocked gate-e-4-audit Test 2 (admin login audit read-back).
-- Tenant isolation guarantee: unchanged. Tenant context still requires exact
--             org_id match. Admin SELECT is limited to tenant_id IS NULL rows.
-- Doctrine v1.4 compliance: no bypass toggle, no RLS disable, no DROP policies.
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop + recreate audit_logs_guard (RESTRICTIVE) to add admin predicate
-- ============================================================================
--
-- Previous definition (DB-HARDENING-WAVE-01):
--   USING (app.require_org_context() OR app.bypass_enabled())
--
-- New definition adds:
--   OR current_setting('app.is_admin', true) = 'true'
--
-- Safety: current_setting() returns '' when not set (fallback 'true' arg = no-
--         error on missing var). Comparing '' = 'true' is FALSE — safe default.
--         This predicate cannot be spoofed by tenant context because
--         withDbContext enforces set_config('app.is_admin', 'false', true)
--         for all non-admin contexts.
--
DROP POLICY IF EXISTS audit_logs_guard ON public.audit_logs;
CREATE POLICY audit_logs_guard ON public.audit_logs AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
  OR current_setting('app.is_admin', true) = 'true'
);
-- ============================================================================
-- STEP 2: Add PERMISSIVE SELECT policy for admin context
-- ============================================================================
--
-- Allows admin context to read audit_logs rows where tenant_id IS NULL.
-- Admin-realm events (AUTH_LOGIN_SUCCESS with realm='ADMIN', etc.) are written
-- with tenant_id = NULL, so this is the correct predicate.
--
-- Intentionally does NOT permit:
--   - Tenant context to read tenant_id=NULL rows (is_admin check prevents it)
--   - Admin context to read tenant-specific rows (tenant_id IS NOT NULL)
--
-- To allow admin investigation of tenant-specific audit rows in future, add a
-- separate policy with explicit PLATFORM_ADMIN approval.
--
DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
CREATE POLICY audit_logs_admin_select ON public.audit_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    current_setting('app.is_admin', true) = 'true'
    AND tenant_id IS NULL
  );
-- ============================================================================
-- STEP 3: Verification — fast-fail if invariants are not satisfied
-- ============================================================================
DO $$
DECLARE v_rls_enabled boolean;
v_rls_forced boolean;
v_guard_count int;
v_guard_has_admin boolean;
v_admin_select_cnt int;
v_total_select_cnt int;
BEGIN -- 1) FORCE RLS must remain enabled
SELECT relrowsecurity,
  relforcerowsecurity INTO v_rls_enabled,
  v_rls_forced
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'audit_logs'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'GATE-TEST-003 FAIL: audit_logs RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'GATE-TEST-003 FAIL: audit_logs FORCE RLS not set';
END IF;
-- 2) RESTRICTIVE guard policy must exist
SELECT COUNT(*) INTO v_guard_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'audit_logs'
  AND policyname = 'audit_logs_guard'
  AND permissive = 'RESTRICTIVE';
IF v_guard_count <> 1 THEN RAISE EXCEPTION 'GATE-TEST-003 FAIL: audit_logs_guard RESTRICTIVE policy not found (count=%)',
v_guard_count;
END IF;
-- 3) Guard policy definition must include the admin predicate
--    pg_policies.qual stores the USING expression as SQL text.
SELECT (qual ILIKE '%is_admin%') INTO v_guard_has_admin
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'audit_logs'
  AND policyname = 'audit_logs_guard';
IF NOT v_guard_has_admin THEN RAISE EXCEPTION 'GATE-TEST-003 FAIL: audit_logs_guard USING clause does not include is_admin predicate';
END IF;
-- 4) audit_logs_admin_select PERMISSIVE SELECT policy must exist
SELECT COUNT(*) INTO v_admin_select_cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'audit_logs'
  AND policyname = 'audit_logs_admin_select'
  AND cmd = 'SELECT'
  AND permissive = 'PERMISSIVE';
IF v_admin_select_cnt <> 1 THEN RAISE EXCEPTION 'GATE-TEST-003 FAIL: audit_logs_admin_select PERMISSIVE SELECT policy not found (count=%)',
v_admin_select_cnt;
END IF;
-- 5) Total PERMISSIVE SELECT policies must be exactly 2
--    (audit_logs_select_unified + audit_logs_admin_select)
SELECT COUNT(*) INTO v_total_select_cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'audit_logs'
  AND cmd = 'SELECT'
  AND permissive = 'PERMISSIVE';
IF v_total_select_cnt <> 2 THEN RAISE EXCEPTION 'GATE-TEST-003 FAIL: expected 2 PERMISSIVE SELECT policies on audit_logs, found %',
v_total_select_cnt;
END IF;
RAISE NOTICE 'GATE-TEST-003 PASS: audit_logs — guard with admin predicate, admin select policy added. SELECT policies: %, FORCE RLS: %',
v_total_select_cnt,
v_rls_forced;
END $$;
COMMIT;