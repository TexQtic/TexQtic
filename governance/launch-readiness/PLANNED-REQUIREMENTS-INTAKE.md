# PLANNED-REQUIREMENTS-INTAKE.md — TexQtic Planned Requirements Intake Queue

**Hub:** `governance/launch-readiness/`
**Unit:** `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001`
**Status:** INTAKE_OPEN — ready for Paresh review and confirmation
**Created:** 2026-07-14
**Design authority:** `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001`
**Layer 0 posture at creation:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`
**Pre-existing unstaged M files (never stage):**
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## §1 Purpose

This document is the **planned requirements intake queue** for TexQtic.

It records planned, deferred, and not-yet-confirmed technical requirements in a structured
intake format before they are promoted to family audit, implementation-ready status, or
MVP classification.

**This document is an intake staging area — not a source of implementation authority.**

It captures:
- Deferred technical items already in governance registers (FUTURE-TODO-REGISTER, DECISION-PARKING-LOT)
- Family cycles not yet opened (from LAUNCH-FAMILY-INDEX)
- Paresh-planned requirements not yet in any register
- Cross-system dependency references (XDEP-only for CRM and CAE)
- Items explicitly excluded as out-of-repo business/GTM

**It does NOT:**
- Authorize implementation of any item
- Override or change Layer 0 posture
- Promote any item to `IMPLEMENTATION_READY` or `LAUNCH_BLOCKER` beyond what governance records already state
- Classify CRM or CAE internal features in the main platform repo
- Record marketing, fundraising, investor, sales, or field GTM items

---

## §2 Authority Boundary

| Authority aspect | This document's role |
|---|---|
| Implementation authorization | NONE — no item in this register may be implemented without a separate governed unit and Paresh approval |
| MVP classification | NONE — classification shown here is provisional from governance sources; requires Paresh confirmation at family cycle opening |
| Launch-blocking status | NONE — LAUNCH_BLOCKER status shown is from LAUNCH-FAMILY-INDEX; must be confirmed at family audit |
| Priority commitment | NONE — priority shown is provisional from source documents; subject to Paresh revision |
| CRM / CAE features | XDEP-only — main repo records cross-system integration status only; not CRM or CAE feature inventories |
| Family sequencing | NONE — family cycle order is governed by LAUNCH-FAMILY-INDEX; not changed by this document |

> **Guiding rule:** An intake entry means "this item exists as a planned or deferred requirement."
> It does NOT mean "this item is confirmed, prioritised, or authorized for implementation."
> Every item requires Paresh confirmation at the appropriate family cycle gate before work begins.

---

## §3 Relationship to Hub Documents

| Hub document | Relationship to this intake queue |
|---|---|
| `LAUNCH-FAMILY-INDEX.md` | Source of family-level intake rows (PRIT-001–PRIT-008); family cycle sequencing authority |
| `FUTURE-TODO-REGISTER.md` | Source of FTR intake rows (PRIT-009–PRIT-015); carries confirmed-deferred item status; intake queue cross-references but does not duplicate |
| `DECISION-PARKING-LOT.md` | Source of decision intake rows (PRIT-016–PRIT-019); decisions not ready to make; intake records the technical impact, not the business decision itself |
| `MVP-LAUNCH-READINESS-ROADMAP.md` | Informs provisional launch classifications; skeleton status |
| `MVP-MUST-HAVES-CHECKLIST.md` | Informs provisional priority; skeleton status |
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | Risk register that may surface new intake items during family audit |
| `governance/control/NEXT-ACTION.md` | Layer 0 posture; governs when any intake item may advance to a governed unit |

**Cross-reference rule:** When an FTR item is resolved, the FTR row is updated to RESOLVED.
The intake entry for that PRIT ID should be set to WITHDRAWN. The intake queue does NOT replace
any source document — it is additive only.

---

## §4 Intake Rules

1. **Intake only.** Recording an item in this queue does not change its status in any source document.
2. **No implementation.** No item in this queue may be implemented until a governed unit is opened with explicit Paresh authorization.
3. **No MVP promotion.** No item may be classified as `MVP_CRITICAL` or `LAUNCH_BLOCKER` based solely on this queue. Those classifications require Paresh confirmation at family cycle opening.
4. **Classification is provisional.** All `Provisional Launch Class` and `Provisional Priority` values shown are carried from governance source documents without change. They are NOT new classifications by this unit.
5. **XDEP only for CRM/CAE.** Items for CRM or CAE repos are recorded as cross-system dependency references (XDEP) only. No CRM or CAE feature inventories are maintained here.
6. **No GTM items.** Marketing, fundraising, commercial pricing, investor pitch, sales script, or field GTM items are not recorded in this intake queue. See §8.
7. **Intake is additive.** New items may be added by Paresh at any time. No item may be removed without Paresh written decision. Withdrawn items must be marked `WITHDRAWN` with rationale, not deleted.
8. **Family audit gate.** Before any family implementation cycle opens, all PRIT items for that family must be reviewed and confirmed or deferred by Paresh. This is the family opening audit gate (defined in TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001).
9. **CRM/CAE items (§9).** XDEP items listed in §9 are not implementation items for the main repo. They are reference pointers to integration contracts and handoff gates. They do not require Paresh confirmation in this queue — they require CRM/CAE repo audits.

---

## §5 Planned Requirements Table — Part A: Identity and Classification

All items are drawn from existing governance sources. No new classification is introduced.

| PRIT ID | Title | Target System | Proposed Family | Feature Source | Evidence Level | Confirmation Status | Prov. Launch Class | Prov. Priority |
|---|---|---|---|---|---|---|---|---|
| PRIT-001 | FAM-06: Auth and Session Management — full family cycle | MAIN | FAM-06 | REPO_PARTIAL | NEEDS_REPO_INSPECTION | PARESH_CONFIRMED | LAUNCH_BLOCKER | P0 |
| PRIT-002 | FAM-07: Tenant Onboarding and Invite — full family cycle | MAIN | FAM-07 | REPO_PARTIAL | NEEDS_REPO_INSPECTION | PARESH_CONFIRMED | LAUNCH_BLOCKER | P0 |
| PRIT-003 | FAM-08: Tenant Core Workspace — full family cycle | MAIN | FAM-08 | REPO_PARTIAL | NEEDS_REPO_INSPECTION | PARESH_CONFIRMED | LAUNCH_BLOCKER | P0 |
| PRIT-004 | FAM-09: Supplier Profile and Catalog — full family cycle | MAIN | FAM-09 | REPO_PARTIAL | NEEDS_REPO_INSPECTION | PARESH_CONFIRMED | LAUNCH_BLOCKER | P0 |
| PRIT-005 | FAM-10: Platform Ops and Control Plane — full family cycle | MAIN | FAM-10 | REPO_PARTIAL | NEEDS_REPO_INSPECTION | PARESH_CONFIRMED | LAUNCH_BLOCKER | P0 |
| PRIT-006 | FAM-11: Subscription and Commercial Gating — family cycle | MAIN | FAM-11 | REPO_PARTIAL | NEEDS_REPO_INSPECTION | PARESH_CONFIRMED | P1_MVP_MUST_HAVE | P1 |
| PRIT-007 | FAM-12: Network Commerce — RFQ, Pools and Award E2E completion | MAIN | FAM-12 | REPO_PARTIAL | NEEDS_REPO_INSPECTION | PARESH_CONFIRMED | PILOT_REQUIRED | P2 |
| PRIT-008 | FAM-15: Network Commerce — Invoices and Settlement family cycle | MAIN | FAM-15 | REPO_PARTIAL | NEEDS_REPO_INSPECTION | PARESH_CONFIRMED | PILOT_REQUIRED | P2 |
| PRIT-009 | Reused-existing-user onboarding edge case handling | MAIN | FAM-06 | REPO_PARTIAL | DESIGN_GATED | PARESH_CONFIRMED | MVP_CRITICAL | P1 |
| PRIT-010 | Control plane tenant operations (tenant list, inspect, activate) | MAIN | FAM-10 | REPO_PARTIAL | IMPLEMENTATION_READY | PARESH_CONFIRMED | MVP_CRITICAL | P0 |
| PRIT-011 | Privacy/consent notice for public inquiry form | MAIN | FAM-03 | PLANNED_NOT_IN_REPO | NOT_ASSESSED | UNCONFIRMED | MVP_CRITICAL (provisional) | P1 |
| PRIT-012 | Supplier ToS / platform agreement acceptance flow | MAIN | FAM-07 | PLANNED_NOT_IN_REPO | NOT_ASSESSED | UNCONFIRMED | MVP_CRITICAL (provisional) | P1 |
| PRIT-013 | Error monitoring and alerting setup | MAIN | FAM-10 | PLANNED_NOT_IN_REPO | NOT_ASSESSED | UNCONFIRMED | MVP_CRITICAL (provisional) | P1 |
| PRIT-014 | Performance budget / load testing before pilot go-live | MAIN | FAM-10 | PLANNED_NOT_IN_REPO | NOT_ASSESSED | UNCONFIRMED | PILOT_REQUIRED (provisional) | P2 |
| PRIT-015 | Rollback procedure documentation for production deployments | MAIN | FAM-10 | PLANNED_NOT_IN_REPO | NOT_ASSESSED | UNCONFIRMED | MVP_CRITICAL (provisional) | P1 |
| PRIT-016 | SEO domain canonical strategy decision (impacts sitemap, og:url, robots) | MAIN | FAM-04 | GOVERNANCE_CLAIM_ONLY | PARKED | UNCONFIRMED | LAUNCH_DEPENDENCY | P1 |
| PRIT-017 | G-022 maker-checker decision for award flow completion | MAIN | FAM-13 | GOVERNANCE_CLAIM_ONLY | PARKED | UNCONFIRMED | LAUNCH_DEPENDENCY | P2 |
| PRIT-018 | Subscription/commercial packaging tier decision | MAIN | FAM-11 | GOVERNANCE_CLAIM_ONLY | PARKED | UNCONFIRMED | POST_MVP (provisional) | P3 |
| PRIT-019 | Supplier profile publication and indexability policy decision | MAIN | FAM-09 | GOVERNANCE_CLAIM_ONLY | PARKED | UNCONFIRMED | LAUNCH_DEPENDENCY | P2 |
| PRIT-020 | CRM → Platform provisioning handoff (WEBHOOK-007) | CROSS_SYSTEM | FAM-22 | GOVERNANCE_CLAIM_ONLY | DESIGN_GATED | XDEP_ONLY | XDEP_DEPENDENCY | — |
| PRIT-021 | CAE → CRM → Platform integration chain | CROSS_SYSTEM | FAM-24 | GOVERNANCE_CLAIM_ONLY | DESIGN_GATED | XDEP_ONLY | XDEP_DEPENDENCY | — |
| PRIT-022 | PWA installability and offline shell strategy | MAIN | FAM-10 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | P2_PILOT_ENABLER | P2 |
| PRIT-023 | TexQtic CoWorker / AI Workbench foundation | MAIN | FAM-19 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |
| PRIT-024 | China+1 Discovery Engine / RFQ matching strategy | MAIN | FAM-12 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |
| PRIT-025 | AI Pricing Oracle | MAIN | FAM-19 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |
| PRIT-026 | Collective Sustainability Certification Pool | MAIN | FAM-17 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |
| PRIT-027 | Artisan IP and Heritage Commerce Layer | MAIN | FAM-02 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |

---

## §5B Planned Requirements Table — Part B: Actions and Tracking

| PRIT ID | Governance Source | Dependency / Blocker | Repo Inspect? | Biz Decision? | Recommended Dest Doc | Next Action |
|---|---|---|---|---|---|---|
| PRIT-001 | LAUNCH-FAMILY-INDEX FAM-06 (NOT_ASSESSED, cycle 5) | Layer 0 HOLD_FOR_AUTHORIZATION release | YES — family opening audit | NO | LAUNCH-FAMILY-INDEX.md | Open FAM-06 family cycle when Layer 0 releases |
| PRIT-002 | LAUNCH-FAMILY-INDEX FAM-07 (NOT_ASSESSED, cycle 6) | Layer 0 release; FAM-06 complete | YES — family opening audit | NO | LAUNCH-FAMILY-INDEX.md | Open FAM-07 family cycle after FAM-06 |
| PRIT-003 | LAUNCH-FAMILY-INDEX FAM-08 (NOT_ASSESSED, cycle 7) | FAM-06 complete | YES — family opening audit | NO | LAUNCH-FAMILY-INDEX.md | Open FAM-08 family cycle after FAM-06 |
| PRIT-004 | LAUNCH-FAMILY-INDEX FAM-09 (NOT_ASSESSED, cycle 8) | FAM-06 + FAM-07 complete | YES — family opening audit | NO | LAUNCH-FAMILY-INDEX.md | Open FAM-09 family cycle; note pre-existing unstaged PublicSupplierProfile.tsx |
| PRIT-005 | LAUNCH-FAMILY-INDEX FAM-10 (NOT_ASSESSED, cycle 9) | Layer 0 release | YES — family opening audit | NO | LAUNCH-FAMILY-INDEX.md | Open FAM-10 family cycle; boundary artifact exists |
| PRIT-006 | LAUNCH-FAMILY-INDEX FAM-11 (NOT_ASSESSED, cycle 10) | FAM-06 + FAM-07 + FAM-10 complete; D-008 decision | YES — family opening audit | YES — D-008 commercial packaging | LAUNCH-FAMILY-INDEX.md | Open FAM-11 family cycle after P0 gates |
| PRIT-007 | LAUNCH-FAMILY-INDEX FAM-12 (PARTIALLY_IMPLEMENTED, cycle 11) | G-022 decision (D-007); Layer 0 release | YES — award E2E inspection | YES — G-022 maker-checker | LAUNCH-FAMILY-INDEX.md | Open FAM-12 family cycle; D-007 must be resolved first |
| PRIT-008 | LAUNCH-FAMILY-INDEX FAM-15 (NOT_ASSESSED, cycle 12) | FAM-12 E2E complete | YES — family opening audit | NO | LAUNCH-FAMILY-INDEX.md | Open FAM-15 family cycle after FAM-12 |
| PRIT-009 | FUTURE-TODO-REGISTER FTR-AUTH-001 (DESIGN_GATED, P1, MVP_CRITICAL) | FAM-06 cycle opening | YES — inspect reused-user path in repo | NO | FUTURE-TODO-REGISTER.md | Address in FAM-06 family cycle |
| PRIT-010 | FUTURE-TODO-REGISTER FTR-CP-001 (IMPLEMENTATION_READY, P0, MVP_CRITICAL) | Layer 0 release; boundary artifact exists | YES — verify boundary artifact current | NO | FUTURE-TODO-REGISTER.md | Address in FAM-10 family cycle; IMPLEMENTATION_READY flag means first to open |
| PRIT-011 | FUTURE-TODO-REGISTER FTR-LEGAL-002 (NOT_ASSESSED, P1, MVP_CRITICAL) | None (design can start) | NO | YES — consent language wording | FUTURE-TODO-REGISTER.md | Address in FAM-03 or inquiry family cycle; requires Paresh and possibly counsel review |
| PRIT-012 | FUTURE-TODO-REGISTER FTR-LEGAL-003 (NOT_ASSESSED, P1, MVP_CRITICAL) | FAM-07 cycle; ToS wording decision | NO | YES — ToS content and legal review | FUTURE-TODO-REGISTER.md | Address in FAM-07 family cycle; may require external counsel |
| PRIT-013 | FUTURE-TODO-REGISTER FTR-OPS-001 (NOT_ASSESSED, P1, MVP_CRITICAL) | None; tooling choice | NO | NO (technical choice) | FUTURE-TODO-REGISTER.md | Address in FAM-10 family cycle; requires tooling selection (e.g. Sentry, Datadog) |
| PRIT-014 | FUTURE-TODO-REGISTER FTR-OPS-002 (NOT_ASSESSED, P2, PILOT_REQUIRED) | After P0 families | NO | NO | FUTURE-TODO-REGISTER.md | Address before Surat pilot go-live; load profile: 30–50 suppliers |
| PRIT-015 | FUTURE-TODO-REGISTER FTR-OPS-003 (NOT_ASSESSED, P1, MVP_CRITICAL) | Deploy pipeline verified (O-1) | NO | NO | FUTURE-TODO-REGISTER.md | Address in FAM-10 family cycle; documents Vercel + Supabase rollback path |
| PRIT-016 | DECISION-PARKING-LOT D-005 (P1, PARKED) | Paresh domain decision; depends on marketing site plan | NO | YES — Paresh decides canonical domain | DECISION-PARKING-LOT.md | Paresh confirms domain strategy; unblocks sitemap expansion |
| PRIT-017 | DECISION-PARKING-LOT D-007 (P2, PARKED) | G-022 context inspection required | YES — read TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001 | YES — Paresh decides G-022 scope | DECISION-PARKING-LOT.md | Paresh reviews G-022 design artifact; decision unblocks FAM-12 E2E |
| PRIT-018 | DECISION-PARKING-LOT D-008 (P3, PARKED) | Pilot data; commercial experiment | NO | YES — Paresh decides tier/pricing model | DECISION-PARKING-LOT.md | After Surat pilot proof pack; commercial packaging experiment |
| PRIT-019 | DECISION-PARKING-LOT D-010 (P2, PARKED) | First real Surat supplier onboarded | NO | YES — Paresh decides publication policy | DECISION-PARKING-LOT.md | After first real supplier onboarded; SEO vs. privacy tradeoff |
| PRIT-020 | LAUNCH-FAMILY-INDEX FAM-22 / BLOCKED.md WEBHOOK-007 (XDEP_ONLY) | WEBHOOK-007 design gate; CRM repo audit required | NO — CRM repo only | YES — integration contract decision | LAUNCH-FAMILY-INDEX.md | CRM repo audit; define WEBHOOK-007 contract; then main repo integration |
| PRIT-021 | LAUNCH-FAMILY-INDEX FAM-24 (XDEP_ONLY) | TTP legal gate (HOLD_FOR_COUNSEL_FEEDBACK); CAE audit; CRM audit | NO — other repos only | YES — multi-repo integration design | LAUNCH-FAMILY-INDEX.md | After TTP legal gate and CAE repo audit |
| PRIT-022 | Paresh-provided planned-feature document (PWA concept) | Needs design: web app manifest, service worker, HTTPS gate; auth/session implications for installed app; subscriber gating implications | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |
| PRIT-023 | Paresh-provided planned-feature document (TexQtic CoWorker concept) | Needs design: AI workbench foundation; non-autonomous execution boundary; skills layer; tenant-scoped memory; tool logging; action approval queue | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |
| PRIT-024 | Paresh-provided planned-feature document (7 Pillars — Pillar 3) | Needs design: China+1 discovery engine; AI-assisted RFQ matching; buyer discovery scope; relation to FAM-12 RFQ | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |
| PRIT-025 | Paresh-provided planned-feature document (7 Pillars — Pillar 4) | Data dependency: real platform transaction, lead-time, and rejection data required; design must precede implementation | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |
| PRIT-026 | Paresh-provided planned-feature document (7 Pillars — Pillar 5) | Needs design: certification pool model; DPP integration (FAM-05); supplier profile eligibility (FAM-09); potential AI document intelligence | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |
| PRIT-027 | Paresh-provided planned-feature document (7 Pillars — Pillar 6) | Needs design: artisan IP model; heritage commerce layer; relation to D2C collections (FAM-02); DPP and traceability (FAM-05, FAM-17) | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |

---

## §6 Paresh-Confirmed Planned Requirements

The following items have been confirmed through closed governance artifacts as required
technical work. Their confirmation status is `PARESH_CONFIRMED` because they are recorded
in Paresh-authorized governance units or the LAUNCH-FAMILY-INDEX.

**Confirmed-by-governance technical requirements:**

| PRIT ID | Confirmed By | Confirmation Type |
|---|---|---|
| PRIT-001 | LAUNCH-FAMILY-INDEX (Paresh-authorized) | Family cycle required; NOT_ASSESSED status confirmed |
| PRIT-002 | LAUNCH-FAMILY-INDEX (Paresh-authorized) | Family cycle required; NOT_ASSESSED status confirmed |
| PRIT-003 | LAUNCH-FAMILY-INDEX (Paresh-authorized) | Family cycle required; NOT_ASSESSED status confirmed |
| PRIT-004 | LAUNCH-FAMILY-INDEX (Paresh-authorized) | Family cycle required; NOT_ASSESSED status confirmed |
| PRIT-005 | LAUNCH-FAMILY-INDEX (Paresh-authorized) | Family cycle required; NOT_ASSESSED status confirmed |
| PRIT-006 | LAUNCH-FAMILY-INDEX (Paresh-authorized) | Family cycle required; NOT_ASSESSED status confirmed |
| PRIT-007 | LAUNCH-FAMILY-INDEX (Paresh-authorized) | Family cycle required; PARTIALLY_IMPLEMENTED confirmed |
| PRIT-008 | LAUNCH-FAMILY-INDEX (Paresh-authorized) | Family cycle required; NOT_ASSESSED status confirmed |
| PRIT-009 | TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001 via FTR-AUTH-001 | Deferred remainder confirmed by governance |
| PRIT-010 | FTR-CP-001 (IMPLEMENTATION_READY) — boundary artifact exists | Confirmed-deferred; first to open when Layer 0 releases |

**Classification confirmation note:** `PARESH_CONFIRMED` in this context means "the item is
confirmed as a requirement that must be addressed." It does NOT mean the specific implementation
scope, design, or MVP classification within the family cycle is confirmed. Those must be
confirmed at each family cycle opening gate.

---

## §7 Unconfirmed Planned Requirements

The following items require explicit Paresh confirmation of their classification, scope, or
priority before their family cycles may open.

| PRIT ID | What Needs Confirmation |
|---|---|
| PRIT-011 | Confirm P1/MVP_CRITICAL classification for privacy/consent; confirm which family cycle handles this |
| PRIT-012 | Confirm P1/MVP_CRITICAL; confirm if external counsel is needed for ToS wording |
| PRIT-013 | Confirm tooling choice (e.g. Sentry, Datadog, custom); confirm P1/MVP_CRITICAL before go-live |
| PRIT-014 | Confirm scope of load test (Surat pilot = 30–50 suppliers; what is test profile?) |
| PRIT-015 | Confirm rollback procedure format (runbook? script? Vercel/Supabase specific?) |
| PRIT-016 | Confirm domain strategy: will texqtic.com be primary, or will subdomain / marketing site be canonical? |
| PRIT-017 | Confirm G-022 maker-checker decision: is the two-call split approved? (design artifact exists) |
| PRIT-018 | Confirm: is commercial packaging needed before MVP launch or is pilot free? |
| PRIT-019 | Confirm: should supplier profiles be indexed by default from day one, or only after Paresh opts in? |

> **✅ PRIT-022 THROUGH PRIT-027 ADDED VIA TEXQTIC-PLANNED-FEATURES-DOCUMENT-INTAKE-001**
>
> Six new Paresh-planned requirements were added from three Paresh-provided planned-feature
> documents: Progressive Web App / PWA concept, TexQtic CoWorker / AI Workbench concept, and
> 7 Pillars of TexQtic concise version. These rows are intake-only staging entries. They
> require Paresh review and family audit confirmation before any family cycle or implementation
> work begins. DPP Passport (Pillar 1) and TexCredit / embedded finance (Pillar 2) are
> already covered by FAM-05/D-001 and FAM-16/D-002 respectively; no duplicate rows created.
> Seventh Pillar not present in provided artifact; no row created.
>
> See §13 for the full planned feature document intake section.
>
> **This intake queue is OPEN and ready for Paresh to add new requirements at any time.**
> Next available PRIT ID: PRIT-028.

---

## §8 Out-of-Repo Business/GTM Items — Not Recorded Here

The following categories of planned activity exist for TexQtic but are NOT recorded in this
intake queue. They are out-of-repo business and operational matters that do not produce
governed delivery units in the main platform repo.

| Category | Reason excluded |
|---|---|
| Surat 90-day tactical GTM battle plan | Operational/field plan; no repo artifact |
| Fundraising and investor pitch preparation | Business/financial; no repo artifact |
| Sales call scripts and supplier outreach | Commercial/field; no repo artifact |
| Commercial pricing/tier decision (the business choice, not the technical implementation) | Business decision; technical gating is PRIT-018 |
| Marketing content and campaigns | Marketing; no repo artifact |
| Field onboarding playbook for Surat suppliers | Operational; no repo artifact |
| Customer acquisition strategy | GTM; no repo artifact |

> These items are relevant to TexQtic launch readiness but are not tracked in this repo's
> governance layer. Paresh should maintain a separate business operations document for these.

---

## §9 CRM and CAE Planned Items — XDEP-Only References

The main platform repo records cross-system integration dependency status only. CRM and CAE
feature inventories are NOT maintained here. See Decision B in
`TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001`.

| PRIT ID | Integration | Status in Main Repo | What Must Happen First |
|---|---|---|---|
| PRIT-020 | CRM → Platform provisioning handoff via WEBHOOK-007 | XDEP_ONLY; DESIGN_GATED | CRM repo audit; WEBHOOK-007 design contract defined |
| PRIT-021 | CAE → CRM → Platform integration chain | XDEP_ONLY; DESIGN_GATED | TTP legal gate (HOLD_FOR_COUNSEL_FEEDBACK); CAE repo audit; CRM repo audit |

**Rule:** No PRIT-020 or PRIT-021 implementation work may be added to a main-repo governed unit
until:
1. The respective external repo audit is complete.
2. An integration contract is defined in `shared/contracts/`.
3. Paresh explicitly authorizes the integration slice.

---

## §10 Items Requiring Paresh Confirmation Before MVP Classification

The following intake items carry a `(provisional)` marker on their launch class because they
have not been explicitly confirmed by Paresh as `MVP_CRITICAL`. They are recorded from the
`FUTURE-TODO-REGISTER` as "not yet assessed" items. Paresh should confirm or revise their
classification before the relevant family cycle opens.

| PRIT ID | Title | Current Prov. Class | Paresh Question |
|---|---|---|---|
| PRIT-011 | Privacy/consent for inquiry form | MVP_CRITICAL (provisional) | Is this required before pilot go-live, or can a basic notice suffice initially? |
| PRIT-012 | Supplier ToS/platform agreement | MVP_CRITICAL (provisional) | Is a formal ToS required at Surat pilot onboarding, or can a simplified agreement suffice? |
| PRIT-013 | Error monitoring/alerting | MVP_CRITICAL (provisional) | Is a monitoring tool required before pilot, or is log-based alerting sufficient initially? |
| PRIT-014 | Performance/load testing | PILOT_REQUIRED (provisional) | What is the performance threshold for Surat pilot? 50 concurrent users? 200? |
| PRIT-015 | Rollback procedure documentation | MVP_CRITICAL (provisional) | Confirm format: informal runbook, formal ops playbook, or automated rollback script? |
| PRIT-016 | SEO canonical domain strategy | LAUNCH_DEPENDENCY | Which domain is canonical? texqtic.com or a marketing subdomain? |
| PRIT-017 | G-022 maker-checker decision | LAUNCH_DEPENDENCY | Confirm the two-call split design from TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001 |
| PRIT-018 | Commercial packaging tier decision | POST_MVP (provisional) | Can Surat pilot launch with free/manual provisioning? Or is self-serve commercial gating needed at pilot? |
| PRIT-019 | Supplier profile indexability policy | LAUNCH_DEPENDENCY | Should Surat supplier profiles be Google-indexed from pilot day one? Or opt-in only? |

> **Action for Paresh:** Review the table above and confirm or revise each item's classification
> before the relevant family cycle opens. No governance unit will classify these items as
> `MVP_CRITICAL` or `LAUNCH_BLOCKER` based on this intake document alone.

---

## §11 Completion Checklist

| # | Check | Status |
|---|---|---|
| 1 | 27 intake rows populated (PRIT-001 through PRIT-027) | ✅ COMPLETE |
| 2 | No new classification introduced beyond governance sources | ✅ CONFIRMED |
| 3 | No implementation authorized by this document | ✅ CONFIRMED |
| 4 | No CRM or CAE feature inventories in main repo | ✅ CONFIRMED — XDEP only |
| 5 | No out-of-repo GTM items recorded | ✅ CONFIRMED — §8 and §13.5 list exclusions |
| 6 | XDEP items properly scoped | ✅ CONFIRMED — PRIT-020, PRIT-021 |
| 7 | Paresh-planned items notice updated in §7 | ✅ §7 updated for PRIT-022–027 |
| 8 | Items requiring Paresh confirmation listed | ✅ §10 |
| 9 | Pre-existing unstaged M files documented | ✅ Header and §9 of unit artifact |
| 10 | Document is additive-only; no source document rows changed | ✅ CONFIRMED |
| 11 | Document registered in README.md hub read order | ✅ README.md updated in unit |
| 12 | PRIT-022–027 added from Paresh-provided planned-feature documents | ✅ §13 added via TEXQTIC-PLANNED-FEATURES-DOCUMENT-INTAKE-001 |
| 13 | DPP (Pillar 1) and TexCredit (Pillar 2) cross-referenced to existing governance | ✅ §13.4 — no duplicate rows |
| 14 | Seventh Pillar absence noted; no row created | ✅ §13.6 |

---

---

## §13 Paresh Planned Feature Document Intake — TEXQTIC-PLANNED-FEATURES-DOCUMENT-INTAKE-001

**Unit:** `TEXQTIC-PLANNED-FEATURES-DOCUMENT-INTAKE-001`  
**Date:** 2026-05-19  
**Documents reviewed:** Paresh-provided planned-feature documents (provided as in-prompt context)  
**Layer 0 posture at intake:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` — UNCHANGED  

