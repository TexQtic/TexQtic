# TTP-SCORE-SNAPSHOT-DESIGN-001
## TradeTrust Pay — Score Snapshot Architecture Design

---

## 1. Document Metadata

| Field | Value |
|---|---|
| **Unit ID** | `TTP-SCORE-SNAPSHOT-DESIGN-001` |
| **Unit Type** | Design / governance artifact |
| **Phase** | Phase 2, Wave 2 |
| **P-tier** | P1 |
| **TQs addressed** | TQ-06 (score history versioning / snapshots), TQ-07 (score versioning across TexQticScore versions) |
| **Design date** | 2026-05-05 |
| **Author** | Paresh Patel — TexQtic founder / operator |
| **`ttp_enabled` state** | `false` — UNCHANGED throughout this design unit |
| **Implementation authorized** | **NO** — this is a design artifact only |
| **Schema / SQL authorized** | **NO** — `ttp_score_snapshots` table does NOT exist and is NOT created by this unit |
| **Migration authorized** | **NO** |
| **Code changes authorized** | **NO** |
| **`computeTtpScore` changes** | **FORBIDDEN** — existing 7-factor function must not be modified |
| **Blocking gate** | Wave 0 complete and TRUTH_SYNCED — **CLEARED** |
| **Required before opening impl** | Paresh review and approval of this design artifact |
| **Related decisions** | `PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001` (TQ-06 Option B ⭐ approved); `PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-REPO-TRUTH-AUDIT-001` |

---

## 2. Purpose

TradeTrust Pay Phase 1 computes the TradeTrust Score as an **ephemeral pure function** (`computeTtpScore`).
Every API call recomputes the score from live readiness data. No score history is retained. No snapshot is
written to the database.

This design addresses a Phase 2 architectural requirement: once VPCs are transmitted to finance partners
(Wave 4), lenders will need an auditable answer to "what was the TradeTrust Score at the time the VPC was
issued?" An ephemeral-only model cannot answer that question.

This unit designs:

1. The `ttp_score_snapshots` conceptual schema — columns, types, constraints, and indexes.
2. The trigger event model — which system events should cause a snapshot to be written.
3. The hybrid live + snapshot model — how the ephemeral score and persisted snapshots coexist.
4. Tenant isolation and data integrity guarantees.
5. Legal and copy boundaries that must hold throughout implementation.
6. API and service design implications for implementation.
7. A recommended implementation slicing plan (6 future slices, none opened by this unit).
8. Open questions that must be resolved before implementation is authorized.

**This document does not create any table, write any SQL, modify any service, or authorize any
implementation prompt. It is a design authority document only.**

---

## 3. Current Repo-Truth Summary

The following facts were confirmed by direct code inspection on 2026-05-05 (HEAD: `f0ead0f`).

### 3.1 TradeTrust Score service (`server/src/services/ttpScore.service.ts`)

- `computeTtpScore(input: TtpScoreInput): TradeTrustScore` is a **pure function**. No DB access. No external calls. No DB writes. No side effects.
- **7 scoring factors** (100 pts total):
  | Factor | Key | Points |
  |---|---|---|
  | GST verified | `gst_readiness` | 20 |
  | TTP eligibility | `eligibility_readiness` | 25 |
  | Risk tier | `risk_tier` | 10 |
  | Verified invoice | `invoice_readiness` | 15 |
  | VPC active | `vpc_readiness` | 15 |
  | TTP enrollment | `enrollment_readiness` | 10 |
  | Partner routing stub | `routing_readiness` | 5 |
- **4 score bands:** `READY` (80–100), `NEAR_READY` (60–79), `NEEDS_REVIEW` (40–59), `NOT_READY` (0–39).
- **`SCORE_DISCLAIMER` constant** (file-scoped, not exported): `"TradeTrust Score is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment."`
- Score output interface: `{ score, band, factors, blockers, next_steps, disclaimer }`.
- **`computeTtpScore` must not be modified by this or any subsequent implementation slice.** TexQticScore v2 (`TTP-TEXQTICSCORE-V2-DESIGN-001`) will be a new separate function.

### 3.2 VPC generation (`server/src/services/vpc.service.ts`)

- Entry point: `VpcService.generateVpc(invoiceId: string, adminId: string): Promise<AdminVpcRecord>`
- 12 eligibility gates enforced in order; all must pass before VPC record is created.
- On success: `verified_payable_certificates` row inserted with `lifecycle_state_id` = ACTIVE.
- VPC org_id = seller's org_id (D-017-A tenant boundary). 
- **No snapshot write** currently occurs at VPC issuance. This is the primary trigger point for Wave 2 snapshots.

### 3.3 Enrollment approval (`server/src/services/ttpEnrollment.service.ts`)

