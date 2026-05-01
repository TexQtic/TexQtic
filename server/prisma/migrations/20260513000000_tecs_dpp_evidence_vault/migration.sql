-- ─────────────────────────────────────────────────────────────────────────────
-- TECS-DPP-PASSPORT-NETWORK-012 — DPP Evidence Vault Foundation
-- TECS ID : TECS-DPP-EVIDENCE-VAULT-001
-- Date    : 2026-05-13
-- Slice   : D-7 — dpp_evidence_items (Evidence Vault): structured evidence
--           records attached to a DPP node, independent of AI extraction flow.
--
-- Prerequisites: D-1 (traceability_nodes), D-3 (dpp_passport_states) applied.
-- NOTE: Prisma manage manages the transaction. No BEGIN/COMMIT in this file.
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- S0: PREFLIGHT — assert required predecessor tables exist
-- ─────────────────────────────────────────────────────────────────────────────
DO $d7_preflight$ BEGIN -- D-1 prerequisite: traceability_nodes
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'traceability_nodes'
) THEN RAISE EXCEPTION 'D7 PREFLIGHT FAIL: traceability_nodes table not found — D-1 must be applied first';
END IF;
-- organizations table
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'organizations'
) THEN RAISE EXCEPTION 'D7 PREFLIGHT FAIL: organizations table not found';
END IF;
RAISE NOTICE '[D7 PREFLIGHT] PASS — all prerequisites confirmed';
END $d7_preflight$;
-- ─────────────────────────────────────────────────────────────────────────────
-- S1: CREATE TABLE dpp_evidence_items
--
-- One row per evidence artifact attached to a DPP node.
-- No FK to document_extraction_drafts: evidence items are independent of the
-- AI extraction pipeline. source_table/source_id provide soft-reference linkage.
--
-- visibility  — tenant-controlled disclosure level (CHECK enforced)
-- review_state — human review workflow state (CHECK enforced)
-- evidence_type — allowlisted categories (CHECK enforced)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dpp_evidence_items (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  node_id UUID NOT NULL,
  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  source_table TEXT,
  source_id UUID,
  document_url TEXT,
  issuing_body TEXT,
  reference_number TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  review_state TEXT NOT NULL DEFAULT 'PENDING',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dpp_evidence_items_pkey PRIMARY KEY (id),
  CONSTRAINT dpp_evidence_items_evidence_type_check CHECK (
    evidence_type IN (
      'CERTIFICATE',
      'TEST_REPORT',
      'QC_REPORT',
      'INVOICE',
      'PURCHASE_ORDER',
      'DISPATCH_PROOF',
      'BUYER_ACCEPTANCE',
      'AUDIT_DOCUMENT',
      'EXTRACTION_OUTPUT',
      'HUMAN_REVIEWED_CLAIM',
      'SUSTAINABILITY_DECLARATION'
    )
  ),
  CONSTRAINT dpp_evidence_items_visibility_check CHECK (
    visibility IN (
      'PRIVATE',
      'AUTHENTICATED_BUYER',
      'PUBLIC_SUMMARY',
      'AUDITOR_FUTURE'
    )
  ),
  CONSTRAINT dpp_evidence_items_review_state_check CHECK (
    review_state IN (
      'PENDING',
      'HUMAN_REVIEWED',
      'REJECTED',
      'EXPIRED'
    )
  ),
  CONSTRAINT dpp_evidence_items_title_nonempty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT dpp_evidence_items_expires_after_issued CHECK (
    expires_at IS NULL
    OR issued_at IS NULL
    OR expires_at >= issued_at
  ),
  CONSTRAINT dpp_evidence_items_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT dpp_evidence_items_node_id_fk FOREIGN KEY (node_id) REFERENCES public.traceability_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- ─────────────────────────────────────────────────────────────────────────────
-- S2: Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dpp_evidence_items_org_node ON public.dpp_evidence_items (org_id, node_id);
CREATE INDEX IF NOT EXISTS idx_dpp_evidence_items_org_node_visibility ON public.dpp_evidence_items (org_id, node_id, visibility);
CREATE INDEX IF NOT EXISTS idx_dpp_evidence_items_org_node_type ON public.dpp_evidence_items (org_id, node_id, evidence_type);
-- ─────────────────────────────────────────────────────────────────────────────
-- S3: RLS — ENABLE + FORCE (tenant isolation; org_id-scoped)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.dpp_evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpp_evidence_items FORCE ROW LEVEL SECURITY;
-- Restrictive guard (fail-closed) — blocks all access unless app.current_org_id() matches
CREATE POLICY dpp_evidence_items_restrictive ON public.dpp_evidence_items AS RESTRICTIVE TO texqtic_app USING (org_id = app.current_org_id());
-- Tenant SELECT policy — scoped to current org
CREATE POLICY dpp_evidence_items_select ON public.dpp_evidence_items FOR
SELECT TO texqtic_app USING (org_id = app.current_org_id());
-- Tenant INSERT policy — scoped to current org
CREATE POLICY dpp_evidence_items_insert ON public.dpp_evidence_items FOR
INSERT TO texqtic_app WITH CHECK (org_id = app.current_org_id());
-- Tenant UPDATE policy — scoped to current org
CREATE POLICY dpp_evidence_items_update ON public.dpp_evidence_items FOR
UPDATE TO texqtic_app USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());
-- ─────────────────────────────────────────────────────────────────────────────
-- S4: GRANT to texqtic_app
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT,
  INSERT ON public.dpp_evidence_items TO texqtic_app;
