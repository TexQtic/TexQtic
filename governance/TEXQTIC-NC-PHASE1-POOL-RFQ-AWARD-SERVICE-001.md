# TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SERVICE-001

**Status:** VERIFIED_COMPLETE
**Packet type:** Backend service — Phase 1D owner quote award
**Depends on:** TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SCHEMA-REMOTE-DEPLOY-001 (commit `83c56ef`)
**Blocks:** TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-ROUTE-001

---

## §1 Packet ID / Status

| Field              | Value                                                  |
|--------------------|--------------------------------------------------------|
| Packet ID          | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SERVICE-001           |
| Status             | VERIFIED_COMPLETE                                      |
| Committed as       | `feat(network-commerce): add pool rfq award service`   |
| Design authority   | `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001.md` |

---

## §2 Objective

Implement the owner-facing quote award surface in `NetworkPoolRfqService`:

- `listOwnerQuotes` — return all submitted quotes for an RFQ scoped by `ownerOrgId`
- `acceptQuote` — accept a single `SUBMITTED` quote; mass-reject all other `SUBMITTED` quotes for same RFQ; transition pool lifecycle to `ACCEPTED`; mark RFQ `ACCEPTED`
- `rejectQuote` — reject a single `SUBMITTED` quote with optional reason; no pool or RFQ state change

No routes. No frontend. No flag activation. No schema changes (schema deployed by prior packet).

---

## §3 Allowlist

