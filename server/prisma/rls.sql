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
-- LEGACY POLICY CLEANUP: Drop all old per-operation naming variants
-- These were created under an older schema (app.tenant_id era)
-- and must be removed before the canonical app.org_id policies are applied.
-- IF EXISTS makes these safe to run on a clean DB.
-- ============================================================
DROP POLICY IF EXISTS tenant_domains_tenant_select ON tenant_domains;
DROP POLICY IF EXISTS tenant_domains_tenant_insert ON tenant_domains;
DROP POLICY IF EXISTS tenant_domains_tenant_update ON tenant_domains;
DROP POLICY IF EXISTS tenant_domains_tenant_delete ON tenant_domains;
DROP POLICY IF EXISTS tenant_branding_tenant_select ON tenant_branding;
DROP POLICY IF EXISTS tenant_branding_tenant_insert ON tenant_branding;
DROP POLICY IF EXISTS tenant_branding_tenant_update ON tenant_branding;
DROP POLICY IF EXISTS tenant_branding_tenant_delete ON tenant_branding;
DROP POLICY IF EXISTS memberships_tenant_select ON memberships;
DROP POLICY IF EXISTS memberships_tenant_insert ON memberships;
DROP POLICY IF EXISTS memberships_tenant_update ON memberships;
DROP POLICY IF EXISTS memberships_tenant_delete ON memberships;
DROP POLICY IF EXISTS invites_tenant_select ON invites;
DROP POLICY IF EXISTS invites_tenant_insert ON invites;
DROP POLICY IF EXISTS invites_tenant_update ON invites;
DROP POLICY IF EXISTS invites_tenant_delete ON invites;
DROP POLICY IF EXISTS tenant_feature_overrides_tenant_select ON tenant_feature_overrides;
DROP POLICY IF EXISTS tenant_feature_overrides_tenant_insert ON tenant_feature_overrides;
DROP POLICY IF EXISTS tenant_feature_overrides_tenant_update ON tenant_feature_overrides;
DROP POLICY IF EXISTS tenant_feature_overrides_tenant_delete ON tenant_feature_overrides;
DROP POLICY IF EXISTS ai_budgets_tenant_select ON ai_budgets;
DROP POLICY IF EXISTS ai_budgets_tenant_insert ON ai_budgets;
DROP POLICY IF EXISTS ai_budgets_tenant_update ON ai_budgets;
DROP POLICY IF EXISTS ai_budgets_tenant_delete ON ai_budgets;
DROP POLICY IF EXISTS ai_usage_meters_tenant_select ON ai_usage_meters;
DROP POLICY IF EXISTS ai_usage_meters_tenant_insert ON ai_usage_meters;
DROP POLICY IF EXISTS ai_usage_meters_tenant_update ON ai_usage_meters;
DROP POLICY IF EXISTS ai_usage_meters_tenant_delete ON ai_usage_meters;
-- External orphan policies (not in rls.sql origin — created manually or by hardening script)
-- These reference app.tenant_id and must be removed. Tenants/users are admin-controlled at app layer.
DROP POLICY IF EXISTS tenants_tenant_read ON tenants;
DROP POLICY IF EXISTS users_tenant_read ON users;
-- ============================================================
-- TENANT-SCOPED TABLES: Allow access only to matching tenant_id
-- ============================================================
-- tenant_domains
DROP POLICY IF EXISTS tenant_domains_tenant_access ON tenant_domains;
CREATE POLICY tenant_domains_tenant_access ON tenant_domains FOR ALL USING (
  (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND tenant_id::text = current_setting('app.org_id', true)
  )
  OR current_setting('app.is_admin', true) = 'true'
);
-- tenant_branding
DROP POLICY IF EXISTS tenant_branding_tenant_access ON tenant_branding;
CREATE POLICY tenant_branding_tenant_access ON tenant_branding FOR ALL USING (
  (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND tenant_id::text = current_setting('app.org_id', true)
  )
  OR current_setting('app.is_admin', true) = 'true'
);
-- memberships
DROP POLICY IF EXISTS memberships_tenant_access ON memberships;
CREATE POLICY memberships_tenant_access ON memberships FOR ALL USING (
  (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND tenant_id::text = current_setting('app.org_id', true)
  )
  OR current_setting('app.is_admin', true) = 'true'
);
-- invites
DROP POLICY IF EXISTS invites_tenant_access ON invites;
CREATE POLICY invites_tenant_access ON invites FOR ALL USING (
  (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND tenant_id::text = current_setting('app.org_id', true)
  )
  OR current_setting('app.is_admin', true) = 'true'
);
-- password_reset_tokens (via user_id join - simplified for now)
DROP POLICY IF EXISTS password_reset_tokens_access ON password_reset_tokens;
CREATE POLICY password_reset_tokens_access ON password_reset_tokens FOR ALL USING (
  current_setting('app.is_admin', true) = 'true'
  OR (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM memberships m
      WHERE m.user_id = password_reset_tokens.user_id
        AND m.tenant_id::text = current_setting('app.org_id', true)
    )
  )
);
-- tenant_feature_overrides
DROP POLICY IF EXISTS tenant_feature_overrides_tenant_access ON tenant_feature_overrides;
CREATE POLICY tenant_feature_overrides_tenant_access ON tenant_feature_overrides FOR ALL USING (
  (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND tenant_id::text = current_setting('app.org_id', true)
  )
  OR current_setting('app.is_admin', true) = 'true'
);
-- ai_budgets
DROP POLICY IF EXISTS ai_budgets_tenant_access ON ai_budgets;
CREATE POLICY ai_budgets_tenant_access ON ai_budgets FOR ALL USING (
  (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND tenant_id::text = current_setting('app.org_id', true)
  )
  OR current_setting('app.is_admin', true) = 'true'
);
-- ai_usage_meters
DROP POLICY IF EXISTS ai_usage_meters_tenant_access ON ai_usage_meters;
CREATE POLICY ai_usage_meters_tenant_access ON ai_usage_meters FOR ALL USING (
  (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND tenant_id::text = current_setting('app.org_id', true)
  )
  OR current_setting('app.is_admin', true) = 'true'
);
-- impersonation_sessions
DROP POLICY IF EXISTS impersonation_sessions_admin_access ON impersonation_sessions;
CREATE POLICY impersonation_sessions_admin_access ON impersonation_sessions FOR ALL USING (
  current_setting('app.is_admin', true) = 'true'
);
-- ============================================================
-- AUDIT LOGS: Append-only, tenant-scoped reads
-- ============================================================
-- Allow tenants to read only their audit logs
DROP POLICY IF EXISTS audit_logs_tenant_read ON audit_logs;
CREATE POLICY audit_logs_tenant_read ON audit_logs FOR
SELECT USING (
    (
      NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
      AND tenant_id::text = current_setting('app.org_id', true)
    )
    OR current_setting('app.is_admin', true) = 'true'
  );
