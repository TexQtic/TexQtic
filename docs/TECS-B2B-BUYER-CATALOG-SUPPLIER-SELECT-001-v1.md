# TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001 — Implementation Artifact v1

**Unit:** TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001  
**Phase:** 2 — Supplier Selection Surface  
**Parent decision:** PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001  
**Depends on:** TECS-B2B-BUYER-CATALOG-BROWSE-001 (Phase 1 — VERIFIED)  
**Status:** IMPLEMENTED  
**Commit:** pending

---

## 1. What supplier discovery source was used?

**CONFIRMED REPO TRUTH** — `GET /api/public/b2b/suppliers` (the existing public B2B projection endpoint) explicitly prohibits org UUIDs in its response payload by design (Gate E of `publicB2BProjection.service.ts`: "org UUIDs" listed under prohibited fields). This applies even when the caller is authenticated — the endpoint is unconditionally org-UUID-free.

**IMPLEMENTED IN THIS UNIT** — A new authenticated endpoint `GET /api/tenant/b2b/eligible-suppliers` was added to `server/src/routes/tenant.ts`. It applies the same two eligibility gates as the Phase 1 catalog browse route but returns `id` (org UUID) since the caller is authenticated. This is the minimal necessary addition — it does not introduce a new service file; the query logic is inlined in the route handler.

---

## 2. Was existing public supplier discovery truth reused, wrapped, or mirrored?

**CONFIRMED REPO TRUTH** — The public projection service (`publicB2BProjection.service.ts`) defines and enforces the five safety gates. Gate A and Gate B govern publication eligibility and are the canonical eligibility definition for both public and authenticated supplier listing.

**IMPLEMENTED IN THIS UNIT** — The new authenticated route replicates Gate A (`organizations.publication_posture IN ('B2B_PUBLIC','BOTH')` AND `org_type='B2B'` AND `status IN ('ACTIVE','VERIFICATION_APPROVED')`) and Gate B (`tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'`) from the public projection, adding only `id` to the response. No new DB access pattern — uses `withOrgAdminContext` (identical to Phase 1 catalog browse gate). No mirror, no cache, no second projection concept. Supplier eligibility truth remains singular.

---

## 3. What route key / navigation path was added for supplier selection?

**CONFIRMED REPO TRUTH** — `buyer_catalog` route key already existed in `runtime/sessionRuntimeDescriptor.ts` for the B2B workspace (Phase 1). The "Browse Suppliers" nav button already navigated to `buyer_catalog`.

**IMPLEMENTED IN THIS UNIT** — No new route key was added to the runtime descriptor. The existing `buyer_catalog` route was converted to a two-phase view:
- **Phase A (Supplier Picker):** Displayed when `buyerCatalogSupplierOrgId` is empty. Shows the eligible supplier grid with "Browse Catalog" per card.
- **Phase B (Item Grid):** Displayed once a supplier is selected. Shows the item grid (Phase 1 behavior), with "← All Suppliers" button returning to Phase A.

The "Browse Suppliers" nav button was updated to also call `handleLoadSupplierPicker()` on click, which fetches the supplier list and resets catalog state.

---

## 4. How does supplier selection enter the existing buyer catalog browse surface?

**IMPLEMENTED IN THIS UNIT** — Selecting a supplier card (clicking "Browse Catalog") executes two state mutations:
1. `setBuyerCatalogSupplierOrgId(supplier.id)` — sets the supplier UUID that Phase 1 uses as its browse key.
2. `void handleFetchBuyerCatalog(supplier.id)` — triggers the existing Phase 1 catalog item fetch without modification.

Phase 1's `handleFetchBuyerCatalog`, `getBuyerCatalogItems`, and `GET /api/tenant/catalog/supplier/:supplierOrgId/items` are entirely unchanged. Supplier selection is a new entry point that feeds the existing browse surface. No behavior change to Phase 1.

---

## 5. Did this unit change buyer catalog browse semantics?

