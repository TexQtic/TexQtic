# TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DESIGN-001
## Network Commerce Pool — RFQ Issue Workflow Design

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DESIGN-001
Status: DESIGN ONLY — NOT AUTHORIZED FOR IMPLEMENTATION
Type: TECS bounded design-only packet
Date: 2026-05-08
Author: Governance Artifact — Paresh Patel

Implementation gate:
- This packet is design only.
- It does NOT authorize schema changes, migrations, service implementation, route implementation,
  tests, UI, supplier invitation, quote implementation, allocation, order placement,
  invoice generation, settlement, escrow, MakerChecker changes, lifecycle transition in code,
  NetworkLifecycleLog writes, or governance control active-state changes.
- Implementation is blocked until a decision record (and optional audit) is committed.

---

## 1. Executive Summary

The demand-line lock chain (5 packets, commit `ade218d`) is closed and governance-synced.
The pool is now in an authorized intermediate state: demand lines `LOCKED_FOR_RFQ`,
demand snapshot `CAPTURED`, pool lifecycle `AGGREGATING`. No RFQ exists yet. No supplier
has any visibility. No pool lifecycle transition has occurred.

This packet designs the next slice: **RFQ issue** — the transition from a locked demand
snapshot to an active, supplier-visible RFQ event.

### Conservative design outcome

- **RFQ issue** is a distinct, owner/admin-only action, separate from demand lock.
- RFQ issue creates a dedicated `NetworkPoolRfq` header and `NetworkPoolRfqLine` rows
  (copied from the CAPTURED snapshot lines) in a single atomic transaction.
- RFQ issue is the correct and authorized point to drive `AGGREGATING → CLOSED_FOR_BIDS`
  via `StateMachineService.transition()`, which also writes `NetworkLifecycleLog`.
- Supplier invitation is deferred to a separate packet. No supplier sees the RFQ until
  the supplier invite packet is implemented and explicitly authorized.
- The existing single-item `Rfq` model is not reusable for pool aggregate RFQ.
  A dedicated `NetworkPoolRfq` schema is required.
- `AGGREGATING → CLOSED_FOR_BIDS` does NOT require MakerChecker (confirmed from seed).

### Readiness verdict

- RFQ issue implementation should NOT proceed directly from this design packet.
- Next required step: TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-AUDIT-001
  (to evidence and resolve the open decisions listed in §18).
- Then: TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001 (Paresh approvals).
- Then: TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-FOUNDATION-001.

---

## 2. Files Inspected

### Governance sequencing
- `governance/control/OPEN-SET.md` — last 80 lines
- `governance/control/NEXT-ACTION.md` — lines 1–240
- `governance/control/GOVERNANCE-CHANGELOG.md` — confirmed last entry

### NC RFQ authority chain
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DESIGN-001.md`
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-AUDIT-001.md`
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-RECORD-001.md`
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001.md`
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001.md`
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-PROD-VERIFY-GOV-CLOSE-001.md`

### Implementation anchors
- `server/prisma/schema.prisma` — `NetworkPool`, `NetworkPoolDemandLine`, `NetworkPoolDemandSnapshot`, `NetworkPoolDemandSnapshotLine`, `Rfq`, `RfqSupplierResponse` models
- `server/prisma/migrations/20260523000000_nc_pool_lifecycle_seed/migration.sql` — POOL lifecycle state + transition seed (24 transitions)
- `server/src/services/networkPoolDemandLine.service.ts` — `lockDemandLinesForRfq` implementation
- `server/src/routes/tenant/poolDemandLines.ts` — 5-route demand line surface
- `server/src/middleware/ncPoolFeatureGate.middleware.ts` — parent pool flag gate
- `server/src/middleware/ncPoolRfqFeatureGate.middleware.ts` — RFQ sub-flag gate
- `server/src/services/stateMachine.service.ts` — `StateMachineService.transition()` with `opts.db` support
- `tests/stateMachine.g020.test.ts` — P-POOL-01..P-POOL-05, F-POOL-01 canonical pool transition tests

---

## 3. Repo-Truth Findings

### 3.1 Schema truth

| Model | Status |
|---|---|
| `NetworkPool` | Exists. `lifecycleStateId → LifecycleState`, `AGGREGATING` is a valid stateKey. |
| `NetworkPoolMembership` | Exists. |
| `NetworkPoolDemandLine` | Exists. Status values: `DRAFT / ACTIVE / LOCKED_FOR_RFQ / SUPERSEDED / CANCELLED`. |
| `NetworkPoolDemandSnapshot` | Exists. Status values: `DRAFT → CAPTURED → SUPERSEDED / CANCELLED`. Has `lineCount`, `totalQty`, `qtyUnit`, `capturedByUserId`, `capturedReason`, `snapshotVersion`. |
| `NetworkPoolDemandSnapshotLine` | Exists. Fully immutable (trigger + RLS). Carries all line fields: commodity, qty, quality, cert, packaging, delivery, tolerance, priority, sourceType, sourceMembershipId. |
| `NetworkPoolRfq` | **Does NOT exist.** No match in schema.prisma. New model required. |
| `NetworkPoolRfqLine` | **Does NOT exist.** New model required. |
| `NetworkPoolRfqSupplierInvite` | **Does NOT exist.** Deferred to supplier invite packet. |
| `Rfq` | Exists. Single catalog-item buyer→supplier. Fields: `orgId` (buyer), `supplierOrgId` (direct FK), `catalogItemId`, `quantity` (Int), message-only response. NOT reusable for pool aggregate RFQ without unsafe schema coupling. |
| `RfqSupplierResponse` | Exists. Message-only, one per RFQ, no pricing/slabs/revisions. NOT reusable. |

