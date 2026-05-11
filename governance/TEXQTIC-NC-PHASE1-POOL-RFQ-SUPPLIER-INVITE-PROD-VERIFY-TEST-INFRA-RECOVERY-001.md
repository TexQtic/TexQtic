# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-TEST-INFRA-RECOVERY-001

**Status:** `CLOSED — SCOPE_A_RESOLVED / SCOPE_B_RESOLVED_IN_RECOVERY-002 / SCOPE_C_NOT_A_GATE`
**Packet type:** Test-infrastructure recovery
**Predecessor packet:** `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-GOV-CLOSE-001` (`PROD_VERIFICATION_PARTIAL_BLOCKED_ON_TEST_INFRA_AND_E2E`)
**Commit:** NOT MADE — stop condition 2 triggered (DLT 74/77 FAIL)

---

## 1. Starting Governance Posture (Confirmed at Session Open)

| Field | Value |
|---|---|
| `active_delivery_unit` | `HOLD_FOR_AUTHORIZATION` |
| `dpp_launch_authorization` | `HOLD_FOR_PARESH_DECISION` |
| `dpp_passport_network_readiness` | `PRODUCTION_READY` |
| `last_closed_unit` | `TECS-DPP-PASSPORT-NETWORK-LAUNCH-GATE-001 VERIFIED_COMPLETE` |
| Predecessor status | `PROD_VERIFICATION_PARTIAL_BLOCKED_ON_TEST_INFRA_AND_E2E` |
| FE-7 | NOT opened — hold confirmed |
| DPP hold key | Unchanged — confirmed |

---

## 2. Root Cause Analysis

### Problem 1 — Immutable snapshot-line teardown (affects both ORI and DLT suites)

Both `poolRfqInvites.integration.test.ts` and `pools.demandLines.integration.test.ts` have identical afterEach / afterAll cleanup patterns that include:

```typescript
await tx.networkPoolDemandSnapshotLine.deleteMany({ where: { poolId: { in: poolIds } } });
await tx.networkPoolDemandSnapshot.deleteMany({ where: { poolId: { in: poolIds } } });
await tx.networkPoolDemandLine.deleteMany({ where: { poolId: { in: poolIds } } });
// ...
await tx.networkPool.deleteMany({ where: { id: { in: poolIds } } });
```

**Trigger:** `prevent_snapshot_line_mutation` (defined in `20260525000000_nc_pool_demand_snapshot_schema/migration.sql` lines 176–182) is `BEFORE UPDATE OR DELETE` on `network_pool_demand_snapshot_lines` and raises P0001 unconditionally — no RLS bypass path exists.

**Cascade chain:**
- Deleting `networkPoolDemandSnapshotLine` directly → P0001
- Deleting `networkPoolDemandSnapshot` → FK onDelete:Cascade to snapshotLines → P0001
- Deleting `networkPool` → FK onDelete:Cascade to snapshotLines → P0001
- Deleting `networkPoolDemandLine` → FK from snapshotLines is RESTRICT → blocked while snapshotLine rows exist

**Result:** The entire `withBypassForSeed` transaction aborts. The `.catch(() => {})` silently swallows the error. Records remain in DB. Connections may linger in an error state.

### Problem 2 — `ensureAllGatesEnabled` / `ensureLockGatesEnabled` hookTimeout

Both suites call their respective `ensure*Enabled()` function from both `beforeEach` and `afterEach`. Each function makes 4–6 separate `withBypassForSeed` calls = 4–6 DB transactions per invocation.

**Pattern:**
```
beforeEach:  4–6 transactions (ensure gates)
test body:   fixture creates + API calls
afterEach:   1 transaction (cleanup) + 4–6 transactions (ensure gates)
             = 6–8 total per test
```

For 50 (ORI) or 77 (DLT) sequential tests under Supabase network latency, cumulative load causes individual `withBypassForSeed` calls to slow down past the 15-second `hookTimeout` by test ~21 (ORI) and test ~26 (DLT), causing false FAIL marks on otherwise-passing tests.

---

## 3. Scope A — poolRfqInvites.integration.test.ts — RESOLVED ✓

### Fix applied (allowlisted file)

**Part 1 — Remove 4 blocked `deleteMany` calls from `afterEach` and `afterAll`:**

