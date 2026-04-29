# TECS-BUYER-PDP-404-INVESTIGATION-001 — Investigation Report

**Date**: 2026-05-14
**Investigator**: Agent (TECS-BUYER-PDP-404-INVESTIGATION-001)
**Verdict**: DEFECT_CONFIRMED — two defects identified and fixed

---

## 1. Symptom

A B2B tenant (`qa-b2b`) acting as its own buyer (accessing its own catalog items via the buyer PDP surface) saw HTTP 404 responses from `GET /api/tenant/catalog/items/:itemId`. The UI showed "Unable to load item details." for catalog items that appeared in the Browse Suppliers listing.

Prior flag in `TECS-LAUNCH-GRADE-RUNTIME-DATA-QA-AUDIT-001-REPORT.md`:
> Phase 7: BLOCKED — 404 | Buyer PDP returns "Unable to load item details" for self-org browse

---

## 2. Investigation Scope

- Self-org buyer context: `buyerOrgId === supplierTenantId`
- Route: `GET /api/tenant/catalog/items/:itemId`
- Browse route: `GET /api/tenant/catalog/supplier/:supplierOrgId/items`
- Frontend handler: `handleOpenCatalogPdp` in `App.tsx`
- Evaluator: `evaluateBuyerCatalogVisibility` / `evaluateCatalogAccess`
- Data context: QA-B2B-FAB-001 through FAB-006 + multi-segment seed items

---

## 3. Code Path Analysis

### 3.1 PDP Route Gates (server/src/routes/tenant.ts)

| Gate | Check | Effect |
|---|---|---|
| 1 (SQL) | `active = true AND publication_posture IN ('B2B_PUBLIC', 'BOTH')` | 404 if item absent or posture not B2B |
| 2 (Supplier eligibility) | `org.publication_posture IN ('B2B_PUBLIC','BOTH') AND tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` | 404 if supplier not eligible |
| 3 (Relationship) | `getRelationshipOrNone(supplierTenantId, buyerOrgId)` | Returns state=NONE for self-org (no self-BSR in DB) |
| 4 (Visibility policy) | `evaluateBuyerCatalogVisibility(…)` using `resolveItemCatalogVisibilityForRoute` | 404 if `!canAccessCatalog` |

### 3.2 Catalog Browse Route Gates (same file)

| Gate | Check | Effect |
|---|---|---|
| 1 (Supplier eligibility) | `org.publication_posture IN ('B2B_PUBLIC','BOTH') AND publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` | 404 if supplier not eligible |
| 2 (Visibility) | `filterBuyerVisibleCatalogItems` — uses `resolveItemCatalogVisibilityForRoute` | Excludes items where `!canAccessCatalog` |

**Key observation**: The browse route does NOT filter by item-level `publication_posture`. The PDP route does (Gate 1 SQL). This creates an inconsistency.

### 3.3 Visibility Policy Resolution

`resolveItemCatalogVisibilityForRoute` → `resolveCatalogVisibilityPolicy`:

| `catalog_visibility_policy_mode` | `publication_posture` | Resolved policy | Access for state=NONE |
|---|---|---|---|
| `null` | `B2B_PUBLIC` | `PUBLIC` | ✅ granted |
| `null` | `PRIVATE_OR_AUTH_ONLY` | `AUTHENTICATED_ONLY` | ✅ granted (authenticated buyer) |
| `APPROVED_BUYER_ONLY` | `B2B_PUBLIC` | `APPROVED_BUYER_ONLY` | ❌ denied (requires APPROVED) |
| `HIDDEN` | `PRIVATE_OR_AUTH_ONLY` | `HIDDEN` | ❌ denied |

---

## 4. Root Cause Classification

### 4.1 DEFECT_ROUTE_ITEM_POSTURE_MISMATCH (Backend — Primary)

