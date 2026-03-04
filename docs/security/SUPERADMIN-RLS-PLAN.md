# TexQtic — SUPER_ADMIN DB-Level RLS Enforcement Plan

**TECS ID:** OPS-RLS-SUPERADMIN-001-DISCOVERY-001  
**GOVERNANCE-SYNC:** 071  
**Date:** 2026-03-03  
**Doctrine:** v1.4  
**Status:** Discovery complete — Execution pending governance sign-off  
**Author:** GitHub Copilot (OPS-RLS-SUPERADMIN-001-DISCOVERY-001)

---

## A. Executive Summary — Why App-Layer Only Is Insufficient

### Current State

TexQtic enforces SUPER_ADMIN privilege at the **application layer** via `requireAdminRole('SUPER_ADMIN')` FastifypreHandler hooks. This gate correctly rejects HTTP requests from SUPPORT and ANALYST roles at the route level.

However, the **database layer** has no equivalent distinction:

- `withAdminContext` (all admin roles) sets `app.is_admin = 'true'`
- `withSuperAdminContext` (SUPER_ADMIN only) additionally sets `app.is_superadmin = 'true'`
- **No RLS policy in the codebase currently reads `app.is_superadmin`** — confirmed by full migration grep search with zero policy matches.

This means: if any actor (a compromised SUPPORT token, a scripted DB client with `texqtic_app` credentials, or an internal service bug) sets `app.is_admin = 'true'` in a transaction-local GUC **without** going through the HTTP route guards, the database will permit INSERT/UPDATE on tables that are architecturally SUPER_ADMIN-exclusive.

### Threat Scenarios Addressed

| Threat | App-Layer Mitigation | DB-Layer Gap Closed by This Plan |
|--------|---------------------|----------------------------------|
| Compromised SUPPORT admin JWT bypasses route preHandler | ❌ (preHandler is bypassed) | ✅ DB rejects INSERT on `impersonation_sessions` |
| `texqtic_app` DB credential holder gains access to set `app.is_admin='true'` directly | ❌ No route guard applies | ✅ Without `is_superadmin='true'`, impersonation INSERT blocked |
| Internal service bug calls `withAdminContext` instead of `withSuperAdminContext` | ❌ No DB check | ✅ Policy enforcement surfaces the bug immediately as a 403 |
| ANALYST role sets `app.is_admin='true'` via shared DB pool | ❌ Pooler doesn't differentiate | ✅ `is_superadmin='true'` not set → blocked |

### Design Invariant (Critical)

`withSuperAdminContext` ALREADY sets both GUCs:
```typescript
await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
await tx.$executeRawUnsafe(`SELECT set_config('app.is_superadmin', 'true', true)`);
```

This means: adding `is_superadmin` requirements to policies is **non-breaking for SUPER_ADMIN paths** — as long as those paths migrate from `withAdminContext` → `withSuperAdminContext`.

The comment in `database-context.ts` line 661 already documents this gap:
```
// - No RLS policies use app.is_superadmin yet (future wave).
```

This TECS is that future wave.

---

## B. Target Table List (Ranked by Risk)

### Priority 1 — CRITICAL (SUPER_ADMIN-exclusive write at app layer, currently any admin can write at DB layer)

| Rank | Table | Write Operation | App-Layer Restriction | DB-Layer Gap |
|------|-------|----------------|-----------------------|-------------|
| 1 | `impersonation_sessions` | INSERT (start), UPDATE (stop) | `requireAdminRole('SUPER_ADMIN')` | `withAdminContext` sets only `is_admin='true'` — any admin role satisfies current INSERT/UPDATE policy |
| 2 | `escalation_events` | UPDATE (upgrade `severity`, `status` = resolved) | `requireAdminRole('SUPER_ADMIN')` | Upgrade/resolve route uses `withDbContext` (tenant context per orgId); admin UPDATE arm currently `is_admin='true'` — broad |
| 3 | `feature_flags` | UPSERT (INSERT/UPDATE) | `requireAdminRole('SUPER_ADMIN')` | Route uses bare `prisma.*` without any admin context GUC — RLS is bypassed by `postgres` superuser role OR GUC defaults to empty string (need live verification); regardless, no superadmin differentiation |

