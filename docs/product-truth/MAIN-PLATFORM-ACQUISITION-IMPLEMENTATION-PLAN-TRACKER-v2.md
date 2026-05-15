# MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2

**Unit ID:** MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2-001  
**Title:** Main TexQtic Platform — Customer Acquisition Engine Integration Plan and Tracker v2  
**Status:** PLANNING ARTIFACT ONLY — NO IMPLEMENTATION AUTHORIZED  
**Date:** 2026-07-06  
**Authorized by:** Paresh  
**Git HEAD at Authoring:** `a2a0b6c` (two untracked docs artifacts; working tree otherwise clean)  
**Mode:** Docs-only. No code, schema, migration, route, service, frontend, event, or OpenAPI changes.

---

## 0. Critical Constraints

**READ BEFORE ACTING ON ANY SECTION OF THIS ARTIFACT.**

This tracker is planning-only. All readiness labels are **conditional on Layer 0 authorization** — none authorize implementation. Specifically:

1. **No implementation unit may open** until external legal counsel provides written feedback on `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md`, that feedback is recorded in `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001`, and Paresh issues explicit written authorization.
2. This tracker does **not** open any unit, modify any governance/control file, register event names, add routes or services, modify the schema, or alter the OpenAPI contracts.
3. This tracker **supersedes the implementation sequencing** in `MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` (2026-05-12) and `MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-v1.md` (2026-05-12) where the refresh artifact (`MAIN-PLATFORM-ACQUISITION-AND-AGGREGATOR-STREAM-REPO-TRUTH-REFRESH-AND-OPENING-v1.md`) identifies drift. It does not supersede those artifacts wholesale — only the specific stale records listed in §2 and §3.

---

## 1. Purpose

This artifact is the updated Main TexQtic Platform implementation plan and tracker for all platform development required to connect the future TexQtic Customer Acquisition Engine (CAE) and CRM.

### 1.1 Why This v2 Is Needed

The v1 trackers (`MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` and `MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-v1.md`, both dated 2026-05-12) contain stale records on four material dimensions:

| Stale dimension | v1 claim | Corrected truth | Authority |
| --- | --- | --- | --- |
| Layer 0 posture | `NONE_AUTHORIZED` | `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` (TTP legal gate active) | `governance/control/NEXT-ACTION.md` (2026-07-06) |
| Aggregator truthfulness unit | "OPEN — separate stream" | CLOSED (complete, commits `cecc339`, `9da32ea`, 2026-04-06) | `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE.md` |
| AI matching unit | `adjacent_deferred_candidate` | CLOSED / VERIFIED_COMPLETE (commit `8b56962`) | `TECS-LAUNCH-GRADE-RUNTIME-DATA-QA-AUDIT-001-REPORT.md` |
| GAP-ACQ-003 | OPEN | SUPERSEDED (unit completed and closed) | Same close decision |

Additionally, GAP-ACQ-007 (CRM jurisdiction payload gap) was not recorded in either v1 tracker and must be resolved before WEBHOOK-007 opens.

**This v2 tracker corrects all four dimensions, adds GAP-ACQ-007, and updates the implementation wave sequencing to reflect the current TTP legal gate.**

### 1.2 What This Document Does Not Do

- Authorize implementation of any unit
- Mutate schema, routes, event registries, or OpenAPI contracts
- Open any implementation unit
- Amend the older v1 tracker documents
- Authorize opening TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 (already CLOSED)
- Grant Team A event naming authority

---

## 2. Source Artifacts Reviewed

### 2.1 Primary Planning Baseline (Current Authority)

| Artifact | Role | Status |
| --- | --- | --- |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-AND-AGGREGATOR-STREAM-REPO-TRUTH-REFRESH-AND-OPENING-v1.md` | **Primary baseline for this v2 tracker.** Current corrected truth as of `a2a0b6c`. | Current — authoritative |

### 2.2 Older Trackers (Partially Stale — Use This v2 Instead)

| Artifact | Stale dimensions | Still valid for |
| --- | --- | --- |
| `docs/product-truth/MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-v1.md` (2026-05-12) | Layer 0 posture; Unit I status; AI matching status; GAP-ACQ-003; ROUTE-001 readiness verdict | Per-unit detail blocks (ROUTE-001 through PROVISIONED-EVENTS-008): files to change, payload specs, test cases, guardrails — these remain accurate where the refresh artifact does not correct them |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` (2026-05-12) | Same dimensions as above | Same as above |

### 2.3 Boundary and Design Artifacts Reviewed

| Artifact | Stale Notes | Valid For |
| --- | --- | --- |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | Layer 0 reference may be stale | Platform ownership boundary; non-ownership rules; five-gate reuse mandate; required events |
| `docs/product-truth/AGGREGATOR-DIRECTORY-ACQUISITION-INTEGRATION-DESIGN-v1.md` (2026-05-12) | §2.4 Layer 0 references stale | Decisions D-01 through D-06 (Aggregator boundary decisions); all remain authoritative |
| `docs/product-truth/AGGREGATOR-LAYER-REPO-TRUTH-AUDIT-v1.md` (2026-06-08) | §3.10 unit status stale (says "OPEN"; correct: CLOSED) | Aggregator runtime inventory (§3.1–§3.9); integration test status note (see §4 below) |

### 2.4 Governance Decisions Reviewed

