# TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DESIGN-001
## Network Commerce Pool RFQ — Demand-Line Service and Route Design

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DESIGN-001
Status: DESIGN ONLY — NOT AUTHORIZED FOR IMPLEMENTATION
Type: TECS bounded design-only packet
Date: 2026-05-07
Decision authority: Paresh Patel

Implementation gate:
- This packet defines service and route design only.
- This packet does not authorize service implementation, route implementation, schema changes,
  migrations, tests, UI, RFQ schema, supplier routes, allocation, order placement,
  invoice generation, settlement, escrow, or MakerChecker changes.

---

## 1. Executive Summary

This packet designs the owner-only demand-line service and route layer for Network Commerce Pool RFQ.

Key conclusions from repo inspection:

1. **No demand snapshot entity exists in `schema.prisma`** — `NetworkPoolDemandSnapshot` is absent.
   Lock-for-RFQ route implementation is therefore **BLOCKED** until a dedicated demand snapshot
   schema packet is completed and closed.

2. **Service-only first packet is recommended.** Service methods 1–4 (create, update, list,
   cancel) can be implemented without any schema changes. Route implementation should follow as
   a separate packet to keep diffs atomic and testable.

3. **`ncPoolRfqFeatureGateMiddleware` does not yet exist.** It is needed for the lock-for-RFQ
   route only. Its design is included here; implementation belongs in the lock packet.

4. **All five operations are owner-only.** No member or supplier demand-line routes in scope.
   `org_id` is from `dbContext` (JWT) — never from request body.

5. **`metadata_internal_json` should be omitted from default owner API responses.** This field
   is an internal operational field; it should not appear in the route DTO unless explicitly
   needed by owner UX. A future hardening packet can expose it via an explicit flag.

Recommended implementation sequence (after this design):
- Next packet: `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001`
- Before lock: `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001`
- Lock packet after snapshot: `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-001`

---

## 2. Files Inspected

### Governance / authority chain
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001.md` (commit 961a2c1)
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001.md` (commit 8878305)
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-DEPLOY-VERIFY-001.md` (commit 3692a14)
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`

### Schema
- `server/prisma/schema.prisma` — `NetworkPoolDemandLine` model (lines 1912–1988)
- `server/prisma/migrations/20260523000000_nc_pool_lifecycle_seed/migration.sql` — pool state keys
- `server/prisma/migrations/20260524000000_nc_pool_demand_line_schema/migration.sql`

### Service / route patterns
- `server/src/services/networkPool.service.ts` (782 lines)
- `server/src/routes/tenant/pools.ts` (426 lines)
- `server/src/routes/tenant/pools.integration.test.ts` (1318 lines)

### Middleware / utilities
- `server/src/middleware/ncPoolFeatureGate.middleware.ts` (101 lines)
- `server/src/middleware/database-context.middleware.ts` (67 lines)
- `server/src/utils/response.ts` (77 lines)
- `server/src/lib/database-context.ts`

---

## 3. Repo-Truth Findings

### 3A. NetworkPoolDemandLine model — Prisma field names (camelCase → snake_case)

| Prisma field | DB column | Type | Nullable | Default |
|---|---|---|---|---|
| id | id | String (UUID) | NO | gen_random_uuid() |
| ownerOrgId | owner_org_id | String (UUID) | NO | — |
| poolId | pool_id | String (UUID) | NO | — |
| lineRef | line_ref | String VarChar(100) | NO | — |
| commodityCategory | commodity_category | String VarChar(100) | NO | — |
| productCategory | product_category | String? VarChar(100) | YES | — |
| productSpecSummary | product_spec_summary | String? | YES | — |
| qty | qty | Decimal(18,6) | NO | — |
| qtyUnit | qty_unit | String VarChar(50) | NO | — |
| qualityRequirementsJson | quality_requirements_json | Json? | YES | — |
| certificationRequirementsJson | certification_requirements_json | Json? | YES | — |
| packagingRequirementsJson | packaging_requirements_json | Json? | YES | — |
| deliveryLocation | delivery_location | String? VarChar(500) | YES | — |
| deliveryWindowStart | delivery_window_start | DateTime? | YES | — |
| deliveryWindowEnd | delivery_window_end | DateTime? | YES | — |
| tolerancePct | tolerance_pct | Decimal(5,2)? | YES | — |
| priority | priority | Int? | YES | — |
| status | status | String VarChar(50) | NO | 'DRAFT' |
| sourceType | source_type | String VarChar(50) | NO | — |
| sourceMembershipId | source_membership_id | String? (UUID) | YES | — |
| normalizedFromMemberInput | normalized_from_member_input | Boolean | NO | false |
| revisionNo | revision_no | Int | NO | 1 |
| supersedesLineId | supersedes_line_id | String? (UUID) | YES | — |
| metadataInternalJson | metadata_internal_json | Json? | YES | — |
| createdAt | created_at | DateTime | NO | now() |
| updatedAt | updated_at | DateTime | NO | now() |
| lockedAt | locked_at | DateTime? | YES | — |

### 3B. Pool lifecycle states (from 20260523000000_nc_pool_lifecycle_seed)

All defined POOL state keys:
`DRAFT, OPEN, AGGREGATING, CLOSED_FOR_BIDS, QUOTED, ACCEPTED, ALLOCATING, ALLOCATED,
ORDERED, IN_FULFILMENT, PARTIALLY_DELIVERED, DELIVERED, SETTLEMENT_PENDING,
SETTLED (terminal), REJECTED (terminal), WITHDRAWN (terminal), CANCELLED (terminal)`

Main transition flow:
`DRAFT → OPEN → AGGREGATING → CLOSED_FOR_BIDS → QUOTED → ACCEPTED → ALLOCATING →
ALLOCATED → ORDERED → IN_FULFILMENT → ... → SETTLEMENT_PENDING → SETTLED`

### 3C. Snapshot entity status

**`NetworkPoolDemandSnapshot` does not exist in `server/prisma/schema.prisma`.**
Only `ttp_score_snapshots` (unrelated TTP domain) was found.
Lock-for-RFQ route is therefore blocked pending `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001`.

