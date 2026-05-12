# MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1

Unit ID: MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-001
Title: Main TexQtic Platform — Customer Acquisition Engine Integration Plan and Tracker
Status: PLANNING ARTIFACT ONLY — NO IMPLEMENTATION
Date: 2026-05-12
Authorized by: Paresh
Basis: Repo-truth audit of 9 source areas. No schema mutations. No migrations. No runtime changes.
Primary input: docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md

---

## 1. Purpose

This artifact is the Main TexQtic Platform implementation plan and tracker for all platform development
required to connect the future TexQtic Customer Acquisition Engine / App.

The Customer Acquisition Engine / App will own field supplier acquisition, offline capture, photos, QR
card workflow, WhatsApp orchestration, referrals, and weekly digest orchestration. The Main Platform must
remain the public discovery, runtime, and identity destination layer.

This document does not:
- Authorize implementation of any unit
- Mutate any schema, route, event registry, or OpenAPI contract
- Open any implementation unit (opening requires a separate prompt with explicit scope)
- Supersede any currently active TECS bounded product decision

---

## 2. Repo-Truth Baseline

### 2.1 Files Reviewed

| File | Purpose |
| --- | --- |
| `server/src/routes/public.ts` | Unauthenticated public route inventory |
| `server/src/services/publicB2BProjection.service.ts` | Five-gate B2B projection safety model |
| `server/prisma/schema.prisma` | Schema field baseline (slug, entitlement postures, orchestration refs) |
| `App.tsx` | Frontend app state machine and public route patterns |
| `server/src/lib/events.ts` | `KnownEventName` union — current event registry |
| `shared/contracts/event-names.md` | Team-authoritative event name registry |
| `shared/contracts/openapi.tenant.json` | Tenant-plane OpenAPI contract (v0.3.0) |
| `shared/contracts/openapi.control-plane.json` | Control-plane OpenAPI contract (v0.3.0) |
| `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | OpenAPI obligation and atomic change envelope rules |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` | B2B public discovery object model and inquiry model authority |
| `governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` | B2B vs B2C projection category rules |
| `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Cross-system object chain; non-ownership of CRM commercial objects |
| `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Missing cross-system seams; dual orchestration-ref gap |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | Primary input boundary design artifact |

### 2.2 Current Public Route Inventory

Source: `server/src/routes/public.ts`. All routes registered under prefix `/api/public`.

| Route | Handler function / service | Notes |
| --- | --- | --- |
| `GET /api/public/entry/resolve` | Local handler | Entry resolution; no auth |
| `GET /api/public/tenants/resolve?slug=` | Local handler | Returns `{ tenantId, slug, name }` only |
| `GET /api/public/tenants/by-email?email=` | Local handler | Returns `{ tenants: [{tenantId, slug, name}] }` |
| `GET /api/public/b2b/suppliers` | `listPublicB2BSuppliers()` | Five-gate B2B projection; paginated; no auth |
| `GET /api/public/b2c/products` | `listPublicB2CProducts()` | B2C browse; no auth |
| `GET /api/public/dpp/:publicPassportId` | Inline handler | Rate limited 100/15 min/IP; DPP passport only |
| `GET /api/public/dpp/:publicPassportId/structured-data` | Inline handler | Structured JSON DPP output |

**No `GET /api/public/supplier/:slug` route exists.**
**No `POST /api/public/inquiry/submit` route exists.**
**No `POST /api/internal/acquisition/provision-supplier` route exists.**
**No `/join/:referral_code` frontend route exists.**

### 2.3 Current Frontend App State Machine (Public States)

Source: `App.tsx` — `type AppState` declaration at line 1951.

| AppState value | Route pattern | Component | Notes |
| --- | --- | --- | --- |
| `PUBLIC_ENTRY` | `/` | Entry landing | Default unauthenticated entry |
| `PUBLIC_B2B_DISCOVERY` | State-driven | `B2BDiscovery` | Supplier list; no individual profile route |
| `PUBLIC_C2C_BROWSE` | State-driven | `B2CBrowse` | B2C browse |
| `PUBLIC_PASSPORT` | `/passport/:id` | `PublicPassport.tsx` | DPP product passport — QR is DPP-only |
| `AUTH` | `/auth` | Auth flows | Authenticated session entry |
| `ONBOARDING` | Token-driven | Onboarding flows | Invite-token flow |

**No `PUBLIC_SUPPLIER_PROFILE` state exists.**
**No `PUBLIC_REFERRAL_LANDING` state exists.**
**`/supplier/:slug`, `/p/:slug`, and `/join/:referral_code` patterns are absent from the state machine.**
**The QR infrastructure in `PublicPassport.tsx` (`react-qr-code`) is product-DPP passport QR only.**

### 2.4 Five-Gate B2B Projection Safety Architecture (Current)

Source: `server/src/services/publicB2BProjection.service.ts` (lines 11–16, 139–324).

| Gate | Condition | Failure mode |
| --- | --- | --- |
| Gate A | `tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'` | Silent exclusion |
| Gate B | `org.publication_posture IN ('B2B_PUBLIC', 'BOTH')` | Silent exclusion |
| Gate C | `org.org_type === 'B2B'` | Silent exclusion |
| Gate D | `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')` | Silent exclusion |
| Gate E | Payload field allowlist enforced; prohibited fields are NEVER in output | Structural guard |

