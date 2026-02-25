-- ============================================================================
-- G-018 Day 1: Escrow Domain — Schema + RLS + FK Hardening
-- Task ID:    G-018-DAY1-ESCROW-SCHEMA
-- Doctrine:   v1.4 + Addendum Draft v1 + G-018 Day 1 Design
-- Date:       2026-03-08
-- Gate:       Gate E (Trade Domain Foundation)
-- Author:     TexQtic Platform Engineering (Safe-Write Mode)
--
-- INVARIANTS
--   - ADDITIVE ONLY except where explicitly noted (ALTER TABLE on trades,
--     ALTER TABLE on escrow_lifecycle_logs — both clearly scoped below).
--   - FORCE RLS on every new table.
--   - No monetary balance fields anywhere.
--   - escrow_transactions is APPEND-ONLY at 3 constitutional layers.
--   - No routes, no services, no business logic.
--
-- OBJECTS CREATED / ALTERED
--   §1  PRE-FLIGHT safety check
--   §2  TABLE   public.escrow_accounts
--   §3  INDEXES on escrow_accounts
--   §4  FUNCTION public.escrow_accounts_set_updated_at()
--   §5  TRIGGER  trg_escrow_accounts_set_updated_at
--   §6  RLS + GRANTS on escrow_accounts
--   §7  TABLE   public.escrow_transactions (append-only)
--   §8  INDEXES on escrow_transactions
--   §9  FUNCTION public.prevent_escrow_transaction_mutation()
--   §10 TRIGGER  trg_immutable_escrow_transaction ON escrow_transactions
--   §11 RLS + GRANTS on escrow_transactions
--   §12 ALTER TABLE public.trades ADD COLUMN escrow_id (per G-017 intent)
--   §13 ALTER TABLE public.escrow_lifecycle_logs ADD CONSTRAINT escrow_id FK
--   §14 FUNCTION public.g018_enforce_pending_approvals_escrow_entity_fk()
--   §15 TRIGGER  trg_g018_pending_approvals_escrow_entity_fk
--   §16 VERIFY   inline DO $$ block
--
-- Rollback (run in order):
--   DROP TRIGGER IF EXISTS trg_g018_pending_approvals_escrow_entity_fk
--     ON public.pending_approvals;
--   DROP FUNCTION IF EXISTS
--     public.g018_enforce_pending_approvals_escrow_entity_fk();
--   DROP TRIGGER IF EXISTS trg_immutable_escrow_transaction
--     ON public.escrow_transactions;
--   DROP FUNCTION IF EXISTS public.prevent_escrow_transaction_mutation();
--   DROP TRIGGER IF EXISTS trg_escrow_accounts_set_updated_at
--     ON public.escrow_accounts;
--   DROP FUNCTION IF EXISTS public.escrow_accounts_set_updated_at();
--   DROP TABLE IF EXISTS public.escrow_transactions;
--   DROP TABLE IF EXISTS public.escrow_accounts;  -- this also drops FK references
--   -- Remove column and constraint added to trades:
--   ALTER TABLE public.trades
--     DROP CONSTRAINT IF EXISTS trades_escrow_id_fk,
--     DROP COLUMN IF EXISTS escrow_id;
--   -- Remove FK hardening on escrow_lifecycle_logs:
--   ALTER TABLE public.escrow_lifecycle_logs
--     DROP CONSTRAINT IF EXISTS escrow_lifecycle_logs_escrow_id_fk;
-- ============================================================================

BEGIN;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  PRE-FLIGHT SAFETY CHECK
--     Abort early if prerequisite tables are absent or this migration
--     was already applied. All checks are SELECT-only (read-only).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
BEGIN
  -- Require public.trades (G-017 Day 1 must precede G-018)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trades'
  ) THEN
    RAISE EXCEPTION
      'G-018 PRE-FLIGHT BLOCKED: public.trades does not exist. '
      'Apply G-017 Day 1 migration (20260306000000_g017_trades_domain) first.';
  END IF;

  -- Require public.pending_approvals (G-021 must precede G-018)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pending_approvals'
  ) THEN
    RAISE EXCEPTION
      'G-018 PRE-FLIGHT BLOCKED: public.pending_approvals does not exist. '
      'Apply G-021 maker-checker migration (20260302000000_g021_maker_checker_core) first.';
  END IF;

  -- Require public.escrow_lifecycle_logs (G-020 must precede G-018)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'escrow_lifecycle_logs'
  ) THEN
    RAISE EXCEPTION
      'G-018 PRE-FLIGHT BLOCKED: public.escrow_lifecycle_logs does not exist. '
      'Apply G-020 lifecycle migration (20260301000000_g020_lifecycle_state_machine_core) first.';
  END IF;

  -- Require public.lifecycle_states (G-020 must precede G-018)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lifecycle_states'
  ) THEN
    RAISE EXCEPTION
      'G-018 PRE-FLIGHT BLOCKED: public.lifecycle_states does not exist. '
      'Apply G-020 lifecycle migration first.';
  END IF;

  -- Idempotency guard: abort if already applied
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'escrow_accounts'
  ) THEN
    RAISE EXCEPTION
      'G-018 PRE-FLIGHT BLOCKED: public.escrow_accounts already exists. '
      'Migration 20260308000000_g018_day1_escrow_schema may already be applied.';
  END IF;

  RAISE NOTICE
    'G-018 pre-flight OK: trades, pending_approvals, escrow_lifecycle_logs, '
    'lifecycle_states present; escrow_accounts absent. Proceeding.';
