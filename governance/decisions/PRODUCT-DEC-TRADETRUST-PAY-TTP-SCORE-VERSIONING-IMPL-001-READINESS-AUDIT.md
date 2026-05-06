# PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-VERSIONING-IMPL-001-READINESS-AUDIT

## §1 Metadata

| Field | Value |
|---|---|
| **Document ID** | `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-VERSIONING-IMPL-001-READINESS-AUDIT` |
| **Unit ID** | `TTP-SCORE-VERSIONING-IMPL-001` |
| **Type** | Readiness audit / implementation necessity decision |
| **Date** | 2026-05-06 |
| **Auditor** | GitHub Copilot (governed by TexQtic AGENTS.md + copilot-instructions.md) |
| **Authorized by** | Paresh Patel — audit only; no implementation authorized |
| **`ttp_enabled`** | `false` — UNCHANGED |
| **Legal status** | `LEGAL_REVIEW_PENDING` — UNCHANGED |
| **Implementation authorized** | NO |
| **Schema / SQL authorized** | NO |
| **Prisma commands run** | NONE |
| **Application code changed** | NONE |

### Authoritative gate state (at audit date)

| Unit | Status | Commits |
|---|---|---|
| `TTP-TEXQTICSCORE-V2-SERVICE-001` | `TRUTH_SYNCED` | `3999a2c`, `2c01c38` |
| `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` | `TRUTH_SYNCED` | `50fa075`, `3284f3f` |
| `TTP-TEXQTICSCORE-V2-ADMIN-READ-001` | `TRUTH_SYNCED` | `d7186d7`, `a218275` |
| `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` | `BLOCKED_LEGAL` | — |

---

## §2 Repo-Truth Inspection Summary

### Files inspected

| File | Purpose |
|---|---|
| `server/prisma/migrations/20260516000000_ttp_score_snapshot_001/migration.sql` | DB schema authority — `ttp_score_snapshots` DDL, CHECK constraints |
| `server/prisma/schema.prisma` (lines 1677–1703) | Prisma model `ttp_score_snapshots` |
| `server/src/services/ttpScoreSnapshot.service.ts` | Write-side snapshot service; `CaptureSnapshotInput`; `scoreVersion` handling |
| `server/src/services/ttpScoreV2.service.ts` | TexQticScore v2 computation; `ScoreVersion` type |
| `server/src/routes/control/ttp-score-snapshots.ts` | Admin read route; `snapshotListQuerySchema`; `SNAPSHOT_SELECT`; `querySnapshotList` |
| `server/src/__tests__/ttp-score-snapshot.service.unit.test.ts` | Snapshot service unit tests |
| `server/src/__tests__/ttp-score-snapshot-v2-integration.unit.test.ts` | v2 snapshot integration unit tests |
| `server/src/__tests__/ttp-score-snapshot-read-admin.unit.test.ts` | Admin read unit tests (TC-RSA-001 through TC-RSA-020) |

---

### SQL / schema findings

**Migration:** `20260516000000_ttp_score_snapshot_001/migration.sql`

- `score_version TEXT NOT NULL` — column exists.
- Comment on column: `-- TTP_V1 | TEXQTICSCORE_V2 (OQ-SS-07)` — intent documented.
- `CONSTRAINT ttp_score_snapshots_score_version_check CHECK (score_version IN ('TTP_V1', 'TEXQTICSCORE_V2'))` — CHECK constraint explicitly allows both values.
- No other `score_version` constraints exist.
- No enum type; column is `TEXT` — flexible for future string values if CHECK is updated.
- Immutability trigger (`trg_ttp_score_snapshot_immutable`) enforces append-only at DB layer.

**Finding:** DB schema is complete and sufficient for both `TTP_V1` and `TEXQTICSCORE_V2`. No SQL migration required.

---

### Prisma findings

**Model:** `ttp_score_snapshots` (schema.prisma lines 1677–1703)

