# TEXQTIC-TRADETRUST-PAY-PRODUCT-SCOPING-001

**Type:** Product Scoping Artifact
**Status:** SCOPING_COMPLETE — `SUFFICIENT_FOR_DESIGN_ARTIFACT_PROMPT`
**Scope:** Escrow → TexQtic TradeTrust Pay — Phase 1 product boundary definition
**Authority:** This document is a **scoping artifact only**. It does NOT authorize implementation, schema migration, route changes, service changes, PSP activation, or any code modification. No change may proceed from this document without a separate approved design artifact (TEXQTIC-TRADETRUST-PAY-DESIGN-001).
**Created:** 2026-05-01
**Repo-Truth Basis:** Audit of repo state as of session 52abf4cc (escrow→tradetrust-pay audit pass)

---

## 1. Purpose

This document defines the product scope for **TexQtic TradeTrust Pay** — the platform's future embedded-finance layer for B2B trade settlements in the textile/manufacturing sector.

This is a **product scoping artifact**. Its purpose is:

1. To answer the five boundary questions that blocked progression from the repo-truth audit to a design artifact.
2. To enumerate what the repo already contains as foundation (confirmed by audit), what is in scope for Phase 1 design, and what is explicitly out of scope.
3. To establish the design-authority boundary: nothing in this document authorizes implementation. This document authorises the creation of `TEXQTIC-TRADETRUST-PAY-DESIGN-001`.

This document is **not**:
- A technical design artifact
- An implementation plan
- Authorization for schema changes, route additions, or service changes
- Authorization for PSP activation or payment execution
- A product requirements document for a feature sprint

Related governance authorities:
- `governance/decisions/PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED.md` — Wave 4 boundary ratification
- `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md` — PSP Phase 3 gate
- `docs/strategy/CONTROL_CENTER_TAXONOMY.md` — PSP/Bank Hooks status
- `governance/g019-day3-verification-report.md` — Settlement G-019 day-3 verification
- Doctrine D-020-B — No balance column, no financial ops in state transitions
- Doctrine D-020-C — AI boundary (escrow-strict, HUMAN_CONFIRMED prefix rule)
- Doctrine D-017-A — tenantId from JWT only, never from request body

---

## 2. Background

### 2.1 Why "Escrow" Alone Fails the B2B Textile Use Case

Classic escrow constructs assume:
- Short-cycle transactions (days, not months)
- Clear bilateral delivery confirmation
- A single settlement event per transaction

B2B textile trade operates under fundamentally different conditions:
- **45–120 day payment cycles** are standard (90-day credit terms common)
- **Multi-party delivery chains**: manufacturer → freight → customs → buyer warehouse
- **Partial shipments and milestone billing**: a single trade may have 3–5 separate delivery and payment events
- **Regulatory complexity in cross-border flows**: FEMA, EXIM, LC, TReDS eligibility, MSME factoring rules

A pure "hold funds in escrow, release on delivery" model is not viable for this segment without either:
(a) Holding regulated funds (requires NBFC/PPI/banking licence), or
(b) Reframing the product as a **verified-payment routing and confirmation layer** — not a custody product.

### 2.2 Why "TradeTrust Pay" Reframes the Problem Correctly

The reframing from "Escrow" to "TradeTrust Pay" reflects the following product insight:

TexQtic's defensible value in the payment chain is not **custody of funds** but **verifiable confirmation of trade state** — specifically:
- That a trade occurred on verified terms
- That a buyer has confirmed invoice receipt
- That a Verified Payable Certificate can be issued to a finance partner
- That settlement visibility (ledger audit trail) exists for both parties and for regulators/auditors

This positions TexQtic as a **trade-state verification and finance-routing layer**, not as a payment aggregator, NBFC, or custodian.

### 2.3 What the Repo-Truth Audit Found

The full audit was conducted in session 52abf4cc. Key findings:

**Already present as repo foundation:**
- Escrow ledger (`escrow_accounts`, `escrow_transactions`) — append-only, no balance column (D-020-B enforced at schema level)
- Settlement orchestration service (`settlement.service.ts`) — TOGGLE_B=B1 (ledger-only, no settlement table), TOGGLE_C=C3 (dispute + escalation gates), zero external HTTP calls confirmed
- Trade lifecycle with escrow FK (`Trade.escrow_id` — optional FK → `escrow_accounts`)
- Maker-checker pipeline, escalation/freeze gates, AI boundary guardrail (D-020-C)
- EscrowLifecycleLog with real FK to escrow_accounts
- Frontend surfaces: EscrowPanel (tenant), EscrowAdminPanel (control plane), SettlementAdminPanel (control plane), TradesPanel escrow integration
- `GET /finance/payouts` control-plane supervision endpoint

**Confirmed absent (not implemented):**
- Invoice data model or table
- Settlement table (ledger-only doctrine maintained, TOGGLE_B=B1)
- PSP/payment gateway model or integration
- Finance partner routing service
- FinanceRequest, PaymentSchedule, FinancePartner models
- TradeTrust digital credential standard integration
- Verified Payable Certificate issuance logic
- Seller-paid-early or early-payment-facilitation service

**Audit verdict:** `NOT_SUFFICIENT_FOR_DESIGN_PROMPT` — five boundary questions required product-owner resolution before a design artifact could be opened.

---

## 3. Current Repo Baseline (Authoritative Summary)

| Component | Status | Governance Authority |
|---|---|---|
| `escrow_accounts` table | EXISTS — no balance column, lifecycle-state-gated | D-020-B, G-018 |
| `escrow_transactions` table | EXISTS — append-only ledger, CHECK constraints, P0005 trigger backstop | G-018 |
| `EscrowLifecycleLog` | EXISTS — real FK to escrow_accounts | G-018 |
| `escrow.service.ts` | EXISTS — createEscrowAccount, recordTransaction, computeDerivedBalance (pure SUM), transitionEscrow | G-018 |
| `settlement.service.ts` | EXISTS — TOGGLE_B=B1 (ledger-only), TOGGLE_C=C3, zero external HTTP calls | G-019 |
| `Trade.escrow_id` | EXISTS — optional FK → escrow_accounts | G-017 |
| EscrowPanel (tenant UI) | EXISTS | — |
| EscrowAdminPanel (control UI) | EXISTS | — |
| SettlementAdminPanel (control UI) | EXISTS | — |
| `GET /finance/payouts` | EXISTS — supervision endpoint, reads RELEASE DEBIT rows | — |
| Invoice model/table | ABSENT | — |
| Settlement table | ABSENT (ledger-only doctrine) | G-019 |
| PSP / payment gateway model | ABSENT | Wave 4 boundary, Phase 3 gate |
| Finance partner routing service | ABSENT | Out of scope Phase 1 |
| FinanceRequest / PaymentSchedule | ABSENT | Out of scope Phase 1 |
| TradeTrust credential standard | ABSENT | Future phase |
| Verified Payable Certificate | ABSENT | Out of scope Phase 1 |
| Seller-paid-early service | ABSENT | Out of scope Phase 1 |

**Database authority:** Remote Supabase PostgreSQL. No local-postgres assumptions. All schema references above are confirmed from `server/prisma/schema.prisma` audit.

---

## 4. Product Definition

### 4.1 What TexQtic TradeTrust Pay IS

TexQtic TradeTrust Pay is a **verified trade, invoice-readiness, settlement-visibility, and embedded-finance routing layer**.

