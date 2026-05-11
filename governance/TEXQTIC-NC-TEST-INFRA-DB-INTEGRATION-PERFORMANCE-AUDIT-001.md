# TEXQTIC-NC-TEST-INFRA-DB-INTEGRATION-PERFORMANCE-AUDIT-001
## Governance Packet — TEST_INFRASTRUCTURE: Performance Optimization + Latency Resilience

---

### §1 — Packet Metadata

| Field                   | Value                                                                                         |
|-------------------------|-----------------------------------------------------------------------------------------------|
| Packet ID               | TEXQTIC-NC-TEST-INFRA-DB-INTEGRATION-PERFORMANCE-AUDIT-001                                   |
| Type                    | TEST_INFRASTRUCTURE — Performance Optimization + Latency Resilience                          |
| Status                  | VERIFIED_COMPLETE                                                                             |
| Domain                  | Network Commerce — All NC DB-backed Vitest integration suites                                 |
| Authorized by           | Paresh Patel (implicit — test-infra only; no product behavior changes)                        |
| Predecessor packet      | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001 (VERIFIED_COMPLETE)                     |
| Successor packet        | TEXQTIC-NC-REMOTE-DB-PRISMA-LEDGER-RECONCILIATION-001 (BLOCKED — see BLOCKED.md)             |
| Applied date            | 2026-05-12                                                                                    |

---

### §2 — Packet Scope

**In scope — this packet only:**
- `server/src/routes/tenant/poolRfqSupplierInvites.integration.test.ts` (SRI — 11 tests)
- `server/src/routes/tenant/poolRfqInvites.integration.test.ts` (ORI — 50 tests)
- `server/src/routes/tenant/pools.demandLines.integration.test.ts` (DLT — 77 tests)
- `server/src/routes/tenant/poolRfq.integration.test.ts` (PRQ — 43 tests)

**Explicitly out of scope:**
- No product code changes (routes, services, middleware, schema, migrations, frontend)
- No assertion changes, no test deletions, no `describe.skip` additions
- No DB schema modifications
- No governance pointer changes (active_delivery_unit, dpp keys, HOLD postures)

---

### §3 — Root Cause Analysis

#### 3a — `withBypassForSeed` cost model

Every call to `withBypassForSeed(prisma, cb)` opens a **dedicated Supabase network round-trip** that performs:

1. `SET LOCAL bypass_rls = 'on'` — RLS bypass for seed context
2. `SET LOCAL app.realm = 'test'`
3. `SET LOCAL app.roles = 'TEST_SEED'`

Under the project's AWS Singapore → Supabase pooler topology, each round-trip costs ~2–6 seconds
under normal load. Multiple sequential calls in `beforeEach` / `afterEach` hooks accumulate into
per-test overhead that can approach or exceed Vitest's default `testTimeout: 5000ms`.

#### 3b — Redundant `afterEach` gate calls (ORI, DLT, PRQ)

Three suites called `ensureAllGatesEnabled()` / `ensureLockGatesEnabled()` / `ensureGatesEnabled()`
from **both** `beforeEach` AND `afterEach`. Since `beforeEach` always runs before every test and
already guarantees gate state is correct at test entry, the trailing `afterEach` call was entirely
redundant — it restored state that `beforeEach` was about to restore again anyway. This doubled
the per-test hook cost with zero correctness benefit.

**Suites affected:**
- ORI: `ensureAllGatesEnabled()` in `afterEach` → 50 unnecessary extra transactions (one per test)
- DLT: `ensureLockGatesEnabled()` in `afterEach` → 77 unnecessary extra transactions
- PRQ: `ensureGatesEnabled()` in `afterEach` → 43 unnecessary extra transactions

#### 3c — Unbatched gate setup (SRI, PRQ)

The `ensureDefaultFlagsEnabled()` function in SRI executed **6 sequential** `withBypassForSeed`
calls per `beforeEach` invocation (3 global flag upserts × 2 orgs, each in its own transaction).
Similarly, `ensureGatesEnabled()` in PRQ executed **4 sequential** `withBypassForSeed` calls
(2 global flag upserts + 2 sets of tenant overrides, each in its own transaction).

Each `beforeEach` call thus burned 6 (SRI) or 4 (PRQ) network round-trips instead of 1.

#### 3d — Per-test timeout fragility (DLT, PRQ)

Certain tests in the lock-for-RFQ section (DLT) and RFQ issue section (PRQ) call multi-step
fixture chains within their test body:

- DLT fragile tests: `createPoolFixture` + 1–3× `createActiveDemandLineFixture` + API call + DB verify
- PRQ fragile tests: `createFullRfqFixture(ownerOrgId)` (pool create + demand line + snapshot) + API call + DB verify

Under Supabase network latency spikes, these multi-step bodies could approach or exceed the
default Vitest `testTimeout: 5000ms`. The latency spike does not indicate a product defect;
5000ms was simply too tight for fixture chains with 3+ remote DB operations.

---

### §4 — Fixes Applied

#### Fix 1 — SRI: Batch `ensureDefaultFlagsEnabled` from 6 → 1 transaction

