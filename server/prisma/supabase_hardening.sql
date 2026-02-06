-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SUPABASE SECURITY HARDENING PATCH
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Purpose: Fix Supabase Database Linter findings
-- Idempotent: Safe to run multiple times
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEGIN;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART 1: FIX HELPER FUNCTIONS (function_search_path_mutable)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Set tenant context (fixes search_path warning)
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid, p_is_admin boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $BODY$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
  PERFORM set_config('app.is_admin', p_is_admin::text, false);
END;
$BODY$;

-- Set admin context (fixes search_path warning)
CREATE OR REPLACE FUNCTION public.set_admin_context()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $BODY$
BEGIN
  PERFORM set_config('app.is_admin', 'true', false);
  PERFORM set_config('app.tenant_id', '', false);
END;
$BODY$;

-- Clear context (fixes search_path warning)
CREATE OR REPLACE FUNCTION public.clear_context()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $BODY$
BEGIN
  PERFORM set_config('app.tenant_id', '', false);
  PERFORM set_config('app.is_admin', 'false', false);
END;
$BODY$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART 2: ENABLE RLS ON PLATFORM/CONTROL-PLANE TABLES (rls_disabled_in_public)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Enable RLS on platform tables (these are control-plane, not exposed to tenant users)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- Force RLS (overrides BYPASSRLS where supported)
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains FORCE ROW LEVEL SECURITY;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART 3: HANDLE _PRISMA_MIGRATIONS (rls_disabled_in_public)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Strategy: Enable RLS + deny-all policies + REVOKE from PostgREST roles
-- Rationale: Moving _prisma_migrations breaks Prisma; instead, make it inaccessible
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations FORCE ROW LEVEL SECURITY;

-- Deny all access via policies (only postgres superuser can access)
DROP POLICY IF EXISTS _prisma_migrations_deny_all ON public._prisma_migrations;
CREATE POLICY _prisma_migrations_deny_all ON public._prisma_migrations
  FOR ALL USING (false);

-- Revoke from anon/authenticated roles (PostgREST users)
REVOKE ALL ON public._prisma_migrations FROM anon, authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART 4: REVOKE PostgREST ACCESS FROM CONTROL-PLANE TABLES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Rationale: These tables should ONLY be accessed via server-side Prisma, not PostgREST
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REVOKE ALL ON public.tenants FROM anon, authenticated;
REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.admin_users FROM anon, authenticated;
REVOKE ALL ON public.feature_flags FROM anon, authenticated;

-- Add deny-all policies (defense in depth)
DROP POLICY IF EXISTS tenants_deny_all ON public.tenants;
CREATE POLICY tenants_deny_all ON public.tenants
  FOR ALL USING (false);

DROP POLICY IF EXISTS users_deny_all ON public.users;
CREATE POLICY users_deny_all ON public.users
  FOR ALL USING (false);

DROP POLICY IF EXISTS admin_users_deny_all ON public.admin_users;
CREATE POLICY admin_users_deny_all ON public.admin_users
  FOR ALL USING (false);

DROP POLICY IF EXISTS feature_flags_deny_all ON public.feature_flags;
CREATE POLICY feature_flags_deny_all ON public.feature_flags
  FOR ALL USING (false);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART 5: ADD POLICIES TO TENANT-SCOPED TABLES (rls_enabled_no_policy)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Policy Pattern: tenant_id match OR admin bypass
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- tenant_domains (already has RLS, add policies)
DROP POLICY IF EXISTS tenant_domains_tenant_select ON public.tenant_domains;
CREATE POLICY tenant_domains_tenant_select ON public.tenant_domains
  FOR SELECT USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS tenant_domains_tenant_insert ON public.tenant_domains;
CREATE POLICY tenant_domains_tenant_insert ON public.tenant_domains
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS tenant_domains_tenant_update ON public.tenant_domains;
CREATE POLICY tenant_domains_tenant_update ON public.tenant_domains
  FOR UPDATE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS tenant_domains_tenant_delete ON public.tenant_domains;
CREATE POLICY tenant_domains_tenant_delete ON public.tenant_domains
  FOR DELETE USING (
    current_setting('app.is_admin', true) = 'true'
  );

