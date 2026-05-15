# MAIN-PLATFORM-ACQUISITION-AND-AGGREGATOR-STREAM — Repo-Truth Refresh and Coordinated Opening Plan v1

**Artifact ID:** `MAIN-PLATFORM-ACQUISITION-AND-AGGREGATOR-STREAM-REPO-TRUTH-REFRESH-AND-OPENING-001`  
**Title:** Main Platform Acquisition Stream and Aggregator Sub-Layer — Repo-Truth Refresh, Status Correction, and Coordinated Opening Pre-authorization Plan  
**Status:** PLANNING ARTIFACT ONLY — NO IMPLEMENTATION  
**Date:** 2026-07-06  
**Authorized by:** Paresh  
**Mode:** Docs-only. No code, schema, migration, route, service, frontend, event, or OpenAPI changes.  
**Git HEAD at Authoring:** `a2a0b6c` (clean working tree)  
**Working Tree State:** Clean (verified `git diff --name-only; git status --short` → no output)

---

## 0. Critical Constraints

**READ BEFORE ACTING ON ANY SECTION OF THIS ARTIFACT.**

This artifact is planning-only. It records corrected governance truth, stale-record corrections, confirmed runtime inventory, an open gap register, and a coordinated pre-authorization readiness plan. It does NOT:

- Authorize implementation of any unit listed herein
- Open any bounded product unit
- Modify any governance/control file (OPEN-SET.md, NEXT-ACTION.md, BLOCKED.md, SNAPSHOT.md)
- Add, remove, or change any route, service, schema field, event name, or OpenAPI contract entry
- Register event names in `shared/contracts/event-names.md` or `server/src/lib/events.ts`
- Resolve the schema-level dual `external_orchestration_ref` gap
- Open TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 (already CLOSED — see §4.2)
- Imply Layer 0 authorization has been granted

No implementation may open until the Layer 0 gate conditions listed in §9 are fully satisfied.

---

## 1. Purpose and Authority of This Artifact

### 1.1 What This Document Does

This artifact serves four functions:

1. **Truth refresh:** Records the delta between the merged tracker (2026-05-12) and current verified runtime + governance state as of 2026-07-06.
2. **Status correction:** Corrects stale records in the merged tracker — specifically Unit I (Aggregator unit CLOSED, not OPEN) and TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 (CLOSED, not deferred).
3. **Gap register update:** Adds GAP-ACQ-007 (CRM jurisdiction payload gap) and marks GAP-ACQ-003 as SUPERSEDED.
4. **Coordinated opening plan:** States exactly what must be true, and in what sequence, before any implementation unit in either stream may be opened.

### 1.2 Authority Chain

| Governing Document | Role |
| --- | --- |
| `governance/control/NEXT-ACTION.md` (2026-07-06) | Canonical Layer 0 active pointer |
| `governance/control/OPEN-SET.md` (2026-07-06) | Layer 0 current open delivery set |
| `governance/control/BLOCKED.md` (2026-07-01) | Current hold and blocker register |
| `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE.md` (2026-04-06) | Authoritative Aggregator unit closure |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` (2026-04-21) | B2B public discovery and inquiry model authority |
| `governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` (2026-04-21) | Two-tier visibility / projection model authority |
| `docs/product-truth/MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-v1.md` (2026-05-12) | Merged tracker (primary input; partially stale — see §13) |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` (2026-05-12) | Main Platform acquisition tracker (planning only) |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | Boundary design and non-ownership definitions |
| `docs/product-truth/AGGREGATOR-DIRECTORY-ACQUISITION-INTEGRATION-DESIGN-v1.md` | Aggregator–acquisition integration design |
| `docs/product-truth/AGGREGATOR-LAYER-REPO-TRUTH-AUDIT-v1.md` (2026-06-08) | Aggregator layer runtime audit (partially stale — see §13) |

---

## 2. Evidence Base

### 2.1 Files Read for This Artifact

The following files were read in full or in relevant part as basis for the claims herein:

| File | Sections / Lines Reviewed |
| --- | --- |
| `governance/control/OPEN-SET.md` | Full |
| `governance/control/NEXT-ACTION.md` | Full |
| `governance/control/BLOCKED.md` | Full |
| `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE.md` | Full |
| `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION.md` | Full |
| `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS-OPENING.md` | §1–§4 |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` | §1–§3 |
| `governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` | §1–§2 |
| `docs/product-truth/MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-v1.md` | Full (all sections) |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` | §1–§3 |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | §2–§5 |
| `docs/product-truth/AGGREGATOR-LAYER-REPO-TRUTH-AUDIT-v1.md` | §1–§7 and §3.10 |
| `docs/TECS-LAUNCH-GRADE-RUNTIME-DATA-QA-AUDIT-001-REPORT.md` | Header / exec summary |
| `App.tsx` | `AppState` union + case statements (live grep) |
| `server/prisma/schema.prisma` | `external_orchestration_ref`, `slug`, `jurisdiction`, `publicEligibilityPosture`, `publication_posture` fields |
| `server/src/lib/events.ts` | `KnownEventName` union |
| `shared/contracts/event-names.md` | Full |
| `server/src/tests/aggregator-discovery-read.integration.test.ts` | Lines 1–130 |

