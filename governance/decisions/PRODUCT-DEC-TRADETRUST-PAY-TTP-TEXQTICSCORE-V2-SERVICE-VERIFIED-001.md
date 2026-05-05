# PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-SERVICE-VERIFIED-001

## Governance Verification Record

| Field | Value |
|---|---|
| Unit | TTP-TEXQTICSCORE-V2-SERVICE-001 |
| Parent unit | TTP-TEXQTICSCORE-V2-IMPL-001 |
| Date | 2026-05-05 |
| Author | Copilot — TexQtic governed execution |
| Commit (service) | `3999a2c` — feat(tradetrust-pay): add texqticscore v2 service |
| Status | VERIFIED_COMPLETE |

---

## 1. Authority Basis

- Design decisions recorded in commit `66b4ac7` — `docs(tradetrust-pay): record texqticscore v2 design decisions`
- Design questions OQ-V2-01 through OQ-V2-09 resolved in the prior session
- Implementation authorized explicitly by Paresh Sharma, 2026-05-05, via TTP-TEXQTICSCORE-V2-SERVICE-001 prompt
- No further architectural decisions were made during this implementation unit; all choices follow the recorded design

---

## 2. Files Changed

| File | Type | Change |
|---|---|---|
| `server/src/services/ttpScoreV2.service.ts` | New | `computeTexQticScore` pure function + v2 types |
| `server/src/__tests__/ttp-score-v2.service.unit.test.ts` | New | 31 unit tests (TC-V2-001 through TC-V2-017 + sub-cases) |
| `server/src/ttp/ttp.constants.ts` | Modified | Appended `TEXQTICSCORE_V2_DISCLAIMER` constant |
| `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | Modified | Tracker §6/§9/§17/§18/§20 updated |

**Total: 4 files. No other files touched.**

---

## 3. Service Implementation Summary

New file: `server/src/services/ttpScoreV2.service.ts`

**Exports:**
- `TexQticScoreV2Input` — type alias for `TtpScoreInput` (OQ-V2-01: structurally identical, safe reuse)
- `TexQticScoreV2Band` — `'READY' | 'NEAR_READY' | 'NEEDS_REVIEW' | 'NOT_READY'`
- `ScoreVersion` — `'TTP_V1' | 'TEXQTICSCORE_V2'`
- `TexQticScoreV2Factor` — factor shape: `key, label, points_awarded, points_possible, status, explanation`
- `TexQticScoreV2` — output shape: `score, band, version, factors, blockers, next_steps, disclaimer`
- `computeTexQticScore(input: TexQticScoreV2Input): TexQticScoreV2` — pure function, no side effects, no I/O

**Imports:**
- `TtpScoreInput` from `./ttpScore.service.js` (type only — no runtime dependency on v1 logic)
- `TEXQTICSCORE_V2_DISCLAIMER` from `../ttp/ttp.constants.js`

**Internal constant:**
- `ENROLLMENT_ACTIVE_STATES = new Set(['APPROVED', 'REQUESTED'])` — defined locally in v2 service (not shared with v1)

---

## 4. v2 Factor Model

7 factors; total possible: 100 points. Factor keys renamed from v1 per OQ-V2-01.

| v2 key | v1 key | Points possible |
|---|---|---|
| `gst_verification` | `gst_readiness` | 20 |
| `eligibility_status` | `eligibility_readiness` | 25 |
| `risk_tier` | `risk_tier` | 10 |
| `invoice_verification` | `invoice_readiness` | 15 |
| `vpc_issuance` | `vpc_readiness` | 15 |
| `enrollment_status` | `enrollment_readiness` | 10 |
| `routing_readiness` | `routing_readiness` | 5 |

**Band thresholds (identical to v1):**

| Band | Threshold |
|---|---|
| `READY` | score ≥ 80 |
| `NEAR_READY` | score ≥ 60 |
| `NEEDS_REVIEW` | score ≥ 40 |
| `NOT_READY` | score 0–39 |

---

## 5. v1/v2 Parity Proof

- **TC-V2-015** (score parity): 8-fixture matrix — all pass. `v2.score === v1.score` for all inputs.
- **TC-V2-016** (band parity): 5-fixture matrix — all pass. `v2.band === v1.band` for all inputs.
- `computeTtpScore` was not modified. v1 output shape, factor keys, and disclaimer are unchanged.

---

## 6. Disclaimer Constant

Added to `server/src/ttp/ttp.constants.ts` (append-only, no existing line altered):

```typescript
// ─── TexQticScore v2 constants ────────────────────────────────────────────────
// TTP-TEXQTICSCORE-V2-SERVICE-001 — OQ-V2-03 (Option B): separate v2-specific disclaimer.
// LEGAL_REVIEW_PENDING — interim advisory wording; no tenant/public surface authorized.

export const TEXQTICSCORE_V2_DISCLAIMER =
  'TexQticScore is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment.';
