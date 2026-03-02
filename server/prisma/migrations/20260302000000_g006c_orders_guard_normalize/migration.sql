-- ============================================================
-- G006C-ORDERS-GUARD-001
-- orders + order_items: RESTRICTIVE guard + role normalization
-- Date: 2026-03-02
-- Admin arm preserved: current_setting('app.is_admin', true) = 'true'
--   (NOT replaced by app.bypass_enabled() — confirmed non-equivalent in Gate 1)
--   app.bypass_enabled() = test/seed bypass only (realm='test'|'service' + TEST_SEED role)
-- Role normalized: {public} → texqtic_app
-- Guard USING: require_org_context() OR is_admin='true' OR bypass_enabled()
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- ORDERS: Step A — DROP existing {public} permissive policies
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS orders_select_unified ON public.orders;
DROP POLICY IF EXISTS orders_insert_unified ON public.orders;
DROP POLICY IF EXISTS orders_update_unified ON public.orders;
DROP POLICY IF EXISTS orders_delete_unified ON public.orders;

-- ─────────────────────────────────────────────────────────────
-- ORDERS: Step B — CREATE RESTRICTIVE guard (FOR ALL TO texqtic_app)
-- Guard passes for: tenant context, platform admin, test/seed bypass
-- ─────────────────────────────────────────────────────────────
CREATE POLICY orders_guard
  ON public.orders
  AS RESTRICTIVE
  FOR ALL
  TO texqtic_app
  USING (
    app.require_org_context()
    OR current_setting('app.is_admin', true) = 'true'
    OR app.bypass_enabled()
  );

-- ─────────────────────────────────────────────────────────────
-- ORDERS: Step C — RECREATE permissive policies TO texqtic_app
-- Logic identical to live state; role normalized; admin arm unchanged
-- ─────────────────────────────────────────────────────────────
CREATE POLICY orders_select_unified
  ON public.orders
  AS PERMISSIVE
  FOR SELECT
  TO texqtic_app
  USING (
    (app.require_org_context() AND (tenant_id = app.current_org_id()))
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  );

CREATE POLICY orders_insert_unified
  ON public.orders
  AS PERMISSIVE
  FOR INSERT
  TO texqtic_app
  WITH CHECK (
    (app.require_org_context() AND (tenant_id = app.current_org_id()))
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  );

-- UPDATE/DELETE: admin-only (preserved from G-003 consolidation 20260223050000)
CREATE POLICY orders_update_unified
  ON public.orders
  AS PERMISSIVE
  FOR UPDATE
  TO texqtic_app
  USING (
    current_setting('app.is_admin'::text, true) = 'true'::text
  )
  WITH CHECK (
    current_setting('app.is_admin'::text, true) = 'true'::text
  );

CREATE POLICY orders_delete_unified
  ON public.orders
  AS PERMISSIVE
  FOR DELETE
  TO texqtic_app
  USING (
    current_setting('app.is_admin'::text, true) = 'true'::text
  );

-- ─────────────────────────────────────────────────────────────
-- ORDER_ITEMS: Step A — DROP existing {public} permissive policies
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS order_items_select_unified ON public.order_items;
DROP POLICY IF EXISTS order_items_insert_unified ON public.order_items;
DROP POLICY IF EXISTS order_items_update_unified ON public.order_items;
DROP POLICY IF EXISTS order_items_delete_unified ON public.order_items;

-- ─────────────────────────────────────────────────────────────
-- ORDER_ITEMS: Step B — CREATE RESTRICTIVE guard (FOR ALL TO texqtic_app)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY order_items_guard
  ON public.order_items
  AS RESTRICTIVE
  FOR ALL
  TO texqtic_app
  USING (
    app.require_org_context()
    OR current_setting('app.is_admin', true) = 'true'
    OR app.bypass_enabled()
  );

-- ─────────────────────────────────────────────────────────────
-- ORDER_ITEMS: Step C — RECREATE permissive policies TO texqtic_app
-- Logic identical to live state; role normalized; admin arm unchanged
-- ─────────────────────────────────────────────────────────────
CREATE POLICY order_items_select_unified
  ON public.order_items
  AS PERMISSIVE
  FOR SELECT
  TO texqtic_app
  USING (
    (app.require_org_context() AND (tenant_id = app.current_org_id()))
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  );

