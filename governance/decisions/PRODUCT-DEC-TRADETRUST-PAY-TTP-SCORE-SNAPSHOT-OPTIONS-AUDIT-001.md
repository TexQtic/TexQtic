# PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-OPTIONS-AUDIT-001

**Decision ID:** PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-OPTIONS-AUDIT-001  
**Type:** Options Audit — Repo-Truth Verification + Recommendation  
**Status:** `TTP_SCORE_SNAPSHOT_OPTIONS_AUDIT_001_READY_FOR_PARESH_DECISION`  
**Date produced:** 2026-06  
**Produced by:** GitHub Copilot — governance-only, no code changes  
**Authoritative decision:** Paresh Patel (TexQtic founder / operator)

**References:**
- `governance/TTP-SCORE-SNAPSHOT-DESIGN-001.md` — design artifact under review
- `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` — TQ-06/07/12 approvals
- `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-REPO-TRUTH-AUDIT-001.md`
- `server/src/services/ttpScore.service.ts` — score computation service
- `server/src/services/ttpSummary.service.ts` — score input assembly
- `server/src/services/vpc.service.ts` — VPC_ISSUED trigger candidate
- `server/src/services/ttpEnrollment.service.ts` — ENROLLMENT_APPROVED trigger candidate
- `server/src/services/ttpEligibility.service.ts` — ADMIN_REVIEW_COMPLETE trigger candidate
- `server/src/ttp/ttp.constants.ts` — disclaimer constants, state enums
- `server/prisma/migrations/20260515120000_ttp_foundation_001/migration.sql` — RLS pattern reference
- `server/src/db/withDbContext.ts` — transaction wrapping pattern

---

## 1. Document Scope and Invariants

This document audits the **seven open questions (OQ-SS-01 through OQ-SS-07)** in §13 of
`governance/TTP-SCORE-SNAPSHOT-DESIGN-001.md`. For each question it provides:

1. Repo-truth evidence gathered by reading the actual source files
2. Assessment of each option against that evidence
3. A concrete recommendation with rationale

**Scope invariants — unconditionally preserved by this document:**

| Invariant | Status |
|---|---|
| `ttp_enabled = false` | UNCHANGED |
| No application code changes | CONFIRMED — zero code files touched |
| No schema, SQL, migration, or Prisma changes | CONFIRMED |
| No activation | CONFIRMED |
| `computeTtpScore` not modified | CONFIRMED |
| `TTP-SCORE-SNAPSHOT-DESIGN-001.md` not modified | CONFIRMED |
| Legal status `LEGAL_REVIEW_PENDING` | UNCHANGED |
| `TTP-SCORE-SNAPSHOT-IMPL-001` not opened | CONFIRMED |

---

## 2. Repo-Truth Inspection Summary

The following source files were read in full (or to the relevant section) for this audit.

| File | Lines read | Purpose |
|---|---|---|
| `server/src/services/ttpScore.service.ts` | Full (1–420) | Score output shape, disclaimer constant, factor content |
| `server/src/ttp/ttp.constants.ts` | Full (1–360) | `TTP_DISCLAIMER_TEXT`, all enum constants |
| `server/src/services/ttpSummary.service.ts` | Full | Score input assembly pattern, `computeTtpScore` call site |
| `server/src/services/vpc.service.ts` | Full (1–510) | `generateVpc()` transaction pattern, data available at VPC creation |
| `server/src/services/ttpEnrollment.service.ts` | Full (1–530) | `adminReviewEnrollment()` pattern, enrollment log ID availability |
| `server/src/services/ttpEligibility.service.ts` | Full (1–360) | `createAssessment()` pattern, org_id availability |
| `server/src/db/withDbContext.ts` | Full (1–50) | `prisma.$transaction` + `withDbContext` pattern |
| `server/prisma/migrations/20260515120000_ttp_foundation_001/migration.sql` | §19, §31 (631–1000) | RLS policy pattern on existing TTP tables |
| `governance/TTP-SCORE-SNAPSHOT-DESIGN-001.md` | §5, §13, §14 | Design assumptions and open questions |

---

## 3. Design Assumption Validation Matrix

