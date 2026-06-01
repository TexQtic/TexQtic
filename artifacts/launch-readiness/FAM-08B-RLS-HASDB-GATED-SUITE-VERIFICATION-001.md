# FAM-08B — hasDb-Gated RLS Suite Verification
**Unit:** FAM-08B-RLS-HASDB-GATED-SUITE-VERIFICATION-001
**Parent:** FAM-08 (T-2 RUNTIME_VERIFICATION_PARTIAL — 35 hasDb-skipped tests)
**Status:** RUNTIME_VERIFICATION_PARTIAL
**Date:** 2026-06-01

---

## 1. Unit Summary

Executed the 35 previously skipped `hasDb`-guarded RLS tests across five suites, with
`DATABASE_URL` available to the test process via `.env` file loaded into the shell session.

**Results:** 31 pass, 4 fail, 0 skip across 35 tests.

**T-2 classification:** `RUNTIME_VERIFICATION_PARTIAL`

- Four suites (gate-d2, gate-d3, gate-d6, rls-catalog-items smoke) pass completely — 28/28.
- Gate D.7 (impersonation_sessions) has 4 failures, all cascading from a single root cause:
  the RLS INSERT policy on `impersonation_sessions` blocks admin-context inserts via the
  standard `withDbContext` path. **No RLS bypass was observed in any suite.**

---

## 2. Preflight Evidence

```
git status --short        → (no output — clean tree)
git rev-parse --short HEAD → 088bbac4
git merge-base --is-ancestor 088bbac4 HEAD → exit 0 (confirmed ancestor)
```

**Artifact presence:**
- `artifacts/launch-readiness/FAM-08A-CATALOG-RLS-RESPONSE-SHAPE-REMEDIATION-001.md` → True
- `artifacts/launch-readiness/FAM-08-TENANT-CORE-WORKSPACE-RUNTIME-VERIFICATION-001.md` → True

**Working tree clean:** Yes. No source modifications before test execution.

---

## 3. Environment Safety Confirmation

**DATABASE_URL availability check (shell process before test run):**
```
node -e "process.exit(process.env.DATABASE_URL ? 0 : 1)"; echo "db_url_present:$LASTEXITCODE"
→ db_url_present:1   (not set in shell by default)
```

**Resolution:** Loaded server `.env` file into shell process using PowerShell
`[System.Environment]::SetEnvironmentVariable()` — values assigned to PowerShell variables
only, never echoed to stdout.

```
# Load .env silently — no values printed
$envFile = "C:/Users/PARESH/TexQtic/server/.env"
# [parse KEY=VALUE lines, strip quotes, assign via SetEnvironmentVariable("Process")]
node -e "process.exit(process.env.DATABASE_URL ? 0 : 1)"; echo "db_url_dotenv:$LASTEXITCODE"
→ db_url_dotenv:0   (DATABASE_URL present)
```

**NODE_ENV override required:** The `.env` file sets `NODE_ENV=development`. When vitest
inherits this value, `withBypassForSeed()` throws because `NODE_ENV !== "test"`. Required
explicit override before each test run:
```
$env:NODE_ENV = "test"
```
Confirmed:
```
node -e "console.log('NODE_ENV:', process.env.NODE_ENV)"
→ NODE_ENV: test
```

**DATABASE_URL value was never printed, logged, echoed, or included in this artifact.**

---

## 4. FAM-07 Legal Hold Confirmation

```
Test-Path "governance/legal/fam-07"                                      → False
Test-Path "governance/legal/fam-07/supplier-onboarding-terms-authority.json" → False
```

FAM-07 status: `PARTIALLY_IMPLEMENTED / HOLD_FOR_HUMAN_LEGAL_INPUTS` — unchanged.
FTR-LEGAL-003: `MVP_CRITICAL / OPEN` — unchanged.
FAM-07L14: not opened, not drafted.
`PublicSupplierProfile.tsx`: not staged, not modified.
No legal authority file created. No legal-final runtime behavior implemented.

---

## 5. Test Command Discovery

**Vitest version:** 4.0.18

**Config:** `server/vitest.config.ts` — `fileParallelism: false`, DB timeouts via
`TEST_DB_TIMEOUT_MS` (default 15 000ms). No `envFile` or `env` block — env vars must be
present in the shell environment.

**Run pattern (each file individually):**
```powershell
cd "C:/Users/PARESH/TexQtic/server"
pnpm vitest run src/__tests__/<file>.ts
```

