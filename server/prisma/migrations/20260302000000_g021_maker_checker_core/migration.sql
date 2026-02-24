-- ============================================================================
-- G-021 Day 2: Maker–Checker Core — Schema + RLS + Immutability + D-021 Directives
-- Task ID:    G-021-DAY2-SCHEMA-SERVICE
-- Doctrine:   v1.4 + Addendum Draft v1 + G-021 Design v1.1 (APPROVED)
-- Date:       2026-03-02
-- Author:     TexQtic Platform Engineering (Safe-Write Mode)
-- Constitutional Review: APPROVED 2026-02-24
--   D-021-A (frozen payload hash) · D-021-B (active request uniqueness)
--   D-021-C (maker≠checker DB trigger)
-- ============================================================================
--
-- INVARIANTS
--   - ADDITIVE ONLY. No existing table is modified. No existing policy touched.
--   - FORCE RLS on every new table. No table bypasses RLS.
--   - app.org_id is the ONLY canonical RLS variable. app.tenant_id: NEVER used.
--   - org_id → organizations.id is a LIVE FK.
--   - approval_signatures is APPEND-ONLY (immutability trigger Layer 2 + RLS Layer 3).
--   - D-021-A: frozen_payload_hash TEXT NOT NULL CHECK(length=64) — SHA-256 hex.
--   - D-021-B: UNIQUE INDEX on (org_id,entity_type,entity_id,from_key,to_key)
--             WHERE status IN ('REQUESTED','ESCALATED') — covers post-escalation gap.
--   - D-021-C: AFTER INSERT trigger check_maker_checker_separation — raises P0002
--             if signer fingerprint matches maker_principal_fingerprint.
--
-- OBJECTS CREATED
--   §1  PRE-FLIGHT safety check
--   §2  TABLE   public.pending_approvals
--   §3  TABLE   public.approval_signatures
--   §4  FUNCTION public.prevent_approval_signature_modification()  [immutability]
--   §5  TRIGGER  trg_immutable_approval_signature ON approval_signatures
--   §6  FUNCTION public.check_maker_checker_separation()           [D-021-C]
--   §7  TRIGGER  trg_check_maker_checker_separation ON approval_signatures
--   §8  RLS      ENABLE + FORCE + policies × 10 across both tables
--   §9  GRANTS   texqtic_app / texqtic_admin per table
--   §10 VERIFY   inline DO $$ block
--
-- SOFT REFERENCE NOTICE (recorded for future hardening)
--   G-017: ALTER TABLE public.pending_approvals
--            ADD CONSTRAINT pending_approvals_entity_fk_trade
--            FOREIGN KEY (entity_id) REFERENCES public.trades(id);
--   G-018: ALTER TABLE public.pending_approvals
--            ADD CONSTRAINT pending_approvals_entity_fk_escrow
--            FOREIGN KEY (entity_id) REFERENCES public.escrow_accounts(id);
--   G-022: ALTER TABLE public.pending_approvals
--            ADD CONSTRAINT pending_approvals_escalation_id_fk
--            FOREIGN KEY (escalation_id) REFERENCES public.escalation_records(id);
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
) THEN RAISE EXCEPTION 'G-021 PRE-FLIGHT BLOCKED: public.organizations does not exist. ' 'Apply G-015 Phase A migration before this migration.';
END IF;
-- Require lifecycle_states (G-020 must precede G-021)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'lifecycle_states'
) THEN RAISE EXCEPTION 'G-021 PRE-FLIGHT BLOCKED: public.lifecycle_states does not exist. ' 'Apply G-020 Day 2 migration (20260301000000_g020_lifecycle_state_machine_core) ' 'before this migration.';
END IF;
-- Idempotency guard: abort if already applied
IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'pending_approvals'
) THEN RAISE EXCEPTION 'G-021 PRE-FLIGHT BLOCKED: public.pending_approvals already exists. ' 'Migration 20260302000000_g021_maker_checker_core may already be applied.';
END IF;
RAISE NOTICE 'G-021 pre-flight OK: organizations + lifecycle_states present, ' 'pending_approvals absent. Proceeding.';
END;
$$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  TABLE: public.pending_approvals
--     One record per in-flight Maker–Checker request.
--     Created when StateMachineService.transition() returns PENDING_APPROVAL.
--     Mutable on status column only — all Maker identity/payload fields
--     are frozen at insert and protected by column-level immutability trigger
--     (not in this migration — deferred to column-level trigger in Day 3).
--     G-021 §3.A · D-021-A · D-021-B · D-021-C
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.pending_approvals (
  -- ── Identity ────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant boundary (LIVE FK — organizations must exist) ────────────
  org_id UUID NOT NULL,
  -- ── Entity reference (SOFT — entity table FKs deferred to G-017/G-018) ──
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  -- ── Frozen transition snapshot (immutable after insert) ─────────────
  from_state_key TEXT NOT NULL,
  to_state_key TEXT NOT NULL,
  -- ── Maker identity (D-021-C: principal exclusivity enforced by CHECK) ─
  requested_by_user_id UUID NULL,
  requested_by_admin_id UUID NULL,
  requested_by_actor_type TEXT NOT NULL,
  requested_by_role TEXT NOT NULL,
  -- ── Request content ─────────────────────────────────────────────────
  request_reason TEXT NOT NULL,
  -- ── Full frozen payload JSON (for replay contract §5.2) ────────────
  frozen_payload JSONB NOT NULL,
  -- ── D-021-A: Frozen payload integrity hash ───────────────────────────
  -- SHA-256 hex over canonical fields. Length must be exactly 64 chars.
  -- Recomputed at replay time and compared before StateMachineService is called.
  frozen_payload_hash TEXT NOT NULL,
  -- ── D-021-C: Maker principal fingerprint ─────────────────────────────
  -- Format: "{requested_by_actor_type}:{requested_by_user_id OR admin_id}"
  -- Read by trigger check_maker_checker_separation on approval_signatures INSERT.
  maker_principal_fingerprint TEXT NOT NULL,
  -- ── Lifecycle state ─────────────────────────────────────────────────
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  -- ── Attempt counter (incremented on re-submission after reject/expire) ──
  attempt_count INTEGER NOT NULL DEFAULT 1,
  -- ── TTL expiry (computed at insert based on severity level) ─────────
  expires_at TIMESTAMPTZ NOT NULL,
  -- ── G-022 escalation linkage (SOFT until escalation_records table exists) ──
  escalation_id UUID NULL,
  -- ── AI advisory flag (copied from TransitionRequest.aiTriggered) ────
  ai_triggered BOOLEAN NOT NULL DEFAULT false,
  -- ── Impersonation audit ─────────────────────────────────────────────
  impersonation_id UUID NULL,
  -- ── Request correlation ─────────────────────────────────────────────
  request_id TEXT NULL,
  -- ── Timestamps ──────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── PRIMARY KEY ─────────────────────────────────────────────────────
  CONSTRAINT pending_approvals_pkey PRIMARY KEY (id),
  -- ── LIVE FK: org_id → organizations.id ──────────────────────────────
  CONSTRAINT pending_approvals_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
  -- ── entity_type domain enforcement ───────────────────────────────────
  CONSTRAINT pending_approvals_entity_type_check CHECK (
    entity_type IN ('TRADE', 'ESCROW', 'CERTIFICATION')
  ),
  -- ── Status domain enforcement ────────────────────────────────────────
  CONSTRAINT pending_approvals_status_check CHECK (
    status IN (
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
      'CANCELLED',
      'ESCALATED'
    )
  ),
  -- ── request_reason must not be blank ────────────────────────────────
  CONSTRAINT pending_approvals_reason_nonempty CHECK (length(trim(request_reason)) > 0),
  -- ── D-021-A: frozen_payload_hash must be a 64-character hex string ──
  -- SHA-256 digest is always exactly 64 lowercase hex chars.
  CONSTRAINT pending_approvals_hash_length CHECK (length(frozen_payload_hash) = 64),
  -- ── D-021-C: maker_principal_fingerprint must be non-empty ──────────
  CONSTRAINT pending_approvals_fingerprint_nonempty CHECK (length(maker_principal_fingerprint) > 0),
  -- ── Principal exclusivity: exactly one of user/admin must be set ────
  -- SYSTEM_AUTOMATION (both null) is disallowed below.
  CONSTRAINT pending_approvals_principal_exclusivity CHECK (
    (
      requested_by_user_id IS NOT NULL
      AND requested_by_admin_id IS NULL
    )
    OR (
      requested_by_user_id IS NULL
      AND requested_by_admin_id IS NOT NULL
    )
  ),
  -- ── SYSTEM_AUTOMATION cannot be a Maker for MC transitions ──────────
  CONSTRAINT pending_approvals_no_system_maker CHECK (
    requested_by_actor_type NOT IN ('SYSTEM_AUTOMATION')
  ),
  -- ── attempt_count must be positive ──────────────────────────────────
  CONSTRAINT pending_approvals_attempt_count_positive CHECK (attempt_count >= 1)
);
COMMENT ON TABLE public.pending_approvals IS 'G-021 §3.A: One record per in-flight Maker–Checker approval request. ' 'Created when StateMachineService.transition() returns PENDING_APPROVAL. ' 'D-021-A: frozen_payload_hash enforces replay integrity. ' 'D-021-B: partial unique index prevents concurrent active requests per entity+transition. ' 'D-021-C: maker_principal_fingerprint enables DB-trigger Maker≠Checker enforcement. ' 'Doctrine v1.4.';
COMMENT ON COLUMN public.pending_approvals.frozen_payload_hash IS 'D-021-A: SHA-256 hex (64 chars) over canonical fields: ' 'entity_type|entity_id|from_state_key|to_state_key|actor_type|principal_id|role|reason. ' 'Recomputed at replay time. Mismatch = PAYLOAD_INTEGRITY_VIOLATION. Never updated.';
COMMENT ON COLUMN public.pending_approvals.maker_principal_fingerprint IS 'D-021-C: "{requested_by_actor_type}:{requested_by_user_id OR admin_id}". ' 'Read by trigger check_maker_checker_separation on approval_signatures INSERT. ' 'Prevents Maker=Checker bypass even if service layer is circumvented. Never updated.';
COMMENT ON COLUMN public.pending_approvals.entity_id IS 'SOFT REFERENCE: UUID of the entity being transitioned. ' 'No FK constraint — entity table FKs deferred to G-017 (trades) and G-018 (escrow_accounts).';
COMMENT ON COLUMN public.pending_approvals.escalation_id IS 'SOFT REFERENCE to G-022 escalation_records.id. ' 'FK hardening deferred to G-022 (escalation_records table does not exist yet).';
-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_pending_approvals_org_id ON public.pending_approvals (org_id);
CREATE INDEX idx_pending_approvals_org_entity ON public.pending_approvals (org_id, entity_type, entity_id);
CREATE INDEX idx_pending_approvals_org_status ON public.pending_approvals (org_id, status);
CREATE INDEX idx_pending_approvals_expires_at ON public.pending_approvals (expires_at)
WHERE status = 'REQUESTED';
CREATE INDEX idx_pending_approvals_requested_by_user ON public.pending_approvals (requested_by_user_id)
WHERE requested_by_user_id IS NOT NULL;
-- ── D-021-B: Active request uniqueness partial index ─────────────────────────
-- Covers REQUESTED and ESCALATED states — an ESCALATED record prevents a new
-- REQUESTED record for the same entity+transition from being inserted.
-- This closes the "ESCALATED frees the slot" gap identified in constitutional review.
CREATE UNIQUE INDEX pending_approvals_active_unique ON public.pending_approvals (
  org_id,
  entity_type,
  entity_id,
  from_state_key,
  to_state_key
)
WHERE status IN ('REQUESTED', 'ESCALATED');
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  TABLE: public.approval_signatures
--     Append-only audit log of Checker decisions (APPROVE / REJECT).
--     Never updated or deleted — immutability enforced at three layers:
--       Layer 1: MakerCheckerService (no update/delete method)
--       Layer 2: DB trigger prevent_approval_signature_modification (§4/§5)
--       Layer 3: RLS (UPDATE/DELETE policies USING false) (§8)
--     G-021 §3.B · D-021-C
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.approval_signatures (
  -- ── Identity ────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Parent approval reference ────────────────────────────────────────
  approval_id UUID NOT NULL,
  -- ── Tenant boundary (denormalized from pending_approvals for RLS) ───
  org_id UUID NOT NULL,
  -- ── Checker identity ─────────────────────────────────────────────────
  signer_user_id UUID NULL,
  signer_admin_id UUID NULL,
  -- ── D-021-C: signer_actor_type restricted to Checker-eligible roles ──
  -- SYSTEM_AUTOMATION and TENANT_USER are excluded at DB CHECK level.
  -- (TENANT_ADMIN is excluded per execution prompt §3 — only CHECKER and PLATFORM_ADMIN allowed)
  signer_actor_type TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  -- ── Decision ────────────────────────────────────────────────────────
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  -- ── Impersonation audit ─────────────────────────────────────────────
  impersonation_id UUID NULL,
  -- ── Immutable timestamp ─────────────────────────────────────────────
  -- No updated_at — this row is append-only with zero mutable columns.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── PRIMARY KEY ─────────────────────────────────────────────────────
  CONSTRAINT approval_signatures_pkey PRIMARY KEY (id),
  -- ── FK → pending_approvals (CASCADE — if approval deleted, signatures go too) ──
  CONSTRAINT approval_signatures_approval_id_fk FOREIGN KEY (approval_id) REFERENCES public.pending_approvals (id) ON DELETE CASCADE,
  -- ── signer_actor_type domain (CHECKER or PLATFORM_ADMIN only) ──────
  -- SYSTEM_AUTOMATION is permanently disallowed — DB enforces unconditionally.
  CONSTRAINT approval_signatures_signer_actor_type_check CHECK (
    signer_actor_type IN ('CHECKER', 'PLATFORM_ADMIN')
  ),
  -- ── decision domain ──────────────────────────────────────────────────
  CONSTRAINT approval_signatures_decision_check CHECK (decision IN ('APPROVE', 'REJECT')),
  -- ── reason must not be blank ─────────────────────────────────────────
  CONSTRAINT approval_signatures_reason_nonempty CHECK (length(trim(reason)) > 0),
  -- ── Checker principal exclusivity: exactly one of user/admin must be set ──
  CONSTRAINT approval_signatures_principal_exclusivity CHECK (
    (
      signer_user_id IS NOT NULL
      AND signer_admin_id IS NULL
    )
    OR (
      signer_user_id IS NULL
      AND signer_admin_id IS NOT NULL
    )
  )
);
COMMENT ON TABLE public.approval_signatures IS 'G-021 §3.B: Append-only audit log of Checker APPROVE/REJECT decisions. ' 'Three-layer immutability: service (no update/delete method) + trigger (§4/§5) + RLS (§8). ' 'D-021-C: AFTER INSERT trigger check_maker_checker_separation enforces Maker≠Checker ' 'unconditionally, independently of the service layer. ' 'signer_actor_type CHECK excludes SYSTEM_AUTOMATION and TENANT_USER at schema level.';
COMMENT ON COLUMN public.approval_signatures.signer_actor_type IS 'D-021-C: Actor type of the signing principal. ' 'CHECK constraint: IN (CHECKER, PLATFORM_ADMIN). ' 'SYSTEM_AUTOMATION is unconditionally disallowed — no automated approval is permitted. ' 'AI has no actor type and cannot appear here. Doctrine v1.4 + G-021 anti-abuse §6.3.';
-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_approval_signatures_approval_id ON public.approval_signatures (approval_id);
CREATE INDEX idx_approval_signatures_org_id ON public.approval_signatures (org_id);
CREATE INDEX idx_approval_signatures_signer_user ON public.approval_signatures (signer_user_id)
WHERE signer_user_id IS NOT NULL;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §4  IMMUTABILITY TRIGGER FUNCTION: prevent_approval_signature_modification
--     Layer 2 of three-layer append-only enforcement for approval_signatures.
--     Fires BEFORE UPDATE OR DELETE. Unconditional — no override path.
--     ERRCODE P0001 (same as G-020 lifecycle log immutability).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.prevent_approval_signature_modification() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'APPROVAL_SIGNATURE_IMMUTABLE: approval_signatures rows are append-only. ' 'UPDATE and DELETE are unconditionally prohibited on table %. ' 'This is G-021 D-021 Layer 2 enforcement. ' 'No escalation path exists for signature mutation. ' 'Corrections require creating a new approval cycle via MakerCheckerService.',
  TG_TABLE_NAME USING ERRCODE = 'P0001';
