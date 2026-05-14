-- =============================================================================
-- TEXQTIC-NC-PHASE1-POOL-SETTLE-SCHEMA-001
-- Migration:  nc_network_settlement_splits
-- Sequence:   20260535000000
-- Date:       2026-06-01
-- Summary:    Creates public.network_settlement_splits table.
--             Computation / audit record for pool settlement waterfall.
--             RLS anchor: org_id (pool-owning org = canonical tenant boundary).
--             entity_type discriminant: POOL | SYNDICATE | VCO_CHAIN.
--             status values: PENDING | TRIGGERED | RELEASED | FAILED.
--             escrow_account_id: nullable UUID — NO FK (escrow coupling deferred).
--             No service layer, routes, or settlement logic in this packet.
--             NO money movement, payout, or escrow release.
--
--             Authority:
--               TEXQTIC-NC-PHASE1-POOL-SETTLE-SCHEMA-001
--               TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001 §6.12
--
--             DB Roles:
--               texqtic_app   (tenant — SELECT/INSERT/UPDATE/no DELETE)
--               texqtic_admin (control-plane — SELECT only)
-- =============================================================================
-- §1  Pre-flight guard
-- §2  CREATE TABLE network_settlement_splits
-- §3  Unique constraints
-- §4  Indexes
-- §5  RLS — network_settlement_splits
-- §6  Grants
-- =============================================================================
-- §1  Pre-flight guard --------------------------------------------------------
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_settlement_splits'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_settlement_splits already exists — migration may have been applied already. Halting.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'organizations'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: public.organizations does not exist. Apply init migration first.';
END IF;
END $$;
-- §2  CREATE TABLE network_settlement_splits ----------------------------------
CREATE TABLE public.network_settlement_splits (
  -- ── Surrogate key ──────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant anchor (RLS owner) ──────────────────────────────────────────────
  -- Pool-owning org. Primary RLS boundary. Never nullable.
  org_id UUID NOT NULL,
  -- ── Entity discriminant ────────────────────────────────────────────────────
  -- Identifies the NC entity type this split belongs to.
  -- DB CHECK restricts to: POOL | SYNDICATE | VCO_CHAIN
  entity_type VARCHAR(30) NOT NULL,
  entity_id UUID NOT NULL,
  -- ── Recipient ──────────────────────────────────────────────────────────────
  -- The organisation that will receive net_payable when status → RELEASED.
  -- No FK-chained payout logic in this packet.
  recipient_org_id UUID NOT NULL,
  -- ── Waterfall position ─────────────────────────────────────────────────────
  -- Sequential rank within the settlement waterfall for this entity.
  -- DB CHECK: >= 1.
  waterfall_seq INTEGER NOT NULL,
  -- ── Monetary fields ────────────────────────────────────────────────────────
  -- All amounts in same currency unit; DB CHECK: >= 0.
  -- gross_amount: total amount before deductions.
  -- holdback_amount: portion withheld (e.g. retention, warranty hold).
  -- penalty_deduction: deduction applied due to SLA breach / penalty.
  -- net_payable: gross_amount - holdback_amount - penalty_deduction.
  --   Enforced by DB CHECK — not computed automatically by DB.
  currency CHAR(3) NOT NULL,
  gross_amount DECIMAL(18, 6) NOT NULL,
  holdback_amount DECIMAL(18, 6) NOT NULL DEFAULT 0,
  penalty_deduction DECIMAL(18, 6) NOT NULL DEFAULT 0,
  net_payable DECIMAL(18, 6) NOT NULL,
  -- ── Split lifecycle status ─────────────────────────────────────────────────
  -- PENDING   : computed, awaiting trigger
  -- TRIGGERED : payment/escrow instruction sent (external)
  -- RELEASED  : confirmed released to recipient
  -- FAILED    : trigger or release failed; requires manual intervention
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  -- ── Escrow reference ───────────────────────────────────────────────────────
  -- Nullable link to an escrow account record.
  -- NO FK — escrow coupling deferred (escrow table shape uncertain in Phase 1H).
  -- Service layer must validate existence before setting this field.
  escrow_account_id UUID NULL,
  -- ── Timing fields ──────────────────────────────────────────────────────────
  triggered_at TIMESTAMPTZ NULL,
  released_at TIMESTAMPTZ NULL,
  -- ── Timestamps ─────────────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Primary key ────────────────────────────────────────────────────────────
  CONSTRAINT nc_network_settlement_splits_pkey PRIMARY KEY (id),
  -- ── FK: org_id → organizations ─────────────────────────────────────────────
  CONSTRAINT nc_network_settlement_splits_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE ON UPDATE NO ACTION,
  -- ── FK: recipient_org_id → organizations ───────────────────────────────────
  CONSTRAINT nc_network_settlement_splits_recipient_org_id_fk FOREIGN KEY (recipient_org_id) REFERENCES public.organizations (id) ON DELETE CASCADE ON UPDATE NO ACTION,
  -- ── Entity type domain guard ───────────────────────────────────────────────
  CONSTRAINT nc_network_settlement_splits_entity_type_check CHECK (
    entity_type IN ('POOL', 'SYNDICATE', 'VCO_CHAIN')
  ),
  -- ── Status domain guard ────────────────────────────────────────────────────
  CONSTRAINT nc_network_settlement_splits_status_check CHECK (
    status IN ('PENDING', 'TRIGGERED', 'RELEASED', 'FAILED')
  ),
  -- ── Waterfall sequence guard ───────────────────────────────────────────────
  CONSTRAINT nc_network_settlement_splits_waterfall_seq_check CHECK (waterfall_seq >= 1),
  -- ── Monetary amount guards ─────────────────────────────────────────────────
  CONSTRAINT nc_network_settlement_splits_gross_amount_check CHECK (gross_amount >= 0),
  CONSTRAINT nc_network_settlement_splits_holdback_amount_check CHECK (holdback_amount >= 0),
  CONSTRAINT nc_network_settlement_splits_penalty_deduction_check CHECK (penalty_deduction >= 0),
  CONSTRAINT nc_network_settlement_splits_net_payable_check CHECK (net_payable >= 0),
  -- ── Currency non-empty guard ───────────────────────────────────────────────
  CONSTRAINT nc_network_settlement_splits_currency_nonempty_check CHECK (length(trim(currency)) > 0),
  -- ── Timing coherence guards ────────────────────────────────────────────────
  -- released_at must only be set when status = RELEASED
  CONSTRAINT nc_network_settlement_splits_released_at_coherence_check CHECK (
    released_at IS NULL
    OR status = 'RELEASED'
  ),
  -- triggered_at must only be set when status IN (TRIGGERED, RELEASED, FAILED)
  CONSTRAINT nc_network_settlement_splits_triggered_at_coherence_check CHECK (
    triggered_at IS NULL
    OR status IN ('TRIGGERED', 'RELEASED', 'FAILED')
  )
);
-- §3  Unique constraints ------------------------------------------------------
-- One waterfall slot per entity — prevents duplicate waterfall positions.
ALTER TABLE public.network_settlement_splits
ADD CONSTRAINT nc_network_settlement_splits_entity_seq_unique UNIQUE (entity_type, entity_id, waterfall_seq);
-- §4  Indexes -----------------------------------------------------------------
-- Primary query pattern: by org + entity (list splits for a pool)
CREATE INDEX idx_nc_network_settlement_splits_org_entity ON public.network_settlement_splits (org_id, entity_type, entity_id);
-- Status funnel (workflow queries, admin monitoring)
CREATE INDEX idx_nc_network_settlement_splits_status ON public.network_settlement_splits (status);
-- Recipient cross-reference (reverse lookup: which splits target an org)
CREATE INDEX idx_nc_network_settlement_splits_recipient_org ON public.network_settlement_splits (recipient_org_id);
-- Created-at descending for ordered list views
CREATE INDEX idx_nc_network_settlement_splits_created_at ON public.network_settlement_splits (created_at DESC);
-- §5  RLS — network_settlement_splits -----------------------------------------
ALTER TABLE public.network_settlement_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_settlement_splits FORCE ROW LEVEL SECURITY;
-- Tenant SELECT: scoped to own org_id
CREATE POLICY nc_network_settlement_splits_tenant_select ON public.network_settlement_splits FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant INSERT: org_id in row must match GUC (cross-tenant write prevention)
CREATE POLICY nc_network_settlement_splits_tenant_insert ON public.network_settlement_splits FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant UPDATE: org_id scoped; allows status transitions
CREATE POLICY nc_network_settlement_splits_tenant_update ON public.network_settlement_splits FOR
UPDATE TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  ) WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- DELETE permanently blocked — settlement audit trail must not be erased
CREATE POLICY nc_network_settlement_splits_no_delete ON public.network_settlement_splits FOR DELETE TO texqtic_app USING (false);
-- Control-plane admin SELECT: requires app.is_admin GUC = 'true'
CREATE POLICY nc_network_settlement_splits_admin_select ON public.network_settlement_splits FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- §6  Grants ------------------------------------------------------------------
GRANT SELECT,
  INSERT,
  UPDATE ON public.network_settlement_splits TO texqtic_app;
GRANT SELECT ON public.network_settlement_splits TO texqtic_admin;