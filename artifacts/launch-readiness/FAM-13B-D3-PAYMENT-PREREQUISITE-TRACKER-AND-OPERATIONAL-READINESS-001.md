# FAM-13B-D3-PAYMENT-PREREQUISITE-TRACKER-AND-OPERATIONAL-READINESS-001
## Payment Prerequisite Tracker and Operational Readiness Plan

**Unit ID:** FAM-13B-D3-PAYMENT-PREREQUISITE-TRACKER-AND-OPERATIONAL-READINESS-001
**Family:** FAM-13B — Razorpay Payment Architecture Decision Lock
**Mode:** TECS Safe Governance / Operational Readiness Tracking / No Implementation
**Date opened:** 2026-06-03
**Authorizing scope:** Operational readiness tracking only. Define prerequisite completion
paths for PR-04 through PR-07. Structure Razorpay invoice/SAC verification plan. Produce
refund/cancellation worksheet. Define PCI boundary checklist. Define payment event audit/log
policy checklist. No payment implementation authorized.
**Predecessor unit:** FAM-13B-D2-CA-SAC-CONFIRMATION-ADDENDUM-001 (COMPLETE, sealed
`dd5b2da1`, hash-propagated `e0777e8d`)

---

## 1. Unit Summary

### 1.1 Objectives

1. Document current prerequisite gate status (PR-01 through PR-08) as of FAM-13B-D3 opening
2. Define a structured completion path and evidence requirements for PR-04 through PR-07
3. Create RAZORPAY-INVOICE-SAC-VERIFICATION-001 structured verification plan: external
   verification questions, expected outcomes, fallback options if Razorpay lacks native
   SAC/GST invoice support
4. Produce Razorpay KYC Operational Checklist (PR-04 path: TexQtic company entity, documents
   required, test-vs-live mode distinction)
5. Produce Refund and Cancellation Policy Worksheet (D-021/PR-05 input scaffold)
6. Produce PCI Boundary Checklist (PR-06 path: hosted checkout only, no card data in
   TexQtic servers, token storage rules, webhook signature verification)
7. Produce Payment Event Audit/Log Policy Checklist (PR-07 path: event naming, retention,
   logging requirements)
8. Assess impact of this unit on D-011, D-020, D-021, D-022
9. Confirm implementation authorization status (unchanged: NOT AUTHORIZED)
10. Update governance files per repo pattern
11. Recommend next unit (FAM-13B-D4 — Razorpay Invoice SAC Verification)

### 1.2 Explicit Non-Scope

- Does NOT authorize any Razorpay integration, SDK installation, or payment implementation
- Does NOT authorize KYC operational start (entity decided; operational start requires a
  separate explicit authorization in a future unit)
- Does NOT implement any payment routes, webhooks, or frontend payment forms
- Does NOT modify schema, migrations, environment variables, or packages
- Does NOT change FAM-07 hold status (HOLD_FOR_HUMAN_LEGAL_INPUTS unchanged)
- Does NOT close any D-021 or D-022 items (no new founder decisions supplied in this unit)
- Does NOT constitute legal or tax advice — records operational readiness scaffolding only
- Does NOT fetch live Razorpay API data — verification plan is structured for off-platform
  execution by Paresh

---

## 2. Preflight Results

**Run date:** 2026-06-03

| Check | Expected | Observed | Result |
|---|---|---|---|
| `git status --short` | Clean (no modified files) | (empty — clean) | ✅ CLEAN |
| `git rev-parse --short HEAD` | `e0777e8d` | `e0777e8d` | ✅ MATCH |
| FAM-13B-D2 main commit `2f342bb9` | ancestor of HEAD | exit:0 (confirmed) | ✅ ANCESTOR |
| FAM-13B-D2 seal commit `dd5b2da1` | ancestor of HEAD | exit:0 (confirmed) | ✅ ANCESTOR |
| FAM-13B-D2 hash-propagation `e0777e8d` | = HEAD | = HEAD | ✅ HEAD |
| `governance/legal/fam-07/` directory | ABSENT | `Test-Path` → `False` | ✅ ABSENT — FAM-07 hold preserved |
| Razorpay / SAC codes in source files | ABSENT | 0 matches in all source/config | ✅ ABSENT |

**Preflight verdict:** ALL CHECKS PASS. Safe to proceed with FAM-13B-D3 execution.

**Note: pre-existing unstaged `M: components/Public/PublicSupplierProfile.tsx` confirmed in
NEXT-ACTION.md. This file was NOT staged and is NOT part of this unit.**

---

## 3. Evidence Reviewed

### 3.1 Repository Governance Files

| File | Lines Read | Key Evidence |
|---|---|---|
| `governance/control/NEXT-ACTION.md` | 1–120 | Active unit = FAM-13B-D2 COMPLETE; next candidate = FAM-13B-D3 NOT_YET_OPENED; FAM-07 hold HOLD_FOR_HUMAN_LEGAL_INPUTS preserved; PR-04–PR-07 NOT_STARTED confirmed; implementation gate CLOSED |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | 380–700+ | D-011/D-012/D-015/D-019/D-020/D-021/D-022 full statuses confirmed; D-022 PARKED — PARTIALLY_SUPPLIED (downgrade confirmed; upgrade invitation not defined) |
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | §4.3–§4.4 (lines 160–214) | Full §4.3 prerequisite text confirmed (7 items → mapped to PR-01 through PR-08); §4.4 updated per D2; CLOSED implementation gate confirmed; next unit FAM-13B-D3 recorded |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | §13 (lines 230–234), §11 update history (lines 186–187) | FTU-COMM-001 PARKED POST_MVP; FTU-COMM-002 PARKED D-015_RESOLVED (trigger = all §4.3 prerequisites satisfied); all 5 FTU-COMM entries confirmed; D2 history row confirmed |
| `artifacts/launch-readiness/FAM-13B-D2-CA-SAC-CONFIRMATION-ADDENDUM-001.md` | Full (1–430) | PR-01/PR-02 COMPLETE; PR-03/PR-08 PARTIALLY_COMPLETE; PR-04–PR-07 NOT_STARTED; D-011 item 4 CA_CONFIRMED; D-012 item 4 CA_CONFIRMED_PARTIAL; RAZORPAY-INVOICE-SAC-VERIFICATION-001 risk documented in §8; D-021/D-022 PARKED unchanged |

### 3.2 Source Code Inspection

