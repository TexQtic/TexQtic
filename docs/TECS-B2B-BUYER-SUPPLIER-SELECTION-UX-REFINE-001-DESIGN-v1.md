# TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001 — Design Plan

**Artifact Type:** Design / Planning (No code changes in this cycle)
**Design Date:** 2026-05-08
**Unit ID:** TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001
**Parent Unit:** TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001 (VERIFIED_COMPLETE)
**Author:** GitHub Copilot (automated, per governance prompt protocol)
**Authorized By:** Continuation of buyer catalog cluster per `governance/control/OPEN-SET.md` Phase 3+ candidates
**Governance Posture at Design Time:** ZERO_OPEN → entering DESIGN phase

---

## Repo Truth Findings

Inspection performed before design. All facts below are observed from current codebase.

### 1. Buyer Catalog Entry Route / Path

- **Route key:** `buyer_catalog`
- **Selection key:** `BUYER_CATALOG`
- **State binding:** `{ expView: 'BUYER_CATALOG' }`
- **Route group:** `catalog_browse` within `b2b_workspace` manifest
- **Manifest label:** "Browse Supplier Catalog"
- **Shell nav label:** "Browse Suppliers" (desktop sidebar and mobile menu)
- **Shell nav trigger:**
  - Desktop: `🏪 Browse Suppliers` button in `B2BShell` (`layouts/Shells.tsx` line 368)
  - Mobile: item key `buyer_catalog` in `mobileMenuItems` (`layouts/Shells.tsx` line 326)
- **Entry guard:** `isBuyerCatalogEntrySurface = appState === 'EXPERIENCE' && tenantLocalRouteSelection?.routeKey === 'buyer_catalog'` (`App.tsx` line 2139–2140)

### 2. Supplier-Selection Component(s) — Phase A

The supplier-selection UI is **entirely inline in `App.tsx`**, within `case 'buyer_catalog'` (line 4426).
There is no standalone component file for the supplier picker.
It splits into two phases via the `buyerCatalogSupplierOrgId` state guard:
- **Phase A** (`buyerCatalogSupplierOrgId` falsy): Supplier picker — grid of supplier cards
- **Phase B** (`buyerCatalogSupplierOrgId` truthy): Catalog item grid for selected supplier

### 3. Data Source / API

| Layer | Detail |
|---|---|
| Service function | `getEligibleSuppliers()` in `services/catalogService.ts` |
| HTTP endpoint | `GET /api/tenant/b2b/eligible-suppliers` |
| Auth | `tenantAuthMiddleware` + `databaseContextMiddleware` |
| Response type | `EligibleSuppliersResponse { items: SupplierPickerEntry[]; total: number }` |
| Response fields per entry | `id` (UUID), `slug`, `legalName`, `primarySegment \| null` |
| Server gates | Gate A: `org_type = 'B2B'`, `status IN ('ACTIVE', 'VERIFICATION_APPROVED')`, `publication_posture IN ('B2B_PUBLIC', 'BOTH')` AND Gate B: `tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` |
| Context | `withOrgAdminContext` — org admin realm for `organizations` RLS |
| Order | `updated_at DESC, created_at DESC` |
| No fields returned | No `catalogItemCount`, no logo URL, no `description`, no `verifiedAt`, no `city/region` |

Catalog items endpoint: `GET /api/tenant/catalog/supplier/:supplierOrgId/items` — returns `BuyerCatalogItem[]` with fields `id`, `name`, `sku`, `description`, `moq`, `imageUrl`. **No price. No `publicationPosture` per item.**

### 4. Current Selected-Supplier State Behavior

