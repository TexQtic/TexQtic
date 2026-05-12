# MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1

Unit ID: MAIN-PLATFORM-ACQUISITION-BOUNDARY-DESIGN-001
Title: Main TexQtic Platform / Aggregator Directory — Acquisition Engine Ownership Boundary
Status: PLANNING ARTIFACT ONLY — NO IMPLEMENTATION
Date: 2026-05-30
Authorized by: Paresh
Basis: Repo-truth audit — no governance documents used as authority source, no implementation changes, no schema mutations, no migrations

---

## 1. Purpose

This artifact defines, from repo truth, exactly what the Main TexQtic Platform (the Aggregator Directory /
B2B Exchange runtime) must own, must expose, and must not own in the hybrid TexQtic Customer Acquisition
Engine / App architecture.

Scope:

- Read and record current-state platform truth against each ownership category
- Identify gaps between what the platform currently provides and what is required for the acquisition engine
  to have a coherent integration surface
- Define the non-ownership boundary that prevents the Main Platform from absorbing acquisition-side
  operational concerns that belong to CRM, marketing, or field tools

This artifact does not:

- Authorize implementation of any gap
- Modify schema, routes, events, or governance contracts
- Replace or supersede any currently open bounded product decision or implementation unit
- Advance any opening that is currently blocked by Layer 0 constraints

---

## 2. Repo-Truth Snapshot — What the Platform Currently Owns

### 2.1 Unauthenticated Public Discovery Surface

| Surface | Route | Source file | Gate model | Status |
| --- | --- | --- | --- | --- |
| B2B supplier list | `GET /api/public/b2b/suppliers` | `server/src/services/publicB2BProjection.service.ts` | Five-gate safety architecture (see §2.4) | LIVE |
| B2C product browse | `GET /api/public/b2c/products` | `server/src/routes/public.ts` | Separate gate path for B2C posture | LIVE |
| DPP product passport | `GET /api/public/dpp/:publicPassportId` | `server/src/routes/public.ts` | Rate limited (100/15 min/IP), published DPP only | LIVE |
| DPP structured-data | `GET /api/public/dpp/:publicPassportId/structured-data` | `server/src/routes/public.ts` | Mirrors passport; structured JSON output | LIVE |
| Public entry resolver | `GET /api/public/entry/resolve` | `server/src/routes/public.ts` | No auth required | LIVE |
| Tenant slug resolver | `GET /api/public/tenants/resolve?slug=` | `server/src/routes/public.ts` | Returns `{ tenantId, slug, name }` only | LIVE |
| Tenant by-email resolver | `GET /api/public/tenants/by-email?email=` | `server/src/routes/public.ts` | Returns `{ tenants: [{tenantId, slug, name}] }` only | LIVE |

No individual public supplier profile detail endpoint exists. The `organizations.slug` field is present in
schema (`server/prisma/schema.prisma`, `organizations` model, field `slug varchar(100) @unique`) but is
never used as a URL segment in any unauthenticated route.

### 2.2 Authenticated Aggregator / Discovery Surface

| Surface | Route | Source file | Auth requirement | Status |
| --- | --- | --- | --- | --- |
| Aggregator discovery workspace | `GET /api/tenant/aggregator/discovery` | `server/src/routes/tenant.ts` | Authenticated AGGREGATOR or INTERNAL `org_type` only | LIVE |
| AI supplier profile completeness | `POST /api/tenant/supplier-profile/ai-completeness` | `server/src/routes/tenant.ts` | Authenticated tenant (own org only); result is transient, not persisted | LIVE |

The aggregator discovery route is strictly read-only. It returns: `orgId`, `slug`, `legalName`, `orgType`,
`jurisdiction`, `certificationCount`, `certificationTypes`, `hasTraceabilityEvidence`,
`visibilityIndicators`, and `discoverySafeTaxonomy`. No contact, no phone, no price, no negotiation state.

The AI completeness service operates only on the authenticated caller's own organization. It is an
internal self-assessment tool, not a public profile or acquisition handoff surface.

### 2.3 Frontend Public Routes (App State Machine)

