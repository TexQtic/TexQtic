# TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001
## Network Commerce Pool RFQ — Lock Demand Lines for RFQ Design

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001
Status: DESIGN — AWAITING PARESH DECISION RECORD
Type: TECS bounded design-only packet
Date: 2026-05-08
Design authority: Paresh Patel

Implementation gate:
- This packet produces one design artifact only.
- No service, route, schema, migration, test, middleware, or UI changes are authorized
  by this packet.
- Every implementation slice requires a separate authorized prompt.

---

## 1. Executive Summary

`lockDemandLinesForRfq` is the demand immutability action that closes the demand preparation
phase of a Pool RFQ cycle. It:

1. Validates that the caller's pool is in `AGGREGATING` state.
2. Selects all `ACTIVE` demand lines for the pool.
3. Computes a versioned snapshot header and copies each included line as an immutable snapshot
   line record.
4. Transitions all included demand lines to `LOCKED_FOR_RFQ` in one atomic DB transaction.
5. Returns the snapshot header record to the caller.

The action does not advance the pool lifecycle state (no `AGGREGATING → CLOSED_FOR_BIDS`).
That coupling is deliberately deferred to a future RFQ-issuance design packet.

The schema prerequisite (`NetworkPoolDemandSnapshot` + `NetworkPoolDemandSnapshotLine`,
deployed at `a4dcabe` + `6174d31`) is now satisfied. This design packet unblocks the first
lock implementation packet.

---

## 2. Files Inspected

| File | Purpose |
|---|---|
| `server/prisma/schema.prisma` (lines 2002–2083) | NetworkPoolDemandSnapshot + NetworkPoolDemandSnapshotLine models |
| `server/src/services/networkPoolDemandLine.service.ts` | Existing service: error classes, constants, POOL_STATES, DemandLineRecord, createDemandLine, updateDemandLine, listDemandLines, cancelDemandLine |
| `server/src/routes/tenant/poolDemandLines.ts` | Existing route plugin: 4 routes, body schemas, error mapper, feature gate wiring |
| `server/src/middleware/ncPoolFeatureGate.middleware.ts` | Existing gate: two-layer check (global flag + tenant override), fail-closed 503 |
| `server/src/routes/tenant.ts` | `prisma.$transaction` callback pattern used throughout |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001.md` | Commit 1022879: authoritative decisions 1–8 |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001.md` | Commit 8878305: decisions 1–8 incl. immutability policy (D-6) and lifecycle model (D-7) |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-DEPLOY-VERIFY-001.md` | Commit 6174d31: DB_RUNTIME_LIVE confirmation |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DESIGN-001.md` | Commit b549543: earlier lock design sketch referenced |
| `governance/control/NEXT-ACTION.md` | nc_phase1_pool_rfq_demand_line_lock_status: SCHEMA_PREREQUISITE_RESOLVED |

---

## 3. Repo-Truth Findings

### 3.1 Schema shape (exact field names — Prisma camelCase → DB snake_case)

**NetworkPoolDemandSnapshot** (`network_pool_demand_snapshots`):
| Prisma field | DB column | Type | Nullable | Notes |
|---|---|---|---|---|
| id | id | UUID | ❌ | PK, gen_random_uuid() |
| ownerOrgId | owner_org_id | UUID | ❌ | FK → organizations |
| poolId | pool_id | UUID | ❌ | FK → network_pools |
| snapshotRef | snapshot_ref | VARCHAR(100) | ❌ | Unique per pool |
| snapshotVersion | snapshot_version | INT | ❌ | Unique per pool |
| basis | basis | VARCHAR(50) | ❌ | e.g. RFQ_ISSUE |
| status | status | VARCHAR(50) | ❌ | Default DRAFT |
| capturedAt | captured_at | TIMESTAMPTZ | ✅ | |
| capturedByUserId | captured_by_user_id | UUID | ✅ | |
| capturedReason | captured_reason | TEXT | ✅ | |
| lineCount | line_count | INT | ❌ | Default 0 |
| totalQty | total_qty | DECIMAL(18,6) | ✅ | null if mixed units |
| qtyUnit | qty_unit | VARCHAR(50) | ✅ | null if mixed units |
| metadataInternalJson | metadata_internal_json | JSON | ✅ | Internal only |
| createdAt | created_at | TIMESTAMPTZ | ❌ | now() |
| updatedAt | updated_at | TIMESTAMPTZ | ❌ | now() |

Unique constraints: `(poolId, snapshotVersion)`, `(poolId, snapshotRef)`.

