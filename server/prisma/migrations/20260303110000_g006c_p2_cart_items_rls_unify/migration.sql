-- ============================================================================
-- G-006C P2: RLS Unify — cart_items
-- TECS ID  : G-006C-P2-CART_ITEMS-RLS-UNIFY-001
-- Date     : 2026-03-03
-- Doctrine : v1.4
-- Pattern  : Canonical unified policy per command — matches Wave 3 Tail standard
--            established by GOVERNANCE-SYNC-030 (orders/order_items) and
--            GOVERNANCE-SYNC-031 (event_logs).
--
-- Problem:
--   cart_items policies introduced in gate-d2 (20260214) used bypass_enabled()
--   as the admin arm. The 20260223030000 consolidation unified them but retained
--   app.bypass_enabled() which is NOT equivalent to is_admin (Gate 1 investigation;
--   GOVERNANCE-SYNC-030). This migration replaces the admin arm with the canonical
--   current_setting('app.is_admin', true) = 'true' predicate in all PERMISSIVE
--   policies, and rebuilds the RESTRICTIVE guard to include the admin arm.
--
-- SPECIAL NOTE: cart_items has NO direct tenant_id column.
--   Tenant isolation is enforced via EXISTS JOIN to carts.tenant_id.
--   DELETE is tenant-accessible (users remove items from their own carts).
--
-- BEFORE (policies to replace):
--   cart_items_guard           RESTRICTIVE FOR ALL  — USING: require_org_context() OR bypass_enabled()
--   cart_items_select_unified  PERMISSIVE  SELECT   — USING: JOIN OR bypass_enabled()
--   cart_items_insert_unified  PERMISSIVE  INSERT   — CHECK: JOIN OR bypass_enabled()
--   cart_items_update_unified  PERMISSIVE  UPDATE   — USING+CHECK: JOIN OR bypass_enabled()
--   cart_items_delete_unified  PERMISSIVE  DELETE   — USING: JOIN OR bypass_enabled()
--   (plus any legacy bypass_* / tenant_* variants that may remain from gate-d2)
--
-- AFTER (canonical Wave 3 Tail pattern):
--   cart_items_guard           RESTRICTIVE FOR ALL  — require_org_context() OR is_admin='true' OR bypass_enabled()
--   cart_items_select_unified  PERMISSIVE  SELECT   — (JOIN + require_org_context()) OR is_admin='true'
--   cart_items_insert_unified  PERMISSIVE  INSERT   — (JOIN + require_org_context()) OR is_admin='true'
--   cart_items_update_unified  PERMISSIVE  UPDATE   — (JOIN + require_org_context()) OR is_admin='true'
--   cart_items_delete_unified  PERMISSIVE  DELETE   — (JOIN + require_org_context()) OR is_admin='true'
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Drop all existing policies for cart_items
-- Covers: gate-d2 legacy (bypass_*, tenant_*), 20260223 unified, any variants
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS cart_items_guard             ON public.cart_items;
DROP POLICY IF EXISTS cart_items_select_unified    ON public.cart_items;
DROP POLICY IF EXISTS cart_items_insert_unified    ON public.cart_items;
DROP POLICY IF EXISTS cart_items_update_unified    ON public.cart_items;
DROP POLICY IF EXISTS cart_items_delete_unified    ON public.cart_items;
-- legacy gate-d2 variants (in case 20260223 was never applied to this DB)
DROP POLICY IF EXISTS tenant_select                ON public.cart_items;
DROP POLICY IF EXISTS tenant_insert                ON public.cart_items;
DROP POLICY IF EXISTS tenant_update                ON public.cart_items;
DROP POLICY IF EXISTS tenant_delete                ON public.cart_items;
DROP POLICY IF EXISTS bypass_select                ON public.cart_items;
DROP POLICY IF EXISTS bypass_insert                ON public.cart_items;
DROP POLICY IF EXISTS bypass_update                ON public.cart_items;
DROP POLICY IF EXISTS bypass_delete                ON public.cart_items;
-- safety: any other table-prefixed legacy variants
DROP POLICY IF EXISTS cart_items_tenant_access     ON public.cart_items;
DROP POLICY IF EXISTS cart_items_tenant_select     ON public.cart_items;
DROP POLICY IF EXISTS cart_items_tenant_insert     ON public.cart_items;
DROP POLICY IF EXISTS cart_items_tenant_update     ON public.cart_items;
DROP POLICY IF EXISTS cart_items_tenant_delete     ON public.cart_items;
DROP POLICY IF EXISTS cart_items_bypass_select     ON public.cart_items;
DROP POLICY IF EXISTS cart_items_bypass_insert     ON public.cart_items;
DROP POLICY IF EXISTS cart_items_bypass_update     ON public.cart_items;
DROP POLICY IF EXISTS cart_items_bypass_delete     ON public.cart_items;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: RESTRICTIVE guard — canonical Wave 3 Tail pattern
-- Passes for: tenant context, platform admin, test/seed bypass
-- Admin arm prevents guard from blocking admin reads/writes.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY cart_items_guard
  ON public.cart_items
  AS RESTRICTIVE
  FOR ALL
  TO texqtic_app
  USING (
    app.require_org_context()
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );

