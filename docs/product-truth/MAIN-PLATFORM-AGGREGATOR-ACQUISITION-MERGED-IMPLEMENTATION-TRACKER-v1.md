# MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-v1.md

**Unit ID:** MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-001  
**Type:** Merged planning / implementation tracker — docs-only  
**Date:** 2026-05-12  
**Mode:** Planning and boundary authority only. No implementation authorized. No schema mutation. No migrations. No runtime changes.  
**Status:** PLANNING ARTIFACT ONLY — NO IMPLEMENTATION  
**Authorized by:** Paresh  
**Basis:** Six primary input artifacts + Layer 0 posture + 15 repo source files reviewed (listed in §2).  
**Commit:** docs(platform): merge acquisition and aggregator implementation tracker

---

## 1. Purpose

This artifact is the **merged Main Platform + Aggregator implementation tracker** for TexQtic Customer
Acquisition Engine readiness. It reconciles the Main Platform acquisition unit sequence, the Aggregator
layer repo-truth audit, and the Aggregator Directory acquisition integration design into one integrated
Main Platform-side execution roadmap.

### 1.1 What This Artifact Does

- Consolidates the 8-unit Main Platform acquisition tracker with Aggregator boundary notes on each unit
- Records the authoritative ownership matrix across Main Platform, Aggregator, CRM, and Acquisition Engine
- Provides per-unit detail blocks for all 8 Main Platform acquisition units plus the Aggregator
  remediation stream
- Establishes the critical path and dependency graph for acquisition-stream implementation
- Identifies all current blockers and gaps that must be resolved before each unit may open
- States what the Customer Acquisition Engine / App may rely on after each unit closes
- Records explicit duplicate-prevention rules to prevent future scope creep

### 1.2 What This Artifact Does Not Do

This artifact does NOT:
- Authorize the opening of any implementation unit
- Mutate any schema, route, service, event registry, OpenAPI contract, or governance control file
- Create any frontend components, AppState values, or test fixtures
- Resolve any blocked gap (GAP-ACQ-001 through GAP-ACQ-006 remain open)
- Change the Layer 0 `active_delivery_unit: NONE_AUTHORIZED` posture
- Open `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001`
- Authorize the Aggregator remediation unit (`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`)

The Customer Acquisition Engine / App implementation plan (`CUSTOMER-ACQUISITION-ENGINE-IMPLEMENTATION-PLAN-001`)
must wait until this merged tracker is committed. This merged tracker is the design gate.

---

## 2. Source Artifacts and Files Reviewed

### 2.1 Primary Input Artifacts

