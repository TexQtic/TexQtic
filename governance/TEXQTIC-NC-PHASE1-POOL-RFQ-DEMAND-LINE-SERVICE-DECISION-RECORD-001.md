# TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001
## Network Commerce Pool RFQ — Demand-Line Service and Route Decision Record

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001
Status: DECISION RECORD CLOSED — SERVICE FOUNDATION AUTHORIZED NEXT
Type: TECS bounded decision-record packet
Date: 2026-05-07
Decision authority: Paresh Patel

Implementation gate:
- This packet records approved decisions for demand-line service and route design only.
- This packet does not authorize service implementation, route implementation, schema changes,
  migrations, tests, UI, RFQ schema, supplier routes, allocation, order placement,
  invoice generation, settlement, escrow, MakerChecker changes, lock-for-RFQ implementation,
  demand snapshot implementation, or governance control active-state changes.

---

## 1. Authority and Inputs

Decision authority: Paresh Patel (pool owner / platform operator)

Upstream design artifact:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DESIGN-001.md
  Commit: b549543

Prior decision chain:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001.md         (commit 961a2c1)
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001.md (commit 8878305)
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-FOUNDATION-001.md (commit 7197e23)
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-DEPLOY-VERIFY-001.md (commit 3692a14)
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-GOV-SYNC-001.md  (commit 045d576)

Governance sequencing references:
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md

Lineage commits confirmed:
- b549543 (demand-line service design)
- 045d576 (demand-line schema governance sync)
- 3692a14 (demand-line schema deploy + verify)
- 7197e23 (demand-line schema foundation)
- 8878305 (demand-source decision record)
- 961a2c1 (demand-source design)

---

## 2. Scope Reminder

This packet selects and records Paresh-approved decisions from Section 13 of the service
design artifact. It does NOT authorize any of the following:

| Domain | Status |
|---|---|
| Service implementation (create/update/list/cancel) | BLOCKED — requires SERVICE-FOUNDATION-001 prompt |
| Route implementation | BLOCKED — requires ROUTE-001 prompt |
| Schema changes / migrations | NOT AUTHORIZED |
| Tests (unit or integration) | NOT AUTHORIZED in this packet |
| lockDemandLinesForRfq service method | BLOCKED — snapshot schema prerequisite unmet |
| NetworkPoolDemandSnapshot schema | BLOCKED — requires SNAPSHOT-SCHEMA-001 prompt |
| RFQ schema / RFQ routes | NOT AUTHORIZED |
| Member or supplier demand-line routes | NOT AUTHORIZED |
| Allocation / order / invoice / settlement / escrow | NOT AUTHORIZED |
| MakerChecker changes | NOT AUTHORIZED |
| UI changes | NOT AUTHORIZED |
| Governance control active-state changes | NOT AUTHORIZED |

---

## 3. Repo-Truth Acknowledgements at Decision Time

The following facts from the design artifact are acknowledged as authoritative repo truth
at the time these decisions were made:

1. `NetworkPoolDemandLine` schema is deployed to the remote Supabase database and verified.
   Migration: `20260524000000_nc_pool_demand_line_schema`
   Prisma ledger entry: marked applied.

2. `NetworkPoolDemandSnapshot` does NOT exist in `server/prisma/schema.prisma`.
   Grep for `Snapshot|snapshot|demand_snapshot` found only `ttp_score_snapshots` (unrelated).
   Lock-for-RFQ is therefore BLOCKED.

3. Pool lifecycle has 19 states confirmed from migration seed:
   DRAFT, OPEN, AGGREGATING, CLOSED_FOR_BIDS, QUOTED, ACCEPTED, ALLOCATING, ALLOCATED,
   ORDERED, IN_FULFILMENT, PARTIALLY_DELIVERED, DELIVERED, SETTLEMENT_PENDING, SETTLED,
   REJECTED, WITHDRAWN, CANCELLED.

4. Service methods create/update/list/cancel have no schema blockers.
   They can be implemented without any schema changes or migrations.

5. `org_id` authority: `dbContext.orgId` (JWT). Never from request body (D-017-A).

