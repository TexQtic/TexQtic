# AGGREGATOR-DIRECTORY-ACQUISITION-INTEGRATION-DESIGN-v1.md

**Unit ID:** AGGREGATOR-DIRECTORY-ACQUISITION-INTEGRATION-DESIGN-001  
**Type:** Design / boundary artifact — docs-only  
**Date:** 2026-05-12  
**Mode:** Design authority only. No implementation. No schema mutation. No migrations. No runtime code changes.  
**Status:** DESIGN_ARTIFACT — does not authorize any implementation unit  
**Authorized by:** Paresh  
**Commit:** docs(aggregator): design acquisition integration boundary

---

## 1. Purpose

This artifact defines the Aggregator Directory layer's role in the TexQtic Customer Acquisition Engine
and App integration architecture.

Specifically, it answers:
1. What the Aggregator Directory currently owns in the repo today
2. What the Aggregator Directory does not own and must not absorb
3. How the Aggregator layer relates to public B2B discovery
4. How the Aggregator layer may later consume acquisition-provisioned supplier profiles
5. How the Aggregator layer must remain separate from public supplier profile routes, CRM review,
   field acquisition operations, WhatsApp orchestration, QR generation, and buyer transaction workflows

**This artifact is boundary and design authority only.** It does not authorize the opening of any
implementation unit. Opening any unit described herein requires a separate explicit authorization.

**Supersedes:** Nothing. Augments the following existing artifacts:
- `docs/product-truth/AGGREGATOR-LAYER-REPO-TRUTH-AUDIT-v1.md` (primary source)
- `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md`
- `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md`

---

## 2. Source Artifacts Reviewed

### 2.1 Primary Input Artifacts

