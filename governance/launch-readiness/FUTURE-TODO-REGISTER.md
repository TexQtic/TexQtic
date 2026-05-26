# Future Todo Register

**Hub:** `governance/launch-readiness/`
**Status:** SKELETON — PENDING POPULATION
**Population unit:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`
**Last updated:** 2026-05-26 (FTR-FAM-001 auth/session checkpoint synced: opening repo-truth audit recorded at commit `9ec766c`; verify-close recorded at commit `6be1f93`; artifacts `FTR-FAM-001-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md` and `FTR-FAM-001-AUTH-SESSION-VERIFY-CLOSE-001.md` confirmed; §14 and §15 rows reconciled to `VERIFIED_COMPLETE`; next recommended unit `FTR-CP-001-CONTROL-PLANE-TENANT-OPERATIONS-OPENING-REPO-TRUTH-AUDIT` recorded as recommendation only, not opened. Prior: HD-002 URL-state sync close recorded: `MAINAPP-PUBLIC-READINESS-001F-HD-002-P1` accepted at commit `30196c7`; `MAINAPP-PUBLIC-READINESS-001F-HD-002-VERIFY-PROD` completed; production smoke passed at `https://app.texqtic.com`; HD-002 marked `VERIFIED_COMPLETE`; adjacent candidate `MAINAPP-PUBLIC-NOTFOUND-SESSION-CHROME-VISIBILITY-CHECK` added as triage-only non-blocker; §15 repo-wise pending-unit register refreshed. Prior: HIST-008–HIST-011 added through Unit 053; §15 repo-wise pending-unit register added; `TLRH-FUTURE-TODO-REPOWISE-PENDING-SYNC-002`. Prior: PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001 design artifact created: FTR-FAM-004 status → DESIGN_ARTIFACT_CREATED — HOLD_FOR_CONTENT_DRAFT. Prior: PRODUCTION-INTENT-STAGED-ACTIVATION-GOVERNANCE-SYNC-001: FTR-FAM-002 production-intent framing updated; FTR-FAM-004 added; HIST-007 added. Prior: email implementation truth sync — `TLRH-EMAIL-IMPLEMENTATION-SYNC-001`; FTR-B2C-004 PARTIAL; FTR-SL-003 PARTIAL; FTR-FAM-003 PARTIAL; HD-001-SMTP RESOLVED; new FTR-B2C-005, FTR-AUTH-004, FTR-OPS-004 added)
**Design authority:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

**Pending-units sync:** 2026-05-26 — HD-002 closure preserved; FTR-B2C-005 deferred / blocked_pending_approved_target_and_observability; FTR-AUTH-003 verification-follow-up / recrawl-dependent; MAINAPP-PUBLIC-POLISH-BACKLOG-ROLLUP recorded; authorized-surface selection remains Paresh-owned.

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
| FTR-SEO-001 | SEO domain canonical strategy | Decide and implement canonical URL strategy — apex domain vs. subdomain, www vs. non-www, cross-origin canonical handling | **STRATEGY_DEFINED** by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` (2026-07-22). app.texqtic.com confirmed as canonical domain. No redirect policy change needed. Existing canonical implementation correct under Option F. | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | STRATEGY_DEFINED | P1 | LAUNCH_DEPENDENCY | STRATEGY_DEFINED |
| FTR-SEO-002 | Product detail sitemap expansion | Add individual product detail pages to sitemap.xml with dynamic slug generation | Not safe until canonical strategy is decided | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-SEO-003 | Supplier profile indexability | Define indexability gate and sitemap inclusion for supplier profile pages | Deferred pending supplier profile completeness definition | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-SEO-004 | /trust page SEO metadata | Trust landing page title, description, og: tags, canonical, JSON-LD | Stub route in place with noindex; content not ready | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P2 | PILOT_REQUIRED | OPEN |
| FTR-SEO-005 | /industries page SEO metadata | Industry cluster landing page SEO implementation | Stub route in place with noindex; content not ready | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P2 | POST_MVP | OPEN |
| FTR-SEO-006 | /aggregator page SEO metadata | Aggregator discovery page SEO implementation | Stub route in place with noindex; design not complete | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | DESIGN_GATED | P3 | POST_MVP | OPEN |
| FTR-SEO-007 | Canonical domain implementation | **STRATEGY_RESOLVED** (2026-07-22): Under Option F, no redirect policy changes are needed. No sitemap.xml origin change required (already app.texqtic.com). Existing canonical tag implementation (app.texqtic.com origin in all canonical tags) confirmed correct by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` repo-truth inspection. No further implementation gate. | FTR-SEO-001 strategy now defined; existing implementation confirmed correct | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | STRATEGY_RESOLVED | P1 | LAUNCH_DEPENDENCY | STRATEGY_RESOLVED |
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
| FTR-B2C-004 | Minimum inquiry notification loop (soft-launch prerequisite) | Minimum notification path so a buyer inquiry reaches supplier/admin/Paresh or approved operational recipient. Does not require full messaging platform. Required before buyer-facing outreach or public inquiry promotion. | R-013 resolved; **PARTIALLY IMPLEMENTED (2026-05-22)**: General inquiry buyer acknowledgement email + admin alert email (to Paresh) runtime-verified in production via `SOFT-LAUNCH-F1-P1B-RV-ADMIN-EMAIL-ENV-VERIFY`. INQ-ADMIN-01 CLOSED. Supplier-context notification path (`sendSupplierInquiryNotificationEmail`) structurally implemented in `email.service.ts` + `F1-P6A` branded shell applied, but NOT production runtime verified end-to-end. | TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 + F1-P1B chain + `SOFT-LAUNCH-F1-P1B-RV-ADMIN-EMAIL-ENV-VERIFY` | PARTIAL | P1 | MVP_CRITICAL | PARTIAL |
| FTR-B2C-005 | Supplier-context inquiry notification path production runtime verification | Confirm that `sendSupplierInquiryNotificationEmail` delivers a branded email to the supplier email address when a buyer inquiry is submitted against a supplier-context product. Requires a real or QA supplier with a configured email address in the supplier-context inquiry flow. | FTR-B2C-004 partial implementation complete; supplier-context path not yet runtime verified end-to-end in production. Deferred from `SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL`. | `SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL` | IMPLEMENTATION_READY | P1 | MVP_CRITICAL | OPEN |