| Scope | Search | Result |
|---|---|---|
| `server/src/**` | Razorpay, SAC codes, payment routes, webhook | 0 matches in payment context. Only TTP GST verification constants (supplier GST compliance status — unrelated to payment processing). |
| Workspace-wide | `razorpay`, `998315`, `998599`, `998311` | Found only in governance artifacts and `DECISION-PARKING-LOT.md`. Zero matches in source, config, or package files. |

**Source confirmation:** Payment / Razorpay implementation is ABSENT from ALL source files.
No cleanup required. No accidental implementation present.

### 3.3 External Documentation — Razorpay

**Fetch status:** Razorpay documentation at `razorpay.com/docs/*` requires JavaScript
rendering and was not accessible via automated fetch during this governance unit.
The external verification plan (§6 below) is therefore structured as a formal off-platform
verification checklist that Paresh must execute directly via Razorpay Dashboard, API
sandbox, and Razorpay support channel.

**Research basis used:** Research note from FAM-13B-D2 §8.1 (confirmed during D2 repo-truth
inspection) — noting that Razorpay Subscription / Invoice API endpoints may not natively
support SAC/HSN code fields or IGST/CGST/SGST breakdown in all configurations.

**Known Razorpay architecture facts (from product knowledge, not verified via live fetch):**

| Surface | Fact | Verification Status |
|---|---|---|
| Razorpay Subscriptions | Supports `plan_id`, `quantity`, `notes` (key-value metadata), `customer_notify` | KNOWN — not live-verified |
| Razorpay `notes` field | Up to 15 key-value pairs; present on subscription, plan, payment, order objects | KNOWN — not live-verified |
| Razorpay hosted checkout (Standard Checkout / Subscription Checkout) | Card data processed entirely on Razorpay servers; TexQtic servers never receive card number, CVV, or expiry | KNOWN — standard Razorpay architecture |
| PCI scope for hosted checkout | TexQtic qualifies for PCI SAQ A (not SAQ D) because no cardholder data flows through TexQtic servers | KNOWN — not formally verified for TexQtic merchant config |
| Razorpay webhook signature | HMAC-SHA256 using webhook secret + request body; `X-Razorpay-Signature` header | KNOWN — standard Razorpay webhook verification protocol |
| Razorpay subscription webhooks | `subscription.charged`, `subscription.activated`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, `subscription.pending`, `subscription.authenticated`, `payment.captured`, `payment.failed` | KNOWN — not live-verified for current merchant account |
| Razorpay GST Dashboard integration | Razorpay Dashboard allows GSTIN entry for merchant account; may auto-populate GST on payment receipts | KNOWN — whether SAC/HSN code can be included on invoices is UNVERIFIED |
| Razorpay Invoice API (`/v1/invoices`) | Separate product from Subscription billing; supports description, GST fields | KNOWN — applicability to SaaS subscription billing is UNVERIFIED |

**Verification obligation:** All items marked `UNVERIFIED` above MUST be verified by Paresh
in FAM-13B-D4 before any invoice implementation can proceed. See §6 below.

---

## 4. Current Gate Status (as of FAM-13B-D3 opening)

The following PR matrix reflects the status as of FAM-13B-D3. No status changes are made
in this unit; this is a tracking and planning document only.

| PR | Prerequisite (§4.3 mapping) | Blocks | Status as of D3 | Change in D3 |
|---|---|---|---|---|
| PR-01 | Merchant-of-record entity confirmed (SaaS scope: TexQtic entity) | Entire payment integration | ✅ **COMPLETE** | None |
| PR-02 | Settlement model: SaaS separate from marketplace; single-entity collection | Entire payment integration | ✅ **COMPLETE** | None |
| PR-03 | India CA engagement / GST-TDS advisory: SAC code + GST rate + exclusive display rule; invoice filing cadence; IGST/CGST+SGST state split | Invoice implementation; GST-compliant billing | ⚠️ **PARTIALLY_COMPLETE** (advances D2) | None — tracking only |
| PR-04 | Razorpay KYC: TexQtic company merchant account, GSTIN/PAN, business category | Test mode setup; all payment integration | ❌ **NOT_STARTED** — entity decided; operational start NOT yet authorized | Checklist provided §7 |
| PR-05 | Refund and cancellation policy (D-021) | Live mode; dispute handling; terms display | ❌ **NOT_STARTED** | Worksheet provided §8 |
| PR-06 | PCI boundary design: hosted checkout only; no card data in TexQtic servers; token storage rules; webhook signature verification | All payment integration | ❌ **NOT_STARTED** | Checklist provided §9 |
| PR-07 | Payment event audit/log policy: event names; retention; compliance trail | All payment integration | ❌ **NOT_STARTED** | Checklist provided §10 |
| PR-08 | Pricing finalized (INR) + CA explicit authorization for public display | Public price display; STARTER tier launch | ⚠️ **PARTIALLY_COMPLETE** | None — tracking only |

**Gate summary as of FAM-13B-D3 opening:**

| Status | PRs |
|---|---|
| ✅ COMPLETE (2 of 8) | PR-01, PR-02 |
| ⚠️ PARTIALLY_COMPLETE (2 of 8) | PR-03, PR-08 |
| ❌ NOT_STARTED (4 of 8) | PR-04, PR-05, PR-06, PR-07 |

**IMPLEMENTATION GATE: CLOSED. Implementation is NOT authorized. 6 of 8 prerequisites are
not fully satisfied. No change to this status in this unit.**

### 4.1 PR-03 Open Items (Remaining Path to COMPLETE)

PR-03 is PARTIALLY_COMPLETE (advanced from CONFLICTING_EVIDENCE in D2). Remaining items
required for full PR-03 closure:

| Open Item | Description | Required Action | Owner |
|---|---|---|---|
| PR-03-A | Razorpay invoice SAC/GST field capability | Verify whether Razorpay Subscription invoices / receipts can carry SAC 998315, 18% GST breakdown per CA-confirmed display rule | Paresh — off-platform via Razorpay Dashboard + support. See §6. |
| PR-03-B | Invoice filing cadence per GST rules | Confirm: when must a GST-compliant invoice be issued relative to subscription charge? (within X days of payment?); confirm whether Razorpay-generated receipt substitutes for tax invoice or whether a separate invoice series is required | CA confirmation required (off-platform advisory) |
| PR-03-C | IGST vs CGST+SGST state-based split | Confirm treatment: when subscriber is outside supplier state, which GST split applies? Does TexQtic's registered state determine CGST+SGST vs IGST? Does Razorpay auto-split or does TexQtic need to detect subscriber state? | CA + Razorpay configuration verification |

### 4.2 PR-08 Open Items (Remaining Path to COMPLETE)

