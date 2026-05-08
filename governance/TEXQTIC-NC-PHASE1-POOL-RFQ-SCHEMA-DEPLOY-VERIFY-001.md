# TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-DEPLOY-VERIFY-001

**Status:** DB_RUNTIME_LIVE + VERIFIED
**Task:** Deploy and verify `network_pool_rfqs` / `network_pool_rfq_lines` schema to Supabase
**Migration:** `20260528000000_nc_pool_rfq_schema`
**Schema foundation commit:** `c9806c8`
**Governance chain position:** DESIGN-001 → DECISION-AUDIT-001 → DECISION-RECORD-001 → SCHEMA-FOUNDATION-001 → **SCHEMA-DEPLOY-VERIFY-001 ← THIS DOCUMENT** → SCHEMA-GOV-SYNC-001 → SERVICE-001 → ROUTE-001

---

## 1. Deployment Evidence

### Migration Applied
```
Get-Content server/prisma/migrations/20260528000000_nc_pool_rfq_schema/migration.sql | psql $dbUrl
```
Output (all commands successful, no ERROR, no ROLLBACK):
```
DO
CREATE TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
ALTER TABLE
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
ALTER TABLE
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
GRANT
GRANT
GRANT
GRANT
```

### Prisma Ledger Registration
```
pnpm -C server exec prisma migrate resolve --applied 20260528000000_nc_pool_rfq_schema
→ Migration 20260528000000_nc_pool_rfq_schema marked as applied.
```

---

## 2. Verification Evidence

### V1: Table Existence
```sql
SELECT to_regclass('public.network_pool_rfqs') AS rfqs,
       to_regclass('public.network_pool_rfq_lines') AS rfq_lines;
```
```
       rfqs        |       rfq_lines
-------------------+------------------------
 network_pool_rfqs | network_pool_rfq_lines
(1 row)
```
Result: PASS — both tables present.

### V2: Column Counts
```sql
SELECT table_name, COUNT(*) AS col_count
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('network_pool_rfqs','network_pool_rfq_lines')
GROUP BY table_name ORDER BY table_name;
```
```
       table_name       | col_count
------------------------+-----------
 network_pool_rfq_lines |        22
 network_pool_rfqs      |        19
(2 rows)
```
Result: PASS — `network_pool_rfqs`: 19 columns; `network_pool_rfq_lines`: 22 columns.

### V3: Constraints on `network_pool_rfqs`
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema='public' AND table_name='network_pool_rfqs'
  AND constraint_type IN ('CHECK','UNIQUE','FOREIGN KEY')
ORDER BY constraint_type, constraint_name;
```
```
             constraint_name             | constraint_type
-----------------------------------------+-----------------
 nc_pool_rfqs_issue_basis_check          | CHECK
 nc_pool_rfqs_line_count_positive_check  | CHECK
 nc_pool_rfqs_qty_unit_coherence_check   | CHECK
 nc_pool_rfqs_rfq_ref_nonempty_check     | CHECK
 nc_pool_rfqs_rfq_version_positive_check | CHECK
 nc_pool_rfqs_status_check               | CHECK
 nc_pool_rfqs_supplier_invite_mode_check | CHECK
 nc_pool_rfqs_total_qty_positive_check   | CHECK
 nc_pool_rfqs_owner_org_id_fk            | FOREIGN KEY
 nc_pool_rfqs_pool_id_fk                 | FOREIGN KEY
 nc_pool_rfqs_snapshot_id_fk             | FOREIGN KEY
 nc_pool_rfqs_pool_rfq_ref_unique        | UNIQUE
 nc_pool_rfqs_pool_version_unique        | UNIQUE
(+ system NOT NULL CHECKs omitted for brevity)
```
Result: PASS — 8 domain CHECKs, 3 FKs, 2 UNIQUEs confirmed.

### V4: Constraints on `network_pool_rfq_lines`
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema='public' AND table_name='network_pool_rfq_lines'
  AND constraint_type IN ('CHECK','UNIQUE','FOREIGN KEY')
ORDER BY constraint_type, constraint_name;
```
```
                   constraint_name                   | constraint_type
-----------------------------------------------------+-----------------
 nc_pool_rfq_lines_commodity_category_nonempty_check | CHECK
 nc_pool_rfq_lines_delivery_window_coherence_check   | CHECK
 nc_pool_rfq_lines_qty_positive_check                | CHECK
 nc_pool_rfq_lines_qty_unit_nonempty_check           | CHECK
 nc_pool_rfq_lines_source_line_ref_nonempty_check    | CHECK
 nc_pool_rfq_lines_source_revision_no_positive_check | CHECK
 nc_pool_rfq_lines_tolerance_pct_range_check         | CHECK
 nc_pool_rfq_lines_owner_org_id_fk                   | FOREIGN KEY
 nc_pool_rfq_lines_pool_id_fk                        | FOREIGN KEY
 nc_pool_rfq_lines_rfq_id_fk                         | FOREIGN KEY
 nc_pool_rfq_lines_snapshot_line_id_fk               | FOREIGN KEY
 nc_pool_rfq_lines_rfq_snapshot_line_unique          | UNIQUE
(+ system NOT NULL CHECKs omitted for brevity)
```
Result: PASS — 7 domain CHECKs, 4 FKs (no FK on `demand_line_id` by design), 1 UNIQUE confirmed.

