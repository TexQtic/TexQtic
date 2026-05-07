# TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-PROD-VERIFY-GOV-CLOSE-001

```
Unit:     TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-PROD-VERIFY-GOV-CLOSE-001
Type:     VERIFICATION + GOVERNANCE_CLOSURE
Status:   VERIFIED_COMPLETE_AND_GOV_SYNCED
Date:     2026-05-08
Author:   Paresh Patel
```

---

## Closes

| Packet | Commit | Status |
|--------|--------|--------|
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001 | `8241991` | IMPLEMENTED + VERIFIED |
| TEXQTIC-NC-PHASE1-POOL-ROUTE-REGRESSION-FIXTURE-STABILITY-001 | `f5b655e` | IMPLEMENTED + VERIFIED |
| TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-001              | `1bc1b09` | IMPLEMENTED + VERIFIED |

---

## Evidence: Test Results

| Suite | Result | Method |
|-------|--------|--------|
| `networkPoolDemandLine.service.unit.test.ts` (30 tests) | 30/30 PASS | `vitest run` — this session |
| `pools.demandLines.integration.test.ts` (37 tests, DLT-01..DLT-37) | 37/37 PASS | `vitest run` — this session |
| `pools.integration.test.ts` (56 tests) | 56/56 PASS | `vitest run` — this session |
| Combined concurrent (both integration files) | 93/93 PASS | `vitest run` — this session |
| `stateMachine.g020.test.ts` (32 tests) | 32/32 PASS | `vitest run` — this session |
| `network-pool.service.integration.test.ts` | 5 skipped | Pre-existing DB harness guard (documented in pool discovery closure) |
| `network-invoice.service.unit.test.ts` | 16/16 PASS | Unit test batch — this session |
| `invoice.service.unit.test.ts` | 18/18 PASS | Unit test batch — this session |
| Three-file unit batch total | 64/64 PASS | `vitest run` — this session |

## Evidence: Build

| Check | Result |
|-------|--------|
| `prisma generate` | PASS — this session |
| `tsc --noEmit` (server) | CLEAN — this session |

## Evidence: Runtime Smoke

Server started: `http://localhost:3001` (tsx/esm)

| Probe | Expected | Actual |
|-------|----------|--------|
| `GET /health` | 200 | **200** |
| `GET /api/tenant/network-commerce/pools/:poolId/demand-lines` (unauth) | 401 | **401** |
| `POST /api/tenant/network-commerce/pools/:poolId/demand-lines` (unauth) | 401 | **401** |
| `PATCH /api/tenant/network-commerce/pools/:poolId/demand-lines/:lineId` (unauth) | 401 | **401** |
| `POST /api/tenant/network-commerce/pools/:poolId/demand-lines/:lineId/cancel` (unauth) | 401 | **401** |
| `POST /api/tenant/network-commerce/pools/:poolId/demand-lines/:lineId/lock-for-rfq` (not implemented) | 404 | **404** |

Authenticated runtime smoke: `DEMAND_LINE_RUNTIME_AUTH_SMOKE_COVERED_BY_INTEGRATION_SUITE`
(37/37 integration tests provide full authenticated coverage against real DB via test harness)

## Evidence: DB Cleanup

| Table | Prefix | Count after test run |
|-------|--------|----------------------|
| `network_pool_demand_lines` | `DL-ROUTE-%` | **0** (psql -t → whitespace) |
| `network_pools` | `DL-POOL-%` | **0** (psql -t → whitespace) |

Cleanup mechanism: `afterAll` prefix-based deletion + feature flag/override restoration in `pools.demandLines.integration.test.ts`.

---

## Implementation Verification

### Service: `server/src/services/networkPoolDemandLine.service.ts` (commit `8241991`)

**Error classes (all verified present):**
- `DemandLineNotFoundError`
- `DemandLineInvalidInputError`
- `DemandLineInvalidStateError`
- `DemandLinePoolNotFoundError`
- `DemandLinePoolStateError`
- `DemandLineDuplicateRefError`
- `DemandLineForbiddenError` (future-proofing)
- `DemandLineSnapshotBlockedError` (future-proofing — `lockDemandLinesForRfq` blocked)

**Constants (all verified):**
- `DEMAND_LINE_STATUS`: DRAFT, ACTIVE, LOCKED_FOR_RFQ, SUPERSEDED, CANCELLED
- `DEMAND_LINE_SOURCE_TYPE`: OWNER_DIRECT, OWNER_NORMALIZED, MEMBERSHIP_DERIVED
- `EDITABLE_LINE_STATUSES = ['DRAFT', 'ACTIVE']`
- `CANCELLABLE_LINE_STATUSES = ['DRAFT', 'ACTIVE']`
- `POOL_STATES_ALLOWING_DEMAND_WRITES = ['DRAFT', 'OPEN', 'AGGREGATING']`

**`DemandLineRecord` interface:** explicitly excludes `metadata_internal_json`. Verified.

**`toRecord()` helper:** does NOT map `metadataInternalJson`. Verified.

