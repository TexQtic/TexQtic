# PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001
## Comprehensive Product Path and Phased Authorization for Authenticated B2B Buyer Catalog Discovery

**Decision ID:** PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001  
**Title:** Authenticated B2B Buyer Catalog Discovery — Comprehensive path, access model, visibility model, price disclosure model, phased sequence, and first implementation unit  
**Status:** DECIDED  
**Date:** 2026-04-23  
**Authorized by:** Paresh  
**Decision class:** Product authorization + comprehensive path definition + phased implementation authorization  
**D-016 posture consumed:** YES — this is the operator product decision required by D-016 for this feature direction  
**Governance posture at decision time:** `HOLD-FOR-BOUNDARY-TIGHTENING` / `ZERO_OPEN_DECISION_CONTROL` (D-016 active)

---

## 1. Purpose

This decision record defines the **complete product direction** for Authenticated B2B Buyer
Catalog Discovery: what it is intended to become at maturity, how it will be reached through
bounded implementation phases, what the access, visibility, and price disclosure models are,
what the first authorized implementation unit is, and what is explicitly deferred.

This record exists because the completed repo investigation
(`docs/TEXQTIC-B2B-BUYER-CATALOG-DISCOVERY-INVESTIGATION-v1.md`) established that Buyer Catalog
Discovery is:
- absent at every implementation layer,
- architecturally anticipated (typed `buyerCatalog` capability, `catalog_browse` route group),
- technically feasible (proven `texqtic_rfq_read` cross-tenant pattern),
- commercially important for launch acceleration,
- and blocked strictly by missing product authorization under D-016.

This document resolves that block. It does not implement anything. It authorizes a path,
defines bounded phases, and names exactly one first implementation unit.

---

## 2. Decision Context

### 2.1 Current posture

**CONFIRMED REPO TRUTH:** The B2B workspace is currently supplier-role dominant:

- `capabilities.feature.sellerCatalog = true` — the primary B2B catalog surface is a seller surface
- `capabilities.feature.rfq = true` — buyer RFQ initiation is operational at pre-negotiation boundary
- `capabilities.feature.buyerCatalog` NOT SET — buyer catalog browse is architecturally typed but
  intentionally disabled for `B2B_WORKSPACE`

**CONFIRMED REPO TRUTH:** The existing sourcing workflow has a critical break: a B2B buyer must
already know a supplier's `catalogItemId` UUID to initiate an RFQ. There is no discovery surface
between "I want to source from this supplier" and "I create an RFQ." The only bridge is the
unauthenticated public B2B Supplier Discovery page — which shows org-level supplier profiles
with a preview of up to five items (name, MOQ, imageUrl only; no price, no description, no item
detail, no direct RFQ action). Once signed in, the discovery context is lost.

**CONFIRMED REPO TRUTH:** The authenticated RFQ creation flow at `POST /api/tenant/rfqs` already
accepts `catalogItemId` and the full buyer RFQ list + detail layer is `VERIFIED_COMPLETE`. The
post-discovery workflow (RFQ initiation from a known item) is operational. The only gap is the
discovery layer preceding it.

**CONFIRMED REPO TRUTH:** No product decision authorizing Authenticated B2B Buyer Catalog
Discovery exists anywhere in the governance corpus prior to this record.

**CONFIRMED REPO TRUTH:** `publicationPosture` is a field on `catalog_items` (default
`PRIVATE_OR_AUTH_ONLY`). It is stored but inert at the supplier API layer — the PATCH route
explicitly excludes it, and suppliers have no current mechanism to change it per item. All
existing items are at default posture.

**CONFIRMED REPO TRUTH:** The `texqtic_rfq_read` DB role pattern (transaction-local `SET LOCAL
ROLE`) enables cross-tenant catalog reads without bypassing RLS in an unsafe way. This pattern
is proven in `resolveRfqCatalogItemTarget()` and is the technical foundation for any
authenticated buyer browse route.

### 2.2 What this decision must resolve

The investigation identified two purported blocking prerequisites for the first implementation
unit:

1. An explicit product decision authorizing buyer catalog discovery
2. Supplier ability to manage `publicationPosture` per item (as a prerequisite for the
   visibility gate to function)

This decision resolves both. Item (1) is resolved by this record. Item (2) is resolved by the
visibility model decision below (§7), which eliminates the need for per-item posture management
in the first implementation slice by adopting the authenticated-buyer interpretation of the
`PRIVATE_OR_AUTH_ONLY` posture value.