6. `metadata_internal_json` is present in the DB schema but must not be surfaced in default
   owner API DTOs without explicit hardening authorization.

7. `ncPoolRfqFeatureGateMiddleware` does not exist in the repo at decision time.
   It is designed in the service design artifact; its implementation belongs in the lock packet.

---

## 4. Recorded Decisions

### Decision 1 — Demand line creation status

**Selected:** Option A — newly created demand lines default to `DRAFT`.

**Recorded decision:**
- Demand lines MUST be created with `status = 'DRAFT'` by default.
- DRAFT provides a review/preparation step before a line is considered RFQ-ready.
- ACTIVE transition / activation step is NOT part of the first service foundation unless
  separately authorized by a dedicated prompt.
- The service foundation packet may implement DRAFT line creation only.
- No activation endpoint is authorized in the first implementation packet.

**Rationale:**
Consistent with pool creation at DRAFT state. Owners need a preparation phase before
lines are treated as ready for RFQ aggregation.

**Impact on SERVICE-FOUNDATION-001:**
- `createDemandLine` must set `status: 'DRAFT'` unconditionally.
- No `status` field in create input accepted from caller.

---

### Decision 2 — Packet granularity: service-only vs. service + route together

**Selected:** Option A — service-only packet first, then route packet.

**Recorded decision:**
- The next implementation packet (SERVICE-FOUNDATION-001) must implement the service layer only.
- No routes may be implemented in SERVICE-FOUNDATION-001.
- Route implementation follows in a separate packet (ROUTE-001) after service validation.
- This preserves atomic diff discipline and keeps test surface narrow per packet.

**Implementation sequence consequence:**
1. SERVICE-FOUNDATION-001 — service + unit tests only
2. ROUTE-001 — route plugin + integration tests only
These are two distinct prompted delivery units.

---

### Decision 3 — `metadata_internal_json` exposure

**Selected:** Option A — omit `metadata_internal_json` from default API and service DTOs.

**Recorded decision:**
- `metadata_internal_json` is internal operational metadata.
- It MUST NOT be included in the default `DemandLineRecord` returned by service methods or
  API routes.
- Any future exposure of `metadata_internal_json` to API consumers requires a separate
  authorized hardening/management decision packet.
- Service foundation must serialize the `DemandLineRecord` type without this field.

**DTO impact:**
The `DemandLineRecord` output type must include all `NetworkPoolDemandLine` fields
EXCEPT `metadataInternalJson`.

---

### Decision 4 — Lock-for-RFQ prerequisite

**Selected:** Option A — lock-for-RFQ is blocked until snapshot schema is closed.

**Recorded decision:**
- `lockDemandLinesForRfq` MUST NOT be implemented until both of the following exist in
  `server/prisma/schema.prisma` and are deployed:
  - `NetworkPoolDemandSnapshot` table
  - `NetworkPoolDemandSnapshotLine` table
- Implementing lock without snapshot is **FORBIDDEN**. It would violate the immutable snapshot
  policy (Decision 6 of DEMAND-SOURCE-DECISION-RECORD-001): demand state at RFQ issue must be
  immutably recorded.
- The lock service method design is documented in Section 4G of SERVICE-DESIGN-001 for
  reference only; it MUST NOT be coded until the prerequisite is closed.

**Prerequisite packet:**
```
TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001
```
That packet must deliver:
- `NetworkPoolDemandSnapshot` schema (header record)
- `NetworkPoolDemandSnapshotLine` schema (per-line snapshot records)
- Migration SQL + `prisma db pull` + `prisma generate`

**Lock packet may only open after snapshot schema packet is CLOSED.**

---

### Decision 5 — Pool state gate for demand-line create/edit/cancel

**Selected:** Option A — DRAFT, OPEN, and AGGREGATING pools allow demand-line writes.