- Entry point: `TtpEnrollmentService.adminReviewEnrollment({ tradeId, adminId, outcome, notes })`
- When `outcome === 'APPROVED'`, 3 approval gates are enforced; on success, `ttp_enrollment_logs` row inserted with `to_state = 'APPROVED'`.
- **No snapshot write** currently occurs at enrollment approval. This is the second trigger point for Wave 2 snapshots.

### 3.4 Eligibility assessment (`server/src/services/ttpEligibility.service.ts`)

- Entry point: `TtpEligibilityService.createAssessment(orgId, adminId, data)`
- Creates `ttp_eligibility_assessments` row on admin review completion.
- **No snapshot write** currently occurs at admin review completion. This is the third trigger point for Wave 2 snapshots.

### 3.5 Constants (`server/src/ttp/ttp.constants.ts`)

- `TTP_VPC_STATE`: `ACTIVE`, `ROUTING_READY`, `TRANSMITTED`, `VOIDED`, `EXPIRED`
- `TTP_ENROLLMENT_STATE`: `REQUESTED`, `APPROVED`, `REJECTED`, `SUSPENDED`, `CANCELLED`
- `TTP_DISCLAIMER_TEXT` (exported): `"TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score, financing approval, payment guarantee, lending decision, or partner commitment."` — INTERIM text; final pending `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001`.
- `TTP_ACTOR_TYPE`: `TENANT_USER`, `TENANT_ADMIN`, `PLATFORM_ADMIN`, `SYSTEM_AUTOMATION`

### 3.6 Prisma schema — confirmed absences

- `ttp_score_snapshots` — **does NOT exist** in `server/prisma/schema.prisma`. Confirmed by text search across all source files.
- No snapshot trigger logic anywhere in the codebase.
- No snapshot read endpoints.

### 3.7 Related governance decisions

- TQ-06 `APPROVED_AS_DESIGN_TARGET`: Option B — new `ttp_score_snapshots` table with `trigger_event` enum.
  Rationale: ephemeral-only model cannot answer "what was the score at VPC issuance?" — required for dispute resolution, lender evidence, audit trail.
- TQ-07 `APPROVED_AS_DESIGN_TARGET`: Option B — reuse `ttp_score_snapshots` with `score_version` column to distinguish TradeTrust Score v1 from TexQticScore v2.
  Rationale: one table covers both TQ-06 (v1 snapshots) and TQ-07 (v2 snapshots); `score_version` is the only required addition.

---

## 4. Design Goals

| Goal | Priority | Notes |
|---|---|---|
| Auditable score history at key lifecycle events | P0 | Minimum: VPC issuance; enrollment approval; admin review completion |
| Tenant isolation — every snapshot scoped by `org_id` | P0 | D-017-A. No cross-tenant reads. Row-level isolation. |
| Append-only immutability | P0 | Snapshots are evidence. Never update or delete. |
| Score versioning — distinguish v1 from v2 | P1 | `score_version` column; enables future TexQticScore v2 without breaking v1 contract |
| Hybrid live + snapshot model | P1 | Live score for real-time readiness; snapshot for historical audit |
| Low-blast-radius trigger points | P1 | Write-at-event, not continuous background process |
| Legal and disclaimer traceability | P1 | Capture which disclaimer text was in effect at snapshot time via `disclaimer_text_hash` |
| Partner transmission audit trail | P2 (Wave 4) | `PARTNER_TRANSMITTED` trigger — Wave 4 only, not Wave 2 scope |
| No modification of `computeTtpScore` | P0 constraint | Existing pure function is untouched |
| No new routes or API endpoints | P0 constraint (Wave 2) | Read endpoints are future slices |

---

## 5. Proposed `ttp_score_snapshots` Conceptual Schema

**This is a design-only schema definition. No SQL is written or executed by this document.**

### 5.1 Column definitions