Allowed payload fields (Gate E): `slug`, `legal_name`, `org_type`, `jurisdiction`, `certificationCount`
(approved certs only), `certificationTypes` (max 10), `hasTraceabilityEvidence` (SHARED visibility only),
taxonomy (`primarySegment`, `secondarySegments`, `rolePositions`), `offeringPreview`
(name, moq, imageUrl — NO price, max 5 items).

Prohibited payload fields (Gate E — unconditional): price, org UUIDs, negotiation state, order/trade
state, admin/governance fields, `risk_score`, `plan`, `registration_no`,
`external_orchestration_ref`, draft data.

DB access: service-role via `withAdminContext` / `withOrgAdminContext`. Organizations table requires
`withOrgAdminContext` (organizations_control_plane_select RLS requires `app.current_realm() = 'admin'`).

**This architecture is the correct and reusable foundation for any public supplier profile detail endpoint.**

### 2.5 Current Event Registry State

Source: `server/src/lib/events.ts` — `KnownEventName` union (line 161).

Current event domains registered:

| Domain prefix | Events |
| --- | --- |
| `tenant.*` | `TENANT_CREATED_ORIGIN`, `TENANT_OWNER_CREATED`, `TENANT_OWNER_MEMBERSHIP_CREATED` |
| `team.*` | `TEAM_INVITE_CREATED` |
| `marketplace.cart.*` | `created`, `item.added`, `item.updated`, `item.removed`, `checked_out` |
| `ai.inference.*` | `generate`, `error`, `budget_exceeded`, `pii_redacted`, `pii_leak_detected`, `cache_hit` |
| `ai.control.*` | `insights.generate`, `insights.error`, `insights.pii_redacted`, `insights.pii_leak_detected` |
| `ai.vector.*` | `upsert`, `delete`, `query` |

Source: `shared/contracts/event-names.md`.
Currently only lists: `tenant.created`, `tenant.domain_added`, `admin.impersonation_started`,
`admin.impersonation_ended`, `audit.log_written`, `ai.budget_exceeded`.
Team authority rule: "UI does not invent event names. Team A owns event naming."

**No `supplier_profile.*` events exist.**
**No `buyer_inquiry.*` events exist.**
**No `public_supplier_profile.*` events exist.**
Zero acquisition-relevant event names are registered in either file.

### 2.6 Current OpenAPI Contract State

Source: `shared/contracts/openapi.tenant.json` (v0.3.0), `shared/contracts/openapi.control-plane.json` (v0.3.0).

OpenAPI obligation (from `ARCHITECTURE-GOVERNANCE.md`): When a gap fix modifies request/response shape or
newly exposes an endpoint, the corresponding OpenAPI file must be updated **in the same implementation
wave** — not as deferred cleanup.

**No `/api/public/supplier/:slug` path exists in any OpenAPI contract.**
**No `/api/public/inquiry/submit` path exists in any OpenAPI contract.**
**No `/api/internal/acquisition/provision-supplier` path exists in any OpenAPI contract.**
All three are confirmed missing. Every unit that builds these routes must author the spec path in the
same wave.

### 2.7 Schema Fields Relevant to Acquisition Integration

Source: `server/prisma/schema.prisma`.

| Model | Field | Type | Constraint | Purpose |
| --- | --- | --- | --- | --- |
| `Tenant` | `publicEligibilityPosture` | `TenantPublicEligibilityPosture` | — | Gate A entitlement field |
| `Tenant` | `externalOrchestrationRef` | `String?` | `@unique` | CRM↔Platform cross-system link anchor (on tenant row) |
| `organizations` | `slug` | `String` | `@unique`, VarChar(100) | Public URL identity key; not yet used in any public route |
| `organizations` | `publication_posture` | `String` | default `'PRIVATE_OR_AUTH_ONLY'` | Gate B entitlement field |
| `organizations` | `external_orchestration_ref` | `String?` | `@unique` | Parallel CRM link anchor on org row |
| `organizations` | `org_type` | `String` | default `'B2B'` | Gate C field |
| `organizations` | `status` | `String` | — | Gate D field |
| `organizations` | `risk_score` | `Int` | Gate E prohibited | Never in public payload |
| `organizations` | `registration_no` | `String?` | Gate E prohibited | Never in public payload |
| `organizations` | `plan` | `String` | Gate E prohibited | Never in public payload |

**No `contact_phone`, `contact_email`, `website`, or `linkedin` fields exist on `organizations`.
This is intentional. These fields MUST NOT be added.**

**Dual `external_orchestration_ref` issue**: Both `Tenant.externalOrchestrationRef` (line 21) and
`organizations.external_orchestration_ref` (line 1073) carry `@unique`. No governance document
currently resolves which column is the canonical CRM lookup key (GAP-ACQ-001).

### 2.8 Current Gap Summary

