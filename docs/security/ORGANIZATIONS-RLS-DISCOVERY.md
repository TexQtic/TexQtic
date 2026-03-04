# Organizations RLS Discovery

**TECS ID:** G-025-ORGS-RLS-DISCOVERY-001  
**Gap:** G-025-ORGS-RLS-001  
**Status:** ✅ Discovery Complete — Awaiting TECS 5B (Policy Implementation)  
**Date:** 2026-03-04  
**Governance Sync:** GOVERNANCE-SYNC-084  
**Predecessor:** G-025 DPP v1 (GOVERNANCE-SYNC-083) — D4 Gate FAIL registered  
**Author:** GitHub Copilot — discovery only; no schema/code/RLS changes

---

## 1. Purpose

This document records the result of auditing `public.organizations` RLS posture, identifying
why manufacturer fields cannot be served from SECURITY INVOKER DPP views, and proposing the
minimal safe policy change required to enable tenant-scoped read of an org's own row.

**Scope:** Docs + governance only (no migrations, no code changes, no SQL executed).

---

## 2. DB Evidence — Captured Outputs

### 2.1 RLS Flags

Query:
```sql
SELECT relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'organizations'
  AND relnamespace = 'public'::regnamespace;
```

Output:
```
 relrowsecurity | relforcerowsecurity
----------------+---------------------
 t              | t
```

**Interpretation:** RLS is ENABLED (`relrowsecurity = t`) and FORCED (`relforcerowsecurity = t`).
Every query by `texqtic_app` goes through the policy stack regardless of table owner.

---

### 2.2 Column List

Query: `information_schema.columns WHERE table_name = 'organizations'`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NOT NULL | — |
| `slug` | varchar | NOT NULL | — |
| `legal_name` | varchar | NOT NULL | — |
| `jurisdiction` | varchar | NOT NULL | `'UNKNOWN'` |
| `registration_no` | varchar | NULL | — |
| `org_type` | varchar | NOT NULL | `'B2B'` |
| `risk_score` | smallint | NOT NULL | `0` |
| `status` | varchar | NOT NULL | `'ACTIVE'` |
| `plan` | varchar | NOT NULL | `'FREE'` |
| `effective_at` | timestamptz | NOT NULL | `now()` |
| `superseded_at` | timestamptz | NULL | — |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Key finding:** No `tenant_id`, no `org_id` column. The table's PK (`id`) IS the organization/tenant
identifier. This is consistent with the TexQtic schema doctrine:

> `organizations.id = tenants.id` (confirmed in `trade.g017.service.ts` l.337, `escrow.service.ts` l.192)

**Tenant isolation predicate:** `id = app.current_org_id()` (org reads its own single row)

---

### 2.3 Current RLS Policies

Query: `pg_policies WHERE tablename = 'organizations'`

| Policy Name | Type | Roles | Cmd | USING | WITH CHECK |
|------------|------|-------|-----|-------|------------|
| `organizations_guard_policy` | RESTRICTIVE | `{public}` | ALL | `app.bypass_enabled() OR (app.current_realm() = 'admin'::text)` | — |
| `organizations_control_plane_select` | PERMISSIVE | `{public}` | SELECT | `app.bypass_enabled() OR (app.current_realm() = 'admin'::text)` | — |
| `organizations_control_plane_insert` | PERMISSIVE | `{public}` | INSERT | — | `app.bypass_enabled() OR (app.current_realm() = 'admin'::text)` |
| `organizations_control_plane_update` | PERMISSIVE | `{public}` | UPDATE | `app.bypass_enabled() OR (app.current_realm() = 'admin'::text)` | `app.bypass_enabled() OR (app.current_realm() = 'admin'::text)` |

**Critical findings:**

1. **The guard (`organizations_guard_policy`) is RESTRICTIVE FOR ALL** and allows ONLY:
   - `app.bypass_enabled()` — superuser / bypass context
   - `app.current_realm() = 'admin'` — admin-realm sessions

   **There is NO tenant arm.** A regular tenant session (realm = `'tenant'`) is hard-blocked
   at the guard before any PERMISSIVE policy is checked.