### 3.2 Pool lifecycle state machine truth (from seed SQL)

The `AGGREGATING → CLOSED_FOR_BIDS` transition is **seeded**:

```sql
-- AGGREGATING → CLOSED_FOR_BIDS: pool admin closes demand window and issues RFQ
(
  'POOL', 'AGGREGATING', 'CLOSED_FOR_BIDS',
  ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
  false,  -- requiresMakerChecker
  false   -- requiresEscalation
)
```

Key findings:
- `requiresMakerChecker = false` — RFQ issue can proceed without Maker-Checker approval.
- `requiresEscalation = false`.
- Allowed actor types: `TENANT_ADMIN`, `PLATFORM_ADMIN`. Tenant owner/admin maps to `TENANT_ADMIN`.
- `CLOSED_FOR_BIDS` is NOT a terminal state. Further transitions exist:
  `CLOSED_FOR_BIDS → QUOTED` (no MC), `CLOSED_FOR_BIDS → WITHDRAWN` (no MC).

### 3.3 StateMachineService truth

- `transition(req: TransitionRequest, opts?: { db?: PrismaClient })` — accepts an optional
  Prisma client (`opts.db`) for use inside a caller-managed transaction.
- If `opts.db` is provided, the service uses it for all DB operations including the
  `NetworkLifecycleLog` write. This enables atomic RFQ creation + lifecycle transition.
- The service NEVER throws — all errors become `TransitionDeniedResult`. Caller must check
  `result.status === 'DENIED'` and handle appropriately.
- Writes `NetworkLifecycleLog` exclusively. No direct log writes are permitted outside
  this service.

### 3.4 Current pool state after lock

After a successful `lockDemandLinesForRfq`:
- Pool lifecycle state: `AGGREGATING` (unchanged by lock — D-12 confirmed)
- `NetworkPoolDemandSnapshot`: `status = CAPTURED`
- `NetworkPoolDemandSnapshotLine` rows: immutable, fully populated
- `NetworkPoolDemandLine` rows: `status = LOCKED_FOR_RFQ`
- No `NetworkPoolRfq` exists (schema does not exist)
- No `NetworkLifecycleLog` entry for RFQ (lock did not write one)
- Suppliers: zero visibility

### 3.5 Feature gate truth

- `ncPoolFeatureGateMiddleware` — key `nc.procurement_pools.enabled` — IMPLEMENTED (commit `ea53b0f`)
- `ncPoolRfqFeatureGateMiddleware` — key `nc.procurement_pools.rfq.enabled` — IMPLEMENTED (commit `a06631d`)
- Both gates are available for the RFQ issue route with zero additional middleware work.

---

## 4. RFQ Issue Definition

**"Issue RFQ"** in the Network Commerce Pool context means:

1. The pool owner/admin takes the current `CAPTURED` demand snapshot and promotes it
   into a structured procurement request: a `NetworkPoolRfq` record with:
   - A stable external reference (`rfqRef`)
   - A versioned header (`rfqVersion`)
   - Copied commercial terms (response deadline, issue reason, supplier invite mode)
   - Copied snapshot-line records as `NetworkPoolRfqLine` rows (immutable RFQ audit)

2. The pool lifecycle state advances `AGGREGATING → CLOSED_FOR_BIDS` via
   `StateMachineService.transition()` (atomic with RFQ creation).

3. A `NetworkLifecycleLog` entry is written by `StateMachineService` as part of the
   atomic transaction.

4. The RFQ is in `ISSUED` status after creation. No supplier has visibility yet.

5. Supplier invitation is a separate, subsequent action (deferred packet).

### What RFQ issue is NOT

- Not a supplier invite. Suppliers receive zero visibility until the invite packet.
- Not a quote submission surface. Supplier quote routes are a separate packet.
- Not an allocation trigger. Allocation is downstream of quote acceptance.
- Not a demand lock. Demand lock already occurred in a prior packet.
- Not a governance control state change. `active_delivery_unit` and DPP posture
  remain at `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_PARESH_DECISION`.

---

## 5. Ownership and Role Authority

| Role | RFQ Issue Permission |
|---|---|
| Pool OWNER | ✅ Authorized |
| Pool ADMIN | ✅ Authorized |
| Pool MEMBER | ❌ Forbidden — 403 |
| Invited SUPPLIER | ❌ Forbidden — 403 / 401 |
| Platform/Control Admin | ⚠️ Deferred to control-plane packet |

**Implementation pattern:**
- Role check: `if (userRole !== 'OWNER' && userRole !== 'ADMIN') → 403 FORBIDDEN`
- `orgId` always from `request.dbContext.orgId` (authenticated context). Never from body/URL.
- `userId` always from `request.userId` (authenticated session). Never from body.
- Pattern: identical to existing demand-line route role gate (`poolDemandLines.ts`).

---

## 6. Prerequisite Pool and Snapshot State

### Pool prerequisite
- Pool lifecycle state MUST be `AGGREGATING`.
- Any other state → `PoolRfqInvalidPoolStateError` → 422 `INVALID_STATE`.

### Snapshot prerequisite
- At least one `NetworkPoolDemandSnapshot` for the pool with:
  - `ownerOrgId = orgId` (tenant isolation)
  - `status = 'CAPTURED'`
  - `lineCount > 0`
- If no such snapshot exists → `PoolRfqSnapshotNotFoundError` → 404 `SNAPSHOT_NOT_FOUND`.

### Duplicate issue guard
- If a `NetworkPoolRfq` already exists for the pool (any status) → `PoolRfqAlreadyIssuedError`
  → 409 `RFQ_ALREADY_ISSUED`.
