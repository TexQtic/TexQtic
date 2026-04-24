-- Migration: add_catalog_stage_attributes
-- Adds catalog_stage (VARCHAR 50) and stage_attributes (JSONB) to catalog_items.
-- Existing 9 fabric columns are preserved unchanged (backward compat).
-- catalog_stage IS NULL is valid for legacy fabric items.
ALTER TABLE catalog_items
ADD COLUMN IF NOT EXISTS catalog_stage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS stage_attributes JSONB;
CREATE INDEX IF NOT EXISTS idx_catalog_items_stage ON catalog_items (tenant_id, catalog_stage)
WHERE catalog_stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_catalog_items_stage_attrs ON catalog_items USING GIN (stage_attributes)
WHERE stage_attributes IS NOT NULL;