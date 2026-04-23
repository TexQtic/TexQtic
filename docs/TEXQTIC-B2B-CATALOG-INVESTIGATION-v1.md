# TexQtic B2B Catalog Sub-Family — Investigation v1

**Document class:** Governance investigation artifact  
**Scope:** B2B Catalog sub-family — full stack, schema-to-frontend  
**Posture at investigation time:** `HOLD-FOR-BOUNDARY-TIGHTENING` / `ZERO_OPEN_DECISION_CONTROL` / D-016 active  
**Date:** 2026-06-16  
**Commit base:** Latest main (post MODE-COMPLETENESS-B2C-STOREFRONT-CATALOG-MUTATION-AFFORDANCE-SEPARATION-001 close)  

---

## 1. Investigation Purpose

This document records the repo-truth state of the B2B Catalog sub-family as of the investigation date. It covers the full stack: Prisma schema, backend routes, service layer, frontend state machine, runtime manifest, governance units, test coverage, and OpenAPI contract alignment. It does not authorize any implementation, schema change, or migration.

---

## 2. Scope Boundary

**In scope:**
- `server/prisma/schema.prisma` — CatalogItem model
- `server/src/routes/tenant.ts` — catalog CRUD routes
- `services/catalogService.ts` — frontend service types and functions
- `App.tsx` — catalog state machine, handlers, and render surfaces
- `runtime/sessionRuntimeDescriptor.ts` — B2B workspace route manifest
- `shared/contracts/openapi.tenant.json` — catalog endpoint documentation
- `governance/units/TENANT-CATALOG-*` and `MODE-COMPLETENESS-*` units
- `tests/` and `server/tests/` — catalog test coverage audit
- `B2BTenantTaxonomyPanel` — taxonomy display component

**Out of scope:** WL Admin catalog surface, B2C storefront catalog, public B2B/B2C projection routes, cart/orders/RFQ domains (except where catalog is referenced as a dependency).

---

## 3. Prisma Schema — CatalogItem Model

**Source:** `server/prisma/schema.prisma` lines ~335–357. Table: `catalog_items`.

### Confirmed fields

| Prisma field | DB column | Type | Notes |
|---|---|---|---|
| `id` | `id` | UUID | PK, auto-generated |
| `tenantId` | `tenant_id` | UUID | FK → Tenant; CASCADE delete; indexed |
| `name` | `name` | VarChar(255) | Required |
| `sku` | `sku` | VarChar(100) | Optional |
| `description` | `description` | text | Optional |
| `price` | `price` | Decimal(10,2) | Optional (nullable) |
| `active` | `active` | Boolean | Default `true` |
| `moq` | `moq` | Int | Default `1` |
| `imageUrl` | `image_url` | String | Optional |
| `publicationPosture` | `publication_posture` | VarChar(30) | Default `"PRIVATE_OR_AUTH_ONLY"` |
| `createdAt` | `created_at` | Timestamptz | Auto |
| `updatedAt` | `updated_at` | Timestamptz | Auto |

**Relations:** `cartItems CartItem[]`, `orderItems OrderItem[]`, `rfqs Rfq[]`, `tenant Tenant`.  
**Indexes:** `(tenantId, active)`, `(tenantId, updatedAt)`.

### Known publicationPosture values (from ecosystem)

| Value | Meaning |
|---|---|
| `PRIVATE_OR_AUTH_ONLY` | Default. Item not exposed to public storefronts. |
| `B2C_PUBLIC` | Eligible for B2C public projection (org-level posture, not item-level as of now). |
| `BOTH` | Eligible for B2C and B2B public projection. |

**Note:** `publicationPosture` is a field on `CatalogItem` in the schema, but as of this investigation, no backend route allows the supplier to change it for individual items. The public projection gates operate at the org level (`Tenant.publication_posture`) not at the item level; item-level `publicationPosture` is stored but currently inert in all exposed routes.

### Schema gaps identified