END;
$$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  TABLE: public.escrow_accounts
--
--   Minimal, lifecycle-aligned table representing an escrow account
--   entity in the TexQtic platform.
--
--   Design choices:
--   - NO balance/amount columns anywhere. Monetary ledger values are
--     derived from escrow_transactions (append-only ledger). This upholds
--     D-020-B (Escrow Neutrality): no read-modify-write balance path exists.
--   - lifecycle_state_id FK → lifecycle_states(id): enforces that the
--     escrow account is always in a known, registered lifecycle state.
--     Service layer responsibility: must use an ESCROW entity_type state.
--   - trade_id NULL → trades(id): one escrow account may be linked to one
--     trade (optional), per G-017 design intent.
--   - UNIQUE(tenant_id, trade_id) WHERE trade_id IS NOT NULL enforced via
--     partial unique index (see §3).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.escrow_accounts (
  -- ── Identity ────────────────────────────────────────────────────────
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ── Tenant boundary (RLS scope: matches trades/events pattern) ──────
  tenant_id UUID NOT NULL,
  -- ── Optional trade linkage (nullable; G-017 back-ref) ───────────────
  -- ON DELETE RESTRICT: do not silently orphan escrow if trade is deleted.
  -- The trade deletion path must explicitly clear or reassign this FK first.
  trade_id UUID NULL REFERENCES public.trades(id) ON DELETE RESTRICT,
  -- ── Lifecycle alignment (G-020 registry) ────────────────────────────
  -- Service layer MUST supply an ESCROW entity_type lifecycle_states row.
  -- A cross-table CHECK is not feasible in Day 1; service layer enforces.
  lifecycle_state_id UUID NOT NULL REFERENCES public.lifecycle_states(id)
    ON DELETE RESTRICT,
  -- ── Currency denomination ────────────────────────────────────────────
  -- D-020-B: No balance fields here. All monetary entries flow through
  -- escrow_transactions. currency captures the denomination only.
  currency TEXT NOT NULL,
  -- ── Attribution ─────────────────────────────────────────────────────
  created_by_user_id UUID NULL,
  -- ── Timestamps ──────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.escrow_accounts IS
  'G-018 Day 1: Canonical escrow account entity. Lifecycle-aligned via '
  'lifecycle_state_id FK (G-020). No monetary balance fields — D-020-B '
  '(Escrow Neutrality) is constitutionally binding. Monetary entries flow '
  'exclusively through public.escrow_transactions (append-only ledger). '
  'tenant_id is the RLS boundary.';
COMMENT ON COLUMN public.escrow_accounts.trade_id IS
  'Optional link to the trade that initiated this escrow account. '
  'NULL-able: not all escrows are trade-linked (e.g., standalone or platform-level). '
  'ON DELETE RESTRICT prevents silent orphan if trade is deleted. '
  'Per G-017 design intent: one escrow per trade (partial unique index enforces this).';
COMMENT ON COLUMN public.escrow_accounts.lifecycle_state_id IS
  'FK to lifecycle_states(id). Service layer (EscrowService) MUST supply a '
  'row whose entity_type = ''ESCROW''. Day 1 does not add a cross-table CHECK; '
  'this is a service-layer responsibility enforced by StateMachineService.';
COMMENT ON COLUMN public.escrow_accounts.currency IS
  'ISO 4217 currency code for this escrow account denomination. '
  'D-020-B: This is the denomination field only. No balance amount is stored here.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  INDEXES on public.escrow_accounts
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX escrow_accounts_tenant_id_idx
  ON public.escrow_accounts (tenant_id);

CREATE INDEX escrow_accounts_trade_id_idx
  ON public.escrow_accounts (trade_id);

CREATE INDEX escrow_accounts_lifecycle_state_id_idx
  ON public.escrow_accounts (lifecycle_state_id);

-- Partial unique index: one escrow per trade, per tenant, when trade_id is set.
-- NULL trade_id rows are excluded (a tenant may have multiple escrows without trades).
CREATE UNIQUE INDEX escrow_accounts_tenant_trade_unique
  ON public.escrow_accounts (tenant_id, trade_id)
  WHERE trade_id IS NOT NULL;

COMMENT ON INDEX public.escrow_accounts_tenant_trade_unique IS
  'G-018: Enforces one escrow account per trade per tenant when trade_id is non-null. '
  'Partial index: NULL trade_id rows are excluded and may have multiple escrow accounts.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §4  FUNCTION: public.escrow_accounts_set_updated_at()
--     Maintains updated_at on escrow_accounts UPDATE.
--     Pattern follows trades_set_updated_at() from G-017.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.escrow_accounts_set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.escrow_accounts_set_updated_at() IS
  'G-018: Trigger function to maintain updated_at timestamp on '
  'public.escrow_accounts on every BEFORE UPDATE. Follows G-017 pattern '
  '(trades_set_updated_at).';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §5  TRIGGER: trg_escrow_accounts_set_updated_at
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP TRIGGER IF EXISTS trg_escrow_accounts_set_updated_at ON public.escrow_accounts;
CREATE TRIGGER trg_escrow_accounts_set_updated_at
  BEFORE UPDATE ON public.escrow_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.escrow_accounts_set_updated_at();

COMMENT ON TRIGGER trg_escrow_accounts_set_updated_at
  ON public.escrow_accounts IS
  'G-018: Maintains updated_at on every BEFORE UPDATE on escrow_accounts. '
  'Mirrors trg_trades_set_updated_at (G-017).';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §6  RLS + GRANTS on public.escrow_accounts
--
--   Three-policy pattern per G-017 / G-022 / G-023 doctrine:
--     1. RESTRICTIVE guard  (ALL)   — fail-closed baseline
--     2. PERMISSIVE SELECT  —tenant-scoped reads (+ bypass for test seeding)
--     3. PERMISSIVE INSERT  — tenant-scoped writes (+ bypass)
--
--   No UPDATE/DELETE policies in Day 1.
--   texqtic_app: SELECT + INSERT only (no UPDATE/DELETE grant yet).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_accounts FORCE ROW LEVEL SECURITY;

-- Guard (RESTRICTIVE): fail-closed — must have org context or bypass enabled
DROP POLICY IF EXISTS escrow_accounts_guard ON public.escrow_accounts;
CREATE POLICY escrow_accounts_guard
  ON public.escrow_accounts
  AS RESTRICTIVE
  FOR ALL
  TO texqtic_app
  USING (app.require_org_context() OR app.bypass_enabled());

-- Tenant SELECT: own rows only (+ bypass)
DROP POLICY IF EXISTS escrow_accounts_tenant_select ON public.escrow_accounts;
CREATE POLICY escrow_accounts_tenant_select
  ON public.escrow_accounts
  AS PERMISSIVE
  FOR SELECT
  TO texqtic_app
  USING ((tenant_id = app.current_org_id()) OR app.bypass_enabled());

-- Tenant INSERT: own tenant only (+ bypass)
DROP POLICY IF EXISTS escrow_accounts_tenant_insert ON public.escrow_accounts;
CREATE POLICY escrow_accounts_tenant_insert
  ON public.escrow_accounts
  AS PERMISSIVE
  FOR INSERT
  TO texqtic_app
  WITH CHECK (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );

-- Grants: SELECT + INSERT only. No UPDATE/DELETE in Day 1.
GRANT SELECT, INSERT ON public.escrow_accounts TO texqtic_app;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §7  TABLE: public.escrow_transactions (append-only ledger)
--
--   Records every monetary movement event for an escrow account.
--   This IS where amounts live — per entry, not as a mutable balance.
--
--   Append-only enforcement (3 constitutional layers):
--     Layer 1: Service layer (EscrowService provides no update/delete method)
--     Layer 2: DB trigger    (§9 + §10: BEFORE UPDATE OR DELETE → RAISE)
--     Layer 3: RLS policies  (explicit UPDATE/DELETE USING (false))
--
--   entry_type kept generic (TEXT + CHECK) so the domain can evolve
--   without additional migrations. New values require a governance decision.
--
--   direction: DEBIT (funds leaving escrow) | CREDIT (funds entering escrow).
--   amount: per-entry amount > 0. Running totals are computed by the service
--   layer over all transactions for an escrow_id.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.escrow_transactions (
  -- ── Identity ────────────────────────────────────────────────────────
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ── Tenant boundary ─────────────────────────────────────────────────
  tenant_id UUID NOT NULL,
  -- ── Escrow linkage ──────────────────────────────────────────────────
  escrow_id UUID NOT NULL REFERENCES public.escrow_accounts(id)
    ON DELETE CASCADE,
  -- ── Transaction classification ───────────────────────────────────────
  -- Generic entries: HOLD | RELEASE | REFUND | ADJUSTMENT
  -- CHECK constraint kept intentionally open for future governance extensions.
  entry_type TEXT NOT NULL,
  -- ── Directionality ─────────────────────────────────────────────────
  direction TEXT NOT NULL,
  -- ── Amount (per-entry, always positive; running total is computed) ──
  amount NUMERIC(18, 6) NOT NULL,
  -- ── Currency ────────────────────────────────────────────────────────
  currency TEXT NOT NULL,
  -- ── Idempotency reference ───────────────────────────────────────────
  -- Optional external reference for idempotency checks and reconciliation.
  -- Indexed below (see §8 rationale).
  reference_id TEXT NULL,
  -- ── Arbitrary structured payload ─────────────────────────────────────
  metadata JSONB NOT NULL DEFAULT '{}',
  -- ── Attribution ─────────────────────────────────────────────────────
  created_by_user_id UUID NULL,
  -- ── Immutable wall-clock timestamp ──────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Domain constraints ───────────────────────────────────────────────
  CONSTRAINT escrow_transactions_entry_type_check CHECK (
    entry_type IN ('HOLD', 'RELEASE', 'REFUND', 'ADJUSTMENT')
  ),
  CONSTRAINT escrow_transactions_direction_check CHECK (
    direction IN ('DEBIT', 'CREDIT')
  ),
  CONSTRAINT escrow_transactions_amount_positive CHECK (amount > 0)
);

COMMENT ON TABLE public.escrow_transactions IS
  'G-018 Day 1: Append-only ledger entries for escrow accounts. '
  'Three-layer immutability: service (no update/delete method) + '
  'trigger (trg_immutable_escrow_transaction, §10, SQLSTATE P0005) + '
  'RLS (UPDATE/DELETE USING false). '
  'D-020-B: No balance field — running totals are computed from ledger entries. '
  'No UPDATE or DELETE is ever permitted.';
COMMENT ON COLUMN public.escrow_transactions.entry_type IS
  'G-018: Transaction classification. Allowed values (CHECK): '
  'HOLD | RELEASE | REFUND | ADJUSTMENT. '
  'Future extensions require a governance migration to update the CHECK constraint.';
COMMENT ON COLUMN public.escrow_transactions.direction IS
  'DEBIT: funds flowing out of escrow (e.g., release to seller, refund to buyer). '
  'CREDIT: funds flowing into escrow (e.g., initial hold). '
  'Service layer validates business rules; DB constraint enforces valid values only.';
COMMENT ON COLUMN public.escrow_transactions.amount IS
  'Per-entry amount. Always > 0 (enforced by CHECK). '
  'D-020-B: Balance is derived, never stored. '
  'Service layer computes SUM(CREDIT) - SUM(DEBIT) for a given escrow_id.';
COMMENT ON COLUMN public.escrow_transactions.reference_id IS
  'Optional external idempotency / reconciliation reference. '
  'Indexed (see escrow_transactions_reference_id_idx) to support efficient '
  'duplicate-detection lookups by the service layer. '
  'NULL-able: not all transactions have an external reference.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §8  INDEXES on public.escrow_transactions
--
--   reference_id index rationale: service layer performs idempotency checks
--   before inserting a new transaction ("has this reference_id been processed
--   for this escrow already?"). Without an index this degrades to a full scan
--   of the transaction ledger per request.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX escrow_transactions_tenant_id_idx
  ON public.escrow_transactions (tenant_id);

CREATE INDEX escrow_transactions_escrow_id_idx
  ON public.escrow_transactions (escrow_id);

-- Partial index: only rows with a reference_id (most optimization benefit
-- at reduced index size vs. full-column index including NULLs).
CREATE INDEX escrow_transactions_reference_id_idx
  ON public.escrow_transactions (reference_id)
  WHERE reference_id IS NOT NULL;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §9  FUNCTION: public.prevent_escrow_transaction_mutation()
--
--   Layer 2 immutability enforcement for escrow_transactions.
--   A dedicated function (separate from prevent_lifecycle_log_update_delete)
--   is used because:
--     a) escrow_transactions is NOT a lifecycle log — it is a financial
--        ledger. A shared immutability function would blur that boundary.
--     b) The SQLSTATE is distinct (P0005) so application code can
--        differentiate transaction integrity errors from log integrity errors
--        (P0001) and the G-017/G-018 FK hardening errors (P0003, P0004).
--     c) The error message cites G-018 governance for audit traceability.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.prevent_escrow_transaction_mutation()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'ESCROW_TRANSACTION_IMMUTABLE: escrow_transactions rows are append-only. '
    'UPDATE and DELETE are unconditionally prohibited (G-018 Day 1, SQLSTATE P0005). '
    'No override path exists. Corrections must be recorded as new forward INSERTs '
    'with entry_type=ADJUSTMENT and reference_id referencing the original transaction id.'
    USING ERRCODE = 'P0005';
