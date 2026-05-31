# LAUNCH-FAMILY-INDEX.md — TexQtic Launch Family Navigation Index

**Hub:** `governance/launch-readiness/`
**Unit:** `TEXQTIC-LAUNCH-FAMILY-INDEX-001`
**Status:** COMPLETE — navigation map only
**Created:** 2026-05-19
**Owner:** Paresh Patel (TexQtic founder)
**Design authority:** `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001`

---

> **NAVIGATION MAP ONLY**
>
> This document is a sequencing and navigation index for the 24 launch-readiness families.
> It does NOT authorize implementation, does NOT constitute a full repo audit, does NOT populate
> detailed hub rows, and does NOT record CRM or CAE feature internals.
>
> Family readiness truth is established during family-local implementation cycles — not here.
> CRM and CAE readiness truth lives in their respective repos.

---

## 1. Purpose

This document provides a single navigable view of all 24 TexQtic launch-readiness families.

For each family it records:

- High-level initial status drawn from existing governance evidence (strategy docs, Layer 0 control files, closed units)
- MVP cutline classification and priority
- Evidence level for the initial status claim
- Proposed cycle order for incremental family maintenance
- Immediate next action

This is the entry point for family sequencing decisions. It is not an implementation plan.

**Read before opening any family-local implementation cycle.** It helps Paresh and governance
agents identify which families are ready to cycle, which are gated, and which are CRM/CAE tracks.

---

## 2. Authority Boundary

### This document IS:
- A navigation and sequencing map for the 24 launch-readiness families
- A record of high-level initial status drawn from existing governance evidence
- A proposed cycle order for incremental family maintenance

### This document IS NOT:
- Implementation authorization for any family
- A full technical audit (that is `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001`)
- A hub population pass (that is `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`)
- A CRM or CAE internal feature inventory (CRM readiness lives in `TexQtic-CRM/governance/`; CAE readiness lives in `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE/governance/`)
- A Layer 0 authority (Layer 0 remains `governance/control/NEXT-ACTION.md`, `BLOCKED.md`, `OPEN-SET.md`)
- An authorization to begin any implementation cycle

**Family row truth is established during family cycles, not here.** Initial status in this index
is high-level and governance-evidence-based only. It will be superseded by family cycle
verification artifacts as cycles complete.

---

## 3. Relationship to Strategy Documents

| Strategy Document | Role in relation to this index |
|---|---|
| `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001` | Provides the canonical family registry (FAM-01–FAM-24), classification taxonomy, evidence rules, and feature source classifications used here |
| `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001` | Defines the family-by-family execution process, CRM/CAE separation rules, planned requirements intake, and cycle sequencing model this index is designed to support |
| `TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001` | Governs the mandatory evidence fields, evidence-level hierarchy, and hub-sync checklist that this index uses for evidence fields |
| Layer 0 (`governance/control/`) | Controls whether any family implementation cycle may open (`HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` posture currently in effect) |

**This index is not an authority over any of the above.** It is a dependent artifact.

---

## 4. CRM and CAE Handling

**CRM readiness truth lives in `TexQtic-CRM/governance/`.**
**CAE readiness truth lives in `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE/governance/`.**

This index records CRM (FAM-20, FAM-21) and CAE (FAM-23) rows as `XDEP_ONLY`. It does NOT
record CRM/CAE route, schema, service, or UI implementation details. Any status claim for those
families is `NEEDS_REPO_INSPECTION` until a cited CRM/CAE repo audit unit is created.

For cross-system families (FAM-22, FAM-24), this index records only the XDEP dependency status
and the current gate condition. The main platform side of those dependencies is tracked here;
the CRM and CAE sides are tracked in their respective repos.

---

## 5. Family Index — Classification Matrix

Columns: Family ID, Name, System Owner, Current Status, MVP Cutline Class, Priority,
Layer 0 Gate (YES/NO), Proposed Cycle Order.

