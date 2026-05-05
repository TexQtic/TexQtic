# TTP-TEXQTICSCORE-V2-DESIGN-001 — TexQticScore v2 Design

---

## 1. Document Metadata

| Field | Value |
|---|---|
| **Unit ID** | `TTP-TEXQTICSCORE-V2-DESIGN-001` |
| **Type** | Design artifact — governance/design-only |
| **Phase** | Phase 2 — Wave 2 score architecture foundation |
| **TQs** | TQ-11 (TexQticScore v2 factor model), TQ-12 (score versioning / coexistence) |
| **Date** | 2026-05-05 |
| **Decision owner** | Paresh Sharma — TexQtic founder / operator |
| **Author** | GitHub Copilot — TexQtic Safe-Write Mode |
| **`ttp_enabled` state** | `false` — UNCHANGED |
| **Legal status** | `LEGAL_REVIEW_PENDING` — UNCHANGED |
| **Implementation authorized** | No |
| **Schema changes authorized** | No |
| **SQL migrations authorized** | No |
| **Route changes authorized** | No |
| **Score logic changes authorized** | No |
| **Predecessor** | `TTP-SCORE-SNAPSHOT-IMPL-001` (all 6 slices `TRUTH_SYNCED`); `TTP-SCORE-SNAPSHOT-RUNTIME-VERIFY-001` (`PRODUCTION_VERIFIED`, commit `9a58b0d`) |

> **DESIGN ARTIFACT ONLY.** This document defines the architecture direction and factor model for
> TexQticScore v2. It does not authorize or request any code, schema, migration, seed, env, runtime,
> or feature flag changes. No implementation slice is opened by this document.

---

## 2. Purpose

This artifact designs the next-generation **TexQticScore v2** as an advisory/readiness score for the
TexQtic TradeTrust Pay platform.

Specifically, this design:

1. Proposes a candidate v2 factor model using only existing on-platform data.
2. Defines the proposed v2 score response contract and bands.
3. Specifies a versioning and coexistence strategy so that v1 (`computeTtpScore` / `TTP_V1`) is
   preserved unchanged until explicitly replaced.
4. Maps how v2 integrates with the existing `ttp_score_snapshots` infrastructure.
5. Records open questions, legal/copy boundaries, and implementation slicing recommendations for
   Paresh's review before any implementation is authorized.

This design does **not** authorize, implement, or modify any code, schema, migration, route, service,
disclaimer text, seed, or feature flag.

---

## 3. Current Repo-Truth Summary

The following is a precise summary of current repo state as verified prior to authoring this document.

### 3.1 `computeTtpScore` — current v1 behavior

- **Location:** `server/src/services/ttpScore.service.ts`
- **Type:** Pure function — deterministic, no DB access, no external API calls, no DB writes.
- **Export:** `computeTtpScore(input: TtpScoreInput): TradeTrustScore`
- **Input:** `TtpScoreInput` — high-level boolean readiness flags assembled from DB state by
  `TtpScoreSnapshotService.assembleTtpScoreInput`. No raw bureau/GST/CIBIL data.
- **Scoring:** 7 factors, 100 pts total. Never throws for missing or null fields.
- **Governance:** TTP Slice 8, `TEXQTIC-TRADETRUST-PAY-DESIGN-001`

### 3.2 Current v1 factor model (100 pts total)

| # | Factor key | Label | Points | Input field | Pass condition |
|---|---|---|---|---|---|
| 1 | `gst_readiness` | GST Verified | 20 | `gst_readiness.is_approved` | GST approved |
| 2 | `eligibility_readiness` | TTP Eligibility | 25 | `eligibility_readiness.is_eligible` | Eligible and not expired |
| 3 | `risk_tier` | Risk Tier | 10 | `eligibility_readiness.risk_tier` | Tier >= 1 (not null, not 0) |
| 4 | `invoice_readiness` | Verified Invoice | 15 | `invoice_readiness.is_verified` | Invoice verified |
| 5 | `vpc_readiness` | Verified Payable Certificate | 15 | `vpc_readiness.is_active` | VPC active or ROUTING_READY |
| 6 | `enrollment_readiness` | TTP Enrollment | 10 | `enrollment_state` | APPROVED or REQUESTED |
| 7 | `routing_readiness` | Partner Routing | 5 | `routing_readiness.found` | Routing stub present |

### 3.3 Current v1 score bands

