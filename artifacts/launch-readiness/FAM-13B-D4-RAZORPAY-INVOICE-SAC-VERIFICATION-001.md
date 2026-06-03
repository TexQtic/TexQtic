# FAM-13B-D4 — Razorpay Invoice SAC Verification
## Artifact: `RAZORPAY-INVOICE-SAC-VERIFICATION-001`

**Unit ID:** FAM-13B-D4-RAZORPAY-INVOICE-SAC-VERIFICATION-001
**Unit type:** Verification-only governance artifact
**Date:** 2026-06-03
**Opened after:** FAM-13B-D3 COMPLETE (seal commit `6c2a6414`, HEAD at D4 open)
**Prerequisite:** FAM-13B-D3-PAYMENT-PREREQUISITE-TRACKER-AND-OPERATIONAL-READINESS-001 SEALED

> **Scope constraint:** This unit verifies whether Razorpay Subscriptions, Razorpay Dashboard,
> Razorpay Invoice API, and/or Razorpay support can satisfy TexQtic's CA-confirmed SAC/GST
> invoice requirements for SaaS subscription billing.
>
> This unit does NOT implement Razorpay, checkout, payment links, webhooks, payment SDKs,
> billing schema, Prisma changes, migrations, env keys, package dependencies, backend routes,
> public pricing changes, or any live/test payment behavior.
>
> No source code, schema, migration, or environment variable was changed in this unit.

---

## 1. Unit Summary

### 1.1 Purpose

FAM-13B-D4 is a verification-only governance unit with one mission: determine the current
state of knowledge for risk item `RAZORPAY-INVOICE-SAC-VERIFICATION-001`, which has been
carried open since FAM-13B-D2 §8. The risk captures the concern that Razorpay subscription
billing receipts/invoices may not natively support the CA-confirmed SAC code (`998315`),
18% GST exclusive breakdown, and IGST/CGST+SGST split format required for India GST
compliance.

### 1.2 What Was Attempted

1. **Automated fetch of Razorpay external documentation** — nine distinct Razorpay URLs
   were attempted (see §5). All blocked by JavaScript rendering or returned 404/504 errors.
   Outcome: INACCESSIBLE (consistent with FAM-13B-D3 finding).
2. **Repo-truth inspection** — all governance artifacts from D2 and D3, NEXT-ACTION.md,
   DECISION-PARKING-LOT.md, COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md, and
   FUTURE-TODO-REGISTER.md were read in full.
3. **Source code search** — confirmed zero Razorpay, SAC, payment gateway, or webhook
   references in any source, config, or package file.
4. **Knowledge-based analysis of VQ-01 through VQ-07** — each verification question from
   D3 §6 was assessed using product knowledge of Razorpay's capabilities and Indian SaaS
   GST invoicing norms. Findings clearly labeled as product knowledge / UNVERIFIED (not
   off-platform confirmed evidence).

### 1.3 Outcome Classification

**UNVERIFIED** — Razorpay documentation remains inaccessible via automated fetch. No
Paresh-supplied Dashboard evidence or Razorpay support confirmation was provided.
Knowledge-based analysis strongly suggests Fallback-A or Fallback-B is required, but
formal VQ-01–VQ-07 closure requires off-platform verification by Paresh.

### 1.4 Gate Status

Implementation gate: **CLOSED** — unchanged from D3. No prerequisites advance in this unit.

---

## 2. Preflight Results

All preflight checks executed at D4 open (HEAD: `6c2a6414`, D3 seal commit).

| Check | Command / Source | Result | Status |
|---|---|---|---|
| Working tree clean | `git status --short` | (empty output) | ✅ PASS |
| HEAD = D3 seal | `git rev-parse --short HEAD` | `6c2a6414` | ✅ PASS |
| D3 main ancestor | `git merge-base --is-ancestor cf189ad0 HEAD` | exit 0 | ✅ PASS |
| D3 seal ancestor | `git merge-base --is-ancestor 6c2a6414 HEAD` | exit 0 | ✅ PASS |
| FAM-07 hold preserved | `file_search governance/legal/fam-07` | No files found | ✅ PASS — HOLD_FOR_HUMAN_LEGAL_INPUTS |
| Razorpay in source | grep across source/config/package | 0 matches | ✅ PASS — no implementation |
| NEXT-ACTION.md state | Read lines 1–140 | D4 installed as next candidate; D3 COMPLETE | ✅ PASS |
| D3 artifact sealed | cf189ad0 main + 6c2a6414 seal confirmed in HEAD lineage | Both ancestor confirmed | ✅ PASS |

---

## 3. Evidence Reviewed

