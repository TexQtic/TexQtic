# TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-DEPLOY-VERIFY-001

**Status:** CLOSED — VERIFIED  
**Date:** 2026-05-08  
**Packet type:** Deploy + Verify  
**Scope:** Network Commerce / Phase 1 / Pool RFQ / Demand Snapshot Schema  
**Parent foundation commit:** `a4dcabe` — feat(network-commerce): add pool demand snapshot schema foundation

---

## 1. Objective

Deploy the `network_pool_demand_snapshots` and `network_pool_demand_snapshot_lines` migration SQL to the remote Supabase database, verify all DB objects, register in Prisma ledger, and confirm post-deploy compile + test gates pass.

---

## 2. Pre-flight Gate

| Check | Result |
|---|---|
| `git status --short` | Clean |
| HEAD commit | `a4dcabe` (local, unpushed to origin at time of deploy) |
| Migration file exists | `True` — `server/prisma/migrations/20260525000000_nc_pool_demand_snapshot_schema/migration.sql` |
| DATABASE_URL present | PRESENT in `server/.env` |
| Host class | Supabase pooler — `aws-1-ap-northeast-1.***` |
| Pre-deploy ledger check | 0 rows — migration not previously applied |
| Pre-deploy table existence | Both tables absent (0 rows returned) |

No drift. No blocker. Proceed authorized.

---

## 3. Migration Apply

**Command:** `Get-Content server/prisma/migrations/20260525000000_nc_pool_demand_snapshot_schema/migration.sql | psql $dbUrl`

**Output (critical lines):**
```
DO
CREATE TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX  (×7 — network_pool_demand_snapshots)
CREATE TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX  (×8 — network_pool_demand_snapshot_lines)
CREATE FUNCTION
CREATE TRIGGER
ALTER TABLE
ALTER TABLE
CREATE POLICY (×5 — network_pool_demand_snapshots)
CREATE POLICY (×5 — network_pool_demand_snapshot_lines)
GRANT         (×2 — snapshots: texqtic_app SELECT+INSERT, texqtic_admin SELECT)
GRANT         (×2 — snapshot_lines: texqtic_app SELECT+INSERT, texqtic_admin SELECT)
```

**Note:** The pre-flight DO block completed with `DO` (no exception raised). Tables were confirmed absent in pre-flight, so the guard passed successfully.

---

## 4. Prisma Ledger Registration

```
pnpm -C server exec prisma migrate resolve --applied 20260525000000_nc_pool_demand_snapshot_schema
```

Result: `Migration 20260525000000_nc_pool_demand_snapshot_schema marked as applied.`

Ledger verification:
| migration_name | finished_at | rolled_back_at | applied_steps_count |
|---|---|---|---|
| 20260525000000_nc_pool_demand_snapshot_schema | 2026-05-08 01:34:53.789870+00 | — | 0 |

`applied_steps_count: 0` is expected for `migrate resolve --applied` (manual apply path, Prisma skips step count).

---

## 5. DB Object Verification

### 5A. Tables

| table_name | state |
|---|---|
| network_pool_demand_snapshots | EXISTS |
| network_pool_demand_snapshot_lines | EXISTS |

✅ Both present

---

### 5B. Columns — `network_pool_demand_snapshots` (16)

| # | column_name | data_type | is_nullable | column_default |
|---|---|---|---|---|
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | owner_org_id | uuid | NO | — |
| 3 | pool_id | uuid | NO | — |
| 4 | snapshot_ref | character varying | NO | — |
| 5 | snapshot_version | integer | NO | — |
| 6 | basis | character varying | NO | — |
| 7 | status | character varying | NO | 'DRAFT'::character varying |
| 8 | captured_at | timestamp with time zone | YES | — |
| 9 | captured_by_user_id | uuid | YES | — |
| 10 | captured_reason | text | YES | — |
| 11 | line_count | integer | NO | 0 |
| 12 | total_qty | numeric | YES | — |
| 13 | qty_unit | character varying | YES | — |
| 14 | metadata_internal_json | jsonb | YES | — |
| 15 | created_at | timestamp with time zone | NO | now() |
| 16 | updated_at | timestamp with time zone | NO | now() |

✅ All 16 columns match schema.prisma definition

---

### 5C. Columns — `network_pool_demand_snapshot_lines` (26)

