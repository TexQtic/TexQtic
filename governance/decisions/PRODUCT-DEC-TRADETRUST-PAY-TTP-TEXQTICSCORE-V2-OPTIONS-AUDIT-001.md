# PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-OPTIONS-AUDIT-001

**Unit ID:** `TTP-TEXQTICSCORE-V2-OPTIONS-AUDIT-001`
**Document type:** Governance / Repo-Truth Audit — Options Document for Paresh
**Date:** 2026-07-05
**Decision Owner:** Paresh Patel — TexQtic founder / operator
**Author:** GitHub Copilot — TexQtic Safe-Write Mode
**`ttp_enabled` state:** `false` — UNCHANGED by this document
**`LEGAL_REVIEW_PENDING`:** UNCHANGED — this document does not resolve or modify legal review status
**Code changes:** None — governance/audit artifact only
**Schema / migration changes:** None
**Implementation authorized:** No — this document opens no implementation slice
**Design document audited:** `governance/TTP-TEXQTICSCORE-V2-DESIGN-001.md` (commit `0f68754`)

> **REPO-TRUTH AUDIT.** This document answers open questions OQ-V2-01 through OQ-V2-09 from
> `TTP-TEXQTICSCORE-V2-DESIGN-001.md` and records nine additional audit findings (AF-V2-01
> through AF-V2-09) identified during source inspection. It provides concrete, repo-truth-backed
> options and Paresh-directed recommendations for each. No implementation slice is opened.

---

## §1 — Document Metadata

| Field | Value |
|---|---|
| **Unit ID** | `TTP-TEXQTICSCORE-V2-OPTIONS-AUDIT-001` |
| **Type** | Repo-Truth Audit / Options Document |
| **Phase** | Phase 2 — Wave 2 score architecture |
| **TQs** | TQ-11 (TexQticScore v2 factor model), TQ-12 (score versioning / coexistence) |
| **Date** | 2026-07-05 |
| **Decision owner** | Paresh Patel |
| **Preceded by** | `TTP-TEXQTICSCORE-V2-DESIGN-001` (status: `TTP_TEXQTICSCORE_V2_DESIGN_001_READY_FOR_PARESH_REVIEW`) |
| **Follows** | `TTP-SCORE-SNAPSHOT-RUNTIME-VERIFIED-001` (`PRODUCTION_VERIFIED`, commit `9a58b0d`) |
| **`ttp_enabled`** | `false` — UNCHANGED |
| **Legal status** | `LEGAL_REVIEW_PENDING` — UNCHANGED |
| **Code changes authorized** | None |
| **Schema / migration changes** | None |
| **Implementation slices opened** | None |
| **Decision token** | `TTP_TEXQTICSCORE_V2_OPTIONS_AUDIT_001_COMPLETE` |

---

## §2 — Audit Purpose and Constraints

### 2.1 Purpose

This artifact answers the nine open questions (OQ-V2-01 through OQ-V2-09) from
`TTP-TEXQTICSCORE-V2-DESIGN-001.md §15`, validates whether each design assumption matches current
repository truth, and provides concrete options with a recommended decision for Paresh to approve
before any `TTP-TEXQTICSCORE-V2-IMPL-001` slice is opened.

Additionally, nine additional audit findings (AF-V2-01 through AF-V2-09) are recorded that were
identified during source inspection but are not covered by the original open questions.

### 2.2 Mandatory constraints — unchanged throughout

| Invariant | Confirmed state |
|---|---|
| `ttp_enabled` | `false` — all 13 TTP routes return HTTP 503 `FEATURE_DISABLED` |
| `LEGAL_REVIEW_PENDING` | Active — external counsel review pending per `TTP-LEGAL-COPY-COUNSEL-PACKET-001` |
| Code changes authorized | **No** — audit only |
| Schema / SQL / migration changes | **No** |
| Prisma commands | **None issued** |
| Route changes | **No** |
| Score logic changes to `computeTtpScore` | **No** — v1 remains unchanged |
| Implementation slices opened | **None** |

---

## §3 — Repo-Truth Evidence Sources

The following files were read in full or in part during this audit session and the preceding
session (summarized). All findings below are backed by exact line references to these files.

