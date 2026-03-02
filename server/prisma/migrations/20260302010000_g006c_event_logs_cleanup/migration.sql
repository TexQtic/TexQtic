-- ============================================================
-- G006C-EVENT-LOGS-CLEANUP-001
-- event_logs: DROP 2 orphan PERMISSIVE ALL deny policies
-- Date: 2026-03-02
-- Pre-req: G006C-ORDERS-GUARD-001 COMPLETE (migration 20260302000000)
-- Risk: LOW — orphan policies use USING false; dropping changes nothing
--        for anon/authenticated (FORCE RLS + no permissive = blocked)
-- Compensating control confirmed (Gate 1): event_logs_guard roles =
--   {texqtic_app} only — anon/authenticated are not in guard scope.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- Step 1: DROP orphan PERMISSIVE ALL deny policy for {anon}
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS event_logs_deny_anon_all ON public.event_logs;

-- ─────────────────────────────────────────────────────────────
-- Step 2: DROP orphan PERMISSIVE ALL deny policy for {authenticated}
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS event_logs_deny_authenticated_all ON public.event_logs;

-- ─────────────────────────────────────────────────────────────
-- Step 3: DO block verifier
-- Asserts post-drop invariants. RAISE EXCEPTION on any failure.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_force_rls          BOOLEAN;
  v_guard_count        INT;
  v_guard_roles        TEXT[];
  v_perm_all_count     INT;
  v_select_unified     INT;
  v_insert_unified     INT;
BEGIN
  -- Assert FORCE RLS still enabled
  SELECT relforcerowsecurity INTO v_force_rls
  FROM pg_class WHERE relname = 'event_logs';
  IF NOT v_force_rls THEN
    RAISE EXCEPTION 'VERIFIER FAIL: event_logs — relforcerowsecurity is false';
  END IF;

  -- Assert exactly 1 RESTRICTIVE guard exists
  SELECT COUNT(*) INTO v_guard_count
  FROM pg_policies
  WHERE tablename = 'event_logs' AND permissive = 'RESTRICTIVE';
  IF v_guard_count <> 1 THEN
    RAISE EXCEPTION 'VERIFIER FAIL: event_logs — expected 1 RESTRICTIVE guard, found %',
      v_guard_count;
  END IF;

  -- Assert guard roles are {texqtic_app} only
  SELECT roles INTO v_guard_roles
  FROM pg_policies
  WHERE tablename = 'event_logs'
    AND policyname = 'event_logs_guard';
  IF v_guard_roles <> ARRAY['texqtic_app'] THEN
    RAISE EXCEPTION 'VERIFIER FAIL: event_logs_guard roles = %, expected {texqtic_app}',
      v_guard_roles::text;
  END IF;

  -- Assert zero PERMISSIVE FOR ALL policies remain
  SELECT COUNT(*) INTO v_perm_all_count
  FROM pg_policies
  WHERE tablename = 'event_logs'
    AND permissive = 'PERMISSIVE'
    AND cmd = 'ALL';
  IF v_perm_all_count <> 0 THEN
    RAISE EXCEPTION 'VERIFIER FAIL: event_logs — expected 0 PERMISSIVE ALL, found %',
      v_perm_all_count;
  END IF;

  -- Assert event_logs_select_unified still present
  SELECT COUNT(*) INTO v_select_unified
  FROM pg_policies
  WHERE tablename = 'event_logs'
    AND policyname = 'event_logs_select_unified';
  IF v_select_unified <> 1 THEN
    RAISE EXCEPTION 'VERIFIER FAIL: event_logs_select_unified missing (count=%)',
      v_select_unified;
  END IF;

  -- Assert event_logs_insert_unified still present
  SELECT COUNT(*) INTO v_insert_unified
  FROM pg_policies
  WHERE tablename = 'event_logs'
    AND policyname = 'event_logs_insert_unified';
  IF v_insert_unified <> 1 THEN
    RAISE EXCEPTION 'VERIFIER FAIL: event_logs_insert_unified missing (count=%)',
      v_insert_unified;
  END IF;

  RAISE NOTICE 'VERIFIER PASS — event_logs: orphan deny policies removed; guard intact (texqtic_app only); unified select+insert intact; 0 PERMISSIVE ALL remain';
END;
$$;

COMMIT;