| Band | Score range |
|---|---|
| `READY` | 80–100 |
| `NEAR_READY` | 60–79 |
| `NEEDS_REVIEW` | 40–59 |
| `NOT_READY` | 0–39 |

### 3.4 Current v1 blockers / next_steps behavior

- **Blockers** accumulate for failed critical factors: missing GST, expired/not-found eligibility,
  risk tier 0 or null, unverified invoice, no/inactive VPC.
- **next_steps** accumulate for improvable state: non-active enrollment, missing routing stub.
- Each factor evaluates independently — no factor throws; missing data yields `FAIL` + blocker.

### 3.5 Current `SCORE_DISCLAIMER`

```
TradeTrust Score is an advisory readiness indicator only. It is not a credit score,
payment guarantee, financing approval, or partner commitment.
```

Exported as `SCORE_DISCLAIMER` constant from `server/src/services/ttpScore.service.ts`.
SHA-256 hash stored in `ttp_score_snapshots.score_disclaimer_hash` on every snapshot write.

### 3.6 Current `TTP_DISCLAIMER_TEXT`

```
TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score,
financing approval, payment guarantee, lending decision, or partner commitment.
```

Exported from `server/src/ttp/ttp.constants.ts`.
SHA-256 hash stored in `ttp_score_snapshots.route_disclaimer_hash` on every snapshot write.

### 3.7 Current `TradeTrustScore` response shape

```typescript
interface TradeTrustScore {
  score: number;           // 0–100 aggregate
  band: 'READY' | 'NEAR_READY' | 'NEEDS_REVIEW' | 'NOT_READY';
  factors: TradeTrustScoreFactor[];
  blockers: string[];
  next_steps: string[];
  disclaimer: string;      // Always SCORE_DISCLAIMER — never omitted
}
```

### 3.8 Current `ttp_score_snapshots` schema and `score_version`

The `ttp_score_snapshots` table exists in production (Supabase) as of Slice 1
(commit `5e8ac44`). Key fields relevant to versioning:

| Column | Type | Notes |
|---|---|---|
| `score_version` | `String` | Currently always `'TTP_V1'` (per OQ-SS-01 design decision). Schema accepts any string — no enum constraint in Prisma. |
| `score_value` | `SmallInt` | Aggregate score 0–100 |
| `score_band` | `String` | Band label string |
| `score_detail_json` | `Json` | `{ factors, blockers, next_steps }` — excludes `score`, `band`, `disclaimer` (OQ-SS-02) |
| `score_disclaimer_hash` | `String` | SHA-256 of `SCORE_DISCLAIMER` |
| `route_disclaimer_hash` | `String` | SHA-256 of `TTP_DISCLAIMER_TEXT` |
| `trigger_event` | `String` | One of `VPC_ISSUED`, `ENROLLMENT_APPROVED`, `ADMIN_REVIEW_COMPLETE` (Wave 2) |

### 3.9 Current `TTP_V1` snapshot trigger events

Three trigger events are active in Wave 2:

| Event | Trigger point | Source route/service |
|---|---|---|
| `VPC_ISSUED` | After VPC generated | `server/src/routes/control/vpc.ts` |
| `ENROLLMENT_APPROVED` | After enrollment approved | `server/src/routes/control/ttp-enrollments.ts` |
| `ADMIN_REVIEW_COMPLETE` | After eligibility assessment created | `server/src/routes/control/ttp-eligibility.ts` |

`PARTNER_TRANSMITTED` is forward-declared in the DB CHECK constraint but has no write path in
Wave 2. Wave 4 only.

### 3.10 Current `score_detail_json` shape

```json
{
  "factors": [ { "key": "...", "label": "...", "points_awarded": 0, "points_possible": 0, "status": "FAIL|PASS|PARTIAL|NOT_APPLICABLE", "explanation": "..." } ],
  "blockers": [ "..." ],
  "next_steps": [ "..." ]
}
```

### 3.11 Current legal status

`LEGAL_REVIEW_PENDING` — external counsel review of `TTP-LEGAL-COPY-COUNSEL-PACKET-001` pending.
Decision token: `TTP_LEGAL_COUNSEL_REVIEW_PACKET_001_READY_FOR_PARESH`.
No live GSTN/CIBIL/bureau/Account Aggregator integrations exist.
No partner transmission exists.
`ttp_enabled=false` globally.

### 3.12 Absence of live external integrations

