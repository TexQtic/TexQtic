-- ============================================================================
-- G-006C: RLS Policy Consolidation — cart_items
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Doctrine v1.4 compliance: single permissive policy per command per role.
-- Supabase Performance Advisor: eliminates multiple-permissive-policy warnings.
-- ============================================================================
--
-- SPECIAL NOTE: cart_items has NO direct tenant_id column.
-- Tenant isolation is enforced via FK JOIN to carts.tenant_id.
-- Both tenant and bypass conditions are preserved exactly.
--
-- INSPECTION QUERY (run before applying):
-- SELECT policyname, cmd, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'cart_items'
-- ORDER BY cmd, permissive;
--
-- BEFORE STATE:
--   SELECT : tenant_select (JOIN), bypass_select     (2 → flagged)
--   INSERT : tenant_insert (JOIN), bypass_insert     (2 → flagged)
--   UPDATE : tenant_update (JOIN), bypass_update     (2 → flagged)
--   DELETE : tenant_delete (JOIN), bypass_delete     (2 → flagged)
--   RESTRICTIVE guard (cart_items_guard) — kept unchanged
--
-- AFTER STATE:
--   SELECT : cart_items_select_unified  (1)
--   INSERT : cart_items_insert_unified  (1)
--   UPDATE : cart_items_update_unified  (1)
--   DELETE : cart_items_delete_unified  (1)
--   RESTRICTIVE guard (cart_items_guard) — unchanged
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies
-- ============================================================================
DROP POLICY IF EXISTS tenant_select ON public.cart_items;
DROP POLICY IF EXISTS bypass_select ON public.cart_items;
DROP POLICY IF EXISTS tenant_insert ON public.cart_items;
DROP POLICY IF EXISTS bypass_insert ON public.cart_items;
DROP POLICY IF EXISTS tenant_update ON public.cart_items;
DROP POLICY IF EXISTS bypass_update ON public.cart_items;
DROP POLICY IF EXISTS tenant_delete ON public.cart_items;
DROP POLICY IF EXISTS bypass_delete ON public.cart_items;
-- Safety: drop any legacy naming variants
DROP POLICY IF EXISTS cart_items_tenant_access ON public.cart_items;
-- Additional table-prefixed variants found in DB:
DROP POLICY IF EXISTS cart_items_tenant_select ON public.cart_items;
DROP POLICY IF EXISTS cart_items_tenant_insert ON public.cart_items;
DROP POLICY IF EXISTS cart_items_tenant_update ON public.cart_items;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
-- JOIN-based tenant isolation preserved exactly.
-- ============================================================================
-- SELECT unified (JOIN isolation preserved)
CREATE POLICY cart_items_select_unified ON public.cart_items AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND EXISTS (
        SELECT 1
        FROM carts
        WHERE carts.id = cart_items.cart_id
          AND carts.tenant_id = app.current_org_id()
      )
    )
    OR app.bypass_enabled()
  );
-- INSERT unified (JOIN isolation preserved)
CREATE POLICY cart_items_insert_unified ON public.cart_items AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND EXISTS (
        SELECT 1
        FROM carts
        WHERE carts.id = cart_items.cart_id
          AND carts.tenant_id = app.current_org_id()
      )
    )
    OR app.bypass_enabled()
  );
-- UPDATE unified (JOIN isolation preserved)
CREATE POLICY cart_items_update_unified ON public.cart_items AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (
      app.require_org_context()
      AND EXISTS (
        SELECT 1
        FROM carts
        WHERE carts.id = cart_items.cart_id
          AND carts.tenant_id = app.current_org_id()
      )
    )
    OR app.bypass_enabled()
  ) WITH CHECK (
    (
      app.require_org_context()
      AND EXISTS (
        SELECT 1
        FROM carts
        WHERE carts.id = cart_items.cart_id
          AND carts.tenant_id = app.current_org_id()
      )
    )
    OR app.bypass_enabled()
  );
-- DELETE unified (JOIN isolation preserved)
CREATE POLICY cart_items_delete_unified ON public.cart_items AS PERMISSIVE FOR DELETE TO texqtic_app USING (
  (
    app.require_org_context()
    AND EXISTS (
      SELECT 1
      FROM carts
      WHERE carts.id = cart_items.cart_id
        AND carts.tenant_id = app.current_org_id()
    )
  )
  OR app.bypass_enabled()
);
-- NOTE: cart_items_guard (RESTRICTIVE, FOR ALL) is intentionally NOT dropped.
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
WHERE c.relname = 'cart_items'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-006C FAIL: cart_items RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-006C FAIL: cart_items FORCE RLS not set';
END IF;
FOR rec IN
SELECT cmd,
  COUNT(*) AS cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cart_items'
  AND permissive = 'PERMISSIVE'
GROUP BY cmd LOOP IF rec.cnt > 1 THEN RAISE EXCEPTION 'G-006C FAIL: cart_items still has % permissive policies for cmd=%',
  rec.cnt,
  rec.cmd;
END IF;
RAISE NOTICE 'G-006C PASS: cart_items cmd=% permissive_count=%',
rec.cmd,
rec.cnt;
END LOOP;
RAISE NOTICE 'G-006C PASS: cart_items consolidation verified. FORCE RLS: %',
v_rls_forced;
END $$;
COMMIT;
-- ============================================================================
-- POST-DEPLOY VERIFICATION (run separately):
-- SELECT tablename, cmd, permissive, count(*)
-- FROM pg_policies WHERE tablename = 'cart_items'
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
-- SELECT count(*) FROM cart_items ci
--   JOIN carts c ON c.id = ci.cart_id
--   WHERE c.tenant_id = '<orgB_uuid>';
-- -- Expected: 0 rows
-- ROLLBACK;
-- ============================================================================
-- ROLLBACK PLAN:
-- 1. DROP unified policies: cart_items_select_unified, cart_items_insert_unified,
--    cart_items_update_unified, cart_items_delete_unified
-- 2. Recreate from git:
--    tenant_select, tenant_insert, tenant_update, tenant_delete,
--    bypass_select, bypass_insert, bypass_update, bypass_delete
--    (source: 20260214090137_db_hardening_wave_01_gate_d2_rls_carts_cart_items)
-- ============================================================================