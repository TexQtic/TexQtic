-- Migration: 20260608000000_gst_provider_evidence_columns
-- Unit: IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01
-- Provider decision authority: DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01 (addendum 82058b94)
--
-- Changes:
--   §1  Drop old filing_status CHECK (ACTIVE | CANCELLED | SUSPENDED | UNKNOWN)
--   §2  Add INACTIVE to filing_status CHECK constraint
--   §3  Add four provider evidence columns (all NULL — backwards-compatible)
--   §4  Add provider_result CHECK constraint
--   §5  Add partial index on provider_result for admin queue queries
--
-- Safety:
--   - All new columns are nullable → no default required → no data migration needed
--   - Constraint replacement drops old, adds new with INACTIVE added — safe for all existing values
--   - DOES NOT use prisma migrate dev, prisma db push, or destructive reset
--   - Production application: separate VERIFY-MAINAPP-GST-KYC-PROVIDER-EVIDENCE-SCAFFOLD-DEPLOYMENT-01 unit
-- ── §1  Drop old filing_status check constraint ───────────────────────────────
ALTER TABLE public.gst_verifications DROP CONSTRAINT IF EXISTS gst_verifications_filing_status_check;
-- ── §2  Add updated filing_status check (now includes INACTIVE) ───────────────
ALTER TABLE public.gst_verifications
ADD CONSTRAINT gst_verifications_filing_status_check CHECK (
    filing_status IN (
      'ACTIVE',
      'INACTIVE',
      'CANCELLED',
      'SUSPENDED',
      'UNKNOWN'
    )
  );
-- ── §3  Add provider evidence columns ────────────────────────────────────────
ALTER TABLE public.gst_verifications
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS provider_request_id VARCHAR(200) NULL,
  ADD COLUMN IF NOT EXISTS provider_verified_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS provider_result VARCHAR(30) NULL;
-- ── §4  Add provider_result check constraint ─────────────────────────────────
ALTER TABLE public.gst_verifications
ADD CONSTRAINT gst_verifications_provider_result_check CHECK (
    provider_result IS NULL
    OR provider_result IN (
      'AUTO_APPROVED',
      'TIMEOUT',
      'MISMATCH',
      'INACTIVE_GSTIN',
      'INVALID_GSTIN',
      'PROVIDER_ERROR',
      'DUPLICATE_GSTIN'
    )
  );
-- ── §5  Partial index on provider_result for admin queue filtering ────────────
CREATE INDEX IF NOT EXISTS idx_gst_verifications_provider_result ON public.gst_verifications (provider_result)
WHERE provider_result IS NOT NULL;
COMMENT ON COLUMN public.gst_verifications.provider_name IS 'Name of the GST verification provider used (e.g. deepvue, noop). NULL until provider check runs.';
COMMENT ON COLUMN public.gst_verifications.provider_request_id IS 'Provider-issued transaction/correlation ID (e.g. Deepvue transaction_id). NULL until provider check runs.';
COMMENT ON COLUMN public.gst_verifications.provider_verified_at IS 'Timestamp of the provider verification response (from provider payload, not server clock). NULL until provider check runs.';
COMMENT ON COLUMN public.gst_verifications.provider_result IS 'Orchestration outcome: AUTO_APPROVED | TIMEOUT | MISMATCH | INACTIVE_GSTIN | INVALID_GSTIN | PROVIDER_ERROR | DUPLICATE_GSTIN. NULL until provider check runs.';