- No `category` or `classification` model — `category` is a phantom client-side field only
- No inventory / stock quantity fields
- No multi-image or media relation (single `imageUrl` field only)
- No certification or DPP passport link at the item level
- No tiered pricing model — single `price` field only (UI subtitle "Tiered pricing and MOQ enforcement active" is **not schema-supported**)
- No approval workflow state (e.g., `DRAFT / PENDING_APPROVAL / APPROVED`)
- No tagging / search facet relation
- No buyer-visibility scoping beyond `publicationPosture` (no per-buyer whitelist, no org-to-org visibility control)
- No soft-delete / archive field (only hard delete via API)

---

## 4. Backend Routes — Catalog CRUD

**Source:** `server/src/routes/tenant.ts` lines ~1144–1500.  
**Auth pattern on all routes:** `tenantAuthMiddleware` + `databaseContextMiddleware`.  
**DB access pattern:** `withDbContext(prisma, dbContext, ...)` — RLS enforces tenant boundary; no manual `tenantId` filter required.

### Route inventory

#### GET `/api/tenant/catalog/items` (line ~1151)
- **Role guard:** None (any authenticated tenant member)
- **Filter:** `active: true` hardcoded; no inactive items exposed
- **Search:** Optional `q` param — case-insensitive LIKE match on `name` and `sku`
- **Pagination:** Cursor-based (`cursor` = last item UUID); `limit` 1–100, default 20
- **Response:** `{ items: CatalogItem[], count: number, nextCursor: string | null }`
- **Returns full Prisma model** including `publicationPosture`, `moq`, `description`, `imageUrl`
- **In OpenAPI contract:** YES (`/api/tenant/catalog/items` GET)

#### POST `/api/tenant/catalog/items` (line ~1216)
- **Role guard:** OWNER or ADMIN only
- **Body:** `name` (required), `sku?`, `imageUrl?` (URL-validated), `description?`, `price` (positive number), `moq?` (int ≥1, default 1)
- **Audit:** writes `catalog.item.created` event
- **Vector:** enqueues G-028 B1 source ingestion (best-effort, non-blocking)
- **Response:** `{ item }` 201
- **In OpenAPI contract:** YES (`/api/tenant/catalog/items` POST)

#### PATCH `/api/tenant/catalog/items/:id` (line ~1307)
- **Role guard:** OWNER or ADMIN only
- **Guard:** org-scoped `findFirst` before update (returns 404 if not found or cross-tenant)
- **Body:** all fields optional; empty body rejected with 422
- **Supported patch fields:** name, sku, imageUrl, description, price, moq, active
- **publicationPosture:** NOT patchable via this route
- **Audit:** writes `catalog.item.updated` event
- **Vector:** enqueues G-028 B2 reindex (best-effort, non-blocking)
- **Response:** `{ item }`
- **In OpenAPI contract:** **NO** — PATCH route is absent from `openapi.tenant.json`

#### DELETE `/api/tenant/catalog/items/:id` (line ~1421)
- **Role guard:** OWNER or ADMIN only
- **Guard:** org-scoped `findFirst` before delete (returns 404 if not found or cross-tenant)
- **Deletion type:** HARD DELETE — no soft-delete / archive
- **Audit:** writes `catalog.item.deleted` event
- **Vector:** enqueues G-028 B2-DELETE vector deletion (best-effort, non-blocking)
- **Response:** `{ id, deleted: true }`
- **In OpenAPI contract:** **NO** — DELETE route is absent from `openapi.tenant.json`

### Missing routes (not implemented)

| Missing route | Impact |
|---|---|
| `GET /api/tenant/catalog/items/:id` | No single-item detail endpoint; frontend must use list and find in state |
| `PATCH /api/tenant/catalog/items/:id/publication` (or equivalent) | No route to toggle `publicationPosture`; field is inert from API surface |
| Buyer-facing cross-tenant catalog browse | Buyers cannot discover supplier catalogs; no cross-tenant list/search endpoint |
| Category / filter endpoints | No category filter, price range filter, or faceted search via API |
| Bulk operations | No bulk create, bulk update, or bulk deactivate |
| Soft delete / archive | Only hard delete; no recover path |

