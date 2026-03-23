BEGIN;
CREATE TABLE IF NOT EXISTS public.certification_lifecycle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  from_state_key TEXT NOT NULL,
  to_state_key TEXT NOT NULL,
  actor_user_id UUID NULL,
  actor_admin_id UUID NULL,
  actor_type TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  escalation_level INTEGER NULL,
  maker_user_id UUID NULL,
  checker_user_id UUID NULL,
  ai_triggered BOOLEAN NOT NULL DEFAULT false,
  impersonation_id UUID NULL,
  reason TEXT NOT NULL,
  request_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT certification_lifecycle_logs_reason_nonempty CHECK (btrim(reason) <> '')
);
CREATE INDEX IF NOT EXISTS idx_certification_lifecycle_logs_certification_id ON public.certification_lifecycle_logs(certification_id);
CREATE INDEX IF NOT EXISTS idx_certification_lifecycle_logs_org_certification ON public.certification_lifecycle_logs(org_id, certification_id);
CREATE INDEX IF NOT EXISTS idx_certification_lifecycle_logs_org_certification_created ON public.certification_lifecycle_logs(org_id, certification_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certification_lifecycle_logs_org_id ON public.certification_lifecycle_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_certification_lifecycle_logs_to_state ON public.certification_lifecycle_logs(to_state_key);
ALTER TABLE public.certification_lifecycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_lifecycle_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS certification_lifecycle_logs_guard ON public.certification_lifecycle_logs;
CREATE POLICY certification_lifecycle_logs_guard ON public.certification_lifecycle_logs AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
  OR current_setting('app.is_admin', true) = 'true'
);
DROP POLICY IF EXISTS certification_lifecycle_logs_tenant_select ON public.certification_lifecycle_logs;
CREATE POLICY certification_lifecycle_logs_tenant_select ON public.certification_lifecycle_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (org_id = app.current_org_id())
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS certification_lifecycle_logs_tenant_insert ON public.certification_lifecycle_logs;
CREATE POLICY certification_lifecycle_logs_tenant_insert ON public.certification_lifecycle_logs AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS certification_lifecycle_logs_admin_select ON public.certification_lifecycle_logs;
CREATE POLICY certification_lifecycle_logs_admin_select ON public.certification_lifecycle_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (current_setting('app.is_admin', true) = 'true');
GRANT SELECT,
  INSERT ON public.certification_lifecycle_logs TO texqtic_app;
DO $$
DECLARE v_exists boolean;
v_rls boolean;
v_force boolean;
BEGIN
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'certification_lifecycle_logs'
  ) INTO v_exists;
IF NOT v_exists THEN RAISE EXCEPTION '[CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 FAIL] certification_lifecycle_logs table missing';
END IF;
SELECT relrowsecurity,
  relforcerowsecurity INTO v_rls,
  v_force
FROM pg_class
WHERE relname = 'certification_lifecycle_logs'
  AND relnamespace = 'public'::regnamespace;
IF NOT (
  v_rls
  AND v_force
) THEN RAISE EXCEPTION '[CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 FAIL] certification_lifecycle_logs missing ENABLE/FORCE RLS';
END IF;
END $$;
COMMIT;