### 2.2 CRM and CAE Artifacts — External Evidence

The following artifacts are referenced by the merged tracker but are **NOT PRESENT in this repository** at HEAD `a2a0b6c`:

| Artifact ID | Status |
| --- | --- |
| `CRM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` | NOT FOUND — external CRM artifact |
| `CRM-ACQ-10` decision / closure | NOT FOUND — external CRM governance decision |
| Customer Acquisition Engine (CAE) plan / tracker | NOT FOUND — external CAE artifact |

These are treated as external evidence. Claims about CRM payload structure, CRM jurisdiction field behavior, and CRM handoff seam are sourced from `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` and `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md`, which ARE present at the repo root.

---

## 3. Layer 0 Posture — Current Truth

### 3.1 Current Layer 0 State (2026-07-06)

As of `governance/control/NEXT-ACTION.md` and `governance/control/OPEN-SET.md` at HEAD `a2a0b6c`, the authoritative Layer 0 posture is:

| Field | Current Truth |
| --- | --- |
| `mode` | `OPENING_LAYER_CANON_POINTER` |
| `active_delivery_unit` | `HOLD_FOR_AUTHORIZATION` |
| `active_delivery_unit_status` | `HOLD_FOR_AUTHORIZATION` |
| `next_candidate_unit` | `HOLD_FOR_COUNSEL_FEEDBACK` |
| `product_delivery_priority` | `LAUNCH_GATE_CLOSED` |
| `last_closed_unit` | `TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001` (VERIFIED_COMPLETE 2026-07-06) |
| `superseded_candidate` | `TEXQTIC-NC-OES-ESCROW-DESIGN-001` (SUPERSEDED_REFRAMED — TradeTrust Pay replaces escrow) |
| `DPP Passport Network` | `PRODUCTION_READY` — `HOLD_FOR_PARESH_DECISION` |

### 3.2 TTP Legal Gate — Active Hold

`NEXT-ACTION.md` records the following authoritative constraint:

> No implementation packet may be opened until:
> 1. External legal counsel provides written feedback on `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` (upgraded)
> 2. Feedback is recorded in `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001`
> 3. Paresh issues explicit written authorization

**This gate is ACTIVE.** Until all three conditions are met, no implementation unit — including ROUTE-001 — may be opened, regardless of its readiness posture.

### 3.3 BLOCKED.md Active Holds (2026-07-01)

| Hold | Status |
| --- | --- |
| NC runtime blockers (all NC Phase 1 items) | ALL RESOLVED |
| White Label Co | `REVIEW-UNKNOWN` (sole current hold) |
| NC-PROD-AWARD | `DESIGN_COMPLETE` (two-call G-021 split flow) |
| QD-6 hold (`nc.procurement_pools.supplier_quotes.enabled=false`) | UNCHANGED |

### 3.4 Drift Correction — Merged Tracker Layer 0 Entry

The merged tracker (2026-05-12, §1.1) recorded Layer 0 as `NONE_AUTHORIZED`.

**This is stale.** The current authoritative Layer 0 posture is `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`. The posture changed between 2026-05-12 and 2026-07-06 through the NC Phase 1 closure sequence and the TTP legal packet upgrade. Any readiness verdict in the merged tracker that assumed `NONE_AUTHORIZED` as the gate condition must be reread against the current `HOLD_FOR_COUNSEL_FEEDBACK` gate, which is strictly more restrictive: no implementation may open pending TTP counsel feedback and explicit Paresh authorization.

---

## 4. Aggregator Sub-Layer Stream — Corrected Status

### 4.1 Authoritative Closure (GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE, 2026-04-06)

Per `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE.md` (Status: DECIDED, Authorized by Paresh, Date: 2026-04-06):

| Unit | Current Authoritative Status |
| --- | --- |
| `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` | **CLOSED** — complete |
| `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001` | **CLOSED** — complete |

Evidence of closure:
- Runtime remediation: commit `cecc339` (bounded backend discovery read path)
- Test discovery fix: commit `9da32ea` (exact backend verification path made discoverable and runnable)
- Frontend verification: `pnpm exec tsc --noEmit` green at closure
- Backend integration test: passing on exact focused Aggregator integration path at closure

### 4.2 TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 — Corrected Status

Per `docs/TECS-LAUNCH-GRADE-RUNTIME-DATA-QA-AUDIT-001-REPORT.md` (Git HEAD at Audit: `8b56962`, commit message: `gov(ai-matching): close TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001`) and `docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-DESIGN-v1.md` (records `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` as `VERIFIED_COMPLETE`):

| Unit | Current Authoritative Status |
| --- | --- |
| `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` | **CLOSED** — VERIFIED_COMPLETE (commit `8b56962`) |

The merged tracker (2026-05-12) listed this as `adjacent_deferred_candidate`. **This is stale.** The unit was completed and closed. Do not open, re-open, or treat as deferred.

### 4.3 Aggregator Runtime Inventory — Current Truth

The following Aggregator surfaces are LIVE in the codebase at HEAD `a2a0b6c`:

