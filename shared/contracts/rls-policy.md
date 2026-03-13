# RLS Policy (Multi-Tenancy Enforcement)

## Non-negotiable

Tenant isolation is enforced at the DB layer using RLS.
The application must never trust client-supplied tenant IDs.

## Session Variables

- `app.org_id` — canonical tenant GUC; set per-request via `withDbContext` / `databaseContextMiddleware`
- `app.is_admin` — control-plane bypass flag; set explicitly and audited

> **Terminology note:** Earlier documentation referenced `app.tenant_id`. The canonical GUC throughout the TexQtic codebase is `app.org_id`. All governance references must use `app.org_id`. (`app.tenant_id` is stale and must not be used in new governance writing.)

## Required Behaviors

- Tenant routes always set tenant context via `withDbContext` before executing queries.
- Admin bypass is explicit and auditable.
- Audit logs are append-only: no UPDATE/DELETE.

## System-Level RLS-Only Posture

*Established: TECS-FBW-RLS-001-GOV · 2026-03-13*

This section is the system-wide authoritative statement on tenant isolation posture. It supersedes any module-specific notes and extends the memberships precedent (Q2 tracker §12.2) to the full platform.

### A. Enforcement source of truth

PostgreSQL `FORCE RLS` is the **canonical enforcement boundary** for tenant isolation on covered tenant-plane tables. RLS policies keyed on `app.org_id` are authoritative. No application-layer tenant filter can substitute for absent or incomplete RLS coverage.

### B. Canonical tenant context

Tenant scope is established exclusively from the authenticated server/JWT context and bound into the database session via the `app.org_id` GUC (set by `withDbContext`). This is the single source of tenant identity for every query.

### C. Client contract

- Clients must **never** be treated as authoritative for tenant identity.
- Normal tenant-plane API contracts must **not** rely on or accept client-supplied `tenantId` for isolation purposes.
- Server routes must extract tenant identity from the verified JWT/session context only.
- Where a route-body `tenantId` field must be explicitly rejected, a `z.never()` guard (or equivalent Zod-level rejection) is the required enforcement mechanism (D-017-A).

### D. Application-layer filter posture

- For routes operating exclusively on tables with **complete and governance-verified FORCE RLS coverage** using `app.org_id`, explicit application-layer `where: { org_id }` filters are **optional defense-in-depth** — they are not the enforcement source of truth.
- Omission of an explicit `where: { org_id }` filter is **acceptable** when:
  1. The table has a confirmed FORCE RLS policy keyed on `app.org_id`, and
  2. `withDbContext` is called before the query, ensuring `app.org_id` is set for the session, and
  3. The omission is either documented in a route-specific note or covered by an existing governance precedent (e.g., Q2 §12.2 for memberships).
- Presence of an optional `where: { org_id }` filter alongside RLS is permitted as defense-in-depth and is not an error.

### E. When route-level filtering or an exception record is still required

Explicit application-layer filtering **or** a documented exception is required when:
- A table's RLS coverage is incomplete, conditional, or not yet governance-verified.
- A query bypasses `withDbContext` (e.g., uses a service-role connection or BYPASSRLS path).
- A control-plane admin route reads across tenants and relies on explicit `tenantId` as an admin-supplied filter rather than an isolation boundary.
- A route operates on a mixed join where not all joined tables have FORCE RLS coverage.

### F. Exception recording

Any deviation from the default posture (D above) must be documented in one of:
- A route-specific governance note in the relevant implementation tracker or gap-register entry, or
- An inline code comment referencing the specific RLS coverage guarantee.

## Control Plane vs Tenant Plane

Control plane tables: tenants, admin_users, audit_logs, feature_flags, ai_budgets
Tenant plane tables: users, memberships, invites, tenant_domains, tenant_branding, etc.

No business-domain tables during Phase 2.
