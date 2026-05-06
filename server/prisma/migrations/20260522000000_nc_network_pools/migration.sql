-- =============================================================================
-- Migration: 20260522000000_nc_network_pools
-- Task:      TEXQTIC-NC-PHASE1-POOL-SCHEMA-001
-- Purpose:   Create network_pools and network_pool_memberships tables for
--            the Collective Procurement Pool module (NC Module A).
--            Schema foundation only — no service layer, routes, or seed data.
--            Pool lifecycle state rows (POOL entity type) are seeded in the
--            separate TEXQTIC-NC-PHASE1-POOL-LIFECYCLE-SEED-001 packet.
-- Authority: Authorized by TEXQTIC-NC-PHASE1-POOL-SCHEMA-001 packet.
-- DB Role:   texqtic_app (tenant), texqtic_admin (control-plane)
-- RLS:       org_id isolation (app.org_id GUC); admin via app.is_admin GUC
-- Immutability: DELETE blocked on both tables via RLS USING false.
--              UPDATE allowed (lifecycle transitions, membership approval).
--              Audit trail via NetworkLifecycleLog deferred to later packets.
-- =============================================================================
BEGIN;
-- -----------------------------------------------------------------------------
-- §1  Pre-flight Guard
-- Aborts if either table already exists to prevent double-application.
-- Uses RAISE EXCEPTION (not NOTICE + RETURN) for hard stop on collision.
-- -----------------------------------------------------------------------------
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pools'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_pools already exists. ' 'This migration has already been applied or the table was created out-of-band. ' 'Halting to prevent double-application.';
END IF;
IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_memberships'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_pool_memberships already exists. ' 'This migration has already been applied or the table was created out-of-band. ' 'Halting to prevent double-application.';
END IF;
END $$;
-- -----------------------------------------------------------------------------
-- §2  Create Table: network_pools
-- Pool admin org (org_id) is the canonical RLS anchor and tenant boundary.
-- Lifecycle tracked via FK to lifecycle_states (POOL entity type rows seeded
-- in POOL-LIFECYCLE-SEED-001). No separate status column — lifecycle_state_id
-- is the authoritative state carrier (consistent with Trade model pattern).
-- -----------------------------------------------------------------------------
CREATE TABLE public.network_pools (
  -- ── Surrogate key ──────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant anchor (RLS owner) ─────────────────────────────────────────────
  -- Live FK to organizations.id; never nullable; determines RLS scope.
  -- This is the pool admin/owner org — the entity that created and manages the pool.
  org_id UUID NOT NULL,
  -- ── Pool identity ─────────────────────────────────────────────────────────
  -- Human-readable external reference, unique per org. Non-empty enforced by CHECK.
  pool_ref VARCHAR(100) NOT NULL,
  -- ── Commodity descriptor ──────────────────────────────────────────────────
  -- Category string (e.g., COTTON_YARN, GREY_FABRIC, POLYESTER_YARN).
  -- Free-form with non-empty enforcement.
  commodity_category VARCHAR(100) NOT NULL,
  -- ── Quantity target ───────────────────────────────────────────────────────
  -- Aggregate quantity the pool aims to procure. Must be positive.
  target_qty DECIMAL(18, 6) NOT NULL,
  -- Unit of measure for target_qty. Must match member declared_qty units.
  qty_unit VARCHAR(50) NOT NULL,
  -- ── Lifecycle state ───────────────────────────────────────────────────────
  -- FK to lifecycle_states(id). POOL entity type rows seeded separately.
  -- On UPDATE: NoAction (state machine controls valid transitions).
  lifecycle_state_id UUID NOT NULL,
  -- ── Timeline fields ───────────────────────────────────────────────────────
  open_at TIMESTAMPTZ NULL,
  -- when pool opens for member declarations
  close_at TIMESTAMPTZ NULL,
  -- when pool closes for new declarations
  allocated_at TIMESTAMPTZ NULL,
  -- when allocation was computed
  settled_at TIMESTAMPTZ NULL,
  -- when pool was fully settled
  -- ── Extension fields ──────────────────────────────────────────────────────
  metadata JSONB NULL,
  -- ── Actor ─────────────────────────────────────────────────────────────────
  created_by_user_id UUID NULL,
  -- ── Timestamps ────────────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Primary key ────────────────────────────────────────────────────────────
  CONSTRAINT network_pools_pkey PRIMARY KEY (id),
  -- ── FK: org_id → organizations ────────────────────────────────────────────
  CONSTRAINT network_pools_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
  -- ── FK: lifecycle_state_id → lifecycle_states ─────────────────────────────
  CONSTRAINT network_pools_lifecycle_state_id_fk FOREIGN KEY (lifecycle_state_id) REFERENCES public.lifecycle_states (id),
  -- ── Quantity guard ────────────────────────────────────────────────────────
  CONSTRAINT network_pools_target_qty_positive_check CHECK (target_qty > 0),
  -- ── Pool reference non-empty guard ────────────────────────────────────────
  CONSTRAINT network_pools_pool_ref_nonempty_check CHECK (length(trim(pool_ref)) > 0),
  -- ── Commodity category non-empty guard ────────────────────────────────────
  CONSTRAINT network_pools_commodity_category_nonempty_check CHECK (length(trim(commodity_category)) > 0),
  -- ── Unit non-empty guard ──────────────────────────────────────────────────
  CONSTRAINT network_pools_qty_unit_nonempty_check CHECK (length(trim(qty_unit)) > 0)
);
-- -----------------------------------------------------------------------------
-- §3  Unique Constraint: network_pools
-- One pool_ref per org — prevents duplicate pool references within same tenant.
-- -----------------------------------------------------------------------------
ALTER TABLE public.network_pools
ADD CONSTRAINT network_pools_org_pool_ref_unique UNIQUE (org_id, pool_ref);
-- -----------------------------------------------------------------------------
-- §4  Indexes: network_pools
-- -----------------------------------------------------------------------------
-- Tenant pool list (descending creation time)
CREATE INDEX idx_network_pools_org_created ON public.network_pools (org_id, created_at DESC);
-- Lifecycle state lookup
CREATE INDEX idx_network_pools_lifecycle_state ON public.network_pools (lifecycle_state_id);
-- Commodity category filter
CREATE INDEX idx_network_pools_commodity_category ON public.network_pools (commodity_category);
-- -----------------------------------------------------------------------------
-- §5  Create Table: network_pool_memberships
-- One membership record per (pool_id, org_id) — enforced by unique constraint.
-- org_id is the member org (RLS anchor). Pool owner is in network_pools.org_id.
-- Status: PENDING → APPROVED → ALLOCATED (or WITHDRAWN). No lifecycle_state_id
-- here — membership status is a simple domain enum, not a full state machine.
-- -----------------------------------------------------------------------------
CREATE TABLE public.network_pool_memberships (
  -- ── Surrogate key ──────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Pool reference ────────────────────────────────────────────────────────
  -- FK to network_pools(id) ON DELETE CASCADE — memberships removed with pool.
  pool_id UUID NOT NULL,
  -- ── Member organization (RLS anchor) ─────────────────────────────────────
  -- FK to organizations.id. Member sees only their own membership row.
  org_id UUID NOT NULL,
  -- ── Quantity fields ───────────────────────────────────────────────────────
  -- Declared quantity by the member for this pool. Must be positive.
  declared_qty DECIMAL(18, 6) NOT NULL,
  -- Unit of measure — must match network_pools.qty_unit.
  qty_unit VARCHAR(50) NOT NULL,
  -- Allocated quantity after pool allocation is computed. Null until allocated.
  allocated_qty DECIMAL(18, 6) NULL,
  -- Fractional allocation share (0.0000–1.0000). Null until computed.
  allocation_pct DECIMAL(5, 4) NULL,
  -- ── Membership status ─────────────────────────────────────────────────────
  -- Domain enforced by DB CHECK below.
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  -- ── Timeline fields ───────────────────────────────────────────────────────
  joined_at TIMESTAMPTZ NOT NULL,
  -- when org joined the pool
  approved_at TIMESTAMPTZ NULL,
  -- null until approved
  withdrawn_at TIMESTAMPTZ NULL,
  -- null unless withdrawn
  -- ── Timestamps ────────────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Primary key ────────────────────────────────────────────────────────────
  CONSTRAINT network_pool_memberships_pkey PRIMARY KEY (id),
  -- ── FK: pool_id → network_pools ───────────────────────────────────────────
  CONSTRAINT network_pool_memberships_pool_id_fk FOREIGN KEY (pool_id) REFERENCES public.network_pools (id) ON DELETE CASCADE,
  -- ── FK: org_id → organizations ────────────────────────────────────────────
  CONSTRAINT network_pool_memberships_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
  -- ── Status domain guard ───────────────────────────────────────────────────
  CONSTRAINT network_pool_memberships_status_check CHECK (
    status IN ('PENDING', 'APPROVED', 'WITHDRAWN', 'ALLOCATED')
  ),
  -- ── Quantity guards ───────────────────────────────────────────────────────
  CONSTRAINT network_pool_memberships_declared_qty_positive_check CHECK (declared_qty > 0),
  CONSTRAINT network_pool_memberships_allocated_qty_positive_check CHECK (
    allocated_qty IS NULL
    OR allocated_qty > 0
  ),
  -- ── Allocation percentage guard ───────────────────────────────────────────
  -- Stored as decimal fraction (0.0000 to 1.0000), not percentage (0–100).
  CONSTRAINT network_pool_memberships_allocation_pct_range_check CHECK (
    allocation_pct IS NULL
    OR (
      allocation_pct >= 0
      AND allocation_pct <= 1
    )
  ),
  -- ── Unit non-empty guard ──────────────────────────────────────────────────
  CONSTRAINT network_pool_memberships_qty_unit_nonempty_check CHECK (length(trim(qty_unit)) > 0)
);
-- -----------------------------------------------------------------------------
-- §6  Unique Constraint: network_pool_memberships
-- One membership per (pool_id, org_id) — one org cannot join the same pool twice.
-- -----------------------------------------------------------------------------
ALTER TABLE public.network_pool_memberships
ADD CONSTRAINT network_pool_memberships_pool_org_unique UNIQUE (pool_id, org_id);
-- -----------------------------------------------------------------------------
-- §7  Indexes: network_pool_memberships
-- -----------------------------------------------------------------------------
-- Pool membership list by status (approval / allocation workflow queries)
CREATE INDEX idx_network_pool_memberships_pool_status ON public.network_pool_memberships (pool_id, status);
-- Tenant membership list (member sees own memberships descending)
CREATE INDEX idx_network_pool_memberships_org_created ON public.network_pool_memberships (org_id, created_at DESC);
-- Status funnel
CREATE INDEX idx_network_pool_memberships_status ON public.network_pool_memberships (status);
-- -----------------------------------------------------------------------------
-- §8  Row-Level Security: network_pools
-- Tenant access scoped by app.org_id GUC (pool admin/owner only).
-- Control-plane access via app.is_admin GUC.
-- DELETE permanently blocked.
-- UPDATE allowed for tenant role (lifecycle transitions, metadata updates).
-- -----------------------------------------------------------------------------
ALTER TABLE public.network_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_pools FORCE ROW LEVEL SECURITY;
-- Tenant SELECT: must have org_id GUC set; scoped to own org
CREATE POLICY network_pools_tenant_select ON public.network_pools FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant INSERT: org_id in row must match GUC (prevents cross-tenant write)
CREATE POLICY network_pools_tenant_insert ON public.network_pools FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant UPDATE: org_id scoped; allows lifecycle transitions and metadata updates
CREATE POLICY network_pools_tenant_update ON public.network_pools FOR
UPDATE TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  ) WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- DELETE permanently blocked — pool audit trail must not be erased
CREATE POLICY network_pools_no_delete ON public.network_pools FOR DELETE TO texqtic_app USING (false);
-- Control-plane admin SELECT: requires app.is_admin GUC set to 'true'
CREATE POLICY network_pools_admin_select ON public.network_pools FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- -----------------------------------------------------------------------------
-- §9  Row-Level Security: network_pool_memberships
-- Tenant access scoped by app.org_id GUC (member org only — conservative).
-- Cross-member visibility (pool owner sees all members) deferred to a later packet.
-- Control-plane access via app.is_admin GUC.
-- DELETE permanently blocked.
-- UPDATE allowed for tenant role (status transitions, allocation updates).
-- -----------------------------------------------------------------------------
ALTER TABLE public.network_pool_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_pool_memberships FORCE ROW LEVEL SECURITY;
-- Tenant SELECT: member org sees only its own membership rows
CREATE POLICY network_pool_memberships_tenant_select ON public.network_pool_memberships FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant INSERT: org_id in row must match GUC
CREATE POLICY network_pool_memberships_tenant_insert ON public.network_pool_memberships FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant UPDATE: org_id scoped; allows membership status and allocation updates
CREATE POLICY network_pool_memberships_tenant_update ON public.network_pool_memberships FOR
UPDATE TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  ) WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- DELETE permanently blocked — membership audit trail must not be erased
CREATE POLICY network_pool_memberships_no_delete ON public.network_pool_memberships FOR DELETE TO texqtic_app USING (false);
-- Control-plane admin SELECT: requires app.is_admin GUC set to 'true'
CREATE POLICY network_pool_memberships_admin_select ON public.network_pool_memberships FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- -----------------------------------------------------------------------------
-- §10  Grants
-- Minimal privilege: app role gets SELECT + INSERT + UPDATE (no DELETE).
-- Admin role gets SELECT only (read-only control-plane view).
-- -----------------------------------------------------------------------------
GRANT SELECT,
  INSERT,
  UPDATE ON public.network_pools TO texqtic_app;
GRANT SELECT ON public.network_pools TO texqtic_admin;
GRANT SELECT,
  INSERT,
  UPDATE ON public.network_pool_memberships TO texqtic_app;
GRANT SELECT ON public.network_pool_memberships TO texqtic_admin;
COMMIT;