# Decision Parking Lot

**Hub:** `governance/launch-readiness/`
**Status:** SKELETON — PENDING POPULATION
**Population unit:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`
**Last updated:** 2026-05-19 (skeleton created)
**Design authority:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

---

> **SKELETON NOTE**
>
> This document captures known decisions that are explicitly parked — not yet ready to make,
> but too important to lose. Known parked decisions have been populated from repo inspection
> of governance/control/NEXT-ACTION.md, BLOCKED.md, and closed units.
> Additional entries will be added in `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`.

---

## 1. Purpose

The Decision Parking Lot captures explicit decisions that:
- Are known and identified
- Cannot or should not be made yet
- Have a defined trigger condition that will make them ready to decide

**This is not a backlog of implementation tasks.** Each entry is a specific **decision**
that Paresh must make. Implementations depend on these decisions.

**Governance rule:** A decision in this register cannot be made implicitly by implementation.
If an implementation unit would force or imply a parked decision, it must first be removed
from the parking lot by an explicit written decision by Paresh.

---

## 2. Register Schema

Each entry has:
- **ID**: sequential; never reused
- **Decision question**: the specific question that needs an answer
- **Context**: why this decision exists and what it depends on
- **Why not ready**: what makes this decision premature right now
- **Trigger condition**: what event or information would make this decision ready
- **Impact of delaying**: what happens if this is not decided before launch
- **Who decides**: always Paresh; may include external input (counsel, partner, advisor)
- **Priority**: `P0` / `P1` / `P2` / `P3`
- **Status**: `PARKED` / `IN_PROGRESS` / `DECIDED` / `CANCELLED`

---

## 3. Decision Register

### D-001: DPP Passport Network Launch Authorization

| Field | Value |
|---|---|
| **Decision question** | Should TexQtic publicly launch the DPP Passport Network feature and activate it for real supplier products at the Surat pilot? |
| **Context** | DPP Passport is marked `PRODUCTION_READY` per PROD-AUDIT-002. It is fully implemented and production-verified. However, launch authorization is `HOLD_FOR_PARESH_DECISION`. The feature is conditionally rendered (if publicPassportId exists on a product, the passport link shows). The hold exists because publicly announcing DPP as a capability carries trust and messaging implications. |
| **Why not ready** | Paresh has not yet made the decision on whether DPP is a pilot launch feature or a post-pilot announcement. |
| **Trigger condition** | Paresh decides the pilot GTM messaging strategy. If DPP is part of the pilot pitch, it should be in the proof pack. If not, it should remain invisible. |
| **Impact of delaying** | Missed trust signal opportunity if Surat pilot suppliers have DPP-eligible products. No platform breakage. |
| **Who decides** | Paresh (product + GTM decision) |
| **Priority** | P1 |
| **Status** | PARKED |

---

### D-002: TradeTrust Pay Activation Scope

| Field | Value |
|---|---|
| **Decision question** | After legal counsel reviews the upgraded TTP packet, what is the scope of TradeTrust Pay activation: full design as specified, partial, or alternative approach? |
| **Context** | `HOLD_FOR_COUNSEL_FEEDBACK` in Layer 0. External counsel has received the upgraded TTP packet (§12–§25). Their feedback determines whether TTP's system-of-record model is compliant and commercially safe. |
| **Why not ready** | External counsel review is pending. No decision can be made before their feedback is received. |
| **Trigger condition** | External counsel provides written feedback on TTP packet. |
| **Impact of delaying** | Post-Phase-1 NC finance direction remains undefined. Does not block MVP. |
| **Who decides** | Paresh + external legal counsel |
| **Priority** | P2 |
| **Status** | PARKED |

---

### D-003: Supplier Quote Feature Flag Activation (QD-6)

| Field | Value |
|---|---|
| **Decision question** | Should the `nc.procurement_pools.supplier_quotes.enabled` flag be activated in production? If so, for which tenant(s) and at what stage? |
| **Context** | QD-6 hold: supplier quote feature flag has been held at `false` in production. The hold was explicitly maintained through the NC Phase 1 audit. The flag controls whether suppliers can respond to RFQs with structured quotes. |
| **Why not ready** | No explicit readiness criteria for QD-6 activation have been defined. Activation requires the full supplier quote → award loop to be working (award maker-checker implementation is not yet authorized). |
| **Trigger condition** | Award maker-checker implementation is authorized AND completed. Paresh decides QD-6 is safe to activate for first real tenant. |
| **Impact of delaying** | NC commerce loop remains incomplete; buyers cannot receive structured quotes. Does not block MVP. |
| **Who decides** | Paresh |
| **Priority** | P2 |
| **Status** | PARKED |

---

### D-004: B2C–D2C Boundary

| Field | Value |
|---|---|
| **Decision question** | Where exactly does B2C product discovery end and D2C collection/supplier journey begin in a single buyer experience? How should navigation, breadcrumbs, and CTAs reflect this boundary? |
| **Context** | `B2C-D2C-BOUNDARY-DECISION-001` is `PENDING` in the B2C tracker. Both surfaces are live. A buyer can go from /products → /product/:slug → /collections → /collections/:slug without a clear sense of where they are. This boundary matters for UX, SEO, and future cart/checkout scope. |
| **Why not ready** | No user research; no UX design review; no real buyer behavior data yet. |
| **Trigger condition** | Pilot produces first 50+ buyer sessions with navigation data. Paresh reviews and defines the boundary based on real user behavior. |
| **Impact of delaying** | Suboptimal buyer navigation; not a launch blocker. May affect inquiry conversion rate. |
| **Who decides** | Paresh (product decision based on pilot data) |
| **Priority** | P2 |
| **Status** | PARKED |

---

### D-005: SEO Domain Canonical Strategy

| Field | Value |
|---|---|
| **Decision question** | What is the canonical URL strategy for TexQtic? (apex vs. www; subdomain routing; cross-environment canonical handling; redirect policy) |
| **Context** | Explicitly deferred by `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001`. Deferred unit: `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`. This decision gates product sitemap expansion and supplier profile indexability. |
| **Why not ready** | ~~Domain decision is pending. Without knowing the final production domain setup, canonical tags cannot be finalized.~~ |
| **Trigger condition** | Paresh confirms production domain setup (apex vs. www; any custom domain plan). **SATISFIED** by Option F marketing repo lock: `MARKETING-APP-PUBLIC-PAGES-DOMAIN-SEPARATION-DECISION-LOCK-001` (commits 0bed542, 3246ca4, fa5d54e). Option F confirms `PLATFORM_APP_URL = https://app.texqtic.com` and establishes `app.texqtic.com` as the canonical platform app domain. |
| **Impact of delaying** | ~~SEO upside of dynamic product pages and supplier profiles is not realized~~ — resolved. |
| **Who decides** | Paresh — **Resolved via Option F lock.** |
| **Priority** | P1 |
| **Status** | **CLOSED — STRATEGY_DEFINED (2026-07-22).** `app.texqtic.com` is the canonical domain for all dynamic marketplace public pages. `texqtic.com` is the separate marketing domain. No redirect policy change needed. Existing sitemap.xml, robots.txt, and canonical tag implementation confirmed correct under Option F by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` repo-truth inspection. Strategy artifact: `governance/launch-readiness/PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY.md`. |
| **PRIT cross-ref** | PRIT-016 confirmed as LAUNCH_DEPENDENCY/P1 in `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` (2026-05-19). Canonical target DECIDED: `app.texqtic.com`. Closed by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` (2026-07-22). |

