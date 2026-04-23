# TECS-B2B-BUYER-CATALOG-ROUTE-BINDING-FIX-001-v1

**Unit type:** Bounded implementation — minimal-diff, targeted fix  
**Status:** IMPLEMENTED_PENDING_RUNTIME_REVALIDATION  
**Date:** 2026-04-23  
**Input artifact:** `docs/TECS-B2B-BUYER-CATALOG-RUNTIME-VALIDATION-v1.md`  
**Related delivery units:** TECS-B2B-BUYER-CATALOG-BROWSE-001 · TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001  

---

## 1. Purpose

Fix the production runtime failure documented in the input artifact. The `buyer_catalog` route was permanently unreachable because its `stateBinding` was identical to the `catalog` route. The `.find()` in `resolveRuntimeLocalRouteSelection` always matched `catalog` first, making `buyer_catalog` unreachable regardless of navigation intent.

---

## 2. Runtime Failure Being Fixed — CONFIRMED REPO TRUTH

Both routes in the `b2b_workspace.catalog_browse` group shared the same `stateBinding`:

```typescript
// runtime/sessionRuntimeDescriptor.ts — before fix (BROKEN)
defineRuntimeRoute('catalog',       'Catalog',                'HOME', { expView: 'HOME' }, { defaultForGroup: true }),
defineRuntimeRoute('buyer_catalog', 'Browse Supplier Catalog','HOME', { expView: 'HOME' }, {}),
```

Resolution path (BROKEN):
1. "Browse Suppliers" button calls `navigateTenantManifestRoute('buyer_catalog')`
2. `getRuntimeLocalRouteRegistration` correctly fetches `buyer_catalog` by key
3. `buyer_catalog.stateBinding.expView = 'HOME'` → `setExpView('HOME')`
4. `tenantWorkspaceRuntimeHandoff` recomputes with `expView = 'HOME'`
5. `resolveRuntimeLocalRouteSelection` runs `.find()` over routes — `catalog` binding `{ expView: 'HOME' }` matches first
6. `tenantLocalRouteSelection.routeKey = 'catalog'` (wrong)
7. `switch` dispatches to `case 'catalog':` — seller catalog renders, not the supplier picker

Additionally, `normalizeExperienceView` in `App.tsx` guards against unknown values, returning `'HOME'` as fallback. Until `'BUYER_CATALOG'` was added to `EXPERIENCE_VIEWS`, even a correct binding would have been silently collapsed back to `'HOME'`.

---

## 3. Scope — CONFIRMED REPO TRUTH

| Scope item | Status |
|---|---|
| Seller-side `catalog` route and its `{ expView: 'HOME' }` binding | **UNTOUCHED** |
| `case 'catalog':` render branch in App.tsx `switch` | **UNTOUCHED** |
| `case 'buyer_catalog':` render branch in App.tsx `switch` | **UNTOUCHED** |
| "Browse Suppliers" button handler at App.tsx line 3849 | **UNTOUCHED** |
| `handleLoadSupplierPicker` / `getEligibleSuppliers()` | **UNTOUCHED** |
| Backend route `/tenant/b2b/eligible-suppliers` | **UNTOUCHED** |
| `services/catalogService.ts` | **UNTOUCHED** |
| All other runtime descriptors and manifest entries | **UNTOUCHED** |
| Default app-load behavior (`expView = 'HOME'` → `catalog`) | **PRESERVED** |
| Phase 3+ features (search, price negotiation, allowlist) | **OUT OF SCOPE** |
| Combined buyer-side B2B governance closure | **DEFERRED — awaiting follow-up production validation** |

---

## 4. Binding Before / After — IMPLEMENTED IN THIS UNIT

### `runtime/sessionRuntimeDescriptor.ts` — line 513

**Before (broken):**
```typescript
defineRuntimeRoute('buyer_catalog', 'Browse Supplier Catalog', 'HOME', { expView: 'HOME' }, {}),
```

