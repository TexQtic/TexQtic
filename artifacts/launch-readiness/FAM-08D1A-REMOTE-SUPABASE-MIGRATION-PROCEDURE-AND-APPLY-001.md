# FAM-08D1A-REMOTE-SUPABASE-MIGRATION-PROCEDURE-AND-APPLY-001
## Artifact Type: Remote Migration Apply Closure Record
## Task ID: FAM-08D1A-REMOTE-SUPABASE-MIGRATION-PROCEDURE-AND-APPLY-001
## Parent: FAM-08D1 — NC Pool Primary Flag Seed Migration
## Date: 2026-06-03
## Author: TexQtic Platform Engineering (Safe-Write Mode)
## Constitutional Review: FAM-08 launch readiness authorized track

---

## §1 — Unit Summary

This unit confirms that the `20260603000000_nc_pool_primary_flag_seed` migration (created and committed in FAM-08D1, HEAD `c6a90aa7`) has been applied to the remote Supabase PostgreSQL database, and that both NC primary feature flag rows exist with `enabled = true`.

The unit also documents the repo-approved remote migration procedure (`pnpm -C server run db:migrate:tracked`), the evidence sources inspected to establish that procedure, and the row-level verification results for both flags.

| Key | Expected enabled | Verified enabled |
|-----|-----------------|-----------------|
| `nc.procurement_pools.enabled` | `true` | `true` ✅ |
| `nc.procurement_pools.rfq.enabled` | `true` | `true` ✅ |

**Scope:** Read-only confirmation + artifact. No migration file changes. No schema changes. No source code changes. No governance tracker changes.

---

## §2 — Preflight Evidence

**Branch:** main
**HEAD before work:** `c6a90aa7` — "db(fam-08): seed nc pool primary feature flags"
**Ancestry check:** `git merge-base --is-ancestor c6a90aa7 HEAD` → `ancestor_check:True`

**Git status before work:**
```
git status --short   → (no output — clean tree)
git diff --name-only → (no output — no modified tracked files)
git diff --name-only --cached → (no output — nothing staged)
```

**Governance file checks:**
```
Test-Path server/prisma/migrations/20260603000000_nc_pool_primary_flag_seed/migration.sql → True
Test-Path artifacts/launch-readiness/FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001.md → True
Test-Path governance/legal/fam-07 → False  (correct — hold intact)
Test-Path governance/legal/fam-07/supplier-onboarding-terms-authority.json → False  (correct)
```

**Env var presence (no values printed):**
```
DATABASE_URL_present:True
DIRECT_DATABASE_URL_present:True
```

**Preflight result: PASS**

---

## §3 — FAM-07 Legal Hold Confirmation

FAM-07 status at close of this unit:
- **Status:** `PARTIALLY_IMPLEMENTED`
- **Hold:** `HOLD_FOR_HUMAN_LEGAL_INPUTS`
- **FTR-LEGAL-003:** `MVP_CRITICAL / OPEN`
- **`governance/legal/fam-07/`:** ABSENT — correct; FAM-07L14 NOT opened by this unit
- **`PublicSupplierProfile.tsx`:** NOT staged, NOT modified

This unit touches only the remote apply confirmation track (FAM-08D1A). No legal, auth, or supplier-profile surfaces were approached.

---

## §4 — FAM-08D1 Migration File Confirmation

The migration file produced by FAM-08D1 exists at the expected path:

```
server/prisma/migrations/20260603000000_nc_pool_primary_flag_seed/migration.sql
→ EXISTS: True
```

**Migration SQL structure recap (committed in c6a90aa7):**
- **§1 PRE-FLIGHT:** guards `public.feature_flags` table exists before proceeding
- **§2 SEED:** `INSERT INTO public.feature_flags (key, enabled, description, value, updated_at) VALUES ... ON CONFLICT (key) DO UPDATE SET enabled=EXCLUDED.enabled, description=EXCLUDED.description, updated_at=NOW()`
- **§3 POST-FLIGHT:** asserts both keys have `enabled IS TRUE`; `RAISE NOTICE` on pass, `RAISE EXCEPTION` (rolling back the transaction) on failure