**VERIFIED** — No. The Phase 1 route (`GET /api/tenant/catalog/supplier/:supplierOrgId/items`), its gate logic, its pagination, its RFQ bridge, and `handleFetchBuyerCatalog` are unchanged. The only change to the `buyer_catalog` case in `App.tsx` is the addition of Phase A (supplier picker) as the initial state, with Phase B (item grid) unchanged. The `"← All Suppliers"` button replaces the old `"Back"` button (which navigated to `navigateTenantDefaultManifestRoute()`).

---

## 6. Did this unit add price, item detail, or search?

**VERIFIED** — No.

- **Price:** Not added anywhere. The `GET /api/tenant/b2b/eligible-suppliers` response contains `{ id, slug, legalName, primarySegment }` only. Item-level response continues to omit price (Phase 1 contract unchanged).
- **Item detail page:** Not added. No routing to individual item views.
- **Search / filtering:** Not added in this unit. The supplier picker lists all eligible suppliers (bounded by the global eligibility gate). Text search on supplier name is deferred.

---

## 7. Did this unit introduce any new backend route?

**IMPLEMENTED IN THIS UNIT** — Yes, one minimal authenticated route: `GET /api/tenant/b2b/eligible-suppliers` in `server/src/routes/tenant.ts`. This route was required because:
- The public endpoint explicitly excludes org UUIDs (Gate E — prohibited fields), so it cannot serve as the selector source.
- The buyer catalog browse (Phase 1) requires the supplier's `org_id` (UUID) to fetch their catalog.
- There is no other path from eligible supplier name/slug to org UUID available to an authenticated buyer.

The route is narrowly scoped: auth-only, eligibility-gated, no price, no item details, no negotiation state. It is registered in the OpenAPI tenant contract (`shared/contracts/openapi.tenant.json`) under `GET /api/tenant/b2b/eligible-suppliers`.

---

## 8. What remains explicitly deferred after this unit?

**OUT OF SCOPE** from this unit (per PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001):

| Deferred Item | Phase |
|---|---|
| Full-text supplier name search in the picker | Phase 3+ |
| Segment / geo filter on supplier picker | Phase 3+ |
| Item-level search within a supplier's catalog | Phase 3+ |
| Item detail page | Phase 3+ |
| Price disclosure to buyer | Phase 4+ (gated on commercial decision) |
| Buyer-supplier explicit allowlist (`org_allowlist` RLS table) | Phase 6 |
| Supplier slug-based URL navigation | Phase 3+ |
| Certification / traceability badges in supplier picker cards | Phase 3+ |
| Offering preview items in supplier picker cards | Phase 3+ |

---

## Static Gate Results

| Gate | Command | Result |
|---|---|---|
| Server typecheck | `pnpm -C server run typecheck` | 6 errors — all pre-existing (lines 190-191, tenantProvision files) |
| Frontend typecheck | `npx tsc --noEmit` | 0 errors |
| Server lint | `pnpm -C server run lint` | 0 errors, 164 warnings — all pre-existing |

---

## Files Changed

| File | Change |
|---|---|
| `server/src/routes/tenant.ts` | Added `GET /api/tenant/b2b/eligible-suppliers` route with `SupplierPickerOrgRow` type |
| `services/catalogService.ts` | Added `SupplierPickerEntry`, `EligibleSuppliersResponse`, `getEligibleSuppliers()` |
| `App.tsx` | Added `getEligibleSuppliers`/`SupplierPickerEntry` imports; added 3 state vars; added `handleLoadSupplierPicker`; updated "Browse Suppliers" nav button; replaced `buyer_catalog` case with two-phase render |
| `shared/contracts/openapi.tenant.json` | Added `GET /api/tenant/b2b/eligible-suppliers` path |
| `docs/TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001-v1.md` | This file |

**Not changed:** `runtime/sessionRuntimeDescriptor.ts` (no new route key needed), `services/publicB2BService.ts` (public surface unchanged), `server/src/services/publicB2BProjection.service.ts` (public projection unchanged).
