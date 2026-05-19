# Missing Family and Feature Scan — Pre–First-Family-Cycle

**Hub:** `governance/launch-readiness/`
**Unit:** `TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001`
**Status:** SCAN_COMPLETE — READ-ONLY GOVERNANCE OUTPUT
**Created:** 2026-07-14
**Design authority:** `TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001`
**Layer 0 posture at scan:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` (UNCHANGED)
**Pre-existing unstaged M files (never stage):**
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## §1 Purpose

This document records the results of a governance-only scan performed before the first family
cycle selection (`TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`).

The scan answers the question: **what capability areas, feature groups, or guardrail items are
absent from the current TLRH registers** that should be represented before any family cycle
opens?

This document:
- Evaluates 10 candidate groups (Groups A–J) against all current TLRH registers
- Inspects repo structure at a high level for ungoverned code
- Identifies gaps, conflicts, and items to add before or during the first family cycle
- Does NOT open any family cycle
- Does NOT implement anything
- Does NOT classify any item as `IMPLEMENTATION_READY` or `LAUNCH_BLOCKER` beyond what
  existing governance already states
- Does NOT make any payment, legal, or product decisions

---

## §2 Authority Boundary

| Authority aspect | This document's role |
|---|---|
| Implementation authorization | NONE |
| Family cycle opening | NONE — this is pre-selection only |
| MVP classification | NONE — provisional only; Paresh must confirm at each family gate |
| Register updates | ADDITIVE ONLY — scan outputs new PRIT/FTR/Risk candidates |
| Deep audit of families | NONE — each family gets its own opening audit |
| Business/GTM decisions | NONE — those belong to Paresh outside this repo |
| Code quality or security review | NONE — surface scan only |

---

## §3 Documents Inspected

All 13 current TLRH documents plus Layer 0 control files were read before this scan was
written. No finding in this scan is speculation — each claim has a source reference.

| # | Document | Key observations |
|---|---|---|
| 1 | `governance/launch-readiness/README.md` | Hub version 1.0; 13 documents; read order current through PRIT-031 |
| 2 | `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | 24 families defined; 5 groups (A–F); FAM-12 PARTIALLY_IMPLEMENTED |
| 3 | `governance/launch-readiness/MVP-LAUNCH-READINESS-ROADMAP.md` | SKELETON; row 26 = messaging/notifications POST_MVP |
| 4 | `governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md` | SKELETON; I-4 = inquiry notification P0; §8–§10 added context |
| 5 | `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-001–PRIT-031; next ID = PRIT-032 |
| 6 | `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-SEO-001–009, FTR-NC-001–004, FTR-B2C-001–003, FTR-AUTH-001–002, FTR-CP-001, FTR-OPS-001–003, FTR-LEGAL-001–003, §13 commerce units |
| 7 | `governance/launch-readiness/DECISION-PARKING-LOT.md` | D-001 through D-015; next ID = D-016 |
| 8 | `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | BS-001–007, HD-001–006, R-001–012; next IDs: BS-008+, HD-007+, R-013+ |
| 9 | `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | Commerce/payments methodology; B2B no-money-movement; D-011–D-015; FTU-COMM-001–005 |
| 10 | `governance/launch-readiness/PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` | SEO register; canonical domain deferred (D-005) |
| 11 | `governance/control/NEXT-ACTION.md` | HOLD_FOR_AUTHORIZATION / HOLD_FOR_COUNSEL_FEEDBACK; active unit: HOLD_FOR_AUTHORIZATION |
| 12 | `governance/control/BLOCKED.md` | WL Co REVIEW-UNKNOWN; NC blockers resolved; QD-6 maintained |
| 13 | `governance/control/OPEN-SET.md` | Layer 0 posture unchanged; next candidate = HOLD_FOR_COUNSEL_FEEDBACK |
| 14 | `TECS.md` | Gap lifecycle; static gates; runtime validation T1–T4; TECS-GR-007 |

---

## §4 Repo Structure Inspected (High-Level)

The following directories and files were inspected at a high level for presence of ungoverned
or partially-governed code. No implementation details were audited — only structure and
naming.

### Frontend components (`components/`)
- `Auth/` — AuthFlows, ForgotPassword, VerifyEmail, TokenHandler
- `Cart/` — **Cart.tsx** (cart UI surface exists)
- `ControlPlane/` — AdminRBAC, TenantRegistry, TenantDetails, CartSummariesPanel,
  FeatureFlags, AuditLogs, SystemHealth, EventStream, MakerCheckerConsole (and others)
- `Onboarding/` — OnboardingFlow.tsx
- `Public/` — B2CBrowse, PublicProductDetail, PublicInquiryPage, PublicSupplierProfile,
  PublicCollectionDetail, PublicCollectionsStub, PublicTrustLandingStub (and others)