- **State variable:** `buyerCatalogSupplierOrgId: string` (useState, default `''`) in `App.tsx`
- **Selection trigger:** Clicking "Browse Catalog" button in Phase A card — sets `buyerCatalogSupplierOrgId(supplier.id)` and fires `handleFetchBuyerCatalog(supplier.id)` simultaneously
- **Persistence:** None — state is in-memory only; cleared on: `← All Suppliers` button click, re-navigation to `buyer_catalog` (which re-fires `handleLoadSupplierPicker`, which calls `setBuyerCatalogSupplierOrgId('')`)
- **Stale-state risk:** If `supplierPickerItems` array is empty at time of Phase B render (e.g., navigated directly), the supplier name lookup `supplierPickerItems.find(s => s.id === buyerCatalogSupplierOrgId)?.legalName` silently falls back to `'Supplier Catalog'`
- **No optimistic update / pre-fetch guard:** Phase B renders immediately with empty items + loading spinner; fetch result arrives asynchronously

### 5. Current Supplier → Catalog Transition

1. Phase A: User clicks "Browse Catalog" on a supplier card
2. App simultaneously: sets `buyerCatalogSupplierOrgId` → Phase B re-renders; fires `handleFetchBuyerCatalog` → loading state
3. Phase B: Renders immediately with header + spinner (items arrive async); error state displayed inline if fetch fails
4. Return path: "← All Suppliers" button clears `buyerCatalogSupplierOrgId`, `buyerCatalogItems`, `buyerCatalogNextCursor`, `buyerCatalogError` — renders Phase A without re-fetching suppliers (guard in `useEffect` prevents reload if already loaded)
5. Re-navigation via shell nav (`buyer_catalog` click): fires `handleLoadSupplierPicker` again which resets ALL state — returns to Phase A with fresh load

### 6. Current Loading / Empty / Error States

| Phase | State | Current UX |
|---|---|---|
| Phase A | Loading | Spinner + "Loading suppliers..." (centered py-12) |
| Phase A | Error | Red banner (bg-red-50) + error message + inline "Retry" link — calls `handleLoadSupplierPicker` |
| Phase A | Empty (no suppliers) | Gray text "No eligible suppliers found at this time." — no Retry, no action |
| Phase B | Loading | Spinner + "Loading catalog..." (centered py-12) |
| Phase B | Error | Red banner + error message — **no Retry button** |
| Phase B | Empty (0 items) | Gray text "No items found. The supplier may have no active catalog items." — no Retry, no action |

### 7. `publicationPosture` Availability in This Flow

- **`SupplierPickerEntry`** does NOT include `publicationPosture` — it is server-filtered (only eligible suppliers appear); the posture value is not exposed to the client
- **`BuyerCatalogItem`** does NOT include `publicationPosture` — Phase 1 response deliberately omits item-level posture; server applies `active = true` gate at item level only
- Item-level `publicationPosture` exists in Prisma `CatalogItem` schema but is **not selected** in the buyer-facing route (server `select` at line 1577: only `id, name, sku, description, moq, imageUrl`)
- Per-item posture filtering is explicitly deferred to Phase 3+ per `PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001.md` §9
- **No changes to `publicationPosture` exposure are in scope for this unit**

### 8. Existing Tests Covering This Path

| File | Coverage of buyer catalog path |
|---|---|
| `tests/session-runtime-descriptor.test.ts` | Line 428: checks `capabilities.feature.buyerCatalog` flag on a B2C tenant (not B2B buyer flow) |
| All other test files | No coverage of Phase A supplier picker, Phase A → Phase B transition, `getEligibleSuppliers`, `handleFetchBuyerCatalog`, or `case 'buyer_catalog'` render |

**Finding: No test file directly exercises the buyer_catalog route or supplier selection flow. This is a test gap.**

### 9. Likely File Allowlist for Implementation

| File | Change Type | Rationale |
|---|---|---|
| `App.tsx` | Modify | All Phase A and Phase B UI is inline here; all state logic lives here |
| `tests/b2b-buyer-catalog-supplier-selection.test.tsx` | Create | New test file for buyer_catalog path coverage |

