# TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-TX-TIMEOUT-FIX-001

**Packet ID:** TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-TX-TIMEOUT-FIX-001  
**Type:** Bug Fix — Production Transaction Timeout  
**Status:** VERIFIED_COMPLETE  
**Date:** 2026-06-08  
**Authorized by:** Paresh Patel  
**Commit:** pending (this packet)  
**Governed by:** AGENTS.md, copilot-instructions.md

---

## 1. Objective

Fix the Prisma interactive transaction timeout in `issueRfq` that caused
`POST /:poolId/rfq/issue` to return `422 TRANSITION_DENIED` in production
(Vercel serverless + Supabase pooler). This fix unblocks FE-9 production
verification (TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-PROD-VERIFY-GOV-CLOSE-001).

**Required change (Paresh-authorized):**  
Add `{ timeout: 30000 }` as the second argument to the `$transaction` call
in `issueRfq`. Do not change any business logic.

---

## 2. Root Cause

`issueRfq` in `server/src/services/networkPoolRfq.service.ts` used Prisma's
interactive transaction with the default 5000 ms timeout. In the production
environment (Vercel serverless + Supabase pooler), the transaction performs
≥ 8 sequential DB round-trips:

1. Pool guard + lifecycle state lookup (`networkPool.findFirst`)
2. Duplicate RFQ guard (`networkPoolRfq.findFirst`)
3. Latest CAPTURED snapshot (`networkPoolDemandSnapshot.findFirst`)
4. Snapshot lines (`networkPoolDemandSnapshotLine.findMany`)
5. SM transition SELECT queries (POOL lifecycle state lookups)
6. SM lifecycle log write (`networkLifecycleLog.create`) ← timeout hit here
7. RFQ header create (`networkPoolRfq.create`)
8. RFQ line rows (`networkPoolRfqLine.createMany`)
9. Pool state update (`networkPool.update`)

Cumulative round-trip latency over the remote Supabase pooler exceeded 5 s.
When the SM lifecycle log write (step 6) received "Transaction not found /
old closed transaction" from Prisma, the state machine caught the error and
returned `denied('TRANSITION_NOT_PERMITTED', ...)`. The outer `issueRfq`
catch block then threw `NetworkPoolRfqTransitionDeniedError`, which the route
handler mapped to `422 TRANSITION_DENIED`.

### Prior Pattern

The same timeout issue was diagnosed and resolved for `acceptQuote` in
packet TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-ROUTE-001 (commit `6ed77bc`, PRQ-54
blocker). `acceptQuote` at line 1535 already uses `{ timeout: 30000 }`.
This fix applies the same solution to `issueRfq`.

---

## 3. Production Error Evidence

```
422 {"code":"TRANSITION_DENIED","message":"Lifecycle transition denied
[TRANSITION_NOT_PERMITTED]: Database write failed for transition POOL:
'AGGREGATING' → 'CLOSED_FOR_BIDS'. Error: \n
Invalid `prisma.networkLifecycleLog.create()` invocation:\n\n\n
Transaction API error: Transaction not found. Transaction ID is invalid,
refers to an old closed transaction Prisma doesn't have information about
anymore, or was obtained before disconnecting."}
```

---

## 4. Change Made

**File:** `server/src/services/networkPoolRfq.service.ts`

**Before (line 425):**
```ts
const rfqRow = await this.db.$transaction(async (tx) => {
  ...
});
```

**After:**
```ts
const rfqRow = await this.db.$transaction(
  async (tx) => {
    ...
  },
  { timeout: 30000 },
);
```

Diff: 4 lines changed. Transaction body and all business logic: **unchanged**.

---

## 5. Validation

### 5a. Git Preflight
- HEAD: `ca3b394f952d8ba0f45ee7f55c454c2afb160ade`
- origin/main: `ca3b394f952d8ba0f45ee7f55c454c2afb160ade`
- Working tree: CLEAN (no `git status --short` output)

### 5b. `prisma validate`
```
The schema at prisma\schema.prisma is valid 🚀
---VALIDATE_EXIT:0---
```

### 5c. `prisma generate`
```
✔ Generated Prisma Client (v6.1.0) to .\node_modules\...\ in 792ms
```

### 5d. `tsc --noEmit`
```
TSC_EXIT:0
```
No TypeScript errors.

### 5e. PRQ-16 Integration Test (focused)
```
✓ PRQ-16 issue RFQ success -> 201   10776ms
TEST_EXIT:0
```
PRQ-16 PASSED. Teardown `IMMUTABLE trigger` error is test-cleanup-only (DELETE
on `network_pool_rfq_lines` blocked by DB trigger — expected, pre-existing,
not in API path).

---

## 6. Confirmations

| Item | Status |
|---|---|
| Business logic in `issueRfq` body | UNCHANGED |
| Route handler (`poolRfq.ts`) | NOT MODIFIED |
| Frontend components | NOT MODIFIED |
| Prisma schema (`schema.prisma`) | NOT MODIFIED |
| Migrations | NOT MODIFIED |
| `.env` / environment variables | NOT MODIFIED |
| Feature flags | NOT MODIFIED |
| `nc.procurement_pools.rfq.award.enabled` | false (unchanged) |
| `nc.procurement_pools.supplier_quotes.enabled` | false (QD-6 hold unchanged) |
| DPP posture | HOLD_FOR_PARESH_DECISION (unchanged) |
| `acceptQuote` `$transaction` | NOT MODIFIED (already has `{ timeout: 30000 }`) |
| Other `$transaction` calls in service | NOT MODIFIED |

---

## 7. Files Changed

| File | Change |
|---|---|
| `server/src/services/networkPoolRfq.service.ts` | Add `{ timeout: 30000 }` to `issueRfq` `$transaction` call only |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-TX-TIMEOUT-FIX-001.md` | This document (created) |
| `governance/control/OPEN-SET.md` | Updated Last Updated + Operating Notes |
| `governance/control/NEXT-ACTION.md` | Updated status note |
| `governance/control/BLOCKED.md` | Recorded TRANSITION_DENIED blocker resolved |
| `governance/control/GOVERNANCE-CHANGELOG.md` | Prepended entry |

---

## 8. Next Step

Deploy this fix to production. Then resume FE-9 production verification:

**Prompt:** `TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-PROD-VERIFY-GOV-CLOSE-001`

Remaining steps after deployment:
- **5b**: Retry `POST /:poolId/rfq/issue` via production browser (`https://app.texqtic.com/qa-b2b`)
  - Pool: `74436ecd-2bfc-46c1-a904-d6aac5df26c9`
  - Demand snapshot `56ed3fe9` already CAPTURED. Demand line `36e9b346` LOCKED_FOR_RFQ.
  - Expected: 201 with RFQ record.
- **6–12**: Post-RFQ DB verification + 14-point browser checklist + governance close.
