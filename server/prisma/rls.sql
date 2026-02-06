-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Governance: Enforce tenant isolation at database level
-- ============================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TENANT-SCOPED TABLES: Allow access only to matching tenant_id
-- ============================================================

-- tenant_domains
CREATE POLICY tenant_domains_tenant_access ON tenant_domains
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- tenant_branding
CREATE POLICY tenant_branding_tenant_access ON tenant_branding
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- memberships
CREATE POLICY memberships_tenant_access ON memberships
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- invites
CREATE POLICY invites_tenant_access ON invites
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- password_reset_tokens (via user_id join - simplified for now)
CREATE POLICY password_reset_tokens_access ON password_reset_tokens
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = password_reset_tokens.user_id
        AND m.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
  );

-- tenant_feature_overrides
CREATE POLICY tenant_feature_overrides_tenant_access ON tenant_feature_overrides
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- ai_budgets
CREATE POLICY ai_budgets_tenant_access ON ai_budgets
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- ai_usage_meters
CREATE POLICY ai_usage_meters_tenant_access ON ai_usage_meters
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_admin', true) = 'true'
  );

-- impersonation_sessions
CREATE POLICY impersonation_sessions_admin_access ON impersonation_sessions
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
  );

-- ============================================================
-- AUDIT LOGS: Append-only, tenant-scoped reads
-- ============================================================

-- Allow tenants to read only their audit logs
CREATE POLICY audit_logs_tenant_read ON audit_logs
  FOR SELECT
  USING (
    (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    OR current_setting('app.is_admin', true) = 'true'
  );

-- Allow INSERT from application (app sets actor context)
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Explicitly DENY UPDATE and DELETE via policies
CREATE POLICY audit_logs_no_update ON audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY audit_logs_no_delete ON audit_logs
  FOR DELETE
  USING (false);

-- Additional protection: revoke direct UPDATE/DELETE permissions
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

-- ============================================================
-- ADMIN READ ACCESS: tenants, users (with admin flag)
-- ============================================================

-- tenants table: no RLS, but app layer enforces admin checks
-- users table: no RLS, but app layer enforces admin checks

-- ============================================================
-- HELPER FUNCTION: Set DB session context safely
-- ============================================================

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id uuid, p_is_admin boolean DEFAULT false)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
  PERFORM set_config('app.is_admin', p_is_admin::text, true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_admin_context()
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', '', true);
  PERFORM set_config('app.is_admin', 'true', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clear_context()
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', '', true);
  PERFORM set_config('app.is_admin', 'false', true);
END;
$$ LANGUAGE plpgsql;