### Priority 2 — MEDIUM (Provisioning side-effects; SUPER_ADMIN gated but no DB distinction)

| Rank | Table | Write Operation | App-Layer Restriction | DB-Layer Gap |
|------|-------|----------------|-----------------------|-------------|
| 4 | `tenants` | INSERT (provision) | `requireAdminRole('SUPER_ADMIN')` on `/tenants/provision` | All admin paths use `withAdminContext`; no DB policy distinction for SUPER_ADMIN provision |
| 5 | `memberships` | INSERT (seed after provision) | Indirect SUPER_ADMIN-only (via provision route) | Same as `tenants` |

### Priority 3 — LOW (Design clarification needed; policy extension optional)

| Rank | Table | Note |
|------|-------|------|
| 6 | `morgue_entries` | Append-only (immutable at DDL + RLS). SM writes via `StateMachineService` (which uses `withDbContext` in tenant context). Admin arm on INSERT allows `is_admin='true'`. If morgue entries should only be written by SM (not direct admin), the INSERT admin arm should be removed entirely. Separate policy decision needed. |
| 7 | `trade_lifecycle_logs` / `escrow_lifecycle_logs` / `order_lifecycle_logs` | Append-only lifecycle audit log tables. SM-written via tenant context. Admin arm on INSERT is currently present for operational writes. Same design question as morgue_entries. |
| 8 | `audit_logs` | Append-only. ALL admin roles write audit entries (every route emits `writeAuditLog`). No SUPER_ADMIN distinction desirable or possible here — would break all non-SUPER_ADMIN audit emission. Skip. |
| 9 | `sanctions` | SECURITY DEFINER functions gate sanctions access; RLS is secondary. Superadmin arm not needed — SM boundary is the guard. |

---

## C. Per-Table Delta (Before / After Predicates)

### C.1 — `impersonation_sessions`

**Current policy set (post GOVERNANCE-SYNC-055):**

```sql
-- GUARD (RESTRICTIVE FOR ALL TO texqtic_app):
USING (
  app.require_admin_context()
  OR current_setting('app.is_admin', true) = 'true'
)

-- SELECT (PERMISSIVE FOR SELECT):
USING (
  (app.require_admin_context() AND admin_id = app.current_actor_id())
  OR current_setting('app.is_admin', true) = 'true'
)

-- INSERT (PERMISSIVE FOR INSERT):
WITH CHECK (
  (app.require_admin_context() AND admin_id = app.current_actor_id())
  OR current_setting('app.is_admin', true) = 'true'
)

-- UPDATE (PERMISSIVE FOR UPDATE):
USING (
  (app.require_admin_context() AND admin_id = app.current_actor_id())
  OR current_setting('app.is_admin', true) = 'true'
)

-- DELETE (PERMISSIVE FOR DELETE):
USING (
  (app.require_admin_context() AND admin_id = app.current_actor_id())
  OR current_setting('app.is_admin', true) = 'true'
)
```

**Proposed delta — narrow INSERT/UPDATE/DELETE to SUPER_ADMIN only:**

```sql
-- GUARD: UNCHANGED (is_admin arm still valid — all admin roles can enter)

-- SELECT: UNCHANGED (SUPPORT/ANALYST may legitimately view sessions for auditing)
USING (
  (app.require_admin_context() AND admin_id = app.current_actor_id())
  OR current_setting('app.is_admin', true) = 'true'
)

-- INSERT: NARROWED — require is_superadmin
WITH CHECK (
  (app.require_admin_context() AND admin_id = app.current_actor_id()
    AND current_setting('app.is_superadmin', true) = 'true')
  OR (current_setting('app.is_admin', true) = 'true'
    AND current_setting('app.is_superadmin', true) = 'true')
)

-- UPDATE: NARROWED — require is_superadmin
USING (
  (app.require_admin_context() AND admin_id = app.current_actor_id()
    AND current_setting('app.is_superadmin', true) = 'true')
  OR (current_setting('app.is_admin', true) = 'true'
    AND current_setting('app.is_superadmin', true) = 'true')
)

-- DELETE: NARROWED — require is_superadmin
USING (
  (app.require_admin_context() AND admin_id = app.current_actor_id()
    AND current_setting('app.is_superadmin', true) = 'true')
  OR (current_setting('app.is_admin', true) = 'true'
    AND current_setting('app.is_superadmin', true) = 'true')
)
```

