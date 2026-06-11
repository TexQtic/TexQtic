# FTR-OPS-003 — TexQtic Production Rollback Runbook

**Unit:** `FTR-OPS-003-ROLLBACK-RUNBOOK-DOCS-01`  
**FTR ID:** FTR-OPS-003  
**Status:** COMPLETE  
**Date:** 2026-06-11  
**Branch:** `main` — HEAD `0fc03f1b`  
**Author:** Copilot (docs-only unit)  
**Allowlist:** `governance/launch-readiness/PRODUCTION-ROLLBACK-RUNBOOK.md` (new)  
**Final enum:** `FTR_OPS_003_ROLLBACK_RUNBOOK_DOCS_COMPLETE`

---

## §1 Purpose

This runbook provides step-by-step procedures for rolling back TexQtic production deployments.
It covers four rollback scenarios:

1. **Vercel deploy rollback** — revert to a prior frontend/API deployment
2. **Supabase / Prisma DB schema rollback** — revert schema migrations
3. **Feature flag rollback** — disable features without code deployment
4. **Emergency production rollback checklist** — combined triage checklist

This document is **docs-only**. It does not authorize any production action by itself.
All production actions require Paresh explicit authorization.

---

## §2 Stack Reference

| Layer | Technology | Control Surface |
|---|---|---|
| Frontend + API (Edge) | Vercel (`app.texqtic.com`) | Vercel dashboard + Vercel CLI |
| Database | Supabase-hosted PostgreSQL | Supabase dashboard + `psql` |
| Schema migrations | Prisma (`server/prisma/migrations/`) | `pnpm -C server exec prisma migrate` |
| Feature flags | `feature_flags` table in Supabase DB | Supabase SQL editor or control-plane admin UI |
| Email | Postmark (SMTP via Vercel env vars) | Postmark dashboard |
| Error monitoring | Sentry (`texqtic-backend`, `texqtic-frontend`) | Sentry dashboard |
| Secrets / env | Vercel Environment Variables | Vercel dashboard (never print) |

---

## §3 Vercel Deploy Rollback

### When to use
A production deployment caused a regression, crash, or unexpected behavior. The prior deployment was confirmed working.

### Rollback procedure

**Option A — Vercel Dashboard (preferred, fastest)**

1. Go to **Vercel dashboard → TexQtic project → Deployments tab**.
2. Identify the last known-good deployment (check timestamps against the regression window).
3. Click the known-good deployment row → **⋯ (Actions) → Promote to Production**.
4. Confirm the promotion. Vercel re-points `app.texqtic.com` to the selected deployment within ~30 seconds.
5. Verify: `GET https://app.texqtic.com/api/health` → `{"status":"ok"}`.
6. Smoke-test one public route: `GET https://app.texqtic.com/api/public/b2b/suppliers`.
7. Record in governance log: deployment hash promoted, time, reason.

**Option B — Vercel CLI**

```sh
vercel ls           # list deployments for the project
vercel promote <DEPLOYMENT_URL>   # promote a specific deployment URL to production
```

### Vercel rollback constraints
- **No DB rollback is included.** If the bad deployment ran a schema migration, stop here and follow §4 first.
- Vercel promotes a prior immutable build; no source code is changed.
- The Vercel deployment hash is in the deployment URL (e.g. `texqtic-cl53i4zpj-tex-qtic.vercel.app`).
- **Do not revert env var changes** during rollback unless you are certain the env var was the root cause — env vars affect all deployments including the promoted one.

### Pre-rollback checks
- [ ] Confirm `GET /api/health` returns non-200 or `GET /api/public/b2b/suppliers` returns an error
- [ ] Confirm root cause is not a DB schema issue (if it is, do §4 first)
- [ ] Identify the last known-good deployment hash from Vercel dashboard
- [ ] Record the bad deployment hash before promoting away from it

---

## §4 Supabase / Prisma DB Schema Rollback

> **CRITICAL SAFETY RULE:** Prisma does not provide automatic schema rollback. Once a migration is applied to Supabase production, it cannot be auto-reversed. This procedure documents the manual steps. **No schema rollback action may be taken without explicit Paresh written authorization.**

### When to use
A Prisma migration was applied to production and caused a data integrity issue, runtime error, or an unintended schema change.

### Rollback decision tree

```
Is the migration breaking (data loss / type mismatch / broken index)?
├── YES → Is data intact (no records deleted)?
│   ├── YES → Can we apply a compensating migration? → §4A (prefer)
│   └── NO  → Point-in-time restore may be required → §4B (last resort)
└── NO (schema change is benign but migration itself failed mid-way)
    └── Prisma migrate resolve → §4C
```

