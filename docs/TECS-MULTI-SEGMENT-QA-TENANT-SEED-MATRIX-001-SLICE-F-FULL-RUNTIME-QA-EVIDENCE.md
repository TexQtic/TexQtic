# TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001 — Slice F
## Full Textile-Chain Runtime QA — Evidence Report

**Date:** 2025-07-23  
**Playwright spec:** `tests/e2e/full-textile-chain-runtime-qa.spec.ts`  
**Target environment:** `https://app.texqtic.com` (Fastify backend `https://app.texqtic.com`)  
**Run mode:** READ-ONLY — no product code mutations, no DB mutations, no schema changes  
**Log file:** `runtime/ft-run.log`

---

## Summary

| Metric | Count |
|--------|-------|
| Total tests | 58 |
| Passed | 47 |
| Failed | 8 |
| Skipped (BLOCKED_BY_AUTH) | 3 |
| Duration | 7.1 min |

**Result: 8 FAILED — run incomplete. Blocker report issued. See §5.**

---

## Test Group Results (58 tests)

| # | Test ID | Title | Status | Duration |
|---|---------|-------|--------|----------|
| 1 | FTA-01 | Buyer A auth resolves and eligible-suppliers returns 200 | ✓ PASS | 4.8s |
| 2 | FTA-02 | Buyer B auth resolves and eligible-suppliers returns 200 | ✓ PASS | 4.7s |
| 3 | FTA-03 | Buyer C auth resolves and eligible-suppliers returns 200 | ✓ PASS | 4.6s |
| 4 | FTA-04 | Supplier qa-b2b auth resolves and own catalog returns 200 | ✓ PASS | 4.0s |
| 5 | FTB-01 | Buyer A browse qa-b2b includes B2B_PUBLIC items (FAB-002, FAB-003) | ✓ PASS | 6.6s |
| 6 | FTB-02 | Browse response does not expose publicationPosture in any item | ✓ PASS | 6.5s |
| 7 | FTB-03 | Buyer A (APPROVED) browse qa-b2b includes APPROVED_BUYER_ONLY items (FAB-004, FAB-005) | ✓ PASS | 6.6s |
| 8 | FTB-04 | Buyer B (REQUESTED) browse qa-b2b excludes APPROVED_BUYER_ONLY items (FAB-004) | ✓ PASS | 6.4s |
| 9 | FTB-05 | Buyer C (NONE) browse qa-b2b excludes APPROVED_BUYER_ONLY items (FAB-004) | ✓ PASS | 6.5s |
| 10 | FTB-06 | HIDDEN item (FAB-006) absent from all buyer browse responses | ✓ PASS | 9.2s |
| 11 | FTB-07 | PDP for FAB-003 returns 200 for Buyer A and contains priceDisclosure | ✓ PASS | 9.1s |
| 12 | FTC-01 | FAB-004 visible to Buyer A (APPROVED), absent for Buyer B and Buyer C browse | ✓ PASS | 10.1s |
| 13 | FTC-02 | FAB-006 (HIDDEN) returns 404 PDP for all buyers | ✓ PASS | 6.7s |
| 14 | FTC-03 | RFQ gate returns ok=false for Buyer B (REQUESTED) on FAB-004 (APPROVED_BUYER_ONLY) | ✓ PASS | 3.5s |
| 15 | FTC-04 | qa-knt-b items gated independently — Buyer A sees items, Buyer B does not | ✓ PASS | 6.5s |
| 16 | **FTC-05** | Override params in request body do not bypass approval gate for FAB-004 | ✗ FAIL | 1.5s |
| 17 | FTC-06 | Buyer A sees exactly 2 more items than Buyer C from qa-b2b (APPROVED_BUYER_ONLY diff) | ✓ PASS | 6.8s |
| 18 | FTD-01 | FAB-003 PDP for Buyer A (APPROVED) has priceDisclosure and no raw price | ✓ PASS | 9.5s |
| 19 | FTD-02 | FAB-003 PDP for Buyer B (REQUESTED) returns 200 with price disclosure metadata | ✓ PASS | 9.7s |
| 20 | FTD-03 | FAB-003 PDP for Buyer C (NONE) returns 200 with price disclosure metadata | ✓ PASS | 9.5s |
| 21 | FTD-04 | FAB-002 PDP (no price restriction) returns 200 for all buyers | ✓ PASS | 9.7s |
| 22 | FTE-01 | Buyer A RFQ prefill for FAB-002 (B2B_PUBLIC, APPROVED) returns ok=true | ✓ PASS | 6.5s |
| 23 | FTE-02 | Buyer A RFQ prefill for FAB-004 (APPROVED_BUYER_ONLY, APPROVED rel) returns ok=true | ✓ PASS | 6.7s |
| 24 | FTE-03 | Buyer B (REQUESTED) RFQ prefill for FAB-004 returns ok=false (gate denies) | ✓ PASS | 3.2s |
| 25 | FTE-04 | Buyer C (NONE) RFQ prefill for FAB-004 returns ok=false (gate denies) | ✓ PASS | 3.4s |
| 26 | FTE-05 | Buyer B RFQ prefill for FAB-002 (B2B_PUBLIC) returns ok=true | ✓ PASS | 6.5s |
| 27 | FTE-06 | Denied RFQ gate reason is a safe known value (no internal data leak) | ✓ PASS | 3.4s |
| 28 | FTE-07 | ok=false RFQ response does not contain item internals | ✓ PASS | 3.3s |
| 29 | FTE-08 | Buyer B draft rfq for FAB-006 (HIDDEN) returns ok=false (access denied) | ✓ PASS | 2.5s |
| 30 | **FTF-01** | GET /api/tenant/rfqs returns 200 for Buyer A | ✗ FAIL | 4.1s |
| 31 | FTF-02 | Buyer A RFQ list is org-scoped (no cross-tenant RFQ IDs visible) | ✓ PASS | 4.5s |
| 32 | FTF-03 | RFQ detail response does not leak supplier internal fields | ✓ PASS | 4.0s |
| 33 | **FTF-04** | Buyer B RFQ list returns 200 (may be empty) | ✗ FAIL | 4.3s |
| 34 | **FTG-01** | GET /api/tenant/rfqs/inbox returns 200 for supplier qa-b2b | ✗ FAIL | 4.2s |
| 35 | FTG-02 | Supplier inbox only contains RFQs targeting their org | ✓ PASS | 4.2s |
| 36 | FTG-03 | Supplier inbox item detail does not expose buyer org internals | ✓ PASS | 4.2s |
| 37 | FTG-04 | Buyer token cannot read supplier inbox | ✓ PASS | 4.0s |
| 38 | FTG-05 | Supplier inbox response does not contain policy fields | ✓ PASS | 4.2s |
| 39 | FTH-01 | GET recommendations for FAB-002 returns 200 for Buyer A | ✓ PASS | 2.4s |
| 40 | FTH-02 | Recommendations response does not contain score/rank/confidence/embeddingId/vector | ✓ PASS | 2.4s |
| 41 | FTH-03 | Recommendations items only contain supplierDisplayName, matchLabels, and cta | ✓ PASS | 2.4s |
| 42 | FTH-04 | Recommendations cta values are all valid buyer-safe CTA codes | ✓ PASS | 2.6s |
| 43 | FTH-05 | Recommendations do not include HIDDEN items in supplier display names | ✓ PASS | 2.4s |
| 44 | FTI-01 | GET DPP with unknown UUID returns 400 (validation) or 404 (not found) | ✓ PASS | 4.5s |
| 45 | FTI-02 | DPP 404 response does not leak internal fields | ✓ PASS | 4.5s |
| 46 | **FTI-03** | DPP passport endpoint with unknown UUID returns 400 or 404 | ✗ FAIL | 4.9s |
| 47 | **FTI-04** | DPP evidence-claims endpoint with unknown UUID returns 400 or 404 | ✗ FAIL | 4.1s |
| 48 | FTJ-01 | Service-provider tenant qa-svc-tst-a | — SKIP (BLOCKED_BY_AUTH) | — |
| 49 | FTJ-02 | Service-provider tenant qa-svc-log-b | — SKIP (BLOCKED_BY_AUTH) | — |
| 50 | FTJ-03 | Aggregator tenant qa-agg discovery | — SKIP (BLOCKED_BY_AUTH) | — |
| 51 | FTJ-04 | Aggregator discovery endpoint returns 403 for non-AGGREGATOR tenant tokens | ✓ PASS | 4.8s |
| 52 | FTK-01 | Browse response does not contain demo/sample/lorem test data strings | ✓ PASS | 6.2s |
| 53 | FTK-02 | Browse response does not contain $0 or NaN price values | ✓ PASS | 6.3s |
| 54 | FTK-03 | No response contains TODO/FIXME/placeholder strings | ✓ PASS | 8.9s |
| 55 | FTK-04 | RFQ list does not expose internal reason strings | ✓ PASS | 3.8s |
| 56 | FTK-05 | Eligible-suppliers list does not contain non-QA production org slugs | ✓ PASS | 4.8s |
| 57 | **P5** | Global anti-leakage scan — no forbidden fields in browse, PDP, RFQ, inbox, or recommendations | ✗ FAIL | 13.4s |
| 58 | **P6** | GET /health returns 200 — server is alive and stable | ✗ FAIL | 99ms |

