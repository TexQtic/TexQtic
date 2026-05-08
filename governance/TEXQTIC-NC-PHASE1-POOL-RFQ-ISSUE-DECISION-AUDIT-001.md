# TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-AUDIT-001

**Status:** AWAITING PARESH DECISION  
**Type:** Bounded Decision Audit (repo-truth + options)  
**Prerequisite:** TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DESIGN-001 (commit `08c7971`)  
**Governs:** All implementation packets in the Pool RFQ Issue chain  
**Author:** Copilot — 2026-05-28  
**Commit:** `docs(network-commerce): audit pool RFQ issue decisions`

---

## 1. Executive Summary

This packet audits the six open Paresh decisions (Q-1 through Q-6) identified in
§18 of DESIGN-001 against repo-truth evidence. For each decision the audit records:
the canonical code evidence, all viable options with trade-offs, and a recommended
decision. One correction to DESIGN-001 is noted (Q-5 HTTP status).

**Governance position:**

```
DESIGN-001          ✅  commit 08c7971
DECISION-AUDIT-001  ← this packet
DECISION-RECORD-001 (blocked — awaiting Paresh decisions)
SCHEMA-FOUNDATION-001
SCHEMA-DEPLOY-VERIFY-001
SCHEMA-GOV-SYNC-001
SERVICE-001
ROUTE-001
PROD-VERIFY-GOV-CLOSE-001
```

**Implementation is BLOCKED until Paresh approves or overrides six decisions
in DECISION-RECORD-001. No schema, migration, service, route, test, or UI work
may begin before that record is committed.**

---

## 2. Files Inspected

| File | Read purpose |
|------|--------------|
| `server/src/services/networkPool.service.ts` | Q-1: canonical lifecycleStateId update pattern; error classes; shared-tx proof |
| `server/src/routes/tenant/pools.ts` | Q-5: TRANSITION_DENIED error mapping; Q-6: route namespace; static vs param ordering |
| `server/src/routes/tenant.ts` (lines 9000–9001) | Q-6: plugin prefix registration (`/tenant/network-commerce/pools`) |
| `server/src/services/networkPoolDemandLine.service.ts` (line 787) | Q-4: `snapshotRef = randomUUID()` pattern |
| `server/src/middleware/ncPoolRfqFeatureGate.middleware.ts` | Q-6: double feature gate pattern |
| `server/prisma/schema.prisma` (lines 1827–2070) | Q-2: snapshot unique constraints and status enum; Q-1: NetworkPool model fields |
| `server/prisma/migrations/20260523000000_nc_pool_lifecycle_seed/migration.sql` (lines 302–313) | Q-1/Q-5: AGGREGATING→CLOSED_FOR_BIDS seed row; requiresMakerChecker=false |
| `server/src/services/stateMachine.service.ts` | Q-1/Q-5: opts.db proof; "entity state updates are a G-017/G-018 Day N concern" |
| `tests/stateMachine.g020.test.ts` | Q-1: missing explicit AGGREGATING→CLOSED_FOR_BIDS test |
| `server/prisma/schema.prisma` (line 594–650) | Q-1/Q-2: existing `Rfq` model — disqualified for pool aggregate use |

---

## 3. Repo-Truth Findings (Pre-Decision)

### F-01: StateMachineService does NOT update `NetworkPool.lifecycleStateId`

Source: `stateMachine.service.ts` header (exact excerpt):

> "entity state updates are a G-017/G-018 Day N concern"

The SM service writes only to `network_lifecycle_log`. The entity table
(`network_pools.lifecycle_state_id`) is NEVER touched by SM.

### F-02: Canonical entity-update pattern is `openNetworkPool` (shared-tx)

Source: `networkPool.service.ts`, `openNetworkPool` method (commit `08c7971`+prior commits):

