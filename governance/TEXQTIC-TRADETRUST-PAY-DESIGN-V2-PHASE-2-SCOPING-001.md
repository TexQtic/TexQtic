# TEXQTIC-TRADETRUST-PAY-DESIGN-V2-PHASE-2-SCOPING-001

**Type:** Phase 2 Product Scoping Artifact — Design V2 Boundary Definition
**Status:** `SCOPING_COMPLETE — DESIGN_V2_REQUIRED_BEFORE_LIVE_INTEGRATIONS`
**Amendment Status:** `AMENDED — TEXQTICSCORE_AND_EMBEDDED_FINANCE_MARKETPLACE_ADDED`
**Final Recommendation:** `SCOPED_ACTIVATION_DESIGN_RECOMMENDED_NEXT`
**Final Decision:** `PHASE_2_SCOPING_AMENDED_WITH_TEXQTICSCORE_EMBEDDED_FINANCE_EXTENSION`
**Date:** 2026-05-05
**Author:** Copilot Agent (GitHub Copilot / Claude Sonnet 4.6)
**Authority Basis:** Phase 1 completion confirmed by `PRODUCT-DEC-TRADETRUST-PAY-PHASE-1-ACTIVATION-READINESS-SIGNOFF-001.md` and QA routing-readiness correction `PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-ROUTING-READINESS-CORRECTION-001.md`

---

## 1. Purpose

This document is the **Phase 2 / Design V2 scoping artifact** for TexQtic TradeTrust Pay. It is a **scoping document only** — not an implementation authorization, not a design artifact, and not an activation order.

### Scope clarifications (mandatory)

- **Phase 1 is technically complete and production-deployed** behind the global feature flag `ttp_enabled=false`.
- **This document does not activate TTP.** `ttp_enabled` remains `false`. Nothing in this document changes that.
- **This document does not authorize live integrations** of any kind — no live GST API, no live CIBIL/bureau API, no partner transmission, no PSP, no payment/lending/custody.
- **This document does not authorize implementation.** Every item identified as a Phase 2 candidate requires a separate bounded unit, approved design artifact, and explicit Paresh approval before any code, schema, route, or service change is made.
- **Design V2 requires its own scoping → design artifact → approval chain**, following the same discipline as Phase 1.

---

## 2. Phase 1 Current State

Phase 1 is fully implemented, unit-tested, and production-deployed across all slices. The following capabilities are confirmed complete:

| # | Capability | Slice / Unit | Verification Status |
|---|---|---|---|
| 1 | TTP foundation schema (7 tables: `gst_verifications`, `ttp_eligibility_assessments`, `invoices`, `verified_payable_certificates`, `partner_routing_stubs`, `ttp_enrollments`, `ttp_audit_log`; RLS; lifecycle seeds) | Slice 1 | `SLICE_1_FOUNDATION_VERIFIED_COMPLETE` |
| 2 | TTP domain constants — single source of truth (`ttp.constants.ts`) | Slice 1 | Verified |
| 3 | GST verification gate — manual admin review, GSTIN format validation (15-char, state codes 01–38), `raw_verification_json` never returned to tenants | Slice 2 | `SLICE_2_GST_VERIFICATION_GATE_VERIFIED_COMPLETE` |
| 4 | TTP eligibility gate — CIBIL stub, risk tier (0–3), invoice cap, 180-day validity window, thin-file → manual review, `raw_bureau_json` never returned to tenants | Slice 3 | `SLICE_3_TTP_ELIGIBILITY_GATE_VERIFIED_COMPLETE` |
| 5 | Invoice domain — DRAFT→VERIFIED lifecycle (9 states), maker-checker, dispute gate, admin oversight | Slice 4 | `SLICE_4_INVOICE_DOMAIN_GATE_VERIFIED_COMPLETE` |
| 6 | TradeTrust Ledger naming bridge — Escrow → TradeTrust Ledger label across all shells | UI wiring | Verified |
| 7 | VPC generation — 12-gate generation pipeline, lifecycle (ACTIVE → ROUTING_READY → TRANSMITTED), admin console | Slice 5 | `SLICE_5_VPC_GENERATION_PRODUCTION_VERIFIED_COMPLETE` |
| 8 | Partner routing stub / data contract — create-on-read pattern, no partner transmission, no external API calls, admin-safe payload only | Slice 6 | `SLICE_6_PARTNER_ROUTING_STUB_PRODUCTION_VERIFIED_COMPLETE` |
| 9 | TTP enrollment — org-scoped lifecycle (REQUESTED → APPROVED/REJECTED), admin review | Slice 7 | `SLICE_7_TTP_SUMMARY_ENROLLMENT_PRODUCTION_VERIFIED_COMPLETE` |
| 10 | TTP summary — read-only trade readiness summary, seller + buyer access, party-membership validation | Slice 7 | Verified |
| 11 | TradeTrust Score Advisory Layer — pure in-memory computation, 100-pt score, 7 factors, 4 bands (READY/NEAR_READY/NEEDS_REVIEW/NOT_READY), mandatory disclaimer | Slice 8 | `SLICE_8_SCORE_ADVISORY_VERIFIED_COMPLETE` |
| 12 | Activation kill-switch — `ttpFeatureGateMiddleware` on all 13 TTP routes, fail-closed | Unit 1 | Verified |
| 13 | QA seed fixtures — sentinel orgs, trade, invoices, VPCs, routing stub (deterministic `issued_at` after routing-readiness correction) | Unit 2 | Verified |
| 14 | QA auth fixtures — seller + buyer Supabase auth users and org memberships | Unit 2B | Verified |
| 15 | Control-plane E2E — 38/38 Playwright tests pass (57.9s), including `score=100`, all 7 factors PASS, buyer safety, disclaimer | Unit 3 / QA correction | `38/38 PASS` |
| 16 | Tenant-plane E2E — seller + buyer ttp-summary, enrollment | Unit 4 / Unit 5 | Verified |

### Current production runtime state

```
ttp_enabled = false
```

The TTP feature is deployed but inactive. All 13 TTP routes return HTTP 503 `FEATURE_DISABLED` for all authenticated callers.