---

### D-006: White Label Co Hold Resolution

| Field | Value |
|---|---|
| **Decision question** | Should the `EXACT_EXCEPTION_STILL_REMAINS` hold on White Label Co be resolved, maintained, or cancelled? What is the specific exception and how should it be handled? |
| **Context** | `White Label Co` is under `REVIEW-UNKNOWN` in `BLOCKED.md` with status `EXACT_EXCEPTION_STILL_REMAINS`. This was explicitly non-blocking for MVP and for all current B2C/D2C slices. However, the exception is unresolved. |
| **Why not ready** | The original exception context may require an external partner decision or legal review. The exact nature of the exception is `REVIEW-UNKNOWN`. |
| **Trigger condition** | Paresh investigates the original exception source and either resolves it, cancels WL Co, or escalates to partner/counsel. |
| **Impact of delaying** | No MVP impact. WL Co is post-MVP. But the unknown exception could surface as a surprise during any future WL Co implementation. |
| **Who decides** | Paresh (may require external partner or counsel input) |
| **Priority** | P3 |
| **Status** | PARKED |

---

### D-007: G-022 Decision

| Field | Value |
|---|---|
| **Decision question** | What is the decision for G-022? (Referenced in NEXT-ACTION.md as `HOLD_FOR_PARESH_DECISION UNCHANGED`) |
| **Context** | G-022 appears in NEXT-ACTION.md under governance items that remain at `HOLD_FOR_PARESH_DECISION`. The specific G-022 context requires inspection. |
| **Why not ready** | Requires Paresh to identify and review G-022 context. |
| **Trigger condition** | Paresh reviews G-022 source unit or decision record. |
| **Impact of delaying** | Unknown until G-022 context is identified. |
| **Who decides** | Paresh |
| **Priority** | P2 |
| **Status** | PARKED — REQUIRES G-022 CONTEXT INSPECTION |

---

### D-008: Subscription / Commercial Packaging

| Field | Value |
|---|---|
| **Decision question** | What is the commercial model for TexQtic post-pilot? (Free tier, freemium, per-supplier subscription, transaction fee, platform commission, enterprise licensing) |
| **Context** | No commercial packaging or subscription model has been defined in any governance unit. Pilot suppliers will be invited free. The commercial model decision is post-MVP but must be made before the first paid customer or investor pitch. |
| **Why not ready** | Requires pilot data to understand willingness-to-pay. Requires TTP counsel feedback for finance-layer commercial model. |
| **Trigger condition** | Pilot proof pack complete; at least 5 pilot suppliers with real engagement; Paresh is ready to pitch. |
| **Impact of delaying** | No MVP impact. Must be decided before any paid customer engagement or fundraise. |
| **Who decides** | Paresh |
| **Priority** | P3 |
| **Status** | PARKED |
| **PRIT cross-ref** | PRIT-018 confirmed POST_MVP in `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` (2026-05-19). Pilot can launch free/manual provisioning. Self-serve commercial packaging not required for MVP. Status remains PARKED pending pilot proof pack. |

---

### D-009: Product Sitemap Expansion Threshold