| Gap ID | Description | Status |
| --- | --- | --- |
| GAP-ACQ-001 | `external_orchestration_ref` dual-column authority unresolved | OPEN — blocks provisioning webhook |
| GAP-ACQ-002 | No `supplier_profile.*` events in `KnownEventName` or `event-names.md` | OPEN — blocks event emission on profile route |
| GAP-ACQ-003 | `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` blocked by Layer 0 | OPEN — does NOT block public unauthenticated profile route |
| GAP-ACQ-004 | No OpenAPI entries for acquisition integration endpoints | OPEN — blocks OpenAPI governance compliance per ARCHITECTURE-GOVERNANCE.md |
| GAP-ACQ-005 | `buyer_inquiry.*` and `public_supplier_profile.*` events not registered | OPEN — blocks inquiry and provisioning event emission |
| GAP-ACQ-006 | No rate-limit budget defined for `POST /api/public/inquiry/submit` | OPEN — blocks inquiry endpoint configuration |

---

## 3. Main Platform Ownership Boundary

### 3.1 What the Main Platform Owns (Acquisition-Relevant)

| Capability | Governance authority |
| --- | --- |
| Public supplier profile route (`GET /api/public/supplier/:slug`) | `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §3 |
| Discovery-safe supplier profile projection (five-gate model) | `publicB2BProjection.service.ts`; boundary design artifact §2.4 |
| QR scan destination (supplier profile URL) | Boundary design artifact §3.2 |
| Public supplier directory visibility (`GET /api/public/b2b/suppliers`) | LIVE |
| Buyer inquiry intake (`POST /api/public/inquiry/submit`) | `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §4 |
| Supplier profile view / contact events (`supplier_profile.viewed.v1`, `buyer_inquiry.created.v1`) | Boundary design artifact §3.4 |
| Public referral / join landing route (`/join/:referral_code`) | Boundary design artifact §3.6 |
| Platform-side provisioning after CRM approval (`POST /api/internal/acquisition/provision-supplier`) | Boundary design artifact §3.3 |
| Provisioning events (`public_supplier_profile.provisioned.v1`, `gate_failed.v1`) | Boundary design artifact §3.4 |
| OpenAPI spec for all above surfaces | `ARCHITECTURE-GOVERNANCE.md` OpenAPI contract governance rule |

### 3.2 What the Main Platform Must Not Own

| Capability | Rightful owner |
| --- | --- |
| Field-agent offline sync and device state | Field tool |
| Pre-submission supplier data capture on mobile | Field tool |
| QR card generation and print batching | Field tool |
| Supplier scan history on field agent device | Field tool |
| Field-agent authentication and session | Field tool / separate auth context |
| WhatsApp thread capture and normalization | Field tool / external messaging provider |
| WhatsApp provider orchestration | External communications layer |
| Weekly digest dispatch | CRM / acquisition engine |
| Acquisition draft records as platform truth | CRM (drafts must not land in `organizations` until provisioning handoff completes) |
| CRM lead qualification and scoring | CRM |
| Duplicate supplier detection and resolution | CRM |
| Onboarding case lifecycle (new → approved → issuance) | CRM canonical pre-runtime chain |
| `crm.onboarding.approved` state ownership | CRM |
| Referral code generation and assignment | CRM (platform only consumes as passthrough) |
| Commission ledger and field-agent payout | CRM / back-office |
| Commission approval / payment disbursement | Finance operations |
| Contact reveal (`contact_phone`, `contact_email`) in any public projection | Platform must not add these fields |
| CRM review decisions and commercial posture as platform truth | CRM |
| Field-agent task and assignment management | CRM / field tool |

---

## 4. Dependency Map

### 4.1 Acquisition Engine Build Prerequisites (Platform must own these first)

| Acquisition Engine Capability | Blocking Platform Unit |
| --- | --- |
| Any acquisition-provisioned supplier has a public URL | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` |
| QR cards have a valid scan destination | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` |
| QR source attribution (field vs organic) | `MAIN-PLATFORM-SUPPLIER-PROFILE-QR-SOURCE-002` (after profile route) |
| Buyer initiates inquiry from profile page | `MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004` (after events, after profile route) |
| Referral landing for new prospects | `MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005` |
| CRM provisioning handoff creates live public profile | `MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007` (requires GAP-ACQ-001 resolution first) |
| Analytics pipeline for profile views | `MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003` |
| CRM confirmed public profile is live | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-PROVISIONED-EVENTS-008` |

### 4.2 Critical Path

```
[GAP-ACQ-001 resolution] ────────────────────────────────────────────────────────────────────────────────► MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007
                                                                                                                    │
MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001 ─► MAIN-PLATFORM-SUPPLIER-PROFILE-QR-SOURCE-002                  ▼
         │                                                                                         MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-PROVISIONED-EVENTS-008
         ├─► MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003
         │
         └─► MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004 ─► (requires GAP-ACQ-005 + GAP-ACQ-006)

MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005 (independent; parallel-safe after profile route)
```

### 4.3 Blocking Relationships (Hard Predecessors)

| Unit | Hard predecessors |
| --- | --- |
| `ROUTE-001` (public supplier profile) | None (slug exists; five-gate exists; schema is sufficient) |
| `QR-SOURCE-002` | `ROUTE-001` must be live |
| `EVENTS-003` | GAP-ACQ-002 must be resolved (event names registered in both files) |
| `INQUIRY-004` | `ROUTE-001`; GAP-ACQ-005; GAP-ACQ-006 rate-limit budget defined |
| `REFERRAL-005` | None (independent frontend-only unit; slug passthrough; no backend needed) |
| `ORF-AUTHORITY-006` | GAP-ACQ-001 governance artifact must be produced |
| `WEBHOOK-007` | `ORF-AUTHORITY-006` must be closed; `EVENTS-003` for provisioning events |
| `PROVISIONED-EVENTS-008` | `WEBHOOK-007` must be live |

---

## 5. Implementation Tracker Table

| ID | Unit name | Status | Hard prerequisites | Notes |
| --- | --- | --- | --- | --- |
| ROUTE-001 | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` | **READY_TO_OPEN** | None | No schema change. Reuse five-gate. OpenAPI required in same wave. No contact data. |
| QR-SOURCE-002 | `MAIN-PLATFORM-SUPPLIER-PROFILE-QR-SOURCE-002` | NOT_READY | ROUTE-001 | Adds `?source=` enum param. |
| EVENTS-003 | `MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003` | BLOCKED | GAP-ACQ-002 | Requires event registration in both registry files. |
| INQUIRY-004 | `MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004` | BLOCKED | ROUTE-001; GAP-ACQ-005; GAP-ACQ-006 | Rate-limit budget required first. |
| REFERRAL-005 | `MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005` | NOT_READY | ROUTE-001 recommended | Frontend-only. Passthrough. No backend event on view. |
| ORF-AUTHORITY-006 | `MAIN-PLATFORM-ORCHESTRATION-REF-AUTHORITY-006` | REQUIRED_BEFORE_WEBHOOK | GAP-ACQ-001 governance artifact | Resolve dual-column; name canonical column. |
| WEBHOOK-007 | `MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007` | BLOCKED | ORF-AUTHORITY-006 | Internal-realm. Idempotent. CRM handoff only. |
| PROVISIONED-EVENTS-008 | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-PROVISIONED-EVENTS-008` | BLOCKED | WEBHOOK-007; GAP-ACQ-005 | Emit `provisioned.v1` and `gate_failed.v1`. |

---

## 6. Per-Unit Detail Blocks

---

### ROUTE-001: MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001

**Objective:**
Build `GET /api/public/supplier/:slug` (backend) and a new `PUBLIC_SUPPLIER_PROFILE` app state
(frontend) with route pattern `/supplier/:slug` or `/p/:slug` in `App.tsx`.

**Status:** READY_TO_OPEN

**Rationale for readiness:**
- `organizations.slug` is `@unique` in schema — no migration needed
- `publicEligibilityPosture` and `publication_posture` entitlement fields exist
- `publicB2BProjection.service.ts` five-gate architecture is fully reusable
- `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` (DECIDED) provides payload model authority
- No schema change required

**Files to inspect / change:**

| File | Change type |
| --- | --- |
| `server/src/routes/public.ts` | ADD `GET /supplier/:slug` route handler |
| `server/src/services/publicB2BProjection.service.ts` | ADD `getPublicB2BSupplierBySlug()` function (reuse five-gate model) |
| `App.tsx` | ADD `'PUBLIC_SUPPLIER_PROFILE'` to `AppState` union; ADD URL pattern detection in `resolveInitialAppState`; ADD `case 'PUBLIC_SUPPLIER_PROFILE':` to render switch |
| `shared/contracts/openapi.tenant.json` | ADD `GET /api/public/supplier/{slug}` path in same wave |
| `components/Public/` | ADD new `PublicSupplierProfile.tsx` component (display only, no contact reveal) |

**Required payload shape (Gate E compliant):**
Compose: `SUPPLIER_DISCOVERY_PROFILE` + `SUPPLIER_CAPABILITY_PROFILE` + `TRUST_QUALIFICATION_PREVIEW` +
`BOUNDED_OFFERING_PREVIEW` per `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §2.

Allowed fields: `slug`, `legal_name`, `org_type`, `jurisdiction`, `certificationCount` (approved only),
`certificationTypes` (max 10), `hasTraceabilityEvidence` (SHARED visibility only), `taxonomy`,
`offeringPreview` (name, moq, imageUrl — NO price, max 5 items).

Prohibited: price, contact details, `registration_no`, `risk_score`, `plan`,
`external_orchestration_ref`, negotiation state, order/trade state.

**Gate behaviour:** If slug not found, or Gates A–D fail → return `404` (not `403`; do not confirm
existence of non-public orgs).

**Required OpenAPI update:** New path `GET /api/public/supplier/{slug}` in `openapi.tenant.json`.
Must be in same wave per ARCHITECTURE-GOVERNANCE.md.

**Required tests:**
- Test: slug found, gates pass → 200 with discovery-safe payload
- Test: slug not found → 404
- Test: slug found, Gate A fails (not PUBLICATION_ELIGIBLE) → 404
- Test: slug found, Gate B fails (not B2B_PUBLIC/BOTH) → 404
- Test: slug found, Gate D fails (not ACTIVE/VERIFICATION_APPROVED) → 404
- Test: payload never contains prohibited Gate E fields
- Frontend: `/supplier/:slug` URL resolves to `PUBLIC_SUPPLIER_PROFILE` state

**Verification commands:**
```
pnpm --filter server typecheck
pnpm --filter server lint
pnpm -C server exec vitest run src/routes/public.test.ts --reporter=verbose
```

