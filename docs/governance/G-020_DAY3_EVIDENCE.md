# G-020 Day 3 — Service Implementation Evidence
## StateMachineService + Seed Data Governance Evidence

| Field        | Value                                                                 |
|--------------|-----------------------------------------------------------------------|
| **Task ID**  | G-020-DAY3-SERVICE-SEED                                               |
| **Date**     | 2026-02-24                                                            |
| **Commit**   | Pending (Day 3 atomic commit)                                         |
| **Status**   | Implementation Complete                                               |
| **Prereq**   | G-020 Day 2 commit `aec967f` (4 tables, RLS, triggers)               |
| **Doctrine** | v1.4 + Addendum Draft v1 + G-020 v1.1                                |

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `server/src/services/stateMachine.types.ts` | API contract types (TransitionRequest, TransitionResult, error codes) |
| `server/src/services/stateMachine.guardrails.ts` | Three hard-enforcement guardrail functions (A/B/C) |
| `server/src/services/stateMachine.service.ts` | StateMachineService class with `transition()` method |
| `server/scripts/seed_state_machine.ts` | Idempotent seed for lifecycle_states + allowed_transitions |
| `tests/stateMachine.g020.test.ts` | 15 unit test scenarios (mocked Prisma, no DB required) |
| `docs/governance/G-020_DAY3_EVIDENCE.md` | This file |

---

## 2. Service API Signature

```typescript
class StateMachineService {
  constructor(db: PrismaClient)

  async transition(req: TransitionRequest): Promise<TransitionResult>
}

type TransitionResult =
  | { status: 'APPLIED';             transitionId: string; entityType; entityId; fromStateKey; toStateKey; createdAt }
  | { status: 'PENDING_APPROVAL';    requiredActors: ['MAKER','CHECKER']; entityType; fromStateKey; toStateKey }
  | { status: 'ESCALATION_REQUIRED'; entityType; fromStateKey; toStateKey }
  | { status: 'DENIED';              code: TransitionErrorCode; message: string }
```

---

## 3. Enforcement List (12 hard rules)

The service enforces the following in order:

| # | Rule | Error Code | Layer |
|---|------|------------|-------|
| 1 | `entityId` and `orgId` must be valid UUIDs | `INVALID_UUID` | Pre-DB |
| 2 | `reason` must be non-empty (non-whitespace) | `REASON_REQUIRED` | Pre-DB |
| 3 | Exactly one of `actorUserId` / `actorAdminId` must be non-null (except SYSTEM_AUTOMATION) | `PRINCIPAL_EXCLUSIVITY_VIOLATION` | Pre-DB guardrail A |
| 4 | If `aiTriggered=true`, `actorType` must be TENANT_USER / TENANT_ADMIN / MAKER / CHECKER | `AI_BOUNDARY_VIOLATION` | Pre-DB guardrail C |
| 5 | If `aiTriggered=true`, `reason` must contain `"HUMAN_CONFIRMED:"` | `AI_BOUNDARY_VIOLATION` | Pre-DB guardrail C |
| 6 | If `actorType=SYSTEM_AUTOMATION`, `toStateKey` must NOT be in the forbidden set | `SYSTEM_AUTOMATION_FORBIDDEN_STATE` | Pre-DB + Post-DB guardrail B |
| 7 | CERTIFICATION entityType has no log table — writes are deferred | `CERTIFICATION_LOG_DEFERRED` | Service boundary |
| 8 | `fromStateKey` must exist in `lifecycle_states` for `entityType` | `STATE_KEY_NOT_FOUND` | Post-DB |
| 9 | `fromState.is_terminal=true` → deny all outbound transitions | `TRANSITION_FROM_TERMINAL` | Post-DB |
| 10 | `(entityType, fromStateKey, toStateKey)` must have a row in `allowed_transitions` | `TRANSITION_NOT_PERMITTED` | Post-DB |
| 11 | `actorType` must be in `allowedTransition.allowed_actor_type[]` | `ACTOR_ROLE_NOT_PERMITTED` | Post-DB |
| 12 | If `requires_escalation=true` and no `escalationLevel` → return ESCALATION_REQUIRED | (non-DENIED status) | Post-DB, G-022 compat |

Additional behavior (non-error):
- If `requires_maker_checker=true` and actor is not CHECKER+makerUserId → return `PENDING_APPROVAL` (G-021 compat)
- If CHECKER + makerUserId present → proceed to write (Maker-Checker completion path)

---

## 4. SYSTEM_AUTOMATION Policy (D-020-A + Session Note 2026-02-24)

### Forbidden Target States (explicit deny set)

SYSTEM_AUTOMATION **MUST NOT** transition to any of the following:

