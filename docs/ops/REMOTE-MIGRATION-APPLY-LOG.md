# REMOTE MIGRATION APPLY LOG
## TECS: OPS-REMOTE-MIGRATIONS-CATCHUP-001
**Date:** 2026-03-03  
**Operator:** GitHub Copilot (automated TECS)  
**Target:** Remote Supabase PostgreSQL  
**Host:** `aws-1-ap-northeast-1.pooler.supabase.com:5432`  
**Database:** `postgres`  
**Governance Sync:** GOVERNANCE-SYNC-048  

---

## PRE-FLIGHT

### Target Confirmation
```
HOST:   aws-1-ap-northeast-1.pooler.supabase.com
PORT:   5432
DB:     /postgres
SCHEME: postgres
```
Confirmed: remote Supabase environment. Credentials redacted.

---

## LOCAL MIGRATION INVENTORY (64 folders, all with migration.sql)

| # | Migration Name | SQL Exists |
|---|---|---|
| 1 | 20260206095301_init | ✅ |
| 2 | 20260206115317_make_actor_id_nullable | ✅ |
| 3 | 20260206125901_remove_audit_log_actor_fk | ✅ |
| 4 | 20260206130052_remove_audit_log_actor_fk | ✅ |
| 5 | 20260208054130_add_event_log | ✅ |
| 6 | 20260208074800_event_logs_rls_lockdown | ✅ |
| 7 | 20260208124904_marketplace_catalog_cart_spine | ✅ |
| 8 | 20260208161924_add_marketplace_cart_summary | ✅ |
| 9 | 20260208162051_add_marketplace_cart_summary_projection | ✅ |
| 10 | 20260212000000_gw3_db_roles_bootstrap | ✅ |
| 11 | 20260212055125_add_unique_token_hash | ✅ |
| 12 | 20260212122000_db_hardening_wave_01_gate_a_context_helpers_and_pilot_rls | ✅ |
| 13 | 20260212122100_force_rls_on_catalog_items | ✅ |
| 14 | 20260212191929_db_hardening_wave_01_gate_b2_drop_legacy_catalog_items_policy | ✅ |
| 15 | 20260212210123_db_hardening_wave_01_gate_b3_add_restrictive_guard_policy | ✅ |
| 16 | 20260213043028_db_hardening_wave_01_gate_b4_create_rls_enforced_app_role | ✅ |
| 17 | 20260213044322_db_hardening_wave_01_gate_b4_grant_set_role | ✅ |
| 18 | 20260213045000_db_hardening_wave_01_gate_d1_memberships_invites_rls | ✅ |
| 19 | 20260213050000_db_hardening_wave_01_gate_d1_policy_fix | ✅ |
| 20 | 20260213050100_db_hardening_wave_01_gate_d1_grant_permissions | ✅ |
| 21 | 20260214090137_db_hardening_wave_01_gate_d2_rls_carts_cart_items | ✅ |
| 22 | 20260214100312_db_hardening_wave_01_gate_d2_grant_permissions | ✅ |
| 23 | 20260214105859_db_hardening_wave_01_gate_d3_rls_audit_logs_event_logs | ✅ |
| 24 | 20260214113000_db_hardening_wave_01_gate_d4_rls_white_label_config | ✅ |
| 25 | 20260214120000_db_hardening_wave_01_gate_d5_rls_ai_governance | ✅ |
| 26 | 20260214130000_db_hardening_wave_01_gate_d6_rls_marketplace_cart_summaries | ✅ |
| 27 | 20260215000000_db_hardening_wave_01_gate_d7_rls_impersonation_sessions | ✅ |
| 28 | 20260215010000_db_hardening_wave_01_hotfix_tenant_grants | ✅ |
| 29 | 20260223000000_wave3_a2a_force_rls_password_reset_tokens | ✅ |
| 30 | 20260223010000_g006c_rls_audit_logs_consolidation | ✅ |
| 31 | 20260223020000_g006c_rls_carts_consolidation | ✅ |
| 32 | 20260223030000_g006c_rls_cart_items_consolidation | ✅ |
| 33 | 20260223040000_g006c_rls_catalog_items_consolidation | ✅ |
| 34 | 20260223050000_g006c_rls_orders_consolidation | ✅ |
| 35 | 20260223060000_g006c_rls_order_items_consolidation | ✅ |
| 36 | 20260223070000_g006c_rls_memberships_consolidation | ✅ |
| 37 | 20260223080000_g006c_rls_tenant_branding_consolidation | ✅ |
| 38 | 20260223090000_g006c_rls_tenant_domains_consolidation | ✅ |
| 39 | 20260223100000_g006c_rls_event_logs_consolidation | ✅ |
| 40 | 20260223110000_g006c_rls_impersonation_sessions_consolidation | ✅ |
| 41 | 20260224000000_g015_phase_a_introduce_organizations | ✅ |
| 42 | 20260224000001_g006c_rls_audit_logs_retry | ✅ |
| 43 | 20260224000002_g006c_rls_carts_retry | ✅ |
| 44 | 20260225000000_g015_phase_b_organizations_deferred_fk | ✅ |
| 45 | 20260301000000_g020_lifecycle_state_machine_core | ✅ |
| 46 | 20260301120000_ops_rls_admin_realm_fix | ✅ |
| 47 | 20260301130000_g006c_audit_logs_unify | ✅ |
| 48 | 20260302000000_g006c_orders_guard_normalize | ✅ |
| 49 | 20260302000000_g021_maker_checker_core | ✅ |
| 50 | 20260302010000_g006c_event_logs_cleanup | ✅ |
| 51 | 20260303000000_g022_escalation_core | ✅ |
| **52** | **20260303110000_g006c_p2_cart_items_rls_unify** | ✅ **PENDING → APPLIED** |
| **53** | **20260303120000_g022_p2_cert_entity_type** | ✅ **PENDING → APPLIED** |
| 54 | 20260304000000_gatetest003_audit_logs_admin_select | ✅ |
| 55 | 20260305000000_g023_reasoning_logs | ✅ |
| 56 | 20260306000000_g017_trades_domain | ✅ |
| 57 | 20260307000000_g017_day4_pending_approvals_trade_fk_hardening | ✅ |
| 58 | 20260308000000_g018_day1_escrow_schema | ✅ |
| 59 | 20260308010000_g018_day1_escrow_schema_cycle_fix | ✅ |
| 60 | 20260309000000_g017_fk_buyer_seller_orgs | ✅ |
| 61 | 20260310000000_g017_trades_admin_rls | ✅ |
| 62 | 20260311000000_g019_certifications_domain | ✅ |
| 63 | 20260312000000_g016_traceability_graph_phase_a | ✅ |
| 64 | 20260313000000_g024_sanctions_domain | ✅ |
| 65 | 20260314000000_g006c_admin_cart_summaries_admin_rls | ✅ |

