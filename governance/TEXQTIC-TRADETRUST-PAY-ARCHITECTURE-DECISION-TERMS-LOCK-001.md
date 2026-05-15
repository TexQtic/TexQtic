# TEXQTIC-TRADETRUST-PAY-ARCHITECTURE-DECISION-TERMS-LOCK-001
## TexQtic TradeTrust Pay — Platform Architecture Decision and Terms Lock

| Field | Value |
|---|---|
| **Document ID** | `TEXQTIC-TRADETRUST-PAY-ARCHITECTURE-DECISION-TERMS-LOCK-001` |
| **Document Type** | Architecture decision lock — terms doctrine — internal governance artifact |
| **Status** | `ARCHITECTURE_LOCK_COMPLETE` |
| **Date** | 2026-07-06 |
| **Authorized by** | Paresh Patel (TexQtic founder / operator) |
| **Supersedes** | Nothing. Unifies and harmonises the following authority sources: |
| | `governance/TEXQTIC-NC-TRADETRUST-PAY-DESIGN-001.md` (DESIGN_COMPLETE 2026-07-05) |
| | `governance/runbooks/TTP-ACTIVATION-ROLLBACK-RUNBOOK-001.md` |
| | `governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` |
| | `governance/legal/TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md` |
| | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` |
| **Code changes** | None — governance/architecture lock only |
| **Schema changes** | None |
| **Migration changes** | None |
| **Feature flag activation** | None — `ttp_enabled` and all nc.* flags remain unchanged |
| **Implementation authorization** | None — this document does not authorize any implementation packet |

> **NO-IMPLEMENTATION DISCLAIMER.** This document locks architecture decisions and terms doctrine
> for the TradeTrust Pay product family. It does not authorize implementation of any feature,
> route, schema, migration, event, or UI surface. Every future implementation packet listed in
> this document requires a separate, explicit authorization from Paresh Patel.

---

## 1. Executive Summary

TexQtic operates a single TradeTrust Pay (TTP) product family. The family has two layers:

1. **Platform TTP Core** — bilateral trade readiness, VPC issuance, TexQticScore, eligibility
   assessment, enrollment, and routing readiness for 1:1 trade (buyer ↔ supplier, via `trades`).
2. **NC-TTP Extension** — the same doctrine applied to Network Commerce multi-party pool,
   syndicate, and VCO contexts (`network_*` tables).

The two layers share a single doctrine. NC-TTP extends Platform TTP; it does not fork it, contradict
it, or weaken it.

**Escrow-first is superseded.** `TEXQTIC-NC-OES-ESCROW-DESIGN-001` was reframed as
`SUPERSEDED_REFRAMED` (2026-07-05). TexQtic is not an escrow custodian, and no future
TTP or NC-TTP design may reintroduce platform-held funds.

**The four permanent prohibitions for the entire TTP family (Platform + NC):**

| Prohibition | Canonical statement |
|---|---|
| No money movement | TexQtic does not move, transfer, release, or hold funds at any point |
| No custody | TexQtic does not hold, escrow, or custody any financial asset |
| No lending | TexQtic does not lend, advance, or provide credit of any kind |
| No guarantee | TexQtic does not guarantee payment, underwrite risk, or act as insurer |

These prohibitions are architectural invariants. They cannot be relaxed, scoped away, or deferred by
any implementation packet. Any future design that would require violating one of these prohibitions
requires Paresh to revise this architecture lock document first.

---

## 2. Current Activation State (as of 2026-07-06)

| Gate | Value | Authority |
|---|---|---|
| `ttp_enabled` (global kill-switch) | **`false`** | `feature_flags` table — Supabase (authoritative) |
| All 13 Platform TTP routes | **HTTP 503 FEATURE_DISABLED** to all tenants | `ttpFeatureGateMiddleware` |
| `nc.settlement_waterfall.enabled` | **`false`** | Feature flags |
| `nc.procurement_pools.supplier_quotes.enabled` | **`false`** | Feature flags |
| `nc.procurement_pools.rfq.award.enabled` | **`false`** | Feature flags |
| Tenant-visible TTP surfaces | **None** | Hard gate |
| Partner integration (TTP) | **None** — stub only | `GET /api/control/ttp/routing-stubs/:vpcId` — admin stub, no outbound HTTP |
| NC-TTP routes | **Not yet built** | All in HOLD_FOR_PARESH_DECISION |
| Legal review status | **`LEGAL_REVIEW_PENDING`** | `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` |

This state is unchanged by this document. No activation step is authorized herein.

---

## 3. Architecture Lock — Component Map

### A. Shared Platform TTP Core (existing, all gated at `ttp_enabled=false`)

| Component | File/Location | State | NC-TTP reuse |
|---|---|---|---|
| Feature gate middleware (dual-layer) | `server/src/middleware/ttpFeatureGate.middleware.ts` | TRUTH_SYNCED | Gate model reused for NC TTP when authorized |
| TTP domain constants | `server/src/ttp/ttp.constants.ts` | TRUTH_SYNCED | All constants shared; NC may extend but not contradict |
| Advisory disclaimer (`TTP_DISCLAIMER_TEXT`) | `server/src/ttp/ttp.constants.ts` line ~298 | TRUTH_SYNCED; LEGAL_REVIEW_PENDING | NC-TTP uses same text; NC may add context-specific supplement |
| TexQticScore v2 disclaimer (`TEXQTICSCORE_V2_DISCLAIMER`) | `server/src/ttp/ttp.constants.ts` line ~328 | TRUTH_SYNCED; LEGAL_REVIEW_PENDING | Applicable to NC finance-readiness signal variants |
| VPC concept (ACTIVE/ROUTING_READY/TRANSMITTED/VOIDED/EXPIRED) | `TTP_VPC_STATE` constant | Stub only | Concept applicable to pool-level verified payment packages |
| TexQticScore compute | Control-plane service layer | Admin/backend only | Model may inform NC finance-readiness signal |
| Per-org activation override (`TenantFeatureOverride`) | Schema column | TRUTH_SYNCED | NC TTP activation uses same org-scoped pattern |
| QA sentinel isolation (`is_qa_sentinel`) | Schema column | TRUTH_SYNCED | NC TTP activation follows same QA sentinel sequence |
| Structured Pino log events (4 events) | Server services | TRUTH_SYNCED | Log taxonomy reused; NC adds NC-specific events |
| Activation/rollback runbook | `governance/runbooks/TTP-ACTIVATION-ROLLBACK-RUNBOOK-001.md` | TRUTH_SYNCED | Runbook model extended for NC TTP activation |
| TTP routes (13: 3 tenant, 10 control-plane) | `server/src/ttp/` | GATED (503) | Separate NC TTP routes in `server/src/nc/ttp/` (future) |
| Risk tiers (0–3) and eligibility outcomes | `TTP_RISK_TIER`, `TTP_ELIGIBILITY_OUTCOME` | TRUTH_SYNCED | NC may define pool/order tier mapping |
| Enrollment lifecycle | `TTP_ENROLLMENT_STATE` | TRUTH_SYNCED | NC enrollment adapts for pool/syndicate context |
| Invoice lifecycle (DRAFT → VERIFIED → VPC) | `TTP_INVOICE_STATE` | TRUTH_SYNCED | NC uses `network_invoices` — separate entity; same lifecycle philosophy |
| Partner routing stubs (`partner_routing_stubs` table) | DB + route | Stub only (admin) | NC partner routing readiness follows same stub-first approach |
| Partner type constants (NBFC_STUB/BANK_STUB/FACTORING_STUB) | `TTP_PARTNER_TYPE` | TRUTH_SYNCED | NC extends same partner type taxonomy |

### B. NC-TTP Extension Layer (future; all HOLD_FOR_PARESH_DECISION)

| Component | Scope | Dependency | Status |
|---|---|---|---|
| `NetworkPaymentTerm` model | Pool order / invoice payment term entity | Data model packet | HOLD_FOR_PARESH_DECISION |
| `NetworkSettlementConfirmation` model | External settlement confirmation record | Data model packet | HOLD_FOR_PARESH_DECISION |
| `NetworkFinanceReadiness` model | Finance-readiness signal per pool order | Data model packet | HOLD_FOR_PARESH_DECISION |
| `PartnerRoutingPackage` model | 8-component partner routing readiness bundle | Data model packet | HOLD_FOR_PARESH_DECISION |
| `ConsentRecord` model | Consent recording for data sharing | Legal + consent design | LEGAL_GATED__WAITING |
| Payment maturity service | `TERMS_PENDING` → `EXTERNALLY_CONFIRMED` FSM | Payment terms packet | HOLD_FOR_PARESH_DECISION |
| External confirmation service | Record-only; no payment execution | Ext. confirmation packet | HOLD_FOR_PARESH_DECISION |
| Finance-readiness computation | Advisory signal; not credit score | Finance readiness packet | HOLD_FOR_PARESH_DECISION |
| Partner routing stubs (NC) | Readiness package only; no transmission | Legal + partner gates | PARTNER_GATED__WAITING |
| NC TTP gate middleware | Extends `ttpFeatureGateMiddleware`; adds NC context | Gate design | HOLD_FOR_PARESH_DECISION |
| OES TTP adaptation | Syndicate-level payable visibility; escrow superseded | OES TTP packet | HOLD_FOR_PARESH_DECISION |
| VCO TTP adaptation | Per-stage payable visibility + maturity | VCO TTP packet | HOLD_FOR_PARESH_DECISION |

### C. Explicitly Forbidden Architecture

The following architectural patterns are forbidden for all time in the TTP product family:

| Forbidden pattern | Reason | Authority |
|---|---|---|
| Platform-held escrow account | Custodial liability; regulatory (NBFC/PA) | This lock; NC Design §2; NC TTP Design §2 |
| Payment execution from TexQtic | PSP/payment aggregator liability | This lock; NC Design Foundation §15 |
| Credit scoring for tenant use | LEGAL_REVIEW_PENDING; bureau regulations | TTP-LEGAL-PACKET §3; This lock D-011 |
| Lending or advance funding | NBFC registration required | This lock D-005; Regulatory table |
| Payment guarantee | Insurance/underwriting regulation | This lock D-004 |
| Platform account that holds funds | Custodial/banking regulation | This lock §1 |
| Settlement field `RELEASED` emitted without doctrine review | Schema-reserved; triggers financial liability signal | NC TTP Design §5 |
| Automatic partner data transmission without: (a) explicit consent, (b) partner contract, (c) legal review, (d) Paresh authorization | DPDP; partner contract liability | This lock D-010; Legal Packet §3 |
| Forking platform TTP constants for NC | Creates divergent doctrine; prohibited | This lock §3-A; D-006 |

---

## 4. Platform TTP ↔ NC-TTP Alignment Matrix

| Concern | Platform TTP owner | NC-TTP extension | Shared artifact | Decision | Future packet |
|---|---|---|---|---|---|
| Doctrine (no money / no custody / no lending / no guarantee) | Platform TTP Design v2 | NC TTP inherits; cannot contradict | This lock §1 | D-001, D-003, D-004, D-005 | — |
| Feature gate (global) | `ttp_enabled` feature flag | Reuses same flag; NC routes also require global gate | `ttpFeatureGateMiddleware` | D-001 | NC TTP gate design |
| Feature gate (per-org) | `TenantFeatureOverride` | Same table; NC adds `nc.ttp.*` flags | Schema + middleware | D-001 | NC TTP gate design |
| Advisory disclaimer text | `TTP_DISCLAIMER_TEXT` constant | Inherited; NC may add contextual supplement (cannot contradict) | `ttp.constants.ts` | D-006 | — |
| TexQticScore | Platform score compute (control-plane/admin) | Finance-readiness signal for NC (different label, same philosophy) | Disclaimer constants | D-011 | TEXQTIC-NC-TRADETRUST-PAY-FINANCE-READINESS-001 |
| VPC concept | Platform VPC (bilateral trade) | Pool/syndicate-level Verified Payment Certificate (future) | VPC state taxonomy | D-015 | TEXQTIC-NC-TRADETRUST-PAY-DATA-MODEL-001 |
| Partner routing | Routing stub (admin-only; no outbound) | Pool-level routing readiness package (8 components) | `TTP_PARTNER_TYPE` constants | D-010 | Partner gate required |
| Payment terms | Not in platform TTP (bilateral) | New: `NetworkPaymentTerm` with 7 anchor events | Maturity status taxonomy (9 statuses) | D-009 | TEXQTIC-NC-TRADETRUST-PAY-PAYMENT-TERMS-001 |
| External settlement confirmation | Not in platform TTP | New: `NetworkSettlementConfirmation` (6 types; record-only) | Confirmation taxonomy | D-008 | TEXQTIC-NC-TRADETRUST-PAY-EXTERNAL-CONFIRMATION-001 |
| Payable visibility | `NetworkSettlementSplit.status=PENDING` | Inherits; `RELEASED` reserved | NSS status constants | D-007 | — |
| Escrow | `escrow_account_id` field (nullable, legacy bridge) | `escrow_account_id=null` enforced; escrow-first superseded | D-015 field; §2 | D-015, D-013 | — |
| Legal review gate | `LEGAL_REVIEW_PENDING` on all tenant surfaces | Same gate applies to all NC-TTP tenant surfaces | This lock §10; Legal Packet | D-010, D-011 | `TEXQTIC-TRADETRUST-PAY-TERMS-CONSENT-LEGAL-PACKET-001` |
| QA sentinel model | `is_qa_sentinel` column; QA activation sequence | Same column; NC QA activations follow same sentinel isolation | Schema + runbook | D-001 | — |
| Structured log events | 4 gate-level Pino events | Extends with NC-specific events | Pino log taxonomy | D-011 | NC TTP gate design |
| OES settlement | Escrow-first (SUPERSEDED_REFRAMED) | TTP payable visibility + external confirmation | This lock D-013 | D-013 | TEXQTIC-NC-OES-TRADETRUST-PAY-ADAPTATION-001 |
| VCO settlement | Not designed | Per-stage TTP payable visibility + maturity | NC TTP Design §9 | D-014 | TEXQTIC-NC-VCO-TRADETRUST-PAY-ADAPTATION-001 |
| Consent / data sharing | Not built (LEGAL_GATED) | Same gate | This lock §12 | D-010 | `TEXQTIC-TRADETRUST-PAY-TERMS-CONSENT-LEGAL-PACKET-001` |

---

## 5. Decision Matrix (D-001 through D-015)

### D-001 — Single TTP family (Platform TTP Core + NC-TTP Extension)

| Field | Content |
|---|---|
| **Decision** | TradeTrust Pay is one product family with two implementation layers. Platform TTP covers bilateral trade. NC-TTP extends the same doctrine to multi-party NC contexts. There is no separate NC TTP doctrine. |
| **Rationale** | Forking creates divergent legal posture and inconsistent tenant experience. A single family enforces one no-money-movement / no-custody / no-lending / no-guarantee doctrine across all trade contexts. |
| **Consequence** | NC TTP cannot introduce terminology, features, or postures not in Platform TTP unless explicitly locked in this document. Any new NC-TTP wording that does not appear here requires a new architecture lock revision. |
| **Implementation implication** | NC TTP routes live in `server/src/nc/ttp/`. NC TTP services import from `server/src/ttp/ttp.constants.ts`. No constants forking. No separate disclaimer text. |
| **Prohibited alternative** | Separate NC TTP doctrine, separate NC disclaimer, separate NC feature flag taxonomy. |
| **Future packet** | `TEXQTIC-TRADETRUST-PAY-CORE-ARCHITECTURE-SYNC-001` |

### D-002 — Payment-term maturity / payable visibility as primary framing (NOT escrow-first)

| Field | Content |
|---|---|
| **Decision** | TexQtic is a payment-term maturity layer and payable visibility layer. It is NOT an escrow platform, and no future design may introduce platform-held escrow semantics. |
| **Rationale** | B2B textile operates on 5–100+ day open-account terms. Capital lockup in escrow is not viable. Escrow introduces custodial liability and regulatory classification risk. `TEXQTIC-NC-OES-ESCROW-DESIGN-001` was superseded/reframed on 2026-07-05. |
| **Consequence** | `escrow.service.ts` bilateral model is retained as a structural component but must not be extended. All new settlement design uses the TTP payable visibility model. |
| **Implementation implication** | `NetworkSettlementSplit.status=PENDING` is the safe baseline. `TRIGGERED`, `RELEASED`, `FAILED` are schema-reserved. All new settlement tracking uses `NetworkPaymentTerm` + `NetworkSettlementConfirmation`. |
| **Prohibited alternative** | Platform-held escrow, custodial account, real-money-in-transit account. |
| **Future packet** | `TEXQTIC-NC-TRADETRUST-PAY-PAYMENT-TERMS-001` |

### D-003 — TexQtic does NOT move money

| Field | Content |
|---|---|
| **Decision** | TexQtic does not execute, initiate, authorize, transmit, or route payment instructions on behalf of any party. All payment execution is performed exclusively by licensed external financial partners. |
| **Rationale** | Payment execution requires PA/PG licence (RBI). TexQtic's platform role is visibility, workflow, documentation, and readiness — not payment intermediation. |
| **Consequence** | Any API endpoint, service method, UI action, or event that would cause funds to move is forbidden. |
| **Implementation implication** | `external_settlement_confirmed_at` and `external_settlement_reference` fields record that a party has confirmed a payment occurred externally. They do not constitute TexQtic executing or verifying the payment. |
| **Prohibited alternative** | Payment trigger API, settlement disbursement service, payment release workflow, payout button, wire transfer instruction. |
| **Future packet** | — (permanent invariant) |

### D-004 — TexQtic does NOT guarantee payment

| Field | Content |
|---|---|
| **Decision** | TexQtic provides no payment guarantee, performance bond, credit guarantee, trade guarantee, or insurance of any kind for any party or transaction on the platform. |
| **Rationale** | Payment guarantees require insurance / underwriting authorisation. Guarantee language creates direct financial liability. |
| **Consequence** | No TTP or NC-TTP feature, route, label, or user-facing text may imply a guarantee. |
| **Implementation implication** | "Guaranteed payment", "TexQtic guarantees", "payment secured by TexQtic", and all variants are forbidden in code, constants, UI copy, email, and documentation. |
| **Prohibited alternative** | Payment guarantee product, trade credit insurance, performance surety, buyer guarantee. |
| **Future packet** | — (permanent invariant) |

### D-005 — TexQtic does NOT lend or advance funds

| Field | Content |
|---|---|
| **Decision** | TexQtic does not lend money, extend credit, advance invoice proceeds, provide supply-chain finance directly, or act as a regulated NBFC or credit institution. |
| **Rationale** | Lending and advances require NBFC registration (RBI). Credit provision without licence is an offense under RBI guidelines. |
| **Consequence** | No TTP or NC-TTP feature, route, label, or UI surface may position TexQtic as a lender, advance provider, or credit grantor. |
| **Implementation implication** | Finance-readiness signals connect to external partners who provide financing. TexQtic provides readiness visibility only. |
| **Prohibited alternative** | Supply-chain finance origination by TexQtic, invoice advance, dynamic discounting funded by TexQtic, working capital lending. |
| **Future packet** | — (permanent invariant) |

### D-006 — NC-TTP reuses platform TTP disclaimers (NC may add; cannot contradict)

| Field | Content |
|---|---|
| **Decision** | NC-TTP surfaces use the same `TTP_DISCLAIMER_TEXT` and `TEXQTICSCORE_V2_DISCLAIMER` constants from `ttp.constants.ts`. NC may add a contextual NC-specific supplement. NC must not create disclaimer text that weakens, contradicts, or omits the platform baseline. |
| **Rationale** | Consistent legal posture across all trade contexts. Divergent disclaimers create inconsistent legal protection and confuse tenant experience. |
| **Consequence** | `TTP_DISCLAIMER_TEXT` is the floor. All NC TTP advisory wording must satisfy it. |
| **Implementation implication** | Future NC TTP constants file (`nc.ttp.constants.ts`) may define NC-specific supplement text but must import and re-export platform constants. |
| **Prohibited alternative** | Separate NC disclaimer that omits credit-score / payment-guarantee language. Shorter NC disclaimer. |
| **Future packet** | `TEXQTIC-TRADETRUST-PAY-TERMS-CONSENT-LEGAL-PACKET-001` |

### D-007 — `NetworkSettlementSplit.status=RELEASED` — reserved only; must not be emitted

| Field | Content |
|---|---|
| **Decision** | `NetworkSettlementSplit.status` values `TRIGGERED`, `RELEASED`, and `FAILED` are schema-reserved. They must not be emitted by any service, route, event, or test without a separate doctrine review and explicit Paresh authorization. `PENDING` is the only authorized operational status. |
| **Rationale** | `RELEASED` implies funds were disbursed. Emitting it without a licensed partner disbursement constitutes a false financial state record and may attract regulatory attention. |
| **Consequence** | All current and future `NetworkSettlementSplit` records have `status=PENDING` until a licensed disbursement event occurs under a proper legal framework. |
| **Implementation implication** | Settlement computation services (e.g., Packet 20) compute split amounts and write `status=PENDING` only. No status transition code may advance to `RELEASED` without this lock being updated. |
| **Prohibited alternative** | Auto-transitioning to `RELEASED` upon external confirmation, writing `RELEASED` as a mock state in tests. |
| **Future packet** | Requires its own architecture review and lock update before this can be unblocked. |

### D-008 — External payment confirmation = record/event only; not payment execution

| Field | Content |
|---|---|
| **Decision** | External settlement confirmation in TexQtic means a buyer or supplier has asserted that payment occurred outside the platform. TexQtic records this assertion as an event. TexQtic does not verify, authenticate, or guarantee the underlying fund transfer. |
| **Rationale** | Confirmation is informational. TexQtic's role is to record the confirmed state, compute maturity transitions, and update payable visibility. It does not verify the bank. |
| **Consequence** | External confirmation types (manual, bank-ref, ERP-ref, doc-upload, counterparty-ack, partner-callback) are all informational. The confirmor bears responsibility for accuracy. |
| **Implementation implication** | `external_settlement_confirmed_at` transitions `maturity_status` to `EXTERNALLY_CONFIRMED` (terminal). API returns HTTP 200 but makes no outbound financial call. Append-only log. |
| **Prohibited alternative** | Bank account verification API, RPC to external bank, payment status polling, SWIFT message. |
| **Future packet** | `TEXQTIC-NC-TRADETRUST-PAY-EXTERNAL-CONFIRMATION-001` |

### D-009 — Payment terms are configurable per trade/order/invoice/relationship; no hardcoded default

| Field | Content |
|---|---|
| **Decision** | Payment terms on TexQtic are configurable per trade, pool order, invoice, or relationship. There is no single platform-wide default. The 7 anchor event types and configurable fields are locked here, but specific default values may be set at the product layer. |
| **Rationale** | B2B textile payment terms vary by fabric type, supplier relationship, buyer geography, export/import status, credit history, and contract. A single hardcoded default would be incorrect for the majority of tenants. |
| **Consequence** | `NetworkPaymentTerm` must have `payment_anchor_event` (required), `payment_terms_days` (required), `payment_anchor_date` (nullable — set when event occurs), and `payment_due_date` (computed from anchor). |
| **Implementation implication** | Anchor events: `INVOICE_DATE`, `SHIPMENT_DATE`, `DELIVERY_DATE`, `ACCEPTANCE_DATE`, `QUALITY_PASS_DATE`, `CUSTOM_CLEARANCE_DATE`, `MILESTONE_DATE`. All 7 are valid. Platform should not reject a valid anchor event. |
| **Prohibited alternative** | Single global payment term, hardcoded 30-day net, non-configurable payment anchor. |
| **Future packet** | `TEXQTIC-NC-TRADETRUST-PAY-PAYMENT-TERMS-001` |

### D-010 — Partner routing = readiness package only until legal + consent + partner contract + activation

| Field | Content |
|---|---|
| **Decision** | Partner routing in TexQtic means assembling an 8-component readiness package and making it available for admin review. No outbound data transmission to any finance partner may occur until: (a) a formal partner contract exists, (b) tenant consent is recorded under a legally-reviewed consent framework, (c) external legal review is complete, and (d) Paresh has issued explicit activation authorization. |
| **Rationale** | Data transmission to finance partners triggers: DPDP consent obligations, partner contract requirements, potential PA/PG, NBFC notification, and financial privacy liability. |
| **Consequence** | `GET /api/control/ttp/routing-stubs/:vpcId` returns a stub package. It does not transmit. Current partner type constants (`NBFC_STUB`, `BANK_STUB`, `FACTORING_STUB`) are stubs only. `TTP_TRANSMISSION_STATUS.PENDING` is the only active status. |
| **Implementation implication** | No outbound HTTP to any partner. `partner_routing_stubs` table is a readiness record, not a transmission log. `TRANSMITTED` status in `TTP_VPC_STATE` is terminal and irreversible — must not be set without partner contract + consent. |
| **Prohibited alternative** | Automatic partner notification, outbound partner HTTP, partner portal push. |
| **Future packet** | `TEXQTIC-TRADETRUST-PAY-TERMS-CONSENT-LEGAL-PACKET-001` (pre-condition) |

### D-011 — Finance-readiness ≠ credit score; advisory signal only

| Field | Content |
|---|---|
| **Decision** | TexQtic finance-readiness signals (including TexQticScore and any NC-TTP equivalent) are advisory readiness indicators only. They are NOT credit scores, bureau products, creditworthiness assessments, loan eligibility determinations, or CIBIL-equivalent signals. |
| **Rationale** | Credit scoring for third-party use is regulated. Presenting a score as a credit assessment without bureau licence violates consumer protection and financial services law. Platform must prevent any tenant, partner, or regulator from reasonably inferring a credit determination. |
| **Consequence** | `TEXQTICSCORE_V2_DISCLAIMER` must appear on every surface showing a score. NC finance-readiness signals require the same disclaimer. No score or readiness band label may use language associated with creditworthiness. |
| **Implementation implication** | Finance-readiness computation is advisory only. `finance_readiness_status` transitions to `READY` signal readiness within TexQtic's checklist criteria — not external creditworthiness. |
| **Prohibited alternative** | "Credit score", "creditworthy", "CIBIL equivalent", "finance score", "risk rating for third-party use". |
| **Future packet** | `TEXQTIC-NC-TRADETRUST-PAY-FINANCE-READINESS-001` |

### D-012 — One master TTP doctrine + NC-specific supplemental terms (not two separate doctrines)

| Field | Content |
|---|---|
| **Decision** | The TTP terms structure is: one master platform doctrine (this document, §6) + one NC-specific supplement (this document, §7). The supplement adds NC-specific context. It does not override, replace, or weaken the master doctrine. |
| **Rationale** | One master doctrine ensures legal consistency across all TexQtic product surfaces. Two separate doctrines risk contradiction and inconsistent legal posture under the same platform entity. |
| **Consequence** | All NC-TTP design documents, implementation packets, and legal review packets must reference the master doctrine in §6 of this document. The supplement in §7 provides NC-specific additions only. |
| **Implementation implication** | Future `TEXQTIC-TRADETRUST-PAY-TERMS-CONSENT-LEGAL-PACKET-001` must present both §6 (master) and §7 (NC supplement) to counsel in one review packet. |
| **Prohibited alternative** | NC-only terms document that does not reference master doctrine. |
| **Future packet** | `TEXQTIC-TRADETRUST-PAY-TERMS-CONSENT-LEGAL-PACKET-001` |

### D-013 — OES settlement inherits TradeTrust Pay (no escrow-first)

| Field | Content |
|---|---|
| **Decision** | Phase 2 OES (syndicates) settlement design must use the TradeTrust Pay doctrine: payable visibility, external confirmation, finance-readiness signal, partner routing readiness. Platform-held escrow is forbidden for OES. |
| **Rationale** | `TEXQTIC-NC-OES-ESCROW-DESIGN-001` was formally superseded/reframed on 2026-07-05. OES syndicate settlement is a multi-party pool context — more complex than bilateral trade, but governed by the same no-money-movement doctrine. |
| **Consequence** | OES Phase 2 packets must design settlement under TTP doctrine. The `escrow.service.ts` bilateral model is retained structurally but must not be the OES settlement model. |
| **Implementation implication** | OES settlement records `NetworkSettlementSplit` splits with `status=PENDING`. External confirmation follows `NetworkSettlementConfirmation`. No escrow account linked. |
| **Prohibited alternative** | OES-specific escrow account, syndicate-held pool fund, lot-level escrow release. |
| **Future packet** | `TEXQTIC-NC-OES-TRADETRUST-PAY-ADAPTATION-001` |

### D-014 — VCO settlement inherits TradeTrust Pay (per-stage payable visibility + maturity)

| Field | Content |
|---|---|
| **Decision** | Phase 3 VCO (value-chain orchestration) settlement design must use the TradeTrust Pay doctrine: per-stage payment term maturity, per-stage payable visibility, external confirmation per stage, finance-readiness at the stage level. |
| **Rationale** | VCO involves multiple production stages across multiple suppliers. Each stage may have independent payment terms and maturity triggers. The same no-money-movement doctrine applies. |
| **Consequence** | VCO Phase 3 packets must design per-stage payment terms. VCO DPP integration (when authorized) follows TTP payable visibility framing. |
| **Implementation implication** | `NetworkPaymentTerm` is per-stage. `maturity_status` is per-stage. `NetworkSettlementConfirmation` is per-stage. No cross-stage escrow fund. |
| **Prohibited alternative** | Platform-held VCO stage fund, VCO escrow per production stage, VCO advance payment by platform. |
| **Future packet** | `TEXQTIC-NC-VCO-TRADETRUST-PAY-ADAPTATION-001` |

### D-015 — `escrow_account_id` = reserved nullable legacy/bridge field; no custodial escrow semantics

| Field | Content |
|---|---|
| **Decision** | The `escrow_account_id` field in `NetworkSettlementSplit` is a nullable, reserved field. It carries no custodial escrow semantics. It is retained for potential future use as a bridge field to a Verified Payment Certificate ID. All current and future `NetworkSettlementSplit` records must have `escrow_account_id=null`. |
| **Rationale** | The field was introduced before the escrow-first model was superseded. Rather than a breaking migration, it is re-designated as a nullable bridge/legacy field. Setting it to a non-null value without a new architecture lock is forbidden. |
| **Consequence** | No service, route, or test may write a non-null value to `escrow_account_id` without an explicit Paresh-authorized architecture lock update. |
| **Implementation implication** | Future VPC-linking may use `escrow_account_id` → renamed `vpc_id` or `payment_certificate_id` (requires migration lock). Until then, `null` always. |
| **Prohibited alternative** | Writing an escrow account ID from any escrow provider, writing any custodial fund reference. |
| **Future packet** | `TEXQTIC-NC-TRADETRUST-PAY-DATA-MODEL-001` (bridge field rename decision) |

---

## 6. Terms and Conditions Doctrine — Master Platform TTP (Internal Baseline)

> **INTERNAL GOVERNANCE ONLY.** These are internal doctrine statements for governance purposes.
> They are NOT final external-facing terms and conditions.
> External legal counsel must review and approve all tenant-visible wording before any production use.
> Reference: `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md §3`, `TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md §3`.

### 6.1 Scope and Nature of TradeTrust Pay

TradeTrust Pay is a readiness, workflow, and documentation layer within the TexQtic platform.
It is not a payment product, lending product, escrow product, financial intermediary, or regulated
financial product. Use of TradeTrust Pay does not create a financial relationship between TexQtic
and any user.

### 6.2 No Funds Custodianship

TexQtic does not hold, transfer, custody, or invest any funds on behalf of any buyer, seller, or
third party. No monetary amount displayed in any TradeTrust Pay surface represents funds held by
TexQtic. All monetary figures are computational representations of trade obligations between parties.

### 6.3 No Payment Execution

TexQtic does not execute, initiate, or authorize payments. Payment confirmation features record
a user's statement that payment occurred through their own bank or payment channel. TexQtic does
not verify this statement against any bank or payment system.

### 6.4 No Credit Assessment

TexQtic's finance-readiness signals and TexQticScore are platform-internal advisory readiness
indicators only. They are based on TexQtic's own internal criteria. They do not constitute a credit
score, bureau assessment, creditworthiness determination, or eligibility decision for any financial
product. Users should not rely on these signals as a credit determination.

### 6.5 No Lending or Advance

TexQtic does not lend money, extend credit facilities, advance invoice proceeds, or arrange credit
of any kind. TradeTrust Pay features that connect users with potential finance partners are
introductory and readiness-documentation features only. TexQtic does not underwrite, guarantee,
or participate in any financing transaction between a user and a finance partner.

### 6.6 No Payment Guarantee

TexQtic does not guarantee that any payment will be made or received. Buyer payment obligations
remain solely between buyer and seller. TexQtic's platform records trade states and payment
term maturity for visibility purposes only.

### 6.7 Advisory Disclaimer (Interim — Legal Review Pending)

The following disclaimer is approved for internal use and is awaiting legal counsel sign-off before
any tenant-visible or partner-visible use:

> *"TradeTrust Pay readiness signals are informational and advisory only. They are not a credit
> score, financing approval, payment guarantee, lending decision, or partner commitment."*

Source: `server/src/ttp/ttp.constants.ts :: TTP_DISCLAIMER_TEXT`

This text may not be shortened, modified, or omitted in any context where TTP readiness
signals are shown without counsel approval.

### 6.8 TexQticScore Advisory Disclaimer (Interim — Legal Review Pending)

> *"TexQticScore is an advisory readiness indicator only. It is not a credit score, payment
> guarantee, financing approval, or partner commitment."*

Source: `server/src/ttp/ttp.constants.ts :: TEXQTICSCORE_V2_DISCLAIMER`

Same legal review requirement applies.

### 6.9 External Legal Counsel Gate

No TradeTrust Pay terms, disclaimers, wording, labels, or band descriptions may be shown to
tenants, partners, or any external party until:

1. `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` receives written counsel sign-off.
2. All proposed wording is counsel-approved and the approval is recorded in governance.
3. Paresh Patel issues explicit activation authorization referencing counsel sign-off.

This gate applies equally to Platform TTP and NC-TTP.

---

## 7. Terms and Conditions Doctrine — NC-TTP Supplement

> **INTERNAL GOVERNANCE ONLY.** Same legal review requirement as §6. These are additions for
> Network Commerce multi-party trade contexts. They supplement §6; they do not replace it.

### 7.1 NC-Specific Trade Contexts

Network Commerce TradeTrust Pay applies to:

- **Procurement pool orders:** Multi-buyer pool orders where multiple buyers aggregate demand
  against a single supplier's lot offering. Each pool order has independent payment terms.
- **Syndicate orders (OES Phase 2):** Multi-supplier syndicate fulfilment of a large buyer order.
  Per-lot payable visibility applies to each syndicate lot.
- **Value-chain orders (VCO Phase 3):** Multi-stage production chain. Per-stage payment term
  maturity and payable visibility apply to each stage.

### 7.2 Pool Order Payment Terms

Pool order payment terms are configured per pool order or invoice at time of order creation.
They are not inherited from any platform-wide default. The buyer-supplier payment terms configured
in a pool order are advisory workflow tools. TexQtic does not enforce collection of these amounts.

### 7.3 Multi-Party External Confirmation

In a pool order, multiple parties (each pool member and the supplier) may record external
settlement confirmations. Each confirmation is scoped to `org_id` and is independent. No party
can record a confirmation on behalf of another party without explicit delegation logic (not yet
designed; requires future authorization).

### 7.4 Finance-Readiness in NC Context

Finance-readiness signals computed for pool orders reflect TexQtic's internal readiness assessment
for that pool order and the associated supplier. They do not reflect the creditworthiness of any
pool member buyer or the aggregate buying group. They remain advisory and informational only
(see §6.4).

### 7.5 NC Payable Visibility Scope

`NetworkSettlementSplit` records created for pool orders represent a computational split of the
trade obligation between pool participants. They do not represent funds held, transferred, or
released by TexQtic. The `status=PENDING` value means the split has been computed. It does not
mean payment is pending with TexQtic.

### 7.6 OES and VCO Supplement

For syndicate (OES) and VCO contexts, the same NC-TTP supplement applies, adapted to per-lot
and per-stage granularity. The no-escrow, no-money-movement, no-guarantee prohibitions apply
at every level of the OES and VCO hierarchies.

---

## 8. User-Facing Wording Lock

### 8.1 Approved Wording (internal/admin only until counsel sign-off)

The following wording is approved for internal use and admin-only surfaces (not tenant-visible):

| Wording | Context | Status |
|---|---|---|
| "TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score, financing approval, payment guarantee, lending decision, or partner commitment." | All TTP readiness signal surfaces | LEGAL_REVIEW_PENDING — admin/internal only |
| "TexQticScore is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment." | TexQticScore surfaces | LEGAL_REVIEW_PENDING — admin/internal only |
| "Payment terms are configurable and informational. TexQtic does not collect or guarantee these amounts." | Payment term displays | LEGAL_REVIEW_PENDING — admin/internal only |
| "External settlement confirmation records a party's assertion that payment occurred outside this platform. TexQtic does not verify the underlying fund transfer." | External confirmation surfaces | LEGAL_REVIEW_PENDING — admin/internal only |
| "Finance partner routing readiness package is a documentation bundle. It does not constitute consent, data transmission, or partner engagement." | Routing readiness package admin view | LEGAL_REVIEW_PENDING — admin/internal only |

### 8.2 Forbidden Wording (permanently — no counsel approval will suffice for these)

The following phrases must never appear in any TexQtic surface (user-facing, admin, email, docs,
support copy) without a formal architecture lock revision authorized by Paresh:

| Forbidden phrase | Reason |
|---|---|
| "Approved for financing" | Credit determination language |
| "Eligible for loan" | Credit determination language |
| "Guaranteed payment" | Insurance/guarantee language |
| "Credit approved" | Credit determination language |
| "TexQtic will pay" | Implies platform payment obligation |
| "Escrow protected" | Custodial language — escrow-first superseded |
| "Funds secured" | Custodial / guarantee language |
| "Advance available" | Lending language |
| "Instant payout" | Payment execution language |
| "Your credit score" | Credit bureau language |
| "CIBIL equivalent" | Credit bureau comparison |
| "Creditworthy" | Credit assessment conclusion |
| "TexQtic guarantees" | Guarantee language |
| "Platform holds your funds" | Custodial language |
| "Funds in escrow" | Custodial language |
| "Payment released by TexQtic" | Payment execution + release language |
| "We will advance" | Lending language |

### 8.3 Counsel-Required Wording (approved only after written counsel sign-off)

All of the following require explicit written counsel approval before any use, including internal
or admin surfaces:

- All TexQticScore band labels (e.g., "Strong", "Developing", "Needs Attention") — must be reviewed
  for credit-score-adjacent language
- "Eligible for partner engagement" or any variant implying partner eligibility determination
- Consent wording for data sharing with finance partners
- Partner-facing wording about what the routing readiness package contains
- Fee disclosure wording (not yet designed)
- Any wording that names or references a specific finance partner

---

## 9. Feature Gate / Activation Matrix

### 9.1 Current Gates

| Gate flag | Current value | Description |
|---|---|---|
| `ttp_enabled` | `false` | Global TTP kill-switch. All 13 Platform TTP routes return 503. |
| `nc.settlement_waterfall.enabled` | `false` | NC settlement waterfall. Not gating TTP. |
| `nc.procurement_pools.supplier_quotes.enabled` | `false` | Supplier quotes. Not TTP-related. |
| `nc.procurement_pools.rfq.award.enabled` | `false` | RFQ award. Not TTP-related. |

### 9.2 Future NC TTP Gates (not yet defined — HOLD_FOR_PARESH_DECISION)

These flags are proposed for future NC TTP activation. They do NOT exist in the database yet.
Their exact naming will be confirmed in the NC TTP gate design packet.

| Proposed flag | Purpose | Authority to define | Legal prereq | Consent prereq | Allowed scope when true | Forbidden even when true |
|---|---|---|---|---|---|---|
| `nc.ttp.payment_terms.enabled` | Enable NC payment term maturity computation | NC TTP gate design packet | LEGAL_REVIEW_PENDING | None (internal) | Payment term create/update/read for pool orders | No payment execution |
| `nc.ttp.external_confirmation.enabled` | Enable external settlement confirmation recording | NC TTP gate design packet | Legal review required | Tenant consent for confirmation recording | Confirmation record/read | No fund release, no bank verification |
| `nc.ttp.finance_readiness.enabled` | Enable finance-readiness signal computation | NC TTP gate design packet | Legal review required | None (advisory signal) | Readiness signal compute/read (admin only initially) | No tenant surface until counsel |
| `nc.ttp.partner_routing.enabled` | Enable partner routing readiness package assembly | NC TTP gate design packet | Legal review required + partner contract | Full consent framework | Routing package admin view | No outbound transmission, no data sharing |
| `nc.ttp.oes.enabled` | Enable OES-specific TTP payable visibility | OES TTP adaptation packet | Same as nc.ttp.payment_terms.enabled | None (internal) | OES settlement split + confirmation | No escrow |

### 9.3 Gate Architecture Invariants

| Invariant | Description |
|---|---|
| Dual-layer gate | Global flag AND per-org `TenantFeatureOverride` must both be true. Missing override = blocked. |
| Fail-closed | DB error during gate check → 503 FEATURE_DISABLED. Never fail-open. |
| QA sentinel first | Wave 0 activation for any NC TTP flag must use a QA sentinel org (`is_qa_sentinel=true`). |
| Legal gate before tenant surface | Any flag that exposes a surface to tenants requires `LEGAL_REVIEW_PENDING` resolved. |
| Rollback runbook required | Each activation requires a runbook. `TTP-ACTIVATION-ROLLBACK-RUNBOOK-001.md` is the template. |
| Paresh explicit authorization | No gate may be activated without an explicit Paresh-approved prompt naming the target org UUID. |

---

## 10. Data Architecture Lock

The following data models are pre-defined for future NC TTP implementation. Their schemas are not
created here. Each requires a separate, Paresh-authorized implementation packet. Column definitions
are indicative; final column names and types are locked in the data model packet.

| Model | Purpose | Key fields | Implementation packet | Status |
|---|---|---|---|---|
| `NetworkPaymentTerm` | Payment term per pool order/invoice | `org_id`, `pool_order_id`, `payment_anchor_event`, `payment_terms_days`, `payment_anchor_date`, `payment_due_date`, `grace_period_days`, `maturity_status`, `external_settlement_confirmed_at`, `external_settlement_reference`, `hold_reason`, `finance_readiness_status` | TEXQTIC-NC-TRADETRUST-PAY-DATA-MODEL-001 | HOLD_FOR_PARESH_DECISION |
| `NetworkSettlementConfirmation` | External settlement confirmation record (append-only) | `org_id`, `pool_order_id`, `confirmed_by_user_id`, `confirmation_type`, `confirmed_at`, `reference_value`, `notes`, `immutable=true` | TEXQTIC-NC-TRADETRUST-PAY-EXTERNAL-CONFIRMATION-001 | HOLD_FOR_PARESH_DECISION |
| `NetworkFinanceReadiness` | Advisory finance-readiness signal per pool order | `org_id`, `pool_order_id`, `finance_readiness_status`, `readiness_factors_json`, `computed_at`, `expires_at` | TEXQTIC-NC-TRADETRUST-PAY-FINANCE-READINESS-001 | HOLD_FOR_PARESH_DECISION |
| `PartnerRoutingPackage` | 8-component partner routing readiness bundle | `org_id`, `vpc_id_or_pool_order_id`, `verified_invoice`, `buyer_confirmation`, `supplier_consent`, `buyer_consent`, `finance_readiness_signal`, `payable_split_record`, `compliance_state`, `partner_eligibility_flag` | (Partner gate design) | PARTNER_GATED__WAITING |
| `ConsentRecord` | Tenant consent for data sharing | `org_id`, `user_id`, `consent_type`, `consent_text_version`, `consented_at`, `withdrawn_at`, `purpose` | TEXQTIC-TRADETRUST-PAY-TERMS-CONSENT-LEGAL-PACKET-001 | LEGAL_GATED__WAITING |
| `TradeTrustPayReadinessSignal` | Platform TTP readiness signal (extends Phase 1) | Extends `ttp_eligibility_assessments` + TexQticScore | TEXQTIC-TRADETRUST-PAY-CORE-ARCHITECTURE-SYNC-001 | HOLD_FOR_PARESH_DECISION |
| `NetworkPaymentTermAnchorEvent` | Anchor event occurrence record | `org_id`, `pool_order_id`, `anchor_event_type`, `occurred_at`, `recorded_by` | TEXQTIC-NC-TRADETRUST-PAY-PAYMENT-TERMS-001 | HOLD_FOR_PARESH_DECISION |

---

## 11. Event and Audit Architecture Lock

### 11.1 Platform TTP Structured Log Events (existing — `TRUTH_SYNCED`)

| Event key | Trigger | Status |
|---|---|---|
| `ttp.feature_gate.global_blocked` | `ttp_enabled=false` blocks request | TRUTH_SYNCED |
| `ttp.feature_gate.org_blocked` | Per-org override missing or disabled | TRUTH_SYNCED |
| `ttp.feature_gate.allowed` | Both gate layers pass | TRUTH_SYNCED |
| `ttp.feature_gate.db_error` | DB error during flag lookup | TRUTH_SYNCED |

### 11.2 Future NC TTP Events (indicative; locked in NC TTP gate design packet)

| Event key | Trigger | Status |
|---|---|---|
| `nc.ttp.feature_gate.global_blocked` | NC TTP global gate blocks request | HOLD_FOR_PARESH_DECISION |
| `nc.ttp.feature_gate.org_blocked` | NC TTP per-org gate blocks request | HOLD_FOR_PARESH_DECISION |
| `nc.ttp.feature_gate.allowed` | NC TTP gate passes | HOLD_FOR_PARESH_DECISION |
| `nc.ttp.payment_term.created` | `NetworkPaymentTerm` created | HOLD_FOR_PARESH_DECISION |
| `nc.ttp.payment_term.maturity_transition` | `maturity_status` transition recorded | HOLD_FOR_PARESH_DECISION |
| `nc.ttp.external_confirmation.recorded` | Settlement confirmation recorded | HOLD_FOR_PARESH_DECISION |
| `nc.ttp.finance_readiness.computed` | Finance-readiness signal computed | HOLD_FOR_PARESH_DECISION |
| `nc.ttp.routing_package.assembled` | 8-component routing package assembled | HOLD_FOR_PARESH_DECISION |

### 11.3 Audit Invariants (all TTP events)

| Invariant | Description |
|---|---|
| Append-only | TTP lifecycle log entries are immutable. No delete, no soft-delete, no overwrite. |
| `org_id` scoped | Every event is scoped to `org_id`. Cross-org queries are control-plane only. |
| No PII in event payload | Event payloads must not contain bank account numbers, payment credentials, GSTN data, or financial credentials. Reference IDs only. |
| Actor type required | Every log event records `actor_type` (`TENANT_USER`, `TENANT_ADMIN`, `PLATFORM_ADMIN`, `SYSTEM_AUTOMATION`). |
| AI-triggered events | Events where AI suggested the action must include `TTP_AI_REASON_PREFIX = 'HUMAN_CONFIRMED:'` in the reason field (D-020-C). |

---

## 12. Consent and Data-Sharing Lock

### 12.1 Current State

No consent framework exists in the codebase. No consent recording has been implemented. No data
has been shared with any finance partner. This is intentional.

### 12.2 Consent Gate

Before any data about tenants, their trades, their invoices, or their financial readiness is shared
with any external party (finance partner, NBFC, bank, factoring company), the following must all
be complete:

| Prerequisite | Status | Gate |
|---|---|---|
| Consent framework designed | Not designed | LEGAL_GATED__WAITING |
| Consent wording reviewed by legal counsel | Not designed | LEGAL_GATED__WAITING |
| Consent recording implemented (`ConsentRecord` model) | Not built | LEGAL_GATED__WAITING |
| DPDP alignment confirmed by counsel | Not reviewed | LEGAL_GATED__WAITING |
| Partner contract in place | No partner contracts | PARTNER_GATED__WAITING |
| Paresh explicit activation authorization | Not issued | HOLD_FOR_PARESH_DECISION |

### 12.3 Data Minimisation Principle (locked for future design)

When consent and partner sharing are eventually designed:
- Share only the minimum data required for the partner's assessment.
- Do not share live GSTN data, CIBIL data, or Account Aggregator data without separate government
  agreements and consent frameworks.
- Sharing must be purpose-limited (declared purpose in `ConsentRecord.purpose`).
- Withdrawal of consent must be technically honoured within 72 hours.

### 12.4 No Inferred Consent

No feature, pre-selected checkbox, platform terms of service acceptance, or enrollment in TTP
constitutes consent to data sharing with finance partners. Consent must be explicitly, separately,
and specifically given for each distinct partner or partner category.

---

## 13. Platform TTP / NC-TTP Terms Finalization Matrix

| Surface | Current state | Required before tenant use | Gate |
|---|---|---|---|
| Platform TTP advisory disclaimer (`TTP_DISCLAIMER_TEXT`) | Code constant — LEGAL_REVIEW_PENDING | Written counsel sign-off | `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` |
| TexQticScore disclaimer (`TEXQTICSCORE_V2_DISCLAIMER`) | Code constant — LEGAL_REVIEW_PENDING | Written counsel sign-off | `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` |
| TexQticScore band labels | Not yet designed for tenant use | Counsel review + Paresh approval | LEGAL_GATED |
| VPC tenant-visible description | Not yet designed for tenant use | Counsel review + Paresh approval | LEGAL_GATED |
| Enrollment consent (Platform TTP) | Not yet designed | Consent framework + counsel | LEGAL_GATED__WAITING |
| NC payment term display wording | Not yet designed | Counsel review + Paresh approval | LEGAL_GATED |
| NC external confirmation disclaimer | Not yet designed | Counsel review + Paresh approval | LEGAL_GATED |
| NC finance-readiness signal labels | Not yet designed | Counsel review + Paresh approval | LEGAL_GATED |
| NC partner routing readiness wording | Not yet designed | Consent + partner contract + counsel | PARTNER_GATED__WAITING |
| Fee/disclosure wording | Not yet designed | RBI/disclosure law review by counsel | FUTURE_DESIGN_TARGET__WAITING |

---

## 14. Gaps / Open Iteration Items (For Future Architecture Lock Revisions)

The following items require resolution before the corresponding implementation packets can open.
They are not blockers for this architecture lock. They are recorded here for transparency.

| Gap ID | Description | Blocks | Resolution path |
|---|---|---|---|
| GAP-001 | `NetworkSettlementSplit.status=RELEASED` — exact semantics when licensed disbursement occurs | D-007 unblocking | Separate doctrine review + lock revision |
| GAP-002 | `escrow_account_id` field rename/deprecation strategy | D-015 bridge migration | `TEXQTIC-NC-TRADETRUST-PAY-DATA-MODEL-001` |
| GAP-003 | Settlement label (`NetworkSettlementSplit`) — rename to `NetworkPayableSplit` or `NetworkPayableVisibility` for doctrine alignment | Future naming review | Tracker addendum |
| GAP-004 | External confirmation type: "partner callback" — webhook security and data contract | `TEXQTIC-NC-TRADETRUST-PAY-EXTERNAL-CONFIRMATION-001` | External confirmation design packet |
| GAP-005 | GST / e-invoice integration as payment term anchor event | `TEXQTIC-NC-TRADETRUST-PAY-PAYMENT-TERMS-001` | Payment terms packet + government agreement |
| GAP-006 | Export LC/DA/DP payment term types | `TEXQTIC-NC-TRADETRUST-PAY-PAYMENT-TERMS-001` | Payment terms packet (advanced mode) |
| GAP-007 | Multi-currency payment terms (INR baseline only for Phase 2) | NC payment terms | Multi-currency design decision |
| GAP-008 | Finance-readiness signal expiry and refresh cadence | `TEXQTIC-NC-TRADETRUST-PAY-FINANCE-READINESS-001` | Finance readiness design packet |
| GAP-009 | What constitutes "buyer confirmation" in pool context (one member? majority? threshold?) | `NetworkPaymentTerm.buyer_confirmation` in routing package | Pool business rules design |
| GAP-010 | Consent withdrawal and retroactive data deletion obligations | Consent framework | `TEXQTIC-TRADETRUST-PAY-TERMS-CONSENT-LEGAL-PACKET-001` |
| GAP-011 | Whether RELEASED status will ever be emitted or whether it should be removed from the schema | D-007 | Architecture lock revision required |
| GAP-012 | TexQticScore v2 band labels and tenant-facing copy — awaiting counsel | §8.3 | Legal review packet |

---

## 15. Final Architecture Lock Statement

The following is the canonical one-paragraph statement of TexQtic's TradeTrust Pay architecture.
All future design, implementation, and legal review packets must be consistent with this statement.

---

> **TexQtic TradeTrust Pay is a verified trade-state and payable-visibility system of record
> for B2B textile trade. It computes payment term maturity, records external settlement
> confirmation events, generates advisory finance-readiness signals, and assembles partner
> routing readiness packages. At no point does TexQtic move money, hold funds, guarantee
> payment, extend credit, or advance funds. Settlement execution is performed exclusively
> by licensed external financial partners. Partner engagement requires explicit consent,
> a partner contract, external legal counsel review, and Paresh Patel authorization.
> TradeTrust Pay is not a credit bureau product, payment aggregator, escrow platform,
> NBFC, or regulated financial institution.**

---

This statement applies equally to Platform TTP (bilateral trade) and NC-TTP (Network Commerce
multi-party pool, syndicate, and VCO contexts).

Any future implementation, feature, or legal review packet that requires language inconsistent
with this statement cannot proceed without a formal revision to this architecture lock document,
authorized in writing by Paresh Patel.

---

## 16. Future Packet Map (all HOLD_FOR_PARESH_DECISION)

| # | Packet ID | Scope | Status | Pre-conditions |
|---|---|---|---|---|
| 1 | **TEXQTIC-TRADETRUST-PAY-TERMS-CONSENT-LEGAL-PACKET-001** | Legal review of master TTP terms + NC supplement + consent framework | HOLD_FOR_PARESH_DECISION | This lock COMPLETE; external counsel engagement |
| 2 | **TEXQTIC-TRADETRUST-PAY-CORE-ARCHITECTURE-SYNC-001** | Sync Platform TTP Phase 2 (TexQticScore, VPC, eligibility) with NC-TTP doctrine | HOLD_FOR_PARESH_DECISION | This lock COMPLETE; `ttp_enabled` activation authorized |
| 3 | **TEXQTIC-NC-TRADETRUST-PAY-DATA-MODEL-001** | Schema: `NetworkPaymentTerm`, `NetworkSettlementConfirmation`, `NetworkFinanceReadiness`, `NetworkPaymentTermAnchorEvent` | HOLD_FOR_PARESH_DECISION | This lock COMPLETE; NC TTP gate design complete |
| 4 | **TEXQTIC-NC-TRADETRUST-PAY-PAYMENT-TERMS-001** | Backend service + routes for payment-term maturity computation | HOLD_FOR_PARESH_DECISION | Data model packet COMPLETE |
| 5 | **TEXQTIC-NC-TRADETRUST-PAY-EXTERNAL-CONFIRMATION-001** | External settlement confirmation routes + lifecycle log event | HOLD_FOR_PARESH_DECISION | Data model packet COMPLETE |
| 6 | **TEXQTIC-NC-TRADETRUST-PAY-FINANCE-READINESS-001** | Advisory finance-readiness signal computation + admin read routes | HOLD_FOR_PARESH_DECISION | Data model packet COMPLETE; legal gate resolved |
| 7 | **TEXQTIC-NC-OES-TRADETRUST-PAY-ADAPTATION-001** | OES (syndicates) settlement design under TTP doctrine — replaces escrow-first | HOLD_FOR_PARESH_DECISION | This lock COMPLETE; OES schema COMPLETE |
| 8 | **TEXQTIC-NC-VCO-TRADETRUST-PAY-ADAPTATION-001** | VCO per-stage payment term maturity + payable visibility | HOLD_FOR_PARESH_DECISION | This lock COMPLETE; VCO schema COMPLETE |

**All 8 packets are HOLD_FOR_PARESH_DECISION.** None are authorized by this document.
No packet may open without an explicit Paresh-approved prompt.

---

## 17. Authority Sources

| Document | Role |
|---|---|
| `governance/TEXQTIC-NC-TRADETRUST-PAY-DESIGN-001.md` | Primary NC TTP design authority (14 sections; DESIGN_COMPLETE 2026-07-05) |
| `governance/runbooks/TTP-ACTIVATION-ROLLBACK-RUNBOOK-001.md` | Gate semantics, 13 routes, Pino events, activation pre-conditions |
| `governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` | Legal review packet; company context; current activation state; regulatory classifications |
| `governance/legal/TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md` | Blocked items; what is/is not built; operator decision guide |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` | TQ-01..TQ-20 architecture direction approvals (PHASE_2_ARCHITECTURE_QUESTIONS_APPROVED_FOR_DESIGN_PLANNING) |
| `governance/TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md` §15 | Foundational no-funds-custody doctrine; waterfall computation model |
| `governance/TEXQTIC-NC-POST-PHASE1-NEXT-TRACK-TRADETRUST-PAY-ALIGNMENT-001.md` | Escrow supersession rationale; NC TTP candidate installation |
| `governance/TEXQTIC-NC-PHASE1-CLOSE-AUDIT-001.md` §11 | Phase 1 TTP findings; no-money-movement confirmed |
| `server/src/ttp/ttp.constants.ts` | Platform TTP constants (all disclaimer text, VPC states, partner types, risk tiers, enrollment states, gate flags) |
| `server/src/middleware/ttpFeatureGate.middleware.ts` | Dual-layer gate implementation (global + per-org) |

