# TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001
## Network Commerce Pool RFQ — Lock Demand Lines: Decision Record

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001
Status: DECISION RECORD CLOSED — LOCK SERVICE AUTHORIZED NEXT
Type: TECS bounded decision-record packet
Date: 2026-05-08
Decision authority: Paresh Patel

Implementation gate:
- This packet records approved decisions for lock-for-RFQ implementation only.
- This packet does not authorize service implementation, route implementation,
  middleware implementation, schema changes, migrations, tests, UI, RFQ schema,
  RFQ routes, supplier routes, allocation, order placement, invoice generation,
  settlement, escrow, MakerChecker changes, lifecycle transition implementation,
  governance control active-state changes, or DPP state changes.
- Implementation remains blocked until this decision record is committed.
- After this record is committed, the next authorized packet is:
  TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-SERVICE-001

---

## 1. Authority and Inputs

Decision authority: Paresh Patel (pool owner / platform operator)

Upstream design artifact:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001.md
  Commit: 3c27713

Upstream engineering audit artifact:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-AUDIT-001.md
  Commit: d53ca96

Prior decision chain:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001.md
  Commit: 961a2c1
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001.md
  Commit: 8878305
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-FOUNDATION-001.md
  Commit: 7197e23
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-DEPLOY-VERIFY-001.md
  Commit: 3692a14
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DESIGN-001.md
  Commit: b549543
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001.md
  Commit: 1022879
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001.md
  Commit: 8241991
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-001.md
  Commit: 1bc1b09
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-PROD-VERIFY-GOV-CLOSE-001.md
  Commit: 3f7845a
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001.md
  Commit: a4dcabe
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-DEPLOY-VERIFY-001.md
  Commit: 6174d31
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-GOV-SYNC-001.md
  Commit: 396c3d3
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001.md
  Commit: 3c27713
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-AUDIT-001.md
  Commit: d53ca96

Governance sequencing references:
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md

All 13 lineage commits confirmed present on branch `main` at decision-record creation time.

---

## 2. Scope Reminder

This packet selects and records Paresh-approved decisions from the 14 open decisions
in §19 of the lock design (commit `3c27713`) as audited and evidenced by the engineering
audit artifact (commit `d53ca96`).

**Audit findings summary (from LOCK-DECISION-AUDIT-001):**
- All 14 decisions have clear recommended resolutions.
- Zero technical blockers remain.
- 10 decisions confirmed by repo-truth evidence or prior decision records.
- 5 decisions (D-4, D-6, D-9, D-10, D-11) required fresh Paresh approval.

**This document is the authoritative record of Paresh-approved decisions.**
Once committed, implementation of LOCK-SERVICE-001 is unblocked.

---

## 3. Locked Decisions — D-1 through D-14

### D-1 — Lock Ownership Authority

**Selected: OWNER + ADMIN roles only.**

| Field | Value |
|---|---|
| Decision | OWNER + ADMIN roles only |
| Status | APPROVED |
| Prior auth | Established by existing demand-line route pattern |

Record:
- Only tenant users with OWNER or ADMIN role may trigger lock-for-RFQ.
- MEMBER users receive 403 FORBIDDEN. No MEMBER-triggered lock workflow exists.
- Platform/control-plane admin lock workflows are deferred. Not in scope for v1.
- Org authority comes from `request.dbContext.orgId` / authenticated context only.
  Never from request body, URL params, or caller-supplied header.
- Role is determined from `request.userRole` consistent with all existing NC route guards.

---

### D-2 — Pool State Gate

**Selected: AGGREGATING only.**

| Field | Value |
|---|---|
| Decision | AGGREGATING only |
| Status | APPROVED — confirmed by prior decision record |
| Prior auth | TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001 (8878305) + existing createDemandLine gate |

Record:
- `lockDemandLinesForRfq` may execute only when the pool lifecycle state is `AGGREGATING`.
- Invalid states: DRAFT, OPEN, CLOSED_FOR_BIDS, QUOTED, ACCEPTED, ALLOCATING, ALLOCATED,
  ORDERED, IN_FULFILMENT, PARTIALLY_DELIVERED, DELIVERED, SETTLEMENT_PENDING, SETTLED,
  REJECTED, WITHDRAWN, CANCELLED.