| Artifact | Role |
| --- | --- |
| `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE.md` (2026-04-06, DECIDED) | Authoritative Aggregator unit closure |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` (2026-04-21, DECIDED) | B2B public discovery object model; inquiry model authority |
| `governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` (2026-04-21, DECIDED) | Two-tier visibility / projection model; Aggregator public eligibility |

### 2.5 Layer 0 Control Files Read

| File | Status |
| --- | --- |
| `governance/control/OPEN-SET.md` | Read. Last updated 2026-07-06. |
| `governance/control/NEXT-ACTION.md` | Read. Last updated 2026-07-06. `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`. |
| `governance/control/BLOCKED.md` | Read. Last updated 2026-07-01. All NC runtime blockers resolved; WL Co `REVIEW-UNKNOWN` remains. |

### 2.6 Runtime Files Re-Checked at HEAD `a2a0b6c`

| File | Re-check result |
| --- | --- |
| `server/src/routes/public.ts` | No `supplier/:slug`, no `inquiry/submit`, no `provision-supplier` route |
| `server/src/routes/internal/` | Contains: `resolveDomain.ts`, `makerChecker.ts`, `cacheInvalidate.ts`, `index.ts` — NO acquisition route |
| `server/src/routes/admin/tenantProvision.ts` | No acquisition-stream content |
| `server/src/services/publicB2BProjection.service.ts` | Five-gate service LIVE; no `getPublicB2BSupplierBySlug()` function |
| `App.tsx` | `PUBLIC_B2B_DISCOVERY` LIVE; `PUBLIC_SUPPLIER_PROFILE` ABSENT; `PUBLIC_REFERRAL_LANDING` ABSENT |
| `server/src/lib/events.ts` | `KnownEventName` at line 161; no `supplier_profile.*`, `buyer_inquiry.*`, `public_supplier_profile.*` events |
| `shared/contracts/event-names.md` | No acquisition events registered |
| `shared/contracts/openapi.tenant.json` | Aggregator discovery path present; no acquisition paths |
| `shared/contracts/openapi.control-plane.json` | No acquisition paths |
| `server/prisma/schema.prisma` | `Tenant.externalOrchestrationRef` (line 21, `@unique`); `organizations.external_orchestration_ref` (line 1073, `@unique`); `invites.externalOrchestrationRef` (line 120, non-unique); `organizations.slug` (line ~1050, `@unique`); `organizations.jurisdiction` (line 1058, default `'UNKNOWN'`); `organizations.publication_posture` (live); `organizations.publicEligibilityPosture` (live) |
| `server/src/tests/aggregator-discovery-read.integration.test.ts` | Present; governance unit CLOSED per `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE.md` |

### 2.7 CRM and CAE Artifacts — External Evidence Only

The following artifacts are referenced but are **NOT PRESENT in this repository at HEAD `a2a0b6c`**:

| Artifact | Status |
| --- | --- |
| `CRM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` | NOT FOUND — external CRM artifact |
| `CRM-ACQ-10` decision / closure | NOT FOUND — external CRM governance decision |
| Customer Acquisition Engine (CAE) plan / tracker | NOT FOUND — external CAE artifact |

CRM payload structure facts are sourced from `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` and `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md`, which ARE present at the repo root and were reviewed in the refresh artifact session.

---

## 3. Current Layer 0 Gate — Authoritative Posture

### 3.1 Active Gate State (2026-07-06)

| Field | Current Truth |
| --- | --- |
| `mode` | `OPENING_LAYER_CANON_POINTER` |
| `active_delivery_unit` | `HOLD_FOR_AUTHORIZATION` |
| `next_candidate_unit` | `HOLD_FOR_COUNSEL_FEEDBACK` |
| `product_delivery_priority` | `LAUNCH_GATE_CLOSED` |
| Last closed unit | `TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001` (VERIFIED_COMPLETE 2026-07-06) |
| DPP Passport Network | `PRODUCTION_READY` — `HOLD_FOR_PARESH_DECISION` |

### 3.2 TTP Legal Gate — Active Hold

No implementation unit in the acquisition stream (or any other stream) may open until:

1. External legal counsel provides written feedback on `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` (upgraded)
2. Feedback is recorded in `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001`
3. Paresh issues explicit written authorization

**All readiness labels in this tracker are conditional until this gate clears.**

### 3.3 BLOCKED.md Active Holds (2026-07-01)

| Hold | Status |
| --- | --- |
| NC runtime blockers | ALL RESOLVED |
| White Label Co | `REVIEW-UNKNOWN` (current hold) |
| NC-PROD-AWARD | `DESIGN_COMPLETE` |
| QD-6 hold | UNCHANGED |

---

## 4. Current Runtime Inventory

### 4.1 Live Acquisition-Adjacent Surfaces (PRESENT at HEAD `a2a0b6c`)

| Surface | Status | Location | Notes |
| --- | --- | --- | --- |
| `GET /api/public/b2b/suppliers` | **LIVE** | `server/src/routes/public.ts` | Five-gate paginated; no auth; foundation for ROUTE-001 |
| `publicB2BProjection.service.ts` five-gate service | **LIVE** | `server/src/services/` | Gates A–E; correct reuse foundation; no `getPublicB2BSupplierBySlug()` yet |
| `PUBLIC_B2B_DISCOVERY` AppState | **LIVE** | `App.tsx` line 1953 | Renders `B2BDiscovery.tsx`; supplier list |
| `components/Public/B2BDiscovery.tsx` | **LIVE** | `components/Public/` | Public B2B supplier list component |
| `services/publicB2BService.ts` | **LIVE** | `services/` | Frontend API client for public B2B discovery |
| `GET /api/tenant/aggregator/discovery` | **LIVE** | `server/src/routes/tenant.ts` lines 1948–2006 | Authenticated; AGGREGATOR org_type gated; separate stream |
| `AggregatorDiscoveryWorkspace.tsx` | **LIVE** | `components/Tenant/` | Authenticated read-only; no contact, no shortlist |
| `organizations.slug` | **LIVE** | `schema.prisma` | `@unique`, VarChar(100); not yet used in any public route |
| `organizations.publicEligibilityPosture` | **LIVE** | `schema.prisma` | Gate A field |
| `organizations.publication_posture` | **LIVE** | `schema.prisma` | Gate B field; default `'PRIVATE_OR_AUTH_ONLY'` |
| `organizations.external_orchestration_ref` | **LIVE** | `schema.prisma` line 1073 | `@unique`; dual-column gap (GAP-ACQ-001) |
| `Tenant.externalOrchestrationRef` | **LIVE** | `schema.prisma` line 21 | `@unique`; second side of dual-column gap |
| `organizations.jurisdiction` | **LIVE** | `schema.prisma` line 1058 | VarChar(100), default `'UNKNOWN'`; indexed; jurisdiction default gap (GAP-ACQ-007) |
| Internal gov routes (`/api/internal/gov/approvals`) | **LIVE** | `server/src/routes/internal/` | G-021 maker-checker; no acquisition content |

### 4.2 Intentionally Absent Acquisition Surfaces (ABSENT at HEAD `a2a0b6c`)

| Surface | Status | Blocked By |
| --- | --- | --- |
| `GET /api/public/supplier/:slug` route | **ABSENT** | Layer 0 + ROUTE-001 not yet open |
| `PUBLIC_SUPPLIER_PROFILE` AppState | **ABSENT** | ROUTE-001 |
| `PublicSupplierProfile.tsx` component | **ABSENT** | ROUTE-001 |
| `getPublicB2BSupplierBySlug()` service function | **ABSENT** | ROUTE-001 |
| `POST /api/public/inquiry/submit` route | **ABSENT** | Layer 0 + INQUIRY-004 |
| `POST /api/internal/acquisition/provision-supplier` route | **ABSENT** | Layer 0 + WEBHOOK-007 |
| `PUBLIC_REFERRAL_LANDING` AppState | **ABSENT** | REFERRAL-005 |
| `supplier_profile.*` events in `KnownEventName` | **ABSENT** | EVENTS-003 + Team A authority |
| `buyer_inquiry.*` events in `KnownEventName` | **ABSENT** | EVENTS-003 + Team A authority |
| `public_supplier_profile.*` events in `KnownEventName` | **ABSENT** | EVENTS-003 + Team A authority |
| Acquisition events in `event-names.md` | **ABSENT** | EVENTS-003 + Team A authority |
| `GET /api/public/supplier/{slug}` in any OpenAPI contract | **ABSENT** | ROUTE-001 same-wave obligation |
| `POST /api/public/inquiry/submit` in any OpenAPI contract | **ABSENT** | INQUIRY-004 same-wave obligation |
| `POST /api/internal/acquisition/provision-supplier` in any OpenAPI contract | **ABSENT** | WEBHOOK-007 same-wave obligation |
| `acquisitionProvisioning.service.ts` | **ABSENT** | WEBHOOK-007 |
| `publicInquiry.service.ts` | **ABSENT** | INQUIRY-004 |
| `governance/decisions/TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1.md` | **ABSENT** | ORF-AUTHORITY-006 |
| `inquiry`, `referral`, `buyer_intent` Prisma models | **ABSENT** | Intentional; no schema models for these exist |
| `contact_phone`, `contact_email` fields on `organizations` | **ABSENT** | Intentional; must never be added |

### 4.3 Aggregator and AI Matching Closure (CLOSED — Not Pending)

| Unit | Status | Authority |
| --- | --- | --- |
| `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` | **CLOSED** | `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE.md` (2026-04-06, DECIDED, Paresh; commits `cecc339`, `9da32ea`) |
| `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001` | **CLOSED** | Same close decision |
| `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` | **CLOSED / VERIFIED_COMPLETE** | Commit `8b56962`; `TECS-LAUNCH-GRADE-RUNTIME-DATA-QA-AUDIT-001-REPORT.md` |

The Aggregator integration test file (`server/src/tests/aggregator-discovery-read.integration.test.ts`) remains present as a permanent quality gate. Its presence does not imply the governance unit is open. The governance decision takes precedence over any stale "OPEN" or "FAILING" reference in the 2026-06-08 audit.

---

## 5. Corrected Gap Register

### 5.1 Summary Table

| Gap ID | Description | Status | Blocking |
| --- | --- | --- | --- |
| GAP-ACQ-001 | `external_orchestration_ref` dual-column authority unresolved | **OPEN** | WEBHOOK-007, PROVISIONED-EVENTS-008 |
| GAP-ACQ-002 | No `supplier_profile.*` events in `KnownEventName` or `event-names.md` | **OPEN** | EVENTS-003; event emission on ROUTE-001 |
| GAP-ACQ-003 | `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` blocked by Layer 0 | **SUPERSEDED** — unit CLOSED 2026-04-06 | N/A |
| GAP-ACQ-004 | No OpenAPI entries for acquisition integration endpoints | **OPEN** — self-closed per route, same wave | Each route unit |
| GAP-ACQ-005 | `buyer_inquiry.*` and `public_supplier_profile.*` events not registered | **OPEN** | INQUIRY-004, WEBHOOK-007, PROVISIONED-EVENTS-008 |
| GAP-ACQ-006 | No rate-limit budget defined for `POST /api/public/inquiry/submit` | **OPEN** | INQUIRY-004 |
| GAP-ACQ-007 | CRM jurisdiction payload gap — `organizations.jurisdiction` defaults to `'UNKNOWN'` when CRM omits field | **OPEN** | WEBHOOK-007 |

### 5.2 GAP-ACQ-001 — `external_orchestration_ref` Dual-Column Authority

**Problem:** Both `Tenant.externalOrchestrationRef` (schema.prisma line 21, `@unique`) and `organizations.external_orchestration_ref` (schema.prisma line 1073, `@unique`) carry the same semantic intent. A third non-unique occurrence exists on `invites.externalOrchestrationRef` (line 120). No governance document names which column is the canonical CRM lookup key. If CRM writes to one column and the provisioning webhook reads from the other, the idempotency guard fails silently.

**Resolution before WEBHOOK-007:** ORF-AUTHORITY-006 governance decision document must state: (a) which column is canonical, (b) purpose of the other occurrence(s), (c) CRM write constraint, (d) provisioning webhook read strategy.

**Status:** OPEN.

### 5.3 GAP-ACQ-002 — `supplier_profile.*` Events Not Registered

**Problem:** Zero `supplier_profile.*` events exist in `KnownEventName` (line 161) or `event-names.md`. TypeScript's `KnownEventName` constraint prevents compilation of event emission until registration occurs.

**Resolution before EVENTS-003:** Team A sign-off on event names. Required event: `supplier_profile.viewed.v1`.

**Status:** OPEN.

### 5.4 GAP-ACQ-003 — SUPERSEDED

`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` was CLOSED on 2026-04-06 per `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE.md` (DECIDED, Paresh). The gap no longer applies. No action.

**Status:** SUPERSEDED.

### 5.5 GAP-ACQ-004 — OpenAPI Obligation (Same-Wave Route Requirement)

**Problem:** None of `GET /api/public/supplier/{slug}`, `POST /api/public/inquiry/submit`, or `POST /api/internal/acquisition/provision-supplier` exist in any OpenAPI contract (both contracts at v0.3.0).

**Resolution:** Each route-building unit (ROUTE-001, INQUIRY-004, WEBHOOK-007) must include the corresponding OpenAPI path in the same implementation wave, per `shared/contracts/ARCHITECTURE-GOVERNANCE.md`. This gap self-closes inline per unit.

**Status:** OPEN — each route unit carries its own same-wave OpenAPI obligation.

### 5.6 GAP-ACQ-005 — `buyer_inquiry.*` and `public_supplier_profile.*` Events Not Registered

**Problem:** Zero `buyer_inquiry.*` and `public_supplier_profile.*` events in either registry. Required events: `buyer_inquiry.created.v1`, `public_supplier_profile.provision_requested.v1`, `public_supplier_profile.provisioned.v1`, `public_supplier_profile.gate_failed.v1`.

**Resolution before INQUIRY-004 and WEBHOOK-007:** Team A sign-off. Must be co-resolved with GAP-ACQ-002 in EVENTS-003.

**Status:** OPEN.

### 5.7 GAP-ACQ-006 — No Rate-Limit Budget for Inquiry Endpoint

**Problem:** `POST /api/public/inquiry/submit` is a public write surface with no defined rate-limit budget. Comparable read endpoint `GET /api/public/dpp/:publicPassportId` uses 100 req/15 min/IP. Inquiry endpoint is higher-risk.

**Resolution required in INQUIRY-004 implementation prompt.** Budget must be explicitly stated.

**Status:** OPEN.

### 5.8 GAP-ACQ-007 — CRM Jurisdiction Payload Gap

**Problem:** CRM's `public.suppliers` table does not include a `jurisdiction` field in its handoff payload (per `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md`). The provisioning webhook must set `organizations.jurisdiction` (schema.prisma line 1058, default `'UNKNOWN'`). For acquisition-sourced suppliers, the Main Platform's default rule should be `IN` (India), consistent with TexQtic's primary market. If WEBHOOK-007 is built without resolving this, acquisition-provisioned suppliers will have `jurisdiction = 'UNKNOWN'` rather than `IN`, degrading five-gate projection output and discovery quality.

**Resolution before WEBHOOK-007:** ORF-AUTHORITY-006 governance decision document must include the jurisdiction default rule for acquisition-sourced suppliers. The WEBHOOK-007 implementation prompt must include the jurisdiction defaulting logic.

**Status:** OPEN.

---

## 6. Updated Implementation Wave Plan

All waves are gated behind the universal Layer 0 authorization (§3.2). Waves are sequenced by dependency, not calendar time.

### Wave 0 — Authorization Prerequisites (External — No Platform Code)

| Prerequisite | Owner | Condition |
| --- | --- | --- |
| External legal counsel written feedback on `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` | External | Recorded in `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001` |
| Paresh explicit written authorization | Paresh | Unlocks all subsequent waves |
| Team A event authority for `supplier_profile.*`, `buyer_inquiry.*`, `public_supplier_profile.*` | Team A | Required before EVENTS-003 opens; can be pursued while awaiting TTP feedback |

No platform code, docs, or schema changes occur in Wave 0. These are pre-conditions only.

### Wave 1 — Governance and Contracts (Docs/Governance — No Runtime Code)

| Unit | Type | Purpose | Gate Condition |
| --- | --- | --- | --- |
| **ORF-AUTHORITY-006** | Docs/governance | Canonical `external_orchestration_ref` authority + jurisdiction default rule (resolves GAP-ACQ-001 and GAP-ACQ-007) | Layer 0 cleared + Paresh authorization |
| **EVENTS-003** | Events registration | Register 5 acquisition event names in `event-names.md` and `KnownEventName` (resolves GAP-ACQ-002 and GAP-ACQ-005) | Layer 0 cleared + Team A sign-off + Paresh authorization |

ORF-AUTHORITY-006 and EVENTS-003 are parallel-safe with each other. Both should be complete before Wave 2 opens because ROUTE-001 should include event emission on profile views.

### Wave 2 — Public Supplier Profile Foundation (First Runtime Unit)

| Unit | Type | Purpose | Gate Condition |
| --- | --- | --- | --- |
| **ROUTE-001** | Backend route + frontend state | `GET /api/public/supplier/:slug` + `PUBLIC_SUPPLIER_PROFILE` AppState; includes OpenAPI path (self-closes GAP-ACQ-004 for this route) | Layer 0 cleared + EVENTS-003 complete (for event emission) + Paresh authorization |

ROUTE-001 is the first runtime implementation unit. It is the foundation for every subsequent acquisition surface.

### Wave 3 — QR Source Tracking and Referral Landing

| Unit | Type | Purpose | Gate Condition |
| --- | --- | --- | --- |
| **QR-SOURCE-002** | Backend param extension | Optional `?source=` enum param on `/api/public/supplier/:slug` for QR/referral/event attribution | ROUTE-001 live + Layer 0 cleared + Paresh authorization |
| **REFERRAL-005** | Frontend state | `PUBLIC_REFERRAL_LANDING` AppState + `/join/:referral_code` frontend landing | ROUTE-001 live (recommended) + Layer 0 cleared + Paresh authorization |

### Wave 4 — Buyer Inquiry Intake

| Unit | Type | Purpose | Gate Condition |
| --- | --- | --- | --- |
| **INQUIRY-004** | Backend route | `POST /api/public/inquiry/submit` public pre-auth intake; includes OpenAPI path (self-closes GAP-ACQ-004 for this route) | ROUTE-001 live + EVENTS-003 complete (GAP-ACQ-005 resolved) + GAP-ACQ-006 rate-limit budget defined + Layer 0 cleared + Paresh authorization |

### Wave 5 — CRM Provisioning Webhook

| Unit | Type | Purpose | Gate Condition |
| --- | --- | --- | --- |
| **WEBHOOK-007** | Internal backend route + service | `POST /api/internal/acquisition/provision-supplier`; idempotent; CRM handoff only; includes OpenAPI path (self-closes GAP-ACQ-004 for this route) | ORF-AUTHORITY-006 complete (GAP-ACQ-001 + GAP-ACQ-007 resolved) + EVENTS-003 complete (GAP-ACQ-005 resolved) + auth model defined + callback URL defined + response/idempotency contract defined + Layer 0 cleared + Paresh authorization |

### Wave 6 — Provisioning Events

| Unit | Type | Purpose | Gate Condition |
| --- | --- | --- | --- |
| **PROVISIONED-EVENTS-008** | Event emission wiring | Wire `public_supplier_profile.provisioned.v1` and `gate_failed.v1` emission into provisioning service | WEBHOOK-007 live + EVENTS-003 complete + Layer 0 cleared + Paresh authorization |

### 6.1 Wave Sequencing Diagram

```
Wave 0: [External] TTP counsel feedback + Paresh authorization + Team A event sign-off
                           │
         ┌─────────────────┤
         ▼                 ▼
