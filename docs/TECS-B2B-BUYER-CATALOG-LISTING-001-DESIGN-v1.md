# TECS-B2B-BUYER-CATALOG-LISTING-001 — Buyer Catalog Listing Layer
## Design Artifact v1

**Unit:** `TECS-B2B-BUYER-CATALOG-LISTING-001`
**Phase:** Design / Planning (Design-only cycle — no code changes in this artifact)
**Status:** DESIGN_COMPLETE
**Date:** 2026-04-24
**Author:** GitHub Copilot (governed, Safe-Write Mode)
**Precursor unit:** TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001 (IMPLEMENTATION_COMPLETE, commit `3e9086a`)

---

## 0. Repo-Truth Findings

All design decisions below are grounded in live codebase inspection. No assumptions; every finding
is traceable to a specific file and line.

### 0A. Phase B listing block — current state (`App.tsx`, ~line 4550–4700)

**Grid layout:** `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6`
- 1 col mobile, 2 col md, 4 col xl.
- No list/hybrid toggle; purely grid.

**Item card (current):**
- Image: `h-40 object-cover` or fallback `div` with `role="img"`, `aria-label="{name} image unavailable"` and "Image unavailable" text.
- Card body: `space-y-2`
  - `<h3>` name (font-bold, text-slate-900)
  - SKU (`p.text-xs.text-slate-400.font-mono` — conditional on `item.sku`)
  - description (`p.text-xs.text-slate-500.line-clamp-2` — conditional on `item.description`)
  - MOQ (`div.text-xs.text-slate-400` — label "MOQ: {item.moq}")
  - Request Quote button (`bg-indigo-600`, full width) separated by border-t
- Card body maps `BuyerCatalogItem` → `CatalogItem` adapter inline in `onClick` of RFQ button.

**Loading state:** Shared `buyerCatalogLoading` state governs BOTH initial load and load-more.
Problem: showing the full-page spinner during a load-more operation is an over-fetch; the existing
items disappear visually because the `{!buyerCatalogLoading && buyerCatalogItems.length > 0}` guard
hides the grid while loading. Load-more should have its own independent state.

**Load More button (current):**
- Only rendered when `buyerCatalogNextCursor` is truthy.
- Inline async lambda in `onClick`; uses `buyerCatalogLoading` as guard + disabled flag.
- On success: appends items, updates cursor.
- On error: sets `buyerCatalogError` (the top-level error state) — this is incorrect; a load-more
  failure should not pollute the top-level error banner (which also triggers retry of full reload).

**Empty state (current):** Single sentence: "No items found. The supplier may have no active catalog
items." No contact/guidance sentence.

**Error state (current):** Shows banner with error text + "Retry" button (`handleFetchBuyerCatalog`).
Error state is shared — load-more error currently routes to the same state as initial load error.

**Context header (current):**
- `<h1>` uses `resolveSupplierDisplayName(supplierPickerItems, buyerCatalogSupplierOrgId)` — correct.
- Conditional `<p>` "Viewing: {legalName}" badge — **REDUNDANT**: this badge fires whenever
  `supplierPickerItems.find(s => s.id === buyerCatalogSupplierOrgId)?.legalName` is truthy, which
  is ALWAYS true when the supplier was selected from the picker (legalName is required). The h1
  already shows the same legalName. This badge should be removed.
- Sub-heading: "Browse active catalog items and request quotes." — correct, keep.

**"← All Suppliers" button:** Clears `buyerCatalogSupplierOrgId`, items, cursor, and error.
Returns to Phase A. Correct behavior — preserve.

### 0B. API response (`services/catalogService.ts`, lines 303–346)

`BuyerCatalogItem` fields (Phase 1, intentional):
| Field | Type | Notes |
|---|---|---|
| `id` | `string` | UUID; not displayed; used as `key` and RFQ adapter |
| `name` | `string` | Required; heading |
| `sku` | `string \| null` | Optional |
| `description` | `string \| null` | Optional |
| `moq` | `number` | Integer minimum order quantity |
| `imageUrl` | `string \| null` | Optional |

`BuyerCatalogResponse`:
- `items: BuyerCatalogItem[]`
- `count: number` (items in this page)
- `nextCursor: string | null`