| Artifact | Role |
| --- | --- |
| `docs/product-truth/AGGREGATOR-LAYER-REPO-TRUTH-AUDIT-v1.md` | **Primary source.** Full repo-truth inventory of current Aggregator layer state, gaps, blockers, and acquisition integration overlaps |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` | 8-unit acquisition tracker (ROUTE-001 through PROVISIONED-EVENTS-008); readiness states; gap register |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | Platform ownership boundary design; five-gate architecture foundation; required events; platform non-ownership rules |

### 2.2 Governance Decisions Reviewed

| Artifact | Role |
| --- | --- |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` | DECIDED — payload model authority for public B2B discovery; five object classes; prohibited categories |
| `governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` | DECIDED — two-tier visibility model; publication posture vocabulary; Aggregator public eligibility note |
| `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION.md` | Classification of current `count=0` integration test failure as bounded runtime defect |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-READINESS-ASSESSMENT-v1.md` | B2B public discovery readiness assessment (7 blockers); next lawful slice definition |

### 2.3 CRM / Cross-System Artifacts Reviewed

| Artifact | Role |
| --- | --- |
| `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Cross-system object chain; handoff contract; CRM vs. Platform ownership rules |
| `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Entity/lifecycle/join-key inventory; dual `external_orchestration_ref` gap; missing CRM↔Platform bridges |

### 2.4 Layer 0 Control Files Reviewed

| File | Role |
| --- | --- |
| `governance/control/OPEN-SET.md` | Layer 0 open-set posture (last updated 2026-06-07) |
| `governance/control/NEXT-ACTION.md` | Layer 0 pointer — `active_delivery_unit: NONE_AUTHORIZED`; `product_delivery_priority: LAUNCH_GATE_CLOSED` |
| `governance/control/BLOCKED.md` | Hold register — all NC runtime mismatches resolved; WL Co `REVIEW-UNKNOWN` hold remains |

### 2.5 Repo Source Files Reviewed

| File | Role |
| --- | --- |
| `server/src/routes/tenant.ts` | Discovery route (lines 1948–2006) |
| `server/src/services/counterpartyProfileAggregation.service.ts` | Aggregator backend service |
| `server/src/lib/database-context.ts` | `aggregator_capability` derivation |
| `server/src/routes/public.ts` | All public routes — confirmed no supplier/:slug route |
| `server/src/services/publicB2BProjection.service.ts` | Five-gate public projection |
| `server/prisma/schema.prisma` | Schema audit — `TenantType` enum; absent models |
| `components/Tenant/AggregatorDiscoveryWorkspace.tsx` | Authenticated workspace component |
| `components/Public/B2BDiscovery.tsx` | Public discovery component |
| `services/aggregatorDiscoveryService.ts` | Frontend aggregator service |
| `services/publicB2BService.ts` | Frontend public B2B service |
| `App.tsx` | App state machine — aggregator capability and routing |
| `shared/contracts/openapi.tenant.json` | OpenAPI contract (aggregator/discovery endpoint) |
| `server/src/tests/aggregator-discovery-read.integration.test.ts` | Integration test — current status |

---

## 3. Executive Design Decisions

The following decisions are established by this artifact as governing design authority.
None authorize implementation.

### D-01: Public Supplier Profile Route is General Main Platform — Not Aggregator-Owned

`GET /api/public/supplier/:slug` (ROUTE-001) is a **general Main Platform surface**. It is not
owned by, scoped to, or governed by the Aggregator Directory. The Aggregator Directory is an
authenticated, org-type-gated tenant surface. Public supplier profile is an unauthenticated
public surface. These are architecturally separate and must not merge.

### D-02: Public Supplier Profile Must Use Five-Gate Projection

`GET /api/public/supplier/:slug` must be built using `getPublicB2BSupplierBySlug()` (a new function
to be added to `server/src/services/publicB2BProjection.service.ts`). All five gates apply. Any gate
failure returns 404 — not 403 — to avoid confirming the existence of non-public suppliers.

### D-03: `counterpartyProfileAggregation.service.ts` — Pattern Reference, Not Re-Exposed

The aggregator backend service (`counterpartyProfileAggregation.service.ts`) is a valid **data shape
and assembly pattern reference** for the public profile payload model. It must not be re-used as a
public route, re-exported for unauthenticated use, or placed behind any unauthenticated route handler.

Reasons:
- It does not apply Gates A and B (no `PUBLICATION_ELIGIBLE` / `B2B_PUBLIC` check)
- It returns `orgId` (UUID) — a Gate E prohibited field for any unauthenticated route
- It queries via `withOrgAdminContext` — inappropriate for public-path execution
- It returns ALL B2B/ACTIVE orgs with no publication posture filter

### D-04: Aggregator Directory Remains Authenticated and Read-Only

The authenticated aggregator discovery surface (`GET /api/tenant/aggregator/discovery`,
`AggregatorDiscoveryWorkspace.tsx`) remains exactly as designed: tenant-JWT-authenticated,
AGGREGATOR/INTERNAL org_type gated, and strictly read-only. This posture must not change without
a separate authorized design unit.

### D-05: Aggregator Is a Future Consumer of Acquisition-Provisioned Profiles

After `GET /api/public/supplier/:slug` (ROUTE-001) is live and the public profile payload shape
is stable, the Aggregator Directory may be extended to:
- Display a link to the public profile from authenticated discovery cards
- Consume the same five-gate public-safe profile shape for authenticated matching/detail views

However, the Aggregator Directory **must not define a separate, conflicting supplier detail payload
model**. The public profile shape (governed by `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1`)
is the canonical public-safe shape. Aggregator-specific enrichment (e.g., authenticated visibility
indicators beyond the five-gate payload) must be an additive authenticated extension, not a separate
public-route shape.

### D-06: Aggregator Must Not Absorb Acquisition, CRM, Field, or WhatsApp Concerns

The Aggregator Directory is bounded by its current authenticated discovery/matching purpose. It must
not become, even partially:
- a Customer Acquisition Engine acquisition draft store
- a CRM review or duplicate resolution surface
- a QR generation or field-agent assignment tool
- a WhatsApp or messaging orchestration surface
- a weekly digest or notification dispatch surface
- a buyer inquiry intake or referral code surface
- an RFQ, pricing, negotiation, order, payment, or fulfillment surface
- a public marketplace transaction owner

---

## 4. Current Aggregator Layer State (Repo Truth Confirmation)

All facts in this section are confirmed against the repo-truth audit (commit `cce8554`).

### 4.1 Live Authenticated Discovery Route

**Route:** `GET /api/tenant/aggregator/discovery`  
**File:** `server/src/routes/tenant.ts` (lines 1948–2006)  
**Auth guards:** `tenantAuthMiddleware` + `databaseContextMiddleware`  
**Org_type guard:** `!['AGGREGATOR', 'INTERNAL'].includes(tenantIdentity.org_type)` → 403  
**Query param:** `limit` — integer 1–12, default 6 (Zod-validated)  
**Service:** `listCounterpartyDiscoveryEntries(currentOrgId, prisma, limit)`  
**Response:** `{ items: CounterpartyDiscoveryEntry[], count: items.length }`

### 4.2 Backend Service Shape

**`listCounterpartyDiscoveryEntries()`** — list projection for authenticated aggregator users:
- Filters: `id ≠ currentOrgId`, `is_white_label = false`, `org_type IN ['B2B']`,
  `status IN ['ACTIVE', 'VERIFICATION_APPROVED']`
- Selects: `slug`, `legalName`, `orgType`, `jurisdiction`, `discoverySafeTaxonomy`
- Assembles: `certificationCount`, `certificationTypes` (max 12), `hasTraceabilityEvidence`,
  `visibilityIndicators` (max 12)
- **Also returns: `orgId` (UUID)** — this field is appropriate in the authenticated tenant context
  but is Gate E prohibited for any unauthenticated public route

**`getCounterpartyProfileAggregation()`** — deeper per-org profile (identity + trustSummary +
evidenceSummary). Not wired to any route via a per-supplier public endpoint. Not publicly accessible.

### 4.3 Frontend Workspace

**File:** `components/Tenant/AggregatorDiscoveryWorkspace.tsx`  
**Confirmed absences:**
- NO contact button or contact data reveal
- NO click-through to an individual supplier profile page
- NO shortlist / collection / comparison UI
- NO inquiry initiation surface
- NO price display

Each card is labeled "Read-only discovery record". The workspace is display-only.

**App.tsx routing:** The workspace is a sub-route within `EXPERIENCE` AppState. There is no
top-level `AGGREGATOR_WORKSPACE` AppState value. Routing branch at line 4445–4453.

### 4.4 Schema and Entitlement

`aggregator_capability` is **NOT a DB column**. It is computed at runtime:
- Derived in `resolveCanonicalProvisioningIdentity()` (`server/src/lib/database-context.ts`, lines 543–565)
- Produces `aggregator_capability: true` when `org_type === 'AGGREGATOR'`; `false` for all other types
- Injected into the session transport identity; placed in JWT via `server/src/routes/auth.ts`
- Cannot be granted to a non-AGGREGATOR org; cannot be toggled independently of `org_type`

AGGREGATOR tenants resolve `base_family = 'INTERNAL'` — not `'B2B'`.

### 4.5 Events

**None.** No aggregator-specific events exist in `KnownEventName` or `shared/contracts/event-names.md`.
No `aggregator.discovery.*`, `aggregator.workspace.*`, or related events are registered.

### 4.6 OpenAPI Coverage

`GET /api/tenant/aggregator/discovery` is present in `shared/contracts/openapi.tenant.json`
(lines 1545–1600). No other aggregator paths are in any OpenAPI contract.

### 4.7 Integration Test and Runtime Defect

**File:** `server/src/tests/aggregator-discovery-read.integration.test.ts`  
**Status:** FAILING — `count=0` after seeding (expected `count >= 1`)  
**Classification:** Bounded runtime/read-shaping defect (per
`GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION.md`)  
**Governed unit:** `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` (OPEN, separate stream)  
**This defect does not block ROUTE-001** (per GAP-ACQ-003 in acquisition tracker)

---

## 5. Current Public B2B Discovery State (Repo Truth Confirmation)

### 5.1 Live Public B2B Supplier List

**Route:** `GET /api/public/b2b/suppliers` (unauthenticated)  
**Service:** `server/src/services/publicB2BProjection.service.ts`  
**Component:** `components/Public/B2BDiscovery.tsx`  
**Frontend service:** `services/publicB2BService.ts`  
**AppState:** `PUBLIC_B2B_DISCOVERY` — exists in the `AppState` union in `App.tsx` (line 1953)  
**Status:** LIVE

### 5.2 Five-Gate Architecture

| Gate | Rule |
| --- | --- |
| Gate A | `publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'` (tenant-level) |
| Gate B | `publication_posture IN ('B2B_PUBLIC', 'BOTH')` (object-level) |
| Gate C | `org_type === 'B2B'` |
| Gate D | `status IN ('ACTIVE', 'VERIFICATION_APPROVED')` |
| Gate E | Payload field allowlist — prohibits all non-public-safe fields |

