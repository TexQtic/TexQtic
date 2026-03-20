# GOV-POLICY-MANDATORY-POST-CLOSE-GOVERNANCE-AUDIT

Decision ID: GOV-POLICY-MANDATORY-POST-CLOSE-GOVERNANCE-AUDIT
Title: Every Governance Sync and Close must emit a mandatory post-close governance audit without authorizing further work
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state already records that:

- Layer 0 is the operational truth
- `NEXT-ACTION.md` contains exactly one authorized next action
- decision creation does not equal implementation authorization
- `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` is `CLOSED`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is currently `OPERATOR_DECISION_REQUIRED`

TexQtic already preserves the canonical sequence:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

What is missing is a mandatory, compact, doctrine-safe post-state output after a governance sync
or close. Without that output, the operator must repeatedly reconstruct "what now?" from the same
Layer 0 and decision context, which creates avoidable friction and increases the risk of
over-reading a closed child slice as implied authorization.

## Problem Statement

After a Governance Sync or Close, TexQtic must not stop at a passive terminal state with no
carry-forward sequencing guidance. At the same time, TexQtic must not convert a closed or synced
state into implicit implementation authority.

The required solution is a mandatory advisory audit that reduces repeated operator analysis while
preserving all existing gates, sequence discipline, and single-next-action control.

## Decision

TexQtic adopts a mandatory **Post-Close Governance Audit** step.

This audit must run after every:

- Governance Sync
- Close

If a governed unit is a combined sync-close unit, exactly one post-close governance audit is
emitted at the end of that unit.

The audit is **advisory and sequencing-support only**. It does not authorize work.

## Policy Rules

### Rule 1 — What Changes

The Governance OS now requires a mandatory post-close governance audit output after each
Governance Sync or Close.

This is a permanent operating rule.

### Rule 2 — What Does Not Change

The canonical sequence remains unchanged:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

The audit does **not**:

- open work
- authorize work
- select a slice as approved
- convert `DESIGN_GATE` into `OPEN`
- alter legal status transitions
- weaken doctrine

### Rule 3 — Layer 0 Interaction

The audit must derive from:

- Layer 0 control-plane truth
- the directly relevant Layer 1 unit record or records
- the directly relevant Layer 2 decision record or records

Layer 0 remains the operational authority. If any conflict appears, Layer 0 controls.

`NEXT-ACTION.md` must still contain exactly one authorized next action.

If no new action is explicitly authorized, the audit may recommend only a next governance-valid
action class. The resulting Layer 0 posture must remain `OPERATOR_DECISION_REQUIRED` or the
current equivalent canonical posture until a separate explicit decision authorizes movement.

### Rule 4 — Mandatory Audit Output Shape

Every post-close governance audit must emit the following compact structure:

#### Post-Close Governance Audit Output

1. **State summary**
   - current terminal or post-state classification
   - parent gate posture
   - open-unit count
   - blocked / deferred / design-gated context
   - current `NEXT-ACTION` compatibility

2. **Natural next-step candidates**
   - governance-valid action classes only
   - allowed classes include: `HOLD`, `DECISION_REQUIRED`, `DESIGN_REFINEMENT`, `RECORD_ONLY`, `OPENING_CANDIDATE`

3. **Recommended next governance-valid move**
   - exactly one ranked recommendation
   - one short reason
   - why stronger moves remain blocked

4. **Forbidden next moves**
   - no implicit implementation opening
   - no parent ungating by implication
   - no scope broadening by phrasing
   - no tenant/control-plane boundary drift
   - no mutation authorization by "natural next step" wording

5. **Resulting Layer 0 posture**
   - the current authorized next action preserved exactly as authorized
   - or `OPERATOR_DECISION_REQUIRED` preserved when no action is authorized

### Rule 5 — Recommendation Is Not Authorization

The audit may narrow the operator's decision space, but it may not authorize execution.

Recommendation and authorization are distinct:

- a recommendation describes the safest governance-valid next class
- authorization exists only when Layer 0 explicitly authorizes one next action

No audit wording may imply that a recommended class is already approved for implementation,
opening, mutation, or ungating.

### Rule 6 — Productivity Effect

This policy exists to reduce repeated manual reconstruction of post-close state.

It improves productivity by:

- carrying forward the minimum doctrine-safe next-step analysis after closure
- reducing repeated operator re-analysis of the same Layer 0 posture
- preserving conservative governance while reducing wasted sequencing time

### Rule 7 — Boundary Preservation

The audit must never:

- authorize implementation implicitly
- reopen closed units
- bypass `DESIGN_GATE`
- infer broadening from a completed child slice
- infer blanket `SuperAdmin` authority
- collapse `TenantAdmin`, `PlatformAdmin`, and `SuperAdmin`
- reopen RFQ, Wave 4, or `G-026` without explicit decision

## Immediate Post-Close Audit Outcome At Decision Date

The current mandatory post-close governance audit outcome is:

### Current Post-Close Governance Audit Output

1. **State summary**
   - classification: closed child with gated parent
   - parent gate posture: `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
   - open-unit count: 0
   - blocked / deferred / design-gated context: 0 / 0 / 1
   - current `NEXT-ACTION` compatibility: compatible with `OPERATOR_DECISION_REQUIRED`

2. **Natural next-step candidates**
   - `HOLD`
   - `DECISION_REQUIRED`
   - `RECORD_ONLY`
   - `DESIGN_REFINEMENT`
   - `OPENING_CANDIDATE`

3. **Recommended next governance-valid move**
   - ranked recommendation: `HOLD`
   - reason: the current state is already synchronized and no separate bounded next move has been decided
   - why stronger moves remain blocked: no new child slice is selected, no parent ungating is recorded, and `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`

4. **Forbidden next moves**
   - no implicit implementation opening
   - no parent ungating by implication
   - no scope broadening from the closed child
   - no role-boundary collapse
   - no mutation authorization by follow-on wording

5. **Resulting Layer 0 posture**
   - `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
   - no implementation unit is opened
   - no implementation is authorized

## Consequences

- TexQtic now requires a mandatory post-close governance audit after every Governance Sync or Close
- the audit is mandatory, but advisory only
- `NEXT-ACTION.md` still carries exactly one authorized next action
- closed units remain closed unless a separate governance unit explicitly reopens or supersedes them
- design-gated parents remain gated unless a separate decision explicitly changes that posture
- this decision records policy only and authorizes no implementation

## Explicit Out-of-Scope

This decision does not:

- open any implementation unit
- create any implementation opening
- create any follow-on AdminRBAC slice
- approve any next slice
- change product scope
- change role semantics
- weaken the Governance OS state machine
- permit multiple simultaneously authorized next actions
- make Layer 3 operational truth
