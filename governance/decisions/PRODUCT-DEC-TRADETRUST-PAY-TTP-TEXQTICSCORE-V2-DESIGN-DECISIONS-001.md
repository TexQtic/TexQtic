# PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001

> **TexQtic governance decision record — Safe-Write Mode always on.**
> This document records Paresh Sharma's design decisions on all open questions from
> `TTP-TEXQTICSCORE-V2-DESIGN-001`. It does not authorize any implementation.

---

## 1. Document Metadata

| Field | Value |
|---|---|
| **Unit ID** | `PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001` |
| **Type** | Decision record (governance / non-code) |
| **Date** | 2026-05-05 |
| **Author** | Paresh Sharma — TexQtic founder / operator |
| **`ttp_enabled` state** | `false` — UNCHANGED |
| **Legal status** | `LEGAL_REVIEW_PENDING` — UNCHANGED |
| **Implementation authorized** | No |
| **Schema / SQL / migration authorized** | No |
| **Route changes authorized** | No |
| **Score logic changes authorized** | No |
| **Wave 2 implementation slices opened** | None |
| **Wave 3/4/5 units opened** | None |

---

## 2. Authority Basis

| Source | Role |
|---|---|
| `TTP-TEXQTICSCORE-V2-DESIGN-001` | Primary design artifact being decided upon |
| `PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-OPTIONS-AUDIT-001` | Options audit artifact (commit `07a7e82`) — surveyed all 9 open questions with options analysis |
| Paresh Sharma | TexQtic founder / operator — sole decision authority for all TexQtic governance decisions |

All 9 open questions from §15 of `TTP-TEXQTICSCORE-V2-DESIGN-001` are resolved below.
No open questions remain from this design artifact.

---

## 3. Decision Table — OQ-V2-01 through OQ-V2-09

### OQ-V2-01 — Factor keys and weights

| Field | Value |
|---|---|
| **Question** | Exact v2 factor keys and weights — keep 1:1 with v1, or change? |
| **Selected Option** | **Option A — 1:1 rename from v1** |
| **Decision** | TexQticScore v2 retains the same 7 factors, same 100-point weights, and same pass conditions as `computeTtpScore`. Only the factor keys are renamed. |
| **Rationale** | v1 parity is the safest migration path. Changes to weights or factors introduce regression risk and require new legal/advisory wording review. The 1:1 rename approach preserves the scoring logic while enabling the new function name and key names. |
| **Implementation consequence** | `computeTexQticScore` must produce score and band parity with `computeTtpScore` for identical inputs. The 19 existing v1 score unit tests serve as the regression baseline. |

**Authorized key renames for v2:**

| v1 key | v2 key |
|---|---|
| `gst_readiness` | `gst_verification` |
| `eligibility_readiness` | `eligibility_status` |
| `risk_tier` | `risk_tier` (unchanged) |
| `invoice_readiness` | `invoice_verification` |
| `vpc_readiness` | `vpc_issuance` |
| `enrollment_readiness` | `enrollment_status` |
| `routing_readiness` | `routing_readiness` (unchanged) |

---

### OQ-V2-02 — Band labels

| Field | Value |
|---|---|
| **Question** | Keep current 4-band labels or rename? |
| **Selected Option** | **Option A — keep current 4-band labels** |
| **Decision** | Band labels `READY`, `NEAR_READY`, `NEEDS_REVIEW`, `NOT_READY` are retained unchanged in v2. |
| **Rationale** | Existing labels are safe, non-regulatory, and consistent with the advisory-only positioning of TexQticScore. No legal or product reason to rename. Preserves parity with v1 and avoids unnecessary downstream type changes. |
| **Implementation consequence** | Band thresholds unchanged: `READY` 80–100, `NEAR_READY` 60–79, `NEEDS_REVIEW` 40–59, `NOT_READY` 0–39. Forbidden band labels from §7 of the design artifact remain forbidden. |

---

### OQ-V2-03 — v2 disclaimer text

| Field | Value |
|---|---|
| **Question** | What v2 disclaimer text — keep `SCORE_DISCLAIMER` or add a new v2-specific disclaimer? |
| **Selected Option** | **Option B — new `TEXQTICSCORE_V2_DISCLAIMER` constant** |
| **Decision** | A new `TEXQTICSCORE_V2_DISCLAIMER` constant is to be added in the future service implementation slice. Existing `SCORE_DISCLAIMER` and `TTP_DISCLAIMER_TEXT` constants must NOT be changed. |
| **Rationale** | v2 carries a new function name (`computeTexQticScore`) and a new score identifier (`TEXQTICSCORE_V2`). It warrants its own disclaimer constant to make the v2 advisory boundary explicit and independent of v1. This also simplifies future legal review of v2 wording separately from v1. |
| **Implementation consequence** | In the `TTP-TEXQTICSCORE-V2-SERVICE-001` implementation slice only: add `TEXQTICSCORE_V2_DISCLAIMER` to `server/src/ttp/ttp.constants.ts` with interim wording: `"TexQticScore is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment."` Mark `LEGAL_REVIEW_PENDING` in code comment. Do NOT change `SCORE_DISCLAIMER` or `TTP_DISCLAIMER_TEXT`. |

