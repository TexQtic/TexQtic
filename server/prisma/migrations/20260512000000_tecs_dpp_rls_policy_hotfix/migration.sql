-- TECS-DPP-RLS-POLICY-HOTFIX-001
-- Root cause: Migrations 20260507 and 20260508 created RLS policies using
--   current_setting('app.current_org_id')::uuid
-- which references the function name as a GUC setting — this GUC does not exist.
-- The correct call is the function:
--   app.current_org_id()
-- which reads current_setting('app.org_id', TRUE).
-- Effect: every query against dpp_passport_states or dpp_evidence_claims under
-- texqtic_app role threw PostgreSQL error 42704 (unrecognized configuration
-- parameter "app.current_org_id"), caught by withDbContext try/catch → NOT_FOUND.
-- Scope: dpp_passport_states + dpp_evidence_claims
-- Additional: grant INSERT, UPDATE on dpp_passport_states to texqtic_app
--             (required by PATCH /tenant/dpp/:nodeId/passport/status endpoint)
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix dpp_passport_states RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
-- Restrictive guard: fail-closed for all DML
DROP POLICY IF EXISTS dpp_passport_states_restrictive ON public.dpp_passport_states;
CREATE POLICY dpp_passport_states_restrictive ON public.dpp_passport_states AS RESTRICTIVE TO texqtic_app USING (org_id = app.current_org_id());
-- Permissive SELECT: tenant self-read
DROP POLICY IF EXISTS dpp_passport_states_select ON public.dpp_passport_states;
CREATE POLICY dpp_passport_states_select ON public.dpp_passport_states FOR
SELECT TO texqtic_app USING (org_id = app.current_org_id());
-- Permissive INSERT: tenant self-write (required by passport status UPSERT)
DROP POLICY IF EXISTS dpp_passport_states_insert ON public.dpp_passport_states;
CREATE POLICY dpp_passport_states_insert ON public.dpp_passport_states FOR
INSERT TO texqtic_app WITH CHECK (org_id = app.current_org_id());
-- Permissive UPDATE: tenant self-write (required by ON CONFLICT DO UPDATE in status UPSERT)
DROP POLICY IF EXISTS dpp_passport_states_update ON public.dpp_passport_states;
CREATE POLICY dpp_passport_states_update ON public.dpp_passport_states FOR
UPDATE TO texqtic_app USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());
-- Extend grant: INSERT + UPDATE on dpp_passport_states to texqtic_app
GRANT INSERT,
  UPDATE ON public.dpp_passport_states TO texqtic_app;
-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix dpp_evidence_claims RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
-- Restrictive guard
DROP POLICY IF EXISTS dpp_evidence_claims_restrictive ON public.dpp_evidence_claims;
CREATE POLICY dpp_evidence_claims_restrictive ON public.dpp_evidence_claims AS RESTRICTIVE TO texqtic_app USING (org_id = app.current_org_id());
-- Permissive SELECT
DROP POLICY IF EXISTS dpp_evidence_claims_select ON public.dpp_evidence_claims;
CREATE POLICY dpp_evidence_claims_select ON public.dpp_evidence_claims FOR
SELECT TO texqtic_app USING (org_id = app.current_org_id());
-- Permissive INSERT
DROP POLICY IF EXISTS dpp_evidence_claims_insert ON public.dpp_evidence_claims;
CREATE POLICY dpp_evidence_claims_insert ON public.dpp_evidence_claims FOR
INSERT TO texqtic_app WITH CHECK (org_id = app.current_org_id());
-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Verifier DO block
-- ─────────────────────────────────────────────────────────────────────────────
DO $hotfix_verifier$
DECLARE v_count INT;
BEGIN -- dpp_passport_states: 4 policies expected (restrictive, select, insert, update)
SELECT COUNT(*) INTO v_count
FROM pg_policies
WHERE tablename = 'dpp_passport_states'
  AND policyname IN (
    'dpp_passport_states_restrictive',
    'dpp_passport_states_select',
    'dpp_passport_states_insert',
    'dpp_passport_states_update'
  );
IF v_count <> 4 THEN RAISE EXCEPTION 'HOTFIX VERIFIER FAIL: expected 4 policies on dpp_passport_states, found %',
v_count;
END IF;
-- dpp_evidence_claims: 3 policies expected (restrictive, select, insert)
SELECT COUNT(*) INTO v_count
FROM pg_policies
WHERE tablename = 'dpp_evidence_claims'
  AND policyname IN (
    'dpp_evidence_claims_restrictive',
    'dpp_evidence_claims_select',
    'dpp_evidence_claims_insert'
  );
IF v_count <> 3 THEN RAISE EXCEPTION 'HOTFIX VERIFIER FAIL: expected 3 policies on dpp_evidence_claims, found %',
v_count;
END IF;
-- dpp_passport_states: texqtic_app has INSERT grant
SELECT COUNT(*) INTO v_count
FROM information_schema.role_table_grants
WHERE table_name = 'dpp_passport_states'
  AND grantee = 'texqtic_app'
  AND privilege_type = 'INSERT';
IF v_count = 0 THEN RAISE EXCEPTION 'HOTFIX VERIFIER FAIL: texqtic_app missing INSERT grant on dpp_passport_states';
END IF;
RAISE NOTICE 'HOTFIX VERIFIER PASS: all dpp_passport_states and dpp_evidence_claims policies correct';
END;
$hotfix_verifier$;