| Artifact | Role |
| --- | --- |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` | **Primary input.** 8-unit Main Platform acquisition tracker with per-unit detail, gap register, readiness states, and critical path |
| `docs/product-truth/AGGREGATOR-LAYER-REPO-TRUTH-AUDIT-v1.md` | **Primary input.** Full repo-truth inventory of Aggregator layer; integration test defect; overlap analysis with acquisition units |
| `docs/product-truth/AGGREGATOR-DIRECTORY-ACQUISITION-INTEGRATION-DESIGN-v1.md` | **Primary input.** 6 executive design decisions; ownership boundary; public profile relationship; merged tracker structural instructions |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | Platform ownership boundary; five-gate architecture; required events; non-ownership rules; 6 gaps |
| `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Cross-system 11-object canonical chain; CRM vs. Platform ownership vocabulary |
| `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Entity/lifecycle/join-key inventory; dual `external_orchestration_ref` gap; missing cross-system bridges |

### 2.2 Governance Decisions Consulted

| Artifact | Role |
| --- | --- |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` | DECIDED — B2B public discovery object classes; payload allowlist; inquiry model authority |
| `governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` | DECIDED — Two-tier visibility model; publication posture vocabulary; Aggregator eligibility note |
| `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION.md` | count=0 defect classification as bounded runtime defect; GAP-ACQ-003 non-blocking ruling |
| `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | OpenAPI obligation; atomic change envelope; plane separation doctrine |
| `shared/contracts/event-names.md` | Event domain registration authority (Team A) |

### 2.3 Layer 0 Control Files

| File | Verified Posture |
| --- | --- |
| `governance/control/OPEN-SET.md` | Last updated 2026-06-07; `active_delivery_unit: NONE_AUTHORIZED` |
| `governance/control/NEXT-ACTION.md` | `mode: OPENING_LAYER_CANON_POINTER`; `product_delivery_priority: LAUNCH_GATE_CLOSED`; `adjacent_deferred_candidate: TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` (requires explicit Paresh authorization; do not auto-open) |
| `governance/control/BLOCKED.md` | All prior NC runtime blockers RESOLVED; WL Co `REVIEW-UNKNOWN` remains; no new acquisition-stream blockers |

### 2.4 Repo Source Files Reviewed (Current State Verified)

| File | Verification Result |
| --- | --- |
| `server/src/routes/public.ts` | `GET /api/public/supplier/:slug` ABSENT; no inquiry route; no provisioning webhook |
| `server/src/routes/tenant.ts` | `GET /api/tenant/aggregator/discovery` LIVE (lines 1948–2006) |
| `server/src/services/publicB2BProjection.service.ts` | Five-gate architecture LIVE; `getPublicB2BSupplierBySlug()` ABSENT |
| `server/src/services/counterpartyProfileAggregation.service.ts` | LIVE; authenticated-only; orgId in output; Gates A/B absent — MUST NOT be re-exposed publicly |
| `components/Public/B2BDiscovery.tsx` | LIVE; no individual supplier click-through; no inquiry surface |
| `components/Tenant/AggregatorDiscoveryWorkspace.tsx` | LIVE; read-only; no contact; no drill-down; no shortlist/comparison/inquiry |
| `services/publicB2BService.ts` | LIVE; calls `GET /api/public/b2b/suppliers`; no profile service |
| `services/aggregatorDiscoveryService.ts` | LIVE; authenticated tenant GET; no public route; no profile drill-down |
| `App.tsx` | `PUBLIC_B2B_DISCOVERY` exists (line 1953); `PUBLIC_SUPPLIER_PROFILE` ABSENT; `PUBLIC_REFERRAL_LANDING` ABSENT |
| `server/src/lib/events.ts` | No `supplier_profile.*`, `buyer_inquiry.*`, or `public_supplier_profile.*` events in `KnownEventName` |
| `shared/contracts/event-names.md` | Acquisition event names ABSENT; Team A authority required for new names |
| `shared/contracts/openapi.tenant.json` | `GET /api/tenant/aggregator/discovery` present; `GET /api/public/supplier/{slug}` ABSENT |
| `shared/contracts/openapi.control-plane.json` | No acquisition integration paths present |
| `server/prisma/schema.prisma` | `organizations.slug` `@unique`; entitlement posture fields exist; no `contact_phone`, `contact_email`, no `inquiry`/`referral`/`shortlist`/`collection`/`comparison` models |

---

## 3. Executive Merged Decision

The following decisions are established by this artifact as merged design authority. They carry forward
all decisions from the primary input artifacts and resolve any ambiguity about stream ownership and sequencing.

### 3.1 Public Supplier Profile Is Main Platform-Owned

`GET /api/public/supplier/:slug` is a **general Main Platform unauthenticated surface**. It is NOT
owned by, scoped to, or governed by the Aggregator Directory. These are architecturally separate:

| Dimension | Aggregator Discovery | Public Supplier Profile |
| --- | --- | --- |
| Auth | Tenant JWT (AGGREGATOR/INTERNAL only) | Unauthenticated (public) |
| Audience | Platform aggregator tenants | Buyers / public web |
| Gate model | `org_type` check on requester | Five-gate publication posture on supplier |
| Ownership | Aggregator layer | Main Platform |

### 3.2 Aggregator Is Not a Blocker for ROUTE-001

The Aggregator integration test failure (`count=0`) was classified in GAP-ACQ-003 as a bounded
runtime defect that does **not block** the public unauthenticated profile route. ROUTE-001 requires
no aggregator remediation as a prerequisite.

### 3.3 ROUTE-001 Remains First Acquisition Stream Unit

`MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` has no hard prerequisites:
- `organizations.slug` is `@unique` in schema — no migration needed
- Five-gate architecture in `publicB2BProjection.service.ts` is reusable
- `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` (DECIDED) provides payload authority
- No schema change required

**Status: READY_TO_OPEN** once Layer 0 authorizes the acquisition stream.

### 3.4 Aggregator Remediation Remains a Separate Stream

`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` is a separate, independently-authorized remediation
unit. It must not be merged with any acquisition stream unit. It is not a prerequisite for ROUTE-001.

### 3.5 No Duplicate Supplier Profile Routes or Payload Models

There must be exactly one `GET /api/public/supplier/:slug` route on the Main Platform. The Aggregator
workspace must not add a parallel equivalent. The five-gate public-safe payload shape is canonical.
Aggregator-specific enrichment (e.g., `visibilityIndicators`, authenticated org-UUID context) is an
additive authenticated extension only.

### 3.6 Customer Acquisition Engine / App Plan Must Wait for This Tracker

The future `CUSTOMER-ACQUISITION-ENGINE-IMPLEMENTATION-PLAN-001` artifact must be authored **after**
this merged tracker is committed. This merged tracker establishes the platform-side execution roadmap
that the CA Engine plan depends on.

---

## 4. Current Repo-Truth Baseline

As of 2026-05-12 (HEAD `28d41f2`), the following is confirmed true in the production codebase:

| Surface | Status | Notes |
| --- | --- | --- |
| `GET /api/public/b2b/suppliers` — public B2B supplier list | **LIVE** | Five-gate projection; paginated; unauthenticated |
| Five-gate projection model (`publicB2BProjection.service.ts`) | **LIVE** | Gates A–E enforced; correct foundation for ROUTE-001 |
| `PUBLIC_B2B_DISCOVERY` AppState | **LIVE** | `App.tsx` line 1953; routes to `B2BDiscovery.tsx` |
| `GET /api/public/supplier/:slug` — individual supplier profile route | **ABSENT** | Not in `public.ts`; not in any OpenAPI contract |
| `PUBLIC_SUPPLIER_PROFILE` AppState | **ABSENT** | Not in `App.tsx` AppState union |
| `PublicSupplierProfile.tsx` component | **ABSENT** | Not in `components/Public/` |
| `getPublicB2BSupplierBySlug()` function | **ABSENT** | Not in `publicB2BProjection.service.ts` |
| QR source tracking (`?source=` param) | **ABSENT** | No param; no attribution on profile route |
| Acquisition events (`supplier_profile.*`, `buyer_inquiry.*`, `public_supplier_profile.*`) | **ABSENT** | Zero acquisition event names in `KnownEventName` or `event-names.md` |
| `POST /api/public/inquiry/submit` — buyer inquiry intake | **ABSENT** | No route; no service; no schema model |
| `/join/:referral_code` — referral join landing | **ABSENT** | No AppState; no component; no route |
| `POST /api/internal/acquisition/provision-supplier` — provisioning webhook | **ABSENT** | No route; no service |
| `GET /api/tenant/aggregator/discovery` — authenticated Aggregator discovery route | **LIVE** | Tenant JWT; AGGREGATOR/INTERNAL gated; read-only |
| `AggregatorDiscoveryWorkspace.tsx` — Aggregator workspace component | **LIVE** | Read-only; no contact; no drill-down; no shortlist/comparison/inquiry |
| Aggregator integration test `aggregator-discovery-read.integration.test.ts` | **FAILING** | `count=0`; classified as bounded runtime defect; not blocking ROUTE-001 |
| Collections / shortlist / comparison surfaces | **ABSENT — no schema** | No Prisma models; no routes; no components |
| Buyer intent / handoff models (`inquiry`, `referral`, `handoff`, `buyer_intent`) | **ABSENT — no schema** | No Prisma models for these entities |
| `contact_phone`, `contact_email` on `organizations` | **ABSENT** | Intentionally absent; Gate E prohibited; must not be added |
| `external_orchestration_ref` dual-column gap | **UNRESOLVED** | On both `Tenant` and `organizations` with `@unique`; GAP-ACQ-001 open |
| Layer 0 `active_delivery_unit` | **NONE_AUTHORIZED** | NEXT-ACTION.md (2026-06-07) |

---

## 5. Ownership Boundary Matrix

**Legend:** ✅ Owns / ❌ Does not own / ⚠️ Future/deferred only / — Not applicable

| Capability | Main Platform | Aggregator | CRM | Acquisition Engine | Notes / Guardrails |
| --- | --- | --- | --- | --- | --- |
| Public supplier profile (`GET /api/public/supplier/:slug`) | ✅ ROUTE-001 | ❌ | ❌ | — consumer after ROUTE-001 | One route only; five-gate projection; no orgId in response |
| Public supplier list (`GET /api/public/b2b/suppliers`) | ✅ LIVE | ❌ | ❌ | — consumer | Already live; Aggregator must not add a parallel equivalent |
| Authenticated Aggregator discovery (`GET /api/tenant/aggregator/discovery`) | ❌ | ✅ LIVE (defect present) | ❌ | — | Authenticated; AGGREGATOR/INTERNAL gated; read-only; separate stream |
| QR scan destination (supplier profile URL) | ✅ ROUTE-001 | ❌ | ❌ | — reads result | Resolves via `/supplier/:slug`; not via Aggregator workspace |
| QR card generation and print batch production | ❌ | ❌ | ❌ | ✅ Field Tool | Device concern; platform receives only normalized provisioning handoff |
| Acquisition draft records (pre-approval pipeline) | ❌ | ❌ | ✅ | ✅ Acquisition Engine | Drafts must not land in `organizations` until provisioning handoff completes |
| Field-agent offline sync and device-side capture | ❌ | ❌ | ❌ | ✅ Field Tool | Device concern only |
| CRM review / approval / duplicate resolution | ❌ | ❌ | ✅ | — | CRM owns onboarding case lifecycle and approval posture |
| Provisioning webhook (`POST /api/internal/acquisition/provision-supplier`) | ✅ WEBHOOK-007 | ❌ | — triggers it | — | Internal-realm; idempotent; CRM handoff only; requires ORF-AUTHORITY-006 first |
| Buyer inquiry intake (`POST /api/public/inquiry/submit`) | ✅ INQUIRY-004 | ❌ | — receives routed inquiries | — | Public pre-auth; rate-limited; must not appear in Aggregator workspace |
| Referral join landing (`/join/:referral_code`) | ✅ REFERRAL-005 | ❌ | — code generation | — | Frontend-only passthrough; no server write on page load |
| Referral code generation and commission ledger | ❌ | ❌ | ✅ | — | CRM owns attribution; platform only consumes code as passthrough |
| WhatsApp orchestration | ❌ | ❌ | ✅ | ✅ Field Tool | External communications layer; never a platform or Aggregator concern |
| Weekly digest dispatch | ❌ | ❌ | ✅ | — | CRM / marketing notification layer |
| Contact data reveal (`contact_phone`, `contact_email`) | ❌ **PROHIBITED** | ❌ **PROHIBITED** | ✅ (internal CRM only) | ❌ **PROHIBITED** | Gate E; fields absent from schema by design; must never be added to public output |
| Collections / shortlist surfaces | ❌ (not yet) | ⚠️ deferred | ❌ | — | No schema foundation; separate design + migration required |
| Comparison surface | ❌ (not yet) | ⚠️ deferred | ❌ | — | No schema foundation; separate design + migration required |
| AI-assisted supplier matching | ❌ | ⚠️ deferred | ❌ | — | `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001`; requires explicit Paresh authorization; do not auto-open |
| Commissions / payout | ❌ **PROHIBITED** | ❌ **PROHIBITED** | ✅ | — | Platform must not imply money movement or hold funds |
| RFQ / pricing / negotiation / order / payment / fulfillment | ❌ (authenticated B2B downstream) | ❌ | ❌ | — | Authenticated downstream continuity; not a public or Aggregator surface in acquisition stream |

---

## 6. Merged Implementation Tracker Table

Starting from the 8 Main Platform acquisition units with Aggregator boundary notes added.

| ID | Unit Name | Status | Hard Prerequisites | Aggregator Relationship | Main Platform Owner |
| --- | --- | --- | --- | --- | --- |
| **A / ROUTE-001** | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` | **READY_TO_OPEN** after Layer 0 authorization | None | Pattern source / future consumer only | Main Platform |
| **B / QR-SOURCE-002** | `MAIN-PLATFORM-SUPPLIER-PROFILE-QR-SOURCE-002` | NOT_READY | ROUTE-001 | None | Main Platform |
| **C / EVENTS-003** | `MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003` | BLOCKED | GAP-ACQ-002 (event name authority) | None — separate Aggregator discovery events are future, not part of this unit | Main Platform event registry |
| **D / INQUIRY-004** | `MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004` | BLOCKED | ROUTE-001; GAP-ACQ-005; GAP-ACQ-006 | None — inquiry must not appear in Aggregator workspace | Main Platform |
| **E / REFERRAL-005** | `MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005` | NOT_READY | ROUTE-001 recommended | None | Main Platform |
| **F / ORF-AUTHORITY-006** | `MAIN-PLATFORM-ORCHESTRATION-REF-AUTHORITY-006` | REQUIRED_BEFORE_WEBHOOK | GAP-ACQ-001 governance artifact | Indirect only — `external_orchestration_ref` exists on `organizations` table that Aggregator queries but never selects; does not block Aggregator discovery | Main Platform governance |
| **G / WEBHOOK-007** | `MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007` | BLOCKED | ORF-AUTHORITY-006 | Future consumer after provisioning — not an owner | Main Platform |
| **H / PROVISIONED-EVENTS-008** | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-PROVISIONED-EVENTS-008` | BLOCKED | WEBHOOK-007; GAP-ACQ-005 | May subscribe later — does not emit | Main Platform |
| **I** | `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` | OPEN — **separate stream** | Layer 0 authorization (separate) | Aggregator owns this unit | Aggregator |

---

## 7. Per-Unit Detail Blocks

---

### Unit A — ROUTE-001: MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001

**Objective:**
Build `GET /api/public/supplier/:slug` (backend) and a new `PUBLIC_SUPPLIER_PROFILE` app state
(frontend) with route pattern `/supplier/:slug` in `App.tsx`.

**Status:** READY_TO_OPEN — requires Layer 0 authorization of the acquisition stream.

**Ownership:** Main Platform.

**Aggregator Relationship:** `counterpartyProfileAggregation.service.ts` is a **pattern source only** —
the data assembly join pattern (certifications + traceability + taxonomy) may be referenced. The
Aggregator service must NOT be re-exposed or re-routed as the public handler. After this route is
live, the Aggregator Directory may link to it from authenticated discovery cards (future consumer role).

**Files to Change:**

| File | Change |
| --- | --- |
| `server/src/routes/public.ts` | ADD `GET /supplier/:slug` handler |
| `server/src/services/publicB2BProjection.service.ts` | ADD `getPublicB2BSupplierBySlug(slug, prisma)` — new function applying all five gates |
| `App.tsx` | ADD `'PUBLIC_SUPPLIER_PROFILE'` to `AppState` union; ADD URL detection in `resolveInitialAppState`; ADD `case 'PUBLIC_SUPPLIER_PROFILE':` to render switch |
| `shared/contracts/openapi.tenant.json` | ADD `GET /api/public/supplier/{slug}` path — **same wave** per `ARCHITECTURE-GOVERNANCE.md` |
| `components/Public/PublicSupplierProfile.tsx` | ADD new component (display only; no contact reveal; no inquiry form — inquiry is INQUIRY-004) |

**Required Payload Shape (Gate E compliant):**
Compose: `SUPPLIER_DISCOVERY_PROFILE` + `SUPPLIER_CAPABILITY_PROFILE` + `TRUST_QUALIFICATION_PREVIEW`
+ `BOUNDED_OFFERING_PREVIEW` per `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §2.

