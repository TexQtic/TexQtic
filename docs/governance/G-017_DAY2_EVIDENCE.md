# G-017 — Day 2 Implementation Evidence
## Task ID: G-017-DAY2-TRADE-SERVICE-LIFECYCLE

**Status:** COMPLETE  
**Date:** 2026-02-25  
**Gate:** Gate E (Trade Domain Foundation)  
**Phase:** Day 2 — Service + Lifecycle Enforcement

---

## 1. Scope + Allowlist Confirmation

### Files Created (Allowlisted)

| File | Status |
|---|---|
| `server/src/services/trade.g017.types.ts` | ✅ CREATED |
| `server/src/services/trade.g017.service.ts` | ✅ CREATED |
| `server/src/services/trade.g017.test.ts` | ✅ CREATED |
| `docs/governance/G-017_DAY2_EVIDENCE.md` | ✅ CREATED |
| `governance/wave-execution-log.md` | ✅ MODIFIED (append-only) |

### Files NOT Touched (Read-only or Forbidden)

| File | Status |
|---|---|
| `server/src/services/stateMachine.service.ts` | 🔒 READ-ONLY — not modified |
| `server/src/services/stateMachine.types.ts` | 🔒 READ-ONLY — not modified |
| `server/src/services/stateMachine.guardrails.ts` | 🔒 READ-ONLY — not modified |
| `server/src/services/makerChecker.service.ts` | 🔒 READ-ONLY — not modified |
| `server/src/services/escalation.service.ts` | 🔒 READ-ONLY — not modified |
| `server/src/services/escalation.types.ts` | 🔒 READ-ONLY — not modified |
| `server/src/db/withDbContext.ts` | 🔒 READ-ONLY — not modified |
| `server/prisma/schema.prisma` | ❌ NOT TOUCHED — schema frozen |
| `server/src/routes/**` | ❌ NOT TOUCHED — no routes in Day 2 |
| Any migration file | ❌ NOT TOUCHED — no DB changes in Day 2 |

---

## 2. Method Inventory

### `trade.g017.types.ts`

Exports:
- `TradeServiceErrorCode` — union of 9 structured error codes
- `TradeCreateInput` — input contract for `createTrade()`
- `TradeCreateResult` — discriminated union: `CREATED | ERROR`
- `TradeTransitionInput` — input contract for `transitionTrade()`
- `TradeTransitionResult` — discriminated union: `APPLIED | PENDING_APPROVAL | ERROR`

### `trade.g017.service.ts`

Class: `TradeService`

Constructor dependencies (injected):
- `db: PrismaClient` — Prisma client. Not the global singleton; injected for testability.
- `stateMachine: StateMachineService` — G-020 lifecycle enforcement.
- `escalation: EscalationService` — G-022 freeze gate.
- `_makerChecker?: MakerCheckerService` — optional; G-021 flows handled via SM PENDING_APPROVAL.

Methods:
1. `createTrade(input: TradeCreateInput): Promise<TradeCreateResult>`
2. `transitionTrade(input: TradeTransitionInput): Promise<TradeTransitionResult>`

### `trade.g017.test.ts`

14 unit tests (all mocked; no DB required).

---

## 3. Enforcement Pipeline Summary

### `createTrade()` pipeline

```
1. Validate: tradeReference non-empty
2. Validate: currency non-empty
3. Validate: grossAmount > 0
4. Validate: reason non-empty → REASON_REQUIRED
5. Query lifecycle_states WHERE entity_type='TRADE' AND state_key='DRAFT'
   → if null: INVALID_LIFECYCLE_STATE (stop condition)
6. db.$transaction:
   a. trade.create (lifecycle_state_id = draftState.id)
   b. tradeEvent.create (event_type='TRADE_CREATED', metadata includes tradeReference/currency/amount/reasoning)
7. Return: { status: 'CREATED', tradeId, tradeReference }
```

### `transitionTrade()` pipeline (exact enforcement order per prompt)

```
1. trade.findFirst({ id, tenantId }) — tenant-scoped, no bypass
   → if null: NOT_FOUND
2. escalation.checkEntityFreeze('TRADE', trade.id)
   → GovError('ENTITY_FROZEN') → FROZEN_BY_ESCALATION
   → StateMachineService NEVER called if frozen (D-022-B/C)
3. Validate reason non-empty → REASON_REQUIRED
4. AI boundary gate (D-020-C):
   → if aiTriggered=true AND reason does not contain "HUMAN_CONFIRMED:"
   → return STATE_MACHINE_ERROR with AI_BOUNDARY_VIOLATION
5. lifecycleState.findFirst({ id: trade.lifecycleStateId }) → fromStateKey
   → if null: INVALID_LIFECYCLE_STATE
6. stateMachine.transition({
       entityType: 'TRADE', entityId, orgId: tenantId,
       fromStateKey, toStateKey, actorType, actorUserId, actorAdminId,
       actorRole, reason, aiTriggered, escalationLevel,
       makerUserId, checkerUserId, impersonationId, requestId
   })
7. Interpret result:
   PENDING_APPROVAL:
     - tradeEvent.create(event_type='TRADE_TRANSITION_PENDING')
     - trade.lifecycleStateId NOT updated
     - Return: { status: 'PENDING_APPROVAL', requiredActors }

   APPLIED:
     - lifecycleState.findFirst({ entity_type='TRADE', state_key=toStateKey }) → toState.id
     - db.$transaction:
         a. trade.update({ lifecycleStateId: toState.id })   ← atomic
         b. tradeEvent.create(event_type='TRADE_TRANSITION_APPLIED')  ← atomic
     - Return: { status: 'APPLIED', transitionId }

   ESCALATION_REQUIRED:
     - Return: { status: 'ERROR', code: 'STATE_MACHINE_ERROR' }

   DENIED:
     - Map SM code to STATE_MACHINE_ERROR with details
```

