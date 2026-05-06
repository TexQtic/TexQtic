-- ============================================================================
-- TEXQTIC-NC-PHASE1-STATEMACHINE-001: Network Commerce Lifecycle Log Foundation
-- Migration: 20260520000000_nc_network_lifecycle_logs
-- Date     : 2026-05-20
-- Doctrine : v1.4
-- Risk     : 🟡 MEDIUM — additive only; no existing table mutation beyond CHECK constraint expansion
--
-- Goals:
--   1. Expand lifecycle_states.entity_type CHECK to include POOL, SYNDICATE, VCO_CHAIN
--      (DROP old constraint + ADD new — same reversible pattern as GAP-ORDER-LC-001).
--   2. Expand allowed_transitions.entity_type CHECK to include POOL, SYNDICATE, VCO_CHAIN
--      (same approach).
--   3. CREATE TABLE public.network_lifecycle_logs — immutable, polymorphic audit log
--      for NC entity lifecycle transitions (POOL, SYNDICATE, VCO_CHAIN).
--      Uses (entity_type, entity_id) polymorphic key instead of a domain-specific FK.
--      Follows canonical TradeLifecycleLog/EscrowLifecycleLog schema (23-field pattern).
--   4. Apply RLS: ENABLE + FORCE; 5-policy set (tenant SELECT/INSERT, admin SELECT,
--      immutable UPDATE/DELETE USING false). Same Wave 3 pattern as trade_lifecycle_logs.
--   5. Grant minimal privileges: texqtic_app (SELECT, INSERT), texqtic_admin (SELECT).
--   6. Add immutability trigger using EXISTING prevent_lifecycle_log_update_delete()
--      function (created by G-020; DO NOT recreate).
--
-- BEFORE:
--   lifecycle_states.entity_type CHECK  — ARRAY['TRADE','ESCROW','CERTIFICATION','ORDER']
--   allowed_transitions.entity_type CHECK — ARRAY['TRADE','ESCROW','CERTIFICATION','ORDER']
--   network_lifecycle_logs — does not exist
--
-- AFTER:
--   lifecycle_states.entity_type CHECK  — includes POOL, SYNDICATE, VCO_CHAIN
--   allowed_transitions.entity_type CHECK — includes POOL, SYNDICATE, VCO_CHAIN
--   network_lifecycle_logs — created; FORCE RLS; 5-policy set; immutability trigger live
-- ============================================================================
BEGIN;
-- ─────────────────────────────────────────────────────────────────────────────
-- §1  Pre-flight guard: abort if network_lifecycle_logs already exists
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_lifecycle_logs'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_lifecycle_logs already exists. ' 'This migration has already been applied or the table was created out-of-band. ' 'Halting to prevent double-application.';
END IF;
END $$;
-- ─────────────────────────────────────────────────────────────────────────────
-- §2  Expand lifecycle_states.entity_type CHECK to include NC entity types
-- Strategy: DROP named constraint + ADD new constraint with extended array.
-- Reversible (unlike enum ADD VALUE). Pattern follows GAP-ORDER-LC-001.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.lifecycle_states DROP CONSTRAINT IF EXISTS lifecycle_states_entity_type_check;
ALTER TABLE public.lifecycle_states
ADD CONSTRAINT lifecycle_states_entity_type_check CHECK (
    entity_type = ANY (
      ARRAY [
      'TRADE'::text,
      'ESCROW'::text,
      'CERTIFICATION'::text,
      'ORDER'::text,
      'POOL'::text,
      'SYNDICATE'::text,
      'VCO_CHAIN'::text
    ]
    )
  );
-- ─────────────────────────────────────────────────────────────────────────────
-- §3  Expand allowed_transitions.entity_type CHECK to include NC entity types
-- Same DROP + recreate approach.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.allowed_transitions DROP CONSTRAINT IF EXISTS allowed_transitions_entity_type_check;
ALTER TABLE public.allowed_transitions
ADD CONSTRAINT allowed_transitions_entity_type_check CHECK (
    entity_type = ANY (
      ARRAY [
      'TRADE'::text,
      'ESCROW'::text,
      'CERTIFICATION'::text,
      'ORDER'::text,
      'POOL'::text,
      'SYNDICATE'::text,
      'VCO_CHAIN'::text
    ]
    )
  );
