# WL-RFQ-EXPOSURE-CONTINUITY-DESIGN-v1

## Status

- Unit: `WL-RFQ-EXPOSURE-CONTINUITY`
- Phase: `DESIGN`
- State: `OPEN` / design defined
- Delivery posture: `ACTIVE_DELIVERY`
- Active-delivery impact: `WL-RFQ-EXPOSURE-CONTINUITY` remains the sole current product-facing `ACTIVE_DELIVERY`

## Mission

Define the bounded design for `WL-RFQ-EXPOSURE-CONTINUITY`.

This unit exists only to expose WL RFQ initiation on the reviewed WL storefront/product-detail path
and to add the minimum lawful WL RFQ follow-up entry needed so that reviewed WL path no longer
stops before RFQ begins.

This design is planning only. No implementation has started in this phase.

## Unit Type / Phase

`WL-RFQ-EXPOSURE-CONTINUITY` is one bounded WL continuity unit.

It exists only to repair the reviewed WL browse-to-detail path so it can lawfully enter the already
existing RFQ flow and re-enter the minimum buyer-side RFQ follow-up continuity already present in
repo truth. It does not authorize enterprise RFQ bridge work, negotiation redesign, trade redesign,
quote/counter-offer redesign, image/media continuity, search redesign, merchandising redesign, B2C
continuity, control-plane work, enterprise redesign, or any reopen of previously closed WL or
tenant-truth units.

## Problem Statement

Current repo truth already contains RFQ support that the WL path could lawfully consume in bounded
form:

- `services/catalogService.ts` already exposes `createRfq`, `getBuyerRfqs`, and `getBuyerRfqDetail`
- `App.tsx` already owns the RFQ dialog submit flow, RFQ success handling, buyer RFQ list loading,
  buyer RFQ detail loading, and the existing buyer RFQ read surfaces
- `server/src/routes/tenant.ts` already exposes buyer RFQ create/list/detail routes plus the
  supplier inbox/detail/first-response routes that remain separate from this WL unit

The remaining problem is that the reviewed WL shopper path never reaches any of that RFQ support.
`WLStorefront.tsx`, `ProductGrid.tsx`, `ProductCard.tsx`, and `WLProductDetailPage.tsx` currently
provide browse, selection, product detail, and add-to-cart continuity only. No RFQ initiation entry
is exposed on the reviewed WL path, and no WL path entry exists to reopen buyer RFQ list/detail
continuity after submission.

This is therefore not a backend-missing-RFQ problem and not a negotiation-depth problem. It is a
bounded WL path exposure and minimum follow-up continuity problem in front of already installed RFQ
capabilities.

## Carry-Forward Truth / Neighboring-Unit Separation

The following truths are carried forward and must remain preserved:

- `WL-RFQ-EXPOSURE-CONTINUITY` is already lawfully `OPEN`
- it remains the sole current product-facing `ACTIVE_DELIVERY`
- `RFQ-NEGOTIATION-CONTINUITY` remains the parent cross-mode `DESIGN_GATE` family
- `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` remains a separate later future unit shape
- product image upload / media continuity remains a separate adjacent finding
- `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` remains separate and later-ready
- `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` remains separate and later-ready
- `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` remains `DESIGN_GATE` only
- `WL-BLUEPRINT-RUNTIME-RESIDUE-001`, `TENANT-TRUTH-CLEANUP-001`,
  `WL-ADMIN-ENTRY-DISCOVERABILITY-001`, and `TENANT-CATALOG-MANAGEMENT-CONTINUITY` remain closed
  and separate
- enterprise redesign remains closed / not justified

This unit must stay centered on WL RFQ initiation exposure plus the minimum WL buyer follow-up
continuity only. It must not be reframed as a broad RFQ/trade/platform program.

## Repo-Truth Findings

### 1) What exact WL storefront/product-detail journey exists today in repo truth?

The current reviewed WL journey is:

1. `App.tsx` routes WL tenants in `EXPERIENCE` / `HOME` to `WLStorefront`
2. `WLStorefront.tsx` fetches catalog items once, derives categories/search, and renders
   `ProductGrid`
