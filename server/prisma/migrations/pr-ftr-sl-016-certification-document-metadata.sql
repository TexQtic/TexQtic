-- ============================================================
-- FTR-SL-016: Certification document metadata
-- Adds private certificate document metadata columns to certifications.
-- Apply via governed migration deployment only; do not run direct SQL outside an authorized migration lane.
-- ============================================================
ALTER TABLE certifications
ADD COLUMN IF NOT EXISTS document_storage_path VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS document_original_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS document_mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS document_size_bytes INT,
  ADD COLUMN IF NOT EXISTS document_uploaded_at TIMESTAMPTZ;
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'certifications_document_size_bytes_check'
) THEN
ALTER TABLE certifications
ADD CONSTRAINT certifications_document_size_bytes_check CHECK (
    document_size_bytes IS NULL
    OR document_size_bytes > 0
  );
END IF;
END $$;
CREATE INDEX IF NOT EXISTS certifications_org_document_uploaded_idx ON certifications (org_id, document_uploaded_at DESC)
WHERE document_storage_path IS NOT NULL;