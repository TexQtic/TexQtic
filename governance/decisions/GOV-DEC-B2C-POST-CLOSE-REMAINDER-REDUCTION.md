# GOV-DEC-B2C-POST-CLOSE-REMAINDER-REDUCTION

Decision ID: GOV-DEC-B2C-POST-CLOSE-REMAINDER-REDUCTION
Title: Reduce the current post-close B2C remainder after shell authenticated-affordance closure
Status: DECIDED
Date: 2026-04-08
Authorized by: Paresh

## Context

TexQtic remains in zero-open product-facing posture.

Current Layer 0 authority confirms that:

- no product-facing `ACTIVE_DELIVERY` unit is currently open
- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` is already `CLOSED`
- no implicit successor opening is created by that close
- any future product movement requires a fresh bounded decision from current repo truth surfaces

This pass is therefore governance-only and fresh.

It does **not** reopen or recreate:

- `GOV-DEC-B2C-SHELL-BOUNDARY-REDUCTION`
- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION`

The only question for this pass is whether one current post-close B2C remainder still survives in
current repo truth and, if so, whether that remainder can be reduced to one new exact child without
reusing stale authority.

## Required Determinations

### A. Fresh post-close baseline check

The previously recovered shell/header child is now exhausted as a live reduction anchor.

Current repo truth still preserves the earlier closed B2C chain as closed and separate:

- public browse-entry continuity remains closed
- `+ Add Item` / inline add-item seller-admin drift remains closed
- settings affordance separation remains closed
- shell authenticated-affordance separation remains closed

Those closures do not authorize reuse of the same child and do not settle the entire parent B2C
family by implication.

### B. Current exact non-WL B2C `HOME` path scan

Current runtime anchors in `App.tsx` and `layouts/Shells.tsx` show the following on the exact
non-white-label B2C `HOME` path:

1. the `B2CShell` header now preserves only the branded home-return frame and search input on that
   exact path because `showAuthenticatedAffordances` is now false there
2. the exact B2C `New Arrivals` card grid still renders each product card on that same path
3. each card still calls `renderCatalogItemMutationActions(product)` before rendering
   `B2CAddToCartButton`
4. `renderCatalogItemMutationActions(product)` still exposes `Edit` and `Delete` catalog-mutation
   controls
5. `B2CAddToCartButton` remains a separate downstream `addToCart(...)` transaction-entry affordance

This means the earlier shell/header remainder is no longer the strongest surviving current anchor.
The stronger current anchor is the exact B2C `HOME` card grid itself.

### C. Ownership classification on the exact card grid

Ownership on the exact non-WL B2C `HOME` card grid sorts as follows:

1. product image, name, price, and browse preview continuity -> `B2C_PARENT_FAMILY_ENTRY_SURFACE`
2. `Edit` and `Delete` card controls -> `SELLER_ADMIN_CATALOG_MUTATION_OWNERSHIP`
3. `Add to Cart` -> `ORDERS_FAMILY_TRANSACTION_ENTRY_OWNERSHIP`

This classification matters because current B2C product truth preserves:

- B2C parent-family public-safe entry and tenant-scoped authenticated continuity as the parent
  commercial context
- downstream add-to-cart / cart / checkout continuity as separate orders-family ownership
- seller/admin catalog-management behavior as separate from the governed consumer browse-entry seam

Therefore the surviving B2C-owned problem is not the downstream `Add to Cart` action itself and not
the already-closed shell/header affordance cluster.

The surviving B2C-owned problem is the exact co-residence of consumer browse-entry cards with
seller/admin catalog-mutation controls on the same exact non-WL B2C `HOME` surface.

### D. Fresh-child emergence test

One new exact child does emerge now.

Result:

`CATALOG_MUTATION_AFFORDANCE_SEPARATION_CHILD_EMERGED`

Exact child name:

- `MODE-COMPLETENESS-B2C-STOREFRONT-CATALOG-MUTATION-AFFORDANCE-SEPARATION-001`

Exact in-scope line:

- separate the `Edit` and `Delete` catalog-mutation affordances from the exact non-WL B2C `HOME`
  `New Arrivals` card grid while preserving the card-level product preview surface and the
  separately owned downstream `Add to Cart` continuity already rendered on that exact path

Exact out-of-scope line:

- do not reopen the closed `+ Add Item` / inline add-item unit, do not reopen settings separation,
  do not reopen shell authenticated-affordance separation, do not redesign the shared public frame
  or search input, do not change `Add to Cart`, cart, checkout, orders, or post-purchase behavior,
  and do not widen into B2B, WL, enterprise, backend, schema, auth, domain-routing, or adjacent
  family redesign

### E. Distinctness from stale authority

This child is fresh rather than duplicated stale authority because:

1. `MODE-COMPLETENESS-B2C-STOREFRONT-SELLER-ADMIN-AFFORDANCE-SEPARATION-001` closed only the exact
   `+ Add Item` control and inline add-item form on the governed seam
2. `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` closed only the header/shell
   co-residence problem on the same exact path
3. neither prior child named card-level `Edit` / `Delete` mutation controls as the exact child
4. current repo truth still renders those card-level mutation controls on the exact B2C `HOME`
   surface now

### F. Sufficiency test

This pass is sufficient to reduce the current surviving B2C remainder to one new exact child.

Reason:

- the strongest surviving current anchor is no longer abstract family language alone
- one exact current card-level seam is visible in current repo truth
- that seam has a clean ownership line, a clean in-scope line, and a clean out-of-scope line
- the child stays governance-only and does not create product-opening authority by implication

## Decision Result

`CATALOG_MUTATION_AFFORDANCE_SEPARATION_CHILD_EMERGED`

Exact child recovered:

- `MODE-COMPLETENESS-B2C-STOREFRONT-CATALOG-MUTATION-AFFORDANCE-SEPARATION-001`

This result is governance-only.

It does **not**:

- open a product-facing unit
- change Layer 0 current-state posture
- reopen any earlier closed B2C child
- authorize implementation by implication
- authorize downstream orders/cart/checkout work

Final posture:

`GOVERNANCE_ONLY_OPENING`
`NO_PRODUCT_OPENING_AUTHORITY_CREATED`