Wave 1: ORF-AUTHORITY-006  EVENTS-003
         │                 │
         └────────┬────────┘
                  ▼
Wave 2:        ROUTE-001
                  │
         ┌────────┼────────┐
         ▼        ▼        ▼
Wave 3: QR-SOURCE-002  REFERRAL-005   (parallel after ROUTE-001)
                           │
Wave 4:              INQUIRY-004      (requires ROUTE-001 + EVENTS-003 + GAP-ACQ-006)
                           │
Wave 5:              WEBHOOK-007      (requires ORF-AUTHORITY-006 + EVENTS-003)
                           │
Wave 6:        PROVISIONED-EVENTS-008 (requires WEBHOOK-007 + EVENTS-003)
```

---

## 7. Updated Tracker Table

### 7.1 Unit Status Overview

| Unit ID | Title | Wave | Current Status | Hard Prerequisites | Gaps Closed |
| --- | --- | --- | --- | --- | --- |
| ORF-AUTHORITY-006 | Orchestration Ref Canonical Authority | Wave 1 | `REQUIRED_BEFORE_WEBHOOK / DOCS_GOVERNANCE` | Layer 0 authorization | GAP-ACQ-001, GAP-ACQ-007 |
| EVENTS-003 | Supplier Profile Events Registration | Wave 1 | `BLOCKED_PENDING_TEAM_A_EVENT_AUTHORITY` | Layer 0 authorization + Team A sign-off | GAP-ACQ-002, GAP-ACQ-005 |
| ROUTE-001 | Public Supplier Profile Route | Wave 2 | `BLOCKED_PENDING_LAYER0_AUTHORIZATION` | Layer 0 + EVENTS-003 | GAP-ACQ-004 (inline) |
| QR-SOURCE-002 | QR Source Tracking Parameter | Wave 3 | `NOT_READY_UNTIL_ROUTE_001` | ROUTE-001 live | — |
| REFERRAL-005 | Referral Join Landing | Wave 3 | `NOT_READY_UNTIL_ROUTE_001` | ROUTE-001 live (recommended) | — |
| INQUIRY-004 | Buyer Inquiry Pre-Auth Intake | Wave 4 | `BLOCKED_PENDING_ROUTE_EVENTS_RATE_LIMIT` | ROUTE-001 + EVENTS-003 + GAP-ACQ-006 | GAP-ACQ-004 (inline) |
| WEBHOOK-007 | CRM Acquisition Provisioning Webhook | Wave 5 | `BLOCKED_PENDING_ORF_EVENTS_JURISDICTION_AUTH_OPENAPI` | ORF-AUTHORITY-006 + EVENTS-003 + auth model + callback URL + response contract | GAP-ACQ-004 (inline) |
| PROVISIONED-EVENTS-008 | Provisioning Event Emission | Wave 6 | `BLOCKED_PENDING_WEBHOOK_007` | WEBHOOK-007 + EVENTS-003 | — |

---

### 7.2 Unit A — ORF-AUTHORITY-006: MAIN-PLATFORM-ORCHESTRATION-REF-AUTHORITY-006

**Status:** `REQUIRED_BEFORE_WEBHOOK / DOCS_GOVERNANCE`  
**Wave:** 1 (parallel with EVENTS-003)  
**Owner:** Paresh (authorization); docs author (implementation)

**Purpose:**  
Resolve GAP-ACQ-001 (dual `external_orchestration_ref` column authority) and GAP-ACQ-007 (CRM jurisdiction payload default rule for acquisition-sourced suppliers). This is a docs/governance unit only — no runtime code changes.

**Problem:**  
Both `Tenant.externalOrchestrationRef` (line 21, `@unique`) and `organizations.external_orchestration_ref` (line 1073, `@unique`) carry the same semantic intent. Neither governance document names which is the canonical CRM lookup key. Additionally, CRM's handoff payload omits `jurisdiction`; the platform must default to `IN` (India) for acquisition-sourced suppliers but this rule is not yet documented.

**File to create (governance doc only):**

| File | Change type |
| --- | --- |
| `governance/decisions/TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1.md` | CREATE new governance decision document |

**Required content of the governance decision:**
1. Name the canonical CRM↔Platform lookup column (decision: `organizations.external_orchestration_ref` or `Tenant.externalOrchestrationRef` — Paresh decides)
2. State the purpose and handling of the other column
3. State that `invites.externalOrchestrationRef` is intentionally separate (invite-level)
4. State CRM must write only to the canonical column
5. State WEBHOOK-007 reads only from the canonical column for idempotency checks
6. State the jurisdiction default rule: acquisition-sourced suppliers default to `jurisdiction = 'IN'` when CRM omits the field

**Guardrails:**
- No schema column changes in this unit
- No migrations in this unit
- No server code in this unit

**Completion criteria:**
- `governance/decisions/TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1.md` created with all six required content items
- Paresh confirmed the canonical column choice

**Proposed atomic commit message:**
```
docs(governance): resolve external_orchestration_ref canonical column authority (ORF-AUTHORITY-006)
```

---

### 7.3 Unit B — EVENTS-003: MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003

**Status:** `BLOCKED_PENDING_TEAM_A_EVENT_AUTHORITY`  
**Wave:** 1 (parallel with ORF-AUTHORITY-006)  
**Owner:** Team A (event naming authority); Paresh (authorization)

**Purpose:**  
Register all five acquisition event names in both `shared/contracts/event-names.md` and `server/src/lib/events.ts` (`KnownEventName` union). Closes GAP-ACQ-002 and GAP-ACQ-005.

**Events to register:**

| Event name | Domain | Trigger | Allowed payload | Prohibited |
| --- | --- | --- | --- | --- |
| `supplier_profile.viewed.v1` | `supplier_profile` | Unauthenticated `GET /api/public/supplier/:slug` | `slug`, `source_channel` enum, optional `viewer_geo_band`, `timestamp` | orgId, buyer identity |
| `buyer_inquiry.created.v1` | `buyer_inquiry` | `POST /api/public/inquiry/submit` | `supplier_slug`, `inquiry_category`, `geo_band`, `volume_band` | raw email, phone, buyer name |
| `public_supplier_profile.provision_requested.v1` | `public_supplier_profile` | WEBHOOK-007 handoff received | `external_orchestration_ref`, `org_type`, `segment` | price, personal data |
| `public_supplier_profile.provisioned.v1` | `public_supplier_profile` | Profile goes live after provisioning | `slug`, `external_orchestration_ref`, `publication_posture` | price, personal data |
| `public_supplier_profile.gate_failed.v1` | `public_supplier_profile` | One or more provisioning gates failed | `external_orchestration_ref`, `failed_gate` enum, reason code | raw payload, personal data |

**Files to change:**

| File | Change type |
| --- | --- |
| `shared/contracts/event-names.md` | ADD all 5 event names with domain, trigger, and allowed/prohibited payload summary |
| `server/src/lib/events.ts` | ADD all 5 to `KnownEventName` union (TypeScript string literal union at line 161) |

**Dependencies:**
- Team A sign-off on all five event names required before opening
- Layer 0 authorization required before opening

**Guardrails:**
- Team A authority rule per `event-names.md`: "UI does not invent event names. Team A owns event naming."
- Naming convention: domain-prefixed, snake_case, versioned `.v1`
- No PII in any event payload

**Required validation:**
```
pnpm --filter server typecheck
```

**Completion criteria:**
- All 5 events in `KnownEventName` TypeScript union
- All 5 events in `event-names.md` with trigger and payload spec
- `pnpm --filter server typecheck` passes
- Team A sign-off documented

**Proposed atomic commit message:**
```
docs(events): register supplier_profile, buyer_inquiry, public_supplier_profile events (EVENTS-003)
```

---

### 7.4 Unit C — ROUTE-001: MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001

**Status:** `BLOCKED_PENDING_LAYER0_AUTHORIZATION`  
**Wave:** 2 (first runtime unit)  
**Owner:** Main Platform team; Paresh authorization

**Purpose:**  
Build `GET /api/public/supplier/:slug` (backend) and `PUBLIC_SUPPLIER_PROFILE` AppState (frontend) with route `/supplier/:slug` or `/p/:slug`. Reuses five-gate projection model from `publicB2BProjection.service.ts`. Must include OpenAPI path in same wave (self-closes GAP-ACQ-004 for this route).

**Dependencies:**
- Layer 0 authorization cleared
- EVENTS-003 complete (for `supplier_profile.viewed.v1` emission on profile view)
- Paresh explicit authorization

**Files to inspect/change:**

| File | Change type |
| --- | --- |
| `server/src/routes/public.ts` | ADD `GET /supplier/:slug` route handler |
| `server/src/services/publicB2BProjection.service.ts` | ADD `getPublicB2BSupplierBySlug()` function; reuse five-gate model; Gate failure → 404 not 403 |
| `App.tsx` | ADD `'PUBLIC_SUPPLIER_PROFILE'` to `AppState` union; ADD URL detection in `resolveInitialAppState`; ADD `case 'PUBLIC_SUPPLIER_PROFILE':` to render switch |
| `shared/contracts/openapi.tenant.json` | ADD `GET /api/public/supplier/{slug}` path — same wave, non-negotiable |
| `components/Public/` | ADD `PublicSupplierProfile.tsx` (display-only; no contact reveal; no inquiry form in this unit) |

**Required payload (Gate E compliant):**  
Compose from five canonical classes per `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1`:
- `SUPPLIER_DISCOVERY_PROFILE` + `SUPPLIER_CAPABILITY_PROFILE` + `TRUST_QUALIFICATION_PREVIEW` + `BOUNDED_OFFERING_PREVIEW`

Allowed fields: `slug`, `legal_name`, `org_type`, `jurisdiction`, `certificationCount` (approved only), `certificationTypes` (max 10), `hasTraceabilityEvidence` (SHARED visibility only), `taxonomy`, `offeringPreview` (name, moq, imageUrl — NO price, max 5 items).

Prohibited fields (Gate E — unconditional): price, org UUIDs, `external_orchestration_ref`, contact data, `registration_no`, `risk_score`, `plan`, negotiation state, order/trade state, admin/governance fields, draft data.

**Gate behaviour:**  
Slug not found, or Gates A–D fail → return `404` (not `403`; must not confirm existence of non-public orgs).

**Required OpenAPI update:**  
`GET /api/public/supplier/{slug}` in `openapi.tenant.json`. Same wave per `ARCHITECTURE-GOVERNANCE.md`. Non-negotiable.

**Required event emission:**  
Emit `supplier_profile.viewed.v1` with `slug`, `source_channel` (from optional `?source=` param if present, else `'organic'`), optional `viewer_geo_band`, `timestamp`. Requires EVENTS-003 to be live. No orgId, no buyer identity in payload.

**Required tests:**
- `GET /api/public/supplier/:slug` slug found, all gates pass → 200 with discovery-safe payload
- Slug not found → 404
- Gate A fails (`publicEligibilityPosture !== 'PUBLICATION_ELIGIBLE'`) → 404
- Gate B fails (`publication_posture` not `B2B_PUBLIC` / `BOTH`) → 404
- Gate D fails (`status` not `ACTIVE` / `VERIFICATION_APPROVED`) → 404
- Payload never contains prohibited Gate E fields (assert via response schema)
- Frontend: `/supplier/:slug` URL resolves to `PUBLIC_SUPPLIER_PROFILE` AppState

**Required validation:**
```
pnpm --filter server typecheck
pnpm --filter server lint
pnpm -C server exec vitest run src/routes/public.test.ts --reporter=verbose
```

**Guardrails:**
- No contact fields in any response
- No `external_orchestration_ref` in any response
- No org UUID in unauthenticated response
- No inquiry form in this unit (INQUIRY-004)
- No QR source tracking param in this unit (QR-SOURCE-002)
- No aggregator surfaces touched in this unit

**Completion criteria:**
- `GET /api/public/supplier/:slug` returns 200 with five-gate-compliant payload
- All gate failure cases return 404
- OpenAPI path committed in same wave
- `supplier_profile.viewed.v1` emission wired
- `pnpm --filter server typecheck` passes
- Integration tests pass

**Proposed atomic commit message:**
```
feat(public): add GET /api/public/supplier/:slug profile route (ROUTE-001)
```

---

### 7.5 Unit D — QR-SOURCE-002: MAIN-PLATFORM-SUPPLIER-PROFILE-QR-SOURCE-002

**Status:** `NOT_READY_UNTIL_ROUTE_001`  
**Wave:** 3 (after ROUTE-001)

**Purpose:**  
Add optional `?source=` enum query parameter to `GET /api/public/supplier/:slug` for QR card, referral, and event source attribution.

**Dependencies:** ROUTE-001 live.

**Files to change:**

| File | Change type |
| --- | --- |
| `server/src/routes/public.ts` | Extend `/supplier/:slug` handler to accept and validate `source` enum param |
| `shared/contracts/openapi.tenant.json` | Update `/api/public/supplier/{slug}` spec to document `source` query param |

**Source enum values (strict):** `qr`, `referral`, `event`, `direct`.  
Non-presence defaults to `organic`.

**Guardrails:**
- Parameter is optional; non-presence is valid
- Never used as an auth or session token
- Never used to identify the viewer
- Reject or silently ignore unknown enum values (decision for implementing unit)
- Attach to `supplier_profile.viewed.v1` event as `source_channel`

**Completion criteria:**
- `?source=qr` accepted and attached to event payload
- Unknown values handled (reject or ignore — stated in unit prompt)
- OpenAPI updated in same wave

**Proposed atomic commit message:**
```
feat(public): add optional source enum param to supplier profile route (QR-SOURCE-002)
```

---

### 7.6 Unit E — REFERRAL-005: MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005

**Status:** `NOT_READY_UNTIL_ROUTE_001`  
**Wave:** 3 (parallel-safe with QR-SOURCE-002 after ROUTE-001)

**Purpose:**  
Add `PUBLIC_REFERRAL_LANDING` AppState to `App.tsx` with `/join/:referral_code` route for field-agent QR cards handed to new prospects. Frontend-only; no backend route needed.

**Dependencies:** ROUTE-001 live (recommended sequence; technically independent frontend unit).

**Files to change:**

| File | Change type |
| --- | --- |
| `App.tsx` | ADD `'PUBLIC_REFERRAL_LANDING'` to `AppState` union; ADD `/join/:referral_code` URL detection in `resolveInitialAppState`; ADD render case |
| `components/Public/` | ADD `PublicReferralLanding.tsx` — explains platform; links to application form with `referral_code` passthrough |

**Guardrails:**
- No server call on page load that writes any record
- `referral_code` is passthrough display token only — not a pre-auth identity or session token
- No backend route required (frontend-only)
- Platform non-ownership: referral code generation and commission ledger belong to CRM

**Completion criteria:**
- `/join/:referral_code` URL resolves to `PUBLIC_REFERRAL_LANDING` AppState
- Component renders without requiring auth
- No server-side record creation on page view
- `pnpm --filter web typecheck` passes (or equivalent)

**Proposed atomic commit message:**
```
feat(frontend): add PUBLIC_REFERRAL_LANDING state /join/:referral_code (REFERRAL-005)
```

---

### 7.7 Unit F — INQUIRY-004: MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004

**Status:** `BLOCKED_PENDING_ROUTE_EVENTS_RATE_LIMIT`  
**Wave:** 4

**Purpose:**  
Build `POST /api/public/inquiry/submit` — public-triggered, non-binding pre-auth inquiry intake per `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §4. Must include OpenAPI path in same wave.

