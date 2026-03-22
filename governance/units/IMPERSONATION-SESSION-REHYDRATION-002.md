---
unit_id: IMPERSONATION-SESSION-REHYDRATION-002
title: Open bounded implementation unit for impersonation session rehydration
type: IMPLEMENTATION
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-22
closed: null
verified: null
commit: null
evidence: "OPENING_AUTHORITY: IMPERSONATION-SESSION-REHYDRATION-001 closed as OPENING_CANDIDATE only and remains the sole decision authority for this defect family · LAYER_0_CONFIRMATION: OPEN-SET contains no OPEN implementation unit, NEXT-ACTION is OPERATOR_DECISION_REQUIRED, and SNAPSHOT preserves the impersonation reload-loss defect as separate from identity-truth and baseline auth-shell transition · VERIFIED_DEFECT_BASELINE: active impersonation starts successfully, but during active impersonation reload returns the app to AUTH instead of restoring the impersonation session"
doctrine_constraints:
  - D-004: this opening creates exactly one bounded implementation unit and must not merge identity-truth, baseline auth-shell transition, tenant-shell correctness, white-label behavior, impersonation stop cleanup, or any broader auth or impersonation slice
  - D-007: opening only; no implementation, product code edits, schema work, tests, or config changes occur in this operation
  - D-011: acceptance must remain limited to impersonation session reload/rehydration truth and must not generalize to tenant-shell, white-label, or broader auth correctness without separate proof
  - D-013: opening authorizes one later implementation step only and does not itself satisfy implementation, verification, sync, or closure
decisions_required: []
blockers: []
---

## Unit Summary

`IMPERSONATION-SESSION-REHYDRATION-002` is the bounded implementation-ready unit for the
impersonation session reload-loss defect only.

Opening decision: `YES`.

This opening is lawful because `IMPERSONATION-SESSION-REHYDRATION-001` already closed as
`OPENING_CANDIDATE` only, Layer 0 enters at `OPERATOR_DECISION_REQUIRED`, the defect is already
evidenced in deployed runtime, and the resulting posture preserves strict separation from
`CONTROL-PLANE-IDENTITY-TRUTH-002`, `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`, tenant-shell
correctness, white-label behavior, and impersonation stop cleanup.

Implementation is not executed in this opening operation.

## Layer 0 State Confirmation

Exact Layer 0 posture on entry:

- `OPEN-SET.md`: no implementation-ready unit is `OPEN`
- `NEXT-ACTION.md`: `OPERATOR_DECISION_REQUIRED`
- `SNAPSHOT.md`: `IMPERSONATION-SESSION-REHYDRATION-001` is `CLOSED` with result
  `OPENING_CANDIDATE` only

This confirms all required entry truths:

- `IMPERSONATION-SESSION-REHYDRATION-001` is the decision authority for this opening
- `CONTROL-PLANE-IDENTITY-TRUTH-002` is `CLOSED` and must not be reopened
- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` is `CLOSED` and must not be reopened
- the new defect remains separate from tenant-shell correctness, white-label behavior, and
  impersonation stop cleanup

## Opening Decision

Yes — open one bounded implementation unit only if the exact scope below is preserved.

## Exact Bounded Implementation Objective

Correct impersonation session rehydration so that, when an active impersonation session exists and
the app reloads, the runtime restores the impersonation session truthfully instead of falling back
to `AUTH`.

## Exact In-Scope Boundary

This unit is limited to:

- impersonation session persistence across reload
- restoration of active impersonation state on app mount
- preservation of the authenticated control-plane actor plus impersonated tenant relationship after
  reload
- bounded future verification definition for this slice

## Exact Out-of-Scope Boundary

This unit excludes all of the following:

- implementation in this opening operation
- product code edits
- identity-truth repair
- baseline control-plane auth-shell transition repair
- tenant-shell correctness
- white-label correctness
- impersonation stop cleanup
- broader impersonation program
- auth architecture rewrite
- token/session model redesign beyond this bounded reload/rehydration path
- DB or schema changes
- API redesign
- realm-boundary work
- multi-slice auth bundle
- hidden expansion into broader auth or impersonation behavior

## Exact Acceptance Boundary

Acceptance is satisfied only when:

- an active impersonation session survives reload/remount in the exercised runtime path
- after reload, the restored state preserves the authenticated control-plane actor
- after reload, the restored state preserves the impersonated tenant target
- after reload, the restored state preserves the impersonation relationship between actor and tenant
- acceptance does not rely on tenant-shell correctness beyond the exercised impersonation path
- acceptance does not rely on white-label behavior
- acceptance does not rely on impersonation stop cleanup behavior
- acceptance does not claim broader auth or impersonation correctness beyond the reload/rehydration slice

## Exact Verification Profile

- unit type: runtime-sensitive impersonation-session rehydration correction
- required verification modes:
  - local implementation verification
  - effective runtime verification
  - deployed verification if acceptance depends on live runtime reload truth
- exclusions:
  - local-only proof is insufficient if deployed behavior is the acceptance boundary
  - stop-cleanup behavior is excluded from this unit
  - tenant-shell and white-label verification are excluded except as explicitly labeled boundary or
    non-regression checks

## Governance Posture After Opening

Resulting governance posture after this opening:

- one implementation unit is now `OPEN`
- the open unit is `IMPERSONATION-SESSION-REHYDRATION-002`
- scope remains impersonation session rehydration only
- no implementation has been executed yet
- the next canonical phase is later implementation for `IMPERSONATION-SESSION-REHYDRATION-002` only

## Allowed Future Implementation Boundary

The later implementation step, if separately performed, must remain bounded to restoring truthful
impersonation session continuity across reload in the exercised control-plane impersonation path,
including any directly coupled app-mount restoration logic or state continuity needed to preserve
the authenticated control-plane actor plus impersonated tenant relationship after reload.

The later implementation step must not absorb identity-truth, baseline auth-shell transition,
tenant-shell, white-label, stop cleanup, broader impersonation lifecycle, auth redesign, schema, or
API scope.

## Risks / Blockers

- acceptance is runtime-sensitive and may require deployed proof if the exercised reload truth
  boundary depends on live runtime behavior
- actor restoration and tenant restoration must remain one bounded slice only if they stay strictly
  inside the reload/rehydration path
- a later implementation must not use this opening to reopen already-closed identity-truth or
  baseline auth-shell transition claims

## Implementation Status Statement

Implementation remains not yet executed in this operation.

## Atomic Commit

`[IMPERSONATION-SESSION-REHYDRATION-002] open bounded implementation unit for impersonation session rehydration`

**Read control-plane files before this unit file. This file refines unit-specific truth only.**