```typescript
const updatedRow = await this.db.$transaction(async (tx) => {
  const smResult = await this.stateMachine.transition(
    { /* request */ },
    { db: tx as unknown as PrismaClient },   // SM log write uses tx
  );

  if (smResult.status !== 'APPLIED') {
    throw new NetworkPoolTransitionDeniedError(/* code, message */);
    // throw inside tx lambda → Prisma auto-rollback
  }

  const updated = await (tx as any).networkPool.update({
    where: { id: poolId },
    data: { lifecycleStateId: targetState.id, updatedAt: new Date() },
  });
  return updated;
});
```

This is the only place in the codebase where a lifecycle transition changes an
entity's `lifecycleStateId`. **This exact pattern is the established contract.**

### F-03: TRANSITION_DENIED maps to HTTP 422, NOT 409

Source: `server/src/routes/tenant/pools.ts`, `mapPoolServiceError`:

```typescript
if (err instanceof NetworkPoolTransitionDeniedError) {
  sendError(reply, 'TRANSITION_DENIED', err.message, 422);
  return true;
}
```

DESIGN-001 §18 Q-5 recommended "return 409". **This is a CORRECTION needed in
DECISION-RECORD-001.** The canonical NC error code for a denied lifecycle
transition is 422 TRANSITION_DENIED, not 409.

### F-04: `snapshotRef = randomUUID()` is the established NC ref pattern

Source: `networkPoolDemandLine.service.ts`, line 787:

```typescript
const snapshotRef = randomUUID();
```

`randomUUID` from `crypto` is imported at line 23 of that service. The same
import exists in `networkPool.service.ts` (line 29) and `invoice.service.ts` (line 17).
There is no sequential counter, no prefix, no human-readable format in any NC service.

### F-05: No `response_deadline` or `deadline` field exists anywhere in `server/src/**`

Grep for `response_deadline|responseDeadline|deadline_at` returns zero matches.
`response_deadline_at` is a brand-new concept. No enforcement or validation pattern
exists to inherit.

### F-06: Plugin registration — both pool plugin families share one prefix

Source: `server/src/routes/tenant.ts`, lines 9000–9001:

```typescript
await fastify.register(tenantPoolRoutes,           { prefix: '/tenant/network-commerce/pools' });
await fastify.register(tenantPoolDemandLineRoutes, { prefix: '/tenant/network-commerce/pools' });
```

Resolved full path (with outer `/api`):

```
/api/tenant/network-commerce/pools/*
```

The new RFQ Issue plugin would be registered at the same prefix, matching the
demand-lines plugin pattern. Route paths inside the plugin use
`/:poolId/rfq/issue` — entirely separate sub-namespace from `/:poolId/demand-lines/*`.

### F-07: No route conflict with `/rfq/issue`

Existing routes under the pool prefix:
- `POST /` — create pool
- `POST /:poolId/open` — DRAFT→OPEN
- `POST /:poolId/join` — join pool
- `GET /` — list owned
- `GET /joined` — list joined (STATIC — before `/:poolId`)
- `GET /:poolId` — get by id
- `GET /:poolId/membership` — get membership
- `GET /:poolId/demand-lines` — list demand lines
- `POST /:poolId/demand-lines` — create demand line
- `POST /:poolId/demand-lines/lock-for-rfq` — lock (STATIC — before `/:lineId`)
- `PATCH /:poolId/demand-lines/:lineId` — update
- `POST /:poolId/demand-lines/:lineId/cancel` — cancel

`/:poolId/rfq/issue` does NOT conflict with any of these. No find-my-way regex
issues — plain path segments only.

### F-08: `NetworkPoolDemandSnapshot` supports latest-version enforcement

Source: `schema.prisma`, `NetworkPoolDemandSnapshot` model:
- Field `status` (String): seed evidence shows DRAFT→CAPTURED→SUPERSEDED|CANCELLED
- Field `snapshotVersion` (Int)
- Unique constraint: `(poolId, snapshotVersion)`

Querying the latest CAPTURED snapshot is feasible:

```typescript
await tx.networkPoolDemandSnapshot.findFirst({
  where: { poolId, status: 'CAPTURED' },
  orderBy: { snapshotVersion: 'desc' },
});
```

This is deterministic given the unique constraint. No ambiguity.