---

### §13.1 Source Documents Reviewed

| # | Document | Provided As | Technical Features Extracted |
|---|---|---|---|
| 1 | Progressive Web App / PWA concept | Paresh-provided planned-feature document | One-codebase installability; web app manifest; service worker / app shell caching; HTTPS gate; auth/session implications for installed app; subscriber/tier gating implications; update/versioning behavior; offline/cache strategy; push notifications; Electron wrapper (later/conditional only) |
| 2 | TexQtic CoWorker / AI Workbench concept | Paresh-provided planned-feature document | In-app AI assistant (first surface); skills layer; tenant-scoped memory; tool invocation logging; action approval queue; human-confirmed prepared actions; RFQ/DPP/profile completeness/support/governance prompt assistants; external channels later (WhatsApp, Slack, email, calendar); strict non-autonomous execution boundary |
| 3 | 7 Pillars of TexQtic — concise version | Paresh-provided planned-feature document | Pillar 1: DPP Passport (→ cross-ref FAM-05/D-001); Pillar 2: TexCredit/embedded supply-chain finance (→ cross-ref FAM-16/D-002/TTP); Pillar 3: China+1 Discovery Engine/RFQ matching (→ PRIT-024); Pillar 4: AI Pricing Oracle (→ PRIT-025); Pillar 5: Collective Sustainability Certification Pool (→ PRIT-026); Pillar 6: Artisan IP and Heritage Commerce Layer (→ PRIT-027); Pillar 7: not present in provided artifact |

