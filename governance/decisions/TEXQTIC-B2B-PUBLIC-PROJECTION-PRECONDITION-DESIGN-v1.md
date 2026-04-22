# TEXQTIC — B2B Public Projection Precondition Design

**Document ID:** TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1  
**Slice:** `PUBLIC_B2B_PROJECTION_PRECONDITION_SLICE`  
**Status:** DECIDED  
**Authority:** Design-only. No implementation, no runtime files changed, no schema mutations applied.  
**Authored:** 2026-05-15  
**Precedes:** `PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE`  
**Follows from:**  
- `TEXQTIC-B2B-PUBLIC-DISCOVERY-READINESS-ASSESSMENT-v1.md` (verdict: `NOT_READY_REQUIRES_PRECONDITION_SLICE`)  
- `TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` (visibility/posture authority)  
- `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` (object model authority)  
- `TEXQTIC-PUBLIC-DOWNSTREAM-PAGE-ARCHITECTURE-AND-SCOPE-DECISION-v1.md` (page architecture authority)

---

## Purpose

This document defines the four missing preconditions that must be satisfied before
`PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` (the page implementation) may open.

The readiness assessment (`TEXQTIC-B2B-PUBLIC-DISCOVERY-READINESS-ASSESSMENT-v1.md`) produced
seven blockers (B-01 through B-07). Four of those blockers are schema and service infrastructure
gaps that require explicit design authority before implementation may proceed:

| Blocker | Gap |
|---|---|
| B-01 | No tenant eligibility posture field on any model |
| B-02 | No object publication posture field on any model |
| B-03 | No governed public-safe B2B projection layer |
| B-04 | No public B2B discovery endpoint |

This artifact provides the bounded design decisions for all four.

**Scope constraints:**

- DESIGN ONLY — no runtime code, no schema applied, no migrations run.
- Governed by D-007 (no implementation in governance units) and D-009 (design-gated items must not be forced into implementation).
- D-024 (public market-access surfaces are governed) applies throughout.
- Layer 0 `product_delivery_priority: NONE_OPEN` remains in effect. Lifting it is a separate user decision.

---

## Design Question A — Tenant Eligibility Posture

### A.1 Authority Basis

Per `TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` §2.1, the canonical
tenant eligibility gate vocabulary is:

| Posture Value | Meaning |
|---|---|
| `NO_PUBLIC_PRESENCE` | Zero public objects permitted. All objects forced `PRIVATE_OR_AUTH_ONLY` regardless of their own posture field. |
| `LIMITED_PUBLIC_PRESENCE` | Narrow identity and trust context only. No capability or offering exposure. |
| `PUBLICATION_ELIGIBLE` | Object-level posture controls apply per the object publication posture gate (Design Question B). |

This vocabulary is locked. No additions or modifications to this vocabulary are permitted
without an amendment to the visibility/projection model decision.

### A.2 Model Placement Decision

**Decision: `publicEligibilityPosture` belongs on the `Tenant` model.**

Rationale:

1. `Tenant` is the canonical auth and tenancy boundary per AGENTS.md §2. It is the primary
   identity surface that the authentication layer and middleware patterns (`tenantAuthMiddleware`,
   `databaseContextMiddleware`) operate on. Public eligibility is a **tenancy-level gate** — it
   governs whether a tenant's data may be surfaced publicly at all. This is an auth-boundary
   concern, not an operational record concern.

2. `organizations` holds operational records (trade, RFQ, escalation, certification, traceability).
   It is RLS-scoped via `current_setting('app.org_id', true)`. Adding a public eligibility posture
   to `organizations` would conflate the operational record boundary with the public presentation
   gate. These are architecturally distinct surfaces.

3. The `organizations` table is referenced by `Tenant` via a live FK: `organizations.id →
   tenants.id` (1:1, confirmed schema L1570 area: `tenants Tenant @relation(fields: [id],
   references: [id], onDelete: Cascade)`). The correct place to gate public eligibility is at
   the `Tenant` model, not at the `organizations` operational extension.

4. `TenantType` enum (confirmed schema) already has `B2B`, `B2C`, `INTERNAL`, `AGGREGATOR` on
   the `Tenant` model. The eligibility posture belongs alongside this existing tenancy metadata,
   not on the operational org record.

**Rejected alternative: field on `organizations`**  
Rejected because `organizations` is the operational record layer. Public eligibility is a
presentation/access gate, not an operational fact about the org.