- `shared/` — EmptyState, ErrorBoundary, ErrorState, LoadingState, SkeletonLoader
- `Tenant/` — TeamManagement, InviteMemberForm, TenantAuditLogs (and others)
- **No components for:** wishlist, saved products, buyer account dashboard,
  inquiry history view (buyer-facing), inquiry inbox (supplier-facing),
  privacy policy page (public), analytics/tracking

### Services (`services/`)
- `cartService.ts` — **cart service exists**
- `authService.ts`, `apiClient.ts`, `tenantApiClient.ts`, `adminApiClient.ts`
- No analytics service, no notification service, no wishlist service, no buyer account service

### Backend routes (`server/src/routes/`)
- `public.ts` — GET /b2c/products, /product/:slug, /supplier/:slug, /dpp/:id,
  POST /inquiry/submit, GET /entry/resolve, GET /tenants/resolve, GET /b2b/suppliers
- `auth.ts` — auth routes
- `tenant/` — NC routes, invoices, settlement, pools, RFQs (NC Phase 1)
- `control/` — control plane routes (TTP, settlement, escrow, escalation, etc.)
- `admin-cart-summaries.ts` — **`MarketplaceCartSummary` read routes exist**
- **No routes for:** inquiry inbox (tenant), buyer account, saved/wishlist,
  notification dispatch (inquiry), analytics event ingest

### Backend services (`server/src/services/`)
- `email/email.service.ts` — **email infrastructure exists**: `sendEmail`,
  `sendPasswordResetEmail`, `sendEmailVerificationEmail`, `sendInviteMemberEmail`
  → **NO** `sendInquiryNotificationEmail`; SMTP fallback is graceful (logs + warning)
- `impersonation.service.ts` — impersonation service exists
- `rfq/` — RFQ-related services including `supplierNotificationBoundary.service.ts`
  (for NC RFQ notifications — not inquiry notifications)

### Key ungoverned code finding:
> **Cart code exists in repo but has no governing family, PRIT, FTR, or design unit.**
> `components/Cart/Cart.tsx` + `services/cartService.ts` +
> `server/src/routes/admin-cart-summaries.ts` (uses `prisma.marketplaceCartSummary`) +
> `components/ControlPlane/CartSummariesPanel.tsx`
>
> This is the most significant ungoverned code finding from the scan. A family cycle
> opening may discover the cart is partially implemented with unclear scope. Requires
> a PRIT to bring it under governance.

---

## §5 Scan Matrix (Core Deliverable)

Columns:
- **Candidate Item**: what was evaluated
- **Already Represented?**: YES / PARTIAL / NO
- **Current Source**: where it appears in TLRH
- **Gap**: what is missing
- **Recommended Action**: what to do with this
- **Proposed Destination**: PRIT / FTR / Decision / Risk ID
- **Priority Rec**: provisional only
- **Paresh Decision?**: YES / NO
- **Family Audit?**: YES / NO (must be confirmed at family cycle opening)

---

### Group A — B2C/D2C Customer Continuity

| Candidate Item | Already Represented? | Current Source | Gap | Recommended Action | Proposed Dest | Priority Rec | Paresh? | Family Audit? |
|---|---|---|---|---|---|---|---|---|
| Shopper/buyer account (authenticated buyer surface) | NO | None | No family, PRIT, or FTR covers a B2C/D2C shopper account or buyer identity layer | Add as PRIT. Assign to future family — depends on D-012 (merchant-of-record) for transactional scope; auth scope in FAM-06 | PRIT-032 (cart/non-payment buyer surface) | P2 — PILOT_REQUIRED | YES | YES |
| Buyer profile / preferences | NO | None | No profile store for B2C/D2C buyers | Add as sub-item to cart/buyer surface PRIT | PRIT-032 | P2 | YES | YES |
| Saved products / collections (wishlist) | NO | No code, no governance | No wishlist component, service, or route found in repo | Note as scan finding; confirm post-FAM-09 and post-D-012 gate | Confirm at FAM-09 opening | P3 — POST_MVP | YES | YES |
| Cart-as-intent (without payment) | PARTIAL | Code exists: Cart.tsx, cartService.ts, MarketplaceCartSummary schema, CartSummariesPanel | No governing family, PRIT, FTR, or design unit — code is ungoverned | **ADD PRIT-032** to bring cart code under governance; assign to first family cycle that opens the cart surface | PRIT-032 | P2 | YES | YES |
| Buyer inquiry history (buyer-facing view) | NO | None | No buyer-facing inquiry history route or UI | Add as sub-item in FAM-03 scope or future buyer account surface | PRIT-033 partial | P1 | YES | YES |
| Order-intent history (buyer-facing, no payment) | NO | None | No order history surface in repo | Post-D-012; confirm scope when merchant-of-record resolves | Confirm at FAM-11/buyer surface opening | P3 | YES | YES |

