# TEXQTIC B2B — Buyer Catalog Discovery Readiness Investigation
**Document ID:** TEXQTIC-B2B-BUYER-CATALOG-DISCOVERY-INVESTIGATION-v1  
**Family:** B2B Sub-family — Buyer Catalog Discovery  
**Investigation Date:** 2026-07-14  
**Investigator:** GitHub Copilot (TECS SAFE-WRITE Mode — Investigation Only)  
**Status:** COMPLETE — Artifact only; no implementation action taken  
**Governance Posture at Investigation Time:** `HOLD-FOR-BOUNDARY-TIGHTENING` / `ZERO_OPEN_DECISION_CONTROL` (D-016 active)

---

## 1. Purpose

This document investigates the current state of **Authenticated B2B Buyer Catalog Discovery** — the
capability for a logged-in buyer-org tenant member to browse and search a supplier's catalog items
cross-tenant within the B2B workspace.

It traces all applicable layers (schema, backend routes, service types, runtime manifest, feature
capabilities, App.tsx state machine, frontend components, tests, and governance decisions) to
determine:

- What repo truth already exists for Buyer Catalog Discovery
- Whether any buyer-facing cross-tenant catalog browse capability exists (backend, helper,
  projection, or WL/public-adjacent surfaces)
- What is missing at schema, backend, and frontend layers
- Whether buyer discovery is blocked by product decision, missing route contract, tenancy model,
  or UI wiring
- What the safest first bounded implementation unit would be if Buyer Catalog Discovery is
  to be enabled

**Critical up-front distinction:** The phrase "B2B Buyer Catalog Discovery" in this investigation
refers strictly to **authenticated, in-session cross-tenant catalog item browse** — a logged-in
B2B workspace tenant browsing a supplier's product catalog. This is distinct from:

- **Public B2B Supplier Discovery** (`GET /api/public/b2b/suppliers`) — unauthenticated org-level
  supplier directory; implemented and operational; out of scope here.
- **WL Storefront Browse** — single-tenant authenticated storefront with `buyerCatalog` capability;
  out of scope.
- **B2C Public Storefront Browse** (`GET /api/public/b2c/products`) — B2C public product list;
  out of scope.

---

## 2. Investigation Scope

**In scope:**
- Authenticated buyer-side cross-tenant catalog item browse within the B2B workspace
- Schema visibility model for buyer-accessible catalog items
- Backend route gap analysis for authenticated cross-tenant catalog reads
- App.tsx B2B workspace buyer surfaces and feature capability routing
- Runtime manifest `buyerCatalog` capability status
- Relationship between the existing public B2B projection layer and a hypothetical
  authenticated buyer catalog browse layer
- Any existing product decisions authorizing or blocking buyer catalog discovery

**Out of scope:**
- RFQ creation and the RFQ domain (governed separately by PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP)
- Negotiation, trade, orders, and settlement surfaces
- WL Admin catalog management
- B2C storefront and public browse
- Supplier-side catalog CRUD (governed by CATALOG-ALIGNMENT-HARDENING-001)

---

## 3. Source Artifacts and Repo Areas Reviewed