### F-09: `AGGREGATING→CLOSED_FOR_BIDS` requires no MakerChecker

Source: `20260523000000_nc_pool_lifecycle_seed/migration.sql`, lines 302–313:

```sql
('POOL', 'AGGREGATING', 'CLOSED_FOR_BIDS',
 ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
 false,   -- requiresMakerChecker
 false    -- requiresEscalation
)
```

SM will return `APPLIED` (not `PENDING_APPROVAL`) for a TENANT_ADMIN caller.
No `pending_approvals` record is created. No 202 response path needed.

### F-10: Transition NOT explicitly tested in `stateMachine.g020.test.ts`

The test file covers P-POOL-01 through P-POOL-05 (DRAFT→OPEN, OPEN→AGGREGATING,
QUOTED→ACCEPTED, QUOTED→REJECTED, SETTLEMENT_PENDING→SETTLED).
`AGGREGATING→CLOSED_FOR_BIDS` is seeded but has no explicit unit test.
The gap does not block implementation but must be noted for SERVICE-001 and
ROUTE-001 test authoring.

### F-11: Existing `Rfq` model is categorically disqualified for pool aggregate use

Source: `schema.prisma`, `Rfq` model (line 594):
- `supplierOrgId` (String, FK to `Organization`) — single direct supplier
- `quantity` (Int) — integer only, cannot hold aggregate Decimal qty
- `RfqSupplierResponse` (message-only, `@unique rfqId`) — no pricing, no revisions

`NetworkPoolRfq` must be a new model. This is confirmed.

---

## 4. Decision-by-Decision Audit

---

### Q-1: Who updates `NetworkPool.lifecycleStateId` to CLOSED_FOR_BIDS?

**Context:** StateMachineService writes only to `network_lifecycle_log`. The
entity's `lifecycleStateId` must be updated separately. The question is WHERE
that update happens and on what transaction boundary.

**Repo-truth anchor:** `openNetworkPool` (F-02 above). Exact contract:
- Caller service owns a `$transaction` lambda
- SM runs FIRST inside the lambda, with `{ db: tx }` to share the tx
- If SM returns non-APPLIED, throw inside the lambda → Prisma auto-rollback
- Entity update runs SECOND inside the same lambda

**Options:**

| Option | Description | Data integrity risk | Complexity |
|--------|-------------|---------------------|------------|
| A | RFQ service updates `lifecycleStateId` directly inside the same `$transaction` that runs SM (matching `openNetworkPool` pattern) | Low — atomic; no window between log write and entity update | Low — canonical pattern already exists |
| B | RFQ service updates `lifecycleStateId` OUTSIDE the SM transaction in a separate `db.networkPool.update()` | HIGH — if SM succeeds but outer update fails, pool log says CLOSED_FOR_BIDS but entity still reads AGGREGATING | Low code-complexity but HIGH correctness risk |
| C | Introduce a new SM hook / callback to do entity updates inside SM | HIGH engineering disruption — rewrites SM contract | Very high |

**Recommendation: Option A.**  
Follow the `openNetworkPool` shared-tx pattern exactly. Resolve CLOSED_FOR_BIDS
state ID before entering the tx (fail-fast for missing seed). Run SM first,
throw on non-APPLIED, then update entity inside the same tx.

**Blocks implementation:** YES — SCHEMA-FOUNDATION-001 and SERVICE-001 both
depend on this decision.

**Implemented in:** SERVICE-001

---

### Q-2: Snapshot enforcement — latest CAPTURED only, or any CAPTURED?

**Context:** At RFQ issue time, the service must load the demand snapshot that
forms the basis of the RFQ. If the pool has had multiple lock+recapture cycles
(snapshot v1 superseded, v2 is current CAPTURED), should it be valid to issue
an RFQ against v1?

**Repo-truth anchor:** F-08 — schema supports deterministic latest-snapshot query.

**Options:**