| File | Action |
|------|--------|
| `server/src/services/networkPoolRfq.service.ts` | MODIFY |
| `server/src/__tests__/networkPoolRfq.service.unit.test.ts` | MODIFY |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SERVICE-001.md` | CREATE |
| `governance/control/OPEN-SET.md` | MODIFY |
| `governance/control/NEXT-ACTION.md` | MODIFY |
| `governance/control/GOVERNANCE-CHANGELOG.md` | MODIFY |

---

## §4 Forbidden Actions

- No route edits, no middleware, no frontend changes
- No `schema.prisma` edits
- No migration commands (`migrate dev`, `db push`)
- No `.env` edits
- No flag activation (`nc.procurement_pools.rfq.award.enabled`, `nc.procurement_pools.supplier_quotes.enabled`)
- No production data mutation
- AWARD-ROUTE-001 not opened in this packet

---

## §5 Design Decisions

| Ref | Decision |
|-----|----------|
| AD-1 | Exactly one quote accepted; all other `SUBMITTED` quotes for same `rfqId`+`ownerOrgId` are mass-rejected atomically. Mass-reject does NOT set `rejectReason`. |
| AD-4 | If pool is `CLOSED_FOR_BIDS` when `acceptQuote` is called, two SM transitions are applied in sequence: `CLOSED_FOR_BIDS→QUOTED` then `QUOTED→ACCEPTED`. If pool is already `QUOTED`, only `QUOTED→ACCEPTED` is applied. |
| AD-5 | `rejectQuote` does NOT transition pool lifecycle state and does NOT change RFQ status. It is a pure single-quote state change. |
| QD-8 | RFQ status is updated via direct `networkPoolRfq.update` (NOT via SM). Rationale: RFQ has its own status field independent of pool lifecycle. |
| SM-ID | `SM.transition()` returns `{ status, transitionId }` — NOT the lifecycle state ID. Pool `lifecycleStateId` is set by pre-loading `QUOTED`/`ACCEPTED` state IDs via `lifecycleState.findUnique` **outside** the transaction, then referencing inside. |
| LOG-REJECT | `rejectQuote` lifecycle log uses the pool's **actual current** `stateKey` (loaded from `pool.lifecycleState.stateKey`) for both `fromStateKey` and `toStateKey`. Design doc §8.3 originally hardcoded `CLOSED_FOR_BIDS` but the pool may be `QUOTED` at reject time. |

---

## §6 Error Classes Added

Both classes appended after `NetworkPoolRfqSupplierQuoteInviteNotAcceptedError` in the service file.

### `NetworkPoolRfqOwnerQuoteNotFoundError`

```typescript
export class NetworkPoolRfqOwnerQuoteNotFoundError extends Error {
  constructor() {
    super('Supplier quote not found for this RFQ and pool owner.');
    this.name = 'NetworkPoolRfqOwnerQuoteNotFoundError';
  }
}
```

Thrown when: `networkPoolRfqSupplierQuote.findFirst` returns `null` scoped by `ownerOrgId+poolId+rfqId+id`.

### `NetworkPoolRfqSupplierQuoteNotInSubmittedError`

```typescript
export class NetworkPoolRfqSupplierQuoteNotInSubmittedError extends Error {
  constructor(currentStatus: string) {
    super(
      `Quote cannot be accepted or rejected: current status is '${currentStatus}'. ` +
      `Only SUBMITTED quotes may be acted on.`,
    );
    this.name = 'NetworkPoolRfqSupplierQuoteNotInSubmittedError';
  }
}
```

Thrown when: quote's `status !== 'SUBMITTED'` in either `acceptQuote` or `rejectQuote`.

---

## §7 Interfaces / DTOs

### `NetworkPoolRfqSupplierQuoteOwnerRecord`

Owner-facing quote DTO returned by `listOwnerQuotes`, `acceptQuote`, `rejectQuote`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `owner_org_id` | `string` | Tenancy key |
| `supplier_org_id` | `string` | |
| `rfq_id` | `string` | |
| `pool_id` | `string` | |
| `invite_id` | `string` | |
| `quote_ref` | `string` | |
| `status` | `string` | `SUBMITTED` / `ACCEPTED` / `REJECTED` / `WITHDRAWN` |
| `quote_amount` | `string` | Decimal serialized as string |
| `currency` | `string` | |
| `validity_until` | `string \| null` | ISO 8601 |
| `supplier_note` | `string \| null` | |
| `submitted_at` | `string` | ISO 8601 |
| `submitted_by_user_id` | `string \| null` | |
| `withdrawn_at` | `string \| null` | ISO 8601 |
| `accepted_at` | `string \| null` | ISO 8601 |
| `rejected_at` | `string \| null` | ISO 8601 |
| `reject_reason` | `string \| null` | |
| `created_at` | `string` | ISO 8601 |
| `updated_at` | `string` | ISO 8601 |

Excluded: `metadataInternalJson`.

### `AcceptQuoteInput`

```typescript
export interface AcceptQuoteInput {
  request_id?: string | null;
}
```

### `RejectQuoteInput`

```typescript
export interface RejectQuoteInput {
  reject_reason?: string | null;
  request_id?: string | null;
}
```

---

## §8 Service Methods

### `listOwnerQuotes(ownerOrgId, poolId, rfqId)`

```
findMany({ where: { ownerOrgId, poolId, rfqId }, orderBy: { submittedAt: 'desc' } })
→ returns [] if no rows
→ maps through toQuoteOwnerRecord
```

### `acceptQuote(ownerOrgId, userId, poolId, rfqId, quoteId, input)`

Steps (all inside `$transaction`):

1. Pre-load `QUOTED` and `ACCEPTED` lifecycle state IDs via `Promise.all` outside transaction
2. Load pool with `include: { lifecycleState: true }` → throw `NetworkPoolRfqPoolNotFoundError` if null
3. Pool state must be `CLOSED_FOR_BIDS` or `QUOTED` → throw `NetworkPoolRfqInvalidPoolStateError`
4. Load RFQ → throw `NetworkPoolRfqRfqNotFoundError`; status must be `QUOTED` → throw `NetworkPoolRfqTransitionDeniedError`
5. Load quote → throw `NetworkPoolRfqOwnerQuoteNotFoundError`; status must be `SUBMITTED` → throw `NetworkPoolRfqSupplierQuoteNotInSubmittedError`
6. `update` accepted quote: `{ status: 'ACCEPTED', acceptedAt: now, updatedAt: now }`
7. `updateMany` mass-reject: `{ where: { rfqId, ownerOrgId, status: 'SUBMITTED', id: { not: quoteId } }, data: { status: 'REJECTED', rejectedAt: now, updatedAt: now } }` — no `rejectReason`
8. `update` RFQ: `{ status: 'ACCEPTED', updatedAt: now }` (direct DB, not SM — QD-8)
9. If pool is `CLOSED_FOR_BIDS`: SM `CLOSED_FOR_BIDS→QUOTED`, pool update `lifecycleStateId: quotedState.id`
10. SM `QUOTED→ACCEPTED`, pool update `lifecycleStateId: acceptedState.id`
11. Direct lifecycle log: `fromStateKey: 'ACCEPTED', toStateKey: 'ACCEPTED'`, reason: `nc_pool_rfq_quote_accepted: quote=${quoteId}, rfq=${rfqId}, pool=${poolId}`
12. Return `toQuoteOwnerRecord(updatedQuote)`

### `rejectQuote(ownerOrgId, userId, poolId, rfqId, quoteId, input)`

Steps (all inside `$transaction`):

1. Load pool with `lifecycleState` → throw `NetworkPoolRfqPoolNotFoundError`; capture `poolStateKey`
2. Pool state must be `CLOSED_FOR_BIDS` or `QUOTED` → throw `NetworkPoolRfqInvalidPoolStateError`
3. Load RFQ → throw `NetworkPoolRfqRfqNotFoundError`
4. Load quote → throw `NetworkPoolRfqOwnerQuoteNotFoundError`; status must be `SUBMITTED` → throw `NetworkPoolRfqSupplierQuoteNotInSubmittedError`
5. `update` quote: `{ status: 'REJECTED', rejectedAt: now, rejectReason: input.reject_reason ?? null, updatedAt: now }`
6. Direct lifecycle log: `fromStateKey: poolStateKey, toStateKey: poolStateKey`, reason: `nc_pool_rfq_quote_rejected: quote=${quoteId}`
7. NO pool state change. NO RFQ status change. NO SM call.
8. Return `toQuoteOwnerRecord(updatedQuote)`

---

## §9 Test Coverage

16 test cases added to `server/src/__tests__/networkPoolRfq.service.unit.test.ts`.

| Test ID | Type | Method | Description |
|---------|------|--------|-------------|
| P-OWNER-01 | PASS | `listOwnerQuotes` | Returns `[]` when no quotes |
| P-OWNER-02 | PASS | `listOwnerQuotes` | Returns owner DTOs with `owner_org_id`, `supplier_org_id`, `rfq_id`, `pool_id`; excludes `metadataInternalJson` |
| P-OWNER-03 | PASS | `acceptQuote` | Returns DTO with `status=ACCEPTED` |
| P-OWNER-04 | PASS | `acceptQuote` | `updateMany` called with `status=SUBMITTED`, `id.not=quoteId`, sets `REJECTED` |
| P-OWNER-05 | PASS | `acceptQuote` | `updateMany` data does NOT include `rejectReason` |
| P-OWNER-06 | PASS | `acceptQuote` | `networkPoolRfq.update` called with `status=ACCEPTED` |
| P-OWNER-07 | PASS | `acceptQuote` | `sm.transition` called twice when pool is `CLOSED_FOR_BIDS` |
| P-OWNER-08 | PASS | `acceptQuote` | `sm.transition` called once (QUOTED→ACCEPTED) when pool already `QUOTED` |
| P-OWNER-09 | FAIL | `acceptQuote` | Throws `NetworkPoolRfqSupplierQuoteNotInSubmittedError` for non-SUBMITTED quote |
| P-OWNER-10 | PASS | `rejectQuote` | Returns DTO with `status=REJECTED` |
| P-OWNER-11 | PASS | `rejectQuote` | Persists `rejectReason` in update data |
| P-OWNER-12 | PASS | `rejectQuote` | `networkPoolRfq.update` is NOT called |
| P-OWNER-13 | PASS | `rejectQuote` | `sm.transition` is NOT called |
| P-OWNER-14 | PASS | `rejectQuote` | Lifecycle log uses actual pool state (`QUOTED`) for `fromStateKey`/`toStateKey` |
| P-OWNER-15 | FAIL | `rejectQuote` | Throws `NetworkPoolRfqSupplierQuoteNotInSubmittedError` for non-SUBMITTED quote |
| P-OWNER-16 | FAIL | `rejectQuote` | Throws `NetworkPoolRfqOwnerQuoteNotFoundError` for wrong `ownerOrgId` |

---

## §10 Validation Evidence

### Prisma validate

```
pnpm -C server exec prisma validate
→ PASS (no output = success)
```

### TypeScript

```
cd server && pnpm exec tsc --noEmit
→ PASS (exit 0, no errors)
```

### Unit tests

```
cd server && pnpm exec vitest run src/__tests__/networkPoolRfq.service.unit.test.ts

 Test Files  1 passed (1)
      Tests  150 passed (150)
   Duration  515ms