### 3D. Feature gate status

- `ncPoolFeatureGate.middleware.ts` exists: checks `nc.procurement_pools.enabled`
  (two-layer: global flag + per-org override, fail-closed → 503).
- **`ncPoolRfqFeatureGateMiddleware` does NOT exist.** Needed only for the lock-for-RFQ route.

### 3E. Existing pattern conventions observed

From `networkPool.service.ts` and `pools.ts`:
- Error classes defined at the top of the service file (named `*Error`, extend `Error`)
- Input types as exported interfaces
- Record types as exported interfaces (camelCase Prisma → snake_case output)
- Service class injected with `PrismaClient` and optional collaborator services
- `orgId` always from JWT/dbContext — NEVER from request body (D-017-A)
- Private `toRecord()` helper converts Prisma row → typed record
- Private `validate*Input()` helper throws before any DB call
- Route: Zod schemas for body/params/query; `.safeParse()` throughout; no try/catch on Zod
- Route: `onRequest: [tenantAuthMiddleware, databaseContextMiddleware]`, `preHandler: [featureGateMiddleware]`
- Route: `mapServiceError()` helper checks typed errors first; falls through to generic 500
- Route: static routes registered BEFORE parameterized routes (e.g., `/joined` before `/:poolId`)
- Tests: `vi.mock('../../middleware/auth.js')` for auth bypass; `describe.skipIf(!hasDb)`;
  `withBypassForSeed` for flag/seed writes; cleanup sets for created entity IDs

---

## 4. Service Method Design

### File: `server/src/services/networkPoolDemandLine.service.ts`

---

### 4A. Error Classes

```typescript
export class DemandLineNotFoundError extends Error { ... }
export class DemandLineInvalidInputError extends Error { constructor(message: string) }
export class DemandLineInvalidStateError extends Error {
  constructor(currentStatus: string, allowedStatuses: string[]) { ... }
}
export class DemandLineDuplicateRefError extends Error { ... }
export class DemandLineForbiddenError extends Error { ... }  // non-leak: never reveals org mismatch
export class DemandLinePoolNotFoundError extends Error { ... }
export class DemandLinePoolStateError extends Error {
  constructor(currentPoolState: string, allowedStates: string[]) { ... }
}
export class DemandLineSnapshotBlockedError extends Error { ... }
```

### 4B. Input and Record Types

```typescript
// Demand-line status constants (domain values from DB CHECK)
export const DEMAND_LINE_EDITABLE_STATUSES = ['DRAFT', 'ACTIVE'] as const;
export const DEMAND_LINE_CANCELLABLE_STATUSES = ['DRAFT', 'ACTIVE'] as const;
export const DEMAND_LINE_LOCKABLE_STATUSES = ['ACTIVE'] as const;

// Pool states that allow demand-line create/edit/cancel
export const POOL_STATES_ALLOW_DEMAND_LINE_WRITE = ['DRAFT', 'OPEN', 'AGGREGATING'] as const;
// Pool state required for lock-for-RFQ (demand collection window must be active or closing)
export const POOL_STATES_ALLOW_DEMAND_LINE_LOCK = ['AGGREGATING'] as const;

export interface CreateDemandLineInput {
  pool_id: string;
  line_ref: string;
  commodity_category: string;
  product_category?: string | null;
  product_spec_summary?: string | null;
  qty: number;
  qty_unit: string;
  quality_requirements_json?: Record<string, unknown> | null;
  certification_requirements_json?: Record<string, unknown> | null;
  packaging_requirements_json?: Record<string, unknown> | null;
  delivery_location?: string | null;
  delivery_window_start?: string | null;
  delivery_window_end?: string | null;
  tolerance_pct?: number | null;
  priority?: number | null;
  source_type?: 'OWNER_DIRECT' | 'OWNER_NORMALIZED' | 'MEMBERSHIP_DERIVED';
  // source_membership_id: NOT accepted from caller; internal service field only
  // normalized_from_member_input: NOT accepted from caller
  // revision_no: always 1 on creation; not caller-supplied
  // metadata_internal_json: NOT accepted from caller via API (internal field only)
}

export interface UpdateDemandLineInput {
  // All fields optional — only provided fields are updated
  commodity_category?: string;
  product_category?: string | null;
  product_spec_summary?: string | null;
  qty?: number;
  qty_unit?: string;
  quality_requirements_json?: Record<string, unknown> | null;
  certification_requirements_json?: Record<string, unknown> | null;
  packaging_requirements_json?: Record<string, unknown> | null;
  delivery_location?: string | null;
  delivery_window_start?: string | null;
  delivery_window_end?: string | null;
  tolerance_pct?: number | null;
  priority?: number | null;
  // status, source_type, revision_no, locked_at: NOT updatable via this method
  // metadata_internal_json: NOT updatable via API (internal field only)
}

export interface DemandLineListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  commodity_category?: string;
  source_type?: string;
}

export interface DemandLineRecord {
  id: string;
  owner_org_id: string;
  pool_id: string;
  line_ref: string;
  commodity_category: string;
  product_category: string | null;
  product_spec_summary: string | null;
  qty: string;               // Decimal as string (consistent with existing pool pattern)
  qty_unit: string;
  quality_requirements_json: Record<string, unknown> | null;
  certification_requirements_json: Record<string, unknown> | null;
  packaging_requirements_json: Record<string, unknown> | null;
  delivery_location: string | null;
  delivery_window_start: string | null;  // ISO 8601
  delivery_window_end: string | null;
  tolerance_pct: string | null;          // Decimal as string
  priority: number | null;
  status: string;
  source_type: string;
  source_membership_id: string | null;
  normalized_from_member_input: boolean;
  revision_no: number;
  supersedes_line_id: string | null;
  // metadata_internal_json: OMITTED from DemandLineRecord (internal field, not in API response)
  created_at: string;
  updated_at: string;
  locked_at: string | null;
}

export interface DemandLineListPagination {
  limit: number;
  offset: number;
  count: number;
  total: number;
}

export interface DemandLineListResult {
  items: DemandLineRecord[];
  pagination: DemandLineListPagination;
}
```

