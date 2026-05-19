# Future Todo Register

**Hub:** `governance/launch-readiness/`
**Status:** SKELETON — PENDING POPULATION
**Population unit:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`
**Last updated:** 2026-05-19 (skeleton created)
**Design authority:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

---

> **SKELETON NOTE**
>
> This register will be fully populated in `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`.
> The rows below represent known deferred items as of the skeleton date, sourced from
> closed TECS governance units that explicitly deferred them.
>
> Status, priority, and owner fields require inspection before use as planning input.

---

## 1. Purpose

This document is the single durable register for all deferred, parked, or "not now but don't
forget" implementation items in TexQtic.

It captures items that have been explicitly deferred by a governance unit with a reason, items that
were out of scope for a recent unit but must be done before launch, and items that are confirmed
post-MVP but worth capturing now so they are not lost.

**This register does NOT:**
- Open or authorize any implementation
- Override Layer 0 sequencing
- Replace the B2C or D2C family trackers for family-specific unit tracking

---

## 2. Register Schema

Each item has:
- **ID**: sequential; never reused
- **Title**: short action-oriented label
- **Description**: brief, specific
- **Reason deferred**: why this was not done when it was first identified
- **Deferred by (unit)**: which governance unit or decision deferred it
- **Readiness class**: `DESIGN_GATED` / `IMPLEMENTATION_READY` / `BLOCKED` / `NOT_ASSESSED`
- **Priority**: `P0` / `P1` / `P2` / `P3` / `P4`
- **Launch class**: `LAUNCH_BLOCKER` / `MVP_CRITICAL` / `LAUNCH_DEPENDENCY` / `PILOT_REQUIRED` / `POST_MVP` / `WATCH_ITEM`
- **Owner (unit family)**: which family/domain this belongs to
- **Status**: `OPEN` (still deferred) / `PROMOTED` (moved to active unit) / `CANCELLED` (no longer needed)

---

## 3. Register — SEO / Public Surface

| ID | Title | Description | Reason Deferred | Deferred By | Readiness | Priority | Launch Class | Status |
|---|---|---|---|---|---|---|---|---|
| FTR-SEO-001 | SEO domain canonical strategy | Decide and implement canonical URL strategy — apex domain vs. subdomain, www vs. non-www, cross-origin canonical handling | Requires domain decision first; deferred to `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P1 | LAUNCH_DEPENDENCY | OPEN |
| FTR-SEO-002 | Product detail sitemap expansion | Add individual product detail pages to sitemap.xml with dynamic slug generation | Not safe until canonical strategy is decided | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-SEO-003 | Supplier profile indexability | Define indexability gate and sitemap inclusion for supplier profile pages | Deferred pending supplier profile completeness definition | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-SEO-004 | /trust page SEO metadata | Trust landing page title, description, og: tags, canonical, JSON-LD | Stub route in place with noindex; content not ready | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P2 | PILOT_REQUIRED | OPEN |
| FTR-SEO-005 | /industries page SEO metadata | Industry cluster landing page SEO implementation | Stub route in place with noindex; content not ready | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P2 | POST_MVP | OPEN |
| FTR-SEO-006 | /aggregator page SEO metadata | Aggregator discovery page SEO implementation | Stub route in place with noindex; design not complete | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P3 | POST_MVP | OPEN |
| FTR-SEO-007 | Canonical domain implementation | Implement www/apex canonical redirect policy, update canonical tags site-wide, and update sitemap.xml origin URL | Conditional on FTR-SEO-001 strategy outcome; cannot implement before domain strategy is decided | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P1 | LAUNCH_DEPENDENCY | OPEN |
| FTR-SEO-008 | Product detail JSON-LD expansion | Add safe structured data markup (`PUBLIC-SEO-PRODUCT-DETAIL-JSONLD-EXPANSION-001`) for individual product pages — Product/ItemList type only; no Offer, price, availability, or inventory claims | Product data model not yet confirmed stable for public-indexable schema attribution; explicitly deferred in PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001 §7.2 | PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001 | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-SEO-009 | Supplier profile JSON-LD implementation | Add JSON-LD type markup for public supplier profile pages after indexability policy and completeness gate are defined | Depends on FTR-SEO-003 (indexability policy); cannot safely implement before supplier publication rules are defined | PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001 | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | OPEN |