- `score_version String` — field present; Prisma type is `String` (plain, not enum).
- No Prisma enum for `score_version` — uses DB `TEXT` directly (consistent with migration).
- All other snapshot fields are present and correct.
- No model-level or enum mismatch exists.
- `score_version: true` is included in `SNAPSHOT_SELECT` in the route file.

**Finding:** Prisma model is complete and sufficient. No Prisma schema sync or `prisma generate` required now.

---

### Service findings

**`ttpScoreSnapshot.service.ts`**

- `scoreVersion?: ScoreVersion` is an optional field on `CaptureSnapshotInput` (lines 115–126).
- Default is `'TTP_V1'` when `scoreVersion` is omitted — existing callers are unaffected.
- Explicit `'TEXQTICSCORE_V2'` path exists — calls `computeTexQticScore` and uses `TEXQTICSCORE_V2_DISCLAIMER_HASH`.
- `ScoreVersion` type is imported from `ttpScoreV2.service.ts`.
- `TEXQTICSCORE_V2_DISCLAIMER_HASH` is pre-computed at module scope.
- No schema gap. Both code paths are fully implemented and tested.

**`ttpScoreV2.service.ts`**

- `export type ScoreVersion = 'TTP_V1' | 'TEXQTICSCORE_V2'` — TypeScript union type at line ~78.
- Inline comment (OQ-V2-06): "the existing String column with CHECK constraint is sufficient; no schema migration required for this type definition."
- Pure computation function `computeTexQticScore` — no DB access.
- `version: 'TEXQTICSCORE_V2'` discriminator field present in output shape.

**Finding:** Service layer fully supports both score versions. No application code changes required.

---

### Admin read findings

**`server/src/routes/control/ttp-score-snapshots.ts`**

- `snapshotListQuerySchema` includes: `score_version: z.enum(['TTP_V1', 'TEXQTICSCORE_V2']).optional()`.
- `SNAPSHOT_SELECT` includes `score_version: true`.
- `querySnapshotList` propagates `filters.score_version` to `where.score_version` when provided.
- `querySnapshotDetail` uses same `SNAPSHOT_SELECT` — `score_version` is returned in detail responses.
- Invalid `score_version` values are rejected by Zod at the route boundary.

**Finding:** Admin reads expose and filter `score_version` safely and completely for both values.

---

### Test findings

**`ttp-score-snapshot.service.unit.test.ts`**

- Covers `TtpScoreSnapshotService.captureSnapshot` for v1 default path.
- `score_version: 'TTP_V1'` asserted in snapshot write data (TC-SS-008).

**`ttp-score-snapshot-v2-integration.unit.test.ts`**

- TC-V2SI-003: explicit `scoreVersion: 'TEXQTICSCORE_V2'` passed to `captureSnapshot` — `score_version: 'TEXQTICSCORE_V2'` asserted in DB write call.
- Multiple tests prove v2 snapshot capture path at service-mock level.

**`ttp-score-snapshot-read-admin.unit.test.ts`**

- TC-RSA-001 through TC-RSA-012: baseline admin read tests.
- TC-RSA-013: `score_version=TTP_V1` propagated to `where` clause.
- TC-RSA-014: `score_version=TEXQTICSCORE_V2` propagated to `where` clause.
- TC-RSA-015: `score_version` absent from `where` when not provided.
- TC-RSA-016: invalid `score_version` string rejected by `snapshotListQuerySchema`.
- TC-RSA-017: composite filter (`score_version` + `trigger_event`) — both in `where`.
- TC-RSA-018: `SNAPSHOT_SELECT` includes `score_version`.
- TC-RSA-019: `SNAPSHOT_SELECT` still excludes `score_detail_json` after admin-read-001 extension.
- TC-RSA-020: `querySnapshotDetail` carries `score_version` from mocked row to result.
- Total: 20/20 tests pass (verified by `TTP-TEXQTICSCORE-V2-ADMIN-READ-001` unit at `a218275`).

**Finding:** Test coverage is complete for both score versions across all three test suites.

---

## §3 Versioning Capability Matrix

