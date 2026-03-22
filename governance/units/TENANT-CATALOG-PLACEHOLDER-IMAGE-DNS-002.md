---
unit_id: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002
title: Open bounded implementation unit for placeholder-image DNS/resource failure
type: IMPLEMENTATION
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-22
closed: null
verified: null
commit: null
evidence: "OPENING_AUTHORITY: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001 closed as OPENING_CANDIDATE only and remains the sole decision authority for this defect family · OBSERVED_RUNTIME_BASELINE: during remote tenant runtime verification, placeholder image requests using https://via.placeholder.com/400x300 failed with ERR_NAME_NOT_RESOLVED while tenant catalog/page usability still succeeded in the exercised path · FRONTEND_SURFACE_CONFIRMATION: App.tsx tenant-visible catalog card image currently renders src={p.imageUrl || 'https://via.placeholder.com/400x300'} and is the exact known surface generating the observed failing placeholder-image request pattern"
doctrine_constraints:
  - D-004: this opening creates exactly one bounded implementation unit and must not merge AI insights runtime handling, identity-truth, control-plane auth-shell transition, impersonation session rehydration, stop-cleanup, white-label behavior, broader catalog overhaul, or any broader media-platform slice
  - D-007: opening only; no implementation, product code edits, schema work, tests, or config changes occur in this operation
  - D-011: acceptance must remain limited to the exact tenant-visible placeholder-image surface and must not generalize to broader catalog correctness, white-label behavior, asset-delivery behavior, or broader auth/runtime correctness without separate proof
  - D-013: opening authorizes one later implementation step only and does not itself satisfy implementation, verification, sync, or closure
decisions_required: []
blockers: []
---

## Unit Summary

`TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` is the bounded implementation-ready unit for the
observed placeholder-image DNS/resource failure only.

Opening decision: `YES`.

This opening is lawful because `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001` already closed as
`OPENING_CANDIDATE` only, Layer 0 enters at `OPERATOR_DECISION_REQUIRED`, and the exact
tenant-visible frontend/resource surface is now evidenced enough to support one bounded future
implementation unit without widening scope.

Implementation is not executed in this opening operation.

## Layer 0 State Confirmation

Exact Layer 0 posture on entry:

- `OPEN-SET.md`: no implementation-ready unit is `OPEN`
- `NEXT-ACTION.md`: `OPERATOR_DECISION_REQUIRED`
- `SNAPSHOT.md`: `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001` is `CLOSED` with result `OPENING_CANDIDATE` only

This confirms all required entry truths:

- `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001` is the decision authority for this opening
- `TENANT-EXPERIENCE-RUNTIME-500-002` is `CLOSED` and must not be reopened
- `IMPERSONATION-SESSION-REHYDRATION-002` is `CLOSED` and must not be reopened
- `CONTROL-PLANE-IDENTITY-TRUTH-002` is `CLOSED` and must not be reopened
- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` is `CLOSED` and must not be reopened
- the new defect remains separate from stop-cleanup, broader tenant-shell correctness, white-label behavior, broader catalog overhaul, and broader media-platform redesign

## Opening Decision

Yes — open one bounded implementation unit only if the exact scope below is preserved.

## Exact Bounded Implementation Objective

Correct the bounded placeholder-image resource failure so that the exact tenant-visible surface
currently generating `https://via.placeholder.com/400x300` image requests no longer produces the
observed DNS/resource failure in the exercised runtime path.

## Exact In-Scope Boundary

This unit is limited to:

- observed placeholder-image failures using `https://via.placeholder.com/400x300` in tenant-visible catalog/runtime surfaces
- the exact frontend/resource-generation surface responsible for those placeholder-image URLs
- bounded future verification definition for this slice
- preserving separation from already-closed units

## Exact Out-of-Scope Boundary

This unit excludes all of the following:

- implementation in this opening operation
- product code edits
- AI insights repair
- identity-truth repair
- auth-shell transition repair
- impersonation session rehydration repair
- impersonation stop cleanup
- broader tenant-shell correctness claims
- catalog overhaul
- white-label overhaul
- media/CDN/platform redesign
- auth architecture rewrite
- DB or schema changes
- API redesign unless later evidence proves the image failure is actually API-backed
- multi-slice runtime repair bundle
- hidden expansion into broader asset-delivery behavior

## Exact Acceptance Boundary

Acceptance is satisfied only when:

- the exact tenant-visible placeholder-image surface identified for this unit no longer produces the observed resource/DNS failure in the exercised runtime path
- acceptance does not rely on broader catalog correctness
- acceptance does not rely on white-label behavior
- acceptance does not rely on stop-cleanup behavior
- acceptance does not claim broader media, tenant-runtime, or auth correctness beyond the exact bounded placeholder-image surface

## Exact Verification Profile

- unit type: runtime-sensitive frontend/resource-surface correction
- required verification modes:
  - local implementation verification
  - effective runtime verification
  - remote/deployed verification if acceptance depends on live runtime asset behavior
- exclusions:
  - local-only proof is insufficient if remote runtime asset behavior is the acceptance boundary
  - broader catalog rendering verification is excluded except as explicitly labeled boundary or non-regression checks
  - media-platform redesign is excluded

## Governance Posture After Opening

Resulting governance posture after this opening:

- one implementation unit is now `OPEN`
- the open unit is `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`
- scope remains the bounded placeholder-image DNS/resource failure slice only
- no implementation has been executed yet
- the next canonical phase is later implementation for `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` only

## Allowed Future Implementation Boundary

The later implementation step, if separately performed, must remain bounded to correcting the
exact tenant-visible placeholder-image surface currently generating `https://via.placeholder.com/400x300`
requests and any directly coupled resource-generation logic needed to stop that bounded DNS/resource
failure in the exercised tenant runtime path.

The later implementation step must not absorb AI insights runtime handling, identity-truth,
control-plane auth-shell transition, impersonation session rehydration, stop-cleanup, broader
tenant-shell correctness, broader catalog overhaul, white-label behavior, media/CDN/platform
redesign, auth redesign, schema, or broader API scope.

## Risks / Blockers

- acceptance is runtime-sensitive and may require remote/deployed proof if the exercised asset behavior depends on live runtime conditions
- the currently recorded evidence is centered on the tenant-visible placeholder-image fallback at `https://via.placeholder.com/400x300`
- a later implementation must stay disciplined and not drift into generic catalog rendering or media-platform redesign
- the later implementation still has to prove whether the bounded repair belongs at the exact frontend fallback surface or directly coupled image-source generation logic only

## Implementation Status Statement

Implementation remains not yet executed in this operation.

## Atomic Commit

`[TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002] open bounded implementation unit for placeholder-image DNS failure`