### A.3 Field Design

```prisma
// New enum — to be added to schema.prisma
enum TenantPublicEligibilityPosture {
  NO_PUBLIC_PRESENCE
  LIMITED_PUBLIC_PRESENCE
  PUBLICATION_ELIGIBLE
}

// Field to add to model Tenant
model Tenant {
  // ... existing fields ...
  publicEligibilityPosture  TenantPublicEligibilityPosture  @default(NO_PUBLIC_PRESENCE)  @map("public_eligibility_posture")
}
```

### A.4 Gate Rule

The tenant eligibility posture is the **first gate** in the public projection evaluation chain.

```
IF tenant.publicEligibilityPosture == NO_PUBLIC_PRESENCE:
  → return empty / 404 / excluded from public index. Stop. No further evaluation.

IF tenant.publicEligibilityPosture == LIMITED_PUBLIC_PRESENCE:
  → only identity and trust-signal fields may be projected.
  → capability metadata, offering previews, taxonomy breadth are suppressed.
  → object-level posture gates are NOT checked (suppressed at tenant gate).

IF tenant.publicEligibilityPosture == PUBLICATION_ELIGIBLE:
  → proceed to object-level posture gate (Design Question B).
```

### A.5 Migration Note (Design-only)

The migration for this field must:
1. Add the `TenantPublicEligibilityPosture` enum to the DB with values
   `NO_PUBLIC_PRESENCE`, `LIMITED_PUBLIC_PRESENCE`, `PUBLICATION_ELIGIBLE`.
2. Add column `public_eligibility_posture` to table `tenants` with
   `DEFAULT 'NO_PUBLIC_PRESENCE' NOT NULL`.
3. All existing tenants default to `NO_PUBLIC_PRESENCE` — zero public exposure by default.
4. No back-fill required. Eligibility must be explicitly set per tenant.

**Not a migration to run now.** Execution is gated by user approval per AGENTS.md DB rules.

---

## Design Question B — Object Publication Posture

### B.1 Authority Basis

Per `TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` §2.2, the canonical
object publication posture vocabulary is:

| Posture Value | Meaning |
|---|---|
| `PRIVATE_OR_AUTH_ONLY` | Not visible on any public surface. Default. |
| `B2B_PUBLIC` | Visible on B2B public discovery surfaces only. |
| `B2C_PUBLIC` | Visible on B2C public surfaces only (not in scope for this slice). |
| `BOTH` | Visible on both B2B and B2C public surfaces. |

Default is `PRIVATE_OR_AUTH_ONLY`. No object is public by default.

### B.2 Models Requiring a Publication Posture Field

Schema repo-truth confirms the following three categories of objects participate in
B2B public discovery:

**Category 1: Org-level supplier presence (`organizations` table)**

The `organizations` table governs whether an org's supplier presence (identity, trust,
capability, taxonomy) may appear on the B2B public discovery surface.

```sql
-- Column to add to organizations table
ALTER TABLE organizations
  ADD COLUMN publication_posture VARCHAR(30) NOT NULL DEFAULT 'PRIVATE_OR_AUTH_ONLY';

-- DB CHECK to enforce vocabulary
ALTER TABLE organizations
  ADD CONSTRAINT organizations_publication_posture_check
  CHECK (publication_posture IN ('PRIVATE_OR_AUTH_ONLY', 'B2B_PUBLIC', 'B2C_PUBLIC', 'BOTH'));
```

Prisma field design:
```prisma
model organizations {
  // ... existing fields ...
  publication_posture  String  @default("PRIVATE_OR_AUTH_ONLY") @db.VarChar(30)
}
```

**Category 2: Catalog item offering previews (`catalog_items` table)**

The `catalog_items` table governs whether an individual offering item may appear in
the bounded offering preview on the B2B public discovery surface.

Schema confirms: `active Boolean @default(true)` is a **soft-delete only** flag (index
confirms `@@index([tenantId, active])`). It does not govern public visibility. A new
`publication_posture` column is needed.

```sql
ALTER TABLE catalog_items
  ADD COLUMN publication_posture VARCHAR(30) NOT NULL DEFAULT 'PRIVATE_OR_AUTH_ONLY';

ALTER TABLE catalog_items
  ADD CONSTRAINT catalog_items_publication_posture_check
  CHECK (publication_posture IN ('PRIVATE_OR_AUTH_ONLY', 'B2B_PUBLIC', 'B2C_PUBLIC', 'BOTH'));
```