| Surface | Status | Notes |
| --- | --- | --- |
| `GET /api/tenant/aggregator/discovery` route | **LIVE** | `server/src/routes/tenant.ts` lines 1948–2006 |
| `counterpartyProfileAggregation.service.ts` | **LIVE** | `listCounterpartyDiscoveryEntries()` + `getCounterpartyProfileAggregation()` |
| `AggregatorDiscoveryWorkspace.tsx` | **LIVE** | Authenticated tenant workspace; no contact/inquiry/shortlist |
| `aggregatorDiscoveryService.ts` | **LIVE** | Authenticated tenant GET via `tenantGet` |
| `TenantType.AGGREGATOR` enum value | **LIVE** | `schema.prisma` lines 2336–2340 |
| `aggregator_capability` (computed) | **LIVE** | Runtime-computed; NOT a DB column |
| `GET /api/tenant/aggregator/discovery` OpenAPI path | **LIVE** | `openapi.tenant.json` lines 1545–1600 |
| Integration test suite | **PRESENT** | `aggregator-discovery-read.integration.test.ts`; see §4.4 |

The following Aggregator surfaces are intentionally ABSENT:

| Surface | Status | Governance Basis |
| --- | --- | --- |
| Aggregator-specific events | **ABSENT** | None authorized; team authority required |
| Individual supplier profile click-through from discovery workspace | **ABSENT** | Requires ROUTE-001 (Main Platform-owned) |
| Contact button / contact reveal | **ABSENT** | Intentional — constitutional prohibition |
| Shortlist / comparison / collection UI | **ABSENT** | Not Aggregator scope; no schema foundation |
| Public Aggregator directory | **ABSENT** | Aggregator does not receive general public directory eligibility per `TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1` |

### 4.4 Integration Test — Observed State Note

`server/src/tests/aggregator-discovery-read.integration.test.ts` is present at HEAD `a2a0b6c`. The test suite is titled `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS — discovery read route`. The `AGGREGATOR-LAYER-REPO-TRUTH-AUDIT-v1.md` (2026-06-08, §3.10) recorded the test as "FAILING" and the unit as "OPEN."

**This is an inconsistency in the audit.** The authoritative governance truth per `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE` (2026-04-06) is that the unit is CLOSED and the backend runtime defect was remediated in commit `cecc339`. The audit was either written before referencing the close decision or contains a stale unit-status reference. The governance decision (DECIDED, Paresh) takes precedence over the audit's unit-status claim.

The test file remains present as a permanent runtime quality gate for the Aggregator discovery route. Its presence does not imply the governance unit is open. No action is needed to modify the test file. See §13.2 for the full stale-record correction note.

---

## 5. Main Platform Acquisition Stream — Status Summary

### 5.1 Summary of Eight Acquisition Units

