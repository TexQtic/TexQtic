# GOV-DEC-PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP-OPENING

Decision ID: GOV-DEC-PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP-OPENING
Title: Decide and open one bounded ACTIVE_DELIVERY unit for the shared catalog edit-modal image update gap
Status: DECIDED
Date: 2026-03-31
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- no `ACTIVE_DELIVERY` unit is currently `OPEN`
- recently closed units, including `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` and
  `TENANT-CATALOG-MANAGEMENT-CONTINUITY`, remain closed and must stay separate

Current repo truth for the newly surfaced product-modal issue is narrower than the original parity
framing:

- `App.tsx` renders shared catalog mutation actions with `Edit` on enterprise catalog cards and on
  the `WL_ADMIN` `PRODUCTS` surface
- the shared edit state, modal, and submit handler in `App.tsx` expose only `name`, `price`, and
  `sku`
- `services/catalogService.ts` `UpdateCatalogItemRequest` omits `imageUrl`
- `server/src/routes/tenant.ts` PATCH `/tenant/catalog/items/:id` omits `imageUrl` from the update
  schema and persistence path
- `components/WL/WLProductDetailPage.tsx` is a shopper detail surface with no edit affordance, and
  `WL_ADMIN` access is separately gated in `App.tsx` via `canAccessWlAdmin(...)`

This means the truthful current candidate is not a broad enterprise-vs-WL edit-parity unit. The
truthful bounded defect is the shared catalog edit-modal image update gap only.

## Problem Statement

Layer 0 currently has no compelled successor `ACTIVE_DELIVERY` unit.

Without one fresh bounded opening now, TexQtic would either remain stalled at
`OPERATOR_DECISION_REQUIRED` despite a concrete product-facing defect, or risk opening an
over-broad parity unit that mixes shared admin edit behavior with the intentionally non-editable WL
shopper detail surface.

The smallest truthful next move is therefore one separate bounded decision and opening for the
shared catalog edit-modal image update gap only.

## Required Determinations

### 1. Is there one exact surviving product-facing candidate now clean enough to open?

Yes.

The exact bounded candidate is the shared catalog edit modal in `App.tsx` and its directly coupled
update contract, which currently cannot update `imageUrl` even though image display and image
creation paths already exist.

### 2. Is the original `PRODUCT-MODAL-EDIT-CAPABILITY-PARITY` framing exact enough to open as-is?

No.

Repo truth disproves the broad parity framing because `WL_ADMIN` Products already reuses the same
shared `Edit` action row, while the WL storefront detail page is a separate shopper surface with no
admin edit responsibility.

### 3. Is there a narrower next lawful `ACTIVE_DELIVERY` unit?

Yes.

The next lawful unit is `PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP`.

### 4. Does opening this unit reopen earlier image-capability or catalog-management units?

No.

This opening does not reopen `TENANT-CATALOG-IMAGE-UPLOAD-GAP-001`,
`TENANT-CATALOG-IMAGE-UPLOAD-GAP-002`, `TENANT-CATALOG-MANAGEMENT-CONTINUITY`, or any WL image
rendering closure. Those units remain bounded to add-item image capability, update/delete
continuity, and storefront image rendering respectively.

### 5. What exact scope is now authorized?

Exactly one bounded `ACTIVE_DELIVERY` unit:

- unit id: `PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP`
- title: `Shared catalog edit modal image update gap`
- type: `ACTIVE_DELIVERY`
- status: `OPEN`
- delivery class: `ACTIVE_DELIVERY`

## Decision

`GOV-DEC-PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP-OPENING` is now `DECIDED`.

The authoritative decision is:

1. TexQtic authorizes one separate bounded `ACTIVE_DELIVERY` unit to remediate the shared catalog
   edit-modal image update gap only
2. this is now the sole authorized next product-facing `ACTIVE_DELIVERY` unit
3. this decision explicitly narrows away the broader `PRODUCT-MODAL-EDIT-CAPABILITY-PARITY`
   framing because the real defect is image-update absence on the shared edit path, not a general
   WL admin parity failure
4. this decision does not authorize WL storefront shopper-surface edit affordances, role-model
   redesign, add-item parity work, file upload/storage work, or broader catalog-management redesign
5. all future implementation must stay as narrow as possible and use exact repo-relative
   allowlists only

## Opening

The following unit is now opened:

- `PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP`
- Title: `Shared catalog edit modal image update gap`
- Type: `ACTIVE_DELIVERY`
- Status: `OPEN`
- Delivery Class: `ACTIVE_DELIVERY`

Reason:

- it is a user-visible product-management defect on already-exposed edit surfaces
- it is exact, bounded, and implementation-worthy
- it preserves closure of prior units and avoids conflating WL storefront shopper behavior with WL
  admin product-management behavior

## Exact Future Implementation Boundary

This opening authorizes only the following bounded work:

1. inspect and remediate the existing shared catalog edit modal in `App.tsx`
2. add the minimum directly coupled `imageUrl` edit/update path through the existing catalog update
   client/server contract
3. validate the already-exposed enterprise and `WL_ADMIN` edit surfaces that use the shared modal
4. preserve the existing non-editable WL storefront shopper detail surface as out of scope

## Exact Out-of-Scope Boundary

This opening explicitly forbids:

- broad enterprise-vs-WL parity redesign
- adding edit affordances to `components/WL/WLProductDetailPage.tsx` or other shopper surfaces
- add-item image URL parity follow-up
- file upload, asset storage, CDN, or media-platform redesign
- auth, role, RLS, routing, shell, or modal-system redesign
- DB/schema changes unless exact repo truth during implementation proves one is strictly necessary,
  in which case implementation must halt and report blocker rather than widen scope

## Sequence Discipline

The required sequence remains:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

This record completes the decision and opening only.