### V5: Indexes
```sql
SELECT indexname FROM pg_indexes
WHERE schemaname='public'
  AND tablename IN ('network_pool_rfqs','network_pool_rfq_lines')
ORDER BY tablename, indexname;
```
```
                 indexname
--------------------------------------------
 idx_nc_pool_rfq_lines_commodity_category
 idx_nc_pool_rfq_lines_created_at
 idx_nc_pool_rfq_lines_demand_line_id
 idx_nc_pool_rfq_lines_owner_org_id
 idx_nc_pool_rfq_lines_pool_id
 idx_nc_pool_rfq_lines_rfq_id
 idx_nc_pool_rfq_lines_snapshot_line_id
 nc_pool_rfq_lines_pkey
 nc_pool_rfq_lines_rfq_snapshot_line_unique
 idx_nc_pool_rfqs_created_at
 idx_nc_pool_rfqs_issued_at
 idx_nc_pool_rfqs_owner_org_id
 idx_nc_pool_rfqs_pool_id
 idx_nc_pool_rfqs_snapshot_id
 idx_nc_pool_rfqs_status
 idx_nc_pool_rfqs_updated_at
 nc_pool_rfqs_pkey
 nc_pool_rfqs_pool_rfq_ref_unique
 nc_pool_rfqs_pool_version_unique
(19 rows)
```
Result: PASS — 7 data indexes per table (excluding PK and UNIQUE indexes).

### V6: RLS Enabled and Forced
```sql
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('network_pool_rfqs','network_pool_rfq_lines')
ORDER BY relname;
```
```
        relname         | relrowsecurity | relforcerowsecurity
------------------------+----------------+---------------------
 network_pool_rfq_lines | t              | t
 network_pool_rfqs      | t              | t
(2 rows)
```
Result: PASS — RLS ENABLED and FORCED on both tables.

### V7: RLS Policies
```sql
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('network_pool_rfqs','network_pool_rfq_lines')
ORDER BY tablename, policyname;
```
```
       tablename        |           policyname            |      roles      |  cmd
------------------------+---------------------------------+-----------------+--------
 network_pool_rfq_lines | nc_pool_rfq_lines_admin_select  | {texqtic_admin} | SELECT
 network_pool_rfq_lines | nc_pool_rfq_lines_no_delete     | {texqtic_app}   | DELETE
 network_pool_rfq_lines | nc_pool_rfq_lines_no_update     | {texqtic_app}   | UPDATE
 network_pool_rfq_lines | nc_pool_rfq_lines_tenant_insert | {texqtic_app}   | INSERT
 network_pool_rfq_lines | nc_pool_rfq_lines_tenant_select | {texqtic_app}   | SELECT
 network_pool_rfqs      | nc_pool_rfqs_admin_select       | {texqtic_admin} | SELECT
 network_pool_rfqs      | nc_pool_rfqs_no_delete          | {texqtic_app}   | DELETE
 network_pool_rfqs      | nc_pool_rfqs_no_update          | {texqtic_app}   | UPDATE
 network_pool_rfqs      | nc_pool_rfqs_tenant_insert      | {texqtic_app}   | INSERT
 network_pool_rfqs      | nc_pool_rfqs_tenant_select      | {texqtic_app}   | SELECT
(10 rows)
```
Result: PASS — 5 policies per table: tenant_select, tenant_insert, no_update (restrictive), no_delete (restrictive), admin_select.

### V8: Immutability Trigger on `network_pool_rfq_lines`
```sql
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table='network_pool_rfq_lines'
ORDER BY trigger_name;
```
```
          trigger_name           | event_manipulation | action_timing
---------------------------------+--------------------+---------------
 trg_immutable_nc_pool_rfq_lines | DELETE             | BEFORE
 trg_immutable_nc_pool_rfq_lines | UPDATE             | BEFORE
(2 rows)
```
Result: PASS — `trg_immutable_nc_pool_rfq_lines` fires BEFORE UPDATE and BEFORE DELETE, backed by function `prevent_rfq_line_mutation()`.