### 4C. Method: `createDemandLine`

```
createDemandLine(
  ownerOrgId: string,
  userId: string | null,
  input: CreateDemandLineInput,
): Promise<DemandLineRecord>
```

**Preconditions (checked in order):**
1. Validate input:
   - `input.pool_id` is a non-empty UUID
   - `line_ref` is non-empty, max 100 chars
   - `commodity_category` is non-empty, max 100 chars
   - `qty_unit` is non-empty, max 50 chars
   - `qty > 0` (positive finite number)
   - `delivery_window_end >= delivery_window_start` when both present (coerce to Date for compare)
   - `tolerance_pct` is 0–100 when provided
   - `source_type` is one of `OWNER_DIRECT|OWNER_NORMALIZED|MEMBERSHIP_DERIVED`; default to
     `OWNER_DIRECT` if not provided
   - `priority` is a positive integer when provided

2. Load pool with lifecycle state (owner-scoped): `{ id: input.pool_id, orgId: ownerOrgId }`
   - If not found → `DemandLinePoolNotFoundError`
   - If pool state not in `POOL_STATES_ALLOW_DEMAND_LINE_WRITE` → `DemandLinePoolStateError`

3. Duplicate line_ref + revision_no check:
   `{ poolId: input.pool_id, lineRef: input.line_ref, revisionNo: 1 }`
   - If exists → `DemandLineDuplicateRefError`
   (DB UNIQUE constraint also enforces this; service check is fail-fast before insert)

4. Insert demand line at default status `DRAFT`, `revisionNo = 1`.

5. Return `DemandLineRecord` (metadata_internal_json NOT included in returned record).

**Notes:**
- `ownerOrgId` from JWT/dbContext only — never from input body.
- `source_membership_id` and `normalized_from_member_input` are not accepted from API caller.
  They are `null`/`false` for all `OWNER_DIRECT` lines.

---

### 4D. Method: `updateDemandLine`

```
updateDemandLine(
  ownerOrgId: string,
  lineId: string,
  input: UpdateDemandLineInput,
): Promise<DemandLineRecord>
```

**Preconditions (checked in order):**
1. Validate input:
   - At least one field must be present in `input`
   - If `qty` provided: `qty > 0`
   - If `delivery_window_start` or `delivery_window_end` provided:
     validate window coherence (resolve existing value if only one side provided)
   - If `tolerance_pct` provided: 0–100 range
   - If `commodity_category` provided: non-empty, max 100
   - If `qty_unit` provided: non-empty, max 50

2. Load demand line by `{ id: lineId }`:
   - If not found → `DemandLineNotFoundError`
   - If `ownerOrgId` ≠ `row.ownerOrgId` → `DemandLineNotFoundError`
     (non-leak: org mismatch returns same 404 as not found)

3. Load pool lifecycle state for `row.poolId` (owner-scoped to `ownerOrgId`):
   - If pool state not in `POOL_STATES_ALLOW_DEMAND_LINE_WRITE` → `DemandLinePoolStateError`

4. Check demand line status:
   - If `row.status` not in `DEMAND_LINE_EDITABLE_STATUSES` → `DemandLineInvalidStateError`

5. Build Prisma update data from only provided fields. Timestamp `updatedAt = new Date()`.

6. Update and return `DemandLineRecord`.

**Notes:**
- `status`, `source_type`, `revision_no`, `locked_at`, `metadata_internal_json` are NOT
  updatable via this method.
- Delivery window coherence must consider existing stored values when only one side changes:
  load `deliveryWindowStart`/`deliveryWindowEnd` from the DB row before validating.

---

### 4E. Method: `listDemandLines`

```
listDemandLines(
  ownerOrgId: string,
  poolId: string,
  query: DemandLineListQuery,
): Promise<DemandLineListResult>
```

**Preconditions:**
1. Validate `poolId` is a UUID.
2. Normalize query: `limit` default 20, max 100; `offset` default 0; validate integers.
3. Optionally validate `status` is one of the known values when provided.

**Query:**
- `where: { poolId, ownerOrgId }` — double-scoped: pool ID + owner org.
  (This combines application-level owner scoping with implicit RLS enforcement.)
- Optional filters: `status`, `commodityCategory`, `sourceType`
- Order: `[{ createdAt: 'desc' }, { id: 'desc' }]` (consistent with pool list pattern)
- Return `count` + `total` for pagination.

**Notes:**
- `metadata_internal_json` excluded from select projection.
- No member, supplier, or cross-org demand line visibility.
- Pool existence check is implicit — if pool doesn't exist, result is empty list.
  (An explicit pool existence check can be added if non-empty 404 UX is required; defer to
  implementation decision with Paresh.)

---

### 4F. Method: `cancelDemandLine`

```
cancelDemandLine(
  ownerOrgId: string,
  lineId: string,
): Promise<DemandLineRecord>
```

**Preconditions:**
1. Load demand line by `{ id: lineId }`:
   - If not found → `DemandLineNotFoundError`
   - If `ownerOrgId` ≠ `row.ownerOrgId` → `DemandLineNotFoundError` (non-leak)

2. Load pool lifecycle state for `row.poolId` (owner-scoped to `ownerOrgId`):
   - If pool state not in `POOL_STATES_ALLOW_DEMAND_LINE_WRITE` → `DemandLinePoolStateError`

3. Check demand line status:
   - If `row.status` not in `DEMAND_LINE_CANCELLABLE_STATUSES` → `DemandLineInvalidStateError`
     (LOCKED_FOR_RFQ, SUPERSEDED, CANCELLED cannot be cancelled)

4. Update: `{ status: 'CANCELLED', updatedAt: new Date() }`

5. Return updated `DemandLineRecord`.

**Notes:**
- CANCELLED is terminal. No return path from CANCELLED in first implementation.
- Locked lines are not cancellable; only revision/supersede flow applies post-lock.

---