| Unit ID | Name | Status in Tracker (2026-05-12) | Corrected Status (2026-07-06) | Blocking Condition |
| --- | --- | --- | --- | --- |
| A / ROUTE-001 | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` | READY_TO_OPEN (after Layer 0 auth) | **BLOCKED_PENDING_LAYER0_AUTHORIZATION** | TTP counsel feedback + explicit Paresh authorization |
| B / QR-SOURCE-002 | QR source tracking parameter | NOT_READY (needs ROUTE-001) | **NOT_READY** | Depends on ROUTE-001; Layer 0 gate also applies |
| C / EVENTS-003 | Event registration (`supplier_profile.*`, `buyer_inquiry.*`, `public_supplier_profile.*`) | BLOCKED (GAP-ACQ-002, Team A authority) | **BLOCKED** | GAP-ACQ-002 (Team A event naming authority) + Layer 0 |
| D / INQUIRY-004 | `POST /api/public/inquiry/submit` buyer intake | BLOCKED (ROUTE-001 + GAP-ACQ-005 + GAP-ACQ-006) | **BLOCKED** | ROUTE-001 required; GAP-ACQ-005 (event names); GAP-ACQ-006 (rate-limit budget); Layer 0 |
| E / REFERRAL-005 | `PUBLIC_REFERRAL_LANDING` AppState (`/join/:referral_code`) | NOT_READY (ROUTE-001 recommended) | **NOT_READY** | Depends on ROUTE-001 (recommended sequence); Layer 0 |
| F / ORF-AUTHORITY-006 | Governance doc: `external_orchestration_ref` canonical authority | REQUIRED_BEFORE_WEBHOOK (parallel-safe; docs-only) | **REQUIRED_BEFORE_WEBHOOK** | Governance doc only; no runtime dependency; parallel-safe; still blocked by Layer 0 |
| G / WEBHOOK-007 | `POST /api/internal/acquisition/provision-supplier` | BLOCKED (ORF-AUTHORITY-006 required) | **BLOCKED** | ORF-AUTHORITY-006 required; GAP-ACQ-001 (dual-column authority); Layer 0 |
| H / PROVISIONED-EVENTS-008 | Provisioning event emission (`public_supplier_profile.*`) | BLOCKED (WEBHOOK-007 + GAP-ACQ-005) | **BLOCKED** | WEBHOOK-007 required; GAP-ACQ-005 (event names); Layer 0 |

**Layer 0 applies universally.** No unit in this table may be opened until TTP counsel feedback is received, recorded, and Paresh issues explicit written authorization, regardless of unit-level readiness.

### 5.2 Critical Absence Confirmed at HEAD `a2a0b6c`

The following surfaces are confirmed absent via grep and file inspection:

| Surface | Status |
| --- | --- |
| `GET /api/public/supplier/:slug` route | **ABSENT** — not in `server/src/routes/public.ts` |
| `PUBLIC_SUPPLIER_PROFILE` AppState | **ABSENT** — not in `App.tsx` AppState union (line 1951+) |
| `PUBLIC_REFERRAL_LANDING` AppState | **ABSENT** — not in `App.tsx` AppState union |
| `getPublicB2BSupplierBySlug()` service function | **ABSENT** — not in `publicB2BProjection.service.ts` |
| `POST /api/public/inquiry/submit` route | **ABSENT** |
| `POST /api/internal/acquisition/provision-supplier` route | **ABSENT** |
| `/join/:referral_code` frontend route | **ABSENT** |
| `supplier_profile.*` events in `KnownEventName` | **ABSENT** |
| `buyer_inquiry.*` events in `KnownEventName` | **ABSENT** |
| `public_supplier_profile.*` events in `KnownEventName` | **ABSENT** |
| Acquisition events in `shared/contracts/event-names.md` | **ABSENT** |
| `GET /api/public/supplier/{slug}` in any OpenAPI contract | **ABSENT** |
| `POST /api/public/inquiry/submit` in any OpenAPI contract | **ABSENT** |
| `POST /api/internal/acquisition/provision-supplier` in any OpenAPI contract | **ABSENT** |
| `inquiry`, `referral`, `handoff`, `buyer_intent` Prisma models | **ABSENT** |
| `contact_phone`, `contact_email` fields on `organizations` | **ABSENT** — intentional; must never be added |

### 5.3 Live Acquisition-Adjacent Surfaces at HEAD `a2a0b6c`

| Surface | Status | Notes |
| --- | --- | --- |
| `GET /api/public/b2b/suppliers` | **LIVE** | Five-gate projection; paginated; no auth |
| `PUBLIC_B2B_DISCOVERY` AppState | **LIVE** | App.tsx line 1953; renders `B2BDiscovery.tsx` |
| `publicB2BProjection.service.ts` | **LIVE** | Five-gate architecture; correct reuse foundation for ROUTE-001 |
| `organizations.slug` | **LIVE** | `@unique`, VarChar(100) — not yet used in any public route |
| `organizations.publicEligibilityPosture` | **LIVE** | Gate A field |
| `organizations.publication_posture` | **LIVE** | Gate B field; default `PRIVATE_OR_AUTH_ONLY` |
| `organizations.external_orchestration_ref` | **LIVE** | `@unique`, VarChar(255); dual-column gap — see GAP-ACQ-001 |
| `tenants.externalOrchestrationRef` | **LIVE** | `@unique`, VarChar(255); dual-column gap — see GAP-ACQ-001 |
| `organizations.jurisdiction` | **LIVE** | VarChar(100), default `'UNKNOWN'`; indexed |

---

## 6. Open Gap Register

### 6.1 Gap Status Summary

| Gap ID | Description | Status | Blocks |
| --- | --- | --- | --- |
| GAP-ACQ-001 | `external_orchestration_ref` dual-column authority unresolved | **OPEN** | WEBHOOK-007, PROVISIONED-EVENTS-008 |
| GAP-ACQ-002 | No `supplier_profile.*` events in `KnownEventName` or `event-names.md` | **OPEN** | EVENTS-003, event emission on ROUTE-001 |
| GAP-ACQ-003 | AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS blocked by Layer 0 | **SUPERSEDED** | See §6.8 |
| GAP-ACQ-004 | No OpenAPI entries for acquisition integration endpoints | **OPEN** | OpenAPI governance compliance; every unit building a new route must author the spec path in the same wave |
| GAP-ACQ-005 | `buyer_inquiry.*` and `public_supplier_profile.*` events not registered | **OPEN** | INQUIRY-004, WEBHOOK-007, PROVISIONED-EVENTS-008 |
| GAP-ACQ-006 | No rate-limit budget defined for `POST /api/public/inquiry/submit` | **OPEN** | INQUIRY-004 |
| GAP-ACQ-007 | CRM jurisdiction payload gap | **OPEN** | WEBHOOK-007 (risk to idempotency on jurisdiction field) |

### 6.2 GAP-ACQ-001 — `external_orchestration_ref` Dual-Column Authority

**Description:** Both `tenants.externalOrchestrationRef` (schema.prisma line 21, `@unique`) and `organizations.external_orchestration_ref` (schema.prisma line 1073, `@unique`) carry the same field name with separate unique constraints across two different models. A third occurrence exists on `invites.externalOrchestrationRef` (schema.prisma line 120, non-unique). No governance document states which column is the canonical CRM lookup key for the provisioning handoff.

**Risk:** If the CRM/Acquisition Engine writes `external_orchestration_ref` to both columns without a canonical authority decision, duplicate or diverging records could break idempotency in the provisioning webhook.

**Resolution required before WEBHOOK-007:** A governance decision document must state: (a) which column is the canonical CRM cross-system link anchor, (b) whether the `invites` model occurrence is intentionally separate, and (c) the idempotency lookup strategy.

**Status:** OPEN — requires Paresh authorization to resolve via governance doc (ORF-AUTHORITY-006, Unit F).

### 6.3 GAP-ACQ-002 — `supplier_profile.*` Events Not Registered

**Description:** Zero `supplier_profile.*` events exist in `KnownEventName` (server/src/lib/events.ts line 161) or `shared/contracts/event-names.md`. Events required: `supplier_profile.viewed.v1`.

**Governance rule:** Event naming authority belongs to Team A. UI does not invent event names (`shared/contracts/event-names.md`). Registration requires Team A sign-off.

**Resolution required before ROUTE-001 (event emission) and EVENTS-003:** Event names must be agreed with Team A, added to `event-names.md` (contracts file), and added to `KnownEventName` union in a docs-and-code wave as part of EVENTS-003.

**Status:** OPEN.

### 6.4 GAP-ACQ-003 — SUPERSEDED

**Original description (2026-05-12):** AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS blocked by Layer 0.

**Current truth:** The unit `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` was CLOSED on 2026-04-06 per `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE` (DECIDED, Paresh). The gap no longer applies in its original form — the truthfulness work is complete.

**Status:** SUPERSEDED — unit completed and closed. No action needed under this gap ID.

### 6.5 GAP-ACQ-004 — No OpenAPI Entries for Acquisition Endpoints

**Description:** None of `GET /api/public/supplier/{slug}`, `POST /api/public/inquiry/submit`, or `POST /api/internal/acquisition/provision-supplier` exist in `openapi.tenant.json` or `openapi.control-plane.json` (both v0.3.0).

**Governance rule:** Per `shared/contracts/ARCHITECTURE-GOVERNANCE.md`, when a new endpoint is built, the corresponding OpenAPI contract must be updated in the same implementation wave — not as deferred cleanup.

**Resolution:** Each unit that builds a route listed above must include the OpenAPI path as part of its implementation wave. Not a pre-gate blocker — resolved inline.

**Status:** OPEN — each route unit self-closes this gap for its own endpoint.

### 6.6 GAP-ACQ-005 — `buyer_inquiry.*` and `public_supplier_profile.*` Events Not Registered

**Description:** Zero `buyer_inquiry.*` and `public_supplier_profile.*` events exist in either registry. Events required: `buyer_inquiry.created.v1`, `public_supplier_profile.provision_requested.v1`, `public_supplier_profile.provisioned.v1`, `public_supplier_profile.gate_failed.v1`.

**Governance rule:** Same as GAP-ACQ-002. Team A authority; no unilateral registration.

**Resolution required before INQUIRY-004, WEBHOOK-007, PROVISIONED-EVENTS-008.** Must be resolved together with GAP-ACQ-002 in EVENTS-003.

**Status:** OPEN.

### 6.7 GAP-ACQ-006 — No Rate-Limit Budget for Inquiry Endpoint

**Description:** No rate-limit budget is defined for `POST /api/public/inquiry/submit`. Comparable public endpoint `GET /api/public/dpp/:publicPassportId` uses 100 requests / 15 minutes / IP. Inquiry endpoint is higher-risk (write surface); appropriate budget must be stated before build.

**Resolution required before INQUIRY-004.** Budget must be specified in the INQUIRY-004 implementation prompt.

**Status:** OPEN.

### 6.8 GAP-ACQ-007 — CRM Jurisdiction Payload Gap

**Description:** Per `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md`, CRM's `public.suppliers` table does not include a `jurisdiction` field in its public handoff payload. The provisioning webhook (WEBHOOK-007) needs to set `organizations.jurisdiction` (schema.prisma line 1058, default `'UNKNOWN'`). For acquisition-sourced suppliers, the Main Platform has a documented default rule: jurisdiction defaults to `IN` (India) when the CRM payload omits it (consistent with TexQtic's primary market).

**Risk:** If WEBHOOK-007 is built without resolving this, acquisition-provisioned suppliers will have `jurisdiction = 'UNKNOWN'` rather than `IN`, which may affect five-gate projection output and discovery quality.

**Resolution required before WEBHOOK-007:** The ORF-AUTHORITY-006 governance doc (Unit F) must state the jurisdiction default rule explicitly for acquisition-sourced suppliers. The WEBHOOK-007 implementation prompt must include the defaulting logic.

**Status:** OPEN.

---

## 7. Current Runtime Inventory — Five-Gate B2B Projection Architecture

The five-gate B2B projection safety architecture is LIVE and is the correct reuse foundation for ROUTE-001.

| Gate | Condition | Source |
| --- | --- | --- |
| Gate A | `publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'` | `server/src/services/publicB2BProjection.service.ts` |
| Gate B | `publication_posture IN ('B2B_PUBLIC', 'BOTH')` | same |
| Gate C | `org_type === 'B2B'` | same |
| Gate D | `status IN ('ACTIVE', 'VERIFICATION_APPROVED')` | same |
| Gate E | Payload field allowlist — unconditional prohibitions | same |

