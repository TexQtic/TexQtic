-- Migration: add_textile_attributes_to_catalog_items
-- TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001
--
-- Adds 9 nullable textile attribute columns to catalog_items.
-- All columns are nullable — existing rows are unaffected.
-- No ENUM types: VARCHAR + application-level validation (safe migrations).
-- Certifications stored as JSONB for multi-value, no new table required.
--
-- Apply via: psql $DATABASE_URL -f <this file>
-- Verify: no ERROR or ROLLBACK in output
-- Then run: pnpm -C server exec prisma db pull
-- Then run: pnpm -C server exec prisma generate
ALTER TABLE catalog_items
ADD COLUMN IF NOT EXISTS product_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fabric_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gsm DECIMAL(6, 1),
  ADD COLUMN IF NOT EXISTS material VARCHAR(50),
  ADD COLUMN IF NOT EXISTS composition VARCHAR(500),
  ADD COLUMN IF NOT EXISTS color VARCHAR(100),
  ADD COLUMN IF NOT EXISTS width_cm DECIMAL(6, 2),
  ADD COLUMN IF NOT EXISTS construction VARCHAR(50),
  ADD COLUMN IF NOT EXISTS certifications JSONB;
-- Partial indexes on controlled-vocabulary columns (non-null only, avoids index bloat)
CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_product_category ON catalog_items (tenant_id, product_category)
WHERE product_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_fabric_type ON catalog_items (tenant_id, fabric_type)
WHERE fabric_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_material ON catalog_items (tenant_id, material)
WHERE material IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_construction ON catalog_items (tenant_id, construction)
WHERE construction IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_color ON catalog_items (tenant_id, color)
WHERE color IS NOT NULL;
-- GIN index for JSONB certifications (enables @> containment queries)
CREATE INDEX IF NOT EXISTS idx_catalog_items_certifications_gin ON catalog_items USING GIN (certifications)
WHERE certifications IS NOT NULL;