**After (fixed):**
```typescript
defineRuntimeRoute('buyer_catalog', 'Browse Supplier Catalog', 'HOME', { expView: 'BUYER_CATALOG' }, {}),
```

### `App.tsx` — `EXPERIENCE_VIEWS` constant (line 858)

**Before (missing value — would cause normalizeExperienceView to return 'HOME' fallback):**
```typescript
const EXPERIENCE_VIEWS = [
  'HOME',
  'ORDERS',
  // ... (no 'BUYER_CATALOG')
] as const;
```

**After (includes 'BUYER_CATALOG'):**
```typescript
const EXPERIENCE_VIEWS = [
  'HOME',
  'BUYER_CATALOG',
  'ORDERS',
  // ...
] as const;
```

---

## 5. Files Changed — IMPLEMENTED IN THIS UNIT

| File | Change |
|---|---|
| `runtime/sessionRuntimeDescriptor.ts` | `buyer_catalog` stateBinding: `{ expView: 'HOME' }` → `{ expView: 'BUYER_CATALOG' }` |
| `App.tsx` | Added `'BUYER_CATALOG'` to `EXPERIENCE_VIEWS` constant |

**No other files changed.**

---

## 6. Why This Is the Minimal Fix

The binding collision is a single-field data error at the route declaration site. The minimal fix is to assign a unique discriminant value to `buyer_catalog`. No structural changes to the resolution algorithm, navigation function, switch branches, render branches, or backend are needed.

Two files must change because the type system enforces that `ExperienceView` is a closed union derived from `EXPERIENCE_VIEWS`. A new value in the binding must be a known member of that union, or `normalizeExperienceView` silently drops it back to `'HOME'` — recreating the exact failure mode. Both edits together constitute the minimal complete fix.

---

## 7. Corrected Resolution Path — VERIFIED (static analysis)

1. "Browse Suppliers" button calls `navigateTenantManifestRoute('buyer_catalog')`
2. `getRuntimeLocalRouteRegistration` fetches `buyer_catalog` by key (finds it, unchanged)
3. `buyer_catalog.stateBinding.expView = 'BUYER_CATALOG'`
4. `setExpView(normalizeExperienceView('BUYER_CATALOG'))` — `'BUYER_CATALOG'` is now in `EXPERIENCE_VIEWS` → returns `'BUYER_CATALOG'`
5. `expView` state = `'BUYER_CATALOG'`
6. `tenantWorkspaceRuntimeHandoff` recomputes: `resolveRuntimeFamilyEntryHandoff(descriptor, 'EXPERIENCE', { expView: 'BUYER_CATALOG', showCart })`
7. `normalizeRuntimeRouteInput` (default case, covers `b2b_workspace`): `{ expView: 'BUYER_CATALOG', ... }`
8. `resolveRuntimeLocalRouteSelection`.find():
   - `catalog` binding `{ expView: 'HOME' }`: `'HOME' !== 'BUYER_CATALOG'` → `false` → NO MATCH ✅
   - `buyer_catalog` binding `{ expView: 'BUYER_CATALOG' }`: `'BUYER_CATALOG' === 'BUYER_CATALOG'` → MATCH ✅
9. `tenantLocalRouteSelection.routeKey = 'buyer_catalog'`
10. `switch` → `case 'buyer_catalog':` → supplier picker renders ✅

Startup behavior (unchanged):
- Initial `expView = 'HOME'` → `catalog` matches first → seller catalog loads (correct, preserved) ✅

---

## 8. Answers to Required Prompt Questions

**Q1. What is the exact binding collision and why does `.find()` always pick `catalog`?**  
Both `catalog` and `buyer_catalog` declared `{ expView: 'HOME' }`. `listRuntimeLocalRouteRegistrations` returns them in declaration order. `resolveRuntimeLocalRouteSelection` uses `.find()` which stops at the first match. `catalog` is declared first → it always matches `{ expView: 'HOME' }` before `buyer_catalog` is evaluated.