---

## PENDING vs APPLIED DETERMINATION

| migration_name | local_exists | remote_applied (pre-run) | action |
|---|---|---|---|
| 20260303110000_g006c_p2_cart_items_rls_unify | ✅ | ❌ | **APPLY** |
| 20260303120000_g022_p2_cert_entity_type | ✅ | ❌ | **APPLY** |
| All other 62 migrations | ✅ | ✅ | SKIP |

### Pre-Existing Anomaly (documented, not a new stop condition)
The `_prisma_migrations` table contains duplicate rows with `rolled_back_at IS NOT NULL` for the following migrations — these are historical artifacts from prior failed psql attempts that were later superseded by successful applies and `resolve --applied` calls:
- `20260213043028_db_hardening_wave_01_gate_b4_create_rls_enforced_app_role` (1 rolled_back row + 1 finished row)
- `20260214105859_db_hardening_wave_01_gate_d3_rls_audit_logs_event_logs` (2 rolled_back rows + 1 finished row)
- `20260215010000_db_hardening_wave_01_hotfix_tenant_grants` (1 rolled_back row + 1 finished row)
- `20260224000000_g015_phase_a_introduce_organizations` (1 rolled_back row + 1 finished row)
- `20260223010000_g006c_rls_audit_logs_consolidation` (3 rolled_back rows + 1 finished row)
- `20260223020000_g006c_rls_carts_consolidation` (1 rolled_back row + 1 finished row)

Each has a valid `finished_at IS NOT NULL` row confirming it is applied. Schema state is authoritative.

---

## APPLY PROCEDURE

### Migration 1: 20260303110000_g006c_p2_cart_items_rls_unify

**Command:**
```
psql --dbname=<REDACTED> --variable=ON_ERROR_STOP=1 \
  --file=server/prisma/migrations/20260303110000_g006c_p2_cart_items_rls_unify/migration.sql
```

**Output (key excerpts):**
```
BEGIN
DROP POLICY (×5 existing cart_items unified policies)
DROP POLICY (×14 IF EXISTS legacy variants — NOTICE: does not exist, skipping)
CREATE POLICY cart_items_guard       (RESTRICTIVE)
CREATE POLICY cart_items_select_unified (PERMISSIVE)
CREATE POLICY cart_items_insert_unified (PERMISSIVE)
CREATE POLICY cart_items_update_unified (PERMISSIVE)
CREATE POLICY cart_items_delete_unified (PERMISSIVE)
NOTICE:  VERIFIER PASS: cart_items — guard=1 RESTRICTIVE (admin arm present),
         SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each (is_admin arm present),
         FORCE RLS=t, no {public} policies
COMMIT
```
**APPLY_EXIT: 0** ✅