---

### Group B — Supplier Inquiry Response Workflow

| Candidate Item | Already Represented? | Current Source | Gap | Recommended Action | Proposed Dest | Priority Rec | Paresh? | Family Audit? |
|---|---|---|---|---|---|---|---|---|
| Supplier views inquiry in tenant dashboard (inquiry inbox) | NO | None | No tenant route or UI surface for supplier to see incoming inquiries | **ADD PRIT-033** — inquiry inbox for supplier is the response side of the inquiry loop | PRIT-033 | P1 — MVP_CRITICAL | YES | YES |
| Supplier responds to inquiry | NO | None | No response tracking, reply route, or CRM handoff beyond DB write | Part of PRIT-033 scope; confirm extent of response tracking in FAM-03 opening | PRIT-033 | P1 | YES | YES |
| Inquiry status visible to supplier | NO | None | No inquiry status enum or update flow visible | Part of PRIT-033 | PRIT-033 | P1 | YES | YES |
| Admin-routed inquiry (inquiry goes to admin when no supplier assigned) | NO | None | No routing rule visible | BS-002 captures notification risk; routing rule not defined | FAM-03 opening | P1 | YES | YES |
| Inquiry notification/audit trail | PARTIAL | BS-002 (risk register) captures this risk | BS-002 records risk; I-4 in MVP-MUST-HAVES is P0; no implementation exists | See Group C below for notification conflict | R-013 (new risk) | P1 | YES | YES |

---

### Group C — Notification / Transactional Email

| Candidate Item | Already Represented? | Current Source | Gap | Recommended Action | Proposed Dest | Priority Rec | Paresh? | Family Audit? |
|---|---|---|---|---|---|---|---|---|
| Inquiry confirmation email to buyer | NO | Not in email.service.ts | Email service has password reset, email verification, invite — no inquiry confirmation | Add as FTR item in FAM-03 scope | PRIT-033 / FAM-03 | P1 | NO | YES |
| Supplier alert email for new inquiry | PARTIAL | BS-002 (risk), I-4 MVP-MUST-HAVES P0 | email.service.ts has no sendInquiryNotificationEmail; I-4 P0 not implemented | **ADD R-013** (conflict between ROADMAP POST_MVP and CHECKLIST P0) | R-013 | P1 — P0 per I-4 | YES | YES |
| Invite email | YES | email.service.ts: sendInviteMemberEmail | Implemented; production SMTP not verified | Already in FAM-07 / auth flow scope | None new | — | — | — |
| Admin alert for new inquiry | NO | None | No admin alert email function | Add to FAM-03 or FAM-10 scope | PRIT-033 | P1 | NO | YES |
| Email delivery failure handling | PARTIAL | email.service.ts: SKIPPED_SMTP_UNCONFIGURED fallback | Graceful fallback exists; but SMTP config in production not verified | Verify SMTP in production as part of FAM-07 or FAM-10 cycle | FAM-07/FAM-10 | P1 | NO | YES |
| Roadmap vs. checklist conflict (notifications P0 vs. POST_MVP) | NO | MVP-MUST-HAVES I-4 (P0) vs. ROADMAP row 26 (POST_MVP) | Contradiction — same feature classified P0 in checklist and POST_MVP in roadmap | **ADD R-013** to formally flag the conflict | R-013 | P1 | YES | NO |

---

### Group D — Role / Permission Matrix

| Candidate Item | Already Represented? | Current Source | Gap | Recommended Action | Proposed Dest | Priority Rec | Paresh? | Family Audit? |
|---|---|---|---|---|---|---|---|---|
| Shopper/anonymous buyer role | NO | None | Not formally defined anywhere | Confirm in FAM-06 opening as a boundary case | FAM-06 opening | P2 | NO | YES |
| Authenticated buyer role (future) | NO | None | No authenticated B2C/D2C buyer role defined | Depends on D-012; confirm when buyer account PRIT is reviewed | PRIT-032 | P2 | YES | YES |
| Supplier admin role | PARTIAL | FAM-07/FAM-08, AdminRBAC.tsx, RBAC governance units | RBAC units done (TECS-FBW-ADMINRBAC series); formal matrix doc not standalone | Confirm complete scope in FAM-07/FAM-08 opening audit | FAM-07/FAM-08 | — | — | YES |
| Supplier staff / member role | PARTIAL | TeamManagement.tsx, InviteMemberForm.tsx exist | Member invite path exists; role boundary not formally documented | Confirm in FAM-07/FAM-08 opening | FAM-07/FAM-08 | — | — | YES |
| Tenant admin role | PARTIAL | FAM-08 scope | Addressed by FAM-08 cycle | FAM-08 | — | — | YES | YES |
| Platform admin / superadmin | PARTIAL | FAM-10, ControlPlane/ components | FAM-10 cycle covers control plane ops | FAM-10 | — | — | NO | YES |
| Formal standalone role/permission matrix doc | NO | None | No single document catalogues all roles end-to-end | Confirm if needed at FAM-06 or FAM-10 opening | FAM-06 or FAM-10 gate | P1 | YES | YES |