| Column | Type | Nullable | Constraints | Purpose |
|---|---|---|---|---|
| `id` | `UUID` | No | PK, `DEFAULT gen_random_uuid()` | Unique snapshot identifier |
| `org_id` | `UUID` | No | FK → `organizations.id`, NOT NULL | Tenant boundary — D-017-A |
| `trade_id` | `UUID` | Yes | FK → `trades.id` | Trade context (nullable: some triggers may not have a trade) |
| `invoice_id` | `UUID` | Yes | FK → `invoices.id` | Invoice context (nullable) |
| `vpc_id` | `UUID` | Yes | FK → `verified_payable_certificates.id` | VPC context (nullable; set when trigger is VPC_ISSUED) |
| `enrollment_id` | `UUID` | Yes | FK → `ttp_enrollment_logs.id` (nullable) | Enrollment log entry id at time of trigger. Populated for `ENROLLMENT_APPROVED`; optionally for `VPC_ISSUED`; NULL for `ADMIN_REVIEW_COMPLETE` |
| `score_value` | `SMALLINT` | No | CHECK (score_value BETWEEN 0 AND 100) | Computed score 0–100 |
| `score_band` | `TEXT` | No | CHECK (score_band IN ('READY','NEAR_READY','NEEDS_REVIEW','NOT_READY')) | Score band label |
| `score_version` | `TEXT` | No | NOT NULL, initial value `'TTP_V1'`; CHECK (see §5.4) | Score engine version. `'TTP_V1'` = Phase 1 `computeTtpScore`; `'TEXQTICSCORE_V2'` = future |
| `score_detail_json` | `JSONB` | No | NOT NULL | Serialized score detail at snapshot time: `{ factors: TradeTrustScoreFactor[], blockers: string[], next_steps: string[] }`. No raw bureau data, no PII, no admin notes. |
| `trigger_event` | `TEXT` | No | CHECK (see §6) | Event that caused the snapshot |
| `source_event_id` | `UUID` | Yes | — | ID of the source record (e.g. VPC id, enrollment log id) |
| `actor_id` | `UUID` | Yes | — | Admin or system actor who triggered the event (nullable for system events) |
| `score_disclaimer_hash` | `TEXT` | No | NOT NULL | SHA-256 hex of `SCORE_DISCLAIMER` constant (file-scoped in `ttpScore.service.ts`, embedded in `TradeTrustScore.disclaimer`) at snapshot time |
| `route_disclaimer_hash` | `TEXT` | No | NOT NULL | SHA-256 hex of `TTP_DISCLAIMER_TEXT` constant (exported from `ttp.constants.ts`, used in `advisory_disclaimer` route responses) at snapshot time |
| `metadata_json` | `JSONB` | Yes | — | Optional extensibility bag for future fields |
| `created_at` | `TIMESTAMPTZ` | No | NOT NULL, `DEFAULT now()` | Snapshot timestamp (immutable) |

### 5.2 Indexes (design intent)

| Index | Columns | Purpose |
|---|---|---|
| Primary key | `id` | Row uniqueness |
| Tenant lookup | `(org_id, created_at DESC)` | Fetch all snapshots for a tenant in time order |
| VPC lookup | `(vpc_id, trigger_event)` WHERE vpc_id IS NOT NULL | "What was the score at VPC issuance?" |
| Trade lookup | `(trade_id, created_at DESC)` WHERE trade_id IS NOT NULL | Score history for a trade |

### 5.3 Immutability contract

- **Append-only.** No UPDATE or DELETE on `ttp_score_snapshots` is ever authorized.
- **No soft-delete.** Deleted snapshots cannot be reconstructed for dispute resolution.
- **RLS policy:** Row-level security must enforce `org_id` = authenticated tenant's `org_id` for all SELECT operations.
- **Service-role writes only.** Only the platform server (service role) may INSERT. Tenant users may not insert.

### 5.4 `score_version` values (finalized — OQ-SS-07 resolved)

| Value | Engine | Phase | CHECK constraint |
|---|---|---|---|
| `TTP_V1` | `computeTtpScore` — 7-factor, 100pt, Phase 1 pure function | Phase 2 initial implementation | ✅ Included |
| `TEXQTICSCORE_V2` | `computeTexQticScore` — future, separate function | Phase 2, after `TTP-TEXQTICSCORE-V2-DESIGN-001` approved | ✅ Included |

SQL: `CHECK (score_version IN ('TTP_V1', 'TEXQTICSCORE_V2'))`

Initial implementation always writes `'TTP_V1'`. Do not use dot-version format.

---

## 6. Snapshot Trigger Design

### 6.1 Trigger event enum

The `trigger_event` column accepts the following values. Each value corresponds to a system lifecycle event
at which a score snapshot should be written.

| Event value | System event | Wave | Source service | Source record |
|---|---|---|---|---|
| `VPC_ISSUED` | VPC successfully created (initial ACTIVE state) | Wave 2 | `VpcService.generateVpc` | `verified_payable_certificates.id` |
| `ENROLLMENT_APPROVED` | Admin approves a TTP enrollment | Wave 2 | `TtpEnrollmentService.adminReviewEnrollment` | `ttp_enrollment_logs.id` |
| `ADMIN_REVIEW_COMPLETE` | Admin creates an eligibility assessment | Wave 2 | `TtpEligibilityService.createAssessment` | `ttp_eligibility_assessments.id` |
| `PARTNER_TRANSMITTED` | VPC data contract transmitted to finance partner | **Wave 4 only** | Future partner transmission service | Future partner workflow id |