---

## 3. Phase 1 Boundary Still Active

Phase 1 explicitly excludes the following. These boundaries remain in force.

| Excluded Item | Boundary Authority |
|---|---|
| Live GST portal/API verification | OD-004B, OD-002 — manual review only in Phase 1 |
| Live CIBIL / credit bureau API | OD-004B, OD-002 — stub/manual only; requires separate legal/compliance review |
| Partner transmission — any NBFC, SCF, TReDS, factoring partner | OD-003, Slice 6 boundary — stub only; no outbound HTTP to partners |
| PSP / payment gateway behavior | OD-002 — Phase 1 = routing-readiness only |
| Escrow custody / funds holding | OD-003 — TexQtic does not hold, lend, or guarantee funds |
| Lending / NBFC / financing approval | OD-002, OD-003 |
| Payment guarantee / buyer default guarantee | OD-003 |
| Managed settlement / disbursement | Doctrine D-020-B |
| Digital negotiable instrument issuance | OD-004A — TradeTrust Pay is product branding only |
| ICC/Singapore TradeTrust, W3C VC/DID/PKI/eBL implementation | OD-004A |
| Real external financing approval | OD-002 |
| Per-org scoped activation (activation is global flag only) | Not in Phase 1 scope; identified as Phase 2 need |

---

## 4. Why Phase 2 Is Needed

Phase 1 established TradeTrust Pay as a **trust infrastructure and routing-readiness layer**. Phase 2 exists to move that infrastructure toward practical commercial operation.

The following product and operational drivers make Phase 2 necessary:

1. **Manual verification bottleneck.** GST verification and CIBIL eligibility assessment are fully manual admin processes. At any volume, this is not scalable. Live API integration would remove the admin bottleneck while retaining the same verification gates.

2. **Partner routing stub is a placeholder.** The `partner_routing_stubs` table holds a structured data contract ready for transmission — but no partner has ever received it. Phase 2 must define the actual transmission pathway, partner integration protocol, and callback lifecycle.

3. **Activation is global-or-nothing.** The current kill-switch (`ttp_enabled`) is a single Boolean in `feature_flags`. There is no way to activate TTP for one org, one trade, or one seller tier without activating it for all tenants simultaneously. Scoped activation is prerequisite for any safe limited rollout.

4. **Relationship-specific caps are not modeled.** The tier cap system (INR 2.5L / 5L / 10L) is static. Different buyer-seller relationships may warrant different caps based on trade history. Phase 2 should model this.

5. **VPC has no external format.** The VPC exists as an internal database record. There is no shareable format, no PDF export, and no external-facing certificate representation — which limits partner utility.

6. **Score has no version history or admin override.** The TradeTrust Score is computed live from current state. There is no snapshot history, no version trail for audits, and no admin override mechanism for edge cases.

7. **Activation lacks runbook, monitoring, and rollback.** There is no operational runbook for enabling TTP, no alerting on TTP route errors, and no automated rollback path if activation causes issues.

8. **Legal and compliance copy is unreviewed.** The Score disclaimer, VPC certificate wording, eligibility language, and financing references have not been reviewed by legal/compliance. This is a pre-activation risk.

9. **QA fixtures are co-located with production data.** Phase 2 should define the environment isolation strategy for QA seed data.

10. **Admin audit trail has no structured export.** `ttp_audit_log` exists but there is no structured admin view or compliance report export.

---

## 5. Phase 2 Candidate Capability Map

