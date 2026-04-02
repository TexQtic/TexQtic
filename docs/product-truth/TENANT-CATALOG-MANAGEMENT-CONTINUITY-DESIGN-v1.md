# TENANT-CATALOG-MANAGEMENT-CONTINUITY-DESIGN-v1

> Authority note: This artifact remains a bounded historical/unit-level catalog lifecycle design
> for one tenant-owned continuity seam. It is not the canonical whole-family definition for
> cross-mode catalog/discovery/product-data ownership. Current family-definition authority now
> lives in `docs/product-truth/CATALOG-DISCOVERY-PRODUCT-DATA-CONTINUITY-FAMILY-DESIGN-v1.md`.

## Status

- Unit: `TENANT-CATALOG-MANAGEMENT-CONTINUITY`
- Phase: `DESIGN`
- State: `OPEN` / design defined
- Delivery posture: `ACTIVE_DELIVERY`
- Active-delivery impact: `TENANT-CATALOG-MANAGEMENT-CONTINUITY` remains the sole current product-facing `ACTIVE_DELIVERY`

## Mission

Define the bounded tenant catalog item lifecycle continuity remediation plan for
`TENANT-CATALOG-MANAGEMENT-CONTINUITY`.

This unit exists only to close the missing materially usable update/delete path across the tenant
product surface and tenant client-service layer where backend lifecycle support already exists in
repo truth.

This design is planning only. No implementation has started in this phase.

## Unit Type / Phase

`TENANT-CATALOG-MANAGEMENT-CONTINUITY` is one bounded tenant catalog lifecycle continuity unit.

It exists only to restore materially usable update/delete continuity on already surfaced
tenant-owned catalog flows. It does not authorize create/read redesign, search redesign,
merchandising redesign, storefront CTA continuity, B2C browse continuity, control-plane tenant
operations work, aggregator operating-mode work, or reopening any recently closed WL or
tenant-truth unit.

## Problem Statement

Current repo truth already contains tenant-scoped backend lifecycle support for catalog item
update and delete, including tenant/org scoping, OWNER/ADMIN role guards, audit writes, and the
best-effort vector enqueue follow-up path.

The remaining problem is that tenant-facing continuity stops short of that backend capability.
`services/catalogService.ts` currently exposes fetch, search, create, and RFQ operations only, and
the reviewed surfaced tenant catalog product paths in `App.tsx` remain materially create/read only
with no materially usable edit/delete loop on the tenant-owned catalog surfaces already rendering
catalog items.

This is therefore not a backend-missing-lifecycle problem. It is a bounded service/client and
surfaced-tenant-product continuity problem on top of an already evidenced backend/frontend
completeness asymmetry.

## Carry-Forward Truth / Neighboring-Unit Separation

The following truths are carried forward and must remain preserved:

- `TENANT-CATALOG-MANAGEMENT-CONTINUITY` is already lawfully `OPEN`.
- It remains the sole current product-facing `ACTIVE_DELIVERY`.
- The `-v2` planning stack remains the active product-truth sequencing basis.
- `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` remains separate and later-ready.
- `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` remains separate and later-ready.
- `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` remains design-gate only.
- `WL-BLUEPRINT-RUNTIME-RESIDUE-001`, `TENANT-TRUTH-CLEANUP-001`, and
  `WL-ADMIN-ENTRY-DISCOVERABILITY-001` remain closed and separate.
- Enterprise redesign remains closed / not justified.

This unit must stay centered on tenant catalog item lifecycle continuity only. It must not be
reframed as a broad commerce-completeness, marketplace, storefront, or control-plane program.

## Repo-Truth Findings

### 1) What exact tenant catalog lifecycle operations are already supported by backend repo truth?

`server/src/routes/tenant.ts` already exposes these tenant-scoped lifecycle operations:

- `GET /api/tenant/catalog/items` via existing read continuity already consumed by the frontend
- `POST /api/tenant/catalog/items` via existing create continuity already consumed by the frontend
- `PATCH /api/tenant/catalog/items/:id` for partial item updates
- `DELETE /api/tenant/catalog/items/:id` for item deletion

The reviewed `PATCH` and `DELETE` routes already include:

- tenant auth and database context middleware
- explicit tenant/org lookup scoping through `dbContext.orgId`
- OWNER/ADMIN role guards
- audit events `catalog.item.updated` and `catalog.item.deleted`
- best-effort vector reindex / deletion enqueue after commit

The backend support required for update/delete continuity is therefore already present in bounded
repo truth.

### 2) What exact tenant-facing service/client continuity is missing today?

`services/catalogService.ts` currently exposes:

- `getCatalogItems`
- `searchCatalog`
- `createCatalogItem`
- RFQ read/write helpers

It does not currently expose:

- a typed update catalog item client operation for `PATCH /api/tenant/catalog/items/:id`
- a typed delete catalog item client operation for `DELETE /api/tenant/catalog/items/:id`
- update/delete request and response shapes for the tenant catalog lifecycle loop

