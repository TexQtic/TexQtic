---
unit_id: CONTROL-PLANE-IDENTITY-TRUTH-002
title: Open bounded implementation unit for control-plane authenticated identity display truth
type: IMPLEMENTATION
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-22
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: OPEN-SET entered with zero implementation-ready units open, NEXT-ACTION entered as OPERATOR_DECISION_REQUIRED, and SNAPSHOT carried CONTROL-PLANE-IDENTITY-TRUTH-001 as CLOSED with result OPENING_CANDIDATE only · OPENING_DECISION: Yes, open exactly one bounded implementation unit because the control-plane slice is now narrow and evidenced enough if and only if the scope remains limited to control-plane authenticated identity display truth and runtime-sensitive acceptance"
doctrine_constraints:
  - D-004: this opening creates exactly one bounded implementation unit and must not merge tenant-shell, white-label, stop-cleanup, or any second slice
  - D-007: opening only; no implementation, product code edits, schema work, tests, or config changes occur in this operation
  - D-011: acceptance must remain limited to control-plane chrome identity truth and must not generalize to tenant or white-label shells without separate proof
  - D-013: opening authorizes one later implementation step only and does not itself satisfy implementation, verification, sync, or closure
decisions_required: []
blockers: []
---

## Unit Summary

`CONTROL-PLANE-IDENTITY-TRUTH-002` is the sole bounded implementation-ready unit for the
control-plane authenticated identity display-truth slice.

Opening decision: `YES`.

This opening is lawful because `CONTROL-PLANE-IDENTITY-TRUTH-001` already closed as
`OPENING_CANDIDATE` only, Layer 0 still entered at `OPERATOR_DECISION_REQUIRED`, and no other
implementation-ready unit is open.

Implementation remains not yet executed in this operation.

## Layer 0 State Confirmation

Exact Layer 0 posture on entry:

- `OPEN-SET.md`: no implementation-ready unit is `OPEN`
- `NEXT-ACTION.md`: `OPERATOR_DECISION_REQUIRED`
- `SNAPSHOT.md`: `CONTROL-PLANE-IDENTITY-TRUTH-001` is `CLOSED` with result `OPENING_CANDIDATE` only

This confirms all required entry truths:

- `AUTH-IDENTITY-TRUTH-DEPLOYED-001` remains `CLOSED` as `SPLIT_REQUIRED`
- `REALM-BOUNDARY-SHELL-AFFORDANCE-001` remains closed and must not be reopened or extended
- `IMPERSONATION-STOP-CLEANUP-001` remains separate
- white-label identity behavior remains unproven for this defect family and must not be generalized

## Opening Decision

Yes — open one bounded implementation unit only if the exact scope below is preserved.

## Exact Bounded Implementation Objective

Correct control-plane displayed identity truth so the control-plane chrome presents the
authenticated control-plane user/persona consistently and does not surface mixed or stale identity
presentation within the control-plane slice.

## Exact In-Scope Boundary

This unit is limited to:

- control-plane authenticated identity display truth
- control-plane chrome identity label correctness
- control-plane persona/user presentation consistency
- control-plane-only state used to render displayed identity
- bounded future verification definition for this slice

## Exact Out-of-Scope Boundary

This unit excludes all of the following:

- implementation in this opening operation
- product code edits
- tenant-shell identity truth
- white-label identity truth
- impersonation persona clarity outside control-plane chrome
- impersonation stop cleanup
- auth architecture rewrite
- token/session redesign
- DB or schema changes
- API redesign
- realm-boundary continuation
- multi-slice auth bundle
- hidden expansion into a broader identity program

## Exact Acceptance Boundary

Acceptance is satisfied only when:

- control-plane chrome identity presentation is truthful and internally consistent in the exercised control-plane runtime path
- acceptance does not rely on tenant-shell correctness
- acceptance does not rely on white-label behavior
- acceptance does not rely on stop-path cleanup behavior
- acceptance does not claim broader auth correctness beyond the control-plane slice

## Exact Verification Profile

- unit type: runtime-sensitive UI/auth-chrome correction
- required verification modes:
  - local implementation verification
  - effective runtime verification
  - deployed verification if acceptance depends on live runtime chrome truth
- exclusions:
  - local-only proof is insufficient if deployed behavior is the acceptance boundary
  - tenant-shell and white-label verification are excluded from this unit unless they are needed purely to prove non-regression at the control-plane boundary and are explicitly labeled as exclusion checks rather than in-scope acceptance

## Governance Posture After Opening

Resulting governance posture after this opening:

- one implementation unit is now `OPEN`
- the open unit is `CONTROL-PLANE-IDENTITY-TRUTH-002`
- scope remains control-plane identity truth only
- no implementation has been executed yet
- the next canonical phase is later implementation for `CONTROL-PLANE-IDENTITY-TRUTH-002` only

## Allowed Future Implementation Boundary

The later implementation step, if separately performed, must remain bounded to correcting
control-plane-only displayed identity truth in the authenticated control-plane chrome path and any
directly coupled control-plane-only state required to render that displayed identity truthfully.

The later implementation step must not absorb tenant-shell, white-label, stop-cleanup, broader
impersonation program, auth redesign, schema, or API scope.

## Risks / Blockers

- acceptance is runtime-sensitive and may require deployed proof if the exercised truth boundary depends on live control-plane chrome
- control-plane persona labeling must stay bounded to displayed identity truth and must not expand into stop-path cleanup
- tenant-shell and white-label observations must remain exclusion checks only unless separately opened later

## Implementation Status Statement

Implementation remains not yet executed.

This operation is Opening only.

## Atomic Commit

`[CONTROL-PLANE-IDENTITY-TRUTH-002] open bounded implementation unit for control-plane identity truth`

**Read control-plane files before this unit file. This file refines unit-specific truth only.**