`BuyerCatalogQueryParams`: `{ limit?: number; cursor?: string }`

### 0C. Server route (`server/src/routes/tenant.ts`, lines 1494–1607)

- `GET /tenant/catalog/supplier/:supplierOrgId/items`
- Query params: `limit` (1–100, default 20), `cursor` (UUID, optional).
- **No filter params available**: no category, no type, no segment, no material, no GSM, no status.
  The server only accepts `limit` and `cursor`. Any filter/sort capability would require new API work.
- Response fields: `id, name, sku, description, moq, imageUrl` — NO price (intentional, Phase 1).
- Ordering: `orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }]` — server-side fixed; no client sort.
- Pagination: keyset cursor on `id`; returns `limit + 1` items to detect hasMore.

### 0D. Prisma schema (`server/prisma/schema.prisma`, line 335)

`CatalogItem` model fields available in DB (not all exposed via API):
| Field | Type | Currently exposed to buyer? |
|---|---|---|
| `id` | UUID | Yes |
| `tenantId` | UUID | No (scoping field) |
| `name` | String | Yes |
| `sku` | String? | Yes |
| `description` | String? | Yes |
| `price` | Decimal? | **NO** — intentionally withheld, Phase 1 |
| `active` | Boolean | No (server-side filtered: `active: true` only) |
| `moq` | Int | Yes |
| `imageUrl` | String? | Yes |
| `publicationPosture` | String | **NO** — deferred Phase 3+ |
| `createdAt` | DateTime | No |
| `updatedAt` | DateTime | No |

No `category`, `type`, `segment`, `material`, `GSM` columns exist in the schema at all.
These are not available in Phase 1 or Phase 2, and are not deferred — they do not exist.

### 0E. Existing tests (`tests/b2b-buyer-catalog-supplier-selection.test.tsx`)

Coverage for listing layer (Phase B):
- T6 (4 tests): `getBuyerCatalogItems` service contract — endpoint construction, cursor passthrough,
  error propagation, response field contract. ✅ Covered.
- T3/T4/T8/T9/T11: render-level tests documented as "covered by manual verification M3–M9"
  (inline catalog UI not extractable without component refactor).
- No tests for: load-more state management, load-more error isolation, MOQ display, image fallback,
  end-of-results detection, empty state copy variants.

---

## A. Listing Surface Structure

### A1. Grid Layout