-- ─────────────────────────────────────────────────────────────────────────────
-- S5: VERIFIER DO block — assert all expected objects present after DDL
-- ─────────────────────────────────────────────────────────────────────────────
DO $d7_verifier$
DECLARE v_table INTEGER;
v_type_check INTEGER;
v_vis_check INTEGER;
v_state_check INTEGER;
v_rls_force INTEGER;
v_rls_restr INTEGER;
v_rls_select INTEGER;
v_rls_insert INTEGER;
v_idx_org_node INTEGER;
BEGIN -- Table exists
SELECT COUNT(*) INTO v_table
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'dpp_evidence_items';
IF v_table = 0 THEN RAISE EXCEPTION 'D7 VERIFIER FAIL: dpp_evidence_items table not found';
END IF;
-- evidence_type CHECK constraint
SELECT COUNT(*) INTO v_type_check
FROM pg_constraint
WHERE conrelid = 'public.dpp_evidence_items'::regclass
  AND conname = 'dpp_evidence_items_evidence_type_check';
IF v_type_check = 0 THEN RAISE EXCEPTION 'D7 VERIFIER FAIL: evidence_type check constraint not found';
END IF;
-- visibility CHECK constraint
SELECT COUNT(*) INTO v_vis_check
FROM pg_constraint
WHERE conrelid = 'public.dpp_evidence_items'::regclass
  AND conname = 'dpp_evidence_items_visibility_check';
IF v_vis_check = 0 THEN RAISE EXCEPTION 'D7 VERIFIER FAIL: visibility check constraint not found';
END IF;
-- review_state CHECK constraint
SELECT COUNT(*) INTO v_state_check
FROM pg_constraint
WHERE conrelid = 'public.dpp_evidence_items'::regclass
  AND conname = 'dpp_evidence_items_review_state_check';
IF v_state_check = 0 THEN RAISE EXCEPTION 'D7 VERIFIER FAIL: review_state check constraint not found';
END IF;
-- FORCE RLS
SELECT COUNT(*) INTO v_rls_force
FROM pg_class
WHERE relname = 'dpp_evidence_items'
  AND relnamespace = 'public'::regnamespace
  AND relrowsecurity = TRUE
  AND relforcerowsecurity = TRUE;
IF v_rls_force = 0 THEN RAISE EXCEPTION 'D7 VERIFIER FAIL: FORCE ROW LEVEL SECURITY not enabled';
END IF;
-- Restrictive policy
SELECT COUNT(*) INTO v_rls_restr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'dpp_evidence_items'
  AND policyname = 'dpp_evidence_items_restrictive';
IF v_rls_restr = 0 THEN RAISE EXCEPTION 'D7 VERIFIER FAIL: restrictive RLS policy not found';
END IF;
-- SELECT policy
SELECT COUNT(*) INTO v_rls_select
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'dpp_evidence_items'
  AND policyname = 'dpp_evidence_items_select';
IF v_rls_select = 0 THEN RAISE EXCEPTION 'D7 VERIFIER FAIL: select RLS policy not found';
END IF;
-- INSERT policy
SELECT COUNT(*) INTO v_rls_insert
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'dpp_evidence_items'
  AND policyname = 'dpp_evidence_items_insert';
IF v_rls_insert = 0 THEN RAISE EXCEPTION 'D7 VERIFIER FAIL: insert RLS policy not found';
END IF;
-- Primary index
SELECT COUNT(*) INTO v_idx_org_node
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'dpp_evidence_items'
  AND indexname = 'idx_dpp_evidence_items_org_node';
IF v_idx_org_node = 0 THEN RAISE EXCEPTION 'D7 VERIFIER FAIL: idx_dpp_evidence_items_org_node index not found';
END IF;
RAISE NOTICE '[D7 VERIFIER] PASS — dpp_evidence_items table, constraints, RLS, and indexes verified';
END $d7_verifier$;