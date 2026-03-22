---
unit_id: TENANT-EXPERIENCE-RUNTIME-500-001
title: Decision for observed tenant-experience runtime 500 errors during impersonated tenant runtime
type: DECISION
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-22
closed: 2026-03-22
verified: null
commit: null
evidence: "OBSERVED_RUNTIME_EVIDENCE: during deployed verification of IMPERSONATION-SESSION-REHYDRATION-002, some unrelated tenant-experience requests showed runtime 500 errors during impersonated tenant runtime while the impersonation banner and tenant shell restoration still succeeded in the exercised path · SEPARATION_CONFIRMATION: this observed request/error behavior is not identity-truth, not control-plane auth-shell transition, and not impersonation session rehydration because those closed units already satisfied their bounded acceptance criteria · GOVERNANCE_DECISION: OPENING_CANDIDATE because the observed failing request/error pattern is narrow enough to support one later bounded opening candidate without generalizing broader tenant-shell correctness"
doctrine_constraints:
  - D-004: this decision remains limited to tenant-experience runtime error behavior observed during impersonated tenant runtime and must not merge identity-truth, control-plane auth-shell transition, impersonation session rehydration, stop-cleanup, white-label behavior, or any broader auth or tenant-shell program
  - D-011: the evidence supports only an observed failing request/error pattern and must not be generalized into broader tenant-shell correctness, white-label correctness, or platform-wide runtime claims without separate proof
  - D-013: OPENING_CANDIDATE is not OPEN, no implementation unit is created by this decision, and NEXT-ACTION must remain OPERATOR_DECISION_REQUIRED until a separate opening prompt is executed
decisions_required: []
blockers: []
---

## Unit Summary

`TENANT-EXPERIENCE-RUNTIME-500-001` records the governance-only decision for observed tenant
experience runtime `500` errors seen during impersonated tenant runtime.

Result: `OPENING_CANDIDATE`.

This unit classifies the observed `500` behavior as a separate bounded defect family that remains
strictly outside `CONTROL-PLANE-IDENTITY-TRUTH-002`, `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`,
and `IMPERSONATION-SESSION-REHYDRATION-002`.

## Layer 0 State Confirmation

Exact Layer 0 posture on entry:

- `OPEN-SET.md`: no implementation-ready unit is `OPEN`
- `NEXT-ACTION.md`: `OPERATOR_DECISION_REQUIRED`
- `SNAPSHOT.md`: `IMPERSONATION-SESSION-REHYDRATION-002` is `CLOSED` after bounded deployed PASS

This confirms the decision starts from a non-open posture and does not reopen any previously closed
unit.

## Defect Statement

Observed truth only:

- during impersonated tenant runtime, some tenant-experience requests showed runtime `500` errors
- the impersonation banner still rendered
- tenant shell restoration still succeeded in the exercised path
- the observation therefore indicates request/error behavior inside tenant experience during
  impersonated runtime, but does not by itself prove a broader tenant-shell correctness failure

## Options Considered

1. `OPENING_CANDIDATE`
   The evidence is narrow but sufficient to bound one later candidate around observed tenant
   request/error behavior during impersonated tenant runtime.
2. `HOLD`
   Rejected because the observation is already concrete enough to preserve as a bounded future
   candidate without requiring immediate implementation.
3. `RECORD_ONLY`
   Rejected because the observation is stronger than a loose note; it is already separated from the
   closed units and can be truthfully bounded for later opening consideration.
4. `SPLIT_REQUIRED`
   Rejected because the current evidence does not yet force multiple child defects; only one narrow
   request/error behavior family is evidenced at this stage.

## Selected Decision

Selected option: `OPENING_CANDIDATE`.

## Rationale

This is not an identity-truth defect.

- `CONTROL-PLANE-IDENTITY-TRUTH-002` closed on truthful control-plane actor display and truthful
  impersonation-banner actor display.
- no evidence here shows mixed, stale, or false actor identity presentation.

This is not an auth-shell transition defect.

- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` closed on truthful control-plane shell entry and
  mount-time rehydration.
- the observed `500` behavior appeared after successful impersonated tenant runtime was already
  established.

This is not an impersonation session rehydration defect.

- `IMPERSONATION-SESSION-REHYDRATION-002` closed on reload/remount preservation of the
  authenticated control-plane actor, the impersonated tenant target, and their relationship.
- that bounded acceptance passed even while the unrelated `500` requests were observed.

This is a separate tenant-experience runtime error observation.

- the truthful statement is limited to request/error behavior seen during impersonated tenant
  runtime
- the evidence does not yet justify a broader claim that tenant shell correctness is generally
  broken
- the evidence is still bounded enough to preserve one later opening candidate limited to the
  observed runtime `500` behavior family

## Exact In-Scope Boundary

This decision is limited to:

- observed tenant-experience runtime `500` errors during impersonated tenant runtime
- determining whether that observation is narrow enough for one later bounded opening candidate
- defining the narrowest truthful future opening boundary if later pursued
- preserving exact separation from identity-truth, auth-shell transition, impersonation session
  rehydration, stop-cleanup, and broader auth redesign

## Exact Out-of-Scope Boundary

This decision excludes all of the following:

- implementation
- product code edits
- reopening `CONTROL-PLANE-IDENTITY-TRUTH-002`
- reopening `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`
- reopening `IMPERSONATION-SESSION-REHYDRATION-002`
- impersonation stop cleanup
- broader tenant-shell correctness claims
- white-label generalization
- auth architecture rewrite
- schema or DB changes
- API redesign
- automatic opening of an implementation unit

## Narrowest Truthful Future Opening Boundary

If a separate opening is later chosen, it must remain limited to observed tenant-experience
request/error behavior during impersonated tenant runtime, including identifying the failing
request path or failing runtime surface and proving whether that behavior is reproducible and
repairable within one bounded slice.

Any later opening must not claim broader tenant-shell correctness, white-label correctness,
impersonation stop cleanup correctness, auth redesign, DB/schema work, or API redesign unless
separately evidenced and separately governed.

## Resulting Next-Action Posture

Resulting posture after this decision:

- `TENANT-EXPERIENCE-RUNTIME-500-001` is `CLOSED`
- decision result: `OPENING_CANDIDATE`
- no implementation unit is `OPEN`
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- any implementation requires a later separate opening prompt

## Risks / Blockers

- the currently recorded evidence is observation-level, not yet request-path-specific
- a future opening must stay disciplined and not drift into generic tenant-shell overhaul
- white-label and non-impersonated tenant runtime remain unproven for this defect family
- stop-cleanup and broader auth redesign remain separate and must not be merged by implication

## Atomic Commit

`[TENANT-EXPERIENCE-RUNTIME-500-001] record decision for observed tenant-runtime 500 defect`