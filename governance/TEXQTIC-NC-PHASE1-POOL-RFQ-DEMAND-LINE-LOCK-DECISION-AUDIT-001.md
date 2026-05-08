# TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-AUDIT-001
## Network Commerce Pool RFQ — Lock Demand Lines: Decision Engineering Audit

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-AUDIT-001
Status: AUDIT — AWAITING PARESH DECISION RECORD
Type: TECS bounded audit-only packet
Date: 2026-05-08
Design authority: Paresh Patel

Implementation gate:
- This packet produces one audit artifact only.
- No service, route, schema, migration, test, middleware, or UI changes are authorized
  by this packet.
- Every implementation slice requires a separate authorized prompt.

---

## 1. Executive Summary

This document audits the 14 open decisions recorded in
`TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001` §19 (commit `3c27713`).

For each decision, this audit provides:
- Repo-truth evidence (exact file locations and code observations)
- Available options with risks and complexity
- A firm engineering recommendation grounded in existing codebase patterns
- Whether the decision blocks implementation
- Which implementation packet carries the decision

**Audit outcome summary:**
- All 14 decisions have clear recommended resolutions.
- 10 decisions are confirmed by direct repo-truth evidence or prior decision records.
- 4 decisions (D-4, D-6, D-10, D-11) have design-preference components requiring
  Paresh approval; the recommended options are unambiguous.
- Zero decisions are blocked by missing schema, missing infrastructure, or unknown
  architecture.

**This audit does not constitute the decision record.**
Decisions become authoritative only when recorded in:
```
TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001
```

---

## 2. Inspection Manifest

All files were inspected at commit `3c27713` (HEAD at audit time) on a clean working tree.