| State | Route pattern | Component | Notes |
| --- | --- | --- | --- |
| `PUBLIC_ENTRY` | `/` | Entry landing | Unauthenticated landing |
| `PUBLIC_B2B_DISCOVERY` | N/A (state-driven) | `components/Public/B2BDiscovery.tsx` | Supplier list; no individual profile route |
| `PUBLIC_C2C_BROWSE` | N/A (state-driven) | `components/Public/B2CBrowse.tsx` | B2C browse |
| `PUBLIC_PASSPORT` | `/passport/:id` | `components/Public/PublicPassport.tsx` | Product DPP passport — NOT a supplier profile |
| `AUTH` | `/auth` | Auth flows | Authenticated session |
| `ONBOARDING` | N/A (token-driven) | Onboarding flows | Invite token flow |

No `PUBLIC_SUPPLIER_PROFILE` state exists. No `/supplier/:slug`, `/p/:slug`, or `/profile/:slug` route
pattern exists in `App.tsx`. The QR infrastructure in `PublicPassport.tsx` (`react-qr-code`) is
product-passport QR only — it is not a supplier profile QR scan destination.

### 2.4 Five-Gate Projection Safety Architecture (Current Foundation)

Located in `server/src/services/publicB2BProjection.service.ts`. Governs ALL unauthenticated B2B supplier
exposure. All five gates must pass; any failure = silent exclusion.

| Gate | Rule |
| --- | --- |
| Gate A | `tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'` |
| Gate B | `org.publication_posture IN ('B2B_PUBLIC', 'BOTH')` |
| Gate C | `org.org_type === 'B2B'` |
| Gate D | `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')` |
| Gate E | Payload field allowlist enforced; prohibited fields NEVER in output |

**Prohibited payload fields (Gate E — unconditional):** price, org UUIDs, negotiation state, order/trade
state, admin/governance fields, `risk_score`, `plan`, `registration_no`,
`external_orchestration_ref`, draft data.

**Allowed payload fields:** `slug`, `legal_name`, `org_type`, `jurisdiction`, `certificationCount`
(approved certs only), `certificationTypes` (max 10), `hasTraceabilityEvidence` (SHARED visibility only),
taxonomy (`primarySegment`, `secondarySegments`, `rolePositions`), `offeringPreview` (name, moq,
imageUrl — NO price, max 5 items).

This five-gate pattern is the correct foundation for any future public supplier profile detail endpoint.

### 2.5 Entitlement Schema Fields (Current)

Both fields exist in `server/prisma/schema.prisma`:

- `tenants.publicEligibilityPosture` — `TenantPublicEligibilityPosture` enum:
  `NO_PUBLIC_PRESENCE | LIMITED_PUBLIC_PRESENCE | PUBLICATION_ELIGIBLE`
- `organizations.publication_posture` — enum:
  `PRIVATE_OR_AUTH_ONLY | B2B_PUBLIC | B2C_PUBLIC | BOTH`

These are the two canonical entitlement gatekeeping fields for any acquisition-engine integration.

### 2.6 Cross-System Identity Fields (Current)

Both fields exist in schema and carry `@unique`:

- `tenants.external_orchestration_ref` — intended cross-system CRM↔Platform link anchor
- `organizations.external_orchestration_ref` — parallel field on the org record

**Open gap (from CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1):** No document currently
states which of these two columns CRM queries. Dual columns with separate unique constraints carry a
divergence risk. The canonical orchestration ref lookup authority is unresolved.

### 2.7 Event System (Current Known Events)

Events are defined in `server/src/lib/events.ts` (`KnownEventName` union type).

Current event domains: `tenant.*`, `team.*`, `marketplace.cart.*`, `ai.inference.*`, `ai.control.*`,
`ai.vector.*`.

**No events exist for:** supplier profile views, buyer inquiries, acquisition handoff, QR scan tracking,
referral entry, or public discovery intent.

---

## 3. What the Platform Must Own (Required — Currently Missing)

These are capabilities required for the acquisition engine architecture to have a coherent platform
integration surface. None of these are authorized for implementation by this artifact.

### 3.1 Public Supplier Profile Detail Endpoint and Route

**Required:** `GET /api/public/supplier/:slug`