**NOT in scope for implementation (no changes needed):**
- `services/catalogService.ts` — no API shape change in scope
- `server/src/routes/tenant.ts` — no backend changes in scope
- `layouts/Shells.tsx` — no shell/nav changes in scope
- `runtime/sessionRuntimeDescriptor.ts` — no manifest changes in scope
- `governance/decisions/` — no new decision needed; authorized under existing decision
- Any new standalone component files — inline pattern in `App.tsx` is established; no extraction in scope

---

## Design Sections

---

### A. UX Structure

**Current structure:** Phase A renders an inline CSS grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`) of supplier cards, each with `legalName`, `primarySegment` (uppercased), `slug` (mono text), and a "Browse Catalog" CTA button.

**Issues identified:**
1. `slug` is an internal identifier (e.g. `qa-b2b`) — it provides no orientation value to the buyer and exposes implementation detail
2. `primarySegment` is displayed as a raw enum value transformed by `.replace(/_/g, ' ')` — e.g. `INDUSTRIAL_GOODS` → `INDUSTRIAL GOODS`. The uppercase-tracking style (`uppercase tracking-widest`) is visually de-emphasized, but the value itself needs no transformation if replaced with a readable label or omitted when null
3. No visual signal distinguishes the card's "call to action" region from the identity region — the button is separated only by a top border
4. The card hover (`hover:shadow-md`) is the only interactive affordance at the card level; the only click target is the button, not the card itself

**Design decision: Preserve card grid.** The card grid pattern is appropriate for a bounded set of eligible suppliers (typically single-digit to low double-digit count, per Phase 2 gate model). A list/table would be premature optimization.

**Refinements in scope:**
- Remove `slug` from visible card surface (it is an internal identifier, not a buyer-facing attribute)
- Replace `primarySegment` raw enum with a chip/badge element (`rounded-full` pill, muted style) — preserves the information without the `uppercase tracking-widest` register which reads as a label rather than a value
- Make the entire card clickable (not just the button) — the button can remain as a visual CTA anchor, but the whole card should register the click
- Add a consistent minimum height to cards to prevent layout jitter when `primarySegment` is null

**What does NOT change:**
- Grid column breakpoints (`1 / md:2 / xl:3`) — correct for the content density
- Card container style (`bg-white rounded-xl border border-slate-200 p-6 shadow-sm`)
- Hover shadow (`hover:shadow-md transition`)
- "Browse Catalog" button style (indigo-600, full-width)
- "← Back to workspace" nav affordance at the bottom of Phase A

---

### B. Supplier Card / Row Content

**Available today from `SupplierPickerEntry` response:**

| Field | Type | Visibility decision |
|---|---|---|
| `id` (UUID) | string | Not shown to user — used as key and selection value |
| `slug` | string | **Remove from visible surface** (internal identifier) |
| `legalName` | string | **Primary heading** — always shown, bold |
| `primarySegment` | string \| null | **Show as muted chip** when non-null; omit entirely when null |

**Not available from current API (would require schema/endpoint changes — NOT in scope):**

| Data | Why not in scope |
|---|---|
| Catalog item count | Requires JOIN with `catalogItem` table; would change response shape — Phase 3+ candidate |
| Supplier logo / avatar | No logo field in `organizations` schema — Phase 3+ candidate |
| Supplier description / bio | No such field in current `organizations` schema — Phase 3+ candidate |
| Verification badge | `status` is already a gate criterion (only `ACTIVE`/`VERIFICATION_APPROVED` appear), not returned; exposing status would require API change — deferred |
| City / region | Not in current `SupplierPickerEntry` or server query |

**Design decision:** Enrich card with currently available data only. The card heading is `legalName`. The secondary line is the `primarySegment` chip (when present). No other data is added from the API in this unit.

**Copy for the chip:** Display `primarySegment` with `replace(/_/g, ' ')` (existing transform, correct) but render in a `rounded-full` pill with `bg-slate-100 text-slate-500 text-xs px-2 py-0.5` rather than the current `uppercase tracking-widest` span — this is a style change within `App.tsx` only.

---

### C. Selected Supplier State

**How selected supplier is shown (Phase B):**
- Current: Phase B header renders `supplierPickerItems.find(s => s.id === buyerCatalogSupplierOrgId)?.legalName ?? 'Supplier Catalog'` as the `<h1>`
- Risk: If the supplier picker list is empty (e.g. the buyer navigated to Phase B via browser back or session quirk), the name lookup returns `undefined` and falls back to `'Supplier Catalog'` — no crash, but anonymous catalog is confusing

**Refinement:** The fallback `'Supplier Catalog'` is acceptable as a safety net. The design adds a small "viewing" identifier below the Phase B heading — a muted badge showing which supplier is selected, using a defensive null-coalescing pattern. If `legalName` resolves, show it as a subtitle chip (e.g. `Viewing: SupplierName`). If it does not resolve, show nothing (no badge). This is cleaner than relying on the `<h1>` fallback alone.

**How selection is changed:**
- Current: "← All Suppliers" button clears `buyerCatalogSupplierOrgId`, `buyerCatalogItems`, `buyerCatalogNextCursor`, `buyerCatalogError`
- The supplier picker list (`supplierPickerItems`) is NOT cleared by this action — correct, no re-fetch needed
- Design preserves this behavior unchanged

**Persisted / stale state:**
- State is in-memory; no `localStorage` persistence in scope
- Re-navigation via shell nav calls `handleLoadSupplierPicker`, which resets all state including `buyerCatalogSupplierOrgId` — ensures no stale Phase B on re-entry
- The existing `useEffect` guard (`supplierPickerItems.length > 0 || supplierPickerLoading || supplierPickerError`) prevents duplicate fetches — preserves this guard unchanged
- **Stale state scenario:** None identified as requiring mitigation in this unit. The reset on shell nav re-entry is sufficient.

---

### D. Supplier → Catalog Transition

**Current behavior (confirmed):**
1. Click "Browse Catalog" → `setBuyerCatalogSupplierOrgId(supplier.id)` + `void handleFetchBuyerCatalog(supplier.id)` in the same event handler
2. React batches the state update; Phase B renders immediately with a loading spinner
3. Items arrive async; Phase B re-renders with items or error

**Issues:**
1. Phase B renders with a blank header until the find-by-id lookup resolves in the same synchronous render (it resolves immediately from `supplierPickerItems` state, so no visual flash — no issue)
2. If `handleFetchBuyerCatalog` fails, Phase B shows the error but has no Retry button — the buyer must use "← All Suppliers" and click "Browse Catalog" again — this is friction with no benefit

**Refinements in scope:**
- Add a "Retry" button to the Phase B error state — calls `void handleFetchBuyerCatalog(buyerCatalogSupplierOrgId)` (re-uses existing handler, no new state)
- The transition itself (immediate Phase B render with loading spinner) is acceptable and is preserved — no intermediate loading overlay

**What does NOT change:**
- The `setBuyerCatalogSupplierOrgId` + `handleFetchBuyerCatalog` simultaneous pattern
- Phase B render trigger (state guard `!buyerCatalogSupplierOrgId`)
- "← All Suppliers" clearing behavior

---

### E. Empty / Loading / Error States

**Full state matrix (current → designed):**

| Phase | State | Current | Design Change |
|---|---|---|---|
| Phase A | Initial load trigger | `useEffect` on `isBuyerCatalogEntrySurface` | No change |
| Phase A | Loading | Spinner + "Loading suppliers..." | No change to copy; spinner style unchanged |
| Phase A | Error | Red banner + message + "Retry" inline link | Style: replace link with a small button (matches Phase B CTA style consistency); copy unchanged |
| Phase A | Empty | "No eligible suppliers found at this time." | Add a sub-line: "Your account may not have eligible supplier relationships configured. Contact your administrator." — preserves launch-accelerated model without false promise |
| Phase B | Loading | Spinner + "Loading catalog..." | No change |
| Phase B | Error | Red banner + message — **no Retry** | **Add Retry button** — calls `void handleFetchBuyerCatalog(buyerCatalogSupplierOrgId)` |
| Phase B | Empty (0 items) | "No items found. The supplier may have no active catalog items." | No change — copy is accurate |
| Phase B | Load More disabled | No handling for load-more error path | No change in this unit — deferred |

**Retry button spec (Phase B error):**
```
<button
  type="button"
  onClick={() => void handleFetchBuyerCatalog(buyerCatalogSupplierOrgId)}
  className="ml-3 text-sm text-red-600 underline"