END;
$$;

COMMENT ON FUNCTION public.prevent_escrow_transaction_mutation() IS
  'G-018 Day 1 Layer 2 immutability: Unconditional backstop for '
  'public.escrow_transactions. Fires BEFORE UPDATE OR DELETE. '
  'Raises SQLSTATE P0005. Cannot be bypassed without dropping the trigger '
  '(requires postgres role + migration window). '
  'Distinct from prevent_lifecycle_log_update_delete (SQLSTATE P0001) to '
  'allow application-level differentiation of error types.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §10 TRIGGER: trg_immutable_escrow_transaction
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP TRIGGER IF EXISTS trg_immutable_escrow_transaction ON public.escrow_transactions;
CREATE TRIGGER trg_immutable_escrow_transaction
  BEFORE UPDATE OR DELETE ON public.escrow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_escrow_transaction_mutation();

COMMENT ON TRIGGER trg_immutable_escrow_transaction
  ON public.escrow_transactions IS
  'G-018 Day 1 Layer 2: Unconditional immutability enforcement. '
  'BEFORE UPDATE OR DELETE → raises SQLSTATE P0005. '
  'Complements Layer 3 (RLS USING false) and Layer 1 (service has no mutation methods).';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §11 RLS + GRANTS on public.escrow_transactions
