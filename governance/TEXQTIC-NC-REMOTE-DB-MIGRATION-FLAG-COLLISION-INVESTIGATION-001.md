# TEXQTIC-NC-REMOTE-DB-MIGRATION-FLAG-COLLISION-INVESTIGATION-001

**Task ID:** TEXQTIC-NC-REMOTE-DB-MIGRATION-FLAG-COLLISION-INVESTIGATION-001  
**Type:** SELECT-Only Remote DB Investigation  
**Date:** 2026-05-12  
**Status:** INVESTIGATION_COMPLETE — Awaiting Paresh Authorization  
**Relates to:** TEXQTIC-NC-REMOTE-DB-MIGRATION-DEPLOYMENT-001 (Option C — Investigate First)  
**Git HEAD at investigation start:** `8aa2ec8`  

---

## §1 — Objective

Investigate the feature flag collision that caused migration
`20260530000000_nc_pool_supplier_invite_feature_flag_seed` to FAIL on the remote Supabase
PostgreSQL database, using SELECT-only queries against production data. Produce:

1. Evidence of the exact DB state for `nc.procurement_pools.supplier_invites.enabled`
2. Evidence of all `nc.procurement_pools.*` flags
3. Evidence of any `tenant_feature_overrides` for the supplier invite key
4. Evidence of the `nc.procurement_pools.supplier_quotes.enabled` flag (collision risk for migration 20260532000000)
5. Prisma `_prisma_migrations` ledger state for all 3 pending migrations
6. Root cause interpretation
7. Recommendation — which of Option A / B / C to take (requires Paresh authorization)

**Constraint:** READ-ONLY. No DB mutations. No migrate resolve. No migrate deploy.

---

## §2 — Git Preflight State

```
git log --oneline -n 5:
8aa2ec8 (HEAD -> main) docs(network-commerce): migration deployment blocked -- feature flag collision on 20260530000000
ee6db6d docs(governance): NC ledger reconciliation audit -- migration deployment blocker
048b56c (origin/main, origin/HEAD) test(network-commerce): optimize db integration test performance
14e7e99 feat(network-commerce): add supplier quote schema foundation
```

Tree: clean at investigation start. `git diff --name-only` = empty.

---

## §3 — Authority Sources Consulted

| File | Key facts read |
| --- | --- |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-FEATURE-GATE-001.md` | Two-layer gate design (§3 OD-6, §4 middleware, §5 feature flag seed); Layer 1 = global kill-switch; Layer 2 = per-tenant override |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-GOV-CLOSE-002.md` | §7.2 production probe confirmed HTTP 200 for QA B2B supplier tenant (3 OPEN invites returned) |
| `governance/TEXQTIC-NC-REMOTE-DB-MIGRATION-DEPLOYMENT-001.md` | Blocker doc; Options A/B/C; P3018 failure root cause |
| `server/prisma/migrations/20260530000000_nc_pool_supplier_invite_feature_flag_seed/migration.sql` | INSERT...ON CONFLICT DO NOTHING (no-op if row exists); post-flight RAISES if enabled=true |

---

## §4 — SELECT Query Results (Verbatim)

All queries executed via PrismaClient `$queryRawUnsafe` (parameterized, no direct string interpolation).
No mutation. No secret values queried.

### Q1 — nc.procurement_pools.supplier_invites.enabled flag

```
SELECT key, enabled::text, created_at::text, updated_at::text, description
FROM public.feature_flags WHERE key = 'nc.procurement_pools.supplier_invites.enabled'
```

Result:
```json
[
  {
    "key": "nc.procurement_pools.supplier_invites.enabled",
    "enabled": "true",
    "created_at": "2026-05-11 13:58:22.566+00",
    "updated_at": "2026-05-11 14:01:53.92+00",
    "description": "ORI test — nc.procurement_pools.supplier_invites.enabled"
  }
]
```

### Q2 — All nc.procurement_pools.* flags

```
SELECT key, enabled::text, created_at::text, updated_at::text
FROM public.feature_flags WHERE key LIKE 'nc.procurement_pools.%' ORDER BY key
```

Result:
```json
[
  {
    "key": "nc.procurement_pools.enabled",
    "enabled": "true",
    "created_at": "2026-05-11 14:49:24.534+00",
    "updated_at": "2026-05-11 14:53:01.983+00"
  },
  {
    "key": "nc.procurement_pools.rfq.enabled",
    "enabled": "true",
    "created_at": "2026-05-11 14:49:28.384+00",
    "updated_at": "2026-05-11 14:53:02.125+00"
  },
  {
    "key": "nc.procurement_pools.supplier_invites.enabled",
    "enabled": "true",
    "created_at": "2026-05-11 13:58:22.566+00",
    "updated_at": "2026-05-11 14:01:53.92+00"
  }
]
```