| ID | Name | Owner | Status | MVP Class | Pri | L0 Gate | Cycle |
|---|---|---|---|---|---|---|---|
| FAM-01 | B2C Public Browse and Product Detail | MAIN | VERIFIED_COMPLETE | MVP_CRITICAL | P0 | NO | 1 |
| FAM-02 | D2C Public Collections | MAIN | VERIFIED_COMPLETE | MVP_CRITICAL | P0 | NO | 2 |
| FAM-03 | Inquiry Submission | MAIN | VERIFIED_COMPLETE | MVP_CRITICAL | P0 | NO | 3 |
| FAM-04 | SEO Infrastructure | MAIN | VERIFIED_COMPLETE | MVP_CRITICAL | P0 | NO | 4 |
| FAM-05 | DPP Digital Product Passport | MAIN | PARKED_DECISION | PARKED_DECISION | P2 | YES | 13 |
| FAM-06 | Auth and Session Management | MAIN | VERIFIED_COMPLETE | LAUNCH_BLOCKER | P0 | NO | 5 |
| FAM-07 | Tenant Onboarding and Invite | MAIN | PARTIALLY_IMPLEMENTED | LAUNCH_BLOCKER | P0 | NO | 6 |
| FAM-08 | Tenant Core Workspace | MAIN | NOT_ASSESSED | LAUNCH_BLOCKER | P0 | NO | 7 |
| FAM-09 | Supplier Profile and Catalog | MAIN | NOT_ASSESSED | LAUNCH_BLOCKER | P0 | NO | 8 |
| FAM-10 | Platform Ops and Control Plane | MAIN | VERIFIED_COMPLETE | LAUNCH_BLOCKER | P0 | NO | 9 |
| FAM-11 | Subscription and Commercial Gating | MAIN | NOT_ASSESSED | P1_MVP_MUST_HAVE | P1 | NO | 10 |
| FAM-12 | Network Commerce — RFQ and Pools | MAIN | PARTIALLY_IMPLEMENTED | PILOT_REQUIRED | P1 | NO | 11 |
| FAM-13 | Network Commerce — Award Maker-Checker | MAIN | DESIGN_GATED | DESIGN_COMPLETE_BLOCKED | P2 | YES | 14 |
| FAM-14 | Network Commerce — Supplier Quotes | MAIN | BLOCKED | CONFIG_ONLY | P2 | YES | 15 |
| FAM-15 | Network Commerce — Invoices and Settlement | MAIN | NOT_ASSESSED | PILOT_REQUIRED | P1 | NO | 12 |
| FAM-16 | TradeTrust Pay (TTP) | MAIN | DESIGN_GATED | DESIGN_GATED | P2 | YES | 16 |
| FAM-17 | Traceability and Certifications | MAIN | DEFERRED | POST_MVP | P3 | NO | 17 |
| FAM-18 | White Label Co | MAIN | PARKED_DECISION | POST_MVP | P3 | YES | 18 |
| FAM-19 | AI and Document Intelligence | MAIN | DEFERRED | POST_MVP | P4 | NO | 19 |
| FAM-20 | CRM Lead Intake and Qualification | CRM | XDEP_ONLY | NOT_ASSESSED | P1 | YES | 20 |
| FAM-21 | CRM Onboarding and Activation | CRM | XDEP_ONLY | NOT_ASSESSED | P1 | YES | 21 |
| FAM-22 | CRM → Platform Provisioning Handoff | CROSS_SYSTEM | XDEP_ONLY | DESIGN_GATED | P1 | YES | 22 |
| FAM-23 | CAE Acquisition Pipeline | CAE | XDEP_ONLY | NOT_ASSESSED | P4 | YES | 23 |
| FAM-24 | CAE → CRM → Platform Integration Chain | CROSS_SYSTEM | XDEP_ONLY | DESIGN_GATED | P4 | YES | 24 |

---

## 6. Family Index — Evidence Manifest

Columns: Family ID, Name, Evidence Level, Evidence Source, Last Verified By Unit,
Last Verified Date, Next Review Trigger.