**Recorded decision:**
- Owners may create, update, and cancel demand lines while the pool is in `DRAFT` state.
- Pre-population of lines before pool is opened is explicitly permitted.
- Demand-line writes remain allowed in `OPEN` and `AGGREGATING` states.
- Demand-line writes are BLOCKED from `CLOSED_FOR_BIDS` onward (including all terminal states:
  `QUOTED`, `ACCEPTED`, `ALLOCATING`, `ALLOCATED`, `ORDERED`, `IN_FULFILMENT`,
  `PARTIALLY_DELIVERED`, `DELIVERED`, `SETTLEMENT_PENDING`, `SETTLED`, `REJECTED`,
  `WITHDRAWN`, `CANCELLED`).

**State gate table:**

| Pool Status | Demand-line create allowed | Demand-line update allowed | Demand-line cancel allowed |
|---|---|---|---|
| `DRAFT` | ✅ | ✅ | ✅ |
| `OPEN` | ✅ | ✅ | ✅ |
| `AGGREGATING` | ✅ | ✅ | ✅ |
| `CLOSED_FOR_BIDS` | ❌ | ❌ | ❌ |
| `QUOTED` | ❌ | ❌ | ❌ |
| `ACCEPTED` | ❌ | ❌ | ❌ |
| `ALLOCATING` | ❌ | ❌ | ❌ |
| `ALLOCATED` | ❌ | ❌ | ❌ |
| `ORDERED` | ❌ | ❌ | ❌ |
| `IN_FULFILMENT` | ❌ | ❌ | ❌ |
| `PARTIALLY_DELIVERED` | ❌ | ❌ | ❌ |
| `DELIVERED` | ❌ | ❌ | ❌ |
| `SETTLEMENT_PENDING` | ❌ | ❌ | ❌ |
| `SETTLED` | ❌ (terminal) | ❌ (terminal) | ❌ (terminal) |
| `REJECTED` | ❌ (terminal) | ❌ (terminal) | ❌ (terminal) |
| `WITHDRAWN` | ❌ (terminal) | ❌ (terminal) | ❌ (terminal) |
| `CANCELLED` | ❌ (terminal) | ❌ (terminal) | ❌ (terminal) |

**Error class consequence:**
Pool state gate failure → `DemandLinePoolStateError` → HTTP 422 `INVALID_STATE`.

---

### Decision 6 — Lock coupling to pool lifecycle transition

**Selected:** Option A — standalone lock-for-RFQ action first.

**Recorded decision:**
- Lock-for-RFQ is a standalone explicit API action in the first lock packet:
  `POST /:poolId/demand-lines/lock-for-rfq`
- The pool MUST be in `AGGREGATING` state for lock to proceed.
- Coupling lock to the `AGGREGATING → CLOSED_FOR_BIDS` pool lifecycle transition is
  DEFERRED. It may be considered in a later architectural decision packet.
- In the first lock implementation, the pool lifecycle transition (AGGREGATING → CLOSED_FOR_BIDS)
  is NOT triggered automatically by the lock action. Pool state management remains under
  the existing pool lifecycle methods.

**Future consideration note:**
The `AGGREGATING → CLOSED_FOR_BIDS` transition coupling is a natural evolution but requires
its own design packet given pool state machine complexity. It is not in scope for the lock packet.

---

### Decision 7 — Route file structure

**Selected:** Option A — separate `poolDemandLines.ts` route plugin.

**Recorded decision:**
- Demand-line routes MUST live in a separate tenant route plugin file:
  `server/src/routes/tenant/poolDemandLines.ts`
- The existing `server/src/routes/tenant/pools.ts` MUST NOT be expanded with demand-line
  route implementation unless repo truth explicitly requires merging.
- Static routes MUST be registered before parameterized routes within the plugin to prevent
  Fastify path matching errors (e.g., `POST /:poolId/demand-lines/cancel/:lineId` must be
  registered before `PATCH /:poolId/demand-lines/:lineId` to avoid `:lineId` matching `cancel`).
- The plugin will be registered under: `/api/tenant/network-commerce/pools`
  (or a sub-prefix under the same pool resource namespace, consistent with existing pools.ts).

**Route file allowlist consequence for ROUTE-001:**
```
server/src/routes/tenant/poolDemandLines.ts           (NEW)
server/src/routes/tenant/pools.demandLines.integration.test.ts  (NEW)
[tenant router registration file]                      (MODIFY — add plugin registration)
```