---

### §13.2 Intake Principle

- **Parent rows only.** New PRIT rows capture the planned feature concept at the parent level. No sub-feature decomposition is performed at intake stage.
- **No implementation authorization.** Recording a row here does not authorize design, implementation, or family cycle opening.
- **No MVP/P0/P1 promotion.** All new rows carry conservative default classifications. Priority and launch class may be revised only in `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001`.
- **Future family audit required.** Every new row requires a Family Opening Audit Gate before any implementation work begins.
- **Conservative classification by default.** All new rows are `DESIGN_GATED` with `PARESH_CONFIRMED_AS_PLANNED` status.

---

### §13.3 New PRIT Rows — Summary

| PRIT ID | Title | Primary Family | Related Families | Prov. Launch Class | Prov. Priority | Readiness |
|---|---|---|---|---|---|---|
| PRIT-022 | PWA installability and offline shell strategy | FAM-10 | FAM-06, FAM-11 | P2_PILOT_ENABLER | P2 | DESIGN_GATED |
| PRIT-023 | TexQtic CoWorker / AI Workbench foundation | FAM-19 | FAM-10, FAM-12, FAM-05, FAM-09 | POST_MVP | P3 | DESIGN_GATED |
| PRIT-024 | China+1 Discovery Engine / RFQ matching strategy | FAM-12 | FAM-19, FAM-09 | POST_MVP | P3 | DESIGN_GATED |
| PRIT-025 | AI Pricing Oracle | FAM-19 | FAM-12, FAM-15, FAM-16 | POST_MVP | P3 | DESIGN_GATED |
| PRIT-026 | Collective Sustainability Certification Pool | FAM-17 | FAM-05, FAM-09, FAM-19 | POST_MVP | P3 | DESIGN_GATED |
| PRIT-027 | Artisan IP and Heritage Commerce Layer | FAM-02 (or future artisan family) | FAM-05, FAM-17, FAM-09 | POST_MVP | P3 | DESIGN_GATED |

