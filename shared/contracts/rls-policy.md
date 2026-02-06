# RLS Policy (Multi-Tenancy Enforcement)

## Non-negotiable

Tenant isolation is enforced at the DB layer using RLS.
The application must never trust client-supplied tenant IDs.

## Session Variables

- app.tenant_id
- app.is_admin

## Required Behaviors

- Tenant routes always set tenant context.
- Admin bypass is explicit and auditable.
- Audit logs are append-only: no UPDATE/DELETE.

## Control Plane vs Tenant Plane

Control plane tables: tenants, admin_users, audit_logs, feature_flags, ai_budgets
Tenant plane tables: users, memberships, invites, tenant_domains, tenant_branding, etc.

No business-domain tables during Phase 2.