**⚠️ Service-layer change required (BLOCKING DEPENDENCY):**

`impersonation.service.ts` currently uses `withAdminContext` for `startImpersonation`, `stopImpersonation`, and `getImpersonationStatus`. After this policy change, `startImpersonation` and `stopImpersonation` MUST migrate to `withSuperAdminContext`. Otherwise impersonation start/stop will fail with a RLS policy violation (403 from Postgres).

`getImpersonationStatus` SELECT is unchanged — can remain `withAdminContext`.

---

### C.2 — `escalation_events`

**Current policy (from G-022 migration `20260303000000_g022_escalation_core`):**

The escalation_events table uses a **dual-arm pattern** — INSERT via tenant context (orgId scoped) for tenant-created escalations, AND admin arm for cross-tenant reads:

```sql
-- GUARD (RESTRICTIVE):
USING (
  app.require_org_context()
  OR current_setting('app.is_admin', true) = 'true'
)

-- SELECT: admin reads all
-- INSERT: tenant arm (org_id = current_org_id()) OR admin arm
-- UPDATE: admin arm only (upgrade/resolve are admin operations)
```

**Proposed delta — narrow UPDATE to SUPER_ADMIN only:**

```sql
-- GUARD: UNCHANGED
-- SELECT: UNCHANGED (SUPPORT/ANALYST may read escalations)
-- INSERT: UNCHANGED (tenant-originated escalations via LEVEL_0; admin INSERT via org context)

-- UPDATE: NARROWED — upgrade/resolve are SUPER_ADMIN-exclusive
USING (
  current_setting('app.is_admin', true) = 'true'
  AND current_setting('app.is_superadmin', true) = 'true'
)
WITH CHECK (
  current_setting('app.is_admin', true) = 'true'
  AND current_setting('app.is_superadmin', true) = 'true'
)
```

**⚠️ Service-layer change required (BLOCKING DEPENDENCY):**

The escalation upgrade/resolve route uses `withDbContext` with orgId context (tenant realm), NOT `withAdminContext`. After this change, upgrade/resolve must use `withSuperAdminContext` instead (or a specialized context that sets both GUCs). The read path (`withAdminContext`) is unchanged.

---

**⚠️ AMENDMENT — GOVERNANCE-SYNC-074/075 (2026-03-15):**

The UPDATE delta described above in C.2 is **incorrect**. During TECS 2C authoring, inspection of the live baseline migration (`20260303000000_g022_escalation_core`) revealed:

1. `escalation_events` has **no UPDATE RLS policy** (none was ever created).
2. `escalation_events` has **no UPDATE grant** for `texqtic_app` (SELECT + INSERT only).
3. UPDATE/DELETE are blocked unconditionally by the `escalation_events_immutability()` BEFORE trigger (`[E-022-IMMUTABLE]`), which fires before RLS is evaluated.
4. The "upgrade/resolve" operations in `EscalationService` are **INSERTs** (append-only: child rows with `parent_escalation_id`), not UPDATEs.

**Corrected delta (executed in migration `20260315000009`):**

Instead of narrowing a non-existent UPDATE policy, migration `20260315000009` narrows the **admin INSERT arm**:

```sql
-- escalation_events_admin_insert: NARROWED from is_admin to is_admin AND is_superadmin
CREATE POLICY escalation_events_admin_insert ON public.escalation_events
  FOR INSERT WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    AND current_setting('app.is_superadmin', true) = 'true'
  );
```

This is the appropriate hardening because the admin INSERT arm is the only real admin write surface on this table. The tenant INSERT arm (`org_id`-scoped) remains unchanged. No UPDATE/DELETE policies are added.

TECS ID for executed scope: `OPS-RLS-SUPERADMIN-001-ESCALATION-INSERT-001`.

---

### C.3 — `feature_flags`

**Current behavior:**

The `PUT /feature-flags/:key` route calls `prisma.featureFlag.upsert()` directly using the module-level `prisma` client (postgres superuser role). This means **RLS is not active for this path** — the postgres superuser bypasses FORCE RLS.

This is a pre-existing pattern for seed/admin operations. For this table, the enforcement gap is slightly different: there's no tenant RLS risk (feature flags are global), but any admin role with a credential that can call `prisma` directly could upsert flags.