- Invalid pool state maps to 422 with error code `INVALID_STATE`.
- Pool state is read from `networkPool.lifecycleState.stateKey` using the existing
  `include: { lifecycleState: { select: { stateKey: true } } }` pattern.
- OPEN pools cannot have ACTIVE demand lines (enforced by existing createDemandLine gate),
  so allowing OPEN would produce a dead path with zero practical value.

---

### D-3 — Eligible Demand Lines

**Selected: ACTIVE demand lines only.**

| Field | Value |
|---|---|
| Decision | ACTIVE lines only |
| Status | APPROVED — confirmed by prior decision record |
| Prior auth | TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001 (D-6) and demand-line service design |

Record:
- Lock selects only demand lines with `status = 'ACTIVE'`.
- DRAFT lines are excluded and remain `DRAFT` after lock.
- CANCELLED lines are excluded and remain `CANCELLED` after lock.
- SUPERSEDED lines are excluded and remain `SUPERSEDED` after lock.
- Existing `LOCKED_FOR_RFQ` lines are excluded and remain `LOCKED_FOR_RFQ` after lock.
- Zero ACTIVE lines found: returns an error (no snapshot created, no DB writes, no partial lock).
  Error code: `NO_ACTIVE_DEMAND_LINES` (or repo-consistent equivalent).
- Partial inclusion of DRAFT lines would create unconfirmed supplier-facing demand.
  This is a data integrity risk. DRAFT lines are not confirmed for RFQ.

---

### D-4 — `expected_line_ids` Optimistic Confirmation

**Selected: Include optional `expected_line_ids` in v1.**

| Field | Value |
|---|---|
| Decision | Optional expected_line_ids in v1 |
| Status | **FRESH PARESH APPROVAL** |
| Prior auth | None — new design decision |

Record:
- The lock request body may include an optional `expected_line_ids` field (array of UUIDs).
- This is an optimistic safety mechanism. It is NOT a partial selection mechanism.
- If `expected_line_ids` is supplied:
  - The service fetches ACTIVE lines for the pool.
  - It computes the set of fetched ACTIVE line IDs.
  - The fetched set must exactly match the `expected_line_ids` set (order-insensitive).
  - If they differ (a line was added, removed, or changed status between caller's read and
    the lock call), the service returns an error. Code: `DEMAND_LINE_SET_CHANGED` or
    repo-consistent equivalent. HTTP status: 409 Conflict.
  - If they match, the lock proceeds for those lines.
- If `expected_line_ids` is omitted, lock proceeds with the current ACTIVE line set.
  Behavior is identical to providing all ACTIVE line IDs explicitly.
- The set-comparison must execute INSIDE the `$transaction` after `findMany({ status: 'ACTIVE' })`
  to avoid TOCTOU races.
- The `expected_line_ids` field must NOT appear in any lock response body.
- Validation schema: `z.array(z.string().uuid()).min(1).optional()` (or repo-consistent
  Zod pattern). Empty array, if supplied, maps to error `NO_ACTIVE_DEMAND_LINES`.
- Rationale: A pool with concurrent members can see lines added/removed between the
  "list lines" and "submit lock" steps. Without this guard, the caller cannot distinguish
  "locked what I expected" from "locked a different set."

---

### D-5 — Snapshot Status on Create

**Selected: CAPTURED directly on INSERT.**

| Field | Value |
|---|---|
| Decision | status = 'CAPTURED' explicitly on INSERT |
| Status | APPROVED |
| Prior auth | Single-write atomicity; no intermediate state needed |

Record:
- The `NetworkPoolDemandSnapshot` header must be inserted with `status: 'CAPTURED'` set
  explicitly in the Prisma `create({ data: { ... } })` call.
- Do not rely on the DB default `DRAFT`. Do not create a committed DRAFT snapshot
  and then update it to `CAPTURED` in the same transaction.
- The lock operation is atomic. The snapshot is either fully captured or not at all.
- A committed DRAFT snapshot inside a completed `$transaction` is semantically ambiguous
  and should never occur in this flow.
