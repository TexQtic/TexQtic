# AGGREGATOR-LAYER-REPO-TRUTH-AUDIT-v1.md

**Unit ID:** AGGREGATOR-LAYER-REPO-TRUTH-AUDIT-001  
**Type:** Repo-truth audit / investigation artifact  
**Date:** 2026-06-08  
**Scope:** Aggregator sub-family inside the B2B family; overlap with Customer Acquisition Engine integration requirements  
**Mode:** Read-only. No implementation, no schema mutation, no route/event/contract changes.  
**Commit:** docs(aggregator): audit acquisition integration readiness

---

## 1. Purpose and Scope

### 1.1 Purpose

This artifact documents the current state of the Aggregator layer inside the TexQtic repo and
determines how it overlaps with, or blocks, the Customer Acquisition Engine requirements as
identified in `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` and
`docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md`.

The audit addresses four questions:

1. What does the Aggregator layer actually contain today (routes, components, services, schema,
   entitlement, events, tests)?
2. What does the current public B2B discovery layer contain, and how does it relate?
3. Where do these two layers overlap with the Customer Acquisition Engine requirements?
4. What are the gaps and blockers, and what is the minimum unlocking unit?

### 1.2 Scope Boundaries

**In scope:**
- `GET /api/tenant/aggregator/discovery` route and its service/test/contract chain
- `AggregatorDiscoveryWorkspace.tsx` and `aggregatorDiscoveryService.ts`
- `counterpartyProfileAggregation.service.ts`
- `GET /api/public/b2b/suppliers` route and its service chain
- `B2BDiscovery.tsx` and `publicB2BService.ts`
- `App.tsx` aggregator routing surface
- `server/prisma/schema.prisma` — aggregator-adjacent fields
- Governance documents: `GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION.md`,
  `TEXQTIC-B2B-PUBLIC-DISCOVERY-READINESS-ASSESSMENT-v1.md`
- Acquisition engine tracker unit table (8 units, ROUTE-001 through PROVISIONED-EVENTS-008)

**Explicitly out of scope:**
- No implementation recommendations that require a code change
- No schema mutations
- No migrations
- No route, service, component, contract, or event modifications
- No governance authority changes
- No supplier profile route creation
- No contact data exposure
- No redesign of existing Aggregator discovery behaviour

---

## 2. Files Reviewed

| File | Role |
| --- | --- |
| `server/src/routes/tenant.ts` | Discovery route definition (lines 1948–2006) |
| `server/src/services/counterpartyProfileAggregation.service.ts` | Core aggregator backend service |
| `server/src/lib/database-context.ts` | `resolveCanonicalProvisioningIdentity()`, `OrganizationIdentity`, `aggregator_capability` derivation |
| `server/src/routes/auth.ts` | JWT claim injection (lines 376–415, 1081–1107) |
| `server/src/routes/admin/tenantProvision.ts` | AGGREGATOR tenant provisioning (line 41, 66) |
| `server/src/types/tenantProvision.types.ts` | `aggregator_capability` type declaration |
| `server/src/tests/aggregator-discovery-read.integration.test.ts` | Integration test (2 test cases) |
| `server/prisma/schema.prisma` | Schema audit — TenantType enum, organisations model |
| `server/prisma/seed.ts` | AGGREGATOR seed logic (lines 193, 466, 1730, 1737) |
| `services/aggregatorDiscoveryService.ts` | Frontend client service |
| `services/publicB2BService.ts` | Frontend public B2B client service |
| `components/Tenant/AggregatorDiscoveryWorkspace.tsx` | Authenticated aggregator workspace component |
| `components/Public/B2BDiscovery.tsx` | Public B2B discovery page component |
| `App.tsx` | App state machine (aggregator capability, routing, data-fetch effects) |
| `shared/contracts/openapi.tenant.json` | OpenAPI contract (lines 1545–1600) |
| `server/src/services/publicB2BProjection.service.ts` | Five-gate public B2B projection service |
| `server/src/routes/public.ts` | Public route inventory |
| `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION.md` | Backend failure classification |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-READINESS-ASSESSMENT-v1.md` | B2B public discovery readiness assessment |
| `governance/control/OPEN-SET.md` | Layer 0 open-set posture |
| `governance/control/NEXT-ACTION.md` | Layer 0 pointer / delivery posture |
| `governance/control/BLOCKED.md` | Layer 0 hold register |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | Acquisition engine boundary artifact |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` | 8-unit implementation tracker |

---

