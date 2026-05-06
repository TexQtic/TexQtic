-- =============================================================================
-- Migration: 20260521000000_nc_network_invoices
-- Task:      TEXQTIC-NC-PHASE1-INVOICE-FOUNDATION-001
-- Purpose:   Create standalone network_invoices table for Network Commerce.
--            Implements Phase 0 Validation Report Option B (separate table,
--            NOT an extension of the existing `invoices` table).
--            Covers invoice types: POOL_ORDER | SYNDICATE_EXECUTION | VCO_DELIVERY.
--            No dependency on trades.table — polymorphic NC entity reference only.
-- Authority: Authorized by TEXQTIC-NC-PHASE1-INVOICE-FOUNDATION-001 packet.
-- DB Role:   texqtic_app (tenant), texqtic_admin (control-plane)
-- RLS:       org_id isolation (app.org_id GUC); admin via app.is_admin GUC
-- Immutability: DELETE blocked via RLS USING false.
--              UPDATE allowed (status transitions); audit trail deferred to
--              NetworkLifecycleLog in later packets.
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- §1  Pre-flight Guard
-- Prevents re-running this migration if network_invoices already exists.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_invoices'
) THEN RAISE NOTICE 'network_invoices already exists — migration skipped.';
RETURN;
END IF;
END;
$$;
-- ─────────────────────────────────────────────────────────────────────────────
-- §2  Create Table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.network_invoices (
  -- ── Surrogate key ─────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant anchor (RLS owner) ──────────────────────────────────────────────
  -- Live FK to organizations.id; never nullable; determines RLS scope.
  org_id UUID NOT NULL,
  -- ── Invoice type discriminant ──────────────────────────────────────────────
  -- Domain of valid values enforced by DB CHECK below.
  -- POOL_ORDER: issued for a Collective Procurement Pool purchase order
  -- SYNDICATE_EXECUTION: issued for a lot execution within a supplier syndicate
  -- VCO_DELIVERY: issued for a VCO stage delivery handoff
  invoice_type VARCHAR(50) NOT NULL,
  -- ── Polymorphic NC entity reference ───────────────────────────────────────
  -- SOFT REFERENCE: no FK enforced — NC entity tables (pools, syndicates,
  -- vco_chains) land in later packets. Type discriminant guards insertion.
  network_entity_type VARCHAR(50) NOT NULL,
  network_entity_id UUID NOT NULL,
  -- ── Invoice identity ───────────────────────────────────────────────────────
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NULL,
  -- ── Monetary fields ────────────────────────────────────────────────────────
  -- currency: ISO 4217 code (INR, USD, EUR …)
  currency VARCHAR(10) NOT NULL,
  -- gross_amount must be positive (enforced by DB CHECK)
  gross_amount DECIMAL(18, 6) NOT NULL,
  -- ── Party fields ───────────────────────────────────────────────────────────
  -- issuer_org_id: the organization issuing this invoice (may equal org_id)
  issuer_org_id UUID NOT NULL,
  -- payer_org_id: the organization obligated to pay (nullable at DRAFT stage)
  payer_org_id UUID NULL,
  -- recipient_org_id: the organization receiving goods/services (nullable early)
  recipient_org_id UUID NULL,
  -- ── Invoice status ─────────────────────────────────────────────────────────
  -- Lifecycle state of the invoice; transitions deferred to Phase 1 LC packet.
  -- Initial value is always DRAFT.
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  -- ── Supporting document ────────────────────────────────────────────────────
  document_url VARCHAR(1000) NULL,
  -- ── Free-form fields ──────────────────────────────────────────────────────
  notes TEXT NULL,
  metadata JSONB NULL,
  -- ── Actor ─────────────────────────────────────────────────────────────────
  created_by_user_id UUID NULL,
  -- ── Timestamps ────────────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Primary key ────────────────────────────────────────────────────────────
  CONSTRAINT network_invoices_pkey PRIMARY KEY (id),
  -- ── Invoice type domain guard ─────────────────────────────────────────────
  -- Restricts invoice_type to known NC invoice types.
  CONSTRAINT network_invoices_invoice_type_check CHECK (
    invoice_type IN (
      'POOL_ORDER',
      'SYNDICATE_EXECUTION',
      'VCO_DELIVERY'
    )
  ),
  -- ── NC entity type domain guard ───────────────────────────────────────────
  -- network_entity_type must correspond to a known NC module entity.
  CONSTRAINT network_invoices_network_entity_type_check CHECK (
    network_entity_type IN ('POOL', 'SYNDICATE', 'VCO_CHAIN')
  ),
  -- ── Invoice type ↔ entity type coherence ─────────────────────────────────
  -- Enforces that invoice type maps to the correct NC entity type:
  --   POOL_ORDER          → network_entity_type = 'POOL'
  --   SYNDICATE_EXECUTION → network_entity_type = 'SYNDICATE'
  --   VCO_DELIVERY        → network_entity_type = 'VCO_CHAIN'
  CONSTRAINT network_invoices_type_entity_coherence_check CHECK (
    (
      invoice_type = 'POOL_ORDER'
      AND network_entity_type = 'POOL'
    )
    OR (
      invoice_type = 'SYNDICATE_EXECUTION'
      AND network_entity_type = 'SYNDICATE'
    )
    OR (
      invoice_type = 'VCO_DELIVERY'
      AND network_entity_type = 'VCO_CHAIN'
    )
  ),
  -- ── Status domain guard ───────────────────────────────────────────────────
  CONSTRAINT network_invoices_status_check CHECK (
    status IN (
      'DRAFT',
      'SUBMITTED',
      'VERIFIED',
      'SETTLED',
      'CANCELLED',
      'DISPUTED'
    )
  ),
  -- ── Monetary amount guard ─────────────────────────────────────────────────
  CONSTRAINT network_invoices_gross_amount_positive_check CHECK (gross_amount > 0),
  -- ── Invoice number non-empty guard ────────────────────────────────────────
  CONSTRAINT network_invoices_invoice_number_nonempty_check CHECK (length(trim(invoice_number)) > 0),
  -- ── FK: org_id → organizations ────────────────────────────────────────────
  CONSTRAINT network_invoices_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE
);
-- ─────────────────────────────────────────────────────────────────────────────
-- §3  Unique Constraint
-- Scoped uniqueness: one invoice number per (org, type, entity type, entity).
-- Prevents duplicate invoice numbers within the same NC entity context.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.network_invoices
ADD CONSTRAINT network_invoices_org_type_entity_number_unique UNIQUE (
    org_id,
    invoice_type,
    network_entity_type,
    network_entity_id,
    invoice_number
  );
