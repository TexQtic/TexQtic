-- ============================================================================
-- G-020 Day 2: Lifecycle State Machine Core — Soft Reference Edition
-- Task ID:    G-020-DAY2-MIGRATION-SOFTREF
-- Doctrine:   v1.4 + Addendum Draft v1 + G-020 Design v1.1 (APPROVED)
-- Date:       2026-03-01
-- Author:     TexQtic Platform Engineering (Safe-Write Mode)
-- Constitutional Review: APPROVED 2026-02-24
--   D-020-A (actor classification) · D-020-B (escrow neutrality)
--   D-020-C (AI boundary) · D-020-D (log immutability)
-- ============================================================================
--
-- INVARIANTS
--   - ADDITIVE ONLY. No existing table is modified. No existing policy touched.
--   - FORCE RLS on every new table. No table bypasses RLS.
--   - app.org_id is the ONLY canonical RLS variable. app.tenant_id: NEVER used.
--   - trade_id / escrow_id are SOFT REFERENCES (UUID NOT NULL, no FK constraint).
--       FK to trades.id    → deferred to G-017 (trades table does not exist yet).
--       FK to escrow_accounts.id → deferred to G-018.
--   - org_id → organizations.id is a LIVE FK (G-015 Phase A already applied).
--   - All log tables are APPEND-ONLY, enforced at three constitutional layers:
--       Layer 1: Service layer  (StateMachineService: no update/delete method)
--       Layer 2: DB trigger     (BEFORE UPDATE OR DELETE → RAISE EXCEPTION)
--       Layer 3: RLS            (UPDATE/DELETE policies USING false)
--   - No financial columns. No payment semantics. Escrow = acknowledgement only.
--   - AI may not directly trigger transitions (ai_triggered column records advisory flag).
--
-- OBJECTS CREATED
--   1. TABLE     public.lifecycle_states
--   2. TABLE     public.allowed_transitions
--   3. FUNCTION  public.prevent_lifecycle_log_update_delete()
--   4. TABLE     public.trade_lifecycle_logs
--   5. TRIGGER   trg_immutable_trade_lifecycle_log ON trade_lifecycle_logs
--   6. TABLE     public.escrow_lifecycle_logs
--   7. TRIGGER   trg_immutable_escrow_lifecycle_log ON escrow_lifecycle_logs
--   8. RLS       ENABLE + FORCE + policies × 14 across all tables
--   9. GRANTS    texqtic_app / texqtic_admin per table
--  10. VERIFY    inline DO $$ block
--
-- SOFT REFERENCE NOTICE (recorded for future hardening)
--   G-017: ALTER TABLE public.trade_lifecycle_logs
--            ADD CONSTRAINT trade_lifecycle_logs_trade_id_fk
--            FOREIGN KEY (trade_id) REFERENCES public.trades(id);
--   G-018: ALTER TABLE public.escrow_lifecycle_logs
--            ADD CONSTRAINT escrow_lifecycle_logs_escrow_id_fk
--            FOREIGN KEY (escrow_id) REFERENCES public.escrow_accounts(id);
-- ============================================================================
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  PRE-FLIGHT SAFETY CHECK
--     Abort if prerequisite tables are absent or migration already applied.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$ BEGIN -- Require organizations (G-015 Phase A)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'organizations'
) THEN RAISE EXCEPTION 'G-020 PRE-FLIGHT BLOCKED: public.organizations does not exist. ' 'Apply G-015 Phase A migration before this migration.';
END IF;
-- Idempotency guard: abort if already applied
IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'lifecycle_states'
) THEN RAISE EXCEPTION 'G-020 PRE-FLIGHT BLOCKED: public.lifecycle_states already exists. ' 'Migration 20260301000000_g020_lifecycle_state_machine_core may already be applied.';
END IF;
RAISE NOTICE 'G-020 pre-flight OK: organizations present, lifecycle_states absent. Proceeding.';
END;
$$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  TABLE: public.lifecycle_states
--     Authoritative registry of every valid state across all lifecycle
--     domains (TRADE, ESCROW, CERTIFICATION). Platform-level governance
--     table. Read-only at runtime — written only via governance migrations.
--     G-020 §2.2 · D-020-D
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.lifecycle_states (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  state_key TEXT NOT NULL,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  is_irreversible BOOLEAN NOT NULL DEFAULT false,
  severity_level INTEGER NOT NULL DEFAULT 0,
  requires_maker_checker BOOLEAN NOT NULL DEFAULT false,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lifecycle_states_pkey PRIMARY KEY (id),
  -- Composite unique key — FK target for allowed_transitions
  CONSTRAINT lifecycle_states_entity_type_state_key_key UNIQUE (entity_type, state_key),
  CONSTRAINT lifecycle_states_entity_type_check CHECK (
    entity_type IN ('TRADE', 'ESCROW', 'CERTIFICATION')
  ),
  CONSTRAINT lifecycle_states_severity_level_check CHECK (
    severity_level BETWEEN 0 AND 4
  ),
  CONSTRAINT lifecycle_states_state_key_uppercase CHECK (state_key = upper(state_key))
);
COMMENT ON TABLE public.lifecycle_states IS 'G-020 §2.2: Authoritative registry of all valid lifecycle states. ' 'Platform-level governance table. READ-ONLY at runtime. ' 'Written via governance migrations only. Doctrine v1.4.';
COMMENT ON COLUMN public.lifecycle_states.entity_type IS 'Domain discriminant: TRADE | ESCROW | CERTIFICATION.';
COMMENT ON COLUMN public.lifecycle_states.state_key IS 'Machine-readable uppercase state identifier. e.g. ORDER_CONFIRMED. ' 'Must be uppercase snake_case (enforced by CHECK constraint).';
COMMENT ON COLUMN public.lifecycle_states.is_terminal IS 'If true, no outbound transitions are permitted. No edge may originate from this state.';
COMMENT ON COLUMN public.lifecycle_states.is_irreversible IS 'If true, transition INTO this state cannot be undone by normal service calls (§4).';
COMMENT ON COLUMN public.lifecycle_states.severity_level IS 'G-022 integration: 0=routine, 1=notable, 2=significant, 3=high, 4=critical.';
COMMENT ON COLUMN public.lifecycle_states.requires_maker_checker IS 'Default MC gate for any transition INTO this state. ' 'Edge-level override available in allowed_transitions.';
CREATE INDEX idx_lifecycle_states_entity_type ON public.lifecycle_states (entity_type);
CREATE INDEX idx_lifecycle_states_entity_type_state_key ON public.lifecycle_states (entity_type, state_key);
CREATE INDEX idx_lifecycle_states_is_terminal ON public.lifecycle_states (is_terminal)
WHERE is_terminal = true;
ALTER TABLE public.lifecycle_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_states FORCE ROW LEVEL SECURITY;
-- All authenticated app sessions may read state definitions (platform-level)
CREATE POLICY lifecycle_states_app_select ON public.lifecycle_states FOR
SELECT TO texqtic_app USING (true);
CREATE POLICY lifecycle_states_admin_select ON public.lifecycle_states FOR
SELECT TO texqtic_admin USING (true);
GRANT SELECT ON public.lifecycle_states TO texqtic_app;
GRANT SELECT,
  INSERT ON public.lifecycle_states TO texqtic_admin;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  TABLE: public.allowed_transitions