## 3. Current Aggregator Layer Inventory

### 3.1 Backend Route

**Route:** `GET /api/tenant/aggregator/discovery`  
**File:** `server/src/routes/tenant.ts` (lines 1948–2006)  
**Auth:** `tenantAuthMiddleware` + `databaseContextMiddleware`  
**Guard:** `!['AGGREGATOR', 'INTERNAL'].includes(tenantIdentity.org_type)` → 403  
**Query param:** `limit` — integer 1–12, default 6 (Zod-validated)  
**Service call:** `listCounterpartyDiscoveryEntries(request.dbContext.orgId, prisma, limit)`  
**Response shape:** `{ items: CounterpartyDiscoveryEntry[], count: items.length }`

The route is live and in production code. It is the only aggregator route in `tenant.ts`.
There are no other aggregator-specific routes anywhere in the codebase.

### 3.2 Backend Service

**File:** `server/src/services/counterpartyProfileAggregation.service.ts`

**Two exported functions:**

`listCounterpartyDiscoveryEntries(currentOrgId, prismaClient, limit)`:
- Queries `organizations.findMany` via `withOrgAdminContext`
- Filter: `id ≠ currentOrgId`, `is_white_label = false`, `org_type IN ['B2B']`, `status IN ['ACTIVE', 'VERIFICATION_APPROVED']`
- Order: `updated_at DESC, created_at DESC`; Take: `limit`
- Then fetches `Certification` rows via `withAdminContext`
- Then fetches `TraceabilityNode` rows via `withAdminContext`
- Assembles per-org: `certificationCount`, `certificationTypes` (max 12, deduplicated),
  `hasTraceabilityEvidence`, `visibilityIndicators` (max 12)
- Returns `CounterpartyDiscoveryEntry[]`
- **Output field spec (NO price, NO contact, NO registration_no):** `orgId`, `slug`, `legalName`,
  `orgType`, `jurisdiction`, `certificationCount`, `certificationTypes`, `hasTraceabilityEvidence`,
  `visibilityIndicators`, `discoverySafeTaxonomy`

`getCounterpartyProfileAggregation(orgId, prismaClient)`:
- More detailed single-org profile: identity + trustSummary + evidenceSummary
- More detailed than the list function; used internally but not exposed via the discovery route
- Not directly route-wired via an individual profile endpoint

**Constants:**
- `DISCOVERY_ELIGIBLE_ORG_TYPES = ['B2B']`
- `DISCOVERY_ELIGIBLE_STATUSES = ['ACTIVE', 'VERIFICATION_APPROVED']`
- `TRACEABILITY_SUMMARY_LIMIT = 12`

### 3.3 Frontend Component

**File:** `components/Tenant/AggregatorDiscoveryWorkspace.tsx`  
**Type:** Authenticated tenant workspace component  
**Props:** `{ tenantName, entries, loading, error, aiInsight, onRetry }`  
**Renders:** Entry cards with `legalName`, `slug`, `orgType`, `jurisdiction`,
`discoverySafeTaxonomy`, trust signals (certification count/types max 2 badges,
traceability indicator, visibility cues), optional AI insight section (suppressed for WL),
stats bar (entry count + trust cue count), empty state, error state  
**Each card labeled:** "Read-only discovery record"  
**Critical absences:**
- NO contact button or contact reveal
- NO click-through to an individual supplier profile page
- NO shortlist / collection / comparison UI
- NO inquiry initiation surface

### 3.4 Frontend Service

**File:** `services/aggregatorDiscoveryService.ts`  
**Export:** `getAggregatorDiscoveryEntries(params: AggregatorDiscoveryQueryParams): Promise<AggregatorDiscoveryResponse>`  
**Transport:** `tenantGet` (authenticated, tenant JWT)  
**Endpoint called:** `GET /api/tenant/aggregator/discovery?limit=...`  
**Interface declarations:** `AggregatorDiscoveryEntry`, `AggregatorDiscoveryResponse`,
`AggregatorDiscoverySafeTaxonomy`, `AggregatorDiscoveryQueryParams`

### 3.5 App.tsx Routing

The Aggregator workspace is a **sub-route within the `EXPERIENCE` AppState**, not a top-level
AppState value. There is NO `AGGREGATOR_WORKSPACE` or `AGGREGATOR_EXPERIENCE` AppState value.

