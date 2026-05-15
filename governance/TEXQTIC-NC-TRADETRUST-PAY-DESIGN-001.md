# TEXQTIC-NC-TRADETRUST-PAY-DESIGN-001
## TradeTrust Pay Design — Payment-Term Maturity, Payable Visibility, and External Settlement Confirmation

| Field | Value |
|---|---|
| **Document ID** | TEXQTIC-NC-TRADETRUST-PAY-DESIGN-001 |
| **Type** | Design / Governance Authority (no implementation) |
| **Date** | 2026-07-05 |
| **Status** | DESIGN_COMPLETE |
| **Author** | Paresh Patel / TexQtic |
| **Authorized by** | Paresh Patel (explicit prompt authorization, 2026-07-05) |
| **Prerequisite** | TEXQTIC-NC-PHASE1-CLOSE-AUDIT-001 AUDIT_COMPLETE (2026-07-05) |
| **Replaces / supersedes** | TEXQTIC-NC-OES-ESCROW-DESIGN-001 (escrow-first framing — SUPERSEDED_REFRAMED) |
| **Commit** | docs(network-commerce): design tradetrust pay finance state layer |

> **Governance-only document. No source, schema, migration, frontend, test, or env changes.**
> **No feature flag activation. `ttp_enabled` remains `false`. All holds unchanged.**

---

## Table of Contents