**Proposed delta — two options:**

**Option A (preferred):** Wrap `feature_flags` upsert in `withSuperAdminContext` and add superadmin-only UPDATE policy:
```sql
-- UPDATE: require is_superadmin
USING (
  current_setting('app.is_admin', true) = 'true'
  AND current_setting('app.is_superadmin', true) = 'true'
)
```

**Option B (acceptable):** Document that `feature_flags` is accessed via postgres superuser role (BYPASSRLS) and is therefore out of scope for RLS-level enforcement. Route-level guard (`requireAdminRole('SUPER_ADMIN')`) is the sole enforcement point.

**Recommendation:** Option B unless service refactor is explicitly approved. Document as a `KNOWN LIMITATION`.

---

### C.4 — `tenants` + `memberships` (provisioning)

**Proposed delta:** Defer to a future sub-TECS. Provisioning involves multiple tables in a transaction and requires careful analysis of the `tenantProvision.ts` route. The risk is low (provision route is SUPER_ADMIN-gated; the attack surface requires DB credentials + knowledge of the org schema). Scope of this TECS should remain `impersonation_sessions` + `escalation_events`.

---

## D. Recommended Migration Grouping

Maximum 2 tables per migration (blast radius control per Doctrine v1.4):

| Migration # | Timestamp | Tables | TECS |
|-------------|-----------|--------|------|
| 1 | `20260315000008` | `impersonation_sessions` — narrow INSERT/UPDATE/DELETE to `is_superadmin='true'` | `OPS-RLS-SUPERADMIN-001-IMPERSONATION-001` |
| 2 | `20260315000009` | `escalation_events` — narrow UPDATE to `is_superadmin='true'` | `OPS-RLS-SUPERADMIN-001-ESCALATION-001` |
| 3 | TBD (Option A approved) | `feature_flags` — wrap upsert + narrow UPDATE | `OPS-RLS-SUPERADMIN-001-FLAGS-001` |

**Execution sequence (strictly ordered):**

1. ✅ Service-layer changes FIRST (before any migration apply):
   - `impersonation.service.ts`: `startImpersonation` + `stopImpersonation` → `withSuperAdminContext`
   - `escalation.g022.ts`: upgrade/resolve handlers → `withSuperAdminContext`
2. ✅ Apply Migration 1 (`impersonation_sessions`) via psql + DO-block verifier
3. ✅ Regression: `startImpersonation` + `stopImpersonation` still work (SUPER_ADMIN JWT)
4. ✅ Apply Migration 2 (`escalation_events`) via psql + DO-block verifier
5. ✅ Regression: escalation upgrade/resolve still work (SUPER_ADMIN JWT)
6. ✅ Quality gates: typecheck + lint + test suite

---

## E. Rollback Stance

| Migration | Rollback Method | Verdict |
|-----------|----------------|---------|
| `impersonation_sessions` policies | `DROP POLICY ... ; CREATE POLICY ...` (policy swap — no DDL) | Reversible. Script can restore `is_admin='true'` arm in under 30 seconds. |
| `escalation_events` policies | Same — policy swap. No DDL. | Reversible. |
| Service-layer changes | `git revert` of service file commit | Reversible. |

**Note:** Policy changes are NOT DDL and do not affect `_prisma_migrations` ledger. They are ops-SQL applied via psql, similar to the RLS consolidation pattern used in G-006C P2. They do not require a Prisma migration ledger entry unless a Prisma `#[index]` or schema introspection is involved.

---

## F. Sign-Off Statement Required for Apply

Before committing any of the execution sub-TECS, the following must be explicitly confirmed by the user:

1. **Service-layer change authorization:** "I approve modifying `impersonation.service.ts` to use `withSuperAdminContext` for `startImpersonation` and `stopImpersonation`."

2. **Escalation route change authorization:** "I approve modifying `escalation.g022.ts` upgrade/resolve handlers to use `withSuperAdminContext`."

3. **Migration sequence authorization:** "I approve migration `20260315000008` (`impersonation_sessions`) and migration `20260315000009` (`escalation_events`) being applied via psql."

4. **Feature flags stance:** "Option A (policy + context change) / Option B (document as KNOWN LIMITATION)." *(User must select one.)*

