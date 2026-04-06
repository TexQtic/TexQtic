# GOV-DEC-B2C-FAMILY-REDUCTION-POST-PUBLIC-RUNTIME-PLANNING

Decision ID: GOV-DEC-B2C-FAMILY-REDUCTION-POST-PUBLIC-RUNTIME-PLANNING
Title: Reduce the strongest surviving B2C family remainder after public-runtime planning preservation
Status: DECIDED
Date: 2026-04-06
Authorized by: Paresh

## Context

TexQtic is in zero-open product-facing posture.

Current Layer 0 remains:

- `ACTIVE_DELIVERY: 0`
- `product_delivery_priority: NONE_OPEN`
- no implicit successor opening
- `g026-platform-subdomain-routing.spec.ts` remains unrelated to this B2C reduction pass

The prior controlling decisions for this pass are:

- `GOV-DEC-NEXT-CANDIDATE-SELECTION-POST-AGGREGATOR`
- `GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING`

Those decisions preserve that:

- the strongest surviving later-ready family remainder is still `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`
- the already-closed B2C browse-entry seam cannot simply be reused as the next child
- the shared public entry/shell/navbar requirement is real and must now be consumed explicitly
- that shared public-entry requirement must not be mistaken for the next B2C child by default

The current question is reduction only:

- whether public-runtime planning preservation now makes one exact bounded B2C child lawfully nameable
- or whether one more B2C reduction step is still required before any later candidate naming/opening

## Required Determinations

### A. Public-runtime planning consumption check

The new public-runtime planning decision changes this B2C reduction as follows:

1. the closed public browse-entry seam remains valid and closed
2. the shared public entry/shell/navbar requirement remains real, but separate from the next B2C child unless the child is explicitly about that cross-cutting layer
3. B2C authenticated continuity after entry remains a real unresolved surface in current planning truth
4. later downstream orders/checkout continuity must not be silently pulled back into B2C just because the B2C shell exposes downstream actions

Consumption result:

- `PUBLIC_RUNTIME_PLANNING_CONSUMED: YES`
- `SHARED_PUBLIC_SHELL_REMAINS_SEPARATE: YES`
- `B2C_BROWSE_ENTRY_ALREADY_CLOSED: YES`
- `B2C_AUTHENTICATED_BOUNDARY_STILL_REQUIRES_REDUCTION: YES`

### B. Surviving B2C remainder contenders after exclusion

After consuming current repo truth, the candidate classes sort as follows:

1. `Shared public entry / shell / navbar requirement`
   - real and preserved
   - cross-cutting under routing/brand-surface/public-entry planning
   - not the next B2C child by default

2. `Downstream cart / checkout / orders / post-purchase continuity`
   - materially real in runtime
   - explicitly classified by current product truth as the separate `ORDERS-CHECKOUT-POST-PURCHASE-CONTINUITY` family
   - therefore not a lawful B2C child label here

3. `B2C public-safe entry to tenant-scoped authenticated continuity boundary`
   - explicitly preserved by `B2C-OPERATING-MODE-DESIGN-v1.md`
   - explicitly preserved by `B2C-TENANT-BRANDED-COMMERCE-POST-SEAM-RECONCILIATION-v1.md`
   - explicitly left unresolved by `GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING`
   - remains the strongest surviving B2C-specific remainder after the closed browse-entry seam and after excluding cross-cutting public-shell ownership plus downstream orders-family ownership

4. `Seller/admin drift or settings drift on the exact browse-entry seam`
   - already closed under the two exact bounded separation units
   - stale as next-child contenders

Contender result:

- `STRONGEST_SURVIVING_B2C_REMAINDER: B2C_PUBLIC_ENTRY_TO_AUTHENTICATED_CONTINUITY_BOUNDARY`

### C. Exact-child emergence test

Current repo truth is strong enough to identify the surviving remainder, but not strong enough to collapse it into one exact child yet.

Why the remainder is now materially narrower:

- `B2C-OPERATING-MODE-DESIGN-v1.md` now gives an explicit family-level distinction between public-safe entry and tenant-scoped authenticated continuity after entry
- `ORDERS-CHECKOUT-POST-PURCHASE-CONTINUITY-FAMILY-DESIGN-v1.md` removes the largest false contender by classifying downstream cart / checkout / order continuity as a separate cross-mode family
- `GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING` removes the other large false contender by preserving shared public-entry/shell truth as cross-cutting rather than silently B2C-owned

Why one exact child is still not lawfully recoverable yet:

- live runtime anchors still show the non-WL B2C `HOME` surface inside the shared `EXPERIENCE` shell path rather than as a separately narrowed post-reduction child
- `App.tsx` still mounts `B2CShell` through the general tenant `EXPERIENCE` branch and passes the same shell-level navigation affordances for `Orders`, `DPP`, `Escrow`, `Escalations`, `Settlement`, `Certifications`, `Traceability`, `Audit Log`, `Trades`, `Team`, and cart access on the same B2C shell path
- `layouts/Shells.tsx` therefore still evidences a mixed shell-level boundary rather than one already-isolated exact child
- current product truth does not yet isolate which exact next child inside that mixed boundary should be named first:
  - one authenticated-affordance separation child
  - one exact public-entry-to-authenticated handoff child
  - or one narrower shell-level boundary correction child

This means the pass can now lawfully say what the strongest remainder is, but not yet name the final exact bounded child without one more reduction step.

Exactness result:

- `EXACT_CHILD_AVAILABLE_NOW: NO`
- `ONE_MORE_B2C_REDUCTION_STEP_REQUIRED: YES`

### D. Lawful next reduction target

The next reduction step must stay bounded to the newly identified remainder only:

- reduce `B2C_PUBLIC_ENTRY_TO_AUTHENTICATED_CONTINUITY_BOUNDARY`
- use `App.tsx` and `layouts/Shells.tsx` only as runtime anchors for the exact non-WL B2C `HOME` shell path
- distinguish each surviving shell-level affordance on that path between:
  - shared public-entry/shell ownership
  - B2C parent-family entry/authenticated boundary ownership
  - downstream orders-family ownership
  - separate tenant-back-office or other adjacent family ownership
- return either one exact shell-level/authenticated-boundary child or an explicit reason the boundary is still mixed

This next reduction must remain separate from:

- shared public-shell/navbar implementation
- B2C browse-entry seam re-opening
- downstream orders/checkout/post-purchase work
- identity/workspace or domain-routing family work
- `g026-platform-subdomain-routing.spec.ts`

## Decision Result

`STRONGEST_B2C_REMAINDER_IDENTIFIED_BUT_CHILD_NOT_YET_EXACT`

TexQtic now has a more precise B2C reduction result than before:

- the strongest surviving B2C remainder is no longer the already-closed browse-entry seam
- it is now the boundary between lawful B2C public-safe entry and tenant-scoped authenticated continuity
- but current repo truth still leaves that boundary mixed across multiple shell-level affordances and adjacent-family inheritances
- therefore one more strict B2C reduction step is still required before any lawful exact child naming or opening can occur

This result is governance-only.

It does not:

- open a new unit
- reopen any closed B2C unit
- change Layer 0
- authorize implementation work
- authorize public-shell/navbar work
- authorize downstream orders-family work

Immediate inheritance rule:

- future B2C reduction must treat `B2C_PUBLIC_ENTRY_TO_AUTHENTICATED_CONTINUITY_BOUNDARY` as the strongest surviving remainder
- it must not fall back to the already-closed browse-entry seam
- it must not silently absorb shared public-entry ownership or downstream orders-family ownership into the next B2C child