BEGIN;

DO $$
BEGIN
  CREATE TYPE public.rfq_status AS ENUM ('INITIATED', 'OPEN', 'RESPONDED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  supplier_org_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  catalog_item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  buyer_message TEXT,
  status public.rfq_status NOT NULL DEFAULT 'OPEN',
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rfqs_quantity_min CHECK (quantity >= 1)
);

CREATE INDEX IF NOT EXISTS rfqs_org_id_idx ON public.rfqs(org_id);
CREATE INDEX IF NOT EXISTS rfqs_supplier_org_id_idx ON public.rfqs(supplier_org_id);
CREATE INDEX IF NOT EXISTS rfqs_catalog_item_id_idx ON public.rfqs(catalog_item_id);

CREATE OR REPLACE FUNCTION public.rfqs_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rfqs_set_updated_at ON public.rfqs;
CREATE TRIGGER trg_rfqs_set_updated_at BEFORE UPDATE ON public.rfqs
FOR EACH ROW EXECUTE FUNCTION public.rfqs_set_updated_at();

ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rfqs_guard ON public.rfqs;
CREATE POLICY rfqs_guard ON public.rfqs AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
);

DROP POLICY IF EXISTS rfqs_select_unified ON public.rfqs;
CREATE POLICY rfqs_select_unified ON public.rfqs AS PERMISSIVE FOR SELECT TO texqtic_app USING (
  (
    app.require_org_context()
    AND (
      org_id = app.current_org_id()
      OR supplier_org_id = app.current_org_id()
    )
  )
  OR app.bypass_enabled()
);

DROP POLICY IF EXISTS rfqs_insert_unified ON public.rfqs;
CREATE POLICY rfqs_insert_unified ON public.rfqs AS PERMISSIVE FOR INSERT TO texqtic_app WITH CHECK (
  (
    app.require_org_context()
    AND org_id = app.current_org_id()
  )
  OR app.bypass_enabled()
);

GRANT SELECT, INSERT ON public.rfqs TO texqtic_app;

COMMIT;