**Guardrails:**
- No contact fields in response
- No `external_orchestration_ref` in response
- No org UUID in response (unauthenticated; slug is the public identity key)
- No 403 for non-public orgs; use 404 to avoid confirming existence
- No inquiry form in this unit (inquiry is INQUIRY-004)
- No QR source tracking in this unit (QR source is QR-SOURCE-002)

**Proposed atomic commit message:**
```
feat(public): add GET /api/public/supplier/:slug profile route (ROUTE-001)
```

---

### QR-SOURCE-002: MAIN-PLATFORM-SUPPLIER-PROFILE-QR-SOURCE-002

**Objective:**
Add optional `?source=` (or `?ref=`) query parameter support to
`GET /api/public/supplier/:slug` for QR card, referral, and event attribution.

**Status:** NOT_READY — requires ROUTE-001 to be live

**Files to inspect / change:**

| File | Change type |
| --- | --- |
| `server/src/routes/public.ts` | Extend `/supplier/:slug` handler to accept and validate `source` enum param |
| `shared/contracts/openapi.tenant.json` | Update `/api/public/supplier/{slug}` spec to document `source` query param |

**Source enum values (strict; no freeform):** `qr`, `referral`, `event`, `direct`.
Non-presence defaults to organic/web.

**Constraint:** The `source` parameter MUST:
- Be strictly enumerated (reject unknown values or silently ignore — decision for implementing unit)
- Never create a buyer identity or pre-auth session
- Be attached to a `supplier_profile.viewed.v1` event (requires EVENTS-003 to be live for event
  emission; can log structurally before EVENTS-003 is wired)

**Guardrails:**
- Parameter is optional; non-presence is valid
- Never used as a auth or session token
- Never used to identify the viewer

**Proposed atomic commit message:**
```
feat(public): add optional source enum param to supplier profile route (QR-SOURCE-002)
```

---

### EVENTS-003: MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003

**Objective:**
Define and register `supplier_profile.viewed.v1` event (and related acquisition events) in both
`server/src/lib/events.ts` (`KnownEventName` union) and `shared/contracts/event-names.md`.

**Status:** BLOCKED — requires GAP-ACQ-002 to be resolved via team authority sign-off

**Events to register:**

| Event name | Domain | Trigger |
| --- | --- | --- |
| `supplier_profile.viewed.v1` | `supplier_profile` | Unauthenticated `GET /api/public/supplier/:slug` |
| `buyer_inquiry.created.v1` | `buyer_inquiry` | Buyer submits pre-auth inquiry |
| `public_supplier_profile.provision_requested.v1` | `public_supplier_profile` | Provisioning handoff received |
| `public_supplier_profile.provisioned.v1` | `public_supplier_profile` | Profile goes live |
| `public_supplier_profile.gate_failed.v1` | `public_supplier_profile` | One or more provisioning gates failed |

**Files to inspect / change:**

| File | Change type |
| --- | --- |
| `shared/contracts/event-names.md` | ADD all 5 event names with domain and trigger description |
| `server/src/lib/events.ts` | ADD all 5 to `KnownEventName` union |

**Note:** Event payload rules:
- `supplier_profile.viewed.v1`: `slug`, `source_channel` enum, optional `viewer_geo_band`, `timestamp` — NO orgId, NO buyer identity
- `buyer_inquiry.created.v1`: `supplier_slug`, `inquiry_category`, `geo_band`, `volume_band` — NO raw contact data, NO email, NO phone
- `public_supplier_profile.provision_requested.v1`: `external_orchestration_ref`, `org_type`, `segment` — NO price, NO personal data
- `public_supplier_profile.provisioned.v1`: `slug`, `external_orchestration_ref`, `publication_posture`
- `public_supplier_profile.gate_failed.v1`: `external_orchestration_ref`, `failed_gate` enum, reason code — NO raw payload

**Guardrails:**
- Team A authority required for event name sign-off per `event-names.md` rule
- Naming convention: domain-prefixed, snake_case, versioned `.v1`
- No PII in any event payload

**Proposed atomic commit message:**
```
docs(events): register supplier_profile, buyer_inquiry, public_supplier_profile events (EVENTS-003)
```

---

### INQUIRY-004: MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004