**Dependencies:**
- ROUTE-001 live
- EVENTS-003 complete (GAP-ACQ-005 resolved — `buyer_inquiry.created.v1` registered)
- GAP-ACQ-006 rate-limit budget explicitly defined in the implementation prompt

**Files to change:**

| File | Change type |
| --- | --- |
| `server/src/routes/public.ts` | ADD `POST /inquiry/submit` with rate-limit plugin |
| `server/src/services/publicInquiry.service.ts` | CREATE new service for intake normalization |
| `shared/contracts/openapi.tenant.json` | ADD `POST /api/public/inquiry/submit` path — same wave |

**Required request payload:**
- `supplier_slug` (string, required)
- `inquiry_category` (enum, required)
- `geo_band` (optional)
- `volume_band` (optional)

**Prohibited request fields:** raw email, phone number, buyer name as required fields.

**Rate limit:** Per-IP. Budget must be defined in the implementation prompt (reference: `GET /api/public/dpp/:publicPassportId` uses 100 req/15 min/IP; inquiry endpoint should be tighter given write risk).

**Event emission:** `buyer_inquiry.created.v1` only — no other events. No orgId, no buyer identity.

**Guardrails:**
- No raw contact data stored or returned
- No public thread ownership created
- Rate limited before handler executes
- No authentication created for the submitter
- Platform normalizes intake; CRM owns follow-up routing