| Source | Lines / Scope | Key Facts Extracted |
|--------|---------------|---------------------|
| `docs/TEXQTIC-B2B-CATALOG-INVESTIGATION-v1.md` | Full | Schema, backend routes, service layer, manifest, gaps, governance history |
| `docs/TEXQTIC-B2B-VIEW-MY-RFQS-INVESTIGATION-v1.md` | Lines 1–60 | Buyer RFQ layer VERIFIED_COMPLETE; confirms buyer persona exists in B2B workspace |
| `docs/TEXQTIC-B2B-SUPPLIER-RFQ-INBOX-INVESTIGATION-v1.md` | Lines 1–80 | Supplier inbox BASIC OPERATIONAL; confirms pre-negotiation cap in force |
| `governance/control/NEXT-ACTION.md` | Lines 1–60 | Active delivery unit: NONE; D-016 ACTIVE; last closed: PUBLIC_B2C_BROWSE |
| `governance/control/OPEN-SET.md` | Lines 1–80 | Zero implementation-ready units OPEN; WL Co hold non-blocking for this scope |
| `governance/control/SNAPSHOT.md` | Lines 1–100 | HOLD-FOR-BOUNDARY-TIGHTENING confirmed; layer 0 posture stable |
| `runtime/sessionRuntimeDescriptor.ts` | Lines 495–815 | B2B_WORKSPACE sets `sellerCatalog: true`, `rfq: true`; `buyerCatalog` NOT set; B2C/WL get `buyerCatalog: true` |
| `server/src/services/publicB2BProjection.service.ts` | Full | Five-gate public projection; supplier profile and offering preview only; no price; no authenticated buyer context |
| `server/src/routes/public.ts` | Lines 580–650 | `GET /api/public/b2b/suppliers` — unauthenticated, no cross-tenant item detail |
| `server/src/routes/tenant.ts` | Lines 360–430, grep cross-tenant | `resolveRfqCatalogItemTarget()` — only cross-tenant catalog read path; RFQ-internal only |
| `components/Public/B2BDiscovery.tsx` | Full | Public unauthenticated supplier directory; no authenticated buyer path; sign-in CTA only |
| `services/publicB2BService.ts` | Full | Frontend client for public supplier directory; no cross-tenant item browse |
| `tests/session-runtime-descriptor.test.ts` | Lines 295–430 | B2B_WORKSPACE test asserts `sellerCatalog: true`, `rfq: true`; B2C test asserts `buyerCatalog: true` |
| Governance docs (product-truth, strategy) | grep scope | No `PRODUCT-DEC-BUYER-CATALOG-DISCOVERY` or equivalent decision exists |

---

## 4. Intended Product Role of Buyer Catalog Discovery

**From repo-inferred architecture and naming conventions:**

Buyer Catalog Discovery represents the workflow where an authenticated B2B buyer-org tenant member
can browse and search the catalog items of a known supplier org — enabling product sourcing
discovery before or independently of RFQ initiation.

In the current system, the only supplier-to-buyer catalog exposure path is:
- **Anonymous discovery** via public B2B supplier profiles (org-level, offering preview only,
  no price, no item detail)
- **Implicit reference** via `resolveRfqCatalogItemTarget()` during RFQ creation — the buyer
  must already know the catalog item UUID; they cannot browse to discover it

The expected product role of a Buyer Catalog Discovery feature would be:
> A logged-in B2B workspace tenant member navigates to a supplier's catalog, browses their
> active, publicly-eligible items with name, MOQ, image, and description, and from that browse
> context initiates an RFQ for a specific item.

The `buyerCatalog` feature capability type in `FeatureCapabilities` (confirmed in
`runtime/sessionRuntimeDescriptor.ts` line 34) and the `catalog_browse` route group classification
(`'family-core'`) both indicate this feature was architecturally anticipated but not yet enabled
for the B2B workspace context.

---

## 5. Confirmed Repo-Truth Implementation Status

### Overall classification: **ABSENT — No product decision authorizes it; no implementation exists at any layer**

| Capability Layer | Status | Confirmed by |
|-----------------|--------|--------------|
| Product decision authorizing buyer catalog discovery | **ABSENT** | No `PRODUCT-DEC-BUYER-CATALOG-DISCOVERY` or equivalent found in any governance file |
| Backend authenticated cross-tenant catalog browse route | **ABSENT** | `grep` across all `server/src/routes/*.ts`; no such route |
| Frontend buyer catalog browse service function | **ABSENT** | `services/catalogService.ts` has no cross-tenant browse function |
| App.tsx B2B workspace buyer catalog surface | **ABSENT** | No `buyerCatalog` AppState or render case in B2B workspace |
| Runtime manifest buyer catalog route | **ABSENT** | `catalog_browse` group in `b2b_workspace` has only supplier `catalog` route |
| `buyerCatalog` capability enabled for B2B workspace | **NOT SET** | Set to `true` only for `B2C_STOREFRONT` and `WL_STOREFRONT` |
| Schema buyer visibility model (per-buyer whitelist, org-to-org visibility) | **ABSENT** | No such model in `schema.prisma`; confirmed in catalog investigation |
| Item-level `publicationPosture` patchable from supplier API | **ABSENT** | PATCH route explicitly excludes `publicationPosture`; no UI toggle |
| Test coverage for buyer catalog browse | **ABSENT** | No test referencing cross-tenant catalog browse |

