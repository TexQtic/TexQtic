-- ============================================================================
-- G-006C: RLS Policy Consolidation — orders
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Doctrine v1.4 compliance: single permissive policy per command per role.
-- Supabase Performance Advisor: eliminates multiple-permissive-policy warnings.
-- ============================================================================
--
-- INSPECTION QUERY (run before applying):
-- SELECT policyname, cmd, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'orders'
-- ORDER BY cmd, permissive;
--
-- BEFORE STATE (permissive policies per command):
--   SELECT : orders_tenant_select, orders_admin_all (via FOR ALL) (2 → flagged)
--   INSERT : orders_tenant_insert, orders_admin_all (via FOR ALL) (2 → flagged)
--   UPDATE : orders_admin_all (via FOR ALL)                       (1 — not flagged)
--   DELETE : orders_admin_all (via FOR ALL)                       (1 — not flagged)
--
-- AFTER STATE:
--   SELECT : orders_select_unified  (1) — tenant OR admin
--   INSERT : orders_insert_unified  (1) — tenant OR admin
--   UPDATE : orders_update_unified  (1) — admin only (preserves original semantics)
--   DELETE : orders_delete_unified  (1) — admin only (preserves original semantics)
--
-- NOTE: orders_admin_all (FOR ALL) is dropped and replaced by per-command
--       unified policies to eliminate the source of SELECT/INSERT double-count.
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies
-- ============================================================================
DROP POLICY IF EXISTS orders_tenant_select ON public.orders;
DROP POLICY IF EXISTS orders_tenant_insert ON public.orders;
DROP POLICY IF EXISTS orders_admin_all ON public.orders;
-- Safety: drop any other legacy naming variants
DROP POLICY IF EXISTS orders_tenant_access ON public.orders;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
--
-- Tenant condition preserved from original:
--   current_setting('app.org_id', true) IS NOT NULL
--   AND current_setting('app.org_id', true) <> ''
--   AND tenant_id = current_setting('app.org_id', true)::uuid
-- Expressed via doctrine helpers: app.require_org_context() AND tenant_id = app.current_org_id()
--
-- Admin condition preserved from original:
--   current_setting('app.is_admin', true) = 'true'
-- ============================================================================
-- SELECT unified: tenant read OR admin full-read
CREATE POLICY orders_select_unified ON public.orders AS PERMISSIVE FOR
SELECT USING (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin', true) = 'true'
  );
-- INSERT unified: tenant write OR admin override
CREATE POLICY orders_insert_unified ON public.orders AS PERMISSIVE FOR
INSERT WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin', true) = 'true'
  );
-- UPDATE unified: admin only (matches original orders_admin_all FOR ALL semantics)
-- Tenants cannot UPDATE orders (by original design — checkout system writes only).
CREATE POLICY orders_update_unified ON public.orders AS PERMISSIVE FOR
UPDATE USING (current_setting('app.is_admin', true) = 'true') WITH CHECK (current_setting('app.is_admin', true) = 'true');
-- DELETE unified: admin only (matches original orders_admin_all FOR ALL semantics)
CREATE POLICY orders_delete_unified ON public.orders AS PERMISSIVE FOR DELETE USING (current_setting('app.is_admin', true) = 'true');
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
WHERE c.relname = 'orders'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-006C FAIL: orders RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-006C FAIL: orders FORCE RLS not set';
END IF;
FOR rec IN
SELECT cmd,
  COUNT(*) AS cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'orders'
  AND permissive = 'PERMISSIVE'
GROUP BY cmd LOOP IF rec.cnt > 1 THEN RAISE EXCEPTION 'G-006C FAIL: orders still has % permissive policies for cmd=%',
  rec.cnt,
  rec.cmd;
END IF;
RAISE NOTICE 'G-006C PASS: orders cmd=% permissive_count=%',
rec.cmd,
rec.cnt;
END LOOP;
RAISE NOTICE 'G-006C PASS: orders consolidation verified. FORCE RLS: %',
v_rls_forced;
END $$;
COMMIT;
-- ============================================================================
-- POST-DEPLOY VERIFICATION (run separately):
-- SELECT tablename, cmd, permissive, count(*)
-- FROM pg_policies WHERE tablename = 'orders'
-- GROUP BY tablename, cmd, permissive ORDER BY cmd;
-- Expected: 1 PERMISSIVE per SELECT/INSERT/UPDATE/DELETE
--
-- CROSS-TENANT ISOLATION PROOF:
-- BEGIN;
-- SELECT set_config('app.org_id',    '<orgA_uuid>', true);
-- SELECT set_config('app.is_admin',  'false',       true);
-- SELECT count(*) FROM orders WHERE tenant_id = '<orgB_uuid>';
-- -- Expected: 0 rows
-- ROLLBACK;
-- ============================================================================
-- ROLLBACK PLAN:
-- 1. DROP unified policies: orders_select_unified, orders_insert_unified,
--    orders_update_unified, orders_delete_unified
-- 2. Recreate from git:
--    orders_tenant_select, orders_tenant_insert, orders_admin_all
--    (source: server/prisma/migrations/pr-a-commerce-orders.sql)
-- ============================================================================