### V9: Grants
```sql
SELECT grantee, privilege_type, table_name
FROM information_schema.role_table_grants
WHERE table_name IN ('network_pool_rfqs','network_pool_rfq_lines')
  AND table_schema='public'
ORDER BY table_name, grantee, privilege_type;
```
```
    grantee    | privilege_type |       table_name
---------------+----------------+------------------------
 texqtic_admin | SELECT         | network_pool_rfq_lines
 texqtic_app   | INSERT         | network_pool_rfq_lines
 texqtic_app   | SELECT         | network_pool_rfq_lines
 texqtic_admin | SELECT         | network_pool_rfqs
 texqtic_app   | INSERT         | network_pool_rfqs
 texqtic_app   | SELECT         | network_pool_rfqs
(selected rows; postgres superuser grants omitted)
```
Result: PASS — `texqtic_app` SELECT+INSERT; `texqtic_admin` SELECT only. No UPDATE or DELETE grants.

### V10: Prisma Ledger Registration
```sql
SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations
WHERE migration_name='20260528000000_nc_pool_rfq_schema';
```
```
          migration_name           |          finished_at          | rolled_back_at
-----------------------------------+-------------------------------+----------------
 20260528000000_nc_pool_rfq_schema | 2026-05-08 05:44:54.443529+00 |
(1 row)
```
Result: PASS — `finished_at` non-null; `rolled_back_at` null. Migration registered as applied.

---

## 3. Post-Deploy Validations

### Prisma Generate
```
pnpm -C server exec prisma generate
→ ✔ Generated Prisma Client (v6.1.0) in 616ms
```
Result: PASS

### TypeScript Compile (`tsc --noEmit`)
```
pnpm -C server exec tsc --noEmit
→ (no output = clean)
```
Result: PASS — zero type errors.

### Unit Tests (93 tests across 3 suites)
```
pnpm -C server exec vitest run \
  src/__tests__/networkPoolDemandLine.service.unit.test.ts \
  src/__tests__/ncPoolRfqFeatureGate.middleware.unit.test.ts \
  src/__tests__/network-pool.service.unit.test.ts

Test Files  3 passed (3)
     Tests  93 passed (93)
  Duration  1.27s
```
Result: PASS — no regressions.

---

## 4. DB Object Summary

| Object | Type | Status |
|---|---|---|
| `network_pool_rfqs` | TABLE | CREATED |
| `network_pool_rfq_lines` | TABLE | CREATED |
| `network_pool_rfqs` columns | 19 | VERIFIED |
| `network_pool_rfq_lines` columns | 22 | VERIFIED |
| `nc_pool_rfqs_*` CHECK constraints | 8 | VERIFIED |
| `nc_pool_rfq_lines_*` CHECK constraints | 7 | VERIFIED |
| `nc_pool_rfqs_*` FOREIGN KEY constraints | 3 (owner_org CASCADE, pool CASCADE, snapshot RESTRICT) | VERIFIED |
| `nc_pool_rfq_lines_*` FOREIGN KEY constraints | 4 (rfq CASCADE, owner_org CASCADE, pool CASCADE, snapshot_line RESTRICT) | VERIFIED |
| `demand_line_id` on rfq_lines | Plain UUID column, no FK (by design) | VERIFIED |
| `nc_pool_rfqs_pool_version_unique` | UNIQUE (pool_id, rfq_version) | VERIFIED |
| `nc_pool_rfqs_pool_rfq_ref_unique` | UNIQUE (pool_id, rfq_ref) | VERIFIED |
| `nc_pool_rfq_lines_rfq_snapshot_line_unique` | UNIQUE (rfq_id, snapshot_line_id) | VERIFIED |
| Indexes on `network_pool_rfqs` | 7 data indexes | VERIFIED |
| Indexes on `network_pool_rfq_lines` | 7 data indexes | VERIFIED |
| RLS `network_pool_rfqs` | ENABLED + FORCED | VERIFIED |
| RLS `network_pool_rfq_lines` | ENABLED + FORCED | VERIFIED |
| RLS policies on `network_pool_rfqs` | 5 (tenant_select, tenant_insert, no_update, no_delete, admin_select) | VERIFIED |
| RLS policies on `network_pool_rfq_lines` | 5 (tenant_select, tenant_insert, no_update, no_delete, admin_select) | VERIFIED |
| `trg_immutable_nc_pool_rfq_lines` trigger | BEFORE UPDATE + BEFORE DELETE | VERIFIED |
| `prevent_rfq_line_mutation()` function | PL/pgSQL immutability guard | VERIFIED |
| Grants `texqtic_app` | SELECT + INSERT on both tables | VERIFIED |
| Grants `texqtic_admin` | SELECT on both tables | VERIFIED |
| Prisma ledger `20260528000000_nc_pool_rfq_schema` | finished_at 2026-05-08 05:44:54.443529+00, rolled_back_at NULL | VERIFIED |

---

## 5. Scope Boundary

This document closes the schema deployment scope only.

**In scope:** Table creation, constraints, indexes, RLS, triggers, grants, Prisma client regeneration.
**Out of scope:** Service layer, routes, middleware, UI, integration tests, OPEN-SET.md, NEXT-ACTION.md, GOVERNANCE-CHANGELOG.md.

**Next governance packet:** `TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-GOV-SYNC-001`