---

### Decision 8 — `listDemandLines` pool existence behavior

**Selected:** Option A — explicit pool existence check with 404.

**Recorded decision:**
- `listDemandLines` MUST verify that the target pool exists AND belongs to the caller's `org_id`.
- If the pool is absent or belongs to a different org:
  - Return `DemandLinePoolNotFoundError` → HTTP 404 `POOL_NOT_FOUND`
  - Do NOT silently return an empty list.
- Non-leak behavior is preserved: a wrong-org pool is indistinguishable from an absent pool
  (both produce identical 404 responses).
- This is consistent with the `getNetworkPoolById` pattern in `networkPool.service.ts` which
  uses `findFirst({ where: { id, orgId } })` and throws `NetworkPoolNotFoundError` on null.

**Service method consequence:**
```typescript
// listDemandLines — pool existence guard
const pool = await this.db.networkPool.findFirst({
  where: { id: poolId, orgId },
  select: { id: true },
});
if (!pool) throw new DemandLinePoolNotFoundError(poolId);
```

---

## 5. Implementation Boundary

### 5A. Next authorized packet

```
TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001
```

**What this packet may implement:**
- `server/src/services/networkPoolDemandLine.service.ts` (NEW file)
- `server/src/__tests__/networkPoolDemandLine.service.unit.test.ts` (NEW file)

**Authorized service methods:**
| Method | Authorized | Notes |
|---|---|---|
| `createDemandLine` | ✅ | Status = DRAFT; pool state gate; org_id from dbContext |
| `updateDemandLine` | ✅ | Line status gate (DRAFT/ACTIVE only); org_id check |
| `listDemandLines` | ✅ | Pool existence check (Decision 8); pagination |
| `cancelDemandLine` | ✅ | Line status gate (DRAFT/ACTIVE only); org_id check |
| `lockDemandLinesForRfq` | ❌ BLOCKED | Snapshot schema prerequisite unmet |

**What SERVICE-FOUNDATION-001 must NOT implement:**
- Routes of any kind
- `lockDemandLinesForRfq`
- Demand snapshot schema or models
- RFQ schema / RFQ routes
- Member or supplier demand-line paths
- Allocation, order, invoice, settlement, escrow
- UI components
- MakerChecker changes
- Feature gate middleware (`ncPoolRfqFeatureGateMiddleware`)

### 5B. Forbidden scope (permanent for this decision record)

The following items are forbidden from ALL packets until separately authorized:

| Item | Why blocked |
|---|---|
| `lockDemandLinesForRfq` | Requires `NetworkPoolDemandSnapshot` schema — absent |
| Member demand-line creation routes | Decision 1 of DEMAND-SOURCE-DECISION-RECORD-001 — owner-only |
| Supplier demand-line read routes | Not in scope for Phase 1 first implementation |
| `metadata_internal_json` in API DTO | Decision 3 above — internal only |
| `AGGREGATING → CLOSED_FOR_BIDS` auto-transition on lock | Decision 6 above — deferred |

---

## 6. Authorized Implementation Sequence

```
[CLOSED] TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DESIGN-001         (b549543)
         ↓
[THIS]   TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001
         ↓
[NEXT]   TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001
         Service methods: createDemandLine, updateDemandLine,
                          listDemandLines, cancelDemandLine
         Unit tests for all four methods.
         No routes. No schema changes. No migrations.
         Allowlist:
           server/src/services/networkPoolDemandLine.service.ts  (NEW)
           server/src/__tests__/networkPoolDemandLine.service.unit.test.ts  (NEW)
         ↓
         TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-001
         Route plugin: GET list, POST create, PATCH update, POST cancel
         Integration tests (4 routes, no lock)
         Allowlist:
           server/src/routes/tenant/poolDemandLines.ts  (NEW)
           server/src/routes/tenant/pools.demandLines.integration.test.ts  (NEW)
           [tenant router registration file]  (MODIFY)
         ↓
         TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001   ← BLOCKED DEPENDENCY
         Design + implement NetworkPoolDemandSnapshot +
         NetworkPoolDemandSnapshotLine schema.
         Migration SQL + prisma db pull + prisma generate.
         ↓
         TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-001
         lockDemandLinesForRfq service method
         ncPoolRfqFeatureGateMiddleware  (NEW)
         Lock-for-RFQ route: POST /:poolId/demand-lines/lock-for-rfq
         Integration tests for lock route
```