5. **Tenants/memberships scope:** "Defer provisioning tables to a future sub-TECS."

---

### F.1 — APPROVED — Ready to Apply

**GOVERNANCE-SYNC:** 073  
**Date:** 2026-03-03  
**Prerequisite commit:** `1f211d6` (OPS-RLS-SUPERADMIN-001-SERVICE-001 — service write paths migrated)  
**Status:** ✅ APPROVED — DB policy migrations authorized for remote apply

#### Sign-Off Statement (verbatim)

> "We approve tightening DB-level RLS such that:
> 1. `impersonation_sessions` INSERT/UPDATE/DELETE require BOTH `app.is_admin='true'` AND `app.is_superadmin='true'`;
>    SELECT remains unchanged for admin roles.
> 2. `escalation_events` UPDATE requires BOTH `app.is_admin='true'` AND `app.is_superadmin='true'`;
>    SELECT/INSERT remain unchanged.
> Service write paths already use `withSuperAdminContext` (`1f211d6`).
> Feature flags remain a KNOWN LIMITATION (BYPASSRLS path); no change in this wave."

#### Approved Migrations

| Migration Folder | Table | Operation Narrowed |
|-----------------|-------|--------------------|
| `20260315000008_ops_rls_superadmin_impersonation_sessions` | `impersonation_sessions` | INSERT / UPDATE / DELETE require `is_superadmin='true'` |
| `20260315000009_ops_rls_superadmin_escalation_events` | `escalation_events` | UPDATE requires `is_superadmin='true'` |

#### Prerequisites Satisfied

| Prerequisite | Status |
|-------------|--------|
| `withSuperAdminContext` exported from `database-context.ts` | ✅ (GOVERNANCE-SYNC-033) |
| `startImpersonation()` + `stopImpersonation()` → `withSuperAdminContext` | ✅ (commit `1f211d6`) |
| `withSuperAdminEscalationContext` wired to upgrade + resolve handlers | ✅ (commit `1f211d6`) |
| Service-layer typecheck EXIT 0 + lint EXIT 0 confirmed | ✅ (commit `1f211d6`) |

#### Execution Authorized

Apply via psql per runbook in `docs/ops/REMOTE-MIGRATION-APPLY-LOG.md` section
`OPS-RLS-SUPERADMIN-001 — Remote Apply (Approved)`.

TECS 2B executes `20260315000008` + records APPLY_EXIT + VERIFIER PASS evidence.  
TECS 2C executes `20260315000009` + records APPLY_EXIT + VERIFIER PASS evidence + closes OPS-RLS-SUPERADMIN-001.

---

## Appendix — Evidence Basis

| Finding | Source |
|---------|--------|
| `withSuperAdminContext` sets both `is_admin` and `is_superadmin` GUCs | `server/src/lib/database-context.ts` lines 695–697 |
| No RLS policy references `is_superadmin` | `grep_search` across all `server/prisma/migrations/**/*.sql` — 0 policy matches |
| 8 SUPER_ADMIN-gated routes confirmed | `grep_search` for `requireAdminRole('SUPER_ADMIN')` — 8 matches across 5 route files |
| `impersonation.service.ts` uses `withAdminContext` (NOT `withSuperAdminContext`) | Lines 150–156 (`stopImpersonation`), line 238 (`getImpersonationStatus`) |
| `feature_flags` upsert uses bare `prisma` (postgres superuser, bypasses RLS) | `server/src/routes/control.ts` lines 204–218 |
| `escalation.g022.ts` uses `withDbContext` (tenant context) for write path | Line 34 import + comments lines 24–26 |
| Canonical admin arm pattern: `is_admin='true'` | `server/prisma/migrations/20260315000006_g027_morgue_table_rls_001/migration.sql` lines 84, 96, 108 |
| `impersonation_sessions` admin-only policy pattern (post G-006C P2) | `server/prisma/migrations/20260315000004_g006c_p2_impersonation_sessions_rls_unify/migration.sql` lines 46–47 |

---

*Document produced by: GitHub Copilot — OPS-RLS-SUPERADMIN-001-DISCOVERY-001*  
*No application code was modified in the production of this document.*  
*No migrations were created or modified in the production of this document.*