| File | Lines read | Role in audit |
|---|---|---|
| `server/src/services/ttpScore.service.ts` | Full (~350 lines) | v1 factor model, weights, bands, SCORE_DISCLAIMER constant |
| `server/src/services/ttpScoreSnapshot.service.ts` | Full (~350 lines) | score_version hardcoding, assembleTtpScoreInput, trigger events, DB write model |
| `server/src/services/ttpSummary.service.ts` | Full (~380 lines) | Tenant summary service, second independent score assembly path, dual blockers pattern |
| `server/src/services/partnerRouting.service.ts` | Lines 1–150 | routing_readiness data source, PARTNER_ROUTING_DISCLAIMER |
| `server/src/routes/control/ttp-score-snapshots.ts` | Lines 1–150 | SNAPSHOT_SELECT projection, admin-only auth, score_detail_json exclusion |
| `server/src/__tests__/ttp-score.service.unit.test.ts` | Lines 1–100 | Exact test case listing (TC-S-001 to TC-S-019), fixture structure |
| `server/src/__tests__/ttp-score-snapshot.service.unit.test.ts` | Pattern search | score_version=TTP_V1 in 5 snapshot test files (59 total tests, PRODUCTION_VERIFIED) |
| `server/prisma/schema.prisma` | Lines 1677–1720 | ttp_score_snapshots model — score_version String, score_detail_json Json |
| `server/src/ttp/ttp.constants.ts` | Lines 300–320 | TTP_DISCLAIMER_TEXT constant, LEGAL_REVIEW_PENDING status |
| `governance/TTP-TEXQTICSCORE-V2-DESIGN-001.md` | Full (17 sections) | Design assumptions and open questions being audited |
| `governance/TTP-SCORE-SNAPSHOT-DESIGN-001.md` | Lines 114–250, grep | score_version CHECK constraint specification, DB-level values |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001.md` | Lines 1–120 | OQ-SS-01 through OQ-SS-03 decisions confirming score_detail_json, dual hash columns |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-RUNTIME-VERIFIED-001.md` | Lines 1–80 | PRODUCTION_VERIFIED record, 59/59 tests, tsc clean, confirmed slice list |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-LEGAL-COUNSEL-REVIEW-PACKET-001.md` | Lines 1–80 | Legal review status, SCORE_DISCLAIMER and TTP_DISCLAIMER_TEXT both LEGAL_REVIEW_PENDING |

---

## §4 — Open Question Audit: OQ-V2-01 through OQ-V2-09

---

### OQ-V2-01 — Exact v2 factor keys and weights: keep 1:1 with v1, or change?

**Design assumption:** v2 = same 7 factors, same 100pt weights, renames only.

#### Repo-truth evidence

Current v1 factor keys, labels, and weights in `ttpScore.service.ts` (verified exact):

| # | v1 key | v1 code label | Pts | Pass condition (exact code) |
|---|---|---|---|---|
| 1 | `gst_readiness` | "GST Verified" | 20 | `gst_readiness.is_approved === true` |
| 2 | `eligibility_readiness` | "TTP Eligibility" | 25 | `is_eligible && !is_expired && found` |
| 3 | `risk_tier` | "Risk Tier" | 10 | `risk_tier >= 1` (null or 0 = FAIL) |
| 4 | `invoice_readiness` | "Verified Invoice" | 15 | `invoice_readiness.is_verified` |
| 5 | `vpc_readiness` | "Verified Payable Certificate" | 15 | `vpc_readiness.is_active` (ACTIVE or ROUTING_READY) |
| 6 | `enrollment_readiness` | "TTP Enrollment" | 10 | `enrollment_state in {APPROVED, REQUESTED}` |
| 7 | `routing_readiness` | "Partner Routing" | 5 | `routing_readiness.found` |

Total: 100 pts. Bands: READY (80–100), NEAR_READY (60–79), NEEDS_REVIEW (40–59), NOT_READY (0–39).

Proposed v2 renames from `TTP-TEXQTICSCORE-V2-DESIGN-001.md §6.2`:

| v1 key | v2 key | Change |
|---|---|---|
| `gst_readiness` | `gst_verification` | Rename |
| `eligibility_readiness` | `eligibility_status` | Rename |
| `risk_tier` | `risk_tier` | Unchanged |
| `invoice_readiness` | `invoice_verification` | Rename |
| `vpc_readiness` | `vpc_issuance` | Rename |
| `enrollment_readiness` | `enrollment_status` | Rename |
| `routing_readiness` | `routing_readiness` | Unchanged |

**Minor discrepancy found:** The v1 *label* string for factor 5 in code is `"Verified Payable Certificate"`, not `"VPC Readiness"` as earlier draft notes implied. The v2 design correctly uses `vpc_issuance` as the key and `"VPC Issuance Readiness"` as the proposed label — both are improvements. This is not a blocker.

#### Options

| Option | Description | Risk |
|---|---|---|
| **A ⭐** | 1:1 rename only — same 7 factors, same weights, same pass conditions | Zero regression risk; direct score parity with v1 for identical input |
| B | Adjust factor weights while keeping same 7 factors | Breaks direct v1/v2 score comparison; requires re-validation of all band thresholds |
| C | Add or remove factors | Fundamentally changes score range dynamics; requires new band design; higher legal/copy review surface |

#### Recommendation

**Option A — strongly recommended.**
Same weights and pass conditions guarantee that `computeTexQticScore` and `computeTtpScore` produce
identical aggregate scores for identical inputs. This is the foundation for a meaningful dual-run
validation (see OQ-V2-05). Factor key renames do not affect scoring logic and improve API clarity.
Options B and C require materially more design work and should only be considered for a future
`TTP-TEXQTICSCORE-V3` after v2 is stable.

---

### OQ-V2-02 — Keep current 4-band labels or rename?

**Design assumption:** Same 4 bands — `READY/NEAR_READY/NEEDS_REVIEW/NOT_READY` — carried forward.

#### Repo-truth evidence

Band thresholds in `computeTtpScore` (verified from TC-S-017 test comment and code):

| Band | Range | Legal risk |
|---|---|---|
| `READY` | 80–100 | None — describes readiness, not credit approval |
| `NEAR_READY` | 60–79 | None — describes readiness gradient |
| `NEEDS_REVIEW` | 40–59 | None — advisory and informational |
| `NOT_READY` | 0–39 | None — factual absence of readiness signals |

No band label uses forbidden terms: CREDITWORTHY, APPROVED, QUALIFIED, ELIGIBLE_FOR_FINANCE,
PAYMENT_GUARANTEED, UNDERWRITTEN, or similar. All labels are readiness descriptors only.

#### Options

| Option | Description | Risk |
|---|---|---|
| **A ⭐** | Keep `READY/NEAR_READY/NEEDS_REVIEW/NOT_READY` | Zero change; direct v1/v2 band comparison enabled |
| B | New labels (e.g., STRONG/MODERATE/PARTIAL/INSUFFICIENT) | Breaks band-level v1/v2 comparison; requires legal review of new label text |

#### Recommendation

**Option A — recommended.** Current labels carry no legal risk (verified above), enable direct
v1/v2 parity checking in dual-run, and require no legal review. If legal counsel recommends
alternative labels after `TTP-LEGAL-COUNSEL-REVIEW-PACKET-001` sign-off, relabelling is a
future single-file change. There is no reason to incur label-change risk in v2 launch.

---

### OQ-V2-03 — What v2 disclaimer text?

**Design assumption:** Reuse current `SCORE_DISCLAIMER` internally pending legal; new v2-specific
disclaimer required before any tenant/public surface.

#### Repo-truth evidence

Exact current constants:

**`SCORE_DISCLAIMER`** (file-scoped in `server/src/services/ttpScore.service.ts`):
```
TradeTrust Score is an advisory readiness indicator only. It is not a credit score,
payment guarantee, financing approval, or partner commitment.
```

**`TTP_DISCLAIMER_TEXT`** (exported from `server/src/ttp/ttp.constants.ts`):
```
TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score,
financing approval, payment guarantee, lending decision, or partner commitment.
```

**Key finding:** Neither constant uses "TexQticScore" branding. `SCORE_DISCLAIMER` brands the
product "TradeTrust Score". `TTP_DISCLAIMER_TEXT` brands it "TradeTrust Pay readiness signals".
If v2 is branded "TexQticScore v2", both are off-brand as a default disclaimer.

Both constants are `LEGAL_REVIEW_PENDING` per `TTP-LEGAL-COPY-COUNSEL-PACKET-001`.

SHA-256 hashes of both constants are already stored in `ttp_score_snapshots` on every snapshot
write (`score_disclaimer_hash`, `route_disclaimer_hash`). Any new v2 disclaimer constant will
need its own hash column or reuse one of the existing columns with updated text.

#### Options

| Option | Description | Risk |
|---|---|---|
| A | Keep current `SCORE_DISCLAIMER` for v2 internally | Branding inconsistency ("TradeTrust Score" vs "TexQticScore v2"); acceptable for internal/admin-only use |
| **B ⭐** | Define new `TEXQTICSCORE_V2_DISCLAIMER` constant in `ttp.constants.ts`; mark `LEGAL_REVIEW_PENDING`; reuse same advisory language pattern | Clean brand separation; forces a governance decision on text before implementation |
| C | Wait for legal clearance before defining any disclaimer | Blocks any implementation until legal sign-off |

#### Recommendation

**Option B — recommended.** Define `TEXQTICSCORE_V2_DISCLAIMER` in `server/src/ttp/ttp.constants.ts`
as part of `TTP-TEXQTICSCORE-V2-SERVICE-001`. Use the same language pattern as `SCORE_DISCLAIMER`
but reference "TexQticScore" by name. Mark it `LEGAL_REVIEW_PENDING`. Compute and store its
SHA-256 hash in `score_disclaimer_hash` for v2 snapshots (the column is generic enough to hold
any disclaimer hash). This is a forward-looking design: the constant text can be revised after
legal clearance without changing the snapshot column structure.

**Additional design note (see AF-V2-03):** Whether v2 needs a new `score_disclaimer_hash` column or
can reuse the existing `score_disclaimer_hash` column (storing the hash of `TEXQTICSCORE_V2_DISCLAIMER`
instead of `SCORE_DISCLAIMER`) is a snapshot integration design decision. The column name is
already generic enough to hold either hash.

---

### OQ-V2-04 — Admin-only first, or tenant-facing in parallel?

**Design assumption:** Admin/control-plane only. No tenant surface until legal clearance.

#### Repo-truth evidence

`server/src/routes/control/ttp-score-snapshots.ts` (confirmed):
- Both snapshot routes require `requireAdminRole('SUPER_ADMIN')` + `ttpFeatureGateMiddleware`
- Route file header comment: `"LEGAL_REVIEW_PENDING remains unresolved — tenant score-history endpoints are intentionally withheld from this slice and must not be added here."`
- `SNAPSHOT_SELECT` projection confirmed: `score_detail_json` is **excluded** — comment: `"score_detail_json is intentionally excluded — reserved for future auditable surface."`
- `ttp_enabled=false` globally — `ttpFeatureGateMiddleware` returns 503 on all routes including admin routes

No tenant-facing TTP score history endpoint exists anywhere in the codebase.

`TtpSummaryService.getTradeTtpSummary` does include `trade_trust_score` (v1 score object) in its
response, but this service is only invoked via a TTP tenant route, which is blocked by
`ttp_enabled=false`.

#### Options

| Option | Description | Risk |
|---|---|---|
| **A ⭐** | Admin/control-plane only first. Tenant surface requires separate legal clearance + design. | Zero legal risk for internal implementation |
| B | Design tenant-facing v2 surface in parallel | Requires `LEGAL_REVIEW_PENDING` resolved before any tenant route can be built; BLOCKS implementation |

#### Recommendation

**Option A — strongly recommended (and is the only practical choice).** The existing admin-only
pattern (`SUPER_ADMIN` + `ttpFeatureGateMiddleware`) is correct for v2. No tenant-facing v2 score
route should be designed or opened until `LEGAL_REVIEW_PENDING` is explicitly resolved by Paresh
after counsel review. `TTP-TEXQTICSCORE-V2-IMPL-001` scope must be constrained to:
`computeTexQticScore` function + unit tests + optional admin snapshot integration — no tenant routes.

---

### OQ-V2-05 — Should v2 dual-run alongside v1 before any API response changes?

**Design assumption:** Yes — log both, return v1 until explicitly switched.

#### Repo-truth evidence

Current `TtpScoreSnapshotService.captureSnapshot` flow (verified):
1. Calls `assembleTtpScoreInput(orgId, tradeId?)` → returns `TtpScoreInput`
2. Calls `computeTtpScore(input)` → returns `TradeTrustScore`
3. Hardcodes `score_version: 'TTP_V1'` in DB write
4. Returns summary fields (no `TradeTrustScore` object returned to route)

Current `TtpSummaryService.getTradeTtpSummary` flow (verified):
1. Assembles readiness data inline (parallel to `assembleTtpScoreInput`)
2. Calls `computeTtpScore(input)` → result is the `trade_trust_score` field in response
3. Returns full `TradeTtpSummary` to route

**No dual-run infrastructure exists.** There is no logging path, no comparison mechanism,
and no conditional score selection anywhere in the current codebase.

For dual-run to work, the snapshot service would need to call BOTH `computeTtpScore` AND
`computeTexQticScore` on the same `TtpScoreInput` (assuming Option A for OQ-V2-01), log
the comparison, and continue writing `score_version: 'TTP_V1'` until explicitly switched.

#### Options

| Option | Description | Risk |
|---|---|---|
| **A ⭐** | Log both v1 and v2 scores on each snapshot trigger; return v1 API responses; only switch after explicit Paresh authorization | Safe; enables regression detection before any API contract change |
| B | Switch API responses to v2 immediately after implementation | Any regression in v2 scoring immediately affects admin consumers; no baseline comparison available |

#### Recommendation

**Option A — strongly recommended.** The dual-run period (log both, return v1) is the safest
pre-switchover validation path. The implementation design for `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001`
must define:
1. Where dual-run logging happens (Pino structured event, admin-readable log, or internal comparison field).
2. How long dual-run is maintained before v1 is deprecated.
3. What divergence threshold (if any) triggers a human review before switch.

This is a design decision for the snapshot integration slice, not for the service implementation slice.

---

### OQ-V2-06 — Is current `ttp_score_snapshots` schema sufficient for v2?

**Design assumption:** Yes — `score_version String` is sufficient without a schema change.

#### Repo-truth evidence

`server/prisma/schema.prisma` (lines 1677–1706, verified exact):

```
model ttp_score_snapshots {
  id                  String    @id
  ...
  score_value         Int       @db.SmallInt
  score_band          String
  score_version       String
  score_detail_json   Json
  trigger_event       String
  score_disclaimer_hash  String
  route_disclaimer_hash  String
  metadata_json          Json?
  ...
}
```

Key confirmed facts:
1. `score_version String` — **no Prisma enum constraint**. Any string value is valid at the ORM layer.
2. `score_detail_json Json` — shape-agnostic JSONB column. v2 `{ factors, blockers, next_steps }` uses the same shape as v1 (per OQ-SS-01 decision).
3. **DB-level CHECK constraint confirmed:** `governance/TTP-SCORE-SNAPSHOT-DESIGN-001.md §5.4` specifies `CHECK (score_version IN ('TTP_V1', 'TEXQTICSCORE_V2'))`, applied in Slice 1 SQL (`commit 5e8ac44`, `PRODUCTION_VERIFIED`). `'TEXQTICSCORE_V2'` is already an allowed value in the DB.
4. No separate `v2_score_detail_json` column is needed; `score_detail_json` is shape-compatible.
5. The `score_band String` column accepts any string; v2 bands are identical to v1 bands (per OQ-V2-02 recommendation).

**Result: Schema is fully sufficient for v2. No schema change, no Prisma migration, no new column needed.**

The only constraint: Prisma TypeScript types provide no compile-time validation of `score_version`.
A TypeScript union type must be defined in the service layer (see AF-V2-02).

#### Options

| Option | Description | Risk |
|---|---|---|
| **A ⭐** | Use `score_version String` as-is; enforce allowed values via TypeScript union type in service | No migration needed; DB CHECK is enforcement backstop |
| B | Add a new column (e.g., `factor_model_version`) for additional versioning granularity | Schema change = SQL + `prisma db pull` + `prisma generate`; only warranted if design discovers a new need |

#### Recommendation

**Option A — confirmed correct.** Current schema is sufficient. No schema change is required or
authorized. TypeScript union type enforcement (see AF-V2-02) must be added in the implementation
slice to complement the DB CHECK constraint.

---

### OQ-V2-07 — Does legal approval gate implementation or only public/tenant exposure?

**Design assumption:** Legal gates tenant/public surface only; internal backend implementation
can proceed with `LEGAL_REVIEW_PENDING` maintained.

#### Repo-truth evidence

Evidence from existing v1 implementation pattern:
- `computeTtpScore` was fully implemented and tested (19 unit tests, tsc clean) without legal clearance.
- All 6 snapshot slices (service, triggers, admin read) were implemented and `PRODUCTION_VERIFIED` with `LEGAL_REVIEW_PENDING` in effect.
- Legal review is explicitly about **copy (disclaimer text)** and **tenant-facing surface** — per `TTP-LEGAL-COPY-COUNSEL-PACKET-001` §2, the elements under review are: `TTP_DISCLAIMER_TEXT`, `SCORE_DISCLAIMER`, forbidden-language list, safe-language patterns, and VPC label strings. Internal computation and storage is not under legal review.
- `LEGAL_REVIEW_PENDING` explicitly blocks: tenant-facing score history endpoints, public score sharing, and external partner/lender data sharing. It does not block backend service implementation.
- The admin route file comment confirms the correct interpretation: `"LEGAL_REVIEW_PENDING remains unresolved — tenant score-history endpoints are intentionally withheld."`

#### Options

| Option | Description | Risk |
|---|---|---|
| **A ⭐** | Legal required only before tenant surface. Internal implementation (`computeTexQticScore`, unit tests, snapshot integration) can proceed with `LEGAL_REVIEW_PENDING` maintained. | Established pattern; matches all prior v1 slices |
| B | Legal required before any implementation | Blocks all progress; contradicts established v1 implementation precedent |

#### Recommendation

**Option A — confirmed correct by v1 precedent.** `TTP-TEXQTICSCORE-V2-SERVICE-001` and
`TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` may proceed without legal clearance, provided:
1. `LEGAL_REVIEW_PENDING` is maintained in all governance artifacts throughout.
2. No v2 score response is surfaced to any tenant or public caller until legal clears the copy.
3. The v2 disclaimer constant (`TEXQTICSCORE_V2_DISCLAIMER`) is marked `LEGAL_REVIEW_PENDING` in code.

---

### OQ-V2-08 — Can any score history or v2 factor detail be exposed to tenants?

**Design assumption:** No — admin-only until legal clearance. Factor detail is particularly sensitive.

#### Repo-truth evidence

Evidence against tenant exposure at this time:
1. **`ttp_enabled=false` blocks all TTP routes** including admin routes — runtime gate is global.
2. **`SNAPSHOT_SELECT` explicitly excludes `score_detail_json`** — comment: `"intentionally excluded"`. This applies to admin reads; tenant reads do not exist.
3. **`risk_tier` is high sensitivity** per `TTP-TEXQTICSCORE-V2-DESIGN-001.md §6.1`: `"High — internal only; Must not be surfaced to tenant or buyer without consent design + legal clearance"`.
4. **`TtpSummaryService`** includes `trade_trust_score` in the tenant summary response (lines 310–320), but this is the aggregate score object only, and is only accessible when `ttp_enabled=true` (currently false). It does NOT include `risk_tier` as a separate field.
5. Factor-level detail (`factors` array with per-factor `explanation`) has never been surfaced in any tenant response in the codebase.
6. Score history (list of past snapshots) has no tenant-facing endpoint. The only snapshot read endpoints are admin-scoped.

**A nuance to note:** `TtpSummaryService.getTradeTtpSummary` returns `trade_trust_score: TradeTrustScore`
which includes the `factors` array (with `risk_tier` factor). If this summary is ever enabled for
tenants, the factor-level risk tier detail would be present in the response. This needs to be
addressed before tenant enablement — likely by stripping `risk_tier` factor from tenant-facing
summary output (a separate design decision).

#### Options

| Option | Description | Risk |
|---|---|---|
| **A ⭐** | No tenant exposure: admin-only until legal clearance + consent design complete | Correct; aligned with LEGAL_REVIEW_PENDING gate |
| B | Aggregate only (score + band, no factors) to tenants | Requires legal clearance on what aggregate readiness labeling implies; still needs consent design |

#### Recommendation

**Option A — strongly recommended.** Factor detail (including `risk_tier`) must not reach tenants.
Even aggregate v2 score must wait for legal clearance. Additionally, before `TtpSummaryService` is
enabled for tenants, the `trade_trust_score.factors` content (which includes `risk_tier` factor)
needs an explicit stripping/filtering decision — this is a separate pre-tenant-enablement gate (see
AF-V2-04 for the two-assembly-path finding that affects this decision).

---

### OQ-V2-09 — Should `TEXQTICSCORE_V2` be persisted to `ttp_score_snapshots` immediately after impl, or design-only?

**Design assumption:** Persist immediately alongside `TTP_V1` (Option A) or keep as design-only
until validated (Option B). No recommendation was given in the design doc.

#### Repo-truth evidence

Current `captureSnapshot` in `ttpScoreSnapshot.service.ts` (verified):
- `score_version: 'TTP_V1'` is **hardcoded** — not a parameter, not conditional.
- A single call to `computeTtpScore(input)` is made — no dual-call pattern.
- Returning `score_version` in `CaptureSnapshotResult` provides the written value back to callers.

To support `'TEXQTICSCORE_V2'`, `captureSnapshot` would need either:
- A `scoreVersion` input parameter (caller decides), or
- An internal branch that calls `computeTexQticScore` and writes `'TEXQTICSCORE_V2'`.

The DB CHECK constraint already allows `'TEXQTICSCORE_V2'` — no schema gate. This means
accidentally writing `TEXQTICSCORE_V2` before the function exists would be a runtime error, not
a schema violation.

**Slicing implication:** Persisting v2 snapshots requires `computeTexQticScore` to exist and
be verified first. This is a natural 2-slice split: service first, snapshot integration second.

#### Options

| Option | Description | Risk |
|---|---|---|
| A | Persist `TEXQTICSCORE_V2` to `ttp_score_snapshots` immediately after `computeTexQticScore` is implemented | Only safe if dual-run logging is in place and v2 function is unit-verified; DB allows it today |
| **B ⭐** | Service implementation slice (`TTP-TEXQTICSCORE-V2-SERVICE-001`) is unit-test-only; snapshot persistence is a separate authorized slice (`TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001`) | Clean separation; no unverified function reaches the DB |

#### Recommendation

**Option B — recommended.** The natural and safe slicing is:
1. `TTP-TEXQTICSCORE-V2-SERVICE-001` — implement `computeTexQticScore`, unit tests, disclaimer constant, input type. No snapshot writes. No route changes.
2. `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` — extend `TtpScoreSnapshotService` for v2 path, dual-run logging, snapshot writes with `score_version: 'TEXQTICSCORE_V2'`.

This prevents an unverified v2 function from being written to the immutable `ttp_score_snapshots`
table. The DB CHECK constraint is not a gating issue (it already allows `TEXQTICSCORE_V2`); the
gate is ensuring the function is correct before its output is persisted.

---

## §5 — Additional Audit Findings: AF-V2-01 through AF-V2-09

---

### AF-V2-01 — Two independent score input assembly paths exist

**Finding type:** Architecture gap — potential drift risk for v2 integration.

**Evidence:**

| Assembly path | Location | Scope |
|---|---|---|
| `assembleTtpScoreInput(orgId, tradeId?)` | `ttpScoreSnapshot.service.ts` — private method | Org-level + optional trade-level |
| Inline assembly | `ttpSummary.service.ts` lines 175–310 | Always trade-scoped; includes enrollment, GST, eligibility, invoice, VPC, routing |

Both paths call `computeTtpScore` with an identical `TtpScoreInput` interface. Both produce the
same factor inputs using the same DB query structure. However, they are **separate implementations**
with no shared code. A logic change in one does not propagate to the other.

**Impact on v2:**
- `computeTexQticScore` will be called from both paths once v2 is integrated.
- Any change to v2 factor pass conditions must be reflected in BOTH assembly paths.
- If the `TexQticScoreInput` type differs from `TtpScoreInput`, both paths need independent updates.

**Recommendation for implementation planning:**
- Paresh decision needed: create a shared `assembleTexQticScoreInput` utility (exportable), or
  duplicate the pattern as v1 did. A shared utility reduces drift risk but is a refactor.
- If Option A for OQ-V2-01 is approved (same inputs, rename-only), `TtpScoreInput` can be reused
  directly for `computeTexQticScore` — the same assembly paths work without modification.
  This is the lowest-risk approach.

---

### AF-V2-02 — TypeScript safety gap on `score_version` at the Prisma layer

**Finding type:** Type safety gap — minor risk of incorrect `score_version` values.

**Evidence:**

- `server/prisma/schema.prisma`: `score_version String` — no Prisma enum, no `@db.VarChar` with
  a length constraint, no Prisma-level validation.
- DB CHECK constraint: `CHECK (score_version IN ('TTP_V1', 'TEXQTICSCORE_V2'))` — DB is the
  only enforcer. Enforced at DB write time; TypeScript sees it as plain `string`.
- In `captureSnapshot`, the value `'TTP_V1'` is a hardcoded string literal — TypeScript won't
  catch a typo like `'TTP_v1'` until the DB rejects it at runtime.

**Impact on v2:**
- Adding `'TEXQTICSCORE_V2'` requires careful string handling. Without a TypeScript union type,
  a typo in the implementation would pass `tsc` and only fail at DB write time.

**Recommendation for `TTP-TEXQTICSCORE-V2-SERVICE-001`:**
- Define `export type ScoreVersion = 'TTP_V1' | 'TEXQTICSCORE_V2'` in `ttp.constants.ts` or
  `ttpScore.service.ts` (wherever the v2 implementation lives).
- Use `ScoreVersion` as the type for `captureSnapshot`'s `score_version` parameter.
- This adds zero runtime cost and eliminates the string-literal drift risk.

---

### AF-V2-03 — Disclaimer constant branding mismatch

**Finding type:** Design gap — neither existing disclaimer constant matches "TexQticScore v2" branding.

**Evidence:**

| Constant | Current text excerpt | Branding |
|---|---|---|
| `SCORE_DISCLAIMER` (`ttpScore.service.ts`) | "TradeTrust Score is an advisory readiness indicator only..." | "TradeTrust Score" |
| `TTP_DISCLAIMER_TEXT` (`ttp.constants.ts`) | "TradeTrust Pay readiness signals are informational and advisory only..." | "TradeTrust Pay" |

v2 product name is "TexQticScore v2". Neither constant uses "TexQticScore" terminology.

Both constants hash values are stored in `ttp_score_snapshots.score_disclaimer_hash` and
`route_disclaimer_hash`. If v2 reuses `SCORE_DISCLAIMER` unchanged, snapshot hash records will
reference a "TradeTrust Score" text for what is labeled "TexQticScore v2" in the API response —
an audit ambiguity, though not a functional error.

**Recommendation:**
- Define `TEXQTICSCORE_V2_DISCLAIMER` in `server/src/ttp/ttp.constants.ts` as part of
  `TTP-TEXQTICSCORE-V2-SERVICE-001`. Proposed interim text (pending legal):
  ```
  TexQticScore is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment.
  ```
  Mark as `LEGAL_REVIEW_PENDING` with the same comment pattern as `TTP_DISCLAIMER_TEXT`.
- In v2 snapshots, hash `TEXQTICSCORE_V2_DISCLAIMER` and store in `score_disclaimer_hash`
  (the column is generic; its name does not restrict which constant it hashes).

---

### AF-V2-04 — `TtpSummaryService` maintains a separate `blockers` array alongside `computeTtpScore` blockers

**Finding type:** Dual-output risk — two independent blocker sources in the tenant summary service.

**Evidence:** `ttpSummary.service.ts` lines 292–320 (verified exact):

```typescript
// ── 9. Blockers (lines 292–315) ──
const blockers: string[] = [];
if (!gstReadiness.is_approved) {
  blockers.push(gstReadiness.found ? 'GST verification pending approval' : 'GST verification not submitted');
}
// ... additional blocker logic for eligibility, invoice, VPC