1. [Doctrine](#1-doctrine)
2. [Why Escrow-First Is Superseded](#2-why-escrow-first-is-superseded)
3. [Textile Payment-Term Model](#3-textile-payment-term-model)
4. [Payment Maturity Concepts](#4-payment-maturity-concepts)
5. [Payable Visibility](#5-payable-visibility)
6. [External Settlement Confirmation](#6-external-settlement-confirmation)
7. [Finance-Readiness Signals](#7-finance-readiness-signals)
8. [External Partner Routing Readiness](#8-external-partner-routing-readiness)
9. [OES/VCO Implications](#9-oesvco-implications)
10. [Legal / Compliance Guardrails](#10-legal--compliance-guardrails)
11. [Relationship to Existing TTP Infrastructure](#11-relationship-to-existing-ttp-infrastructure)
12. [Future Packet Map](#12-future-packet-map)
13. [Authority Sources](#13-authority-sources)
14. [Invariants Confirmed Unchanged](#14-invariants-confirmed-unchanged)

---

## 1. Doctrine

### 1.1 What TexQtic Is (within TradeTrust Pay)

TradeTrust Pay defines TexQtic's role in the post-fulfilment, settlement-visibility layer of
Network Commerce. TexQtic is:

| Role | Description |
|---|---|
| **Verified trade-state system of record** | Records and maintains the authoritative state of a trade: pool lifecycle, RFQ outcome, order confirmation, delivery events, quality/compliance state, invoice status |
| **Payable visibility layer** | Computes and surfaces the split of what is payable to each participant, based on verified trade-state milestones and contractual allocation percentages |
| **Payment-term maturity layer** | Tracks B2B textile payment terms against lifecycle milestones and computes whether the payable has matured, is due, or is overdue |
| **External settlement confirmation layer** | Accepts and records confirmation from buyers or suppliers that external settlement (bank transfer, trade finance disbursement, etc.) has occurred — without TexQtic executing the payment |
| **Finance-readiness layer** | Computes advisory-only signals indicating whether the verified trade-state meets configurable criteria relevant to third-party finance partner assessment |
| **External partner routing readiness layer** | Assembles the state package (verified invoice, buyer confirmation, delivery state, quality state, compliance state, consent) that a future finance partner integration could consume — without TexQtic acting as intermediary, guarantor, or transmitter of funds |

### 1.2 What TexQtic Is Not (absolute prohibitions)

These are not deferred design decisions. They are permanent exclusions from TexQtic's product
scope under TradeTrust Pay:

| Prohibited Role | Why Excluded |
|---|---|
| Payment executor | TexQtic does not move funds of any kind |
| Payment service provider (PSP) | TexQtic is not a payment platform |
| Escrow custodian | TexQtic does not hold funds in trust or custody |
| Escrow release authority | TexQtic does not trigger fund disbursement from an escrow it holds |
| Lender | TexQtic does not provide capital, credit, or financing |
| Credit bureau or credit scorer | TexQtic's finance-readiness signals are advisory-only platform indicators |
| Guarantor | TexQtic does not guarantee payment by any party |
| Insurance / surety provider | TexQtic does not underwrite risk |
| Supplier advance funder | TexQtic does not pre-fund suppliers against future invoices |
| NBFC / regulated financial entity | TexQtic does not seek or hold NBFC, SEBI, RBI, or equivalent registration under this doctrine |
| Platform holding money | TexQtic's monetary fields represent settlement instructions and visibility records, not custody balances |

### 1.3 Core Doctrine Statement

> **TexQtic acts as a verified trade-state and payable-visibility system of record.**
> Buyers and suppliers settle externally via their own banking relationships, trade finance
> arrangements, and payment instruments. TexQtic records the state of the trade, computes the
> payable split, tracks payment-term maturity, and surfaces advisory finance-readiness signals.
> It does not participate in, guarantee, hold custody of, or execute settlement.
>
> *Authority: TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md §15:*
> *"TexQtic does not hold funds, lend capital, or underwrite credit.
> All settlement is trigger-only. Licensed financial partners execute movement."*

### 1.4 Origin of the TradeTrust Pay Name

The TradeTrust Pay concept within TexQtic aligns with the philosophy of trade documentation
verification and payment-term visibility in B2B trade — analogous to how verified trade
documents (bills of lading, letters of credit, invoices) establish entitlement to payment in
the physical trade world. TexQtic's TradeTrust Pay is the digital equivalent of this concept
applied to B2B textile Network Commerce: verified trade state creates the basis for external
payment, which TexQtic documents and confirms, without TexQtic executing it.

---

## 2. Why Escrow-First Is Superseded

### 2.1 The Previous Framing

The Phase 0 validation report (TEXQTIC-NC-PHASE0-VALIDATION-REPORT-001.md) flagged
"multi-party escrow" (Seam 0-E) as requiring a design unit (`TEXQTIC-NC-OES-ESCROW-DESIGN-001`)
before Phase 2 OES could proceed. This framing assumed that pool/syndicate settlement would
naturally route through a platform-held multi-party escrow account.

### 2.2 Why That Framing Does Not Apply to B2B Textile Trade

| Factor | Escrow-First Model | TradeTrust Pay Model |
|---|---|---|
| Payment term range | Requires capital to be locked from T+0 | Supports 5–100+ day open-account terms |
| Capital cost | Buyer capital locked for 30–90+ days in escrow | No capital locked; payment occurs at external maturity |
| Market expectation | Escrow is rare in B2B textile; unusual requirement | Open-account trade is the norm; payment terms are relationship-based |
| Trust model | Trust via escrow custody | Trust via verified trade-state record |
| Regulatory exposure | Platform-held escrow may require NBFC / custodian licensing | Visibility + confirmation model has lower regulatory surface |
| Supplier preference | Suppliers may prefer early payment from a funder | Suppliers prefer confirmed payment-term clarity without capital lockup |
| Buyer preference | Buyers resist escrow due to working capital cost | Buyers prefer trade on open terms with digital payment-term tracking |

### 2.3 Disposition of Escrow-First Candidate

- `TEXQTIC-NC-OES-ESCROW-DESIGN-001` is **SUPERSEDED_REFRAMED** (2026-07-05).
- The `escrow.service.ts` bilateral escrow model remains in the codebase for existing
  bilateral trade escrow contexts. It is **not** removed or modified by this design.
- Future Phase 2 OES (syndicates) will be designed under TradeTrust Pay doctrine —
  payable visibility and external settlement confirmation, not platform-held multi-party escrow.
- See section 9 (OES/VCO Implications).

---

## 3. Textile Payment-Term Model

### 3.1 Scope

This section defines the conceptual model for capturing and reasoning about B2B textile payment
terms in the context of Network Commerce pools, syndicates, and VCO chains.

**Design only. No schema, migration, or service implementation in this packet.**

### 3.2 B2B Textile Payment Term Taxonomy

B2B textile payment terms are not uniform. They vary across multiple axes:

| Axis | Examples |
|---|---|
| **Textile segment** | Yarn / fabric / garments / home textile / technical textiles — each has different typical terms |
| **Buyer-supplier relationship maturity** | New relationship: shorter terms or upfront. Long-term: 45–90+ days net |
| **Invoice type** | Pro-forma (advance), commercial invoice (post-shipment), sight draft, usance draft |
| **Payment anchor** | Invoice date, shipment date (B/L date), delivery date, acceptance date, custom clearance date |
| **Milestone dependency** | Terms may require quality gate pass, buyer sign-off, or delivery confirmation before the clock starts |
| **Export/import compliance** | Letter of Credit terms, export benefit realization, import duty compliance — all can delay effective maturity |
| **Trade finance instrument** | LC (at sight vs. usance), DA (documents against acceptance), DP (documents against payment), open account |
| **Buyer credit history** | Historical payment reliability may modify actual settlement behavior |
| **Production stage** | Advance for yarn, milestone payment for weaving/finishing, final payment on delivery |
| **Quality/compliance hold** | Terms may be suspended pending quality dispute or compliance certification |

### 3.3 Configurable Term Model (Not Hardcoded Policy)

TexQtic does not hard-code commercial payment term values as product policy. The model
treats payment terms as configurable data attached to each pool order or invoice.

This means:
- No "default 30 days" baked into product code
- No assumption that "net 45" applies to all textile segments
- No assumption that delivery date is always the anchor
- Terms are specified per-pool, per-order, or per-invoice as configured by the pool admin

### 3.4 Payment Term Field Taxonomy (Conceptual)

The following fields define a payment term record (future data model — not implemented in this packet):

| Conceptual Field | Type | Description |
|---|---|---|
| `payment_terms_days` | integer (nullable) | Number of days from anchor to due date. Null = not yet set |
| `payment_anchor_event` | enum | The event that starts the payment clock (see 3.5) |
| `payment_anchor_date` | timestamp (nullable) | Resolved anchor date once the anchor event occurs |
| `payment_due_date` | timestamp (nullable) | Computed: anchor_date + payment_terms_days + grace_period_days |
| `grace_period_days` | integer | Grace period before OVERDUE status |
| `maturity_status` | enum | Current maturity state (see 4.2) |
| `external_settlement_confirmed_at` | timestamp (nullable) | When external settlement confirmation was recorded |
| `external_settlement_reference` | varchar (nullable) | Bank/ERP/partner reference for external settlement |
| `hold_reason` | varchar (nullable) | Reason payment is on hold (dispute, compliance, quality) |
| `finance_readiness_status` | enum | Advisory finance-readiness signal (see 7.2) |

### 3.5 Payment Anchor Events

| Anchor Key | Description |
|---|---|
| `INVOICE_DATE` | Payment clock starts when invoice is issued |
| `SHIPMENT_DATE` | Payment clock starts when shipment is dispatched (B/L date) |
| `DELIVERY_DATE` | Payment clock starts when buyer confirms delivery |
| `ACCEPTANCE_DATE` | Payment clock starts when buyer formally accepts the goods |
| `QUALITY_PASS_DATE` | Payment clock starts when quality gate passes |
| `CUSTOM_CLEARANCE_DATE` | Payment clock starts when import customs clearance occurs |
| `MILESTONE_DATE` | Payment clock starts at a configurable production milestone |

---

## 4. Payment Maturity Concepts

### 4.1 Maturity Lifecycle Overview

```
NOT_APPLICABLE
    │
    ▼ (invoice issued; payment terms set)
TERMS_PENDING
    │
    ▼ (anchor event occurs)
TERM_ACTIVE
    │
    ├──▶ (within grace window of due date)
    │         DUE_SOON
    │              │
    ▼              ▼
   DUE ◀──────────
    │
    ├──▶ (external confirmation received)
    │         EXTERNALLY_CONFIRMED (terminal success)
    │
    ├──▶ (grace period expires without confirmation)
    │         OVERDUE
    │              │
    │              └──▶ (dispute opened)
    │                       DISPUTED
    │
    └──▶ (hold applied — quality/compliance/legal)
              BLOCKED
```

### 4.2 Maturity Status Enumeration

| Status | Description |
|---|---|
| `NOT_APPLICABLE` | Payment terms not applicable to this record (e.g., advance-paid, internal transfer) |
| `TERMS_PENDING` | Invoice issued; payment terms set; anchor event not yet occurred |
| `TERM_ACTIVE` | Anchor event has occurred; payment clock is running; due date is in the future |
| `DUE_SOON` | Configurable warning window before due date (e.g., 5 days before due) |
| `DUE` | Payment due date has been reached; external settlement not yet confirmed |
| `OVERDUE` | Grace period has expired; external settlement not confirmed; escalation may apply |
| `EXTERNALLY_CONFIRMED` | Buyer or supplier has confirmed external settlement occurred; reference recorded |
| `DISPUTED` | Active dispute affecting settlement maturity; maturity clock paused |
| `BLOCKED` | Quality hold, compliance hold, or legal hold preventing maturity progression |

### 4.3 Maturity Invariants

- `EXTERNALLY_CONFIRMED` is a terminal success state. It does not imply TexQtic executed a
  payment — it records that a party confirmed external payment occurred.
- `OVERDUE` is a state TexQtic records for visibility and escalation purposes. TexQtic has no
  legal obligation arising from OVERDUE status and does not guarantee recovery.
- Maturity status transitions are append-only to the lifecycle log (G-020 doctrine applies).
- Only TexQtic's verified trade-state events can advance maturity status. Self-reported buyer
  declarations alone are insufficient without corroborating verified trade-state.

---

## 5. Payable Visibility

### 5.1 What Payable Visibility Means

Payable visibility is the TexQtic-computed view of what each participant in a pool, syndicate,
or VCO chain is owed based on:

- The verified trade-state (what was ordered, delivered, quality-passed, allocated)
- The configured waterfall (platform fee, coordinator fee, per-member split)
- The payment terms status (maturity, hold, dispute)

**Payable visibility is not:**
- An accounting ledger of funds held by TexQtic
- A promise to pay by TexQtic
- A balance sheet item
- A claim against TexQtic

### 5.2 Relationship to Current NetworkSettlementSplit

The `NetworkSettlementSplit` entity (Phase 1 TEXQTIC-NC-PHASE1-POOL-SETTLE-001) is the first
implementation of payable visibility in Network Commerce.

| Field | Current State | TradeTrust Pay Interpretation |
|---|---|---|
| `status = PENDING` | **Safe baseline state** | Payable computed; visibility available; no external action triggered |
| `status = TRIGGERED` | Schema-reserved | Requires future TradeTrust Pay doctrine review before any activation. Represents intent to trigger external partner action — NOT TexQtic executing a payment |
| `status = RELEASED` | Schema-reserved | Records that financial partner confirmed disbursement occurred — NOT TexQtic releasing funds from custody |
| `status = FAILED` | Schema-reserved | Records that external partner action failed — NOT a TexQtic-held fund failure |
| `escrow_account_id = null` | **Current state** | No escrow account linked. Escrow-first model is superseded. Future: may link to a TTP Verified Payment Certificate, not a custodial escrow |

### 5.3 No Platform Liability Arises from Payable Visibility

TexQtic's computation of a payable split creates no financial obligation on TexQtic's part.
The split is informational — it shows participants what should flow externally.

Quote from TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md §15.5:
> "No monetary fields in TexQtic represent held funds; they represent settlement instructions."

This doctrine extends to all TradeTrust Pay payable visibility records.

---

## 6. External Settlement Confirmation

### 6.1 Purpose

External settlement confirmation is the mechanism by which a buyer or supplier can record in
TexQtic that external payment has occurred, without TexQtic executing that payment.

**This is analogous to marking an invoice "paid" in an ERP system — the marking does not
mean the ERP executed the bank transfer; it records that it happened externally.**

### 6.2 Confirmation Input Types (Future Design)

The following confirmation types are conceptually valid. Their specific schemas and routes
are deferred to future implementation packets (`TEXQTIC-NC-TRADETRUST-PAY-EXTERNAL-CONFIRMATION-001`):

| Confirmation Type | Description |
|---|---|
| **Manual confirmation** | A buyer or authorized admin confirms payment occurred via a TexQtic UI action |
| **External bank reference** | A bank transaction reference number / UTR / SWIFT reference submitted as evidence |
| **ERP reference** | A buyer-side ERP payment record reference (PO number, payment voucher, etc.) |
| **Document upload** | A payment receipt, remittance advice, or bank statement (document handling is future) |
| **Counterparty acknowledgement** | The receiving party (supplier) acknowledges receipt of payment |
| **Finance partner callback** | A partner API callback confirming disbursement (future — requires partner contract, legal review, and consent framework) |

### 6.3 What Confirmation Does Not Imply

A recorded external settlement confirmation:
- Does NOT mean TexQtic verified the bank transfer independently
- Does NOT constitute an audit or accounting opinion
- Does NOT mean TexQtic holds any responsibility for the accuracy of the confirmation
- Does NOT create a financial obligation on TexQtic
- Is informational and advisory only

### 6.4 Confirmation Workflow Guardrails

- Only authenticated, tenancy-scoped parties (buyer org or supplier org) may submit confirmation
  for their own side of the settlement.
- `org_id` scoping applies to all confirmation routes (constitutional tenancy doctrine).
- Confirmation is append-only to the lifecycle log.
- Once confirmed, status transitions to `EXTERNALLY_CONFIRMED` — this is not reversible except
  via a formal dispute process.

---

## 7. Finance-Readiness Signals

### 7.1 What Finance-Readiness Signals Are

Finance-readiness signals are advisory-only indicators computed from verified trade-state data.
They answer the question: "Based on what TexQtic has verified, does this trade meet a
configurable set of criteria that a third-party finance partner typically looks for?"

They are:
- Computed from TexQtic-verified events (delivery, quality pass, invoice status, dispute state)
- Advisory only — they are not credit scores, approval decisions, or guarantees
- Internal platform signals — not yet exposed to tenants or partners (gated)
- Configurable — the criteria set is not baked into product code

### 7.2 Finance-Readiness Status Enumeration

| Status | Description |
|---|---|
| `NOT_ASSESSED` | Assessment not yet run or criteria not met to trigger assessment |
| `CRITERIA_INCOMPLETE` | One or more required signals are absent (e.g., delivery not confirmed) |
| `READY_FOR_ASSESSMENT` | All base criteria met; trade state is clean; no blocks |
| `ASSESSMENT_IN_PROGRESS` | Assessment process running (future: may involve external data) |
| `READY` | All configured criteria satisfied; advisory signal is "ready" |
| `NOT_READY` | One or more criteria explicitly failed |
| `BLOCKED` | Quality hold, compliance hold, dispute, or legal hold |
| `EXPIRED` | Prior READY assessment has lapsed beyond configurable validity window |

### 7.3 Finance-Readiness Signal Criteria (Illustrative, Not Exhaustive)

| Signal | Description |
|---|---|
| `invoice_verified` | Invoice is recorded, associated with a verified trade, and status is confirmed |
| `buyer_confirmed` | Buyer has confirmed delivery or acceptance in TexQtic |
| `delivery_confirmed` | Delivery event recorded in lifecycle log |
| `quality_compliance_passed` | Quality gate (when configured) has passed |
| `dispute_absent` | No active dispute on this trade/pool/invoice |
| `payment_term_active` | Payment anchor event has occurred; term is running (not blocked) |
| `counterparty_history_signal` | Advisory signal based on historical settlement completion on TexQtic |

### 7.4 Strict Prohibitions on Finance-Readiness

These are not deferred — they are permanently excluded:

| Prohibited | Why |
|---|---|
| Credit score | TexQtic is not a credit bureau |
| Lending decision | TexQtic is not a lender |
| Payment guarantee | TexQtic does not guarantee payment |
| Approval for finance | TexQtic does not approve or reject finance applications |
| Promise that external partner will fund | TexQtic has no authority over partner decisions |
| TexQtic-funded advance | TexQtic does not pre-fund suppliers |
| CIBIL, GSTN, or AA data inference | Not implemented; requires government agreement and consent framework |
| Insurance opinion | Not in scope without separate legal review |

### 7.5 Advisory Disclaimer (from existing TTP infrastructure)

The existing `TTP_DISCLAIMER_TEXT` constant (governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md):

> *"TradeTrust Pay readiness signals are informational and advisory only.
> They are not a credit score, financing approval, payment guarantee, lending decision,
> or partner commitment."*

This disclaimer applies to all finance-readiness signals in Network Commerce.

---

## 8. External Partner Routing Readiness

### 8.1 Purpose

External partner routing readiness defines the state package that must be assembled before
any future integration with an external finance partner (trade finance bank, NBFC, FINTRACT
operator, invoice discounting platform, etc.) can be attempted.

**No API integration is implemented in this packet.**
**Partner routing activation requires: partner contract, legal counsel sign-off, Paresh approval,
consent framework design, and a separate explicit implementation prompt.**

### 8.2 Routing Readiness Package Concept

A routing-ready payable package contains:

| Component | Description |
|---|---|
| Verified invoice | Invoice record confirmed in TexQtic with verified trade linkage |
| Buyer confirmation | Buyer-side delivery/acceptance confirmation recorded |
| Supplier consent | Supplier's recorded consent for data sharing with a named partner |
| Buyer consent | Buyer's recorded consent (where applicable) |
| Finance-readiness signal | At least `READY` status on all configured criteria |
| Payable split record | `NetworkSettlementSplit` in `PENDING` state (not yet triggered) |
| Compliance state | No active quality hold, dispute, or legal block |
| Partner eligibility flag | Per-org feature override enabling partner routing for this org |

### 8.3 What Routing Readiness Does Not Mean

Assembling a routing-ready package:
- Does NOT transmit any data to any external partner
- Does NOT constitute consent (consent must be separately designed and legally reviewed)
- Does NOT guarantee partner acceptance or funding
- Does NOT commit TexQtic to executing any action
- Does NOT change the no-money-movement policy

### 8.4 Current State

All partner routing is gated. The existing TTP infrastructure (`ttp_enabled = false`) ensures
no partner routing occurs. The `GET /api/control/ttp/routing-stubs/:vpcId` route exists as
an admin stub only; it does not execute partner transmission.

When and if partner routing is activated for Network Commerce, it will require:
1. Separate TradeTrust Pay implementation packet (`TEXQTIC-NC-TRADETRUST-PAY-EXTERNAL-CONFIRMATION-001` or successor)
2. Consent framework design
3. Legal counsel sign-off on all wording
4. Explicit Paresh authorization prompt
5. Partner contract in place

---

## 9. OES/VCO Implications

### 9.1 Phase 2 OES — Order Execution Syndicates

The previous Phase 2 OES design assumed multi-party escrow as the settlement mechanism
(TEXQTIC-NC-OES-ESCROW-DESIGN-001). This assumption is superseded.

**TradeTrust Pay doctrine for OES:**

| OES Aspect | Escrow-First (Superseded) | TradeTrust Pay |
|---|---|---|
| Settlement model | Platform-held multi-party escrow | Payable visibility + external settlement confirmation |
| Holdback | Escrow sub-account | TTP holdback record (visibility only; release confirmed externally) |
| Quality gate failure | Escrow deduction trigger | Quality hold → `BLOCKED` maturity status; payable adjustment recorded |
| Performance bond | Escrow holdback | TTP bond record (visibility only; forfeiture recorded; no TexQtic custody) |
| Syndicate coordinator fee | Escrow disbursement | Waterfall split in payable visibility; external routing readiness |

OES Phase 2 implementation packets should be designed under TradeTrust Pay doctrine.
`TEXQTIC-NC-OES-TRADETRUST-PAY-ADAPTATION-001` is the proposed future design unit for
this adaptation (HOLD_FOR_PARESH_DECISION — not opened here).

### 9.2 Phase 3 VCO — Value Chain Orchestration

VCO settlement and per-stage payable computation should likewise use:
- TTP payable visibility for stage values
- TTP payment-term maturity per stage
- TTP external settlement confirmation per stage
- TTP finance-readiness signals aggregated across the chain

No multi-stage escrow custody. No platform-held DPP bond funds.
`TEXQTIC-NC-VCO-TRADETRUST-PAY-ADAPTATION-001` is the proposed future design unit
(HOLD_FOR_PARESH_DECISION — not opened here).

### 9.3 DPP Integration

DPP (Digital Product Passport) is on `HOLD_FOR_PARESH_DECISION` and is not affected by this
design. When DPP and VCO are eventually joined, the TradeTrust Pay finance-state layer
should be designed to use DPP verification events as anchor events for payment-term maturity
(e.g., DPP-verified delivery = `DELIVERY_DATE` anchor confirmed).

**DPP status unchanged. DPP remains HOLD_FOR_PARESH_DECISION.**

### 9.4 What This Design Does Not Open

- Phase 2 OES slices: NOT_STARTED — unchanged
- Phase 3 VCO slices: NOT_STARTED — unchanged
- Any schema change
- Any migration
- Any implementation packet

---

## 10. Legal / Compliance Guardrails

### 10.1 Indian Regulatory Boundaries

| Regulatory Area | TexQtic Posture |
|---|---|
| **NBFC registration (RBI)** | TexQtic does not lend, advance funds, or accept deposits. No NBFC registration triggered by TradeTrust Pay design. |
| **Payment aggregator / PSP (RBI)** | TexQtic does not aggregate payments. No PA/PG license required under this doctrine. |
| **SEBI / securities law** | TexQtic does not offer investment products or securities. Not applicable. |
| **DPDP / data localisation** | Consent framework and partner data-sharing require separate legal design before implementation. This design does not implement consent or data sharing. |
| **Account Aggregator (AA) framework** | No AA integration in this design. Live external data (GSTN, CIBIL, AA) requires government agreement and consent design before implementation. |
| **Trade finance regulations** | TexQtic facilitates visibility and routing readiness. Actual trade finance instruments (LC, DA, DP) are operated by the licensed bank/NBFC partner — not TexQtic. |

### 10.2 External Legal Counsel Requirement

Before any tenant-visible or partner-visible surface of TradeTrust Pay is activated:
- External legal counsel review packet (`TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md`) must receive
  written counsel sign-off.
- All advisory wording (disclaimers, signal labels, band labels) must be counsel-approved.
- Consent wording must be separately designed and legally reviewed.

This requirement applies equally to any TradeTrust Pay surface in Network Commerce.

### 10.3 Forbidden Wording

These phrases must never appear in user-facing TradeTrust Pay surfaces without explicit
legal counsel approval:

- "Approved for financing"
- "Eligible for loan"
- "Guaranteed payment"
- "Credit approved"
- "TexQtic will pay"
- "Escrow protected"
- "Funds secured"
- "Advance available"
- "Instant payout"
- Any variant of "credit score" without approved disclaimers

### 10.4 Approved Disclaimer (from TTP infrastructure)

The following disclaimer text is approved for internal use and is awaiting legal review
for tenant-visible surfaces:

> *"TradeTrust Pay readiness signals are informational and advisory only. They are not a
> credit score, financing approval, payment guarantee, lending decision, or partner commitment."*

Source: `TTP-ACTIVATION-ROLLBACK-RUNBOOK-001.md §E.2.1`, `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md §3.1`

---

## 11. Relationship to Existing TTP Infrastructure

### 11.1 Existing TTP Components (ttp_enabled=false, all gated)

TradeTrust Pay already has significant implementation infrastructure in the repo, all behind
`ttp_enabled = false`:

| Component | Location | Status | Relevance to NC TTP |
|---|---|---|---|
| Per-org scoped gate middleware | `server/src/plugins/` | `TRUTH_SYNCED` | Gate model reusable for NC TTP surfaces when authorized |
| QA sentinel isolation | Schema column `is_qa_sentinel` | `TRUTH_SYNCED` | QA testing model for NC TTP activation |
| Structured Pino log events | Server services | `TRUTH_SYNCED` | Log event taxonomy reusable |
| Advisory disclaimer constants | Service constants | `TRUTH_SYNCED` | Disclaimer text applies to NC TTP finance-readiness signals |
| VPC (Verified Payment Certificate) | Admin routes | Stub only | Concept applicable to NC TTP routing-readiness package |
| TexQticScore compute | Control-plane service | Backend/admin only | Score model may inform NC TTP finance-readiness signal design |
| Activation/rollback runbook | `governance/runbooks/TTP-ACTIVATION-ROLLBACK-RUNBOOK-001.md` | `TRUTH_SYNCED` | Runbook model applies to NC TTP activation when authorized |

### 11.2 How NC TTP Relates to Existing TTP

The existing TradeTrust Pay infrastructure was designed for bilateral trade
(buyer ↔ supplier 1:1 trade, via `trades` table). Network Commerce TTP extends this
concept to multi-party pool/syndicate/VCO contexts.

When NC TTP implementation packets are authorized, they should:
- Reuse the gate middleware and disclaimer constants from existing TTP
- Adapt the VPC concept to cover pool-level and syndicate-level verified payment packages
- Adapt the TexQticScore signals to cover pool-order-level finance readiness
- Not duplicate or fork the existing TTP infrastructure

### 11.3 Current Gate State

| Gate | Current Value | Changed by this design? |
|---|---|---|
| `ttp_enabled` (global) | `false` | No — unchanged |
| `nc.settlement_waterfall.enabled` | `false` | No — unchanged |
| `nc.procurement_pools.supplier_quotes.enabled` | `false` | No — unchanged |
| `nc.procurement_pools.rfq.award.enabled` | `false` | No — unchanged |

---

## 12. Future Packet Map

The following candidate packets are proposed as future work.
**All are HOLD_FOR_PARESH_DECISION. None are opened here.**

| Packet ID | Title | Scope | Status |
|---|---|---|---|
| **TEXQTIC-NC-TRADETRUST-PAY-DATA-MODEL-001** | TradeTrust Pay Data Model for NC | Schema design for `NetworkPaymentTerm`, `NetworkSettlementConfirmation`, and related entities; migration; prisma generate | HOLD_FOR_PARESH_DECISION |
| **TEXQTIC-NC-TRADETRUST-PAY-PAYMENT-TERMS-001** | Payment Terms Service and Routes | Backend service + routes for creating, reading, and computing payment-term maturity for pool orders | HOLD_FOR_PARESH_DECISION |
| **TEXQTIC-NC-TRADETRUST-PAY-EXTERNAL-CONFIRMATION-001** | External Settlement Confirmation Routes | Buyer/supplier routes for recording external settlement confirmation; lifecycle log event; maturity status transitions | HOLD_FOR_PARESH_DECISION |
| **TEXQTIC-NC-TRADETRUST-PAY-FINANCE-READINESS-001** | Finance-Readiness Signal Computation | Backend service for computing and caching advisory finance-readiness signals against pool orders; admin read routes | HOLD_FOR_PARESH_DECISION |
| **TEXQTIC-NC-OES-TRADETRUST-PAY-ADAPTATION-001** | OES TradeTrust Pay Design Adaptation | Phase 2 OES (syndicates) settlement design under TTP doctrine — replaces escrow-first framing for syndicates | HOLD_FOR_PARESH_DECISION |
| **TEXQTIC-NC-VCO-TRADETRUST-PAY-ADAPTATION-001** | VCO TradeTrust Pay Design Adaptation | Phase 3 VCO per-stage settlement and holdback design under TTP doctrine | HOLD_FOR_PARESH_DECISION |

---

## 13. Authority Sources

The following documents were reviewed in preparing this design:

| Document | Relevance |
|---|---|
| `governance/control/OPEN-SET.md` | Layer 0 current posture; TradeTrust Pay doctrine confirmed in POOL-SETTLE-001 operating note |
| `governance/control/NEXT-ACTION.md` | Current active/next candidate posture; superseded candidate record |
| `governance/TEXQTIC-NC-POST-PHASE1-NEXT-TRACK-TRADETRUST-PAY-ALIGNMENT-001.md` | Alignment artifact; escrow-first supersession rationale; new candidate installation |
| `governance/TEXQTIC-NC-PHASE1-CLOSE-AUDIT-001.md` | Phase 1 audit: no-money-movement CONFIRMED, all 185 tests PASS, §11 TTP findings |
| `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` | Packet 23 row updated; Phase 2 preamble updated |
| `governance/TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md` | §15 Settlement Ledger — foundational no-funds-custody doctrine; waterfall computation model |
| `governance/TEXQTIC-NC-PHASE1-POOL-SETTLE-001.md` | Packet 20 — Phase 1 settlement visibility implementation; TTP doctrine confirmed in operating note |
| `governance/runbooks/TTP-ACTIVATION-ROLLBACK-RUNBOOK-001.md` | TTP gate semantics, activation pre-conditions, disclaimer text |
| `governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` | Legal scope, regulatory boundaries, what TTP is/is not |
| `governance/legal/TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md` | Operator decision guide; blocked items; legal review requirement |

---

## 14. Invariants Confirmed Unchanged

| Invariant | Status |
|---|---|
| Active delivery unit | HOLD_FOR_AUTHORIZATION — UNCHANGED |
| DPP launch authorization | HOLD_FOR_PARESH_DECISION — UNCHANGED |
| G-022 (escalation design) | HOLD_FOR_PARESH_DECISION — UNCHANGED |
| `nc.procurement_pools.supplier_quotes.enabled` | false — UNCHANGED |
| `nc.procurement_pools.rfq.award.enabled` | false — UNCHANGED |
| `nc.settlement_waterfall.enabled` | false — UNCHANGED |
| `ttp_enabled` | false — UNCHANGED |
| OES Phase 2 slices | NOT_STARTED — UNCHANGED (unopened) |
| VCO Phase 3 slices | NOT_STARTED — UNCHANGED (unopened) |
| All Phase 1 tests (185/185) | PASS — HEAD e2885d9 |
| No source/schema/migration/frontend/test/.env changes | CONFIRMED |
| No feature flag activation | CONFIRMED |
| No payment execution / money movement | CONFIRMED |
| No lending / credit / guarantee | CONFIRMED |
| No platform-held funds | CONFIRMED |

---

*End of TEXQTIC-NC-TRADETRUST-PAY-DESIGN-001.*
