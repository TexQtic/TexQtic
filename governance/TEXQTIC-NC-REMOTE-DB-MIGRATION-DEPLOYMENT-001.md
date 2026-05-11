# TEXQTIC-NC-REMOTE-DB-MIGRATION-DEPLOYMENT-001

## §1 Packet Metadata

| Field | Value |
|---|---|
| **Packet ID** | TEXQTIC-NC-REMOTE-DB-MIGRATION-DEPLOYMENT-001 |
| **Type** | REMOTE_DB_MIGRATION_DEPLOYMENT |
| **Status** | BLOCKED |
| **Date** | 2026-05-12 |
| **Basis blocker packet** | TEXQTIC-NC-REMOTE-DB-PRISMA-LEDGER-RECONCILIATION-001 |
| **Authorized by** | Paresh Patel (deployment of 3 pending migrations authorized) |
| **Authority** | governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md |

---

## §2 Starting Repo and Ledger State

### Git state (pre-deployment)

```
git status --short  →  (empty — working tree clean)
git diff --name-only  →  (empty)
```

### Recent commits

```
ee6db6d (HEAD -> main) docs(governance): NC ledger reconciliation audit -- migration deployment blocker
048b56c (origin/main) test(network-commerce): optimize db integration test performance
14e7e99 feat(network-commerce): add supplier quote schema foundation
```

✅ Commit history matches expected.
✅ `active_delivery_unit: TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001` HOLD_FOR_PARESH_DECISION.
✅ `dpp_launch_authorization: HOLD_FOR_PARESH_DECISION`.

### Pre-deploy Prisma migrate status

```
Command: pnpm exec prisma migrate status  (run from server/)

125 migrations found in prisma/migrations

Following migrations have not yet been applied:
  20260530000000_nc_pool_supplier_invite_feature_flag_seed
  20260531000000_nc_pool_supplier_quote_schema
  20260532000000_nc_pool_supplier_quote_feature_flag_seed
```

✅ Exactly the 3 expected pending migrations confirmed.

---

## §3 Deployment Command and Result

### Command

```
cd c:\Users\PARESH\TexQtic\server
pnpm exec prisma migrate deploy
```

### Output (key lines)

```
Applying migration `20260530000000_nc_pool_supplier_invite_feature_flag_seed`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from.
Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260530000000_nc_pool_supplier_invite_feature_flag_seed

Database error code: P0001

Database error:
ERROR: NC-SUPPLIER-INVITE-FEATURE-FLAG-SEED POST-FLIGHT: flag is enabled=true — must be false by default.

DbError { severity: "ERROR", code: SqlState(EP0001), message: "NC-SUPPLIER-INVITE-FEATURE-FLAG-SEED
POST-FLIGHT: flag is enabled=true — must be false by default.", ... routine: Some("exec_stmt_raise") }
```

### Exit code

```
1 (FAILED)
```

---

## §4 Failure Analysis

### What happened

The migration SQL (`20260530000000_nc_pool_supplier_invite_feature_flag_seed`) contains a post-flight
assertion block that verifies the inserted feature flag has `enabled=false`. The migration ran the
following sequence:

1. **Pre-flight check** — verified `public.feature_flags` table exists ✅
2. **INSERT ... ON CONFLICT (key) DO NOTHING** — the row `nc.procurement_pools.supplier_invites.enabled`
   **already existed** in the remote DB, so this INSERT was a no-op (row untouched, stays `enabled=true`)
3. **Post-flight check** — queried the row, found `enabled=true`, raised:
   `NC-SUPPLIER-INVITE-FEATURE-FLAG-SEED POST-FLIGHT: flag is enabled=true — must be false by default.`

The RAISE EXCEPTION aborted the transaction. Prisma recorded the migration as **failed** in `_prisma_migrations`.

### Root cause

`nc.procurement_pools.supplier_invites.enabled` **pre-exists in the remote `feature_flags` table with
`enabled=true`**. This row was not created by this migration. It was inserted prior to this migration
being deployed — likely by a manual SQL operation or a test-context `withBypassForSeed` call that
inadvertently leaked to the production schema (though this is less likely due to RLS).

### Post-failure Prisma ledger state

```
Command: pnpm exec prisma migrate status  (run from server/, after failure)

125 migrations found in prisma/migrations

Following migrations have not yet been applied:
  20260531000000_nc_pool_supplier_quote_schema
  20260532000000_nc_pool_supplier_quote_feature_flag_seed

(Exit code: 1)
```

Note: `20260530000000_nc_pool_supplier_invite_feature_flag_seed` is no longer in the "not yet applied"
list — it now has a record in `_prisma_migrations` (as a failed migration). Prisma blocks deployment
of `20260531000000` and `20260532000000` until the failed migration is resolved.

---

## §5 BLOCKED — Required User Decision

