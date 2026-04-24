# TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — Buyer Catalog Search and Filter
## Design Artifact v1

**Unit:** `TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001`
**Phase:** Design / Planning (Design-only cycle — no code changes in this artifact)
**Status:** DESIGN_COMPLETE_AMENDED
**Date:** 2026-04-24
**Amended:** 2026-04-24 — Clarified current cycle as **Keyword Search MVP only**; corrected next-cycle unit name to `TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001`; added mandatory next-cycle carry-forward Section M.
**Author:** GitHub Copilot (governed, Safe-Write Mode)
**Precursor unit:** TECS-B2B-BUYER-CATALOG-LISTING-001 (VERIFIED_COMPLETE, closure commit `ad0407f`)

---

## SCOPE DECLARATION — Keyword Search MVP Only

> This section is the authoritative scope boundary for the current implementation cycle.
> It is mandatory reading before any implementation work begins.

### Current cycle delivers: **Keyword Search MVP**

| Included in this unit | Excluded from this unit |
|---|---|
| `q` param on buyer supplier catalog API | Textile attribute filters of any kind |
| Server-side search by `name` + `sku` | `category` (phantom field — no DB column) |
| Case-insensitive OR match | `fabricType`, `gsm`, `material`, `composition` |
| Supplier-scoped (single selected supplier) | `color`, `width`, `construction`, `certification` |
| Frontend search input in Phase B | MOQ range filter |
| 350 ms debounce + cursor reset | Sort controls |
| Load More passing active `q` | Price display or price-range filter |
| Search-empty state (distinct copy) | Per-item `publicationPosture` filtering |
| 5 implementation slices + new test file | Any schema migration |
| | Cross-supplier search |
| | PDP, RFQ expansion |
| | Any auth / session changes |

**All textile attribute filters are explicitly deferred to the mandatory next-cycle unit.**
See Section M for the carry-forward unit: `TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001`.

---

## 0. Repo-Truth Findings

All design decisions below are grounded in live codebase inspection. No assumptions.

### 0A. Buyer catalog Phase B state — current (`App.tsx` ~line 1889–1895, ~4590–4740)

**State variables (already verified, committed f6ff2a8):**
```ts
buyerCatalogSupplierOrgId: string
buyerCatalogItems: BuyerCatalogItem[]
buyerCatalogLoading: boolean
buyerCatalogError: string | null
buyerCatalogNextCursor: string | null
buyerCatalogLoadingMore: boolean
buyerCatalogLoadMoreError: string | null
```
No search/filter state exists yet.

**Handler: `handleFetchBuyerCatalog(supplierOrgId)`**
Calls `getBuyerCatalogItems(trimmedId)` — no `q` param passed.

**Handler: `handleLoadMoreBuyerCatalog()`**
Calls `getBuyerCatalogItems(buyerCatalogSupplierOrgId, { cursor: buyerCatalogNextCursor })`.
No `q` param passed.

**Phase B empty state (current):**
```
"This supplier has no active catalog items at this time."
"Contact the supplier directly if you expect items to be available."
```
This is the empty-catalog state (no items at all). A distinct "no search results" copy is needed
once search is live.

### 0B. `getBuyerCatalogItems` service contract (`services/catalogService.ts` ~line 328–380)

```ts
export interface BuyerCatalogItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  moq: number;
  imageUrl: string | null;
}

export interface BuyerCatalogResponse {
  items: BuyerCatalogItem[];
  count: number;
  nextCursor: string | null;
}

export interface BuyerCatalogQueryParams {
  limit?: number;
  cursor?: string;
  // NOTE: no `q` field — search not yet wired for buyer catalog
}

export async function getBuyerCatalogItems(
  supplierOrgId: string,
  params: BuyerCatalogQueryParams = {}
): Promise<BuyerCatalogResponse>
```

Endpoint called: `GET /api/tenant/catalog/supplier/{supplierOrgId}/items?limit=&cursor=`
No `q` parameter is sent. Search is NOT YET supported by this service.

### 0C. Buyer catalog API route (`server/src/routes/tenant.ts` ~line 1510–1610)

```
GET /api/tenant/catalog/supplier/:supplierOrgId/items
Auth: tenantAuthMiddleware + databaseContextMiddleware
```

**Current querySchema:**
```ts
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});
```
No `q` field. Keyword search is **NOT currently supported** by this route.

