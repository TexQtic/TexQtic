-- Migration: 20260609000000_gst_verifications_update_grant_and_policy
-- Unit: FIX-GST-VERIFICATIONS-RLS-INSERT-UPDATE-PERMISSION-01
--
-- ROOT CAUSE
--   Migration 20260515120000_ttp_foundation_001 §15 granted only:
--     GRANT SELECT, INSERT ON public.gst_verifications TO texqtic_app
--   No UPDATE privilege and no PERMISSIVE UPDATE policy were created.
--
--   gstVerification.service.ts submitVerification() calls
--   prisma.gst_verifications.upsert() which Prisma translates to
--   INSERT ... ON CONFLICT DO UPDATE. PostgreSQL evaluates privilege
--   requirements for the entire statement at parse/plan time — even when
--   only the INSERT path executes (first submission, no prior record),
--   the UPDATE privilege is required by the conflict-update clause.
--
--   Effect: every tenant GST submission fails with:
--     42501: permission denied for table gst_verifications
--   regardless of org context or whether a prior record exists.
--
-- FIX
--   §1  Add PERMISSIVE UPDATE policy for texqtic_app (mirrors insert_unified
--       pattern — same org_id = app.current_org_id() predicate).
--   §2  GRANT UPDATE on gst_verifications to texqtic_app.
--   §3  Inline verifier DO block.
--
-- SECURITY INVARIANTS PRESERVED
--   1. RLS remains ENABLED + FORCED on public.gst_verifications.
--   2. RESTRICTIVE guard policy gst_verifications_guard (FOR ALL) continues
--      to gate every UPDATE — app.require_org_context() must pass first.
--   3. New UPDATE policy uses the same org_id = app.current_org_id() predicate
--      as the existing insert_unified policy — tenant isolation unchanged.
--   4. texqtic_app never holds BYPASSRLS.
--   5. No existing policy is dropped, altered, or weakened.
--   6. No SELECT, INSERT, or DELETE privilege is modified.
--
-- REVERSIBILITY
--   REVOKE UPDATE ON TABLE public.gst_verifications FROM texqtic_app;
--   DROP POLICY IF EXISTS gst_verifications_update_unified ON public.gst_verifications;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  PERMISSIVE UPDATE policy for texqtic_app
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS gst_verifications_update_unified ON public.gst_verifications;
CREATE POLICY gst_verifications_update_unified ON public.gst_verifications AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  ) WITH CHECK (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  GRANT UPDATE on gst_verifications to texqtic_app
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRANT UPDATE ON TABLE public.gst_verifications TO texqtic_app;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  VERIFY — inline evidence of grant and policy application
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE has_update BOOLEAN;
policy_count INT;
BEGIN -- Verify UPDATE grant
SELECT has_table_privilege(
    'texqtic_app',
    'public.gst_verifications',
    'UPDATE'
  ) INTO has_update;
IF has_update THEN RAISE NOTICE 'FIX-GST-RLS-UPDATE VERIFY: texqtic_app has UPDATE on public.gst_verifications — PASS';
ELSE RAISE EXCEPTION 'FIX-GST-RLS-UPDATE VERIFY: texqtic_app does NOT have UPDATE on public.gst_verifications — FAIL';
END IF;
-- Verify UPDATE policy exists
SELECT COUNT(*) INTO policy_count
FROM pg_policies
WHERE tablename = 'gst_verifications'
  AND policyname = 'gst_verifications_update_unified';
IF policy_count = 1 THEN RAISE NOTICE 'FIX-GST-RLS-UPDATE VERIFY: gst_verifications_update_unified policy exists — PASS';
ELSE RAISE EXCEPTION 'FIX-GST-RLS-UPDATE VERIFY: gst_verifications_update_unified policy NOT found — FAIL';
END IF;
END;
$$;