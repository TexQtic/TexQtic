# FAM-07I Hub Sync — FTR-AUTH-001 Remainder Terminology Reconciliation

## 1. Unit Metadata

- Unit ID: FAM-07I-HUB-SYNC-FTR-AUTH-001-REMAINDER-TERMINOLOGY-RECONCILIATION-001
- Date: 2026-05-30
- Mode: TECS Safe-Write governance sync only
- Scope: Hub terminology reconciliation only (no implementation, no schema, no runtime code)
- Family: FAM-07 Tenant Onboarding and Invite
- Parent evidence source: FAM-07I-NEW-USER-SUPABASE-INVITE-SUBPATH-REPO-TRUTH-AUDIT-001
- Status: VERIFIED_COMPLETE

## 2. Objective

Reconcile stale hub wording that described a "new-user Supabase invite sub-path DESIGN_GATED/OPEN" under FTR-AUTH-001, while preserving current governance status boundaries:

- FAM-07 remains PARTIALLY_IMPLEMENTED (not VERIFIED_COMPLETE)
- FTR-AUTH-001 remains PARTIAL (by governance convention)
- FTR-LEGAL-003 remains MVP_CRITICAL/OPEN
- HD-001 remains VERIFIED_BLOCKED
- FTR-AUTH-004 and FTR-AUTH-002 remain unchanged

## 3. Allowlisted Files Updated

1. governance/launch-readiness/FUTURE-TODO-REGISTER.md
2. governance/launch-readiness/LAUNCH-FAMILY-INDEX.md
3. governance/control/NEXT-ACTION.md
4. governance/control/OPEN-SET.md
5. artifacts/control-plane/FAM-07I-HUB-SYNC-FTR-AUTH-001-REMAINDER-TERMINOLOGY-RECONCILIATION-001.md (this file)

## 4. Evidence Summary and Status Decisions

1. Repo-truth audit (FAM-07I) confirms onboarding invite activation is app-level invite-token architecture.
2. Sign-in-first path remains verified by FAM-07D3.
3. New-user activation hardening remains verified by FAM-07G.
4. Prior phrase "new-user Supabase invite sub-path DESIGN_GATED/OPEN" was terminology drift.
5. FTR-AUTH-001 remains PARTIAL (status retained), but wording now aligned to app-level flow and TEST_CONFIRMED evidence posture.

## 5. Exact Status Decisions Applied

- FTR-AUTH-001: PARTIAL (unchanged), wording reconciled to app-level invite-token activation, Readiness updated to TEST_CONFIRMED.
- FAM-07: PARTIALLY_IMPLEMENTED (unchanged), not VERIFIED_COMPLETE.
- FTR-LEGAL-003: MVP_CRITICAL/OPEN (unchanged).
- HD-001: VERIFIED_BLOCKED (unchanged).
- FTR-AUTH-004: PILOT_REQUIRED/OPEN (unchanged).
- FTR-AUTH-002: POST_MVP/BLOCKED (unchanged).

## 6. Remaining Gates

1. FAM-07E (ToS legal text gate) remains HOLD_FOR_AUTHORIZATION.
2. FAM-07H (SMTP infrastructure) remains HOLD_FOR_AUTHORIZATION.
3. FAM-07J (invite UX) remains HOLD_FOR_AUTHORIZATION.
4. FTR-LEGAL-003 remains open and MVP-critical.
5. HD-001 remains verified-blocked until infra-side closure conditions are satisfied.

## 7. Q1-Q14 Hub-Sync Checklist

Q1. Did launch-readiness truth change?
- Yes. Terminology truth changed from stale Supabase wording to app-level invite-token wording.

Q2. Which requirement/family changed?
- FTR-AUTH-001 wording in FAM-07 surfaces.

Q3. Which hub files required update?
- FUTURE-TODO-REGISTER, LAUNCH-FAMILY-INDEX, NEXT-ACTION, OPEN-SET.

