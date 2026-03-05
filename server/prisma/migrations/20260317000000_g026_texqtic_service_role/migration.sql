-- ============================================================
-- G-026-H gate: texqtic_service role for domain resolver
-- Migration: 20260317000000_g026_texqtic_service_role
--
-- Purpose:
--   Create a minimal NOLOGIN role with BYPASSRLS that the
--   domain resolver endpoint uses via SET LOCAL ROLE to query
--   tenants and tenant_domains without being blocked by RLS.
--
-- Design Anchor: §D4 (resolver DB execution), §D8 (BYPASSRLS scope)
--
-- Permissions granted:
--   • BYPASSRLS                          — skip all RLS on resolver queries
--   • USAGE on schema public             — access tables
--   • SELECT on public.tenants           — slug + status lookup
--   • SELECT on public.tenant_domains    — custom domain → tenant_id lookup
--   • GRANT texqtic_service TO postgres  — allow SET LOCAL ROLE in transactions
--
-- Security model:
--   texqtic_service is NOLOGIN (cannot connect directly).
--   Only reachable via SET LOCAL ROLE by the postgres user.
--   Application code further constrains output (SELECT id, slug only at
--   the application layer). No INSERT/UPDATE/DELETE granted.
--
-- Idempotent: DO $$ … IF NOT EXISTS … END $$ guard on CREATE ROLE.
-- ============================================================
BEGIN;
-- 1. Create the role if it does not already exist.
DO $$ BEGIN IF NOT EXISTS (
  SELECT
  FROM pg_roles
  WHERE rolname = 'texqtic_service'
) THEN CREATE ROLE texqtic_service NOLOGIN;
END IF;
END $$;
-- 2. Ensure BYPASSRLS is set (safe to run even if role existed).
ALTER ROLE texqtic_service BYPASSRLS;
-- 3. Schema + table permissions.
GRANT USAGE ON SCHEMA public TO texqtic_service;
GRANT SELECT ON public.tenants TO texqtic_service;
GRANT SELECT ON public.tenant_domains TO texqtic_service;
-- 4. Allow the postgres user (which DATABASE_URL connects as) to
--    assume this role via SET LOCAL ROLE within a transaction.
--    Reference: 20260213044322_db_hardening_wave_01_gate_b4_grant_set_role
--    which established the same pattern for texqtic_app.
GRANT texqtic_service TO postgres;
-- 5. Human-readable comment for pg_roles catalogue.
COMMENT ON ROLE texqtic_service IS 'G-026 domain resolver role. NOLOGIN, BYPASSRLS. ' 'SELECT on tenants + tenant_domains only. ' 'Reachable via SET LOCAL ROLE by postgres within resolver transactions.';
-- ── VERIFIER ────────────────────────────────────────────────────────────────
-- Fails the transaction if any guarantee is not met.
DO $$
DECLARE v_role_exists boolean;
v_bypassrls boolean;
v_has_tenants_sel boolean;
v_has_domains_sel boolean;
v_has_grant boolean;
BEGIN
SELECT EXISTS(
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'texqtic_service'
  ) INTO v_role_exists;
SELECT rolbypassrls
FROM pg_roles
WHERE rolname = 'texqtic_service' INTO v_bypassrls;
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
-- Check that postgres has been granted texqtic_service.
SELECT EXISTS(
    SELECT 1
    FROM pg_auth_members m
      JOIN pg_roles r ON r.oid = m.roleid
      JOIN pg_roles g ON g.oid = m.member
    WHERE r.rolname = 'texqtic_service'
      AND g.rolname = 'postgres'
  ) INTO v_has_grant;
IF NOT v_role_exists THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service role not found';
END IF;
IF NOT v_bypassrls THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing BYPASSRLS';
END IF;
IF NOT v_has_tenants_sel THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing SELECT on tenants';
END IF;
IF NOT v_has_domains_sel THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing SELECT on tenant_domains';
END IF;
IF NOT v_has_grant THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service not granted to postgres';
END IF;
RAISE NOTICE 'VERIFIER PASS: texqtic_service role confirmed — BYPASSRLS=true, SELECT on tenants + tenant_domains, granted to postgres';
END $$;
COMMIT;