---

## 4. Register — Network Commerce / TradeTrust Pay

| ID | Title | Description | Reason Deferred | Deferred By | Readiness | Priority | Launch Class | Status |
|---|---|---|---|---|---|---|---|---|
| FTR-NC-001 | Award maker-checker E2E path | Implement two-call G-021 split flow: requestAward() → approveAward(). Design is complete. | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001 design complete; implementation requires authorization | NC Phase 1 audit | IMPLEMENTATION_READY | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-NC-002 | Supplier quote feature flag activation (QD-6) | Lift QD-6 hold; activate `nc.procurement_pools.supplier_quotes.enabled` | Requires separate Paresh decision; QD-6 hold maintained | NC Phase 1 implementation sequence | BLOCKED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-NC-003 | TradeTrust Pay design opening | Post-Phase-1 settlement direction. Requires counsel feedback on TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001 | HOLD_FOR_COUNSEL_FEEDBACK; legal packet upgraded and sent | NEXT-ACTION.md | BLOCKED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-NC-004 | NC Phase 1 remote DB schema verification (G-021 tables) | Verify `pending_approvals` + `ApprovalSignature` tables in remote Supabase DB for G-021 maker-checker path | Blocked pending NC maker-checker implementation authorization | NC Phase 1 audit | BLOCKED | P2 | LAUNCH_DEPENDENCY | OPEN |

---

## 5. Register — Public Pages / B2C / D2C

| ID | Title | Description | Reason Deferred | Deferred By | Readiness | Priority | Launch Class | Status |
|---|---|---|---|---|---|---|---|---|
| FTR-B2C-001 | B2C–D2C boundary decision | Formal decision on where B2C discovery ends and D2C/collections begins for a single user journey | Design not started; deferred to B2C-D2C-BOUNDARY-DECISION-001 | B2C tracker | DESIGN_GATED | P2 | PILOT_REQUIRED | OPEN |
| FTR-B2C-002 | Inquiry schema-governed expansion (Phase 3+) | Context-aware inquiry with structured form fields based on product category | Inquiry Phase 1+2 closed; Phase 3 expansion design pending | PUBLIC-INQUIRY-CONTEXT-HANDOFF-IMPLEMENTATION-001 | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-B2C-003 | Supplier profile public pages | Individual supplier profile pages with SEO, curated product list, origin story | Design gates unresolved; supplier profile indexability pending | SEO sitemap unit | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-B2C-004 | Minimum inquiry notification loop (soft-launch prerequisite) | Minimum notification path so a buyer inquiry reaches supplier/admin/Paresh or approved operational recipient. Does not require full messaging platform. Required before buyer-facing outreach or public inquiry promotion. | R-013 resolved by split-scope classification; implementation future work; family assignment pending (FAM-03 or FAM-08) | TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 | DESIGN_GATED | P1 | MVP_CRITICAL | OPEN |

---

## 6. Register — Auth / Onboarding

| ID | Title | Description | Reason Deferred | Deferred By | Readiness | Priority | Launch Class | Status |
|---|---|---|---|---|---|---|---|---|
| FTR-AUTH-001 | Reused-existing-user onboarding path | Handle Supabase invites for users who already exist. Currently BOUNDED_DEFERRED_REMAINDER | Bounded deferral: confirmed out of scope for first launch wave; must be resolved before broader onboarding | Onboarding family closeout | DESIGN_GATED | P1 | MVP_CRITICAL | OPEN |
| FTR-AUTH-002 | White label onboarding path | Tenant-branded invite and activation for WL Co scenario | WL Co hold REVIEW-UNKNOWN | BLOCKED.md | BLOCKED | P3 | POST_MVP | OPEN |

---

## 7. Register — Control Plane / Platform Ops