3. `ProductGrid.tsx` renders `ProductCard.tsx` rows and forwards selection back to `WLStorefront`
4. selecting a card opens `WLProductDetailPage.tsx`
5. `WLProductDetailPage.tsx` renders product information, image, MOQ, and add-to-cart only
6. the shopper can go back to the storefront grid or add the item to cart

This is the exact reviewed WL browse-to-detail continuity that exists today.

### 2) Where exactly does that journey stop before RFQ begins?

The journey stops at the final actions on `WLProductDetailPage.tsx`.

The reviewed WL path exposes:

- browse
- product selection
- product detail
- add-to-cart
- return-to-grid

The reviewed WL path does not expose:

- `Request Quote`
- RFQ dialog entry
- RFQ submit success path
- WL entry to buyer RFQ list
- WL entry to buyer RFQ detail

The exact stop point is therefore the WL product detail action area, where the path remains cart-only
and still stops before RFQ begins.

### 3) What exact RFQ backend/supporting capabilities already exist that this WL path could lawfully consume?

The WL path can lawfully consume already existing RFQ support in bounded form:

#### Existing frontend/client support

- `services/catalogService.ts`
  - `createRfq`
  - `getBuyerRfqs`
  - `getBuyerRfqDetail`
- `App.tsx`
  - existing RFQ dialog open/submit/success state
  - existing buyer RFQ list loading and rendering
  - existing buyer RFQ detail loading and rendering
  - existing success action that already routes into buyer RFQ detail

#### Existing backend support

- `POST /api/tenant/rfqs`
- `GET /api/tenant/rfqs`
- `GET /api/tenant/rfqs/:id`
- `GET /api/tenant/rfqs/inbox`
- `GET /api/tenant/rfqs/inbox/:id`
- `POST /api/tenant/rfqs/inbox/:id/respond`

#### Existing buyer read surfaces

- `components/Tenant/BuyerRfqListSurface.tsx`
- `components/Tenant/BuyerRfqDetailSurface.tsx`

These existing capabilities mean the WL unit does not need new RFQ contracts, supplier workflow
design, or negotiation/trade behavior in order to become materially truthful.

### 4) What is the smallest lawful implementation shape that exposes RFQ initiation and minimum follow-up continuity for WL without widening scope?

The smallest lawful implementation shape is:

1. reuse the existing `App.tsx` RFQ orchestration and buyer RFQ list/detail continuity rather than
   creating parallel WL-only RFQ state machines
2. expose one WL RFQ initiation entry on `WLProductDetailPage.tsx`
3. expose one minimum WL follow-up entry from the WL path back into the existing buyer RFQ
   list/detail continuity
4. keep WL browse/search/cart ownership intact in `WLStorefront.tsx`
5. avoid adding supplier inbox, trade transitions, negotiation thread behavior, or enterprise-only
   RFQ continuation

At design level, this means the unit is a bounded reuse-and-expose repair, not a new RFQ subsystem.

### 5) Which files are truly in scope for implementation?

The truly in-scope implementation files are:

- `App.tsx`
- `components/WL/WLStorefront.tsx`
- `components/WL/WLProductDetailPage.tsx`

Evidence anchors that should guide implementation but are not planned mutation surfaces in the first
pass are:

- `services/catalogService.ts`
- `server/src/routes/tenant.ts`
- `components/Tenant/BuyerRfqListSurface.tsx`
- `components/Tenant/BuyerRfqDetailSurface.tsx`

### 6) Is any adjacent file strictly necessary beyond the initially reviewed WL storefront/product-detail surfaces?

Yes. `App.tsx` is strictly necessary.

Justification:

- `App.tsx` already owns the existing RFQ dialog state, submit flow, success handling, buyer RFQ
  list view, and buyer RFQ detail view
- the smallest lawful implementation is to connect the WL path into that existing orchestration,
  not to duplicate RFQ state inside WL components

No additional hidden neighboring WL rendering surface was strictly required for the first pass.

Specifically:

- `ProductGrid.tsx` and `ProductCard.tsx` are part of the reviewed WL path and were checked for
  structural necessity
- they are not strictly required in the first pass because product-detail RFQ initiation plus a
  WL storefront follow-up entry is sufficient to make the reviewed WL path reach RFQ without adding
  a direct storefront-card RFQ CTA

### 7) What should be the first implementation entry?

