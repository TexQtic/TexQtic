# FAM-08C — Gate D.7 Admin INSERT RLS Investigation
## Investigation Artifact 001

**TECS ID:** FAM-08C-GATE-D7-ADMIN-INSERT-RLS-INVESTIGATION-001  
**Parent unit:** FAM-08 (RLS Integration Test Suite)  
**Status:** COMPLETE  
**Classification:** `TEST_CONTEXT_SETUP_MISMATCH`  
**Final Enum:** `FAM_08C_GATE_D7_INVESTIGATION_COMPLETE`

---

## 1. Unit Summary

This unit investigated AF-B-01 from FAM-08B: the three `impersonation_sessions` INSERT/UPDATE tests in Gate D.7 that fail with PostgreSQL error `42501` (permission denied for row-level security policy) when using `withDbContext(prisma, contextAdminA, ...)`.

Root cause is confirmed via complete migration trail analysis: migration `20260315000008` (2026-03-15) narrowed the `impersonation_sessions` INSERT/UPDATE/DELETE policies to require `app.is_superadmin = 'true'` in addition to admin context. The Gate D.7 test uses `withDbContext`, which does not set `app.is_superadmin`. The production service (`impersonation.service.ts`) correctly uses `withSuperAdminContext`, which sets both `app.is_admin = 'true'` and `app.is_superadmin = 'true'`. The test was not updated when the policy narrowing and service migration were co-applied.

---

## 2. Preflight Evidence

```
git status --short  →  (clean tree)
git rev-parse --short HEAD  →  93280558
git merge-base --is-ancestor 93280558 HEAD  →  ancestor_check:0
```

Prior artifacts present:
- `artifacts/launch-readiness/FAM-08B-HASDB-GATED-RLS-SUITE-VERIFICATION-001.md` ✓
- `artifacts/launch-readiness/FAM-08A-RLS-INTEGRATION-TEST-AUDIT-001.md` ✓
- `artifacts/launch-readiness/FAM-08-RLS-INTEGRATION-TEST-OPENING-AUDIT-001.md` ✓

Legal hold artifact (`governance/legal/fam-07/`): ABSENT (confirmed `Test-Path` → False). FAM-07 governance status unchanged per hold doctrine.

---

## 3. Environment Safety

| Item | Status |
|------|--------|
| Tree clean at start | ✓ CONFIRMED |
| HEAD ancestry to FAM-08B commit | ✓ CONFIRMED (`ancestor_check:0`) |
| Allowlist scope | Read-only investigation; one artifact write |
| Schema / migration files | NOT MODIFIED |
| Source / test files | NOT MODIFIED |
| OpenAPI contracts | NOT MODIFIED |
| `LAUNCH-FAMILY-INDEX.md` | NOT MODIFIED |
| Secrets exposure | None — DATABASE_URL never printed |

---

## 4. FAM-07 Legal Hold Preservation

FAM-07 status: `PARTIALLY_IMPLEMENTED` / `HOLD_FOR_HUMAN_LEGAL_INPUTS`  
FTR-LEGAL-003 status: `MVP_CRITICAL / OPEN`  
`governance/legal/fam-07/` directory: ABSENT  
`PublicSupplierProfile.tsx` or related: NOT STAGED, NOT MODIFIED  

This unit does not interact with FAM-07 scope. Legal hold invariant preserved.

---

## 5. Gate D.7 Failure Recap

**Test file:** `server/src/__tests__/gate-d7-impersonation-sessions-rls.integration.test.ts`

**Failing tests (from FAM-08B result — 4 failures total in Gate D.7):**
- AF-B-01a: `withDbContext(contextAdminA) → INSERT with adminId=ADMIN_A_ID` → `42501`
- AF-B-01b: `withDbContext(contextAdminA) → UPDATE where adminId=ADMIN_A_ID` → `42501`
- AF-B-01c: (any additional INSERT/UPDATE positive test) → `42501`
- Denial tests (3): PASS — cross-admin blocked, tenant-realm blocked, no-context fail-closed

