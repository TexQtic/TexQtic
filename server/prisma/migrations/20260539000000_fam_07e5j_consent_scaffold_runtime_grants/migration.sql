-- FAM-07E5J-CONSENT-SCAFFOLD-RUNTIME-PERSISTENCE-PERMISSION-REMEDIATION-001
-- Remediation scope: grant runtime role privileges for existing consent scaffold tables.
-- No schema changes, no legal semantics changes, no auth policy changes.
--
-- Root cause proved in E5I/E5J diagnosis:
-- withDbContext executes SET LOCAL ROLE texqtic_app.
-- legal_consent_snapshots / legal_consent_events were created in FAM-07E1, but no grants were added.
-- Postgres checks table privileges before RLS/policy evaluation, causing permission denied at runtime.
GRANT USAGE ON SCHEMA public TO texqtic_app;
GRANT USAGE ON TYPE public.legal_consent_status TO texqtic_app;
GRANT USAGE ON TYPE public.legal_consent_source_flow TO texqtic_app;
GRANT USAGE ON TYPE public.legal_consent_agreement_type TO texqtic_app;
GRANT USAGE ON TYPE public.legal_consent_event_type TO texqtic_app;
GRANT SELECT,
  INSERT,
  UPDATE ON public.legal_consent_snapshots TO texqtic_app;
GRANT SELECT,
  INSERT ON public.legal_consent_events TO texqtic_app;