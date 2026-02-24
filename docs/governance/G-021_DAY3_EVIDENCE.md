# G-021 Day 3 — Governance Evidence

**Task ID:** G-021-DAY3-REPLAY-QUEUES  
**Doctrine:** v1.4 + G-021 v1.1 (APPROVED)  
**Date:** 2025  
**Status:** IMPLEMENTED — pending vitest gate

---

## 1. Deliverables

| File | Status | Description |
|---|---|---|
| `server/src/services/makerChecker.types.ts` | ✅ Modified | Added `ALREADY_REPLAYED`, `HASH_MISMATCH`, `QueueScope`, `ApprovalQueueQuery`, `VerifyAndReplayResult`, `CreateApprovalRequestResult`, `transitionId` on APPLIED result |
| `server/src/services/makerChecker.service.ts` | ✅ Modified | `verifyAndReplay` Day 3 upgrade: caller guard, org check, idempotency, reason markers, `aiTriggered: false`. Added `getApprovalById`, `getControlPlaneQueue`, `checkReplayMarker` |
| `server/src/routes/internal/makerChecker.ts` | ✅ Created | 8 endpoints under two plugins: `tenantApprovalRoutes` + `adminApprovalRoutes`. `internalOnlyGuard` enforces `X-Texqtic-Internal: true` |
| `server/src/routes/internal/index.ts` | ✅ Created | Aggregator: tenant routes at `/api/internal/gov`, admin routes at `/api/control/internal/gov` |
| `server/src/index.ts` | ✅ Modified | `import internalGovRoutes` + `await fastify.register(internalGovRoutes)` |
| `tests/makerChecker.g021.day3.test.ts` | ✅ Created | 14 tests: R-01–R-10 (verifyAndReplay), Q-01–Q-04 (queues) |

---

## 2. Endpoint Inventory