---

## 6. Frontend Status

### 6.1 Feature capability routing

The `FeatureCapabilities` interface in `runtime/sessionRuntimeDescriptor.ts` (line 33–34) types:
```typescript
sellerCatalog: boolean;
buyerCatalog: boolean;
```

The `buildRuntimeCapabilities()` factory (line ~778) assigns:
```typescript
case 'B2B_WORKSPACE':
  capabilities.feature.rfq = true;
  capabilities.feature.sellerCatalog = true;
  // buyerCatalog is NOT set — defaults to false
  break;
case 'B2C_STOREFRONT':
  capabilities.feature.cart = true;
  capabilities.feature.buyerCatalog = true;
  break;
case 'WL_STOREFRONT':
  capabilities.feature.cart = true;
  capabilities.feature.rfq = true;
  capabilities.feature.buyerCatalog = true;
  break;
```

**Finding:** `buyerCatalog` capability is typed and architecturally anticipated for B2B workspace
but intentionally not set. The B2B_WORKSPACE case does not include `buyerCatalog: true`.

This is not a bug or oversight. The capability is present in the type but absent from the
runtime assignment for B2B workspace, reflecting that no product decision has authorized
buyer catalog discovery in the authenticated B2B context.

### 6.2 Runtime manifest — route registration

The `b2b_workspace` manifest entry in `runtime/sessionRuntimeDescriptor.ts` (lines 500–520):
```typescript
b2b_workspace: {
  defaultLocalRouteKey: 'catalog',
  allowedRouteGroups: ['catalog_browse', 'orders_operations', 'rfq_sourcing', 'operational_workspace'],
  routeGroups: [
    defineRuntimeRouteGroup('catalog_browse', [
      defineRuntimeRoute('catalog', 'Catalog', 'HOME', { expView: 'HOME' }, { defaultForGroup: true }),
    ]),
    ...
  ],
}
```

**Finding:** The `catalog_browse` route group in the B2B workspace manifest contains exactly one
route: `'catalog'` (supplier-owned catalog). No buyer catalog browse route is registered. The
`allowedRouteGroups` includes `'catalog_browse'` but this group currently serves only the
supplier-side catalog surface.

### 6.3 App.tsx — no buyer catalog state machine

A full-text search of `App.tsx` for `buyerCatalog`, `buyer_catalog`, `BUYER_CATALOG`,
`catalog_discover`, and `catalog.*buyer` returns zero matches. There is no:
- AppState entry for buyer catalog browse
- Render case for buyer catalog discovery within the B2B workspace
- Handler for fetching cross-tenant catalog items
- State variables for cross-tenant catalog data

The B2B workspace catalog surface (`case 'b2b_workspace'` in the render path) renders only the
supplier's own wholesale catalog surface — it is not a buyer-facing surface.

### 6.4 Public B2B Discovery page — not a buyer catalog surface

`components/Public/B2BDiscovery.tsx` is an unauthenticated public page that:
- Consumes `GET /api/public/b2b/suppliers` (no auth required)
- Displays supplier org-level profiles (name, jurisdiction, taxonomy, certifications,
  traceability evidence, offering preview)
- Shows offering preview items (name, MOQ, imageUrl only — price intentionally excluded per
  Gate E of public projection)
- Has a sign-in CTA as its only authenticated affordance

**This is not a buyer catalog browse surface.** It provides org-level discovery for anonymous
visitors. It does not expose full catalog items, item prices, item descriptions, or item SKUs.
It has no authenticated buyer context and cannot be reused as an in-session buyer catalog
browse component without a complete redesign of its data source and route contract.

---

## 7. Backend Status

### 7.1 No authenticated buyer-facing cross-tenant catalog route

A full search of `server/src/routes/tenant.ts` and `server/src/routes/public.ts` for
`buyer.*catalog`, `catalog.*buyer`, `cross.tenant.*catalog`, `catalog.*browse`, and
`authenticated.*catalog` confirms: **no authenticated buyer-facing cross-tenant catalog read
route exists.**

The only routes returning catalog items to authenticated tenant users are:
- `GET /api/tenant/catalog/items` — returns the authenticated tenant's OWN active items only
  (enforced by RLS via `withDbContext`); cannot return another tenant's items