| # | Capability | Description | Category | Risk | Design Needed? | Implementation Ready? |
|---|---|---|---|---|---|---|
| P2-01 | Per-org / per-tenant scoped TTP activation | Replace global `ttp_enabled` Boolean with per-org or per-tier activation scope. Enables safe limited rollout. | Activation control | Medium | Yes | No — needs design first |
| P2-02 | Relationship-specific buyer-seller caps | Allow cap overrides at trade or buyer-seller relationship level, beyond static tier defaults. | Product | Low | Yes | No |
| P2-03 | Live GST verification API | Replace manual GSTIN review with live GST portal API verification (e.g. GSTN sandbox / production). | External integration | High | Yes | No — legal/compliance gate required |
| P2-04 | Live CIBIL / bureau integration | Replace manual eligibility assessment with live bureau data pull (credit profile, trade references). | External integration | Very High | Yes | No — legal + consent + data-privacy gate required |
| P2-05 | Partner routing transmission — NBFC / SCF / TReDS / factoring | Implement actual outbound transmission of `partner_routing_stubs` payload to finance partner. | Partner integration | Very High | Yes | No — partner contract required |
| P2-06 | Partner status callbacks / webhook receiver | Receive and persist partner decisions (accepted, rejected, conditions, disbursement status) from finance partners. | Partner integration | High | Yes | No — partner contract required |
| P2-07 | VPC external/shareable certificate format | Define a canonical shareable representation of the VPC (structured JSON, hash-anchored) for partner consumption. | Product | Medium | Yes | No |
| P2-08 | VPC PDF / download / export | Generate a human-readable PDF certificate of the VPC for seller and partner use. | Product | Low | Yes | No |
| P2-09 | TradeTrust Score v2 — explainability and admin overrides | Add per-factor explanation text, score version history, and admin override capability with audit trail. | Product | Medium | Yes | No |
| P2-10 | Admin audit trail enhancements | Structured compliance export of `ttp_audit_log`, admin dashboard views, retention policy enforcement. | Compliance | Medium | Yes | No |
| P2-11 | QA fixture cleanup / environment-isolation plan | Separate QA sentinel data from production in single-DB architecture (namespace, flag, or schema separation). | Engineering | Low | Yes | No |
| P2-12 | Legal / compliance copy review | Legal review of Score disclaimer, VPC certificate wording, eligibility language, financing references, consent text. | Legal | High | No (non-technical) | No — legal gate first |
| P2-13 | Monitoring / alerts for activated TTP routes | Alert on 5xx rates, feature gate bypasses, VPC generation failures, partner callback failures. | Operations | Medium | Yes | No |
| P2-14 | WL-specific TradeTrust branding controls | Allow white-label partners to configure TradeTrust Pay branding, disclaimer text, and certificate appearance. | Product | Low | Yes | No |
| P2-15 | Role-based buyer / seller UX refinements | Differentiate buyer and seller TTP UI pathways — enrollment flow, VPC visibility, score context. | Product | Low | Yes | No |
| P2-16 | Activation runbook / rollback automation | Define step-by-step activation and rollback procedures for per-org and global TTP activation. | Operations | Medium | Yes (runbook) | No |
| P2-17 | Phase 2 data retention policy | Define retention, archival, and deletion rules for GST records, eligibility assessments, VPCs, audit logs. | Compliance | High | Yes | No — legal gate first |
| P2-18 | API partner credentials / secrets management | Secure storage, rotation, and audit of API credentials for GST provider, bureau, and finance partners. | Security | Very High | Yes | No — partner contracts required |
| P2-19 | TexQticScore v2 | Proprietary platform-generated behavioural and transactional readiness signal; multi-dimensional input model evolving from Phase 1 TradeTrust Score | Product / Scoring | Medium | Yes | No — separate design required |
| P2-20 | Seller TexQticScore | Seller execution reliability and liquidity readiness signal | Product / Scoring | Medium | Yes | No |
| P2-21 | Buyer Trust Score | Buyer payment reliability and invoice approval behaviour signal | Product / Scoring | Medium | Yes | No |
| P2-22 | Invoice Financeability Score | Whether a specific invoice/VPC is finance-ready for a given partner rail | Product / Scoring | Medium | Yes | No |
| P2-23 | Embedded Finance Marketplace | Marketplace surface routing eligible VPCs/invoices to licensed finance partner rails with consent gates | Finance marketplace | Very High | Yes | No — legal + partner contract required |
| P2-24 | TReDS invoice discounting design | Route eligible invoices to licensed TReDS platform; TexQtic pre-fills VPC/invoice evidence; no TexQtic balance sheet exposure | Partner integration | Very High | Yes | No — partner contract + legal required |
| P2-25 | SIDBI / NBFC / SCF partner routing design | Route eligible sellers to working-capital or invoice-finance partners using TexQticScore as optional underwriting input | Partner integration | Very High | Yes | No — partner contract + legal required |
| P2-26 | Dynamic discounting design | Buyer-funded early-payment option for supplier; TexQtic records/facilitates only, does not hold or move funds | Finance marketplace | High | Yes | No — product/legal review required |
| P2-27 | Consent architecture for data sharing | Consent capture for sharing platform behavioural data with lenders; per-org, per-trade, or per-request | Compliance | High | Yes | No |
| P2-28 | Partner fee / origination model | Record and audit origination/facilitation fees for embedded finance referrals; legal review required | Compliance | High | Yes | No — legal review required |
| P2-29 | Data-sharing API design | Structured API contract for lender/partner data consumption of TexQticScore and VPC evidence | Partner integration | High | Yes | No — partner contract required |
| P2-30 | Score snapshot / versioning | Snapshot TexQticScore per invoice/trade/org at trigger events; version history for audit | Engineering | Medium | Yes | No |
| P2-31 | Finance marketplace audit trail | Append-only audit log for marketplace requests, partner interactions, and consent events | Compliance | High | Yes | No |
| P2-32 | Partner offer comparison UI | Tenant-facing surface showing available partner financing options for eligible invoices/VPCs | Product | Medium | Yes | No |

---

## 5A. TexQticScore + Embedded Finance Marketplace Strategic Extension

This section records the strategic direction for TexQtic TradeTrust Pay beyond the original Phase 2 candidate map. It is a **scoping addendum only** — not an implementation authorization, design artifact, or activation order.

### 5A.1 Strategic Vision

TexQtic TradeTrust Pay is designed to evolve from a **verified invoice readiness and routing-readiness layer** into a **textile-specific embedded finance enablement layer**.

> *TexQtic verifies trade events, computes TexQticScore, prepares finance-ready invoice and VPC evidence, and routes eligible trade opportunities to licensed finance partners — without lending, holding funds, underwriting loans, or moving money.*

This is not a new product. It is the natural Phase 2/3 extension of TexQtic TradeTrust Pay:

| Layer | Name | Purpose |
|---|---|---|
| Product umbrella | TexQtic TradeTrust Pay | Verified invoice, VPC, routing-readiness, enrollment, trust workflow |
| Scoring layer | TexQticScore | Proprietary behavioural and transactional advisory signal |
| Finance marketplace layer | Embedded Finance Marketplace | TReDS, NBFC/SCF, dynamic discounting option routing |
| Future intelligence layer | Payment / liquidity intelligence | Recommendations and warnings, not credit approval |

The internal concept name **TexCredit** is treated as a strategic concept for internal discussion only. The governance and product umbrella remains **TexQtic TradeTrust Pay**. No separate product or standalone module is authorized by this document.

### 5A.2 TexQticScore — Definition and Boundaries

**TexQticScore** is a proprietary TexQtic platform-generated behavioural and transactional readiness signal.

#### What TexQticScore is

- A platform-native advisory signal computed from verified in-platform trade and compliance data.
- A multi-dimensional readiness indicator evolving from Phase 1 TradeTrust Score.
- A structured input that licensed finance partners may optionally use as one underwriting data point.
- Advisory and non-binding in all cases.

#### What TexQticScore is NOT

TexQticScore is not, and must never be represented as:

- A CIBIL score
- A statutory credit score under any Indian or international regulatory framework
- A loan approval or loan eligibility confirmation
- A payment guarantee
- A financing commitment from TexQtic or any partner
- A partner approval or lender acceptance decision
- A regulated credit decision
- A legally binding creditworthiness assessment

All user-facing and partner-facing language must preserve these boundaries. TexQticScore wording requires legal/compliance review before any public use.

#### TexQticScore v2 — Future Input Dimensions

TexQticScore v2 is a Phase 2/3 design target only. The following input dimensions are proposed; none are implemented by this document.

**1. Procurement consistency**
- Purchase frequency and regularity
- Procurement regularity across trade cycles
- Raw material buying patterns relative to seasonal norms