---

### Group E — Legal / Consent

| Candidate Item | Already Represented? | Current Source | Gap | Recommended Action | Proposed Dest | Priority Rec | Paresh? | Family Audit? |
|---|---|---|---|---|---|---|---|---|
| Privacy notice for inquiry form | YES | FTR-LEGAL-002, PRIT-011 (PARESH_CONFIRMED, MVP_CRITICAL/P1) | Registered and confirmed; implementation pending FAM-03 cycle | No new entry needed; confirm implementation in FAM-03 cycle | PRIT-011 / FAM-03 | P1 | — | YES |
| Supplier ToS / platform agreement acceptance | YES | FTR-LEGAL-003, PRIT-012 (PARESH_CONFIRMED, MVP_CRITICAL/P1) | Registered and confirmed; implementation pending FAM-07 cycle | No new entry needed | PRIT-012 / FAM-07 | P1 | — | YES |
| Public privacy policy page (standalone frontend page) | NO | None | No static /privacy page, no PrivacyPage component, not in any PRIT or FTR | **ADD PRIT-034** — public legal pages bundle (privacy + terms + cookie stance) | PRIT-034 | P1 | YES | NO |
| Public terms of service page (standalone frontend page) | NO | None | PRIT-012 covers supplier ToS acceptance flow, not the public-facing ToS page | Part of PRIT-034 | PRIT-034 | P1 | YES | NO |
| Cookie / analytics consent stance | NO | None | No cookie banner, no analytics opt-in, no consent management | Part of PRIT-034; also gated by PRIT-035 (analytics tooling decision) | PRIT-034 | P1 | YES | NO |
| Data deletion / data subject request path (GDPR/DPDP) | NO | D-5 in MVP-MUST-HAVES (NOT_ASSESSED/P1) | No deletion request form or mechanism in repo | Part of PRIT-034 | PRIT-034 | P1 | YES | NO |

---

### Group F — Admin Support / Diagnostics

| Candidate Item | Already Represented? | Current Source | Gap | Recommended Action | Proposed Dest | Priority Rec | Paresh? | Family Audit? |
|---|---|---|---|---|---|---|---|---|
| Inspect tenant/user/inquiry from control plane | YES | FTR-CP-001, PRIT-010 (PARESH_CONFIRMED, MVP_CRITICAL/P0) | TenantRegistry, TenantDetails exist in ControlPlane/; FTR-CP-001 covers registry + inspect | No new entry; confirm in FAM-10 cycle | PRIT-010 / FAM-10 | — | — | YES |
| Resend invite from control plane | NO | FTR-CP-001 general scope | Not specifically registered as a capability | Add as sub-item in FAM-10 opening audit | FAM-10 gate | P1 | NO | YES |
| Disable / deactivate tenant from control plane | NO | FTR-CP-001 covers "activation"; deactivation not explicitly registered | Deactivation path not in any register | Add to FAM-10 opening audit | FAM-10 gate | P1 | NO | YES |
| View failed events / event stream from control plane | PARTIAL | EventStream.tsx exists in ControlPlane/ | EventStream component exists; no specific PRIT or FTR for event observability | Add as sub-item in FAM-10 opening | FAM-10 gate | P1 | NO | YES |

---

### Group G — Data Readiness

| Candidate Item | Already Represented? | Current Source | Gap | Recommended Action | Proposed Dest | Priority Rec | Paresh? | Family Audit? |
|---|---|---|---|---|---|---|---|---|
| Safe demo supplier/product data | YES (risk) | BS-001 (P0), HD-002 (P0), R-002 (P0) | Risk is registered; no formal "seed policy" PRIT | No new PRIT; confirm QA seed script output at FAM-09 opening | BS-001/HD-002/R-002 | — | — | YES |
| Production seed policy (no fake claims) | PARTIAL | BS-001 references risk; NC Phase 1 QA seed exists | No formal seed policy document | Note for FAM-09 opening — confirm safe seed policy before real supplier onboarding | FAM-09 gate | P1 | YES | YES |
| Data reset strategy | NO | None | No documented data reset/rollback strategy | Mostly ops; see FTR-OPS-003/PRIT-015 for rollback procedure; Supabase PITR outside repo scope | FTR-OPS-003 / FAM-10 | P1 | NO | YES |