---

## 3. Repo-Truth Summary

| Layer | Status |
|-------|--------|
| Product decision authorizing buyer catalog discovery | **CONFIRMED REPO TRUTH: ABSENT prior to this record** |
| Backend authenticated cross-tenant browse route | **CONFIRMED REPO TRUTH: ABSENT** |
| Frontend buyer catalog browse service | **CONFIRMED REPO TRUTH: ABSENT** |
| App.tsx buyer catalog state machine and surface | **CONFIRMED REPO TRUTH: ABSENT** |
| Runtime manifest `buyerCatalog` route for B2B_WORKSPACE | **CONFIRMED REPO TRUTH: NOT REGISTERED** |
| `buyerCatalog` capability for B2B_WORKSPACE | **CONFIRMED REPO TRUTH: NOT SET (typed; defaults false)** |
| Per-item `publicationPosture` patchable via supplier API | **CONFIRMED REPO TRUTH: ABSENT (PATCH explicitly excludes it)** |
| `publicationPosture` field on `catalog_items` | **CONFIRMED REPO TRUTH: EXISTS (default PRIVATE_OR_AUTH_ONLY)** |
| Cross-tenant catalog read via `texqtic_rfq_read` role | **CONFIRMED REPO TRUTH: PROVEN (resolveRfqCatalogItemTarget)** |
| Buyer RFQ initiation workflow (post-discovery) | **CONFIRMED REPO TRUTH: OPERATIONAL** |
| Buyer RFQ list + detail (post-discovery) | **CONFIRMED REPO TRUTH: VERIFIED_COMPLETE** |
| Public B2B Supplier Discovery (unauthenticated, org-level) | **CONFIRMED REPO TRUTH: OPERATIONAL** |
| Supplier catalog CRUD (seller-side) | **CONFIRMED REPO TRUTH: OPERATIONAL** |
| Supplier-side catalog field hardening | **CONFIRMED REPO TRUTH: VERIFIED_COMPLETE (CATALOG-ALIGNMENT-HARDENING-001)** |
| Orders domain (B2B) | **CONFIRMED REPO TRUTH: OPERATIONAL after RLS write unblock** |

---

## 4. Why This Capability Matters for Launch Acceleration

### 4.1 The sourcing blind-spot

B2B launch readiness requires a functional end-to-end sourcing flow. The current flow is:

```
Public supplier directory (unauthenticated)
  → Sign in (authentication drop-off; discovery context lost)
    → RFQ creation dialog (requires knowing a catalogItemId already)
      → RFQ list + detail (VERIFIED_COMPLETE)
        → Supplier response (BASIC OPERATIONAL)
```

The authenticated buyer is operating blind from sign-in to RFQ creation. They have no way to
browse, search, compare, or discover supplier catalog items after logging in. This is not a
deferred enhancement — it is a structural gap in the core sourcing workflow.

### 4.2 What buyer catalog discovery enables

Authenticated Buyer Catalog Discovery closes the gap between sign-in and RFQ initiation:

```
Authenticated B2B buyer
  → Navigates to supplier catalog (NEW — this decision authorizes)
    → Browses active, buyer-visible items (NEW)
      → Selects an item
        → Initiates RFQ with pre-populated catalogItemId (EXISTING — operational)
          → RFQ list + detail (VERIFIED_COMPLETE)
```

Without this, the B2B workspace cannot be confidently presented to buyers in a product demo
or launch context. With it, the core B2B sourcing loop is complete.

### 4.3 Catalog → Buyer sourcing → RFQ → Orders continuity

This capability is the missing link in the B2B commerce continuity chain:

| Step | Status |
|------|--------|
| Supplier catalog management (seller-side) | OPERATIONAL |
| **Buyer catalog discovery (this decision)** | **NOT YET IMPLEMENTED — this decision authorizes** |
| RFQ initiation from discovered item | OPERATIONAL |
| Buyer RFQ list + detail | VERIFIED_COMPLETE |
| Supplier RFQ inbox + first response | BASIC OPERATIONAL |
| Orders lifecycle (post-checkout) | OPERATIONAL |

Enabling buyer catalog discovery means a B2B tenant can: manage their catalog as a supplier,
and as a buyer, discover another supplier's catalog, initiate an RFQ from a specific item,
receive a response, and proceed through the full commerce continuity chain.

---

## 5. Comprehensive Intended Product Path

**COMPREHENSIVE PATH**

