-- =============================================================================
-- TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-FOUNDATION-001
-- Migration: nc_pool_rfq_schema
-- Date:      2026-05-28
-- Summary:   Creates network_pool_rfqs and network_pool_rfq_lines tables.
--            Both tables are fully immutable once rows are inserted (v1).
--            RFQ lines are immutable from insert: RLS no_update/no_delete + trigger.
--            RFQ headers are immutable from insert: RLS no_update/no_delete (v1).
--            Authorised by DECISION-RECORD-001 (caac5a0) Q1–Q6.
-- DB_RUNTIME_PENDING: Do NOT apply until Paresh authorises deployment.
-- =============================================================================
-- §1  Pre-flight guard
-- §2  CREATE TABLE network_pool_rfqs
-- §3  Unique constraints — rfqs
-- §4  Indexes — rfqs
-- §5  CREATE TABLE network_pool_rfq_lines
-- §6  Unique constraints — rfq lines
-- §7  Indexes — rfq lines
-- §8  Immutability function + trigger — rfq lines
-- §9  RLS — network_pool_rfqs
-- §10 RLS — network_pool_rfq_lines
-- §11 Grants
-- =============================================================================
-- §1 Pre-flight guard ---------------------------------------------------------
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_rfqs'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_pool_rfqs already exists — migration may have been applied already. Halting.';
END IF;
IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_rfq_lines'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_pool_rfq_lines already exists — migration may have been applied already. Halting.';
END IF;
END $$;
-- §2 CREATE TABLE network_pool_rfqs -------------------------------------------
CREATE TABLE public.network_pool_rfqs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  owner_org_id UUID NOT NULL,
  pool_id UUID NOT NULL,
  snapshot_id UUID NOT NULL,
  rfq_ref VARCHAR(100) NOT NULL,
  rfq_version INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ISSUED',
  issue_basis VARCHAR(50) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  issued_by_user_id UUID,
  issue_reason TEXT,
  response_deadline_at TIMESTAMPTZ,
  supplier_invite_mode VARCHAR(50) NOT NULL,
  line_count INTEGER NOT NULL,
  total_qty DECIMAL(18, 6),
  qty_unit VARCHAR(50),
  metadata_internal_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nc_pool_rfqs_pkey PRIMARY KEY (id),
  CONSTRAINT nc_pool_rfqs_owner_org_id_fk FOREIGN KEY (owner_org_id) REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfqs_pool_id_fk FOREIGN KEY (pool_id) REFERENCES public.network_pools(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfqs_snapshot_id_fk FOREIGN KEY (snapshot_id) REFERENCES public.network_pool_demand_snapshots(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfqs_status_check CHECK (
    status IN (
      'ISSUED',
      'QUOTED',
      'ACCEPTED',
      'REJECTED',
      'EXPIRED',
      'CANCELLED'
    )
  ),
  CONSTRAINT nc_pool_rfqs_issue_basis_check CHECK (issue_basis IN ('SNAPSHOT_LOCK')),
  CONSTRAINT nc_pool_rfqs_supplier_invite_mode_check CHECK (supplier_invite_mode IN ('INVITE_ONLY')),
  CONSTRAINT nc_pool_rfqs_rfq_version_positive_check CHECK (rfq_version >= 1),
  CONSTRAINT nc_pool_rfqs_rfq_ref_nonempty_check CHECK (length(trim(rfq_ref)) > 0),
  CONSTRAINT nc_pool_rfqs_line_count_positive_check CHECK (line_count > 0),
  CONSTRAINT nc_pool_rfqs_total_qty_positive_check CHECK (
    total_qty IS NULL
    OR total_qty > 0
  ),
  CONSTRAINT nc_pool_rfqs_qty_unit_coherence_check CHECK (
    total_qty IS NULL
    OR (
      qty_unit IS NOT NULL
      AND length(trim(qty_unit)) > 0
    )
  )
);
-- §3 Unique constraints — rfqs ------------------------------------------------
ALTER TABLE public.network_pool_rfqs
ADD CONSTRAINT nc_pool_rfqs_pool_version_unique UNIQUE (pool_id, rfq_version);
ALTER TABLE public.network_pool_rfqs
ADD CONSTRAINT nc_pool_rfqs_pool_rfq_ref_unique UNIQUE (pool_id, rfq_ref);
-- §4 Indexes — rfqs -----------------------------------------------------------
CREATE INDEX idx_nc_pool_rfqs_pool_id ON public.network_pool_rfqs (pool_id);
CREATE INDEX idx_nc_pool_rfqs_owner_org_id ON public.network_pool_rfqs (owner_org_id);
CREATE INDEX idx_nc_pool_rfqs_snapshot_id ON public.network_pool_rfqs (snapshot_id);
CREATE INDEX idx_nc_pool_rfqs_status ON public.network_pool_rfqs (status);
CREATE INDEX idx_nc_pool_rfqs_issued_at ON public.network_pool_rfqs (issued_at);
CREATE INDEX idx_nc_pool_rfqs_created_at ON public.network_pool_rfqs (created_at DESC);
CREATE INDEX idx_nc_pool_rfqs_updated_at ON public.network_pool_rfqs (updated_at DESC);
-- §5 CREATE TABLE network_pool_rfq_lines --------------------------------------
CREATE TABLE public.network_pool_rfq_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL,
  owner_org_id UUID NOT NULL,
  pool_id UUID NOT NULL,
  snapshot_line_id UUID NOT NULL,
  demand_line_id UUID,
  source_line_ref VARCHAR(100) NOT NULL,
  source_revision_no INTEGER NOT NULL,
  commodity_category VARCHAR(100) NOT NULL,
  product_category VARCHAR(100),
  product_spec_summary TEXT,
  qty DECIMAL(18, 6) NOT NULL,
  qty_unit VARCHAR(50) NOT NULL,
  quality_requirements_json JSONB,
  certification_requirements_json JSONB,
  packaging_requirements_json JSONB,
  delivery_location VARCHAR(500),
  delivery_window_start TIMESTAMPTZ,
  delivery_window_end TIMESTAMPTZ,
  tolerance_pct DECIMAL(5, 2),
  priority INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nc_pool_rfq_lines_pkey PRIMARY KEY (id),
  CONSTRAINT nc_pool_rfq_lines_rfq_id_fk FOREIGN KEY (rfq_id) REFERENCES public.network_pool_rfqs(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_lines_owner_org_id_fk FOREIGN KEY (owner_org_id) REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_lines_pool_id_fk FOREIGN KEY (pool_id) REFERENCES public.network_pools(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_lines_snapshot_line_id_fk FOREIGN KEY (snapshot_line_id) REFERENCES public.network_pool_demand_snapshot_lines(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_lines_source_line_ref_nonempty_check CHECK (length(trim(source_line_ref)) > 0),
  CONSTRAINT nc_pool_rfq_lines_source_revision_no_positive_check CHECK (source_revision_no >= 1),
  CONSTRAINT nc_pool_rfq_lines_commodity_category_nonempty_check CHECK (length(trim(commodity_category)) > 0),
  CONSTRAINT nc_pool_rfq_lines_qty_positive_check CHECK (qty > 0),
  CONSTRAINT nc_pool_rfq_lines_qty_unit_nonempty_check CHECK (length(trim(qty_unit)) > 0),
  CONSTRAINT nc_pool_rfq_lines_delivery_window_coherence_check CHECK (
    delivery_window_end IS NULL
    OR delivery_window_start IS NULL
    OR delivery_window_end >= delivery_window_start
  ),
  CONSTRAINT nc_pool_rfq_lines_tolerance_pct_range_check CHECK (
    tolerance_pct IS NULL
    OR (
      tolerance_pct >= 0
      AND tolerance_pct <= 100
    )
  )
);
-- §6 Unique constraints — rfq lines -------------------------------------------
ALTER TABLE public.network_pool_rfq_lines
ADD CONSTRAINT nc_pool_rfq_lines_rfq_snapshot_line_unique UNIQUE (rfq_id, snapshot_line_id);
-- §7 Indexes — rfq lines ------------------------------------------------------
CREATE INDEX idx_nc_pool_rfq_lines_rfq_id ON public.network_pool_rfq_lines (rfq_id);
CREATE INDEX idx_nc_pool_rfq_lines_pool_id ON public.network_pool_rfq_lines (pool_id);
CREATE INDEX idx_nc_pool_rfq_lines_owner_org_id ON public.network_pool_rfq_lines (owner_org_id);
CREATE INDEX idx_nc_pool_rfq_lines_snapshot_line_id ON public.network_pool_rfq_lines (snapshot_line_id);
CREATE INDEX idx_nc_pool_rfq_lines_demand_line_id ON public.network_pool_rfq_lines (demand_line_id);
CREATE INDEX idx_nc_pool_rfq_lines_commodity_category ON public.network_pool_rfq_lines (commodity_category);
CREATE INDEX idx_nc_pool_rfq_lines_created_at ON public.network_pool_rfq_lines (created_at DESC);
-- §8 Immutability function + trigger — rfq lines ------------------------------
-- RFQ lines are fully immutable once inserted.
-- Belt-and-suspenders: RLS no_update/no_delete (§10) + this trigger.
CREATE OR REPLACE FUNCTION public.prevent_rfq_line_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'IMMUTABLE: network_pool_rfq_lines rows cannot be modified or deleted after insert';
RETURN NULL;
END;
$$;
CREATE TRIGGER trg_immutable_nc_pool_rfq_lines BEFORE
UPDATE
  OR DELETE ON public.network_pool_rfq_lines FOR EACH ROW EXECUTE FUNCTION public.prevent_rfq_line_mutation();
-- §9 RLS — network_pool_rfqs --------------------------------------------------
ALTER TABLE public.network_pool_rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_pool_rfqs FORCE ROW LEVEL SECURITY;
-- Tenant: read own RFQs
CREATE POLICY nc_pool_rfqs_tenant_select ON public.network_pool_rfqs FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Tenant: insert own RFQs (service-layer enforces org scoping at route level)
CREATE POLICY nc_pool_rfqs_tenant_insert ON public.network_pool_rfqs FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Fully immutable in v1: no UPDATE
CREATE POLICY nc_pool_rfqs_no_update ON public.network_pool_rfqs FOR
UPDATE TO texqtic_app USING (false);
-- No DELETE ever
CREATE POLICY nc_pool_rfqs_no_delete ON public.network_pool_rfqs FOR DELETE TO texqtic_app USING (false);
-- Control-plane read-only
CREATE POLICY nc_pool_rfqs_admin_select ON public.network_pool_rfqs FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- §10 RLS — network_pool_rfq_lines --------------------------------------------
ALTER TABLE public.network_pool_rfq_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_pool_rfq_lines FORCE ROW LEVEL SECURITY;
-- Tenant: read own RFQ lines
CREATE POLICY nc_pool_rfq_lines_tenant_select ON public.network_pool_rfq_lines FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Tenant: insert own RFQ lines
CREATE POLICY nc_pool_rfq_lines_tenant_insert ON public.network_pool_rfq_lines FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Fully immutable: no UPDATE
CREATE POLICY nc_pool_rfq_lines_no_update ON public.network_pool_rfq_lines FOR
UPDATE TO texqtic_app USING (false);
-- Fully immutable: no DELETE
CREATE POLICY nc_pool_rfq_lines_no_delete ON public.network_pool_rfq_lines FOR DELETE TO texqtic_app USING (false);
-- Control-plane read-only
CREATE POLICY nc_pool_rfq_lines_admin_select ON public.network_pool_rfq_lines FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- §11 Grants ------------------------------------------------------------------
GRANT SELECT,
  INSERT ON public.network_pool_rfqs TO texqtic_app;
GRANT SELECT ON public.network_pool_rfqs TO texqtic_admin;
GRANT SELECT,
  INSERT ON public.network_pool_rfq_lines TO texqtic_app;
GRANT SELECT ON public.network_pool_rfq_lines TO texqtic_admin;