---

## 6. Register — Auth / Onboarding

| ID | Title | Description | Reason Deferred | Deferred By | Readiness | Priority | Launch Class | Status |
|---|---|---|---|---|---|---|---|---|
| FTR-AUTH-001 | Reused-existing-user onboarding path | Handle Supabase invites for users who already exist. Currently BOUNDED_DEFERRED_REMAINDER | Bounded deferral: confirmed out of scope for first launch wave; must be resolved before broader onboarding | Onboarding family closeout | DESIGN_GATED | P1 | MVP_CRITICAL | OPEN |
| FTR-AUTH-002 | White label onboarding path | Tenant-branded invite and activation for WL Co scenario | WL Co hold REVIEW-UNKNOWN | BLOCKED.md | BLOCKED | P3 | POST_MVP | OPEN |
| FTR-AUTH-003 | Auth/private-route crawl exclusion verification | Produce a dedicated verification artifact confirming that authenticated and private routes are excluded from search engine crawl (robots.txt coverage, `clearPublicPageMeta()` pattern, GSC production verification). Cross-referenced as G-06-003 (FAM-06) and BS-003 (BLIND-SPOT register, P0 PARTIAL). Required before first public backlink or press mention. | G-06-003 deferred as NON_BLOCKING_FOLLOWUP from `FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001`; `BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001` produced strong structural evidence: no private content at auth URLs, no link graph path from public pages, no sitemap promotion, SPA PUBLIC_ENTRY fallback confirmed live via browser. robots.txt Disallow gap CLOSED locally by `FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE` (8 prefixes added). **robots.txt DEPLOYED to production (2026-05-20)** — confirmed by `FU-003-ROBOTS-DEPLOYMENT-VERIFY`. `FU-002-GSC-CRAWL-EVIDENCE-VERIFY` (2026-07-22) FAIL: 3 `/auth/login?next=...` URL variants confirmed indexed in DuckDuckGo; content = login form only (no private data). All other auth/private routes NOT indexed. `/auth/login` deindex PENDING re-crawl (robots.txt signal sent). Await FU-004 confirmation for VERIFIED_PASS. | FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001 | ROBOTS_DEPLOYED | P2 | LAUNCH_DEPENDENCY | PARTIAL |
| FTR-AUTH-004 | Auth email branded shell extension (F1-P6C scope) | Apply branded HTML email shell (matching `buildInquiryEmailBodies` pattern from `SOFT-LAUNCH-F1-P6A`) to auth-related emails: invite token email, password reset, magic link. Requires coordinated update to `email.service.ts` auth email wrappers. | Deferred from `SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL` (F1-P6A scope was inquiry emails only). Auth email shells currently use plain-text or minimal formatting. | `SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL` | IMPLEMENTATION_READY | P2 | PILOT_REQUIRED | OPEN |

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
| FTR-OPS-004 | Postmark delivery webhook and bounce handling | Implement Postmark webhook endpoint for delivery status (delivered, bounced, spam complaint). Required for email reliability monitoring and hard-bounce suppression before pilot scale. | Deferred from F1-P6A and F1-P1B chain; current implementation sends emails but has no delivery receipt loop. Not a soft-launch blocker for 5-supplier pilot cohort; required before broader outreach. | `SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL` | NOT_ASSESSED | P2 | PILOT_REQUIRED | OPEN |

---

## 9. Register — Legal / Compliance