**Allowed output fields (Gate E):** `slug`, `legal_name`, `org_type`, `jurisdiction`, `certificationCount`, `certificationTypes` (max 10), `hasTraceabilityEvidence` (SHARED only), taxonomy (`primarySegment`, `secondarySegments`, `rolePositions`), `offeringPreview` (name, moq, imageUrl — NO price, max 5 items), `publicationPosture`, `eligibilityPosture`.

**Unconditionally prohibited fields (Gate E):** price, org UUIDs, `risk_score`, `plan`, `registration_no`, `external_orchestration_ref`, negotiation state, order/trade state, admin/governance state, draft data, contact data (no `contact_phone`, `contact_email` — these fields do not exist and must never be added).

This architecture applies to both the current `GET /api/public/b2b/suppliers` route and the future `GET /api/public/supplier/:slug` route (ROUTE-001). The individual profile endpoint must reuse `publicB2BProjection.service.ts` and must not bypass the gate layer.

---

## 8. Governance Decision Alignment

### 8.1 B2B Public Discovery and Inquiry Model Decision

Per `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` (DECIDED, 2026-04-21):

- B2B public discovery is **projection-only, trust-governed, and entry-oriented**
- May expose supplier-fit and offering-preview context; must not expose pricing, negotiation, or workflow continuity
- Public inquiry and RFQ-intent are public-triggered intake and handoff mechanisms only; not public workflow ownership
- Authenticated B2B exchange remains the owner of RFQ workflow, pricing, negotiation, messaging, orders, and trade execution