| Evidence Source | Lines / Scope | Key Facts Extracted |
|---|---|---|
| `artifacts/launch-readiness/FAM-13B-D3-PAYMENT-PREREQUISITE-TRACKER-AND-OPERATIONAL-READINESS-001.md` | Full (1–722) | §3 Razorpay architecture facts; §4 gate status; §6 VQ-01–VQ-07 plan + fallbacks A/B/C; §7 KYC checklist; §8 refund worksheet; §9 PCI boundary rules; §10 event audit policy; §11 D-011/D-020/D-021/D-022 status; §12 implementation authorization; §16 final enum |
| `artifacts/launch-readiness/FAM-13B-D2-CA-SAC-CONFIRMATION-ADDENDUM-001.md` | §8 (lines 195–260) | Risk ID origin; RAZORPAY-INVOICE-SAC-VERIFICATION-001 first documented: "SAC/GST fields cannot be customized via Subscription or Invoice API in all configurations"; hard prerequisite for implementation |
| `governance/control/NEXT-ACTION.md` | Full (lines 1–140) | D3 COMPLETE; D4 installed as next candidate; implementation gate CLOSED; FAM-07 HOLD preserved; FTR-LEGAL-003 MVP_CRITICAL/OPEN |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | D-011 through D-022 entries | D-011 PARTIALLY_RESOLVED (item 4 CA_CONFIRMED); D-020 PARTIALLY_RESOLVED; D-021 PARKED; D-022 PARKED; D-015 FOUNDER_DECISION_RESOLVED |
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | §4.3–§4.4 | D3 status block; next unit D4; implementation gate still CLOSED |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | §11 rows (D1/D2/D3) | D3 row confirms: RAZORPAY-INVOICE-SAC-VERIFICATION-001 OPEN; manual verification required in D4; FTU-COMM-002 trigger unchanged |
| Razorpay external documentation | 9 URLs attempted (see §5) | ALL BLOCKED — JavaScript rendering required or 404/504 |
| Source code (all files) | grep: razorpay, 998315, 998599, 998311, invoice, SAC, GST, webhook, subscription | 0 matches in source/config/package files — confirmed clean |

---

## 4. CA-Confirmed Invoice Requirements (Locked — FAM-13B-D2)

These requirements are locked from FAM-13B-D2 (CA confirmation 2026-06-03). They define
what a Razorpay-issued or TexQtic-issued invoice MUST satisfy.

| Requirement | CA-Confirmed Value | Source |
|---|---|---|
| SAC code — SaaS subscriptions (all tiers) + AI add-on/overage | `998315` | FAM-13B-D2 §4; CA advisory 2026-06-03 |
| SAC code — B2B marketplace facilitation fee | `998599` | FAM-13B-D2 §4; CA advisory 2026-06-03 |
| SAC code — Enterprise professional services | `998311` | FAM-13B-D2 §4; CA advisory 2026-06-03 |
| Eliminated codes (must NOT appear) | `998314`, `998319`, `998596` | FAM-13B-D2 §4; CA advisory 2026-06-03 |
| GST rate | 18% | FAM-13B-D2 §4; CA advisory 2026-06-03 |
| GST display rule | EXCLUSIVE — base price stated exclusive of GST; GST shown as a separate line | FAM-13B-D2 §4; CA advisory 2026-06-03 |
| GST type — same-state transaction | CGST (9%) + SGST (9%) | India GST Act; CA advisory |
| GST type — inter-state transaction | IGST (18%) | India GST Act; CA advisory |
| Buyer GSTIN | Required on invoice for B2B subscribers claiming input tax credit | India GST Act |
| Supplier GSTIN (TexQtic) | Required on all tax invoices | India GST Act |
| Invoice number | Sequential, unique, reset per financial year | India GST Act Rule 46 |
| Invoice date | Date of supply event (subscription charge date) | India GST Act |
| Billing period | Start and end dates of subscription period covered | B2B SaaS best practice; CA advisory |
| Invoice label | Must be labeled "Tax Invoice" (not "Receipt" or "Payment Confirmation") | India GST Act Section 31 |

---

## 5. External Documentation Access Results

All Razorpay documentation URLs were attempted in this unit. Results are documented below.
This is the second consecutive unit (after FAM-13B-D3) where all Razorpay documentation
was inaccessible via automated fetch.

| URL Attempted | Method | Result | Notes |
|---|---|---|---|
| `https://razorpay.com/docs/payments/subscriptions/` | fetch_webpage | BLOCKED — only "Razorpay Assist" prompt returned (JavaScript rendering required) | Consistent with D3 |
| `https://razorpay.com/docs/payments/invoices/` | fetch_webpage | BLOCKED — only "Razorpay Assist" prompt returned | Consistent with D3 |
| `https://razorpay.com/docs/payments/subscriptions/api-integration/subscription/` | fetch_webpage | Failed to extract meaningful content | 404/JS |
| `https://razorpay.com/docs/payments/invoices/api/` | fetch_webpage | HTTP 404 | Endpoint not found |
| `https://razorpay.com/docs/payments/subscriptions/create-subscriptions/` | fetch_webpage | HTTP 404 | Endpoint not found |
| `https://razorpay.com/blog/gst-invoices/` | fetch_webpage | Failed to extract meaningful content | JS-blocked |
| `https://razorpay.com/docs/api/invoices/` | fetch_webpage | BLOCKED — only "Razorpay Assist" prompt returned | JS rendering required |
| `https://razorpay.com/docs/api/subscriptions/` | fetch_webpage | BLOCKED — only "Razorpay Assist" prompt returned | JS rendering required |
| `https://razorpay.com/docs/webhooks/` | fetch_webpage | BLOCKED — only "Razorpay Assist" prompt returned | JS rendering required |
| `https://razorpay.com/docs/payments/payment-gateway/gst-invoice/` | fetch_webpage | HTTP 404 | Endpoint not found |
| `https://razorpay.com/docs/payments/subscriptions/webhooks/` | fetch_webpage | HTTP 404 | Endpoint not found |
| `https://support.razorpay.com/hc/en-us` | fetch_webpage | Failed to extract meaningful content | JS/login required |
| `https://support.razorpay.com/hc/en-us/articles/360021369451` | fetch_webpage | Failed to extract meaningful content | JS/login required |
| `https://razorpay.com/gst/` | fetch_webpage | HTTP 504 Gateway Timeout | |
| `https://razorpay.com/learn/gst-invoices/` | fetch_webpage | HTTP 404 | Endpoint not found |

**Finding:** Razorpay's public documentation is not accessible via automated fetch. All
attempts return JavaScript rendering requirements (modal prompt), 404 errors, or 504
timeouts. This is a known limitation documented in FAM-13B-D3 and confirmed again here.