| ID | Name | Evid Level | Evid Source | Last Verified By | Last Date | Review Trigger |
|---|---|---|---|---|---|---|
| FAM-01 | B2C Public Browse and Product Detail | PRODUCTION_CONFIRMED | TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 | TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 | see B2C tracker | Real-data smoke test (BS-001) |
| FAM-02 | D2C Public Collections | PRODUCTION_CONFIRMED | TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 | TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 | see D2C tracker | FTR-SEO-001 STRATEGY_DEFINED (canonical trigger satisfied); review on FTR-SEO-002 product detail sitemap expansion if/when authorized. |
| FAM-03 | Inquiry Submission | PRODUCTION_CONFIRMED | PUBLIC-INQUIRY-CONTEXT-HANDOFF-IMPLEMENTATION-001 | PUBLIC-INQUIRY-CONTEXT-HANDOFF-IMPLEMENTATION-001 | see inquiry units | Notification pipeline verification (BS-002) |
| FAM-04 | SEO Infrastructure | PRODUCTION_CONFIRMED | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | see SEO units | FTR-SEO-001 STRATEGY_DEFINED (canonical trigger satisfied); review on FTR-SEO-002 sitemap expansion, FTR-SEO-003 supplier indexability, and FTR-SEO-008/009 JSON-LD expansion. |
| FAM-05 | DPP Digital Product Passport | PRODUCTION_CONFIRMED | TECS-DPP-PASSPORT-NETWORK-PROD-AUDIT-002 | TECS-DPP-PASSPORT-NETWORK-LAUNCH-GATE-001 | 2026-05-02 | Paresh launch-auth decision (D-001) |
| FAM-06 | Auth and Session Management | TEST_CONFIRMED | FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md | FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001 | 2026-07-22 | FAM-06 VERIFIED_COMPLETE. G-06-001 CLOSED. G-06-002 CLOSED. G-06-003 NON_BLOCKING_FOLLOWUP (BS-003). Next path: A) FAM-07-TENANT-ONBOARDING-OPENING-REPO-TRUTH-AUDIT-001 or B) PUBLIC-LEGAL-PAGES-BUNDLE-001 or C) INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001 |
| FAM-07 | Tenant Onboarding and Invite | TEST_CONFIRMED | FAM-07E5O-HANDOFF-CONSENT-PERSISTENCE-TRANSACTION-REMEDIATION-001 | FAM-07E5P-CONSENT-SCAFFOLD-RUNTIME-PROOF-HUB-SYNC-001 | 2026-05-31 | E5 runtime-proof chain confirms LEGAL_PENDING consent scaffold persistence path in live runtime evidence: whoami 200, helper 201, safe handoff 200, tenant-detail 200 with consent observability records (`has_records=true`, recent `ACCEPTED_PENDING`). Bounded proof confirms scaffold runtime path only. No LEGAL_APPROVED/legal-final authority proven. FTR-LEGAL-003 remains MVP_CRITICAL/OPEN. FAM-07 NOT VERIFIED_COMPLETE. |
| FAM-08 | Tenant Core Workspace | NEEDS_REPO_INSPECTION | NEEDS_FAMILY_CYCLE | — | — | Family cycle open |
| FAM-09 | Supplier Profile and Catalog | NEEDS_REPO_INSPECTION | NEEDS_FAMILY_CYCLE | — | — | Family cycle open |
| FAM-10 | Platform Ops and Control Plane | PRODUCTION_CONFIRMED | FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001 | FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001 | 2026-05-28 | Review on control-plane route/auth/schema changes, admin impersonation changes, tenant provisioning changes, or public QA isolation changes. Production smoke 15/15 PASS. DEV-001 (archive guard 403) and DEV-002 (impersonation start 201) documented. |
| FAM-11 | Subscription and Commercial Gating | NEEDS_REPO_INSPECTION | NEEDS_FAMILY_CYCLE | — | — | Family cycle open |
| FAM-12 | Network Commerce — RFQ and Pools | TEST_CONFIRMED | TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001 | TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001 | 2026-07-06 | E2E verification after FAM-13 gate clears |
| FAM-13 | Network Commerce — Award Maker-Checker | REPO_CONFIRMED | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001 | TEXQTIC-NC-PROD-AWARD-MAKER-CHECKER-CONTROLLED-QA-ACTIVATION-001 | 2026-05-14 | Paresh decision on G-022 |
| FAM-14 | Network Commerce — Supplier Quotes | REPO_CONFIRMED | governance/control/BLOCKED.md (QD-6 hold) | TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001 | 2026-05-12 | Explicit Paresh decision to lift QD-6 |
| FAM-15 | Network Commerce — Invoices and Settlement | NEEDS_REPO_INSPECTION | NEEDS_FAMILY_CYCLE | — | — | After FAM-12 cycle verified |
| FAM-16 | TradeTrust Pay (TTP) | GOVERNANCE_CLAIM_ONLY | TEXQTIC-TRADETRUST-PAY-LEGAL-PACKET-UPGRADE-NC-SUPPLEMENT-001 | TEXQTIC-TRADETRUST-PAY-LEGAL-PACKET-UPGRADE-NC-SUPPLEMENT-001 | 2026-07-06 | TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001 |
| FAM-17 | Traceability and Certifications | GOVERNANCE_CLAIM_ONLY | TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001 (§5 row 15) | TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001 | 2026-07-14 | Post-MVP planning review |
| FAM-18 | White Label Co | GOVERNANCE_CLAIM_ONLY | governance/control/BLOCKED.md §2 (REVIEW-UNKNOWN) | governance/control/BLOCKED.md §2 | see BLOCKED.md | WL Co reassessment when WL work reopens |
| FAM-19 | AI and Document Intelligence | GOVERNANCE_CLAIM_ONLY | TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001 (§5 row 20) | TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001 | 2026-07-14 | Post-MVP planning review |
| FAM-20 | CRM Lead Intake and Qualification | NEEDS_REPO_INSPECTION | CRM repo audit required | — | — | CRM audit unit creation |
| FAM-21 | CRM Onboarding and Activation | NEEDS_REPO_INSPECTION | CRM repo audit required | — | — | CRM audit unit creation |
| FAM-22 | CRM → Platform Provisioning Handoff | GOVERNANCE_CLAIM_ONLY | CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md | governance/control/BLOCKED.md §1 (WEBHOOK-007) | see BLOCKED.md | CRM provisioning webhook gate clears |
| FAM-23 | CAE Acquisition Pipeline | NEEDS_REPO_INSPECTION | CAE repo audit required | — | — | CAE audit unit creation |
| FAM-24 | CAE → CRM → Platform Integration Chain | GOVERNANCE_CLAIM_ONLY | MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md | TEXQTIC-TRADETRUST-PAY-LEGAL-PACKET-UPGRADE-NC-SUPPLEMENT-001 | 2026-07-06 | TTP legal gate + CAE audit completion |

---

## 7. Family Index — Action Register

Columns: Family ID, Name, Next Action, Notes.

