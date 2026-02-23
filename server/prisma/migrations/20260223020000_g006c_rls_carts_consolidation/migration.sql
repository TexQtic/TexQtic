-- ============================================================================
-- G-006C: RLS Policy Consolidation — carts
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Doctrine v1.4 compliance: single permissive policy per command per role.
-- Supabase Performance Advisor: eliminates multiple-permissive-policy warnings.
-- ============================================================================
--
-- INSPECTION QUERY (run before applying):
-- SELECT policyname, cmd, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'carts'
-- ORDER BY cmd, permissive;
--
-- BEFORE STATE (permissive policies per command):
--   SELECT : tenant_select, bypass_select          (2 → flagged)
--   INSERT : tenant_insert, bypass_insert          (2 → flagged)
--   UPDATE : tenant_update, bypass_update          (2 → flagged)
--   DELETE : tenant_delete, bypass_delete          (2 → flagged)
--   RESTRICTIVE guard (carts_guard) — kept unchanged
--
-- AFTER STATE:
--   SELECT : carts_select_unified  (1)
--   INSERT : carts_insert_unified  (1)
--   UPDATE : carts_update_unified  (1)
--   DELETE : carts_delete_unified  (1)
--   RESTRICTIVE guard (carts_guard) — unchanged
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies (tenant + bypass per command)
-- ============================================================================
-- SELECT: 2 policies → 1 unified
DROP POLICY IF EXISTS tenant_select ON public.carts;
DROP POLICY IF EXISTS bypass_select ON public.carts;
-- INSERT: 2 policies → 1 unified
DROP POLICY IF EXISTS tenant_insert ON public.carts;
DROP POLICY IF EXISTS bypass_insert ON public.carts;
-- UPDATE: 2 policies → 1 unified
DROP POLICY IF EXISTS tenant_update ON public.carts;
DROP POLICY IF EXISTS bypass_update ON public.carts;
-- DELETE: 2 policies → 1 unified
DROP POLICY IF EXISTS tenant_delete ON public.carts;
DROP POLICY IF EXISTS bypass_delete ON public.carts;
-- Safety: drop any rls.sql-era legacy policies
DROP POLICY IF EXISTS carts_tenant_access ON public.carts;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
-- ============================================================================
-- SELECT unified
CREATE POLICY carts_select_unified ON public.carts AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND carts.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- INSERT unified
CREATE POLICY carts_insert_unified ON public.carts AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND carts.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- UPDATE unified
CREATE POLICY carts_update_unified ON public.carts AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (
      app.require_org_context()
      AND carts.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  ) WITH CHECK (
    (
      app.require_org_context()
      AND carts.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- DELETE unified
CREATE POLICY carts_delete_unified ON public.carts AS PERMISSIVE FOR DELETE TO texqtic_app USING (
  (
    app.require_org_context()
    AND carts.tenant_id = app.current_org_id()
  )
  OR app.bypass_enabled()
);
-- NOTE: carts_guard (RESTRICTIVE, FOR ALL) is intentionally NOT dropped.
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
WHERE c.relname = 'carts'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-006C FAIL: carts RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-006C FAIL: carts FORCE RLS not set';
END IF;
FOR rec IN
SELECT cmd,
  COUNT(*) AS cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'carts'
  AND permissive = 'PERMISSIVE'
GROUP BY cmd LOOP IF rec.cnt > 1 THEN RAISE EXCEPTION 'G-006C FAIL: carts still has % permissive policies for cmd=%',
  rec.cnt,
  rec.cmd;
END IF;
RAISE NOTICE 'G-006C PASS: carts cmd=% permissive_count=%',
rec.cmd,
rec.cnt;
END LOOP;
RAISE NOTICE 'G-006C PASS: carts consolidation verified. FORCE RLS: %',
v_rls_forced;
END $$;
COMMIT;
-- ============================================================================
-- POST-DEPLOY VERIFICATION (run separately):
-- SELECT tablename, cmd, permissive, count(*)
-- FROM pg_policies WHERE tablename = 'carts'
-- GROUP BY tablename, cmd, permissive ORDER BY cmd, permissive;
-- Expected: 1 PERMISSIVE per SELECT/INSERT/UPDATE/DELETE, 1 RESTRICTIVE ALL
--
-- CROSS-TENANT ISOLATION PROOF:
-- BEGIN;
-- SET LOCAL ROLE texqtic_app;
-- SELECT set_config('app.org_id',    '<orgA_uuid>', true);
-- SELECT set_config('app.realm',     'tenant',      true);
-- SELECT set_config('app.bypass_rls','off',         true);
-- SELECT set_config('app.roles',     'MEMBER',      true);
-- SELECT count(*) FROM carts WHERE tenant_id = '<orgB_uuid>';
-- -- Expected: 0 rows
-- ROLLBACK;
-- ============================================================================
-- ROLLBACK PLAN:
-- 1. DROP unified policies: carts_select_unified, carts_insert_unified,
--    carts_update_unified, carts_delete_unified
-- 2. Recreate from git:
--    tenant_select, tenant_insert, tenant_update, tenant_delete,
--    bypass_select, bypass_insert, bypass_update, bypass_delete
--    (source: 20260214090137_db_hardening_wave_01_gate_d2_rls_carts_cart_items)
-- ============================================================================