**Retain** the current responsive grid: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6`.

Rationale:
- 4 columns on desktop provides good catalog density for item browsing.
- 2 columns on medium screens is appropriate for tablet.
- 1 column on mobile preserves readability of card content.
- No list/hybrid toggle is needed at Phase 2 — catalog is browse-only, not search-results.

**No horizontal scroll, no masonry.** Standard grid is sufficient and predictable.

### A2. Card Size and Density

Cards remain fixed-height image + variable-height body. No card height equalization via JS — CSS
grid row alignment handles visual consistency sufficiently.

Image height: retain `h-40` (10rem). Sufficient for thumbnail recognition; not so large it crowds
out text content.

Body content: `space-y-1.5` (tighten from `space-y-2` for better density when all 4 fields are
present). Padding: retain `p-4`.

### A3. Supplier Header (Phase B)

The Phase B header contains:
1. `<h1>` — supplier display name (via `resolveSupplierDisplayName`) — **keep**
2. Sub-heading — "Browse active catalog items and request quotes." — **keep**
3. "← All Suppliers" button — **keep**, retain current behavior and style
4. "Viewing: {legalName}" badge — **REMOVE** (redundant with h1 — see §0A finding)

The h1 already resolves to the supplier's legalName via `resolveSupplierDisplayName`. The
conditional "Viewing: X" badge adds no information and creates visual noise. Remove the entire
conditional `<p>` block.

### A4. Load More Placement

Load More button: below the grid, centered, with `pt-4` separation from last grid row.
Retain current `flex justify-center` wrapper. End-of-results indicator (§D4) occupies the same slot.

### A5. Scroll Behavior

No infinite scroll. Explicit Load More button only. Rationale: launch reliability, user control,
and reduced risk of accidental over-fetch in a B2B catalog context.

---

## B. Catalog Item Card Content

Each `BuyerCatalogItem` has exactly six fields. Display treatment for each:

### B1. `id`
- Not displayed. Used as React `key` and mapped into `CatalogItem` adapter for RFQ button onClick.

### B2. `name`
- **Required.** Rendered as `<h3>` with `font-semibold text-slate-900 text-sm leading-snug`.
  (Change from `font-bold` to `font-semibold` — slightly lighter weight fits 4-column density.)
- No truncation. If a very long name wraps, the card height adjusts. Acceptable.
- No link — no PDP in Phase 2.

### B3. `sku`
- **Optional.** Shown when non-null: `SKU: {item.sku}` in `text-xs text-slate-400 font-mono`.
- Retain current conditional render. No change needed.

### B4. `description`
- **Optional.** Shown when non-null: `text-xs text-slate-500 line-clamp-2`.
- Retain `line-clamp-2` — prevents layout shifts from very long descriptions.
- No "Read more" / expand — no PDP in Phase 2.
- Full description is surfaced in the RFQ dialog (existing behavior — `handleOpenRfqDialog` passes
  `description` in the CatalogItem adapter). No change needed here.

### B5. `moq`
- **Required** (always present; defaults to 1 server-side).
- **Change label** from `"MOQ: {item.moq}"` to `"Min. Order: {item.moq}"`.
  Rationale: "MOQ" is industry jargon; "Min. Order: N" is clearer to a broad B2B buyer audience
  without domain familiarity. No data contract change — label only.
- Style: `text-xs text-slate-500` (slight upgrade from `text-slate-400` for readability).
- If `moq === 1`, display as "Min. Order: 1" — no special casing, no "Any quantity" text.

### B6. `imageUrl`
- **Optional.** When present: `<img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover" />`.
  - Add `loading="lazy"` to prevent eager loading of off-screen images in long catalogs.
  - Retain `alt={item.name}` for accessibility.
- When absent: fallback `<div>` with `role="img"` + `aria-label="{item.name} — image not available"`.
  - Change label text from "Image unavailable" to a neutral placeholder icon or keep text label.
  - Keep `bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-400`.
  - Update `aria-label` from `"{item.name} image unavailable"` to `"{item.name} — image not available"` for natural phrasing.

### B7. Request Quote button
- **Keep.** Full-width `bg-indigo-600` button. Sole action on the card.
- No secondary actions (no "View", no "Add to cart", no "Compare").
- Separated from content fields by `border-t border-slate-100 pt-3`.
- Button text: `"Request Quote"` — unchanged.
- `onClick` maps item to `CatalogItem` adapter and calls `handleOpenRfqDialog` — unchanged.
- `type="button"` — preserve.

### B8. Price field
- **Absent.** No price field exists in `BuyerCatalogItem`. No display. No placeholder.
- Do not hint "Price on request" or similar — the RFQ dialog implies this implicitly.

---

## C. Supplier-Scoped Context

### C1. Viewing Context

The Phase B header provides full supplier context:
- `<h1>` resolves supplier name via `resolveSupplierDisplayName`.
- Sub-heading: "Browse active catalog items and request quotes."
- "← All Suppliers" return button.

**Remove the "Viewing: {legalName}" badge** (redundant — see §A3 and §0A).

If the buyer arrived at Phase B directly (e.g., navigated back to `buyer_catalog` with a
`buyerCatalogSupplierOrgId` already set from state), and `supplierPickerItems` is empty (picker
was not re-loaded), `resolveSupplierDisplayName` falls back to "Supplier Catalog" as the h1 text.
This is acceptable — it is not a broken state; the buyer can still browse items and return to
Phase A via "← All Suppliers".

### C2. Return Path

"← All Suppliers" button:
- Clears `buyerCatalogSupplierOrgId`, `buyerCatalogItems`, `buyerCatalogNextCursor`,
  `buyerCatalogError`.
- Does NOT re-invoke `handleLoadSupplierPicker` — Phase A re-renders with whatever
  `supplierPickerItems` is already in state. This is correct behavior — no extra API call.
- Keep current implementation; no change required.