| Assumption in design doc | Verdict | Evidence |
|---|---|---|
| `computeTtpScore` is a pure function, no DB access | CONFIRMED | Service reads only input struct; returns `TradeTrustScore` |
| `TradeTrustScore.disclaimer` is set from a file-scoped `SCORE_DISCLAIMER` constant | CONFIRMED | `ttpScore.service.ts` line ~102: `const SCORE_DISCLAIMER = '...'` |
| `TTP_DISCLAIMER_TEXT` is a separate exported constant with different text | CONFIRMED | `ttp.constants.ts` — different wording; exported; used by routes and summary service |
| `ttp_enrollment_logs.id` is available after `adminReviewEnrollment()` | CONFIRMED | `adminReviewEnrollment()` returns `AdminEnrollmentRecord` which contains `latest_log_id` (the new log entry ID) |
| `verified_payable_certificates.id` is available after `generateVpc()` | CONFIRMED | `generateVpc()` returns `AdminVpcRecord` which contains `id` |
| `ttp_eligibility_assessments.id` is available after `createAssessment()` | CONFIRMED | `createAssessment()` returns `TtpEligibilityAssessmentRecord` which contains `id` |
| None of the three triggering services internally use `$transaction` | CONFIRMED | All three services do sequential direct DB calls on `this.db`; no `$transaction` wrapper inside service methods |
| `withDbContext` wraps route-level operations in `prisma.$transaction` | CONFIRMED | `withDbContext.ts`: `prisma.$transaction(async tx => { ... SET LOCAL ROLE ... })` |
| Existing TTP tables (`ttp_eligibility_assessments`, `ttp_enrollment_logs`) use the guard + unified-SELECT + admin-only-INSERT RLS pattern | CONFIRMED | Migration §19 and §31 confirmed both tables follow identical three-policy structure |
| `blockers` and `next_steps` in `TradeTrustScore` contain NO PII, NO raw bureau data | CONFIRMED | All strings are plain English advisory text (e.g. "GST verification not submitted", "Initiate TTP enrollment to improve readiness score") — no UUIDs, no names, no scores, no external data |
| `TradeTrustScoreFactor` shape: `{key, label, points_awarded, points_possible, status, explanation}` | CONFIRMED | Interface in `ttpScore.service.ts`; all fields are primitive safe types |
| `partner_routing_stubs` table exists but partner transmission service does not | CONFIRMED | `ttpSummary.service.ts` queries the table; no `PartnerRoutingService` or transmission service found |
| `TTP_VPC_STATE.TRANSMITTED` exists as a constant but no transition to it is implemented | CONFIRMED | `ALLOWED_VPC_TRANSITIONS` in `vpc.service.ts` only covers ACTIVE→{ROUTING_READY, VOIDED, EXPIRED} and ROUTING_READY→{VOIDED, EXPIRED}; no TRANSMITTED path |
| `ttp_score_snapshots` table does not exist | CONFIRMED | No reference in schema, no service, no test, no route |

---

## 4. Open Question Analysis

---

### OQ-SS-01 — Include `blockers` + `next_steps` or only `score` / `band` / `factors`?

**Question from §13:**
Should the snapshot include `blockers` and `next_steps` arrays from `computeTtpScore` output,
or only `score`, `band`, and `factors`?

#### 4.1.1 Repo-truth findings

`computeTtpScore` returns a `TradeTrustScore` object with:

```typescript
{
  score: number;              // 0–100
  band: 'READY' | 'NEAR_READY' | 'NEEDS_REVIEW' | 'NOT_READY';
  factors: TradeTrustScoreFactor[];  // 7 factors
  blockers: string[];         // plain English blockers
  next_steps: string[];       // plain English guidance
  disclaimer: string;         // SCORE_DISCLAIMER constant
}
```

**`blockers` confirmed content (all plain English, no PII):**
- `"GST verification not submitted"`
- `"Risk tier 0 is ineligible — a valid tier (1, 2, or 3) is required"`
- `"TTP eligibility assessment has expired"`
- `"Invoice is not verified"`
- `"No Verified Payable Certificate issued for this trade"`

**`next_steps` confirmed content (all plain English, no PII):**
- `"Initiate TTP enrollment to improve readiness score"`
- `"Partner routing stub will be generated after VPC reaches ROUTING_READY state"`
- `"Submit or reinstate TTP enrollment to improve readiness score"`

Neither array contains UUIDs, org names, personal data, raw bureau output, admin notes,
or financial amounts. Both arrays are pure advisory text strings generated deterministically
from the same score inputs as `factors`.

#### 4.1.2 Option assessment

| Option | Pros | Cons |
|---|---|---|
| **A — Include `blockers` + `next_steps`** | Full audit context: a dispute reviewer sees *why* the score was what it was, not just the number. Safe to persist (no PII). Faithful to `TradeTrustScore` output shape. | Minor storage overhead (~100–200 bytes per snapshot). |
| **B — `score`, `band`, `factors` only** | Leaner snapshot. Forced reconstruction of blocker logic from factors is possible at read time. | Requires reader to re-derive blockers from factors — lossy if scoring logic changes in v2. Audit trail is less self-contained. |

#### 4.1.3 Recommendation

**RECOMMEND: Option A (include `blockers` and `next_steps`).**

Rationale:
- The primary purpose of the snapshot is dispute resolution and lender evidence. A reviewer examining
  a frozen score needs to know not just the number and factors but the human-readable explanation
  of what was blocking the score at that moment.
- `blockers` and `next_steps` are deterministic outputs of the same pure function; storing them
  adds no new data surface or PII risk.
- If `computeTtpScore` logic changes in v2 (`score_version = 'TEXQTICSCORE_V2'`), the v1 snapshot
  will no longer be re-derivable from factors alone; archival completeness requires storing the
  full output.
- Storage cost is negligible (JSONB compression; typical snapshot <2 KB total).

**Implementation note:** Store `blockers` and `next_steps` inside `factors_json` JSONB as a
top-level JSON object containing `{factors: [...], blockers: [...], next_steps: [...]}` rather
than as separate columns. This keeps the schema column count stable and allows the full
`TradeTrustScore` output to be serialized faithfully.

---

### OQ-SS-02 — `disclaimer_text_hash`: which constant to hash?

**Question from §13:**
Should `disclaimer_text_hash` use the exported `TTP_DISCLAIMER_TEXT` constant or the file-scoped
`SCORE_DISCLAIMER` constant? Options: A (TTP_DISCLAIMER_TEXT), B (SCORE_DISCLAIMER), C (both).

#### 4.2.1 Repo-truth findings — two distinct disclaimer constants confirmed

**`SCORE_DISCLAIMER`** (file-scoped, NOT exported, in `server/src/services/ttpScore.service.ts`):
```
'TradeTrust Score is an advisory readiness indicator only. It is not a credit score,
payment guarantee, financing approval, or partner commitment.'
```
- Used as the `disclaimer` field in the `TradeTrustScore` return value
- Available at the point of `computeTtpScore` execution
- NOT importable from other modules (file-scoped `const`)

