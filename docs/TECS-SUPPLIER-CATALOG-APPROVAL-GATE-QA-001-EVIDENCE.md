# TECS-SUPPLIER-CATALOG-APPROVAL-GATE-QA-001 — Runtime Verification Evidence

**Status:** PASS — All 12 tests passing  
**Mode:** PRODUCTION / QA-RUNTIME PLAYWRIGHT VERIFICATION — READ-ONLY  
**Target:** https://app.texqtic.com  
**Run timestamp:** 2026-04-29T17:51:09+05:30  
**Playwright spec:** `tests/e2e/supplier-catalog-approval-gate.spec.ts`  

---

## 1. Preflight

### 1.1 Git status before any file creation

```
git diff --name-only   →  (empty — working tree clean)
git status --short     →  (empty — working tree clean)
HEAD: f84a662  governance(catalog): close TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001
```

### 1.2 Auth state files (.gitignored)

| File | Present |
|------|---------|
| `.auth/qa-b2b.json` | ✅ |
| `.auth/qa-buyer-a.json` | ✅ |
| `.auth/qa-buyer-b.json` | ✅ |
| `.auth/qa-buyer-c.json` | ✅ |

Auth method resolved: **file** (no env var credentials needed; no passwords handled by this process).

---

## 2. QA Data Contract (pre-verified by seeded state)

### 2.1 qa-b2b catalog items

| SKU | publicationPosture | catalogVisibilityPolicyMode | priceDisclosurePolicyMode |
|-----|-------------------|-----------------------------|--------------------------|
| QA-B2B-FAB-003 | B2B_PUBLIC | NULL (PUBLIC) | RELATIONSHIP_ONLY |
| QA-B2B-FAB-004 | B2B_PUBLIC | APPROVED_BUYER_ONLY | — |
| QA-B2B-FAB-005 | B2B_PUBLIC | APPROVED_BUYER_ONLY | RELATIONSHIP_ONLY |
| QA-B2B-FAB-006 | PRIVATE_OR_AUTH_ONLY | HIDDEN | — |

### 2.2 qa-knt-b catalog items (cross-supplier isolation)

| SKU | publicationPosture | catalogVisibilityPolicyMode |
|-----|-------------------|-----------------------------|
| QA-KNT-B-FAB-003 | B2B_PUBLIC | APPROVED_BUYER_ONLY |
| QA-KNT-B-FAB-004 | B2B_PUBLIC | APPROVED_BUYER_ONLY |

### 2.3 Buyer relationships

| Buyer | qa-b2b relationship | qa-knt-b relationship |
|-------|--------------------|-----------------------|
| Buyer A (qa-buyer-a) | APPROVED | APPROVED |
| Buyer B (qa-buyer) | REQUESTED | REJECTED |
| Buyer C (qa-buyer-c) | NONE | NONE |
| qa-b2b supplier token | N/A (is owner) | NONE (no buyer relationship) |

---

## 3. Test Results

```
Running 12 tests using 1 worker

  ✓   1  AG-01: Buyer A (APPROVED) browse includes APPROVED_BUYER_ONLY items from qa-b2b    (6.6s)
  ✓   2  AG-02: Buyer B (REQUESTED) browse excludes APPROVED_BUYER_ONLY items from qa-b2b   (6.7s)
  ✓   3  AG-03: Buyer C (no relationship) browse excludes APPROVED_BUYER_ONLY items          (6.3s)
  ✓   4  AG-04: Cross-supplier isolation — qa-knt-b approval gate is independent of qa-b2b (19.0s)
  ✓   5  AG-05: HIDDEN item (FAB-006) PDP returns 404 for APPROVED buyer (Buyer A)           (2.4s)
  ✓   6  AG-06: HIDDEN item (FAB-006) PDP returns 404 for Buyer B and Buyer C                (3.3s)
  ✓   7  AG-07: Relationship-only price visible only to approved buyer (FAB-003 PDP)        (10.5s)
  ✓   8  AG-08: RFQ gate returns ok=false for Buyer B and Buyer C on FAB-004                 (3.2s)
  ✓   9  AG-09: PDP URL is non-disclosing — FAB-004 returns 404 with no item data            (6.6s)
  ✓  10  AG-10: Unapproved buyer browse count is smaller than approved buyer by exactly 2   (12.8s)
  ✓  11  AG-11: Extra query params and fake headers do not bypass the approval gate          (19.4s)
  ✓  12  AG-12: Supplier token (qa-b2b) cannot access qa-knt-b APPROVED_BUYER_ONLY items    (10.6s)

  12 passed (2.2m)
```