- v1 does not support re-issuance or revision. One RFQ per pool per v1.
  Re-issue / revision is a separate design packet.

---

## 7. Snapshot Selection Policy

### Selected approach: Caller provides `snapshot_id`

The RFQ issue request body MUST include a `snapshot_id` (UUID of the `NetworkPoolDemandSnapshot`
to use as the RFQ demand basis).

**Service validation (in order):**
1. Fetch snapshot by `id = snapshot_id AND ownerOrgId = orgId AND poolId = poolId`.
   If not found → `PoolRfqSnapshotNotFoundError` → 404.
2. Check `status = 'CAPTURED'`. If not → `PoolRfqSnapshotInvalidStateError` → 422.
3. Check `lineCount > 0`. If zero → `PoolRfqSnapshotInvalidStateError` → 422
   (snapshot captured with no lines is invalid as RFQ basis).
4. Check that this snapshot is the latest version for the pool:
   no other snapshot with `poolId = poolId AND snapshotVersion > this.snapshotVersion AND status NOT IN ('CANCELLED')`.
   If a newer snapshot exists → `PoolRfqSnapshotNotLatestError` → 409.

**Rationale for caller-supplied `snapshot_id`:**
- Prevents silent use of a stale snapshot if a newer capture has been made.
- Forces the caller to explicitly confirm which demand basis is being used for the RFQ.
- Provides unambiguous audit lineage (`rfq → snapshot_id → snapshot_lines`).
- Consistent with `expected_line_ids` optimistic confirmation design in the lock packet.
- Caller confusion risk is low: the lock response returns `id` (snapshot UUID) directly.

---

## 8. RFQ Schema / Data Model Recommendation

### 8.1 Verdict: Dedicated NetworkPoolRfq schema required

The existing `Rfq` model is disqualifying for pool aggregate RFQ:
- `orgId` = buyer org (single), `supplierOrgId` = single supplier FK (hard-coded at create time)
- `catalogItemId` = single catalog item (not pool aggregate demand)
- `quantity = Int` (not `Decimal(18,6)` — wrong precision for aggregate procurement)
- `RfqSupplierResponse` = message-only, one response, no pricing

Reusing `Rfq` for Pool RFQ would require unsafe schema additions or a leaky adapter that
conflates buyer RFQ semantics with pool aggregate procurement. This is forbidden per
governance: "do not reuse existing single-item buyer/supplier RFQ schema without adapter/hardening."

A dedicated `NetworkPoolRfq` + `NetworkPoolRfqLine` schema is required.

### 8.2 Proposed `NetworkPoolRfq` model

DB table: `network_pool_rfqs`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `owner_org_id` | UUID FK → organizations | RLS anchor |
| `pool_id` | UUID FK → network_pools | Owning pool |
| `snapshot_id` | UUID FK → network_pool_demand_snapshots | Source snapshot |
| `rfq_ref` | VarChar(100) | Service-generated UUID. Unique per (pool_id, rfq_ref). |
| `rfq_version` | Int | Starts at 1. DB CHECK ≥ 1. |
| `status` | VarChar(50) | `ISSUED / QUOTED / ACCEPTED / REJECTED / EXPIRED / CANCELLED`. DB CHECK. |
| `issue_basis` | VarChar(50) | `SNAPSHOT_LOCK` for v1. Extensible. |
| `issued_at` | Timestamptz | Set on create. Non-null on issue. |
| `issued_by_user_id` | UUID | From authenticated session. |
| `issue_reason` | Text | Optional free-form. Caller-supplied. |
| `response_deadline_at` | Timestamptz | Optional. Caller-supplied. Null in v1 if not provided. |
| `supplier_invite_mode` | VarChar(50) | `INVITE_ONLY` for v1. DB CHECK. |
| `line_count` | Int | Denormalized from snapshot.lineCount at create time. |
| `total_qty` | Decimal(18,6) | Denormalized from snapshot.totalQty at create time. Null if snapshot has no totalQty. |
| `qty_unit` | VarChar(50) | From snapshot.qtyUnit. |
| `metadata_internal_json` | JSONB | Internal only. Never exposed in DTOs. |
| `created_at` | Timestamptz | `now()` |
| `updated_at` | Timestamptz | `now()` |

Unique constraints:
- `(pool_id, rfq_ref)` — unique RFQ reference per pool
- `(pool_id, rfq_version)` — unique version per pool (prevents duplicate issue)

Index recommendations:
- `(pool_id)`, `(owner_org_id)`, `(snapshot_id)`, `(status)`, `(issued_at DESC)`, `(created_at DESC)`

FK relations:
- `owner_org_id → organizations.id` ON DELETE CASCADE
- `pool_id → network_pools.id` ON DELETE Cascade (RFQ is meaningless without pool)
- `snapshot_id → network_pool_demand_snapshots.id` ON DELETE Restrict (preserve audit)

### 8.3 Proposed `NetworkPoolRfqLine` model

DB table: `network_pool_rfq_lines`