| Option | Description | Data integrity risk | Complexity |
|--------|-------------|---------------------|------------|
| A | Enforce latest CAPTURED snapshot only (findFirst ordered by snapshotVersion desc) | Low — always uses freshest demand picture | Low — single query |
| B | Accept any caller-supplied snapshot_id (validate only that it exists and is CAPTURED) | MEDIUM — caller could accidentally or maliciously issue against a stale snapshot | Low code but higher audit risk |
| C | Accept caller-supplied snapshot_id, validate it is the latest | Low correctness risk | Medium — requires subquery |

**Recommendation: Option A.**  
The RFQ issue route takes no `snapshot_id` in the request body. The service
resolves the latest CAPTURED snapshot by query. This removes a whole class of
client errors. If no CAPTURED snapshot exists, return 422 SNAPSHOT_NOT_FOUND.

**Blocks implementation:** YES — SERVICE-001 body schema and service logic depend
on this decision.

**Implemented in:** SCHEMA-FOUNDATION-001 (no schema change needed — existing
snapshot status enum and snapshotVersion Int are sufficient), SERVICE-001.

---

### Q-3: `response_deadline_at` — optional or required in v1?

**Context:** The DESIGN-001 proposed `response_deadline_at` as a field on
`NetworkPoolRfq`. This records when supplier responses are due. There is no
deadline enforcement logic anywhere in `server/src/**` today (F-05).

**Repo-truth anchor:** F-05 — zero matches for any deadline concept. This is
brand-new territory.

**Options:**

| Option | Description | Data integrity risk | Complexity |
|--------|-------------|---------------------|------------|
| A | Optional in v1 — stored if provided, null if not. No enforcement. | None | None — just nullable column |
| B | Required in v1 — route validates `response_deadline_at` must be present and > now | None for data integrity, but adds usability friction in early rollout | Low |
| C | Omit entirely in v1 — not part of schema | Risks schema churn if added in v2 | None |

**Recommendation: Option A.**  
Optional, stored, not enforced. A required deadline would add operational
friction before supplier invitation logic exists. Enforcement (e.g., auto-close
after deadline) requires a scheduler — out of scope for Phase 1. Option C
would cause a schema change later; nullable column costs nothing now.

**Blocks implementation:** YES — SCHEMA-FOUNDATION-001 column nullability depends
on this decision.

**Implemented in:** SCHEMA-FOUNDATION-001.

---

### Q-4: `rfqRef` generation strategy

**Context:** `NetworkPoolRfq` needs a stable external reference (`rfq_ref`).
The question is whether to use a random UUID, a sequential human-readable ref,
or a derived/prefixed format.

**Repo-truth anchor:** F-04 — all NC entities use `randomUUID()` from `crypto`.

Evidence table:

| Entity | Ref field | Generation |
|--------|-----------|------------|
| `NetworkPool` | `poolRef` | caller-supplied (human-readable) |
| `NetworkPoolDemandSnapshot` | `snapshotRef` | `randomUUID()` — service-generated (line 787) |
| `NetworkPoolDemandSnapshotLine` | — | `id = randomUUID()` (line 812) |
| `NetworkPool` row id | `id` | `randomUUID()` (line 399) |
| Invoice | `id` | `randomUUID()` (line 383) |

`poolRef` is the only human-supplied ref in NC; all system-generated refs are
`randomUUID()`. The pattern is clear.

**Options:**

| Option | Description | Complexity | Consistency |
|--------|-------------|------------|-------------|
| A | `randomUUID()` from `crypto` — service-generated, guaranteed unique | None | Matches all NC service patterns |
| B | Sequential ref (e.g., `RFQ-{orgId-prefix}-{year}-{seq}`) | High — requires atomic sequence or DB sequence | Inconsistent — no such pattern in NC stack |
| C | Caller-supplied (route body) | Low code | Breaks org autonomy; requires uniqueness enforcement |

**Recommendation: Option A.**  
`randomUUID()` from `crypto`. Consistent with `snapshotRef`, `id` generation
across all NC services. No sequence infrastructure required.

**Blocks implementation:** YES — SERVICE-001 ref generation depends on this.

**Implemented in:** SERVICE-001.

---

### Q-5: What happens when `StateMachineService.transition` returns non-APPLIED?

