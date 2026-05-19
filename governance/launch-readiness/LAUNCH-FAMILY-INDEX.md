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
| FAM-06 | Auth and Session Management | MAIN | NOT_ASSESSED | LAUNCH_BLOCKER | P0 | NO | 5 |
| FAM-07 | Tenant Onboarding and Invite | MAIN | NOT_ASSESSED | LAUNCH_BLOCKER | P0 | NO | 6 |
| FAM-08 | Tenant Core Workspace | MAIN | NOT_ASSESSED | LAUNCH_BLOCKER | P0 | NO | 7 |
| FAM-09 | Supplier Profile and Catalog | MAIN | NOT_ASSESSED | LAUNCH_BLOCKER | P0 | NO | 8 |
| FAM-10 | Platform Ops and Control Plane | MAIN | NOT_ASSESSED | LAUNCH_BLOCKER | P0 | NO | 9 |
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
| FAM-02 | D2C Public Collections | PRODUCTION_CONFIRMED | TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 | TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 | see D2C tracker | D2C SEO expansion (FTR-SEO-001) |
| FAM-03 | Inquiry Submission | PRODUCTION_CONFIRMED | PUBLIC-INQUIRY-CONTEXT-HANDOFF-IMPLEMENTATION-001 | PUBLIC-INQUIRY-CONTEXT-HANDOFF-IMPLEMENTATION-001 | see inquiry units | Notification pipeline verification (BS-002) |
| FAM-04 | SEO Infrastructure | PRODUCTION_CONFIRMED | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | see SEO units | Domain canonical decision (FTR-SEO-001) |
| FAM-05 | DPP Digital Product Passport | PRODUCTION_CONFIRMED | TECS-DPP-PASSPORT-NETWORK-PROD-AUDIT-002 | TECS-DPP-PASSPORT-NETWORK-LAUNCH-GATE-001 | 2026-05-02 | Paresh launch-auth decision (D-001) |
| FAM-06 | Auth and Session Management | NEEDS_REPO_INSPECTION | NEEDS_FAMILY_CYCLE | — | — | Family cycle open |
| FAM-07 | Tenant Onboarding and Invite | NEEDS_REPO_INSPECTION | NEEDS_FAMILY_CYCLE | — | — | Family cycle open |
| FAM-08 | Tenant Core Workspace | NEEDS_REPO_INSPECTION | NEEDS_FAMILY_CYCLE | — | — | Family cycle open |
| FAM-09 | Supplier Profile and Catalog | NEEDS_REPO_INSPECTION | NEEDS_FAMILY_CYCLE | — | — | Family cycle open |
| FAM-10 | Platform Ops and Control Plane | NEEDS_REPO_INSPECTION | NEEDS_FAMILY_CYCLE | — | — | Family cycle open |
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
| FAM-01 | B2C Public Browse and Product Detail | Maintain-only; run real-data smoke test (BS-001) before public outreach | Multiple B2C slices verified in production; QA data only; real Surat supplier data test needed |
| FAM-02 | D2C Public Collections | Maintain-only; SEO expansion deferred (FTR-SEO-001, FTR-SEO-002) | D2C collections + detail + SEO metadata verified; CTA auth-handoff implemented; post-auth continuation deferred |
| FAM-03 | Inquiry Submission | Maintain-only; verify notification reach (BS-002) before buyer-facing marketing | Phase 1+2 DB submission verified; notification pipeline not production-verified |
| FAM-04 | SEO Infrastructure | Maintain-only; FTR-SEO-001 (canonical domain) gated; validate JSON-LD externally (BS-005) | Sitemap + robots.txt + JSON-LD implemented; canonical domain strategy deferred; rich results not externally validated |
| FAM-05 | DPP Digital Product Passport | Await Paresh launch-auth decision (D-001, Decision Parking Lot) | Technically PRODUCTION_READY (PROD-AUDIT-002); launch auth HOLD_FOR_PARESH_DECISION; LAUNCH_GATE_CLOSED since 2026-05-02 |
| FAM-06 | Auth and Session Management | Open family cycle after Layer 0 authorization; audit auth routes, session, reused-user edge case | Reused-existing-user: BOUNDED_DEFERRED_REMAINDER per Layer 0; must-haves §2 rows A-1 through A-8 not assessed |
| FAM-07 | Tenant Onboarding and Invite | Open family cycle; audit invite flow, onboarding state, control-plane visibility | Must-haves checklist §2 rows not assessed |
| FAM-08 | Tenant Core Workspace | Open family cycle; audit tenant workspace, org_id isolation (constitutional), session persistence | org_id isolation is CONSTITUTIONAL — any weakening is a data isolation failure; must-haves §3 rows not assessed |
| FAM-09 | Supplier Profile and Catalog | Open family cycle; audit supplier profile completeness for real Surat supplier data | Pre-existing unstaged M: `components/Public/PublicSupplierProfile.tsx` — do NOT stage in any family cycle without explicit allowlist |
| FAM-10 | Platform Ops and Control Plane | Open family cycle; audit control routes, admin impersonation, tenant provisioning flow | Includes admin impersonation (LAUNCH_DEPENDENCY classification), control route health, provisioning gate |
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
| 2 | FAM-02 D2C Public Collections | Maintain-only; SEO expansion deferred |
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
| FAM-06 Auth | LAUNCH_BLOCKER | NOT_ASSESSED — family cycle required |
| FAM-07 Onboarding | LAUNCH_BLOCKER | NOT_ASSESSED — family cycle required |
| FAM-08 Tenant Core | LAUNCH_BLOCKER | NOT_ASSESSED — family cycle required |
| FAM-09 Supplier Profile | LAUNCH_BLOCKER | NOT_ASSESSED — family cycle required |
| FAM-10 Control Plane | LAUNCH_BLOCKER | NOT_ASSESSED — family cycle required |
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

*Family index authored: 2026-05-19 — TexQtic governance corpus, `governance/launch-readiness/`, main branch.*
*Unit: TEXQTIC-LAUNCH-FAMILY-INDEX-001. Recommended next unit: TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001.*