**Completion criteria:**
- `POST /api/public/inquiry/submit` returns 202 on valid intake
- Rate limit enforced before handler
- `buyer_inquiry.created.v1` emitted with compliant payload
- OpenAPI path committed in same wave
- `pnpm --filter server typecheck` passes

**Proposed atomic commit message:**
```
feat(public): add POST /api/public/inquiry/submit pre-auth intake (INQUIRY-004)
```

---

### 7.8 Unit G — WEBHOOK-007: MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007

**Status:** `BLOCKED_PENDING_ORF_EVENTS_JURISDICTION_AUTH_OPENAPI`  
**Wave:** 5

**Purpose:**  
Build `POST /api/internal/acquisition/provision-supplier` — platform side of the CRM→Platform provisioning handoff seam (CRM-ACQ-10). Internal-realm only. Strictly idempotent. Must include OpenAPI path in same wave.

**Dependencies:**
- ORF-AUTHORITY-006 complete (GAP-ACQ-001 canonical column + GAP-ACQ-007 jurisdiction default rule)
- EVENTS-003 complete (GAP-ACQ-005 resolved — provisioning events registered)
- Auth model explicitly defined in implementation prompt (internal-realm JWT or signed HMAC)
- Callback URL/callback pattern explicitly defined in implementation prompt
- Response and idempotency contract explicitly defined in implementation prompt
- Layer 0 authorization cleared
- Paresh explicit authorization