**2. Order execution fidelity**
- Delivery completion rate
- Quality gate pass rate
- Dispute history and dispute resolution speed
- On-time fulfilment rate

**3. Network position**
- Repeat counterparty depth (repeat buyer-seller pairs)
- Syndicate lead or member status
- Buyer/seller relationship depth and tenure

**4. Payment behaviour**
- Promptness of on-platform invoice payments
- Invoice acceptance rate and payment history
- Dispute-linked payment delays

**5. Compliance and GST linkage**
- GST verification status (Phase 1: manual review; future: GSTN/GSP with consent)
- Tax-filed turnover triangulation (future only — requires legal approval and consent framework)

**Future extension factors (post-partner integration and legal approval only)**

6. VPC performance history — financing resolution on prior VPCs
7. Partner repayment / settlement feedback — only after partner integrations exist and legal/data-sharing approval is obtained

> Phase 1 TradeTrust Score is a simpler advisory readiness indicator. TexQticScore v2 requires a separate design artifact before any implementation.

### 5A.3 TexQticScore Types

TexQtic should avoid a single monolithic score. Three future score types are proposed:

| Score Type | Purpose |
|---|---|
| Seller TexQticScore | Seller execution reliability and liquidity readiness |
| Buyer Trust Score | Buyer payment reliability and invoice approval behaviour |
| Invoice Financeability Score | Whether a specific invoice/VPC is finance-ready for a given partner rail |

- Phase 1 TradeTrust Score is the current advisory readiness score.
- TexQticScore v2 and the three score types are Phase 2/3 design targets.
- **No new score implementation is authorized by this amendment.**

### 5A.4 Embedded Finance Marketplace Rails

TexQtic TradeTrust Pay should offer an embedded finance marketplace — a structured surface where eligible verified invoices and VPCs can be routed to licensed finance partners on the seller's behalf, with appropriate consent and legal gates.

TexQtic is always a **data channel and routing layer only** in this model. It does not lend, underwrite, guarantee, hold funds, or operate regulated finance rails.

#### Rail 1 — TReDS Invoice Discounting

- Future route for eligible invoices accepted by larger or anchor buyers
- TexQtic pre-fills structured VPC/invoice evidence to reduce manual data entry on TReDS platforms
- Actual financing occurs entirely on licensed TReDS platform rails (RXIL, M1xchange, INVOICEMART, etc.)
- TexQtic acts as origination and data preparation channel only; no TexQtic balance sheet exposure; no payment handling
- **Requires:** partner contract with TReDS platform, legal review, consent design, API design, and explicit Paresh authorization — none authorized by this document

#### Rail 2 — SIDBI / NBFC / SCF Partner Routing

- Future route for working capital, invoice finance, and supplier credit
- TexQticScore may become one optional, non-binding underwriting input for licensed finance partners
- TexQtic acts as origination and data channel only; no credit risk on TexQtic balance sheet
- TexQtic does not lend, co-sign, or guarantee
- **Requires:** signed partner agreement, consent architecture, legal review, sandbox credentials, and explicit Paresh authorization — none authorized by this document

#### Rail 3 — Dynamic Discounting

- Future buyer-funded early payment option for supplier
- Anchor buyer may offer a discount to supplier in exchange for earlier invoice settlement
- Lower regulatory complexity if TexQtic records and facilitates only and does not hold or move funds
- **Requires:** product and legal review of payment flow, consent design, buyer agreement model, and explicit Paresh authorization — none authorized by this document

#### Finance Rails — No-Go Boundaries

All three rails share the following absolute no-go boundaries until separately authorized:

| Item | Status |
|---|---|
| Any live implementation of finance rails | NO-GO |
| Any live API integration with TReDS, NBFC, SIDBI, SCF | NO-GO |
| Any partner transmission or outbound partner HTTP to finance partners | NO-GO |
| Any funds movement, custody, disbursement, or payment handling | NO-GO |
| Any TexQtic credit risk, lending, or loan underwriting | NO-GO |
| Any regulated credit decision issued by or attributed to TexQtic | NO-GO |
| Any finance partner credentials or secrets | NO-GO |

---

## 6. Recommended Phase 2 Buckets

### Bucket A — Safe activation / control-plane hardening

These items can progress before any live integration. They reduce activation risk and improve operational readiness.

| Item | Reference |
|---|---|
| Per-org scoped feature flag / activation gate | P2-01 |
| Activation runbook and rollback procedure | P2-16 |
| Monitoring and alerting for TTP routes | P2-13 |
| Legal / compliance copy review | P2-12 |
| QA fixture cleanup / environment isolation plan | P2-11 |
| Admin audit trail enhancements | P2-10 |

**Classification:** Low regulatory risk. No partner contracts required. Safe to design and implement independently.

---

### Bucket B — Product polish / UX readiness

These items improve the tenant-facing product surface. No external integration required.

| Item | Reference |
|---|---|
| VPC PDF / download / export | P2-08 |
| TradeTrust Score v2 — explainability and admin overrides | P2-09 |
| Role-based buyer / seller UX refinements | P2-15 |
| WL-specific TradeTrust branding controls | P2-14 |
| Relationship-specific buyer-seller caps | P2-02 |
| VPC external / shareable certificate format | P2-07 |

**Classification:** Product-scope. No compliance gate. Can be designed and implemented in parallel with Bucket A.

---

### Bucket C — External data integrations

These items replace manual verification with live API data sources. Each requires legal, consent, and data-privacy review before design.

| Item | Reference |
|---|---|
| Live GST verification API (GSTN) | P2-03 |
| Live CIBIL / bureau API | P2-04 |
| Validation webhook callbacks | P2-06 (partial) |
| Phase 2 data retention model | P2-17 |
| API credentials / secrets management (GST, bureau) | P2-18 (partial) |

**Classification:** Requires legal/compliance approval before design or implementation. Requires API provider contract and sandbox credentials. Cannot start until Bucket A legal review is complete.

---

### Bucket D — Partner routing integrations

These items replace the partner routing stub with an actual transmission and callback lifecycle. Each requires a signed partner contract and sandbox credentials.

