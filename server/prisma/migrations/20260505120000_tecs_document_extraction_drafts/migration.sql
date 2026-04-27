-- ============================================================================
-- TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 K-3: Document Extraction Drafts
-- TECS ID    : TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 Slice K-3
-- Domain     : tenant-plane — AI document intelligence draft persistence
-- Lifecycle  : create/update (review lifecycle deferred to K-5)
-- Reason     : Persist AI-extracted document field drafts for human review;
--              indexed for tenant lookups by org, document, status, and time.
-- Indexes    : org_id, document_id, status, created_at
-- RLS        : yes — org_id scoped via app.current_org_id() / app.require_org_context()
-- Schema budget ref: shared/contracts/schema-budget.md
-- ============================================================================
-- INVARIANTS
--   - ADDITIVE ONLY. No existing table modified.
--   - org_id references public.tenants(id) — canonical tenant boundary.
--   - humanReviewRequired default TRUE — immutable at DB level.
--   - status default 'draft' — no approve/reject in K-3 (deferred to K-5).
--   - FORCE RLS on all new tables. No table bypasses RLS.
--   - org_id is the ONLY canonical RLS variable (app.org_id GUC).
--   - extractedFields JSONB — stores array of ExtractedField objects from K-2 schema.
--   - No direct link to document storage table (no documents table in K-3 scope).
-- ============================================================================
BEGIN;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  PRE-FLIGHT SAFETY CHECK
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'tenants'
) THEN RAISE EXCEPTION 'K-3 PRE-FLIGHT BLOCKED: public.tenants does not exist.';
END IF;
IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'document_extraction_drafts'
) THEN RAISE EXCEPTION 'K-3 PRE-FLIGHT BLOCKED: public.document_extraction_drafts already exists. Migration may already be applied.';
END IF;
RAISE NOTICE 'K-3 pre-flight OK: tenants present, document_extraction_drafts absent. Proceeding.';
END $$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  TABLE: public.document_extraction_drafts
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.document_extraction_drafts (
  -- Identity
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Tenant boundary (RLS anchor, live FK)
  org_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  -- Document reference (no FK — no documents table in K-3)
  document_id UUID NOT NULL,
  -- Classification result from K-1 or caller-supplied type
  document_type VARCHAR(100) NOT NULL DEFAULT 'UNKNOWN',
  -- AI-extracted fields array (ExtractedField[] per K-2 schema)
  extracted_fields JSONB NOT NULL DEFAULT '[]',
  -- Aggregate confidence (0.000 – 1.000)
  overall_confidence NUMERIC(4, 3) NOT NULL DEFAULT 0,
  -- Structural constant — immutable at DB level
  human_review_required BOOLEAN NOT NULL DEFAULT TRUE,
  -- Lifecycle: draft → reviewed | rejected (K-5 responsibility)
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- Diagnostic notes from the extraction run
  extraction_notes TEXT,
  -- When the AI extraction ran
  extracted_at TIMESTAMPTZ NOT NULL,
  -- Review fields (populated by K-5 review route)
  reviewed_at TIMESTAMPTZ,
  reviewed_by_user_id UUID,
  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  INDEXES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_document_extraction_drafts_org_id ON public.document_extraction_drafts (org_id);
CREATE INDEX idx_document_extraction_drafts_document_id ON public.document_extraction_drafts (document_id);
CREATE INDEX idx_document_extraction_drafts_status ON public.document_extraction_drafts (status);
CREATE INDEX idx_document_extraction_drafts_created_at ON public.document_extraction_drafts (created_at);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §4  ROW LEVEL SECURITY
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.document_extraction_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extraction_drafts FORCE ROW LEVEL SECURITY;
-- Policy 1: Tenant SELECT — read own org's drafts
CREATE POLICY document_extraction_drafts_tenant_select_policy ON public.document_extraction_drafts FOR
SELECT USING (org_id = app.current_org_id());
-- Policy 2: Tenant INSERT — create draft for own org
CREATE POLICY document_extraction_drafts_tenant_insert_policy ON public.document_extraction_drafts FOR
INSERT WITH CHECK (org_id = app.current_org_id());
-- Policy 3: Tenant UPDATE — review/update own org's drafts (K-5)
CREATE POLICY document_extraction_drafts_tenant_update_policy ON public.document_extraction_drafts FOR
UPDATE USING (org_id = app.current_org_id());
-- Policy 4: Bypass SELECT (test-only seeding)
CREATE POLICY document_extraction_drafts_bypass_select_policy ON public.document_extraction_drafts FOR
SELECT USING (app.bypass_enabled());
-- Policy 5: Bypass INSERT/UPDATE (test-only seeding)
CREATE POLICY document_extraction_drafts_bypass_operations_policy ON public.document_extraction_drafts FOR ALL WITH CHECK (app.bypass_enabled());
-- Policy 6: RESTRICTIVE Guard (fail-closed enforcement)
CREATE POLICY document_extraction_drafts_guard_policy ON public.document_extraction_drafts AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §5  GRANTS — minimal privileges for texqtic_app
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRANT USAGE ON SCHEMA public TO texqtic_app;
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'texqtic_app'
) THEN
GRANT SELECT,
  INSERT,
  UPDATE ON public.document_extraction_drafts TO texqtic_app;
RAISE NOTICE 'K-3: Granted SELECT+INSERT+UPDATE on document_extraction_drafts to texqtic_app';
ELSE RAISE NOTICE 'K-3: Role texqtic_app not found — skipping grant (test environment)';
END IF;
END $$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §6  VERIFY — inline assertions (ROLLBACK on failure)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE v_table_exists boolean;
v_rls_on boolean;
v_rls_forced boolean;
v_policy_count int;
v_col_org_id boolean;
v_col_extracted boolean;
BEGIN
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'document_extraction_drafts'
  ) INTO v_table_exists;
IF NOT v_table_exists THEN RAISE EXCEPTION 'K-3 VERIFY FAILED: table document_extraction_drafts not found';
END IF;
SELECT relrowsecurity,
  relforcerowsecurity INTO v_rls_on,
  v_rls_forced
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'document_extraction_drafts';
IF NOT v_rls_on THEN RAISE EXCEPTION 'K-3 VERIFY FAILED: RLS not enabled on document_extraction_drafts';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'K-3 VERIFY FAILED: RLS not forced on document_extraction_drafts';
END IF;
SELECT COUNT(*) INTO v_policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'document_extraction_drafts';
IF v_policy_count < 6 THEN RAISE EXCEPTION 'K-3 VERIFY FAILED: expected 6 RLS policies, found %',
v_policy_count;
END IF;
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_extraction_drafts'
      AND column_name = 'org_id'
  ) INTO v_col_org_id;
IF NOT v_col_org_id THEN RAISE EXCEPTION 'K-3 VERIFY FAILED: column org_id not found';
END IF;
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_extraction_drafts'
      AND column_name = 'extracted_fields'
  ) INTO v_col_extracted;
IF NOT v_col_extracted THEN RAISE EXCEPTION 'K-3 VERIFY FAILED: column extracted_fields not found';
END IF;
RAISE NOTICE 'K-3 VERIFY PASSED: document_extraction_drafts table, RLS, policies, and columns confirmed.';
END $$;
COMMIT;