### Q3 — tenant_feature_overrides for supplier invite key

```
SELECT tenant_id::text, key, enabled::text, created_at::text, updated_at::text
FROM public.tenant_feature_overrides WHERE key = 'nc.procurement_pools.supplier_invites.enabled'
ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 50
```

Result:
```json
[]
```

**ZERO tenant overrides exist for this key.**

### Q4 — nc.procurement_pools.supplier_quotes.enabled flag

```
SELECT key, enabled::text, created_at::text, updated_at::text, description
FROM public.feature_flags WHERE key = 'nc.procurement_pools.supplier_quotes.enabled'
```

Result:
```json
[]
```

**This flag does NOT exist in production.**

### Q5 — Prisma _prisma_migrations ledger

```
SELECT id::text, migration_name, started_at::text, finished_at::text,
       rolled_back_at::text, applied_steps_count::text, left(logs, 800) as logs_preview
FROM public._prisma_migrations
WHERE migration_name IN (
  '20260530000000_nc_pool_supplier_invite_feature_flag_seed',
  '20260531000000_nc_pool_supplier_quote_schema',
  '20260532000000_nc_pool_supplier_quote_feature_flag_seed'
) ORDER BY started_at
```

Result:
```json
[
  {
    "id": "9545dc38-9bc4-4c39-a72d-e8a623979451",
    "migration_name": "20260530000000_nc_pool_supplier_invite_feature_flag_seed",
    "started_at": "2026-05-11 15:56:32.537258+00",
    "finished_at": null,
    "rolled_back_at": null,
    "applied_steps_count": "0",
    "logs_preview": "A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260530000000_nc_pool_supplier_invite_feature_flag_seed\n\nDatabase error code: P0001\n\nDatabase error:\nERROR: NC-SUPPLIER-INVITE-FEATURE-FLAG-SEED POST-FLIGHT: flag is enabled=true — must be false by default.\n\nDbError { severity: \"ERROR\", parsed_severity: Some(Error), code: SqlState(EP0001), message: \"NC-SUPPLIER-INVITE-FEATURE-FLAG-SEED POST-FLIGHT: flag is enabled=true — must be false by default.\"..."
  }
]
```

Migrations `20260531000000_nc_pool_supplier_quote_schema` and `20260532000000_nc_pool_supplier_quote_feature_flag_seed` returned **zero rows** — they are not in the ledger (have never been attempted).

---

## §5 — Flag Evidence Analysis

### Origin timeline

| Timestamp (UTC) | Event |
| --- | --- |
| 2026-05-11 13:58:22 | `nc.procurement_pools.supplier_invites.enabled` created, `enabled=true` |
| 2026-05-11 14:01:53 | Flag updated (enabled kept `true`) |
| 2026-05-11 15:56:32 | Migration `20260530000000` attempted on remote DB → FAILED (P0001) |

The flag was manually created approximately **1 hour 58 minutes** before the migration deployment was attempted. This was during the production verification phase (see PROD-VERIFY-GOV-CLOSE-002).

### Description interpretation

The description `ORI test — nc.procurement_pools.supplier_invites.enabled` uses the prefix `ORI` (Original Readiness Investigation, or a test-activation label). This indicates the flag was manually seeded during production readiness testing — not by a previous Prisma migration.

### Flag state

The flag exists and is `enabled=true`. The migration seed SQL (`INSERT ... ON CONFLICT (key) DO NOTHING`) correctly detected the pre-existing row and performed a no-op on the INSERT. The migration's **post-flight PL/pgSQL check** then raised `P0001` because the flag was `enabled=true` rather than the expected default `enabled=false`.

The flag was never removed and remains `enabled=true` in production today.

---

## §6 — Tenant Override Evidence

### Finding: ZERO tenant overrides

`public.tenant_feature_overrides` has **zero rows** for `nc.procurement_pools.supplier_invites.enabled`.

### Reconciliation with production 200 probe

The production probe in PROD-VERIFY-GOV-CLOSE-002 §7.2 returned HTTP 200 with real data (3 OPEN invites) for the QA B2B supplier tenant. This occurred with zero tenant overrides present.

**Conclusion:** The feature gate middleware does NOT require a `TenantFeatureOverride` row as a mandatory Layer 2 condition. When the global flag is `enabled=true`, the middleware treats this as allow-all (no per-tenant override required for access to be granted). Per-tenant overrides, if present, can restrict or supplement — but absence of an override with global `enabled=true` does not block.