**Files to change:**

| File | Change type |
| --- | --- |
| `server/src/routes/internal/` | ADD new file (e.g., `acquisitionProvision.ts`); register at `/api/internal/acquisition/provision-supplier`; apply internal-realm auth guard before handler |
| `server/src/services/acquisitionProvisioning.service.ts` | CREATE new service: idempotency check, org row creation/update, entitlement gate setting, jurisdiction defaulting |
| `server/src/plugins/` | VERIFY internal-realm auth guard applies; no changes expected unless gap found |
| `shared/contracts/openapi.control-plane.json` | ADD `POST /api/internal/acquisition/provision-supplier` — same wave |

**Required request payload:**
- `external_orchestration_ref` (string, required — CRM onboarding case ID; idempotency key)
- `legal_name` (string, required)
- `org_type` (must be `'B2B'`, required)
- `jurisdiction` (string, optional from CRM; defaults to `'IN'` per GAP-ACQ-007 / ORF-AUTHORITY-006 rule)
- `primary_segment_key` (string, required)
- `publication_posture_target` (enum: `'B2B_PUBLIC'` | `'BOTH'`, required)

**Required behaviour:**
- Strictly idempotent: re-submitting same `external_orchestration_ref` → no-op or return existing record
- Set `publication_posture = target_value` and `publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` only after all platform-side quality gates pass
- Write `external_orchestration_ref` to canonical column per ORF-AUTHORITY-006
- `jurisdiction` default: `'IN'` if CRM omits field (per GAP-ACQ-007 / ORF-AUTHORITY-006)
- Org UUID generated by platform; CRM must not dictate platform UUIDs
- Return `409 Conflict` if ref already exists and is fully provisioned
- Emit `public_supplier_profile.provision_requested.v1` on handoff receipt (see PROVISIONED-EVENTS-008 or include in same unit)
- Emit `public_supplier_profile.provisioned.v1` on success
- Emit `public_supplier_profile.gate_failed.v1` on gate failure