---

## 18. Invariants Confirmed Unchanged

| Invariant | Status |
|---|---|
| Active delivery unit | HOLD_FOR_AUTHORIZATION — UNCHANGED |
| `ttp_enabled` | `false` — UNCHANGED |
| DPP launch authorization | HOLD_FOR_PARESH_DECISION — UNCHANGED |
| G-022 (escalation design) | HOLD_FOR_PARESH_DECISION — UNCHANGED |
| `nc.procurement_pools.supplier_quotes.enabled` | `false` — UNCHANGED |
| `nc.procurement_pools.rfq.award.enabled` | `false` — UNCHANGED |
| `nc.settlement_waterfall.enabled` | `false` — UNCHANGED |
| OES Phase 2 slices | NOT_STARTED — UNCHANGED |
| VCO Phase 3 slices | NOT_STARTED — UNCHANGED |
| All Phase 1 tests (185/185) | PASS — confirmed at c320811 |
| No source/schema/migration/frontend/test/.env changes | CONFIRMED |
| No feature flag activation | CONFIRMED |
| No payment execution / money movement | CONFIRMED |
| No lending / credit / guarantee | CONFIRMED |
| No platform-held funds | CONFIRMED |

---

*End of TEXQTIC-TRADETRUST-PAY-ARCHITECTURE-DECISION-TERMS-LOCK-001.*