**NetworkPoolDemandSnapshotLine** (`network_pool_demand_snapshot_lines`):
| Prisma field | DB column | Type | Nullable | Notes |
|---|---|---|---|---|
| id | id | UUID | ❌ | PK |
| snapshotId | snapshot_id | UUID | ❌ | FK → snapshots (CASCADE) |
| ownerOrgId | owner_org_id | UUID | ❌ | FK → organizations |
| poolId | pool_id | UUID | ❌ | FK → network_pools |
| demandLineId | demand_line_id | UUID | ❌ | FK → demand_lines (RESTRICT) |
| sourceLineRef | source_line_ref | VARCHAR(100) | ❌ | Copied from lineRef |
| sourceRevisionNo | source_revision_no | INT | ❌ | Copied from revisionNo |
| commodityCategory | commodity_category | VARCHAR(100) | ❌ | |
| productCategory | product_category | VARCHAR(100) | ✅ | |
| productSpecSummary | product_spec_summary | TEXT | ✅ | |
| qty | qty | DECIMAL(18,6) | ❌ | |
| qtyUnit | qty_unit | VARCHAR(50) | ❌ | |
| qualityRequirementsJson | quality_requirements_json | JSON | ✅ | |
| certificationRequirementsJson | certification_requirements_json | JSON | ✅ | |
| packagingRequirementsJson | packaging_requirements_json | JSON | ✅ | |
| deliveryLocation | delivery_location | VARCHAR(500) | ✅ | |
| deliveryWindowStart | delivery_window_start | TIMESTAMPTZ | ✅ | |
| deliveryWindowEnd | delivery_window_end | TIMESTAMPTZ | ✅ | |
| tolerancePct | tolerance_pct | DECIMAL(5,2) | ✅ | |
| priority | priority | INT | ✅ | |
| sourceType | source_type | VARCHAR(50) | ❌ | |
| normalizedFromMemberInput | normalized_from_member_input | BOOL | ❌ | Default false |
| sourceMembershipId | source_membership_id | UUID | ✅ | FK → memberships (SET NULL) |
| supersedesLineId | supersedes_line_id | UUID | ✅ | Plain UUID — no FK (audit only) |
| metadataInternalJson | metadata_internal_json | JSON | ✅ | Internal only |
| createdAt | created_at | TIMESTAMPTZ | ❌ | No updatedAt — immutable |

Unique constraints: `(snapshotId, demandLineId)`, `(snapshotId, sourceLineRef, sourceRevisionNo)`.
Immutability trigger: `trg_immutable_nc_pool_demand_snapshot_lines` (BEFORE UPDATE OR DELETE).

### 3.2 Existing service constants (authoritative)

```typescript
DEMAND_LINE_STATUS = { DRAFT, ACTIVE, LOCKED_FOR_RFQ, SUPERSEDED, CANCELLED }
DEMAND_LINE_SOURCE_TYPE = { OWNER_DIRECT, OWNER_NORMALIZED, MEMBERSHIP_DERIVED }
POOL_STATES_ALLOWING_DEMAND_WRITES = ['DRAFT', 'OPEN', 'AGGREGATING']
```

Lock must use a NEW constant:
```typescript
POOL_STATE_REQUIRED_FOR_LOCK = 'AGGREGATING'
```

### 3.3 Existing error classes (already exported from service)

- `DemandLinePoolNotFoundError` — pool not found / wrong-org
- `DemandLinePoolStateError` — pool in wrong state for demand writes
- `DemandLineSnapshotBlockedError` — originally thrown for missing schema; now RETIRABLE
  (schema is live). Retain in source for one release cycle; document as deprecated.

New error classes to add in lock implementation packet:
- `DemandLineNoActiveLinesError` — zero ACTIVE lines found
- `DemandLineSetChangedError` — expected_line_ids mismatch
- `DemandLineSnapshotConflictError` — unique constraint on (poolId, snapshotVersion) or
  (poolId, snapshotRef) violated (race condition / retry conflict)

### 3.4 Transaction pattern

`prisma.$transaction(async tx => { ... })` is established throughout `tenant.ts` and
`database-context.ts`. The service must inject `PrismaClient` (or transactional client)
and call `this.db.$transaction(...)`. This is consistent with how `NetworkPoolDemandLineService`
already accepts `PrismaClient` in its constructor.

### 3.5 Feature gate pattern

`ncPoolFeatureGate.middleware.ts` checks:
- Layer 1: global `FeatureFlag.key = 'nc.procurement_pools.enabled'`
- Layer 2: `TenantFeatureOverride.key = 'nc.procurement_pools.enabled'` per org

RFQ lock requires a second middleware: `ncPoolRfqFeatureGateMiddleware` checking
`'nc.procurement_pools.rfq.enabled'` (same pattern, different key constant). Per prior
design artifact (DEMAND-LINE-SERVICE-DESIGN-001 §9.4), this was already designed but never
implemented. Lock route must be the first consumer.

### 3.6 Route structure finding

`poolDemandLines.ts` currently registers 4 routes. Lock route must be registered as:

```
POST /:poolId/demand-lines/lock-for-rfq
```

This is a static path segment after `/demand-lines/`. The Fastify `find-my-way` router
uses radix trie matching. Registration order matters: `lock-for-rfq` must be registered
**before** `/:lineId/cancel` to avoid the `:lineId` param capturing the literal `lock-for-rfq`.
The existing route file registers cancel as `/:poolId/demand-lines/:lineId/cancel` —
the lock route is at `/demand-lines/lock-for-rfq` (one fewer segment depth), so there is
no collision with `/:lineId` routes. Confirm during implementation by checking Fastify
route ordering against all `/:poolId/demand-lines/*` registrations.

---

## 4. Lock Ownership and Authority

**Design decision:**
- Lock action is restricted to the pool owner/admin org only.
- Authority = `ownerOrgId` sourced from `request.dbContext.orgId` (D-017-A: JWT only).
- Pool must exist AND `pool.orgId === ownerOrgId` — same non-leaking pattern as other
  demand-line service methods.
- Member orgs: **forbidden**. No member-triggered lock path in first implementation.
- Platform/control-plane admin: **deferred**. Control-plane lock override (if ever needed)
  requires a separate design and authorization packet.

