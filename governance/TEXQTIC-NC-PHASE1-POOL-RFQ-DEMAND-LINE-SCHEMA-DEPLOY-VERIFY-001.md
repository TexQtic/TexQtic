# TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-DEPLOY-VERIFY-001

**Status:** CLOSED — VERIFIED  
**Date:** 2026-05-07  
**Packet type:** Deploy + Verify  
**Scope:** Network Commerce / Phase 1 / Pool RFQ / Demand Line Schema  
**Parent foundation commit:** `7197e23` — feat(network-commerce): add pool demand line schema foundation

---

## 1. Objective

Deploy the `network_pool_demand_lines` migration SQL to the remote Supabase database, verify all DB objects, register in Prisma ledger, and confirm post-deploy compile + test gates pass.

---

## 2. Pre-flight Gate

| Check | Result |
|---|---|
| `git status --short` | Clean |
| HEAD commit | `7197e23` (local, unpushed to origin at time of deploy) |
| Migration file exists | `True` — `server/prisma/migrations/20260524000000_nc_pool_demand_line_schema/migration.sql` |
| DATABASE_URL present | PRESENT in `server/.env` |
| Host class | Supabase pooler — `aws-1-ap-northeast-1.pooler.supabase.com:5432` |
| Pre-deploy ledger check | 0 rows — migration not previously applied |
| Pre-deploy table existence | `table_exists = f` — table absent (clean state) |

No drift. No blocker. Proceed authorized.

---

## 3. Migration Apply

**Command:** `Get-Content server/prisma/migrations/20260524000000_nc_pool_demand_line_schema/migration.sql | psql $dbUrl`

**Output (critical lines):**
```
CREATE TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX  (×9)
CREATE POLICY (×5)
GRANT         (×2)
```

**Note:** The pre-flight DO block guard raised a syntax error (CRLF line-ending in string literal on Windows). This is non-destructive — the guard's purpose is to prevent double-apply, and since the table was confirmed absent in pre-flight, its failure had no impact. All DDL executed successfully in autocommit mode.

---

## 4. Prisma Ledger Registration

```
pnpm -C server exec prisma migrate resolve --applied 20260524000000_nc_pool_demand_line_schema
```

Result: `Migration 20260524000000_nc_pool_demand_line_schema marked as applied.`

Ledger verification:
| migration_name | finished_at | rolled_back_at | applied_steps_count |
|---|---|---|---|
| 20260524000000_nc_pool_demand_line_schema | 2026-05-07 09:50:06.842509+00 | — | 0 |

`applied_steps_count: 0` is expected for `migrate resolve --applied` (manual apply path, Prisma skips step count).

---

## 5. DB Object Verification

### 5A. Table

| table_name |
|---|
| network_pool_demand_lines |

✅ Present

### 5B. Columns (27)

| # | column_name | data_type | nullable | default |
|---|---|---|---|---|
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | owner_org_id | uuid | NO | — |
| 3 | pool_id | uuid | NO | — |
| 4 | line_ref | character varying | NO | — |
| 5 | commodity_category | character varying | NO | — |
| 6 | product_category | character varying | YES | — |
| 7 | product_spec_summary | text | YES | — |
| 8 | qty | numeric | NO | — |
| 9 | qty_unit | character varying | NO | — |
| 10 | quality_requirements_json | jsonb | YES | — |
| 11 | certification_requirements_json | jsonb | YES | — |
| 12 | packaging_requirements_json | jsonb | YES | — |
| 13 | delivery_location | character varying | YES | — |
| 14 | delivery_window_start | timestamp with time zone | YES | — |
| 15 | delivery_window_end | timestamp with time zone | YES | — |
| 16 | tolerance_pct | numeric | YES | — |
| 17 | priority | integer | YES | — |
| 18 | status | character varying | NO | 'DRAFT'::character varying |
| 19 | source_type | character varying | NO | — |
| 20 | source_membership_id | uuid | YES | — |
| 21 | normalized_from_member_input | boolean | NO | false |
| 22 | revision_no | integer | NO | 1 |
| 23 | supersedes_line_id | uuid | YES | — |
| 24 | metadata_internal_json | jsonb | YES | — |
| 25 | created_at | timestamp with time zone | NO | now() |
| 26 | updated_at | timestamp with time zone | NO | now() |
| 27 | locked_at | timestamp with time zone | YES | — |

✅ All 27 columns match schema.prisma definition

### 5C. Constraints (16)

