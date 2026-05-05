# PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-TRIGGER-ENROLLMENT-VERIFIED-001

## Metadata

| Field | Value |
|---|---|
| Document ID | PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-TRIGGER-ENROLLMENT-VERIFIED-001 |
| Unit | TTP-SCORE-SNAPSHOT-TRIGGER-ENROLLMENT-001 (Slice 4 of TTP-SCORE-SNAPSHOT-IMPL-001) |
| Date | 2026-05-05 |
| Status | `VERIFIED_COMPLETE` |
| Authority | Paresh Patel — TexQtic founder / operator |
| `ttp_enabled` state | `false` — UNCHANGED, IMMUTABLE |
| Commit 1 | `b780afd` — `feat(tradetrust-pay): capture score snapshot on enrollment approval` |
| Slice 3 gate commit | `a2c9d0d` — `feat(tradetrust-pay): capture score snapshot on vpc issuance` |
| Tracker | `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` |

---

## 1. Authority Basis

This verification record covers Slice 4 of `TTP-SCORE-SNAPSHOT-IMPL-001`:
**Enrollment route-level orchestration — post-commit best-effort `ENROLLMENT_APPROVED` snapshot trigger only.**

Authority chain:
- Design decisions `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001` (OQ-SS-01 through OQ-SS-07 resolved)
- Slice 3 gate cleared: `TTP-SCORE-SNAPSHOT-TRIGGER-VPC-001` `VERIFIED_COMPLETE` (`a2c9d0d`, `33dd382`)
  - Verification: `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-TRIGGER-VPC-VERIFIED-001.md`
- Slice 4 authorized scope: enrollment approval route orchestration only. Admin-review trigger (Slice 5) and read endpoints (Slice 6) remain NOT_OPENED.

OQ-SS-06 design decision applies directly:
> Snapshot write timing: post-commit sequential write — NOT inside the triggering transaction.
> Snapshot write failure handling: best-effort — log failure, return triggering event result normally, do NOT roll back triggering event.
> Orchestration location: route handler — NOT inside triggering service methods.

Trigger condition: `ENROLLMENT_APPROVED` only. REJECTED, SUSPENDED, and CANCELLED outcomes do NOT trigger a snapshot.

---

## 2. Files Changed (Commit `b780afd`)

| File | Change |
|---|---|
| `server/src/routes/control/ttp-enrollments.ts` | MODIFIED — `captureEnrollmentApprovedSnapshot` helper exported; `PATCH /enrollments/:tradeId` handler updated |
| `server/src/__tests__/ttp-score-snapshot-trigger-enrollment.unit.test.ts` | NEW — 12 unit tests (TC-TENR-001 through TC-TENR-012) |
| `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | MODIFIED — §5/§9/§17/§18/§20 updated |

Files NOT modified:
- `server/src/services/ttpScoreSnapshot.service.ts` — UNCHANGED (Slice 2 complete)
- `server/src/services/ttpEnrollment.service.ts` — UNCHANGED (OQ-SS-06: route-level only)
- `server/src/services/ttpScore.service.ts` — UNCHANGED
- `server/prisma/schema.prisma` — UNCHANGED
- `.env` / `.env.local` — UNCHANGED

---

## 3. Route Orchestration Design

### `captureEnrollmentApprovedSnapshot` — exported helper

Location: `server/src/routes/control/ttp-enrollments.ts` (exported for unit testing)

```typescript
export async function captureEnrollmentApprovedSnapshot(params: {
  enrollment: AdminEnrollmentRecord;
  tradeId: string;
  adminId: string;
  snapshotSvc: Pick<TtpScoreSnapshotService, 'captureSnapshot'>;
  log: { error(obj: Record<string, unknown>, msg: string): void };
}): Promise<void>
```

**Behavior:**
- Guards on `enrollment.latest_log_id`: if missing/null, logs structured `ttp.score_snapshot.capture_failed` event with `reason: 'missing_enrollment_id'` and returns normally — `captureSnapshot` is NOT called.
- Calls `snapshotSvc.captureSnapshot(...)` with `ENROLLMENT_APPROVED` trigger context.
- On success: resolves normally (silent).
- On `captureSnapshot` throw: catches, logs structured `ttp.score_snapshot.capture_failed` event, returns normally (does NOT rethrow).

### `PATCH /enrollments/:tradeId` handler integration

After `const enrollment = await withAdminWriteContext(...)` (primary enrollment write) and before `return sendSuccess(reply, enrollment)`:

```typescript
if (outcome === TTP_ENROLLMENT_REVIEW_OUTCOME.APPROVED) {
  try {
    await withAdminWriteContext(enrollment.org_id, adminId, async db => {
      await captureEnrollmentApprovedSnapshot({
        enrollment,
        tradeId: enrollment.trade_id,
        adminId,
        snapshotSvc: new TtpScoreSnapshotService(db),
        log: request.log,
      });
    });
  } catch (snapshotCtxErr) {
    request.log.error(
      {
        event: 'ttp.score_snapshot.capture_failed',
        trigger_event: TTP_SCORE_TRIGGER_EVENT.ENROLLMENT_APPROVED,
        trade_id: tradeId,
        org_id: enrollment.org_id,
        err_name: snapshotCtxErr instanceof Error ? snapshotCtxErr.name : 'UnknownError',
        err_msg: snapshotCtxErr instanceof Error ? snapshotCtxErr.message : String(snapshotCtxErr),
      },
      'ttp.score_snapshot.capture_failed',
    );
  }
}