**Gate E prohibited fields (unconditional):** price, org UUIDs, `external_orchestration_ref`,
contact data (`contact_phone`, `contact_email`), `registration_no`, `risk_score`, `plan`,
negotiation state, order/trade state, admin/governance fields, draft data.

**Gate E allowed fields:** `slug`, `legal_name`, `org_type`, `jurisdiction`,
`certificationCount` (approved certs only), `certificationTypes` (max 10),
`hasTraceabilityEvidence` (SHARED visibility only), taxonomy (`primarySegment`,
`secondarySegments`, `rolePositions`), `offeringPreview` (name, moq, imageUrl — NO price, max 5).

### 5.3 Confirmed Absences from Public Discovery Layer

| Surface | Status |
| --- | --- |
| `GET /api/public/supplier/:slug` (individual profile route) | **ABSENT** |
| `PUBLIC_SUPPLIER_PROFILE` AppState | **ABSENT** |
| `PublicSupplierProfile.tsx` component | **ABSENT** |
| `getPublicB2BSupplierBySlug()` function in projection service | **ABSENT** |
| OpenAPI path `GET /api/public/supplier/{slug}` | **ABSENT** |
| Buyer inquiry intake (`POST /api/public/inquiry/submit`) | **ABSENT** |
| Referral join landing (`/join/:referral_code`) | **ABSENT** |
| Collections, shortlist, comparison (any form) | **ABSENT — no schema models** |
| Buyer intent models (inquiry, handoff, buyer_intent) | **ABSENT — no schema models** |