**Current Prisma query:**
```ts
tx.catalogItem.findMany({
  where: { tenantId: supplierOrgId, active: true },
  select: { id, name, sku, description, moq, imageUrl },
  orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  take: limit + 1,
  ...(cursor && { cursor: { id: cursor }, skip: 1 }),
})
```
Cross-tenant read uses `SET LOCAL ROLE texqtic_rfq_read`.
Gate 1 (org eligibility) is enforced before this query.
Gate 2 (item visibility): `active: true` only.

### 0D. Reference implementation: tenant-own catalog search (`server/src/routes/tenant.ts` ~line 1152)

The supplier's own catalog route (`GET /api/tenant/catalog/items`) already implements keyword
search using the pattern we need to replicate:

```ts
const querySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});
// ...
where: {
  active: true,
  ...(q && {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ],
  }),
}
```
This is the proven pattern. We replicate it inside the cross-tenant RFQ-read block.

### 0E. `CatalogItem` Prisma schema (`server/prisma/schema.prisma` line 335–354)

```prisma
model CatalogItem {
  id                String    @id @default(uuid()) @db.Uuid
  tenantId          String    @map("tenant_id") @db.Uuid
  name              String    @db.VarChar(255)
  sku               String?   @db.VarChar(100)
  description       String?
  price             Decimal?  @db.Decimal(10, 2)
  active            Boolean   @default(true)
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  moq               Int       @default(1)
  imageUrl          String?   @map("image_url")
  publicationPosture String   @default("PRIVATE_OR_AUTH_ONLY") @map("publication_posture")
  @@index([tenantId, active])
  @@index([tenantId, updatedAt])
}
```

**Field analysis:**
- `name` — ✅ exists, VARCHAR(255), searchable
- `sku` — ✅ exists, VARCHAR(100), nullable, searchable
- `description` — ✅ exists, text, nullable — searchable but adds noise; defer to follow-on
- `price` — ✅ schema field (Decimal, optional) — intentionally NOT exposed to buyers in Phase 1/2
- `moq` — ✅ exists, Int — filterable by min/max; however no textile use-case priority
- `active` — ✅ exists — buyer route already enforces `active: true`; NOT user-controllable
- `publicationPosture` — ✅ exists per-item — NOT currently filtered in buyer route; filtered at org level (Gate 1); per-item filtering is a future slice
- **No textile attributes exist**: no `category`, `fabricType`, `gsm`, `material`,
  `composition`, `color`, `width`, `construction`, `certification` — NOT in schema

### 0F. `category` field status

The `CatalogItem` interface in `services/catalogService.ts` has:
```ts
/**
 * @deprecated Phantom client-side field. No DB column exists for category on catalog_items.
 * Retained for backward compatibility with WL surfaces that derive grouping from this field.
 * Do not rely on this field in new code — it is always undefined at runtime.
 */
category?: string;
```
**`category` is a phantom field. No DB column exists. Any category filter would be a fake frontend
filter operating on undefined values. Do not design category filtering for this unit.**

### 0G. Existing search pattern in repo

The `getCatalogItems` service (`services/catalogService.ts` ~line 49) accepts `q?: string` and
calls `GET /api/tenant/catalog/items?q=...`. The route implements name+sku insensitive OR search
as noted in 0D. This is the reference pattern for keyword search.

### 0H. Existing tests (`tests/b2b-buyer-catalog-listing.test.tsx`)

32 tests covering: endpoint URL, cursor param, limit param, response shape, error propagation,
load-more service, `canStartLoadMore` guard, load-more state, empty state copy, MOQ label,
image fallback aria-label, absence of "Viewing:" badge.

No search tests yet. New test file required for search behavior (Slice 5).

### 0I. Default page size and scalability decision

The buyer catalog route defaults to `limit=20`. Catalogs can have far more than 20 items and
grow over time. Client-side filtering of only the loaded page would silently miss un-fetched
items (critical correctness failure: buyer searches "Cotton" and sees 0 results even if 50
Cotton items exist on the next page). **Server-side search is the only correct design.**

---

## A. Search / Filter Capability Matrix