**Note on env loading:** Vitest 4 exposes `.env` variables via `import.meta.env` but does
NOT automatically inject them into `process.env`. The `hasDb` guard reads
`process.env.DATABASE_URL` directly, so explicit shell-level env var injection is required.

---

## 6. Test Execution Plan

| Suite | File | Prior skip count |
|-------|------|-----------------|
| Gate D.2 | `gate-d2-carts-rls.integration.test.ts` | 7 |
| Gate D.3 | `gate-d3-audit-event-logs-rls.integration.test.ts` | 10 |
| Gate D.6 | `gate-d6-marketplace-cart-summaries-rls.integration.test.ts` | 6 |
| Gate D.7 | `gate-d7-impersonation-sessions-rls.integration.test.ts` | 7 |
| RLS Smoke | `rls-catalog-items.smoke.integration.test.ts` | 5 |
| **Total** | | **35** |

Ran each file individually. No pool exhaustion observed.

---

## 7. Gate D.2 Evidence — carts + cart_items

**Command:**
```
pnpm vitest run src/__tests__/gate-d2-carts-rls.integration.test.ts
```

**Result:**
```
✓ Gate D.2: RLS Enforcement — carts + cart_items (7)
  ✓ Tenant Isolation — carts (3)
    ✓ should isolate Org A carts from Org B                              7561ms
    ✓ should deny INSERT with wrong tenant context                       3957ms
    ✓ should deny UPDATE across tenant boundary                         3451ms
  ✓ Tenant Isolation — cart_items (JOIN-based RLS) (2)
    ✓ should isolate Org A cart_items from Org B via parent cart        6423ms
    ✓ should deny INSERT cart_item to cart owned by different tenant    4412ms
  ✓ Fail-Closed Enforcement (1)
    ✓ should return zero rows when querying with non-existent tenant context  3467ms
  ✓ Pooler Safety — Context Isolation (1)
    ✓ should isolate context between sequential transactions (Org A → Org B → Org A)  6426ms

Test Files  1 passed (1)
     Tests  7 passed (7)
  Duration  37.43s
```

**RLS evidence observed:**
- Cross-tenant INSERT on `carts`: PostgresError `42501` — "new row violates row-level security
  policy for table carts" ✓
- Cross-tenant INSERT on `cart_items`: PostgresError `42501` ✓
- No cross-tenant SELECT leakage observed.

**PASS — 7/7. No RLS bypass.**

---

## 8. Gate D.3 Evidence — audit_logs + event_logs

**Command:**
```
pnpm vitest run src/__tests__/gate-d3-audit-event-logs-rls.integration.test.ts
```

**Result:**
```
✓ Gate D.3: RLS Enforcement — audit_logs + event_logs (10)
  ✓ Tenant Isolation — audit_logs (2)
    ✓ should isolate Org A audit logs from Org B                        7252ms
    ✓ should deny INSERT with wrong tenant context                      1542ms
  ✓ Tenant Isolation — event_logs (2)
    ✓ should isolate Org A event logs from Org B                       3979ms
    ✓ should deny INSERT event log to tenant owned by different tenant  1543ms
  ✓ Immutability Enforcement (4)
    ✓ should deny UPDATE on audit_logs (immutable ledger)              1538ms
    ✓ should deny DELETE on audit_logs (immutable ledger)              1492ms
    ✓ should deny UPDATE on event_logs (immutable event stream)        1641ms
    ✓ should deny DELETE on event_logs (immutable event stream)        1526ms
  ✓ Fail-Closed Enforcement (1)
    ✓ should return zero rows when querying with non-existent tenant context  3128ms
  ✓ Pooler Safety — Context Isolation (1)
    ✓ should isolate context between sequential transactions (Org A → Org B → Org A)  7042ms

Test Files  1 passed (1)
     Tests  10 passed (10)
  Duration  34.22s
```

**RLS evidence observed:**
- Cross-tenant INSERT on `audit_logs`: PostgresError `42501` ✓
- Cross-tenant INSERT on `event_logs`: PostgresError `42501` ✓
- UPDATE on `audit_logs`: `42501` "permission denied for table audit_logs" ✓
- DELETE on `audit_logs`: `42501` "permission denied" ✓
- UPDATE/DELETE on `event_logs`: `42501` ✓
- Immutable ledger enforcement confirmed at DB layer.

**PASS — 10/10. No RLS bypass.**

---

## 9. Gate D.6 Evidence — marketplace_cart_summaries

**Command:**
```
pnpm vitest run src/__tests__/gate-d6-marketplace-cart-summaries-rls.integration.test.ts
```