### 6.2 Wave 2 trigger scope

Wave 2 implementation slices (when authorized) cover **three triggers only**: `VPC_ISSUED`,
`ENROLLMENT_APPROVED`, `ADMIN_REVIEW_COMPLETE`. The `PARTNER_TRANSMITTED` trigger is explicitly
**out of scope for Wave 2** and may only be designed and implemented in Wave 4 after the partner
contract gate is cleared.

### 6.3 Score input reconstruction at trigger points

At each trigger event, the score snapshot service must:

1. Reconstruct the `TtpScoreInput` from the org's current readiness state (same input shape that
   `computeTtpScore` accepts).
2. Call `computeTtpScore(input)` — the existing pure function — to obtain `score`, `band`, `factors`,
   and `disclaimer`.
3. Persist the snapshot row with all computed fields plus trigger metadata.

**No new score computation logic is required.** The existing `computeTtpScore` function is the engine.

### 6.4 Snapshot write model — post-commit sequential best-effort (OQ-SS-06 resolved)

Score snapshot writes use a **post-commit sequential best-effort** pattern. The snapshot is written
after the triggering event completes successfully, not inside the triggering service's database
operation.

**Execution sequence:**

1. Route calls triggering service (`generateVpc`, `adminReviewEnrollment`, or `createAssessment`).
2. Triggering service writes its primary row (VPC, enrollment log, or assessment) and returns.
3. Route calls `TtpScoreSnapshotService.captureSnapshot(...)` — assembles `TtpScoreInput`, calls
   `computeTtpScore`, writes snapshot row.

**Best-effort contract:**

- If the snapshot write fails (DB error, timeout, etc.), the triggering event result is returned
  to the caller normally. The triggering event is **NOT** rolled back.
- Snapshot write failures must be logged as a Pino structured event for reconciliation. The
  mechanism for failure alerting and reconciliation is to be defined in `TTP-SCORE-SNAPSHOT-IMPL-001`.

**Why not same-transaction atomicity?**

Repo-truth inspection confirmed none of the three trigger services use `$transaction`. The
`TtpSummaryService` `preloadedTrade` pattern was introduced specifically to avoid pooler deadlocks
from nested query chains. Wrapping a snapshot write inside a triggering transaction would reintroduce
that risk across all three trigger points. Post-commit sequential is the established TexQtic pattern
for TTP service operations.

**Partial-state acceptability:**

A VPC issued without a corresponding snapshot is recoverable (through reconciliation). A VPC rolled
back because of a snapshot failure is an operational disruption to the triggering business flow. The
partial-state risk is lower than the rollback risk.

This is a confirmed design decision (OQ-SS-06 Option A). It replaces the prior "same `$transaction`"
requirement. The mechanism is to be finalized in `TTP-SCORE-SNAPSHOT-IMPL-001`.

---

## 7. Hybrid Live + Snapshot Design

### 7.1 Coexistence model

| Surface | Score type | Persisted? | Purpose |
|---|---|---|---|
| `GET /ttp/summary/:tradeId` | Live ephemeral | No | Real-time readiness signal for operator/tenant |
| `GET /ttp/score/:tradeId` (future) | Live ephemeral | No | On-demand advisory score |
| Snapshot at VPC issuance | Historical | Yes | "What was the score when VPC was issued?" |
| Snapshot at enrollment approval | Historical | Yes | Score at time of enrollment approval |
| Snapshot at admin review | Historical | Yes | Score at time of eligibility assessment |
| Score history endpoint (future) | Historical read | Yes | Audit trail, lender evidence, dispute resolution |

The live ephemeral score and the persisted snapshot model are **complementary, not competing**. The
ephemeral score answers "what is the readiness today?" The snapshot answers "what was the readiness
at event X?"

### 7.2 Divergence between live and snapshot

It is expected and correct for the live score to differ from the most recent snapshot. The live score
reflects the current state of all readiness inputs. The snapshot is a point-in-time record. Consumers
of the score history API must not be surprised by this divergence — it must be documented in the API
response shape.

### 7.3 No snapshot on every API call

Snapshots are **NOT written on every score computation call**. They are written only at the defined
trigger events. This avoids database growth from polling behavior and maintains meaningful audit trail
semantics. An operator calling `GET /ttp/score` repeatedly should not produce hundreds of snapshot rows.

---

## 8. Data Integrity and Tenant Isolation

### 8.1 `org_id` is the canonical tenancy boundary

Every `ttp_score_snapshots` row **MUST** have `org_id` set to the seller's `org_id`. This is derived
from the triggering entity (invoice → org_id, enrollment → org_id, eligibility → org_id) and must
never be accepted from request input.

This follows D-017-A, consistent with all other TTP tables.

