# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-TEST-INFRA-RECOVERY-002

**Status:** `VERIFIED_COMPLETE — ALL GATES PASSED`
**Packet type:** Test-infrastructure recovery (continuation of RECOVERY-001)
**Predecessor packet:** `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-TEST-INFRA-RECOVERY-001` (`PARTIAL_BLOCKED — SCOPE_A_RESOLVED_SCOPE_B_NEEDS_ALLOWLIST_EXPANSION`)

---

## 1. Paresh Decision: E2E Gate Ruling

**Decision:** E2E / Playwright supplier-invite coverage is NOT a gate for closing the backend
supplier invite production verification packet.

**Rationale:** FE-7 supplier inbox UI does not yet exist. E2E coverage for supplier invite flows
is recorded as a future FE-7 / runtime QA requirement, not as a blocker for this backend close.

**E2E status:** C3 — documented known gap. No Playwright spec was created in this packet (forbidden).

---

## 2. Scope Carried Forward from RECOVERY-001

| Scope | RECOVERY-001 result | RECOVERY-002 action |
|---|---|---|
| A — ORI (poolRfqInvites.integration.test.ts) | RESOLVED, fix applied, uncommitted | Verified 50/50 PASS; committed |
| B — DLT (pools.demandLines.integration.test.ts) | BLOCKED (74/77) — fix ready, no allowlist | Fix applied; 77/77 PASS achieved |
| C — E2E | C3 — Paresh decision required | Decision received: not a gate |

---

## 3. Root Cause (Carried from RECOVERY-001)

### Problem 1 — Immutable snapshot-line teardown

The `prevent_snapshot_line_mutation` DB trigger raises `P0001` unconditionally on
`UPDATE OR DELETE` against `network_pool_demand_snapshot_lines`. No RLS bypass path exists.
Both `afterEach` and `afterAll` in both test suites attempted `deleteMany` against tables in the
cascade chain, aborting the `withBypassForSeed` transaction silently (`.catch(() => {})`), leaving
DB connections in an error state and eventually triggering `hookTimeout` at test ~26 (DLT) and ~21 (ORI).

### Problem 2 — Multi-transaction gate setup causing hookTimeout

`ensureLockGatesEnabled()` (DLT) and `ensureAllGatesEnabled()` (ORI) each made 4–6 separate
`withBypassForSeed` transactions per call. Both were called from `beforeEach` and `afterEach`,
producing 8–12 total DB round-trips per test. Under Supabase network latency, cumulative load
caused `hookTimeout` exhaustion by test ~26 in DLT.

---

## 4. Fix Applied — pools.demandLines.integration.test.ts

### Part 1 — Remove 4 blocked `deleteMany` calls (afterEach + afterAll)

Removed from `afterEach` and `afterAll`:
- `tx.networkPoolDemandSnapshotLine.deleteMany()` — trigger P0001
- `tx.networkPoolDemandSnapshot.deleteMany()` — FK onDelete:Cascade to snapshotLines
- `tx.networkPoolDemandLine.deleteMany()` — FK RESTRICT while snapshotLines exist
- `tx.networkPool.deleteMany()` — FK onDelete:Cascade to snapshotLines

Kept (safe, no immutability constraint):
- `tx.networkPoolMembership.deleteMany()` — no cascade to snapshotLines

### Part 2 — Batch `ensureLockGatesEnabled()` from 4 transactions → 1

Removed dead helpers (replaced by inlined batching):
- `enablePoolGateForTestTenants()`
- `ensureGateEnabled()`
- `setGlobalRfqFlag(enabled)`
- `enableRfqGateForTestTenants()`

Kept (still called from test bodies):
- `setGlobalPoolFlag(enabled)` — called by DLT-02, DLT-03, DLT-04
- `removeGlobalPoolFlag()` — called by DLT-01
- `removeGlobalRfqFlag()` — called by test bodies

New `ensureLockGatesEnabled()` performs all 6 upserts in 1 `withBypassForSeed` tx:
- 2 global flags: `poolFeatureFlagKey`, `rfqFeatureFlagKey`
- 4 tenant overrides: `ownerOrgId` × 2 flags + `otherOrgId` × 2 flags

---

## 5. Validation Results

| Validation | Result | Evidence |
|---|---|---|
| `prisma validate` | PASS | "The schema at prisma/schema.prisma is valid" |
| `prisma generate` | PASS | "Generated Prisma Client (v6.1.0)" |
| `tsc --noEmit` (server) | PASS | No output (clean) |
| ORI (poolRfqInvites.integration.test.ts) | **50/50 PASS** | 550.14s, EXIT:0 |
| DLT (pools.demandLines.integration.test.ts) | **77/77 PASS** | 557.90s, EXIT:0 |
| SRI (poolRfqSupplierInvites.integration.test.ts) | **11/11 PASS** | 155.23s, EXIT:0 |
| `typecheck` (root) | PASS | No output (clean) |

---

## 6. Files Changed in This Packet

| File | Status | Description |
|---|---|---|
| `server/src/routes/tenant/pools.demandLines.integration.test.ts` | MODIFIED | 3-part fix: remove 4 blocked deleteMany (afterEach + afterAll) + batch ensureLockGatesEnabled to 1 tx + remove 4 dead helpers |
| `server/src/routes/tenant/poolRfqInvites.integration.test.ts` | CARRIED FORWARD | Fix applied in RECOVERY-001, committed in this packet |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-TEST-INFRA-RECOVERY-002.md` | CREATED | This file |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-TEST-INFRA-RECOVERY-001.md` | UPDATED | Status updated to reflect packet close |
| `governance/control/OPEN-SET.md` | MODIFIED | Recovery-002 result recorded |
| `governance/control/NEXT-ACTION.md` | MODIFIED | note_on_pending_verification updated |
| `governance/control/GOVERNANCE-CHANGELOG.md` | MODIFIED | Recovery-002 entry prepended |

**NOT modified:**
- Any route, service, middleware, schema, migration, or frontend file
- `dpp_launch_authorization` — unchanged: `HOLD_FOR_PARESH_DECISION`
- `active_delivery_unit` — unchanged: `HOLD_FOR_AUTHORIZATION`
- FE-7 — NOT opened

---

## 7. Commit

```
test(network-commerce): recover supplier invite production verification tests
```

All success criteria met. Commit authorized.

---

## 8. Outstanding Items (Out of Scope — Not Blockers)

1. **Production close packet:** The original `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-GOV-CLOSE-001`
   remains NOT closed until a fresh re-run after this recovery. That is a separate packet.

2. **E2E supplier invite coverage:** Recorded as a future FE-7 / runtime QA requirement. Not a
   backend-close blocker per Paresh decision.

3. **DB residue:** `networkPool`, `networkPoolDemandLine`, `networkPoolDemandSnapshot`, and
   `networkPoolDemandSnapshotLine` rows from test runs remain in DB (expected). Records are keyed
   by per-test-run random UUIDs. They do not affect test correctness.