**Protocol implication:** VQ-01 through VQ-07 answers cannot be confirmed from Razorpay
documentation via automated means. Off-platform verification by Paresh (Dashboard,
API sandbox, or Razorpay support) is the required evidence path. This unit classifies the
outcome as UNVERIFIED and provides knowledge-based analysis (labeled as such) as
supporting context.

---

## 6. VQ-01 through VQ-07 Analysis

**Analysis methodology:** Each verification question is assessed using:
(a) Product knowledge of Razorpay's capabilities as of available training data — clearly
labeled "PRODUCT_KNOWLEDGE"; NOT equivalent to off-platform confirmed evidence.
(b) Industry norms for India SaaS GST invoicing — clearly labeled "INDUSTRY_NORM".
(c) Evidence from D2 §8 (first documentation of this risk) — labeled "D2_EVIDENCE".

**Confidence scale:**
- HIGH = Multiple independent sources agree; low uncertainty
- MEDIUM = Available sources partially support the conclusion; some uncertainty
- LOW = Assessment based on limited or indirect evidence; significant uncertainty
- UNVERIFIED = No supporting evidence; must be confirmed off-platform

---

### VQ-01 — GSTIN Entry and GST Auto-Population on Subscription Invoices

**Question:** Does Razorpay Subscriptions allow GSTIN entry for the TexQtic merchant
account, and does this auto-populate GST amount on subscription invoices/receipts?

**Where to check:** Razorpay Dashboard → Account Settings → Tax Settings / GST Settings

| Dimension | Assessment | Confidence | Basis |
|---|---|---|---|
| GSTIN entry is possible in Razorpay Dashboard | YES — Razorpay requires GSTIN during KYC for India businesses; GST settings are configurable | MEDIUM | PRODUCT_KNOWLEDGE |
| GSTIN appears on merchant-side payment receipts | LIKELY YES — standard Razorpay receipt template includes merchant GSTIN when configured | MEDIUM | PRODUCT_KNOWLEDGE |
| GST amount automatically calculated on subscription invoices | LIKELY YES for total GST amount; breakdown (CGST/SGST vs IGST) uncertain | LOW | PRODUCT_KNOWLEDGE |
| CA-acceptable tax invoice format (not just receipt) | LIKELY NO — Razorpay subscription payment confirmations are payment receipts, not GST tax invoices in the legal sense under CGST Act Section 31 | MEDIUM | INDUSTRY_NORM + D2_EVIDENCE |

**VQ-01 answer (knowledge-based):** PARTIAL — GSTIN entry is supported and likely
appears on receipts. Full GST auto-population in a CA-acceptable Tax Invoice format is
uncertain; standard Razorpay subscription output is a payment receipt, not a statutory
tax invoice.

**Off-platform verification required:** YES — Paresh must log into Dashboard → Account
Settings → Tax Settings, enable GST settings, run a test subscription charge, and
examine the generated receipt/invoice to confirm whether it qualifies as a Tax Invoice
under India GST Act Section 31.

---

### VQ-02 — SAC Code in Plan `notes` Field → Invoice Propagation

**Question:** Can SAC code `998315` be embedded in subscription plan metadata (via `notes`
or a dedicated HSN/SAC field) and does it propagate to the customer-facing invoice/receipt?

**Where to check:** Razorpay Dashboard → Create Plan → Notes/Metadata; `/v1/plans` POST body

| Dimension | Assessment | Confidence | Basis |
|---|---|---|---|
| `notes` field available on plan objects | YES — Razorpay `notes` field accepts up to 15 key-value pairs on plan, subscription, and payment objects | HIGH | PRODUCT_KNOWLEDGE (D3 §3 confirmed) |
| SAC code storable in `notes.sac_code` | YES — `notes` is a free key-value store; `sac_code: "998315"` is a valid entry | HIGH | PRODUCT_KNOWLEDGE |
| `notes` field propagates to customer-facing invoice/receipt | LIKELY NO — Razorpay `notes` fields are internal metadata; they are accessible via API and Dashboard but are NOT printed on customer-facing payment receipts or subscription invoices in standard configuration | MEDIUM | PRODUCT_KNOWLEDGE + INDUSTRY_NORM |
| Dedicated HSN/SAC field on plan objects | UNCERTAIN — not documented in available knowledge; may exist in newer API versions but is unconfirmed | LOW | UNVERIFIED |

**VQ-02 answer (knowledge-based):** LIKELY NOT SUPPORTED natively — SAC code can be stored
in `notes` as merchant metadata but is very unlikely to propagate to the customer-facing
invoice/receipt in standard Razorpay subscription configuration.

**Off-platform verification required:** YES — Paresh must attempt creating a test plan
with `notes.sac_code = "998315"`, create a test subscription, trigger a test charge, and
examine the generated invoice to see if SAC code appears.

---

### VQ-03 — Full GST-Compliant Invoice Format from Subscription

**Question:** Does the Razorpay subscription invoice/receipt show: base price, GST rate
(18%), CGST+SGST or IGST breakdown, SAC code — in a format acceptable for India GST
compliance?

