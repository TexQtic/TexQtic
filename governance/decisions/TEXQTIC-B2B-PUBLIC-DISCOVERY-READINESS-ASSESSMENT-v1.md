# TEXQTIC — B2B Public Discovery Readiness Assessment v1

Assessment ID: TEXQTIC-B2B-PUBLIC-DISCOVERY-READINESS-ASSESSMENT-v1
Status: ASSESSED — NOT_READY_REQUIRES_PRECONDITION_SLICE
Scope: Governance / readiness assessment / PUBLIC_B2B_DISCOVERY implementation slice
Date: 2026-04-22
Authorized by: Paresh
Assessment class: Readiness-assessment-only; no runtime files changed; no Layer 0 drift

---

## 1. Purpose of This Artifact

This artifact is the mandatory readiness assessment for the `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE`
as required by `TEXQTIC-PUBLIC-DOWNSTREAM-PAGE-ARCHITECTURE-AND-SCOPE-DECISION-v1` §11.2:

> Neither slice may open until:
> 1. This planning artifact exists in governance record (satisfied)
> 2. A readiness assessment confirms at least one eligible public-safe object exists for the pillar
>    (supplier or storefront/product) that the page can render without rendering placeholder content
> 3. Layer 0 product delivery priority is lifted from `NONE_OPEN` for the target slice

This assessment answers condition (2) for the B2B pillar only.

This artifact does not begin implementation. It does not alter App.tsx, server routes, Prisma schema,
or any runtime file. It does not open the B2C readiness question. It does not alter Layer 0.

---

## 2. Accepted Baseline

The following are accepted as verified and closed:

- Neutral public-entry homepage is implemented and verified (`f108f0e`)
- `TEXQTIC-PUBLIC-DOWNSTREAM-PAGE-ARCHITECTURE-AND-SCOPE-DECISION-v1` is locked (`6d3b28f`)
- `PUBLIC_B2B_DISCOVERY` is defined as a future dedicated `AppState` — not yet in runtime
- The following authority decisions are locked and consumed by this assessment:
  - `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` (B2B object model and inquiry)
  - `TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1` (projection discipline and eligibility)
  - `TEXQTIC-PUBLIC-MARKETPLACE-ARCHITECTURE-DECISION-v1` (market-access model)
  - `TEXQTIC-PUBLIC-VS-AUTHENTICATED-SURFACE-BOUNDARY-DECISION-v1` (pillar boundary matrix)
  - `TEXQTIC-PUBLIC-SHELL-AND-TRANSITION-ARCHITECTURE-DECISION-v1` (shell ownership)
  - `TEXQTIC-NEUTRAL-PLATFORM-PUBLIC-ENTRY-SURFACE-DECISION-v1` (homepage composition)
  - `TEXQTIC-PUBLIC-DOWNSTREAM-PAGE-ARCHITECTURE-AND-SCOPE-DECISION-v1` (page planning)

---

## 3. Repo Truth Read Set

The following repo files were inspected for this assessment:

| File | What Was Read |
| --- | --- |
| `server/src/routes/public.ts` | All public-facing endpoints and route definitions |
| `server/src/routes/tenant.ts` (aggregator section) | Aggregator discovery endpoint ~L1085–1145 |
| `server/src/services/counterpartyProfileAggregation.service.ts` | Full service — data types, projection logic, query strategy |
| `server/prisma/schema.prisma` | All models: Tenant, TenantBranding, organizations, CatalogItem, Certification, TenantType enum |
| `services/aggregatorDiscoveryService.ts` (frontend) | Frontend client — endpoint and types |
| `governance/control/OPEN-SET.md` | Layer 0 posture |
| `governance/control/NEXT-ACTION.md` | `product_delivery_priority` state |
| `governance/control/BLOCKED.md` | Current blockers and holds |
| Authority decisions (all above) | Planning and projection model requirements |

---

## 4. Object Availability Assessment

The five lawful B2B public discovery object classes (from the locked B2B discovery decision) are assessed
against repo truth as follows:

### 4.1 `SUPPLIER_DISCOVERY_PROFILE`

**Requires**: Public-safe supplier identity, business summary, and discovery-safe profile context —
projected for public, not raw internal records.

**Repo truth**:

- The `organizations` table contains `slug`, `legal_name`, `org_type`, `jurisdiction`, `status` —
  fields that could partially satisfy supplier identity payload requirements.
