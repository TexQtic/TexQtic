# TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 — Slice G: Playwright E2E Evidence Report

**Status:** VERIFIED_COMPLETE  
**Target:** `https://app.texqtic.com`  
**Auth Method:** Method A — storageState files (`.auth/*.json`), no secrets in report  
**Test File:** `tests/e2e/catalog-visibility-policy-gating.spec.ts`  
**Runner:** Playwright v1.59.1 (Chromium API project)  
**Run Date:** 2025-07-09  
**Predecessor Commits:** Slice A–F (`bfb3f64`, `9c71d14`, `59e9207`, `57b6e6c`, `9d29798`, `feb9e5f`)

---

## 1. Auth Setup

Auth state files generated via `pnpm exec tsx tests/e2e/setup-auth-state.ts` (headed browser, manual login per identity). Output files are gitignored — never committed.

| Identity | File | Source |
|---|---|---|
| Buyer A (APPROVED) | `.auth/qa-buyer-a.json` | `qa.buyer.wvg.a@texqtic.com` |
| Buyer B (REQUESTED) | `.auth/qa-buyer-b.json` | `qa.buyer@texqtic.com` |
| Buyer C (none) | `.auth/qa-buyer-c.json` | `qa.buyer.knt.c@texqtic.com` |
| Supplier (qa-b2b) | `.auth/qa-b2b.json` | `qa.b2b@texqtic.com` |

Each file contains `{ token, orgId }`. `orgId` decoded from JWT `tenantId` claim. No token values appear in this report.

---

## 2. QA Data Contract (Slice F — bfb3f64)

| Item | publicationPosture | catalogVisibilityPolicyMode |
|---|---|---|
| QA-B2B-FAB-002 | `B2B_PUBLIC` | `NULL` (open) |
| QA-B2B-FAB-003 | `B2B_PUBLIC` | `priceDisclosurePolicyMode=RELATIONSHIP_ONLY` |
| QA-B2B-FAB-004 | `B2B_PUBLIC` | `APPROVED_BUYER_ONLY` |
| QA-B2B-FAB-005 | `B2B_PUBLIC` | `APPROVED_BUYER_ONLY` |
| QA-B2B-FAB-006 | `PRIVATE_OR_AUTH_ONLY` | `HIDDEN` |

**Relationships (qa-b2b supplier):**
- Buyer A (`qa.buyer.wvg.a@texqtic.com`) ↔ qa-b2b: **APPROVED**
- Buyer B (`qa.buyer@texqtic.com`) ↔ qa-b2b: **REQUESTED**
- Buyer C (`qa.buyer.knt.c@texqtic.com`) ↔ qa-b2b: **NONE**

---

## 3. Playwright Command

```
$ptBin = "C:\Users\PARESH\AppData\Local\npm-cache\_npx\420ff84f11983ee5\node_modules\.bin\playwright.cmd"
& $ptBin test tests/e2e/catalog-visibility-policy-gating.spec.ts --reporter=list
```

---

## 4. Test Results — E2E-01 through E2E-11

**Final run: 11 passed / 0 failed — exit code 0**

| ID | Test Title | Result | Duration |
|---|---|---|---|
| E2E-01 | Buyer A (APPROVED) sees APPROVED_BUYER_ONLY items in catalog browse | ✅ PASS | 6.7s |
| E2E-02 | Buyer B (REQUESTED) catalog browse excludes APPROVED_BUYER_ONLY items | ✅ PASS | 6.5s |
| E2E-03 | Buyer C (no relationship) catalog browse excludes APPROVED_BUYER_ONLY items | ✅ PASS | 6.5s |
| E2E-04 | Direct PDP access to HIDDEN item (FAB-006) returns 404 for APPROVED buyer | ✅ PASS | 2.6s |
| E2E-05 | Direct PDP access to HIDDEN item (FAB-006) returns 404 for no-relationship buyer | ✅ PASS | 2.4s |
| E2E-06 | Buyer A (APPROVED) can prefill RFQ draft from B2B_PUBLIC item (FAB-002) | ✅ PASS | 9.4s |
| E2E-07 | FAB-004 (APPROVED_BUYER_ONLY) absent from no-relationship buyer browse | ✅ PASS | 6.6s |
| E2E-08 | [Slice F unblocked] FAB-006 (HIDDEN) absent from all buyer browse responses | ✅ PASS | 8.6s |
| E2E-09 | FAB-004 (APPROVED_BUYER_ONLY) blocks RFQ prefill for REQUESTED buyer | ✅ PASS | 3.2s |
| E2E-10 | Catalog browse response does not leak catalogVisibilityPolicyMode or publicationPosture | ✅ PASS | 6.4s |
| E2E-11 | Supplier (qa-b2b) sees all own catalog items including HIDDEN and APPROVED_BUYER_ONLY | ✅ PASS | 4.1s |

**Total runtime: 1.2 minutes**

---

## 5. Key Scenario Detail

