-- ═══════════════════════════════════════════════════════════════════════
-- TTP-SCORE-SNAPSHOT-SQL-RLS-001
-- ttp_score_snapshots — append-only score evidence table
-- Migration: 20260516000000_ttp_score_snapshot_001
-- ═══════════════════════════════════════════════════════════════════════
--
-- SAFETY LOCK: ttp_enabled = false
-- This table is CREATED for structural readiness only.
-- No application code writes to this table in Phase 2.
-- No rows are inserted until ttp_enabled=true (Wave 3/4/5 gates).
-- PARTNER_TRANSMITTED trigger_event: forward-declared in CHECK constraint
--   only. No write path exists in this migration.
--
-- LEGAL STATUS: LEGAL_REVIEW_PENDING — no activation authorized.
-- ═══════════════════════════════════════════════════════════════════════
-- ─────────────────────────────────────────────────────────────────────
-- §1 TABLE: public.ttp_score_snapshots
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE public.ttp_score_snapshots (
  -- ── Identity ──────────────────────────────────────────────────────
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── Tenant / RLS boundary ─────────────────────────────────────────
  org_id UUID NOT NULL,
  -- ── Linkages (nullable FKs — score may be computed before all anchors exist) ──
  trade_id UUID NULL,
  invoice_id UUID NULL,
  vpc_id UUID NULL,
  enrollment_id UUID NULL,
  -- OQ-SS-03: nullable FK to ttp_enrollment_logs.id
  -- ── Score payload ─────────────────────────────────────────────────
  score_value SMALLINT NOT NULL,
  -- 0–100
  score_band TEXT NOT NULL,
  -- READY | NEAR_READY | NEEDS_REVIEW | NOT_READY
  score_version TEXT NOT NULL,
  -- TTP_V1 | TEXQTICSCORE_V2 (OQ-SS-07)
  score_detail_json JSONB NOT NULL,
  -- OQ-SS-01: includes blockers + next_steps
  -- ── Trigger + source ──────────────────────────────────────────────
  trigger_event TEXT NOT NULL,
  -- VPC_ISSUED | ENROLLMENT_APPROVED | ADMIN_REVIEW_COMPLETE | PARTNER_TRANSMITTED
  source_event_id UUID NULL,
  -- Reference to the triggering event (nullable)
  actor_id UUID NULL,
  -- Admin/system actor who initiated computation (nullable)
  -- ── Disclaimer hashes ─────────────────────────────────────────────
  score_disclaimer_hash TEXT NOT NULL,
  -- OQ-SS-02: SHA-256 of SCORE_DISCLAIMER from ttpScore.service.ts
  route_disclaimer_hash TEXT NOT NULL,
  -- OQ-SS-02: SHA-256 of TTP_DISCLAIMER_TEXT from ttp.constants.ts
  -- ── Audit metadata ────────────────────────────────────────────────
  metadata_json JSONB NULL,
  -- ── Immutable wall-clock timestamp ────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Constraints ───────────────────────────────────────────────────
  CONSTRAINT ttp_score_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT ttp_score_snapshots_score_value_check CHECK (
    score_value BETWEEN 0 AND 100
  ),
  CONSTRAINT ttp_score_snapshots_score_band_check CHECK (
    score_band IN (
      'READY',
      'NEAR_READY',
      'NEEDS_REVIEW',
      'NOT_READY'
    )
  ),
  CONSTRAINT ttp_score_snapshots_score_version_check CHECK (
    score_version IN ('TTP_V1', 'TEXQTICSCORE_V2')
  ),
  CONSTRAINT ttp_score_snapshots_trigger_event_check CHECK (
    trigger_event IN (
      'VPC_ISSUED',
      'ENROLLMENT_APPROVED',
      'ADMIN_REVIEW_COMPLETE',
      'PARTNER_TRANSMITTED'
    )
  ),
  -- FK: org (RLS boundary)
  CONSTRAINT ttp_score_snapshots_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  -- FK: trade (nullable)
  CONSTRAINT ttp_score_snapshots_trade_id_fk FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  -- FK: invoice (nullable)
  CONSTRAINT ttp_score_snapshots_invoice_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  -- FK: VPC (nullable)
  CONSTRAINT ttp_score_snapshots_vpc_id_fk FOREIGN KEY (vpc_id) REFERENCES public.verified_payable_certificates(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  -- FK: enrollment_id (nullable; OQ-SS-03)
  CONSTRAINT ttp_score_snapshots_enrollment_id_fk FOREIGN KEY (enrollment_id) REFERENCES public.ttp_enrollment_logs(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);
COMMENT ON TABLE public.ttp_score_snapshots IS 'TTP-SCORE-SNAPSHOT-SQL-RLS-001: Advisory TradeTrust Score snapshots. Append-only evidence record. NOT a credit score, payment guarantee, financing approval, or lending decision. ttp_enabled=false — no snapshot writes authorized until activation.';
COMMENT ON COLUMN public.ttp_score_snapshots.score_disclaimer_hash IS 'OQ-SS-02: SHA-256 of SCORE_DISCLAIMER constant from ttpScore.service.ts. Immutable at INSERT time. Documents which disclaimer version governed this snapshot.';
COMMENT ON COLUMN public.ttp_score_snapshots.route_disclaimer_hash IS 'OQ-SS-02: SHA-256 of TTP_DISCLAIMER_TEXT constant from ttp.constants.ts. Immutable at INSERT time. Documents which route disclaimer version governed this snapshot.';
COMMENT ON COLUMN public.ttp_score_snapshots.score_detail_json IS 'OQ-SS-01: Structured score breakdown. MUST include blockers[] and next_steps[]. Schema enforced at service layer.';
COMMENT ON COLUMN public.ttp_score_snapshots.enrollment_id IS 'OQ-SS-03: Nullable FK to ttp_enrollment_logs.id. NULL when snapshot computed before or outside enrollment context.';
-- ─────────────────────────────────────────────────────────────────────
-- §2 INDEXES on public.ttp_score_snapshots
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX idx_ttp_score_snapshots_org_created ON public.ttp_score_snapshots (org_id, created_at DESC);
CREATE INDEX idx_ttp_score_snapshots_vpc ON public.ttp_score_snapshots (vpc_id, trigger_event)
WHERE vpc_id IS NOT NULL;
CREATE INDEX idx_ttp_score_snapshots_trade_created ON public.ttp_score_snapshots (trade_id, created_at DESC)
WHERE trade_id IS NOT NULL;
CREATE INDEX idx_ttp_score_snapshots_trigger_source ON public.ttp_score_snapshots (trigger_event, source_event_id);
-- ─────────────────────────────────────────────────────────────────────
-- §3 IMMUTABILITY TRIGGER on public.ttp_score_snapshots
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_ttp_score_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TTP_SCORE_SNAPSHOT_IMMUTABLE: ttp_score_snapshots rows are append-only. UPDATE and DELETE are unconditionally prohibited. TTP-SCORE-SNAPSHOT-SQL-RLS-001 Layer 2 enforcement. No override path exists.' USING ERRCODE = 'P0001';
END;
$$;
COMMENT ON FUNCTION public.prevent_ttp_score_snapshot_mutation() IS 'TTP-SCORE-SNAPSHOT-SQL-RLS-001 Layer 2: Unconditional immutability backstop for ttp_score_snapshots. Fires BEFORE UPDATE OR DELETE. Raises SQLSTATE P0001. Cannot be bypassed without dropping trigger.';
DROP TRIGGER IF EXISTS trg_ttp_score_snapshot_immutable ON public.ttp_score_snapshots;
CREATE TRIGGER trg_ttp_score_snapshot_immutable BEFORE
UPDATE
  OR DELETE ON public.ttp_score_snapshots FOR EACH ROW EXECUTE FUNCTION public.prevent_ttp_score_snapshot_mutation();
-- ─────────────────────────────────────────────────────────────────────
-- §4 RLS + GRANTS on public.ttp_score_snapshots
--
--   Tenant SELECT: own org's score snapshots (org_id = app.current_org_id()).
--   Admin: full read.
--   INSERT: admin/bypass only (score computation is platform-orchestrated).
--   UPDATE: permanently blocked (append-only Layer 3).
--   DELETE: permanently blocked (append-only Layer 3).
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.ttp_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttp_score_snapshots FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ttp_score_snapshots_guard ON public.ttp_score_snapshots;
CREATE POLICY ttp_score_snapshots_guard ON public.ttp_score_snapshots AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
DROP POLICY IF EXISTS ttp_score_snapshots_select_unified ON public.ttp_score_snapshots;
CREATE POLICY ttp_score_snapshots_select_unified ON public.ttp_score_snapshots AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
DROP POLICY IF EXISTS ttp_score_snapshots_insert_unified ON public.ttp_score_snapshots;
CREATE POLICY ttp_score_snapshots_insert_unified ON public.ttp_score_snapshots AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );
-- UPDATE permanently blocked (append-only enforcement Layer 3)
DROP POLICY IF EXISTS ttp_score_snapshots_update_block ON public.ttp_score_snapshots;
CREATE POLICY ttp_score_snapshots_update_block ON public.ttp_score_snapshots AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (false);
-- DELETE permanently blocked (append-only enforcement Layer 3)
DROP POLICY IF EXISTS ttp_score_snapshots_delete_block ON public.ttp_score_snapshots;
CREATE POLICY ttp_score_snapshots_delete_block ON public.ttp_score_snapshots AS PERMISSIVE FOR DELETE TO texqtic_app USING (false);
GRANT SELECT,
  INSERT ON public.ttp_score_snapshots TO texqtic_app;