The five canonical B2B public discovery object classes are: `SUPPLIER_DISCOVERY_PROFILE`, `SUPPLIER_CAPABILITY_PROFILE`, `CATEGORY_CAPABILITY_DISCOVERY_VIEW`, `BOUNDED_OFFERING_PREVIEW`, `TRUST_QUALIFICATION_PREVIEW`.

Any implementation of ROUTE-001 must compose these classes from the five-gate projection service only.

### 8.2 Public Visibility and Projection Model Decision

Per `governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` (DECIDED, 2026-04-21):

- No tenant or object appears publicly by default
- Public presence is both tenant-gated (`publicEligibilityPosture`) and object-gated (`publication_posture`)
- Aggregator tenants do **not** receive general public directory eligibility by default
- Any Aggregator public presence must be narrower than a public counterparty directory and must not imply public transaction ownership

The two-tier visibility model (tenant eligibility gate + listing/object publication posture) governs all public surface builds.

---

## 9. Coordinated Opening Plan — Gate Conditions

### 9.1 Universal Gate (All Units)

**No unit may open until all three conditions are satisfied:**

| Condition | Status |
| --- | --- |
| External legal counsel provides written feedback on `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` | PENDING |
| Feedback recorded in `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001` | PENDING |
| Paresh issues explicit written authorization | PENDING |

Until these conditions are met, the readiness postures below are academic planning context only.

### 9.2 Unit-Level Gate Conditions (After Universal Gate Clears)

#### Wave 0 — Pre-condition Documentation (Parallel-Safe, Docs-Only)

| Unit | Gate Conditions for Opening |
| --- | --- |
| **F / ORF-AUTHORITY-006** — `external_orchestration_ref` canonical authority governance doc | (1) Universal gate cleared; (2) Paresh explicit authorization for docs-only governance doc unit. Parallel-safe with ROUTE-001 if sequenced first within the same opening window. |

This is the only unit that is parallel-safe with ROUTE-001. It must be completed before WEBHOOK-007 is opened regardless.

#### Wave 1 — Public Discovery Foundations

| Unit | Gate Conditions for Opening |
| --- | --- |
| **A / ROUTE-001** — `GET /api/public/supplier/:slug` + `PUBLIC_SUPPLIER_PROFILE` AppState | (1) Universal gate cleared; (2) Paresh explicit authorization; (3) GAP-ACQ-002 resolved (supplier_profile.* events registered — EVENTS-003 may be opened in same wave or as prerequisite); (4) GAP-ACQ-004 self-closed inline (OpenAPI path authored in same wave). |
| **C / EVENTS-003** — Register `supplier_profile.*`, `buyer_inquiry.*`, `public_supplier_profile.*` events | (1) Universal gate cleared; (2) Team A sign-off on event names; (3) Paresh explicit authorization. Closes GAP-ACQ-002 and GAP-ACQ-005 when complete. May be opened in same wave as ROUTE-001 or before. |

#### Wave 2 — QR Source Tracking and Referral Landing

| Unit | Gate Conditions for Opening |
| --- | --- |
| **B / QR-SOURCE-002** — QR source tracking parameter on ROUTE-001 | (1) ROUTE-001 live and verified; (2) Universal gate cleared; (3) Paresh explicit authorization. |
| **E / REFERRAL-005** — `PUBLIC_REFERRAL_LANDING` AppState | (1) ROUTE-001 live and verified (recommended); (2) Universal gate cleared; (3) Paresh explicit authorization. |

#### Wave 3 — Buyer Inquiry Intake

| Unit | Gate Conditions for Opening |
| --- | --- |
| **D / INQUIRY-004** — `POST /api/public/inquiry/submit` | (1) ROUTE-001 live; (2) EVENTS-003 complete (GAP-ACQ-005 resolved); (3) GAP-ACQ-006 rate-limit budget resolved; (4) Universal gate cleared; (5) Paresh explicit authorization. |

#### Wave 4 — Provisioning Webhook