-- ─────────────────────────────────────────────────────────────────────────────
-- §4  Indexes
-- ─────────────────────────────────────────────────────────────────────────────
-- Tenant invoice list (descending creation time)
CREATE INDEX idx_network_invoices_org_created ON public.network_invoices (org_id, created_at DESC);
-- Issuer cross-reference
CREATE INDEX idx_network_invoices_issuer_org ON public.network_invoices (issuer_org_id);
-- Entity-scoped lookup (joins, admin cross-tenant admin queries)
CREATE INDEX idx_network_invoices_entity ON public.network_invoices (network_entity_type, network_entity_id);
-- Status funnel (workflow queries)
CREATE INDEX idx_network_invoices_status ON public.network_invoices (status);
-- ─────────────────────────────────────────────────────────────────────────────
-- §5  Row-Level Security
-- Tenant access scoped by app.org_id GUC.
-- Control-plane access via app.is_admin GUC.
-- DELETE permanently blocked (financial audit trail must be preserved).
-- UPDATE allowed for tenant role (status transitions, corrections).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.network_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_invoices FORCE ROW LEVEL SECURITY;
-- Tenant SELECT: must have org_id GUC set; scoped to own org
CREATE POLICY network_invoices_tenant_select ON public.network_invoices FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant INSERT: org_id in row must match GUC (prevents cross-tenant write)
CREATE POLICY network_invoices_tenant_insert ON public.network_invoices FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant UPDATE: org_id scoped; allows status transitions and corrections
CREATE POLICY network_invoices_tenant_update ON public.network_invoices FOR
UPDATE TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  ) WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- DELETE permanently blocked — financial audit trail must not be erased
CREATE POLICY network_invoices_no_delete ON public.network_invoices FOR DELETE TO texqtic_app USING (false);
-- Control-plane admin SELECT: requires app.is_admin GUC set to 'true'
CREATE POLICY network_invoices_admin_select ON public.network_invoices FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- ─────────────────────────────────────────────────────────────────────────────
-- §6  Grants
-- Minimal privilege: app role gets SELECT + INSERT + UPDATE (no DELETE).
-- Admin role gets SELECT only (read-only control-plane view).
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT,
  INSERT,
  UPDATE ON public.network_invoices TO texqtic_app;
GRANT SELECT ON public.network_invoices TO texqtic_admin;
COMMIT;