| Item | Reference |
|---|---|
| Partner routing transmission (NBFC / SCF / TReDS / factoring) | P2-05 |
| Partner status callbacks / webhook receiver | P2-06 |
| Partner dashboard / status views | (new) |
| API partner credentials / secrets management | P2-18 |

**Classification:** Requires signed partner contracts. Requires sandbox integration testing. Cannot start until partner is identified, contracted, and credentials obtained. Bucket A + Bucket C prerequisites must be met first.

---

### Bucket E — Regulated finance / payment rails

**These items are forbidden until a separate legal and regulatory decision is made.** No design, no scoping, no stub work is authorized under this document.

| Item | Status |
|---|---|
| PSP / payment gateway integration | FORBIDDEN — Phase 1 boundary (OD-002) |
| Escrow custody / funds holding | FORBIDDEN — Doctrine D-020-B, OD-003 |
| Lending / NBFC / credit-risk taking | FORBIDDEN — OD-003 |
| Payment guarantee / buyer default guarantee | FORBIDDEN — OD-003 |
| Managed settlement / disbursement | FORBIDDEN — Doctrine D-020-B |
| Digital negotiable instrument issuance | FORBIDDEN — OD-004A (product branding only) |
| ICC/Singapore TradeTrust / W3C VC/DID/PKI/eBL | FORBIDDEN — OD-004A |

**Bucket E remains UNCONDITIONALLY FORBIDDEN until TexQtic obtains applicable regulatory authorization, legal opinion, and explicit Paresh approval. No Phase 2 or Phase 3 unit may approach Bucket E without a separate, standalone authorization artifact signed by Paresh.**

**Explicit behavioral prohibitions for TexQtic at all phases:**

- TexQtic does not lend.
- TexQtic does not underwrite loans.
- TexQtic does not hold funds.
- TexQtic does not guarantee payment.
- TexQtic does not act as a payment aggregator.
- TexQtic does not become a TReDS platform.
- TexQtic does not issue regulated credit decisions.
- TexQtic routes verified, consented data only to licensed partners after full legal and contract gates.

---

### Bucket F — TexQticScore + Embedded Finance Marketplace

These items constitute the Phase 2/3 strategic extension of TexQtic TradeTrust Pay. They are **design targets only** — no implementation is authorized by this document.

| Item | Reference |
|---|---|
| TexQticScore v2 design — multi-dimensional input model | P2-19 |
| Score snapshots and versioning | P2-30 |
| Three score types (Seller TexQticScore, Buyer Trust Score, Invoice Financeability Score) | P2-20, P2-21, P2-22 |
| Embedded Finance Marketplace design | P2-23 |
| TReDS invoice discounting design | P2-24 |
| SIDBI / NBFC / SCF partner routing design | P2-25 |
| Dynamic discounting design | P2-26 |
| Partner offer comparison UI | P2-32 |
| Origination / facilitation fee model | P2-28 |
| Lender data-sharing contract model | P2-29 |
| Consent architecture for data sharing | P2-27 |
| Finance marketplace audit trail | P2-31 |

**Classification:** Strategic Phase 2/3 extension.

**Prerequisites (all must exist before any Bucket F implementation begins):**

- Scoped activation design complete (Bucket A)
- Legal/compliance review complete for TexQticScore wording, consent, and partner representations (Section 7 gates)
- Partner contracts in place for any external finance rails (Section 8 gates)
- No Bucket E regulated behavior introduced

**Absolute constraints:**

- TexQtic does not lend or underwrite loans in any Bucket F implementation.
- TexQtic does not hold or move funds.
- TexQtic does not guarantee payment or repayment.
- TexQtic does not act as a TReDS platform or payment aggregator.
- TexQtic does not issue regulated credit decisions.
- TexQtic routes verified, consented data only to licensed partners after full legal and contract gates.

---

## 7. Legal / Compliance Gate

The following Phase 2 items require **legal and compliance approval before any design or implementation work begins**. Proceeding without this approval is a product governance violation.

| Item | Legal / Compliance Risk |
|---|---|
| Live CIBIL / credit bureau access | Personal/business credit data; requires consent framework, DPDP-aligned data handling, bureau API agreement |
| Live GST data access | Government data source; access agreement, data usage restrictions, retention limits |
| Partner routing transmission | Commercial contract; representations about trade data quality and completeness |
| VPC certificate wording | Certificate-like document; legal review of language to avoid regulated-instrument implications |
| TradeTrust Score wording | Score disclaimer language; must not imply credit score, financing approval, or partner commitment |
| Financing / eligibility language in UI/API | Must not imply TexQtic is making a credit decision or financing offer |
| Data retention for GST/CIBIL/VPC records | DPDP compliance; retention and deletion timelines |
| Consent capture for bureau / GST pulls | Informed consent mechanism required before any live data pull |
| Audit log retention and export | Compliance requirement for regulated-adjacent operations |
| PSP / payment / lending / custody language | Absolutely forbidden without legal opinion and regulatory authorization |
| TexQticScore public wording | Must not imply credit score, statutory creditworthiness assessment, or regulated credit decision |
| Partner-facing score interpretation | Language describing TexQticScore to lenders must be pre-approved, non-binding, and advisory-only |
| Consent to share platform behavioural data with lenders | Informed consent required before any platform data is shared with finance partners |
| GSTN / GSP consent for live verification | Org-level consent required before any live GSTN/GSP data pull |
| CIBIL / bureau consent | Separate org-level consent required before any bureau data pull |
| Account Aggregator framework usage | If AA framework is used for data aggregation, separate compliance design and consent model required |
| Lender data-sharing agreements | Commercial data-sharing contract with each lender/partner required before any data flows |
| Dynamic discounting wording | Must not imply TexQtic payment facilitation, guarantee, or platform-held funds |
| Origination / facilitation fee disclosure | Any fee model must be disclosed and reviewed by legal before implementation |
| Avoidance of "approval / guarantee / credit score" claims | All public-facing and tenant-facing language must be reviewed to eliminate regulated-instrument implications |