| Open Item | Description | Required Action | Owner |
|---|---|---|---|
| PR-08-A | CA explicit authorization for public price display | CA must explicitly confirm that provisional prices (STARTER ₹2,499/mo, PROFESSIONAL ₹4,999/mo) are authorized for display on the public pricing page | Paresh — off-platform CA advisory |
| PR-08-B | Annual price equivalents | If annual billing cycle launches: annual STARTER and PROFESSIONAL prices must be CA-reviewed | Paresh — to be supplied as part of D-011 item 2 full resolution |

---

## 5. Remaining Prerequisite Tracker — Detailed Evidence Requirements

### PR-04: Razorpay KYC and Business Account Setup

**Description:** TexQtic company entity must complete Razorpay merchant KYC before any
Razorpay integration can proceed (even test mode). KYC is an off-platform Razorpay
onboarding activity — not a code or schema change.

**Decision:** Entity confirmed as TexQtic company entity (D-015 / D-020 founder decision, FAM-13B-D1).
**Operational start:** NOT YET AUTHORIZED — requires explicit authorization in a future unit.
**Mode distinction:** Test mode KYC = same entity as live mode; Razorpay issues test API keys
after basic KYC. Live mode requires full KYC completion and Razorpay account activation.

| Evidence Required for PR-04 COMPLETE | Type | Platform |
|---|---|---|
| Razorpay merchant account created for TexQtic entity | Off-platform Razorpay onboarding | Razorpay Dashboard |
| Business PAN (company entity) submitted | KYC document | Razorpay Dashboard |
| GSTIN submitted and verified | KYC document | Razorpay Dashboard |
| Business category selected (Software / SaaS / Internet) | KYC configuration | Razorpay Dashboard |
| Test API key pair (`key_id` and `key_secret`) issued | API credential | Razorpay Dashboard → `.env` (TexQtic secure storage) |
| Bank account for settlement submitted (for live mode) | KYC document | Razorpay Dashboard |
| Razorpay account activation complete (for live mode) | Razorpay review + approval | Razorpay Dashboard |
| KYC completion status recorded in governance artifact | Governance evidence | FAM-13B-D4 artifact |

**Blocks test mode:** Yes — test API keys require account creation (even if not fully KYC'd
for live mode, a Razorpay account must exist).
**Blocks live mode:** Yes — full KYC including PAN, GSTIN, bank account required.
**Off-platform action required:** Yes — Paresh must create Razorpay account at razorpay.com.
**Implementation required:** No code changes until PR-04 is complete AND implementation
is authorized.

### PR-05: Refund and Cancellation Policy

**Description:** The refund and cancellation policy for SaaS subscription billing must be
defined (D-021) before any live payment processing begins. Policy decisions are off-platform
founder decisions; once decided, the policy affects UI copy (terms display), backend refund
flow design, and Razorpay refund API usage.

**See §8 (Refund/Cancellation Policy Worksheet) for the structured decision scaffold.**

| Evidence Required for PR-05 COMPLETE | Type | Source |
|---|---|---|
| D-021 fully resolved: Paresh defines refund/cancellation policy | Founder decision document | Off-platform (Paresh + CA/counsel advisory) |
| CA/counsel review of India SaaS refund obligations (if applicable) | Professional advisory | Off-platform CA/counsel engagement |
| Policy text approved for terms display | Legal copy | External legal review |
| Policy design unit (handling refund flows in Razorpay, cancellation API calls, subscriber state) | Design governance unit | FAM-13B sub-unit or FTU-COMM-002 |

**Blocks test mode:** No — test mode integration can proceed without a live refund policy.
**Blocks live mode:** Yes — required before any real subscriber is charged.

### PR-06: PCI Boundary Design

**Description:** TexQtic must formally confirm its PCI scope boundary and document that no
card data flows through TexQtic servers. This is a design/compliance declaration — not a
code change — to be completed before integration.

**See §9 (PCI Boundary Checklist) for the structured checklist.**

| Evidence Required for PR-06 COMPLETE | Type | Source |
|---|---|---|
| Formal documentation that Razorpay Hosted Checkout is used (no TexQtic-side card form) | Architecture decision record | FAM-13B design unit |
| Confirmation that TexQtic servers never receive card number, CVV, or expiry | Architecture decision record | FAM-13B design unit |
| Razorpay payment token (payment_id) storage rule defined | Design decision | FAM-13B design unit |
| Webhook signature verification protocol defined (HMAC-SHA256 required) | Security design | FAM-13B design unit |
| No Razorpay API keys stored in source code or git history | Security check | Code review gate |
| PCI SAQ scope classification confirmed (SAQ A or SAQ A-EP) | Compliance declaration | Self-assessment or merchant advisor |

**Blocks test mode:** Partially — webhook secret must be handled securely from day one.
**Blocks live mode:** Yes — PCI boundary confirmation required before real card transactions.

### PR-07: Payment Event Audit/Log Policy

**Description:** Payment events must be recorded in the TexQtic event system; a compliance
audit trail must be defined before gateway integration. This is a design policy decision
that precedes implementation.

**See §10 (Payment Event Audit/Log Policy Checklist) for the structured checklist.**

| Evidence Required for PR-07 COMPLETE | Type | Source |
|---|---|---|
| Proposed payment event names approved (per event-names governance contract) | Governance decision | FAM-13B design unit + `shared/contracts/event-names.md` review |
| Retention period for payment events defined (e.g., 7 years for India GST compliance) | Policy decision | Paresh + CA advisory |
| PII/sensitive data fields excluded from payment event logs (no card data, no full token) | Security policy | Design decision |
| Razorpay webhook payload storage policy defined (store order_id/payment_id only vs. full payload) | Design decision | FAM-13B design unit |
| Audit trail format confirmed (event store vs. separate audit table vs. immutable log) | Design decision | FAM-13B design unit |
| Access control for payment audit records (who can query payment events) | Security design | FAM-13B design unit |

**Blocks test mode:** No — audit policy can be defined concurrent with test mode setup.
**Blocks live mode:** Yes — audit trail required for regulatory compliance before live billing.

---

## 6. Razorpay Invoice / SAC Verification Plan

**Risk ID:** RAZORPAY-INVOICE-SAC-VERIFICATION-001 (carried forward from FAM-13B-D2 §8)
**Risk level:** HIGH — potentially blocking for GST-compliant invoice issuance via Razorpay
**Status:** OPEN — unresolved as of FAM-13B-D3
**Blocking condition:** HARD PREREQUISITE for invoice implementation (PR-03-A)

### 6.1 Background