--
--   Three-policy pattern + explicit deny policies for UPDATE/DELETE
--   (Layer 3 of append-only enforcement — belt-and-braces with §10).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions FORCE ROW LEVEL SECURITY;

-- Guard (RESTRICTIVE): fail-closed baseline
DROP POLICY IF EXISTS escrow_transactions_guard ON public.escrow_transactions;
CREATE POLICY escrow_transactions_guard
  ON public.escrow_transactions
  AS RESTRICTIVE
  FOR ALL
  TO texqtic_app
  USING (app.require_org_context() OR app.bypass_enabled());

-- Tenant SELECT
DROP POLICY IF EXISTS escrow_transactions_tenant_select ON public.escrow_transactions;
CREATE POLICY escrow_transactions_tenant_select
  ON public.escrow_transactions
  AS PERMISSIVE
  FOR SELECT
  TO texqtic_app
  USING ((tenant_id = app.current_org_id()) OR app.bypass_enabled());

-- Tenant INSERT
DROP POLICY IF EXISTS escrow_transactions_tenant_insert ON public.escrow_transactions;
CREATE POLICY escrow_transactions_tenant_insert
  ON public.escrow_transactions
  AS PERMISSIVE
  FOR INSERT
  TO texqtic_app
  WITH CHECK (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );

-- UPDATE: unconditionally denied (Layer 3 append-only enforcement)
DROP POLICY IF EXISTS escrow_transactions_no_update ON public.escrow_transactions;
CREATE POLICY escrow_transactions_no_update
  ON public.escrow_transactions
  FOR UPDATE
  TO texqtic_app
  USING (false);

-- DELETE: unconditionally denied (Layer 3 append-only enforcement)
DROP POLICY IF EXISTS escrow_transactions_no_delete ON public.escrow_transactions;
CREATE POLICY escrow_transactions_no_delete
  ON public.escrow_transactions
  FOR DELETE
  TO texqtic_app
  USING (false);

-- Grants: SELECT + INSERT only. UPDATE/DELETE are not granted and
-- are explicitly blocked by both the RLS policies above and the trigger (§10).
GRANT SELECT, INSERT ON public.escrow_transactions TO texqtic_app;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §12 LINKAGE: trades.escrow_id (per G-017 Day 1 design intent)
--
--   G-017 design explicitly reserved:
--     "When G-018 lands, a migration will add
--      escrow_id UUID REFERENCES public.escrow_accounts(id)"
--   to public.trades.
--
--   Design choices:
--   - NULL-able: not all trades require an escrow (direct settlement,
--     low-value trades are examples from G-017 §4).
--   - ON DELETE RESTRICT: prevents escrow_accounts deletion while a
--     trade still references it. The trade must first clear its escrow
--     linkage before the account can be dropped.
--   - No change to trades RLS policies.
--   - No new monetary fields added.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.trades
  ADD COLUMN escrow_id UUID NULL;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_escrow_id_fk
    FOREIGN KEY (escrow_id)
    REFERENCES public.escrow_accounts(id)
    ON DELETE RESTRICT;

CREATE INDEX trades_escrow_id_idx ON public.trades (escrow_id)
  WHERE escrow_id IS NOT NULL;

COMMENT ON COLUMN public.trades.escrow_id IS
  'G-018 Day 1: Optional link to the escrow account associated with this trade. '
  'NULL-able: not all trades have escrow (e.g., direct settlement, low-value trades). '
  'ON DELETE RESTRICT: prevents escrow_accounts deletion while this trade references it. '
  'Per G-017 §4 deferred placeholder, now wired as escrow_accounts exists.';

COMMENT ON CONSTRAINT trades_escrow_id_fk ON public.trades IS
  'G-018: FK wiring of G-017 soft-reference. escrow_id → escrow_accounts.id '
  'ON DELETE RESTRICT. This constraint was explicitly planned in G-017 Day 1 design.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §13 FK HARDENING: escrow_lifecycle_logs.escrow_id → escrow_accounts(id)