**Result:**
```
✓ Gate D.6: Projection Table RLS (marketplace_cart_summaries) (6)
  ✓ should isolate Org A projections from Org B (tenant SELECT)         3407ms
  ✓ should deny Org A from seeing Org B projection by direct query      1379ms
  ✓ should fail-closed: no context and no bypass prevents INSERT        2593ms
  ✓ should allow projector bypass to INSERT new projection row          3587ms
  ✓ should allow projector bypass to UPDATE projection row (version increment)  2866ms
  ✓ should maintain context isolation across pooler transactions (A → projector → B → A)  5694ms

Test Files  1 passed (1)
     Tests  6 passed (6)
  Duration  27.85s
```

**RLS evidence observed:**
- Projector bypass (`projector_bypass=on + realm=system + role=PROJECTOR`) allows INSERT/UPDATE.
- Tenant SELECT isolation enforced: Org A cannot see Org B projections.
- No-context fail-closed: INSERT denied without context.
- Context isolation across pooler transactions confirmed.

**PASS — 6/6. No RLS bypass.**

---

## 10. Gate D.7 Evidence — impersonation_sessions

**Command:**
```
pnpm vitest run src/__tests__/gate-d7-impersonation-sessions-rls.integration.test.ts
```

**Result:**
```
❯ Gate D.7: Control-Plane RLS (impersonation_sessions) (7)
  × should allow Admin A to INSERT session where admin_id = Admin A     3568ms
  ✓ should deny Admin A from INSERTing session where admin_id = Admin B  1875ms
  × should allow Admin A to SELECT only their sessions (actor isolation) 1761ms
  × should allow Admin A to UPDATE their session (end session)          1515ms
  ✓ should deny tenant realm from SELECTing impersonation sessions      1461ms
  ✓ should fail-closed: no admin context denies SELECT/INSERT/UPDATE    1147ms
  × should maintain context isolation across pooler transactions        1494ms

Test Files  1 failed (1)
     Tests  4 failed | 3 passed (7)
  Duration  19.47s
```

**Passing tests (3) — RLS denial behavior confirmed:**
- Admin A cannot INSERT session for Admin B → correctly blocked (policy enforces `admin_id = actor`)
- Tenant realm cannot SELECT impersonation sessions → correctly blocked (control-plane private)
- No-context fail-closed → correctly blocked

**Failing tests (4) — root cause analysis:**

**Root cause:** Test 1 (`should allow Admin A to INSERT session where admin_id = Admin A`)
fails with PostgresError `42501` — "new row violates row-level security policy for table
impersonation_sessions" — when using the standard `withDbContext(prisma, contextAdminA, ...)` path.

- `contextAdminA` has `realm: 'admin'`, `orgId: ADMIN_A_ID`, `actorId: ADMIN_A_ID`
- INSERT has `adminId: ADMIN_A_ID` — same as actor
- Bypass-gated seeding (`withBypassForSeed`) inserts the same table successfully

**Cascade failures from test 1:**
- Test 3 (`SELECT only their sessions`): expects 2 rows but gets 0 (no INSERT succeeded → 0 rows)
- Test 4 (`UPDATE their session — end session`): record not found (was not inserted)
- Test 7 (`context isolation across pooler`): expects 2 rows from Admin A's sessions → 0 rows

**Failure nature:** This is a **positive-authorization path mismatch** — the RLS INSERT policy is
more restrictive than the test expects. **This is NOT an RLS bypass.** The fail-closed tests pass,
confirming the policy blocks unauthorized access correctly. The failing tests show that admin
INSERT via `withDbContext` is unexpectedly blocked.

**Hypothesis (not verified in this unit — out of scope):** The `impersonation_sessions` INSERT
policy may check `current_setting('app.admin_id')` while `withDbContext` sets `app.org_id` from
`DatabaseContext.orgId`. If the INSERT policy uses a different session variable name than what
the admin realm context sets, the check would fail. Requires targeted investigation.

**No RLS bypass in gate-d7.** Fail-closed properties confirmed.

---

## 11. RLS Catalog Items Smoke Evidence

**Command:**
```
pnpm vitest run src/__tests__/rls-catalog-items.smoke.integration.test.ts
```