--     Every permitted directed edge in the state graph. Enforcement layer
--     performs existence check on every transition attempt. If no row
--     exists for (entity_type, from_state_key, to_state_key), the
--     transition is rejected unconditionally.
--     G-020 §2.3 · D-020-A (allowed_actor_type mandatory TEXT[])
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.allowed_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  from_state_key TEXT NOT NULL,
  to_state_key TEXT NOT NULL,
  -- D-020-A: actor classification is mandatory, schema-enforced, non-nullable
  allowed_actor_type TEXT [] NOT NULL,
  requires_maker_checker BOOLEAN NOT NULL DEFAULT false,
  requires_escalation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT allowed_transitions_pkey PRIMARY KEY (id),
  -- No duplicate edges in the transition graph
  CONSTRAINT allowed_transitions_unique_edge UNIQUE (entity_type, from_state_key, to_state_key),
  CONSTRAINT allowed_transitions_entity_type_check CHECK (
    entity_type IN ('TRADE', 'ESCROW', 'CERTIFICATION')
  ),
  -- Self-loop transitions are constitutionally prohibited (§4)
  CONSTRAINT allowed_transitions_no_self_loop CHECK (from_state_key <> to_state_key),
  -- D-020-A: actor type array must contain at least one valid classification
  CONSTRAINT allowed_transitions_actor_type_min_one CHECK (array_length(allowed_actor_type, 1) >= 1),
  -- Composite FK: from_state must be a declared state for the same entity_type
  CONSTRAINT allowed_transitions_from_state_fk FOREIGN KEY (entity_type, from_state_key) REFERENCES public.lifecycle_states (entity_type, state_key) ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- Composite FK: to_state must be a declared state for the same entity_type
  CONSTRAINT allowed_transitions_to_state_fk FOREIGN KEY (entity_type, to_state_key) REFERENCES public.lifecycle_states (entity_type, state_key) ON DELETE RESTRICT ON UPDATE RESTRICT
);
COMMENT ON TABLE public.allowed_transitions IS 'G-020 §2.3: Every permitted directed edge in the lifecycle state graph. ' 'D-020-A: allowed_actor_type TEXT[] NOT NULL enforces actor classification at schema level. ' 'Composite FKs to lifecycle_states(entity_type, state_key). ' 'No matching row = transition denied unconditionally by enforcement layer.';
COMMENT ON COLUMN public.allowed_transitions.allowed_actor_type IS 'D-020-A: Actor types permitted to trigger this transition edge. ' 'Values: TENANT_USER | TENANT_ADMIN | PLATFORM_ADMIN | SYSTEM_AUTOMATION | MAKER | CHECKER. ' 'Schema constraint: array_length >= 1. Empty array is prohibited. ' 'Enforcement layer validates caller classification before any other check.';
COMMENT ON COLUMN public.allowed_transitions.requires_escalation IS 'If true, this transition automatically triggers a G-022 escalation record ' 'at the severity_level of the destination state.';
CREATE INDEX idx_allowed_transitions_entity_from ON public.allowed_transitions (entity_type, from_state_key);
CREATE INDEX idx_allowed_transitions_entity_from_to ON public.allowed_transitions (entity_type, from_state_key, to_state_key);
CREATE INDEX idx_allowed_transitions_requires_mc ON public.allowed_transitions (requires_maker_checker)
WHERE requires_maker_checker = true;
ALTER TABLE public.allowed_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_transitions FORCE ROW LEVEL SECURITY;
CREATE POLICY allowed_transitions_app_select ON public.allowed_transitions FOR
SELECT TO texqtic_app USING (true);
CREATE POLICY allowed_transitions_admin_select ON public.allowed_transitions FOR
SELECT TO texqtic_admin USING (true);
GRANT SELECT ON public.allowed_transitions TO texqtic_app;
GRANT SELECT,
  INSERT ON public.allowed_transitions TO texqtic_admin;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §4  IMMUTABILITY TRIGGER FUNCTION