### 7.2 resolveRfqCatalogItemTarget() — only cross-tenant read path; internal only

`resolveRfqCatalogItemTarget()` at `server/src/routes/tenant.ts` line 368 is the only location
in the backend that reads a catalog item cross-tenant. Its mechanism:

```typescript
async function resolveRfqCatalogItemTarget(catalogItemId: string): Promise<RfqCatalogItemTarget | null> {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL ROLE texqtic_rfq_read`;
    const catalogItem = await tx.catalogItem.findUnique({
      where: { id: catalogItemId },
      select: { id, name, sku, price, active, tenantId },
    });
    ...
  });
}
```

**Key characteristics:**
- Uses a transaction-local DB role `texqtic_rfq_read` to bypass RLS within the transaction boundary
- Resolves a single item by UUID — requires the buyer to already know the item ID; not a browse
- Returns only: `id`, `name`, `sku`, `price`, `active`, `tenantId` (as `supplierOrgId`)
- Called internally only during RFQ creation and buyer RFQ detail reads — never exposed as
  a standalone buyer browse endpoint
- Does NOT filter by `publicationPosture` — reads any active item regardless of posture
- Does NOT check if the supplier org is eligible for buyer visibility

**This helper proves technical feasibility of cross-tenant catalog reads** but is not a buyer
discovery mechanism. Any buyer catalog browse route would need to mirror a similar pattern
with additional safety gates.

### 7.3 PublicB2BProjectionService — unauthenticated projection only

`server/src/services/publicB2BProjection.service.ts` provides the five-gate public supplier
projection (`listPublicB2BSuppliers`). Its offering preview includes `name`, `moq`, `imageUrl`
for items where `publicationPosture IN ('B2B_PUBLIC', 'BOTH')` AND `active = true`, with a max
of five items per org.

This service:
- Uses `withAdminContext` / `withOrgAdminContext` — not a caller-auth pattern
- Returns org-level supplier entries, not full catalog item lists
- Explicitly prohibits price from the output (Gate E)
- Has no concept of an authenticated buyer caller
- Cannot be reused as an authenticated buyer catalog browse service without a fundamentally
  different route contract, auth pattern, and data shape

### 7.4 publicationPosture gating — inert at supplier API layer

The `publicationPosture` field on `catalog_items`:
- Default: `PRIVATE_OR_AUTH_ONLY`
- Values: `PRIVATE_OR_AUTH_ONLY`, `B2C_PUBLIC`, `BOTH`
- The value `B2B_PUBLIC` appears in the public projection query but is not listed as a valid
  posture string in the catalog-alignment documentation; `BOTH` covers both B2C and B2B public
- PATCH route (`PATCH /api/tenant/catalog/items/:id`) explicitly excludes `publicationPosture`
  as a patchable field
- TypeScript `CatalogItem` interface (frontend) does not declare `publicationPosture`
- No UI affordance for suppliers to change item publication posture

**Finding:** Even if a buyer catalog browse route were created, it would need to filter by
`publicationPosture` to know which items are buyer-visible. But suppliers currently have no
mechanism to mark their items as buyer-discoverable — the field is locked at its default
(`PRIVATE_OR_AUTH_ONLY`). This creates a chicken-and-egg situation: buyer browse without
posture management would either show no items (all private) or expose all items regardless
of intent, both of which are problematic.

---

## 8. Schema / Data-Model Status

### 8.1 Current catalog_items schema

From the prior investigation (`TEXQTIC-B2B-CATALOG-INVESTIGATION-v1.md` §3):

| Field | Type | Buyer Relevance |
|-------|------|-----------------|
| `id` | UUID | Reference for RFQ creation |
| `tenantId` | UUID | Supplier org ID (cross-tenant boundary key) |
| `name` | String | Buyer-visible product name |
| `sku` | String? | Buyer-visible SKU |
| `description` | Text? | Buyer-visible description |
| `price` | Decimal(10,2)? | Buyer-relevant but sensitive (excluded from public projection) |
| `active` | Boolean | Gate — only active items should be discoverable |
| `moq` | Int (default 1) | Buyer-relevant minimum order quantity |
| `imageUrl` | String? | Buyer-visible product image |
| `publicationPosture` | VarChar(30) | Intended visibility gate — inert at supplier API layer |
| `createdAt` / `updatedAt` | Timestamps | Ordering signals |

### 8.2 Missing schema constructs for buyer catalog discovery

| Missing construct | Why needed | Risk if absent |
|-------------------|------------|----------------|
| **Item-level publicationPosture management** (supplier API) | Suppliers need a mechanism to mark items as buyer-discoverable | Without it, all items appear at default `PRIVATE_OR_AUTH_ONLY`; buyer browse returns empty OR requires bypassing posture gating |
| **Buyer-supplier relationship / access model** | Defines which buyer orgs can see which supplier catalogs | Without it, any authenticated buyer could browse any supplier's discoverable items — may or may not be intended for Phase 2 |
| **Org-to-org visibility linking** | Enables supplier-controlled buyer allowlist beyond `publicationPosture` | Only needed if fine-grained access is required; Phase 2 B2B may rely purely on posture-based open discovery |
| **Catalog browse pagination state model** | Server-side cursor pagination for large catalogs | Existing cursor-based pagination on `GET /api/tenant/catalog/items` is sufficient as a template |

### 8.3 What the existing schema supports for a bounded implementation

If a product decision authorized a **minimal buyer catalog browse** (open to any authenticated
B2B workspace tenant, filtered by `publicationPosture IN ('B2B_PUBLIC', 'BOTH')`), the following
would work without schema changes:

- The `publicationPosture` field already exists on `catalog_items`
- The `tenantId` column identifies the supplier org
- `active`, `name`, `sku`, `description`, `moq`, `imageUrl` are all present and returnably safe

The **only schema-adjacent gap** for a minimal implementation is that suppliers cannot currently
set `publicationPosture` via the API — this is an API governance gap, not a schema gap.

---

## 9. Workflow / Status Gap Analysis

| Workflow step | Current state | Gap type |
|--------------|---------------|----------|
| Supplier marks item as buyer-discoverable | Not possible (PATCH excludes publicationPosture) | API governance gap |
| Buyer navigates to supplier catalog discovery surface | No surface exists | Frontend gap |
| Buyer fetches supplier catalog items cross-tenant | No route exists | Backend route gap |
| Buyer searches / filters supplier catalog | No search/filter route | Backend + frontend gap |
| Buyer selects item and initiates RFQ | `POST /api/tenant/rfqs` with `catalogItemId` — OPERATIONAL | No gap (already works if item ID known) |
| Buyer views existing RFQs post-discovery | `GET /api/tenant/rfqs` — VERIFIED_COMPLETE | No gap |

**Critical workflow break:** The B2B buyer workflow currently enters the RFQ domain **blind** —
a buyer must already know a specific `catalogItemId` UUID to create an RFQ. There is no
discovery surface between "I want to source from a supplier" and "I create an RFQ". The public
B2B Discovery page provides org-level discovery only; it does not provide item-level discovery
or an in-session bridge to RFQ creation.

---

## 10. Permissions / Persona Access Analysis

### Current B2B workspace persona model

The B2B workspace currently presents as a **supplier-role surface**:
- `capabilities.feature.sellerCatalog = true` — confirms the primary persona is a seller
- `capabilities.feature.rfq = true` — RFQ capability is enabled (buyer-initiation + supplier-inbox)
- `capabilities.feature.buyerCatalog = false` (unset) — buyer catalog browse is not enabled

There is an implicit ambiguity in the B2B workspace: the same tenant org can act as both buyer
(initiating RFQs to suppliers) and seller (managing their own catalog, receiving RFQs). The RFQ
domain handles both directions under the same `B2B_WORKSPACE` operating mode. However, the
catalog domain currently handles only the seller direction.

### What buyer catalog discovery implies for the persona model

Enabling buyer catalog discovery in the B2B workspace would introduce a **cross-tenant read**
for the buyer persona. This requires:
- A new DB access pattern (analogous to `texqtic_rfq_read` but scoped to catalog browse)
- The existing `withDbContext` pattern (RLS-scoped to caller org) would NOT be used for cross-tenant reads
- Access control must be decided: open (any authenticated B2B member can browse any supplier with
  eligible posture) vs. restricted (only orgs with a supplier-buyer relationship)
- The tenant auth middleware already enforces the caller's `org_id`; the cross-tenant read must
  remain read-only and posture-gated

---

## 11. Dependency Analysis

The following dependencies must be resolved before a buyer catalog browse implementation can be
authorized:

### Blocking dependencies (must be resolved)

| Dependency | Current state | Blocker type |
|-----------|---------------|--------------|
| Product decision authorizing buyer catalog discovery | **ABSENT** | D-016 — ZERO_OPEN_DECISION_CONTROL |
| Supplier publicationPosture management via API | **ABSENT** | API governance gap — PATCH route excludes publicationPosture |
| Buyer-supplier visibility model decision (open posture-gated vs. relationship-scoped) | **UNDECIDED** | Product decision required |

### Non-blocking dependencies (resolved or compatible)

| Dependency | State | Notes |
|-----------|-------|-------|
| DB schema `publicationPosture` field | EXISTS | Present on `catalog_items`; just not manageable via API |
| `texqtic_rfq_read` DB role (cross-tenant pattern) | EXISTS | Proven in `resolveRfqCatalogItemTarget()`; reusable pattern |
| `buyerCatalog` capability type | TYPED | In `FeatureCapabilities`; just needs to be enabled for `B2B_WORKSPACE` |
| Cursor-based pagination | EXISTS | On `GET /api/tenant/catalog/items`; can serve as template |
| RFQ creation from catalog item | OPERATIONAL | `POST /api/tenant/rfqs` with `catalogItemId` — works once item ID is known |
| Buyer RFQ list and detail surfaces | VERIFIED_COMPLETE | Full buyer RFQ layer is operational |

---

## 12. Launch-Readiness Classification

**Overall classification: NOT READY — Product decision absent; multi-layer gap; API governance block**

| Dimension | Readiness | Notes |
|-----------|-----------|-------|
| Product decision | ❌ ABSENT | No `PRODUCT-DEC-BUYER-CATALOG-DISCOVERY` or equivalent; required before any implementation |
| Supplier posture management API | ❌ ABSENT | Prerequisite: supplier must be able to mark items as buyer-discoverable |
| Backend buyer browse route | ❌ ABSENT | New authenticated cross-tenant read route required |
| Frontend buyer catalog service | ❌ ABSENT | New service function in `catalogService.ts` or separate file required |
| App.tsx buyer catalog surface | ❌ ABSENT | New route, state, handlers, and render surface required |
| Runtime manifest `buyerCatalog` capability | ⚠️ TYPED | Present as a type; must be enabled for `B2B_WORKSPACE` |
| Schema field for posture | ✅ EXISTS | `publicationPosture` on `catalog_items` already present |
| Cross-tenant DB access pattern | ✅ EXISTS | `texqtic_rfq_read` role pattern is proven and reusable |
| Existing public B2B Discovery page | ✅ OPERATIONAL | For anonymous discovery only — NOT reusable as buyer catalog browse |
| Buyer RFQ workflow (post-discovery) | ✅ OPERATIONAL | Works once buyer has an item ID |

---

## 13. Exact Missing Pieces

In order of implementation dependency:

1. **Product decision** (Paresh, owner-level): Authorize buyer catalog discovery as a feature;
   define access model (open posture-gated vs. relationship-scoped); confirm whether supplier
   must proactively publish items or whether all active items are discoverable.

2. **`publicationPosture` patchability** (backend API change): Enable suppliers to patch
   `publicationPosture` via `PATCH /api/tenant/catalog/items/:id`. Currently explicitly
   excluded. Requires:
   - Adding `publicationPosture` to the PATCH body schema with a restricted enum
   - Updating the OpenAPI contract
   - Updating the frontend edit modal and TypeScript `CatalogItem` interface

3. **Authenticated buyer catalog browse route** (backend, new): A new authenticated route
   (e.g., `GET /api/tenant/catalog/supplier/:supplierSlug/items`) that:
   - Verifies caller auth via `tenantAuthMiddleware`
   - Reads supplier catalog items cross-tenant using a bounded DB role (pattern from
     `texqtic_rfq_read`)
   - Filters by `publicationPosture IN ('B2B_PUBLIC', 'BOTH')` AND `active = true`
   - Returns safe fields: id, name, sku, description, moq, imageUrl — omits price if desired
     for Phase 2; or includes price as a B2B-authenticated disclosure
   - Supports cursor-based pagination and optional `q` search
   - Must be added to the OpenAPI tenant contract

4. **Buyer catalog browse service function** (frontend): New function in `catalogService.ts` or
   a dedicated `buyerCatalogService.ts` for the new route.

5. **`buyerCatalog` capability enabled for `B2B_WORKSPACE`** (runtime/sessionRuntimeDescriptor.ts):
   Add `capabilities.feature.buyerCatalog = true` to the `B2B_WORKSPACE` case in
   `buildRuntimeCapabilities()`.

6. **New route registered in `catalog_browse` route group** (runtime/sessionRuntimeDescriptor.ts):
   A second route entry (e.g., `buyer_catalog_browse` or `supplier_browse`) within the
   `catalog_browse` group or a new group.

7. **App.tsx buyer catalog state and surface** (frontend): New state variables, handlers,
   and render case for the buyer catalog browse surface within the B2B workspace. At minimum:
   supplier selection surface (or navigation to a known supplier), item grid, and an
   "Initiate RFQ" action per item.

8. **Updated TypeScript interface** (`CatalogItem` or new `BuyerCatalogItem`): Add
   `publicationPosture` to the relevant type; confirm price inclusion/exclusion.

---

## 14. Recommended First Bounded Implementation Unit

**Title:** `TECS-B2B-BUYER-CATALOG-BROWSE-001` (subject to product decision naming)

**Preconditions (must be satisfied before this unit opens):**
- Product decision issued by Paresh authorizing buyer catalog browse
- `publicationPosture` management slice completed OR product decision confirms all active items
  are open to buyer browse regardless of posture (simpler model, but changes intent of the field)

**Minimal scope (if authorized):**

### Backend slice
- Add `GET /api/tenant/catalog/supplier/:supplierOrgId/items` to `server/src/routes/tenant.ts`
- Auth: `tenantAuthMiddleware` + `databaseContextMiddleware` (caller must be authenticated)
- Cross-tenant read: use transaction-local `texqtic_rfq_read` role (same pattern as
  `resolveRfqCatalogItemTarget`)
- Filter: `tenantId = supplierOrgId`, `active = true`,
  `publicationPosture IN ('B2B_PUBLIC', 'BOTH')`
- Pagination: cursor-based, `limit` 1–100, default 20
- Response: `{ items: BuyerCatalogItem[], count: number, nextCursor: string | null }`
- Safe fields only: `id`, `name`, `sku`, `description`, `moq`, `imageUrl` (price deferred
  to a subsequent slice with explicit product decision on B2B pricing disclosure)
- OpenAPI contract: add new route to `openapi.tenant.json`
- No bulk search across multiple suppliers; scope is single-supplier browse only

### Frontend slice
- Enable `buyerCatalog` capability for `B2B_WORKSPACE` in `sessionRuntimeDescriptor.ts`
- Register a new route (e.g., `buyer_catalog`) in the `catalog_browse` route group of
  `b2b_workspace`
- New service function: `getBuyerCatalogItems(supplierOrgId, params?)` in `catalogService.ts`
- New App.tsx state: `buyerCatalogItems`, `buyerCatalogSupplierOrgId`, loading/error states
- New render surface in B2B workspace: read-only item grid (name, SKU, MOQ, description,
  image); "Request Quote" button per item that pre-populates `catalogItemId` for RFQ creation
- Entry point: from B2B workspace, after navigating to a known supplier (supplier selection
  surface is a subsequent slice)

### Excluded from first unit
- Supplier search / browse to select which supplier to view
- Price disclosure (deferred — requires explicit product decision on B2B pricing visibility)
- Category / faceted search
- Item detail page
- Buyer-supplier relationship management or allowlisting
- `publicationPosture` management for suppliers (prerequisite — separate prior slice)

---

## 15. Recommended Sequencing After First Unit

This sequencing is guidance only. Each step requires an explicit product decision before opening.

| Sequence | Unit title | Precondition | Scope |
|----------|-----------|--------------|-------|
| 0 | `publicationPosture` supplier management | Product decision | PATCH endpoint + UI toggle; TypeScript interface + OpenAPI update |
| 1 | Buyer catalog browse — single supplier (first unit above) | (0) complete + product decision | Backend route + frontend surface |
| 2 | Supplier selection surface for buyer | (1) complete + product decision | How does a buyer navigate to a specific supplier? (from RFQ workflow? from public discovery sign-in CTA?) |
| 3 | Buyer catalog search within supplier | (1) complete + product decision | `q` search param surfaced in frontend |
| 4 | Price disclosure in buyer catalog view | Explicit product decision on B2B pricing | Add `price` to buyer catalog response |
| 5 | Buyer-supplier relationship / allowlisting | Explicit product decision on access model | Schema addition; route guards |

---

## 16. What Must NOT Be Mixed Into the First Implementation Cycle

The following are out of scope for the first buyer catalog browse unit and must not be included
even if "convenient":

- Any change to the RFQ domain routes or negotiation workflow
- `publicationPosture` management (prerequisite — separate prior slice, own governance unit)
- Supplier profile pages or supplier detail views
- Price display logic (requires separate product decision on B2B pricing disclosure)
- Any B2C storefront, WL storefront, or public projection changes
- Category taxonomy or faceted browse (phantom field — requires schema change + product decision)
- Buyer-supplier relationship tables or allowlisting (architectural decision needed first)
- Bulk operations or multi-supplier catalog aggregation
- Cart, checkout, or order creation from buyer catalog browse
- Any Aggregator domain surfaces

---

## 17. Governance Posture and Next Action

**D-016 is active.** No implementation unit for Buyer Catalog Discovery may open without an
explicit product decision from the operator (Paresh).

**TECS gate status for this feature:**
- No existing `PRODUCT-DEC-BUYER-CATALOG-DISCOVERY` decision exists in the repo
- No governance unit for buyer catalog discovery is open or planned
- The feature is architecturally anticipated (typed capability, route group classification)
  but is not in any current delivery plan

**Required before this feature may be sequenced:**

1. Operator decision: authorize Buyer Catalog Discovery with explicit access model choice
2. Prerequisite decision: authorize `publicationPosture` management on supplier API OR
   authorize all-active-items open discovery model
3. TECS gate entry: open `TECS-B2B-BUYER-CATALOG-BROWSE-000` (or equivalent) as the
   product decision unit; then open `TECS-B2B-BUYER-CATALOG-BROWSE-001` as the first
   implementation unit

---

## 18. Summary of Findings

1. **Authenticated B2B Buyer Catalog Discovery does not exist at any layer of the repo.** No
   backend route, no frontend service, no App.tsx surface, no runtime manifest route, and no
   product decision authorizes it.

2. **Public B2B Supplier Discovery is operational and distinct.** `GET /api/public/b2b/suppliers`
   serves unauthenticated org-level supplier profile discovery. It is not a buyer catalog browse
   surface and cannot be reused as one.

3. **The `buyerCatalog` feature capability is typed but not enabled for B2B_WORKSPACE.** This
   is architecturally intentional — the capability exists as a future extension point, not an
   oversight.

4. **Cross-tenant catalog reads are technically feasible** via the `texqtic_rfq_read` DB role
   pattern proven in `resolveRfqCatalogItemTarget()`. This pattern can serve as the technical
   foundation for a buyer browse route.

5. **Two prerequisites block the first implementation unit:**
   - A product decision authorizing buyer catalog discovery (D-016 blocks without it)
   - Supplier ability to manage `publicationPosture` on items (currently locked at default
     `PRIVATE_OR_AUTH_ONLY` with no API path to change it)

6. **The schema is largely sufficient for a minimal implementation.** `publicationPosture` exists
   on `catalog_items`; `tenantId` identifies the supplier; all buyer-relevant fields (name, sku,
   description, moq, imageUrl) exist. No schema migrations are required for the minimal unit.

7. **The safest first bounded unit** is a read-only, single-supplier, posture-gated catalog item
   list route with no price disclosure — closely scoped to the existing `texqtic_rfq_read` role
   pattern and the existing cursor-based pagination model.

---

*Artifact only. No implementation was authorized or begun by this document. All implementation
requires explicit operator product decision and TECS governance unit opening.*

*Last updated: 2026-07-14 — TexQtic TECS investigation corpus.*