The POST-FLIGHT guard is critical: if the migration were applied without the flags reaching `enabled=true`, the migration SQL would have raised an exception and the transaction would have rolled back — the row in `_prisma_migrations` would NOT exist. The fact that the migration is in `_prisma_migrations` (134 total, all applied) is structural proof the post-flight passed.

---

## §5 — Remote Migration Procedure Sources Inspected

The following files were read to establish the canonical repo-approved remote migration procedure before running any commands:

| File | Purpose | Key Findings |
|------|---------|-------------|
| `governance/gap-register.md` | OPS-ENV-001 / OPS-ENV-002 entries | `db:migrate:tracked` confirmed as approved command; wrapper scripts listed |
| `server/package.json` | Script registry | `db:migrate:tracked = prisma:preflight && migrate:deploy:prod`; `db:migrate` is an alias |
| `server/scripts/prisma-env-preflight.ts` | Preflight implementation | Reads `server/.env` manually; classifies DIRECT_DATABASE_URL; exits 0 for SESSION_POOLER (`aws-1-*` port 5432); exits 1 for TX_POOLER |
| `server/scripts/migrate-deploy.ts` | Deploy wrapper implementation | Loads `server/.env` manually; validates endpoint class; injects env into child process; runs `prisma migrate deploy`; NO secrets printed |
| `server/prisma/schema.prisma` | Prisma datasource | `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_DATABASE_URL")` — Prisma migration engine uses `directUrl` |
| `docs/ops/REMOTE-MIGRATION-APPLY-LOG.md` | Canonical remote apply log | Confirmed host `aws-1-ap-northeast-1.pooler.supabase.com:5432`; log format established; OPS-REMOTE-MIGRATIONS-CATCHUP-001 on 2026-03-03 |

---

## §6 — Confirmed Repo-Approved Remote Migration Procedure

The canonical procedure is:

```
pnpm -C server run db:migrate:tracked
```

**Equivalent alias:** `pnpm -C server run db:migrate`

**Expansion (from server/package.json):**
```
db:migrate:tracked  →  pnpm run prisma:preflight && pnpm run migrate:deploy:prod
prisma:preflight    →  tsx scripts/prisma-env-preflight.ts
migrate:deploy:prod →  tsx scripts/migrate-deploy.ts
```

**Preflight responsibilities (`prisma-env-preflight.ts`):**
- Reads `server/.env` manually (not relying on shell env)
- Classifies DIRECT_DATABASE_URL endpoint: SESSION_POOLER → exit 0 (safe); TX_POOLER → exit 1 (blocked)
- SESSION_POOLER criterion: `aws-1-*.pooler.supabase.com` port 5432

**Deploy wrapper responsibilities (`migrate-deploy.ts`):**
- Loads `server/.env` manually (solves the "PowerShell doesn't auto-source .env" problem)
- Validates DIRECT_DATABASE_URL endpoint class (blocks TX_POOLER)
- Injects all loaded env vars into the child process environment
- Executes `prisma migrate deploy` with the injected env
- **NO secrets are printed at any point**

This procedure was designed in OPS-ENV-001 and confirmed working in OPS-ENV-002 (G-024 deploy).

---

## §7 — Remote Target Confirmation (Without Secrets)

**Preflight output (key lines):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Prisma Migration Env Preflight (OPS-ENV-001)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Var used    : DIRECT_DATABASE_URL
  Scheme      : postgres
  Host        : aws-1-ap-northeast-1.pooler.supabase.com
  Port        : 5432
  Endpoint    : SESSION_POOLER

  ✓ SESSION_POOLER — acceptable for Prisma migrations on Supabase

  PREFLIGHT PASS
