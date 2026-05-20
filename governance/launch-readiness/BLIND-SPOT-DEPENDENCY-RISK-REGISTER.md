# Blind Spot, Dependency, and Risk Register

**Hub:** `governance/launch-readiness/`
**Status:** SKELETON — PENDING POPULATION
**Population unit:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`
**Last updated:** 2026-05-19 (skeleton created)
**Design authority:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

---

> **SKELETON NOTE**
>
> This register is intentionally anti-complacency. Its purpose is to capture items that
> **look done but may not be**, dependencies that **aren't obvious**, and risks that
> **haven't surfaced in Layer 0 yet**.
>
> This register is not a list of resolved Layer 0 blockers. Those live in `BLOCKED.md`.
> This register captures things that **could become blockers** but are not yet identified
> as such in any current governance unit.

---

## 1. Purpose

This document is the launch readiness blind-spot, hidden dependency, and risk register.

It answers the question: **what could prevent TexQtic from launching that nobody is currently watching?**

Three categories:

1. **Blind spots** — things that look complete but may have a hidden gap
2. **Hidden dependencies** — capability X requires Y, but Y hasn't been built (and may not be on anyone's radar)
3. **Risks** — things that could block, delay, or damage launch even if they look fine today

---

## 2. Register Schema

Each item has:
- **ID**: sequential; never reused
- **Category**: `BLIND_SPOT` / `HIDDEN_DEPENDENCY` / `RISK`
- **Title**: what the blind spot/dependency/risk is
- **Description**: what it looks like, what the gap is, why it is concerning
- **Impact if realized**: what happens if this isn't caught
- **Current evidence**: what suggests this is real (or unknown/speculative)
- **Mitigation**: what would reduce or resolve the risk
- **Priority**: `P0` / `P1` / `P2` / `P3`
- **Status**: `OPEN` / `WATCH` / `MITIGATED` / `RESOLVED`

---

## 3. Blind Spots

| ID | Title | Description | Impact if realized | Evidence | Mitigation | Priority | Status |
|---|---|---|---|---|---|---|---|
| BS-001 | B2C public pages verified with QA data only | All B2C browse, product detail, and inquiry units were production-verified using QA/test data, not real supplier-seeded data. The page may look different — or break — when real Surat textile supplier data is loaded. | Launch with broken or ugly public pages; real buyer bounces; trust damage. | Units were explicitly QA-verified; no real data test documented | Run a real-data smoke test with ≥5 real Surat supplier products seeded before any public outreach | P0 | OPEN |
| BS-002 | Inquiry notification reach not verified | Inquiry Phase 1+2 are production-verified for DB submission. Whether a notification (email/Slack/CRM entry) actually reaches the supplier or Paresh when a real buyer submits an inquiry has not been confirmed. | Leads lost silently; buyers don't hear back; trust damage. | No notification verification unit found in closed units list | Verify notification pipeline end-to-end with a real inquiry submission before any buyer-facing marketing | P0 | OPEN |
| BS-003 | Auth/tenant pages may be indexed | SEO noindex on auth/tenant routes has not been explicitly production-verified. If a search engine indexes /login, /dashboard, or /tenant/... pages, this is a trust and data exposure risk. | SEO ranking pollution; potential accidental internal URL exposure. | noindex guards exist in App.tsx useEffect; no production crawl verification documented | Run a Google Search Console / crawl verification before first public backlink or press mention | P0 | OPEN |
| BS-004 | Feature flags in production may differ from test expectations | Several feature flags have been provisioned via SQL in production (NC Phase 1 flags). If a new tenant is provisioned, do feature flags seed correctly for that new org, or only for QA tenants? | New real tenants may not get correct feature flag state. | NC feature flag provisioning was done for existing QA tenant only | Verify new-tenant provisioning flow seeds feature flags correctly | P1 | OPEN |
| BS-005 | JSON-LD fires but has not been validated by a structured data tool | JSON-LD web types were implemented and tests pass. However, no external tool validation (Google Rich Results Test, Schema.org validator) has been documented. | JSON-LD errors silently; rich result snippets don't appear in search. | Implementation unit closed; test coverage exists; no external tool evidence | Run Google Rich Results Test on /products, /product/:slug, /collections before launch | P1 | OPEN |
| BS-006 | TradeTrust Pay ttp_enabled=false is a hard gate | `ttp_enabled` has been confirmed false in production. All TTP surfaces are correctly hidden. However, if any downstream route, email, or data path references TTP-related concepts without the feature flag check, real users could see confusing or incomplete UI. | User confusion; premature capability claims. | Flag is false; surfaces are gated; but no full audit of all TTP-touching surfaces | Before public launch of B2B paths, audit all TTP-adjacent UI surfaces for proper flag gating | P1 | OPEN |
| BS-007 | Live public pages already indexed under app.texqtic.com — canonical domain not yet decided | **RESOLVED (2026-07-22) by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`.** Option F marketing repo lock (`MARKETING-APP-PUBLIC-PAGES-DOMAIN-SEPARATION-DECISION-LOCK-001`, commits 0bed542 / 3246ca4 / fa5d54e) confirms `app.texqtic.com` is the correct and intentional canonical domain for all dynamic marketplace public pages. `texqtic.com` is the separate marketing domain. No domain migration required. Organic impressions and GSC authority accumulated to date are correctly attributed. No domain authority split. D-005 CLOSED by strategy unit. | ~~Domain authority built on the wrong property~~ — resolved. No migration risk. | sitemap.xml, all canonical tags, and robots.txt Sitemap: directive all use `https://app.texqtic.com`; D-005 CLOSED | No further action required on canonical domain. Remaining SEO prerequisites: BS-003 (GSC verification, P0) and BS-005 (JSON-LD validation, P1). | P1 | RESOLVED |