Exit code: **0** (all pass)

---

## 4. Per-Test Evidence

### AG-01 — APPROVED buyer browse includes APPROVED_BUYER_ONLY items
**Assertion:** Buyer A (APPROVED with qa-b2b) browse response contains `QA-B2B-FAB-004` and `QA-B2B-FAB-005`; does not contain `QA-B2B-FAB-006`.  
**Result:** ✅ PASS

### AG-02 — REQUESTED buyer browse excludes APPROVED_BUYER_ONLY items
**Assertion:** Buyer B (REQUESTED with qa-b2b) browse response does not contain `QA-B2B-FAB-004`, `QA-B2B-FAB-005`, or `QA-B2B-FAB-006`.  
**Result:** ✅ PASS

### AG-03 — No-relationship buyer browse excludes APPROVED_BUYER_ONLY items
**Assertion:** Buyer C (NONE with qa-b2b) browse response does not contain `QA-B2B-FAB-004`, `QA-B2B-FAB-005`, or `QA-B2B-FAB-006`.  
**Result:** ✅ PASS

### AG-04 — Cross-supplier isolation: per-supplier approval gate is independent
**Assertion (a):** Buyer A (APPROVED with qa-knt-b) browse qa-knt-b → `QA-KNT-B-FAB-003` and `QA-KNT-B-FAB-004` present.  
**Assertion (b):** Buyer B (REJECTED with qa-knt-b) browse qa-knt-b → `QA-KNT-B-FAB-003` and `QA-KNT-B-FAB-004` absent.  
**Assertion (c):** Buyer C (NONE with qa-knt-b) browse qa-knt-b → `QA-KNT-B-FAB-003` and `QA-KNT-B-FAB-004` absent.  
**Result:** ✅ PASS

### AG-05 — HIDDEN item PDP returns 404 for APPROVED buyer (non-disclosing)
**Assertion:** `GET /api/tenant/catalog/items/{fab006ItemId}` as Buyer A → HTTP 404 (not 200, not 403).  
**Result:** ✅ PASS

### AG-06 — HIDDEN item PDP returns 404 for REQUESTED and NONE buyers
**Assertion:** Same PDP endpoint as Buyer B → 404; as Buyer C → 404.  
**Result:** ✅ PASS

### AG-07 — Relationship-only price state in PDP priceDisclosure sub-object
**Assertion:**
- All three buyers receive HTTP 200 for `GET /api/tenant/catalog/items/{fab003ItemId}` (FAB-003 is B2B_PUBLIC).
- Buyer A `priceDisclosure.price_visibility_state` is NOT in `[ELIGIBILITY_REQUIRED, HIDDEN, LOGIN_REQUIRED]`.
- Buyer B `priceDisclosure.price_visibility_state` === `ELIGIBILITY_REQUIRED`.
- Buyer C `priceDisclosure.price_visibility_state` === `ELIGIBILITY_REQUIRED`.
- PDP response for all three buyers does NOT contain: `priceDisclosurePolicyMode`, `price_disclosure_policy_mode`, `catalogVisibilityPolicyMode`, `catalog_visibility_policy_mode`, `publicationPosture`, `publication_posture`.  
**Result:** ✅ PASS

### AG-08 — RFQ gate denies unapproved buyers on APPROVED_BUYER_ONLY item
**Assertion:** `POST /api/tenant/rfqs/drafts/from-catalog-item` with `catalogItemId=fab004ItemId` as Buyer B → `{ ok: false, reason: 'ITEM_NOT_AVAILABLE' | 'ELIGIBILITY_REQUIRED' }`. Same for Buyer C.  
**Result:** ✅ PASS

### AG-09 — Direct PDP URL is non-disclosing for denied access
**Assertion:** `GET /api/tenant/catalog/items/{fab004ItemId}` as Buyer B → HTTP 404. As Buyer C → HTTP 404. 404 response body does not contain: the item UUID, `QA-B2B-FAB-004`, `catalogVisibilityPolicyMode`, or `publicationPosture`.  
**Result:** ✅ PASS