It provides:
- **Trade-state verification**: structured confirmation that a trade occurred on agreed terms, with lifecycle audit trail
- **Invoice-readiness**: structured invoice domain linked to a verified trade, enabling buyer confirmation workflows
- **Buyer invoice approval**: the buyer confirms receipt and acceptance of an invoice — creating a confirmed payable
- **Verified Payable Certificate (VPC)**: a platform-issued record that a payable has been verified on TexQtic terms — suitable for routing to finance partners (TReDS/SCF/NBFC/factoring) as evidence
- **Finance-partner routing (design-only in Phase 1)**: the design of routes and data structures to route a VPC to an external finance partner — NOT live partner integration in Phase 1
- **Settlement visibility**: audit-trail ledger (existing `escrow_transactions` foundation) for both parties and auditors/regulators
- **Existing escrow domain mapped to TTP Ledger terminology**: `escrow_accounts` → TradeTrust Ledger, `escrow_transactions` → TradeTrust Ledger Entries — branding alignment without schema rename

### 4.2 What TexQtic TradeTrust Pay is NOT

| Not | Reason |
|---|---|
| An escrow custodian | No balance column, no funds held by platform (D-020-B constitutional) |
| A lender or NBFC | No lending license, no credit product. TexQtic records and routes; does not fund. |
| A payment aggregator | No PPI/PA license required. Platform does not move funds. |
| A payment guarantee product | Platform does not guarantee payment to seller |
| A PSP integration | Explicitly blocked by Wave 4 boundary and Phase 3 gate |
| A direct TReDS / SCF / NBFC integration | External partner integration is Phase 2+ |
| A managed settlement platform | No direct settlement execution with external parties in Phase 1 |
| A digital credential standard (W3C/ICC TradeTrust) | Phase 1 = product branding only. Credential standard integration is future/design-gated. |

---

## 5. Phase 1 Scope Recommendation

Phase 1 of TexQtic TradeTrust Pay is scoped to the following objectives:

### 5.1 Invoice / Payable Readiness

- Design an Invoice domain model (schema, service, routes, frontend surface) — **design artifact authority only in Phase 1**; no implementation until TEXQTIC-TRADETRUST-PAY-DESIGN-001 is approved
- Invoice is the bridge between a verified trade and a confirmed payable
- Buyer invoice approval is the workflow that creates a confirmed payable from a verified invoice
- Invoice table/domain is `IN_SCOPE_FOR_DESIGN` (see Boundary Q1, Section 6)

### 5.2 Verified Payable Certificate Concept

- Design the VPC as a platform-issued record representing a buyer-confirmed payable
- VPC data fields: tradeId, invoiceId (once Invoice domain exists), buyer confirmation timestamp, verified amount, currency, escrowId / TTP Ledger account, status
- VPC is `IN_SCOPE_FOR_DESIGN`; not implemented until design artifact approved

### 5.3 Existing Escrow → TradeTrust Ledger Terminology Mapping

- Map `escrow_accounts` → "TradeTrust Ledger" at the UI/product layer (branding, not schema rename)
- Map `escrow_transactions` → "TradeTrust Ledger Entries" at the UI/product layer
- No schema rename. No Prisma migration required for this mapping.
- Existing lifecycle states, governance doctrines, and guardrails remain unchanged

### 5.4 Finance-Partner Routing Design

- Design the data structures and route stubs for routing a VPC to an external finance partner
- Phase 1 = **design-only / stub-only**. No live partner integration.
- No TReDS API calls, no SCF/NBFC API integration, no FEMA-regulated flows activated
- Finance-partner routing service: `IN_SCOPE_FOR_DESIGN` as stub/placeholder

### 5.5 Explicit Phase 1 Exclusions

- No live PSP integration (Wave 4 boundary, Phase 3 gate — inviolable)
- No funds custody
- No seller-paid-early service activation (External-partner-only model; see Boundary Q3, Section 8)
- No live TReDS / SCF / NBFC API integration
- No TradeTrust digital credential standard integration (branding only; see Boundary Q4, Section 9)
- No mandatory `Trade.escrow_id` migration (optional FK preserved; see Boundary Q5, Section 10)
- No balance columns added to any model
- No settlement table added (ledger-only doctrine maintained)

---

## 6. Boundary Q1 — Invoice Domain in Scope?

**Question:** Is an Invoice table/domain in scope for TradeTrust Pay Phase 1?

