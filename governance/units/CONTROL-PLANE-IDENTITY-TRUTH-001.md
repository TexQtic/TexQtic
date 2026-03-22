---
unit_id: CONTROL-PLANE-IDENTITY-TRUTH-001
title: Control-plane displayed identity truth decision and pre-opening preparation
type: GOVERNANCE
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-22
closed: 2026-03-22
verified: 2026-03-22
commit: null
evidence: "LAYER_0_CONFIRMATION: repo entered this unit at OPERATOR_DECISION_REQUIRED after AUTH-IDENTITY-TRUTH-DEPLOYED-001 closed as SPLIT_REQUIRED · DEPLOYED_FINDING_CONFIRMATION: control-plane displayed identity truth is now a separately governable slice limited to authenticated control-plane chrome identity label correctness and persona presentation consistency only · GOVERNANCE_DECISION: OPENING_CANDIDATE because the control-plane slice is narrow enough for one later bounded implementation opening, but no implementation is opened by this unit"
doctrine_constraints:
  - D-004: this is one bounded governance-only unit; no implementation opening or product work may be mixed in
  - D-007: governance-only units must not touch application code, schema, tests, CI, or runtime configuration
  - D-011: control-plane identity truth must remain bounded to control-plane chrome and must not generalize to tenant or white-label shells without proof
  - D-013: recommendation is not authorization, candidate is not open, and closure is not continuation
decisions_required: []
blockers: []
---

## Unit Summary

`CONTROL-PLANE-IDENTITY-TRUTH-001` is the sole bounded governance unit for deciding whether the
control-plane displayed identity-truth slice is narrow enough for one later bounded implementation
opening.

Selected option: `OPENING_CANDIDATE`.

This unit prepares the governance state through decision, pre-opening preparation, verification
preparation, governance-sync preparation, and close preparation only. It does not open
implementation and does not authorize implementation by implication.

## Layer 0 State Confirmation

Layer 0 on entry is:

- `OPEN-SET.md`: no implementation-ready unit is `OPEN`
- `NEXT-ACTION.md`: `OPERATOR_DECISION_REQUIRED`
- `SNAPSHOT.md`: `AUTH-IDENTITY-TRUTH-DEPLOYED-001` is `CLOSED` as `SPLIT_REQUIRED`

This confirms that:

- `REALM-BOUNDARY-SHELL-AFFORDANCE-001` remains closed and must not be reopened
- `IMPERSONATION-STOP-CLEANUP-001` remains separate
- white-label identity behavior remains unproven for this defect family and must not be generalized

## Decision Question

Choose exactly one:

- `OPENING_CANDIDATE`
- `HOLD`
- `RECORD_ONLY`
- `NEEDS_MORE_BOUNDARY_REFINEMENT`

## Options Considered

### 1. `OPENING_CANDIDATE`

Selected.

The control-plane slice is now narrow enough to prepare one later bounded implementation opening.
The slice can be stated truthfully without dragging in tenant-shell identity truth, white-label
behavior, or stop-path cleanup.

### 2. `HOLD`

Rejected.

Evidence is strong enough to support one later bounded opening candidate. A hold would understate
the maturity of this control-plane-only slice.

### 3. `RECORD_ONLY`

Rejected.

The slice is stronger than a passive record. It now has a clear future opening boundary and a clear
runtime verification posture.

### 4. `NEEDS_MORE_BOUNDARY_REFINEMENT`

Rejected.

The parent split work has already done the needed separation. This slice is now narrow enough:
control-plane authenticated identity display truth only.

## Selected Option

`OPENING_CANDIDATE`

## Rationale

The control-plane slice is independently governable and later openable because the remaining defect
can now be stated in one bounded, shell-specific way:

- authenticated control-plane chrome displays identity truth incorrectly or ambiguously
- the defect concerns control-plane user/persona presentation consistency
- acceptance depends on live runtime chrome truth, not on local-only inference

This slice remains separate from:

- tenant-shell identity truth
- white-label identity truth
- impersonation stop cleanup
- realm-boundary affordance repair already closed under `REALM-BOUNDARY-SHELL-AFFORDANCE-001`

That makes one later bounded opening candidate lawful to define now, while still stopping before
implementation.

## Exact In-Scope Boundary

This unit covers only:

- control-plane authenticated identity display truth
- control-plane chrome identity label correctness
- control-plane user/persona presentation consistency
- determination of whether this slice is independently governable and later openable
- exact future opening boundary for this slice only
- exact future verification profile for this slice only
- pre-opening, pre-verification, pre-sync, and pre-close governance preparation only

