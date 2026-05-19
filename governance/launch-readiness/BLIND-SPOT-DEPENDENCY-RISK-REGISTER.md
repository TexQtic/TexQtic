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

---

## 4. Hidden Dependencies

| ID | Title | X (requires) | Y (must exist first) | Impact if Y is missing | Current evidence | Mitigation | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| HD-001 | Real supplier onboarding requires invite-token flow to work | Real supplier can join TexQtic | Invite-token onboarding flow works end-to-end for a real (non-QA) email address | Cannot onboard real Surat suppliers; pilot blocked | Onboarding family closed in Layer 0 with bounded-deferred-remainder for reused-user path | End-to-end test with a real Surat supplier email before pilot outreach | P0 | OPEN |
| HD-002 | Public B2C browse requires real supplier product data | Public buyers see real Surat textile products | Real supplier has seeded product catalog in production | Buyers see QA placeholder data or empty browse; trust damage | No real product data in production as of skeleton date | Seed ≥10 real Surat supplier products before any public outreach | P0 | OPEN |
| HD-003 | Inquiry response requires supplier to receive and respond | Buyer submits inquiry → supplier is aware and responds | Supplier is onboarded, trained, and watching notifications | No inquiry loop completion; buyer drops off; no pilot proof | Inquiry DB submission verified; supplier awareness not verified | Train first 5 Surat pilot suppliers on inquiry notification handling before any public link is shared | P0 | OPEN |
| HD-004 | Control plane operator capability requires platform-ops unit | Paresh can activate real tenants, handle onboarding exceptions, and audit events | Control plane tenant ops implementation is complete | Paresh cannot unblock stuck onboarding; no visibility into launch-day issues | PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md defines boundary; no implementation unit open yet | Open CONTROL-PLANE-TENANT-OPERATIONS implementation before first real tenant onboarding | P0 | OPEN |
| HD-005 | DPP passport on public product detail requires publicPassportId | Supplier's product shows passport link on public product detail page | DPP passport has been issued and publicPassportId is set for that product | Passport link silently absent; trust signal not shown | DPP is PRODUCTION_VERIFIED with conditional rendering; HOLD_FOR_PARESH_DECISION on launch gate | Resolve DPP launch gate decision; decide whether Surat pilot includes DPP | P1 | OPEN |
| HD-006 | Product sitemap expansion requires canonical strategy first | Dynamic product pages appear in sitemap | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` is decided and implemented | Dynamic product pages not in sitemap; SEO upside of individual pages missed at launch | SEO domain canonical strategy deferred by sitemap implementation unit | Prioritize domain canonical strategy before any product launch press outreach | P1 | OPEN |

---

## 5. Risks

| ID | Category | Title | Description | Impact | Current evidence | Mitigation | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| R-001 | LEGAL | TTP counsel feedback delay | External legal counsel review of the upgraded TTP packet (§12–§25) may be slow or produce a blocking finding. If counsel flags a compliance or regulatory issue with TTP's system-of-record model, the entire post-Phase-1 design may require rework. | Post-Phase-1 finance direction blocked; NC commerce incomplete at launch. | Packet sent; HOLD_FOR_COUNSEL_FEEDBACK in Layer 0 | No mitigation within TexQtic scope; expedite counsel engagement; plan launch path that does not require TTP completion. | P2 | OPEN |
| R-002 | GTM | No real textile supplier has seen the product | All verifications have been done with QA data and internal testing. No real Surat textile supplier has seen or used the product. The product may fail basic usability or trust requirements that only real users would surface. | Pilot launch fails; suppliers don't engage; no proof pack possible. | By design — QA-first sequence has been correct; now transitioning to real-user validation | Schedule Paresh's first in-person Surat demo before any wider outreach | P0 | OPEN |
| R-003 | INFRASTRUCTURE | Supabase/Vercel cold-start latency at pilot load | Vercel serverless + Supabase pooler have demonstrated timeout behavior at minimal load (NC Tx timeout fixed). At pilot load (even 30–50 suppliers + occasional buyers), cold-start and pooler latency may cause user-visible errors. | Slow or failing page loads; user abandonment at first real use. | Tx timeout fix applied; no load testing documented | Add basic load/performance smoke test before Surat pilot kickoff | P1 | OPEN |
| R-004 | DATA | RLS policies have not been tested under real multi-tenant load | All RLS testing has been against QA tenants. Real multi-tenant behavior (multiple real org_ids, concurrent writes) has not been validated. | Cross-tenant data leak at real multi-tenant load; catastrophic trust failure. | RLS policies in place; all tests pass against QA data | Conduct a dual-tenant integration smoke test with two independent real orgs before first real supplier beyond the pilot cell | P0 | OPEN |
| R-005 | OVERCONFIDENCE | "Production verified" in governance ≠ "real users tested it" | Several units are marked `PRODUCTION_VERIFIED` based on QA-data checks and governance sign-off. None of the public-facing flows have been used by a real external user. Production verification is necessary but not sufficient for launch readiness. | Hidden UX/trust gaps emerge at real launch; no early warning signal. | Pattern is inherent in QA-first governance approach | Schedule Paresh's real-user test run (as a supplier and as a buyer) before pilot outreach; document what breaks | P0 | OPEN |
| R-006 | LEGAL | Inquiry form has no visible privacy/consent disclosure | The current public inquiry form collects buyer name, company, and message. No privacy disclosure or consent statement is visible. In an EU buyer context (or GDPR-adjacent), this is a compliance risk. | Regulatory exposure; liability if an EU buyer objects to data collection without consent. | No privacy disclosure in inquiry form found in existing units | Add minimal consent disclosure before any press, paid acquisition, or buyer-facing SEO | P1 | OPEN |
| R-007 | DEPENDENCY | White Label Co hold could affect B2C surface later | WL Co hold (`REVIEW-UNKNOWN`) is currently scoped as non-blocking for B2C browse and D2C public slice. However, if a future B2C or D2C feature requires brand-surface, domain/routing, or identity changes, WL Co hold could resurface as a blocker. | WL Co hold blocks future surface enhancement during pilot; complicates B2C evolution. | WL Co hold is contained by each slice's non-blocking confirmation; documented in BLOCKED.md | Before any future B2C or D2C feature that touches brand-surface/domain/routing/identity, run fresh WL Co reassessment | P2 | WATCH |

---

## 6. Resolved Items (History)

| ID | Title | Resolution | Closed Date |
|---|---|---|---|
| HIST-R-001 | NC RFQ issue Tx timeout | Fix applied; PRODUCTION_VERIFIED | 2026-06-08 |
| HIST-R-002 | NC feature flag semantics (gate !== true) | Fixed to `=== false`; all tests PASS | 2026-06-02 |
| HIST-R-003 | NC remote DB migration state mismatch | RESOLVED by DEPLOYMENT-RESOLUTION-001 | 2026-05-12 |

---

## 7. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created; initial blind spots, hidden deps, and risks populated from repo inspection | Copilot/Design unit |
| — | (To be populated) | — |