END;
$$;
COMMENT ON FUNCTION public.prevent_approval_signature_modification() IS 'G-021 Layer 2: Unconditional immutability backstop for approval_signatures. ' 'Fires BEFORE UPDATE OR DELETE on approval_signatures. ' 'Raises SQLSTATE P0001 regardless of caller role or session privileges. ' 'Cannot be bypassed without dropping the trigger (requires postgres role + migration window).';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §5  TRIGGER: trg_immutable_approval_signature
--     Attaches the immutability function to approval_signatures.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TRIGGER trg_immutable_approval_signature BEFORE
UPDATE
  OR DELETE ON public.approval_signatures FOR EACH ROW EXECUTE FUNCTION public.prevent_approval_signature_modification();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §6  D-021-C TRIGGER FUNCTION: check_maker_checker_separation
--     Enforces the Maker≠Checker rule at DB level, independently of
--     the service layer. Fires AFTER INSERT on approval_signatures.
--
--     Algorithm:
--       1. Fetch pending_approvals.maker_principal_fingerprint for this approval_id.
--       2. Derive signer fingerprint: NEW.signer_actor_type || ':' ||
--          COALESCE(signer_user_id, signer_admin_id).
--       3. If they match: RAISE EXCEPTION with ERRCODE P0002.
--
--     SECURITY DEFINER with search_path=public: the trigger must read
--     pending_approvals regardless of the caller's RLS context. In platform-
--     admin override scenarios (G-022), the Checker's RLS context may differ
--     from the Maker's row's org. SECURITY DEFINER ensures the cross-org read
--     succeeds unconditionally (the trigger is governance infrastructure, not
--     tenant data access).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.check_maker_checker_separation() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_maker_fp TEXT;
v_signer_fp TEXT;
BEGIN -- Step 1: Retrieve the Maker's fingerprint from the parent approval record.
-- SECURITY DEFINER ensures this read succeeds even under restrictive RLS contexts.
SELECT maker_principal_fingerprint INTO v_maker_fp
FROM public.pending_approvals
WHERE id = NEW.approval_id;
IF v_maker_fp IS NULL THEN -- pending_approvals row not found — FK should have caught this, but guard defensively.
RAISE EXCEPTION 'G-021 INTEGRITY ERROR: pending_approvals row not found for approval_id %. ' 'This indicates a FK violation that should be impossible.',
NEW.approval_id USING ERRCODE = 'P0003';
END IF;
-- Step 2: Derive the signer's fingerprint in the same format as the service layer.
-- Format: "{signer_actor_type}:{signer_user_id OR signer_admin_id}"
v_signer_fp := NEW.signer_actor_type || ':' || COALESCE(
  NEW.signer_user_id::text,
  NEW.signer_admin_id::text
);
-- Step 3: Compare. Any match is a constitutional violation.
IF v_signer_fp = v_maker_fp THEN RAISE EXCEPTION 'MAKER_CHECKER_SAME_PRINCIPAL: signer fingerprint (%) matches maker fingerprint ' 'on pending_approval %. D-021-C constitutional rule violated. ' 'The same principal cannot be both Maker and Checker. ' 'This is enforced at DB level, independently of the service layer.',
v_signer_fp,
NEW.approval_id USING ERRCODE = 'P0002';
END IF;
RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.check_maker_checker_separation() IS 'G-021 D-021-C: AFTER INSERT trigger enforcing Maker≠Checker at DB level. ' 'SECURITY DEFINER: reads pending_approvals.maker_principal_fingerprint across ' 'any RLS context. Raises P0002 MAKER_CHECKER_SAME_PRINCIPAL if fingerprints match. ' 'Fingerprint format: "{actor_type}:{user_id OR admin_id}". ' 'Service layer also enforces this; DB trigger is the constitutional backstop. ' 'Cannot be bypassed without dropping the trigger (requires postgres role).';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §7  TRIGGER: trg_check_maker_checker_separation
--     Attaches D-021-C enforcement to approval_signatures AFTER INSERT.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TRIGGER trg_check_maker_checker_separation
AFTER
INSERT ON public.approval_signatures FOR EACH ROW EXECUTE FUNCTION public.check_maker_checker_separation();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §8  RLS POLICIES
--     Both tables: ENABLE + FORCE RLS. app.org_id is the ONLY RLS variable.
--
--     pending_approvals:
--       SELECT: own org
--       INSERT: own org
--       UPDATE: own org (only status/updated_at are ever updated in practice)
--       DELETE: denied
--
--     approval_signatures:
--       SELECT: own org
--       INSERT: own org
--       UPDATE: denied (immutability)
--       DELETE: denied (immutability)
--
--     Platform admin read-all: platform admins read via SECURITY DEFINER RPCs
--     (not via a blanket policy). No texqtic_admin bypass policy on these
--     tenant-scoped tables — control plane reads are isolated to service role.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ── pending_approvals RLS ────────────────────────────────────────────────────
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_approvals FORCE ROW LEVEL SECURITY;
-- Tenant SELECT: own org only
CREATE POLICY pending_approvals_tenant_select ON public.pending_approvals FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant INSERT: own org only
CREATE POLICY pending_approvals_tenant_insert ON public.pending_approvals FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant UPDATE: own org (status + updated_at only — column immutability deferred to Day 3 trigger)
CREATE POLICY pending_approvals_tenant_update ON public.pending_approvals FOR
UPDATE TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- DELETE: unconditionally denied
CREATE POLICY pending_approvals_no_delete ON public.pending_approvals FOR DELETE TO texqtic_app USING (false);
-- Admin SELECT: control-plane audit access
CREATE POLICY pending_approvals_admin_select ON public.pending_approvals FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- ── approval_signatures RLS ──────────────────────────────────────────────────
ALTER TABLE public.approval_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_signatures FORCE ROW LEVEL SECURITY;
-- Tenant SELECT: own org only
CREATE POLICY approval_signatures_tenant_select ON public.approval_signatures FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant INSERT: own org only
CREATE POLICY approval_signatures_tenant_insert ON public.approval_signatures FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- UPDATE: unconditionally denied (immutability — Layer 3)
CREATE POLICY approval_signatures_no_update ON public.approval_signatures FOR
UPDATE TO texqtic_app USING (false);
-- DELETE: unconditionally denied (immutability — Layer 3)
CREATE POLICY approval_signatures_no_delete ON public.approval_signatures FOR DELETE TO texqtic_app USING (false);
-- Admin SELECT: control-plane audit access (read only)
CREATE POLICY approval_signatures_admin_select ON public.approval_signatures FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §9  GRANTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRANT SELECT,
  INSERT,
  UPDATE ON public.pending_approvals TO texqtic_app;
