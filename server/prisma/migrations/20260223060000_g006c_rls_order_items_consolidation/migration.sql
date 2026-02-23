-- ============================================================================
-- G-006C: RLS Policy Consolidation — order_items
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Doctrine v1.4 compliance: single permissive policy per command per role.
-- Supabase Performance Advisor: eliminates multiple-permissive-policy warnings.
-- ============================================================================
--
-- INSPECTION QUERY (run before applying):
-- SELECT policyname, cmd, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'order_items'
-- ORDER BY cmd, permissive;
--
-- BEFORE STATE (permissive policies per command):
--   SELECT : order_items_tenant_select, order_items_admin_all (via FOR ALL) (2 → flagged)
--   INSERT : order_items_tenant_insert, order_items_admin_all (via FOR ALL) (2 → flagged)
--   UPDATE : order_items_admin_all (via FOR ALL)                            (1 — not flagged)
--   DELETE : order_items_admin_all (via FOR ALL)                            (1 — not flagged)
--
-- AFTER STATE:
--   SELECT : order_items_select_unified  (1) — tenant OR admin
--   INSERT : order_items_insert_unified  (1) — tenant OR admin
--   UPDATE : order_items_update_unified  (1) — admin only
--   DELETE : order_items_delete_unified  (1) — admin only
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies
-- ============================================================================
DROP POLICY IF EXISTS order_items_tenant_select ON public.order_items;
DROP POLICY IF EXISTS order_items_tenant_insert ON public.order_items;
DROP POLICY IF EXISTS order_items_admin_all ON public.order_items;
-- Safety: drop any legacy naming variants
DROP POLICY IF EXISTS order_items_tenant_access ON public.order_items;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
-- ============================================================================
-- SELECT unified: tenant read OR admin full-read
CREATE POLICY order_items_select_unified ON public.order_items AS PERMISSIVE FOR
SELECT USING (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin', true) = 'true'
  );
-- INSERT unified: tenant write OR admin override
-- Preserves: system writes during checkout (tenant), admin override
CREATE POLICY order_items_insert_unified ON public.order_items AS PERMISSIVE FOR
INSERT WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin', true) = 'true'
  );
-- UPDATE unified: admin only (pricing snapshots are immutable for tenants)
CREATE POLICY order_items_update_unified ON public.order_items AS PERMISSIVE FOR
UPDATE USING (current_setting('app.is_admin', true) = 'true') WITH CHECK (current_setting('app.is_admin', true) = 'true');
-- DELETE unified: admin only
CREATE POLICY order_items_delete_unified ON public.order_items AS PERMISSIVE FOR DELETE USING (current_setting('app.is_admin', true) = 'true');
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
WHERE c.relname = 'order_items'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-006C FAIL: order_items RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-006C FAIL: order_items FORCE RLS not set';
END IF;
FOR rec IN
SELECT cmd,
  COUNT(*) AS cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'order_items'
  AND permissive = 'PERMISSIVE'
GROUP BY cmd LOOP IF rec.cnt > 1 THEN RAISE EXCEPTION 'G-006C FAIL: order_items still has % permissive policies for cmd=%',
  rec.cnt,
  rec.cmd;
END IF;
RAISE NOTICE 'G-006C PASS: order_items cmd=% permissive_count=%',
rec.cmd,
rec.cnt;
END LOOP;
RAISE NOTICE 'G-006C PASS: order_items consolidation verified. FORCE RLS: %',
v_rls_forced;
END $$;
COMMIT;
-- ============================================================================
-- POST-DEPLOY VERIFICATION (run separately):
-- SELECT tablename, cmd, permissive, count(*)
-- FROM pg_policies WHERE tablename = 'order_items'
-- GROUP BY tablename, cmd, permissive ORDER BY cmd;
-- Expected: 1 PERMISSIVE per SELECT/INSERT/UPDATE/DELETE
--
-- CROSS-TENANT ISOLATION PROOF:
-- BEGIN;
-- SELECT set_config('app.org_id',   '<orgA_uuid>', true);
-- SELECT set_config('app.is_admin', 'false',       true);
-- SELECT count(*) FROM order_items WHERE tenant_id = '<orgB_uuid>';
-- -- Expected: 0 rows
-- ROLLBACK;
-- ============================================================================
-- ROLLBACK PLAN:
-- 1. DROP unified policies: order_items_select_unified, order_items_insert_unified,
--    order_items_update_unified, order_items_delete_unified
-- 2. Recreate from git:
--    order_items_tenant_select, order_items_tenant_insert, order_items_admin_all
--    (source: server/prisma/migrations/pr-a-commerce-orders.sql)
-- ============================================================================