Allowed: `slug`, `legal_name`, `org_type`, `jurisdiction`, `certificationCount` (approved only),
`certificationTypes` (max 10), `hasTraceabilityEvidence` (SHARED visibility only), taxonomy
(`primarySegment`, `secondarySegments`, `rolePositions`), `offeringPreview` (name, moq, imageUrl
— NO price, max 5 items).

Prohibited unconditionally: `orgId`, `external_orchestration_ref`, contact data, price,
`registration_no`, `risk_score`, `plan`, negotiation state, order/trade state, draft data.

**Gate Failure Behaviour:** Any gate A–D failure → `404` (NOT 403). Do not confirm existence of
non-public suppliers.

**Required OpenAPI Update:** `GET /api/public/supplier/{slug}` in `openapi.tenant.json`. Same wave.

**Required Tests:**
- slug found, all gates pass → 200 with discovery-safe payload
- slug not found → 404
- Gate A fails (`publicEligibilityPosture ≠ 'PUBLICATION_ELIGIBLE'`) → 404
- Gate B fails (`publication_posture ∉ {B2B_PUBLIC, BOTH}`) → 404
- Gate D fails (`status ∉ {ACTIVE, VERIFICATION_APPROVED}`) → 404
- Payload never contains Gate E prohibited fields
- `/supplier/:slug` URL resolves to `PUBLIC_SUPPLIER_PROFILE` AppState

