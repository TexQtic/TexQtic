# TECS-B2B-ORDERS-LIFECYCLE-001 — Slice F Runtime QA Evidence

**Status:** PASS_WITH_AUTH_SKIPS  
**Date:** 2026-04-30  
**Target environment:** https://app.texqtic.com  
**Spec file:** `tests/e2e/orders-lifecycle.spec.ts`  
**Playwright version:** 1.59.1  

---

## 1. Auth Readiness

| Actor | File | Status | Role |
|---|---|---|---|
| `qa-b2b` | `.auth/qa-b2b.json` | ✅ Present | OWNER (primary actor) |
| `qa-buyer-b` | `.auth/qa-buyer-b.json` | ✅ Present | OWNER (cross-tenant probe, ORD-08) |
| `qa-buyer-member` | `.auth/qa-buyer-member.json` | ❌ Missing | MEMBER — ORD-06/07 BLOCKED_BY_AUTH |
| `qa-wl-admin` | `.auth/qa-wl-admin.json` | ❌ Missing | WL_ADMIN — ORD-09 BLOCKED_BY_AUTH |

**Auth method used:** Method A (file-based). `storedOwner = loadStoredAuth('qa-b2b')`.

---

## 2. Cart Fixture Method

`qa-b2b` owns catalog items with high MOQ. The spec's `test.beforeAll` dynamically ensures a cart item exists before ORD-01 checkout:

1. `GET /api/tenant/cart` — check if cart already has items
2. If empty: `GET /api/tenant/catalog/items?limit=5` — fetch own catalog items
3. Pick first active item; add via `POST /api/tenant/cart/items` with `quantity = item.moq`

Known catalog items for `qa-b2b` (MOQ values confirmed):

| SKU | MOQ | Catalog Item ID (prefix) |
|---|---|---|
| QA-B2B-FAB-006 | 120 | `e302ccce…` |
| QA-B2B-FAB-005 | 75 | `cff2e7ec…` |
| QA-B2B-FAB-004 | 60 | `2103b171…` |

Cart add response structure: `{ success: true, data: { cartItem: { id, cartId, quantity, catalogItem } } }`

---

## 3. Playwright Run — Final Command

```powershell
$ptBin = "C:\Users\PARESH\AppData\Local\npm-cache\_npx\420ff84f11983ee5\node_modules\.bin\playwright.cmd"
& $ptBin test tests/e2e/orders-lifecycle.spec.ts --reporter=list
```

> **Note:** Project name is `'api'` (not `chromium`). Do NOT use `--project=chromium`.

---

## 4. Test Results — ORD-01 through ORD-10

| Test | Result | Duration | Notes |
|---|---|---|---|
| ORD-01 checkout: POST /api/tenant/checkout creates PAYMENT_PENDING | ✅ PASS | 16.3s | Cart fixture ensures items exist; fresh order created |
| ORD-02 confirm: PATCH → CONFIRMED | ✅ PASS | 10.8s | lifecycleState verified via GET /orders/:id |
| ORD-03 fulfill: PATCH → FULFILLED | ✅ PASS | 11.9s | lifecycleState verified via GET /orders/:id |
| ORD-04 terminal: PATCH FULFILLED → CANCELLED → 409 | ✅ PASS | 4.7s | Error code matches `INVALID_TRANSITION` |
| ORD-05 detail: GET /orders/:id full lifecycle log chain | ✅ PASS | 4.9s | Fixed: grandTotal is Prisma Decimal (string in JSON); coerced via `Number()` |
| ORD-06 member-scope: MEMBER GET own orders | ⏭ SKIP | — | BLOCKED_BY_AUTH: `.auth/qa-buyer-member.json` not provisioned |
| ORD-07 member-deny: MEMBER PATCH → 403 | ⏭ SKIP | — | BLOCKED_BY_AUTH: `.auth/qa-buyer-member.json` not provisioned |
| ORD-08 cross-tenant: qa-buyer-b cannot read qa-b2b order → 404 | ✅ PASS | 4.2s | RLS isolation confirmed |
| ORD-09 wl-admin: WL_ADMIN orders view | ⏭ SKIP | — | BLOCKED_BY_AUTH: `.auth/qa-wl-admin.json` not provisioned |
| ORD-10 anti-leakage: no internal fields in Orders API responses | ✅ PASS | 13.7s | 19 forbidden field names scanned across all responses |

**Summary:** 7 passed / 3 skipped / 0 failed  
**Verdict: `PASS_WITH_AUTH_SKIPS`**

---

## 5. Runtime Data (Redacted)

- **New order created by ORD-01:** ID redacted (set as `mainOrderId` session var)
- **Lifecycle transitions verified:** PAYMENT_PENDING → CONFIRMED → FULFILLED
- **Terminal enforcement confirmed:** FULFILLED → CANCELLED returns HTTP 409 + `ORDER_STATUS_INVALID_TRANSITION`
- **Cross-tenant isolation confirmed:** qa-buyer-b GET on qa-b2b's order returns HTTP 404 + `NOT_FOUND`

---

## 6. Spec Changes from Scaffold Commit (`79a2c36`)

1. Primary actor changed: `loadStoredAuth('qa-buyer-a')` → `loadStoredAuth('qa-b2b')` — reason: qa-buyer-a has zero own catalog items; RLS blocks cross-tenant cart adds.
2. `test.beforeAll` augmented: cart fixture logic added to dynamically ensure qa-b2b has at least one cart item before ORD-01 checkout attempt.
3. ORD-05 assertion updated: `grandTotal` type-cast to `number | string`; assertion changed from `typeof === 'number'` to `Number(grandTotal) > 0` — reason: Prisma Decimal serializes to string in JSON responses.
4. ORD-08 test name and comments updated to reference `qa-b2b` (was `qa-buyer-a`).
5. Header comments updated throughout to reflect new primary actor.

---

## 7. Anti-Leakage Pass

ORD-10 scanned the following responses against 19 forbidden field names:
- `GET /api/tenant/orders` list response
- `GET /api/tenant/orders/:id` detail response  
- `GET /api/tenant/cart` response (post-checkout, cart empty)

No leakage detected. All 19 forbidden fields absent from serialized responses.

Forbidden fields checked: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `SHADOW_DATABASE_URL`, `serviceRole`, `app.org_id`, `dbContext`, `RLS`, `allowed_transitions`, `order_lifecycle_logs`, `password`, `token`, `secret`, `catalogVisibilityPolicyMode`, `catalog_visibility_policy_mode`, `relationshipState`, `internalReason`, `supplierPolicy`, `denialReason`, `_prisma`, `tenantPlan`, `orgContext`.

---

## 8. Spec Defect Noted (Non-Blocking)

**ORD-05 grandTotal serialization:** The Orders API returns `grandTotal` as a JSON string (Prisma Decimal). The scaffold spec assumed `typeof grandTotal === 'number'`. This is a minor serialization contract gap — not a functional defect. The fix coerces via `Number()` and verifies the value is positive.

---

## 9. Slice G Authorization Gate

Slice G (governance closure) must be explicitly authorized by Paresh before it begins.

Slice G scope (pending authorization):
- `governance/coverage-matrix.md` — mark Slice F as `VERIFIED_COMPLETE`
- Relevant design doc status update → `DESIGN COMPLETE`

**Slice G does NOT start automatically.**
