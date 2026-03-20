BEGIN;
-- TECS-G026-CLEANUP-REMEDIATION-001
-- Re-home non-routing texqtic_service dependencies to dedicated bounded roles
-- so texqtic_service returns to the resolver-only target posture.
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'texqtic_public_lookup'
) THEN CREATE ROLE texqtic_public_lookup NOLOGIN;
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'texqtic_rfq_read'
) THEN CREATE ROLE texqtic_rfq_read NOLOGIN;
END IF;
END $$;
ALTER ROLE texqtic_public_lookup BYPASSRLS;
ALTER ROLE texqtic_rfq_read BYPASSRLS;
GRANT USAGE ON SCHEMA public TO texqtic_public_lookup;
GRANT USAGE ON SCHEMA public TO texqtic_rfq_read;
GRANT SELECT ON public.tenants TO texqtic_public_lookup;
GRANT SELECT ON public.memberships TO texqtic_public_lookup;
GRANT SELECT ON public.users TO texqtic_public_lookup;
GRANT SELECT ON public.catalog_items TO texqtic_rfq_read;
GRANT SELECT ON public.rfq_supplier_responses TO texqtic_rfq_read;
GRANT texqtic_public_lookup TO postgres;
GRANT texqtic_rfq_read TO postgres;
REVOKE
SELECT ON public.memberships
FROM texqtic_service;
REVOKE
SELECT ON public.users
FROM texqtic_service;
REVOKE
SELECT ON public.catalog_items
FROM texqtic_service;
REVOKE
SELECT ON public.rfq_supplier_responses
FROM texqtic_service;
COMMENT ON ROLE texqtic_service IS 'G-026 domain resolver role. NOLOGIN, BYPASSRLS. Base resolver grants only: SELECT on public.tenants and public.tenant_domains. Reachable via SET LOCAL ROLE by postgres within explicitly-scoped resolver transactions.';
COMMENT ON ROLE texqtic_public_lookup IS 'Bounded public tenant-by-email lookup role. NOLOGIN, BYPASSRLS. SELECT on public.tenants, public.memberships, and public.users only. Reachable via SET LOCAL ROLE by postgres within explicitly-scoped public lookup transactions.';
COMMENT ON ROLE texqtic_rfq_read IS 'Bounded RFQ helper read role. NOLOGIN, BYPASSRLS. SELECT on public.catalog_items and public.rfq_supplier_responses only. Reachable via SET LOCAL ROLE by postgres within explicitly-scoped RFQ helper transactions.';
DO $$
DECLARE v_resolver_has_memberships boolean;
v_resolver_has_users boolean;
v_resolver_has_catalog_items boolean;
v_resolver_has_rfq_responses boolean;
v_public_lookup_exists boolean;
v_public_lookup_can_login boolean;
v_public_lookup_bypassrls boolean;
v_public_lookup_has_tenants boolean;
v_public_lookup_has_memberships boolean;
v_public_lookup_has_users boolean;
v_public_lookup_has_postgres_membership boolean;
v_public_lookup_has_non_select boolean;
v_rfq_read_exists boolean;
v_rfq_read_can_login boolean;
v_rfq_read_bypassrls boolean;
v_rfq_read_has_catalog_items boolean;
v_rfq_read_has_rfq_responses boolean;
v_rfq_read_has_postgres_membership boolean;
v_rfq_read_has_non_select boolean;
BEGIN
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND table_schema = 'public'
      AND table_name = 'memberships'
      AND privilege_type = 'SELECT'
  ) INTO v_resolver_has_memberships;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND table_schema = 'public'
      AND table_name = 'users'
      AND privilege_type = 'SELECT'
  ) INTO v_resolver_has_users;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND table_schema = 'public'
      AND table_name = 'catalog_items'
      AND privilege_type = 'SELECT'
  ) INTO v_resolver_has_catalog_items;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND table_schema = 'public'
      AND table_name = 'rfq_supplier_responses'
      AND privilege_type = 'SELECT'
  ) INTO v_resolver_has_rfq_responses;
SELECT EXISTS(
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'texqtic_public_lookup'
  ) INTO v_public_lookup_exists;
SELECT rolcanlogin,
  rolbypassrls INTO v_public_lookup_can_login,
  v_public_lookup_bypassrls
