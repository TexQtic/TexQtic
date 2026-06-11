# MAJOR-AUDIT-JULY-LAUNCH-READINESS-PLAN-HOLD-CLEARANCE-AND-FAMILY-REGISTRY-01

**Unit type:** Major Audit + Hold Map + Family Registry  
**Date:** 2026-06-11  
**Branch:** `main` — HEAD `8088737a`  
**Staged change at open:** `M governance/launch-readiness/FUTURE-TODO-REGISTER.md` (FTR-SL-003 PARTIAL→RUNTIME_VERIFIED; FTR-FAM-003 PARTIAL→VERIFIED_COMPLETE — carried forward from AUDIT-TLRH-DETERMINE-NEXT-LAUNCH-READINESS-FAMILY-01)  
**Author:** Copilot (read-only audit + report; tracker edits governed below)  
**Final enum target:** `MAJOR_AUDIT_JULY_LAUNCH_READINESS_PLAN_HOLD_CLEARANCE_AND_FAMILY_REGISTRY_COMPLETE_READY_FOR_PARESH_DECISION`

---

## §1 Business Direction Inputs (Paresh — session)

The following business direction statements were provided by Paresh as inputs to this audit. These are recorded here verbatim as authoritative context; they do NOT constitute governed implementation decisions until Paresh signs off on specific family cycles.

| # | Statement | Governance Impact |
|---|---|---|
| 1 | **Launch target: July 20–30** | All P0/P1 items must be scoped to this window; anything not achievable must be explicitly deferred |
| 2 | **D2C = "coming soon" — deferred post-MVP** | D2C storefront (FAM-02 stub posture) confirmed; no D2C activation for July launch |
| 3 | **Subscription payments ENABLED for launch** | Razorpay subscription checkout is a July target subject to legal approval; FTU-COMM-002A design unit authorized by Paresh (D12A confirmed) |
| 4 | **Trade payments NOT guaranteed** | TexQtic Trust Pay / embedded trade finance is POST_MVP; FAM-16/D-002 hold maintained; PRIT-030 B2B no-money-movement guardrail CONFIRMED |
| 5 | **Legal approval expected in a few days** | Counsel feedback on TTP packet and legal page review expected imminently; triggers FTR-LEGAL-003C publication unit |
| 6 | **Non-legal holds: investigate and clear where possible** | FTR-OPS-001/003, FTR-ACQ-001, Layer 0 stale pointers — evaluate and recommend clearance path |
| 7 | **ONDC/GeM added as Pillar 7** | PRIT-038 must be registered (was absent from prior intake); ONDC/GeM Commerce Rail |
| 8 | **TexQticScore name (not TexScore)** | "TexScore" is an outdated term; canonical name = "TexQticScore"; governance docs must use this |
| 9 | **TexCredit/embedded finance merges into TTP naming** | TexCredit = part of TexQtic Trust Pay / TexCredit / TexQticScore pillar; no separate product family unless Paresh decides otherwise |

---

## §2 Repo Preflight (Audit Basis)

| Check | Result |
|---|---|
| Branch | `main` |
| HEAD at audit open | `8088737a` |
| Staged changes | `M governance/launch-readiness/FUTURE-TODO-REGISTER.md` (prior session staged correction — inspected, valid, pending commit) |
| Local = origin | YES (confirmed at prior session) |
| Unexpected modified files | NONE |

---

## §3 FUTURE-TODO-REGISTER.md Staged Change — Inspection and Disposition

**What is staged:** Two status corrections from AUDIT-TLRH-DETERMINE-NEXT-LAUNCH-READINESS-FAMILY-01:
- `FTR-SL-003`: `PARTIAL` → `RUNTIME_VERIFIED` (supplier-context notification path runtime-verified via FTR-B2C-005B, 2026-06-11)
- `FTR-FAM-003`: `PARTIAL` → `VERIFIED_COMPLETE` (sole gate FTR-B2C-005 now RUNTIME_VERIFIED)
- Header `Last updated` field updated with audit unit reference

**Inspection outcome:** VALID. Both corrections are supported by the FTR-B2C-005B evidence already recorded in the register. The staged change is a docs-only correction with zero implementation scope. No side effects detected.

**Disposition recommendation:** Include in this audit's commit. Commit message: `[TEXQTIC] docs(launch): audit July launch readiness holds and family registry`

---

## §4 Family Status Matrix — Current Repo Truth

Based on full read of `LAUNCH-FAMILY-INDEX.md` (post-FAM-11F, 2026-06-04):