```

`TEXQTICSCORE_V2_DISCLAIMER` differs from `SCORE_DISCLAIMER` (v1) — confirmed by TC-V2-012b.

`LEGAL_REVIEW_PENDING` status: active. This constant may not be surfaced to tenants or public UI without legal clearance.

---

## 7. ScoreVersion Type

`ScoreVersion = 'TTP_V1' | 'TEXQTICSCORE_V2'` — defined in the v2 service file. Not exported from `ttp.constants.ts` (OQ-V2-04 resolution: service-local; promote to shared types only when a second consumer exists).

---

## 8. Test Results

### v2 test suite
```
pnpm -C server exec vitest run src/__tests__/ttp-score-v2.service.unit.test.ts
```
**Result: 31 tests passed (1 file). Duration: ~419ms.**

Test cases covered:
- TC-V2-001: all-pass → score 100, band READY
- TC-V2-002: all-fail → no throw, NOT_READY
- TC-V2-003/b: `gst_verification` key, 20pts/0pts
- TC-V2-004/b/c: `eligibility_status` key, 25pts/0pts expired/0pts not found
- TC-V2-005/b/c: `risk_tier` key, 10pts/0pts null/0pts tier=0
- TC-V2-006/b: `invoice_verification` key, 15pts/0pts
- TC-V2-007/b: `vpc_issuance` key, 15pts/0pts
- TC-V2-008/b/c: `enrollment_status` key, 10pts APPROVED / 10pts REQUESTED / 0pts null
- TC-V2-009/b: `routing_readiness` key, 5pts/0pts
- TC-V2-010/b/c/d: band boundaries — 80=READY, 65=NEAR_READY, 40=NEEDS_REVIEW, 0=NOT_READY
- TC-V2-011: `version: 'TEXQTICSCORE_V2'` always present
- TC-V2-012/b: disclaimer always `TEXQTICSCORE_V2_DISCLAIMER`, distinct from `SCORE_DISCLAIMER`
- TC-V2-013: no `raw_bureau_json`, `cibil`, `pan_number`, `admin_note`, `gstin` in output
- TC-V2-014: no forbidden advisory wording (credit approved, underwriting, guaranteed, etc.)
- TC-V2-015: score parity with v1 — 8-fixture matrix
- TC-V2-016: band parity with v1 — 5-fixture matrix
- TC-V2-017: v1 regression guard — `computeTtpScore` unchanged

### v1 regression suite
```
pnpm -C server exec vitest run src/__tests__/ttp-score.service.unit.test.ts
```
**Result: 19 tests passed. v1 score service confirmed UNCHANGED.**

### Constants regression suite
```
pnpm -C server exec vitest run src/__tests__/ttp.constants.unit.test.ts
```
**Result: 64 tests passed. Constants file unchanged except TEXQTICSCORE_V2_DISCLAIMER append.**

### Combined regression total: 83 tests passed (2 files). No failures.

---

## 9. TypeScript Validation

```
pnpm -C server exec tsc --noEmit
```
**Result: No output (clean). Zero type errors.**

---

## 10. Safety Invariants — Confirmed

| Invariant | Status |
|---|---|
| `ttp_enabled=false` globally | UNCHANGED — no code modified; this is a feature gate, not in the pure function |
| `LEGAL_REVIEW_PENDING` | UNCHANGED — still active; TEXQTICSCORE_V2_DISCLAIMER is interim |
| `computeTtpScore` v1 function | UNCHANGED — file not touched; regression suite passes |
| `SCORE_DISCLAIMER` (v1) | UNCHANGED — confirmed by TC-V2-017 and TC-V2-012b |
| `TTP_DISCLAIMER_TEXT` | UNCHANGED — constants file was append-only |
| `TtpScoreInput` type | UNCHANGED — v2 type is alias only; no structural change |

---

## 11. No Route Changes

Zero route files modified. `computeTexQticScore` is a pure function. No HTTP endpoints expose v2 score in this unit.

---

## 12. No Snapshot Writes

No snapshot writes introduced. Service is stateless — input in, output out. No DB calls.

---

## 13. No Schema / Migration / SQL Changes

Zero Prisma schema changes. Zero migrations. Zero SQL files. Zero `.env` modifications.

---

## 14. computeTtpScore — Confirmed Unchanged

`server/src/services/ttpScore.service.ts` was not in the write allowlist. It was not touched. v1 test suite passes with 19/19 (TC-S-001 through TC-S-019).

---

## 15. Adjacent Findings

None. No unexpected issues encountered during implementation or validation.

---

## 16. Out-of-Scope Items (Not In This Unit)

The following are deferred to future units and were explicitly not implemented here:

- Routes exposing v2 score over HTTP
- Tenant-facing score history or snapshot writes
- v2 score surface in any UI component
- `ScoreVersion` promotion to shared types (deferred until second consumer)
- Legal clearance for `TEXQTICSCORE_V2_DISCLAIMER` surfacing

---

## 17. Final Decision Token

```
TTP_TEXQTICSCORE_V2_SERVICE_001_VERIFIED_COMPLETE
```

Commit: `3999a2c` — feat(tradetrust-pay): add texqticscore v2 service

---

*Record closed: 2026-05-05 — TexQtic governance corpus, TradeTrust Pay domain.*
