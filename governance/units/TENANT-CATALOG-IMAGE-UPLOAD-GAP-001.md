---
unit_id: TENANT-CATALOG-IMAGE-UPLOAD-GAP-001
title: Decision for observed tenant catalog image upload or assignment capability gap
type: DECISION
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-22
closed: 2026-03-22
verified: null
commit: null
evidence: "OBSERVED_ADD_ITEM_UI: in exercised remote tenant catalog runtime, the visible add-item flow exposed Name, Price, SKU, Save Item, and Cancel, with no visible image upload or image assignment control in that path · POSITIVE_CONTROL_GAP: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002 could not complete remote positive-control verification on the exact App.tsx:1522 card surface because no lawful remote catalog example exposing non-empty p.imageUrl was reached · SEPARATION_CONFIRMATION: this observation is distinct from placeholder-image DNS/resource failure, AI insights runtime 500 handling, control-plane identity truth, control-plane auth-shell transition, and impersonation session rehydration because those units have separate bounded acceptance criteria and governance records"
doctrine_constraints:
  - D-004: this decision remains limited to the observed tenant catalog image creation or assignment capability gap and must not merge placeholder-image DNS/resource failure, AI insights runtime 500 handling, identity-truth, control-plane auth-shell transition, impersonation session rehydration, stop-cleanup, or any broader catalog or media-platform program
  - D-011: the evidence supports only an observed absence of visible image upload or image assignment capability in the exercised tenant catalog add-item flow and must not be generalized into broader catalog management redesign, media platform redesign, CDN redesign, or platform-wide image architecture claims without separate proof
  - D-013: OPENING_CANDIDATE is not OPEN, no implementation unit is created by this decision, and NEXT-ACTION must remain whatever Layer 0 already lawfully requires until a separate opening prompt is executed
decisions_required: []
blockers: []
---

## Unit Summary

`TENANT-CATALOG-IMAGE-UPLOAD-GAP-001` records the governance-only decision for the observed
tenant catalog image upload or image assignment capability gap.

Result: `OPENING_CANDIDATE`.

This unit preserves strict separation from `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` and all
previously closed runtime, auth, and impersonation units.

## Layer 0 State Confirmation

Exact Layer 0 posture on entry:

- `OPEN-SET.md`: `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` is the sole `OPEN` implementation unit
- `NEXT-ACTION.md`: `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` remains the current authorized work
- `SNAPSHOT.md`: the placeholder-image DNS family remains the only open governed stream

This confirms the decision starts from a posture where one separate implementation unit is already
open and this new observation must not be merged into that unit silently.

## Defect Statement

Observed truth only:

- in the exercised remote tenant catalog add-item flow, the visible form exposed `Name`, `Price`,
  `SKU`, `Save Item`, and `Cancel`
- no visible image upload or image assignment field was present in that exercised add-item path
- remote positive-control verification for the exact App.tsx:1522 catalog-card image surface could
  not be completed because no lawful remote example with non-empty `p.imageUrl` was reached
- this may explain why positive-control image examples are difficult or impossible to reach in the
  current tenant runtime

## Options Considered

1. `OPENING_CANDIDATE`
   The evidence is narrow and concrete enough to support one later bounded opening candidate around
   the observed tenant catalog image creation or assignment capability gap.
2. `HOLD`
   Rejected because the exercised add-item path already shows a concrete, user-visible capability
   absence rather than a vague suspicion requiring deferral.
3. `RECORD_ONLY`
   Rejected because the observation is stronger than a loose note: it is already bounded to a
   specific tenant catalog flow and directly explains why the placeholder unit's positive-control
   branch may not be reachable.
4. `SPLIT_REQUIRED`
   Rejected because the current evidence supports one bounded product-capability gap only and does
   not yet force a broader split across media pipeline, catalog redesign, or API ownership.

## Selected Decision

Selected option: `OPENING_CANDIDATE`.

## Rationale

This is not `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`.

- `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` remains limited to placeholder-image DNS or resource
  failure on the exact catalog-card fallback surface.
- the current observation concerns the visible absence of image creation or assignment capability
  in the tenant catalog add-item flow.
- widening the placeholder unit into general catalog-image capability would violate bounded-scope
  governance.

This is not `TENANT-EXPERIENCE-RUNTIME-500-002`.

- that unit closed on the bounded AI insights runtime `500` surface only.
- no evidence here concerns AI insights request failure or tenant runtime `500` handling.

This is not `CONTROL-PLANE-IDENTITY-TRUTH-002`.

- that unit closed on truthful control-plane identity presentation only.
- no evidence here concerns actor or persona display truth.

This is not `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`.

- that unit closed on control-plane auth-shell entry and rehydration only.
- the current observation appears within already-established tenant runtime, not control-plane shell
  transition.

This is not `IMPERSONATION-SESSION-REHYDRATION-002`.

- that unit closed on persistence of active impersonation across reload and remount.
- the current observation concerns catalog item creation capabilities within an already-active
  tenant session.

This is a separate bounded candidate around tenant catalog image creation or assignment capability.

- the exercised add-item UI exposes core metadata fields only and omits any visible image field
- the observation is user-visible, specific, and narrow enough for one later bounded opening
  candidate
- the evidence does not justify broader catalog overhaul, white-label overhaul, media-platform
  redesign, auth redesign, DB/schema work, or API redesign

## Exact In-Scope Boundary

This decision is limited to:

- the observed absence of visible image upload or image assignment capability in the exercised
  tenant catalog add-item flow
- determining whether that observation is narrow enough for one later bounded opening candidate
- defining the narrowest truthful future opening boundary
- preserving exact separation from `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`

## Exact Out-of-Scope Boundary

This decision excludes all of the following:

- implementation
- product code edits
- reopening `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`
- reopening any closed unit
- placeholder-image DNS fix work
- AI insights repair
- impersonation stop cleanup
- broader tenant catalog overhaul
- white-label overhaul
- media platform or CDN redesign
- auth architecture rewrite
- DB or schema changes
- API redesign unless later evidence proves the capability gap is API-owned
- automatic implementation opening

## Narrowest Truthful Future Opening Boundary

If a separate opening is later chosen, it must remain limited to the tenant catalog add-item path
and the minimum product capability needed for tenant users to attach, upload, or assign an image
to catalog items in the exercised tenant runtime flow.

Any later opening must not absorb placeholder-image DNS/resource failure, broader catalog
management redesign, media-platform redesign, white-label redesign, auth redesign, DB/schema work,
or API redesign unless separately evidenced and separately governed.

## Resulting Next-Action Posture

Resulting posture after this decision:

- `TENANT-CATALOG-IMAGE-UPLOAD-GAP-001` is `CLOSED`
- decision result: `OPENING_CANDIDATE`
- no implementation unit is opened by this decision
- `NEXT-ACTION` remains `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`
- any future implementation requires a later separate opening prompt

## Risks / Blockers

- the current evidence is UI-observation-level around the exercised tenant add-item flow only
- a later opening must stay disciplined and not drift into broad catalog or media-platform redesign
- the evidence does not yet prove whether the right later repair is UI-only, API-backed, storage-backed,
  or some bounded combination inside the add-item path
- white-label and broader catalog management behavior remain unproven for this defect family

## Atomic Commit

`[TENANT-CATALOG-IMAGE-UPLOAD-GAP-001] record decision for catalog image upload gap`