### 4G. Method: `lockDemandLinesForRfq` — DESIGN ONLY / BLOCKED

```
lockDemandLinesForRfq(
  ownerOrgId: string,
  poolId: string,
  input: LockDemandLinesInput,
): Promise<LockDemandLinesResult>
```

**STATUS: IMPLEMENTATION BLOCKED — no `NetworkPoolDemandSnapshot` entity in schema.**

This method is designed here for completeness. It must NOT be implemented until
`TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001` is completed and closed.

**Preconditions (design):**
1. Pool must exist and be owner-scoped.
2. Pool state must be in `POOL_STATES_ALLOW_DEMAND_LINE_LOCK` (AGGREGATING).
3. All ACTIVE demand lines for the pool are transitioned to `LOCKED_FOR_RFQ` atomically.
4. A `NetworkPoolDemandSnapshot` row is created capturing:
   - `pool_id`, `snapshot_version`, `captured_at`, `captured_by_actor`, `snapshot_basis`
   - Per-line snapshot data (either child rows or JSONB depending on snapshot schema design)
5. `locked_at = new Date()` set on each transitioned line.
6. Atomic `$transaction`: lock lines + create snapshot in one boundary.

**Snapshot schema design is deferred to:**
`TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001`

---

## 5. Route / API Design

### File: `server/src/routes/tenant/poolDemandLines.ts`

New `FastifyPluginAsync` for demand-line routes. Registered with the same prefix chain as
the pool routes but as a separate plugin to keep diff size manageable.

**Registration (in tenant router):**
```typescript
// Register demand-line plugin under the same pools prefix context
// Fastify supports parametric prefix: find-my-way handles /:poolId
fastify.register(poolDemandLineRoutes, {
  prefix: '/api/tenant/network-commerce/pools'
})
```
Alternatively, the demand-line routes can be co-registered inside `pools.ts` by adding them
directly to the `poolRoutes` plugin. Recommend separate file for maintainability.

**CRITICAL ROUTE ORDERING (find-my-way / Fastify):**
Static paths must be registered BEFORE parameterized paths.

```
REGISTER ORDER (inside plugin):
  1. GET    /:poolId/demand-lines          (list — static relative to :lineId sub-param)
  2. POST   /:poolId/demand-lines          (create — same prefix, different verb)
  3. POST   /:poolId/demand-lines/lock-for-rfq   ← STATIC — must be before /:lineId routes
  4. GET    /:poolId/demand-lines/:lineId  (get single line — if added later)
  5. PATCH  /:poolId/demand-lines/:lineId  (update — parametric)
  6. POST   /:poolId/demand-lines/:lineId/cancel  (cancel — parametric sub-path)
```

If "lock-for-rfq" is registered AFTER `/:lineId`, the string `"lock-for-rfq"` will be
matched as the `:lineId` param — silent routing bug.

### 5A. Route Definitions

#### GET /:poolId/demand-lines (list)

```
Method:         GET
Path:           /:poolId/demand-lines
Auth:           [tenantAuthMiddleware, databaseContextMiddleware]
Feature gate:   [ncPoolFeatureGateMiddleware]
Params:         { poolId: UUID }
Query:          { limit?: int(1–100), offset?: int(≥0), status?: string, commodity_category?: string, source_type?: string }
Response 200:   { success: true, data: { data: DemandLineRecord[], pagination: { limit, offset, count, total } } }
Response 400:   INVALID_INPUT (bad query params or invalid poolId UUID)
Response 401:   UNAUTHORIZED
Response 503:   FEATURE_DISABLED
```

#### POST /:poolId/demand-lines (create)

```
Method:         POST
Path:           /:poolId/demand-lines
Auth:           [tenantAuthMiddleware, databaseContextMiddleware]
Feature gate:   [ncPoolFeatureGateMiddleware]
Params:         { poolId: UUID }
Body:           CreateDemandLineInput (org_id must be .never(); pool_id inferred from :poolId param)
Response 201:   { success: true, data: DemandLineRecord }
Response 400:   INVALID_INPUT
Response 409:   DUPLICATE_LINE_REF
Response 422:   INVALID_STATE (pool in wrong lifecycle state)
Response 404:   POOL_NOT_FOUND
Response 401:   UNAUTHORIZED
Response 503:   FEATURE_DISABLED
```

Note: `pool_id` in the body must be rejected (use `:poolId` from URL param only).
Add `.never()` guard on `pool_id` body field — consistent with existing pool pattern for `org_id`.

#### PATCH /:poolId/demand-lines/:lineId (update)

```
Method:         PATCH
Path:           /:poolId/demand-lines/:lineId
Auth:           [tenantAuthMiddleware, databaseContextMiddleware]
Feature gate:   [ncPoolFeatureGateMiddleware]
Params:         { poolId: UUID, lineId: UUID }
Body:           UpdateDemandLineInput (partial; at least one field required)
Response 200:   { success: true, data: DemandLineRecord }
Response 400:   INVALID_INPUT
Response 404:   DEMAND_LINE_NOT_FOUND
Response 422:   INVALID_STATE (line locked/cancelled/superseded; or pool in wrong state)
Response 401:   UNAUTHORIZED
Response 503:   FEATURE_DISABLED
```

Note: `:poolId` from URL is passed to service for implicit pool state check. The service
must verify that `line.poolId === poolId` — prevents cross-pool line access.

#### POST /:poolId/demand-lines/:lineId/cancel (cancel)

```
Method:         POST
Path:           /:poolId/demand-lines/:lineId/cancel
Auth:           [tenantAuthMiddleware, databaseContextMiddleware]
Feature gate:   [ncPoolFeatureGateMiddleware]
Params:         { poolId: UUID, lineId: UUID }
Body:           {} (empty; no body required)
Response 200:   { success: true, data: DemandLineRecord }
Response 404:   DEMAND_LINE_NOT_FOUND
Response 422:   INVALID_STATE (line locked/cancelled/superseded; or pool in wrong state)
Response 401:   UNAUTHORIZED
Response 503:   FEATURE_DISABLED
```