**Classification notes:**
- PRIT-022 (PWA): Provisionally P2_PILOT_ENABLER because PWA installability could be valuable at the Surat pilot stage. Not P0/P1 — no launch blocking significance established at intake.
- PRIT-023 (CoWorker): P3 default. Internal read-only assistant sub-feature may be reconsidered as a P2 pilot-enabler after Paresh review, but this cannot be classified here.
- PRIT-025 (AI Pricing Oracle): Hard data dependency. Requires real platform transaction data, lead-time data, and quality rejection data. Cannot be designed or built until the platform has real usage.
- PRIT-026 (Sustainability Pool): P3 default. May be reconsidered as P2 if Paresh chooses a certification-led pilot narrative.

---

### §13.4 Cross-Reference Notes — Existing Governance Coverage

The following planned features from the user-provided documents are **already represented** by existing governance entries and **do not receive new PRIT rows**:

| Planned Feature | Source Document | Existing Coverage | Action |
|---|---|---|---|
| DPP Passport (Pillar 1) | 7 Pillars — Pillar 1 | FAM-05 / D-001 (PARKED_DECISION; HOLD_FOR_PARESH_DECISION) | No new row. Cross-reference to FAM-05 and D-001. |
| TexCredit / embedded supply-chain finance (Pillar 2) | 7 Pillars — Pillar 2 | FAM-16 / D-002 (TTP; HOLD_FOR_COUNSEL_FEEDBACK) | No new row. TexCredit is treated as part of or dependent on TexQtic Trust Pay / FAM-16 / D-002 unless Paresh later decides it is a separate product family. Cross-reference to FAM-16. |

