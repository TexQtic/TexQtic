BEGIN;
-- FTR-SL-011F1D/E accelerated fix:
-- Preserve existing RLS + FORCE RLS posture.
-- Add only missing DML grants required by taxonomy profile-completeness writes.
GRANT INSERT,
  UPDATE,
  DELETE ON TABLE public.organization_secondary_segments TO texqtic_app;
GRANT INSERT,
  UPDATE,
  DELETE ON TABLE public.organization_role_positions TO texqtic_app;
COMMIT;