**RECOMMENDED_DECISION:** `IN_SCOPE_FOR_DESIGN`

**Rationale:**
- A Verified Payable Certificate is the core TTP Phase 1 product concept.
- A VPC requires a confirmed invoice as its factual basis — you cannot have a "verified payable" without a document that describes what is payable.
- Currently, "INVOICE" exists only as a DPP link type enum value in `dppTradeLinks.ts` — not a data-bearing table, not a model, not a domain.
- Without an Invoice domain, TradeTrust Pay Phase 1 has no payable surface to verify.

**Scope classification:**
- Invoice domain: `IN_SCOPE_FOR_DESIGN` — to be designed in TEXQTIC-TRADETRUST-PAY-DESIGN-001
- Invoice implementation: NOT authorized until design artifact is approved
- Invoice schema, routes, service, and frontend surface: all to be defined in design artifact

**Pre-conditions before Invoice implementation (to be confirmed in design artifact):**
- Invoice data model must respect `org_id` tenant isolation (constitutional)
- Invoice lifecycle states must be defined (DRAFT, SUBMITTED, BUYER_CONFIRMED, DISPUTED, SETTLED)
- Relationship to Trade record: 1 Trade → N Invoices (milestone billing supported)
- Buyer confirmation workflow: route + service + frontend surface to be designed

**References:**
- `docs/TECS-B2B-ORDERS-LIFECYCLE-001-DESIGN-v1.md` section 4.4: "no buyer-facing invoice generation" — this is explicitly tagged as future domain; the scoping decision here authorizes the design, not the implementation
- No existing Invoice model in `server/prisma/schema.prisma` — confirmed by audit

---

## 7. Boundary Q2 — PSP / Regulatory Review Boundary

**Question:** What PSP/regulatory review boundary should Phase 1 assume?

**DECISION:** `LEGAL_OR_REGULATORY_REVIEW_REQUIRED` for any payment execution authority

**Rationale:**
- `governance/decisions/PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED.md` states explicitly: "payment execution, PSP activation, or managed settlement are not authorized in Wave 4"
- `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md` Phase 3 gate: PSP/bank integration hookpoints designed but not activated; activation requires regulatory review
- `docs/strategy/CONTROL_CENTER_TAXONOMY.md`: "PSP/Bank Hooks — Status: architecture hookpoints only — not activated — Phase 3 gate"
- `governance/g019-day3-verification-report.md`: "No custody logic active (TOGGLE_B=B1)"; "settlement.service.ts contains zero external HTTP calls"; "No PSP hooks activated"

**Phase 1 assumption (FIRM):**
- TexQtic TradeTrust Pay Phase 1 = **system-of-record and routing-readiness layer only**
- No PSP activation
- No payment execution authority
- No funds movement by the platform
- No PA (Payment Aggregator) / PPI (Prepaid Payment Instrument) regulated activity
- Finance partner routing = design-only / stub-only — no live API calls

**What requires regulatory review before proceeding beyond Phase 1:**
- Any live PSP integration
- Any scenario where TexQtic holds or moves funds on behalf of parties
- Any TReDS / NBFC API live integration (FEMA and RBI regulations apply for cross-border B2B)
- Any "escrow" product marketed to external parties as a custodial service

**Confirmation required from Paresh:** Paresh must confirm the regulatory review timeline and responsible party (legal counsel, compliance officer) before Phase 2 (PSP activation) can be designed or scoped.

---

## 8. Boundary Q3 — Seller Paid Early Mechanism

**Question:** Is seller-paid-early external-partner-only, or does TexQtic intend to fund early payments?

**RECOMMENDED_DECISION:** `EXTERNAL-PARTNER ONLY`

**Rationale:**
- TexQtic funding early payments would constitute lending activity, requiring an NBFC licence or lending partner arrangement under RBI regulations.
- The platform's defensible position is as a **trade-state verification and finance-routing layer**: TexQtic records the trade, verifies the invoice, issues a VPC, and routes to a finance partner — it does not provide credit.
- This is consistent with D-020-B (no balance column / no funds custody doctrine) and the Phase 3 gate.

