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
-- REV-SKU-A: moq=100, REV-SKU-B: moq=500, REV-SKU-C: moq=1 (default)
UPDATE catalog_items
SET moq = 100
WHERE sku = 'REV-SKU-A';
UPDATE catalog_items
SET moq = 500
WHERE sku = 'REV-SKU-B';
-- Named MOQ seed items — align moq to name-implied values
UPDATE catalog_items
SET moq = 100
WHERE sku = 'SKU-A-MOQ100';
UPDATE catalog_items
SET moq = 500
WHERE sku = 'SKU-B-MOQ500';
UPDATE catalog_items
SET moq = 1000
WHERE sku = 'SKU-C-MOQ1000';