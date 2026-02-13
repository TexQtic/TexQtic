-- TEXQTIC DB-HARDENING-WAVE-01 (Gate B.4)
-- Migration: Create RLS-Enforced App Role
-- DOCTRINE: TexQtic v1.4 Constitutional RLS (Section 6.4)
--
-- ROOT CAUSE (from Gate C.1 diagnosis):
--   Connection role "postgres" has rolbypassrls = true
--   This bypasses ALL RLS policies (including FORCE RLS)
--   Result: Tenant isolation completely ineffective
--
-- SOLUTION:
--   Create dedicated login role "texqtic_app" with:
--     - NOBYPASSRLS (CRITICAL: forces RLS compliance)
--     - NOSUPERUSER (prevents privilege escalation)
--     - Minimum required grants (catalog_items + tenant table + app schema)
--
-- POST-MIGRATION ACTION REQUIRED:
--   Update DATABASE_URL in .env to use texqtic_app role:
--   DATABASE_URL="postgresql://texqtic_app:<password>@...pooler.../postgres?sslmode=require"
--
--   Keep DIRECT_URL as postgres (admin) for migrations only.
-- 1) Create RLS-enforced app role
CREATE ROLE texqtic_app LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
-- CRITICAL: This role will obey RLS
COMMENT ON ROLE texqtic_app IS 'Runtime application role for TexQtic server. NOBYPASSRLS ensures RLS policies are enforced. Used by DATABASE_URL (not DIRECT_URL).';
-- 2) Grant schema usage
GRANT USAGE ON SCHEMA public TO texqtic_app;
GRANT USAGE ON SCHEMA app TO texqtic_app;
-- 3) Grant table privileges (pilot surface: catalog_items + tenants)
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.catalog_items TO texqtic_app;
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.tenants TO texqtic_app;
-- 4) Grant sequence privileges (for auto-increment IDs if any)
GRANT USAGE,
  SELECT ON ALL SEQUENCES IN SCHEMA public TO texqtic_app;
-- 5) Grant execute on app schema functions (context helpers)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO texqtic_app;
-- 6) Verification: Confirm role has NOBYPASSRLS
DO $$
DECLARE app_role_bypassrls boolean;
BEGIN
SELECT rolbypassrls INTO app_role_bypassrls
FROM pg_roles
WHERE rolname = 'texqtic_app';
IF app_role_bypassrls IS NULL THEN RAISE EXCEPTION 'texqtic_app role not found';
END IF;
IF app_role_bypassrls = true THEN RAISE EXCEPTION 'texqtic_app role has BYPASSRLS (should be false)';
END IF;
RAISE NOTICE 'Gate B.4 verification: texqtic_app role created with NOBYPASSRLS';
END;
$$;