**Validation Commands:**
```
pnpm --filter server typecheck
pnpm --filter server lint
pnpm -C server exec vitest run src/routes/public.test.ts --reporter=verbose
```

**Guardrails:**
- No contact data in response
- No `orgId` in response
- No `external_orchestration_ref` in response
- Gate failure = 404 not 403
- No inquiry form in this unit (inquiry is INQUIRY-004)
- No QR source tracking in this unit (QR source is QR-SOURCE-002)
- `counterpartyProfileAggregation.service.ts` must not be used as the public handler

**Completion Criteria:** Route live; all required tests pass; `tsc --noEmit` PASS; OpenAPI updated.

**Proposed Atomic Commit Message:**
```
feat(public): add GET /api/public/supplier/:slug profile route (ROUTE-001)
```

---

### Unit B — QR-SOURCE-002: MAIN-PLATFORM-SUPPLIER-PROFILE-QR-SOURCE-002

**Objective:**
Add optional `?source=` query parameter to `GET /api/public/supplier/:slug` for QR card, referral,
and event attribution.

**Status:** NOT_READY — requires ROUTE-001 to be live.

**Ownership:** Main Platform.

**Aggregator Relationship:** None. QR source tracking is a Main Platform attribution concern.
Aggregator does not generate QR cards or receive scan events.

**Files to Change:**

| File | Change |
| --- | --- |
| `server/src/routes/public.ts` | Extend `/supplier/:slug` handler to accept and validate `source` enum param |
| `shared/contracts/openapi.tenant.json` | Update `/api/public/supplier/{slug}` spec to document `source` query param |

**Source Enum Values (strict):** `qr`, `referral`, `event`, `direct`. Non-presence = organic/web.

**Constraints:**
- `source` param is optional; non-presence is valid
- Must be strictly enumerated; reject unknown values
- Must never create a buyer identity or pre-auth session
- Attaches to `supplier_profile.viewed.v1` event (structural log acceptable before EVENTS-003 wired)

**Guardrails:**
- Parameter is optional; non-presence is valid
- Never used as an auth or session token
- Never used to identify the viewer

**Completion Criteria:** Param wired; ROUTE-001 tests still pass; OpenAPI updated; `tsc` PASS.

**Proposed Atomic Commit Message:**
```
feat(public): add optional source enum param to supplier profile route (QR-SOURCE-002)
```

---

### Unit C — EVENTS-003: MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003

**Objective:**
Register all 5 required acquisition event names in both `server/src/lib/events.ts`
(`KnownEventName` union) and `shared/contracts/event-names.md`.

**Status:** BLOCKED — requires GAP-ACQ-002 Team A authority sign-off.

**Ownership:** Main Platform event registry.

**Aggregator Relationship:** None for this unit. The `supplier_profile.*` events are Main Platform
only. Future Aggregator discovery events (e.g., `aggregator.discovery.viewed.v1`) are a separate
future registration and must NOT be bundled into EVENTS-003.

**Events to Register:**

| Event Name | Domain | Trigger |
| --- | --- | --- |
| `supplier_profile.viewed.v1` | `supplier_profile` | Unauthenticated `GET /api/public/supplier/:slug` |
| `buyer_inquiry.created.v1` | `buyer_inquiry` | Buyer submits pre-auth inquiry |
| `public_supplier_profile.provision_requested.v1` | `public_supplier_profile` | Provisioning handoff received |
| `public_supplier_profile.provisioned.v1` | `public_supplier_profile` | Profile goes live |
| `public_supplier_profile.gate_failed.v1` | `public_supplier_profile` | One or more provisioning gates failed |

**Files to Change:**

| File | Change |
| --- | --- |
| `shared/contracts/event-names.md` | ADD all 5 event names with domain, trigger, and payload notes |
| `server/src/lib/events.ts` | ADD all 5 to `KnownEventName` union |

**Event Payload Rules:**
- `supplier_profile.viewed.v1`: `slug`, `source_channel` enum, optional `viewer_geo_band`, `timestamp` — NO `orgId`, NO buyer identity
- `buyer_inquiry.created.v1`: `supplier_slug`, `inquiry_category`, `geo_band`, `volume_band` — NO raw contact data, NO email, NO phone
- `public_supplier_profile.provision_requested.v1`: `external_orchestration_ref`, `org_type`, `segment` — NO price, NO personal data
- `public_supplier_profile.provisioned.v1`: `slug`, `external_orchestration_ref`, `publication_posture`
- `public_supplier_profile.gate_failed.v1`: `external_orchestration_ref`, `failed_gate` enum, reason code — NO raw payload

**Guardrails:**
- Team A authority required for event name sign-off per `event-names.md` rule
- Naming: domain-prefixed, snake_case, versioned `.v1`
- No PII in any event payload
- Do not register Aggregator discovery events in this unit

**Completion Criteria:** All 5 event names in both files; TypeScript union compiles; `tsc` PASS.

**Proposed Atomic Commit Message:**
```
docs(events): register supplier_profile, buyer_inquiry, public_supplier_profile events (EVENTS-003)
```

---

### Unit D — INQUIRY-004: MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004

