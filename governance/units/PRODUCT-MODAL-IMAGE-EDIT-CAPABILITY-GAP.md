---
unit_id: PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP
title: Shared catalog edit modal image update gap
type: ACTIVE_DELIVERY
status: OPEN
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: TENANT
opened: 2026-03-31
closed: null
verified: null
commit: null
evidence: "OPENING_CONFIRMATION: current Layer 0 had no open product-facing ACTIVE_DELIVERY and NEXT-ACTION was OPERATOR_DECISION_REQUIRED before this opening · REPO_TRUTH_CONFIRMATION: App.tsx exposes shared catalog Edit actions on enterprise catalog cards and WL_ADMIN Products, but the shared edit modal and submit handler only carry name, price, and sku · CLIENT_CONTRACT_CONFIRMATION: services/catalogService.ts UpdateCatalogItemRequest omits imageUrl · SERVER_CONTRACT_CONFIRMATION: server/src/routes/tenant.ts PATCH /tenant/catalog/items/:id omits imageUrl from the update schema and persistence path · NARROWING_CONFIRMATION: components/WL/WLProductDetailPage.tsx is a shopper detail surface with no edit affordance, so the truthful bounded defect is the shared edit-modal image update gap, not a broad WL admin parity failure"
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

Current repo truth confirms that the shared `Edit` affordance already exists on enterprise catalog
cards and on the `WL_ADMIN` `PRODUCTS` surface, but the current modal and update path cannot edit
or persist `imageUrl`.

## Source Truth

Current repo truth preserves exactly one bounded openable candidate here:

- `App.tsx` shared catalog mutation actions render `Edit` on enterprise catalog cards and on
  `WL_ADMIN` `PRODUCTS`
- the shared edit modal in `App.tsx` exposes `Name`, `Price`, and `SKU` only
- `services/catalogService.ts` `UpdateCatalogItemRequest` does not include `imageUrl`
- `server/src/routes/tenant.ts` PATCH `/tenant/catalog/items/:id` does not accept or persist
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

- [ ] The shared edit modal in `App.tsx` is inspected and updated only as needed for image editing
- [ ] The minimum directly coupled client update contract accepts bounded `imageUrl` edits
- [ ] The minimum directly coupled tenant PATCH route accepts and persists bounded `imageUrl`
      updates
- [ ] Enterprise catalog edit surfaces and `WL_ADMIN` Products edit surfaces both retain existing
      edit behavior while gaining bounded image update capability
- [ ] WL storefront shopper detail remains non-editable and unchanged in role boundary
- [ ] No broader catalog, shell, modal-system, role, auth, DB/schema, or media-platform redesign is
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

## Governance Posture After Opening

Resulting governance posture after this opening:

- one product-facing `ACTIVE_DELIVERY` unit is now `OPEN`
- that unit is `PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP`
- previously closed catalog/image units remain closed and unchanged in scope
- no implementation has been executed yet
- the next canonical phase is later bounded implementation for this unit only