Rows are copied from `NetworkPoolDemandSnapshotLine` at RFQ issue time.
Immutable after creation (no UPDATE or DELETE authorized; RLS + trigger recommended
but deferred to schema foundation packet for implementation decision).

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `rfq_id` | UUID FK → network_pool_rfqs | Owning RFQ |
| `owner_org_id` | UUID FK → organizations | RLS anchor (same as RFQ) |
| `pool_id` | UUID FK → network_pools | Pool reference |
| `snapshot_line_id` | UUID FK → network_pool_demand_snapshot_lines | Lineage |
| `demand_line_id` | UUID | Denormalized from snapshot_line. No FK (audit lineage; demand line may be LOCKED). |
| `source_line_ref` | VarChar(100) | Copied from snapshot_line.sourceLineRef |
| `source_revision_no` | Int | Copied from snapshot_line.sourceRevisionNo |
| `commodity_category` | VarChar(100) | Copied |
| `product_category` | VarChar(100) | Copied, nullable |
| `product_spec_summary` | Text | Copied, nullable |
| `qty` | Decimal(18,6) | Copied |
| `qty_unit` | VarChar(50) | Copied |
| `quality_requirements_json` | JSONB | Copied, nullable |
| `certification_requirements_json` | JSONB | Copied, nullable |
| `packaging_requirements_json` | JSONB | Copied, nullable |
| `delivery_location` | VarChar(500) | Copied, nullable |
| `delivery_window_start` | Timestamptz | Copied, nullable |
| `delivery_window_end` | Timestamptz | Copied, nullable |
| `tolerance_pct` | Decimal(5,2) | Copied, nullable |
| `priority` | Int | Copied, nullable |
| `created_at` | Timestamptz | `now()` |

Note: `metadata_internal_json` is intentionally omitted from `NetworkPoolRfqLine`.
The snapshot line already holds the internal metadata for audit purposes.
RFQ lines are the supplier-facing demand record; internal metadata must not leak.

Unique constraint: `(rfq_id, snapshot_line_id)` — one RFQ line per snapshot line per RFQ.

FK relations:
- `rfq_id → network_pool_rfqs.id` ON DELETE Cascade
- `owner_org_id → organizations.id` ON DELETE CASCADE
- `pool_id → network_pools.id` ON DELETE Cascade
- `snapshot_line_id → network_pool_demand_snapshot_lines.id` ON DELETE Restrict

### 8.4 Deferred entities (NOT in v1 schema)

- `NetworkPoolRfqSupplierInvite` — supplier invite packet
- `NetworkPoolSupplierQuote` — supplier quote packet
- `NetworkPoolQuoteLine` — post-acceptance, if line-level normalization needed
- `NetworkPoolQuoteDocument` — if attachment model approved

---

## 9. Lifecycle Transition Design

### Decision: RFQ issue drives `AGGREGATING → CLOSED_FOR_BIDS`

This is the authorized, natural point for the lifecycle transition. The prior lock decision
record explicitly designated "RFQ-issuance packet" as the owner of this transition (D-12).

### Transition parameters (for StateMachineService.transition)

```typescript
{
  entityType: 'POOL',
  entityId:   pool.id,
  orgId:      orgId,
  fromStateKey: 'AGGREGATING',
  toStateKey:   'CLOSED_FOR_BIDS',
  actorType:    'TENANT_ADMIN',     // OWNER/ADMIN maps to TENANT_ADMIN
  actorUserId:  userId,             // from authenticated session
  actorAdminId: null,
  actorRole:    'NC_POOL_ADMIN',    // consistent with existing pool transition tests
  reason:       <caller-supplied issue_reason or default 'RFQ issued from demand snapshot'>
}
```

**Seeded transition confirmed:**
- `allowedActorType: ['TENANT_ADMIN', 'PLATFORM_ADMIN']` — ✓ TENANT_ADMIN is valid
- `requiresMakerChecker: false` — ✓ No MakerChecker needed; transition returns `APPLIED`
- `requiresEscalation: false` — ✓ No escalation needed

### Transaction atomicity

The RFQ issue should execute in a single `prisma.$transaction()`:

```
BEGIN TRANSACTION (tx)
  1. Fetch and validate pool (AGGREGATING, ownerOrgId)
  2. Fetch and validate snapshot (CAPTURED, lineCount > 0, latest)
  3. Guard: no existing NetworkPoolRfq for pool
  4. Fetch NetworkPoolDemandSnapshotLine rows for snapshot
  5. Create NetworkPoolRfq (status=ISSUED)
  6. Create NetworkPoolRfqLine rows (bulk createMany from snapshot lines)
  7. Call StateMachineService.transition(req, { db: tx })
     → writes NetworkLifecycleLog inside the same transaction
     → returns APPLIED (no MC, no escalation)
     If result.status === 'DENIED' → throw PoolRfqLifecycleTransitionError → ROLLBACK
  8. Return RFQ header summary
COMMIT
```

**Transaction design note:** `StateMachineService.transition()` accepts `opts.db` as
an optional PrismaClient. When `opts.db = tx` (the transaction client), all state machine
DB operations (lifecycle_state fetch, allowed_transition fetch, log write) execute within
the caller's transaction. This is the established pattern for atomic compound operations.

### Pool entity state update

The StateMachineService writes `NetworkLifecycleLog` but does NOT update `NetworkPool.lifecycleStateId`
directly (by design — "entity state updates are a G-017/G-018 Day N concern" per service header).

**This is a critical design open question (see §18, Q-1)**: Does the RFQ issue service
also need to update `NetworkPool.lifecycleStateId` to the `CLOSED_FOR_BIDS` state row,
or does the platform rely solely on `NetworkLifecycleLog` for current state reads?

**Repo-truth finding:** The existing `openNetworkPool` service and `joinNetworkPool`
service in `networkPool.service.ts` DO update `lifecycleStateId` on the pool record
(via `prisma.networkPool.update({ data: { lifecycleStateId: newStateId } })`).
This means the pool entity state IS updated in practice, not deferred.
The StateMachineService comment about "G-017/G-018" applies to TRADE/ESCROW entities —
not to NetworkPool which has its own state update path.

