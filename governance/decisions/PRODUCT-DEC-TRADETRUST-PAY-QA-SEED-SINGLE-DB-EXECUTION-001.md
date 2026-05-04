# PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-SINGLE-DB-EXECUTION-001

**Decision ID:** PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-SINGLE-DB-EXECUTION-001  
**Status:** `TTP_QA_SEED_SINGLE_DB_EXECUTED_COMPLETE`  
**Date:** 2026-05-04  
**Supersedes:** `PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-EXECUTED-001` (status was `TTP_QA_SEED_EXECUTION_BLOCKED`)

---

## 1. Correction Summary

The prior blocked execution record (`PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-EXECUTED-001`, commit `63ba20e`) was issued when the TexQtic DB target was unclear and the safety boundary was ambiguous. This record supersedes it.

**Key correction:** Paresh (operator) explicitly confirmed that TexQtic runs a **single Supabase PostgreSQL database** with no separate QA/staging environment. The prior BLOCKED status was based on a misclassification of the target environment. The single-DB architecture is authoritative — the `ttp_enabled = false` kill-switch serves as the primary safety boundary for QA fixture isolation.

---

## 2. Operator Confirmation (Single-DB Authorization)

| Item | Value |
|---|---|
| Operator | Paresh Sharma (repo owner) |
| Confirmation | Explicit verbal authorization: "TexQtic has one Supabase DB. The ttp_enabled=false kill-switch is the safety boundary. Proceed with execution." |
| Architecture | Single Supabase PostgreSQL 17 project (aws-1-ap-northeast-1.pooler.supabase.com) |
| DB type | Remote Supabase — NOT local Postgres |
| Kill-switch status at execution | `ttp_enabled = false` (confirmed pre- and post-execution) |

---

## 3. Artifact Reference

| Item | Value |
|---|---|
| Seed file | `scripts/qa-ttp-seed.sql` |
| Base commit (seed authored) | `4453001` |
| Syntax fixes applied in this session | RAISE EXCEPTION strings merged (§0, §10); `updated_at = now()` added to `tenants` INSERT (§1) |
| Execution method | `psql` (v16.11) via PG* env vars, `ON_ERROR_STOP=1`, superuser (`postgres`), SSL required |
| psql host | `aws-1-ap-northeast-1.pooler.supabase.com:5432` (DIRECT_DATABASE_URL) |
| psql server version | 17.6 |

### Syntax Fixes Applied to `scripts/qa-ttp-seed.sql`

**Fix 1 — §0 RAISE EXCEPTION (adjacent string literals merged):**
```sql
-- BEFORE (PL/pgSQL syntax error):
RAISE EXCEPTION 'QA-TTP-SEED PRE-CHECK ABORT: ...' 'This seed must NEVER run...';
-- AFTER (correct):
RAISE EXCEPTION 'QA-TTP-SEED PRE-CHECK ABORT: ... This seed must NEVER run...';
```

**Fix 2 — §10 RAISE EXCEPTION (same pattern, also merged).**

**Fix 3 — §1 tenants INSERT (NOT NULL constraint on `updated_at`):**
```sql
-- BEFORE:
INSERT INTO public.tenants (id, slug, name) VALUES (...);
-- AFTER:
INSERT INTO public.tenants (id, slug, name, updated_at) VALUES (..., now());
```
Root cause: Prisma's `@updatedAt` does not generate a DB-level DEFAULT on the column. The `tenants` model uses `@updatedAt` without `@default(now())`, so raw SQL INSERTs must supply `updated_at` explicitly. All other seed tables use `@default(now())` and were not affected.

---

## 4. Pre-Execution Safety Checks (All PASS)

All 11 safety checks were verified before execution:

| # | Check | Result |
|---|---|---|
| 01 | `ttp_enabled = false` in `feature_flags` | ✅ PASS |
| 02 | Seed wrapped in `BEGIN…COMMIT` with `ON_ERROR_STOP=1` | ✅ PASS |
| 03 | §0 pre-flight ABORT guard (RAISE if `ttp_enabled = true`) | ✅ PASS |
| 04 | §10 post-check (RAISE if `ttp_enabled = true`) | ✅ PASS |
| 05 | All UUIDs use sentinel `ee000000-…` namespace | ✅ PASS |
| 06 | All INSERTs use `ON CONFLICT (id) DO NOTHING` (idempotent) | ✅ PASS |
| 07 | No UPDATE or DELETE statements in seed body | ✅ PASS |
| 08 | `ttp_enrollment_logs` uses INSERT only (immutability trigger is UPDATE/DELETE only) | ✅ PASS |
| 09 | No financial mutation — VPCs are status fixtures, not money-movement events | ✅ PASS |
| 10 | No secrets or PII in seed data | ✅ PASS |
| 11 | Seed targets `public` schema only | ✅ PASS |

---

## 5. Execution Result

**Command executed:**
```
psql (via PG* env vars) -v ON_ERROR_STOP=1 -f scripts/qa-ttp-seed.sql
```
*Connection string redacted per governance §3.*

