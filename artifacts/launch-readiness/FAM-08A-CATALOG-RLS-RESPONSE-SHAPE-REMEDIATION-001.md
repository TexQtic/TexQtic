# FAM-08A — Catalog RLS Response Shape Remediation
**Unit:** FAM-08A-CATALOG-RLS-RESPONSE-SHAPE-REMEDIATION-001
**Parent:** FAM-08 (T-2 RUNTIME_VERIFICATION_PARTIAL — AF-01 registered)
**Status:** CLOSED — REMEDIATED
**Date:** 2026-05-13

---

## 1. Unit Summary

Remediated AF-01 from FAM-08 runtime verification: 5 failing assertions in
`server/src/__tests__/tenant-catalog-items.rls.integration.test.ts` across two describe blocks.

Two distinct root causes were identified and resolved via separate paths:
- **Gate C.2 (3 failures):** Test-only fix — `tenantId` is intentionally excluded from catalog item
  API response per route projection comment.
- **TECS-RFQ-BUYER-RESPONSE-READ-001 (2 failures):** Source fix — `supplier_org_id` was missing
  from `mapBuyerRfqListItem` and `mapBuyerRfqResponse`, both violating the OpenAPI contract
  (`BuyerRfq.supplier_org_id` and `BuyerRfqSupplierResponse.supplier_org_id` required).

All 10 tests in the suite pass after remediation.

---

## 2. Preflight Evidence

```
git diff --name-only  → (clean before patch)
git status --short    → clean tree at HEAD 27ca0e67
Test-Path governance/legal/fam-07  → False  (legal hold intact — ABSENT as required)
```

**FAM-07 Legal Hold Confirmation:**
`governance/legal/fam-07/` → ABSENT (directory does not exist). FAM-07 status remains
`PARTIALLY_IMPLEMENTED / HOLD_FOR_HUMAN_LEGAL_INPUTS`. FTR-LEGAL-003 remains `MVP_CRITICAL / OPEN`.
No PublicSupplierProfile.tsx modifications. No schema or migration changes. No OpenAPI contract
changes (contracts were already correct; the source was the bug).

---

## 3. AF-01 Source Evidence

**AF-01 registered in FAM-08:** 5 failing assertions in `tenant-catalog-items.rls.integration.test.ts`.

Failing assertions at time of FAM-08 close:
```
Gate C.2 Test 1:  expect(item.tenantId).toBe(orgAId)       → undefined
Gate C.2 Test 2:  expect(item.tenantId).toBe(orgBId)       → undefined
Gate C.2 Test 3:  expect(item.tenantId).toBe(orgAId/..)    → undefined
RFQ Test 4:       expect(body.data.rfq.supplier_org_id)...  → undefined
RFQ Test 4:       supplier_response.supplier_org_id...      → undefined
RFQ Test 5:       supplier_response.supplier_org_id...      → undefined
```

---

## 4. Route / Response Projection Findings

### 4.1 Catalog Items — `GET /api/tenant/catalog/items`

**Route file:** `server/src/routes/tenant.ts` (~line 2648)

Inline comment at route select clause:
```
// Explicit select: policy-internal fields (catalogVisibilityPolicyMode, publicationPosture,
// priceDisclosurePolicyMode, tenantId) are excluded from the response.
```

`tenantId` is explicitly excluded. This is an **intentional design decision** — the field is
classified as policy-internal and must not be returned to tenant callers.

**OpenAPI contract (`openapi.tenant.json`):** `GET /api/tenant/catalog/items` response schema is
not defined in the contract (200 response is `"description": "Catalog items retrieved"` only).
`tenantId` is not required by the contract.

**Decision:** Test-only fix. The count assertion (`items.length === 2 / 3`) combined with the SKU
tag assertion (`item.sku.includes(testRunId)`) and the ID disjoint assertion (Test 3) are
sufficient isolation proof without requiring `tenantId` in the response.

### 4.2 RFQ Buyer Detail — `GET /api/tenant/rfqs/:id`

**Type definitions (`server/src/routes/tenant.ts` ~line 975):**
```typescript
type BuyerRfqResponseRow = {
  id: string;
  supplierOrgId: string;   // ← present in type
  message: string;
  submittedAt: Date;
  createdAt: Date;
};

type BuyerRfqListRow = {
  ...
  supplierOrgId: string;   // ← present in type
  ...
};
```

Both the list-route DB query (line ~4633) and the detail-route DB query (line ~5007) select
`supplierOrgId: true`.

**`resolveBuyerRfqSupplierResponse` (~line 1375):** DB select includes `supplierOrgId: true`.