FROM pg_roles
WHERE rolname = 'texqtic_public_lookup';
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_public_lookup'
      AND table_schema = 'public'
      AND table_name = 'tenants'
      AND privilege_type = 'SELECT'
  ) INTO v_public_lookup_has_tenants;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_public_lookup'
      AND table_schema = 'public'
      AND table_name = 'memberships'
      AND privilege_type = 'SELECT'
  ) INTO v_public_lookup_has_memberships;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_public_lookup'
      AND table_schema = 'public'
      AND table_name = 'users'
      AND privilege_type = 'SELECT'
  ) INTO v_public_lookup_has_users;
SELECT EXISTS(
    SELECT 1
    FROM pg_auth_members member_map
      JOIN pg_roles granted_role ON granted_role.oid = member_map.roleid
      JOIN pg_roles member_role ON member_role.oid = member_map.member
    WHERE granted_role.rolname = 'texqtic_public_lookup'
      AND member_role.rolname = 'postgres'
  ) INTO v_public_lookup_has_postgres_membership;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_public_lookup'
      AND privilege_type <> 'SELECT'
  ) INTO v_public_lookup_has_non_select;
SELECT EXISTS(
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'texqtic_rfq_read'
  ) INTO v_rfq_read_exists;
SELECT rolcanlogin,
  rolbypassrls INTO v_rfq_read_can_login,
  v_rfq_read_bypassrls
FROM pg_roles
WHERE rolname = 'texqtic_rfq_read';
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_rfq_read'
      AND table_schema = 'public'
      AND table_name = 'catalog_items'
      AND privilege_type = 'SELECT'
  ) INTO v_rfq_read_has_catalog_items;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_rfq_read'
      AND table_schema = 'public'
      AND table_name = 'rfq_supplier_responses'
      AND privilege_type = 'SELECT'
  ) INTO v_rfq_read_has_rfq_responses;
SELECT EXISTS(
    SELECT 1
    FROM pg_auth_members member_map
      JOIN pg_roles granted_role ON granted_role.oid = member_map.roleid
      JOIN pg_roles member_role ON member_role.oid = member_map.member
    WHERE granted_role.rolname = 'texqtic_rfq_read'
      AND member_role.rolname = 'postgres'
  ) INTO v_rfq_read_has_postgres_membership;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_rfq_read'
      AND privilege_type <> 'SELECT'
  ) INTO v_rfq_read_has_non_select;
IF v_resolver_has_memberships THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service still has SELECT on public.memberships';
END IF;
IF v_resolver_has_users THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service still has SELECT on public.users';
END IF;
IF v_resolver_has_catalog_items THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service still has SELECT on public.catalog_items';
END IF;
IF v_resolver_has_rfq_responses THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service still has SELECT on public.rfq_supplier_responses';
END IF;
IF NOT v_public_lookup_exists THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_public_lookup role not found';
END IF;
IF v_public_lookup_can_login THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_public_lookup must remain NOLOGIN';
END IF;
IF NOT v_public_lookup_bypassrls THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_public_lookup missing BYPASSRLS';
END IF;
IF NOT v_public_lookup_has_tenants THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_public_lookup missing SELECT on public.tenants';
END IF;
IF NOT v_public_lookup_has_memberships THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_public_lookup missing SELECT on public.memberships';
END IF;
IF NOT v_public_lookup_has_users THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_public_lookup missing SELECT on public.users';
END IF;
IF NOT v_public_lookup_has_postgres_membership THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_public_lookup must remain grantable to postgres for SET LOCAL ROLE';
END IF;
IF v_public_lookup_has_non_select THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_public_lookup has non-SELECT table privileges';
END IF;
IF NOT v_rfq_read_exists THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_rfq_read role not found';
END IF;
IF v_rfq_read_can_login THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_rfq_read must remain NOLOGIN';
END IF;
IF NOT v_rfq_read_bypassrls THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_rfq_read missing BYPASSRLS';
END IF;
IF NOT v_rfq_read_has_catalog_items THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_rfq_read missing SELECT on public.catalog_items';
END IF;
IF NOT v_rfq_read_has_rfq_responses THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_rfq_read missing SELECT on public.rfq_supplier_responses';
END IF;
IF NOT v_rfq_read_has_postgres_membership THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_rfq_read must remain grantable to postgres for SET LOCAL ROLE';
END IF;
IF v_rfq_read_has_non_select THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_rfq_read has non-SELECT table privileges';
END IF;
RAISE NOTICE 'VERIFIER PASS: non-routing texqtic_service dependencies re-homed and resolver role returned to base grants only';
END $$;
COMMIT;