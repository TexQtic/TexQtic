# TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001
## Network Commerce Pool RFQ — Issue Workflow: Decision Record

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001
Status: DECISION RECORD CLOSED — SCHEMA FOUNDATION AUTHORIZED NEXT
Type: TECS bounded decision-record packet
Date: 2026-05-08
Decision authority: Paresh Patel

Implementation gate:
- This packet records approved decisions for the Pool RFQ Issue workflow only.
- This packet does not authorize schema implementation, migrations, service implementation,
  route implementation, middleware changes, tests, UI, supplier invites, quote submission,
  allocation, order placement, invoice generation, settlement, escrow, MakerChecker changes,
  lifecycle transition implementation, NetworkLifecycleLog writes, governance control
  active-state changes, or DPP state changes.
- Implementation remains blocked until this decision record is committed.
- After this record is committed, the next authorized packet is:
  TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-FOUNDATION-001

---

## 1. Authority and Inputs

Decision authority: Paresh Patel (pool owner / platform operator)

Upstream design artifact:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DESIGN-001.md
  Commit: 08c7971

Upstream engineering audit artifact:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-AUDIT-001.md
  Commit: 3252e37

Prior decision and implementation chain (all confirmed on branch `main`):

| Artifact | Commit |
|---|---|
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001 | 961a2c1 |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001 | 8878305 |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-FOUNDATION-001 | 7197e23 |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-DEPLOY-VERIFY-001 | 3692a14 |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001 | 8241991 |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-001 | 1bc1b09 |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001 | d279e2e |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-SERVICE-001 | e046ccd |
| TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-SUBFLAG-GATE-001 | a06631d |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-ROUTE-001 | 120408d |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-PROD-VERIFY-GOV-CLOSE-001 | ade218d |
| TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DESIGN-001 | 08c7971 |
| TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-AUDIT-001 | 3252e37 |

Governance sequencing references:
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md

All 13 lineage commits confirmed present on branch `main` at decision-record creation time.

---

## 2. Scope Reminder

This packet records Paresh-approved decisions for the six open decisions (Q-1 through Q-6)
identified in §18 of DESIGN-001 (commit `08c7971`) and audited with repo-truth evidence in
DECISION-AUDIT-001 (commit `3252e37`).

**Audit findings summary (from DECISION-AUDIT-001):**
- All six decisions have clear recommended resolutions backed by repo-truth evidence.
- Zero technical blockers remain after this decision record.
- One DESIGN-001 correction is recorded: transition denial must map to **422 TRANSITION_DENIED**,
  not 409. (See Q-5 below.)
- The existing `Rfq` / `RfqSupplierResponse` model is categorically disqualified for pooled
  aggregate RFQ use. A dedicated `NetworkPoolRfq` + `NetworkPoolRfqLine` schema is required.

**This document is the authoritative record of Paresh-approved decisions.**
Once committed, implementation of SCHEMA-FOUNDATION-001 is unblocked.

---

## 3. Recorded Decisions — Q-1 through Q-6

---

### Q-1 — Pool `lifecycleStateId` Update Authority

**Selected: Option A — shared-transaction pattern from `openNetworkPool`.**

| Field | Value |
|---|---|
| Decision | Option A — RFQ service updates `lifecycleStateId` inside caller-owned `$transaction` |
| Status | APPROVED |
| Audit reference | DECISION-AUDIT-001 §4 Q-1; repo-truth finding F-01, F-02 |

Record:
- RFQ issue service must call `StateMachineService.transition` inside a caller-owned
  Prisma `$transaction` lambda.
- `StateMachineService.transition` must receive `opts.db = tx` so the lifecycle validation
  and `NetworkLifecycleLog` write share the transaction with the entity update.
- After SM returns `APPLIED`, RFQ issue service must update `NetworkPool.lifecycleStateId`
  to the CLOSED_FOR_BIDS state ID inside the same transaction.
- The CLOSED_FOR_BIDS lifecycle state ID must be resolved before entering the transaction
  (fail-fast: if state ID is missing from DB, abort with appropriate error before starting tx).