### E2E-07: FAB-004 Absent from No-Relationship Browse
- **Actor:** Buyer C (no relationship with qa-b2b)
- **Endpoint:** `GET /api/tenant/catalog/supplier/{supplierId}/items`
- **Assertion:** FAB-004 (`APPROVED_BUYER_ONLY`) is absent from response items
- **Result:** PASS — gate correctly excludes restricted items for buyers with no relationship

### E2E-08: FAB-006 Absent from All Buyer Browses
- **Actors:** Buyer A (APPROVED), Buyer B (REQUESTED), Buyer C (none) — all 3 tested
- **Assertion:** FAB-006 (`HIDDEN`, `PRIVATE_OR_AUTH_ONLY`) absent from all buyer browse responses
- **Result:** PASS — HIDDEN posture enforced universally regardless of relationship state

### E2E-09: RFQ Gate Blocks REQUESTED Buyer on APPROVED_BUYER_ONLY Item
- **Actor:** Buyer B (REQUESTED relationship)
- **Endpoint:** `POST /api/tenant/rfqs/drafts/from-catalog-item` with FAB-004 itemId
- **Assertion:** HTTP 200, `body.data.ok === false`, `reason` is `'ITEM_NOT_AVAILABLE'` or `'ELIGIBILITY_REQUIRED'`
- **Result:** PASS — RFQ path correctly blocked; no draft created

---

## 6. Anti-Leakage Verification (E2E-10)

**Actor:** Buyer A (APPROVED, highest privilege)  
**Endpoint:** `GET /api/tenant/catalog/supplier/{supplierId}/items`

The following strings were asserted absent from all buyer catalog browse response bodies:

| Field | Present in buyer response? |
|---|---|
| `catalogVisibilityPolicyMode` | ❌ absent — PASS |
| `catalog_visibility_policy_mode` | ❌ absent — PASS |
| `publicationPosture` | ❌ absent — PASS |
| `publication_posture` | ❌ absent — PASS |
| `relationshipState` | ❌ absent — PASS |
| `APPROVED_BUYER_ONLY` | ❌ absent — PASS |
| `HIDDEN` | ❌ absent — PASS |
| `RELATIONSHIP_GATED` | ❌ absent — PASS |
| `internalReason` | ❌ absent — PASS |
| `allowlistDetails` | ❌ absent — PASS |
| `supplierPolicy` | ❌ absent — PASS |
| `score` | ❌ absent — PASS |
| `rank` | ❌ absent — PASS |
| `confidence` | ❌ absent — PASS |
| `embeddingId` | ❌ absent — PASS |
| `risk_score` | ❌ absent — PASS |
| `auditMetadata` | ❌ absent — PASS |

No internal policy or scoring fields were exposed to buyer API consumers.

---

## 7. E2E-06 Failure Classification and Fix

**First run result:** E2E-06 FAILED — `TEST_EXPECTATION_MISMATCH`

**Root cause:** Test expected response shape `{ data: { ok: true } }` (the gated/blocked shape).  
**Actual shape on success (HTTP 201):** `{ success: true, data: { draft: { id, status: 'INITIATED', ... } } }` — the draft creation shape.

**Fix applied to `tests/e2e/catalog-visibility-policy-gating.spec.ts`:**
- Changed status assertion from `res.ok()` to `res.status() === 201`
- Changed body assertions to check `body.data.draft.id` (truthy) and `body.data.draft.status === 'INITIATED'`
- No product code changed

**Post-fix result:** E2E-06 PASS

---

## 8. Stop-Condition Audit

| Stop Condition | Triggered? |
|---|---|
| Auth unavailable | No — all 4 `.auth/*.json` files present |
| APPROVED_BUYER_ONLY item visible to unapproved buyer | No — E2E-02, E2E-03, E2E-07 all PASS |
| HIDDEN item visible to any buyer | No — E2E-04, E2E-05, E2E-08 all PASS |
| RFQ allowed for non-approved buyer on APPROVED_BUYER_ONLY item | No — E2E-09 PASS |
| `catalogVisibilityPolicyMode` / `publicationPosture` leaks in buyer response | No — E2E-10 PASS |
| Test requires app code changes | No — test harness fix only |
| Test requires data mutation | No |

---

## 9. Trace / Screenshot Artifacts

Configured in `playwright.config.ts`:
- `screenshot: 'only-on-failure'`
- `trace: 'retain-on-failure'`

No failures in final run — no artifacts retained. `playwright-report/` and `test-results/` are gitignored.

---

## 10. Final Verdict

**VERIFIED_COMPLETE**

All 11 E2E scenarios pass against `https://app.texqtic.com` production environment.  
Visibility policy gating (Slices A–F) is confirmed functioning end-to-end:
- Browse gating: APPROVED_BUYER_ONLY items correctly scoped by relationship state
- HIDDEN posture: universally excluded from all buyer surfaces
- RFQ gate: eligibility enforced at the RFQ draft creation path
- Anti-leakage: zero internal policy fields exposed to buyer API consumers
- Supplier self-view: unrestricted access to own catalog items confirmed
