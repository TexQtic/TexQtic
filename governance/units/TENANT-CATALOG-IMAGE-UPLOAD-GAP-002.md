---
unit_id: TENANT-CATALOG-IMAGE-UPLOAD-GAP-002
title: Open bounded implementation unit for tenant catalog image upload or assignment capability gap
type: IMPLEMENTATION
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-23
closed: null
verified: null
commit: null
evidence: "OPENING_AUTHORITY: TENANT-CATALOG-IMAGE-UPLOAD-GAP-001 closed as OPENING_CANDIDATE only and remains the sole decision authority for this defect family · OBSERVED_RUNTIME_BASELINE: in the exercised remote tenant catalog add-item flow, the visible UI exposed Name, Price, SKU, Save Item, and Cancel with no visible image upload or image assignment control in that path · POSITIVE_CONTROL_CONTEXT: remote positive-control verification for the exact App.tsx:1522 catalog-card image surface could not be completed because no lawful remote example with non-empty p.imageUrl was reached, which keeps this capability-gap opening separate from the already-open placeholder-image DNS/resource unit"
doctrine_constraints:
  - D-004: this opening creates exactly one additional bounded implementation unit and must not merge placeholder-image DNS/resource failure, AI insights runtime handling, identity-truth, control-plane auth-shell transition, impersonation session rehydration, stop-cleanup, white-label behavior, broader catalog overhaul, or any broader media-platform slice
  - D-007: opening only; no implementation, product code edits, schema work, tests, or config changes occur in this operation
  - D-011: acceptance must remain limited to tenant catalog image attach, upload, or assignment capability in the exercised add-item flow and must not generalize to broader catalog correctness, media/CDN redesign, white-label behavior, or broader auth/runtime correctness without separate proof
  - D-013: opening authorizes one later implementation step only and does not itself satisfy implementation, verification, sync, or closure
decisions_required: []
blockers: []
---

## Unit Summary

`TENANT-CATALOG-IMAGE-UPLOAD-GAP-002` is the bounded implementation-ready unit for the
observed tenant catalog image upload or image assignment capability gap only.

Opening decision: `YES`.

This opening is lawful because `TENANT-CATALOG-IMAGE-UPLOAD-GAP-001` already closed as
`OPENING_CANDIDATE` only, the observed add-item path is narrow and user-visible, and the
resulting scope can remain fully separate from `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`.

Implementation is not executed in this opening operation.

## Layer 0 State Confirmation

Exact Layer 0 posture on entry:

- `OPEN-SET.md`: `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` is the sole `OPEN` implementation unit
- `NEXT-ACTION.md`: `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` remains the current authorized work
- `SNAPSHOT.md`: `TENANT-CATALOG-IMAGE-UPLOAD-GAP-001` is `CLOSED` with result `OPENING_CANDIDATE` only

This confirms all required entry truths:

- `TENANT-CATALOG-IMAGE-UPLOAD-GAP-001` is the decision authority for this opening
- `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` remains `OPEN` and must not be widened or merged
- `TENANT-EXPERIENCE-RUNTIME-500-002` is `CLOSED` and must not be reopened
- `CONTROL-PLANE-IDENTITY-TRUTH-002` is `CLOSED` and must not be reopened
- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` is `CLOSED` and must not be reopened
- `IMPERSONATION-SESSION-REHYDRATION-002` is `CLOSED` and must not be reopened

## Opening Decision

Yes — open one bounded implementation unit only if the exact scope below is preserved.

## Exact Bounded Implementation Objective

Correct the bounded tenant catalog image capability gap so that the exercised tenant add-item flow
supports the minimum truthful image attach, upload, or assignment capability needed for a tenant
user to create or save a catalog item with a non-empty image reference in that flow.

## Exact In-Scope Boundary

This unit is limited to:

- the exercised tenant catalog add-item flow
- tenant-visible image attach, upload, or assignment capability for catalog items in that flow
- the minimum directly coupled persistence or request path needed to save a non-empty image reference
- bounded future verification definition for this slice
- preserving separation from already-open and already-closed units

## Exact Out-of-Scope Boundary

This unit excludes all of the following:

- implementation in this opening operation
- product code edits
- placeholder-image DNS/resource failure repair
- AI insights repair
- identity-truth repair
- auth-shell transition repair
- impersonation session rehydration repair
- impersonation stop cleanup
- broader tenant-shell correctness claims
- broader catalog management redesign
- white-label overhaul
- media/CDN/platform redesign
- auth architecture rewrite
- DB or schema changes unless later evidence proves one directly coupled bounded change is required
- API redesign unless later evidence proves the capability gap is API-owned
- multi-slice runtime repair bundle

## Exact Acceptance Boundary

Acceptance is satisfied only when:

- the exercised tenant catalog add-item path exposes a truthful image attach, upload, or assignment control
- the bounded flow can save a catalog item with a non-empty image reference or equivalent bounded image value
- acceptance does not rely on placeholder-image DNS/resource repair
- acceptance does not rely on broader catalog correctness
- acceptance does not rely on white-label behavior
- acceptance does not claim broader media, tenant-runtime, or auth correctness beyond the exact bounded add-item image capability slice

## Exact Verification Profile

- unit type: runtime-sensitive tenant catalog capability correction
- required verification modes:
  - local implementation verification
  - effective runtime verification
  - remote/deployed verification if acceptance depends on live runtime persistence or asset behavior
- exclusions:
  - broader catalog overhaul verification is excluded except as explicitly labeled boundary or non-regression checks
  - placeholder-image DNS/resource verification remains separate under `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`
  - media-platform redesign is excluded

## Governance Posture After Opening

Resulting governance posture after this opening:

- two implementation units are now `OPEN`
- the newly opened unit is `TENANT-CATALOG-IMAGE-UPLOAD-GAP-002`
- `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` remains open and unchanged in scope
- no implementation has been executed yet
- the next canonical phase is later implementation for `TENANT-CATALOG-IMAGE-UPLOAD-GAP-002` only

## Allowed Future Implementation Boundary

The later implementation step, if separately performed, must remain bounded to the tenant catalog
add-item path and the minimum directly coupled capability needed for a tenant user to attach,
upload, or assign an image and persist a non-empty image reference for that bounded flow.

The later implementation step must not absorb placeholder-image DNS/resource failure, AI insights
runtime handling, identity-truth, control-plane auth-shell transition, impersonation session
rehydration, stop-cleanup, broader tenant-shell correctness, broader catalog overhaul,
white-label behavior, media/CDN/platform redesign, auth redesign, schema, or broader API scope.

## Risks / Blockers

- the current evidence is UI-observation-level around the exercised add-item flow only
- a later implementation must stay disciplined and not drift into broad catalog or media-platform redesign
- the evidence does not yet prove whether the narrowest repair is UI-only, API-backed, storage-backed,
  or some bounded combination inside the add-item flow
- white-label and broader catalog-management behavior remain unproven for this defect family

## Implementation Status Statement

Implementation remains not yet executed in this operation.

## Atomic Commit

`[TENANT-CATALOG-IMAGE-UPLOAD-GAP-002] open bounded implementation unit for catalog image upload gap`