The intended end-state for Authenticated B2B Buyer Catalog Discovery is:

> Any authenticated B2B workspace tenant member can browse supplier catalogs within the
> TexQtic platform, discover items relevant to their sourcing needs, search and filter
> across a supplier's catalog, view item detail (name, SKU, MOQ, description, image), and
> initiate an RFQ directly from an item card — creating a seamless discovery-to-sourcing
> workflow without leaving the authenticated workspace.

### 5.1 End-state capabilities (comprehensive, not slice-scoped)

| Capability | End-state intent | Phase |
|-----------|-----------------|-------|
| Buyer navigates to a supplier catalog from within B2B workspace | YES — from RFQ workflow or supplier selection surface | Phase 1–2 |
| Buyer browses active, buyer-visible supplier items (paginated) | YES | Phase 1 |
| Buyer sees: name, SKU, MOQ, description, imageUrl per item | YES | Phase 1 |
| Buyer initiates RFQ from item card (pre-populated catalogItemId) | YES | Phase 1 |
| Buyer sees price per item | YES — but only after explicit Phase 4 authorization | Phase 4 |
| Buyer searches within supplier catalog (text query) | YES | Phase 3 |
| Buyer filters by active/status | YES | Phase 3 |
| Item detail page | YES — bounded, single-item view | Phase 3 |
| Supplier selection surface (browse all eligible suppliers) | YES — buyer navigates to a known or discovered supplier | Phase 2 |
| Multi-supplier aggregated catalog browse | DEFERRED — requires architectural decision | Deferred |
| Saved sourcing / shortlist behavior | DEFERRED | Deferred |
| Buyer-supplier access allowlisting | DEFERRED — open posture-gated model first | Deferred |
| RFQ negotiation / acceptance / pricing from discovery | OUT OF SCOPE — governed by PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP | Out of scope |

### 5.2 Relationship to existing system surfaces

- **Public B2B Supplier Discovery (`GET /api/public/b2b/suppliers`)**: Preserved as-is;
  unauthenticated entry point; org-level profiles only. Not replaced or extended by this feature.
  The sign-in CTA in `B2BDiscovery.tsx` may later serve as an entry point to authenticated
  supplier catalog browse, but this linkage is a Phase 2 UX decision, not a Phase 1 task.

- **Supplier catalog management**: Unchanged. This decision does not alter how suppliers manage
  their catalog. The seller-side CRUD surface remains supplier-only.

- **WL Storefront `buyerCatalog`**: Unchanged. WL Storefront already has `buyerCatalog = true`
  for its single-tenant B2C-adjacent context. The B2B workspace buyer catalog browse is a
  distinct multi-tenant cross-org capability.

---

## 6. Access Model Decision

**DECISION**

**Chosen model: Open posture-gated (Phase 1 and Phase 2), relationship-scoped as Phase 5 enhancement**

Any authenticated B2B workspace tenant member may browse the catalog items of any supplier
whose **org-level publication posture** is eligible, subject to the item-level visibility gate
defined in §7 below.

There is no buyer-supplier pre-approval or allowlist requirement for Phase 1 or Phase 2.
Access is open to all authenticated B2B workspace tenants for all eligible supplier catalogs.

### Justification

1. **Launch acceleration**: Open posture-gated is the simplest model; it requires no new
   relational schema (no org-to-org allowlist table), no supplier approval workflow, and no
   per-buyer permission management. It is deliverable in the first implementation phase.

2. **Supply-side intent alignment**: Suppliers who have set their org publication posture to
   `B2B_PUBLIC` or `BOTH` have already expressed intent to be discoverable by B2B buyers. The
   access model matches their expressed intent.

3. **Precedent**: The public B2B supplier directory uses an analogous model — any anonymous
   visitor can see any eligible supplier's org profile. The authenticated buyer browse model
   extends this to item-level, gated by authentication and org posture.

4. **Deferability**: Buyer-supplier relationship controls (allowlists, approved counterparties)
   can be added later as a Phase 5 refinement without restructuring Phase 1–4 implementation.

### Phase 5 access model (DEFERRED)

**DEFERRED**: Relationship-scoped access (buyer org must have an established relationship with
supplier org to browse their catalog) is explicitly deferred to Phase 5 and requires its own
separate product decision and schema design before it may be implemented.

---

## 7. Visibility Model Decision

**DECISION**

**Chosen model: Org-posture-gated + authenticated-buyer item unlock (Phase 1). Per-item posture management deferred to Phase 2.**