**`mapBuyerRfqListItem` (line 1076) — pre-fix:**
```typescript
function mapBuyerRfqListItem(rfq: BuyerRfqListRow) {
  return {
    id: rfq.id,
    status: rfq.status,
    // ... other fields ...
    // supplier_org_id: MISSING
  };
}
```

**`mapBuyerRfqResponse` (line 1099) — pre-fix:**
```typescript
function mapBuyerRfqResponse(response: BuyerRfqResponseRow) {
  return {
    id: response.id,
    message: response.message,
    submitted_at: response.submittedAt,
    created_at: response.createdAt,
    // supplier_org_id: MISSING
  };
}
```

---

## 5. Contract / API Exposure Decision

**OpenAPI contract `shared/contracts/openapi.tenant.json`:**

```json
"BuyerRfqSupplierResponse": {
  "type": "object",
  "required": ["id", "supplier_org_id", "message", "submitted_at", "created_at"],
  "properties": {
    "supplier_org_id": { "type": "string", "format": "uuid" },
    ...
  }
}

"BuyerRfq": {
  "type": "object",
  "required": [..., "supplier_org_id", ...],
  "properties": {
    "supplier_org_id": { "type": "string", "format": "uuid" },
    ...
  }
}
```

Both `supplier_org_id` fields are **required by the existing OpenAPI contract**. The source code
was the bug — the mapper functions dropped a field that was already selected at the DB layer and
mandated by the API contract. No contract changes were required.

---

## 6. Remediation Path Selected

| Finding | Path | Justification |
|---------|------|---------------|
| Catalog items `tenantId` (3 failures) | **Test-only** | Field intentionally excluded per route comment; not in OpenAPI contract |
| RFQ `supplier_org_id` (2 failures) | **Source fix** | Field required by OpenAPI contract; present in DB query and type; dropped by mapper |

---

## 7. Files Changed

| File | Change type | Description |
|------|-------------|-------------|
| `server/src/routes/tenant.ts` | Source fix | Add `supplier_org_id` to `mapBuyerRfqListItem` and `mapBuyerRfqResponse` |
| `server/src/__tests__/tenant-catalog-items.rls.integration.test.ts` | Test fix | Remove `tenantId` type annotation field and `item.tenantId` assertions from Tests 1, 2, 3 |

---

## 8. Changes Summary

### `server/src/routes/tenant.ts`

**`mapBuyerRfqListItem` — added `supplier_org_id: rfq.supplierOrgId`:**
```typescript
function mapBuyerRfqListItem(rfq: BuyerRfqListRow) {
  return {
    id: rfq.id,
    status: rfq.status,
    catalog_item_id: rfq.catalogItemId,
    item_name: rfq.catalogItem.name,
    item_sku: rfq.catalogItem.sku,
    quantity: rfq.quantity,
    supplier_org_id: rfq.supplierOrgId,   // ← ADDED
    created_at: rfq.createdAt,
    ...
  };
}
```

**`mapBuyerRfqResponse` — added `supplier_org_id: response.supplierOrgId`:**
```typescript
function mapBuyerRfqResponse(response: BuyerRfqResponseRow) {
  return {
    id: response.id,
    supplier_org_id: response.supplierOrgId,   // ← ADDED
    message: response.message,
    submitted_at: response.submittedAt,
    created_at: response.createdAt,
  };
}
```

### `server/src/__tests__/tenant-catalog-items.rls.integration.test.ts`

**Test 1 (line ~236):** Type changed from `Array<{ id: string; sku: string; tenantId: string }>`
to `Array<{ id: string; sku: string }>`. `expect(item.tenantId).toBe(orgAId)` removed.
Count assertion and SKU tag assertion retained.

**Test 2 (line ~272):** Same as Test 1 pattern for Org B (count 3).

**Test 3 (line ~304/317):** Both `itemsA` and `itemsB` type annotations updated to remove
`tenantId: string`. `tenantId` assertion loops (for-of over itemsA/itemsB asserting `tenantId`)
replaced with a comment explaining the isolation proof relies on ID disjoint (already present) +
count assertions from Tests 1 and 2.

---

## 9. Validation Commands and Results

**Command:**
```powershell
cd "C:/Users/PARESH/TexQtic/server"
pnpm vitest run src/__tests__/tenant-catalog-items.rls.integration.test.ts
```

