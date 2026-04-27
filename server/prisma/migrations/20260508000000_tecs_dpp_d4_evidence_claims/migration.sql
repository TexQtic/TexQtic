-- ─────────────────────────────────────────────────────────────────────────────
-- TECS-DPP-PASSPORT-FOUNDATION-001 D-4 — DPP AI Evidence Linkage
-- TECS ID : TECS-DPP-AI-EVIDENCE-LINKAGE-001
-- Date    : 2026-04-27
-- Slice   : D-4 — dpp_evidence_claims table linking human-reviewed AI extractions
--           to DPP passport evidence.
--
-- Prerequisites: D-1, D-2, D-3 applied.
-- NOTE: Prisma migrate manages the transaction. No BEGIN/COMMIT in this file.
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- S0: PREFLIGHT — assert required predecessor tables exist
-- ─────────────────────────────────────────────────────────────────────────────
DO $d4_preflight$ BEGIN -- D-3 prerequisite: dpp_passport_states
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'dpp_passport_states'
) THEN RAISE EXCEPTION 'D4 PREFLIGHT FAIL: dpp_passport_states not found — D-3 must be applied first';
END IF;
-- D-1 prerequisite: traceability_nodes
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'traceability_nodes'
) THEN RAISE EXCEPTION 'D4 PREFLIGHT FAIL: traceability_nodes table not found';
END IF;
-- AI-DOC-INTEL prerequisite: document_extraction_drafts
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'document_extraction_drafts'
) THEN RAISE EXCEPTION 'D4 PREFLIGHT FAIL: document_extraction_drafts table not found — TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 must be applied first';
END IF;
-- organizations table
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'organizations'
) THEN RAISE EXCEPTION 'D4 PREFLIGHT FAIL: organizations table not found';
END IF;
-- users table
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'users'
) THEN RAISE EXCEPTION 'D4 PREFLIGHT FAIL: users table not found';
END IF;
RAISE NOTICE '[D4 PREFLIGHT] PASS — all prerequisites confirmed';
END $d4_preflight$;
-- ─────────────────────────────────────────────────────────────────────────────
-- S1: CREATE TABLE dpp_evidence_claims
--
-- One row per (org_id, node_id, extraction_id, claim_type).
-- Only human-reviewed (status = 'reviewed') extractions may be linked.
-- Enforcement is at the service layer; the DB constraint is the unique key.
--
-- approved_by  — references users(id); SET NULL on user deletion (audit trail preserved)
-- approved_at  — timestamp of claim approval; must accompany approved_by
-- claim_type   — allowlist enforced by CHECK constraint
-- claim_value  — JSONB object holding the approved field evidence; must be object
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dpp_evidence_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  node_id UUID NOT NULL,
  extraction_id UUID NOT NULL,
  claim_type TEXT NOT NULL,
  claim_value JSONB NOT NULL,
  approved_by UUID NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dpp_evidence_claims_pkey PRIMARY KEY (id),
  CONSTRAINT dpp_evidence_claims_unique UNIQUE (org_id, node_id, extraction_id, claim_type),
  CONSTRAINT dpp_evidence_claims_claim_type_check CHECK (
    claim_type IN (
      'MATERIAL_COMPOSITION',
      'STANDARD_NAME',
      'CERTIFICATE_NUMBER',
      'ISSUER_NAME',
      'ISSUE_DATE',
      'EXPIRY_DATE',
      'TEST_RESULT',
      'PRODUCT_NAME',
      'COUNTRY_OR_LAB_LOCATION'
    )
  ),
  CONSTRAINT dpp_evidence_claims_claim_type_nonempty CHECK (char_length(claim_type) > 0),
  CONSTRAINT dpp_evidence_claims_claim_value_object CHECK (jsonb_typeof(claim_value) = 'object'),
  CONSTRAINT dpp_evidence_claims_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT dpp_evidence_claims_node_id_fk FOREIGN KEY (node_id) REFERENCES public.traceability_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT dpp_evidence_claims_extraction_id_fk FOREIGN KEY (extraction_id) REFERENCES public.document_extraction_drafts(id) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT dpp_evidence_claims_approved_by_fk FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE
  SET NULL
);
-- ─────────────────────────────────────────────────────────────────────────────
-- S2: Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dpp_evidence_claims_org_node ON public.dpp_evidence_claims (org_id, node_id);
CREATE INDEX IF NOT EXISTS idx_dpp_evidence_claims_extraction ON public.dpp_evidence_claims (extraction_id);
-- ─────────────────────────────────────────────────────────────────────────────
-- S3: RLS — ENABLE + FORCE (tenant isolation; org_id-scoped)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.dpp_evidence_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpp_evidence_claims FORCE ROW LEVEL SECURITY;
-- Restrictive guard (fail-closed) — blocks all access unless app.current_org_id matches
CREATE POLICY dpp_evidence_claims_restrictive ON public.dpp_evidence_claims AS RESTRICTIVE TO texqtic_app USING (
  org_id = current_setting('app.current_org_id')::uuid
);
-- Tenant SELECT policy — scoped to current org
CREATE POLICY dpp_evidence_claims_select ON public.dpp_evidence_claims FOR
SELECT TO texqtic_app USING (
    org_id = current_setting('app.current_org_id')::uuid
  );
