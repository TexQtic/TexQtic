---
unit_id: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001
title: Decision for observed placeholder-image DNS failure in tenant runtime
type: DECISION
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-22
closed: 2026-03-22
verified: null
commit: null
evidence: "OBSERVED_RUNTIME_EVIDENCE: during remote verification adjacent to TENANT-EXPERIENCE-RUNTIME-500-002, placeholder image requests using https://via.placeholder.com/400x300 failed with ERR_NAME_NOT_RESOLVED while the tenant catalog/runtime path otherwise remained usable · SEPARATION_CONFIRMATION: this observed resource failure is not AI insights runtime 500 handling, not control-plane identity truth, not control-plane auth-shell transition, and not impersonation session rehydration because those closed units already satisfied their bounded acceptance criteria · GOVERNANCE_DECISION: OPENING_CANDIDATE because the observed image-resource failure is narrow enough to support one later bounded opening candidate without generalizing broader tenant-shell correctness or broader media platform redesign"
doctrine_constraints:
  - D-004: this decision remains limited to placeholder-image resource failure observed in tenant runtime and must not merge AI insights runtime 500 handling, identity-truth, control-plane auth-shell transition, impersonation session rehydration, stop-cleanup, white-label behavior, or any broader tenant-shell or media-platform program
  - D-011: the evidence supports only a tenant-visible resource/image loading failure caused by placeholder-image DNS resolution and must not be generalized into broader catalog rendering, CDN, upload/media infrastructure, or platform-wide runtime claims without separate proof
  - D-013: OPENING_CANDIDATE is not OPEN, no implementation unit is created by this decision, and NEXT-ACTION must remain OPERATOR_DECISION_REQUIRED until a separate opening prompt is executed
decisions_required: []
blockers: []
---

## Unit Summary

`TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001` records the governance-only decision for the observed
placeholder-image DNS failure in tenant runtime.

Result: `OPENING_CANDIDATE`.

This unit classifies the observed placeholder-image resource failure as a separate bounded defect
family that remains strictly outside `TENANT-EXPERIENCE-RUNTIME-500-002`,
`CONTROL-PLANE-IDENTITY-TRUTH-002`, `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`, and
`IMPERSONATION-SESSION-REHYDRATION-002`.

## Layer 0 State Confirmation

Exact Layer 0 posture on entry:

- `OPEN-SET.md`: no implementation-ready unit is `OPEN`
- `NEXT-ACTION.md`: `OPERATOR_DECISION_REQUIRED`
- `SNAPSHOT.md`: `TENANT-EXPERIENCE-RUNTIME-500-002` is `CLOSED` after bounded remote PASS

This confirms the decision starts from a non-open posture and does not reopen any previously closed
unit.

## Defect Statement

Observed truth only:

- during remote tenant runtime verification, placeholder image requests using `https://via.placeholder.com/400x300` failed
- the observed runtime failure was `ERR_NAME_NOT_RESOLVED`
- tenant catalog/page usability could still succeed while those image resources failed
- the observation therefore indicates a bounded resource/image loading failure and does not by itself prove broader tenant-shell, catalog-data, or media-pipeline failure

## Options Considered

1. `OPENING_CANDIDATE`
   The evidence is narrow and concrete enough to support one later bounded candidate around the
   observed placeholder-image DNS failure.
2. `HOLD`
   Rejected because the observed failure is already specific enough to preserve as a bounded future
   candidate without requiring immediate implementation.
3. `RECORD_ONLY`
   Rejected because the observation is stronger than a loose note; it is already separated from
   the closed AI insights runtime unit and can be truthfully bounded for later opening
   consideration.
4. `SPLIT_REQUIRED`
   Rejected because the current evidence does not yet force multiple child defects; only one
   narrow resource/image loading failure family is evidenced at this stage.

## Selected Decision

Selected option: `OPENING_CANDIDATE`.

## Rationale

This is not `TENANT-EXPERIENCE-RUNTIME-500-002`.

- `TENANT-EXPERIENCE-RUNTIME-500-002` closed on the bounded AI insights runtime `500` surface.
- the placeholder-image observation was explicitly preserved there as a separate defect class.
- no evidence here shows a hard `500` on the AI insights endpoint.

This is not an identity-truth defect.

- `CONTROL-PLANE-IDENTITY-TRUTH-002` closed on truthful control-plane actor display and truthful
  impersonation-banner actor display.
- no evidence here shows mixed, stale, or false actor identity presentation.

This is not an auth-shell transition defect.

- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` closed on truthful control-plane shell entry and
  mount-time rehydration.
- the observed placeholder-image failure appeared after usable tenant runtime was already
  established.

This is not an impersonation session rehydration defect.

- `IMPERSONATION-SESSION-REHYDRATION-002` closed on reload/remount preservation of the
  authenticated control-plane actor, the impersonated tenant target, and their relationship.
- that bounded acceptance passed even while unrelated placeholder-image failures were observed.

This is a separate resource/image loading failure caused by placeholder-image DNS resolution.

- the truthful statement is limited to image-resource loading failure using `https://via.placeholder.com/400x300`
- the observed failure mode is DNS resolution failure: `ERR_NAME_NOT_RESOLVED`
- the evidence still shows page/catalog usability may succeed while image resources fail
- the evidence does not justify broader media/image pipeline redesign, catalog rendering redesign,
  or tenant-shell overhaul

## Exact In-Scope Boundary

This decision is limited to:

- observed placeholder-image resource failures using `https://via.placeholder.com/400x300`
- determining whether that observation is narrow enough for one later bounded opening candidate
- defining the narrowest truthful future opening boundary if later pursued
- preserving exact separation from the closed AI insights runtime `500` unit, identity-truth,
  auth-shell transition, impersonation session rehydration, stop-cleanup, and broader auth redesign

## Exact Out-of-Scope Boundary

This decision excludes all of the following:

- implementation
- product code edits
- reopening `TENANT-EXPERIENCE-RUNTIME-500-002`
- reopening `CONTROL-PLANE-IDENTITY-TRUTH-002`
- reopening `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`
- reopening `IMPERSONATION-SESSION-REHYDRATION-002`
- AI insights repair
- tenant-runtime `500` repair
- impersonation stop cleanup
- broader tenant-shell correctness claims
- white-label overhaul
- broader media platform redesign
- auth architecture rewrite
- schema or DB changes
- API redesign unless later evidence proves the image failure is actually API-backed
- automatic opening of an implementation unit

## Narrowest Truthful Future Opening Boundary

If a separate opening is later chosen, it must remain limited to observed tenant-visible image
resource loading failure caused by placeholder-image DNS resolution in the exercised tenant
catalog/runtime path, including proving whether that failure is reproducible and repairable within
one bounded slice.

Any later opening must not claim broader catalog rendering correctness, broader tenant-shell
correctness, CDN/media-platform redesign, upload/media infrastructure work, auth redesign,
DB/schema work, or API redesign unless separately evidenced and separately governed.

## Resulting Next-Action Posture

Resulting posture after this decision:

- `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001` is `CLOSED`
- decision result: `OPENING_CANDIDATE`
- no implementation unit is `OPEN`
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- any implementation requires a later separate opening prompt

## Risks / Blockers

- the currently recorded evidence is observation-level around one placeholder-image URL pattern
- a future opening must stay disciplined and not drift into generic catalog or media-platform redesign
- the evidence does not yet prove whether the right later fix is asset replacement, local fallback,
  host substitution, or some other bounded image-source correction
- white-label and non-tenant runtime behavior remain unproven for this defect family

## Atomic Commit

`[TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001] record decision for placeholder-image DNS failure`