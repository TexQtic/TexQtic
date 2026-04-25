-- Migration: add_structured_rfq_requirements
-- Adds 10 nullable columns to rfqs for structured buyer requirements.
-- All columns nullable for backward compat with existing rfqs.
ALTER TABLE rfqs
ADD COLUMN IF NOT EXISTS requirement_title VARCHAR(200),
  ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(50),
  ADD COLUMN IF NOT EXISTS target_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_location VARCHAR(200),
  ADD COLUMN IF NOT EXISTS delivery_country VARCHAR(3),
  ADD COLUMN IF NOT EXISTS urgency VARCHAR(30),
  ADD COLUMN IF NOT EXISTS sample_required BOOLEAN,
  ADD COLUMN IF NOT EXISTS stage_requirement_attributes JSONB,
  ADD COLUMN IF NOT EXISTS requirement_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS field_source_meta JSONB;