### 8.2 RLS policy design (finalized — OQ-SS-04 resolved)

Five-policy RLS block, following the established TexQtic TTP table pattern
(`ttp_eligibility_assessments` §19 and `ttp_enrollment_logs` §31 in the foundation migration):

```sql
-- 1. RESTRICTIVE guard (all operations)
CREATE POLICY ttp_score_snapshots_guard AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context() OR current_setting('app.is_admin', true) = 'true' OR app.bypass_enabled()
);

-- 2. PERMISSIVE SELECT (tenant reads own org; admin reads all)
CREATE POLICY ttp_score_snapshots_select_unified AS PERMISSIVE FOR SELECT TO texqtic_app USING (
  (app.require_org_context() AND org_id = app.current_org_id())
  OR current_setting('app.is_admin', true) = 'true' OR app.bypass_enabled()
);

-- 3. PERMISSIVE INSERT (admin/bypass only — no tenant INSERT)
CREATE POLICY ttp_score_snapshots_insert_unified AS PERMISSIVE FOR INSERT TO texqtic_app WITH CHECK (
  current_setting('app.is_admin', true) = 'true' OR app.bypass_enabled()
);

-- 4. UPDATE block (append-only enforcement — database layer)
CREATE POLICY ttp_score_snapshots_update_block AS PERMISSIVE FOR UPDATE TO texqtic_app USING (false);

-- 5. DELETE block (append-only enforcement — database layer)
CREATE POLICY ttp_score_snapshots_delete_block AS PERMISSIVE FOR DELETE TO texqtic_app USING (false);

GRANT SELECT, INSERT ON public.ttp_score_snapshots TO texqtic_app;
```

The exact SQL is the implementation-layer responsibility (`TTP-SCORE-SNAPSHOT-IMPL-001`).
This design document records the intent and confirmed policy structure.
No tenant INSERT, UPDATE, or DELETE is permitted. Tenant-facing read endpoints require a
separate Paresh authorization (Slice 6) even though the RLS SELECT policy is present.

### 8.3 Append-only enforcement

The implementation must enforce append-only semantics at two levels:
1. **Application layer:** No UPDATE or DELETE call paths in the service layer.
2. **Database layer:** Consider a trigger or check constraint that raises an error on any UPDATE/DELETE attempt. To be confirmed in the implementation slice.

### 8.4 No cross-tenant queries

Snapshot read endpoints (future) must always scope by `org_id`. No cross-tenant snapshot aggregation
is permitted. Aggregate analytics (e.g. platform-wide score distribution) require a separate
service-role analytics query with explicit approval — they must never be exposed on tenant-facing
endpoints.

### 8.5 `score_detail_json` PII and sensitivity (OQ-SS-01 resolved)

The `score_detail_json` column contains `{ factors: TradeTrustScoreFactor[], blockers: string[],
next_steps: string[] }`. This includes evaluation outcomes, plain-English explanations, and advisory
strings. It does **not** contain raw bureau data, raw GST data, CIBIL scores, admin notes, or
requestor identity fields. These must not be included in the snapshot.

The `score_detail_json` content mirrors the `computeTtpScore` output fields `factors`, `blockers`,
and `next_steps` exactly — no additional fields, no raw inputs. The `disclaimer` field from
`TradeTrustScore` is NOT stored in `score_detail_json` (it is represented by `score_disclaimer_hash`).
The `score` and `band` fields are stored as typed columns (`score_value`, `score_band`) and are NOT
duplicated in `score_detail_json`. No additional fields may be added without a schema change and
Paresh approval.

---

## 9. Legal and Copy Boundaries

### 9.1 Advisory disclaimer traceability (OQ-SS-02 resolved)

Every snapshot row must capture both disclaimer hashes:

- **`score_disclaimer_hash`** — SHA-256 hex of the `SCORE_DISCLAIMER` constant from
  `server/src/services/ttpScore.service.ts`. This is the disclaimer embedded in the
  `TradeTrustScore` object returned by `computeTtpScore`, frozen in the snapshot itself.
- **`route_disclaimer_hash`** — SHA-256 hex of the `TTP_DISCLAIMER_TEXT` constant from
  `server/src/ttp/ttp.constants.ts`. This is the disclaimer presented to tenants in all TTP API
  route responses (`advisory_disclaimer` field).

These hashes allow future legal review to establish exactly what disclaimer text was in effect at
each snapshot time — for both the score computation surface and the API response surface. The two
constants have materially different wording and serve distinct legal purposes; storing both is
required for complete copy traceability.

Neither hash stores the full disclaimer text — to avoid storing redundant string data. The
implementation must document which text produces which hash. Both texts are currently at
`LEGAL_REVIEW_PENDING` status; the hashes will reflect whichever texts are in the constants at
implementation time. Existing snapshots correctly carry hashes of the texts operative at write
time, and are immutable thereafter.