| Capability | Exists in schema? | Exposed by buyer API? | Frontend can use now? | Recommendation |
|---|---|---|---|---|
| Keyword search by name | ✅ `name` VARCHAR(255) | ❌ `q` not in buyer route | ❌ | **Backend/API prerequisite — Slice 1** |
| Keyword search by SKU | ✅ `sku` VARCHAR(100) nullable | ❌ `q` not in buyer route | ❌ | **Backend/API prerequisite — Slice 1** |
| Keyword search by description | ✅ `description` text nullable | ❌ | ❌ | Defer to follow-on unit; adds noise, low buyer value |
| Category | ❌ Phantom/deprecated — no DB column | ❌ | ❌ | **Future schema/product cycle — NOT this unit** |
| Fabric type | ❌ Not in schema | ❌ | ❌ | **Future schema/product cycle — NOT this unit** |
| GSM | ❌ Not in schema | ❌ | ❌ | **Future schema/product cycle — NOT this unit** |
| Material | ❌ Not in schema | ❌ | ❌ | **Future schema/product cycle — NOT this unit** |
| Composition | ❌ Not in schema | ❌ | ❌ | **Future schema/product cycle — NOT this unit** |
| Color | ❌ Not in schema | ❌ | ❌ | **Future schema/product cycle — NOT this unit** |
| Width | ❌ Not in schema | ❌ | ❌ | **Future schema/product cycle — NOT this unit** |
| Construction | ❌ Not in schema | ❌ | ❌ | **Future schema/product cycle — NOT this unit** |
| Certification | ❌ Not in schema | ❌ | ❌ | **Future schema/product cycle — NOT this unit** |
| MOQ range (min/max) | ✅ `moq` Int | ❌ not exposed | ❌ | Feasible without schema change; low priority for MVP search; **defer to follow-on** |
| Active / status | ✅ `active` Boolean | Buyer route enforces `active: true` | Server-enforced only | **By design — not user-controllable** |
| Per-item publicationPosture | ✅ `publicationPosture` VarChar | ❌ not filtered per-item | ❌ | Deferred — org-level Gate 1 handles eligibility |
| Price range | ✅ `price` Decimal (optional) | ❌ intentionally absent from buyer response | ❌ | **Phase 1/2 hard constraint: no price to buyer** |
| Sort by updated date | ✅ `updatedAt` | Server default only | ❌ user-selectable | Server already orders by `updatedAt desc` — adequate for MVP; user sort toggle deferred |
| Sort by name | ✅ `name` | ❌ not exposed | ❌ | Feasible; defer to follow-on as standalone refinement |

**Summary:** Only keyword search (name + sku) is actionable in this unit without schema changes.
All textile attribute filters require a separate schema + product design cycle.
MOQ range and sort toggle are technically feasible but not priority for the MVP search unit.

---

## B. Keyword Search Design

### B.1 Approach decision

**Server-side search is the only correct design.** Reason: buyer catalog is paginated at 20 items
per page. Client-side filter operates only on the loaded page — if a supplier has 100 items and
only 20 are loaded, client-side search would silently miss 80 items. This is a correctness failure,
not a polish issue. Server-side search returns matching items regardless of page position.

### B.2 Search fields

Search across `name` and `sku` (case-insensitive OR). This mirrors the tenant-own catalog pattern.
Description is deliberately excluded: description text is verbose and adds noise to search results
in a buyer browse context (buyers search for product names and SKUs, not description prose).

### B.3 Input placement

Inside Phase B header row — between the supplier name heading and the `← All Suppliers` button:

```
[ Supplier Name (h1) ]                    [← All Suppliers button]
[ Browse active catalog items ... (p) ]
[ 🔍 [Search by name or SKU...    ] ]
```

The search input is a full-width input below the supplier heading. It appears only in Phase B
(supplier selected). It does not appear in Phase A (supplier picker).

### B.4 Debounce strategy

- Debounce: **350 ms** after last keystroke before triggering search fetch.
- Minimum query length: **1 character** (blank clears search to full listing).
- Empty query behavior: treat as no search — fetch full listing (no `q` param sent).
- Search fires a new full fetch (cursor reset to null). Load More afterward uses the same `q`.

### B.5 Reset behavior

| Event | Search state | Cursor | Grid |
|---|---|---|---|
| Supplier selected (Phase A → B) | `''` (cleared) | null | Load fresh full listing |
| `← All Suppliers` clicked | `''` (cleared) | null | n/a (back to Phase A) |
| User clears search input | `''` → fires full listing fetch | null | Load fresh full listing |
| User types new query (debounced) | updated string | null | Load fresh search results |
| Load More | unchanged | advances | Appends to current results |