**Key App.tsx references (line numbers):**
| Line(s) | Fact |
| --- | --- |
| 1247 | `aggregator_capability?: boolean \| null` in session/tenant type |
| 1296–1298 | `aggregatorCapability` derived from JWT claim or `compatCategory === TenantType.AGGREGATOR` |
| 1320 | `tenantCategory: aggregatorCapability ? TenantType.AGGREGATOR : baseFamily ?? compatCategory` |
| 1374 | `if (identity.aggregatorCapability \|\| identity.whiteLabelCapability)` — routing branch |
| 2326–2329 | State vars: `aggregatorDiscoveryEntries`, `aggregatorDiscoveryLoading`, `aggregatorDiscoveryError`, `aggregatorDiscoveryRefreshKey` |
| 2530 | `tenantHasAggregatorCapability = tenantRuntimeIdentity?.aggregatorCapability ?? false` |
| 2621–2623 | `isAggregatorDiscoveryEntrySurface = appState === 'EXPERIENCE' && tenantContentFamily === 'aggregator_workspace' && tenantHasAggregatorCapability` |
| 2967–3031 | Effect: fetches aggregator discovery entries when `isAggregatorDiscoveryEntrySurface` |
| 4445–4453 | `case 'aggregator_workspace': return <AggregatorDiscoveryWorkspace ...>` |
| 6845–6846 | `case 'AggregatorShell': ExperienceShell = AggregatorShell` |

### 3.6 Schema

**`TenantType` enum** (`server/prisma/schema.prisma`, lines 2336–2340):
```
B2B | B2C | INTERNAL | AGGREGATOR
```
Added via migration `20260319000000_b2_rem_1_tenant_type_canonicalize`.

**`aggregator_capability` field:** NOT a DB column. Not in `schema.prisma`. Computed at runtime
from `org_type === 'AGGREGATOR'` inside `resolveCanonicalProvisioningIdentity()` in
`server/src/lib/database-context.ts` (lines 543–565). See §8 for full entitlement model.

**AGGREGATOR `base_family`:** Always resolved to `'INTERNAL'` (not `'B2B'`).

### 3.7 Entitlement Model

See §8.

### 3.8 Events

**None.** There are no aggregator-specific events in:
- `server/src/lib/KnownEventName` union
- `shared/contracts/event-names.md`

No `aggregator.discovery.*`, `aggregator.workspace.*`, or related events are registered.

### 3.9 OpenAPI Contract

**Documented:** `GET /api/tenant/aggregator/discovery` — present in
`shared/contracts/openapi.tenant.json` (lines 1545–1600):
- Summary: "List bounded Aggregator discovery entries"
- Security: `tenantJwt`
- Query param: `limit` (int, 1–12, default 6)
- Response ref: `#/components/schemas/AggregatorDiscoveryListResponse`
- Errors: 401, 403, 422

No other aggregator paths in the tenant OpenAPI contract.

### 3.10 Integration Tests

**File:** `server/src/tests/aggregator-discovery-read.integration.test.ts`  
**Suite:** `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS — discovery read route`  
**Guard:** `describe.skipIf(!hasDb)` — requires live DB connection  
**Tests (2 total):**
1. AGGREGATOR tenant gets discovery entries — expects `count >= 1`, seeded supplier visible,
   current AGGREGATOR org excluded from results
2. Non-AGGREGATOR tenant gets 403

**Current status: FAILING.**  
Test 1 produces `count = 0` (expected `count >= 1`). Classified as a **bounded runtime/read-shaping
defect** (not a test-truth mismatch) per
`governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION.md`.  
Active governed unit: `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` (OPEN).

---

## 4. Current Public B2B Discovery Inventory

### 4.1 Backend Route

**Route:** `GET /api/public/b2b/suppliers`  
**File:** `server/src/routes/public.ts` (unauthenticated)  
**Service:** `server/src/services/publicB2BProjection.service.ts`

**Five-gate architecture:**
- Gate A: `publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'` (org-level)
- Gate B: `publication_posture IN ('B2B_PUBLIC', 'BOTH')` (object-level)
- Gate C: `org_type === 'B2B'`
- Gate D: `status IN ('ACTIVE', 'VERIFICATION_APPROVED')`
- Gate E: Payload field allowlist — prohibits price, contact, org UUID, `risk_score`, `plan`,
  `registration_no`, `external_orchestration_ref`

**Allowed output fields (Gate E):** `slug`, `legal_name`, `org_type`, `jurisdiction`,
`certificationCount`, `certificationTypes` (max 10), `hasTraceabilityEvidence`, taxonomy,
`offeringPreview` (max 5 items, no price), `publicationPosture`, `eligibilityPosture`

