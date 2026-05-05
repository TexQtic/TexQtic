# TEXQTIC-TRADETRUST-PAY-DESIGN-V2-PHASE-2-SCOPING-001

**Type:** Phase 2 Product Scoping Artifact — Design V2 Boundary Definition
**Status:** `SCOPING_COMPLETE — DESIGN_V2_REQUIRED_BEFORE_LIVE_INTEGRATIONS`
**Final Recommendation:** `SCOPED_ACTIVATION_DESIGN_RECOMMENDED_NEXT`
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

**Bucket E remains forbidden until TexQtic obtains applicable regulatory authorization, legal opinion, and explicit Paresh approval. No Phase 2 unit may approach Bucket E without a separate, standalone authorization artifact.**

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

**Action required:** Legal review must be completed for all Bucket C, D, and E items before those buckets can enter design. Bucket A legal copy review (`P2-12`) is a prerequisite for Bucket C and D.

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

**No Phase 2 unit in Bucket C, D, or E may begin implementation until the relevant external partner contract is signed and sandbox credentials are confirmed.**

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

---

## 10. Recommended Design V2 Scope

Design V2 should be a **focused, bounded design artifact** that answers the architectural questions above and authorizes the implementation of Bucket A and Bucket B items only.

### Design V2 should include

1. **Scoped activation architecture** — Replace global `ttp_enabled` with per-org or per-tier activation. Define the data model, migration path, and middleware changes (TQ-01).
2. **Activation runbook and monitoring** — Step-by-step operational guide for controlled TTP activation, monitoring signals, and rollback procedures (TQ-09, TQ-10).
3. **Legal/compliance copy model** — Reviewed disclaimer text, VPC certificate wording, Score advisory wording, consent flow design. Enables Bucket A and is prerequisite for Buckets C/D.
4. **Relationship-specific caps** — Data model for per-relationship or per-trade invoice cap overrides (P2-02).
5. **VPC export/share format** — Canonical structured format and PDF generation design for VPC (P2-07, P2-08).
6. **Live GST/CIBIL integration design only** — Architecture design (data flow, consent model, error handling, retry model), not implementation. Requires legal gate first (TQ-05).
7. **Partner routing transmission design only** — Protocol, state machine, callback handling design, not implementation. Requires partner contract first (TQ-02, TQ-03, TQ-04).
8. **Phase 2 data / audit model** — Score versioning, QA isolation, audit log export, data retention design (TQ-06, TQ-07, TQ-08).

### Design V2 must NOT include

- Any implementation of live GST or CIBIL APIs (Bucket C blocked by legal gate)
- Any implementation of partner routing transmission (Bucket D blocked by partner contract gate)
- Any PSP, payment, lending, custody, or Bucket E item (absolutely forbidden)
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

---

## 13. Final Recommendation

**Final decision value: `SCOPED_ACTIVATION_DESIGN_RECOMMENDED_NEXT`**

Phase 1 is technically complete, production-deployed, and verified across 38/38 E2E tests. The platform has a correct, production-safe TTP foundation behind a global kill-switch.

The next prioritized action is:

1. **Initiate `TTP-SCOPED-ACTIVATION-DESIGN-001`** — design the per-org activation architecture so that future activation decisions can be made at granularity below global.
2. **Initiate `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` in parallel** — this unblocks Bucket C and D without requiring code.
3. **Hold all live integrations** (Bucket C, D, E) behind the legal gate and partner contract gate.
4. **Do not activate `ttp_enabled=true`** until either a scoped activation design exists or a deliberate limited-global activation decision is made by Paresh via a separate activation plan unit.

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