This is the single most critical missing piece for acquisition engine integration. Without it:
- Field-acquired suppliers cannot have a public profile URL to give to prospects
- QR card scans have no valid platform destination
- The discovery engine has no individual supplier identity destination after list browse
- Acquisition-engine-provisioned suppliers cannot be surfaced as validated platform entities

The endpoint MUST:
- Reuse the five-gate projection safety architecture from `publicB2BProjection.service.ts`
- Enforce Gate A (`PUBLICATION_ELIGIBLE`) + Gate B (`B2B_PUBLIC` or `BOTH`) + Gate D (`ACTIVE` or `VERIFICATION_APPROVED`) per the existing model
- Return only the allowed payload categories defined in `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §3.1
- Never expose: price, contact details (no `contact_phone`, `contact_email`), `registration_no`,
  `risk_score`, `plan`, `external_orchestration_ref`, negotiation state, order/trade state
- Return a structured `SUPPLIER_DISCOVERY_PROFILE` + `SUPPLIER_CAPABILITY_PROFILE` +
  `TRUST_QUALIFICATION_PREVIEW` + `BOUNDED_OFFERING_PREVIEW` composition per the B2B discovery
  object model

The frontend MUST expose a corresponding route (`/supplier/:slug` or `/p/:slug`) backed by a new
`PUBLIC_SUPPLIER_PROFILE` app state in `App.tsx`.

**Governance authority:** `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` (DECIDED)

### 3.2 QR Source Tracking Parameter

**Required:** `GET /api/public/supplier/:slug?source=qr` (or `?ref=qr-card`, `?ref=trade-show`)

Field-acquired suppliers are found via physical QR cards. The platform must be able to receive and record
the acquisition source channel when a QR card is scanned. This is not contact capture — it is event-level
channel attribution.

The source parameter MUST:
- Be optional (non-presence = web/organic)
- Be strictly enumerated (`qr`, `referral`, `event`, `direct` — no freeform strings)
- Be attached to a `supplier_profile.viewed.v1` event (see §3.4)
- Never be used to create a buyer identity or pre-auth session

### 3.3 Acquisition Engine Provisioning Webhook Receiver

**Required:** `POST /api/internal/acquisition/provision-supplier` (internal-realm, not public)

When the CRM/Acquisition Engine has approved a supplier for platform presence, the Main Platform needs
a governed provisioning handoff endpoint. This is the platform's side of the cross-system seam documented
in `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1` as **currently missing**.

This endpoint MUST:
- Be internal-realm only (authenticated internal caller or signed webhook — not anonymous public)
- Accept the canonical cross-system handoff payload: `external_orchestration_ref` (CRM onboarding case ID),
  plus the minimum required provisioning fields (org type, legal name, jurisdiction, segment, publication
  posture target)
- Write `external_orchestration_ref` to `organizations.external_orchestration_ref` (see §2.6 open gap —
  this must be resolved before building)
- Set `publication_posture = 'B2B_PUBLIC'` and trigger `publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'`
  only after all platform-side quality gates pass
- Emit a `public_supplier_profile.provisioned.v1` event (see §3.4)
- Be strictly idempotent: re-submitting the same `external_orchestration_ref` must be a no-op or return the
  existing record

**Prerequisite:** The `external_orchestration_ref` dual-column gap (§2.6) must be resolved to define
which column is canonical before this endpoint can be built.

### 3.4 New Required Events

The following events do not exist in `KnownEventName` and must be defined before any corresponding platform
feature is built. Event naming must follow the governing rule: domain-prefixed, snake_case.

| Required event | Domain | Trigger | Key payload (discovery-safe only) |
| --- | --- | --- | --- |
| `supplier_profile.viewed.v1` | `supplier_profile` | Unauthenticated `GET /api/public/supplier/:slug` | `slug`, `source_channel` enum, `viewer_geo_band` (optional), `timestamp` — NO orgId, NO buyer identity |
| `buyer_inquiry.created.v1` | `buyer_inquiry` | Buyer submits pre-auth inquiry from profile page | `supplier_slug`, `inquiry_category`, `geo_band`, `volume_band` — NO raw contact data, NO email |
| `public_supplier_profile.provision_requested.v1` | `public_supplier_profile` | CRM provisioning handoff received | `external_orchestration_ref`, `org_type`, `segment` — NO price, NO personal data |
| `public_supplier_profile.provisioned.v1` | `public_supplier_profile` | Platform entitlement gates passed; profile is live | `slug`, `external_orchestration_ref`, `publication_posture` |
| `public_supplier_profile.gate_failed.v1` | `public_supplier_profile` | Provisioning request received but one or more gates failed | `external_orchestration_ref`, `failed_gate` enum, reason code — NO raw payload |

