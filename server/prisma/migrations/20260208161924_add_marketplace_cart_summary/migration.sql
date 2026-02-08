-- CreateTable
CREATE TABLE "marketplace_cart_summaries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "total_quantity" INTEGER NOT NULL DEFAULT 0,
    "last_event_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "marketplace_cart_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_cart_summaries_cart_id_key" ON "marketplace_cart_summaries"("cart_id");

-- CreateIndex
CREATE INDEX "marketplace_cart_summaries_tenant_id_last_updated_at_idx" ON "marketplace_cart_summaries"("tenant_id", "last_updated_at");

-- CreateIndex
CREATE INDEX "marketplace_cart_summaries_tenant_id_user_id_idx" ON "marketplace_cart_summaries"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "marketplace_cart_summaries_cart_id_idx" ON "marketplace_cart_summaries"("cart_id");

-- AddForeignKey
ALTER TABLE "marketplace_cart_summaries" ADD CONSTRAINT "marketplace_cart_summaries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_cart_summaries" ADD CONSTRAINT "marketplace_cart_summaries_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_cart_summaries" ADD CONSTRAINT "marketplace_cart_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