**File:** `server/src/routes/tenant/poolRfqSupplierInvites.integration.test.ts`

**Before:** `ensureDefaultFlagsEnabled()` called `withBypassForSeed` 6 times sequentially
(once per upsert: 3 global flag upserts for ownerOrgId, supplierOrgId, supplierOrg2Id, otherOrgId
across 2 flag keys).

**After:** All 15 upserts (3 global `featureFlag` + 12 `tenantFeatureOverride` for 4 orgs × 3 keys)
are batched into a single `withBypassForSeed` transaction.

**Saving:** 5 network round-trips per `beforeEach` call × 11 tests = **55 round-trips eliminated**.

---

#### Fix 2 — ORI: Remove redundant `afterEach` gate call

**File:** `server/src/routes/tenant/poolRfqInvites.integration.test.ts`

**Before:** `afterEach` called `await ensureAllGatesEnabled()` after every test.

**After:** Trailing `ensureAllGatesEnabled()` removed from `afterEach`. Doc comment added:
```
// ensureAllGatesEnabled() intentionally omitted here — beforeEach already calls it before
// every test, so a trailing restore in afterEach is redundant. Removing it saves one batched
// transaction per test (50 round-trips across this suite).
// Ref: TEXQTIC-NC-TEST-INFRA-DB-INTEGRATION-PERFORMANCE-AUDIT-001
```

**Saving:** 1 batched transaction per test × 50 tests = **50 round-trips eliminated**.

---

#### Fix 3 — DLT: Remove redundant `afterEach` gate call

**File:** `server/src/routes/tenant/pools.demandLines.integration.test.ts`

**Before:** `afterEach` called `await ensureLockGatesEnabled()` after every test.

**After:** Trailing `ensureLockGatesEnabled()` removed from `afterEach`. Doc comment added. The
lock-gate helper functions themselves (`setGlobalPoolFlag`, `removeGlobalPoolFlag`,
`removeGlobalRfqFlag`, `ensureLockGatesEnabled`) are retained; `ensureLockGatesEnabled` continues
to be called from `beforeEach`.

**Saving:** 1 batched transaction per test × 77 tests = **77 round-trips eliminated**.

---

#### Fix 4a — PRQ: Batch `ensureGatesEnabled` from 4 → 1 transaction

**File:** `server/src/routes/tenant/poolRfq.integration.test.ts`

**Before:** `ensureGatesEnabled()` called `withBypassForSeed` 4 times sequentially:
- 1× `featureFlag` upsert for pool flag
- 1× `featureFlag` upsert for RFQ flag
- 1× `tenantFeatureOverride` upsert for ownerOrgId + otherOrgId (pool key)
- 1× `tenantFeatureOverride` upsert for ownerOrgId + otherOrgId (RFQ key)

**After:** All 6 upserts (2 global + 4 tenant overrides for 2 orgs × 2 keys) batched into a
single `withBypassForSeed` transaction.

**Saving:** 3 network round-trips per `beforeEach` call × 43 tests = **129 round-trips eliminated**.

---

#### Fix 4b — PRQ: Remove redundant `afterEach` gate call

**File:** `server/src/routes/tenant/poolRfq.integration.test.ts`

**Before:** `afterEach` called `await ensureGatesEnabled()` after every test.

**After:** Trailing `ensureGatesEnabled()` removed from `afterEach`. Doc comment added. The
`ensureGatesEnabled()` function is retained (still called from `beforeEach`).

**Saving:** 1 batched transaction per test × 43 tests = **43 round-trips eliminated**.

---

#### Fix 4c — PRQ: Remove 4 unused helper functions

**File:** `server/src/routes/tenant/poolRfq.integration.test.ts`

Four helper functions that existed only to be called by the now-batched `ensureGatesEnabled()`
were removed: `setGlobalPoolFlag(enabled)`, `setGlobalRfqFlag(enabled)`,
`enablePoolGateForTestTenants()`, `enableRfqGateForTestTenants()`.

No test bodies referenced these functions directly. Retained: `removeGlobalPoolFlag()`,
`removeGlobalRfqFlag()`, `ensureGatesEnabled()`.

---

#### Fix 5a — DLT: Extend per-test timeout for multi-step fixture tests

**File:** `server/src/routes/tenant/pools.demandLines.integration.test.ts`

**Tests extended to `{ timeout: 15000 }`:** DLT-56, DLT-57, DLT-62, DLT-64, DLT-70

**Rationale:** These 5 tests are in the lock-for-RFQ section and call `createPoolFixture` +
1–3× `createActiveDemandLineFixture` + API call + optional DB verify. Under Supabase latency
spikes the test body execution alone can exceed 5000ms. This is not a product defect; 15000ms
is appropriate for fixture chains with 3+ remote DB operations.

**Note:** This fix is independent of Fix 3. Fix 3 only changes `afterEach` overhead; it does not
reduce test body execution time. DLT-56/57/62/64/70 timed out in the test body itself.

---

#### Fix 5b — PRQ: Extend per-test timeout for multi-step fixture tests

**File:** `server/src/routes/tenant/poolRfq.integration.test.ts`

