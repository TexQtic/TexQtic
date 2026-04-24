# TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001 — Implementation Artifact

**Unit:** `TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001`  
**Status:** `IMPLEMENTED_PENDING_RUNTIME_REVALIDATION`  
**Authorizing Design:** `docs/TECS-B2B-BUYER-MARKETPLACE-BOUNDARY-DESIGN-001-v1.md` (DESIGN_COMPLETE, commit `f04d9cf`)  
**Implementation Commit:** See §8  
**Date:** 2025-07-19

---

## 1. Purpose

Close the three bounded violations (BV-002, BV-003, BV-005) identified in the authorizing design artifact. Restore correct shell navigation access to the buyer catalog flow for B2B workspace tenants, isolate the `buyer_catalog` selection key from the seller `catalog`, and ensure the supplier picker loads when the route is entered via shell nav.

BV-001 was fixed in a prior unit (`1e499ad`). BV-004 is BY-DESIGN and was not touched.

---

## 2. Scope

### In scope (this unit)
- Add `buyer_catalog` to `B2B_SHELL_ROUTE_KEYS` in `runtime/sessionRuntimeDescriptor.ts` (A1)
- Change `buyer_catalog` `selectionKey` from `'HOME'` to `'BUYER_CATALOG'` in `runtime/sessionRuntimeDescriptor.ts` (A2)
- Add `buyer_catalog` nav entry to B2BShell desktop sidebar and mobile menu in `layouts/Shells.tsx` (B)
- Add `isBuyerCatalogEntrySurface` derived boolean and route-entry `useEffect` for supplier picker load trigger in `App.tsx` (C)
- This implementation artifact (D)

### Out of scope (this unit)
- Backend routes, schema, Prisma, or API contract changes — OUT OF SCOPE
- BV-004 (`defaultLocalRouteKey: 'catalog'`) — BY-DESIGN, NOT CHANGED
- `buyer_catalog` Phase A/B rendering — BV-001 already closed, NOT RE-OPENED
- Authentication, RLS, or session logic — OUT OF SCOPE
- Control-plane routes or middleware — OUT OF SCOPE
- Any formatting, refactor, or cleanup beyond the task — OUT OF SCOPE

---

## 3. Source Artifacts Reviewed

| Artifact | Status at Review |
|---|---|
| `docs/TECS-B2B-BUYER-MARKETPLACE-BOUNDARY-DESIGN-001-v1.md` | CONFIRMED REPO TRUTH — DESIGN_COMPLETE |
| `runtime/sessionRuntimeDescriptor.ts` | CONFIRMED REPO TRUTH — B2B_SHELL_ROUTE_KEYS lines 392–403 |
| `layouts/Shells.tsx` | CONFIRMED REPO TRUTH — B2BShell desktop + mobile sections reviewed |
| `App.tsx` | CONFIRMED REPO TRUTH — handleLoadSupplierPicker call sites, buyer catalog state vars, derived surface booleans |

---

## 4. Repo-Truth Revalidation Results

### Anchor 1 — `buyer_catalog` absent from `B2B_SHELL_ROUTE_KEYS`
**File:** `runtime/sessionRuntimeDescriptor.ts` lines 392–403  
**Finding:** CONFIRMED OPEN — `'buyer_catalog'` not present in array  

### Anchor 2 — `buyer_catalog` absent from B2BShell nav (desktop + mobile)
**File:** `layouts/Shells.tsx` B2BShell section  
**Finding:** CONFIRMED OPEN — no desktop `<button>` and no mobile menu entry for `buyer_catalog`  

### Anchor 3 — `buyer_catalog` selectionKey still `'HOME'`
**File:** `runtime/sessionRuntimeDescriptor.ts` line ~513  
**Finding:** CONFIRMED OPEN — `defineRuntimeRoute('buyer_catalog', 'Browse Supplier Catalog', 'HOME', { expView: 'BUYER_CATALOG' }, {})`  

### Anchor 4 — supplier picker load only from header button path
**File:** `App.tsx`  
**Finding:** CONFIRMED OPEN — `handleLoadSupplierPicker` called only at lines 3850 (header "Browse Suppliers" button) and 4435 (Phase A retry button); no route-entry trigger  

### Anchor 5 — `catalog` and `buyer_catalog` route cases are distinct in App.tsx
**File:** `App.tsx` switch at line 4309  
**Finding:** CONFIRMED — `case 'catalog':` and `case 'buyer_catalog':` are separate; BV-001 fix intact (`stateBinding: { expView: 'BUYER_CATALOG' }`)

---

## 5. Design Directives Implemented

All directives from `docs/TECS-B2B-BUYER-MARKETPLACE-BOUNDARY-DESIGN-001-v1.md` §8 applicable to this unit:

| Directive | Implementation |
|---|---|
| §8.1 A1: Add `'buyer_catalog'` to `B2B_SHELL_ROUTE_KEYS` | ✅ IMPLEMENTED IN THIS UNIT |
| §8.1 A2: Change `buyer_catalog` selectionKey to `'BUYER_CATALOG'` | ✅ IMPLEMENTED IN THIS UNIT |
| §8.2 B: Add `buyer_catalog` nav button in B2BShell desktop sidebar | ✅ IMPLEMENTED IN THIS UNIT |
| §8.2 B: Add `buyer_catalog` entry in B2BShell mobile menu | ✅ IMPLEMENTED IN THIS UNIT |
| §8.3 C: Add route-entry useEffect to trigger supplier picker load | ✅ IMPLEMENTED IN THIS UNIT |

---

## 6. Changes Made

### `runtime/sessionRuntimeDescriptor.ts`

**A1 — Add `'buyer_catalog'` to `B2B_SHELL_ROUTE_KEYS`:**
```diff
 const B2B_SHELL_ROUTE_KEYS: RuntimeLocalRouteKey[] = [
   'catalog',
+  'buyer_catalog',
   'orders',
   'dpp',
```
IMPLEMENTED IN THIS UNIT — BV-002 closed.

**A2 — Fix `buyer_catalog` selectionKey collision:**
```diff
-defineRuntimeRoute('buyer_catalog', 'Browse Supplier Catalog', 'HOME', { expView: 'BUYER_CATALOG' }, {})
+defineRuntimeRoute('buyer_catalog', 'Browse Supplier Catalog', 'BUYER_CATALOG', { expView: 'BUYER_CATALOG' }, {})
```
IMPLEMENTED IN THIS UNIT — BV-003 closed.

### `layouts/Shells.tsx`

**B — Add `buyer_catalog` nav entries:**

Mobile menu array — after `catalog` entry:
```diff
 { key: 'catalog', label: 'Catalog', onSelect: () => navigation.onNavigateRoute('catalog') },
+...(hasShellRoute(navigation.surface, 'buyer_catalog') ? [{ key: 'buyer_catalog', label: 'Browse Suppliers', onSelect: () => navigation.onNavigateRoute('buyer_catalog') }] : []),
 ...(hasShellRoute(navigation.surface, 'orders') ? [...] : []),
```

Desktop sidebar — after `catalog` button:
```diff
 <button onClick={() => navigation.onNavigateRoute('catalog')} ...>📦 Catalog</button>
+{hasShellRoute(navigation.surface, 'buyer_catalog') && <button onClick={() => navigation.onNavigateRoute('buyer_catalog')} ...>🏪 Browse Suppliers</button>}
 {hasShellRoute(navigation.surface, 'orders') && <button ...>🛍️ Orders</button>}
```
IMPLEMENTED IN THIS UNIT — BV-002 UI closed.

### `App.tsx`

**C1 — Add `isBuyerCatalogEntrySurface` derived boolean:**
```diff
   const isB2BCatalogEntrySurface = appState === 'EXPERIENCE'
     && tenantLocalRouteSelection?.routeKey === 'catalog'
     && tenantBaseCategory === 'B2B'
     && !tenantHasWhiteLabelCapability;
+  const isBuyerCatalogEntrySurface = appState === 'EXPERIENCE'
+    && tenantLocalRouteSelection?.routeKey === 'buyer_catalog'
+    && tenantBaseCategory === 'B2B';
   const isWlAdminProductsSurface = ...
```

**C2 — Add route-entry useEffect for BV-005:**
```typescript
// BV-005 (TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001): Trigger supplier picker load on shell-nav entry to buyer_catalog.
// Guard: no-op if items already loaded, fetch in-flight, or fetch errored (user must Retry explicitly).
useEffect(() => {
  if (!isBuyerCatalogEntrySurface) {
    return;
  }
  if (supplierPickerItems.length > 0 || supplierPickerLoading || supplierPickerError) {
    return;
  }
  void handleLoadSupplierPicker();
}, [isBuyerCatalogEntrySurface, supplierPickerItems.length, supplierPickerLoading, supplierPickerError]);
```
IMPLEMENTED IN THIS UNIT — BV-005 closed.

---

## 7. Why This Is the Minimal Correct Fix