- Future snapshot status values (if any) are subject to separate design packets.

---

### D-6 — `snapshotRef` Generation

**Selected: `randomUUID()` from `'crypto'`.**

| Field | Value |
|---|---|
| Decision | randomUUID() from 'crypto' |
| Status | **FRESH PARESH APPROVAL** |
| Prior auth | None — new field, no existing generation pattern |

Record:
- `snapshotRef` is service-generated. It must not be caller-supplied.
- Generate using `randomUUID()` imported from `'crypto'`:
  ```typescript
  import { randomUUID } from 'crypto';
  // ...
  snapshotRef: randomUUID()
  ```
- This is consistent with the NC service layer convention established in
  `networkPool.service.ts` (line 29: `import { randomUUID } from 'crypto'`).
- Do not use `'node:crypto'` (aiEmitter pattern) — use the unprefixed form for NC services.
- Do not use a structured/human-readable key (e.g. `SNAP-{poolRef}-{timestamp}`).
  The unique constraint `(poolId, snapshotRef)` on `NetworkPoolDemandSnapshot` is the
  final collision backstop; UUID v4 makes collisions astronomically unlikely.
- `snapshotRef` fits within the `VarChar(100)` column constraint (UUID = 36 chars).
- `snapshotRef` must not be exposed in any response DTO.

---

### D-7 — `metadataInternalJson` Copy

**Selected: Copy from demand line into snapshot line; never expose in DTOs.**

| Field | Value |
|---|---|
| Decision | Copy metadataInternalJson into snapshot lines; exclude from all DTOs |
| Status | APPROVED |
| Prior auth | Audit fidelity principle; field is internal-only in both models |

Record:
- During snapshot line creation, `metadataInternalJson` from each source
  `NetworkPoolDemandLine` must be copied into the corresponding
  `NetworkPoolDemandSnapshotLine.metadataInternalJson`.
- Copying is correct because snapshot lines are immutable audit records. They must
  reflect the demand line exactly as it appeared at the moment of lock.
- If the source demand line has `metadataInternalJson = null`, the snapshot line
  must also have `metadataInternalJson = null`.
- `metadataInternalJson` must not appear in any service output DTO or route response.
- Snapshot header `metadataInternalJson` remains `null` in the first implementation
  unless separately authorized.

---

### D-8 — `DemandLineSnapshotBlockedError` Retention

**Selected: Retain with `@deprecated` JSDoc.**

| Field | Value |
|---|---|
| Decision | Retain; add @deprecated JSDoc if touched |
| Status | APPROVED |
| Prior auth | Route import is a hard constraint; route not in LOCK-SERVICE-001 allowlist |

Record:
- `DemandLineSnapshotBlockedError` must not be removed in the lock service packet
  (LOCK-SERVICE-001) or the lock route packet (LOCK-ROUTE-001).
- It must remain exported from `networkPoolDemandLine.service.ts` because the current
  route `poolDemandLines.ts` imports and maps it to HTTP 422 `DEMAND_SNAPSHOT_NOT_READY`.
- When the lock service file is edited in LOCK-SERVICE-001, add `@deprecated` JSDoc:
  ```typescript
  /**
   * @deprecated No longer thrown by lockDemandLinesForRfq.
   * Retained because poolDemandLines route imports and maps this class.
   * Remove in a future route-cleanup packet.
   */
  export class DemandLineSnapshotBlockedError extends Error { ... }
  ```
- Cleanup and removal require a later route-cleanup packet that is explicitly authorized
  to edit `poolDemandLines.ts`.

---

### D-9 — RFQ Sub-Flag Gate Packaging

**Selected: Separate feature sub-flag packet.**

| Field | Value |
|---|---|
| Decision | Implement ncPoolRfqFeatureGateMiddleware in a separate packet |
| Status | **FRESH PARESH APPROVAL** |
| Prior auth | TECS atomicity doctrine; consistent with how ncPoolFeatureGate was shipped |