| Field | Value |
|---|---|
| **Decision question** | At what product count, quality threshold, or event should individual product detail pages be added to sitemap.xml? |
| **Context** | Deferred by `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001` to `PUBLIC-SEO-PRODUCT-SITEMAP-EXPANSION-001`. The question is: once the canonical strategy is decided, what triggers expansion? (e.g., after 50 real products? after first press mention? after GSC shows crawl demand?) |
| **Why not ready** | Requires domain canonical strategy decision (D-005) first. Requires real product data to exist. |
| **Trigger condition** | D-005 decided + at least 30 real products live in production. |
| **Impact of delaying** | Dynamic product pages not in sitemap; reduced SEO discoverability at launch. |
| **Who decides** | Paresh |
| **Priority** | P2 |
| **Status** | PARKED |

---

### D-010: Supplier Profile Publication and Indexability Policy

| Field | Value |
|---|---|
| **Decision question** | Under what conditions is a supplier's profile page publicly indexable? What publication consent gate is required? What minimum profile completeness must a supplier reach before their profile is publicly searchable? |
| **Context** | `/supplier/:slug` route exists as a noindex stub. For this to become an SEO-indexed supplier directory, TexQtic needs a defined policy on: (1) does the supplier consent to being publicly searchable at onboarding; (2) what minimum profile fields trigger indexability; (3) what is the opt-out mechanism; (4) what privacy implications exist (GDPR, India DPDP). This is explicitly gated by `PUBLIC-SEO-SUPPLIER-PROFILE-INDEXABILITY-001` and `FTR-SEO-003`. |
| **Why not ready** | No Surat pilot supplier has been onboarded. No supplier agreement language covers public profile consent. Supplier expectations about public discoverability have not been explored. |
| **Trigger condition** | First real Surat pilot supplier is onboarded. Paresh discusses discoverability expectations with the supplier. Supplier agreement or onboarding flow is reviewed for consent capture. |
| **Impact of delaying** | Cannot implement supplier profile SEO or indexable supplier directory. No supplier keyword coverage in organic search. Not a launch blocker — supplier directory is a LAUNCH_DEPENDENCY, not MVP_CRITICAL. |
| **Who decides** | Paresh (product + legal policy decision; may require supplier consent review) |
| **Priority** | P2 |
| **Status** | PARKED |
| **PRIT cross-ref** | PRIT-019 confirmed opt-in only during Surat pilot in `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` (2026-05-19). No default indexing of supplier profiles. Policy direction partial — full supplier consent policy still pending. Status remains PARKED. |

---

### D-011: Subscription Tier Pricing, Entitlement Model, and Self-Serve Billing

| Field | Value |
|---|---|
| **Decision question** | What are the final tier boundaries, feature entitlements, and pricing for FREE/STARTER/PROFESSIONAL/ENTERPRISE plans? What is the self-serve upgrade/downgrade and billing cycle model? What is the grace period and deactivation policy? |
| **Context** | Plan tier infrastructure (FREE/STARTER/PROFESSIONAL/ENTERPRISE) exists from Subscription Slice 4A (2026-04-15). However, no self-serve billing, upgrade flow, or enforcement per entitlement is implemented. Pilot launches with FREE tier, operator-provisioned. Self-serve commercial packaging is POST_MVP per PRIT-018 / PRIT-028. |
| **Why not ready** | Paresh has not yet defined per-tier feature entitlement scope. Pricing for STARTER/PROFESSIONAL/ENTERPRISE not decided. India SaaS GST treatment requires counsel/CA input. Razorpay KYC for subscription billing overlaps with D-015. |
| **Trigger condition** | Paresh defines pilot-to-production commercial packaging plan. Post-MVP only unless Paresh explicitly advances scope. |
| **Impact of delaying** | FAM-11 self-serve billing cannot be implemented. Pilot proceeds as FREE/operator-assigned. No commercial impact at pilot launch. |
| **Who decides** | Paresh (pricing + product decision); counsel/CA for India SaaS GST treatment |
| **Priority** | P2 |
| **Status** | PARTIALLY_RESOLVED_WITH_IMPLEMENTATION_AUTHORIZATION_SUPPLIED — D12A advance (2026-06-04): FAM-13B-D12A-PAYMENT-IMPLEMENTATION-AUTHORIZATION-DECISION-001. D12 advance (2026-06-04): FAM-13B-D12-PUBLIC-PRICE-DISPLAY-AND-PAYMENT-IMPLEMENTATION-READINESS-REVIEW-001. Items resolved/advanced: (1) first paid tier = STARTER (D1); (3) billing cycle = MONTHLY at launch; annual billing EXPLICITLY DEFERRED — no CA-approved annual equivalents in repo truth; annual can resume when CA confirms annual price equivalents + public-display authorization in a future unit. (4) GST display rule CA-CONFIRMED: SAC 998315, 18% GST, exclusive display (D2). (5) grace period = 3 days (D1). (6) non-payment action = downgrade to FREE, preserve data (D1). Item 2 advance (D12): PUBLIC_DISPLAY_APPROVED — CA explicit public-display authorization NOW CONFIRMED in D12; approved format = `Price + 18% GST`; GST exclusive; price displayed excluding GST; 18% GST shown separately; public pricing page UNBLOCKED for `Price + 18% GST` format. Operative prices (STARTER ₹2,499/mo, PROFESSIONAL ₹4,999/mo) now approved for public display in `Price + 18% GST` format. PR-08 caveat updated: COMPLETE_WITH_PRIVATE_PRICING → COMPLETE_WITH_PUBLIC_DISPLAY_APPROVED (2026-06-04). Annual billing remains DEFERRED (no CA-approved annual price equivalents supplied). D12A advance (2026-06-04): Implementation authorization NOW SUPPLIED — Paresh explicitly authorized opening FTU-COMM-002 for first design unit (FTU-COMM-002A): "Paresh authorizes opening FTU-COMM-002 for the first public-price-display Razorpay payment implementation design unit." Implementation gate: OPEN for FTU-COMM-002A design unit. Item 7: feature entitlement scope per tier NOT yet supplied — still PARKED; required before FAM-11 self-serve billing implementation. D-011 full resolution still requires: feature entitlement scope defined by Paresh (item 7) + actual STARTER payment implementation complete. FTU-COMM-002A advance (2026-06-04): REPO-TRUTH DESIGN COMPLETE — FTU-COMM-002A-RAZORPAY-ZOHO-PUBLIC-DISPLAY-PRICING-REPO-TRUTH-DESIGN-001 VERIFIED_COMPLETE. Zero Razorpay/Zoho source confirmed; clean-slate design produced; recommended first slice Option A (public pricing display; config/entitlementDisplay.ts + PublicPricingPage.tsx; no backend/checkout changes); next unit FTU-COMM-002B. Item 7 still PARKED. Annual billing still DEFERRED. |
| **PRIT cross-ref** | PRIT-028 (subscription tier entitlement); source unit: `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` |