**Action required:** Legal review must be completed for all Bucket C, D, E, and F items before those buckets can enter design. Bucket A legal copy review (`P2-12`) is a prerequisite for Buckets C, D, and F.

---

## 8. External Partner Gate

The following Phase 2 items require **external partner contracts or sandbox credentials** before design or implementation:

| Item | Partner / Credential Required |
|---|---|
| Live GST verification API | GSTN API access (via licensed GSP — GST Suvidha Provider); sandbox + production agreement |
| Live CIBIL / bureau API | CIBIL or equivalent bureau; API agreement, consent audit requirements, data-pull SLA |
| Partner routing transmission | Identified NBFC / SCF provider / TReDS platform / factoring partner; signed data-sharing agreement |
| Partner status callbacks | Partner webhook endpoint, authentication model, event schema agreement |
| Webhook callback verification | Partner-side signing key / HMAC scheme; requires partner cooperation |
| Partner API SLA / retries / idempotency | Defined in partner contract; cannot be designed without partner input |
| API credentials / secrets management | Requires credentials from each external provider before storage design is finalized |
| SIDBI | Partnership or referral agreement for working-capital routing; sandbox API access |
| NBFCs | Individual signed data-sharing and referral agreements; sandbox API credentials |
| SCF fintechs | API integration contract; event schema agreement; sandbox and production access |
| TReDS platforms (RXIL, M1xchange, INVOICEMART) | Data pre-fill API agreement; onboarding contract; sandbox credentials |
| GSTN / GSP providers | Licensed GSP agreement; GSTN sandbox and production API access for live verification |
| Credit bureau providers (CIBIL, Experian, etc.) | Bureau API agreement; consent audit requirements; data-pull SLA |
| Account Aggregator participants | AA network registration and FIP/FIU framework agreement if AA is used |
| Buyer-funded dynamic discounting participants | Buyer agreement; payment-confirmation flow model; legal review |

**No Phase 2 or Phase 3 unit in Bucket C, D, E, or F may begin implementation until the relevant external partner contract is signed and sandbox credentials are confirmed.**

---

## 9. Technical Architecture Questions

The following open technical questions must be answered in Design V2 before implementation work begins in the affected areas.

| # | Question | Affects |
|---|---|---|
| TQ-01 | Should `ttp_enabled` remain a global Boolean, or be replaced with per-org / per-tier / per-role activation scope? What is the migration path from global to scoped? | P2-01, activation safety |
| TQ-02 | Should `partner_routing_stubs` records become persisted workflow records with a full state machine (PENDING → TRANSMITTED → ACCEPTED/REJECTED)? Or should a new `ttp_partner_workflows` table be introduced? | P2-05, P2-06, schema |
| TQ-03 | Should VPC state transition to `TRANSMITTED` only after a confirmed, persisted partner acknowledgement — or after the outbound HTTP call is made? | P2-05, VPC lifecycle integrity |
| TQ-04 | How should external partner callback events be stored? Append-only event log, or direct status mutation on the routing stub? Who can mutate state from a callback? | P2-06, audit integrity |
| TQ-05 | How should consent be recorded for live GST and CIBIL/bureau data pulls? Is consent per-org, per-trade, or per-request? What table/model? | P2-03, P2-04, consent design |
| TQ-06 | How should TradeTrust Score history be versioned? Should each score computation be snapshotted to a `ttp_score_snapshots` table, or remain ephemeral? | P2-09, audit, explainability |
| TQ-07 | Should TradeTrust Score be computed live (current behavior) or snapshotted on specific trigger events (VPC issuance, enrollment approval, admin review)? | P2-09, score architecture |
| TQ-08 | How should QA sentinel fixtures be separated from production data in the single-DB architecture? Options: `is_qa_sentinel` flag, separate UUID namespace, separate lifecycle state namespace, or schema prefix. | P2-11, environment isolation |
| TQ-09 | What monitoring and alerting signals are needed after TTP activation? Candidates: feature gate bypass attempts, VPC generation errors, eligibility expiry volume, 5xx on TTP routes, partner callback failures. | P2-13, operations |
| TQ-10 | What is the rollback path for a partial activation failure? If `ttp_enabled` is set to true for an org and must be reverted, what state cleanup is required? Are VPCs and routing stubs affected? | P2-16, rollback design |
| TQ-11 | How should TexQticScore v2 differ from Phase 1 TradeTrust Score in data model, input dimensions, and output contract? What migration path exists from the current `computeTtpScore` implementation? | P2-19, score design |
| TQ-12 | Should TexQticScore be snapshotted per invoice/trade/org at trigger events (VPC issuance, enrollment approval, admin review), or remain purely ephemeral as in Phase 1? | P2-30, score history |
| TQ-13 | Should TexQticScore history be externally shareable with lenders, or remain an internal platform signal only? What data-sharing API contract is required? | P2-29, P2-13, consent |
| TQ-14 | What consent model is required for sharing platform behavioural data with lenders? Per-org, per-trade, per-request, or time-bounded? What table or model stores consent records? | P2-27, consent design |
| TQ-15 | Should partner finance requests (TReDS, NBFC routing, dynamic discounting) be modeled as a new `ttp_finance_requests` table, or extend the existing `partner_routing_stubs` model? | P2-24, P2-25, P2-26, schema |
| TQ-16 | How should partner financing offers be represented and stored when a lender responds with terms? What status machine governs offer lifecycle? | P2-32, schema |
| TQ-17 | How should dynamic discounting offers be modeled — as buyer-initiated events, platform-generated from payment history, or admin-created? | P2-26, product |
| TQ-18 | Should Buyer Trust Score be computed from buyer invoice acceptance and payment history on-platform, or does it require separate buyer-consent data access beyond what is currently captured? | P2-21, privacy |
| TQ-19 | How should origination and facilitation fees be recorded, audited, and disclosed — as `ttp_fee_events`, as an extension of `ttp_audit_log`, or a separate compliance table? | P2-28, compliance |
| TQ-20 | How should TexQtic's data model and UI language be structured to prevent any interpretation of TexQtic as a lender, payment intermediary, or regulated finance provider at all points in the user journey? | Section 5A.2, legal |