| Integration | Status |
|---|---|
| GSTN / GST portal live API | Absent — manual GST verification only |
| CIBIL / credit bureau API | Absent — stub data only |
| Account Aggregator framework | Absent — no AA registration, no FIP/FIU |
| Partner outbound HTTP | Absent — `partner_routing_stubs` is readiness evidence only |
| External lender data-sharing | Absent — no partner transmission |

---

## 4. Design Goals

1. **Create a separate v2 score function** — likely `computeTexQticScore` — that is independent of
   `computeTtpScore`. v1 must remain callable and unchanged.
2. **Preserve v1 behavior exactly.** The existing `computeTtpScore` function is the v1 score engine.
   No changes to it are authorized by this design.
3. **Support score version label `TEXQTICSCORE_V2`** so that the snapshot infrastructure
   (which uses `score_version: String`) can distinguish v1 and v2 snapshots without a schema change.
4. **Support future snapshot capture using `ttp_score_snapshots.score_version`** — the column is
   already a plain `String` with no Prisma enum constraint. `'TEXQTICSCORE_V2'` is a valid value today.
5. **Improve factor clarity and extensibility** — v2 should use clearer factor keys and labels, and be
   designed to accept additional on-platform factors more easily as the platform evolves.
6. **Keep v2 advisory and readiness-oriented only.** No credit score, bureau data, underwriting,
   lending, payment guarantee, or partner commitment semantics.
7. **Avoid bureau/GSTN/live external integrations** in this design. v2 is built from data already on
   the TexQtic platform.
8. **Design for internal/control-plane use first.** Tenant-facing or public v2 surfaces require
   separate legal clearance before design.
9. **Avoid underwriting, lending, payment, or custody behavior.** TexQtic does not lend, hold funds,
   act as a payment intermediary, or guarantee payment.

---

## 5. Non-Goals

The following are **explicitly excluded** from this design unit:

| Non-goal | Reason |
|---|---|
| Implementation of `computeTexQticScore` | No implementation authorized in this unit |
| Replacing `computeTtpScore` (v1) immediately | v1 must remain unchanged until a separate migration decision is made |
| Schema changes or new Prisma models | No schema changes authorized |
| SQL migrations | No migrations authorized |
| Live GSTN / GST portal API integration | No-go register; legal + API contract gate |
| Live CIBIL / credit bureau API integration | No-go register; legal + consent + bureau API gate |
| Account Aggregator (AA) framework | No-go register; requires separate full AA design + legal gate |
| Consent tables (`ttp_data_consents`) | Wave 3 only; legal gated |
| Partner workflow design or tables | Wave 4 only; partner gated |
| External lender / partner score sharing | Wave 3/4 only; legal + consent + partner contract gated |
| Tenant-facing or public score history API | `LEGAL_REVIEW_PENDING`; legal clearance required before any public v2 surface |
| Legal copy finalization | `LEGAL_REVIEW_PENDING`; external counsel review required |
| `ttp_enabled` activation | Not authorized by any design unit |
| Opening `TTP-TEXQTICSCORE-V2-IMPL-001` | Not opened by this document; requires Paresh authorization |
| Opening `TTP-SCORE-VERSIONING-IMPL-001` | Not opened by this document; only if design proves necessary |
| Wave 3/4/5 design units | Remain gated |

---

## 6. Proposed v2 Factor Model

This is a candidate factor model only. It is built exclusively from data already available on the
TexQtic platform. No live external data sources are used.

All factors below use data already present in the Supabase database and accessible via existing
Prisma queries. No new schema additions are required by this factor design.

### 6.1 Factor table

| # | Factor key | Label | Max pts | Data source | Buyer visible | Seller visible | Sensitivity | Legal/copy caution |
|---|---|---|---|---|---|---|---|---|
| 1 | `gst_verification` | GST Verification Status | 20 | `gst_verifications.review_outcome` | No (suppress raw outcome) | High-level flag only | Medium — public business reg | Do not expose raw outcome or admin notes |
| 2 | `eligibility_status` | Eligibility Assessment | 25 | `ttp_eligibility_assessments` (latest) | No | High-level flag only | Medium | Do not expose risk tier to tenant; advisory only |
| 3 | `risk_tier` | Risk Classification | 10 | `ttp_eligibility_assessments.risk_tier` | No | No | High — internal only | Must not be surfaced to tenant or buyer without consent design + legal clearance |
| 4 | `invoice_verification` | Invoice Verification Readiness | 15 | `invoices.is_verified` (or equivalent) | Yes — high-level | Yes — high-level | Low | Safe to surface as boolean readiness indicator |
| 5 | `vpc_issuance` | VPC Issuance Readiness | 15 | `verified_payable_certificates` (latest active/routing-ready) | Yes — high-level | Yes — high-level | Low | "Payable Certificate" branding only; not a financial instrument claim |
| 6 | `enrollment_status` | TTP Enrollment Status | 10 | `ttp_enrollment_logs` (latest to_state) | No | High-level flag only | Medium | State label must not imply financial approval |
| 7 | `routing_readiness` | Partner Routing Readiness | 5 | `partner_routing_stubs` (present/absent for VPC) | No | No — internal only | Low | `partner_routing_stubs` is readiness evidence only; must not imply active partner engagement |