---

### D-012: B2C/D2C Merchant-of-Record and Settlement Model

| Field | Value |
|---|---|
| **Decision question** | Is TexQtic the merchant-of-record for B2C and D2C transactions? Or does TexQtic operate as a marketplace/referral platform with the supplier as merchant-of-record? What is the settlement model — direct-to-supplier or via TexQtic pooled settlement? |
| **Context** | B2C checkout boundary is confirmed as downstream-authenticated per `TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1.md`. However, who settles the payment and how is entirely unresolved. The merchant-of-record determination affects: legal entity structuring, Razorpay configuration, GST/TCS liability, refund handling, and platform liability exposure. |
| **Why not ready** | No legal/accounting review of India ecommerce tax compliance (TCS under section 194-O, GST), India-specific merchant-of-record requirements, platform liability, or Razorpay settlement configuration performed. |
| **Trigger condition** | Before ANY B2C or D2C checkout implementation begins. This is a hard prerequisite. |
| **Impact of delaying** | B2C checkout, D2C commerce, FAM-15 (invoices/settlement), and FAM-11 commercial billing are all blocked until this is resolved. |
| **Who decides** | Paresh + counsel/CA (legal/accounting decision; significant financial and regulatory implications) |
| **Priority** | P1 — hard gate before B2C/D2C checkout implementation |
| **Status** | PARTIALLY_RESOLVED (SaaS scope) — founder decisions supplied 2026-06-03 via FAM-13B-D1. SaaS items resolved: (1) MoR = TexQtic entity; (2) marketplace = DEFERRED, permanently separate track; (3) SaaS settlement = single-entity TexQtic collection; (5) SaaS vs marketplace separation = permanent. Item 4: India CA review — CA_CONFIRMED_PARTIAL (2026-06-03 via FAM-13B-D2): SaaS SAC/GST confirmed (SAC 998315, 18%); marketplace payment collection formally deferred at MVP; ECO/TCS obligations NOT activated at MVP. Must recheck CA/counsel before any future marketplace payment collection, Razorpay Route, or supplier settlement track. D-012 for marketplace transaction track remains fully PARKED and deferred. |
| **PRIT cross-ref** | PRIT-029, PRIT-031; source unit: `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` |

---

### D-013: B2C Commission/Deduction Policy

| Field | Value |
|---|---|
| **Decision question** | Does TexQtic charge a commission on B2C transactions? If yes, what percentage, deduction timing, and payout waterfall? What is the policy for returns, refunds, and disputes? |
| **Context** | No B2C commission policy exists anywhere in the platform. Referral model and merchant-of-record model imply very different commission structures. Decision is meaningless until D-012 (merchant-of-record) resolves. |
| **Why not ready** | D-012 must resolve first. No supplier terms for commission have been created. |
| **Trigger condition** | After D-012 resolves and B2C checkout design begins. |
| **Impact of delaying** | No B2C commission logic can be built. Checkout can proceed without commission (pass-through) as an interim posture if Paresh authorizes. |
| **Who decides** | Paresh (product and pricing decision); counsel/CA for contract terms and TDS/GST obligations |
| **Priority** | P2 |
| **Status** | PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW |
| **PRIT cross-ref** | PRIT-031; source unit: `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` |

---

### D-014: D2C Commission/Deduction Policy