--     Shared by both log tables. Layer 2 of three-layer append-only
--     enforcement. Unconditional — no override escalation path exists.
--     D-020-D §9.4 (Layer 2)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.prevent_lifecycle_log_update_delete() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'LIFECYCLE_LOG_IMMUTABLE: Lifecycle log rows are append-only. ' 'UPDATE and DELETE are unconditionally prohibited on table %. ' 'This is G-020 D-020-D Layer 2 enforcement. ' 'No escalation path exists for log mutation. ' 'Corrections must be recorded as new forward INSERTs with reason: CORRECTION OF LOG_ID <uuid>.',
  TG_TABLE_NAME USING ERRCODE = 'P0001';
END;
$$;
COMMENT ON FUNCTION public.prevent_lifecycle_log_update_delete() IS 'G-020 D-020-D Layer 2: Unconditional immutability backstop for lifecycle log tables. ' 'Fires BEFORE UPDATE OR DELETE on trade_lifecycle_logs and escrow_lifecycle_logs. ' 'Raises SQLSTATE P0001 regardless of caller role or session privileges. ' 'Cannot be bypassed without dropping the trigger (which requires postgres role + migration window).';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §5  TABLE: public.trade_lifecycle_logs
--     Immutable, append-only audit log of all trade state transitions.
--     16 mandatory audit fields per D-020-D §9.4.
--     trade_id is a SOFT REFERENCE — FK to trades.id deferred to G-017.
--     org_id → organizations.id is a LIVE FK (G-015 Phase A applied).
--     No fintech semantics. Governance infrastructure only.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.trade_lifecycle_logs (
  -- ── Identity ──────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant boundary ───────────────────────────────────────────────
  -- Live FK: org_id must reference an existing organization (G-015 Phase A)
  org_id UUID NOT NULL,
  -- ── Trade reference (SOFT — no FK until G-017 creates trades table) ──
  trade_id UUID NOT NULL,
  -- ── State transition ──────────────────────────────────────────────
  from_state_key TEXT NOT NULL,
  to_state_key TEXT NOT NULL,
  -- ── Actor attribution (D-020-A / D-020-D) ─────────────────────────
  -- Exactly one of actor_user_id / actor_admin_id must be set for
  -- human transitions. Both are NULL only for SYSTEM_AUTOMATION.
  actor_user_id UUID NULL,
  actor_admin_id UUID NULL,
  actor_type TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  -- ── Escalation linkage (G-022) ────────────────────────────────────
  escalation_level INTEGER NULL,
  -- ── Maker-Checker attribution (G-021) ─────────────────────────────
  maker_user_id UUID NULL,
  checker_user_id UUID NULL,
  -- ── AI boundary (D-020-C) ─────────────────────────────────────────
  -- Advisory flag only. AI may NEVER be the direct actor.
  -- If true: reason must contain "AI_RECOMMENDED: ... — HUMAN_CONFIRMED by ..."
  ai_triggered BOOLEAN NOT NULL DEFAULT false,
  -- ── Impersonation audit ───────────────────────────────────────────
  impersonation_id UUID NULL,
  -- ── Mandatory justification (D-020-D) ────────────────────────────
  reason TEXT NOT NULL,
  -- ── Request correlation ───────────────────────────────────────────
  request_id TEXT NULL,
  -- ── Immutable wall-clock timestamp ──────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trade_lifecycle_logs_pkey PRIMARY KEY (id),
  -- Live FK: org boundary — CASCADE because org deletion removes all its logs
  CONSTRAINT trade_lifecycle_logs_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
  -- D-020-A: actor_type must be one of the six constitutional types
  CONSTRAINT trade_lifecycle_logs_actor_type_check CHECK (
    actor_type IN (
      'TENANT_USER',
      'TENANT_ADMIN',
      'PLATFORM_ADMIN',
      'SYSTEM_AUTOMATION',
      'MAKER',
      'CHECKER'
    )
  ),
  -- D-020-D: Actor principal exclusivity rule
  --   Human transition: exactly one of (actor_user_id, actor_admin_id) is non-null
  --   System transition: both null, and actor_type must be SYSTEM_AUTOMATION
  CONSTRAINT trade_lifecycle_logs_actor_principal_check CHECK (
    (
      actor_user_id IS NOT NULL
      AND actor_admin_id IS NULL
    )
    OR (
      actor_user_id IS NULL
      AND actor_admin_id IS NOT NULL
    )
    OR (
      actor_type = 'SYSTEM_AUTOMATION'
      AND actor_user_id IS NULL
      AND actor_admin_id IS NULL
    )
  ),
  -- Escalation level range (matches G-022 severity range 1–4)
  CONSTRAINT trade_lifecycle_logs_escalation_level_check CHECK (
    escalation_level IS NULL
    OR escalation_level BETWEEN 1 AND 4
  ),
  -- Reason must never be blank (D-020-D: "must be meaningful")
  CONSTRAINT trade_lifecycle_logs_reason_nonempty CHECK (length(trim(reason)) > 0)
);
COMMENT ON TABLE public.trade_lifecycle_logs IS 'G-020 D-020-D: Immutable, append-only log of all trade state transitions. ' 'Three-layer enforcement: service (no update/delete method) + trigger (§4) + RLS (UPDATE/DELETE=false). ' 'trade_id is a SOFT REFERENCE — FK to trades.id deferred to G-017. ' 'org_id → organizations.id is a live FK. ' 'Escrow neutrality (D-020-B): this table records trade lifecycle only, no financial data. ' 'AI boundary (D-020-C): ai_triggered flag records advisory AI participation — AI cannot be actor.';
COMMENT ON COLUMN public.trade_lifecycle_logs.trade_id IS 'SOFT REFERENCE (G-020-DAY2-SOFTREF): UUID of the trade being transitioned. ' 'No FK constraint exists yet. FK hardening deferred to G-017 ' '(trades table does not exist at time of this migration).';
COMMENT ON COLUMN public.trade_lifecycle_logs.from_state_key IS 'Prior state key. Must match a valid lifecycle_states.state_key for TRADE entity_type.';
COMMENT ON COLUMN public.trade_lifecycle_logs.actor_type IS 'D-020-A: Actor classification at time of transition. ' 'TENANT_USER | TENANT_ADMIN | PLATFORM_ADMIN | SYSTEM_AUTOMATION | MAKER | CHECKER.';
COMMENT ON COLUMN public.trade_lifecycle_logs.ai_triggered IS 'D-020-C: Set true when an AI recommendation preceded this human-confirmed transition. ' 'AI may NEVER directly call StateMachineService.transition(). Human confirmation is mandatory. ' 'When true: reason must be formatted as "AI_RECOMMENDED: <summary> — HUMAN_CONFIRMED by <actorId>".';
COMMENT ON COLUMN public.trade_lifecycle_logs.reason IS 'D-020-D: Mandatory justification. Must be non-empty. ' 'Required non-blank for all transitions into irreversible states. ' 'For MA corrections: "CORRECTION OF LOG_ID <uuid>".';
COMMENT ON COLUMN public.trade_lifecycle_logs.impersonation_id IS 'UUID of the ImpersonationSession if this transition occurred during a platform impersonation. ' 'NULL for all normal tenant-initiated transitions.';
-- Indexes: primary access patterns
CREATE INDEX idx_trade_lifecycle_logs_org_trade ON public.trade_lifecycle_logs (org_id, trade_id);
CREATE INDEX idx_trade_lifecycle_logs_org_trade_created ON public.trade_lifecycle_logs (org_id, trade_id, created_at DESC);
CREATE INDEX idx_trade_lifecycle_logs_org_id ON public.trade_lifecycle_logs (org_id);
CREATE INDEX idx_trade_lifecycle_logs_trade_id ON public.trade_lifecycle_logs (trade_id);
CREATE INDEX idx_trade_lifecycle_logs_to_state ON public.trade_lifecycle_logs (to_state_key);
CREATE INDEX idx_trade_lifecycle_logs_actor_user ON public.trade_lifecycle_logs (actor_user_id)
WHERE actor_user_id IS NOT NULL;
-- RLS: ENABLE + FORCE (constitutional requirement — D-020-D Layer 3)
ALTER TABLE public.trade_lifecycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_lifecycle_logs FORCE ROW LEVEL SECURITY;
-- Tenant SELECT: own org only
CREATE POLICY trade_lifecycle_logs_tenant_select ON public.trade_lifecycle_logs FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant INSERT: own org only
CREATE POLICY trade_lifecycle_logs_tenant_insert ON public.trade_lifecycle_logs FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- UPDATE: unconditionally denied (D-020-D Layer 3)
CREATE POLICY trade_lifecycle_logs_no_update ON public.trade_lifecycle_logs FOR
UPDATE TO texqtic_app USING (false);
-- DELETE: unconditionally denied (D-020-D Layer 3)
CREATE POLICY trade_lifecycle_logs_no_delete ON public.trade_lifecycle_logs FOR DELETE TO texqtic_app USING (false);
-- Admin SELECT: control-plane audit access (is_admin context required)
CREATE POLICY trade_lifecycle_logs_admin_select ON public.trade_lifecycle_logs FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
GRANT SELECT,
  INSERT ON public.trade_lifecycle_logs TO texqtic_app;