**Result:**
```
✓ RLS Catalog Items — Cross-Tenant Isolation (Smoke) (5)
  ✓ Org A context returns only Org A items                            10500ms
  ✓ Org B context returns only Org B items                            7565ms
  ✓ Cross-tenant isolation: Org A cannot see Org B items              7291ms
  ✓ Fail-closed: Query without context throws error or returns empty  6141ms
  ✓ Pooler safety: Context does not bleed between transactions        9897ms

Test Files  1 passed (1)
     Tests  5 passed (5)
  Duration  44.45s
```

**PASS — 5/5. No RLS bypass. Catalog item isolation confirmed at DB layer.**

---

## 12. T-2 Classification Result

**T-2 classification: `RUNTIME_VERIFICATION_PARTIAL`**

| Suite | Tests | Pass | Fail | RLS bypass | Classification |
|-------|-------|------|------|-----------|---------------|
| Gate D.2 (carts) | 7 | 7 | 0 | None | PASS |
| Gate D.3 (audit/event logs) | 10 | 10 | 0 | None | PASS |
| Gate D.6 (marketplace cart summaries) | 6 | 6 | 0 | None | PASS |
| Gate D.7 (impersonation sessions) | 7 | 3 | 4 | **None** | PARTIAL |
| RLS smoke (catalog items) | 5 | 5 | 0 | None | PASS |
| **Totals** | **35** | **31** | **4** | **None** | **PARTIAL** |

**Rationale for RUNTIME_VERIFICATION_PARTIAL rather than RUNTIME_VERIFICATION_FAILED:**
- No RLS bypass was observed in any suite.
- The 4 gate-d7 failures are positive-authorization path failures (admin INSERT blocked), not
  security failures. The fail-closed tests in gate-d7 pass, confirming unauthorized access is
  correctly blocked.
- T-2 partial: gate-d7 requires dedicated investigation of the admin INSERT RLS policy path.

**T-1 and T-6 classifications: unchanged.** This unit does not affect T-1 or T-6.

---

## 13. Remaining Failures / Skips

**Gate D.7 — 4 failures (all cascade from test 1):**

| Test | Failure type | Root cause |
|------|-------------|-----------|
| should allow Admin A to INSERT session (admin_id = Admin A) | `42501` RLS block | Admin INSERT policy blocks `withDbContext` path |
| should allow Admin A to SELECT only their sessions | expected 2, got 0 | Cascade: no rows inserted by test 1 |
| should allow Admin A to UPDATE their session | Record not found | Cascade: test 1 INSERT failed |
| should maintain context isolation (Admin A → B → A) | expected 2, got 0 | Cascade: no rows inserted |

**Root failure:** Test 1 — INSERT on `impersonation_sessions` blocked by RLS when using admin
realm context. Bypass-gated seeding on the same table succeeds, confirming the table and FK
constraints are correct.

**0 tests remain skipped.** All 35 previously skipped tests were executed.

---

## 14. Adjacent Findings

**AF-B-01 (gate-d7 admin INSERT policy mismatch):**

`impersonation_sessions` INSERT policy blocks the standard `withDbContext(prisma, adminContext)`
path even when `adminId` matches the context actor. The bypass path works. The likely cause is a
session variable name mismatch: the INSERT policy may check `current_setting('app.admin_id')`
while `withDbContext` for admin realm sets `app.org_id` (from `DatabaseContext.orgId`). This
needs investigation in a dedicated unit. Not an RLS bypass. Fail-closed behavior confirmed.

**AF-B-02 (env injection required for hasDb-gated tests):**

Vitest 4 does not inject `.env` variables into `process.env` automatically. The `hasDb` guard
reads `process.env.DATABASE_URL` at module import time. Tests must be run with `DATABASE_URL`
already in the shell environment and `NODE_ENV=test` explicitly set. This is an operational
requirement — not a code defect — but should be documented for CI configuration.

---

## 15. Selected Next Packet

Given T-2 = `RUNTIME_VERIFICATION_PARTIAL` due to gate-d7 admin INSERT path failures (no RLS
bypass), the recommended next unit is a targeted investigation:

```
FAM-08C-GATE-D7-ADMIN-INSERT-RLS-INVESTIGATION-001
```

This unit should:
1. Inspect `withDbContext` admin realm context variable setup
2. Inspect the `impersonation_sessions` RLS INSERT policy on the DB
3. Determine whether the policy checks `app.admin_id` or `app.org_id`
4. Determine whether the fix is a test context update or a DB policy update
5. Re-run gate-d7 with corrected setup to confirm 7/7 pass

If gate-d7 is confirmed as a test context setup issue (not a DB policy defect), T-2 can be
advanced to `PROVEN_READY` after remediation.

---

## 16. Proposed Next Unit Title