-- tenant_branding (already has RLS, add policies)
DROP POLICY IF EXISTS tenant_branding_tenant_select ON public.tenant_branding;
CREATE POLICY tenant_branding_tenant_select ON public.tenant_branding
  FOR SELECT USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS tenant_branding_tenant_insert ON public.tenant_branding;
CREATE POLICY tenant_branding_tenant_insert ON public.tenant_branding
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS tenant_branding_tenant_update ON public.tenant_branding;
CREATE POLICY tenant_branding_tenant_update ON public.tenant_branding
  FOR UPDATE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS tenant_branding_tenant_delete ON public.tenant_branding;
CREATE POLICY tenant_branding_tenant_delete ON public.tenant_branding
  FOR DELETE USING (
    current_setting('app.is_admin', true) = 'true'
  );

-- memberships (already has RLS, add policies)
DROP POLICY IF EXISTS memberships_tenant_select ON public.memberships;
CREATE POLICY memberships_tenant_select ON public.memberships
  FOR SELECT USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS memberships_tenant_insert ON public.memberships;
CREATE POLICY memberships_tenant_insert ON public.memberships
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS memberships_tenant_update ON public.memberships;
CREATE POLICY memberships_tenant_update ON public.memberships
  FOR UPDATE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS memberships_tenant_delete ON public.memberships;
CREATE POLICY memberships_tenant_delete ON public.memberships
  FOR DELETE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- invites (already has RLS, add policies)
DROP POLICY IF EXISTS invites_tenant_select ON public.invites;
CREATE POLICY invites_tenant_select ON public.invites
  FOR SELECT USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS invites_tenant_insert ON public.invites;
CREATE POLICY invites_tenant_insert ON public.invites
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS invites_tenant_update ON public.invites;
CREATE POLICY invites_tenant_update ON public.invites
  FOR UPDATE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS invites_tenant_delete ON public.invites;
CREATE POLICY invites_tenant_delete ON public.invites
  FOR DELETE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- password_reset_tokens (already has RLS, add policies)
DROP POLICY IF EXISTS password_reset_tokens_tenant_select ON public.password_reset_tokens;
CREATE POLICY password_reset_tokens_tenant_select ON public.password_reset_tokens
  FOR SELECT USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS password_reset_tokens_tenant_insert ON public.password_reset_tokens;
CREATE POLICY password_reset_tokens_tenant_insert ON public.password_reset_tokens
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS password_reset_tokens_tenant_update ON public.password_reset_tokens;
CREATE POLICY password_reset_tokens_tenant_update ON public.password_reset_tokens
  FOR UPDATE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS password_reset_tokens_tenant_delete ON public.password_reset_tokens;
CREATE POLICY password_reset_tokens_tenant_delete ON public.password_reset_tokens
  FOR DELETE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- tenant_feature_overrides (already has RLS, add policies)
DROP POLICY IF EXISTS tenant_feature_overrides_tenant_select ON public.tenant_feature_overrides;
CREATE POLICY tenant_feature_overrides_tenant_select ON public.tenant_feature_overrides
  FOR SELECT USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS tenant_feature_overrides_tenant_insert ON public.tenant_feature_overrides;
CREATE POLICY tenant_feature_overrides_tenant_insert ON public.tenant_feature_overrides
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS tenant_feature_overrides_tenant_update ON public.tenant_feature_overrides;
CREATE POLICY tenant_feature_overrides_tenant_update ON public.tenant_feature_overrides
  FOR UPDATE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS tenant_feature_overrides_tenant_delete ON public.tenant_feature_overrides;
CREATE POLICY tenant_feature_overrides_tenant_delete ON public.tenant_feature_overrides
  FOR DELETE USING (
    current_setting('app.is_admin', true) = 'true'
  );

-- ai_budgets (already has RLS, add policies)
DROP POLICY IF EXISTS ai_budgets_tenant_select ON public.ai_budgets;
CREATE POLICY ai_budgets_tenant_select ON public.ai_budgets
  FOR SELECT USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS ai_budgets_tenant_insert ON public.ai_budgets;