This missing client-service continuity is the first concrete implementation gap in front of the
already installed backend lifecycle support.

### 3) What exact surfaced tenant product path(s) are materially create/read only?

The reviewed tenant-facing catalog product loop in `App.tsx` is materially create/read only in the
bounded tenant catalog surfaces already rendering catalog items:

- tenant catalog bootstrap reads items through `getCatalogItems`
- inline add-item flow writes through `createCatalogItem`
- product-card rendering shows item details and downstream RFQ / add-to-cart continuity
- no materially usable item edit affordance is rendered in the reviewed tenant-owned catalog cards
- no materially usable item delete affordance is rendered in the reviewed tenant-owned catalog cards

The bounded problem is therefore the missing update/delete loop inside the already surfaced tenant
catalog management path, not the absence of catalog display itself.

### 4) What is the smallest lawful implementation shape that closes update/delete continuity without widening scope?

The smallest lawful implementation shape is:

1. add typed update/delete client operations to `services/catalogService.ts`
2. wire only the already surfaced tenant-owned catalog management path in `App.tsx` to use them
3. add only the minimum local UI state and affordances needed to edit or delete an existing item
   from that tenant-owned catalog loop
4. update local item state after successful mutation without redesigning browse/search/storefront
   behavior

This does not require backend redesign, search changes, merchandising changes, B2C CTA changes, or
control-plane work in the first pass.

### 5) Which files are truly in scope for implementation?

The truly in-scope implementation files are:

- `services/catalogService.ts`
- `App.tsx`

`server/src/routes/tenant.ts` is an evidence anchor and verification reference for existing backend
support, not a planned implementation surface in the bounded first pass.

### 6) Is any adjacent file strictly necessary beyond the initially reviewed surfaces?

No hidden neighboring implementation surface is strictly required beyond the initially reviewed
surfaces.

The adjacent tenant API wrapper was reviewed to confirm capability only. `services/tenantApiClient.ts`
already exposes `tenantPatch` and `tenantDelete`, so no wrapper expansion is pre-authorized by this
design. The bounded first pass should resist pulling in additional catalog UI components, shell
files, control-plane files, or backend files unless repo truth later proves a concrete blocking
need inside update/delete continuity itself.

### 7) What should be the first implementation entry?

The lawful first implementation entry is `services/catalogService.ts`.

Rationale:

- the root asymmetry starts at the missing tenant-facing client/service continuity
- the backend route contracts already exist
- UI wiring should not start before typed update/delete access exists in the tenant catalog service
- this keeps the first move narrow and prevents speculative UI drift

### 8) What later implementation slices, if any, should follow?

The later bounded slices should be:

- `App.tsx` mutation handlers and local state update/delete flow
- `App.tsx` bounded item-level edit affordance in tenant-owned catalog cards/forms
- `App.tsx` bounded item-level delete affordance with confirmation behavior appropriate to the
  existing surface style
- focused runtime verification and then governance sync

No later slice in this unit should widen into search, browse CTA continuity, storefront discovery,
control-plane operations, or broader catalog strategy.

### 9) What verification questions will prove the unit complete?

This unit is complete only when the following questions answer yes in bounded runtime proof:

1. Can an eligible tenant owner/admin update an existing catalog item from the surfaced tenant
   product path?
2. Can an eligible tenant owner/admin delete an existing catalog item from that same bounded path?
3. Does the frontend use the existing tenant backend lifecycle routes rather than a parallel path?
4. After update, does the surfaced tenant catalog view reflect the changed item truthfully without
   a broader page-model redesign?
5. After delete, is the deleted item removed from the surfaced tenant catalog view truthfully?
6. Do create/read/search/RFQ flows remain behaviorally intact after the bounded change?
7. Are B2C storefront continuity, search, and control-plane tenant operations unaffected?

## Exact Bounded Scope

This unit is bounded to tenant catalog item update/delete continuity only across the already
reviewed surfaces:

- `services/catalogService.ts` — tenant-facing catalog service continuity for update/delete
- `App.tsx` — the already surfaced tenant-owned catalog management path where create/read exists
- `server/src/routes/tenant.ts` — backend evidence anchor confirming update/delete lifecycle
  support already exists and should be consumed rather than redesigned

At design time, these surfaces map to three bounded concerns:

- service/client mutation continuity
- surfaced tenant product-loop mutation affordances
- post-mutation local state truthfulness

## Explicit Out Of Scope

- create-flow redesign
- read-flow redesign beyond the minimum local truth update required after update/delete
- search redesign
- browse/discovery redesign
- storefront CTA continuity
- B2C storefront continuity
- merchandising or catalog strategy redesign
- control-plane tenant operations reality
- aggregator operating-mode scope work
- backend/auth redesign
- schema, migration, Prisma, SQL, or RLS work
- shell redesign or white-label runtime work
- reopening `WL-BLUEPRINT-RUNTIME-RESIDUE-001`, `TENANT-TRUTH-CLEANUP-001`, or
  `WL-ADMIN-ENTRY-DISCOVERABILITY-001`