Record:
- `ncPoolRfqFeatureGateMiddleware` (gate key `nc.procurement_pools.rfq.enabled` or
  repo-consistent equivalent) must be implemented in a separate, dedicated packet:
  ```
  TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-SUBFLAG-GATE-001
  ```
- This packet must not be merged into LOCK-ROUTE-001 unless Paresh separately authorizes
  a scope change via a new prompt.
- When the lock route is eventually implemented (LOCK-ROUTE-001), it must chain both:
  ```
  onRequest: [tenantAuthMiddleware, databaseContextMiddleware]
  preHandler: [ncPoolFeatureGateMiddleware, ncPoolRfqFeatureGateMiddleware]
  ```
- The sub-flag middleware does not exist in `server/src/**` at this decision record date
  (confirmed: 0 grep matches for `nc.procurement_pools.rfq`).
- Rationale: TECS atomicity doctrine (one prompt = one atomic concern). The sub-flag
  middleware has its own independent test surface (~10 unit tests). Merging it into
  LOCK-ROUTE-001 entangles two unrelated concerns in one packet.

---

### D-10 — Lock Response Shape

**Selected: Snapshot header only.**

| Field | Value |
|---|---|
| Decision | Snapshot header only; no lines in response |
| Status | **FRESH PARESH APPROVAL** |
| Prior auth | None — new API endpoint |

Record:
- `lockDemandLinesForRfq` returns a snapshot header summary only.
- The response must not include the full `NetworkPoolDemandSnapshotLine` array.
- Required response fields (snapshot header subset):
  ```
  id             — snapshot UUID
  snapshotRef    — service-generated UUID (not caller-supplied)
  snapshotVersion — integer version
  status         — 'CAPTURED'
  lineCount      — count of locked demand lines
  capturedAt     — timestamp
  capturedByUserId — user who triggered the lock
  ```
  Additional header fields may be included if they add caller value and contain no
  sensitive internal data. Final DTO shape is locked in LOCK-SERVICE-001.
- Excluded from response (non-exhaustive):
  - `metadataInternalJson` (snapshot header or any snapshot line)
  - `sourceMembershipId`
  - Member identities
  - Per-member quantities
  - Any snapshot line field
- Snapshot line read APIs are deferred. No GET snapshot lines endpoint is authorized
  by this packet or by LOCK-ROUTE-001.
- Rationale: The lock response confirms the lock succeeded. Full snapshot lines scale
  linearly with pool demand (potentially large payload). Lines are an internal audit
  record, not a v1 caller deliverable.

---

### D-11 — HTTP Response Code

**Selected: 201 Created.**

| Field | Value |
|---|---|
| Decision | 201 Created |
| Status | **FRESH PARESH APPROVAL** |
| Prior auth | Consistent with POST /demand-lines returning 201 |

Record:
- The future lock route (`POST /pools/:poolId/demand-lines/lock`) returns HTTP 201.
- HTTP 200 OK is not selected.
- Rationale: The lock action creates a `NetworkPoolDemandSnapshot` resource. HTTP 201
  is the semantically correct response for a resource-creating POST. This is consistent
  with the existing `createDemandLine` route which also returns 201.

---

### D-12 — Pool Lifecycle Coupling

**Selected: No lifecycle transition in lock v1.**

| Field | Value |
|---|---|
| Decision | No AGGREGATING → CLOSED_FOR_BIDS in lock v1 |
| Status | APPROVED — confirmed by prior decision record |
| Prior auth | TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001 D-8 (8878305) |

Record:
- `lockDemandLinesForRfq` must not transition the pool lifecycle state.
- There is no automatic `AGGREGATING → CLOSED_FOR_BIDS` transition in the lock action.
- Pool lifecycle coupling belongs to a future RFQ-issuance design packet.
  It is not authorized by this decision record or any lock implementation packet.
- `StateMachineService` must not be called or injected in LOCK-SERVICE-001.
- The pool remains in state `AGGREGATING` after a successful lock. This is an authorized
  intermediate state: demand lines are locked for RFQ, but no RFQ has been issued yet.

---

### D-13 — `NetworkLifecycleLog` Write

**Selected: No `NetworkLifecycleLog` write in lock v1.**