return sendSuccess(reply, enrollment);
```

**Two-layer error containment:**
1. **Inner (inside `captureEnrollmentApprovedSnapshot`):** Catches all `captureSnapshot` errors — snapshot DB write failures, score computation errors, etc. Also handles missing `enrollmentId` guard.
2. **Outer (in route handler):** Catches `withAdminWriteContext` setup failures — RLS context setup, transaction initialization, etc.

Both layers log `ttp.score_snapshot.capture_failed` as a structured Pino event and allow the enrollment HTTP response to proceed normally.

**Outcome guard:** The entire snapshot block is wrapped in `if (outcome === TTP_ENROLLMENT_REVIEW_OUTCOME.APPROVED)`. REJECTED, SUSPENDED, and CANCELLED outcomes skip the block entirely — `captureSnapshot` is never called for those outcomes.

---

## 4. Snapshot Context for `ENROLLMENT_APPROVED`

| `captureSnapshot` field | Value | Source |
|---|---|---|
| `orgId` | `enrollment.org_id` | AdminEnrollmentRecord (seller org_id from DB) |
| `triggerEvent` | `TTP_SCORE_TRIGGER_EVENT.ENROLLMENT_APPROVED` | Constant from `ttpScoreSnapshot.service.ts` |
| `tradeId` | `enrollment.trade_id` | AdminEnrollmentRecord |
| `enrollmentId` | `enrollment.latest_log_id` | `ttp_enrollment_logs.id` of the new log row from `adminReviewEnrollment` |
| `sourceEventId` | `enrollment.latest_log_id` | Same as `enrollmentId` (AF-05: source_event_id = primary entity ID) |
| `actorId` | `adminId` | Authenticated admin from session |
| `invoiceId` | not set | NULL — enrollment approval is not invoice-scoped |
| `vpcId` | not set | NULL — enrollment approval is not VPC-scoped |

### `enrollmentId` Source Provenance

`enrollment.latest_log_id` is the `ttp_enrollment_logs.id` value of the freshly-inserted log row created by `adminReviewEnrollment` inside `TtpEnrollmentService`. The service builds `AdminEnrollmentRecord` from `newLog`, so `latest_log_id` is always the new log's ID — never null on a successful approval.

The `missing_enrollment_id` guard handles the defensive case only (should never fire in practice for a successful approval).

---

## 5. Best-Effort Failure Behavior Proof

Snapshot failure is guaranteed to be non-fatal to enrollment approval by design:

1. **Enrollment row already committed** before snapshot trigger is called — the primary `withAdminWriteContext` (which calls `adminReviewEnrollment`) commits before the snapshot `withAdminWriteContext` is entered. These are two separate transactions.
2. **`captureEnrollmentApprovedSnapshot` absorbs all `captureSnapshot` errors** — inner try/catch.
3. **Missing `enrollmentId` is absorbed** — early return with log, no throw.
4. **`withAdminWriteContext` context errors** are absorbed by the outer try/catch in the route handler.
5. **`return sendSuccess(reply, enrollment)`** is outside and after all try/catch blocks — always executes.

Structured log event emitted on `captureSnapshot` throw:
```json
{
  "event": "ttp.score_snapshot.capture_failed",
  "trigger_event": "ENROLLMENT_APPROVED",
  "enrollment_id": "<string>",
  "trade_id": "<string>",
  "org_id": "<string>",
  "err_name": "<Error.name or 'UnknownError'>",
  "err_msg": "<Error.message or String(err)>"
}
```

Structured log event emitted on missing `enrollmentId`:
```json
{
  "event": "ttp.score_snapshot.capture_failed",
  "trigger_event": "ENROLLMENT_APPROVED",
  "trade_id": "<string>",
  "org_id": "<string>",
  "reason": "missing_enrollment_id"
}
```

**No sensitive fields** (no `actorId`/`adminId`, no connection strings, no bearer tokens) in the log events.

---

## 6. Unit Test Suite

File: `server/src/__tests__/ttp-score-snapshot-trigger-enrollment.unit.test.ts`

Test constants: `TRADE_ID='aaaa1111-0000-0000-0000-000000000001'`, `ORG_ID='bbbb2222-0000-0000-0000-000000000002'`, `ADMIN_ID='cccc3333-0000-0000-0000-000000000003'`, `LOG_ID='dddd4444-0000-0000-0000-000000000004'`

| TC | Title | Assertion |
|---|---|---|
| TC-TENR-001 | calls captureSnapshot with triggerEvent = ENROLLMENT_APPROVED | `captureSnapshot.mock.calls[0][0].triggerEvent === 'ENROLLMENT_APPROVED'` |
| TC-TENR-002 | snapshot context correct (enrollmentId=LOG_ID, sourceEventId=LOG_ID, tradeId, orgId, actorId) | All five context fields verified |
| TC-TENR-003 | enrollmentId equals enrollment.latest_log_id | `captureSnapshot` called with `enrollmentId === LOG_ID` |
| TC-TENR-004 | captureSnapshot success → helper resolves without error | `await captureEnrollmentApprovedSnapshot(...)` resolves |
| TC-TENR-005 | captureSnapshot throws → helper still resolves (no rethrow) | Helper resolves after internal throw |
| TC-TENR-006 | captureSnapshot throws → log.error called with structured event | `log.error.mock.calls.length === 1` |
| TC-TENR-007 | log.error event contains trigger_event, enrollment_id, trade_id, org_id, err_name, err_msg | All six structured fields verified |
| TC-TENR-008 | captureSnapshot success → log.error NOT called | `log.error` call count is 0 on success path |
| TC-TENR-009 | missing latest_log_id → log.error called with reason=missing_enrollment_id | `log.error` called with `reason: 'missing_enrollment_id'` |
| TC-TENR-010 | missing latest_log_id → captureSnapshot NOT called | `captureSnapshot` never called when `latest_log_id` is null |
| TC-TENR-011 | missing latest_log_id → helper resolves normally (no rethrow) | Helper resolves even when guard fires |
| TC-TENR-012 | triggerEvent is ENROLLMENT_APPROVED, never PARTNER_TRANSMITTED | Explicit check that `PARTNER_TRANSMITTED` is never passed |

**Result: 12/12 pass**

Test command:
```
pnpm -C server exec vitest run src/__tests__/ttp-score-snapshot-trigger-enrollment.unit.test.ts
```

---

## 7. Regression Tests

| Suite | Count | Result |
|---|---|---|
| `ttp-score-snapshot.service.unit.test.ts` (Slice 2) | 13 | ✅ all pass |
| `ttp-score-snapshot-trigger-vpc.unit.test.ts` (Slice 3) | 10 | ✅ all pass |
| `ttp-score-snapshot-trigger-enrollment.unit.test.ts` (Slice 4) | 12 | ✅ all pass |
| **Total** | **35** | **✅ all pass** |

---

## 8. TypeScript

```
pnpm --filter server tsc --noEmit
```

**Result: clean (exit 0, no errors)**

---

## 9. Safety / No-Go Confirmation

| Invariant | Status |
|---|---|
| `ttp_enabled` | `false` — UNCHANGED throughout |
| `LEGAL_REVIEW_PENDING` | UNCHANGED — no copy surfaces touched |
| `computeTtpScore` | UNCHANGED — pure function not modified |
| `TtpScoreSnapshotService` | UNCHANGED (Slice 2 sealed) |
| `ttpEnrollment.service.ts` | UNCHANGED — `adminReviewEnrollment` does not call snapshot service (OQ-SS-06) |
| `PARTNER_TRANSMITTED` write path | NOT OPENED — Wave 4 gate applies |
| Slice 5 (admin-review trigger) | NOT OPENED |
| Slice 6 (read endpoints) | NOT OPENED — `LEGAL_REVIEW_PENDING` gate |
| DB migrations | NONE — no `prisma migrate dev`, no `prisma db push` |
| `.env` files | UNCHANGED |
| REJECTED/SUSPENDED/CANCELLED outcomes | Do NOT trigger snapshot — `APPROVED`-only guard in route handler |

---

## 10. Authority Chain

| Source | Reference |
|---|---|
| Wave 2 design gate | `TTP-SCORE-SNAPSHOT-DESIGN-001` `DESIGN_DECISIONS_RECORDED` |
| Design decisions | `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001` OQ-SS-01–OQ-SS-07 |
| Slice 3 gate | `VERIFIED_COMPLETE` (`a2c9d0d`, `33dd382`) |
| Slice 3 verification | `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-TRIGGER-VPC-VERIFIED-001.md` |
| This verification commit | `b780afd` — `feat(tradetrust-pay): capture score snapshot on enrollment approval` |
| Tracker updated | `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` §5/§9/§17/§18/§20 |

---

## 11. Final Decision

```
TTP_SCORE_SNAPSHOT_TRIGGER_ENROLLMENT_001_VERIFIED_COMPLETE
```

**`ttp_enabled` state:** `false` — UNCHANGED  
**Slice 1 status:** `TRUTH_SYNCED` (`5e8ac44` + `f9a1ecd`)  
**Slice 2 status:** `TRUTH_SYNCED` (`371b739` + `86b6373`)  
**Slice 3 status:** `VERIFIED_COMPLETE` (`a2c9d0d` + `33dd382`)  
**Slice 4 status:** `VERIFIED_COMPLETE` — `captureEnrollmentApprovedSnapshot` committed `b780afd`; 12/12 tests pass; tsc clean  
**Next slice gate:** Slice 5 (admin-review trigger) must not be opened without explicit Paresh authorization