**Total: 100 pts** — same weight distribution as v1 for maximum comparison continuity.

### 6.2 Factor model changes from v1 → v2

| v1 key | v2 key | Change type | Reason |
|---|---|---|---|
| `gst_readiness` | `gst_verification` | Rename only | Clearer — "readiness" implied double meaning |
| `eligibility_readiness` | `eligibility_status` | Rename only | Separates assessment status from readiness concept |
| `risk_tier` | `risk_tier` | Unchanged | Correct — tier number is the signal |
| `invoice_readiness` | `invoice_verification` | Rename only | Clearer — verification is the specific signal |
| `vpc_readiness` | `vpc_issuance` | Rename only | "Issuance" better reflects the business event |
| `enrollment_readiness` | `enrollment_status` | Rename only | State-based signal |
| `routing_readiness` | `routing_readiness` | Unchanged | Correct as-is |

> **All changes are renames only in this candidate model.** Scoring logic, weights, and pass
> conditions are preserved from v1 to allow direct A/B comparison during validation.
> The implementation design may diverge from this candidate; decisions require Paresh approval.

### 6.3 Optional future factors (design horizon only — not in this unit)

The following are documented for design awareness. None are implemented or authorized here.

| Factor | Data source | Condition for inclusion |
|---|---|---|
| Snapshot history depth | `ttp_score_snapshots` count | Availability of prior snapshots may indicate established readiness history |
| Document completeness | Additional document/compliance fields if added to platform | Only if data exists on-platform without new external integrations |
| Trade volume evidence | `trades` table count/state | Only if product approves buyer activity signals in score |
| Eligibility recency | `ttp_eligibility_assessments.assessed_at` | Freshness signal — separate from expired/not-expired |

---

## 7. Proposed v2 Score Bands

### 7.1 Candidate band labels

The following bands are proposed as the v2 candidate, preserving v1 labels for continuity:

| Band | Score range | Rationale |
|---|---|---|
| `READY` | 80–100 | All or nearly all factors satisfied; strong readiness signal |
| `NEAR_READY` | 60–79 | Most factors satisfied; one or two items to address |
| `NEEDS_REVIEW` | 40–59 | Multiple factors requiring attention; readiness incomplete |
| `NOT_READY` | 0–39 | Foundational factors missing; readiness is low |

### 7.2 Band labelling constraints

The following labels are **forbidden** in any v2 band implementation:

- Any label implying credit approval: `CREDITWORTHY`, `APPROVED`, `QUALIFIED`, etc.
- Any label implying financing: `FINANCEABLE`, `DISCOUNTABLE`, `ELIGIBLE_FOR_FINANCE`, etc.
- Any label implying payment guarantee: `PAYMENT_GUARANTEED`, `GUARANTEED`, etc.
- Any label implying partner commitment: `PARTNER_READY` (unless explicitly legal-cleared), `LENDER_APPROVED`, etc.
- Any label implying underwriting outcome: `UNDERWRITTEN`, `RISK_ASSESSED`, etc.

### 7.3 Decision required before implementation

Whether to keep `READY/NEAR_READY/NEEDS_REVIEW/NOT_READY` or rename bands is an open question
(see §15, OQ-V2-04). No band change is implemented by this unit.

---

## 8. Proposed v2 Response Contract

This is a **design-only candidate**. No response contract changes are implemented in this unit.
No existing route responses are modified.

### 8.1 Candidate v2 response shape