**Objective:**
Build `POST /api/public/inquiry/submit` — the platform's public-triggered, non-binding pre-auth
inquiry intake per `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §4.

**Status:** BLOCKED — requires ROUTE-001 live; GAP-ACQ-005 and GAP-ACQ-006 resolved.

**Ownership:** Main Platform.

**Aggregator Relationship:** None. Buyer inquiry is a public pre-auth intake surface. Aggregator
is an authenticated post-auth discovery surface. An inquiry surface must NEVER appear inside the
Aggregator workspace.

**Files to Change:**

| File | Change |
| --- | --- |
| `server/src/routes/public.ts` | ADD `POST /inquiry/submit` with rate-limit plugin |
| `server/src/services/publicInquiry.service.ts` | ADD new service for intake normalization |
| `shared/contracts/openapi.tenant.json` | ADD `POST /api/public/inquiry/submit` — same wave |

**Required Request Payload:**
- `supplier_slug` (string, required)
- `inquiry_category` (enum, required)
- `geo_band` (optional string)
- `volume_band` (optional string)

**Prohibited Request Fields:** raw email, phone number, buyer name as required fields.

**Rate Limit:** Per-IP — minimum 100 req / 15 min / IP. Exact budget confirmed by GAP-ACQ-006
before this unit opens.

**Response Constraint:** Must not create a public messaging thread or supplier-owned continuity.
Platform normalizes intake; CRM owns follow-up routing.

**Event Emission:** Emit `buyer_inquiry.created.v1` (requires EVENTS-003 live).

**Guardrails:**
- No raw contact data stored or returned
- No public thread ownership created
- Rate limited before handler executes
- Emit `buyer_inquiry.created.v1` only
- No authentication created for the submitter

**Completion Criteria:** Route live; rate limit wired; `buyer_inquiry.created.v1` emitted; `tsc` PASS.

**Proposed Atomic Commit Message:**
```
feat(public): add POST /api/public/inquiry/submit pre-auth intake (INQUIRY-004)
```

---

### Unit E — REFERRAL-005: MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005

**Objective:**
Add `PUBLIC_REFERRAL_LANDING` AppState to `App.tsx` with route pattern `/join/:referral_code`
as a passthrough landing destination for field-agent QR cards handed to new prospects.

**Status:** NOT_READY — recommended after ROUTE-001 for sequencing; technically independent.

**Ownership:** Main Platform.

**Aggregator Relationship:** None. Referral join landing is a public frontend-only surface for
pre-auth prospects. Aggregator is an authenticated workspace for tenant users. Referral code
generation and commission belong to CRM, not Aggregator.

**Files to Change:**

| File | Change |
| --- | --- |
| `App.tsx` | ADD `'PUBLIC_REFERRAL_LANDING'` to `AppState` union; ADD `/join/:referral_code` URL pattern detection; ADD `case 'PUBLIC_REFERRAL_LANDING':` to render switch |
| `components/Public/PublicReferralLanding.tsx` | ADD component — explains platform; links to application form with `referral_code` passthrough |

**Behaviour Constraints:**
- Accept `referral_code` path segment and pass through to downstream application form
- Emit no server-side event that creates a platform record from a page view
- Never use `referral_code` as a pre-auth identity token
- No backend route required (frontend-only)

**Guardrails:**
- No server call on page load that writes any record
- `referral_code` treated as a passthrough display token only
- Rate-limit risk assessed before opening (public landing; potential abuse vector)
- CRM owns code generation, commission, field-agent assignment

**Completion Criteria:** `/join/:referral_code` resolves to `PUBLIC_REFERRAL_LANDING`; no server write on load; `tsc` PASS.

**Proposed Atomic Commit Message:**
```
feat(frontend): add PUBLIC_REFERRAL_LANDING state /join/:referral_code (REFERRAL-005)
```

---

### Unit F — ORF-AUTHORITY-006: MAIN-PLATFORM-ORCHESTRATION-REF-AUTHORITY-006

**Objective:**
Resolve GAP-ACQ-001: name the canonical CRM↔Platform lookup column for `external_orchestration_ref`
and document the disposition of the other. This is a **governance documentation unit only** — no
schema change, no migration, no code.

**Status:** REQUIRED_BEFORE_PROVISIONING_WEBHOOK — may progress in parallel with ROUTE-001 through REFERRAL-005.

**Ownership:** Main Platform governance / platform integration.

**Aggregator Relationship:** Indirect governance concern only. `organizations.external_orchestration_ref`
exists in the `organizations` table that the Aggregator service queries but never selects in its output.
This gap does not block Aggregator discovery. Resolution is required for the webhook stream only.

**Problem Statement (repo truth):**
Both `Tenant.externalOrchestrationRef` (schema line 21, `@unique`) and
`organizations.external_orchestration_ref` (schema line 1073, `@unique`) carry the same semantic
intent. No governance document names which is the canonical CRM join key. If CRM writes to one
and the platform reads from the other, the idempotency guard on WEBHOOK-007 will fail silently.

**Required Output:**

Governance decision artifact (`governance/decisions/TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1.md`) that:
1. Names `organizations.external_orchestration_ref` as canonical (or the reverse — Paresh decision)
2. Documents the purpose of the other column (historical artefact / tenant-level only / to retire)
3. States CRM must write only to the canonical column
4. States WEBHOOK-007 reads only from the canonical column

**This Unit Does NOT:**
- Modify any schema column
- Create any migration
- Write any server code

**Completion Criteria:** Governance artifact committed; canonical column named; CRM guidance explicit.

**Proposed Artifact Commit Message:**
```
docs(governance): resolve external_orchestration_ref canonical column authority (ORF-AUTHORITY-006)
```

---

### Unit G — WEBHOOK-007: MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007

**Objective:**
Build `POST /api/internal/acquisition/provision-supplier` — the platform's side of the CRM→Platform
provisioning handoff seam documented as absent in `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md`.

**Status:** BLOCKED — requires ORF-AUTHORITY-006 (GAP-ACQ-001 resolved).

**Ownership:** Main Platform.

**Aggregator Relationship:** Future consumer after provisioning — not an owner. The webhook writes
provisioned supplier records to `organizations`; the Aggregator reads from `organizations` post-provisioning.
Aggregator has no role in the provisioning handoff chain.

**Files to Change:**

| File | Change |
| --- | --- |
| `server/src/routes/` | ADD new internal-realm route file (NOT in `public.ts` — belongs in `acquisition.ts` or `internal.ts`) |
| `server/src/services/acquisitionProvisioning.service.ts` | ADD new provisioning service |
| `server/src/plugins/` | Ensure internal-realm auth guard applies |
| `shared/contracts/openapi.control-plane.json` | ADD `POST /api/internal/acquisition/provision-supplier` — same wave |

**Auth Requirement:** Internal-realm only. Must not be accessible unauthenticated.

**Required Request Payload:**
- `external_orchestration_ref` (string, required — CRM onboarding case ID)
- `legal_name` (string, required)
- `org_type` (must be `'B2B'`, required)
- `jurisdiction` (string, required)
- `primary_segment_key` (string, required)
- `publication_posture_target` (enum: `'B2B_PUBLIC'` or `'BOTH'`, required)

**Behaviour:**
- Strictly idempotent: re-submitting same `external_orchestration_ref` is a no-op or returns existing record
- Set `publication_posture` and `publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` ONLY after all platform gates pass
- Write `external_orchestration_ref` to the canonical column (per ORF-AUTHORITY-006)
- Emit `public_supplier_profile.provisioned.v1` on success
- Emit `public_supplier_profile.gate_failed.v1` on gate failure
- Return `409 Conflict` if ref already exists and is fully provisioned

**Guardrails:**
- `external_orchestration_ref` is Gate E prohibited — never returned in any public API response
- No contact data accepted in this payload
- No CRM commercial state (approval score, commission) accepted
- Org UUID generated by the platform; CRM must not dictate platform UUIDs

**Completion Criteria:** Route live; idempotency proven; events emitted; OpenAPI updated; `tsc` PASS.

**Proposed Atomic Commit Message:**
```
feat(internal): add POST /api/internal/acquisition/provision-supplier (WEBHOOK-007)
```

---

### Unit H — PROVISIONED-EVENTS-008: MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-PROVISIONED-EVENTS-008

**Objective:**
Wire emission of `public_supplier_profile.provisioned.v1` and `public_supplier_profile.gate_failed.v1`
events into the provisioning webhook service.

**Status:** BLOCKED — requires WEBHOOK-007 live and GAP-ACQ-005 resolved (events registered).

**Ownership:** Main Platform.

**Aggregator Relationship:** Aggregator may subscribe to these events for discovery refresh (future
authenticated concern). Aggregator does NOT emit them.

**Files to Change:**

| File | Change |
| --- | --- |
| `server/src/services/acquisitionProvisioning.service.ts` | ADD event emission calls for `provisioned.v1` and `gate_failed.v1` |

**Note:** If EVENTS-003 has registered these events, this unit is mechanical wiring only. If
EVENTS-003 is not yet live, event registration must be included in the same wave.

**Completion Criteria:** Both events emitted correctly; `tsc` PASS; integration tests confirm emission.

**Proposed Atomic Commit Message:**
```
feat(events): wire provisioned + gate_failed events in provisioning service (PROVISIONED-EVENTS-008)
```

---

### Unit I — AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS (Separate Stream)

**Objective:**
Bounded, slice-local fix to `listCounterpartyDiscoveryEntries()` in
`counterpartyProfileAggregation.service.ts` to resolve the `count=0` integration test failure.
Both integration tests must pass after the fix.

**Status:** OPEN — requires Layer 0 authorization (separate from acquisition stream).

**Ownership:** Aggregator layer.

**Strict Separation Rules:**

| Rule | Rationale |
| --- | --- |
| Must NOT be merged with ROUTE-001 | Different problem domains: authenticated read-shaping defect vs. new unauthenticated route |
| Must NOT expand Aggregator scope | Fix bounded strictly to read path in `listCounterpartyDiscoveryEntries()`; no UI, route, schema, or event changes |
| Does NOT block ROUTE-001 | Confirmed via GAP-ACQ-003 classification |
| Must NOT touch `public.ts` or `publicB2BProjection.service.ts` | Defect is in authenticated tenant service path, not public projection path |
| May proceed independently once authorized | Separate Layer 0 authorization required |

**Likely Files:**

| File | Expected Change |
| --- | --- |
| `server/src/services/counterpartyProfileAggregation.service.ts` | Fix `listCounterpartyDiscoveryEntries()` query — resolve `count=0` read-shaping defect |

**Out of Scope:**
- Any UI addition to `AggregatorDiscoveryWorkspace.tsx`
- Any new auth pathway
- Any schema change
- Any public route creation
- Any change to `publicB2BProjection.service.ts`

**Validation Expectations:**
- Test 1 (AGGREGATOR tenant gets discovery entries): `count >= 1` — MUST PASS
- Test 2 (non-AGGREGATOR gets 403): MUST PASS

**Guardrails:**
- Strictly bounded to the query path
- No contact, price, or `orgId`-in-public-response concerns — this is authenticated-realm only
- No scope expansion permitted in this unit

**Proposed Commit Message:**
```
fix(aggregator): resolve listCounterpartyDiscoveryEntries count=0 defect (AGG-TRUTHFULNESS)
```

---

## 8. Critical Path and Parallelism

```
[Layer 0 acquisition stream authorization required before any unit opens]