Prisma field design:
```prisma
model CatalogItem {
  // ... existing fields ...
  publicationPosture  String  @default("PRIVATE_OR_AUTH_ONLY")  @map("publication_posture")  @db.VarChar(30)
}
```

**Category 3: Certifications — NO separate posture field**

`Certification` rows inherit visibility from the org-level posture gate.
Trust qualification preview visibility is determined by:
1. Org-level `publication_posture` (from `organizations`)
2. Certification lifecycle state must be `APPROVED` (confirmed schema: `issuedAt` is set on
   APPROVED state; `lifecycleStateId` FK to `lifecycle_states`)

A separate `publication_posture` field on `Certification` is not warranted. Trust signal
exposure is a consequence of org-level eligibility, not a per-certification election.

### B.3 Object Posture Evaluation Chain

```
IF tenant.publicEligibilityPosture != PUBLICATION_ELIGIBLE:
  → object posture is irrelevant. Tenant gate already suppressed this org.

IF tenant.publicEligibilityPosture == PUBLICATION_ELIGIBLE:
  IF org.publication_posture NOT IN ('B2B_PUBLIC', 'BOTH'):
    → org not eligible for B2B public discovery. Exclude. Stop.
  → org passes. Proceed to projection layer (Design Question C).

FOR each catalog_item in offering preview:
  IF item.publication_posture NOT IN ('B2B_PUBLIC', 'BOTH'):
    → exclude item from preview. Other items may still appear.
  IF item.active == false:
    → exclude item (soft-deleted, regardless of posture).
```

### B.4 Aggregator Tenant Rule

`TenantType.AGGREGATOR` tenants remain `PRIVATE_OR_AUTH_ONLY` at the object level by default.
No bounded unit has yet authorized `B2B_PUBLIC` posture for aggregator objects.
This is consistent with the locked authority: "Aggregator objects remain `PRIVATE_OR_AUTH_ONLY`
unless later bounded unit authorizes."

---

## Design Question C — Governed Public-Safe B2B Projection Layer

### C.1 Why a Dedicated Service Is Required

Per `TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` §3.3:

> "Public surfaces must consume a dedicated governed public projection layer — not raw
> operational records."

The existing `counterpartyProfileAggregation.service.ts` produces `CounterpartyDiscoveryEntry`
but is **not reusable as-is** for public surfaces:

| Factor | CounterpartyDiscoveryEntry | Required for PublicB2BProjectionService |
|---|---|---|
| Auth gate | Required: AGGREGATOR or INTERNAL tenant | None — public endpoint |
| DB context | `withOrgAdminContext` / `withAdminContext` | Service-role (no `app.org_id` RLS context) |
| Surface | Authenticated counterparty discovery | Unauthenticated public B2B index |
| Eligibility gate | None | Requires tenant eligibility + object posture check |
| Publication posture check | None | Required |
| Output type | `CounterpartyDiscoveryEntry` | `PublicB2BSupplierEntry` (new type) |

`CounterpartyDiscoveryEntry` serves as a **data-backbone blueprint only**. Its field shape
(`orgId`, `slug`, `legalName`, `orgType`, `jurisdiction`, `certificationCount`,
`certificationTypes`, `hasTraceabilityEvidence`, `discoverySafeTaxonomy`) is the correct
inspiration for `PublicB2BSupplierEntry`, but a purpose-built service is required.

### C.2 Service Name and Location

```
server/src/services/publicB2BProjection.service.ts
```

Service name: `PublicB2BProjectionService`

### C.3 Canonical Inputs

The service queries the following models via **service-role DB access** (no RLS `app.org_id`
context — this is a public read path with no caller auth token):

| Source | Fields consumed |
|---|---|
| `Tenant` | `id`, `type`, `publicEligibilityPosture` |
| `TenantBranding?` | `logoUrl` (for brand presence signal only) |
| `organizations` | `id`, `slug`, `legal_name`, `org_type`, `jurisdiction`, `primary_segment_key`, `status`, `publication_posture` |
| `OrganizationSecondarySegment[]` | `segment_key` |
| `OrganizationRolePosition[]` | `role_position_key` |
| `Certification[]` | `certificationType`, `lifecycleStateId` (APPROVED state only, filtered by `issuedAt IS NOT NULL`) |
| `TraceabilityNode[]` | `visibility = 'SHARED'` rows only (count/presence signal) |
| `CatalogItem[]` | `publication_posture IN ('B2B_PUBLIC', 'BOTH')` AND `active = true` (bounded preview, max 5 items) |

