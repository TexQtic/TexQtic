-- ============================================================================
-- Wave-3 / G-W3-A2a: Enforce FORCE ROW LEVEL SECURITY on password_reset_tokens
-- Purpose: Doctrine v1.4 compliance — FORCE RLS ensures RLS applies even to
--          table owner connections, preventing accidental policy bypass.
-- Scope: Single ALTER TABLE statement; no policy or schema changes.
-- ============================================================================

ALTER TABLE password_reset_tokens
  FORCE ROW LEVEL SECURITY;
