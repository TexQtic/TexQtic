# PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001

**Decision ID:** PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001  
**Type:** Design Decision Record — Open Question Resolutions  
**Unit ID:** TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001  
**Date:** 2026-05-05  
**Decision Owner:** Paresh Sharma — TexQtic founder / operator  
**Status:** `TTP_SCORE_SNAPSHOT_DESIGN_DECISIONS_001_RECORDED`

| Invariant | Confirmed State |
|---|---|
| `ttp_enabled` state | `false` — UNCHANGED |
| Implementation authorized | **No** — decisions recorded only; no implementation slice opened |
| Schema / SQL authorized | **No** |
| `ttp_score_snapshots` table created | **No** |
| `computeTtpScore` modified | **No** |
| Code changes | **None** |
| Activation | **None** |
| Legal status | `LEGAL_REVIEW_PENDING` — unchanged |

---

## 1. Authority Basis

This document records Paresh Sharma's decisions for the seven open questions (OQ-SS-01 through
OQ-SS-07) identified in §13 of the score snapshot design artifact. These decisions finalize the
design and authorize design-level updates to the governance artifacts only.

| Authority Document | Role |
|---|---|
| `governance/TTP-SCORE-SNAPSHOT-DESIGN-001.md` (commit `0807f08`) | Primary design artifact under decision |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-OPTIONS-AUDIT-001.md` (commit `959edc2`) | Repo-truth audit providing evidence for each option |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` | TQ-06 Option B ⭐, TQ-07 Option B ⭐, TQ-12 Option B ⭐ — architecture direction approvals |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-LEGAL-COUNSEL-REVIEW-PACKET-001.md` | Legal review context; copy status `LEGAL_REVIEW_PENDING` |
| Paresh Sharma | Decision owner — all decisions in this document are Paresh's |

---

## 2. Decision Table — OQ-SS-01 through OQ-SS-07

---

### OQ-SS-01 — Include `blockers` and `next_steps` in snapshot?

| Field | Value |
|---|---|
| **Question** | Should the snapshot include `blockers` and `next_steps` arrays from `computeTtpScore` output, or only `score`, `band`, and `factors`? |
| **Selected option** | **Option A — include `blockers` and `next_steps`** |
| **Decision** | Include the full advisory detail (`factors`, `blockers`, `next_steps`) from `computeTtpScore` output in a JSONB column named `score_detail_json`. |
| **Rationale** | `blockers` and `next_steps` are confirmed plain-English strings with no PII, no raw bureau data, no admin notes. They are deterministic outputs of the same pure function. Storing them ensures the snapshot is self-contained for dispute resolution: a reviewer does not need to re-derive blockers from factor points, and cannot do so accurately if scoring logic changes in v2. Archival completeness requires the full output. Storage cost is negligible (JSONB, ~100–200 bytes typical). |
| **Repo-truth evidence** | `blockers` confirmed: plain English only ("GST verification not submitted", "Risk tier 0 is ineligible", etc.). `next_steps` confirmed: plain English only ("Initiate TTP enrollment to improve readiness score", etc.). Neither array contains UUIDs, names, amounts, or raw bureau output. See audit §4.1. |

**Implementation consequence:**
- Persist full score detail in `score_detail_json` JSONB column (not `factors_json`).
- `score_detail_json` contains `{ factors: TradeTrustScoreFactor[], blockers: string[], next_steps: string[] }`.
- Do NOT include the `disclaimer` field from `TradeTrustScore` in `score_detail_json` (it is redundant with the hash columns).
- Do NOT include `score` or `band` in `score_detail_json` (they are stored as typed columns `score_value` and `score_band`).
- Do NOT store raw PII, raw GST verification data, raw bureau data, admin notes, or request payloads in any JSONB column.

---

### OQ-SS-02 — Which disclaimer constant(s) to hash?

| Field | Value |
|---|---|
| **Question** | Should `disclaimer_text_hash` use `TTP_DISCLAIMER_TEXT`, `SCORE_DISCLAIMER`, or both? |
| **Selected option** | **Option C — store both hashes in distinct fields** |
| **Decision** | Store two separate hash columns: `score_disclaimer_hash` and `route_disclaimer_hash`. |
| **Rationale** | The two constants serve distinct legal purposes and have materially different text (one adds "lending decision"). `SCORE_DISCLAIMER` is embedded in the `TradeTrustScore` object itself — what is frozen in the snapshot. `TTP_DISCLAIMER_TEXT` is the route-level advisory shown to tenants in API responses. Both are needed for complete copy traceability. Computing two SHA-256 hashes at write time is trivial (two `node:crypto` calls, no new dependency). |
| **Repo-truth evidence** | Two constants confirmed distinct: `SCORE_DISCLAIMER` is file-scoped in `ttpScore.service.ts`; `TTP_DISCLAIMER_TEXT` is exported from `ttp.constants.ts`. Different wording confirmed (see audit §4.2). |

**Implementation consequence:**
- Replace the single `disclaimer_text_hash` column with two columns:
  - `score_disclaimer_hash TEXT NOT NULL` — SHA-256 hex of `SCORE_DISCLAIMER` constant at snapshot time
  - `route_disclaimer_hash TEXT NOT NULL` — SHA-256 hex of `TTP_DISCLAIMER_TEXT` constant at snapshot time
- Compute both using `import { createHash } from 'node:crypto'` — no external dependency required.
- Do NOT store the full disclaimer text in snapshot rows — hash only.
- Legal status remains `LEGAL_REVIEW_PENDING`. These hashes record what was in effect at implementation time; if texts change after legal review, existing snapshots correctly carry hashes of the pre-review texts (snapshots are immutable).
- Tenant-facing score history endpoints remain blocked until legal sign-off explicitly clears them.

---

### OQ-SS-03 — `enrollment_id`: FK to `ttp_enrollment_logs.id` or `trade_id` only?

| Field | Value |
|---|---|
| **Question** | Should `enrollment_id` reference the `ttp_enrollment_logs.id` of the APPROVED log entry? Or store `trade_id` only? |
| **Selected option** | **Option A — store nullable FK to `ttp_enrollment_logs.id`** |
| **Decision** | `enrollment_id` is a nullable FK referencing `ttp_enrollment_logs.id`. |
| **Rationale** | The enrollment log ID IS available immediately after `adminReviewEnrollment()` via `result.latest_log_id`. FK provides point-in-time precision: a dispute reviewer can join directly to the exact enrollment log entry that was operative at snapshot time. `trade_id` alone requires a time-based lookup to identify the operative enrollment state — lossy if log entries span close timestamps. The extra query for `VPC_ISSUED` context is acceptable given `generateVpc()` already makes ~6 DB queries. |
| **Repo-truth evidence** | `newLog.id` available in `adminReviewEnrollment()` return value (`latest_log_id` in `AdminEnrollmentRecord`). `ttp_enrollment_logs` is append-only with no DELETE — FK will never be violated by downstream deletion. See audit §4.3. |

**Implementation consequence:**
- `enrollment_id UUID NULL` with FK constraint `REFERENCES public.ttp_enrollment_logs(id) ON UPDATE NO ACTION ON DELETE NO ACTION`.
- Population rules:
  - `ENROLLMENT_APPROVED` trigger: set `enrollment_id` = `result.latest_log_id` directly (available from service return value)
  - `VPC_ISSUED` trigger: optionally query most recent APPROVED enrollment log for the seller org (one extra query in snapshot service, not in `VpcService`)
  - `ADMIN_REVIEW_COMPLETE` trigger: `enrollment_id = NULL` (no enrollment log involved in eligibility assessment)
- Note: For `ADMIN_REVIEW_COMPLETE`, `trade_id` is also NULL (eligibility assessments are org-scoped, not trade-scoped). Both nullable fields are acceptable for this trigger.

---

### OQ-SS-04 — RLS: tenant-read policy or service-role-only?

| Field | Value |
|---|---|
| **Question** | Should `ttp_score_snapshots` be protected by Supabase RLS policies, or service-role-only access? |
| **Selected option** | **Option A — RLS with tenant-read policy** |
| **Decision** | Use the standard TexQtic TTP table RLS pattern: guard (restrictive), unified SELECT (tenant sees own org; admin sees all), admin-only INSERT, UPDATE block, DELETE block. |
| **Rationale** | Confirmed by repo-truth: both `ttp_eligibility_assessments` (§19) and `ttp_enrollment_logs` (§31) in the TTP foundation migration use an identical 5-policy RLS structure. Applying this pattern now costs nothing extra (SQL is template-derivable) and prevents a schema change when tenant-facing score history endpoints are approved in Slice 6. Service-role-only defers complexity to Slice 6 unnecessarily. |
| **Repo-truth evidence** | Migration §19 and §31 confirmed: guard AS RESTRICTIVE, select_unified AS PERMISSIVE (org_id = app.current_org_id()), insert AS PERMISSIVE (admin only), UPDATE USING (false), DELETE USING (false). GRANT SELECT, INSERT. See audit §4.4. |

**Implementation consequence:**
Five RLS policies for `ttp_score_snapshots`:

| Policy name | Type | Action | Purpose |
|---|---|---|---|
| `ttp_score_snapshots_guard` | RESTRICTIVE | ALL | Require org context OR admin OR bypass |
| `ttp_score_snapshots_select_unified` | PERMISSIVE | SELECT | Tenant reads own org; admin reads all |
| `ttp_score_snapshots_insert_unified` | PERMISSIVE | INSERT | Admin/bypass only |
| `ttp_score_snapshots_update_block` | PERMISSIVE | UPDATE USING (false) | Immutability enforcement Layer 2 |
| `ttp_score_snapshots_delete_block` | PERMISSIVE | DELETE USING (false) | Immutability enforcement Layer 2 |

`GRANT SELECT, INSERT ON public.ttp_score_snapshots TO texqtic_app`

- No tenant INSERT/UPDATE/DELETE permitted.
- Tenant-facing read endpoints remain gated on separate Paresh approval (Slice 6).
- RLS enabling the read path is not the same as opening a read endpoint — they are separate approvals.

---

### OQ-SS-05 — `PARTNER_TRANSMITTED` trigger: Wave 4 or Wave 2?

| Field | Value |
|---|---|
| **Question** | Is a `PARTNER_TRANSMITTED` trigger required at Wave 2 scope, or confirmed as Wave 4 only? |
| **Selected option** | **Option A — Wave 4 only, confirmed** |
| **Decision** | `PARTNER_TRANSMITTED` is a Wave 4 trigger only. No write path may be implemented in Wave 2. |
| **Rationale** | No partner transmission service exists in the codebase. `ALLOWED_VPC_TRANSITIONS` has no TRANSMITTED path. `TTP_TRANSMISSION_STATUS` enum is defined but unused. No partner contract is in place. Confirmed by repo-truth inspection. |
| **Repo-truth evidence** | No `PartnerTransmissionService`, no transition to `TRANSMITTED` in `vpc.service.ts`, `TTP_TRANSMISSION_STATUS` defined but unused. See audit §4.5. |

**Implementation consequence:**
- Include `'PARTNER_TRANSMITTED'` in the `trigger_event` CHECK constraint as a forward-declared valid value for schema compatibility:
  ```sql
  CHECK (trigger_event IN ('VPC_ISSUED', 'ENROLLMENT_APPROVED', 'ADMIN_REVIEW_COMPLETE', 'PARTNER_TRANSMITTED'))
  ```
- No write path, no route, no service method, no test for `PARTNER_TRANSMITTED` may be implemented in Wave 2 slices.
- No partner workflow, outbound HTTP, partner ack, or transmission behavior is authorized in Wave 2.
- Wave 4 will add the write path without requiring a schema migration to add the enum value.

---

### OQ-SS-06 — Recompute fresh at trigger time or accept precomputed score?

| Field | Value |
|---|---|
| **Question** | Should the score snapshot be computed from live state at trigger time, or should the triggering service pass an already-computed `TradeTrustScore` object? |
| **Selected option** | **Option A — recompute fresh at trigger time** |
| **Decision** | Recompute the score fresh after the triggering event completes, using current state. Use a post-commit sequential best-effort snapshot write. |
| **Rationale** | `computeTtpScore` is called ONLY in `TtpSummaryService.getTradeTtpSummary()`. At all three trigger points, 2–4 of the 7 score inputs are missing from the triggering service's context. Precomputed Option B would capture pre-event state: for `VPC_ISSUED`, the score is computed before the VPC exists (`vpc_readiness.is_active = false`), then the VPC is created, then the snapshot stores the pre-VPC score — systematically understating readiness. Recomputing after the event captures the authoritative post-event state. Post-commit sequential write avoids pooler deadlock risk (confirmed by `TtpSummaryService` `preloadedTrade` pattern). |
| **Repo-truth evidence** | `computeTtpScore` is called only in `TtpSummaryService`. None of the three trigger services (`generateVpc`, `adminReviewEnrollment`, `createAssessment`) use `$transaction` internally. See audit §4.6. |

**Implementation consequence:**
- A shared `assembleTtpScoreInput(db, sellerOrgId, tradeId)` helper should be extracted (or created fresh in the snapshot service) to query all 6 score inputs and assemble `TtpScoreInput`.
- The snapshot write is a **post-commit sequential call** at the route handler level (or thin orchestration layer), NOT inside the triggering service's DB operation:
  1. Route calls triggering service (e.g. `generateVpc()`) → success
  2. Route calls `snapshotService.captureSnapshot(...)` → assembles inputs, recomputes, writes snapshot row
- **Best-effort snapshot pattern:** If the snapshot write fails, the triggering event result is returned normally. The triggering event (VPC issuance, enrollment approval, eligibility assessment) is NOT rolled back due to a snapshot write failure.
- Snapshot write failures must be logged (Pino structured event) for future reconciliation. The mechanism for failure recovery is to be defined in the implementation slice.
- `computeTtpScore` is NOT modified by the snapshot service. It is called as-is.
- None of the triggering services (`VpcService`, `TtpEnrollmentService`, `TtpEligibilityService`) are responsible for building or triggering the snapshot write. Orchestration lives at the route level.

---

### OQ-SS-07 — `score_version` format: simple label or semantic version string?

| Field | Value |
|---|---|
| **Question** | What is the expected `score_version` value for the initial implementation? `'TTP_V1'` simple or semantic version string like `'TTP_V1.0.0'`? |
| **Selected option** | **Option A — `'TTP_V1'` simple string** |
| **Decision** | Use `'TTP_V1'` as the initial `score_version` value. |
| **Rationale** | Consistent with the project's ALL_CAPS_UNDERSCORE constant naming pattern. The TQ-12 approved v2 label `'TEXQTICSCORE_V2'` already establishes this style. CHECK constraint `IN ('TTP_V1', 'TEXQTICSCORE_V2')` is self-documenting. Semantic version strings require regex CHECK or application-level parsing; no semver convention exists in the codebase. Adding `'TTP_V1_1'` in the future requires only a safe forward-only ALTER. |
| **Repo-truth evidence** | No version annotation on `computeTtpScore`. Codebase constant naming is ALL_CAPS_UNDERSCORE. TQ-12 approved `'TEXQTICSCORE_V2'` matching this style. No semver dependency in server `package.json`. See audit §4.7. |

**Implementation consequence:**
- `score_version TEXT NOT NULL CHECK (score_version IN ('TTP_V1', 'TEXQTICSCORE_V2'))` in the schema.
- Initial implementation always writes `'TTP_V1'`.
- Do not use dot-version format (`'TTP_V1.0.0'`) in any implementation code or test.

---

## 3. Finalized Schema Implications

The following column-level consequences are finalized by the decisions above. These apply to
`ttp_score_snapshots` when Slice 1 SQL is written (after Paresh authorizes implementation).

### 3.1 Column changes from decisions

| Column | Decision source | Change from original design |
|---|---|---|
| `score_detail_json` | OQ-SS-01 | Rename from `factors_json`. Content expands to include `factors`, `blockers`, `next_steps` (no raw bureau, no PII, no admin notes). |
| `score_disclaimer_hash` | OQ-SS-02 | New column replacing `disclaimer_text_hash`. SHA-256 of `SCORE_DISCLAIMER` from `ttpScore.service.ts`. |
| `route_disclaimer_hash` | OQ-SS-02 | New column (additional). SHA-256 of `TTP_DISCLAIMER_TEXT` from `ttp.constants.ts`. |
| `enrollment_id` | OQ-SS-03 | Nullable FK to `ttp_enrollment_logs.id` (not just plain UUID). FK constraint added. |
| `score_version` | OQ-SS-07 | Initial value `'TTP_V1'` confirmed. CHECK(`score_version IN ('TTP_V1', 'TEXQTICSCORE_V2')`). |

### 3.2 RLS pattern finalized

Five-policy RLS block following the `ttp_eligibility_assessments` / `ttp_enrollment_logs` pattern:
- `ttp_score_snapshots_guard` — RESTRICTIVE, ALL
- `ttp_score_snapshots_select_unified` — PERMISSIVE, SELECT (tenant owns org; admin all)
- `ttp_score_snapshots_insert_unified` — PERMISSIVE, INSERT (admin/bypass only)
- `ttp_score_snapshots_update_block` — PERMISSIVE, UPDATE USING (false)
- `ttp_score_snapshots_delete_block` — PERMISSIVE, DELETE USING (false)
- `GRANT SELECT, INSERT TO texqtic_app`

### 3.3 `trigger_event` CHECK constraint

```sql
CHECK (trigger_event IN ('VPC_ISSUED', 'ENROLLMENT_APPROVED', 'ADMIN_REVIEW_COMPLETE', 'PARTNER_TRANSMITTED'))
```

`PARTNER_TRANSMITTED` is forward-declared; no Wave 2 write path may be opened for it.

---

## 4. Finalized Implementation Behavior

The following behavior decisions apply to the future `TtpScoreSnapshotService` and all
implementation slices. These are design-level decisions, not implementation — no code is
written by this document.

| Behavior | Decision |
|---|---|
| Score computation model | Recompute fresh after triggering event completes (Option A) |
| Snapshot write timing | Post-commit sequential write — NOT inside the triggering transaction |
| Snapshot write failure handling | Best-effort: log failure (Pino structured event), return triggering event result normally, do NOT roll back triggering event |
| `computeTtpScore` modification | None — pure function called as-is |
| Score input assembly | Shared helper `assembleTtpScoreInput(db, sellerOrgId, tradeId)` to be created in snapshot service (or extracted from `TtpSummaryService`) |
| Orchestration location | Route handler (or thin orchestration layer at route level) — NOT inside triggering service methods |
| VPC triggering service responsibility | `VpcService.generateVpc` writes VPC row only; does not call snapshot service |
| Enrollment triggering service responsibility | `TtpEnrollmentService.adminReviewEnrollment` writes enrollment log only; does not call snapshot service |
| Eligibility triggering service responsibility | `TtpEligibilityService.createAssessment` writes assessment row only; does not call snapshot service |
| Hash computation | `import { createHash } from 'node:crypto'` — no new dependency |

---

## 5. Legal and Copy Boundary

| Item | Status |
|---|---|
| `SCORE_DISCLAIMER` text | `LEGAL_REVIEW_PENDING` — unchanged. `score_disclaimer_hash` column records what was in effect at implementation time. |
| `TTP_DISCLAIMER_TEXT` text | `LEGAL_REVIEW_PENDING` — unchanged. `route_disclaimer_hash` column records what was in effect at implementation time. |
| Snapshot write slices (Slices 1–5) | May proceed without public copy changes if Paresh authorizes implementation. Write path does not expose copy to tenants. |
| Tenant-facing score-history endpoints (Slice 6) | **BLOCKED** until legal/public-surface review is explicitly cleared by Paresh. `LEGAL_REVIEW_PENDING` must be resolved before any tenant read endpoint for score history is authorized. |
| Advisory-only invariant | Applies unconditionally to all snapshot consumers and read endpoints: no credit score, no financing approval, no payment guarantee, no lending decision, no partner commitment. |

---

## 6. Remaining Blockers Before Implementation

### Hard blockers — none for design finalization

No hard blockers prevent recording these decisions. The design artifact updates (Part B of this
governance unit) can proceed immediately.

### Implementation gate (Paresh decision required)

| Gate | Condition |
|---|---|
| Open `TTP-SCORE-SNAPSHOT-SQL-RLS-001` (or equivalent Slice 1 prompt) | Requires explicit Paresh authorization of the implementation slice. These decisions are recorded but no implementation slice is opened by this document. |
| Open subsequent slices (2–5) | Each requires separate Paresh authorization referencing this decision record and the finalized design artifact. |

### Legal gate (tenant-facing read path only)

| Gate | Condition |
|---|---|
| Slice 6 (admin/tenant read endpoints) | Blocked until Paresh obtains legal sign-off on `TTP_DISCLAIMER_TEXT` and `SCORE_DISCLAIMER` texts. `LEGAL_REVIEW_PENDING` throughout. |

### Partner gate (Wave 4)

| Gate | Condition |
|---|---|
| `PARTNER_TRANSMITTED` write path | Blocked until Wave 4. Requires `TTP-PARTNER-WORKFLOW-DESIGN-001` approved AND partner contract signed. |

---

## 7. Final Decision

```
TTP_SCORE_SNAPSHOT_DESIGN_DECISIONS_001_RECORDED
```

**Authority:** Paresh Sharma — TexQtic founder / operator  
**Date:** 2026-05-05  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Code changes:** None  
**Schema changes:** None  
**Implementation authorized:** No — decisions are recorded; implementation requires Paresh to separately open implementation slice  
**Legal status:** `LEGAL_REVIEW_PENDING` — unchanged  
**Next candidate implementation slice:** `TTP-SCORE-SNAPSHOT-SQL-RLS-001` (or equivalent Slice 1 prompt), pending explicit Paresh authorization  
**This document does not open any implementation slice.**

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*This document records design decisions only. No implementation is authorized by this record.*  
*All implementation slices require a separate Paresh-approved implementation prompt referencing*  
*both `governance/TTP-SCORE-SNAPSHOT-DESIGN-001.md` and this decision record.*