- This follows the exact pattern of `openNetworkPool` in `networkPool.service.ts`.
- `StateMachineService` must NOT be modified or extended to perform entity state updates in
  this packet chain. Entity state update is the calling service's responsibility.
- Pool state must NOT be derived exclusively from `NetworkLifecycleLog`. The authoritative
  current state is `NetworkPool.lifecycleStateId` (entity record), not the log.

Implementation consequence:
- SERVICE-001 must use the shared-transaction pattern as described.
- `stateMachine.service.ts` is not modified by any packet in this chain.

---

### Q-2 — Snapshot Latest-Version Enforcement

**Selected: Option A — enforce latest CAPTURED snapshot only.**

| Field | Value |
|---|---|
| Decision | Option A — latest CAPTURED snapshot only; no caller-supplied snapshot_id |
| Status | APPROVED |
| Audit reference | DECISION-AUDIT-001 §4 Q-2; repo-truth finding F-08 |

Record:
- RFQ issue must use the latest CAPTURED `NetworkPoolDemandSnapshot` for the pool.
- The route body must NOT accept a caller-supplied `snapshot_id` in v1.
- The service resolves the latest CAPTURED snapshot internally by `poolId` + `ownerOrgId`,
  ordered by `snapshotVersion` descending.
- If no CAPTURED snapshot exists for the pool, the service must return an error indicating
  the pool has no valid snapshot for RFQ issue. HTTP status and error code to be defined in
  SERVICE-001 consistent with existing repo error patterns.
- Older CAPTURED snapshots (version < max) must not be eligible for RFQ issue in v1.
  Only the most-recent CAPTURED snapshot may be promoted to an RFQ.

Implementation consequence:
- SCHEMA-FOUNDATION-001 does not require a new schema field or constraint for this decision.
  Existing `snapshotVersion` (Int) + `status` field + unique `(poolId, snapshotVersion)`
  constraint on `NetworkPoolDemandSnapshot` are sufficient.
- SERVICE-001 must resolve the latest snapshot internally using
  `findFirst({ where: { poolId, status: 'CAPTURED' }, orderBy: { snapshotVersion: 'desc' } })`.

---

### Q-3 — `response_deadline_at` Requirement

**Selected: Option A — optional, nullable, not enforced in v1.**

| Field | Value |
|---|---|
| Decision | Option A — optional nullable column; no enforcement in v1 |
| Status | APPROVED |
| Audit reference | DECISION-AUDIT-001 §4 Q-3; repo-truth finding F-05 |

Record:
- `response_deadline_at` is optional and nullable in the `NetworkPoolRfq` schema.
- If provided in the RFQ issue request, it is stored on the `NetworkPoolRfq` record.
- If omitted, `null` is stored. `null` is a valid state.
- No automated deadline enforcement, scheduler, expiry job, cron task, or supplier-facing
  deadline behavior is implemented in v1.
- No validation that `response_deadline_at` is in the future is required in v1.
  ROUTE-001 may apply a basic ISO8601 format check only.
- Future deadline enforcement (auto-close, supplier notification, expiry trigger) requires
  a separate packet with explicit authorization. It is not authorized by this decision record
  or any packet in this chain.

Implementation consequence:
- SCHEMA-FOUNDATION-001 must include a nullable `response_deadline_at` (timestamptz) column
  on the `NetworkPoolRfq` table.
- ROUTE-001 must accept `response_deadline_at` as an optional field in the request body.
- SERVICE-001 must pass `response_deadline_at` through to the `NetworkPoolRfq` create call
  if provided; default to `null` if not.

---

### Q-4 — `rfqRef` Generation Strategy

**Selected: Option A — `randomUUID()` from `crypto`, service-generated.**

| Field | Value |
|---|---|
| Decision | Option A — `randomUUID()` from `crypto`; service-generated; not caller-supplied |
| Status | APPROVED |
| Audit reference | DECISION-AUDIT-001 §4 Q-4; repo-truth finding F-04 |

Record:
- `rfqRef` must be generated by the RFQ issue service using `randomUUID()` imported from `crypto`.
- `rfqRef` must NOT be caller-supplied via the request body or any request field.
- No human-readable sequential RFQ reference (e.g., `RFQ-{orgId}-{year}-{seq}`) is introduced
  in v1. Sequential refs require atomic sequence infrastructure not present in the NC stack.