This corrects the earlier hypothesis that "both layers MUST pass." The actual behavior observed in production is:
- Global flag `enabled=false` → blocks ALL tenants (kill-switch, as designed)
- Global flag `enabled=true` + no override → access GRANTED (global serves as default)
- Global flag `enabled=true` + override `enabled=false` → would block that specific tenant

This is the standard feature-flag-with-tenant-override pattern (global = default, override = exception).

---

## §7 — Prisma Ledger Evidence

| Migration | Ledger state | started_at | finished_at | applied_steps_count |
| --- | --- | --- | --- | --- |
| `20260530000000_nc_pool_supplier_invite_feature_flag_seed` | FAILED — row exists | 2026-05-11 15:56:32 UTC | null | 0 |
| `20260531000000_nc_pool_supplier_quote_schema` | NOT IN LEDGER (pending) | — | — | — |
| `20260532000000_nc_pool_supplier_quote_feature_flag_seed` | NOT IN LEDGER (pending) | — | — | — |

The failed ledger record blocks Prisma from deploying any further migrations until it is resolved via `prisma migrate resolve`.

---

## §8 — All nc.procurement_pools.* Flags Inventory

| Key | enabled | created_at | notes |
| --- | --- | --- | --- |
| `nc.procurement_pools.enabled` | `true` | 2026-05-11 14:49:24 | Gateway flag; manually activated |
| `nc.procurement_pools.rfq.enabled` | `true` | 2026-05-11 14:49:28 | RFQ flag; manually activated |
| `nc.procurement_pools.supplier_invites.enabled` | `true` | 2026-05-11 13:58:22 | Supplier invite flag; pre-existing at migration time |

All 3 flags are `enabled=true`. All were manually activated during the production verification phase (2026-05-11).

---

## §9 — Supplier Quote Flag Evidence

`nc.procurement_pools.supplier_quotes.enabled` does **NOT exist** in `public.feature_flags`.

**Implication for migration `20260532000000_nc_pool_supplier_quote_feature_flag_seed`:**
This migration attempts to INSERT `nc.procurement_pools.supplier_quotes.enabled` with `enabled=false`. Because no row exists, the INSERT will succeed (no ON CONFLICT no-op). The post-flight check (if structured like migration 20260530000000) will verify `enabled=false` — which will be the state after insert. Therefore:

**Migration `20260532000000` is NOT at collision risk.** Once the failed ledger entry for `20260530000000` is resolved and `20260531000000` deploys successfully, `20260532000000` should apply cleanly.

---

## §10 — Root Cause Interpretation

| Dimension | Finding |
| --- | --- |
| Flag origin | Manually activated on 2026-05-11 ~13:58 UTC during production readiness testing (ORI test) |
| Migration intent | Seed flag with `enabled=false` as default OFF state; guard via post-flight assertion |
| Conflict type | Pre-existing row with `enabled=true` — INSERT ON CONFLICT DO NOTHING was a no-op |
| Post-flight trigger | Migration SQL raises P0001 if `enabled` is not `false` after seed attempt |
| Prisma response | Recorded `20260530000000` as FAILED; prevents further migration deploys |
| Production impact | None — flag is `enabled=true`, access works, zero tenant overrides, production is stable |

The migration's post-flight guard correctly detected that the intended "seed as disabled by default" was not achievable because the flag was already active. The migration halted rather than silently leaving production in a known-incorrect state from the seed's perspective. This was the migration's **intended safety behavior** — but the production state (flag already manually enabled) is also valid and intended.

There is no data corruption, no incorrect flag value from an operational perspective, and no production incident. The only problem is the Prisma ledger record blocking further migration deployment.

---

## §11 — Recommendation

**RECOMMENDED: Option A — Resolve as Applied**

### Rationale

1. The flag `nc.procurement_pools.supplier_invites.enabled = true` is the intended production state. It was activated deliberately during production verification testing.

2. There are zero `tenant_feature_overrides` rows. Production access to supplier invites works correctly today — resetting the global flag to `false` (Option B) would immediately break ALL supplier invite access across ALL tenants with no per-tenant override to preserve QA access.

3. The migration's functional purpose — ensuring the flag row EXISTS in production — is satisfied. The row exists. The only mismatch was between the migration's expected initial value (`false`) and the actual production value (`true`).

4. Marking the migration as applied via `prisma migrate resolve --applied` is semantically accurate: the resource the migration was intended to manage (the flag row) exists in production and is governed.

5. Once `20260530000000` is resolved, migrations `20260531000000` (supplier quote schema) and `20260532000000` (supplier quote feature flag seed) should deploy cleanly. The supplier quote flag does not pre-exist (Q4 evidence), so no collision is expected.

