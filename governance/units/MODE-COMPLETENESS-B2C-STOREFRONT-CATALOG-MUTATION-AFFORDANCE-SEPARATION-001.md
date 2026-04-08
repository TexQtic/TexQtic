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
evidence: "OPENING_CONFIRMATION: GOV-DEC-B2C-POST-CLOSE-REMAINDER-REDUCTION already recovered this exact child from current repo truth without reusing stale shell-boundary authority or reopening earlier closed B2C children · REPO_ANCHOR_CONFIRMATION: App.tsx rendered the exact non-WL B2C HOME New Arrivals card grid, previously called renderCatalogItemMutationActions(product) on that path, and previously exposed Edit and Delete there while B2CAddToCartButton remained separately present on the same cards · IMPLEMENTATION_CONFIRMATION: App.tsx no longer renders renderCatalogItemMutationActions(product) on the exact non-WL B2C HOME New Arrivals cards and preserves the product preview surface plus B2CAddToCartButton on that exact path while B2B catalog surfaces remain unchanged · LOCAL_VALIDATION_CONFIRMATION: touched-file diagnostics remained on the pre-existing App.tsx baseline, targeted eslint remained blocked by pre-existing App.tsx findings unrelated to this seam, and static render-path inspection confirmed renderCatalogItemMutationActions(...) now remains only on B2B call sites · RUNTIME_BLOCK_CONFIRMATION: local Vite reached only the sign-in surface without an authenticated B2C proof-tenant session and the current production session remained fixed to the Acme enterprise surface, so truthful exact-path runtime verification for the changed seam could not be completed in this step"
doctrine_constraints:
  - D-004: this unit is limited to exact card-level catalog-mutation affordance separation on the non-WL B2C HOME New Arrivals grid only and must not widen into seller-admin redesign, shared shell redesign, settings work, or downstream orders-family behavior changes
  - D-007: no surface outside the exact allowlist is authorized
  - D-011: prior closed B2C children remain authoritative and must not be reopened or overread as settling this exact card-level mutation seam
  - D-013: bounded source implementation does not imply truthful runtime verification, Layer 0 sync, or close sequencing by implication
decisions_required:
  - GOV-DEC-B2C-POST-CLOSE-REMAINDER-REDUCTION: DECIDED (2026-04-08, Paresh)
blockers:
  - truthful exact-path runtime verification remains pending because the changed local build is not reachable with an authenticated B2C proof-tenant session and the current production session does not expose the exact B2C HOME path
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

This exact unit is opened as one bounded `ACTIVE_DELIVERY` unit record and now has one bounded
source implementation confined to `App.tsx`.

The unit is not yet close-ready in this record because truthful exact-path runtime verification has
not yet been completed.

## Implementation Record

- bounded implementation surface: `App.tsx`
- exact bounded product change:
  - removed the `renderCatalogItemMutationActions(product)` render from the exact non-WL B2C
    `HOME` `New Arrivals` card grid
  - preserved the card-level product preview surface unchanged
  - preserved `B2CAddToCartButton` unchanged on that exact path
  - preserved catalog-mutation controls on the B2B catalog surfaces unchanged

## Verification Record

- touched-file diagnostics:
  - `get_errors` on `App.tsx` remained on the pre-existing baseline only; no new diagnostic was
    surfaced for the exact seam change
- targeted lint:
  - `pnpm exec eslint App.tsx` remains blocked by pre-existing `App.tsx` findings unrelated to this
    seam:
    - `HTMLElement` `no-undef`
    - `react-hooks/exhaustive-deps` warning on `tenantBootstrapCurrentUserOptions`
- static render-path proof:
  - `renderCatalogItemMutationActions(...)` now remains only on the B2B catalog paths in
    `App.tsx`
  - the prior exact B2C card-grid call site is absent
- local runtime attempt:
  - local Vite served successfully at `http://127.0.0.1:4173/`
  - the local app reached only the sign-in surface and did not provide an authenticated B2C
    proof-tenant path in this step
- truthful exact-path runtime verification:
  - not completed in this step
  - current production browser access remained fixed to the Acme enterprise surface and did not
    expose the exact non-WL B2C `HOME` path for the changed code

## Current Posture

- current resulting status: `OPEN`
- bounded implementation is complete at source level for the exact seam
- truthful exact-path runtime verification remains pending
- no closure, Layer 0 sync, or successor opening is implied by this implementation attempt

## Footer

`EXACT_UNIT_IMPLEMENTATION_ATTEMPTED`
`TRUTHFUL_RUNTIME_VERIFICATION_PENDING`