| Dimension | Assessment | Confidence | Basis |
|---|---|---|---|
| Amount paid shown | YES — standard receipt content | HIGH | PRODUCT_KNOWLEDGE |
| Merchant GSTIN shown | LIKELY YES — when configured | MEDIUM | PRODUCT_KNOWLEDGE |
| GST total amount shown (base + tax) | POSSIBLE — some Razorpay receipts show GST amount | LOW | PRODUCT_KNOWLEDGE |
| GST rate (18%) explicitly stated | UNCERTAIN — may show total with GST but not the rate | LOW | PRODUCT_KNOWLEDGE |
| CGST (9%) and SGST (9%) as separate line items | LIKELY NOT — not standard in subscription receipts; would require Invoice product | LOW | PRODUCT_KNOWLEDGE + INDUSTRY_NORM |
| IGST (18%) for inter-state as separate line item | LIKELY NOT — same reason | LOW | PRODUCT_KNOWLEDGE + INDUSTRY_NORM |
| SAC code (998315) shown | LIKELY NOT — not a standard subscription invoice field | MEDIUM | PRODUCT_KNOWLEDGE + D2_EVIDENCE |
| Buyer GSTIN field (for B2B subscribers) | UNCERTAIN — may require manual collection and Invoice API | LOW | PRODUCT_KNOWLEDGE |
| Invoice number (sequential merchant-controlled) | UNCERTAIN — Razorpay assigns its own reference numbers; merchant-defined invoice series may not be natively supported in subscription receipts | LOW | PRODUCT_KNOWLEDGE |
| "Tax Invoice" label (not just "Receipt") | LIKELY NOT in standard subscription confirmation | MEDIUM | INDUSTRY_NORM + D2_EVIDENCE |

**VQ-03 answer (knowledge-based):** LIKELY NOT COMPLIANT for full India GST Tax Invoice
requirements. Razorpay subscription payment receipts are payment confirmations, not
statutory Tax Invoices under CGST Act Section 31. They likely do not carry SAC code,
CGST/SGST breakdown, buyer GSTIN, or merchant-controlled invoice number series.

**D2 §8.1 context:** D2 explicitly stated: "Razorpay's API and product documentation
indicates that GST-compliant invoice fields — specifically tax rate percentage, HSN/SAC
code, item-level GST breakdown (IGST/CGST/SGST) — cannot be customized or added through
the Razorpay Subscription or Invoice API endpoints in all configurations." This assessment
is not contradicted by available knowledge.

**Off-platform verification required:** YES — the definitive test is Paresh running a
live test subscription charge in Razorpay test mode and examining the actual generated
receipt/invoice document against the CA-confirmed requirements in §4.

---

### VQ-04 — Razorpay Invoice API `/v1/invoices`: SAC/HSN and IGST/CGST+SGST Support

**Question:** Does the Razorpay Invoices API support SAC/HSN code and IGST/CGST/SGST
breakdown fields, and can it be used alongside Subscription billing for tax invoice generation?

| Dimension | Assessment | Confidence | Basis |
|---|---|---|---|
| Razorpay Invoice API exists as a product | YES — `/v1/invoices` is a Razorpay product for standalone invoice/payment-link creation | HIGH | PRODUCT_KNOWLEDGE |
| Invoice API supports line items with descriptions | YES — line items with `name`, `description`, `unit_amount`, `quantity` | MEDIUM | PRODUCT_KNOWLEDGE |
| Invoice API supports GST/tax fields | POSSIBLE — Razorpay India Invoice product reportedly supports GST configuration; extent is uncertain | LOW | PRODUCT_KNOWLEDGE |
| SAC/HSN code field in Invoice API | UNCERTAIN — may exist as a line item field, but not confirmed in knowledge base | LOW | UNVERIFIED |
| CGST/SGST explicit breakdown in Invoice API | UNCERTAIN — some configurations reportedly support this, but reliability and completeness are unconfirmed | LOW | PRODUCT_KNOWLEDGE (limited) |
| IGST handling for inter-state transactions | UNCERTAIN | LOW | UNVERIFIED |
| Usable alongside Subscription billing (hybrid flow) | TECHNICALLY POSSIBLE — Invoice API is independent; could be triggered by subscription webhook events. However, this would require a custom integration linking Razorpay subscription events to Invoice API calls | MEDIUM | PRODUCT_KNOWLEDGE |
| Implementation complexity for hybrid flow | HIGH — requires: subscription webhook → Invoice API call → send invoice to subscriber; non-trivial design | — | PRODUCT_KNOWLEDGE |

**VQ-04 answer (knowledge-based):** UNCERTAIN — the Razorpay Invoice API may offer more
GST field capability than subscription billing receipts, but the specific support for SAC
code, CGST/SGST breakdown, and auto-IGST detection is unconfirmed. A hybrid architecture
(Razorpay Subscriptions + Invoice API trigger) is technically plausible but requires
significant design work and CA confirmation.

**Off-platform verification required:** YES — Paresh must access the Razorpay Invoice API
documentation directly or contact Razorpay support to confirm whether SAC/HSN code is a
supported field and whether CGST/SGST split is available.

---

### VQ-05 — Razorpay Official India GST Compliance Position

**Question:** What is Razorpay's official India GST compliance position for subscription
SaaS invoices? Does Razorpay provide a GST-compliant tax invoice, or only a payment receipt?

| Dimension | Assessment | Confidence | Basis |
|---|---|---|---|
| Razorpay's role under India GST law | Razorpay is a payment service provider (PSP) / payment aggregator. PSPs are not required to issue GST invoices on behalf of merchants. They issue their own GST invoices for their services (e.g., transaction fees), but not on behalf of the merchant for the merchant's sales | HIGH | INDUSTRY_NORM |
| Razorpay subscription receipt vs. Tax Invoice | Razorpay subscription payment confirmations are payment receipts — confirmation that a payment event occurred. They are NOT the GST tax invoice that TexQtic (as the supplier) is required to issue under CGST Act Section 31 | HIGH | INDUSTRY_NORM + D2_EVIDENCE |
| Who must issue the tax invoice | TexQtic (as the registered supplier providing SaaS services) is responsible for issuing the GST tax invoice. Razorpay's confirmation does not relieve TexQtic of this obligation | HIGH | INDUSTRY_NORM + India GST Act Section 31 |
| Industry practice (Indian SaaS) | Most Indian SaaS companies using Razorpay issue separate tax invoices via accounting software (Zoho Books, Tally, ClearTax) or custom invoice generation. Razorpay receipts are used for payment confirmation only | HIGH | INDUSTRY_NORM |

