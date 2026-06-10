BEGIN;
CREATE TABLE IF NOT EXISTS public.organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_key VARCHAR(50) NOT NULL,
  external_object_type VARCHAR(50) NOT NULL,
  external_id VARCHAR(255),
  sync_status VARCHAR(50) NOT NULL DEFAULT 'NOT_SYNCED',
  last_attempted_at TIMESTAMPTZ(6),
  last_dry_run_at TIMESTAMPTZ(6),
  last_error_summary VARCHAR(500),
  attempt_count SMALLINT NOT NULL DEFAULT 0,
  metadata_json JSONB,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT organization_integrations_org_provider_object_key UNIQUE (
    organization_id,
    provider_key,
    external_object_type
  )
);
CREATE INDEX IF NOT EXISTS idx_organization_integrations_organization_id ON public.organization_integrations (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_integrations_provider_key ON public.organization_integrations (provider_key);
CREATE INDEX IF NOT EXISTS idx_organization_integrations_sync_status ON public.organization_integrations (sync_status);
ALTER TABLE public.organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_integrations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_integrations_tenant_select ON public.organization_integrations;
DROP POLICY IF EXISTS organization_integrations_tenant_insert ON public.organization_integrations;
DROP POLICY IF EXISTS organization_integrations_tenant_update ON public.organization_integrations;
DROP POLICY IF EXISTS organization_integrations_bypass_select ON public.organization_integrations;
DROP POLICY IF EXISTS organization_integrations_bypass_write ON public.organization_integrations;
DROP POLICY IF EXISTS organization_integrations_guard_require_context ON public.organization_integrations;
CREATE POLICY organization_integrations_tenant_select ON public.organization_integrations FOR
SELECT USING (
    app.require_org_context()
    AND organization_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
CREATE POLICY organization_integrations_tenant_insert ON public.organization_integrations FOR
INSERT WITH CHECK (
    app.require_org_context()
    AND organization_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
CREATE POLICY organization_integrations_tenant_update ON public.organization_integrations FOR
UPDATE USING (
    app.require_org_context()
    AND organization_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  ) WITH CHECK (
    app.require_org_context()
    AND organization_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
CREATE POLICY organization_integrations_bypass_select ON public.organization_integrations FOR
SELECT USING (app.bypass_enabled());
CREATE POLICY organization_integrations_bypass_write ON public.organization_integrations FOR ALL WITH CHECK (app.bypass_enabled());
CREATE POLICY organization_integrations_guard_require_context ON public.organization_integrations AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
GRANT SELECT,
  INSERT,
  UPDATE ON TABLE public.organization_integrations TO texqtic_app;
COMMIT;