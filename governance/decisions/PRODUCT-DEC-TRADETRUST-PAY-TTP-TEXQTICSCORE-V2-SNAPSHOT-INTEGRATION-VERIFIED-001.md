# PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-VERIFIED-001

## Decision Record — TexQticScore v2 Snapshot Integration

| Field          | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Record ID      | PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-VERIFIED-001 |
| Task ID        | TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001                            |
| Status         | VERIFIED                                                                 |
| Date           | 2026-05-05                                                               |
| Commit 1       | 50fa075465c452a327eb1f6d8154f95111390503                                 |
| Commit message | feat(tradetrust-pay): support texqticscore v2 snapshots                  |

---

## Summary

`TtpScoreSnapshotService.captureSnapshot` extended to support an optional `scoreVersion`
field on `CaptureSnapshotInput`.  When omitted (all existing callers), the service behaves
identically to before and writes `score_version: 'TTP_V1'`.  When explicitly passed as
`'TEXQTICSCORE_V2'` (admin/internal-only; not wired to any existing trigger route),
`computeTexQticScore` is invoked instead of `computeTtpScore` and the v2 disclaimer hash is
persisted.

A module-level exported pure function `compareTtpV1AndTexQticV2` provides a side-by-side
dual-run output for parity monitoring (OQ-V2-05).

---

## Invariants Preserved

| Invariant                                          | Status       |
| -------------------------------------------------- | ------------ |
| `ttp_enabled = false` — UNCHANGED                  | ✅ PRESERVED |
| `LEGAL_REVIEW_PENDING` — UNCHANGED                 | ✅ PRESERVED |
| `computeTtpScore` logic — UNCHANGED                | ✅ PRESERVED |
| `computeTexQticScore` logic — UNCHANGED            | ✅ PRESERVED |
| `TEXQTICSCORE_V2_DISCLAIMER` text — UNCHANGED      | ✅ PRESERVED |
| `TTP_DISCLAIMER_TEXT` — UNCHANGED                  | ✅ PRESERVED |
| All existing trigger route callers — UNCHANGED     | ✅ PRESERVED |
| No Prisma schema changes                           | ✅ PRESERVED |
| No SQL / migrations                                | ✅ PRESERVED |
| `org_id` scoping in every DB query — UNCHANGED     | ✅ PRESERVED |
| v2 snapshots not surfaced to tenants               | ✅ ENFORCED  |

---

## Files Changed

```
governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md
server/src/services/ttpScoreSnapshot.service.ts
server/src/__tests__/ttp-score-snapshot-v2-integration.unit.test.ts
```

---

## Governance Outcomes Covered

| OQ ID     | Description                                                           | Outcome  |
| --------- | --------------------------------------------------------------------- | -------- |
| OQ-V2-05  | Side-by-side v1 and v2 computation in snapshot service                | ✅ PASS  |
| OQ-V2-06  | Existing `score_version` column sufficient for v2 storage             | ✅ PASS  |
| OQ-V2-01  | `score_delta = 0` for all parity fixtures (TC-V2SI-009)               | ✅ PASS  |
| OQ-V2-02  | `band_match = true` for all parity fixtures (TC-V2SI-010)             | ✅ PASS  |

---

## Test Evidence

### TypeScript check
```
pnpm -C server exec tsc --noEmit
→ (no output — clean)
```

### New integration test suite — 11/11 PASS
```
✓ TtpScoreSnapshotService.captureSnapshot — v1 default behaviour (2)
  ✓ TC-V2SI-001: no scoreVersion → writes score_version TTP_V1
  ✓ TC-V2SI-002: v1 default score_detail_json has factors, blockers, next_steps only
✓ TtpScoreSnapshotService.captureSnapshot — scoreVersion TEXQTICSCORE_V2 (6)
  ✓ TC-V2SI-003: explicit TEXQTICSCORE_V2 writes score_version TEXQTICSCORE_V2
  ✓ TC-V2SI-004: explicit v2 capture writes score 100 and band READY for fully-ready fixture
  ✓ TC-V2SI-005: explicit v2 score_detail_json contains v2 factor keys
  ✓ TC-V2SI-006: explicit v2 score_disclaimer_hash equals SHA-256(TEXQTICSCORE_V2_DISCLAIMER)
  ✓ TC-V2SI-007: explicit v2 route_disclaimer_hash equals SHA-256(TTP_DISCLAIMER_TEXT)
  ✓ TC-V2SI-008: explicit v2 score_detail_json excludes score, band, version, disclaimer, raw payloads
✓ compareTtpV1AndTexQticV2 (3)
  ✓ TC-V2SI-009: returns score_delta 0 for fully-ready parity fixture (OQ-V2-01)
  ✓ TC-V2SI-010: returns band_match true for fully-ready parity fixture (OQ-V2-02)
  ✓ TC-V2SI-011: does not mutate the input object

Test Files  1 passed (1) | Tests  11 passed (11)
```

### Existing suites — 173/173 PASS (zero regressions)
```
ttp-score-snapshot.service.unit.test.ts              13 passed
ttp-score-snapshot-trigger-vpc.unit.test.ts          10 passed
ttp-score-snapshot-trigger-enrollment.unit.test.ts   12 passed
ttp-score-snapshot-trigger-admin-review.unit.test.ts 12 passed
ttp-score-snapshot-read-admin.unit.test.ts           12 passed
ttp-score-v2.service.unit.test.ts                    31 passed
ttp-score.service.unit.test.ts                       19 passed
ttp.constants.unit.test.ts                           64 passed
────────────────────────────────────────────────────────────────
Total                                               173 passed
```

---

## Commit gate

```
git show --stat HEAD
commit 50fa075465c452a327eb1f6d8154f95111390503 (HEAD -> main)
Author: Paresh <paresh@texqtic.com>
Date:   Tue May 5 23:26:15 2026 +0530

    feat(tradetrust-pay): support texqticscore v2 snapshots

 ...PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md |  45 ++--
 .../ttp-score-snapshot-v2-integration.unit.test.ts | 269 +++++++++++++++++++++
 server/src/services/ttpScoreSnapshot.service.ts    | 130 +++++++++-
 3 files changed, 417 insertions(+), 27 deletions(-)
```

---

*Governance review: PASS*
*LEGAL_REVIEW_PENDING applies to v2 snapshot path — must not be surfaced to tenants.*