```typescript
interface TexQticScoreV2 {
  /** Aggregate advisory readiness score, 0–100. */
  score: number;
  /** Score band label. */
  band: 'READY' | 'NEAR_READY' | 'NEEDS_REVIEW' | 'NOT_READY';
  /** Score version identifier — distinguishes from v1. */
  version: 'TEXQTICSCORE_V2';
  /** Individual factor breakdown. */
  factors: TexQticScoreV2Factor[];
  /** Items blocking higher readiness. */
  blockers: string[];
  /** Actionable steps to improve readiness. */
  next_steps: string[];
  /**
   * MANDATORY advisory disclaimer.
   * Must be present in every response — never omit.
   * Final wording requires legal clearance (LEGAL_REVIEW_PENDING).
   */
  disclaimer: string;
  /**
   * Optional: ID of the most recently captured snapshot for this org.
   * Only included if caller is admin-authenticated and snapshots exist.
   * Requires separate implementation authorization.
   */
  latest_snapshot_id?: string;
}

interface TexQticScoreV2Factor {
  key: string;
  label: string;
  points_awarded: number;
  points_possible: number;
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_APPLICABLE';
  explanation: string;
}
```

### 8.2 Snapshot `score_detail_json` mapping for v2

If v2 snapshots are captured (future, separately authorized), `score_detail_json` would store:

```json
{
  "factors": [ { "key": "...", "label": "...", "points_awarded": 0, "points_possible": 0, "status": "PASS", "explanation": "..." } ],
  "blockers": [ "..." ],
  "next_steps": [ "..." ]
}
```

This is the same shape as v1 (OQ-SS-02 design decision). The `version` field is captured via
`score_version = 'TEXQTICSCORE_V2'` column — not inside `score_detail_json`.

### 8.3 Constraints on response contract

- `score` and `band` must never be omitted.
- `disclaimer` must be present in every response — never optional.
- `version: 'TEXQTICSCORE_V2'` must be present to distinguish from v1 responses.
- `latest_snapshot_id` may only be included for admin-authenticated callers.
- No raw bureau data, raw GST data, CIBIL output, admin notes, or PAN data in any response field.
- `risk_tier` numeric value must not appear in buyer-visible responses.
- No response field may imply underwriting, lending, payment guarantee, or partner commitment.

---

## 9. Versioning and Coexistence with v1

### 9.1 Coexistence model

| Dimension | v1 (`TTP_V1`) | v2 (`TEXQTICSCORE_V2`) |
|---|---|---|
| Function | `computeTtpScore` (existing) | `computeTexQticScore` (new, future) |
| Input type | `TtpScoreInput` (existing) | `TexQticScoreInput` (new, to be defined) |
| Return type | `TradeTrustScore` (existing) | `TexQticScoreV2` (new candidate, §8.1) |
| Score version string | `'TTP_V1'` | `'TEXQTICSCORE_V2'` |
| `ttp_score_snapshots.score_version` | `'TTP_V1'` | `'TEXQTICSCORE_V2'` (future) |
| Status | Preserved unchanged | Not yet implemented |

### 9.2 No destructive migration

- **v1 snapshots are never backfilled or converted.** Rows with `score_version = 'TTP_V1'` remain as-is.
- **v1 API responses are not modified.** Any existing routes returning `TradeTrustScore` continue to
  return `TradeTrustScore` until an explicit migration decision is made and authorized.
- **`computeTtpScore` is not modified or deprecated.** It may remain callable in parallel with v2.
- **No forced backfill** unless separately designed and approved by Paresh.

### 9.3 Dual-run validation strategy (design intent)

Before any API route is switched from v1 to v2:

1. Both `computeTtpScore` and `computeTexQticScore` are called on the same input in a staging or
   test context.
2. Outputs are compared — differences in score, band, factors, blockers, next_steps are logged.
3. Regressions relative to v1 are resolved before any v2 response is surfaced to any route.
4. A production dual-run period (logging both scores without returning v2 to API callers) is the
   recommended pre-switchover validation approach.

This dual-run step is not implemented in this unit. It is a design recommendation for the
implementation team during `TTP-TEXQTICSCORE-V2-IMPL-001`.

### 9.4 Snapshot version distinction

The `ttp_score_snapshots.score_version` column is already a plain `String` (not a Prisma enum). This
means `'TEXQTICSCORE_V2'` is a valid value today without a schema migration. However:

- **No snapshot is written with `score_version = 'TEXQTICSCORE_V2'`** until the implementation slice
  is authorized and the v2 function exists.
- **Admin read endpoints (`GET /api/control/ttp/score-snapshots/:orgId`)** already support filtering
  by `trigger_event`; they would support `score_version` filtering after a minor route extension
  (which requires its own implementation authorization).

---