**Root cause**: Gate 1 SQL in the PDP route uses item-level `publication_posture IN ('B2B_PUBLIC', 'BOTH')` as an access filter. This column is a **legacy public-projection vocabulary** column. The authoritative access-control column is `catalog_visibility_policy_mode` (introduced in Slice B, migration `9d29798`). The design doc explicitly states: *"Option A lossy mapping superseded by explicit visibility policy mode."*

**Defect behavior**: Items with `publication_posture = 'PRIVATE_OR_AUTH_ONLY'` and `catalog_visibility_policy_mode = null` (resolving to `AUTHENTICATED_ONLY`) are:
- **Shown in browse listing** — `filterBuyerVisibleCatalogItems` uses the visibility policy (AUTHENTICATED_ONLY → `canAccessCatalog: true` for any authenticated buyer)
- **Return 404 in PDP** — Gate 1 SQL filter blocks `PRIVATE_OR_AUTH_ONLY` items before visibility policy is evaluated

This inconsistency exists for ALL buyers, including self-org. Clicking a PRIVATE_OR_AUTH_ONLY item that appeared in browse triggered the observed 404.

**Affected QA items** (multi-segment seed, `buildSupplierCatalogItems`):
- Items 5, 6 (per supplier): `PRIVATE_OR_AUTH_ONLY` + null cvpm → `AUTHENTICATED_ONLY` → visible in browse, 404 in PDP ← **DEFECT**
- Items 7, 8: `PRIVATE_OR_AUTH_ONLY` + `APPROVED_BUYER_ONLY` → excluded from browse (denied for state=NONE), 404 in PDP ← consistent (EXPECTED)

**Fix**: Remove `AND publication_posture IN ('B2B_PUBLIC', 'BOTH')` from Gate 1 SQL. Gate 4 (visibility policy evaluation) is the authoritative access control mechanism.

### 4.2 EXPECTED_SELF_SUPPLIER_BLOCK (Business rule — Correctly implemented)

For items with `catalog_visibility_policy_mode = 'APPROVED_BUYER_ONLY'`:
- No self-BSR row exists in DB (data hygiene audit R-04: 0 self-relationship rows)
- `getRelationshipOrNone(selfOrgId, selfOrgId)` → state=`NONE`
- `evaluateCatalogAccess(NONE, 'APPROVED_BUYER_ONLY', buyerOrgId)` → `canAccess: false` → 404
- Browse correctly excludes these items (same visibility evaluation)
- **This is correct product behavior**: A supplier cannot act as an approved buyer of their own catalog. No code change needed.

### 4.3 DEFECT_FRONTEND_404_DETECTION (Frontend — Secondary)

**Root cause**: In `handleOpenCatalogPdp` (App.tsx):
```typescript
const isNotFound = err instanceof Error && err.message.includes('404');
```
`APIError.message` is set from the server's error body (e.g., `"Catalog item not found"`) — this string does NOT contain the literal text `"404"`. As a result `isNotFound` is always `false` for HTTP 404 responses, so `buyerCatalogPdpError` is set to `'FETCH_ERROR'` instead of `'NOT_FOUND'`.

**UI impact**: All HTTP 404 PDP responses display `"Unable to load item details."` (FETCH_ERROR copy) instead of `"Item not found or unavailable."` (NOT_FOUND copy). This caused the misleading "Unable to load item details" message observed in the runtime audit.

**Fix**: Use `err instanceof APIError && err.status === 404` — the `APIError` class exposes `.status: number` which is set to the HTTP status code.

---

## 5. Files Changed

| File | Change |
|---|---|
| `server/src/routes/tenant.ts` | Remove `AND publication_posture IN ('B2B_PUBLIC', 'BOTH')` from Gate 1 SQL; update route comment |
| `App.tsx` | Fix `isNotFound` check to `err instanceof APIError && err.status === 404` |

---

## 6. Fix Details

### 6.1 Backend: PDP Route Gate 1 SQL