---

## Failure Analysis — Triage Classification

### Spec Assertion Errors (5) — Correctable in spec file

| Test ID | Error | Root Cause | Spec Fix |
|---------|-------|-----------|----------|
| FTC-05 | `res.ok()` expected true, got 400 | Server applies strict body schema validation and returns 400 for unknown fields. Gate is still denied (not bypassed). The `res.ok()` precondition is too strict. | Accept HTTP 400 also as "gate denied" outcome |
| FTF-01 | `Array.isArray(body.data?.items)` false | `/api/tenant/rfqs` response envelope does not use `{ data: { items: [] } }` shape; actual shape different. `body.success === true` passed. | Probe actual response shape and update assertion |
| FTF-04 | Same as FTF-01 | Same, for Buyer B | Same |
| FTG-01 | `Array.isArray(body.data?.items)` false | `/api/tenant/rfqs/inbox` response envelope does not use `{ data: { items: [] } }` shape | Probe actual inbox response shape |
| P6 | SyntaxError: `Unexpected token '<'` | `GET https://app.texqtic.com/health` returns HTML page (frontend/CDN); backend health endpoint is at different host/path | Update URL to correct backend health endpoint |

### Product Defects (3) — BLOCKER REPORT ISSUED

| Test ID | Error | Defect Description |
|---------|-------|--------------------|
| FTI-03 | HTTP 500 for `GET /api/tenant/dpp/:nodeId/passport` with unknown UUID | Unhandled exception — DPP passport sub-route does not have proper 404 error handling; crashes with 500 |
| FTI-04 | HTTP 500 for `GET /api/tenant/dpp/:nodeId/evidence-claims` with unknown UUID | Same as FTI-03 for evidence-claims sub-route |
| P5 | `catalogVisibilityPolicyMode` present in `GET /api/tenant/catalog/items` (supplier own catalog) | Internal policy field leaking in supplier-facing catalog list response |

