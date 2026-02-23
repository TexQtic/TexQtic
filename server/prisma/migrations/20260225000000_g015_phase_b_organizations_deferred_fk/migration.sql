-- ============================================================================
-- G-015 Phase B: Deferred FK — organizations.id → tenants.id
-- Gap:      G-015 (Canonical organizations alignment vs current Tenant model)
-- Doctrine: v1.4 / TECS v1.6 / Wave-3 S2
-- Date:     2026-02-25
-- Author:   TexQtic Platform Engineering
-- Precondition: Phase-A deployed + parity validated + trigger validated ✅
-- ============================================================================
--
-- OBJECTIVE
--   Add DEFERRABLE INITIALLY DEFERRED FK from organizations.id → tenants.id.
--   This promotes the DB-trigger-based identity parity to a DB-constraint-level
--   guarantee. The deferred nature preserves trigger insert ordering compatibility.
--
-- SAFETY PROPERTIES
--   - Pre-flight DO block aborts migration if parity drift detected.
--   - DEFERRABLE INITIALLY DEFERRED: constraint checked at COMMIT, not row-by-row.
--   - ON DELETE CASCADE: if a tenant is hard-deleted, its organizations row follows.
--   - Fully reversible: ALTER TABLE public.organizations DROP CONSTRAINT organizations_id_fkey;
--   - Single-purpose, atomic, no data rewrites, no RLS changes, no schema.prisma changes.
--
-- OBJECTS MODIFIED
--   1. CONSTRAINT  public.organizations.organizations_id_fkey  (ADDED)
-- ============================================================================
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  PRE-FK SAFETY CHECK
--     Aborts migration if any organizations row lacks a matching tenant.
--     Parity drift here means Phase-A backfill was incomplete — block.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE missing_count integer;
BEGIN
SELECT COUNT(*) INTO missing_count
FROM public.organizations o
  LEFT JOIN public.tenants t ON t.id = o.id
WHERE t.id IS NULL;
IF missing_count > 0 THEN RAISE EXCEPTION 'G-015 Phase-B ABORTED: % organizations row(s) have no matching tenants row. Run Phase-A backfill script before proceeding.',
missing_count;
END IF;
RAISE NOTICE 'G-015 Phase-B pre-flight OK: all % organizations rows have matching tenants rows.',
(
  SELECT COUNT(*)
  FROM public.organizations
);
END;
$$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  ADD DEFERRED FOREIGN KEY
--
--   DEFERRABLE          — allows deferral per transaction
--   INITIALLY DEFERRED  — deferred by default (checked at COMMIT)
--   ON DELETE CASCADE   — if tenants row is deleted, organizations row follows
--   schema-qualified    — both sides fully qualified to prevent search_path ambiguity
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_id_fkey FOREIGN KEY (id) REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  POST-FK VERIFICATION BLOCK
--     Confirms constraint was created with the correct name and type.
--     Fails fast if constraint is missing rather than silently continuing.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE fk_count integer;
is_deferrable text;
initially_def text;
BEGIN
SELECT COUNT(*),
  MAX(tc.is_deferrable),
  MAX(tc.initially_deferred) INTO fk_count,
  is_deferrable,
  initially_def
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'organizations'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name = 'organizations_id_fkey';
IF fk_count != 1 THEN RAISE EXCEPTION 'G-015 Phase-B VERIFY FAIL: organizations_id_fkey FK not found (count=%).',
fk_count;
END IF;
IF is_deferrable != 'YES' THEN RAISE EXCEPTION 'G-015 Phase-B VERIFY FAIL: FK is not DEFERRABLE (is_deferrable=%).',
is_deferrable;
END IF;
IF initially_def != 'YES' THEN RAISE EXCEPTION 'G-015 Phase-B VERIFY FAIL: FK is not INITIALLY DEFERRED (initially_deferred=%).',
initially_def;
END IF;
RAISE NOTICE '══════════════════════════════════════════════════════════';
RAISE NOTICE 'G-015 Phase-B VERIFY PASSED';
RAISE NOTICE 'Constraint: organizations_id_fkey';
RAISE NOTICE 'DEFERRABLE: % | INITIALLY DEFERRED: %',
is_deferrable,
initially_def;
RAISE NOTICE 'organizations.id → tenants.id (ON DELETE CASCADE)';
RAISE NOTICE 'Identity contract is now DB-enforced.';
RAISE NOTICE '══════════════════════════════════════════════════════════';
END;
$$;