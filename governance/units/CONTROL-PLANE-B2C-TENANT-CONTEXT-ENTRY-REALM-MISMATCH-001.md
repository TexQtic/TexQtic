---
unit_id: CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001
title: Control-plane B2C tenant-context entry realm mismatch
type: GOVERNANCE
status: OPEN
delivery_class: DECISION_QUEUE
wave: W5
plane: BOTH
opened: 2026-04-06
closed: null
verified: null
commit: null
evidence: "BLOCKER_CONFIRMATION: GOV-DEC-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION-PRODUCTION-VERIFICATION already recorded the exact live control-plane tenant-context entry failure on the B2C proof tenant only · SEPARATION_CONFIRMATION: closed auth-shell transition, impersonation rehydration, and realm-boundary shell-affordance units do not govern this remaining entry blocker and TENANT-ELIGIBILITY-REPO-TRUTH-VALIDATION-001 preserves empty-membership handling as separate · BOUNDARY_CONFIRMATION: current repo truth centers the unit on TenantDetails -> App.tsx impersonation-start handoff -> directly coupled tenant bootstrap only · SUPPORT_OPENING_CONFIRMATION: the active B2C shell unit remains the sole product-facing ACTIVE_DELIVERY and this unit opens only to unblock truthful production verification"
doctrine_constraints:
  - D-004: this is one bounded governance-only support unit only; it must not merge B2C shell reopening, broader auth/session redesign, control-plane tenant-operations redesign, or the separate enterprise Orders token finding
  - D-007: any later implementation and verification must remain confined to the exact remediation surface and approved governance sync files only
  - D-013: this opening does not satisfy implementation, verification, governance sync, or closure
  - D-016: this support unit does not change product priority and does not imply any broader control-plane, auth, or adjacent-family opening
decisions_required:
  - GOV-DEC-CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-OPENING: DECIDED (2026-04-06, Paresh)
blockers: []
---

## Unit Summary

`CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` is one bounded governance-only
support unit.

It exists only to isolate the live control-plane tenant-context entry blocker that prevents truthful
production verification of the open B2C shell unit.

This unit does not replace or supersede the active B2C shell unit.

Current result: `OPEN`.

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

## Active Product Relationship

- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` remains the sole open
  product-facing `ACTIVE_DELIVERY` unit
- this unit exists only to remove the blocker that currently prevents truthful production
  verification of that active B2C unit
- this unit does not authorize closure, re-scoping, or re-verification of the active B2C unit by
  implication
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