**`TTP_DISCLAIMER_TEXT`** (exported, in `server/src/ttp/ttp.constants.ts`):
```
'TradeTrust Pay readiness signals are informational and advisory only. They are not a
credit score, financing approval, payment guarantee, lending decision, or partner
commitment.'
```
- Used as `advisory_disclaimer` in `TradeTtpSummary` (summary service response)
- Used as `advisory_disclaimer` in `TtpEnrollmentRecord` (enrollment service response)
- The disclaimer text shown to tenants in route responses
- Importable and referenced across multiple service files

**Key difference:** The two texts are semantically similar but materially different: `TTP_DISCLAIMER_TEXT`
adds "lending decision" which `SCORE_DISCLAIMER` does not contain. Both are advisory-only.

**Use context:**
- The *score object itself* carries `SCORE_DISCLAIMER` as its `disclaimer` field
- The *route/summary response* carries `TTP_DISCLAIMER_TEXT` as `advisory_disclaimer`
- A snapshot is a frozen copy of the score object — so the score-level disclaimer is `SCORE_DISCLAIMER`
- But the *tenant-facing context* at the time of the trigger uses `TTP_DISCLAIMER_TEXT`

#### 4.2.2 Option assessment

| Option | Pros | Cons |
|---|---|---|
| **A — Hash `TTP_DISCLAIMER_TEXT` only** | The exported constant is what tenants see in routes. Consistent with what's shown in UI. | The snapshot captures the score object, which internally uses `SCORE_DISCLAIMER` — Option A creates a mismatch between what's hashed and what's stored in `factors_json`. |
| **B — Hash `SCORE_DISCLAIMER` only** | The snapshot IS a `TradeTrustScore` — `SCORE_DISCLAIMER` is its embedded disclaimer field. Faithful to the score object semantics. | Does not record the route-level disclaimer (`TTP_DISCLAIMER_TEXT`) that tenants actually saw. Future legal review might want both. |
| **C — Hash both, distinct field names** | Complete traceability: proves both the score-level and route-level disclaimers were in effect. Future-proof if texts diverge further. | Two hash columns adds schema complexity. Requires naming both fields clearly. |

#### 4.2.3 Recommendation

**RECOMMEND: Option C (both hashes, with distinct field names).**

Proposed field names for the `ttp_score_snapshots` schema:

| Column | Hashes | Source |
|---|---|---|
| `score_disclaimer_hash` | `SCORE_DISCLAIMER` from `ttpScore.service.ts` | The disclaimer in the `TradeTrustScore` object stored in the snapshot |
| `route_disclaimer_hash` | `TTP_DISCLAIMER_TEXT` from `ttp.constants.ts` | The disclaimer shown in the route response to the tenant |

Rationale:
- The two texts serve different legal purposes: one is the score-level advisory, one is the
  route-level product disclaimer. Both are needed for complete copy traceability.
- The hash values are derived from string constants that rarely change. Computing both at write
  time is trivial (two `crypto.createHash('sha256').update(text).digest('hex')` calls).
- If Paresh decides simplicity is preferred over completeness, Option B (`SCORE_DISCLAIMER`
  only) is acceptable as a fallback, since that is what is semantically contained in the snapshot.

**Legal gate reminder:** This column design must not be finalized until legal counsel has
reviewed both disclaimer texts. Status remains `LEGAL_REVIEW_PENDING`. Do not implement
`disclaimer_text_hash` columns before legal sign-off.

---

### OQ-SS-03 — `enrollment_id`: reference `ttp_enrollment_logs.id` or `trade_id` only?

**Question from §13:**
Should `enrollment_id` reference the `ttp_enrollment_logs.id` of the APPROVED log entry,
or store `trade_id` only?

#### 4.3.1 Repo-truth findings

**`ttp_enrollment_logs.id` availability:**
- `adminReviewEnrollment()` in `TtpEnrollmentService` returns `AdminEnrollmentRecord` which
  includes `latest_log_id: string | null` — this IS the UUID of the newly created log entry
- For `ENROLLMENT_APPROVED` trigger: the log ID is directly available as `result.latest_log_id`
  immediately after calling `adminReviewEnrollment()`
- For `VPC_ISSUED` trigger: the enrollment log ID is NOT already loaded in `generateVpc()` context.
  Obtaining it would require one extra query (`getLatestEnrollmentLog(sellerOrgId)`)
- For `ADMIN_REVIEW_COMPLETE` trigger (eligibility assessment): no enrollment log is relevant;
  field would be NULL

**`trade_id` availability:**
- All three triggering services have `trade_id` already loaded (invoice.trade_id in `generateVpc()`,
  trade.id in `adminReviewEnrollment()`, and assessment is org-scoped not trade-scoped in
  `createAssessment()` — trade_id would require an additional query for eligibility trigger)

**Schema context:**
- The design doc already has `trade_id UUID YES FK → trades.id` as a separate column
- `enrollment_id` in the design is an ADDITIONAL column, nullable, for enrollment log reference

#### 4.3.2 Option assessment

| Option | Pros | Cons |
|---|---|---|
| **A — Store `ttp_enrollment_logs.id`** | Point-in-time precision: links the snapshot to the exact log entry that was the operative enrollment state. Enables direct join for audit. | Requires extra query in `VPC_ISSUED` trigger context (one `findMany` on `ttp_enrollment_logs` for the seller org). NULL for `ADMIN_REVIEW_COMPLETE`. |
| **B — `trade_id` only** | `trade_id` is already a separate FK column in the schema; avoids extra query. | `trade_id` alone cannot identify which enrollment log entry was operative at snapshot time. Audit join requires a time-based lookup. |

