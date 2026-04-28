-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "price_disclosure_policy_mode" VARCHAR(30);

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "price_disclosure_policy_mode" VARCHAR(30);