GRANT SELECT ON public.trade_lifecycle_logs TO texqtic_admin;
-- Immutability trigger (Layer 2 — unconditional)
CREATE TRIGGER trg_immutable_trade_lifecycle_log BEFORE
UPDATE
  OR DELETE ON public.trade_lifecycle_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_lifecycle_log_update_delete();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §6  TABLE: public.escrow_lifecycle_logs
--     Same structure as trade_lifecycle_logs, but scoped to escrow entities.
--     escrow_id is a SOFT REFERENCE — FK to escrow_accounts.id deferred to G-018.
--     D-020-B: Escrow Neutrality Clause is constitutionally binding.
--     This table records state acknowledgements ONLY. No financial data.
--     No payment fields. No monetary operations — now or ever unless
--     a Fintech Integration Review is formally conducted and approved.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.escrow_lifecycle_logs (
  -- ── Identity ──────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant boundary ───────────────────────────────────────────────
  org_id UUID NOT NULL,
  -- ── Escrow reference (SOFT — no FK until G-018 creates escrow_accounts) ──
  escrow_id UUID NOT NULL,
  -- ── State transition ──────────────────────────────────────────────
  from_state_key TEXT NOT NULL,
  to_state_key TEXT NOT NULL,
  -- ── Actor attribution (D-020-A / D-020-D) ─────────────────────────
  actor_user_id UUID NULL,
  actor_admin_id UUID NULL,
  actor_type TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  -- ── Escalation linkage (G-022) ────────────────────────────────────
  escalation_level INTEGER NULL,
  -- ── Maker-Checker attribution (G-021) ─────────────────────────────
  maker_user_id UUID NULL,
  checker_user_id UUID NULL,
  -- ── AI boundary (D-020-C) ─────────────────────────────────────────
  ai_triggered BOOLEAN NOT NULL DEFAULT false,
  -- ── Impersonation audit ───────────────────────────────────────────
  impersonation_id UUID NULL,
  -- ── Mandatory justification (D-020-D) ────────────────────────────
  reason TEXT NOT NULL,
  -- ── Request correlation ───────────────────────────────────────────
  request_id TEXT NULL,
  -- ── Immutable wall-clock timestamp ───────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT escrow_lifecycle_logs_pkey PRIMARY KEY (id),
  CONSTRAINT escrow_lifecycle_logs_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
  CONSTRAINT escrow_lifecycle_logs_actor_type_check CHECK (
    actor_type IN (
      'TENANT_USER',
      'TENANT_ADMIN',
      'PLATFORM_ADMIN',
      'SYSTEM_AUTOMATION',
      'MAKER',
      'CHECKER'
    )
  ),
  CONSTRAINT escrow_lifecycle_logs_actor_principal_check CHECK (
    (
      actor_user_id IS NOT NULL
      AND actor_admin_id IS NULL
    )
    OR (
      actor_user_id IS NULL
      AND actor_admin_id IS NOT NULL
    )
    OR (
      actor_type = 'SYSTEM_AUTOMATION'
      AND actor_user_id IS NULL
      AND actor_admin_id IS NULL
    )
  ),
  CONSTRAINT escrow_lifecycle_logs_escalation_level_check CHECK (
    escalation_level IS NULL
    OR escalation_level BETWEEN 1 AND 4
  ),
  CONSTRAINT escrow_lifecycle_logs_reason_nonempty CHECK (length(trim(reason)) > 0)
);
COMMENT ON TABLE public.escrow_lifecycle_logs IS 'G-020 D-020-B ESCROW NEUTRALITY: This table records state acknowledgements ONLY. ' 'NO financial operation occurs during escrow state transitions. ' 'NO monetary fields, payment ledger entries, or fund movement — ever, without a Fintech Integration Review. ' 'G-020 D-020-D: Three-layer immutability: service + trigger (§4) + RLS (UPDATE/DELETE=false). ' 'escrow_id is a SOFT REFERENCE — FK to escrow_accounts.id deferred to G-018.';
COMMENT ON COLUMN public.escrow_lifecycle_logs.escrow_id IS 'SOFT REFERENCE (G-020-DAY2-SOFTREF): UUID of the escrow record being transitioned. ' 'No FK constraint exists yet. FK hardening deferred to G-018 ' '(escrow_accounts table does not exist at time of this migration).';
COMMENT ON COLUMN public.escrow_lifecycle_logs.actor_type IS 'D-020-A: Actor classification. ' 'TENANT_USER | TENANT_ADMIN | PLATFORM_ADMIN | SYSTEM_AUTOMATION | MAKER | CHECKER.';
COMMENT ON COLUMN public.escrow_lifecycle_logs.ai_triggered IS 'D-020-C: Escrow transitions cannot be autonomously triggered by AI. ' 'Set true only when AI recommendation preceded a human-confirmed transition. ' 'AI has zero direct authority over escrow state changes.';
-- Indexes
CREATE INDEX idx_escrow_lifecycle_logs_org_escrow ON public.escrow_lifecycle_logs (org_id, escrow_id);
CREATE INDEX idx_escrow_lifecycle_logs_org_escrow_created ON public.escrow_lifecycle_logs (org_id, escrow_id, created_at DESC);
CREATE INDEX idx_escrow_lifecycle_logs_org_id ON public.escrow_lifecycle_logs (org_id);
CREATE INDEX idx_escrow_lifecycle_logs_escrow_id ON public.escrow_lifecycle_logs (escrow_id);
CREATE INDEX idx_escrow_lifecycle_logs_to_state ON public.escrow_lifecycle_logs (to_state_key);
CREATE INDEX idx_escrow_lifecycle_logs_actor_user ON public.escrow_lifecycle_logs (actor_user_id)
WHERE actor_user_id IS NOT NULL;
-- RLS: ENABLE + FORCE
ALTER TABLE public.escrow_lifecycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_lifecycle_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY escrow_lifecycle_logs_tenant_select ON public.escrow_lifecycle_logs FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
CREATE POLICY escrow_lifecycle_logs_tenant_insert ON public.escrow_lifecycle_logs FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
CREATE POLICY escrow_lifecycle_logs_no_update ON public.escrow_lifecycle_logs FOR
UPDATE TO texqtic_app USING (false);
CREATE POLICY escrow_lifecycle_logs_no_delete ON public.escrow_lifecycle_logs FOR DELETE TO texqtic_app USING (false);
CREATE POLICY escrow_lifecycle_logs_admin_select ON public.escrow_lifecycle_logs FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
GRANT SELECT,
  INSERT ON public.escrow_lifecycle_logs TO texqtic_app;