**Error code:** PostgreSQL `42501` — "new row violates row-level security policy"  
**Observed from FAM-08B:** 4 failures in Gate D.7 suite; bypass seeding (`beforeAll`/`afterAll`) succeeds; denial tests pass.

---

## 6. Files and Policies Inspected

| File | Purpose |
|------|---------|
| `server/src/lib/database-context.ts` (read-only) | `withDbContext`, `withSuperAdminContext`, `withAdminContext`, `ADMIN_SENTINEL_ID` |
| `server/src/__tests__/gate-d7-impersonation-sessions-rls.integration.test.ts` (read-only) | Test context setup for `contextAdminA` |
| `server/prisma/migrations/20260212122000_db_hardening_wave_01_gate_a_context_helpers_and_pilot_rls/migration.sql` (read-only) | Helper function definitions |
| `server/prisma/migrations/20260215000000_db_hardening_wave_01_gate_d7_rls_impersonation_sessions/migration.sql` (read-only) | Original Gate D.7 policies |
| `server/prisma/migrations/20260223110000_g006c_rls_impersonation_sessions_consolidation/migration.sql` (read-only) | Intermediate consolidation |
| `server/prisma/migrations/20260315000004_g006c_p2_impersonation_sessions_rls_unify/migration.sql` (read-only) | G-006C P2 canonical unify |
| `server/prisma/migrations/20260315000008_ops_rls_superadmin_impersonation_sessions/migration.sql` (read-only) | **FINAL STATE** — superadmin narrowing |
| Live DB catalog query (`pg_policies`) | Attempted via psql; timed out — migration trail sufficient |

---

## 7. `withDbContext` Admin-Context Findings

**Source:** `server/src/lib/database-context.ts`

`withDbContext(prismaClient, context, callback)` sets the following GUCs in a transaction-local scope, in this exact order:

```sql
SET LOCAL ROLE texqtic_app         -- switches to NOBYPASSRLS role
app.org_id     = context.orgId
app.actor_id   = context.actorId
app.realm      = context.realm
app.request_id = context.requestId
app.bypass_rls = 'off'             -- explicitly disabled
app.roles      = context.roles     -- only if roles provided
```

**Critical: `withDbContext` does NOT set:**
- `app.is_admin`
- `app.is_superadmin`

**Helper functions (from migration `20260212122000`):**

```sql
app.current_actor_id() → NULLIF(current_setting('app.actor_id', TRUE), '')::uuid
app.current_realm()    → current_setting('app.realm', TRUE)
app.bypass_enabled()   → (current_setting('app.bypass_rls', true) = 'on' AND
                           current_setting('app.realm', true) IN ('test','service') AND
                           app.has_role('TEST_SEED'))
app.require_admin_context() → app.current_realm() = 'admin' AND app.current_actor_id() IS NOT NULL
```

**Gate D.7 test context for Admin A:**
```typescript
const contextAdminA: DatabaseContext = {
  orgId:     'aaaa0000-d700-d700-d700-00000000000a',  // ADMIN_A_ID
  actorId:   'aaaa0000-d700-d700-d700-00000000000a',  // ADMIN_A_ID
  realm:     'admin',
  requestId: 'test-req-admin-a',
};
```

**GUCs set by `withDbContext(prisma, contextAdminA, ...)`:**

| GUC | Value | Notes |
|-----|-------|-------|
| `app.org_id` | ADMIN_A_ID | ✓ |
| `app.actor_id` | ADMIN_A_ID | ✓ — `current_actor_id()` returns ADMIN_A_ID |
| `app.realm` | `'admin'` | ✓ — `current_realm()` returns 'admin' |
| `app.bypass_rls` | `'off'` | Explicitly disabled |
| `app.is_admin` | **NOT SET** | Not populated by `withDbContext` |
| `app.is_superadmin` | **NOT SET** | Not populated by `withDbContext` |

---

## 8. Gate D.7 Test-Context Findings

**Test INSERT payload:**
```typescript
{
  adminId:    ADMIN_A_ID,     // matches actorId in context
  targetOrgId: TARGET_ORG_ID,
  // ...other fields
}
```