- A1+A2 are the minimum changes to the route manifest to expose `buyer_catalog` in shell nav and eliminate the `selectionKey` collision with `catalog`. No other manifest entries were touched.
- B follows the exact same conditional `hasShellRoute` pattern used by every other route in B2BShell. No layout structure, styles, or unrelated nav entries were changed.
- C follows the exact same `isSurface → useEffect` pattern used by `shouldLoadAppCatalog`. The derived boolean is needed to give the effect a stable primitive dependency. The guard conditions match those specified in the design artifact and prevent double-firing.
- The "Browse Suppliers" header button call path (line 3850) is preserved unchanged — BV-005 fix adds a second trigger path, it does not replace the existing one.

---

## 8. Static Verification

**Frontend typecheck (`npx tsc --noEmit`):**  
Result: **0 errors** — PASS ✅

**Server typecheck (`pnpm -C server run typecheck`):**  
Result: **6 pre-existing errors, 0 new errors** — PASS ✅  
(Pre-existing: `tenant.ts` TS7006 ×2, `tenantProvision.service.test.ts` TS2345 ×1, `tenantProvision.types.ts` TS2322 ×2 + TS2339 ×1)

**Scoped lint (`npx eslint App.tsx layouts/Shells.tsx runtime/sessionRuntimeDescriptor.ts`):**  
Result: **2 pre-existing no-undef errors, 5 pre-existing exhaustive-deps warnings, 0 new issues** — PASS ✅  
(Pre-existing errors: `App.tsx:3419` HTMLFormElement, `Shells.tsx:172` HTMLDetailsElement)

**Git diff (`git diff --name-only`):**  
Modified files: `App.tsx`, `layouts/Shells.tsx`, `runtime/sessionRuntimeDescriptor.ts` — exactly the allowlist ✅

---

## 9. Required Post-Deploy Production Verification

The following checks MUST be performed against the deployed production environment before this unit can be marked `CLOSED`.

### R-series — BV-specific verification

| Check | Action | Expected |
|---|---|---|
| R1 | Open B2B workspace as buyer tenant | "Browse Suppliers" appears in desktop sidebar |
| R2 | Open B2B workspace as buyer tenant on mobile | "Browse Suppliers" appears in mobile menu |
| R3 | Click "Browse Suppliers" in desktop sidebar | Route transitions to `buyer_catalog`; supplier picker renders |
| R4 | Click "Browse Suppliers" in mobile menu | Same as R3 |
| R5 | Navigate to `buyer_catalog` via shell nav (R3/R4) | Supplier picker loads automatically; no manual button press required |
| R6 | Click "Browse Suppliers" header button (existing path) | Still works; supplier picker loads (no regression) |
| R7 | Confirm `catalog` nav item still renders and is selectable | Seller catalog route unaffected |
| R8 | Confirm `catalog` selection highlight is `catalog` only (not `buyer_catalog`) | selectionKey collision resolved |
| R9 | Confirm `buyer_catalog` selection highlight is `buyer_catalog` only | BV-003 closed |
| R10 | Enter `buyer_catalog` via shell nav; supplier picker already loaded; navigate away; return via shell nav | Guard prevents reload; items persist |

### N-series — Neighbor-path smoke checks

NEIGHBOR-PATH SMOKE CHECK REQUIRED for each of the following:

| Check | Path |
|---|---|
| SC-01 | Seller-side `catalog` route still renders correctly (no regression from A1/A2) |
| SC-02 | Sidebar "Browse Suppliers" nav item appears for B2B workspace tenant |
| SC-03 | Mobile "Browse Suppliers" nav item appears for B2B workspace tenant |
| SC-04 | `buyer_catalog` route active/highlight state correct after selection |
| SC-05 | `catalog` route active/highlight state correct; not affected by BV-003 fix |
| SC-06 | Entering `buyer_catalog` via shell nav triggers supplier picker load (BV-005) |
| SC-07 | Entering `buyer_catalog` via header "Browse Suppliers" button still triggers supplier picker load |
| SC-08 | Selecting a supplier from picker enters Phase B (buyer item browse) correctly |
| SC-09 | "← All Suppliers" button in Phase B stays in buyer-safe flow; returns to Phase A picker |
| SC-10 | RFQ continuity still works from buyer item card in Phase B |

---

## 10. Adjacent Findings

None. No unexpected patterns, deferred issues, or new findings were identified during implementation. The codebase around the affected files matched the design artifact expectations exactly.

---

## 11. Next Move Recommendation

1. Deploy to production (standard Vercel deploy pipeline).
2. Execute post-deploy production verification checks R1–R10 and SC-01–SC-10.
3. Upon passing all checks, update governance control files to reflect `TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001` = `CLOSED`.
4. Update `governance/control/NEXT-ACTION.md`, `OPEN-SET.md`, `SNAPSHOT.md` to reflect the next delivery unit.

---

*Implementation by GitHub Copilot — TexQtic AGENTS.md §12 compliant output.*