GRANT SELECT ON public.escrow_lifecycle_logs TO texqtic_admin;
-- Immutability trigger (Layer 2 — unconditional)
CREATE TRIGGER trg_immutable_escrow_lifecycle_log BEFORE
UPDATE
  OR DELETE ON public.escrow_lifecycle_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_lifecycle_log_update_delete();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §7  POST-MIGRATION VERIFICATION BLOCK
--     Fails fast with a descriptive exception if any object is missing.
--     All 4 tables, FORCE RLS on all, and both immutability triggers
--     must be confirmed before migration is considered applied.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE tbl_count INTEGER;
rls_count INTEGER;
force_rls_count INTEGER;
trigger_count INTEGER;
fk_count INTEGER;
BEGIN -- 1. Verify all 4 tables exist
SELECT COUNT(*) INTO tbl_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'lifecycle_states',
    'allowed_transitions',
    'trade_lifecycle_logs',
    'escrow_lifecycle_logs'
  );
IF tbl_count != 4 THEN RAISE EXCEPTION 'G-020 VERIFY FAIL: Expected 4 tables, found %. ' 'Missing: check lifecycle_states, allowed_transitions, trade_lifecycle_logs, escrow_lifecycle_logs.',
tbl_count;
END IF;
-- 2. Verify ENABLE ROW LEVEL SECURITY on all 4 tables
SELECT COUNT(*) INTO rls_count
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'lifecycle_states',
    'allowed_transitions',
    'trade_lifecycle_logs',
    'escrow_lifecycle_logs'
  )
  AND c.relrowsecurity = true;