### Gate 1 — Org-level visibility gate (Phase 1)

The supplier's organization must have:
- `org.publication_posture IN ('B2B_PUBLIC', 'BOTH')`
- `org.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'`

If the supplier org does not meet this gate, no items are returned to the buyer browse route.

### Gate 2 — Item-level visibility gate (Phase 1)

All active items of an eligible supplier org are visible to authenticated B2B buyers:
- `catalog_item.active = true`
- `catalog_item.tenantId = supplierOrgId`

The `PRIVATE_OR_AUTH_ONLY` posture value on catalog items is interpreted in its literal
meaning: items at this posture are **private to unauthenticated users** but **visible to
authenticated (AUTH_ONLY) users**. An authenticated B2B workspace tenant is an authenticated
user. Therefore, items at `PRIVATE_OR_AUTH_ONLY` posture are buyer-visible at the
authenticated layer.

This interpretation:
1. **Eliminates the chicken-and-egg problem** identified in the investigation (suppliers cannot
   currently patch publicationPosture per item, so all items are at PRIVATE_OR_AUTH_ONLY
   default; without this interpretation, buyer browse returns zero results for all suppliers).
2. **Requires no schema changes** — `PRIVATE_OR_AUTH_ONLY` is already the default and will
   read correctly.
3. **Requires no per-item posture management** for Phase 1 — the prerequisite slice identified
   in the investigation is NOT required before Phase 1 can proceed.
4. **Is semantically consistent** with the posture value name: "private OR auth only" = visible
   to authenticated callers.

Items explicitly set to `B2C_PUBLIC` or `BOTH` are also buyer-visible (they are at least as
visible as `PRIVATE_OR_AUTH_ONLY` in the authenticated context).

### Phase 2 visibility refinement (DEFERRED)

**DEFERRED**: Per-item publication posture management (supplier can mark individual items as
explicitly hidden from buyer browse, or as specifically promoted) requires:
- Adding `publicationPosture` to the PATCH body schema for `PATCH /api/tenant/catalog/items/:id`
- A `BUYER_HIDDEN` or `BUYER_EXCLUDED` posture value (not currently in the posture set)
- Frontend UI toggle in the supplier catalog edit modal

This is DEFERRED to Phase 2 and requires its own product decision clarifying the per-item
posture enum extension before implementation.

### Summary: Phase 1 visible item set

An authenticated B2B buyer browsing supplier `S` (org-eligible) will see all items where:
- `catalog_item.tenantId = S.id`
- `catalog_item.active = true`

No per-item posture filter is applied in Phase 1.

---

## 8. Price Disclosure Decision

**DECISION**

**Phased model: No price in Phase 1 (slice 1). Price visible in Phase 4 after explicit authorization.**

### Phase 1 — No price

The buyer catalog browse response for Phase 1 MUST NOT include `price`. The response is
limited to: `id`, `name`, `sku`, `description`, `moq`, `imageUrl`.

**Rationale:**
1. B2B pricing is sensitive and supplier-specific; many B2B commercial models treat price as
   negotiation-dependent rather than a published catalog price.
2. Price is already available to authenticated buyers within RFQ responses (post-negotiation).
   Pre-negotiation price disclosure is a separate product decision.
3. The existing public B2B projection already excludes price (Gate E of
   `publicB2BProjection.service.ts`). Maintaining price exclusion at Phase 1 is consistent
   with the existing platform posture.
4. Price can be added in a bounded Phase 4 slice once a separate decision authorizes B2B
   pricing disclosure.

### Phase 4 — Price disclosure authorization (DEFERRED)

**DEFERRED**: Adding `price` to the buyer catalog browse response requires:
- An explicit separate product decision authorizing B2B price disclosure in authenticated browse
- Consideration of whether price is shown to all authenticated buyers or only to those with
  established supplier relationships (ties to Phase 5 access model)

---

## 9. UX Path Decision

**DECISION**

### Comprehensive intended UX path (end-state)

The end-state UX path for authenticated B2B Buyer Catalog Discovery:

```
[Option A — from RFQ workflow]
B2B workspace → "Create RFQ" → "Browse supplier catalog" → Supplier catalog view
  → Item card → "Request Quote" → Pre-populated RFQ creation dialog

[Option B — from workspace navigation]
B2B workspace → "Buyer Catalog" route → Supplier selection surface
  → Supplier catalog view → Item search/filter
    → Item card → "Request Quote" → Pre-populated RFQ creation dialog
    → Item card → "View detail" → Item detail page

[Option C — from public discovery continuation]
Public B2B Discovery page → Sign in CTA → Authenticated workspace
  → Last-viewed supplier catalog (continuation seam — later phase)
```