| ID | Title | Description | Reason Deferred | Deferred By | Readiness | Priority | Launch Class | Status |
|---|---|---|---|---|---|---|---|---|
| FTR-LEGAL-001 | TTP legal counsel feedback record | External counsel provides written feedback on upgraded TTP packet | Awaiting external counsel | NEXT-ACTION.md | BLOCKED | P2 | LAUNCH_DEPENDENCY | OPEN |
| FTR-LEGAL-002 | Privacy/GDPR basics for public inquiry form | Ensure inquiry form submission includes required consent disclosure for EU + India contexts | No dedicated unit; open item | — | NOT_ASSESSED | P1 | MVP_CRITICAL | OPEN |
| FTR-LEGAL-003 | Terms of service / platform agreement for supplier onboarding | Supplier must accept ToS on onboarding | No dedicated governance unit | — | NOT_ASSESSED | P1 | MVP_CRITICAL | OPEN |

---

## 10. Register — Soft Launch

| ID | Title | Description | Reason Deferred | Deferred By | Readiness | Priority | Launch Class | Status |
|---|---|---|---|---|---|---|---|---|
| FTR-SL-001 | Soft-launch aggregator directory readiness design | Design unit to confirm public directory surface is complete for soft-launch promotion: supplier profile quality, completeness criteria, consent visibility, privacy stance. Gate before first real supplier profile goes live in promotion context. | Directory is PRODUCTION_VERIFIED (FAM-01) but no governance unit exists for soft-launch readiness criteria | `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` §21 | NOT_ASSESSED | P1 | MVP_CRITICAL | OPEN |
| FTR-SL-002 | XDEP CAE + CRM + Main App soft-launch integration strategy | Cross-system design unit to confirm exact integration sequence when CAE (order/collection management) and CRM (relationship management) are brought into the soft-launch workflow. Defines handoff contracts, event streams, and integration preconditions. | CAE and CRM are separate repos; no formal integration contract exists for soft-launch phase; confirmed not a first-cohort blocker | `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` §21 | NOT_ASSESSED | P2 | PILOT_REQUIRED | OPEN |
| FTR-SL-003 | Minimum inquiry notification loop implementation (FTR-B2C-004 implementation unit) | Implement the minimum notification path so a buyer inquiry reaches supplier/admin/Paresh via email or equivalent. Governs the specific implementation unit for FTR-B2C-004. Required before any buyer-facing outreach or public inquiry promotion. | **PARTIALLY IMPLEMENTED (2026-05-22)**: Buyer ack + admin alert (Postmark SMTP) runtime-verified in production via F1-P1B chain + `SOFT-LAUNCH-F1-P1B-RV-ADMIN-EMAIL-ENV-VERIFY`. Branded email shell applied via `SOFT-LAUNCH-F1-P6A`. Supplier-context notification path structurally implemented but NOT production runtime verified. See FTR-B2C-005. | `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` §21; `TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001` (FTR-B2C-004); F1-P1B chain; `SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL` | PARTIAL | P1 | MVP_CRITICAL | PARTIAL |
| FTR-SL-004 | Supplier inquiry inbox design (tenant dashboard) | Design and implement the tenant-dashboard surface where a supplier reviews, filters, and responds to buyer inquiries. Required before hard MVP launch (can follow soft launch with manual/email workaround for first cohort). | FAM-03 or FAM-08 family assignment pending; requires FAM-06 supplier auth first | `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` §21 | NOT_ASSESSED | P1 | MVP_CRITICAL | OPEN |

---

## 10. Known Formerly Deferred Items (Resolved — for History)