The lawful first implementation entry should be `App.tsx`.

Rationale:

- the existing RFQ orchestration already lives there
- the bounded WL unit should reuse that path rather than create a second RFQ flow
- wiring WL callbacks first defines the lawful integration boundary before changing WL presentation
  surfaces

### 8) What later implementation slices, if any, should follow?

The later bounded slices should be:

- `WLProductDetailPage.tsx`
  - add the WL `Request Quote` entry point
  - add the minimum post-submit follow-up action entry appropriate to the existing RFQ flow
- `WLStorefront.tsx`
  - pass RFQ initiation and follow-up callbacks through the existing WL data-owner surface
  - add the minimum WL path entry for buyer RFQ follow-up continuity if the product-detail-only
    entry is insufficient for later re-entry
- focused verification and then governance sync

No later slice in this unit should widen into supplier workflow, trade lifecycle, or enterprise RFQ
bridge behavior.

### 9) What verification questions will prove the unit complete?

This unit is complete only when the following questions answer yes in bounded proof:

1. Can a WL shopper on the reviewed product-detail path initiate a non-binding RFQ?
2. Does that RFQ initiation reuse the existing tenant RFQ create contract rather than a new path?
3. After submission, can the WL path reach an existing buyer RFQ follow-up surface without leaving
   the lawful bounded unit?
4. Can the WL path later reopen the minimum buyer RFQ follow-up continuity promised by the design?
5. Does the WL path remain free of supplier inbox, negotiation thread, trade conversion, or AI
   negotiation advice behavior?
6. Do browse, product detail, and add-to-cart continuity remain behaviorally intact?
7. Did enterprise RFQ bridge behavior remain unchanged?

## Exact Bounded Scope

This unit is bounded to WL RFQ initiation exposure and minimum WL buyer follow-up continuity only
across these reviewed surfaces:

- `App.tsx` — existing RFQ orchestration and existing buyer RFQ continuity reused by the WL path
- `components/WL/WLStorefront.tsx` — WL browse/data-owner path that must expose the minimum WL
  RFQ follow-up continuity entry
- `components/WL/WLProductDetailPage.tsx` — exact reviewed WL stop point where RFQ initiation must
  be exposed

At design time, these surfaces map to three bounded concerns:

- WL path-to-RFQ entry
- WL path-to-buyer-follow-up re-entry
- reuse of existing RFQ orchestration without workflow duplication

## Explicit Out Of Scope

- enterprise RFQ-to-negotiation bridge work
- broad negotiation redesign
- trade redesign
- quote or counter-offer redesign
- supplier inbox redesign or supplier response redesign
- RFQ-to-trade conversion or trade lifecycle wiring
- AI negotiation-advice surfacing
- image-upload or media continuity
- search redesign
- merchandising redesign
- B2C storefront continuity
- control-plane tenant operations work
- aggregator scope-truth work
- schema, migration, Prisma, SQL, or RLS work
- auth or shell redesign
- enterprise redesign
- reopening `WL-BLUEPRINT-RUNTIME-RESIDUE-001`, `TENANT-TRUTH-CLEANUP-001`,
  `WL-ADMIN-ENTRY-DISCOVERABILITY-001`, or `TENANT-CATALOG-MANAGEMENT-CONTINUITY`
- implementation, tests, deployment, or verification execution in this design phase

## Design Intent / Remediation Shape

The intended remediation shape is the minimum lawful change required to make the reviewed WL
storefront/product-detail path truthful about RFQ capability without changing the broader exchange
workflow model.

At design level only, that means:

1. preserve the existing RFQ create/list/detail contracts rather than redesigning them
2. preserve the existing WL browse/search/cart ownership model rather than redesigning storefront
   discovery
3. reuse `App.tsx` RFQ orchestration rather than duplicating RFQ flow state in WL components
4. expose RFQ initiation at the exact WL stop point: `WLProductDetailPage.tsx`
5. add only the minimum WL follow-up entry needed to re-enter existing buyer RFQ continuity
6. resist any pull toward supplier flow, trade continuation, or enterprise negotiation depth

The minimum lawful remediation shape is therefore:

- one WL RFQ entry point
- one WL buyer follow-up entry
- one reused buyer RFQ continuity chain

and not a broader RFQ/trade redesign.