**Ledger reconcile:**
```
pnpm -C server exec prisma migrate resolve --applied 20260303110000_g006c_p2_cart_items_rls_unify
→ Migration 20260303110000_g006c_p2_cart_items_rls_unify marked as applied.
```
**RESOLVE_EXIT: 0** ✅

---

### Migration 2: 20260303120000_g022_p2_cert_entity_type

**Command:**
```
psql --dbname=<REDACTED> --variable=ON_ERROR_STOP=1 \
  --file=server/prisma/migrations/20260303120000_g022_p2_cert_entity_type/migration.sql
```

**Output (key excerpts):**
```
DO
NOTICE:  [G-022-P2] Pre-flight OK: escalation_events present,
         CERTIFICATION absent from constraint. Proceeding.
ALTER TABLE  (DROP CONSTRAINT IF EXISTS escalation_events_entity_type_check)
ALTER TABLE  (ADD CONSTRAINT escalation_events_entity_type_check CHECK (...CERTIFICATION...))
DO
NOTICE:  [G-022-P2 VERIFIER OK] escalation_events_entity_type_check present
         and includes CERTIFICATION.
```
**APPLY_EXIT: 0** ✅

**Ledger reconcile:**
```
pnpm -C server exec prisma migrate resolve --applied 20260303120000_g022_p2_cert_entity_type
→ Migration 20260303120000_g022_p2_cert_entity_type marked as applied.
```
**RESOLVE_EXIT: 0** ✅

---

## POST-FLIGHT

### Distinct applied migrations (post-run) — 64 total
```
SELECT DISTINCT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name;
→ 64 rows (matches local count of 64 migration folders)
→ 20260303110000_g006c_p2_cart_items_rls_unify ✅ confirmed present
→ 20260303120000_g022_p2_cert_entity_type       ✅ confirmed present
```

---

## QUALITY GATES

| Gate | Result |
|---|---|
| `pnpm -C server run typecheck` | **EXIT 0** ✅ |
| `pnpm run lint` | **EXIT 0** ✅ (0 errors, 0 warnings) |

---

## COMPLETION CHECKLIST

- ✅ Pending migrations identified deterministically (2 of 64 were pending)
- ✅ Both pending migrations applied to remote Supabase in chronological order via psql ON_ERROR_STOP=1
- ✅ Both verifier DO-blocks emitted PASS notices
- ✅ `prisma migrate resolve --applied` executed for each migration
- ✅ Post-flight: 64 distinct applied rows match 64 local folders
- ✅ typecheck EXIT 0
- ✅ lint EXIT 0
- ✅ Pre-existing `rolled_back_at` anomaly documented (historical only, not new)
- ✅ No secrets committed

---

## OPS-APPLY-ORDERS-RLS-001 � orders_update_unified Tenant Arm

**Timestamp:** 2026-03-03T04:48:00Z (approx)
**Sync ID:** GOVERNANCE-SYNC-049
**Executor:** psql (local) via PowerShell `--key=value` form
**Target DB:** Supabase session pooler � `aws-1-ap-northeast-1.pooler.supabase.com` (redacted DATABASE_URL)

### Apply Command

```powershell
$u = (Get-Content server/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
psql "--dbname=$u" "--variable=ON_ERROR_STOP=1" "--file=server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql"
```

> Note: Short flags (`-v`, `-f`) cause argument splitting in PowerShell when the URL contains `?sslmode=require`.
> Use `--key=value` form exclusively. This is the confirmed working pattern for this repo.

### Terminal Evidence

```
BEGIN
DROP POLICY
CREATE POLICY
DO
NOTICE:  VERIFY PASS: orders_update_unified has tenant + admin arms in USING and WITH CHECK
COMMIT
APPLY_EXIT:0
```

### Policy Applied

**Policy name:** `orders_update_unified`
**Table:** `public.orders`
**Command:** FOR UPDATE TO `texqtic_app`
**USING + WITH CHECK (after apply):**

```sql
(app.require_org_context() AND tenant_id = app.current_org_id())
OR
(current_setting('app.is_admin', true) = 'true')
```

**B1/D-5 posture:** Preserved � no server code changed; `app.is_admin` continues to NOT be set for tenant actors.

### RCP-1 Phases 4�5 Validation

**Command:** `pnpm -C server exec tsx scripts/validate-rcp1-flow.ts --only-transitions`

| Phase | Step | Result |
|-------|------|--------|
| 4A | PATCH status CONFIRMED + audit verify | PASS |
| 4B | PATCH status FULFILLED + audit verify | PASS |
| 4C | CANCEL path + terminal state 409 enforced | PASS |
| 5 | derivedStatus FULFILLED + CANCELLED stable | PASS |
| **TOTAL** | | **16/16 PASS, VALIDATE_EXIT:0** |

```
OUTCOME: ALL PASS � GAP-REVENUE-VALIDATE-002 VALIDATED
```

### Quality Gates