| ID | Title | Description | Reason Deferred | Deferred By | Readiness | Priority | Launch Class | Status |
|---|---|---|---|---|---|---|---|---|
| FTR-CP-001 | Control plane tenant operations implementation | Implement bounded launch operator lane: tenant registry, tenant deep-dive, onboarding activation, impersonation entry, audit visibility | Awaiting Layer 0 authorization to open; boundary artifact exists | PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md | IMPLEMENTATION_READY | P0 | MVP_CRITICAL | OPEN |

---

## 8. Register — Infrastructure / DevOps

| ID | Title | Description | Reason Deferred | Deferred By | Readiness | Priority | Launch Class | Status |
|---|---|---|---|---|---|---|---|---|
| FTR-OPS-001 | Error monitoring / alerting setup | Sentry or equivalent for production error capture; structured log alerting | No dedicated infrastructure unit opened | — | NOT_ASSESSED | P1 | MVP_CRITICAL | OPEN |
| FTR-OPS-002 | Performance budget / load testing | Define and test performance acceptable threshold for Surat pilot load | No dedicated unit; open item | — | NOT_ASSESSED | P2 | PILOT_REQUIRED | OPEN |
| FTR-OPS-003 | Rollback procedure documentation | Document specific Vercel deploy rollback + DB migration rollback procedure | No dedicated documentation | — | NOT_ASSESSED | P1 | MVP_CRITICAL | OPEN |

---

## 9. Register — Legal / Compliance

| ID | Title | Description | Reason Deferred | Deferred By | Readiness | Priority | Launch Class | Status |
|---|---|---|---|---|---|---|---|---|
| FTR-LEGAL-001 | TTP legal counsel feedback record | External counsel provides written feedback on upgraded TTP packet | Awaiting external counsel | NEXT-ACTION.md | BLOCKED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-LEGAL-002 | Privacy/GDPR basics for public inquiry form | Ensure inquiry form submission includes required consent disclosure for EU + India contexts | No dedicated unit; open item | — | NOT_ASSESSED | P1 | MVP_CRITICAL | OPEN |
| FTR-LEGAL-003 | Terms of service / platform agreement for supplier onboarding | Supplier must accept ToS on onboarding | No dedicated governance unit | — | NOT_ASSESSED | P1 | MVP_CRITICAL | OPEN |

---

## 10. Known Formerly Deferred Items (Resolved — for History)

| ID | Title | Resolution | Closed By |
|---|---|---|---|
| HIST-001 | sitemap.xml + robots.txt | PRODUCTION_VERIFIED (2026-05-19) | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 |
| HIST-002 | JSON-LD web type on public pages | PRODUCTION_VERIFIED | PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001 |
| HIST-003 | B2C browse SEO metadata | PRODUCTION_VERIFIED | B2C SEO metadata units |
| HIST-004 | NC Phase 1 feature flag production provisioning | PRODUCTION_VERIFIED (2026-06-02) | TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001 |
| HIST-005 | RFQ issue Tx timeout fix | PRODUCTION_VERIFIED (2026-06-08) | TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-TX-TIMEOUT-FIX-001 |

---

## 11. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created; known deferred items from recent closed units populated | Copilot/Design unit |
| 2026-05-19 | PRIT confirmation notes added for FTR-LEGAL-002, FTR-LEGAL-003, FTR-OPS-001, FTR-OPS-002, FTR-OPS-003 (Paresh decisions via `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001`) | `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` |
| 2026-05-19 | Added §13 commerce/subscription/payments future design units (5 units) from `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001`; §11 update history updated | `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` |
| 2026-07-14 | Added FTR-B2C-004 (minimum inquiry notification loop, MVP_CRITICAL/P1); added to §12 Paresh confirmation notes | `TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001` |

---

## 12. PRIT Confirmation Notes (TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001)

The following FTR items were confirmed by Paresh in `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` (2026-05-19).
Status fields in the register tables above are unchanged; these notes record the Paresh decision context.