- enterprise redesign or any broad “commerce completeness” program
- implementation, tests, deployment, or verification execution in this design phase

## Design Intent / Remediation Shape

The intended remediation shape is the minimum lawful implementation required to make the existing
tenant catalog lifecycle truthful end to end on update/delete without changing the broader catalog
experience model.

At design level only, that means:

1. preserve the existing backend lifecycle contract rather than redesigning it
2. add missing tenant-facing service/client support for update/delete only
3. expose update/delete only on the already surfaced tenant-owned catalog management path
4. keep create/read/search/RFQ continuity structurally intact except where local state must update
   after mutation
5. keep B2C storefront continuity, browse CTAs, and control-plane surfaces untouched
6. preserve neighboring v2 candidate boundaries so this unit remains one bounded lifecycle repair

The minimum lawful implementation shape is therefore a narrow service-plus-surfaced-loop repair,
not a catalog-system redesign.

## Slice Plan

### Slice 1 — Tenant catalog service continuity

Add typed update/delete operations and associated request/response shapes to
`services/catalogService.ts` using the already installed tenant realm client path.

### Slice 2 — Bounded tenant product-loop mutation handlers

Add the minimum update/delete handlers in `App.tsx` for the already surfaced tenant-owned catalog
management loop, including local error/loading state only where required for mutation continuity.

### Slice 3 — Bounded item-level affordances

Expose one truthful edit path and one truthful delete path on the existing tenant-owned catalog
cards or neighboring bounded catalog management UI in `App.tsx` without redesigning the page,
shell, search, or storefront entry model.

### Slice 4 — Focused verification

Verify update and delete from the tenant-owned surfaced path, then verify that create/read/search/
RFQ continuity and neighboring non-scope surfaces remain sound.

### Slice 5 — Governance sync

If the bounded implementation and verification pass, synchronize governance/product-truth records
for this same unit only. No later-ready candidate should move as part of that sync.

## Verification Plan

The verification discipline for this unit is bounded tenant catalog lifecycle proof only.

Required verification questions:

1. Does the surfaced tenant catalog management path render a truthful edit affordance for existing
   items?
2. Does that path render a truthful delete affordance for existing items?
3. Does update hit the existing tenant `PATCH /api/tenant/catalog/items/:id` path successfully?
4. Does delete hit the existing tenant `DELETE /api/tenant/catalog/items/:id` path successfully?
5. After update, does the UI show the new item state without requiring unrelated browse/storefront
   changes?
6. After delete, is the UI state reconciled correctly without requiring a broader catalog reload
   redesign?
7. Do create/read/search/RFQ flows remain non-regressed?
8. Do B2C storefront continuity and control-plane tenant operations remain untouched?

Required smoke checks after implementation:

- tenant catalog list load
- inline add-item flow still works
- bounded item update flow works
- bounded item delete flow works
- existing RFQ entry on surviving items still works
- existing search/list retrieval still works
- no new dependency on control-plane or storefront paths appears

Carry-forward rule:

- `implement -> commit -> verify -> governance sync -> close`

## Risks / Drift Controls

- Do not widen this unit into search, browse, or merchandising redesign.
- Do not widen this unit into B2C storefront CTA continuity.
- Do not widen this unit into control-plane tenant operations reality.
- Do not treat missing update/delete continuity as license to redesign catalog card layout broadly.
- Do not modify backend routes unless implementation proves a concrete contract defect inside the
  bounded update/delete path.
- Do not pull in shell files, white-label files, or adjacent tenant files unless a concrete
  blocking dependency appears.
- Do not absorb or reopen the recently closed WL / tenant-truth units.
- Do not change the fact that `TENANT-CATALOG-MANAGEMENT-CONTINUITY` is the sole current
  `ACTIVE_DELIVERY`.

## Lawful Next Implementation Entry

The lawful first implementation entry file is `services/catalogService.ts`.

Rationale:

- it is the narrowest root-cause surface for the missing update/delete continuity
- it already owns tenant-facing catalog lifecycle access patterns
- the backend lifecycle contract is already present and should be consumed, not redesigned
- it enables later bounded UI wiring in `App.tsx` without pre-emptive page redesign

If the bounded implementation later proves that an additional surface must change, the next lawful
secondary file is `App.tsx` for the already surfaced tenant-owned catalog management path only.

No additional hidden neighboring surface is pre-authorized by this design.

## Completion Note

This design defines one bounded tenant catalog lifecycle continuity remediation path for
`TENANT-CATALOG-MANAGEMENT-CONTINUITY`.

The unit remains `OPEN` and remains the sole current product-facing `ACTIVE_DELIVERY`. No
implementation has started. No runtime code, backend code, schema work, search/storefront work,
control-plane work, or broader product redesign is authorized by this design artifact.