**Note on `DISCOVERY_ELIGIBLE_ORG_TYPES`:** The existing service confirms
`DISCOVERY_ELIGIBLE_ORG_TYPES = ['B2B']`. `PublicB2BProjectionService` applies the same
constraint: only `org_type = 'B2B'` tenants are candidates for B2B public projection.

**Note on `DISCOVERY_ELIGIBLE_STATUSES`:** The existing service confirms
`DISCOVERY_ELIGIBLE_STATUSES = ['ACTIVE', 'VERIFICATION_APPROVED']`. The public projection
service applies the same org status constraint.

### C.4 Output Type

```typescript
// New type — to be defined in publicB2BProjection.service.ts

export type PublicB2BSupplierTaxonomy = {
  primarySegment: string | null;
  secondarySegments: string[];
  rolePositions: string[];
};

export type PublicB2BOfferingPreviewItem = {
  name: string;
  moq: number;
  imageUrl: string | null;
};

export type PublicB2BSupplierEntry = {
  slug: string;
  legalName: string;
  orgType: string;              // always 'B2B' for this surface
  jurisdiction: string;
  certificationCount: number;
  certificationTypes: string[];
  hasTraceabilityEvidence: boolean;
  taxonomy: PublicB2BSupplierTaxonomy;
  offeringPreview: PublicB2BOfferingPreviewItem[];  // max 5 items
  publicationPosture: 'B2B_PUBLIC' | 'BOTH';
  eligibilityPosture: 'PUBLICATION_ELIGIBLE';
};
```

**Strictly prohibited in `PublicB2BSupplierEntry`:**
- `price` / pricing fields (raw or derived)
- Negotiation state, RFQ state, order state, trade state
- Authenticated user/account continuity fields
- Admin-only or governance-only fields
- Internal operational records (`risk_score`, `plan`, `registration_no`, `external_orchestration_ref`)
- Unpublished or incomplete draft data

### C.5 Projection Safety Gate (Applied Per Entry)

Before assembling a `PublicB2BSupplierEntry`, the projection service MUST verify:

1. `tenant.publicEligibilityPosture == PUBLICATION_ELIGIBLE`
2. `org.publication_posture IN ('B2B_PUBLIC', 'BOTH')`
3. `org.org_type IN ('B2B')`
4. `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')`
5. Every rendered field is in an approved payload category (per §3.1 of the visibility/projection
   model decision)
6. No prohibited payload category is included (per §3.2)
7. Surface stops at preview, trust, and lawful inquiry entry context

If any gate fails: exclude the org silently. Do not return partial entries.

---

## Design Question D — Public B2B Endpoint Contract

### D.1 Minimum Viable Route

```
GET /api/public/b2b/suppliers
```

**No auth middleware.** This is a public endpoint. No `tenantAuthMiddleware`,
no `databaseContextMiddleware`, no JWT required.

**File placement:** `server/src/routes/public.ts` (alongside existing public endpoints:
`GET /entry/resolve`, `GET /tenants/resolve`, `GET /tenants/by-email`).

### D.2 Query Parameters

| Parameter | Type | Required | Default | Max | Notes |
|---|---|---|---|---|---|
| `segment` | string | No | — | — | Filter by `primary_segment_key` or `secondary_segments.segment_key` |
| `geo` | string | No | — | — | Filter by `jurisdiction` (exact match or prefix) |
| `page` | integer | No | 1 | — | Pagination cursor |
| `limit` | integer | No | 20 | 100 | Page size cap |

All parameters are optional. With no parameters the endpoint returns all
`PUBLICATION_ELIGIBLE` × `B2B_PUBLIC`-or-`BOTH` eligible suppliers, paginated.

### D.3 Response Shape

```typescript
export type PublicB2BDiscoveryResponse = {
  items: PublicB2BSupplierEntry[];
  total: number;
  page: number;
  limit: number;
};
```

HTTP 200 with `Content-Type: application/json`.

Empty result (no eligible suppliers) returns:
```json
{ "items": [], "total": 0, "page": 1, "limit": 20 }
```
Not a 404. Absence of eligible data is not an error condition.

### D.4 Rate Limiting