| FTR ID | PRIT ID | Paresh Confirmation | Destination Family |
|---|---|---|---|
| FTR-LEGAL-002 | PRIT-011 | Confirmed MVP_CRITICAL/P1. Small privacy/consent notice required before pilot go-live. Basic notice acceptable as first iteration; may require counsel review for specific wording. | FAM-03 |
| FTR-LEGAL-003 | PRIT-012 | Confirmed MVP_CRITICAL/P1. Simplified pilot supplier agreement acceptable as first iteration. Formal ToS review may follow post-pilot. External counsel may be needed for final wording. | FAM-07 |
| FTR-OPS-001 | PRIT-013 | Confirmed MVP_CRITICAL/P1. Sentry or equivalent required before pilot go-live. Tooling selection confirmed acceptable at FAM-10 family cycle opening. | FAM-10 |
| FTR-OPS-002 | PRIT-014 | Confirmed PILOT_REQUIRED/P2. Pilot load profile confirmed: 30–50 Surat pilot suppliers, 10–20 concurrent sessions baseline. | FAM-10 |
| FTR-OPS-003 | PRIT-015 | Confirmed MVP_CRITICAL/P1. Format confirmed: Vercel + Supabase rollback runbook; feature-flag rollback path included. | FAM-10 |
| FTR-B2C-004 | PRIT-033 | Confirmed MVP_CRITICAL/P1 per R-013 resolution (2026-07-14). Minimum inquiry notification required before buyer-facing outreach. Implementation family: FAM-03 or FAM-08 (Paresh to confirm at family selection). | FAM-03 or FAM-08 |

---

## 13. Commerce, Subscription, and Payments Future Design Units (TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001)

The following future design units were identified and parked in the commerce/subscription/payments methodology design unit.
None of these units may open until their listed prerequisite decisions are resolved.

| Unit ID | Unit Name | Description | Prerequisite Decision | PRIT cross-ref | Priority | Status |
|---|---|---|---|---|---|---|
| FTU-COMM-001 | SUBSCRIPTION-TIER-ENTITLEMENT-DESIGN-001 | Define per-tier entitlement enforcement, self-serve upgrade/downgrade flows, billing cycle model, grace period, deactivation policy, India SaaS GST treatment | D-011 resolved by Paresh + counsel/CA; post-MVP only unless scope advanced | PRIT-028 | P2 | PARKED — POST_MVP |
| FTU-COMM-002 | RAZORPAY-PAYMENT-GATEWAY-DESIGN-001 | Full gateway integration design: which surfaces, Razorpay API integration, webhook handling, refund flows, PCI boundary documentation, KYC, audit/logging | D-015 resolved; all 7 prerequisites in methodology §4.3 satisfied | PRIT-029 | P2 | PARKED — DESIGN_GATED |
| FTU-COMM-003 | B2C-D2C-CHECKOUT-PAYMENT-DESIGN-001 | Authenticated B2C/D2C checkout flow design: cart → checkout → payment → confirmation; downstream-auth boundary confirmed; gateway integration per FTU-COMM-002 | D-012 (merchant-of-record) resolved; Layer 0 authorization for B2C/D2C commerce cycle | PRIT-029, PRIT-031 | P2 | PARKED — DESIGN_GATED |
| FTU-COMM-004 | COMMISSION-DEDUCTION-POLICY-DESIGN-001 | Commission model design: B2C commission rate, D2C commission rate, deduction timing, payout waterfall, supplier remittance terms, returns and refund handling | D-013 and D-014 resolved; D-012 resolved; counsel/CA review complete | PRIT-031 | P2 | PARKED — DESIGN_GATED |
| FTU-COMM-005 | B2B-FINANCIAL-BOUNDARY-GUARDRAIL-001 | Formal guardrail enforcement unit: document and enforce B2B no-platform-financial-transaction boundary across FAM-12, FAM-13, FAM-14, FAM-15, FAM-16 family cycle openings | TTP legal counsel feedback received (FTR-LEGAL-001); Paresh authorization for FAM-16 scope | PRIT-030 | P1 | PARKED — HOLD_FOR_COUNSEL_FEEDBACK |