All three UX paths are part of the comprehensive intended end-state. Path A and B use the
authenticated in-session catalog surface. Path C represents the public-to-authenticated
continuation seam (Phase 5 or later).

### Phase 1 authorized UX (AUTHORIZED FIRST UNIT)

Phase 1 is intentionally minimal:
- Buyer navigates to the `buyer_catalog` route within the B2B workspace
- Buyer **explicitly provides a known `supplierOrgId`** (via route state or a simple input) —
  no supplier selection surface in Phase 1
- Buyer sees a read-only paginated item grid: name, SKU, MOQ, description, imageUrl
- Each item card has a **"Request Quote"** button that pre-populates `catalogItemId` in the
  existing RFQ creation dialog
- No search, no filter, no item detail page, no price, no supplier browse in Phase 1

**Rationale for minimal Phase 1 UX**: The core value proposition — closing the gap between
sign-in and RFQ initiation with a real item ID — is delivered without requiring a supplier
selection surface, search infrastructure, or item detail pages. All of those are enhancements
that can be phased in.

### Phase 2 authorized UX (AUTHORIZED PHASE — not yet open)

Phase 2 adds supplier selection: a surface within the B2B workspace where the authenticated
buyer can see or search for eligible suppliers before entering their catalog. This depends on
the public B2B supplier projection data (already operational) adapted for the authenticated
context.

---

## 10. Options Considered

### Option A: Per-item posture management as hard prerequisite

**Description**: Require the supplier to be able to patch `publicationPosture` per item before
any buyer browse feature can launch. This was the framing from the investigation.

**Rejected because**:
- Creates a chicken-and-egg delay: buyer browse cannot ship until every supplier has been able
  to review and explicitly publish their items.
- All items are at `PRIVATE_OR_AUTH_ONLY` default, which already semantically covers the
  authenticated case.
- The prerequisite slice has no time-bound, blocking launch indefinitely.

**Replacement**: The visibility model decision in §7 eliminates this prerequisite by interpreting
`PRIVATE_OR_AUTH_ONLY` as visibly appropriate for authenticated buyers. Per-item posture
management becomes a Phase 2 refinement.

### Option B: Relationship-scoped access from day one

**Description**: Require a buyer-supplier relationship record before any cross-tenant browse.

**Rejected because**:
- Requires a new schema table (no existing relationship model between buyer orgs and
  supplier orgs exists)
- Requires new CRUD APIs for relationship management
- Adds implementation complexity and delay for no clear business benefit at Phase 1 where
  buyer and supplier orgs are known to each other (initial B2B tenants are seeded relationships)

**Replacement**: Open posture-gated access (§6) for Phase 1–4, with relationship-scoped
access as a Phase 5 optional enhancement.

### Option C: Expose all active items with no posture gate at all

**Description**: Skip `publicationPosture` entirely; make all active supplier catalog items
visible to any authenticated buyer.

**Rejected because**:
- Ignores supplier intent signal entirely; suppliers who have not set their org to
  `B2B_PUBLIC` have not expressed intent to be discoverable
- Creates a surprise for suppliers whose org is in `PRIVATE_OR_AUTH_ONLY` at the org level
- Inconsistent with the five-gate model of the public projection service

**Replacement**: The org-level posture gate in §7 Gate 1 preserves supplier intent signal at
the org level without requiring per-item management.

### Option D (CHOSEN): Org-posture gate + authenticated-buyer item unlock

**Description**: Use org-level posture as the eligibility gate; interpret all active items of
eligible supplier orgs as buyer-visible to authenticated callers (per `PRIVATE_OR_AUTH_ONLY`
literal meaning).

**Chosen because**: Matches semantic intent of existing posture values, requires no schema
changes, eliminates the prerequisite slice blocker, and preserves supplier intent at the org
level.

---

## 11. Phased Implementation Plan

**AUTHORIZED PHASE** — each phase requires a separate implementation unit to be opened via
TECS governance. This decision authorizes the phased path and the first unit; subsequent units
require their own opening decisions per D-016 and the TECS lifecycle.