--
--   G-020 migration explicitly reserved:
--     "G-018: ALTER TABLE public.escrow_lifecycle_logs
--        ADD CONSTRAINT escrow_lifecycle_logs_escrow_id_fk
--        FOREIGN KEY (escrow_id) REFERENCES public.escrow_accounts(id);"
--
--   Pre-flight confirms both tables exist and constraint does not
--   already exist before attempting ALTER.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
BEGIN
  -- Guard: only add FK if it does not already exist (defensive idempotency)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'escrow_lifecycle_logs'
      AND constraint_name = 'escrow_lifecycle_logs_escrow_id_fk'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.escrow_lifecycle_logs
      ADD CONSTRAINT escrow_lifecycle_logs_escrow_id_fk
        FOREIGN KEY (escrow_id)
        REFERENCES public.escrow_accounts(id)
        ON DELETE CASCADE;

    RAISE NOTICE
      'G-018 §13: escrow_lifecycle_logs_escrow_id_fk added — '
      'escrow_lifecycle_logs.escrow_id now a hard FK to escrow_accounts.id.';
  ELSE
    RAISE NOTICE
      'G-018 §13: escrow_lifecycle_logs_escrow_id_fk already exists — skipping.';
  END IF;
END;
$$;

COMMENT ON CONSTRAINT escrow_lifecycle_logs_escrow_id_fk
  ON public.escrow_lifecycle_logs IS
  'G-018: FK hardening of G-020 soft-reference. escrow_id → escrow_accounts.id '
  'ON DELETE CASCADE (escrow deletion removes its lifecycle log entries). '
  'This constraint was explicitly planned in G-020 SOFT REFERENCE NOTICE.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §14 FUNCTION: public.g018_enforce_pending_approvals_escrow_entity_fk()
--
--   Polymorphic referential enforcement for pending_approvals.
--   Because pending_approvals serves multiple entity types (TRADE, ESCROW,
--   CERTIFICATION) a standard FK is not viable. This trigger-based approach
--   mirrors the G-017 Day 4 pattern (SQLSTATE P0003, function
--   g017_enforce_pending_approvals_trade_entity_fk).
--
--   Key design choices:
--   - SECURITY DEFINER: referential check runs as the function owner,
--     bypassing session RLS on escrow_accounts. This prevents a false-negative
--     where a tenant-scoped RLS context hides a valid escrow_accounts row
--     and the existence check returns false (rejecting a legitimate insert).
--   - SET search_path = public: prevents search_path injection attacks.
--   - SQLSTATE P0004: distinct from P0001 (lifecycle log immutability),
--     P0002 (maker-checker separation G-021), P0003 (trade FK hardening G-017).
--   - Non-ESCROW rows returned unchanged (TRADE and CERTIFICATION pass through).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.g018_enforce_pending_approvals_escrow_entity_fk()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_escrow_exists BOOLEAN;
BEGIN
  -- ── Guard 1: Only validate when entity_type is 'ESCROW'. ────────────────
  IF NEW.entity_type <> 'ESCROW' THEN
    RETURN NEW;
  END IF;

  -- ── Guard 2: Skip on UPDATE when neither entity_id nor entity_type changed.
  --   (On INSERT, TG_OP = 'INSERT' so OLD is NULL — always proceed.)
  IF TG_OP = 'UPDATE'
     AND (NEW.entity_id IS NOT DISTINCT FROM OLD.entity_id)
     AND (NEW.entity_type IS NOT DISTINCT FROM OLD.entity_type)
  THEN
    RETURN NEW;
  END IF;

  -- ── Referential check ───────────────────────────────────────────────────
  --   SECURITY DEFINER + search_path = public ensures escrow_accounts RLS
  --   does not hide a valid row that the session cannot see in its tenant ctx.
  SELECT EXISTS (
    SELECT 1
    FROM public.escrow_accounts e
    WHERE e.id = NEW.entity_id
  ) INTO v_escrow_exists;

  IF NOT v_escrow_exists THEN
    RAISE EXCEPTION
      'G-018 FK_HARDEN_FAIL: pending_approvals ESCROW entity_id does not '
      'reference escrow_accounts.id — entity_id: %',
      NEW.entity_id
      USING ERRCODE = 'P0004';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.g018_enforce_pending_approvals_escrow_entity_fk() IS
  'G-018 Day 1 — Trigger function enforcing referential integrity for '
  'pending_approvals rows whose entity_type = ''ESCROW''. '
  'Validates entity_id EXISTS in public.escrow_accounts. '
  'SECURITY DEFINER + search_path=public to bypass session RLS on escrow_accounts. '
  'Raises SQLSTATE P0004 (distinct from P0003=TRADE, P0001=lifecycle-log, '
  'P0002=maker-checker separation). Non-ESCROW rows are passed through unchanged. '
  'Mirrors g017_enforce_pending_approvals_trade_entity_fk() pattern (G-017 Day 4).';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §15 TRIGGER: trg_g018_pending_approvals_escrow_entity_fk
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP TRIGGER IF EXISTS trg_g018_pending_approvals_escrow_entity_fk
  ON public.pending_approvals;