| Field | Value |
|---|---|
| **Decision question** | Does TexQtic charge a commission on D2C transactions? If yes, what percentage, deduction timing, and payout waterfall? How does this differ from B2C commission (if at all)? |
| **Context** | D2C public surface is PRODUCTION_VERIFIED for collections browse. D2C authenticated commerce (post-auth cart/checkout) is deferred. Commission policy is meaningless until D-012 resolves. D2C may warrant a different commission model than B2C given artisan/heritage commerce context. |
| **Why not ready** | D-012 must resolve first. D2C authenticated commerce cycle has not opened. |
| **Trigger condition** | After D-012 resolves and D2C commerce family cycle is selected. |
| **Impact of delaying** | No D2C commission logic can be built. D2C collections browse continues unaffected. |
| **Who decides** | Paresh (product and pricing decision); counsel/CA for contract terms and TDS/GST obligations |
| **Priority** | P2 |
| **Status** | PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW |
| **PRIT cross-ref** | PRIT-031; source unit: `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` |

---

### D-015: Razorpay/Payment Gateway Platform Adoption Decision

| Field | Value |
|---|—|
| **Decision question** | Should TexQtic adopt Razorpay (or an alternative gateway) for payment processing? If yes, for which use cases (B2C checkout, D2C checkout, subscription billing, TTP-gated B2B, or some combination)? When in the product lifecycle is gateway integration appropriate? |
| **Context** | No payment gateway integration exists anywhere in TexQtic. Razorpay is the candidate based on India market fit. Five candidate use cases are identified in `COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md §4.2`. All are blocked until seven prerequisites (§4.3) are satisfied, including D-012 (merchant-of-record), settlement model, counsel/CA review, refund policy, audit/logging requirements, PCI scope boundary, and KYC. |
| **Why not ready** | All seven §4.3 prerequisites are unresolved. D-012 is the upstream hard gate. No counsel/CA review of payment gateway liability performed. |
| **Trigger condition** | All §4.3 prerequisites satisfied. Paresh authorizes gateway integration for a specific use case. |
| **Impact of delaying** | No payment gateway integration. B2C/D2C checkout and subscription billing cannot proceed to implementation. |
| **Who decides** | Paresh + counsel/CA (legal/accounting/regulatory decision) |
| **Priority** | P2 — DESIGN_GATED until D-012 resolves |
| **Status** | FOUNDER_DECISION_RESOLVED — COUNSEL_REVIEW_PENDING — all Paresh founder inputs supplied 2026-06-03 via FAM-13B-D1: (1) go = YES; (2) product = Razorpay Subscriptions; (3) mode = test mode first; (4) KYC owner = TexQtic company entity; (5) scope = SaaS subscriptions only, STARTER tier first. Legal counsel sign-off on Razorpay operating agreement and all §4.3 prerequisites remain open. D-015 trigger condition (Paresh authorization for specific use case) is SATISFIED. Implementation gate still closed: §4.3 prerequisites PR-03 through PR-08 remain open. |
| **PRIT cross-ref** | PRIT-029; source unit: `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` |

---

### D-016: Soft-Launch B2B Financial Boundary Confirmation

| Field | Value |
|---|---|
| **Decision question** | Confirmed: Does the B2B no-platform-financial-transaction constitutional boundary (PRIT-030) extend to the soft launch period? May TexQtic facilitate supplier-to-buyer financial transactions via the platform during the soft-launch network-building phase? |
| **Context** | B2B commerce surfaces in the repo contain no payment gateway integration. The soft-launch phase involves connecting real Surat supplier contacts with interested buyers via an aggregator directory surface and inquiry flow. No D2C or B2C commerce surface is activated during soft launch. | 
| **Why this was parked** | It was possible that soft-launch network-building activities could be interpreted as requiring some minimal payment/transaction capability to be operational. This decision clarifies the boundary. |
| **Trigger condition** | N/A — confirmed by governance. Reopen only if Paresh explicitly authorizes a payment/transaction surface for B2B during soft launch. |
| **Impact of delaying** | N/A — decision is confirmed. |
| **Who decided** | Paresh (via `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` Decision F) |
| **Priority** | P1 — constitutional guardrail |
| **Status** | CONFIRMED_BOUNDARY — Soft launch is strictly B2B inquiry facilitation only. No platform-held funds. No transaction commission. No checkout surface. The B2B financial boundary (PRIT-030) is in full effect during soft launch. |
| **PRIT cross-ref** | PRIT-030; source unit: `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` §12 Decision F |

---

### D-017: Soft-Launch Provisioning Model (Free / Manual)

| Field | Value |
|---|---|
| **Decision question** | Confirmed: What is the provisioning and pricing model for the first soft-launch cohort of 5–10 Surat suppliers? Are suppliers paying for TexQtic access during the network-building soft launch phase? |
| **Context** | No subscription billing infrastructure exists (D-011 parked; FTU-COMM-001 parked). First family cycle (FAM-06) is not yet opened. Surat pilot suppliers will be personally known contacts of Paresh. |
| **Why this was parked** | It was ambiguous whether the soft launch required a billing or provisioning system to be operational before inviting any real suppliers. |
| **Trigger condition** | N/A — confirmed for soft-launch cohort. Reopen when scaling beyond first cohort or when self-serve upgrade path is required (D-011). |
| **Impact of delaying** | N/A — decision is confirmed. |
| **Who decided** | Paresh (via `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` Decision G) |
| **Priority** | P2 |
| **Status** | CONFIRMED — First soft-launch cohort (5–10 suppliers) will be provisioned manually by Paresh as operator at zero charge. No billing infrastructure required before first cohort. D-011 (subscription tier pricing) remains parked and is not a soft-launch blocker. |
| **PRIT cross-ref** | PRIT-018, PRIT-028; source unit: `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` §12 Decision G |

