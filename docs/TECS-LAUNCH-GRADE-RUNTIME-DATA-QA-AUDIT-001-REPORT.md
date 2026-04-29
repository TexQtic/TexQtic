# TECS-LAUNCH-GRADE-RUNTIME-DATA-QA-AUDIT-001 — Launch-Grade Runtime Data QA Audit Report

**Task ID:** `TECS-LAUNCH-GRADE-RUNTIME-DATA-QA-AUDIT-001`  
**Audit Date:** 2026-07-03  
**Git HEAD at Audit:** `8b56962` (gov(ai-matching): close TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001)  
**Branch:** `main`  
**Working Tree State:** Clean (verified `git diff --name-only` + `git status --short` → no output)  
**Auditor:** GitHub Copilot (automated static code analysis + API shape tracing)  
**Production URL:** `https://app.texqtic.com`  

---

## LAUNCH READINESS VERDICT

```
STATUS: NOT_LAUNCH_READY
```

**Blocking reason:** P1 data leakage confirmed in the buyer-facing RFQ detail surface. Catalog price (`item_unit_price`) and supplier internal identifier (`supplier_org_id`) are reaching the buyer UI through the backend API response mapper. These fields must be removed before any public production launch.

---

## Executive Summary

This audit covers the full B2B buyer-facing data surface across: catalog PDP, RFQ submission and detail views, AI supplier recommendations, document intelligence surfaces, and the price disclosure policy stack. 

Six confirmed issues were identified:
- **2 P1 issues** — data fields constitutionally forbidden from buyer-facing surfaces are visible in the UI (catalog price rendered as "Unit Price" and "Trade Gross Amount"; supplier UUID rendered as "Supplier Organization ID")
- **4 P2 issues** — the same forbidden fields are present in the backend API response shapes even where the frontend does not yet render them (list API, supplier response embedded type, TypeScript type definitions)

All AI surfaces (supplier matching, document intelligence, recommendation endpoint), the catalog PDP price disclosure stack, and the static/demo data baseline are **clean and PASS**.

---

## Scope of Audit

| Surface | Files Inspected |
|---|---|
| Buyer RFQ detail UI | `components/Tenant/BuyerRfqDetailSurface.tsx` |
| Buyer RFQ list UI | `components/Tenant/BuyerRfqListSurface.tsx` |
| Catalog PDP UI | `components/Tenant/CatalogPdpSurface.tsx` |
| Document Intelligence | `components/Tenant/DocumentIntelligenceCard.tsx` |
| API response mappers | `server/src/routes/tenant.ts` (`mapBuyerRfqListItem`, `mapBuyerRfqDetail`, `mapBuyerRfqResponse`, `mapSupplierRfqDetail`) |
| Frontend type definitions | `services/catalogService.ts` |
| Price disclosure stack | `server/src/services/pricing/pdpPriceDisclosure.service.ts`, `rfqPrefillContext.service.ts`, `relationshipAccess.service.ts` |
| AI matching runtime guard | `server/src/services/ai/supplierMatching/supplierMatchRuntimeGuard.service.ts` |
| AI matching type contracts | `server/src/services/ai/supplierMatching/supplierMatch.types.ts` |
| Recommendation endpoint | `server/src/routes/tenant.ts` (line 2807+) |
| Static/demo data scan | All `components/**/*.tsx` |

---

## Confirmed Issues

### ISSUE-001a — P1 — Unit Price rendered to buyer

| Attribute | Value |
|---|---|
| **Severity** | P1 — Launch Blocker |
| **File** | `components/Tenant/BuyerRfqDetailSurface.tsx` |
| **Line** | 218 |
| **Field** | `rfq.item_unit_price` |
| **Rendered label** | `"Unit Price"` |
| **Evidence** | `<DetailRow label="Unit Price" value={formatCurrency(rfq.item_unit_price, 'USD')} />` |
| **Impact** | Buyers can read the catalog item's internal wholesale price. This violates the TexQtic price disclosure policy system, which mandates prices are gated behind an RFQ/relationship approval flow. |

---

### ISSUE-001b — P1 — Trade Gross Amount rendered to buyer

