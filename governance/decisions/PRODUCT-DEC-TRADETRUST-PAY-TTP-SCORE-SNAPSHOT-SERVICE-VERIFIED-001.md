# PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-SERVICE-VERIFIED-001

## Metadata

| Field | Value |
|---|---|
| **Unit ID** | `TTP-SCORE-SNAPSHOT-SERVICE-001` |
| **Parent task** | `TTP-SCORE-SNAPSHOT-IMPL-001` (Slice 2 of Wave 2) |
| **Date** | 2026-05-20 |
| **Author** | Paresh Sharma — TexQtic founder / operator |
| **Prompt scope** | Slice 1.5 FK Reconciliation + Slice 2 `TtpScoreSnapshotService` implementation |
| **Commit** | `371b739` — `feat(tradetrust-pay): add ttp score snapshot service` |
| **Governs** | `TtpScoreSnapshotService`, `assembleTtpScoreInput`, `captureSnapshot`, `SCORE_DISCLAIMER` export |

---

## 1. Scope Summary

This record documents the verified completion of:

1. **FK Reconciliation (Outcome B):** Normalization of a stale doc error in `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-SQL-RLS-VERIFIED-001.md`. No DB schema changes.
2. **`SCORE_DISCLAIMER` export:** Minimal non-breaking change to `ttpScore.service.ts` — added `export` keyword to the existing `SCORE_DISCLAIMER` const for cross-service consumption.
3. **`TtpScoreSnapshotService`:** New service (`ttpScoreSnapshot.service.ts`) implementing OQ-SS-01 through OQ-SS-05.
4. **13 unit tests:** Full test coverage of the new service.

---

## 2. FK Reconciliation — Outcome B (Doc Normalization Only)

### Finding

The verification record `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-SQL-RLS-VERIFIED-001.md` contained a stale error at line 82:

> **Was (incorrect):** `FK → ttp_enrollments(id) ON DELETE SET NULL`  
> **Now (correct):** `FK → ttp_enrollment_logs(id) ON DELETE NO ACTION`

### Evidence — FK is correct throughout the authority chain

| Source | FK Target | ON DELETE | Status |
|---|---|---|---|
| `server/prisma/migrations/20260516000000_ttp_score_snapshot_001/migration.sql` line 88 | `ttp_enrollment_logs(id)` | `NO ACTION` | ✅ |
| `server/prisma/schema.prisma` lines 1695–1697 | `ttp_enrollment_logs` via `@relation` | `NoAction` | ✅ |
| Design doc OQ-SS-03 (`PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001`) | `ttp_enrollment_logs.id` | `NO ACTION` | ✅ |
| Verification record line 82 (after fix) | `ttp_enrollment_logs(id)` | `NO ACTION` | ✅ (fixed) |

**Conclusion:** Outcome B confirmed. The FK target `ttp_enrollment_logs(id)` is correct in the DB, migration file, Prisma schema, and design doc. The verification record had stale documentation — it was the only artifact out of sync. Correction is doc normalization only. No SQL, no migration, no schema changes.

### What `enrollment_id` represents

`ttpEnrollment.service.ts` `buildRecord()` (line 176):
```
latest_log_id: latestLog?.id ?? null
```
`latestLog` is the `ttp_enrollment_logs` row. This confirms that the `enrollmentId` callers supply to `captureSnapshot` for `ENROLLMENT_APPROVED` is the `ttp_enrollment_logs.id` — consistent with the FK definition.

---

## 3. `SCORE_DISCLAIMER` Export

**File:** `server/src/services/ttpScore.service.ts`  
**Change:** Added `export` keyword to `SCORE_DISCLAIMER` const (line 105).

```ts
// Before
const SCORE_DISCLAIMER = 'TradeTrust Score is an advisory readiness indicator only...';

// After
export const SCORE_DISCLAIMER = 'TradeTrust Score is an advisory readiness indicator only...';
```

**Rationale:** `TtpScoreSnapshotService` must compute `score_disclaimer_hash = SHA-256(SCORE_DISCLAIMER)` at module load time. The const was already correct; only visibility changed. `computeTtpScore` logic is UNCHANGED.