- The `TenantBranding` model contains `logoUrl` and `themeJson` — potentially useful for brand context.
- The `Tenant` model contains `name`, `slug`, `type`, `status` — public-safe identity fields.
- `B2B_PUBLIC_DISCOVERY_ENTRY` exists as a `ResolvedRealmClass` constant in `public.ts` but is used
  only as a resolution classification for login/entry routing. It does not serve or project supplier
  content to a public caller.
- **There is no `SupplierDiscoveryProfile` model**, no public-projection read model, and no public-safe
  transformation layer for supplier identity.
- **Raw org/tenant records are not public-safe projections.** The visibility model decision explicitly
  prohibits rendering from raw internal operational records directly.
- **No tenant eligibility posture field exists** (`NO_PUBLIC_PRESENCE` / `LIMITED_PUBLIC_PRESENCE` /
  `PUBLICATION_ELIGIBLE`) anywhere in the schema — meaning no supplier can be evaluated as public-safe
  at the data level.

**Result**: ❌ NOT AVAILABLE — raw data exists but no governed public-safe projection path; no
eligibility gate at schema level.

---

### 4.2 `SUPPLIER_CAPABILITY_PROFILE`

**Requires**: Public-safe capability, process, and category-fit preview — projected for public.

**Repo truth**:

- `OrganizationSecondarySegment` table contains `segment_key` per org — segment coverage data exists.
- `OrganizationRolePosition` table contains `role_position_key` per org — role/capability taxonomy
  data exists.
- `organizations.primary_segment_key` exists for primary category classification.
- The `counterpartyProfileAggregation.service.ts` builds `discoverySafeTaxonomy` from these fields
  (`primarySegment`, `secondarySegments`, `rolePositions`) — this is conceptually close to a
  `SUPPLIER_CAPABILITY_PROFILE` payload.
- **However**: this capability data is only accessible via `GET /api/tenant/aggregator/discovery`,
  an **authenticated** endpoint requiring `tenantAuthMiddleware` and `databaseContextMiddleware`.
  It is gated to `AGGREGATOR` or `INTERNAL` tenant types only.
- **There is no public-facing version of this capability projection** — no `GET /api/public/...`
  endpoint for capability data.
- The segment and role-position fields are raw internal taxonomy records with no object-level
  publication posture gate (`B2B_PUBLIC` / `PRIVATE_OR_AUTH_ONLY`) in the schema.

**Result**: ❌ NOT AVAILABLE AS PUBLIC-SAFE — data backbone partially exists; public-safe projection
path does not exist; publication posture gate does not exist.

---

### 4.3 `CATEGORY_CAPABILITY_DISCOVERY_VIEW`

**Requires**: Public-safe category or segment entry surface showing governed supplier-fit context.

**Repo truth**:

- Category/segment data exists in `organizations.primary_segment_key` and
  `OrganizationSecondarySegment.segment_key` — the raw taxonomy exists.
- The counterparty aggregation service assembles `discoverySafeTaxonomy` from this — but only for
  authenticated AGGREGATOR tenants.
- **There is no public-facing category browse endpoint.** `public.ts` has three endpoints: all are
  identity/auth-resolution only. None serve category or segment content.
- No `CategoryCapabilityDiscoveryView` model or read model exists.
- No category publication posture field exists in the schema.

**Result**: ❌ NOT AVAILABLE — taxonomy data exists in raw form; no public projection layer; no
public-facing endpoint; no publication posture gate.

---

### 4.4 `BOUNDED_OFFERING_PREVIEW`

**Requires**: Public-safe non-pricing product or offering preview attached to supplier discovery.

**Repo truth**:

- `CatalogItem` model contains `name`, `sku`, `description`, `price`, `active`, `imageUrl`, `moq`.
  These fields have potential B2B offering preview relevance (`name`, `description`, `moq`, `imageUrl`
  could form a bounded offering preview).
- **There is no public offering visibility flag.** `CatalogItem.active` is a soft-delete/active flag,
  not a public-safe publication posture. There is no `isPublic`, `publicationPosture`, `B2B_PUBLIC`,
  or equivalent field on `CatalogItem`.
- No `GET /api/public/.../catalog` or `GET /api/public/.../offerings` endpoint exists.
- `GET /api/tenant/catalog/items` is authenticated-only (tenant auth + database context middleware).
- The `price` field on `CatalogItem` is `Decimal?` — transactional pricing, explicitly prohibited from
  B2B public projection by both the B2B discovery decision and the visibility model decision.