| # | column_name | data_type | is_nullable | column_default |
|---|---|---|---|---|
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | snapshot_id | uuid | NO | — |
| 3 | owner_org_id | uuid | NO | — |
| 4 | pool_id | uuid | NO | — |
| 5 | demand_line_id | uuid | NO | — |
| 6 | source_line_ref | character varying | NO | — |
| 7 | source_revision_no | integer | NO | — |
| 8 | commodity_category | character varying | NO | — |
| 9 | product_category | character varying | YES | — |
| 10 | product_spec_summary | text | YES | — |
| 11 | qty | numeric | NO | — |
| 12 | qty_unit | character varying | NO | — |
| 13 | quality_requirements_json | jsonb | YES | — |
| 14 | certification_requirements_json | jsonb | YES | — |
| 15 | packaging_requirements_json | jsonb | YES | — |
| 16 | delivery_location | character varying | YES | — |
| 17 | delivery_window_start | timestamp with time zone | YES | — |
| 18 | delivery_window_end | timestamp with time zone | YES | — |
| 19 | tolerance_pct | numeric | YES | — |
| 20 | priority | integer | YES | — |
| 21 | source_type | character varying | NO | — |
| 22 | normalized_from_member_input | boolean | NO | false |
| 23 | source_membership_id | uuid | YES | — |
| 24 | supersedes_line_id | uuid | YES | — |
| 25 | metadata_internal_json | jsonb | YES | — |
| 26 | created_at | timestamp with time zone | NO | now() |

✅ All 26 columns match schema.prisma definition  
**Note:** `network_pool_demand_snapshot_lines` is intentionally immutable — no `updated_at` column. Updates are blocked by trigger.

---

### 5D. Constraints (29 total)

| conname | contype |
|---|---|
| **network_pool_demand_snapshots** | |
| nc_pool_demand_snapshots_pkey | PRIMARY KEY |
| nc_pool_demand_snapshots_pool_version_unique | UNIQUE (pool_id, snapshot_version) |
| nc_pool_demand_snapshots_pool_ref_unique | UNIQUE (pool_id, snapshot_ref) |
| nc_pool_demand_snapshots_owner_org_id_fk | FK → organizations(id) ON DELETE CASCADE |
| nc_pool_demand_snapshots_pool_id_fk | FK → network_pools(id) ON DELETE CASCADE |
| nc_pool_demand_snapshots_snapshot_ref_nonempty_check | CHECK length(trim(snapshot_ref)) > 0 |
| nc_pool_demand_snapshots_snapshot_version_positive_check | CHECK snapshot_version >= 1 |
| nc_pool_demand_snapshots_basis_check | CHECK basis IN ('RFQ_ISSUE','RFQ_REVISION','MANUAL_RECAPTURE') |
| nc_pool_demand_snapshots_status_check | CHECK status IN ('DRAFT','CAPTURED','SUPERSEDED','CANCELLED') |
| nc_pool_demand_snapshots_captured_at_coherence_check | CHECK captured_at IS NOT NULL OR status != 'CAPTURED' |
| nc_pool_demand_snapshots_line_count_nonneg_check | CHECK line_count >= 0 |
| nc_pool_demand_snapshots_total_qty_positive_check | CHECK total_qty IS NULL OR total_qty > 0 |
| nc_pool_demand_snapshots_qty_unit_coherence_check | CHECK total_qty IS NULL OR (qty_unit IS NOT NULL AND length(trim(qty_unit)) > 0) |
| **network_pool_demand_snapshot_lines** | |
| nc_pool_demand_snapshot_lines_pkey | PRIMARY KEY |
| nc_pool_demand_snapshot_lines_snapshot_demand_line_unique | UNIQUE (snapshot_id, demand_line_id) |
| nc_pool_demand_snapshot_lines_snapshot_lineref_rev_unique | UNIQUE (snapshot_id, source_line_ref, source_revision_no) |
| nc_pool_demand_snapshot_lines_snapshot_id_fk | FK → network_pool_demand_snapshots(id) ON DELETE CASCADE |
| nc_pool_demand_snapshot_lines_owner_org_id_fk | FK → organizations(id) ON DELETE CASCADE |
| nc_pool_demand_snapshot_lines_pool_id_fk | FK → network_pools(id) ON DELETE CASCADE |
| nc_pool_demand_snapshot_lines_demand_line_id_fk | FK → network_pool_demand_lines(id) ON DELETE RESTRICT |
| nc_pool_demand_snapshot_lines_source_membership_id_fk | FK → network_pool_memberships(id) ON DELETE SET NULL |
| nc_pool_demand_snapshot_lines_source_line_ref_nonempty_check | CHECK length(trim(source_line_ref)) > 0 |
| nc_pool_demand_snapshot_lines_source_revision_no_positive_check | CHECK source_revision_no >= 1 |
| nc_pool_demand_snapshot_lines_commodity_category_nonempty_check | CHECK length(trim(commodity_category)) > 0 |
| nc_pool_demand_snapshot_lines_qty_positive_check | CHECK qty > 0 |
| nc_pool_demand_snapshot_lines_qty_unit_nonempty_check | CHECK length(trim(qty_unit)) > 0 |
| nc_pool_demand_snapshot_lines_delivery_window_coherence_check | CHECK delivery_window_end >= delivery_window_start (when both non-null) |
| nc_pool_demand_snapshot_lines_tolerance_pct_range_check | CHECK tolerance_pct IS NULL OR (tolerance_pct >= 0 AND tolerance_pct <= 100) |
| nc_pool_demand_snapshot_lines_source_type_check | CHECK source_type IN ('OWNER_DIRECT','MEMBERSHIP_DERIVED','OWNER_NORMALIZED') |

