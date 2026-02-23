-- ============================================================================
-- G-006C: RLS Policy Consolidation — catalog_items
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Doctrine v1.4 compliance: single permissive policy per command per role.
-- Supabase Performance Advisor: eliminates multiple-permissive-policy warnings.
-- ============================================================================
--
-- INSPECTION QUERY (run before applying):
-- SELECT policyname, cmd, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'catalog_items'
-- ORDER BY cmd, permissive;
--
-- BEFORE STATE (permissive policies per command):
--   SELECT : tenant_select, bypass_select          (2 → flagged)
--            + catalog_items_guard (RESTRICTIVE SELECT) — kept unchanged
--   INSERT : tenant_insert, bypass_insert          (2 → flagged)
--   UPDATE : tenant_update, bypass_update          (2 → flagged)
--   DELETE : tenant_delete, bypass_delete          (2 → flagged)
--
-- AFTER STATE:
--   SELECT : catalog_items_select_unified  (1)
--            + catalog_items_guard (RESTRICTIVE SELECT) — unchanged
--   INSERT : catalog_items_insert_unified  (1)
--   UPDATE : catalog_items_update_unified  (1)
--   DELETE : catalog_items_delete_unified  (1)
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies (tenant + bypass per command)
-- ============================================================================
-- SELECT: 2 permissive → 1 unified
DROP POLICY IF EXISTS tenant_select ON public.catalog_items;
DROP POLICY IF EXISTS bypass_select ON public.catalog_items;
-- INSERT: 2 permissive → 1 unified
DROP POLICY IF EXISTS tenant_insert ON public.catalog_items;
DROP POLICY IF EXISTS bypass_insert ON public.catalog_items;
-- UPDATE: 2 permissive → 1 unified
DROP POLICY IF EXISTS tenant_update ON public.catalog_items;
DROP POLICY IF EXISTS bypass_update ON public.catalog_items;
-- DELETE: 2 permissive → 1 unified
DROP POLICY IF EXISTS tenant_delete ON public.catalog_items;
DROP POLICY IF EXISTS bypass_delete ON public.catalog_items;
-- Safety: drop any legacy naming variants from rls.sql or Gate B.2 era
DROP POLICY IF EXISTS catalog_items_tenant_read ON public.catalog_items;
DROP POLICY IF EXISTS catalog_items_tenant_access ON public.catalog_items;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
-- NOTE: catalog_items_guard (RESTRICTIVE, FOR SELECT) is intentionally NOT dropped.
-- ============================================================================
-- SELECT unified
CREATE POLICY catalog_items_select_unified ON public.catalog_items AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND catalog_items.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- INSERT unified
CREATE POLICY catalog_items_insert_unified ON public.catalog_items AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND catalog_items.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- UPDATE unified
CREATE POLICY catalog_items_update_unified ON public.catalog_items AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (
      app.require_org_context()
      AND catalog_items.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  ) WITH CHECK (
    (
      app.require_org_context()
      AND catalog_items.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- DELETE unified
CREATE POLICY catalog_items_delete_unified ON public.catalog_items AS PERMISSIVE FOR DELETE TO texqtic_app USING (
  (
    app.require_org_context()
    AND catalog_items.tenant_id = app.current_org_id()
  )
  OR app.bypass_enabled()
);
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
WHERE c.relname = 'catalog_items'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-006C FAIL: catalog_items RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-006C FAIL: catalog_items FORCE RLS not set';
END IF;
FOR rec IN
SELECT cmd,
  COUNT(*) AS cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'catalog_items'
  AND permissive = 'PERMISSIVE'
GROUP BY cmd LOOP IF rec.cnt > 1 THEN RAISE EXCEPTION 'G-006C FAIL: catalog_items still has % permissive policies for cmd=%',
  rec.cnt,
  rec.cmd;
END IF;
RAISE NOTICE 'G-006C PASS: catalog_items cmd=% permissive_count=%',
rec.cmd,
rec.cnt;
END LOOP;
RAISE NOTICE 'G-006C PASS: catalog_items consolidation verified. FORCE RLS: %',
v_rls_forced;
END $$;
COMMIT;
-- ============================================================================
-- POST-DEPLOY VERIFICATION (run separately):
-- SELECT tablename, cmd, permissive, count(*)
-- FROM pg_policies WHERE tablename = 'catalog_items'
-- GROUP BY tablename, cmd, permissive ORDER BY cmd;
-- Expected: 1 PERMISSIVE per SELECT/INSERT/UPDATE/DELETE
--           1 RESTRICTIVE SELECT (catalog_items_guard — unchanged)
--
-- CROSS-TENANT ISOLATION PROOF:
-- BEGIN;
-- SET LOCAL ROLE texqtic_app;
-- SELECT set_config('app.org_id',    '<orgA_uuid>', true);
-- SELECT set_config('app.realm',     'tenant',      true);
-- SELECT set_config('app.bypass_rls','off',         true);
-- SELECT set_config('app.roles',     'MEMBER',      true);
-- SELECT count(*) FROM catalog_items WHERE tenant_id = '<orgB_uuid>';
-- -- Expected: 0 rows
-- ROLLBACK;
-- ============================================================================
-- ROLLBACK PLAN:
-- 1. DROP unified policies: catalog_items_select_unified, catalog_items_insert_unified,
--    catalog_items_update_unified, catalog_items_delete_unified
-- 2. Recreate from git:
--    tenant_select, tenant_insert, tenant_update, tenant_delete,
--    bypass_select, bypass_insert, bypass_update, bypass_delete
--    (source: 20260212122000_db_hardening_wave_01_gate_a_context_helpers_and_pilot_rls)
-- ============================================================================