-- ─────────────────────────────────────────────────────────────────────────────
-- §4  TABLE: public.network_lifecycle_logs
-- Polymorphic lifecycle audit log for NC entities (POOL, SYNDICATE, VCO_CHAIN).
-- Follows canonical trade_lifecycle_logs / escrow_lifecycle_logs schema (G-020).
-- Key divergence: uses (entity_type TEXT, entity_id UUID) instead of trade_id/escrow_id.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.network_lifecycle_logs (
  -- ── Identity ──────────────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant / RLS boundary ─────────────────────────────────────────────────
  -- Live FK → organizations.id (G-015). RLS boundary: current_setting('app.org_id', true)
  -- For POOL transitions, org_id is the pool owner/admin org.
  org_id UUID NOT NULL,
  -- ── Polymorphic entity reference ──────────────────────────────────────────
  -- Domain discriminant: POOL | SYNDICATE | VCO_CHAIN
  entity_type TEXT NOT NULL,
  -- SOFT REFERENCE: UUID of the NC entity being transitioned.
  -- No FK enforced — NC entity tables (pools, syndicates, vco_chains) land in later packets.
  entity_id UUID NOT NULL,
  -- ── Lifecycle state keys ──────────────────────────────────────────────────
  -- Match lifecycle_states.state_key for the corresponding entity_type
  from_state_key TEXT NOT NULL,
  to_state_key TEXT NOT NULL,
  -- ── Actor fields (D-020-A) ────────────────────────────────────────────────
  -- UUID of the tenant user who triggered this transition (null for SYSTEM_AUTOMATION)
  actor_user_id UUID NULL,
  -- UUID of the platform admin who triggered this transition (null for user/system)
  actor_admin_id UUID NULL,
  -- G-020 D-020-A canonical enum: TENANT_USER | TENANT_ADMIN | PLATFORM_ADMIN | SYSTEM_AUTOMATION | MAKER | CHECKER
  actor_type TEXT NOT NULL,
  -- Role snapshot at time of transition (not a live FK)
  actor_role TEXT NOT NULL,
  -- ── Maker-Checker fields (G-021) ──────────────────────────────────────────
  -- G-021: escalation severity level (1–4), null if not an escalated transition
  escalation_level SMALLINT NULL,
  -- G-021: UUID of the Maker user in a Maker-Checker flow (null if no MC)
  maker_user_id UUID NULL,
  -- G-021: UUID of the Checker user in a Maker-Checker flow (null if no MC)
  checker_user_id UUID NULL,
  -- ── AI provenance (D-020-C) ───────────────────────────────────────────────
  -- true if an AI recommendation preceded this human-confirmed transition
  ai_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  -- ── Impersonation audit ───────────────────────────────────────────────────
  -- UUID of the ImpersonationSession if transition occurred during platform impersonation
  impersonation_id UUID NULL,
  -- ── Mandatory justification (D-020-D) ────────────────────────────────────
  -- Non-empty enforced by DB CHECK; required even for SYSTEM_AUTOMATION
  reason TEXT NOT NULL,
  -- ── Request correlation ───────────────────────────────────────────────────
  -- Fastify request ID for correlation (null for background job transitions)
  request_id TEXT NULL,
  -- ── Immutable wall-clock timestamp ───────────────────────────────────────
  -- Set by DB at commit time — caller MUST NOT supply a value
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Primary key ──────────────────────────────────────────────────────────
  CONSTRAINT network_lifecycle_logs_pkey PRIMARY KEY (id),
  -- ── Entity type domain guard ─────────────────────────────────────────────
  CONSTRAINT network_lifecycle_logs_entity_type_check CHECK (
    entity_type = ANY (
      ARRAY [
      'POOL'::text,
      'SYNDICATE'::text,
      'VCO_CHAIN'::text
    ]
    )
  ),
  -- ── Actor type domain guard (D-020-A) ────────────────────────────────────
  CONSTRAINT network_lifecycle_logs_actor_type_check CHECK (
    actor_type = ANY (
      ARRAY [
      'TENANT_USER'::text,
      'TENANT_ADMIN'::text,
      'PLATFORM_ADMIN'::text,
      'SYSTEM_AUTOMATION'::text,
      'MAKER'::text,
      'CHECKER'::text
    ]
    )
  ),
  -- ── Actor principal mutual exclusivity (D-020-A) ─────────────────────────
  -- At most one of actor_user_id / actor_admin_id may be non-null
  CONSTRAINT network_lifecycle_logs_actor_principal_check CHECK (
    (
      actor_user_id IS NULL
      OR actor_admin_id IS NULL
    )
  ),
  -- ── Escalation level domain guard (G-022) ────────────────────────────────
  CONSTRAINT network_lifecycle_logs_escalation_level_check CHECK (
    escalation_level IS NULL
    OR escalation_level BETWEEN 1 AND 4
  ),
  -- ── Reason non-empty guard (D-020-D) ─────────────────────────────────────
  CONSTRAINT network_lifecycle_logs_reason_nonempty CHECK (length(trim(reason)) > 0),
  -- ── Tenant FK (live) ─────────────────────────────────────────────────────
  CONSTRAINT network_lifecycle_logs_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);