```
🛑 DATABASE EXECUTION BLOCKER

Task: TEXQTIC-NC-REMOTE-DB-MIGRATION-DEPLOYMENT-001
Blocker Type: Prisma Migration — Failed Migration Due to Pre-Existing Feature Flag Row

Evidence:
- Command: pnpm exec prisma migrate deploy
- Error: P3018 — Migration 20260530000000_nc_pool_supplier_invite_feature_flag_seed failed
- Database error: NC-SUPPLIER-INVITE-FEATURE-FLAG-SEED POST-FLIGHT: flag is enabled=true
- Root cause: nc.procurement_pools.supplier_invites.enabled EXISTS in remote DB with enabled=true
  The INSERT ... ON CONFLICT DO NOTHING was a no-op; post-flight assertion failed.
- Current ledger: 20260530000000 is FAILED in _prisma_migrations.
  20260531000000 and 20260532000000 remain blocked/pending.

Stop Condition: #3 — prisma migrate deploy failed.

Required User Action — Choose exactly one:

Option A: RESOLVE AS APPLIED (recommended if flag is intentionally enabled)
  Authorization required: "approve prisma migrate resolve --applied 20260530000000..."
  Action: pnpm exec prisma migrate resolve --applied 20260530000000_nc_pool_supplier_invite_feature_flag_seed
  Effect: marks migration as applied; flag stays enabled=true; deployment continues to 20260531000000+
  Risk: flag remains enabled=true globally; per the migration design this is non-standard
    (the flag is supposed to be globally false, with per-tenant override to activate)

Option B: RESET FLAG + RETRY (if flag should be globally false)
  Authorization required: explicit psql command approval from Paresh
  Action: psql $DATABASE_URL -c "UPDATE public.feature_flags SET enabled=false, updated_at=NOW()
    WHERE key='nc.procurement_pools.supplier_invites.enabled';"
  Then: pnpm exec prisma migrate resolve --rolled-back 20260530000000_nc_pool_supplier_invite_feature_flag_seed
  Then: pnpm exec prisma migrate deploy (retry from scratch)
  Effect: flag set to false globally; migration runs cleanly; all 3 migrations deploy in order
  Risk: if any tenant currently depends on the globally-enabled flag, they lose access

Option C: INVESTIGATE FIRST (recommended before choosing A or B)
  Run: psql $DATABASE_URL -c "SELECT key, enabled, created_at, updated_at FROM public.feature_flags
    WHERE key LIKE 'nc.procurement_pools.supplier_invites%';"
  Understand when/how the row was inserted and whether enabled=true is intentional
  Then decide between Option A and Option B

No further actions taken.
```

---

## §6 Remote Schema Verification

Not completed — blocked before deployment. Verification will be performed once the Prisma migration
failure is resolved and migrations are redeployed.

---

## §7 Feature Flag Verification

Not completed — blocked before deployment. Verification will be performed once deployment completes.

---

## §8 Validation Results

Not run — blocked before deployment. All validations (prisma validate, generate, tsc, SRI, ORI, PRQ)
will be run after successful deployment.

---

## §9 Files Changed

- `governance/TEXQTIC-NC-REMOTE-DB-MIGRATION-DEPLOYMENT-001.md` (this file — CREATE)
- `governance/control/BLOCKED.md` (UPDATE — migration deployment failure recorded)
- `governance/control/GOVERNANCE-CHANGELOG.md` (UPDATE — blocker entry)
- `governance/control/NEXT-ACTION.md` (UPDATE — blocker state updated)
- `governance/control/OPEN-SET.md` (UPDATE — blocker state updated)

---

## §10 Files Not Changed

| Category | Status |
|---|---|
| `server/prisma/schema.prisma` | UNCHANGED |
| `server/prisma/migrations/` | UNCHANGED |
| Backend services | UNCHANGED |
| Backend routes | UNCHANGED |
| Middleware | UNCHANGED |
| Frontend | UNCHANGED |
| Tests | UNCHANGED |
| `package.json` (any) | UNCHANGED |

---

## §11 Blocker Resolution

`TEXQTIC-NC-REMOTE-DB-PRISMA-LEDGER-RECONCILIATION-001` blocker is NOT resolved.
A new, more specific blocker now applies: see §5 above.

`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001` (Packet 12) remains `HOLD_FOR_PARESH_DECISION`.
Packet 12 cannot be authorized until migrations are successfully deployed.

---

## §12 DPP Hold Confirmation

| Key | Value |
|---|---|
| `dpp_launch_authorization` | `HOLD_FOR_PARESH_DECISION` — UNCHANGED |
| `dpp_passport_network_readiness` | `PRODUCTION_READY` — UNCHANGED |
| `dpp_readiness_commit` | `17c252c` — UNCHANGED |
| `dpp_v3_design_status` | `OPTIONAL_POLISH` — UNCHANGED |

---

## §13 Final Status

```
TEXQTIC_NC_REMOTE_DB_MIGRATION_DEPLOYMENT_001_BLOCKED

Reason:
  Migration 20260530000000_nc_pool_supplier_invite_feature_flag_seed FAILED.
  Pre-existing feature flag row nc.procurement_pools.supplier_invites.enabled has enabled=true.
  INSERT ... ON CONFLICT DO NOTHING was a no-op; post-flight assertion raised exception.
  Prisma ledger has 20260530000000 recorded as FAILED.
  Migrations 20260531000000 and 20260532000000 remain blocked.

Resolution requires explicit Paresh authorization — see §5.
```