#### 4.3.3 Recommendation

**RECOMMEND: Option A (store `ttp_enrollment_logs.id`) — nullable.**

Rules for population:
- `ENROLLMENT_APPROVED`: set `enrollment_id` = the new log entry `id` (directly available from
  `adminReviewEnrollment()` return value `latest_log_id`)
- `VPC_ISSUED`: optionally populate with the most recent `APPROVED` enrollment log for the seller org
  (one extra query; acceptable because VPC generation already makes ~6 DB queries for gate checks)
- `ADMIN_REVIEW_COMPLETE` (eligibility): set `enrollment_id = NULL` (no enrollment log involved)

Rationale: The snapshot's value for dispute resolution increases significantly when the exact
enrollment state at trigger time is directly traceable via FK, not just reconstructible by
timestamp. The extra query cost in `generateVpc()` is acceptable given its existing query
volume.

---

### OQ-SS-04 — RLS: tenant-read policies or service-role-only?

**Question from §13:**
Should `ttp_score_snapshots` be protected by Supabase RLS policies, or service-role-only access?

#### 4.4.1 Repo-truth findings — confirmed RLS pattern on existing TTP tables

Both `ttp_eligibility_assessments` (§19) and `ttp_enrollment_logs` (§31) in
`migration.sql` use identical three-policy RLS structure:

```sql
-- 1. RESTRICTIVE guard (all operations)
CREATE POLICY ..._guard ON public.<table> AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context() OR current_setting('app.is_admin', true) = 'true' OR app.bypass_enabled()
);

-- 2. PERMISSIVE SELECT (tenants see own org, admins see all)
CREATE POLICY ..._select_unified ON public.<table> AS PERMISSIVE FOR SELECT TO texqtic_app USING (
  (app.require_org_context() AND org_id = app.current_org_id())
  OR current_setting('app.is_admin', true) = 'true' OR app.bypass_enabled()
);

-- 3. PERMISSIVE INSERT (admin/bypass only)
CREATE POLICY ..._insert_unified ON public.<table> AS PERMISSIVE FOR INSERT TO texqtic_app WITH CHECK (
  current_setting('app.is_admin', true) = 'true' OR app.bypass_enabled()
);

GRANT SELECT, INSERT ON public.<table> TO texqtic_app;
```

Additionally, `ttp_enrollment_logs` adds explicit UPDATE and DELETE block policies
(append-only enforcement Layer 3).

`ttp_score_snapshots` is structurally identical to these tables:
- org_id scoped
- append-only
- admin writes only
- tenant read of own org data

#### 4.4.2 Option assessment

| Option | Pros | Cons |
|---|---|---|
| **A — RLS with tenant read policy** | Consistent with established TTP table pattern. Defense-in-depth (service-layer scoping + RLS). Enables future tenant-facing score history endpoints without schema change. | Adds one more RLS policy block to maintain. |
| **B — Service-role-only, no tenant read** | Simpler initial security model if no tenant-read endpoint is planned in Wave 2. | Inconsistent with existing TTP tables. Tenant-facing score history (Wave 2 Slice 6) would require policy addition or connection strategy change later. |

#### 4.4.3 Recommendation

**RECOMMEND: Option A (RLS with tenant-read policy, following the existing TTP table pattern).**

Proposed RLS structure for `ttp_score_snapshots`:
1. `ttp_score_snapshots_guard` — RESTRICTIVE, FOR ALL
2. `ttp_score_snapshots_select_unified` — PERMISSIVE, FOR SELECT (tenant sees own org; admin sees all)
3. `ttp_score_snapshots_insert_unified` — PERMISSIVE, FOR INSERT (admin/bypass only)
4. `ttp_score_snapshots_update_block` — PERMISSIVE, FOR UPDATE USING (false) — immutability
5. `ttp_score_snapshots_delete_block` — PERMISSIVE, FOR DELETE USING (false) — immutability
6. `GRANT SELECT, INSERT ON public.ttp_score_snapshots TO texqtic_app`

Rationale: Applying the established pattern now costs nothing extra (SQL is template-derivable
from existing policies) and prevents a schema change to enable tenant read endpoints in Slice 6.
Service-role-only (Option B) is a false simplification — it defers complexity to Slice 6.

---

### OQ-SS-05 — `PARTNER_TRANSMITTED` trigger: Wave 4 or Wave 2?

**Question from §13:**
Is a `PARTNER_TRANSMITTED` trigger required at Wave 2 scope, or confirmed as Wave 4 only?

#### 4.5.1 Repo-truth findings

- **No partner transmission service** found in the codebase. No `PartnerTransmissionService`,
  `PartnerRoutingService`, or equivalent class exists.
- **`ALLOWED_VPC_TRANSITIONS`** in `vpc.service.ts` (Slice 5): only covers
  `ACTIVE → {ROUTING_READY, VOIDED, EXPIRED}` and `ROUTING_READY → {VOIDED, EXPIRED}`.
  No transition to `TRANSMITTED` is implemented.
- **`partner_routing_stubs`** table exists and is queried by `TtpSummaryService`, but no service
  writes to it in the current codebase. The table appears to have been created by the TTP
  foundation migration but has no service integration yet.
- **`TTP_TRANSMISSION_STATUS`** constant exists (`PENDING`, `TRANSMITTED`, `FAILED`) — the enum
  is defined but unused by any service.
