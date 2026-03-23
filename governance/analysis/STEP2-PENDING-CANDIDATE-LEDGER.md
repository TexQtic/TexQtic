# STEP2-PENDING-CANDIDATE-LEDGER

Date: 2026-03-23
Type: GOVERNANCE ANALYSIS LEDGER
Status: ACTIVE
Scope: Canonical bounded ledger for Step 2 pending-candidate validation results recorded through governance-analysis artifacts. No implementation authorized. No Layer 0 status transition.

## Purpose

This ledger exists because current repo practice already supports bounded governance-analysis
artifacts under `governance/analysis/`, but no canonical Step 2 pending-candidate ledger existed.

The least-disruptive canonical pattern in the current repo is therefore:

1. keep Step 2 pending-candidate validation records in one bounded ledger artifact under
   `governance/analysis/`
2. keep supporting validation reasoning in the individual analysis artifact for the specific
   candidate
3. append the execution log when a governance-analysis artifact of this class is created or updated
4. leave Layer 0 control files unchanged unless a later governance unit explicitly requires Layer 0
   operational truth to change

This file is the canonical ledger for that Step 2 record class unless later superseded by an
explicit governance decision.

## Ledger Fields

- candidate name
- original pending framing
- validation unit ID
- current classification
- sequencing status
- preserved narrower note
- brief rationale
- validation artifact reference
- confidence level
- last updated date and unit

## Step 2 Candidate Validation Ledger

| Candidate Name | Original Pending Framing | Validation Unit ID | Current Classification | Sequencing Status | Preserved Narrower Note | Brief Rationale | Validation Artifact | Confidence | Last Updated |
|---|---|---|---|---|---|---|---|---|---|
| impersonation stop-path / cleanup | Preserved historically as a separate pending candidate from impersonation session rehydration and broader identity-truth or auth-shell work | `IMPERSONATION-STOP-PATH-REPO-TRUTH-VALIDATION-001` | `insufficient evidence` | `parked pending narrower evidence` | Preserve only as a historically separate candidate name pending any later direct evidence of a narrower stop-cleanup failure mode. | Current repo truth shows an implemented server stop path, implemented client exit cleanup, and fail-closed stale-state clearing. Preserve the historical candidate reference only; do not treat the current broad form as an active bounded sequencing candidate. A narrower future candidate may exist, but it is not currently evidenced enough to sequence. | `governance/analysis/IMPERSONATION-STOP-PATH-REPO-TRUTH-VALIDATION.md` | `HIGH` | `2026-03-23 · STEP2-PENDING-CANDIDATE-LEDGER-SYNC-001` |
| tenant eligibility | Treated pendingly as if the observed message `No eligible member found for this tenant.` could represent one separate broad sequencing candidate. | `TENANT-ELIGIBILITY-REPO-TRUTH-VALIDATION-001` | `insufficient evidence` | `removed as active broad candidate; parked as narrower note only` | Preserve only as a narrower impersonation-member-resolution / empty-membership-handling note. Do not treat it as a generic tenant-eligibility sequencing candidate. | Current repo truth shows the message exists only as a local client-side preflight string in the control-plane impersonation start flow and is currently reached when no memberships are returned in the tenant detail payload. That is narrower than a broad tenant-eligibility defect family and does not support active sequencing in the broad form. | `governance/analysis/TENANT-ELIGIBILITY-REPO-TRUTH-VALIDATION.md` | `HIGH` | `2026-03-23 · PENDING-LIST-SYNC-TENANT-ELIGIBILITY-001` |
| auth/session instability | Treated pendingly as if one broad umbrella candidate still covered auth persistence, token restoration, shell entry, session rehydration, and related continuity failures. | `AUTH-SESSION-INSTABILITY-REPO-TRUTH-VALIDATION-001` | `already resolved / stale` | `removed as active broad candidate` | Do not treat this as an active umbrella sequencing candidate. Any future recurrence must be named by the exact bounded surface, and the broad label must not be reused unless a new validation proves a genuinely broad unresolved family has re-emerged. | Current repo truth shows explicit stale-token protections, explicit control-plane mount-time restoration safeguards, explicit impersonation-session restoration logic, and tenant-login hydration safeguards. Governance history shows the concrete live session-state failures were already split into narrower units for control-plane auth-shell transition and impersonation session rehydration, and those slices are already closed. | `governance/analysis/AUTH-SESSION-INSTABILITY-REPO-TRUTH-VALIDATION.md` | `HIGH` | `2026-03-23 · PENDING-LIST-SYNC-AUTH-SESSION-INSTABILITY-001` |
| B2C New Arrivals placeholder-image fallback surface | Treated pendingly as if `other image surfaces beyond App.tsx:1522` remained one broad unresolved image-surface umbrella candidate. | `IMAGE-SURFACE-REPO-TRUTH-VALIDATION-001` | `narrower issue set` | `broad umbrella retired; preserve exact narrower surviving candidate only` | Preserve only the exact B2C `New Arrivals` placeholder-image fallback surface at `App.tsx:1698`, where the current fallback remains `https://via.placeholder.com/400x500`. Do not treat this as a broad unresolved multi-surface image family. The exact `App.tsx:1522` surface is already governed and closed, WL image behavior remains separate, and the broad image-surface umbrella must not be revived unless a later validation proves multiple exact unresolved surfaces. | Current repo and governance truth reduce the former broad image-surface label to one exact narrower surviving surface in the active B2C EXPERIENCE branch. The already closed `App.tsx:1522` image-surface unit remains bounded and closed, and separately governed WL image behavior does not support keeping the old broad umbrella active. | `governance/analysis/IMAGE-SURFACE-REPO-TRUTH-VALIDATION.md` | `HIGH` | `2026-03-23 · PENDING-LIST-SYNC-IMAGE-SURFACE-001` |

## Layer 0 Status

Layer 0 remains unchanged by this ledger artifact:

- `governance/control/OPEN-SET.md`: unchanged
- `governance/control/NEXT-ACTION.md`: unchanged
- `governance/control/SNAPSHOT.md`: unchanged

## Maintenance Rule

Future Step 2 pending-candidate validation results should be added to this ledger rather than
starting parallel ledger files, unless an explicit later governance decision replaces this pattern.