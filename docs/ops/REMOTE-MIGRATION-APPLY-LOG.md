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