**Recommended design:** RFQ issue service should:
1. Call `StateMachineService.transition()` (writes log, validates transition).
2. If `APPLIED`, also update `NetworkPool.lifecycleStateId` to the `CLOSED_FOR_BIDS`
   lifecycle_state row (by fetching it before the transaction or within).
   This is consistent with `openNetworkPool` and `joinNetworkPool` patterns.

---

## 10. Supplier Invitation Boundary

**Selected approach: RFQ issue creates RFQ header + lines only. Supplier invitation deferred.**

| Concern | v1 RFQ Issue | Deferred Packet |
|---|---|---|
| Create `NetworkPoolRfq` | ✅ In scope | — |
| Create `NetworkPoolRfqLine` rows | ✅ In scope | — |
| Pool lifecycle `AGGREGATING → CLOSED_FOR_BIDS` | ✅ In scope | — |
| Create `NetworkPoolRfqSupplierInvite` rows | ❌ Out of scope | SUPPLIER-INVITE-001 |
| Supplier org visibility of RFQ | ❌ Out of scope | SUPPLIER-INVITE-001 |
| Supplier quote routes | ❌ Out of scope | SUPPLIER-QUOTE-001 |
| Quote acceptance (MC-gated) | ❌ Out of scope | QUOTE-ACCEPT-001 |

**Rationale:** Separating RFQ creation from supplier invitation:
- Allows the pool admin to review the RFQ header before exposing it to suppliers.
- Prevents partial-visibility edge cases (RFQ created but invite fails → supplier receives
  broken invite link).
- Maintains TECS atomicity doctrine: one packet = one atomic concern.
- Supplier invite design may require additional governance decisions
  (invite delivery mechanism, expiry, re-invite policy).

---

## 11. Feature Gate Design

Both feature gates are required for all RFQ issue routes.

| Gate | Key | Middleware |
|---|---|---|
| Parent pool flag | `nc.procurement_pools.enabled` | `ncPoolFeatureGateMiddleware` |
| RFQ sub-flag | `nc.procurement_pools.rfq.enabled` | `ncPoolRfqFeatureGateMiddleware` |

**Route handler wiring (design):**
```typescript
fastify.post('/pools/:poolId/rfq/issue', {
  onRequest:  [tenantAuthMiddleware, databaseContextMiddleware],
  preHandler: [ncPoolFeatureGateMiddleware, ncPoolRfqFeatureGateMiddleware, ownerAdminRoleGate],
  handler: issuePoolRfqHandler
});
```

Both middlewares already exist and are verified. Zero additional gate work needed.
`ownerAdminRoleGate` follows the same role-check pattern as the lock route.

---

## 12. DTO / Privacy Model

### Issue request body (design)

```typescript
{
  snapshot_id:         string (UUID, required)
  issue_reason?:       string (optional free-form, max 1000 chars)
  response_deadline_at?: string (ISO 8601 datetime, optional)
}
```

**Not in request body (never caller-supplied):**
- `rfq_ref` — service-generated
- `rfq_version` — service-assigned (1 for first issue)
- `issued_at` — service clock
- `issued_by_user_id` — from authenticated session
- `owner_org_id` — from `request.dbContext.orgId`
- `pool_id` — from route param `:poolId`
- `status` — service-set to `ISSUED`
- `supplier_invite_mode` — service default `INVITE_ONLY`

### Issue response body (design)

HTTP 201 Created. RFQ header summary only.

```typescript
{
  id:                  string (UUID)
  rfq_ref:             string
  rfq_version:         number
  status:              'ISSUED'
  pool_id:             string (UUID)
  snapshot_id:         string (UUID)
  line_count:          number
  total_qty:           string | null   // Decimal as string
  qty_unit:            string | null
  issued_at:           string (ISO 8601)
  issued_by_user_id:   string (UUID)
  issue_reason:        string | null
  response_deadline_at: string | null
  supplier_invite_mode: 'INVITE_ONLY'
}
```

**Excluded from response (non-exhaustive):**
- `metadata_internal_json` — internal, never exposed
- `owner_org_id` — redundant (authenticated context)
- `NetworkPoolRfqLine` rows — not in issue response; deferred to owner detail endpoint
- Member identities or per-member quantities — excluded at schema level
- Supplier identities — no supplier data exists at issue time
- Snapshot internal fields — `metadataInternalJson`, `capturedReason`

---

## 13. Error Model

### Custom error classes (proposed for service layer)

```typescript
export class PoolRfqPoolNotFoundError extends Error { ... }
export class PoolRfqInvalidPoolStateError extends Error {
  constructor(currentState: string, requiredState: string) { ... }
}
export class PoolRfqSnapshotNotFoundError extends Error { ... }
export class PoolRfqSnapshotInvalidStateError extends Error { ... }
export class PoolRfqSnapshotNotLatestError extends Error { ... }
export class PoolRfqAlreadyIssuedError extends Error { ... }
export class PoolRfqLifecycleTransitionError extends Error {
  constructor(code: string, message: string) { ... }
}
export class PoolRfqConflictError extends Error { ... }  // P2002 duplicate key
```

### Route error mappings

| Error class | HTTP | Code |
|---|---|---|
| `PoolRfqPoolNotFoundError` | 404 | `POOL_NOT_FOUND` |
| `PoolRfqInvalidPoolStateError` | 422 | `INVALID_STATE` |
| `PoolRfqSnapshotNotFoundError` | 404 | `SNAPSHOT_NOT_FOUND` |
| `PoolRfqSnapshotInvalidStateError` | 422 | `INVALID_STATE` |
| `PoolRfqSnapshotNotLatestError` | 409 | `SNAPSHOT_NOT_LATEST` |
| `PoolRfqAlreadyIssuedError` | 409 | `RFQ_ALREADY_ISSUED` |
| `PoolRfqLifecycleTransitionError` | 409 | `LIFECYCLE_TRANSITION_DENIED` |
| `PoolRfqConflictError` (P2002) | 409 | `RFQ_CONFLICT` |
| Zod validation fail | 400 | `INVALID_INPUT` |
| Feature disabled (middleware) | 503 | `FEATURE_DISABLED` |
| Role check fail (middleware) | 403 | `FORBIDDEN` |
| Unauthenticated | 401 | — |

