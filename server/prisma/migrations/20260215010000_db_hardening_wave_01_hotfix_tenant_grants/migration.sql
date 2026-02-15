-- ═══════════════════════════════════════════════════════════════════════════════
-- DB-Hardening Wave-01: Hotfix — Grant Permissions on tenant table
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- MISSION: Grant texqtic_app role appropriate privileges on the tenant table
--          (parent table for all tenant-scoped FK references)
--
-- RATIONALE: The tenant table was missing grants during initial Wave-01 rollout.
--            Without SELECT on tenant, FK checks and joins fail.
--            This hotfix ensures texqtic_app can perform control-plane operations
--            on tenants (create, read, update, delete).
--
-- DOCTRINE: Doctrine v1.4 — Grants Model
--           - texqtic_app MUST have explicit grants on all tables it accesses
--           - Parent tables (like tenant) need SELECT for FK validation
--           - Control-plane tables need full CRUD (SELECT, INSERT, UPDATE, DELETE)
--
-- DISCOVERY: Identified by Gate E readiness check (2026-02-15)
--            Script: server/scripts/gate-e-readiness-check.ts
--            Error: "tenant table missing SELECT grant for texqtic_app"
--
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '🔧 Hotfix: Granting privileges on tenant table to texqtic_app...';
END $$;
-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: Grant Full CRUD Privileges on tenants Table
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- tenants is a control-plane table (organizations/tenants registry)
-- Operations needed:
-- - SELECT: FK validation, joins, lookups
-- - INSERT: Tenant creation (control-plane onboarding)
-- - UPDATE: Tenant settings, branding, feature flags
-- - DELETE: Tenant suspension/deletion (admin operations)
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE tenants TO texqtic_app;
DO $$ BEGIN RAISE NOTICE '✅ Granted SELECT, INSERT, UPDATE, DELETE on tenants to texqtic_app';
END $$;
-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: Verification
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE grant_count INTEGER;
BEGIN -- Check that texqtic_app has at least SELECT on tenants
SELECT COUNT(*) INTO grant_count
FROM information_schema.table_privileges
WHERE grantee = 'texqtic_app'
  AND table_schema = 'public'
  AND table_name = 'tenants'
  AND privilege_type = 'SELECT';
IF grant_count = 0 THEN RAISE EXCEPTION '❌ VERIFICATION FAILED: texqtic_app does not have SELECT on tenants';
END IF;
RAISE NOTICE '✅ Verification passed: texqtic_app has required privileges on tenants';
END $$;
-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- STATUS: ✅ Hotfix applied
-- IMPACT: Unblocks Gate E readiness verification
-- NEXT: Re-run gate-e-readiness-check.ts to confirm fix
-- ═══════════════════════════════════════════════════════════════════════════════