| Phase | Unit name (proposed) | Scope | Status |
|-------|---------------------|-------|--------|
| Phase 0 | (NONE — prerequisite eliminated) | Per-item publicationPosture management was the identified prerequisite; this decision eliminates it for Phase 1 | BYPASSED by §7 decision |
| Phase 1 | `TECS-B2B-BUYER-CATALOG-BROWSE-001` | Backend cross-tenant browse route + frontend minimal surface + capability enable + route manifest entry | **AUTHORIZED — see §12** |
| Phase 2 | `TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001` | Supplier selection surface within B2B workspace; buyer can navigate to any eligible supplier without knowing supplierOrgId in advance | FOLLOW-ON UNIT — requires §12 complete |
| Phase 3 | `TECS-B2B-BUYER-CATALOG-SEARCH-001` | `q` search parameter; item filter by active/status; item detail page | FOLLOW-ON UNIT — requires Phase 2 complete |
| Phase 4 | `TECS-B2B-BUYER-CATALOG-PRICE-DISCLOSURE-001` | Price field added to buyer browse response; requires separate price-disclosure product decision | DEFERRED — requires separate product decision |
| Phase 5 | `TECS-B2B-BUYER-CATALOG-POSTURE-MGMT-001` | Per-item publicationPosture patchable from supplier API; item-level buyer-hidden posture; supplier UI toggle | DEFERRED — requires separate product decision |
| Phase 6 | `TECS-B2B-BUYER-CATALOG-ALLOWLIST-001` | Buyer-supplier relationship / allowlist model; relationship-scoped access controls | DEFERRED — requires schema design and separate product decision |

### Phase sequencing rationale

- **Phase 1 first**: Delivers core discovery value (item browse + RFQ initiation) with zero
  schema changes and zero infrastructure additions.
- **Phase 2 second**: Supplier selection UX removes the last UX friction (knowing the
  supplierOrgId in advance) without changing the backend model.
- **Phase 3 third**: Search and filter adds buyer convenience but does not change the data model.
- **Phase 4 deferred**: Price disclosure requires its own product decision; depends on the
  commercial model decisions being made about B2B pricing.
- **Phase 5 deferred**: Per-item posture management is a supplier-side refinement; not needed
  for buyer feature delivery.
- **Phase 6 deferred**: Relationship controls are an enterprise enhancement; open posture-gated
  model is sufficient for the B2B launch phase.

---

## 12. Authorized First Implementation Unit

**AUTHORIZED FIRST UNIT**: `TECS-B2B-BUYER-CATALOG-BROWSE-001`

This unit is authorized to open. No prerequisite slice is required.

### 12.1 Backend scope

**File to modify**: `server/src/routes/tenant.ts`

- Add route: `GET /api/tenant/catalog/supplier/:supplierOrgId/items`
- Auth: `tenantAuthMiddleware` + `databaseContextMiddleware` (caller must be an authenticated
  B2B workspace tenant member)
- Cross-tenant read: use a transaction-local `texqtic_catalog_buyer_read` DB role (or
  `texqtic_rfq_read` if the same role covers reads) via `SET LOCAL ROLE` within `prisma.$transaction`
  — exact same pattern as `resolveRfqCatalogItemTarget()`
- Gate 1 (org): supplier org must have `publication_posture IN ('B2B_PUBLIC', 'BOTH')` AND
  `publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` — read from the `Tenant` record for
  `:supplierOrgId`
- Gate 2 (item): `catalog_item.tenantId = supplierOrgId` AND `catalog_item.active = true`
- Response shape: `{ items: BuyerCatalogItem[], count: number, nextCursor: string | null }`
- Response fields per item: `id`, `name`, `sku`, `description`, `moq`, `imageUrl` — no `price`
- Pagination: cursor-based, `limit` 1–100, default 20
- No `q` search param in Phase 1
- Must return 404 if `:supplierOrgId` does not exist or fails org gate (do NOT reveal which
  gate failed — consistent 404 for non-eligible or non-existent suppliers)

**File to modify**: `shared/contracts/openapi.tenant.json`

- Add `GET /api/tenant/catalog/supplier/{supplierOrgId}/items` to the OpenAPI tenant contract
- Define `BuyerCatalogItem` schema (without price)
- Define query params: `limit`, `cursor`
- Define response schema

### 12.2 Frontend scope

**File to modify**: `runtime/sessionRuntimeDescriptor.ts`

- Add `capabilities.feature.buyerCatalog = true` to the `B2B_WORKSPACE` case in
  `buildRuntimeCapabilities()`