---

### Group H — Product Analytics / Funnel Tracking

| Candidate Item | Already Represented? | Current Source | Gap | Recommended Action | Proposed Dest | Priority Rec | Paresh? | Family Audit? |
|---|---|---|---|---|---|---|---|---|
| Public page views tracking | NO | None | No analytics service, no GA4/Segment/Mixpanel in repo | **ADD PRIT-035** — product analytics / funnel tracking infrastructure | PRIT-035 | P2 — PILOT_REQUIRED | YES | NO |
| CTA click tracking (inquiry submit, sign-in, sign-up) | NO | None | No event tracking for any public CTA | Part of PRIT-035 | PRIT-035 | P2 | YES | NO |
| Auth signup funnel | NO | None | No analytics hook in auth flows | Part of PRIT-035 | PRIT-035 | P2 | YES | NO |
| Supplier onboarding progress tracking | NO | None | No funnel analytics for onboarding completion | Part of PRIT-035; FAM-07 opening | PRIT-035 | P2 | YES | YES |
| Inquiry submission event tracking | NO | None | buyer_inquiry.created.v1 event exists in events.ts but is FUTURE emission; not emitted yet | Part of PRIT-035; event emission is blocked (see events.ts comment: "future INQUIRY-004 emission") | PRIT-035 | P2 | YES | YES |

---

### Group I — Backup / Export / Recovery

| Candidate Item | Already Represented? | Current Source | Gap | Recommended Action | Proposed Dest | Priority Rec | Paresh? | Family Audit? |
|---|---|---|---|---|---|---|---|---|
| DB backup posture | NO (repo) | None — Supabase manages backups | Supabase Pro tier provides PITR; not a repo item; outside repo scope | Confirm Supabase backup plan tier in FAM-10 opening | FAM-10 gate | P1 | YES | YES |
| Export inquiry / supplier data | NO | None | No data export API or mechanism in repo | Not a launch blocker; note for post-pilot compliance review | Post-MVP | P2 | YES | NO |
| Restore runbook | YES (partial) | FTR-OPS-003, PRIT-015 (PARESH_CONFIRMED, MVP_CRITICAL/P1) | Registered; covers Vercel + Supabase rollback; DB PITR restore not explicitly documented | Confirm PITR restore path in FAM-10 cycle | PRIT-015 / FAM-10 | — | — | YES |

---

### Group J — B2C/D2C Non-Payment Commerce

| Candidate Item | Already Represented? | Current Source | Gap | Recommended Action | Proposed Dest | Priority Rec | Paresh? | Family Audit? |
|---|---|---|---|---|---|---|---|---|
| Cart-as-intent (no payment) | PARTIAL — code exists | Cart.tsx, cartService.ts, MarketplaceCartSummary, CartSummariesPanel | No governing PRIT/FTR/family | **ADD PRIT-032** to bring under governance | PRIT-032 | P2 | YES | YES |
| Wishlist / saved items | NO | None | No code, no governance | Post-FAM-09; confirm if scope includes this | Post-FAM-09 | P3 | YES | YES |
| Compare list | NO | None | No code, no governance | Post-MVP; low priority | POST_MVP | P3 | NO | NO |
| RFQ from cart / saved items | NO | None | No code, no governance | Post-D-012; part of future commerce design | POST_MVP | P3 | YES | NO |

---

## §6 Missing Candidate Items (New Additions Needed)

The following items are **confirmed missing** from all current TLRH registers
and warrant new entries before the first family cycle selection:

### PRIT-032 — Cart-as-Intent Buyer Surface Governance

**Why missing:** `Cart.tsx`, `cartService.ts`, `MarketplaceCartSummary` Prisma model, and
`CartSummariesPanel.tsx` all exist in the repo. They represent a partially-implemented cart
surface. However, there is no governing family, PRIT, FTR, or design unit for this code.
The code may contain implicit design decisions that conflict with future family scope.

**Proposed entry:**
- Title: Cart-as-intent buyer surface — governance and family assignment
- Proposed family: FAM-01 (B2C Browse) opening audit, or a new buyer-commerce family
- Provisional launch class: PILOT_REQUIRED / P2
- Requires Paresh decision: YES — what cart scope is authorized for the Surat pilot?
- Evidence level: REPO_PARTIAL (code exists, governance absent)

---

### PRIT-033 — Supplier Inquiry Response Workflow (Tenant Inbox)