### 9.2 Advisory-only invariant

Score snapshots, like the live score, are advisory readiness indicators only. No snapshot endpoint,
no score history display, and no exported snapshot may be labelled or positioned as:
- A credit score or credit rating
- A financing approval or pre-approval
- A payment guarantee
- A lending decision
- A partner commitment

This constraint applies to all surfaces that consume `ttp_score_snapshots` data.

### 9.3 `TTP_DISCLAIMER_TEXT` and `SCORE_DISCLAIMER` final text dependency

Both disclaimer constants are **INTERIM**. Final text is `LEGAL_REVIEW_PENDING` under
`TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` and `TTP-LEGAL-COPY-COUNSEL-PACKET-001`. The
implementation slice must not hard-code either disclaimer text — both `score_disclaimer_hash` and
`route_disclaimer_hash` must always be computed from the runtime constants at write time. The hashes
will reflect whichever texts are in the constants at implementation time.

### 9.4 No copy changes in this design unit

This design unit does not authorize any change to `TTP_DISCLAIMER_TEXT`, `SCORE_DISCLAIMER`, or any
other copy constant. All copy remains at INTERIM status until Paresh provides formal legal sign-off.

---

## 10. API / Service Design Implications

### 10.1 Score snapshot service (future)

A new `TtpScoreSnapshotService` (or equivalent) will be responsible for:
- Building the `TtpScoreInput` from org readiness state (shared input assembly helper).
- Calling `computeTtpScore`.
- Writing the `ttp_score_snapshots` row after the triggering event completes.

This service does not exist today. It is a future implementation artifact for `TTP-SCORE-SNAPSHOT-IMPL-001`.

**The triggering services (`VpcService`, `TtpEnrollmentService`, `TtpEligibilityService`) must NOT
be modified to call the snapshot service internally.** Snapshot orchestration lives at the route
handler level (or thin orchestration layer at the route). This preserves the triggering service
design and avoids introducing pooler deadlock risk.

### 10.2 Service integration points (OQ-SS-06 resolved)

| Trigger event | Integration point | Write model |
|---|---|---|
| `VPC_ISSUED` | Route handler, after `VpcService.generateVpc` returns successfully | Post-commit sequential; best-effort snapshot write |
| `ENROLLMENT_APPROVED` | Route handler, after `TtpEnrollmentService.adminReviewEnrollment` returns with `outcome === 'APPROVED'` | Post-commit sequential; best-effort snapshot write |
| `ADMIN_REVIEW_COMPLETE` | Route handler, after `TtpEligibilityService.createAssessment` returns successfully | Post-commit sequential; best-effort snapshot write |

**Best-effort contract:** Snapshot write failure does NOT cause the triggering event result to be
reverted or the route to return an error. Log the failure (Pino structured event) and return the
triggering event result normally. Reconciliation mechanism to be defined in `TTP-SCORE-SNAPSHOT-IMPL-001`.

### 10.3 Read endpoints (future, not Wave 2)

The following read endpoint shapes are proposed for future design (not authorized by this unit):

- `GET /admin/ttp/score-history/:orgId` — paginated snapshot history for an org (admin only)
- `GET /admin/ttp/score-snapshot/:snapshotId` — single snapshot detail (admin only)
- `GET /ttp/score-history/:tradeId` — tenant-facing snapshot history for a trade (tenant-scoped)

These endpoints must be designed in a separate slice with their own OpenAPI contract updates.

### 10.4 No impact on existing score endpoints

`GET /ttp/summary/:tradeId` and all existing TTP endpoints must not be modified by the snapshot
implementation. The live ephemeral score continues to be computed and returned unchanged. Snapshot
writes are a side effect of lifecycle events, not of score read endpoints.

---

## 11. Testing and Verification Plan (Future)

When `TTP-SCORE-SNAPSHOT-IMPL-001` is authorized, the following test categories must be covered:

### 11.1 Unit tests

| Test | Category |
|---|---|
| Snapshot service writes correct row on VPC_ISSUED trigger | Unit (service) |
| Snapshot service writes correct row on ENROLLMENT_APPROVED trigger | Unit (service) |
| Snapshot service writes correct row on ADMIN_REVIEW_COMPLETE trigger | Unit (service) |
| Snapshot row contains correct org_id from triggering entity | Unit (tenant isolation) |
| Snapshot row score_detail_json matches computeTtpScore output (factors, blockers, next_steps) | Unit (score fidelity) |
| Snapshot write failure does NOT roll back VPC insert (best-effort pattern) | Unit (best-effort) |
| Snapshot write failure does NOT roll back enrollment approval (best-effort pattern) | Unit (best-effort) |
| Snapshot write failure does NOT roll back eligibility assessment (best-effort pattern) | Unit (best-effort) |
| score_disclaimer_hash matches SHA-256 of SCORE_DISCLAIMER constant | Unit (copy traceability) |
| route_disclaimer_hash matches SHA-256 of TTP_DISCLAIMER_TEXT constant | Unit (copy traceability) |
| Two orgs cannot read each other's snapshots | Unit (tenant isolation) |