---

### OQ-V2-04 — Admin-only first or tenant-parallel

| Field | Value |
|---|---|
| **Question** | Is v2 internal/admin-only first, or should a tenant-facing surface be designed in parallel? |
| **Selected Option** | **Option A — admin/control-plane/internal-only first** |
| **Decision** | TexQticScore v2 is admin-only and internal-only for all Wave 2 implementation. No tenant-facing v2 score surface, no public v2 score surface, and no tenant score history are authorized. |
| **Rationale** | Tenant-facing score exposure requires separate legal clearance (`LEGAL_REVIEW_PENDING`) and explicit Paresh approval. A separate design slice (`TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001`) must be opened explicitly when legal clearance is obtained. This decision prevents accidental tenant exposure during Wave 2 implementation. |
| **Implementation consequence** | All v2 Wave 2 slices are admin/internal-only. `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` remains `LEGAL_GATED__NOT_OPENED` until legal clearance and explicit Paresh authorization. |

---

### OQ-V2-05 — Dual-run before API switch

| Field | Value |
|---|---|
| **Question** | Should v2 dual-run alongside v1 before any API response changes? |
| **Selected Option** | **Option A — dual-run v1/v2 before any API switch** |
| **Decision** | In the snapshot integration slice, compute and log both v1 and v2 scores side by side. Return v1 in all API responses until a separate, explicit switch authorization is issued by Paresh. |
| **Rationale** | Dual-run is the safest migration path and eliminates regression risk. Any discrepancies between v1 and v2 (which should be zero given Option A for OQ-V2-01) will be surfaced in logs before any response change. This protects all 59 existing snapshot tests and downstream consumers. |
| **Implementation consequence** | The service-only slice (`TTP-TEXQTICSCORE-V2-SERVICE-001`) does not affect any API response. The snapshot integration slice (`TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001`) will define the dual-run logging strategy. No route or API switch is authorized in the service-only slice. No route or API switch is authorized without a separate explicit Paresh authorization. |

---

### OQ-V2-06 — Schema sufficiency

| Field | Value |
|---|---|
| **Question** | Is the current `ttp_score_snapshots` schema sufficient for v2? |
| **Selected Option** | **Option A — current schema sufficient; no migration required** |
| **Decision** | The existing `score_version String` column and `score_detail_json Json` column on `ttp_score_snapshots` are sufficient for TexQticScore v2. No new column, no schema migration, no `prisma migrate dev` or `db push`, and no SQL is required for the service-only slice. |
| **Rationale** | The DB `CHECK` constraint on `score_version` already includes `TEXQTICSCORE_V2` as a valid value. `score_detail_json` can store v2 factor detail without schema changes. No DDL is needed until snapshot integration, and even then, the existing schema is believed to be sufficient. |
| **Implementation consequence** | In the future implementation slice, add `type ScoreVersion = 'TTP_V1' | 'TEXQTICSCORE_V2'` in TypeScript. No Prisma commands are authorized in the service-only slice. If the snapshot integration slice discovers the schema is insufficient, `TTP-SCORE-VERSIONING-IMPL-001` may be opened (remains `NOT_OPENED` until then). |

---

### OQ-V2-07 — Legal gate scope

| Field | Value |
|---|---|
| **Question** | Does legal approval gate implementation or only public/tenant exposure? |
| **Selected Option** | **Option A — legal gates tenant/public exposure only** |
| **Decision** | `LEGAL_REVIEW_PENDING` blocks only tenant-facing and public exposure of TexQticScore v2. Backend, internal, and admin-only v2 implementation may proceed while legal review is pending. |
| **Rationale** | The legal review (`TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001`, `LEGAL_REVIEW_PENDING`) governs external-facing score language and advisory wording. Internal implementation of `computeTexQticScore` carries no external advisory risk. This unblocks admin/internal Wave 2 implementation while protecting the tenant-facing and public surfaces behind legal clearance. |
| **Implementation consequence** | `TTP-TEXQTICSCORE-V2-SERVICE-001` (admin/internal) may be opened by Paresh without legal clearance. `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` and any public score routes remain `LEGAL_GATED__NOT_OPENED`. |

---

### OQ-V2-08 — Tenant score history / factor detail exposure