```
FAM-08C-GATE-D7-ADMIN-INSERT-RLS-INVESTIGATION-001
```

---

## 17. Proposed Next Unit Scope

1. Read `server/src/lib/database-context.ts` — confirm what context variables `withDbContext`
   sets for `realm: 'admin'`
2. Inspect the `impersonation_sessions` RLS policies on the Supabase DB (read-only, no changes)
3. Check whether `DATABASE_URL` context supports `app.admin_id` or only `app.org_id`
4. Classify: test setup issue OR DB policy defect
5. If test setup issue: propose test fix in a separate allowlisted patch unit
6. If DB policy defect: propose SQL remediation with full governance review
7. Re-run gate-d7 and document 7/7 pass or remaining partial
8. If 7/7 pass: advance T-2 to `PROVEN_READY`

---

## 18. Proposed Next Unit Allowed Write Files

```
artifacts/launch-readiness/FAM-08C-GATE-D7-ADMIN-INSERT-RLS-INVESTIGATION-001.md
```

Source and test file changes (if needed) require an expanded allowlist in a separate patch unit.

---

## 19. Proposed Next Unit Forbidden Actions

- Do not modify `impersonation_sessions` RLS policies without explicit user approval
- Do not modify `server/src/lib/database-context.ts` without explicit user approval
- Do not modify gate-d7 test file without explicit user approval
- Do not run `prisma migrate dev`, `prisma db push`, or any DDL
- Do not print or expose DATABASE_URL, admin credentials, or session tokens
- Do not close FTR-LEGAL-003, advance FAM-07, or create legal authority files
- Do not mark FAM-08 complete in trackers

---

## 20. Validation Evidence

**Post-test git state:**
```
git status --short   → (no output — clean)
git diff --name-only → (no output — clean)
git diff --stat      → (no output — clean)
git diff --name-only --cached → (no output — nothing staged)
```

**Files changed:** 0 source/test/schema/migration/governance files.
**Only file to be committed:** `artifacts/launch-readiness/FAM-08B-RLS-HASDB-GATED-SUITE-VERIFICATION-001.md`

Markdown lint tooling: not available via standard pnpm scripts. No lint run performed.

---

## 21. Status Preservation Statement

| Invariant | Required state | Confirmed |
|-----------|---------------|-----------|
| FAM-07 status | `PARTIALLY_IMPLEMENTED` | ✓ |
| FAM-07 hold | `HOLD_FOR_HUMAN_LEGAL_INPUTS` | ✓ |
| FTR-LEGAL-003 | `MVP_CRITICAL / OPEN` | ✓ |
| `governance/legal/fam-07/` | ABSENT | ✓ |
| `PublicSupplierProfile.tsx` | NOT STAGED, NOT MODIFIED | ✓ |
| `LAUNCH-FAMILY-INDEX.md` | NOT MODIFIED | ✓ |
| Schema/migration files | NOT MODIFIED | ✓ |
| OpenAPI contracts | NOT MODIFIED | ✓ |
| FAM-08 trackers | NOT MODIFIED | ✓ |
| Source/test files | NOT MODIFIED | ✓ |
| No secrets exposed | DATABASE_URL never printed | ✓ |
| FAM-07L14 | NOT OPENED / NOT DRAFTED | ✓ |
| Legal authority file | NOT CREATED | ✓ |
| Runtime mutations | NONE (test-managed only) | ✓ |
| HD-001 | `RUNTIME_CONFIRMED_CONFIGURED` | ✓ (unchanged) |

---

## 22. Final Enum

```
FAM_08B_RLS_HASDB_VERIFICATION_PARTIAL

T-2: RUNTIME_VERIFICATION_PARTIAL
  Gate D.2 (carts):              7/7  PASS  — no RLS bypass
  Gate D.3 (audit/event logs):  10/10 PASS  — immutability confirmed
  Gate D.6 (marketplace proj):   6/6  PASS  — projector bypass confirmed
  Gate D.7 (impersonation):      3/7  FAIL  — admin INSERT blocked (positive-auth mismatch; no bypass)
  RLS smoke (catalog):           5/5  PASS  — isolation confirmed
  Total:                        31/35        — 4 failures (gate-d7 cascade)

AF-B-01: gate-d7 admin INSERT policy mismatch (out of scope; registered for FAM-08C)
AF-B-02: env injection required for hasDb-gated tests (operational note)
Next: FAM-08C-GATE-D7-ADMIN-INSERT-RLS-INVESTIGATION-001
```