- `TTP_VPC_STATE.TRANSMITTED` exists in constants but no code transitions a VPC to this state.

#### 4.5.2 Recommendation

**RECOMMEND: Option A (Wave 4 only — confirmed).**

No implementation gap: the `PARTNER_TRANSMITTED` enum value should be included in the
`trigger_event` CHECK constraint at table creation (Wave 2 Slice 1 / Slice 2) as a forward-declared
valid value, but the write path for it must NOT be opened until Wave 4.

Proposed `trigger_event` CHECK constraint:
```sql
CHECK (trigger_event IN ('VPC_ISSUED', 'ENROLLMENT_APPROVED', 'ADMIN_REVIEW_COMPLETE', 'PARTNER_TRANSMITTED'))
```

This allows the value to exist in the enum for schema compatibility without activating
the write path. Wave 4 will add the write path without a schema migration.

---

### OQ-SS-06 — Recompute fresh at trigger time or accept precomputed `TradeTrustScore`?

**Question from §13:**
Should the score snapshot be computed from live state at trigger time (calling `computeTtpScore`
fresh), or should the triggering service pass the already-computed `TradeTrustScore` object?

#### 4.6.1 Repo-truth findings

**Where `computeTtpScore` is currently called:**
`TtpSummaryService.getTradeTtpSummary()` is the ONLY call site. It assembles all 7 score
inputs (GST, eligibility, invoice, VPC, routing, enrollment state) via 6 sequential DB queries
and calls `computeTtpScore` with the assembled `TtpScoreInput`.

**Data available at each trigger point:**

| Score Input | `generateVpc()` | `adminReviewEnrollment()` | `createAssessment()` |
|---|---|---|---|
| `gst_readiness` | ✅ loaded (gate 5) | ❌ not loaded | ❌ not loaded |
| `eligibility_readiness` | ✅ loaded (gates 6–9) | ❌ not loaded (gates are expiry-only) | ✅ loaded (the new record) |
| `invoice_readiness` | ✅ loaded (gate 1–2) | ❌ not loaded | ❌ not loaded |
| `vpc_readiness` | ✅ known (just created, state=ACTIVE) | ❌ not loaded | ❌ not loaded |
| `routing_readiness` | ❌ not loaded | ❌ not loaded | ❌ not loaded |
| `enrollment_state` | ❌ not loaded | ✅ loaded (the new log state) | ❌ not loaded |

For ALL three trigger services, at least 2–4 score inputs are missing and would require
additional DB queries.

**Option A (recompute fresh) — implementation path:**
A new `TtpScoreSnapshotService.captureSnapshot(orgId, tradeId, triggerEvent, ...)` method would
need to assemble the complete `TtpScoreInput` by re-querying all 6 inputs (identical to what
`TtpSummaryService` does), then call `computeTtpScore`, then write the snapshot row.

**Option B (accept precomputed) — implementation path:**
The route handler would first call `getTradeTtpSummary()` (which computes the score), extract
the `TradeTrustScore`, then call `generateVpc()` / `adminReviewEnrollment()`, then call
`captureSnapshot(precomputedScore, ...)`.

**Critical timing concern for Option B:**
The precomputed score is assembled BEFORE the triggering event. For `VPC_ISSUED`, the score
is computed when there is no VPC yet (`vpc_readiness.found = false`, `vpc_readiness.is_active = false`).
After `generateVpc()` succeeds, `vpc_readiness.is_active = true` and the score changes.
Storing a score that was computed before the VPC exists as the "score at VPC issuance" would
produce a LOWER score than what would be computed post-creation — factually misleading.

For `ENROLLMENT_APPROVED`, the precomputed score would reflect pre-approval enrollment state.
Post-approval, enrollment state changes from REQUESTED → APPROVED, which may affect score.

#### 4.6.2 Option assessment

| Option | Pros | Cons |
|---|---|---|
| **A — Recompute fresh at trigger time** | Authoritative: captures the state of the world AFTER the triggering event completes. Score reflects the new state (e.g., VPC now exists). | Requires ~4–6 extra DB queries per snapshot write. Slightly higher latency for triggering operations. |
| **B — Accept precomputed `TradeTrustScore`** | Zero extra queries (score already computed). Avoids coupling snapshot service to DB. | Score was computed BEFORE the event — for VPC_ISSUED, captures pre-VPC score (systematically understates readiness). For ENROLLMENT_APPROVED, captures pre-approval score. The snapshot would not reflect the actual state at the moment it is labeled. |

#### 4.6.3 Recommendation

**RECOMMEND: Option A (recompute fresh at trigger time).**

However, to avoid duplicating the full input assembly logic from `TtpSummaryService`, recommend
implementing a shared private helper `assembleTtpScoreInput(db, sellerOrgId, tradeId)` that:
1. Queries the 6 required data points (GST, eligibility, invoice, VPC, routing, enrollment)
2. Returns a `TtpScoreInput` struct
3. Is used by BOTH `TtpSummaryService.getTradeTtpSummary()` and the new snapshot service

The triggering services (`generateVpc`, `adminReviewEnrollment`, `createAssessment`) do NOT
themselves call the snapshot writer. Instead, the route handler (or a thin orchestration layer
at the route level) calls: `triggerService.execute()` → then → `snapshotService.capture()`.
This preserves separation of concerns and allows the snapshot write to occur after the
triggering DB write confirms successfully.