Removed:
- `tx.networkPoolDemandSnapshotLine.deleteMany()` — immutable trigger
- `tx.networkPoolDemandSnapshot.deleteMany()` — cascade to snapshotLines
- `tx.networkPoolDemandLine.deleteMany()` — RESTRICT FK while snapshotLines exist
- `tx.networkPool.deleteMany()` — cascade to snapshotLines

Kept (safe):
- `tx.networkPoolRfqSupplierInvite.deleteMany()` — no immutability constraint
- `tx.networkPoolRfqLine.deleteMany()` — 0 rows in these tests (no trigger fires)
- `tx.networkPoolRfq.deleteMany()` — no cascade to snapshotLines
- `tx.networkPoolMembership.deleteMany()` — 0 rows (no sourceMembershipId in fixtures)
- `tx.tenantFeatureOverride.deleteMany()` — unaffected

**Part 2 — Batch `ensureAllGatesEnabled()` from 6 transactions → 1:**

Removed unused `setGlobalFlag` and `enableFlagForTestTenants` helper functions.
Rewrote `ensureAllGatesEnabled()` to perform all 9 flag upserts (3 global + 6 tenant overrides) in a single `withBypassForSeed` transaction.

**DB residue (expected, non-interfering):**
Pools, demand_lines, snapshots, and snapshot_lines from test runs are left in DB. Records are scoped to per-test-run random UUIDs. They do not affect test correctness of any subsequent run.

### Evidence

```
Test Files  1 passed (1)
      Tests  50 passed (50)
   Start at  13:30:01
   Duration  479.91s
```

**Prior run (broken):** 47/50, 838s, 3 failures (hookTimeout + 503)
**Post-fix run:** 50/50, 480s — 43% faster, zero failures

**No product behavior changes.** The fix is purely test-harness cleanup alignment.

---

## 4. Scope B — pools.demandLines.integration.test.ts — BLOCKED ✗

### Current state

```
Test Files  1 failed (1)
      Tests  3 failed | 74 passed (77)
   Start at  13:38:32
   Duration  1066.60s
```

Failures: DLT-26, DLT-45, DLT-67 — all hookTimeout at 15000ms (same pattern as ORI before fix).
P0001 from `prevent_snapshot_line_mutation` visible in stderr (same root cause as Scope A).

### Why DLT is blocked

`pools.demandLines.integration.test.ts` is NOT in the current allowlist. The stop condition is triggered:
> STOP without committing if pools.demandLines.integration.test.ts cannot reach 77/77 PASS in a fresh isolated run.

### Exact fix required (ready to apply on allowlist expansion)

**Part 1 — Remove 4 blocked `deleteMany` calls from `afterEach` (line 312) and `afterAll` (line 350):**

Same 4 calls as Scope A:
- `tx.networkPoolDemandSnapshotLine.deleteMany()`
- `tx.networkPoolDemandSnapshot.deleteMany()`
- `tx.networkPoolDemandLine.deleteMany()`
- `tx.networkPool.deleteMany()`

Keep: `tx.networkPoolMembership.deleteMany()` and `tx.tenantFeatureOverride.deleteMany()`.

**Part 2 — Batch `ensureLockGatesEnabled()` from 4 transactions → 1:**

Current implementation (4 transactions):
```typescript
async function ensureLockGatesEnabled(): Promise<void> {
  await ensureGateEnabled();          // 2 transactions: setGlobalPoolFlag + enablePoolGateForTestTenants
  await setGlobalRfqFlag(true);       // 1 transaction
  await enableRfqGateForTestTenants(); // 1 transaction
}
```

Target implementation (1 transaction):
```typescript
async function ensureLockGatesEnabled(): Promise<void> {
  await withBypassForSeed(prisma, async tx => {
    // Global flags
    for (const [key, flagKey] of [[poolFeatureFlagKey, poolFeatureFlagKey], [rfqFeatureFlagKey, rfqFeatureFlagKey]]) {
      await tx.featureFlag.upsert({
        where: { key },
        create: { key, enabled: true, description: `DLT test — ${key}` },
        update: { enabled: true },
      });
    }
    // Tenant overrides (ownerOrgId + otherOrgId only, no supplierOrgId in DLT)
    for (const key of [poolFeatureFlagKey, rfqFeatureFlagKey]) {
      for (const orgId of [ownerOrgId, otherOrgId]) {
        await tx.tenantFeatureOverride.upsert({
          where: { tenantId_key: { tenantId: orgId, key } },
          create: { tenantId: orgId, key, enabled: true },
          update: { enabled: true },
        });
      }
    }
  });
}
```

