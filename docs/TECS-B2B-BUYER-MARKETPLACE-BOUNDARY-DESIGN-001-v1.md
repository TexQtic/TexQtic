# TECS-B2B-BUYER-MARKETPLACE-BOUNDARY-DESIGN-001-v1

**Unit:** `TECS-B2B-BUYER-MARKETPLACE-BOUNDARY-DESIGN-001`  
**Type:** Design / Boundary Investigation  
**Status:** `DESIGN_COMPLETE`  
**Date:** 2026-05-08  
**Authorized By:** `docs/TECS-B2B-BUYER-CATALOG-RUNTIME-VALIDATION-v1.md` §12 (Issue 1 finding requires bounded implementation fix)  
**Governance Posture:** `HOLD-FOR-BOUNDARY-TIGHTENING` (active; D-016 governs)  
**Design Author:** GitHub Copilot (automated, per governance prompt protocol)

---

## 1. Investigation Mandate

**Trigger:** Production runtime validation (`docs/TECS-B2B-BUYER-CATALOG-RUNTIME-VALIDATION-v1.md`)
confirmed that a B2B buyer clicking "Browse Suppliers" landed on the wrong surface — the seller
catalog management surface — instead of the buyer-safe supplier discovery surface. This was
classified as an implementation failure (route binding collision, BV-001). A subsequent
implementation commit (`1e499ad`) fixed the binding collision. However, the investigation also
identified residual structural gaps (BV-002, BV-003, BV-005) that remain unaddressed and prevent
the buyer catalog from being accessible via a first-class shell navigation entry.

**Mandate:** Investigate the complete buyer-side B2B marketplace boundary. Confirm the current
state of all violations (fixed and open). Design the minimal corrective implementation slice
required to fully close the buyer navigation boundary gap. This is a **design-only** artifact —
no implementation is performed here.

**Governance Constraint:** HOLD-FOR-BOUNDARY-TIGHTENING remains active. No implementation may
proceed from this design until explicitly authorized per D-016 posture.

---

## 2. Mandatory Source Inputs Read Log

| # | Source | Read Status | Scope |
|---|--------|-------------|-------|
| 1 | `governance/decisions/PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001.md` | ✅ Fully read | Phase 1–4 authorization baseline |
| 2 | `docs/TECS-B2B-BUYER-CATALOG-BROWSE-001-v1.md` | ✅ Fully read | Phase 1 implementation scope |
| 3 | `docs/TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001-v1.md` | ✅ Fully read | Phase 2 implementation scope |
| 4 | `docs/TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001-VERIFICATION-v1.md` | ✅ Fully read | Phase 2 verification findings |
| 5 | `docs/TECS-B2B-BUYER-CATALOG-RUNTIME-VALIDATION-v1.md` | ✅ Fully read | Production runtime validation |
| 6 | `runtime/sessionRuntimeDescriptor.ts` | ✅ Key sections read | Route manifest, resolution machinery, B2B_SHELL_ROUTE_KEYS |
| 7 | `App.tsx` — b2b_workspace render, buyer_catalog cases, nav functions | ✅ Key sections read | Route switch, seller surface, buyer catalog phases |
| 8 | `layouts/Shells.tsx` — B2BShell | ✅ Key sections read | Shell nav rendering, mobile menu, hasShellRoute logic |
| 9 | `governance/control/NEXT-ACTION.md` | ✅ Fully read | Current governance posture |
| 10 | `governance/control/OPEN-SET.md` | ✅ Fully read | Live control set and operating notes |
| 11 | `TECS.md` §0–§2 | ✅ Fully read | Gap lifecycle, static gates |

---

## 3. Repo-Truth Baseline — Confirmed Findings

All findings in this section are **CONFIRMED REPO TRUTH** from direct code inspection of the
working HEAD (`638936e`).

### 3.1 `b2b_workspace` Manifest (current state, post BV-001 fix)

**File:** `runtime/sessionRuntimeDescriptor.ts` lines 500–525

```typescript
b2b_workspace: {
  key: 'b2b_workspace',
  baseOperatingMode: 'B2B_WORKSPACE',
  shellFamily: 'B2BShell',
  defaultAppState: 'EXPERIENCE',
  defaultLocalRouteKey: 'catalog',                          // default landing = seller surface
  allowedRouteGroups: ['catalog_browse', 'orders_operations', 'rfq_sourcing', 'operational_workspace'],
  routeGroups: [
    defineRuntimeRouteGroup('catalog_browse', [
      defineRuntimeRoute('catalog',       'Catalog',                  'HOME',         { expView: 'HOME'         }, { defaultForGroup: true }),
      defineRuntimeRoute('buyer_catalog', 'Browse Supplier Catalog',  'HOME',         { expView: 'BUYER_CATALOG' }, {}),
      //                                                               ^^^^ ← collision (see BV-003)
      //                                                                         unique binding ← ✅ (BV-001 fixed)
    ]),
    WORKSPACE_ORDERS_ROUTE_GROUP,
    RFQ_ROUTE_GROUP,
    OPERATIONAL_WORKSPACE_ROUTE_GROUP,
  ],
  shellNavigation: {
    routeKeys: B2B_SHELL_ROUTE_KEYS,                        // buyer_catalog ABSENT (see BV-002)
  },
},
```

