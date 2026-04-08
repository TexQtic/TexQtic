---
unit_id: MODE-COMPLETENESS-B2C-STOREFRONT-CATALOG-MUTATION-AFFORDANCE-SEPARATION-001
title: B2C storefront catalog-mutation affordance separation
type: ACTIVE_DELIVERY
status: OPEN
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: TENANT
opened: 2026-04-08
closed: null
verified: null
commit: null
evidence: "OPENING_CONFIRMATION: GOV-DEC-B2C-POST-CLOSE-REMAINDER-REDUCTION already recovered this exact child from current repo truth without reusing stale shell-boundary authority or reopening earlier closed B2C children · REPO_ANCHOR_CONFIRMATION: App.tsx still renders the exact non-WL B2C HOME New Arrivals card grid, still calls renderCatalogItemMutationActions(product) on that path, and still exposes Edit and Delete there while B2CAddToCartButton remains separately present on the same cards · OWNERSHIP_CONFIRMATION: current B2C product truth preserves product preview as B2C parent-family entry continuity, seller-admin catalog mutation as separate catalog-management ownership, and Add to Cart as separately owned downstream orders-family continuity"
doctrine_constraints:
  - D-004: this unit is limited to exact card-level catalog-mutation affordance separation on the non-WL B2C HOME New Arrivals grid only and must not widen into seller-admin redesign, shared shell redesign, settings work, or downstream orders-family behavior changes
  - D-007: no surface outside the exact allowlist is authorized
  - D-011: prior closed B2C children remain authoritative and must not be reopened or overread as settling this exact card-level mutation seam
  - D-013: this step opens the exact unit record only and performs no product implementation, verification, or close sequencing by implication
decisions_required:
  - GOV-DEC-B2C-POST-CLOSE-REMAINDER-REDUCTION: DECIDED (2026-04-08, Paresh)
blockers: []
---

## Opening Basis

`GOV-DEC-B2C-POST-CLOSE-REMAINDER-REDUCTION` already lawfully reduced the current surviving
post-close B2C remainder to one exact child.

This record converts that already-recovered child into one explicit exact unit record.

This step does not re-run the reduction, does not reopen stale shell-boundary authority, and does
not perform product implementation.

## Parent / Reduction Authority Reference

Opening authority for this unit is:

- `governance/decisions/GOV-DEC-B2C-POST-CLOSE-REMAINDER-REDUCTION.md`

The parent decision already established that:

1. earlier closed B2C children remain closed and separate
2. the exact non-WL B2C `HOME` card grid is the strongest surviving current repo-truth anchor
3. `Edit` and `Delete` card-level mutation controls remain co-resident on that exact surface
4. `Add to Cart` remains separate downstream orders-family continuity and is not the child target

## Exact Child Name

`MODE-COMPLETENESS-B2C-STOREFRONT-CATALOG-MUTATION-AFFORDANCE-SEPARATION-001`

## Exact In-Scope Line

Separate the `Edit` and `Delete` catalog-mutation affordances from the exact non-WL B2C `HOME`
`New Arrivals` card grid while preserving the card-level product preview surface and the
separately owned downstream `Add to Cart` continuity already rendered on that exact path.

## Exact Out-of-Scope Line

Do not reopen `+ Add Item` / inline add-item, do not reopen settings separation, do not reopen
shell authenticated-affordance separation, do not redesign the shared public frame or search input,
do not change `Add to Cart`, cart, checkout, orders, or post-purchase behavior, and do not widen
into B2B, WL, enterprise, backend, schema, auth, domain-routing, or adjacent-family redesign.

## Repo-Truth Anchor Summary

Current repo truth supporting this unit is:

- `App.tsx` still defines the exact non-WL B2C `HOME` surface and still renders the exact `New Arrivals`
  card grid on that path
- `App.tsx` still calls `renderCatalogItemMutationActions(product)` for those exact B2C cards
- `renderCatalogItemMutationActions(product)` still renders `Edit` and `Delete` on that exact path
- `B2CAddToCartButton` remains separately rendered on the same exact cards and remains outside this
  unit's target because downstream add-to-cart continuity is preserved separately under
  orders-family ownership
- `MODE-COMPLETENESS-B2C-STOREFRONT-SELLER-ADMIN-AFFORDANCE-SEPARATION-001` remains closed and
  authoritative only for the earlier `+ Add Item` / inline add-item seam
- `MODE-COMPLETENESS-B2C-STOREFRONT-SETTINGS-AFFORDANCE-SEPARATION-001` remains closed and
  separate for settings drift only
- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` remains closed and separate
  for the earlier shell/header co-residence problem only

## Acceptance Criteria

- [x] The exact child name is fixed from already-recorded reduction authority only
- [x] The unit remains bounded to card-level `Edit` / `Delete` catalog-mutation affordance
      separation on the exact non-WL B2C `HOME` `New Arrivals` seam only
- [x] Downstream `Add to Cart` continuity remains explicitly separate and preserved
- [x] Earlier closed B2C children remain closed and separate
- [x] No product implementation is performed in this opening-record step

## Files Allowlisted (Modify)

This unit authorizes modification of these files only:

- `governance/units/MODE-COMPLETENESS-B2C-STOREFRONT-CATALOG-MUTATION-AFFORDANCE-SEPARATION-001.md`
- `App.tsx`

## Non-Goals / Adjacent Exclusions

This unit does **not** authorize:

- removal or redesign of `+ Add Item` / inline add-item because that earlier seam is already closed
- settings affordance work
- shell/header authenticated-affordance work
- `Add to Cart`, cart drawer, checkout, orders, or post-purchase changes
- seller-admin redesign beyond exact card-level `Edit` / `Delete` removal or separation
- B2B, WL, enterprise, backend, schema, auth, routing, or cross-family redesign

## Opening Posture

This exact unit is now opened as one bounded `ACTIVE_DELIVERY` unit record.

This step is governance-only.

It creates the exact scoped unit record and allowlist only. It does not perform product
implementation, verification, Layer 0 sync, or close sequencing in this step.

The next lawful move, if later authorized, is a separate bounded implementation step confined to
the exact allowlist and exact scope stated in this record.

## Footer

`EXACT_UNIT_OPENED`
`NO_PRODUCT_IMPLEMENTATION_PERFORMED_IN_THIS_STEP`