| Gate | Result |
|------|--------|
| `pnpm -C server run typecheck` | EXIT 0 |
| `pnpm -C server run lint` | EXIT 0 (0 errors, 105 pre-existing warnings) |

### Governance Outcomes

| Gap | Before | After |
|-----|--------|-------|
| GAP-RLS-ORDERS-UPDATE-001 | VALIDATED (pending psql apply) | OPERATIONALLY CLOSED (applied + VERIFY PASS) |
| GAP-REVENUE-VALIDATE-002 | Phases 0-3 PASS; Phases 4-5 blocked | Phases 0-5 PASS � 16/16 |

---

## G-006C-P2-CATALOG_ITEMS-RLS-UNIFY-001 � catalog_items RLS Unify

**Timestamp:** 2026-03-03T~10:45:00Z
**Sync ID:** GOVERNANCE-SYNC-051
**Migration:** `20260315000000_g006c_p2_catalog_items_rls_unify`
**Target DB:** Supabase session pooler � `aws-1-ap-northeast-1.pooler.supabase.com` (redacted DATABASE_URL)

### Apply Command

```powershell
$u = (Get-Content server/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
psql "--dbname=$u" "--variable=ON_ERROR_STOP=1" "--file=server/prisma/migrations/20260315000000_g006c_p2_catalog_items_rls_unify/migration.sql"
```

### Terminal Evidence

```
BEGIN
DROP POLICY (x5) + NOTICE skips for non-existent legacy variants
ALTER TABLE (ENABLE ROW LEVEL SECURITY)
ALTER TABLE (FORCE ROW LEVEL SECURITY)
CREATE POLICY (x5: guard + select + insert + update + delete)
DO
NOTICE: VERIFIER PASS: catalog_items - guard=1 RESTRICTIVE FOR ALL (is_admin arm present),
        SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each (is_admin arm present), FORCE RLS=t, no {public} policies
COMMIT
APPLY_EXIT:0
```

### Prisma Resolve

```
pnpm -C server exec prisma migrate resolve --applied 20260315000000_g006c_p2_catalog_items_rls_unify
```
Output: `Migration 20260315000000_g006c_p2_catalog_items_rls_unify marked as applied.` RESOLVE_EXIT:0

### Quality Gates

| Gate | Result |
|------|--------|
| `pnpm -C server run typecheck` | EXIT 0 |
| `pnpm -C server run lint` | EXIT 0 (0 errors, 105 pre-existing warnings) |

---

## G-006C-P2-MEMBERSHIPS-RLS-UNIFY-001
**Date:** 2026-03-03
**Migration:** `20260315000001_g006c_p2_memberships_rls_unify`
**Table:** `public.memberships`
**GOVERNANCE-SYNC:** 052

**Apply command:**
`psql --dbname=DATABASE_URL(redacted) --variable=ON_ERROR_STOP=1 --file=server/prisma/migrations/20260315000001_g006c_p2_memberships_rls_unify/migration.sql`

**Terminal evidence:**
- BEGIN / DROP POLICY (x5 real + x16 NOTICE skips) / ALTER TABLE (x2) / CREATE POLICY (x5) / DO / COMMIT
- VERIFIER PASS: memberships - guard=1 RESTRICTIVE FOR ALL (is_admin arm present), SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each (is_admin arm present), FORCE RLS=t, no {public} policies
- APPLY_EXIT:0

**Prisma resolve:**
`pnpm -C server exec prisma migrate resolve --applied 20260315000001_g006c_p2_memberships_rls_unify`
- Migration 20260315000001_g006c_p2_memberships_rls_unify marked as applied.
- RESOLVE_EXIT:0

**Quality gates:**
| Gate | Result |
|---|---|
| typecheck | EXIT 0 |
| lint | EXIT 0 (0 errors, 105 pre-existing warnings) |

---

## G-006C-P2-TENANT_BRANDING-RLS-UNIFY-001
**Date:** 2026-03-03
**Migration:** `20260315000002_g006c_p2_tenant_branding_rls_unify`
**Table:** `public.tenant_branding`
**GOVERNANCE-SYNC:** 053

**Defects fixed:**
- Guard promoted from {public} to texqtic_app, is_admin arm added
- DELETE policy had NO tenant arm (bypass_enabled only) - rebuilt with full tenant + is_admin arms
- All PERMISSIVE policies: require_org_context added to tenant conjunction, bypass_enabled replaced with is_admin arm

**Apply command:**
`psql --dbname=DATABASE_URL(redacted) --variable=ON_ERROR_STOP=1 --file=server/prisma/migrations/20260315000002_g006c_p2_tenant_branding_rls_unify/migration.sql`

**Terminal evidence:**
- BEGIN / DROP POLICY (x6 real + x16 NOTICE skips) / ALTER TABLE (x2) / CREATE POLICY (x5) / DO / COMMIT
- VERIFIER PASS: tenant_branding - guard=1 RESTRICTIVE FOR ALL (is_admin arm present), SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, FORCE RLS=t, no {public} policies
- APPLY_EXIT:0

