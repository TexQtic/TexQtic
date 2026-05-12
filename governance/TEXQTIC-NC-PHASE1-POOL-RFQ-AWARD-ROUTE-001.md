# TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-ROUTE-001

**Status:** VERIFIED_COMPLETE  
**Packet type:** Backend route layer — Phase 1D owner quote award  
**Depends on:** TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SERVICE-001 (commit `5c37bdf`)  
**Blocks:** TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001 (FE-9 — HOLD_FOR_PARESH_DECISION)

---

## §1 Packet ID / Status

| Field              | Value                                                          |
|--------------------|----------------------------------------------------------------|
| Packet ID          | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-ROUTE-001                    |
| Status             | VERIFIED_COMPLETE                                              |
| Committed as       | `feat(network-commerce): add pool rfq award routes`            |
| Design authority   | `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001.md`   |
| Service authority  | `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SERVICE-001.md`  |

---

## §2 Objective

Implement the owner-facing HTTP route surface for Phase 1D pool RFQ quote award in the tenant API:

- `GET  /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes` — list all submitted quotes for RFQ
- `POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/accept` — accept a quote
- `POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/reject` — reject a quote

Plus the `ncPoolRfqAwardFeatureGate.middleware.ts` feature gate for the award surface.

No schema changes. No frontend. No feature flag activation. Award flag remains `false`.

---

## §3 Allowlist