**VQ-05 answer (knowledge-based):** HIGH CONFIDENCE — Razorpay provides payment receipts,
not GST tax invoices. TexQtic is responsible for issuing compliant tax invoices as the
registered supplier. This is a fundamental principle of India GST law (CGST Act Section 31)
and is consistent with standard Indian SaaS practice. This finding, if confirmed, would
mean Fallback-A or Fallback-B is REQUIRED regardless of Razorpay's specific API capabilities.

**Off-platform verification recommended:** MEDIUM priority — Paresh may wish to confirm
this with Razorpay support or CA to ensure no Razorpay-specific configuration changes
this analysis.

---

### VQ-06 — Invoice Number Series Controllable by Merchant

**Question:** What are the invoice numbering/series requirements? Can the merchant
define or prefix the invoice number series?

| Dimension | Assessment | Confidence | Basis |
|---|---|---|---|
| Razorpay subscription receipts use Razorpay-assigned reference numbers | YES — `payment_id`, `subscription_id`, `order_id` are Razorpay-assigned | HIGH | PRODUCT_KNOWLEDGE |
| Merchant-defined invoice number prefix in subscription receipts | LIKELY NOT — Razorpay subscription receipts use Razorpay's internal numbering; merchant prefix not a standard subscription feature | LOW | PRODUCT_KNOWLEDGE |
| India GST invoice number requirement | India GST invoices must use a consecutive serial number, unique per financial year, up to 16 characters — `INV-FY2526-001`, `INV-FY2526-002`, etc. | HIGH | India GST Rules (Rule 46) |
| Razorpay Invoice API — merchant-defined number | POSSIBLE — the Invoice API may allow more control over invoice reference; unconfirmed | LOW | PRODUCT_KNOWLEDGE |

**VQ-06 answer (knowledge-based):** LIKELY NOT SUPPORTED in standard subscription
receipts. Razorpay uses its own reference numbers; the India GST-required merchant invoice
numbering series would need to be maintained by TexQtic's invoice system (Fallback-A or B).

---

### VQ-07 — State-Based IGST vs. CGST+SGST Auto-Detection

**Question:** Does Razorpay support state-based GST split (IGST for inter-state,
CGST+SGST for intra-state) based on subscriber billing address?

| Dimension | Assessment | Confidence | Basis |
|---|---|---|---|
| Razorpay collects billing address during checkout | YES — billing address is collected for card network compliance and fraud detection | MEDIUM | PRODUCT_KNOWLEDGE |
| Razorpay auto-applies CGST/SGST vs. IGST per subscriber state | LIKELY NOT natively — this determination requires comparing the supplier's registered state (TexQtic's GST state) with the customer's billing state; Razorpay is not known to perform this automatically in subscription billing | LOW | PRODUCT_KNOWLEDGE |
| India GST rule for supply determination | Place of supply for SaaS to B2B customers = location of service recipient; for B2C = location of recipient. CGST+SGST applies if TexQtic's state = subscriber's state; IGST applies otherwise | HIGH | India IGST Act Section 12 + India GST Rules |
| Manual determination feasible for MVP | YES — at MVP volume (≤50 subscribers), TexQtic can determine IGST vs. CGST+SGST per subscriber at invoice generation time | MEDIUM | INDUSTRY_NORM |

**VQ-07 answer (knowledge-based):** LIKELY NOT AUTO-SUPPORTED. TexQtic's invoice system
(or accounting software under Fallback-B) must implement the state-of-supply logic.
Manual determination is feasible for MVP but must be automated before scale.

---

## 7. Razorpay Invoice / SAC Outcome Classification

### 7.1 Classification

**Outcome: UNVERIFIED**

No off-platform evidence (Dashboard screenshots, API test results, support ticket
confirmation) was obtained in this unit. All Razorpay documentation remains inaccessible
via automated fetch.

### 7.2 Knowledge-Based Lean

While formally UNVERIFIED, the knowledge-based analysis in §6 supports a lean toward
**NOT_SUPPORTED / PARTIAL_SUPPORT** with the following reasoning:

| Factor | Direction | Confidence |
|---|---|---|
| Razorpay subscription receipts = payment receipts, not Tax Invoices (VQ-05) | NOT_SUPPORTED for native GST Tax Invoice compliance | HIGH |
| SAC code in `notes` field does not propagate to invoices (VQ-02) | NOT_SUPPORTED for native SAC code propagation | MEDIUM |
| CGST/SGST breakdown not standard in subscription receipts (VQ-03) | NOT_SUPPORTED for native CGST/SGST breakdown | MEDIUM |
| GSTIN appears on receipts when configured (VQ-01 partial) | PARTIAL_SUPPORT for GSTIN display | MEDIUM |
| Invoice API may have more GST fields (VQ-04) | Possible PARTIAL_SUPPORT via hybrid architecture | LOW |
| State-based GST split not auto-detected (VQ-07) | NOT_SUPPORTED for native auto-detection | LOW |
| D2 §8.1 initial assessment: SAC/GST fields not customizable | NOT_SUPPORTED lean | MEDIUM |
| Indian SaaS industry norm: separate invoicing required | NOT_SUPPORTED for native compliance | HIGH |