### Cross-tenant catalog read (internal helper only)

`resolveRfqCatalogItemTarget()` at line ~368 of `tenant.ts` can read catalog items cross-tenant using a transaction-local DB role `texqtic_rfq_read`. This helper is used internally only for RFQ creation — it is NOT a public buyer catalog browse route.

---

## 5. Service Layer — catalogService.ts

**Source:** `services/catalogService.ts`.

### Frontend TypeScript interface: `CatalogItem`

```typescript
interface CatalogItem {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  category?: string;   // CLIENT-ONLY — NOT a DB column
  moq?: number;
}
```

**Gaps vs DB schema:**
- `publicationPosture` — in DB schema, returned by GET, but **absent from the TypeScript interface**
- `category` — in TypeScript interface as optional, but **has no DB column**; always `undefined` at runtime
- `description` — present in interface (optional) and in DB schema; consistent

### Service functions

| Function | Description |
|---|---|
| `getCatalogItems(params?)` | GET `/api/tenant/catalog/items` with optional `{ q, limit, cursor }` |
| `searchCatalog(query, limit)` | Thin wrapper around `getCatalogItems` with `q` and `limit` |
| `createCatalogItem(payload)` | POST `/api/tenant/catalog/items` |
| `updateCatalogItem(itemId, payload)` | PATCH `/api/tenant/catalog/items/:id` |
| `deleteCatalogItem(itemId)` | DELETE `/api/tenant/catalog/items/:id` |

No service function exists for publication posture management, image upload, or bulk operations.

---

## 6. Runtime Manifest — B2B Workspace Route Registration

**Source:** `runtime/sessionRuntimeDescriptor.ts` lines ~500–523.

```typescript
b2b_workspace: {
  key: 'b2b_workspace',
  baseOperatingMode: 'B2B_WORKSPACE',
  defaultLocalRouteKey: 'catalog',   // Catalog is the B2B landing route
  allowedRouteGroups: ['catalog_browse', 'orders_operations', 'rfq_sourcing', 'operational_workspace'],
  routeGroups: [
    defineRuntimeRouteGroup('catalog_browse', [
      defineRuntimeRoute('catalog', 'Catalog', 'HOME', { expView: 'HOME' }, { defaultForGroup: true }),
    ]),
    WORKSPACE_ORDERS_ROUTE_GROUP,
    RFQ_ROUTE_GROUP,
    OPERATIONAL_WORKSPACE_ROUTE_GROUP,
  ],
  ...
}
```

**Key manifest facts:**
- `defaultLocalRouteKey` for B2B workspace is `'catalog'` — catalog is the entry page
- `catalog_browse` route group has exactly one route: `'catalog'` (label "Catalog")
- `RouteGroupClassification` for `catalog_browse` = `'family-core'`
- `FeatureCapabilities.sellerCatalog` and `.buyerCatalog` are both typed in `SessionRuntimeDescriptor` but default to `false` in the base capabilities factory; B2B workspace may set them — not fully traced in this investigation

---

## 7. App.tsx — Catalog State Machine and Render Surfaces

**Source:** `App.tsx`.

### State variables (lines ~1833–1863)

| Variable | Type | Purpose |
|---|---|---|
| `products` / `setProducts` | `CatalogItem[]` | Catalog item list |
| `catalogLoading` / `setCatalogLoading` | `boolean` | Loading indicator |
| `catalogError` / `setCatalogError` | `string \| null` | Error display |
| `catalogNextCursor` / `setCatalogNextCursor` | `string \| null` | Pagination cursor |
| `showAddItemForm` / `setShowAddItemForm` | `boolean` | Inline add form toggle |
| `addItemFormData` / `setAddItemFormData` | `{ name, price, sku, imageUrl }` | Add form field state |
| `addItemLoading` / `setAddItemLoading` | `boolean` | Create in-flight |
| `addItemError` / `setAddItemError` | `string \| null` | Create error |
| `editingCatalogItemId` / `setEditingCatalogItemId` | `string \| null` | ID of item being edited |
| `editItemFormData` / `setEditItemFormData` | `{ name, price, sku, imageUrl }` | Edit form field state |
| `editItemLoading` / `setEditItemLoading` | `boolean` | Update in-flight |
| `editItemError` / `setEditItemError` | `string \| null` | Update error |
| `deleteItemLoadingId` / `setDeleteItemLoadingId` | `string \| null` | ID of item being deleted |
| `editingCatalogItem` (derived) | `CatalogItem \| null` | `products.find(editingCatalogItemId) ?? null` |