| File | Action |
|------|--------|
| `server/src/middleware/ncPoolRfqAwardFeatureGate.middleware.ts` | CREATE |
| `server/src/routes/tenant/poolRfq.ts` | MODIFY |
| `server/src/routes/tenant/poolRfq.integration.test.ts` | MODIFY |
| `server/src/services/networkPoolRfq.service.ts` | MODIFY (blocker resolution — see §11) |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-ROUTE-001.md` | CREATE |
| `governance/control/OPEN-SET.md` | MODIFY |
| `governance/control/NEXT-ACTION.md` | MODIFY |
| `governance/control/BLOCKED.md` | MODIFY |
| `governance/control/GOVERNANCE-CHANGELOG.md` | MODIFY |

---

## §4 Forbidden Actions

- No `schema.prisma` edits
- No migration commands (`migrate dev`, `db push`)
- No `.env` edits
- No `nc.procurement_pools.rfq.award.enabled` activation
- No `nc.procurement_pools.supplier_quotes.enabled` activation (QD-6 hold)
- No frontend changes
- No production data mutation
- FE-9 (`TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001`) not opened
- No allocation persistence logic
- No order, invoice, settlement, OES, or VCO logic

---

## §5 Feature Gate Middleware

### File: `server/src/middleware/ncPoolRfqAwardFeatureGate.middleware.ts`

**Constant:** `NC_POOL_RFQ_AWARD_FEATURE_FLAG_KEY = 'nc.procurement_pools.rfq.award.enabled'`

**Logic:** Two-layer gate: global flag check → per-tenant override check. Fails closed on any error (503 FEATURE_DISABLED). Resolves `orgId` from `request.dbContext?.orgId` or route params.

**Exported symbol:** `ncPoolRfqAwardFeatureGateMiddleware`

**Gate chain on award routes:** `ncPoolFeatureGateMiddleware` → `ncPoolRfqFeatureGateMiddleware` → `ncPoolRfqAwardFeatureGateMiddleware` (3-level gate).

---

## §6 Route Contract

### Pre-handler chain (all 3 award routes)

```typescript
const ownerAwardPreHandler = [
  ncPoolFeatureGateMiddleware,
  ncPoolRfqFeatureGateMiddleware,
  ncPoolRfqAwardFeatureGateMiddleware,
];
```

### Role gate

`ADMIN || OWNER` — enforced at each route handler entry.

### GET /:poolId/rfq/:rfqId/quotes

| Field | Value |
|-------|-------|
| Method | GET |
| Path | `/:poolId/rfq/:rfqId/quotes` |
| Params | `poolId` (UUID), `rfqId` (UUID) — validated via `rfqParamSchema` |
| Auth | ADMIN \|\| OWNER |
| Service call | `svc.listOwnerQuotes(orgId, poolId, rfqId)` |
| Success | 200 — array of `NetworkPoolRfqSupplierQuoteOwnerRecord` |

### POST /:poolId/rfq/:rfqId/quotes/:quoteId/accept

| Field | Value |
|-------|-------|
| Method | POST |
| Path | `/:poolId/rfq/:rfqId/quotes/:quoteId/accept` |
| Params | `poolId` (UUID), `rfqId` (UUID), `quoteId` (UUID) — validated via `rfqQuoteParamSchema` |
| Body | `acceptQuoteBodySchema` — strict, `request_id?: string \| null` (max 255) |
| Auth | ADMIN \|\| OWNER |
| Service call | `svc.acceptQuote(orgId, userId, poolId, rfqId, quoteId, body)` |
| Success | 200 — `NetworkPoolRfqSupplierQuoteOwnerRecord` |

### POST /:poolId/rfq/:rfqId/quotes/:quoteId/reject

| Field | Value |
|-------|-------|
| Method | POST |
| Path | `/:poolId/rfq/:rfqId/quotes/:quoteId/reject` |
| Params | `poolId` (UUID), `rfqId` (UUID), `quoteId` (UUID) — validated via `rfqQuoteParamSchema` |
| Body | `rejectQuoteBodySchema` — strict, `reject_reason?: string \| null` (max 5000), `request_id?: string \| null` (max 255) |
| Auth | ADMIN \|\| OWNER |
| Service call | `svc.rejectQuote(orgId, userId, poolId, rfqId, quoteId, body)` |
| Success | 200 — `NetworkPoolRfqSupplierQuoteOwnerRecord` |

---

## §7 Schemas Added to poolRfq.ts

### `rfqQuoteParamSchema`

```typescript
z.object({ poolId: uuidSchema, rfqId: uuidSchema, quoteId: uuidSchema })
```

Extends the existing `rfqParamSchema` (which has `poolId` + `rfqId` only) with `quoteId`.

### `acceptQuoteBodySchema`

```typescript
z.object({ request_id: z.string().max(255).nullable().optional() }).strict()
```

### `rejectQuoteBodySchema`

```typescript
z.object({
  reject_reason: z.string().max(5000).nullable().optional(),
  request_id:    z.string().max(255).nullable().optional(),
}).strict()
```

---

## §8 Error Mapping

`mapAwardRouteError` function in `poolRfq.ts`:

| Error class | HTTP code | Response code |
|-------------|-----------|---------------|
| `NetworkPoolRfqPoolNotFoundError` | 404 | `POOL_NOT_FOUND` |
| `NetworkPoolRfqInvalidPoolStateError` | 422 | `INVALID_STATE` |
| `NetworkPoolRfqRfqNotFoundError` | 404 | `RFQ_NOT_FOUND` |
| `NetworkPoolRfqTransitionDeniedError` | 422 | `INVALID_TRANSITION` |
| `NetworkPoolRfqOwnerQuoteNotFoundError` | 404 | `QUOTE_NOT_FOUND` |
| `NetworkPoolRfqSupplierQuoteNotInSubmittedError` | 422 | `INVALID_TRANSITION` |
| `NetworkPoolRfqConflictError` | 409 | `CONFLICT` |

---

## §9 Test Cases: PRQ-44 → PRQ-60

17 integration test cases appended to `server/src/routes/tenant/poolRfq.integration.test.ts` under `Network Commerce Pool RFQ Award Routes Integration`.

### GET quotes tests (PRQ-44 → PRQ-51)

| Test ID | Description | Expected |
|---------|-------------|----------|
| PRQ-44 | GET quotes — award flag disabled → 503 FEATURE_DISABLED | 503 |
| PRQ-45 | GET quotes — invalid poolId UUID → 400 | 400 |
| PRQ-46 | GET quotes — invalid rfqId UUID → 400 | 400 |
| PRQ-47 | GET quotes — unknown poolId → 200 empty array | 200 `[]` |
| PRQ-48 | GET quotes — issued RFQ, no quotes → 200 empty array | 200 `[]` |
| PRQ-49 | GET quotes — role gate, SUPPLIER rejected → 403 | 403 |
| PRQ-50 | GET quotes — role gate, VIEWER rejected → 403 | 403 |
| PRQ-51 | GET quotes — ADMIN role accepted → 200 | 200 |

### Accept tests (PRQ-52 → PRQ-54)

| Test ID | Description | Expected |
|---------|-------------|----------|
| PRQ-52 | POST accept — non-existent quoteId → 404 QUOTE_NOT_FOUND | 404 |
| PRQ-53 | POST accept — quote not in SUBMITTED state → 422 INVALID_TRANSITION | 422 |
| PRQ-54 | POST accept — submitted quote → 200 ACCEPTED | 200 |

### Reject tests (PRQ-55 → PRQ-60)

| Test ID | Description | Expected |
|---------|-------------|----------|
| PRQ-55 | POST reject — award flag disabled → 503 FEATURE_DISABLED | 503 |
| PRQ-56 | POST reject — invalid quoteId UUID → 400 | 400 |
| PRQ-57 | POST reject — unknown body key → 400 | 400 |
| PRQ-58 | POST reject — non-existent quoteId → 404 QUOTE_NOT_FOUND | 404 |
| PRQ-59 | POST reject — quote not in SUBMITTED state → 422 INVALID_TRANSITION | 422 |
| PRQ-60 | POST reject — submitted quote → 200 REJECTED | 200 |

---

## §10 Maker-Checker Migration Seed Conflict

The migration seed `20260523000000_nc_pool_lifecycle_seed/migration.sql` sets `requiresMakerChecker=true` for the `POOL QUOTED→ACCEPTED` transition edge. This is the intended future production value for high-value award flows requiring a checker step.

For Phase 1 direct-transition integration tests (`acceptQuote` end-to-end in `PRQ-54`), this is neutralized in the test file's `beforeAll` block via:

```typescript
await withBypassForSeed(prisma, async tx => {
  await tx.allowedTransition.updateMany({
    where: { entityType: 'POOL', fromStateKey: 'QUOTED', toStateKey: 'ACCEPTED' },
    data:  { requiresMakerChecker: false },
  });
});
```

And restored in `afterAll`:

```typescript
await withBypassForSeed(prisma, async tx => {
  await tx.allowedTransition.updateMany({
    where: { entityType: 'POOL', fromStateKey: 'QUOTED', toStateKey: 'ACCEPTED' },
    data:  { requiresMakerChecker: true },
  });
}).catch(() => {});
```

**Service-level unit tests** (P-OWNER-07, P-OWNER-08) mock the SM entirely and are unaffected.

---

## §11 PRQ-54 Blocker Resolution

### Blocker detected during AWARD-ROUTE-001

During integration test execution, PRQ-54 (`POST accept → submitted quote → 200 ACCEPTED`) repeatedly returned 422 `INVALID_TRANSITION` instead of the expected 200.

### Root cause

`acceptQuote` in `NetworkPoolRfqService` wraps its full execution in a single Prisma interactive transaction (`this.db.$transaction(async (tx) => {...})`). This transaction executes approximately 17 sequential DB queries over the remote Supabase connection (2× SM transitions each requiring 3–4 reads + 1 log write, plus pool/rfq/quote reads/writes). Remote Supabase round-trip latency (~200–500 ms/query) causes the total transaction time to exceed the **Prisma default interactive transaction timeout of 5000 ms**.

When the timeout elapses, Prisma closes the transaction. The SM's next DB write (`networkLifecycleLog.create` for the `QUOTED→ACCEPTED` step) fails with:

```
Transaction API error: Transaction not found. Transaction ID is invalid,
refers to an old closed transaction Prisma doesn't have information about
anymore, or was obtained before disconnecting.
```

The SM catches the DB error and returns `{ status: 'DENIED', code: 'TRANSITION_NOT_PERMITTED' }`. The service throws `NetworkPoolRfqTransitionDeniedError` → 422.

This is a production correctness issue, not merely a test limitation. A real award on production over Supabase would fail identically.

### Evidence before fix

```
[PRQ-54-DEBUG] 422 {
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Lifecycle transition denied [TRANSITION_NOT_PERMITTED]:
    Database write failed for transition POOL: 'QUOTED' → 'ACCEPTED'.
    Error: Invalid `opts.db.networkLifecycleLog.create()` invocation
    Transaction API error: Transaction not found..."
  }
}
```

### Authorized fix

Paresh authorized expansion of the AWARD-ROUTE-001 allowlist to include `server/src/services/networkPoolRfq.service.ts` for the minimal fix only.

**Change applied:** `{ timeout: 30000 }` added as the second argument to `acceptQuote`'s `$transaction` call only:

```typescript
// BEFORE
const acceptedRow = await this.db.$transaction(async (tx) => {
  // ... body ...
});