### C3. Zero-Item State

When `!buyerCatalogLoading && !buyerCatalogError && buyerCatalogItems.length === 0 && buyerCatalogSupplierOrgId`:

**Replace** current single-sentence copy with two-sentence copy (aligned with Phase A empty state
pattern from TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001):

```
This supplier has no active catalog items at this time.
Contact the supplier directly if you expect items to be available.
```

Keep: `text-center py-12 text-slate-500 text-sm` wrapper, `<p>` + `<p className="mt-1">`.

### C4. Stale Supplier Handling

If a supplier is selected but their eligibility has changed server-side (e.g., posture revoked),
the server returns 404, which is caught in `handleFetchBuyerCatalog` and sets `buyerCatalogError`
to the current message: `"Supplier catalog not found or not available."`.

The existing error + Retry flow is sufficient for this case. No additional stale-supplier handling
in Phase 2.

---

## D. Pagination / Load More

### D1. State Isolation (Critical Fix)

**Current problem:** `buyerCatalogLoading` is shared between initial load and load-more. When
load-more fires, `buyerCatalogLoading` is set to `true`, which hides the entire item grid
(`!buyerCatalogLoading && buyerCatalogItems.length > 0` guard). Items visually disappear while
loading more — this is a regression from expected UX.

**Solution:** Introduce a separate `buyerCatalogLoadingMore: boolean` state (default `false`).

- `buyerCatalogLoading`: controls initial fetch only (full spinner, hides grid).
- `buyerCatalogLoadingMore`: controls load-more spinner only (shown inline in Load More button;
  grid remains visible).

State update responsibilities:
- `handleFetchBuyerCatalog`: sets `buyerCatalogLoading` (unchanged); does NOT touch
  `buyerCatalogLoadingMore`.
- Load-more handler: sets `buyerCatalogLoadingMore` (new); does NOT touch `buyerCatalogLoading`.

`handleLoadSupplierPicker` currently resets `buyerCatalogLoading` indirectly via `setBuyerCatalogItems([])`.
The new `buyerCatalogLoadingMore` must also be reset in `handleLoadSupplierPicker` and in the
`← All Suppliers` handler:
```typescript
setBuyerCatalogLoadingMore(false);
```

### D2. Load-More Error Isolation (Critical Fix)

**Current problem:** Load-more error sets `buyerCatalogError` (top-level error state), which
triggers the top-level error banner with a "Retry" button that calls `handleFetchBuyerCatalog` —
a full page reload of the catalog. This is wrong: a pagination failure should not reset the
already-loaded items or prompt a full reload.

**Solution:** Introduce a separate `buyerCatalogLoadMoreError: string | null` state (default `null`).

- `buyerCatalogError`: initial load error only. Triggers full error banner + Retry (full reload).
- `buyerCatalogLoadMoreError`: load-more error only. Shown inline below the grid near the Load More button.
  Clears on next successful load-more or on phase navigation.

Load-more error display: inline below the grid, centered, small text:
```
<p className="text-center text-xs text-red-500 pt-1">
  Failed to load more items. <button type="button" onClick={...} className="underline">Try again</button>
</p>
```
The inline "Try again" re-invokes the load-more handler with the current cursor.

`buyerCatalogLoadMoreError` must be cleared:
- At the start of each load-more attempt.
- In `handleFetchBuyerCatalog` (full reload clears all states).
- In `handleLoadSupplierPicker`.
- In the `← All Suppliers` handler.

### D3. Initial Load

`handleFetchBuyerCatalog(supplierOrgId)` — no change to the core logic. Guard `!trimmedId` remains.
State reset sequence: `setBuyerCatalogItems([])`, `setBuyerCatalogNextCursor(null)`,
`setBuyerCatalogError(null)`, `setBuyerCatalogLoadMoreError(null)` (add new reset),
`setBuyerCatalogLoading(true)`. All unchanged except adding `setBuyerCatalogLoadMoreError(null)`.

### D4. Load More Handler

Extract the inline anonymous async lambda from the Load More button `onClick` into a named handler
`handleLoadMoreBuyerCatalog`. This is required for:
- Testability (the "Try again" link in §D2 also uses it).
- Clarity.
- Avoiding repeated handler duplication.

