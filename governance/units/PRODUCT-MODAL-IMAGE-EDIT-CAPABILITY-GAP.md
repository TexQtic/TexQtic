---
unit_id: PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP
title: Shared catalog edit modal image update gap
type: ACTIVE_DELIVERY
status: CLOSED
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: TENANT
opened: 2026-03-31
closed: 2026-03-31
verified: 2026-03-31
commit: "996a712"
evidence: "OPENING_CONFIRMATION: current Layer 0 had no open product-facing ACTIVE_DELIVERY and NEXT-ACTION was OPERATOR_DECISION_REQUIRED before this opening · IMPLEMENTATION_COMMIT: 996a712 fix(catalog): enable image url editing in shared product modal touched only App.tsx, services/catalogService.ts, and server/src/routes/tenant.ts · REPO_TRUTH_CONFIRMATION: App.tsx shared edit state now includes imageUrl, the shared modal now exposes Image URL, the save path now sends imageUrl, services/catalogService.ts UpdateCatalogItemRequest now includes imageUrl, and server/src/routes/tenant.ts PATCH /tenant/catalog/items/:id now accepts and persists imageUrl · LOCAL_VALIDATION_CONFIRMATION: typecheck passed and tenant-catalog-items.rls.integration.test.ts passed 10/10 · PRODUCTION_VERIFICATION_CONFIRMATION: texqtic.com enterprise and WL_ADMIN edit flows both saved and re-opened with persisted imageUrl truthfully, storefront reflected persisted WL update while remaining non-editable, and required neighbor smoke checks passed"
doctrine_constraints:
  - D-004: this is one bounded ACTIVE_DELIVERY unit only; it must not be merged with WL storefront shopper-surface edits, broader catalog-management redesign, media-platform redesign, or governance-system work
  - D-007: no product/server/schema/migration/test/package/CI/hook surface outside the exact future implementation allowlist is authorized
  - D-011: this unit is now the sole authorized next ACTIVE_DELIVERY and prior catalog/image/rfq units remain closed and separate
  - D-013: this opening authorizes implementation sequencing only and does not itself satisfy implementation, verification, governance sync, or close
decisions_required:
  - GOV-DEC-PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP-OPENING: DECIDED (2026-03-31, Paresh)
blockers: []
---

## Unit Summary

`PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP` is one bounded `ACTIVE_DELIVERY` unit.

It exists only to remediate the shared catalog edit-modal image update gap on already-exposed
product-management surfaces.

Result: `CLOSED`.

Current repo and governance truth now confirm that the bounded shared edit path supports image URL
editing and persistence on the already-exposed enterprise and `WL_ADMIN` product-management
surfaces, with required live verification completed and no active bounded defect remaining inside
this unit.

## Source Truth

Current repo truth now records the bounded implemented outcome here:

- `App.tsx` shared catalog mutation actions render `Edit` on enterprise catalog cards and on
  `WL_ADMIN` `PRODUCTS`
- the shared edit modal in `App.tsx` now exposes `Image URL` alongside the existing editable fields
- `services/catalogService.ts` `UpdateCatalogItemRequest` now includes `imageUrl`
- `server/src/routes/tenant.ts` PATCH `/tenant/catalog/items/:id` now accepts and persists
  `imageUrl`
- `components/WL/WLProductDetailPage.tsx` remains a shopper detail surface with no edit affordance

This exact candidate is separate from all of the following:

1. `TENANT-CATALOG-IMAGE-UPLOAD-GAP-001` and `TENANT-CATALOG-IMAGE-UPLOAD-GAP-002`, which were
   bounded to add-item image capability only
2. `TENANT-CATALOG-MANAGEMENT-CONTINUITY`, which closed on bounded update/delete continuity and
   recorded `WL Products` as non-regressed
3. WL storefront image rendering work, which is display-only and already closed
4. WL storefront shopper-surface edit exposure, role redesign, or broader enterprise-vs-WL parity
   redesign

## Acceptance Criteria

- [x] The shared edit modal in `App.tsx` is inspected and updated only as needed for image editing
- [x] The minimum directly coupled client update contract accepts bounded `imageUrl` edits
- [x] The minimum directly coupled tenant PATCH route accepts and persists bounded `imageUrl`
      updates