| ID | Title | Resolution | Closed By |
|---|---|---|---|
| HIST-001 | sitemap.xml + robots.txt | PRODUCTION_VERIFIED (2026-05-19) | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 |
| HIST-002 | JSON-LD web type on public pages | PRODUCTION_VERIFIED | PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001 |
| HIST-003 | B2C browse SEO metadata | PRODUCTION_VERIFIED | B2C SEO metadata units |
| HIST-004 | NC Phase 1 feature flag production provisioning | PRODUCTION_VERIFIED (2026-06-02) | TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001 |
| HIST-005 | RFQ issue Tx timeout fix | PRODUCTION_VERIFIED (2026-06-08) | TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-TX-TIMEOUT-FIX-001 |
| HIST-006 | FTR-B2C-004 / FTR-SL-003 minimum inquiry notification loop (buyer ack + admin alert paths) | PARTIAL — General inquiry buyer acknowledgement email + admin alert email runtime-verified in production (2026-05-22). Supplier-context path structurally implemented; not yet production runtime verified. See FTR-B2C-004 (PARTIAL), FTR-B2C-005 (OPEN). | F1-P1B chain + `SOFT-LAUNCH-F1-P1B-RV-ADMIN-EMAIL-ENV-VERIFY` + `SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL` |
| HIST-007 | Production-intent staged-activation rule (D-025) recorded in TECS Doctrine and TLRH | GOVERNANCE_SYNC_COMPLETE (2026-05-22) — D-025 added to DOCTRINE.md v1.14. FTR-FAM-002 updated to PRODUCTION_INTENT_ARCHITECTURE_REQUIRED. FTR-FAM-004 added (architecture design artifact before legal content). PRIT-034 §5B Next Action updated. BS-008 added (production shortcut risk, MITIGATED_BY_DOCTRINE). Unit artifact: `PRODUCTION-INTENT-STAGED-ACTIVATION-GOVERNANCE-SYNC-001`. | `PRODUCTION-INTENT-STAGED-ACTIVATION-GOVERNANCE-SYNC-001` |
| HIST-008 | Gate E QA sentinel filter applied to public projections | PRODUCTION_VERIFIED (2026-05-25) — Gate E sentinel exclusion applied across public browse and discovery projections. Static-only reference-supplier rows cleanly excluded from all public surfaces. | `TLRH-FUTURE-TODO-REPOWISE-PENDING-SYNC-002` |
| HIST-009 | Static reference preview layer production accepted | PRODUCTION_ACCEPTED (2026-05-25) — App-side static reference supplier/product preview layer accepted in production. Preview-only; not live commercial supply or live marketplace data. | `TLRH-FUTURE-TODO-REPOWISE-PENDING-SYNC-002` |
| HIST-010 | Marketing preview routing production accepted through Unit 053 | PRODUCTION_ACCEPTED (2026-05-25) — Marketing preview routing accepted for Home, Trust, Industries/Textiles, and Brands pages. All routing remains preview-only. Cross-repo status only; Marketing repo artifacts only — no Marketing commits in Main App repo. | `TLRH-FUTURE-TODO-REPOWISE-PENDING-SYNC-002` |
| HIST-011 | CRM provisioning observability production accepted | PRODUCTION_ACCEPTED (2026-05-25) — CRM provisioning observability panel and timeline metadata accepted in production. Cross-repo status only; CRM repo artifacts only — no CRM commits in Main App repo. | `TLRH-FUTURE-TODO-REPOWISE-PENDING-SYNC-002` |

---