**Transaction boundary:** The snapshot write should be in a SEPARATE sequential call after the
triggering operation, NOT inside the same `$transaction` as the triggering DB write. Rationale:
`prisma.$transaction` on Supabase's pooler can deadlock with nested queries on `connection_limit=1`
connections (confirmed by `TtpSummaryService` comment explaining `preloadedTrade` pattern). A
post-commit snapshot write is acceptable — if the snapshot write fails, the triggering event
remains recorded correctly; only the snapshot is missing, which is recoverable.

---

### OQ-SS-07 — `score_version`: `'TTP_V1'` or semantic version string?

**Question from §13:**
What is the expected `score_version` value for the initial implementation?
`'TTP_V1'` simple (Option A) or semantic version string e.g. `'TTP_V1.0.0'` (Option B)?

#### 4.7.1 Repo-truth findings

- No version annotation on `computeTtpScore` function
- No versioning convention file in `server/src/ttp/` or elsewhere in codebase
- Constants in `ttp.constants.ts` follow SHORT_ALL_CAPS pattern: `TTP_VPC_STATE.ACTIVE`,
  `TTP_ENROLLMENT_STATE.REQUESTED`, `TTP_RISK_TIER.LOW`, etc. — not dot-version format
- TQ-12 approval in `PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md`:
  future value is `'TEXQTICSCORE_V2'` — also a simple label, not a semantic version string
- No `semver` or version-parsing dependency in server `package.json` context

#### 4.7.2 Option assessment

| Option | Pros | Cons |
|---|---|---|
| **A — `'TTP_V1'` simple string** | Consistent with enum-like constants pattern in codebase. `CHECK (score_version IN ('TTP_V1', 'TEXQTICSCORE_V2'))` is clean. No semver parsing needed. Extensible: add `'TTP_V1_1'` if minor changes warrant. | Cannot express micro-patches in the version string without adding new enum values. |
| **B — Semantic version e.g. `'TTP_V1.0.0'`** | Finer-grained tracing of scoring logic changes within v1. | Inconsistent with codebase constant naming style. Requires regex CHECK constraint or application-level validation instead of clean IN-list. Future consumers must parse strings. Complexity with no current benefit. |

#### 4.7.3 Recommendation

**RECOMMEND: Option A (`'TTP_V1'` simple string).**

Rationale:
- Consistent with the project's ALL_CAPS_UNDERSCORE constant naming pattern
- The CHECK constraint `IN ('TTP_V1', 'TEXQTICSCORE_V2')` is clean and self-documenting
- Adding `'TTP_V1_1'` or `'TTP_V1_2'` in the future requires only a schema ALTER (adding
  a value to the CHECK list), which is a safe forward-only migration
- The TQ-12 approved naming convention already established `'TEXQTICSCORE_V2'` as the v2 label —
  matching that style for `'TTP_V1'` is natural

---

## 5. Additional Audit Findings

The following findings were identified during the repo-truth inspection but were not part of
the original seven open questions. They are non-blocking recommendations for consideration
during `TTP-SCORE-SNAPSHOT-IMPL-001`.

### Finding AF-01: Schema: `factors_json` column should store full `TradeTrustScore` sub-object

**Current design doc intent:** `factors_json` stores `TradeTrustScoreFactor[]` (just the factors array).

**Audit finding:** Given the recommendation to include `blockers` and `next_steps` (OQ-SS-01, Option A),
and to maintain a faithful frozen representation of the `TradeTrustScore` output, the `factors_json`
column should be defined to store the full score output sub-object:
```json
{
  "score": 70,
  "band": "NEAR_READY",
  "factors": [...],
  "blockers": [...],
  "next_steps": [...]
}
```
Note: `disclaimer` field from `TradeTrustScore` should NOT be stored in `factors_json` (it is
redundant with `score_disclaimer_hash`). The `score` and `band` values are stored separately
as typed columns (`score_value`, `score_band`). Only `factors`, `blockers`, `next_steps` need
to be in JSONB.

Rename `factors_json` → `score_detail_json` in the implementation SQL to reflect the fuller content.

### Finding AF-02: Transaction boundary — use post-commit sequential write, not nested transaction

**Finding:** None of the three triggering services (`generateVpc`, `adminReviewEnrollment`,
`createAssessment`) use `$transaction` internally. They rely on the route-level `withDbContext`
transaction for consistency. `TtpSummaryService` explicitly documents a `preloadedTrade` pattern
to avoid deadlocks with `connection_limit=1` poolers.

**Recommendation:** Do NOT wrap the snapshot write inside the triggering service's DB operation.
Instead, the route handler should:
1. Call the triggering service (VPC create / enrollment review / assessment create)
2. On success, call `snapshotService.captureSnapshot(...)` as a sequential separate DB write
3. If the snapshot write fails, log the error and return the triggering operation result
   normally — do not roll back the triggering event because of a snapshot failure

This is the "best-effort snapshot" pattern. It preserves the triggering operation's atomicity
and avoids the pooler deadlock risk.

### Finding AF-03: Immutability — apply the existing append-only trigger function

**Finding:** `ttp_enrollment_logs` has an immutability trigger (`§30 IMMUTABILITY TRIGGER` in
migration.sql). The function (likely `prevent_ttp_log_update()`) already exists in the DB.

**Recommendation:** Apply the same immutability trigger to `ttp_score_snapshots`:
```sql
CREATE TRIGGER ttp_score_snapshots_immutability
  BEFORE UPDATE ON public.ttp_score_snapshots
  FOR EACH ROW EXECUTE FUNCTION prevent_ttp_log_update();
```
(Exact function name to be confirmed from migration.sql §30.)

Additionally, the RLS UPDATE and DELETE block policies (recommended in OQ-SS-04) provide a
second layer of immutability enforcement.