## Exact Out-of-Scope Boundary

This unit excludes all of the following:

- implementation work
- product code changes
- auth architecture rewrite
- token/session redesign
- DB, schema, migration, Prisma, or API changes
- tenant-shell identity truth
- white-label identity truth or any white-label generalization
- impersonation persona clarity outside the control-plane displayed-identity slice
- `IMPERSONATION-STOP-CLEANUP-001`
- impersonation termination-path behavior
- realm-boundary continuation
- any mixed control-plane plus tenant-shell bundle
- broad auth program framing

## Future Opening Definition

If TexQtic later chooses to proceed, the exact future opening boundary must remain:

- one bounded implementation unit only
- objective: correct control-plane authenticated identity display truth in live control-plane chrome
- focus: control-plane identity label correctness and persona presentation consistency only
- no stop-path cleanup
- no tenant-shell or white-label scope
- no auth redesign or session/token redesign

### Future Unit Objective

Proposed future implementation objective:

- ensure the control-plane chrome displays the truthful active control-plane identity/persona state
  during authenticated runtime, including impersonation-context labeling if and only if that label
  is part of the control-plane displayed-identity defect itself

### Future File Allowlist Placeholder Strategy

The later opening, if separately created, should use a minimal allowlist limited to the actual
control-plane identity-display surfaces and any directly coupled control-plane-only identity label
helpers required for that slice. The opening must enumerate exact files then; this unit does not
open or approve those file edits yet.

### Future Acceptance Boundary

The later opening must be accepted only if:

- control-plane authenticated chrome displays the truthful active identity/persona state in deployed runtime
- any affected impersonation label in control-plane chrome is truthful and unambiguous
- no tenant-shell or white-label behavior is changed or claimed by implication
- no stop-path cleanup behavior is bundled in

### Implementation Status Statement

Implementation is not open in this operation.

`OPENING_CANDIDATE` is not `OPEN`.

## Future Verification Profile

Any later opening for this slice must require:

- runtime-sensitive verification
- effective runtime verification required
- deployed verification required because acceptance depends on live chrome truth
- no local-only proof accepted as the final acceptance boundary

Minimum future verification proof:

- authenticated control-plane session on the exact deployed build under review
- explicit observation of control-plane identity label truth before and during the relevant persona state
- explicit confirmation that no tenant-shell or white-label claim is being made from the result
- explicit confirmation that stop-path cleanup was not used as the acceptance path for this unit

## Governance Sync Preparation Summary

This unit records:

- selected option: `OPENING_CANDIDATE`
- rationale: control-plane displayed identity truth is now narrow enough for one later bounded opening candidate only
- exact future boundary: control-plane identity label correctness and persona presentation consistency only
- resulting next-action posture: `OPERATOR_DECISION_REQUIRED`
- no implementation opened in this operation

## Close Preparation Summary

This unit may close in the same operation because:

- the selected decision is recorded clearly
- the future opening candidate boundary is explicit
- the future verification profile is explicit
- no implementation was opened implicitly
- the mandatory post-close audit is emitted in the same operation

## Resulting NEXT-ACTION Posture

`OPERATOR_DECISION_REQUIRED`

Reason: this unit records one later bounded `OPENING_CANDIDATE`, but candidate is not open and no
implementation-ready unit is created by this operation.

## Mandatory Post-Close Audit

- whether this unit opened implementation: `NO`
- whether Layer 0 now contains any implementation-ready unit: `NO`
- whether tenant-shell or white-label scope was accidentally introduced: `NO`
- whether impersonation cleanup scope was accidentally introduced: `NO`
- whether future work remains decision-only: `YES`
- exact next lawful move: one later separate bounded opening decision may be considered for control-plane displayed identity truth only

## Risks / Blockers

- deployed acceptance still depends on live control-plane chrome truth rather than local-only proof
- impersonation persona labeling must stay bounded to displayed identity truth and must not drift into stop-path cleanup
- any future opening must preserve strict exclusion of tenant-shell and white-label scope
- any future opening must preserve strict exclusion of auth redesign claims

## Atomic Commit

`[CONTROL-PLANE-IDENTITY-TRUTH-001] record decision and pre-opening posture for control-plane identity truth`

**Read control-plane files before this unit file. This file refines unit-specific truth only.**