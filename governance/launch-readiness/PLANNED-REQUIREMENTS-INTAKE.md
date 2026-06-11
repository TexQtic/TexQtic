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
| PRIT-011 | Privacy/consent notice for public inquiry form | MAIN | FAM-03 | PLANNED_NOT_IN_REPO | NOT_ASSESSED | PARESH_CONFIRMED | MVP_CRITICAL | P1 |
| PRIT-012 | Supplier ToS / platform agreement acceptance flow | MAIN | FAM-07 | PLANNED_NOT_IN_REPO | NOT_ASSESSED | PARESH_CONFIRMED | MVP_CRITICAL | P1 |
| PRIT-013 | Error monitoring and alerting setup | MAIN | FAM-10 | PLANNED_NOT_IN_REPO | NOT_ASSESSED | PARESH_CONFIRMED | MVP_CRITICAL | P1 |
| PRIT-014 | Performance budget / load testing before pilot go-live | MAIN | FAM-10 | PLANNED_NOT_IN_REPO | NOT_ASSESSED | PARESH_CONFIRMED | PILOT_REQUIRED | P2 |
| PRIT-015 | Rollback procedure documentation for production deployments | MAIN | FAM-10 | PLANNED_NOT_IN_REPO | NOT_ASSESSED | PARESH_CONFIRMED | MVP_CRITICAL | P1 |
| PRIT-016 | SEO domain canonical strategy decision (impacts sitemap, og:url, robots) | MAIN | FAM-04 | GOVERNANCE_CLAIM_ONLY | PARKED | PARESH_CONFIRMED | LAUNCH_DEPENDENCY | P1 |
| PRIT-017 | G-022 maker-checker decision for award flow completion | MAIN | FAM-13 | GOVERNANCE_CLAIM_ONLY | PARKED | DEFERRED | LAUNCH_DEPENDENCY | P2 |
| PRIT-018 | Subscription/commercial packaging tier decision | MAIN | FAM-11 | GOVERNANCE_CLAIM_ONLY | PARKED | POST_MVP_CONFIRMED | POST_MVP | P3 |
| PRIT-019 | Supplier profile publication and indexability policy decision | MAIN | FAM-09 | GOVERNANCE_CLAIM_ONLY | PARKED | PARESH_CONFIRMED | LAUNCH_DEPENDENCY | P2 |
| PRIT-020 | CRM → Platform provisioning handoff (WEBHOOK-007) | CROSS_SYSTEM | FAM-22 | GOVERNANCE_CLAIM_ONLY | DESIGN_GATED | XDEP_ONLY | XDEP_DEPENDENCY | — |
| PRIT-021 | CAE → CRM → Platform integration chain | CROSS_SYSTEM | FAM-24 | GOVERNANCE_CLAIM_ONLY | DESIGN_GATED | XDEP_ONLY | XDEP_DEPENDENCY | — |
| PRIT-022 | PWA installability and offline shell strategy | MAIN | FAM-10 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | P2_PILOT_ENABLER | P2 |
| PRIT-023 | TexQtic CoWorker / AI Workbench foundation | MAIN | FAM-19 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |
| PRIT-024 | China+1 Discovery Engine / RFQ matching strategy | MAIN | FAM-12 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |
| PRIT-025 | AI Pricing Oracle | MAIN | FAM-19 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |
| PRIT-026 | Collective Sustainability Certification Pool | MAIN | FAM-17 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |
| PRIT-027 | Artisan IP and Heritage Commerce Layer | MAIN | FAM-02 | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |
| PRIT-028 | Subscription tier entitlement model (self-serve, post-MVP) | MAIN | FAM-11 | GOVERNANCE_CLAIM_ONLY | PARKED | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P2 |
| PRIT-029 | Razorpay/payment gateway methodology for B2C/D2C commerce | MAIN | FAM-11 / future B2C-D2C commerce family | GOVERNANCE_CLAIM_ONLY | DESIGN_GATED | DESIGN_GATED | DESIGN_GATED | P2 |
| PRIT-030 | B2B no-platform-financial-transaction boundary (guardrail) | MAIN | FAM-12 / FAM-16 | GOVERNANCE_CLAIM_ONLY | CONFIRMED_BOUNDARY | CONFIRMED_BOUNDARY | CONFIRMED_BOUNDARY | P1 |
| PRIT-031 | Commission/deduction methodology across B2B/B2C/D2C | MAIN | FAM-11 / FAM-15 / FAM-16 | GOVERNANCE_CLAIM_ONLY | DESIGN_GATED | DESIGN_GATED | DESIGN_GATED | P2 |
| PRIT-032 | Cart-as-intent buyer surface governance (ungoverned code exists in repo) | MAIN | FAM-01 / future buyer commerce family | PILOT_REQUIRED | PARESH_CONFIRMED | NOT_ASSESSED | PARESH_CONFIRMED (2026-07-14) | P2 |
| PRIT-033 | Supplier inquiry response workflow — tenant dashboard inquiry inbox | MAIN | FAM-03 / FAM-08 (Paresh to decide) | MVP_CRITICAL | PARESH_CONFIRMED | NOT_ASSESSED | PARESH_CONFIRMED (2026-07-14) | P1 |
| PRIT-034 | Public legal pages bundle — privacy policy, terms page, cookie stance, DSAR path | MAIN | FAM-03 / standalone unit | MVP_CRITICAL | PARESH_CONFIRMED | NOT_ASSESSED | PARESH_CONFIRMED (2026-07-14) | P1 |
| PRIT-035 | Product analytics and funnel tracking infrastructure | MAIN | FAM-10 / FAM-01 / FAM-02 | PILOT_REQUIRED | PARESH_CONFIRMED | NOT_ASSESSED | PARESH_CONFIRMED (2026-07-14) | P2 |
| PRIT-036 | SMTP provider selection and Vercel production environment configuration (CU-02) | MAIN | FAM-10 / standalone ops unit | PRODUCTION_VERIFIED | `SOFT-LAUNCH-F1-P1A-SMTP-POSTMARK-OPS-RUNTIME-VERIFY` | RESOLVED | RESOLVED | P0 (RESOLVED) |
| PRIT-037 | Buyer bridge from reference preview: activation gate | MAIN | FAM-03 / standalone unit | GOVERNANCE_CLAIM_ONLY | PARKED | OPEN | P1 provisional | P1 |
| PRIT-038 | ONDC / GeM Commerce Rail — Pillar 7 | MAIN | FAM-25 (new; Paresh to decide) / FAM-12 / FAM-15 extension | USER_PLANNED_ONLY | USER_PLANNED_ONLY | PARESH_CONFIRMED_AS_PLANNED | POST_MVP | P3 |

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
| PRIT-022 | Paresh-provided planned-feature document (PWA concept) | Needs design: web app manifest, service worker, HTTPS gate; auth/session implications for installed app; subscriber gating implications | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Reviewed in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001; accepted as planned feature; DESIGN_GATED retained; no family cycle opened |
| PRIT-023 | Paresh-provided planned-feature document (TexQtic CoWorker concept) | Needs design: AI workbench foundation; non-autonomous execution boundary; skills layer; tenant-scoped memory; tool logging; action approval queue | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Reviewed in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001; accepted as planned feature; DESIGN_GATED retained; no family cycle opened |
| PRIT-024 | Paresh-provided planned-feature document (7 Pillars — Pillar 3) | Needs design: China+1 discovery engine; AI-assisted RFQ matching; buyer discovery scope; relation to FAM-12 RFQ | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Reviewed in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001; accepted as planned feature; DESIGN_GATED retained; no family cycle opened |
| PRIT-025 | Paresh-provided planned-feature document (7 Pillars — Pillar 4) | Data dependency: real platform transaction, lead-time, and rejection data required; design must precede implementation | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Reviewed in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001; accepted as planned feature; DESIGN_GATED retained; no family cycle opened |
| PRIT-026 | Paresh-provided planned-feature document (7 Pillars — Pillar 5) | Needs design: certification pool model; DPP integration (FAM-05); supplier profile eligibility (FAM-09); potential AI document intelligence | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Reviewed in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001; accepted as planned feature; DESIGN_GATED retained; no family cycle opened |
| PRIT-027 | Paresh-provided planned-feature document (7 Pillars — Pillar 6) | Needs design: artisan IP model; heritage commerce layer; relation to D2C collections (FAM-02); DPP and traceability (FAM-05, FAM-17) | YES | NO | PLANNED-REQUIREMENTS-INTAKE.md | Reviewed in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001; accepted as planned feature; DESIGN_GATED retained; no family cycle opened |
| PRIT-028 | TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001 (§3) | Subscription tier pricing, entitlement enforcement per plan, self-serve upgrade; pilot FREE/manual per PRIT-018; self-serve packaging deferred post-MVP | YES — FAM-11 cycle | YES — D-011 (tier pricing, billing cycle) | DECISION-PARKING-LOT.md (D-011) | Address in FAM-11 family cycle; D-011 must resolve for self-serve; pilot proceeds as FREE/operator-provisioned |
| PRIT-029 | TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001 (§4) | Razorpay/payment gateway prerequisites per methodology §4.3; no implementation until D-015 and §4.3 gates satisfied | NO | YES — D-015 (Razorpay/gateway); D-012 (merchant-of-record); counsel/CA review | DECISION-PARKING-LOT.md (D-012, D-015) | No implementation until D-015 + §4.3 prerequisites satisfied; DESIGN_GATED until then |
| PRIT-030 | TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001 (§5) | B2B no-platform-financial-transaction boundary is a CONFIRMED constitutional guardrail; no design gate needed — must be observed in all B2B family cycles (FAM-12, FAM-13, FAM-14, FAM-15, FAM-16) | NO | NO — confirmed boundary | COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md §5 | Enforce in FAM-12/FAM-15/FAM-16 family cycle openings; no implementation action needed until TTP gate clears |
| PRIT-031 | TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001 (§8) | Commission/deduction policy across B2B/B2C/D2C; all scenarios parked until D-012/D-013/D-014 resolve; no commission logic to implement until model decided | NO | YES — D-013, D-014 (commission policy) | DECISION-PARKING-LOT.md (D-013, D-014) | No commission/deduction implementation until D-013/D-014 resolved and Paresh authorizes |
| PRIT-032 | MISSING-FAMILY-AND-FEATURE-SCAN.md (§6) — Cart.tsx, cartService.ts, MarketplaceCartSummary, CartSummariesPanel exist in repo; no governing family/PRIT/FTR/design unit | Code exists; scope ungoverned — FAM-01 or new buyer commerce family opening needed | YES — inspect Cart.tsx, cartService.ts scope at family opening | YES — Paresh to decide: what cart scope is authorized for Surat pilot? | MISSING-FAMILY-AND-FEATURE-SCAN.md | Confirm with Paresh at first family selection; assign to appropriate family cycle |
| PRIT-033 | MISSING-FAMILY-AND-FEATURE-SCAN.md (§6) — inquiry submit writes to DB but no tenant-facing supplier inbox exists; no route, no UI, no PRIT/FTR previously | Depends on FAM-06 completing (supplier auth required for inbox) | YES — inspect tenant routes at FAM-03 or FAM-08 opening | YES — Paresh to decide: FAM-03 or FAM-08 as owning family? Minimum inbox scope for pilot? | MISSING-FAMILY-AND-FEATURE-SCAN.md | Paresh confirmed MVP_CRITICAL/P1 (2026-07-14). **Minimum inquiry notification to supplier/admin is part of PRIT-033 scope** — see FTR-B2C-004. **PARTIAL (2026-05-22)**: General inquiry buyer ack + admin alert runtime-verified in production (F1-P1B chain + `SOFT-LAUNCH-F1-P1B-RV-ADMIN-EMAIL-ENV-VERIFY`). Supplier-context notification path structurally implemented but NOT production runtime verified — see FTR-B2C-005. Full tenant inquiry inbox (dashboard route/UI) remains NOT_ASSESSED. Family assignment to be confirmed at first family selection. |
| PRIT-034 | MISSING-FAMILY-AND-FEATURE-SCAN.md (§6) — no /privacy page, no /terms page, no cookie consent stance, no DSAR path in repo; D-5 MVP-MUST-HAVES NOT_ASSESSED P1 | Legal content requires Paresh/counsel approval; no tech gate for front-end pages; GDPR/DPDP stance needed for any analytics tooling (PRIT-035) | NO (standalone pages) | YES — Paresh + counsel: legal content, DPDP/GDPR stance, cookie/analytics consent approach | MISSING-FAMILY-AND-FEATURE-SCAN.md | Confirm with Paresh before or at FAM-03 cycle opening; can be standalone unit. **PRODUCTION-LAUNCH-FOUNDATION (2026-05-22) — `PRODUCTION-INTENT-STAGED-ACTIVATION-GOVERNANCE-SYNC-001`**: Legal documentation must be designed as production-launch ready in content model, route architecture, naming, versioning, and legal scope (D-025). Staged activation allowed; design must be production-correct from the start. Next: `PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001` — architecture design artifact before legal content drafting or implementation. **DESIGN_ARTIFACT_CREATED (2026-05-22) — `PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001`**: Canonical source-of-truth model (git-tracked markdown in texqtic.com marketing repo), route architecture (texqtic.com/legal/* as canonical host; app.texqtic.com links out), legal page hierarchy (12 first-wave documents L-001–L-012; 7 activation-gated groups), versioning model, surface-to-document mapping, inquiry/email truth boundary, demo/QA data boundary, review dependencies, and implementation sequence (PRIT-034-002 through PRIT-034-006) defined. Next: `PRODUCTION-LAUNCH-LEGAL-CONTENT-DRAFT-PRIT-034-002`. PRIT-034 remains OPEN — advances to DESIGN_ARTIFACT_CREATED. |
| PRIT-035 | MISSING-FAMILY-AND-FEATURE-SCAN.md (§6) — no analytics service in repo; buyer_inquiry.created.v1 event defined but not emitted; no funnel tracking exists | Paresh must choose tooling; PRIT-034 (cookie consent stance) must be decided first if analytics captures PII | NO | YES — Paresh to decide tooling (GA4 / Mixpanel / Segment / PostHog / other) | MISSING-FAMILY-AND-FEATURE-SCAN.md | Confirm tooling with Paresh; infrastructure in FAM-10; event instrumentation in FAM-01/FAM-02/FAM-03 cycles |
| PRIT-036 | `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (HD-001-SMTP) + `SOFT-LAUNCH-RT4-D-FINAL-IMPLEMENTATION-PRIORITY-SYNTHESIS.md` (CU-02, T0-2, P0). email.service.ts code complete (G-012, nodemailer SMTP, generic — not Postmark-specific). All 4 SMTP env vars absent from Vercel production (confirmed 2026-05-20, HD-001-SMTP-INFRA-GAP-001). April 17, 2026 writeback stated Postmark was configured + SENT verified — STALE; discrepancy confirmed. Postmark external-recipient delivery was BLOCKED (provider review) as of Apr 17; current status unknown. | FTR-B2C-004 (PRIT-033) depends on SMTP being operational first. No code changes needed to unblock registered-user flows — ops-only action. | YES — email.service.ts, config/index.ts already inspected in SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN; no further source inspection needed | YES — Paresh must: (1) check Postmark account review status, (2) select provider (Postmark / Resend / SendGrid / SES), (3) set 4 Vercel production env vars | `SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN.md` | **RESOLVED (2026-05-22)** — Postmark selected as SMTP provider. SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_PORT set in Vercel production. DKIM and return-path verified. Production email delivery confirmed (general inquiry buyer ack + admin alert runtime-delivered) via `SOFT-LAUNCH-F1-P1B-RV-ADMIN-EMAIL-ENV-VERIFY`. Minimum inquiry notification loop partially implemented (FTR-B2C-004 PARTIAL). HD-001-SMTP CLOSED. No further ops action required. |
| PRIT-037 | DECISION-PARKING-LOT D-026 (PARKED — TRIGGER_CONDITIONS_NOT_MET) | All four D-026 trigger gates pending: (1) real supplier/product data readiness; (2) FTR-B2C-005 supplier-context inquiry notification readiness; (3) PRIT-034 legal/privacy/terms bundle deployed or accepted for launch scope; (4) explicit Paresh approval. | NO — governance gate only | YES — D-026; Paresh decision required | DECISION-PARKING-LOT.md (D-026) | No implementation until all four D-026 trigger conditions clear and Paresh explicitly approves buyer bridge activation. Reference previews remain preview-only. |
| PRIT-038 | Paresh session direction: ONDC/GeM as Pillar 7 of 7 (was absent from prior 7-Pillars document provided for PRIT-022–027 intake). ONDC/GeM Commerce Rail. | ONDC/GeM integration design required (API spec, regulatory compliance, onboarding protocol, product catalog mapping to ONDC taxonomy); real pilot transaction data required; FAM-12 E2E RFQ (G-022 decision) is a prerequisite for ONDC-adjacent commerce flows. | YES — family opening audit required | YES — Paresh to decide: ONDC vs GeM priority; integration model; seller onboarding path; new FAM-25 or extension under FAM-12/FAM-15 | PLANNED-REQUIREMENTS-INTAKE.md | No implementation until post-MVP design gate opens and Paresh authorizes. Register acknowledged. |

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
| PRIT-032 | TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 (Paresh session decision 2026-07-14) | P2 / PILOT_REQUIRED confirmed |
| — | TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001 (Decision B) | Soft-launch context confirmed: P2 / not a soft-launch blocker; cart surface must remain inaccessible to buyers during soft launch; governance family assignment required at first cycle selection |
| PRIT-033 | TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 (Paresh session decision 2026-07-14) | MVP_CRITICAL / P1 confirmed; minimum inquiry notification scope included |
| — | TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001 (Decision C) | Soft-launch context confirmed: FTR-B2C-004 (minimum notification loop) is a hard soft-launch blocker before buyer outreach; full tenant dashboard inquiry inbox is P1 for hard launch |
| PRIT-034 | TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 (Paresh session decision 2026-07-14) | MVP_CRITICAL / P1 confirmed |
| — | TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001 (Decision D) | Soft-launch context confirmed: legal pages bundle is a hard prerequisite before any public buyer or supplier data collection; standalone unit may proceed before FAM-06 |
| — | PRODUCTION-INTENT-STAGED-ACTIVATION-GOVERNANCE-SYNC-001 (Paresh authorized, 2026-05-22) | Production-launch architecture framing confirmed: legal documentation must be designed production-launch ready in content model, route architecture, naming, versioning, and legal scope (D-025). Staged activation allowed; design must be production-correct from the start. Next design artifact: PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001. |
| — | PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001 (design artifact created, 2026-05-22) | Architecture design artifact created. Canonical source-of-truth: git-tracked markdown in texqtic.com marketing repo. Route architecture: texqtic.com/legal/* as canonical host; app.texqtic.com links out. Legal page hierarchy: 12 first-wave documents (L-001–L-012); 7 activation-gated groups. Versioning model, surface-to-document mapping, inquiry/email truth boundary, demo/QA data boundary, review dependencies, and implementation sequence (PRIT-034-002 through PRIT-034-006) defined. PRIT-034 remains OPEN — advances from DESIGN_REQUIRED to DESIGN_ARTIFACT_CREATED. Next: PRODUCTION-LAUNCH-LEGAL-CONTENT-DRAFT-PRIT-034-002. |
| PRIT-035 | TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 (Paresh session decision 2026-07-14) | P2 / PILOT_REQUIRED confirmed |
| — | TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001 (Decision E) | Soft-launch context confirmed: not a first-cohort blocker (5–10 suppliers); required before broad soft-launch outreach; PRIT-034 cookie/consent stance must be decided first |

**Classification confirmation note:** `PARESH_CONFIRMED` in this context means "the item is
confirmed as a requirement that must be addressed." It does NOT mean the specific implementation
scope, design, or MVP classification within the family cycle is confirmed. Those must be
confirmed at each family cycle opening gate.

---

## §7 Unconfirmed Planned Requirements

**✅ PRIT-011 THROUGH PRIT-019 CONFIRMED via TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 (2026-05-19)**

All items previously listed as UNCONFIRMED have been reviewed and Paresh decisions recorded.
See §14 for the full decision table. Summary:

| PRIT ID | Decision | Revised Status |
|---|---|---|
| PRIT-011 | Confirmed MVP_CRITICAL/P1; small privacy notice required before pilot go-live | PARESH_CONFIRMED |
| PRIT-012 | Confirmed MVP_CRITICAL/P1; simplified pilot supplier agreement acceptable first | PARESH_CONFIRMED |
| PRIT-013 | Confirmed MVP_CRITICAL/P1; Sentry or equivalent required before pilot | PARESH_CONFIRMED |
| PRIT-014 | Confirmed PILOT_REQUIRED/P2; pilot load profile 30–50 suppliers, 10–20 concurrent | PARESH_CONFIRMED |
| PRIT-015 | Confirmed MVP_CRITICAL/P1; format: Vercel + Supabase rollback runbook | PARESH_CONFIRMED |
| PRIT-016 | Confirmed LAUNCH_DEPENDENCY/P1; canonical target PENDING_PARESH_DECISION (D-005 still PARKED) | PARESH_CONFIRMED |
| PRIT-017 | Deferred; G-022 decision remains HOLD_FOR_PARESH_DECISION; D-007 still PARKED | DEFERRED |
| PRIT-018 | Confirmed POST_MVP; pilot can launch free/manual; commercial packaging not required for MVP | POST_MVP_CONFIRMED |
| PRIT-019 | Confirmed opt-in only during pilot; no default indexing of supplier profiles; policy direction partial | PARESH_CONFIRMED |

**No UNCONFIRMED items remain in PRIT-011–019.** Next available PRIT ID: PRIT-039 (PRIT-038 added by MAJOR-AUDIT-JULY-LAUNCH-READINESS-PLAN-HOLD-CLEARANCE-AND-FAMILY-REGISTRY-01, 2026-06-11).

> **✅ PRIT-032 THROUGH PRIT-035 ADDED VIA TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001 (2026-07-14)**
>
> Four new planned requirements were added from the missing-family-and-feature scan unit.
> PRIT-032 records the cart-as-intent buyer surface (code exists in repo without governance).
> PRIT-033 records the supplier inquiry response workflow / tenant dashboard inquiry inbox
> (entirely missing from repo and all registers). PRIT-034 records the public legal pages
> bundle (privacy policy page, terms page, cookie/analytics consent stance, DSAR path).
> PRIT-035 records the product analytics and funnel tracking infrastructure (no analytics
> service in repo). All four require Paresh confirmation before family cycle assignment.
> Next available PRIT ID: PRIT-036.
>
> **✅ PRIT-036 ADDED VIA SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN (2026-07-14)**
>
> PRIT-036 records the SMTP provider selection and Vercel production environment configuration
> requirement (CU-02, T0-2 P0 per RT4-D synthesis). `email.service.ts` code is complete and
> correct (G-012, nodemailer SMTP, generic — not Postmark-specific). All four SMTP env vars
> (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) are absent from Vercel production
> (HD-001-SMTP-INFRA-GAP-001, confirmed 2026-05-20). Postmark was the provider as of April 17,
> 2026 writeback (owned-domain SENT verified; external-recipient delivery BLOCKED by provider
> review). April 17 evidence is STALE — requires re-verification. Current Postmark account review
> status unknown. No source changes needed to unblock registered-user email flows — this is a
> Paresh ops action only. FTR-B2C-004 public inquiry notification loop requires a separate governed
> unit. Next available PRIT ID: PRIT-037.
>
> **✅ PRIT-036 RESOLVED VIA SOFT-LAUNCH-F1-P1A-SMTP-POSTMARK-OPS-RUNTIME-VERIFY (2026-05-22)**
>
> Postmark confirmed as SMTP provider. All 4 env vars (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`,
> `SMTP_FROM`) confirmed set and masked in Vercel production. DKIM and return-path verified.
> Production email delivery confirmed: general inquiry buyer acknowledgement and admin alert emails
> both runtime-delivered. HD-001-SMTP CLOSED. FTR-B2C-004 minimum notification loop partially
> implemented (buyer ack + admin alert production-verified; supplier-context path structurally
> implemented but not production runtime verified — see FTR-B2C-005). PRIT-036 status: RESOLVED.
>
> **✅ PRIT-037 ADDED VIA TLRH-PRIT037-BUYER-BRIDGE-REQ-SYNC-003D (2026-05-25)**
>
> PRIT-037 records the buyer bridge from reference preview activation gate. Static app-side
> reference previews and Marketing preview routing are production accepted through Unit 053
> but remain preview-only. Buyer bridge activation is blocked pending all four D-026 trigger
> conditions: (1) real supplier/product data readiness; (2) FTR-B2C-005 supplier-context
> inquiry notification readiness; (3) PRIT-034 legal/privacy/terms bundle deployed or accepted
> for launch scope; (4) explicit Paresh written approval. No implementation authorized.
> Reference previews remain preview-only. No commercial supply implied.
> Next available PRIT ID: PRIT-039. (PRIT-038 registered 2026-06-11 via MAJOR-AUDIT-JULY-LAUNCH-READINESS-PLAN-HOLD-CLEARANCE-AND-FAMILY-REGISTRY-01; corrected 2026-06-11 by GOV-ADJACENT-FINDINGS-RULE-AND-WAVE1D-POINTER-SYNC-01.)
>
> **✅ PRIT-038 ADDED VIA MAJOR-AUDIT-JULY-LAUNCH-READINESS-PLAN-HOLD-CLEARANCE-AND-FAMILY-REGISTRY-01 (2026-06-11)**
>
> PRIT-038 registers ONDC / GeM Commerce Rail as Pillar 7 of the TexQtic 7 Pillars strategic
> roadmap. Pillar 7 was absent from the prior Paresh-provided 7-Pillars document that produced
> PRIT-024 through PRIT-027. Paresh confirmed ONDC/GeM as Pillar 7 in the July launch-readiness
> audit session. Classification: POST_MVP / P3 / PARESH_CONFIRMED_AS_PLANNED / USER_PLANNED_ONLY.
> No family cycle opened. Proposed family: new FAM-25 or extension under FAM-12/FAM-15; Paresh
> to decide at PRIT-038 family opening audit. No implementation until post-MVP design gate opens
> and Paresh authorizes. Next available PRIT ID: PRIT-039.
>
> **✅ PRIT-028 THROUGH PRIT-031 ADDED VIA TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001 (2026-05-19)**
>
> Four new planned requirements were added from the commerce/subscription/payments methodology
> design unit. PRIT-028 records the subscription tier entitlement model (FAM-11, POST_MVP
> self-serve; FREE at pilot per PRIT-018). PRIT-029 records the Razorpay/payment gateway
> methodology (DESIGN_GATED; all prerequisites in methodology §4.3 must be satisfied first).
> PRIT-030 records the B2B no-platform-financial-transaction guardrail as a CONFIRMED_BOUNDARY
> (constitutional; no-money-movement policy confirmed). PRIT-031 records the commission/
> deduction policy (DESIGN_GATED; D-013/D-014 must resolve first).
>
> See §15 for the full commerce/subscription/payments methodology section.
>

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
> Next available PRIT ID: PRIT-036.

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
| PRIT-011 | Privacy/consent for inquiry form | MVP_CRITICAL | ✅ CONFIRMED — TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 (2026-05-19) |
| PRIT-012 | Supplier ToS/platform agreement | MVP_CRITICAL | ✅ CONFIRMED — TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 (2026-05-19) |
| PRIT-013 | Error monitoring/alerting | MVP_CRITICAL | ✅ CONFIRMED — TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 (2026-05-19) |
| PRIT-014 | Performance/load testing | PILOT_REQUIRED | ✅ CONFIRMED — TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 (2026-05-19) |
| PRIT-015 | Rollback procedure documentation | MVP_CRITICAL | ✅ CONFIRMED — TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 (2026-05-19) |
| PRIT-016 | SEO canonical domain strategy | LAUNCH_DEPENDENCY | ✅ CONFIRMED as LAUNCH_DEPENDENCY — canonical domain target still PENDING_PARESH_DECISION; D-005 remains PARKED |
| PRIT-017 | G-022 maker-checker decision | LAUNCH_DEPENDENCY | ✅ DEFERRED — G-022 HOLD_FOR_PARESH_DECISION unchanged; no FAM-13 cycle opened |
| PRIT-018 | Commercial packaging tier decision | POST_MVP | ✅ CONFIRMED POST_MVP — pilot launches free/manual; commercial packaging not required for MVP |
| PRIT-019 | Supplier profile indexability policy | LAUNCH_DEPENDENCY | ✅ CONFIRMED — opt-in only during Surat pilot; no default indexing; policy direction partial; D-010 remains PARKED |

> **All PRIT-011–019 decisions recorded in `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` (2026-05-19).**
> No further Paresh action required on these rows at this stage.
> PRIT-016 canonical domain target and PRIT-017 G-022 design remain pending Paresh decision
> but are now formally classified and tracked.

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
| 14 | Seventh Pillar absence noted; PRIT-038 now registered via July audit | ✅ §13.6 (absence noted) + PRIT-038 registered 2026-06-11 via MAJOR-AUDIT-JULY-LAUNCH-READINESS-PLAN-HOLD-CLEARANCE-AND-FAMILY-REGISTRY-01 |
| 15 | PRIT-011–019 Paresh decisions recorded in §14 | ✅ COMPLETE — TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |
| 16 | PRIT-022–027 reviewed; accepted as planned features; DESIGN_GATED retained | ✅ COMPLETE — §14.3 |
| 17 | No family cycle opened by this review unit | ✅ CONFIRMED — §14.5 |
| 18 | PRIT-017 deferred; G-022 hold unchanged | ✅ CONFIRMED — §14.2 |
| 19 | PRIT-018 confirmed POST_MVP; commercial packaging not required at MVP | ✅ CONFIRMED — §14.2 |
| 20 | PRIT-028–031 added from TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001 | ✅ COMPLETE — §15 |
| 21 | PRIT-030 confirmed as CONFIRMED_BOUNDARY (B2B no-money-movement guardrail) | ✅ CONFIRMED — §15.2 |
| 22 | PRIT-029, PRIT-031 recorded as DESIGN_GATED pending parked decisions D-011 through D-015 | ✅ CONFIRMED — §15.3 |
| 23 | Commerce methodology document created: COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md | ✅ CONFIRMED — see TLRH |
| 24 | No implementation authorized by §15 or methodology document | ✅ CONFIRMED — planning only |
| 25 | PRIT-037 added: buyer bridge from reference preview activation gate (OPEN, P1 provisional); linked to D-026 (PARKED — TRIGGER_CONDITIONS_NOT_MET); no implementation authorized | ✅ COMPLETE — TLRH-PRIT037-BUYER-BRIDGE-REQ-SYNC-003D |
| 26 | PRIT-038 added: ONDC/GeM Commerce Rail (Pillar 7); POST_MVP/P3; PARESH_CONFIRMED_AS_PLANNED; no family cycle opened | ✅ COMPLETE — MAJOR-AUDIT-JULY-LAUNCH-READINESS-PLAN-HOLD-CLEARANCE-AND-FAMILY-REGISTRY-01 (2026-06-11) |

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
| 2026-05-19 | TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 | PRIT-011–019 Paresh decisions recorded; PRIT-022–027 reviewed as accepted planned features (DESIGN_GATED retained); §7 updated; §10 updated; §11 checklist rows 15–19 added; §14 review section added |
| 2026-05-19 | TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001 | PRIT-028–031 added from commerce/subscription/payments methodology design; §5A and §5B table updated; §7 updated (next PRIT ID: PRIT-032); §11 checklist rows 20–24 added; §15 section added |
| 2026-07-14 | TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 | PRIT-032–035 Paresh decisions confirmed; Part B launch classes updated from GOVERNANCE_CLAIM_ONLY to confirmed classes; PRIT-033 cross-referenced to minimum inquiry notification scope (FTR-B2C-004) |
| 2026-05-19 | TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001 | §6 PRIT-032–035 confirmation rows extended with soft-launch strategic context (Decisions B–E): PRIT-032 P2/not-soft-launch-blocker; PRIT-033 FTR-B2C-004 hard soft-launch blocker before buyer outreach; PRIT-034 hard prerequisite before data collection; PRIT-035 P2/not-first-cohort-blocker |
| 2026-07-14 | SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN | PRIT-036 added: SMTP provider selection and Vercel production env configuration (CU-02, T0-2 P0). email.service.ts code complete (G-012); all SMTP env vars absent from Vercel production (HD-001-SMTP-INFRA-GAP-001, confirmed 2026-05-20). Postmark was prior provider (April 17, 2026 writeback, stale). PRIT-036 is LAUNCH_BLOCKER P0 / PARESH_DECISION_REQUIRED. Next available PRIT ID updated to PRIT-037. |
| 2026-05-22 | TLRH-EMAIL-IMPLEMENTATION-SYNC-001 | PRIT-036 resolved: Postmark SMTP operational in production; DKIM verified; buyer ack + admin alert runtime-delivered. PRIT-036 status updated → RESOLVED in §5A and §5B. PRIT-033 §5B next action updated to reflect minimum notification loop partially implemented (buyer ack + admin alert done; supplier-context pending). §7 resolved note added. |
| 2026-05-22 | PRODUCTION-INTENT-STAGED-ACTIVATION-GOVERNANCE-SYNC-001 | PRIT-034 §5B Next Action updated: production-launch architecture framing confirmed; legal documentation must be designed production-launch ready from the start (D-025). §6 confirmation row added for PRIT-034. Next design artifact: PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001. |
| 2026-05-22 | PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001 | PRIT-034 §5B Next Action updated: design artifact created; source-of-truth model, route architecture, legal page hierarchy, versioning, surface mapping, review dependencies, and implementation sequence defined. §6 confirmation row added. PRIT-034 remains OPEN — advances to DESIGN_ARTIFACT_CREATED. Next: PRODUCTION-LAUNCH-LEGAL-CONTENT-DRAFT-PRIT-034-002. |
| 2026-05-25 | TLRH-PRIT037-BUYER-BRIDGE-REQ-SYNC-003D | PRIT-037 added: Buyer bridge from reference preview activation gate (OPEN, P1 provisional). Linked to DECISION-PARKING-LOT D-026 (PARKED — TRIGGER_CONDITIONS_NOT_MET). Reference previews remain preview-only; all four D-026 trigger conditions pending; no buyer inquiry path active; no commercial supply implied. Next available PRIT ID: PRIT-038. |

---

## §14 Planned Requirements Intake Review — TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001

**Unit:** `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001`
**Review Date:** 2026-05-19
**Authorized by:** Paresh Patel
**Layer 0 posture:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` — UNCHANGED

---

### §14.1 Review Summary

This section records Paresh's explicit decisions on PRIT-011 through PRIT-019 (previously
UNCONFIRMED) and the acceptance review of PRIT-022 through PRIT-027 (Paresh-planned features).

**Review scope:**
- PRIT-011–019: All 9 items reviewed; decisions recorded below.
- PRIT-022–027: All 6 items reviewed; accepted as planned features; classifications retained.
- No implementation authorized by this review.
- No family cycle opened by this review.
- Layer 0 posture unchanged.

**Paresh decision basis:** Explicit decisions provided in `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` unit prompt (2026-05-19).

---

### §14.2 PRIT-011–019 Decision Table

| PRIT ID | Title | Original Prov. Class | Paresh Decision | Revised Class | Notes | Destination Family |
|---|---|---|---|---|---|---|
| PRIT-011 | Privacy/consent notice for public inquiry form | MVP_CRITICAL (provisional) | **CONFIRMED MVP_CRITICAL/P1** | MVP_CRITICAL | Small privacy/consent notice required before pilot go-live; basic notice acceptable initially; may require counsel review for wording | FAM-03 |
| PRIT-012 | Supplier ToS / platform agreement acceptance flow | MVP_CRITICAL (provisional) | **CONFIRMED MVP_CRITICAL/P1** | MVP_CRITICAL | Simplified pilot supplier agreement acceptable as first iteration; formal ToS review may follow post-pilot | FAM-07 |
| PRIT-013 | Error monitoring and alerting setup | MVP_CRITICAL (provisional) | **CONFIRMED MVP_CRITICAL/P1** | MVP_CRITICAL | Sentry or equivalent required before pilot go-live; tooling choice confirmed acceptable at family cycle | FAM-10 |
| PRIT-014 | Performance budget / load testing before pilot go-live | PILOT_REQUIRED (provisional) | **CONFIRMED PILOT_REQUIRED/P2** | PILOT_REQUIRED | Load test profile confirmed: 30–50 Surat pilot suppliers, 10–20 concurrent sessions baseline | FAM-10 |
| PRIT-015 | Rollback procedure documentation | MVP_CRITICAL (provisional) | **CONFIRMED MVP_CRITICAL/P1** | MVP_CRITICAL | Format confirmed: Vercel + Supabase rollback runbook; feature-flag rollback path included | FAM-10 |
| PRIT-016 | SEO domain canonical strategy decision | LAUNCH_DEPENDENCY | **CONFIRMED LAUNCH_DEPENDENCY/P1** | LAUNCH_DEPENDENCY | Confirmed as launch dependency; canonical domain target PENDING_PARESH_DECISION; D-005 remains PARKED until target decided; must decide before backlinks, press, or GSC submission | FAM-04 |
| PRIT-017 | G-022 maker-checker decision for award flow | LAUNCH_DEPENDENCY | **DEFERRED** | LAUNCH_DEPENDENCY | G-022 HOLD_FOR_PARESH_DECISION UNCHANGED per BLOCKED.md; two-call split design exists but Paresh decision not yet given; D-007 remains PARKED; no FAM-13 cycle opened | FAM-13 |
| PRIT-018 | Subscription / commercial packaging tier decision | POST_MVP (provisional) | **CONFIRMED POST_MVP/P3** | POST_MVP | Pilot can launch free/manual provisioning; self-serve commercial packaging not required for MVP; D-008 status remains PARKED (pending pilot data); commercial experiment after Surat proof pack | FAM-11 |
| PRIT-019 | Supplier profile publication and indexability policy | LAUNCH_DEPENDENCY | **CONFIRMED LAUNCH_DEPENDENCY/P2** | LAUNCH_DEPENDENCY | Policy direction confirmed: opt-in only during Surat pilot; no default indexing of supplier profiles; policy partial — full supplier consent policy still pending; D-010 remains PARKED | FAM-09 |

**Evidence level for all PRIT-011–019 decisions:** `PARESH_EXPLICIT_DECISION` — decisions provided by Paresh in unit prompt for `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001`.

---

### §14.3 PRIT-022–027 Review Table

| PRIT ID | Title | Accepted as Planned Feature | Classification Retained | Implementation-Ready | Family Cycle Opened | Next Action |
|---|---|---|---|---|---|---|
| PRIT-022 | PWA installability and offline shell strategy | YES | P2_PILOT_ENABLER / DESIGN_GATED | NO | NO | Keep DESIGN_GATED; open FAM-10 cycle when Layer 0 releases and FAM-10 is sequenced |
| PRIT-023 | TexQtic CoWorker / AI Workbench foundation | YES | POST_MVP / DESIGN_GATED | NO | NO | Keep DESIGN_GATED; open FAM-19 cycle post-MVP when Layer 0 and dependency chain allow |
| PRIT-024 | China+1 Discovery Engine / RFQ matching strategy | YES | POST_MVP / DESIGN_GATED | NO | NO | Keep DESIGN_GATED; relates to FAM-12; requires FAM-12 E2E complete as prerequisite |
| PRIT-025 | AI Pricing Oracle | YES | POST_MVP / DESIGN_GATED | NO | NO | Keep DESIGN_GATED; hard data dependency — requires real platform transaction data before design |
| PRIT-026 | Collective Sustainability Certification Pool | YES | POST_MVP / DESIGN_GATED | NO | NO | Keep DESIGN_GATED; depends on FAM-05 DPP decision and FAM-09 supplier profile work |
| PRIT-027 | Artisan IP and Heritage Commerce Layer | YES | POST_MVP / DESIGN_GATED | NO | NO | Keep DESIGN_GATED; relates to FAM-02 and FAM-17; post-MVP sequencing |

**Summary:** All 6 planned feature rows accepted as-is. No classification changes. No family cycles opened. All remain `PARESH_CONFIRMED_AS_PLANNED` / `DESIGN_GATED`. These rows do not alter MVP launch readiness.

---

### §14.4 Pillar 7 Note

**Pillar 7 of the TexQtic 7 Pillars was not present in the planned-feature document provided to this review unit.** No PRIT row exists for Pillar 7. No PRIT-028 was created in this review. Paresh should define Pillar 7 and submit it for intake when ready. The next available PRIT ID remains PRIT-028.

---

### §14.5 No Family Cycle Opened

This review unit did NOT open any family implementation cycle. Decisions recorded here:
- Confirm item classifications for future use at family cycle opening gates
- Do NOT authorize any implementation work
- Do NOT change the `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` Layer 0 posture
- Do NOT constitute a family opening audit gate

**Every family listed in this intake queue still requires the Family Opening Audit Gate** (defined in `TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001`) before any family-local work begins.

---

### §14.6 Family Opening Audit Gate Reminder

Per `TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001`, before any family implementation cycle opens:
1. A family-local repo-truth audit must be performed.
2. The audit unit must be created and committed.
3. Paresh must explicitly authorize the family cycle opening.

This applies to all families referenced by PRIT-011–027, regardless of their confirmed classification in this review.

---

### §14.7 PRIT-022–027 Do Not Alter MVP Launch Readiness

None of PRIT-022 through PRIT-027 carry P0, P1, MVP_CRITICAL, or LAUNCH_BLOCKER classification. Their acceptance as planned features has no effect on the MVP launch critical path. MVP launch readiness is governed by PRIT-001–019 and the P0 family audit gates.

---

### §14.8 CRM and CAE Handling

- PRIT-020 (CRM provisioning handoff / WEBHOOK-007): NOT reviewed in this unit; XDEP_ONLY posture unchanged.
- PRIT-021 (CAE → CRM → Platform chain): NOT reviewed in this unit; XDEP_ONLY posture unchanged.
- No CRM or CAE feature inventories are created or modified by this review.
- No duplication risk with CRM/CAE governance.

---

### §14.9 No Implementation Performed

This review is governance-only. Confirming:
- No code changes made
- No schema changes made
- No migration files created
- No route or API contract changes made
- No event contract changes made
- No OpenAPI contract changes made
- No family audit performed
- No runtime files staged or committed

---

## §15 Commerce, Subscription, and Payments Methodology — TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001

**Unit:** `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001`
**Date:** 2026-05-19
**Layer 0 posture at authoring:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` — UNCHANGED
**Methodology document:** `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md`

---

### §15.1 Overview

This section records the addition of PRIT-028 through PRIT-031, derived from the commerce,
subscription, and payments methodology design unit. These four new rows capture the planned
requirements and confirmed guardrails established by the methodology document.

---

### §15.2 PRIT-028 — Subscription Tier Entitlement Model

- **Confirmed decision (PRIT-018 cross-ref):** MVP pilot will use FREE tier, operator-provisioned
  via control-plane admin flow. No self-serve subscription billing at pilot.
- **Self-serve tier entitlement:** POST_MVP. Requires D-011 (tier pricing + billing cycle) to
  resolve, plus counsel/CA review for India SaaS GST treatment and Razorpay KYC.
- **Plan tier infrastructure:** Already exists (FREE/STARTER/PROFESSIONAL/ENTERPRISE) from
  Subscription Slice 4A (2026-04-15). Entitlement enforcement per-tier is NOT yet implemented.
- **FAM-11 impact:** FAM-11 family cycle must implement minimum commercial gating for pilot
  (FREE tier, operator-assigned). Self-serve billing and upgrade flows are OUT OF SCOPE for FAM-11
  pilot cycle unless Paresh explicitly authorizes post-MVP scope expansion.

---

### §15.3 PRIT-029 — Razorpay/Payment Gateway Methodology

- **Current status:** No Razorpay or payment gateway integration exists anywhere in the platform.
- **Candidate use cases (all DESIGN_GATED):** B2C checkout, D2C checkout, platform subscription
  billing (self-serve), B2B TTP-gated flow.
- **Prerequisites:** All seven prerequisites in methodology §4.3 must be satisfied before any
  gateway integration. These include merchant-of-record decision (D-012), settlement model,
  counsel/CA review, refund/cancellation policy, audit/logging requirements, PCI boundary
  awareness, and Razorpay merchant account KYC.
- **Implementation freeze:** No payment gateway SDK, API, webhook, or callback may be added
  to any TexQtic service until Paresh authorizes and all §4.3 prerequisites are satisfied.

---

### §15.4 PRIT-030 — B2B No-Platform-Financial-Transaction Boundary (Guardrail)

- **Status:** CONFIRMED_BOUNDARY (constitutional). No Paresh decision required — the boundary
  is already confirmed by the no-money-movement policy in governance/control/NEXT-ACTION.md.
- **What is confirmed:** TexQtic does not handle B2B financial transactions in MVP. No platform
  escrow, no collecting buyer payment for supplier, no auto-commission deduction from B2B
  transactions, no financial/lending/credit services.
- **Path to B2B transaction enablement:** TTP legal gate must clear first (FAM-16); then TTP-
  LEGAL-COUNSEL-FEEDBACK-RECORD-001 recorded; then Paresh authorization; then FAM-16 cycle.
- **Enforcement:** All B2B family cycles (FAM-12, FAM-13, FAM-14, FAM-15, FAM-16) must record
  compliance with this guardrail in their opening section.

---

### §15.5 PRIT-031 — Commission/Deduction Methodology

- **Current status:** No commission policy exists for any TexQtic commerce surface.
- **B2B:** No B2B transaction commission relevant in MVP (per PRIT-030 guardrail).
- **B2C/D2C:** Commission model fully parked until D-012 (merchant-of-record) resolves.
  A referral/platform model requires a different commission structure than a merchant-of-record
  model. Both D-013 (B2C commission) and D-014 (D2C commission) are PARKED.
- **Implementation freeze:** No commission calculation, deduction timing, or payout waterfall
  may be implemented until D-013/D-014 resolve and Paresh authorizes.

---

### §15.6 Commerce Methodology Parked Decisions Added to DECISION-PARKING-LOT.md

| Decision ID | Topic | Status |
|---|---|---|
| D-011 | Subscription tier pricing, entitlement model, self-serve billing | PARKED |
| D-012 | B2C/D2C merchant-of-record and settlement model | PARKED |
| D-013 | B2C commission/deduction policy | PARKED |
| D-014 | D2C commission/deduction policy | PARKED |
| D-015 | Razorpay/payment gateway platform adoption decision | PARKED |

---

### §15.7 No Implementation Performed

This section is governance-only. Confirming:
- No code changes made
- No schema changes made
- No migration files created
- No route or API contract changes made
- No event contract changes made
- No OpenAPI contract changes made
- No family audit performed
- No payment gateway integration started
- No runtime files staged or committed