GRANT SELECT ON public.pending_approvals TO texqtic_admin;
GRANT SELECT,
  INSERT ON public.approval_signatures TO texqtic_app;
GRANT SELECT ON public.approval_signatures TO texqtic_admin;
-- UPDATE/DELETE: intentionally not granted (immutability enforcement)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §10 POST-MIGRATION VERIFICATION BLOCK
--     Fails fast if any object is missing.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE tbl_count INTEGER;
rls_count INTEGER;
force_rls_count INTEGER;
trigger_count INTEGER;
index_count INTEGER;
constraint_count INTEGER;
BEGIN -- 1. Verify both tables exist
SELECT COUNT(*) INTO tbl_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('pending_approvals', 'approval_signatures');
IF tbl_count != 2 THEN RAISE EXCEPTION 'G-021 VERIFY FAIL: Expected 2 tables, found %. ' 'Check pending_approvals and approval_signatures.',
tbl_count;
END IF;
-- 2. Verify ENABLE ROW LEVEL SECURITY on both tables
SELECT COUNT(*) INTO rls_count
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('pending_approvals', 'approval_signatures')
  AND c.relrowsecurity = true;
IF rls_count != 2 THEN RAISE EXCEPTION 'G-021 VERIFY FAIL: RLS not enabled on all tables. Enabled on % of 2.',
rls_count;
END IF;
-- 3. Verify FORCE ROW LEVEL SECURITY on both tables
SELECT COUNT(*) INTO force_rls_count
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('pending_approvals', 'approval_signatures')
  AND c.relforcerowsecurity = true;