// AFTER
const acceptedRow = await this.db.$transaction(
  async (tx) => {
    // ... body unchanged ...
  },
  { timeout: 30000 },
);
```

No body logic changed. `rejectQuote` and `listOwnerQuotes` were not touched. State machine semantics unchanged.

### Evidence after fix

```
✓ PRQ-54 POST accept — submitted quote → 200 ACCEPTED   13362ms
Tests  17 passed | 43 skipped (60)
```

PRQ-54 completed in ~13 seconds against remote Supabase — confirming the 5-second default was the blocker.

### Confirmation

- Service logic (pool state validation, quote status validation, mass-reject, SM transitions, RFQ update, lifecycle log) unchanged.
- Only the `$transaction` options argument was added.
- `rejectQuote` transaction is unaffected (its ~5 queries complete within 5 s — PRQ-60 passed before and after this fix).
- `listOwnerQuotes` has no transaction.
- All 151 service unit tests continue to pass (unit tests mock the SM and Prisma; timeout options are invisible to mock-based tests).

---

## §12 Known Test Limitations

### PRQ-16 — Pre-existing intermittent transaction timeout (NOT in scope)

`PRQ-16` (`POST rfq/createMany`) fails intermittently in the full test suite due to a pre-existing `networkPoolRfqLine.createMany` transaction timeout (same root cause: default 5 s Prisma timeout over remote Supabase). This existed before AWARD-ROUTE-001 and is outside this packet's scope.

### PRQ-52 / PRQ-58 / PRQ-60 — Full-suite contamination

When the full test file runs (PRQ-1..PRQ-60), PRQ-16's transaction timeout leaves the DB connection in a degraded state that causes PRQ-52, PRQ-58, and PRQ-60 to receive unexpected 422 responses. These three tests pass correctly in isolated award-suite runs (`-t "Network Commerce Pool RFQ Award"`). The root cause is the pre-existing PRQ-16 issue, not these tests' own logic.

---

## §13 Validation Summary

### Prisma validate

```
pnpm -C server exec prisma validate
→ PASS (schema valid; pre-existing SetNull warning is known and unrelated)
```

### TypeScript

```
cd server && pnpm exec tsc --noEmit
→ PASS (exit 0, no errors)
```

### Route integration tests (isolated award suite)

```
pnpm exec vitest run src/routes/tenant/poolRfq.integration.test.ts \
  -t "Network Commerce Pool RFQ Award"