**Auth options (Paresh decision required in prompt):**
- Option A: Internal-realm JWT (`realmGuard: 'admin'` or equivalent internal guard)
- Option B: HMAC-signed webhook with shared secret + secret rotation governance

**Guardrails:**
- Internal-realm only — never accessible unauthenticated from public internet
- `external_orchestration_ref` is Gate E prohibited — never returned in public API response
- No contact data in request payload
- No CRM commercial state (approval score, commission) accepted
- No CRM-dictated platform UUIDs

**Completion criteria:**
- `POST /api/internal/acquisition/provision-supplier` creates org row idempotently
- Re-submission of same `external_orchestration_ref` returns existing record without duplicate write
- `jurisdiction` defaults to `'IN'` when CRM payload omits field
- Auth guard verified (only internal-realm callers can invoke)
- OpenAPI path committed in same wave
- `pnpm --filter server typecheck` passes
- Integration test passes for: create, idempotent re-call, gate failure path

**Proposed atomic commit message:**
```
feat(internal): add POST /api/internal/acquisition/provision-supplier (WEBHOOK-007)
```

---

### 7.9 Unit H — PROVISIONED-EVENTS-008: MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-PROVISIONED-EVENTS-008

**Status:** `BLOCKED_PENDING_WEBHOOK_007`  
**Wave:** 6

**Purpose:**  
Wire emission of `public_supplier_profile.provisioned.v1` and `public_supplier_profile.gate_failed.v1` into the provisioning service. If WEBHOOK-007 already includes this wiring, this unit becomes a verification-only unit confirming the events fire correctly.

**Dependencies:** WEBHOOK-007 live; EVENTS-003 complete.

**Files to change:**

| File | Change type |
| --- | --- |
| `server/src/services/acquisitionProvisioning.service.ts` | ADD / VERIFY `emitEvent('public_supplier_profile.provisioned.v1', ...)` and `emitEvent('public_supplier_profile.gate_failed.v1', ...)` calls |

**Note:** If WEBHOOK-007's implementation already includes event emission (recommended — provision and emit should be atomic), this unit's scope is verification and test coverage only.

**Completion criteria:**
- `public_supplier_profile.provisioned.v1` emitted on successful provisioning
- `public_supplier_profile.gate_failed.v1` emitted on gate failure path
- No PII or prohibited fields in either event payload
- Integration test covers both event paths

**Proposed atomic commit message:**
```
feat(events): wire provisioned + gate_failed events in provisioning service (PROVISIONED-EVENTS-008)
```

---

## 8. Explicit Aggregator Posture

### 8.1 Aggregator Truthfulness — CLOSED

Both Aggregator governance units are CLOSED per `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE.md` (2026-04-06, DECIDED, Paresh):

| Unit | Status | Evidence |
| --- | --- | --- |
| `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` | **CLOSED** | Commits `cecc339` (runtime remediation), `9da32ea` (test discovery fix) |
| `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001` | **CLOSED** | Same decision; frontend typecheck green at closure |

The integration test file (`aggregator-discovery-read.integration.test.ts`) remains as a permanent quality gate. Its presence does not reopen the governance unit.

### 8.2 AI Matching — CLOSED

`TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` is **CLOSED / VERIFIED_COMPLETE** (commit `8b56962`, 2026-07-03). Do not open, re-open, or treat as deferred.

### 8.3 Aggregator Is Not a Dependency for ROUTE-001

The Aggregator stream is independent of the Main Platform public supplier profile route. ROUTE-001 must not be bundled with, delayed by, or designed around any Aggregator implementation concern. They are architecturally separate:

- Aggregator: authenticated, tenant-JWT-gated, `org_type === 'AGGREGATOR'` gated, read-only
- ROUTE-001: unauthenticated, public, five-gate projection, no AGGREGATOR entitlement involved

### 8.4 Aggregator as Future Consumer of ROUTE-001

After ROUTE-001 is live and the public profile payload shape is stable, the Aggregator Directory may be extended to:
- Display a link to the public profile URL from authenticated discovery cards
- Consume the five-gate public-safe profile shape for authenticated matching/detail views

This is a future enhancement — not part of ROUTE-001 scope. Any Aggregator enhancement must be a separate bounded unit with its own explicit authorization.

### 8.5 No Aggregator Work Bundled Into This Stream

No Aggregator development should be bundled into ROUTE-001, INQUIRY-004, WEBHOOK-007, or PROVISIONED-EVENTS-008. The Aggregator workspace (`AggregatorDiscoveryWorkspace.tsx`, `counterpartyProfileAggregation.service.ts`, `GET /api/tenant/aggregator/discovery`) must not be modified as part of the acquisition stream.

---

## 9. CRM Dependency Alignment

### 9.1 CRM-ACQ-10 — Blocked on Main Platform