### §4A Compensating Migration (preferred)

A compensating migration reverses or neutralizes the bad migration without touching existing data.

1. **Do not deploy any new code** until the schema issue is stabilized.
2. Write a new migration SQL file that reverses the structural change:
   - If a column was added: `ALTER TABLE ... DROP COLUMN IF EXISTS ...;`
   - If a table was added: `DROP TABLE IF EXISTS ...;`
   - If a column type was changed: `ALTER TABLE ... ALTER COLUMN ... TYPE <old_type> USING <cast>;`
   - If an index was added: `DROP INDEX IF EXISTS ...;`
3. Apply via Supabase SQL editor or `psql`:
   ```sh
   psql "$DATABASE_URL" -f path/to/compensating.sql
   ```
4. Run `pnpm -C server exec prisma db pull` to re-sync schema.prisma with the actual DB state.
5. Run `pnpm -C server exec prisma generate` to regenerate the Prisma client.
6. Deploy a new Vercel build from the corrected branch.
7. Verify: run the health check and affected API endpoints.
8. Record in FUTURE-TODO-REGISTER.md and governance log: migration reverted, compensating SQL applied, timestamp, commit.

### §4B Point-in-Time Restore (last resort — data loss scenario)

> Only if a migration deleted or corrupted data and compensating migration is not sufficient.

1. **Stop all production writes** — set Vercel to maintenance mode or promote a blank/maintenance deployment.
2. In Supabase dashboard → **Database → Backups** → **Point-in-Time Recovery**.
3. Select the timestamp just before the bad migration was applied.
4. Confirm the restore target (a new Supabase project branch may be created; confirm with Paresh).
5. Update `DATABASE_URL` and `DIRECT_DATABASE_URL` env vars in Vercel to point to the restored instance.
6. Re-run all pending Prisma migrations up to (but not including) the bad one:
   ```sh
   pnpm -C server exec prisma migrate deploy
   ```
7. Verify data integrity against known good state.
8. Record all actions with timestamps in governance log.

### §4C Failed Migration (Prisma resolve)

If `prisma migrate deploy` failed mid-way (migration partially applied):

```sh
# Mark the failed migration as "rolled back" so Prisma will retry it
pnpm -C server exec prisma migrate resolve --rolled-back <migration_name>

# Or mark it as applied if you're intentionally skipping it
pnpm -C server exec prisma migrate resolve --applied <migration_name>
```

Then fix the migration SQL and re-deploy.

### Key constraints
- **Never run `prisma db push` or `prisma migrate dev` against production.** These are blocked in `server/package.json`.
- **`SHADOW_DATABASE_URL` is forbidden in TexQtic.** Do not introduce it.
- All DB rollback actions must be recorded in a governance log entry.

---

## §5 Feature Flag Rollback

Feature flags in TexQtic are stored in the `feature_flags` table in Supabase. They can be toggled without a code deployment.

### Known production feature flags

| Flag Key | Default | Current State | Controls |
|---|---|---|---|
| `ttp_enabled` | `false` | `false` (global off) | TexQtic Trust Pay — all TTP endpoints gated |
| `supplier_quotes` | `false` | `false` (QD-6 hold) | Supplier quotes module (FAM-14) |
| `OP_PLATFORM_READ_ONLY` | seeded | — | Platform read-only mode |
| `OP_AI_AUTOMATION_ENABLED` | seeded | — | AI automation features |

> **Note:** Per-tenant overrides exist in `TenantFeatureOverride`. Flag disable at global level overrides all tenant overrides.

### Rollback procedure (disable a flag)

**Via control-plane admin UI (preferred for SUPER_ADMIN operators):**
1. Log in to `app.texqtic.com` as SUPER_ADMIN.
2. Navigate to **Control Plane → Feature Flags**.
3. Locate the flag and toggle to `false`.
4. Confirm the change is reflected (reload the page to verify).

**Via Supabase SQL editor (emergency, Paresh direct):**
```sql
-- Disable a flag globally (authorized emergency only)
UPDATE public.feature_flags
SET enabled = false
WHERE key = '<flag_key>';

-- Verify
SELECT key, enabled FROM public.feature_flags WHERE key = '<flag_key>';
```