These events must be registered in both `shared/contracts/event-names.md` and
`server/src/lib/events.ts` (`KnownEventName` union) before any platform code emits them.

### 3.5 Buyer Inquiry Pre-Auth Intake

**Required:** `POST /api/public/inquiry/submit`

This is the platform-side of the public inquiry model defined in
`TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §4. It is the minimum public-triggered,
non-binding intake event for a buyer initiating contact from a supplier profile page.

This endpoint MUST:
- Accept only the minimum lawful pre-auth inquiry payload: supplier reference (slug), high-level need
  summary, geo context, volume band — NO raw email, NO phone, NO buyer name as required fields
- Not create a public messaging thread or supplier-owned public continuity
- Emit `buyer_inquiry.created.v1`
- Route the intake to CRM-side handling (the platform owns the intake normalization; CRM owns follow-up)
- Be rate limited (per-IP, same pattern as `GET /api/public/dpp/:publicPassportId`)

### 3.6 Referral / Join Landing Route

**Required:** Frontend state `PUBLIC_REFERRAL_LANDING` with route `/join/:referral_code`

When a field agent hands a printed QR card to a prospect who is NOT an existing supplier, the prospect
should be able to land on a TexQtic-hosted page that explains the platform and starts the supplier
application flow.

The platform owns the landing destination only. It does not own the referral code generation, commission
ledger, or field agent assignment. CRM owns those.

The join landing MUST:
- Accept a `referral_code` path segment and pass it through to the downstream application form
- Emit no server-side event that creates a platform record just from a page view
- Never use `referral_code` as a pre-auth identity token

---

## 4. What the Platform Must Expose (Integration Surface Commitments)

These are the observable, typed API contracts that the acquisition engine and external tooling may depend
on. None of these may be changed without updating the corresponding OpenAPI contract.

| Surface | Type | Required consumers | Current status |
| --- | --- | --- | --- |
| `GET /api/public/supplier/:slug` | Public REST | Acquisition-provisioned profile viewer, QR card scans, field-agent preview | NOT BUILT |
| `GET /api/public/b2b/suppliers` | Public REST | Organic discovery, aggregator browse, acquisition engine list verification | LIVE |
| `POST /api/internal/acquisition/provision-supplier` | Internal REST / webhook | CRM Acquisition Engine provisioning handoff | NOT BUILT |
| `POST /api/public/inquiry/submit` | Public REST | Buyer pre-auth inquiry from profile page | NOT BUILT |
| `supplier_profile.viewed.v1` event | Event (append-only) | Analytics pipeline, acquisition-engine attribution | NOT DEFINED |
| `public_supplier_profile.provisioned.v1` event | Event (append-only) | CRM activation confirmation, platform audit | NOT DEFINED |
| `buyer_inquiry.created.v1` event | Event (append-only) | CRM inquiry routing, analytics | NOT DEFINED |
| `external_orchestration_ref` lookup | Query-time join key | CRM idempotency check, duplicate-guard | SCHEMA EXISTS — dual-column gap unresolved |

**OpenAPI obligation:** When `GET /api/public/supplier/:slug`, `POST /api/internal/acquisition/provision-supplier`,
or `POST /api/public/inquiry/submit` are built, the implementing unit must update
`shared/contracts/openapi.tenant.json` or `shared/contracts/openapi.control-plane.json` (as appropriate)
in the same implementation wave per the OpenAPI Contract Governance rule in `ARCHITECTURE-GOVERNANCE.md`.

---

## 5. What the Platform Must Not Own (Non-Ownership Boundary)

The following capabilities must NEVER migrate into the Main Platform repo, even if the acquisition engine
requires them. Ownership belongs to CRM, marketing, field tools, or external orchestration.

### 5.1 CRM-Owned — Never Platform

| Capability | Why it belongs in CRM |
| --- | --- |
| Lead qualification and scoring | Commercial operations; requires CRM workflow continuity |
| Duplicate supplier detection and resolution | CRM data-quality concern; platform cannot see CRM raw submission pool |
| Commission ledger and field-agent payout | Financial reconciliation for CRM/back-office operations |
| Referral code generation and assignment | CRM business logic; platform only consumes the referral code as a passthrough |
| Onboarding case lifecycle (new → approved → issuance) | Canonical CRM pre-runtime business-truth chain |
| `crm.onboarding.approved` state ownership | CRM owns approval posture; platform owns runtime entitlement |
| Acquisition draft records as platform canonical truth | Drafts must not be written to platform `organizations` until the platform provisioning handoff is complete |
| Field-agent task and assignment management | CRM / field tool operational concern |
| WhatsApp or messaging provider orchestration | External communications layer; not a platform runtime concern |
| Commission approval / payment disbursement | Finance operations; platform must not imply money movement or hold funds |

### 5.2 Field-Tool-Owned — Never Platform

| Capability | Why it belongs in the field tool |
| --- | --- |
| Local sync state for offline field operations | Device-side concern |
| Supplier scan history on the field agent's device | Local device audit trail |
| QR card generation and print batching | Field tool production concern |
| WhatsApp thread capture and normalization | Messaging provider integration; field tool owns raw thread |
| Pre-submission supplier data capture on mobile | Field tool capture concern; platform receives the normalized provisioning handoff only |
| Field-agent authentication and session | Separate auth context from platform tenant auth |

### 5.3 Platform Non-Ownership of Contact Data

The platform schema (`organizations` model) has no `contact_phone`, `contact_email`, `website`, or
`linkedin` fields. This is intentional. The platform MUST NOT add raw personal contact data fields to the
`organizations` public-safe projection.

**Contact reveal is not authorized** for any public API surface in this boundary. If buyer-supplier contact
is required post-inquiry, that handoff belongs in the authenticated CRM-backed workflow, not in the public
platform API.

### 5.4 Cross-System Identity Non-Ownership

The platform MUST NOT:
- Treat `tenants.external_orchestration_ref` as equivalent to `organizations.external_orchestration_ref`
  (the dual-column gap must be resolved before either is used as the canonical CRM lookup key)
- Accept CRM account IDs or marketing submission IDs as platform-native identifiers
- Expose `external_orchestration_ref` in any public API response (it is a Gate E prohibited field)
- Store or relay CRM approval state, issuance state, or commercial posture as platform truth
  (those are CRM-owned fields by the `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1`)

---

## 6. Open Gaps and Required Pre-Work

The following gaps must be resolved before any implementation unit in the acquisition integration surface
opens. Each gap is a hard prerequisite.

| Gap ID (provisional) | Gap description | Blocking what | Resolution required |
| --- | --- | --- | --- |
| GAP-ACQ-001 | `external_orchestration_ref` dual-column authority unresolved — both `tenants` and `organizations` have the field with `@unique` but no governance document names which column is canonical for CRM lookup | `POST /api/internal/acquisition/provision-supplier` idempotency and CRM join key | Produce a governance decision artifact naming `organizations.external_orchestration_ref` as the canonical CRM handoff key (or the reverse); retire or shadow the other |
| GAP-ACQ-002 | No `supplier_profile.*` events are registered in `KnownEventName` or `event-names.md` | `GET /api/public/supplier/:slug` view tracking, provisioning audit | Add events to both files before implementing any event-emitting route |
| GAP-ACQ-003 | `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` candidate is still blocked by Layer 0 opening constraints | Aggregator home truthfulness (not the public profile, but dependent on the same discovery data plane) | Resolve current `SOLE ACTIVE_DELIVERY` blocking posture before opening |
| GAP-ACQ-004 | No OpenAPI spec entries exist for any acquisition integration endpoint | OpenAPI governance compliance per `ARCHITECTURE-GOVERNANCE.md` | New spec paths must be authored before or with the implementing unit, not after |
| GAP-ACQ-005 | `buyer_inquiry.*` and `public_supplier_profile.*` events have no domain prefix registration | `POST /api/public/inquiry/submit` event emission | Add to `event-names.md` with team authority sign-off |
| GAP-ACQ-006 | No pre-auth rate-limit budget defined for `POST /api/public/inquiry/submit` | Prevents defining the rate-limit plugin configuration for the inquiry endpoint | Rate-limit parameters must be specified before implementing the inquiry intake endpoint |

---

## 7. Recommended First Implementation Unit

**Unit ID (provisional):** `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001`

**Scope:** Build `GET /api/public/supplier/:slug` and the corresponding frontend route
(`/supplier/:slug` or `/p/:slug`, new `PUBLIC_SUPPLIER_PROFILE` app state in `App.tsx`).

**Why first:**
- It is the single dependency that blocks all acquisition engine integration surface (QR destinations,
  profile preview, inquiry entry)
- It fully reuses the existing five-gate safety architecture (no new gatekeeping logic needed)
- It does not require the `external_orchestration_ref` gap to be resolved (the profile endpoint is a
  lookup by slug, not by CRM ref)
- It does not require new events to go live (profile views can start as structured logs and be upgraded
  to events once GAP-ACQ-002 is resolved)
- The `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` (DECIDED) provides the payload model
  authority

**Prerequisites for this unit only:**
1. GAP-ACQ-004 (OpenAPI entry for the new route) — can be resolved within the same unit
2. Confirm `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` Layer 0 status will not conflict
   (this is a public unauthenticated route, so Layer 0 blocking applies to Aggregator authenticated
   surfaces only — this route is independent)

**Explicit exclusions for this first unit:**
- No inquiry intake form in scope
- No QR source attribution in scope (add in v2 of the unit or a follow-on unit)
- No provisioning webhook receiver in scope
- No new schema changes in scope (slug exists; 5-gate fields exist)
- No changes to `KnownEventName` in scope unless GAP-ACQ-002 is resolved first

---

## 8. Platform Readiness Verdict

**Current platform readiness for acquisition engine integration: NOT READY**

The platform has the correct data foundation:
- Five-gate projection safety architecture is well-designed and reusable
- `publicEligibilityPosture` and `publication_posture` entitlement fields exist in schema
- `organizations.slug` is present and unique
- The B2B discovery object model is governance-decided

The platform lacks the following integration surface:
- No public supplier profile detail endpoint exists
- No QR-to-profile route exists
- No acquisition provisioning webhook receiver exists
- No buyer inquiry intake exists
- No acquisition-relevant events are defined or registered
- The cross-system orchestration ref dual-column gap (GAP-ACQ-001) is unresolved

**A public supplier profile detail route (`GET /api/public/supplier/:slug`) must be built before any
acquisition engine handoff is meaningful.** Without it, acquisition-provisioned suppliers exist in the
platform database but have no externally reachable identity surface.

---

## 9. Governance Contracts Consulted (Read-Only)

| Contract | Path | Relevance |
| --- | --- | --- |
| B2B Public Discovery and Inquiry Model | `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` | Defines B2B discovery object classes, allowed/prohibited payload categories, inquiry model |
| CRM–Platform Canonical Handoff Contract | `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Defines cross-system object chain; platform non-ownership of CRM commercial objects |
| CRM–Platform Data Reality Reconciliation | `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Identifies missing cross-system seams; dual `external_orchestration_ref` gap |
| Architecture Governance | `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | OpenAPI obligation; atomic change envelope; plane separation |
| Event Names Contract | `shared/contracts/event-names.md` | Event domain registration authority |
| Aggregator Discovery Workspace Truthfulness Decision | `governance/decisions/AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS-BOUNDED-PRODUCT-DECISION-v1.md` | Aggregator opening candidate status; Layer 0 blocking posture |
| Public Visibility and Projection Model Decision | `governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` | B2B vs B2C projection category rules |

---

*This artifact is planning-only. No schema, routes, events, or implementations were modified. No implementation unit is opened by this artifact.*
