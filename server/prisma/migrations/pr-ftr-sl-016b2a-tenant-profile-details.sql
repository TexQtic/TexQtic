-- ============================================================================
-- FTR-SL-016B2A: tenant_profile_details rich company profile foundation
-- Purpose: Create tenant-managed profile detail table and tenant-scoped RLS.
-- Scope: tracked SQL migration only. Not applied in this unit.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_profile_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  tagline VARCHAR(280),
  description VARCHAR(2000),
  website_url VARCHAR(2048),
  business_email VARCHAR(255),
  phone VARCHAR(50),
  phone_public BOOLEAN NOT NULL DEFAULT false,
  city VARCHAR(100),
  state VARCHAR(100),
  company_size_band VARCHAR(30),
  capacity_band VARCHAR(30),
  cin_number VARCHAR(100),
  udyam_number VARCHAR(100),
  iec_number VARCHAR(100),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT tenant_profile_details_description_len_check CHECK (
    description IS NULL
    OR char_length(description) <= 2000
  ),
  CONSTRAINT tenant_profile_details_company_size_band_check CHECK (
    company_size_band IS NULL
    OR company_size_band IN (
      'MICRO',
      'SMALL',
      'MEDIUM',
      'LARGE',
      'ENTERPRISE',
      'NOT_DISCLOSED'
    )
  ),
  CONSTRAINT tenant_profile_details_capacity_band_check CHECK (
    capacity_band IS NULL
    OR capacity_band IN (
      'LOW',
      'MEDIUM',
      'HIGH',
      'VERY_HIGH',
      'NOT_DISCLOSED'
    )
  )
);
CREATE INDEX IF NOT EXISTS idx_tenant_profile_details_tenant_updated ON public.tenant_profile_details (tenant_id, updated_at DESC);
ALTER TABLE public.tenant_profile_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_profile_details FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_profile_details_select_unified ON public.tenant_profile_details;
DROP POLICY IF EXISTS tenant_profile_details_insert_unified ON public.tenant_profile_details;
DROP POLICY IF EXISTS tenant_profile_details_update_unified ON public.tenant_profile_details;
DROP POLICY IF EXISTS tenant_profile_details_delete_unified ON public.tenant_profile_details;
DROP POLICY IF EXISTS tenant_profile_details_guard_policy ON public.tenant_profile_details;
CREATE POLICY tenant_profile_details_select_unified ON public.tenant_profile_details AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
CREATE POLICY tenant_profile_details_insert_unified ON public.tenant_profile_details AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
CREATE POLICY tenant_profile_details_update_unified ON public.tenant_profile_details AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  ) WITH CHECK (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
CREATE POLICY tenant_profile_details_delete_unified ON public.tenant_profile_details AS PERMISSIVE FOR DELETE TO texqtic_app USING (app.bypass_enabled());
CREATE POLICY tenant_profile_details_guard_policy ON public.tenant_profile_details AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
GRANT USAGE ON SCHEMA public TO texqtic_app;
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.tenant_profile_details TO texqtic_app;