**Objective:**
Build `POST /api/public/inquiry/submit` — the platform's public-triggered, non-binding pre-auth
inquiry intake, per `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §4.

**Status:** BLOCKED — requires ROUTE-001 live; GAP-ACQ-005 and GAP-ACQ-006 resolved

**Files to inspect / change:**

| File | Change type |
| --- | --- |
| `server/src/routes/public.ts` | ADD `POST /inquiry/submit` with rate-limit plugin |
| `server/src/services/` | ADD `publicInquiry.service.ts` for intake normalization |
| `shared/contracts/openapi.tenant.json` | ADD `POST /api/public/inquiry/submit` path in same wave |

**Required request payload (minimum lawful pre-auth):**
- `supplier_slug` (string, required)
- `inquiry_category` (enum, required)
- `geo_band` (optional string)
- `volume_band` (optional string)

**Prohibited request fields:** raw email, phone number, buyer name as required fields.

**Rate limit:** per-IP, same pattern as `GET /api/public/dpp/:publicPassportId`
(100 requests / 15 min / IP). Exact budget must be confirmed in GAP-ACQ-006 before opening.

**Response:** Must not create a public messaging thread or supplier-owned continuity.
Platform normalizes intake; CRM owns follow-up routing.

**Event emission:** Emit `buyer_inquiry.created.v1` (requires EVENTS-003 live).

**Guardrails:**
- No raw contact data stored or returned
- No public thread ownership
- Rate limited before handler executes
- Emit `buyer_inquiry.created.v1` only — no other events
- No authentication created for the submitter

**Proposed atomic commit message:**
```
feat(public): add POST /api/public/inquiry/submit pre-auth intake (INQUIRY-004)
```

---

### REFERRAL-005: MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005

**Objective:**
Add `PUBLIC_REFERRAL_LANDING` app state to `App.tsx` with route pattern `/join/:referral_code` as
a passthrough landing destination for field-agent QR cards handed to new prospects.

**Status:** NOT_READY — recommended after ROUTE-001 for sequencing; technically independent

**Files to inspect / change:**

| File | Change type |
| --- | --- |
| `App.tsx` | ADD `'PUBLIC_REFERRAL_LANDING'` to `AppState` union; ADD `/join/:referral_code` URL pattern detection; ADD `case 'PUBLIC_REFERRAL_LANDING':` to render switch |
| `components/Public/` | ADD `PublicReferralLanding.tsx` component — explains platform, links to application form with `referral_code` passthrough |

**Behaviour constraints:**
- Accept `referral_code` path segment and pass through to downstream application form
- Emit no server-side event that creates a platform record from a page view
- Never use `referral_code` as a pre-auth identity token
- No backend route required for landing (frontend-only)

**Platform non-ownership reminder:**
The platform owns the landing destination only. Referral code generation, commission ledger, and
field agent assignment belong to CRM.

**Guardrails:**
- No server call on page load that writes any record
- `referral_code` is treated as a passthrough display token only
- Rate-limit risk assessed before opening (public landing; potential abuse vector)

**Proposed atomic commit message:**
```
feat(frontend): add PUBLIC_REFERRAL_LANDING state /join/:referral_code (REFERRAL-005)
```

---

### ORF-AUTHORITY-006: MAIN-PLATFORM-ORCHESTRATION-REF-AUTHORITY-006

**Objective:**
Resolve GAP-ACQ-001: name the canonical CRM↔Platform lookup column for `external_orchestration_ref`
and retire or shadow the other.

**Status:** REQUIRED_BEFORE_PROVISIONING_WEBHOOK — this is a governance documentation unit only

**Problem statement (from repo truth):**
Both `Tenant.externalOrchestrationRef` (line 21, `@unique`) and `organizations.external_orchestration_ref`
(line 1073, `@unique`) carry the same semantic intent but neither governance document names which is
the canonical CRM join key. The dual-column gap creates a divergence risk if CRM writes to one and the
platform reads from the other.

**Required output:** A governance decision artifact that:
1. Names `organizations.external_orchestration_ref` as canonical (or the reverse — Paresh decision)
2. Documents the purpose of the other column (historical artefact / tenant-level only / to retire)
3. States CRM must write only to the canonical column
4. States the provisioning webhook (WEBHOOK-007) reads only from the canonical column

**Files to produce (governance-only):**
- `governance/decisions/TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1.md`

**This unit does NOT:**
- Modify any schema column
- Create any migration
- Write any server code

**Proposed artifact commit message:**
```
docs(governance): resolve external_orchestration_ref canonical column authority (ORF-AUTHORITY-006)
```

---

### WEBHOOK-007: MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007

**Objective:**
Build `POST /api/internal/acquisition/provision-supplier` — the platform's side of the CRM→Platform
provisioning handoff seam documented as missing in
`CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1`.

**Status:** BLOCKED — requires ORF-AUTHORITY-006 (GAP-ACQ-001 resolved)

**Files to inspect / change:**

| File | Change type |
| --- | --- |
| `server/src/routes/` | ADD new internal-realm route file (NOT in `public.ts`; belongs in a new `acquisition.ts` or `internal.ts`) |
| `server/src/services/` | ADD `acquisitionProvisioning.service.ts` |
| `server/src/plugins/` | Ensure internal-realm auth guard applies |
| `shared/contracts/openapi.control-plane.json` | ADD `POST /api/internal/acquisition/provision-supplier` in same wave |

**Auth requirement:** Internal-realm only. Must not be accessible unauthenticated.
Either: (a) authenticated internal caller with valid `INTERNAL`-realm JWT, or
(b) signed HMAC webhook with secret rotation governance.

**Required request payload:**
- `external_orchestration_ref` (string, required — CRM onboarding case ID)
- `legal_name` (string, required)
- `org_type` (must be `'B2B'`, required)
- `jurisdiction` (string, required)
- `primary_segment_key` (string, required)
- `publication_posture_target` (enum: `'B2B_PUBLIC'` or `'BOTH'`, required)

**Behaviour:**
- Strictly idempotent: re-submitting same `external_orchestration_ref` must be a no-op or return existing record
- Set `publication_posture = target_value` and `publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'`
  ONLY after all platform-side quality gates pass
