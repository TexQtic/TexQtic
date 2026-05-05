# PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-TRIGGER-VPC-VERIFIED-001

## Metadata

| Field | Value |
|---|---|
| Document ID | PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-TRIGGER-VPC-VERIFIED-001 |
| Unit | TTP-SCORE-SNAPSHOT-TRIGGER-VPC-001 (Slice 3 of TTP-SCORE-SNAPSHOT-IMPL-001) |
| Date | 2026-05-05 |
| Status | `VERIFIED_COMPLETE` |
| Authority | Paresh Patel — TexQtic founder / operator |
| `ttp_enabled` state | `false` — UNCHANGED, IMMUTABLE |
| Commit 1 | `a2c9d0d` — `feat(tradetrust-pay): capture score snapshot on vpc issuance` |
| Slice 2 gate commit | `371b739` — `feat(tradetrust-pay): add ttp score snapshot service` |
| Tracker | `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` |

---

## 1. Authority Basis

This verification record covers Slice 3 of `TTP-SCORE-SNAPSHOT-IMPL-001`:
**VPC route-level orchestration — post-commit best-effort `VPC_ISSUED` snapshot trigger only.**

Authority chain:
- Design decisions `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001` (OQ-SS-01 through OQ-SS-07 resolved)
- Slice 2 gate cleared: `TTP-SCORE-SNAPSHOT-SERVICE-001` `TRUTH_SYNCED` (`371b739`, `86b6373`)
  - Verification: `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-SERVICE-VERIFIED-001.md`
- Slice 3 authorized scope: VPC issuance route orchestration only. Enrollment trigger (Slice 4), admin-review trigger (Slice 5), and read endpoints (Slice 6) remain NOT_OPENED.

OQ-SS-06 design decision applies directly:
> Snapshot write timing: post-commit sequential write — NOT inside the triggering transaction.
> Snapshot write failure handling: best-effort — log failure, return triggering event result normally, do NOT roll back triggering event.
> Orchestration location: route handler — NOT inside triggering service methods.

---

## 2. Files Changed (Commit `a2c9d0d`)