- No public-safe offering projection layer exists.

**Result**: ❌ NOT AVAILABLE — raw catalog data exists; no public visibility gate; no public endpoint;
price field would require explicit exclusion at projection layer; no public-safe projection path.

---

### 4.5 `TRUST_QUALIFICATION_PREVIEW`

**Requires**: Public-safe trust signals, certification summary, qualification cues, and verified-business
posture — projected for public.

**Repo truth**:

- `Certification` model exists with `certificationType`, `issuedAt`, `expiresAt`, and `lifecycleState`
  relation — this data is materially relevant to a trust qualification preview payload.
- `TraceabilityNode` data with `nodeType` and `visibility` is used in the counterparty aggregation
  service for `visibilityIndicators` and `hasTraceabilityEvidence`.
- The counterparty aggregation service assembles `certificationCount`, `certificationTypes`,
  `hasTraceabilityEvidence`, and `visibilityIndicators` into a `CounterpartyDiscoveryEntry` — this is
  functionally the closest thing in the repo to a `TRUST_QUALIFICATION_PREVIEW` payload.
- **However**: this trust data is accessible **only** via the authenticated `AGGREGATOR`-gated
  `GET /api/tenant/aggregator/discovery` endpoint.
- `Certification` rows are RLS-scoped to `org_id` with admin-context enforcement (`withAdminContext`).
  No public read path exists.
- No public-safe trust projection layer, no public trust endpoint, and no `B2B_PUBLIC` posture flag
  on certifications exist.

**Result**: ❌ NOT AVAILABLE AS PUBLIC-SAFE — trust data exists in greatest relative depth of all five
object classes; an authenticated AGGREGATOR-only read path exists; but no public-safe projection
path, no public endpoint, and no publication posture gate exist.

---

## 5. Projection Readiness Assessment

**Question**: Is there a governed/public-safe projection path already available, or is the data still
only present as raw/internal operational truth?

### 5.1 What the visibility model decision requires

`TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1` §3.3 states:

> public surfaces must consume a dedicated governed public projection layer rather than reading raw
> operational records directly — that public projection layer may be implemented later as a governed
> read model, a separate projection model, or a publication-layer transformation, but the logical
> separation is mandatory now

This means three logical gates must be passed before any B2B object can be rendered on a public page:

1. **Tenant-level eligibility gate**: Tenant must be evaluated into one of `NO_PUBLIC_PRESENCE`,
   `LIMITED_PUBLIC_PRESENCE`, or `PUBLICATION_ELIGIBLE` — this posture vocabulary does **not exist**
   in the current Prisma schema. There are no fields on `Tenant` or `organizations` that record
   public eligibility posture.

2. **Object-level publication posture**: Each object must carry an approved posture: `B2B_PUBLIC`,
   `B2C_PUBLIC`, `BOTH`, or `PRIVATE_OR_AUTH_ONLY` — this posture vocabulary does **not exist** in
   the current Prisma schema. There are no such fields on `CatalogItem`, `Certification`,
   `organizations`, or any other relevant model.

3. **Governed public-safe projection layer**: A read model, projection transformation, or publication
   layer must exist that enforces the projection category discipline and stops prohibited fields from
   being rendered — **no such layer exists** in current runtime. The counterparty aggregation service
   is the closest functional precursor, but it is authenticated-only and not wired to a public
   endpoint.

**Projection readiness result**: ❌ NOT READY — the projection infrastructure mandated by the
visibility model decision (tenant eligibility gate, object publication posture, governed public-safe
projection layer) does not exist in any form in current runtime or schema.

---

## 6. Eligible Data Presence Assessment

**Question**: Is there at least one eligible supplier/capability/category/offering/trust projection
that could populate the page without fake content?

**Answer**: No.

While underlying data exists in the schema for all five object class domains (organizations with
taxonomy, certifications, catalog items, traceability nodes), none of this data has been:

- gated behind a tenant-level public eligibility posture
- assigned an object-level publication posture
- projected through a governed public-safe transformation
- exposed via a public-facing endpoint

The `CounterpartyDiscoveryEntry` payload in the counterparty aggregation service (`orgId`, `slug`,
`legalName`, `orgType`, `jurisdiction`, `certificationCount`, `certificationTypes`,
`hasTraceabilityEvidence`, `visibilityIndicators`, `discoverySafeTaxonomy`) is the closest existing
data shape to a B2B public discovery payload. It correctly excludes transactional pricing and
negotiation state. But it is:

- exclusively authenticated (requires `tenantAuthMiddleware`)
- exclusively AGGREGATOR/INTERNAL tenant-type gated
- not designed or governed as a public-safe projection
- not linked to a tenant eligibility gate
- not exposed via any `GET /api/public/...` endpoint

This service's existence is evidence that the data backbone and a partial read-model concept exist —
but it does not constitute a public-safe projection that satisfies the implementation-opening
threshold.

**Eligible data result**: ❌ NO ELIGIBLE PUBLIC-SAFE PROJECTABLE OBJECT EXISTS — raw data is present;
projection path is absent; eligibility gate is absent; no public endpoint exists.

---

## 7. Minimum Viable Page Assessment

**Question**: What is the minimum lawful B2B page that could be built right now, if any?

**Answer**: None that satisfies the governed-projection discipline required by locked authority.

The minimum lawful `PUBLIC_B2B_DISCOVERY` page (per the downstream page planning decision) requires at
least one renderable non-placeholder B2B public object from the five classes. Rendering any of the
five object classes without a governed public-safe projection layer would violate:

- `TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1` §3.3 (must not render from raw records)
- `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` §3.1 (payload discipline rule)
- `TEXQTIC-PUBLIC-DOWNSTREAM-PAGE-ARCHITECTURE-AND-SCOPE-DECISION-v1` §9.3 (public-safe projection discipline)

A structural placeholder page (AppState value + empty shell component + back CTA + auth CTA) could be
created without violating these rules, but:

- it would be a non-renderable shell with no object content
- it would not satisfy the threshold stated in the downstream page planning decision (§11.2 condition 2)
- it would constitute implementation of `PUBLIC_B2B_DISCOVERY` which this slice does not authorize

**Minimum viable page result**: ❌ NO MINIMUM VIABLE PAGE POSSIBLE without first creating the governed
public projection precondition infrastructure.

---

## 8. Blocker Identification

The following gaps are real blockers, stated in order of resolution dependency:

| # | Blocker | Type |
| --- | --- | --- |
| B-01 | **No tenant-level public eligibility posture field in schema** — `NO_PUBLIC_PRESENCE` / `LIMITED_PUBLIC_PRESENCE` / `PUBLICATION_ELIGIBLE` vocabulary mandated by visibility model does not exist on `Tenant` or `organizations` | Schema gap — projection precondition |
| B-02 | **No object-level publication posture field in schema** — `B2B_PUBLIC` / `PRIVATE_OR_AUTH_ONLY` vocabulary mandated by visibility model does not exist on any relevant model (`CatalogItem`, `Certification`, `organizations`) | Schema gap — projection precondition |
| B-03 | **No governed public-safe B2B projection layer** — no read model, projection service, or publication-layer transformation exists for any of the five B2B object classes that satisfies the projection discipline rule | Missing service layer |
| B-04 | **No public-facing B2B discovery endpoint** — `server/src/routes/public.ts` contains only three endpoints (entry resolve, tenant resolve, tenant by-email); all are auth/identity-resolution only; no B2B supplier, capability, category, offering, or trust endpoint exists | Missing route |
| B-05 | **Existing counterparty discovery data is AGGREGATOR-authenticated-only** — the closest functional precursor (`listCounterpartyDiscoveryEntries` via `GET /api/tenant/aggregator/discovery`) is gated behind tenant auth and AGGREGATOR/INTERNAL tenant type; it is not public-safe and not wired to a public endpoint | Access gate |
| B-06 | **`PUBLIC_B2B_DISCOVERY` AppState does not exist in runtime** — `App.tsx` has no `PUBLIC_B2B_DISCOVERY` state value; `selectNeutralPublicEntryPath('B2B')` only scrolls to an in-page section | Runtime gap — implementation not yet open |
| B-07 | **Layer 0 `product_delivery_priority: NONE_OPEN`** — no product delivery unit is currently open; implementation may not begin until this is lifted for the target slice | Layer 0 gate |

### Blocker dependency chain

B-01 → B-02 must be resolved before B-03 can be designed.
B-03 must exist before B-04 can be correctly implemented.
B-04 must be live before B-06 can render real content.
B-07 is a governance gate independent of technical readiness — it must be lifted separately.

B-05 is not a blocker that needs to be resolved separately — rather, the counterparty aggregation
service provides a data-layer blueprint that a future public projection slice can adapt.

---