| ID | Name | Next Action | Notes |
|---|---|---|---|
| FAM-01 | B2C Public Browse and Product Detail | Maintain-only; run real-data smoke test (BS-001) before public outreach. Pre-outreach overlay gate: FTR-SL-001 (soft-launch aggregator directory readiness design, MVP_CRITICAL/OPEN) required alongside BS-001 before first real supplier profile goes live in promotion context. | Multiple B2C slices verified in production; QA data only; real Surat supplier data test needed |
| FAM-02 | D2C Public Collections | Maintain-only; canonical strategy resolved via FTR-SEO-001 STRATEGY_DEFINED. Remaining SEO expansion overlay: FTR-SEO-002 product detail sitemap expansion, if/when product-detail sitemap scope is authorized. | D2C collections + detail + SEO metadata verified; CTA auth-handoff implemented; post-auth continuation deferred |
| FAM-03 | Inquiry Submission | Maintain-only. Inquiry submission core VERIFIED_COMPLETE. Open launch overlay gates (required before buyer-facing outreach): FTR-B2C-004 (notification loop, MVP_CRITICAL/PARTIAL), FTR-B2C-005 (supplier-context notification runtime verification, MVP_CRITICAL/OPEN), FTR-LEGAL-002 (privacy/GDPR consent notice for inquiry form, MVP_CRITICAL/OPEN, PRIT-011), FTR-SL-003 (minimum inquiry notification loop implementation, MVP_CRITICAL/PARTIAL). Phase 3+ overlay: FTR-B2C-002 (inquiry schema expansion, LAUNCH_DEPENDENCY/OPEN). | Phase 1+2 DB submission verified; notification pipeline not production-verified |
| FAM-04 | SEO Infrastructure | Maintain-only. FTR-SEO-001 STRATEGY_DEFINED (Option F; no implementation change); FTR-SEO-007 STRATEGY_RESOLVED. Open overlay gates: FTR-SEO-002 (product detail sitemap expansion, LAUNCH_DEPENDENCY/OPEN), FTR-SEO-003 (supplier profile indexability, LAUNCH_DEPENDENCY/OPEN), FTR-SEO-008 (product detail JSON-LD expansion, LAUNCH_DEPENDENCY/OPEN), FTR-SEO-009 (supplier profile JSON-LD, LAUNCH_DEPENDENCY/OPEN). Validate JSON-LD externally (BS-005). | Sitemap + robots.txt + JSON-LD implemented; canonical domain strategy resolved (FTR-SEO-001 STRATEGY_DEFINED); rich results not externally validated |
| FAM-05 | DPP Digital Product Passport | Await Paresh launch-auth decision (D-001, Decision Parking Lot) | Technically PRODUCTION_READY (PROD-AUDIT-002); launch auth HOLD_FOR_PARESH_DECISION; LAUNCH_GATE_CLOSED since 2026-05-02 |
| FAM-06 | Auth and Session Management | **VERIFIED_COMPLETE** (2026-07-22) via `FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001`. G-06-001 CLOSED (60 backend tests). G-06-002 CLOSED (74 frontend tests). G-06-003 NON_BLOCKING_FOLLOWUP (tracked as FTR-AUTH-003 + BS-003). No blocking defects found. Next cycle: choose Path A (FAM-07 opening audit), Path B (PUBLIC-LEGAL-PAGES-BUNDLE-001), or Path C (INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001). Implementation units for FAM-07+ still require Layer 0 authorization release. | G-06-001 CLOSED: J3 location mismatch corrected; 9 existing integration tests confirmed in `server/src/__tests__/`; 60 DB-free contract tests in `tests/auth-route-session.test.ts`. G-06-002 CLOSED: 74 DB-free frontend contract tests in `tests/frontend/auth-service-session.test.ts`; covers apiClient storage, Bearer enforcement, APIError shapes, impersonation, authService login/entry/password/verify. Overlay: FTR-AUTH-004 (auth email branded shell extension, PILOT_REQUIRED/P2) open; no action until PILOT phase. |
| FAM-07 | Tenant Onboarding and Invite | FAM-07K14 minimal hub sync COMPLETE (2026-05-31). K-lane stabilization chain is synchronized through K13: K8 hardening/test confirmation, K9 stale active-tab failure evidence, K10 stale-bundle diagnosis, K11 fresh-runtime verification, K12 evidence-chain sync, K13 next-action selection. Prior FAM-07E5P runtime-proof chain remains valid for LEGAL_PENDING scaffold persistence; prior FAM-07I terminology reconciliation COMPLETE, FAM-07G FC-03 hardening VERIFIED (6b4ebd30), sign-in-first path VERIFIED by FAM-07D3 (637326ba), and FAM-07H SMTP runtime chain COMPLETE (d93cb720). Next recommended unit: FAM-07L1-CONTROL-PLANE-LEGAL-GATE-NEXT-ACTION-DESIGN-001. FAM-07 NOT VERIFIED_COMPLETE. | K-lane and consent-scaffold evidence are both preserved with bounded interpretation: K9 is retained as stale-tab/stale-bundle evidence (not active source failure after K10+K11), and E5O/E5P proved LEGAL_PENDING scaffold runtime path only. No LEGAL_APPROVED/legal-final state was created. FTR-LEGAL-003 remains MVP_CRITICAL/OPEN pending final legal package authority (text/version/hash/source/actor/re-consent policy) and verification. HD-001 remains RUNTIME_CONFIRMED_CONFIGURED. Overlay: FTR-AUTH-004 (PILOT_REQUIRED/P2). Out of scope: FTR-AUTH-002 (POST_MVP/BLOCKED). |
| FAM-08 | Tenant Core Workspace | Open family cycle; audit tenant workspace, org_id isolation (constitutional), session persistence | org_id isolation is CONSTITUTIONAL — any weakening is a data isolation failure; must-haves §3 rows not assessed. Known planned item: FTR-SL-004 (supplier inquiry inbox design, MVP_CRITICAL/P1) is a candidate for this family cycle; Paresh to confirm at FAM-08 cycle opening. |
| FAM-09 | Supplier Profile and Catalog | Open family cycle; audit supplier profile completeness for real Surat supplier data | Pre-existing unstaged M: `components/Public/PublicSupplierProfile.tsx` — do NOT stage in any family cycle without explicit allowlist |
| FAM-10 | Platform Ops and Control Plane | **VERIFIED_COMPLETE** (2026-05-28) via `FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001`. Production smoke 15/15 PASS. All mutation surfaces PRODUCTION_CONFIRMED. DEV-001 (archive guard 403 not 409) and DEV-002 (impersonation start 201 not 200) documented as planning deviations; code behavior is correct. R-005 ACCEPTED_MVP_RISK (impersonation token revocation gap; 30-min TTL primary mechanism; unchanged). Platform Ops overlay gates remain open in FTR: FTR-OPS-001 (error monitoring/Sentry, MVP_CRITICAL/P1), FTR-OPS-003 (rollback procedure documentation, MVP_CRITICAL/P1), FTR-OPS-002 (load testing, PILOT_REQUIRED/P2). These require separate implementation authorization. Control Plane lane scope VERIFIED_COMPLETE; Platform Ops overlay gates are distinct. | Includes admin impersonation (LAUNCH_DEPENDENCY classification), control route health, provisioning gate. Production verified 2026-05-28. Commit: 979f838. Platform Ops overlays (FTR-OPS-001, FTR-OPS-003 MVP_CRITICAL; FTR-OPS-002 PILOT_REQUIRED) are separate from control-plane lane verification scope. |
| FAM-11 | Subscription and Commercial Gating | Open family cycle after P0 families complete; confirm minimum gating logic for pilot tenants | P1_MVP_MUST_HAVE per strategy; minimum commercial gating version acceptable for Surat proof cell |
| FAM-12 | Network Commerce — RFQ and Pools | NC Phase 1 AUDIT_COMPLETE; E2E blocked by FAM-13 (award maker-checker) gate; no new cycle until FAM-13 gate clears | 186/186 integration tests PASS; pools + RFQ + invite enabled in production; award path gated G-022; supplier quotes blocked QD-6 |
| FAM-13 | Network Commerce — Award Maker-Checker | Await Paresh decision on G-022 (HOLD_FOR_PARESH_DECISION) before opening implementation cycle | Two-call G-021 split flow designed; pending_approvals + ApprovalSignature tables confirmed; no schema changes required before cycle |
| FAM-14 | Network Commerce — Supplier Quotes | Await explicit Paresh decision to lift QD-6 hold (supplier_quotes.enabled=false) | Feature UI verified in production (amber disabled banner); QD-6 hold maintained |
| FAM-15 | Network Commerce — Invoices and Settlement | Open family cycle after FAM-12 E2E verified; audit invoice and settlement routes | NC invoice + settlement implemented in Phase 1 schema; no deep audit completed; QA fixture baseline seeded |
| FAM-16 | TradeTrust Pay (TTP) | Await external legal counsel feedback (TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001); no implementation until HOLD_FOR_COUNSEL_FEEDBACK clears | ttp_enabled=false; design complete (Unified TTP + NC-TTP scope); legal packet sent to external counsel |
| FAM-17 | Traceability and Certifications | Deferred post-MVP; no audit cycle required until pilot phase complete | Routes implemented; POST_MVP classification per strategy; no launch dependency identified |
| FAM-18 | White Label Co | WL Co hold remains REVIEW-UNKNOWN; requires fresh reassessment before any WL-specific work | Non-blocking for B2C slices (confirmed BLOCKED.md §4); WL-specific work requires fresh reassessment |
| FAM-19 | AI and Document Intelligence | Deferred post-MVP; AI routes exist; no launch dependency; no audit cycle required | POST_MVP classification per strategy |
| FAM-20 | CRM Lead Intake and Qualification | Audit in TexQtic-CRM repo; create CRM-local family cycle unit | CRM readiness truth lives in TexQtic-CRM/governance/; no main repo CRM internals recorded |
| FAM-21 | CRM Onboarding and Activation | Audit in TexQtic-CRM repo; create CRM-local family cycle unit | CRM readiness truth lives in TexQtic-CRM/governance/; no main repo CRM internals recorded |
| FAM-22 | CRM → Platform Provisioning Handoff | Record XDEP when CRM provisioning webhook is unblocked; no main repo implementation until WEBHOOK-007 gate clears | WEBHOOK-007: BLOCKED_PENDING_ORF_EVENTS_JURISDICTION_AUTH_OPENAPI; requires OpenAPI contract update |
| FAM-23 | CAE Acquisition Pipeline | Audit in TEXQTIC-CUSTOMER-ACQUISITION-ENGINE repo; all CAE→platform routes DESIGN_GATED | CAE readiness truth lives in CAE/governance/; TTP legal gate blocks all CAE→platform routes |
| FAM-24 | CAE → CRM → Platform Integration Chain | Record XDEP only; full integration chain gated behind TTP legal gate; no implementation until legal gate and CAE audit complete | All ROUTE-001–ROUTE-006 gated; integration chain requires TTP legal release + CAE + CRM audit completion |

