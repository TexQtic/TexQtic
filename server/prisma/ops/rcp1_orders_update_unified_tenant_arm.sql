-- OPS / RCP-1: Extend orders_update_unified with tenant-scoped UPDATE arm
-- TECS ID  : OPS-RLS-ORDERS-UPDATE-001
-- Gap      : GAP-RLS-ORDERS-UPDATE-001
-- Date     : 2026-03-03
-- Purpose  : Allow texqtic_app to UPDATE public.orders rows that belong to its own
--            tenant while preserving the existing admin arm.
--
-- Root cause of blocker (recorded):
--   orders_update_unified previously allowed UPDATE only when
--   current_setting('app.is_admin', true) = 'true'. withDbContext sets
--   app.org_id / app.actor_id / app.realm / app.request_id with bypass_rls=off
--   but intentionally does NOT set app.is_admin (B1 posture).
--   Result: tenant actors could SEE orders (SELECT arm) but not UPDATE them.
--
-- Fix (this file):
--   Add a tenant-scoped arm to both USING and WITH CHECK:
--     (app.require_org_context() AND tenant_id = app.current_org_id())
--   Admin arm preserved unchanged.
--
-- Safety notes:
--   - GRANT UPDATE on public.orders to texqtic_app already applied (rcp1_orders_update_grant.sql)
--   - Only orders_update_unified on public.orders is affected.
--   - No other tables, policies, indexes, or columns are modified.
--   - Idempotent: DROP POLICY IF EXISTS before CREATE POLICY.
--   - App-layer role gates (OWNER/ADMIN check in PATCH /api/tenant/orders/:id/status)
--     remain the primary authorization boundary.
--
-- Apply:
--   psql "$DATABASE_URL" -f server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql
--
-- Verify after apply:
--   SELECT policyname, cmd, qual, with_check
--     FROM pg_policies
--    WHERE tablename = 'orders' AND policyname = 'orders_update_unified';
--
-- Governance sign-off (required before apply):
-- "We accept that tenant-scoped actors (texqtic_app with app.require_org_context())
--  may UPDATE public.orders rows for their own tenant under RLS.
--  App-layer role gates (OWNER/ADMIN check in PATCH handler) remain the primary
--  authorization boundary. B1 / D-5 posture is preserved."

BEGIN;

-- Drop and recreate orders_update_unified only.
-- No other policies on this table are touched.
DROP POLICY IF EXISTS orders_update_unified ON public.orders;

CREATE POLICY orders_update_unified ON public.orders
  AS PERMISSIVE FOR UPDATE TO texqtic_app
  USING (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  )
  WITH CHECK (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  );

-- VERIFY: confirm policy exists with the expected arms
DO $$
DECLARE
  v_qual       text;
  v_with_check text;
BEGIN
  SELECT qual, with_check
    INTO v_qual, v_with_check
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'orders'
     AND policyname = 'orders_update_unified';

  IF v_qual IS NULL THEN
    RAISE EXCEPTION 'VERIFY FAIL: orders_update_unified not found in pg_policies';
  END IF;

  IF v_qual NOT LIKE '%require_org_context%' THEN
    RAISE EXCEPTION 'VERIFY FAIL: tenant arm (require_org_context) missing from USING';
  END IF;

  IF v_with_check NOT LIKE '%require_org_context%' THEN
    RAISE EXCEPTION 'VERIFY FAIL: tenant arm (require_org_context) missing from WITH CHECK';
  END IF;

  IF v_qual NOT LIKE '%is_admin%' THEN
    RAISE EXCEPTION 'VERIFY FAIL: admin arm (is_admin) missing from USING';
  END IF;

  RAISE NOTICE 'VERIFY PASS: orders_update_unified has tenant + admin arms in USING and WITH CHECK';
END;
$$;

COMMIT;