| Field | Value |
|---|---|
| Decision | No NetworkLifecycleLog write in lock action |
| Status | APPROVED — architecture invariant confirmed |
| Prior auth | StateMachineService is the exclusive writer; state-transition-only scope confirmed |

Record:
- `lockDemandLinesForRfq` must not write to `NetworkLifecycleLog`.
- `NetworkLifecycleLog` is written exclusively by `StateMachineService.transition()`.
  No service, route, or event handler may write to this table outside of
  `StateMachineService.transition()`.
- A DB immutability trigger is live on `network_lifecycle_logs` (deployed at `6174d31`).
  Any erroneous write outside the authorized path would be irreversible.
- The audit trail for the lock action is:
  - `NetworkPoolDemandSnapshot` header record (capturedAt, capturedByUserId, capturedReason, status)
  - `NetworkPoolDemandSnapshotLine` records (one per locked demand line)
- Future `DemandLineStatusTransition` records may be added by a separate audit-trail
  design packet if needed. Not in scope for v1.

---

### D-14 — Implementation Sequence

**Selected: 5-packet sequence.**

| Field | Value |
|---|---|
| Decision | 5-packet sequence as specified |
| Status | APPROVED |
| Prior auth | LOCK-DESIGN-001 §14 + audit confirmation |

Record:
The following sequence is the only authorized implementation order for the lock feature.
No packet may begin before its predecessor is committed.

