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
DROP POLICY IF EXISTS tenant_domains_tenant_access ON tenant_domains;
CREATE POLICY tenant_domains_tenant_access ON tenant_domains
  FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL 
     AND tenant_id::text = current_setting('app.tenant_id', true))
    OR current_setting('app.is_admin', true) = 'true'
  );

-- tenant_branding
DROP POLICY IF EXISTS tenant_branding_tenant_access ON tenant_branding;
CREATE POLICY tenant_branding_tenant_access ON tenant_branding
  FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL 
     AND tenant_id::text = current_setting('app.tenant_id', true))
    OR current_setting('app.is_admin', true) = 'true'
  );

-- memberships
DROP POLICY IF EXISTS memberships_tenant_access ON memberships;
CREATE POLICY memberships_tenant_access ON memberships
  FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL 
     AND tenant_id::text = current_setting('app.tenant_id', true))
    OR current_setting('app.is_admin', true) = 'true'
  );

-- invites
DROP POLICY IF EXISTS invites_tenant_access ON invites;
CREATE POLICY invites_tenant_access ON invites
  FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL 
     AND tenant_id::text = current_setting('app.tenant_id', true))
    OR current_setting('app.is_admin', true) = 'true'
  );

-- password_reset_tokens (via user_id join - simplified for now)
DROP POLICY IF EXISTS password_reset_tokens_access ON password_reset_tokens;
CREATE POLICY password_reset_tokens_access ON password_reset_tokens
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = password_reset_tokens.user_id
            AND m.tenant_id::text = current_setting('app.tenant_id', true)
        ))
  );

-- tenant_feature_overrides
DROP POLICY IF EXISTS tenant_feature_overrides_tenant_access ON tenant_feature_overrides;
CREATE POLICY tenant_feature_overrides_tenant_access ON tenant_feature_overrides
  FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL 
     AND tenant_id::text = current_setting('app.tenant_id', true))
    OR current_setting('app.is_admin', true) = 'true'
  );

-- ai_budgets
DROP POLICY IF EXISTS ai_budgets_tenant_access ON ai_budgets;
CREATE POLICY ai_budgets_tenant_access ON ai_budgets
  FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL 
     AND tenant_id::text = current_setting('app.tenant_id', true))
    OR current_setting('app.is_admin', true) = 'true'
  );

-- ai_usage_meters
DROP POLICY IF EXISTS ai_usage_meters_tenant_access ON ai_usage_meters;
CREATE POLICY ai_usage_meters_tenant_access ON ai_usage_meters
  FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL 
     AND tenant_id::text = current_setting('app.tenant_id', true))
    OR current_setting('app.is_admin', true) = 'true'
  );

-- impersonation_sessions
DROP POLICY IF EXISTS impersonation_sessions_admin_access ON impersonation_sessions;
CREATE POLICY impersonation_sessions_admin_access ON impersonation_sessions
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
  );

-- ============================================================
-- AUDIT LOGS: Append-only, tenant-scoped reads
-- ============================================================

-- Allow tenants to read only their audit logs
DROP POLICY IF EXISTS audit_logs_tenant_read ON audit_logs;
CREATE POLICY audit_logs_tenant_read ON audit_logs
  FOR SELECT
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL 
     AND tenant_id::text = current_setting('app.tenant_id', true))
    OR current_setting('app.is_admin', true) = 'true'
  );

-- Allow INSERT from application (app sets actor context)
DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Explicitly DENY UPDATE and DELETE via policies
DROP POLICY IF EXISTS audit_logs_no_update ON audit_logs;
CREATE POLICY audit_logs_no_update ON audit_logs
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS audit_logs_no_delete ON audit_logs;
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
  -- Use RESET instead of empty string to avoid UUID casting issues
  PERFORM set_config('app.tenant_id', NULL, true);
  PERFORM set_config('app.is_admin', 'true', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clear_context()
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', NULL, true);
  PERFORM set_config('app.is_admin', 'false', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROMPT-51Bv3: Minimal tenant RLS + grants for carts/cart_items/catalog_items
-- ============================================================================

GRANT USAGE ON SCHEMA public TO app_user;

-- Revoke all privileges first to ensure clean state
REVOKE ALL ON TABLE public.carts FROM app_user;
REVOKE ALL ON TABLE public.cart_items FROM app_user;
REVOKE ALL ON TABLE public.catalog_items FROM app_user;

-- Grant only required privileges (no DELETE)
GRANT SELECT, INSERT, UPDATE ON TABLE public.carts TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cart_items TO app_user;
GRANT SELECT ON TABLE public.catalog_items TO app_user;

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

-- Legacy policy cleanup (must remove FOR ALL policies from earlier versions)
DROP POLICY IF EXISTS carts_tenant_access ON public.carts;
DROP POLICY IF EXISTS cart_items_tenant_access ON public.cart_items;
DROP POLICY IF EXISTS catalog_items_tenant_access ON public.catalog_items;

DROP POLICY IF EXISTS carts_tenant_select ON public.carts;
DROP POLICY IF EXISTS carts_tenant_insert ON public.carts;
DROP POLICY IF EXISTS carts_tenant_update ON public.carts;
DROP POLICY IF EXISTS cart_items_tenant_select ON public.cart_items;
DROP POLICY IF EXISTS cart_items_tenant_insert ON public.cart_items;
DROP POLICY IF EXISTS cart_items_tenant_update ON public.cart_items;
DROP POLICY IF EXISTS catalog_items_tenant_read ON public.catalog_items;

CREATE POLICY carts_tenant_select
ON public.carts
FOR SELECT
USING (
  current_setting('app.tenant_id', true) IS NOT NULL
  AND tenant_id = current_setting('app.tenant_id', true)::uuid
);

CREATE POLICY carts_tenant_insert
ON public.carts
FOR INSERT
WITH CHECK (
  current_setting('app.tenant_id', true) IS NOT NULL
  AND tenant_id = current_setting('app.tenant_id', true)::uuid
);

CREATE POLICY carts_tenant_update
ON public.carts
FOR UPDATE
USING (
  current_setting('app.tenant_id', true) IS NOT NULL
  AND tenant_id = current_setting('app.tenant_id', true)::uuid
)
WITH CHECK (
  current_setting('app.tenant_id', true) IS NOT NULL
  AND tenant_id = current_setting('app.tenant_id', true)::uuid
);

CREATE POLICY cart_items_tenant_select
ON public.cart_items
FOR SELECT
USING (
  current_setting('app.tenant_id', true) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.tenant_id = current_setting('app.tenant_id', true)::uuid
  )
);

CREATE POLICY cart_items_tenant_insert
ON public.cart_items
FOR INSERT
WITH CHECK (
  current_setting('app.tenant_id', true) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.tenant_id = current_setting('app.tenant_id', true)::uuid
  )
);

CREATE POLICY cart_items_tenant_update
ON public.cart_items
FOR UPDATE
USING (
  current_setting('app.tenant_id', true) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.tenant_id = current_setting('app.tenant_id', true)::uuid
  )
)
WITH CHECK (
  current_setting('app.tenant_id', true) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.tenant_id = current_setting('app.tenant_id', true)::uuid
  )
);

CREATE POLICY catalog_items_tenant_read
ON public.catalog_items
FOR SELECT
USING (
  current_setting('app.tenant_id', true) IS NOT NULL
  AND tenant_id = current_setting('app.tenant_id', true)::uuid
);