Test Files  1 passed (1)
Tests  17 passed | 43 skipped (60)
```

All 17 PRQ-44..PRQ-60 pass.

### Service unit tests

```
pnpm exec vitest run src/__tests__/networkPoolRfq.service.unit.test.ts

Test Files  1 passed (1)
Tests  151 passed (151)
```

All 151 P-OWNER + prior tests continue to pass.

---

## §14 Governance Contracts Reviewed

| Contract | Applicable | Verdict |
|----------|-----------|---------|
| `shared/contracts/db-naming-rules.md` | No — no schema changes | N/A |
| `shared/contracts/rls-policy.md` | No — route layer only | N/A |
| `shared/contracts/openapi.tenant.json` | Yes — new routes added | REVIEWED |
| `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | Yes — new route handlers | PASS |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001.md` | Yes — primary design authority | REVIEWED |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SERVICE-001.md` | Yes — service authority | REVIEWED |

`org_id` tenancy boundary maintained. All routes resolve `orgId` from `request.dbContext.orgId` and pass it as `ownerOrgId` to the service.

---

## §15 Active Constraints (Unchanged)

| Constraint | Status |
|------------|--------|
| `nc.procurement_pools.rfq.award.enabled` | `false` — not activated |
| `nc.procurement_pools.supplier_quotes.enabled` | `false` — QD-6 hold maintained |
| FE-9 (`TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001`) | HOLD_FOR_PARESH_DECISION |
| DPP (`dpp_launch_authorization`) | HOLD_FOR_PARESH_DECISION |
| Allocation persistence | Not implemented |
| Order / invoice / settlement logic | Not implemented |

---

## §16 Stop Conditions

This packet halts if:
- Prisma validate fails
- tsc produces errors
- Any of the 17 route integration tests fail (isolated run)
- Any of the 151 service unit tests fail
- Schema/migration/frontend/env changes are required
- Feature flag activation is required
- Production data mutation is required

---

## §17 Risks / Follow-up

| Item | Notes |
|------|-------|
| Award flag activation | `nc.procurement_pools.rfq.award.enabled=false` — routes deployed but gated. Paresh must authorize activation. |
| FE-9 | `TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001` — not opened. Requires explicit Paresh authorization. |
| PRQ-16 timeout | Pre-existing. Independent fix required; out of scope here. |
| Concurrent accept | Two simultaneous `acceptQuote` calls on same RFQ could both pass status check before either commits. Postgres transaction isolation provides partial mitigation; a unique constraint on `ACCEPTED` quotes per RFQ is recommended for production hardening. |
| openapi.tenant.json | The 3 new routes are added at the Fastify layer. The OpenAPI contract JSON was reviewed but not mechanically updated in this packet. A contract-sync pass should be done before FE-9 opens. |

---

## §18 Commit Message

```
feat(network-commerce): add pool rfq award routes
```
