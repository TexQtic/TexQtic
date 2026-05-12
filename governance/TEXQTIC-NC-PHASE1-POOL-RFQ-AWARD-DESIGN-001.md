# TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001

**Network Commerce Phase 1D — Quote Award / Acceptance / Rejection / Allocation Design**

| Field | Value |
|---|---|
| Packet ID | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001 |
| Phase | NC Phase 1D |
| Type | GOVERNANCE / DESIGN — read-only authority source |
| Status | DESIGN_COMPLETE |
| Author | TexQtic Platform Engineering (Safe-Write Mode) |
| Date | 2026-06-05 |
| Doctrine | TexQtic Doctrine v1.4 + AGENTS.md |
| Authority predecessors | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001 (Packet 12) · TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-ROUTE-001 (Packet 13) · TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001 (FE-8) |
| Repo HEAD at design time | `3880ab3` (tracker appendix reconciled after FE-8) |

> **GOVERNANCE MODE: This packet produces a design document only.**
> No runtime source code, schema, migration, test, `.env`, or feature flag change is produced.
> Implementation is deferred to the three downstream implementation packets defined in §15.

---

## Table of Contents

1. [Current Repo-Truth Baseline](#1-current-repo-truth-baseline)
2. [Phase 1D Scope and Boundary](#2-phase-1d-scope-and-boundary)
3. [Award and Rejection Semantics](#3-award-and-rejection-semantics)
4. [Quote Status Machine Extension](#4-quote-status-machine-extension)
5. [Pool and RFQ Lifecycle State Transitions](#5-pool-and-rfq-lifecycle-state-transitions)
6. [Schema Requirements for Phase 1D Implementation](#6-schema-requirements-for-phase-1d-implementation)
7. [Service Interfaces and DTOs](#7-service-interfaces-and-dtos)
8. [Service Contract](#8-service-contract)
9. [Error Classes](#9-error-classes)
10. [API Route Contract](#10-api-route-contract)
11. [Feature Flag Design](#11-feature-flag-design)
12. [RLS and Privacy Design](#12-rls-and-privacy-design)
13. [QD-6 Posture and Award Flag Independence](#13-qd-6-posture-and-award-flag-independence)
14. [FE-9 Dependency Contract](#14-fe-9-dependency-contract)
15. [Packet Decomposition](#15-packet-decomposition)
16. [Design Decision Log (AD-1 through AD-13)](#16-design-decision-log)

---

## §1 — Current Repo-Truth Baseline

### 1.1 Phase 1C Completion State (HEAD `3880ab3`)

Phase 1C (Supplier Quote) is VERIFIED_COMPLETE. The following is the repo-truth baseline that Phase 1D extends:

**Schema (deployed to production Supabase):**

- `network_pool_rfq_supplier_quotes` — 19 columns, live in production.
- `status` DB CHECK: `SUBMITTED | WITHDRAWN` (Phase 1D must extend this).
- No accepted/rejected lifecycle audit columns exist (Phase 1D must add them).
- `UNIQUE(invite_id)` — non-partial. One quote row per invite, ever (QD-2 maintained through Phase 1D).

**Service (`server/src/services/networkPoolRfq.service.ts`):**

- `submitQuote(orgId, userId, inviteId, input)` — creates quote row, transitions RFQ ISSUED → QUOTED (direct update, QD-8), writes lifecycle log.
- `getSupplierQuote(orgId, inviteId)` — supplier-scoped read. Returns `NetworkPoolRfqSupplierQuoteSupplierRecord`.
- `toQuoteSupplierRecord(row)` — supplier-safe DTO mapper. Excludes `metadataInternalJson`, `ownerOrgId`, `rfqId`, `poolId`, `supplierOrgId`.
- **No owner-facing quote methods exist.** `toQuoteOwnerRecord` not yet implemented.

**Routes (`server/src/routes/tenant/poolRfqSupplierQuotes.ts`):**

- `GET /supplier-rfq-invites/:inviteId/quote` — supplier GET route.
- `POST /supplier-rfq-invites/:inviteId/quote` — supplier POST route.
- Both gated by `ncPoolSupplierQuoteFeatureGateMiddleware` (flag: `nc.procurement_pools.supplier_quotes.enabled = false`, QD-6 hold).
- **No owner award or quote list routes exist.**

**Routes (`server/src/routes/tenant/poolRfq.ts`):**

- 5 existing routes: `POST /:poolId/rfq/issue`, `POST /:poolId/rfq/:rfqId/invites`, `GET /:poolId/rfq/:rfqId/invites`, `GET /:poolId/rfq/:rfqId/invites/:inviteId`, `POST /:poolId/rfq/:rfqId/invites/:inviteId/cancel`.
- **No quote list or award routes exist.**

**Pool Lifecycle States (seeded, `20260523000000_nc_pool_lifecycle_seed`):**

States in `lifecycle_states` (entity_type='POOL'): DRAFT, OPEN, AGGREGATING, CLOSED_FOR_BIDS, QUOTED, ACCEPTED, ALLOCATING, ALLOCATED, ORDERED, IN_FULFILMENT, PARTIALLY_DELIVERED, DELIVERED, SETTLEMENT_PENDING, SETTLED, REJECTED, WITHDRAWN, CANCELLED.

Relevant allowed_transitions:
```
CLOSED_FOR_BIDS → QUOTED    ← not yet triggered (pool stays CLOSED_FOR_BIDS through Phase 1C)
QUOTED          → ACCEPTED  ← Phase 1D: acceptQuote triggers this
QUOTED          → REJECTED  ← future terminal path (deferred beyond Phase 1D)
ACCEPTED        → ALLOCATING ← future (Phase 1E+)
```

**Current pool lifecycle state in QA data:** `CLOSED_FOR_BIDS`
Pool `c108335e` is at `CLOSED_FOR_BIDS`. RFQ `ba47b303` is at status `ISSUED` (no quote has been submitted yet — QD-6 flag is false).

**RFQ Status Enumeration (DB CHECK):** `ISSUED | QUOTED | ACCEPTED | REJECTED | EXPIRED | CANCELLED`.
- ACCEPTED and REJECTED already exist in the DB CHECK constraint for `network_pool_rfqs.status`.

**Feature flags (production state):**
- `nc.procurement_pools.enabled = true`
- `nc.procurement_pools.rfq.enabled = true`
- `nc.procurement_pools.supplier_invites.enabled = true`
- `nc.procurement_pools.supplier_quotes.enabled = false` ← QD-6 hold, unchanged through Phase 1D.
- `nc.procurement_pools.rfq.award.enabled` — **does not exist yet; Phase 1D schema migration seeds it as `false`**.

---

## §2 — Phase 1D Scope and Boundary

### 2.1 In Scope

| Surface | Description |
|---|---|
| Schema migration | Extend quote `status` CHECK; add `accepted_at`, `rejected_at`, `reject_reason` columns; seed `nc.procurement_pools.rfq.award.enabled = false` |
| Service: `listOwnerQuotes` | Owner reads all quotes for one RFQ (all statuses) |
| Service: `acceptQuote` | Owner accepts one SUBMITTED quote → award; atomic mass-reject of all other SUBMITTED quotes for the same RFQ |
| Service: `rejectQuote` | Owner rejects one SUBMITTED quote; RFQ and pool state unchanged |
| Route: GET quotes list | `GET /:poolId/rfq/:rfqId/quotes` (owner-only) |
| Route: POST accept | `POST /:poolId/rfq/:rfqId/quotes/:quoteId/accept` (owner-only) |
| Route: POST reject | `POST /:poolId/rfq/:rfqId/quotes/:quoteId/reject` (owner-only) |
| Feature flag middleware | `ncPoolRfqAwardFeatureGateMiddleware` (new, gates award routes independently of supplier_quotes) |
| Pool lifecycle transition | CLOSED_FOR_BIDS → QUOTED → ACCEPTED (via StateMachineService inside acceptQuote transaction) |
| RFQ status transition | QUOTED → ACCEPTED (direct DB update inside acceptQuote transaction, consistent with QD-8) |

### 2.2 Explicitly Out of Scope for Phase 1D

| Surface | Deferred To |
|---|---|
| ALLOCATING / ALLOCATED pool lifecycle states | Phase 1E+ (ALLOCATION-001) |
| `NetworkPool.allocatedAt` field mutation | Phase 1E+ |
| Bulk RFQ rejection path (`rejectAllQuotes`, pool → REJECTED terminal) | Phase 1E+ or separate packet |
| Supplier re-quoting after WITHDRAWN/REJECTED | Phase 1E+ (QD-2 non-partial unique stays) |
| Order creation, settlement, invoice | Phase 1E+ |
| OES / VCO broadening | Out of scope |
| DPP Passport Network | Separate decision (HOLD_FOR_PARESH_DECISION) |
| FE-9 implementation | HOLD — depends on AWARD-ROUTE-001 VERIFIED_COMPLETE + explicit Paresh authorization |
| `nc.procurement_pools.supplier_quotes.enabled` activation | Separate explicit Paresh decision (QD-6 hold maintained) |

---

## §3 — Award and Rejection Semantics

### 3.1 Award Exclusivity

**AD-1**: One ACCEPTED quote per RFQ. When the pool owner accepts quote `X` for RFQ `Y`, all other quotes for RFQ `Y` that are currently `SUBMITTED` are bulk-rejected atomically within the same database transaction. This prevents two ACCEPTED quotes from existing on the same RFQ.

Invariant: `COUNT(status='ACCEPTED') <= 1` per RFQ at all times.

### 3.2 Accept Semantics

The `acceptQuote` operation:
- Is owner-only. Only the pool owner org (`ownerOrgId`) may call it.
- Operates only on quotes in `SUBMITTED` status. A quote that is `WITHDRAWN` or `REJECTED` cannot be accepted.
- Is idempotent by design — if the calling route receives a duplicate request (same quoteId, same idempotency key), the service detects the quote is already `ACCEPTED` and returns `NetworkPoolRfqSupplierQuoteNotInSubmittedError` (422). The award is not re-applied.
- Triggers atomic pool lifecycle transition: CLOSED_FOR_BIDS → QUOTED → ACCEPTED (or QUOTED → ACCEPTED if pool is already QUOTED from a future intermediate step). See §5.2.

### 3.3 Reject Semantics

The `rejectQuote` operation:
- Is owner-only.
- Rejects only the single specified quote (`SUBMITTED → REJECTED`). Other quotes for the same RFQ are not affected.
- Does **not** change RFQ status or pool lifecycle state. The RFQ remains `QUOTED` and the pool remains `CLOSED_FOR_BIDS`. Other SUBMITTED quotes for the same RFQ remain available for the owner to accept or reject.
- Is not a terminal operation for the RFQ — after rejecting a quote, the owner may still accept another SUBMITTED quote.

### 3.4 Supplier Cannot Withdraw After Award

**AD-2**: The existing `withdrawQuote` service method (if designed in a future Phase 1D supplier-side update) MUST gate on quote status being `SUBMITTED`. Since `submitQuote` currently does not implement `withdrawQuote` (that would be Phase 1D), this invariant is to be enforced when that method is added: once a quote is `ACCEPTED`, it cannot be withdrawn. Once `REJECTED`, it cannot be withdrawn.

This is guaranteed by the quote status machine in §4 — ACCEPTED and REJECTED are terminal statuses.

### 3.5 No Re-Quoting After Rejection (QD-2 Maintained)

**AD-3**: The existing non-partial `UNIQUE(invite_id)` constraint on `network_pool_rfq_supplier_quotes` is NOT relaxed in Phase 1D. A supplier whose quote is `REJECTED` or `WITHDRAWN` cannot re-submit a new quote for the same invite. Re-quoting is deferred to Phase 1E+ (partial unique WHERE status='SUBMITTED' relaxation).

---

## §4 — Quote Status Machine Extension

### 4.1 Extended State Machine

Phase 1C state machine:
```
(none) ──[submitQuote]──► SUBMITTED ──[withdrawQuote/future]──► WITHDRAWN
```

Phase 1D extension:
```
                                ┌──[owner rejectQuote]──► REJECTED (terminal)
                                │
SUBMITTED ──[owner acceptQuote]──► ACCEPTED (terminal)
     │
     └──[owner mass-reject on another quote accepted]──► REJECTED (terminal)
     │
     └──[supplier withdrawQuote/future]──► WITHDRAWN (existing, terminal)
```

**Terminal statuses:** ACCEPTED, REJECTED, WITHDRAWN. No transitions out of any of these.

### 4.2 Status Values (after Phase 1D migration)

DB CHECK constraint after Phase 1D migration:
```
status CHECK (status IN ('SUBMITTED', 'WITHDRAWN', 'ACCEPTED', 'REJECTED'))
```

### 4.3 Mass-Reject on Accept

When quote `X` is accepted for RFQ `Y`:
- Quote `X`: `SUBMITTED → ACCEPTED`
- All other quotes for RFQ `Y` where `status = 'SUBMITTED'`: bulk update `status = 'REJECTED'`, `rejected_at = now()`
- Quotes already in WITHDRAWN state for RFQ `Y` are left unchanged.

---

## §5 — Pool and RFQ Lifecycle State Transitions

### 5.1 RFQ Status (direct DB update, consistent with QD-8)

Phase 1C established the pattern of direct `tx.networkPoolRfq.update()` for RFQ status changes (no SM call for RFQ). Phase 1D extends this:

| Trigger | From | To | Who |
|---|---|---|---|
| `submitQuote` (Phase 1C) | ISSUED | QUOTED | Supplier (indirect: first quote submitted) |
| `acceptQuote` (Phase 1D) | QUOTED | ACCEPTED | Owner |
| `rejectAllQuotes` (deferred) | QUOTED | REJECTED | Owner |

RFQ status NEVER changed by `rejectQuote` (single quote rejection). The RFQ stays `QUOTED` when one quote is rejected but others remain.

### 5.2 Pool Lifecycle State (StateMachineService)

**AD-4**: Phase 1C did not transition the pool out of `CLOSED_FOR_BIDS`. The pool lifecycle seed allows:
- `CLOSED_FOR_BIDS → QUOTED` (allowed_transitions entry exists)
- `QUOTED → ACCEPTED` (allowed_transitions entry exists)

Direct `CLOSED_FOR_BIDS → ACCEPTED` transition does NOT exist in allowed_transitions and cannot be used.

**acceptQuote pool transition path:**

```
CLOSED_FOR_BIDS ──[SM.transition]──► QUOTED ──[SM.transition]──► ACCEPTED
```

Both transitions are executed within a single `db.$transaction()`. The service must:
1. Detect the current pool state (CLOSED_FOR_BIDS or QUOTED — the latter is valid if future intermediate steps transition it).
2. If CLOSED_FOR_BIDS: call `SM.transition(tx, POOL, poolId, CLOSED_FOR_BIDS → QUOTED)`, then update `pool.lifecycleStateId = quotedState.id`.
3. Call `SM.transition(tx, POOL, poolId, QUOTED → ACCEPTED)`, then update `pool.lifecycleStateId = acceptedState.id`.

**AD-5**: `rejectQuote` (single quote rejection) does NOT transition the pool. Pool remains `CLOSED_FOR_BIDS`. The lifecycle log writes `from = CLOSED_FOR_BIDS, to = CLOSED_FOR_BIDS` (consistent with QD-7 / OD-7 pattern for non-state-changing events).

### 5.3 Lifecycle Log Pattern for Phase 1D

| Operation | actorType | actorRole | from | to | mechanism |
|---|---|---|---|---|---|
| `acceptQuote` pool transition (×2 SM calls) | TENANT_ADMIN | NC_POOL_ADMIN | CLOSED_FOR_BIDS→QUOTED, QUOTED→ACCEPTED | (as above) | StateMachineService.transition() |
| `acceptQuote` award event log | TENANT_ADMIN | NC_POOL_ADMIN | ACCEPTED | ACCEPTED | direct tx.networkLifecycleLog.create() |
| `rejectQuote` rejection event log | TENANT_ADMIN | NC_POOL_ADMIN | CLOSED_FOR_BIDS | CLOSED_FOR_BIDS | direct tx.networkLifecycleLog.create() |

The award event log in `acceptQuote` records the specific quote accepted and the mass-reject count for audit purposes.

---

## §6 — Schema Requirements for Phase 1D Implementation

> This section specifies the DDL and Prisma schema changes required. These changes are NOT applied
> in this governance packet — they are applied in AWARD-SCHEMA-001 (see §15).

### 6.1 DDL Changes to `network_pool_rfq_supplier_quotes`

```sql
-- 1. Extend status CHECK constraint (drop old, add new)
ALTER TABLE network_pool_rfq_supplier_quotes
  DROP CONSTRAINT IF EXISTS network_pool_rfq_supplier_quotes_status_check;

ALTER TABLE network_pool_rfq_supplier_quotes
  ADD CONSTRAINT network_pool_rfq_supplier_quotes_status_check
    CHECK (status IN ('SUBMITTED', 'WITHDRAWN', 'ACCEPTED', 'REJECTED'));

-- 2. Add audit columns for Phase 1D award/rejection events
ALTER TABLE network_pool_rfq_supplier_quotes
  ADD COLUMN IF NOT EXISTS accepted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;
```

### 6.2 Feature Flag Seed

```sql
INSERT INTO feature_flags (key, enabled, description)
VALUES (
  'nc.procurement_pools.rfq.award.enabled',
  false,
  'NC Phase 1: pool RFQ award / quote acceptance feature — global enable'
)
ON CONFLICT (key) DO NOTHING;
```

### 6.3 Prisma Schema Additions (`server/prisma/schema.prisma`)

In `NetworkPoolRfqSupplierQuote` model, add after `withdrawReason`:

```prisma
acceptedAt   DateTime? @map("accepted_at")  @db.Timestamptz(6)
rejectedAt   DateTime? @map("rejected_at")  @db.Timestamptz(6)
rejectReason String?   @map("reject_reason") @db.Text
```

### 6.4 Migration Naming Convention

Following established NC migration naming:
- `20260533000000_nc_pool_rfq_supplier_quote_award_schema` — DDL changes (§6.1)
- `20260534000000_nc_pool_rfq_award_feature_flag_seed` — feature flag seed (§6.2)

> **Note:** Migration numbers must use the next available sequence. Verify with
> `Get-ChildItem server/prisma/migrations -Directory | Sort-Object Name | Select-Object -Last 3`
> before implementation.

---

## §7 — Service Interfaces and DTOs

### 7.1 `NetworkPoolRfqSupplierQuoteOwnerRecord`

Owner-safe quote DTO. Excludes `metadataInternalJson` (ops-only), `withdrawReason` (supplier-internal).

```typescript
export interface NetworkPoolRfqSupplierQuoteOwnerRecord {
  id:                    string;
  owner_org_id:          string;
  supplier_org_id:       string;
  rfq_id:                string;
  pool_id:               string;
  invite_id:             string;
  quote_ref:             string;
  status:                string;   // SUBMITTED | WITHDRAWN | ACCEPTED | REJECTED
  quote_amount:          string;   // Decimal serialised as string
  currency:              string;
  validity_until:        string | null;
  supplier_note:         string | null;
  submitted_at:          string;   // ISO 8601
  submitted_by_user_id:  string | null;
  withdrawn_at:          string | null;
  accepted_at:           string | null;  // Phase 1D addition
  rejected_at:           string | null;  // Phase 1D addition
  reject_reason:         string | null;  // Phase 1D addition
  created_at:            string;
  updated_at:            string;
}
```

Fields excluded from owner DTO:
- `metadataInternalJson` — ops-only, never exposed (QD-5).
- `withdrawReason` — supplier-internal; owner does not need supplier's withdrawal narrative.

### 7.2 `AcceptQuoteInput`

```typescript
export interface AcceptQuoteInput {
  request_id?: string | null;
}
```

No `accept_reason` field in Phase 1D — the accept event is self-documenting. `request_id` is for idempotency logging.

### 7.3 `RejectQuoteInput`

```typescript
export interface RejectQuoteInput {
  reject_reason?: string | null;
  request_id?:    string | null;
}
```

### 7.4 `toQuoteOwnerRecord` private helper

To be added to `NetworkPoolRfqService`:

```typescript
private toQuoteOwnerRecord(row: Record<string, unknown>): NetworkPoolRfqSupplierQuoteOwnerRecord {
  return {
    id:                   String(row['id']),
    owner_org_id:         String(row['ownerOrgId']),
    supplier_org_id:      String(row['supplierOrgId']),
    rfq_id:               String(row['rfqId']),
    pool_id:              String(row['poolId']),
    invite_id:            String(row['inviteId']),
    quote_ref:            String(row['quoteRef']),
    status:               String(row['status']),
    quote_amount:         String(row['quoteAmount']),
    currency:             String(row['currency']),
    validity_until:       row['validityUntil'] != null
      ? new Date(row['validityUntil'] as string | Date).toISOString()
      : null,
    supplier_note:        row['supplierNote'] != null ? String(row['supplierNote']) : null,
    submitted_at:         new Date(row['submittedAt'] as string | Date).toISOString(),
    submitted_by_user_id: row['submittedByUserId'] != null
      ? String(row['submittedByUserId'])
      : null,
    withdrawn_at:         row['withdrawnAt'] != null
      ? new Date(row['withdrawnAt'] as string | Date).toISOString()
      : null,
    accepted_at:          row['acceptedAt'] != null
      ? new Date(row['acceptedAt'] as string | Date).toISOString()
      : null,
    rejected_at:          row['rejectedAt'] != null
      ? new Date(row['rejectedAt'] as string | Date).toISOString()
      : null,
    reject_reason:        row['rejectReason'] != null ? String(row['rejectReason']) : null,
    created_at:           new Date(row['createdAt'] as string | Date).toISOString(),
    updated_at:           new Date(row['updatedAt'] as string | Date).toISOString(),
  };
}
```

---

## §8 — Service Contract

### 8.1 `listOwnerQuotes`

```typescript
async listOwnerQuotes(
  ownerOrgId: string,
  poolId:     string,
  rfqId:      string,
): Promise<NetworkPoolRfqSupplierQuoteOwnerRecord[]>
```

**Behaviour:**
1. No pool or RFQ state check — this is a read-only operation valid in any pool/RFQ state.
2. Query: `networkPoolRfqSupplierQuote.findMany({ where: { ownerOrgId, poolId, rfqId }, orderBy: { submittedAt: 'desc' } })`.
3. Returns all quotes regardless of status (SUBMITTED, WITHDRAWN, ACCEPTED, REJECTED).
4. Returns `[]` (empty array) when no quotes exist — not a 404.
5. All rows mapped through `toQuoteOwnerRecord` — no `metadataInternalJson`, no `withdrawReason`.
6. No join to supplier org — supplier name is not in this DTO (Phase 1D; may be added in FE-9 if needed via separate lookup).

**Errors:** None (read-only; returns empty array if RFQ/pool not found rather than 404, to avoid leaking org scoping information).

> AD-6: Whether to return 404 when poolId/rfqId belongs to a different owner vs. empty array is
> a security tradeoff. Defense-in-depth recommendation: return empty array in all cases where no
> quotes found under the given ownerOrgId scope. The route layer already validates poolId/rfqId
> params via UUID schema; org scoping in the query provides the actual gate.

### 8.2 `acceptQuote`

```typescript
async acceptQuote(
  ownerOrgId: string,
  userId:     string | null,
  poolId:     string,
  rfqId:      string,
  quoteId:    string,
  input:      AcceptQuoteInput,
): Promise<NetworkPoolRfqSupplierQuoteOwnerRecord>
```

**Pre-transaction validation (fast, before DB):**
- `poolId`, `rfqId`, `quoteId` must be non-empty UUIDs.

**Transaction steps:**

```
1. Load pool: { id: poolId, orgId: ownerOrgId }, include: { lifecycleState: { select: { stateKey, id } } }
   → NetworkPoolRfqPoolNotFoundError if missing.

2. Pool lifecycleState.stateKey must be 'CLOSED_FOR_BIDS' or 'QUOTED'.
   → NetworkPoolRfqInvalidPoolStateError if neither.

3. Load RFQ: { id: rfqId, poolId, ownerOrgId }, select: { id, status }
   → NetworkPoolRfqRfqNotFoundError if missing.
   RFQ status must be 'QUOTED'.
   → NetworkPoolRfqTransitionDeniedError('RFQ status must be QUOTED to accept a quote') if not.

4. Load quote: { id: quoteId, rfqId, ownerOrgId }, select all columns
   → NetworkPoolRfqOwnerQuoteNotFoundError if missing.
   Quote status must be 'SUBMITTED'.
   → NetworkPoolRfqSupplierQuoteNotInSubmittedError if not.

5. const now = new Date();

6. Update accepted quote: { status: 'ACCEPTED', acceptedAt: now, updatedAt: now }

7. Bulk update all other SUBMITTED quotes for this rfqId:
   updateMany({ where: { rfqId, ownerOrgId, status: 'SUBMITTED', id: { not: quoteId } },
                data:  { status: 'REJECTED', rejectedAt: now, updatedAt: now } })
   (No rejectReason on mass-reject rows — only individual rejectQuote sets reason.)

8. Update RFQ: { status: 'ACCEPTED', updatedAt: now }
   (Direct update, consistent with QD-8. No SM call for RFQ.)

9. If pool.lifecycleState.stateKey === 'CLOSED_FOR_BIDS':
     quotedState = await stateMachine.transition(tx, POOL, poolId, { from: 'CLOSED_FOR_BIDS', to: 'QUOTED', ... })
     await tx.networkPool.update({ where: { id: poolId }, data: { lifecycleStateId: quotedState.id, updatedAt: now } })

10. acceptedState = await stateMachine.transition(tx, POOL, poolId, { from: 'QUOTED', to: 'ACCEPTED', ... })
    await tx.networkPool.update({ where: { id: poolId }, data: { lifecycleStateId: acceptedState.id, updatedAt: now } })

11. Write direct lifecycle log for award event:
    tx.networkLifecycleLog.create({
      orgId: ownerOrgId, entityType: 'POOL', entityId: poolId,
      fromStateKey: 'ACCEPTED', toStateKey: 'ACCEPTED',
      actorType: 'TENANT_ADMIN', actorRole: 'NC_POOL_ADMIN',
      reason: `nc_pool_rfq_quote_accepted: quote=${quoteId}, rfq=${rfqId}, pool=${poolId}`,
      requestId: input.request_id ?? null
    })

12. Re-load accepted quote row (to capture updatedAt after update) or return mutated in-memory record.
```

**Returns:** `toQuoteOwnerRecord(acceptedQuoteRow)`

**Errors thrown:**
- `NetworkPoolRfqPoolNotFoundError` — 404
- `NetworkPoolRfqInvalidPoolStateError` — 422 (pool not CLOSED_FOR_BIDS or QUOTED)
- `NetworkPoolRfqRfqNotFoundError` — 404
- `NetworkPoolRfqTransitionDeniedError` — 422 (RFQ not QUOTED)
- `NetworkPoolRfqOwnerQuoteNotFoundError` — 404
- `NetworkPoolRfqSupplierQuoteNotInSubmittedError` — 422 (quote not SUBMITTED)
- Prisma P2002 unique constraint → wrap as `NetworkPoolRfqConflictError` (belt-and-suspenders)

### 8.3 `rejectQuote`

```typescript
async rejectQuote(
  ownerOrgId: string,
  userId:     string | null,
  poolId:     string,
  rfqId:      string,
  quoteId:    string,
  input:      RejectQuoteInput,
): Promise<NetworkPoolRfqSupplierQuoteOwnerRecord>
```

**Transaction steps:**

```
1. Load pool: { id: poolId, orgId: ownerOrgId }, include lifecycleState
   → NetworkPoolRfqPoolNotFoundError if missing.

2. Pool must be CLOSED_FOR_BIDS or QUOTED.
   → NetworkPoolRfqInvalidPoolStateError if neither.

3. Load RFQ: { id: rfqId, poolId, ownerOrgId }
   → NetworkPoolRfqRfqNotFoundError if missing.
   RFQ status must be 'QUOTED'.
   → NetworkPoolRfqTransitionDeniedError if not.

4. Load quote: { id: quoteId, rfqId, ownerOrgId }
   → NetworkPoolRfqOwnerQuoteNotFoundError if missing.
   Quote status must be 'SUBMITTED'.
   → NetworkPoolRfqSupplierQuoteNotInSubmittedError if not.

5. const now = new Date();

6. Update quote: { status: 'REJECTED', rejectedAt: now, rejectReason: input.reject_reason ?? null, updatedAt: now }

7. NO RFQ status change. NO pool lifecycle state change.

8. Write direct lifecycle log:
   tx.networkLifecycleLog.create({
     orgId: ownerOrgId, entityType: 'POOL', entityId: poolId,
     fromStateKey: 'CLOSED_FOR_BIDS', toStateKey: 'CLOSED_FOR_BIDS',
     actorType: 'TENANT_ADMIN', actorRole: 'NC_POOL_ADMIN',
     reason: `nc_pool_rfq_quote_rejected: quote=${quoteId}, rfq=${rfqId}, pool=${poolId}`,
     requestId: input.request_id ?? null
   })

9. Return toQuoteOwnerRecord(updatedQuoteRow)
```

**Errors thrown:**
- `NetworkPoolRfqPoolNotFoundError` — 404
- `NetworkPoolRfqInvalidPoolStateError` — 422
- `NetworkPoolRfqRfqNotFoundError` — 404
- `NetworkPoolRfqTransitionDeniedError` — 422
- `NetworkPoolRfqOwnerQuoteNotFoundError` — 404
- `NetworkPoolRfqSupplierQuoteNotInSubmittedError` — 422

---

## §9 — Error Classes

Two new error classes required in `networkPoolRfq.service.ts`:

### 9.1 `NetworkPoolRfqOwnerQuoteNotFoundError`

```typescript
export class NetworkPoolRfqOwnerQuoteNotFoundError extends Error {
  constructor() {
    super('Supplier quote not found for this RFQ and pool owner.');
    this.name = 'NetworkPoolRfqOwnerQuoteNotFoundError';
  }
}
```

Used when: quote not found, or found but not owned by the calling `ownerOrgId` (non-leaking 404 — no distinction made between "not found" and "wrong owner").

### 9.2 `NetworkPoolRfqSupplierQuoteNotInSubmittedError`

```typescript
export class NetworkPoolRfqSupplierQuoteNotInSubmittedError extends Error {
  constructor(currentStatus: string) {
    super(`Quote cannot be accepted or rejected: current status is '${currentStatus}'. Only SUBMITTED quotes may be acted on.`);
    this.name = 'NetworkPoolRfqSupplierQuoteNotInSubmittedError';
  }
}
```

Used when: attempting to accept/reject a quote that is ACCEPTED, REJECTED, or WITHDRAWN.

---

## §10 — API Route Contract

> All three routes are owner-only (pool owner / admin). They live in `server/src/routes/tenant/poolRfq.ts`.
> Route prefix under `/:poolId/rfq/:rfqId/`.

### 10.1 Route Overview

| Method | Path | Name | HTTP Success | Description |
|---|---|---|---|---|
| GET | `/:poolId/rfq/:rfqId/quotes` | listOwnerQuotes | 200 | Owner lists all quotes for one RFQ |
| POST | `/:poolId/rfq/:rfqId/quotes/:quoteId/accept` | acceptQuote | 200 | Owner accepts a SUBMITTED quote |
| POST | `/:poolId/rfq/:rfqId/quotes/:quoteId/reject` | rejectQuote | 200 | Owner rejects a SUBMITTED quote |

Resolved full paths (under API prefix `/api/tenant/network-commerce`):
```
GET  /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes
POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/accept
POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/reject
```

### 10.2 Authentication and Gates

All three routes share the same guard stack:

```typescript
// onRequest
tenantAuthMiddleware
databaseContextMiddleware

// preHandler
ncPoolFeatureGateMiddleware           // nc.procurement_pools.enabled
ncPoolRfqFeatureGateMiddleware        // nc.procurement_pools.rfq.enabled
ncPoolRfqAwardFeatureGateMiddleware   // nc.procurement_pools.rfq.award.enabled (NEW)
```

Role gate (enforced in route handler, consistent with existing pattern):
```typescript
const userRole = (request.userRole ?? '').trim().toUpperCase();
if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
  return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may manage quote awards', 403);
}
```

### 10.3 Parameter Schemas

```typescript
const rfqQuoteParamSchema = z.object({
  poolId:  z.string().uuid('poolId must be a valid UUID'),
  rfqId:   z.string().uuid('rfqId must be a valid UUID'),
  quoteId: z.string().uuid('quoteId must be a valid UUID'),
});

const rfqParamSchema = z.object({
  poolId: z.string().uuid('poolId must be a valid UUID'),
  rfqId:  z.string().uuid('rfqId must be a valid UUID'),
});
```

### 10.4 Body Schemas

```typescript
// GET /:poolId/rfq/:rfqId/quotes — no body

// POST /:poolId/rfq/:rfqId/quotes/:quoteId/accept
const acceptQuoteBodySchema = z.object({
  request_id: z.string().max(255, 'request_id max 255 chars').nullable().optional(),
}).strict();

// POST /:poolId/rfq/:rfqId/quotes/:quoteId/reject
const rejectQuoteBodySchema = z.object({
  reject_reason: z.string().max(5000, 'reject_reason max 5000 chars').nullable().optional(),
  request_id:    z.string().max(255, 'request_id max 255 chars').nullable().optional(),
}).strict();
```

Strict parsing (`.strict()`) — unknown keys → 422 INVALID_INPUT (consistent with existing route patterns).

### 10.5 Response Shapes

**GET /:poolId/rfq/:rfqId/quotes → 200:**
```json
{
  "success": true,
  "data": [ /* NetworkPoolRfqSupplierQuoteOwnerRecord[] — see §7.1 */ ]
}
```

**POST .../accept → 200:**
```json
{
  "success": true,
  "data": { /* NetworkPoolRfqSupplierQuoteOwnerRecord for the accepted quote */ }
}
```

**POST .../reject → 200:**
```json
{
  "success": true,
  "data": { /* NetworkPoolRfqSupplierQuoteOwnerRecord for the rejected quote */ }
}
```

### 10.6 Error Mapping

```typescript
function mapAwardRouteError(reply, err): boolean {
  if (err instanceof NetworkPoolRfqPoolNotFoundError)
    → sendError(reply, 'POOL_NOT_FOUND', ..., 404); return true;

  if (err instanceof NetworkPoolRfqInvalidPoolStateError)
    → sendError(reply, 'INVALID_STATE', ..., 422); return true;

  if (err instanceof NetworkPoolRfqRfqNotFoundError)
    → sendError(reply, 'RFQ_NOT_FOUND', ..., 404); return true;

  if (err instanceof NetworkPoolRfqTransitionDeniedError)
    → sendError(reply, 'INVALID_TRANSITION', ..., 422); return true;

  if (err instanceof NetworkPoolRfqOwnerQuoteNotFoundError)
    → sendError(reply, 'QUOTE_NOT_FOUND', ..., 404); return true;

  if (err instanceof NetworkPoolRfqSupplierQuoteNotInSubmittedError)
    → sendError(reply, 'INVALID_TRANSITION', ..., 422); return true;

  if (err instanceof NetworkPoolRfqConflictError)
    → sendError(reply, 'CONFLICT', ..., 409); return true;

  return false;
}
```

### 10.7 Idempotency Design

- `accept` and `reject` are not idempotent by HTTP semantics (POST). The service enforces state-machine guards to prevent double-award. A duplicate accept call on an already-ACCEPTED quote returns 422 INVALID_TRANSITION.
- `request_id` is logged in the lifecycle log for audit trail but not used for true request-level idempotency in Phase 1D. Idempotency keys (deduplicated at service layer) are deferred to Phase 1E+.

---

## §11 — Feature Flag Design

### 11.1 New Feature Flag: `nc.procurement_pools.rfq.award.enabled`

| Property | Value |
|---|---|
| Key | `nc.procurement_pools.rfq.award.enabled` |
| Initial value | `false` (seeded in AWARD-SCHEMA-001 migration) |
| Controls | All three award routes (GET quotes list, POST accept, POST reject) |
| Middleware | `ncPoolRfqAwardFeatureGateMiddleware` (new file) |
| Semantics | `=== false` → 503 FEATURE_DISABLED (consistent with post-SEMANTICS-ALIGNMENT-001 canonical pattern) |

**AD-7**: The award flag is independent of `nc.procurement_pools.supplier_quotes.enabled` (QD-6). This allows the award path to be enabled before or independently of supplier quote submission being enabled for production use. This separation also allows controlled rollout: Paresh can authorize award route activation separately from supplier-side quote activation.

### 11.2 New Middleware: `ncPoolRfqAwardFeatureGateMiddleware`

File: `server/src/middleware/ncPoolRfqAwardFeatureGate.middleware.ts`

Follows identical pattern to `ncPoolRfqFeatureGateMiddleware`:
- Reads `nc.procurement_pools.rfq.award.enabled` from `feature_flags` table scoped to `orgId`.
- `=== false` (both global and tenant override absent/false) → 503 FEATURE_DISABLED.
- `=== true` → pass through.
- Uses `=== false` semantics (not `!== true`) — canonical post-SEMANTICS-ALIGNMENT-001 pattern.

---

## §12 — RLS and Privacy Design

### 12.1 Owner Quote Read Scope

`listOwnerQuotes` queries with `ownerOrgId + poolId + rfqId` (defense-in-depth). A pool owner cannot access another owner's quotes even if they know a valid quoteId — the `ownerOrgId` filter acts as the primary tenancy gate.

### 12.2 Supplier Visibility Boundaries

**AD-8**: Suppliers can only see their own quote (scoped by `supplierOrgId`). The following must NEVER be exposed to any supplier-facing surface:
- ACCEPTED or REJECTED status of other suppliers' quotes.
- The `ownerOrgId` field.
- Any other supplier's `quoteAmount`, `currency`, `supplierNote`, or identity.
- The count of quotes submitted against an RFQ.
- The `metadataInternalJson` field (QD-5 — ops-only, never in any DTO).

The supplier DTO (`NetworkPoolRfqSupplierQuoteSupplierRecord`) is unchanged by Phase 1D. Supplier can see their own quote status change to ACCEPTED or REJECTED via `getSupplierQuote`. This is intentional — a supplier should be able to see whether their quote was accepted or rejected.

**AD-9**: The supplier's own quote status visibility (ACCEPTED/REJECTED) is allowed because:
1. The supplier submitted the quote and has a legitimate interest in its outcome.
2. It is scoped to their own quote only (supplierOrgId filter).
3. No competitive intelligence is leaked — they cannot see other quotes.

Supplier `getSupplierQuote` (Phase 1C route) will naturally return the updated status once Phase 1D transitions happen. No route changes are required for supplier visibility of their own quote outcome.

### 12.3 No Member Demand Breakdown in Quote DTOs

The `NetworkPoolRfqSupplierQuoteOwnerRecord` does not include any per-member demand lines. Individual member contribution to the pool is not disclosed at the quote surface (consistent with NC architecture).

### 12.4 `metadataInternalJson` Exclusion

`metadataInternalJson` is excluded from ALL owner and supplier DTOs (QD-5). It is an ops-only field and must never appear in any API response, regardless of the actor role.

---

## §13 — QD-6 Posture and Award Flag Independence

**QD-6 HOLD MAINTAINED**: `nc.procurement_pools.supplier_quotes.enabled` remains `false` through Phase 1D implementation. This design does not activate supplier quote submission.

**Award Flag Independence**: The new `nc.procurement_pools.rfq.award.enabled` flag is a separate gate. It is seeded `false` in the Phase 1D schema migration. Its activation is a separate explicit decision by Paresh:
- Enabling `nc.procurement_pools.rfq.award.enabled = true` does NOT require enabling `nc.procurement_pools.supplier_quotes.enabled = true` first (and vice versa).
- The natural operational order would be: enable supplier quotes first → suppliers can submit → owner can then review and award. But the system enforces this via RFQ state checks (RFQ must be QUOTED, i.e., at least one quote submitted), not via flag dependency.

---

## §14 — FE-9 Dependency Contract

> FE-9 (TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001) is NOT opened by this design packet.
> It requires explicit Paresh authorization after AWARD-ROUTE-001 (Packet 16) is VERIFIED_COMPLETE.

### 14.1 What FE-9 May Consume

| Backend Artifact | Status After Phase 1D |
|---|---|
| `GET /:poolId/rfq/:rfqId/quotes` | Available (gated by award flag) |
| `POST /:poolId/rfq/:rfqId/quotes/:quoteId/accept` | Available (gated by award flag) |
| `POST /:poolId/rfq/:rfqId/quotes/:quoteId/reject` | Available (gated by award flag) |
| `NetworkPoolRfqSupplierQuoteOwnerRecord` | Defined in §7.1 — canonical DTO for FE-9 |
| RFQ status `ACCEPTED` | Defined in existing DB CHECK; transition implemented in Phase 1D |
| Pool lifecycle state `ACCEPTED` | Seeded; SM transition implemented in Phase 1D |

### 14.2 FE-9 Display States

FE-9 must handle the following RFQ/pool state display cases:
1. **RFQ QUOTED, Pool CLOSED_FOR_BIDS** — quotes are in, owner can review/accept/reject.
2. **RFQ ACCEPTED, Pool ACCEPTED** — award is complete; show winning quote; no further accept/reject allowed.
3. **Quote ACCEPTED** — display as winning bid (distinguished styling).
4. **Quote REJECTED** — display as rejected (muted styling); show `reject_reason` if present.
5. **Quote WITHDRAWN** — display as withdrawn (muted styling; no owner action available).
6. **Feature-disabled state** — when `nc.procurement_pools.rfq.award.enabled = false`, show graceful disabled UI (consistent with Phase 1C supplier quote disabled pattern).

### 14.3 FE-9 Routing Constraints

- No `App.tsx` changes are required. The quote review surface should be accessible via the existing NC pool detail route tree (consistent with FE-8 navigation pattern).
- Supplier quote amounts visible to pool owner only — never to other supplier org users.
- No demand breakdown on the award surface.

### 14.4 Service Client Methods for FE-9

When FE-9 is opened, the following frontend service methods are expected:
```typescript
getOwnerQuotesForRfq(poolId: string, rfqId: string): Promise<NetworkPoolRfqSupplierQuoteOwnerRecord[]>
acceptQuoteForRfq(poolId: string, rfqId: string, quoteId: string): Promise<NetworkPoolRfqSupplierQuoteOwnerRecord>
rejectQuoteForRfq(poolId: string, rfqId: string, quoteId: string, rejectReason?: string): Promise<NetworkPoolRfqSupplierQuoteOwnerRecord>
```

---

## §15 — Packet Decomposition

Phase 1D decomposes into three implementation packets:

| Packet | ID | Scope | Blocked Until |
|---|---|---|---|
| Schema Migration | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SCHEMA-001 | DDL migration (CHECK extend, 3 new columns, award feature flag seed, `prisma db pull`, `prisma generate`) | Phase 1C baseline deployed (DONE) |
| Service Layer | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SERVICE-001 | `listOwnerQuotes`, `acceptQuote`, `rejectQuote` service methods; `toQuoteOwnerRecord` helper; 2 new error classes; 2 new input interfaces; `NetworkPoolRfqSupplierQuoteOwnerRecord` type; unit tests | AWARD-SCHEMA-001 complete |
| Route Layer | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-ROUTE-001 | 3 new routes in `poolRfq.ts`; `ncPoolRfqAwardFeatureGateMiddleware` middleware; `acceptQuoteBodySchema`, `rejectQuoteBodySchema`; `mapAwardRouteError`; integration tests | AWARD-SERVICE-001 complete |

Frontend (not in this Phase 1D design packet scope):

| Packet | ID | Scope | Blocked Until |
|---|---|---|---|
| Frontend Award UI | TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001 (FE-9) | Quote review surface; accept/reject UI; RFQ ACCEPTED/pool ACCEPTED state display | AWARD-ROUTE-001 VERIFIED_COMPLETE + explicit Paresh authorization |

### 15.1 Tracker Update Required

When AWARD-SCHEMA-001 is implemented:
- `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` Appendix D must be updated:
  - Entity count: 11 → 11 (no new tables; only columns added — entity count unchanged)
  - Migration count: 11 → 13 (add 2 new migration packets)
  - NC feature flag count: 4 → 5 (add `nc.procurement_pools.rfq.award.enabled`)
  - Route count: 23 → 26 (add 3 new owner award routes to `poolRfq.ts:5→8`)

---

## §16 — Design Decision Log

| ID | Decision | Rationale |
|---|---|---|
| AD-1 | One ACCEPTED quote per RFQ; mass-reject of all other SUBMITTED quotes on accept | Award exclusivity. Prevents double-award. Atomic in one tx. |
| AD-2 | ACCEPTED and WITHDRAWN quotes cannot be accepted/rejected | Terminal status enforcement. Quote status machine has no transitions from ACCEPTED, REJECTED, or WITHDRAWN. |
| AD-3 | QD-2 non-partial UNIQUE(invite_id) stays in Phase 1D; no re-quoting | Minimal Phase 1D; defers complexity of re-quoting to Phase 1E+. |
| AD-4 | Pool must go CLOSED_FOR_BIDS → QUOTED → ACCEPTED via two SM.transition() calls in one tx | CLOSED_FOR_BIDS → ACCEPTED is not in allowed_transitions. Two SM transitions required. |
| AD-5 | `rejectQuote` does NOT transition pool or RFQ state | Owner may still accept another quote after rejecting one; pool/RFQ state should not advance until award is confirmed. |
| AD-6 | `listOwnerQuotes` returns empty array (not 404) when no quotes exist | Non-leaking. Owner can query anytime; empty array is valid when no quotes submitted yet (flag is false). |
| AD-7 | New flag `nc.procurement_pools.rfq.award.enabled` independent of supplier_quotes flag | Allows award path to be activated separately. Cleaner operational controls. |
| AD-8 | Supplier DTO unchanged; supplier may see their own quote outcome (ACCEPTED/REJECTED) | Supplier has legitimate interest in their own quote outcome. Limited to their own quote only — no cross-supplier leakage. |
| AD-9 | `metadataInternalJson` excluded from all DTOs | QD-5 — ops-only field. Consistent with Phase 1C decisions. |
| AD-10 | `withdrawReason` excluded from owner DTO | Supplier-internal; owner does not need the supplier's withdrawal narrative (consistent with QUOTE-DESIGN-001 §10 design). |
| AD-11 | New columns `accepted_at`, `rejected_at`, `reject_reason` required | Audit trail for award/rejection events. Consistent with invite table pattern (acceptedAt, declinedAt columns per lifecycle event). |
| AD-12 | RFQ status QUOTED → ACCEPTED via direct DB update (not SM) | Consistent with QD-8 pattern established in Phase 1C. RFQ status uses direct tx.networkPoolRfq.update(), not StateMachineService. |
| AD-13 | Award routes in `poolRfq.ts` (not `poolRfqSupplierQuotes.ts`) | Award routes are owner-scoped. `poolRfqSupplierQuotes.ts` is the supplier-scoped file. Separation of owner/supplier surfaces. |

---

## Appendix A — Authoritative Files Referenced in This Design

| File | Purpose |
|---|---|
| `server/prisma/schema.prisma` (lines 1816–1870, 2091–2145, 2276–2340) | Pool, RFQ, and Quote model definitions |
| `server/prisma/migrations/20260523000000_nc_pool_lifecycle_seed/migration.sql` | Pool lifecycle states and allowed transitions (17 states, 24 transitions) |
| `server/src/services/networkPoolRfq.service.ts` | Full service — all existing methods read |
| `server/src/routes/tenant/poolRfq.ts` | Existing 5 owner routes |
| `server/src/routes/tenant/poolRfqSupplierQuotes.ts` | Existing 2 supplier quote routes |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001.md` | Phase 1C service design authority |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-ROUTE-001.md` | Phase 1C route design authority |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001.md` | Phase 1B RFQ issue design authority (QD-8 parent) |
| `governance/control/OPEN-SET.md` | Current governed posture at design time |
| `governance/control/NEXT-ACTION.md` | QD-6 hold and FE-8 completion confirmation |
| `governance/control/BLOCKED.md` | No active blockers at design time |

---

*Design document closed. Downstream implementation packets: AWARD-SCHEMA-001 → AWARD-SERVICE-001 → AWARD-ROUTE-001 → FE-9 (pending Paresh authorization).*

*Doctrine: TexQtic v1.4 | Safe-Write Mode | Governance Only*