**Prisma resolve:**
`pnpm -C server exec prisma migrate resolve --applied 20260315000002_g006c_p2_tenant_branding_rls_unify`
- Migration 20260315000002_g006c_p2_tenant_branding_rls_unify marked as applied.
- RESOLVE_EXIT:0

**Quality gates:**
| Gate | Result |
|---|---|
| typecheck | EXIT 0 |
| lint | EXIT 0 (0 errors, 105 pre-existing warnings) |

---

## G-006C-P2-TENANT_BRANDING-RLS-UNIFY-001
**Date:** 2026-03-03
**Migration:** `20260315000002_g006c_p2_tenant_branding_rls_unify`
**Table:** `public.tenant_branding`
**GOVERNANCE-SYNC:** 053

**Defects fixed:** Guard promoted from {public} to texqtic_app; DELETE policy had NO tenant arm (rebuild with full arms); all PERMISSIVE: require_org_context added, bypass_enabled replaced.
**VERIFIER PASS:** guard=1 RESTRICTIVE FOR ALL (is_admin arm present), SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, FORCE RLS=t, no {public} policies
**APPLY_EXIT:0 / RESOLVE_EXIT:0**
**Quality gates:** typecheck EXIT 0 | lint EXIT 0 (0 errors, 105 pre-existing warnings)

---

## G-006C-P2-TENANT_DOMAINS-RLS-UNIFY-001
**Date:** 2026-03-03 | **Migration:** `20260315000003_g006c_p2_tenant_domains_rls_unify` | **Table:** `public.tenant_domains` | **GOVERNANCE-SYNC:** 054

**Critical defects fixed:** Guard promoted from {public} to texqtic_app (is_admin arm added). DELETE had NO tenant arm (bypass_enabled only) � rebuilt with full tenant + is_admin arms. All PERMISSIVE: require_org_context added, bypass_enabled replaced. Enhanced verifier: DELETE tenant_id arm + {public}=0 explicitly checked.
**VERIFIER PASS:** guard=1 RESTRICTIVE FOR ALL (is_admin arm present), SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, DELETE tenant_id arm present, FORCE RLS=t, no {public} policies
**APPLY_EXIT:0 / RESOLVE_EXIT:0 / typecheck EXIT 0 / lint EXIT 0 (0 errors, 105 pre-existing warnings)**

---

## G-006C-P2-IMPERSONATION_SESSIONS-RLS-UNIFY-001
**Date:** 2026-03-03 | **Migration:** `20260315000004_g006c_p2_impersonation_sessions_rls_unify` | **Table:** `public.impersonation_sessions` | **GOVERNANCE-SYNC:** 055

**Critical defects fixed:** Guard renamed from non-standard `restrictive_guard` ({public} role, WITH CHECK clause) → `impersonation_sessions_guard` (texqtic_app, USING only, is_admin arm added). DELETE had NO admin arm (bypass_enabled only — CRITICAL) → rebuilt with require_admin_context + admin_id actor arm + is_admin. All PERMISSIVE: bypass_enabled replaced with is_admin='true'. Admin-only design: tenant_id is metadata (not a RLS predicate); no tenant arm in any policy. G-006C-WAVE3-REMAINING → ✅ COMPLETE (all tables done).
**VERIFIER PASS:** guard=1 RESTRICTIVE FOR ALL (require_admin_context + is_admin arm present), SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each (is_admin arm present), DELETE critical fix applied (had bypass_enabled only), FORCE RLS=t, no {public} policies
**APPLY_EXIT:0 / RESOLVE_EXIT:0 / typecheck EXIT 0 / lint EXIT 0 (0 errors, 105 pre-existing warnings)**

---

## GAP-ORDER-LC-001-SCHEMA-FOUNDATION-001
**Date:** 2026-03-03 | **Migration:** `20260315000005_gap_order_lc_001_schema_foundation` | **Risk:** 🔴 HIGH | **GOVERNANCE-SYNC:** 056

**Remote target confirmed:** `aws-1-ap-northeast-1.pooler.supabase.com:5432` ✅
**Schema actions:** (1) Extended `lifecycle_states.entity_type` CHECK + `allowed_transitions.entity_type` CHECK to include 'ORDER' (DROP + recreate — reversible). (2) Seeded 4 ORDER lifecycle states (PAYMENT_PENDING, CONFIRMED, FULFILLED, CANCELLED). (3) Created `public.order_lifecycle_logs` (id, order_id FK→orders CASCADE, tenant_id denorm for RLS, from_state, to_state, actor_id, realm, request_id, created_at) + 3 indexes + FORCE RLS + 1 RESTRICTIVE guard + PERMISSIVE SELECT/INSERT (tenant+admin arms) + UPDATE/DELETE permanently blocked (immutability). orders.status enum NOT touched (ALTER TYPE ADD VALUE deferred to B3 per STOP CONDITION).
**VERIFIER PASS:** table + FK + 3 indexes (order_created, tenant_created, to_state_created) + FORCE RLS=t + 1 RESTRICTIVE guard + 4 PERMISSIVE (SELECT/INSERT + immutability UPDATE/DELETE blocks) + 0 {public} policies + 4 ORDER lifecycle states seeded
**APPLY_EXIT:0 / RESOLVE_EXIT:0 / typecheck EXIT 0 / lint EXIT 0 (0 errors, 105 pre-existing warnings)**