---

## 4. Maker-Checker Compatibility Statement (G-021)

**PENDING_APPROVAL behavior:**

When `StateMachineService.transition()` returns `status: 'PENDING_APPROVAL'`, `TradeService`:
1. Emits a `trade_events` record with `event_type='TRADE_TRANSITION_PENDING'` — informational only.
2. Does **NOT** update `trades.lifecycle_state_id` — trade remains in its current state.
3. Returns `{ status: 'PENDING_APPROVAL', requiredActors: ['MAKER', 'CHECKER'] }` to the caller.
4. Does **NOT** create a `pending_approvals` record — that is the route/G-021 caller's responsibility.

`MakerCheckerService` is accepted in the constructor (optional injection) but not directly invoked in Day 2. The StateMachineService handles the MC gate determination; TradeService handles the consequence.

---

## 5. Escalation Freeze Doctrine Statement (D-022-B/C)

**D-022-B compliance:**
- `checkEntityFreeze('TRADE', trade.id)` is called at Step 2 of the transition pipeline, **before** any StateMachineService call.
- Freeze detection: `escalation_events` with `entity_type='TRADE'`, `entity_id=trade.id`, `severity_level >= 3`, `status='OPEN'`, with no resolution/override child.
- If frozen → `FROZEN_BY_ESCALATION` returned immediately. `StateMachineService.transition()` is **never called**.

**D-022-C compliance:**
- `trades.freeze_recommended` is NOT read by TradeService.
- Freeze source of truth remains exclusively `escalation_events`.
- `freeze_recommended` is the informational column from Day 1 schema — it has zero influence on TradeService logic.

---

## 6. AI Boundary Statement (D-020-C)

TradeService enforces D-020-C in `transitionTrade()` Step 4 (before calling StateMachineService):

```
if (aiTriggered === true && !reason.includes('HUMAN_CONFIRMED:')) {
  return { status: 'ERROR', code: 'STATE_MACHINE_ERROR', message: 'AI_BOUNDARY_VIOLATION: ...' }
}
```

**Rules enforced:**
- `aiTriggered=true` without `HUMAN_CONFIRMED:` in reason → blocked at TradeService layer.
- `aiTriggered=true` WITH `HUMAN_CONFIRMED:` → proceeds to StateMachineService, which applies its own guardrails (actor type restriction).
- AI has **zero direct authority** over trade state. All transitions require a human actor in the rationale chain.
- This is Layer 1 of D-020-C enforcement. StateMachineService guardrails provide Layer 2.

---

## 7. Test Output

```
 RUN  v4.0.18 C:/Users/PARESH/TexQtic/server

 ✓ src/services/trade.g017.test.ts > TradeService > T-01: createTrade success — writes Trade + TradeEvent inside transaction 3ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-02: createTrade rejects grossAmount <= 0 0ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-03: createTrade rejects negative grossAmount 0ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-04: createTrade rejects missing reason 0ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-05: createTrade returns INVALID_LIFECYCLE_STATE when DRAFT state is missing 0ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-06: transitionTrade returns NOT_FOUND when trade does not exist 0ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-07: transitionTrade blocks when entity is frozen (FROZEN_BY_ESCALATION) 0ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-08: transitionTrade rejects missing reason 0ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-09: transitionTrade calls StateMachineService when trade is not frozen 0ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-10: transitionTrade APPLIED — updates lifecycleStateId + writes TRADE_TRANSITION_APPLIED event 1ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-11: transitionTrade PENDING_APPROVAL — does NOT update lifecycleStateId, writes PENDING event 1ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-12: transitionTrade maps StateMachine DENIED to STATE_MACHINE_ERROR 0ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-13: transitionTrade — AI triggered without HUMAN_CONFIRMED prefix returns STATE_MACHINE_ERROR 0ms
 ✓ src/services/trade.g017.test.ts > TradeService > T-14: transitionTrade — AI triggered WITH HUMAN_CONFIRMED prefix proceeds to StateMachine 0ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  13:12:26
   Duration  359ms (transform 52ms, setup 0ms, import 65ms, tests 7ms, environment 0ms)

VITEST_EXIT:0
```

---

## 8. tsc --noEmit Output

```
[no output — exit 0]

TSC_EXIT:0
```

Command: `pnpm -C server exec tsc --noEmit`

---

## 9. Git Diffstat + Staged File Allowlist Proof

```
git status --short output:

?? server/src/services/trade.g017.service.ts
?? server/src/services/trade.g017.test.ts
?? server/src/services/trade.g017.types.ts
```

All three new files are within the allowlist. No pre-existing tracked files modified. No forbidden files in diff.

---

## 10. Stop-Condition Checklist

| Stop Condition | Status |
|---|---|
| `trades` table/model missing | ✅ NOT TRIGGERED — model `Trade` confirmed in Prisma schema |
| `trade_events` table/model missing | ✅ NOT TRIGGERED — model `TradeEvent` confirmed |
| `lifecycle_states` / `LifecycleState` missing | ✅ NOT TRIGGERED — confirmed with DRAFT state lookup pattern |
| `trade_lifecycle_logs` / `TradeLifecycleLog` missing | ✅ NOT TRIGGERED — used by SM (read confirmed) |
| `StateMachineService.transition()` incompatible | ✅ NOT TRIGGERED — signature read, types matched |
| Escalation freeze check requires schema change | ✅ NOT TRIGGERED — `checkEntityFreeze(entityType, entityId)` confirmed |
| `AllowedTransition` model missing | ✅ NOT TRIGGERED — used by SM internally |
| `PendingApproval` model missing | ✅ NOT TRIGGERED — not used by TradeService Day 2 |