## 11. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created; known deferred items from recent closed units populated | Copilot/Design unit |
| 2026-05-19 | PRIT confirmation notes added for FTR-LEGAL-002, FTR-LEGAL-003, FTR-OPS-001, FTR-OPS-002, FTR-OPS-003 (Paresh decisions via `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001`) | `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001` |
| 2026-05-19 | Added §13 commerce/subscription/payments future design units (5 units) from `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001`; §11 update history updated | `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` |
| 2026-07-14 | Added FTR-B2C-004 (minimum inquiry notification loop, MVP_CRITICAL/P1); added to §12 Paresh confirmation notes | `TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001` |
| 2026-05-19 | Added §10 soft-launch register (FTR-SL-001 through FTR-SL-004): aggregator directory readiness design, XDEP CAE+CRM integration strategy, minimum inquiry notification implementation, supplier inquiry inbox design | `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` |
| 2026-07-14 | Added §14 Register — Launch Family Cycle Opening Audit Units (FTR-FAM-001: FAM-06 opening audit, FTR-FAM-002: public legal pages bundle, FTR-FAM-003: inquiry notification minimum) | `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` |
| 2026-07-22 | Added FTR-AUTH-003 (G-06-003 NON_BLOCKING_FOLLOWUP: auth/private-route crawl exclusion verification, LAUNCH_DEPENDENCY/P2) | `FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001` |
| 2026-07-22 | FTR-SEO-001 promoted from DESIGN_GATED/OPEN to STRATEGY_DEFINED: strategy defined by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`; Option F lock satisfies trigger condition; app.texqtic.com confirmed canonical. FTR-SEO-007 resolved from DESIGN_GATED/OPEN to STRATEGY_RESOLVED: no redirect policy or sitemap origin change needed; existing canonical tag implementation confirmed correct by repo-truth inspection. | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` |
| 2026-07-22 | FTR-AUTH-003 updated IMPLEMENTATION_READY/OPEN → EVIDENCE_STRONG/PARTIAL: `BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001` produced strong structural evidence — no private content at auth URLs, no link graph path, no sitemap promotion, SPA PUBLIC_ENTRY fallback confirmed live via browser. robots.txt gap documented (8 auth/private prefixes not disallowed). GSC evidence deferred. Two follow-up units required: FU-001 (robots.txt update) and FU-002 (GSC check). BS-003 updated OPEN → PARTIAL. | `BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001` |
| 2026-07-22 | FTR-AUTH-003 updated EVIDENCE_STRONG/PARTIAL → ROBOTS_GAP_CLOSED/PARTIAL: `FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE` added 8 Disallow entries to `public/robots.txt`. robots.txt implementation gap CLOSED. FTR-AUTH-003 remains PARTIAL: only GSC production crawl evidence (FU-002) remains required for full VERIFIED_PASS closure. | `FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE` |
| 2026-07-22 | FTR-AUTH-003 FU-002-GSC-CRAWL-EVIDENCE-VERIFY FAIL noted: DuckDuckGo confirms 3 `/auth/login?next=...` URLs indexed; FU-001 not deployed (live robots.txt = pre-FU-001). Stop Conditions 4+5 ACTIVE. FTR-AUTH-003 remains ROBOTS_GAP_CLOSED / PARTIAL. Path to VERIFIED_PASS: deploy FU-001 → await re-crawl → FU-003 re-verification. | `FU-002-GSC-CRAWL-EVIDENCE-VERIFY` |
| 2026-05-20 | FTR-AUTH-003 updated ROBOTS_GAP_CLOSED → ROBOTS_DEPLOYED: `FU-003-ROBOTS-DEPLOYMENT-VERIFY` confirmed FU-001 deployed to live production. All 8 Disallow entries present at `https://app.texqtic.com/robots.txt`. `/auth/login` deindex pending re-crawl. FTR-AUTH-003 → ROBOTS_DEPLOYED / DEINDEX_PENDING. Path to CLOSED: await re-crawl, run FU-004 to confirm `/auth/login` URLs deindexed. | `FU-003-ROBOTS-DEPLOYMENT-VERIFY` |
| 2026-05-22 | FTR-B2C-004 updated DESIGN_GATED/OPEN → PARTIAL: general inquiry buyer ack + admin alert runtime-verified in production (F1-P1B chain). Supplier-context notification path implemented but not production runtime verified. FTR-B2C-005 added (supplier-context verification). FTR-SL-003 and FTR-FAM-003 updated to PARTIAL accordingly. FTR-AUTH-004 added (auth email branded shell, F1-P6C scope). FTR-OPS-004 added (Postmark delivery webhook). HIST-006 added. | `TLRH-EMAIL-IMPLEMENTATION-SYNC-001` |
| 2026-05-22 | FTR-FAM-002 updated: production-intent architecture framing added (D-025); status → PRODUCTION_INTENT_ARCHITECTURE_REQUIRED — HOLD_FOR_AUTHORIZATION. FTR-FAM-004 added: PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001 architecture design artifact. HIST-007 added. | `PRODUCTION-INTENT-STAGED-ACTIVATION-GOVERNANCE-SYNC-001` |
| 2026-05-22 | FTR-FAM-004 updated: design artifact `PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001` created. Status → DESIGN_ARTIFACT_CREATED — HOLD_FOR_CONTENT_DRAFT. Next: PRODUCTION-LAUNCH-LEGAL-CONTENT-DRAFT-PRIT-034-002. | `PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001` |
| 2026-05-25 | HIST-008–HIST-011 added: Gate E QA sentinel filter (PRODUCTION_VERIFIED), static reference preview layer (PRODUCTION_ACCEPTED), Marketing preview routing (PRODUCTION_ACCEPTED, cross-repo only), CRM provisioning observability (PRODUCTION_ACCEPTED, cross-repo only) — all through Unit 053. §15 repo-wise pending-unit register added: Main App, Marketing, CRM, and cross-repo/product governance pending units recorded from external tracker context. Buyer bridge remains BLOCKED. Live CRM smoke approval-gated. Tracker source: external GPT-maintained; no tracker/pending-units DOCX searched in repo. | `TLRH-FUTURE-TODO-REPOWISE-PENDING-SYNC-002` |
| 2026-05-26 | Updated repo-wise pending-units review synced from prompt-supplied review artifact: FTR-B2C-005 marked DEFERRED / BLOCKED_PENDING_APPROVED_TARGET_AND_OBSERVABILITY; FTR-AUTH-003 marked verification-follow-up / recrawl-dependent; MAINAPP-PUBLIC-POLISH-BACKLOG-ROLLUP recorded; TEXQTIC-PUBLIC-POLISH-TO-AUTHORIZED-SURFACE-HANDOFF recorded; standing guardrails preserved; no implementation files changed. | `TLRH-PENDING-UNITS-REPO-WISE-REVIEW-RECORD-001` |
| 2026-05-26 | FTR-FAM-001 auth/session verification-close checkpoint synced into TLRH tracker truth: §14 and §15 rows updated to `VERIFIED_COMPLETE` with evidence refs to commits `9ec766c` and `6be1f93`, artifacts `FTR-FAM-001-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md` + `FTR-FAM-001-AUTH-SESSION-VERIFY-CLOSE-001.md`, and concise verification summary (60 backend tests, 20 frontend tests, focused typecheck, 6/6 source-contract checks). Future prompt instruction: open `FTR-CP-001-CONTROL-PLANE-TENANT-OPERATIONS-OPENING-REPO-TRUTH-AUDIT` next only if explicitly authorized; do not auto-open in this sync. Standing guardrails preserved; no runtime, schema, or DB changes. | `TLRH-FTR-FAM-001-AUTH-SESSION-VERIFIED-COMPLETE-RECORD-001` |
| 2026-05-25 | HD-002 post-close sync: `MAINAPP-PUBLIC-READINESS-001F-HD-002-P1` accepted (commit `30196c7`), `MAINAPP-PUBLIC-READINESS-001F-HD-002-VERIFY-PROD` completed, and `MAINAPP-PUBLIC-READINESS-001F-HD-002` marked `VERIFIED_COMPLETE / CLOSED` in §15. Production verification summary recorded (direct `/b2b`, direct `/b2b/`, B2B nav URL sync, Products nav URL sync, unknown non-root fail-closed, `/discover` non-canonical, buyer bridge/CRM/provisioning inactive, Vitest PASS, typecheck PASS, no verification-time file changes). Added separate adjacent candidate `MAINAPP-PUBLIC-NOTFOUND-SESSION-CHROME-VISIBILITY-CHECK` (triage-gated non-blocker). Standing guardrails preserved under §15.5. | `TEXQTIC-TLRH-TRACKER-SYNC-AFTER-HD-002-CLOSE` |

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