- [x] Enterprise catalog edit surfaces and `WL_ADMIN` Products edit surfaces both retain existing
      edit behavior while gaining bounded image update capability
- [x] WL storefront shopper detail remains non-editable and unchanged in role boundary
- [x] No broader catalog, shell, modal-system, role, auth, DB/schema, or media-platform redesign is
      introduced

## Files Allowlisted (Modify)

This decision/opening authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/GOV-DEC-PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP-OPENING.md`
- `governance/units/PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP.md`

All future implementation must use exact repo-relative allowlists only.

## Exact In-Scope Boundary

This unit authorizes only the following bounded work:

1. inspect and update the existing shared catalog edit modal in `App.tsx`
2. add the minimum directly coupled `imageUrl` update path through the existing client/service and
   tenant PATCH contract
3. validate the already-exposed enterprise and `WL_ADMIN` edit surfaces that reuse this shared
   modal
4. perform required neighbor smoke checks on adjacent catalog-management surfaces touched by the
   shared edit path

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- adding edit affordances to WL storefront shopper surfaces
- add-item image URL parity or create-flow redesign
- file upload, asset storage, CDN, or broader image/media-platform work
- category, description, MOQ, active-state, or broader product-management redesign beyond what is
  strictly necessary for the bounded image update path
- auth, role, shell, modal-system, routing, DB/schema, or governance-system redesign

## Drift Guard

Implementation under this unit must remain as narrow as possible.

Do not widen this unit into:

- broad enterprise-vs-WL parity work
- WL shopper/admin role-boundary redesign
- shared shell or modal-system cleanup
- add-item form parity cleanup
- broader catalog CRUD refactor

If exact repo truth during implementation proves DB/schema/migration/Prisma work is strictly
necessary, implementation must halt and report blocker rather than widen scope.

## Exact Verification Profile

- verification type: product-management runtime capability correction on existing tenant-facing edit
  surfaces
- required verification modes:
  - bounded local implementation verification
  - Vercel verification mandatory before any future closure because this is a frontend/product UX
    runtime change
  - neighbor-path smoke checks mandatory because the change touches a shared catalog modal/edit path
- required smoke-check neighbors:
  - enterprise B2B catalog card edit flow
  - `WL_ADMIN` Products edit flow
  - existing create/add-item flow remains non-regressed
  - existing delete flow remains non-regressed
  - WL storefront shopper detail remains non-editable and unchanged

## Implementation Record

- implementation commit: `996a712`
- message: `fix(catalog): enable image url editing in shared product modal`
- bounded runtime files touched:
  - `App.tsx`
  - `services/catalogService.ts`
  - `server/src/routes/tenant.ts`
- exact bounded implementation result:
  - shared edit state includes `imageUrl`
  - shared edit modal exposes `Image URL`
  - edit submit path sends `imageUrl`
  - tenant PATCH route accepts and persists `imageUrl`

## Verification Record

- local validation:
  - `npm run typecheck` passed
  - `server/src/__tests__/tenant-catalog-items.rls.integration.test.ts` passed `10/10`
- live production verification on `https://www.texqtic.com/`:
  - enterprise product edit flow passed
  - `WL_ADMIN` product edit flow passed
  - WL storefront reflected the persisted WL update truthfully while remaining non-editable
- required neighbor smoke checks passed:
  - create/add-item open/cancel remains non-regressed
  - delete confirm guard remains non-regressed
  - enterprise modal open/close remains healthy
  - `WL_ADMIN` modal open/close remains healthy
  - WL storefront shopper detail remains non-editable
  - no shared shell/runtime regression observed in the exercised paths

## Close Record

- close date: `2026-03-31`
- resulting status: `CLOSED`
- close basis:
  - repo truth matches the bounded implementation claim
  - implementation commit stayed within the declared bounded file scope
  - required local validation exists
  - required live Vercel verification exists
  - required neighbor-path smoke checks exist
  - no unresolved contradiction or adjacent defect blocks closure for this unit

## Governance Posture After Close

Resulting governance posture after this close:

- no product-facing `ACTIVE_DELIVERY` unit remains `OPEN`
- previously closed catalog/image units remain closed and unchanged in scope
- this unit no longer authorizes further implementation by implication
- any future product opening again requires a fresh bounded governance decision