**Context:** DESIGN-001 §18 Q-5 recommended "rollback full transaction, return 409."
Repo-truth evidence (F-03) shows the existing canonical pattern returns 422.

**DESIGN-001 CORRECTION:**  
The recommended HTTP status for a lifecycle transition denial in this codebase is
**422 TRANSITION_DENIED**, not 409. DECISION-RECORD-001 must record 422.

**Repo-truth anchor:** F-02 (service throw pattern) and F-03 (route error mapping).

Exact service pattern (from `openNetworkPool`):

```typescript
if (smResult.status !== 'APPLIED') {
  throw new NetworkPoolTransitionDeniedError(
    denied.code ?? smResult.status,
    denied.message ?? `SM returned status '${smResult.status}'`,
  );
  // throw inside $transaction lambda → Prisma auto-rollback of SM log + entity update
}
```

Exact route mapping:

```typescript
if (err instanceof NetworkPoolTransitionDeniedError) {
  sendError(reply, 'TRANSITION_DENIED', err.message, 422);
  return true;
}
```

**Options:**

| Option | Description | Consistency | Notes |
|--------|-------------|-------------|-------|
| A | Throw `NetworkPoolRfqTransitionDeniedError` inside tx (auto-rollback), map to 422 TRANSITION_DENIED at route | Full consistency with existing pattern | CORRECT |
| B | Return 409 as DESIGN-001 suggested | Inconsistent — 409 is used for DUPLICATE_POOL_REF in pools.ts | INCORRECT for this use case |
| C | Return 422 but use a different error code (e.g., POOL_CLOSED_FOR_RFQ_DENIED) | Acceptable if new error code helps client discoverability | Optional variation of A |

**Recommendation: Option A** (with 422, not 409).  
Match `openNetworkPool` precisely. Throw from inside the `$transaction` lambda
so Prisma auto-rolls back both the SM log write and any partial pool/RFQ writes.
Map to 422 TRANSITION_DENIED at the route. Document the DESIGN-001 correction
in DECISION-RECORD-001.

**Concurrency risk:** If two concurrent RFQ issue requests for the same pool reach
the SM simultaneously, one will succeed (APPLIED), the other will get DENIED
(pool is already CLOSED_FOR_BIDS). The DENIED caller's transaction rolls back
cleanly. No partial state.

**Blocks implementation:** YES — SERVICE-001 error class, SERVICE-001 tx logic,
and ROUTE-001 error mapping all depend on this decision.

**Implemented in:** SERVICE-001 (error class), ROUTE-001 (mapping).

---

### Q-6: Route path for the RFQ issue endpoint

**Context:** The route must live within the existing NC pool namespace. The
question is the exact path and whether to create a new Fastify plugin file or
add to an existing one.

**Repo-truth anchor:** F-06, F-07. Both confirm the `/rfq/issue` sub-path is
safe and clean.

**Existing plugin registration (tenant.ts lines 9000–9001):**

```typescript
await fastify.register(tenantPoolRoutes,           { prefix: '/tenant/network-commerce/pools' });
await fastify.register(tenantPoolDemandLineRoutes, { prefix: '/tenant/network-commerce/pools' });
```

A new `tenantPoolRfqRoutes` plugin would be registered at line ~9001.5 with
the same prefix. The full resolved path:

```
POST /api/tenant/network-commerce/pools/:poolId/rfq/issue
```

**Options:**

| Option | Description | Conflicts | Pattern fit |
|--------|-------------|-----------|-------------|
| A | `POST /api/tenant/network-commerce/pools/:poolId/rfq/issue` in new plugin file `poolRfq.ts` | None confirmed | Matches demand-line plugin pattern exactly |
| B | Add to existing `poolDemandLines.ts` | No conflicts but mixed concerns (lock vs issue are separate lifecycle operations) | Poor separation |
| C | `POST /api/tenant/network-commerce/pools/:poolId/issue-rfq` | No conflicts | Inconsistent with sub-domain nesting used for `demand-lines` |
| D | `POST /api/tenant/network-commerce/rfq/issue` (non-nested) | No conflicts | Breaks pool-scoped URL convention |

