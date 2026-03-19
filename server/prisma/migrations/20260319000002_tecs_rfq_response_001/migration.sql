BEGIN;
-- Domain owner: tenant
-- Plane: tenant-plane
-- Lifecycle: create (submit-once first slice; no revision flow)
-- Reason: query-critical / constraints / joins
-- Indexes: uq rfq_id, idx supplier_org_id, idx created_by_user_id
-- RLS: yes - supplier_org_id scoped tenant isolation with explicit RFQ update policy
CREATE TABLE IF NOT EXISTS public.rfq_supplier_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  supplier_org_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  message TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT rfq_supplier_responses_rfq_id_key UNIQUE (rfq_id),
  CONSTRAINT rfq_supplier_responses_message_not_blank CHECK (length(btrim(message)) > 0)
);
CREATE INDEX IF NOT EXISTS rfq_supplier_responses_supplier_org_id_idx ON public.rfq_supplier_responses(supplier_org_id);
CREATE INDEX IF NOT EXISTS rfq_supplier_responses_created_by_user_id_idx ON public.rfq_supplier_responses(created_by_user_id);
CREATE OR REPLACE FUNCTION public.rfq_supplier_responses_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_rfq_supplier_responses_set_updated_at ON public.rfq_supplier_responses;
CREATE TRIGGER trg_rfq_supplier_responses_set_updated_at BEFORE
UPDATE ON public.rfq_supplier_responses FOR EACH ROW EXECUTE FUNCTION public.rfq_supplier_responses_set_updated_at();
ALTER TABLE public.rfq_supplier_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_supplier_responses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rfq_supplier_responses_guard ON public.rfq_supplier_responses;
CREATE POLICY rfq_supplier_responses_guard ON public.rfq_supplier_responses AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
DROP POLICY IF EXISTS rfq_supplier_responses_select_unified ON public.rfq_supplier_responses;
CREATE POLICY rfq_supplier_responses_select_unified ON public.rfq_supplier_responses AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND supplier_org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS rfq_supplier_responses_insert_unified ON public.rfq_supplier_responses;
CREATE POLICY rfq_supplier_responses_insert_unified ON public.rfq_supplier_responses AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND supplier_org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
GRANT SELECT,
  INSERT ON public.rfq_supplier_responses TO texqtic_app;
DROP POLICY IF EXISTS rfqs_update_supplier_response ON public.rfqs;
CREATE POLICY rfqs_update_supplier_response ON public.rfqs AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (
      app.require_org_context()
      AND supplier_org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  ) WITH CHECK (
    (
      app.require_org_context()
      AND supplier_org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
GRANT UPDATE ON public.rfqs TO texqtic_app;
COMMIT;