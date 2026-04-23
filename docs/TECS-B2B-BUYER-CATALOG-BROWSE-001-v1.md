# TECS-B2B-BUYER-CATALOG-BROWSE-001 — Implementation Artifact

**Version:** v1
**Status:** IMPLEMENTED
**Date:** 2026-06-15
**Authorized by:** `governance/decisions/PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001.md`
**Commit:** TBD (this document is part of the implementation commit)

---

## 1. Unit Identity

| Field | Value |
|---|---|
| TECS ID | `TECS-B2B-BUYER-CATALOG-BROWSE-001` |
| Phase | Phase 1 — Authenticated B2B Buyer Catalog Browse |
| Scope | Backend route, OpenAPI contract, runtime manifest, frontend service, App.tsx surface |
| Governance doc | `PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001.md` |
| Prior investigation | `docs/TEXQTIC-B2B-BUYER-CATALOG-DISCOVERY-INVESTIGATION-v1.md` |

---

## 2. Objective

Implement the first authorized unit of Authenticated B2B Buyer Catalog Discovery:
an authenticated B2B tenant can browse active catalog items of a publication-eligible
supplier org and initiate an RFQ for any item.

---

## 3. Repo-Truth Baseline (`CONFIRMED REPO TRUTH`)

The following were verified in the codebase before implementation:

| Area | Finding |
|---|---|
| `CatalogItem` Prisma model | Fields confirmed: `id, tenantId, name, sku, description, price, active, moq, imageUrl, publicationPosture, createdAt, updatedAt` |
| `organizations` model | `publication_posture VARCHAR(30)` field confirmed; values `'PRIVATE_OR_AUTH_ONLY'`, `'B2B_PUBLIC'`, `'B2C_PUBLIC'`, `'BOTH'` |
| `Tenant` model | `publicEligibilityPosture` enum field confirmed; value `'PUBLICATION_ELIGIBLE'` is the gate |
| `organizations` RLS | Requires `withOrgAdminContext` (admin realm); confirmed from `publicB2BProjection.service.ts` and `database-context.ts` |
| `texqtic_rfq_read` role | Cross-tenant read using `SET LOCAL ROLE texqtic_rfq_read` inside `prisma.$transaction`; proven by `resolveRfqCatalogItemTarget()` in `tenant.ts` |
| `withOrgAdminContext` | Exported from `server/src/lib/database-context.ts`; sets `realm: 'admin'`, `app.is_admin = 'true'` |
| `B2B_WORKSPACE` capabilities | `sellerCatalog: true`, `rfq: true`; `buyerCatalog` was `false` pre-unit |
| `b2b_workspace` manifest | `catalog_browse` group had one route: `'catalog'`; `'buyer_catalog'` was absent |
| `services/catalogService.ts` | Full file read; `getBuyerCatalogItems` was absent; `BuyerCatalogItem` was absent |
| `App.tsx` | B2B workspace render path at `case 'catalog':` confirmed; `buyer_catalog` case absent; existing RFQ dialog confirmed reusable |
| `RuntimeLocalRouteKey` | `'buyer_catalog'` was absent from the union type |

---

## 4. Files Changed (`IMPLEMENTED IN THIS UNIT`)

| File | Change |
|---|---|
| `server/src/routes/tenant.ts` | Added `withOrgAdminContext` to import; added `GET /api/tenant/catalog/supplier/:supplierOrgId/items` route |
| `shared/contracts/openapi.tenant.json` | Added `/api/tenant/catalog/supplier/{supplierOrgId}/items` GET path with full schema |
| `runtime/sessionRuntimeDescriptor.ts` | Added `'buyer_catalog'` to `RuntimeLocalRouteKey` union; enabled `buyerCatalog: true` for `B2B_WORKSPACE` in `buildRuntimeCapabilities`; added `buyer_catalog` route to b2b_workspace `catalog_browse` group |
| `services/catalogService.ts` | Added `BuyerCatalogItem`, `BuyerCatalogResponse`, `BuyerCatalogQueryParams` interfaces; added `getBuyerCatalogItems()` function |
| `App.tsx` | Added `getBuyerCatalogItems`, `BuyerCatalogItem` to catalogService imports; added buyer catalog state variables; added `handleFetchBuyerCatalog` handler; added `case 'buyer_catalog':` render; added "Browse Suppliers" nav button in B2B workspace header |
| `docs/TECS-B2B-BUYER-CATALOG-BROWSE-001-v1.md` | This artifact |

---

## 5. Backend Route Detail