---

## 14. Transaction Atomicity Design

### Transaction steps (detailed)

```
WITHIN prisma.$transaction(async (tx) => {

  STEP 1 — Fetch pool
    tx.networkPool.findUnique({ where: { id: poolId }, include: { lifecycleState: true } })
    IF pool null OR pool.ownerOrgId != orgId → PoolRfqPoolNotFoundError

  STEP 2 — Validate pool state
    IF pool.lifecycleState.stateKey !== 'AGGREGATING' → PoolRfqInvalidPoolStateError

  STEP 3 — Fetch snapshot
    tx.networkPoolDemandSnapshot.findUnique({ where: { id: snapshotId } })
    IF null OR snapshot.ownerOrgId != orgId OR snapshot.poolId != poolId → PoolRfqSnapshotNotFoundError

  STEP 4 — Validate snapshot
    IF snapshot.status !== 'CAPTURED' → PoolRfqSnapshotInvalidStateError
    IF snapshot.lineCount === 0 → PoolRfqSnapshotInvalidStateError

  STEP 5 — Validate snapshot is latest
    FETCH max(snapshotVersion) WHERE poolId = poolId AND status NOT IN ('CANCELLED')
    IF snapshot.snapshotVersion < maxVersion → PoolRfqSnapshotNotLatestError

  STEP 6 — Guard duplicate issue
    COUNT tx.networkPoolRfq WHERE poolId = poolId
    IF count > 0 → PoolRfqAlreadyIssuedError

  STEP 7 — Fetch snapshot lines
    tx.networkPoolDemandSnapshotLine.findMany({ where: { snapshotId, ownerOrgId } })

  STEP 8 — Fetch CLOSED_FOR_BIDS lifecycle state id
    tx.lifecycleState.findUnique({ where: { entityType_stateKey: { entityType: 'POOL', stateKey: 'CLOSED_FOR_BIDS' } } })

  STEP 9 — Create NetworkPoolRfq
    tx.networkPoolRfq.create({ data: { ..., status: 'ISSUED', rfqRef: randomUUID(), rfqVersion: 1 } })

  STEP 10 — Create NetworkPoolRfqLine rows
    tx.networkPoolRfqLine.createMany({ data: snapshotLines.map(l => ({ rfqId: rfq.id, ... })) })

  STEP 11 — Update pool lifecycleStateId
    tx.networkPool.update({ where: { id: poolId }, data: { lifecycleStateId: closedForBidsStateId } })

  STEP 12 — Call StateMachineService.transition
    result = await stateMachineService.transition({
      entityType: 'POOL', entityId: poolId, orgId, fromStateKey: 'AGGREGATING',
      toStateKey: 'CLOSED_FOR_BIDS', actorType: 'TENANT_ADMIN', actorUserId: userId,
      actorAdminId: null, actorRole: 'NC_POOL_ADMIN', reason: issueReason ?? 'RFQ issued from demand snapshot'
    }, { db: tx })
    IF result.status === 'DENIED' → throw PoolRfqLifecycleTransitionError(result.code, result.message)

  RETURN rfq header summary (built from STEP 9 result)
})
```

**Note on STEP 11 vs STEP 12 ordering:** The pool `lifecycleStateId` update (STEP 11)
and the `StateMachineService.transition` call (STEP 12) must both be within the transaction.
Ordering within the transaction is an open question for the decision audit — see §18, Q-1.

**P2002 handling:** If the `(pool_id, rfq_version)` unique constraint fires (concurrent
issue attempt), wrap with `catch(err) { if (isPrismaP2002(err)) throw new PoolRfqConflictError() }`.

---

## 15. NetworkLifecycleLog Policy

| Concern | Policy |
|---|---|
| Who writes `NetworkLifecycleLog` | `StateMachineService.transition()` exclusively |
| RFQ issue service direct log write | ❌ FORBIDDEN |
| RFQ service writes log via tx | ✅ Via `opts.db = tx` parameter |
| Log table immutability | 3-layer: RLS policy + DB trigger + service-level (no update/delete methods) |
| Log written on AGGREGATING → CLOSED_FOR_BIDS | ✅ YES — when result.status = 'APPLIED' |
| Log written if transition DENIED | ❌ NO — no log on DENIED result |
| Any other log entry for RFQ creation | ❌ NO — only lifecycle transitions produce log entries |

---

## 16. Future Test Plan

Tests to be written in the implementation test suites (design only; not authorized now):

### Integration tests (`pools.rfq.integration.test.ts` — proposed)