### 3.2 `B2B_SHELL_ROUTE_KEYS`

**File:** `runtime/sessionRuntimeDescriptor.ts` lines 392–403

```typescript
const B2B_SHELL_ROUTE_KEYS: RuntimeLocalRouteKey[] = [
  'catalog',      // ← seller catalog management
  'orders',
  'dpp',
  'escrow',
  'escalations',
  'settlement',
  'certifications',
  'traceability',
  'audit_logs',
  'trades',
  // 'buyer_catalog' is ABSENT
];
```

### 3.3 Route Resolution Machinery

**File:** `runtime/sessionRuntimeDescriptor.ts` — `resolveRuntimeFamilyEntryHandoff` →
`resolveRuntimeLocalRouteSelection` → `normalizeRuntimeRouteInput` → `matchesRuntimeLocalRouteBinding`

For `b2b_workspace`, `normalizeRuntimeRouteInput` falls to the `default` case:
```typescript
default:
  return { expView: input.expView ?? 'HOME', ... };
```

`matchesRuntimeLocalRouteBinding` performs field-by-field comparison. If `expView: 'BUYER_CATALOG'`
is passed, it matches the `buyer_catalog` route binding and NOT the `catalog` binding.

`selectionKey` is typed as `string` (no union constraint). Any string value is valid.

### 3.4 `navigateTenantManifestRoute` (`App.tsx` lines 2060–2083)

Sets `expView` to `normalizeExperienceView(registration.route.stateBinding.expView)`.
For `buyer_catalog`: sets `expView = 'BUYER_CATALOG'` → route resolves to `buyer_catalog` → ✅

`'BUYER_CATALOG'` is in `EXPERIENCE_VIEWS` constant (`App.tsx` line 860) — confirmed present
from BV-001 binding fix commit (`1e499ad`).

### 3.5 B2BShell Navigation Rendering (`layouts/Shells.tsx` lines 307–372)

The B2BShell desktop sidebar and mobile menu are **hardcoded per route key**. They do NOT
auto-discover new routes from `B2B_SHELL_ROUTE_KEYS`. The pattern:

- `catalog`: rendered **unconditionally** (always visible, not behind `hasShellRoute`)
- All other routes: rendered conditionally via `hasShellRoute(navigation.surface, routeKey)`
- `buyer_catalog`: **no entry** — completely absent from both desktop sidebar and mobile menu

`hasShellRoute` checks `surface.items.some(item => item.routeKey === routeKey)`.
`surface.items` is built from `B2B_SHELL_ROUTE_KEYS` in `resolveRuntimeShellNavigationSurface`.

**Consequence:** Adding `buyer_catalog` to `B2B_SHELL_ROUTE_KEYS` alone is insufficient to
surface a nav button. An explicit `hasShellRoute(navigation.surface, 'buyer_catalog')` entry must
also be added to the B2BShell JSX.

### 3.6 Shell Navigation Active Highlight Logic

**File:** `runtime/sessionRuntimeDescriptor.ts` — `resolveRuntimeShellNavigationSurface`

Navigation items are highlighted via `navigationKey = route.selectionKey` (no `bindingField`
is set for `b2b_workspace`). The active item is the one whose `navigationKey` matches
`resolveRuntimeNavigationKey(localRouteSelection.route)` = the active route's `selectionKey`.

With current config:
- `catalog.selectionKey = 'HOME'` → `navigationKey = 'HOME'`
- `buyer_catalog.selectionKey = 'HOME'` → `navigationKey = 'HOME'` ← **collision**

When `buyer_catalog` is active, `activeNavigationKey = 'HOME'` → the `catalog` nav item
highlights as active instead of a dedicated `buyer_catalog` item.

### 3.7 Supplier Picker Load Trigger (`App.tsx`)

`handleLoadSupplierPicker()` fetches `GET /api/tenant/b2b/eligible-suppliers` and populates
`supplierPickerItems`. It is currently called **only** from the "Browse Suppliers" button
handler (`App.tsx` line 3850):