CREATE TRIGGER trg_g018_pending_approvals_escrow_entity_fk
  BEFORE INSERT OR UPDATE
  ON public.pending_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.g018_enforce_pending_approvals_escrow_entity_fk();

COMMENT ON TRIGGER trg_g018_pending_approvals_escrow_entity_fk
  ON public.pending_approvals IS
  'G-018 Day 1 — Before-row trigger enforcing ESCROW entity_id → '
  'escrow_accounts.id referential integrity on public.pending_approvals. '
  'See function g018_enforce_pending_approvals_escrow_entity_fk() for '
  'validation logic and SQLSTATE P0004 error contract. '
  'Mirrors trg_g017_pending_approvals_trade_entity_fk (G-017 Day 4).';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §16 POST-MIGRATION VERIFICATION (read-only DO block — no data written)
--
--   Fails fast (RAISE EXCEPTION) if any expected invariant is violated.
--   All checks are metadata existence queries (pg_catalog, information_schema).
--   No rows are inserted. No data is modified.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE
  -- escrow_accounts
  v_ea_exists           BOOLEAN;
  v_ea_rls              BOOLEAN;
  v_ea_force            BOOLEAN;
  v_ea_guard_count      INT;
  -- escrow_transactions
  v_et_exists           BOOLEAN;
  v_et_rls              BOOLEAN;
  v_et_force            BOOLEAN;
  v_et_guard_count      INT;
  -- trades.escrow_id linkage
  v_escrow_col_exists   BOOLEAN;
  v_escrow_fk_exists    BOOLEAN;
  -- escrow_lifecycle_logs FK
  v_ell_fk_exists       BOOLEAN;
  -- Maker-Checker trigger
  v_mc_trigger_exists   BOOLEAN;
  v_mc_trigger_enabled  CHAR(1);
  -- Immutability trigger on escrow_transactions
  v_imm_trigger_exists  BOOLEAN;