### B.6 Interaction with pagination

Search change always resets cursor to null and replaces the grid (not appends).
Load More after a search uses `getBuyerCatalogItems(supplierOrgId, { q, cursor: nextCursor })`.
If search is empty, Load More behavior is identical to current verified behavior (no `q` sent).

### B.7 Loading state

The existing `buyerCatalogLoading` spinner covers initial load and search-triggered reloads.
The `buyerCatalogLoadingMore` state covers Load More operations.
No new loading state is required.

### B.8 Error state

The existing `buyerCatalogError` banner covers search-triggered load errors.
Retry button should re-trigger the current search query (not discard it).
The existing `buyerCatalogLoadMoreError` inline error covers Load More under active search.

---

## C. Attribute Filter Design

### C.1 Scope conclusion

**No attribute filters are deliverable in this unit.** All textile-specific attributes
(fabric type, GSM, material, composition, color, width, construction, certification) are absent
from the `CatalogItem` schema. Adding them requires:
1. A schema design decision (column naming, types, optional/required, indexing strategy).
2. A SQL migration.
3. A Prisma schema update.
4. API exposure.
5. Supplier-side data entry (useless filters if no data is populated).

These are a **separate product/schema design cycle** and must not be bundled into a search MVP.

### C.2 Feasible future filter: MOQ range

`moq` (Int, required, default 1) exists. A min/max range filter is technically feasible:
```ts
querySchema.shape.moqMin = z.coerce.number().int().min(1).optional()
querySchema.shape.moqMax = z.coerce.number().int().min(1).optional()
// where: { moq: { gte: moqMin, lte: moqMax } }
```
This does not require schema changes. Decision: **defer to a follow-on filter unit**, not bundled
into the search MVP. The textile-attribute schema work likely needs to happen first to make the
filter surface meaningful.

### C.3 Textile attribute future unit

The mandatory next-cycle unit is: **`TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001`**

This unit must NOT be opened until `TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001` is VERIFIED_COMPLETE.
It requires explicit authorization from Paresh before any design or implementation begins.

That unit must:
1. Produce a product/schema design artifact for textile attributes (column naming, types, optional/required, indexing strategy).
2. Obtain explicit authorization before touching `schema.prisma` or migrations.
3. Deliver SQL migration via the standard `psql → prisma db pull → prisma generate` sequence.
4. Deliver supplier-side data-entry / update surface (filters are useless if no data is populated).
5. Deliver buyer API filter params for all new attributes.
6. Deliver buyer UI filter controls.
7. Deliver tests and production verification.

See Section M for the full mandatory carry-forward specification.

This is NOT in scope for `TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001`.

---

## D. Backend / API Alignment

### D.1 Route

`GET /api/tenant/catalog/supplier/:supplierOrgId/items` — add `q` query parameter.

### D.2 Updated querySchema

```ts
const querySchema = z.object({
  q: z.string().max(100).optional(),        // keyword search — name + sku insensitive OR
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});
```

`max(100)` on `q` prevents oversized search strings. No min length constraint at the API level
(frontend handles min-length UX; empty string maps to undefined before sending).

### D.3 Updated Prisma query (inside cross-tenant block)

```ts
const { q, limit, cursor } = queryResult.data;
// ...
return tx.catalogItem.findMany({
  where: {
    tenantId: supplierOrgId,
    active: true,
    ...(q && q.trim().length > 0 && {
      OR: [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { sku: { contains: q.trim(), mode: 'insensitive' } },
      ],
    }),
  },
  select: { id: true, name: true, sku: true, description: true, moq: true, imageUrl: true },
  orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  take: limit + 1,
  ...(cursor && { cursor: { id: cursor }, skip: 1 }),
});
```

### D.4 Tenant + supplier scoping

`supplierOrgId` remains a **mandatory UUID path param**. The buyer can only search within the
single supplier catalog they have selected. Cross-supplier search is NOT in scope — it would
require a separate API design and is not authorized.

Gate 1 (org eligibility check) runs BEFORE the query, unchanged.
`tenantId: supplierOrgId` filter remains, unchanged.
`active: true` filter remains, unchanged.

