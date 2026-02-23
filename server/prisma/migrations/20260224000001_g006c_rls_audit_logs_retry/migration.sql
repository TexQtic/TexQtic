-- ============================================================================
-- G-006C: RLS Policy Consolidation — audit_logs (RETRY)
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Doctrine v1.4 compliance: single permissive policy per command per role.
-- Supabase Performance Advisor: eliminates multiple-permissive-policy warnings.
-- Note: Re-issued because 20260223010000 was marked as rolled-back after a
--       pooler transaction-state error (original SQL was never applied).
--       All DROPs use IF EXISTS — fully idempotent.
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies (both tenant + bypass per command)
-- ============================================================================
DROP POLICY IF EXISTS audit_logs_tenant_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_bypass_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_tenant_insert ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_bypass_insert ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_tenant_access ON public.audit_logs;
-- Additional legacy variants found in DB:
DROP POLICY IF EXISTS audit_logs_tenant_read ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
-- ============================================================================
CREATE POLICY audit_logs_select_unified ON public.audit_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
CREATE POLICY audit_logs_insert_unified ON public.audit_logs AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- NOTE: audit_logs_guard (RESTRICTIVE, FOR ALL) is intentionally NOT dropped.
-- ============================================================================
-- STEP 3: Verify FORCE RLS unchanged
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
WHERE c.relname = 'audit_logs'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-006C FAIL: audit_logs RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-006C FAIL: audit_logs FORCE RLS not set';
END IF;
SELECT COUNT(*) INTO v_select_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'audit_logs'
  AND cmd = 'SELECT'
  AND permissive = 'PERMISSIVE';
SELECT COUNT(*) INTO v_insert_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'audit_logs'
  AND cmd = 'INSERT'
  AND permissive = 'PERMISSIVE';
IF v_select_count <> 1 THEN RAISE EXCEPTION 'G-006C FAIL: expected 1 permissive SELECT policy, found %',
v_select_count;
END IF;
IF v_insert_count <> 1 THEN RAISE EXCEPTION 'G-006C FAIL: expected 1 permissive INSERT policy, found %',
v_insert_count;
END IF;
RAISE NOTICE 'G-006C PASS: audit_logs — SELECT policies: %, INSERT policies: %, FORCE RLS: %',
v_select_count,
v_insert_count,
v_rls_forced;
END $$;
COMMIT;