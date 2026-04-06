# GOV-DEC-B2C-SHELL-BOUNDARY-REDUCTION

Decision ID: GOV-DEC-B2C-SHELL-BOUNDARY-REDUCTION
Title: Reduce the B2C public-entry to authenticated-continuity shell boundary to one exact child
Status: DECIDED
Date: 2026-04-06
Authorized by: Paresh

## Context

TexQtic remains in zero-open product-facing posture.

Current Layer 0 remains:

- `ACTIVE_DELIVERY: 0`
- `product_delivery_priority: NONE_OPEN`
- no implicit successor opening exists
- `g026-platform-subdomain-routing.spec.ts` remains unrelated

The controlling inputs for this pass were read in order:

- `OPEN-SET.md`
- `NEXT-ACTION.md`
- `SNAPSHOT.md`
- `BLOCKED.md`
- `GOV-DEC-NEXT-CANDIDATE-SELECTION-POST-AGGREGATOR`
- `GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING`
- `GOV-DEC-B2C-FAMILY-REDUCTION-POST-PUBLIC-RUNTIME-PLANNING`
- the three exact closed B2C seam/unit records
- `App.tsx`
- `layouts/Shells.tsx`
- the minimum current product-truth artifacts needed to classify shell-level ownership

The immediately prior B2C reduction decision preserved that:

- the strongest surviving B2C remainder is `B2C_PUBLIC_ENTRY_TO_AUTHENTICATED_CONTINUITY_BOUNDARY`
- that remainder was still mixed at shell level across multiple affordances and adjacent-family inheritances
- one more shell-level reduction pass was required before lawful exact-child naming

This pass asks only whether the shell-level remainder can now be collapsed into one exact bounded child.

## Required Determinations

### A. Shell-boundary ownership scan

The runtime anchors show the non-WL B2C `HOME` path is still mounted through the tenant-authenticated
`EXPERIENCE` branch:

- `resolveExperienceShell(... 'B2C' ...) -> B2CShell`
- `isB2CBrowseEntrySurface` is defined as `appState === 'EXPERIENCE' && expView === 'HOME' && isNonWhiteLabelB2CTenant`
- `B2CShell` receives a mixed set of shell-level navigation props on that same path

Shell-level ownership classification on the exact non-WL B2C `HOME` path is therefore:

1. `Brand/logo home return` -> `SHARED_PUBLIC_ENTRY_OWNERSHIP`
   - the branded shell frame and return-to-home action belong to entry framing and truthful branded surface continuity
   - this pass does not need to re-own the shared public shell to classify that boundary

2. `Search input bound to b2cSearchQuery on HOME` -> `SHARED_PUBLIC_ENTRY_OWNERSHIP`
   - this is the surviving entry-facing browse control already normalized by the closed browse-entry seam
   - it is not the new child target

3. `Orders` nav` -> `ORDERS_FAMILY_OWNERSHIP`
   - it routes to `expView='ORDERS'`
   - current product truth classifies order visibility and lifecycle continuity inside the separate downstream orders family

4. `Cart icon / cart overlay entry` -> `ORDERS_FAMILY_OWNERSHIP`
   - the shell icon calls `setShowCart(true)` and opens the cart/checkout execution surface
   - cart continuity is explicitly owned by the separate downstream orders family

5. `DPP Passport` nav -> `ADJACENT_FAMILY_OWNERSHIP`
   - this routes into the DPP/traceability family rather than B2C parent-family shell ownership

6. `Escrow` nav -> `ADJACENT_FAMILY_OWNERSHIP`
   - this routes into the escrow/settlement-adjacent family rather than B2C parent-family shell ownership

7. `Escalations` nav -> `ADJACENT_FAMILY_OWNERSHIP`
   - this routes into escalation/dispute continuity rather than B2C parent-family shell ownership

8. `Settlement` nav -> `ADJACENT_FAMILY_OWNERSHIP`
   - this routes into settlement/funds-adjacent continuity and remains outside B2C family ownership

9. `Certifications` nav -> `ADJACENT_FAMILY_OWNERSHIP`
   - this routes into the compliance/certifications family rather than B2C parent-family shell ownership

10. `Traceability` nav -> `ADJACENT_FAMILY_OWNERSHIP`
    - this routes into the traceability family rather than B2C parent-family shell ownership

11. `Audit Log` nav -> `ADJACENT_FAMILY_OWNERSHIP`
    - this routes into tenant audit/logging visibility and not B2C parent-family shell ownership

12. `Trades` nav -> `ADJACENT_FAMILY_OWNERSHIP`
    - this routes into trade continuity and remains outside B2C parent-family shell ownership

13. `Team` nav -> `ADJACENT_FAMILY_OWNERSHIP`
    - this routes to `TEAM_MGMT` and belongs to tenant back-office / workspace administration rather than B2C parent-family shell ownership

14. `Co-residence of entry-facing frame plus authenticated-only nav cluster on the same B2CShell HOME header` -> `B2C_AUTHENTICATED_BOUNDARY_OWNERSHIP`
    - this is the surviving B2C-owned shell problem
    - the problem is not the downstream panels themselves, but the boundary failure where authenticated-only affordances remain exposed on the same exact shell path that still carries B2C entry-facing framing

Ownership result:

- the surviving exact B2C-owned shell problem is not `Orders`, `Cart`, `Team`, `DPP`, `Trades`, `Escrow`, `Settlement`, `Audit Log`, or the public shell as separate families
- it is the lack of separation between entry-facing B2C shell framing and authenticated-only affordance exposure on that exact non-WL B2C `HOME` shell path

### B. Child-shape emergence test

One exact child does now emerge.

Result:

`AUTHENTICATED_AFFORDANCE_SEPARATION_CHILD_EMERGED`

Exact child name:

- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION`