---

## 14. Register — Launch Family Cycle Opening Audit Units

Units identified by `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` as the immediate family-cycle opening audit units
and standalone soft-launch prerequisite units required before the Surat pilot soft launch begins.

| Unit ID | Unit Name | Description | Prerequisite | PRIT / FTR cross-ref | Priority | Status |
|---|---|---|---|---|---|---|
| FTR-FAM-001 | FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001 | First full family cycle opening repo-truth audit: audit auth routes, session handling, reused-user edge case, org_id scoping, Fastify auth plugin chain, frontend auth context, feature flag behavior, noindex on tenant routes. Must produce family-local repo-truth note + gap register. | Completed and evidence-locked by `FTR-FAM-001-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md` (commit `9ec766c`) and `FTR-FAM-001-AUTH-SESSION-VERIFY-CLOSE-001.md` (commit `6be1f93`): backend tests 60 PASS, frontend tests 20 PASS, focused typecheck PASS, 6/6 source-contract checks PASS. | FTR-AUTH-001; LFINDEX §7 FAM-06; FIRST-FAMILY-CYCLE-SELECTION-001; commits `9ec766c` + `6be1f93` | P0 | VERIFIED_COMPLETE |
| FTR-FAM-002 | PUBLIC-LEGAL-PAGES-BUNDLE-001 | Standalone soft-launch prerequisite: privacy policy, terms of service, and any other mandatory legal pages required before any outreach, data collection, or buyer-facing promotion. No family audit required. Implement as standalone unit. **PRODUCTION-INTENT REQUIRED (2026-05-22 — D-025)**: Legal documentation must be designed as production-launch ready in content model, route architecture, naming, versioning, and legal scope from the outset. Staged activation is allowed but design must be production-correct from the start. Architecture design artifact (`PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001`) must precede any legal content drafting or implementation. | Layer 0 HOLD_FOR_AUTHORIZATION releases (or explicit Paresh authorization before L0 clears if timeline requires) | PRIT-034; Soft-Launch §Q17 S-1, §Q18 B-1, §Q19 A-5; FIRST-FAMILY-CYCLE-SELECTION-001; D-025 | P1 | PRODUCTION_INTENT_ARCHITECTURE_REQUIRED — HOLD_FOR_AUTHORIZATION |
| FTR-FAM-003 | INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001 | Standalone soft-launch prerequisite: implement FTR-B2C-004/FTR-SL-003 minimum supplier notification loop for buyer inquiries. Not family-gated. R-013 RESOLVED via classification boundary. Must complete before buyer-facing outreach or directory promotion. | **PARTIALLY IMPLEMENTED (2026-05-22)**: Buyer ack + admin alert production-verified (F1-P1B chain). Branded email shell applied (F1-P6A). Supplier-context notification path implemented but NOT production runtime verified. See FTR-B2C-005. Remaining gate: FTR-B2C-005 (supplier-context runtime verification). | PRIT-033 Stage 1; FTR-B2C-004; FTR-SL-003; Soft-Launch §Q18 B-3; FIRST-FAMILY-CYCLE-SELECTION-001; F1-P1B chain; `SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL` | P1 | PARTIAL |
| FTR-FAM-004 | PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001 | Architecture design artifact for TexQtic legal documentation: define the production-grade content model, route architecture, naming conventions, versioning approach, and legal scope for privacy policy, terms of service, cookie stance, and DSAR path. Must be completed before any legal content drafting, route implementation, app linkage, or email footer legal links. Governed by D-025. **DESIGN_ARTIFACT_CREATED (2026-05-22)**: Source-of-truth model, route architecture (texqtic.com/legal/*), 12 first-wave documents (L-001–L-012), 7 gated groups, versioning model, and implementation sequence (PRIT-034-002 through PRIT-034-006) defined. Next: PRODUCTION-LAUNCH-LEGAL-CONTENT-DRAFT-PRIT-034-002. | Architecture design artifact must precede legal content, implementation, linkage. Layer 0 HOLD_FOR_AUTHORIZATION release (or explicit Paresh authorization). | PRIT-034; FTR-FAM-002; D-025; PRODUCTION-INTENT-STAGED-ACTIVATION-GOVERNANCE-SYNC-001 | P1 | DESIGN_ARTIFACT_CREATED (2026-05-22) — HOLD_FOR_CONTENT_DRAFT |

---

## 15. Repo-wise Pending Units — Cross-Repo Status (as of 2026-05-26)

*Source: external GPT-maintained pending-units review (not a repo file). Recorded by
`TLRH-FUTURE-TODO-REPOWISE-PENDING-SYNC-002`. Status reflects launch-readiness tracking
through Unit 053 and the updated 2026-05-25 pending-units review provided with this prompt.
No tracker DOCX was searched in the repo.*

### 15.1 Main App Pending Units

| Unit / Topic | Repo | Status | Dependency / Guardrail | Note |
|---|---|---|---|---|
| MAINAPP-PUBLIC-READINESS-001F-HD-002-P1 — Stable /b2b URL + public nav URL-state sync | Main App | CLOSED — accepted | Close evidence: commit `30196c7` on `main` | Accepted implementation commit: `[TEXQTIC] frontend: add stable b2b route and sync public nav URLs` |
| MAINAPP-PUBLIC-READINESS-001F-HD-002-VERIFY-PROD — production/Vercel URL smoke | Main App | COMPLETE — verified | Verification-only; no implementation changes authorized | Production smoke complete at `https://app.texqtic.com`: direct `/b2b` PASS, `/b2b/` PASS, B2B nav → `/b2b` PASS, Products nav → `/products` PASS, unknown non-root → Page Not Found PASS, `/discover` not canonical B2B PASS, buyer bridge/CRM/provisioning inactive PASS, focused Vitest PASS, typecheck PASS, no files changed during verification |
| MAINAPP-PUBLIC-READINESS-001F-HD-002 — route hardening close decision | Main App | VERIFIED_COMPLETE — CLOSED | P1 + VERIFY-PROD both completed | HD-002 close accepted; no SEO/noindex/sitemap/robots, inquiry-flow, CRM/provisioning, or DB scope activated in close path |
| FTR-B2C-005 — Supplier-context inquiry notification production runtime verification | Main App | DEFERRED / BLOCKED_PENDING_APPROVED_TARGET_AND_OBSERVABILITY | Approved supplier-context slug + approved delivery observability source + Paresh rerun authorization required | Rerun authorization: NO. No approved supplier-context slug and no approved delivery observability source are available; reopen only after Paresh/business approves exactly one supplier slug, one observability source, and non-reclassification policy |
| FTR-AUTH-003 — Auth/private-route deindex confirmation (FU-004) | Main App | verification-follow-up / recrawl-dependent | Await Google re-crawl post robots.txt deployment (2026-05-20) | `/auth/login` URLs currently indexed; deindex remains recrawl/search-evidence dependent; FU-004 required for VERIFIED_PASS; not the next implementation family unless urgent evidence appears |
| FTR-CP-001 — Control plane tenant operations implementation | Main App | implementation-ready | Paresh explicit Layer 0 authorization required | Boundary artifact exists; next recommended opening unit after FTR-FAM-001 verified checkpoint; still not opened |
| FTR-FAM-001 — FAM-06 auth session family cycle opening audit | Main App | VERIFIED_COMPLETE | Opening + verify-close evidence commits recorded (`9ec766c`, `6be1f93`) | Checkpoint recorded in TLRH only; no runtime/schema/DB changes in this sync |
| FTR-FAM-002 / FTR-FAM-004 — Legal pages bundle (architecture + content draft) | Main App | decision-gated | Paresh authorization for PRIT-034-002 content draft phase | Architecture artifact created (2026-05-22); next: PRIT-034-002 content draft requires explicit authorization |
| FTR-FAM-003 — Inquiry notification minimum (supplier-context path) | Main App | verification-needed | FTR-B2C-005 runtime verification gate | Buyer ack + admin alert production-verified; supplier-context path remains OPEN (see FTR-B2C-005) |
| QA/test/sentinel data purge | Main App | pending | Required before any buyer-facing outreach or activation | All QA/test/sentinel rows must be removed from production surfaces before buyer bridge can be considered |
| DB-backed demo/reference seeding activation | Main App | decision-gated | Explicit Paresh written authorization required | Must not be activated without explicit approval; remains deferred until authorized |
| MAINAPP-PUBLIC-NOTFOUND-SESSION-CHROME-VISIBILITY-CHECK | Main App | candidate-triage | Triage-gated; not a closure blocker for HD-002 | Adjacent finding recorded separately: not-found screen showed Logout control in authenticated browser state. Likely surface: `App.tsx` + public/not-found shell components |
| MAINAPP-PUBLIC-POLISH-BACKLOG-ROLLUP | Main App | pending | Separate from the next authorized Main App non-public implementation family; Paresh selection pending | Public-polish / deferred-verification backlog recorded separately: FTR-B2C-005 deferred supplier-context rerun, FTR-AUTH-003 / FU-004 auth-private-route deindex confirmation, MAINAPP-PUBLIC-NOTFOUND-SESSION-CHROME-VISIBILITY-CHECK, and existing public SEO / sitemap / post-launch revisit items already in repo truth |

### 15.2 Marketing Pending Units

*Recorded as cross-repo status only. No Marketing repo artifacts exist in this (Main App) repository.*

| Unit / Topic | Repo | Status | Dependency / Guardrail | Note |
|---|---|---|---|---|
| Post-Unit-053 remaining Marketing routing scope | Marketing | pending | Preview-only guardrail; all routes remain preview-only | Marketing preview routing accepted through Unit 053 (Home, Trust, Industries/Textiles, Brands); any further Marketing units are Marketing-repo work only |
| Marketing → Main App SEO / canonical integration (future) | Marketing / Main App | decision-gated | Not yet scoped; no active governance unit | Cross-repo SEO integration is future scope; not currently authorized |

### 15.3 CRM Pending Units

*Recorded as cross-repo status only. No CRM repo artifacts exist in this (Main App) repository.*

| Unit / Topic | Repo | Status | Dependency / Guardrail | Note |
|---|---|---|---|---|
| Buyer bridge activation | CRM / Main App | decision-gated | All gates must clear: real supplier/product data, FTR-B2C-005, PRIT-034 legal bundle, supplier notification consent, QA/test/sentinel purge, Paresh explicit written approval | **BLOCKED** — do not imply near-term activation; no single gate cleared is sufficient to activate |
| Live CRM provisioning smoke | CRM | decision-gated | Explicit Paresh written authorization required per smoke event | No additional live CRM provisioning smoke authorized without explicit written approval |
| CRM → Main App soft-launch inquiry handoff (FTR-SL-002) | CRM / Main App | pending | No formal integration contract; first-cohort pilot not yet blocked | Cross-system integration strategy for soft-launch phase not yet designed |

### 15.4 Cross-repo / Product Governance Pending Units

| Unit / Topic | Repo | Status | Dependency / Guardrail | Note |
|---|---|---|---|---|
| PRIT-034-002 — Legal content draft | Main App | decision-gated | Paresh explicit authorization required to open content draft phase | Architecture artifact (FTR-FAM-004) complete; PRIT-034-002 is next; requires Layer 0 authorization |
| Real supplier/product data onboarding | Main App / CRM | decision-gated | All buyer-bridge prerequisites must clear first | Cannot proceed until QA purge, legal bundle, supplier consent, and Paresh approval all obtained |
| FTR-SL-001 — Soft-launch aggregator directory readiness design | Main App | pending | No governance unit opened; required pre-outreach gate | Gate before first real supplier profile goes live in promotion context |
| FTR-SL-002 — XDEP CAE + CRM + Main App integration strategy | Main App / CRM / CAE | pending | No formal integration contract; CAE and CRM are separate repos | First pilot cohort not yet blocked; required before broader soft-launch scaling |
| TTP legal counsel feedback (FTR-LEGAL-001 / FTU-COMM-005) | All repos | pending | External counsel response pending | Blocks TradeTrust Pay direction and B2B financial guardrail enforcement |
| TEXQTIC-PUBLIC-POLISH-TO-AUTHORIZED-SURFACE-HANDOFF | Cross-repo / Main App | current / Paresh selection pending | Public-polish backlog must be recorded before next authorized surface selection | Handoff remains Paresh-owned; do not select the next authorized Main App non-public family in this unit |

### 15.5 Standing Guardrails (Unchanged)

| Guardrail | Status | Note |
|---|---|---|
| Buyer bridge activation | BLOCKED | Remains blocked; this HD-002 close does not authorize activation |
| CRM live provisioning smoke | UNAUTHORIZED | Remains approval-gated; no additional smoke authorized without separate Paresh approval |
| Reference/sample preview posture | PREVIEW_ONLY | Reference/sample previews remain preview-only and must not be represented as live supplier/product publication |
| DB-backed demo/reference seeding | DEFERRED_APPROVAL_GATED | Remains deferred; requires separate explicit approval |
| QA/test/sentinel exposure classification | RECLASSIFICATION_BLOCKED | Must not be reclassified as public demo/live content without separate policy decision |