**Policy evaluation trace for positive INSERT test:**

| Step | Check | Value | Result |
|------|-------|-------|--------|
| RESTRICTIVE guard | `require_admin_context()` | realm='admin', actorId IS NOT NULL | **PASS** (guard passed) |
| PERMISSIVE INSERT Arm 1 | `require_admin_context()` | TRUE | ✓ |
| PERMISSIVE INSERT Arm 1 | `admin_id = current_actor_id()` | ADMIN_A_ID = ADMIN_A_ID | ✓ |
| PERMISSIVE INSERT Arm 1 | `is_superadmin = 'true'` | **NOT SET → ''** | **FAIL** |
| PERMISSIVE INSERT Arm 2 | `is_admin = 'true'` | **NOT SET → ''** | **FAIL** |
| **Final decision** | Any PERMISSIVE arm passes? | **NO** | **→ 42501** |

The RESTRICTIVE guard passes (admin realm + non-null actor satisfies `require_admin_context()`), but no PERMISSIVE INSERT policy passes because `app.is_superadmin` is not set by `withDbContext`. Both arms of the current PERMISSIVE INSERT policy require `is_superadmin = 'true'`.

---

## 9. `impersonation_sessions` Schema Findings

Table exists in `public.impersonation_sessions`. Key fields:

```
admin_id       UUID    FK → auth.users (the admin performing impersonation)
target_org_id  UUID    FK → organizations (the tenant being impersonated)
```

The test INSERT uses `adminId: ADMIN_A_ID` matching the `actorId` in the test context — the actor isolation arm of the original policy was correctly satisfied. The failure is exclusively the missing `is_superadmin` GUC.

---

## 10. RLS Policy Findings

### Migration Trail (chronological)

**`20260215000000`** — Original Gate D.7 policies  
INSERT policy arm: `app.require_admin_context() AND admin_id = current_actor_id()`  
→ Testable with `withDbContext(realm='admin')`. No `is_superadmin` required.

**`20260223110000`** — G-006C consolidation  
INSERT policy arm: `(admin actor AND actor_id match) OR bypass`  
→ Added bypass arm; still no `is_superadmin`.

**`20260315000004`** — G-006C P2 canonical unify  
INSERT policy (PERMISSIVE):
```sql
(app.require_admin_context() AND admin_id = app.current_actor_id())
OR current_setting('app.is_admin'::text, true) = 'true'::text
```
→ No `is_superadmin` yet. `withDbContext(realm='admin')` would have passed Arm 1.

**`20260315000008`** — OPS-RLS-SUPERADMIN-001 — **FINAL STATE**  
INSERT policy (PERMISSIVE) — NARROWED:
```sql
(
  app.require_admin_context()
  AND admin_id = app.current_actor_id()
  AND current_setting('app.is_superadmin'::text, true) = 'true'::text
)
OR (
  current_setting('app.is_admin'::text, true) = 'true'::text
  AND current_setting('app.is_superadmin'::text, true) = 'true'::text
)
```
→ **Both arms now require `is_superadmin = 'true'`**. `withDbContext` does not set this. The Gate D.7 positive INSERT test fails here.

Migration `20260315000008` notes:
> "PREREQUISITE: service commit `1f211d6` (startImpersonation + stopImpersonation migrated to withSuperAdminContext which sets both GUCs tx-local)."

This confirms the policy narrowing was co-applied with the production service migration to `withSuperAdminContext`. The Gate D.7 test was not updated at the same time.

### RESTRICTIVE Guard (unchanged from `20260315000004` through final state)
```sql
app.require_admin_context()
OR current_setting('app.is_admin'::text, true) = 'true'::text
OR app.bypass_enabled()
```
The guard still passes for `withDbContext(realm='admin')` — so the RESTRICTIVE guard is not the blocker.

---

## 11. Root Cause Classification

**Classification: `TEST_CONTEXT_SETUP_MISMATCH`**