**Summary lean:** PARTIAL_SUPPORT at best (GSTIN display), NOT_SUPPORTED for full India
GST Tax Invoice compliance in standard subscription receipt configuration.

### 7.3 What "UNVERIFIED" Means for This Unit

UNVERIFIED means: this unit cannot assert NATIVE_SUPPORT, PARTIAL_SUPPORT, or NOT_SUPPORTED
with formal evidence. The classification must remain UNVERIFIED until Paresh supplies
off-platform evidence. The knowledge-based lean above is provided as context only.

**Closure condition for RAZORPAY-INVOICE-SAC-VERIFICATION-001:**
1. Paresh runs a test subscription charge in Razorpay Dashboard (test mode)
2. Paresh examines the generated invoice/receipt and confirms whether it shows:
   SAC 998315, CGST/SGST or IGST breakdown, merchant GSTIN, sequential invoice number
3. If NOT (most likely outcome per knowledge-based lean): Paresh selects Fallback-A or B
4. CA confirms selected fallback before implementation gate is touched

---

## 8. Fallback Path Assessment

### 8.1 Fallback Options (Inherited from D3 §6.4)

| Fallback | Description | CA Required | Technical Complexity | Recommended for MVP |
|---|---|---|---|---|
| **Fallback-A** | Separate GST tax invoice series generated by TexQtic; Razorpay payment receipt cross-referenced by `payment_id` | YES — CA must review invoice template | MEDIUM — requires invoice generation subsystem (design unit) | YES — most scalable; most CA-acceptable |
| **Fallback-B** | Accounting software integration (Zoho Books, Tally, ClearTax); subscription events trigger invoice generation in accounting tool | YES — CA must confirm software selection and template | LOW for MVP with manual trigger; MEDIUM for automated webhook integration | YES — lowest immediate build cost if Zoho Books is already in use |
| **Fallback-C** | Manual CA-reviewed invoice series (PDF/Word template); Paresh generates manually per subscriber | YES — CA must approve template | VERY LOW — no code required | CONDITIONAL — acceptable only for ≤5 subscribers; hard sunset trigger required |

### 8.2 Recommended Fallback Path

Based on knowledge-based analysis and industry norms:

**Primary recommendation: Fallback-B (accounting software integration)**
- Rationale: Indian SaaS companies at MVP stage most commonly use Zoho Books or ClearTax
  for GST invoice generation triggered by payment events. This is the CA-standard approach.
  If TexQtic already uses or plans to use accounting software for GST filings, Fallback-B
  integrates naturally with that workflow.
- Implementation path: Razorpay `subscription.charged` webhook → accounting software API →
  tax invoice generated and emailed to subscriber. TexQtic stores `razorpay_payment_id` +
  accounting software invoice reference.
- MVP variant: Fallback-B with manual trigger (Paresh manually creates invoice in Zoho Books
  per subscription charge event) — acceptable for ≤20 subscribers with a clear automation
  trigger defined.

**Secondary recommendation: Fallback-A (TexQtic-generated invoice series)**
- Rationale: If TexQtic prefers a fully controlled invoice system (no external software),
  a custom invoice generation module is the long-term scalable solution.
- Implementation path: Subscription event → TexQtic invoice service → PDF invoice → email
  to subscriber. Requires a dedicated design unit (FTU-COMM-003 or similar).
- MVP variant: Only viable if Fallback-C handles the immediate gap while Fallback-A is
  designed.

**Do NOT recommend Fallback-C as anything other than interim:**
- Fallback-C is acceptable only for the first 1–5 paying subscribers (true MVP test).
- Hard sunset trigger must be defined: Fallback-C must be replaced before any self-serve
  upgrade path or public STARTER launch.

### 8.3 Fallback Selection Gate

**Paresh must:**
1. Select ONE fallback option (A, B, or C as interim)
2. Obtain CA confirmation of selected pathway and invoice template
3. This selection becomes the closure condition for PR-03-A (RAZORPAY-INVOICE-SAC-VERIFICATION-001)

**Status of fallback selection in this unit:** NOT_DECIDED — CA_DECISION_REQUIRED
No fallback has been formally selected. Paresh decision required in a future unit or
via explicit written direction.

---

## 9. PR-03 Impact

**PR-03 current status:** PARTIALLY_COMPLETE (unchanged)

PR-03 has three open items:

| Item | Description | D4 Impact |
|---|---|---|
| **PR-03-A** | Razorpay invoice SAC/GST field capability verification (RAZORPAY-INVOICE-SAC-VERIFICATION-001) | STILL OPEN — VQ-01 through VQ-07 remain formally UNVERIFIED; knowledge-based analysis provided; off-platform verification required from Paresh |
| **PR-03-B** | Invoice filing cadence (when must GST invoice be issued relative to subscription charge event?) | STILL OPEN — no new CA input; assessment: India GST requires invoice at time of supply (charge date) |
| **PR-03-C** | IGST vs CGST+SGST state-based split treatment | STILL OPEN — VQ-07 assessed as likely NOT auto-supported; manual or software-based split required |

**PR-03 closure path:**
1. Paresh completes off-platform VQ-01–VQ-07 verification (or confirms VQ-05 knowledge-based
   assessment with Razorpay support) — closes PR-03-A
2. CA advises on invoice issuance timing relative to subscription charge — closes PR-03-B
3. Fallback-A or B selected and CA-confirmed with state-based GST split logic — closes PR-03-C
4. All three items closed → PR-03 advances to COMPLETE

---

## 10. PR-08 Impact

**PR-08 current status:** PARTIALLY_COMPLETE (unchanged)

PR-08 has two open items:

| Item | Description | D4 Impact |
|---|---|---|
| **PR-08-A** | CA explicit authorization for public price display (current prices: STARTER ₹2,499/mo, PROFESSIONAL ₹4,999/mo) | STILL OPEN — no CA input received; prices remain provisional |
| **PR-08-B** | Annual price equivalents (required only when annual billing launches) | STILL OPEN — no annual billing decision |

**PR-08 closure path:** Requires explicit off-platform CA confirmation in a future unit.
Not within scope of FAM-13B-D4.

---

## 11. PR-04 through PR-07 Status

No new inputs were supplied for PR-04 through PR-07 in this unit. Status unchanged from D3.

| PR | Description | D3 Status | D4 Status | Change |
|---|---|---|---|---|
| **PR-04** | KYC operational start (Razorpay merchant account setup) | NOT_STARTED — authorization required | NOT_STARTED — authorization required | No change |
| **PR-05** | Refund and cancellation policy (D-021) | NOT_STARTED — worksheet provided | NOT_STARTED — Paresh decision required | No change |
| **PR-06** | PCI boundary design documentation | NOT_STARTED — checklist provided | NOT_STARTED — design unit required | No change |
| **PR-07** | Payment event audit/log policy | NOT_STARTED — checklist provided | NOT_STARTED — event names contract review required | No change |

**Note on PR-04:** The KYC checklist from D3 §7 remains the action scaffold. KYC operational
start is NOT authorized in this unit. A future unit or explicit Paresh direction is required.

---

## 12. Implementation Authorization Status

No change to implementation authorization. The following remains in full effect:

| Surface | Status |
|---|---|
| Razorpay SDK installation (any package) | ❌ NOT AUTHORIZED |
| Razorpay Subscriptions integration (any environment) | ❌ NOT AUTHORIZED |
| Payment route / checkout endpoint | ❌ NOT AUTHORIZED |
| Payment webhook endpoint | ❌ NOT AUTHORIZED |
| Razorpay Subscription plan creation (Dashboard) | ❌ NOT AUTHORIZED — PR-04 (KYC) not started |
| KYC merchant account setup | ❌ NOT AUTHORIZED — authorization required in future governance unit |
| Invoice issuance with SAC codes | ❌ NOT AUTHORIZED — RAZORPAY-INVOICE-SAC-VERIFICATION-001 UNVERIFIED; fallback not selected |
| Accounting software integration (Fallback-B) | ❌ NOT AUTHORIZED — fallback not yet selected and CA-confirmed |
| Invoice generation system (Fallback-A) | ❌ NOT AUTHORIZED — design unit required; not yet authorized |
| Price display on public surfaces | ❌ NOT AUTHORIZED — provisional; PR-08-A (CA pricing authorization) still open |
| Schema / migration changes for billing | ❌ NOT AUTHORIZED |
| Environment variable changes (Razorpay keys) | ❌ NOT AUTHORIZED |
| `components/Public/PublicSupplierProfile.tsx` | ❌ NOT STAGED — pre-existing modification outside scope |

**Implementation gate condition:** All §4.3 prerequisites (PR-01 through PR-08) must be
FULLY satisfied AND Paresh must issue explicit written implementation authorization.

---

## 13. Tracker / Register Updates

### 13.1 Files Updated in This Unit

| File | Update |
|---|---|
| `governance/control/NEXT-ACTION.md` | Active delivery unit updated to FAM-13B-D4 COMPLETE; last closed unit updated; next candidate updated to FAM-13B-D5 |
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | §4.4 D4 status block appended; next unit pointer updated to FAM-13B-D5 |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | §11 update history row added for D4 UNVERIFIED outcome |

### 13.2 Files NOT Updated (with Rationale)

| File | Reason not updated |
|---|---|
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | No family cycle status change. FAM-13B is not closing in this unit. No FAM cycle closed or advanced. |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-029 remains DESIGN_GATED. §4.3 prerequisites not satisfied; no status change warranted. |
| `governance/legal/fam-07/` | ABSENT. FAM-07 hold HOLD_FOR_HUMAN_LEGAL_INPUTS unchanged. No action. |
| All source files | No changes. No payment implementation authorized. |
| `server/prisma/schema.prisma` | No schema changes. |
| Any package.json / lockfile | No dependency changes. |

---

## 14. Recommended Next Unit

### FAM-13B-D5 — Razorpay Invoice Pathway Selection and CA Advisory

**Recommended scope:**

1. **Paresh completes off-platform VQ-01–VQ-07 verification** using the structured checklist
   from D3 §6.2 as a guide. Required evidence for each VQ: Dashboard screenshot or support
   ticket reference. This is a human-performed action — NOT an automated fetch.

2. **Record VQ findings** in FAM-13B-D5 artifact. Each VQ must be answered with:
   - Evidence type (Dashboard / API test / Support ticket)
   - Evidence reference (date, ticket ID, or screenshot description)
   - Answer (YES / NO / PARTIAL / NOT_AVAILABLE)
   - TexQtic requirement satisfied? (YES / NO / PARTIAL)

3. **Select invoice fallback option** based on VQ-01–VQ-07 findings:
   - If NATIVE_SUPPORT confirmed: obtain CA confirmation that Razorpay format satisfies
     all §4 requirements → close PR-03-A
   - If PARTIAL_SUPPORT: select Fallback-A or B; obtain CA confirmation → advance PR-03-A
   - If NOT_SUPPORTED: select Fallback-A, B, or C (interim) with CA sign-off → advance PR-03-A

4. **Obtain CA input on:**
   - Invoice issuance timing (PR-03-B)
   - State-based IGST/CGST+SGST policy for TexQtic's registered state (PR-03-C)
   - CA authorization for public price display, if Paresh wishes to advance PR-08-A
   - Invoice template approval for selected fallback option

