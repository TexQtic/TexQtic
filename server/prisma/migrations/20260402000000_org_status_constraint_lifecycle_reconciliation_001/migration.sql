-- ORG-STATUS-CONSTRAINT-LIFECYCLE-RECONCILIATION-001
-- Reconcile the authoritative organizations.status constraint with the
-- lifecycle semantics already implemented and consumed across the repo.
-- Historical residue: prior contract allowed TERMINATED, while current repo truth
-- depends on CLOSED for the non-active terminal runtime state.
UPDATE public.organizations
SET status = 'CLOSED',
  updated_at = now()
WHERE status = 'TERMINATED';
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_status_check;
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_status_check CHECK (
    status IN (
      'ACTIVE',
      'SUSPENDED',
      'CLOSED',
      'PENDING_VERIFICATION',
      'VERIFICATION_APPROVED',
      'VERIFICATION_REJECTED',
      'VERIFICATION_NEEDS_MORE_INFO'
    )
  );
COMMENT ON COLUMN public.organizations.status IS 'Canonical organization lifecycle and onboarding state: ACTIVE, SUSPENDED, CLOSED, PENDING_VERIFICATION, VERIFICATION_APPROVED, VERIFICATION_REJECTED, VERIFICATION_NEEDS_MORE_INFO. Historical TERMINATED residue is normalized to CLOSED by ORG-STATUS-CONSTRAINT-LIFECYCLE-RECONCILIATION-001.';
DO $$
DECLARE v_constraint_def text;
BEGIN
SELECT pg_get_constraintdef(oid) INTO v_constraint_def
FROM pg_constraint
WHERE conrelid = 'public.organizations'::regclass
  AND conname = 'organizations_status_check';
IF v_constraint_def IS NULL THEN RAISE EXCEPTION 'VERIFY FAIL: organizations_status_check missing after reconciliation';
END IF;
IF position('TERMINATED' in v_constraint_def) > 0 THEN RAISE EXCEPTION 'VERIFY FAIL: organizations_status_check still contains TERMINATED: %',
v_constraint_def;
END IF;
IF position('ACTIVE' in v_constraint_def) = 0
OR position('SUSPENDED' in v_constraint_def) = 0
OR position('CLOSED' in v_constraint_def) = 0
OR position('PENDING_VERIFICATION' in v_constraint_def) = 0
OR position('VERIFICATION_APPROVED' in v_constraint_def) = 0
OR position('VERIFICATION_REJECTED' in v_constraint_def) = 0
OR position(
  'VERIFICATION_NEEDS_MORE_INFO' in v_constraint_def
) = 0 THEN RAISE EXCEPTION 'VERIFY FAIL: organizations_status_check does not contain the grounded target set: %',
v_constraint_def;
END IF;
END;
$$;