---

## 8. Proposed Cycle Order — Summary

The proposed cycle order is derived from:

1. Already-verified families (maintain-only; no implementation cycle needed)
2. MVP launch blockers (require family cycles; require Layer 0 `HOLD_FOR_AUTHORIZATION` release)
3. MVP must-haves and pilot enablers
4. Parked or gated families (await explicit Paresh or legal decision)
5. Post-MVP deferred families
6. CRM/CAE separate tracks (not in main repo cycle)

### Group A — Maintain-Only (already verified; no implementation cycle needed)

| Cycle | Family | Note |
|---|---|---|
| 1 | FAM-01 B2C Public Browse | Maintain-only; real-data smoke test pending |
| 2 | FAM-02 D2C Public Collections | Maintain-only; canonical strategy resolved; FTR-SEO-002 expansion pending auth |
| 3 | FAM-03 Inquiry Submission | Maintain-only; notification pipeline verification pending |
| 4 | FAM-04 SEO Infrastructure | Maintain-only; canonical domain decision deferred |

### Group B — MVP Launch Blockers (require family cycles; require Layer 0 authorization)

| Cycle | Family | Note |
|---|---|---|
| 5 | FAM-06 Auth and Session Management | LAUNCH_BLOCKER; first cycle to open |
| 6 | FAM-07 Tenant Onboarding and Invite | LAUNCH_BLOCKER |
| 7 | FAM-08 Tenant Core Workspace | LAUNCH_BLOCKER; org_id isolation constitutional |
| 8 | FAM-09 Supplier Profile and Catalog | LAUNCH_BLOCKER |
| 9 | FAM-10 Platform Ops and Control Plane | LAUNCH_BLOCKER; includes admin impersonation |