### 5.4 Visibility Governance

Per `TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` §2.1:
> *"Aggregator does not receive general public directory eligibility by default under current
> authority; any public presence must remain narrower than a public counterparty directory and
> must not imply public transaction ownership."*
>
> *"Aggregator-owned discovery objects do not automatically become a public object class under
> this vocabulary; under current authority they remain `PRIVATE_OR_AUTH_ONLY` unless a later
> bounded unit explicitly authorizes a lawful public-safe Aggregator object class."*

This confirms that no Aggregator discovery surface may be re-exposed publicly without a separate
authorized design and governance decision.

---

## 6. Ownership Boundary

### 6.1 Aggregator Directory Owns

| Capability | Current status | Notes |
| --- | --- | --- |
| Authenticated AGGREGATOR/INTERNAL discovery workspace | LIVE | `GET /api/tenant/aggregator/discovery` + `AggregatorDiscoveryWorkspace.tsx` |
| Bounded read-only counterparty discovery cards | LIVE | No contact, no price, no profile drill-down |
| Discovery-safe taxonomy and trust signal display for authenticated aggregator users | LIVE | Primary/secondary segments, role positions, cert badges, traceability indicator |
| `aggregator_capability` entitlement derivation pattern | LIVE | Computed from `org_type`; not a DB column |
| Data shape and assembly pattern reference for supplier profile design | LIVE — pattern only | `CounterpartyDiscoveryEntry` and `getCounterpartyProfileAggregation()` as blueprint |
| Future authenticated matching/shortlist/comparison design | **DEFERRED** | Requires separate authorization; depends on ROUTE-001 being live first |
| Future consumption of acquisition-provisioned supplier profiles | **DEFERRED — future consumer role** | Aggregator may later link to or consume the public profile shape; does not define it |
| Future authenticated supplier drill-down from discovery card | **DEFERRED** | Separate design required; must use the same five-gate payload shape, not a conflicting one |

### 6.2 Aggregator Directory Does Not Own

| Capability | Correct owner | Notes |
| --- | --- | --- |
| `GET /api/public/supplier/:slug` (public supplier profile route) | **Main Platform** | ROUTE-001; five-gate projection; no Aggregator ownership |
| `GET /api/public/b2b/suppliers` (public B2B supplier list) | **Main Platform** | Already live; not Aggregator-owned |
| QR card scan destination and routing | **Main Platform** | Resolves via public supplier profile route |
| QR card generation and print batch production | **Field Tool** | Not a platform or Aggregator concern |
| Customer Acquisition Engine acquisition drafts and pipeline | **CRM / Acquisition Engine** | Pre-runtime candidate pool; Aggregator never receives raw CRM draft data |
| Field-agent offline sync and device-side capture | **Field Tool** | Device concern; platform receives only the normalized provisioning handoff |
| CRM review, approval, duplicate resolution | **CRM** | CRM owns the onboarding case lifecycle and approval posture |
| Field-agent task and assignment management | **CRM / Field Tool** | Operational CRM domain |
| WhatsApp orchestration and messaging provider integration | **CRM / Field Tool** | External communications layer; never a platform or Aggregator runtime concern |
| Weekly digest dispatch | **CRM / Marketing** | Notification/engagement layer; outside platform scope |
| Buyer inquiry intake (`POST /api/public/inquiry/submit`) | **Main Platform** | INQUIRY-004; platform-mediated public intake only |
| Referral code generation, commission ledger, field-agent payout | **CRM** | CRM owns referral attribution; platform only receives referral code as a passthrough |
| Referral join landing page (`/join/:referral_code`) | **Main Platform** | REFERRAL-005; frontend-only passthrough; platform receives the code |
| RFQ, pricing, negotiation, order, payment, fulfillment | **Authenticated B2B Exchange** | Authenticated downstream continuity; not a public or Aggregator surface |
| Contact data reveal (any form) | **PROHIBITED** | Gate E; `contact_phone` and `contact_email` absent from schema by design |
| `external_orchestration_ref` in any public API response | **PROHIBITED** | Gate E prohibited field |
| Commission approval and payment disbursement | **Finance / CRM** | Platform must not imply money movement or hold funds |

