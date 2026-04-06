---
unit_id: MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION
title: B2C shell authenticated-affordance separation
type: ACTIVE_DELIVERY
status: CLOSED
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: TENANT
opened: 2026-04-06
closed: 2026-04-06
verified: 2026-04-06
commit: bfb6dea
evidence: "DECISION_CHAIN_CONFIRMATION: GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING preserved the shared public entry-facing frame, home return, and browse-entry search continuity, GOV-DEC-B2C-FAMILY-REDUCTION-POST-PUBLIC-RUNTIME-PLANNING reduced the broad B2C remainder, and GOV-DEC-B2C-SHELL-BOUNDARY-REDUCTION recovered the exact child · IMPLEMENTATION_BASELINE_CONFIRMATION: commit `bfb6dea` remained the bounded product baseline for the exact non-WL B2C HOME shell path while concurrent support-unit commit `a637998` removed the separate control-plane tenant-context entry blocker that had prevented truthful production proof · LIVE_RERUN_CONFIRMATION: production rerun on `https://app.texqtic.com/` reached the exact B2C proof tenant from both bounded control-plane entry surfaces, preserved the branded entry-facing frame and search input on the exact HOME path, confirmed authenticated-only shell affordances were not visible there, and no longer reproduced the earlier blocked REALM_MISMATCH / Loading workspace / Starting symptom or the earlier enterprise Orders neighbor-smoke failure · ADJACENT_FINDING_CONFIRMATION: GOV-DEC-IMPERSONATION-STOP-CLEANUP-404-ADJACENT-FINDING records the observed impersonation-stop cleanup `404` as separate and non-blocking for this unit · CLOSE_CONFIRMATION: GOV-DEC-B2C-SHELL-CLOSE-WITH-ADJACENT-FINDING closed this bounded B2C unit without absorbing the support unit, the adjacent finding, or unrelated `g026` residue"
doctrine_constraints:
  - D-004: this unit is limited to authenticated-only shell-affordance separation on the exact non-WL B2C HOME path and must not widen into shared public-shell redesign, seller/admin or settings work, orders/cart/checkout continuity, adjacent authenticated-family redesign, or broad B2C redesign
  - D-007: implementation and verification remain confined to the exact bounded file surface and the approved governance sync files only
  - D-011: inherited public-facing runtime requirements remain authoritative and require preservation of the branded entry-facing frame, home return, and browse-entry search continuity on the exact reviewed path
  - D-013: this unit controls shell-path affordance exposure only and does not authorize downstream family behavior changes behind the removed or repositioned affordances
decisions_required:
  - GOV-DEC-B2C-SHELL-CLOSE-WITH-ADJACENT-FINDING: DECIDED (2026-04-06, Paresh)
blockers: []
---

## Unit Summary

`MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` is one bounded
`ACTIVE_DELIVERY` unit.

It exists only to separate authenticated-only shell affordances from the exact non-white-label B2C
`HOME` path while preserving the shared branded entry-facing frame, home return, and browse-entry
search continuity already fixed by the current B2C decision chain.

This unit does not authorize broader public-shell redesign, seller/admin or settings follow-up,
orders/cart/checkout continuity work, adjacent-family redesign, or broad B2C re-architecture.

Current result: `CLOSED`.

## Source Truth

Current repo truth supporting this unit is:

- `governance/decisions/GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING.md` preserves the
  shared branded entry-facing frame, home return, and browse-entry search continuity as separate
  required inheritance
- `governance/decisions/GOV-DEC-B2C-FAMILY-REDUCTION-POST-PUBLIC-RUNTIME-PLANNING.md` reduces the
  broad B2C remainder to the public-entry-to-authenticated boundary
- `governance/decisions/GOV-DEC-B2C-SHELL-BOUNDARY-REDUCTION.md` recovers the exact child as
  authenticated-affordance separation on the exact non-WL B2C `HOME` shell path
- `App.tsx` still routes the exact non-WL B2C `HOME` surface through `B2CShell` and the bounded
  support-unit handoff fix in commit `a637998` now allows truthful production entry to that exact
  path from the control-plane workflow
- `layouts/Shells.tsx` still renders the branded B2C frame and search input alongside the mixed
  authenticated navigation cluster on that exact shell path
- `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`,
  `MODE-COMPLETENESS-B2C-STOREFRONT-SELLER-ADMIN-AFFORDANCE-SEPARATION-001`, and
  `MODE-COMPLETENESS-B2C-STOREFRONT-SETTINGS-AFFORDANCE-SEPARATION-001` are already `CLOSED` and
  remain separate

## Acceptance Criteria

- [x] The unit remains bounded to authenticated-only shell-affordance separation on the exact
  non-WL B2C `HOME` path only
- [x] The shared branded entry-facing frame, home return, and browse-entry search continuity remain
  preserved on that exact path
- [x] Authenticated-only shell affordances no longer appear co-resident on the exact reviewed B2C
  `HOME` path
- [x] No downstream behavior change is claimed for orders/cart/checkout or any adjacent
  authenticated family behind the separated affordances
- [x] The previously closed public browse-entry, seller/admin, and settings seam units remain
  closed and separate

## Files Allowlisted (Modify)

This unit authorizes modification of these files only:

- `governance/units/MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION.md`
- `App.tsx`
- `layouts/Shells.tsx`
- `tests/b2c-shell-authenticated-affordance-separation.test.tsx`