### Group C — MVP Must-Haves and Pilot Enablers

| Cycle | Family | Note |
|---|---|---|
| 10 | FAM-11 Subscription and Commercial Gating | P1_MVP_MUST_HAVE |
| 11 | FAM-12 Network Commerce — RFQ and Pools | PILOT_REQUIRED; NC Phase 1 partially done |
| 12 | FAM-15 Network Commerce — Invoices and Settlement | PILOT_REQUIRED; after FAM-12 cycle verified |

### Group D — Parked / Gated (await explicit decision; do NOT open without Paresh authorization)

| Cycle | Family | Gate |
|---|---|---|
| 13 | FAM-05 DPP Digital Product Passport | HOLD_FOR_PARESH_DECISION (D-001) |
| 14 | FAM-13 Network Commerce — Award Maker-Checker | HOLD_FOR_PARESH_DECISION (G-022) |
| 15 | FAM-14 Network Commerce — Supplier Quotes | QD-6 hold (explicit Paresh lift required) |
| 16 | FAM-16 TradeTrust Pay (TTP) | HOLD_FOR_COUNSEL_FEEDBACK |

### Group E — Post-MVP Deferred

| Cycle | Family | Note |
|---|---|---|
| 17 | FAM-17 Traceability and Certifications | POST_MVP |
| 18 | FAM-18 White Label Co | POST_MVP / REVIEW-UNKNOWN hold |
| 19 | FAM-19 AI and Document Intelligence | POST_MVP |

### Group F — CRM/CAE Separate Tracks (not in main repo cycle)

| Cycle | Family | Note |
|---|---|---|
| 20 | FAM-20 CRM Lead Intake | Audit in TexQtic-CRM repo |
| 21 | FAM-21 CRM Onboarding | Audit in TexQtic-CRM repo |
| 22 | FAM-22 CRM→Platform Handoff | XDEP in main repo; audit in CRM repo |
| 23 | FAM-23 CAE Acquisition Pipeline | Audit in CAE repo |
| 24 | FAM-24 CAE→CRM→Platform Chain | XDEP in main repo; audit in CRM + CAE repos |

---

## 9. MVP Cutline Summary

**Above the MVP cutline (required for Surat pilot go-live):**

| Family | Classification | Current Status |
|---|---|---|
| FAM-01 through FAM-04 | MVP_CRITICAL | VERIFIED_COMPLETE — already done |
| FAM-06 Auth | LAUNCH_BLOCKER | VERIFIED_COMPLETE — family cycle closed 2026-07-22 |
| FAM-07 Onboarding | LAUNCH_BLOCKER | TEST_CONFIRMED/PARTIALLY_IMPLEMENTED — K-lane evidence chain is now synchronized through K13 by FAM-07K14 (2026-05-31), preserving: K8 hardening/test confirmation, K9 stale-tab evidence, K10 stale-bundle diagnosis, K11 fresh-runtime verification, K12 evidence sync, K13 next-action selection. E5 runtime-proof chain remains recorded through FAM-07E5P for LEGAL_PENDING scaffold path. Prior FAM-07I terminology sync COMPLETE, FAM-07H SMTP runtime PRODUCTION_CONFIRMED, and HD-001 remains RUNTIME_CONFIRMED_CONFIGURED. FTR-LEGAL-003 MVP_CRITICAL/OPEN remains the legal launch/closure gate. This chain does not establish LEGAL_APPROVED/legal-final authority and does not close FAM-07. |
| FAM-08 Tenant Core | LAUNCH_BLOCKER | NOT_ASSESSED — family cycle required |
| FAM-09 Supplier Profile | LAUNCH_BLOCKER | NOT_ASSESSED — family cycle required |
| FAM-10 Control Plane | LAUNCH_BLOCKER | VERIFIED_COMPLETE — production verified 2026-05-28. Control Plane lane VERIFIED_COMPLETE; Platform Ops overlays FTR-OPS-001 and FTR-OPS-003 remain MVP_CRITICAL/OPEN; FTR-OPS-002 remains PILOT_REQUIRED/OPEN. |
| FAM-11 Subscription Gating | P1_MVP_MUST_HAVE | NOT_ASSESSED — family cycle required |
| FAM-12 RFQ and Pools | PILOT_REQUIRED | PARTIALLY_IMPLEMENTED — NC Phase 1 done |
| FAM-15 Invoices | PILOT_REQUIRED | NOT_ASSESSED — family cycle required |