### Finding AF-04: `score_disclaimer_hash` computation — use node:crypto, no external dependency

**Finding:** No hash utility library is currently used in the TTP service layer.

**Recommendation:** Compute the hash inline using Node's built-in `node:crypto`:
```typescript
import { createHash } from 'node:crypto';
const scoreDisclaimerHash = createHash('sha256').update(SCORE_DISCLAIMER).digest('hex');
```
No new dependency required.

### Finding AF-05: `source_event_id` column — clarify definition

**Finding:** The design doc defines `source_event_id UUID YES — ID of the source record (e.g. VPC id, enrollment log id)`.
This overlaps with existing typed columns (`vpc_id`, `enrollment_id`). With the OQ-SS-03 recommendation
to store `enrollment_id` as a dedicated FK, `source_event_id` is partially redundant.

**Recommendation:** Keep `source_event_id` as a denormalized convenience field that mirrors the
primary entity ID for the trigger:
- `VPC_ISSUED`: `source_event_id = vpc.id`
- `ENROLLMENT_APPROVED`: `source_event_id = enrollment_log.id`
- `ADMIN_REVIEW_COMPLETE`: `source_event_id = eligibility_assessment.id`

Document this explicitly in the implementation SQL comment.

### Finding AF-06: `createAssessment()` org scoping — trade_id is NOT available

**Finding:** `TtpEligibilityService.createAssessment(orgId, adminId, data)` is org-scoped, not
trade-scoped. The eligibility assessment table has no `trade_id` column. At the
`ADMIN_REVIEW_COMPLETE` trigger point, `trade_id` is not available in the service context.

**Impact for snapshot:** The `ADMIN_REVIEW_COMPLETE` snapshot row will have `trade_id = NULL`
unless the route handler passes a `trade_id` as an additional parameter to the snapshot service.
The route that calls `createAssessment` may or may not have a `trade_id` available from the
request context.

**Recommendation:** For `ADMIN_REVIEW_COMPLETE` snapshots, allow `trade_id = NULL`. The snapshot
is still valuable as an org-level readiness record. Document this explicitly in the implementation.

### Finding AF-07: Legal gate on disclaimer hash columns

**Finding:** `LEGAL_REVIEW_PENDING` status applies to all TTP copy. Both `SCORE_DISCLAIMER`
and `TTP_DISCLAIMER_TEXT` are advisory copy texts pending legal review.

**Implication for implementation:** The `score_disclaimer_hash` and `route_disclaimer_hash`
columns encode these texts as hashes. If the texts change post-legal-review, existing
snapshot rows will carry hashes of the pre-review texts — which is correct behavior
(snapshots are immutable point-in-time records). BUT the CHECK constraint or application
logic must be aware that the "current" hash will change when texts are updated.

**Recommendation:** Do not use a CHECK constraint to validate the hash value itself.
Store it as a free-form TEXT column. Applications that need to verify "was this text the
current approved text at snapshot time?" can compare stored hash against the hash of the
current constant value.

### Finding AF-08: `enrollment_id` vs `ttp_enrollment_logs.id` FK — nullability and constraint

**Finding:** The design doc marks `enrollment_id UUID YES — —` (nullable, no FK notation).

**Recommendation (confirming OQ-SS-03 Option A):** Define a formal FK:
```sql
CONSTRAINT ttp_score_snapshots_enrollment_id_fk
  FOREIGN KEY (enrollment_id) REFERENCES public.ttp_enrollment_logs(id)
  ON UPDATE NO ACTION ON DELETE NO ACTION
```
This is safe because `ttp_enrollment_logs` is append-only with no DELETE, so the FK will
never be violated by downstream deletion.

---

## 6. Recommended Final Decision Set

This table summarises the recommended answer to each open question for Paresh to decide.

| OQ | Question (short) | Recommended Option | Recommendation |
|---|---|---|---|
| OQ-SS-01 | Include `blockers`+`next_steps`? | **Option A — include all** | Store full score detail in `score_detail_json` JSONB; no PII risk; required for audit completeness |
| OQ-SS-02 | Which disclaimer constant to hash? | **Option C — both hashes, distinct fields** | `score_disclaimer_hash` (SCORE_DISCLAIMER) + `route_disclaimer_hash` (TTP_DISCLAIMER_TEXT); legal gate applies |
| OQ-SS-03 | `enrollment_id`: log entry or trade only? | **Option A — store `ttp_enrollment_logs.id`** | Nullable FK; populate for ENROLLMENT_APPROVED directly; optional query for VPC_ISSUED; NULL for ADMIN_REVIEW_COMPLETE |
| OQ-SS-04 | RLS: tenant-read or service-role-only? | **Option A — RLS with tenant-read policy** | Consistent with existing TTP table pattern; enables future tenant read endpoints without schema change |
| OQ-SS-05 | `PARTNER_TRANSMITTED` scope? | **Option A — Wave 4 only** | Include in trigger_event CHECK enum as forward-declared value; write path not opened until Wave 4 |
| OQ-SS-06 | Recompute or accept precomputed? | **Option A — recompute fresh at trigger time** | Extract shared `assembleTtpScoreInput()` helper; post-commit sequential write (not nested transaction); best-effort snapshot pattern |
| OQ-SS-07 | `score_version` format? | **Option A — `'TTP_V1'` simple string** | Consistent with project constant naming; CHECK IN ('TTP_V1', 'TEXQTICSCORE_V2'); extensible |

---

## 7. Recommended Revised Implementation Slicing