### D.5 RLS safety

The `SET LOCAL ROLE texqtic_rfq_read` cross-tenant read pattern is unchanged. The `q` search
param adds an OR clause on `name` and `sku` only. No new table joins, no new privilege escalation,
no new cross-tenant surface.

### D.6 Response shape

No change to response shape. `{ items, count, nextCursor }` unchanged.
`count` reflects the number of items in the current page only (no total count change).

### D.7 Pagination under search

Cursor-based pagination works correctly with a `q` filter because:
- The cursor is always a valid item UUID from the last result set.
- The WHERE clause (including `q` OR) is consistent across initial fetch and Load More pages.
- The same `q` must be passed on every Load More request. This is enforced in the service layer.

### D.8 Index notes

Existing indexes:
```sql
@@index([tenantId, active])     -- covers the primary where clause
@@index([tenantId, updatedAt])  -- covers the orderBy
```

The `q` search uses `ILIKE` (`contains ... insensitive` → Postgres). This performs a sequential
scan of `name` and `sku` within the tenant. For production catalogs with hundreds or thousands of
items per supplier, a GIN index on `name` (or a `to_tsvector` full-text index) would improve
performance. **For MVP buyer catalog with typical textile supplier sizes (tens to low hundreds of
items per supplier), the existing index + ILIKE is acceptable.** A performance optimization
(GIN index) can be a follow-on if needed.

No new indexes required for this unit.

---

## E. Frontend UX Design

### E.1 Phase B layout change

Phase B header current layout:
```
[ Supplier Name h1 ] [← All Suppliers button]
[ Sub-heading p ]
```

New layout (search input row added below):
```
[ Supplier Name h1 ] [← All Suppliers button]
[ Sub-heading p ]
[ 🔍 Search input (full-width) ]
```

The search input sits below the heading row as a new full-width element, before the error/loading/
grid block. No layout restructuring of the existing grid, loading, or error blocks.

### E.2 Search input spec

```
- type="search" or type="text"
- placeholder="Search by name or SKU..."
- value={buyerCatalogSearch}
- onChange: sets state, triggers debounced fetch
- className: matches existing form-input styling (border-slate-200, rounded-lg, text-sm)
- Clear button (×) visible when value is non-empty
  onClick: clear state, fire full listing fetch immediately
- aria-label="Search catalog items"
- disabled during buyerCatalogLoading (prevent race conditions)
```

### E.3 Filter bar

No filter bar in this unit. The capability matrix confirms no attribute filters are deliverable.
A filter bar skeleton with placeholder chips MUST NOT be added — it would misrepresent capability.

### E.4 Empty results state (search-specific)

When search returns zero items (distinct from no catalog items at all):
```
Primary: "No items match "{query}"."
Secondary: "Try a different name or SKU."
```
This is different from the empty-catalog state:
```
Primary: "This supplier has no active catalog items at this time."
Secondary: "Contact the supplier directly if you expect items to be available."
```

Logic to distinguish:
- `buyerCatalogSearch.trim().length > 0 && buyerCatalogItems.length === 0` → search-empty state
- `buyerCatalogSearch.trim().length === 0 && buyerCatalogItems.length === 0` → empty catalog state

### E.5 Loading state during search

The existing `buyerCatalogLoading` spinner covers search-triggered fetches. No change.

### E.6 Error state during search

The existing `buyerCatalogError` banner with Retry covers search fetch failures.
The Retry button must re-trigger the current search query (not discard `buyerCatalogSearch`).
The existing `handleFetchBuyerCatalog` will be updated to accept `q` param — Retry will re-use
the current `buyerCatalogSearch` state.

### E.7 Mobile behavior

The search input is full-width on all breakpoints. No responsive change required beyond existing
Phase B grid responsiveness (1 col mobile, 2 col md, 4 col xl — unchanged).

### E.8 Keyboard behavior

- `Enter` key on search input: immediately triggers fetch (bypasses debounce).
- `Escape` key on search input: clears the search and fires full listing fetch.
- Tab order: search input after heading, before first card (natural DOM order).

---

## F. Pagination + Search/Filter Interaction

### F.1 Invariants