FAM-13B-D2 §8 documented that Razorpay API documentation (at the time of D2 research)
indicated SAC/HSN codes and IGST/CGST/SGST breakdown fields may not be natively customizable
via the Razorpay Subscription or Invoice API endpoints in all configurations. This risk
must be formally verified before any invoice design proceeds.

During FAM-13B-D3 execution, Razorpay's external documentation was not accessible via
automated fetch (JavaScript rendering required). The verification plan is therefore structured
as a formal off-platform checklist for Paresh to execute.

### 6.2 Structured Verification Checklist — Off-Platform Actions for Paresh

**Platform:** Razorpay Dashboard (razorpay.com/dashboard) + Razorpay API documentation
**Mode:** Read-only investigation and support inquiry — NOT implementation

| # | Verification Question | Where to Check | Expected Outcome (if supported) | Fallback (if not supported) |
|---|---|---|---|---|
| VQ-01 | Does Razorpay Subscriptions allow GSTIN entry for the TexQtic merchant account, and does this auto-populate GST amount on subscription invoices/receipts? | Razorpay Dashboard → Account Settings → Tax Settings / GST Settings | GSTIN visible; subscription receipts show GST amount automatically | Fallback-A (see §6.4) |
| VQ-02 | Can the SAC code (`998315`) be embedded in subscription plan or subscription object metadata (via the `notes` field or a dedicated HSN/SAC field)? | Razorpay Dashboard → Subscriptions → Create Plan → Notes/Metadata; Razorpay API docs → `/v1/plans` POST body | `notes.sac_code = "998315"` propagates to invoice/receipt | Fallback-B (see §6.4) |
| VQ-03 | Does the Razorpay subscription invoice/receipt show: base price, GST rate (18%), CGST+SGST or IGST breakdown, and SAC code — in a format acceptable for India GST compliance? | Razorpay Dashboard → Test subscription → View generated invoice/receipt | Subscription invoice shows all required GST fields | Fallback-A (see §6.4) |
| VQ-04 | Does the Razorpay Invoices API (`/v1/invoices`) support SAC/HSN code and IGST/CGST/SGST breakdown fields, and can it be used alongside Subscription billing for tax invoice generation? | Razorpay API docs → `/v1/invoices`; Razorpay Dashboard → Invoices product | Invoice API supports `tax_rates`, `hsn_code`, CGST/SGST/IGST split | Fallback-B or C (see §6.4) |
| VQ-05 | What is Razorpay's official India GST compliance position for subscription SaaS invoices? Does Razorpay provide a GST-compliant tax invoice, or only a payment receipt? | Razorpay support channel / Razorpay tax FAQ / Razorpay India GST documentation | Razorpay confirms tax invoice support for India GST SaaS billing | Fallback-A (see §6.4) |
| VQ-06 | What are the invoice numbering/series requirements for Razorpay-generated invoices? Can the invoice number series be controlled or prefixed by the merchant? | Razorpay Dashboard → Invoice settings; Razorpay support | Merchant can define invoice prefix; sequential numbering confirmed | Separate series needed (Fallback-A or B) |
| VQ-07 | For IGST vs CGST+SGST: does Razorpay support state-based GST split based on subscriber's billing address state? Or is a flat rate applied? | Razorpay Dashboard → Tax Settings; Razorpay support | Razorpay auto-detects subscriber state and applies correct split | Manual split required (Fallback-B or C) |

### 6.3 Verification Evidence Required for Risk Closure

RAZORPAY-INVOICE-SAC-VERIFICATION-001 is closed only when ALL of the following are documented
in a dedicated governance unit (FAM-13B-D4):

1. Answer to each VQ-01 through VQ-07 above (with Dashboard screenshot reference or support
   ticket reference number)
2. Formal determination: NATIVE_SUPPORT, PARTIAL_SUPPORT, or NOT_SUPPORTED
3. If NATIVE_SUPPORT: CA confirmation that Razorpay's GST display format satisfies the
   CA-confirmed requirements (SAC 998315, 18% GST, exclusive display rule, IGST/CGST+SGST
   per CA-confirmed filing cadence)
4. If PARTIAL_SUPPORT or NOT_SUPPORTED: one of the three fallback options selected and
   CA-reviewed (see §6.4)

### 6.4 Fallback Options (if Razorpay does not provide native GST-compliant tax invoices)

**Fallback-A: Separate GST tax invoice series (generated outside Razorpay)**
- TexQtic generates a separate GST-compliant tax invoice for each subscription charge event
- Invoice carries: SAC 998315, 18% GST (CGST+SGST or IGST as applicable), invoice number,
  invoice date, subscriber GSTIN (if provided), TexQtic GSTIN, billing period
- Razorpay payment receipt (with payment_id) cross-references the tax invoice
- Invoice is generated by TexQtic billing service or accounting software integration
- **CA review required before selecting this option**
- **Technical implication:** Requires an invoice generation subsystem (future design unit)

**Fallback-B: Accounting software integration (e.g., Zoho Books, Tally, ClearTax)**
- Razorpay subscription events trigger invoice generation in a connected accounting/GST
  software
- Accounting software generates GST-compliant tax invoice and emails to subscriber
- TexQtic stores the accounting system invoice reference alongside the Razorpay payment_id
- **CA review required before selecting this option**
- **Technical implication:** Requires Razorpay → accounting software webhook/API integration

**Fallback-C: Manual CA-reviewed invoice series (MVP only, low volume)**
- For early test-mode or first-subscriber live mode only
- Paresh or operator manually generates a GST-compliant invoice for each subscriber
  using a CA-reviewed invoice template (Word/PDF)
- Not scalable; acceptable only for initial proof-of-concept live mode with ≤5 paying subscribers
- **CA sign-off on template required**
- **Sunset trigger:** Must be replaced by Fallback-A or B before any public STARTER tier
  launch or self-serve upgrade flow activation

**Fallback selection gate:** Paresh must select one fallback option (with CA confirmation)
before any invoice implementation proceeds. This selection becomes PR-03 item (a) closure.

---

## 7. Razorpay KYC Operational Checklist (PR-04)

**Status:** NOT_STARTED — entity decided (TexQtic company entity, D-015/FAM-13B-D1)
**Operational start authorization:** NOT YET AUTHORIZED — requires explicit Paresh
direction in a future governance unit (FAM-13B-D4 or a dedicated PR-04 authorization unit)
**Note on timing:** KYC can be started in parallel with other prerequisite work. It does not
require PR-03, PR-05, PR-06, or PR-07 to be complete first. However, no code can be written
until all §4.3 prerequisites are satisfied.

### 7.1 Pre-KYC Confirmation (Required Before Starting)