### Feature flag rollback constraints
- **Do not enable flags** via rollback procedure — only disable.
- **`ttp_enabled` must remain `false`** until TTP legal hold (D-002) is cleared and Paresh explicitly authorizes.
- **`supplier_quotes` must remain `false`** until QD-6 decision is made by Paresh.
- Per-tenant overrides are in `TenantFeatureOverride` table — disabling the global flag does not delete per-tenant overrides, but it does override them (global false wins over tenant-level true in the gate middleware).
- Any flag change in production must be recorded in the governance log.

---

## §6 Emergency Production Rollback Checklist

Use this checklist when something breaks in production and the cause is unknown.

### Step 1 — Triage (< 5 minutes)

- [ ] Check `GET https://app.texqtic.com/api/health` — is it 200?
- [ ] Check Sentry dashboard (`texqtic-backend` + `texqtic-frontend`) — are there new error events?
- [ ] Check Vercel deployment logs — did a new deployment go out?
- [ ] Check Supabase status page (status.supabase.com) — is there an outage?
- [ ] Check Postmark delivery status — are emails failing?
- [ ] Identify the last known-good state (last HEAD commit that was confirmed working)

### Step 2 — Isolate the root cause

| Symptom | Likely cause | Action |
|---|---|---|
| `GET /api/health` returns 500 | Server startup error | Check Vercel function logs; likely a code bug or missing env var |
| `GET /api/health` returns 200 but specific route fails | Code regression in that route | Identify failing route; consider Vercel rollback |
| Frontend blank/crash | Frontend bundle error | Check browser console; Sentry frontend events; consider Vercel rollback |
| DB query errors / `P2xxx` Prisma errors | Schema mismatch or DB connectivity | Check `DATABASE_URL` is set; check Supabase status; check migration state |
| Auth/session failures | Supabase auth config or JWT secret issue | Check Supabase auth settings; verify `SUPABASE_JWT_SECRET` in Vercel env |
| Emails not delivering | Postmark issue or SMTP env var missing | Check Postmark dashboard; verify SMTP env vars in Vercel |

### Step 3 — Execute rollback

- **If root cause is a bad code deployment:** → §3 (Vercel deploy rollback)
- **If root cause is a bad DB migration:** → §4 (DB schema rollback)
- **If root cause is a feature that should be disabled:** → §5 (Feature flag rollback)
- **If root cause is an env var change:** Revert env var in Vercel dashboard; trigger a redeploy.

### Step 4 — Post-rollback verification

- [ ] `GET /api/health` → `{"status":"ok"}`
- [ ] `GET /api/public/b2b/suppliers` → 200 with supplier list
- [ ] `GET /api/public/supplier/shraddha-industries` → 200 (if Shraddha is active)
- [ ] Login as SUPER_ADMIN → control plane accessible
- [ ] Sentry — no new error events from the restored state
- [ ] Record rollback action in governance log with: timestamp, HEAD commit reverted to, root cause identified, resolution steps taken

### Step 5 — Root cause analysis (within 24 hours)

- Document what went wrong in a governance unit or incident note.
- If a migration was involved: audit migration SQL before re-applying.
- If a code bug: identify the failing unit test / type check that should have caught it.
- Update this runbook if a gap in procedure was identified.

---

## §7 Governance Log Format

When a rollback action is taken, record it in the relevant tracker file (or in a new governance unit if the incident is significant):

```
ROLLBACK INCIDENT — [date]
Root cause: [description]
Trigger: [what was deployed / changed]
Action taken: [Vercel rollback to hash X / compensating migration applied / flag Y disabled]
Verified by: [health check + smoke test results]
Authorized by: Paresh (explicit written authorization)
Follow-up: [link to root cause analysis unit if needed]
```

---

## §8 FTR-OPS-003 Closure Evidence

| Check | Status |
|---|---|
| Vercel rollback procedure documented | ✅ §3 |
| Supabase/Prisma DB rollback documented | ✅ §4 (compensating migration, PITR, migrate resolve) |
| Feature flag rollback documented | ✅ §5 |
| Emergency checklist produced | ✅ §6 |
| Stack reference accurate | ✅ §2 (Vercel, Supabase, Prisma, Postmark, Sentry) |
| No implementation authorized | ✅ docs-only unit |
| No source code changes | ✅ confirmed |
| No schema changes | ✅ confirmed |
| No secrets printed | ✅ confirmed |

**FTR-OPS-003 status: COMPLETE**  
**Final enum:** `FTR_OPS_003_ROLLBACK_RUNBOOK_DOCS_COMPLETE`
