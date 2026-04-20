BEGIN;
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS primary_segment_key VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_organizations_primary_segment_key ON public.organizations (primary_segment_key);
CREATE TABLE IF NOT EXISTS public.organization_secondary_segments (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  segment_key VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_secondary_segments_pkey PRIMARY KEY (org_id, segment_key)
);
CREATE TABLE IF NOT EXISTS public.organization_role_positions (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_position_key VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_role_positions_pkey PRIMARY KEY (org_id, role_position_key)
);
ALTER TABLE public.organization_secondary_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_secondary_segments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_role_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_role_positions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_secondary_segments_guard_policy ON public.organization_secondary_segments;
DROP POLICY IF EXISTS organization_secondary_segments_control_plane_select ON public.organization_secondary_segments;
DROP POLICY IF EXISTS organization_role_positions_guard_policy ON public.organization_role_positions;
DROP POLICY IF EXISTS organization_role_positions_control_plane_select ON public.organization_role_positions;
CREATE POLICY organization_secondary_segments_control_plane_select ON public.organization_secondary_segments FOR
SELECT USING (
    app.bypass_enabled()
    OR app.current_realm() = 'admin'
  );
CREATE POLICY organization_secondary_segments_guard_policy ON public.organization_secondary_segments AS RESTRICTIVE FOR ALL USING (
  app.bypass_enabled()
  OR app.current_realm() = 'admin'
);
CREATE POLICY organization_role_positions_control_plane_select ON public.organization_role_positions FOR
SELECT USING (
    app.bypass_enabled()
    OR app.current_realm() = 'admin'
  );
CREATE POLICY organization_role_positions_guard_policy ON public.organization_role_positions AS RESTRICTIVE FOR ALL USING (
  app.bypass_enabled()
  OR app.current_realm() = 'admin'
);
GRANT SELECT ON TABLE public.organization_secondary_segments TO texqtic_app;
GRANT SELECT ON TABLE public.organization_role_positions TO texqtic_app;
COMMIT;