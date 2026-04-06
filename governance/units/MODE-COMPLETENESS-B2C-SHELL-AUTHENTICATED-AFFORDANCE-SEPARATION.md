---
unit_id: MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION
title: B2C shell authenticated-affordance separation
type: ACTIVE_DELIVERY
status: OPEN
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: TENANT
opened: 2026-04-06
closed: null
verified: null
commit: null
evidence: "DECISION_CHAIN_CONFIRMATION: GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING preserved the shared public entry-facing frame, home return, and browse-entry search continuity, GOV-DEC-B2C-FAMILY-REDUCTION-POST-PUBLIC-RUNTIME-PLANNING reduced the broad B2C remainder, and GOV-DEC-B2C-SHELL-BOUNDARY-REDUCTION recovered the exact child · CURRENT_RUNTIME_CONFIRMATION: App.tsx still routes the exact non-WL B2C HOME path through B2CShell and layouts/Shells.tsx still co-renders branded browse-entry continuity with authenticated-only nav affordances on that same shell path · SEQUENCING_CONFIRMATION: Layer 0 records zero pre-opening ACTIVE_DELIVERY units and no direct blocker, while the lagging -v2 family stack preserves B2C only at broader family resolution and therefore does not contradict opening this narrower child"
doctrine_constraints:
  - D-004: this unit is limited to authenticated-only shell-affordance separation on the exact non-WL B2C HOME path and must not widen into shared public-shell redesign, seller/admin or settings work, orders/cart/checkout continuity, adjacent authenticated-family redesign, or broad B2C redesign
  - D-007: implementation and verification remain confined to the exact bounded file surface and the approved governance sync files only
  - D-011: inherited public-facing runtime requirements remain authoritative and require preservation of the branded entry-facing frame, home return, and browse-entry search continuity on the exact reviewed path
  - D-013: this unit controls shell-path affordance exposure only and does not authorize downstream family behavior changes behind the removed or repositioned affordances
decisions_required: []
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

## Source Truth

Current repo truth supporting this unit is:

- `governance/decisions/GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING.md` preserves the
  shared branded entry-facing frame, home return, and browse-entry search continuity as separate
  required inheritance
- `governance/decisions/GOV-DEC-B2C-FAMILY-REDUCTION-POST-PUBLIC-RUNTIME-PLANNING.md` reduces the
  broad B2C remainder to the public-entry-to-authenticated boundary
- `governance/decisions/GOV-DEC-B2C-SHELL-BOUNDARY-REDUCTION.md` recovers the exact child as
  authenticated-affordance separation on the exact non-WL B2C `HOME` shell path
- `App.tsx` still routes the exact non-WL B2C `HOME` surface through `B2CShell` and still wires
  authenticated-only navigation affordances on that same exact path
- `layouts/Shells.tsx` still renders the branded B2C frame and search input alongside the mixed
  authenticated navigation cluster on that exact shell path
- `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`,
  `MODE-COMPLETENESS-B2C-STOREFRONT-SELLER-ADMIN-AFFORDANCE-SEPARATION-001`, and
  `MODE-COMPLETENESS-B2C-STOREFRONT-SETTINGS-AFFORDANCE-SEPARATION-001` are already `CLOSED` and
  remain separate

## Acceptance Criteria

- [ ] The unit remains bounded to authenticated-only shell-affordance separation on the exact
      non-WL B2C `HOME` path only
- [ ] The shared branded entry-facing frame, home return, and browse-entry search continuity remain
      preserved on that exact path
- [ ] Authenticated-only shell affordances no longer appear co-resident on the exact reviewed B2C
      `HOME` path
- [ ] No downstream behavior change is claimed for orders/cart/checkout or any adjacent
      authenticated family behind the separated affordances
- [ ] The previously closed public browse-entry, seller/admin, and settings seam units remain
      closed and separate

## Files Allowlisted (Modify)

This unit authorizes modification of these files only:

- `governance/units/MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION.md`
- `App.tsx`
- `layouts/Shells.tsx`

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