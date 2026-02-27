-- ============================================================================
-- G-017 Admin-Plane RLS: trades + trade_events admin SELECT visibility
--
-- Purpose:
--   Add admin-plane SELECT policies for public.trades and public.trade_events.
--   Allow cross-tenant read access when app.is_admin = 'true' (admin context).
--
-- Root cause / why this migration is needed:
--   G-017 Day 1 (20260306000000) created RESTRICTIVE guards using:
--     USING (app.require_org_context() OR app.bypass_enabled())
--   In admin context (withDbContext + is_admin='true'), BOTH return FALSE:
--     - require_org_context(): no app.org_id set for cross-tenant admin session
--     - bypass_enabled(): requires realm IN ('test','service') + TEST_SEED role
--   Result: admin realm cannot read trades at all, even with a permissive policy.
--
-- Solution (mirrors GATE-TEST-003 for audit_logs):
--   Step 1: Drop + recreate RESTRICTIVE guards to add the admin predicate:
--     OR current_setting('app.is_admin', true) = 'true'
--   Step 2: Add PERMISSIVE SELECT policies for admin context (cross-tenant).
--
-- Safety:
--   - current_setting('app.is_admin', true) returns '' when not set.
--   - '' = 'true' evaluates to FALSE -- safe closed default.
--   - Tenant context: withDbContext always enforces
--     set_config('app.is_admin', 'false', true) for non-admin requests.
--     A tenant cannot spoof is_admin.
--   - Tenant SELECT policies are UNCHANGED -- tenant isolation is preserved.
--
-- Doctrine v1.4 compliance:
--   - No BYPASSRLS, no SECURITY DEFINER, no RLS disable.
--   - No tenant policy removed or weakened.
--   - No UPDATE/DELETE admin policies (SELECT only, as scoped by task).
--
-- Roles:
--   - texqtic_app (matches existing trades policy role)
--   (G-020/G-021/G-022 use texqtic_admin for admin policies; trades Day 1
--    used texqtic_app throughout. We follow the existing table's role pattern.)
--
-- Prerequisites:
--   - 20260306000000_g017_trades_domain (tables + initial RLS) -- must exist
--   - app.require_org_context(), app.bypass_enabled() -- context helpers (Gate A)
-- ============================================================================
BEGIN;
-- ============================================================================
-- §1: Rebuild RESTRICTIVE guard on public.trades (add admin predicate)
--
-- Previous definition (20260306000000_g017_trades_domain):
--   USING (app.require_org_context() OR app.bypass_enabled())
--
-- New definition adds:
--   OR current_setting('app.is_admin', true) = 'true'
--
-- Tenant SELECT/INSERT policies are unchanged -- only the guard is rebuilt.
-- ============================================================================
DROP POLICY IF EXISTS trades_guard ON public.trades;
CREATE POLICY trades_guard ON public.trades AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
  OR current_setting('app.is_admin', true) = 'true'
);
COMMENT ON POLICY trades_guard ON public.trades IS 'RESTRICTIVE guard: fail-closed baseline. Requires org context (tenant reads) OR bypass (test/service seed) OR admin context (is_admin=true). Updated G-017 admin-plane RLS.';
-- ============================================================================
-- §2: Add PERMISSIVE SELECT policy for admin context on public.trades
--
-- Allows cross-tenant SELECT when app.is_admin = 'true'.
-- Does NOT allow tenant context to read other tenants' rows.
-- ============================================================================
DROP POLICY IF EXISTS trades_admin_select ON public.trades;
CREATE POLICY trades_admin_select ON public.trades AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    current_setting('app.is_admin', true) = 'true'
  );
COMMENT ON POLICY trades_admin_select ON public.trades IS 'Admin-plane SELECT: cross-tenant read access in admin context (is_admin=true). Control-plane audit/ops use only. Tenant isolation unchanged.';
-- ============================================================================
-- §3: Rebuild RESTRICTIVE guard on public.trade_events (add admin predicate)
--
-- Same pattern as §1 applied to trade_events.
-- ============================================================================
DROP POLICY IF EXISTS trade_events_guard ON public.trade_events;
CREATE POLICY trade_events_guard ON public.trade_events AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
  OR current_setting('app.is_admin', true) = 'true'
);
COMMENT ON POLICY trade_events_guard ON public.trade_events IS 'RESTRICTIVE guard: fail-closed baseline. Requires org context (tenant reads) OR bypass (test/service seed) OR admin context (is_admin=true). Updated G-017 admin-plane RLS.';
-- ============================================================================
-- §4: Add PERMISSIVE SELECT policy for admin context on public.trade_events
-- ============================================================================
DROP POLICY IF EXISTS trade_events_admin_select ON public.trade_events;
CREATE POLICY trade_events_admin_select ON public.trade_events AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    current_setting('app.is_admin', true) = 'true'
  );
COMMENT ON POLICY trade_events_admin_select ON public.trade_events IS 'Admin-plane SELECT: cross-tenant read access in admin context (is_admin=true). Control-plane audit/ops use only. Tenant isolation unchanged.';
-- ============================================================================
-- §5: Verification block -- migration fails fast if invariants are violated
-- ============================================================================
DO $$
DECLARE v_trades_guard_restrictive int;
v_events_guard_restrictive int;
v_trades_guard_has_admin boolean;
v_events_guard_has_admin boolean;
v_trades_admin_select_cnt int;
v_events_admin_select_cnt int;
v_trades_tenant_select_cnt int;
v_events_tenant_select_cnt int;
v_trades_rls boolean;
v_trades_force boolean;
v_events_rls boolean;
v_events_force boolean;
BEGIN -- 1) Confirm FORCE RLS still enabled on both tables
SELECT relrowsecurity,
  relforcerowsecurity INTO v_trades_rls,
  v_trades_force