---

### D-018: PRIT-033 Stage 2 Family Assignment (Supplier Inquiry Inbox)

| Field | Value |
|---|---|
| **Decision question** | Is the full tenant-dashboard supplier inquiry inbox (Stage 2 of PRIT-033) assigned to FAM-03 (Buyer Inquiry and Response) or FAM-08 (Supplier Profile and Content)? |
| **Context** | PRIT-033 split delivery was confirmed by `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` Decision C. Stage 1 (minimum inquiry notification, FTR-B2C-004 / FTR-SL-003) is a soft-launch prerequisite and a standalone unit. Stage 2 (full tenant-dashboard inquiry inbox) is MVP_CRITICAL/P1 for hard launch and requires FAM-06 supplier auth to be complete first. The family assignment of Stage 2 between FAM-03 and FAM-08 is pending auth architecture context from FAM-06. |
| **Why not ready** | FAM-06 has not been opened yet. The inquiry inbox surface definition requires auth architecture context from the FAM-06 opening repo-truth audit to confirm whether it belongs to buyer-side (FAM-03) or supplier-profile-side (FAM-08). |
| **Trigger condition** | FAM-06 opening repo-truth audit complete; auth architecture confirmed; Paresh reviews inquiry inbox scope and assigns Stage 2 to FAM-03 or FAM-08. |
| **Impact of delaying** | Stage 2 supplier inquiry inbox cannot be scoped into a family cycle; PRIT-033 Stage 2 remains floating. Stage 1 (FTR-B2C-004 / FTR-SL-003) is unaffected and may proceed as a standalone unit. |
| **Who decides** | Paresh |
| **Priority** | P1 |
| **Status** | PARKED — awaiting FAM-06 opening audit completion |
| **PRIT cross-ref** | PRIT-033; source unit: `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` Decision C; `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` |

---

### D-019: First Payment Use Case Priority

| Field | Value |
|---|---|
| **Decision question** | Which payment use case should be implemented first? SaaS subscription billing, B2C checkout, D2C checkout, supplier split settlement, or TTP-gated payment? |
| **Context** | FAM-13B identified D-PG-PRIORITY as an unnumbered required input. FAM-13A confirmed no payment integration exists. D-015 (Razorpay adoption) is now FOUNDER_DECISION_RESOLVED. First use case selection determines which design and implementation track to pursue next. |
| **Why this was parked** | No priority input was supplied until FAM-13B-D1 (2026-06-03). |
| **Trigger condition** | N/A — resolved by founder decision supply in FAM-13B-D1. |
| **Impact of delaying** | N/A — resolved. |
| **Who decided** | Paresh (via founder decision supply in `FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001`, 2026-06-03) |
| **Priority** | P1 (for payment track sequencing) |
| **Status** | RESOLVED_FOUNDER_DECISION — SaaS subscription billing for tenant plan upgrades, STARTER tier first. B2C checkout, D2C checkout, supplier split settlement, and TTP payment flows: all DEFERRED (permanently separate tracks). |
| **Cross-reference** | FAM-13B-D1 artifact §5.4, D-015; source: `FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001` |

---

### D-020: Paid Subscription Activation Model

| Field | Value |
|---|---|
| **Decision question** | What is the operational model for activating paid subscription tiers? Which Razorpay product, which mode, which tier first, and how does the in-product upgrade flow trigger subscription creation? |
| **Context** | D-019 confirmed SaaS subscription billing as the first payment use case. D-015 confirmed Razorpay Subscriptions as the product. The activation model covers: which Razorpay product (Subscriptions vs Orders), test vs live mode for initial integration, STARTER tier rollout sequencing, in-app upgrade trigger design, and Razorpay plan ID mapping to TenantPlan enum. |
| **Why not ready** | Founder product/mode decisions supplied 2026-06-03. Activation flow design (UI trigger, plan ID mapping) not yet designed. Requires FTU-COMM-002 design unit. |
| **Trigger condition** | FTU-COMM-002 (RAZORPAY-PAYMENT-GATEWAY-DESIGN-001) design unit opened and all §4.3 prerequisites satisfied. |
| **Impact of delaying** | No Razorpay Subscriptions integration can be implemented. Self-serve upgrade path blocked. |
| **Who decides** | Paresh (product decisions supplied); design unit (technical activation flow design) |
| **Priority** | P2 |
| **Status** | PARTIALLY_RESOLVED — Razorpay Subscriptions product selected; test mode first; STARTER tier first; KYC owner: TexQtic company entity. Activation flow design (items 4–5: in-app upgrade trigger, plan ID mapping to TenantPlan enum) still OPEN — requires FTU-COMM-002 design unit. |
| **Cross-reference** | D-019, D-015, FTU-COMM-002; source: `FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001` |

---

### D-021: SaaS Subscription Refund and Cancellation Policy