### 4.2 Frontend Component

**File:** `components/Public/B2BDiscovery.tsx`  
**Renders:** `SupplierCard` grid (orgType, legalName, jurisdiction, taxonomy, trust signals —
cert count, traceability, cert types max 3; offering preview items max 3 with moq and imageUrl,
NO price)  
**Sign-in CTA:** "Sign in to start a sourcing workflow" (bottom of page)  
**Critical absences:**
- NO individual supplier profile click-through
- NO inquiry initiation
- NO authenticated-only content

### 4.3 Frontend Service

**File:** `services/publicB2BService.ts`  
**Export:** `getPublicB2BSuppliers(params)` — calls `GET /api/public/b2b/suppliers` (no auth)  
**Interface declarations:** `PublicB2BSupplierEntry`, `PublicB2BQueryParams`, etc.

### 4.4 App.tsx State

`PUBLIC_B2B_DISCOVERY` **is present** in the `AppState` union (App.tsx line 1953). This AppState
resolves to the `B2BDiscovery.tsx` component.

> Note: The B2B Public Discovery Readiness Assessment (dated 2026-04-22) recorded
> `PUBLIC_B2B_DISCOVERY` as absent (Blocker B-06). That assessment predates the current
> implementation. The AppState now exists in the union, and the `GET /api/public/b2b/suppliers`
> route is live with the five-gate projection architecture.

**Current live inventory status of `GET /api/public/b2b/suppliers`:** LIVE (production code).
Whether any org currently passes all five gates is a data posture question, not a code posture
question.

---

## 5. Current Supplier Profile / Detail Status

No individual public supplier profile surface exists anywhere in the codebase.

| Surface | Status | Notes |
| --- | --- | --- |
| `GET /api/public/supplier/:slug` route | **ABSENT** | No route in `public.ts` |
| `PUBLIC_SUPPLIER_PROFILE` AppState | **ABSENT** | Not in App.tsx union |
| `PublicSupplierProfile.tsx` component | **ABSENT** | No file in `components/Public/` |
| `publicB2BProjection.getPublicB2BSupplierBySlug()` | **ABSENT** | No function in projection service |
| OpenAPI path `GET /api/public/supplier/{slug}` | **ABSENT** | Not in any contract |
| Individual profile page (any form) | **ABSENT** | No component exists for this |

The `getCounterpartyProfileAggregation()` function in `counterpartyProfileAggregation.service.ts`
produces a richer per-org profile (identity + trustSummary + evidenceSummary), but it is:
- Auth-gated (service-role realm only)
- Not wired to any public route
- Not safe for public exposure without passing through the five-gate projection layer

The `organizations.slug` field (`@unique`, VarChar 100) exists and is the designated public URL
identity key. It is not yet used as a path param in any public route.

---

## 6. Current Collections / Shortlist / Comparison Status

All collection-family surfaces are completely absent from the codebase.

| Surface | Status |
| --- | --- |
| `shortlist` / `Shortlist` Prisma model | **ABSENT** — not in schema |
| `collection` / `Collection` Prisma model | **ABSENT** — not in schema |
| Shortlist/collection routes | **ABSENT** |
| Shortlist/collection frontend components | **ABSENT** |
| Shortlist/collection services | **ABSENT** |
| Comparison surface (any form) | **ABSENT** |
| `comparison` model | **ABSENT** — not in schema |
| Side-by-side UI | **ABSENT** |

There is no schema foundation for any of these surfaces. Building them requires new schema models,
migrations, routes, services, and components. None of this work is within the scope of the
Aggregator layer; it belongs to the general platform or a dedicated buyer-tools layer.

---

## 7. Current Buyer Intent / Handoff Status

All buyer-intent and inquiry surfaces are completely absent from the codebase.

| Surface | Status |
| --- | --- |
| `inquiry` Prisma model | **ABSENT** — not in schema |
| `referral` Prisma model | **ABSENT** — not in schema |
| `handoff` Prisma model | **ABSENT** — not in schema |
| `buyer_intent` Prisma model | **ABSENT** — not in schema |
| `POST /api/public/inquiry/submit` route | **ABSENT** |
| `POST /api/internal/acquisition/provision-supplier` route | **ABSENT** |
| `/join/:referral_code` frontend route | **ABSENT** |
| Referral join landing page component | **ABSENT** |
| Any inquiry form or pre-auth contact surface | **ABSENT** |

