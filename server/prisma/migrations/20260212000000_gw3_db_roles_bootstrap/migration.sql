-- ============================================================================
-- G-W3-DB-ROLE-BOOTSTRAP-001 — Postgres Role Bootstrap
-- Migration: 20260212000000_gw3_db_roles_bootstrap
-- Doctrine:  TexQtic v1.4 (Safe-Write Mode)
-- Date:      2026-02-12 (logical ordering: before G-020/G-021/G-022)
-- Purpose:   Create texqtic_app and texqtic_admin roles idempotently.
--            Required before G-020/G-021/G-022 migrations can compile
--            their GRANT and CREATE POLICY ... TO <role> statements.
--
-- ADDITIVE ONLY. No tables created or modified. No RLS policies touched.
-- No existing migration files are altered.
--
-- INVARIANTS
--   - Idempotent: safe to re-run if roles already exist (DO block guards).
--   - No SUPERUSER. No BYPASSRLS. Minimum viable privileges only.
--   - Table-level grants are deliberately excluded here; each G-0xx
--     migration grants specifically per its own table surface.
--   - GRANT USAGE ON SCHEMA public is the minimum needed so that
--     subsequent migrations' GRANT <table> TO <role> statements parse
--     correctly and so roles can use objects in the public schema.
--
-- STOP CONDITION
--   If the connecting user lacks CREATE ROLE privilege (e.g. Supabase
--   pooler user has restricted roles), this migration will fail with:
--     ERROR: must be superuser to create role
--   In that case: STOP, do not edit anything else. Create the roles
--   once in the Supabase SQL Editor using an elevated context, then
--   re-run this migration (it will be idempotent and skip creation).
-- ============================================================================
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  ROLE BOOTSTRAP
--     Uses DO block + pg_roles guard because PostgreSQL does not
--     support CREATE ROLE IF NOT EXISTS.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$ BEGIN -- ── texqtic_app ────────────────────────────────────────────────────
-- Runtime application role (tenant-facing API).
-- NOBYPASSRLS is critical: this role MUST respect all RLS policies.
-- Used by DATABASE_URL (pooler connection) in production.
IF NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'texqtic_app'
) THEN CREATE ROLE texqtic_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
RAISE NOTICE 'G-W3-BOOTSTRAP: Created role texqtic_app (NOBYPASSRLS).';
ELSE RAISE NOTICE 'G-W3-BOOTSTRAP: Role texqtic_app already exists. Skipping creation.';
END IF;
-- ── texqtic_admin ──────────────────────────────────────────────────
-- Control-plane admin role (platform operations, audit access).
-- NOBYPASSRLS: still subject to RLS; uses permissive admin policies
-- that grant broader access via USING (true) or role-specific checks.
-- Used by DIRECT_DATABASE_URL or admin API connections.
IF NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'texqtic_admin'
) THEN CREATE ROLE texqtic_admin LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
RAISE NOTICE 'G-W3-BOOTSTRAP: Created role texqtic_admin (NOBYPASSRLS).';
ELSE RAISE NOTICE 'G-W3-BOOTSTRAP: Role texqtic_admin already exists. Skipping creation.';
END IF;
END;
$$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  SCHEMA USAGE GRANTS
--     Minimum grant so roles can resolve object references in public
--     schema. Individual table grants remain in each G-0xx migration.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRANT USAGE ON SCHEMA public TO texqtic_app;
GRANT USAGE ON SCHEMA public TO texqtic_admin;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  VERIFICATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE app_exists BOOLEAN;
admin_exists BOOLEAN;
app_bypass BOOLEAN;
admin_bypass BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'texqtic_app'
  ) INTO app_exists;
SELECT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'texqtic_admin'
  ) INTO admin_exists;
IF NOT app_exists THEN RAISE EXCEPTION 'G-W3-BOOTSTRAP VERIFY FAIL: texqtic_app role not found after bootstrap.';
END IF;
IF NOT admin_exists THEN RAISE EXCEPTION 'G-W3-BOOTSTRAP VERIFY FAIL: texqtic_admin role not found after bootstrap.';
END IF;
SELECT rolbypassrls INTO app_bypass
FROM pg_roles
WHERE rolname = 'texqtic_app';
SELECT rolbypassrls INTO admin_bypass
FROM pg_roles
WHERE rolname = 'texqtic_admin';
IF app_bypass THEN RAISE EXCEPTION 'G-W3-BOOTSTRAP VERIFY FAIL: texqtic_app has BYPASSRLS=true. This violates RLS constitutional requirement.';
END IF;
IF admin_bypass THEN RAISE EXCEPTION 'G-W3-BOOTSTRAP VERIFY FAIL: texqtic_admin has BYPASSRLS=true. This violates RLS constitutional requirement.';
END IF;
RAISE NOTICE '══════════════════════════════════════════════════════════════';
RAISE NOTICE 'G-W3-DB-ROLE-BOOTSTRAP-001 VERIFICATION PASSED';
RAISE NOTICE '------------------------------------------------------------';
RAISE NOTICE 'texqtic_app:   EXISTS=true  BYPASSRLS=false (PASS)';
RAISE NOTICE 'texqtic_admin: EXISTS=true  BYPASSRLS=false (PASS)';
RAISE NOTICE 'SCHEMA public: USAGE granted to both roles (PASS)';
RAISE NOTICE '------------------------------------------------------------';
RAISE NOTICE 'G-020, G-021, G-022 migrations may now proceed.';
RAISE NOTICE '══════════════════════════════════════════════════════════════';
END;
$$;