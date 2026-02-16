-- Gate E Infrastructure Fix: Grant table privileges for texqtic_app
-- 
-- Purpose: Enable Gate E tests (E.3 rate limiting, auth tests) by granting
--          necessary privileges on rate_limit_attempts and refresh_tokens tables.
--
-- Context: texqtic_app role requires SELECT/INSERT on these tables for:
--    - Rate limiting infrastructure (E.3)
--    - Authentication flow tests
--
-- No behavior change: Only grants missing privileges; RLS policies remain unchanged.
-- Grant privileges for rate_limit_attempts (needed by E.3)
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.rate_limit_attempts TO texqtic_app;
-- Grant privileges for refresh_tokens (needed by auth tests)
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.refresh_tokens TO texqtic_app;
-- Grant sequence usage (for serial/identity columns)
GRANT USAGE,
  SELECT ON ALL SEQUENCES IN SCHEMA public TO texqtic_app;
-- Verify grants
SELECT tablename,
  has_table_privilege('texqtic_app', 'public.' || tablename, 'SELECT') AS can_select,
  has_table_privilege('texqtic_app', 'public.' || tablename, 'INSERT') AS can_insert
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'rate_limit_attempts',
    'refresh_tokens',
    'audit_logs',
    'event_logs'
  )
ORDER BY tablename;