Contact fields `contact_phone` and `contact_email` are absent from `schema.prisma`. This is
**intentional and constitutional** — per Gate E of the five-gate projection architecture,
contact data is prohibited in all public-facing outputs. Any inquiry mechanism must be designed as
a platform-mediated flow, not a direct contact reveal.

---

## 8. Current Exposure and Entitlement Model

### 8.1 Aggregator Discovery Entitlement

**`aggregator_capability` is a derived boolean — it is NOT a DB column.**

Computation chain:
1. `org_type` is stored on the `organizations` table (enum: `B2B | B2C | INTERNAL | AGGREGATOR`)
2. `resolveCanonicalProvisioningIdentity()` in `server/src/lib/database-context.ts` (lines 543–565)
   derives `aggregator_capability: true` when `tenantCategory === 'AGGREGATOR'`; all other types
   produce `aggregator_capability: false`
3. `mapOrganizationIdentityRow()` calls `resolveCanonicalProvisioningIdentity()` to inject this
   computed field into the `OrganizationIdentity` object
4. `buildTenantSessionTransportIdentity()` passes `aggregator_capability` into the session
   transport identity
5. Auth route (`server/src/routes/auth.ts`, lines 376–415) reads `org.aggregator_capability`
   from the resolved `OrganizationIdentity` object and places it in the JWT payload
6. At the discovery route, the guard reads `tenantIdentity.org_type` directly (not `aggregator_capability`)
   and gates on `['AGGREGATOR', 'INTERNAL'].includes(org_type)`

**`aggregator_capability` is not an independent permission.** It cannot be granted to a non-AGGREGATOR
org. It cannot be toggled separately. It is always and only a function of `org_type === 'AGGREGATOR'`.

**AGGREGATOR base_family resolution:** When `org_type === 'AGGREGATOR'`,
`resolveCanonicalProvisioningIdentity()` sets `base_family: 'INTERNAL'`. AGGREGATOR tenants are
in the INTERNAL base family with aggregator capability layered on. They are NOT in the B2B base
family.

### 8.2 Public B2B Discovery Entitlement (Five-Gate Model)

The five-gate publication posture model gates each supplier's public visibility independently:

- **Gate A** (`publicEligibilityPosture`): Org-level eligibility flag. Exists as field in
  `Tenant` / `organizations` models. Default: `NO_PUBLIC_PRESENCE`.
- **Gate B** (`publication_posture`): Object-level. Controls whether a supplier's catalog/listing
  is B2B-public-visible.
- **Gate C** (`org_type = 'B2B'`): Hard type gate — only B2B orgs appear in public directory.
- **Gate D** (`status IN ['ACTIVE', 'VERIFICATION_APPROVED']`): Only verified/active orgs.
- **Gate E**: Field allowlist — enforced at projection layer, prohibits all sensitive fields.

This model is implemented in `publicB2BProjection.service.ts` and is **separate from and
independent of** the authenticated aggregator discovery model. The two systems serve different
audiences with different trust contexts.

### 8.3 Key Architectural Separation

| Dimension | Aggregator Discovery | Public B2B Discovery |
| --- | --- | --- |
| Auth requirement | Tenant JWT (AGGREGATOR/INTERNAL only) | None (unauthenticated) |
| Audience | Platform aggregator tenants | Unauthenticated buyers / public web |
| Gate model | `org_type` check on the requester | Five-gate publication posture on the supplier |
| Data source | `counterpartyProfileAggregation.service.ts` | `publicB2BProjection.service.ts` |
| Output scope | Broader (all B2B/ACTIVE orgs) | Narrower (only PUBLICATION_ELIGIBLE + B2B_PUBLIC) |
| Contact data | Absent by design | Absent by Gate E |
| Profile depth | List-level only; no drill-down | List-level only; no drill-down |

---

## 9. Overlap with Customer Acquisition Engine Requirements

The Acquisition Engine defines 8 units (`ROUTE-001` through `PROVISIONED-EVENTS-008`). The
following matrix maps each unit to the aggregator layer's current relevance.

### 9.1 Unit-Level Overlap Map