**Note:** SERVICE-FOUNDATION-001 and ROUTE-001 may be merged at Paresh discretion if scope
is acceptable. Recommend keeping separate for atomic diff discipline per Decision 2 above.

---

## 7. Pattern References (carry-forward to SERVICE-FOUNDATION-001)

These patterns were confirmed during SERVICE-DESIGN-001 repo inspection and must be followed
in the implementation packets:

### 7A. Error class pattern
```typescript
export class DemandLineNotFoundError extends Error {
  constructor(lineId: string) {
    super(`Demand line not found: ${lineId}`);
    this.name = 'DemandLineNotFoundError';
  }
}
```
Every error class must set `this.name` to its own class name.

### 7B. Service constructor pattern
```typescript
constructor(private readonly db: PrismaClient) {}
```
No StateMachineService needed for demand-line service foundation
(no pool lifecycle state transitions in create/update/list/cancel).

### 7C. Atomic transaction pattern
```typescript
await this.db.$transaction(async (tx) => { ... });
```
Use for multi-step writes (e.g., cancel involves update + optional revision logic).

### 7D. Decimal / Date serialization
All `Decimal` fields (qty, tolerancePct) must be serialized to string in `DemandLineRecord`.
All `Date` fields (createdAt, updatedAt, lockedAt, deliveryWindowStart, deliveryWindowEnd)
must be serialized to ISO string in `DemandLineRecord`.

### 7E. Pagination pattern
```typescript
normalizeListQuery(query): { limit: number; offset: number; orderBy: ... }
// limit default: 20, max: 100
// offset default: 0
// orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }]
```
Consistent with the pattern in `networkPool.service.ts`.

### 7F. org_id authority (D-017-A)
`orgId` is ALWAYS sourced from `dbContext.orgId` (JWT). Never from request body or params.
Pass `orgId` from caller route handler into service method — never infer from pool or line data.

### 7G. Feature gate middleware
The existing `ncPoolFeatureGateMiddleware` applies to all pool routes.
Demand-line routes must include it in `preHandler: [ncPoolFeatureGateMiddleware]`.
`ncPoolRfqFeatureGateMiddleware` is designed but DOES NOT exist yet; it belongs in lock packet.

---

## 8. Decision Record Summary Table

| # | Topic | Selected | Key constraint |
|---|---|---|---|
| 1 | Demand line creation status | DRAFT by default | No caller-supplied status at create |
| 2 | Packet granularity | Service-only first, routes separate | Two distinct packets |
| 3 | `metadata_internal_json` | Omit from default DTO | Internal field; hardening required to expose |
| 4 | Lock-for-RFQ prerequisite | BLOCKED until snapshot schema | lockDemandLinesForRfq forbidden now |
| 5 | Pool state gate for writes | DRAFT / OPEN / AGGREGATING | Blocked from CLOSED_FOR_BIDS onward |
| 6 | Lock coupling | Standalone action first | No auto-transition in lock packet |
| 7 | Route file structure | Separate `poolDemandLines.ts` | Static before parameterized routes |
| 8 | `listDemandLines` pool check | Explicit 404 on absent/wrong-org pool | No silent empty list |

---

## 9. Governance Chain

| Packet | Commit | Status |
|---|---|---|
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001 | 961a2c1 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001 | 8878305 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-FOUNDATION-001 | 7197e23 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-DEPLOY-VERIFY-001 | 3692a14 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-GOV-SYNC-001 | 045d576 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DESIGN-001 | b549543 | CLOSED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001 | TBD | THIS PACKET |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001 | — | NEXT AUTHORIZED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-001 | — | AFTER FOUNDATION |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001 | — | BLOCKED DEPENDENCY |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-001 | — | AFTER SNAPSHOT |