## Slice Plan

### Slice 1 — RFQ orchestration reuse boundary

In `App.tsx`, expose the existing RFQ dialog, submit, success, buyer list, and buyer detail
handlers to the WL path in a reusable bounded way.

This slice establishes the lawful reuse boundary and should happen before WL UI changes.

### Slice 2 — WL product-detail RFQ initiation

In `WLProductDetailPage.tsx`, add the exact WL `Request Quote` initiation control at the current
WL stop point.

This slice changes only the final action area of the reviewed WL detail surface.

### Slice 3 — Minimum WL follow-up continuity

In `WLStorefront.tsx`, add the minimum WL re-entry path into the existing buyer RFQ continuity.

This should remain minimal:

- either a WL path-level `View My RFQs` entry
- or another equally narrow re-entry that reuses the existing buyer RFQ list/detail chain

No supplier, trade, or negotiation continuity belongs in this slice.

### Slice 4 — Focused proof and governance sync

Verify that the WL path can initiate RFQ and re-enter buyer RFQ follow-up continuity without
widening scope, then perform the separate verification and governance-sync phases.

## Verification Plan

The bounded verification plan must answer all of the following:

### WL path truthfulness

- From WL storefront, can the shopper reach product detail and then initiate `Request Quote`?
- Does the WL path no longer stop at add-to-cart only?

### RFQ contract reuse

- Does WL RFQ initiation call the existing `createRfq` client helper and `POST /api/tenant/rfqs`
  route?
- Does the unit reuse the existing buyer RFQ list/detail path rather than introduce a new contract?

### Minimum follow-up continuity

- After RFQ submission, can the shopper open existing buyer RFQ detail?
- Can the shopper later reopen the minimum WL buyer RFQ follow-up continuity promised by the unit?

### Non-regression / non-drift

- Does add-to-cart remain healthy on the WL product-detail path?
- Do WL browse/search/category flows remain intact?
- Did no supplier inbox, negotiation, trade, or enterprise RFQ bridge behavior appear in the WL path?

## Risks / Drift Controls

### Drift Risk 1 — enterprise bridge creep

Risk:
Implementation may try to add RFQ-to-trade conversion, negotiation actions, or enterprise RFQ
continuation because those capabilities exist elsewhere in repo truth.

Control:
Reject any implementation that adds trade creation, negotiation state transitions, quote-thread
behavior, counter-offer behavior, or AI negotiation advice inside this unit.

### Drift Risk 2 — hidden WL card-surface expansion

Risk:
Implementation may try to widen into `ProductGrid.tsx` or `ProductCard.tsx` for a direct grid-card
RFQ CTA even though the unit can be completed through the browse-to-detail path.

Control:
Treat direct storefront-card RFQ CTA as non-required unless the first-pass product-detail path
proves insufficient during bounded implementation review.

### Drift Risk 3 — supplier workflow leakage

Risk:
Implementation may try to surface supplier inbox/detail or response handling because those routes
and surfaces already exist.

Control:
Keep this unit buyer-side WL path only. Supplier surfaces remain out of scope.

### Drift Risk 4 — adjacent continuity merge

Risk:
Implementation may try to absorb image/media continuity, search changes, merchandising changes, B2C
continuity, or control-plane work while touching WL storefront files.

Control:
Allow only WL RFQ initiation exposure and minimum buyer follow-up continuity changes. Any adjacent
continuity issue remains separately governed.

## Lawful Next Implementation Entry

The lawful first implementation entry is `App.tsx`.

Reason:

- it already owns the existing RFQ orchestration that this WL path must reuse
- starting there locks the bounded reuse shape before any WL presentational change is made
- it minimizes the risk of inventing a second RFQ flow or widening into negotiation/trade logic

The first implementation step should therefore be: define and pass the bounded WL RFQ initiation
and follow-up callbacks from `App.tsx` into the reviewed WL path.

## Completion Note

`WL-RFQ-EXPOSURE-CONTINUITY` remains one bounded WL RFQ exposure continuity unit. This design now
defines the exact reviewed WL journey, the exact stop point before RFQ begins, the exact existing
RFQ support it may lawfully consume, the minimum remediation shape, the slice order, the
verification standard, and the drift boundaries. No implementation has started in this phase.