- This is consistent with `snapshotRef` generation in `networkPoolDemandLine.service.ts`
  (line 787) and with UUID generation across all NC services.
- Uniqueness enforcement is a DB-level constraint (SCHEMA-FOUNDATION-001 must add appropriate
  unique constraint — likely `(org_id, rfq_ref)` or `rfq_ref` alone).

Implementation consequence:
- SERVICE-001 imports `randomUUID` from `crypto` (same pattern as `networkPoolDemandLine.service.ts`).
- SCHEMA-FOUNDATION-001 must enforce uniqueness on `rfq_ref`. The exact constraint scope
  (`rfq_ref` alone or `(org_id, rfq_ref)`) is decided in SCHEMA-FOUNDATION-001.

---

### Q-5 — Transition Denial Behavior and HTTP Status

**Selected: Option A with DESIGN-001 correction — 422 TRANSITION_DENIED (not 409).**

| Field | Value |
|---|---|
| Decision | Option A — throw inside `$transaction`, rollback, map to 422 TRANSITION_DENIED |
| Status | APPROVED — includes mandatory DESIGN-001 correction |
| Audit reference | DECISION-AUDIT-001 §4 Q-5; repo-truth finding F-02, F-03 |

**DESIGN-001 CORRECTION — Recorded here as authoritative:**
DESIGN-001 (commit `08c7971`) §18 Q-5 proposed returning **409** on transition denial.
Repo-truth evidence from `pools.ts` `mapPoolServiceError` shows the canonical NC error mapping
for `NetworkPoolTransitionDeniedError` is **422 TRANSITION_DENIED**, not 409.
409 is used for `DUPLICATE_POOL_REF` in the existing pool routes — a different error class.
**This decision record supersedes DESIGN-001 on this point. 422 is the required status.**

Record:
- If `StateMachineService.transition` returns a non-APPLIED result (DENIED or any other
  non-APPLIED status), the RFQ issue service must throw a transition-denied error class
  INSIDE the `$transaction` lambda.
- Throwing inside the lambda triggers automatic Prisma transaction rollback.
- On rollback, NO data must persist: no `NetworkPoolRfq` header, no `NetworkPoolRfqLine`
  records, no `NetworkPool.lifecycleStateId` update, no `NetworkLifecycleLog` entry.
- The rollback is full and atomic. Partial success is not allowed.
- The route error handler must map the RFQ transition-denied error to:
  - HTTP status: **422**
  - Error code: `TRANSITION_DENIED`
  - This matches the existing `mapPoolServiceError` pattern for `NetworkPoolTransitionDeniedError`.
- This behavior handles concurrent RFQ issue calls safely: if two callers race, one receives
  APPLIED (succeeds), the other receives DENIED and rolls back cleanly. No orphaned partial state.

Implementation consequence:
- SERVICE-001 must define or reuse a transition-denied error class for the RFQ issue path.
  A new class (e.g., `NetworkPoolRfqTransitionDeniedError`) is preferred for clarity.
- ROUTE-001 must map the error to 422 TRANSITION_DENIED in the pool RFQ route handler.
- The 422 mapping must NOT be 409. 409 is reserved for duplicate-ref conflicts.

---

### Q-6 — RFQ Issue Route Path and Plugin Location

**Selected: Option A — `POST /api/tenant/network-commerce/pools/:poolId/rfq/issue`
in new plugin file `poolRfq.ts`.**

| Field | Value |
|---|---|
| Decision | Option A — new plugin `poolRfq.ts`; registered at existing pool prefix |
| Status | APPROVED |
| Audit reference | DECISION-AUDIT-001 §4 Q-6; repo-truth finding F-06, F-07 |

Record:
- The RFQ issue route path is:
  ```
  POST /api/tenant/network-commerce/pools/:poolId/rfq/issue
  ```
- The route must live in a new Fastify plugin file:
  ```
  server/src/routes/tenant/poolRfq.ts
  ```
