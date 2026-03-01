BEGIN;
-- G-006C-AUDIT-LOGS-UNIFY-001 (Option B)
-- GOVERNANCE-SYNC-029
--
-- Problem state (D-6 + D-7):
--   audit_logs_select_unified  -- PERMISSIVE SELECT -- tenant arm only; no admin cross-tenant access
--   audit_logs_admin_select    -- PERMISSIVE SELECT -- admin arm only; restricted to tenant_id IS NULL (D-7 bug)
--
-- Fix: drop both stale policies, replace with single canonical unified policy
-- that covers both tenant and admin reads without the tenant_id IS NULL restriction.
-- Step 1: Drop legacy policies
DROP POLICY IF EXISTS audit_logs_tenant_read ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_unified ON public.audit_logs;
-- Step 2: Create canonical unified SELECT policy (Option B)
CREATE POLICY audit_logs_select_unified ON public.audit_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      tenant_id::text = current_setting('app.org_id', true)
    )
    OR (
      current_setting('app.is_admin', true) = 'true'
    )
  );
-- Step 3: Self-verification (raises if invariants violated)
DO $$
DECLARE sel_count int;
guard_count int;
BEGIN
SELECT count(*) INTO sel_count
FROM pg_policies
WHERE tablename = 'audit_logs'
  AND cmd = 'SELECT'
  AND permissive = 'PERMISSIVE';
IF sel_count <> 1 THEN RAISE EXCEPTION 'Expected exactly 1 PERMISSIVE SELECT policy on audit_logs, found %',
sel_count;
END IF;
SELECT count(*) INTO guard_count
FROM pg_policies
WHERE tablename = 'audit_logs'
  AND permissive = 'RESTRICTIVE';
IF guard_count = 0 THEN RAISE EXCEPTION 'Missing RESTRICTIVE guard policy on audit_logs';
END IF;
END $$;
COMMIT;