### Derived booleans (lines ~2120–2130)

```typescript
isB2BCatalogEntrySurface =
  appState === 'EXPERIENCE'
  && routeKey === 'catalog'
  && tenantBaseCategory === 'B2B'
  && !tenantHasWhiteLabelCapability

shouldLoadAppCatalog =
  isB2BCatalogEntrySurface
  || isB2CBrowseEntrySurface
  || isWlAdminProductsSurface
```

### Data loading (lines ~2526–2582)

Two-phase strategy on `shouldLoadAppCatalog`:
1. **First paint** (immediate): `limit = ENTERPRISE_HOME_CATALOG_FIRST_PAINT_LIMIT` (8)
2. **Tail hydration** (250ms delay, `ENTERPRISE_HOME_CATALOG_TAIL_DELAY_MS`): `limit = ENTERPRISE_HOME_CATALOG_TAIL_LIMIT` (12)

Both phases call `getCatalogItems(params)`. No explicit pagination UI — tail hydration loads additional items silently.

### Handlers

| Handler | Purpose | Verification-block gated? |
|---|---|---|
| `handleCreateItem(e)` | Validates, calls `createCatalogItem`; optimistic prepend to `products` | YES |
| `handleOpenEditItem(product)` | Populates `editItemFormData`; sets `editingCatalogItemId` | YES |
| `handleCloseEditItem()` | Guards against in-flight; calls `resetEditItemState()` | — |
| `handleUpdateItem()` | Validates, calls `updateCatalogItem`; replaces item in `products` list | YES |
| `handleDeleteItem(product)` | Confirm dialog; calls `deleteCatalogItem`; removes from `products`; resets edit if same | YES |
| `renderCatalogItemMutationActions(product)` | Renders Edit + Delete buttons with loading states | — |

### Render path

```
routeKey === 'catalog'
  → case 'catalog': → renderDescriptorAlignedTenantContentFamily(tenantContentFamily)
    → case 'b2b_workspace': → renders "Wholesale Catalog" inline surface
```

### B2B Workspace catalog surface (lines ~3755–3900)

**Header:** "Wholesale Catalog"  
**Subtitle:** "Tiered pricing and MOQ enforcement active." (**misrepresents schema capability** — see Section 9)

**Toolbar:** "Supplier RFQ Inbox" button + "View My RFQs" button + "+ Add Item" (opens inline add form)

**B2BTenantTaxonomyPanel:** Rendered immediately below header (display-only; see Section 8)

**Inline add form (conditional on `showAddItemForm`):**
- Fields: `Name*`, `Price*`, `SKU` (optional), `Image URL` (optional URL type)
- NOT exposed: `moq`, `description`, `publicationPosture`
- `moq` defaults to 1 server-side when not sent

**Product grid (map over `products`):**
- Shows: `p.category || 'General'` (PHANTOM — see Section 9), `p.name`, `p.sku`, `$p.price`, `MOQ: p.moq || 1`
- Does **NOT** show: `imageUrl` (no `<img>` in product grid cards), `description`, `publicationPosture`, `active` status
- Mutation actions: Edit + Delete via `renderCatalogItemMutationActions(product)`

**Edit modal (fixed overlay, `editingCatalogItem && !isVerificationBlockedTenantWorkspace`):**
- Fields: `Name*`, `Price*`, `SKU` (optional), `Image URL` (optional URL type)
- NOT exposed: `moq`, `description`, `publicationPosture`
- Calls `handleUpdateItem()` on form submit