| Rule | Behavior |
|---|---|
| Search change resets cursor | New search → `cursor = null`, full re-fetch |
| Load More passes current `q` | `getBuyerCatalogItems(supplierOrgId, { q: buyerCatalogSearch || undefined, cursor: nextCursor })` |
| Load More error isolation | `buyerCatalogLoadMoreError` — UNCHANGED from verified listing behavior |
| Grid preserved during Load More | Existing items stay visible — UNCHANGED |
| Supplier change clears search | `handleLoadSupplierPicker` clears `buyerCatalogSearch` to `''` |
| `← All Suppliers` clears search | inline onClick clears `buyerCatalogSearch` to `''` |

### F.2 State additions required

New state to add to App.tsx (Slice 3):
```ts
const [buyerCatalogSearch, setBuyerCatalogSearch] = useState('');
```

No other state additions. `buyerCatalogLoading`, `buyerCatalogNextCursor`, etc. are reused.

### F.3 Load More with active search

```ts
const handleLoadMoreBuyerCatalog = async () => {
  if (!buyerCatalogNextCursor || buyerCatalogLoadingMore) return;
  setBuyerCatalogLoadingMore(true);
  setBuyerCatalogLoadMoreError(null);
  try {
    const more = await getBuyerCatalogItems(buyerCatalogSupplierOrgId, {
      q: buyerCatalogSearch.trim() || undefined,  // ADDED
      cursor: buyerCatalogNextCursor,
    });
    setBuyerCatalogItems(prev => [...prev, ...more.items]);
    setBuyerCatalogNextCursor(more.nextCursor);
  } catch {
    setBuyerCatalogLoadMoreError('Failed to load more items. Please try again.');
  } finally {
    setBuyerCatalogLoadingMore(false);
  }
};
```

---

## G. Empty / Error State Copy

| Scenario | Primary copy | Secondary copy |
|---|---|---|
| No catalog items (empty supplier) | "This supplier has no active catalog items at this time." | "Contact the supplier directly if you expect items to be available." |
| No results — search | "No items match "{query}"." | "Try a different name or SKU." |
| Initial load error | "Supplier catalog not found or not available." | [Retry button] |
| Search fetch error | "Could not load catalog. Please try again." | [Retry button] |
| Load More error under active search | "Failed to load more items. Please try again." | [Retry button — inline, below grid] |

Notes:
- Search-empty state must not imply the supplier has no items (they may have many, just none matching).
- Error copy does not reveal supplier eligibility details (Gate 1 consistent-404 behavior preserved).
- No price, no hidden access, no relationship-gating copy.

---

## H. Implementation Slices

### Slice 1 — Backend: add `q` to buyer catalog route

**File:** `server/src/routes/tenant.ts`
**Change:** Add `q: z.string().max(100).optional()` to `querySchema`. Add `q` OR clause to
`findMany where` inside the cross-tenant `$transaction` block.
**Allowlist:** `server/src/routes/tenant.ts` only.
**Risk:** Low. Proven pattern from tenant-own catalog route. Cross-tenant read role unchanged.
No schema migration. No response shape change.

### Slice 2 — Service: add `q` to `BuyerCatalogQueryParams` + `getBuyerCatalogItems`

**File:** `services/catalogService.ts`
**Change:**
- Add `q?: string` to `BuyerCatalogQueryParams`.
- In `getBuyerCatalogItems`, append `q` to `queryParams` if present and non-empty.
**Allowlist:** `services/catalogService.ts` only.
**Risk:** Minimal. Additive change. Existing callers that pass no `q` are unaffected.

### Slice 3 — Frontend: search state + input + debounce

**File:** `App.tsx`
**Change:**
- Add `buyerCatalogSearch` / `setBuyerCatalogSearch` state (`useState('')`).
- Add debounced search trigger (use `useRef` timer — no new deps).
- Add `handleFetchBuyerCatalog` to accept and use `q` param.
- Clear `buyerCatalogSearch` on `← All Suppliers` and `handleLoadSupplierPicker`.
- Add search input UI block inside Phase B header area.
- Add search-empty vs empty-catalog logic for the empty state render.
- Retry path uses current `buyerCatalogSearch` value.
**Allowlist:** `App.tsx` only.
**Risk:** Medium. Requires careful debounce implementation using `useRef` to avoid stale closures.
Must not break existing verified listing behavior (32/32 tests must still pass after change).

### Slice 4 — Service call: Load More passes `q`

