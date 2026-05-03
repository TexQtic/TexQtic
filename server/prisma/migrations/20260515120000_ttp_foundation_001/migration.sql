-- ============================================================================
-- TTP-FOUNDATION-001: TexQtic TradeTrust Pay — Slice 1 Foundation Schema
-- Task ID:    TTP-FOUNDATION-001
-- Doctrine:   v1.4 + TTP Design Doc TEXQTIC-TRADETRUST-PAY-DESIGN-001.md
-- Date:       2026-05-15
-- Gate:       Slice 1 (Schema Foundation Only — no routes, no services)
-- Author:     TexQtic Platform Engineering (Safe-Write Mode)
--
-- INVARIANTS (constitutional, non-negotiable)
--   - ADDITIVE ONLY. No existing tables are dropped or columns removed.
--   - FORCE RLS on every new table.
--   - NO balance/amount aggregation columns anywhere (D-020-B).
--   - NO settlement table. NO PSP/CIBIL live-API tables.
--   - ttp_enabled feature flag is seeded as FALSE (kill-switch, off by default).
--   - lifecycle states and allowed_transitions seeded as reference data.
--   - ai_triggered boolean on log tables — D-020-C boundary marker.
--   - trade.escrow_id stays OPTIONAL (not touched here).
--   - buyer_org_id added to invoices (OQ-TTP-004: buyer approval view in Slice 4).
--
-- OBJECTS CREATED / ALTERED (by section)
--   §0  PRE-FLIGHT safety checks
--   §1  ALTER TABLE feature_flags — ADD COLUMN value TEXT NULL
--   §2  EXTEND lifecycle_states.entity_type CHECK → add INVOICE, VPC
--   §3  EXTEND allowed_transitions.entity_type CHECK → add INVOICE, VPC
--   §4  TABLE   public.invoices
--   §5  INDEXES on invoices
--   §6  TRIGGER  updated_at on invoices
--   §7  RLS + GRANTS on invoices
--   §8  TABLE   public.invoice_lifecycle_logs (append-only)
--   §9  INDEXES on invoice_lifecycle_logs
--   §10 IMMUTABILITY TRIGGER on invoice_lifecycle_logs
--   §11 RLS + GRANTS on invoice_lifecycle_logs
--   §12 TABLE   public.gst_verifications
--   §13 INDEXES on gst_verifications
--   §14 TRIGGER  updated_at on gst_verifications
--   §15 RLS + GRANTS on gst_verifications
--   §16 TABLE   public.ttp_eligibility_assessments
--   §17 INDEXES on ttp_eligibility_assessments
--   §18 TRIGGER  updated_at on ttp_eligibility_assessments
--   §19 RLS + GRANTS on ttp_eligibility_assessments
--   §20 TABLE   public.verified_payable_certificates
--   §21 INDEXES on verified_payable_certificates
--   §22 TRIGGER  updated_at on verified_payable_certificates
--   §23 RLS + GRANTS on verified_payable_certificates
--   §24 TABLE   public.partner_routing_stubs
--   §25 INDEXES on partner_routing_stubs
--   §26 TRIGGER  updated_at on partner_routing_stubs
--   §27 RLS + GRANTS on partner_routing_stubs
--   §28 TABLE   public.ttp_enrollment_logs (append-only)
--   §29 INDEXES on ttp_enrollment_logs
--   §30 IMMUTABILITY TRIGGER on ttp_enrollment_logs
--   §31 RLS + GRANTS on ttp_enrollment_logs
--   §32 SEEDS: INVOICE lifecycle states
--   §33 SEEDS: VPC lifecycle states
--   §34 SEEDS: INVOICE allowed_transitions
--   §35 SEEDS: VPC allowed_transitions
--   §36 SEEDS: feature_flags (TTP kill-switch + numeric caps)
--   §37 VERIFY inline post-flight
--
-- Rollback summary (in reverse order):
--   Truncate seeds: DELETE FROM public.allowed_transitions WHERE entity_type IN ('INVOICE','VPC');
--   Truncate seeds: DELETE FROM public.lifecycle_states WHERE entity_type IN ('INVOICE','VPC');
--   DELETE FROM public.feature_flags WHERE key LIKE 'ttp_%';
--   DROP TABLE public.ttp_enrollment_logs;
--   DROP TABLE public.partner_routing_stubs;
--   DROP TABLE public.verified_payable_certificates;
--   DROP TABLE public.ttp_eligibility_assessments;
--   DROP TABLE public.gst_verifications;
--   DROP TABLE public.invoice_lifecycle_logs;
--   DROP TABLE public.invoices;
--   Restore entity_type CHECKs (drop + re-add without INVOICE/VPC).
--   ALTER TABLE public.feature_flags DROP COLUMN IF EXISTS value;
-- ============================================================================
-- ============================================================================
-- §0  PRE-FLIGHT SAFETY CHECK
--     Abort early if prerequisites are absent or migration already applied.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$ BEGIN -- Require public.organizations (G-015 prerequisite)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'organizations'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 PRE-FLIGHT BLOCKED: public.organizations does not exist. Apply G-015 migration first.';
END IF;
-- Require public.trades (G-017 prerequisite)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'trades'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 PRE-FLIGHT BLOCKED: public.trades does not exist. Apply G-017 migration first.';
END IF;
-- Require public.lifecycle_states (G-020 prerequisite)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'lifecycle_states'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 PRE-FLIGHT BLOCKED: public.lifecycle_states does not exist. Apply G-020 migration first.';
END IF;
-- Require public.allowed_transitions (G-020 prerequisite)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'allowed_transitions'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 PRE-FLIGHT BLOCKED: public.allowed_transitions does not exist. Apply G-020 migration first.';
END IF;
-- Require public.feature_flags (init prerequisite)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'feature_flags'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 PRE-FLIGHT BLOCKED: public.feature_flags does not exist. Apply init migration first.';
END IF;
-- Require public.document_extraction_drafts (TECS-AI-DOC prerequisite)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'document_extraction_drafts'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 PRE-FLIGHT BLOCKED: public.document_extraction_drafts does not exist. Apply tecs_document_extraction_drafts migration first.';
END IF;
-- Idempotency guard: abort if already applied
IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'invoices'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 PRE-FLIGHT BLOCKED: public.invoices already exists. Migration 20260515120000_ttp_foundation_001 may already be applied.';
END IF;
RAISE NOTICE 'TTP-FOUNDATION-001 pre-flight OK: all prerequisites present; invoices absent. Proceeding.';
END;
$$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  ALTER TABLE feature_flags — ADD COLUMN value TEXT NULL
--
--   Rationale: The TTP domain requires numeric feature flags
--   (invoice amount caps per risk tier, maker-checker thresholds,
--   assessment validity days). The current feature_flags schema has
--   only an enabled (BOOLEAN) column. A TEXT value column is added
--   to hold stringly-typed numeric values for non-boolean flags.
--   Boolean flags retain value = NULL.
--   Service layer is responsible for parsing TEXT → number.
--   ADDITIVE: existing rows unaffected (value = NULL by default).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.feature_flags
ADD COLUMN IF NOT EXISTS value TEXT NULL;
COMMENT ON COLUMN public.feature_flags.value IS 'Optional typed value for non-boolean feature flags. Numeric flags store decimal string representation (e.g. ''250000''). Boolean flags leave this NULL and use the enabled column only. Service layer parses TEXT → number. Introduced in TTP-FOUNDATION-001.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  EXTEND lifecycle_states.entity_type CHECK → add INVOICE, VPC
--
--   Current constraint (after GAP-ORDER-LC-001): TRADE | ESCROW | CERTIFICATION | ORDER
--   New constraint: adds INVOICE and VPC.
--   Strategy: DROP named constraint + ADD new constraint (reversible,
--   unlike ALTER TYPE ADD VALUE on an enum).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.lifecycle_states DROP CONSTRAINT IF EXISTS lifecycle_states_entity_type_check;
ALTER TABLE public.lifecycle_states
ADD CONSTRAINT lifecycle_states_entity_type_check CHECK (
    entity_type = ANY (
      ARRAY [
      'TRADE'::text,
      'ESCROW'::text,
      'CERTIFICATION'::text,
      'ORDER'::text,
      'INVOICE'::text,
      'VPC'::text
    ]
    )
  );