**Recommended model for seller-paid-early in Phase 1 (design-only):**

| Step | Actor | TexQtic Role |
|---|---|---|
| Trade confirmed | Buyer + Seller | Record trade state |
| Invoice submitted | Seller | Record invoice, route to buyer |
| Invoice confirmed | Buyer | Issue Verified Payable Certificate |
| VPC routed to finance partner | TexQtic platform | Route stub (design-only in Phase 1) |
| Finance partner issues early payment | TReDS / SCF / NBFC / factoring company | External — TexQtic has no custody |
| Settlement confirmed | Finance partner → Seller | TexQtic records confirmation event |

**Eligible finance partner types (future routing, not Phase 1 live):**
- TReDS (Trade Receivables Discounting System) — SEBI-regulated
- SCF (Supply Chain Finance) platforms
- NBFC (Non-Banking Financial Company) factoring arms
- Export factoring / EXIM-backed facilities

**What TexQtic records, verifies, and routes — it does NOT fund:**
- Trade occurrence and terms
- Invoice submission and buyer confirmation
- VPC issuance (platform record of verified payable)
- Finance partner routing event (stub only in Phase 1)
- Settlement receipt confirmation event

---

## 9. Boundary Q4 — Meaning of "TradeTrust"

**Question:** Is "TradeTrust" product branding only, or does it imply integration with the ICC/Singapore TradeTrust digital credential standard?

**RECOMMENDED_DECISION:** `PRODUCT_BRANDING_ONLY` for Phase 1. Digital credential standard integration = `FUTURE_PHASE`, design-gated.

**Rationale:**
- The ICC/Singapore TradeTrust initiative defines standards for digitally verifiable trade documents (eBL, eInvoice, etc.) using W3C Verifiable Credentials and related frameworks.
- Integration with this standard requires: specification study, credential schema design, DID/PKI infrastructure, and legal recognition of digital trade documents in target jurisdictions.
- None of this infrastructure exists in the repo today. No credential issuance, no DID resolution, no W3C VC schema.
- Phase 1 has sufficient scope without credential standard integration: the core value is the internal verified-payable workflow and VPC concept.

**Phase 1 naming convention:**
- "TexQtic TradeTrust Pay" = platform product name. Not a claim of compliance with or integration with external TradeTrust standard.
- Marketing language must not imply ICC/Singapore TradeTrust standard compliance until that integration is designed, built, and legally confirmed.

**Future phase (DESIGN_GATED before any implementation):**
- Study ICC TradeTrust specification for eBL / eInvoice credential issuance
- Assess jurisdictional legal recognition (India EXIM, Singapore MAS, etc.)
- Design VerifiableCredential schema for TexQtic VPC
- Assess DID/PKI infrastructure requirements
- This is a significant multi-sprint effort requiring regulatory and standards expertise

**Paresh confirmation required:** If external-facing marketing of "TradeTrust" branding is planned before Phase 1 technical launch, legal review of the brand name relative to the ICC TradeTrust initiative should be confirmed.

---

## 10. Boundary Q5 — Trade.escrow_id Mandatory?

**Question:** Should `Trade.escrow_id` become mandatory for TTP-eligible trades, or stay optional?

**RECOMMENDED_DECISION:** `KEEP_OPTIONAL` — do not force mandatory until design proves lifecycle and migration path.

**Rationale:**

Current state: `Trade.escrow_id` is an optional FK (`Int?` in Prisma schema) → `escrow_accounts`.