| Family | Title | Status | Class | Priority | Key Blocker / Note |
|---|---|---|---|---|---|
| FAM-01 | Buyer Discovery and Public Catalog | VERIFIED_COMPLETE | MVP_CRITICAL | P0 | B2BDiscoveryPage + B2CBrowsePage production verified |
| FAM-02 | D2C Collections and Storefront | VERIFIED_COMPLETE | MVP_CRITICAL | P0 | PublicCollectionsStub/Unavailable/Detail in repo; stub posture confirmed |
| FAM-03 | Public Inquiry Submission | VERIFIED_COMPLETE | MVP_CRITICAL | P0 | Inquiry flow runtime-verified; PRIT-033 Stage 2 (supplier inbox) not in this family |
| FAM-04 | SEO and Public Discoverability | VERIFIED_COMPLETE | MVP_CRITICAL | P0 | FTR-SEO-002/003/008/009 open as overlays; canonical domain D-005 still PARKED |
| FAM-05 | DPP Passport | PARKED_DECISION | PARKED | P2 | PRODUCTION_READY; D-001 HOLD_FOR_PARESH_DECISION; conditionally rendered |
| FAM-06 | Auth and Session Management | VERIFIED_COMPLETE | LAUNCH_BLOCKER | P0 | Full family cycle complete; FTR-AUTH-003 follow-up open (recrawl verification) |
| FAM-07 | Tenant Onboarding and Invite | PARTIALLY_IMPLEMENTED | LAUNCH_BLOCKER | P0 | HOLD_FOR_HUMAN_LEGAL_INPUTS (L13A); 8 exit criteria; legal_approved_transition_allowed=false |
| FAM-08 | Tenant Core Workspace | CLOSE_READY_WITH_RESIDUALS | LAUNCH_BLOCKER | P0 | QD-6 (supplier_quotes disabled) + FE-10 gated; FTR-SL-004 inquiry inbox candidate |
| FAM-09 | Supplier Profile and Catalog | CLOSE_READY_WITH_LAUNCH_TEST_RESIDUALS | LAUNCH_BLOCKER | P0 | GATE-SL-05 through GATE-SL-09 MET; invite delivery confirmation pending (Shraddha) |
| FAM-10 | Platform Ops and Control Plane | VERIFIED_COMPLETE | LAUNCH_BLOCKER | P0 | FTR-OPS-001 IMPL_COMPLETE/VERIFICATION_PENDING; FTR-OPS-003 NOT_ASSESSED |
| FAM-11 | Subscription and Commercial Gating | VERIFIED_COMPLETE | P1_MVP_MUST_HAVE | P1 | Display-only verified; no Razorpay; FTU-COMM-002A design gate OPEN (Paresh authorized) |
| FAM-12 | Network Commerce — RFQ/Pools/Award | PARTIALLY_IMPLEMENTED | PILOT_REQUIRED | P2 | G-022 DESIGN_COMPLETE/HOLD_FOR_PARESH_DECISION; blocked by FAM-13 |
| FAM-13 | Network Commerce — Award Maker-Checker | DESIGN_GATED | DESIGN_COMPLETE_BLOCKED | P2 | G-022 decision HOLD_FOR_PARESH_DECISION |
| FAM-14 | Supplier Quotes Module | BLOCKED | CONFIG_ONLY | P2 | QD-6 hold (supplier_quotes.enabled=false) |
| FAM-15 | Network Commerce — Invoices/Settlement | NOT_ASSESSED | PILOT_REQUIRED | P1 | Blocked pending FAM-12 E2E |
| FAM-16 | TexQtic Trust Pay | DESIGN_GATED | DESIGN_GATED | P2 | TTP legal hold; D-002 HOLD_FOR_COUNSEL_FEEDBACK |
| FAM-17 | Sustainability Certification | DEFERRED | POST_MVP | P3 | — |
| FAM-18 | White-Label Co | PARKED_DECISION | POST_MVP | P3 | WL Co REVIEW-UNKNOWN |
| FAM-19 | TexQtic CoWorker / AI Workbench | DEFERRED | POST_MVP | P4 | — |
| FAM-20 | CRM Acquisition Integration | XDEP_ONLY | NOT_ASSESSED | — | — |
| FAM-21 | CRM Lifecycle Sync | XDEP_ONLY | NOT_ASSESSED | — | — |
| FAM-22 | CRM → Platform Provisioning | XDEP_ONLY | DESIGN_GATED | — | WEBHOOK-007 blocked |
| FAM-23 | CAE Integration | XDEP_ONLY | NOT_ASSESSED | — | — |
| FAM-24 | TTP + CAE Full Chain | XDEP_ONLY | DESIGN_GATED | — | TTP + CAE gated |

---

## §5 Hold Map — Full Inventory

### 5A. Legal Holds (MAINTAIN — do not clear without counsel/Paresh written approval)

| Hold ID | Description | Current Status | Trigger to Clear | July Impact |
|---|---|---|---|---|
| FTR-LEGAL-003 | Legal pages bundle: 6 docs drafted; publication blocked | DRAFT_CONTENT_READY_BLOCKED_PENDING_PUBLICATION | Paresh review of draft pack + OQ-02 (counsel engagement decision) + OQ-03 (CIN/entity details) → then FTR-LEGAL-003C in texqtic.com repo | **P0 July gate**: Must publish before buyer outreach / Razorpay activation. Expected in "few days" per Paresh direction. |
| FAM-07 L13A | Tenant onboarding legal inputs hold | HOLD_FOR_HUMAN_LEGAL_INPUTS | 8 exit criteria must be satisfied; legal_approved_transition_allowed=false; Paresh Auth 2 required in writing | **P0 July gate**: No supplier ToS flow until L13A clears |
| FAM-07 L14 | ToS acceptance implementation | BLOCKED_PENDING_L13A | Must not open until L13A exit criteria satisfied + Paresh Auth 2 confirmed | Downstream from L13A; cannot open independently |
| FAM-16 / D-002 / TTP | TexQtic Trust Pay design gate | HOLD_FOR_COUNSEL_FEEDBACK | External counsel feedback on TTP packet received + D-002 decision by Paresh | **POST_MVP** per new Paresh direction; counsel expected "in a few days" |
| FTR-LEGAL-001 | TTP legal completeness | HOLD_FOR_COUNSEL_FEEDBACK | Same trigger as FAM-16/D-002 | POST_MVP |
| TexQticScore tenant surface | Seller-facing score display | BLOCKED_LEGAL | Counsel confirms "TexQticScore" name safe + seller visibility approved → open TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001 | POST_MVP; SUPER_ADMIN-only until counsel clears |