CREATE POLICY order_items_insert_unified
  ON public.order_items
  AS PERMISSIVE
  FOR INSERT
  TO texqtic_app
  WITH CHECK (
    (app.require_org_context() AND (tenant_id = app.current_org_id()))
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  );

-- UPDATE/DELETE: admin-only (preserved from G-003 consolidation 20260223050000)
CREATE POLICY order_items_update_unified
  ON public.order_items
  AS PERMISSIVE
  FOR UPDATE
  TO texqtic_app
  USING (
    current_setting('app.is_admin'::text, true) = 'true'::text
  )
  WITH CHECK (
    current_setting('app.is_admin'::text, true) = 'true'::text
  );

CREATE POLICY order_items_delete_unified
  ON public.order_items
  AS PERMISSIVE
  FOR DELETE
  TO texqtic_app
  USING (
    current_setting('app.is_admin'::text, true) = 'true'::text
  );

-- ─────────────────────────────────────────────────────────────
-- STEP D — DO block self-verifier
-- Asserts post-migration state for both tables.
-- RAISE EXCEPTION on any failure → triggers ROLLBACK.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_table         TEXT;
  v_guard_count   INT;
  v_perm_select   INT;
  v_perm_insert   INT;
  v_perm_update   INT;
  v_perm_delete   INT;
  v_public_count  INT;
  v_force_rls     BOOLEAN;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['orders', 'order_items'] LOOP

    -- Assert FORCE RLS is still enabled
    SELECT relforcerowsecurity INTO v_force_rls
    FROM pg_class WHERE relname = v_table;
    IF NOT v_force_rls THEN
      RAISE EXCEPTION 'VERIFIER FAIL: % — relforcerowsecurity is false', v_table;
    END IF;

    -- Assert exactly 1 RESTRICTIVE guard exists
    SELECT COUNT(*) INTO v_guard_count
    FROM pg_policies
    WHERE tablename = v_table
      AND permissive = 'RESTRICTIVE';
    IF v_guard_count <> 1 THEN
      RAISE EXCEPTION 'VERIFIER FAIL: % — expected 1 RESTRICTIVE guard, found %',
        v_table, v_guard_count;
    END IF;

    -- Assert exactly 1 PERMISSIVE policy per command
    SELECT COUNT(*) INTO v_perm_select FROM pg_policies
    WHERE tablename = v_table AND permissive = 'PERMISSIVE' AND cmd = 'SELECT';
    IF v_perm_select <> 1 THEN
      RAISE EXCEPTION 'VERIFIER FAIL: % — expected 1 PERMISSIVE SELECT, found %',
        v_table, v_perm_select;
    END IF;

    SELECT COUNT(*) INTO v_perm_insert FROM pg_policies
    WHERE tablename = v_table AND permissive = 'PERMISSIVE' AND cmd = 'INSERT';
    IF v_perm_insert <> 1 THEN
      RAISE EXCEPTION 'VERIFIER FAIL: % — expected 1 PERMISSIVE INSERT, found %',
        v_table, v_perm_insert;
    END IF;

    SELECT COUNT(*) INTO v_perm_update FROM pg_policies
    WHERE tablename = v_table AND permissive = 'PERMISSIVE' AND cmd = 'UPDATE';
    IF v_perm_update <> 1 THEN
      RAISE EXCEPTION 'VERIFIER FAIL: % — expected 1 PERMISSIVE UPDATE, found %',
        v_table, v_perm_update;
    END IF;

    SELECT COUNT(*) INTO v_perm_delete FROM pg_policies
    WHERE tablename = v_table AND permissive = 'PERMISSIVE' AND cmd = 'DELETE';
    IF v_perm_delete <> 1 THEN
      RAISE EXCEPTION 'VERIFIER FAIL: % — expected 1 PERMISSIVE DELETE, found %',
        v_table, v_perm_delete;
    END IF;

    -- Assert no {public} role policies remain
    SELECT COUNT(*) INTO v_public_count
    FROM pg_policies
    WHERE tablename = v_table AND roles = '{public}';
    IF v_public_count <> 0 THEN
      RAISE EXCEPTION 'VERIFIER FAIL: % — found % {public} policies, expected 0',
        v_table, v_public_count;
    END IF;

  END LOOP;

  RAISE NOTICE 'VERIFIER PASS — orders + order_items: guards present, policies normalized, no {public} policies remain';
END;
$$;

COMMIT;