**Why missing:** The inquiry loop in TexQtic currently ends at DB write. No tenant-side
surface exists for a supplier to see incoming inquiries or respond to them. FAM-03 covers
inquiry _submission_ (public side), but the supplier response side is completely absent from
all registers. Without supplier response capability, the entire inquiry value proposition
is unverifiable. This is a potential P1/MVP_CRITICAL gap.

**Proposed entry:**
- Title: Supplier inquiry response workflow — tenant dashboard inquiry inbox
- Proposed family: FAM-03 (Inquiry) or FAM-08 (Tenant Core Workspace) — Paresh to decide
- Provisional launch class: MVP_CRITICAL / P1
- Requires Paresh decision: YES — which family owns this? Is a basic inbox sufficient for pilot?
- Evidence level: PLANNED_NOT_IN_REPO (no code; no governance)

---

### PRIT-034 — Public Legal Pages Bundle (Privacy + Terms + Cookie Stance)

**Why missing:** FTR-LEGAL-002/PRIT-011 covers the inline privacy _notice_ on the inquiry
form. FTR-LEGAL-003/PRIT-012 covers the supplier ToS _acceptance flow_. But standalone
public-facing legal pages — `/privacy`, `/terms`, cookie/analytics consent, and a data
subject deletion request path — are absent from all registers and from the repo. D-5 in
MVP-MUST-HAVES (NOT_ASSESSED/P1) covers "GDPR/data handling basics" but is unlinked to any
PRIT or FTR.

**Proposed entry:**
- Title: Public legal pages — privacy policy, terms of service, cookie/analytics stance,
  DSAR path
- Proposed family: Standalone unit under FAM-03 scope (public surface) or FAM-07
- Provisional launch class: MVP_CRITICAL / P1 (GDPR/India DPDP both require at minimum a
  public privacy policy before data collection begins)
- Requires Paresh decision: YES — content, legal review, counsel involvement
- Evidence level: PLANNED_NOT_IN_REPO

---

### PRIT-035 — Product Analytics / Funnel Tracking

**Why missing:** No analytics service, no page-view tracking, no CTA event tracking, and no
funnel instrumentation exist in the repo. The `buyer_inquiry.created.v1` event is defined in
`events.ts` but is commented as a "future INQUIRY-004 emission" — it is not being emitted.
Without funnel data, Paresh will have no basis for post-pilot commercial decisions or
investment decisions. No PRIT, FTR, or family currently covers product analytics.

**Proposed entry:**
- Title: Product analytics and funnel tracking infrastructure
- Proposed family: FAM-10 (Platform Ops) for infrastructure choice; FAM-01/FAM-02 for
  instrumentation of public events
- Provisional launch class: PILOT_REQUIRED / P2 (not an MVP_CRITICAL blocker, but without
  it the pilot produces no actionable data)
- Requires Paresh decision: YES — tooling choice (GA4, Mixpanel, Segment, PostHog, etc.)
- Evidence level: PLANNED_NOT_IN_REPO

---

### R-013 — Notification Infrastructure: ROADMAP vs. CHECKLIST Classification Conflict

**Why new risk:** MVP-LAUNCH-READINESS-ROADMAP.md row 26 classifies "messaging/
notifications" as `NOT_ASSESSED / P3 / POST_MVP`. However, MVP-MUST-HAVES-CHECKLIST.md I-4
("Inquiry notification reaches supplier/admin") is `NOT_ASSESSED / P0`. These are the same
capability classified at opposite priority levels across two TLRH documents. If the ROADMAP
classification is used during planning, the P0 checklist item will be deprioritized or missed.
The existing BS-002 captures the notification _delivery_ risk, but does not capture this
_classification conflict_ as a governance issue.

---

### R-014 — Cart Code Ungoverned: Implicit Design Decisions Without a Governing Unit

**Why new risk:** Cart.tsx, cartService.ts, admin-cart-summaries.ts, and
CartSummariesPanel.tsx exist in the codebase with a `MarketplaceCartSummary` Prisma model.
This code was likely written as a scaffold or future feature. However, it contains implicit
design decisions (cart data model, admin visibility, cart ID as cursor, cart_id schema) that
are not documented in any governing unit. A family cycle opening that audits the B2C or
buyer commerce surface will encounter this code with no authoritative design artifact to
compare against.

---

## §7 Items Confirmed Already Represented

The following candidate items from Groups A–J are already adequately represented in
current TLRH registers. No new entry is recommended.