**Below the MVP cutline (explicitly gated, parked, or deferred):**

FAM-05 (PARKED_DECISION), FAM-13 (DESIGN_COMPLETE_BLOCKED), FAM-14 (CONFIG_ONLY / FLAG_FALSE),
FAM-16 (DESIGN_GATED), FAM-17 through FAM-19 (POST_MVP),
FAM-20 through FAM-24 (CRM/CAE tracks — out-of-scope for main repo cycles)

---

## 10. Status and Evidence Level Definitions

### Status Values

| Status | Meaning |
|---|---|
| `VERIFIED_COMPLETE` | Confirmed done in production; production-verified via closed governance unit |
| `PARTIALLY_IMPLEMENTED` | Some implementation done and verified; gaps identified; cycle may be needed |
| `NOT_ASSESSED` | No family cycle completed; family-level readiness is unknown |
| `DESIGN_GATED` | Design complete; implementation gated by an explicit hold or pending decision |
| `BLOCKED` | Implementation present but blocked; cannot proceed without a specific gate release |
| `PARKED_DECISION` | Classification or launch authorization blocked by a pending Paresh decision |
| `DEFERRED` | Explicitly confirmed post-MVP; not a launch dependency |
| `XDEP_ONLY` | Family truth lives in another repo; this index records XDEP status only |

### Evidence Levels

| Level | Meaning |
|---|---|
| `PRODUCTION_CONFIRMED` | Verified in production via a closed TECS governance unit with explicit runtime proof |
| `TEST_CONFIRMED` | Verified via passing test suite in a closed governance unit; not production-smoke-tested |
| `REPO_CONFIRMED` | Verified via repo inspection; design docs and schema confirm state; no runtime test |
| `GOVERNANCE_CLAIM_ONLY` | Status claim in governance docs only; no repo or runtime verification |
| `NEEDS_REPO_INSPECTION` | No inspection completed; family cycle required before any status claim is valid |

---

## 11. Maintenance Rules

This document is governed by:

- `TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001.md` §9 (family-cycle hub maintenance rule)
- `TECS.md` §8 (hub drift-control binding rules)

**Update protocol:**

1. Status rows in this index may be updated only when a verified family cycle closes.
2. The verify-close artifact of the completing family cycle must answer Q1–Q9 hub-sync checklist.
3. CRM/CAE rows remain `XDEP_ONLY` until a cited CRM/CAE repo audit unit is created and linked.
4. Planned requirements must pass through `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001` before appearing here.
5. No row may advance from `NEEDS_REPO_INSPECTION` or `NOT_ASSESSED` to `LAUNCH_BLOCKER` or `MVP_CRITICAL` without a completed family cycle and `TEST_CONFIRMED` or higher evidence.
6. The proposed cycle order in §8 is advisory; actual cycle order is decided by Paresh at Layer 0.

---

## 12. Family Opening Audit Gate

**Status:** MANDATORY BINDING RULE — recorded per Paresh instruction, 2026-05-19  
**Authority:** `TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001`  
**Extends:** `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001` §6 Steps 2–3

> **This index is not sufficient evidence to open any family work.**
>
> Before any family is opened for implementation, design, audit, verification, correction,
> governance close, or any other governed family-local work, that family MUST first undergo
> a family-local repo-truth inspection.

### Rule A — Index Navigation Does Not Authorize Work

The Launch Family Index provides:

- **Navigation** — a sequencing map and high-level status snapshot derived from governance artifacts
- **Not authorization** — no family may begin governed work based on index rows alone

A family's index status (`NOT_ASSESSED`, `PARTIALLY_IMPLEMENTED`, `DESIGN_GATED`, etc.) is a
high-level indicator derived from governance document inspection. It is not a current repo-truth
audit. It must not be treated as such.

### Rule B — Mandatory Pre-Cycle Repo-Truth Inspection

Before any family is opened for:

- implementation
- design
- audit
- verification
- correction
- governance close
- or any other governed family-local work

that family MUST first undergo a family-local repo-truth inspection as defined in
`TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001` §6 Steps 2–3.

### Rule C — Inspection Currency