FROM pg_class
WHERE relname = 'trades'
  AND relnamespace = 'public'::regnamespace;
IF NOT (
  v_trades_rls
  AND v_trades_force
) THEN RAISE EXCEPTION '[G-017-ADMIN-RLS] FAIL: trades ENABLE/FORCE RLS violated (rls=%, force=%)',
v_trades_rls,
v_trades_force;
END IF;
SELECT relrowsecurity,
  relforcerowsecurity INTO v_events_rls,
  v_events_force
FROM pg_class
WHERE relname = 'trade_events'
  AND relnamespace = 'public'::regnamespace;
IF NOT (
  v_events_rls
  AND v_events_force
) THEN RAISE EXCEPTION '[G-017-ADMIN-RLS] FAIL: trade_events ENABLE/FORCE RLS violated (rls=%, force=%)',
v_events_rls,
v_events_force;
END IF;
-- 2) trades_guard must be RESTRICTIVE
SELECT COUNT(*) INTO v_trades_guard_restrictive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trades'
  AND policyname = 'trades_guard'
  AND permissive = 'RESTRICTIVE';
IF v_trades_guard_restrictive <> 1 THEN RAISE EXCEPTION '[G-017-ADMIN-RLS] FAIL: trades_guard RESTRICTIVE policy missing (count=%)',
v_trades_guard_restrictive;
END IF;
-- 3) trade_events_guard must be RESTRICTIVE
SELECT COUNT(*) INTO v_events_guard_restrictive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trade_events'
  AND policyname = 'trade_events_guard'
  AND permissive = 'RESTRICTIVE';
IF v_events_guard_restrictive <> 1 THEN RAISE EXCEPTION '[G-017-ADMIN-RLS] FAIL: trade_events_guard RESTRICTIVE policy missing (count=%)',
v_events_guard_restrictive;
END IF;
-- 4) Both guards must include is_admin predicate
SELECT (qual ILIKE '%is_admin%') INTO v_trades_guard_has_admin
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trades'
  AND policyname = 'trades_guard';
IF NOT v_trades_guard_has_admin THEN RAISE EXCEPTION '[G-017-ADMIN-RLS] FAIL: trades_guard USING clause does not include is_admin predicate';
END IF;
SELECT (qual ILIKE '%is_admin%') INTO v_events_guard_has_admin
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trade_events'
  AND policyname = 'trade_events_guard';
IF NOT v_events_guard_has_admin THEN RAISE EXCEPTION '[G-017-ADMIN-RLS] FAIL: trade_events_guard USING clause does not include is_admin predicate';
END IF;
-- 5) Admin SELECT policies must exist
SELECT COUNT(*) INTO v_trades_admin_select_cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trades'
  AND policyname = 'trades_admin_select'
  AND permissive = 'PERMISSIVE';
IF v_trades_admin_select_cnt <> 1 THEN RAISE EXCEPTION '[G-017-ADMIN-RLS] FAIL: trades_admin_select PERMISSIVE policy missing (count=%)',
v_trades_admin_select_cnt;
END IF;
SELECT COUNT(*) INTO v_events_admin_select_cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trade_events'
  AND policyname = 'trade_events_admin_select'
  AND permissive = 'PERMISSIVE';
IF v_events_admin_select_cnt <> 1 THEN RAISE EXCEPTION '[G-017-ADMIN-RLS] FAIL: trade_events_admin_select PERMISSIVE policy missing (count=%)',
v_events_admin_select_cnt;
END IF;
-- 6) Tenant SELECT policies must still exist (isolation unchanged)
SELECT COUNT(*) INTO v_trades_tenant_select_cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trades'
  AND policyname = 'trades_tenant_select'
  AND permissive = 'PERMISSIVE';
IF v_trades_tenant_select_cnt <> 1 THEN RAISE EXCEPTION '[G-017-ADMIN-RLS] FAIL: trades_tenant_select policy missing after guard rebuild (count=%)',
v_trades_tenant_select_cnt;
END IF;
SELECT COUNT(*) INTO v_events_tenant_select_cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trade_events'
  AND policyname = 'trade_events_tenant_select'
  AND permissive = 'PERMISSIVE';
IF v_events_tenant_select_cnt <> 1 THEN RAISE EXCEPTION '[G-017-ADMIN-RLS] FAIL: trade_events_tenant_select policy missing after guard rebuild (count=%)',
v_events_tenant_select_cnt;
END IF;
RAISE NOTICE '[G-017-ADMIN-RLS] PASS -- trades_guard: RESTRICTIVE+admin %, trade_events_guard: RESTRICTIVE+admin %, trades_admin_select: %, trade_events_admin_select: %, tenant isolation policies intact: trades=%, events=%',
v_trades_guard_has_admin,
v_events_guard_has_admin,
v_trades_admin_select_cnt,
v_events_admin_select_cnt,
v_trades_tenant_select_cnt,
v_events_tenant_select_cnt;
END;
$$;
COMMIT;