- Register a new route `buyer_catalog` (or `supplier_browse`) in the `catalog_browse` route
  group of `b2b_workspace`

**File to modify or create**: `services/catalogService.ts` or new `services/buyerCatalogService.ts`

- New function: `getBuyerCatalogItems(supplierOrgId: string, params?: { limit?: number; cursor?: string })`
- Returns: `{ items: BuyerCatalogItem[], count: number, nextCursor: string | null }`
- Interface: `BuyerCatalogItem { id: string; name: string; sku?: string; description?: string; moq: number; imageUrl?: string }`

**File to modify**: `App.tsx`

- New state: `buyerCatalogItems: BuyerCatalogItem[]`, `buyerCatalogSupplierOrgId: string | null`,
  `buyerCatalogLoading: boolean`, `buyerCatalogError: string | null`, cursor/pagination state
- New handler: `handleFetchBuyerCatalog(supplierOrgId: string, cursor?: string)` — calls
  `getBuyerCatalogItems`; populates `buyerCatalogItems`
- New render case: within the `b2b_workspace` render path, when route key is `buyer_catalog`:
  - Supplier org ID entry (text input or passed via route state)
  - Read-only item grid: name, SKU, MOQ, description, imageUrl
  - Each card: "Request Quote" button that calls existing RFQ creation dialog with
    pre-populated `catalogItemId`
  - Pagination controls (next cursor)
  - Loading and error states

### 12.3 Allowlist for TECS-B2B-BUYER-CATALOG-BROWSE-001

When the implementation prompt for this unit is issued, the **exact allowlist** must include:

- `server/src/routes/tenant.ts`
- `shared/contracts/openapi.tenant.json`
- `runtime/sessionRuntimeDescriptor.ts`
- `services/catalogService.ts` OR `services/buyerCatalogService.ts` (one file, to be decided at
  implementation time)
- `App.tsx`
- Implementation governance doc (to be created at implementation time)

### 12.4 Preconditions for opening this unit

- This product decision record (`PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001.md`) is committed
- No prerequisite implementation slices are required (per §7 visibility model decision)
- The TECS static gate baseline must be verified at implementation open (typecheck + lint)
- The `texqtic_rfq_read` DB role (or equivalent read role) must be confirmed to exist in
  production Supabase before the implementation can be validated

### 12.5 Validation requirements for this unit

- Static gates: `pnpm -C server run typecheck` EXIT 0; `pnpm -C server run lint` no new errors
- Runtime validation:
  - T1: `GET /api/tenant/catalog/supplier/:eligibleSupplierOrgId/items` with valid auth token →
    200 + array of items (at least the items of the seeded B2B supplier tenant)
  - T2: `GET /api/tenant/catalog/supplier/:nonEligibleSupplierOrgId/items` with valid auth → 404
  - T3: `GET /api/tenant/catalog/supplier/:eligibleSupplierOrgId/items` with no auth → 401
  - T4: Existing tenant catalog route `GET /api/tenant/catalog/items` → 200 (no regression)
  - T5: RFQ creation from buyer catalog item card (UI test): verify `catalogItemId` is
    pre-populated in the RFQ dialog

---

## 13. Explicit Exclusions from Phase 1 (Slice 1)

**OUT OF SCOPE** for `TECS-B2B-BUYER-CATALOG-BROWSE-001`:

| Excluded item | Reason |
|--------------|--------|
| Price field in buyer browse response | Deferred to Phase 4; requires separate product decision |
| Supplier selection surface (browsing to find a supplier) | Phase 2; requires separate unit |
| `q` search parameter | Phase 3; requires separate unit |
| Item detail page | Phase 3; requires separate unit |
| Per-item `publicationPosture` management for suppliers | Phase 5; deferred |
| Buyer-supplier allowlist / relationship model | Phase 6; deferred |
| Multi-supplier aggregated browse | Deferred; architectural decision needed |
| Cart, checkout, or order creation from buyer catalog | OUT OF SCOPE — distinct domain |
| Changes to RFQ negotiation or pricing domain | OUT OF SCOPE — PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP governs |
| Changes to public B2B supplier projection | OUT OF SCOPE — separate operational surface |
| `B2BDiscovery.tsx` modification (public page) | OUT OF SCOPE — public surface, distinct from authenticated browse |
| Certification requirements for buyer browse | OUT OF SCOPE for Phase 1 — org eligibility gate is sufficient |
| Saved sourcing / shortlist | Deferred |
| Any WL storefront or B2C storefront changes | OUT OF SCOPE |