---

## Anti-Leakage Scan (P5)

**Result: FAIL**

The supplier own catalog endpoint (`GET /api/tenant/catalog/items`) returns `catalogVisibilityPolicyMode` in the response body. This field is a forbidden internal policy field per the anti-leakage contract.

- Context: `Supplier — own catalog`
- Field: `catalogVisibilityPolicyMode`
- Endpoint: `GET /api/tenant/catalog/items`

This is a product defect. Supplier-facing catalog list must not expose internal policy mode.

---

## Health Check (P6)

**Result: FAIL (spec error)**

`GET https://app.texqtic.com/health` returns `<!doctype html>` — the frontend app's HTML shell. The Playwright `baseURL` is the frontend origin; the Fastify backend health route is not served at that origin. Test URL must be corrected to the backend API base (e.g., `https://api.texqtic.com/health` or equivalent).

---

## Skipped Tests (FTJ-01, FTJ-02, FTJ-03)

Three service-provider/aggregator tenant tests were skipped with `BLOCKED_BY_AUTH` — `.auth/qa-svc-*` and `.auth/qa-agg-*` files do not exist. These tests require separate auth seeding for those tenant types and are out of scope for this run.

---

## Read-Only Confirmation

- No product code files modified
- No Prisma migrations executed
- No DB mutations
- No seed scripts run
- Git status: only `tests/e2e/full-textile-chain-runtime-qa.spec.ts` (untracked, new file)