```typescript
onClick={() => {
  navigateTenantManifestRoute('buyer_catalog');
  void handleLoadSupplierPicker();
}}
```

If a buyer navigates to `buyer_catalog` via the shell sidebar nav (once added), this handler
is NOT invoked. Phase A would render with `supplierPickerItems = []`, `supplierPickerLoading =
false`, `supplierPickerError = null` → showing the empty-state UI ("No eligible suppliers
found"), which is misleading since no fetch was attempted.

### 3.8 Seller Management Surface (`catalog` route)

**File:** `App.tsx` — `renderDescriptorAlignedTenantContentFamily('b2b_workspace')`

When `expView = 'HOME'` (default), `case 'catalog':` resolves and renders:
- Heading: "Wholesale Catalog" / Subheading: "Manage your wholesale product catalog."
- Action bar: Supplier RFQ Inbox | View My RFQs | **Browse Suppliers** | + Add Item
- Add Item form (with `price` field)
- Product grid with `renderB2BCatalogCardFooter` per item:
  - `renderCatalogItemMutationActions(product)` → **Edit** + **Delete** buttons
  - `B2BAddToCartButton`

This surface fetches the logged-in tenant's **own** catalog items via `GET /api/tenant/catalog/items`.
It is the seller catalog management surface — appropriate for a B2B tenant managing their own
supplier catalog. **Not a cross-tenant data leak.**

### 3.9 Buyer-Safe Surfaces (`buyer_catalog` route)

**Phase A — Supplier Picker** (when `buyerCatalogSupplierOrgId` is empty):
- Supplier cards: `legalName`, `primarySegment` (optional), `slug` (monospace)
- "Browse Catalog" button per card: sets `buyerCatalogSupplierOrgId` + triggers catalog fetch
- Loading, error, and empty states all present
- **No price. No admin controls.**

**Phase B — Item Grid** (when `buyerCatalogSupplierOrgId` is set):
- Item cards: `name`, `sku`, `description`, `moq`, `imageUrl`
- "Request Quote" per card → `handleOpenRfqDialog(asProduct)` with `price: 0` bridge
- "← All Suppliers" resets to Phase A (does NOT navigate to seller surface)
- **No price. No Edit/Delete. Read-only.**

**Backend:** `GET /api/tenant/catalog/supplier/:supplierOrgId/items` (Phase 1, auth-gated, no
price in select clause). `GET /api/tenant/b2b/eligible-suppliers` (Phase 2, auth-gated,
eligibility-gated, no UUID exposure to public, Gate E preserved).

---

## 4. Boundary Violation Analysis

### BV-001 — Route Binding Collision `{ expView: 'HOME' }` on both routes

| Attribute | Value |
|-----------|-------|
| Severity | Critical |
| Status | **FIXED — commit `1e499ad`** |
| Location | `runtime/sessionRuntimeDescriptor.ts` line 513 |
| Nature | Implementation failure — routing |

**Pre-fix state:** `buyer_catalog` had `stateBinding: { expView: 'HOME' }` — identical to
`catalog`. `resolveRuntimeLocalRouteSelection` iterates routes in order and returns the first
match. Since `catalog` precedes `buyer_catalog` and both matched `expView: 'HOME'`, calling
`navigateTenantManifestRoute('buyer_catalog')` set `expView = 'HOME'` and the route resolved
to `catalog`. The `buyer_catalog` case was permanently unreachable.

**Fix applied (2026-04-23):**
- `buyer_catalog` stateBinding changed to `{ expView: 'BUYER_CATALOG' }`
- `'BUYER_CATALOG'` added to `EXPERIENCE_VIEWS` in `App.tsx`

**Current state:** `buyer_catalog` IS reachable via `navigateTenantManifestRoute('buyer_catalog')`.

**Remaining action:** Production runtime revalidation — unit is
`IMPLEMENTED_PENDING_RUNTIME_REVALIDATION`. The follow-up runtime validation pass will confirm
Phase A and Phase B render correctly in the deployed environment.

---

### BV-002 — `buyer_catalog` absent from `B2B_SHELL_ROUTE_KEYS` and B2BShell nav

| Attribute | Value |
|-----------|-------|
| Severity | High |
| Status | **OPEN** |
| Location | `runtime/sessionRuntimeDescriptor.ts` lines 392–403 + `layouts/Shells.tsx` B2BShell |
| Nature | Shell navigation gap — no buyer-native entry point |

**Description:** `buyer_catalog` is not in `B2B_SHELL_ROUTE_KEYS`. The B2BShell desktop
sidebar and mobile menu have no entry for `buyer_catalog`. The only path to the buyer catalog
surface is the "Browse Suppliers" button inside the **seller** catalog surface header.

**User impact:** A buyer must first encounter the seller management surface (catalog, "+ Add
Item", Edit/Delete controls on their own catalog items) before they can navigate to the buyer
catalog. There is no direct shell navigation entry for buyer discovery activity.

**Data boundary note:** There is no cross-tenant data leakage here. The `catalog` surface shows
the buyer tenant's own catalog items (auth-gated to their own org). However, presenting the
seller management surface as the only accessible surface on first load — with no visible direct
path to buyer activity in the shell nav — is a **role-UI boundary violation**: a buyer-role
user sees exclusively seller-management affordances as their primary shell navigation.

**Required fix:**
1. Add `'buyer_catalog'` to `B2B_SHELL_ROUTE_KEYS` in `sessionRuntimeDescriptor.ts`
2. Add `{hasShellRoute(navigation.surface, 'buyer_catalog') && <button ... />}` nav entry to B2BShell desktop sidebar in `layouts/Shells.tsx`
3. Add `buyer_catalog` entry to `mobileMenuItems` array in B2BShell in `layouts/Shells.tsx`

---

### BV-003 — `selectionKey: 'HOME'` on both `catalog` and `buyer_catalog`

| Attribute | Value |
|-----------|-------|
| Severity | Medium (contingent) |
| Status | **OPEN** (contingent on BV-002) |
| Location | `runtime/sessionRuntimeDescriptor.ts` line 513 |
| Nature | Shell nav highlight ambiguity |

**Description:** Both routes share `selectionKey: 'HOME'`. The shell navigation active-highlight
logic uses `selectionKey` as the `navigationKey`. When the `buyer_catalog` route is active,
`activeNavigationKey = 'HOME'`, and the `catalog` nav item (also `navigationKey = 'HOME'`)
highlights as active. This would confuse users about which surface they are on.

This issue becomes observable only after BV-002 is fixed (i.e., after `buyer_catalog` appears
in shell navigation). Until then, `buyer_catalog` is not in the nav bar and the collision has
no user-visible effect.

**Required fix:** Change `buyer_catalog` `selectionKey` from `'HOME'` to `'BUYER_CATALOG'`
in `defineRuntimeRoute(...)` call in `sessionRuntimeDescriptor.ts`. `selectionKey` is typed as
`string` — no union restriction. Value `'BUYER_CATALOG'` is valid.

**Effect:** When on `buyer_catalog`, `activeNavigationKey = 'BUYER_CATALOG'` → only the
`buyer_catalog` nav item highlights. `catalog` nav item (`navigationKey = 'HOME'`) does NOT
highlight.

---

### BV-004 — Default landing is seller management surface (`catalog`)

| Attribute | Value |
|-----------|-------|
| Severity | Low / By-Design |
| Status | **DEFERRED — BY-DESIGN in dual-role B2B model** |
| Location | `runtime/sessionRuntimeDescriptor.ts` line 508 |
| Nature | UX concern; not a data or security boundary violation |

**Description:** `defaultLocalRouteKey: 'catalog'` means on login and tenant switch, all B2B
tenants land on the seller catalog management surface.

**Assessment:** In TexQtic's current B2B model, all B2B tenants are dual-role: they can both
manage their own supplier catalog AND browse/buy from other suppliers. The `catalog` route
correctly shows the tenant's OWN catalog items (auth-gated). There is no cross-tenant data
leakage. The seller management controls (Add Item, Edit, Delete) are appropriate for a B2B
tenant acting as a supplier.

The "Browse Suppliers" button in the seller catalog header provides access to the buyer surface.
Once BV-002 is fixed, the shell nav will provide direct access as well.

**No change recommended at this stage.** If/when a "buyer-only" tenant type is introduced that
should never see seller management, a role-discriminated default route would be appropriate.
That decision requires a new product decision document and is out of scope for this unit.

---

### BV-005 — Supplier picker load trigger absent from shell nav path

| Attribute | Value |
|-----------|-------|
| Severity | Medium (contingent) |
| Status | **OPEN** (contingent on BV-002) |
| Location | `App.tsx` — `handleLoadSupplierPicker()` call site |
| Nature | Incorrect empty state on shell nav entry |

**Description:** `handleLoadSupplierPicker()` is invoked only from the "Browse Suppliers"
button handler (`App.tsx` line 3850). When `buyer_catalog` is navigated to via the shell nav
(once BV-002 is added), `handleLoadSupplierPicker()` is NOT called. Phase A renders with
`supplierPickerItems = []`, `supplierPickerLoading = false` → shows the "No eligible suppliers
found" empty state UI, even though no fetch was attempted. This is misleading.

**Required fix:** Ensure `handleLoadSupplierPicker()` is triggered whenever the `buyer_catalog`
route is entered, regardless of entry path. Recommended approach: add a `useEffect` in `App.tsx`
that fires when `tenantLocalRouteSelection?.routeKey === 'buyer_catalog'` and the supplier
picker has not been loaded (`supplierPickerItems.length === 0 && !supplierPickerLoading &&
!supplierPickerError`). This covers both the "Browse Suppliers" button path (already loaded
eagerly, effect is a no-op) and the shell nav path (effect triggers fetch on entry).

**Scope note:** This change is in `App.tsx`. It is tightly bounded — one `useEffect` block.

---

## 5. Buyer-Safe Surface Model — Confirmed Correct

The following buyer-facing surfaces are confirmed **correct and buyer-safe** at the current HEAD.

| Surface | Route Key | API Endpoint | Price | Admin Controls | Cross-Tenant Risk |
|---------|-----------|--------------|-------|----------------|-------------------|
| Supplier picker (Phase A) | `buyer_catalog` | `GET /api/tenant/b2b/eligible-suppliers` | Absent ✅ | None ✅ | None — no UUID to public ✅ |
| Supplier catalog browse (Phase B) | `buyer_catalog` | `GET /api/tenant/catalog/supplier/:id/items` | Absent ✅ | None ✅ | Auth-gated, org-posture-gated ✅ |
| RFQ bridge from buyer catalog | Within `buyer_catalog` Phase B | `POST /api/tenant/rfq` (existing) | `price: 0` adapter ✅ | None ✅ | Supplier org ID pre-populated ✅ |
| "← All Suppliers" return | Within `buyer_catalog` Phase B | None | N/A | None ✅ | Does NOT navigate to seller surface ✅ |

**Gate E preserved:** `GET /api/public/b2b/suppliers` is unmodified. Public supplier projection
does not expose org UUIDs. The authenticated `eligible-suppliers` route is separate and serves
a distinct (authenticated) surface. Gate E comment at `publicB2BProjection.service.ts` line 16
explicitly prohibits org UUIDs in public output.

**Price boundary:**
- Phase A supplier picker: no price field in response schema or UI
- Phase B item grid: price absent from DB select clause; "Request Quote" bridge uses `price: 0`
  structural adapter (not displayed to buyer)
- Price disclosure remains deferred to Phase 4+ per `PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001.md`

---

## 6. Seller/Admin Surface Model — Must Remain Seller-Only

The following seller-management affordances are present on the `catalog` route (seller surface).
They must NEVER appear on the `buyer_catalog` route.

| Affordance | Location | Buyer-Safe? |
|------------|----------|-------------|
| "Manage your wholesale product catalog." heading | `renderDescriptorAlignedTenantContentFamily('b2b_workspace')` | Seller-only ✅ (not in buyer_catalog) |
| "+ Add Item" form with `price` field | Same | Seller-only ✅ (not in buyer_catalog) |
| `renderCatalogItemMutationActions` → Edit + Delete buttons | `renderB2BCatalogCardFooter` | Seller-only ✅ (not in buyer_catalog) |
| `B2BAddToCartButton` on seller catalog items | `renderB2BCatalogCardFooter` | Seller-only ✅ (not in buyer_catalog) |
| "Supplier RFQ Inbox" action | `catalog` header | Seller-only ✅ (appropriate) |

**CONFIRMED REPO TRUTH:** None of the above affordances appear in `case 'buyer_catalog':` in
`App.tsx`. The buyer catalog phases (A and B) are fully isolated from seller management controls.

---

## 7. Privacy and Security Assessment

### 7.1 Cross-Tenant Data Exposure

**Finding: NONE confirmed.**

- `catalog` route fetches the logged-in tenant's OWN catalog items via auth-gated
  `GET /api/tenant/catalog/items`. No cross-tenant data.
- `buyer_catalog` Phase B fetches supplier items via `GET /api/tenant/catalog/supplier/:id/items`.
  This endpoint is auth-gated (tenant JWT required) and org-posture-gated
  (`B2B_ELIGIBLE_PUBLICATION_ELIGIBLE` required). It returns only fields:
  `{ id, name, sku, description, moq, imageUrl }` — no price, no publication posture, no
  internal org fields.
- `eligible-suppliers` endpoint returns `{ id, slug, legalName, primarySegment }` — minimal
  safe disclosure. Response includes org UUID (`id`) but only to authenticated callers meeting
  the eligibility gate.

### 7.2 Authentication and Authorization

All buyer-facing API routes enforce:
- Tenant JWT authentication (existing `tenantJwt` security scheme)
- `org_id` scoping — every database query is scoped to the authenticated caller's org
- Eligibility gate — buyer can only see suppliers who meet B2B eligibility criteria

### 7.3 Role-UI Boundary (the actual "boundary violation")

The confirmed boundary failure is a **role-UI boundary violation**, not a data privacy violation:

- A buyer navigating to the B2B workspace encounters the seller management surface
  (`catalog` route) as the default landing.
- The only navigation path to the buyer discovery surface requires traversing the seller surface
  (via the "Browse Suppliers" header button) or being aware of this undiscoverable entry.
- When BV-001 existed (pre-fix), "Browse Suppliers" silently failed — leaving the buyer stranded
  on the seller surface with no visible indication of the failure.

After BV-001 fix: "Browse Suppliers" correctly navigates to `buyer_catalog`. But BV-002 means
there is still no shell-level buyer navigation entry. The buyer discovery surface is only
accessible from within the seller surface — an incorrect hierarchy for a buyer-role user.

### 7.4 Assessment Summary

| Concern | Status |
|---------|--------|
| Cross-tenant data leakage | ✅ None confirmed — auth and posture gates in place |
| Price exposure to buyer | ✅ None — price absent from all buyer-facing endpoints and UI |
| Seller admin controls visible to buyer on buyer surfaces | ✅ None — Phase A and Phase B are clean |
| Seller admin controls visible to buyer on default landing | ℹ️ Present on `catalog` (buyer's OWN data) — by-design, not a data leak |
| Route binding collision (BV-001) | ✅ Fixed — buyer_catalog is reachable |
| Shell nav gap (BV-002) | ⚠️ Open — buyer has no direct nav entry |
| Nav highlight ambiguity (BV-003) | ⚠️ Open — contingent on BV-002 |
| Load trigger gap (BV-005) | ⚠️ Open — empty state on shell nav entry |

---

## 8. Recommended Next Implementation Slice

**Proposed Unit:** `TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001`  
**Scope:** Add first-class shell navigation entry for `buyer_catalog`; fix selection key
collision; add route-entry load trigger for supplier picker.  
**Files:** `runtime/sessionRuntimeDescriptor.ts`, `layouts/Shells.tsx`, `App.tsx`

This is the **minimal corrective slice** required to close BV-002, BV-003, and BV-005. No
backend changes required. No API contract changes required. No new route key required.

### 8.1 Change 1 — `runtime/sessionRuntimeDescriptor.ts`

**Change A:** Add `'buyer_catalog'` to `B2B_SHELL_ROUTE_KEYS`.

```typescript
// Current (line 392):
const B2B_SHELL_ROUTE_KEYS: RuntimeLocalRouteKey[] = [
  'catalog',
  'orders',
  ...
];

// Proposed:
const B2B_SHELL_ROUTE_KEYS: RuntimeLocalRouteKey[] = [
  'catalog',
  'buyer_catalog',   // ← ADD: buyer-native shell nav entry
  'orders',
  ...
];
```

**Change B:** Fix `buyer_catalog` `selectionKey` from `'HOME'` to `'BUYER_CATALOG'`.

```typescript
// Current (line 513):
defineRuntimeRoute('buyer_catalog', 'Browse Supplier Catalog', 'HOME', { expView: 'BUYER_CATALOG' }, {})

// Proposed:
defineRuntimeRoute('buyer_catalog', 'Browse Supplier Catalog', 'BUYER_CATALOG', { expView: 'BUYER_CATALOG' }, {})
//                                                              ^^^^^^^^^^^^^^^ selectionKey distinct
```

**Rationale for placement of `'buyer_catalog'` in route keys array:** Placing `'buyer_catalog'`
immediately after `'catalog'` groups the two catalog-related routes together in the shell nav,
reflecting the supplier/buyer dual-role relationship. The exact position may be adjusted based
on UX product decision.

### 8.2 Change 2 — `layouts/Shells.tsx`

**Change A:** Desktop sidebar nav — add `buyer_catalog` button after `catalog` button.

```tsx
// After existing catalog button (line 362):
<button onClick={() => navigation.onNavigateRoute('catalog')} className="...">📦 Catalog</button>

// Add:
{hasShellRoute(navigation.surface, 'buyer_catalog') && (
  <button
    onClick={() => navigation.onNavigateRoute('buyer_catalog')}
    className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition"
  >
    🏪 Browse Suppliers
  </button>
)}
```

**Change B:** Mobile menu — add `buyer_catalog` entry to `mobileMenuItems` array (after the
hardcoded `catalog` entry).

```typescript
// Current mobileMenuItems starts with:
{ key: 'catalog', label: 'Catalog', onSelect: () => navigation.onNavigateRoute('catalog') },
// ... conditional entries ...

// Proposed — add after catalog entry:
...(hasShellRoute(navigation.surface, 'buyer_catalog')
  ? [{ key: 'buyer_catalog', label: 'Browse Suppliers', onSelect: () => navigation.onNavigateRoute('buyer_catalog') }]
  : []),
```

**Icon and label:** The emoji `🏪` and label `Browse Suppliers` are proposals consistent with
the existing B2BShell emoji-label pattern. The product owner may substitute these before
implementation.

### 8.3 Change 3 — `App.tsx`

**Add `useEffect` to trigger `handleLoadSupplierPicker()` on `buyer_catalog` route entry.**

```typescript
// Add near other buyer_catalog-related useEffect hooks:
useEffect(() => {
  if (tenantLocalRouteSelection?.routeKey !== 'buyer_catalog') {
    return;
  }
  if (supplierPickerItems.length > 0 || supplierPickerLoading || supplierPickerError) {
    return;  // already loaded or in-flight — no-op
  }
  void handleLoadSupplierPicker();
}, [tenantLocalRouteSelection?.routeKey]);
```

**Rationale:** This effect fires whenever `buyer_catalog` becomes the active route. The guard
conditions prevent redundant refetches:
- `supplierPickerItems.length > 0` — already loaded (e.g., user entered via "Browse Suppliers" then navigated away and back)
- `supplierPickerLoading` — fetch is already in-flight
- `supplierPickerError` — previous fetch errored; user must click Retry; do not auto-retry

**Dependency array note:** The implementation prompt should review exhaustive-deps lint rules
for this specific useEffect. The dependency array should include all referenced values from
outside the effect scope per the repo's established pattern.

### 8.4 Implementation Allowlist (for the next prompt)

| File | Change Type | BV Fixed |
|------|-------------|----------|
| `runtime/sessionRuntimeDescriptor.ts` | Modify: `B2B_SHELL_ROUTE_KEYS`, `buyer_catalog` `selectionKey` | BV-002, BV-003 |
| `layouts/Shells.tsx` | Modify: B2BShell desktop nav + mobile menu | BV-002 |
| `App.tsx` | Modify: add `useEffect` for supplier picker load on nav entry | BV-005 |

**Forbidden from allowlist (must NOT be changed in this slice):**
- `server/` (any file) — no backend changes required
- `shared/contracts/` (any file) — no API contract changes required
- `runtime/sessionRuntimeDescriptor.ts` — all fields EXCEPT `B2B_SHELL_ROUTE_KEYS` and `buyer_catalog` route entry selectionKey
- `.env`, `prisma/schema.prisma`, `middleware.ts` — not in scope

### 8.5 Required Verification Evidence

After implementation:

| Check | Evidence Required |
|-------|------------------|
| G1 Frontend typecheck | `npx tsc --noEmit` → zero errors |
| G2 Server typecheck | `pnpm -C server run typecheck` → no new errors (baseline: 6 pre-existing) |
| G3 Lint | `pnpm -C server run lint` → 0 errors; warning count unchanged or explicitly noted |
| R1 Shell nav renders buyer_catalog | "Browse Suppliers" nav item visible in B2BShell sidebar |
| R2 Shell nav click navigates | Clicking "Browse Suppliers" in sidebar reaches Phase A (supplier picker) |
| R3 Supplier picker loads | Phase A shows suppliers (or eligible empty state) after nav |
| R4 Phase B still works | Selecting supplier enters Phase B correctly |
| R5 "← All Suppliers" still correct | Does NOT navigate to seller surface |
| R6 Catalog nav item highlight | When on `catalog` route, catalog nav highlights; buyer_catalog nav does NOT |
| R7 buyer_catalog nav item highlight | When on `buyer_catalog` route, buyer_catalog nav highlights; catalog nav does NOT |
| R8 "Browse Suppliers" header button still works | Existing seller surface button still navigates to Phase A |
| R9 Price absent | Phase B item cards show no price |
| R10 No admin controls in Phase B | No Edit, Delete, or Add Item in Phase B |

---

## 9. Neighbor-Path Smoke Checks

The following paths must NOT be broken by the implementation slice. These are pre-existing
features that interact with the modified components.

| Path | Risk from Changes | Mitigation |
|------|-------------------|------------|
| `catalog` route (seller surface) navigation | Shells.tsx and sessionRuntimeDescriptor.ts changes | `catalog` button is unconditional; its `selectionKey = 'HOME'` is unchanged |
| Shell nav items: `orders`, `dpp`, `escrow`, `escalations`, `settlement`, `certifications`, `traceability`, `audit_logs`, `trades` | sessionRuntimeDescriptor.ts B2B_SHELL_ROUTE_KEYS change | These keys are added, not removed; `hasShellRoute` pattern unchanged |
| Mobile menu completeness | Shells.tsx mobileMenuItems change | Only additive; existing entries unchanged |
| `navigateTenantManifestRoute('catalog')` | No change | Unchanged |
| `navigateTenantDefaultManifestRoute()` → `catalog` | `defaultLocalRouteKey` is unchanged | No impact |
| `resetTenantScopedRouteState()` on tenant switch | Resets `expView = 'HOME'` → catalog | Correct; buyer_catalog does not persist across tenant switches |
| `handleLoadSupplierPicker()` called from "Browse Suppliers" header button | App.tsx useEffect + direct call | Effect is a no-op when already loading/loaded; dual-call is safe |
| Phase 1 RFQ flow from seller catalog | Unmodified | No changes to RFQ dialog or seller catalog render path |
| Phase 2 supplier picker error/retry flow | App.tsx useEffect guard | Guard prevents auto-retry on error; Retry button still works |

---

## 10. Production Verification Requirements

Two production validation passes are required:

### 10.1 BV-001 Follow-up Validation (already required — pre-existing)

**Unit:** `TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001`  
**Status:** `IMPLEMENTED_PENDING_RUNTIME_REVALIDATION`  
**Required artifact:** Follow-up production runtime validation pass confirming:
- T1: `GET /api/tenant/b2b/eligible-suppliers` returns 200 with `{ items: [...], total: N }`
- T2: `GET /api/tenant/b2b/eligible-suppliers` returns 401 without auth
- T3: Phase A renders eligible supplier list correctly
- T4: Phase B renders supplier items with no price
- T5: "← All Suppliers" returns to Phase A without navigating to seller surface
- T6: RFQ dialog opens from Phase B item card
- T7: Phase 1 regression: `GET /api/tenant/catalog/supplier/:id/items` still works

**Lifts:** NB-001 from Phase 1 and Phase 2 verification artifacts.

### 10.2 BV-002/BV-003/BV-005 Validation (after TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001)

**Required artifact:** New production runtime validation confirming:
- N1: "Browse Suppliers" nav item visible in B2BShell sidebar
- N2: Clicking sidebar "Browse Suppliers" → Phase A renders with supplier list loading
- N3: Phase A renders correctly after load completes
- N4: Shell nav `buyer_catalog` item highlights when on Phase A or Phase B
- N5: Shell nav `catalog` item does NOT highlight when on `buyer_catalog` surface
- N6: Clicking sidebar "Catalog" item still navigates to seller catalog correctly
- N7: All existing paths (R4–R10 from §8.5) pass
- N8: Mobile menu contains "Browse Suppliers" entry

**Lifts:** BV-002, BV-003, BV-005 from this design document.

---

## 11. Governance Control File Update Requirements

Per TECS §1 (Gap Lifecycle) and AGENTS.md §12 output requirements, the following governance
files require updates after this design is accepted:

| File | Required Update |
|------|----------------|
| `governance/control/NEXT-ACTION.md` | Update `layer_0_action` to reflect DESIGN_COMPLETE; add TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001 as proposed next unit |
| `governance/control/OPEN-SET.md` | Add operating note for this design artifact |
| `governance/control/SNAPSHOT.md` | Update snapshot to reflect design completion |

These updates are performed in the governance commit accompanying this design artifact.

---

## 12. Commit Message

```
[GOVERNANCE] design buyer marketplace boundary fix — TECS-B2B-BUYER-MARKETPLACE-BOUNDARY-DESIGN-001
```

---

## 13. Summary

| Violation | Status | Fix Required |
|-----------|--------|--------------|
| BV-001: Route binding collision `{ expView: 'HOME' }` | ✅ **FIXED** (commit `1e499ad`) | Pending production revalidation only |
| BV-002: `buyer_catalog` absent from shell navigation | ⚠️ **OPEN** | Add to `B2B_SHELL_ROUTE_KEYS`; add B2BShell nav entry |
| BV-003: `selectionKey` collision (`'HOME'` on both routes) | ⚠️ **OPEN** | Change `buyer_catalog` `selectionKey` to `'BUYER_CATALOG'` |
| BV-004: Default landing is seller surface | ℹ️ **BY-DESIGN** | No change — dual-role B2B model; revisit if buyer-only type is introduced |
| BV-005: Supplier picker load trigger absent from shell nav path | ⚠️ **OPEN** | Add `useEffect` in `App.tsx` triggered by `buyer_catalog` route entry |

**Next required step:** Obtain product owner authorization to proceed with
`TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001` as described in §8. This design artifact is the
authorizing input for that implementation prompt.

---