| Item | Required | Status |
|---|---|---|
| Confirm entity: private limited company (not proprietorship or LLP) | Paresh to confirm exact company structure | OPEN — entity type not documented |
| Confirm GSTIN for TexQtic entity | Paresh to confirm GSTIN availability | OPEN — not documented in governance files |
| Confirm PAN for TexQtic company entity | Paresh to confirm company PAN | OPEN — not documented in governance files |
| Confirm registered business address | Paresh to confirm | OPEN |
| Confirm bank account in company name for settlement | Paresh to confirm | OPEN |
| Confirm authorized signatory for Razorpay onboarding | Paresh (as founder/director) | OPEN — assumed Paresh but not documented |

### 7.2 KYC Onboarding Steps — Razorpay Dashboard

| Step | Action | Documents Required | Mode |
|---|---|---|---|
| 1 | Create Razorpay account at razorpay.com | Email + phone OTP | Test + Live |
| 2 | Select business type: Private Limited Company | Company incorporation docs | Test + Live |
| 3 | Submit company PAN | PAN card scan | Test + Live |
| 4 | Submit GSTIN | GST registration certificate | Test + Live |
| 5 | Submit Certificate of Incorporation | MCA registration certificate | Live only |
| 6 | Submit directors PAN and Aadhaar | Director's identity documents | Live only |
| 7 | Submit registered business address proof | Utility bill / bank statement | Live only |
| 8 | Submit bank account details for settlement | Cancelled cheque or bank statement | Live only |
| 9 | Business category selection | "Software" / "SaaS" / "Internet" category | Test + Live |
| 10 | Razorpay review and account activation | Razorpay internal review | Live only |
| 11 | Retrieve test API key pair (`key_id`, `key_secret`) | Razorpay Dashboard → API Keys | After account creation |
| 12 | Store API keys securely in `.env` (NEVER in source code) | — | Both |

### 7.3 Post-KYC Governance Evidence

Once KYC is complete, the following must be documented in the relevant FAM-13B sub-unit:

| Evidence Item | What to Record (NO SECRETS) |
|---|---|
| Razorpay account created | Date + account ID (public ID only — not keys) |
| Test mode activated | Confirmation that test API keys were generated |
| Business category confirmed | Category name as shown in Razorpay Dashboard |
| GSTIN submitted | Date submitted (value REDACTED in governance docs) |
| PR-04 status | Updated to COMPLETE in prerequisite tracker |

**Security rule:** API keys (`key_id`, `key_secret`) MUST NOT be stored in any governance
artifact, git repository, markdown file, or commit. They belong in `.env.local` or a
secrets manager only.

---

## 8. Refund and Cancellation Policy Worksheet (D-021 / PR-05)

**Decision ID:** D-021 — SaaS Subscription Refund and Cancellation Policy
**Current status:** PARKED — NOT_STARTED
**Gate:** Required before live mode. Test mode unaffected.

This worksheet presents the decision options that Paresh must select from (with CA/counsel
advisory as needed). This unit does NOT supply any new D-021 decisions — that requires a
separate founder input or future governance unit.

### 8.1 Refund Policy Options

**Context:** When a subscriber requests a refund mid-billing-period, TexQtic must have a
defined policy. India SaaS has no mandatory refund obligation (unlike goods), but a clear
policy reduces disputes and builds subscriber trust.

| Policy Option | Description | Tradeoffs |
|---|---|---|
| **Option R-1: No refunds** | Subscription fees are non-refundable once charged. Cancellation stops future charges only. | Simple to implement; higher dispute risk with subscribers; common for B2B SaaS |
| **Option R-2: Prorated refund** | Refund the unused portion of the billing period (days remaining / total days × amount). | Subscriber-friendly; requires refund calculation logic; Razorpay Refunds API call required |
| **Option R-3: 30-day money-back guarantee** | Full refund if cancelled within 30 days of STARTER first charge. No refund thereafter. | High trust for new customers; implementation: check if within 30-day window; Razorpay full refund API |
| **Option R-4: Case-by-case manual review** | Refund decisions made by Paresh/operator manually per case. No automatic policy. | Low implementation complexity; not scalable; acceptable for MVP with <20 subscribers |

**Paresh must select one option (or a combination with defined rules).**

### 8.2 Cancellation Policy Options

**Context:** When a subscriber cancels, what happens to their access?

| Policy Option | Description | Implementation Notes |
|---|---|---|
| **Option C-1: Cancel at period end** | Subscription remains active until current billing period ends; no further charges after cancellation. | Standard SaaS; Razorpay `cancel_at_end` flag; subscriber retains access until expiry date |
| **Option C-2: Cancel immediately** | Subscription and access terminated immediately on cancellation. No refund for unused period. | Simple; lower subscriber trust; not common for B2B SaaS |
| **Option C-3: Cancel at period end + grace period** | Subscription terminates at period end; 3-day grace window for data export (aligned with non-payment grace period from D-011 item 5). | Most subscriber-friendly; requires grace state in TenantPlan logic |

**Recommendation (design only — not decided):** Option C-1 is the standard B2B SaaS
pattern and aligns best with the D-011 item 5 confirmed grace period of 3 days.

### 8.3 Annual Plan Refund Policy

**Context:** If annual billing launches, refund policy for annual plans must be separately
defined (partial-year refunds are complex).

| Policy Option | Description |
|---|---|
| **Option A-1: No refunds on annual plans** | Annual plan is non-refundable; subscriber may cancel to prevent auto-renewal only. |
| **Option A-2: Prorated annual refund** | Unused months refunded at monthly equivalent rate. Requires monthly rate calculation against annual price. |
| **Option A-3: Annual refunds for first 30 days only** | Full refund window of 30 days from annual plan start; non-refundable thereafter. |

### 8.4 Dispute / Chargeback Handling

**Dispute handling is distinct from voluntary refunds.** A subscriber may file a payment
dispute / chargeback with their bank or card issuer. Policy required:

| Item | Decision Required |
|---|---|
| Internal dispute escalation path | Who reviews disputes? (Paresh at MVP) |
| Razorpay dispute response protocol | What documentation is submitted to Razorpay in response to a dispute? (invoice, terms, delivery evidence) |
| Dispute provisioning window | How quickly does TexQtic respond to Razorpay dispute requests? (Razorpay typically gives 7–15 days) |
| Dispute reserve policy | Does TexQtic maintain a dispute reserve? Razorpay may hold disputed amount pending resolution. |

### 8.5 D-021 Closure Requirements

D-021 is CLOSED only when ALL of the following are documented:

1. Paresh selects refund policy option (R-1 through R-4 or hybrid)
2. Paresh selects cancellation policy option (C-1 through C-3)
3. Paresh selects annual plan refund policy (A-1 through A-3) — if annual billing launches
4. Dispute handling protocol defined
5. CA/counsel confirmation that selected policy satisfies India SaaS regulatory obligations
6. Policy text approved for display on terms/pricing page
7. Policy recorded in governance artifact and D-021 status updated to RESOLVED

---

## 9. PCI Boundary Checklist (PR-06)

**Architecture premise:** TexQtic will use Razorpay Hosted Checkout (Standard Checkout or
Subscription Checkout) exclusively. Card data is processed entirely on Razorpay's servers.

### 9.1 Confirmed PCI Boundary Rules

These rules apply to ALL payment integration work from day one. They are non-negotiable
and must be verified in any future design or implementation unit:

| Rule | Description | Enforcement |
|---|---|---|
| **PCI-01: No card form in TexQtic** | TexQtic UI must NOT contain a card number, CVV, or expiry input field. All card entry happens in the Razorpay Hosted Checkout layer (iframe or redirect). | Code review gate — any PR containing `<input type="text">` near payment UI must be reviewed against this rule |
| **PCI-02: No card data in TexQtic server** | TexQtic backend server must NOT receive, log, or store card number, CVV, expiry, or cardholder name. Only `payment_id`, `subscription_id`, `order_id`, `amount`, `status` are permitted on the TexQtic side. | Backend review gate — webhook handler must be audited for PII logging |
| **PCI-03: No card data in logs** | TexQtic server logs (Fastify request logs, error logs, event logs) must NEVER contain card data. Webhook payloads must be sanitized before logging. | Logging middleware review |
| **PCI-04: Webhook signature verification mandatory** | ALL Razorpay webhook payloads received at TexQtic backend MUST be verified with HMAC-SHA256 signature using the Razorpay webhook secret before any processing. Unverified payloads must be rejected with 400. | Code review gate — mandatory in webhook handler implementation |
| **PCI-05: API key storage** | Razorpay `key_id` and `key_secret` MUST be stored in environment variables only. Never hardcoded, never in source code, never in git history. | Pre-commit check |
| **PCI-06: Webhook secret storage** | Razorpay webhook secret MUST be stored in an environment variable only. Never logged or echoed. | Pre-commit check |
| **PCI-07: Token storage rule** | If Razorpay tokenizes a card (for subscription renewal), the Razorpay token reference may be stored. The actual card data it represents must never be stored or derivable from TexQtic records. | Design decision |
| **PCI-08: HTTPS only** | All Razorpay callback, redirect, and webhook endpoints in TexQtic must operate over HTTPS in production. | Infrastructure check (Vercel enforces HTTPS by default) |

### 9.2 PCI Scope Classification

| Classification | Applies to TexQtic? | Basis |
|---|---|---|
| **PCI SAQ A** (card data fully outsourced; no TexQtic card form) | YES — if hosted checkout only | Razorpay handles all card entry; TexQtic only sees payment_id |
| **PCI SAQ A-EP** (partially outsourced; TexQtic page initiates checkout) | Possible if Standard Checkout JS is embedded in TexQtic page | Razorpay's Standard Checkout uses a Razorpay-hosted payment modal |
| **PCI SAQ D** (full processing) | NO — explicitly excluded by PCI-01/PCI-02 rules above | TexQtic must never reach SAQ D scope |

**Formal PCI scope confirmation** (that TexQtic qualifies for SAQ A or SAQ A-EP and not
SAQ D) is a required evidence item for PR-06 COMPLETE.

### 9.3 PR-06 Evidence Required for COMPLETE

| Evidence Item | Source |
|---|---|
| Architecture decision record: hosted checkout only; no card form in TexQtic | FAM-13B design unit |
| PCI-01 through PCI-08 rules acknowledged and recorded | FAM-13B design unit |
| PCI scope classification confirmed (SAQ A or SAQ A-EP) | Self-assessment or merchant advisor |
| Webhook signature verification design documented | FAM-13B design unit |
| API key and webhook secret storage strategy documented | FAM-13B design unit |
| No card data in logging policy documented | FAM-13B design unit |

---

## 10. Payment Event Audit / Log Policy Checklist (PR-07)

**Context:** §4.3 item 5 requires payment events to be recorded in the event system with
a defined audit trail before gateway integration. This section defines the policy scaffold.

### 10.1 Proposed Payment Event Names

Per `shared/contracts/event-names.md` naming convention, the following event names are
proposed for the payment track. These are PROPOSALS only — must be reviewed against the
event-names governance contract and approved in a future design unit.

| Event Name (Proposed) | Trigger | Payload Fields (proposed minimum) | Notes |
|---|---|---|---|
| `subscription.payment.captured` | Razorpay `subscription.charged` webhook received + signature verified | `subscription_id`, `payment_id`, `plan_id`, `amount_paise`, `currency`, `billing_period_start`, `billing_period_end`, `org_id`, `timestamp` | Primary billing event |
| `subscription.payment.failed` | Razorpay `payment.failed` for a subscription charge | `subscription_id`, `payment_id`, `failure_reason`, `org_id`, `timestamp` | Triggers grace period |
| `subscription.halted` | Razorpay `subscription.halted` webhook (repeated payment failures) | `subscription_id`, `org_id`, `halt_reason`, `timestamp` | Triggers downgrade to FREE |
| `subscription.cancelled` | Razorpay `subscription.cancelled` webhook | `subscription_id`, `org_id`, `cancel_at`, `timestamp` | Records cancellation intent |
| `subscription.activated` | Razorpay `subscription.activated` webhook | `subscription_id`, `plan_id`, `org_id`, `start_at`, `timestamp` | Records first charge / activation |
| `subscription.completed` | Razorpay `subscription.completed` webhook | `subscription_id`, `org_id`, `total_count`, `timestamp` | End of fixed subscription term |
| `payment.refund.initiated` | Operator initiates refund via Razorpay refund API | `payment_id`, `refund_id`, `amount_paise`, `reason`, `org_id`, `operator_id`, `timestamp` | Control plane action |
| `payment.refund.completed` | Razorpay refund success confirmation | `payment_id`, `refund_id`, `amount_paise`, `org_id`, `timestamp` | Closure of refund flow |
| `payment.dispute.received` | Razorpay dispute notification | `payment_id`, `dispute_id`, `amount_paise`, `org_id`, `timestamp` | Dispute tracking |

**Event naming review gate:** Proposed names above must be reviewed against
`shared/contracts/event-names.md` before any event system implementation. Any namespace
or naming conflict must be resolved before PR-07 is closed.