| Field | Value |
|---|---|
| **Decision question** | What is the refund and cancellation policy for SaaS subscription billing? What happens when a customer requests a refund within a billing period? What is the cancellation notice period and what entitlements persist after cancellation? |
| **Context** | Razorpay Subscriptions integration requires a defined refund and dispute policy before any live payment processing (§4.3 PR-05). No policy has been defined as of this unit. |
| **Why not ready** | Not supplied in founder decision document. Requires Paresh decision and possibly counsel/CA review for India SaaS refund obligations. |
| **Trigger condition** | Paresh defines refund and cancellation policy. Counsel/CA review if India-specific obligations apply. Required before live mode Razorpay integration. |
| **Impact of delaying** | Live payment processing cannot begin. Test mode setup (no real payments) is unaffected. |
| **Who decides** | Paresh; counsel/CA input recommended |
| **Priority** | P2 (required before live mode; not blocking test mode) |
| **Status** | RESOLVED — FAM-13B-D8 (2026-06-04). Founder-approved refund and cancellation policy recorded. General: non-refundable once paid period begins (named exceptions: duplicate payment, accidental overcharge, technical billing error, failed activation, legally required). Cancellation at period end; no auto pro-rata refund. Annual plan: no refund at launch. Disputes: manual at launch; tenant access not auto-terminated. PR-05 = COMPLETE. |
| **Cross-reference** | §4.3 PR-05; FAM-13B-D8-REFUND-CANCELLATION-POLICY-AND-PR-05-CLOSURE-001; source: `FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001` |

---

### D-022: FREE Pilot Tenant Conversion Policy

| Field | Value |
|---|---|
| **Decision question** | When paid subscription tiers launch, how are existing FREE pilot tenants invited to convert to STARTER? What is the upgrade invitation mechanism, timeline, and any grandfather/grace arrangement for early pilot tenants? |
| **Context** | Current pilot launches with FREE tier, operator-provisioned (D-017 CONFIRMED). When STARTER launches, existing FREE tenants will need a conversion path. Non-payment downgrade policy (STARTER → FREE on grace period expiry) is confirmed. But the reverse — how FREE pilot tenants are invited and encouraged to upgrade — is not defined. |
| **Why not ready** | Upgrade invitation policy was not supplied in founder decision document (non-payment downgrade confirmed; upgrade invitation not addressed). |
| **Trigger condition** | Before STARTER tier goes live. Before any in-product upgrade invitation flow is implemented. |
| **Impact of delaying** | No upgrade invitation or conversion flow can be built. Pilot tenants remain on FREE indefinitely without a defined upgrade path. |
| **Who decides** | Paresh |
| **Priority** | P2 |
| **Status** | PARKED — PARTIALLY_SUPPLIED. Non-payment action defined (downgrade to FREE, preserve data). Pilot tenant upgrade invitation policy not yet defined. |
| **Cross-reference** | D-017 (FREE pilot provisioning), D-020 (activation model); source: `FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001` |

---

### D-026: Reference Preview Buyer Bridge Activation

| Field | Value |
|---|---|
| **Decision question** | Under what conditions should reference-preview surfaces become active buyer inquiry surfaces? |
| **Context** | Static app-side reference previews and Marketing preview routing are production accepted through Unit 053, but they remain preview-only. Brands secondary preview CTA routes users to the app preview hub, not a live marketplace or buyer bridge. |
| **Why not ready** | Real supplier/product data readiness, supplier-context inquiry notification readiness, legal/privacy/terms readiness, and explicit Paresh approval remain pending. |
| **Trigger conditions** | 1. Real supplier/product data readiness approved. 2. Supplier-context inquiry notification readiness verified (FTR-B2C-005). 3. Legal/privacy/terms bundle deployed or explicitly accepted for launch scope (PRIT-034). 4. Paresh explicitly approves buyer bridge activation. |
| **Impact of delaying** | Reference preview surfaces remain preview-only. No buyer inquiry path is active. No commercial supply is implied by current preview state. |
| **Who decides** | Paresh |
| **Priority** | P1 |
| **Status** | PARKED — TRIGGER_CONDITIONS_NOT_MET |
| **Cross-reference** | PRIT-037, FUTURE-TODO-REGISTER §15, external tracker through Unit 053 |

---

### D-027: Live CRM Provisioning Smoke Authorization

| Field | Value |
|---|---|
| **Decision question** | Under what conditions is live CRM provisioning smoke — system-triggered provisioning events flowing from CRM to the platform — authorized? |
| **Context** | CRM provisioning observability is production accepted through Unit 053 as cross-repo launch-readiness status. This means operator visibility and timeline metadata are accepted. It does not authorize live CRM-system-triggered provisioning mutations. The CRM → Platform integration path (WEBHOOK-007 / PRIT-020) remains design-gated. |
| **Rule** | No additional live CRM provisioning smoke is authorized without explicit Paresh written approval. Observability and monitoring are permitted; live provisioning mutations are not. |
| **Why not ready** | WEBHOOK-007 contract and PRIT-020 design gate are not cleared. Any CRM-triggered org creation, entitlement write, tenant mutation, provisioning event, or production smoke could create real operational side effects. |
| **Trigger condition** | Paresh explicitly authorizes a specific, scoped live CRM provisioning smoke in writing after WEBHOOK-007 contract is defined and PRIT-020 design gate clears. |
| **Who decides** | Paresh |
| **Priority** | P1 |
| **Status** | PARKED — APPROVAL_REQUIRED |
| **Cross-reference** | PRIT-020, FUTURE-TODO-REGISTER §15.3, external tracker through Unit 053 |

---

## 4. Decided Items (History)

