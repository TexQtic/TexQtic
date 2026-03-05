-- G-025-ORGS-RLS-TENANT-SELECT-001
-- Enable tenant self-read on organizations (G-025-ORGS-RLS-001)
-- Minimal delta: guard replacement + new tenant SELECT PERMISSIVE
-- No changes to INSERT/UPDATE/DELETE policies or grants.
-- 1. Idempotent RLS enforcement
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
-- 2. Replace guard to allow tenant org context
DROP POLICY IF EXISTS organizations_guard_policy ON public.organizations;
CREATE POLICY organizations_guard_policy ON public.organizations AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.bypass_enabled()
  OR (app.current_realm() = 'admin'::text)
  OR app.require_org_context()
);
-- 3. New tenant self-read SELECT policy
DROP POLICY IF EXISTS organizations_tenant_select ON public.organizations;
CREATE POLICY organizations_tenant_select ON public.organizations AS PERMISSIVE FOR
SELECT TO texqtic_app USING (id = app.current_org_id());
-- 4. Verifier DO block
DO $$
DECLARE v_relrowsecurity BOOLEAN;
v_relforcerow BOOLEAN;
v_guard_count INT;
v_guard_3arms INT;
v_tenant_select_count INT;
v_tenant_select_perm INT;
v_cp_select INT;
v_cp_insert INT;
v_cp_update INT;
v_grant_count INT;
BEGIN -- RLS flags
SELECT relrowsecurity,
  relforcerowsecurity INTO v_relrowsecurity,
  v_relforcerow
FROM pg_class
WHERE relname = 'organizations'
  AND relnamespace = 'public'::regnamespace;
IF NOT (
  v_relrowsecurity
  AND v_relforcerow
) THEN RAISE EXCEPTION 'VERIFIER FAIL: FORCE RLS not enabled (relrowsecurity=%, relforcerowsecurity=%)',
v_relrowsecurity,
v_relforcerow;
END IF;
-- Guard: exists, RESTRICTIVE, ALL
SELECT count(*) INTO v_guard_count
FROM pg_policies
WHERE tablename = 'organizations'
  AND schemaname = 'public'
  AND policyname = 'organizations_guard_policy'
  AND permissive = 'RESTRICTIVE'
  AND cmd = 'ALL';
IF v_guard_count != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: organizations_guard_policy not found as RESTRICTIVE ALL (count=%)',
v_guard_count;
END IF;
-- Guard has all 3 arms
SELECT count(*) INTO v_guard_3arms
FROM pg_policies
WHERE tablename = 'organizations'
  AND schemaname = 'public'
  AND policyname = 'organizations_guard_policy'
  AND qual LIKE '%bypass_enabled%'
  AND qual LIKE '%current_realm%'
  AND qual LIKE '%require_org_context%';
IF v_guard_3arms != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: guard USING does not contain all 3 arms (bypass_enabled, current_realm, require_org_context)';
END IF;
-- Tenant SELECT policy: exists, PERMISSIVE, SELECT
SELECT count(*) INTO v_tenant_select_count
FROM pg_policies
WHERE tablename = 'organizations'
  AND schemaname = 'public'
  AND policyname = 'organizations_tenant_select'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'SELECT';
IF v_tenant_select_count != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: organizations_tenant_select not found as PERMISSIVE SELECT (count=%)',
v_tenant_select_count;
END IF;
-- Tenant SELECT predicate contains current_org_id
SELECT count(*) INTO v_tenant_select_perm
FROM pg_policies
WHERE tablename = 'organizations'
  AND schemaname = 'public'
  AND policyname = 'organizations_tenant_select'
  AND qual LIKE '%current_org_id%';
IF v_tenant_select_perm != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: organizations_tenant_select USING does not contain current_org_id';
END IF;
-- Control-plane policies unchanged
SELECT count(*) INTO v_cp_select
FROM pg_policies
WHERE tablename = 'organizations'
  AND schemaname = 'public'
  AND policyname = 'organizations_control_plane_select'
  AND (
    qual LIKE '%bypass_enabled%'
    OR qual LIKE '%current_realm%'
  );
IF v_cp_select != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: organizations_control_plane_select missing or altered';
END IF;
SELECT count(*) INTO v_cp_insert
FROM pg_policies
WHERE tablename = 'organizations'
  AND schemaname = 'public'
  AND policyname = 'organizations_control_plane_insert';
IF v_cp_insert != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: organizations_control_plane_insert missing';
END IF;
SELECT count(*) INTO v_cp_update
FROM pg_policies
WHERE tablename = 'organizations'
  AND schemaname = 'public'
  AND policyname = 'organizations_control_plane_update';
IF v_cp_update != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: organizations_control_plane_update missing';
END IF;
-- texqtic_app SELECT grant
SELECT count(*) INTO v_grant_count
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'organizations'
  AND grantee = 'texqtic_app'
  AND privilege_type = 'SELECT';
IF v_grant_count < 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_app SELECT grant missing on organizations';
END IF;
RAISE NOTICE 'VERIFIER PASS: organizations tenant select enabled (G-025-ORGS-RLS-001)';
END $$;