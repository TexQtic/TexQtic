-- ============================================================
-- PR-B: Catalog Commerce — MOQ enforcement
-- Adds moq column to catalog_items
-- Apply via: psql $MIGRATION_DATABASE_URL -f prisma/migrations/pr-b-catalog-moq.sql
-- ============================================================
ALTER TABLE catalog_items
ADD COLUMN IF NOT EXISTS moq INT NOT NULL DEFAULT 1;
ALTER TABLE catalog_items
ADD CONSTRAINT catalog_items_moq_check CHECK (moq >= 1);
-- Seed test MOQ values on known rev-test items
-- REV-SKU-A: moq=100, REV-SKU-B: moq=500
UPDATE catalog_items
SET moq = 100
WHERE sku = 'REV-SKU-A';
UPDATE catalog_items
SET moq = 500
WHERE sku = 'REV-SKU-B';