2. **All PERMISSIVE policies are admin/bypass only** — the `organizations_control_plane_select`
   PERMISSIVE only fires when the RESTRICTIVE guard has already passed (admin/bypass).

3. **No tenant SELECT policy exists.** A tenant cannot read its own org row under the current
   policy set — even `SELECT * FROM organizations WHERE id = <own-org-id>` returns zero rows.

4. **No DELETE policy.** Organizations rows are managed by admin and provisioning paths only.
   This is correct and must not change.

---

### 2.4 Role Grants

Query: `information_schema.role_table_grants WHERE table_name = 'organizations'`

| Grantee | Privilege | Is Grantable |
|---------|-----------|-------------|
| `texqtic_app` | SELECT | NO |

**Finding:** Only `texqtic_app` holds a SELECT grant. `app_user`, `texqtic_admin` have no direct
grant. INSERT/UPDATE grants are absent — those paths use BYPASSRLS or admin elevation via
service-role Supabase client (provisioning). This must not change.

---

### 2.5 Indexes

| Index | Definition |
|-------|-----------|
| `organizations_pkey` | `UNIQUE (id)` |
| `organizations_slug_key` | `UNIQUE (slug)` |
| `idx_organizations_effective_at` | `btree (effective_at DESC)` |
| `idx_organizations_jurisdiction` | `btree (jurisdiction)` |
| `idx_organizations_risk_score` | `btree (risk_score) WHERE risk_score > 0` |
| `idx_organizations_status` | `btree (status)` |
| `idx_organizations_status_created` | `btree (status, created_at DESC)` |

**Finding:** No index on `id` beyond PK (covered). The tenant predicate `id = app.current_org_id()`
will use `organizations_pkey` (unique B-tree on id) — single-row PK lookup; no new index required.

---

## 3. Tenancy Key Analysis

**Question:** What is the correct tenant-scoped predicate for the organizations table?

**Answer:** `id = app.current_org_id()`

Rationale:
- `organizations.id` is the UUID PK that equals the tenant's org_id (JWT claim / `app.org_id` GUC).
- No `org_id` column exists — there is no indirection. The tenant IS the organization row.
- `app.current_org_id()` is the canonical GUC accessor already used in all other table guards
  (traceability_nodes, traceability_edges, certifications, catalog_items, etc.).
- A SELECT with this predicate will return exactly **one row** for any tenant session: the
  tenant's own organization record. Cross-org read is impossible via this predicate.

---

## 4. Consumer Mapping

### 4.1 Server-side consumers (G-015 Phase C admin-context workaround)

All current server-side reads use `withOrgAdminContext` / `getOrganizationIdentity`, which
elevate to admin realm (`app.is_admin='true'`) to bypass the RESTRICTIVE guard:

| File | Location | Usage |
|------|----------|-------|
| `server/src/lib/database-context.ts` | l.543 `withOrgAdminContext` | Helper: sets `is_admin='true'` to bypass guard |
| `server/src/lib/database-context.ts` | l.578 `getOrganizationIdentity` | Canonical org identity read (legal_name, slug, org_type, etc.) |
| `server/src/routes/tenant.ts` | l.81 | `/api/me` — reads org identity for tenant workspace init |
| `server/src/routes/tenant.ts` | l.1370 | `/api/tenant/orders` — display name for order context |
| `server/src/routes/auth.ts` | l.379 | Login flow — reads `org_type` for `tenantType` JWT claim |

**Status:** All consumers use admin-context workaround. None use tenant-realm direct read.
The admin-context workaround is correct but unnecessarily complex for a self-org-read use case.
Post-TECS-5B, these can optionally be simplified but the workaround remains safe as-is.

### 4.2 DPP views (blocked by guard — root cause of G-025-ORGS-RLS-001)