The Gate D.7 test uses `withDbContext(prisma, contextAdminA)` for positive INSERT/UPDATE tests. This context helper sets `app.realm = 'admin'` and `app.actor_id = ADMIN_A_ID` but does not set `app.is_superadmin`. Migration `20260315000008` narrowed the `impersonation_sessions` INSERT, UPDATE, and DELETE policies to require `app.is_superadmin = 'true'` in both permissive arms.

The production impersonation service (`impersonation.service.ts`) uses `withSuperAdminContext`, which correctly sets both `app.is_admin = 'true'` and `app.is_superadmin = 'true'`. The DB policies are internally consistent with the production service code. The test is the lagging artifact — it was not updated when the migration and service were co-updated at commit `1f211d6`.

This is not a policy defect. The narrowing of impersonation write operations to superadmin-only is an intentional security tightening (OPS-RLS-SUPERADMIN-001).

---

## 12. Security Assessment

**No security regression.** The RLS narrowing is a security improvement:

- Impersonation session INSERT/UPDATE/DELETE now requires `is_superadmin = 'true'` — a stronger constraint than the prior `is_admin = 'true'` requirement.
- The denial tests in Gate D.7 pass correctly: cross-admin inserts, tenant-realm inserts, and no-context inserts are all blocked.
- `withSuperAdminContext` is the correct production context helper for this path, and it is used correctly in `impersonation.service.ts`.
- The test failure is a coverage gap, not a security gap.

**Note on `withBypassForSeed`:** Bypass seeding succeeds in Gate D.7 `beforeAll`/`afterAll` because `withBypassForSeed` does NOT call `SET LOCAL ROLE texqtic_app`. The INSERT executes as the connected user (Supabase `postgres` superuser), which has inherent BYPASSRLS — the `TO texqtic_app` policies do not apply. This is the intended seed path and is safe.

---

## 13. Remediation Decision

**Decision required from Paresh.**

**Option A — Preferred: Update Gate D.7 test to use `withSuperAdminContext` (tests the production path)**

Replace the positive INSERT/UPDATE test bodies:
```typescript
// BEFORE (fails post-20260315000008):
await withDbContext(prisma, contextAdminA, tx =>
  tx.impersonationSession.create({ data: { adminId: ADMIN_A_ID, ... } })
);

// AFTER (tests production path):
await withSuperAdminContext(prisma, tx =>
  tx.impersonationSession.create({ data: { adminId: ADMIN_SENTINEL_ID, ... } })
);
```

Note: `withSuperAdminContext` uses `ADMIN_SENTINEL_ID` as both `orgId` and `actorId`. The `adminId` in the INSERT data must be updated to `ADMIN_SENTINEL_ID` accordingly. The actor isolation (Admin A cannot create sessions for Admin B) is tested separately by the denial tests, which pass.

**Option B — Alternative: Add superadmin context extension helper for tests**

Create a test-only context wrapper that calls `withDbContext` and then sets `app.is_superadmin = 'true'` tx-local. This would preserve testing the actor-isolation arm (Arm 1) while satisfying the `is_superadmin` requirement. However, this would test a path that the production service no longer uses (production uses Arm 2 via `withSuperAdminContext`).

**Recommendation: Option A.** Tests should mirror the production code path. The policy co-narrowed with `withSuperAdminContext` adoption — the test should follow the same migration.

**Scope of remediation write files:**
- `server/src/__tests__/gate-d7-impersonation-sessions-rls.integration.test.ts`
- No schema, migration, source service, or governance files require changes.

---

## 14. Proposed Next Unit Title

`FAM-08C1-GATE-D7-TEST-CONTEXT-REMEDIATION-001`

---

## 15. Proposed Next Unit Scope

Update Gate D.7 `gate-d7-impersonation-sessions-rls.integration.test.ts` to use `withSuperAdminContext` (and `ADMIN_SENTINEL_ID`) for the three failing INSERT/UPDATE positive tests, aligned with the production `impersonation.service.ts` call path. Verify all Gate D.7 tests pass (all positive tests + all denial tests) with a live `hasDb`-gated run. Produce a run evidence artifact.

---

## 16. Proposed Next Unit Allowed Write Files