| conname | type |
|---|---|
| network_pool_demand_lines_commodity_category_nonempty_check | CHECK |
| network_pool_demand_lines_delivery_window_coherence_check | CHECK |
| network_pool_demand_lines_line_ref_nonempty_check | CHECK |
| network_pool_demand_lines_locked_at_coherence_check | CHECK |
| network_pool_demand_lines_qty_positive_check | CHECK |
| network_pool_demand_lines_qty_unit_nonempty_check | CHECK |
| network_pool_demand_lines_revision_no_positive_check | CHECK |
| network_pool_demand_lines_source_type_check | CHECK |
| network_pool_demand_lines_status_check | CHECK |
| network_pool_demand_lines_tolerance_pct_range_check | CHECK |
| network_pool_demand_lines_owner_org_id_fk | FK → organizations ON DELETE CASCADE |
| network_pool_demand_lines_pool_id_fk | FK → network_pools ON DELETE CASCADE |
| network_pool_demand_lines_source_membership_id_fk | FK → network_pool_memberships ON DELETE SET NULL |
| network_pool_demand_lines_supersedes_line_id_fk | FK → self ON DELETE SET NULL |
| network_pool_demand_lines_pkey | PK (id) |
| network_pool_demand_lines_pool_line_ref_revision_unique | UNIQUE (pool_id, line_ref, revision_no) |

✅ 10 CHECK + 4 FK + 1 PK + 1 UNIQUE = 16 total

### 5D. Indexes (11)

| indexname |
|---|
| idx_nc_pool_demand_lines_commodity_category |
| idx_nc_pool_demand_lines_owner_org_id |
| idx_nc_pool_demand_lines_pool_created |
| idx_nc_pool_demand_lines_pool_id |
| idx_nc_pool_demand_lines_qty_unit |
| idx_nc_pool_demand_lines_source_membership_id |
| idx_nc_pool_demand_lines_status |
| idx_nc_pool_demand_lines_supersedes_line_id |
| idx_nc_pool_demand_lines_updated_at |
| network_pool_demand_lines_pkey (PK) |
| network_pool_demand_lines_pool_line_ref_revision_unique (UNIQUE) |

✅ 9 btree + PK index + UNIQUE index = 11 total

### 5E. RLS

| relrowsecurity | relforcerowsecurity |
|---|---|
| t | t |

✅ ENABLE ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY both active

### 5F. RLS Policies (5)

| polname | polcmd |
|---|---|
| network_pool_demand_lines_admin_select | r (SELECT) |
| network_pool_demand_lines_no_delete | d (DELETE — USING false) |
| network_pool_demand_lines_tenant_insert | a (INSERT) |
| network_pool_demand_lines_tenant_select | r (SELECT) |
| network_pool_demand_lines_tenant_update | w (UPDATE) |

✅ All 5 policies present

### 5G. Grants

| grantee | privilege_type |
|---|---|
| texqtic_app | SELECT |
| texqtic_app | INSERT |
| texqtic_app | UPDATE |
| texqtic_admin | SELECT |

✅ texqtic_app (SELECT/INSERT/UPDATE) + texqtic_admin (SELECT)

---

## 6. Post-Deploy Compile & Test Gates

| Gate | Result |
|---|---|
| `prisma generate` | ✔ Prisma Client v6.1.0 generated |
| `tsc --noEmit` | Zero errors (no output) |
| Regression tests | **105 passed / 0 failed** |

Test files:
- `server/src/routes/tenant/pools.integration.test.ts`
- `server/src/__tests__/network-pool.service.unit.test.ts`
- `server/src/__tests__/network-pool.service.integration.test.ts`
- `server/src/__tests__/network-invoice.service.unit.test.ts`
- `server/src/__tests__/invoice.service.unit.test.ts`

---

## 7. Known Issue: Pre-flight Guard Syntax Error

The DO block pre-flight guard in the migration SQL contains a multi-line RAISE EXCEPTION string that triggers a syntax error when executed via Windows psql due to CRLF line-ending handling. This is a tooling artifact, not a schema defect:

- The guard's purpose (prevent double-apply) was met by the pre-deploy precheck (confirmed table absent)
- All CREATE TABLE / INDEX / POLICY / GRANT statements succeeded
- No data integrity impact
- Recommendation: in future migrations on this repo, avoid multi-line string literals in DO block RAISE statements, or keep them on a single line

---

## 8. Outcome

| Item | Status |
|---|---|
| Table deployed | ✅ |
| All 27 columns present | ✅ |
| All 16 constraints present | ✅ |
| All 11 indexes present | ✅ |
| RLS enabled + forced | ✅ |
| All 5 RLS policies present | ✅ |
| Grants correct | ✅ |
| Prisma ledger registered | ✅ |
| prisma generate | ✅ |
| tsc --noEmit | ✅ |
| Regression tests | ✅ 105/0 |

**TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-DEPLOY-VERIFY-001: CLOSED**

---

## 9. Commit Lineage

```
e3a80649 → ac3bc28 → a4d35aa → 0d40a7a → 10812e5a → 087b18af
  → c88d69e → 579e975 → 961a2c1 → 8878305 → 7197e23 → [this doc commit]
```

---

## 10. Next Authorized Packet

Per Decision 13 of `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001`:

> Demand-line service and owner/internal routes open after schema foundation is reviewed.

Next authorized packet: `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DESIGN-001`