---

### §13.5 Items Explicitly Excluded — Out-of-Repo Business / GTM / Revenue Narrative

The following content from the user-provided documents was reviewed and excluded because it is business, GTM, market narrative, or revenue projection — not a repo technical requirement:

- Market size claims and revenue projection figures
- Investor pitch language and fundraising positioning
- Competitive market analysis and positioning narrative
- GTM battle plan language (90-day, city-specific outreach)
- Commercial pricing projections (tier pricing, revenue targets)
- Sales enablement scripts and field outreach copy
- Pillar 7 of the 7 Pillars document: not present in the provided artifact; no row created

---

### §13.6 Seventh Pillar Note

The 7 Pillars document provided by Paresh contained Pillars 1 through 6. **Pillar 7 was not present in the provided artifact.** No row was created for Pillar 7. Paresh should add PRIT-028 (or the next available ID) when Pillar 7 is defined and ready for intake.

---

### §13.7 Review Note

**PRIT-022 through PRIT-027 must be reviewed in `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` before any family status, priority, or classification changes are made.**

All items remain `DESIGN_GATED` with `PARESH_CONFIRMED_AS_PLANNED` confirmation status until the review unit confirms otherwise. No family cycle may open for any of these items based on this intake section alone.

---

## §12 Update History

| Date | Unit | Change |
|---|---|---|
| 2026-07-14 | TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001 | Document created; PRIT-001 through PRIT-021 populated from governance sources; §6–§10 completed |
| 2026-05-19 | TEXQTIC-PLANNED-FEATURES-DOCUMENT-INTAKE-001 | PRIT-022 through PRIT-027 added from Paresh-provided planned-feature documents (PWA, CoWorker, 7 Pillars); §13 added; §7 notice updated; §11 checklist updated to 27 rows |