Proposed handler signature:
```typescript
const handleLoadMoreBuyerCatalog = async () => {
  if (!buyerCatalogNextCursor || buyerCatalogLoadingMore) return;
  setBuyerCatalogLoadMoreError(null);
  setBuyerCatalogLoadingMore(true);
  try {
    const more = await getBuyerCatalogItems(buyerCatalogSupplierOrgId, {
      cursor: buyerCatalogNextCursor,
    });
    setBuyerCatalogItems(prev => [...prev, ...more.items]);
    setBuyerCatalogNextCursor(more.nextCursor);
  } catch {
    setBuyerCatalogLoadMoreError('Failed to load more items.');
  } finally {
    setBuyerCatalogLoadingMore(false);
  }
};
```

### D5. Load More Button State

The Load More button renders when `buyerCatalogNextCursor` is truthy AND items are present:

```
<button
  type="button"
  disabled={buyerCatalogLoadingMore}
  onClick={() => void handleLoadMoreBuyerCatalog()}
  className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
>
  {buyerCatalogLoadingMore ? 'Loading...' : 'Load More'}
</button>
```

Note: `disabled` guard uses `buyerCatalogLoadingMore` (NOT `buyerCatalogLoading`).

### D6. End-of-Results Indication

When `buyerCatalogNextCursor === null` AND items are present (catalog has been loaded and there is
no next page), do NOT show the Load More button. The absence of the button is sufficient indication
that all items have been loaded.

No "All items shown" footer text — not needed at Phase 2 catalog density (default page size is 20).
This may be revisited if catalogs routinely have 40+ items per supplier.

### D7. Retry on Pagination Failure

See §D2. The inline "Try again" link in the load-more error message calls
`handleLoadMoreBuyerCatalog()` directly.

---

## E. Basic Filters / Sorting

### E1. Filter Fields — Availability Assessment

| Filter Candidate | In Schema? | In API? | Available Now? | Recommendation |
|---|---|---|---|---|
| Category | No | No | No | Phase 3+ candidate only if added to schema + API |
| Type | No | No | No | Phase 3+ candidate only if added to schema + API |
| Segment | No | No | No | No equivalent field exists |
| Material | No | No | No | No equivalent field exists |
| GSM | No | No | No | No equivalent field exists |
| Status / active | Yes (schema) | No (server-filtered) | No | Items are already active-only; filter not applicable |
| publicationPosture | Yes (schema) | No | No | Deferred Phase 3+ |
| Price range | Yes (schema) | No (intentionally withheld) | No | Phase 3+, post-price-disclosure authorization |
| Sort (name A–Z) | — | No | No | Phase 3+ (requires API param) |
| Sort (updated) | — | Yes (server-side fixed) | N/A | Server always sorts by `updatedAt DESC` |