**File:** `App.tsx`
**Change:** `handleLoadMoreBuyerCatalog` passes `q: buyerCatalogSearch.trim() || undefined`.
This may be batched with Slice 3.
**Risk:** Low. Single argument addition.

### Slice 5 — Tests

**File:** `tests/b2b-buyer-catalog-search.test.tsx` (new file)
**Test targets:**
- T1: `getBuyerCatalogItems` passes `q` param when provided
- T2: `getBuyerCatalogItems` omits `q` param when empty string
- T3: debounce fires fetch after 350 ms
- T4: typing triggers cursor reset
- T5: search-empty state copy rendered when items=0 and query non-empty
- T6: empty-catalog copy rendered when items=0 and query empty
- T7: Load More passes same `q` param
- T8: clear search fires full listing fetch
- T9: supplier change clears search state
- T10: error state shows for search fetch failure
- T11: service contract — q sent to correct URL
- T12: regression — existing listing tests (32/32) still pass (run `b2b-buyer-catalog-listing.test.tsx`)

---

## I. Verification Plan

### TypeScript
```powershell
pnpm --filter frontend tsc --noEmit
```
Zero errors required before commit.

### Backend route tests (new + existing)
```powershell
pnpm --dir server exec vitest run ../tests/b2b-buyer-catalog-search.test.tsx
# Or the server test path for the route if route-level integration tests are written
```

### Frontend focused tests
```powershell
pnpm --dir server exec vitest run ../tests/b2b-buyer-catalog-search.test.tsx
pnpm --dir server exec vitest run ../tests/b2b-buyer-catalog-listing.test.tsx  # regression
pnpm --dir server exec vitest run ../tests/b2b-buyer-catalog-supplier-selection.test.tsx  # regression
```

### Manual / runtime verification (Vercel production after implementation commit)

| ID | Check |
|---|---|
| S1 | Phase B renders search input below heading |
| S2 | Search input clears on supplier change |
| S3 | Typing "Cotton" returns only items with "Cotton" in name or SKU |
| S4 | Clearing search restores full listing |
| S5 | Search with no matches shows "No items match…" copy (not "no catalog items") |
| S6 | Load More after search appends correct items (same `q` in flight) |
| S7 | `← All Suppliers` clears search and returns to Phase A |
| S8 | RFQ dialog still opens correctly after search |
| S9 | Existing empty-catalog copy still appears when search is empty and no items |

---

## J. Risks and Non-Goals

### Risks

1. **Stale closure in debounce** — using `setTimeout` in React without `useRef` can read stale
   `buyerCatalogSearch` value. Must use `useRef` or `useCallback` correctly. Validate with T3.
2. **Race condition: rapid typing** — if debounce fires multiple requests, the last response may
   not be the last to arrive. For MVP: accept this; do not implement abort controller in this unit.
   The correct mitigation (abort previous fetch on new input) is a follow-on hardening slice.
3. **ILIKE performance at scale** — acceptable for MVP; GIN index follow-on if needed.
4. **`q` trim consistency** — service sends `q.trim()` only if non-empty; route receives and trims
   again. Must ensure empty string after trim does not reach `where` clause (causes Prisma OR
   with `contains: ''` which matches everything — correct behavior but wasteful; trim guard handles).

### Non-Goals (explicitly excluded)

- Textile attribute filters (fabric type, GSM, material, composition, color, width, construction)
- Category filter (`category` is phantom — no DB column)
- MOQ range filter (deferred to follow-on filter unit)
- Sort toggle (deferred)
- Description search (deferred — low buyer value, adds noise)
- Per-item `publicationPosture` filtering (deferred)
- Price display or price-range filter (hard Phase 1/2 constraint — no price to buyer)
- Cross-supplier search (requires separate API and product authorization)
- PDP, RFQ expansion, relationship-scoped access changes
- Any schema migration
- Any auth / session changes

---

## K. Proposed Implementation Allowlist

```
WRITE (implement):
  server/src/routes/tenant.ts           — Slice 1: add q to buyer catalog route
  services/catalogService.ts            — Slice 2: add q to BuyerCatalogQueryParams
  App.tsx                               — Slice 3 + 4: search state, input, debounce, Load More
  tests/b2b-buyer-catalog-search.test.tsx — Slice 5: new test file

READ (reference only, no edit):
  server/prisma/schema.prisma
  tests/b2b-buyer-catalog-listing.test.tsx
  tests/b2b-buyer-catalog-supplier-selection.test.tsx
  docs/TECS-B2B-BUYER-CATALOG-LISTING-001-DESIGN-v1.md
```

