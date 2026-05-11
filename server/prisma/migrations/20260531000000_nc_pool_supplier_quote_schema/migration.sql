-- =============================================================================
-- TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001
-- Migration: nc_pool_supplier_quote_schema
-- Date:      2026-05-31
-- Summary:   Creates network_pool_rfq_supplier_quotes table.
--            Dual RLS anchor: owner_org_id (pool owner / buyer) and
--            supplier_org_id (quoting supplier).
--            Status: SUBMITTED | WITHDRAWN.
--            QD-2: UNIQUE(invite_id) — one quote per invite (non-partial).
--            QD-3: WITHDRAWN included; withdrawQuote deferred to Phase 1C.1/1D.
--            QD-7: Direct lifecycle log only; StateMachineService.transition() never called.
--            Decisions locked in:
--              TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DECISION-AUDIT-001
--              commit 2596862 (2026-05-11)
--            Parent design:
--              TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DESIGN-001
--              commit 900ea66
-- =============================================================================
-- §1  Pre-flight guard
-- §2  CREATE TABLE network_pool_rfq_supplier_quotes
-- §3  Unique constraints
-- §4  Indexes
-- §5  RLS — network_pool_rfq_supplier_quotes
-- §6  Grants
-- =============================================================================
-- §1 Pre-flight guard ---------------------------------------------------------
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_rfq_supplier_quotes'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_pool_rfq_supplier_quotes already exists — migration may have been applied already. Halting.';
END IF;
END $$;
-- §2 CREATE TABLE network_pool_rfq_supplier_quotes ---------------------------
CREATE TABLE public.network_pool_rfq_supplier_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── RLS anchors ────────────────────────────────────────────────────────────
  owner_org_id UUID NOT NULL,
  -- pool owner (buyer org); primary RLS anchor; denormalized from invite
  supplier_org_id UUID NOT NULL,
  -- quoting supplier org; secondary RLS anchor; denormalized from invite
  -- ── Context FKs ────────────────────────────────────────────────────────────
  rfq_id UUID NOT NULL,
  -- FK → network_pool_rfqs(id)   ON DELETE CASCADE; denormalized from invite
  pool_id UUID NOT NULL,
  -- denormalized FK → network_pools(id)  ON DELETE CASCADE; mirrors invite
  invite_id UUID NOT NULL,
  -- FK → network_pool_rfq_supplier_invites(id) ON DELETE CASCADE; primary anchor
  -- ── Identity ───────────────────────────────────────────────────────────────
  quote_ref VARCHAR(100) NOT NULL,
  -- service-generated UUID-derived ref; unique; non-empty
  -- ── Status ─────────────────────────────────────────────────────────────────
  -- QD-3: WITHDRAWN in enum even though withdrawQuote deferred to Phase 1C.1/1D
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
  -- ── Quote values ───────────────────────────────────────────────────────────
  quote_amount DECIMAL(18, 2) NOT NULL,
  -- aggregate quote value; DB CHECK: > 0
  currency VARCHAR(10) NOT NULL,
  -- ISO 4217 currency code; non-empty enforced by DB CHECK
  -- ── Timing / optional ──────────────────────────────────────────────────────
  validity_until TIMESTAMPTZ,
  -- optional quote validity window; not enforced in Phase 1C (QD-3)
  supplier_note TEXT,
  -- optional note from supplier to owner
  submitted_at TIMESTAMPTZ NOT NULL,
  -- timestamp of quote submission; set by service
  submitted_by_user_id UUID,
  -- nullable; actor user (QD-4: no FK; validated at service layer only)
  -- ── Withdrawal fields (Q-3 carry-forward) ──────────────────────────────────
  withdrawn_at TIMESTAMPTZ,
  -- set when status transitions to WITHDRAWN (Phase 1C.1+)
  withdraw_reason TEXT,
  -- optional supplier-provided reason on withdrawal
  -- ── Internal ───────────────────────────────────────────────────────────────
  metadata_internal_json JSONB,
  -- internal ops metadata; NEVER exposed to suppliers (QD-5)
  -- ── Timestamps ─────────────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Primary key ────────────────────────────────────────────────────────────
  CONSTRAINT nc_pool_rfq_supplier_quotes_pkey PRIMARY KEY (id),
  -- ── Foreign keys ───────────────────────────────────────────────────────────
  CONSTRAINT nc_pool_rfq_supplier_quotes_owner_org_id_fk FOREIGN KEY (owner_org_id) REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_supplier_quotes_supplier_org_id_fk FOREIGN KEY (supplier_org_id) REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_supplier_quotes_rfq_id_fk FOREIGN KEY (rfq_id) REFERENCES public.network_pool_rfqs(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_supplier_quotes_pool_id_fk FOREIGN KEY (pool_id) REFERENCES public.network_pools(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_supplier_quotes_invite_id_fk FOREIGN KEY (invite_id) REFERENCES public.network_pool_rfq_supplier_invites(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  -- ── Check constraints ──────────────────────────────────────────────────────
  -- QD-3: WITHDRAWN included in enum despite withdrawQuote being deferred
  CONSTRAINT nc_pool_rfq_supplier_quotes_status_check CHECK (status IN ('SUBMITTED', 'WITHDRAWN')),
  CONSTRAINT nc_pool_rfq_supplier_quotes_quote_amount_positive_check CHECK (quote_amount > 0),
  CONSTRAINT nc_pool_rfq_supplier_quotes_quote_ref_nonempty_check CHECK (length(trim(quote_ref)) > 0),
  CONSTRAINT nc_pool_rfq_supplier_quotes_currency_nonempty_check CHECK (length(trim(currency)) > 0)
);
-- §3 Unique constraints -------------------------------------------------------
-- QD-2: One quote per invite — non-partial UNIQUE(invite_id)
ALTER TABLE public.network_pool_rfq_supplier_quotes
ADD CONSTRAINT nc_pool_rfq_supplier_quotes_invite_unique UNIQUE (invite_id);
ALTER TABLE public.network_pool_rfq_supplier_quotes
ADD CONSTRAINT nc_pool_rfq_supplier_quotes_quote_ref_unique UNIQUE (quote_ref);
-- §4 Indexes ------------------------------------------------------------------
-- Primary query patterns: by invite, by rfq, by pool, by owner, by supplier, by status
CREATE INDEX idx_nc_pool_rfq_supplier_quotes_invite_id ON public.network_pool_rfq_supplier_quotes (invite_id);
CREATE INDEX idx_nc_pool_rfq_supplier_quotes_rfq_id ON public.network_pool_rfq_supplier_quotes (rfq_id);
CREATE INDEX idx_nc_pool_rfq_supplier_quotes_pool_id ON public.network_pool_rfq_supplier_quotes (pool_id);
CREATE INDEX idx_nc_pool_rfq_supplier_quotes_owner_org_id ON public.network_pool_rfq_supplier_quotes (owner_org_id, created_at DESC);
CREATE INDEX idx_nc_pool_rfq_supplier_quotes_supplier_org_id ON public.network_pool_rfq_supplier_quotes (supplier_org_id, created_at DESC);
CREATE INDEX idx_nc_pool_rfq_supplier_quotes_status ON public.network_pool_rfq_supplier_quotes (status);
CREATE INDEX idx_nc_pool_rfq_supplier_quotes_submitted_at ON public.network_pool_rfq_supplier_quotes (submitted_at DESC);
CREATE INDEX idx_nc_pool_rfq_supplier_quotes_created_at ON public.network_pool_rfq_supplier_quotes (created_at DESC);
-- §5 RLS — network_pool_rfq_supplier_quotes -----------------------------------
ALTER TABLE public.network_pool_rfq_supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_pool_rfq_supplier_quotes FORCE ROW LEVEL SECURITY;
-- Supplier: read own quotes (secondary RLS anchor — supplier_org_id)
CREATE POLICY nc_pool_rfq_supplier_quotes_supplier_select ON public.network_pool_rfq_supplier_quotes FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND supplier_org_id::text = current_setting('app.org_id', true)
  );
-- Owner: read quotes for own RFQs (primary RLS anchor — owner_org_id)
-- NOTE: Enabled now for schema completeness; owner read route deferred to Phase 1D (Q-4).
CREATE POLICY nc_pool_rfq_supplier_quotes_owner_select ON public.network_pool_rfq_supplier_quotes FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Supplier: insert own quotes (secondary RLS anchor — supplier_org_id)
CREATE POLICY nc_pool_rfq_supplier_quotes_supplier_insert ON public.network_pool_rfq_supplier_quotes FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND supplier_org_id::text = current_setting('app.org_id', true)
  );
-- Supplier: update own quotes (for future withdrawQuote — Phase 1C.1/1D)
CREATE POLICY nc_pool_rfq_supplier_quotes_supplier_update ON public.network_pool_rfq_supplier_quotes FOR
UPDATE TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND supplier_org_id::text = current_setting('app.org_id', true)
  );
-- No delete ever (quotes are permanent audit records)
CREATE POLICY nc_pool_rfq_supplier_quotes_no_delete ON public.network_pool_rfq_supplier_quotes FOR DELETE TO texqtic_app USING (false);
-- Control-plane read-only
CREATE POLICY nc_pool_rfq_supplier_quotes_admin_select ON public.network_pool_rfq_supplier_quotes FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- §6 Grants -------------------------------------------------------------------
GRANT SELECT,
  INSERT,
  UPDATE ON public.network_pool_rfq_supplier_quotes TO texqtic_app;
GRANT SELECT ON public.network_pool_rfq_supplier_quotes TO texqtic_admin;