#### POST /:poolId/demand-lines/lock-for-rfq (lock — BLOCKED)

```
Method:         POST
Path:           /:poolId/demand-lines/lock-for-rfq
Status:         BLOCKED — requires NetworkPoolDemandSnapshot schema (see Section 10)
Auth:           [tenantAuthMiddleware, databaseContextMiddleware]
Feature gate:   [ncPoolFeatureGateMiddleware, ncPoolRfqFeatureGateMiddleware]
Params:         { poolId: UUID }
Body:           { reason: string }
Response 200:   { success: true, data: { locked_count: number, snapshot_id: string, snapshot_version: number } }
Response 422:   INVALID_STATE (pool not in AGGREGATING)
Response 422:   DEMAND_LINE_SNAPSHOT_BLOCKED (no lockable lines)
Response 404:   POOL_NOT_FOUND
Response 401:   UNAUTHORIZED
Response 503:   FEATURE_DISABLED (pool flag or RFQ sub-flag disabled)
```

This route must NOT be implemented until the demand snapshot schema packet is closed.

---

## 6. Feature Gate Design

### 6A. Existing gate (reused for all demand-line routes)

`ncPoolFeatureGate.middleware.ts` checks `nc.procurement_pools.enabled`:
- Layer 1: global FeatureFlag row must exist and be enabled
- Layer 2: per-org TenantFeatureOverride must exist and be enabled
- DB error, missing, or disabled → 503 FEATURE_DISABLED (fail-closed)

All five demand-line routes (list, create, update, cancel, lock) require this gate.

### 6B. New gate required: `ncPoolRfqFeatureGateMiddleware`

**File:** `server/src/middleware/ncPoolRfqFeatureGate.middleware.ts`

**Purpose:** Second gate for RFQ-bound routes. Checks `nc.procurement_pools.rfq.enabled`.

**Pattern:** Identical two-layer pattern to `ncPoolFeatureGate.middleware.ts`.
Only the flag key constant changes: `nc.procurement_pools.rfq.enabled`.

**Applies to:** lock-for-rfq route ONLY in first implementation.

```typescript
const NC_POOL_RFQ_FEATURE_FLAG_KEY = 'nc.procurement_pools.rfq.enabled';

export async function ncPoolRfqFeatureGateMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Identical two-layer logic as ncPoolFeatureGate.middleware.ts
  // Layer 1: global FeatureFlag(key = NC_POOL_RFQ_FEATURE_FLAG_KEY).enabled
  // Layer 2: per-org TenantFeatureOverride(key = NC_POOL_RFQ_FEATURE_FLAG_KEY).enabled
  // DB error, missing, or disabled → 503 FEATURE_DISABLED (fail-closed)
}
```

**Implementation note:** This middleware file is NOT in scope for the service-foundation packet.
It belongs in `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-001`.

---

## 7. Pool State / Editability Rules

### 7A. Demand-line create

| Pool state | Create demand line? |
|---|---|
| DRAFT | ✅ Allowed |
| OPEN | ✅ Allowed |
| AGGREGATING | ✅ Allowed — primary demand collection window |
| CLOSED_FOR_BIDS | ❌ Blocked |
| QUOTED and later | ❌ Blocked |
| Terminal states (SETTLED, REJECTED, WITHDRAWN, CANCELLED) | ❌ Blocked |

### 7B. Demand-line update (PATCH)

| Pool state | Edit (DRAFT/ACTIVE lines only)? |
|---|---|
| DRAFT | ✅ Allowed |
| OPEN | ✅ Allowed |
| AGGREGATING | ✅ Allowed |
| CLOSED_FOR_BIDS+ | ❌ Blocked |

| Demand line status | Editable? |
|---|---|
| DRAFT | ✅ Allowed |
| ACTIVE | ✅ Allowed |
| LOCKED_FOR_RFQ | ❌ Blocked |
| SUPERSEDED | ❌ Blocked |
| CANCELLED | ❌ Blocked |

### 7C. Demand-line cancel

Same pool state rules as update (DRAFT, OPEN, AGGREGATING only).

| Demand line status | Cancellable? |
|---|---|
| DRAFT | ✅ Allowed |
| ACTIVE | ✅ Allowed |
| LOCKED_FOR_RFQ | ❌ Blocked — revision/supersede flow only |
| SUPERSEDED | ❌ Blocked |
| CANCELLED | ❌ Blocked (already terminal) |

### 7D. Demand-line lock-for-RFQ

| Pool state | Lock allowed? |
|---|---|
| AGGREGATING | ✅ Allowed (demand collection window active) |
| All others | ❌ Blocked |

**Note:** Lock-for-RFQ may also be triggered at or before `AGGREGATING → CLOSED_FOR_BIDS`
transition. Exact coupling between the pool lifecycle transition and the lock action is a
Paresh decision (see Section 13).

### 7E. Demand-line status transition summary

```
DRAFT → ACTIVE             (explicit activation, if activation flow is implemented — see Section 13)
DRAFT → CANCELLED          (owner cancels)
ACTIVE → CANCELLED         (owner cancels)
ACTIVE → LOCKED_FOR_RFQ   (lock-for-RFQ action; sets locked_at)
LOCKED_FOR_RFQ → SUPERSEDED (revision/supersede flow only — deferred to later packet)
```

**Open question:** Does the service expose an explicit `activateDemandLine` method (DRAFT → ACTIVE),
or is ACTIVE the default creation status? See Section 13, Decision 1.

---

## 8. DTO and Privacy Design

### 8A. Owner route DTO — `DemandLineRecord`

Included in API response:

| Field | Included? | Rationale |
|---|---|---|
| id | ✅ | Line identity |
| owner_org_id | ✅ | Owner confirmation |
| pool_id | ✅ | Pool identity |
| line_ref | ✅ | Stable line reference |
| commodity_category | ✅ | Core spec |
| product_category | ✅ | Core spec |
| product_spec_summary | ✅ | Core spec |
| qty | ✅ | Demand quantity |
| qty_unit | ✅ | Unit |
| quality_requirements_json | ✅ | Owner-defined requirements |
| certification_requirements_json | ✅ | Owner-defined requirements |
| packaging_requirements_json | ✅ | Owner-defined requirements |
| delivery_location | ✅ | Delivery detail |
| delivery_window_start | ✅ | Delivery detail |
| delivery_window_end | ✅ | Delivery detail |
| tolerance_pct | ✅ | Demand parameter |
| priority | ✅ | Demand parameter |
| status | ✅ | Lifecycle state |
| source_type | ✅ | Lineage metadata |
| source_membership_id | ✅ | Owner internal lineage |
| normalized_from_member_input | ✅ | Owner internal lineage |
| revision_no | ✅ | Revision identity |
| supersedes_line_id | ✅ | Revision chain |
| created_at | ✅ | Timestamp |
| updated_at | ✅ | Timestamp |
| locked_at | ✅ | Lock timestamp |
| **metadata_internal_json** | ❌ OMITTED | Internal operational field — not in API response |

**Rationale for omitting `metadata_internal_json`:**
This field is flagged as "Internal operational metadata. Never exposed to suppliers" in the
schema comments. Even for the owner route, exposing raw internal metadata risks leaking
operational details into API clients and audit logs. It should be omitted from the default
response DTO. A future hardening packet may expose it via an explicit management endpoint
or opt-in param if owner UX requires it.

### 8B. Non-owner / supplier / member access

No demand-line management routes exist for members or suppliers in this design.

| Actor | Access |
|---|---|
| Pool owner (ownerOrgId matches JWT orgId) | Full owner DTO above |
| Any other org | 404 DEMAND_LINE_NOT_FOUND (non-leak) |
| Member tenant | Same as any other org — no demand-line route |
| Supplier | Same — no supplier demand-line route in first implementation |

**Non-leak rule:** Org mismatch must return the same 404 as line-not-found. Never return 403
for a demand-line that belongs to another org (reveals existence).

### 8C. List response privacy

`listDemandLines` is scoped to `{ poolId, ownerOrgId }`. RLS further enforces this at the
DB level. The route receives `ownerOrgId` from `dbContext.orgId` only — never from query
params or body.

---

## 9. Error Model

### 9A. Service error classes → HTTP status mapping

| Error Class | HTTP Status | Code | Notes |
|---|---|---|---|
| `DemandLineNotFoundError` | 404 | `DEMAND_LINE_NOT_FOUND` | Also returned for org mismatch (non-leak) |
| `DemandLineInvalidInputError` | 400 | `INVALID_INPUT` | Validation failures |
| `DemandLineInvalidStateError` | 422 | `INVALID_STATE` | Line status blocks operation |
| `DemandLineDuplicateRefError` | 409 | `DUPLICATE_LINE_REF` | Unique (pool, line_ref, revision_no) |
| `DemandLineForbiddenError` | 404 | `DEMAND_LINE_NOT_FOUND` | Non-leak: forbidden returns 404 |
| `DemandLinePoolNotFoundError` | 404 | `POOL_NOT_FOUND` | Pool absent or wrong org |
| `DemandLinePoolStateError` | 422 | `INVALID_STATE` | Pool lifecycle state blocks operation |
| `DemandLineSnapshotBlockedError` | 422 | `DEMAND_SNAPSHOT_NOT_READY` | Lock blocked: snapshot entity missing |
| `Prisma.PrismaClientKnownRequestError P2002` | 409 | `DUPLICATE_LINE_REF` | DB UNIQUE constraint fallthrough |
| Unexpected / unknown | 500 | `INTERNAL_ERROR` | Generic fallthrough |

### 9B. Route `mapDemandLineServiceError()` helper (design)

```typescript
function mapDemandLineServiceError(
  reply: FastifyReply,
  err: unknown,
): boolean {
  if (err instanceof DemandLineNotFoundError) {
    sendError(reply, 'DEMAND_LINE_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof DemandLineInvalidInputError) {
    sendError(reply, 'INVALID_INPUT', err.message, 400);
    return true;
  }
  if (err instanceof DemandLineInvalidStateError) {
    sendError(reply, 'INVALID_STATE', err.message, 422);
    return true;
  }
  if (err instanceof DemandLineDuplicateRefError) {
    sendError(reply, 'DUPLICATE_LINE_REF', err.message, 409);
    return true;
  }
  if (err instanceof DemandLinePoolNotFoundError) {
    sendError(reply, 'POOL_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof DemandLinePoolStateError) {
    sendError(reply, 'INVALID_STATE', err.message, 422);
    return true;
  }
  if (err instanceof DemandLineSnapshotBlockedError) {
    sendError(reply, 'DEMAND_SNAPSHOT_NOT_READY', err.message, 422);
    return true;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    sendError(reply, 'DUPLICATE_LINE_REF',
      'A demand line with this reference already exists in this pool', 409);
    return true;
  }
  return false;
}
```

---

## 10. Lock-for-RFQ / Snapshot Dependency Decision

### Decision: IMPLEMENTATION BLOCKED

**Finding:** No `NetworkPoolDemandSnapshot` entity exists in `server/prisma/schema.prisma`.
Grep for `Snapshot|snapshot|demand_snapshot` across the entire schema found only
`ttp_score_snapshots` (unrelated TTP domain).

**Consequence:**
- The `lockDemandLinesForRfq` service method cannot be safely implemented without a snapshot
  entity to record the immutable demand state at RFQ issue.
- Implementing the lock action without a snapshot would leave the system in a state where
  demand lines are marked `LOCKED_FOR_RFQ` but no immutable audit record of the locked payload
  exists — violating the snapshot/immutability policy from Decision 6 of the decision record.

**Recommended action:**
Before the lock-for-RFQ route or lock service method is implemented, open:
```
TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001
```
That packet should design and implement:
- `NetworkPoolDemandSnapshot` table (header record)
- `NetworkPoolDemandSnapshotLine` table (per-line snapshot records)
- Migration SQL + prisma db pull + prisma generate

**Lock service method design is included in this document** (Section 4G) for reference,
but it must not be implemented until the snapshot schema packet is closed.