---

## 14. Deferred Capabilities and Later Phases

The following capabilities are part of the **comprehensive intended path** but are explicitly
deferred from Phase 1:

**DEFERRED**

| Capability | Phase target | Precondition for opening |
|-----------|-------------|-------------------------|
| Per-item `publicationPosture` management (supplier API + UI) | Phase 5 | Product decision: authorize per-item posture refinement; define `BUYER_EXCLUDED` posture value |
| Price disclosure in buyer browse response | Phase 4 | Separate product decision: authorize B2B authenticated price disclosure |
| `q` text search within supplier catalog | Phase 3 | Phase 2 complete |
| Item detail page | Phase 3 | Phase 2 complete |
| Supplier selection surface (browse/search for eligible suppliers) | Phase 2 | Phase 1 complete |
| Buyer-supplier relationship model and allowlist controls | Phase 6 | Schema design decision; explicit product decision |
| Multi-supplier aggregated catalog browse | TBD | Architectural and product decision |
| Public-to-authenticated discovery continuation seam | TBD | Phase 2 complete + separate UX decision |
| Saved sourcing / shortlist behavior | TBD | Product decision |
| Bulk sourcing (RFQ for multiple items at once) | TBD | Product decision; tied to RFQ expansion |
| RFQ pricing and negotiation from discovery context | OUT OF SCOPE | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP governs; would require separate cap-lift decision |

---

## 15. TECS Lifecycle Effect

### 15.1 D-016 consumption

This record is the explicit operator product decision required by D-016 for Authenticated B2B
Buyer Catalog Discovery. D-016 required that the next opening be a human decision. This
decision satisfies that requirement for this specific feature direction.

**D-016 posture after this record**: D-016 remains formally ACTIVE because `active_delivery_unit`
is still NONE at the time of this decision record. This decision AUTHORIZES the first
implementation unit to be opened; it does not itself open that unit. D-016 is satisfied for
this feature direction once `TECS-B2B-BUYER-CATALOG-BROWSE-001` is formally opened.

### 15.2 Layer 0 control file posture

**Governance control files (NEXT-ACTION.md, OPEN-SET.md, SNAPSHOT.md) are NOT updated by this
record.** A product decision record is a governance artifact in `governance/decisions/`, not a
Layer 0 control plane state change. Layer 0 control files are updated at implementation open
and implementation close, not at product decision creation.

Layer 0 current state remains:
- `active_delivery_unit: NONE`
- `d016_posture: ACTIVE`
- No successor may be opened by inference; `TECS-B2B-BUYER-CATALOG-BROWSE-001` must be
  explicitly opened via a separate implementation opening prompt.

### 15.3 Correct TECS next action

After this decision record is committed:

1. Issue a separate implementation prompt for `TECS-B2B-BUYER-CATALOG-BROWSE-001` with:
   - Full allowlist (§12.3)
   - Approved commands (typecheck + lint + server restart + curl validation)
   - Completion checklist referencing the validation requirements in §12.5
   - Stop conditions referencing this decision record

2. At that point, NEXT-ACTION.md should be updated to reflect `active_delivery_unit:
   TECS-B2B-BUYER-CATALOG-BROWSE-001`.

3. On successful implementation + verification, emit governance closeout and update Layer 0
   to the next state per standard TECS lifecycle.

### 15.4 Successor chain

This decision does not create a D-020 successor-chain artifact (no prior closed unit is being
succeeded; this is a new product direction opening). The phase map in §11 serves as the
carry-forward planning context for future implementation prompts.

---

## Completion Checklist

- [x] I read the Buyer Catalog Discovery investigation first.
- [x] I did not implement code.
- [x] I defined the comprehensive intended path (§5).
- [x] I separated the comprehensive path from the phased implementation sequence (§11).
- [x] I made a clear access-model decision (§6).
- [x] I made a clear visibility-model decision (§7).
- [x] I made a clear price-disclosure decision (§8).
- [x] I authorized exactly one bounded first implementation unit (§12).
- [x] I clearly listed what is deferred (§13, §14).
- [x] I stayed within the approved file scope.
- [x] I assessed whether governance control files require updating (§15.2 — they do not).

---

*Authoritative product decision record. Implementation requires separate TECS opening prompt.  
All implementation remains subject to TECS static gates, runtime validation, and governance close.*

*Last updated: 2026-04-23 — TexQtic governance decisions corpus, main branch.*