```

**Target classification:**
- Host: `aws-1-ap-northeast-1.pooler.supabase.com` → **Remote Supabase PostgreSQL** ✅
- Port: `5432` → SESSION_POOLER (not TX_POOLER port 6543) ✅
- This is NOT `localhost` ✅
- This is NOT a TX_POOLER that would block DDL ✅
- Credentials were NOT printed ✅

---

## §8 — Remote Migration Apply Command and Process

The migration was applied via the approved `migrate:deploy:prod` wrapper, preceded by `prisma:preflight`:

**Step 1 — Preflight:**
```powershell
pnpm -C server run prisma:preflight
```
Result: `PREFLIGHT PASS` (SESSION_POOLER confirmed) ✅

**Step 2 — Deploy:**
```powershell
pnpm -C server run migrate:deploy:prod
```
Internally, `migrate-deploy.ts`:
1. Loaded `server/.env` manually
2. Classified DIRECT_DATABASE_URL → SESSION_POOLER → passed validation
3. Spawned `prisma migrate deploy` with injected env
4. Prisma connected to `aws-1-ap-northeast-1.pooler.supabase.com:5432` (remote Supabase)
5. Found 134 migrations in `prisma/migrations`
6. Queried `_prisma_migrations` table on remote
7. Reported: No pending migrations to apply

**Combined alias (equivalent to both steps):**
```powershell
pnpm -C server run db:migrate
```

---

## §9 — Remote Apply Result

**Full output from `migrate:deploy:prod`:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Migrate Deploy Wrapper (OPS-ENV-001)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Var         : DIRECT_DATABASE_URL
  Host        : aws-1-ap-northeast-1.pooler.supabase.com
  Port        : 5432
  Database    : postgres
  Endpoint    : SESSION_POOLER

  ✓ Preflight passed — running prisma migrate deploy

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-ap-northeast-1.pooler.supabase.com:5432"

134 migrations found in prisma/migrations


No pending migrations to apply.

  ✓ prisma migrate deploy completed successfully
```

**Interpretation:**
- `134 migrations found` = 133 prior migrations + `20260603000000_nc_pool_primary_flag_seed` = **134** ✅
- `No pending migrations to apply` = all 134 migrations are tracked as `finished_at IS NOT NULL` in `_prisma_migrations` on the remote DB ✅
- Migration `20260603000000_nc_pool_primary_flag_seed` is confirmed present and applied in `_prisma_migrations` ✅

The migration was already applied to the remote Supabase database by the time FAM-08D1A commenced. The `migrate:deploy:prod` run confirms current apply status and proves no regression has occurred.

---

## §10 — Remote Verification Query Shape

Flags were verified using a read-only `SELECT` query via PrismaClient connected to DATABASE_URL (remote Supabase transaction pooler — safe for read queries):

```sql
SELECT key, enabled
FROM public.feature_flags
WHERE key IN (
  'nc.procurement_pools.enabled',
  'nc.procurement_pools.rfq.enabled'
)
ORDER BY key;
```

**Execution method:** Node.js CJS process with manual `.env` loading (same parsing pattern as `prisma-env-preflight.ts` and `migrate-deploy.ts`), dynamic `import('@prisma/client')`, read-only `$queryRawUnsafe` call.

**Why not psql:** `psql` does not auto-load `.env` files. It uses OS-level environment variables only. `DATABASE_URL` is not in the PowerShell shell environment (only in `server/.env`). Any bare `psql $env:DATABASE_URL` would connect to `localhost` with the current OS user and fail authentication. The Node.js approach with manual `.env` loading is the correct method for this environment.

---

## §11 — Remote Verification Results

**Raw output:**
```
FLAG:nc.procurement_pools.enabled=true
FLAG:nc.procurement_pools.rfq.enabled=true
row_count:2
```

**Result table:**

| key | enabled | Expected | Status |
|-----|---------|----------|--------|
| `nc.procurement_pools.enabled` | `true` | `true` | ✅ PASS |
| `nc.procurement_pools.rfq.enabled` | `true` | `true` | ✅ PASS |

- **row_count:** 2 (both keys present — neither is missing) ✅
- **Verification: PASS** ✅

Both NC primary feature flag rows exist in `public.feature_flags` on the remote Supabase database with `enabled = true`. The migration post-flight guard (`RAISE EXCEPTION` on failure) structurally guarantees this state was established atomically at apply time.

---

## §12 — Files Changed

