# TECS-BUYER-PDP-SELF-SUPPLIER-SAFE-UX-001 — Evidence Report

**Task:** Safe UX copy improvement for buyer PDP restricted-access message  
**Scope:** Frontend-only (no backend changes, no schema changes, no migration)  
**Classification:** UX / Copy — Non-disclosure-safe  
**Status:** COMPLETE

---

## 1. Problem Statement

When a dual-role tenant (an org that is both a supplier and a buyer) navigated to their own supplier catalog via the buyer PDP surface, the denied/restricted state rendered:

> "Item not found or unavailable."

This generic copy was:
- Accurate (the item IS unavailable in buyer view)
- Non-disclosing (does not expose policy internals)
- **Unclear** — provides no context for why a supplier can't access their own approval-gated items from the buyer PDP

The self-supplier block is **correct behavior** (classified `EXPECTED_SELF_SUPPLIER_BLOCK` in `TECS-BUYER-PDP-404-INVESTIGATION-001-REPORT.md`). The task is copy-only clarity.

---

## 2. Investigation Findings

### 2.1 Message rendering location

`CatalogPdpSurface.tsx` → `CatalogPdpSurface()` function body:
```
if (error === 'NOT_FOUND' || (error == null && item == null)) {
  renders: CATALOG_PDP_NOT_FOUND_COPY
}
```

`App.tsx` holds the parallel constant `PDP_NOT_FOUND_COPY` (mirrored into `__B2B_BUYER_CATALOG_PDP_TESTING__` for test access).

### 2.2 Self-supplier context detectability (client-side)

Both values are in `App.tsx` state at render time:
- `buyerCatalogSupplierOrgId` — the supplier whose catalog was selected (Phase B → Phase C)
- `currentTenantId` — the active tenant (session org)

`isSelfSupplierContext = buyerCatalogSupplierOrgId.length > 0 && buyerCatalogSupplierOrgId === currentTenantId`

This requires **no backend metadata**, **no policy field exposure**, and **no schema change**.

### 2.3 Non-disclosure safety analysis

The chosen copy variants do NOT expose:
- `catalogVisibilityPolicyMode` / `catalog_visibility_policy_mode`
- `publicationPosture` / `publication_posture`
- `relationshipState` (APPROVED / REQUESTED / NONE)
- `APPROVED_BUYER_ONLY`, `HIDDEN`, `B2B_PUBLIC`, `BOTH`
- `supplierPolicy`, `denialReason`
- Item name, SKU, price, or UUID

The 404 gate in the backend (`evaluateBuyerCatalogVisibility` → Gate 4) is unchanged. The frontend still receives a 404 and sets `buyerCatalogPdpError = 'NOT_FOUND'`. Only the rendered copy is updated.

---

## 3. UX Decision: Option B (Contextual self-supplier copy)

**Option B selected** — contextual self-supplier copy rendered only when `isSelfSupplierContext === true`.

| Scenario | Rendered copy |
|---|---|
| `isSelfSupplierContext === true` (404) | "This item is restricted in buyer view. Suppliers cannot request or buy their own approval-gated catalogue items from the buyer PDP." |
| `isSelfSupplierContext === false` or `undefined` (404) | "This item is unavailable in buyer view. Supplier-private or relationship-restricted catalogue items cannot be opened from this context." |
| `error != null` (non-404 fetch error) | "Unable to load item details." *(unchanged)* |

The generic copy was also improved from the vague "Item not found or unavailable." to a more informative buyer-context denial message.

---

## 4. Files Changed

| File | Change |
|---|---|
| `App.tsx` | Updated `PDP_NOT_FOUND_COPY`, added `PDP_NOT_FOUND_SELF_SUPPLIER_COPY`, added to `__B2B_BUYER_CATALOG_PDP_TESTING__`, added `isSelfSupplierContext` prop to `<CatalogPdpSurface>` call |
| `components/Tenant/CatalogPdpSurface.tsx` | Updated `CATALOG_PDP_NOT_FOUND_COPY`, added `CATALOG_PDP_NOT_FOUND_SELF_SUPPLIER_COPY`, added `isSelfSupplierContext?: boolean` to `CatalogPdpSurfaceProps` and destructuring, branched `notFoundCopy` in render |
| `tests/b2b-buyer-catalog-pdp-page.test.ts` | Updated imports, T1.2 key assertion, T5.3 expected string; added T5.6 and T5.7 |

**No changes to:**
- `server/` (no backend changes)
- `server/prisma/schema.prisma` (no schema changes)
- Any migration or seed files
- `.env` / `.env.local`

---

## 5. Validation Evidence

### TypeScript
```
pnpm exec tsc --noEmit
```
**Result:** 0 errors, 0 output (PASS)

### Vitest — b2b-buyer-catalog-pdp-page.test.ts
```
pnpm exec vitest run tests/b2b-buyer-catalog-pdp-page.test.ts
```
**Result:** 121 passed, 0 failed (PASS)

New test assertions added:
- **T1.2** — `PDP_NOT_FOUND_SELF_SUPPLIER_COPY` key present in testing export
- **T5.3** — updated to assert new generic copy string
- **T5.6** — `PDP_NOT_FOUND_SELF_SUPPLIER_COPY` correct value; differs from generic; component constant mirrors it
- **T5.7** — neither not-found copy leaks policy internals (9 forbidden terms checked)

### ESLint
```
pnpm exec eslint App.tsx components/Tenant/CatalogPdpSurface.tsx --max-warnings=0
```
**Result:** 0 new errors or warnings. 8 pre-existing warnings (all from prior state; confirmed in `TECS-BUYER-PDP-404-INVESTIGATION-001-REPORT.md`). No new violations introduced.

### git diff --check
**Result:** PASS (no whitespace errors)

### Files changed
```
git diff --name-only:
  App.tsx
  components/Tenant/CatalogPdpSurface.tsx
  tests/b2b-buyer-catalog-pdp-page.test.ts
```
Exactly the allowlisted files. No file creep.

### Playwright — supplier-catalog-approval-gate.spec.ts
```
playwright test tests/e2e/supplier-catalog-approval-gate.spec.ts --reporter=list
```
**Result:** 12/12 PASS

AG-09 (PDP URL is non-disclosing — FAB-004 returns 404 with no item data for denied buyers) PASS confirms the 404 non-disclosure property is intact end-to-end.

---

## 6. Non-disclosure Compliance Confirmation

- 404 gate: **unchanged** — backend still returns HTTP 404 with `{"error":"Catalog item not found"}` for all denied PDP requests
- Frontend: `buyerCatalogPdpError` is still set to `'NOT_FOUND'` on 404 — no new state
- `isSelfSupplierContext` is derived purely from already-present client state (`buyerCatalogSupplierOrgId === currentTenantId`) — no backend round-trip, no policy field leaked
- Self-supplier copy says "approval-gated" (opaque category descriptor) — does not name `APPROVED_BUYER_ONLY`, `catalogVisibilityPolicyMode`, `relationshipState`, or `denialReason`

---

## 7. Classification

| Finding | Classification | Resolution |
|---|---|---|
| Generic not-found copy was ambiguous for dual-role tenants | `UX_COPY_AMBIGUITY` | Fixed — improved generic copy + contextual self-supplier variant |
| Self-supplier block itself | `EXPECTED_SELF_SUPPLIER_BLOCK` | Correct behavior, no change to gate logic |

---

*Report authored for commit: TECS-BUYER-PDP-SELF-SUPPLIER-SAFE-UX-001*