// ── 10. Advisory readiness score (line 316) ──
const trade_trust_score = computeTtpScore({ ... });
```

The `TradeTtpSummary` returned has **two separate blocker arrays**:
- `blockers` (the manually assembled array, lines 292–315) — in `TradeTtpSummary.blockers`
- `trade_trust_score.blockers` (from `computeTtpScore` output) — in `TradeTtpSummary.trade_trust_score.blockers`

These two arrays use **different wording** for the same conditions. For example:
- Summary `blockers`: `"GST verification pending approval"` (line 296)
- `computeTtpScore` blockers: `"GST verification is pending approval"` (from TC-S-003 test)

This duplication exists for v1 and is an existing design inconsistency. For v2:
- If `computeTexQticScore` produces different blocker strings, `TtpSummaryService` must be updated
  independently (separate from the service function change).
- The summary service's manual blockers array is tenant-visible via `TradeTtpSummary.blockers`;
  the `trade_trust_score.blockers` is also tenant-visible. Both must be consistent.

**This is an existing v1 design issue but is a v2 integration risk to plan for.**

---

### AF-V2-05 — Test file header comment count discrepancy (16 vs 19)

**Finding type:** Documentation accuracy — does not affect test behavior.

**Evidence:** `server/src/__tests__/ttp-score.service.unit.test.ts` header (lines 8–27):

```typescript
 * 16 test cases covering:
 *   TC-S-001: ...
 *   ...
 *   TC-S-016: disclaimer is always present
 *   TC-S-017: band thresholds are correct (80=READY, 60=NEAR_READY, 40=NEEDS_REVIEW, 39=NOT_READY)
 *   TC-S-018: buyer-safe output: no raw bureau/GST/CIBIL fields in response
 *   TC-S-019: missing optional fields never throw