## Exact In-Scope Boundary

This unit authorizes only the following bounded work:

1. separate authenticated-only shell-affordance exposure from the exact non-WL B2C `HOME` path
2. preserve the shared branded entry-facing frame, home return, and browse-entry search continuity
   already fixed as inherited public-facing runtime requirements
3. limit exposure changes to authenticated-only shell affordances currently co-resident on that
   exact path
4. verify that the exact reviewed path truthfully presents browse-entry continuity without implying
   broader authenticated shell continuity

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- shared public shell or navbar redesign
- browse-entry search redesign
- public browse-entry seam reopening
- seller/admin affordance work
- settings affordance work
- orders, cart, checkout, payment, fulfillment, or post-purchase continuity changes
- adjacent-family redesign behind `DPP Passport`, `Escrow`, `Escalations`, `Settlement`,
  `Certifications`, `Traceability`, `Audit Log`, `Trades`, or `Team`
- white-label, enterprise, Aggregator, or control-plane work
- onboarding, auth, routing, domain, or `g026` work
- broad B2C redesign or shell re-architecture

## Exact Verification Profile

- verification type: focused frontend shell-boundary separation on the exact reviewed B2C `HOME`
  path
- required verification modes:
  - focused proof that the exact path preserves branded browse-entry continuity while removing
    authenticated-only shell affordance co-residence
  - bounded build or typecheck proof for the exact file surface
  - governance scope validation showing only allowlisted files changed

## Production Verification Rerun Record

- verification result: `VERIFIED_COMPLETE`
- verification date: `2026-04-06`
- implementation baseline: `bfb6dea`
- blocker-removal prerequisite preserved separately: `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` remediation commit `a637998`
- rerun evidence summary:
  - the live control-plane tenant registry loaded on `https://app.texqtic.com/`
  - the exact proof tenant `B2C Browse Proof 20260402080229` remained discoverable with tenant id `743c73aa-1b55-4560-a018-e8e554ca65f6`
  - tenant-context entry succeeded from both bounded entry surfaces: row-level impersonation / `Enter Tenant Context` and `App Shells`
  - the exact non-WL B2C `HOME` path loaded in production
  - the branded/home-return frame remained present and the search input remained present on that exact path
  - authenticated-only shell affordances were not visible on that exact path
  - the earlier blocked `REALM_MISMATCH`, `Loading workspace...`, and `Starting...` symptom chain did not reproduce on rerun
  - the earlier enterprise `Orders` neighbor-smoke issue did not reproduce on rerun and remains excluded from this unit
  - the observed impersonation-stop `404` during exit remains a separate adjacent finding only and does not block this unit's closure sequencing

## Governance Sync

- governance sync phase: completed
- status transition: `OPEN` -> `VERIFIED_COMPLETE`
- current Layer 0 posture: same sole `ACTIVE_DELIVERY` stream, now closure-ready only
- next lawful lifecycle step after this sync: separate Close for `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` only
- no closure is implied by this sync

## Close Record

- close date: `2026-04-06`
- resulting status: `CLOSED`
- close basis:
  - implementation baseline `bfb6dea` remained the bounded product baseline for this unit
  - live production rerun already established `VERIFIED_COMPLETE` on the exact governed path
  - `GOV-DEC-IMPERSONATION-STOP-CLEANUP-404-ADJACENT-FINDING` recorded the observed stop-path
    `404` as a separate non-blocking adjacent finding only
  - `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` remains separately
    `VERIFIED_COMPLETE` and pending its own bounded close pass
- close summary:
  - the exact non-WL B2C `HOME` path remains truthfully verified in live production
  - the branded/search entry-facing frame remains intact on that exact path
  - authenticated-only shell affordances are not visible on that exact path
  - the earlier blocked production-verification symptom no longer reproduces
  - the earlier enterprise `Orders` neighbor-smoke issue did not reproduce on rerun
  - the observed impersonation-stop cleanup `404` remains separate and is not absorbed into this
    closed B2C unit
  - no successor opening is implied by this close

## Current Layer 0 Rule

`MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` is now `CLOSED`.

`NEXT-ACTION.md` now points only to separate Close for
`CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001`.

The adjacent finding `IMPERSONATION-STOP-CLEANUP-404-001` is decision-only and does not create an
opening. `g026-platform-subdomain-routing.spec.ts` remains unrelated and out of scope.

## Last Governance Confirmation

2026-04-06 — `GOV-DEC-B2C-SHELL-CLOSE-WITH-ADJACENT-FINDING`. Status transitioned:
`VERIFIED_COMPLETE` -> `CLOSED` after the already-recorded bounded implementation baseline,
live production rerun proof, and governance sync. The exact governed non-WL B2C `HOME` path
remains verified, the branded/search entry-facing frame remains intact, authenticated-only shell
affordances are not visible on that exact path, the earlier blocked tenant-context entry symptom no
longer reproduces, and the earlier enterprise `Orders` neighbor-smoke issue did not reproduce on
rerun. The observed impersonation-stop cleanup `404` is now preserved separately under
`GOV-DEC-IMPERSONATION-STOP-CLEANUP-404-ADJACENT-FINDING`, the support unit remains separately
`VERIFIED_COMPLETE` pending its own close, no successor opening is implied, and no public-shell,
orders/cart/checkout, broader auth, domain, or `g026` work was authorized by this closure.