### Route
`GET /api/tenant/catalog/supplier/:supplierOrgId/items`

### Auth
`tenantAuthMiddleware` + `databaseContextMiddleware` — authenticated tenant session required.

### Gate 1 — Org Eligibility
- Uses `withOrgAdminContext` (admin realm) to read `organizations.publication_posture` AND `tenant.publicEligibilityPosture` for the `supplierOrgId` in a single admin-context transaction.
- Passes if: `publication_posture IN ('B2B_PUBLIC', 'BOTH')` AND `publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'`.
- Returns consistent HTTP 404 if org is absent OR either gate fails. No gate detail is exposed in the error response.

### Gate 2 — Item Visibility (Phase 1)
- Uses `prisma.$transaction` with `SET LOCAL ROLE texqtic_rfq_read` — the proven cross-tenant read pattern.
- Reads `catalog_items WHERE tenantId = supplierOrgId AND active = true`.
- No per-item `publicationPosture` filter in Phase 1 (authorized by §7 of the product decision).

### Pagination
- Cursor-based: `limit` (1–100, default 20), `cursor` (UUID, optional).
- Response: `{ items: BuyerCatalogItem[], count: number, nextCursor: string | null }`.

### Response Fields (`VERIFIED` — NO price in Phase 1)
`id`, `name`, `sku`, `description`, `moq`, `imageUrl` — `price` is explicitly excluded.

---

## 6. Security Properties

| Concern | Disposition |
|---|---|
| Unauthenticated access | Blocked by `tenantAuthMiddleware` → HTTP 401 |
| Non-eligible supplier discovery | Consistent HTTP 404; no gate detail exposed |
| Price exposure | `price` field excluded from Prisma `select` clause |
| Cross-tenant catalog reads | `texqtic_rfq_read` role — bounded, proven pattern |
| SQL injection | Zod UUID validation on `supplierOrgId`, `cursor`; no raw string interpolation |
| Tenant isolation (caller) | Buyer org ID flows from `request.dbContext` (middleware-injected); never derived from request body |

---

## 7. Frontend Surface

### Navigation
"Browse Suppliers" button added to the B2B workspace header bar.
Calls `navigateTenantManifestRoute('buyer_catalog')`.

### View (`buyer_catalog` route key)
- Supplier Org ID input field (UUID format)
- "Browse" submit button → calls `handleFetchBuyerCatalog(supplierOrgId)`
- Item grid: name, SKU, description, MOQ, image — NO price
- "Request Quote" per card → adapts `BuyerCatalogItem` to `CatalogItem` shape; opens existing `rfqDialog` with `catalogItemId` pre-populated
- Cursor-based "Load More" pagination
- Loading and error states

### RFQ Integration
Reuses the existing `handleOpenRfqDialog` / `handleSubmitRfq` path without modification.
`BuyerCatalogItem` is adapted to a synthetic `CatalogItem` with `price: 0` (not displayed).
The RFQ payload uses `catalogItemId` only — price is not sent.

---

## 8. Explicit Exclusions (`OUT OF SCOPE` — Phase 1)

- `price` field in any response, state, or UI element
- Per-item `publicationPosture` filtering (Phase 2 prerequisite)
- Supplier picker or search surface
- Item detail page
- `publicationPosture` mutation endpoints
- Buyer–supplier allowlisting
- Public B2B Discovery changes (no changes to `publicB2BProjection.service.ts`)
- WL / B2C surface changes
- Cart, orders, or settlement surface changes
- Schema changes to `prisma/schema.prisma`
- Any `prisma migrate` command

---

## 9. Follow-On Units (`FOLLOW-ON UNIT`)

| Unit | Description |
|---|---|
| Phase 2 gate | Per-item `publicationPosture` filtering (`B2B_PUBLIC`, `BOTH`) |
| Supplier picker | Discovery/search surface for finding eligible supplier orgs |
| Item detail page | Dedicated supplier item view with full safe payload |
| Price visibility | Negotiate/reveal price after RFQ response (requires explicit product decision) |
| Buyer–supplier allowlisting | Restrict buyer browse to pre-approved supplier relationships |

---

## 10. Static Gate Baseline (`VERIFIED`)

Pre-existing static gate baseline (before this unit):
- `pnpm -C server run typecheck`: 6 pre-existing errors
- `pnpm -C server run lint`: 11 problems (5 errors, 6 warnings)

Post-unit static gates must show no new errors or warnings beyond this baseline.

---

*End of TECS-B2B-BUYER-CATALOG-BROWSE-001-v1.md*