**Conclusion:** Zero filter or sort controls are available at Phase 2.
- No filter bar, no sort dropdown, no search input.
- The absence is by design — not a gap to patch.
- Mark all filter/sort candidates as **Phase 3+ only**, each requiring:
  1. Schema migration (if field doesn't exist)
  2. API param support
  3. Explicit product authorization cycle

### E2. Search

Text search is not in scope for Phase 2 and does not exist in the API. Mark as Phase 3+ candidate.

---

## F. Loading / Empty / Error States

### F1. Initial Loading State

When `buyerCatalogLoading === true`:
- Show centered spinner (`animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600`) +
  "Loading catalog..." text below.
- Grid hidden (existing `!buyerCatalogLoading` guard — retain).
- Load More button absent.

### F2. Empty State (Zero Items)

When `!buyerCatalogLoading && !buyerCatalogError && buyerCatalogItems.length === 0 && buyerCatalogSupplierOrgId`:

**Replace** with two-sentence copy (see §C3):
```
This supplier has no active catalog items at this time.
Contact the supplier directly if you expect items to be available.
```

Style: `text-center py-12 text-slate-500 text-sm`. Two `<p>` elements, second with `mt-1`.

### F3. Initial Fetch Error State

When `buyerCatalogError` is set:
- Banner: `bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm`.
- Message: current `buyerCatalogError` value (e.g., "Supplier catalog not found or not available.").
- Retry button: `onClick={() => void handleFetchBuyerCatalog(buyerCatalogSupplierOrgId)}` —
  unchanged. Style: `ml-3 text-sm text-red-600 underline`.
- Grid hidden when `buyerCatalogItems.length === 0`. If items exist (partial load), the grid
  remains visible below the error banner — this is acceptable.

### F4. Load More Loading State

When `buyerCatalogLoadingMore === true`:
- The Load More button shows "Loading..." text and is `disabled`.
- The item grid remains fully visible.
- No full-page spinner.

### F5. Load More Error State

When `buyerCatalogLoadMoreError` is set:
- Inline below the grid, above/around the Load More button area.
- Small text: `text-center text-xs text-red-500 pt-1`.
- Inline "Try again" link calls `handleLoadMoreBuyerCatalog()` directly.
- Does NOT trigger a full page reload of the catalog.
- Cleared on the next load-more attempt (see §D2).

### F6. Image Missing

When `item.imageUrl === null`:
- Fallback `<div role="img" aria-label="{item.name} — image not available">`.
- Background: `bg-slate-100`.
- Text: `text-slate-400 text-sm font-medium` centered: "No image".
  (Change from "Image unavailable" to "No image" — shorter, less alarming.)
- Height: `h-40` — matches image height.

### F7. Description Missing

When `item.description === null`:
- Field omitted entirely (conditional render — existing pattern). No fallback text.

### F8. MOQ — Display

`moq` is always present (server schema default `1`). Never null. No fallback needed.
Display: `"Min. Order: {item.moq}"` (change from "MOQ: {n}" — see §B5).

---

## G. Action Boundaries

### G1. Permitted Actions

| Action | Surface | Notes |
|---|---|---|
| Request Quote | Per-item card | Sole per-item action; maps item → CatalogItem adapter → RFQ dialog |
| Load More | Below grid | Pagination; calls `handleLoadMoreBuyerCatalog` |
| ← All Suppliers | Phase B header | Returns to Phase A; clears all catalog state |
| ← Back to workspace | Phase A footer | Returns to default tenant workspace route |

### G2. Explicitly Forbidden Actions

| Forbidden Action | Reason |
|---|---|
| View Item Detail (PDP) | No PDP in Phase 2; item detail requires separate authorization |
| Price disclosure | `price` field intentionally excluded from `BuyerCatalogItem` (Phase 1 constraint) |
| Add to cart | Cart is for B2C/marketplace use only; not applicable to B2B catalog |
| Multi-item RFQ | Not in scope; per-item RFQ only |
| Share item / item permalink | No PDP → no shareable URL |
| Compare items | Phase 3+ at earliest |
| Filter / sort | Not available in API (see §E) |
| Supplier relationship request | Separate future product cycle (Phase 6+) |

### G3. RFQ Button Behaviour

The RFQ button on each card maps `BuyerCatalogItem` to `CatalogItem` inline and calls
`handleOpenRfqDialog(asProduct)`. The adapter sets `price: 0` (intentional placeholder — RFQ flow
does not display price). This is correct; no change.

The RFQ dialog already handles `description`, `moq`, `imageUrl`, and `sku`. No change to the
dialog itself in this unit.

---

## H. Implementation Slices

The implementation phase for this unit (separate prompt) delivers the following 4 slices in order.
Each slice is independently committable and independently testable.

### Slice 1 — State Isolation (Core Fix)

**Allowlist (Modify):** `App.tsx`

Changes:
1. Add `buyerCatalogLoadingMore` state: `const [buyerCatalogLoadingMore, setBuyerCatalogLoadingMore] = useState(false);`
2. Add `buyerCatalogLoadMoreError` state: `const [buyerCatalogLoadMoreError, setBuyerCatalogLoadMoreError] = useState<string | null>(null);`
3. Add `handleLoadMoreBuyerCatalog` named handler (replaces inline lambda in Load More button onClick).
4. Update `handleFetchBuyerCatalog` to also reset `buyerCatalogLoadMoreError`.
5. Update `handleLoadSupplierPicker` to also reset `buyerCatalogLoadingMore` and `buyerCatalogLoadMoreError`.
6. Update the `← All Suppliers` onClick to reset `buyerCatalogLoadingMore` and `buyerCatalogLoadMoreError`.
7. Update Load More button: use `buyerCatalogLoadingMore` for disabled/label; use `handleLoadMoreBuyerCatalog`.
8. Add load-more error inline display (§F5).

**Validation:** TypeScript `noEmit` PASS; focused tests PASS.

### Slice 2 — Supplier Header Cleanup + Card Content Polish

**Allowlist (Modify):** `App.tsx`

Changes:
1. Remove the redundant "Viewing: {legalName}" conditional `<p>` from Phase B header.
2. Change MOQ label from `"MOQ: {item.moq}"` to `"Min. Order: {item.moq}"`.
3. Update `moq` div style: `text-xs text-slate-500` (was `text-slate-400`).
4. Update item card `h3` from `font-bold` to `font-semibold`.
5. Update card body spacing from `space-y-2` to `space-y-1.5`.
6. Add `loading="lazy"` to `<img>` element.
7. Update image fallback `aria-label`: `"{item.name} — image not available"`.
8. Update image fallback label text: `"No image"` (was "Image unavailable").

**Validation:** TypeScript `noEmit` PASS; focused tests PASS.

### Slice 3 — Empty State Standardization

**Allowlist (Modify):** `App.tsx`

Changes:
1. Replace Phase B empty state single sentence with two-sentence copy (§C3).

**Validation:** TypeScript `noEmit` PASS; focused tests PASS.

### Slice 4 — Test Coverage

**Allowlist (Create):** `tests/b2b-buyer-catalog-listing.test.tsx`

Tests to cover (all pure-function + service-contract; no render-level tests per established harness constraint):

| ID | Description | Type |
|---|---|---|
| T1 | `getBuyerCatalogItems` calls correct endpoint with supplierOrgId | Service contract |
| T2 | `getBuyerCatalogItems` passes cursor param when provided | Service contract |
| T3 | `getBuyerCatalogItems` passes limit param when provided | Service contract |
| T4 | `getBuyerCatalogItems` returns `BuyerCatalogResponse` shape | Service contract |
| T5 | `getBuyerCatalogItems` propagates errors | Service contract |
| T6 | Load-more error does NOT set `buyerCatalogError` (state isolation) | Pure function / descriptor |
| T7 | `buyerCatalogLoadingMore` guard prevents concurrent load-more calls | Pure function / descriptor |
| T8 | `handleLoadMoreBuyerCatalog` appends items to existing state | Pure function / descriptor |
| T9 | `handleLoadMoreBuyerCatalog` updates cursor on success | Pure function / descriptor |
| T10 | `handleLoadMoreBuyerCatalog` clears cursor when next is null | Pure function / descriptor |
| T11 | Phase B empty state uses two-sentence copy | Runtime descriptor |
| T12 | MOQ label renders as "Min. Order: N" | Runtime descriptor |
| T13 | Image fallback renders with correct aria-label pattern | Runtime descriptor |
| T14 | "Viewing" badge is absent from Phase B header | Runtime descriptor |

Notes:
- T1–T5: service contract tests follow the same pattern as existing T6 group in
  `tests/b2b-buyer-catalog-supplier-selection.test.tsx` — mock `tenantGet`, verify endpoint and
  response shape.
- T6–T10: export `__B2B_BUYER_CATALOG_LISTING_TESTING__` from `App.tsx` with pure helpers for
  state transition assertions.
- T11–T14: runtime descriptor tests (`const caseSource = buyer_catalog case source` approach).

**Validation:** All focused tests PASS; full suite no new failures.

---

## I. Verification Plan

### I1. TypeScript

```
pnpm --filter frontend tsc --noEmit
```
Expected: zero errors. No new errors introduced by any of the 4 slices.

### I2. Focused Tests

After Slice 4:
```
pnpm --filter frontend vitest run tests/b2b-buyer-catalog-listing.test.tsx
```
Expected: 14 tests PASS, 0 FAIL.

Existing tests must continue to pass:
```
pnpm --filter frontend vitest run tests/b2b-buyer-catalog-supplier-selection.test.tsx
```
Expected: 17 tests PASS (unchanged).

### I3. Full Suite

```
pnpm --filter frontend vitest run
```
Expected: existing pass count maintained; no new failures beyond the 7 known pre-existing
server-integration failures.

### I4. Manual Buyer Catalog Runtime Verification (M1–M9)

Performed by QA actor: `qa.buyer@texqtic.com` on `https://app.texqtic.com/`

| Step | Check | Expected |
|---|---|---|
| M1 | Navigate to B2B workspace → Catalog | Phase A supplier picker renders |
| M2 | Select eligible supplier `qa-b2b` | Transitions to Phase B; h1 shows supplier name; no "Viewing:" badge |
| M3 | Catalog items render | Grid shows items; each has name, optional SKU, optional description, "Min. Order: N", Request Quote |
| M4 | Image present | `<img>` renders with correct src and `loading="lazy"` |
| M5 | Image absent | Fallback div renders with "No image" text and accessible aria-label |
| M6 | Request Quote button | Opens RFQ dialog with correct item prefilled |
| M7 | Load More (if nextCursor) | Grid retains existing items; new items append below; Load More button updates |
| M8 | End of catalog | Load More button absent; all items visible |
| M9 | ← All Suppliers | Returns to Phase A; h1 shows "Browse Suppliers"; items cleared |
| M10 | Empty supplier catalog | Two-sentence empty state renders |
| M11 | Initial load failure | Error banner with Retry; Retry reloads catalog |
| M12 | Load-more failure | Inline error near Load More; existing items preserved; "Try again" works |

### I5. Neighbor-Path Smoke

After implementation:
1. **B2C catalog path** (`catalog` route): Verify no state bleed from new `buyerCatalogLoadingMore` /
   `buyerCatalogLoadMoreError` states. B2C catalog uses separate `catalogNextCursor` and
   `handleB2CLoadMore` — no shared state.
2. **RFQ dialog**: Verify RFQ still opens correctly from Phase B item cards post-Slice 2 card changes.
3. **Supplier picker (Phase A)**: Verify Phase A flow unaffected by new state additions.
4. **"← All Suppliers" path**: Verify `buyerCatalogLoadingMore` and `buyerCatalogLoadMoreError` are
   both cleared on return to Phase A.

### I6. Production / Vercel

Deploy to Vercel preview. Verify:
- No TypeScript build errors.
- Phase B catalog listing renders correctly with live `qa-b2b` data.
- Load More (if cursor available) appends items without grid flash.
- State isolation: existing grid items not hidden during load-more.

---

## J. File Allowlist (Implementation Phase)

**Modify:**
- `App.tsx` — all UI and state changes (Slices 1–3)

**Create:**
- `tests/b2b-buyer-catalog-listing.test.tsx` — test coverage (Slice 4)

**Read-only (no changes):**
- `services/catalogService.ts` — no API contract changes
- `server/src/routes/tenant.ts` — no backend changes
- `server/prisma/schema.prisma` — no schema changes
- `layouts/Shells.tsx` — no navigation changes
- `types.ts` — no type changes (BuyerCatalogItem shape unchanged)

**Governance (update on design commit):**
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`

---

## K. Phase 3+ Candidates (Not in Scope)

The following items are identified as future work only. None may be started without explicit
human authorization per governance posture.

| Candidate | Requires |
|---|---|
| Catalog search / text filter | New schema field + API param + separate design cycle |
| Category / type filter | Schema migration (new fields) + API + design cycle |
| publicationPosture per-item filter | API param + design cycle |
| Price disclosure | Explicit price-disclosure authorization + schema changes |
| Item Detail Page (PDP) | Separate product authorization + routing + design cycle |
| Buyer-supplier allowlist (relationship-scoped visibility) | Phase 6+ separate product cycle |
| Sort by name / price / date | API param support + design cycle |
| Infinite scroll | Alternative to Load More — requires explicit product choice |
| Multi-item RFQ | Separate product/design cycle |

---

*End of design artifact. Status: DESIGN_COMPLETE.*
