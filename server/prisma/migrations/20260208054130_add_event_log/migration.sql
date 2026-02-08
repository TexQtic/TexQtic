-- CreateTable
CREATE TABLE "event_logs" (
    "id" UUID NOT NULL,
    "version" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "tenant_id" UUID,
    "realm" VARCHAR(20) NOT NULL,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" UUID,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "payload_json" JSONB,
    "metadata_json" JSONB,
    "audit_log_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_logs_audit_log_id_key" ON "event_logs"("audit_log_id");

-- CreateIndex
CREATE INDEX "event_logs_tenant_id_occurred_at_idx" ON "event_logs"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "event_logs_name_occurred_at_idx" ON "event_logs"("name", "occurred_at");

-- CreateIndex
CREATE INDEX "event_logs_entity_type_entity_id_idx" ON "event_logs"("entity_type", "entity_id");