-- Allow INSERT from application (app sets actor context)
DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs FOR
INSERT WITH CHECK (true);
-- Explicitly DENY UPDATE and DELETE via policies
DROP POLICY IF EXISTS audit_logs_no_update ON audit_logs;
CREATE POLICY audit_logs_no_update ON audit_logs FOR
UPDATE USING (false);
DROP POLICY IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE POLICY audit_logs_no_delete ON audit_logs FOR DELETE USING (false);
-- Additional protection: revoke direct UPDATE/DELETE permissions
REVOKE
UPDATE,
  DELETE ON audit_logs
FROM PUBLIC;
-- ============================================================
-- IDENTITY TABLES: users + tenants (foundational, not tenant-scoped)
-- ============================================================
-- users table: RLS is ENABLED + FORCE (from supabase_hardening.sql).
-- G-005-BLOCKER: supabase_hardening.sql dropped users_tenant_read with no
-- replacement, making public.users unreadable by texqtic_app → AUTH_INVALID.
-- Policy: allow SELECT for rows where the user is a member of the current tenant,
-- or admin context. This preserves isolation (no cross-tenant user reads) while
-- allowing the auth route to look up credentials during login.
DROP POLICY IF EXISTS users_tenant_select ON public.users;
CREATE POLICY users_tenant_select ON public.users FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.memberships m
      WHERE m.user_id = public.users.id
        AND m.tenant_id = current_setting('app.org_id', true)::uuid
    )
    OR current_setting('app.is_admin', true) = 'true'
  );