**Rationale:** Owner-normalized demand lines are owner-curated (DEMAND-SOURCE-DECISION-RECORD-001
Decision 1). The owner holds sole authority over when demand is "locked" for supplier visibility.

---

## 5. Pool State Prerequisite

**Design decision:**
- Lock is allowed **only** when pool lifecycle state is `AGGREGATING`.
- All other states → `DemandLinePoolStateError` → HTTP 422 `INVALID_STATE`.

| Pool state | Lock allowed |
|---|---|
| `DRAFT` | ❌ — pool not yet open for aggregation |
| `OPEN` | ❌ — pool open but not in aggregation phase |
| `AGGREGATING` | ✅ — correct phase for RFQ demand finalization |
| `CLOSED_FOR_BIDS` | ❌ — already locked/closed |
| `QUOTED` | ❌ |
| `ACCEPTED` | ❌ |
| `ALLOCATING` | ❌ |
| `ALLOCATED` | ❌ |
| `ORDERED` | ❌ |
| `IN_FULFILMENT` | ❌ |
| `PARTIALLY_DELIVERED` | ❌ |
| `DELIVERED` | ❌ |
| `SETTLEMENT_PENDING` | ❌ |
| `SETTLED` | ❌ (terminal) |
| `REJECTED` | ❌ (terminal) |
| `WITHDRAWN` | ❌ (terminal) |
| `CANCELLED` | ❌ (terminal) |

**Error class:** Re-use existing `DemandLinePoolStateError(currentState, ['AGGREGATING'])`.
No new pool-state error class is needed for lock.

---

## 6. Demand-Line Eligibility

**Design decision:**
- Include: `ACTIVE` demand lines only.
- Exclude: `DRAFT`, `CANCELLED`, `SUPERSEDED`, `LOCKED_FOR_RFQ`.
- DRAFT lines remain unlocked. They are not an error — silently excluded.
- CANCELLED/SUPERSEDED are silently excluded.
- Already-`LOCKED_FOR_RFQ` lines: silently excluded. Do not re-lock.
- Zero ACTIVE lines → `DemandLineNoActiveLinesError` → HTTP 422 `NO_ACTIVE_DEMAND_LINES`.

**`expected_line_ids` safety field (optional):**
- Caller may optionally supply `expected_line_ids: string[]` (array of UUIDs).
- If supplied, the set of ACTIVE line IDs selected by the service must **exactly match**
  `expected_line_ids` (order-independent set equality).