Subject to the existing `RateLimitAttempt` table pattern used for public endpoints
(`key`, `endpoint`, `realm`, `expiresAt`). Realm: `PUBLIC`. Endpoint key:
`/api/public/b2b/suppliers`. Window and limit values to be defined in implementation slice.

### D.5 What This Endpoint Is NOT

- Does not serve pricing, negotiation state, RFQ threads, order/trade data.
- Does not serve authenticated continuity (no session, no JWT, no org context on caller).
- Does not serve admin-only, governance-only, or unpublished fields.
- Does not serve `B2C_PUBLIC`-only objects.
- Does not expose internal fields: `risk_score`, `plan`, `registration_no`, `org_id` (UUID).
- The `orgId` UUID is intentionally excluded from the public response. The `slug` is the
  public identifier.
- This endpoint does NOT open the `PUBLIC_B2B_DISCOVERY` AppState in `App.tsx`. That is
  a later slice.

### D.6 OpenAPI Contract Update Required

When this endpoint is implemented, `shared/contracts/openapi.tenant.json` must be updated
(or a new public-plane OpenAPI contract created if warranted) to document:
- `GET /api/public/b2b/suppliers` path
- Query parameters
- Response schema referencing `PublicB2BSupplierEntry`

This is deferred to the implementation slice per D-007.

---

## Design Question E — Precondition Sequencing

The following ordered sequence is **mandatory** before
`PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` may open. Each step is a gate; if any step
fails, execution must stop and a blocker report must be emitted.

```
Step 1:  Schema migration SQL written and reviewed.
         Adds:
         (a) enum TenantPublicEligibilityPosture (NO_PUBLIC_PRESENCE | LIMITED_PUBLIC_PRESENCE
             | PUBLICATION_ELIGIBLE) on the tenants table
         (b) column public_eligibility_posture on tenants,
             DEFAULT 'NO_PUBLIC_PRESENCE', NOT NULL
         (c) column publication_posture on organizations,
             DEFAULT 'PRIVATE_OR_AUTH_ONLY', VARCHAR(30), NOT NULL + CHECK constraint
         (d) column publication_posture on catalog_items,
             DEFAULT 'PRIVATE_OR_AUTH_ONLY', VARCHAR(30), NOT NULL + CHECK constraint

Step 2:  User approves migration. Per AGENTS.md §6 DB rules.

Step 3:  SQL applied via: psql -f <migration.sql> using DATABASE_URL
         Verify: no ERROR, no ROLLBACK in output.

Step 4:  pnpm -C server exec prisma db pull
         Verify: schema.prisma updated, new fields visible.

Step 5:  pnpm -C server exec prisma generate
         Verify: generated client includes new fields/enum.

Step 6:  PublicB2BProjectionService built and unit-tested.
         Service must pass all five projection safety gates per §C.5.
         At least one unit test for "eligible supplier is projected correctly."
         At least one unit test for "ineligible supplier is excluded."

Step 7:  GET /api/public/b2b/suppliers route wired in public.ts.
         Health check: server starts. GET /health returns 200.
         Route check: GET /api/public/b2b/suppliers returns 200 with valid schema.

Step 8:  Fresh readiness assessment run.
         At least ONE tenant with publicEligibilityPosture = PUBLICATION_ELIGIBLE
         AND at least one org/catalog_item with publication_posture = B2B_PUBLIC or BOTH
         must exist in the database.
         Without this, the public page has no content to show and cannot meaningfully open.

Step 9:  Layer 0 product_delivery_priority lifted from NONE_OPEN.
         This is a user decision. It cannot be automated.

Step 10: PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE may open.
         Scope: PUBLIC_B2B_DISCOVERY AppState in App.tsx, frontend page component,
         route wiring, and UI implementation.
```

**Critical constraint:** Steps 1–5 are DB/schema steps. Step 6–7 are service/route steps.
Step 8 is a data validation gate. Step 9 is a governance gate. Step 10 is the page
implementation. Steps 1–9 are all within the precondition implementation slice.
Step 10 is a separate slice.

---

## Design Question F — Next Lawful Slice

### F.1 Slice Name

`PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE`

### F.2 Slice Type

**Plumbing / precondition implementation slice.**

This is NOT the page implementation slice. This slice covers:
- Schema migration for eligibility and publication posture fields (Steps 1–5 above)
- `PublicB2BProjectionService` (`server/src/services/publicB2BProjection.service.ts`)
- `GET /api/public/b2b/suppliers` wired in `server/src/routes/public.ts`
- Unit tests for the projection service
- Fresh readiness assessment (Step 8)