**Service methods implemented:**
- `createDemandLine`: required field validation, source_type guard, delivery window ordering, pool existence (scoped to ownerOrgId), pool state gate, duplicate lineRef guard, creates at `status=DRAFT`, `revision_no=1`. Verified.
- `updateDemandLine`: at-least-one-field guard, line load scoped to ownerOrgId (non-leaking 404), line status gate, pool state gate, qty/blank validation. Verified.
- `listDemandLines`: explicit pool existence check (non-leaking 404 for absent/wrong-org pool), filter + pagination. Verified.
- `cancelDemandLine`: line load scoped to ownerOrgId, CANCELLABLE_LINE_STATUSES guard. Verified.
- `lockDemandLinesForRfq`: **NOT IMPLEMENTED** — `DemandLineSnapshotBlockedError` defined, no method body. Correct per DECISION-RECORD-001.

**D-017-A compliance:** `ownerOrgId` always from parameter (supplied by route from `request.dbContext.orgId`). Verified.

### Route Plugin: `server/src/routes/tenant/poolDemandLines.ts` (commit `1bc1b09`)

**Routes registered (4 active, 1 blocked):**
- `GET /:poolId/demand-lines` — list demand lines
- `POST /:poolId/demand-lines` — create demand line
- `PATCH /:poolId/demand-lines/:lineId` — update demand line
- `POST /:poolId/demand-lines/:lineId/cancel` — cancel demand line
- `POST /:poolId/demand-lines/:lineId/lock-for-rfq` — **NOT REGISTERED** (404 at runtime). Confirmed.

**All routes use:** `tenantAuthMiddleware`, `databaseContextMiddleware`, `ncPoolFeatureGateMiddleware`. Verified.

**D-017-A compliance:** `orgId` sourced from `request.dbContext.orgId` only on all 4 routes. Verified.

**Forbidden body fields (POST create):** `pool_id`, `owner_org_id` — rejected via `z.never()`. Verified.
`pool_id` injected server-side from URL param. Verified.

**`metadata_internal_json`:** not exposed in any route response. Verified.

**Error mapping (`mapDemandLineServiceError`):** all service error classes mapped to correct HTTP codes:
- `DemandLineNotFoundError` → 404
- `DemandLinePoolNotFoundError` → 404
- `DemandLineInvalidInputError` → 400
- `DemandLineInvalidStateError` → 422
- `DemandLinePoolStateError` → 422
- `DemandLineDuplicateRefError` → 409
- `DemandLineSnapshotBlockedError` → 422
- `P2002 (Prisma)` → 409

**Registration in `server/src/routes/tenant.ts` (commit `1bc1b09`):**
```
import tenantPoolDemandLineRoutes from './tenant/poolDemandLines.js';
fastify.register(tenantPoolDemandLineRoutes, { prefix: '/tenant/network-commerce/pools' });
```
Verified.

### Feature Gate: `ncPoolFeatureGateMiddleware`

Two-layer gate — Layer 1 global `featureFlag`, Layer 2 `tenantFeatureOverride` — both must exist AND `enabled: true`. Any absent/false → 503 `FEATURE_DISABLED`. Verified unchanged and operating correctly (integration suite exercises gate paths DLT-03 through DLT-05).

### Concurrent Test Fixture Stability (commit `f5b655e`)

- **Fix A:** `afterEach` in both `pools.integration.test.ts` and `pools.demandLines.integration.test.ts` calls `ensureGateEnabled()` / `ensurePoolGateEnabled()` after cleanup to prevent concurrent worker feature-flag contamination. Verified.
- **Fix B:** `createPoolFixture` in demand-lines test computes `poolRef` INSIDE the `withBypassForSeed` callback so each P2028 retry generates a fresh unique ref. Verified.
- 93/93 combined concurrent PASS. P2028 unique-constraint retry warning present (expected — Fix B working).

---

## Scope Boundary

Implemented and verified:
- Demand-line service: create / list / update / cancel
- Demand-line tenant routes: 4 routes at `/tenant/network-commerce/pools/:poolId/demand-lines`

Explicitly out of scope (BLOCKED or deferred):
- `lockDemandLinesForRfq` — **BLOCKED** (prerequisite: snapshot schema `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001`)
- RFQ schema, RFQ routes, supplier quote routes
- Allocation, order placement, invoice generation, settlement, escrow
- UI, control-plane admin routes, MakerChecker
- DPP HOLD_FOR_PARESH_DECISION posture: **PRESERVED. NOT MODIFIED.**

---

## Posture After

```
NC demand-line service + route (create/list/update/cancel): IMPLEMENTED_VERIFIED_GOV_SYNCED
NC demand-line service commit:      8241991
NC fixture stability commit:        f5b655e
NC demand-line route commit:        1bc1b09
NC lockDemandLinesForRfq:           BLOCKED — snapshot schema prerequisite
NC next candidate:                  TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001
NC next candidate status:           HOLD_FOR_PARESH_DECISION
DPP HOLD_FOR_PARESH_DECISION:       PRESERVED — NOT MODIFIED
```
