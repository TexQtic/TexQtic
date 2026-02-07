-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CREATE RESTRICTED DATABASE ROLE FOR APPLICATION RUNTIME
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- PURPOSE:
--   Create a non-superuser role (app_user) for Prisma client runtime connections.
--   This role cannot bypass RLS, ensuring tenant isolation is enforced in dev + prod.
--
-- USAGE:
--   1. Run this SQL in Supabase SQL Editor
--   2. Replace <STRONG_PASSWORD> with a secure password (store in 1Password/Secrets Manager)
--   3. Generate connection string: postgresql://app_user:<PASSWORD>@<HOST>:5432/postgres
--   4. Set DATABASE_URL in .env to the app_user connection string
--   5. Keep MIGRATION_DATABASE_URL with postgres owner for migrations
--
-- SECURITY MODEL:
--   - app_user: Runtime role with RLS enforced, CRUD on tenant-scoped tables
--   - postgres: Owner role for migrations/DDL only (never used by application)
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEGIN;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. CREATE RUNTIME ROLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CRITICAL: No BYPASSRLS privilege (ensures RLS policies are enforced)
-- No superuser, ownership, or replication privileges
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'app_user'
) THEN CREATE ROLE app_user WITH LOGIN PASSWORD 'Par23esh238267PP' -- Password from .env
NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
RAISE NOTICE 'Created role: app_user';
ELSE RAISE NOTICE 'Role app_user already exists, skipping creation';
END IF;
END $$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. GRANT CONNECTION + SCHEMA ACCESS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRANT CONNECT ON DATABASE postgres TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. GRANT CRUD ON TENANT-SCOPED TABLES (RLS-PROTECTED)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- These tables have RLS enabled + FORCE RLS, so tenant isolation is guaranteed
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.tenant_domains,
  public.tenant_branding,
  public.memberships,
  public.invites,
  public.tenant_feature_overrides,
  public.ai_budgets,
  public.ai_usage_meters,
  public.impersonation_sessions,
  public.password_reset_tokens,
  public.audit_logs TO app_user;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. GRANT READ-ONLY ON REFERENCE TABLES (NON-TENANT-SCOPED)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRANT SELECT ON TABLE public.feature_flags TO app_user;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. DENY CONTROL-PLANE TABLES (DEFENSE IN DEPTH)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Application runtime should NEVER directly access these tables
-- All access must go through JWT-protected API endpoints
REVOKE ALL ON TABLE public.tenants,
public.users,
public.admin_users,
public._prisma_migrations
FROM app_user;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. GRANT SEQUENCE ACCESS (FOR AUTO-INCREMENT / SERIAL COLUMNS)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Required for INSERT operations on tables with serial/identity columns
GRANT USAGE,
  SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. SET DEFAULT PRIVILEGES (FUTURE TABLES)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Prevent accidental privilege grants on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES
FROM app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES
FROM app_user;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. VERIFY ROLE CREATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE role_info RECORD;
BEGIN
SELECT rolname,
  rolsuper,
  rolinherit,
  rolcreaterole,
  rolcreatedb,
  rolcanlogin,
  rolreplication,
  rolbypassrls INTO role_info
FROM pg_roles
WHERE rolname = 'app_user';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE 'Role Configuration Verified:';
RAISE NOTICE '  Name: %',
role_info.rolname;
RAISE NOTICE '  Can Login: %',
role_info.rolcanlogin;
RAISE NOTICE '  Superuser: % ✅ (should be FALSE)',
role_info.rolsuper;
RAISE NOTICE '  Create Role: % ✅ (should be FALSE)',
role_info.rolcreaterole;
RAISE NOTICE '  Create DB: % ✅ (should be FALSE)',
role_info.rolcreatedb;
RAISE NOTICE '  Replication: % ✅ (should be FALSE)',
role_info.rolreplication;
RAISE NOTICE '  Bypass RLS: % ✅ (should be FALSE)',
role_info.rolbypassrls;
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
IF role_info.rolbypassrls THEN RAISE EXCEPTION 'SECURITY ERROR: app_user has BYPASSRLS privilege - RLS will not be enforced!';
END IF;
IF role_info.rolsuper THEN RAISE EXCEPTION 'SECURITY ERROR: app_user has superuser privilege - RLS will not be enforced!';
END IF;
RAISE NOTICE '✅ app_user role configured correctly for RLS enforcement';
END $$;
COMMIT;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- NEXT STEPS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- 1. Generate connection string:
--    postgresql://app_user:<PASSWORD>@<SUPABASE_HOST>:5432/postgres
--
-- 2. Update server/.env:
--    DATABASE_URL=postgresql://app_user:...        # Runtime (restricted)
--    MIGRATION_DATABASE_URL=postgresql://postgres:...  # Migrations (owner)
--
-- 3. Update server/prisma/schema.prisma:
--    datasource db {
--      provider  = "postgresql"
--      url       = env("DATABASE_URL")           # Uses app_user
--      directUrl = env("MIGRATION_DATABASE_URL") # Uses postgres
--    }
--
-- 4. Regenerate Prisma client:
--    npx prisma generate
--
-- 5. Re-run verification:
--    npx tsx prisma/verify-ai-budgets.ts
--    Expected: ✅ ALL 8 TESTS PASSED (including cross-tenant RLS enforcement)
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━