### Tenant Plane (`/api/internal/gov/*`)
Realm: `tenant` (realmGuard catch-all for `/api/*` → tenant JWT required)  
Internal guard: `X-Texqtic-Internal: true` enforced **before** auth.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/internal/gov/approvals` | List REQUESTED+ESCALATED approvals for authenticated org |
| `GET` | `/api/internal/gov/approvals/:id` | Get single approval (with signatures) scoped to org |
| `POST` | `/api/internal/gov/approvals/:id/sign` | Record APPROVE or REJECT signature (Checker) |
| `POST` | `/api/internal/gov/approvals/:id/replay` | Verify integrity + replay through StateMachine |

### Control Plane (`/api/control/internal/gov/*`)
Realm: `admin` (realmGuard maps `/api/control/*` → admin JWT required)  
Internal guard: same `X-Texqtic-Internal: true` check before auth.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/control/internal/gov/approvals` | Cross-org or filtered queue (CONTROL_PLANE scope) |
| `GET` | `/api/control/internal/gov/approvals/:id` | Get approval without org restriction (admin) |
| `POST` | `/api/control/internal/gov/approvals/:id/sign` | Admin signs as PLATFORM_ADMIN actor |
| `POST` | `/api/control/internal/gov/approvals/:id/replay` | Admin-triggered replay with PLATFORM_ADMIN caller |

---

## 3. Internal Enforcement

```
Request → realmGuard (determines JWT realm) → internalOnlyGuard checks header → auth middleware → handler
```

`internalOnlyGuard` implementation:
```typescript
const INTERNAL_HEADER = 'x-texqtic-internal';  // Fastify normalizes to lowercase
const INTERNAL_VALUE  = 'true';

async function internalOnlyGuard(request, reply) {
  if (request.headers[INTERNAL_HEADER] !== INTERNAL_VALUE) {
    return sendError(reply, 'NOT_INTERNAL_REQUEST',
      'This endpoint requires X-Texqtic-Internal: true header. ...',
      403);
  }
}
```

**No external caller can bypass this**: the header must be `x-texqtic-internal: true` (exact lowercase match, Fastify normalized). External HTTP clients never set this header in production (enforced by network policy / API gateway strip-header rule).

---

## 4. `verifyAndReplay` Algorithm (Day 3)

```
Step 0: callerActorType === 'SYSTEM_AUTOMATION'
        → REPLAY_TRANSITION_DENIED (defense-in-depth; SignerActorType excludes SYSTEM_AUTOMATION)

Step 1: db.pendingApproval.findUnique({ where: { id }, include: { signatures: true } })
        → null → APPROVAL_NOT_FOUND

Step 1b: input.orgId != null && approval.orgId !== input.orgId
         → APPROVAL_NOT_FOUND (cross-tenant replay blocked)

Step 2: approval.status !== 'APPROVED'
        → APPROVAL_NOT_APPROVED

Step 3: isExpired(approval.expiresAt)
        → APPROVAL_EXPIRED

Step 4: D-021-A: recomputePayloadHash(canonical fields) → verifyPayloadHash(computed, stored)
        mismatch → PAYLOAD_INTEGRITY_VIOLATION
        (service emits PAYLOAD_INTEGRITY_VIOLATION; HASH_MISMATCH is a semantic alias in types)

Step 5: Find APPROVE signature: approval.signatures.find(s => s.decision === 'APPROVE')
        → not found → APPROVAL_NOT_APPROVED (data integrity guard)

Step 6: Idempotency:
        db.$transaction(async tx => {
          await tx.$queryRaw`SELECT id FROM pending_approvals WHERE id = ${id}::uuid FOR UPDATE NOWAIT`
          alreadyReplayed = await checkReplayMarker(tx, approval, approvalId)
        })
        LockNotAvailable (55P03) → DB_ERROR (concurrent replay)
        alreadyReplayed → ALREADY_REPLAYED

Step 7: stateMachine.transition({
          reason: `CHECKER_APPROVAL:${id}|APPROVAL_ID:${id}|FROZEN_HASH:${hash}|${signerReason}`,
          aiTriggered: false,   // unconditional — AI has no replay authority
          actorType: 'CHECKER',
          checkerUserId: approveSig.signerUserId,
          makerUserId: approval.requestedByUserId,
          ...canonical fields
        })
        SM not APPLIED → REPLAY_TRANSITION_DENIED

Return: { status: 'APPLIED', approvalId, transitionId? }
```

---

## 5. Idempotency Mechanism

### Design

**No schema change required.** Idempotency marker is written into the `reason` field of the entity-type-specific lifecycle log by `StateMachineService.transition()`.

Marker format: `APPROVAL_ID:{approvalId}` (embedded in the full reason string).

### Flow

```
First replay:
  1. Acquire FOR UPDATE NOWAIT lock on pending_approvals row
  2. Query lifecycle log for marker → not found
  3. Release lock (transaction ends)
  4. SM.transition() writes lifecycle log entry with marker in reason
  → APPLIED

Concurrent second replay (race):
  1. Tries FOR UPDATE NOWAIT → 55P03 (lock not available)
  → DB_ERROR "Concurrent replay detected"

Sequential second replay (after first committed):
  1. Acquires lock (first already committed)
  2. Query lifecycle log → marker found (APPROVAL_ID:{id} in reason)
  → ALREADY_REPLAYED
```

### Private `checkReplayMarker(tx, approval, approvalId)`

| Entity Type | Lifecycle Log Table | Query Field |
|---|---|---|
| `TRADE` | `trade_lifecycle_logs` (Prisma: `tradeLifecycleLog`) | `tradeId = entityId` |
| `ESCROW` | `escrow_lifecycle_logs` (Prisma: `escrowLifecycleLog`) | `escrowId = entityId` |
| `CERTIFICATION` | No table (G-023 deferred) | returns `false` (safe) |

---

## 6. Drift-Proof Notes

### `HASH_MISMATCH` vs `PAYLOAD_INTEGRITY_VIOLATION`

The `ApprovalErrorCode` union includes both `HASH_MISMATCH` and `PAYLOAD_INTEGRITY_VIOLATION`.  
The service currently emits `PAYLOAD_INTEGRITY_VIOLATION` (not `HASH_MISMATCH`) to preserve compatibility with the Day 2 test suite (`tests/makerChecker.g021.test.ts`).  
`HASH_MISMATCH` is a semantic alias in the type union, documented here for future consumers who may want to differentiate terminology. Both codes semantically mean D-021-A hash verification failed.

**If you change this:** update Day 2 test `F-03` alongside the service.

### Realm Guard Alignment

The realm guard (`server/src/middleware/realmGuard.ts`) maps:  
- `/api/control/*` → `admin` realm  
- All other `/api/*` → `tenant` realm (catch-all)  

This is why tenant routes are at `/api/internal/gov/*` and admin routes are at `/api/control/internal/gov/*`. **Do not** move tenant routes under `/api/control/` or they will require admin JWT. **Do not** move admin routes away from `/api/control/` or they will require tenant JWT.

### Internal Guard Position

`internalOnlyGuard` fires in the `onRequest` lifecycle hook, **before** `tenantAuthMiddleware` / `adminAuthMiddleware`. If a request lacks the internal header, it is rejected before any JWT is decoded. This prevents:
1. External callers reaching auth middleware even for JWT probe attacks.
2. Auth middleware costs on invalid internal calls.

---

## 7. G-020 Integration Contract

`verifyAndReplay` calls `stateMachine.transition()` (G-020 StateMachineService) with:

```typescript
{
  orgId, entityType, entityId,
  fromStateKey, toStateKey,
  actorType: 'CHECKER',
  actorUserId: approveSig.signerUserId,
  actorAdminId: approveSig.signerAdminId,
  actorRole: approveSig.signerRole,
  reason: `CHECKER_APPROVAL:${id}|APPROVAL_ID:${id}|FROZEN_HASH:${hash}|${signerReason}`,
  requestId: `replay:${approvalId}:${sigId}`,
  makerUserId: approval.requestedByUserId,
  checkerUserId: approveSig.signerUserId,
  aiTriggered: false,    // unconditional
}
```

**Assumption:** SM writes a `trade_lifecycle_logs` / `escrow_lifecycle_logs` entry with the full `reason` string passed in. If SM silently truncates the reason, the idempotency marker will not be found and ALREADY_REPLAYED will never fire (silent double-replay). This is a G-020 contract that must be maintained.

---

## 8. No-Bypass Argument

1. **Layer 1 (service):** `callerActorType === 'SYSTEM_AUTOMATION'` blocked before any DB call.
2. **Layer 2 (org isolation):** `input.orgId !== approval.orgId` → APPROVAL_NOT_FOUND before SM call.
3. **Layer 3 (integrity):** D-021-A hash verify before idempotency check or SM call.
4. **Layer 4 (idempotency):** FOR UPDATE NOWAIT → checkReplayMarker → ALREADY_REPLAYED if marker found.
5. **Layer 5 (network):** `internalOnlyGuard` rejects external callers at the HTTP layer before auth.
6. **Layer 6 (DB trigger):** D-021-C `check_maker_checker_separation` trigger fires on `approval_signatures` INSERT as backstop for maker≠checker.
7. **Layer 7 (RLS):** Supabase RLS policies on `pending_approvals` and `approval_signatures` prevent cross-org row access at the database level.

No single layer failure results in a full bypass. All layers must be compromised simultaneously.

---

## 9. Compatibility Patch — Day 2 Mock Surface Parity

**Trigger:** Day 3 introduced `db.$transaction(async tx => { ... })` inside `verifyAndReplay` (Step 6 idempotency). Day 2 unit mocks in `tests/makerChecker.g021.test.ts` did not supply this method, causing `P-04` to receive `DB_ERROR` instead of `APPLIED`.

**Resolution (allowlist addendum — governance-preserving):**  
`tests/makerChecker.g021.test.ts` was extended with three mock fields in `MockDb` / `makeMockDb()`:

| Field | Default value | Purpose |
|---|---|---|
| `$transaction` | `vi.fn(fn => fn(db))` | Simulates Prisma transaction; calls callback with db as tx |
| `$queryRaw` | `vi.fn(() => Promise.resolve([]))` | FOR UPDATE NOWAIT — lock always succeeds |
| `tradeLifecycleLog.findFirst` | `vi.fn(() => Promise.resolve(null))` | No existing replay marker → replay proceeds |

**What was NOT changed:**  
- No test assertions modified  
- No test cases added or removed  
- No test expectations altered  
- No test logic touched — only the mock shape extended

**Outcome:** Day 2 suite fully green (26/26 + P-04 = 27/27). No behavioral regressions.
