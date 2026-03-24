# TexQtic — Prisma Migration Operations Guide

**Owner:** Platform Engineering  
**Version:** OPS-ENV-001 (2026-03-01)  
**One True Var:** `DIRECT_DATABASE_URL`

---

## Overview

## Policy Status

Current forward migration policy is governed by
`GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001`.

The default lawful path for repo-tracked Prisma migrations is the repo-managed Prisma deploy path.
Direct SQL remains lawful only as a separately authorized exception path with explicit ledger
posture and mandatory remote validation.

Historical docs or trackers may still preserve older `psql` plus `prisma migrate resolve --applied`
practice. Those references remain truthful as history only and are not the current default policy.

TexQtic uses Prisma's two-URL pattern:

| Variable | Used by | Pooler OK? | Notes |
|---|---|---|---|
| `DATABASE_URL` | Prisma Client runtime | ✅ (tx or session) | `texqtic_app` role, RLS enforced |
| `DIRECT_DATABASE_URL` | `prisma migrate deploy` + `prisma db pull` + DDL | ⚠️ session pooler only | `postgres` owner role, can bypass RLS for DDL |

`schema.prisma`:
```prisma
datasource db {
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

---

## Why This Matters — Pooler Endpoint Types

Supabase provides three connection endpoints:

| Type | Host pattern | Port | DDL safe? |
|---|---|---|---|
| **Direct** (preferred) | `db.<ref>.supabase.co` | `5432` | ✅ |
| **Session pooler** | `aws-1-<region>.pooler.supabase.com` | `5432` | ✅ (PgBouncer session mode) |
| **Transaction pooler** | `aws-0-<region>.pooler.supabase.com` | `6543` | ❌ **NEVER for migrations** |

`DIRECT_DATABASE_URL` must point to **direct** or **session pooler** only.  
The transaction pooler will cause `prisma migrate deploy` to fail silently or error.

---

## How to Set DIRECT_DATABASE_URL (PowerShell)

PowerShell does **not** auto-source `.env` files. You must load it manually or use the wrapper script.

### Option A — Use the wrapper script (recommended)
```powershell
pnpm -C server migrate:deploy:prod
```
This script loads `server/.env` automatically, validates the endpoint, and runs `prisma migrate deploy`.

### Option B — Manual shell load
```powershell
# Load from server/.env (no secret exposed in history — assign without echoing)
$line = (Get-Content "server/.env" | Where-Object { $_ -like 'DIRECT_DATABASE_URL=*' } | Select-Object -First 1)
$env:DIRECT_DATABASE_URL = $line.Substring('DIRECT_DATABASE_URL='.Length).Trim().Trim('"').Trim("'")
# Verify (redacted)
$p = [System.Uri]::new($env:DIRECT_DATABASE_URL)
"SET: host=$($p.Host) port=$($p.Port) db=$($p.AbsolutePath.TrimStart('/'))"
# Then deploy
pnpm -C server exec prisma migrate deploy
```

---

## Canonical Execution Classes

### Repo-managed Prisma migrations (default)

Use this path when the change is represented by repo-tracked migration artifacts under
`server/prisma/migrations/`.

Canonical shorthand entry points:

- `pnpm run db:migrate:tracked`
- `pnpm run db:migrate`
- `pnpm -C server run db:migrate:tracked`
- `pnpm -C server run db:migrate`

Canonical underlying sequence:

1. `pnpm -C server prisma:preflight`
2. `pnpm -C server migrate:deploy:prod`

Equivalent lower-level invocation remains lawful only when env-loading posture is already fixed:

- `pnpm -C server exec prisma migrate deploy`

### Direct SQL exception path (exception-only)

Use this path only for separately authorized direct SQL exception work such as ops SQL, RLS,
grant, backfill, or corrective SQL that is intentionally outside the repo-managed Prisma deploy
path.

This path is never the default for repo-tracked migrations.

If direct SQL is used, the plan must explicitly fix:

- why the work is not using the repo-managed Prisma deploy path
- whether ledger impact is `none` or requires explicit reconciliation
- exact remote validation proof expected after apply
- exact post-apply validation sequence

Explicit exception-labelled shorthand surface:

- `pnpm -C server run db:rls:exception`

Raw `psql` remains a lower-level equivalent only for separately authorized direct SQL exception
work and is not current default migration guidance.

## Standard Repo-Managed Prisma Workflow

### 1. Run preflight (validate env before any deploy)
```powershell
pnpm -C server prisma:preflight
```
Expected output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Prisma Migration Env Preflight (OPS-ENV-001)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Var used    : DIRECT_DATABASE_URL
  Scheme      : postgresql
  Host        : db.<ref>.supabase.co   (or aws-1-*.pooler…)
  Port        : 5432
  Database    : postgres
  Endpoint    : DIRECT

  PREFLIGHT PASS
```