## 10. Snapshot Integration Design

### 10.1 How v2 integrates with existing snapshot infrastructure

The `TtpScoreSnapshotService` (`server/src/services/ttpScoreSnapshot.service.ts`) currently:
- Calls `computeTtpScore` to produce v1 scores
- Writes `score_version: 'TTP_V1'` on every row
- Stores `score_detail_json: { factors, blockers, next_steps }`

When v2 is implemented (future, separately authorized):
- A new path in `TtpScoreSnapshotService` would call `computeTexQticScore` instead
- Would write `score_version: 'TEXQTICSCORE_V2'`
- `score_detail_json` shape remains the same (`{ factors, blockers, next_steps }`)
- No new columns needed unless design decides v2 factor detail requires separate storage

### 10.2 Preserving v1 snapshots

All existing `ttp_score_snapshots` rows with `score_version = 'TTP_V1'` are preserved. Admin read
endpoints continue to return them unmodified.

### 10.3 No immediate schema change required

The current `ttp_score_snapshots` schema supports `TEXQTICSCORE_V2` without modification:
- `score_version String` — no enum constraint; any string value valid
- `score_detail_json Json` — same shape for v1 and v2 candidate
- `score_value SmallInt`, `score_band String` — identical semantics

If the implementation design discovers that v2 needs a new column (e.g., a dedicated `factor_model_version`
or a separate v2 `score_detail_json` field), a schema change authorization will be required via the
standard SQL-first approach. This document does not pre-authorize any such change.

### 10.4 Trigger events for v2 snapshots

V2 snapshots would use the same trigger events as v1 (`VPC_ISSUED`, `ENROLLMENT_APPROVED`,
`ADMIN_REVIEW_COMPLETE`). The `PARTNER_TRANSMITTED` event remains Wave 4 only and is not activated
by this design.

### 10.5 Admin read endpoints for v2 snapshots

The existing `SNAPSHOT_SELECT` projection in the admin read route intentionally excludes
`score_detail_json`. This is a safe projection for both v1 and v2 snapshots. Any change to expose
`score_detail_json` or filter by `score_version` in the admin read endpoint requires a separate
implementation authorization.

---

## 11. Legal and Copy Boundaries

| Boundary | Status |
|---|---|
| Legal review | `LEGAL_REVIEW_PENDING` — external counsel has not reviewed TexQticScore v2 wording |
| v2 is not a credit score | Absolute invariant — must appear in disclaimer of every v2 response |
| v2 is not a CIBIL/bureau score | Absolute invariant — no bureau data used; must be clear in any tenant/public surface |
| v2 is not underwriting | Absolute invariant — advisory and readiness-oriented only |
| v2 is not financing approval | Absolute invariant — no partner, lender, or financing commitment |
| v2 is not a payment guarantee | Absolute invariant — TexQtic does not guarantee payment |
| Tenant-facing / public v2 surfaces | **Require legal clearance** before any design or implementation of tenant-visible v2 score surfaces |
| External lender/partner score sharing | **Forbidden** until consent + partner gates cleared (Wave 3/4) |
| Factor visibility to buyers | **Requires separate design decision** — risk tier must never be buyer-visible |
| Disclaimer final wording | **Requires legal clearance** — current `SCORE_DISCLAIMER` text is interim; final text awaits `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` sign-off |
| Score band labels | Must not imply credit approval, underwriting, payment guarantee, or financing commitment |
| Score explanation text (factor-level) | Must not reference bureau, CIBIL, GSTN raw data, or admin notes |

---

## 12. Data and Privacy Boundaries

The following data handling boundaries apply to any v2 implementation:

| Boundary | Rule |
|---|---|
| Raw GST data | Never included in score response or `score_detail_json` |
| PAN data | Never included in score response or `score_detail_json` |
| Raw CIBIL / bureau data | Never used (no bureau integration exists); never stored in score detail |
| Raw eligibility assessment fields | Only `eligibility_outcome` and `risk_tier` (high-level), never raw admin notes or `raw_bureau_json` |
| `raw_verification_json` / `raw_bureau_json` | Absolutely excluded from all v2 score inputs and outputs |
| Admin notes | Never included in score factor explanation or snapshot detail |
| Partner payloads | None exist; none to include |
| Buyer-visible factor fields | Limited to: GST (boolean), eligibility (boolean), invoice (boolean), VPC (boolean). Risk tier must not be buyer-visible. |
| Seller-visible factor fields | Same as buyer; risk tier must not be seller-visible without separate consent/legal approval |
| Internal / control-plane fields | Factor detail may be richer for admin views; must still exclude raw bureau/GST/CIBIL/admin notes |
| `org_id` tenant scoping | Every score computation and snapshot write must be scoped by `org_id`. This is constitutional. |