- The new plugin must be registered in `server/src/routes/tenant.ts` alongside the
  existing two pool plugin registrations, under the same prefix:
  ```typescript
  await fastify.register(tenantPoolRfqRoutes, { prefix: '/tenant/network-commerce/pools' });
  ```
  Registration must occur after `tenantPoolDemandLineRoutes`.
- RFQ issue routes must NOT be added to `poolDemandLines.ts`. These are distinct lifecycle
  operations and must remain separated for maintainability.
- The `/rfq/issue` sub-path leaves room for future RFQ subroutes under `/:poolId/rfq/`:
  supplier invites, quote submission, RFQ detail, cancellation, revision.
  These subroutes are NOT authorized by this decision record.
- No find-my-way routing conflicts exist with this path (confirmed by audit F-07).
- No backslashes, regex characters, or unsafe path segments are used. All plain segments.

Implementation consequence:
- ROUTE-001 must create `server/src/routes/tenant/poolRfq.ts`.
- ROUTE-001 must add one `fastify.register(...)` line in `server/src/routes/tenant.ts`.
- No other files in `tenant.ts` require modification for this registration.

---

## 4. DESIGN-001 Correction Summary

| Section | DESIGN-001 stated | This record supersedes with |
|---|---|---|
| §18 Q-5 HTTP status on transition denial | 409 | **422 TRANSITION_DENIED** |

All other DESIGN-001 decisions are confirmed as specified (no other corrections).

---

## 5. Implementation Sequence (Authorized)

The following implementation sequence is authorized by this decision record:

| Step | Packet ID | Scope |
|---|---|---|
| 1 | TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001 | ← this packet |
| 2 | TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-FOUNDATION-001 | Schema + migration for `NetworkPoolRfq`, `NetworkPoolRfqLine`, Prisma relations, SQL constraints, RLS, grants |
| 3 | TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-DEPLOY-VERIFY-001 | Deploy schema, verify DB state |
| 4 | TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-GOV-SYNC-001 | Post-deploy governance sync |
| 5 | TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-SERVICE-001 | `issueRfq` service method |
| 6 | TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-ROUTE-001 | `POST /:poolId/rfq/issue` route + integration tests |
| 7 | TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-PROD-VERIFY-GOV-CLOSE-001 | Runtime verification, governance closure |

Each step in the sequence is individually authorized only when the prior step is committed
and validated. Steps 2–7 are NOT authorized solely by this packet — each requires its own
scoped prompt or instruction.

---

## 6. Implementation Boundary

This decision record authorizes the schema foundation packet (Step 2 above) to begin.

### Authorized by this record (schema foundation scope only):
- `NetworkPoolRfq` table schema
- `NetworkPoolRfqLine` table schema (aggregate demand lines associated with the RFQ)
- Prisma model definitions and back-relations for the above
- SQL migration file
- Unique constraints and indexes
- RLS policies and grants for the new tables
- Immutability rules if appropriate (e.g., preventing updates to issued RFQ fields)
- `prisma db pull` and `prisma generate` after SQL is applied and verified

### NOT authorized by this decision record:
- Service logic (`issueRfq`, transition, snapshot resolution, ref generation)
- Route handler implementation
- Middleware additions or modifications
- Unit tests, integration tests, or E2E tests
- Supplier invitation schema (a separate design is required before supplier invite schema)
- Quote submission schema
- Allocation, order placement, invoice generation, settlement, or escrow schema
- UI components or frontend routes
- MakerChecker changes
- Lifecycle transition code
- `NetworkLifecycleLog` writes
- Governance control file active-state changes (`OPEN-SET.md`, `NEXT-ACTION.md`)
- DPP state changes

---

## 7. Forbidden Implementation Scope (Explicit)

The following are explicitly out of scope and must not be implemented until separately
authorized by a future decision record or explicitly scoped prompt:

