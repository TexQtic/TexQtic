-- Gate D.4: Constitutional RLS for White-Label Configuration Cluster
-- Tables: tenant_domains, tenant_branding, tenant_feature_overrides
-- Doctrine v1.4: Direct boundary (tenant_id), mutable config, fail-closed
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 1: tenant_domains
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Enable RLS
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains FORCE ROW LEVEL SECURITY;
-- Policy 1: Tenant SELECT (read own tenant's domains)
CREATE POLICY tenant_domains_tenant_select_policy ON public.tenant_domains FOR
SELECT USING (tenant_id = app.current_org_id());
-- Policy 2: Tenant INSERT (create domains for own tenant)
CREATE POLICY tenant_domains_tenant_insert_policy ON public.tenant_domains FOR
INSERT WITH CHECK (tenant_id = app.current_org_id());
-- Policy 3: Tenant UPDATE (update own tenant's domains)
CREATE POLICY tenant_domains_tenant_update_policy ON public.tenant_domains FOR
UPDATE USING (tenant_id = app.current_org_id());
-- Policy 4: Bypass SELECT (test-only seeding)
CREATE POLICY tenant_domains_bypass_select_policy ON public.tenant_domains FOR
SELECT USING (app.bypass_enabled());
-- Policy 5: Bypass INSERT/UPDATE (test-only seeding)
CREATE POLICY tenant_domains_bypass_operations_policy ON public.tenant_domains FOR ALL WITH CHECK (app.bypass_enabled());
-- Policy 6: RESTRICTIVE Guard (fail-closed enforcement)
CREATE POLICY tenant_domains_guard_policy ON public.tenant_domains AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 2: tenant_branding
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Enable RLS
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding FORCE ROW LEVEL SECURITY;
-- Policy 1: Tenant SELECT (read own tenant's branding)
CREATE POLICY tenant_branding_tenant_select_policy ON public.tenant_branding FOR
SELECT USING (tenant_id = app.current_org_id());
-- Policy 2: Tenant INSERT (create branding for own tenant)
CREATE POLICY tenant_branding_tenant_insert_policy ON public.tenant_branding FOR
INSERT WITH CHECK (tenant_id = app.current_org_id());
-- Policy 3: Tenant UPDATE (update own tenant's branding)
CREATE POLICY tenant_branding_tenant_update_policy ON public.tenant_branding FOR
UPDATE USING (tenant_id = app.current_org_id());
-- Policy 4: Bypass SELECT (test-only seeding)
CREATE POLICY tenant_branding_bypass_select_policy ON public.tenant_branding FOR
SELECT USING (app.bypass_enabled());
-- Policy 5: Bypass INSERT/UPDATE (test-only seeding)
CREATE POLICY tenant_branding_bypass_operations_policy ON public.tenant_branding FOR ALL WITH CHECK (app.bypass_enabled());
-- Policy 6: RESTRICTIVE Guard (fail-closed enforcement)
CREATE POLICY tenant_branding_guard_policy ON public.tenant_branding AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 3: tenant_feature_overrides
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Enable RLS
ALTER TABLE public.tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_overrides FORCE ROW LEVEL SECURITY;
-- Policy 1: Tenant SELECT (read own tenant's feature overrides)
CREATE POLICY tenant_feature_overrides_tenant_select_policy ON public.tenant_feature_overrides FOR
SELECT USING (tenant_id = app.current_org_id());
-- Policy 2: Tenant INSERT (create feature overrides for own tenant)
CREATE POLICY tenant_feature_overrides_tenant_insert_policy ON public.tenant_feature_overrides FOR
INSERT WITH CHECK (tenant_id = app.current_org_id());
-- Policy 3: Tenant UPDATE (update own tenant's feature overrides)
CREATE POLICY tenant_feature_overrides_tenant_update_policy ON public.tenant_feature_overrides FOR
UPDATE USING (tenant_id = app.current_org_id());
-- Policy 4: Bypass SELECT (test-only seeding)
CREATE POLICY tenant_feature_overrides_bypass_select_policy ON public.tenant_feature_overrides FOR
SELECT USING (app.bypass_enabled());
-- Policy 5: Bypass INSERT/UPDATE (test-only seeding)
CREATE POLICY tenant_feature_overrides_bypass_operations_policy ON public.tenant_feature_overrides FOR ALL WITH CHECK (app.bypass_enabled());
-- Policy 6: RESTRICTIVE Guard (fail-closed enforcement)
CREATE POLICY tenant_feature_overrides_guard_policy ON public.tenant_feature_overrides AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- GRANTS: Minimal privileges for texqtic_app role
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Schema access (idempotent)
GRANT USAGE ON SCHEMA public TO texqtic_app;
-- Table privileges: SELECT + INSERT + UPDATE (no DELETE)
GRANT SELECT,
  INSERT,
  UPDATE ON TABLE public.tenant_domains TO texqtic_app;
GRANT SELECT,
  INSERT,
  UPDATE ON TABLE public.tenant_branding TO texqtic_app;
GRANT SELECT,
  INSERT,
  UPDATE ON TABLE public.tenant_feature_overrides TO texqtic_app;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION BLOCK
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE v_table_name text;
v_rls_enabled boolean;
v_rls_forced boolean;
v_policy_count int;
BEGIN -- Verify RLS enabled for all 3 tables
FOR v_table_name IN
SELECT unnest(
    ARRAY ['tenant_domains', 'tenant_branding', 'tenant_feature_overrides']
  ) LOOP
SELECT relrowsecurity,
  relforcerowsecurity INTO v_rls_enabled,
  v_rls_forced
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = v_table_name
  AND n.nspname = 'public';
IF NOT v_rls_enabled
OR NOT v_rls_forced THEN RAISE EXCEPTION 'RLS not properly enabled on public.%',
v_table_name;
END IF;
-- Verify policy count (should be 6 per table)
SELECT COUNT(*) INTO v_policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = v_table_name;
IF v_policy_count < 6 THEN RAISE WARNING 'Table public.% has only % policies (expected 6)',
v_table_name,
v_policy_count;
END IF;
RAISE NOTICE 'Gate D.4: Table public.% - RLS enabled: %, forced: %, policies: %',
v_table_name,
v_rls_enabled,
v_rls_forced,
v_policy_count;
END LOOP;
RAISE NOTICE 'Gate D.4 migration complete: 3 tables protected with Constitutional RLS';
END $$;