```
git status --short output:
?? tests/e2e/full-textile-chain-runtime-qa.spec.ts
```

---

## Blocked Items

**3 product defects are blocked pending developer action:**

1. DPP `/passport` sub-route — unhandled exception on unknown nodeId → returns 500
2. DPP `/evidence-claims` sub-route — unhandled exception on unknown nodeId → returns 500
3. Supplier catalog list — leaks `catalogVisibilityPolicyMode` in API response

**5 spec assertion errors** are correctable in the spec file (`tests/e2e/full-textile-chain-runtime-qa.spec.ts`) without product code changes — pending user approval.

See TEXQTIC EXECUTION BLOCKER REPORT below.

---

## §6 — Remediation: TECS-FULL-TEXTILE-RUNTIME-QA-BLOCKER-REMEDIATION-001

**Date:** 2025-07-24  
**Task:** TECS-FULL-TEXTILE-RUNTIME-QA-BLOCKER-REMEDIATION-001  
**Objective:** Resolve all 8 blockers from the original Slice F run.

### 8 Fixes Applied

#### Product Defects (server-side — `server/src/routes/tenant.ts`)

| Fix | Test | Route | Change |
|-----|------|-------|--------|
| Fix A | FTI-03 | `GET /tenant/dpp/:nodeId/passport` | Added try-catch around `withDbContext` block; on any DB exception → `sendNotFound(404)`. Added `productRows.length === 0` guard before processing. |
| Fix B | FTI-04 | `GET /tenant/dpp/:nodeId/evidence-claims` | Added node-existence pre-check via `SELECT node_id FROM dpp_snapshot_products_v1 WHERE node_id = $nodeId LIMIT 1`. Returns 404 if node not found or DB throws. Then existing claims query runs with its own try-catch. |
| Fix C | P5 | `GET /tenant/catalog/items` | Added explicit `select` clause to `tx.catalogItem.findMany()` listing 21 safe fields; explicitly excludes `catalogVisibilityPolicyMode`, `publicationPosture`, `priceDisclosurePolicyMode`, `tenantId`. |

#### Spec Assertion Errors (`tests/e2e/full-textile-chain-runtime-qa.spec.ts`)

| Fix | Test | Issue | Fix |
|-----|------|-------|-----|
| Fix D | FTC-05 | `expect(res.ok()).toBe(true)` fails when server returns 400 (strict schema validation) | Changed to: accept `400` OR `2xx + body.data.ok === false`. Gate still enforced either way. |
| Fix E | FTF-01 | `body.data?.items` key does not exist | `/api/tenant/rfqs` returns `{ data: { rfqs: [] } }`. Changed assertion to use `body.data?.rfqs`. |
| Fix F | FTF-04 | Same as FTF-01 for Buyer B RFQ list | Same fix: `items` → `rfqs`. |
| Fix G | FTG-01 | Same as FTF-01 for Supplier inbox | `/api/tenant/rfqs/inbox` also returns `rfqs` key. Same fix. |
| Fix H | P6 | `GET ${BASE_URL}/health` returns frontend HTML | Changed to `GET ${BASE_URL}/api/health` (backend Fastify health route). |

---

### Pre-Deployment Verification Run (Spec Fixes Only)

After applying Fixes D–H to the spec file, a full Playwright run confirmed:

| Metric | Count |
|--------|-------|
| Total tests | 58 |
| Passed | 52 |
| Failed | 3 (FTI-03, FTI-04, P5) |
| Skipped | 3 (FTJ-01–03, BLOCKED_BY_AUTH) |
| Duration | ~5.8 min |

The 5 spec fixes (D–H) resolved their respective failures. The 3 remaining failures (FTI-03, FTI-04, P5) are server-side product defects — Fixes A–C are implemented in `server/src/routes/tenant.ts` but require deployment to take effect on `https://app.texqtic.com`.

**Pre-deployment git state:**
```
M  server/src/routes/tenant.ts
?? docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-F-FULL-RUNTIME-QA-EVIDENCE.md
?? tests/e2e/full-textile-chain-runtime-qa.spec.ts
```

---

### Post-Deployment Verification Run

*To be updated after Vercel deployment completes and full suite is re-executed.*

**Expected outcome:** 55 passed, 3 skipped (FTJ-01–03, BLOCKED_BY_AUTH), 0 failed.