Unit A: ROUTE-001  ────────────────────────────────────────────► LIVE public supplier profile URL
    │                                                                      │
    ├──► Unit B: QR-SOURCE-002 (after ROUTE-001)                          │
    │                                                                      │
    ├──► Unit D: INQUIRY-004 ◄──── (also requires GAP-ACQ-005, GAP-ACQ-006)
    │
    └──► Unit E: REFERRAL-005 (recommended after ROUTE-001; technically parallel-safe)

Unit C: EVENTS-003 ◄──────────── (requires GAP-ACQ-002 Team A sign-off; parallel-safe with ROUTE-001)
    │
    └──► Unlocks event emission in Units D, G, H

Unit F: ORF-AUTHORITY-006 ◄────── (governance doc; parallel-safe with ROUTE-001 through E)
    │
    └──► Unit G: WEBHOOK-007
                │
                └──► Unit H: PROVISIONED-EVENTS-008

[Unit I: AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS — separate stream; runs independently when authorized]
```

### 8.1 Dependency Summary

| Unit | Hard Prerequisites | Parallel-Safe With |
| --- | --- | --- |
| ROUTE-001 | None (Layer 0 authorization only) | ORF-AUTHORITY-006 |
| QR-SOURCE-002 | ROUTE-001 | REFERRAL-005 |
| EVENTS-003 | GAP-ACQ-002 resolved | ROUTE-001, ORF-AUTHORITY-006 |
| INQUIRY-004 | ROUTE-001; GAP-ACQ-005; GAP-ACQ-006 | REFERRAL-005, ORF-AUTHORITY-006 |
| REFERRAL-005 | None (ROUTE-001 recommended for UX) | INQUIRY-004, ORF-AUTHORITY-006 |
| ORF-AUTHORITY-006 | GAP-ACQ-001 governance artifact | ROUTE-001 through REFERRAL-005 |
| WEBHOOK-007 | ORF-AUTHORITY-006 | — |
| PROVISIONED-EVENTS-008 | WEBHOOK-007; GAP-ACQ-005 | — |
| AGGREGATOR-TRUTHFULNESS | Separate Layer 0 auth | All of the above |

### 8.2 Recommended Sequencing Order

```
1. [Docs-only, parallel]  ORF-AUTHORITY-006        — resolve GAP-ACQ-001 governance gap
2. [First implementation] ROUTE-001                 — after Layer 0 authorizes acquisition stream
3. [After ROUTE-001]      QR-SOURCE-002             — source attribution
4. [After GAP-ACQ-002]    EVENTS-003                — event registration
5. [After ROUTE-001]      REFERRAL-005              — referral landing (parallel with QR-SOURCE-002)
6. [After ROUTE-001+EVENTS+GAP-ACQ-006] INQUIRY-004 — buyer inquiry intake
7. [After ORF-006]        WEBHOOK-007               — provisioning webhook
8. [After WEBHOOK-007]    PROVISIONED-EVENTS-008    — wire provisioning events
9. [Separate auth]        AGGREGATOR-TRUTHFULNESS   — authenticated discovery defect fix
```

---

## 9. Duplicates Prevention

The following are **unconditionally prohibited** in the acquisition MVP and beyond until separately
authorized by an explicit design unit with Paresh approval.

### 9.1 Prohibited Duplicate Surfaces

| Prohibited Action | Reason |
| --- | --- |
| Creating a second `GET /api/public/supplier/:slug`-equivalent route anywhere | One canonical public profile route only; owned by Main Platform exclusively |
| Creating a separate per-supplier detail endpoint inside the Aggregator workspace that serves the same shape as the public profile | Duplicate payload model — Aggregator uses the public profile URL; it does not define a conflicting shape |
| Re-exposing `counterpartyProfileAggregation.service.ts` via any public or unauthenticated route handler | Prohibited by D-03; four technical reasons in §7.3 of AGGREGATOR-DIRECTORY-ACQUISITION-INTEGRATION-DESIGN-v1 |
| Adding `contact_phone`, `contact_email`, `website`, or `linkedin` to any public API response | Gate E; constitutionally absent from schema; must not be added |

### 9.2 Prohibited Scope Creep

| Prohibited Action | Reason |
| --- | --- |
| Merging `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` with ROUTE-001 or any acquisition unit | Different problem domains; separate streams per §9.1 of AGGREGATOR-DIRECTORY-ACQUISITION-INTEGRATION-DESIGN-v1 |
| Creating collections, shortlists, or comparison surfaces inside the acquisition MVP | No schema foundation (`Shortlist`, `Collection`, `comparison` models absent); requires separate design, schema governance, and migration |
| Adding shortlist/collection schema inside any acquisition stream unit | Would violate schema-budget governance; no model authority exists |
| Opening `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` as part of acquisition work | Requires explicit Paresh authorization; `adjacent_deferred_candidate` per `NEXT-ACTION.md`; do not auto-open |
| Registering Aggregator discovery events (`aggregator.discovery.*`) inside EVENTS-003 | EVENTS-003 is a Main Platform acquisition event unit; Aggregator events are a separate future registration |
| Including WhatsApp, commission, CRM review, or field-agent units in the Main Platform acquisition tracker | These belong to the Customer Acquisition Engine / CRM; not Main Platform units |

---

## 10. Customer Acquisition Engine Dependency Unlocks

After each acquisition unit closes, the Customer Acquisition Engine / App may rely on:

| Unit Closed | Acquisition Engine Can Rely On |
| --- | --- |
| **ROUTE-001** | Stable supplier public URL (`/supplier/:slug`). QR cards can point to a live profile. Profile page can be demoed to prospects. All other acquisition units are unblocked from a UX surface perspective. |
| **QR-SOURCE-002** | QR scan source attribution. `qr`, `referral`, `event`, and `direct` source channels are structured in the platform's event and analytics layer. Field QR card performance is attributable. |
| **EVENTS-003** | `supplier_profile.viewed.v1` pipeline is live. Profile view analytics begin ingesting. Attribution data is structured for acquisition performance reporting. |
| **INQUIRY-004** | Buyers can submit a pre-auth inquiry from a supplier profile page. Inquiry is normalized and routed to CRM for follow-up. Acquisition Engine receives a structured, platform-mediated intake signal. |
| **REFERRAL-005** | New prospects who receive a QR card can land at `/join/:referral_code` to learn about the platform and begin the supplier application flow. Referral campaign landing is live. |
| **ORF-AUTHORITY-006** | CRM has a named canonical column for `external_orchestration_ref`. The idempotency contract is defined. CRM can begin writing provisioning handoff calls with confidence about the join key. |
| **WEBHOOK-007** | CRM Acquisition Engine can call `POST /api/internal/acquisition/provision-supplier` to bring a field-acquired, CRM-approved supplier live on the platform. End-to-end provisioning handoff is operational. |
| **PROVISIONED-EVENTS-008** | CRM can listen to `public_supplier_profile.provisioned.v1` to confirm a supplier profile is live. CRM can route `gate_failed.v1` to a remediation workflow. The provisioning feedback loop is closed. |
| **AGGREGATOR-TRUTHFULNESS (separate)** | Authenticated aggregator discovery workspace returns truthful results. Aggregator users can discover and validate provisioned suppliers within the authenticated workspace. This is NOT a Customer Acquisition Engine prerequisite — it is an authenticated platform quality concern. |

---

## 11. Blockers and Risk Register

All six acquisition gaps from the original tracker remain open. No gap has been resolved since the
tracker was committed at `dba287c`.

| Gap ID | Description | Status | Blocks |
| --- | --- | --- | --- |
| **GAP-ACQ-001** | `external_orchestration_ref` dual-column authority unresolved — both `Tenant.externalOrchestrationRef` and `organizations.external_orchestration_ref` carry `@unique` with no canonical owner named | **OPEN** | WEBHOOK-007, PROVISIONED-EVENTS-008 |
| **GAP-ACQ-002** | No `supplier_profile.*` events in `KnownEventName` or `event-names.md` — Team A authority required for new event name registration | **OPEN** | EVENTS-003 |
| **GAP-ACQ-003** | `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` blocked by Layer 0 | **OPEN** | Aggregator authenticated workspace only — does NOT block ROUTE-001 |
| **GAP-ACQ-004** | No OpenAPI entries for acquisition integration endpoints (`/supplier/:slug`, `/inquiry/submit`, `/provision-supplier`) | **OPEN** | OpenAPI governance compliance per `ARCHITECTURE-GOVERNANCE.md` (each implementing unit must include OpenAPI in same wave) |
| **GAP-ACQ-005** | `buyer_inquiry.*` and `public_supplier_profile.*` events not registered | **OPEN** | INQUIRY-004, WEBHOOK-007, PROVISIONED-EVENTS-008 |
| **GAP-ACQ-006** | No rate-limit budget defined for `POST /api/public/inquiry/submit` | **OPEN** | INQUIRY-004 |

### 11.1 Additional Risk Register

| Risk | Level | Mitigation |
| --- | --- | --- |
| **Contact-data exposure** — pressure to add `contact_phone`, `contact_email` to public profile | CONSTITUTIONAL PROHIBITION | Gate E unconditional; fields absent from schema by design; must not be added |
| **Public endpoint abuse** — `GET /api/public/supplier/:slug` and `POST /api/public/inquiry/submit` are unauthenticated | MEDIUM | Rate-limit at same tier as `GET /api/public/b2b/suppliers` (profile route); GAP-ACQ-006 rate-limit budget required before INQUIRY-004 opens |
| **OpenAPI same-wave obligation** | MEDIUM | ARCHITECTURE-GOVERNANCE.md: OpenAPI must update in same wave as route; each unit includes its OpenAPI spec path as an in-scope file |
| **Scope creep into Aggregator** — risk of bundling acquisition units with Aggregator workspace enrichment | MEDIUM | §9 duplicate prevention; units must not touch `counterpartyProfileAggregation.service.ts` except as a pattern reference |
| **No schema foundation for collections/shortlist/comparison** | LOW (deferred) | No models exist; these are explicitly excluded from acquisition MVP per §9.2 |
| **No schema models for inquiry/referral/handoff** | LOW for MVP | `POST /api/public/inquiry/submit` routes to CRM without storing; no `inquiry` model required for INQUIRY-004 minimal implementation |
| **Layer 0 `NONE_AUTHORIZED` posture** | IN FORCE | No acquisition unit may open until Layer 0 explicitly authorizes the acquisition stream |
| **`TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` auto-open risk** | LOW | Explicitly prohibited per `NEXT-ACTION.md` and §9.2; requires explicit Paresh authorization |

---

## 12. Recommended Next Step

### 12.1 After This Merged Tracker Is Committed

The next planning artifact is:

> **`CUSTOMER-ACQUISITION-ENGINE-IMPLEMENTATION-PLAN-001`**

This artifact should document the Customer Acquisition Engine / App's own implementation roadmap
(field capture, QR card workflow, WhatsApp orchestration, referral code generation, weekly digest,
CRM review workflow, commission ledger, field-agent app) with explicit cross-references to the Main
Platform dependency unlocks documented in §10 of this tracker.

The CA Engine plan must not assume any Main Platform acquisition unit is live until that unit's
completion criteria are confirmed met.

### 12.2 Authorization Gates

| Action | Authorization Required |
| --- | --- |
| Opening ROUTE-001 | Layer 0 must explicitly authorize the acquisition stream (`active_delivery_unit` must change from `NONE_AUTHORIZED`) |
| Opening AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS | Separate Layer 0 authorization — not bundled with acquisition stream |
| Opening `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` | Explicit Paresh authorization — do not auto-open under any circumstance |
| Drafting CUSTOMER-ACQUISITION-ENGINE-IMPLEMENTATION-PLAN-001 | This merged tracker must be committed first |

---

## 13. Final Readiness Verdict

| Stream | Verdict | Precondition / Notes |
| --- | --- | --- |
| **Main Platform — public supplier profile route (ROUTE-001)** | **READY_TO_OPEN** | Layer 0 must authorize the acquisition stream; no schema change required; five-gate foundation exists |
| **Main Platform — QR source tracking (QR-SOURCE-002)** | NOT_READY | ROUTE-001 must close first |
| **Main Platform — acquisition event registration (EVENTS-003)** | BLOCKED | GAP-ACQ-002: Team A authority sign-off required for new event names |
| **Main Platform — buyer inquiry intake (INQUIRY-004)** | BLOCKED | ROUTE-001 + GAP-ACQ-005 + GAP-ACQ-006 all required |
| **Main Platform — referral join landing (REFERRAL-005)** | NOT_READY | ROUTE-001 recommended first; technically independent |
| **Main Platform — orchestration ref authority (ORF-AUTHORITY-006)** | REQUIRED_BEFORE_WEBHOOK | Can progress as parallel governance doc; does not block ROUTE-001 through REFERRAL-005 |
| **Main Platform — provisioning webhook (WEBHOOK-007)** | BLOCKED | ORF-AUTHORITY-006 must close first |
| **Main Platform — provisioning events (PROVISIONED-EVENTS-008)** | BLOCKED | WEBHOOK-007 + GAP-ACQ-005 required |
| **Aggregator — authenticated discovery workspace** | LIVE (defect present) | `count=0` defect present; `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` remediation needed; authorized separately |
| **CRM integration stream** | DEPENDS ON CRM TRACKER | `CUSTOMER-ACQUISITION-ENGINE-IMPLEMENTATION-PLAN-001` must document CRM side independently |
| **Customer Acquisition Engine / App plan** | **READY_TO_DRAFT** | This merged tracker must be committed first; drafting may begin |
| **Implementation of any acquisition unit** | **NOT AUTHORIZED by this artifact** | Layer 0 authorization required; this is a planning artifact only |

---

## Appendix A — Design Decisions Carried Forward (Governing Authority)

The following decisions from `AGGREGATOR-DIRECTORY-ACQUISITION-INTEGRATION-DESIGN-v1.md` remain
in force and are carried forward by this merged tracker.

| Decision | Statement |
| --- | --- |
| D-01 | `GET /api/public/supplier/:slug` is a general Main Platform surface — not Aggregator-owned |
| D-02 | Public supplier profile must use `getPublicB2BSupplierBySlug()` in `publicB2BProjection.service.ts` with all five gates; gate failure = 404 |
| D-03 | `counterpartyProfileAggregation.service.ts` is pattern reference only — must not be re-exposed publicly or placed behind any unauthenticated handler |
| D-04 | Aggregator Directory remains authenticated, AGGREGATOR/INTERNAL gated, and read-only unless separately authorized |
| D-05 | Aggregator is a future consumer of acquisition-provisioned profiles — it must not define a conflicting supplier detail payload model |
| D-06 | Aggregator must not absorb acquisition drafts, CRM review, field operations, QR generation, WhatsApp, weekly digest, inquiry intake, referral code, commission, RFQ, pricing, negotiation, order, payment, or fulfillment |

---

## Appendix B — CRM Canonical Object Chain Context

The following is the authoritative cross-system object chain from
`CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md`.

| Stage | Owner |
| --- | --- |
| Website Request → Raw Submission → Qualified Lead | CRM |
| Onboarding Case → Approved Onboarding Case | CRM |
| Platform Provisioning Handoff | CRM triggers → WEBHOOK-007 receives |
| Platform Tenant + Platform Organization | **Main Platform creates** (WEBHOOK-007) |
| First-Owner Access Preparation | Main Platform |
| CRM Access Issuance | CRM |
| Platform Activation Complete | Main Platform confirms (PROVISIONED-EVENTS-008 emits) |
| CRM Customer Account Activation | CRM consumes `public_supplier_profile.provisioned.v1` |

**Critical seams (currently missing — from data reconciliation investigation):**

| Cross-System Join | Current Status | Risk |
| --- | --- | --- |
| Marketing submission ↔ platform tenant/org | MISSING join key | HIGH — GAP-ACQ-001 related |
| CRM lead ↔ platform tenant/org | MISSING join key | HIGH — blocks provisioning webhook idempotency |
| CRM company/account ↔ platform tenant/org | INDIRECT only (name/email) | HIGH — risk of duplicate org creation |

These seams must be resolved by ORF-AUTHORITY-006 (naming the canonical `external_orchestration_ref`
column) before WEBHOOK-007 may open.

---

*This artifact is planning-only. No schema, routes, services, frontend states, events, OpenAPI
contracts, governance control files, or migration files were modified. No implementation unit is
opened or authorized by this artifact.*