The three DPP views use `SECURITY INVOKER`:
- `dpp_snapshot_products_v1`
- `dpp_snapshot_lineage_v1`
- `dpp_snapshot_certifications_v1`

When a tenant session queries these views, the base table access runs under the tenant's session
(realm = `'tenant'`, `app.org_id` set, `app.is_admin` NOT set). The RESTRICTIVE guard requires
`bypass_enabled() OR realm='admin'` — so an organizations JOIN in the view returns **zero rows**
(FORCE RLS silently filters all rows). This is why `manufacturer_name`, `manufacturer_jurisdiction`,
and `manufacturer_registration_no` were removed from v1 scope (D4 Gate FAIL, GOVERNANCE-SYNC-081).

### 4.3 Control-plane / admin consumers

| File | Usage |
|------|-------|
| `server/src/routes/control.ts` | Admin dashboard — reads across orgs; uses admin context or bypass; unaffected by a new tenant SELECT policy |
| Supabase provisioning client | Uses service role (BYPASSRLS) for org creation; unaffected |

---

## 5. STOP CONDITION Check

> "If organizations table structure cannot support tenant isolation without schema change, STOP."

**Result: STOP CONDITION DOES NOT APPLY.**

The table has `id UUID NOT NULL PK` which equals `app.current_org_id()` for any tenant session.
The tenant isolation predicate `id = app.current_org_id()` is valid, matches existing patterns,
and requires **zero schema changes** (no new columns, no DDL beyond RLS policy changes).

---

## 6. Current vs Target Policy State

### Current State (admin-only)

```
guard:    RESTRICTIVE ALL → bypass_enabled() OR realm='admin'    (blocks tenant realm entirely)
SELECT:   PERMISSIVE   → bypass_enabled() OR realm='admin'       (admin/bypass only)
INSERT:   PERMISSIVE   → bypass_enabled() OR realm='admin'       (admin/bypass only — correct)
UPDATE:   PERMISSIVE   → bypass_enabled() OR realm='admin'       (admin/bypass only — correct)
DELETE:   (none)                                                   (correct — no tenant delete)
```

### Target State — Minimal Tenant-Safe Extension (proposal for TECS 5B)

```
guard:    RESTRICTIVE ALL → bypass_enabled() OR realm='admin' OR require_org_context()
                                                             ┌── new: allows tenant sessions ┘
SELECT (admin):  PERMISSIVE → bypass_enabled() OR realm='admin'   (unchanged)
SELECT (tenant): PERMISSIVE → id = app.current_org_id()           ← NEW: own-row only
INSERT:          PERMISSIVE → bypass_enabled() OR realm='admin'   (unchanged)
UPDATE:          PERMISSIVE → bypass_enabled() OR realm='admin'   (unchanged)
DELETE:          (none)                                            (unchanged)
```

**Changes from current to target:**
1. Guard: add `OR app.require_org_context()` arm — allows tenant sessions with a valid org context to pass the guard gate.
2. New PERMISSIVE SELECT policy: `id = app.current_org_id()` — narrows tenant read to exactly own org row.
3. No other policies touched. INSERT/UPDATE/DELETE paths unchanged.

### Security Analysis

| Property | Current | Target | Risk |
|----------|---------|--------|------|
| Cross-org read by tenant | ❌ Impossible (guard blocks all) | ❌ Impossible (`id = own`) | None |
| Tenant reads own row | ❌ Impossible | ✅ Allowed | Safe — single row, own identity |
| Admin cross-org read | ✅ Allowed | ✅ Unchanged | None |
| Provision INSERT | ✅ Admin/bypass | ✅ Unchanged | None |
| Admin UPDATE | ✅ Allowed | ✅ Unchanged | None |
| Tenant UPDATE | ❌ Impossible | ❌ Unchanged | None |
| DPP SECURITY INVOKER view org JOIN | ❌ Zero rows | ✅ Own org fields | Safe — same row |