- Write `external_orchestration_ref` to the canonical column (per ORF-AUTHORITY-006)
- Emit `public_supplier_profile.provisioned.v1` on success
- Emit `public_supplier_profile.gate_failed.v1` on gate failure (do NOT reject entire record silently)
- Return `409 Conflict` if ref already exists and is already fully provisioned

**Guardrails:**
- `external_orchestration_ref` is a Gate E prohibited field — never returned in public API response
- No contact data accepted in this payload
- No CRM commercial state (approval score, commission) accepted
- Org UUID must be generated by the platform; CRM must not dictate platform UUIDs

**Proposed atomic commit message:**
```
feat(internal): add POST /api/internal/acquisition/provision-supplier (WEBHOOK-007)
```

---

### PROVISIONED-EVENTS-008: MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-PROVISIONED-EVENTS-008

**Objective:**
Wire the emission of `public_supplier_profile.provisioned.v1` and
`public_supplier_profile.gate_failed.v1` events into the provisioning webhook service.

**Status:** BLOCKED — requires WEBHOOK-007 live and GAP-ACQ-005 resolved (events registered)

**Files to inspect / change:**

| File | Change type |
| --- | --- |
| `server/src/services/acquisitionProvisioning.service.ts` | ADD `emitEvent('public_supplier_profile.provisioned.v1', ...)` and `emitEvent('public_supplier_profile.gate_failed.v1', ...)` calls |

**Note:** If EVENTS-003 has already registered these events, this unit is a mechanical wiring unit only.
If EVENTS-003 is not yet live, this unit must include the event registration from EVENTS-003 as a
same-unit necessary expansion.

**Proposed atomic commit message:**
```
feat(events): wire provisioned + gate_failed events in provisioning service (PROVISIONED-EVENTS-008)
```

---

## 7. Readiness Sequencing (Recommended Order)

The following sequence minimizes blockers and delivers usable acquisition engine integration surfaces
in the shortest dependency path:

```
1.  ROUTE-001        MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001        ← OPEN FIRST
2.  QR-SOURCE-002    MAIN-PLATFORM-SUPPLIER-PROFILE-QR-SOURCE-002            ← After ROUTE-001
3.  EVENTS-003       MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003               ← After GAP-ACQ-002 resolved
4.  INQUIRY-004      MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004                 ← After ROUTE-001 + GAP-ACQ-005 + GAP-ACQ-006
5.  REFERRAL-005     MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005                 ← After ROUTE-001 (parallel-safe)
6.  ORF-AUTHORITY-006 MAIN-PLATFORM-ORCHESTRATION-REF-AUTHORITY-006          ← Governance doc; can run parallel to 2-5
7.  WEBHOOK-007      MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007      ← After ORF-AUTHORITY-006
8.  PROVISIONED-EVENTS-008 MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-PROVISIONED-EVENTS-008 ← After WEBHOOK-007
```

**ORF-AUTHORITY-006 may be progressed in parallel with ROUTE-001 through REFERRAL-005 since it is a
documentation/governance unit that does not require code changes.**

---

## 8. Acquisition Engine Unlocks (What Becomes Available After Each Unit)

| After unit closes | Acquisition Engine can rely on |
| --- | --- |
| ROUTE-001 | Field-acquired suppliers have a live, reachable public profile URL. QR cards can point to `/supplier/:slug`. Profile page can be demoed to prospects. |
| QR-SOURCE-002 | QR card scans are attributed to the `qr` source channel. Field event and referral source channels are trackable. |
| EVENTS-003 | Profile view analytics pipeline can start ingesting `supplier_profile.viewed.v1`. Attribution data is structured. |
| INQUIRY-004 | Buyers can submit a pre-auth inquiry from a supplier profile page. Inquiry is normalized and routed to CRM for follow-up. |
| REFERRAL-005 | New prospects who receive a QR card can land at `/join/:referral_code` to learn about the platform and start the supplier application flow. |
| ORF-AUTHORITY-006 | CRM has a named canonical column to write `external_orchestration_ref` to. Idempotency contract is defined. |
| WEBHOOK-007 | CRM Acquisition Engine can call `POST /api/internal/acquisition/provision-supplier` to bring a field-acquired supplier live on the platform after approval. |
| PROVISIONED-EVENTS-008 | CRM can listen to `public_supplier_profile.provisioned.v1` to confirm a supplier profile is live, and `gate_failed.v1` to route remediation. |

---

## 9. Blockers and Risks

### 9.1 GAP-ACQ-001 — `external_orchestration_ref` Dual-Column Authority (HIGH)

**Risk:** Both `Tenant.externalOrchestrationRef` and `organizations.external_orchestration_ref` carry
`@unique` with the same semantic intent. Neither governance document names which column CRM queries.
If CRM writes to `tenants` and the provisioning webhook reads from `organizations`, the idempotency
guard will fail silently.

**Blocking:** WEBHOOK-007, PROVISIONED-EVENTS-008.
**Resolution:** ORF-AUTHORITY-006 governance artifact must be produced before WEBHOOK-007 opens.

### 9.2 Missing Event Registrations (GAP-ACQ-002, GAP-ACQ-005) (MEDIUM)

**Risk:** No `supplier_profile.*`, `buyer_inquiry.*`, or `public_supplier_profile.*` events are
registered in either `KnownEventName` or `event-names.md`. The TypeScript type constraint
on `KnownEventName` will prevent compilation of any event emission until registration occurs.
The team authority rule in `event-names.md` means the implementing unit cannot self-authorize new names.