### 5B. Payment / Subscription Holds

| Hold ID | Description | Current Status | Trigger to Clear | July Impact |
|---|---|---|---|---|
| Razorpay checkout / FTU-COMM-002D | Subscription payment checkout | LEGALLY_BLOCKED (FTR-LEGAL-003 gate) | FTR-LEGAL-003C (legal pages live on texqtic.com) + all 8 Razorpay prerequisites confirmed | **P1 July target** — Paresh says "subscription payments enabled"; FTU-COMM-002A design unit authorized; implementation waits on legal |
| Razorpay webhooks | Webhook receiver design | SAFE_TO_DESIGN | No legal hold on design; implementation waits on Razorpay account + legal closure | Design can proceed now; safe in this window |
| Zoho Books invoice automation | All Zoho automation | DEFERRED per GOV_ZOHO_BOOKS_SYNC_SAFETY_DEFERRAL_AND_FLAG_OFF_COMPLETE | COA/taxonomy + CA/accountant ready; Paresh explicit re-authorization required | DEFERRED; no July action |
| D-011 / subscription tier pricing | Self-serve tier entitlements | PARTIAL_ADVANCE (CA pricing confirmed; public display approved) | Annual billing DEFERRED; self-serve upgrade not for MVP | STARTER ₹2,499/mo + PROFESSIONAL ₹4,999/mo in "Price + 18% GST" format approved; pricing page can show live prices |
| PRIT-031 / commission | Commission/deduction model | DESIGN_GATED | D-013/D-014 must resolve | POST_MVP |

### 5C. Non-Legal Holds (Recommend to Evaluate / Clear)

| Hold ID | Description | Current Status | Recommended Action | Priority |
|---|---|---|---|---|
| FTR-OPS-001 | Sentry first-event verification | IMPLEMENTATION_COMPLETE / VERIFICATION_PENDING_FIRST_EVENT | Paresh to check Sentry dashboard (texqtic-backend + texqtic-frontend). First error event needed to confirm delivery. Simple ops check — no code change. | P1 / July pre-launch |
| FTR-OPS-003 | Rollback procedure documentation | NOT_ASSESSED | Open standalone docs unit: write Vercel deploy rollback + Supabase DB rollback runbook. Docs-only, no code, no legal. Completable in one session. | P1 / July pre-launch |
| FTR-ACQ-001 | Tier 0 rate limiter 500→429 | IMPLEMENTATION_READY | Apply `errorResponseBuilder` fix in public route. No legal/payment risk. Standalone fix. | P2 / before any press/external launch |
| QD-6 | `supplier_quotes.enabled=false` | MAINTAINED | Evaluate for pilot unlock vs. stay disabled. Paresh decision required. Recommend keep disabled for Surat soft launch. | P2 / Paresh decision |
| G-022 | Award maker-checker | DESIGN_COMPLETE / HOLD_FOR_PARESH_DECISION | Paresh reviews design artifact (TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001) and decides. Unblocks FAM-12 E2E. | P2 |
| WL Co / FAM-18 | White-label co-governance | PARKED / REVIEW-UNKNOWN | Keep parked. No July action unless Paresh has update. | P3 |
| Layer 0 NEXT-ACTION.md | Stale pointer to FTR-SL-001D / FTR-B2C-005B | STALE | Open dedicated Layer 0 pointer sync unit (docs only). Update active_delivery_unit + next_candidate_unit. | Admin / before next family opens |
| Layer 0 OPEN-SET.md | Stale operational notes (FAM-11) | STALE | Include in same Layer 0 pointer sync unit. | Admin |
| FAM-08 formal close | CLOSE_READY_WITH_RESIDUALS | Audit confirmed close-ready | Open FAM-08 formal closure unit: record residuals QD-6/FE-10 as post-launch; confirm FTR-SL-004 as open candidate. | P1 / before next family opens |
| FAM-09 formal close | CLOSE_READY_WITH_LAUNCH_TEST_RESIDUALS | lt-b2b-001 fate open | Paresh decides lt-b2b-001 (launch-test B2B residual) fate (drop / carry forward). Then formally close. | P1 |
| Shraddha invite | Invite delivery + acceptance pending | REINVITE_REISSUED_PENDING_DELIVERY_CONFIRMATION | Paresh confirms Shraddha email received invite and accepted. Required to prove GATE-SL-02 (first real supplier accepted). | P0 / soft launch prerequisite |
| WEBHOOK-007 | CRM provisioning design | BLOCKED_PENDING_ORF_EVENTS_JURISDICTION_AUTH_OPENAPI | CRM repo audit needed first. No main-repo action. | POST_MVP / XDEP |
| D-018 | PRIT-033 Stage 2 supplier inbox family assignment | PARKED (FAM-03 vs FAM-08) | Unlocked by FAM-06 auth audit. Paresh assigns at FAM-08 cycle opening. | P1 for hard launch |