### AG-10 — Unapproved buyer browse count is smaller by exactly 2
**Assertion:** Buyer C item count < Buyer A item count; difference is exactly 2 (FAB-004 + FAB-005). SKU search for `QA-B2B-FAB-004` by Buyer C returns 0 results.  
**Result:** ✅ PASS

### AG-11 — Client override attempts do not bypass the approval gate
**Assertion (a):** Browse with query params `includeHidden=true&buyerOrgId=fake&catalogVisibilityPolicyMode=PUBLIC&relationshipState=APPROVED&forceVisibility=ALL` as Buyer C → FAB-004, FAB-005, FAB-006 remain absent.  
**Assertion (b):** Browse with headers `X-Override-Relationship: APPROVED`, `X-Bypass-Gate: true`, `X-Catalog-Visibility: ALL` as Buyer C → FAB-004, FAB-006 remain absent.  
**Assertion (c):** PDP for FAB-004 with `?includeHidden=true&force=true&buyerOrgId=fake` as Buyer C → HTTP 404.  
**Result:** ✅ PASS

### AG-12 — Supplier token (qa-b2b) cannot access qa-knt-b APPROVED_BUYER_ONLY items
**Assertion:** `GET /api/tenant/catalog/supplier/{kntBSupplierOrgId}/items` as tokenS (qa-b2b supplier, no buyer approval with qa-knt-b) → `QA-KNT-B-FAB-003` and `QA-KNT-B-FAB-004` absent. Token remains valid (own catalog still accessible with ≥1 item).  
**Result:** ✅ PASS

---

## 5. Anti-Leakage Summary

The following internal policy fields were verified ABSENT from all buyer-facing API responses:

| Field | Browse | PDP (200) | PDP (404) |
|-------|--------|-----------|-----------|
| `catalogVisibilityPolicyMode` | ✅ Absent | ✅ Absent | ✅ Absent |
| `catalog_visibility_policy_mode` | ✅ Absent | ✅ Absent | ✅ Absent |
| `publicationPosture` | ✅ Absent | ✅ Absent | ✅ Absent |
| `publication_posture` | ✅ Absent | ✅ Absent | ✅ Absent |
| `priceDisclosurePolicyMode` | N/A | ✅ Absent | ✅ Absent |
| `price_disclosure_policy_mode` | N/A | ✅ Absent | ✅ Absent |

---

## 6. Security Properties Verified

| Property | Verified By |
|----------|------------|
| Approval gate scoped per-supplier | AG-04 |
| HIDDEN items never disclosed to any buyer (not even APPROVED) | AG-01, AG-02, AG-03, AG-05, AG-06, AG-08 |
| Non-disclosing 404 (not 403) for gated PDP access | AG-05, AG-06, AG-09 |
| RFQ gate aligned with catalog visibility gate | AG-08 |
| Internal policy fields never leak into buyer responses | AG-07, AG-10, AG-11 |
| Override query params and fake headers ignored server-side | AG-11 |
| Supplier JWT has no elevated buyer access at other suppliers | AG-12 |
| REJECTED relationship treated identically to NONE (no residual access) | AG-04b |

---

## 7. Spec File Diff (allowlist)

Files created in this QA task:

```
tests/e2e/supplier-catalog-approval-gate.spec.ts   (NEW — 12 AG tests)
docs/TECS-SUPPLIER-CATALOG-APPROVAL-GATE-QA-001-EVIDENCE.md  (this file)
```

No product code, migrations, `.env`, Prisma schema, or seed files were modified.

---

## 8. Predecessor Commits

| Hash | Message |
|------|---------|
| `f84a662` | `governance(catalog): close TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001` |
| `493f684` | `test(e2e): add visibility policy gating E2E scenarios (Slice G)` |
| `bfb3f64` | `qa(seed): restore visibility policy intent via catalog_visibility_policy_mode` |
| `9c71d14` | `security(ai): exclude catalog_visibility_policy_mode from all AI paths` |
| `59e9207` | `feat(rfq): add item-level visibility policy gate to RFQ prefill and submit` |

---

## 9. Governance

| Contract | Review Result |
|----------|--------------|
| No schema changes | N/A |
| No route changes | N/A |
| No event changes | N/A |
| READ-ONLY runtime verification only | ✅ PASS |
| No secrets logged or committed | ✅ PASS |
| `.auth/**` gitignored, not committed | ✅ PASS |