## 9. Open / Do Not Open Result

```
RESULT: NOT_READY_REQUIRES_PRECONDITION_SLICE
```

Implementation of `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` may NOT lawfully open now.

Reason: None of the three pre-implementation conditions stated in the downstream page planning
decision are fully satisfied:

| Condition | Status |
| --- | --- |
| 1. Planning artifact exists | ✅ Satisfied (`6d3b28f`) |
| 2. Readiness assessment confirms at least one eligible public-safe object | ❌ NOT satisfied — no governed public-safe B2B projection exists |
| 3. Layer 0 `product_delivery_priority` lifted from `NONE_OPEN` | ❌ NOT satisfied — currently `NONE_OPEN` |

Both conditions 2 and 3 are unsatisfied. The implementation slice is blocked.

---

## 10. What May Be Noted About the Data Backbone

This assessment does not over-claim readiness, but it truthfully records that the following data-layer
work is the closest existing precursor to B2B public projection:

- **Structural precursor exists**: `counterpartyProfileAggregation.service.ts` demonstrates that the
  data backbone (organizations, certifications, traceability nodes, segment taxonomy, role positions)
  can be assembled into a B2B discovery-shaped payload. The `CounterpartyDiscoveryEntry` shape is
  broadly compatible with portions of the `SUPPLIER_DISCOVERY_PROFILE`, `SUPPLIER_CAPABILITY_PROFILE`,
  and `TRUST_QUALIFICATION_PREVIEW` object classes.

- **What this means for the precondition slice**: A future `PUBLIC_B2B_PROJECTION_PRECONDITION_SLICE`
  does not need to invent a new data backbone from scratch. It needs to:
  1. add tenant eligibility posture gate (schema + service)
  2. add object-level publication posture gate (schema + service)
  3. adapt or extend the existing counterparty aggregation logic into a public-safe read path
     that enforces projection discipline and strips authenticated-only fields
  4. create a governed public B2B endpoint in `public.ts`
  5. ensure all of the above pass through the two-tier eligibility gate before rendering

- **Boundary caution**: Adapting the counterparty aggregation service for public use must not leak
  the authenticated-only fields it currently collects for AGGREGATOR workspaces. The projection
  precondition slice must explicitly define what is safe to expose vs. what must remain gated.

---

## 11. Next Lawful Slice

The exact next lawful slice is:

```
PUBLIC_B2B_PROJECTION_PRECONDITION_SLICE
```

**Type**: Precondition slice (not implementation of `PUBLIC_B2B_DISCOVERY`)

**Lawful scope**:

1. Design and add the tenant-level public eligibility posture gate to the schema
   (field additions to `Tenant` or `organizations` for `NO_PUBLIC_PRESENCE` / `LIMITED_PUBLIC_PRESENCE` /
   `PUBLICATION_ELIGIBLE` posture)
2. Design and add object-level publication posture gate to the schema
   (`B2B_PUBLIC` / `PRIVATE_OR_AUTH_ONLY` field additions to the relevant object models)
3. Specify the governed public-safe B2B projection layer — its data sources, projection transformation
   rules, prohibited field exclusions, and public read model shape
4. Define the public-facing B2B endpoint contract (route shape, query parameters, response schema)

**This slice is NOT**:

- Implementation of `PUBLIC_B2B_DISCOVERY` AppState or page component
- Full discovery page rendering
- Aggregator discovery auth-pathway work
- B2C readiness work

**Ordering requirement**: This precondition slice must be completed and a fresh readiness assessment
must be run before `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` may open. Layer 0
`product_delivery_priority` must also be lifted independently.

---

## 12. Audit Trail

| Field | Value |
| --- | --- |
| Authorized by | Paresh |
| Assessment date | 2026-04-22 |
| Repo truth HEAD at assessment | `6d3b28f` (downstream page planning locked) |
| Layer 0 posture at assessment | `HOLD-FOR-BOUNDARY-TIGHTENING`, `product_delivery_priority: NONE_OPEN` |
| Files read | See §3 |
| Runtime files changed | None |
| Layer 0 changed | None |
| Prior locked decisions consumed | All listed in §2 |
| Assessment result | `NOT_READY_REQUIRES_PRECONDITION_SLICE` |
| Next lawful slice | `PUBLIC_B2B_PROJECTION_PRECONDITION_SLICE` |
| B2C readiness opened? | No — out of scope for this assessment |
| Implementation opened? | No — assessment only |