✅ All 29 constraints verified (13 on snapshots + 16 on snapshot_lines)

---

### 5E. Indexes

**network_pool_demand_snapshots (7 non-PK indexes):**
| indexname | definition |
|---|---|
| idx_nc_pool_demand_snapshots_pool_id | btree (pool_id) |
| idx_nc_pool_demand_snapshots_owner_org_id | btree (owner_org_id) |
| idx_nc_pool_demand_snapshots_status | btree (status) |
| idx_nc_pool_demand_snapshots_basis | btree (basis) |
| idx_nc_pool_demand_snapshots_captured_at | btree (captured_at) |
| idx_nc_pool_demand_snapshots_created_at | btree (created_at DESC) |
| idx_nc_pool_demand_snapshots_updated_at | btree (updated_at DESC) |

**network_pool_demand_snapshot_lines (8 non-PK indexes):**
| indexname | definition |
|---|---|
| idx_nc_pool_demand_snapshot_lines_snapshot_id | btree (snapshot_id) |
| idx_nc_pool_demand_snapshot_lines_demand_line_id | btree (demand_line_id) |
| idx_nc_pool_demand_snapshot_lines_pool_id | btree (pool_id) |
| idx_nc_pool_demand_snapshot_lines_owner_org_id | btree (owner_org_id) |
| idx_nc_pool_demand_snapshot_lines_commodity_category | btree (commodity_category) |
| idx_nc_pool_demand_snapshot_lines_qty_unit | btree (qty_unit) |
| idx_nc_pool_demand_snapshot_lines_source_membership_id | btree (source_membership_id) |
| idx_nc_pool_demand_snapshot_lines_created_at | btree (created_at DESC) |

✅ All 15 non-PK indexes verified (7 + 8)

---

## 6. RLS Verification

### 6A. RLS Enabled + Forced

| relname | relrowsecurity | relforcerowsecurity |
|---|---|---|
| network_pool_demand_snapshots | t | t |
| network_pool_demand_snapshot_lines | t | t |

✅ RLS ENABLED and FORCED on both tables

### 6B. Policies — `network_pool_demand_snapshots` (5)

| policyname | roles | cmd | qual / with_check |
|---|---|---|---|
| nc_pool_demand_snapshots_tenant_select | texqtic_app | SELECT | owner_org_id = current_setting('app.org_id') |
| nc_pool_demand_snapshots_tenant_insert | texqtic_app | INSERT | with_check: owner_org_id = current_setting('app.org_id') |
| nc_pool_demand_snapshots_no_update | texqtic_app | UPDATE | USING false (no updates allowed) |
| nc_pool_demand_snapshots_no_delete | texqtic_app | DELETE | USING false (no deletes allowed) |
| nc_pool_demand_snapshots_admin_select | texqtic_admin | SELECT | app.is_admin = 'true' |

✅ All 5 policies verified

### 6C. Policies — `network_pool_demand_snapshot_lines` (5)