-- ─────────────────────────────────────────────────────────────────────────────
-- §5  Indexes
-- ─────────────────────────────────────────────────────────────────────────────
-- Primary RLS boundary access pattern: tenant reads by org_id
CREATE INDEX idx_network_lifecycle_logs_org_id ON public.network_lifecycle_logs (org_id);
-- Entity-scoped list (tenant-aware): org_id + entity_type + entity_id
CREATE INDEX idx_network_lifecycle_logs_org_entity ON public.network_lifecycle_logs (org_id, entity_type, entity_id);
-- Entity timeline: org + entity + descending created_at for chronological log views
CREATE INDEX idx_network_lifecycle_logs_org_entity_created ON public.network_lifecycle_logs (org_id, entity_type, entity_id, created_at DESC);
-- State funnel query: all logs arriving at a given state (cross-org analytics, admin only)
CREATE INDEX idx_network_lifecycle_logs_to_state ON public.network_lifecycle_logs (to_state_key);
-- Entity lookup without org_id (joins, admin cross-tenant queries)
CREATE INDEX idx_network_lifecycle_logs_entity ON public.network_lifecycle_logs (entity_type, entity_id);
-- ─────────────────────────────────────────────────────────────────────────────
-- §6  Row-Level Security
-- All access scoped by org_id (tenant) or is_admin flag (control-plane).
-- Follows Wave 3 Tail RLS pattern from G-020 / GAP-ORDER-LC-001.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.network_lifecycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_lifecycle_logs FORCE ROW LEVEL SECURITY;
-- Tenant SELECT: requires app.org_id GUC to be set; scopes by org_id
CREATE POLICY network_lifecycle_logs_tenant_select ON public.network_lifecycle_logs FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Tenant INSERT: same org_id guard (prevents one tenant from writing another's log)
CREATE POLICY network_lifecycle_logs_tenant_insert ON public.network_lifecycle_logs FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND org_id::text = current_setting('app.org_id', true)
  );
-- Immutability Layer 1 — RLS: UPDATE unconditionally blocked for tenant role
CREATE POLICY network_lifecycle_logs_no_update ON public.network_lifecycle_logs FOR
UPDATE TO texqtic_app USING (false);
-- Immutability Layer 1 — RLS: DELETE unconditionally blocked for tenant role
CREATE POLICY network_lifecycle_logs_no_delete ON public.network_lifecycle_logs FOR DELETE TO texqtic_app USING (false);
-- Control-plane admin SELECT: requires app.is_admin GUC set to 'true'
CREATE POLICY network_lifecycle_logs_admin_select ON public.network_lifecycle_logs FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- ─────────────────────────────────────────────────────────────────────────────
-- §7  Grants
-- Minimal privilege: app role gets SELECT + INSERT only; admin gets SELECT only.
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT,
  INSERT ON public.network_lifecycle_logs TO texqtic_app;
GRANT SELECT ON public.network_lifecycle_logs TO texqtic_admin;
-- ─────────────────────────────────────────────────────────────────────────────
-- §8  Immutability Trigger (Layer 2)
-- Reuses the EXISTING public.prevent_lifecycle_log_update_delete() function
-- created by G-020 (20260301000000_g020_lifecycle_state_machine_core).
-- DO NOT recreate the function — it already exists in the DB.
-- This trigger fires BEFORE UPDATE OR DELETE, raising SQLSTATE P0001
-- regardless of caller role (cannot be bypassed via RLS policy bypass).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_immutable_network_lifecycle_log BEFORE
UPDATE
  OR DELETE ON public.network_lifecycle_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_lifecycle_log_update_delete();
COMMIT;