```

The header says **"16 test cases"** but lists **19 test case IDs** (TC-S-001 through TC-S-019).
TC-S-017 through TC-S-019 were added after the initial comment was written; the count was not
updated. The v2 design doc correctly states "19 existing `ttpScore.service` unit tests".

**Impact on v2:**
- When writing `TTP-TEXQTICSCORE-V2-SERVICE-001`, the implementation prompt should reference
  "19 existing tests" (not 16). The regression gate is 19 tests passing.
- The test header comment should be corrected from "16 test cases" to "19 test cases" as part of
  the v2 service slice (minor fix, within allowlist since the test file will be read anyway).
  But updating the comment is optional — only the actual test count matters.

---

### AF-V2-06 — `SNAPSHOT_SELECT` projection protects v2 factor detail equally

**Finding type:** Positive finding — existing infrastructure is v2-compatible without change.

**Evidence:** `server/src/routes/control/ttp-score-snapshots.ts` (lines 72–88, verified):

```typescript
export const SNAPSHOT_SELECT = {
  id: true,
  org_id: true,
  ...
  score_value: true,
  score_band: true,
  score_version: true,
  trigger_event: true,
  score_disclaimer_hash: true,
  route_disclaimer_hash: true,
  metadata_json: true,
  created_at: true,
  // score_detail_json: INTENTIONALLY EXCLUDED
} as const;
```

The projection explicitly excludes `score_detail_json`. This is the same for both v1 and v2
snapshots — the admin read endpoint will never expose factor detail regardless of `score_version`.
This is protective behavior that requires no change for v2.

**Additionally:** `score_version` IS included in `SNAPSHOT_SELECT`. Admin reads already return the
version string on every snapshot row. After v2 snapshots are written, admins can already see
`score_version: 'TEXQTICSCORE_V2'` in the list response — no route update needed for basic v2
snapshot visibility.

**Summary:** The admin snapshot read infrastructure is v2-compatible today. No route change is
needed for basic v2 snapshot read. A filter-by-`score_version` query parameter enhancement may be
desirable but is a separate authorization.

---

### AF-V2-07 — `assembleTtpScoreInput` is a private method — accessibility decision needed

**Finding type:** Architecture decision point for v2 input assembly.

**Evidence:**

- `assembleTtpScoreInput(orgId, tradeId?)` is an **instance method on `TtpScoreSnapshotService`** —
  not exported, not accessible outside the class.
- The summary service (`TtpSummaryService`) does NOT use `assembleTtpScoreInput` — it assembles
  inputs inline, with its own DB queries.
- If `computeTexQticScore` needs different inputs than `TtpScoreInput` (i.e., if OQ-V2-01 Option B
  or C is chosen), the existing assembly paths must be extended independently in both services.
- If OQ-V2-01 Option A is chosen (same inputs, rename-only), `TtpScoreInput` can be passed
  directly to `computeTexQticScore` — no new assembly function needed.

**Recommendation:** With OQ-V2-01 Option A (recommended), `assembleTtpScoreInput` is directly
reusable for v2 (same fields, same DB queries). No refactor needed for the service slice. If a
different OQ-V2-01 option is chosen, a new `assembleTexQticScoreInput` method (or an exported
shared utility) will be required — this decision gates the scope of `TTP-TEXQTICSCORE-V2-SERVICE-001`.

---

### AF-V2-08 — `PARTNER_TRANSMITTED` trigger already in DB CHECK — must NOT be used prematurely

**Finding type:** Risk boundary — critical constraint for v2 snapshot integration.

**Evidence:**

- `governance/TTP-SCORE-SNAPSHOT-DESIGN-001.md §6.1`: `PARTNER_TRANSMITTED` trigger is
  forward-declared in the DB CHECK constraint as a Wave 4 value.
- `ttpScoreSnapshot.service.ts`: `PARTNER_TRANSMITTED` causes `SnapshotUnsupportedTriggerError`
  at runtime — it is rejected by the service even though the DB would accept it.
- Wave 4 gate: requires partner contract signed + `TTP-PARTNER-WORKFLOW-DESIGN-001` approved.

**v2 relevance:** Any `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` implementation that extends
`captureSnapshot` must NOT use `PARTNER_TRANSMITTED` as a trigger event. v2 snapshots use the
same three Wave 2 triggers as v1: `VPC_ISSUED`, `ENROLLMENT_APPROVED`, `ADMIN_REVIEW_COMPLETE`.
`PARTNER_TRANSMITTED` remains Wave 4 regardless of score version.

This constraint must be explicitly called out in the `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001`
scope definition when it is opened.

---

### AF-V2-09 — `ttp_enabled=false` makes v2 entirely unit-test-verifiable before any live route

**Finding type:** Positive finding — v2 can be safely implemented and tested without needing `ttp_enabled=true`.

**Evidence:**
- `ttpFeatureGateMiddleware` blocks ALL TTP routes (admin + tenant) while `ttp_enabled=false`.
- `computeTtpScore` is a pure function — it can be imported and tested without any route or
  middleware involvement. v1 has 19 unit tests that do exactly this.
- `TtpScoreSnapshotService` unit tests mock the DB entirely — no live DB access needed.
- `ttp_enabled` is irrelevant to unit test execution.

**Implication:** `TTP-TEXQTICSCORE-V2-SERVICE-001` can be fully implemented and verified
(unit tests + tsc) without any change to `ttp_enabled`. The entire v2 service layer can be
proven correct before any live route handles v2 data. This is the correct sequence.

No `ttp_enabled=true` activation should be requested in any v2 implementation prompt.

---

## §6 — Hidden Blockers Before Any Implementation Slice

The following are issues that could block or complicate `TTP-TEXQTICSCORE-V2-IMPL-001` if not
addressed in the implementation slice design. These were not surfaced in the original design doc.

| Blocker ID | Description | Severity | Resolution |
|---|---|---|---|
| HB-V2-01 | `TEXQTICSCORE_V2_DISCLAIMER` constant does not exist — any `computeTexQticScore` implementation cannot return a disclaimer without it | **Medium** | Define constant in `TTP-TEXQTICSCORE-V2-SERVICE-001` allowlist; interim text only, LEGAL_REVIEW_PENDING |
| HB-V2-02 | No `ScoreVersion` TypeScript union type exists — `score_version` is unsafe string in Prisma layer | **Low** | Define `type ScoreVersion = 'TTP_V1' \| 'TEXQTICSCORE_V2'` in service slice |
| HB-V2-03 | `assembleTtpScoreInput` is a private method — if OQ-V2-01 Option B or C is chosen, a new assembly function is needed | **Conditional** | Resolved if OQ-V2-01 Option A is approved (recommended) |
| HB-V2-04 | Dual-run logging strategy is undefined — no mechanism exists to log v1 vs v2 score comparison | **Medium** | Must be designed explicitly in `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` scope |
| HB-V2-05 | `TtpSummaryService` has independent blocker assembly — v2 factor renames will create blocker string drift if not addressed | **Low** | Acceptable if v2 starts admin-only; must be addressed before any tenant surface enablement |
| HB-V2-06 | Test file header comment says "16 test cases" but 19 exist — implementation prompt should use 19 as the regression baseline | **Informational** | Correct in implementation prompt; optionally fix header comment |

**No hidden schema blockers:** DB CHECK constraint already includes `TEXQTICSCORE_V2`.
**No hidden migration blockers:** Prisma schema is sufficient as-is.
**No hidden test infrastructure blockers:** Vitest + mock pattern is proven for 59 snapshot tests.
**No hidden auth blockers:** Admin-only scope uses established `requireAdminRole('SUPER_ADMIN')` pattern.

---

## §7 — Paresh Decision Matrix

The following table summarizes all decisions required from Paresh before any implementation slice
is opened. Recommended options are marked ⭐.

| OQ/AF ID | Question / Finding | Recommended | Alternative | Decision needed? |
|---|---|---|---|---|
| OQ-V2-01 | v2 factor keys/weights | **Option A ⭐** — 1:1 rename, same weights | Option B/C — change weights or factors | **YES** |
| OQ-V2-02 | Band labels | **Option A ⭐** — keep READY/NEAR_READY/NEEDS_REVIEW/NOT_READY | Option B — rename | **YES** |
| OQ-V2-03 | v2 disclaimer constant | **Option B ⭐** — new `TEXQTICSCORE_V2_DISCLAIMER`, LEGAL_REVIEW_PENDING | Option A — reuse SCORE_DISCLAIMER | **YES** |
| OQ-V2-04 | Admin-only first | **Option A ⭐** — admin/control-plane only | Option B — parallel tenant surface | **YES** (confirm tenant gate) |
| OQ-V2-05 | Dual-run strategy | **Option A ⭐** — log both, return v1 until switch authorized | Option B — switch immediately | **YES** |
| OQ-V2-06 | Schema sufficiency | **Option A ⭐** — confirmed sufficient, no change | Option B — new column | Confirmed — no decision needed |
| OQ-V2-07 | Legal gate scope | **Option A ⭐** — gates tenant surface only | Option B — gates all impl | **YES** (Paresh confirm) |
| OQ-V2-08 | Tenant factor exposure | **Option A ⭐** — admin-only until legal clears | Option B — aggregate to tenants | **YES** |
| OQ-V2-09 | Snapshot persistence timing | **Option B ⭐** — service-only slice first, snapshot in separate slice | Option A — persist immediately | **YES** |
| AF-V2-01 | Assembly path: shared vs duplicate | **Shared only if OQ-V2-01 Option B/C; reuse if Option A** | — | Only if OQ-V2-01 ≠ Option A |
| AF-V2-02 | TypeScript union type for score_version | **Define `ScoreVersion` union type** | — | Include in impl slice scope |
| AF-V2-03 | `TEXQTICSCORE_V2_DISCLAIMER` constant | **Create in `ttp.constants.ts`** | — | Include in impl slice allowlist |
| AF-V2-04 | Summary service blockers drift | **Accept for now; address before tenant enablement** | — | No immediate decision |
| AF-V2-05 | Test count: 16 vs 19 in comment | **Use 19 as regression baseline** | — | Informational — no decision |
| AF-V2-06 | SNAPSHOT_SELECT compatible | **No action needed** | — | Confirmed — no decision |
| AF-V2-07 | `assembleTtpScoreInput` access | **Reuse as-is if OQ-V2-01 Option A approved** | Export if Option B/C | Follows OQ-V2-01 decision |
| AF-V2-08 | PARTNER_TRANSMITTED exclusion | **Explicitly exclude from v2 snapshot scope** | — | Must be in impl slice constraints |
| AF-V2-09 | Unit-test-only implementation possible | **Confirm this is the v2 service slice model** | — | Confirm in slice design |

---

## §8 — Recommended Implementation Slice Sequence

The following sequence is recommended **after Paresh approves decisions in §7**. No slice is opened
by this document.

| Order | Slice ID | Scope | Gate |
|---|---|---|---|
| 1 | `TTP-TEXQTICSCORE-V2-SERVICE-001` | `computeTexQticScore` function, `TexQticScoreV2` type, `TEXQTICSCORE_V2_DISCLAIMER` constant, `ScoreVersion` union type, 19+ unit tests; NO route changes, NO snapshot writes | OQ decisions recorded + Paresh explicit authorization |
| 2 | `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` | Extend `TtpScoreSnapshotService` for v2 path, dual-run logging, snapshot writes with `score_version: 'TEXQTICSCORE_V2'` | Service slice unit-verified (tsc clean + all tests pass) |
| 3 | `TTP-TEXQTICSCORE-V2-ADMIN-READ-001` | Extend admin snapshot read endpoints with `score_version` filter; no tenant routes | Snapshot integration verified |
| 4 | `TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001` | Record Paresh's decisions on all OQ-V2 items into a decisions artifact | This audit artifact reviewed by Paresh |
| (future) | `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` | Tenant-visible v2 score surface | **Requires `LEGAL_REVIEW_PENDING` resolved** |

> Paresh must explicitly authorize each slice. No slice is auto-opened by this document.

---

## §9 — Pre-Implementation Checklist

The following conditions must be confirmed before any `TTP-TEXQTICSCORE-V2-IMPL-001` implementation
prompt is opened:

- [ ] Paresh has reviewed §7 and made decisions on OQ-V2-01, OQ-V2-02, OQ-V2-03, OQ-V2-04,
      OQ-V2-05, OQ-V2-07, OQ-V2-08, OQ-V2-09
- [ ] `TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001` artifact has been created recording all decisions
- [ ] `TTP-TEXQTICSCORE-V2-SERVICE-001` slice has an explicit allowlist including:
      `server/src/services/ttpScore.service.ts` (new file: `ttpScoreV2.service.ts` or same file as
      separate export), `server/src/ttp/ttp.constants.ts` (for `TEXQTICSCORE_V2_DISCLAIMER` and
      `ScoreVersion` type), `server/src/__tests__/ttp-score-v2.service.unit.test.ts` (new test file)
- [ ] The implementation prompt explicitly states: "v1 `computeTtpScore` must not be modified"
- [ ] The implementation prompt explicitly states: "no route changes in this slice"
- [ ] The implementation prompt explicitly states: "no snapshot writes in this slice"
- [ ] The implementation prompt references 19 (not 16) existing tests as the regression baseline
- [ ] `ttp_enabled=false` is not requested to be changed by any v2 slice

---

## §10 — Final Audit Status

```
TTP_TEXQTICSCORE_V2_OPTIONS_AUDIT_001_COMPLETE
```

| Item | Status |
|---|---|
| OQ-V2-01 through OQ-V2-09 audited with repo-truth evidence | ✅ Complete |
| AF-V2-01 through AF-V2-09 documented | ✅ Complete |
| Hidden blockers identified | ✅ Six blockers documented (§6) |
| Decision matrix prepared for Paresh (§7) | ✅ Complete |
| Recommended slice sequence defined (§8) | ✅ Complete |
| Pre-implementation checklist defined (§9) | ✅ Complete |
| `ttp_enabled=false` unchanged | ✅ Confirmed |
| `LEGAL_REVIEW_PENDING` unchanged | ✅ Confirmed |
| Code changes made | ✅ None |
| Schema / migration changes | ✅ None |
| Implementation slices opened | ✅ None |
| Allowlist compliance | ✅ Only this file created |

**No implementation is authorized by this document.**
**Paresh must review §7 and issue decisions before any `TTP-TEXQTICSCORE-V2-IMPL-001` slice opens.**

---

*Produced under TexQtic governance — Safe-Write Mode always on.*
*`ttp_enabled=false` — UNCHANGED. `LEGAL_REVIEW_PENDING` — UNCHANGED.*
*This document authorizes no implementation, no schema change, no migration, and no slice opening.*