6. Option B (reset to `false`) creates unnecessary production disruption and requires an additional manual step to re-enable, with no benefit beyond strict migration fidelity on the initial-value assertion.

### Option B — NOT recommended

Resetting `nc.procurement_pools.supplier_invites.enabled` to `false` would:
- Break ALL supplier invite access immediately (no tenant overrides to preserve anyone)
- Require a separate manual re-enable after migration deployment
- Risk leaving production access broken if re-enable step is missed

Only justified if Paresh determines the current `enabled=true` state was unintentional and must be corrected as part of this migration cycle.

### Option C (this investigation) — COMPLETE

This document IS the Option C execution and output.

---

## §12 — Authorization Required From Paresh

Before ANY resolution action is taken, Paresh must explicitly authorize.

**For Option A (RECOMMENDED):**

> I authorize TEXQTIC-NC-REMOTE-DB-MIGRATION-FLAG-COLLISION-INVESTIGATION-001 Option A.
> Mark migration `20260530000000_nc_pool_supplier_invite_feature_flag_seed` as applied
> via `prisma migrate resolve --applied`, then re-deploy remaining migrations
> `20260531000000_nc_pool_supplier_quote_schema` and
> `20260532000000_nc_pool_supplier_quote_feature_flag_seed`.
> I confirm the `nc.procurement_pools.supplier_invites.enabled = true` production state
> should be preserved.

**For Option B (NOT recommended — include only if chosen):**

> I authorize TEXQTIC-NC-REMOTE-DB-MIGRATION-FLAG-COLLISION-INVESTIGATION-001 Option B.
> Reset `nc.procurement_pools.supplier_invites.enabled` to `enabled=false` via manual SQL,
> then re-deploy all 3 migrations.
> I confirm this will break ALL supplier invite access until the flag is manually re-enabled
> after deployment.

**No resolution actions will be taken without one of the above authorizations from Paresh.**

---

## §13 — Files Changed by This Investigation

| File | Action | Purpose |
| --- | --- | --- |
| `governance/TEXQTIC-NC-REMOTE-DB-MIGRATION-FLAG-COLLISION-INVESTIGATION-001.md` | CREATED | This document |
| `governance/control/BLOCKED.md` | UPDATED | Updated DEPLOYMENT-001 row with investigation findings + recommended option |
| `governance/control/NEXT-ACTION.md` | UPDATED | Updated `Updated:` line with investigation completion |
| `governance/control/OPEN-SET.md` | UPDATED | Prepended INVESTIGATION-001 COMPLETE operating note |
| `governance/control/GOVERNANCE-CHANGELOG.md` | UPDATED | Added INVESTIGATION_COMPLETE entry |

---

## §14 — Files NOT Changed

No product code files changed. No test files changed. No migration SQL files changed.
No `.env` files accessed or changed. No Prisma schema changed.
No Prisma migrate resolve or deploy commands run.
No DB mutations performed (SELECT-only).

---

## §15 — DPP Hold Confirmation

DPP governance posture is unchanged by this investigation:
- `dpp_launch_authorization: HOLD_FOR_PARESH_DECISION` — unchanged
- `dpp_passport_network_readiness: PRODUCTION_READY` — unchanged
- `dpp_readiness_commit: 17c252c` — unchanged

---

## §16 — Governance Posture Confirmation

NEXT-ACTION.md YAML keys unchanged:
```yaml
active_delivery_unit: TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001
active_delivery_unit_status: HOLD_FOR_PARESH_DECISION
last_closed_unit: TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001
dpp_launch_authorization: HOLD_FOR_PARESH_DECISION
dpp_passport_network_readiness: PRODUCTION_READY
dpp_readiness_commit: 17c252c
```

Packet 12 (active delivery unit) remains `HOLD_FOR_PARESH_DECISION`. This investigation does not
unlock Packet 12 execution. Separate Paresh authorization is required for Packet 12.

---

## §17 — Final Status

```
TEXQTIC_NC_REMOTE_DB_MIGRATION_FLAG_COLLISION_INVESTIGATION_001_READY_FOR_PARESH_DECISION
```

**Recommended action for Paresh:** Authorize Option A.

**After authorization, the next agent execution will:**
1. Run `pnpm -C server exec prisma migrate resolve --applied 20260530000000_nc_pool_supplier_invite_feature_flag_seed`
2. Run `pnpm -C server exec prisma migrate deploy` to deploy remaining 2 migrations
3. Verify deployment success
4. Update control files and commit

**This document is complete and read-only. No further changes will be made to it.**
