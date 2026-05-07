-- =============================================================================
-- TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001
-- Migration: nc_pool_demand_snapshot_schema
-- Date:      2026-05-25
-- Summary:   Creates network_pool_demand_snapshots and
--            network_pool_demand_snapshot_lines tables.
--            Both tables are immutable once rows reach their final state.
--            Snapshot lines are fully immutable from insert (RLS + trigger).
--            Snapshot headers block UPDATE/DELETE via conservative RLS.
-- DB_RUNTIME_PENDING: Do NOT apply until Paresh authorises deployment.
-- =============================================================================
-- §1  Pre-flight guard
-- §2  CREATE TABLE network_pool_demand_snapshots
-- §3  Unique constraints — snapshots
-- §4  Indexes — snapshots
-- §5  CREATE TABLE network_pool_demand_snapshot_lines
-- §6  Unique constraints — snapshot lines
-- §7  Indexes — snapshot lines
-- §8  Immutability function + trigger — snapshot lines
-- §9  RLS — network_pool_demand_snapshots
-- §10 RLS — network_pool_demand_snapshot_lines
-- §11 Grants
-- =============================================================================
-- §1 Pre-flight guard ---------------------------------------------------------
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_demand_snapshots'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_pool_demand_snapshots already exists — migration may have been applied already. Halting.';
END IF;
IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_demand_snapshot_lines'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_pool_demand_snapshot_lines already exists — migration may have been applied already. Halting.';
END IF;
END $$;
-- §2 CREATE TABLE network_pool_demand_snapshots --------------------------------
CREATE TABLE public.network_pool_demand_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  owner_org_id UUID NOT NULL,
  pool_id UUID NOT NULL,
  snapshot_ref VARCHAR(100) NOT NULL,
  snapshot_version INTEGER NOT NULL,
  basis VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  captured_at TIMESTAMPTZ,
  captured_by_user_id UUID,
  captured_reason TEXT,
  line_count INTEGER NOT NULL DEFAULT 0,
  total_qty DECIMAL(18, 6),
  qty_unit VARCHAR(50),
  metadata_internal_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nc_pool_demand_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT nc_pool_demand_snapshots_owner_org_id_fk FOREIGN KEY (owner_org_id) REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_demand_snapshots_pool_id_fk FOREIGN KEY (pool_id) REFERENCES public.network_pools(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_demand_snapshots_snapshot_version_positive_check CHECK (snapshot_version >= 1),
  CONSTRAINT nc_pool_demand_snapshots_snapshot_ref_nonempty_check CHECK (length(trim(snapshot_ref)) > 0),
  CONSTRAINT nc_pool_demand_snapshots_basis_check CHECK (
    basis IN ('RFQ_ISSUE', 'RFQ_REVISION', 'MANUAL_RECAPTURE')
  ),
  CONSTRAINT nc_pool_demand_snapshots_status_check CHECK (
    status IN ('DRAFT', 'CAPTURED', 'SUPERSEDED', 'CANCELLED')
  ),
  CONSTRAINT nc_pool_demand_snapshots_captured_at_coherence_check CHECK (
    captured_at IS NOT NULL
    OR status != 'CAPTURED'
  ),
  CONSTRAINT nc_pool_demand_snapshots_line_count_nonneg_check CHECK (line_count >= 0),
  CONSTRAINT nc_pool_demand_snapshots_total_qty_positive_check CHECK (
    total_qty IS NULL
    OR total_qty > 0
  ),
  CONSTRAINT nc_pool_demand_snapshots_qty_unit_coherence_check CHECK (
    total_qty IS NULL
    OR (
      qty_unit IS NOT NULL
      AND length(trim(qty_unit)) > 0
    )
  )
);
-- §3 Unique constraints — snapshots ------------------------------------------
ALTER TABLE public.network_pool_demand_snapshots
ADD CONSTRAINT nc_pool_demand_snapshots_pool_version_unique UNIQUE (pool_id, snapshot_version);
ALTER TABLE public.network_pool_demand_snapshots
ADD CONSTRAINT nc_pool_demand_snapshots_pool_ref_unique UNIQUE (pool_id, snapshot_ref);
-- §4 Indexes — snapshots ------------------------------------------------------
CREATE INDEX idx_nc_pool_demand_snapshots_pool_id ON public.network_pool_demand_snapshots (pool_id);
CREATE INDEX idx_nc_pool_demand_snapshots_owner_org_id ON public.network_pool_demand_snapshots (owner_org_id);
CREATE INDEX idx_nc_pool_demand_snapshots_status ON public.network_pool_demand_snapshots (status);
CREATE INDEX idx_nc_pool_demand_snapshots_basis ON public.network_pool_demand_snapshots (basis);
CREATE INDEX idx_nc_pool_demand_snapshots_captured_at ON public.network_pool_demand_snapshots (captured_at);
CREATE INDEX idx_nc_pool_demand_snapshots_created_at ON public.network_pool_demand_snapshots (created_at DESC);
CREATE INDEX idx_nc_pool_demand_snapshots_updated_at ON public.network_pool_demand_snapshots (updated_at DESC);
-- §5 CREATE TABLE network_pool_demand_snapshot_lines --------------------------
CREATE TABLE public.network_pool_demand_snapshot_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL,
  owner_org_id UUID NOT NULL,
  pool_id UUID NOT NULL,
  demand_line_id UUID NOT NULL,
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
  source_type VARCHAR(50) NOT NULL,
  normalized_from_member_input BOOLEAN NOT NULL DEFAULT false,
  source_membership_id UUID,
  supersedes_line_id UUID,
  metadata_internal_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nc_pool_demand_snapshot_lines_pkey PRIMARY KEY (id),
  CONSTRAINT nc_pool_demand_snapshot_lines_snapshot_id_fk FOREIGN KEY (snapshot_id) REFERENCES public.network_pool_demand_snapshots(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_demand_snapshot_lines_owner_org_id_fk FOREIGN KEY (owner_org_id) REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_demand_snapshot_lines_pool_id_fk FOREIGN KEY (pool_id) REFERENCES public.network_pools(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_demand_snapshot_lines_demand_line_id_fk FOREIGN KEY (demand_line_id) REFERENCES public.network_pool_demand_lines(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_demand_snapshot_lines_source_membership_id_fk FOREIGN KEY (source_membership_id) REFERENCES public.network_pool_memberships(id) ON DELETE
  SET NULL ON UPDATE NO ACTION,
    CONSTRAINT nc_pool_demand_snapshot_lines_source_line_ref_nonempty_check CHECK (length(trim(source_line_ref)) > 0),
    CONSTRAINT nc_pool_demand_snapshot_lines_source_revision_no_positive_check CHECK (source_revision_no >= 1),
    CONSTRAINT nc_pool_demand_snapshot_lines_commodity_category_nonempty_check CHECK (length(trim(commodity_category)) > 0),
    CONSTRAINT nc_pool_demand_snapshot_lines_qty_positive_check CHECK (qty > 0),
    CONSTRAINT nc_pool_demand_snapshot_lines_qty_unit_nonempty_check CHECK (length(trim(qty_unit)) > 0),
    CONSTRAINT nc_pool_demand_snapshot_lines_delivery_window_coherence_check CHECK (
      delivery_window_end IS NULL
      OR delivery_window_start IS NULL
      OR delivery_window_end >= delivery_window_start
    ),
    CONSTRAINT nc_pool_demand_snapshot_lines_tolerance_pct_range_check CHECK (
      tolerance_pct IS NULL
      OR (
        tolerance_pct >= 0
        AND tolerance_pct <= 100
      )
    ),
    CONSTRAINT nc_pool_demand_snapshot_lines_source_type_check CHECK (
      source_type IN (
        'OWNER_DIRECT',
        'MEMBERSHIP_DERIVED',
        'OWNER_NORMALIZED'
      )
    )
);
-- §6 Unique constraints — snapshot lines -------------------------------------
ALTER TABLE public.network_pool_demand_snapshot_lines
ADD CONSTRAINT nc_pool_demand_snapshot_lines_snapshot_demand_line_unique UNIQUE (snapshot_id, demand_line_id);
ALTER TABLE public.network_pool_demand_snapshot_lines
ADD CONSTRAINT nc_pool_demand_snapshot_lines_snapshot_lineref_rev_unique UNIQUE (snapshot_id, source_line_ref, source_revision_no);
-- §7 Indexes — snapshot lines ------------------------------------------------
CREATE INDEX idx_nc_pool_demand_snapshot_lines_snapshot_id ON public.network_pool_demand_snapshot_lines (snapshot_id);
CREATE INDEX idx_nc_pool_demand_snapshot_lines_demand_line_id ON public.network_pool_demand_snapshot_lines (demand_line_id);
CREATE INDEX idx_nc_pool_demand_snapshot_lines_pool_id ON public.network_pool_demand_snapshot_lines (pool_id);
CREATE INDEX idx_nc_pool_demand_snapshot_lines_owner_org_id ON public.network_pool_demand_snapshot_lines (owner_org_id);
CREATE INDEX idx_nc_pool_demand_snapshot_lines_commodity_category ON public.network_pool_demand_snapshot_lines (commodity_category);
CREATE INDEX idx_nc_pool_demand_snapshot_lines_qty_unit ON public.network_pool_demand_snapshot_lines (qty_unit);
CREATE INDEX idx_nc_pool_demand_snapshot_lines_source_membership_id ON public.network_pool_demand_snapshot_lines (source_membership_id);
CREATE INDEX idx_nc_pool_demand_snapshot_lines_created_at ON public.network_pool_demand_snapshot_lines (created_at DESC);
-- §8 Immutability function + trigger — snapshot lines -------------------------
-- Snapshot lines are fully immutable once inserted.
-- Belt-and-suspenders: RLS no_update/no_delete (§10) + this trigger.
CREATE OR REPLACE FUNCTION public.prevent_snapshot_line_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'IMMUTABLE: network_pool_demand_snapshot_lines rows cannot be modified or deleted after insert';
RETURN NULL;
END;
$$;
CREATE TRIGGER trg_immutable_nc_pool_demand_snapshot_lines BEFORE
UPDATE
  OR DELETE ON public.network_pool_demand_snapshot_lines FOR EACH ROW EXECUTE FUNCTION public.prevent_snapshot_line_mutation();
-- §9 RLS — network_pool_demand_snapshots --------------------------------------
ALTER TABLE public.network_pool_demand_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_pool_demand_snapshots FORCE ROW LEVEL SECURITY;
-- Tenant: read own snapshots
CREATE POLICY nc_pool_demand_snapshots_tenant_select ON public.network_pool_demand_snapshots FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Tenant: insert own snapshots (service-layer enforces org scoping at route level)
CREATE POLICY nc_pool_demand_snapshots_tenant_insert ON public.network_pool_demand_snapshots FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Conservative: no UPDATE via app role (no service layer in this packet)
CREATE POLICY nc_pool_demand_snapshots_no_update ON public.network_pool_demand_snapshots FOR
UPDATE TO texqtic_app USING (false);
-- No DELETE ever
CREATE POLICY nc_pool_demand_snapshots_no_delete ON public.network_pool_demand_snapshots FOR DELETE TO texqtic_app USING (false);
-- Control-plane read-only
CREATE POLICY nc_pool_demand_snapshots_admin_select ON public.network_pool_demand_snapshots FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- §10 RLS — network_pool_demand_snapshot_lines ---------------------------------
ALTER TABLE public.network_pool_demand_snapshot_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_pool_demand_snapshot_lines FORCE ROW LEVEL SECURITY;
-- Tenant: read own snapshot lines
CREATE POLICY nc_pool_demand_snapshot_lines_tenant_select ON public.network_pool_demand_snapshot_lines FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Tenant: insert own snapshot lines
CREATE POLICY nc_pool_demand_snapshot_lines_tenant_insert ON public.network_pool_demand_snapshot_lines FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Fully immutable: no UPDATE
CREATE POLICY nc_pool_demand_snapshot_lines_no_update ON public.network_pool_demand_snapshot_lines FOR
UPDATE TO texqtic_app USING (false);
-- Fully immutable: no DELETE
CREATE POLICY nc_pool_demand_snapshot_lines_no_delete ON public.network_pool_demand_snapshot_lines FOR DELETE TO texqtic_app USING (false);
-- Control-plane read-only
CREATE POLICY nc_pool_demand_snapshot_lines_admin_select ON public.network_pool_demand_snapshot_lines FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- §11 Grants ------------------------------------------------------------------
GRANT SELECT,
  INSERT ON public.network_pool_demand_snapshots TO texqtic_app;
GRANT SELECT ON public.network_pool_demand_snapshots TO texqtic_admin;
GRANT SELECT,
  INSERT ON public.network_pool_demand_snapshot_lines TO texqtic_app;
GRANT SELECT ON public.network_pool_demand_snapshot_lines TO texqtic_admin;