-- ─────────────────────────────────────────────────────────────
-- STEP 3: PERMISSIVE unified policies — one per command
-- Tenant arm: EXISTS JOIN to carts.tenant_id (no direct tenant_id column)
-- Admin arm : current_setting('app.is_admin', true) = 'true'
--             (NOT bypass_enabled() — see Gate 1 / GOVERNANCE-SYNC-030)
-- ─────────────────────────────────────────────────────────────

-- SELECT unified
CREATE POLICY cart_items_select_unified
  ON public.cart_items
  AS PERMISSIVE
  FOR SELECT
  TO texqtic_app
  USING (
    (
      app.require_org_context()
      AND EXISTS (
        SELECT 1
        FROM public.carts
        WHERE carts.id = cart_items.cart_id
          AND carts.tenant_id = app.current_org_id()
      )
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );

-- INSERT unified
CREATE POLICY cart_items_insert_unified
  ON public.cart_items
  AS PERMISSIVE
  FOR INSERT
  TO texqtic_app
  WITH CHECK (
    (
      app.require_org_context()
      AND EXISTS (
        SELECT 1
        FROM public.carts
        WHERE carts.id = cart_items.cart_id
          AND carts.tenant_id = app.current_org_id()
      )
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );

-- UPDATE unified
CREATE POLICY cart_items_update_unified
  ON public.cart_items
  AS PERMISSIVE
  FOR UPDATE
  TO texqtic_app
  USING (
    (
      app.require_org_context()
      AND EXISTS (
        SELECT 1
        FROM public.carts
        WHERE carts.id = cart_items.cart_id
          AND carts.tenant_id = app.current_org_id()
      )
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  )
  WITH CHECK (
    (
      app.require_org_context()
      AND EXISTS (
        SELECT 1
        FROM public.carts
        WHERE carts.id = cart_items.cart_id
          AND carts.tenant_id = app.current_org_id()
      )
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );

-- DELETE unified
-- Note: DELETE remains tenant-accessible — users remove items from their own carts.
CREATE POLICY cart_items_delete_unified
  ON public.cart_items
  AS PERMISSIVE
  FOR DELETE
  TO texqtic_app
  USING (
    (
      app.require_org_context()
      AND EXISTS (
        SELECT 1
        FROM public.carts
        WHERE carts.id = cart_items.cart_id
          AND carts.tenant_id = app.current_org_id()
      )
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Self-verifier DO block
-- Raises on any invariant violation → triggers ROLLBACK.
-- Checks: FORCE RLS, exactly 1 RESTRICTIVE guard, exactly 1 PERMISSIVE
-- per command, 0 {public} policies, admin + tenant predicate present.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_force_rls    BOOLEAN;
  v_guard_count  INT;
  v_perm_select  INT;
  v_perm_insert  INT;
  v_perm_update  INT;
  v_perm_delete  INT;
  v_public_count INT;
  v_guard_qual   TEXT;
  v_sel_qual     TEXT;
BEGIN
  -- Assert FORCE RLS enabled
  SELECT relforcerowsecurity
    INTO v_force_rls
    FROM pg_class
   WHERE relname = 'cart_items';
  IF NOT v_force_rls THEN
    RAISE EXCEPTION 'VERIFIER FAIL: cart_items — relforcerowsecurity is false';
  END IF;

  -- Assert exactly 1 RESTRICTIVE guard
  SELECT COUNT(*)
    INTO v_guard_count
    FROM pg_policies
   WHERE tablename = 'cart_items'
     AND permissive = 'RESTRICTIVE';
  IF v_guard_count <> 1 THEN
    RAISE EXCEPTION 'VERIFIER FAIL: cart_items — expected 1 RESTRICTIVE guard, found %',
      v_guard_count;
  END IF;

  -- Assert guard predicate includes both is_admin and require_org_context
  SELECT qual
    INTO v_guard_qual
    FROM pg_policies
   WHERE tablename = 'cart_items'
     AND permissive = 'RESTRICTIVE';
  IF v_guard_qual NOT LIKE '%is_admin%' THEN
    RAISE EXCEPTION 'VERIFIER FAIL: cart_items guard — missing is_admin arm in USING predicate';
  END IF;
  IF v_guard_qual NOT LIKE '%require_org_context%' THEN
    RAISE EXCEPTION 'VERIFIER FAIL: cart_items guard — missing require_org_context arm in USING predicate';
  END IF;

  -- Assert exactly 1 PERMISSIVE policy per command
  SELECT COUNT(*) INTO v_perm_select FROM pg_policies
  WHERE tablename = 'cart_items' AND permissive = 'PERMISSIVE' AND cmd = 'SELECT';
  IF v_perm_select <> 1 THEN
    RAISE EXCEPTION 'VERIFIER FAIL: cart_items — expected 1 PERMISSIVE SELECT, found %', v_perm_select;
  END IF;

  SELECT COUNT(*) INTO v_perm_insert FROM pg_policies
  WHERE tablename = 'cart_items' AND permissive = 'PERMISSIVE' AND cmd = 'INSERT';
  IF v_perm_insert <> 1 THEN
    RAISE EXCEPTION 'VERIFIER FAIL: cart_items — expected 1 PERMISSIVE INSERT, found %', v_perm_insert;
  END IF;

  SELECT COUNT(*) INTO v_perm_update FROM pg_policies
  WHERE tablename = 'cart_items' AND permissive = 'PERMISSIVE' AND cmd = 'UPDATE';
  IF v_perm_update <> 1 THEN
    RAISE EXCEPTION 'VERIFIER FAIL: cart_items — expected 1 PERMISSIVE UPDATE, found %', v_perm_update;
  END IF;

  SELECT COUNT(*) INTO v_perm_delete FROM pg_policies
  WHERE tablename = 'cart_items' AND permissive = 'PERMISSIVE' AND cmd = 'DELETE';
  IF v_perm_delete <> 1 THEN
    RAISE EXCEPTION 'VERIFIER FAIL: cart_items — expected 1 PERMISSIVE DELETE, found %', v_perm_delete;
  END IF;

  -- Assert PERMISSIVE SELECT predicate includes admin arm
  SELECT qual
    INTO v_sel_qual
    FROM pg_policies
   WHERE tablename = 'cart_items'
     AND permissive = 'PERMISSIVE'
     AND cmd = 'SELECT';
  IF v_sel_qual NOT LIKE '%is_admin%' THEN
    RAISE EXCEPTION 'VERIFIER FAIL: cart_items SELECT — missing is_admin arm (bypass_enabled wrongly used?)';
  END IF;

  -- Assert no {public} role policies remain
  SELECT COUNT(*) INTO v_public_count
    FROM pg_policies
   WHERE tablename = 'cart_items' AND roles::text = '{public}';
  IF v_public_count <> 0 THEN
    RAISE EXCEPTION 'VERIFIER FAIL: cart_items — found % {public} policies, expected 0', v_public_count;
  END IF;

  RAISE NOTICE 'VERIFIER PASS: cart_items — guard=1 RESTRICTIVE (admin arm present), SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each (is_admin arm present), FORCE RLS=%, no {public} policies',
    v_force_rls;
END;
$$;

COMMIT;

-- ============================================================================
-- CROSS-TENANT ISOLATION PROOF (run manually after psql apply):
-- SIM1 — tenant context, own cart items visible:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '<orgA_uuid>', true);
--   SELECT set_config('app.actor_id',   '<any_uuid>',  true);
--   SELECT set_config('app.realm',      'tenant',      true);
--   SELECT set_config('app.bypass_rls', 'off',         true);
--   SELECT set_config('app.request_id', gen_random_uuid()::text, true);
--   SELECT count(*) FROM public.cart_items; -- Expected: own-tenant count
--   ROLLBACK;
--
-- SIM2 — tenant context, OTHER tenant cart items = 0:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '<orgA_uuid>', true);
--   SELECT set_config('app.realm',      'tenant',      true);
--   SELECT set_config('app.bypass_rls', 'off',         true);
--   SELECT count(*) FROM public.cart_items ci
--     JOIN public.carts c ON c.id = ci.cart_id
--    WHERE c.tenant_id = '<orgB_uuid>';  -- Expected: 0
--   ROLLBACK;
--
-- SIM3 — control + is_admin='true': cross-tenant rows visible:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '00000000-0000-0000-0000-000000000001', true);
--   SELECT set_config('app.actor_id',   '00000000-0000-0000-0000-000000000001', true);
--   SELECT set_config('app.realm',      'control', true);
--   SELECT set_config('app.is_admin',   'true',    true);
--   SELECT set_config('app.bypass_rls', 'off',     true);
--   SELECT count(*) FROM public.cart_items; -- Expected: total across all tenants
--   ROLLBACK;
-- ============================================================================
-- APPLY:
--   psql "$DATABASE_URL" -f server/prisma/migrations/20260303110000_g006c_p2_cart_items_rls_unify/migration.sql
-- ============================================================================