**Non-breaking:** All existing callers of `computeTtpScore` are unaffected. The `disclaimer` field in `TradeTrustScore` return value is unchanged.

---

## 4. `TtpScoreSnapshotService` — Design Decision Compliance

### OQ-SS-01: Score trigger events

| Trigger | `source_event_id` source | Status |
|---|---|---|
| `VPC_ISSUED` | `vpcId` from `CaptureSnapshotInput` | ✅ Implemented |
| `ENROLLMENT_APPROVED` | `enrollmentId` from `CaptureSnapshotInput` | ✅ Implemented |
| `ADMIN_REVIEW_COMPLETE` | `sourceEventId` from `CaptureSnapshotInput` | ✅ Implemented |
| `PARTNER_TRANSMITTED` | — | ✅ Blocked — `SnapshotUnsupportedTriggerError` thrown at runtime |

`PARTNER_TRANSMITTED` is excluded from `TtpScoreTriggerEvent` type AND rejected at runtime. No write path exists.

### OQ-SS-02: `score_detail_json` shape

Persisted JSON: `{ factors, blockers, next_steps }` only.  
Excluded: `score`, `band`, `disclaimer`, `raw payloads` (GST data, invoice metadata, VPC data).  
Verified by TC-SS-004 and TC-SS-005.

### OQ-SS-03: FK — `enrollment_id → ttp_enrollment_logs.id`

See §2 above. Compliant.

### OQ-SS-04: Disclaimer hashes (module-scope, computed once)

| Constant | Source string | SHA-256 hash |
|---|---|---|
| `SCORE_DISCLAIMER_HASH` | `SCORE_DISCLAIMER` from `ttpScore.service.ts` | `88dfaca95601df6a57a19c519712159e0a24a2b2145d2eefb9862be63136bbd3` |
| `ROUTE_DISCLAIMER_HASH` | `TTP_DISCLAIMER_TEXT` from `ttp.constants.ts` | `fe8e9a8223edc9b78a6923ccf1f7fd210e01c1d1c9c0b1745f582d953754ac34` |

Both are `createHash('sha256').update(text).digest('hex')` — computed at module load via `node:crypto`. No runtime recalculation.

### OQ-SS-05: Best-effort semantics

`captureSnapshot` is a standalone service method. Callers (trigger sites) are expected to wrap calls in `try/catch`. A snapshot failure must never mutate or roll back the primary business operation (VPC issuance, enrollment approval, admin review). Verified by TC-SS-011.

### `score_version`

Always `'TTP_V1'`. Verified by TC-SS-008.

---

## 5. Files Changed

| File | Change | Type |
|---|---|---|
| `server/src/services/ttpScoreSnapshot.service.ts` | **NEW** — `TtpScoreSnapshotService` | Implementation |
| `server/src/__tests__/ttp-score-snapshot.service.unit.test.ts` | **NEW** — 13 unit tests | Test |
| `server/src/services/ttpScore.service.ts` | `export` added to `SCORE_DISCLAIMER` | Minimal modification |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-SQL-RLS-VERIFIED-001.md` | Line 82 doc normalization (FK name + ON DELETE) | Doc fix |
| `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | §5/§9/§17/§18/§20 updated | Tracker update |

**Total: 5 files. No migration. No schema change. No route. No UI. No middleware.**

---

## 6. Test Evidence

### tsc --noEmit

**Command:**
```
pnpm -C server exec tsc --noEmit
```
**Output:** *(no output — clean)*

### New service tests — 13 cases

**Command:**
```
npx vitest run src/__tests__/ttp-score-snapshot.service.unit.test.ts
```