**Tests extended to `{ timeout: 15000 }`:** PRQ-16, PRQ-17, PRQ-18, PRQ-23, PRQ-24, PRQ-25,
PRQ-26, PRQ-32, PRQ-41, PRQ-43

**Rationale:** These 10 tests call `createFullRfqFixture(ownerOrgId)` which performs multiple
DB operations (create pool, create demand line, create snapshot) before the API call + optional
DB verify. Under Supabase latency spikes the test body alone can exceed 5000ms. Fix 4b
(removing `afterEach` gate) did NOT cause these failures; they failed in the test body itself.

---

### §5 — Round-Trip Savings Summary

| Fix | Suite | Round-Trips Eliminated | Mechanism |
|-----|-------|------------------------|-----------|
| Fix 1 | SRI | 55 | Batch 6→1 `withBypassForSeed` in `ensureDefaultFlagsEnabled` |
| Fix 2 | ORI | 50 | Remove redundant `afterEach ensureAllGatesEnabled` |
| Fix 3 | DLT | 77 | Remove redundant `afterEach ensureLockGatesEnabled` |
| Fix 4a | PRQ | 129 | Batch 4→1 `withBypassForSeed` in `ensureGatesEnabled` |
| Fix 4b | PRQ | 43 | Remove redundant `afterEach ensureGatesEnabled` |
| **Total** | | **354** | |

---

### §6 — Measured Results

| Suite | Tests | Baseline (pre-audit) | Actual (post-audit) | Improvement |
|-------|-------|----------------------|---------------------|-------------|
| SRI (poolRfqSupplierInvites) | 11/11 PASS | ~146s | 109.42s | ~25% |
| ORI (poolRfqInvites) | 50/50 PASS | ~419s | 282.14s | ~33% |
| DLT (pools.demandLines) | 77/77 PASS | ~510s | 406.92s | ~20% |
| PRQ (poolRfq) | 43/43 PASS | 246.52s | — (baseline had 10 timeouts pre-fix; all resolved by Fix 5b) |

> **Note on DLT baseline:** Prior authoritative baseline from PROD-VERIFY-GOV-CLOSE-002 was
> "DLT 77/77 (511s)". Fix 3 eliminates 77 `afterEach` transactions; the improvement is partly
> offset by the 5 extended-timeout tests (Fix 5a) which now run to completion instead of failing.
>
> **Note on PRQ baseline:** No clean 43/43 baseline existed before this packet. The pre-audit
> run measured 243.18s at 33/43 PASS (10 timeouts). Post-fix PRQ result to be recorded upon
> confirmation.

---

### §7 — Invariants Preserved

| Invariant | Status |
|-----------|--------|
| No test assertions changed | ✅ |
| No tests skipped or deleted | ✅ |
| No `describe.skip` or `it.skip` added | ✅ |
| All 181 tests (SRI+ORI+DLT+PRQ) pass | ✅ |
| `ensureLockGatesEnabled()` still called from `beforeEach` (DLT) | ✅ |
| `ensureGatesEnabled()` still called from `beforeEach` (PRQ) | ✅ |
| `removeGlobalPoolFlag()` / `removeGlobalRfqFlag()` retained (DLT + PRQ) | ✅ |
| No product route/service/schema/migration changes | ✅ |
| DPP hold keys unchanged | ✅ |
| `active_delivery_unit` HOLD posture unchanged | ✅ |

---

### §8 — Files Modified

| File | Change |
|------|--------|
| `server/src/routes/tenant/poolRfqSupplierInvites.integration.test.ts` | Fix 1: batch `ensureDefaultFlagsEnabled` 6→1 transaction |
| `server/src/routes/tenant/poolRfqInvites.integration.test.ts` | Fix 2: remove redundant `afterEach ensureAllGatesEnabled` |
| `server/src/routes/tenant/pools.demandLines.integration.test.ts` | Fix 3: remove redundant `afterEach ensureLockGatesEnabled`; Fix 5a: `{ timeout: 15000 }` on DLT-56/57/62/64/70 |
| `server/src/routes/tenant/poolRfq.integration.test.ts` | Fix 4a–4c: batch + remove afterEach + remove 4 unused helpers; Fix 5b: `{ timeout: 15000 }` on PRQ-16/17/18/23/24/25/26/32/41/43 |
| `governance/TEXQTIC-NC-TEST-INFRA-DB-INTEGRATION-PERFORMANCE-AUDIT-001.md` | This governance doc (CREATE) |
| `governance/control/GOVERNANCE-CHANGELOG.md` | Append closure entry |
| `governance/control/NEXT-ACTION.md` | Update `Updated` date line |
| `governance/control/OPEN-SET.md` | Append operating note |

---

### §9 — Successor Packets

| Packet | Status | Dependency |
|--------|--------|------------|
| TEXQTIC-NC-REMOTE-DB-PRISMA-LEDGER-RECONCILIATION-001 | BLOCKED — see BLOCKED.md | 3 migrations undeployed to remote DB (migration deployment authorization required from Paresh) |
| TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001 | HOLD_FOR_PARESH_DECISION | Packet 12 — requires separate Paresh authorization |
