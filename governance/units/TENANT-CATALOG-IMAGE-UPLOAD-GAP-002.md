---
unit_id: TENANT-CATALOG-IMAGE-UPLOAD-GAP-002
title: Open bounded implementation unit for tenant catalog image upload or assignment capability gap
type: IMPLEMENTATION
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-23
closed: 2026-03-23
verified: 2026-03-23
commit: 2f1b28d · ab52404
evidence: "IMPLEMENTATION_COMMIT: 2f1b28d37ad5b88bc279e5d7820e307a8dce48bd [TENANT-CATALOG-IMAGE-UPLOAD-GAP-002] add bounded catalog image capability · DB_SCHEMA_COMMIT: ab52404d42359b23213cf2737212d5c9f150c5ee [TENANT-CATALOG-IMAGE-UPLOAD-GAP-002] apply bounded catalog image schema change · PRODUCTION_VERIFICATION_PASS: production tenant runtime was reachable, the exercised add-item flow exposed the Image URL control, a lawful non-empty image URL was accepted, the created item persisted with imageUrl in tenant API results, and the relevant catalog card rendered a real image from the stored imageUrl · SEPARATE_BOUNDARY_NOTE: older catalog cards still showing Image unavailable remain separate follow-on work under TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002 and were not merged into this unit"
doctrine_constraints:
  - D-004: this opening creates exactly one additional bounded implementation unit and must not merge placeholder-image DNS/resource failure, AI insights runtime handling, identity-truth, control-plane auth-shell transition, impersonation session rehydration, stop-cleanup, white-label behavior, broader catalog overhaul, or any broader media-platform slice
  - D-007: opening only; no implementation, product code edits, schema work, tests, or config changes occur in this operation
  - D-011: acceptance must remain limited to tenant catalog image attach, upload, or assignment capability in the exercised add-item flow and must not generalize to broader catalog correctness, media/CDN redesign, white-label behavior, or broader auth/runtime correctness without separate proof
  - D-013: opening authorizes one later implementation step only and does not itself satisfy implementation, verification, sync, or closure
decisions_required: []
blockers: []
---

## Unit Summary

`TENANT-CATALOG-IMAGE-UPLOAD-GAP-002` is the bounded implementation unit for the observed tenant
catalog image upload or image assignment capability gap only.

Result: `VERIFIED_COMPLETE` and `CLOSED`.

This unit is now closed after bounded implementation commit `2f1b28d`, bounded DB/schema commit
`ab52404`, and production runtime verification PASS on the exercised tenant catalog
image-capability slice only.

## Implementation Under Test

- implementation commit: `2f1b28d37ad5b88bc279e5d7820e307a8dce48bd`
- message: `[TENANT-CATALOG-IMAGE-UPLOAD-GAP-002] add bounded catalog image capability`
- db/schema commit: `ab52404d42359b23213cf2737212d5c9f150c5ee`
- message: `[TENANT-CATALOG-IMAGE-UPLOAD-GAP-002] apply bounded catalog image schema change`

## Verification Environment

- verification mode: production runtime
- deployed URL exercised: `https://tex-qtic.vercel.app/`
- exercised tenant runtime: `Acme Corporation`

## Verified Truth

- production tenant runtime was reachable
- the exercised add-item flow exposed the `Image URL` control
- a lawful non-empty image URL was accepted
- the created item persisted with `imageUrl` in tenant API results
- the relevant catalog card rendered a real image from the stored `imageUrl`
- this satisfies the bounded image-capability acceptance for the exercised catalog path

## Bounded Production Evidence

- tenant shell rendered the exercised `Wholesale Catalog` path for `Acme Corporation`
- `+ Add Item` opened `New Catalog Item` with `Name *`, `Price *`, `SKU`, and `Image URL`
- one positive-control item was created in production:
  - name: `IMG-VERIFY-1774237234391`
  - image URL: `https://picsum.photos/seed/texqtic-gap-002/400/300`
- tenant API verification returned `200` from `GET /api/tenant/catalog/items`
- the matching persisted item returned:
  - `id: 9a422280-2c1f-40ed-ab78-58bf121fbff1`
  - `name: IMG-VERIFY-1774237234391`
  - `imageUrl: https://picsum.photos/seed/texqtic-gap-002/400/300`
- the rendered card image returned:
  - `src: https://picsum.photos/seed/texqtic-gap-002/400/300`
  - `naturalWidth: 400`
  - `naturalHeight: 300`
  - `complete: true`

## Separate Boundary Note

- older catalog cards still showing `Image unavailable` remain separate follow-on work
- that observation belongs to `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` and was not merged into this unit

## Acceptance Result

Acceptance: `PASS`.

The bounded acceptance boundary is satisfied because production runtime proof confirmed that the
exercised add-item path exposed the truthful `Image URL` control, accepted and persisted a lawful
non-empty image URL, and rendered the relevant catalog card from the stored image value.

## Scope Boundary Preserved at Closure

This closure remains limited to the exercised tenant catalog add-item image-capability slice only.

This closure does not authorize or claim placeholder-image DNS/resource repair, broader catalog
correctness, white-label behavior, media/CDN/platform redesign, broader tenant-runtime correctness,
auth redesign, DB/schema redesign beyond the bounded applied field, or broader API redesign.

## Close Status Statement

`TENANT-CATALOG-IMAGE-UPLOAD-GAP-002` is now `CLOSED` and `VERIFIED_COMPLETE` on its bounded
image-capability slice only.

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

- older catalog cards still showing `Image unavailable` remain separate follow-on work under
  `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`
- production PASS for this unit must not be generalized into broader catalog correctness beyond the
  exercised image-capability path

## Implementation Status Statement

This bounded unit is fully implemented, production-verified, and closed.

## Atomic Commit

`[TENANT-CATALOG-IMAGE-UPLOAD-GAP-002] close unit after production verification PASS`