-- Tenant INSERT policy — scoped to current org
CREATE POLICY dpp_evidence_claims_insert ON public.dpp_evidence_claims FOR
INSERT TO texqtic_app WITH CHECK (
    org_id = current_setting('app.current_org_id')::uuid
  );
-- ─────────────────────────────────────────────────────────────────────────────
-- S4: GRANT to texqtic_app
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT,
  INSERT ON public.dpp_evidence_claims TO texqtic_app;
-- ─────────────────────────────────────────────────────────────────────────────
-- S5: VERIFIER DO block — assert all expected objects present after DDL
-- ─────────────────────────────────────────────────────────────────────────────
DO $d4_verifier$
DECLARE v_table INTEGER;
v_unique INTEGER;
v_type_check INTEGER;
v_value_check INTEGER;
v_rls_restr INTEGER;
v_rls_select INTEGER;
v_rls_insert INTEGER;
BEGIN -- Table exists
SELECT COUNT(*) INTO v_table
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'dpp_evidence_claims';
IF v_table = 0 THEN RAISE EXCEPTION 'D4 VERIFIER FAIL: dpp_evidence_claims table not found';
END IF;
-- Unique constraint
SELECT COUNT(*) INTO v_unique
FROM pg_constraint
WHERE conrelid = 'public.dpp_evidence_claims'::regclass
  AND contype = 'u';
IF v_unique = 0 THEN RAISE EXCEPTION 'D4 VERIFIER FAIL: dpp_evidence_claims unique constraint not found';
END IF;
-- claim_type CHECK constraint
SELECT COUNT(*) INTO v_type_check
FROM pg_constraint
WHERE conrelid = 'public.dpp_evidence_claims'::regclass
  AND contype = 'c'
  AND conname = 'dpp_evidence_claims_claim_type_check';
IF v_type_check = 0 THEN RAISE EXCEPTION 'D4 VERIFIER FAIL: dpp_evidence_claims_claim_type_check not found';
END IF;
-- claim_value CHECK constraint (object type)
SELECT COUNT(*) INTO v_value_check
FROM pg_constraint
WHERE conrelid = 'public.dpp_evidence_claims'::regclass
  AND contype = 'c'
  AND conname = 'dpp_evidence_claims_claim_value_object';
IF v_value_check = 0 THEN RAISE EXCEPTION 'D4 VERIFIER FAIL: dpp_evidence_claims_claim_value_object not found';
END IF;
-- Restrictive RLS policy
SELECT COUNT(*) INTO v_rls_restr
FROM pg_policies
WHERE tablename = 'dpp_evidence_claims'
  AND policyname = 'dpp_evidence_claims_restrictive';
IF v_rls_restr = 0 THEN RAISE EXCEPTION 'D4 VERIFIER FAIL: dpp_evidence_claims_restrictive policy not found';
END IF;
-- SELECT RLS policy
SELECT COUNT(*) INTO v_rls_select
FROM pg_policies
WHERE tablename = 'dpp_evidence_claims'
  AND policyname = 'dpp_evidence_claims_select';
IF v_rls_select = 0 THEN RAISE EXCEPTION 'D4 VERIFIER FAIL: dpp_evidence_claims_select policy not found';
END IF;
-- INSERT RLS policy
SELECT COUNT(*) INTO v_rls_insert
FROM pg_policies
WHERE tablename = 'dpp_evidence_claims'
  AND policyname = 'dpp_evidence_claims_insert';
IF v_rls_insert = 0 THEN RAISE EXCEPTION 'D4 VERIFIER FAIL: dpp_evidence_claims_insert policy not found';
END IF;
RAISE NOTICE '[D4 VERIFIER] PASS — dpp_evidence_claims table, constraints, and RLS policies verified';
END $d4_verifier$;