Based on audit findings, the following refinements to the implementation slices in §12 of the
design doc are recommended:

| Slice | Original description | Refinement |
|---|---|---|
| 1 | `ttp_score_snapshots` SQL + prisma db pull + generate | Rename `factors_json` → `score_detail_json`. Add `enrollment_id` FK constraint. Add two disclaimer hash columns (`score_disclaimer_hash`, `route_disclaimer_hash`). Include full trigger_event enum with `PARTNER_TRANSMITTED` forward-declared. Apply immutability trigger. Apply RLS 5-policy block. |
| 2 | `TtpScoreSnapshotService` + unit tests | New service with: (a) `assembleTtpScoreInput(db, sellerOrgId, tradeId)` helper, (b) `captureSnapshot(input)` method, (c) hash computation for both disclaimers. Unit tests: mock all 3 trigger scenarios. |
| 3 | `VpcService.generateVpc` integration | Route-level orchestration: generateVpc() → captureSnapshot(). Post-commit sequential write. One extra query for enrollment state (in snapshot service, not vpc service). |
| 4 | `TtpEnrollmentService.adminReviewEnrollment` integration | Route-level orchestration: adminReviewEnrollment() → captureSnapshot(). `enrollment_id` set directly from result.latest_log_id. |
| 5 | `TtpEligibilityService.createAssessment` integration | Route-level orchestration: createAssessment() → captureSnapshot(). `trade_id = NULL` unless provided. `enrollment_id = NULL`. |
| 6 | Admin read endpoints | Separate Paresh approval required per original design. RLS already enables tenant-read path (OQ-SS-04 Option A). |

---

## 8. Blockers

### Hard Blockers (implementation CANNOT proceed until resolved)

| Blocker | Reason | Required action |
|---|---|---|
| Legal review of `SCORE_DISCLAIMER` and `TTP_DISCLAIMER_TEXT` | Both texts are `LEGAL_REVIEW_PENDING`. The `disclaimer_text_hash` columns encode these texts. Hashing pre-review texts is acceptable (snapshots are immutable) but the texts must be legally reviewed before any tenant-facing surface displays them as authoritative. | Paresh to obtain legal sign-off as a prerequisite to activating tenant-read snapshot endpoints (Slice 6). Slices 1–5 (write path only) may proceed independently of legal review if Paresh chooses. |
| Paresh decision on OQ-SS-01 through OQ-SS-07 | Design doc §14: "Questions must be answered by Paresh before `TTP-SCORE-SNAPSHOT-IMPL-001` is opened." | Paresh to record decisions referencing this audit document. |

### Decision Blockers (require Paresh decision but do not block SQL/schema design)

| Blocker | Impact if deferred |
|---|---|
| OQ-SS-02 Option C vs B (one hash vs two) | Schema column count differs; must be resolved before Slice 1 SQL is written |
| OQ-SS-03 Option A vs B (enrollment_id FK precision) | FK constraint in Slice 1 SQL differs; must be resolved before Slice 1 |

### Non-Blocking Cleanup Items

| Item | Recommendation |
|---|---|
| Rename `factors_json` → `score_detail_json` in design doc §5 | Affects only the design artifact and future implementation SQL; no code impact |
| Document `ADMIN_REVIEW_COMPLETE` trade_id nullability explicitly | Add to implementation notes in Slice 5 prompt |
| Confirm immutability trigger function name from §30 of migration.sql | Needed for Slice 1 SQL; read-only check during implementation |

---

## 9. No-Go Boundary Confirmation

The following boundaries from design doc §14 are unconditionally preserved by this audit:

| Boundary | Confirmed |
|---|---|
| `computeTtpScore` not modified | ✅ CONFIRMED — this audit does not touch it |
| `ttp_score_snapshots` table not created | ✅ CONFIRMED — no SQL in this document |
| `ttp_enabled` remains `false` | ✅ CONFIRMED |
| `TTP-SCORE-SNAPSHOT-IMPL-001` not opened | ✅ CONFIRMED |
| `PARTNER_TRANSMITTED` trigger write path not opened | ✅ CONFIRMED |
| No schema, migration, Prisma change | ✅ CONFIRMED |
| Legal status `LEGAL_REVIEW_PENDING` | ✅ CONFIRMED — no copy changes made |
| `prisma migrate dev` and `db push` not used | ✅ CONFIRMED |

---

## 10. Final Decision

```
TTP_SCORE_SNAPSHOT_OPTIONS_AUDIT_001_READY_FOR_PARESH_DECISION
```

**Authority:** Paresh Patel — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Code changes made by this document:** None  
**Schema changes authorized:** None  
**Implementation authorized:** No — Paresh decision on OQ-SS-01 through OQ-SS-07 required first  

**Required Paresh actions to unblock `TTP-SCORE-SNAPSHOT-IMPL-001`:**
1. Review and accept/override the 7 recommendations in §6 (one decision per OQ)
2. Record decisions in a new decision document or by annotating §6 of this document
3. Open `TTP-SCORE-SNAPSHOT-IMPL-001` with an implementation prompt referencing both
   `TTP-SCORE-SNAPSHOT-DESIGN-001` and this audit document
4. Separately: obtain legal review of `SCORE_DISCLAIMER` and `TTP_DISCLAIMER_TEXT` texts
   before activating any tenant-facing score history endpoints (Slice 6)

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*This document is a governance audit artifact only. It does not authorize any implementation.*  
*All implementation slices require explicit Paresh approval referencing this document and*  
*`governance/TTP-SCORE-SNAPSHOT-DESIGN-001.md` before any implementation prompt may be opened.*