| ID | Scenario | Expected |
|---|---|---|
| RFQ-I-01 | OWNER issues RFQ from latest CAPTURED snapshot | 201, RFQ header returned, pool state = CLOSED_FOR_BIDS |
| RFQ-I-02 | RFQ creation inserts NetworkPoolRfq + NetworkPoolRfqLine rows | DB verification |
| RFQ-I-03 | RFQ issue writes NetworkLifecycleLog (AGGREGATING → CLOSED_FOR_BIDS) | DB verification |
| RFQ-I-04 | Pool lifecycle state updated to CLOSED_FOR_BIDS after issue | DB verification |
| RFQ-I-05 | ADMIN issues RFQ — authorized | 201 |
| RFQ-I-06 | MEMBER attempts issue — forbidden | 403 |
| RFQ-I-07 | Pool not found (wrong org) | 404 POOL_NOT_FOUND |
| RFQ-I-08 | Wrong snapshot_id (wrong org) | 404 SNAPSHOT_NOT_FOUND |
| RFQ-I-09 | Snapshot not CAPTURED (still DRAFT) | 422 INVALID_STATE |
| RFQ-I-10 | Snapshot has lineCount = 0 | 422 INVALID_STATE |
| RFQ-I-11 | Newer snapshot version exists | 409 SNAPSHOT_NOT_LATEST |
| RFQ-I-12 | Pool state = CLOSED_FOR_BIDS (already issued) | 422 INVALID_STATE |
| RFQ-I-13 | Duplicate issue attempt (RFQ already exists) | 409 RFQ_ALREADY_ISSUED |
| RFQ-I-14 | Parent feature flag disabled | 503 FEATURE_DISABLED |
| RFQ-I-15 | RFQ sub-flag disabled | 503 FEATURE_DISABLED |
| RFQ-I-16 | Unauthenticated request | 401 |
| RFQ-I-17 | Response does not include metadata_internal_json | Field absent from body |
| RFQ-I-18 | Response does not include NetworkPoolRfqLine array | Field absent from body |
| RFQ-I-19 | No supplier invites created during issue | DB: zero NetworkPoolRfqSupplierInvite rows |
| RFQ-I-20 | Cleanup removes RFQ lines before RFQ before snapshot before pool | afterEach/afterAll order |
| RFQ-I-21 | RFQ lines count matches snapshot lineCount | Assertion on line rows |
| RFQ-I-22 | Invalid UUID in snapshot_id body | 400 INVALID_INPUT |
| RFQ-I-23 | Missing snapshot_id in body | 400 INVALID_INPUT |
| RFQ-I-24 | No ACTIVE demand lines (pool has no snapshot) | 404 SNAPSHOT_NOT_FOUND |

### Unit tests (`networkPoolRfq.service.unit.test.ts` — proposed)

| ID | Scenario |
|---|---|
| RFQ-U-01 | issuePoolRfq — success path: returns RFQ header summary |
| RFQ-U-02 | Pool not found → PoolRfqPoolNotFoundError |
| RFQ-U-03 | Pool state != AGGREGATING → PoolRfqInvalidPoolStateError |
| RFQ-U-04 | Snapshot not found → PoolRfqSnapshotNotFoundError |
| RFQ-U-05 | Snapshot status != CAPTURED → PoolRfqSnapshotInvalidStateError |
| RFQ-U-06 | Snapshot lineCount = 0 → PoolRfqSnapshotInvalidStateError |
| RFQ-U-07 | Newer snapshot version exists → PoolRfqSnapshotNotLatestError |
| RFQ-U-08 | Existing RFQ for pool → PoolRfqAlreadyIssuedError |
| RFQ-U-09 | StateMachineService returns DENIED → PoolRfqLifecycleTransitionError |
| RFQ-U-10 | P2002 unique violation → PoolRfqConflictError |
| RFQ-U-11 | metadata_internal_json NOT in returned DTO |
| RFQ-U-12 | issued_by_user_id from service param, not from input |
| RFQ-U-13 | rfq_ref generated via randomUUID() — not caller-supplied |
| RFQ-U-14 | StateMachineService called with opts.db = tx (shared transaction) |
| RFQ-U-15 | NetworkPoolRfqLine rows match snapshot line fields (spot check 3 fields) |

---

## 17. Proposed Implementation Sequence

```
1. TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-AUDIT-001
   Type: Decision audit / engineering evidence
   Scope: Evidence the 6 open Paresh decisions in §18.
   Commit: docs(network-commerce): audit pool RFQ issue decisions

2. TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001
   Type: Decision record / Paresh approval
   Scope: Record approved decisions; unblock schema work.
   Commit: docs(network-commerce): record pool RFQ issue decisions

3. TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-FOUNDATION-001
   Type: Schema (Prisma + SQL)
   Scope: NetworkPoolRfq + NetworkPoolRfqLine models; db pull; prisma generate.
   Commit: feat(network-commerce): add pool RFQ schema foundation

4. TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-DEPLOY-VERIFY-001
   Type: Schema deployment verification
   Scope: Verify SQL applied to Supabase; table existence; RLS; constraints; prisma generate.
   Commit: docs(network-commerce): verify pool RFQ schema deployment

5. TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-GOV-SYNC-001
   Type: Governance sync
   Scope: Update OPEN-SET.md, NEXT-ACTION.md, GOVERNANCE-CHANGELOG.md.
   Commit: docs(network-commerce): sync pool RFQ schema governance

6. TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-SERVICE-001
   Type: Service implementation
   Scope: networkPoolRfq.service.ts (issuePoolRfq) + unit tests.
   Commit: feat(network-commerce): implement issuePoolRfq service

7. TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-ROUTE-001
   Type: Route implementation
   Scope: POST /pools/:poolId/rfq/issue route + integration tests.
   Commit: feat(network-commerce): add pool RFQ issue route

8. TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-PROD-VERIFY-GOV-CLOSE-001
   Type: Production verification + governance closure
   Scope: Verify tests, tsc, runtime smoke, DB cleanup. Update governance control files.
   Commit: docs(network-commerce): close pool RFQ issue governance
```

**Optionally split step 6 + 7** into separate packets if the state machine integration
makes the service unit tests substantially larger (consistent with TECS atomicity doctrine).