| Area | Status |
|---|---|
| Schema implementation | NOT authorized by this record alone — SCHEMA-FOUNDATION-001 required |
| Service implementation | BLOCKED — requires schema + ISSUE-SERVICE-001 |
| Route implementation | BLOCKED — requires service + ISSUE-ROUTE-001 |
| Middleware changes | NOT authorized |
| Tests (unit, integration, E2E) | NOT authorized by this record |
| UI components | NOT authorized |
| Supplier invite schema or routes | NOT authorized — separate design required |
| Quote submission logic or schema | NOT authorized |
| Allocation / order / invoice / settlement / escrow | NOT authorized |
| MakerChecker workflows | NOT authorized |
| Lifecycle transition code | NOT authorized by this record |
| NetworkLifecycleLog writes | NOT authorized independently |
| Governance control active-state changes | NOT authorized — no OPEN-SET.md or NEXT-ACTION.md changes |
| DPP state changes | NOT authorized |

---

## 8. Repo-Truth Anchors (Key Evidence from Audit)

| Finding | Source | Decision(s) informed |
|---|---|---|
| StateMachineService does NOT update `lifecycleStateId` — entity updates are "G-017/G-018 Day N concern" | `stateMachine.service.ts` header | Q-1 |
| `openNetworkPool` shared-tx pattern: SM first → throw on non-APPLIED → entity update | `networkPool.service.ts` `openNetworkPool` method | Q-1, Q-5 |
| `AGGREGATING→CLOSED_FOR_BIDS` `requiresMakerChecker=false` for TENANT_ADMIN | `20260523000000_nc_pool_lifecycle_seed/migration.sql` lines 302–313 | Q-1 |
| `mapPoolServiceError` maps `NetworkPoolTransitionDeniedError` → 422 TRANSITION_DENIED | `pools.ts` route handler | Q-5 (DESIGN-001 correction) |
| `snapshotRef = randomUUID()` from `crypto` is universal NC ref pattern | `networkPoolDemandLine.service.ts` line 787 | Q-4 |
| `NetworkPoolDemandSnapshot`: unique `(poolId, snapshotVersion)`, `status` field, `snapshotVersion` Int | `schema.prisma` `NetworkPoolDemandSnapshot` model | Q-2 |
| Zero matches for `response_deadline|deadline` in `server/src/**` | grep | Q-3 |
| `/:poolId/rfq/issue` sub-path has zero conflicts with existing routes | grep `server/src/routes/tenant/**` | Q-6 |
| `tenantPoolRoutes` and `tenantPoolDemandLineRoutes` share prefix `/tenant/network-commerce/pools` | `tenant.ts` lines 9000–9001 | Q-6 |
| Existing `Rfq` model: single `supplierOrgId` FK, `Int` quantity, message-only response | `schema.prisma` Rfq model lines 594–650 | Disqualification of existing Rfq model |
| `AGGREGATING→CLOSED_FOR_BIDS` not unit-tested in `stateMachine.g020.test.ts` | `tests/stateMachine.g020.test.ts` | SERVICE-001 must add this test |

---

## 9. Risks Carried Forward to Implementation Packets

| Risk | Severity | Owner packet |
|---|---|---|
| `AGGREGATING→CLOSED_FOR_BIDS` has no unit test in `g020.test.ts` (seeded but not tested) | MEDIUM | SERVICE-001 must add explicit test case |
| `NetworkPoolRfq` schema budget pressure — comprehensive field set in DESIGN-001 §8 may require trimming | MEDIUM | SCHEMA-FOUNDATION-001 must review `schema-budget.md` before finalizing columns |
| Concurrent RFQ issue calls for the same pool — race condition | LOW | Handled by shared-tx + TRANSITION_DENIED path; no additional lock needed in v1 |
| `response_deadline_at` nullable — no enforcement | LOW | Acceptable for Phase 1; enforcement deferred to future packet |
| Third pool plugin file registration in `tenant.ts` | LOW | Consistent with `tenantPoolDemandLineRoutes` precedent; registration order matters |

---

## 10. Decision Closure Statement

All six Q-1 through Q-6 decisions from DESIGN-001 §18 are now recorded.

- Implementation of TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-FOUNDATION-001 is **UNBLOCKED**.
- The DESIGN-001 correction (422 not 409 for transition denial) is authoritative in this record.
- No further decision audit or decision record is required before schema foundation.
- All service, route, test, and UI work remains blocked until SCHEMA-FOUNDATION-001 is
  completed, deployed, and schema governance is synced.

---

*End of TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001*