**The service-foundation and route packets (create/update/list/cancel) are NOT blocked.**
They can proceed without snapshot schema.

---

## 11. Future Test Plan

### 11A. Service unit tests (`networkPoolDemandLine.service.unit.test.ts`)

Vitest unit tests with prisma mocked (using `vi.mock`):

1. ✅ `createDemandLine` — owner creates line, returns `DemandLineRecord`, no metadata_internal_json
2. ✅ `createDemandLine` — non-owner org causes `DemandLinePoolNotFoundError` (pool findFirst returns null)
3. ✅ `createDemandLine` — qty ≤ 0 throws `DemandLineInvalidInputError`
4. ✅ `createDemandLine` — empty line_ref throws `DemandLineInvalidInputError`
5. ✅ `createDemandLine` — empty commodity_category throws `DemandLineInvalidInputError`
6. ✅ `createDemandLine` — invalid delivery window (end < start) throws `DemandLineInvalidInputError`
7. ✅ `createDemandLine` — duplicate line_ref throws `DemandLineDuplicateRefError`
8. ✅ `createDemandLine` — pool in CLOSED_FOR_BIDS throws `DemandLinePoolStateError`
9. ✅ `updateDemandLine` — owner updates DRAFT line — allowed
10. ✅ `updateDemandLine` — owner updates ACTIVE line — allowed
11. ✅ `updateDemandLine` — LOCKED_FOR_RFQ throws `DemandLineInvalidStateError`
12. ✅ `updateDemandLine` — CANCELLED throws `DemandLineInvalidStateError`
13. ✅ `updateDemandLine` — non-owner org causes `DemandLineNotFoundError`
14. ✅ `cancelDemandLine` — DRAFT → CANCELLED
15. ✅ `cancelDemandLine` — ACTIVE → CANCELLED
16. ✅ `cancelDemandLine` — LOCKED_FOR_RFQ throws `DemandLineInvalidStateError`
17. ✅ `cancelDemandLine` — CANCELLED throws `DemandLineInvalidStateError`
18. ✅ `listDemandLines` — returns only lines for ownerOrgId + poolId (no cross-org items)
19. ✅ `listDemandLines` — pagination limit/offset work correctly
20. ✅ `listDemandLines` — status filter returns only matching lines

### 11B. Route integration tests (`pools.demandLines.integration.test.ts`)

Vitest integration tests (db-gated, `describe.skipIf(!hasDb)`):

1. ✅ Feature gate blocked: global flag absent → 503
2. ✅ Feature gate blocked: per-org override absent → 503
3. ✅ Feature gate blocked: DB error simulated → 503
4. ✅ Unauthenticated POST → 401
5. ✅ Unauthenticated GET → 401
6. ✅ Unauthenticated PATCH → 401
7. ✅ Unauthenticated POST cancel → 401
8. ✅ POST create — valid input → 201 + DemandLineRecord
9. ✅ POST create — invalid poolId UUID → 400
10. ✅ POST create — invalid qty (≤ 0) → 400
11. ✅ POST create — duplicate line_ref → 409
12. ✅ POST create — pool in wrong lifecycle state → 422
13. ✅ POST create — wrong org (non-owner) → 404
14. ✅ GET list — returns own demand lines only (other org gets empty list)
15. ✅ GET list — status filter works
16. ✅ GET list — pagination works (limit/offset)
17. ✅ PATCH update — DRAFT line, valid patch → 200
18. ✅ PATCH update — LOCKED_FOR_RFQ line → 422
19. ✅ PATCH update — wrong org → 404
20. ✅ POST cancel — ACTIVE line → 200, status = CANCELLED
21. ✅ POST cancel — already CANCELLED → 422
22. ✅ POST cancel — wrong org → 404
23. ✅ Cleanup: all test demand lines removed; feature flags restored

### 11C. Lock route tests (deferred to lock packet)

24. ✅ POST lock-for-rfq — RFQ sub-flag absent → 503
25. ✅ POST lock-for-rfq — pool not in AGGREGATING → 422
26. ✅ POST lock-for-rfq — no ACTIVE lines → 422 DEMAND_SNAPSHOT_NOT_READY
27. ✅ POST lock-for-rfq — valid → 200, all ACTIVE lines → LOCKED_FOR_RFQ, snapshot created
28. ✅ PATCH after lock → 422 INVALID_STATE

---

## 12. Proposed Implementation Sequence

```
This design packet
  → TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001
      Service methods: createDemandLine, updateDemandLine, listDemandLines, cancelDemandLine
      Unit tests for all four methods
      No routes. No schema changes. No migrations.
      Allowlist: server/src/services/networkPoolDemandLine.service.ts (NEW)
                 server/src/__tests__/networkPoolDemandLine.service.unit.test.ts (NEW)

  → TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-001
      Route plugin: GET list, POST create, PATCH update, POST cancel
      Integration tests (4 routes, no lock)
      Allowlist: server/src/routes/tenant/poolDemandLines.ts (NEW)
                 server/src/routes/tenant/pools.demandLines.integration.test.ts (NEW)
                 tenant router registration (MODIFY)

  → TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001   ← BLOCKED DEPENDENCY
      Design + implement NetworkPoolDemandSnapshot + NetworkPoolDemandSnapshotLine schema
      Migration SQL + prisma db pull + prisma generate

  → TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-001
      lockDemandLinesForRfq service method
      ncPoolRfqFeatureGateMiddleware (new file)
      Lock-for-RFQ route (POST /:poolId/demand-lines/lock-for-rfq)
      Integration tests for lock route
```

**Alternative:** SERVICE-FOUNDATION-001 and ROUTE-001 may be merged into one packet if the
scope is acceptable to Paresh. Recommend keeping separate for atomic diff discipline.

---

## 13. Paresh Decisions Required Before Implementation

**Decision 1 — Demand line creation status**
Should newly created demand lines default to `DRAFT` (explicit activation to `ACTIVE`
required later) or `ACTIVE` (immediately active, no separate activation step)?