Exact in-scope line:

- separate authenticated-only shell affordances from the exact non-WL B2C `HOME` shell path while preserving the branded B2C entry-facing frame, home return, and browse-entry search continuity already normalized by the closed public seam

Exact out-of-scope line:

- do not redesign the shared public shell/navbar, do not alter downstream orders/cart/checkout behavior, do not change adjacent-family panels or their ownership, do not reopen the closed browse-entry seam, and do not touch onboarding/auth/domain-routing/g026 work

Why this child is cleaner than the other candidate shapes:

1. cleaner than `PUBLIC_ENTRY_TO_AUTHENTICATED_HANDOFF_CHILD_EMERGED`
   - the runtime anchors do not expose one discrete shell-level handoff mechanism
   - the shell evidence is about authenticated-affordance exposure on the `HOME` header, not about one singular auth/onboarding transition object
   - a handoff child would drift toward auth/onboarding/domain-routing families outside this pass

2. cleaner than `SHELL_BOUNDARY_CORRECTION_CHILD_EMERGED`
   - `shell-boundary correction` is materially broader and less exact
   - the exact recoverable problem is not every shell concern; it is authenticated-only affordance exposure on the entry-facing B2C HOME shell path

3. exact enough for lawful naming now
   - one clear problem target exists: authenticated-only nav exposure on the entry-facing B2C shell path
   - one clear in-scope line exists
   - one clear out-of-scope line exists
   - adjacent-family ownership is now explicitly classified rather than silently absorbed
   - the child does not depend on shared public-shell implementation already being solved

### C. Boundary purity test

This child is boundary-pure enough for lawful naming.

1. shared public-shell/navbar ownership remains separate
   - the child preserves the branded frame, home return, and browse-entry search as entry-facing shell concerns
   - it does not claim ownership of the broader shared public shell/navigation family

2. downstream orders-family ownership remains separate
   - `Orders` and `Cart` are classified as downstream-family affordances only
   - the child owns only their shell-level separation from the exact B2C `HOME` entry-facing path, not the downstream workflows themselves

3. previously closed seam work remains separate
   - browse-entry continuity is already closed
   - seller/admin affordance separation is already closed
   - settings affordance separation is already closed
   - this child is later and different: authenticated-only shell affordance separation

4. adjacent-family ownership remains separate
   - `Team` remains tenant back-office
   - `DPP`, `Traceability`, `Certifications`, `Audit Log`, `Trades`, `Escrow`, `Escalations`, and `Settlement` remain adjacent-family surfaces
   - the child does not absorb their substantive family ownership

### D. Reduction sufficiency test

This pass is sufficient to name the exact next shell-level child.

Reason:

- the shell-boundary ownership scan reduced the mixed remainder to one precise B2C-owned problem
- the problem is not the downstream surfaces themselves, but their authenticated-only exposure on the exact B2C `HOME` shell path
- that yields one exact next child without reopening public-entry planning, orders-family work, or prior seam work

Sufficiency result:

- `EXACT_CHILD_AVAILABLE_NOW: YES`
- `NEXT_EXACT_CHILD: MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION`
- `ONE_MORE_REDUCTION_STEP_REQUIRED: NO`

### E. Unrelated residue separation

`g026-platform-subdomain-routing.spec.ts` remains unrelated.

It is not part of this shell-level B2C reduction, does not affect the child-shape result, and must
be handled separately later through its own governance path.

## Decision Result

`AUTHENTICATED_AFFORDANCE_SEPARATION_CHILD_EMERGED`

Exact child recovered:

- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION`

This result is governance-only.

It does not:

- open a product unit
- change Layer 0 current-state posture
- authorize shell/navbar implementation
- authorize downstream orders-family work
- authorize auth/onboarding/domain-routing redesign
- reopen browse-entry, seller/admin, or settings seam work

Minimum inheritance rule:

- later B2C opening review must treat the exact next shell-level child as authenticated-affordance separation on the exact non-WL B2C `HOME` shell path
- later work must preserve separate ownership for shared public-entry framing, downstream orders/cart continuity, adjacent-family panels, and unrelated g026 residue