| Field | Value |
|---|---|
| **Question** | Can any score history or v2 `score_detail_json` factor detail be exposed to tenants? |
| **Selected Option** | **Option A — no tenant exposure until legal/consent clearance** |
| **Decision** | `score_detail_json` remains admin/internal-only or excluded from public routes for all Wave 2 implementation. `risk_tier` must never be buyer/seller visible without legal and consent design. No tenant factor detail route and no tenant score history route are authorized. |
| **Rationale** | `score_detail_json` contains factor-level readiness signals including `risk_tier`, which is sensitive data that requires separate consent architecture (Wave 3) before exposure to tenants. Exposing it without legal/consent design would violate the tenant data safety invariants established in `TTP-DATA-CONSENT-DESIGN-001` (currently `LEGAL_GATED__WAITING`). |
| **Implementation consequence** | The existing `SNAPSHOT_SELECT` projection constant (which excludes `score_detail_json`) must be preserved in all admin read routes. No new tenant-facing route may expose `score_detail_json` or `risk_tier` without Wave 3 consent architecture and legal clearance. |

---

### OQ-V2-09 — Snapshot persistence timing

| Field | Value |
|---|---|
| **Question** | Should `TEXQTICSCORE_V2` be persisted to `ttp_score_snapshots` immediately after implementation, or service-only design for now? |
| **Selected Option** | **Option B — service-only first; snapshot persistence in a separate later slice** |
| **Decision** | `TTP-TEXQTICSCORE-V2-SERVICE-001` implements `computeTexQticScore`, TypeScript types, constants, and unit tests only — no snapshot writes. `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` is a separate later slice for dual-run logging and v2 snapshot persistence. |
| **Rationale** | Separating service implementation from snapshot integration keeps the first slice minimal, independently verifiable, and regression-safe. It also allows the dual-run strategy (OQ-V2-05 Option A) to be designed properly in its own slice with full context about snapshot write paths, RLS, and service-call patterns. |
| **Implementation consequence** | `TTP-TEXQTICSCORE-V2-SERVICE-001` scope: `computeTexQticScore` function, `TexQticScoreV2Input/Output` types, `TEXQTICSCORE_V2_DISCLAIMER` constant, unit tests only. No snapshot write, no `TtpScoreSnapshotService` call, no DB interaction. Do not write `score_version='TEXQTICSCORE_V2'` to any table until `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` is explicitly opened by Paresh. |

---

## 4. AF Implementation Consequences Adopted

The following implementation consequences are adopted from the options audit artifact and apply to all future implementation slices in the TexQticScore v2 family:

| AF# | Consequence |
|---|---|
| AF-01 | Add `type ScoreVersion = 'TTP_V1' | 'TEXQTICSCORE_V2'` in the future implementation slice (e.g., `server/src/ttp/ttp.types.ts` or adjacent). Not in this decision record — in the service slice only. |
| AF-02 | Add `TEXQTICSCORE_V2_DISCLAIMER` constant in the future `TTP-TEXQTICSCORE-V2-SERVICE-001` slice only. Preferred location: `server/src/ttp/ttp.constants.ts`. Mark `LEGAL_REVIEW_PENDING` in code comment. Do NOT change `SCORE_DISCLAIMER` or `TTP_DISCLAIMER_TEXT`. |
| AF-03 | Keep `computeTtpScore` entirely unchanged. TexQticScore v2 is a new separate function `computeTexQticScore` that coexists with v1. `computeTtpScore` must not be modified, refactored, or deprecated in any v2 slice. |
| AF-04 | Use the 19 existing v1 score unit tests as the regression baseline. If `computeTexQticScore` produces different results from `computeTtpScore` for identical inputs, it is a defect in the v2 implementation (OQ-V2-01 Option A requires parity). |
| AF-05 | Correct the stale comment "16" → "19" in the score test file header only if that test file is explicitly touched in a future implementation slice. Do not touch the test file solely for comment correction. |
| AF-06 | Treat the duplicate input / blocker assembly in `TtpSummaryService` as a future tenant-enablement concern, not a blocker for admin/internal v2 implementation. The service-only slice does not interact with `TtpSummaryService`. |
| AF-07 | Keep `PARTNER_TRANSMITTED` excluded from all v2 Wave 2 implementation paths. `PARTNER_TRANSMITTED` remains Wave 4 scope only. No `PARTNER_TRANSMITTED` snapshot trigger may be added in any Wave 2 v2 slice. |
| AF-08 | No `ttp_enabled=true` activation is required for v2 service implementation. `computeTexQticScore` can be implemented, tested, and unit-verified while `ttp_enabled=false`. No feature flag change is authorized. |

---

## 5. Finalized Implementation Model

Based on the 9 decisions above, the authorized implementation model for TexQticScore v2 is:

| Parameter | Value |
|---|---|
| **Next candidate implementation slice** | `TTP-TEXQTICSCORE-V2-SERVICE-001` (service-only) |
| **Scope of service-only slice** | `computeTexQticScore` function, `TexQticScoreV2Input/Output` types, `TEXQTICSCORE_V2_DISCLAIMER` constant, unit tests only |
| **No routes, no snapshots, no schema** | Confirmed — service-only slice contains no route changes, no snapshot writes, no DB interaction, no schema changes |
| **No tenant surface** | Confirmed — admin/internal only; tenant surface requires separate legal clearance + Paresh approval |
| **No legal finalization** | Confirmed — `LEGAL_REVIEW_PENDING` unchanged; `TEXQTICSCORE_V2_DISCLAIMER` marked pending in code |
| **`computeTtpScore` unchanged** | Confirmed — v1 function must not be touched by any v2 slice |
| **Dual-run strategy** | To be defined in `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` (separate later slice) |
| **Snapshot persistence** | Not authorized until `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` is explicitly opened |
| **`ttp_enabled` activation** | Not authorized — remains `false` |
| **Implementation not authorized by this record** | This is a decision record only; explicit Paresh authorization to open `TTP-TEXQTICSCORE-V2-SERVICE-001` is required before implementation may begin |

### Authorized slice sequence (from OQ-V2-09 + design decisions)

| Slice | Scope | Status | Gate |
|---|---|---|---|
| `TTP-TEXQTICSCORE-V2-OPTIONS-AUDIT-001` | Survey OQs, options analysis | **COMPLETE** (commit `07a7e82`) | This design approved by Paresh |
| `TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001` | Record decisions on OQ-V2-01 → OQ-V2-09 | **COMPLETE** (this document) | Options audit complete |
| `TTP-TEXQTICSCORE-V2-SERVICE-001` | `computeTexQticScore` + types + constants + unit tests; no routes, no snapshots, no schema | `NOT_OPENED` | Design decisions recorded + explicit Paresh authorization |
| `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` | Dual-run logging + v2 snapshot persistence | `NOT_OPENED` | v2 service unit verified + Paresh authorization |
| `TTP-TEXQTICSCORE-V2-ADMIN-READ-001` | Extend admin snapshot read for `score_version` filter (if needed) | `NOT_OPENED` | Snapshot integration authorized + Paresh authorization |
| `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` | Tenant-visible v2 score surface | `LEGAL_GATED__NOT_OPENED` | Legal clearance required + Paresh authorization |
| `TTP-SCORE-VERSIONING-IMPL-001` | `score_version` column migration (only if schema proves insufficient) | `NOT_OPENED` | Only if String type proves insufficient |

---

## 6. Remaining Blockers Classification

| Blocker | Type | Scope | Status |
|---|---|---|---|
| `LEGAL_REVIEW_PENDING` | Hard legal blocker | Tenant-facing score exposure; `TEXQTICSCORE_V2_DISCLAIMER` final wording; any public score language | Active — blocks tenant/public surface only; does NOT block admin/internal implementation |
| OQ-V2-01 through OQ-V2-09 | Design decisions | All 9 open questions | **RESOLVED** — all 9 decided above |
| Dual-run logging strategy | Design decision | How to log v1 vs v2 in snapshot integration | **FUTURE** — to be defined in `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` |
| v2 snapshot persistence | Implementation decision | When and how to write `TEXQTICSCORE_V2` rows | **FUTURE** — not authorized until `TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001` is opened |
| Tenant factor detail / `risk_tier` exposure | Hard product + legal blocker | Tenant score history and factor detail | **FUTURE** — Wave 3 consent architecture + legal clearance required |
| `ttp_enabled=true` activation | Not a blocker for v2 service-only | Service-only slice requires no activation | Not applicable |

---

## 7. Final Decision Token

```
TTP_TEXQTICSCORE_V2_DESIGN_DECISIONS_001_RECORDED
```

**Authority:** Paresh Sharma — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Legal status:** `LEGAL_REVIEW_PENDING` — UNCHANGED  
**Files changed by this document:** This document only  
**Implementation authorized:** No  
**Schema authorized:** No  
**SQL migrations authorized:** No  
**Route changes authorized:** No  
**Score logic changes to `computeTtpScore` authorized:** No  
**Wave 2 implementation slices opened:** None — `TTP-TEXQTICSCORE-V2-SERVICE-001` is the next candidate pending explicit Paresh authorization  
**Wave 3/4/5 units opened:** None  
**Open questions remaining:** None — OQ-V2-01 through OQ-V2-09 all resolved

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*This document does not authorize any implementation. All implementation slices require explicit Paresh authorization.*