### 10.2 Retention Policy Decisions Required

| Decision | Options | Recommendation (design only — not decided) |
|---|---|---|
| Payment event retention period | 7 years (India GST compliance) / 5 years / 3 years | 7 years (India GST requires 7-year record retention for tax invoices and financial records) |
| Webhook payload retention (full vs. sanitized) | Full Razorpay webhook payload retained / Only key fields extracted and stored | Extract key fields only (store `payment_id`, `subscription_id`, `amount` — not full raw payload) |
| Audit log access control | All authenticated users / Org admin only / Paresh/operator only | Paresh/operator (control plane) only for payment audit access at MVP |
| PII in payment events | Subscriber name, email, billing address in events? | Exclude PII from event log; store only `org_id` and Razorpay IDs |

### 10.3 PR-07 Evidence Required for COMPLETE

| Evidence Item | Source |
|---|---|
| Payment event names finalized and approved against `event-names.md` contract | FAM-13B design unit + governance contract review |
| Retention period confirmed (CA/compliance input) | Off-platform CA advisory |
| PII exclusion policy for payment events documented | FAM-13B design unit |
| Webhook payload retention policy documented | FAM-13B design unit |
| Audit log access control policy documented | FAM-13B design unit |
| Event store or audit table design approved (before schema changes) | FAM-13B design unit |

---

## 11. Decision Register Impact (D-011, D-020, D-021, D-022)

No new founder decisions are supplied in this unit. The classification below records the
current status of each decision as of FAM-13B-D3 and the conditions required for advancement.

| Decision | Current Status | D3 Impact | Condition to Advance |
|---|---|---|---|
| **D-011** (Subscription Tier Pricing, Entitlement, Self-Serve Billing) | PARTIALLY_RESOLVED — item 4 CA_CONFIRMED; item 2 provisional; item 7 PARKED | No change — tracking only | PR-03 fully closed (Razorpay invoice SAC verification complete) + PR-08 (CA pricing authorization for public display) + D-011 item 7 (feature entitlement scope defined by Paresh) |
| **D-011 item 7** (Feature entitlement scope per tier) | PARKED — NOT_STARTED | No change — Paresh must define per-tier feature scope. Scaffold provided in D-011 description. | Paresh decision supply in a future unit |
| **D-020** (Paid Subscription Activation Model) | PARTIALLY_RESOLVED — product/mode/tier/KYC decided; activation flow design (items 4–5) open | No change — tracking only | FTU-COMM-002 (RAZORPAY-PAYMENT-GATEWAY-DESIGN-001) design unit opened + all §4.3 prerequisites satisfied. Items 4–5 (in-app upgrade trigger; plan ID mapping) require design unit. |
| **D-021** (SaaS Subscription Refund and Cancellation Policy) | PARKED — NOT_STARTED | Worksheet provided in §8 — decision scaffold only. No advancement without Paresh decision. | Paresh selects policy (§8.1/§8.2/§8.3) + CA/counsel confirmation + terms text approved |
| **D-022** (FREE Pilot Tenant Conversion Policy) | PARKED — PARTIALLY_SUPPLIED (non-payment downgrade confirmed; upgrade invitation not defined) | No change — tracking only | Paresh defines upgrade invitation mechanism, timeline, and any grandfather/grace arrangement for early pilot tenants before STARTER tier goes live |

**Gate summary:** No decisions advance in this unit. D-021 worksheet is provided as a
scaffold for Paresh's decision supply in a future unit. No source, schema, or environment
changes made.

---

## 12. Implementation Authorization Status

No change to implementation authorization in this unit. The following remains in full effect:

| Surface | Status |
|---|---|
| Razorpay SDK installation (any package) | ❌ NOT AUTHORIZED |
| Razorpay Subscriptions integration (any environment) | ❌ NOT AUTHORIZED |
| Payment route / checkout endpoint | ❌ NOT AUTHORIZED |
| Payment webhook endpoint | ❌ NOT AUTHORIZED |
| Razorpay Subscription plan creation (Dashboard) | ❌ NOT AUTHORIZED |
| KYC merchant account setup (PR-04) | ❌ NOT AUTHORIZED — entity decided; operational start requires explicit authorization in a future governance unit |
| Invoice issuance with SAC codes | ❌ NOT AUTHORIZED — RAZORPAY-INVOICE-SAC-VERIFICATION-001 unresolved; invoice pathway fallback not yet selected |
| Price display on public surfaces (e.g., STARTER ₹2,499) | ❌ NOT AUTHORIZED — provisional; CA pricing authorization for public display not yet complete (PR-08-A open) |
| Schema / migration changes for billing or subscriptions | ❌ NOT AUTHORIZED |
| Environment variable changes (Razorpay keys of any kind) | ❌ NOT AUTHORIZED |
| `components/Public/PublicSupplierProfile.tsx` | ❌ NOT STAGED — pre-existing unstaged modification; outside scope of all FAM-13B units |

**Implementation gate condition:** ALL §4.3 prerequisites (PR-01 through PR-08) must be FULLY
satisfied AND Paresh must issue explicit written implementation authorization before any of
the above may proceed.

**Note on partial authorization:** D2 §13 considered whether partial authorization (e.g.,
test-mode KYC only) could be granted before full prerequisite closure. This requires explicit
CA/counsel input and a separate governance unit. No partial authorization is granted here.

---

## 13. Tracker / Register Updates

The following governance files were updated as part of this unit:

| File | Update Summary |
|---|---|
| `governance/control/NEXT-ACTION.md` | Active delivery unit updated to FAM-13B-D3 COMPLETE. Last closed unit updated to FAM-13B-D3. Next candidate unit updated to FAM-13B-D4. |
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | §4.4 updated: FAM-13B-D3 recorded as current unit; PR-03 through PR-07 detailed completion paths noted; implementation gate status unchanged; next unit updated to FAM-13B-D4. |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | §11 update history row added: FAM-13B-D3 payment prerequisite tracker complete; checklists provided for PR-04 through PR-07; implementation gate still CLOSED; next unit FAM-13B-D4. |

**Confirmed NOT updated (with rationale):**

| File | Reason not updated |
|---|---|
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | No decision advances in this unit. D-021 worksheet provided as scaffold only — no Paresh decision supplied. D-022 no new input. No status changes warranted. |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | No family cycle status change. FAM-11 CLOSE_READY unchanged. No FAM cycle closed or advanced. |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-029 remains DESIGN_GATED. Not all §4.3 prerequisites satisfied; no status change warranted. |
| `governance/legal/fam-07/` | ABSENT. FAM-07 hold HOLD_FOR_HUMAN_LEGAL_INPUTS unchanged. No action. |
| All source files | No changes. No payment implementation authorized. |
| `server/prisma/schema.prisma` | No schema changes. Billing schema design not yet authorized. |