| File | Lines / Region Inspected | Purpose |
|---|---|---|
| `server/src/services/networkPoolDemandLine.service.ts` | 1–end | Existing service: constants, error classes, locked_at field, DemandLineRecord, no $transaction, DemandLineSnapshotBlockedError stub |
| `server/src/services/stateMachine.service.ts` | 1–560 | $transaction pattern, opts.db shared-tx, NetworkLifecycleLog dispatch for POOL/SYNDICATE/VCO_CHAIN |
| `server/src/services/makerChecker.service.ts` | Full | FOR UPDATE NOWAIT pattern ($queryRaw), signApproval, verifyAndReplay |
| `server/src/services/networkPool.service.ts` | Full (grep) | randomUUID import (`'crypto'`), pool id generation, poolRef caller-supplied |
| `server/src/middleware/ncPoolFeatureGate.middleware.ts` | Full | Two-layer gate: FeatureFlag + TenantFeatureOverride, fail-closed 503, error swallowed |
| `server/src/routes/tenant/poolDemandLines.ts` | Full | 4 routes, DemandLineSnapshotBlockedError import + 422 mapper, feature gate wiring, userRole pattern |
| `server/src/routes/tenant/pools.demandLines.integration.test.ts` | 1–320 | Test cleanup pattern (afterEach/afterAll), makePoolRef, RLS-bypass harness, NO snapshot cleanup present |
| `server/src/__tests__/networkPoolDemandLine.service.unit.test.ts` | 1–100 | Mock PrismaClient pattern, makeLineRow with lockedAt: null, 30-test coverage, no lock tests |
| `server/prisma/schema.prisma` | 2002–2100 | NetworkPoolDemandSnapshot + NetworkPoolDemandSnapshotLine models, unique constraints |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001.md` | §19, §20, Appendix A | 14 open decisions, recommended defaults, packet sequence |
| `governance/control/NEXT-ACTION.md` | nc_phase1_pool_rfq_demand_line_lock entries | lock status = SCHEMA_PREREQUISITE_RESOLVED |
| `server/src/events/aiEmitter.ts` | lines 28, 97, 193 | randomUUID import pattern from `'node:crypto'` |

**grep searches performed (server/src/**):**
- `networkLifecycleLog` — 18 matches; StateMachineService is the exclusive writer
- `FOR UPDATE` — 3 matches; all in `makerChecker.service.ts` ($queryRaw NOWAIT only)
- `$queryRaw` — found in makerChecker, escrow, dpp services only; not in NC demand line context
- `nc.procurement_pools.rfq` — 0 matches (sub-flag does not exist yet)
- `poolRef|snapshotRef|randomUUID|crypto` — poolRef is caller-supplied in networkPool.service.ts; snapshotRef has no existing generation logic; randomUUID imported from `'crypto'`
- `network_pool_demand|NetworkPoolDemand` in `__tests__` — confirms unit test file exists, NO snapshot cleanup in integration test afterEach/afterAll

---

## 3. Repo-Truth Findings

The following 10 questions were identified during LOCK-DESIGN-001 as requiring direct
codebase validation before implementation could begin.

### Q-1: Does the `$transaction` callback pattern work safely in the NC demand-line context?

**Finding: YES — confirmed, consistent with repo pattern.**

`stateMachine.service.ts` uses `prisma.$transaction(async tx => { ... })` callback style
throughout. When `opts.db` is provided (caller-managed transaction), it writes directly
without nesting a new `$transaction`. This `opts.db` injection pattern is the correct
approach for the lock action, allowing the entire lock operation (demand-line status updates
+ snapshot creation + snapshot-line creation) to execute atomically.

The `networkPoolDemandLine.service.ts` service currently has NO `$transaction` — the lock
implementation will introduce the first one. This is low-risk: the pattern is well-established
in the repo and the Prisma version supports nested callback transactions.

```
Evidence: stateMachine.service.ts lines 200-430
Pattern: prisma.$transaction(async tx => tx.networkLifecycleLog.create({data}))
Shared-tx injection: if (opts?.db) { db = opts.db; } else { db = this.db; }
```

---

### Q-2: Is `FOR UPDATE` practical for the demand-line lock action in Supabase pooler context?

**Finding: NOT PRACTICAL for v1 — unique-constraint P2002 is the correct race backstop.**

The only `FOR UPDATE` in the entire codebase is in `makerChecker.service.ts` via `$queryRaw`:
```sql
SELECT id FROM pending_approvals WHERE id = ${input.approvalId}::uuid FOR UPDATE NOWAIT
```
This requires raw SQL, bypasses Prisma's model API, and introduces `NOWAIT` semantics
(throw immediately if lock unavailable). It is architecturally complex and was added for a
specific idempotency requirement (verifyAndReplay idempotency — D-021 Maker-Checker).

For the demand-line lock action:
- Supabase uses a connection pooler (PgBouncer in transaction mode); `SELECT FOR UPDATE`
  requires session-mode connections and is unreliable in pooled contexts.
- The `NetworkPoolDemandSnapshot` table has a unique constraint on `(poolId, snapshotVersion)`.
- A P2002 on that constraint is the safe, pooler-compatible race backstop: the second
  concurrent lock attempt will fail with a Prisma unique-violation error, which the service
  maps to a deterministic `DemandLineLockConflictError`.
- This is simpler, more reliable, and consistent with how the existing schema constraints
  backstop race conditions throughout the NC domain.

```
Evidence: makerChecker.service.ts verifyAndReplay() — $queryRaw FOR UPDATE NOWAIT
Schema constraint: @@unique([poolId, snapshotVersion]) on NetworkPoolDemandSnapshot
```

---

### Q-3: Is `NetworkLifecycleLog` restricted to state-transition writes only?

**Finding: YES — state-transition-only by architecture. No non-transition writes exist anywhere.**

`StateMachineService.transition()` is the sole writer of `NetworkLifecycleLog` rows.
All 18 grep matches for `networkLifecycleLog` in `server/src/**` resolve to either:
- `StateMachineService.transition()` writes (inside the `$transaction`)
- Schema definition and DB trigger (immutability trigger, confirmed live)
- Test fixtures

No service, route, or event handler writes to `NetworkLifecycleLog` outside of
`StateMachineService.transition()`. The `transition()` method only dispatches to
`networkLifecycleLog` for entity types POOL, SYNDICATE, and VCO_CHAIN — and only when
a `fromStateKey → toStateKey` change occurs.

```
Evidence: stateMachine.service.ts lines 200-430
dispatch: if (LOGGABLE_ENTITY_TYPES.includes(entityType)) { tx.networkLifecycleLog.create(...) }
immutability: DB trigger confirmed live (deployment verified at 6174d31)
```

---

### Q-4: What is the authoritative `randomUUID` import pattern?

**Finding: `import { randomUUID } from 'crypto'`**

`networkPool.service.ts` line 29: `import { randomUUID } from 'crypto';`
`aiEmitter.ts` line 28: `import { randomUUID } from 'node:crypto';`

Both `'crypto'` and `'node:crypto'` resolve identically in Node 22. The NC service layer
consistently uses the non-prefixed form (`'crypto'`). The lock service should follow
`networkPool.service.ts` for consistency within the NC domain.

```
Evidence: networkPool.service.ts line 29 — import { randomUUID } from 'crypto';
Usage: networkPool.service.ts line 399 — id: randomUUID()
Usage: networkPool.service.ts line 553 — id: randomUUID()
```

---

### Q-5: Is `snapshotRef` caller-supplied or service-generated?

**Finding: SERVICE-GENERATED. No caller input. No existing structured-ref pattern in NC.**

`poolRef` is caller-supplied (`input.pool_ref.trim()` in networkPool.service.ts line 401).
`snapshotRef` is a new field on `NetworkPoolDemandSnapshot` with no existing generation logic.
The lock service is the sole creator of snapshot records. The caller has no semantic role
in naming a snapshot — the snapshot is an internal audit artifact, not a user-facing reference.

The unique constraint `(poolId, snapshotRef)` provides a P2002 backstop in the extreme
edge case of a UUID collision (astronomically unlikely for v4 UUIDs).

```
Evidence: networkPool.service.ts line 401 — poolRef: input.pool_ref.trim()
Schema: NetworkPoolDemandSnapshot.snapshotRef VarChar(100) @@unique([poolId, snapshotRef])
No structured snapshotRef generation logic exists in any service file.
```

---

### Q-6: Does the RFQ sub-flag middleware already exist?

**Finding: NO — zero matches. The sub-flag key and middleware do not exist.**

Grep for `nc.procurement_pools.rfq` in `server/src/**` returns 0 matches.
The global pool flag key `nc.procurement_pools.enabled` is fully implemented in
`ncPoolFeatureGate.middleware.ts` (two-layer gate pattern, confirmed).
The RFQ sub-flag middleware must be implemented from scratch in its own packet.

```
Evidence: grep 'nc.procurement_pools.rfq' server/src/** → 0 results
Existing gate: ncPoolFeatureGate.middleware.ts — fully implements 'nc.procurement_pools.enabled'
```

---

### Q-7: What is the integration test cleanup pattern? Are snapshot tables included?

**Finding: `withBypassForSeed` in `afterEach` + `afterAll`. Snapshot tables NOT cleaned up yet.**

`pools.demandLines.integration.test.ts` cleanup (afterEach, confirmed):
```typescript
await tx.networkPoolDemandLine.deleteMany({ where: { poolId: { in: poolIds } } });
await tx.networkPoolMembership.deleteMany({ where: { poolId: { in: poolIds } } });
await tx.networkPool.deleteMany({ where: { id: { in: poolIds } } });
```

There is no cleanup for `networkPoolDemandSnapshot` or `networkPoolDemandSnapshotLine`.
The lock route integration test (future packet LOCK-ROUTE-001) **must** add:
```typescript
await tx.networkPoolDemandSnapshotLine.deleteMany({ where: { poolId: { in: poolIds } } });
await tx.networkPoolDemandSnapshot.deleteMany({ where: { poolId: { in: poolIds } } });
```
before deleting demand lines, because snapshot lines have `onDelete: Restrict` on `demandLineId`.

```
Evidence: pools.demandLines.integration.test.ts lines 237-250 (afterEach cleanup)
Evidence: pools.demandLines.integration.test.ts lines 268-300 (afterAll cleanup)
Schema: NetworkPoolDemandSnapshotLine.demandLineId onDelete: Restrict
```

---

### Q-8: Is there an existing pattern for partial line selection (`expected_line_ids`)?

**Finding: NO existing pattern. `expected_line_ids` is net-new design.**

The current `networkPoolDemandLine.service.ts` has no partial-selection logic.
`listDemandLines` fetches all lines for a pool with `findMany({ where: { poolId, ownerOrgId } })`.
No `ids` filter, no `expectedLineIds` validation, no set-comparison logic exists anywhere.

The `expected_line_ids` feature in v1 adds:
- A `z.array(z.string().uuid()).optional()` field on the lock request body schema
- A set-comparison: if provided, the fetched ACTIVE line IDs must match exactly
- A deterministic 422 `DEMAND_LINE_IDS_MISMATCH` if they differ

This is the correct approach for a concurrent-safe, declarative lock API.

```
Evidence: networkPoolDemandLine.service.ts — listDemandLines uses findMany({ where: { poolId, ownerOrgId } })
No existing partial-selection pattern in any NC service file.
```

---

### Q-9: What is the existing pool-state gate pattern in the demand-line service?

**Finding: Single `if` guard using `lifecycleState.stateKey !== POOL_STATE.AGGREGATING`.**

From `networkPoolDemandLine.service.ts` (createDemandLine):
```typescript
const pool = await db.networkPool.findUnique({
  where: { id: input.pool_id, orgId: input.ownerOrgId },
  include: { lifecycleState: { select: { stateKey: true } } },
});
if (!pool) throw new DemandLinePoolNotFoundError(...);
if (pool.lifecycleState.stateKey !== POOL_STATE.AGGREGATING) throw new DemandLinePoolStateError(...);
```

The lock action follows the same two-step pattern:
1. `findUnique` with `include: { lifecycleState: { select: { stateKey: true } } }`
2. Guard: throw `DemandLineLockPoolStateError` if not AGGREGATING

```
Evidence: networkPoolDemandLine.service.ts createDemandLine() — pool fetch + state gate
Constants: POOL_STATES enum includes AGGREGATING
```

---

### Q-10: Is `DemandLineSnapshotBlockedError` still imported and mapped in the route?

**Finding: YES — actively imported and mapped to 422 `DEMAND_SNAPSHOT_NOT_READY`.**

`poolDemandLines.ts` route plugin:
```typescript
import { DemandLineSnapshotBlockedError } from '../../services/networkPoolDemandLine.service.js';
// ...
if (err instanceof DemandLineSnapshotBlockedError) {
  return reply.code(422).send({ success: false, error: { code: 'DEMAND_SNAPSHOT_NOT_READY' } });
}
```

This import is live. Removing `DemandLineSnapshotBlockedError` from the service would break
the route import at runtime. The route file is NOT in the allowlist for the lock service packet.
The class must be retained (with `@deprecated` JSDoc) until a future route-update packet
explicitly removes the import and the error mapper.

```
Evidence: server/src/routes/tenant/poolDemandLines.ts — import + error mapper (live)
Allowlist constraint: route file NOT modifiable in LOCK-SERVICE-001
```

---

## 4. Decision Audit: D-1 through D-14

Each entry covers: evidence, options, risks, complexity, concurrency risk, testing impact,
recommendation, and which implementation packet carries the decision.

---

### D-1 — Lock Ownership: Who May Trigger `lockDemandLinesForRfq`?

**Question:** Should the lock action be restricted to pool OWNER/ADMIN org members only,
or available to any authenticated tenant member?

**Repo-truth evidence:**
- `poolDemandLines.ts` create route: `if (request.userRole !== 'OWNER' && request.userRole !== 'ADMIN')` → 403
- Cancel route: same guard pattern
- Update route: same guard pattern
- `ncPoolFeatureGateMiddleware`: gate only checks feature flags, not role
- Pattern is established: write operations on pool demand lines require OWNER or ADMIN role

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | OWNER + ADMIN roles only; MEMBER role returns 403 FORBIDDEN |
| B | Any authenticated tenant member; no role gate |

**Option A risks:** None — consistent with all existing demand-line write operations.
**Option B risks:** Members could freeze uncommitted demand lines, disrupting pool operation.
Members submit contributions via pool membership, not direct demand-line lock.

**Complexity:** Trivial — copy existing role guard from createDemandLine.
**Concurrency risk:** None — role gate fires before any DB write.
**Testing impact:** Add test cases for MEMBER role returning 403 (2 unit tests).

**Recommendation: Option A — OWNER + ADMIN only.**
Consistent with every existing demand-line write operation in the codebase.

**Blocks implementation?** No (clear recommendation).
**Implementation packet:** LOCK-SERVICE-001 (service layer role validation),
LOCK-ROUTE-001 (route role guard).

---

### D-2 — Pool State Gate: Which Pool States May Be Locked?

**Question:** Should `lockDemandLinesForRfq` require pool state `AGGREGATING` only,
or accept a wider set (e.g., OPEN + AGGREGATING)?

**Repo-truth evidence:**
- All demand-line write operations gate on `AGGREGATING` only
- Prior decision record `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001`
  (commit `8878305`) establishes AGGREGATING as the demand-collection state
- Prior decision record `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001`
  (commit `1022879`) confirms demand lines are created only in AGGREGATING pools
- OPEN is the pre-aggregation state; no demand lines exist in an OPEN pool (enforced by
  createDemandLine gate)

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | AGGREGATING only |
| B | AGGREGATING + OPEN |

**Option A risks:** None — OPEN pools cannot have ACTIVE demand lines (enforced by existing gate).
**Option B risks:** Lock on OPEN pool would operate on zero lines (always empty snapshot);
no semantic value. Introduces a dead path that misleads callers.

**Complexity:** Trivial — single `if` guard, consistent with createDemandLine pattern.
**Concurrency risk:** None — pool state read before any write; P2002 backstop handles
race between two concurrent lock calls.
**Testing impact:** Add test case for non-AGGREGATING pool states (3 unit tests: DRAFT, OPEN,
CLOSED_FOR_BIDS).

**Recommendation: Option A — AGGREGATING only.**
Prior decision records confirm this. OPEN pools cannot have ACTIVE lines.

**Blocks implementation?** No (confirmed by prior decision records).
**Implementation packet:** LOCK-SERVICE-001.

---

### D-3 — Eligible Demand Line Statuses: Which Lines Are Included in the Snapshot?

**Question:** Should `lockDemandLinesForRfq` include ACTIVE lines only, or also DRAFT lines?

**Repo-truth evidence:**
- Demand line statuses: DRAFT, ACTIVE, LOCKED_FOR_RFQ, SUPERSEDED, CANCELLED
- `DEMAND_LINE_STATUS` constant defined in service; ACTIVE is the "confirmed demand" state
- Prior decision record (`1022879`) confirms DRAFT = unconfirmed; ACTIVE = confirmed demand
- `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001` (D-6) establishes ACTIVE
  as the snapshot-eligible status class
- CANCELLED and SUPERSEDED lines are explicitly excluded from all forward-path operations

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | ACTIVE lines only; DRAFT, CANCELLED, SUPERSEDED excluded |
| B | ACTIVE + DRAFT lines |

**Option A risks:** DRAFT lines that have not been activated are excluded — this is correct.
A DRAFT line has not been confirmed for RFQ.
**Option B risks:** Including unconfirmed DRAFT lines in an RFQ snapshot creates supplier-facing
demand commitments on uncommitted intent. This is a data integrity risk.

**Complexity:** Trivial — `findMany({ where: { poolId, status: 'ACTIVE' } })`.
**Concurrency risk:** If a line transitions from DRAFT → ACTIVE concurrently with the lock,
the `$transaction` serialises the fetch; the line will either be included or excluded cleanly.
**Testing impact:** Test DRAFT-only pool → 422 NO_ACTIVE_LINES. Test mixed DRAFT+ACTIVE pool
→ only ACTIVE lines captured (2 unit tests).

**Recommendation: Option A — ACTIVE only.**
Prior decision records and demand-source governance confirm this.

**Blocks implementation?** No (confirmed by prior decision records).
**Implementation packet:** LOCK-SERVICE-001.

---

### D-4 — Capture Semantics: `expected_line_ids` Optional Field

**Question:** Should the lock request body include an optional `expected_line_ids` array
to allow the caller to assert which ACTIVE lines they expect to be included?

**Repo-truth evidence:**
- No `expected_line_ids` field or partial-selection logic exists anywhere in the codebase
- The lock action is the first operation requiring a "set-match" semantic
- `NetworkPoolDemandSnapshot.lineCount` field exists (INT, default 0) — populated at lock time
- Unique constraint `(poolId, snapshotVersion)` prevents double-lock on the same version
- The integration test harness (`pools.demandLines.integration.test.ts`) uses
  `z.object({...}).parse(payload)` validation — new field is addable without breaking changes

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | Optional `expected_line_ids: string[]` in request body; if provided, fetched ACTIVE IDs must match exactly → 422 `DEMAND_LINE_IDS_MISMATCH` if not |
| B | Lock all ACTIVE lines without caller assertion |

**Option A risks:**
- Slight body-schema complexity (uuid array validation)
- Caller must know line IDs — but they created the lines, so they do
- If caller omits field: behaves like Option B (lock all ACTIVE)

**Option B risks:**
- Race condition: lines added or removed between caller "list lines" and "call lock"
  are silently included/excluded with no feedback to the caller
- Caller cannot distinguish "locked what I expected" from "locked a different set"
- Undermines RFQ demand integrity

**Complexity:** Low — `z.array(z.string().uuid()).optional()` in Zod schema;
set-comparison is O(n) where n = number of ACTIVE lines (bounded, small for v1).
**Concurrency risk:** `expected_line_ids` is validated INSIDE the `$transaction` after
`findMany({ status: 'ACTIVE' })`. The set-comparison happens atomically. No TOCTOU risk.
**Testing impact:**
- Unit test: omit field → lock all ACTIVE (1 test)
- Unit test: provide matching IDs → lock those lines (1 test)
- Unit test: provide IDs that include unknown line → 422 (1 test)
- Unit test: provide IDs that miss an ACTIVE line → 422 (1 test)
- Unit test: provide empty array → 422 NO_ACTIVE_LINES (1 test)

**Recommendation: Option A — include `expected_line_ids` as optional.**
The phantom-line risk in Option B is a real RFQ integrity concern. The complexity is low.
When omitted, behavior is identical to Option B (backward-compatible for future route callers).

**Blocks implementation?** No.
**Implementation packet:** LOCK-SERVICE-001 (service logic), LOCK-ROUTE-001 (body schema).

---

### D-5 — Snapshot Status on Creation: CAPTURED vs. DRAFT

**Question:** Should the `NetworkPoolDemandSnapshot` record be written with `status = 'CAPTURED'`
directly, or written as `status = 'DRAFT'` and then updated to `'CAPTURED'`?

**Repo-truth evidence:**
- Schema: `status` field has `@default("DRAFT")` — DB-level default is DRAFT
- Schema: no Prisma enum for status — it is a free VARCHAR(50)
- The lock operation writes the snapshot INSIDE a `$transaction` that also updates demand
  line statuses to `LOCKED_FOR_RFQ`
- A DRAFT snapshot inside a committed transaction is semantically confusing — DRAFT implies
  the snapshot is not yet finalised, but the transaction makes it atomic
- No partial-snapshot upgrade path exists in the codebase

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | Set `status: 'CAPTURED'` explicitly on INSERT (override DB default) |
| B | Accept DB default DRAFT; update to CAPTURED in same transaction |

**Option A risks:** None — `status` is a VARCHAR; explicitly setting 'CAPTURED' is a simple
Prisma `create({ data: { status: 'CAPTURED' } })`.
**Option B risks:**
- Two writes for the same record inside one transaction (create + update)
- If the update step is skipped due to a code error, a committed DRAFT snapshot misleads
  any future reader about whether the lock completed
- DRAFT status on a committed snapshot is architecturally ambiguous

**Complexity:** Trivial — single-field override on INSERT.
**Concurrency risk:** None — atomic inside `$transaction`.
**Testing impact:** Assert `snapshot.status === 'CAPTURED'` in every successful lock test.

**Recommendation: Option A — set CAPTURED directly on INSERT.**
Single-write is cleaner and eliminates ambiguous intermediate state.

**Blocks implementation?** No.
**Implementation packet:** LOCK-SERVICE-001.

---

### D-6 — `snapshotRef` Generation Strategy

**Question:** Should `snapshotRef` be generated as a raw `randomUUID()` or as a structured
key (e.g., `SNAP-{poolRef}-{isoTimestamp}`)?

**Repo-truth evidence:**
- `snapshotRef` is a new field; no existing generation logic in any service
- `poolRef` is caller-supplied (`input.pool_ref.trim()`) — structured, human-readable
- `id` fields in all NC services are generated with `randomUUID()` from `'crypto'`
- `snapshotRef` type is `VarChar(100)` — UUID (36 chars) fits; a structured key with
  poolRef may approach or exceed 100 chars depending on poolRef length
- Unique constraint `(poolId, snapshotRef)` provides P2002 collision backstop
- The `NetworkPoolDemandSnapshot` table is an internal audit table — `snapshotRef`
  is not exposed in any current DTO

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | `snapshotRef: randomUUID()` — import from `'crypto'`; matches NC service layer convention |
| B | `snapshotRef: \`SNAP-${poolRef.slice(0, 20)}-${Date.now()}\`` — structured, human-readable |

**Option A risks:** UUID is not human-readable in DB queries; minor DX inconvenience for
direct DB inspection. Not a production concern.
**Option B risks:**
- `Date.now()` has millisecond precision; two concurrent locks in the same millisecond
  produce duplicate keys → P2002 → lock rejected (acceptable but avoidable)
- Truncating `poolRef` reduces but does not eliminate collision surface
- VARCHAR(100) constraint: `SNAP-` (5) + `poolRef.slice(0,20)` (20) + `-` (1) + timestamp ms (13) = 39 chars. Fits.
  But if poolRef contains special chars, the structured key becomes harder to query.
- Structured pattern is not used for any other audit-class ref in the codebase

**Complexity:** Trivial for either option.
**Concurrency risk:** Option B has theoretical collision on same millisecond. Option A has no
collision risk in practice (UUID v4 birthday paradox: 2^61 UUIDs before 50% collision).
**Testing impact:** Assert `snapshotRef` matches UUID pattern (regex) or specific structured
format in service unit tests.

**Recommendation: Option A — `randomUUID()` from `'crypto'`.**
Consistent with NC service layer convention. Zero collision risk. Fits VarChar(100).

**Blocks implementation?** No.
**Implementation packet:** LOCK-SERVICE-001.

---

### D-7 — Copy `metadataInternalJson` from Demand Line to Snapshot Line

**Question:** Should the lock service copy `metadataInternalJson` from each source
`NetworkPoolDemandLine` to its corresponding `NetworkPoolDemandSnapshotLine`?

**Repo-truth evidence:**
- `NetworkPoolDemandLine.metadataInternalJson` — JSONB, nullable
- `NetworkPoolDemandSnapshotLine.metadataInternalJson` — JSONB, nullable
- Neither field is exposed in any current route response (confirmed by DTO inspection)
- Snapshot lines are immutable records (`onDelete: Cascade`, no `updatedAt` field)
- The lock service reads each demand line to create its snapshot line counterpart;
  `metadataInternalJson` is available in the same `findMany` result

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | Copy `metadataInternalJson` from source demand line into snapshot line |
| B | Leave `metadataInternalJson` null in snapshot line |

**Option A risks:** Marginal write overhead (JSONB copy). No exposure risk — field is
internal-only in both source and destination.
**Option B risks:** Audit fidelity loss. If a demand line is later modified (e.g., in a
future update path), the snapshot line would not reflect what the demand looked like at
lock time. This defeats the audit purpose of the snapshot.

**Complexity:** Trivial — include in the `create({ data: { ...lineFields } })` call.
**Concurrency risk:** None — read inside `$transaction` guarantees point-in-time consistency.
**Testing impact:** Assert `snapshotLine.metadataInternalJson` equals source line's value
when non-null (1 unit test); assert null when source is null (1 unit test).

**Recommendation: Option A — copy `metadataInternalJson`.**
Snapshot lines exist for audit integrity. Omitting internal metadata undermines that purpose.
The field is never exposed in DTOs; there is no security risk.

**Blocks implementation?** No.
**Implementation packet:** LOCK-SERVICE-001.

---

### D-8 — `DemandLineSnapshotBlockedError`: Deprecate or Remove?

**Question:** Should `DemandLineSnapshotBlockedError` be removed from the service in the
lock packet, or retained with a `@deprecated` JSDoc?

**Repo-truth evidence:**
- `poolDemandLines.ts` (route): `import { DemandLineSnapshotBlockedError } from '../../services/networkPoolDemandLine.service.js'`
- `poolDemandLines.ts` (error mapper): `if (err instanceof DemandLineSnapshotBlockedError) reply.code(422).send(...)`
- Route file is NOT in the allowlist for LOCK-SERVICE-001 or LOCK-ROUTE-001 (different packet scopes)
- Removing the class without updating the route import would cause a runtime import error
  (TypeScript compile error + runtime `undefined` constructor reference)

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | Retain class with `@deprecated` JSDoc; do not remove until route-update packet |
| B | Remove class in lock service packet |

**Option A risks:** The deprecated class persists in the codebase temporarily. This is
intentional — it signals the class is slated for removal without breaking live imports.
**Option B risks:** Immediate TypeScript compile error in route file. Route build fails.
Requires route file edit in the same packet — which is out of scope for LOCK-SERVICE-001.

**Complexity:** Trivial — add one JSDoc comment.
**Concurrency risk:** N/A.
**Testing impact:** No change needed. Existing error-class tests (if any) remain valid.

**Recommendation: Option A — retain with `@deprecated` JSDoc.**
Route import is a hard constraint. Removal requires a future route-update packet that is
explicitly allowed to edit `poolDemandLines.ts`.

**Blocks implementation?** No.
**Implementation packet:** LOCK-SERVICE-001 (add `@deprecated`). Future route-update packet
for removal.

---

### D-9 — RFQ Sub-Flag Gate: Separate Packet vs. Merge into Lock Route Packet

**Question:** Should `ncPoolRfqFeatureGateMiddleware` (gate key `nc.procurement_pools.rfq.enabled`)
be implemented in a dedicated packet (FEATURE-SUBFLAG-GATE-001) or merged into the lock
route packet (LOCK-ROUTE-001)?

**Repo-truth evidence:**
- `nc.procurement_pools.rfq` — 0 matches in `server/src/**` (confirmed: sub-flag does not exist)
- `ncPoolFeatureGate.middleware.ts` — complete two-layer implementation confirmed; RFQ clone
  requires ~70 lines, one new file: `ncPoolRfqFeatureGate.middleware.ts`
- TECS atomicity doctrine: one prompt = one atomic commit
- The sub-flag middleware is independently testable and independently deployable
- `LOCK-ROUTE-001` adds a new route (`POST /pools/:poolId/demand-lines/lock`); merging
  a new middleware file increases its diff from ~80 to ~150 lines

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | Separate packet: TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-SUBFLAG-GATE-001 |
| B | Merge into LOCK-ROUTE-001 |

**Option A risks:** One extra commit, one extra review cycle. Minor governance overhead.
**Option B risks:**
- Violates TECS atomicity doctrine (two concerns in one packet: middleware + route)
- Sub-flag gate tests become entangled with route tests
- If sub-flag gate needs revision, LOCK-ROUTE-001 must be partially re-opened

**Complexity:** Sub-flag middleware is ~70 lines (clone of ncPoolFeatureGate.middleware.ts).
Either option is straightforward.
**Concurrency risk:** N/A.
**Testing impact:** Sub-flag gate unit tests are ~10 tests (global flag missing, global disabled,
tenant override missing, tenant override disabled, both enabled). These are cleanly separated
as a unit test file for the middleware file.

**Recommendation: Option A — separate packet (FEATURE-SUBFLAG-GATE-001).**
TECS atomicity. Independent testability. Consistent with how ncPoolFeatureGate was shipped.

**Blocks implementation?** No.
**Implementation packet:** TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-SUBFLAG-GATE-001.

---

### D-10 — Lock Response Shape: Snapshot Header Only vs. Header + Full Lines

**Question:** Should `POST /pools/:poolId/demand-lines/lock` return the snapshot header record
only, or the snapshot header plus all captured snapshot lines?

**Repo-truth evidence:**
- Existing route responses in `poolDemandLines.ts` return flat header objects (no nested arrays)
- `createDemandLine` response: flat `DemandLineRecord` (single line, no nested objects)
- `listDemandLines` response: `{ success: true, data: DemandLineRecord[] }` (no pagination yet)
- Snapshot lines can be many (one per ACTIVE demand line); embedding them in the lock
  response couples the lock action to a potentially large payload
- `NetworkPoolDemandSnapshotLine` has 20+ fields; a full-lines response for a pool with
  100 ACTIVE lines would be a ~200 KB JSON payload
- No existing route returns nested arrays of >5 fields per item

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | Snapshot header only: `{ id, snapshotRef, snapshotVersion, status, lineCount, capturedAt, capturedByUserId }` |
| B | Snapshot header + full lines array: `{ ...header, lines: [...snapshotLines] }` |

**Option A risks:** Caller must make a second request to retrieve snapshot lines if needed.
No such "GET snapshot lines" route exists yet — but the snapshot is an internal audit record
and callers in v1 only need the header to confirm the lock succeeded.
**Option B risks:**
- Lock response payload scales linearly with line count (unbounded in theory)
- Couples lock action to a full snapshot-read; if snapshot-lines query is slow, lock
  response latency increases
- Inflates the Fastify route response schema significantly

**Complexity:** Option A is simpler (return `pick(snapshotHeader, [...])`).
Option B requires including the `include: { snapshotLines: true }` in the Prisma create
and serialising each line.
**Concurrency risk:** N/A.
**Testing impact:** Assert response shape matches header-only contract (3 unit tests).

**Recommendation: Option A — snapshot header only.**
Consistent with existing route pattern. Lock is an action, not a query. Callers receive
the snapshot ID and version to confirm success; lines are retrievable via a future GET.

**Blocks implementation?** No.
**Implementation packet:** LOCK-ROUTE-001 (response schema + Fastify reply).

---

### D-11 — HTTP Response Code: 201 Created vs. 200 OK

**Question:** Should `POST /pools/:poolId/demand-lines/lock` return `201 Created` or `200 OK`?

**Repo-truth evidence:**
- `POST /pools/:poolId/demand-lines` (create): returns `201` (confirmed in route handler)
- `POST /pools/:poolId/demand-lines/:lineId/cancel` (cancel): returns `200` (action, no new resource)
- `POST /pools/:poolId/demand-lines/lock` creates one `NetworkPoolDemandSnapshot` record
  and N `NetworkPoolDemandSnapshotLine` records — it is a resource-creating action
- HTTP semantics: 201 = "a new resource was created"; 200 = "request succeeded, no new resource"

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | `201 Created` |
| B | `200 OK` |

**Option A risks:** None — lock creates a `NetworkPoolDemandSnapshot` resource. 201 is semantically correct.
**Option B risks:** Inconsistent with `createDemandLine` (201). The lock action creates a
snapshot resource, so 200 would misrepresent the outcome.

**Complexity:** Trivial — `reply.code(201).send(...)`.
**Concurrency risk:** N/A.
**Testing impact:** Assert `res.statusCode === 201` in every successful lock test.

**Recommendation: Option A — 201 Created.**
The lock action creates a new `NetworkPoolDemandSnapshot` resource. 201 is semantically correct
and consistent with `createDemandLine`.

**Blocks implementation?** No.
**Implementation packet:** LOCK-ROUTE-001.

---

### D-12 — Pool Lifecycle Coupling: AGGREGATING → CLOSED_FOR_BIDS in First Lock Packet?

**Question:** Should `lockDemandLinesForRfq` also trigger `AGGREGATING → CLOSED_FOR_BIDS`
pool state transition in the first implementation packet?

**Repo-truth evidence:**
- Prior decision record `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001`
  (commit `8878305`, D-8) explicitly deferred the pool lifecycle coupling to a separate packet
- `StateMachineService.transition()` is the exclusive pool state mutation path
- `AGGREGATING → CLOSED_FOR_BIDS` requires calling `stateMachine.transition()` with
  `{ entityType: 'POOL', entityId, fromStateKey: 'AGGREGATING', toStateKey: 'CLOSED_FOR_BIDS' }`
- The `StateMachineService` constructor requires `db` + optional dependencies; injecting it
  into `NetworkPoolDemandLineService` adds a dependency not present today
- The `LOCK-SERVICE-001` allowlist would need to include `stateMachine.service.ts` wiring —
  a scope expansion not intended in the current design

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | No pool state transition in first lock packet; deferred to RFQ-issuance packet |
| B | Include AGGREGATING → CLOSED_FOR_BIDS in LOCK-SERVICE-001 |

**Option A risks:** Pool remains in AGGREGATING after demand lines are locked. This is a
deliberate intermediate state — the pool is locked for RFQ but the RFQ has not yet been issued.
**Option B risks:**
- Scope expansion: `StateMachineService` injection into `NetworkPoolDemandLineService`
- NetworkLifecycleLog write triggered (which conflicts with D-13 recommendation)
- Coupled rollback: if the state transition fails after snapshot creation, partial lock state
- Prior decision record (D-8, `8878305`) explicitly deferred this

**Complexity:** Option A is simpler and within defined packet scope.
Option B adds ~30 lines of StateMachineService wiring and dependency injection.
**Concurrency risk:** Option B adds a state-transition inside the lock `$transaction`,
increasing the transaction duration and deadlock surface.
**Testing impact:** Option A: no change. Option B: requires StateMachineService mock in
all lock service tests.

**Recommendation: Option A — no pool state transition in first lock packet.**
Prior decision record and current packet scope definition both confirm this.

**Blocks implementation?** No (confirmed by prior decision records).
**Implementation packet:** Future LOCK-RFQ-ISSUANCE-001 packet (not yet designed).

---

### D-13 — `NetworkLifecycleLog` Write During Lock Action

**Question:** Should `lockDemandLinesForRfq` write a `NetworkLifecycleLog` entry to record
the lock event for audit purposes?

**Repo-truth evidence:**
- `NetworkLifecycleLog` is exclusively written by `StateMachineService.transition()` —
  confirmed by 18 grep matches; all non-test writes originate in `stateMachine.service.ts`
- `StateMachineService` only dispatches to `networkLifecycleLog` for entity types POOL,
  SYNDICATE, and VCO_CHAIN — and only when a state transition occurs
- DB-level immutability trigger on `network_lifecycle_logs` (confirmed live, commit `6174d31`)
- Writing to `NetworkLifecycleLog` outside `StateMachineService.transition()` would violate
  the architectural pattern and the intent of the immutability trigger
- The `DemandLineStatusTransition` model (future addition) is the correct audit trail for
  individual line status changes (ACTIVE → LOCKED_FOR_RFQ)
- The `NetworkPoolDemandSnapshot` record itself is the audit trail for the lock event

**Options:**

| Option | Description |
|---|---|
| **A (Recommended)** | No `NetworkLifecycleLog` write; lock audit trail = snapshot record + (future) DemandLineStatusTransition |
| B | Write a `NetworkLifecycleLog` entry with `fromStateKey: 'AGGREGATING'` and `toStateKey: 'LOCKED_FOR_RFQ'` |

**Option A risks:** The lock event is not in the lifecycle log. However, the snapshot record
(`capturedAt`, `capturedByUserId`, `capturedReason`) provides an equivalent audit trail.
**Option B risks:**
- Violates the architectural invariant: NetworkLifecycleLog entries represent state transitions;
  the lock action does not advance the pool state
- The entity type for a demand-line lock would need to be a new type (e.g., 'DEMAND_LINE_SNAPSHOT')
  not currently in the `LOGGABLE_ENTITY_TYPES` list — requires StateMachineService modification
  (out of scope)
- The DB immutability trigger makes any erroneous write to this table irreversible

**Complexity:** Option A: no additional code. Option B: StateMachineService modification,
out-of-scope schema concern, immutability risk.
**Concurrency risk:** Option B writes to an immutable table inside a transaction; if the
transaction rolls back, the log entry is rolled back — but StateMachineService is not designed
for this pattern.
**Testing impact:** Option A: no change. Option B: requires StateMachineService mock and
lifecycle log write assertion in all lock tests.

**Recommendation: Option A — no `NetworkLifecycleLog` write.**
The snapshot record is the authoritative audit trail for the lock event.
NetworkLifecycleLog is a state-transition log, not a general event log.

**Blocks implementation?** No.
**Implementation packet:** Confirmed no-op in LOCK-SERVICE-001.

---

### D-14 — Implementation Packet Sequence

**Question:** What is the correct sequence of implementation packets for the lock feature?

**Repo-truth evidence:**
- LOCK-DESIGN-001 §14 (recommended sequence) and §19 (D-14) both propose a 5-packet sequence
- The RFQ sub-flag middleware (D-9) is a prerequisite for the lock route (LOCK-ROUTE-001)
  because the route must register it as a `preHandler`
- The lock service (LOCK-SERVICE-001) is a prerequisite for the lock route (LOCK-ROUTE-001)
  because the route calls `service.lockDemandLinesForRfq()`
- The decision record (LOCK-DECISION-RECORD-001) is a prerequisite for all implementation
  packets — it authorises them
- The verify + gov-close packet (LOCK-VERIFY-GOV-CLOSE-001) must be last

**Recommended sequence (confirmed):**

| Step | Packet | Allowlist | Commit message |
|---|---|---|---|
| 1 | `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001` | governance/…DECISION-RECORD-001.md (NEW) | `docs(network-commerce): record demand line lock decisions` |
| 2 | `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-SERVICE-001` | networkPoolDemandLine.service.ts, networkPoolDemandLine.service.unit.test.ts | `feat(network-commerce): implement lockDemandLinesForRfq service` |
| 3 | `TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-SUBFLAG-GATE-001` | ncPoolRfqFeatureGate.middleware.ts (NEW), ncPoolRfqFeatureGate.middleware.unit.test.ts (NEW) | `feat(network-commerce): add RFQ sub-flag feature gate middleware` |
| 4 | `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-ROUTE-001` | poolDemandLines.ts, pools.demandLines.integration.test.ts | `feat(network-commerce): add lock demand lines for RFQ route` |
| 5 | `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-PROD-VERIFY-GOV-CLOSE-001` | governance/…VERIFY-GOV-CLOSE-001.md (NEW), governance/control/* | `docs(network-commerce): verify demand line lock and close governance` |

**Merge option (if Paresh prefers):** Steps 3 and 4 may be merged (sub-flag gate + lock
route in one packet). This reduces the commit count from 5 to 4 but increases diff size
of the route packet from ~80 to ~150 lines. Paresh decision required (see D-9).

**Blocks implementation?** No (sequence is clear).
**Implementation packet:** Starts at LOCK-DECISION-RECORD-001.

---

## 5. Recommended Decision Set

Summary of all 14 decisions with recommended resolutions confirmed by repo-truth.

| # | Decision | Recommended Resolution | Confidence | Prior auth? |
|---|---|---|---|---|
| D-1 | Lock ownership | OWNER + ADMIN only; MEMBER → 403 | HIGH | Established by route pattern |
| D-2 | Pool state gate | AGGREGATING only | HIGH | Confirmed by prior decision record |
| D-3 | Eligible line statuses | ACTIVE only | HIGH | Confirmed by prior decision record |
| D-4 | `expected_line_ids` | Include as optional; omit = lock all ACTIVE | HIGH | New design; low risk |
| D-5 | Snapshot status on CREATE | Set `CAPTURED` explicitly on INSERT | HIGH | Single-write atomicity |
| D-6 | `snapshotRef` generation | `randomUUID()` from `'crypto'` | HIGH | Consistent with NC service pattern |
| D-7 | Copy `metadataInternalJson` | Yes — copy from demand line; never expose in DTO | HIGH | Audit fidelity |
| D-8 | `DemandLineSnapshotBlockedError` | Retain with `@deprecated` JSDoc | HIGH | Route import is a hard constraint |
| D-9 | RFQ sub-flag gate | Separate packet (FEATURE-SUBFLAG-GATE-001) | HIGH | TECS atomicity doctrine |
| D-10 | Lock response shape | Snapshot header only | HIGH | Consistent with route pattern |
| D-11 | HTTP response code | 201 Created | HIGH | Resource creation; consistent with createDemandLine |
| D-12 | Pool lifecycle coupling | No AGGREGATING → CLOSED_FOR_BIDS in first packet | HIGH | Confirmed by prior decision record |
| D-13 | `NetworkLifecycleLog` write | No write; snapshot is the audit trail | HIGH | Architecture invariant confirmed |
| D-14 | Implementation sequence | DECISION-RECORD → LOCK-SERVICE → SUBFLAG-GATE → LOCK-ROUTE → VERIFY-GOV-CLOSE | HIGH | All prerequisites confirmed |

---

## 6. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Concurrent lock calls: two callers lock the same pool simultaneously | MEDIUM | `$transaction` serialises reads; unique constraint `(poolId, snapshotVersion)` → P2002 → `DemandLineLockConflictError` → 409 |
| Race between line creation and lock: ACTIVE line added after snapshot read | LOW | `$transaction` ensures atomic snapshot of ACTIVE lines; `expected_line_ids` (D-4) allows caller to assert expected set |
| Snapshot lines with `onDelete: Restrict` on `demandLineId` block test cleanup | MEDIUM | Test cleanup must delete `networkPoolDemandSnapshotLine` before `networkPoolDemandLine` (see Q-7) |
| Snapshot `status` left as DRAFT if service code omits explicit set | LOW | Set `status: 'CAPTURED'` explicitly in service — do not rely on DB default (D-5) |
| `DemandLineSnapshotBlockedError` import breaks if class is removed without route update | HIGH | Retain with `@deprecated` JSDoc until route-update packet (D-8) |
| `snapshotVersion` collision under concurrent lock | LOW | Unique constraint P2002 backstop; `snapshotVersion` should be set to `COUNT(existing_snapshots_for_pool) + 1` inside `$transaction` or to a sequence value |
| `metadataInternalJson` accidentally exposed in DTO | LOW | Confirm DTO serialiser excludes `metadataInternalJson` from all response shapes (D-7) |
| `nc.procurement_pools.rfq` gate not registered on lock route | MEDIUM | LOCK-ROUTE-001 must register `ncPoolRfqFeatureGateMiddleware` as `preHandler` before route handler |
| `NetworkLifecycleLog` written outside `StateMachineService` (accidental) | HIGH | Do not call `db.networkLifecycleLog.create()` anywhere in lock service (D-13); review code strictly |

---

## 7. Paresh Approvals Required

The following decisions require Paresh review and explicit approval in the
LOCK-DECISION-RECORD-001 artifact before any implementation packet is opened:

| # | Decision | Why Paresh approval needed |
|---|---|---|
| D-4 | `expected_line_ids` optional field | New API contract; changes request body schema for lock route |
| D-6 | `snapshotRef` generation as `randomUUID()` | Design choice for internal audit ref format |
| D-9 | Separate FEATURE-SUBFLAG-GATE-001 vs. merge into LOCK-ROUTE-001 | Affects number of commits and packet scope |
| D-10 | Snapshot header only vs. header + lines | Affects client contract for lock response |
| D-11 | 201 Created vs. 200 OK | HTTP contract decision |

Decisions D-1, D-2, D-3, D-5, D-7, D-8, D-12, D-13, D-14 are confirmed by repo-truth
evidence or prior authoritative decision records. They require acknowledgement (not fresh
approval) in the decision record.

---

## 8. Implementation Block Status

**Implementation is NOT blocked by any technical unknown.**

All technical questions have been resolved by direct repo-truth inspection:
- `$transaction` pattern: confirmed, safe, consistent
- `FOR UPDATE` alternative: unique constraint P2002 backstop confirmed
- `NetworkLifecycleLog` scope: state-transition-only confirmed
- `randomUUID` import: `'crypto'` from `networkPool.service.ts` confirmed
- `snapshotRef` generation: service-generated, no structured pattern conflict
- Sub-flag existence: confirmed absent; separate packet required
- Test cleanup pattern: confirmed; snapshot table cleanup must be added

**Implementation is blocked ONLY by the missing decision record.**
Once LOCK-DECISION-RECORD-001 is committed (Paresh approval), LOCK-SERVICE-001 may open.

---

## 9. Recommended Next Packet

```
TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001
```

**Scope:** Paresh reviews this audit artifact, approves decisions D-1 through D-14,
and records them in a closed decision record. No implementation authorized.

**Allowlist (Modify):**
```
governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001.md  (NEW)
```

**Read-only (allowed but not modified):**
```
governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001.md
governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-AUDIT-001.md
governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001.md
governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001.md
```

**Commit message:**
```
docs(network-commerce): record demand line lock decisions
```

**This packet does not authorize service implementation, routes, schema changes, migrations,
tests, UI, RFQ schema, supplier routes, or governance control active-state changes.**

---

## Appendix A — Design Chain State at Audit Time

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
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001 | 3c27713 | CLOSED |
| **TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-AUDIT-001** | *this commit* | **AUDIT** |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001 | — | HOLD_FOR_PARESH_DECISION |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-SERVICE-001 | — | NOT AUTHORIZED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-SUBFLAG-GATE-001 | — | NOT AUTHORIZED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-ROUTE-001 | — | NOT AUTHORIZED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-PROD-VERIFY-GOV-CLOSE-001 | — | NOT AUTHORIZED |
