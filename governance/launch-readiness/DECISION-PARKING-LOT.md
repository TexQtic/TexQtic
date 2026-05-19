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
| **Why not ready** | Domain decision is pending. Without knowing the final production domain setup, canonical tags cannot be finalized. |
| **Trigger condition** | Paresh confirms production domain setup (apex vs. www; any custom domain plan). |
| **Impact of delaying** | SEO upside of dynamic product pages and supplier profiles is not realized. Live pages have canonical tags — this only affects expansion. |
| **Who decides** | Paresh |
| **Priority** | P1 |
| **Status** | PARKED |

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

---

## 4. Decided Items (History)

| ID | Decision question | Outcome | Decided | Date |
|---|---|---|---|---|
| HIST-D-001 | Should NC Phase 1 be production-audited before any further implementation? | YES — audit complete, QA seed reset complete | Paresh | 2026-07-06 |
| HIST-D-002 | Should the NC Tx timeout fix be applied to production? | YES — applied and PRODUCTION_VERIFIED | Paresh | 2026-06-08 |
| HIST-D-003 | Should nc.procurement_pools.feature_flag_gate be `=== false` not `!== true`? | YES — fixed in NC Phase 1 close | Paresh | 2026-06-02 |

---

## 5. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created; D-001 through D-009 populated from repo inspection of NEXT-ACTION.md, BLOCKED.md, and closed governance units | Copilot/Design unit |
| 2026-07-14 | Added D-010 (Supplier Profile Publication and Indexability Policy) — SEO pending work register sync | `PUBLIC-SEO-PENDING-WORK-REGISTER-SYNC-001` |
