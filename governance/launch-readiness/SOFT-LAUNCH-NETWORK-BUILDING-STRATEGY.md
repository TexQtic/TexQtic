# SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md
# TexQtic Soft Launch — Network Building Strategy

**Hub:** `governance/launch-readiness/`
**Unit:** `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001`
**Status:** STRATEGY_COMPLETE — governance/design only; no implementation opened
**Created:** 2026-05-19
**Owner:** Paresh Patel (TexQtic founder)
**Layer 0 posture at creation:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`
**Design authority:** `TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001` (VERIFIED_COMPLETE)
**Pre-existing unstaged M files (never stage):**
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## §1 Purpose

This document defines the **TexQtic Network-Building Soft Launch Strategy** — how TexQtic can
begin building its supplier and buyer networks before the full hard MVP launch, using MVP-ready
surfaces, free/manual provisioning, and gated visibility for unfinished modules.

It answers the 20 required strategy questions, records the seven required decisions (A–G), and
defines the minimum readiness requirements for each soft-launch phase.

---

## §2 Authority Boundary

### This document IS:
- A governance and design strategy document
- A record of soft-launch scope decisions confirmed by Paresh
- A resolution artifact for R-013 and confirmation artifact for PRIT-032–035
- A planning input for `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`

### This document IS NOT:
- Hard MVP launch authorization
- Implementation authorization for any family, route, service, or component
- A family opening decision (no family cycle is opened by this document)
- A CRM or CAE repo audit
- A payment, legal, or tax decision
- A Layer 0 authority change (Layer 0 remains `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`)

---

## §3 Definition: Network-Building Soft Launch vs Hard MVP Launch

| Dimension | Network-Building Soft Launch | Hard MVP Launch |
|---|---|---|
| **Goal** | Build an initial atomic supplier/buyer network; gather proof-of-concept evidence | Open TexQtic to public traffic with all P0 families verified and production-ready |
| **Audience** | Curated, invited Surat pilot suppliers (30–50) + matched buyer contacts | Unrestricted public; search-indexed; paid/organic acquisition |
| **Provisioning model** | Free / manual operator-provisioned tenants | Self-serve and/or subscription-gated tenants (post-MVP) |
| **Platform readiness required** | Minimum: B2B directory surface, supplier profile, inquiry submission, minimum notification loop, legal pages bundle | All P0 family cycles verified: FAM-06, FAM-07, FAM-08, FAM-09, FAM-10, plus P1 must-haves |
| **Unfinished modules** | Displayed as Coming Soon or subscription-gated; no false capability claims | All claimed modules must be production-verified before launch |
| **Commerce** | No financial transactions on platform; no Razorpay; no checkout | Commerce gates decided and implemented based on Paresh + counsel decisions (D-011–D-015) |
| **Network size goal** | 10–30 pilot supplier profiles live; handful of real buyer inquiries captured | 50+ verified supplier profiles; multi-buyer inquiry volume |
| **Learning objective** | Does the inquiry loop work with real users? Does the directory drive discovery? | Production platform handles real multi-tenant traffic safely |
| **Risk posture** | Tightly controlled; small audience; rapid iteration possible | Production-grade; audit trail required; no retroactive fixes acceptable |
| **CRM/CAE dependency** | Manual CRM tracking by Paresh; no required CAE automation | CAE acquisition pipeline operational; CRM provisioning webhook (WEBHOOK-007) working |

---

## §4 Soft-Launch Goal

The soft-launch network-building phase has a single primary goal:

> **Build an initial atomic supplier/buyer network for the TexQtic Surat pilot proof cell,
> validate that the core inquiry loop works with real users, and gather evidence sufficient
> to plan the first family cycle selection.**

Secondary goals:
- Validate that the B2B aggregator directory surface is usable by real suppliers and buyers
- Identify real UX, trust, and data gaps before broad public launch
- Generate the first proof pack (BS-001, BS-002, BS-003 verification attempts)
- Confirm the minimum notification loop works with real supplier email delivery

---

## §5 Soft-Launch Allowed Surfaces

The following surfaces are explicitly allowed during the soft launch:

| Surface | Status | Notes |
|---|---|---|
| B2B / aggregator directory (`/products`, `/product/:slug`) | ALLOWED — PRODUCTION_VERIFIED | FAM-01 VERIFIED_COMPLETE; real supplier data seeding required (BS-001) |
| D2C public collections (`/collections`, `/collections/:slug`) | ALLOWED — PRODUCTION_VERIFIED | FAM-02 VERIFIED_COMPLETE; curated collection data required |
| Buyer inquiry submission | ALLOWED — PRODUCTION_VERIFIED | FAM-03 VERIFIED_COMPLETE; minimum notification loop required before buyer outreach (FTR-B2C-004) |
| SEO infrastructure (sitemap, robots.txt, JSON-LD) | ALLOWED — PRODUCTION_VERIFIED | FAM-04 VERIFIED_COMPLETE; canonical domain decision (D-005) required before broad SEO promotion |
| Supplier profile public pages | ALLOWED — PARTIALLY_IMPLEMENTED | `PublicSupplierProfile.tsx` exists (pre-existing unstaged M); full public profile family cycle (FAM-09) not assessed; minimal directory entry acceptable for soft launch |
| Lead capture / buyer email capture via inquiry | ALLOWED | Core of network-building; privacy consent disclosure (PRIT-034) required |
| Coming-soon / subscription-gated module display | ALLOWED | Preferred over hiding; no false capability claims |
| Free / manual operator-provisioned supplier tenants | ALLOWED | Paresh provisions suppliers manually; no self-serve required at soft launch |
| Curated pilot supplier outreach | ALLOWED | Direct outreach to Surat supplier network; invite-only at soft launch |
| DPP passport links (conditional) | CONDITIONAL — HOLD_FOR_PARESH_DECISION | D-001 parked; only display if `publicPassportId` is set on the product and Paresh authorizes DPP as a soft-launch signal |

---

## §6 Soft-Launch Prohibited Surfaces

The following surfaces are explicitly prohibited during the soft launch:

| Surface | Status | Reason |
|---|---|---|
| B2B financial transactions through TexQtic | PROHIBITED | PRIT-030 constitutional guardrail; B2B no-platform-financial-transaction boundary |
| Razorpay / payment gateway integration | PROHIBITED | D-015 parked; §4.3 prerequisites not met; PRIT-029 DESIGN_GATED |
| B2C / D2C checkout or cart-to-payment flow | PROHIBITED | D-012, D-015 parked; commerce methodology §4.3 + §6.2 + §7.2 freeze in effect |
| Commission deduction / platform fee collection | PROHIBITED | D-013, D-014 parked; PRIT-031 DESIGN_GATED |
| TradeTrust Pay (TTP) activation | PROHIBITED | `ttp_enabled=false`; HOLD_FOR_COUNSEL_FEEDBACK; TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001 pending |
| Escrow or platform-held funds of any kind | PROHIBITED | B2B no-money-movement policy; TTP hold |
| Unverified AI or compliance capability claims | PROHIBITED | FAM-19 (AI) and FAM-17 (Traceability) are POST_MVP; no capability claims permitted |
| Network Commerce RFQ / award activation for new tenants | PROHIBITED | FAM-12 G-022 hold; QD-6 hold; award maker-checker not implemented |
| Supplier quote feature flag (QD-6) activation | PROHIBITED | QD-6 explicitly held; Paresh has not lifted |
| White Label Co surfaces | PROHIBITED | WL Co hold `REVIEW-UNKNOWN` remains |
| Self-serve subscription upgrade / payment | PROHIBITED | POST_MVP per PRIT-028; D-011 parked |
| Any B2C/D2C authenticated commerce (cart checkout) | PROHIBITED | D-008, D-012 parked; methodology freeze |

---

## §7 Required Strategy Questions — Full Answers

### Q1. What is the difference between Network-Building Soft Launch and Hard MVP Launch?
→ See §3 (definition table). Key difference: soft launch is curated, free, manual, inquiry-only.
Hard launch requires all P0 family cycles verified, self-serve provisioning and commercial gating
ready, and all P0/P1 launch checklists passing.

### Q2. What can TexQtic safely expose during soft launch?
→ See §5 (allowed surfaces). B2B directory, D2C collections, inquiry submission, supplier
profiles (partial), legal pages, lead capture. All existing PRODUCTION_VERIFIED surfaces plus
controlled soft-launch additions (legal pages, minimum notification loop, supplier profile completeness for pilot batch).

### Q3. What must remain Coming Soon, hidden, or subscription-gated?
→ See §6 (prohibited surfaces). All commerce, payment, AI, traceability, TTP, NC RFQ award,
supplier quotes, WL Co, and B2C/D2C checkout surfaces must not be accessible or claimable.
Coming-soon treatment is preferred over hiding — transparency about what is coming builds trust.

### Q4. What is the MVP-ready B2B/aggregator directory layer?
The MVP-ready B2B/aggregator directory sub-layer consists of:
1. `/products` browse with real textile supplier product data (not QA placeholder)
2. `/product/:slug` detail pages with supplier attribution and inquiry CTA
3. `/collections` and `/collections/:slug` D2C collections showing curated origin stories
4. Buyer inquiry submission with minimum notification to supplier/admin (FTR-B2C-004)
5. Public supplier profile pages (FAM-09 partial readiness; minimum acceptable for pilot)
6. SEO infrastructure (sitemap, robots, JSON-LD) — FAM-04 PRODUCTION_VERIFIED
7. Legal pages bundle (privacy policy, terms, cookie stance, DSAR path) — PRIT-034
8. Analytics foundation (minimal funnel tracking) — PRIT-035 (can be deferred to first outreach wave if no PII)

The aggregator directory's defining characteristic is that it connects buyers to multiple verified
textile suppliers without TexQtic being a financial intermediary.

### Q5. What minimum supplier onboarding is required?
→ See §8 (minimum readiness checklist for supplier network onboarding).
Minimum: manual tenant provisioning by Paresh; supplier profile data entered (company name, products, origin, certifications); at least one public-indexable product per supplier; supplier trained on inquiry notification handling; supplier ToS acceptance (PRIT-012, inline or manual before FAM-07 cycle).

### Q6. What minimum buyer capture/inquiry workflow is required?
1. Buyer can discover products via `/products` browse or collection pages
2. Buyer can submit an inquiry via the inquiry form (FAM-03 VERIFIED_COMPLETE)
3. Privacy/consent disclosure present on inquiry form (PRIT-034/PRIT-011 required before buyer data collection at scale)
4. Inquiry is stored in DB (already working)
5. Minimum notification loop (FTR-B2C-004) fires to supplier/admin when inquiry is submitted
6. No payment, cart, or checkout surface is accessible to the buyer

### Q7. What minimum supplier response workflow is required?
This is the PRIT-033 scope:
1. Supplier (or Paresh as operator in early pilot) receives notification of buyer inquiry
2. Supplier has a mechanism to respond — at minimum: email reply or manual contact path
3. A formal tenant dashboard inquiry inbox (full FAM-03/FAM-08 scope) is MVP_CRITICAL/P1 but
   not required for the very first soft-launch cohort if Paresh operates the response manually
4. Before scaling buyer outreach beyond the first 5–10 inquiries, a minimum supplier response
   mechanism must be in place (even if it is Paresh forwarding emails manually)
5. Full supplier dashboard inquiry inbox requires family cycle (FAM-03 or FAM-08 — Paresh to
   decide family assignment at first family cycle selection)

### Q8. What legal pages/consent gates are required before network building?
**Required before any public buyer or supplier data collection at scale (PRIT-034):**
- `/privacy` — privacy policy (DPDP/GDPR stance; who handles data; retention; DSAR path)
- `/terms` — platform terms of service (for buyers and suppliers)
- Cookie/analytics consent stance (required before any analytics tool that captures PII)
- Minimal consent/privacy disclosure on inquiry form (PRIT-011)
- Supplier ToS acceptance mechanism (PRIT-012; can be manual at soft launch if self-serve is not ready)

**Required before Razorpay or any checkout (not applicable to soft launch):**
- Merchant of record decision (D-012)
- GST/TCS treatment decided
- Refund/cancellation policy in place
→ These are HARD BLOCKED for soft launch; not applicable to network-building phase.

### Q9. What analytics are required to measure soft-launch learning?
**Minimum for soft launch (PRIT-035 light):**
- Basic page view tracking (can be privacy-safe/cookieless — PostHog, Plausible, or similar)
- Inquiry form submission event (already has `buyer_inquiry.created.v1` event defined, not yet emitted)
- Supplier profile view events

**Not required for first soft-launch cohort:**
- Full funnel analytics
- Buyer session heatmaps
- A/B testing infrastructure

**Gate:** PRIT-034 (cookie consent stance) must be decided before any analytics tool that
captures PII is deployed at scale.

### Q10. What role does CAE play before hard launch?
CAE (Customer Acquisition Engine) plays no active automated role during soft launch.
- CAE is `XDEP_ONLY` (FAM-23) and `NEEDS_REPO_INSPECTION`
- All CAE → platform routes are `DESIGN_GATED` (TTP legal gate blocks full CAE→platform chain)
- During soft launch, Paresh manually manages acquisition outreach (direct contact, network referrals)
- CAE becomes a hard dependency before scaled buyer/supplier acquisition at hard MVP launch
- CAE → CRM → Platform integration chain (FAM-24) requires: TTP legal gate + CAE audit + CRM audit

### Q11. What role does CRM play before hard launch?
CRM plays a manual/operator role during soft launch:
- CRM (FAM-20, FAM-21) is `XDEP_ONLY` and `NEEDS_REPO_INSPECTION`
- CRM → Platform provisioning handoff (FAM-22, WEBHOOK-007) is `BLOCKED_PENDING_ORF_EVENTS_JURISDICTION_AUTH_OPENAPI`
- During soft launch, Paresh manually records supplier/buyer leads in CRM (TexQtic-CRM)
- CRM lead qualification and onboarding activation (FAM-20, FAM-21) are P1 for hard launch but
  not required for the manual soft-launch provisioning model
- CRM becomes an automated hard dependency before scaling to broad tenant onboarding

### Q12. What integrations are required?

#### CAE → Main App
| Status at soft launch | Notes |
|---|---|
| NOT REQUIRED (manual) | Paresh manually drives acquisition during soft launch; no automated CAE pipeline to platform |
| Required before hard launch | CAE audit complete; TTP legal gate cleared; FAM-24 family cycle complete |

#### CAE → CRM
| Status at soft launch | Notes |
|---|---|
| NOT REQUIRED (manual) | Paresh manually records CAE leads into CRM; no webhook automation needed for soft launch |
| Required before hard launch | CAE audit + CRM audit; automated lead handoff required for scale |

#### CRM → Main App
| Status at soft launch | Notes |
|---|---|
| NOT REQUIRED (manual) | Paresh manually provisions tenants in Main App after CRM qualification; WEBHOOK-007 gate clears this |
| Required before hard launch | WEBHOOK-007 blocked (OpenAPI contract update + jurisdiction auth); must resolve before scaled provisioning |

### Q13. Which integrations can be manual during soft launch?
All three integration chains (CAE → Main, CAE → CRM, CRM → Main) can be fully manual during
soft launch. The Surat pilot cohort (10–30 suppliers) is small enough that Paresh can manage:
- Supplier discovery → manual CRM record → manual Main App tenant provisioning
- Buyer inquiry → email notification → Paresh forwards to supplier manually
- Acquisition outreach → direct Surat network → no automated CAE pipeline needed

### Q14. Which integrations must be automated before hard launch?
- CRM → Main App provisioning (WEBHOOK-007) — required for scaled tenant onboarding
- CAE → CRM lead handoff — required for scaled acquisition beyond manual network
- Minimum inquiry notification loop to supplier (FTR-B2C-004) — required before buyer-facing
  public outreach (this IS part of soft launch; must be automated, not manual)

### Q15. Does soft launch change the first family cycle recommendation?
**Not materially.** The proposed first family cycle (FAM-06 Auth and Session Management) remains
the correct first cycle. Auth is the constitutional foundation on which every subsequent family
depends. However, the soft-launch strategy creates explicit prerequisites:

**Before supplier network onboarding begins (soft launch pre-reqs):**
1. PRIT-034 (legal pages bundle) — must be in place
2. PRIT-011 (privacy disclosure on inquiry form) — must be in place
3. FTR-B2C-004 (minimum inquiry notification loop) — must be working
4. Real supplier data loaded for at least 3–5 pilot suppliers (BS-001)

**These pre-reqs do NOT require FAM-06 to be complete.** They can be addressed in standalone
units or as part of earlier family cycles (FAM-03 for inquiry notification; standalone for legal
pages). This means soft launch can begin before FAM-06 completes if these pre-reqs are met.

### Q16. Should FAM-06 remain first, or does a soft-launch path require CRM/CAE XDEP audit first?
**FAM-06 should remain the recommended first full family cycle** when Layer 0 `HOLD_FOR_AUTHORIZATION`
releases. CRM/CAE XDEP audits are not required before soft launch — they are gated behind TTP
legal feedback and can be scheduled after the first soft-launch cohort generates evidence.

The soft-launch path allows targeted standalone units (legal pages, minimum notification loop,
supplier data seeding) to proceed independently of FAM-06, at Paresh's discretion, because those
units do not touch auth, tenant isolation, or commerce surfaces.

### Q17. What must be completed before supplier network onboarding begins?
**Hard prerequisites (must be complete):**
- [ ] PRIT-034: Legal pages bundle deployed (`/privacy`, `/terms`, cookie stance)
- [ ] PRIT-012: Supplier ToS acceptance mechanism (manual or self-serve minimal)
- [ ] FTR-B2C-004: Minimum inquiry notification loop working
- [ ] Real supplier product data for first batch loaded (BS-001 smoke test)
- [ ] Supplier profile completeness gate for pilot batch (FAM-09 partial readiness)
- [ ] Invite-token onboarding flow tested with real Surat supplier email (HD-001)
- [ ] Paresh has briefed first 3–5 pilot suppliers on the platform and inquiry handling

**Soft prerequisites (should be complete for confidence):**
- [ ] PRIT-011: Privacy/consent disclosure on inquiry form
- [ ] BS-003: noindex on auth/tenant routes confirmed
- [ ] BS-004: Feature flags seed correctly for new tenant provisioning

### Q18. What must be completed before buyer network outreach begins?
**Hard prerequisites (must be complete):**
- [ ] PRIT-034: Legal pages bundle deployed
- [ ] PRIT-011: Privacy/consent disclosure on inquiry form
- [ ] FTR-B2C-004: Minimum inquiry notification loop confirmed working end-to-end
- [ ] At least 5–10 real supplier products live in production (BS-001)
- [ ] Supplier has been briefed to handle inquiries; response path is defined
- [ ] BS-002: Notification reach production-verified (inquiry reaches supplier/admin)
- [ ] Minimum supplier response workflow in place (even if Paresh-operated initially)

**Soft prerequisites:**
- [ ] PRIT-035: Minimal analytics tracking (privacy-safe page views + inquiry events)
- [ ] BS-005: JSON-LD validated externally (Google Rich Results Test)
- [ ] BS-007: D-005 (canonical domain) addressed before broad SEO promotion

### Q19. What must be completed before public aggregator directory promotion?
**Hard prerequisites:**
- All supplier network onboarding prerequisites (§ Q17) met
- All buyer network outreach prerequisites (§ Q18) met
- At minimum 10 real verified supplier profiles live in production
- D-005 (canonical domain strategy) decided — do not accumulate organic SEO authority on wrong domain
- Legal pages bundle deployed
- DPP launch gate (D-001) resolved — clear on whether DPP is part of directory promise

**Soft prerequisites:**
- [ ] FTR-SEO-002: Product detail pages in sitemap (gated on D-005)
- [ ] FTR-SEO-003: Supplier profile indexability policy decided
- [ ] PRIT-035: Analytics foundation sufficient to measure directory-driven inquiry conversion

### Q20. What risks or decisions must be updated in TLRH?
1. R-013 resolution confirmed (see §11 Decision A)
2. PRIT-032–035 confirmations recorded (see §12 Decisions B–E)
3. New risk added: aggregator directory exposure before supplier consent / profile completeness (see BLIND-SPOT register)
4. Decision D-016 added to parking lot: Soft-launch scope boundary confirmation by Paresh
5. Future unit candidates added to FTR (see §16 Future Units)

---

## §8 Minimum Readiness Checklist — Supplier Network Onboarding

| # | Requirement | Source | Status |
|---|---|---|---|
| S-1 | Legal pages bundle deployed (`/privacy`, `/terms`, cookie stance) | PRIT-034 | NOT_ASSESSED — standalone unit required |
| S-2 | Supplier ToS acceptance (manual or self-serve minimal) | PRIT-012 | NOT_ASSESSED — FAM-07 or standalone |
| S-3 | Minimum inquiry notification loop operational (FTR-B2C-004) | PRIT-033 / FTR-B2C-004 | DESIGN_GATED — implementation unit required |
| S-4 | Real supplier product data loaded (≥5 products per pilot supplier) | BS-001 | OPEN — data seeding required |
| S-5 | Invite-token onboarding flow tested with real email | HD-001 | OPEN — must test before pilot outreach |
| S-6 | Supplier profile completeness for pilot batch (name, origin, certifications, products) | FAM-09 partial | NOT_ASSESSED — FAM-09 cycle not yet opened |
| S-7 | Feature flags seed correctly for newly provisioned tenant | BS-004 | OPEN |
| S-8 | Auth/tenant route noindex verified in production | BS-003 | OPEN |
| S-9 | Paresh has briefed first pilot suppliers and defined inquiry handling path | Operational | NOT_STARTED |

---

## §9 Minimum Readiness Checklist — Buyer Network Outreach

| # | Requirement | Source | Status |
|---|---|---|---|
| B-1 | Legal pages bundle deployed | PRIT-034 | NOT_ASSESSED |
| B-2 | Privacy/consent disclosure on inquiry form | PRIT-011 | NOT_ASSESSED |
| B-3 | Minimum notification loop confirmed (inquiry reaches supplier/admin) | FTR-B2C-004 / BS-002 | OPEN |
| B-4 | At least 5–10 real supplier products live in production | BS-001 | OPEN |
| B-5 | Supplier response path defined (minimum: email forward or manual) | PRIT-033 | NOT_ASSESSED |
| B-6 | All-up inquiry loop smoke test with real users confirmed | BS-002 | OPEN |
| B-7 | Minimal analytics tracking (privacy-safe inquiry events) | PRIT-035 (light) | NOT_ASSESSED |

---

## §10 Minimum Readiness Checklist — Aggregator Directory Promotion

| # | Requirement | Source | Status |
|---|---|---|---|
| A-1 | All supplier onboarding prerequisites met (§8) | — | GATED |
| A-2 | All buyer outreach prerequisites met (§9) | — | GATED |
| A-3 | ≥10 real verified supplier profiles live | — | NOT_STARTED |
| A-4 | D-005 (canonical domain) decided | D-005 / BS-007 | PARKED |
| A-5 | Legal pages bundle deployed | PRIT-034 | NOT_ASSESSED |
| A-6 | DPP launch gate (D-001) resolved | D-001 | PARKED |
| A-7 | Supplier profile indexability policy decided (FTR-SEO-003) | FTR-SEO-003 | DESIGN_GATED |
| A-8 | Product detail pages in sitemap (FTR-SEO-002; gated on D-005) | FTR-SEO-002 | DESIGN_GATED |

---

## §11 Decision A — R-013 Notification Classification Conflict Resolution

**Prior state:** R-013 in BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md was marked `MITIGATED` by
`TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001` (2026-07-14) with a split-scope resolution.

**Current state as of this unit:**

R-013 conflict is **RESOLVED** through the following split-scope classification, confirmed by
the soft-launch strategy:

| Scope | Classification | Rationale |
|---|---|---|
| **Scope A**: Full/general messaging and notification platform (inbox, threading, multi-channel) | `POST_MVP` / `P3` | Not required for soft launch; not required for hard MVP with Surat pilot cohort; ROADMAP row 26 classification retained |
| **Scope B**: Minimum inquiry notification loop (buyer inquiry → supplier/admin/Paresh receives email notification) | `MVP_CRITICAL` / `P1` | Required before buyer-facing outreach; CHECKLIST I-4 classification retained; FTR-B2C-004 is the delivery vehicle |

**Decision confirmed by this strategy unit:**
- Scope B (FTR-B2C-004) is a **soft-launch blocker** — it must be implemented before buyer
  network outreach begins (Q18 checklist item B-3).
- R-013 status: **RESOLVED** — no longer a governance conflict. Both ROADMAP and CHECKLIST
  rows reflect the split-scope resolution.
- No further escalation to Paresh required on R-013 — the split-scope decision is the correct resolution.

**Required update:** R-013 in BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md should be moved from
`MITIGATED` to `RESOLVED` and updated with this strategy unit as the final resolution authority.

---

## §12 Decisions B–G — PRIT Confirmations and Financial Boundary

### Decision B — PRIT-032: Cart-as-Intent Buyer Surface Governance

| Field | Value |
|---|---|
| **Prior status** | NOT_ASSESSED (confirmed as PARESH_CONFIRMED intake item 2026-07-14) |
| **Soft-launch recommendation** | CONFIRM as `P2 / PILOT_REQUIRED` |
| **Rationale** | Cart code (Cart.tsx, cartService.ts, MarketplaceCartSummary, CartSummariesPanel) exists ungoverned in repo. No cart surface is required for soft-launch network building. Cart-as-intent is a buyer commerce feature that requires a governing family cycle before any cart flow can be used. During soft launch, the cart surface must remain inaccessible to real buyers. |
| **Soft-launch implication** | Cart surfaces must NOT be exposed during soft launch. Buyer journey ends at inquiry submission. No checkout CTA. |
| **Required action** | Assign cart governance to appropriate family cycle (FAM-01 or new buyer commerce family) at `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`. Do not implement before a governing unit is opened. |
| **Confirmation status** | SOFT_LAUNCH_CONFIRMED as P2 / not a soft-launch blocker unless Paresh explicitly requests cart intent in early soft launch |

### Decision C — PRIT-033: Supplier Inquiry Response Workflow / Tenant Dashboard Inquiry Inbox

| Field | Value |
|---|---|
| **Prior status** | MVP_CRITICAL / P1 confirmed (2026-07-14); family assignment pending |
| **Soft-launch recommendation** | CONFIRM as `MVP_CRITICAL / P1 for soft launch` |
| **Rationale** | The minimum inquiry notification loop (FTR-B2C-004) is a soft-launch blocker for buyer outreach. A full tenant dashboard inquiry inbox is MVP_CRITICAL/P1 for hard launch. During the earliest soft-launch cohort, Paresh can operate the response path manually (email forward), but this cannot scale beyond the first 5–10 real inquiries. |
| **Split delivery path** | Stage 1 (soft launch): FTR-B2C-004 minimum notification (email to supplier/admin). Stage 2 (hard launch): Full tenant dashboard inquiry inbox in FAM-03 or FAM-08 cycle. |
| **Family assignment** | To be confirmed at `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` — Paresh to decide FAM-03 vs FAM-08. |
| **Confirmation status** | SOFT_LAUNCH_CONFIRMED as P1 — FTR-B2C-004 must be implemented before buyer outreach begins |

### Decision D — PRIT-034: Public Legal Pages Bundle

| Field | Value |
|---|---|
| **Prior status** | MVP_CRITICAL / P1 confirmed (2026-07-14) |
| **Soft-launch recommendation** | CONFIRM as `MVP_CRITICAL / P1 — soft-launch blocker` |
| **Rationale** | Before any buyer or supplier data is collected at scale (even at the soft-launch pilot level), a privacy policy, terms page, cookie stance, and DSAR path must exist. This is a compliance prerequisite, not a nice-to-have. It applies to every public page that collects an email, name, or company name. |
| **Implementation path** | Can be a standalone governance unit (does not require FAM-06 or any other family cycle to complete first). Content requires Paresh + possibly counsel review. |
| **Confirmation status** | SOFT_LAUNCH_CONFIRMED as P1 — hard prerequisite before any public network-building outreach |

### Decision E — PRIT-035: Product Analytics / Funnel Tracking Infrastructure

| Field | Value |
|---|---|
| **Prior status** | P2 / PILOT_REQUIRED confirmed (2026-07-14) |
| **Soft-launch recommendation** | CONFIRM as `P2 / PILOT_REQUIRED — not a first-cohort blocker, but required before broad soft-launch outreach` |
| **Rationale** | The soft launch will generate low-volume inquiry data that can be tracked manually for the first 5–10 suppliers. However, before any broad public directory promotion or paid/organic buyer acquisition begins, a minimal analytics foundation (privacy-safe page views + inquiry events) must be in place to measure learning. PRIT-034 cookie consent stance must be decided before a PII-capturing analytics tool is deployed. |
| **Implementation path** | Minimum viable: deploy PostHog or Plausible (cookieless/privacy-safe) for page views + emit `buyer_inquiry.created.v1` event. Can be a standalone unit. |
| **Confirmation status** | SOFT_LAUNCH_CONFIRMED as P2 / PILOT_REQUIRED — not a hard blocker for first cohort (5–10 suppliers), but required before broader outreach |

### Decision F — B2B Financial Boundary Confirmation

| Field | Value |
|---|---|
| **Boundary** | No B2B financial transactions through TexQtic during soft launch |
| **Scope** | No Razorpay; no escrow; no commission deduction; no TTP activation; no platform-held funds |
| **Authority** | PRIT-030 (CONFIRMED_BOUNDARY); commerce methodology §5 |
| **Status** | CONFIRMED — this guardrail applies to soft launch without modification |
| **Implication for soft launch** | Supplier/buyer payment terms are entirely bilateral. TexQtic is the discovery and inquiry medium only. Any transaction occurs outside the platform, bilaterally, per industry norms. |

### Decision G — Free / Manual Pilot Provisioning

| Field | Value |
|---|---|
| **Model** | Supplier and buyer onboarding during soft launch is free and manually operator-provisioned by Paresh |
| **Self-serve subscription** | Remains POST_MVP (D-011 parked; PRIT-028 POST_MVP) |
| **Minimum FAM-11 scope for soft launch** | FREE tier operator-assigned gating only; no self-serve upgrade or tier-boundary enforcement |
| **Status** | CONFIRMED — free/manual provisioning is the correct model for the Surat pilot proof cell |

---

## §13 CAE Readiness and Connectivity Expectations

### Current CAE State (XDEP summary)
- FAM-23 (CAE Acquisition Pipeline): `XDEP_ONLY` / `NEEDS_REPO_INSPECTION`
- FAM-24 (CAE → CRM → Platform Integration Chain): `XDEP_ONLY` / `DESIGN_GATED` / all routes gated behind TTP legal release
- CAE readiness truth lives in `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE/governance/`

### Soft-Launch CAE Expectations
- No CAE automation required during soft launch
- Paresh manages acquisition manually through direct Surat network contact
- CAE governance unit (`XDEP-CAE-CRM-MAIN-SOFT-LAUNCH-STRATEGY-001`) is a future candidate

### Pre-Hard-Launch CAE Requirements
1. CAE repo audit unit completed (creates `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE/governance/` evidence)
2. TTP legal gate cleared (HOLD_FOR_COUNSEL_FEEDBACK released)
3. CAE → CRM handoff contract defined
4. CAE → Main App integration routes designed (ROUTE-001–ROUTE-006 all currently `DESIGN_GATED`)

---

## §14 CRM Readiness and Connectivity Expectations

### Current CRM State (XDEP summary)
- FAM-20 (CRM Lead Intake): `XDEP_ONLY` / `NEEDS_REPO_INSPECTION`
- FAM-21 (CRM Onboarding and Activation): `XDEP_ONLY` / `NEEDS_REPO_INSPECTION`
- FAM-22 (CRM → Platform Provisioning Handoff): `XDEP_ONLY` / `DESIGN_GATED` / WEBHOOK-007 blocked
- CRM readiness truth lives in `TexQtic-CRM/governance/`

### Soft-Launch CRM Expectations
- CRM used manually by Paresh for lead tracking and pilot supplier qualification
- No automated CRM → Platform provisioning (WEBHOOK-007 remains blocked)
- CRM contact records for first pilot suppliers maintained manually

### Pre-Hard-Launch CRM Requirements
1. CRM repo audit unit completed
2. WEBHOOK-007 blocked item resolved (requires OpenAPI contract update + jurisdiction auth)
3. CRM → Main App provisioning handoff designed and tested
4. CRM lead qualification workflow verified for scale

---

## §15 Main App Readiness Expectations

### For Soft Launch (current posture)
Readiness is sufficient for the soft launch given the existing PRODUCTION_VERIFIED families:
- FAM-01: B2C browse — PRODUCTION_VERIFIED ✓
- FAM-02: D2C collections — PRODUCTION_VERIFIED ✓
- FAM-03: Inquiry submission — PRODUCTION_VERIFIED ✓
- FAM-04: SEO infrastructure — PRODUCTION_VERIFIED ✓

**Gaps to close before soft launch:**
- Legal pages bundle (PRIT-034) — standalone unit
- Minimum inquiry notification loop (FTR-B2C-004) — standalone or FAM-03 addendum
- Real supplier data seeded (BS-001) — operational task
- Supplier profile completeness gate (FAM-09 partial) — bounded investigation

**Not required before soft launch:**
- FAM-06 auth/session full family cycle
- FAM-07 tenant onboarding full family cycle
- FAM-08 tenant core workspace full family cycle
- FAM-09 supplier profile full family cycle
- FAM-10 platform ops full family cycle
- FAM-11 subscription/commercial gating full family cycle

---

## §16 XDEP Integration Strategy

| Integration | Soft Launch | Hard Launch | Blocker |
|---|---|---|---|
| **CAE → Main App** | Manual (Paresh acquisition) | Automated routes ROUTE-001–ROUTE-006 | TTP legal gate + CAE audit |
| **CAE → CRM** | Manual (Paresh records leads) | Automated lead handoff | CAE audit + CRM audit |
| **CRM → Main App** | Manual (Paresh provisions tenants) | WEBHOOK-007 automated provisioning | WEBHOOK-007 (OpenAPI + jurisdiction auth) |

**Key principle:** All three integration chains are deferrable to manual operation for the
10–30 supplier Surat pilot. None of these require automated integration to be in place before
the first soft-launch cohort generates evidence.

**Future unit:** `XDEP-CAE-CRM-MAIN-SOFT-LAUNCH-STRATEGY-001` should be created after the
first soft-launch cohort to define the automation timeline.

---

## §17 Manual vs. Automated Soft-Launch Boundaries

| Function | Soft Launch Model | Automation Required By |
|---|---|---|
| Supplier discovery / acquisition | Manual — Paresh direct outreach | CAE pipeline (hard launch) |
| Supplier tenant provisioning | Manual — Paresh creates org in Main App | CRM → Main WEBHOOK-007 (hard launch) |
| CRM lead tracking | Manual — Paresh records in CRM | CRM automation (hard launch) |
| Buyer inquiry DB storage | Automated — already working (FAM-03) | Already done |
| Inquiry notification to supplier/admin | Must be automated (FTR-B2C-004) | Before buyer outreach |
| Supplier response to buyer | Manual — email or Paresh-forwarded | Tenant dashboard inbox (hard launch) |
| Analytics event emission | Semi-automated (minimal foundation) | Before broad outreach |
| Legal page display | Static deployment | Before any data collection |
| Subscription/commercial gating | Manual FREE tier assignment | Self-serve post-MVP |

---

## §18 First Family Cycle Selection Implications

The soft-launch strategy has the following implications for `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`:

1. **FAM-06 remains the recommended first full family cycle** — auth is constitutional; all other
   families depend on it. The soft-launch path does not change this.

2. **Pre-soft-launch standalone units can and should proceed before FAM-06 is complete:**
   - Legal pages bundle unit (PRIT-034)
   - Minimum inquiry notification loop unit (FTR-B2C-004 / PRIT-033 Stage 1)
   - These are P1 for soft launch and do not depend on FAM-06 completing

3. **PRIT-032 (cart governance) must be assigned to a family at first cycle selection** — the
   ungoverned cart code (R-014) represents a risk that needs a governing home before FAM-01 or
   any buyer commerce family cycle opens.

4. **CRM/CAE XDEP audit is NOT required before first family cycle selection** — it is deferred
   until after TTP legal gate clears and the first soft-launch cohort generates evidence.

5. **The family cycle order (FAM-06 → FAM-07 → FAM-08 → FAM-09 → FAM-10) remains correct** —
   soft launch does not restructure the family cycle sequencing.

---

## §19 Risks and Mitigations

| Risk ID | Risk | Impact | Mitigation |
|---|---|---|---|
| SR-001 | Aggregator directory promoted before supplier consent / profile completeness | Legal exposure; trust damage; GDPR/DPDP compliance failure | S-1 through S-9 checklist must gate directory promotion |
| SR-002 | Inquiry loop not tested before buyer outreach begins | Inquiries lost silently; buyer trust failure | B-6 (all-up inquiry loop smoke test with real users) required before buyer outreach |
| SR-003 | Canonical domain not decided before soft-launch SEO promotion | SEO authority split between app.texqtic.com and intended canonical | D-005 must be resolved before any organic SEO promotion; no press, no backlinks until canonical decided |
| SR-004 | "Coming soon" modules create false expectations | Buyer or supplier trust damage if timeline is not communicated | Only use "coming soon" with no timeline commitment; no feature promises |
| SR-005 | Manual provisioning bottleneck limits soft-launch scale | Paresh becomes operational bottleneck beyond 30 tenants | Design automation roadmap (WEBHOOK-007) as part of hard-launch preparation; cap soft launch at 30 tenants |
| SR-006 | First inquiry loop smoke test with real user fails | Evidence gap; cannot claim BS-002 resolved | Schedule a controlled first-inquiry test before any buyer outreach; treat as gate |
| SR-007 | No real multi-tenant RLS test before second real tenant onboarded | Cross-tenant data leak risk at R-004 | Before onboarding second real supplier, run dual-tenant integration smoke test (R-004) |

---

## §20 Future Unit Candidates Added to TLRH

The following future governance units are recommended and recorded in FUTURE-TODO-REGISTER.md:

| Unit Candidate ID | Proposed Unit | Priority | Trigger |
|---|---|---|---|
| FTR-SL-001 | `SOFT-LAUNCH-AGGREGATOR-DIRECTORY-READINESS-DESIGN-001` | P1 | Before first pilot supplier profile goes live |
| FTR-SL-002 | `XDEP-CAE-CRM-MAIN-SOFT-LAUNCH-STRATEGY-001` | P2 | After first soft-launch cohort; before scaling to 30+ suppliers |
| FTR-SL-003 | `INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001` | P1 | Immediately — required before buyer outreach (implements FTR-B2C-004) |
| FTR-SL-004 | `SUPPLIER-INQUIRY-INBOX-DESIGN-001` | P1 | After FTR-SL-003 complete; before hard launch |

---

## §21 Recommended Next Steps

**Immediate (before soft launch begins):**
1. Paresh confirms this strategy document — verbal or written acknowledgement
2. Open standalone unit for legal pages bundle (PRIT-034)
3. Open `INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001` (implements FTR-B2C-004)
4. Resolve D-005 (canonical domain) before any SEO-driven outreach
5. Begin supplier data seeding for first 3–5 Surat pilot suppliers

**Before buyer outreach:**
6. Confirm all B-checklist items (§9) green
7. Run all-up inquiry loop smoke test with Paresh acting as test buyer
8. Confirm BS-002 resolved (notification reaches supplier/admin)

**At first family cycle selection (TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001):**
9. Assign PRIT-032 (cart governance) to a governing family
10. Confirm FAM-06 as first full family cycle
11. Confirm family assignment for PRIT-033 Stage 2 (FAM-03 vs FAM-08)

---

## §22 Completion Checklist

| # | Item | Status |
|---|---|---|
| C-1 | R-013 resolved (split-scope classification confirmed) | COMPLETE — see §11 |
| C-2 | PRIT-032 confirmed (P2 / PILOT_REQUIRED; not soft-launch blocker) | COMPLETE — see §12 Decision B |
| C-3 | PRIT-033 confirmed (MVP_CRITICAL / P1; FTR-B2C-004 required before buyer outreach) | COMPLETE — see §12 Decision C |
| C-4 | PRIT-034 confirmed (MVP_CRITICAL / P1; hard prerequisite before data collection) | COMPLETE — see §12 Decision D |
| C-5 | PRIT-035 confirmed (P2 / PILOT_REQUIRED; not first-cohort blocker) | COMPLETE — see §12 Decision E |
| C-6 | B2B financial boundary confirmed (no transactions on platform during soft launch) | COMPLETE — see §12 Decision F |
| C-7 | Free/manual provisioning confirmed for soft launch | COMPLETE — see §12 Decision G |
| C-8 | CAE/CRM/Main connectivity strategy defined | COMPLETE — see §13–§16 |
| C-9 | FAM-06 remains first family cycle recommendation | COMPLETE — see §18 |
| C-10 | No implementation opened | CONFIRMED |
| C-11 | No family audit performed | CONFIRMED |
| C-12 | No runtime files modified | CONFIRMED |
| C-13 | No payment/legal/tax decisions made | CONFIRMED |
| C-14 | Hard MVP launch readiness not claimed | CONFIRMED |
| C-15 | Pre-existing unstaged M files not staged | CONFIRMED |

---

*Governance document only. No implementation authorization. No family cycle opened.*
*Layer 0 posture unchanged: `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`.*
*Last updated: 2026-05-19 — `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001`*