| Unit ID | Unit Name | Status in Tracker | Aggregator Layer Relevance |
| --- | --- | --- | --- |
| ROUTE-001 | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` | READY_TO_OPEN | **Indirect dependency only.** The `CounterpartyDiscoveryEntry` type in `counterpartyProfileAggregation.service.ts` is the closest data shape precursor. But the profile route must use the five-gate `publicB2BProjection.service.ts` — not re-expose the authenticated aggregator service. Aggregator layer does not block or enable ROUTE-001. |
| QR-SOURCE-002 | `MAIN-PLATFORM-SUPPLIER-PROFILE-QR-SOURCE-002` | NOT_READY | No aggregator relevance. Depends on ROUTE-001 only. |
| EVENTS-003 | `MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003` | BLOCKED | No aggregator relevance. Blocked by GAP-ACQ-002 (event registration). |
| INQUIRY-004 | `MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004` | BLOCKED | No aggregator relevance. Blocked by ROUTE-001 + GAP-ACQ-005 + GAP-ACQ-006. |
| REFERRAL-005 | `MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005` | NOT_READY | No aggregator relevance. Frontend-only. |
| ORF-AUTHORITY-006 | `MAIN-PLATFORM-ORCHESTRATION-REF-AUTHORITY-006` | REQUIRED_BEFORE_WEBHOOK | **Indirect.** GAP-ACQ-001 affects `organizations.external_orchestration_ref` (which the aggregator discovery service queries but does not select). Not a blocker for aggregator discovery. Blocks WEBHOOK-007. |
| WEBHOOK-007 | `MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007` | BLOCKED | No aggregator relevance. Internal-realm webhook. |
| PROVISIONED-EVENTS-008 | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-PROVISIONED-EVENTS-008` | BLOCKED | No aggregator relevance. Depends on WEBHOOK-007. |

### 9.2 Data Shape Overlap

The `CounterpartyDiscoveryEntry` type (aggregator service) and the `PublicB2BSupplierEntry` type
(public projection service) share significant structural overlap:

| Field | `CounterpartyDiscoveryEntry` | `PublicB2BSupplierEntry` | Acquisition profile payload |
| --- | --- | --- | --- |
| `slug` | ✅ | ✅ | ✅ required |
| `legalName` | ✅ | ✅ | ✅ required |
| `orgType` | ✅ | ✅ | ✅ |
| `jurisdiction` | ✅ | ✅ | ✅ |
| `certificationCount` | ✅ | ✅ | ✅ |
| `certificationTypes` (max 10/12) | ✅ | ✅ | ✅ |
| `hasTraceabilityEvidence` | ✅ | ✅ | ✅ |
| `discoverySafeTaxonomy` | ✅ (aggregator name) | `taxonomy` (public name) | ✅ |
| `offeringPreview` | ❌ | ✅ (max 5, no price) | ✅ required |
| `visibilityIndicators` | ✅ (aggregator-specific) | ❌ | n/a |
| `orgId` (UUID) | ✅ | ❌ (Gate E forbids) | ❌ (forbidden — unauthenticated) |
| Contact data | ❌ | ❌ | ❌ (constitutionally absent) |
| Price | ❌ | ❌ | ❌ (Gate E forbids) |

The overlap is high for the safe-to-expose fields. The aggregator service provides the data
backbone pattern that the public profile route can follow — but the authentication model,
eligibility gate, and org-ID suppression are different enough that the two services must remain
separate.

### 9.3 Key Architectural Constraint

The `counterpartyProfileAggregation.service.ts` **cannot** be re-routed as a public service
because:
1. It does not apply the publication posture gate (Gates A and B)
2. It returns `orgId` (UUID) — prohibited by Gate E for unauthenticated routes
3. It is scoped to org-admin realm context (`withOrgAdminContext`) — not appropriate for public paths
4. Its query returns ALL B2B/ACTIVE orgs, not just those with `PUBLICATION_ELIGIBLE` posture

The `getCounterpartyProfileAggregation()` function (single-org deep profile) is a valid blueprint
for the per-slug profile response shape, but requires its own public-safe adaptor in
`publicB2BProjection.service.ts` with the five-gate applied.

---

## 10. Gaps and Blockers

### 10.1 Aggregator-Layer Blockers

| ID | Gap / Blocker | Scope | Blocks |
| --- | --- | --- | --- |
| AGG-B-01 | Integration test `aggregator-discovery-read.integration.test.ts` returning `count=0` after seeding | Runtime defect in `listCounterpartyDiscoveryEntries` query path | `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` (active open unit). Does NOT block acquisition engine units per GAP-ACQ-003 classification. |
| AGG-B-02 | No individual supplier profile drill-down from `AggregatorDiscoveryWorkspace.tsx` | Missing component + AppState + route | Not a blocker for ROUTE-001; ROUTE-001 is a public unauthenticated surface, independent of authenticated workspace |
| AGG-B-03 | No events registered for aggregator discovery interactions | Missing entries in `KnownEventName` and `event-names.md` | Future analytics/observability on aggregator workspace |