COMMENT ON CONSTRAINT lifecycle_states_entity_type_check ON public.lifecycle_states IS 'TTP-FOUNDATION-001: Extended from TRADE|ESCROW|CERTIFICATION|ORDER to include INVOICE and VPC entity types for TradeTrust Pay domain.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  EXTEND allowed_transitions.entity_type CHECK → add INVOICE, VPC
--
--   Same DROP + recreate approach as §2.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.allowed_transitions DROP CONSTRAINT IF EXISTS allowed_transitions_entity_type_check;
ALTER TABLE public.allowed_transitions
ADD CONSTRAINT allowed_transitions_entity_type_check CHECK (
    entity_type = ANY (
      ARRAY [
      'TRADE'::text,
      'ESCROW'::text,
      'CERTIFICATION'::text,
      'ORDER'::text,
      'INVOICE'::text,
      'VPC'::text
    ]
    )
  );
COMMENT ON CONSTRAINT allowed_transitions_entity_type_check ON public.allowed_transitions IS 'TTP-FOUNDATION-001: Extended from TRADE|ESCROW|CERTIFICATION|ORDER to include INVOICE and VPC entity types for TradeTrust Pay domain.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §4  TABLE: public.invoices
--
--   Represents a trade invoice submitted by a seller org for TTP processing.
--   RLS boundary: org_id (seller org). buyer_org_id stored for OQ-TTP-004
--   buyer approval view (SELECT policy extension deferred to Slice 4).
--
--   Design constraints:
--   - trade_id NOT NULL: every TTP invoice must be anchored to a trade.
--   - gross_amount > 0: DB CHECK (D-020-B: no balance, per-invoice amount only).
--   - currency: 3–10 chars (ISO 4217 + platform variants like 'INR').
--   - lifecycle_state_id → lifecycle_states(id): entity_type='INVOICE' enforced
--     by service layer (StateMachineService). No cross-table CHECK feasible.
--   - extraction_draft_id: optional link to AI document extraction draft.
--   - buyer_org_id: denormalized from trade.buyer_org_id for RLS and buyer view.
--     OQ-TTP-004: buyer approval route uses this for entitlement in Slice 4.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.invoices (
  -- ── Identity ─────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant / RLS boundary (seller org) ───────────────────────────────
  org_id UUID NOT NULL,
  -- ── Buyer org (OQ-TTP-004: for buyer approval view in Slice 4) ───────
  buyer_org_id UUID NOT NULL,
  -- ── Trade linkage (mandatory anchor) ─────────────────────────────────
  trade_id UUID NOT NULL,
  -- ── Invoice identification ───────────────────────────────────────────
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NULL,
  -- ── Financial fields (no balance — D-020-B) ──────────────────────────
  currency VARCHAR(10) NOT NULL,
  gross_amount DECIMAL(18, 6) NOT NULL,
  -- ── Lifecycle alignment (G-020) ──────────────────────────────────────
  lifecycle_state_id UUID NOT NULL,
  -- ── Optional document / AI linkage ───────────────────────────────────
  document_url VARCHAR(1000) NULL,
  extraction_draft_id UUID NULL,
  -- ── Freeform notes ───────────────────────────────────────────────────
  notes TEXT NULL,
  -- ── Attribution ──────────────────────────────────────────────────────
  created_by_user_id UUID NULL,
  -- ── Timestamps ───────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Constraints ──────────────────────────────────────────────────────
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_gross_amount_positive CHECK (gross_amount > 0),
  CONSTRAINT invoices_currency_length CHECK (
    char_length(currency) BETWEEN 3 AND 10
  ),
  CONSTRAINT invoices_invoice_number_nonempty CHECK (invoice_number <> ''),
  -- FK: seller org
  CONSTRAINT invoices_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION,
  -- FK: buyer org
  CONSTRAINT invoices_buyer_org_id_fk FOREIGN KEY (buyer_org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION,
  -- FK: trade
  CONSTRAINT invoices_trade_id_fk FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  -- FK: lifecycle state
  CONSTRAINT invoices_lifecycle_state_id_fk FOREIGN KEY (lifecycle_state_id) REFERENCES public.lifecycle_states(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  -- FK: AI extraction draft (optional)
  CONSTRAINT invoices_extraction_draft_id_fk FOREIGN KEY (extraction_draft_id) REFERENCES public.document_extraction_drafts(id) ON DELETE
  SET NULL ON UPDATE NO ACTION,
    -- FK: creating user (optional)
    CONSTRAINT invoices_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE
  SET NULL ON UPDATE NO ACTION
);
COMMENT ON TABLE public.invoices IS 'TTP-FOUNDATION-001: Seller-submitted trade invoices for TradeTrust Pay processing. org_id = seller RLS boundary. buyer_org_id denormalized for Slice 4 buyer approval view (OQ-TTP-004). No balance column (D-020-B). lifecycle_state_id entity_type must be INVOICE (enforced by service layer / StateMachineService)';
COMMENT ON COLUMN public.invoices.org_id IS 'Seller org_id. RLS boundary. Must match the authenticated session org_id on INSERT.';
COMMENT ON COLUMN public.invoices.buyer_org_id IS 'Buyer org_id — denormalized from trade.buyer_org_id at insert time. Used in Slice 4 buyer approval route entitlement (OQ-TTP-004). SELECT policy extension for buyer arm deferred to Slice 4.';
COMMENT ON COLUMN public.invoices.gross_amount IS 'Per-invoice declared payable amount. Always > 0 (CHECK constraint). D-020-B: This is a point-in-time declared amount, NOT a running balance. Service layer validates gross_amount <= trade.gross_amount.';
COMMENT ON COLUMN public.invoices.lifecycle_state_id IS 'FK to lifecycle_states(id). Service layer MUST supply a row with entity_type = ''INVOICE''. Cross-table CHECK not feasible; enforcement is StateMachineService responsibility.';
COMMENT ON COLUMN public.invoices.extraction_draft_id IS 'Optional FK to document_extraction_drafts. Links AI-extracted document data to the invoice for human review gate (D-020-C)';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §5  INDEXES on public.invoices
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Unique: one invoice_number per seller org per trade
-- Prevents duplicate invoice registration by the same seller for the same trade.
CREATE UNIQUE INDEX invoices_org_trade_number_unique ON public.invoices (org_id, trade_id, invoice_number);
-- RLS-aligned primary lookup: seller's invoices sorted by creation time
CREATE INDEX idx_invoices_org_created ON public.invoices (org_id, created_at DESC);
-- Buyer org index for Slice 4 buyer approval view (OQ-TTP-004)
CREATE INDEX idx_invoices_buyer_org_created ON public.invoices (buyer_org_id, created_at DESC);
-- Trade linkage: find all invoices for a trade
CREATE INDEX idx_invoices_trade_id ON public.invoices (trade_id);
-- Lifecycle state: ops queries — find all invoices in a given state
CREATE INDEX idx_invoices_lifecycle_state_id ON public.invoices (lifecycle_state_id);
COMMENT ON INDEX public.invoices_org_trade_number_unique IS 'TTP-FOUNDATION-001: Prevents duplicate invoice_number per seller org per trade. A seller may register the same invoice_number for different trades.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §6  TRIGGER: updated_at maintenance on public.invoices
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.invoices_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.invoices_set_updated_at() IS 'TTP-FOUNDATION-001: Maintains updated_at on public.invoices on BEFORE UPDATE. Follows G-017/G-018 pattern.';
DROP TRIGGER IF EXISTS trg_invoices_set_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_set_updated_at BEFORE
UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.invoices_set_updated_at();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §7  RLS + GRANTS on public.invoices
--
--   Three-policy pattern:
--     1. RESTRICTIVE guard (ALL)   — fail-closed; must have org context or admin
--     2. PERMISSIVE SELECT         — seller sees own rows; admin sees all
--     3. PERMISSIVE INSERT         — seller can insert own rows (+ bypass for seeds)
--
--   No tenant UPDATE/DELETE policies: lifecycle changes via service layer only.
--   Buyer SELECT arm (OQ-TTP-004) deferred to Slice 4.
--   texqtic_app: SELECT + INSERT only.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_guard ON public.invoices;
CREATE POLICY invoices_guard ON public.invoices AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
DROP POLICY IF EXISTS invoices_select_unified ON public.invoices;
CREATE POLICY invoices_select_unified ON public.invoices AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS invoices_insert_unified ON public.invoices;
CREATE POLICY invoices_insert_unified ON public.invoices AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
GRANT SELECT,
  INSERT ON public.invoices TO texqtic_app;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §8  TABLE: public.invoice_lifecycle_logs (append-only)
--
--   Immutable audit log for all invoice lifecycle state transitions.
--   Mirrors trade_lifecycle_logs / escrow_lifecycle_logs patterns.
--   Enforced append-only at three layers:
--     Layer 1: Service layer (InvoiceService — no update/delete path)
--     Layer 2: DB trigger (§10: BEFORE UPDATE OR DELETE → RAISE)
--     Layer 3: RLS (UPDATE/DELETE USING false)
--   org_id: RLS boundary (seller org, denormalized from invoice).
--   ai_triggered: D-020-C boundary marker — AI-generated entries MUST have
--     reason prefixed 'HUMAN_CONFIRMED:' (service layer enforces).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.invoice_lifecycle_logs (
  -- ── Identity ─────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant / RLS boundary (denormalized from invoice.org_id) ─────────
  org_id UUID NOT NULL,
  -- ── Invoice linkage ──────────────────────────────────────────────────
  invoice_id UUID NOT NULL,
  -- ── State transition ─────────────────────────────────────────────────
  from_state_key VARCHAR(100) NULL,
  -- NULL on initial DRAFT → first transition
  to_state_key VARCHAR(100) NOT NULL,
  -- ── Actor attribution (D-020-A / D-020-D) ────────────────────────────
  actor_user_id UUID NULL,
  -- set for TENANT_USER / TENANT_ADMIN actors
  actor_admin_id UUID NULL,
  -- set for PLATFORM_ADMIN actors
  actor_type VARCHAR(50) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  -- ── Governance metadata ───────────────────────────────────────────────
  escalation_level INTEGER NULL,
  maker_user_id UUID NULL,
  checker_user_id UUID NULL,
  ai_triggered BOOLEAN NOT NULL DEFAULT false,
  -- D-020-C
  impersonation_id UUID NULL,
  -- ── Audit trail ──────────────────────────────────────────────────────
  reason TEXT NOT NULL,
  request_id VARCHAR(200) NULL,
  -- ── Immutable wall-clock timestamp ───────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Constraints ──────────────────────────────────────────────────────
  CONSTRAINT invoice_lifecycle_logs_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_lifecycle_logs_to_state_nonempty CHECK (to_state_key <> ''),
  CONSTRAINT invoice_lifecycle_logs_reason_nonempty CHECK (reason <> ''),
  CONSTRAINT invoice_lifecycle_logs_actor_type_nonempty CHECK (actor_type <> ''),
  -- FK: org
  CONSTRAINT invoice_lifecycle_logs_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION,
  -- FK: invoice (cascade delete — if invoice is deleted, lose its log too)
  CONSTRAINT invoice_lifecycle_logs_invoice_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE ON UPDATE NO ACTION
);
COMMENT ON TABLE public.invoice_lifecycle_logs IS 'TTP-FOUNDATION-001: Append-only audit log for invoice lifecycle transitions. Three-layer immutability: service + trigger (§10) + RLS UPDATE/DELETE USING false. org_id denormalized from invoice for RLS scoping. D-020-C: ai_triggered=true requires reason prefixed HUMAN_CONFIRMED: (service enforced)';
COMMENT ON COLUMN public.invoice_lifecycle_logs.ai_triggered IS 'D-020-C: Set true only when the transition was initiated by an AI component. When true, reason MUST be prefixed with ''HUMAN_CONFIRMED:'' (service layer enforces). Human-initiated transitions always set ai_triggered=false.';
COMMENT ON COLUMN public.invoice_lifecycle_logs.reason IS 'Mandatory justification. Non-empty enforced by CHECK constraint. D-020-C: If ai_triggered=true, must begin with ''HUMAN_CONFIRMED:''. Corrections must be new rows with reason: ''CORRECTION OF LOG_ID <uuid>''.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §9  INDEXES on public.invoice_lifecycle_logs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_invoice_lifecycle_logs_invoice_created ON public.invoice_lifecycle_logs (invoice_id, created_at DESC);
CREATE INDEX idx_invoice_lifecycle_logs_org_created ON public.invoice_lifecycle_logs (org_id, created_at DESC);
CREATE INDEX idx_invoice_lifecycle_logs_to_state_created ON public.invoice_lifecycle_logs (to_state_key, created_at DESC);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §10 IMMUTABILITY TRIGGER on public.invoice_lifecycle_logs
--     Layer 2 of three-layer append-only enforcement.
--     Fires BEFORE UPDATE OR DELETE — unconditional, no override path.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.prevent_invoice_lifecycle_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'INVOICE_LIFECYCLE_LOG_IMMUTABLE: invoice_lifecycle_logs rows are append-only. UPDATE and DELETE are unconditionally prohibited. TTP-FOUNDATION-001 Layer 2 enforcement. No override path exists. Corrections must be new INSERT rows with reason: CORRECTION OF LOG_ID <uuid>.' USING ERRCODE = 'P0001';
END;
$$;
COMMENT ON FUNCTION public.prevent_invoice_lifecycle_log_mutation() IS 'TTP-FOUNDATION-001 Layer 2: Unconditional immutability backstop for invoice_lifecycle_logs. Fires BEFORE UPDATE OR DELETE. Raises SQLSTATE P0001. Cannot be bypassed without dropping trigger.';
DROP TRIGGER IF EXISTS trg_invoice_lifecycle_log_immutable ON public.invoice_lifecycle_logs;
CREATE TRIGGER trg_invoice_lifecycle_log_immutable BEFORE
UPDATE
  OR DELETE ON public.invoice_lifecycle_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_invoice_lifecycle_log_mutation();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §11 RLS + GRANTS on public.invoice_lifecycle_logs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.invoice_lifecycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lifecycle_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_lifecycle_logs_guard ON public.invoice_lifecycle_logs;
CREATE POLICY invoice_lifecycle_logs_guard ON public.invoice_lifecycle_logs AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
DROP POLICY IF EXISTS invoice_lifecycle_logs_select_unified ON public.invoice_lifecycle_logs;
CREATE POLICY invoice_lifecycle_logs_select_unified ON public.invoice_lifecycle_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS invoice_lifecycle_logs_insert_unified ON public.invoice_lifecycle_logs;
CREATE POLICY invoice_lifecycle_logs_insert_unified ON public.invoice_lifecycle_logs AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- UPDATE permanently blocked (Layer 3 of append-only enforcement)
DROP POLICY IF EXISTS invoice_lifecycle_logs_update_block ON public.invoice_lifecycle_logs;
CREATE POLICY invoice_lifecycle_logs_update_block ON public.invoice_lifecycle_logs AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (false);
-- DELETE permanently blocked (Layer 3 of append-only enforcement)
DROP POLICY IF EXISTS invoice_lifecycle_logs_delete_block ON public.invoice_lifecycle_logs;
CREATE POLICY invoice_lifecycle_logs_delete_block ON public.invoice_lifecycle_logs AS PERMISSIVE FOR DELETE TO texqtic_app USING (false);
GRANT SELECT,
  INSERT ON public.invoice_lifecycle_logs TO texqtic_app;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §12 TABLE: public.gst_verifications
--
--   One row per org (UNIQUE on org_id). Captures GST registration data
--   submitted for TTP onboarding gate.
--   Phase 1: manual capture + admin review only. No live GSTIN API calls.
--   Phase 2 stub: raw_verification_json will hold API response.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.gst_verifications (
  -- ── Identity ─────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant / RLS boundary ────────────────────────────────────────────
  org_id UUID NOT NULL,
  -- ── GST registration data ─────────────────────────────────────────────
  gstin VARCHAR(20) NOT NULL,
  legal_name_on_gst VARCHAR(500) NOT NULL,
  state_code VARCHAR(10) NOT NULL,
  registration_type VARCHAR(50) NOT NULL,
  -- ACTIVE | CANCELLED | SUSPENDED | UNKNOWN
  filing_status VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
  -- ── Submission ───────────────────────────────────────────────────────
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Admin review ─────────────────────────────────────────────────────
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by_admin_id UUID NULL,
  -- APPROVED | REJECTED | NEEDS_MORE_INFO
  review_outcome VARCHAR(30) NULL,
  review_notes TEXT NULL,
  -- ── Structured API payload (Phase 1: manual doc; Phase 2: API resp) ──
  raw_verification_json JSONB NOT NULL DEFAULT '{}',
  -- ── Timestamps ───────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Constraints ──────────────────────────────────────────────────────
  CONSTRAINT gst_verifications_pkey PRIMARY KEY (id),
  -- One GST verification per org
  CONSTRAINT gst_verifications_org_id_unique UNIQUE (org_id),
  CONSTRAINT gst_verifications_gstin_nonempty CHECK (gstin <> ''),
  CONSTRAINT gst_verifications_legal_name_nonempty CHECK (legal_name_on_gst <> ''),
  CONSTRAINT gst_verifications_filing_status_check CHECK (
    filing_status IN ('ACTIVE', 'CANCELLED', 'SUSPENDED', 'UNKNOWN')
  ),
  CONSTRAINT gst_verifications_review_outcome_check CHECK (
    review_outcome IS NULL
    OR review_outcome IN ('APPROVED', 'REJECTED', 'NEEDS_MORE_INFO')
  ),
  -- FK: org
  CONSTRAINT gst_verifications_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION
);
COMMENT ON TABLE public.gst_verifications IS 'TTP-FOUNDATION-001: GST verification records for TTP onboarding gate (one per org). Phase 1: manual submission + admin review. Phase 2: live GSTIN API stub. UNIQUE(org_id): one active GST verification per organization.';
COMMENT ON COLUMN public.gst_verifications.gstin IS 'GSTIN (15-char GST registration number). Service layer validates format. No DB regex to allow future validation rule changes without migration.';
COMMENT ON COLUMN public.gst_verifications.raw_verification_json IS 'Phase 1: stores manually uploaded document metadata. Phase 2: will hold GSTIN API verification response. Default empty JSONB.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §13 INDEXES on public.gst_verifications
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_gst_verifications_org_id ON public.gst_verifications (org_id);
CREATE INDEX idx_gst_verifications_gstin ON public.gst_verifications (gstin);
CREATE INDEX idx_gst_verifications_review_outcome ON public.gst_verifications (review_outcome)
WHERE review_outcome IS NOT NULL;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §14 TRIGGER: updated_at maintenance on public.gst_verifications
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.gst_verifications_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_gst_verifications_set_updated_at ON public.gst_verifications;
CREATE TRIGGER trg_gst_verifications_set_updated_at BEFORE
UPDATE ON public.gst_verifications FOR EACH ROW EXECUTE FUNCTION public.gst_verifications_set_updated_at();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §15 RLS + GRANTS on public.gst_verifications
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.gst_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_verifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gst_verifications_guard ON public.gst_verifications;
CREATE POLICY gst_verifications_guard ON public.gst_verifications AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
DROP POLICY IF EXISTS gst_verifications_select_unified ON public.gst_verifications;
CREATE POLICY gst_verifications_select_unified ON public.gst_verifications AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS gst_verifications_insert_unified ON public.gst_verifications;
CREATE POLICY gst_verifications_insert_unified ON public.gst_verifications AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
GRANT SELECT,
  INSERT ON public.gst_verifications TO texqtic_app;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §16 TABLE: public.ttp_eligibility_assessments
--
--   Per-org eligibility assessment records for TTP. Audit trail for
--   admin-assigned risk tier + max invoice amount caps.
--   Phase 1: MANUAL assessment_type only. No live bureau API calls.
--   latest row (MAX assessed_at per org) = operative assessment.
--   valid_until: NULL = indefinite (OQ-TTP-005).
--   max_invoice_amount: per-invoice cap derived from risk_tier.
--     Tier 0 (thin-file): 0 cap — MANUAL_REVIEW required.
--     Tier 1: ≤ 250000 INR (FeatureFlag-backed cap, OQ-TTP-001).
--     Tier 2: ≤ 500000 INR.
--     Tier 3: ≤ 1000000 INR.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.ttp_eligibility_assessments (
  -- ── Identity ─────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant / RLS boundary ────────────────────────────────────────────
  org_id UUID NOT NULL,
  -- ── Assessment metadata ───────────────────────────────────────────────
  -- MANUAL | BUREAU_API (Phase 2 extension — no migration needed for new value)
  assessment_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  -- 0=thin-file/manual-review; 1=low; 2=medium; 3=high
  risk_tier SMALLINT NOT NULL DEFAULT 0,
  -- ELIGIBLE | INELIGIBLE | MANUAL_REVIEW
  eligibility_outcome VARCHAR(30) NOT NULL,
  -- Per-invoice cap based on risk_tier. Null = no cap determined yet.
  max_invoice_amount DECIMAL(18, 6) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  -- ── Timing ───────────────────────────────────────────────────────────
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NULL,
  -- NULL = indefinite (OQ-TTP-005)
  -- ── Admin attribution ────────────────────────────────────────────────
  assessed_by_admin_id UUID NULL,
  assessment_notes TEXT NULL,
  -- ── Bureau payload (Phase 1: manual doc; Phase 2: bureau response) ───
  raw_bureau_json JSONB NOT NULL DEFAULT '{}',
  -- ── Timestamps ───────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Constraints ──────────────────────────────────────────────────────
  CONSTRAINT ttp_eligibility_assessments_pkey PRIMARY KEY (id),
  CONSTRAINT ttp_eligibility_assessments_risk_tier_range CHECK (
    risk_tier BETWEEN 0 AND 3
  ),
  CONSTRAINT ttp_eligibility_assessments_outcome_check CHECK (
    eligibility_outcome IN ('ELIGIBLE', 'INELIGIBLE', 'MANUAL_REVIEW')
  ),
  CONSTRAINT ttp_eligibility_assessments_currency_length CHECK (
    char_length(currency) BETWEEN 3 AND 10
  ),
  CONSTRAINT ttp_eligibility_assessments_max_amount_nonneg CHECK (
    max_invoice_amount IS NULL
    OR max_invoice_amount >= 0
  ),
  -- FK: org
  CONSTRAINT ttp_eligibility_assessments_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION
);
COMMENT ON TABLE public.ttp_eligibility_assessments IS 'TTP-FOUNDATION-001: Admin-assigned risk tier + invoice cap assessments per org. Append semantics: latest row (MAX assessed_at per org) = operative assessment. Phase 1: MANUAL only. Phase 2: BUREAU_API stub. valid_until = NULL means indefinite (OQ-TTP-005). risk_tier 0 = thin-file / MANUAL_REVIEW required. Tiers 1-3 = eligible with caps.';
COMMENT ON COLUMN public.ttp_eligibility_assessments.risk_tier IS 'OQ-TTP-001: 0=thin-file (cap=0, MANUAL_REVIEW required); 1=low (cap=ttp_max_invoice_amount_tier_1_inr); 2=medium (cap=ttp_max_invoice_amount_tier_2_inr); 3=high (cap=ttp_max_invoice_amount_tier_3_inr). Caps are FeatureFlag-backed.';
COMMENT ON COLUMN public.ttp_eligibility_assessments.valid_until IS 'OQ-TTP-005: Assessment expiry. NULL = indefinite (no automated expiry in Phase 1). Default validity period: ttp_eligibility_assessment_validity_days feature flag (180 days default). Admin-triggered reassessment only in Phase 1.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §17 INDEXES on public.ttp_eligibility_assessments
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Most-recent assessment per org (operative assessment lookup)
CREATE INDEX idx_ttp_eligibility_org_assessed ON public.ttp_eligibility_assessments (org_id, assessed_at DESC);
-- Find assessments expiring soon (ops monitoring)
CREATE INDEX idx_ttp_eligibility_valid_until ON public.ttp_eligibility_assessments (valid_until)
WHERE valid_until IS NOT NULL;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §18 TRIGGER: updated_at maintenance on public.ttp_eligibility_assessments
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.ttp_eligibility_assessments_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ttp_eligibility_assessments_set_updated_at ON public.ttp_eligibility_assessments;
CREATE TRIGGER trg_ttp_eligibility_assessments_set_updated_at BEFORE
UPDATE ON public.ttp_eligibility_assessments FOR EACH ROW EXECUTE FUNCTION public.ttp_eligibility_assessments_set_updated_at();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §19 RLS + GRANTS on public.ttp_eligibility_assessments
--
--   Admin-only write path (assessments are created/updated by admins).
--   Tenant SELECT: see own org's assessment (for eligibility status display).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.ttp_eligibility_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttp_eligibility_assessments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ttp_eligibility_assessments_guard ON public.ttp_eligibility_assessments;
CREATE POLICY ttp_eligibility_assessments_guard ON public.ttp_eligibility_assessments AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
DROP POLICY IF EXISTS ttp_eligibility_assessments_select_unified ON public.ttp_eligibility_assessments;
CREATE POLICY ttp_eligibility_assessments_select_unified ON public.ttp_eligibility_assessments AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS ttp_eligibility_assessments_insert_unified ON public.ttp_eligibility_assessments;
CREATE POLICY ttp_eligibility_assessments_insert_unified ON public.ttp_eligibility_assessments AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
GRANT SELECT,
  INSERT ON public.ttp_eligibility_assessments TO texqtic_app;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §20 TABLE: public.verified_payable_certificates
--
--   VPC: trust signal per invoice. NOT a payment instrument.
--   Anchors: invoice_id (UNIQUE 1:1), trade_id, seller org, buyer org.
--   Generated only when Invoice is VERIFIED + org eligibility confirmed.
--   lifecycle_state_id → lifecycle_states(id): entity_type='VPC' enforced
--     by service layer.
--   expires_at: optional TTL (OQ-TTP-002). NULL = no expiry in Phase 1.
--   risk_tier 0 (thin-file) is NOT eligible for VPC generation (CHECK).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.verified_payable_certificates (
  -- ── Identity ─────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant / RLS boundary (seller org) ───────────────────────────────
  org_id UUID NOT NULL,
  -- ── Core linkages ────────────────────────────────────────────────────
  invoice_id UUID NOT NULL,
  -- 1:1 with invoice
  trade_id UUID NOT NULL,
  buyer_org_id UUID NOT NULL,
  seller_org_id UUID NOT NULL,
  -- ── VPC identification ───────────────────────────────────────────────
  vpc_reference VARCHAR(100) NOT NULL,
  -- VPC-YYYYMMDD-XXXX
  -- ── Financial snapshot (read-only point-in-time) ──────────────────────
  currency VARCHAR(10) NOT NULL,
  invoice_amount DECIMAL(18, 6) NOT NULL,
  -- ── Risk tier (inherited from eligibility assessment) ─────────────────
  risk_tier SMALLINT NOT NULL,
  -- 1–3 only (0 not eligible)
  -- ── Lifecycle alignment (G-020; entity_type='VPC') ───────────────────
  lifecycle_state_id UUID NOT NULL,
  -- ── VPC timing ───────────────────────────────────────────────────────
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  -- OQ-TTP-002: optional TTL
  voided_at TIMESTAMPTZ NULL,
  void_reason TEXT NULL,
  -- ── Partner routing eligibility flag ──────────────────────────────────
  -- Set true only by admin action; not automatically derived.
  partner_routing_eligible BOOLEAN NOT NULL DEFAULT false,
  -- ── Attribution ──────────────────────────────────────────────────────
  created_by_admin_id UUID NULL,
  -- ── Timestamps ───────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Constraints ──────────────────────────────────────────────────────
  CONSTRAINT verified_payable_certificates_pkey PRIMARY KEY (id),
  -- One VPC per invoice
  CONSTRAINT vpc_invoice_id_unique UNIQUE (invoice_id),
  -- Platform-generated reference must be globally unique
  CONSTRAINT vpc_reference_unique UNIQUE (vpc_reference),
  CONSTRAINT vpc_invoice_amount_positive CHECK (invoice_amount > 0),
  CONSTRAINT vpc_currency_length CHECK (
    char_length(currency) BETWEEN 3 AND 10
  ),
  -- risk_tier 0 (thin-file) is NOT eligible for VPC generation
  CONSTRAINT vpc_risk_tier_min_one CHECK (
    risk_tier BETWEEN 1 AND 3
  ),
  CONSTRAINT vpc_reference_nonempty CHECK (vpc_reference <> ''),
  -- voided_at and void_reason: both NULL or both set
  CONSTRAINT vpc_void_coherence CHECK (
    (
      voided_at IS NULL
      AND void_reason IS NULL
    )
    OR (
      voided_at IS NOT NULL
      AND void_reason IS NOT NULL
    )
  ),
  -- FK: seller org (RLS boundary)
  CONSTRAINT vpc_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION,
  -- FK: invoice (RESTRICT — VPC cannot exist if invoice is deleted without cleanup)
  CONSTRAINT vpc_invoice_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  -- FK: trade
  CONSTRAINT vpc_trade_id_fk FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  -- FK: buyer org
  CONSTRAINT vpc_buyer_org_id_fk FOREIGN KEY (buyer_org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION,
  -- FK: seller org (explicit, for buyer/seller display)
  CONSTRAINT vpc_seller_org_id_fk FOREIGN KEY (seller_org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION,
  -- FK: lifecycle state
  CONSTRAINT vpc_lifecycle_state_id_fk FOREIGN KEY (lifecycle_state_id) REFERENCES public.lifecycle_states(id) ON DELETE RESTRICT ON UPDATE NO ACTION
);
COMMENT ON TABLE public.verified_payable_certificates IS 'TTP-FOUNDATION-001: Verified Payable Certificate (VPC) — trust signal per invoice. NOT a payment instrument. NOT a negotiable instrument. Read-only trust signal. invoice_id UNIQUE: one VPC per invoice. org_id = seller RLS boundary. risk_tier CHECK (1-3): tier 0 (thin-file) is constitutionally ineligible for VPC. expires_at = NULL in Phase 1 (OQ-TTP-002). partner_routing_eligible=false until admin action.';
COMMENT ON COLUMN public.verified_payable_certificates.invoice_amount IS 'D-020-B: Point-in-time snapshot of invoice gross_amount at VPC issuance. NOT a running balance. NOT modifiable after issuance.';
COMMENT ON COLUMN public.verified_payable_certificates.expires_at IS 'OQ-TTP-002: Optional VPC TTL. NULL in Phase 1 (no automated expiry). Will be populated in Slice 3 or later when VPC lifecycle management is built.';
COMMENT ON COLUMN public.verified_payable_certificates.partner_routing_eligible IS 'Set true only by explicit admin action. NOT automatically derived from lifecycle. Phase 1: always false until admin enables partner routing for this VPC.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §21 INDEXES on public.verified_payable_certificates
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_vpc_org_id ON public.verified_payable_certificates (org_id);
CREATE INDEX idx_vpc_trade_id ON public.verified_payable_certificates (trade_id);
CREATE INDEX idx_vpc_buyer_org_id ON public.verified_payable_certificates (buyer_org_id);
CREATE INDEX idx_vpc_lifecycle_state_id ON public.verified_payable_certificates (lifecycle_state_id);
CREATE INDEX idx_vpc_org_issued ON public.verified_payable_certificates (org_id, issued_at DESC);
-- Partner routing ops: find routing-eligible VPCs
CREATE INDEX idx_vpc_routing_eligible ON public.verified_payable_certificates (partner_routing_eligible)
WHERE partner_routing_eligible = true;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §22 TRIGGER: updated_at on public.verified_payable_certificates
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.verified_payable_certificates_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_vpc_set_updated_at ON public.verified_payable_certificates;
CREATE TRIGGER trg_vpc_set_updated_at BEFORE
UPDATE ON public.verified_payable_certificates FOR EACH ROW EXECUTE FUNCTION public.verified_payable_certificates_set_updated_at();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §23 RLS + GRANTS on public.verified_payable_certificates
--
--   Seller sees own VPCs (org_id = seller).
--   Buyer SELECT for VPC approval view (OQ-TTP-004 boundary):
--     buyer_org_id = app.current_org_id() — buyer can read their VPCs.
--   Admin: full read.
--   No tenant UPDATE/DELETE (lifecycle changes via service layer).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.verified_payable_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_payable_certificates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vpc_guard ON public.verified_payable_certificates;
CREATE POLICY vpc_guard ON public.verified_payable_certificates AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
DROP POLICY IF EXISTS vpc_select_unified ON public.verified_payable_certificates;
CREATE POLICY vpc_select_unified ON public.verified_payable_certificates AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    -- Seller sees own VPCs
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    ) -- Buyer sees VPCs where they are the buyer (OQ-TTP-004)
    OR (
      app.require_org_context()
      AND buyer_org_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS vpc_insert_unified ON public.verified_payable_certificates;
CREATE POLICY vpc_insert_unified ON public.verified_payable_certificates AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
GRANT SELECT,
  INSERT ON public.verified_payable_certificates TO texqtic_app;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §24 TABLE: public.partner_routing_stubs
--
--   Read-only data contract payload for finance partner routing.
--   Phase 1: generated and stored; transmitted_at = NULL (NOT transmitted).
--   Phase 2: webhook/API call to partner endpoint.
--   One VPC may have multiple routing stubs (different partner types).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.partner_routing_stubs (
  -- ── Identity ─────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant / RLS boundary ────────────────────────────────────────────
  org_id UUID NOT NULL,
  -- ── VPC linkage ──────────────────────────────────────────────────────
  vpc_id UUID NOT NULL,
  -- ── Partner metadata ─────────────────────────────────────────────────
  -- NBFC_STUB | BANK_STUB | FACTORING_STUB
  partner_type VARCHAR(50) NOT NULL DEFAULT 'NBFC_STUB',
  -- Structured data contract payload (Section 12 of design doc)
  payload_json JSONB NOT NULL DEFAULT '{}',
  payload_version VARCHAR(10) NOT NULL DEFAULT '1.0',
  -- ── Transmission state ───────────────────────────────────────────────
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transmitted_at TIMESTAMPTZ NULL,
  -- NULL in Phase 1
  -- PENDING | TRANSMITTED | FAILED
  transmission_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  response_json JSONB NOT NULL DEFAULT '{}',
  -- ── Timestamps ───────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Constraints ──────────────────────────────────────────────────────
  CONSTRAINT partner_routing_stubs_pkey PRIMARY KEY (id),
  CONSTRAINT partner_routing_stubs_partner_type_check CHECK (
    partner_type IN ('NBFC_STUB', 'BANK_STUB', 'FACTORING_STUB')
  ),
  CONSTRAINT partner_routing_stubs_transmission_status_check CHECK (
    transmission_status IN ('PENDING', 'TRANSMITTED', 'FAILED')
  ),
  -- FK: org
  CONSTRAINT partner_routing_stubs_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION,
  -- FK: VPC
  CONSTRAINT partner_routing_stubs_vpc_id_fk FOREIGN KEY (vpc_id) REFERENCES public.verified_payable_certificates(id) ON DELETE CASCADE ON UPDATE NO ACTION
);
COMMENT ON TABLE public.partner_routing_stubs IS 'TTP-FOUNDATION-001: Finance partner routing data contract stubs per VPC. Phase 1: generated and stored; transmitted_at = NULL (NOT sent to partners). Phase 2: active webhook/API transmission. transmission_status=PENDING in Phase 1.';
COMMENT ON COLUMN public.partner_routing_stubs.transmitted_at IS 'Phase 1: ALWAYS NULL. Setting this to non-NULL requires explicit Phase 2 approval. Service layer enforces transmitted_at = NULL in Phase 1.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §25 INDEXES on public.partner_routing_stubs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_partner_routing_stubs_org_id ON public.partner_routing_stubs (org_id);
CREATE INDEX idx_partner_routing_stubs_vpc_id ON public.partner_routing_stubs (vpc_id);
CREATE INDEX idx_partner_routing_stubs_status ON public.partner_routing_stubs (transmission_status, created_at DESC);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §26 TRIGGER: updated_at on public.partner_routing_stubs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.partner_routing_stubs_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_partner_routing_stubs_set_updated_at ON public.partner_routing_stubs;
CREATE TRIGGER trg_partner_routing_stubs_set_updated_at BEFORE
UPDATE ON public.partner_routing_stubs FOR EACH ROW EXECUTE FUNCTION public.partner_routing_stubs_set_updated_at();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §27 RLS + GRANTS on public.partner_routing_stubs
--
--   Admin-only INSERT (partner routing stubs are platform-generated).
--   Tenant SELECT: own org's stubs (for status display).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.partner_routing_stubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_routing_stubs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS partner_routing_stubs_guard ON public.partner_routing_stubs;
CREATE POLICY partner_routing_stubs_guard ON public.partner_routing_stubs AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
DROP POLICY IF EXISTS partner_routing_stubs_select_unified ON public.partner_routing_stubs;
CREATE POLICY partner_routing_stubs_select_unified ON public.partner_routing_stubs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS partner_routing_stubs_insert_unified ON public.partner_routing_stubs;
CREATE POLICY partner_routing_stubs_insert_unified ON public.partner_routing_stubs AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
GRANT SELECT,
  INSERT ON public.partner_routing_stubs TO texqtic_app;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §28 TABLE: public.ttp_enrollment_logs (append-only)
--
--   Audit log for TTP enrollment state changes per tenant org.
--   TTP enrollment state is stored in FeatureFlag / TenantFeatureOverride
--   (existing mechanism). This table provides the immutable audit trail.
--   ai_triggered: D-020-C boundary marker.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.ttp_enrollment_logs (
  -- ── Identity ─────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant / RLS boundary ────────────────────────────────────────────
  org_id UUID NOT NULL,
  -- ── Enrollment state transition ───────────────────────────────────────
  from_state VARCHAR(50) NULL,
  -- NULL on initial enrollment
  to_state VARCHAR(50) NOT NULL,
  -- ── Actor attribution ────────────────────────────────────────────────
  actor_type VARCHAR(50) NOT NULL,
  actor_id UUID NULL,
  -- ── Audit trail ──────────────────────────────────────────────────────
  reason TEXT NOT NULL,
  ai_triggered BOOLEAN NOT NULL DEFAULT false,
  -- D-020-C
  -- ── Immutable wall-clock timestamp ───────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Constraints ──────────────────────────────────────────────────────
  CONSTRAINT ttp_enrollment_logs_pkey PRIMARY KEY (id),
  CONSTRAINT ttp_enrollment_logs_to_state_nonempty CHECK (to_state <> ''),
  CONSTRAINT ttp_enrollment_logs_reason_nonempty CHECK (reason <> ''),
  CONSTRAINT ttp_enrollment_logs_actor_type_nonempty CHECK (actor_type <> ''),
  -- FK: org
  CONSTRAINT ttp_enrollment_logs_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION
);
COMMENT ON TABLE public.ttp_enrollment_logs IS 'TTP-FOUNDATION-001: Append-only audit log for TTP enrollment state changes per org. TTP enrollment operative state is in FeatureFlag/TenantFeatureOverride (ttp_enabled). This table is the immutable enrollment trail. D-020-C: ai_triggered marker.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §29 INDEXES on public.ttp_enrollment_logs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_ttp_enrollment_logs_org_created ON public.ttp_enrollment_logs (org_id, created_at DESC);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §30 IMMUTABILITY TRIGGER on public.ttp_enrollment_logs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.prevent_ttp_enrollment_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TTP_ENROLLMENT_LOG_IMMUTABLE: ttp_enrollment_logs rows are append-only. UPDATE and DELETE are unconditionally prohibited. TTP-FOUNDATION-001 Layer 2 enforcement. No override path exists.' USING ERRCODE = 'P0001';
END;
$$;
DROP TRIGGER IF EXISTS trg_ttp_enrollment_log_immutable ON public.ttp_enrollment_logs;
CREATE TRIGGER trg_ttp_enrollment_log_immutable BEFORE
UPDATE
  OR DELETE ON public.ttp_enrollment_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_ttp_enrollment_log_mutation();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §31 RLS + GRANTS on public.ttp_enrollment_logs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.ttp_enrollment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttp_enrollment_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ttp_enrollment_logs_guard ON public.ttp_enrollment_logs;
CREATE POLICY ttp_enrollment_logs_guard ON public.ttp_enrollment_logs AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
DROP POLICY IF EXISTS ttp_enrollment_logs_select_unified ON public.ttp_enrollment_logs;
CREATE POLICY ttp_enrollment_logs_select_unified ON public.ttp_enrollment_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS ttp_enrollment_logs_insert_unified ON public.ttp_enrollment_logs;
CREATE POLICY ttp_enrollment_logs_insert_unified ON public.ttp_enrollment_logs AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
-- UPDATE permanently blocked (append-only enforcement Layer 3)
DROP POLICY IF EXISTS ttp_enrollment_logs_update_block ON public.ttp_enrollment_logs;
CREATE POLICY ttp_enrollment_logs_update_block ON public.ttp_enrollment_logs AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (false);
-- DELETE permanently blocked (append-only enforcement Layer 3)
DROP POLICY IF EXISTS ttp_enrollment_logs_delete_block ON public.ttp_enrollment_logs;
CREATE POLICY ttp_enrollment_logs_delete_block ON public.ttp_enrollment_logs AS PERMISSIVE FOR DELETE TO texqtic_app USING (false);
GRANT SELECT,
  INSERT ON public.ttp_enrollment_logs TO texqtic_app;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §32 SEEDS: INVOICE lifecycle states
--
--   state_key uppercase enforced by lifecycle_states_state_key_uppercase CHECK.
--   severity_level: 0=routine, 1=notable, 2=significant, 3=high, 4=critical.
--   Terminal + irreversible states: INELIGIBLE, WITHDRAWN, EXPIRED, SUPERSEDED.
--   VERIFIED is NOT terminal (can be SUPERSEDED by a corrected invoice).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.lifecycle_states (
    entity_type,
    state_key,
    is_terminal,
    is_irreversible,
    severity_level,
    requires_maker_checker,
    description
  )
VALUES (
    'INVOICE',
    'DRAFT',
    false,
    false,
    0,
    false,
    'Invoice created by seller; not yet submitted for review.'
  ),
  (
    'INVOICE',
    'SUBMITTED',
    false,
    false,
    0,
    false,
    'Invoice submitted for platform verification. Awaiting admin review.'
  ),
  (
    'INVOICE',
    'UNDER_REVIEW',
    false,
    false,
    1,
    false,
    'Invoice under active admin review. Maker-checker may be required for high-value invoices.'
  ),
  (
    'INVOICE',
    'VERIFIED',
    false,
    false,
    0,
    true,
    'Invoice verified by platform. Eligible for VPC generation if org is also eligible. Not terminal: can be superseded by a corrected invoice.'
  ),
  (
    'INVOICE',
    'INELIGIBLE',
    true,
    true,
    2,
    false,
    'Invoice rejected as ineligible for TTP processing. Terminal and irreversible.'
  ),
  (
    'INVOICE',
    'DISPUTED',
    false,
    false,
    2,
    false,
    'Invoice under dispute. Raised by buyer or seller. Awaiting resolution.'
  ),
  (
    'INVOICE',
    'WITHDRAWN',
    true,
    true,
    1,
    false,
    'Invoice withdrawn by seller or admin. Terminal and irreversible.'
  ),
  (
    'INVOICE',
    'EXPIRED',
    true,
    true,
    1,
    false,
    'Invoice expired without resolution (system automation). Terminal and irreversible.'
  ),
  (
    'INVOICE',
    'SUPERSEDED',
    true,
    false,
    1,
    false,
    'Invoice superseded by a corrected invoice. Terminal. Not irreversible (supersession may itself be superseded only by admin override).'
  ) ON CONFLICT DO NOTHING;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §33 SEEDS: VPC lifecycle states
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.lifecycle_states (
    entity_type,
    state_key,
    is_terminal,
    is_irreversible,
    severity_level,
    requires_maker_checker,
    description
  )
VALUES (
    'VPC',
    'ACTIVE',
    false,
    false,
    0,
    false,
    'VPC issued and active. Eligible for partner routing when partner_routing_eligible=true.'
  ),
  (
    'VPC',
    'ROUTING_READY',
    false,
    false,
    0,
    false,
    'VPC approved for partner routing by admin. Awaiting transmission (Phase 2).'
  ),
  (
    'VPC',
    'TRANSMITTED',
    true,
    true,
    0,
    false,
    'VPC data contract transmitted to finance partner. Terminal and irreversible.'
  ),
  (
    'VPC',
    'VOIDED',
    true,
    true,
    2,
    false,
    'VPC voided by admin (e.g., invoice dispute, fraud signal). Terminal and irreversible.'
  ),
  (
    'VPC',
    'EXPIRED',
    true,
    true,
    1,
    false,
    'VPC expired (TTL reached per expires_at). Terminal and irreversible (OQ-TTP-002).'
  ) ON CONFLICT DO NOTHING;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §34 SEEDS: INVOICE allowed_transitions
--
--   allowed_actor_type values: TENANT_USER | TENANT_ADMIN | PLATFORM_ADMIN
--   | SYSTEM_AUTOMATION | MAKER | CHECKER
--   Composite FKs to lifecycle_states(entity_type, state_key) enforced by DB.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.allowed_transitions (
    entity_type,
    from_state_key,
    to_state_key,
    allowed_actor_type,
    requires_maker_checker,
    requires_escalation
  )
VALUES -- DRAFT → SUBMITTED: seller submits invoice
  (
    'INVOICE',
    'DRAFT',
    'SUBMITTED',
    ARRAY ['TENANT_USER', 'TENANT_ADMIN'],
    false,
    false
  ),
  -- SUBMITTED → UNDER_REVIEW: admin picks up for review
  (
    'INVOICE',
    'SUBMITTED',
    'UNDER_REVIEW',
    ARRAY ['PLATFORM_ADMIN', 'TENANT_ADMIN'],
    false,
    false
  ),
  -- UNDER_REVIEW → VERIFIED: admin verifies (OQ-TTP-003: MC for high-value)
  (
    'INVOICE',
    'UNDER_REVIEW',
    'VERIFIED',
    ARRAY ['PLATFORM_ADMIN'],
    true,
    false
  ),
  -- UNDER_REVIEW → INELIGIBLE: admin rejects as ineligible
  (
    'INVOICE',
    'UNDER_REVIEW',
    'INELIGIBLE',
    ARRAY ['PLATFORM_ADMIN'],
    false,
    false
  ),
  -- SUBMITTED → DISPUTED: buyer or seller raises dispute
  (
    'INVOICE',
    'SUBMITTED',
    'DISPUTED',
    ARRAY ['TENANT_USER', 'TENANT_ADMIN'],
    false,
    false
  ),
  -- UNDER_REVIEW → DISPUTED: buyer or seller raises dispute during review
  (
    'INVOICE',
    'UNDER_REVIEW',
    'DISPUTED',
    ARRAY ['TENANT_USER', 'TENANT_ADMIN'],
    false,
    false
  ),
  -- VERIFIED → SUPERSEDED: admin supersedes with corrected invoice
  (
    'INVOICE',
    'VERIFIED',
    'SUPERSEDED',
    ARRAY ['PLATFORM_ADMIN'],
    false,
    false
  ),
  -- DISPUTED → UNDER_REVIEW: admin re-opens after dispute resolution
  (
    'INVOICE',
    'DISPUTED',
    'UNDER_REVIEW',
    ARRAY ['PLATFORM_ADMIN'],
    false,
    false
  ),
  -- INELIGIBLE → UNDER_REVIEW: admin allows reconsideration
  (
    'INVOICE',
    'INELIGIBLE',
    'UNDER_REVIEW',
    ARRAY ['PLATFORM_ADMIN'],
    false,
    false
  ),
  -- Any non-terminal → WITHDRAWN: seller or admin withdraws invoice
  (
    'INVOICE',
    'DRAFT',
    'WITHDRAWN',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  (
    'INVOICE',
    'SUBMITTED',
    'WITHDRAWN',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  (
    'INVOICE',
    'UNDER_REVIEW',
    'WITHDRAWN',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  (
    'INVOICE',
    'DISPUTED',
    'WITHDRAWN',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- Any non-terminal → EXPIRED: system automation (clock-based)
  (
    'INVOICE',
    'SUBMITTED',
    'EXPIRED',
    ARRAY ['SYSTEM_AUTOMATION'],
    false,
    false
  ),
  (
    'INVOICE',
    'UNDER_REVIEW',
    'EXPIRED',
    ARRAY ['SYSTEM_AUTOMATION'],
    false,
    false
  ),
  (
    'INVOICE',
    'DISPUTED',
    'EXPIRED',
    ARRAY ['SYSTEM_AUTOMATION'],
    false,
    false
  ) ON CONFLICT DO NOTHING;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §35 SEEDS: VPC allowed_transitions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.allowed_transitions (
    entity_type,
    from_state_key,
    to_state_key,
    allowed_actor_type,
    requires_maker_checker,
    requires_escalation
  )
VALUES -- ACTIVE → ROUTING_READY: admin enables partner routing
  (
    'VPC',
    'ACTIVE',
    'ROUTING_READY',
    ARRAY ['PLATFORM_ADMIN'],
    false,
    false
  ),
  -- ROUTING_READY → TRANSMITTED: system automation (Phase 2 path, forward-compat)
  (
    'VPC',
    'ROUTING_READY',
    'TRANSMITTED',
    ARRAY ['SYSTEM_AUTOMATION'],
    false,
    false
  ),
  -- ACTIVE → VOIDED: admin voids active VPC
  (
    'VPC',
    'ACTIVE',
    'VOIDED',
    ARRAY ['PLATFORM_ADMIN'],
    false,
    true
  ),
  -- ROUTING_READY → VOIDED: admin voids before transmission
  (
    'VPC',
    'ROUTING_READY',
    'VOIDED',
    ARRAY ['PLATFORM_ADMIN'],
    false,
    true
  ),
  -- ACTIVE → EXPIRED: system automation (TTL reached)
  (
    'VPC',
    'ACTIVE',
    'EXPIRED',
    ARRAY ['SYSTEM_AUTOMATION'],
    false,
    false
  ),
  -- ROUTING_READY → EXPIRED: system automation (TTL reached before transmission)
  (
    'VPC',
    'ROUTING_READY',
    'EXPIRED',
    ARRAY ['SYSTEM_AUTOMATION'],
    false,
    false
  ) ON CONFLICT DO NOTHING;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §36 SEEDS: feature_flags (TTP kill-switch + numeric caps)
--
--   ALL TTP feature flags seeded with enabled=false.
--   ttp_enabled is the global kill-switch: MUST remain false until
--   Slice 5 sign-off (per TTP-FOUNDATION-001 design invariant).
--   Numeric flags use the new value TEXT column (§1).
--   OQ-TTP-001: tier caps confirmed: Tier1=250000, Tier2=500000, Tier3=1000000.
--   OQ-TTP-003: maker-checker threshold=1000000 (>= rule at service layer).
--   OQ-TTP-005: assessment validity default=180 days.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.feature_flags (key, enabled, description, value, updated_at)
VALUES (
    'ttp_enabled',
    false,
    'TradeTrust Pay global kill-switch. MUST be false until Slice 5 sign-off. Enables the full TTP feature surface when true.',
    NULL,
    NOW()
  ),
  (
    'ttp_max_invoice_amount_tier_1_inr',
    false,
    'OQ-TTP-001: Maximum single-invoice amount (INR) for risk tier 1 organisations. Service layer reads this value and validates gross_amount <= cap.',
    '250000',
    NOW()
  ),
  (
    'ttp_max_invoice_amount_tier_2_inr',
    false,
    'OQ-TTP-001: Maximum single-invoice amount (INR) for risk tier 2 organisations.',
    '500000',
    NOW()
  ),
  (
    'ttp_max_invoice_amount_tier_3_inr',
    false,
    'OQ-TTP-001: Maximum single-invoice amount (INR) for risk tier 3 organisations.',
    '1000000',
    NOW()
  ),
  (
    'ttp_maker_checker_threshold_inr',
    false,
    'OQ-TTP-003: Invoice gross_amount >= this value (INR) requires maker-checker approval before UNDER_REVIEW → VERIFIED transition. Rule: >= (not >).',
    '1000000',
    NOW()
  ),
  (
    'ttp_eligibility_assessment_validity_days',
    false,
    'OQ-TTP-005: Default number of days before a TTP eligibility assessment expires. Assessments with valid_until = NULL are indefinite (admin-set override). This flag governs auto-set valid_until when admin completes a new assessment.',
    '180',
    NOW()
  ) ON CONFLICT (key) DO NOTHING;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §37 POST-FLIGHT VERIFICATION
--     Inline sanity checks. Raises EXCEPTION if invariants violated.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE v_invoice_state_count INTEGER;
v_vpc_state_count INTEGER;
v_invoice_trans_count INTEGER;
v_vpc_trans_count INTEGER;
v_ttp_flag_count INTEGER;
v_value_column_exists BOOLEAN;
v_ttp_enabled_value BOOLEAN;
BEGIN -- Verify feature_flags.value column exists
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feature_flags'
      AND column_name = 'value'
  ) INTO v_value_column_exists;
IF NOT v_value_column_exists THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: feature_flags.value column NOT FOUND.';
END IF;
-- Verify new tables exist
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'invoices'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: invoices table NOT FOUND.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'invoice_lifecycle_logs'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: invoice_lifecycle_logs table NOT FOUND.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'gst_verifications'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: gst_verifications table NOT FOUND.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'ttp_eligibility_assessments'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: ttp_eligibility_assessments table NOT FOUND.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'verified_payable_certificates'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: verified_payable_certificates table NOT FOUND.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'partner_routing_stubs'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: partner_routing_stubs table NOT FOUND.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'ttp_enrollment_logs'
) THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: ttp_enrollment_logs table NOT FOUND.';
END IF;
-- Verify lifecycle states seeded
SELECT COUNT(*) INTO v_invoice_state_count
FROM public.lifecycle_states
WHERE entity_type = 'INVOICE';
IF v_invoice_state_count < 9 THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: Expected 9 INVOICE lifecycle states, found %.',
v_invoice_state_count;
END IF;
SELECT COUNT(*) INTO v_vpc_state_count
FROM public.lifecycle_states
WHERE entity_type = 'VPC';
IF v_vpc_state_count < 5 THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: Expected 5 VPC lifecycle states, found %.',
v_vpc_state_count;
END IF;
-- Verify allowed transitions seeded
SELECT COUNT(*) INTO v_invoice_trans_count
FROM public.allowed_transitions
WHERE entity_type = 'INVOICE';
IF v_invoice_trans_count < 15 THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: Expected >= 15 INVOICE transitions, found %.',
v_invoice_trans_count;
END IF;
SELECT COUNT(*) INTO v_vpc_trans_count
FROM public.allowed_transitions
WHERE entity_type = 'VPC';
IF v_vpc_trans_count < 6 THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: Expected 6 VPC transitions, found %.',
v_vpc_trans_count;
END IF;
-- Verify TTP feature flags seeded
SELECT COUNT(*) INTO v_ttp_flag_count
FROM public.feature_flags
WHERE key LIKE 'ttp_%';
IF v_ttp_flag_count < 6 THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT: Expected 6 TTP feature flags, found %.',
v_ttp_flag_count;
END IF;
-- CRITICAL: ttp_enabled must be FALSE (kill-switch invariant)
SELECT enabled INTO v_ttp_enabled_value
FROM public.feature_flags
WHERE key = 'ttp_enabled';
IF v_ttp_enabled_value IS TRUE THEN RAISE EXCEPTION 'TTP-FOUNDATION-001 POST-FLIGHT CRITICAL: ttp_enabled = TRUE. This flag MUST be false until Slice 5 sign-off. Do not enable until all Slices are complete and signed off.';
END IF;
RAISE NOTICE 'TTP-FOUNDATION-001 post-flight OK: all tables created, % INVOICE states, % VPC states, % INVOICE transitions, % VPC transitions, % TTP flags. ttp_enabled = false (kill-switch confirmed).',
v_invoice_state_count,
v_vpc_state_count,
v_invoice_trans_count,
v_vpc_trans_count,
v_ttp_flag_count;
END;
$$;