**Arguments against making mandatory now:**
1. **Migration risk**: Existing trades without an escrow link would fail NOT NULL constraint. A migration must backfill or tombstone all existing trades — significant risk without a clear migration plan.
2. **Lifecycle gap**: Not all trades will proceed to TTP Pay. Trade creation → escrow linkage is a deliberate lifecycle step, not a precondition for trade creation. Forcing mandatory conflates trade initiation with finance enrollment.
3. **Premature coupling**: Making escrow_id mandatory before Invoice domain and VPC are designed creates a tight coupling before the downstream design is resolved.
4. **Platform flexibility**: Some tenants may not use TTP Pay for all trades. Keeping optional preserves configuration flexibility.

**Recommended approach (to be confirmed in design artifact):**
- `Trade.escrow_id` remains `optional` (nullable FK)
- A `TTP-eligible` lifecycle state or flag is introduced when a trade is enrolled in TradeTrust Pay
- TTP enrollment creates the escrow link at enrollment time, not at trade creation time
- TTP-eligible trades: `escrow_id IS NOT NULL` is a business invariant enforced at the service layer, not at the schema level (unless design artifact decides otherwise after migration planning)

**Risk documented:**
- If future product logic strongly requires all trades to have escrow links (e.g., for VPC issuance), a migration will be needed. Migration scope: backfill `escrow_id` for all existing trades in active tenants, or create a "legacy trade" tombstone record. This scope must be assessed at design-artifact time, not at this scoping stage.

---

## 11. Phase 1 Product Scope Table

| Capability | Phase 1 Status | Notes |
|---|---|---|
| Escrow ledger (escrow_accounts + escrow_transactions) | `ALREADY_EXISTS_AS_REPO_FOUNDATION` | Confirmed by audit. D-020-B enforced. |
| Settlement orchestration (settlement.service.ts, TOGGLE_B=B1) | `ALREADY_EXISTS_AS_REPO_FOUNDATION` | Ledger-only, zero external HTTP calls confirmed. |
| Trade.escrow_id optional FK | `ALREADY_EXISTS_AS_REPO_FOUNDATION` | Keep optional (Boundary Q5 decision). |
| EscrowPanel (tenant), EscrowAdminPanel (control), SettlementAdminPanel (control) | `ALREADY_EXISTS_AS_REPO_FOUNDATION` | Will require UI label updates in design. |
| GET /finance/payouts supervision endpoint | `ALREADY_EXISTS_AS_REPO_FOUNDATION` | Reads RELEASE DEBIT rows. |
| Invoice domain (table, service, routes, frontend) | `IN_SCOPE_FOR_DESIGN` | Requires design artifact. Not implemented until approved. |
| Buyer invoice approval workflow | `IN_SCOPE_FOR_DESIGN` | Requires design artifact. Depends on Invoice domain. |
| Verified Payable Certificate (VPC) concept | `IN_SCOPE_FOR_DESIGN` | Requires design artifact. Depends on Invoice domain. |
| TTP Ledger terminology mapping (UI/branding) | `IN_SCOPE_FOR_DESIGN` | No schema rename. UI label change only. |
| Finance-partner routing stubs | `IN_SCOPE_FOR_DESIGN` | Design-only / stub-only. No live partner integration. |
| TTP enrollment lifecycle state / flag | `IN_SCOPE_FOR_DESIGN` | To be defined in design artifact. |
| PSP integration | `OUT_OF_SCOPE_PHASE_1` | Wave 4 boundary. Phase 3 gate. Inviolable. |
| Live TReDS / SCF / NBFC API integration | `OUT_OF_SCOPE_PHASE_1` | Finance partner routing is stub-only in Phase 1. |
| Seller-paid-early funding by TexQtic | `OUT_OF_SCOPE_PHASE_1` | External-partner-only model. TexQtic does not fund. |
| Funds custody / balance columns | `OUT_OF_SCOPE_PHASE_1` | D-020-B constitutional prohibition. |
| Settlement table | `OUT_OF_SCOPE_PHASE_1` | Ledger-only doctrine maintained (TOGGLE_B=B1). |
| TradeTrust digital credential standard (W3C VC / ICC) | `FUTURE_PHASE` | Design-gated. No credential infrastructure exists. |
| Mandatory Trade.escrow_id migration | `FUTURE_PHASE` | Only after migration plan assessed in design artifact. |
| schema.prisma rename of escrow tables | `OUT_OF_SCOPE_PHASE_1` | UI branding only. No schema rename. |
| PSP/regulatory review completion | `REQUIRES_REGULATORY_REVIEW` | Cannot activate PSP without external legal review. |
| TradeTrust branding legal review (ICC) | `REQUIRES_PARESH_CONFIRMATION` | Marketing/legal review before external branding claims. |
| Finance partner live routing legal review | `REQUIRES_REGULATORY_REVIEW` | FEMA / RBI regulations apply for live partner flows. |

