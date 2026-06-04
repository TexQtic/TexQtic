# COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md
# TexQtic — Commerce, Subscription, and Payments Methodology

**Hub:** TexQtic Launch Readiness Hub (TLRH) — `governance/launch-readiness/`
**Governing unit:** `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001`
**Status:** METHODOLOGY_ESTABLISHED — PARTIAL_PARKED_DECISIONS_REMAIN
**Created:** 2026-05-19
**Owner:** Paresh Patel (TexQtic founder)
**Layer 0 posture at authoring:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`
**Authority boundary:** Planning and methodology only. This document does not authorize
  implementation, does not open a family cycle, and does not override Layer 0.

---

> **CRITICAL READ REQUIREMENT**
>
> This document MUST be read before opening any family cycle that touches:
> - B2C or D2C authenticated commerce continuity
> - Subscription gating or tier entitlement
> - Payment gateway integration (Razorpay or any other provider)
> - Commission, deduction, or settlement calculation
> - Invoice issuance or financial transaction processing
>
> Any family cycle that intersects these domains must record in its opening section that it has
> read and respects the methodology, confirmed decisions, and parked decisions in this document.

---

## 1. Purpose

This document establishes the TexQtic methodology for commerce surfaces, subscription tier
commercialization, payment gateway strategy, B2B financial boundaries, B2C/D2C transaction
models, and commission/deduction policy.

It records:
- What has been confirmed by Paresh as the MVP/pilot approach
- What is parked pending Paresh decision, counsel (CA/lawyer) review, or design maturity
- The guardrails that apply regardless of which decisions are pending
- The impact on family selection and family cycle sequencing
- The prerequisites that must be satisfied before implementation may proceed in any payment-
  adjacent or commerce-adjacent family cycle

This document is a planning and methodology authority. It is not implementation authorization.
It does not widen Layer 0. It does not open any family cycle.

---

## 2. Context: What Commerce Surfaces TexQtic Owns

TexQtic operates three distinct commerce and monetization surfaces:

### 2.1 B2B Network Commerce

TexQtic operates a B2B procurement network enabling suppliers and buyers to transact via RFQ,
pool procurement, award flows, and supplier quote responses (FAM-12 through FAM-16).

**Current status:** NC Phase 1 implemented and post-audit verified. Award maker-checker path
gated at G-022. TradeTrust Pay (TTP) gated at HOLD_FOR_COUNSEL_FEEDBACK. All financial
transaction implementation is HOLD_FOR_COUNSEL_FEEDBACK.

**Key confirmed boundary:** TexQtic does NOT handle B2B financial transactions (i.e., does not
collect buyer payment on behalf of a supplier, does not hold escrow, does not auto-deduct
commissions from B2B transactions) in MVP. See §5 for the full B2B financial boundary.

### 2.2 B2C Public Browse and Retail Commerce

TexQtic operates B2C public storefront, catalog browse, and product detail surfaces (FAM-01).
The public browse surface is production-verified. Cart intent and wishlist intent are governed
by `TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1.md`.

**Current status:** Public surface PRODUCTION_VERIFIED. Authenticated checkout, account,
order history, and post-purchase continuity remain downstream-authenticated and NOT yet
scoped for implementation.

**Key confirmed boundary:** Authenticated B2C checkout is NOT part of the current public browse
surface. It requires a separate authenticated commerce family cycle, a merchant-of-record
decision, and counsel/CA review before implementation.

### 2.3 D2C Public Collections and Storefront Commerce

TexQtic operates D2C public collections and storefront surfaces (FAM-02). D2C public surface
is production-verified. D2C post-auth continuation is deferred.

**Current status:** D2C public collections and collection detail PRODUCTION_VERIFIED.
D2C seller settlement, invoice issuance, and post-auth continuation are NOT yet scoped.

**Key confirmed boundary:** D2C seller settlement model, commission deduction, and invoice
issuance are all PARKED pending Paresh decision and counsel/CA review.

---

## 3. Subscription Tier Methodology

### 3.1 MVP/Pilot Position (CONFIRMED)

**CONFIRMED by Paresh (PRIT-018, 2026-05-19):** Subscription commercial packaging for MVP
pilot will be FREE and manually provisioned by the platform operator.

- Pilot tenants are provisioned FREE via the control-plane admin provisioning flow
- Plan selection is operator-side (control plane); tenants do NOT self-select or self-pay at pilot
- Self-serve subscription payment/checkout is DEFERRED post-MVP (PRIT-018 POST_MVP confirmed)
- The PRIT-028 intake records the subscription tier entitlement design as a planned post-MVP feature

**Implications for FAM-11 (Subscription and Commercial Gating):**
- FAM-11 must implement the minimum commercial gating logic required for the Surat pilot cell
- FAM-11 does NOT need to implement self-serve payment, Razorpay subscription billing, or
  in-product plan upgrade flows at pilot
- FAM-11 should wire correct plan entitlement from operator-assigned plan (FREE for pilot)
- FAM-11 cycle must read §3 of this document before opening

### 3.2 Existing Plan Tier Infrastructure

From Subscription Slice 4A (closed 2026-04-15), the control-plane admin provisioning modal
already includes canonical plan tiers:

| Plan | Tier Level | Current Use |
|---|---|---|
| FREE | 0 | MVP pilot default |
| STARTER | 1 | Future self-serve entry |
| PROFESSIONAL | 2 | Future self-serve growth |
| ENTERPRISE | 3 | Future self-serve premium |

These tier labels are established. The entitlement enforcement logic per-tier is NOT yet
implemented in runtime. FAM-11 owns that implementation.

### 3.3 Self-Serve Subscription (PARKED — POST_MVP)

Self-serve subscription checkout and billing via Razorpay (or equivalent) is:
- CONFIRMED as POST_MVP by PRIT-018
- Parked in D-011 pending Paresh decision on tier pricing, entitlement, and billing cycle
- Not to be implemented before: counsel/CA review, merchant-of-record decision, GST/TDS
  advisory (India-specific for SaaS subscriptions), and Razorpay account/KYC completion
- Future unit: SUBSCRIPTION-TIER-ENTITLEMENT-DESIGN-001 (when triggered by Paresh)

---

## 4. Razorpay / Payment Gateway Methodology

### 4.1 Current Status

**No Razorpay or payment gateway integration exists anywhere in the TexQtic platform.**

As of this methodology document, there are no:
- Razorpay API keys in any environment configuration
- Payment gateway SDK references in any source file
- Checkout route or payment callback endpoint in any backend service
- Invoice payment processing or settlement payout logic

**Decision status update (2026-06-03 — FAM-13B-D1):** D-015 (Razorpay adoption) is now
`FOUNDER_DECISION_RESOLVED`. Razorpay Subscriptions adopted for SaaS subscription billing.
Test mode first. STARTER tier first. D-015 trigger condition is satisfied. However, §4.3
prerequisites (PR-03 through PR-08) remain open. **Implementation is still NOT authorized.**

### 4.2 Candidate Use Cases (All DESIGN_GATED)

Razorpay (or an equivalent payment gateway) is a candidate for the following future surfaces:

| # | Use Case | Family | Priority | Gate Condition |
|---|---|---|---|---|
| PG-01 | B2C checkout — retail payment collection | B2C authenticated commerce | P2 | Merchant-of-record + counsel/CA review |
| PG-02 | D2C checkout — seller storefront payment | D2C authenticated storefront | P2 | Merchant-of-record + settlement + counsel/CA |
| PG-03 | Platform subscription billing — self-serve | FAM-11 | P3 | PRIT-018 POST_MVP + D-011 resolved |
| PG-04 | B2B TTP-gated financial flow | FAM-16 | P2 | HOLD_FOR_COUNSEL_FEEDBACK + TTP legal gate |
| PG-05 | Lead/inquiry fee collection | FAM-11/FAM-12 | P3 | Future design decision |

None of these use cases are authorized for implementation as of this methodology document.

### 4.3 Prerequisites Before Any Razorpay Integration

ALL of the following must be satisfied before Razorpay or any payment gateway may be integrated
into any TexQtic surface:

1. **Merchant-of-record decision** (D-012): Paresh must decide whether TexQtic acts as merchant
   of record for B2C/D2C transactions or as a platform facilitator/marketplace operator
2. **Settlement model decision** (D-012): Seller payout cadence, split-settlement rules, and
   reserve policy must be defined before gateway integration
3. **Counsel/CA review** (D-012): India CA review of GST (IGST/CGST/SGST), TDS/TCS obligations
   under marketplace operator rules, and legal review of Razorpay operating agreement required
4. **Refund and cancellation policy** (D-013 or D-014): Must be defined before live payments
5. **Audit and logging requirements**: Payment events must be recorded in the event system;
   audit trail for compliance must be defined before gateway integration
6. **PCI boundary awareness**: Razorpay handles card data; TexQtic must ensure no card data
   flows through TexQtic servers; payment form must be Razorpay-hosted
7. **KYC/account setup**: Razorpay merchant account KYC with GSTIN/PAN for the TexQtic entity

### 4.4 Razorpay Decision Status

**Updated 2026-06-03 (FAM-13B-D1):** D-015 is now `FOUNDER_DECISION_RESOLVED`.
- Paresh has confirmed: YES to Razorpay; Razorpay Subscriptions product; test mode first;
  TexQtic company entity as KYC owner; SaaS subscription billing as first scope; STARTER first.
- D-015 trigger condition (`Paresh authorizes gateway integration for a specific use case`)
  is satisfied.
- D-011 is `PARTIALLY_RESOLVED`: first tier, billing cycle, grace period, non-payment action
  supplied; feature entitlement scope per tier and CA review still open.
- D-012 is `PARTIALLY_RESOLVED` for SaaS scope: MoR and separation confirmed; marketplace deferred.
- **§4.3 prerequisites PR-03 through PR-08 remain open. Implementation gate still CLOSED.**

**Updated 2026-06-03 (FAM-13B-D2):** CA SAC confirmation recorded.
- PR-03 advances from `CONFLICTING_EVIDENCE` to `PARTIALLY_COMPLETE`.
  CA confirms: SAC 998315 for SaaS/AI add-on, SAC 998599 for marketplace facilitation,
  SAC 998311 for professional services. 18% GST rate. Exclusive display rule.
  Marketplace payment collection formally deferred at MVP. ECO/TCS not activated at MVP.
  **Remaining PR-03 open items:** Razorpay invoice SAC/GST field capability not yet verified
  (see RAZORPAY-INVOICE-SAC-VERIFICATION-001 in FAM-13B-D2 artifact §8); invoice filing
  cadence and state-based IGST/CGST+SGST split treatment not yet confirmed.
- PR-08 records CA SAC progress (label unchanged: `PARTIALLY_COMPLETE`). Provisional prices
  remain provisional; CA authorization for public price display not yet complete.
- PR-04 through PR-07 remain NOT_STARTED.
- **§4.3 prerequisites PR-03 through PR-08 still open. Implementation gate still CLOSED.**

No implementation may begin until all prerequisites in §4.3 are satisfied and Paresh issues
explicit implementation authorization via a dedicated design unit.

**Updated 2026-06-03 (FAM-13B-D3):** Payment prerequisite tracker and operational readiness
plan complete.
- PR-01 and PR-02 confirmed COMPLETE (no change).
- PR-03 and PR-08 remain PARTIALLY_COMPLETE (no change from D2; completion paths defined).
  PR-03 open items: Razorpay invoice SAC/GST field capability (VQ-01–VQ-07 in
  RAZORPAY-INVOICE-SAC-VERIFICATION-001), invoice filing cadence (PR-03-B), state-based
  IGST/CGST+SGST split (PR-03-C). PR-08 open items: CA authorization for public price
  display (PR-08-A), annual price equivalents (PR-08-B).
- PR-04 (KYC checklist provided), PR-05 (refund/cancellation worksheet D-021 provided),
  PR-06 (PCI boundary checklist provided), PR-07 (payment event audit/log policy checklist
  provided) — all NOT_STARTED; completion paths now documented.
- RAZORPAY-INVOICE-SAC-VERIFICATION-001 risk remains OPEN with structured 7-question
  verification plan (VQ-01 through VQ-07) and 3 fallback options (A/B/C) documented.
  Razorpay external documentation not accessible via automated fetch — manual off-platform
  verification required in FAM-13B-D4.
- D-021 (refund/cancellation policy) PARKED — worksheet provided; no Paresh decision yet.
- No implementation authorized. No source, schema, or environment changes.
- **§4.3 prerequisites PR-03 through PR-08 still open. Implementation gate still CLOSED.**

**Next unit:** `FAM-13B-D4 — Razorpay Invoice SAC Verification`
(recommended; not yet opened; awaiting Paresh direction after reviewing FAM-13B-D3).

**Updated 2026-06-03 (FAM-13B-D4):** Razorpay Invoice SAC Verification — **UNVERIFIED**.
- All Razorpay external documentation inaccessible via automated fetch (15 URLs attempted;
  all JavaScript-blocked, 404, or 504). Consistent with D3 finding.
- No Paresh-supplied Dashboard, API sandbox, or support ticket evidence provided.
- VQ-01 through VQ-07 formally UNVERIFIED.
- Knowledge-based analysis lean: Razorpay subscription receipts are payment receipts only
  and do NOT constitute GST Tax Invoices under CGST Act Section 31. SAC code propagation
  LIKELY NOT SUPPORTED. CGST/SGST breakdown LIKELY NOT NATIVELY SUPPORTED.
- D2 §8.1 initial assessment ("SAC/GST fields cannot be customized in all configurations")
  not contradicted by available knowledge.
- Fallback-B (accounting software) or Fallback-A (TexQtic invoice system) is the likely
  required path. CA decision required before fallback selection is finalized.
- RAZORPAY-INVOICE-SAC-VERIFICATION-001 OPEN. PR-03 PARTIALLY_COMPLETE (3 open items
  unchanged). Implementation gate CLOSED. FAM-07 HOLD_FOR_HUMAN_LEGAL_INPUTS unchanged.
- Final enum: `FAM_13B_D4_RAZORPAY_INVOICE_SAC_VERIFICATION_COMPLETE_UNVERIFIED`

**Next unit:** `FAM-13B-D5 — Razorpay Invoice Pathway Selection and CA Advisory`
(recommended; not yet opened; awaiting Paresh direction after reviewing FAM-13B-D4).

**Updated 2026-06-03 (FAM-13B-D5):** Razorpay Invoice Pathway Selection and CA Advisory — **PATHWAY_SELECTED**.
- Knowledge-based lean from D4 accepted as operational basis (per NEXT-ACTION.md D5 candidate provision).
- Fallback options evaluated: Fallback-A (TexQtic internal — HIGH COMPLEXITY), Fallback-B (Zoho Books — RECOMMENDED), Fallback-C (CA manual — NOT SCALABLE, bridge only).
- **Selected pathway: Fallback-B (Zoho Books API integration).**
- Zoho Books India GST invoice API confirmed via live research: `hsn_or_sac` field (SAC 998315), `gst_treatment`, `gst_no`, `place_of_supply`, CGST/SGST auto-split, Tax Invoice format — all requirements satisfied.
- Zoho Books ↔ Razorpay native integration page HTTP 404 — API-direct integration required; standard pattern.
- RAZORPAY-INVOICE-SAC-VERIFICATION-001 status: PATHWAY_SELECTED_PENDING_CA_CONFIRMATION. VQ-01–VQ-07 all resolved via Fallback-B; formal closure pending CA advisory (CA-Q1).
- CA Advisory Briefing produced: 5 questions (CA-Q1: Zoho Books acceptability; CA-Q2: invoice timing PR-03-B; CA-Q3: state-based IGST/CGST+SGST split PR-03-C; CA-Q4: B2B vs B2C handling; CA-Q5: e-invoicing threshold).
- PR-03 status: PATHWAY_SELECTED_PENDING_CA (PR-03-A pathway selected; PR-03-B and PR-03-C pending CA advisory).
- PR-08 PARTIALLY_COMPLETE — unchanged. PR-04 through PR-07 NOT_STARTED — unchanged.
- D-021 PARKED — unchanged.
- FTU-COMM-001 status unchanged (PARKED POST_MVP). FTU-COMM-002 trigger unchanged (all §4.3 prerequisites required).
- Implementation gate CLOSED — unchanged. No source, schema, or environment changes.
- Final enum: `FAM_13B_D5_RAZORPAY_INVOICE_PATHWAY_SELECTION_COMPLETE_FALLBACK_B_SELECTED`

**Next unit:** `FAM-13B-D6 — CA Advisory Close and PR-03 Completion`
(recommended; not yet opened; awaiting Paresh CA advisory consultation after reviewing FAM-13B-D5 §8).

### 4.5 D6 Status — CA Advisory Close and PR-03 Completion (2026-06-03)

**Unit:** FAM-13B-D6-CA-ADVISORY-CLOSE-AND-PR-03-COMPLETION-001 — ✅ **COMPLETE**

**Outcome:** CA Advisory Loop CLOSED. All five CA confirmations recorded and Paresh-approved.
PR-03 (GST invoice compliance) advanced from PATHWAY_SELECTED_PENDING_CA → **COMPLETE**.
RAZORPAY-INVOICE-SAC-VERIFICATION-001 formally CLOSED. Zoho Books operational pathway locked.

**CA confirmations recorded:**
- CA-Q1: Zoho Books India edition acceptable for GST Tax Invoices; compliant under CGST Act §31; acceptable for GSTR-1/GSTR-3B filing; B2B customers can claim ITC. ✅ CONFIRMED
- CA-Q2: Same-day invoice generation after Razorpay payment confirmation correct and compliant; billing period must be included in invoice description. ✅ CONFIRMED
- CA-Q3: TexQtic registered state = Gujarat (code 24); tax split = CGST 9% + SGST 9% same-state, IGST 18% inter-state; place_of_supply determined by GSTIN state (B2B) or billing address state (B2C). ✅ CONFIRMED
- CA-Q4 (supplementary): Single Tax Invoice format acceptable for all subscriber types (B2B/B2C/unregistered/export); Zoho Books GST treatment mapping (business_gst / business_none / consumer / overseas) supports all types. ✅ CONFIRMED
- CA-Q5 (supplementary): E-invoicing NOT required at launch if TexQtic below ₹5 crore threshold; Zoho Books configured e-invoicing-ready; IRN NOT activated without explicit CA confirmation + Paresh authorization. ✅ CONFIRMED

**PR-03 completion:**
- PR-03-A (invoice pathway selection): ✅ COMPLETE — Fallback-B / Zoho Books selected and CA-confirmed
- PR-03-B (invoice timing cadence): ✅ COMPLETE — same-day generation after payment, CA-confirmed
- PR-03-C (state-based CGST/SGST split): ✅ COMPLETE — Gujarat state, CGST/SGST 9%+9%, place_of_supply logic, CA-confirmed
- **PR-03 overall:** ✅ **COMPLETE**

**RAZORPAY-INVOICE-SAC-VERIFICATION-001 disposition:**
- Previous status: PATHWAY_SELECTED_PENDING_CA_CONFIRMATION
- D6 status: **✅ FORMALLY CLOSED**
- Closure basis: Fallback-B (Zoho Books) selected and CA-confirmed acceptable; all VQ-01–VQ-07 resolved via Zoho Books capabilities; Razorpay receipts are payment receipts only (not Tax Invoices); Zoho Books is GST-compliant invoice authority

**Zoho Books setup carry-forward documented:**
- Organization state: Gujarat (code 24)
- Supplier GSTIN: [internal, not exposed]
- SAC code: 998315 (platform SaaS)
- Invoice numbering: TEXQ/[FY]/[seq]
- Place of Supply field: enabled
- GST Liability/Output Tax accounts: configured for setup
- Razorpay payment reference: custom field for reconciliation
- E-invoicing: configured ready, not activated

**PR-04–PR-08 status (unchanged by D6):**
- PR-04 (Razorpay KYC): NOT_STARTED — awaiting Paresh completion (checklist in D3)
- PR-05 (refund/cancellation policy): NOT_STARTED — awaiting Paresh decision (worksheet in D3)
- PR-06 (PCI boundary): NOT_STARTED — awaiting Paresh review (checklist in D3)
- PR-07 (payment event audit/log): NOT_STARTED — awaiting Paresh review (checklist in D3)
- PR-08 (pricing/tier structure): PARTIALLY_COMPLETE — PR-08-A (CA auth for public prices); PR-08-B (annual equivalents)

**Implementation gate:** CLOSED — unchanged. 3/8 prerequisites satisfied (PR-01, PR-02, PR-03). PR-04–PR-08 remain open/partial. Explicit Paresh written implementation authorization not yet issued. FTU-COMM-002 trigger: UNMET.

**D6 governance changes:** D6 artifact created; NEXT-ACTION.md synced (active unit D6 COMPLETE, next candidate D7); COMMERCE-METHODOLOGY D6 status block added; FUTURE-TODO-REGISTER §11 D6 row added.

**No source, schema, migration, or environment changes** in D6.

**Final enum:** `FAM_13B_D6_CA_ADVISORY_CLOSED_PR_03_COMPLETE`

**Next recommended unit:** `FAM-13B-D7 — Razorpay KYC and Payment Account Readiness Closure` (scope: record Razorpay KYC status from D3 checklist; confirm settlement, test/live readiness; advisory/governance only).

---

### 4.6 D7 Status — Razorpay KYC and Payment Account Readiness Closure (2026-06-03)

**Unit:** FAM-13B-D7-RAZORPAY-KYC-AND-PAYMENT-ACCOUNT-READINESS-CLOSURE-001 — ✅ **COMPLETE**

**Outcome:** D6 closure reconfirmed. PR-04 reviewed against the D3 checklist and recorded as
`PENDING_PARESH_EVIDENCE` — not complete yet. Legal entity for payment-readiness tracking
confirmed as **TexQtic Ventures Pvt Ltd**. D6 line `TexQtic Innovations Pvt Ltd` treated as an
unverified typo carry-forward and not propagated as verified account truth.

**Repo-truth findings:**
- D6 remains closed: PR-03 COMPLETE; RAZORPAY-INVOICE-SAC-VERIFICATION-001 CLOSED; Zoho Books pathway locked.
- D3 remains the authority for PR-04 completion evidence.
- D-015 and D-020 confirm founder decisions only: Razorpay Subscriptions, test mode first,
  STARTER first, KYC owner = TexQtic company entity.
- No later governance artifact records Razorpay account creation, KYC submission/approval,
  settlement bank setup, dashboard admin access, test-mode access, or live-mode status.

**PR-04 assessment:**
- Razorpay account created: PENDING
- Correct legal entity name: CONFIRMED — TexQtic Ventures Pvt Ltd
- Business type verified: PENDING
- GSTIN linked/available: PENDING
- KYC submitted: PENDING
- KYC approved: PENDING
- Settlement bank configured: PENDING
- Test mode accessible: PENDING
- Live mode status known: PENDING
- Dashboard admin owner known: PENDING
- API key handling guardrail: CONFIRMED_GUARDRAIL_ONLY — no keys in repo/reports
- Webhook secret handling guardrail: CONFIRMED_GUARDRAIL_ONLY — no secrets in repo/reports
- Product scope: CONFIRMED — SaaS subscriptions first; no marketplace split settlement at MVP

**PR-04 decision:** `PENDING_PARESH_EVIDENCE`
- D7 does not justify COMPLETE because mandatory off-platform readiness evidence is still absent.
- D7 does not justify BLOCKED_LEGAL_ENTITY_MISMATCH because Paresh supplied a clear entity
  correction and no competing verified authority proves another legal entity.

**PR-05–PR-08 preserved:**
- PR-05: NOT_STARTED
- PR-06: NOT_STARTED
- PR-07: NOT_STARTED
- PR-08: PARTIALLY_COMPLETE

**Implementation gate:** CLOSED — unchanged. PR-04 remains open; PR-05–PR-08 remain open/partial.
No implementation authorization supplied.

**No source, schema, migration, package, or environment changes** in D7.

**Final enum:** `FAM_13B_D7_RAZORPAY_KYC_READINESS_RECORDED_PR_04_PENDING_PARESH_EVIDENCE`

**Next recommended unit:** `FAM-13B-D7A — Razorpay KYC Evidence Completion`

### 4.7 D7A Status — Razorpay KYC Evidence Completion (2026-06-04)

**Unit:** FAM-13B-D7A-RAZORPAY-KYC-EVIDENCE-COMPLETION-001 — ✅ **COMPLETE**

**Outcome:** Paresh-supplied Razorpay account/KYC readiness evidence received and recorded in
sanitized status-only form. Three new items confirmed. KYC status remains AMBIGUOUS and PR-04
cannot close in D7A.

**Paresh-supplied evidence recorded:**

| Evidence Item | Paresh-Supplied Status | D7A Recorded Status |
|---|---|---|
| Razorpay account exists | YES | CONFIRMED |
| Legal entity shown in Razorpay | TexQtic Ventures Pvt Ltd | CONFIRMED — matches D7 tracking entity |
| KYC status | "approved / submitted" | AMBIGUOUS — not normalized to approved; see note |
| Settlement bank configured | YES | CONFIRMED (no bank details recorded) |
| Test mode accessible | PENDING VERIFICATION after KYC accepted | PENDING |
| Live mode status | PENDING | PENDING |
| Dashboard admin access | YES | CONFIRMED |
| Active payment/profile link | `razorpay.me/@texqtic` active | SUPPORTING_EVIDENCE_ONLY — account/profile existence; not proof of KYC approval or subscription-payment readiness |

**KYC status note:** `"approved / submitted"` is AMBIGUOUS. Cannot be normalized to approved
without explicit clarification. Both KYC submitted and KYC approved are required for PR-04
COMPLETE. The `razorpay.me/@texqtic` link corroborates account/profile existence only.

**Not supplied in D7A evidence:**
- Business type (not confirmed)
- GSTIN linked/available status (not confirmed)

**PR-04 assessment (D7A):**
- Razorpay account created: CONFIRMED ✅
- Correct legal entity name: CONFIRMED — TexQtic Ventures Pvt Ltd ✅
- Business type verified: NOT_SUPPLIED ❌
- GSTIN linked/available: NOT_SUPPLIED ❌
- KYC submitted: AMBIGUOUS ❌
- KYC approved: AMBIGUOUS ❌
- Settlement bank configured: CONFIRMED ✅
- Test mode accessible: PENDING ❌
- Live mode status known: PENDING ❌
- Dashboard admin access: CONFIRMED ✅
- API key handling guardrail: CONFIRMED_GUARDRAIL_ONLY ⚠️
- Webhook secret handling guardrail: CONFIRMED_GUARDRAIL_ONLY ⚠️
- Product scope: CONFIRMED — SaaS subscriptions first ✅

**PR-04 decision:** `STILL_PENDING`
- Items 3, 4, 5, 6, 8, 9 of the 13-item completion checklist are not satisfied.
- No entity mismatch (`BLOCKED_LEGAL_ENTITY_MISMATCH` NOT triggered).
- No repo-truth or tracker conflict (`FAM_13B_D7A_BLOCKED_REPO_TRUTH_OR_TRACKER_CONFLICT` NOT triggered).

**PR-05–PR-08 preserved (unchanged from D7):**
- PR-05: NOT_STARTED
- PR-06: NOT_STARTED
- PR-07: NOT_STARTED
- PR-08: PARTIALLY_COMPLETE

**Implementation gate:** CLOSED — unchanged. PR-04 STILL_PENDING; PR-05–PR-08 open/partial.
No implementation authorization. FTU-COMM-002 trigger: 3/8 prerequisites (PR-01/02/03 COMPLETE).

**No source, schema, migration, package, or environment changes** in D7A.

**Final enum:** `FAM_13B_D7A_RAZORPAY_KYC_EVIDENCE_RECORDED_PR_04_STILL_PENDING`

**Next recommended unit:** `FAM-13B-D7B — Razorpay KYC Approval and Test-Mode Verification Follow-Up`
(scope: clarify KYC approval vs. submitted; confirm business type and GSTIN; verify test mode;
close PR-04 if remaining evidence is sufficient; no implementation)

---

## 5. B2B Financial Boundary (CONFIRMED GUARDRAIL)

### 5.1 Confirmed Position

**CONFIRMED (no-money-movement policy confirmed in governance/control/NEXT-ACTION.md, 2026-07-06):**

TexQtic does NOT handle B2B financial transactions in MVP.

This is a constitutional guardrail. It cannot be weakened without Paresh's explicit documented
decision AND counsel review.

### 5.2 What Is Allowed in B2B MVP Monetization

| Monetization Type | Status | Notes |
|---|---|---|
| Platform subscription fee (FREE at pilot) | ALLOWED | Operator-provisioned; no transaction |
| Lead/inquiry referral fee (offline invoiced) | ALLOWED — FUTURE | Must be explicitly scoped; no payment gateway needed if invoiced manually |
| Offline success fee (invoiced post-deal) | ALLOWED — FUTURE | Manual invoicing; no platform payment collection |
| TTP-gated trade finance flow | DESIGN_GATED | FAM-16; HOLD_FOR_COUNSEL_FEEDBACK; future |

### 5.3 What Is Prohibited in B2B MVP

| Prohibited Action | Reason |
|---|---|
| Platform collecting buyer payment on behalf of supplier | Not merchant of record for B2B; no legal/CA gate cleared |
| Platform escrow for B2B transactions | Escrow is a regulated activity; requires counsel + RBI/legal gate |
| Automatic commission deduction from B2B transaction proceeds | No B2B transaction flows through TexQtic in MVP |
| Financial/lending/credit services for B2B buyers or suppliers | Not in scope; requires specific regulatory clearance |
| Splitting or routing B2B invoice payment via gateway | Not allowed before TTP legal gate clears |

### 5.4 Path to B2B Transaction Enablement

The only governed path to B2B financial transaction enablement is:

1. TradeTrust Pay (TTP) legal gate clears (HOLD_FOR_COUNSEL_FEEDBACK resolves)
2. TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001 is recorded
3. Paresh issues explicit authorization to open FAM-16
4. FAM-16 family cycle implements B2B TTP-gated flow with full audit, settlement, and
   compliance infrastructure

This path is DESIGN_GATED. It does not exist in MVP. It must not be anticipated or partially
implemented in earlier family cycles.

### 5.5 PRIT-030 Reference

PRIT-030 records the B2B no-platform-financial-transaction boundary as a confirmed guardrail
in the planned requirements intake. All family cycles touching FAM-12 (NC/RFQ), FAM-13 (Award),
FAM-14 (Supplier Quotes), FAM-15 (Invoices and Settlement), or FAM-16 (TTP) must read
PRIT-030 before opening.

---

## 6. B2C Transaction Methodology

### 6.1 B2C Boundary (Current)

Per `TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1.md` (decided 2026-04-21):

- B2C public browse is projection-only, brand-safe, merchandising-safe, and entry-oriented
- Cart intent and wishlist intent are pre-authentication entry mechanisms
- Authenticated checkout, account continuity, order history, and post-purchase workflow are
  downstream-authenticated — NOT on the current public surface
- The public surface does NOT own checkout progression, account state, order history, or
  returns handling

This boundary is already decided. It is not being reopened by this methodology document.

### 6.2 B2C Merchant-of-Record Decision (PARKED — D-012)

Before any B2C authenticated checkout implementation may proceed, Paresh must decide:

| Question | Status |
|---|---|
| Is TexQtic the merchant of record for B2C retail transactions? | PARKED — D-012 |
| Or does TexQtic act as marketplace facilitator / referral platform? | PARKED — D-012 |
| Who issues the tax invoice to the B2C shopper? | PARKED — D-012 |
| Who handles B2C refunds and cancellations? | PARKED — D-012 |
| How is GST (B2C retail) handled? IGST/CGST/SGST split? | PARKED — needs CA review |

Until D-012 resolves, no B2C checkout implementation may begin.

### 6.3 B2C Commission Model (PARKED — D-014)

| Question | Status |
|---|---|
| Does TexQtic take a % commission on B2C retail sales? | PARKED — D-014 |
| Is commission deducted at checkout, or invoiced offline? | PARKED — D-014 |
| What is the commission rate structure? | PARKED — D-014 |
| Does commission vary by plan tier? | PARKED — D-014 |

All B2C commission decisions are parked until the merchant-of-record model is decided.

### 6.4 B2C First Family Implications

An authenticated B2C family cycle may proceed WITHOUT resolving B2C transaction methodology IF:
- The family cycle scope is limited to B2C auth/session management, not checkout or payment
- The family cycle explicitly records in its opening that B2C checkout is NOT in scope
- No payment gateway integration, commission logic, or invoice logic is included

**Example:** A FAM-06 (Auth and Session) cycle that covers B2C shopper sign-up and login can
proceed once Layer 0 authorization is granted — it does not require D-012 to resolve first.

---

## 7. D2C Transaction Methodology

### 7.1 D2C Boundary (Current)

D2C public collections and collection detail are PRODUCTION_VERIFIED (FAM-02). The D2C public
surface is a public projection/discovery surface — not an authenticated commerce surface.

D2C post-auth continuation (seller storefront authentication, buyer account, checkout, order
management) is explicitly DEFERRED and has not been implemented.

### 7.2 D2C Merchant-of-Record and Settlement (PARKED — D-012)

Before any D2C authenticated storefront commerce implementation may proceed, Paresh must decide:

| Question | Status |
|---|---|
| Does TexQtic act as merchant of record for D2C seller transactions? | PARKED — D-012 |
| Or does TexQtic provide a storefront/referral surface without owning the transaction? | PARKED — D-012 |
| How does TexQtic settle with D2C sellers? | PARKED — D-012 |
| Who issues the invoice to the D2C buyer? | PARKED — D-012 |
| How is GST (B2C retail via D2C seller) handled? | PARKED — needs CA review |

### 7.3 D2C Commission Model (PARKED — D-014)

| Question | Status |
|---|---|
| Does TexQtic take a % commission on D2C seller transactions? | PARKED — D-014 |
| Is commission deducted at payout, or invoiced separately? | PARKED — D-014 |
| What is the commission rate structure for D2C sellers? | PARKED — D-014 |
| Does commission vary by seller tier or product category? | PARKED — D-014 |

### 7.4 D2C First Family Implications

A D2C authenticated family cycle may proceed WITHOUT resolving D2C transaction methodology IF:
- The family cycle scope is limited to seller authentication, basic storefront management, or
  catalog management — not checkout, payment, settlement, or commission
- The family cycle explicitly records in its opening that D2C commerce is NOT in scope
- No payment gateway, settlement logic, commission deduction, or invoice issuance is included

---

## 8. Commission and Deduction Policy

### 8.1 Current Policy Position

**No commission or deduction policy exists for any TexQtic commerce surface as of this document.**

No commission rates, commission calculation logic, deduction timing, payout waterfall, or
settlement split rules have been decided for B2B, B2C, or D2C surfaces.

### 8.2 B2B Commission Policy (PARKED)

Per §5, B2B transactions do not flow through TexQtic in MVP. Therefore:
- No B2B transaction commission is relevant in MVP
- Post-MVP B2B commission model (if TTP-gated flow enables it) is PARKED
- Offline success fee or referral fee is feasible but must be manually invoiced

### 8.3 B2C Commission Policy (PARKED — D-014)

B2C commission policy is fully parked. It cannot be decided until D-012 (merchant-of-record)
resolves. A referral/platform model requires a different commission structure than a
merchant-of-record model.

### 8.4 D2C Commission Policy (PARKED — D-014)

D2C commission policy is fully parked. Same dependency on D-012 as B2C.

### 8.5 Platform Subscription Fee (CONFIRMED — FREE AT PILOT)

The only confirmed TexQtic monetization mechanism at pilot is:
- Platform subscription fee = FREE for MVP pilot tenants (PRIT-018 confirmed POST_MVP for
  self-serve; FREE/manual provisioning at pilot)

This will change post-MVP when self-serve tier billing is introduced via FAM-11 and a future
SUBSCRIPTION-TIER-ENTITLEMENT-DESIGN-001 unit.

---

## 9. Impact on Family Cycle Sequencing and First Family Selection

### 9.1 First Authenticated Family Guidance

Paresh has confirmed the first authenticated family cycle should be B2C or D2C authenticated
section — NOT the public pages (which are already PRODUCTION_VERIFIED).

This methodology document now provides the required commerce/payments clarification that
enables the first authenticated family selection to proceed.

### 9.2 Which Authenticated Families Can Proceed Without Commerce Decisions

The following authenticated families CAN open their cycles without requiring D-011/D-012/D-013/
D-014 to resolve first:

| Family | Reason D-012 Not Blocking |
|---|---|
| FAM-06 — Auth and Session Management | Auth/session is not a commerce surface |
| FAM-07 — Tenant Onboarding and Invite | Onboarding is not a commerce surface |
| FAM-08 — Tenant Core Workspace | Core workspace is not a commerce surface |
| FAM-09 — Supplier Profile and Catalog | Catalog management is not a commerce surface |
| FAM-10 — Platform Ops and Control Plane | Control plane ops are not commerce |
| FAM-11 — Subscription and Commercial Gating | FAM-11 requires only FREE/manual gating for pilot; not self-serve billing |

All six families above require Layer 0 authorization before their cycles can open, per the
active `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` posture.

### 9.3 Which Authenticated Families CANNOT Proceed Until Commerce Decisions Resolve

| Family | Blocking Decision |
|---|---|
| Authenticated B2C checkout (no existing family) | D-012 (merchant-of-record), D-014 (commission) |
| Authenticated D2C storefront commerce | D-012, D-014 |
| FAM-15 — Invoices and Settlement | D-012, D-014, merchant/settlement model |
| FAM-16 — TradeTrust Pay | HOLD_FOR_COUNSEL_FEEDBACK (not D-012) |

### 9.4 Recommended First Authenticated Family

After this methodology is established, the most appropriate first authenticated family cycle
is one of: FAM-06 (Auth and Session), FAM-07 (Tenant Onboarding), or FAM-08 (Tenant Core
Workspace) — these are P0 LAUNCH_BLOCKER families that do not require payment decisions
and have the highest launch criticality.

The exact selection is determined in the next unit: TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001.

---

## 10. Decision Summary Table

| Decision ID | Topic | Status | Owner | Condition to Resolve |
|---|---|---|---|---|
| CONFIRMED | B2B no-platform-financial-transaction boundary (MVP) | CONFIRMED_GUARDRAIL | — | Constitutional; cannot be weakened |
| CONFIRMED | Pilot subscription = FREE, operator-provisioned | CONFIRMED | Paresh | PRIT-018 confirmed POST_MVP |
| CONFIRMED | B2C public checkout is downstream-authenticated | CONFIRMED | Paresh | TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1.md |
| D-011 | Subscription tier pricing, entitlement model, self-serve billing | PARKED | Paresh | Post-MVP; counsel/CA for SaaS GST; Razorpay account |
| D-012 | Merchant-of-record / settlement model for B2C and D2C | PARKED | Paresh + Counsel/CA | Before any checkout implementation |
| D-013 | B2C commission/deduction policy | PARKED | Paresh + Counsel/CA | After D-012 resolves |
| D-014 | D2C commission/deduction policy | PARKED | Paresh + Counsel/CA | After D-012 resolves |
| D-015 | Razorpay / payment gateway platform adoption decision | PARKED | Paresh + Counsel/CA | After D-012, prerequisites in §4.3 |
| PRIT-028 | Subscription tiers and entitlement model (design unit) | DESIGN_GATED — FAM-11 | Paresh | Post-MVP; D-011 |
| PRIT-029 | Razorpay/payment gateway methodology (design unit) | DESIGN_GATED | Paresh | D-015 + §4.3 prerequisites |
| PRIT-030 | B2B no-platform-financial-transaction boundary (guardrail unit) | CONFIRMED_BOUNDARY | — | Constitutional |
| PRIT-031 | Commission/deduction methodology (design unit) | DESIGN_GATED | Paresh | D-013 / D-014 |

---

## 11. Guardrails for All Future Commerce-Adjacent Family Cycles

Any family cycle that intersects commerce, payment, subscription, commission, or financial
transaction must record compliance with the following guardrails in its opening section:

1. **B2B no-money-movement guardrail:** The family cycle must NOT implement B2B financial
   transaction collection, escrow, or commission deduction. If the cycle scope requires it,
   it must stop and report before proceeding.

2. **Razorpay / payment gateway freeze:** No payment gateway SDK, API integration, or
   webhook/callback endpoint may be added without first satisfying all prerequisites in §4.3
   and receiving explicit Paresh authorization.

3. **Merchant-of-record freeze (D-012):** No checkout, settlement, or invoice issuance
   implementation may proceed for B2C or D2C until D-012 is resolved and Paresh authorizes.

4. **Commission freeze (D-013/D-014):** No commission calculation, deduction timing, or payout
   waterfall implementation may proceed until D-013/D-014 are resolved.

5. **Subscription billing freeze (D-011):** No self-serve subscription billing, Razorpay
   subscription API, or in-product plan upgrade flow may be implemented until D-011 is
   resolved and post-MVP authorization is given.

6. **No implicit assumptions:** A family cycle must not assume any parked decision in its
   favor. If a decision is parked, the family cycle must treat it as absent and proceed only
   with what is confirmed.

---

## 12. Related Documents

| Document | Relationship |
|---|---|
| `TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1.md` | Decided: B2C public checkout boundary |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | D-011 through D-015 live here |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-028 through PRIT-031 live here |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | Future design units for payment/commerce |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | R-008 through R-012 — commerce risks |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-11/FAM-15/FAM-16 family sequencing |
| `governance/control/NEXT-ACTION.md` | B2B no-money-movement confirmed; Layer 0 posture |
| `governance/control/BLOCKED.md` | TTP HOLD_FOR_COUNSEL_FEEDBACK; other active holds |
| `governance/analysis/TEXQTIC-SUBSCRIPTION-SLICE-4A-CLOSEOUT-SNAPSHOT-2026-04-15.md` | Plan tier infrastructure (FREE/STARTER/PROFESSIONAL/ENTERPRISE) |
| `TECS.md` | Lifecycle authority for all governed implementation units |

---

## 13. Planned Requirements Cross-Reference (PRIT-028–PRIT-031)

| PRIT ID | Topic | Status | Source family |
|---|---|---|---|
| PRIT-028 | Subscription tiers and entitlement model | DESIGN_GATED — POST_MVP | FAM-11 |
| PRIT-029 | Razorpay/payment gateway methodology for B2C/D2C | DESIGN_GATED | Future B2C/D2C commerce family |
| PRIT-030 | B2B no-platform-financial-transaction boundary (guardrail) | CONFIRMED_BOUNDARY | FAM-12/FAM-16 guardrail |
| PRIT-031 | Commission/deduction methodology across B2B/B2C/D2C | DESIGN_GATED | FAM-11/FAM-15/FAM-16 |

---

## 14. Future Design Units Required

The following governance design units will need to be created (in order, when triggered):

1. **SUBSCRIPTION-TIER-ENTITLEMENT-DESIGN-001** — Tier pricing, entitlement enforcement per
   plan, self-serve upgrade/downgrade flows. Trigger: post-MVP, after D-011 resolves.

2. **RAZORPAY-PAYMENT-GATEWAY-DESIGN-001** — Razorpay integration design (SDK choice, webhook
   security, PCI boundary, event audit). Trigger: after D-015 resolves and §4.3 prerequisites met.

3. **B2C-D2C-CHECKOUT-PAYMENT-DESIGN-001** — Authenticated checkout flow design for B2C
   shoppers and D2C buyers. Trigger: after D-012 resolves and Layer 0 authorization granted.

4. **COMMISSION-DEDUCTION-POLICY-DESIGN-001** — Commission model, deduction timing, and payout
   waterfall for B2C/D2C. Trigger: after D-013/D-014 resolve.

5. **B2B-FINANCIAL-BOUNDARY-GUARDRAIL-001** — Formal guardrail enforcement unit. Documents
   the B2B no-money-movement boundary in runtime code and audit checks. Trigger: when FAM-12
   or FAM-15 family cycle opens.

---

## 15. Methodology Version and Update Policy

| Version | Date | Unit | Change |
|---|---|---|---|
| 1.0 | 2026-05-19 | TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001 | Initial methodology established |

This document is updated only by a formal TECS governance unit. It must not be edited
informally. Any addition or revision requires a new unit and a new version row.

The parked decisions (D-011 through D-015) are updated in `DECISION-PARKING-LOT.md`.
The PRIT rows (PRIT-028 through PRIT-031) are updated in `PLANNED-REQUIREMENTS-INTAKE.md`.