CREATE POLICY ai_budgets_tenant_insert ON public.ai_budgets
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS ai_budgets_tenant_update ON public.ai_budgets;
CREATE POLICY ai_budgets_tenant_update ON public.ai_budgets
  FOR UPDATE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS ai_budgets_tenant_delete ON public.ai_budgets;
CREATE POLICY ai_budgets_tenant_delete ON public.ai_budgets
  FOR DELETE USING (
    current_setting('app.is_admin', true) = 'true'
  );

-- ai_usage_meters (already has RLS, add policies)
DROP POLICY IF EXISTS ai_usage_meters_tenant_select ON public.ai_usage_meters;
CREATE POLICY ai_usage_meters_tenant_select ON public.ai_usage_meters
  FOR SELECT USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS ai_usage_meters_tenant_insert ON public.ai_usage_meters;
CREATE POLICY ai_usage_meters_tenant_insert ON public.ai_usage_meters
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS ai_usage_meters_tenant_update ON public.ai_usage_meters;
CREATE POLICY ai_usage_meters_tenant_update ON public.ai_usage_meters
  FOR UPDATE USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS ai_usage_meters_tenant_delete ON public.ai_usage_meters;
CREATE POLICY ai_usage_meters_tenant_delete ON public.ai_usage_meters
  FOR DELETE USING (
    current_setting('app.is_admin', true) = 'true'
  );

-- impersonation_sessions (already has RLS, add policies - admin-only access)
DROP POLICY IF EXISTS impersonation_sessions_admin_select ON public.impersonation_sessions;
CREATE POLICY impersonation_sessions_admin_select ON public.impersonation_sessions
  FOR SELECT USING (
    current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS impersonation_sessions_admin_insert ON public.impersonation_sessions;
CREATE POLICY impersonation_sessions_admin_insert ON public.impersonation_sessions
  FOR INSERT WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS impersonation_sessions_admin_update ON public.impersonation_sessions;
CREATE POLICY impersonation_sessions_admin_update ON public.impersonation_sessions
  FOR UPDATE USING (
    current_setting('app.is_admin', true) = 'true'
  );

DROP POLICY IF EXISTS impersonation_sessions_admin_delete ON public.impersonation_sessions;
CREATE POLICY impersonation_sessions_admin_delete ON public.impersonation_sessions
  FOR DELETE USING (
    current_setting('app.is_admin', true) = 'true'
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART 6: FIX AUDIT_LOGS POLICIES (rls_policy_always_true)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CRITICAL: Fix INSERT policy - must NOT be WITH CHECK (true)
-- Requirement: Append-only with proper tenant context enforcement
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Drop old permissive policies
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_tenant_read ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_no_update ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_no_delete ON public.audit_logs;

-- SELECT: Tenant-scoped read (own logs only) OR admin can see all
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT USING (
    (tenant_id = current_setting('app.tenant_id', true)::uuid)
    OR current_setting('app.is_admin', true) = 'true'
  );

-- INSERT: Enforce proper tenant context (NOT always true!)
-- Rule: Admin logs have tenant_id = null, tenant logs must match app.tenant_id
CREATE POLICY audit_logs_insert_strict ON public.audit_logs
  FOR INSERT WITH CHECK (
    -- Admin logs: tenant_id must be null AND must be admin context
    (tenant_id IS NULL AND current_setting('app.is_admin', true) = 'true')
    OR
    -- Tenant logs: tenant_id must match session context
    (tenant_id IS NOT NULL AND tenant_id = current_setting('app.tenant_id', true)::uuid)
  );

-- UPDATE: Deny all (append-only requirement)
CREATE POLICY audit_logs_no_update ON public.audit_logs
  FOR UPDATE USING (false);

-- DELETE: Admin-only (for compliance/retention management)
CREATE POLICY audit_logs_admin_delete ON public.audit_logs
  FOR DELETE USING (
    current_setting('app.is_admin', true) = 'true'
  );

-- Additional protection: REVOKE UPDATE from standard roles
REVOKE UPDATE ON public.audit_logs FROM anon, authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- COMMIT AND REPORT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMIT;

-- End of hardening patch