CRM-ACQ-10 (CRM's side of the provisioning handoff) cannot complete until the Main Platform provides:

| Prerequisite | Status | When |
| --- | --- | --- |
| `external_orchestration_ref` canonical column named (ORF-AUTHORITY-006) | Not yet provided | Wave 1 |
| Event registration for `public_supplier_profile.*` (EVENTS-003) | Not yet provided | Wave 1 |
| Jurisdiction default decision (`'IN'` for acquisition-sourced suppliers, GAP-ACQ-007 / ORF-AUTHORITY-006) | Not yet provided | Wave 1 |
| `POST /api/internal/acquisition/provision-supplier` endpoint live (WEBHOOK-007) | Not yet provided | Wave 5 |
| OpenAPI path for the webhook (GAP-ACQ-004) | Not yet provided | Wave 5 (same wave as WEBHOOK-007) |
| Callback URL structure defined | Not yet provided | In WEBHOOK-007 implementation prompt |
| Auth model for internal callers defined | Not yet provided | In WEBHOOK-007 implementation prompt |
| Response and idempotency contract defined | Not yet provided | In WEBHOOK-007 implementation prompt |

### 9.2 CRM Must Not Write Directly to Main Platform Tables

CRM must not write directly to `organizations`, `tenants`, or any other Main Platform table. The provisioning handoff seam is `POST /api/internal/acquisition/provision-supplier` only. Platform owns org UUID generation. Platform owns the provisioning state transition. CRM is a caller; the platform is the authoritative record.

### 9.3 CRM Handoff Payload Contract

CRM must provide: `external_orchestration_ref`, `legal_name`, `org_type = 'B2B'`, `primary_segment_key`, `publication_posture_target`. Jurisdiction is optional in CRM payload — platform defaults to `'IN'` if absent (per ORF-AUTHORITY-006 decision). CRM must never provide: contact data, commission ledger entries, approval scores, pricing, org UUIDs.

---

## 10. CAE Dependency Alignment

The Customer Acquisition Engine (CAE) cannot rely on the following until the stated Main Platform units close:

| CAE Capability | Blocking Platform Unit | Wave |
| --- | --- | --- |
| Real public supplier URLs for QR cards and field use | ROUTE-001 | Wave 2 |
| Specific URL pattern (`/supplier/:slug` or `/p/:slug`) for QR card printing | ROUTE-001 | Wave 2 |
| QR / source attribution signal (field vs organic traffic) | QR-SOURCE-002 | Wave 3 |
| Referral landing page for new prospects (`/join/:referral_code`) | REFERRAL-005 | Wave 3 |
| Buyer inquiry intake flow from profile pages | INQUIRY-004 | Wave 4 |
| Provisioning feedback (`public_supplier_profile.provisioned.v1`) | WEBHOOK-007 + PROVISIONED-EVENTS-008 | Waves 5–6 |
| Remediation routing (`public_supplier_profile.gate_failed.v1`) | PROVISIONED-EVENTS-008 | Wave 6 |

**CAE integration remains blocked / live-stubbed until the Main Platform units above close.** No CAE unit should be opened or committed against a live platform endpoint that does not yet exist.

---

## 11. Non-Drift Rules

These rules exist to prevent drift from stale records, premature implementation, or boundary violations. An implementing agent or developer must read these before opening any unit.

1. **Do not rely on v1 tracker Layer 0 status.** The v1 trackers recorded Layer 0 as `NONE_AUTHORIZED`. Current truth is `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`. The TTP legal gate is active and strictly more restrictive.

2. **Do not open any unit without Layer 0 clearance.** Readiness labels in this tracker do not authorize implementation. Only explicit Paresh written authorization after TTP counsel feedback clears the gate.

3. **Do not treat Aggregator truthfulness as open.** Both Aggregator governance units are CLOSED (2026-04-06). Do not re-open, reference as a current dependency, or bundle Aggregator work into any acquisition unit.

4. **Do not treat TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 as deferred.** It is CLOSED / VERIFIED_COMPLETE. Do not re-open.

5. **Do not rely on GAP-ACQ-003 as a current open gap.** It is SUPERSEDED. The Aggregator truthfulness work is complete.

6. **Do not build WEBHOOK-007 before ORF-AUTHORITY-006 and EVENTS-003.** The dual-column gap and unregistered provisioning events are build-time blockers for WEBHOOK-007.

7. **Do not build ROUTE-001 without EVENTS-003 complete (if event emission is in scope).** TypeScript's `KnownEventName` constraint will prevent compilation until events are registered.

8. **Do not emit unregistered events.** The `KnownEventName` union enforces this at compile time. No event name may be emitted without Team A sign-off and registration in both `event-names.md` and `KnownEventName`.

9. **Do not build INQUIRY-004 before GAP-ACQ-006 is resolved.** The rate-limit budget must be explicitly stated in the INQUIRY-004 implementation prompt.

10. **Do not expose contact or Gate E prohibited fields in any public response.** `contact_phone`, `contact_email`, `external_orchestration_ref`, `risk_score`, `plan`, `registration_no`, org UUIDs, pricing, negotiation state, order/trade state are Gate E prohibited and must never appear in any public API response, under any condition.

11. **Do not add `contact_phone`, `contact_email`, `website`, or `linkedin` fields to `organizations`.** These fields are intentionally absent. They must never be added.

12. **Do not merge Aggregator work into ROUTE-001 or any acquisition unit.** Aggregator is an authenticated read-only surface. Public supplier profile is unauthenticated. These must remain architecturally separate.

13. **Do not skip OpenAPI same-wave obligation.** Every route unit (ROUTE-001, INQUIRY-004, WEBHOOK-007) must include its OpenAPI contract path in the same implementation wave. Deferred OpenAPI cleanup is not permitted per `ARCHITECTURE-GOVERNANCE.md`.

14. **Do not allow CRM to write directly to platform tables.** The provisioning seam is the webhook endpoint only. Platform owns org UUID generation and provisioning state transitions.

15. **Do not reference stale merged tracker for any of the four corrected dimensions** (Layer 0, Aggregator truthfulness, AI matching closure, GAP-ACQ-003). Use this v2 tracker as the authoritative current state.

---

## 12. Readiness Verdict

All verdicts are conditional on Layer 0 universal gate (§3.2) unless stated.

| Unit | Readiness Label | Blocking Condition |
| --- | --- | --- |
| **ORF-AUTHORITY-006** | `READY_TO_PLAN / BLOCKED_BY_LAYER0_AUTHORIZATION` | Layer 0 universal gate (TTP counsel + Paresh authorization) |
| **EVENTS-003** | `BLOCKED_PENDING_TEAM_A_EVENT_AUTHORITY + LAYER0` | Team A sign-off on event names + Layer 0 universal gate |
| **ROUTE-001** | `READY_AFTER_LAYER0_AND_EVENTS_003_COMPLETE` | Layer 0 universal gate + EVENTS-003 |
| **QR-SOURCE-002** | `NOT_READY_UNTIL_ROUTE_001` | ROUTE-001 live + Layer 0 |
| **REFERRAL-005** | `NOT_READY_UNTIL_ROUTE_001` | ROUTE-001 live (recommended) + Layer 0 |
| **INQUIRY-004** | `BLOCKED` | ROUTE-001 + EVENTS-003 + GAP-ACQ-006 rate-limit budget + Layer 0 |
| **WEBHOOK-007** | `BLOCKED` | ORF-AUTHORITY-006 + EVENTS-003 + auth model + callback URL + response/idempotency contract + Layer 0 |
| **PROVISIONED-EVENTS-008** | `BLOCKED` | WEBHOOK-007 + EVENTS-003 + Layer 0 |
| **Aggregator truthfulness** | `CLOSED` | Complete. No action. |
| **AI matching MVP** | `CLOSED` | Complete. No action. |
| **CRM-ACQ-10** | `BLOCKED_ON_MAIN_PLATFORM` | All Wave 1 and Wave 5 platform prerequisites |
| **CAE live integration** | `BLOCKED_ON_MAIN_PLATFORM` | ROUTE-001 (minimum) through WEBHOOK-007 / PROVISIONED-EVENTS-008 (full) |

---

## 13. Suggested Next Prompts After Legal Gate Clears

After TTP counsel feedback is received, recorded, and Paresh issues explicit written authorization, the recommended first two prompts are:

### First: MAIN-PLATFORM-ORF-AUTHORITY-006

**Prompt title:** `MAIN-PLATFORM-ORF-AUTHORITY-006`  
**Type:** Docs/governance only — no runtime code  
**Rationale:** Fastest-to-complete unit; unblocks WEBHOOK-007; resolves two gaps (GAP-ACQ-001, GAP-ACQ-007); parallel-safe with EVENTS-003; no Team A dependency; Paresh decides the canonical column.

**Can proceed in parallel with EVENTS-003** if Team A sign-off on event names is available at the same time.

### Second (or parallel): MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003

**Prompt title:** `MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003`  
**Type:** Events registration — changes `event-names.md` and `server/src/lib/events.ts` only  
**Rationale:** Required before ROUTE-001 if event emission is included in ROUTE-001 scope (recommended). Team A sign-off must be secured before this prompt opens. TypeScript type safety depends on this being complete before any event emission code is written.

### Third: MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001

**Prompt title:** `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001`  
**Type:** Runtime — first implementation unit  
**Rationale:** ROUTE-001 is the first runtime implementation unit and the foundation for all subsequent acquisition surfaces. Should open after ORF-AUTHORITY-006 and EVENTS-003 are complete to ensure event emission compiles and the canonical column is named.

**ORF-AUTHORITY-006 and EVENTS-003 should both precede ROUTE-001** for a clean, compile-safe first runtime implementation.

---

*Artifact ID: `MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2-001`*  
*Planning-only. No implementation. No runtime changes. Docs-only commit.*  
*Supersedes stale Layer 0, Aggregator, AI matching, and GAP-ACQ-003 records in v1 trackers where noted.*  
*2026-07-06 — TexQtic governance corpus, main branch.*