---

## 12. Product Boundary / No-Go Items

The following are **explicit no-go items for TexQtic TradeTrust Pay Phase 1 and beyond unless separately authorized**:

| No-Go Item | Governance Basis |
|---|---|
| Platform lending / credit product | No NBFC licence. Boundary Q3 decision. |
| Funds custody by TexQtic | D-020-B constitutional. No balance column ever. |
| Payment aggregation activity | No PA/PPI licence. Wave 4 boundary. |
| PSP activation or live payment execution | Wave 4 boundary. PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED.md. Phase 3 gate. |
| Live TReDS / SCF / NBFC API integration (Phase 1) | Out of scope. Requires regulatory review before Phase 2. |
| Payment guarantee product | No authority. Not a financial institution. |
| Forced rename of escrow tables in Prisma schema | No-go. Branding is UI-layer only. Schema rename requires migration with no benefit. |
| Mandatory Trade.escrow_id (schema-level constraint) | No-go unless migration plan approved in design artifact. |
| Balance columns in any model | D-020-B — absolute prohibition. |
| Settlement table (if ledger-only doctrine maintained) | G-019 TOGGLE_B=B1 — do not add settlement table. |
| ICC/Singapore TradeTrust standard claim in marketing | Until legal review confirms brand usage is safe. |
| Seller early-payment funded by TexQtic | External-partner-only model. TexQtic is routing layer, not funder. |
| Any escrow / settlement route bypassing org_id tenancy | Constitutional. D-017-A. org_id is the canonical tenant boundary. |
| AI-triggered settlement without HUMAN_CONFIRMED prefix | D-020-C — absolute prohibition. aiTriggered=true requires HUMAN_CONFIRMED: prefix. No exemptions. |
| Uncommitted Prisma migrations | Never prisma migrate dev, never prisma db push. Repo AGENTS.md. |

---

## 13. Recommended Next Design Artifact

**Artifact ID:** `TEXQTIC-TRADETRUST-PAY-DESIGN-001`
**Type:** Technical design artifact (not a scoping document)
**Authority this grants:** Defines implementation authority for Phase 1 TTP capabilities

**Required sections for the design artifact:**

1. **Domain Model** — Invoice table, VPC table, TTP enrollment state/flag, relationship to Trade and escrow_accounts
2. **Lifecycle States** — Invoice lifecycle (DRAFT → SUBMITTED → BUYER_CONFIRMED → DISPUTED → SETTLED), VPC lifecycle, TTP enrollment lifecycle
3. **Route / Service Changes** — New routes for invoice CRUD, buyer confirmation, VPC issuance, finance-partner routing stubs. Existing escrow/settlement routes: changes required (if any).
4. **Frontend Surfaces** — Seller invoice submission surface, buyer invoice approval surface, VPC display, TTP enrollment entry point in TradesPanel
5. **Test Plan** — Unit tests for InvoiceService, VPCService. Integration tests for buyer confirmation workflow. Runtime verification protocol.
6. **Runtime Verification Protocol** — Step-by-step curl/SQL evidence for each new capability
7. **Migration / No-Migration Decision** — Explicit decision on Trade.escrow_id optionality, Invoice table rollout strategy, backward compatibility
8. **Naming Transition Plan** — UI label changes for escrow → TradeTrust Ledger terminology. Confirm no schema renames needed.
9. **Governance Compliance Table** — Confirm each new capability against D-020-B, D-020-C, D-017-A, G-018, G-019
10. **Open Pre-conditions** — List any regulatory, legal, or product approvals required before specific design elements can be implemented