---

## 18. Paresh Decisions Required Before Implementation

The following decisions are open and must be resolved in
`TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-AUDIT-001` /
`TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001`.

### Q-1 — Pool lifecycleStateId update authority

**Question:** Does the RFQ issue service update `NetworkPool.lifecycleStateId` directly
(in the same transaction), or does it rely on `StateMachineService` to update it?

**Repo-truth finding:** `openNetworkPool` and `joinNetworkPool` in `networkPool.service.ts`
DO update `lifecycleStateId` directly after calling StateMachineService (or implicitly).
The StateMachineService header says "entity state updates are a G-017/G-018 Day N concern"
but this comment applies to TRADE/ESCROW entities, not POOL.

**Options:**
- A) RFQ service updates `NetworkPool.lifecycleStateId` within the transaction after
  receiving `APPLIED` from StateMachineService. (Consistent with existing pool service pattern.)
- B) StateMachineService is extended to accept and update entity state. (Requires
  StateMachineService changes — not in this packet's allowlist.)
- C) Pool entity state is not updated; queries derive state from NetworkLifecycleLog
  latest entry. (Inconsistent with current pool state-read pattern.)

**Recommended default: Option A.**

---

### Q-2 — Snapshot latest-version enforcement strictness

**Question:** Should the service enforce "caller must provide the latest CAPTURED snapshot"
(by snapshotVersion), or should it accept any valid CAPTURED snapshot for the pool?

**Options:**
- A) Enforce latest version only. A newer CAPTURED snapshot must not exist. (Strict safety —
  prevents old snapshot being promoted to RFQ while a newer lock exists.)
- B) Accept any CAPTURED snapshot. Caller has full discretion. (Flexible but allows
  stale demand basis.)
- C) Warning-only: accept any CAPTURED, but return a field `is_latest: false` in response
  if a newer snapshot exists.

**Recommended default: Option A.** Pool aggregate RFQ issued on stale demand is a
data integrity risk (supplier receives demand that does not reflect the latest locked set).

---

### Q-3 — `response_deadline_at` requirement

**Question:** Should `response_deadline_at` be required or optional in v1?

**Options:**
- A) Optional. Null is valid. Supplier quote deadline is not platform-enforced in v1.
- B) Required. Must be a future datetime. Service validates it.

**Recommended default: Option A.** Making it required without a supplier-facing deadline
enforcement mechanism is premature. Enforce in a later hardening packet.

---

### Q-4 — `rfqRef` generation pattern

**Question:** Use `randomUUID()` from `'crypto'` (consistent with `snapshotRef` pattern)?
Or a structured human-readable key?

**Options:**
- A) `randomUUID()` — consistent with `snapshotRef` generation (D-6 in lock decisions).
- B) Structured: `RFQ-{poolRef}-{version}` (human-readable, but requires poolRef lookup
  at create time).

**Recommended default: Option A.** Consistent with `snapshotRef` pattern (D-6).

---

### Q-5 — Transition denial behavior

**Question:** If `StateMachineService.transition()` returns `status = 'DENIED'` (e.g., because
the pool is already at `CLOSED_FOR_BIDS` due to a concurrent request), should the service:

- A) Throw `PoolRfqLifecycleTransitionError`, roll back the transaction, and return 409.
- B) Proceed with RFQ creation even if transition denied (RFQ exists but pool state
  not updated). Treat as partial success.

**Recommended default: Option A.** Partial success (RFQ created, pool not transitioned) is
a dangerous inconsistent state. Always rollback on transition denial. 409 with code
`LIFECYCLE_TRANSITION_DENIED` is the correct response.

---

### Q-6 — RFQ issue route path

**Question:** What should the URL path be for the RFQ issue route?

**Options:**
- A) `POST /api/tenant/network-commerce/pools/:poolId/rfq/issue` (namespaced under `/rfq/`)
- B) `POST /api/tenant/network-commerce/pools/:poolId/issue-rfq` (flat)
- C) `POST /api/tenant/network-commerce/pools/:poolId/rfq` (creates RFQ; issue is implicit)

**Recommended default: Option A.** Namespacing under `/rfq/` reserves the space for
`/rfq/supplier-invites`, `/rfq/quotes`, etc. in subsequent packets.
Static `/rfq/issue` before any `/rfq/:rfqId` params — consistent with lock route pattern.

---

## 19. Recommended Next Packet

**Recommended next packet:**
`TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-AUDIT-001`

**Rationale:**
- Six design decisions in §18 require evidence-based audit before Paresh selection.
- The decision audit packet is cheap (read-only; no code changes).
- Following the established chain: DESIGN → DECISION-AUDIT → DECISION-RECORD → SCHEMA.
- After the decision audit, `TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001` records
  Paresh approvals and unblocks schema work.

**Do not skip to DECISION-RECORD directly** unless Paresh explicitly accepts the 6
recommended defaults in §18 without an audit step.

---

## Scope Boundary

This packet is design only.

In scope for this packet:
- Repo-truth inspection
- RFQ issue workflow design
- Schema model proposal
- Lifecycle transition design
- Error model design
- Test plan design
- Implementation sequence proposal
- Open decision enumeration

Explicitly NOT in scope:
- Schema changes or migrations
- Service code (`networkPoolRfq.service.ts` does not exist; not created here)
- Route code
- Test code
- Middleware changes
- UI changes
- Supplier invite implementation
- Quote implementation
- Governance control file updates (`OPEN-SET.md`, `NEXT-ACTION.md`, `GOVERNANCE-CHANGELOG.md`)
- DPP state changes
- `active_delivery_unit` or `dpp_launch_authorization` changes