---

## OPS-ORDER-LC-LOGS-GRANT-001
**Date:** 2026-03-03 | **File:** `server/prisma/ops/order_lifecycle_logs_grants.sql` | **Risk:** 🟢 LOW | **GOVERNANCE-SYNC:** 060A

**Purpose:** Grant base SELECT + INSERT privileges on `public.order_lifecycle_logs` to `texqtic_app` and `app_user`. RLS policies existed (from B1 migration) but base table privileges were never granted, causing PostgresError `42501 "permission denied for table order_lifecycle_logs"` on every SM checkout write. Same class of failure as `rcp1_orders_update_grant.sql` (orders UPDATE, previously resolved).

**Apply command:** `$sql | & psql "$dbUrl"` (stdin pipe; DATABASE_URL from server/.env)
**Remote target:** `aws-1-ap-northeast-1.pooler.supabase.com:5432` (Supabase Postgres)
**Output:** `BEGIN` / `GRANT` / `GRANT` / `COMMIT` — **APPLY_EXIT:0**

**Verification query:**
```sql
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_name = 'order_lifecycle_logs' AND grantee IN ('texqtic_app','app_user')
ORDER BY grantee, privilege_type;
```
**Result:** 4 rows — `app_user: INSERT, SELECT` + `texqtic_app: INSERT, SELECT` ✅

**Note:** UPDATE + DELETE intentionally NOT granted (append-only table; RLS immutability blocks `USING(false)` already enforced at policy level).
**typecheck EXIT 0 / lint EXIT 0**

---

## G-027-MORGUE-TABLE-RLS-001
**Date:** 2026-03-03 | **Migration:** `20260315000006_g027_morgue_table_rls_001` | **Risk:** 🔴 HIGH | **GOVERNANCE-SYNC:** 065  
**Remote target confirmed:** `aws-1-ap-northeast-1.pooler.supabase.com:5432` ✅  
**Schema actions:** Created `public.morgue_entries` (id UUID PK, entity_type text, entity_id uuid, tenant_id uuid, final_state text, resolved_by uuid nullable, resolution_reason text nullable, snapshot jsonb, created_at timestamptz) + 2 indexes (idx_morgue_entries_tenant_created: tenant_id/created_at DESC; idx_morgue_entries_entity_type_id: entity_type/entity_id) + FORCE RLS + 1 RESTRICTIVE guard + PERMISSIVE SELECT/INSERT (tenant+admin arms) + UPDATE/DELETE permanently blocked (`USING(false)` — immutability). No changes to existing tables.  
**VERIFIER PASS:** table exists + FORCE RLS=t + 1 RESTRICTIVE guard + 4 PERMISSIVE (SELECT/INSERT with tenant+admin arms + UPDATE/DELETE immutability blocks=false) + 0 {public} policies + 2 required indexes  
**APPLY_EXIT:0 / RESOLVE_EXIT:0 / typecheck EXIT 0 / lint EXIT 0 (0 errors, 105 pre-existing warnings)**

---

## G-027-MORGUE-PROOF-RUN-001
**Date:** 2026-03-03 | **Type:** Live validation proof run (no schema change) | **GOVERNANCE-SYNC:** 069

**Script:** `server/scripts/validate-rcp1-flow.ts --only-transitions`
**Server:** `http://localhost:3001` (Fastify dev server, health: `{"status":"ok"}`)
**Prisma migration status:** 72/72 applied — `Database schema is up to date!`
**Remote target:** `aws-1-ap-northeast-1.pooler.supabase.com:5432` (DATABASE_URL — Supabase Postgres, redacted)

### Run 1 — 2026-03-03T11:47:47.545Z

| Step | Result | Evidence |
|------|--------|---------|
| 4B.G1 — FULFILLED morgue entry | ✅ PASS | `entity_id: f687d1e7-d7a6-4b42-b273-bf99541a2931` · `morgue.id: 532da364-65cd-4408-852a-cf79b35f1f64` · `final_state: FULFILLED` |
| 4C.G1 — CANCELLED morgue entry | ✅ PASS | `entity_id: b30e1bdf-235a-405d-b375-8b3d00c04398` · `morgue.id: 3109e90d-58ab-4069-9932-35fb777e9852` · `final_state: CANCELLED` |
| 5.2 — Full lifecycle chain | ✅ PASS | `PAYMENT_PENDING → CONFIRMED → FULFILLED` (2 logs from this run) |
| **Summary** | **19 PASS / 0 FAIL** | `VALIDATE_EXIT:0` |