---

## §6 MVP Scope for July 20–30 Launch

### What IS the July MVP (B2B soft launch — Surat first cohort):

| Surface | Status | July-Ready? |
|---|---|---|
| B2B public discovery (search/browse) | VERIFIED_COMPLETE | YES |
| Supplier public profiles (`/supplier/:slug`) | CLOSE_READY_WITH_LAUNCH_TEST_RESIDUALS | YES (with Shraddha acceptance) |
| Aggregator directory | GATE-SL-05..09 MET | YES (2 suppliers; GATE-SL-01..04 pending real Surat data) |
| Public inquiry submission | VERIFIED_COMPLETE | YES |
| Supplier inquiry notification (OWNER + ADMIN emails) | RUNTIME_VERIFIED | YES |
| SEO / sitemap / robots | VERIFIED_COMPLETE | YES |
| Pricing page (display-only) | VERIFIED_COMPLETE | YES (live pricing display authorized by CA/D12A) |
| Auth and session management | VERIFIED_COMPLETE | YES |
| DPP Passport (conditional display) | PRODUCTION_READY | YES — pending Paresh D-001 decision |
| Subscription plan display (no payment) | VERIFIED_COMPLETE | YES |
| Error monitoring (Sentry) | IMPL_COMPLETE / PENDING_FIRST_EVENT | YES — Paresh needs to confirm first event seen |
| Rollback runbook | NOT_ASSESSED | NO — docs unit needed |
| Legal pages (texqtic.com/legal/*) | DRAFT_READY / NOT_PUBLISHED | **BLOCKER** — must publish before buyer outreach |
| Supplier ToS acceptance flow | HOLD_FOR_HUMAN_LEGAL_INPUTS | **BLOCKER** — needs L13A legal inputs |
| Supplier inquiry inbox (tenant dashboard) | NOT_ASSESSED | NO (soft-launch workaround: email-only; D-018 PARKED) |
| Subscription payment checkout (Razorpay) | LEGALLY_BLOCKED | Conditional YES if legal closes this week; FTU-COMM-002A authorized |
| D2C storefront | COMING_SOON (stub) | NO — confirmed deferred |
| Trade payments (TTP) | HOLD_FOR_COUNSEL_FEEDBACK | NO — POST_MVP per Paresh |
| CRM/CAE integration | XDEP_ONLY | NO — XDEP gates not cleared |

### P0 July Gate Checklist (must ALL be green before buyer outreach):

| Gate | Condition | Status |
|---|---|---|
| G-JULY-01 | Legal pages live on texqtic.com/legal/* | BLOCKED_PENDING_PUBLICATION |
| G-JULY-02 | Shraddha Industries invite accepted + membership confirmed | PENDING_DELIVERY_CONFIRMATION |
| G-JULY-03 | FAM-07 L13A legal inputs received + supplier ToS flow implemented | HOLD_FOR_HUMAN_LEGAL_INPUTS |
| G-JULY-04 | Sentry first-event confirmation (FTR-OPS-001) | VERIFICATION_PENDING_FIRST_EVENT |
| G-JULY-05 | Rollback runbook written (FTR-OPS-003) | NOT_ASSESSED |
| G-JULY-06 | Real Surat supplier data onboarded (GATE-SL-01..04) | PENDING — operational, not code |

---

## §7 Sequenced July Implementation Roadmap

All items below require Paresh opening authorization before implementation starts. Sequence is dependency-ordered.

### Wave 1 — Legal Closure (unblocks everything downstream) — **NOW → ~3 days**

| Unit | Description | Input Required | Est. Scope |
|---|---|---|---|
| FTR-LEGAL-003C | Legal pages publication in texqtic.com marketing repo | Paresh confirms OQ-02 (engage counsel) + OQ-03 (CIN details) + approves draft pack | Docs + marketing repo work; ~1 session |
| Layer 0 pointer sync | Update NEXT-ACTION.md + OPEN-SET.md to current state | Paresh authorization | Docs-only; 1 session |
| FAM-08 formal close | Formally close FAM-08 with residuals recorded | Paresh authorization | Docs-only; 1 session |
| FAM-09 formal close | Formally close FAM-09 (lt-b2b-001 fate decision) | Paresh decides lt-b2b-001 | Docs-only; 1 session |

### Wave 2 — Core Auth + Ops (unblocks supplier onboarding and hard launch features) — **Days 3–10**

| Unit | Description | Depends On | Est. Scope |
|---|---|---|---|
| FAM-06 opening | Auth family cycle repo-truth audit and opening (already VERIFIED_COMPLETE — confirm scope) | Layer 0 pointer synced | 1 session (audit already done) |
| FTR-OPS-001 verification | Paresh checks Sentry dashboard; confirm first event | FTR-OPS-001C deployed | Ops-only; Paresh action |
| FTR-OPS-003 | Write Vercel + Supabase rollback runbook | None | Docs; 1 session |
| FTR-ACQ-001 | Fix rate limiter 500→429 | None | Code; ~30 min |
| Shraddha acceptance confirmation | Confirm delivery + membership established | Shraddha accepts invite | Operational; Paresh + Shraddha |

### Wave 3 — Supplier Onboarding Legal + First Surat Cohort — **Days 7–14**

| Unit | Description | Depends On |
|---|---|---|
| FAM-07 L13A legal inputs | Receive 8 exit criteria inputs from counsel/Paresh | Legal approval + Paresh Auth 2 in writing |
| FAM-07 L14 — ToS implementation | Implement supplier ToS acceptance flow | L13A exit criteria satisfied |
| PRIT-033 Stage 2 / D-018 | Assign supplier inquiry inbox to FAM-03 or FAM-08 | FAM-06 auth audit confirmed |
| Surat cohort operational onboarding | Provision GATE-SL-01..04 for first 5–10 Surat suppliers | Legal pages live + ToS flow ready |

### Wave 4 — Subscription Payments (conditional — if legal closes) — **Days 10–20**

| Unit | Description | Depends On |
|---|---|---|
| FTU-COMM-002A | Razorpay subscription checkout first design unit (authorized) | FTR-LEGAL-003C complete; all 8 Razorpay prerequisites confirmed |
| Razorpay webhook design | Webhook receiver implementation (SAFE_TO_DESIGN now) | Razorpay account active |
| Subscription activation | Enable gated subscription tier enforcement | FTU-COMM-002A complete |

### Wave 5 — Post-Soft-Launch Polish — **Days 14–30 (before hard launch)**

| Unit | Description | Priority |
|---|---|---|
| FTR-SL-004 / inquiry inbox | Supplier tenant dashboard inquiry inbox | P1 hard launch |
| PRIT-034 additional legal surfaces | Activate remaining legal document groups | P1 |
| PRIT-035 / analytics | Analytics tooling selection + implementation | P2 |
| PRIT-037 / D-026 buyer bridge | Activate buyer bridge when all 4 trigger conditions met | P1 (all 4 gates must clear first) |
| G-022 decision | Paresh reviews maker-checker design → unblocks FAM-12 | P2 |
| D-001 DPP activation decision | Paresh decides whether to publicly announce DPP capability | P2 |

---

## §8 Seven Pillars Classification

| Pillar | Name | PRIT | Family | Status | July Classification |
|---|---|---|---|---|---|
| 1 | DPP Compliance Engine / DPP Passport | FAM-05 / D-001 | FAM-05 | PARKED_DECISION (PRODUCTION_READY) | **Conditionally ready** — PRODUCTION_READY, conditionally rendered; Paresh decides D-001 to publicly announce. Not a July blocker. |
| 2 | TexQtic Trust Pay / TexCredit / TexQticScore | FAM-16 / D-002 / TTP | FAM-16 | DESIGN_GATED / HOLD_FOR_COUNSEL_FEEDBACK | **POST_MVP** per Paresh direction; TexQticScore SUPER_ADMIN-only (counsel must approve name + tenant visibility); TTP counsel expected "in a few days"; TexCredit = part of this pillar; no separate family needed unless Paresh decides otherwise |
| 3 | China+1 Discovery Engine | PRIT-024 | FAM-12 extension | DESIGN_GATED | **POST_MVP** — real transaction data needed first |
| 4 | AI Pricing Oracle | PRIT-025 | FAM-19 | DESIGN_GATED | **POST_MVP** — real data needed first |
| 5 | Collective Sustainability Certification Pool | PRIT-026 | FAM-17 extension | DESIGN_GATED | **POST_MVP** |
| 6 | Artisan IP and Heritage Commerce Layer | PRIT-027 | FAM-02 / FAM-05 / FAM-17 | DESIGN_GATED | **POST_MVP** |
| 7 | ONDC / GeM Commerce Rail | **PRIT-038 (TO REGISTER)** | Suggested: new FAM-25 or under FAM-12/FAM-15 extension | NOT_REGISTERED | **POST_MVP** — strategic roadmap; P3; requires ONDC/GeM integration design, API contract, regulatory compliance; no implementation until post-pilot proof pack |

**Naming correction:** "TexScore" is an outdated term. All governance, code, and UI must use **"TexQticScore"**. References to "TexScore" should be updated when those files are touched in a governed unit.

---

## §9 Planned Families Registry — B2B / B2C / D2C / Marketing / Subscription / CRM

The following planned family surfaces are mapped to existing governance records. No new families are created in this document; PRIT-038 registration is the only new intake item.

| Surface | Existing Governance | Status | July Classification |
|---|---|---|---|
| B2C buyer journey | FAM-01 (VERIFIED_COMPLETE) | Done | **READY** |
| D2C storefront | FAM-02 (VERIFIED_COMPLETE; stub posture) | Done — "coming soon" | **CONFIRMED DEFERRED** per Paresh direction |
| Supplier mini-sites / public profile | FAM-09 (CLOSE_READY_WITH_LAUNCH_TEST_RESIDUALS) | Close-ready | **SOFT-LAUNCH READY** (pending Shraddha acceptance) |
| Public product discovery | FAM-01 / FAM-02 (VERIFIED_COMPLETE) | Done | **READY** |
| Buyer inquiry inbox (submit) | FAM-03 (VERIFIED_COMPLETE) | Done | **READY** |
| Supplier inquiry inbox (receive) | FTR-SL-004 / PRIT-033 Stage 2 / D-018 | NOT_ASSESSED | **P1 hard launch; not soft launch** |
| Supplier dashboard upgrades | FAM-08 follow-on; D-018 pending | CLOSE_READY_WITH_RESIDUALS | **P1 hard launch** |
| Subscription plan UX (display-only) | FAM-11 (VERIFIED_COMPLETE) | Done | **READY** |
| Subscription plan with payment | FTU-COMM-002A (authorized; DESIGN_GATED) | DESIGN_GATED | **Wave 4 July (conditional on legal)** |
| Marketing SEO / content | FAM-04 (VERIFIED_COMPLETE) + FTR-SEO overlays | Overlays open | **READY** (base) |
| Aggregator directory 100% readiness | FTR-SL-001 (DESIGN_COMPLETE; GATE-SL-01..09 defined) | Ops-gated | **Ops action (real supplier data)** |
| CRM/CAE soft-launch acquisition | FAM-20–24 (XDEP_ONLY) | XDEP gates uncleared | **POST_MVP; D-026 buyer bridge blocked** |

---

## §10 PRIT-038 Registration — ONDC / GeM Commerce Rail (Pillar 7)

**PRIT-038 is registered in `PLANNED-REQUIREMENTS-INTAKE.md` by this audit unit.**

| Field | Value |
|---|---|
| **PRIT ID** | PRIT-038 |
| **Title** | ONDC / GeM Commerce Rail — Pillar 7 |
| **Target System** | MAIN (primary); CROSS_SYSTEM integration with ONDC/GeM network |
| **Proposed Family** | New FAM-25 (ONDC/GeM Commerce Rail) or extension under FAM-12/FAM-15; Paresh to decide at PRIT-038 family opening audit |
| **Feature Source** | USER_PLANNED_ONLY (Paresh session input — Pillar 7 of 7; was absent from prior 7-Pillars document provided for PRIT-022–027 intake) |
| **Evidence Level** | USER_PLANNED_ONLY |
| **Confirmation Status** | PARESH_CONFIRMED_AS_PLANNED (session input) |
| **Provisional Launch Class** | POST_MVP |
| **Provisional Priority** | P3 |
| **Governance Source** | This audit unit (MAJOR-AUDIT-JULY-LAUNCH-READINESS-PLAN-HOLD-CLEARANCE-AND-FAMILY-REGISTRY-01) |
| **Dependency / Blocker** | ONDC/GeM integration design required (API spec, regulatory compliance, onboarding protocol, product catalog mapping to ONDC taxonomy); real pilot transaction data required; FAM-12 E2E RFQ (G-022 decision) is a prerequisite |
| **Repo Inspect?** | YES — family opening audit required |
| **Biz Decision?** | YES — Paresh to decide integration model, seller onboarding path, GeM vs ONDC priority |
| **Recommended Dest Doc** | `PLANNED-REQUIREMENTS-INTAKE.md` §5A (registered here); family cycle defined separately |
| **Next Action** | Register PRIT-038 in PLANNED-REQUIREMENTS-INTAKE.md §5A+§5B. No family cycle until post-MVP design gate opens. |

---

## §11 B2B Readiness Audit — Source Truth

**Public surfaces confirmed present in repo:**

| Component | Path | Status |
|---|---|---|
| `B2BDiscoveryPage` | `components/Public/B2BDiscovery.tsx` | PRODUCTION_VERIFIED |
| `B2CBrowsePage` | `components/Public/B2CBrowse.tsx` | PRODUCTION_VERIFIED |
| `PublicSupplierProfile` | `components/Public/PublicSupplierProfile.tsx` | PRODUCTION_VERIFIED |
| `PublicInquiryPage` | `components/Public/PublicInquiryPage.tsx` | PRODUCTION_VERIFIED |
| `PublicAggregatorPreview` | `components/Public/PublicAggregatorPreview.tsx` | PRODUCTION_VERIFIED |
| `PublicPricingPage` | `components/Public/PublicPricingPage.tsx` | VERIFIED (pricing live: ₹2,499/₹4,999 + 18% GST) |
| `PublicPassport` | `components/Public/PublicPassport.tsx` | PRODUCTION_READY (D-001 gated) |
| `PublicB2CCategoryPage` | `components/Public/PublicB2CCategoryPage.tsx` | PRODUCTION_VERIFIED |

**B2B tenant surfaces confirmed present:**

| Component | Note |
|---|---|
| `AggregatorDiscoveryWorkspace.tsx` | B2B tenant discovery |
| `BuyerRfqDetailSurface.tsx` / `BuyerRfqListSurface.tsx` | RFQ (FAM-12; G-022 gated) |
| `CatalogPdpSurface.tsx` | PDP TECS-B2B-BUYER-CATALOG-PDP-001 |
| `DPPPassport.tsx` (tenant) | D-001 gated |
| `PlanAndUsagePanel.tsx` | FAM-11 display-only |
| `TtpEnrollmentBanner.tsx` / `TtpTradeSummaryCard.tsx` | FAM-16; counsel-gated for tenant surface |

---

## §12 D2C Readiness Audit — Source Truth

**D2C posture confirmed as COMING_SOON / STUB:**

- `PublicCollectionsStub.tsx` — stub component; no functional D2C commerce
- `PublicCollectionUnavailable.tsx` — explicit unavailability component
- `PublicCollectionDetail.tsx` — detail page (backend-only; no checkout)
- `B2CBrowse.tsx` line 368: "attraction roadmap - coming soon"
- `PublicPricingPage.tsx`: "Coming soon" labels on some features

**Verdict:** D2C collections are already in "coming soon" posture in code. Paresh direction to defer D2C post-MVP is **consistent with current repo state**. No code change required.

---

## §13 Subscription / Payments Readiness Audit — Source Truth

| Item | Status |
|---|---|
| FAM-11 display-only pricing | VERIFIED_COMPLETE |
| CA pricing authorization | COMPLETE — ₹2,499/mo + ₹4,999/mo; "Price + 18% GST" format; public display APPROVED |
| FTU-COMM-002A design gate | OPEN — Paresh explicitly authorized (D12A, 2026-06-04) |
| Razorpay checkout implementation | LEGALLY_BLOCKED (FTR-LEGAL-003C must complete first) |
| Razorpay webhook design | SAFE_TO_DESIGN (no legal block on design work) |
| Zoho Books integration | DEFERRED (GOV_ZOHO_BOOKS_SYNC_SAFETY_DEFERRAL confirmed) |
| Annual billing pricing | DEFERRED (no CA-approved annual price equivalents) |
| Self-serve upgrade/downgrade | POST_MVP (D-011 item 7 pending) |

**Verdict:** Subscription payments can be ENABLED for July IF FTR-LEGAL-003C publishes in time. Design work (FTU-COMM-002A) can and should start immediately. Implementation is legally gated, not technically gated.

---

## §14 CRM / CAE Readiness Audit — Source Truth

| Integration | Status | July Impact |
|---|---|---|
| CRM → Platform WEBHOOK-007 (FAM-22) | XDEP_ONLY; BLOCKED_PENDING_ORF_EVENTS_JURISDICTION_AUTH_OPENAPI | POST_MVP; no main-repo action |
| CAE → CRM → Platform (FAM-24) | XDEP_ONLY; DESIGN_GATED | POST_MVP; TTP legal + CAE audit needed |
| D-026 buyer bridge | PARKED; all 4 trigger conditions pending | No buyer bridge activation until all 4 gates clear |

**Verdict:** CRM/CAE integration is fully POST_MVP for July. No main-repo work to unblock.

---

## §15 FTR Open Items Summary — Priority-Ordered for July

| FTR ID | Title | Status | Priority | July Action |
|---|---|---|---|---|
| FTR-LEGAL-003 | Legal pages bundle | DRAFT_CONTENT_READY_BLOCKED_PENDING_PUBLICATION | P1/MVP_CRITICAL | **CRITICAL PATH** — FTR-LEGAL-003C in texqtic.com repo ASAP |
| FTR-OPS-001 | Sentry first-event verification | IMPL_COMPLETE / VERIFICATION_PENDING_FIRST_EVENT | P1/MVP_CRITICAL | Paresh checks Sentry dashboard — no code change needed |
| FTR-OPS-003 | Rollback procedure documentation | NOT_ASSESSED | P1/MVP_CRITICAL | Write runbook (docs only); standalone unit |
| FTR-SL-004 | Supplier inquiry inbox design | NOT_ASSESSED | P1/MVP_CRITICAL | Assign to FAM-03 or FAM-08 after D-018 resolved; P1 for hard launch |
| FTR-LEGAL-002 | Privacy/consent notice for inquiry form | NOT_ASSESSED | P1/MVP_CRITICAL | Address in FAM-03 cycle; small implementation; no counsel needed for basic notice |
| FTR-AUTH-003 | Auth/private-route crawl exclusion | VERIFICATION_PENDING_RECRAWL | P2 | Monitor GSC for recrawl; no code action |
| FTR-ACQ-001 | Rate limiter 500→429 fix | IMPLEMENTATION_READY | P2 | Apply fix; standalone; ~30 min code change |
| FTR-SL-001 (operational) | Aggregator directory readiness | DESIGN_COMPLETE | P0 operational | Paresh + Shraddha: confirm invite acceptance; provision first Surat cohort |
| FTR-SL-003 | Supplier notification path | RUNTIME_VERIFIED | CLOSED | — |
| FTR-FAM-003 | FAM-03 completion gate | VERIFIED_COMPLETE | CLOSED | — |
| FTR-B2C-004 | Minimum inquiry notification | VERIFIED | CLOSED | — |
| FTR-B2C-005 | Supplier notification production verification | RUNTIME_VERIFIED | CLOSED | — |

---

## §16 Tracker Updates Authorized by This Audit

### PLANNED-REQUIREMENTS-INTAKE.md — PRIT-038 Registration

**Action:** Add PRIT-038 row to §5A and §5B, update §7 footer, update §11 checklist item.

**Authorized by:** This audit unit (Paresh direction: ONDC/GeM as Pillar 7).

### No other tracker changes in this unit.

The following items are IDENTIFIED but require separate governed units to action:
- Layer 0 pointer sync (NEXT-ACTION.md + OPEN-SET.md) → dedicate Layer 0 pointer sync unit
- FAM-08 formal close → dedicate FAM-08 close unit
- FAM-09 formal close → dedicate FAM-09 close unit
- FTR-LEGAL-003C → dedicate legal publication unit in texqtic.com repo

---

## §17 Decisions Required from Paresh (Action Items)

| # | Decision | Urgency | Impact |
|---|---|---|---|
| D-JULY-01 | Confirm OQ-02: engage external counsel for legal draft pack review | **NOW** | Unblocks FTR-LEGAL-003C; unblocks Razorpay activation; critical path for July |
| D-JULY-02 | Provide OQ-03: CIN / registered entity name / address for legal documents | **NOW** | Required for FTR-LEGAL-003C publication |
| D-JULY-03 | Confirm Shraddha Industries email received invite and accepted | **NOW** | GATE-SL-02 prerequisite; soft launch blocked |
| D-JULY-04 | Check Sentry dashboard (texqtic-backend + texqtic-frontend): confirm first error event received | **Before soft launch** | FTR-OPS-001 closure |
| D-JULY-05 | lt-b2b-001 fate: drop vs. carry forward (FAM-09 formal close) | **This week** | Unblocks FAM-09 close |
| D-JULY-06 | G-022 maker-checker: review design artifact and decide | **P2 / before FAM-12** | Unblocks FAM-12 E2E; not July-blocking |
| D-JULY-07 | D-001 DPP Passport: authorize public announcement of DPP as capability? | **P2** | DPP is PRODUCTION_READY; conditionally rendered; Paresh decides messaging |
| D-JULY-08 | QD-6 supplier quotes: keep disabled for Surat soft launch, or evaluate unlock? | **P2** | Recommend stay disabled |
| D-JULY-09 | PRIT-038 family structure: new FAM-25 vs. extension under FAM-12/FAM-15? | **P3 / POST_MVP** | ONDC/GeM architectural decision |
| D-JULY-10 | TexQticScore: acknowledge that "TexScore" references in any visible context should be updated to "TexQticScore" when those files are touched | **Admin** | Naming hygiene |

---

## §18 Commit Disposition

**Commit authorization:** This audit authorizes ONE atomic commit covering:
1. Staged correction: `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (FTR-SL-003 PARTIAL→RUNTIME_VERIFIED; FTR-FAM-003 PARTIAL→VERIFIED_COMPLETE)
2. New artifact: this file (`MAJOR-AUDIT-JULY-LAUNCH-READINESS-PLAN-HOLD-CLEARANCE-AND-FAMILY-REGISTRY-01.md`)
3. PRIT-038 row additions: `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md`

**Commit message:** `[TEXQTIC] docs(launch): audit July launch readiness holds and family registry`

**Requires Paresh confirmation before committing.** No auto-commit.

**Files to stage:**
```
governance/launch-readiness/FUTURE-TODO-REGISTER.md
governance/launch-readiness/MAJOR-AUDIT-JULY-LAUNCH-READINESS-PLAN-HOLD-CLEARANCE-AND-FAMILY-REGISTRY-01.md
governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md
```

---

## §19 Summary — What Is True Right Now

**What is READY for July soft launch (no further code needed):**
- B2B public discovery, supplier profiles, aggregator directory (2 suppliers)
- Public inquiry submission + supplier notification emails
- SEO, pricing page (with CA-approved live prices), auth, DPP (conditional)
- Error monitoring (Sentry deployed; first-event verification pending Paresh dashboard check)

**What MUST happen before buyer outreach (P0 gates):**
1. Legal pages published on texqtic.com/legal/* (FTR-LEGAL-003C)
2. Shraddha invite accepted + membership confirmed
3. FAM-07 L13A legal inputs received → supplier ToS flow implemented
4. Rollback runbook written (FTR-OPS-003)

**What is CONDITIONAL for July hard launch:**
- Subscription payments (Razorpay) — FTU-COMM-002A authorized; implementation waits on legal

**What is POST_MVP (confirmed deferred):**
- D2C storefront activation, Trade payments (TTP), CRM/CAE integration, all Pillars 2–7 except DPP conditional display

---

## §20 Final Enum

`MAJOR_AUDIT_JULY_LAUNCH_READINESS_PLAN_HOLD_CLEARANCE_AND_FAMILY_REGISTRY_COMPLETE_READY_FOR_PARESH_DECISION`

---

*Produced by Copilot under TexQtic AGENTS.md governance. Docs-only audit unit. No implementation authorized. All tracker changes listed in §16. Commit per §18 pending Paresh confirmation.*
