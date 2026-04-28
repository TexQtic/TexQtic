-- CreateTable
CREATE TABLE "buyer_supplier_relationships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supplier_org_id" UUID NOT NULL,
  "buyer_org_id" UUID NOT NULL,
  "state" VARCHAR(20) NOT NULL,
  "requested_at" TIMESTAMPTZ(6),
  "approved_at" TIMESTAMPTZ(6),
  "decided_at" TIMESTAMPTZ(6),
  "suspended_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "expires_at" TIMESTAMPTZ(6),
  "internal_reason" TEXT,
  "metadata_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "buyer_supplier_relationships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "buyer_supplier_relationships_state_check" CHECK (
    "state" IN (
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'BLOCKED',
      'SUSPENDED',
      'EXPIRED',
      'REVOKED'
    )
  )
);
-- CreateIndex
CREATE UNIQUE INDEX "buyer_supplier_relationships_supplier_buyer_key" ON "buyer_supplier_relationships"("supplier_org_id", "buyer_org_id");
-- CreateIndex
CREATE INDEX "idx_buyer_supplier_relationships_supplier_org_id" ON "buyer_supplier_relationships"("supplier_org_id");
-- CreateIndex
CREATE INDEX "idx_buyer_supplier_relationships_buyer_org_id" ON "buyer_supplier_relationships"("buyer_org_id");
-- CreateIndex
CREATE INDEX "idx_buyer_supplier_relationships_state" ON "buyer_supplier_relationships"("state");
-- AddForeignKey
ALTER TABLE "buyer_supplier_relationships"
ADD CONSTRAINT "buyer_supplier_relationships_supplier_org_id_fkey" FOREIGN KEY ("supplier_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
-- AddForeignKey
ALTER TABLE "buyer_supplier_relationships"
ADD CONSTRAINT "buyer_supplier_relationships_buyer_org_id_fkey" FOREIGN KEY ("buyer_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;