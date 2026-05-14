# TEXQTIC-NC-PHASE1-POOL-ORDER-001 — Pool Order Trigger (Packet 18)

**Status:** IMPLEMENTED  
**Date Opened:** 2026-07-02  
**Authorized by:** Paresh Patel  
**Layer:** Network Commerce — Phase 1  
**Prior Packet:** TEXQTIC-NC-PHASE1-POOL-RFQ-READ-SURFACES-001 (Packet 17, VERIFIED_COMPLETE 2026-07-02)

---

## Objective

Add a safe, tenant-scoped Pool Order trigger surface: `POST /api/tenant/network-commerce/pools/:poolId/order`.  
Transitions a pool from `ALLOCATED → ORDERED` lifecycle state via `StateMachineService` atomically.  
No schema changes. No migration. No new feature gates. No frontend changes.

---

## Scope (Path A — Lifecycle-Only Transition)

**Allowlist (Modify):**
1. `server/src/services/networkPool.service.ts` — `TriggerPoolOrderInput` interface + `triggerPoolOrder()` method
2. `server/src/routes/tenant/pools.ts` — `orderPoolBodySchema` + `POST /:poolId/order` route (8th route)
3. `server/src/__tests__/network-pool.service.unit.test.ts` — P-NP-16..21 (21 tests total)
4. `server/src/routes/tenant/pools.integration.test.ts` — PORDER-01..08

**Explicitly Out of Scope:**
- No schema.prisma changes
- No Prisma migrations
- No new feature flags (reuses existing `nc.procurement_pools.enabled` gate)
- No frontend changes
- No `orderedAt` timestamp field (does not exist on NetworkPool)
- No ALLOCATING/ALLOCATED service methods
- No invoice, settlement, DPP, G-022, OES, VCO changes
- `nc.procurement_pools.rfq.award.enabled` = false — UNCHANGED
- `nc.procurement_pools.supplier_quotes.enabled` = false — UNCHANGED
- DPP = HOLD_FOR_PARESH_DECISION — UNCHANGED
- G-022 = HOLD_FOR_PARESH_DECISION — UNCHANGED

---

## Architecture Summary

- **Route:** `POST /api/tenant/network-commerce/pools/:poolId/order`
- **Auth:** `tenantAuthMiddleware` + `databaseContextMiddleware` + `ncPoolFeatureGateMiddleware` (2-gate chain)
- **Feature Gate:** `nc.procurement_pools.enabled` (same gate as all other pool routes — no new gate)
- **Tenancy boundary:** `orgId` from `dbContext.orgId` only (D-017-A compliant)
- **State machine:** `StateMachineService.transition()` — `ALLOCATED → ORDERED`, `requires_maker_checker=false`
- **Actor:** `deriveActorType(userRole)` → `TENANT_ADMIN` (OWNER/ADMIN roles)
- **Atomic pattern:** SM log write + `networkPool.update` in single `$transaction` (shared-tx)
- **Error mapping:** `mapPoolServiceError()` — 6 `NetworkPool*Error` classes to HTTP responses

---

## Service Method: `triggerPoolOrder`

```typescript
async triggerPoolOrder(orgId: string, input: TriggerPoolOrderInput): Promise<NetworkPoolRecord>
```

1. Owner-scoped pool lookup with `lifecycleState` — throws `NetworkPoolNotFoundError` if not found
2. Guard: `currentStateKey !== 'ALLOCATED'` → throws `NetworkPoolInvalidStateError`
3. Resolve `ORDERED` state ID — throws `NetworkPoolLifecycleStateMissingError` if absent
4. Atomic `$transaction`: SM transition + `networkPool.update({ lifecycleStateId: orderedState.id })`
5. SM `status !== 'APPLIED'` → throws `NetworkPoolTransitionDeniedError`
6. Returns `NetworkPoolRecord` with `lifecycle_state_key: 'ORDERED'`

---

## Test Coverage

### Unit Tests (P-NP-16..21)

| ID | Scenario | Result |
| --- | --- | --- |
| P-NP-16 | Happy path: `result.lifecycle_state_key === 'ORDERED'`, SM called once | PASS |
| P-NP-17 | SM call args: `fromStateKey=ALLOCATED`, `toStateKey=ORDERED`, entityId/orgId/reason verified | PASS |
| P-NP-18 | Pool not found → rejects with `NetworkPoolNotFoundError` | PASS |
| P-NP-19 | Pool in OPEN state → rejects with `NetworkPoolInvalidStateError` | PASS |
| P-NP-20 | SM returns DENIED → rejects with `NetworkPoolTransitionDeniedError` | PASS |
| P-NP-21 | ORDERED state missing → rejects with `NetworkPoolLifecycleStateMissingError` | PASS |

**Total unit tests after Packet 18:** 21/21 PASS

### Integration Tests (PORDER-01..08)

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| PORDER-01 | ALLOCATED pool → POST /order → 200 ORDERED | 200, `lifecycle_state_key=ORDERED` | PASS |
| PORDER-02 | DRAFT pool (non-ALLOCATED) → POST /order → 422 INVALID_STATE | 422 | PASS |
| PORDER-03 | Other org tries to order owner pool → 404 POOL_NOT_FOUND | 404 | PASS |
| PORDER-04 | Non-existent poolId → 404 POOL_NOT_FOUND | 404 | PASS |
| PORDER-05 | Feature gate disabled → 503 FEATURE_DISABLED | 503 | PASS |
| PORDER-06 | Missing reason field → 400 VALIDATION_ERROR | 400 | PASS |
| PORDER-07 | Unknown field `actor_type` (strict schema) → 400 VALIDATION_ERROR | 400 | PASS |
| PORDER-08 | No auth headers → 401 | 401 | PASS |

**Total integration tests after Packet 18:** 62 passed (PORDER-01..08 all PASS).  
Pre-existing failures: 2 (OPR-05, DLR-06 — FK constraint on `tenant_feature_overrides_key_fkey` in `enablePoolGateForTestTenants`; predates this packet).

### Packet 17 Regression

67/67 PASS (`poolRfq.integration.test.ts`) — no regression from Packet 18.

---

## TypeScript Validation

`pnpm exec tsc --noEmit` from `server/` → EXIT 0 (zero errors).

---

## Implementation Commit

`feat(network-commerce): add pool order trigger` — `a4c788c`

---

## Invariants Preserved

- D-017-A: `orgId` sourced exclusively from `dbContext.orgId`
- `nc.procurement_pools.rfq.award.enabled` = false (UNCHANGED)
- `nc.procurement_pools.supplier_quotes.enabled` = false (UNCHANGED)
- DPP launch authorization = HOLD_FOR_PARESH_DECISION (UNCHANGED)
- G-022 = HOLD_FOR_PARESH_DECISION (UNCHANGED)
- No schema.prisma, migrations, .env, or frontend changes
- `orderedAt` field NOT added (does not exist on NetworkPool)