| File | Change |
|---|---|
| `server/src/routes/control/vpc.ts` | MODIFIED — `captureVpcIssuedSnapshot` helper exported; VPC `POST /generate/:invoiceId` handler updated |
| `server/src/__tests__/ttp-score-snapshot-trigger-vpc.unit.test.ts` | NEW — 10 unit tests (TC-TVPC-001 through TC-TVPC-010) |
| `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | MODIFIED — §5/§9/§17/§18/§20 updated |

Files NOT modified:
- `server/src/services/ttpScoreSnapshot.service.ts` — UNCHANGED (Slice 2 complete)
- `server/src/services/vpc.service.ts` — UNCHANGED (OQ-SS-06: route-level only)
- `server/src/services/ttpScore.service.ts` — UNCHANGED
- `server/prisma/schema.prisma` — UNCHANGED
- `.env` / `.env.local` — UNCHANGED

---

## 3. Route Orchestration Design

### `captureVpcIssuedSnapshot` — exported helper

Location: `server/src/routes/control/vpc.ts` (exported for unit testing)

```typescript
export async function captureVpcIssuedSnapshot(params: {
  record: AdminVpcRecord;
  invoiceId: string;
  adminId: string;
  snapshotSvc: Pick<TtpScoreSnapshotService, 'captureSnapshot'>;
  log: { error(obj: Record<string, unknown>, msg: string): void };
}): Promise<void>
```

**Behavior:**
- Calls `snapshotSvc.captureSnapshot(...)` with `VPC_ISSUED` trigger context
- On success: resolves normally (silent)
- On `captureSnapshot` throw: catches, logs structured `ttp.score_snapshot.capture_failed` event, returns normally (does NOT rethrow)

### `POST /generate/:invoiceId` handler integration

After `writeAuditLog` and before `return sendSuccess(reply, record, 201)`:

```typescript
try {
  await withVpcAdminWriteContext(record.org_id, adminId, async tx => {
    await captureVpcIssuedSnapshot({
      record,
      invoiceId,
      adminId,
      snapshotSvc: new TtpScoreSnapshotService(makeTxBoundPrisma(tx)),
      log: request.log,
    });
  });
} catch (snapshotCtxErr) {
  request.log.error({ event: 'ttp.score_snapshot.capture_failed', ... }, 'ttp.score_snapshot.capture_failed');
}
return sendSuccess(reply, record, 201);
```

**Two-layer error containment:**
1. **Inner (inside `captureVpcIssuedSnapshot`):** Catches all `captureSnapshot` errors — snapshot DB write failures, score computation errors, etc.
2. **Outer (in route handler):** Catches `withVpcAdminWriteContext` setup failures — RLS context setup, transaction initialization, etc.

Both layers log `ttp.score_snapshot.capture_failed` as a structured Pino event and allow the VPC HTTP response to proceed normally.

---

## 4. Snapshot Context for `VPC_ISSUED`

| `captureSnapshot` field | Value | Source |
|---|---|---|
| `orgId` | `record.org_id` | VPC record (DB truth) |
| `triggerEvent` | `TTP_SCORE_TRIGGER_EVENT.VPC_ISSUED` | Constant from `ttpScoreSnapshot.service.ts` |
| `tradeId` | `record.trade_id` | VPC record |
| `invoiceId` | `invoiceId` | Route path param |
| `vpcId` | `record.id` | VPC record (the newly-issued VPC) |
| `sourceEventId` | `record.id` | VPC record (AF-05: source_event_id = primary entity ID) |
| `actorId` | `adminId` | Authenticated admin from session |
| `enrollmentId` | not set | NULL — VPC issuance is not enrollment-scoped |

---

## 5. Best-Effort Failure Behavior Proof

Snapshot failure is guaranteed to be non-fatal to VPC issuance by design:

1. **VPC row already committed** before snapshot trigger is called — `withVpcAdminWriteContext` is used for the snapshot write, a separate context from the VPC generation transaction.
2. **`captureVpcIssuedSnapshot` absorbs all `captureSnapshot` errors** — inner try/catch.
3. **`withVpcAdminWriteContext` context errors** are absorbed by the outer try/catch in the route handler.
4. **`return sendSuccess(reply, record, 201)`** is outside and after both try/catch blocks — always executes.

Structured log event emitted on any snapshot failure:
```json
{
  "event": "ttp.score_snapshot.capture_failed",
  "trigger_event": "VPC_ISSUED",
  "vpc_id": "<string>",
  "invoice_id": "<string>",
  "trade_id": "<string>",
  "org_id": "<string>",
  "err_name": "<Error.name or 'UnknownError'>",
  "err_msg": "<Error.message or String(err)>"
}
```

**No sensitive fields** (no `actorId`/`adminId`, no connection strings, no bearer tokens) in the log event.

---

## 6. Unit Test Suite

File: `server/src/__tests__/ttp-score-snapshot-trigger-vpc.unit.test.ts`

| TC | Title | Assertion |
|---|---|---|
| TC-TVPC-001 | calls captureSnapshot with triggerEvent = VPC_ISSUED | `captureSnapshot.mock.calls[0][0].triggerEvent === 'VPC_ISSUED'` |
| TC-TVPC-002 | snapshot context has correct vpcId, sourceEventId, invoiceId, orgId, actorId, tradeId | All six context fields verified |
| TC-TVPC-003 | captureSnapshot success → helper resolves without error | `await captureVpcIssuedSnapshot(...)` resolves |
| TC-TVPC-004 | VPC generation failure → captureSnapshot not called (route orchestration contract) | `captureSnapshot` never called in error path |
| TC-TVPC-005 | captureSnapshot throws → helper does NOT rethrow | Awaiting helper in try block does not throw |
| TC-TVPC-006 | captureSnapshot throws → helper returns normally (VPC unaffected) | Helper resolves after internal throw |
| TC-TVPC-007 | captureSnapshot throws → log.error called once with structured event | `log.error.mock.calls.length === 1` |
| TC-TVPC-008 | log.error event has all required fields, no sensitive fields | Verifies `event`, `trigger_event`, `vpc_id`, `invoice_id`, `trade_id`, `org_id`, `err_name`, `err_msg`; no `adminId`/`actorId` |
| TC-TVPC-009 | triggerEvent is VPC_ISSUED, never PARTNER_TRANSMITTED | Explicit check that `PARTNER_TRANSMITTED` is never passed |
| TC-TVPC-010 | captureSnapshot success → log.error NOT called | `log.error` call count is 0 on success path |

**Result: 10/10 pass**

Test command:
```
pnpm --filter server test server/src/__tests__/ttp-score-snapshot-trigger-vpc.unit.test.ts
```

---

## 7. Regression Tests

| Suite | Count | Result |
|---|---|---|
| `ttp-score-snapshot.service.unit.test.ts` (Slice 2) | 13 | ✅ all pass |
| `vpc.service.unit.test.ts` | 31 | ✅ all pass |
| Slice 3 trigger tests | 10 | ✅ all pass |
| **Total** | **54** | **✅ all pass** |

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
| `vpc.service.ts` | UNCHANGED — `generateVpc` does not call snapshot service (OQ-SS-06) |
| `PARTNER_TRANSMITTED` write path | NOT OPENED — Wave 4 gate applies |
| Slice 4 (enrollment trigger) | NOT OPENED |
| Slice 5 (admin-review trigger) | NOT OPENED |
| Slice 6 (read endpoints) | NOT OPENED — `LEGAL_REVIEW_PENDING` gate |
| DB migrations | NONE — no `prisma migrate dev`, no `prisma db push` |
| `.env` files | UNCHANGED |

---

## 10. Authority Chain

| Source | Reference |
|---|---|
| Wave 2 design gate | `TTP-SCORE-SNAPSHOT-DESIGN-001` `DESIGN_DECISIONS_RECORDED` |
| Design decisions | `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001` OQ-SS-01–OQ-SS-07 |
| Slice 3 gate | Slice 2 `TRUTH_SYNCED` (`371b739`, `86b6373`) |
| This verification commit | `a2c9d0d` — `feat(tradetrust-pay): capture score snapshot on vpc issuance` |
| Tracker updated | `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` §5/§9/§17/§18/§20 |

---

## 11. Final Decision

```
TTP_SCORE_SNAPSHOT_TRIGGER_VPC_001_VERIFIED_COMPLETE
```

**`ttp_enabled` state:** `false` — UNCHANGED  
**Slice 1 status:** `TRUTH_SYNCED` (`5e8ac44` + `f9a1ecd`)  
**Slice 2 status:** `TRUTH_SYNCED` (`371b739` + `86b6373`)  
**Slice 3 status:** `VERIFIED_COMPLETE` — `captureVpcIssuedSnapshot` committed `a2c9d0d`; 10/10 tests pass; tsc clean  
**Next slice gate:** Slice 4 (enrollment trigger) must not be opened without explicit Paresh authorization