Q4. What evidence supports updates?
- FAM-07I repo-truth audit + existing verified FAM-07D3/FAM-07G evidence.

Q5. Any CRM/CAE contamination risk introduced?
- No.

Q6. Any MVP promotion performed incorrectly?
- No. FAM-07 not promoted; FTR-AUTH-001 remains PARTIAL.

Q7. Any stale rows superseded?
- Yes. Stale "new-user Supabase invite sub-path DESIGN_GATED" wording superseded.

Q8. Hub update required?
- Yes, and completed.

Q9. Were all edits within allowlist?
- Yes.

Q10. Mapped FTR inventory for FAM-07 checked?
- Yes: FTR-AUTH-001, FTR-LEGAL-003, HD-001, FTR-AUTH-004, FTR-AUTH-002.

Q11. MVP_CRITICAL and launch-blocking items still visible?
- Yes: FTR-LEGAL-003 and HD-001 remain visible; FTR-AUTH-001 remains visible.

Q12. Scope classifications preserved?
- Yes. No out-of-scope status mutation applied.

Q13. LFI section visibility for open gates preserved?
- Yes. FTR-LEGAL-003 and HD-001 remain explicit on FAM-07 rows.

Q14. MVP cutline integrity preserved?
- Yes. FAM-07 remains LAUNCH_BLOCKER / PARTIALLY_IMPLEMENTED.

## 8. AR-001 through AR-008 Compliance

AR-001: FTR row family mapping retained.
- Pass. FTR-AUTH-001 continues to carry -> FAM-07 mapping.

AR-002: No improper family completion promotion.
- Pass. FAM-07 remains not VERIFIED_COMPLETE.

AR-003: No forced family downgrade from overlay noise.
- Pass. Family status unchanged.

AR-004: MVP-critical overlays remain visible.
- Pass. FTR-LEGAL-003 and HD-001 remain explicit.

AR-005: No cross-system contamination.
- Pass. No CRM/CAE details introduced.

AR-006: No unverified status inflation.
- Pass. No OPEN->VERIFIED_COMPLETE promotion performed.

AR-007: Row-level terminology aligned to repo truth.
- Pass. Stale Supabase sub-path terminology removed.

AR-008: Safe-write boundary and minimal diff preserved.
- Pass. Only allowlisted governance files changed.

## 9. Commands and Results

1. Preflight cleanliness + head:
- Command: git status --short; git rev-parse --short HEAD
- Result: clean worktree, HEAD 6322c753

2. Required search sweep:
- Command: rg -n "FTR-AUTH-001|Supabase invite|Supabase Auth|new-user Supabase|DESIGN_GATED|PARTIAL|FAM-07" governance/launch-readiness governance/control artifacts/control-plane
- Result: reviewed from captured output file; stale wording occurrences identified and reconciled in allowlisted files only.

3. Post-edit validation:
- Command: git diff -- governance/launch-readiness/FUTURE-TODO-REGISTER.md governance/launch-readiness/LAUNCH-FAMILY-INDEX.md governance/control/NEXT-ACTION.md governance/control/OPEN-SET.md artifacts/control-plane/FAM-07I-HUB-SYNC-FTR-AUTH-001-REMAINDER-TERMINOLOGY-RECONCILIATION-001.md
- Result: only the five allowlisted files changed.

4. Post-edit status:
- Command: git status --short
- Result: only the five allowlisted files modified/staged as expected for this unit.

## 10. Next Options (No Auto-Open)

1. Hold at governance sync close (recommended default).
2. Await explicit authorization for FAM-07E legal-text implementation.
3. Await explicit authorization for FAM-07H SMTP infra unit.
4. Await explicit authorization for FAM-07J invite UX unit.

## 11. Final Enum

FAM_07I_HUB_SYNC_COMPLETE_FTR_AUTH_001_TERMINOLOGY_RECONCILED_REMAINS_PARTIAL