---

## 4. Hidden Dependencies

| ID | Title | X (requires) | Y (must exist first) | Impact if Y is missing | Current evidence | Mitigation | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| HD-001 | Real supplier onboarding requires invite-token flow to work | Real supplier can join TexQtic | Invite-token onboarding flow works end-to-end for a real (non-QA) email address | Cannot onboard real Surat suppliers; pilot blocked | Onboarding family closed in Layer 0 with bounded-deferred-remainder for reused-user path | End-to-end test with a real Surat supplier email before pilot outreach | P0 | OPEN |
| HD-002 | Public B2C browse requires real supplier product data | Public buyers see real Surat textile products | Real supplier has seeded product catalog in production | Buyers see QA placeholder data or empty browse; trust damage | No real product data in production as of skeleton date | Seed ≥10 real Surat supplier products before any public outreach | P0 | OPEN |
| HD-003 | Inquiry response requires supplier to receive and respond | Buyer submits inquiry → supplier is aware and responds | Supplier is onboarded, trained, and watching notifications | No inquiry loop completion; buyer drops off; no pilot proof | Inquiry DB submission verified; supplier awareness not verified | Train first 5 Surat pilot suppliers on inquiry notification handling before any public link is shared | P0 | OPEN |
| HD-004 | Control plane operator capability requires platform-ops unit | Paresh can activate real tenants, handle onboarding exceptions, and audit events | Control plane tenant ops implementation is complete | Paresh cannot unblock stuck onboarding; no visibility into launch-day issues | PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md defines boundary; no implementation unit open yet | Open CONTROL-PLANE-TENANT-OPERATIONS implementation before first real tenant onboarding | P0 | OPEN |
| HD-005 | DPP passport on public product detail requires publicPassportId | Supplier's product shows passport link on public product detail page | DPP passport has been issued and publicPassportId is set for that product | Passport link silently absent; trust signal not shown | DPP is PRODUCTION_VERIFIED with conditional rendering; HOLD_FOR_PARESH_DECISION on launch gate | Resolve DPP launch gate decision; decide whether Surat pilot includes DPP | P1 | OPEN |
| HD-006 | Product sitemap expansion requires canonical strategy first | Dynamic product pages appear in sitemap | ~~`PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` is decided and implemented~~ **GATE SATISFIED (2026-07-22):** Strategy is now defined; app.texqtic.com confirmed as canonical; product detail canonical URL pattern is `/product/:slug` under `https://app.texqtic.com`. Remaining gates for sitemap expansion: HD-002 (real product data in production) + D-009 (product count threshold decision). | Dynamic product pages not in sitemap; SEO upside of individual pages missed at launch | Canonical strategy defined by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`; expansion gated by HD-002 + D-009 (both OPEN) | Proceed to FTR-SEO-002 when HD-002 and D-009 are resolved | P1 | OPEN |

---

## 5. Risks

| ID | Category | Title | Description | Impact | Current evidence | Mitigation | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| R-001 | LEGAL | TTP counsel feedback delay | External legal counsel review of the upgraded TTP packet (§12–§25) may be slow or produce a blocking finding. If counsel flags a compliance or regulatory issue with TTP's system-of-record model, the entire post-Phase-1 design may require rework. | Post-Phase-1 finance direction blocked; NC commerce incomplete at launch. | Packet sent; HOLD_FOR_COUNSEL_FEEDBACK in Layer 0 | No mitigation within TexQtic scope; expedite counsel engagement; plan launch path that does not require TTP completion. | P2 | OPEN |
| R-002 | GTM | No real textile supplier has seen the product | All verifications have been done with QA data and internal testing. No real Surat textile supplier has seen or used the product. The product may fail basic usability or trust requirements that only real users would surface. | Pilot launch fails; suppliers don't engage; no proof pack possible. | By design — QA-first sequence has been correct; now transitioning to real-user validation | Schedule Paresh's first in-person Surat demo before any wider outreach | P0 | OPEN |
| R-003 | INFRASTRUCTURE | Supabase/Vercel cold-start latency at pilot load | Vercel serverless + Supabase pooler have demonstrated timeout behavior at minimal load (NC Tx timeout fixed). At pilot load (even 30–50 suppliers + occasional buyers), cold-start and pooler latency may cause user-visible errors. | Slow or failing page loads; user abandonment at first real use. | Tx timeout fix applied; no load testing documented | Add basic load/performance smoke test before Surat pilot kickoff | P1 | OPEN |
| R-004 | DATA | RLS policies have not been tested under real multi-tenant load | All RLS testing has been against QA tenants. Real multi-tenant behavior (multiple real org_ids, concurrent writes) has not been validated. | Cross-tenant data leak at real multi-tenant load; catastrophic trust failure. | RLS policies in place; all tests pass against QA data | Conduct a dual-tenant integration smoke test with two independent real orgs before first real supplier beyond the pilot cell | P0 | OPEN |
| R-005 | OVERCONFIDENCE | "Production verified" in governance ≠ "real users tested it" | Several units are marked `PRODUCTION_VERIFIED` based on QA-data checks and governance sign-off. None of the public-facing flows have been used by a real external user. Production verification is necessary but not sufficient for launch readiness. | Hidden UX/trust gaps emerge at real launch; no early warning signal. | Pattern is inherent in QA-first governance approach | Schedule Paresh's real-user test run (as a supplier and as a buyer) before pilot outreach; document what breaks | P0 | OPEN |
| R-006 | LEGAL | Inquiry form has no visible privacy/consent disclosure | The current public inquiry form collects buyer name, company, and message. No privacy disclosure or consent statement is visible. In an EU buyer context (or GDPR-adjacent), this is a compliance risk. | Regulatory exposure; liability if an EU buyer objects to data collection without consent. | No privacy disclosure in inquiry form found in existing units. PRIT-011 confirmed MVP_CRITICAL/P1 in `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` (2026-05-19); addressed in FAM-03 cycle. | Add minimal consent disclosure before any press, paid acquisition, or buyer-facing SEO | P1 | OPEN |
| R-007 | DEPENDENCY | White Label Co hold could affect B2C surface later | WL Co hold (`REVIEW-UNKNOWN`) is currently scoped as non-blocking for B2C browse and D2C public slice. However, if a future B2C or D2C feature requires brand-surface, domain/routing, or identity changes, WL Co hold could resurface as a blocker. | WL Co hold blocks future surface enhancement during pilot; complicates B2C evolution. | WL Co hold is contained by each slice's non-blocking confirmation; documented in BLOCKED.md | Before any future B2C or D2C feature that touches brand-surface/domain/routing/identity, run fresh WL Co reassessment | P2 | WATCH |
| R-008 | COMMERCE | Payment implementation without merchant/settlement model decided | D-012 (merchant-of-record / settlement model) is unresolved. If a family cycle attempts to implement B2C or D2C checkout before D-012 is decided, the payment architecture, GST/TCS treatment, refund model, and platform liability will all be wrong. | Checkout implemented with incorrect settlement model; rework post-counsel feedback; regulatory/financial exposure. | D-012 parked in DECISION-PARKING-LOT.md; methodology §6.2 / §7.2 explicitly freeze B2C/D2C checkout until D-012 resolves | Enforce D-012 resolution as a hard family cycle gate before ANY B2C/D2C checkout, gateway, or cart-to-payment implementation begins | P1 | OPEN |
| R-009 | COMMERCE | B2B family cycles drift into financial transaction handling | FAM-12 (RFQ/award), FAM-13, FAM-14, FAM-15 (invoices), and FAM-16 (TTP) all touch commercial workflows. An inadvertent or incremental drift — adding "payment collection", "fund hold", or "auto-deduction" logic — would breach the B2B no-platform-financial-transaction guardrail (PRIT-030). | Platform collects buyer payment for supplier without legal/regulatory structure; significant financial and regulatory exposure. | PRIT-030 confirmed as CONFIRMED_BOUNDARY; methodology §5 and §11 freeze enforced | At every B2B family cycle opening, explicitly verify compliance with B2B financial boundary guardrail; include as mandatory gate in opening section | P1 | OPEN |
| R-010 | COMMERCE | Commission policy unclear before checkout/order implementation | No commission policy exists for B2C or D2C transactions (D-013, D-014 both PARKED). If checkout is implemented with a placeholder commission rate (e.g. "0%" or "will add later"), that placeholder may propagate to order records, supplier statements, and audit logs before the actual policy is decided. Correcting it post-launch is difficult. | Incorrect commission records in orders/invoices; supplier disputes; requires retroactive data correction. | D-013 and D-014 parked; methodology §8 and §11 explicitly freeze commission implementation | Do not add ANY commission field, calculation, or deduction logic to checkout/order flows until D-013/D-014 resolve | P2 | OPEN |
| R-011 | COMMERCE | Razorpay integration before refund/cancellation/accounting policy | Payment gateway integration without a defined refund policy, cancellation window, and accounting/audit trail creates unresolvable financial inconsistencies once real transactions occur. India FEMA/GST/TCS obligations require matching debit/credit records from first transaction. | Cannot process refunds correctly; audit trail failures; GST/TCS exposure; consumer protection liability. | D-015 parked; methodology §4.3 lists 7 prerequisites that must all be satisfied before any gateway integration | Enforce all 7 §4.3 prerequisites as a hard gate — treat the absence of any one prerequisite as a blocker | P1 | OPEN |
| R-012 | COMMERCE | Subscription gating implemented before tier model decided | FAM-11 needs to implement commercial gating. If entitlement enforcement is built against an assumed tier model before D-011 resolves, the tier-to-feature mapping, gate enforcement logic, and upgrade flows will all be wrong. | Entitlement logic hard-coded to wrong tier assumptions; requires full rework when real tier model is decided. | D-011 parked; methodology §3 confirms FREE at pilot / self-serve POST_MVP | FAM-11 pilot cycle must only implement FREE tier operator-assigned gating; no self-serve upgrade or tier-boundary enforcement until D-011 resolves | P2 | OPEN |
| R-013 | GOVERNANCE | Notification classification conflict: ROADMAP row 26 = POST_MVP, CHECKLIST I-4 = P0 | MVP-LAUNCH-READINESS-ROADMAP.md row 26 classifies messaging/notifications as NOT_ASSESSED/P3/POST_MVP. MVP-MUST-HAVES-CHECKLIST.md I-4 classifies "Inquiry notification reaches supplier/admin" as NOT_ASSESSED/P0. These are the same capability at opposite priority levels across two TLRH documents. If the ROADMAP classification is used during planning, I-4 P0 will be deprioritized or missed. BS-002 captures notification delivery risk but not this classification conflict. | I-4 P0 item missed or deferred during family planning; inquiry notification never implemented; inquiry loop incomplete at launch. | MVP-LAUNCH-READINESS-ROADMAP.md row 26; MVP-MUST-HAVES-CHECKLIST.md I-4 | Paresh must resolve the conflict before TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001 opens. Options: (a) reclassify ROADMAP row 26 as P1/MVP_CRITICAL to match I-4; (b) reclassify I-4 to P3/POST_MVP and accept inquiry loop is incomplete at pilot. No family planning should use either document without this being resolved. | P1 | RESOLVED — `TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001` (2026-07-14) resolved by split-scope classification; confirmed by `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` (Decision A, 2026-05-19). Scope A (full/general messaging platform) = POST_MVP/P3, remains ROADMAP row 26. Scope B (minimum inquiry notification loop) = MVP_CRITICAL/P1, recorded as CHECKLIST I-4 and PRIT-033/FTR-B2C-004. Both documents updated. FTR-B2C-004 is a hard soft-launch blocker before buyer outreach. BS-002 (delivery risk) remains OPEN until notification is implemented and production-verified. No further escalation to Paresh required. |
| R-014 | GOVERNANCE | Cart code in repo ungoverned — implicit design decisions without a governing unit | Cart.tsx, cartService.ts, admin-cart-summaries.ts, and CartSummariesPanel.tsx exist with a MarketplaceCartSummary Prisma model. This code contains implicit design decisions (cart data model, cart_id cursor, admin visibility scope, cart lifecycle) that are not documented in any governing unit. A family cycle opening that audits the buyer commerce surface will encounter this code with no authoritative design artifact to compare against. | Family cycle discovers cart architecture conflicts with chosen design; rework required mid-cycle; scope creep. | MISSING-FAMILY-AND-FEATURE-SCAN.md §4 repo inspection; PRIT-032 added | Add PRIT-032 (done by this scan); assign cart surface governance to an appropriate family cycle; ensure family opening audit explicitly inspects Cart.tsx, cartService.ts, MarketplaceCartSummary schema before proposing design | P2 | OPEN |
| R-015 | LAUNCH | Aggregator directory promoted before supplier consent / profile completeness | The B2B/aggregator directory is PRODUCTION_VERIFIED (FAM-01) and publicly accessible. If Paresh begins promoting the directory or sharing links with real buyers before supplier profiles are complete, supplier privacy consent is recorded (PRIT-034), and inquiry notification loop is operational (FTR-B2C-004), the result could be: buyers discovering incomplete or unconsented supplier profiles; GDPR/DPDP compliance exposure from data displayed without consent; failed inquiries that receive no supplier response; trust damage that cannot be undone. This risk is specifically created by the soft-launch timeline where the directory surface is live before all soft-launch prerequisites are met. | Compliance exposure (DPDP/GDPR); supplier trust damage; buyer inquiry failures with no response; TexQtic credibility damage at earliest real-user touchpoints. | `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` §19 identified; directory promotion prerequisites in §10 (A-checklist). | Gate directory promotion behind §8 and §9 checklists (S-1 through S-9 and B-1 through B-7). Do not share directory links with real buyers until PRIT-034 legal pages live, FTR-B2C-004 notification loop operational, and at least 5 real supplier profiles complete. | P1 | OPEN |

---

## 6. Resolved Items (History)

| ID | Title | Resolution | Closed Date |
|---|---|---|---|
| HIST-R-001 | NC RFQ issue Tx timeout | Fix applied; PRODUCTION_VERIFIED | 2026-06-08 |
| HIST-R-002 | NC feature flag semantics (gate !== true) | Fixed to `=== false`; all tests PASS | 2026-06-02 |
| HIST-R-003 | NC remote DB migration state mismatch | RESOLVED by DEPLOYMENT-RESOLUTION-001 | 2026-05-12 |
| BS-007 | Live public pages indexed under app.texqtic.com — canonical domain not yet decided | RESOLVED — Option F marketing repo lock confirms app.texqtic.com is correct and intentional canonical domain for all dynamic marketplace public pages; D-005 CLOSED by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` | 2026-07-22 |