| Unit | Gate Conditions for Opening |
| --- | --- |
| **G / WEBHOOK-007** — `POST /api/internal/acquisition/provision-supplier` | (1) ORF-AUTHORITY-006 complete (GAP-ACQ-001 resolved, jurisdiction default rule for GAP-ACQ-007 documented); (2) EVENTS-003 complete (GAP-ACQ-005 resolved); (3) Universal gate cleared; (4) Paresh explicit authorization. |

#### Wave 5 — Provisioning Events

| Unit | Gate Conditions for Opening |
| --- | --- |
| **H / PROVISIONED-EVENTS-008** — `public_supplier_profile.*` provisioning event emission | (1) WEBHOOK-007 live and verified; (2) EVENTS-003 complete; (3) Universal gate cleared; (4) Paresh explicit authorization. |

### 9.3 Sequencing Summary

```
Universal Gate (TTP counsel feedback + Paresh authorization)
  ↓
Wave 0: ORF-AUTHORITY-006 (parallel-safe docs-only)
         + EVENTS-003 (Team A event name sign-off required)
  ↓
Wave 1: ROUTE-001 (requires EVENTS-003 for event emission)
  ↓
Wave 2: QR-SOURCE-002 | REFERRAL-005 (both require ROUTE-001)
  ↓
Wave 3: INQUIRY-004 (requires ROUTE-001 + EVENTS-003 + GAP-ACQ-006 resolution)
  ↓
Wave 4: WEBHOOK-007 (requires ORF-AUTHORITY-006 + EVENTS-003)
  ↓
Wave 5: PROVISIONED-EVENTS-008 (requires WEBHOOK-007 + EVENTS-003)
```

---

## 10. Non-Ownership Boundary — Platform vs CRM vs Field Tool

### 10.1 What the Main Platform Owns (Acquisition-Relevant)

| Capability | Governance Authority |
| --- | --- |
| Public supplier profile route (`GET /api/public/supplier/:slug`) | `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §3 |
| Five-gate projection safety architecture | `publicB2BProjection.service.ts`; Boundary Design §2.4 |
| QR scan destination (supplier profile URL) | Boundary Design §3.2 |
| Public supplier directory (`GET /api/public/b2b/suppliers`) | LIVE |
| Buyer inquiry intake (`POST /api/public/inquiry/submit`) | `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §4 |
| Provisioning webhook receiver (`POST /api/internal/acquisition/provision-supplier`) | Boundary Design §3.3 |
| Referral join landing (`PUBLIC_REFERRAL_LANDING` AppState) | Boundary Design §3.6 |
| `external_orchestration_ref` lookup (CRM idempotency check) | Schema exists; canonical column authority pending ORF-AUTHORITY-006 |

### 10.2 What the CRM / Acquisition Engine Owns — Not Platform

| Capability | Reason |
| --- | --- |
| Lead qualification and scoring | CRM workflow continuity |
| Duplicate supplier detection and resolution | CRM data-quality concern |
| Commission ledger and field-agent payout | Financial reconciliation; platform must not imply money movement or hold funds |
| Referral code generation and assignment | CRM business logic; platform is passthrough only |
| Onboarding case lifecycle (new → approved → issuance) | CRM pre-runtime business-truth chain |
| `crm.onboarding.approved` state ownership | CRM owns approval posture; platform owns runtime entitlement |
| Acquisition draft records as canonical truth | Drafts must not write to platform `organizations` until provisioning handoff is complete |
| Field-agent task and assignment management | CRM / field tool operational concern |
| WhatsApp / messaging provider orchestration | External communications layer |
| Commission approval / payment disbursement | Finance operations; platform must not hold funds |

### 10.3 What Field Tools Own — Not Platform

| Capability | Reason |
| --- | --- |
| Local sync state for offline field operations | Device-side concern |
| Supplier scan history on field agent's device | Local device audit trail |
| QR card generation and print batching | Field tool production concern |
| WhatsApp thread capture and normalization | Messaging provider integration |
| Pre-submission supplier data capture on mobile | Field tool capture; platform receives normalized provisioning handoff only |
| Field-agent authentication and session | Separate auth context from platform tenant auth |

### 10.4 Contact Data Non-Ownership (Constitutional)

The platform schema (`organizations` model) has no `contact_phone`, `contact_email`, `website`, or `linkedin` fields. This is intentional and constitutional. The platform **must not** add raw personal contact data fields to the `organizations` public-safe projection, under any acquisition integration scenario. Contact reveal is not authorized for any public API surface.

---

## 11. Security and Data Governance Constraints

The following constraints are not optional and apply to every implementation unit in both streams:

### 11.1 Tenant Isolation

- All tenant-scoped data operations must include `org_id` scoping. This is non-negotiable.
- No cross-tenant queries are permitted outside the control-plane context.
- RLS is a constitutional constraint. No service-role queries may bypass RLS without explicit documented approval.

### 11.2 Public-Surface Data Governance

- Gate E (payload field allowlist) is unconditional. No prohibited field may appear in any public API response under any circumstance.
- `external_orchestration_ref` is explicitly Gate E prohibited — it must never appear in public response payloads.
- No org UUIDs, `risk_score`, `plan`, `registration_no`, or contact fields may appear in public payloads.
- Inquiry payloads must not include raw contact data (no email, no phone as required fields).

### 11.3 Rate Limiting

- All unauthenticated write endpoints (inquiry) must have a rate-limit budget defined before build.
- GAP-ACQ-006 is a build-time blocker for INQUIRY-004.