5. **Optionally advance D-021** if Paresh supplies refund/cancellation policy decision
   (policy options presented in D3 §8).

6. **Optionally authorize PR-04 KYC start** if entity details confirmed (D3 §7.1).

**Gate to open FAM-13B-D5:** Paresh reviews FAM-13B-D4 UNVERIFIED finding and decides
whether to complete off-platform verification before next unit, or whether to proceed
directly with Fallback-B selection based on knowledge-based analysis.

**Note:** If Paresh accepts the knowledge-based lean (LIKELY NOT_SUPPORTED for native
Tax Invoice compliance) without additional off-platform verification, FAM-13B-D5 could
select Fallback-B directly and begin the CA advisory process. This is a valid path.

---

## 15. Residuals

| Residual | Description | Disposition |
|---|---|---|
| RAZORPAY-INVOICE-SAC-VERIFICATION-001 | VQ-01–VQ-07 formally UNVERIFIED (off-platform verification not yet completed by Paresh) | OPEN — requires Paresh off-platform verification; knowledge-based lean provided |
| PR-03-A | Razorpay invoice SAC/GST field verification | OPEN — closes when VQ-01–VQ-07 answered + fallback selected + CA-confirmed |
| PR-03-B | Invoice filing cadence per GST rules | OPEN — CA advisory required |
| PR-03-C | IGST vs CGST+SGST state-based treatment | OPEN — software or manual split required |
| PR-04 | KYC operational start not authorized | NOT_STARTED — authorization required |
| PR-05 | D-021 refund/cancellation policy not decided | NOT_STARTED — Paresh decision required |
| PR-06 | PCI boundary design not documented | NOT_STARTED — design unit required |
| PR-07 | Payment event audit/log policy not approved | NOT_STARTED — event names contract review required |
| PR-08-A | CA authorization for public price display | OPEN — CA advisory required |
| PR-08-B | Annual price equivalents | OPEN — required if annual billing launches |
| D-011 item 2 | Provisional prices not CA-confirmed for public display | PARKED — CA confirmation pending |
| D-011 item 7 | Feature entitlement scope per tier not supplied | PARKED — Paresh decision required |
| D-021 | Refund/cancellation policy not defined | PARKED — worksheet provided in D3 §8; Paresh decision required |
| D-022 | FREE pilot tenant upgrade invitation policy | PARKED — Paresh decision required |
| Fallback selection | No fallback option selected (Fallback-A / B / C) | NOT_DECIDED — CA_DECISION_REQUIRED |
| Invoice template | No invoice template approved by CA | NOT_STARTED — requires fallback selection first |
| FAM-07 legal hold | HOLD_FOR_HUMAN_LEGAL_INPUTS | Unchanged — no action authorized |
| FTU-COMM-002 trigger | All §4.3 prerequisites must be satisfied | PARKED — trigger condition not met |
| D-015 counsel review | Legal counsel sign-off on Razorpay operating agreement | Still open |

---

## 16. Final Enum

```
FAM_13B_D4_RAZORPAY_INVOICE_SAC_VERIFICATION_COMPLETE_UNVERIFIED
```

**Summary:** Razorpay Invoice SAC Verification unit COMPLETE. All Razorpay external
documentation remained inaccessible via automated fetch (15 URLs attempted; all
JavaScript-blocked, 404, or 504). No Paresh-supplied Dashboard or support evidence
provided. VQ-01 through VQ-07 formally UNVERIFIED. Knowledge-based analysis (§6) strongly
suggests Razorpay subscription receipts are payment receipts only and do NOT constitute
GST tax invoices under CGST Act Section 31 — consistent with D2 §8.1 initial assessment
and Indian SaaS industry norms. SAC code propagation to invoices LIKELY NOT SUPPORTED.
CGST/SGST breakdown LIKELY NOT NATIVELY SUPPORTED. State-based IGST/CGST+SGST auto-
detection LIKELY NOT SUPPORTED. Fallback-B (accounting software) or Fallback-A (TexQtic
invoice system) is the likely required path; selection requires Paresh decision and CA
confirmation. RAZORPAY-INVOICE-SAC-VERIFICATION-001 remains OPEN. PR-03 remains
PARTIALLY_COMPLETE (3 open items). PR-04 through PR-08 unchanged. No source, schema,
migration, or environment changes. No decisions advanced. Implementation gate remains
CLOSED. Recommended next unit: FAM-13B-D5 — Razorpay Invoice Pathway Selection and CA
Advisory.

---

## 17. Commit Hash

| Step | Commit Hash | Description |
|---|---|---|
| FAM-13B-D1 main | `9a7a1fbd` | Decision reconciliation artifact + 4 governance files |
| FAM-13B-D1 seal | `c7dbf5d7` | Seal commit — commit hash backfilled |
| FAM-13B-D1 hash propagation | `fe87916f` | Seal hash + NEXT-ACTION.md |
| FAM-13B-D2 main | `2f342bb9` | CA SAC confirmation artifact + governance file updates |
| FAM-13B-D2 seal | `dd5b2da1` | Seal hash backfilled |
| FAM-13B-D2 hash propagation | `e0777e8d` | Seal hash + NEXT-ACTION.md |
| FAM-13B-D3 main | `cf189ad0` | Payment prerequisite tracker artifact + governance files |
| FAM-13B-D3 seal | `6c2a6414` | Seal commit — main hash backfilled in NEXT-ACTION.md |
| FAM-13B-D4 main | *(TBD — backfill after commit)* | This artifact + governance file updates |
| FAM-13B-D4 seal | *(TBD — backfill after seal commit)* | Seal hash backfilled |