Options:
- A) Default `DRAFT`. Add `activateDemandLine` method in same or later packet.
- B) Default `ACTIVE`. No activation step in first implementation.
- C) Caller-supplied `status` at creation (DRAFT or ACTIVE), with `DRAFT` as the fallback default.

Recommended default: Option A (DRAFT). Consistent with pool creation at DRAFT; provides a
review/completion step before lines are treated as ready for RFQ.

---

**Decision 2 — Packet granularity: service-only vs. service + route together**
Should the first implementation packet include both the service AND the routes,
or should the service be a standalone atomic packet first?

Options:
- A) Service-only packet first, then route packet (recommended for atomic diff discipline)
- B) Service + route in one packet

---

**Decision 3 — `metadata_internal_json` exposure**
Confirm that `metadata_internal_json` is omitted from the default owner route DTO.

Options:
- A) Omit entirely from API response (recommended)
- B) Include in owner route response (for owner operational use)

---

**Decision 4 — Lock-for-RFQ prerequisite**
Confirm that lock-for-RFQ implementation is blocked until snapshot schema is closed.

Options:
- A) Blocked — implement snapshot schema first (recommended, consistent with Decision 6 of
     decision record: immutable snapshot at RFQ issue)
- B) Implement lock without snapshot (stub only; add snapshot in later packet)
  → NOT RECOMMENDED: violates immutability policy

---

**Decision 5 — Pool state gate for demand-line create**
Should demand-line creation be allowed in DRAFT pool state, or only OPEN and AGGREGATING?

Options:
- A) DRAFT, OPEN, AGGREGATING allowed (recommended — owner may pre-populate lines before opening)
- B) OPEN and AGGREGATING only (stricter; lines only when pool is live)

---

**Decision 6 — Lock coupling to pool lifecycle transition**
Should lock-for-RFQ be an explicit standalone API action, or coupled to the
`AGGREGATING → CLOSED_FOR_BIDS` pool lifecycle transition?

Options:
- A) Explicit standalone action (`POST /demand-lines/lock-for-rfq`); pool state must be AGGREGATING
     (recommended for first implementation — decoupled, easier to test independently)
- B) Coupled to `AGGREGATING → CLOSED_FOR_BIDS` transition (atomic; pool close triggers line lock)

---

**Decision 7 — Route file structure**
Should demand-line routes live in a separate `poolDemandLines.ts` file, or be added to
the existing `pools.ts`?

Options:
- A) Separate `poolDemandLines.ts` plugin (recommended — maintainability; pools.ts is 426 lines)
- B) Add to `pools.ts` (simpler registration; single file grows to ~700+ lines)

---

**Decision 8 — `listDemandLines` pool existence check**
Should `listDemandLines` return an explicit 404 when the pool doesn't exist / doesn't belong
to the caller org, or return an empty list (which is what the DB query will produce)?

Options:
- A) Explicit pool existence check → 404 if pool absent or wrong org (recommended for UX clarity)
- B) Return empty list (no pool existence check; pool absence is silent)

---

## 14. Recommended Next Packet

**Primary next packet:**
```
TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001
```

**Scope of that packet:**
- New file: `server/src/services/networkPoolDemandLine.service.ts`
  Methods: `createDemandLine`, `updateDemandLine`, `listDemandLines`, `cancelDemandLine`
- New file: `server/src/__tests__/networkPoolDemandLine.service.unit.test.ts`
- No route implementation.
- No schema changes.
- No migrations.
- No governance control file changes.

**Prerequisite before lock packet:**
```
TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001
```
This packet must design and implement the `NetworkPoolDemandSnapshot` and
`NetworkPoolDemandSnapshotLine` entities before `lockDemandLinesForRfq` can be implemented.

---

## Appendix A. Preflight Evidence

### git status --short
```
(no output — clean working tree)
```

### Commit confirmations
| Commit | Description |
|---|---|
| 961a2c1 | docs(network-commerce): design pool RFQ demand source |
| 8878305 | docs(network-commerce): record pool RFQ demand-source decisions |
| 7197e23 | feat(network-commerce): add pool demand line schema foundation |
| 3692a14 | docs(network-commerce): verify pool demand line schema deployment |
| 045d576 | docs(network-commerce): sync demand line schema governance |

All 5 required commits confirmed present in `git log --oneline`.

---

## Appendix B. Completion Checklist

- [x] git status checked — clean
- [x] Schema deployment verified commit confirmed (3692a14)
- [x] Schema governance sync commit confirmed (045d576)
- [x] `NetworkPoolDemandLine` model inspected (all 27 fields)
- [x] Pool lifecycle states confirmed (20260523000000_nc_pool_lifecycle_seed)
- [x] Snapshot entity absence confirmed (no NetworkPoolDemandSnapshot in schema.prisma)
- [x] `ncPoolFeatureGate.middleware.ts` pattern inspected
- [x] `networkPool.service.ts` patterns inspected (error classes, input types, record types, service methods)
- [x] `pools.ts` route patterns inspected (Zod schemas, middleware chain, error mapper, route ordering)
- [x] `pools.integration.test.ts` test patterns inspected
- [x] `response.ts` utilities inspected
- [x] `database-context.middleware.ts` pattern inspected
- [x] Service methods designed (create, update, list, cancel, lock — lock blocked)
- [x] Routes designed (5 routes, lock marked BLOCKED)
- [x] Feature gates designed (existing gate reused; new RFQ sub-flag gate designed)
- [x] Pool state / editability rules designed
- [x] DTO / privacy rules designed (metadata_internal_json omitted)
- [x] Error model designed (7 error classes + HTTP mapping)
- [x] Lock / snapshot dependency decided (BLOCKED — snapshot schema required first)
- [x] Future test plan designed (23 service+route tests + 5 lock tests deferred)
- [x] Implementation sequence proposed (SERVICE-FOUNDATION → ROUTE → SNAPSHOT-SCHEMA → LOCK)
- [x] Paresh decisions listed (8 decisions)
- [x] One design artifact created
- [x] No code / schema / migration / test / UI changes made
- [ ] One atomic commit made