**Before**:
```sql
SELECT id, tenant_id, name, …
FROM catalog_items
WHERE id = ${itemId}::uuid
  AND active = true
  AND publication_posture IN ('B2B_PUBLIC', 'BOTH')
```

**After**:
```sql
SELECT id, tenant_id, name, …
FROM catalog_items
WHERE id = ${itemId}::uuid
  AND active = true
```

The visibility policy (Gate 4: `evaluateBuyerCatalogVisibility`) remains as the authoritative gating mechanism. Items with `HIDDEN` policy still return 404 via Gate 4. Items requiring `APPROVED_BUYER_ONLY` still return 404 for state=NONE buyers via Gate 4.

### 6.2 Frontend: 404 Detection

**Before**:
```typescript
const isNotFound = err instanceof Error && err.message.includes('404');
```

**After**:
```typescript
const isNotFound = err instanceof APIError && err.status === 404;
```

`APIError` is already imported from `./services/apiClient`.

---

## 7. Behavioral Impact Matrix (Post-Fix)

| Scenario | Item policy | Buyer state | Browse | PDP (before fix) | PDP (after fix) |
|---|---|---|---|---|---|
| Self-org: PUBLIC item | PUBLIC | NONE | ✅ shown | 200 | 200 |
| Self-org: AUTHENTICATED_ONLY item (PRIVATE_OR_AUTH_ONLY posture) | AUTHENTICATED_ONLY | NONE | ✅ shown | **404 (BUG)** | **200 (FIXED)** |
| Self-org: APPROVED_BUYER_ONLY item | APPROVED_BUYER_ONLY | NONE | ❌ hidden | 404 | 404 (expected) |
| Self-org: HIDDEN item | HIDDEN | NONE | ❌ hidden | 404 | 404 (expected) |
| External buyer: APPROVED relationship | APPROVED_BUYER_ONLY | APPROVED | ✅ shown | 200 | 200 |
| External buyer: no relationship | APPROVED_BUYER_ONLY | NONE | ❌ hidden | 404 | 404 (expected) |
| External buyer: PUBLIC item, no relationship | PUBLIC | NONE | ✅ shown | 200 | 200 |

---

## 8. Self-Org Access Policy Clarification

After this fix, self-org buyer access follows these rules:

- **PUBLIC items** (null cvpm + B2B_PUBLIC posture): accessible in both browse and PDP ✅
- **AUTHENTICATED_ONLY items** (null cvpm + PRIVATE_OR_AUTH_ONLY posture): accessible in both browse and PDP ✅ (post-fix)
- **APPROVED_BUYER_ONLY items**: NOT accessible in browse or PDP for self-org (no self-BSR exists) — this is correct product behavior, no change

A supplier acting as a buyer of their own APPROVED_BUYER_ONLY items will correctly see 404 in PDP and those items will correctly not appear in their browse listing. This is `EXPECTED_SELF_SUPPLIER_BLOCK` — not a defect.

---

## 9. No-schema-change Confirmation

Both fixes are code-only changes:
- No Prisma schema changes
- No migration required
- No RLS policy changes
- No seed data changes
- No `.env` modifications

---

## 10. Validation

Run after fix:
```
pnpm --filter server typecheck
pnpm --filter server test
```

---

## 11. Recommended Follow-up (Out of Scope)

- `TECS-BUYER-PDP-SELF-SUPPLIER-SAFE-UX-001`: Consider adding a contextual notice in the PDP surface when a supplier views their own APPROVED_BUYER_ONLY items (currently shows generic "Item not found") — UX improvement for dual-role tenants.
- `TECS-BUYER-CATALOG-B2C-POSTURE-GATE-001`: Evaluate whether B2C_PUBLIC items should be gated from B2B buyer PDP (currently reachable if B2C_PUBLIC supplier passes Gate 2 org eligibility). Low risk for current QA data (no B2C_PUBLIC items present), but worth a policy decision.