**Result:**
```
✓ src/__tests__/tenant-catalog-items.rls.integration.test.ts (10 tests) 108937ms
  ✓ Gate C.2 — Pilot Route RLS Contract Tests (5)
    ✓ Org A token returns only Org A catalog items (2 items)           13265ms
    ✓ Org B token returns only Org B catalog items (3 items)            8944ms
    ✓ Cross-tenant isolation: Org A cannot see Org B items             10719ms
    ✓ Fail-closed: Missing token returns 401 Unauthorized               7318ms
    ✓ Invalid token returns 401 Unauthorized                            8454ms
  ✓ TECS-RFQ-BUYER-RESPONSE-READ-001 — Buyer RFQ detail reads (5)
    ✓ buyer can read a bounded supplier response for its own RFQ       13912ms
    ✓ buyer sees a stable null response when no supplier response exists 12753ms
    ✓ cross-tenant buyers cannot read another buyer org response        11652ms
    ✓ supplier tenants cannot use the buyer detail path to read RFQs    7226ms
    ✓ single-response semantics remain unchanged after buyer-visible reads 14692ms

Test Files  1 passed (1)
     Tests  10 passed (10)
  Duration  110.78s
```

**PASS — 10/10 tests pass. 0 failures.**

---

## 10. AF-01 Resolution Status

**AF-01: 5 failing assertions in `tenant-catalog-items.rls.integration.test.ts`**

Status: **RESOLVED**

All 5 previously failing assertions now pass:
- 3 Gate C.2 failures: resolved via test-only assertion update
- 2 TECS-RFQ failures: resolved via source mapper fix

---

## 11. T-2 Classification Impact

**T-2 (TECS-RFQ-BUYER-RESPONSE-READ-001 tests) prior status:** `RUNTIME_VERIFICATION_PARTIAL`
(AF-01 registered)

**T-2 post-remediation status:** `PROVEN_READY`

All 5 TECS-RFQ-BUYER-RESPONSE-READ-001 tests pass. The buyer RFQ detail route now returns
`supplier_org_id` on both the RFQ object and the `supplier_response` object, in conformance with
the OpenAPI contract.

---

## 12. Adjacent Findings

**AF-A-01 (adjacent — out of scope):** `BuyerRfq` OpenAPI schema also requires `org_id` in the
required array, but `mapBuyerRfqListItem` does not include `org_id` in its return value. This is
not tested by the current suite and is out of scope for this unit. Registered here as an adjacent
finding for future remediation if needed.

**AF-A-02 (adjacent — out of scope):** The RFQ list endpoint (`GET /api/tenant/rfqs`) now returns
`supplier_org_id` on each list item as a consequence of the `mapBuyerRfqListItem` fix. This aligns
with the `BuyerRfqListItem` OpenAPI schema (which also requires `supplier_org_id`). No test
regression observed. The change is contract-correct and safe.

---

## 13. Status Preservation Statement

The following invariants were confirmed throughout this unit:

| Invariant | Required state | Confirmed |
|-----------|---------------|-----------|
| FAM-07 status | `PARTIALLY_IMPLEMENTED` | ✓ |
| FAM-07 hold | `HOLD_FOR_HUMAN_LEGAL_INPUTS` | ✓ |
| FTR-LEGAL-003 | `MVP_CRITICAL / OPEN` | ✓ |
| `governance/legal/fam-07/` | ABSENT | ✓ |
| `PublicSupplierProfile.tsx` | NOT STAGED, NOT MODIFIED | ✓ |
| `LAUNCH-FAMILY-INDEX.md` | NOT MODIFIED | ✓ |
| Schema/migration files | NOT MODIFIED | ✓ |
| OpenAPI contracts | NOT MODIFIED | ✓ |

---

## 14. Final Enum

```
FAM-08A: CLOSED — REMEDIATED
  AF-01: RESOLVED (5/5 assertions fixed)
  T-2:   PROVEN_READY (post-remediation)
  Source fix: mapBuyerRfqListItem + mapBuyerRfqResponse
  Test fix:   Gate C.2 tenantId assertions removed (intentional exclusion confirmed)
  Files: 2 modified (tenant.ts, tenant-catalog-items.rls.integration.test.ts)
  Tests: 10/10 PASS
```

---

## 15. Recommended Next Units

After AF-01 resolution, the following units are candidates:

| Unit | Rationale |
|------|-----------|
| `FAM-08B-RLS-HASDB-GATED-SUITE-VERIFICATION-001` | Run the 35 `hasDb`-skipped tests with `DATABASE_URL` |
| `FAM-08C-GATE-D5-ISOLATED-RERUN-001` | Resolve 2 pool-timeout failures in gate-d5 |
| `FAM-08D-FEATURE-FLAG-SEEDING-REPO-TRUTH-DESIGN-001` | Address T-3 `PARTIALLY_IMPLEMENTED` |