| Step | Packet | Allowlist (Modify) | Commit message |
|---|---|---|---|
| 1 | **TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001** | governance/…DECISION-RECORD-001.md (NEW) | `docs(network-commerce): record demand line lock decisions` |
| 2 | **TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-SERVICE-001** | server/src/services/networkPoolDemandLine.service.ts, server/src/__tests__/networkPoolDemandLine.service.unit.test.ts | `feat(network-commerce): implement lockDemandLinesForRfq service` |
| 3 | **TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-SUBFLAG-GATE-001** | server/src/middleware/ncPoolRfqFeatureGate.middleware.ts (NEW), server/src/__tests__/ncPoolRfqFeatureGate.middleware.unit.test.ts (NEW) | `feat(network-commerce): add RFQ sub-flag feature gate middleware` |
| 4 | **TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-ROUTE-001** | server/src/routes/tenant/poolDemandLines.ts, server/src/routes/tenant/pools.demandLines.integration.test.ts | `feat(network-commerce): add lock demand lines for RFQ route` |
| 5 | **TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-PROD-VERIFY-GOV-CLOSE-001** | governance/…VERIFY-GOV-CLOSE-001.md (NEW), governance/control/* | `docs(network-commerce): verify demand line lock and close governance` |

Merge option (Steps 3 + 4): Steps 3 and 4 may be merged ONLY if Paresh explicitly authorizes
a scope change via a new prompt. The default sequence is the 5-packet form above.

---

## 4. Implementation Boundary for LOCK-SERVICE-001

The next authorized packet (`TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-SERVICE-001`)
may implement ONLY the following:

### Authorized scope for LOCK-SERVICE-001

| Item | Details |
|---|---|
| Service method | `lockDemandLinesForRfq(input: LockDemandLinesInput): Promise<LockDemandLinesOutput>` in `networkPoolDemandLine.service.ts` |
| Input interface | `LockDemandLinesInput` — `{ poolId, ownerOrgId, capturedByUserId, capturedReason?, expectedLineIds? }` |
| Output interface | `LockDemandLinesOutput` — snapshot header summary (see D-10 for required fields) |
| Service error classes (NEW) | `DemandLineLockPoolStateError`, `DemandLineNoActiveLinesError`, `DemandLineLockConflictError`, `DemandLineSetChangedError` (names may vary within repo convention) |
| `DemandLineSnapshotBlockedError` | Add `@deprecated` JSDoc if file is touched (D-8) |
| Unit tests | `server/src/__tests__/networkPoolDemandLine.service.unit.test.ts` — new lock tests only |

### Service implementation constraints

- `lockDemandLinesForRfq` must execute atomically in a `prisma.$transaction(async tx => {...})`.
- `opts.db` shared-transaction injection pattern is authorized (consistent with `stateMachine.service.ts`).
- The transaction must:
  1. Fetch pool with lifecycle state — gate on AGGREGATING (D-2)
  2. Fetch ACTIVE demand lines with `findMany({ where: { poolId, status: 'ACTIVE' } })`
  3. Guard: if no ACTIVE lines, throw `DemandLineNoActiveLinesError` (D-3)
  4. If `expectedLineIds` provided, compare sets; throw `DemandLineSetChangedError` on mismatch (D-4)
  5. Compute `snapshotVersion = (count of existing snapshots for pool) + 1`
  6. Insert `NetworkPoolDemandSnapshot` with `status: 'CAPTURED'` and `snapshotRef: randomUUID()` (D-5, D-6)
  7. Insert `NetworkPoolDemandSnapshotLine` records (one per ACTIVE line), copying `metadataInternalJson` (D-7)
  8. Update each ACTIVE demand line to `status: 'LOCKED_FOR_RFQ'` and set `lockedAt`
  9. Return snapshot header summary (D-10)
- Race backstop: unique constraint `(poolId, snapshotVersion)` → P2002 → `DemandLineLockConflictError` → future route maps to 409 (D-2 / Q-2 from audit)
- Do not call `StateMachineService` (D-12)
- Do not write `NetworkLifecycleLog` (D-13)
- Do not inject or reference any route, middleware, RFQ service, or supplier service
- `orgId` must always come from `ownerOrgId` (input from authenticated context — never caller-supplied in route layer per D-017-A doctrine)

### LOCK-SERVICE-001 must NOT implement

- RFQ sub-flag middleware (`ncPoolRfqFeatureGateMiddleware`) — D-9: separate packet
- Lock route registration — D-14: separate packet (LOCK-ROUTE-001)
- Route integration tests — D-14: separate packet (LOCK-ROUTE-001)
- Schema or migration changes — schema is already deployed (`a4dcabe`, `6174d31`)
- RFQ schema, RFQ routes, supplier quote routes
- Allocation, order placement, invoice generation, settlement, escrow
- Pool lifecycle transition (AGGREGATING → CLOSED_FOR_BIDS) — D-12: deferred
- MakerChecker changes
- UI changes
- Governance control active-state changes
- DPP state changes

---

## 5. Forbidden Implementation Scope (All Packets)

The following are explicitly forbidden by this decision record and by all downstream
implementation packets unless separately authorized by Paresh via a new prompt:

| Forbidden action | Reason |
|---|---|
| Service implementation by this packet | This packet is a decision record only |
| Route implementation by this packet | This packet is a decision record only |
| Middleware implementation by this packet | This packet is a decision record only |
| Schema or migration changes | Schema is live (`a4dcabe`, `6174d31`); no changes needed |
| Tests other than future authorized implementation tests | Tests belong to LOCK-SERVICE-001 and LOCK-ROUTE-001 |
| UI changes | Not in scope for any lock packet |
| RFQ schema / RFQ route implementation | Separate future design + packet |
| Supplier quote routes | Separate future design + packet |
| Allocation / order placement | Separate future design + packet |
| Invoice generation / settlement / escrow | Separate future design + packet |
| MakerChecker changes | Not in scope |
| Governance control active-state changes | Control files read; not modified |
| DPP active-state changes | `active_delivery_unit: HOLD_FOR_AUTHORIZATION`; must NOT be touched |
| Pool lifecycle transition (AGGREGATING → CLOSED_FOR_BIDS) | Deferred to RFQ-issuance packet (D-12) |
| NetworkLifecycleLog write outside StateMachineService | Architecture invariant (D-13) |
| Removal of DemandLineSnapshotBlockedError | Route import constraint (D-8) |
| Snapshot line read API | Not authorized for v1 (D-10) |
| expected_line_ids partial selection | This field is an optimistic safety check only (D-4) |

---

## 6. Fresh Paresh Approvals Summary

The following 5 decisions required and received fresh Paresh approval in this record:

| Decision | Topic | Approved resolution |
|---|---|---|
| D-4 | `expected_line_ids` optional field | Include as optional; omit = lock all ACTIVE; mismatch → 409 |
| D-6 | `snapshotRef` generation | `randomUUID()` from `'crypto'`; service-generated; not caller-supplied |
| D-9 | RFQ sub-flag gate packaging | Separate packet (FEATURE-SUBFLAG-GATE-001); do not merge into LOCK-ROUTE-001 |
| D-10 | Lock response shape | Snapshot header only; no snapshot lines; no metadataInternalJson |
| D-11 | HTTP response code | 201 Created |

---

## 7. All 14 Decisions — Closed Record

| # | Decision | Selected resolution | Status |
|---|---|---|---|
| D-1 | Lock ownership authority | OWNER + ADMIN only; MEMBER → 403 | APPROVED |
| D-2 | Pool state gate | AGGREGATING only; other states → 422 INVALID_STATE | APPROVED |
| D-3 | Eligible demand lines | ACTIVE only; zero ACTIVE → error, no snapshot | APPROVED |
| D-4 | `expected_line_ids` | Optional; mismatch → 409 DEMAND_LINE_SET_CHANGED; omit = lock all ACTIVE | **FRESH PARESH APPROVAL** |
| D-5 | Snapshot status on create | status = 'CAPTURED' explicitly on INSERT | APPROVED |
| D-6 | `snapshotRef` generation | `randomUUID()` from `'crypto'`; service-generated | **FRESH PARESH APPROVAL** |
| D-7 | `metadataInternalJson` copy | Copy into snapshot lines; never expose in DTOs | APPROVED |
| D-8 | `DemandLineSnapshotBlockedError` | Retain; add `@deprecated` JSDoc when touched | APPROVED |
| D-9 | RFQ sub-flag gate packaging | Separate packet FEATURE-SUBFLAG-GATE-001 | **FRESH PARESH APPROVAL** |
| D-10 | Lock response shape | Snapshot header only; no lines in response | **FRESH PARESH APPROVAL** |
| D-11 | HTTP response code | 201 Created | **FRESH PARESH APPROVAL** |
| D-12 | Pool lifecycle coupling | No AGGREGATING → CLOSED_FOR_BIDS in lock v1 | APPROVED |
| D-13 | `NetworkLifecycleLog` write | No write; snapshot is the audit trail | APPROVED |
| D-14 | Implementation sequence | DECISION-RECORD → SERVICE → SUBFLAG-GATE → ROUTE → VERIFY-GOV-CLOSE | APPROVED |

---

## 8. Next Packet Authorization

**Next authorized packet:**
```
TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-SERVICE-001
```

**Authorization status:** AUTHORIZED upon commit of this decision record.

**Allowlist (Modify):**
```
server/src/services/networkPoolDemandLine.service.ts
server/src/__tests__/networkPoolDemandLine.service.unit.test.ts
```

**Read-only (allowed, not modified):**
```
server/prisma/schema.prisma
server/src/services/stateMachine.service.ts
server/src/services/networkPool.service.ts
server/src/routes/tenant/poolDemandLines.ts
governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001.md
governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DESIGN-001.md
governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-AUDIT-001.md
```

**Commit message for LOCK-SERVICE-001:**
```
feat(network-commerce): implement lockDemandLinesForRfq service
```

**LOCK-SERVICE-001 does NOT authorize:**
RFQ sub-flag middleware, lock route, route integration tests, schema changes, migrations,
RFQ schema, RFQ routes, supplier routes, allocation, order placement, invoice generation,
settlement, escrow, UI, MakerChecker, pool lifecycle transition, NetworkLifecycleLog write,
governance control active-state changes, DPP state changes.

---

## Appendix A — Design Chain State at Decision Record Time

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
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-AUDIT-001 | d53ca96 | CLOSED |
| **TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001** | *this commit* | **CLOSED** |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-SERVICE-001 | — | **AUTHORIZED — NEXT** |
| TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-SUBFLAG-GATE-001 | — | NOT AUTHORIZED YET |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-ROUTE-001 | — | NOT AUTHORIZED YET |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-PROD-VERIFY-GOV-CLOSE-001 | — | NOT AUTHORIZED YET |