-- tenants table: supabase_hardening.sql installs tenants_deny_all (FOR ALL USING false)
-- as a defence-in-depth baseline. That policy blocks app_user (NOBYPASSRLS) from
-- reading the tenant row during login, because Prisma fetches membership.tenant
-- as a nested relation — causing membership.tenant = null → TypeError → 500.
-- Fix: add a permissive SELECT that allows app_user to read exactly the current
-- org's row (id = app.org_id) or any row in admin context.
-- tenants_deny_all remains intact and is OR-combined with this policy per Postgres
-- permissive-policy semantics; it continues to block anon/authenticated roles.
DROP POLICY IF EXISTS tenants_app_user_select ON public.tenants;
CREATE POLICY tenants_app_user_select ON public.tenants FOR
SELECT USING (
    id::text = current_setting('app.org_id', true)
    OR current_setting('app.is_admin', true) = 'true'
  );
-- ============================================================
-- HELPER FUNCTION: Set DB session context safely
-- ============================================================
CREATE OR REPLACE FUNCTION set_tenant_context(
    p_tenant_id uuid,
    p_is_admin boolean DEFAULT false
  ) RETURNS void AS $$ BEGIN PERFORM set_config('app.org_id', p_tenant_id::text, true);
PERFORM set_config('app.is_admin', p_is_admin::text, true);
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION set_admin_context() RETURNS void AS $$ BEGIN -- Use RESET instead of empty string to avoid UUID casting issues
  PERFORM set_config('app.org_id', NULL, true);
PERFORM set_config('app.is_admin', 'true', true);
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION clear_context() RETURNS void AS $$ BEGIN PERFORM set_config('app.org_id', NULL, true);
PERFORM set_config('app.is_admin', 'false', true);
END;
$$ LANGUAGE plpgsql;
-- ============================================================================
-- PROMPT-51Bv3: Minimal tenant RLS + grants for carts/cart_items/catalog_items
-- ============================================================================
GRANT USAGE ON SCHEMA public TO app_user;
-- Revoke all privileges first to ensure clean state
REVOKE ALL ON TABLE public.carts
FROM app_user;
REVOKE ALL ON TABLE public.cart_items
FROM app_user;
REVOKE ALL ON TABLE public.catalog_items
FROM app_user;
-- Grant only required privileges (no DELETE)
GRANT SELECT,
  INSERT,
  UPDATE ON TABLE public.carts TO app_user;
GRANT SELECT,
  INSERT,
  UPDATE ON TABLE public.cart_items TO app_user;
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
CREATE POLICY carts_tenant_select ON public.carts FOR
SELECT USING (
    current_setting('app.org_id', true) IS NOT NULL
    AND tenant_id = current_setting('app.org_id', true)::uuid
  );
CREATE POLICY carts_tenant_insert ON public.carts FOR
INSERT WITH CHECK (
    current_setting('app.org_id', true) IS NOT NULL
    AND tenant_id = current_setting('app.org_id', true)::uuid
  );
CREATE POLICY carts_tenant_update ON public.carts FOR
UPDATE USING (
    current_setting('app.org_id', true) IS NOT NULL
    AND tenant_id = current_setting('app.org_id', true)::uuid
  ) WITH CHECK (
    current_setting('app.org_id', true) IS NOT NULL
    AND tenant_id = current_setting('app.org_id', true)::uuid
  );
CREATE POLICY cart_items_tenant_select ON public.cart_items FOR
SELECT USING (
    current_setting('app.org_id', true) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND c.tenant_id = current_setting('app.org_id', true)::uuid
    )
  );
CREATE POLICY cart_items_tenant_insert ON public.cart_items FOR
INSERT WITH CHECK (
    current_setting('app.org_id', true) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND c.tenant_id = current_setting('app.org_id', true)::uuid
    )
  );
CREATE POLICY cart_items_tenant_update ON public.cart_items FOR
UPDATE USING (
    current_setting('app.org_id', true) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND c.tenant_id = current_setting('app.org_id', true)::uuid
    )
  ) WITH CHECK (
    current_setting('app.org_id', true) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND c.tenant_id = current_setting('app.org_id', true)::uuid
    )
  );
CREATE POLICY catalog_items_tenant_read ON public.catalog_items FOR
SELECT USING (
    current_setting('app.org_id', true) IS NOT NULL
    AND tenant_id = current_setting('app.org_id', true)::uuid
  );