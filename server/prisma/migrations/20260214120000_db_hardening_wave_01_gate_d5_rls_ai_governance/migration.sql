-- Gate D.5: Constitutional RLS for AI Governance Cluster
-- Tables: ai_budgets, ai_usage_meters
-- Doctrine v1.4: Direct boundary (tenant_id), rollup updates, fail-closed
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 1: ai_budgets
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Enable RLS
ALTER TABLE public.ai_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_budgets FORCE ROW LEVEL SECURITY;
-- Policy 1: Tenant SELECT (read own tenant's budget)
CREATE POLICY ai_budgets_tenant_select_policy ON public.ai_budgets FOR
SELECT USING (tenant_id = app.current_org_id());
-- Policy 2: Tenant INSERT (create budget for own tenant)
CREATE POLICY ai_budgets_tenant_insert_policy ON public.ai_budgets FOR
INSERT WITH CHECK (tenant_id = app.current_org_id());
-- Policy 3: Tenant UPDATE (update own tenant's budget)
CREATE POLICY ai_budgets_tenant_update_policy ON public.ai_budgets FOR
UPDATE USING (tenant_id = app.current_org_id());
-- Policy 4: Bypass SELECT (test-only seeding)
CREATE POLICY ai_budgets_bypass_select_policy ON public.ai_budgets FOR
SELECT USING (app.bypass_enabled());
-- Policy 5: Bypass INSERT/UPDATE (test-only seeding)
CREATE POLICY ai_budgets_bypass_operations_policy ON public.ai_budgets FOR ALL WITH CHECK (app.bypass_enabled());
-- Policy 6: RESTRICTIVE Guard (fail-closed enforcement)
CREATE POLICY ai_budgets_guard_policy ON public.ai_budgets AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 2: ai_usage_meters
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Enable RLS
ALTER TABLE public.ai_usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_meters FORCE ROW LEVEL SECURITY;
-- Policy 1: Tenant SELECT (read own tenant's usage)
CREATE POLICY ai_usage_meters_tenant_select_policy ON public.ai_usage_meters FOR
SELECT USING (tenant_id = app.current_org_id());
-- Policy 2: Tenant INSERT (create usage record for own tenant)
CREATE POLICY ai_usage_meters_tenant_insert_policy ON public.ai_usage_meters FOR
INSERT WITH CHECK (tenant_id = app.current_org_id());
-- Policy 3: Tenant UPDATE (rollup increments for own tenant)
CREATE POLICY ai_usage_meters_tenant_update_policy ON public.ai_usage_meters FOR
UPDATE USING (tenant_id = app.current_org_id());
-- Policy 4: Bypass SELECT (test-only seeding)
CREATE POLICY ai_usage_meters_bypass_select_policy ON public.ai_usage_meters FOR
SELECT USING (app.bypass_enabled());
-- Policy 5: Bypass INSERT/UPDATE (test-only seeding)
CREATE POLICY ai_usage_meters_bypass_operations_policy ON public.ai_usage_meters FOR ALL WITH CHECK (app.bypass_enabled());
-- Policy 6: RESTRICTIVE Guard (fail-closed enforcement)
CREATE POLICY ai_usage_meters_guard_policy ON public.ai_usage_meters AS RESTRICTIVE FOR ALL USING (
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
  UPDATE ON TABLE public.ai_budgets TO texqtic_app;
GRANT SELECT,
  INSERT,
  UPDATE ON TABLE public.ai_usage_meters TO texqtic_app;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION BLOCK
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE v_table_name text;
v_rls_enabled boolean;
v_rls_forced boolean;
v_policy_count int;
BEGIN -- Verify RLS enabled for both tables
FOR v_table_name IN
SELECT unnest(ARRAY ['ai_budgets', 'ai_usage_meters']) LOOP
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
IF v_policy_count < 6 THEN RAISE EXCEPTION 'Insufficient policies on public.% (expected 6, got %)',
v_table_name,
v_policy_count;
END IF;
RAISE NOTICE 'RLS verified for public.% (% policies)',
v_table_name,
v_policy_count;
END LOOP;
END $$;