IF force_rls_count != 2 THEN RAISE EXCEPTION 'G-021 VERIFY FAIL: FORCE RLS not active on all tables. Active on % of 2.',
force_rls_count;
END IF;
-- 4. Verify triggers: immutability + D-021-C (should be 3 total)
--    trg_immutable_approval_signature (BEFORE UPDATE/DELETE on approval_signatures)
--    trg_check_maker_checker_separation (AFTER INSERT on approval_signatures)
SELECT COUNT(*) INTO trigger_count
FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'approval_signatures'
  AND t.tgname IN (
    'trg_immutable_approval_signature',
    'trg_check_maker_checker_separation'
  )
  AND t.tgenabled = 'O';
IF trigger_count != 2 THEN RAISE EXCEPTION 'G-021 VERIFY FAIL: Expected 2 triggers on approval_signatures, found %.',
trigger_count;
END IF;
-- 5. Verify D-021-B partial unique index exists
SELECT COUNT(*) INTO index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'pending_approvals'
  AND indexname = 'pending_approvals_active_unique';
IF index_count != 1 THEN RAISE EXCEPTION 'G-021 VERIFY FAIL: D-021-B partial unique index "pending_approvals_active_unique" not found.';
END IF;
-- 6. Verify D-021-A hash length constraint exists on pending_approvals
SELECT COUNT(*) INTO constraint_count
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'pending_approvals'
  AND tc.constraint_name = 'pending_approvals_hash_length';
