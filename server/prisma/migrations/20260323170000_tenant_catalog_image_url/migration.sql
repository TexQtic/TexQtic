BEGIN;

-- TENANT-CATALOG-IMAGE-UPLOAD-GAP-002
-- Add the single bounded nullable image reference column required for catalog items.
ALTER TABLE public.catalog_items
ADD COLUMN IF NOT EXISTS image_url text;

COMMIT;