---

## 13. Implementation Slicing Recommendation

The following implementation slices are **recommended** for future consideration. **None are opened
by this document.** Each requires explicit Paresh authorization before any design or implementation
prompt is opened.

| Suggested slice | Purpose | Status | Gate |
|---|---|---|---|
| `TTP-TEXQTICSCORE-V2-OPTIONS-AUDIT-001` | Survey open questions and produce a short options doc for each unresolved question | **COMPLETE** — commit `07a7e82` | This design approved by Paresh |
| `TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001` | Record Paresh's decisions on OQ-V2-01 through OQ-V2-09 | **COMPLETE** — `PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001` | Options audit complete |
| `TTP-TEXQTICSCORE-V2-SERVICE-001` | Implement `computeTexQticScore` + types + constants + unit tests; no routes, no snapshots, no schema | `NOT_OPENED` | Design decisions recorded + explicit Paresh authorization |
| `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` | Extend `TtpScoreSnapshotService` for `TEXQTICSCORE_V2`; dual-run logging strategy + v2 snapshot persistence | `NOT_OPENED` | v2 service unit verified + Paresh authorization |
| `TTP-TEXQTICSCORE-V2-ADMIN-READ-001` | Extend admin snapshot read endpoints to filter/label by `score_version` (if needed) | `NOT_OPENED` | Snapshot integration authorized + Paresh authorization |
| `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` | Tenant-visible v2 score surface | `LEGAL_GATED__NOT_OPENED` | **Legal clearance required (`LEGAL_REVIEW_PENDING` resolved)** + Paresh authorization |
| `TTP-SCORE-VERSIONING-IMPL-001` | `score_version` migration/constraint work if current schema proves insufficient | `NOT_OPENED` | Only if implementation discovers current `String` type insufficient |

> Paresh must explicitly authorize each slice. No slice is auto-opened.
> `TTP-TEXQTICSCORE-V2-OPTIONS-AUDIT-001` and `TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001` are now COMPLETE.

---

## 14. Testing and Verification Plan

The following tests are required when implementation is authorized. None are implemented in this unit.

| Test category | Required tests |
|---|---|
| **v1 regression** | All 19 existing `ttpScore.service` unit tests must continue to pass after v2 function is added. `computeTtpScore` must not be modified. |
| **v2 factor calculation** | Unit tests for every factor in `computeTexQticScore`: PASS/FAIL/PARTIAL cases; null/undefined input; zero-point inputs; boundary conditions. |
| **v2 band tests** | Score values at each band boundary (39/40, 59/60, 79/80, 100). |
| **v2 blocker/next_steps tests** | Each blocker emitted correctly for each failure mode; next_steps emitted correctly for partial states. |
| **v2 snapshot compatibility** | `score_version = 'TEXQTICSCORE_V2'` written correctly; `score_detail_json` shape validated; v1 snapshots unaffected by v2 snapshot writes. |
| **No sensitive data exposure** | Unit test that no response field contains raw bureau data, raw GST data, CIBIL data, admin notes, or PAN. |
| **No forbidden wording** | Test that `disclaimer` field contains required advisory language; test that no v2 output contains forbidden terms (underwriting, credit-approved, guaranteed, etc.). |
| **v1/v2 dual-run parity** | Test that v2 produces ≥ v1 score for all-factor-pass input; test that differences are logged and do not cause API errors. |
| **`org_id` scoping** | Every test case must pass an `orgId` and verify it propagates to snapshot writes. |
| **Production / runtime verification** | Runtime verification required after any route changes or new endpoints are live — production proof needed before closure. |

---

## 15. Design Decisions — Resolved

> **All 9 open questions are resolved.** Decisions recorded in:
> `PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001`

The following table summarizes the decisions. Full rationale, implementation consequences, and AF items
are in the decision record artifact.

