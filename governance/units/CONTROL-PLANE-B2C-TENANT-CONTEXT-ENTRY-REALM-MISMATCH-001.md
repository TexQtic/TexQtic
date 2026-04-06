---
unit_id: CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001
title: Control-plane B2C tenant-context entry realm mismatch
type: GOVERNANCE
status: CLOSED
delivery_class: DECISION_QUEUE
wave: W5
plane: BOTH
opened: 2026-04-06
closed: 2026-04-06
verified: 2026-04-06
commit: a637998
evidence: "BLOCKER_CONFIRMATION: GOV-DEC-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION-PRODUCTION-VERIFICATION recorded the exact live control-plane tenant-context entry failure on the B2C proof tenant only · REMEDIATION_CONFIRMATION: commit `a637998` corrected the bounded App.tsx impersonation-start -> tenant bootstrap handoff without widening into shared realm-client or enterprise Orders-token files · LIVE_RERUN_CONFIRMATION: the exact proof tenant is now reachable from both bounded control-plane entry surfaces in production, the earlier REALM_MISMATCH / Loading workspace / Starting symptom chain no longer reproduces, and the active B2C shell unit could then complete truthful production verification and separate closure · SEPARATION_CONFIRMATION: the earlier enterprise Orders neighbor-smoke issue did not reproduce on rerun and remains excluded here, while the impersonation-stop `404` observation remains a separate adjacent finding only · CLOSE_CONFIRMATION: GOV-DEC-CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-CLOSE closed this bounded support unit without absorbing the adjacent finding, enterprise Orders, or unrelated `g026` residue"
doctrine_constraints:
  - D-004: this is one bounded governance-only support unit only; it must not merge B2C shell reopening, broader auth/session redesign, control-plane tenant-operations redesign, or the separate enterprise Orders token finding
  - D-007: any later implementation and verification must remain confined to the exact remediation surface and approved governance sync files only
  - D-013: this opening does not satisfy implementation, verification, governance sync, or closure
  - D-016: this support unit does not change product priority and does not imply any broader control-plane, auth, or adjacent-family opening
decisions_required:
  - GOV-DEC-CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-OPENING: DECIDED (2026-04-06, Paresh)
  - GOV-DEC-CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-CLOSE: DECIDED (2026-04-06, Paresh)
blockers: []
---

## Unit Summary

`CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` is one bounded governance-only
support unit.

It exists only to isolate the live control-plane tenant-context entry blocker that had prevented
truthful production verification of the bounded B2C shell unit.

This unit does not replace or supersede the B2C shell unit.

Current result: `CLOSED`.

## Scope Statement

This unit may address only the exact control-plane-to-tenant context-entry handoff exercised during
the blocked live B2C production verification path.

It may preserve or harden only the directly coupled transition from control-plane tenant selection
into tenant-context bootstrap truth for that exact path.

It may not widen into general auth/session redesign, generic control-plane modernization, broader
tenant-shell work, or enterprise Orders-token handling.

## Files Allowlisted (Modify)

This governance record currently authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/GOV-DEC-CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-OPENING.md`
- `governance/units/CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001.md`

No other files are authorized for edit in this opening step.

## Exact In-Scope Boundary

This unit authorizes only:

1. the bounded `Enter Tenant Context` initiation path on the control-plane tenant deep-dive
2. the directly coupled handoff from control-plane impersonation start into tenant-context entry
3. the directly coupled tenant bootstrap continuity needed to enter the reviewed tenant shell
   truthfully on that exact path
4. focused verification of the exact control-plane B2C tenant-context entry path after blocker
   removal
5. explicit preservation of the separate enterprise Orders token finding as outside this unit

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- reopening or widening `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION`
- B2C shell redesign, public-shell redesign, or adjacent-family redesign
- control-plane tenant registry or tenant deep-dive redesign beyond the bounded entry action
- generic auth/session instability work
- reopening `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`, `IMPERSONATION-SESSION-REHYDRATION-002`, or
  `REALM-BOUNDARY-SHELL-AFFORDANCE-001`
- impersonation stop cleanup, generic impersonation lifecycle redesign, or broader realm-boundary
  continuation
- `ENTERPRISE-AUTHENTICATED-ORDERS-TOKEN-EXPIRY-NEIGHBOR-SMOKE-001`
- white-label, Aggregator, enterprise-wide, onboarding, domain, or `g026` work

## Authorized Remediation Surface

The next remediation pass inside this unit may modify only the minimum bounded surface below:

- `App.tsx`
- `components/ControlPlane/TenantDetails.tsx`
- `services/authService.ts`
- `governance/units/CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001.md`
- `governance/units/MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION.md`

If direct repo truth later proves that shared realm-client files or enterprise Orders-token files
must change to resolve this blocker, implementation must halt and reopen classification rather than
widen this unit implicitly.

## Product Unit Relationship

- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` is now separately `CLOSED`
- this unit fulfilled its sole blocker-removal remit that had enabled truthful production
  verification and separate close of that bounded B2C unit