**Modified:** None  
**Created:** `artifacts/launch-readiness/FAM-08D1A-REMOTE-SUPABASE-MIGRATION-PROCEDURE-AND-APPLY-001.md` (this file)

No source files, migration files, schema files, seed files, test files, governance tracker files, or `.env` files were modified by this unit.

**Git diff before commit (staged):**
```
git diff --name-only --cached
→ artifacts/launch-readiness/FAM-08D1A-REMOTE-SUPABASE-MIGRATION-PROCEDURE-AND-APPLY-001.md
```

---

## §13 — FAM-08D2 Unblock Status

**FAM-08D2:** `FAM-08D2-NC-POOL-FEATURE-FLAG-PROVISIONING-TEST-001`  
**Prerequisite:** FAM-08D1A committed with verification PASS  
**Status:** ✅ **UNBLOCKED**

The prerequisite is now satisfied:
- Migration `20260603000000_nc_pool_primary_flag_seed` applied to remote Supabase ✅
- `nc.procurement_pools.enabled = true` in `public.feature_flags` ✅
- `nc.procurement_pools.rfq.enabled = true` in `public.feature_flags` ✅
- FAM-08D1A artifact committed ✅

FAM-08D2 may now proceed to implement the integration test that verifies `ncPoolFeatureGateMiddleware` and `ncPoolRfqFeatureGateMiddleware` pass correctly with these seeded rows.

---

## §14 — Status Preservation Statement

The following invariants were maintained throughout this unit and remain unchanged at close:

| Invariant | Required state | Confirmed state |
|-----------|---------------|----------------|
| FAM-07 status | `PARTIALLY_IMPLEMENTED` | ✅ Not touched |
| FAM-07 hold | `HOLD_FOR_HUMAN_LEGAL_INPUTS` | ✅ Not touched |
| FTR-LEGAL-003 | `MVP_CRITICAL / OPEN` | ✅ Not touched |
| `governance/legal/fam-07/` | ABSENT | ✅ Absent |
| `PublicSupplierProfile.tsx` | NOT staged, NOT modified | ✅ Not touched |
| `server/prisma/schema.prisma` | NOT modified | ✅ Not modified |
| Existing migrations | NOT modified | ✅ Not modified |
| `LAUNCH-FAMILY-INDEX.md` | NOT modified | ✅ Not touched |
| Governance tracker files | NOT modified | ✅ Not touched |
| No secrets exposed | DATABASE_URL and DIRECT_DATABASE_URL never printed | ✅ Redacted throughout |

---

## §15 — Final Enum

```
FAM_08D1A_REMOTE_SUPABASE_MIGRATION_APPLY_COMPLETE
```

**Summary of outcomes:**
- HEAD before work: `c6a90aa7` ✅
- `c6a90aa7` confirmed in ancestry: True ✅
- Procedure sources inspected: `governance/gap-register.md` (OPS-ENV-001/002), `server/package.json`, `server/scripts/prisma-env-preflight.ts`, `server/scripts/migrate-deploy.ts`, `server/prisma/schema.prisma`, `docs/ops/REMOTE-MIGRATION-APPLY-LOG.md` ✅
- Confirmed approved remote apply procedure: `pnpm -C server run db:migrate:tracked` ✅
- Preflight (prisma:preflight) result: **PASS** — SESSION_POOLER confirmed ✅
- Deploy (migrate:deploy:prod) result: 134 migrations found, no pending = **all applied** ✅
- Remote target: Supabase, `aws-1-ap-northeast-1.pooler.supabase.com:5432` — not localhost ✅
- Both flag rows verified `enabled=true` on remote DB ✅
- FAM-08D2 unblocked: **YES** ✅
- FAM-07 NOT verified complete ✅
- FTR-LEGAL-003 OPEN ✅
- FAM-07L14 NOT opened ✅
- FAM-08 NOT marked complete ✅
- No legal authority record ✅
- No source / test / schema / migration / seed files changed ✅
- No unrelated DB mutation ✅
- No secrets exposed ✅
- `PublicSupplierProfile.tsx` not staged/modified ✅