**Q2. What type must `'BUYER_CATALOG'` be added to in `App.tsx`, and why?**  
`'BUYER_CATALOG'` must be added to the `EXPERIENCE_VIEWS` `as const` array. `ExperienceView` is derived as `(typeof EXPERIENCE_VIEWS)[number]`, and `normalizeExperienceView` guards with `EXPERIENCE_VIEWS.includes(view)` — any value not in the array returns `'HOME'`. Without this addition, `setExpView` would receive `'HOME'` and the collision would persist.

**Q3. Does `normalizeRuntimeRouteInput` for `b2b_workspace` pass `'BUYER_CATALOG'` through correctly?**  
Yes. `b2b_workspace` falls to the `default` case: `{ expView: input.expView ?? 'HOME', ... }`. When `input.expView = 'BUYER_CATALOG'` (non-null), it passes through unchanged.

**Q4. Does `getRuntimeLocalRouteRegistration` correctly find `buyer_catalog` when called by `navigateTenantManifestRoute`?**  
Yes. It uses `.find(r => r.route.key === routeKey)` — direct key match, not binding match. This function has always worked correctly. The bug was only in `resolveRuntimeLocalRouteSelection` which uses binding-based `.find()`.

**Q5. Is the "Browse Suppliers" button call site correct?**  
Yes. App.tsx line 3849: `onClick={() => { navigateTenantManifestRoute('buyer_catalog'); void handleLoadSupplierPicker(); }}` is correct as-is and requires no changes.

**Q6. Is the `case 'buyer_catalog':` render branch correct?**  
Yes. The switch branch at App.tsx line 4411 is correct as-is. No changes needed.

**Q7. Are there any other routes that could collide with `'BUYER_CATALOG'`?**  
No. `'BUYER_CATALOG'` is a new discriminant value not used by any other route binding in the manifest. The full route list was audited in the input validation artifact and in this session.

**Q8. Does the fix affect seller-side `catalog` behavior?**  
No. `catalog.stateBinding.expView = 'HOME'` is unchanged. All paths that previously resolved to `catalog` still resolve to `catalog`. The fix only affects the previously unreachable `buyer_catalog` path.

---

## 9. Explicitly Out of Scope — OUT OF SCOPE

- Phase 3+ supplier catalog features: full-text search, price negotiation, item detail view
- `buyer_catalog` → supplier allowlist management
- Backend route changes
- Schema changes
- Any RLS policy changes
- Combined buyer-side B2B governance closure (NB-001, NB-002, NB-003 remain unlifted)
- Modifying any other route's binding

---

## 10. Required Follow-On Validation — FOLLOW-ON VALIDATION

A production runtime validation pass is required to lift NB-001, NB-002, NB-003 and close the combined buyer-side B2B governance unit. The validation must:

1. Deploy the fix to production (`origin/main`)
2. Log in as `qa.b2b@texqtic.com` (B2B tenant — B2BShell, `b2b_workspace` manifest)
3. Confirm "Browse Suppliers" button navigates to the supplier picker view (`case 'buyer_catalog':`)
4. Confirm the supplier list loads (HTTP 200 from `/api/tenant/b2b/eligible-suppliers`)
5. Confirm selecting a supplier updates the catalog view (Phase A/B behavior)
6. Confirm that navigating away from `buyer_catalog` (e.g., via shell nav to `catalog`) returns the seller catalog (regression check)
7. Document results in a follow-up validation artifact
8. If PASS: update `governance/control/NEXT-ACTION.md`, `OPEN-SET.md`, `SNAPSHOT.md` to reflect combined governance closure

Governance notes NB-001, NB-002, NB-003 from the prior validation artifact remain unlifted until Step 7 is completed and results are PASS.

---

*TECS-B2B-BUYER-CATALOG-ROUTE-BINDING-FIX-001-v1 — TexQtic implementation artifact*