| ID | Decision question | Outcome | Decided | Date |
|---|---|---|---|---|
| HIST-D-001 | Should NC Phase 1 be production-audited before any further implementation? | YES — audit complete, QA seed reset complete | Paresh | 2026-07-06 |
| HIST-D-002 | Should the NC Tx timeout fix be applied to production? | YES — applied and PRODUCTION_VERIFIED | Paresh | 2026-06-08 |
| HIST-D-003 | Should nc.procurement_pools.feature_flag_gate be `=== false` not `!== true`? | YES — fixed in NC Phase 1 close | Paresh | 2026-06-02 |
| HIST-D-004 | What is the canonical URL strategy for TexQtic? (D-005) | `app.texqtic.com` is the canonical domain for all dynamic marketplace public pages. No redirect policy needed. Existing sitemap.xml and canonical tags confirmed correct under Option F. | Option F marketing repo lock (`MARKETING-APP-PUBLIC-PAGES-DOMAIN-SEPARATION-DECISION-LOCK-001`) + `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` | 2026-07-22 |

---

## 5. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created; D-001 through D-009 populated from repo inspection of NEXT-ACTION.md, BLOCKED.md, and closed governance units | Copilot/Design unit |
| 2026-07-14 | Added D-010 (Supplier Profile Publication and Indexability Policy) — SEO pending work register sync | `PUBLIC-SEO-PENDING-WORK-REGISTER-SYNC-001` |
| 2026-05-19 | Added PRIT cross-reference notes to D-005, D-008, D-010 based on Paresh decisions in `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` | `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` |
| 2026-05-19 | Added D-011 through D-015 from commerce/subscription/payments methodology design unit | `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` |
| 2026-05-19 | Added D-016 (B2B financial boundary soft-launch confirmation — CONFIRMED_BOUNDARY) and D-017 (free/manual provisioning model — CONFIRMED); both confirmed via `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` Decisions F and G | `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` |
| 2026-07-14 | Added D-018 (PRIT-033 Stage 2 supplier inquiry inbox family assignment — FAM-03 vs FAM-08, PARKED pending FAM-06 auth audit) | `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` |
| 2026-07-22 | D-005 (SEO Domain Canonical Strategy) CLOSED: Option F marketing repo lock satisfies trigger condition; app.texqtic.com confirmed as canonical domain for all dynamic marketplace public pages; no redirect policy change needed; existing sitemap.xml, robots.txt, and canonical tag implementation confirmed correct by repo-truth inspection; strategy artifact created. HIST-D-004 added to Decided Items history. | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` |
| 2026-05-25 | Added D-026 (Reference Preview Buyer Bridge Activation — PARKED, TRIGGER_CONDITIONS_NOT_MET): static app-side reference previews and Marketing preview routing are production accepted through Unit 053 but remain preview-only; all four activation gates pending (real supplier/product data readiness, FTR-B2C-005 supplier-context notification, PRIT-034 legal/privacy/terms bundle, explicit Paresh approval). No buyer inquiry path is active; no commercial supply implied by current preview state. | `TLRH-DECISION-D026-BUYER-BRIDGE-SYNC-003A` |
| 2026-05-25 | Added D-027 (Live CRM Provisioning Smoke Authorization — PARKED, APPROVAL_REQUIRED): CRM provisioning observability is production accepted through Unit 053 but does not authorize live CRM-system-triggered provisioning mutations; WEBHOOK-007 / PRIT-020 remain design-gated; no further live CRM provisioning smoke authorized without explicit Paresh written approval. | `TLRH-DECISION-D027-CRM-SMOKE-GATE-SYNC-003C` |
| 2026-06-03 | Updated D-011 (PARTIALLY_RESOLVED: 5 of 7 items supplied by Paresh — first tier STARTER, billing cycle monthly+annual, grace period 3 days, non-payment downgrade to FREE; provisional prices ₹2,499/₹4,999; feature entitlement scope still open; CA review pending). Updated D-012 (PARTIALLY_RESOLVED SaaS scope: TexQtic MoR, permanent SaaS/marketplace separation, marketplace deferred; GST/TCS CA advisory conflicting). Updated D-015 (FOUNDER_DECISION_RESOLVED: Razorpay Subscriptions, test mode first, STARTER first, TexQtic KYC owner; counsel review + §4.3 prerequisites still open). Added D-019 (RESOLVED: SaaS subscription billing STARTER first; all other tracks deferred). Added D-020 (PARTIALLY_RESOLVED: product+mode+tier selected; activation flow design pending). Added D-021 (PARKED: refund/cancellation policy not yet supplied). Added D-022 (PARKED: upgrade invitation policy not supplied; non-payment downgrade confirmed). Parking lot numbering gap D-019–D-022 confirmed and assigned. | `FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001` |
| 2026-06-03 | Updated D-011 item 4: CA-CONFIRMED (2026-06-03 via FAM-13B-D2) — SAC 998315, 18% GST, exclusive display confirmed; PR-03 advances to PARTIALLY_COMPLETE; Razorpay invoice SAC field verification still pending. Updated D-012 item 4: CA_CONFIRMED_PARTIAL (2026-06-03 via FAM-13B-D2) — SaaS SAC/GST confirmed; marketplace payment collection formally deferred at MVP; ECO/TCS NOT activated at MVP; must recheck CA/counsel before any future marketplace payment collection. Eliminated codes recorded (998314, 998319, 998596 → replaced by 998315 and 998599). Implementation gate still CLOSED. | `FAM-13B-D2-CA-SAC-CONFIRMATION-ADDENDUM-001` |
