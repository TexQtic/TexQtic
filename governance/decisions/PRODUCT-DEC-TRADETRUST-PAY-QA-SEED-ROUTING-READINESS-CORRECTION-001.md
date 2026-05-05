# PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-ROUTING-READINESS-CORRECTION-001

**Decision Type:** QA Seed Data Correction  
**Status:** VERIFIED COMPLETE  
**Date:** 2026-05-05  
**Author:** Copilot / Paresh  
**Supersedes:** Finding `QA_SEED_ROUTING_READINESS_PARTIAL` in `PRODUCT-DEC-TRADETRUST-PAY-SLICE-8-SCORE-ADVISORY-VERIFIED-001`

---

## 1. Correction Summary

The Phase 2 E2E suite for TTP Score Advisory (Slice 8) previously reported 34/38 pass. Two tests
failed due to a QA data seed gap, not a scoring engine defect:

| Test | Prior result | Root cause | Post-correction |
|------|-------------|-----------|----------------|
| TTB-4 `score=100, band=READY` | FAIL (score=95) | VPC selection non-deterministic | ✅ PASS |
| TTB-6 `all 7 factors PASS` | FAIL (Factor 7 FAIL) | `routing_readiness.found=false` | ✅ PASS |

Post-correction E2E result: **38/38 passed (57.9s)**.

---

## 2. Prior Finding

From `PRODUCT-DEC-TRADETRUST-PAY-SLICE-8-SCORE-ADVISORY-VERIFIED-001`:

```
FINDING: QA_SEED_ROUTING_READINESS_PARTIAL
TTB-4: score=95 (expected 100)
TTB-6: routing_readiness=FAIL (Factor 7: 0/5 pts)
Classification: QA data seed gap — scoring engine is correct
```

`ttp_enabled` was restored to `false` at `2026-05-04T19:04:20.256Z` per that document.

---

## 3. Root Cause Analysis

### Mechanism

`scripts/qa-ttp-seed.sql` §7 inserted two `verified_payable_certificates` rows in a single
`INSERT ... VALUES` clause:

- VPC 1 (`ee000000-...-000050`, `lifecycle_state_id = ACTIVE`) — no routing stub
- VPC 2 (`ee000000-...-000051`, `lifecycle_state_id = ROUTING_READY`) — has routing stub `...000060`

Both rows used `issued_at = now()`. Within the same database transaction the two `now()` calls
resolved to the **same timestamp** (PostgreSQL `now()` is transaction-stable). This produced
identical `issued_at` values.

### Service Logic

`TtpSummaryService.step6` queries:

```typescript
findMany({ where: { trade_id }, orderBy: { issued_at: 'desc' }, take: 1 })
```

With identical `issued_at` values, the `ORDER BY issued_at DESC` tiebreak is undefined.
The database returned either VPC 1 or VPC 2 non-deterministically.

When VPC 1 was selected as `latestVpc`:

```typescript
// step7 — no stub exists for VPC 1
partner_routing_stubs.findMany({ where: { vpc_id: 'ee000000-...-000050' } }) → []
routingReadiness = { found: false, routing_state: null }
```

Factor 7 scored `0/5` → `score = 95`, `routing_readiness = FAIL`.

### Classification

**QA data seed gap.** The scoring engine (`ttpScore.service.ts`, `ttpSummary.service.ts`) is
correct. No application code was changed.

---

## 4. Files Changed

### `scripts/qa-ttp-seed.sql`

**Edit 1 — §7 VPC 2 `issued_at` (future clean-slate runs)**

Changed VPC 2 INSERT from `now()` to `now() + INTERVAL '1 second'`:

```sql
-- Before:
now(),  -- issued_at

-- After:
now() + INTERVAL '1 second',
-- issued_at: 1 second after VPC 1 so orderBy({issued_at:'desc'}) always
-- selects VPC 2 as latestVpc → routing stub (§8) consistently found.
```

**Edit 2 — §8a UPDATE block (idempotent correction for existing DB rows)**

Inserted between §8 and §9:

```sql
-- §8a  Idempotent correction: ensure VPC 2 issued_at is strictly after VPC 1
--      (Guards against prior seeds that used now() for both rows in same txn)
UPDATE public.verified_payable_certificates
SET    issued_at = (
         SELECT issued_at + INTERVAL '1 second'
         FROM   public.verified_payable_certificates
         WHERE  id = 'ee000000-0000-0000-0000-000000000050'
       )
WHERE  id = 'ee000000-0000-0000-0000-000000000051'
  AND  issued_at <= (
         SELECT issued_at
         FROM   public.verified_payable_certificates
         WHERE  id = 'ee000000-0000-0000-0000-000000000050'
       );
```

This UPDATE is a no-op if VPC 2 already has a strictly later `issued_at`.

---

## 5. Data Correction Applied

The §8a UPDATE was applied directly via psql to the authoritative Supabase Postgres instance:

```
UPDATE 1
```

Execution context: `DATABASE_URL` (Supabase pooler, sslmode=require). No migration. No schema
change. No application code change. Sentinel rows only (`ee000000-*`).

---

## 6. Post-Correction Data Verification

SELECT query confirming ordering:

```
                  id                  |           issued_at
--------------------------------------+-------------------------------
 ee000000-0000-0000-0000-000000000050 | 2026-05-04 09:26:49.200392+00
 ee000000-0000-0000-0000-000000000051 | 2026-05-04 09:26:50.200392+00
(2 rows)
```

VPC 2 (`...000051`, `ROUTING_READY`) `issued_at` is exactly **1 second after** VPC 1 (`...000050`,
`ACTIVE`). `orderBy({ issued_at: 'desc' })` will deterministically select VPC 2 as `latestVpc`.

---

## 7. Production E2E Rerun Results

**Test file:** `tests/e2e/ttp-score-advisory-production-e2e.spec.ts`  
**Commit:** `77c8c0f` (unchanged — assertions not weakened)  
**Environment:** `TTP_FLAG_ENABLED=1`, production API (`https://app.texqtic.com`)  
**`ttp_enabled` flag:** Enabled at `2026-05-05T01:23:34.289Z`, **restored to `false` at `2026-05-05T01:25:01.297Z`**

```
Running 38 tests using 2 workers
38 passed (57.9s)
```

| Suite | Tests | Result |
|-------|-------|--------|
| TTA — Preflight Gate | TTA-1, TTA-2, TTA-3 (×2 workers) | ✅ All PASS |
| TTB — Seller Score API | TTB-1 through TTB-9 (×2 workers) | ✅ All PASS |
| TTC — Buyer Score API | TTC-1 through TTC-6 (×2 workers) | ✅ All PASS |
| TTD — UI Smoke | TTD-1 (×2 workers, known limitation) | ✅ All PASS |

**Previously failing tests — now passing:**

- `TTB-4: score=100, band=READY for fully seeded QA trade` ✅
- `TTB-6: all 7 factors have status=PASS for QA seed` ✅

**TTD-1 note:** `[KNOWN LIMITATION] QA trade ee000000-...-000010 not found in list. Skipping trade detail assertion. API tests remain authoritative.` — This is the pre-existing known limitation logged by the test itself; it passes (skips non-applicable assertion). No regression.

---

## 8. No-Go Boundaries Verified

| Boundary | Status |
|----------|--------|
| `ttp_enabled` restored to `false` immediately after E2E | ✅ `2026-05-05T01:25:01.297Z` |
| `transmission_status` remains `PENDING` / non-transmitted | ✅ Unchanged |
| No schema changes, no Prisma migrations | ✅ |
| No application code modified (`ttpScore.service.ts`, `ttpSummary.service.ts`) | ✅ |
| No E2E test assertions weakened | ✅ |
| Correction restricted to `ee000000-*` sentinel rows only | ✅ |
| No `.env`, no secrets exposed | ✅ |

---

## 9. Activation Recommendation

```
TTP_PHASE_1_PLUS_SCORE_READY_WITH_FLAG_OFF
```

The scoring engine, routing readiness factor, and all 7 factor dimensions are verified correct at
score=100 with a fully-seeded QA dataset. The `ttp_enabled` flag remains `false` pending Slice 5
sign-off per existing governance. No further QA data gaps are known.

---

## 10. Final Decision

```
QA_ROUTING_READINESS_CORRECTION_VERIFIED_COMPLETE
```

Phase 2 E2E score: **38/38 (100%)**. All prior findings from
`QA_SEED_ROUTING_READINESS_PARTIAL` are closed. The TTP Score Advisory implementation is
production-ready behind the feature flag.