### 10.2 Acquisition Engine Blockers

| ID | Gap / Blocker | Type | Blocks |
| --- | --- | --- | --- |
| GAP-ACQ-001 | `external_orchestration_ref` exists on both `Tenant` (line 21) and `organizations` (line 1073) with `@unique` — dual column, authority unclear | Schema governance | WEBHOOK-007, ORF-AUTHORITY-006 |
| GAP-ACQ-002 | No `supplier_profile.*` events in `KnownEventName` or `event-names.md` | Event registry gap | EVENTS-003 (cannot emit events that are not registered) |
| GAP-ACQ-003 | `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` blocked by Layer 0 gate | Governance posture | Does NOT block public profile route (ROUTE-001); classification confirmed in tracker |
| GAP-ACQ-005 | Rate-limit budget for inquiry not defined | Governance decision | INQUIRY-004 |
| GAP-ACQ-006 | Rate-limit budget for inquiry not defined | Governance decision | INQUIRY-004 |

### 10.3 Public Supplier Profile (ROUTE-001) — No Schema Blockers

Per the acquisition tracker, ROUTE-001 has **no hard prerequisites**. Specifically:
- `organizations.slug` is `@unique` in schema — no migration needed
- `publicEligibilityPosture` and `publication_posture` fields exist in schema
- `publicB2BProjection.service.ts` five-gate architecture is reusable
- No schema change is required for ROUTE-001

### 10.4 Collections / Shortlist / Comparison — No Foundation

There is no schema, service, or route foundation for collections, shortlists, or comparison
surfaces. These are not blocked by any aggregator issue — they simply do not exist and require
net-new schema models, migrations, and implementation work not covered by any current open unit.

### 10.5 Buyer Inquiry / Handoff — Blocked at Multiple Levels

`INQUIRY-004` is the governing unit. It is BLOCKED pending:
1. ROUTE-001 must be live (profile page prerequisite)
2. GAP-ACQ-005 + GAP-ACQ-006 (rate-limit governance decisions)
3. No inquiry schema model exists — `inquiry` model is absent from schema.prisma
4. No `POST /api/public/inquiry/submit` route exists

---

## 11. Recommendation

### 11.1 Ownership Model

| Surface | Recommended ownership | Notes |
| --- | --- | --- |
| Authenticated aggregator discovery (`AggregatorDiscoveryWorkspace`, `listCounterpartyDiscoveryEntries`) | **Aggregator-owned** | Fix runtime defect via `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`. Do not change auth model or eligibility gates. |
| `counterpartyProfileAggregation.service.ts` | **Aggregator-owned (pattern source)** | Serves as the data shape blueprint for the public profile adaptor, but must remain a separate, auth-gated service. |
| Public B2B supplier list (`GET /api/public/b2b/suppliers`, `publicB2BProjection.service.ts`) | **General platform** | Already live. Five-gate model is the correct public-safe projection pattern. |
| Public supplier profile (`GET /api/public/supplier/:slug`) | **General platform** | Must be built as ROUTE-001 using the five-gate model + `getPublicB2BSupplierBySlug()` adaptor in `publicB2BProjection.service.ts`. Not aggregator-owned. |
| Collections / shortlist / comparison | **General platform (not yet started)** | Requires new schema models. Not aggregator-owned. Not unblocked by any current aggregator work. |
| Buyer inquiry / handoff | **General platform (not yet started)** | Requires rate-limit governance, schema model, route. Not aggregator-owned. |
| Event registration (`supplier_profile.*`) | **General platform** | Must be added to `KnownEventName` and `event-names.md` before EVENTS-003 can proceed. |

### 11.2 What the Aggregator Layer Can and Cannot Provide

**Can provide (safely):**
- The field allowlist pattern of `CounterpartyDiscoveryEntry` as a reference for the public profile payload design
- The data-assembly pattern in `listCounterpartyDiscoveryEntries` (certifications, traceability, taxonomy) as a blueprint for `getPublicB2BSupplierBySlug()`
- The entitlement model (`aggregator_capability` derivation) as a proven pattern for other computed-capability requirements

**Cannot provide (must not re-expose):**
- The authenticated discovery route must not be re-used as a public endpoint
- `orgId` (UUID) must not flow to any public-facing route
- The `withOrgAdminContext` pattern is not appropriate for unauthenticated public paths
- The two-org-exclusion pattern (`id != currentOrgId`) is irrelevant for unauthenticated public profiles

