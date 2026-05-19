# TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001

**Unit ID:** TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001  
**Title:** TexQtic Platform — Technical Launch Readiness Audit and Classification Strategy  
**Status:** COMPLETE  
**Type:** GOVERNANCE_STRATEGY — Docs-only  
**Date:** 2026-07-14  
**Authorized by:** Paresh  
**Layer 0 posture at authoring:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`  
**Git HEAD at authoring:** `fab5bdc` (11 governance files committed)  
**Pre-existing modified runtime files (do not stage):**  
- `components/Public/PublicSupplierProfile.tsx` — unstaged M (pre-existing)  
- `tests/frontend/public-referral-landing.test.tsx` — unstaged M (pre-existing)

---

## 0. Critical Operating Constraint

**This document is a STRATEGY artifact only. It does NOT:**

- Open any implementation unit
- Populate any hub skeleton document
- Authorize any code, schema, migration, route, service, event, or OpenAPI change
- Override the `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` Layer 0 posture

**It DOES:**

- Define the audit methodology, classification taxonomy, and evidence standards for the
  next unit (`TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-001`)
- Define how the CRM and CAE child repos shall be included in the audit strategy
- Define how Paresh-planned features not yet in code shall be recorded
- Define how MVP vs. post-MVP classification shall be made
- Define how the integrated development plan shall be structured
- Define stop conditions and blocker protocols for the audit unit itself

**This strategy must be read in full before opening `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-001`.**

---

## 1. Purpose and Context

### 1.1 Why a Strategy Is Required Before Audit

The `governance/launch-readiness/` hub was created in `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`
and committed at `fab5bdc`. All hub documents are currently `SKELETON — PENDING POPULATION`.

Before the audit unit (`TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-001`) can populate those
skeletons, it must have:

1. A defined, stable taxonomy of feature source, classification, readiness status, priority, and evidence level
2. A known audit scope covering the main platform repo, the CRM repo (`TexQtic-CRM`), and the CAE repo (`TEXQTIC-CUSTOMER-ACQUISITION-ENGINE`)
3. Rules for handling features that Paresh has planned or communicated but that are not yet in any repo
4. Rules for handling stale, superseded, and historically-archived governance docs
5. A defined integrated development plan structure that the hub population unit can output
6. Clear stop conditions and blocker protocols so the audit unit does not drift or over-produce

Without this strategy, the audit unit risks: incomplete scope, inconsistent classification,
proliferation of stale feature records, and a hub that cannot be maintained.

### 1.2 Scope of This Strategy

This strategy covers:

| Repo / System | Path | Status in this workspace |
|---|---|---|
| TexQtic main platform | `c:\Users\PARESH\TexQtic` | OPEN in this workspace |
| TexQtic CRM | `c:\Users\PARESH\TexQtic-CRM` | Exists locally; separate repo; accessible |
| TexQtic CAE | `c:\Users\PARESH\TEXQTIC-CUSTOMER-ACQUISITION-ENGINE` | Exists locally; separate monorepo; accessible |
| TexQtic Marketing | `c:\Users\PARESH\texqtic-marketing-` | Exists locally; separate repo; referenced in CRM investigation |

The CRM and CAE repos are **not** part of the main platform workspace. They are external
child systems. Their audit tracks are separate workstreams within the integrated development plan.

### 1.3 What Is Excluded

The following are **out of scope for the technical audit**:

- Fundraising plans, pitch deck content, investor materials
- Marketing copy, brand messaging, and storytelling docs
- Business model analysis, pricing strategy, and go-to-market narrative
- Legal counsel communications and TTP legal packet content
- Non-technical governance docs (unless they contain a feature classification that must be recorded)
- Personal planning notes, email threads, and informal Paresh communications

---

## 2. Pre-Audit Inspection Sources

### 2.1 Main Platform Repo — Canonical Truth Sources

The following sources must be inspected in the audit unit, in priority order:

| # | Source | Path | Purpose |
|---|---|---|---|
| 1 | Prisma schema | `server/prisma/schema.prisma` | Authoritative data model; defines what is implemented vs. designed |
| 2 | Route inventory | `server/src/routes/` | Defines all implemented API surfaces |
| 3 | Public routes | `server/src/routes/public.ts` | Public B2C surface |
| 4 | Auth routes | `server/src/routes/auth.ts` | Auth/onboarding surface |
| 5 | Tenant routes | `server/src/routes/tenant.ts` + `tenant/` | Tenant workspace surface (22 route files) |
| 6 | Control routes | `server/src/routes/control.ts` + `control/` | Control plane surface (13 route files) |
| 7 | Admin routes | `server/src/routes/admin/` | Admin surface (3 route files) |
| 8 | Internal routes | `server/src/routes/internal/` | Internal orchestration surface |
| 9 | AI routes | `server/src/routes/ai.ts` | AI/document intelligence surface |
| 10 | Frontend components | `components/` | UI surface map (Public, Auth, Tenant, ControlPlane, Onboarding, WL, WhiteLabelAdmin) |
| 11 | App router | `App.tsx` | Route registration and surface coverage |
| 12 | Services layer | `services/` | Service implementations |
| 13 | Server-side tests | `server/src/routes/*.test.ts` | Test coverage evidence |
| 14 | Frontend tests | `tests/frontend/` | Frontend test coverage evidence |
| 15 | OpenAPI contracts | `shared/contracts/openapi.tenant.json`, `openapi.control-plane.json` | Contract coverage |
| 16 | Feature flags | Runtime config; `governance/control/BLOCKED.md` | Feature flag registry |
| 17 | Layer 0 control | `governance/control/NEXT-ACTION.md`, `BLOCKED.md`, `OPEN-SET.md` | Authoritative delivery state |
| 18 | Hub roadmap | `governance/launch-readiness/MVP-LAUNCH-READINESS-ROADMAP.md` | MVP family matrix |
| 19 | Must-haves checklist | `governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md` | Binary launch gates |
| 20 | Blind spots register | `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | Known gaps and risks |

### 2.2 CRM Repo — Canonical Truth Sources

| # | Source | Path (from `c:\Users\PARESH\TexQtic-CRM`) | Purpose |
|---|---|---|---|
| 1 | Supabase migrations | `supabase/migrations/` | Authoritative CRM schema state |
| 2 | CRM server routes | `server/` + `server.ts` | CRM API surface |
| 3 | CRM frontend pages | `src/pages/` | CRM internal UI surface |
| 4 | CRM components | `src/components/` | CRM component surface |
| 5 | CRM hooks | `src/hooks/` | CRM data-fetch patterns |
| 6 | CRM types | `src/types/` | CRM type surface |
| 7 | Webhook logic | `src/webhook-logic.ts` | CRM → platform webhook logic |
| 8 | Package manifest | `package.json` | CRM dependency surface |
| 9 | CRM scripts | `scripts/` | CRM operational scripts |
| 10 | CRM governance | `governance/` | CRM local governance |
| 11 | Cross-system contracts (main repo) | `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Canonical handoff model |
| 12 | CRM data investigation (main repo) | `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Known gaps |

### 2.3 CAE Repo — Canonical Truth Sources

| # | Source | Path (from `c:\Users\PARESH\TEXQTIC-CUSTOMER-ACQUISITION-ENGINE`) | Purpose |
|---|---|---|---|
| 1 | Service API | `services/api/` | CAE API surface |
| 2 | Service workers | `services/workers/` | CAE background worker surface |
| 3 | Web admin app | `apps/web-admin/` | CAE admin UI surface |
| 4 | Packages | `packages/` | CAE shared modules |
| 5 | Source root | `src/` | CAE root source |
| 6 | Tests | `tests/` | CAE test coverage |
| 7 | Infrastructure | `infra/` | CAE infra/deployment posture |
| 8 | Docs | `docs/` | CAE internal documentation |
| 9 | Package manifest | `package.json` + `tsconfig.base.json` | CAE dependency surface |
| 10 | Render config | `render.yaml` | CAE deployment surface |
| 11 | Main repo planning (main repo) | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md` | Planned integration waves |
| 12 | Boundary design (main repo) | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | CAE–Platform boundary |

---

## 3. Feature Inventory Strategy

### 3.1 Inventory Goal

The audit must produce a single, unified feature inventory covering:

- Every implemented feature in the main platform repo
- Every implemented feature in the CRM repo
- Every implemented feature in the CAE repo
- Every planned feature not yet implemented in any repo

This inventory is the authoritative input to all hub documents.

### 3.2 Feature Granularity Rule

A "feature" is defined at the **capability level**, not at the file or function level:

- CORRECT GRANULARITY: "Supplier RFQ — create draft", "Tenant invite flow", "Public product detail page"
- TOO FINE: "rfqDraftSubmit.ts line 47", "createDraft() function"
- TOO COARSE: "Tenant module", "All of network commerce"

Each feature must be assignable to exactly one **family** (§7).

### 3.3 Feature Source Classification

Every feature in the inventory must be assigned a source code:

| Code | Meaning |
|---|---|
| `REPO_IMPLEMENTED` | Fully implemented: route + service + schema + test all present |
| `REPO_PARTIAL` | Partially implemented: some layers present, others missing |
| `UI_ONLY` | Frontend component present; no corresponding backend route |
| `BACKEND_ONLY` | Backend route/service present; no frontend component |
| `CONFIG_ONLY` | Feature flag or config entry only; no route or component |
| `TEST_ONLY` | Test coverage exists for a path not yet fully implemented |
| `GOVERNANCE_ONLY` | Governance/design doc exists; nothing in any repo |
| `PLANNED_NOT_IN_REPO` | Paresh has communicated a plan; no artifact in any repo |
| `HISTORICAL_STALE` | Was in a prior tracker or planning doc; origin unclear |
| `SUPERSEDED` | Explicitly superseded by a later unit or decision |
| `OUT_OF_REPO_BUSINESS_PLAN` | Business/fundraising plan item; out of technical scope |

### 3.4 Intake Form for Planned-But-Not-In-Repo Features

When a planned feature is not found in any repo, it must be recorded using this intake form:

| Field | Required | Description |
|---|---|---|
| Feature ID | YES | Unique `FEAT-XXX-NNN` format |
| Feature name | YES | Short capability label |
| Source system | YES | MAIN / CRM / CAE / CROSS_SYSTEM |
| Family | YES | One of the families in §7 |
| Source of plan | YES | Doc reference or Paresh statement |
| Source classification | YES | Code from §3.3 |
| Launch classification | YES | Code from §10 |
| Readiness status | YES | Code from §11 |
| Priority | YES | Code from §12 |
| Evidence level | YES | Code from §13 |
| Business decision required | YES | YES / NO / BLOCKED |
| Technical prerequisite | NO | FEAT-ID or plain text |
| Notes | NO | Free text |
| First recorded | YES | Date and unit ID |

---

## 4. Tracker Audit Strategy

### 4.1 Trackers to Audit

The following existing trackers contain feature records that may be stale, superseded, or
partially overlapping with hub documents. Each must be reviewed for accuracy:

| Tracker | Path | Known stale dimensions |
|---|---|---|
| `MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md` | `docs/product-truth/` | Current authority (v2 is corrected as of 2026-07-06) |
| `MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-v1.md` | `docs/product-truth/` | Layer 0 posture; Unit I status; AI matching status; GAP-ACQ-003 |
| `MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` | `docs/product-truth/` | Same dimensions as merged tracker v1 |
| Family unit trackers (TEXQTIC-B2C-FAMILY-*, TEXQTIC-D2C-FAMILY-*) | `governance/units/` | Check for stale readiness or superseded units |

### 4.2 Tracker Reconciliation Rules

For each tracker record:

1. Determine whether the record has been executed (search git log for authoritative commit evidence)
2. Classify as: `CLOSED_VERIFIED`, `CLOSED_SUPERSEDED`, `OPEN_AUTHORIZED`, `OPEN_PENDING_LEGAL_GATE`, or `OPEN_NEEDS_TECH_AUDIT`
3. If the record contradicts a Layer 0 control file, the Layer 0 file wins
4. If the record contradicts a closed unit's verification artifact, the verification artifact wins
5. If two trackers conflict and neither has a verification artifact, flag as `GOVERNANCE_CONFLICT` and escalate to Paresh

### 4.3 Stale Doc Classification

| Classification | Meaning | Action in audit |
|---|---|---|
| `CURRENT_AUTHORITY` | Most recent authoritative version; no known stale dimensions | Record as-is |
| `PARTIALLY_STALE` | Some sections stale; specific dimensions corrected by newer artifacts | Record which dimensions are stale; note override authority |
| `FULLY_SUPERSEDED` | Entire document superseded by newer artifact | Note the superseding artifact; do not record its contents as current |
| `HISTORICAL_ARCHIVE` | Older closed planning doc; preserved for audit trail only | Do not extract features from it without cross-checking newer authority |
| `OPEN_GOVERNANCE_CONFLICT` | Two artifacts make incompatible claims with no resolution | Flag for Paresh decision; do not infer |

---

## 5. Main Platform Technical Audit Categories

The audit must inspect and classify every implemented and planned feature in the main platform
against the following 20 categories. Each category maps to one or more route/component families.

| # | Category | Route family / surface | Launch classification baseline |
|---|---|---|---|
| 1 | Public B2C browse and product detail | `routes/public.ts`, `components/Public/` | MVP_CRITICAL |
| 2 | D2C public collections | `routes/public.ts` (collections paths), `components/Public/` | MVP_CRITICAL |
| 3 | Inquiry submission and context handoff | `routes/public.ts` (inquiry), `components/Public/` | MVP_CRITICAL |
| 4 | SEO metadata, sitemap, robots.txt, JSON-LD | Vite meta config, sitemap route, public pages | MVP_CRITICAL |
| 5 | DPP Digital Product Passport | `routes/public.ts` (/passport/:id), schema DPP fields | PARKED_DECISION |
| 6 | Auth — signup, login, session | `routes/auth.ts`, `components/Auth/` | LAUNCH_BLOCKER |
| 7 | Tenant onboarding and invite flow | `routes/tenant.ts` (activate, invite), `components/Onboarding/` | LAUNCH_BLOCKER |
| 8 | Tenant core workspace | `routes/tenant.ts`, `components/Tenant/` | LAUNCH_BLOCKER |
| 9 | Supplier profile and catalog management | `routes/tenant/` (supplier profile paths), `components/Tenant/` | LAUNCH_BLOCKER |
| 10 | Network Commerce — RFQ and procurement pools | `routes/tenant/poolRfq.ts`, `pools.ts`, `poolDemandLines.ts` | PILOT_REQUIRED |
| 11 | Network Commerce — award maker-checker | `routes/control/escalation.g022.ts`, `routes/tenant/escalation.g022.ts` | DESIGN_COMPLETE_BLOCKED |
| 12 | Network Commerce — supplier quotes | `routes/tenant/poolRfqSupplierQuotes.ts` | CONFIG_ONLY (flag false) |
| 13 | Network Commerce — invoices, settlement | `routes/tenant/invoices.ts`, `networkInvoices.ts`, `networkSettlement.ts` | PILOT_REQUIRED |
| 14 | TradeTrust Pay (TTP) | `routes/control/ttp-*.ts`, `routes/tenant/ttp-*.ts` | DESIGN_GATED (HOLD_FOR_COUNSEL_FEEDBACK) |
| 15 | Traceability and certifications | `routes/tenant/traceability.g016.ts`, `certifications.g019.ts` | POST_MVP |
| 16 | Control plane operations | `routes/control/`, `routes/admin/tenantProvision.ts` | LAUNCH_BLOCKER |
| 17 | Admin impersonation and control | `routes/admin/impersonation.ts` | LAUNCH_DEPENDENCY |
| 18 | Subscription and commercial gating | Tenant plan, org plan fields, commercial gating middleware | P1_MVP_MUST_HAVE |
| 19 | White Label Co (WL) | `routes/`, `components/WL/`, `components/WhiteLabelAdmin/` | POST_MVP (REVIEW-UNKNOWN) |
| 20 | AI / document intelligence | `routes/ai.ts` | POST_MVP |

---

## 6. CRM Technical Audit Categories

The following 12 categories define the audit scope for the CRM repo (`TexQtic-CRM`):

| # | Category | CRM Surface | Launch classification baseline |
|---|---|---|---|
| 1 | Lead intake and qualification | `src/pages/` (lead inbox), CRM backend intake route | MVP_CRITICAL |
| 2 | Onboarding case management | `src/pages/` (onboarding workbench), CRM backend onboarding routes | MVP_CRITICAL |
| 3 | KYC/KYB posture tracking | CRM backend KYC/KYB actions, `supabase/migrations/` | MVP_CRITICAL |
| 4 | Access issuance flow | `src/` issuance surface, CRM issuance backend | LAUNCH_BLOCKER |
| 5 | Applicant activation surface | CRM applicant activation page and backend | LAUNCH_BLOCKER |
| 6 | Customer account promotion | CRM customer-account promotion logic | LAUNCH_BLOCKER |
| 7 | Platform provisioning webhook | `src/webhook-logic.ts` (WEBHOOK-007); `BLOCKED_PENDING_ORF_EVENTS_JURISDICTION_AUTH_OPENAPI` | DESIGN_GATED |
| 8 | CRM → Platform handoff contract | Handoff event payload, cross-system ID fields (`externalOrchestrationRef`) | LAUNCH_BLOCKER |
| 9 | CRM data schema completeness | `supabase/migrations/` vs. `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | NOT_ASSESSED |
| 10 | Cross-system join keys | `issued_auth_user_id`, `platform_auth_user_id`, submission/lead/case link | NOT_ASSESSED |
| 11 | CRM jurisdiction payload gap | GAP-ACQ-007: CRM omits `jurisdiction`; must default to `IN` for acquisition suppliers | LAUNCH_DEPENDENCY |
| 12 | Post-activation servicing surface | CRM customer-account lifecycle and service tickets UI | POST_MVP |

---

## 7. CAE Technical Audit Categories

The following 12 categories define the audit scope for the CAE repo (`TEXQTIC-CUSTOMER-ACQUISITION-ENGINE`):

| # | Category | CAE Surface | Launch classification baseline |
|---|---|---|---|
| 1 | CAE API service implementation | `services/api/` | NOT_ASSESSED |
| 2 | CAE worker/background job service | `services/workers/` | NOT_ASSESSED |
| 3 | CAE admin web application | `apps/web-admin/` | NOT_ASSESSED |
| 4 | CAE shared packages | `packages/` | NOT_ASSESSED |
| 5 | CAE → CRM integration surface | API call or event from CAE to CRM lead intake | NOT_ASSESSED |
| 6 | CAE → Main platform integration | ROUTE-001 through ROUTE-006 from v2 tracker | DESIGN_GATED (all gated behind TTP legal gate) |
| 7 | CAE supplier acquisition pipeline | Multi-step acquisition flow through CAE | NOT_ASSESSED |
| 8 | CAE data schema and persistence | `infra/`, `src/` | NOT_ASSESSED |
| 9 | CAE deployment posture | `render.yaml`, `infra/` | NOT_ASSESSED |
| 10 | CAE test coverage | `tests/` | NOT_ASSESSED |
| 11 | CAE event emission | Planned events from v2 tracker; `PROVISIONED-EVENTS-008` | NOT_ASSESSED |
| 12 | CAE boundary with main platform | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | NOT_ASSESSED |

---

## 8. Cross-Repo Dependency Model

### 8.1 Dependency Chain

The three child repos participate in the following dependency chain for tenant provisioning:

```
Marketing site
    ↓ (form submission)
CAE [TexQtic-CAE]
    ↓ (acquisition event / ROUTE-001)
CRM [TexQtic-CRM]
    ↓ (qualification → onboarding case → approval)
CRM provisioning webhook (WEBHOOK-007)
    ↓ (BLOCKED_PENDING_ORF_EVENTS_JURISDICTION_AUTH_OPENAPI)
Main Platform [TexQtic]
    ↓ (tenant provisioning → invite → activation)
Live tenant workspace
```

### 8.2 Cross-Repo Dependency Registration

For every cross-repo dependency identified in the audit, the audit unit must record:

| Field | Description |
|---|---|
| Dependency ID | `XDEP-XXX-NNN` format |
| Source system | Emitting system (MAIN / CRM / CAE / MARKETING) |
| Target system | Consuming system |
| Type | EVENT / WEBHOOK / API_CALL / SHARED_CONTRACT / DB_JOIN / FEATURE_FLAG |
| Current status | IMPLEMENTED / PLANNED / BLOCKED / NOT_STARTED |
| Blocking dependency | Which Layer 0 hold or governance gate blocks this |
| Notes | Free text |

### 8.3 Cross-Repo Dependency Rules

1. The main platform is the **runtime source of truth** for tenant/org identity — no child system may provision tenants independently
2. The CRM is the **commercial source of truth** for lead, onboarding case, and customer account identity — the main platform does not replicate these objects
3. The CAE is the **acquisition source of truth** for lead sourcing and first-contact workflows — it feeds CRM, not the platform directly
4. No cross-repo dependency may be implemented without a registered event name in `shared/contracts/event-names.md`
5. No cross-repo provisioning call may be made without `org_id` established by the main platform (never by CRM or CAE)

---

## 9. Family Registry

The audit must classify every feature into exactly one family. The following families are
the authoritative categories for the hub roadmap:

| Family ID | Family name | Primary system | Hub row priority |
|---|---|---|---|
| FAM-01 | B2C Public Browse and Product Detail | MAIN | P0 |
| FAM-02 | D2C Public Collections | MAIN | P0 |
| FAM-03 | Inquiry Submission | MAIN | P0 |
| FAM-04 | SEO Infrastructure | MAIN | P0 |
| FAM-05 | DPP Digital Product Passport | MAIN | P2 / PARKED |
| FAM-06 | Auth and Session Management | MAIN | P0 |
| FAM-07 | Tenant Onboarding and Invite | MAIN | P0 |
| FAM-08 | Tenant Core Workspace | MAIN | P0 |
| FAM-09 | Supplier Profile and Catalog | MAIN | P0 |
| FAM-10 | Platform Ops and Control Plane | MAIN | P0 |
| FAM-11 | Subscription and Commercial Gating | MAIN | P1 |
| FAM-12 | Network Commerce — RFQ and Pools | MAIN | P1 |
| FAM-13 | Network Commerce — Award Maker-Checker | MAIN | P2 / BLOCKED |
| FAM-14 | Network Commerce — Supplier Quotes | MAIN | P2 / FLAG_FALSE |
| FAM-15 | Network Commerce — Invoices and Settlement | MAIN | P1 |
| FAM-16 | TradeTrust Pay (TTP) | MAIN | P2 / HOLD_FOR_COUNSEL_FEEDBACK |
| FAM-17 | Traceability and Certifications | MAIN | POST_MVP |
| FAM-18 | White Label Co | MAIN | P3 / POST_MVP |
| FAM-19 | AI and Document Intelligence | MAIN | POST_MVP |
| FAM-20 | CRM Lead Intake and Qualification | CRM | P1 |
| FAM-21 | CRM Onboarding and Activation | CRM | P1 |
| FAM-22 | CRM → Platform Provisioning Handoff | CROSS_SYSTEM | P1 / BLOCKED |
| FAM-23 | CAE Acquisition Pipeline | CAE | POST_MVP / GATED |
| FAM-24 | CAE → CRM → Platform Integration Chain | CROSS_SYSTEM | POST_MVP / GATED |

---

## 10. MVP vs. Post-MVP Classification Rules

### 10.1 Launch Classification Taxonomy

Every feature must be assigned exactly one launch classification:

| Code | Meaning |
|---|---|
| `MVP_CRITICAL` | Required for the Surat pilot go-live; already verified in production |
| `LAUNCH_BLOCKER` | Must be implemented and verified before any supplier can onboard |
| `LAUNCH_DEPENDENCY` | Must be implemented before a specific launch-critical flow can complete |
| `PILOT_REQUIRED` | Must be ready before the first Surat cohort can transact |
| `POST_MVP` | Explicitly deferred; must NOT block launch |
| `PARKED_DECISION` | Classification blocked by a pending business decision |
| `DESIGN_GATED` | Design complete; implementation gated by an external hold |
| `DESIGN_COMPLETE_BLOCKED` | Design and architecture complete; implementation blocked by a specific governance gate |
| `WATCH_ITEM` | Not a launch dependency; but risk or state change could elevate it |
| `NOT_REQUIRED_FOR_MVP` | Confirmed out of scope for launch; low priority |

### 10.2 MVP Cutline Rule

The minimum viable surface for the Surat pilot includes:

1. **PRODUCTION_VERIFIED families:** FAM-01 through FAM-04 (B2C browse, D2C collections, inquiry, SEO) — already done
2. **Required for first supplier onboarding:** FAM-06 (auth), FAM-07 (onboarding/invite), FAM-08 (tenant workspace), FAM-09 (supplier catalog), FAM-10 (control plane ops)
3. **Required for first transaction:** FAM-12 (RFQ/pools) or buyer inquiry path through inquiry form
4. **Required for internal ops:** FAM-10 (control plane), FAM-11 (subscription gating, minimum version)

**Below the MVP cutline (explicit post-MVP):**
- FAM-17 (Traceability), FAM-18 (WL Co), FAM-19 (AI/Doc Intel)
- FAM-23 (CAE pipeline), FAM-24 (cross-system chain)
- FAM-16 (TTP) — `HOLD_FOR_COUNSEL_FEEDBACK`
- FAM-05 (DPP) — `HOLD_FOR_PARESH_DECISION`
- FAM-13 (award maker-checker) — `DESIGN_COMPLETE_BLOCKED`
- FAM-14 (supplier quotes) — `CONFIG_ONLY` flag false

### 10.3 Classification Authority

| Situation | Classification authority |
|---|---|
| Feature in production with verified smoke test output | Layer 0 / PRODUCTION_VERIFIED hub row |
| Feature in repo but not production-tested | Audit unit assessment |
| Feature in plan only, no repo evidence | Audit unit assessment + Paresh confirmation |
| Feature blocked by external gate (legal, decision) | Current gate holder in governance/control |
| Conflict between tracker and Layer 0 | Layer 0 wins |
| Conflict between two trackers, no Layer 0 entry | Flag as `GOVERNANCE_CONFLICT` |

---

## 11. Readiness Status Taxonomy

Every feature in the hub and audit tracker must carry exactly one readiness status:

| Code | Meaning | Evidence required |
|---|---|---|
| `NOT_ASSESSED` | Not yet audited | None |
| `GOVERNANCE_ONLY` | Design or plan doc exists; no repo artifact | Governance doc reference |
| `DESIGN_GATED` | Design complete; gated by external hold | Design artifact reference + hold identifier |
| `IMPLEMENTATION_READY` | All prerequisites met; not yet implemented | Layer 0 authorization confirmation |
| `PARTIALLY_IMPLEMENTED` | Some layers present; others missing | Repo evidence for implemented layers; gap evidence for missing |
| `LOCAL_VALIDATION_PASS` | Implemented; local tests pass | Test output reference |
| `PRODUCTION_VERIFICATION_REQUIRED` | Implemented and locally tested; not yet production-verified | Local test evidence |
| `PRODUCTION_VERIFIED` | Verified working in production with real data | Production smoke output or commit reference |
| `BLOCKED` | Cannot proceed without external action | Blocker identifier and hold type |
| `DEFERRED` | Explicitly deferred; will not be assessed for MVP | Decision or governance reference |

---

## 12. Priority Taxonomy

Every feature must be assigned exactly one priority:

| Code | Meaning |
|---|---|
| `P0_LAUNCH_BLOCKER` | System cannot launch without this; must be done first |
| `P1_MVP_MUST_HAVE` | Required for the minimal viable Surat pilot |
| `P2_PILOT_ENABLER` | Enables key pilot scenarios; not strictly blocking |
| `P3_POST_MVP` | Planned for after pilot success; explicitly deferred |
| `P4_BACKLOG_IDEA` | Unvalidated idea; no commitment |

---

## 13. Evidence Level Taxonomy

Every feature assessment must carry an evidence level that reflects the quality of the claim:

| Code | Meaning |
|---|---|
| `REPO_CONFIRMED` | Route, service, and schema artifacts confirmed in repo by direct inspection |
| `TEST_CONFIRMED` | Automated test coverage exists and passes |
| `PRODUCTION_CONFIRMED` | Production smoke or live verification output exists |
| `GOVERNANCE_CLAIM_ONLY` | Claimed in a governance/planning doc; not directly confirmed in repo |
| `USER_PLANNED_ONLY` | Paresh or team stated a plan; no repo or governance artifact |
| `NEEDS_REPO_INSPECTION` | Claim cannot be confirmed without direct repo inspection |
| `NEEDS_BUSINESS_DECISION` | Cannot be classified without a pending business decision |

**Evidence precedence (strongest to weakest):**  
`PRODUCTION_CONFIRMED` > `TEST_CONFIRMED` > `REPO_CONFIRMED` > `GOVERNANCE_CLAIM_ONLY` > `USER_PLANNED_ONLY`

A hub row may not be set to `PRODUCTION_VERIFIED` without `PRODUCTION_CONFIRMED` evidence.  
A hub row may not be set to `LOCAL_VALIDATION_PASS` without `TEST_CONFIRMED` evidence.

---

## 14. Technical-Only Repo-Recording Policy

### 14.1 What Must Be Recorded in the Technical Audit

The technical audit must record ONLY items that have a direct technical implementation implication:

| Include | Exclude |
|---|---|
| Implemented routes, services, schema | Marketing copy, brand voice, pitch narrative |
| Planned routes, services, schema not yet in code | Fundraising milestones and investor meeting notes |
| Feature flag states | Team hiring plans and org structure plans |
| Test coverage status | Press and PR plans |
| Production verification evidence | Customer relationship management (unless a technical CRM integration is involved) |
| Cross-system API contracts | Business model analysis (unless it defines a technical constraint) |
| Deployment posture | Legal advice and counsel communications |
| Known bugs and blockers with repo evidence | Non-technical business planning |

### 14.2 What Must Be Recorded Outside the Repo

The following categories belong in non-technical planning artifacts:

- GTM sequencing and field outreach plans (`governance/launch-readiness/PILOT-READINESS-SURAT.md`)
- Team gap analysis (`governance/launch-readiness/TEAM-FUNDING-READINESS.md`)
- Investor readiness and proof pack narrative (`governance/launch-readiness/TEAM-FUNDING-READINESS.md`)
- Legal gates and counsel communications (private, not in repo)
- Business decisions without technical implications (`governance/launch-readiness/DECISION-PARKING-LOT.md`)

### 14.3 Paresh-Planned Features Not Yet in Code

When Paresh communicates a planned feature that is not yet reflected in any repo, it must be:

1. Recorded using the intake form (§3.4) with source classification `PLANNED_NOT_IN_REPO` or `USER_PLANNED_ONLY`
2. Assigned a provisional `GOVERNANCE_ONLY` readiness status
3. NOT assigned an optimistic readiness status (e.g., `IMPLEMENTATION_READY`) without confirming Layer 0 authorization
4. Tracked in the `FUTURE-TODO-REGISTER.md` if it is explicitly deferred
5. Tracked in the `DECISION-PARKING-LOT.md` if it requires a business decision before it can be classified
6. NOT included in the integrated development plan until Layer 0 authorizes its unit

---

## 15. Development Priority Taxonomy and Sequencing Rules

### 15.1 Priority Determination Order

Priority is determined by the following decision order:

1. **Layer 0 control posture** — if a feature is held at Layer 0 (`HOLD_FOR_AUTHORIZATION`, `HOLD_FOR_COUNSEL_FEEDBACK`), it cannot advance regardless of technical readiness
2. **Launch classification** — `LAUNCH_BLOCKER` and `LAUNCH_DEPENDENCY` features are highest priority after Layer 0 releases
3. **Pilot cutline** — features in the MVP cutline (§10.2) are sequenced before post-MVP features
4. **Cross-system dependencies** — upstream dependencies must be resolved before downstream features
5. **Existing readiness** — features closer to `PRODUCTION_VERIFIED` have lower implementation cost; prefer these for quick wins

### 15.2 Sequencing Rules

1. P0_LAUNCH_BLOCKER features must be sequenced before P1_MVP_MUST_HAVE
2. P1_MVP_MUST_HAVE features must be sequenced before P2_PILOT_ENABLER
3. No P3_POST_MVP or P4_BACKLOG_IDEA feature may be included in the MVP development plan
4. Features with cross-system dependencies (§8) must be sequenced after the upstream dependency is confirmed
5. DESIGN_GATED and DESIGN_COMPLETE_BLOCKED features may not be sequenced until their hold is resolved

### 15.3 Feature Flag Governance in Priority

Features behind `enabled=false` flags are classified as `CONFIG_ONLY` and tracked at the
flag's current state. Changing a feature flag from `false` to `true` in production is treated
as equivalent to a production deployment — it requires the same verification gates as a new
feature release.

---

## 16. Integrated Development Plan Structure

### 16.1 Purpose

The integrated development plan is the output artifact of `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-001`.
It answers the question: "Given the current state of all three repos, what must be built, in what order,
before the Surat pilot can launch?"

It is NOT a project schedule. It is NOT a product roadmap. It is a technically-grounded,
repo-evidence-backed sequencing plan for technical development work.

### 16.2 Plan Structure

The integrated development plan must contain the following sections:

```
# TEXQTIC-INTEGRATED-DEVELOPMENT-PLAN-MVP-v1.md

## 1. Layer 0 Gate State
[Current posture. What must change before any P0/P1 work can begin.]

## 2. P0 Launch Blocker Work (MAIN platform)
[Features confirmed as LAUNCH_BLOCKER with NOT_ASSESSED or PARTIALLY_IMPLEMENTED status.
For each: feature, current status, evidence gap, estimated scope note, pre-requisites.]

## 3. P1 MVP Must-Have Work (MAIN platform)
[Features confirmed as PILOT_REQUIRED or MVP_MUST_HAVE with status below PRODUCTION_VERIFIED.
Same fields as P0.]

## 4. P1 Must-Have Work (CRM)
[CRM features required for the provisioning handoff chain.]

## 5. Cross-System Integration Work (MAIN ↔ CRM ↔ CAE)
[Cross-repo dependencies that must be resolved for pilot launch.
For each: XDEP ID, current status, blocking gate, what must happen.]

## 6. P2 Pilot Enabler Work
[Features that enhance the pilot but are not strictly blocking.]

## 7. P3 Post-MVP Roadmap Summary
[Explicit post-MVP features; summary only; no implementation sequencing.]

## 8. Deferred and Parked Items Summary
[FUTURE-TODO items, PARKED_DECISION items, BLOCKED items.]

## 9. Integrated Sequence (Final Order)
[Ordered list of work items, respecting all sequencing rules from §15.]

## 10. Open Questions Requiring Paresh Decision
[Features or classifications where audit found NEEDS_BUSINESS_DECISION evidence.]
```

### 16.3 Plan Maintenance Rules

1. The integrated development plan is updated at the start of each new unit that changes the state of any feature
2. When a feature advances from one readiness status to another, update the plan before committing the unit
3. When a new feature is added to the plan, run the intake form (§3.4) before adding it
4. The plan is NOT a living doc for informal notes — every update must be traceable to a unit ID

---

## 17. Proposed Audit Tracker Structure

The audit unit must produce or update the following tracker artifacts:

| Artifact | Location | Purpose |
|---|---|---|
| `TEXQTIC-FEATURE-INVENTORY-MAIN-v1.md` | `governance/audit/` | Complete feature inventory for main platform |
| `TEXQTIC-FEATURE-INVENTORY-CRM-v1.md` | `governance/audit/` | Complete feature inventory for CRM repo |
| `TEXQTIC-FEATURE-INVENTORY-CAE-v1.md` | `governance/audit/` | Complete feature inventory for CAE repo |
| `TEXQTIC-CROSS-REPO-DEPENDENCY-REGISTER-v1.md` | `governance/audit/` | Cross-system dependency register |
| `TEXQTIC-INTEGRATED-DEVELOPMENT-PLAN-MVP-v1.md` | `governance/audit/` | Integrated development plan (see §16) |
| `governance/launch-readiness/MVP-LAUNCH-READINESS-ROADMAP.md` | (existing skeleton) | Hub population — family matrix |
| `governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md` | (existing skeleton) | Hub population — binary checklist |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | (existing skeleton) | Hub population — deferred items |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | (existing skeleton) | Hub population — risks and gaps |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | (existing skeleton) | Hub population — parked decisions |
| `governance/launch-readiness/POST-MVP-ROADMAP.md` | (existing skeleton) | Hub population — post-MVP themes |
| `governance/launch-readiness/PILOT-READINESS-SURAT.md` | (existing skeleton) | Hub population — pilot criteria |
| `governance/launch-readiness/PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` | (existing skeleton) | Hub population — SEO expansion |

**The `governance/audit/` folder does not yet exist and must be created by the audit unit.**

---

## 18. Handling Paresh-Planned Features Not Yet in Code

### 18.1 Recording Rule

A feature that Paresh has communicated (verbally, in planning docs, or in governance docs)
but that is not found in any repo during inspection must:

1. Be recorded with source classification `PLANNED_NOT_IN_REPO` (§3.3)
2. Have evidence level `USER_PLANNED_ONLY` unless it appears in a governance doc (`GOVERNANCE_CLAIM_ONLY`)
3. Be assigned readiness `GOVERNANCE_ONLY` unless a design artifact exists
4. NOT be assigned a priority above P3_POST_MVP unless Layer 0 has explicitly authorized a unit for it
5. Be reviewed by Paresh before the audit is committed — a list of all `PLANNED_NOT_IN_REPO` features must be surfaced for Paresh confirmation at the end of the audit unit

### 18.2 What Not to Infer

The audit unit must NOT:

- Infer an implementation priority from the fact that Paresh mentioned a feature
- Assume a feature is "almost done" because a UI stub or governance doc exists
- Treat verbal confirmation of a plan as equivalent to a repo artifact
- Promote a planned feature to MVP status without explicit Paresh confirmation

---

## 19. Handling Stale and Historical Docs

### 19.1 Stale Tracker Resolution Order

When a stale tracker record conflicts with current evidence:

1. If a unit closure artifact exists (e.g., `GOV-DEC-*`), the closure artifact wins
2. If a newer v2 tracker supersedes the stale record (e.g., `MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md`), the v2 wins
3. If the Layer 0 control file (`NEXT-ACTION.md`, `BLOCKED.md`) contradicts the tracker, Layer 0 wins
4. If none of the above apply and the records conflict, flag as `GOVERNANCE_CONFLICT` and do not infer

### 19.2 Archival Policy

Historical docs (v1 trackers, closed planning artifacts) must NOT be deleted or modified.
They are preserved as audit trail. The audit unit notes them as `HISTORICAL_ARCHIVE` or
`FULLY_SUPERSEDED` in the tracker and references the newer authority artifact.

---

## 20. Handling Verified-Complete Units with Limited Production Data

### 20.1 Context

Some units are marked `VERIFIED_COMPLETE` in their verification artifacts but were verified
only with QA seed data (e.g., `BS-001` from `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md`: "B2C pages
verified with QA data only"). These units are `PRODUCTION_VERIFIED` for their implementation,
but carry an open risk for production-data fidelity.

### 20.2 Classification Rule

For units in this state:

- Readiness status: `PRODUCTION_VERIFIED` (the implementation is verified)
- Blind spot flag: `BS-OPEN` (the production data risk is open)
- The blind spot must remain in `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` with priority and owner
- The feature may be counted toward the MVP cutline as verified
- The production data risk must be addressed before pilot go-live (`PILOT_REQUIRED` evidence gate)

### 20.3 Evidence Gate for Pilot Go-Live

Before the Surat pilot kickoff:

- All `BS-OPEN` blind spots rated P0 must have a resolution plan
- At minimum, a real-data smoke test plan must exist for each P0 blind spot
- BS-001 (B2C with real supplier data) is the primary pilot go-live evidence gate

---

## 21. Handling Pre-Existing Modified Runtime Files

### 21.1 Current Pre-Existing Modified Files

At the time of this strategy artifact authoring, the following runtime files are modified but
not staged:

| File | Status | Instruction |
|---|---|---|
| `components/Public/PublicSupplierProfile.tsx` | unstaged M (pre-existing) | DO NOT STAGE in any governance unit |
| `tests/frontend/public-referral-landing.test.tsx` | unstaged M (pre-existing) | DO NOT STAGE in any governance unit |

### 21.2 Rule for Audit Unit

The audit unit (`TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-001`) must:

1. Verify these two files are still the only unstaged M files before staging its commit
2. Stage ONLY the allowlisted audit artifacts (new `governance/audit/` files and hub skeleton updates)
3. Record the pre-existing M files in the unit's closing report as "not staged by this unit"
4. NOT attempt to fix, resolve, or stage the pre-existing M files unless the audit unit's prompt explicitly allows it

### 21.3 Failing Tests Policy

If any existing test fails during the audit unit's validation:

1. Document the failing test, its location, and the failure output
2. Classify the failure as `PRE_EXISTING` or `INTRODUCED_BY_THIS_UNIT`
3. If `INTRODUCED_BY_THIS_UNIT`: stop, fix, re-test before committing
4. If `PRE_EXISTING`: document and note in the closing report; do not suppress, skip, or delete the test

---

## 22. Audit Execution Sequence

The audit unit (`TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-001`) must follow this exact sequence.
Stop if any step fails.

### Phase 1 — Preflight

1. `git diff --name-only` → confirm only the two known pre-existing M files
2. `git status --short` → confirm no new untracked or staged files
3. Re-read this strategy artifact in full

### Phase 2 — Main Platform Inspection (§2.1)

4. Inspect route families (all 20 categories in §5)
5. Inspect frontend component families (§2.1 item 10)
6. Inspect App.tsx route registration
7. Inspect schema.prisma for all model/field coverage
8. Confirm feature flag states from `governance/control/BLOCKED.md`
9. Confirm Layer 0 posture from `governance/control/NEXT-ACTION.md`

### Phase 3 — CRM Inspection (§2.2)

10. Inspect CRM route surface (`TexQtic-CRM/server/`)
11. Inspect CRM frontend surface (`TexQtic-CRM/src/pages/`)
12. Inspect CRM schema (`TexQtic-CRM/supabase/migrations/`)
13. Confirm cross-system join keys and handoff contract state

### Phase 4 — CAE Inspection (§2.3)

14. Inspect CAE service surface (`TEXQTIC-CUSTOMER-ACQUISITION-ENGINE/services/`)
15. Inspect CAE admin app (`TEXQTIC-CUSTOMER-ACQUISITION-ENGINE/apps/`)
16. Confirm CAE implementation stage vs. planning docs

### Phase 5 — Tracker Audit (§4)

17. Audit stale v1 trackers vs. v2 authority
18. Confirm all closed units are correctly classified
19. Identify any GOVERNANCE_CONFLICT items

### Phase 6 — Planned Feature Intake (§3.4)

20. Compile list of all features identified as `PLANNED_NOT_IN_REPO`
21. Surface list to Paresh for confirmation before proceeding
22. Record confirmed planned features using the intake form

### Phase 7 — Classification Pass

23. Assign launch classification (§10), readiness (§11), priority (§12), evidence level (§13) to every feature
24. Validate against MVP cutline rules (§10.2)

### Phase 8 — Artifact Production

25. Create `governance/audit/` folder
26. Create `TEXQTIC-FEATURE-INVENTORY-MAIN-v1.md`
27. Create `TEXQTIC-FEATURE-INVENTORY-CRM-v1.md`
28. Create `TEXQTIC-FEATURE-INVENTORY-CAE-v1.md`
29. Create `TEXQTIC-CROSS-REPO-DEPENDENCY-REGISTER-v1.md`
30. Create `TEXQTIC-INTEGRATED-DEVELOPMENT-PLAN-MVP-v1.md`
31. Populate hub skeleton documents (MVP roadmap, must-haves, future todos, blind spots, parking lot, post-MVP, pilot readiness, SEO register)

### Phase 9 — Commit Gate

32. `git diff --name-only` → must show ONLY new audit files and updated hub skeletons
33. `git status --short` → confirm pre-existing M files are NOT staged
34. Commit with message: `[TEXQTIC] governance: complete technical launch readiness audit`
35. `git show --stat HEAD` → record in closing report

---

## 23. Stop Conditions for the Audit Unit

The audit unit must STOP and emit a Blocker Report if:

| Stop condition | Action |
|---|---|
| Route inspection finds runtime code changes required | Stop; do not modify runtime code; record gap |
| Schema inspection finds undocumented migration drift | Stop; flag as `GOVERNANCE_CONFLICT`; do not run Prisma commands |
| CRM repo inspection requires access to production CRM DB | Stop; use schema migration files only |
| CAE repo inspection reveals an unauthorized open implementation unit | Stop; flag for Paresh; do not continue CAE audit |
| Two trackers have GOVERNANCE_CONFLICT on a LAUNCH_BLOCKER feature | Stop; escalate to Paresh before classifying |
| Paresh-planned feature list cannot be confirmed because Paresh is not available | Stop; record all `PLANNED_NOT_IN_REPO` items as unconfirmed; note in closing report |
| Pre-existing M files appear to have been accidentally staged | Stop; unstage; re-confirm clean staging set |
| `git status` reveals new untracked runtime files at any point | Stop; confirm these are not in-progress work before proceeding |
| Any audit finding would require modifying `server/prisma/schema.prisma` | Stop; record as GOVERNANCE_CLAIM_ONLY; escalate |
| Any CRM or CAE repo has a running migration that conflicts with the handoff contract | Stop; flag as XDEP blocker |

---

## 24. Completion Checklist

The audit unit (`TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-001`) is complete when ALL of the following are true:

- [ ] Git preflight passed: no unexpected staged or modified files
- [ ] All 20 main platform audit categories (§5) assessed with evidence level
- [ ] All 12 CRM audit categories (§6) assessed with evidence level
- [ ] All 12 CAE audit categories (§7) assessed with evidence level
- [ ] All cross-repo dependencies in §8 registered with XDEP IDs
- [ ] All features classified with source, launch classification, readiness, priority, and evidence level
- [ ] All `PLANNED_NOT_IN_REPO` features confirmed with Paresh or flagged as unconfirmed
- [ ] All GOVERNANCE_CONFLICT items escalated and resolved or flagged
- [ ] `governance/audit/` folder created with 5 tracker artifacts
- [ ] All 8 hub skeleton documents populated or assessed for readiness
- [ ] Integrated development plan created with all required sections
- [ ] Staging verified: only allowlisted files staged
- [ ] Pre-existing M files confirmed NOT staged
- [ ] Commit made with correct message format
- [ ] `git show --stat HEAD` recorded in closing report
- [ ] AGENTS.md-format closing report delivered

---

## 25. Subsequent Units

After this strategy unit is committed, the following unit sequence is authorized in principle
(each requires Layer 0 authorization when it opens):

| Unit ID | Purpose | Gate |
|---|---|---|
| `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-001` | Execute the audit per this strategy | Layer 0 authorization required |
| `TEXQTIC-LAUNCH-READINESS-HUB-POPULATION-001` | Populate hub skeletons from audit results | Depends on audit completion |
| `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` | Define canonical SEO domain strategy | Depends on Paresh SEO decision |

---

*Strategy authored: 2026-07-14 — TexQtic governance corpus, `governance/units/`, main branch.*

---

## 26. Addendum: Execution Sequence Superseded by Incremental Truth Strategy

**Addendum date:** 2026-05-19  
**Superseding unit:** `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001` (committed same session)

### 26.1 What Is Superseded

The following sections of this document are superseded by
`TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001`:

| Section | Title | Status |
|---|---|---|
| §22 | Audit Execution Sequence (35-step big-bang model) | SUPERSEDED |
| §23 | Stop Conditions for the Audit Unit | SUPERSEDED (see §16 of new strategy) |
| §24 | Completion Checklist | SUPERSEDED (see §17 of new strategy) |
| §25 | Subsequent Units | SUPERSEDED (see §15 of new strategy) |

### 26.2 What Remains in Force

All taxonomies, classification codes, and domain definitions in this document remain
authoritative and are referenced by the incremental truth strategy:

| Section | Title | Status |
|---|---|---|
| §0–§1 | Operating constraints, purpose, scope | IN FORCE |
| §2 | Pre-audit inspection sources (reference only; not for one-pass audit) | IN FORCE — per-family use |
| §3 | Feature inventory strategy and intake form | IN FORCE |
| §4 | Tracker audit strategy | IN FORCE |
| §5–§7 | Main platform, CRM, and CAE audit categories | IN FORCE — per-family use |
| §8 | Cross-repo dependency model | IN FORCE |
| §9 | Family registry (FAM-01 through FAM-24) | IN FORCE |
| §10 | MVP vs. post-MVP classification rules | IN FORCE |
| §11 | Readiness status taxonomy | IN FORCE |
| §12 | Priority taxonomy | IN FORCE |
| §13 | Evidence level taxonomy | IN FORCE |
| §14 | Technical-only repo-recording policy | IN FORCE (extended by new strategy §13–§14) |
| §15 | Development priority taxonomy and sequencing rules | IN FORCE |
| §16 | Integrated development plan structure | IN FORCE — created after sufficient family truth |
| §17 | Proposed audit tracker structure | IN FORCE — created incrementally, not upfront |
| §18–§21 | Handling rules (planned features, stale docs, verified units, pre-existing M files) | IN FORCE |

### 26.3 Transition Rule

Any future unit that references this strategy must read `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001`
as the execution process authority and treat this document as the taxonomy and classification authority.