| OQ-ID | Question | Selected Option | Decision Summary |
|---|---|---|---|
| OQ-V2-01 | Factor keys and weights | **Option A** — 1:1 rename | Same 7 factors, same 100pt weights, same pass conditions; key renames only (`gst_readiness→gst_verification`, `eligibility_readiness→eligibility_status`, `invoice_readiness→invoice_verification`, `vpc_readiness→vpc_issuance`, `enrollment_readiness→enrollment_status`; `risk_tier` and `routing_readiness` unchanged) |
| OQ-V2-02 | Band labels | **Option A** — keep current | `READY/NEAR_READY/NEEDS_REVIEW/NOT_READY` and band thresholds unchanged |
| OQ-V2-03 | v2 disclaimer text | **Option B** — new `TEXQTICSCORE_V2_DISCLAIMER` | New constant in future service slice; preferred location `server/src/ttp/ttp.constants.ts`; marked `LEGAL_REVIEW_PENDING`; do NOT change `SCORE_DISCLAIMER` or `TTP_DISCLAIMER_TEXT` |
| OQ-V2-04 | Admin-only first or tenant-parallel | **Option A** — admin/internal only | No tenant-facing surface, no public v2 score, no tenant score history until legal clearance + Paresh approval |
| OQ-V2-05 | Dual-run before API switch | **Option A** — dual-run v1/v2 | Compute and log both; return v1 until separate explicit switch authorization; dual-run strategy defined in `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` |
| OQ-V2-06 | Schema sufficiency | **Option A** — current schema sufficient | No schema migration required; DB `CHECK` already allows `TEXQTICSCORE_V2`; `TTP-SCORE-VERSIONING-IMPL-001` remains `NOT_OPENED` |
| OQ-V2-07 | Legal gate scope | **Option A** — legal gates tenant/public only | Backend/internal/admin-only v2 implementation may proceed while `LEGAL_REVIEW_PENDING`; tenant/public surface remains `LEGAL_GATED__NOT_OPENED` |
| OQ-V2-08 | Tenant factor detail exposure | **Option A** — no tenant exposure | `score_detail_json` admin/internal-only; `risk_tier` never buyer/seller visible without legal/consent design; no tenant factor detail route or tenant score history route |
| OQ-V2-09 | Snapshot persistence timing | **Option B** — service-only first | `TTP-TEXQTICSCORE-V2-SERVICE-001` = function + types + constants + tests only; `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` = separate later slice for dual-run and persistence |

---

## 16. No-Go Boundaries

The following are **unconditionally forbidden** by this unit and by any unit that proceeds from this
design without explicit Paresh authorization:

| No-go | Authority |
|---|---|
| Implementation of `computeTexQticScore` in this unit | This is design-only |
| Schema / SQL / migration changes in this unit | This is design-only |
| Prisma commands of any kind | This is design-only |
| Route changes or new routes | This is design-only |
| Score logic changes to `computeTtpScore` | v1 must remain unchanged |
| v1 replacement or deprecation | Not authorized |
| Legal approval claim | `LEGAL_REVIEW_PENDING` |
| Live GSTN / CIBIL / bureau / AA integration | No-go register; legal + contract gates |
| External lender / partner score sharing | No-go register; legal + consent + partner contract gates |
| Payment / lending / underwriting / custody behavior | Doctrine — TexQtic does not lend, hold funds, or guarantee payment |
| `ttp_enabled` activation or change | Not authorized by any design unit |
| `TenantFeatureOverride` row creation, modification, or deletion | Not authorized |
| `.env` / environment variable modifications | Forbidden |
| Tenant-facing score history without legal clearance | `LEGAL_REVIEW_PENDING` |
| Any implementation slice auto-opened | No implementation slice is opened by this document |

---

## 17. Final Decision

```
TTP_TEXQTICSCORE_V2_DESIGN_001_READY_FOR_PARESH_REVIEW
TTP_TEXQTICSCORE_V2_DESIGN_001_DECISIONS_RECORDED_READY_FOR_IMPLEMENTATION_PLANNING
```

**Authority:** Paresh Sharma — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Legal status:** `LEGAL_REVIEW_PENDING` — UNCHANGED  
**Files changed by this document:** This document only  
**Implementation authorized:** No  
**Schema authorized:** No  
**SQL migrations authorized:** No  
**Route changes authorized:** No  
**Score logic changes authorized:** No  
**Wave 2 implementation slices opened:** None — `TTP-TEXQTICSCORE-V2-SERVICE-001` is the next candidate pending explicit Paresh authorization  
**Wave 3/4/5 units opened:** None  
**Design decisions recorded:** All 9 OQs resolved — `PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001`

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*This document does not authorize any implementation. All waves require Paresh approval of the design*  
*artifact and open questions before any implementation prompt may be opened.*
