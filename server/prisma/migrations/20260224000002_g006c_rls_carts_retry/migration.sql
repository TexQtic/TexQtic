-- ============================================================================
-- G-006C: RLS Policy Consolidation — carts (RETRY)
-- Purpose: Collapse multiple permissive policies per command into one unified
--          policy per command. No logical access change.
-- Note: Re-issued because 20260223020000 was marked as rolled-back due to
--       session-pooler transaction state issue (SQL was never applied).
--       All DROPs use IF EXISTS — fully idempotent.
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Drop old permissive policies
-- ============================================================================
DROP POLICY IF EXISTS tenant_select ON public.carts;
DROP POLICY IF EXISTS bypass_select ON public.carts;
DROP POLICY IF EXISTS tenant_insert ON public.carts;
DROP POLICY IF EXISTS bypass_insert ON public.carts;
DROP POLICY IF EXISTS tenant_update ON public.carts;
DROP POLICY IF EXISTS bypass_update ON public.carts;
DROP POLICY IF EXISTS tenant_delete ON public.carts;
DROP POLICY IF EXISTS bypass_delete ON public.carts;
DROP POLICY IF EXISTS carts_tenant_access ON public.carts;
-- Additional table-prefixed variants found in DB:
DROP POLICY IF EXISTS carts_tenant_select ON public.carts;
DROP POLICY IF EXISTS carts_tenant_insert ON public.carts;
DROP POLICY IF EXISTS carts_tenant_update ON public.carts;
-- ============================================================================
-- STEP 2: Create unified permissive policies (one per command)
-- ============================================================================
CREATE POLICY carts_select_unified ON public.carts AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND carts.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
CREATE POLICY carts_insert_unified ON public.carts AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND carts.tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
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