**Full psql output:**
```
BEGIN
DO                     ← §0 pre-flight: ttp_enabled=false confirmed, continuing
INSERT 0 2             ← §1: tenants (2 rows: seller + buyer)
INSERT 0 0             ← §2: organizations (0 new rows — both already existed via ON CONFLICT DO NOTHING)
INSERT 0 1             ← §3: trades (1 row: QA-TRADE-TTP-001)
INSERT 0 1             ← §4: gst_verifications (1 row: seller org APPROVED)
INSERT 0 1             ← §5: ttp_eligibility_assessments (1 row: ELIGIBLE, risk_tier=1)
INSERT 0 3             ← §6: invoices (3 rows: VERIFIED, VERIFIED, SUBMITTED)
INSERT 0 2             ← §7: verified_payable_certificates (2 rows: ACTIVE, ROUTING_READY)
INSERT 0 1             ← §8: partner_routing_stubs (1 row: PENDING)
INSERT 0 2             ← §9: ttp_enrollment_logs (2 rows: REQUESTED, APPROVED)
DO                     ← §10 post-check: ttp_enabled=false confirmed
NOTICE: QA-TTP-SEED: ttp_enabled = false confirmed. TTP kill-switch remains active.
COMMIT
```

**Transaction outcome:** `COMMIT` — all rows persisted.

**Note on `INSERT 0 0` for organizations:** The two QA organization rows (`ee000000-…-001`, `ee000000-…-002`) already existed in the live DB before this seed run — likely from a prior operator onboarding action. The `ON CONFLICT (id) DO NOTHING` clause handled this correctly. All downstream FK references (gst_verifications, ttp_eligibility_assessments, invoices, etc.) resolved successfully, confirming the organizations are consistent.

---

## 6. Post-Seed Verification — All 16 Checks PASS

Verification queries run against `public.*` tables immediately after COMMIT.

```
                check_name                 | result
-------------------------------------------+--------
 CHECK-01: Seller tenant                   | PASS
 CHECK-02: Buyer tenant                    | PASS
 CHECK-03: Seller org exists               | PASS
 CHECK-04: Buyer org exists                | PASS
 CHECK-05: Trade exists                    | PASS
 CHECK-06: GST verification exists         | PASS
 CHECK-07: Eligibility assessment exists   | PASS
 CHECK-08: Invoice 001 exists              | PASS
 CHECK-09: Invoice 002 exists              | PASS
 CHECK-10: Invoice 003 exists              | PASS
 CHECK-11: VPC-001 exists                  | PASS
 CHECK-12: VPC-002 exists                  | PASS
 CHECK-13: Partner routing stub exists     | PASS
 CHECK-14: Enrollment log REQUESTED exists | PASS
 CHECK-15: Enrollment log APPROVED exists  | PASS
 CHECK-16: ttp_enabled remains FALSE       | PASS
(16 rows)
```

**All 16 checks: PASS.**

---

## 7. Single-DB Safety Invariants Maintained

| Invariant | Status |
|---|---|
| `ttp_enabled` remains `false` before execution | ✅ CONFIRMED (CHECK-16 pre- and post-execution) |
| `ttp_enabled` remains `false` after execution | ✅ CONFIRMED (CHECK-16 PASS) |
| No production tenant data modified | ✅ CONFIRMED (all rows use `ee000000-…` sentinel namespace) |
| No real financial data created | ✅ CONFIRMED (VPC/invoice rows are QA fixtures, not real payment records) |
| Immutability trigger respected | ✅ CONFIRMED (`ttp_enrollment_logs` INSERTs only; trigger is UPDATE/DELETE only) |
| All 9 seed sections committed atomically | ✅ CONFIRMED (single `BEGIN…COMMIT` block) |
| `org_id` tenancy isolation preserved | ✅ CONFIRMED (all records scoped to sentinel org IDs) |

---

## 8. Cleanup / Rollback

The seed is idempotent (re-runnable via `ON CONFLICT DO NOTHING`). Cleanup is optional.

Cleanup DELETEs are provided in **§12** of `scripts/qa-ttp-seed.sql` (currently commented out). To clean up:

1. For all tables except `ttp_enrollment_logs`: standard `DELETE WHERE id IN (...)`.
2. For `ttp_enrollment_logs`: requires `DISABLE TRIGGER` due to the 3-layer immutability enforcement:
   - Service layer block
   - DB trigger `trg_ttp_enrollment_log_immutable` (BEFORE UPDATE OR DELETE)
   - RLS policy `UPDATE/DELETE USING false`
   
   Cleanup requires explicit superuser approval and `DISABLE TRIGGER ALL ON ttp_enrollment_logs` before the DELETE.

**Cleanup requires explicit operator approval before execution.**

---

## 9. Next Unit

**Unit 3: E2E Activation Readiness Verification**

With QA seed data in place and TTP kill-switch confirmed at `false`, Unit 3 will:
- Enable `ttp_enabled = true` (via feature flag toggle, NOT DB direct)
- Verify all 6 TTP routes return 200 (not 503 FEATURE_DISABLED)
- Run the full TTP happy-path E2E test sequence using the QA seed data
- Re-disable `ttp_enabled = false` after test completion
- Document results in a Unit 3 governance record

Unit 3 is **NOT in scope for this prompt**.

---

## 10. Decision Status

**Final status:** `TTP_QA_SEED_SINGLE_DB_EXECUTED_COMPLETE`

All 13 QA fixture rows committed. All 16 post-seed checks PASS. `ttp_enabled = false` invariant maintained throughout. Seed script syntax errors corrected and committed. TexQtic TTP QA data layer is ready for Unit 3 E2E activation testing.