---

## 7. Public Profile Relationship

### 7.1 ROUTE-001 Ownership and Design

`MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` is a **general Main Platform unit**. The Aggregator
Directory is an indirect pattern source only — it does not own the route, the projection function, the
OpenAPI contract, or the frontend component.

The route MUST:
- Be implemented in `server/src/routes/public.ts` (unauthenticated)
- Call `getPublicB2BSupplierBySlug(slug, prisma)` — a new function in
  `server/src/services/publicB2BProjection.service.ts`
- Apply all five gates; gate failure = 404 (not 403)
- Return the composite payload: `SUPPLIER_DISCOVERY_PROFILE` + `SUPPLIER_CAPABILITY_PROFILE` +
  `TRUST_QUALIFICATION_PREVIEW` + `BOUNDED_OFFERING_PREVIEW` per
  `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §2 and §3

The route MUST NOT return:
- `orgId` (org UUID) — Gate E prohibited; unauthenticated routes must never expose internal IDs
- `external_orchestration_ref` — Gate E prohibited
- Contact data (`contact_phone`, `contact_email`) — absent from schema; Gate E prohibited
- Price — Gate E prohibited
- `risk_score`, `plan`, `registration_no` — Gate E prohibited
- Negotiation state, order/trade state, admin/governance fields — Gate E prohibited

**Payload shape authority:** `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` (DECIDED)

### 7.2 Aggregator as Future Consumer (Not Owner)

After ROUTE-001 is live, the Aggregator Directory may:
- Link authenticated discovery cards to the public profile URL (`/supplier/:slug`) for context
- Reuse the five-gate public-safe payload shape for authenticated matching context

The Aggregator Directory **must not** define a separate conflicting supplier detail payload model.
The five-gate payload is the canonical public-safe shape. Any authenticated enrichment the Aggregator
adds (e.g., `visibilityIndicators`, richer trust signals, org UUIDs appropriate in authenticated
context) must be a distinct authenticated extension on top of — not instead of — the public shape.

### 7.3 Why `counterpartyProfileAggregation.service.ts` Cannot Be Re-Exposed

The aggregator service may be used as a **design blueprint** for the per-slug profile assembly
pattern (how to join certifications, traceability nodes, and taxonomy into a per-org record).
It cannot be re-exposed publicly because:

1. **Authentication context mismatch:** Uses `withOrgAdminContext` — admin-realm service role not
   appropriate for unauthenticated public paths
2. **orgId exposure:** Returns `orgId` in the `CounterpartyDiscoveryEntry` — Gate E prohibits this
   for any unauthenticated route
3. **No eligibility gate:** Does not check `publicEligibilityPosture` (Gate A) or `publication_posture`
   (Gate B) — would expose all B2B/ACTIVE orgs regardless of their publication posture
4. **Dual-use violation:** Making the service serve both authenticated aggregator context and
   unauthenticated public context would violate the separation-of-context principle and risk
   Gate E leakage through future changes

The correct pattern is: `publicB2BProjection.service.ts` gets a new `getPublicB2BSupplierBySlug()`
function that assembles the same data categories using the same join patterns as
`getCounterpartyProfileAggregation()`, but filtered through all five gates and stripped of Gate E
fields before projection.

---

## 8. Relationship to Acquisition Implementation Tracker (All 8 Units)

| Unit ID | Unit Name | Status | Aggregator Relationship | Notes |
| --- | --- | --- | --- | --- |
| ROUTE-001 | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` | **READY_TO_OPEN** | **Indirect pattern source only** — `counterpartyProfileAggregation.service.ts` provides data assembly blueprint; Aggregator does not own the route, projection service, OpenAPI entry, or frontend component | No Aggregator ownership. Aggregator is a future consumer of the live profile. |
| QR-SOURCE-002 | `MAIN-PLATFORM-SUPPLIER-PROFILE-QR-SOURCE-002` | NOT_READY (requires ROUTE-001) | **No Aggregator ownership** — QR source tracking is a Main Platform attribution concern; Aggregator does not generate QR cards or receive scan events | QR destination resolves via public profile, not via the authenticated aggregator workspace |
| EVENTS-003 | `MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003` | BLOCKED (GAP-ACQ-002) | **No Aggregator ownership** — `supplier_profile.*` events are Main Platform event registry entries; Aggregator may later need its own discovery events (e.g., `aggregator.discovery.viewed.v1`) but those are a separate future registration and are NOT part of EVENTS-003 | Aggregator events must not be conflated with supplier profile view events |
| INQUIRY-004 | `MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004` | BLOCKED (ROUTE-001 + GAP-ACQ-005/006) | **No Aggregator ownership** — buyer inquiry is a public pre-auth intake belonging to Main Platform; Aggregator is an authenticated post-auth discovery surface; the two must remain separate | An inquiry surface must never appear inside the Aggregator workspace |
| REFERRAL-005 | `MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005` | NOT_READY (ROUTE-001 recommended) | **No Aggregator ownership** — referral join landing is a public frontend-only surface for pre-auth prospects; Aggregator is an authenticated workspace for tenant users | Referral code generation and commission belong to CRM, not Aggregator |
| ORF-AUTHORITY-006 | `MAIN-PLATFORM-ORCHESTRATION-REF-AUTHORITY-006` | REQUIRED_BEFORE_WEBHOOK | **Indirect governance concern only** — `organizations.external_orchestration_ref` exists in the `organizations` table that the aggregator service queries; however, the field is never selected in `listCounterpartyDiscoveryEntries()` output; the dual-column gap does not block Aggregator discovery | Resolution of GAP-ACQ-001 is a governance requirement for the webhook stream, not for Aggregator |
| WEBHOOK-007 | `MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007` | BLOCKED (ORF-AUTHORITY-006) | **No Aggregator ownership** — the provisioning webhook is an internal-realm Main Platform receiver for CRM handoff; Aggregator consumes provisioned profiles after the fact but has no role in the provisioning handoff chain | Provisioning webhook writes to `organizations`; Aggregator reads from `organizations` post-provisioning |
| PROVISIONED-EVENTS-008 | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-PROVISIONED-EVENTS-008` | BLOCKED (WEBHOOK-007 + GAP-ACQ-005) | **No Aggregator ownership** — provisioning events (`public_supplier_profile.provisioned.v1`, `gate_failed.v1`) are Main Platform audit events; Aggregator may subscribe to these for its own discovery refresh but does not emit them | Event subscription by Aggregator is a future authenticated concern, not part of PROVISIONED-EVENTS-008 scope |

### 8.1 Summary

Only ROUTE-001 has any relationship to the Aggregator layer (as an indirect pattern source).
The other 7 units are fully Main Platform-owned. The Aggregator Directory is a **future consumer**
of the platform integration surface, not an owner or contributor to any of these 8 units.

---

## 9. Aggregator Runtime Defect Stream (Separate)

The current Aggregator integration test failure is classified as a **bounded runtime/read-shaping
defect** in `listCounterpartyDiscoveryEntries()` (count=0 after seeding; expected count >= 1).

**Governing unit:** `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`  
**Classification source:** `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION.md`  
**Status:** OPEN — requires Layer 0 authorization to remediate

### 9.1 Separation Rules

This unit must remain **completely separate** from the acquisition engine stream:

| Separation Rule | Rationale |
| --- | --- |
| Must NOT be merged with ROUTE-001 | The two address different problems: one is an authenticated read-shaping defect; the other is a new unauthenticated route |
| Must NOT expand Aggregator scope | Fix is strictly bounded to the read path in `listCounterpartyDiscoveryEntries()`; no UI, route, schema, or event changes in scope |
| Does NOT block ROUTE-001 | Confirmed via GAP-ACQ-003 classification in acquisition tracker |
| May proceed independently | Once Layer 0 authorizes, the remediation unit proceeds independently of any acquisition unit |
| Must NOT touch public.ts or publicB2BProjection.service.ts | The defect is in the authenticated tenant service path, not the public projection path |

### 9.2 Remediation Scope

In-scope for `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`:
- Bounded slice-local fix to `listCounterpartyDiscoveryEntries()` query in
  `counterpartyProfileAggregation.service.ts`
- All 2 integration tests must pass (AGGREGATOR gets entries; non-AGGREGATOR gets 403)

Out-of-scope:
- Any UI addition to `AggregatorDiscoveryWorkspace.tsx`
- Any new auth pathway
- Any broader aggregator family work
- Any public route creation
- Any schema change

---

## 10. Future Aggregator Enhancements — Deferred

The following capabilities are defined only as **future design candidates**. None are part of the
acquisition engine MVP. None are authorized by this artifact. Each requires separate design,
authorization, and an explicit implementation unit.

### 10.1 Authenticated Supplier Drill-Down (Inside Aggregator Workspace)

**What it is:** Click-through from a discovery card to a detail view within the authenticated
aggregator workspace.

**Status:** NOT PART OF ACQUISITION MVP  
**Dependencies:** ROUTE-001 must be live; public profile payload shape must be stable  
**Schema impact:** Likely none — would reuse public-safe profile shape plus aggregator-specific enrichment  
**Governance note:** Must not define a conflicting payload model vs. the public five-gate shape  
**Authorization required:** Separate design + explicit authorization

### 10.2 Authenticated Shortlist / Collection

**What it is:** Ability for an authenticated AGGREGATOR/INTERNAL user to save suppliers to a
named list or shortlist within the workspace.

**Status:** NOT PART OF ACQUISITION MVP  
**Dependencies:** No schema foundation exists; `Shortlist` / `Collection` models absent from schema  
**Schema impact:** Requires new Prisma models, migrations, routes, and services  
**Authorization required:** Separate design + schema governance review + explicit authorization

### 10.3 Authenticated Comparison Surface

**What it is:** Side-by-side comparison of two or more supplier discovery records within the
authenticated workspace.

**Status:** NOT PART OF ACQUISITION MVP  
**Dependencies:** No schema or UI foundation; depends on shortlist/collection design  
**Schema impact:** Requires new models, routes, services, and components  
**Authorization required:** Separate design + explicit authorization

### 10.4 Authenticated Request-Similar-Suppliers

**What it is:** A matching-request surface that allows an AGGREGATOR user to describe a supplier
need and receive a curated list of similar suppliers from the authenticated discovery pool.

**Status:** NOT PART OF ACQUISITION MVP  
**Dependencies:** Stable discovery read path; AI matching infrastructure  
**Schema impact:** May require storing matching requests or preferences  
**Authorization required:** Separate design + explicit authorization (not `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` — that unit requires separate Paresh authorization)

### 10.5 AI-Assisted Supplier Matching

**What it is:** `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` — AI-assisted matching layer for the
aggregator discovery workspace.

**Status:** DESIGN PLAN ARTIFACT status — `adjacent_deferred_candidate` per `NEXT-ACTION.md`  
**Authorization:** **Requires explicit Paresh authorization. Do not auto-open.**  
**Dependencies:** ROUTE-001 must be live; stable public profile shape; `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` remediation complete  
**Explicit instruction:** This unit must not be opened as part of acquisition engine work or
bundled with any Main Platform acquisition unit.

### 10.6 Authenticated Handoff to CRM or B2B Workflow

**What it is:** An authenticated surface allowing an AGGREGATOR user to initiate a relationship
with a discovered supplier — e.g., send an RFQ, start an authenticated inquiry, or flag for CRM
follow-up.

**Status:** NOT PART OF ACQUISITION MVP  
**Dependencies:** Requires platform-level RFQ or inquiry infrastructure; CRM webhook integration; ROUTE-001  
**Governance note:** The handoff must be authenticated workflow continuity, not a public contact reveal  
**Authorization required:** Separate design + explicit authorization

---

## 11. Merged Tracker Guidance

This section provides explicit instructions for the next design-track unit:
`MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-001`

The merged tracker should be created as a docs-only artifact when Layer 0 is ready to authorize
the acquisition engine stream. It should consolidate the 8 Main Platform acquisition units with
the Aggregator boundary notes established in this artifact.

### 11.1 Structural Instructions for the Merged Tracker

| Instruction | Rationale |
| --- | --- |
| Preserve ROUTE-001 as the first acquisition implementation unit | It has no hard prerequisites, no schema change, and unblocks 4 of 7 remaining units |
| Keep `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` as a **separate track** | Different problem domain; must not be confused with public profile work |
| Avoid duplicate supplier profile routes | There must be exactly one `GET /api/public/supplier/:slug`; the Aggregator workspace must not add a parallel equivalent |
| Avoid duplicate supplier profile payload models | The five-gate `CounterpartyDiscoveryEntry`-style public-safe shape is canonical; Aggregator enrichment is additive authenticated extension only |
| Defer collections, shortlist, and comparison | No schema foundation; each requires a separate design unit and migration |
| Record Aggregator boundary notes on each Main Platform unit | Each of the 8 units should note whether the Aggregator layer has a consumer or observer relationship (per §8 table above) |
| Record that Aggregator is a future consumer, not an owner, of acquisition-fed public profiles | This prevents scope creep into Aggregator during acquisition implementation |
| Include CRM handoff chain context | The merged tracker should reference the canonical object chain from `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` |
| Carry forward all gap register entries (GAP-ACQ-001 through GAP-ACQ-006) | All 6 gaps from the acquisition tracker remain open |
| Note Layer 0 posture at tracker creation time | `active_delivery_unit: NONE_AUTHORIZED` as of 2026-06-07; verify posture at time of tracker creation |

### 11.2 Do Not Include in the Merged Tracker

| Exclusion | Reason |
| --- | --- |
| `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` | Requires separate Paresh authorization; do not auto-include |
| Collections/shortlist/comparison as planned units | No schema foundation; defer entirely |
| WhatsApp orchestration units | Field Tool / CRM concern; not a Main Platform or Aggregator unit |
| Commission or payout units | Finance / CRM concern; platform must not imply money movement |
| CRM review workflow units | CRM internal concern; platform is the provisioning receiver only |
| Any unit that modifies `counterpartyProfileAggregation.service.ts` for public access | Prohibited by D-03 |

---

## 12. Readiness Verdict

### 12.1 Aggregator as Blocker for Acquisition

**Aggregator is NOT a blocker for ROUTE-001.**

The public supplier profile route (`GET /api/public/supplier/:slug`) is an unauthenticated public
surface that belongs to Main Platform. The Aggregator integration test failure (`count=0`) was
explicitly classified in GAP-ACQ-003 as not blocking public unauthenticated profile route work.

### 12.2 ROUTE-001 Authorization Status

**ROUTE-001 remains READY_TO_OPEN** once Layer 0 authorizes the acquisition stream.

Current Layer 0 posture (as of 2026-06-07):
- `active_delivery_unit: NONE_AUTHORIZED`
- `product_delivery_priority: LAUNCH_GATE_CLOSED` (DPP Passport Network `HOLD_FOR_PARESH_DECISION`)

ROUTE-001 must not be opened until Layer 0 posture changes and the acquisition stream is
explicitly authorized.

### 12.3 Aggregator Remediation Status

**`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` is separately needed for authenticated workspace
truthfulness.** It should be opened and resolved as a separate stream once Layer 0 authorizes it.
Resolution is not required before the acquisition stream begins.

### 12.4 Customer Acquisition Engine / App Plan

The Customer Acquisition Engine / App plan should wait until the merged
`MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-001` artifact is created.
That tracker should be produced as a design-only artifact under the same docs-only mode as this
artifact, authorized separately by Paresh.

### 12.5 Verdict Table

| Stream | Verdict | Precondition |
| --- | --- | --- |
| Aggregator authenticated discovery | **LIVE — defect present** | Remediation unit `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` needed; authorized separately |
| Public B2B supplier list | **LIVE — operational** | No action required |
| Public supplier profile (ROUTE-001) | **READY_TO_OPEN** | Layer 0 authorization of acquisition stream required |
| Merged acquisition + Aggregator tracker | **DESIGN ARTIFACT NEEDED** | Separate authorized docs-only unit |
| AI supplier matching | **DEFERRED** | Explicit Paresh authorization required; do not auto-open |
| Collections / shortlist / comparison | **NOT STARTED** | Schema foundation, separate design, authorization all required |
| Buyer inquiry intake (INQUIRY-004) | **BLOCKED** | ROUTE-001 + GAP-ACQ-005/006 first |
| Customer Acquisition Engine / App plan | **WAIT FOR MERGED TRACKER** | Merged tracker artifact must precede CA engine implementation planning |

---

## Appendix A — Prohibited Actions (Derived from this Design)

The following actions are unconditionally prohibited by this design authority.
They remain prohibited even when individually convenient.

| Prohibited Action | Governing Design Decision |
| --- | --- |
| Re-expose `counterpartyProfileAggregation.service.ts` via any public route | D-03 |
| Add a contact field to any public API response | D-06; Gate E; schema is designed without contact fields |
| Expose `orgId` via any unauthenticated route | Gate E; D-01 |
| Create a parallel supplier detail payload model in the Aggregator layer | D-05 |
| Merge ROUTE-001 implementation with `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` | §9.1 |
| Open `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` without explicit authorization | §10.5; NEXT-ACTION.md |
| Add shortlist/collection/comparison schema without a separate authorized design unit | §10.2, §10.3 |
| Make Aggregator own any public route | D-01; ownership boundary §6.2 |
| Open any acquisition unit while Layer 0 posture is `NONE_AUTHORIZED` | §12.2; Layer 0 posture |

---

*Design artifact complete. No code was written. No schema was modified. No routes, events, services, components, or contracts were changed.*