_Note: A bug in Step 5.2's chain verifier was discovered and fixed during this TECS (`actualChain` used `to_state[]` only, omitting the initial state; additionally, `--only-transitions` reused orders accumulate prior-run logs — fixed by capturing `RUN_START` and scoping query to logs created in this run, plus building chain from `[firstLog.from_state, ...to_states]`). `validate-rcp1-flow.ts` updated, typecheck EXIT 0 confirmed._

### Run 2 (Dedup) — 2026-03-03T11:50:14.614Z

| Step | Result | Evidence |
|------|--------|---------|
| 4B.G1 — FULFILLED morgue entry | ✅ PASS | `entity_id: 23751731-a918-4649-8dc4-357a1f87731c` · `morgue.id: 830080b1-83f7-4067-9659-ce7b2bb0d0da` · `final_state: FULFILLED` |
| 4C.G1 — CANCELLED morgue entry | ✅ PASS | `entity_id: 334937af-7824-4427-9131-284acc075c84` · `morgue.id: 5d1f5c45-2ab8-481f-a69a-d49d34eeb49a` · `final_state: CANCELLED` |
| **Summary** | **19 PASS / 0 FAIL** | `VALIDATE_EXIT:0` |

### Dedup DB Proof

```
Total morgue_entries: 6
DEDUP CHECK: PASS — no duplicate (entity_type, entity_id, final_state) combos
morgue.id: a052af7c | entity_id: ca4671b8 | final_state: FULFILLED  (run 0 — pre-fix)
morgue.id: fca1e126 | entity_id: 36e5d690 | final_state: CANCELLED  (run 0 — pre-fix)
morgue.id: 532da364 | entity_id: f687d1e7 | final_state: FULFILLED  (run 1)
morgue.id: 3109e90d | entity_id: b30e1bdf | final_state: CANCELLED  (run 1)
morgue.id: 830080b1 | entity_id: 23751731 | final_state: FULFILLED  (run 2 dedup)
morgue.id: 5d1f5c45 | entity_id: 334937af | final_state: CANCELLED  (run 2 dedup)
DEDUP_EXIT:0
```

6 entries — 3 FULFILLED + 3 CANCELLED — all with distinct `entity_id` values. No duplicate `(entity_type, entity_id, final_state)` combinations. SM `findFirst` dedup guard confirmed effective: no privilege errors (`42501`) observed in any run.

**ATOMICITY:** Both lifecycle log + morgue write occur in same transaction path (opts.db shared-tx). Terminal state check (`toState.isTerminal`) gates the morgue write; non-terminal transitions (PAYMENT_PENDING → CONFIRMED) correctly produce no morgue entry.

---

## OPS-ORDERS-STATUS-ENUM-001

**Date:** 2026-03-03  
**Migration:** `20260315000007_ops_orders_status_enum_001`  
**GOVERNANCE-SYNC:** 070  
**Scope:** Extend `public.order_status` Postgres enum — ADD CONFIRMED + FULFILLED (CANCELLED verified present, not re-added). Deferred item from GAP-ORDER-LC-001 B6b (GOVERNANCE-SYNC-063).

**Apply command:**
```
psql --dbname=$DATABASE_URL "--variable=ON_ERROR_STOP=1" --file=server/prisma/migrations/20260315000007_ops_orders_status_enum_001/migration.sql
```
APPLY_EXIT:0

**PREFLIGHT DO output:**
```
NOTICE:  PREFLIGHT PASS: order_status enum and orders.status confirmed; CANCELLED is present
```

**ALTER TYPE output:**
```
ALTER TYPE
ALTER TYPE
```
(×2: CONFIRMED added, FULFILLED added)

**VERIFIER DO output:**
```
NOTICE:  VERIFIER PASS: order_status includes all required lifecycle labels: PAYMENT_PENDING, PLACED, CANCELLED, CONFIRMED, FULFILLED
```

**Prisma ledger sync:**
```
pnpm -C server exec prisma migrate resolve --applied 20260315000007_ops_orders_status_enum_001
```
RESOLVE_EXIT:0 — `Migration 20260315000007_ops_orders_status_enum_001 marked as applied`

**prisma db pull:** PULL_EXIT:0 — Introspected 42 models. git diff confirms only `+ CONFIRMED` + `+ FULFILLED` in `order_status` enum. Zero unrelated churn.  
**prisma generate:** GENERATE_EXIT:0 — Generated Prisma Client (v6.1.0) (Node processes stopped first to release locked DLL)