### 11.2 Integration tests

| Test | Category |
|---|---|
| Full VPC generation flow produces snapshot row | Integration |
| Full enrollment approval flow produces snapshot row | Integration |
| Full eligibility assessment flow produces snapshot row | Integration |
| Score snapshot row is immutable (no UPDATE path exists) | Integration |

### 11.3 Validation criteria for implementation closure

- `prisma db pull` reflects new `ttp_score_snapshots` table.
- `prisma generate` completes without error.
- All 3 trigger integration tests pass.
- All unit tests for tenant isolation pass.
- Best-effort pattern unit tests pass (snapshot failure does not affect triggering event result).
- `score_disclaimer_hash` and `route_disclaimer_hash` hash verification tests pass.
- Existing test suite (183+ TTP unit tests) continues to pass unchanged.
- `tsc` clean across `server/`.
- `ttp_enabled` is still `false` after all changes.

---

## 12. Implementation Slicing Recommendation

**None of these slices are authorized or opened by this design document.** Each requires an explicit
Paresh decision and separate implementation prompt.

| Slice | Scope | Depends On | Key Design Decisions Applied |
|---|---|---|---|
| Slice 1 | `ttp_score_snapshots` SQL (finalized columns: `score_detail_json`, `score_disclaimer_hash`, `route_disclaimer_hash`, `enrollment_id FK`) + RLS (5-policy pattern) + `prisma db pull` + `prisma generate` | Paresh approval of this design + decision record | OQ-SS-01, OQ-SS-02, OQ-SS-03, OQ-SS-04, OQ-SS-05, OQ-SS-07; AF-03 (immutability trigger) |
| Slice 2 | `TtpScoreSnapshotService` — `assembleTtpScoreInput` helper + `captureSnapshot` method + unit tests for all trigger types + hash tests + best-effort failure tests | Slice 1 complete | OQ-SS-06 (post-commit sequential, best-effort); OQ-SS-01 (score_detail_json shape); OQ-SS-02 (both hashes); AF-04 (node:crypto); AF-05 (source_event_id = primary entity ID); AF-06 (ADMIN_REVIEW_COMPLETE: trade_id=NULL) |
| Slice 3 | Route-level orchestration: `VpcService.generateVpc` route calls `snapshotService.captureSnapshot` post-commit | Slice 2 complete | OQ-SS-06 (route-level orchestration, not inside VpcService) |
| Slice 4 | Route-level orchestration: `adminReviewEnrollment` route calls `snapshotService.captureSnapshot` with `enrollment_id` when outcome=APPROVED | Slice 2 complete | OQ-SS-03 (enrollment_id from newLog.id); OQ-SS-06 |
| Slice 5 | Route-level orchestration: `createAssessment` route calls `snapshotService.captureSnapshot` with trade_id=NULL, enrollment_id=NULL | Slice 2 complete | AF-06 (ADMIN_REVIEW_COMPLETE trade_id=NULL); OQ-SS-06 |
| Slice 6 | Admin read endpoints (score history, snapshot detail) — OpenAPI contract update + tenant-facing history endpoint (if legal cleared) | Slices 3–5 complete; separate Paresh approval; `LEGAL_REVIEW_PENDING` cleared for public surfaces | OQ-SS-04 (RLS select policy enables this path) |

`PARTNER_TRANSMITTED` trigger (Wave 4) is not represented here. It is a Wave 4 implementation slice
that depends on `TTP-PARTNER-WORKFLOW-DESIGN-001` and a signed partner contract. The CHECK constraint
in Slice 1 forward-declares the value.

---

## 13. Resolved Design Decisions

All open questions from this design artifact have been resolved by Paresh Patel. Full decision
rationale, implementation consequences, and repo-truth evidence are in:

> `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001.md`

