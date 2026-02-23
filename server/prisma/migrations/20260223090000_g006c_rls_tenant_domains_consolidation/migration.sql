-- ============================================================================
-- G-006C: RLS Policy Consolidation — tenant_domains
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Doctrine v1.4 compliance: single permissive policy per command per role.
-- Supabase Performance Advisor: eliminates multiple-permissive-policy warnings.
-- ============================================================================
--
-- INSPECTION QUERY (run before applying):
-- SELECT policyname, cmd, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'tenant_domains'
-- ORDER BY cmd, permissive;
--
-- BEFORE STATE (permissive policies per command):
--   SELECT : tenant_domains_tenant_select_policy,
--            tenant_domains_bypass_select_policy,
--            tenant_domains_bypass_operations_policy (via FOR ALL)  (3 → flagged)
--   INSERT : tenant_domains_tenant_insert_policy,
--            tenant_domains_bypass_operations_policy (via FOR ALL)  (2 → flagged)
--   UPDATE : tenant_domains_tenant_update_policy,
--            tenant_domains_bypass_operations_policy (via FOR ALL)  (2 → flagged)
--   DELETE : tenant_domains_bypass_operations_policy (via FOR ALL)  (1)
--   RESTRICTIVE guard (tenant_domains_guard_policy) — kept unchanged
--   Possible legacy: tenant_domains_tenant_access (FROM rls.sql) — dropped if exists
--
-- AFTER STATE:
--   SELECT : tenant_domains_select_unified  (1)
--   INSERT : tenant_domains_insert_unified  (1)
--   UPDATE : tenant_domains_update_unified  (1)
--   DELETE : tenant_domains_delete_unified  (1, bypass-only — preserves cleanup)
--   RESTRICTIVE guard (tenant_domains_guard_policy) — unchanged
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies
-- ============================================================================
-- SELECT: 3 policies (tenant_select + bypass_select + bypass_operations via FOR ALL)
DROP POLICY IF EXISTS tenant_domains_tenant_select_policy ON public.tenant_domains;
DROP POLICY IF EXISTS tenant_domains_bypass_select_policy ON public.tenant_domains;
-- INSERT/UPDATE/DELETE: covered by bypass_operations FOR ALL
DROP POLICY IF EXISTS tenant_domains_tenant_insert_policy ON public.tenant_domains;
DROP POLICY IF EXISTS tenant_domains_tenant_update_policy ON public.tenant_domains;
DROP POLICY IF EXISTS tenant_domains_bypass_operations_policy ON public.tenant_domains;
-- Safety: drop rls.sql-era legacy FOR ALL policy if it still exists
DROP POLICY IF EXISTS tenant_domains_tenant_access ON public.tenant_domains;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
-- ============================================================================
-- SELECT unified
CREATE POLICY tenant_domains_select_unified ON public.tenant_domains AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
-- INSERT unified
CREATE POLICY tenant_domains_insert_unified ON public.tenant_domains AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
-- UPDATE unified
CREATE POLICY tenant_domains_update_unified ON public.tenant_domains AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  ) WITH CHECK (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
-- DELETE unified: test bypass only (no tenant DELETE — preserves original model)
CREATE POLICY tenant_domains_delete_unified ON public.tenant_domains AS PERMISSIVE FOR DELETE TO texqtic_app USING (app.bypass_enabled());
-- NOTE: tenant_domains_guard_policy (RESTRICTIVE, FOR ALL) is intentionally NOT dropped.
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
WHERE c.relname = 'tenant_domains'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-006C FAIL: tenant_domains RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-006C FAIL: tenant_domains FORCE RLS not set';
END IF;
FOR rec IN
SELECT cmd,
  COUNT(*) AS cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenant_domains'
  AND permissive = 'PERMISSIVE'
GROUP BY cmd LOOP IF rec.cnt > 1 THEN RAISE EXCEPTION 'G-006C FAIL: tenant_domains still has % permissive policies for cmd=%',
  rec.cnt,
  rec.cmd;
END IF;
RAISE NOTICE 'G-006C PASS: tenant_domains cmd=% permissive_count=%',
rec.cmd,
rec.cnt;
END LOOP;
RAISE NOTICE 'G-006C PASS: tenant_domains consolidation verified. FORCE RLS: %',
v_rls_forced;
END $$;
COMMIT;
-- ============================================================================
-- POST-DEPLOY VERIFICATION (run separately):
-- SELECT tablename, cmd, permissive, count(*)
-- FROM pg_policies WHERE tablename = 'tenant_domains'
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
-- SELECT count(*) FROM tenant_domains WHERE tenant_id = '<orgB_uuid>';
-- -- Expected: 0 rows
-- ROLLBACK;
-- ============================================================================
-- ROLLBACK PLAN:
-- 1. DROP unified policies: tenant_domains_select_unified, tenant_domains_insert_unified,
--    tenant_domains_update_unified, tenant_domains_delete_unified
-- 2. Recreate from git:
--    tenant_domains_tenant_select_policy, tenant_domains_tenant_insert_policy,
--    tenant_domains_tenant_update_policy, tenant_domains_bypass_select_policy,
--    tenant_domains_bypass_operations_policy
--    (source: 20260214113000_db_hardening_wave_01_gate_d4_rls_white_label_config)
-- ============================================================================