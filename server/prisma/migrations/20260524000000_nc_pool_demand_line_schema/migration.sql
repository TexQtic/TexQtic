-- =============================================================================
-- Migration: 20260524000000_nc_pool_demand_line_schema
-- Task:      TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-FOUNDATION-001
-- Purpose:   Create network_pool_demand_lines table.
--            Implements the canonical demand-line-first schema contract defined in
--            TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001 and authorized by
--            TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001.
--            No service layer, routes, or snapshot tables in this packet.
--            RFQ schema blocked until this foundation is applied (Decision 2).
-- Authority: Authorized by TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001.
-- DB Role:   texqtic_app (tenant), texqtic_admin (control-plane)
-- RLS:       owner_org_id isolation (app.org_id GUC); admin via app.is_admin GUC
-- Immutability: DELETE blocked via RLS USING false.
--              UPDATE allowed (lifecycle transitions, corrections pre-LOCKED).
--              Audit trail via NetworkLifecycleLog in a later packet.
-- Snapshot:  Deferred to TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- §1  Pre-flight Guard
-- Aborts if the table already exists to prevent double-application.
-- -----------------------------------------------------------------------------
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_demand_lines'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_pool_demand_lines already exists. ' 'This migration has already been applied or the table was created out-of-band. ' 'Halting to prevent double-application.';
END IF;
END $$;
-- -----------------------------------------------------------------------------
-- §2  Create Table: network_pool_demand_lines
-- owner_org_id is the canonical RLS anchor and tenant boundary.
-- pool_id is the FK to network_pools; one pool may have many demand lines.
-- line_ref + revision_no provides stable external identity for buyer UX.
-- status lifecycle: DRAFT → ACTIVE → LOCKED_FOR_RFQ → SUPERSEDED | CANCELLED
-- source_type: OWNER_DIRECT | MEMBERSHIP_DERIVED | OWNER_NORMALIZED
-- Snapshot/immutability deferred to DEMAND-SNAPSHOT-SCHEMA-001 packet.
-- -----------------------------------------------------------------------------
CREATE TABLE public.network_pool_demand_lines (
  -- ── Surrogate key ──────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant anchor (RLS owner) ──────────────────────────────────────────────
  -- Live FK to organizations.id; never nullable; determines RLS scope.
  -- This is the pool-owning org that created/owns the demand line.
  owner_org_id UUID NOT NULL,
  -- ── Pool reference ─────────────────────────────────────────────────────────
  -- Live FK to network_pools(id). Demand lines are scoped to one pool.
  pool_id UUID NOT NULL,
  -- ── Line identity ──────────────────────────────────────────────────────────
  -- Human-readable stable reference per pool. Non-empty enforced by CHECK.
  -- Combined with revision_no and pool_id for full external identity.
  line_ref VARCHAR(100) NOT NULL,
  -- ── Product / specification ────────────────────────────────────────────────
  -- Top-level commodity category (e.g., COTTON_YARN, GREY_FABRIC). Non-empty.
  commodity_category VARCHAR(100) NOT NULL,
  -- Optional sub-category (e.g., RING_SPUN, OPEN_END).
  product_category VARCHAR(100) NULL,
  -- Free-form human-readable summary of the product specification.
  product_spec_summary TEXT NULL,
  -- ── Quantity ───────────────────────────────────────────────────────────────
  -- Quantity demanded for this line. DB CHECK: qty > 0.
  qty DECIMAL(18, 6) NOT NULL,
  -- Unit of measure (e.g., KG, MT, METERS). Non-empty enforced by CHECK.
  qty_unit VARCHAR(50) NOT NULL,
  -- ── Structured requirements (nullable JSONB) ───────────────────────────────
  -- Quality requirements: grade, count, twist, etc.
  quality_requirements_json JSONB NULL,
  -- Certification requirements: BCI, GOTS, OEKO-TEX, etc.
  certification_requirements_json JSONB NULL,
  -- Packaging requirements: bale type, labeling, etc.
  packaging_requirements_json JSONB NULL,
  -- ── Delivery ───────────────────────────────────────────────────────────────
  -- Delivery destination (city/port/region text). Nullable at DRAFT stage.
  delivery_location VARCHAR(500) NULL,
  -- Earliest acceptable delivery date. Nullable at DRAFT stage.
  delivery_window_start TIMESTAMPTZ NULL,
  -- Latest acceptable delivery date. Nullable at DRAFT stage.
  -- DB CHECK: end >= start when both are set.
  delivery_window_end TIMESTAMPTZ NULL,
  -- ── Controls ───────────────────────────────────────────────────────────────
  -- Quantity tolerance percentage (0–100). Null means no tolerance configured.
  -- DB CHECK: tolerance_pct IS NULL OR (tolerance_pct >= 0 AND tolerance_pct <= 100)
  tolerance_pct DECIMAL(5, 2) NULL,
  -- Optional priority rank within pool (lower = higher priority). Null = unranked.
  priority INTEGER NULL,
  -- Demand line lifecycle status. Domain enforced by DB CHECK.
  -- Values: DRAFT | ACTIVE | LOCKED_FOR_RFQ | SUPERSEDED | CANCELLED
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  -- Demand source type. Enforced by DB CHECK.
  -- OWNER_DIRECT: Pool owner entered this directly.
  -- MEMBERSHIP_DERIVED: Synthesized from a member's declaration.
  -- OWNER_NORMALIZED: Owner normalized a member declaration.
  source_type VARCHAR(50) NOT NULL,
  -- ── Lineage ────────────────────────────────────────────────────────────────
  -- Nullable FK to the membership whose declared demand triggered this line.
  -- NULL when source_type = OWNER_DIRECT.
  source_membership_id UUID NULL,
  -- True when this line was produced by normalizing a raw member input.
  normalized_from_member_input BOOLEAN NOT NULL DEFAULT false,
  -- ── Revision ───────────────────────────────────────────────────────────────
  -- Revision number within (pool_id, line_ref) sequence. DB CHECK: >= 1.
  revision_no INTEGER NOT NULL DEFAULT 1,
  -- Nullable self-FK: points to the prior line version this supersedes.
  -- NULL for revision_no = 1 (original line).
  supersedes_line_id UUID NULL,
  -- ── Internal metadata ──────────────────────────────────────────────────────
  -- Internal operational metadata bag. Never exposed to suppliers.
  metadata_internal_json JSONB NULL,
  -- ── Timestamps ─────────────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Set when status transitions to LOCKED_FOR_RFQ. Null otherwise.
  -- DB CHECK: locked_at IS NOT NULL when status = LOCKED_FOR_RFQ.
  locked_at TIMESTAMPTZ NULL,
  -- ── Primary key ────────────────────────────────────────────────────────────
  CONSTRAINT network_pool_demand_lines_pkey PRIMARY KEY (id),
  -- ── FK: owner_org_id → organizations ──────────────────────────────────────
  CONSTRAINT network_pool_demand_lines_owner_org_id_fk FOREIGN KEY (owner_org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
  -- ── FK: pool_id → network_pools ───────────────────────────────────────────
  CONSTRAINT network_pool_demand_lines_pool_id_fk FOREIGN KEY (pool_id) REFERENCES public.network_pools (id) ON DELETE CASCADE,
  -- ── FK: source_membership_id → network_pool_memberships ───────────────────
  -- Nullable; only set when source_type = MEMBERSHIP_DERIVED | OWNER_NORMALIZED
  CONSTRAINT network_pool_demand_lines_source_membership_id_fk FOREIGN KEY (source_membership_id) REFERENCES public.network_pool_memberships (id) ON DELETE
  SET NULL,
    -- ── FK: supersedes_line_id → self ─────────────────────────────────────────
    -- Self-referential revision chain. NULL for first revision.
    CONSTRAINT network_pool_demand_lines_supersedes_line_id_fk FOREIGN KEY (supersedes_line_id) REFERENCES public.network_pool_demand_lines (id) ON DELETE
  SET NULL,
    -- ── Quantity guard ─────────────────────────────────────────────────────────
    CONSTRAINT network_pool_demand_lines_qty_positive_check CHECK (qty > 0),
    -- ── Tolerance range guard ─────────────────────────────────────────────────
    CONSTRAINT network_pool_demand_lines_tolerance_pct_range_check CHECK (
      tolerance_pct IS NULL
      OR (
        tolerance_pct >= 0
        AND tolerance_pct <= 100
      )
    ),
    -- ── Delivery window coherence guard ───────────────────────────────────────
    CONSTRAINT network_pool_demand_lines_delivery_window_coherence_check CHECK (
      delivery_window_end IS NULL
      OR delivery_window_start IS NULL
      OR delivery_window_end >= delivery_window_start
    ),
    -- ── Status domain guard ───────────────────────────────────────────────────
    CONSTRAINT network_pool_demand_lines_status_check CHECK (
      status IN (
        'DRAFT',
        'ACTIVE',
        'LOCKED_FOR_RFQ',
        'SUPERSEDED',
        'CANCELLED'
      )
    ),
    -- ── Source type domain guard ──────────────────────────────────────────────
    CONSTRAINT network_pool_demand_lines_source_type_check CHECK (
      source_type IN (
        'OWNER_DIRECT',
        'MEMBERSHIP_DERIVED',
        'OWNER_NORMALIZED'
      )
    ),
    -- ── Locked-at coherence guard ─────────────────────────────────────────────
    -- locked_at must be set when status = LOCKED_FOR_RFQ.
    CONSTRAINT network_pool_demand_lines_locked_at_coherence_check CHECK (
      locked_at IS NOT NULL
      OR status != 'LOCKED_FOR_RFQ'
    ),
    -- ── Revision number guard ─────────────────────────────────────────────────
    CONSTRAINT network_pool_demand_lines_revision_no_positive_check CHECK (revision_no >= 1),
    -- ── line_ref non-empty guard ──────────────────────────────────────────────
    CONSTRAINT network_pool_demand_lines_line_ref_nonempty_check CHECK (length(trim(line_ref)) > 0),
    -- ── commodity_category non-empty guard ────────────────────────────────────
    CONSTRAINT network_pool_demand_lines_commodity_category_nonempty_check CHECK (length(trim(commodity_category)) > 0),
    -- ── qty_unit non-empty guard ──────────────────────────────────────────────
    CONSTRAINT network_pool_demand_lines_qty_unit_nonempty_check CHECK (length(trim(qty_unit)) > 0)
);
-- -----------------------------------------------------------------------------
-- §3  Unique Constraint: (pool_id, line_ref, revision_no)
-- Guarantees that each revision of a line_ref within a pool is unique.
-- Supports the revision chain: same line_ref can exist at rev 1, 2, 3…
-- -----------------------------------------------------------------------------
ALTER TABLE public.network_pool_demand_lines
ADD CONSTRAINT network_pool_demand_lines_pool_line_ref_revision_unique UNIQUE (pool_id, line_ref, revision_no);
-- -----------------------------------------------------------------------------
-- §4  Indexes
-- -----------------------------------------------------------------------------
-- Tenant demand line list by pool (primary read path)
CREATE INDEX idx_nc_pool_demand_lines_pool_id ON public.network_pool_demand_lines (pool_id);
-- Tenant demand line list by owner org (org-scoped reads, RLS complement)
CREATE INDEX idx_nc_pool_demand_lines_owner_org_id ON public.network_pool_demand_lines (owner_org_id);
-- Status filter (workflow queries: ACTIVE lines, LOCKED lines, etc.)
CREATE INDEX idx_nc_pool_demand_lines_status ON public.network_pool_demand_lines (status);
-- Commodity category filter (matching / aggregation queries)
CREATE INDEX idx_nc_pool_demand_lines_commodity_category ON public.network_pool_demand_lines (commodity_category);
-- Qty unit filter (unit coherence validation queries)
CREATE INDEX idx_nc_pool_demand_lines_qty_unit ON public.network_pool_demand_lines (qty_unit);
-- Source membership lookup (lineage trace: which lines came from which membership)
CREATE INDEX idx_nc_pool_demand_lines_source_membership_id ON public.network_pool_demand_lines (source_membership_id);
-- Supersedes chain lookup (revision graph traversal)
CREATE INDEX idx_nc_pool_demand_lines_supersedes_line_id ON public.network_pool_demand_lines (supersedes_line_id);
-- Time-ordered read (descending creation time per pool)
CREATE INDEX idx_nc_pool_demand_lines_pool_created ON public.network_pool_demand_lines (pool_id, created_at DESC);
-- Updated-at (staleness / sync queries)
CREATE INDEX idx_nc_pool_demand_lines_updated_at ON public.network_pool_demand_lines (updated_at DESC);
-- -----------------------------------------------------------------------------
-- §5  Row-Level Security
-- Tenant access scoped by app.org_id GUC (owner_org_id anchor).
-- Control-plane access via app.is_admin GUC.
-- DELETE permanently blocked — demand line audit trail must not be erased.
-- UPDATE allowed for tenant role (lifecycle transitions, corrections pre-LOCKED).
-- -----------------------------------------------------------------------------
ALTER TABLE public.network_pool_demand_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_pool_demand_lines FORCE ROW LEVEL SECURITY;
-- Tenant SELECT: must have org_id GUC set; scoped to own org
CREATE POLICY network_pool_demand_lines_tenant_select ON public.network_pool_demand_lines FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Tenant INSERT: owner_org_id in row must match GUC (prevents cross-tenant write)
CREATE POLICY network_pool_demand_lines_tenant_insert ON public.network_pool_demand_lines FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Tenant UPDATE: owner_org_id scoped; allows lifecycle transitions pre-LOCKED
CREATE POLICY network_pool_demand_lines_tenant_update ON public.network_pool_demand_lines FOR
UPDATE TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  ) WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- DELETE permanently blocked — demand line audit trail must not be erased
CREATE POLICY network_pool_demand_lines_no_delete ON public.network_pool_demand_lines FOR DELETE TO texqtic_app USING (false);
-- Control-plane admin SELECT: requires app.is_admin GUC set to 'true'
CREATE POLICY network_pool_demand_lines_admin_select ON public.network_pool_demand_lines FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- -----------------------------------------------------------------------------
-- §6  Grants
-- Minimal privilege: app role gets SELECT + INSERT + UPDATE (no DELETE).
-- Admin role gets SELECT only (read-only control-plane view).
-- -----------------------------------------------------------------------------
GRANT SELECT,
  INSERT,
  UPDATE ON public.network_pool_demand_lines TO texqtic_app;
GRANT SELECT ON public.network_pool_demand_lines TO texqtic_admin;