Unused helpers after batching: `setGlobalPoolFlag`, `enablePoolGateForTestTenants`, `setGlobalRfqFlag`, `enableRfqGateForTestTenants`, `ensureGateEnabled`.
These become dead code and MUST be removed to pass TypeScript's `noUnusedLocals` check.
Only `removeGlobalPoolFlag` and `removeGlobalRfqFlag` remain needed (called from test bodies).

### Required user action

Expand allowlist to include:
```
server/src/routes/tenant/pools.demandLines.integration.test.ts
```

---

## 5. Scope C — Playwright / E2E — C3 (No coverage for this domain)

**Finding:** No Playwright spec file covers supplier invite or pool RFQ flows.

Existing specs: `catalog-visibility-policy-gating.spec.ts`, `dpp-passport-network.spec.ts`, `full-textile-chain-runtime-qa.spec.ts`, `orders-lifecycle.spec.ts`, `supplier-catalog-approval-gate.spec.ts`, `ttp-score-advisory-production-e2e.spec.ts`.

**Decision required from Paresh:** Is a new E2E spec for supplier invite flows required before VERIFIED_COMPLETE, or is the E2E gap acceptable to document as a known testing gap for this domain?

Creating a new E2E spec is outside this packet's allowlist and would require new file creation + Playwright auth state setup.

---

## 6. Files Changed in This Packet

| File | Status | Description |
|---|---|---|
| `server/src/routes/tenant/poolRfqInvites.integration.test.ts` | MODIFIED | 2-part fix: remove 4 blocked deleteMany + batch ensureAllGatesEnabled to 1 tx |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-TEST-INFRA-RECOVERY-001.md` | CREATED | This file |
| `governance/control/OPEN-SET.md` | MODIFIED (this session) | Reflects PARTIAL_BLOCKED from predecessor packet |
| `governance/control/NEXT-ACTION.md` | MODIFIED (this session) | note_on_pending_verification updated |
| `governance/control/GOVERNANCE-CHANGELOG.md` | MODIFIED (this session) | Predecessor packet status corrected |

**NOT modified:**
- Any route, service, middleware, schema, migration, or frontend file
- `pools.demandLines.integration.test.ts` — not in allowlist
- `dpp_launch_authorization` — unchanged: `HOLD_FOR_PARESH_DECISION`
- `active_delivery_unit` — unchanged: `HOLD_FOR_AUTHORIZATION`
- FE-7 — NOT opened

---

## 7. Blockers (Active)

### BLOCKER-1 — DLT allowlist expansion required

| Field | Value |
|---|---|
| Type | Allowlist constraint |
| Affected file | `server/src/routes/tenant/pools.demandLines.integration.test.ts` |
| Current result | 74/77 PASS |
| Required result | 77/77 PASS |
| Fix ready | YES — documented in Section 4 |
| User action | Expand allowlist to include DLT file |

### BLOCKER-2 — E2E coverage decision

| Field | Value |
|---|---|
| Type | Product/coverage decision |
| Finding | No Playwright spec covers supplier invite or pool RFQ flows (C3) |
| User action | Decision: document as known gap OR create new spec (out of scope for this packet) |

---

## 8. Commit Verdict

**NOT AUTHORIZED TO COMMIT.**

Stop condition 2 triggered (DLT cannot reach 77/77 in current allowlist scope).
The ORI fix (50/50 PASS, technically complete) is staged in the working tree but not committed.
Commit will be authorized in the next packet after allowlist expansion and DLT 77/77 is verified.

---

## 9. Recommended Next Packet

**Name:** `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-TEST-INFRA-RECOVERY-002`

**Allowlist (Modify):**
- `server/src/routes/tenant/pools.demandLines.integration.test.ts`

**Allowlist (Already modified, carry forward):**
- `server/src/routes/tenant/poolRfqInvites.integration.test.ts` (fix complete, uncommitted)

**Governance files (Modify):**
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-TEST-INFRA-RECOVERY-001.md` (update status)
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/GOVERNANCE-CHANGELOG.md`

**Success criteria:**
1. DLT 77/77 PASS (fresh isolated run)
2. ORI 50/50 PASS (carry forward, re-verify)
3. Full validation matrix passes
4. Commit authorized for both test files + governance

**E2E scope:** Paresh decision required before this packet starts.