```

Prior test count: 134. New test count: 150. All 16 P-OWNER cases pass.

---

## §11 Governance Contracts Reviewed

| Contract | Applicable | Verdict |
|----------|-----------|---------|
| `shared/contracts/db-naming-rules.md` | No — no schema changes | N/A |
| `shared/contracts/rls-policy.md` | No — service layer only | N/A |
| `shared/contracts/openapi.tenant.json` | No — no routes in this packet | N/A |
| `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | Yes — new service methods | PASS |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001.md` | Yes — primary design authority | REVIEWED |

`org_id` tenancy boundary maintained throughout all three methods. All queries scoped by `ownerOrgId`.

---

## §12 Stop Conditions

This packet halts if:
- Prisma validate fails
- tsc produces errors
- Any of the 150 tests fail
- Route implementation required (out of scope → AWARD-ROUTE-001)
- Feature flag activation required (not in this packet)

---

## §13 Risks / Follow-up

| Item | Notes |
|------|-------|
| AWARD-ROUTE-001 | Next packet — HTTP routes for `listOwnerQuotes`, `acceptQuote`, `rejectQuote` |
| Flag activation | `nc.procurement_pools.rfq.award.enabled` — not activated in this packet |
| Concurrent accept | Two concurrent `acceptQuote` calls on the same RFQ could both pass the status check before either commits. Mitigation: Postgres transaction isolation + unique constraint on accepted quotes is recommended for AWARD-ROUTE-001 design. |
| `rejectQuote` pool validation | Pool state check (`CLOSED_FOR_BIDS` or `QUOTED`) guards against stale calls, but RFQ status is not re-validated in rejectQuote (design intent: owner may reject individual quotes regardless of RFQ flow) |

---

## §14 Commit Message

```
feat(network-commerce): add pool rfq award service
```