>
  Retry
</button>
```
Style mirrors the Phase A error Retry for visual consistency. Placed inline after the error message text.

---

### F. Visibility / Access Copy

**Current copy inventory:**
- Route manifest label: "Browse Supplier Catalog"
- Shell nav label: "Browse Suppliers"
- Phase A heading: "Browse Suppliers"
- Phase A sub-heading: "Select a supplier to browse their catalog and request quotes."
- Phase A empty state: "No eligible suppliers found at this time."
- Phase B sub-heading: "Browse active catalog items and request quotes."

**Assessment:** All current copy is consistent with the launch-accelerated model. The supplier list is server-gated (only eligible suppliers appear) — the copy does not promise unrestricted catalog access. No copy falsely implies a full marketplace. The empty-state copy ("No eligible suppliers found at this time.") is accurate but terse.

**Design change to Phase A empty state (see Section E):** Add a second sentence to guide the buyer without exposing gate mechanics. New copy:
> "No eligible suppliers found at this time. Contact your administrator if you expect to have supplier relationships available."

**All other copy: unchanged.** No new marketing claims. No "access to all suppliers" language introduced. Launch-accelerated model preserved.

**What does NOT change:**
- "Browse Suppliers" shell nav label
- "Browse Supplier Catalog" manifest label
- Phase B sub-heading
- Any heading that implies full marketplace behavior

---

### G. Implementation Slices

Four slices, ordered from highest UX impact / lowest risk to lowest impact / highest scope. Each slice is independently deliverable.

---

#### Slice 1 — Supplier Card Visual Clarity

**Scope:** `App.tsx` (Phase A card render block only)

**Changes:**
1. Remove `slug` display from card body (delete the `<p className="text-xs font-mono text-slate-300">{supplier.slug}</p>` line)
2. Replace `primarySegment` `<p>` span with a `rounded-full` chip: `bg-slate-100 text-slate-500 text-xs px-2 py-0.5 inline-block`
3. Make card `<div>` the click target (add `onClick`, `cursor-pointer`, `role="button"`) — button remains for visual CTA but both trigger the same handler

**Risk:** Low. Display-only. No state change. No API change.

**Acceptance:** Cards render with `legalName` as sole heading, `primarySegment` chip (when non-null), no slug. Entire card is clickable. Existing "Browse Catalog" button still works.

---

#### Slice 2 — Phase B Selected-State Polish + Retry

**Scope:** `App.tsx` (Phase B header and Phase B error state only)

**Changes:**
1. Add a muted "Viewing: {legalName}" sub-badge below Phase B `<h1>` using defensive null-coalescing — only shown when `legalName` resolves
2. Add Retry button to Phase B error state (see Section E spec)

**Risk:** Low. No state logic change. No new imports. Retry handler reuses `handleFetchBuyerCatalog`.

**Acceptance:** Phase B header shows supplier name in `<h1>` + optional viewing badge. Phase B error shows Retry button that re-fetches correctly.

---

#### Slice 3 — Empty / Loading / Error State Standardization

**Scope:** `App.tsx` (Phase A error, Phase A empty, Phase B empty)

**Changes:**
1. Phase A error: Replace inline `<button>` Retry link with a styled button consistent with Phase B (same style as Slice 2 addition for visual coherence)
2. Phase A empty: Add second sentence to empty-state copy (see Section F)
3. Phase B empty: No copy change — copy is already accurate

**Risk:** Low. Copy and minor style changes only.

**Acceptance:** Phase A error and Phase B error have visually consistent Retry affordances. Phase A empty-state guides the buyer without false promises.

---

#### Slice 4 — Buyer Catalog Test Coverage

**Scope:** `tests/b2b-buyer-catalog-supplier-selection.test.tsx` (new file)

**Test scenarios to cover:**

| Test ID | Description | Type |
|---|---|---|
| T1 | Phase A renders supplier cards when `supplierPickerItems` is populated | Unit (render) |
| T2 | Phase A renders loading state when `supplierPickerLoading = true` | Unit (render) |
| T3 | Phase A renders error state with Retry button when `supplierPickerError` is set | Unit (render) |
| T4 | Phase A renders empty state when items = [] and loading = false and error = null | Unit (render) |
| T5 | Clicking "Browse Catalog" (or card) calls `setBuyerCatalogSupplierOrgId` and `handleFetchBuyerCatalog` | Unit (interaction) |
| T6 | Phase B renders when `buyerCatalogSupplierOrgId` is set | Unit (render) |
| T7 | Phase B renders loading state when `buyerCatalogLoading = true` | Unit (render) |
| T8 | Phase B renders error state with Retry button when `buyerCatalogError` is set | Unit (render) |
| T9 | Phase B Retry button calls `handleFetchBuyerCatalog` with the current supplier ID | Unit (interaction) |
| T10 | "← All Suppliers" clears supplier org ID and returns to Phase A | Unit (interaction) |
| T11 | Phase B empty state renders when items = [] and loading = false and error = null | Unit (render) |
| T12 | Phase B header resolves supplier name from `supplierPickerItems` when available | Unit (render) |
| T13 | Phase B header falls back to "Supplier Catalog" when supplier ID not in picker list | Unit (render) |

**Risk:** Medium. New test file requires correct mocking of `getEligibleSuppliers`, `getBuyerCatalogItems`, and the `handleFetchBuyerCatalog` / `handleLoadSupplierPicker` handlers. The tests are isolated render + interaction tests — no backend required.

**Acceptance:** All 13 test scenarios pass. `pnpm --filter @texqtic/root test --testFile tests/b2b-buyer-catalog-supplier-selection.test.tsx` (or equivalent filter) shows green.

---

### H. Verification Plan

#### Static Gates (run after each slice)

```
pnpm --filter @texqtic/root typecheck
pnpm --filter @texqtic/root lint
```

Both must pass clean (zero errors, zero warnings introduced). TypeScript errors are not suppressed; no `@ts-ignore` or `any` casts are added.

#### Unit Tests (Slice 4)

```
pnpm --filter @texqtic/root test --testFile tests/b2b-buyer-catalog-supplier-selection.test.tsx
```

All 13 test cases green. Existing test suite must not regress: run `pnpm --filter @texqtic/root test` for full suite confirmation before commit.

#### Manual Verification Steps

All manual steps use QA actor: `qa.buyer@texqtic.com`, browser session authenticated, tenant `qa-buyer` (B2B, `trader` role).

| Step | Action | Expected |
|---|---|---|
| M1 | Navigate to Catalog (buyer_catalog) via shell nav | Phase A renders; supplier cards appear (qa-b2b supplier visible) |
| M2 | Verify card layout | No slug visible; primarySegment chip present when non-null; full card is clickable |
| M3 | Click supplier card (outside button) | Triggers Phase B transition |
| M4 | Verify Phase B header | `<h1>` shows supplier legalName; optional viewing badge shown |
| M5 | Simulate Phase B network error (DevTools: block /api/tenant/catalog/supplier/*) | Phase B error banner with Retry button visible |
| M6 | Click Retry | Fetch re-fires; error clears on success |
| M7 | Click "← All Suppliers" | Returns to Phase A; supplier list intact; no re-fetch triggered |
| M8 | Re-click shell nav "Browse Suppliers" | Full reset fires; Phase A loads fresh |
| M9 | Navigate to neighbor paths: Orders, RFQs | No regression; neighbor paths render correctly |

#### Neighbor-Path Smoke

Confirm the following routes are unaffected (render without error, no console exceptions):
- `catalog` (B2B own catalog)
- `orders`
- `rfq_list`
- `rfq_detail` (if any open RFQs)

#### Vercel Deploy

After commit, confirm Vercel preview/production deploys without build errors. Health check: `GET /health` returns 200.

---

## Implementation Order

Slices are independent. Recommended delivery order:

1. **Slice 2** (Retry + Phase B polish) — highest friction fix, lowest risk
2. **Slice 1** (Card visual clarity) — high visual impact, display-only
3. **Slice 3** (Empty/loading/error standardization) — copy + style consistency
4. **Slice 4** (Tests) — test coverage to lock the above changes

All four slices may be committed atomically in one implementation cycle or as separate commits per slice. One commit is preferred for a single delivery unit.

---

## Risks and Non-Goals

### Risks

| Risk | Mitigation |
|---|---|
| Making card fully clickable may conflict with inner button click event propagation | Use `e.stopPropagation()` on inner button `onClick`; card `onClick` is the outer handler |
| Phase A empty state new copy could be misread as a support request instruction | Copy is advisory ("Contact your administrator if you expect...") — no UI action element attached; acceptable |
| Test file requires mocking `App.tsx` handlers which are not currently extracted to a testable unit | Tests operate at render + interaction level against `App.tsx` state props; mock `getEligibleSuppliers` and `getBuyerCatalogItems` at module boundary |
| Retry in Phase B could trigger duplicate fetches if clicked multiple times rapidly | `buyerCatalogLoading` guard already exists in `handleFetchBuyerCatalog` early return; no debounce needed |

### Non-Goals (explicit exclusions for this unit)

- **No per-item `publicationPosture` filtering** — deferred Phase 3+ per authorizing decision §9
- **No supplier search / filter UI** — Phase 3+ candidate
- **No item detail / PDP** — Phase 3+ candidate
- **No price disclosure** — governed by product decision; Phase 1 deliberately excludes price
- **No RFQ integration changes** — RFQ flow already works from Phase B "Request Quote" button; no change
- **No relationship-scoped allowlist** — not in scope for this unit
- **No backend changes** — all four slices are frontend-only
- **No shell / nav changes** — `layouts/Shells.tsx` is not in allowlist
- **No new API endpoint or schema change**
- **No auth / session logic changes**
- **No broad refactor of `App.tsx`** — only the `case 'buyer_catalog'` block is in scope

---

## Proposed Implementation File Allowlist

```
Modify:
  App.tsx                                                       (Phase A + Phase B render block)

Create:
  tests/b2b-buyer-catalog-supplier-selection.test.tsx           (Slice 4 test coverage)
```

All other files: **read-only reference**. No modifications.

---

## Proposed Commit Message

```
[DESIGN] buyer supplier selection UX refinement plan
```

---

## Governance Control Update Required After This Cycle

Once this design artifact is committed, governance files should reflect:

```yaml
current_product_active_delivery_unit: TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001
current_product_active_delivery_status: DESIGN_COMPLETE
```

`OPEN-SET.md`, `NEXT-ACTION.md`, and `SNAPSHOT.md` are included in the governance file allowlist for this cycle and should be updated as part of the commit.

---

*Design closed. Ready for implementation authorization.*
