-- ============================================================================
-- G-006C — PHASE B: Admin RLS for marketplace_cart_summaries
-- ============================================================================
--
-- Table: marketplace_cart_summaries
-- Change: Add PERMISSIVE SELECT admin_select policy +
--         Extend restrictive_guard with admin arm
--
-- Rationale:
--   The existing code (admin-cart-summaries.ts) used the legacy 2-arg
--   withDbContext({ isAdmin: true }) which sets app.is_admin = 'true'.
--   However, the existing restrictive_guard did NOT include an admin check,
--   meaning admin requests were caught by the guard and denied under FORCE RLS
--   when only relying on the postgres superuser bypass.
--
--   This migration:
--   1. Adds an explicit PERMISSIVE SELECT admin_select policy keyed on
--      current_setting('app.is_admin', true) = 'true'
--   2. Extends restrictive_guard to pass admin requests through
--   3. Does NOT alter any projector/test-bypass arms
--   4. Does NOT loosen any other conditions
--
-- No schema change. No new tables. No FORCE RLS change.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add admin_select PERMISSIVE policy
-- ============================================================================
-- Purpose: Allow admin control-plane reads across all tenants
-- Trigger: app.is_admin GUC = 'true' (set by withAdminContext helper)
-- Note: cross-tenant by design (no tenant_id filter)
CREATE POLICY admin_select ON marketplace_cart_summaries
  FOR SELECT
  USING (current_setting('app.is_admin', true) = 'true');

COMMENT ON POLICY admin_select ON marketplace_cart_summaries IS
  'Admin cross-tenant SELECT: grants read access to all rows when app.is_admin=true. '
  'Used by control-plane admin-cart-summaries routes. G-006C.';

-- ============================================================================
-- STEP 2: Extend restrictive_guard to include admin arm
-- ============================================================================
-- Drop and recreate: PostgreSQL has no ALTER POLICY USING, only expression-level
-- and here the USING expression changes materially.
-- Original arms preserved exactly:
--   app.require_org_context()         -- tenant context present
--   OR app.projector_bypass_enabled() -- system projector write path
--   OR app.bypass_enabled()           -- test seed/cleanup bypass
-- New arm added:
--   OR current_setting('app.is_admin', true) = 'true' -- admin control-plane

DROP POLICY restrictive_guard ON marketplace_cart_summaries;

CREATE POLICY restrictive_guard ON marketplace_cart_summaries
  AS RESTRICTIVE
  FOR ALL
  USING (
    app.require_org_context()
    OR app.projector_bypass_enabled()
    OR app.bypass_enabled()
    OR current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    app.require_org_context()
    OR app.projector_bypass_enabled()
    OR app.bypass_enabled()
    OR current_setting('app.is_admin', true) = 'true'
  );

COMMENT ON POLICY restrictive_guard ON marketplace_cart_summaries IS
  'Fail-closed guard: Block ALL operations unless one of: (1) valid org context, '
  '(2) projector bypass, (3) test bypass, (4) app.is_admin=true (admin plane). '
  'RESTRICTIVE (AND-combined with permissive policies). G-006C: admin arm added.';

-- ============================================================================
-- STEP 3: Verification DO block
-- ============================================================================
DO $$
DECLARE
  v_admin_select_count INT;
  v_guard_count INT;
BEGIN
  -- Verify admin_select policy exists
  SELECT COUNT(*) INTO v_admin_select_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'marketplace_cart_summaries'
    AND policyname = 'admin_select';

  IF v_admin_select_count = 0 THEN
    RAISE EXCEPTION 'VERIFY FAIL: admin_select policy not found on marketplace_cart_summaries';
  END IF;

  -- Verify restrictive_guard policy exists
  SELECT COUNT(*) INTO v_guard_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'marketplace_cart_summaries'
    AND policyname = 'restrictive_guard';

  IF v_guard_count = 0 THEN
    RAISE EXCEPTION 'VERIFY FAIL: restrictive_guard policy not found on marketplace_cart_summaries';
  END IF;

  -- Verify FORCE RLS still intact
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'marketplace_cart_summaries'
      AND c.relforcerowsecurity = true
  ) THEN
    RAISE EXCEPTION 'VERIFY FAIL: marketplace_cart_summaries FORCE RLS no longer enabled';
  END IF;

  RAISE NOTICE 'VERIFY PASS: admin_select + restrictive_guard (admin arm) + FORCE RLS all confirmed on marketplace_cart_summaries';
END;
$$;