- Mismatch (a line was added/cancelled between caller's last list call and lock):
  → `DemandLineSetChangedError` → HTTP 409 `DEMAND_LINE_SET_CHANGED`.
- If not supplied: no optimistic lock check; proceed with current ACTIVE set.
- Recommended for callers to supply for safety; not required.

**Mixed `qty_unit` behavior:**
- If all included ACTIVE lines share the same `qty_unit`:
  - `snapshot.total_qty` = sum of all included line `qty` values.
  - `snapshot.qty_unit` = the common unit.
- If included lines have more than one distinct `qty_unit`:
  - `snapshot.total_qty` = null.
  - `snapshot.qty_unit` = null.
- This is always computable in the service without additional schema changes.

---

## 7. Snapshot Creation Semantics

### 7.1 snapshot_ref generation

```typescript
snapshotRef = `SNAP-${poolId.slice(0, 8).toUpperCase()}-${Date.now()}`
```

This guarantees uniqueness in practice (timestamp + pool prefix). The unique constraint
`(poolId, snapshotRef)` in the DB provides the hard safety net. If a race condition triggers
a P2002 unique violation on this constraint: map to `DemandLineSnapshotConflictError` → 409.

Alternative (simpler, also valid): `randomUUID()` as snapshotRef, using just the UUID string.
This is equally safe due to the DB unique constraint. Implementation packet may choose either;
recommend the UUID approach for simplicity and consistency with other ref fields.

**Recommended:** `snapshotRef = randomUUID()` — simple, collision-safe via DB constraint.

### 7.2 snapshot_version

```typescript
const maxVersion = await tx.networkPoolDemandSnapshot.aggregate({
  where: { poolId },
  _max: { snapshotVersion: true },
});
const snapshotVersion = (maxVersion._max.snapshotVersion ?? 0) + 1;
```

Inside the transaction to prevent races. The unique constraint `(poolId, snapshotVersion)`
provides the hard enforcement: concurrent lock attempts will fail at the DB level. Map P2002
on this constraint to `DemandLineSnapshotConflictError` → 409.

### 7.3 Remaining snapshot header fields

| Field | Value |
|---|---|
| `id` | `randomUUID()` |
| `ownerOrgId` | `ownerOrgId` (from dbContext) |
| `poolId` | `input.pool_id` |
| `snapshotRef` | `randomUUID()` (see §7.1) |
| `snapshotVersion` | `max(snapshotVersion) + 1` per pool |
| `basis` | `'RFQ_ISSUE'` (literal; no enum in schema — VARCHAR(50)) |
| `status` | `'CAPTURED'` (created-and-captured atomically; no DRAFT intermediate) |
| `capturedAt` | `new Date()` |
| `capturedByUserId` | `userId` (from auth context; `null` acceptable if system-triggered) |
| `capturedReason` | `input.captured_reason ?? null` |
| `lineCount` | `activeLines.length` |
| `totalQty` | sum if uniform `qty_unit`; else `null` |
| `qtyUnit` | common unit if uniform; else `null` |
| `metadataInternalJson` | `null` (no internal metadata needed in first lock packet) |

**Note on `status` value `CAPTURED`:** The schema default is `'DRAFT'` but lock creation
must explicitly set `status = 'CAPTURED'` since snapshot is immediately finalized. The default
`'DRAFT'` is reserved for a future multi-step snapshot preparation flow (if ever designed).

---

## 8. Snapshot-Line Copy Semantics

For each included ACTIVE demand line, copy the following fields into
`NetworkPoolDemandSnapshotLine`:

| Snapshot line field | Source |
|---|---|
| `id` | `randomUUID()` |
| `snapshotId` | new snapshot header id |
| `ownerOrgId` | `line.ownerOrgId` |
| `poolId` | `line.poolId` |
| `demandLineId` | `line.id` |
| `sourceLineRef` | `line.lineRef` |
| `sourceRevisionNo` | `line.revisionNo` |
| `commodityCategory` | `line.commodityCategory` |
| `productCategory` | `line.productCategory` |
| `productSpecSummary` | `line.productSpecSummary` |
| `qty` | `line.qty` |
| `qtyUnit` | `line.qtyUnit` |
| `qualityRequirementsJson` | `line.qualityRequirementsJson` |
| `certificationRequirementsJson` | `line.certificationRequirementsJson` |
| `packagingRequirementsJson` | `line.packagingRequirementsJson` |
| `deliveryLocation` | `line.deliveryLocation` |
| `deliveryWindowStart` | `line.deliveryWindowStart` |
| `deliveryWindowEnd` | `line.deliveryWindowEnd` |
| `tolerancePct` | `line.tolerancePct` |
| `priority` | `line.priority` |
| `sourceType` | `line.sourceType` |
| `normalizedFromMemberInput` | `line.normalizedFromMemberInput` |
| `sourceMembershipId` | `line.sourceMembershipId` |
| `supersedesLineId` | `line.supersedesLineId` |
| `metadataInternalJson` | **Copy from source line for internal audit.** Not exposed in DTO. |

**`metadataInternalJson` copy decision:** Copy the field value from the source demand line
into the snapshot line. This preserves a complete internal audit record of demand state at
the moment of capture. The field is never exposed in any owner-facing DTO. This is
consistent with the internal-only policy from DEMAND-LINE-SERVICE-DECISION-RECORD-001
Decision 3.

**Bulk insert pattern:** Use `createMany` for snapshot lines within the transaction:
```typescript
await tx.networkPoolDemandSnapshotLine.createMany({
  data: activeLines.map(line => ({
    id: randomUUID(),
    snapshotId: snapshot.id,
    ownerOrgId: line.ownerOrgId,
    poolId: line.poolId,
    demandLineId: line.id,
    sourceLineRef: line.lineRef,
    sourceRevisionNo: line.revisionNo,
    // ... all other fields
  })),
});
```

---

## 9. Demand-Line Status Update Rules

After snapshot header and snapshot lines are inserted:

```typescript
await tx.networkPoolDemandLine.updateMany({
  where: {
    id: { in: activeLines.map(l => l.id) },
    ownerOrgId,
    status: 'ACTIVE',   // safety check — do not re-lock DRAFT lines that may have
                        // changed state during the transaction
  },
  data: {
    status: 'LOCKED_FOR_RFQ',
    lockedAt: new Date(),
    updatedAt: new Date(),
  },
});
```

Rules:
- Only `ACTIVE` lines in the selected set are updated.
- `DRAFT` lines remain `DRAFT`. No lock applied to DRAFT lines.
- `CANCELLED`/`SUPERSEDED` lines are unaffected.
- Already-`LOCKED_FOR_RFQ` lines are unaffected (excluded from selection).
- `lockedAt` timestamp is set atomically with the status change.

**Duplicate lock prevention:** If the caller attempts to lock when no ACTIVE lines exist
(all already LOCKED_FOR_RFQ or all DRAFT/CANCELLED/SUPERSEDED), `DemandLineNoActiveLinesError`
is thrown before any DB write — no duplicate snapshot is created.

---

## 10. Transaction Atomicity Design

One Prisma `$transaction` wraps all write operations:

```
BEGIN TRANSACTION
  1. Validate pool ownership + state (poolId, ownerOrgId → DemandLinePoolNotFoundError / DemandLinePoolStateError)
  2. SELECT ACTIVE demand lines (ownerOrgId, poolId, status=ACTIVE, FOR UPDATE)
  3. Validate non-empty set (→ DemandLineNoActiveLinesError)
  4. Validate expected_line_ids if provided (→ DemandLineSetChangedError)
  5. Compute snapshot_version = MAX(snapshotVersion) + 1 for pool
  6. Compute total_qty + qty_unit summary
  7. INSERT snapshot header → NetworkPoolDemandSnapshot
  8. INSERT snapshot lines → NetworkPoolDemandSnapshotLine (createMany)
  9. UPDATE demand lines → status=LOCKED_FOR_RFQ, lockedAt=now()
COMMIT
```

Failure at any step: full rollback — no partial state.

**SELECT FOR UPDATE note:** Within a Prisma `$transaction`, use raw SQL with `FOR UPDATE`
on the demand lines read in step 2 to prevent concurrent lock attempts from reading the same
ACTIVE lines simultaneously:

```typescript
const activeLines = await tx.$queryRaw`
  SELECT * FROM network_pool_demand_lines
  WHERE pool_id = ${poolId}::uuid
    AND owner_org_id = ${ownerOrgId}::uuid
    AND status = 'ACTIVE'
  FOR UPDATE
`;
```

Alternatively, the unique constraint `(poolId, snapshotVersion)` already provides
the race safety net at commit time. Both approaches are valid. Implementation packet
should choose based on how the existing DB context (Supabase pooler) handles advisory locks.
If pooler constraints make `FOR UPDATE` impractical, relying on the unique constraint P2002
catch is acceptable.

**P2002 handling at transaction boundary:**
- `(poolId, snapshotVersion)` unique violation → `DemandLineSnapshotConflictError` → 409
- `(poolId, snapshotRef)` unique violation → `DemandLineSnapshotConflictError` → 409
- `(snapshotId, demandLineId)` unique violation → `DemandLineSnapshotConflictError` → 409

---

## 11. Pool Lifecycle Transition Coupling Decision

**Decision (confirming prior SERVICE-DECISION-RECORD-001 Decision 6):**

Lock action does **NOT** trigger a pool lifecycle state transition in the first
implementation.

- No `StateMachineService` call is made.
- No `NetworkLifecycleLog` write is made by the lock action.
- Pool state remains `AGGREGATING` after a successful lock.
- The `AGGREGATING → CLOSED_FOR_BIDS` transition is explicitly deferred.

**Rationale:**
Lock is a demand immutability action, not a pool workflow action. It closes the demand
side of RFQ preparation. Advancing the pool to `CLOSED_FOR_BIDS` (opening supplier
visibility) is a subsequent distinct action that involves RFQ issuance and supplier
notification — neither of which is implemented in Phase 1.

**Future coupling path:**
A future packet (`TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-001` or equivalent) may couple lock
or RFQ issuance to `CLOSED_FOR_BIDS`. That packet will design the coupling. Until then,
lock is purely a demand-side operation.

---

## 12. Feature Gate Design

**Two-layer gate required for lock route:**

| Layer | Flag key | Check type |
|---|---|---|
| 1 (parent) | `nc.procurement_pools.enabled` | Global + per-tenant override |
| 2 (RFQ sub-flag) | `nc.procurement_pools.rfq.enabled` | Global + per-tenant override |

**New middleware: `ncPoolRfqFeatureGateMiddleware`**

Location: `server/src/middleware/ncPoolRfqFeatureGate.middleware.ts` (NEW file, lock packet)

Pattern: identical to `ncPoolFeatureGate.middleware.ts`, with the single change:
```typescript
const NC_POOL_RFQ_FEATURE_FLAG_KEY = 'nc.procurement_pools.rfq.enabled';
```

The parent flag (`nc.procurement_pools.enabled`) must ALSO be checked before the RFQ sub-flag.
Two approaches:
- **Approach A (recommended):** Chain both middlewares in route `preHandler`:
  ```typescript
  preHandler: [ncPoolFeatureGateMiddleware, ncPoolRfqFeatureGateMiddleware],
  ```
  Simple, explicit, consistent with existing pattern.
- **Approach B:** Combined middleware checking both flags in sequence.

Recommended: Approach A — two separate middleware functions chained. This is clear, testable,
and consistent with the existing single-middleware pattern.

**Fail-closed behavior:** Both layers fail closed to 503 `FEATURE_DISABLED` on missing flag,
disabled flag, or DB error. This is identical to the existing gate behavior.

**Seed data required for tests:** Both `nc.procurement_pools.enabled` and
`nc.procurement_pools.rfq.enabled` must exist as `FeatureFlag` rows and as
`TenantFeatureOverride` rows in the test fixture (via `withBypassForSeed` pattern or
direct seed). The existing demand-line integration tests demonstrate the pattern in
`pools.demandLines.integration.test.ts`.

---

## 13. Service Method Design

### 13.1 Method signature

```typescript
async lockDemandLinesForRfq(
  ownerOrgId: string,
  userId: string | null,
  input: LockDemandLinesForRfqInput,
): Promise<DemandSnapshotRecord>
```

### 13.2 Input type

```typescript
export interface LockDemandLinesForRfqInput {
  pool_id: string;                        // required
  captured_reason?: string | null;        // optional, max 1000 chars
  expected_line_ids?: string[] | null;    // optional optimistic lock — UUIDs of expected ACTIVE lines
}
```

Constraints:
- `pool_id`: required, must be non-empty UUID.
- `captured_reason`: optional, max 1000 chars.
- `expected_line_ids`: optional array of UUID strings. If supplied, set equality check
  against selected ACTIVE line IDs. If mismatch → `DemandLineSetChangedError`.
- No `owner_org_id` in input — sourced from `ownerOrgId` parameter (D-017-A).
- No `status` in input — service determines eligible lines.

### 13.3 Output type

```typescript
export interface DemandSnapshotRecord {
  id:                  string;
  owner_org_id:        string;
  pool_id:             string;
  snapshot_ref:        string;
  snapshot_version:    number;
  basis:               string;
  status:              string;
  captured_at:         string | null;       // ISO 8601
  captured_by_user_id: string | null;
  captured_reason:     string | null;
  line_count:          number;
  total_qty:           string | null;       // Decimal serialized as string
  qty_unit:            string | null;
  created_at:          string;              // ISO 8601
  updated_at:          string;              // ISO 8601
  // No metadata_internal_json
  // No snapshot lines by default (fetch via future read endpoint)
}
```

**Snapshot lines in response:** Do NOT return the full snapshot lines in the lock response.
The lock action creates and returns only the snapshot header summary. Snapshot line retrieval
belongs to a future read endpoint. Returning full lines would be potentially large and
unnecessary for the lock action response.

### 13.4 New error classes to add in lock service packet

```typescript
export class DemandLineNoActiveLinesError extends Error {
  constructor(poolId: string) {
    super(`No ACTIVE demand lines found for pool: ${poolId}`);
    this.name = 'DemandLineNoActiveLinesError';
  }
}

export class DemandLineSetChangedError extends Error {
  constructor() {
    super(
      'The set of ACTIVE demand lines has changed since expected_line_ids was provided. ' +
      'Refresh the line list and retry.'
    );
    this.name = 'DemandLineSetChangedError';
  }
}

export class DemandLineSnapshotConflictError extends Error {
  constructor() {
    super(
      'A snapshot conflict occurred for this pool. ' +
      'Another lock operation may have completed concurrently. Retry if needed.'
    );
    this.name = 'DemandLineSnapshotConflictError';
  }
}
```

### 13.5 DemandLineSnapshotBlockedError retirement

`DemandLineSnapshotBlockedError` was a compile-time guard for missing schema. With the
schema now live, this class is effectively obsolete. **Do not remove it in the lock packet.**
Retain it in source for this release cycle (it is exported and imported by the route file).
Mark with a `@deprecated` JSDoc comment. Remove in a later cleanup packet.

---

## 14. Route Design

### 14.1 Route definition

```
POST /api/tenant/network-commerce/pools/:poolId/demand-lines/lock-for-rfq
```

Registered in: `server/src/routes/tenant/poolDemandLines.ts` (existing file — MODIFY).

Middleware chain:
```typescript
{
  onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
  preHandler: [ncPoolFeatureGateMiddleware, ncPoolRfqFeatureGateMiddleware],
}
```

### 14.2 Request body schema

```typescript
const lockDemandLinesBodySchema = z.object({
  owner_org_id: z.never({ ... }).optional(),    // forbidden — org from dbContext
  pool_id:      z.never({ ... }).optional(),    // forbidden — pool from :poolId param
  status:       z.never({ ... }).optional(),    // forbidden
  captured_reason: z.string().trim().max(1000).optional().nullable(),
  expected_line_ids: z.array(z.string().uuid()).max(500).optional().nullable(),
});
```

### 14.3 HTTP response

- Success: **HTTP 201 Created** — lock action creates a new snapshot resource.
- Body: `DemandSnapshotRecord` (snapshot header only).

**Why 201 and not 200:** Lock creates a new `NetworkPoolDemandSnapshot` row. 201 is
semantically correct for resource creation. Consistent with how `createDemandLine`
returns 201.

### 14.4 Route registration order

The lock route must be registered **before** any `/:lineId` routes in the plugin:

```typescript
// Lock route (static segment) — must precede /:lineId routes
fastify.post('/:poolId/demand-lines/lock-for-rfq', ...);

// Line-scoped routes (parameterized)
fastify.patch('/:poolId/demand-lines/:lineId', ...);
fastify.post('/:poolId/demand-lines/:lineId/cancel', ...);
```

`lock-for-rfq` is at depth `/:poolId/demand-lines/lock-for-rfq` (no second param).
The `:lineId` routes are at depth `/:poolId/demand-lines/:lineId` and
`/:poolId/demand-lines/:lineId/cancel`. Fastify's radix trie will not confuse
`lock-for-rfq` as `:lineId` because `lock-for-rfq` is a static node at the same
depth, taking priority over parameterized nodes per `find-my-way` matching rules.
However, to be safe and explicit, register the static lock route before parameterized
`:lineId` routes.

---

## 15. DTO / Privacy Design

### 15.1 `DemandSnapshotRecord` — fields exposed to owner

| Field | Exposed | Notes |
|---|---|---|
| `id` | ✅ | |
| `owner_org_id` | ✅ | Caller's own org — safe |
| `pool_id` | ✅ | |
| `snapshot_ref` | ✅ | |
| `snapshot_version` | ✅ | |
| `basis` | ✅ | |
| `status` | ✅ | |
| `captured_at` | ✅ | |
| `captured_by_user_id` | ✅ | Caller's own userId — safe |
| `captured_reason` | ✅ | |
| `line_count` | ✅ | |
| `total_qty` | ✅ | Null if mixed units |
| `qty_unit` | ✅ | Null if mixed units |
| `created_at` | ✅ | |
| `updated_at` | ✅ | |
| `metadata_internal_json` | ❌ | Internal only — never exposed |
| snapshot line records | ❌ | Not returned by lock action — future read endpoint |

### 15.2 Privacy boundary

The lock action response must never expose:
- `metadata_internal_json` from snapshot header.
- Per-line `metadata_internal_json` from snapshot lines.
- `source_membership_id` — internal lineage.
- Member identities or per-member quantities.
- Internal `metadataInternalJson` from demand lines.

All of these are excluded from `DemandSnapshotRecord` by design.

---

## 16. Error Model

### 16.1 Error classes and HTTP mappings

| Error class | Trigger | HTTP code | Error code |
|---|---|---|---|
| `DemandLinePoolNotFoundError` | Pool absent / wrong org | 404 | `POOL_NOT_FOUND` |
| `DemandLinePoolStateError` | Pool not AGGREGATING | 422 | `INVALID_STATE` |
| `DemandLineNoActiveLinesError` | Zero ACTIVE lines | 422 | `NO_ACTIVE_DEMAND_LINES` |
| `DemandLineSetChangedError` | expected_line_ids mismatch | 409 | `DEMAND_LINE_SET_CHANGED` |
| `DemandLineSnapshotConflictError` | Unique constraint violation (race) | 409 | `SNAPSHOT_CONFLICT` |
| `DemandLineInvalidInputError` | Bad pool_id, captured_reason too long | 400 | `INVALID_INPUT` |
| Feature gate failure | Flag absent / disabled / DB error | 503 | `FEATURE_DISABLED` |
| Unexpected | Uncaught error | 500 | `INTERNAL_ERROR` |

### 16.2 Non-leaking behavior

- Wrong-org pool returns 404 `POOL_NOT_FOUND` — identical to absent pool. Caller cannot
  distinguish whether the pool exists under another org.
- This matches the pattern of `DemandLinePoolNotFoundError` used throughout the service.

### 16.3 P2002 handling

Prisma `PrismaClientKnownRequestError` with `code === 'P2002'` on snapshot tables:
→ `DemandLineSnapshotConflictError` → 409 `SNAPSHOT_CONFLICT`.

---

## 17. Future Test Plan

### 17.1 Service unit tests (in `networkPoolDemandLine.service.unit.test.ts`)

| Test scenario | Expected behavior |
|---|---|
| Owner with ACTIVE lines in AGGREGATING pool — lock succeeds | Returns DemandSnapshotRecord, status=CAPTURED, version=1, line_count=N |
| Created snapshot has status=CAPTURED, basis=RFQ_ISSUE | snapshot.status and snapshot.basis match |
| Snapshot lines copy all expected fields | All DemandSnapshotLine fields match source demand line fields |
| ACTIVE demand lines become LOCKED_FOR_RFQ with lockedAt | status=LOCKED_FOR_RFQ, lockedAt non-null |
| DRAFT lines excluded — remain DRAFT after lock | DRAFT line status unchanged |
| CANCELLED lines excluded — remain CANCELLED after lock | CANCELLED line status unchanged |
| Zero ACTIVE lines (all DRAFT) → DemandLineNoActiveLinesError | Throws error |
| Pool not found / wrong org → DemandLinePoolNotFoundError | Throws error |
| Pool in OPEN state → DemandLinePoolStateError | Throws with state=OPEN |
| Pool in DRAFT state → DemandLinePoolStateError | Throws with state=DRAFT |
| Pool in CLOSED_FOR_BIDS → DemandLinePoolStateError | Throws |
| Mixed qty_unit → total_qty=null, qty_unit=null | Snapshot header fields null |
| Uniform qty_unit → total_qty=sum, qty_unit=unit | Snapshot header fields populated |
| expected_line_ids exact match → succeeds | No error |
| expected_line_ids mismatch (extra line added) → DemandLineSetChangedError | 409 |
| expected_line_ids mismatch (line cancelled) → DemandLineSetChangedError | 409 |
| Transaction rollback if snapshot line insert fails | No snapshot row, no status change |
| metadata_internal_json omitted from DemandSnapshotRecord | Field absent in returned record |
| snapshot_version increments: second lock after unlock (future) creates version=2 | version=2 |

### 17.2 Route integration tests (in `pools.demandLines.integration.test.ts`)

| Test scenario | Expected behavior |
|---|---|
| Lock route gated — parent flag absent → 503 FEATURE_DISABLED | 503 |
| Lock route gated — parent flag present, RFQ sub-flag absent → 503 FEATURE_DISABLED | 503 |
| Lock route gated — parent enabled, RFQ sub-flag enabled → lock proceeds | Proceeds to auth |
| Lock route unauthorized (no auth) → 401 | 401 |
| Lock route with enabled flags → creates snapshot, 201 | 201 + snapshot header body |
| Lock route body with owner_org_id → 400 INVALID_INPUT | 400 |
| Lock route body with pool_id → 400 INVALID_INPUT | 400 |
| Lock route body with status → 400 INVALID_INPUT | 400 |
| Lock route registered before /:lineId — no route collision | lock-for-rfq not confused with lineId |
| Cleanup: snapshots, snapshot_lines, demand_lines, pools removed after test run | 0 rows |

---

## 18. Proposed Implementation Sequence

```
[CURRENT]   TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001         (this packet)
              Design artifact only. No implementation authorized.
              ↓
[NEXT]      TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001
              Paresh approves decisions from this design artifact.
              Records: lock ownership, pool state gate, eligible lines, snapshot semantics,
              transaction atomicity, no lifecycle coupling, feature gate approach, DTO shape.
              No implementation. One governance doc commit.
              ↓
            TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-SERVICE-001
              Implements lockDemandLinesForRfq in networkPoolDemandLine.service.ts.
              Adds: LockDemandLinesForRfqInput, DemandSnapshotRecord types.
              Adds: DemandLineNoActiveLinesError, DemandLineSetChangedError,
                    DemandLineSnapshotConflictError error classes.
              Adds: unit tests for all service scenarios.
              No routes. No middleware. No schema changes.
              Allowlist:
                server/src/services/networkPoolDemandLine.service.ts  (MODIFY)
                server/src/__tests__/networkPoolDemandLine.service.unit.test.ts  (MODIFY)
              ↓
            TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-SUBFLAG-GATE-001
              Implements ncPoolRfqFeatureGateMiddleware.
              New file: server/src/middleware/ncPoolRfqFeatureGate.middleware.ts
              Adds: unit test for middleware (if pattern exists) OR covered in route integration tests.
              No routes. No service changes.
              Allowlist:
                server/src/middleware/ncPoolRfqFeatureGate.middleware.ts  (NEW)
              OR: merge into lock route packet if size justifies (Paresh decision required).
              ↓
            TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-ROUTE-001
              Adds lock route to poolDemandLines.ts.
              Adds integration tests for lock route.
              Allowlist:
                server/src/routes/tenant/poolDemandLines.ts  (MODIFY)
                server/src/routes/tenant/pools.demandLines.integration.test.ts  (MODIFY)
              ↓
            TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-PROD-VERIFY-GOV-CLOSE-001
              Runtime smoke, full regression, governance sync.
```

**Merge option:** If Paresh prefers, the RFQ sub-flag gate middleware can be merged into the
lock route packet (LOCK-ROUTE-001), eliminating the separate gate packet. This reduces the
number of commits but slightly increases the diff size of the route packet. Paresh decision
required (see §19).

---

## 19. Paresh Decisions Required Before Implementation

The following decisions must be made by Paresh in the LOCK-DECISION-RECORD-001 packet before
any implementation packet opens:

| # | Decision question | Recommended default |
|---|---|---|
| D-1 | Confirm lock ownership: pool owner/admin org only, member and platform/admin deferred | ✅ Confirmed by recommended default |
| D-2 | Confirm pool state gate: AGGREGATING only | ✅ Confirmed by prior decision record |
| D-3 | Confirm eligible lines: ACTIVE only; DRAFT/CANCELLED/SUPERSEDED excluded; zero ACTIVE → error | ✅ Consistent with demand-source decision record |
| D-4 | `expected_line_ids` field: include as optional in v1? | Recommend: include |
| D-5 | Snapshot `status` value at lock: CAPTURED (not DRAFT) | Recommend: CAPTURED |
| D-6 | `snapshotRef` generation: `randomUUID()` vs. structured `SNAP-{prefix}-{ts}` | Recommend: `randomUUID()` |
| D-7 | `metadataInternalJson` copy into snapshot line: yes (internal audit) vs. no | Recommend: copy, never expose in DTO |
| D-8 | `DemandLineSnapshotBlockedError`: deprecate (not remove) in lock packet | Recommend: deprecate with JSDoc, remove later |
| D-9 | RFQ sub-flag gate: separate middleware packet vs. merge into lock route packet | Recommend: separate (FEATURE-SUBFLAG-GATE-001) |
| D-10 | Lock response: snapshot header only (no lines) vs. snapshot header + full lines | Recommend: header only |
| D-11 | HTTP response code: 201 Created vs. 200 OK | Recommend: 201 |
| D-12 | Pool lifecycle coupling: confirm no auto AGGREGATING → CLOSED_FOR_BIDS in first lock packet | ✅ Confirmed by prior decision record |
| D-13 | `NetworkLifecycleLog` write: confirm not required in first lock packet | Recommend: deferred |
| D-14 | Confirm implementation sequence: LOCK-DECISION-RECORD → LOCK-SERVICE → SUBFLAG-GATE → LOCK-ROUTE → LOCK-VERIFY | Recommend as stated |

---

## 20. Recommended Next Packet

```
TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001
```

**Scope:** Paresh reviews this design artifact, approves decisions D-1 through D-14,
and records them in a closed decision record. No implementation authorized.

**Allowlist:**
```
governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001.md  (NEW)
```

**Commit message:**
```
docs(network-commerce): record demand line lock decisions
```

This packet does not authorize service implementation, routes, schema changes, migrations,
tests, UI, RFQ schema, supplier routes, or governance control active-state changes.

---

## Appendix A — Design Chain Summary

| Packet | Commit | Status |
|---|---|---|
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001 | 961a2c1 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001 | 8878305 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-FOUNDATION-001 | 7197e23 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-DEPLOY-VERIFY-001 | 3692a14 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DESIGN-001 | b549543 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001 | 1022879 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001 | 8241991 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-001 | 1bc1b09 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-PROD-VERIFY-GOV-CLOSE-001 | 3f7845a | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001 | a4dcabe | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-DEPLOY-VERIFY-001 | 6174d31 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-GOV-SYNC-001 | 396c3d3 | CLOSED |
| **TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001** | *this commit* | **DESIGN** |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001 | — | HOLD_FOR_PARESH_DECISION |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-SERVICE-001 | — | NOT AUTHORIZED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-SUBFLAG-GATE-001 | — | NOT AUTHORIZED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-ROUTE-001 | — | NOT AUTHORIZED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-PROD-VERIFY-GOV-CLOSE-001 | — | NOT AUTHORIZED |