### 11.3 Aggregator Runtime Defect Sequencing

The `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` defect (count=0) should be resolved as a bounded,
slice-local remediation of the read path in `listCounterpartyDiscoveryEntries`. It does not block
and is not a prerequisite for any acquisition engine unit (per GAP-ACQ-003 classification in
tracker).

The two streams are independent and may proceed in parallel once Layer 0 authorizes them separately.

### 11.4 Adjacent Deferred Candidate

`TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` is listed in `NEXT-ACTION.md` as:
> `adjacent_deferred_candidate: TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 — DESIGN PLAN ARTIFACT
> (requires explicit Paresh authorization; do not auto-open)`

This unit (AI-assisted supplier matching) is thematically adjacent to the acquisition engine's
discovery and profiling surface. It should not be opened until (a) ROUTE-001 is live and (b) the
supplier profile data shape is stable.

---

## 12. Readiness Verdict and Recommended Next Unit

### 12.1 Readiness Verdict by Surface

| Surface | Current Status | Verdict |
| --- | --- | --- |
| Aggregator authenticated discovery route | LIVE, integration test FAILING | **DEFECT — bounded remediation unit open (`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`)** |
| Public B2B supplier list | LIVE | **LIVE — operational** |
| Public supplier profile (per-slug) | ABSENT — all layers | **READY_TO_OPEN — ROUTE-001, no schema change needed** |
| Collections / shortlist | ABSENT — no schema | **NOT STARTED — no foundation** |
| Comparison surface | ABSENT — no schema | **NOT STARTED — no foundation** |
| Buyer inquiry / pre-auth | ABSENT — no schema, governance blockers | **BLOCKED — GAP-ACQ-005/006 + ROUTE-001** |
| QR source attribution | ABSENT | **NOT_READY — depends on ROUTE-001** |
| Event registration | ABSENT | **BLOCKED — GAP-ACQ-002** |
| Webhook / provisioning handoff | ABSENT | **BLOCKED — ORF-AUTHORITY-006 + WEBHOOK-007** |
| AI supplier matching | ABSENT (deferred design) | **DEFERRED — explicit authorization required** |

### 12.2 Layer 0 Posture

As of this audit (2026-06-08):
- `active_delivery_unit: NONE_AUTHORIZED`
- `product_delivery_priority: LAUNCH_GATE_CLOSED` — DPP Passport Network `HOLD_FOR_PARESH_DECISION`
- `adjacent_deferred_candidate: TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` (requires explicit authorization)

No acquisition engine unit or aggregator remediation unit is currently authorized. Both streams
require explicit authorization before opening.

### 12.3 Recommended Next Unit (when Layer 0 authorizes acquisition stream)

**Recommended first unit:** `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` (ROUTE-001)

**Rationale:**
- Status: READY_TO_OPEN per tracker
- Hard prerequisites: None
- Schema change: None required
- Enables: QR-SOURCE-002, EVENTS-003 (prerequisite cleared), INQUIRY-004 (prerequisite cleared),
  REFERRAL-005 (recommended predecessor)
- Unblocks: 4 of the remaining 7 acquisition engine units
- Reuses: `publicB2BProjection.service.ts` five-gate architecture (already proven)
- Field model: governed by `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1`

**Recommended first unit (aggregator stream, when authorized):** `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`

**Rationale:**
- Active open unit per `GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION.md`
- Bounded slice-local remediation only — `listCounterpartyDiscoveryEntries` read path
- Does not expand Aggregator surface, add auth paths, or touch public routes
- Integration test must pass before the aggregator workspace is usable in production

**These two streams are independent and may be sequenced separately once authorized.**

### 12.4 Do Not Attempt

| Action | Reason |
| --- | --- |
| Re-expose `counterpartyProfileAggregation.service.ts` as a public route | Auth model mismatch; `orgId` would leak; no five-gate eligibility applied |
| Add contact data to any public endpoint | Constitutionally prohibited by Gate E; contact_phone / contact_email absent from schema by design |
| Build collections/shortlist schema in this audit | Not in scope; no investigation beyond confirming absence |
| Open `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` | Requires explicit Paresh authorization per Layer 0 |
| Open INQUIRY-004 before ROUTE-001 | Hard prerequisite per tracker |

---

*Audit complete. No code was written. No schema was modified. No routes, events, or contracts were changed.*