| Candidate Item | Source | Notes |
|---|---|---|
| Invite email infrastructure | email.service.ts + FAM-07 scope | sendInviteMemberEmail implemented |
| Supplier privacy notice (inquiry form) | FTR-LEGAL-002, PRIT-011 | PARESH_CONFIRMED, MVP_CRITICAL/P1 |
| Supplier ToS acceptance flow | FTR-LEGAL-003, PRIT-012 | PARESH_CONFIRMED, MVP_CRITICAL/P1 |
| Error monitoring / alerting | FTR-OPS-001, PRIT-013 | PARESH_CONFIRMED, MVP_CRITICAL/P1 |
| Rollback procedure documentation | FTR-OPS-003, PRIT-015 | PARESH_CONFIRMED, MVP_CRITICAL/P1 |
| B2C public browse, product detail, collections | FAM-01, FAM-02 | VERIFIED_COMPLETE (Group A status) |
| Inquiry submission (public) | FAM-03, I-1–I-3 PRODUCTION_VERIFIED | DB write verified; notification (I-4) remains open |
| SEO metadata, sitemap, robots, JSON-LD | FAM-04, SEO-1–SEO-3, SEO-6 PRODUCTION_VERIFIED | Canonical strategy (D-005) still PARKED |
| Auth and session management | PRIT-001, FAM-06 | Confirmed P0 LAUNCH_BLOCKER; family not yet opened |
| Tenant onboarding and invite | PRIT-002, FAM-07 | Confirmed P0 LAUNCH_BLOCKER |
| Tenant core workspace | PRIT-003, FAM-08 | Confirmed P0 LAUNCH_BLOCKER |
| Supplier profile and catalog | PRIT-004, FAM-09 | Confirmed P0 LAUNCH_BLOCKER; PublicSupplierProfile pre-existing M |
| Control plane / platform ops | PRIT-005, PRIT-010, FTR-CP-001, FAM-10 | Confirmed P0 LAUNCH_BLOCKER; boundary artifact exists |
| Subscription / commercial gating | PRIT-006, FAM-11 | Confirmed P1; pilot = FREE/operator-provisioned |
| NC RFQ / Pools / Award E2E | PRIT-007, FAM-12 | PARTIALLY_IMPLEMENTED; G-022 decision needed (D-007) |
| NC Invoices / Settlement | PRIT-008, FAM-15 | Depends on FAM-12 E2E |
| Reused-existing-user edge case | PRIT-009, FTR-AUTH-001 | MVP_CRITICAL/P1; DESIGN_GATED |
| B2B financial boundary guardrail | PRIT-030 | CONFIRMED_BOUNDARY (constitutional) |
| Payment without merchant model risk | R-008 | P1 OPEN |
| B2B family cycle financial drift risk | R-009 | P1 OPEN |
| Inquiry notification delivery risk | BS-002 | P0 OPEN — separate from R-013 conflict risk |
| DPP launch authorization decision | D-001 | PARKED, HOLD_FOR_PARESH_DECISION |
| SEO canonical domain strategy | D-005, FTR-SEO-001 | PARKED/P1 |
| Real-data smoke test need | BS-001, R-002, R-005 | P0 OPEN |
| Supplier onboarding hidden dependency | HD-001, HD-003 | P0 OPEN |
| Control plane hidden dependency | HD-004 | P0 OPEN |
| Performance / load testing | FTR-OPS-002, PRIT-014 | PILOT_REQUIRED/P2 |
| Canonical domain authority risk (BS-007) | BS-007 | P1 OPEN |

---

## §8 Items to Wait Until Family Opening Audit

The following items exist as gaps or uncertainties but should NOT be added to registers now.
They will be resolved more accurately when the relevant family cycle opens and a full repo
audit is conducted.

| Item | Why wait | When to address |
|---|---|---|
| Resend-invite control plane capability | FTR-CP-001 general scope; exact capability gap needs code inspection | FAM-10 opening audit |
| Tenant deactivation control plane path | FTR-CP-001 scope; code inspection needed | FAM-10 opening audit |
| Event stream / failed event observability | EventStream.tsx exists; exact capability and gap need inspection | FAM-10 opening audit |
| Supplier admin / staff role boundary | TeamManagement.tsx, InviteMemberForm.tsx exist; formal role matrix needs audit | FAM-07/FAM-08 opening |
| Anonymous shopper vs. authenticated buyer auth boundary | Depends on D-012 and PRIT-032 scope | FAM-06 opening; after D-012 gate |
| Supabase backup plan tier verification | Not a repo item; operational check | FAM-10 opening checklist |
| NC Phase 1 QA seed vs. real-data seed policy | NC seed script exists; policy needs formal documentation | FAM-09 opening |
| Data export API design | Post-pilot compliance topic; no current pressure | Post-MVP planning |

---

## §9 Items Excluded as Out-of-Repo Business / GTM

The following were evaluated and excluded from PRIT/FTR/Register candidacy:

| Item | Reason Excluded |
|---|---|
| Pricing / subscription commercial model | D-008 already parked; business decision outside repo scope |
| Investor pitch / fundraising materials | Governance rule §6: no GTM items |
| Sales script or field materials | Governance rule §6: no GTM items |
| B2B wholesale pricing strategy | Business decision; no repo scope |
| Marketing channel / campaign decisions | GTM; no repo scope |
| Customer success / support SLA | Operational; outside repo |
| Surat pilot supplier selection | GTM; Paresh's business decision |
| Brand identity / logo / design tokens | Design decision; not a platform governance item |
| India DPDP vs. GDPR regulatory stance | Legal decision; requires external counsel; outside repo scope (though repo implementation will be gated by the outcome) |

---

## §10 Recommended Additions Before First Family Selection

These are the minimum additions recommended before `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`
opens. Each is actionable without requiring implementation.

### Immediate additions (this scan unit):

1. **Add PRIT-032** — Cart-as-intent buyer surface governance (ungoverned code finding)
2. **Add PRIT-033** — Supplier inquiry response workflow (closes the inquiry loop gap)
3. **Add PRIT-034** — Public legal pages bundle (privacy policy, terms page, cookie stance)
4. **Add PRIT-035** — Product analytics / funnel tracking infrastructure
5. **Add R-013** — Notification classification conflict (ROADMAP POST_MVP vs. CHECKLIST P0)
6. **Add R-014** — Cart code ungoverned risk

### Items to flag at first family selection but not add now:

7. At FAM-06 opening: confirm shopper/anonymous-buyer role boundary
8. At FAM-07 opening: confirm formal role/permission matrix scope
9. At FAM-10 opening: confirm resend-invite, tenant deactivation, Supabase backup tier

---

## §11 First Family Selection Implications

This scan supports the following observations for `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`:

1. **FAM-06 (Auth and Session Management) remains the correct first family to open** after
   Layer 0 authorization. This was the pre-existing recommendation in LAUNCH-FAMILY-INDEX.md.
   Nothing in this scan changes that. FAM-06 must complete before FAM-07, FAM-08, FAM-09,
   and FAM-11 can open.

2. **PRIT-033 (supplier inquiry response) should be noted at FAM-06 opening** because the
   supplier-side inquiry inbox requires supplier authentication. It cannot be designed or
   implemented without FAM-06 completing.

3. **PRIT-032 (cart governance) is independent of FAM-06** and can be catalogued immediately,
   but implementation must wait until FAM-09 (Supplier Profile/Catalog) or a dedicated buyer
   commerce family opens. The cart has no auth dependency at the design-scoping stage.

4. **PRIT-034 (public legal pages) has no auth dependency** and can proceed as a standalone
   unit once Paresh approves the content approach. The front-end implementation is simple.
   This could potentially be addressed before FAM-06 opens, but counsel review may gate it.

5. **PRIT-035 (analytics) requires a tooling decision** (Paresh must choose the analytics
   product). Infrastructure wiring would be a FAM-10 task. Event instrumentation on public
   pages (FAM-01/FAM-02) could happen in the family's own cycle.

6. **R-013 (notification conflict) requires Paresh to resolve the classification** of inquiry
   notification as either I-4 P0 (checklist classification) or row 26 POST_MVP (roadmap
   classification) before any family planning uses either document as a priority input.

7. **The candidate items in §6 (PRIT-032–035 and R-013, R-014) should be confirmed by Paresh**
   before `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` begins. They do not block the selection
   — they are additive context. But knowing about the supplier inquiry response gap (PRIT-033)
   is particularly important because it affects how FAM-03 is scoped in cycle planning.

---

## §12 Completion Checklist

| Gate | Status |
|---|---|
| All 14 authoritative documents read before scan written | ✅ YES |
| Repo structure inspected at high level (components/, services/, routes/) | ✅ YES |
| All 10 candidate groups (A–J) evaluated | ✅ YES |
| New PRIT candidates identified and documented | ✅ YES (PRIT-032–035) |
| New Risk candidates identified and documented | ✅ YES (R-013, R-014) |
| Items already represented confirmed | ✅ YES (§7) |
| Items excluded as GTM/business confirmed | ✅ YES (§9) |
| Layer 0 posture verified unchanged | ✅ YES (HOLD_FOR_AUTHORIZATION / HOLD_FOR_COUNSEL_FEEDBACK) |
| No implementation proposed or implied | ✅ YES |
| No family cycle opened | ✅ YES |
| No payment/legal/product decisions made | ✅ YES |
| Pre-existing unstaged M files untouched | ✅ YES |

---

## §13 Update History

| Date | Change | Who |
|---|---|---|
| 2026-07-14 | Created — full scan complete; PRIT-032–035 and R-013/R-014 identified | `TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001` |