**Blocking:** EVENTS-003, INQUIRY-004, WEBHOOK-007, PROVISIONED-EVENTS-008.
**Resolution:** Paresh / Team A authority sign-off required before EVENTS-003 opens.

### 9.3 Missing OpenAPI Entries (GAP-ACQ-004) (MEDIUM)

**Risk:** No public supplier profile path, inquiry path, or provisioning webhook path exists in any
OpenAPI contract. Per `ARCHITECTURE-GOVERNANCE.md`, OpenAPI must be updated in the same implementation
wave as the route. Deferring it creates governance debt.

**Resolution:** Each implementing unit (ROUTE-001, INQUIRY-004, WEBHOOK-007) must include the
corresponding OpenAPI spec path as an in-scope file.

### 9.4 No Public Supplier Profile Route (CRITICAL — Primary Gap)

**Risk:** Without `GET /api/public/supplier/:slug`, field-acquired suppliers have no externally
reachable platform identity. QR cards have no destination. The acquisition engine integration surface
is zero.

**Resolution:** ROUTE-001 — status READY_TO_OPEN — open next.

### 9.5 Contact-Data Exposure Risk (CONSTITUTIONAL PROHIBITION)

**Risk:** Any future pressure to add `contact_phone`, `contact_email`, `website`, or `linkedin` to
the public supplier profile response. The schema intentionally lacks these fields on `organizations`.

**Mitigation:** Gate E prohibition is unconditional. These fields must not be added to schema or
exposed in any public API surface. Contact reveal happens only in authenticated CRM-backed workflow.

### 9.6 Public Endpoint Abuse / Rate-Limit Risk (MEDIUM)

**Risk:** Both `GET /api/public/supplier/:slug` and `POST /api/public/inquiry/submit` are
unauthenticated public endpoints. Without rate limiting, both are scraping and spam vectors.

**Mitigation for profile route:** Rate limit at same tier as `GET /api/public/b2b/suppliers`
(or stricter per-slug). Exact budget must be defined in implementing unit.
**Mitigation for inquiry route:** GAP-ACQ-006 must define the per-IP rate-limit budget before
INQUIRY-004 opens.

### 9.7 Layer 0 / Active Delivery Interaction (LOW for ROUTE-001)

**Risk:** GAP-ACQ-003 (AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS blocked by Layer 0) is recorded
as a blocker for the authenticated aggregator workspace. However, `GET /api/public/supplier/:slug`
is an unauthenticated public route and is independent of the authenticated aggregator surface.
ROUTE-001 is not blocked by Layer 0.

**Clarification:** Confirm at ROUTE-001 opening time that the Layer 0 posture applies only to
authenticated aggregator workspace surfaces.

---

## 10. Final Readiness Verdict

**Current platform readiness for Customer Acquisition Engine connection: NOT READY**

The platform has the correct data foundation:
- Five-gate projection safety architecture is well-designed and reusable
- `organizations.slug` is `@unique` in schema
- `publicEligibilityPosture` and `publication_posture` entitlement fields exist
- The B2B discovery object model is governance-decided (`TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1`)
- No schema changes are required for ROUTE-001

**The platform currently lacks all acquisition engine integration surface:**
- No public supplier profile detail endpoint
- No QR scan destination
- No acquisition provisioning webhook receiver
- No buyer inquiry intake
- No acquisition-relevant events defined or registered
- The `external_orchestration_ref` dual-column gap (GAP-ACQ-001) is unresolved

**First unit to open:** `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` — READY_TO_OPEN

**Must remain blocked until prerequisites met:**
- EVENTS-003, INQUIRY-004, WEBHOOK-007, PROVISIONED-EVENTS-008 — all blocked by specific gaps
- ORF-AUTHORITY-006 — can progress in parallel as a documentation unit
- QR-SOURCE-002, REFERRAL-005 — can open after ROUTE-001

**What Acquisition Engine may NOT proceed on yet:**
- Any dependency on `supplier_profile.viewed.v1` event (not yet registered)
- Any CRM provisioning handoff (no webhook; GAP-ACQ-001 unresolved)
- Any buyer inquiry intake (no endpoint; no rate-limit budget)

---

## 11. Governance Contracts Consulted (Read-Only)

| Contract | Path | Relevance |
| --- | --- | --- |
| B2B Public Discovery and Inquiry Model | `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` | Discovery object model, inquiry model, payload allowlist |
| Public Visibility and Projection Model | `governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` | B2B vs B2C projection category rules |
| CRM–Platform Canonical Handoff Contract | `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Non-ownership of CRM commercial objects |
| CRM–Platform Data Reality Reconciliation | `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Missing cross-system seams; dual orchestration-ref gap |
| Architecture Governance | `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | OpenAPI obligation; atomic change envelope; plane separation |
| Event Names Contract | `shared/contracts/event-names.md` | Event domain registration authority |
| Acquisition Engine Boundary Design | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | Primary input artifact for this tracker |

---

*This artifact is planning-only. No schema, routes, services, frontend states, events, or OpenAPI
contracts were modified. No implementation unit is opened by this artifact.*