---

## 7. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created; initial blind spots, hidden deps, and risks populated from repo inspection | Copilot/Design unit |
| 2026-07-14 | Added R-013 (notification ROADMAP/CHECKLIST classification conflict) and R-014 (cart code ungoverned) from `TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001` | `TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001` |
| 2026-07-14 | R-013 marked MITIGATED: split-scope resolution (Scope A full platform POST_MVP/P3; Scope B minimum inquiry notification MVP_CRITICAL/P1); ROADMAP row 26 and CHECKLIST I-4 updated | `TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001` |
| 2026-07-14 | Added BS-007 (canonical domain already indexed under app.texqtic.com — split authority risk if apex is intended canonical) | `PUBLIC-SEO-PENDING-WORK-REGISTER-SYNC-001` |
| 2026-05-19 | Added R-008 through R-012 (commerce/subscription/payments blind-spot risks) from `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` | `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` |
| 2026-05-19 | R-013 updated MITIGATED → RESOLVED: split-scope classification confirmed by `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` Decision A; FTR-B2C-004 confirmed as hard soft-launch blocker. Added R-015 (aggregator directory exposure before supplier consent/profile completeness). | `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` |
| 2026-07-22 | BS-007 updated OPEN → RESOLVED: Option F marketing repo lock confirms app.texqtic.com is correct and intentional canonical domain; no domain migration required; D-005 CLOSED by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`. HD-006 canonical strategy gate SATISFIED: D-005 strategy defined; remaining expansion gates are HD-002 (real product data) and D-009 (threshold decision). | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` |