---

## 10. Recommended Design V2 Scope

Design V2 should be a **focused, bounded design artifact** that answers the architectural questions above and authorizes the implementation of Bucket A and Bucket B items only.

### Design V2 should include

1. **Scoped activation architecture** — Replace global `ttp_enabled` with per-org or per-tier activation. Define the data model, migration path, and middleware changes (TQ-01).
2. **Activation runbook and monitoring** — Step-by-step operational guide for controlled TTP activation, monitoring signals, and rollback procedures (TQ-09, TQ-10).
3. **Legal/compliance copy model** — Reviewed disclaimer text, VPC certificate wording, Score advisory wording, consent flow design. Enables Bucket A and is prerequisite for Buckets C/D/F.
4. **Relationship-specific caps** — Data model for per-relationship or per-trade invoice cap overrides (P2-02).
5. **VPC export/share format** — Canonical structured format and PDF generation design for VPC (P2-07, P2-08).
6. **Live GST/CIBIL integration design only** — Architecture design (data flow, consent model, error handling, retry model), not implementation. Requires legal gate first (TQ-05).
7. **Partner routing transmission design only** — Protocol, state machine, callback handling design, not implementation. Requires partner contract first (TQ-02, TQ-03, TQ-04).
8. **Phase 2 data / audit model** — Score versioning, QA isolation, audit log export, data retention design (TQ-06, TQ-07, TQ-08).
9. **TexQticScore v2 architecture** — Multi-dimensional input model, score types, computation pipeline design, and distinction from Phase 1 TradeTrust Score (TQ-11, TQ-12).
10. **Score snapshot and versioning design** — Trigger events, snapshot model, external sharing policy (TQ-12, TQ-13).
11. **Consent and data-sharing model** — Consent design for lender data access, bureau data pulls, GSTN/GSP calls (TQ-14).
12. **Finance marketplace conceptual design** — Three rails (TReDS, NBFC/SCF, dynamic discounting), routing workflow, consent gates; design only, not implementation (TQ-15, TQ-16, TQ-17).
13. **Partner routing workflow design** — State machine for finance requests vs. routing stubs; partner offer model (TQ-15, TQ-16).
14. **Origination fee model** — Recording, auditing, and disclosure design (TQ-19).

### Design V2 must NOT include

- Any implementation of live GST or CIBIL APIs (Bucket C blocked by legal gate)
- Any implementation of partner routing transmission (Bucket D blocked by partner contract gate)
- Any PSP, payment, lending, custody, or Bucket E item (absolutely forbidden)
- Any live TexQticScore implementation using external bureau or GSTN data (requires Bucket C legal gate first)
- Any live partner finance rail implementation (TReDS, NBFC, dynamic discounting) — requires Bucket D partner contract gate
- Any fee collection, disbursement, or payment handling
- Any regulated credit decision output attributed to TexQtic
- Any Prisma migrations (requires separate approval)
- Any schema changes (requires separate approval)
- Any feature flag activation (`ttp_enabled` stays false)

---

## 11. Recommended Next Unit

Five candidate next units are available:

| Option | Unit | Description |
|---|---|---|
| A | `TTP-SCOPED-ACTIVATION-DESIGN-001` | Design the per-org / per-tier activation architecture to replace the global Boolean flag |
| B | `TTP-PHASE-1-LIMITED-ACTIVATION-PLAN-001` | Create a plan for controlled global activation of Phase 1 now |
| C | `TTP-DESIGN-V2-PHASE-2-FULL-ARTIFACT-001` | Open the full Design V2 artifact covering all Phase 2 buckets |
| D | `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` | Initiate legal/compliance review of all TTP-facing language |
| E | `TTP-QA-FIXTURE-CLEANUP-PLAN-001` | Define and implement QA data isolation strategy |

### Recommendation: `TTP-SCOPED-ACTIVATION-DESIGN-001`

**Rationale:**

The current activation mechanism is global-or-nothing. Setting `ttp_enabled=true` activates TTP for every tenant simultaneously, with no ability to control rollout by org, trade tier, or risk level. This makes any activation decision high-stakes and difficult to reverse at granularity below "turn off for everyone."

Scoped activation solves this before any other Phase 2 work begins:

- It enables a controlled limited rollout (e.g., a single pilot org) without full production exposure.
- It reduces the risk of the "Phase 1 limited activation" decision (Option B) by making activation reversible per-org.
- It is a pure architectural design — no external dependencies, no legal gates, no partner contracts required.
- Once scoped activation is designed, both Option B (limited activation) and Option C (full Phase 2 design) become lower-risk.

**If Paresh prefers immediate activation of Phase 1 before scoped activation design**, Option B (`TTP-PHASE-1-LIMITED-ACTIVATION-PLAN-001`) is the appropriate next step. This would define the operational runbook and monitoring requirements for a controlled global activation of Phase 1 as-built. However, this should be considered carefully given the global-only kill-switch constraint.

> **TexQticScore and Embedded Finance Marketplace note:** Both TexQticScore v2 and the Embedded Finance Marketplace (Bucket F) become safer and more actionable after scoped activation exists. Legal/compliance review (`TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001`) can proceed in parallel with scoped activation design and does not require code changes.

---

## 12. Phase 2 No-Go Boundaries

Until Design V2 is complete and separate implementation authorization exists from Paresh, the following are **absolute prohibitions**:

| Prohibition | Status |
|---|---|
| Live GST API integration or calls | NO-GO |
| Live CIBIL / credit bureau API integration or calls | NO-GO |
| Any partner routing transmission or outbound partner HTTP | NO-GO |
| Any PSP / payment gateway integration | NO-GO |
| Any escrow custody, funds holding, or disbursement | NO-GO |
| Any lending, NBFC, or credit-risk-taking behavior | NO-GO |
| Any payment guarantee or buyer default guarantee language or behavior | NO-GO |
| External partner credentials of any kind | NO-GO |
| Automatic global TTP activation (`ttp_enabled=true`) | NO-GO — requires separate Paresh decision |
| Per-org activation without a scoped activation design in place | NO-GO |
| Any ICC/Singapore TradeTrust / W3C VC/DID/PKI/eBL implementation | NO-GO |
| Live TexQticScore v2 implementation using external bureau or GSTN data | NO-GO — design + legal gate required |
| Any partner finance rail implementation (TReDS, NBFC, dynamic discounting) | NO-GO — design + legal gate + partner contract required |
| Any TexQtic lending, underwriting, or credit-risk-taking behavior | NO-GO |
| Any platform funds movement, custody, or disbursement | NO-GO |
| TexQticScore wording that implies a regulated credit decision | NO-GO — legal review required before any public use |
| Data sharing with lenders without consent framework and legal approval | NO-GO |
| Finance partner credentials or API keys of any kind | NO-GO — no partner contracts authorized |

---

## 13. Final Recommendation

**Final decision value: `PHASE_2_SCOPING_AMENDED_WITH_TEXQTICSCORE_EMBEDDED_FINANCE_EXTENSION`**

**Next recommended unit: `SCOPED_ACTIVATION_DESIGN_RECOMMENDED_NEXT`**

Phase 1 is technically complete, production-deployed, and verified across 38/38 E2E tests. The platform has a correct, production-safe TTP foundation behind a global kill-switch.

This scoping document has been amended to incorporate:

- TexCredit merged under TexQtic TradeTrust Pay as a strategic concept name only
- TexQticScore defined as the proprietary scoring layer of TradeTrust Pay
- Embedded Finance Marketplace added as Phase 2/3 strategic direction (Bucket F)
- Three finance rails defined as future design targets: TReDS invoice discounting, SIDBI/NBFC/SCF partner routing, and dynamic discounting
- No-go boundaries strengthened and TexQtic's non-lender, non-payment-intermediary position reinforced across all phases

The next prioritized action is:

1. **Initiate `TTP-SCOPED-ACTIVATION-DESIGN-001`** — design the per-org activation architecture so that future activation decisions can be made at granularity below global.
2. **Initiate `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` in parallel** — this unblocks Buckets C, D, and F without requiring code changes.
3. **Hold all live integrations** (Buckets C, D, E, and F external rails) behind the legal gate and partner contract gate.
4. **Do not activate `ttp_enabled=true`** until either a scoped activation design exists or a deliberate limited-global activation decision is made by Paresh via a separate activation plan unit.

### No-Change Confirmation (Amendment)

This document amendment confirms:

- `ttp_enabled=false` — unchanged
- No runtime change
- No code change
- No schema or migration change
- No seed or auth change
- No external API call
- No partner transmission
- No payment, lending, or custody behavior
- No implementation authorization of any kind

---

## Appendix A — Phase 1 Document Index

| Document | Role |
|---|---|
| `governance/TEXQTIC-TRADETRUST-PAY-PRODUCT-SCOPING-001.md` | Product scope definition |
| `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-001.md` | Phase 1 technical design artifact |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-BOUNDARY-CONFIRMATIONS-001.md` | OD-001–OD-005 boundary confirmations (Paresh) |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-DESIGN-OPEN-QUESTIONS-001.md` | Open questions resolved |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SLICE-1-FOUNDATION-VERIFIED-001.md` | Slice 1 verification |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SLICE-2-GST-VERIFICATION-VERIFIED-001.md` | Slice 2 verification |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SLICE-3-TTP-ELIGIBILITY-VERIFIED-001.md` | Slice 3 verification |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SLICE-4-INVOICE-DOMAIN-VERIFIED-001.md` | Slice 4 verification |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SLICE-5-VPC-PRODUCTION-VERIFIED-001.md` | Slice 5 production verification |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SLICE-6-PARTNER-ROUTING-STUB-PRODUCTION-VERIFIED-001.md` | Slice 6 production verification |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SLICE-7-TTP-SUMMARY-ENROLLMENT-PRODUCTION-VERIFIED-001.md` | Slice 7 production verification |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SLICE-8-SCORE-ADVISORY-VERIFIED-001.md` | Slice 8 verification |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-FULL-RUNTIME-AUDIT-001.md` | Full runtime audit |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-ACTIVATION-GATE-PRODUCTION-VERIFIED-001.md` | Activation gate production verification |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-SINGLE-DB-EXECUTION-001.md` | QA seed execution |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-QA-AUTH-TENANT-E2E-VERIFIED-001.md` | QA auth + tenant E2E |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TENANT-SUMMARY-RUNTIME-FIX-VERIFIED-001.md` | Tenant summary runtime fix |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-1-ACTIVATION-READINESS-SIGNOFF-001.md` | Phase 1 activation readiness sign-off |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-ROUTING-READINESS-CORRECTION-001.md` | QA routing readiness correction (38/38 E2E) |

---

## Appendix B — Phase 1 Code Truth

| File | Role |
|---|---|
| `server/src/ttp/ttp.constants.ts` | Single source of truth for all TTP domain constants, state keys, flags |
| `server/src/middleware/ttpFeatureGate.middleware.ts` | Global TTP kill-switch (fail-closed) |
| `server/src/services/gstVerification.service.ts` | Manual GST verification gate (no live API) |
| `server/src/services/ttpEligibility.service.ts` | Manual CIBIL eligibility gate (stub, no live bureau API) |
| `server/src/services/invoice.service.ts` | Invoice domain lifecycle |
| `server/src/services/vpc.service.ts` | VPC generation (12 gates) |
| `server/src/services/partnerRouting.service.ts` | Partner routing stub (create-on-read, no transmission) |
| `server/src/services/ttpSummary.service.ts` | Read-only trade readiness summary + score integration |
| `server/src/services/ttpScore.service.ts` | Pure advisory score computation (no DB, no external calls) |
| `server/src/routes/control/ttp-routing-stubs.ts` | Control-plane routing stub routes |
| `server/src/routes/control/vpc.ts` | Control-plane VPC routes |
| `server/src/routes/tenant/ttp-summary.ts` | Tenant-plane TTP summary route |
| `scripts/qa-ttp-seed.sql` | QA sentinel seed data (deterministic after routing-readiness correction) |