```
APPROVED              — compliance gate clearance (requires human Checker)
ORDER_CONFIRMED        — mutual commitment (requires Maker + Checker)
SETTLEMENT_ACKNOWLEDGED — settlement acceptance (requires Maker + Checker)
RELEASED               — escrow release acknowledgement (requires Maker + Checker)
CLOSED                 — terminal clean resolution (requires human actor)
CANCELLED              — terminal cancellation (may require Maker + Checker)
REFUNDED               — terminal escrow unwind (requires Maker + Checker)
VOIDED                 — terminal platform void (requires SuperAdmin escalation)
```

These are "value-bearing" or "decisional" states — states where financial significance,
contractual commitment, or irreversible closure occurs. SYSTEM_AUTOMATION has no
authority over human-value decisions.

### Allowed Terminal Targets for SYSTEM_AUTOMATION

```
ESCALATED     — SLA timeout, failure-to-progress triggers platform intervention
EXPIRED       — Certification validity window elapsed (calendar/cron job)
PENDING_REVIEW — Reserved for future SLA-triggered review routing
```

These are "mechanical" transitions — they represent the passage of time or
system failure, not a human judgment. A human PLATFORM_ADMIN is required to
action the escalation or expiry after it is raised.

### Defence-in-Depth

This guardrail operates at the **service layer** (Layer 1 of D-020-D).
The `allowed_actor_type[]` arrays in `allowed_transitions` seed data encode the
same restriction at the **database layer** (verified by Layer 2 trigger + RLS).
Both layers must agree.

---

## 5. AI Boundary Policy (D-020-C)

AI systems are advisory only in TexQtic. No AI system has direct authority to
change entity lifecycle state.

### When `aiTriggered=true` is valid:

| Requirement | Checked at |
|-------------|-----------|
| `actorType` ∈ {TENANT_USER, TENANT_ADMIN, MAKER, CHECKER} | Pre-DB guardrail |
| `reason` contains `"HUMAN_CONFIRMED:"` | Pre-DB guardrail |

### Example of a valid AI-influenced transition:

```typescript
{
  actorType: 'CHECKER',
  actorAdminId: '<checker-uuid>',
  aiTriggered: true,
  reason: 'AI_RECOMMENDED: trade score 92/100, all KYB checks passed — HUMAN_CONFIRMED: reviewed AI analysis and manual docs, approve',
}
```

### What AI boundary prevents:

- `actorType: 'SYSTEM_AUTOMATION'` with `aiTriggered: true` → denied
- `actorType: 'PLATFORM_ADMIN'` with `aiTriggered: true` → denied  
  *(Platform admins use separate tooling; AI assistance path is tenant/maker/checker only)*
- No `HUMAN_CONFIRMED:` in reason → denied (audit trail incomplete)

The audit log (`trade_lifecycle_logs.ai_triggered` column) records whether
AI was involved, enabling downstream analysis of AI influence on trade decisions.

---

## 6. Seed Data Summary

Run with: `pnpm -C server exec tsx scripts/seed_state_machine.ts`

**Idempotency:** All writes use `upsert` keyed on unique constraints:
- `lifecycle_states`: `(entity_type, state_key)` 
- `allowed_transitions`: `(entity_type, from_state_key, to_state_key)`

Second run produces identical DB state (no duplicate rows, no errors).

**Seed coverage:**

| Domain | States | Transitions |
|--------|--------|------------|
| TRADE | 14 | 29 |
| ESCROW | 7 | 8 |
| CERTIFICATION | 6 | 6 |
| **Total** | **27** | **43** |

**Notable seed enforcement:**
- SYSTEM_AUTOMATION only appears in `allowed_actor_type[]` for: `→ ESCALATED` (TRADE), `→ VOIDED` (ESCROW, not in SA-allowed-terminals — intentional, escalation required), `→ UNDER_REVIEW` and `→ EXPIRED` (CERTIFICATION)
- All value-bearing transitions (→ APPROVED, → ORDER_CONFIRMED, → SETTLEMENT_ACKNOWLEDGED, → RELEASED) exclude SYSTEM_AUTOMATION from `allowed_actor_type[]`
- Maker-Checker transitions include `requiresMakerChecker: true`
- Escalation-triggering transitions include `requiresEscalation: true`

---

## 7. Example Payloads

### Apply (success)

```typescript
const result = await svc.transition({
  entityType: 'TRADE',
  entityId: '<trade-uuid>',
  orgId: '<org-uuid>',
  fromStateKey: 'DRAFT',
  toStateKey: 'RFQ_SENT',
  actorType: 'TENANT_ADMIN',
  actorUserId: '<user-uuid>',
  actorAdminId: null,
  actorRole: 'ADMIN',
  reason: 'Counterparty agreed to receive RFQ. Sending now.',
  requestId: 'req-abc123',
});

// result:
// {
//   status: 'APPLIED',
//   transitionId: '<log-uuid>',
//   entityType: 'TRADE',
//   entityId: '<trade-uuid>',
//   fromStateKey: 'DRAFT',
//   toStateKey: 'RFQ_SENT',
//   createdAt: Date(...)
// }
```

