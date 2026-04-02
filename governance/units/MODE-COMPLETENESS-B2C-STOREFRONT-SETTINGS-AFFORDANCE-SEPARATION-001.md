---
unit_id: MODE-COMPLETENESS-B2C-STOREFRONT-SETTINGS-AFFORDANCE-SEPARATION-001
title: B2C storefront settings affordance separation
type: ACTIVE_DELIVERY
status: CLOSED
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: TENANT
opened: 2026-04-02
closed: 2026-04-02
verified: 2026-04-02
commit: "226f9e4"
evidence: "BOUNDARY_CONFIRMATION: the closed B2C storefront add-item separation unit preserved the top-right Storefront Settings gear as a separate public-surface candidate only and repo truth confirmed the same non-WL B2C seam routed into a mutable branding-management surface through App.tsx · IMPLEMENTATION_CONFIRMATION: commit 226f9e4 introduced the non-WL B2C seam predicate in App.tsx, removed the gear from that governed seam, and blocked that seam from rendering the SETTINGS path while preserving WL admin reuse of WhiteLabelSettings · LIVE_PROOF_CONFIRMATION: accepted live verification on tenant 743c73aa-1b55-4560-a018-e8e554ca65f6 (b2c-browse-proof-20260402080229) confirmed the top-right settings gear is absent on the exact governed public seam, no route into Storefront Configuration remains from that seam, and no replacement settings-management affordance appeared · NON_REGRESSION_CONFIRMATION: the already-closed B2C browse-entry continuity and add-item separation outcomes remained coherent after this separation fix · SEPARATE_CLEANUP_CONFIRMATION: proof-tenant cleanup remains separate under EPHEMERAL-VERIFICATION-TENANT-CLEANUP-002 and was not executed here"
doctrine_constraints:
  - D-004: this unit is limited to settings-affordance separation on the exact public non-WL B2C seam only and must not widen into settings-feature redesign, WL admin redesign, or broader B2C redesign
  - D-007: implementation and close remain confined to App.tsx and the approved governance close-sync files only
  - D-011: this close does not claim full settings/admin correctness across the app, WL admin correctness, or broader B2C completion
  - D-013: proof-tenant cleanup remains a separate later unit only
decisions_required: []
blockers: []
---

## Unit Summary

`MODE-COMPLETENESS-B2C-STOREFRONT-SETTINGS-AFFORDANCE-SEPARATION-001` is one bounded
`ACTIVE_DELIVERY` unit.

It exists only to remove the public-surface settings-management affordance drift from the exact
non-white-label B2C public storefront seam without widening into settings-feature redesign, WL
admin redesign, or broader B2C redesign work.

Result: `CLOSED`.

The authoritative close basis is complete: the implementation remained confined to `App.tsx`, the
exact governed B2C seam no longer renders the top-right settings gear, and accepted live proof on
the exact proof tenant confirmed that seam no longer routes into the settings-management surface.

## Source Truth

Current repo truth supporting this unit is:

- `App.tsx` contained the exact non-WL B2C seam where the top-right gear had appeared
- `App.tsx` previously routed that gear through `setAppState('SETTINGS')`
- `App.tsx` rendered `WhiteLabelSettings` for `appState === 'SETTINGS'`
- `WhiteLabelSettings` is a mutable branding-management surface reused by the WL admin branding
  flow, so the lawful correction was separation from the public non-WL B2C seam rather than
  redesign of the settings component

This exact unit remained separate from all of the following:

1. the already-closed B2C browse-entry continuity unit
2. the already-closed B2C add-item separation unit
3. WL admin branding/settings redesign
4. backend/schema/auth work
5. proof-tenant cleanup execution

## Acceptance Criteria

- [x] The unit remained bounded to settings-affordance separation on the exact public non-WL B2C seam only
- [x] Implementation remained confined to `App.tsx`
- [x] The top-right settings gear is absent on the governed seam
- [x] The same seam no longer routes into `Storefront Configuration` / settings-management
- [x] No replacement settings-management affordance appeared in that public seam
- [x] The already-closed public storefront structure remained coherent after the change

## Files Allowlisted (Modify)

This close/governance sync authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/units/MODE-COMPLETENESS-B2C-STOREFRONT-SETTINGS-AFFORDANCE-SEPARATION-001.md`

## Exact In-Scope Boundary

This unit authorized only the following bounded work:

1. remove or gate the top-right settings gear from the exact non-WL B2C public seam
2. prevent that governed seam from routing into the settings-management surface
3. verify that no replacement settings-management affordance appeared on that same seam
4. confirm the already-closed B2C storefront structure remained coherent after the change

## Exact Out-of-Scope Boundary

This unit did **not** authorize:

- settings-feature redesign
- WL admin redesign
- browse-entry continuity work
- `+ Add Item` work
- backend/schema/auth changes
- proof-tenant cleanup execution
- broader B2C redesign

## Implementation Record

- bounded implementation surface: `App.tsx`
- authoritative implementation commit: `226f9e4`
- implementation summary:
  - introduced the non-WL B2C seam predicate
  - removed the top-right settings gear from that seam
  - blocked that seam from rendering the `SETTINGS` path
  - preserved WL admin branding/settings reuse unchanged

## Verification Record

- verification result: `VERIFIED_COMPLETE`
- verification date: `2026-04-02`
- proof tenant id: `743c73aa-1b55-4560-a018-e8e554ca65f6`
- proof tenant slug: `b2c-browse-proof-20260402080229`
- accepted bounded live proof:
  - the top-right settings gear is absent on the exact governed public seam
  - no route into `Storefront Configuration` remains from that seam
  - no replacement settings-management affordance appeared
  - the already-closed public storefront structure remained coherent after the change

## Close Record

- close date: `2026-04-02`
- resulting status: `CLOSED`
- close basis:
  - bounded implementation complete
  - accepted live proof complete on the exact governed proof path
  - no contradictory repo-truth or runtime evidence surfaced during close review
- close summary:
  - the exact non-WL B2C public seam no longer exposes or routes through the settings-management
    affordance reviewed in this unit
  - this close does not claim full settings/admin correctness across the app, WL admin
    correctness, or broader B2C redesign completion

## Separate Notes

- Proof-tenant cleanup remains a separate later unit under `EPHEMERAL-VERIFICATION-TENANT-CLEANUP-002`
  and was not executed here
