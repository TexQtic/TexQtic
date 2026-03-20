BEGIN;
-- TECS-G026-H-001
-- Canonicalize the bounded resolver-role prerequisite without reopening
-- the broader G-026 routing stream.
--
-- This reconcile migration does not widen role authority. It reasserts the
-- minimum prerequisite invariants that make texqtic_service usable for the
-- bounded resolver path only:
--   * role exists
--   * role remains NOLOGIN
--   * role retains BYPASSRLS for the pre-auth resolver lookup
--   * base resolver grants on tenants + tenant_domains exist
--   * postgres can still SET LOCAL ROLE texqtic_service in tx scope
--   * no non-SELECT table privileges are present
--
-- Historical supplementary SELECT grants, if any, are not modified here.
-- They belong to their own previously shipped units and are intentionally
-- outside this bounded prerequisite reconciliation step.
COMMENT ON ROLE texqtic_service IS 'Canonical G-026-H prerequisite role for the bounded resolver path. NOLOGIN + BYPASSRLS. Base resolver grants: SELECT on public.tenants and public.tenant_domains. postgres may assume the role via SET LOCAL ROLE inside explicitly scoped transactions. Supplemental read grants, if present from separately governed units, do not by themselves open broader G-026 routing scope.';
DO $$
DECLARE v_role_exists boolean;
v_can_login boolean;
v_bypassrls boolean;
v_has_tenants_sel boolean;
v_has_domains_sel boolean;
v_has_postgres_membership boolean;
v_has_non_select_table_privileges boolean;
BEGIN
SELECT EXISTS(
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'texqtic_service'
  ) INTO v_role_exists;
SELECT rolcanlogin,
  rolbypassrls INTO v_can_login,
  v_bypassrls
FROM pg_roles
WHERE rolname = 'texqtic_service';
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND table_schema = 'public'
      AND table_name = 'tenants'
      AND privilege_type = 'SELECT'
  ) INTO v_has_tenants_sel;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND table_schema = 'public'
      AND table_name = 'tenant_domains'
      AND privilege_type = 'SELECT'
  ) INTO v_has_domains_sel;
SELECT EXISTS(
    SELECT 1
    FROM pg_auth_members member_map
      JOIN pg_roles granted_role ON granted_role.oid = member_map.roleid
      JOIN pg_roles member_role ON member_role.oid = member_map.member
    WHERE granted_role.rolname = 'texqtic_service'
      AND member_role.rolname = 'postgres'
  ) INTO v_has_postgres_membership;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND privilege_type <> 'SELECT'
  ) INTO v_has_non_select_table_privileges;
IF NOT v_role_exists THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service role not found';
END IF;
IF v_can_login THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service must remain NOLOGIN';
END IF;
IF NOT v_bypassrls THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing BYPASSRLS';
END IF;
IF NOT v_has_tenants_sel THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing SELECT on public.tenants';
END IF;
IF NOT v_has_domains_sel THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing SELECT on public.tenant_domains';
END IF;
IF NOT v_has_postgres_membership THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service must remain grantable to postgres for SET LOCAL ROLE';
END IF;
IF v_has_non_select_table_privileges THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service has non-SELECT table privileges';
END IF;
RAISE NOTICE 'VERIFIER PASS: texqtic_service prerequisite remains canonical (NOLOGIN, BYPASSRLS, base resolver grants intact, postgres membership intact, read-only table posture intact)';
END $$;
COMMIT;