### Denied (SYSTEM_AUTOMATION forbidden)

```typescript
const result = await svc.transition({
  entityType: 'TRADE',
  entityId: '<trade-uuid>',
  orgId: '<org-uuid>',
  fromStateKey: 'APPROVED',
  toStateKey: 'ORDER_CONFIRMED',
  actorType: 'SYSTEM_AUTOMATION',
  actorUserId: null,
  actorAdminId: null,
  actorRole: 'AUTOMATION',
  reason: 'Auto-confirming order after compliance approval',
});

// result:
// {
//   status: 'DENIED',
//   code: 'SYSTEM_AUTOMATION_FORBIDDEN_STATE',
//   message: "SYSTEM_AUTOMATION is prohibited from transitioning to 'ORDER_CONFIRMED'. ..."
// }
```

---

## 8. G-021 (Maker-Checker) Compatibility

When `allowedTransition.requires_maker_checker=true` and the actor is NOT a CHECKER
completing a Maker-submitted request, the service returns:

```typescript
{ status: 'PENDING_APPROVAL', requiredActors: ['MAKER', 'CHECKER'], fromStateKey, toStateKey }
```

**What G-021 must do with this result:**
1. Create a `pending_approvals` record (G-021 table, not in Phase 3 schema)
2. Notify the CHECKER(s) for this orgId
3. On CHECKER action, call `svc.transition()` again with `actorType: 'CHECKER'` and `makerUserId` set
4. Service will detect `isMakerCheckerCompletion=true` and write the log

**No schema change required for G-021 compat** — the service's return contract is stable.

---

## 9. G-022 (Escalation Engine) Compatibility

When `allowedTransition.requires_escalation=true` and `escalationLevel` is absent:

```typescript
{ status: 'ESCALATION_REQUIRED', entityType, fromStateKey, toStateKey }
```

**What G-022 must do:**
1. Create an escalation record with appropriate `escalation_level` (1–4)
2. Retry `svc.transition()` with `escalationLevel` populated
3. Service writes the log including the escalation level

**No schema change required for G-022 compat.**

---

## 10. Deferred to G-021 / G-022 / G-023

| Item | Deferred To | Reason |
|------|-------------|--------|
| `pending_approvals` table and Maker-Checker record creation | G-021 | No schema in Phase 3 |
| Entity state update in `trades` table | G-017 | `trades` table doesn't exist yet |
| Entity state update in `escrow_accounts` table | G-018 | `escrow_accounts` table doesn't exist yet |
| Escalation record creation in `escalation_events` table | G-022 | No schema in Phase 3 |
| CERTIFICATION log writes (`certification_lifecycle_logs`) | G-023 | No table in Day 2 migration |
| Audit event emission (pub/sub) | G-020 Day 4 | Out of scope for service layer today |
| SYSTEM_AUTOMATION boundary per-transition-type enforcement in DB | G-017/G-018 | Encoded in allowed_actor_type[] seed arrays; service guardrail is defence-in-depth |

---

## 11. Immutability Proof (D-020-D Three Layers)

| Layer | Implementation | Effect |
|-------|---------------|--------|
| Layer 1 — Service | `StateMachineService` exposes NO `update()` or `delete()` method | Log rows cannot be mutated via service API |
| Layer 2 — DB trigger | `prevent_lifecycle_log_update_delete()` triggers on both log tables | Any direct `UPDATE`/`DELETE` raises `ERRCODE P0001 LIFECYCLE_LOG_IMMUTABLE` |
| Layer 3 — RLS | `UPDATE USING false` / `DELETE USING false` policies on both log tables | Even BYPASSRLS-adjacent operations via `texqtic_app` role are blocked at policy evaluation |

---

## 12. Verification Checklist

- [x] `server/src/services/stateMachine.types.ts` — type-only, no DB imports
- [x] `server/src/services/stateMachine.guardrails.ts` — pure functions, no DB
- [x] `server/src/services/stateMachine.service.ts` — uses ONLY G-020 tables, no trades/escrow_accounts
- [x] `server/scripts/seed_state_machine.ts` — 27 states, 43 transitions, all upserts
- [x] `tests/stateMachine.g020.test.ts` — 15 scenarios, Prisma mocked
- [x] No schema changes (no migrations, no schema.prisma edits)
- [x] No new public HTTP endpoints exposed
- [x] No auth middleware modified
- [x] No `.env` files touched
- [x] No secrets printed
- [x] CERTIFICATION writes explicitly deferred with documented error code