| Capability | Status | Evidence |
|---|---|---|
| **DB column** `score_version TEXT NOT NULL` | ✅ EXISTS | Migration DDL: `score_version TEXT NOT NULL` |
| **DB CHECK constraint** allows `TTP_V1` | ✅ EXISTS | `CHECK (score_version IN ('TTP_V1', 'TEXQTICSCORE_V2'))` |
| **DB CHECK constraint** allows `TEXQTICSCORE_V2` | ✅ EXISTS | Same CHECK constraint |
| **Prisma model** `score_version String` | ✅ PRESENT | `schema.prisma` line 1686: `score_version String` |
| **Prisma no enum mismatch** | ✅ CLEAN | String field; no Prisma enum defined; consistent with DB TEXT |
| **TypeScript `ScoreVersion` type** | ✅ PRESENT | `ttpScoreV2.service.ts`: `export type ScoreVersion = 'TTP_V1' \| 'TEXQTICSCORE_V2'` |
| **`CaptureSnapshotInput.scoreVersion`** | ✅ PRESENT | `ttpScoreSnapshot.service.ts`: `scoreVersion?: ScoreVersion` |
| **Snapshot write service — `TTP_V1` default** | ✅ WORKS | Default path; TC-SS-008 |
| **Snapshot write service — explicit `TEXQTICSCORE_V2`** | ✅ WORKS | TC-V2SI-003 + surrounding tests |
| **Admin list `score_version` selected** | ✅ PRESENT | `SNAPSHOT_SELECT.score_version: true` |
| **Admin list `score_version` filter (both values)** | ✅ WORKS | `snapshotListQuerySchema` + TC-RSA-013, TC-RSA-014 |
| **Admin detail `score_version` returned** | ✅ WORKS | TC-RSA-020 |
| **Invalid `score_version` rejected** | ✅ WORKS | TC-RSA-016: Zod `.enum(['TTP_V1', 'TEXQTICSCORE_V2'])` |
| **Tenant surface `score_version`** | 🚫 NOT IMPLEMENTED | `BLOCKED_LEGAL` — `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` gated |
| **Legal/public surface `score_version`** | 🚫 NOT IMPLEMENTED | `LEGAL_REVIEW_PENDING` — no tenant/public routes exist |

**Audit summary:** All backend versioning capabilities for `TTP_V1` and `TEXQTICSCORE_V2` are fully implemented, tested, and production-schema-verified. Tenant and public surfaces remain gated by `LEGAL_REVIEW_PENDING`.

---

## §4 Implementation Necessity Decision

### Audit questions answered

| # | Question | Answer |
|---|---|---|
| 1 | Does the DB schema already contain `score_version`? | **YES** — `TEXT NOT NULL` column exists in migration |
| 2 | Does the DB CHECK constraint already allow `TEXQTICSCORE_V2`? | **YES** — `CHECK (score_version IN ('TTP_V1', 'TEXQTICSCORE_V2'))` |
| 3 | Does Prisma already support the field without enum/schema changes? | **YES** — `score_version String` in Prisma model; no enum mismatch |
| 4 | Does the snapshot service already support v1 and v2 score versions? | **YES** — `scoreVersion?: ScoreVersion`; both paths implemented and tested |
| 5 | Do admin reads already expose/filter `score_version` safely? | **YES** — list filter, detail return, invalid-value rejection all implemented |
| 6 | Is any SQL migration required now? | **NO** |
| 7 | Is any Prisma sync/generation required now? | **NO** |
| 8 | Is any application code change required now? | **NO** |
| 9 | Should `TTP-SCORE-VERSIONING-IMPL-001` be marked: | **`NO_IMPLEMENTATION_REQUIRED_CURRENTLY`** — see decision below |
| 10 | What future condition would reopen versioning work? | See §5 |

### Decision

**`NO_IMPLEMENTATION_REQUIRED_CURRENTLY`**

`TTP-SCORE-VERSIONING-IMPL-001` was originally scoped as: *"score_version column on ttp_score_snapshots."*

Repo-truth confirms that every deliverable implied by that original scope is already present, verified, and passing tests:

- The `score_version` column exists in the DB schema with a CHECK constraint covering both allowed values.
- The Prisma model reflects the column correctly as `String`.
- The TypeScript `ScoreVersion` type union covers both values.
- The snapshot service supports both values with a clean default and explicit override.
- Admin reads select, filter, and return `score_version` safely for both values.
- 20/20 unit tests pass across all three relevant test suites.

There is **no gap** between the original unit description and current repo state. No implementation work is required at this time.

The only outstanding versioning surface (tenant/public) is not a versioning architecture gap — it is blocked independently by `LEGAL_REVIEW_PENDING` (`TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001`).

---

## §5 Future Reopen Conditions

The following conditions would justify reopening versioning work:

| Condition | Trigger |
|---|---|
| Adding `TEXQTICSCORE_V3` (or any future score version) | DB CHECK constraint would need update; `ScoreVersion` type union would need extension; all service paths and tests would need update |
| Converting `score_version` TEXT to a DB ENUM type | DDL migration required; Prisma schema update required; potential Prisma enum codegen change |
| Adding a score algorithm registry table | New DB table, Prisma model, service layer, and admin routes required |
| Adding version metadata / migration history table | New DB table tracking which org snapshots were computed under which version |
| Backfilling v1 snapshots to v2 (bulk version upgrade) | Requires explicit authorization, migration plan, immutability review (append-only table) |
| Tenant/public version display requirements | Only unblocks after `LEGAL_REVIEW_PENDING` → `LEGAL_APPROVED` for tenant-visible TexQticScore v2 surfaces |
| Score algorithm change requiring new version discriminator | New `ScoreVersion` value; CHECK constraint update; new service computation path |

---

## §6 Tracker Recommendation

Recommend updating tracker status for `TTP-SCORE-VERSIONING-IMPL-001`:

**From:** `NOT_OPENED`

**To:** `NO_IMPLEMENTATION_REQUIRED_CURRENTLY`

**Rationale:** The original scope (score_version column and type support) is fully satisfied by existing implementation slices. No new implementation is needed unless a reopen condition (§5) is triggered.

**Reference artifact:** This document — `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-VERSIONING-IMPL-001-READINESS-AUDIT.md`

**Tracker legend update:** Add `NO_IMPLEMENTATION_REQUIRED_CURRENTLY` to status legend if not already present.

---

## §7 No-Go Confirmation

| Invariant | Status |
|---|---|
| No code changed | ✅ CONFIRMED |
| No schema changed | ✅ CONFIRMED |
| No SQL written | ✅ CONFIRMED |
| No migration run | ✅ CONFIRMED |
| No Prisma command run | ✅ CONFIRMED |
| No route changed | ✅ CONFIRMED |
| No activation | ✅ CONFIRMED |
| `ttp_enabled` unchanged (`false`) | ✅ CONFIRMED |
| `LEGAL_REVIEW_PENDING` unchanged | ✅ CONFIRMED |
| No `TenantFeatureOverride` change | ✅ CONFIRMED |
| No legal wording finalized | ✅ CONFIRMED |
| No tenant-facing score surface exposed | ✅ CONFIRMED |
| No partner/payment/lending behavior added | ✅ CONFIRMED |
| Wave 3/4/5 gates unchanged | ✅ CONFIRMED |
| No `score_detail_json` exposure | ✅ CONFIRMED |
| No implementation slice opened automatically | ✅ CONFIRMED |

---

## §8 Final Decision

```
TTP_SCORE_VERSIONING_IMPL_001_NO_IMPLEMENTATION_REQUIRED_CURRENTLY
```

**Explanation:** Every deliverable implied by the original `TTP-SCORE-VERSIONING-IMPL-001` scope
("score_version column on ttp_score_snapshots") is already present, production-schema-verified,
and fully tested. DB column, CHECK constraint, Prisma model, TypeScript type, service write paths,
and admin reads all support both `TTP_V1` and `TEXQTICSCORE_V2` correctly.
No SQL, no Prisma migration, and no application code changes are required at this time.
Versioning work would reopen only if a condition listed in §5 is triggered and explicitly
authorized by Paresh PATEL