This slice does NOT include:
- `PUBLIC_B2B_DISCOVERY` AppState added to `App.tsx`
- Frontend page component for B2B public discovery
- Any UI implementation
- B2C readiness (separate slice, separate authority)

### F.3 Pre-Conditions to Open This Slice

1. This artifact (`TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md`) committed.
2. Layer 0 `product_delivery_priority` no longer `NONE_OPEN` (user decision required).
3. No BLOCKED items that conflict with schema migration (current BLOCKED.md: White Label Co
   = REVIEW-UNKNOWN. This does not block schema migration for public projection posture fields).

### F.4 What This Slice Unlocks

Completing `PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE` makes
`PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` openable — contingent on:
- Passing readiness assessment (Step 8)
- Layer 0 posture allowing product delivery
- At least one `PUBLICATION_ELIGIBLE` × `B2B_PUBLIC` supplier exists in the DB

---

## Governance Boundaries Confirmed

| Boundary | Status |
|---|---|
| No runtime files changed by this artifact | ✅ Confirmed |
| No schema applied by this artifact | ✅ Design-only |
| No migrations run | ✅ Confirmed |
| No Layer 0 control files modified | ✅ Confirmed |
| B2C readiness not opened | ✅ Out of scope for this slice |
| No implementation begun | ✅ D-007 enforced |
| CounterpartyDiscoveryEntry treated as precursor/blueprint only | ✅ Confirmed §C.1 |
| Readiness not retroactively overstated | ✅ Confirmed — Step 8 requires fresh assessment |
| B2B public discovery remains discovery/inquiry-intent only | ✅ No pricing, no transactions |
| Counterparty aggregation service not reused as public-safe | ✅ New purpose-built service required |
| D-024 (public market-access surfaces are governed) applied | ✅ Throughout |
| AGGREGATOR objects remain PRIVATE_OR_AUTH_ONLY | ✅ Confirmed §B.4 |

---

## Appendix: Confirmed Repo-Truth Basis

### Schema Confirmed Absent (all gaps verified)

| Expected field | Model | Status |
|---|---|---|
| `publicEligibilityPosture` | `Tenant` | ABSENT — confirmed |
| `publication_posture` | `organizations` | ABSENT — confirmed |
| `publicationPosture` | `CatalogItem` | ABSENT — confirmed |
| `TenantPublicEligibilityPosture` enum | schema.prisma | ABSENT — confirmed |
| Any B2B public visibility gate | all models | ABSENT — confirmed |

### Counterparty Aggregation Service Shape (confirmed)

From `server/src/services/counterpartyProfileAggregation.service.ts`:

```typescript
// DISCOVERY_ELIGIBLE_ORG_TYPES = ['B2B']          confirmed L28
// DISCOVERY_ELIGIBLE_STATUSES = ['ACTIVE', 'VERIFICATION_APPROVED']  confirmed L29
// Auth gate: AGGREGATOR or INTERNAL tenant types only  confirmed
// DB context: withOrgAdminContext / withAdminContext    confirmed
// CounterpartyDiscoveryEntry fields: orgId, slug, legalName, orgType, jurisdiction,
//   certificationCount, certificationTypes, hasTraceabilityEvidence,
//   visibilityIndicators, discoverySafeTaxonomy?       confirmed L49–L59
```

Verdict: **blueprint/precursor only — NOT reusable as public-safe**.

### Public Routes (confirmed)

From `server/src/routes/public.ts`:

```
GET /entry/resolve          — auth/identity resolution
GET /tenants/resolve        — slug-based tenant resolution  
GET /tenants/by-email       — email-based realm resolution
```

No B2B supplier, capability, category, offering, or trust endpoint exists.
`B2B_PUBLIC_DISCOVERY_ENTRY` is a `ResolvedRealmClass` constant for login routing only —
it does NOT serve B2B content.

### Existing Tenant Model Fields (confirmed, no public eligibility field)

```
Tenant: id, slug, name, type (TenantType), status, plan, createdAt, updatedAt,
        isWhiteLabel, branding (TenantBranding?)
TenantType enum: B2B, B2C, INTERNAL, AGGREGATOR
```

---

*Slice: PUBLIC_B2B_PROJECTION_PRECONDITION_SLICE*  
*Artifact status: DECIDED*  
*No further governance reads required before implementation slice opens.*