---

## 14. Recommended Next Unit

**FAM-13B-D4 — Razorpay Invoice SAC Verification**

**Recommended scope:**

1. **Execute RAZORPAY-INVOICE-SAC-VERIFICATION-001** (§6 checklist above): Paresh verifies
   all 7 VQ items (VQ-01 through VQ-07) off-platform via Razorpay Dashboard, API sandbox,
   and/or Razorpay support channel. Document findings with evidence references.
2. **Determine NATIVE_SUPPORT / PARTIAL_SUPPORT / NOT_SUPPORTED** outcome and select the
   appropriate invoice fallback option (Fallback-A, B, or C from §6.4).
3. **Obtain CA confirmation** of selected invoice pathway before implementation gate advances.
4. **Close RAZORPAY-INVOICE-SAC-VERIFICATION-001** risk — advance PR-03 from PARTIALLY_COMPLETE
   toward COMPLETE (pending remaining items PR-03-B and PR-03-C also resolved).
5. **Authorize PR-04 KYC operational start** — if Paresh confirms entity details (§7.1) and
   timing readiness, this unit may grant explicit PR-04 operational start authorization.
6. **Optionally:** if Paresh supplies D-021 refund/cancellation policy decisions, advance
   D-021 from PARKED to RESOLVED and close PR-05 evidence scaffold.

**Gate to open FAM-13B-D4:** Paresh explicitly directs after reviewing FAM-13B-D3.
**Gate to authorize Razorpay implementation:** All 8 §4.3 prerequisites fully satisfied AND
Paresh issues explicit written implementation authorization.

---

## 15. Residuals

| Residual | Description | Disposition |
|---|---|---|
| RAZORPAY-INVOICE-SAC-VERIFICATION-001 | Razorpay invoice SAC/GST field capability unverified (VQ-01 through VQ-07 not yet answered) | OPEN — must be resolved in FAM-13B-D4 |
| PR-03-A | Razorpay invoice SAC/GST field verification | OPEN — blocking for invoice implementation |
| PR-03-B | Invoice filing cadence per GST rules | OPEN — CA advisory required |
| PR-03-C | IGST vs CGST+SGST state-based GST split treatment | OPEN — CA + Razorpay configuration required |
| PR-04 | Razorpay KYC operational start not yet authorized | PARKED — authorization required in FAM-13B-D4 |
| PR-05 | Refund and cancellation policy (D-021) not yet decided | NOT_STARTED — worksheet provided §8; decision required from Paresh |
| PR-06 | PCI boundary design not yet formally documented | NOT_STARTED — checklist provided §9; design unit required |
| PR-07 | Payment event audit/log policy not yet approved | NOT_STARTED — checklist provided §10; event names contract review required |
| PR-08-A | CA explicit authorization for public price display | OPEN — off-platform CA advisory required |
| PR-08-B | Annual price equivalents | OPEN — required if annual billing launches |
| D-011 item 2 | Provisional prices not CA-confirmed for public display | PARKED — CA pricing confirmation pending |
| D-011 item 7 | Feature entitlement scope per tier not yet supplied | PARKED — Paresh decision required |
| D-021 | Refund/cancellation policy not defined | PARKED — worksheet provided; Paresh decision required |
| D-022 | FREE pilot tenant upgrade invitation policy not defined | PARKED — Paresh decision required before STARTER launch |
| ECO/TCS recheck obligation | Must recheck with CA/counsel before any future marketplace payment collection, Razorpay Route, split-settlement, or supplier payout track | Standing obligation — not blocking current SaaS billing track |
| FAM-07 legal hold | HOLD_FOR_HUMAN_LEGAL_INPUTS — FAM-07L14 blocked (L13 prerequisites not complete) | Unchanged — no action authorized |
| D-015 counsel review | Legal counsel sign-off on Razorpay operating agreement | Still open — tracked in D-015 |
| FTU-COMM-002 trigger | All §4.3 prerequisites (PR-01 through PR-08) must be satisfied to open RAZORPAY-PAYMENT-GATEWAY-DESIGN-001 | Status: PARKED — D-015_RESOLVED; trigger condition not yet met |

---

## 16. Final Enum

```
FAM_13B_D3_PAYMENT_PREREQUISITE_TRACKER_COMPLETE_IMPLEMENTATION_GATE_CLOSED
```

**Summary:** Payment prerequisite tracker complete for all PR-01 through PR-08 gates.
PR-01 and PR-02 COMPLETE. PR-03 and PR-08 PARTIALLY_COMPLETE (carried from D2). PR-04
through PR-07 NOT_STARTED — structured checklists and evidence requirements provided in
this unit (§5 through §10). RAZORPAY-INVOICE-SAC-VERIFICATION-001 risk remains OPEN;
structured verification plan with 7 verification questions and 3 fallback options
documented (§6). KYC checklist provided (§7); KYC operational start NOT authorized.
Refund/cancellation policy worksheet provided (§8); D-021 still PARKED (no Paresh
decision supplied). PCI boundary checklist provided (§9). Payment event audit/log policy
checklist with proposed event names provided (§10). No source, schema, migration, or
environment changes. No decisions advanced. Implementation gate remains CLOSED.
Governance and operational readiness documentation only.

---

## 17. Commit Chronology

| Step | Commit Hash | Description |
|---|---|---|
| FAM-13B-D1 main | `9a7a1fbd` | Decision reconciliation artifact + 4 governance files |
| FAM-13B-D1 seal | `c7dbf5d7` | Seal commit — commit hash backfilled |
| FAM-13B-D1 hash propagation | `fe87916f` | Seal hash + NEXT-ACTION.md `last_closed_unit_commits` |
| FAM-13B-D2 main | `2f342bb9` | CA SAC confirmation artifact + governance file updates |
| FAM-13B-D2 seal | `dd5b2da1` | Seal hash backfilled |
| FAM-13B-D2 hash propagation | `e0777e8d` | Seal hash + NEXT-ACTION.md `last_closed_unit_commits` |
| FAM-13B-D3 main | *(TBD — backfill after commit)* | This artifact + governance file updates |
| FAM-13B-D3 seal | *(TBD — backfill after seal commit)* | Seal hash backfilled |
| FAM-13B-D3 hash propagation | *(TBD — backfill after hash-propagation commit)* | Seal hash + NEXT-ACTION.md updated |