IF rls_count != 4 THEN RAISE EXCEPTION 'G-020 VERIFY FAIL: RLS not enabled on all tables. Enabled on % of 4.',
rls_count;
END IF;
-- 3. Verify FORCE ROW LEVEL SECURITY on all 4 tables
SELECT COUNT(*) INTO force_rls_count
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'lifecycle_states',
    'allowed_transitions',
    'trade_lifecycle_logs',
    'escrow_lifecycle_logs'
  )
  AND c.relforcerowsecurity = true;
IF force_rls_count != 4 THEN RAISE EXCEPTION 'G-020 VERIFY FAIL: FORCE RLS not active on all tables. Active on % of 4.',
force_rls_count;
END IF;
-- 4. Verify immutability triggers on both log tables
SELECT COUNT(*) INTO trigger_count
FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('trade_lifecycle_logs', 'escrow_lifecycle_logs')
  AND t.tgname LIKE 'trg_immutable_%'
  AND t.tgenabled = 'O';
-- 'O' = trigger enabled (origin + local)
IF trigger_count != 2 THEN RAISE EXCEPTION 'G-020 VERIFY FAIL: Expected 2 immutability triggers, found %.',
trigger_count;
END IF;
-- 5. Verify live FK: both log tables reference organizations
SELECT COUNT(*) INTO fk_count
FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'org_id'
  AND tc.table_name IN ('trade_lifecycle_logs', 'escrow_lifecycle_logs');