### 2. Run migration deploy
```powershell
pnpm -C server migrate:deploy:prod
```

### 3. Post-deploy verification (SQL)
Run these read-only queries after applying any migration:
```sql
-- Confirm pending = 0
SELECT id, migration_name, finished_at FROM public."_prisma_migrations"
WHERE finished_at IS NULL;

-- Confirm G-024 sanctions objects (example)
SELECT to_regclass('public.sanctions');
SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'sanctions';
SELECT proname FROM pg_proc WHERE proname IN ('is_org_sanctioned', 'is_entity_sanctioned');
```

---

## Direct SQL Exception Validation Expectations

When a direct SQL exception path is separately authorized, forward guidance requires all of the
following after apply:

1. apply proof showing no `ERROR` and no `ROLLBACK`
2. remote object or policy proof showing the intended state exists
3. explicit ledger proof showing either no ledger change was intended or the separately authorized
  reconciliation result
4. Prisma alignment proof when Prisma surfaces are affected
5. focused runtime or test proof only when the governing unit requires it

## Legacy: MIGRATION_DATABASE_URL

Prior to OPS-ENV-001 (2026-03-01), the repo used `MIGRATION_DATABASE_URL` in `schema.prisma directUrl`.  
This was renamed to `DIRECT_DATABASE_URL` to:
- Match Prisma community convention
- Match `schema.prisma directUrl` semantics
- Eliminate naming mismatch with TECS prompts

**Action required if you have `MIGRATION_DATABASE_URL` in your `server/.env`:**
```
MIGRATION_DATABASE_URL=postgresql://...
→ rename to →
DIRECT_DATABASE_URL=postgresql://...
```
The preflight script and migrate-deploy wrapper accept `MIGRATION_DATABASE_URL` as a backward-compat alias with a deprecation warning, but you should rename immediately.

---

## Preflight Script Reference

`server/scripts/prisma-env-preflight.ts`

```
Exit 0  → DIRECT or SESSION_POOLER endpoint → safe to run migrations
Exit 1  → missing var, TX_POOLER, or invalid URL → DO NOT run migrations
```

Endpoint classification logic:
- `TX_POOLER`: host contains `aws-0-*.pooler.supabase.com` OR port `6543`
- `SESSION_POOLER`: host contains `aws-1-*.pooler.supabase.com` port `5432`
- `DIRECT`: host matches `db.*.supabase.co` port `5432`
- `UNKNOWN`: non-Supabase host (passes with caveat)

---

## Never Do This

```powershell
# ❌ FORBIDDEN — echoes secret URL
echo $env:DIRECT_DATABASE_URL

# ❌ FORBIDDEN — commits env secrets
git add server/.env

# ❌ FORBIDDEN — wrong URL type for migrations
# Setting DIRECT_DATABASE_URL to the aws-0-* transaction pooler

# ❌ FORBIDDEN — run dev migrate on production
pnpm -C server exec prisma migrate dev

# ❌ FORBIDDEN — use deprecated default-looking shortcuts that are now explicitly blocked
pnpm -C server run db:push
pnpm -C server run db:rls
```