| Attribute | Value |
|---|---|
| **Severity** | P1 — Launch Blocker |
| **File** | `components/Tenant/BuyerRfqDetailSurface.tsx` |
| **Lines** | 186, 219 |
| **Field** | `rfq.item_unit_price * rfq.quantity` (as `tradeGrossAmount`) |
| **Rendered label** | `"Trade Gross Amount"` |
| **Evidence (line 186)** | `const tradeGrossAmount = rfq.item_unit_price * rfq.quantity;` |
| **Evidence (line 219)** | `<DetailRow label="Trade Gross Amount" value={formatCurrency(tradeGrossAmount, 'USD')} />` |
| **Impact** | Even if the "Unit Price" row were removed, the derived `tradeGrossAmount` independently reconstructs the price. Both must be removed together. |

---

### ISSUE-001c — P1 — Supplier Organization ID rendered to buyer

| Attribute | Value |
|---|---|
| **Severity** | P1 — Launch Blocker |
| **File** | `components/Tenant/BuyerRfqDetailSurface.tsx` |
| **Line** | 220 |
| **Field** | `rfq.supplier_org_id` |
| **Rendered label** | `"Supplier Organization ID"` |
| **Evidence** | `<DetailRow label="Supplier Organization ID" value={rfq.supplier_org_id} />` |
| **Impact** | Exposes an internal UUID (primary key of the supplier's `organizations` row) directly to buyers. This is an internal infrastructure identifier with no safe buyer-facing meaning. |

---

### ISSUE-002 — P1 — Backend source: `item_unit_price` in buyer RFQ detail API response

| Attribute | Value |
|---|---|
| **Severity** | P1 — Backend Source of ISSUE-001a / ISSUE-001b |
| **File** | `server/src/routes/tenant.ts` |
| **Function** | `mapBuyerRfqDetail()` |
| **Evidence** | `item_unit_price: Number(rfq.catalogItem.price ?? 0)` |
| **Impact** | This is the backend mapper that constructs the JSON payload delivered to the frontend. Removing lines 218-220 from the component is insufficient if this field remains in the API response — it will remain accessible via browser devtools network inspection. The backend mapper must also be fixed. |

---

### ISSUE-003 — P2 — `supplier_org_id` in buyer RFQ list API response

| Attribute | Value |
|---|---|
| **Severity** | P2 — API Hygiene |
| **File** | `server/src/routes/tenant.ts` |
| **Function** | `mapBuyerRfqListItem()` |
| **Evidence** | `supplier_org_id: rfq.supplierOrgId` |
| **Impact** | The list endpoint (`GET /api/tenant/rfqs`) returns `supplier_org_id` for every RFQ in the buyer's list. The list UI (`BuyerRfqListSurface.tsx`) does not currently render this field, but it is present in the API wire format and visible in browser network inspection. It does not belong in a buyer-facing API response. |

---

### ISSUE-004 — P2 — `org_id` (buyer's own org) in buyer RFQ list API response

| Attribute | Value |
|---|---|
| **Severity** | P2 — API Hygiene |
| **File** | `server/src/routes/tenant.ts` |
| **Function** | `mapBuyerRfqListItem()` |
| **Evidence** | `org_id: rfq.orgId` |
| **Impact** | Returns the buyer's own `org_id` (UUID from `organizations` table) in the list response. While this is the authenticated buyer's own identifier, it is an internal infrastructure UUID with no business meaning in a buyer-facing API response and should not be exposed. |

---

### ISSUE-005 — P2 — `supplier_org_id` in embedded supplier response within buyer RFQ detail

| Attribute | Value |
|---|---|
| **Severity** | P2 — API Hygiene |
| **File** | `server/src/routes/tenant.ts` |
| **Function** | `mapBuyerRfqResponse()` |
| **Evidence** | `supplier_org_id: response.supplierOrgId` |
| **Impact** | When a supplier has responded to an RFQ, the buyer's detail response embeds the supplier's `org_id` in the nested `supplier_response` object. This is the same P2 identifier leakage as ISSUE-003, now at the nested level. |

---

### ISSUE-006 — P2 — Frontend type definitions expose forbidden fields

| Attribute | Value |
|---|---|
| **Severity** | P2 — Type Hygiene |
| **File** | `services/catalogService.ts` |
| **Types affected** | `BuyerRfqDetail` (line 209+), `BuyerRfqListItem` (line 163+), `BuyerRfqSupplierResponse` (line 198) |
| **Fields** | `item_unit_price: number` (in `BuyerRfqDetail`), `supplier_org_id: string` (in `BuyerRfqDetail`, `BuyerRfqListItem`, `BuyerRfqSupplierResponse`), `org_id?: string` (in `BuyerRfqDetail`, `BuyerRfqListItem`) |
| **Impact** | TypeScript type definitions model the API contract. These fields being typed creates a footprint risk: future developers may reference them in new components without realising they should not be rendered. |

---

## Surfaces Confirmed SAFE

### Catalog PDP — PASS

**File:** `components/Tenant/CatalogPdpSurface.tsx`

- Price rendering: uses `CATALOG_PDP_PRICE_PLACEHOLDER_LABEL = 'Price available on request'` — no actual price value rendered
- Price placeholder sublabel: `'RFQ required for pricing'` — correct posture
- No `publicationPosture`, `risk_score`, or internal metadata rendered
- `CATALOG_PDP_COMPLIANCE_NOTICE` constant is a UI disclosure string, not sensitive data

---

### Document Intelligence — PASS

**File:** `components/Tenant/DocumentIntelligenceCard.tsx`

- Lines 17-18: forbidden fields (`publicationPosture`, `risk_score`, `buyerRanking`, `supplierRanking`, `matchingScore`, `escrow`, `paymentDecision`, `creditScore`) are explicitly listed in the component's doc comment as `FORBIDDEN — do not render`
- `resolveConfidencePercent`, `resolveConfidenceTier` are document extraction confidence helpers (supplier-facing tool for AI document intelligence), not buyer-facing price or ranking disclosure

---

### Buyer RFQ List Surface — PASS

**File:** `components/Tenant/BuyerRfqListSurface.tsx`

- `BuyerRfqListCard` renders: RFQ Reference (id), Catalog Item, Item SKU, Quantity, Last Updated, Submitted timestamp
- Does NOT render `supplier_org_id`, `org_id`, or any price field
- `SupplierRfqInboxCard` renders: RFQ Reference, Catalog Item, Item SKU, Requested Quantity, Last Updated — safe

---

### Price Disclosure Policy Stack — PASS

| Service | Finding |
|---|---|
| `pdpPriceDisclosure.service.ts` | `attachPriceDisclosureToPdpView` and `buildPdpDisclosureMetadata` correctly gate price by policy mode. PDP view receives `pricePlaceholder` only — no actual price value |
| `rfqPrefillContext.service.ts` | `validatePriceDisclosureForPrefill()` correctly handles `LOGIN_REQUIRED`, `ELIGIBILITY_REQUIRED`, `HIDDEN` cases. Blocks RFQ prefill for `HIDDEN` policy mode |
| `relationshipAccess.service.ts` | `HIDDEN` mode denies catalog/price access even for `APPROVED` relationships. `RELATIONSHIP_ONLY` requires `APPROVED` state. Policy enforcement verified at lines 72, 81, 199, 248-259 |

---

### AI Supplier Matching — PASS

#### Recommendation Endpoint (`GET /api/tenant/catalog/items/:itemId/recommendations`)

**File:** `server/src/routes/tenant.ts` (line 2807+)

- Line 2817 comment: `"NO score, rank, confidence, relationshipState, price, or internal metadata"`
- Pipeline sequence verified: Signal Build (Slice A) → Policy Filter (Slice B) → Rank (Slice C) → Explanation (Slice D) → Runtime Guard (Slice F)
- Runtime guard: `guardSupplierMatchOutput()` applied at line 3058
- Response type: `SafeRecommendedSupplierItem[]` (line 3071) — confirmed type-safe buyer output only
- `supplierDisplayName` derived from `organizations.legal_name` (admin context lookup only)
- CTA values limited to `REQUEST_QUOTE | REQUEST_ACCESS | VIEW_PROFILE`
- `matchLabels` derived from explanation builder label map only — no raw signal data

#### AI Matching Type Contracts

**File:** `server/src/services/ai/supplierMatching/supplierMatch.types.ts`

- Line 11: `"price, publicationPosture, risk_score, audit metadata, and relationship graph are [forbidden from AI paths]"`
- Line 90: `"confidence / score / ranking score — no numeric AI score is exposed (design §7)"`
- `SupplierMatchCandidateDraft`: does not include price, score, rank, confidence fields
- Tenancy: `buyerOrgId` is documented as MUST originate from JWT (line 10, 117)

#### Runtime Guard Constants

**File:** `server/src/services/ai/supplierMatching/supplierMatchRuntimeGuard.service.ts`

`FORBIDDEN_GUARD_FIELDS` covers: `price`, `amount`, `unitPrice`, `basePrice`, `listPrice`, `costPrice`, `supplierPrice`, `negotiatedPrice`, `internalMargin`, `margin`, `commercialTerms`, `price_disclosure_policy_mode`, `score`, `rank`, `ranking`, `confidenceScore`, `aiConfidence`, `risk_score`

Guard performs recursive object key traversal AND explanation text scanning before output reaches the client.

#### AI Text Pipelines (Vector Build / RFQ Summary)

- `buildCatalogItemVectorText()`: comment "DOES NOT include price or publicationPosture — intentional" — price field absent from function signature
- `assembleStructuredRfqRequirementSummaryText()`: comment "EXCLUDED: price / item_unit_price (financial data — AI must not price-match)" — function signature enforces exclusion

---

### Static / Demo Data Scan — PASS

Scan target: all `components/**/*.tsx` files  
Pattern: `mock|demo|SEEDED|hardcoded|placeholder` (logical union)

Result:
- All `placeholder=""` occurrences are HTML form input `placeholder` attributes — correct usage
- `AuthFlows.tsx` line 5 comment `"Removed hardcoded SEEDED_TENANTS picker"` — historical removal note, no active seeded data present
- No active hardcoded demo data, mock tenant UUIDs, or seeded credentials found

---

### Supplier RFQ Detail (supplier-side view) — PASS

**Function:** `mapSupplierRfqDetail()` in `server/src/routes/tenant.ts`

- Does NOT include `item_unit_price`, buyer's `org_id`, or `supplier_org_id` in response
- Returns: `id`, `status`, `catalog_item_id`, `item_name`, `item_sku`, `quantity`, `created_at`, `updated_at`, `requirement_title`, `quantity_unit`, `urgency`, `sample_required`, `delivery_country`, `stage_requirement_attributes`, `buyer_message`, `buyer_counterparty_summary`
- Buyer-side and supplier-side RFQ detail responses are correctly isolated

---

## Validation Results

### TypeScript — PASS

| Scope | Command | Result |
|---|---|---|
| Server | `pnpm -C server exec tsc --noEmit` | 0 errors, 0 warnings (no output) |
| Frontend | `npx tsc --noEmit` | 0 errors, 0 warnings (no output) |

### ESLint — PASS (2 warnings, 0 errors)

**Command:** `pnpm -C server exec eslint src/routes/tenant.ts --format stylish`

| Location | Rule | Severity |
|---|---|---|
| `tenant.ts:2874:26` | `@typescript-eslint/no-non-null-assertion` | warning |
| `tenant.ts:3083:34` | `@typescript-eslint/no-non-null-assertion` | warning |

**Assessment:** 0 errors. The 2 warnings are non-null assertion operators (`!`) at array access sites in the recommendation pipeline (lines 2874 and 3083). These are code quality notes — they do not affect correctness of the data leakage analysis and do not constitute security or privacy issues. Infrastructure deprecation noise (`.eslintignore` migration warning) is a tooling concern, not a code issue.

### Playwright Runtime Verification — COMPLETED — P1 CONFIRMED ACTIVE IN PRODUCTION

Runtime verification was completed on 2026-04-29 using an authenticated QA session (`QA B2B`) against production `https://app.texqtic.com` with Playwright (Chromium). All P1 findings from static analysis are confirmed active in production. See "Runtime Completion Pass" section below for full evidence.

---

## Governance State

| Check | Status |
|---|---|
| `HOLD-FOR-BOUNDARY-TIGHTENING` posture | **ACTIVE** |
| Remediation authorized in this task | **NO** |
| Code changes made | **NONE** |
| DB changes made | **NONE** |
| Files modified | `docs/TECS-LAUNCH-GRADE-RUNTIME-DATA-QA-AUDIT-001-REPORT.md` (this file, new) |

This audit is a **report-only deliverable**. No remediation has been applied. The governance posture `HOLD-FOR-BOUNDARY-TIGHTENING` is in effect. Remediation must be authorised by Paresh as a separate named work unit.

---

## Remediation Advisory (For Paresh's Decision — Not Applied)

The following changes are required to reach launch-readiness on the confirmed issues. These are advisory only; they must not be applied without explicit authorisation.

### P1 Remediation (Must complete before launch)

**Step 1 — Remove price rendering from `BuyerRfqDetailSurface.tsx`**

- Remove line 186: `const tradeGrossAmount = rfq.item_unit_price * rfq.quantity;`
- Remove line 218: `<DetailRow label="Unit Price" value={formatCurrency(rfq.item_unit_price, 'USD')} />`
- Remove line 219: `<DetailRow label="Trade Gross Amount" value={formatCurrency(tradeGrossAmount, 'USD')} />`
- Remove line 220: `<DetailRow label="Supplier Organization ID" value={rfq.supplier_org_id} />`

**Step 2 — Remove `item_unit_price` from `mapBuyerRfqDetail()` in `server/src/routes/tenant.ts`**

- Remove the `item_unit_price: Number(rfq.catalogItem.price ?? 0)` field from the mapper return value
- This prevents the field from reaching the wire format regardless of frontend changes

### P2 Remediation (Required for API hygiene before launch)

**Step 3 — Remove `supplier_org_id` and `org_id` from `mapBuyerRfqListItem()` in `server/src/routes/tenant.ts`**

- Remove `org_id: rfq.orgId` from mapper return
- Remove `supplier_org_id: rfq.supplierOrgId` from mapper return

**Step 4 — Remove `supplier_org_id` from `mapBuyerRfqResponse()` in `server/src/routes/tenant.ts`**

- Remove `supplier_org_id: response.supplierOrgId` from mapper return

**Step 5 — Update frontend type definitions in `services/catalogService.ts`**

- Remove `item_unit_price: number` from `BuyerRfqDetail` interface
- Remove `supplier_org_id: string` from `BuyerRfqDetail`, `BuyerRfqListItem`, and `BuyerRfqSupplierResponse` interfaces
- Remove `org_id?: string` from `BuyerRfqDetail` and `BuyerRfqListItem` interfaces

### Non-Blocking Notes (Post-Launch Backlog)

- The 2 ESLint `@typescript-eslint/no-non-null-assertion` warnings in `tenant.ts` at lines 2874 and 3083 are in the recommendation pipeline array access paths. They are not security-critical but should be resolved in a subsequent code quality pass.

---

## Runtime Completion Pass — 2026-04-29

**Session:** QA B2B (manufacturer/supplier role, Primary Segment: Weaving)  
**Environment:** Production — `https://app.texqtic.com`  
**Browser:** Chromium (Playwright-controlled)  
**Verification Date:** 2026-04-29  
**Git HEAD at Runtime Verification:** `ec70f0d`  
**Auditor:** GitHub Copilot (authenticated Playwright session)  

---

### Phase Summary

| Phase | Surface | Verdict | Notes |
|---|---|---|---|
| 3 | Approval-Gate (Browse Suppliers) | BLOCKED_BY_TEST_DATA | Single QA session; only one supplier visible (same org). Cross-tenant approval-gate scenarios require multi-tenant QA fixture matrix |
| 4 | Request Quote Modal | PASS | No price disclosure in RFQ submission form. Only quantity/logistics fields rendered |
| 5 | Buyer RFQ List | PASS | No P1/P2 fields in list cards |
| 5 | Buyer RFQ Detail | **FAIL — P1 CONFIRMED** | Unit Price, Trade Gross Amount, Supplier Org ID all rendered in production |
| 6 | Supplier RFQ Inbox List | PASS | No buyer-private data in inbox list |
| 6 | Supplier RFQ Inbox Detail | PASS | No price or org_id leakage in supplier-facing detail |
| 7 | Catalog PDP (buyer browse) | BLOCKED — 404 | Buyer PDP returns "Unable to load item details" for self-org browse |
| 8 | AI Matching Surface | NOT_VISIBLE | PDP blocked by 404; AI recommendations panel not reachable in this session |
| 9 | Browse Suppliers Catalog | PASS | No prices on buyer-facing catalog cards; only Min. Order shown |
| 10 | DPP/Admin/Data Hygiene | DATA_HYGIENE_DB_ACCESS_BLOCKED | No direct DB access in this audit scope |

---

### P1 Runtime Evidence — CONFIRMED ACTIVE IN PRODUCTION

The following fields were visually confirmed rendered in `BuyerRfqDetailSurface` in production for two separate RFQs:

| RFQ ID | Item | Unit Price Rendered | Trade Gross Amount Rendered | Supplier Org ID Rendered |
|---|---|---|---|---|
| `cb18aafa-f261-45cc-8500-ad0f4e93a579` | RCP1-Validation-1772526705780 | $49.99 | $49.99 (= $49.99 × 1) | [REDACTED — internal UUID] |
| `30f1f8e8-79cd-429b-9497-612bdc2d39fb` | Recycled Polyester Taffeta | $14.00 | $2,100.00 (= $14 × 150) | [REDACTED — internal UUID] |

The P1 leakage is **systemic** — confirmed across multiple RFQs from different time periods and different catalog items. The issue is structural, originating from `mapBuyerRfqDetail()` in `tenant.ts` flowing through the `BuyerRfqDetail.item_unit_price` type to `BuyerRfqDetailSurface.tsx:218-220`.

---

### Surfaces Confirmed Clean at Runtime

| Surface | Verdict | Evidence |
|---|---|---|
| Browse Suppliers catalog list | PASS | No prices on buyer-facing cards; only Min. Order shown; no Edit/Delete buttons |
| Request Quote modal | PASS | No Unit Price, Trade Gross Amount, or Supplier Org ID in RFQ submission form |
| Buyer RFQ List | PASS | No P1/P2 fields in list view; 5 RFQs listed with safe fields only |
| Supplier RFQ Inbox list | PASS | 9 RFQs listed; fields: Catalog Item, SKU, Requested Quantity, Last Updated, Status |
| Supplier RFQ Inbox detail | PASS | No buyer org_id, no price; shows RFQ reference, catalog item, SKU, quantity, dates, response form |

---

### Runtime Verdict

```
RUNTIME STATUS: P1 CONFIRMED ACTIVE IN PRODUCTION (2026-04-29)
OVERALL STATUS: NOT_LAUNCH_READY (unchanged)
```

**Note on Approval-Gate Testing (Phase 3):** A single QA tenant session (`QA B2B`) was available. The Browse Suppliers view returned only one supplier entry (the session's own org). Cross-tenant scenarios (unapproved buyer → supplier catalog; approved buyer → price visibility gating; relationship-denied buyer) require a dedicated multi-tenant QA fixture matrix with at least two independent tenant accounts in distinct relationship states. These scenarios remain `BLOCKED_BY_TEST_DATA` and are recommended as a follow-up QA milestone before launch.

**Note on AI Matching Runtime (Phase 8):** The buyer-facing PDP for Browse Suppliers returned HTTP 404 ("Unable to load item details") for the self-org browse session. Since the PDP did not load, the AI recommendations panel was not reachable. The static analysis PASS finding for AI matching (runtime guard, type contracts, recommendation endpoint) remains the current evidence base.

**Note on Buyer PDP 404 (Phase 7):** The buyer-facing PDP returns 404 under the self-org browse scenario. This may be an expected constraint (supplier cannot act as buyer of own catalog items) or a separate issue. It is flagged for investigation but does not alter the P1/P2 findings.

---

## Issue Summary Table

| Issue ID | Severity | File | Finding |
|---|---|---|---|
| ISSUE-001a | **P1 — Launch Blocker** | `BuyerRfqDetailSurface.tsx:218` | `Unit Price` (catalog price) rendered to buyer UI |
| ISSUE-001b | **P1 — Launch Blocker** | `BuyerRfqDetailSurface.tsx:186,219` | `Trade Gross Amount` (price × qty) rendered to buyer UI |
| ISSUE-001c | **P1 — Launch Blocker** | `BuyerRfqDetailSurface.tsx:220` | `Supplier Organization ID` (internal UUID) rendered to buyer UI |
| ISSUE-002 | **P1 — Backend Source** | `tenant.ts` `mapBuyerRfqDetail()` | `item_unit_price` from catalog in buyer-facing API response wire format |
| ISSUE-003 | **P2 — API Hygiene** | `tenant.ts` `mapBuyerRfqListItem()` | `supplier_org_id` present in buyer RFQ list API response |
| ISSUE-004 | **P2 — API Hygiene** | `tenant.ts` `mapBuyerRfqListItem()` | `org_id` (buyer's own) present in buyer RFQ list API response |
| ISSUE-005 | **P2 — API Hygiene** | `tenant.ts` `mapBuyerRfqResponse()` | `supplier_org_id` in embedded supplier response in buyer detail |
| ISSUE-006 | **P2 — Type Hygiene** | `catalogService.ts` | `item_unit_price`, `supplier_org_id`, `org_id` typed in buyer-facing interfaces |

---

*Report generated by automated static analysis + authenticated Playwright runtime verification (2026-04-29). P1 confirmed active in production. All findings are code-evidence-based.*