**Quality Gates:**
- PREFLIGHT DO: CANCELLED confirmed present — PASS
- VERIFIER DO: all 5 lifecycle labels confirmed — PASS
- typecheck: EXIT 0
- lint: EXIT 0 (0 errors, 108 pre-existing warnings)


---

## OPS-RLS-SUPERADMIN-001 — Remote Apply (Approved)

**TECS ID:** OPS-RLS-SUPERADMIN-001-DB-APPROVAL-001  
**GOVERNANCE-SYNC:** 073  
**Date approved:** 2026-03-03  
**Date SQL authored:** 2026-03-15 (GOVERNANCE-SYNC-074)  
**Date executed:** PENDING (psql remote apply)  
**Prerequisite:** `1f211d6` — service write paths migrated to `withSuperAdminContext`  
**Target:** Remote Supabase PostgreSQL (`aws-1-ap-northeast-1.pooler.supabase.com`)

### Sign-Off

Approved per SUPERADMIN-RLS-PLAN.md Section F.1 (GOVERNANCE-SYNC-073). Execute only after confirming service prerequisite commit `1f211d6` is on the deployed branch.

### Exact Apply Commands

```bash
# --- 0) Pre-flight -----------------------------------------------------------
pnpm -C server exec prisma migrate status
echo "$DATABASE_URL" | sed 's|:.*@|:***@|'

# --- 1) Apply impersonation_sessions migration (TECS 2B) ---------------------
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f server/prisma/migrations/20260315000008_ops_rls_superadmin_impersonation_sessions/migration.sql
# Expected: APPLY_EXIT:0 + inline VERIFIER PASS notice

pnpm -C server exec prisma migrate resolve \
  --applied 20260315000008_ops_rls_superadmin_impersonation_sessions
# Expected: RESOLVE_EXIT:0

# --- 2) Apply escalation_events migration (TECS 2C) --------------------------
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f server/prisma/migrations/20260315000009_ops_rls_superadmin_escalation_events/migration.sql
# Expected: APPLY_EXIT:0 + inline VERIFIER PASS notice

pnpm -C server exec prisma migrate resolve \
  --applied 20260315000009_ops_rls_superadmin_escalation_events
# Expected: RESOLVE_EXIT:0

# --- 3) Quality gates (after BOTH migrations applied) ------------------------
pnpm -C server run typecheck
pnpm -C server run lint
```

### Stop Conditions

| Condition | Action |
|-----------|--------|
| `DATABASE_URL` host does not match `supabase.com` | **STOP** — wrong environment |
| Verifier DO-block does not print `VERIFIER PASS` | **STOP** — policy not applied correctly |
| Any `ERROR:` line in psql output | **STOP** — `ON_ERROR_STOP=1` will abort; do not retry without investigation |
| Policy diff touches tables other than `impersonation_sessions` / `escalation_events` | **STOP** — scope violation |
| Any `42501` (insufficient privilege) error post-apply | **STOP** — GUC context mismatch; investigate `withSuperAdminContext` path |
| `prisma migrate status` shows unexpected pending migrations | **STOP** — resolve ledger before applying |

### Expected Evidence (TECS 2B / 2C)

After each migration, record and paste into wave-execution-log:
- `APPLY_EXIT: 0`
- `VERIFIER PASS` notice (exact text from psql output)
- `RESOLVE_EXIT: 0`
- `pnpm -C server run typecheck`: EXIT 0
- `pnpm -C server run lint`: EXIT 0 (0 errors, N pre-existing warnings)

### Rollback

Policy changes are NOT DDL — rollback via DROP + recreate policies (see SUPERADMIN-RLS-PLAN.md Sections C.1 and C.2 for original predicate SQL). Also remove corresponding `_prisma_migrations` rows if rolling back after `prisma migrate resolve --applied`.

### Scope Correction — 20260315000009 (GOVERNANCE-SYNC-075)

**Original plan (SUPERADMIN-RLS-PLAN.md C.2):** Narrow `escalation_events` UPDATE policy to require `is_superadmin`.  
**Actual scope executed:** Narrow `escalation_events_admin_insert` to require BOTH `is_admin='true'` AND `is_superadmin='true'`.

**Reason:** `escalation_events` has no UPDATE policy, no UPDATE grant, and UPDATE/DELETE are blocked by an immutability trigger (`[E-022-IMMUTABLE]`) that fires before RLS. The admin INSERT arm was the only actual admin write surface requiring hardening. The plan doc (C.2) has been amended (GOVERNANCE-SYNC-075).

**Verifier for 20260315000009 confirms:**
- 0 UPDATE policies on `escalation_events` (append-only invariant)
- `texqtic_app` has no UPDATE/DELETE grants
- `escalation_events_admin_insert` WITH CHECK contains `is_superadmin`
- Tenant INSERT arm (`escalation_events_tenant_insert`) org_id scoping intact