- this unit does not reopen or supersede the closed B2C unit by implication
- the separate enterprise Orders token finding remains unchanged and excluded here

## Exact Verification Profile

- verification type: live control-plane tenant-context entry blocker removal on the exact reviewed
  B2C proof path
- required verification modes:
  - focused local proof on the exact bounded remediation surface
  - truthful production verification of the exact control-plane tenant selection -> tenant-context
    entry path for the reviewed B2C proof tenant
  - explicit non-regression proof that the control-plane tenant deep-dive entry action still opens
    and that the active B2C unit can then resume truthful production verification
- explicit exclusions:
  - enterprise Orders-token smoke remains separate
  - broader auth/session claims remain separate
  - broad control-plane tenant-operations truth remains separate

## Verification Record

- verification result: `VERIFIED_COMPLETE`
- verification date: `2026-04-06`
- remediation baseline: `a637998`
- live rerun evidence summary:
  - the control-plane tenant registry loaded successfully on `https://app.texqtic.com/`
  - the exact proof tenant `B2C Browse Proof 20260402080229` remained discoverable in the live registry
  - bounded row-level impersonation / `Enter Tenant Context` now succeeded for that tenant
  - bounded `App Shells` entry now also succeeded for that same tenant
  - the earlier `REALM_MISMATCH`, `Loading workspace...`, and `Starting...` blocker no longer reproduced
  - truthful production verification of the active B2C unit resumed and completed separately
  - the earlier enterprise `Orders` neighbor-smoke issue did not reproduce on rerun and remains excluded from this unit
  - the observed impersonation-stop `404` during exit remains a separate adjacent finding only and is not investigated or absorbed here

## Governance Sync

- governance sync phase: completed
- status transition: `OPEN` -> `VERIFIED_COMPLETE`
- next lawful lifecycle step after this sync: separate Close for `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` only
- active product relationship after sync:
  - `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` is now separately `CLOSED`
  - this support unit fulfilled its sole blocker-removal remit and does not supersede or absorb the active B2C unit
  - no closure is implied by this sync

## Close Record

- close date: `2026-04-06`
- resulting status: `CLOSED`
- close basis:
  - commit `a637998` had already removed the exact control-plane B2C tenant-context entry blocker
    on the bounded remediation surface
  - live production rerun already established `VERIFIED_COMPLETE` on the exact governed path
  - `GOV-DEC-B2C-SHELL-CLOSE-WITH-ADJACENT-FINDING` had already closed the B2C product unit that
    this support unit existed to unblock
  - `GOV-DEC-IMPERSONATION-STOP-CLEANUP-404-ADJACENT-FINDING` records the observed stop-path
    `404` as a separate non-blocking adjacent finding only
- close summary:
  - both bounded control-plane entry surfaces reach the exact proof tenant successfully
  - the earlier `REALM_MISMATCH`, `Loading workspace...`, and `Starting...` symptom chain no
    longer reproduces
  - the bounded B2C shell unit already completed separate truthful production verification and is
    already `CLOSED`
  - the earlier enterprise `Orders` neighbor-smoke issue did not reproduce on rerun and remains
    separate
  - the observed impersonation-stop cleanup `404` remains separate and is not absorbed into this
    closed support unit
  - no successor opening is implied by this close

## Current Layer 0 Rule

`CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` is now `CLOSED`.

`NEXT-ACTION.md` now returns to a no-open derived-product-truth pointer because no product-facing
`ACTIVE_DELIVERY` unit is currently open.

The adjacent finding `IMPERSONATION-STOP-CLEANUP-404-001` remains decision-only and does not
create an opening. `g026-platform-subdomain-routing.spec.ts` remains unrelated and out of scope.

## Last Governance Confirmation

2026-04-06 — `GOV-DEC-CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-CLOSE`. Status
transitioned: `VERIFIED_COMPLETE` -> `CLOSED` after the already-recorded bounded remediation
baseline, live production rerun proof, separate close of the B2C shell unit this support unit had
unblocked, and compact Layer 0 sync. Commit `a637998` had already removed the exact control-plane
B2C tenant-context entry blocker, both bounded control-plane entry surfaces reach the exact proof
tenant successfully, the earlier blocked symptom chain no longer reproduces, and the observed
impersonation-stop `404` remains separate and non-blocking under
`GOV-DEC-IMPERSONATION-STOP-CLEANUP-404-ADJACENT-FINDING`. No broader auth or control-plane
redesign is reopened here, the earlier enterprise Orders token path remains separate, no successor
opening is implied, and `g026-platform-subdomain-routing.spec.ts` remains unrelated residue.
