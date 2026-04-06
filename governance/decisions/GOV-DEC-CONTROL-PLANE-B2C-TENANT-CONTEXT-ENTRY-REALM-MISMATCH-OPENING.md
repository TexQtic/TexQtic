# GOV-DEC-CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-OPENING

Decision ID: GOV-DEC-CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-OPENING
Title: Decide and open one bounded support unit for the live control-plane B2C tenant-context entry realm mismatch
Status: DECIDED
Date: 2026-04-06
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` remains OPEN as the sole
  current product-facing `ACTIVE_DELIVERY` unit
- `GOV-DEC-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION-PRODUCTION-VERIFICATION` recorded
  `PRODUCTION_VERIFICATION_BLOCKED` because the exact control-plane `App Shells` / `Enter Tenant
  Context` workflow could identify the B2C proof tenant but could not enter tenant context
- that blocker was recorded with one exact live symptom chain only:
  - `App Shells` remained on `Loading workspace...`
  - the bounded entry flow remained on `Starting...`
  - runtime emitted `REALM_MISMATCH: Tenant endpoint requires TENANT realm, got CONTROL_PLANE`
- the same production-verification record preserved
  `ENTERPRISE-AUTHENTICATED-ORDERS-TOKEN-EXPIRY-NEIGHBOR-SMOKE-001` as a separate adjacent finding
  only

Current repo and governance truth further confirm that:

- `components/ControlPlane/TenantDetails.tsx` exposes the bounded `Enter Tenant Context` action on
  the control-plane tenant deep-dive surface
- `App.tsx` contains the exact control-plane impersonation-start handoff, including tenant-detail
  lookup, `startImpersonationSession(...)`, tenant-realm switching, and directly coupled tenant
  bootstrap continuity
- `services/authService.ts` contains the directly coupled `/api/me` bootstrap used to hydrate the
  tenant context after a successful tenant-side handoff
- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`, `IMPERSONATION-SESSION-REHYDRATION-002`, and
  `REALM-BOUNDARY-SHELL-AFFORDANCE-001` are already closed bounded units and do not authorize this
  remaining blocker by implication
- `TENANT-ELIGIBILITY-REPO-TRUTH-VALIDATION-001` already classified the empty-membership
  `No eligible member found for this tenant.` branch as separate and insufficient to become the
  governing frame for this blocker

## Problem Statement

The open B2C shell unit cannot complete truthful production verification because the current
control-plane tenant-context entry path fails before the reviewed B2C tenant shell can be entered.

Leaving this blocker inside the active B2C shell unit would either pressure that unit to absorb
control-plane/auth-adjacent handoff work outside its shell boundary or would encourage untruthful
verification claims. The decision question is therefore whether the live blocker is exact enough to
open now as one separate bounded support unit and, if so, what its minimum lawful scope is.

## Required Determinations

### 1. Is the blocker real and outside the active B2C shell unit?

Yes.

The production blocker is already canonically recorded on the live control-plane tenant-context
entry path. The active B2C unit governs authenticated-affordance exposure on the exact non-WL B2C
`HOME` shell path. It does not govern the control-plane tenant deep-dive entry handoff used to
reach that path for truthful live verification.

### 2. Is the blocker exact enough to open now as one bounded support unit?

Yes.

Current evidence reduces to one exact blocker seam:

- control-plane tenant deep-dive selection is materially real
- the bounded `Enter Tenant Context` action is materially real
- the directly coupled handoff into tenant context is not truthful on the exercised live path
- the exercised failure is specific and repeatable enough to name by one exact symptom family:
  control-plane B2C tenant-context entry realm mismatch

This is not a truthful broad auth/session umbrella, not a reopening of the closed auth-shell or
rehydration units, and not a generic control-plane modernization problem.

### 3. What is the minimum lawful bounded scope?

The minimum lawful future remediation scope is limited to the exact control-plane tenant-context
entry seam only:

- the `Enter Tenant Context` initiation surface in `components/ControlPlane/TenantDetails.tsx`
- the directly coupled handoff and realm/tenant bootstrap path in `App.tsx`
- the directly coupled tenant bootstrap call in `services/authService.ts`

No broader control-plane registry/deep-dive redesign, auth redesign, tenant-shell redesign, or
shared token/client architecture rewrite is authorized by this opening.

### 4. Must the separate enterprise Orders token finding remain excluded?

Yes.

`ENTERPRISE-AUTHENTICATED-ORDERS-TOKEN-EXPIRY-NEIGHBOR-SMOKE-001` remains excluded because current
evidence does not prove inseparability. It is a different runtime path, a different symptom, and a
different readiness posture. Shared file overlap alone is not sufficient to merge it into this unit.

## Decision Result

`SUPPORT_OPENING_LAWFUL_TO_OPEN`

TexQtic now authorizes one bounded concurrent support unit:

- `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001`

Bounded rationale:

The live blocker is exact enough to isolate to one control-plane-to-tenant context-entry handoff
seam. Opening it now is lawful because it directly blocks truthful production verification of the
already-open B2C product unit, remains separable from closed auth/session units, and preserves the
enterprise Orders token finding as a separate adjacent candidate.

## Opening

The following unit is now opened:

- `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001`
- Title: `Control-plane B2C tenant-context entry realm mismatch`
- Type: `GOVERNANCE`
- Status: `OPEN`
- Delivery Class: `DECISION_QUEUE`

Reason:

- the blocker is real and already evidenced in live production verification
- it is separable from the active B2C shell unit
- it is narrower than any broad auth/session or control-plane remainder
- it exists only to unblock truthful production verification of the active B2C unit

## Sequence Discipline

This decision and opening do not reprioritize the current product lane.

Required Layer 0 posture after this opening is:

- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` remains the sole
  product-facing `ACTIVE_DELIVERY`
- `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` remains a concurrent support unit
  only
- the separate enterprise Orders token finding remains excluded and unopened here

The new support unit exists only to remove the tenant-context-entry blocker so truthful production
verification of the active B2C unit can later proceed. It does not replace, supersede, or close the
active B2C unit.