The inspection must be **current to the family cycle**. A prior inspection does not satisfy
this requirement unless:

- The cycle is being re-opened within 2 weeks, AND
- No implementation changes have occurred to that family's routes, services, schema, or
  frontend components since the prior inspection

Prior inspection notes, old trackers (B2C tracker, D2C tracker, NC Phase 1 audit records),
and hub rows may be used as starting points — but they **cannot replace** the current inspection.

### Rule D — Inspection Coverage

The inspection must verify, for the selected family:

| Surface | What to verify |
|---|---|
| Routes | Present route handlers; auth middleware; `org_id` scoping; response shapes |
| Services | Service layer implementations; DB query patterns; RLS assumptions |
| Schema / Config | Prisma model fields; feature flags; config values relevant to this family |
| Frontend components | Component presence; data flow; auth-gated surfaces; UI feature flags |
| Tests | Existing test coverage; test pass/fail status; gaps |
| Feature flags | Active flags; flag values in production; flag effects on this family |
| Blockers | Layer 0 holds (`NEXT-ACTION.md`, `BLOCKED.md`); whether any hold directly applies |
| Prior unit evidence | Which units closed covering this family; evidence level from those units |
| Production / data | Real data vs. QA data; whether production-smoke has been run for this family |

### Rule E — Family-Local Repo-Truth Note

The inspection must produce a **short family-local repo-truth note** before design or
implementation begins. This note lives in the family's unit governance file.

The note must record:

1. Current implemented state (with evidence level code)
2. Gaps — what is missing, partial, or present only in design documents
3. Evidence level (`PRODUCTION_CONFIRMED` / `TEST_CONFIRMED` / `REPO_CONFIRMED` / `GOVERNANCE_CLAIM_ONLY`)
4. Active blockers for this family
5. Known planned requirements for this family (whether or not already in repo)
6. Whether CRM/CAE XDEP status applies to any requirement in this family

### Rule F — Status Advancement Gate

Family status may not advance from `NOT_ASSESSED` or `NEEDS_REPO_INSPECTION` to any higher
readiness status without:

1. A completed current-cycle family-local repo-truth inspection
2. The family-local repo-truth note recorded in the unit governance file

This gate applies even if:

- The family was marked as done in a prior tracker
- An old hub row suggests the family is already verified
- A prior TECS unit closed covering part of this family

### Rule G — CRM / CAE Families

CRM families (FAM-20, FAM-21) must be audited in `TexQtic-CRM/governance/`.

CAE families (FAM-23) must be audited in `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE/governance/`.

A CRM or CAE family cycle opened in the main repo violates the CRM/CAE separation rule.

Cross-system families (FAM-22, FAM-24) may record only XDEP status and main-platform
integration surfaces in the main repo.

### Rule H — Authority Cross-References

This audit gate formalizes as a binding hard gate the inspection steps already defined in the
incremental truth strategy. Those steps are mandatory and non-skippable — not optional pre-work.

| Referenced rule | Location |
|---|---|
| Step 2 — Inspect Repo Truth for This Family | `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001` §6 Step 2 |
| Step 3 — Record Current State | `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001` §6 Step 3 |
| Evidence level codes | `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001` §13 |
| Hub drift-control rules | `TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001` §5–§9 |
| Addendum unit | `TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001` |

---

*Family index authored: 2026-05-19 — TexQtic governance corpus, `governance/launch-readiness/`, main branch.*
*Unit: TEXQTIC-LAUNCH-FAMILY-INDEX-001. Recommended next unit: TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001.*
*Audit gate added: 2026-05-19 — `TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001`.*

---

## 13. Soft-Launch Strategy Note

> **Authority:** `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` (2026-05-19)
> **Status:** Informational addendum — does not override any family cycle status in §5/§6/§7/§8.

### Relationship between this index and the soft-launch strategy

`TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` defines a **network-building soft launch phase** that may proceed using unauthenticated surfaces (aggregator directory + public inquiry form) **before FAM-06 opens**. The following implications apply:

| Principle | Detail |
|---|---|
| FAM-06 remains the recommended first full family cycle | Supplier auth (FAM-06) is required before any supplier-facing tenant dashboard is opened. Nothing in the soft-launch strategy changes FAM-06's status or priority. |
| Soft launch uses only unauthenticated surfaces | The aggregator directory (FAM-01, `PRODUCTION_VERIFIED`) and public inquiry form are the only active surfaces during the network-building soft launch. No authenticated tenant, no cart, no checkout. |
| Standalone units may precede FAM-06 | Legal pages (PRIT-034 → standalone unit) and inquiry notification loop (FTR-B2C-004 / FTR-SL-003) may be implemented before FAM-06 opens. These do not require a family cycle opening. |
| CRM / CAE XDEP audit not required for first cohort | FAM-22 (CRM webhook) and FAM-24 (XDEP) integration design is deferred to FTR-SL-002 (P2 / PILOT_REQUIRED). First 5–10 soft-launch suppliers do not require CRM/CAE integration to be operational. |
| This index is NOT the authority on soft-launch prerequisites | Read `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` §8–§10 checklists (S-1 through S-9, B-1 through B-7, A-1 through A-5) before promoting the directory or initiating buyer outreach. |