### 11.4 OpenAPI Obligation

- Every new route must have a corresponding OpenAPI contract entry authored in the same implementation wave.
- Deferred OpenAPI cleanup is not permitted per `shared/contracts/ARCHITECTURE-GOVERNANCE.md`.

### 11.5 Event Safety

- Acquisition event names must be registered by Team A authority before any code emits them.
- No `orgId`, buyer identity, or prohibited fields may appear in event payloads.
- All events are append-only and must not reveal operational state or contact data.

---

## 12. DPP Passport Network — Adjacent Posture Note

Per `governance/control/NEXT-ACTION.md` (2026-07-06):

| Surface | Status |
| --- | --- |
| DPP Passport Network | `PRODUCTION_READY` — `HOLD_FOR_PARESH_DECISION` |

The DPP Passport Network is production-ready but held pending Paresh's decision. This is not a blocker for the acquisition stream — the two streams are independent. The acquisition stream's universal gate condition is TTP counsel feedback, not DPP decision. However, Paresh may choose to sequence the DPP decision alongside or before the acquisition stream opening. No assumption is made here.

---

## 13. Stale Artifact Corrections

The following records in referenced artifacts are stale as of 2026-07-06. They are not amended in this artifact — the canonical records are listed in the governance decision files. This section exists to prevent re-reading stale entries as current truth.

### 13.1 Merged Tracker (2026-05-12) — Stale Entries

| Stale Entry | Stale Value | Correct Value | Authority |
| --- | --- | --- | --- |
| Layer 0 posture (§1.1) | `NONE_AUTHORIZED` | `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` | `NEXT-ACTION.md` (2026-07-06) |
| Unit I (`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`) status | "OPEN — separate stream" | **CLOSED** (complete) | `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE` (2026-04-06) |
| GAP-ACQ-003 status | OPEN | SUPERSEDED — unit completed and closed | `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE` (2026-04-06) |
| TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 label | `adjacent_deferred_candidate` | **CLOSED** — VERIFIED_COMPLETE | commit `8b56962`; `TECS-LAUNCH-GRADE-RUNTIME-DATA-QA-AUDIT-001-REPORT.md` |
| ROUTE-001 readiness verdict | READY_TO_OPEN (after Layer 0 auth) | BLOCKED_PENDING_LAYER0_AUTHORIZATION (TTP counsel gate) | `NEXT-ACTION.md` (2026-07-06) |

### 13.2 AGGREGATOR-LAYER-REPO-TRUTH-AUDIT-v1.md (2026-06-08) — Stale Entries

| Stale Entry | Stale Value | Correct Value | Authority |
| --- | --- | --- | --- |
| §3.10 unit status | "Active governed unit: `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` (OPEN)" | **CLOSED** (complete since 2026-04-06) | `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE` (2026-04-06) |
| §3.10 test status note | "Current status: FAILING" | The unit is CLOSED. The runtime defect was remediated in commit `cecc339`. The test file remains as a permanent quality gate; the governance unit is closed. | `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE` (2026-04-06) |

The audit's stale entries were authored either without reference to the close decision or before the close was recorded in the audit's scope. The governance decision (DECIDED, Paresh) is the authoritative record.

### 13.3 MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md (2026-05-12) — Stale Entries

| Stale Entry | Stale Value | Correct Value | Authority |
| --- | --- | --- | --- |
| §2.8 GAP-ACQ-003 status | OPEN | SUPERSEDED | `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE` (2026-04-06) |

---

## 14. Artifact Constraints and Limits

### 14.1 What This Artifact Does Not Do

This artifact does NOT:

- Open any implementation unit
- Modify `governance/control/OPEN-SET.md`, `NEXT-ACTION.md`, `BLOCKED.md`, or `SNAPSHOT.md`
- Add event names to `shared/contracts/event-names.md` or `server/src/lib/events.ts`
- Add routes to `server/src/routes/public.ts` or any other server file
- Add AppState values to `App.tsx`
- Modify `server/prisma/schema.prisma`
- Resolve GAP-ACQ-001 through GAP-ACQ-007 (records gaps only)
- Grant Team A event naming authority
- Authorize the opening of TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 (already CLOSED)
- Amend any CRM or CAE artifact (those are external)
- Imply that Layer 0 authorization has been granted

### 14.2 What Must Happen Before Any Unit Opens

1. External legal counsel provides written feedback on `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md`
2. Feedback is recorded in `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001`
3. Paresh issues explicit written authorization
4. A fresh per-unit bounded implementation prompt is written, naming the exact allowlist of files and approved commands
5. The unit prompt is executed by a fresh agent session under full Safe-Write governance

### 14.3 Who May Authorize Opening

Only Paresh may authorize the opening of any implementation unit. No agent, automated system, or implicit signal substitutes for explicit written authorization from Paresh. This applies to every unit in both streams, regardless of readiness posture.

---

*Artifact ID: `MAIN-PLATFORM-ACQUISITION-AND-AGGREGATOR-STREAM-REPO-TRUTH-REFRESH-AND-OPENING-001`*  
*Planning-only. No implementation. No runtime changes. Docs-only commit.*  
*2026-07-06 — TexQtic governance corpus, main branch.*