| # | Question | Decision | Selected Option | Key Consequence |
|---|---|---|---|---|
| OQ-SS-01 | Include `blockers` and `next_steps` in snapshot? | **Include full advisory detail** | Option A | Column renamed `score_detail_json`; contains `factors`, `blockers`, `next_steps` |
| OQ-SS-02 | Which disclaimer constant(s) to hash? | **Store both hashes** | Option C | Two columns: `score_disclaimer_hash` (SCORE_DISCLAIMER) + `route_disclaimer_hash` (TTP_DISCLAIMER_TEXT) |
| OQ-SS-03 | `enrollment_id`: FK to `ttp_enrollment_logs.id` or `trade_id` only? | **Nullable FK to `ttp_enrollment_logs.id`** | Option A | FK constraint added; NULL for ADMIN_REVIEW_COMPLETE |
| OQ-SS-04 | RLS: tenant-read policy or service-role-only? | **RLS with tenant-read policy** | Option A | 5-policy pattern (guard, select, insert, UPDATE block, DELETE block); no tenant INSERT/UPDATE/DELETE |
| OQ-SS-05 | `PARTNER_TRANSMITTED` trigger: Wave 4 or Wave 2? | **Wave 4 only** | Option A | Forward-declared in CHECK constraint only; no Wave 2 write path |
| OQ-SS-06 | Recompute fresh or accept precomputed score? | **Recompute fresh; post-commit sequential** | Option A | Route-level orchestration; best-effort snapshot write; snapshot failure does NOT roll back triggering event |
| OQ-SS-07 | `score_version` format: `'TTP_V1'` or semantic? | **`'TTP_V1'` simple string** | Option A | CHECK(`score_version IN ('TTP_V1', 'TEXQTICSCORE_V2')`); initial write always `'TTP_V1'` |

No open questions remain. This design artifact is ready for Paresh to authorize implementation
slices via separate implementation prompts.

---

## 14. No-Go Boundaries

The following are **unconditionally forbidden** throughout the design, implementation, and operation
of `ttp_score_snapshots`. These boundaries apply to this unit and all future implementation units
derived from this design.

| Boundary | Reason |
|---|---|
| Never modify `computeTtpScore` | Phase 1 score contract is tested and referenced by lender evidence in governance decisions. TexQticScore v2 must be a new separate function. |
| Never write snapshot on every API call | Snapshot semantics require trigger-based writes only. On-demand score computation is ephemeral. |
| Never store `raw_bureau_json`, `raw_verification_json`, CIBIL data, or admin notes in `score_detail_json` | PII / bureau data boundary. The snapshot mirrors only the `factors[]`, `blockers[]`, and `next_steps[]` outputs of `computeTtpScore` — no raw inputs. |
| Never allow tenant INSERT or UPDATE on snapshots | Append-only, service-role-only write. Tenant manipulation of score history is a data integrity violation. |
| Never allow UPDATE or DELETE on any snapshot row | Immutability is constitutional. Evidence records cannot be altered. |
| Never expose snapshot data without `org_id` scoping | Tenant isolation is constitutional. Cross-tenant snapshot reads are forbidden. |
| Never remove `score_disclaimer_hash` or `route_disclaimer_hash` from snapshot row | Copy traceability must be preserved for every snapshot. Both hash fields are required. |
| Never imply that snapshot scores are credit scores, financing approvals, or payment guarantees | Advisory-only invariant applies to all score surfaces. |
| Never open `TTP-SCORE-SNAPSHOT-IMPL-001` without Paresh approval of this design | Design must be reviewed before implementation is authorized. |
| Never open `PARTNER_TRANSMITTED` trigger in Wave 2 | Wave 4 gate applies. |
| Never change `ttp_enabled` | Activation is not authorized by this unit or any Wave 2 design unit. |
| Never use `prisma migrate dev` or `prisma db push` | SQL first, then `prisma db pull`, then `prisma generate` — always. |

---

## 15. Final Decision

```
TTP_SCORE_SNAPSHOT_DESIGN_001_READY_FOR_PARESH_REVIEW
TTP_SCORE_SNAPSHOT_DESIGN_001_DECISIONS_RECORDED_READY_FOR_IMPLEMENTATION_PLANNING
```

**Authority:** Paresh Patel — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Implementation authorized:** No — decisions are recorded; each implementation slice requires a separate Paresh-approved implementation prompt  
**Schema / SQL authorized:** No  
**`ttp_score_snapshots` table created:** No — this document is a design artifact only  
**`computeTtpScore` modified:** No  
**Design decisions recorded:** Yes — all 7 open questions (OQ-SS-01 through OQ-SS-07) resolved; see `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001.md`  
**Next candidate:** `TTP-SCORE-SNAPSHOT-SQL-RLS-001` (or equivalent Slice 1 prompt) — pending explicit Paresh authorization; NOT opened by this document  
**Wave 2 implementation units opened:** None — all remain at `NOT_OPENED` until Paresh authorizes Slice 1  
**Legal status:** `LEGAL_REVIEW_PENDING` throughout — no copy changes authorized

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*This document does not authorize any implementation. All implementation slices require Paresh approval of this design artifact before any implementation prompt may be opened.*
