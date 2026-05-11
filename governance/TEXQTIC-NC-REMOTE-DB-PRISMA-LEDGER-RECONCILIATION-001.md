# TEXQTIC-NC-REMOTE-DB-PRISMA-LEDGER-RECONCILIATION-001

**Unit:** TEXQTIC-NC-REMOTE-DB-PRISMA-LEDGER-RECONCILIATION-001  
**Type:** AUDIT — Remote DB + Prisma Migration Ledger Reconciliation  
**Status:** BLOCKED  
**Date:** 2026-05-12  
**Authority:** governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md

---

## §1 Objective

Audit-only pass: verify all Network Commerce SQL migrations have been deployed to the remote
Supabase database and reconcile the Prisma migration ledger accordingly.

No schema changes, no new migrations, no product code changes. Audit and reconcile only.

---

## §2 Scope

**Read-only targets:**
- `server/prisma/migrations/` — migration files on disk
- Remote Supabase DB — `prisma migrate status` (SELECT on `_prisma_migrations`)

**Control files (UPDATE if audit completes):**
- `governance/control/GOVERNANCE-CHANGELOG.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md` (UPDATE on blocker)

**Governance doc (CREATE):**
- `governance/TEXQTIC-NC-REMOTE-DB-PRISMA-LEDGER-RECONCILIATION-001.md` ← this file

**Forbidden:**
- `prisma migrate deploy` (requires explicit Paresh authorization)
- `prisma migrate dev` (NEVER)
- `prisma db push` (NEVER)
- Any schema modification
- Any product code change

---

## §3 Audit Execution

### Command Run

```
pnpm -C server exec prisma migrate status
```

### Output (key lines)

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at
  "aws-1-ap-northeast-1.pooler.supabase.com:5432"

20 migrations found in prisma/migrations

Following migrations have not yet been applied:
20260530000000_nc_pool_supplier_invite_feature_flag_seed
20260531000000_nc_pool_supplier_quote_schema
20260532000000_nc_pool_supplier_quote_feature_flag_seed
```

### Conclusion

3 migrations exist on disk but have NOT been deployed to the remote Supabase database.

---

## §4 Stop Condition Hit

**Stop Condition #1:** Any migration missing from remote DB → STOP and emit blocker.

---

## §5 DATABASE EXECUTION BLOCKER

```
🛑 DATABASE EXECUTION BLOCKER

Task: TEXQTIC-NC-REMOTE-DB-PRISMA-LEDGER-RECONCILIATION-001
Blocker Type: Prisma Migration — Migrations Not Applied to Remote DB

Evidence:
- Command: pnpm -C server exec prisma migrate status
- Output: "Following migrations have not yet been applied:
    20260530000000_nc_pool_supplier_invite_feature_flag_seed
    20260531000000_nc_pool_supplier_quote_schema
    20260532000000_nc_pool_supplier_quote_feature_flag_seed"
- Affected tables:
    network_pool_rfq_supplier_quotes (table missing — created by migration 20260531000000)
    feature_flags (2 seed rows missing for supplier invite + supplier quote gates)

Stop Condition: #1 — migrations not yet applied to remote DB → STOP

Required User Action:
- Authorize psql deployment of 3 pending migrations via DATABASE_URL
- Recommended: authorize alongside Packet 12 (Service) and Packet 13 (Route) activation,
  since all 3 migrations are required for those packets to function in production.
```

---

## §6 Impact Analysis

### What is missing from production

| Migration | Creates / Inserts |
|---|---|
| `20260530000000_nc_pool_supplier_invite_feature_flag_seed` | Feature flag seed row: `nc.procurement_pools.supplier_invites.enabled` |
| `20260531000000_nc_pool_supplier_quote_schema` | Table: `network_pool_rfq_supplier_quotes` + indexes + RLS |
| `20260532000000_nc_pool_supplier_quote_feature_flag_seed` | Feature flag seed row: `nc.procurement_pools.supplier_quotes.enabled` |

### Why tests still pass

SRI, ORI, DLT, and PRQ integration test suites pass because they seed their own feature flags
via `withBypassForSeed(prisma, cb)` at test setup time. They do NOT depend on the migration
seed rows being present in the remote DB. This is correct test-isolation behavior.

The `network_pool_rfq_supplier_quotes` table is not exercised by any currently-enabled test
suite (Packet 12 Service + Packet 13 Route are HOLD_FOR_PARESH_DECISION).

### Production impact

- Any production request attempting to create or query supplier quotes will fail (table missing).
- Feature flag gates for supplier invites and supplier quotes are not seeded in production
  `feature_flags` table, so those features are non-operational even if routes were enabled.
- No current production traffic is affected because Packets 12 and 13 are HOLD_FOR_PARESH_DECISION
  and not deployed/activated.

---

## §7 Recommended Deployment Sequence (pending Paresh authorization)

When Paresh authorizes migration deployment, the sequence is:

1. Apply SQL via psql using DATABASE_URL (in chronological order):
   ```
   psql $DATABASE_URL -f server/prisma/migrations/20260530000000_nc_pool_supplier_invite_feature_flag_seed/migration.sql
   psql $DATABASE_URL -f server/prisma/migrations/20260531000000_nc_pool_supplier_quote_schema/migration.sql
   psql $DATABASE_URL -f server/prisma/migrations/20260532000000_nc_pool_supplier_quote_feature_flag_seed/migration.sql
   ```
2. Verify each psql command exits without ERROR or ROLLBACK.
3. Run: `pnpm -C server exec prisma db pull` (verify schema unchanged)
4. Run: `pnpm -C server exec prisma generate`
5. Run: `pnpm -C server exec prisma migrate status` (confirm 0 pending)
6. Re-run regression test suites to confirm no regressions.
7. Return to NEXT-ACTION.md: activate Packet 12 (Service) → Packet 13 (Route).

---

## §8 Governance Posture (unchanged)

| Key | Value |
|---|---|
| `active_delivery_unit` | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001` |
| `active_delivery_unit_status` | `HOLD_FOR_PARESH_DECISION` |
| `last_closed_unit` | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001` |
| `dpp_launch_authorization` | `HOLD_FOR_PARESH_DECISION` |
| `dpp_passport_network_readiness` | `PRODUCTION_READY` |
| `dpp_readiness_commit` | `17c252c` |

No governance posture changes result from this audit. Posture updates will occur when
migration deployment is authorized and executed.

---

## §9 Successor Packets (pending authorization)

1. **TEXQTIC-NC-REMOTE-DB-PRISMA-LEDGER-RECONCILIATION-001** (this packet) — BLOCKED
   Unblocked when: Paresh authorizes migration deployment
2. **TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001** — HOLD_FOR_PARESH_DECISION
   Unblocked when: Paresh authorizes Packet 12 activation + migration deployment
3. **TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-ROUTE-001** — not started
   Depends on: Packet 12 complete
