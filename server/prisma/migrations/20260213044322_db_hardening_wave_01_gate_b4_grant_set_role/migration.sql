-- TEXQTIC DB-HARDENING-WAVE-01 (Gate B.4 Follow-up)
-- Migration: Grant SET ROLE Permission for Runtime Role Switching
-- DOCTRINE: TexQtic v1.4 Constitutional RLS (Section 6.4)
--
-- ISSUE:
--   SET LOCAL ROLE texqtic_app fails with "Tenant or user not found"
--   postgres role needs explicit permission to assume texqtic_app role
--
-- SOLUTION:
--   GRANT texqtic_app TO postgres
--   This allows postgres to SET ROLE texqtic_app within transactions
GRANT texqtic_app TO postgres;
COMMENT ON ROLE texqtic_app IS 'Runtime application role for TexQtic server (RLS-enforced). Granted to postgres for SET LOCAL ROLE switching (Gate B.4 Option 2).';