**Static-before-param ordering note:**  
Existing plugins correctly place static segments (`/joined`, `/lock-for-rfq`)
before parameterized routes. The new plugin path uses `/:poolId/rfq/issue` —
the static `rfq` and `issue` segments are INSIDE a param, not at the prefix
level. No ordering risk.

**find-my-way safety:** No backslashes, no regex, all plain path segments. Safe.

**Recommendation: Option A.**  
`POST /api/tenant/network-commerce/pools/:poolId/rfq/issue` in a new plugin
file `server/src/routes/tenant/poolRfq.ts`. Registered in `tenant.ts` alongside
the existing two pool plugin registrations.

**Blocks implementation:** YES — ROUTE-001 depends on this decision for file name,
registration line, and path definition.

**Implemented in:** ROUTE-001.

---

## 5. Specific Repo-Truth Answers

| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | Does StateMachineService.transition update `NetworkPool.lifecycleStateId` today? | NO | SM service header: "entity state updates are a G-017/G-018 Day N concern" |
| 2 | Do current pool service methods directly update `lifecycleStateId`? | YES — `openNetworkPool` does, inside `$transaction` after SM returns APPLIED | `networkPool.service.ts` shared-tx pattern |
| 3 | Can SM.transition safely run inside a caller transaction using `opts.db`? | YES — confirmed in `openNetworkPool` production code and g020 service header | `networkPool.service.ts` line ~450; stateMachine.service.ts signature |
| 4 | Should RFQ issue call SM before or after direct pool `lifecycleStateId` update? | SM FIRST (inside tx), entity update SECOND (inside same tx). If SM non-APPLIED, throw before entity update. | `openNetworkPool` canonical sequence |
| 5 | Does AGGREGATING→CLOSED_FOR_BIDS require MakerChecker? | NO — `requiresMakerChecker=false` for TENANT_ADMIN | migration.sql lines 302–313; SM returns APPLIED directly |
| 6 | Is existing `Rfq` model reusable for `NetworkPoolRfq`? | NO — disqualified: single `supplierOrgId` FK, `Int` quantity, message-only response, no slab/revision support | schema.prisma lines 594–650 |
| 7 | Is latest-snapshot enforcement feasible with current schema? | YES — `findFirst({ where: { poolId, status: 'CAPTURED' }, orderBy: { snapshotVersion: 'desc' } })` is deterministic | schema.prisma: unique `(poolId, snapshotVersion)`, status field |
| 8 | Is `response_deadline_at` enforced anywhere in existing RFQ/supplier code? | NO — zero matches for `deadline` in `server/src/**` | grep server/src/** deadline → 0 results |
| 9 | What ref-generation pattern is most consistent with the NC stack? | `randomUUID()` from `crypto` | networkPoolDemandLine.service.ts line 787; universal across all NC services |
| 10 | Does route namespace `/rfq/issue` create conflicts with current tenant routes? | NO — `/rfq/*` sub-path is entirely unused under `/:poolId` | grep server/src/routes/tenant/** → no `/rfq/` routes found |
| 11 | Are there hidden blockers before RFQ schema foundation? | One: AGGREGATING→CLOSED_FOR_BIDS transition is NOT unit-tested in g020.test.ts (seeded but no explicit P-POOL-xx test). SERVICE-001 must add a test. Not a schema blocker. | tests/stateMachine.g020.test.ts — no CLOSED_FOR_BIDS case |

---

## 6. Recommended Decision Set

| Q | Decision | HTTP code (if applicable) |
|---|----------|--------------------------|
| Q-1 | **Option A** — RFQ service updates `lifecycleStateId` inside the same `$transaction` as SM, matching `openNetworkPool` pattern | — |
| Q-2 | **Option A** — Enforce latest CAPTURED snapshot only (no caller-supplied snapshot_id in v1) | 422 SNAPSHOT_NOT_FOUND if none |
| Q-3 | **Option A** — `response_deadline_at` is optional (nullable column), stored but not enforced in v1 | — |
| Q-4 | **Option A** — `rfqRef = randomUUID()` from `crypto`, service-generated | — |
| Q-5 | **Option A + CORRECTION** — Rollback full tx, return **422 TRANSITION_DENIED** (DESIGN-001 said 409 — that is incorrect per canonical pattern) | **422** |
| Q-6 | **Option A** — `POST /api/tenant/network-commerce/pools/:poolId/rfq/issue` in new plugin `poolRfq.ts` | 201 on success |

---

## 7. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| `AGGREGATING→CLOSED_FOR_BIDS` has no unit test in g020.test.ts | MEDIUM | SERVICE-001 test suite must add P-POOL-CLOS-01 covering this transition. Not a blocker for schema. |
| Concurrent RFQ issue calls for the same pool | LOW | Prisma `$transaction` + SM DENIED path (F-02/F-03) handles this cleanly. No additional lock needed in v1. |
| `response_deadline_at` nullable — no enforcement | LOW | Acceptable for Phase 1. Schedule enforcement requires a separate cron/queue design outside Phase 1 scope. |
| `NetworkPoolRfq` schema proposed in DESIGN-001 §8 is comprehensive — may cause schema budget pressure | MEDIUM | SCHEMA-FOUNDATION-001 must review `/shared/contracts/schema-budget.md` before column list is finalized. DESIGN-001 §8 is the starting point, not a committed contract. |
| Route plugin file `poolRfq.ts` adds a third file in the pool namespace | LOW | Consistent with demand-lines precedent. Registration order in tenant.ts matters (RFQ plugin after demand-lines). |

---

## 8. Paresh Approvals Required

Before DECISION-RECORD-001 can be committed, Paresh must confirm or override
each of the following:

1. **Q-1 (lifecycleStateId pattern):** Approve Option A (shared-tx, `openNetworkPool` pattern).  
   OR: Override with alternative and specify the exact tx boundary.

2. **Q-2 (snapshot enforcement):** Approve Option A (latest CAPTURED only, no caller snapshot_id).  
   OR: Override to allow caller-supplied snapshot_id.

3. **Q-3 (response_deadline_at):** Approve Option A (optional, nullable, no enforcement in v1).  
   OR: Override to required or omit entirely.

4. **Q-4 (rfqRef generation):** Approve Option A (`randomUUID()` from `crypto`).  
   OR: Override with a specific format.

5. **Q-5 (transition denial behavior + HTTP status):** Approve 422 TRANSITION_DENIED  
   (DESIGN-001 said 409 — audit recommends 422 to match canonical pattern).  
   OR: Override to keep 409 (requires explanation of deviation from `openNetworkPool` pattern).

6. **Q-6 (route path):** Approve `POST /api/tenant/network-commerce/pools/:poolId/rfq/issue`  
   in new plugin file `poolRfq.ts`.  
   OR: Override with a different path or file placement.

---

## 9. Implementation Blocked

**YES — implementation is blocked until DECISION-RECORD-001 is committed.**

Dependency chain:

```
Q-3 → SCHEMA-FOUNDATION-001 (nullable vs required vs omit for response_deadline_at)
Q-1 → SCHEMA-FOUNDATION-001 (no schema impact) + SERVICE-001 (tx pattern)
Q-2 → SERVICE-001 (snapshot resolution logic)
Q-4 → SERVICE-001 (rfqRef generation)
Q-5 → SERVICE-001 (error class) + ROUTE-001 (error mapping + HTTP status)
Q-6 → ROUTE-001 (file name, path, tenant.ts registration)
```

---

## 10. Recommended Next Packet

**`TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001`**

Scope: Paresh records decisions for Q-1 through Q-6. Each decision is recorded
with: chosen option, any override rationale, and implementation constraints.
No schema, no code, no migrations in that packet.

Allowlist (Modify):
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001.md` (new file only)

Commit: `docs(network-commerce): record pool RFQ issue decisions`

After DECISION-RECORD-001 is committed, SCHEMA-FOUNDATION-001 may begin.

---

*End of TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-AUDIT-001*
