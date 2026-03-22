---
unit_id: CONTROL-PLANE-AUTH-SHELL-TRANSITION-002
title: Open bounded implementation unit for control-plane auth-shell transition
type: IMPLEMENTATION
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-22
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: OPEN-SET entered with CONTROL-PLANE-IDENTITY-TRUTH-002 as OPEN in VERIFICATION, NEXT-ACTION entered on that same blocked verification posture, and SNAPSHOT carried CONTROL-PLANE-AUTH-SHELL-TRANSITION-001 as CLOSED with result OPENING_CANDIDATE only · OPENING_DECISION: Yes, open exactly one additional bounded implementation unit because the control-plane auth-shell transition defect is now narrow and evidenced enough if and only if the scope remains limited to control-plane shell entry, mount-time rehydration, and login-success-to-shell-state propagation only"
doctrine_constraints:
  - D-004: this opening creates exactly one additional bounded implementation unit and must not merge banner identity truth, tenant-shell, white-label, impersonation stop cleanup, or any broader auth slice
  - D-007: opening only; no implementation, product code edits, schema work, tests, or config changes occur in this operation
  - D-011: acceptance must remain limited to control-plane auth-shell transition truth and must not generalize to tenant or white-label shells without separate proof
  - D-013: opening authorizes one later implementation step only and does not itself satisfy implementation, verification, sync, or closure
decisions_required: []
blockers: []
---

## Unit Summary

`CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` is the bounded implementation-ready unit for the
control-plane auth-shell transition defect only.

Opening decision: `YES`.

This opening is lawful because `CONTROL-PLANE-AUTH-SHELL-TRANSITION-001` already closed as
`OPENING_CANDIDATE` only, the live defect is evidenced enough to isolate one truthful transition
slice, and the resulting posture preserves separation from `CONTROL-PLANE-IDENTITY-TRUTH-002`.

Implementation remains not yet executed in this operation.

## Layer 0 State Confirmation

Exact Layer 0 posture on entry:

- `OPEN-SET.md`: `CONTROL-PLANE-IDENTITY-TRUTH-002` is `OPEN`
- `NEXT-ACTION.md`: `CONTROL-PLANE-IDENTITY-TRUTH-002` remains the current verification posture
- `SNAPSHOT.md`: `CONTROL-PLANE-AUTH-SHELL-TRANSITION-001` is `CLOSED` with result `OPENING_CANDIDATE` only

This confirms all required entry truths:

- `CONTROL-PLANE-IDENTITY-TRUTH-002` remains `OPEN` in `VERIFICATION`
- runtime acceptance for `CONTROL-PLANE-IDENTITY-TRUTH-002` is currently blocked by this separate deployed runtime defect
- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-001` remains decision authority only and does not itself open implementation
- white-label behavior remains out of scope
- tenant-shell behavior remains out of scope

## Opening Decision

Yes — open one bounded implementation unit only if the exact scope below is preserved.

## Exact Bounded Implementation Objective

Correct the control-plane auth-shell transition so that, after valid control-plane authentication
succeeds, the SPA enters and rehydrates the authenticated control-plane shell truthfully and
consistently in the control-plane path.

## Exact In-Scope Boundary

This unit is limited to:

- control-plane post-login shell transition
- control-plane session rehydration on app mount
- login-success-to-shell-state propagation for the control-plane path
- separation between valid control-plane auth success and failed shell entry
- bounded future verification definition for this slice

## Exact Out-of-Scope Boundary

This unit excludes all of the following:

- implementation in this opening operation
- product code edits
- control-plane banner identity-truth repair
- tenant-shell identity truth
- white-label identity truth
- impersonation stop cleanup
- broader impersonation behavior
- auth architecture rewrite
- token or session redesign beyond this bounded shell-entry path
- DB or schema changes
- API redesign
- realm-boundary continuation
- multi-slice auth bundle
- hidden expansion into a broader auth program

## Exact Acceptance Boundary

Acceptance is satisfied only when:

- valid control-plane authentication success results in entry to the authenticated control-plane shell in the exercised runtime path
- acceptance includes truthful mount-time rehydration of the control-plane shell when valid control-plane auth state already exists
- acceptance does not rely on tenant-shell correctness
- acceptance does not rely on white-label behavior
- acceptance does not rely on impersonation stop cleanup behavior
- acceptance does not claim broader auth correctness beyond the control-plane auth-shell transition slice

## Exact Verification Profile

- unit type: runtime-sensitive auth/shell transition correction
- required verification modes:
  - local implementation verification
  - effective runtime verification
  - deployed verification if acceptance depends on live runtime shell-entry truth
- exclusions:
  - local-only proof is insufficient if deployed behavior is the acceptance boundary
  - tenant-shell and white-label verification are excluded from this unit unless used only as explicitly labeled exclusion or non-regression checks

## Governance Posture After Opening

Resulting governance posture after this opening:

- `CONTROL-PLANE-IDENTITY-TRUTH-002` remains `OPEN` in `VERIFICATION`
- one additional implementation unit is now `OPEN`
- the new open unit is `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`
- scope remains control-plane auth-shell transition only
- no implementation has been executed yet for this unit
- the next canonical phase is later implementation for `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` only

## Allowed Future Implementation Boundary

The later implementation step, if separately performed, must remain bounded to restoring truthful
control-plane shell entry and mount-time rehydration after valid control-plane auth succeeds,
including any directly coupled control-plane-only login-success propagation state required to enter
that shell consistently.

The later implementation step must not absorb banner identity truth, tenant-shell, white-label,
impersonation stop cleanup, broader impersonation behavior, auth redesign, schema, or API scope.

## Risks / Blockers

- acceptance is runtime-sensitive and may require deployed proof if the exercised shell-entry truth boundary depends on live runtime behavior
- `CONTROL-PLANE-IDENTITY-TRUTH-002` remains blocked until this separate runtime defect is repaired and verified
- login-success propagation and mount-time rehydration must stay one bounded slice and must not drift into broader auth redesign

## Implementation Status Statement

Implementation remains not yet executed.

This operation is Opening only.

## Atomic Commit

`[CONTROL-PLANE-AUTH-SHELL-TRANSITION-002] open bounded implementation unit for control-plane auth-shell transition`

**Read control-plane files before this unit file. This file refines unit-specific truth only.**