**Output:**
```
 ✓ src/__tests__/ttp-score-snapshot.service.unit.test.ts (13)
   ✓ TtpScoreSnapshotService > TC-SS-001: captureSnapshot writes a row for VPC_ISSUED trigger
   ✓ TtpScoreSnapshotService > TC-SS-002: captureSnapshot writes a row for ENROLLMENT_APPROVED — enrollment_id = source_event_id
   ✓ TtpScoreSnapshotService > TC-SS-003: captureSnapshot writes a row for ADMIN_REVIEW_COMPLETE
   ✓ TtpScoreSnapshotService > TC-SS-004: score_detail_json includes factors, blockers, next_steps
   ✓ TtpScoreSnapshotService > TC-SS-005: score_detail_json excludes score, band, disclaimer, and raw payloads
   ✓ TtpScoreSnapshotService > TC-SS-006: score_disclaimer_hash equals SHA-256(SCORE_DISCLAIMER)
   ✓ TtpScoreSnapshotService > TC-SS-007: route_disclaimer_hash equals SHA-256(TTP_DISCLAIMER_TEXT)
   ✓ TtpScoreSnapshotService > TC-SS-008: score_version is TTP_V1
   ✓ TtpScoreSnapshotService > TC-SS-009: PARTNER_TRANSMITTED trigger is rejected with SnapshotUnsupportedTriggerError — DB create not called
   ✓ TtpScoreSnapshotService > TC-SS-010: ADMIN_REVIEW_COMPLETE allows trade_id=null and enrollment_id=null
   ✓ TtpScoreSnapshotService > TC-SS-011: best-effort — snapshot failure does not mutate primary result
   ✓ TtpScoreSnapshotService > TC-SS-012: assembleTtpScoreInput returns correct shape when tradeId is provided
   ✓ TtpScoreSnapshotService > TC-SS-013: assembleTtpScoreInput — no tradeId context — invoice / vpc / routing not-found; trade DB tables NOT queried

 Test Files  1 passed (1)
 Tests  13 passed (13)
```

### Existing tests (regression)

**Command:**
```
npx vitest run src/__tests__/ttp-score.service.unit.test.ts src/__tests__/ttp.constants.unit.test.ts
```

**Output:**
```
 Test Files  2 passed (2)
 Tests  83 passed (83)
```

**Combined: 96/96 tests pass. 0 failures.**

---

## 7. Safety Confirmations

| Invariant | State | Evidence |
|---|---|---|
| `ttp_enabled` | `false` — UNCHANGED | Not touched by any changed file |
| `LEGAL_REVIEW_PENDING` | UNCHANGED | `TTP-LEGAL-COPY-COUNSEL-PACKET-001` — untouched |
| `computeTtpScore` logic | UNCHANGED | Only `export` keyword added to `SCORE_DISCLAIMER`; no function body touched |
| Routes | No new routes | Service only; no Fastify route registered |
| Migrations | No migration commands run | No `prisma migrate dev`, no `prisma db push` |
| Prisma schema | UNCHANGED | No `schema.prisma` modification |
| `PARTNER_TRANSMITTED` write path | Not implemented | Blocked at both type level and runtime |
| Slice 3 (trigger integrations) | NOT opened | Requires explicit Paresh authorization |
| Other services | UNCHANGED | `ttpSummary.service.ts`, `ttpEnrollment.service.ts` not modified |

---

## 8. Authority Chain

| Source | Reference |
|---|---|
| Wave 2 gate | `TTP-SCORE-SNAPSHOT-DESIGN-001` `DESIGN_DECISIONS_RECORDED` |
| Design decisions | `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001` OQ-SS-01–OQ-SS-07 |
| Slice 2 gate | Slice 1 `TRUTH_SYNCED` (`5e8ac44`, `f9a1ecd`) |
| This verification | `371b739` — `feat(tradetrust-pay): add ttp score snapshot service` |
| Tracker updated | `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` §5/§9/§17/§18/§20 |

---

## 9. Final Decision

```
TTP_SCORE_SNAPSHOT_SERVICE_001_VERIFIED_COMPLETE
```

**`ttp_enabled` state:** `false` — UNCHANGED  
**Slice 1 status:** `TRUTH_SYNCED` (`5e8ac44` + `f9a1ecd`)  
**Slice 2 status:** `IMPLEMENTED_PENDING_VERIFICATION` → `VERIFIED_COMPLETE` — `TtpScoreSnapshotService` committed `371b739`; 13/13 tests pass; tsc clean  
**Next slice gate:** Slice 3 (trigger integrations into VPC/enrollment/admin-review routes) must not be opened without explicit Paresh authorization