---

## 7. Implementation Proposal for TECS 5B

**Type:** Migration (RLS policy DDL only — SQL applied via psql; no Prisma schema change)

**Allowlist (proposed for TECS 5B):**
- `server/prisma/migrations/<timestamp>_g025_orgs_rls_tenant_select/migration.sql`
- `governance/gap-register.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md`
- `governance/wave-execution-log.md`

**SQL high-level (detail to be authored in TECS 5B):**
1. `DROP POLICY organizations_guard_policy ON public.organizations`
2. `CREATE POLICY organizations_guard_policy AS RESTRICTIVE FOR ALL TO texqtic_app USING (app.bypass_enabled() OR app.current_realm()='admin' OR app.require_org_context())`
3. `CREATE POLICY organizations_tenant_select AS PERMISSIVE FOR SELECT TO texqtic_app USING (id = app.current_org_id())`
4. Verifier DO block: assert guard policy present and has 3 arms; assert tenant_select PERMISSIVE present; assert control_plane_select/insert/update unchanged; assert FORCE RLS=t
5. `prisma db pull` → `prisma generate` → typecheck → lint

**After TECS 5B:** The DPP views `dpp_snapshot_products_v1` and `dpp_snapshot_certifications_v1`
can be extended (separate TECS 5C) to re-include the organizations JOIN and restore
`manufacturer_name`, `manufacturer_jurisdiction`, `manufacturer_registration_no` to the
DPP snapshot surface. The amber banner in `DPPPassport.tsx` can then be removed.

**`withOrgAdminContext` workaround:** Post-TECS-5B, the three callers of `getOrganizationIdentity`
can optionally use a tenant-realm read instead of admin elevation — but this is a code quality
improvement, not a security requirement. The existing workaround remains correct and safe as-is.

---

## 8. Risk Summary

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Guard change unlocks tenant-realm org read | Low | PERMISSIVE SELECT narrows to `id = own`; cross-org read impossible |
| Guard change breaks existing admin reads | Low | Admin arm unchanged; admin still passes guard + admin PERMISSIVE |
| Guard change breaks bypass context | Low | `bypass_enabled()` arm unchanged |
| `withOrgAdminContext` workaround continues to work | None | Admin elevation still valid after guard change |
| INSERT/UPDATE tenant surface exposed | None | INSERT/UPDATE policies are unchanged (still admin/bypass only) |
| DPP view performance change after org JOIN | Low | `id = app.current_org_id()` hits PK index; single-row lookup |

---

## 9. Open Questions (for TECS 5B author)

1. **`app.require_org_context()` function:** Confirm this function exists in the DB and returns `true` when `app.org_id` is a valid UUID (not sentinel). Check `pg_proc` before authoring TECS 5B SQL.
2. **`app.current_org_id()` function:** Confirm return type is `uuid` (not `text`) and matches `organizations.id` type. The predicate `id = app.current_org_id()` must type-check in PostgreSQL.
3. **Sentinel guard:** The `withOrgAdminContext` uses `ORG_ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001'` for `app.org_id`. After guard change, a sentinel-org-id + `require_org_context()=true` would pass the guard but the PERMISSIVE SELECT would return 0 rows (sentinel id doesn't match any real org). This is safe — sentinel reads still work (is_admin=true hits control_plane_select).
4. **Named policy conflict:** `organizations_guard_policy` must be DROPped before recreating. Verify no migration previously recorded this DROP as applied.
5. **`prisma db pull` minimal diff:** After applying TECS 5B SQL, confirm `schema.prisma` does not change (RLS policies are not captured in Prisma schema — only table shape is). `prisma db pull` may show no diff.

---

*Document produced by: GitHub Copilot — G-025-ORGS-RLS-DISCOVERY-001*  
*No schema changes. No view changes. No migrations. Discovery and proposal only.*  
*Governance sync: GOVERNANCE-SYNC-084 — 2026-03-04*