IF fk_count != 2 THEN RAISE EXCEPTION 'G-020 VERIFY FAIL: Expected 2 org_id FK constraints (one per log table), found %.',
fk_count;
END IF;
RAISE NOTICE '══════════════════════════════════════════════════════════════';
RAISE NOTICE 'G-020 Day 2 VERIFICATION PASSED — All checks GREEN';
RAISE NOTICE '────────────────────────────────────────────────────────────';
RAISE NOTICE '4/4 tables created';
RAISE NOTICE '4/4 ENABLE ROW LEVEL SECURITY';
RAISE NOTICE '4/4 FORCE ROW LEVEL SECURITY';
RAISE NOTICE '2/2 immutability triggers attached';
RAISE NOTICE '2/2 live org_id FKs to organizations';
RAISE NOTICE '────────────────────────────────────────────────────────────';
RAISE NOTICE 'Soft references (intentional — recorded for future hardening):';
RAISE NOTICE '  trade_id  → trades.id         [G-017 will add FK]';
RAISE NOTICE '  escrow_id → escrow_accounts.id [G-018 will add FK]';
RAISE NOTICE '────────────────────────────────────────────────────────────';
RAISE NOTICE 'Constitutional compliance:';
RAISE NOTICE '  D-020-A: allowed_actor_type TEXT[] NOT NULL ✓';
RAISE NOTICE '  D-020-B: Escrow neutrality — no financial columns ✓';
RAISE NOTICE '  D-020-C: ai_triggered column — AI advisory flag only ✓';
RAISE NOTICE '  D-020-D: Immutability trigger + RLS DENY on logs ✓';
RAISE NOTICE '  RLS var:  app.org_id (never app.tenant_id) ✓';
RAISE NOTICE '══════════════════════════════════════════════════════════════';
END;
$$;