---

## 8. B2BTenantTaxonomyPanel

**Source:** `App.tsx` line ~1077. Rendered in B2B workspace catalog surface at line ~3791.

This is a display-only component showing the canonical B2B taxonomy carried on the active tenant session:
- **Primary Segment** (from `primarySegmentKey`)
- **Secondary Segments** (list)
- **Role Positions** (list)

Data is resolved from `resolveTenantTaxonomyCarrier(tenant)`. Panel renders only if `canRenderCanonicalB2BTaxonomy(tenant)` returns true AND at least one taxonomy field is populated. If the tenant has no taxonomy configured, the panel returns null — catalog surface remains usable without it.

This panel is informational only; it has no edit, save, or interaction affordance.

---

## 9. Critical Gaps and Misalignments

### 9.1 UI copy misrepresents schema capability — "Tiered pricing"

The B2B catalog surface header renders the subtitle: *"Tiered pricing and MOQ enforcement active."*

**Repo truth:** The `CatalogItem` schema has a single `price` field (`Decimal(10,2)`). There is no tiered pricing model, no `PriceTier` relation, no quantity-break pricing, and no buyer-specific pricing structure anywhere in the schema. The MOQ field exists (`moq Int @default(1)`), but the UI add/edit forms do not expose it. "MOQ enforcement" is also not enforced in any backend route — MOQ is stored but not validated against order quantities.

**Classification:** UI copy is aspirational and does not reflect implemented schema or backend behavior.

### 9.2 `category` is a phantom field

The product grid renders `p.category || 'General'`. The `CatalogItem` TypeScript interface includes `category?: string`. The DB `catalog_items` table has **no `category` column**. The Prisma `CatalogItem` model has **no `category` field**. The GET route does not return a `category` value. At runtime, `p.category` is always `undefined`, so every card shows "General".

**Classification:** Phantom field — UI display-only category label serves no data purpose.

### 9.3 imageUrl is writable but not displayed

The add and edit forms both expose an `Image URL` field. The DB schema stores `image_url`. The GET route returns `imageUrl`. However, the B2B workspace product grid cards do **not** render an `<img>` or any image display element. Images are accepted, stored, and returned but never shown to the supplier in the catalog list view.

**Classification:** Write path operational; read/display path absent from catalog grid.

### 9.4 publicationPosture is inert from the supplier surface

`publicationPosture` defaults to `PRIVATE_OR_AUTH_ONLY` on creation. The PATCH route does not accept `publicationPosture` as a patchable field. The TypeScript `CatalogItem` interface does not declare `publicationPosture`. No UI exposes a publish/unpublish toggle. Suppliers have no mechanism to change an item's publication posture.

**Classification:** Schema field exists; API and UI do not expose it; feature is effectively locked at default.

### 9.5 moq is not editable

The `moq` field defaults to 1, is returned in GET results, and is displayed in the product grid. Neither the add form nor the edit modal expose a `moq` input. The POST handler sends no `moq` (server defaults to 1). The PATCH handler supports `moq` in theory, but no UI path reaches it.

**Classification:** Schema + backend support `moq`; UI write path is absent.

### 9.6 description is unreachable

`description` exists in the schema (text, optional), in the OpenAPI POST contract (optional property), and in the `CatalogItem` TypeScript interface (optional). Neither the add form nor the edit modal have a `description` field. The product grid does not display it.

**Classification:** Full-stack capability exists but is not surfaced anywhere in the UI.

### 9.7 No buyer-facing catalog discovery surface

The GET route returns only the **authenticated tenant's own active items**. There is no cross-tenant catalog browse route for buyers. The `resolveRfqCatalogItemTarget()` helper allows cross-tenant reads internally during RFQ creation only — it is not a buyer discovery mechanism.