---

## L. Commit Chain (at design close)

```
ad0407f  [TECS-CLOSE] buyer catalog listing layer verified complete   ← last verified close
a1b41d5  [DESIGN] buyer catalog search and filter plan                ← original design commit
(this)   [DESIGN-AMEND] clarify buyer catalog keyword search MVP scope ← amendment commit
```

---

## M. Mandatory Next-Cycle Carry-Forward

> This section is authoritative. It records the mandatory next-cycle unit that MUST be opened after
> `TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001` is VERIFIED_COMPLETE. It must not be opened early.

### M.1 Unit candidate

```
TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001
```

This unit covers the full commercial textile catalog attribute and filter layer. It is the
mandatory successor to the Keyword Search MVP.

### M.2 Why this unit is mandatory

TexQtic is a B2B textile platform. Buyers need to filter by textile-specific attributes to
make procurement decisions. The current `CatalogItem` schema has no textile attributes at all.
This is a structural gap that blocks meaningful buyer-side filtering permanently until addressed.

The Keyword Search MVP (this unit) provides the minimum viable discovery tool. The textile
attributes + filters unit provides the full commercial filter surface.

### M.3 Fields this unit must address

| Field | Current schema status | Reason required |
|---|---|---|
| `category` / product category | Phantom (deprecated) — no DB column | Primary grouping for buyer browse |
| Fabric type | Not in schema | Core textile spec |
| GSM (grams per sq metre) | Not in schema | Weight spec for buyers |
| Material | Not in schema | Fibre content |
| Composition | Not in schema | Blended fibre breakdown |
| Color | Not in schema | Visual product attribute |
| Width | Not in schema | Loom/fabric width |
| Construction | Not in schema | Weave / knit type |
| Certification | Not in schema | Standards (OEKO-TEX, BCI, etc.) |
| MOQ range (min / max) | Schema: `moq` Int exists | Procurement planning filter |
| Sort controls | Schema fields exist | Name, updatedAt user-selectable sort |

Price disclosure (`price` exists in schema, intentionally absent from buyer response in
Phase 1/2) must only be added if separately authorized by Paresh — it is NOT automatically
included in this future unit.

### M.4 Required steps for this future cycle

1. **Product/schema design artifact** — naming convention (snake_case, DB-namrules.md compliance),
   types, optional/required/nullable, indexing strategy, backwards-compat for null legacy items.
2. **Governance review** — `shared/contracts/db-naming-rules.md`, `shared/contracts/schema-budget.md`,
   `shared/contracts/rls-policy.md` must all be reviewed before touching `schema.prisma`.
3. **SQL migration** — via the standard sequence:
   `psql -f migration.sql` (DATABASE_URL) → verify no ERROR/ROLLBACK →
   `pnpm -C server exec prisma db pull` → `pnpm -C server exec prisma generate` → restart server.
4. **Supplier-side data-entry surface** — attribute fields must be fillable by suppliers before
   buyer filters have any useful data to operate on.
5. **Buyer API filter params** — extend buyer catalog route querySchema with typed filter params
   for each new attribute.
6. **Buyer UI filter controls** — filter panel / chip controls in Phase B. Must not add a
   skeleton/placeholder filter bar before attributes exist in the backend.
7. **Tests** — unit + integration tests for new filter params and filter UI.
8. **Production verification** — full verification plan with production evidence before close.

### M.5 Hard preconditions before opening

- `TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001` must be VERIFIED_COMPLETE.
- Explicit authorization from Paresh required before any design work begins.
- No implementation may start without a separate design artifact approved for that unit.
- No schema changes may be made without an explicit `prisma migrate deploy` authorization.

### M.6 What is NOT in this future unit

- Cross-supplier catalog search (requires separate product/API design).
- Public marketplace-style browsing (requires relationship-scoped access design).
- Buyer-supplier allowlist / relationship gating (requires separate design cycle).
- RFQ expansion beyond currently authorized scope.

---

*Design artifact complete. No code changes in this cycle. Implementation follows explicit authorization from Paresh.*