**Pre-conditions before opening TEXQTIC-TRADETRUST-PAY-DESIGN-001:**
- Boundary Q2 (PSP/regulatory) confirmation received (Section 7)
- Boundary Q4 (TradeTrust branding legal review) confirmation received (Section 9)
- Paresh has reviewed and confirmed the five open decisions in Section 14

---

## 14. Open Decisions for Paresh

The following five items require explicit confirmation from Paresh before the design artifact (TEXQTIC-TRADETRUST-PAY-DESIGN-001) can be opened:

| # | Decision | Recommended | Status |
|---|---|---|---|
| OD-001 | Invoice domain in scope for Phase 1 design? | `YES — IN_SCOPE_FOR_DESIGN` (Section 6) | `REQUIRES_PARESH_CONFIRMATION` |
| OD-002 | PSP/regulatory review: who is responsible and what is the timeline? | Legal counsel / compliance officer to be named; no PSP activation without their sign-off | `REQUIRES_PARESH_CONFIRMATION` |
| OD-003 | Seller-paid-early: confirm external-partner-only model (TexQtic does not fund) | `EXTERNAL-PARTNER ONLY` (Section 8) | `REQUIRES_PARESH_CONFIRMATION` |
| OD-004 | TradeTrust branding: confirm Phase 1 = product branding only; legal review of ICC/Singapore TradeTrust brand usage? | Phase 1 = branding only; legal review before external marketing claims | `REQUIRES_PARESH_CONFIRMATION` |
| OD-005 | Trade.escrow_id: confirm keep-optional approach; acknowledge migration implications if mandatory is required later | Keep optional (Section 10) | `REQUIRES_PARESH_CONFIRMATION` |

**Paresh confirmation format (suggested):**
> OD-001: CONFIRMED / REJECTED / MODIFIED: [note]
> OD-002: CONFIRMED — responsible party: [name/role] — timeline: [date]
> OD-003: CONFIRMED / REJECTED / MODIFIED: [note]
> OD-004: CONFIRMED / REJECTED / MODIFIED: [note]
> OD-005: CONFIRMED / REJECTED / MODIFIED: [note]

Confirmations should be recorded in `governance/decisions/` as a new `PRODUCT-DEC-TRADETRUST-PAY-BOUNDARY-CONFIRMATIONS-001.md` before the design artifact is opened.

---

## 15. Final Product Scope Decision

**Verdict:** `SUFFICIENT_FOR_DESIGN_ARTIFACT_PROMPT`

**Basis:**
- All five boundary questions from the repo-truth audit have been answered with `RECOMMENDED_DECISION` classifications.
- The scope table (Section 11) clearly separates what exists, what is in scope for design, what is deferred, and what requires regulatory review.
- No-go items (Section 12) are explicitly enumerated.
- The recommended next artifact (Section 13) has a defined scope and pre-conditions.
- Five open decisions (Section 14) for Paresh are explicitly listed — these require confirmation before the design artifact is opened, but the scoping work is complete.

**What this verdict authorises:**
- The creation of `TEXQTIC-TRADETRUST-PAY-DESIGN-001` — after Paresh confirms OD-001 through OD-005.

**What this verdict does NOT authorise:**
- Any implementation, schema change, route addition, service change, PSP activation, or code modification.
- Proceeding to design artifact without Paresh confirmation of OD-001 through OD-005.
- Any assumption that "in scope for design" means "approved for implementation."

---

*Scoping document prepared: 2026-05-01*
*Session basis: 52abf4cc — Escrow→TradeTrust Pay repo-truth audit*
*Next required artifact: `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-BOUNDARY-CONFIRMATIONS-001.md` (Paresh confirmations) → `TEXQTIC-TRADETRUST-PAY-DESIGN-001`*