BEGIN

  -- ── escrow_accounts exists ────────────────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'escrow_accounts'
  ) INTO v_ea_exists;
  IF NOT v_ea_exists THEN
    RAISE EXCEPTION 'G-018 VERIFY FAIL: public.escrow_accounts table not found';
  END IF;
  RAISE NOTICE 'G-018 VERIFY: escrow_accounts EXISTS — OK';

  -- ── escrow_transactions exists ────────────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'escrow_transactions'
  ) INTO v_et_exists;
  IF NOT v_et_exists THEN
    RAISE EXCEPTION 'G-018 VERIFY FAIL: public.escrow_transactions table not found';
  END IF;
  RAISE NOTICE 'G-018 VERIFY: escrow_transactions EXISTS — OK';

  -- ── ENABLE + FORCE RLS on escrow_accounts ────────────────────────────
  SELECT relrowsecurity, relforcerowsecurity
  INTO v_ea_rls, v_ea_force
  FROM pg_class
  WHERE relname = 'escrow_accounts'
    AND relnamespace = 'public'::regnamespace;
  IF NOT (v_ea_rls AND v_ea_force) THEN
    RAISE EXCEPTION
      'G-018 VERIFY FAIL: escrow_accounts missing ENABLE/FORCE RLS (rls=%, force=%)',
      v_ea_rls, v_ea_force;
  END IF;
  RAISE NOTICE 'G-018 VERIFY: escrow_accounts RLS: %/% — OK', v_ea_rls, v_ea_force;

  -- ── ENABLE + FORCE RLS on escrow_transactions ─────────────────────────
  SELECT relrowsecurity, relforcerowsecurity
  INTO v_et_rls, v_et_force
  FROM pg_class
  WHERE relname = 'escrow_transactions'
    AND relnamespace = 'public'::regnamespace;
  IF NOT (v_et_rls AND v_et_force) THEN
    RAISE EXCEPTION
      'G-018 VERIFY FAIL: escrow_transactions missing ENABLE/FORCE RLS (rls=%, force=%)',
      v_et_rls, v_et_force;
  END IF;
  RAISE NOTICE 'G-018 VERIFY: escrow_transactions RLS: %/% — OK', v_et_rls, v_et_force;

  -- ── RESTRICTIVE guard on escrow_accounts ─────────────────────────────
  SELECT COUNT(*) INTO v_ea_guard_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename   = 'escrow_accounts'
    AND policyname  = 'escrow_accounts_guard'
    AND permissive  = 'RESTRICTIVE';
  IF v_ea_guard_count <> 1 THEN
    RAISE EXCEPTION
      'G-018 VERIFY FAIL: escrow_accounts_guard RESTRICTIVE policy missing (found %)',
      v_ea_guard_count;
  END IF;
  RAISE NOTICE 'G-018 VERIFY: escrow_accounts_guard RESTRICTIVE EXISTS — OK';

  -- ── RESTRICTIVE guard on escrow_transactions ──────────────────────────
  SELECT COUNT(*) INTO v_et_guard_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename   = 'escrow_transactions'
    AND policyname  = 'escrow_transactions_guard'
    AND permissive  = 'RESTRICTIVE';
  IF v_et_guard_count <> 1 THEN
    RAISE EXCEPTION
      'G-018 VERIFY FAIL: escrow_transactions_guard RESTRICTIVE policy missing (found %)',
      v_et_guard_count;
  END IF;
  RAISE NOTICE 'G-018 VERIFY: escrow_transactions_guard RESTRICTIVE EXISTS — OK';

  -- ── trades.escrow_id column exists ───────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'trades'
      AND column_name  = 'escrow_id'
  ) INTO v_escrow_col_exists;
  IF NOT v_escrow_col_exists THEN
    RAISE EXCEPTION 'G-018 VERIFY FAIL: trades.escrow_id column not found';
  END IF;
  RAISE NOTICE 'G-018 VERIFY: trades.escrow_id column EXISTS — OK';

  -- ── trades_escrow_id_fk constraint exists ────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name        = 'trades'
      AND constraint_name   = 'trades_escrow_id_fk'
      AND constraint_type   = 'FOREIGN KEY'
  ) INTO v_escrow_fk_exists;
  IF NOT v_escrow_fk_exists THEN
    RAISE EXCEPTION 'G-018 VERIFY FAIL: trades_escrow_id_fk FK constraint not found';
  END IF;
  RAISE NOTICE 'G-018 VERIFY: trades_escrow_id_fk FK EXISTS — OK';

  -- ── escrow_lifecycle_logs_escrow_id_fk constraint exists ─────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name        = 'escrow_lifecycle_logs'
      AND constraint_name   = 'escrow_lifecycle_logs_escrow_id_fk'
      AND constraint_type   = 'FOREIGN KEY'
  ) INTO v_ell_fk_exists;
  IF NOT v_ell_fk_exists THEN
    RAISE EXCEPTION
      'G-018 VERIFY FAIL: escrow_lifecycle_logs_escrow_id_fk FK constraint not found';
  END IF;
  RAISE NOTICE 'G-018 VERIFY: escrow_lifecycle_logs_escrow_id_fk FK EXISTS — OK';

  -- ── Maker-Checker ESCROW trigger exists ───────────────────────────────
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname  = 'pending_approvals'
      AND t.tgname   = 'trg_g018_pending_approvals_escrow_entity_fk'
  ) INTO v_mc_trigger_exists;
  IF NOT v_mc_trigger_exists THEN
    RAISE EXCEPTION
      'G-018 VERIFY FAIL: trigger trg_g018_pending_approvals_escrow_entity_fk '
      'on public.pending_approvals not found in pg_trigger';
  END IF;
  RAISE NOTICE 'G-018 VERIFY: trg_g018_pending_approvals_escrow_entity_fk EXISTS — OK';

  -- ── Maker-Checker ESCROW trigger is enabled ────────────────────────────
  SELECT t.tgenabled
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname  = 'pending_approvals'
    AND t.tgname   = 'trg_g018_pending_approvals_escrow_entity_fk'
  INTO v_mc_trigger_enabled;
  IF v_mc_trigger_enabled IS DISTINCT FROM 'O' THEN
    RAISE EXCEPTION
      'G-018 VERIFY FAIL: trg_g018_pending_approvals_escrow_entity_fk not '
      'enabled (tgenabled=%). Expected ''O''.',
      v_mc_trigger_enabled;
  END IF;
  RAISE NOTICE 'G-018 VERIFY: escrow maker-checker trigger tgenabled=''O'' — OK';

  -- ── Immutability trigger on escrow_transactions exists ────────────────
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname  = 'escrow_transactions'
      AND t.tgname   = 'trg_immutable_escrow_transaction'
  ) INTO v_imm_trigger_exists;
  IF NOT v_imm_trigger_exists THEN
    RAISE EXCEPTION
      'G-018 VERIFY FAIL: trigger trg_immutable_escrow_transaction on '
      'public.escrow_transactions not found in pg_trigger';
  END IF;
  RAISE NOTICE 'G-018 VERIFY: trg_immutable_escrow_transaction EXISTS — OK';

  -- ── Summary ───────────────────────────────────────────────────────────
  RAISE NOTICE
    'G-018 PASS: escrow schema created — '
    'escrow_accounts RLS: %/%, '
    'escrow_transactions RLS: %/%, '
    'trades.escrow_id: ok, '
    'escrow_lifecycle_logs FK: ok, '
    'pending_approvals ESCROW enforcement: ok, '
    'escrow_transactions immutable: ok',
    v_ea_rls, v_ea_force,
    v_et_rls, v_et_force;

END;
$$;

COMMIT;