| policyname | roles | cmd | qual / with_check |
|---|---|---|---|
| nc_pool_demand_snapshot_lines_tenant_select | texqtic_app | SELECT | owner_org_id = current_setting('app.org_id') |
| nc_pool_demand_snapshot_lines_tenant_insert | texqtic_app | INSERT | with_check: owner_org_id = current_setting('app.org_id') |
| nc_pool_demand_snapshot_lines_no_update | texqtic_app | UPDATE | USING false (no updates allowed) |
| nc_pool_demand_snapshot_lines_no_delete | texqtic_app | DELETE | USING false (no deletes allowed) |
| nc_pool_demand_snapshot_lines_admin_select | texqtic_admin | SELECT | app.is_admin = 'true' |

✅ All 5 policies verified

---

## 7. Grants Verification

| grantee | table_name | privilege_type |
|---|---|---|
| texqtic_app | network_pool_demand_snapshots | SELECT |
| texqtic_app | network_pool_demand_snapshots | INSERT |
| texqtic_admin | network_pool_demand_snapshots | SELECT |
| texqtic_app | network_pool_demand_snapshot_lines | SELECT |
| texqtic_app | network_pool_demand_snapshot_lines | INSERT |
| texqtic_admin | network_pool_demand_snapshot_lines | SELECT |

✅ All 6 grants verified — `texqtic_app` has SELECT+INSERT; `texqtic_admin` has SELECT only

---

## 8. Immutability Verification

| Object | Type | Status |
|---|---|---|
| `prevent_snapshot_line_mutation` | FUNCTION | EXISTS |
| `trg_immutable_nc_pool_demand_snapshot_lines` (UPDATE) | TRIGGER BEFORE | EXISTS on `network_pool_demand_snapshot_lines` |
| `trg_immutable_nc_pool_demand_snapshot_lines` (DELETE) | TRIGGER BEFORE | EXISTS on `network_pool_demand_snapshot_lines` |

✅ Immutability enforced via dedicated function + trigger (not shared with lifecycle log pattern)  
✅ Snapshot lines are insert-only at both the RLS layer (no_update/no_delete policies) and the trigger layer

---

## 9. Post-Deploy Validation Gates

### 9A. Prisma Generate

```
pnpm -C server exec prisma generate
```

Result: `✔ Generated Prisma Client (v6.1.0)` — no warnings, no errors

### 9B. TypeScript Type Check

```
pnpm exec tsc --noEmit
```

Result: No output → zero type errors

### 9C. Regression Tests

**Test files run (8 suites):**
- `server/src/__tests__/networkPoolDemandLine.service.unit.test.ts`
- `server/src/routes/tenant/pools.demandLines.integration.test.ts`
- `server/src/routes/tenant/pools.integration.test.ts`
- `server/src/__tests__/network-pool.service.unit.test.ts`
- `server/src/__tests__/network-pool.service.integration.test.ts`
- `server/src/__tests__/network-invoice.service.unit.test.ts`
- `server/src/__tests__/invoice.service.unit.test.ts`
- `tests/stateMachine.g020.test.ts`

**Result:** 204 / 204 PASS — zero failures

---

## 10. Summary

| Gate | Result |
|---|---|
| Migration pre-flight (DO guard) | PASS — tables absent, no abort |
| Migration apply (pipe pattern) | PASS — zero errors |
| Table existence | PASS — both tables exist |
| Column count / types (snapshots) | PASS — 16 columns |
| Column count / types (snapshot_lines) | PASS — 26 columns (immutable, no updated_at) |
| Constraints (snapshots: 13) | PASS |
| Constraints (snapshot_lines: 16) | PASS |
| Indexes (15 non-PK total) | PASS |
| Prisma ledger registration | PASS — finished_at 2026-05-08 01:34:53 |
| RLS ENABLED + FORCED | PASS — both tables |
| RLS policies (5 per table) | PASS — 10 total |
| Grants | PASS — 6 total |
| Immutability function | PASS — prevent_snapshot_line_mutation() |
| Immutability trigger (UPDATE + DELETE) | PASS — trg_immutable_nc_pool_demand_snapshot_lines |
| prisma generate | PASS |
| tsc --noEmit | PASS — 0 errors |
| Regression tests | PASS — 204/204 |

**DB state transition:** `DB_RUNTIME_PENDING` → **`DB_RUNTIME_LIVE`**

---

**TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-DEPLOY-VERIFY-001: CLOSED**