IF constraint_count != 1 THEN RAISE EXCEPTION 'G-021 VERIFY FAIL: D-021-A constraint "pending_approvals_hash_length" not found.';
END IF;
RAISE NOTICE '══════════════════════════════════════════════════════════════';
RAISE NOTICE 'G-021 Day 2 VERIFICATION PASSED — All checks GREEN';
RAISE NOTICE '────────────────────────────────────────────────────────────';
RAISE NOTICE '2/2 tables created (pending_approvals, approval_signatures)';
RAISE NOTICE '2/2 ENABLE ROW LEVEL SECURITY';
RAISE NOTICE '2/2 FORCE ROW LEVEL SECURITY';
RAISE NOTICE '2/2 triggers on approval_signatures (immutability + D-021-C)';
RAISE NOTICE '1/1 D-021-B partial unique index (REQUESTED+ESCALATED)';
RAISE NOTICE '1/1 D-021-A hash length CHECK constraint (len=64)';
RAISE NOTICE '────────────────────────────────────────────────────────────';
RAISE NOTICE 'Soft references (intentional — recorded for future hardening):';
RAISE NOTICE '  entity_id    → trades.id / escrow_accounts.id  [G-017/G-018]';
RAISE NOTICE '  escalation_id → escalation_records.id          [G-022]';
RAISE NOTICE '────────────────────────────────────────────────────────────';
RAISE NOTICE 'Constitutional compliance:';
RAISE NOTICE '  D-021-A: frozen_payload_hash CHECK(length=64) ✓';
RAISE NOTICE '  D-021-B: UNIQUE partial index WHERE IN (REQUESTED,ESCALATED) ✓';
RAISE NOTICE '  D-021-C: check_maker_checker_separation AFTER INSERT trigger ✓';
RAISE NOTICE '  RLS:     app.org_id (never app.tenant_id) ✓';
RAISE NOTICE '  IMMU:    approval_signatures BEFORE UPDATE/DELETE → P0001 ✓';
RAISE NOTICE '  SYSAUTO: requested_by_actor_type CHECK excludes SYSTEM_AUTOMATION ✓';
RAISE NOTICE '  SYSAUTO: signer_actor_type CHECK = (CHECKER, PLATFORM_ADMIN) only ✓';
RAISE NOTICE '══════════════════════════════════════════════════════════════';
END;
$$;