**Classification:** Buyer catalog discovery is entirely absent. Buyers cannot browse or search supplier catalogs. The only implicit catalog exposure is via the WL Storefront (which serves a single tenant's items) and the B2C/B2B public projection routes (which operate at the org level and are separate from this sub-family).

### 9.8 PATCH and DELETE routes absent from OpenAPI contract

The following backend routes are implemented and operational but are not documented in `shared/contracts/openapi.tenant.json`:
- `PATCH /api/tenant/catalog/items/:id`
- `DELETE /api/tenant/catalog/items/:id`

Only `GET` and `POST /api/tenant/catalog/items` appear in the contract. This is a governance documentation gap; the routes themselves function correctly.

---

## 10. Governance Units — Catalog History

| Unit ID | Type | Status | Summary |
|---|---|---|---|
| `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001` | DECISION | CLOSED | Decision: placeholder.com fallback DNS/resource failure observed on catalog cards |
| `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` | ACTIVE_DELIVERY | CLOSED | Remediated placeholder.com fallback on B2B catalog cards |
| `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003` | ACTIVE_DELIVERY | CLOSED | Remediated placeholder.com fallback on B2C New Arrivals cards (App.tsx line ~1698) |
| `TENANT-CATALOG-IMAGE-UPLOAD-GAP-001` | DECISION | CLOSED | Decision: imageUrl field absent from add-item form in production |
| `TENANT-CATALOG-IMAGE-UPLOAD-GAP-002` | IMPLEMENTATION | CLOSED | Added imageUrl field to add-item form; added `image_url` column to schema; commits 2f1b28d + ab52404 |
| `MODE-COMPLETENESS-B2C-STOREFRONT-CATALOG-MUTATION-AFFORDANCE-SEPARATION-001` | ACTIVE_DELIVERY | CLOSED | Removed `renderCatalogItemMutationActions(product)` from B2C storefront cards; mutation actions now B2B-only |

**Conclusion from governance unit audit:** No TECS-prefixed catalog-specific governance unit exists. All catalog governance units are closed. No open catalog implementation unit exists under the current HOLD posture.

---

## 11. Test Coverage Audit

### Dedicated catalog CRUD tests
**None found.** No test file exists that exercises `GET/POST/PATCH/DELETE /api/tenant/catalog/items` directly.

### Indirect catalog coverage

| File | Coverage type |
|---|---|
| `server/tests/rfq-detail-route.shared.test.ts` | Uses `tx.catalogItem.create()` as RFQ test fixture scaffolding; tests RFQ routes, not catalog routes |
| `server/tests/ragBenchmark.g028.test.ts` | References `catalog_items` as a vector source type in RAG/G-028 benchmark; does not test catalog CRUD |
| `tests/rfq-buyer-detail-ui.test.tsx` | Uses `catalog_item_id` in RFQ fixture; imports from `catalogService`; does not test catalog endpoints |
| `tests/rfq-buyer-list-ui.test.tsx` | Same pattern as above |
| `tests/session-runtime-descriptor.test.ts` | Asserts `defaultLocalRouteKey: 'catalog'` for B2B workspace; tests manifest registration only |

**Coverage gap:** The complete catalog CRUD route layer has no dedicated integration or unit test suite.

---

## 12. OpenAPI Contract Alignment

**Source:** `shared/contracts/openapi.tenant.json`.

| Route | In contract? |
|---|---|
| `GET /api/tenant/catalog/items` | YES — documented with query params and 200/401/422 responses |
| `POST /api/tenant/catalog/items` | YES — documented with required name/price body; optional sku/imageUrl/description/moq |
| `PATCH /api/tenant/catalog/items/:id` | **NO** — absent |
| `DELETE /api/tenant/catalog/items/:id` | **NO** — absent |

The GET contract does not specify a response body schema (only `"200": { "description": "Catalog items retrieved" }`). The full response shape (`{ items, count, nextCursor }`) is undocumented. POST is similarly shallow — no response body schema is documented.

---

## 13. Launch Readiness Classification

| Capability | Status | Notes |
|---|---|---|
| Supplier catalog CRUD (create/list/update/delete) | **OPERATIONAL** | All four routes + frontend surface functional |
| Supplier catalog item detail view | **ABSENT** | No per-item detail page; no GET /:id backend route |
| imageUrl storage | **OPERATIONAL** | Stored and returned; not displayed in catalog grid |
| moq storage | **PARTIALLY OPERATIONAL** | Stored and returned; not editable via UI |
| description storage | **PARTIALLY OPERATIONAL** | Stored and returned; not exposed in UI |
| publicationPosture management | **ABSENT** | Schema field exists; no API or UI path to change it |
| Tiered pricing | **ABSENT** | UI claims it; schema does not support it |
| Buyer-facing catalog discovery | **ABSENT** | No cross-tenant browse route or buyer catalog surface |
| Category / faceted browse | **PHANTOM** | Client-side field only; no DB column; always shows "General" |
| Catalog search (UI-exposed) | **ABSENT** | Backend `q` param exists; no search input in B2B catalog UI |
| Bulk catalog operations | **ABSENT** | No bulk create/update/deactivate routes |
| Catalog test coverage | **ABSENT** | No dedicated catalog test suite |
| OpenAPI contract completeness | **PARTIAL** | PATCH and DELETE routes undocumented |

**Overall classification: FLOW PARTIAL**

The supplier-owner CRUD workflow is operationally complete. The buyer-side discovery flow, publication posture management, tiered pricing, and several UI field surfaces are absent or not implemented.

---

## 14. Bounded Delivery Unit Candidates (informational — not opened by this document)

The following candidates could be considered independently for future opening under TECS governance. None are authorized by this document.

| Candidate | Scope boundary |
|---|---|
| `PATCH /api/tenant/catalog/items/:id` OpenAPI documentation | Add PATCH + DELETE to `openapi.tenant.json` only; no code changes |
| moq edit field in add/edit forms | Add `moq` input to add and edit forms; no schema change required |
| description field in add/edit forms | Add `description` textarea to add and edit forms; no schema change required |
| imageUrl display in product grid | Add image display to B2B catalog product cards; no schema change required |
| publicationPosture toggle route | New `PATCH /api/tenant/catalog/items/:id/posture` route + UI toggle; requires schema enum enforcement decision |
| Catalog CRUD integration tests | Dedicated test file for catalog routes; no code change |
| "Tiered pricing" subtitle correction | Remove or replace misleading subtitle in B2B catalog surface header |
| `category` field removal from TypeScript interface | Remove phantom `category?: string` from `CatalogItem` interface |

---

## 15. Governance Control File Impact

This investigation is read-only. No implementation unit is opened. No governance control files (`NEXT-ACTION.md`, `OPEN-SET.md`, `SNAPSHOT.md`) require updates as a result of this artifact.

---

## 16. Summary of Confirmed Repo Truth

1. The B2B catalog CRUD backend is **complete and operational** — all four routes function under RLS with proper auth guards, audit writes, and G-028 vector integration.
2. The B2B catalog frontend supplier surface is **operational for basic CRUD** — add, edit, delete are functional and verification-block gated.
3. The catalog data model has **five unreachable or phantom fields** in the current UI: `category` (phantom), `publicationPosture` (inert), `moq` (display-only), `description` (invisible), and `imageUrl` (write-only — stored but not shown in the product grid).
4. The UI subtitle **"Tiered pricing and MOQ enforcement active"** is factually incorrect — no tiered pricing schema exists, and MOQ is not enforced anywhere in the backend.
5. A **buyer-facing catalog discovery surface is entirely absent** — the GET route returns only the authenticated tenant's own items; no cross-tenant catalog browse capability exists.
6. **Two backend routes (PATCH and DELETE) are absent from the OpenAPI governance contract.**
7. **No dedicated catalog test suite exists** — catalog is covered only incidentally as fixture scaffolding in RFQ and RAG tests.
8. All historical catalog governance units are **CLOSED**; no open implementation unit exists for the catalog sub-family.