```
ALLOWLIST (Modify):
  server/src/__tests__/gate-d7-impersonation-sessions-rls.integration.test.ts

ALLOWLIST (Create):
  artifacts/launch-readiness/FAM-08C1-GATE-D7-TEST-CONTEXT-REMEDIATION-001.md

READ-ONLY (no modification):
  server/src/lib/database-context.ts
  server/prisma/migrations/ (all)
  server/prisma/schema.prisma
  server/src/services/impersonation.service.ts
  shared/contracts/ (all)
  governance/ (all)
  LAUNCH-FAMILY-INDEX.md
```

---

## 17. Proposed Next Unit Forbidden Actions

```
FORBIDDEN:
  - Modifying any RLS migration file
  - Modifying impersonation.service.ts
  - Modifying database-context.ts
  - Adding or changing withSuperAdminContext implementation
  - Running prisma migrate dev / db push
  - Modifying schema.prisma
  - Committing without hasDb test run evidence
  - Modifying LAUNCH-FAMILY-INDEX.md or FAM-07 governance files
  - Printing DATABASE_URL or any .env value
```

---

## 18. Validation Evidence

**Migration analysis (primary evidence):**

| Migration | Key finding |
|-----------|-------------|
| `20260212122000` | Helper functions: `current_actor_id()` reads `app.actor_id`; `current_realm()` reads `app.realm` |
| `20260315000004` | G-006C P2 INSERT policy: `(require_admin_context AND actor_id match) OR is_admin='true'` — no is_superadmin |
| `20260315000008` | Final INSERT policy: **both arms require `is_superadmin='true'`**; migration note confirms co-applied with `withSuperAdminContext` service migration |
| `20260315000009` | Sequencing note confirms `20260315000008` is latest impersonation_sessions state |

**Source analysis:**
- `withDbContext` (lines 100-280, `database-context.ts`): does not set `app.is_admin` or `app.is_superadmin` ✓
- `withSuperAdminContext` (lines 855-905, `database-context.ts`): sets both `is_admin='true'` and `is_superadmin='true'`; uses `realm: 'control'` and `ADMIN_SENTINEL_ID` ✓
- `impersonation.service.ts` line 56: `withSuperAdminContext(prisma, ...)` for startImpersonation ✓
- `impersonation.service.ts` line 154: `withSuperAdminContext(prisma, ...)` for stopImpersonation ✓

**Live DB catalog query:** Attempted via psql; connection timed out. Migration trail is complete (5 migrations fully read, migration `20260315000008` confirmed as final state by presence of `20260315000009` sequencing note). Live query result is confirmatory-only; classification does not depend on it.

---

## 19. Status Preservation Statement

At the close of this unit:

| Invariant | State |
|-----------|-------|
| FAM-07 status | `PARTIALLY_IMPLEMENTED` — UNCHANGED |
| FAM-07 hold | `HOLD_FOR_HUMAN_LEGAL_INPUTS` — UNCHANGED |
| FTR-LEGAL-003 | `MVP_CRITICAL / OPEN` — UNCHANGED |
| `governance/legal/fam-07/` | ABSENT — UNCHANGED |
| `PublicSupplierProfile.tsx` | NOT STAGED, NOT MODIFIED |
| `LAUNCH-FAMILY-INDEX.md` | NOT MODIFIED |
| Schema / migration / source / test files | NOT MODIFIED |
| OpenAPI contracts | NOT MODIFIED |
| Git tree | Clean (one artifact write only) |

---

## 20. Final Enum

```
FAM_08C_GATE_D7_INVESTIGATION_COMPLETE
```

Root cause confirmed: `TEST_CONTEXT_SETUP_MISMATCH`. Investigation complete. Remediation design documented. Next unit proposed. No source, schema, or policy files were modified. Artifact committed as a single atomic artifact write.

---

*Artifact created: FAM-08C investigation — Gate D.7 impersonation_sessions INSERT RLS failure*  
*Classification: TEST_CONTEXT_SETUP_MISMATCH*  
*Recommended next unit: FAM-08C1-GATE-D7-TEST-CONTEXT-REMEDIATION-001*
