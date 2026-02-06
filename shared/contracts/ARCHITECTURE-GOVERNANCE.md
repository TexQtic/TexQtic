# Architecture Governance (High-Level)

## Domain Ownership Rule

Every table and every route must declare:

- Domain owner
- Plane (control / tenant)
- Lifecycle (create/update/archive)

If ownership is unclear, the change is rejected.

## Plane Separation Rule

Control Plane:

- tenants, admin_users, audit_logs, feature_flags, ai_budgets, ai_usage_meters

Tenant Plane:

- users, memberships, invites, tenant_domains, tenant_branding, tenant_feature_overrides

No business-domain tables allowed in Phase 2.

## Multi-Tenancy Rule

- DB-level RLS is mandatory.
- App code never trusts tenant_id from clients.
- Admin bypass is explicit and audited.

## Change Governance

- One logical change = one migration
- No "misc cleanup" migrations
- Migrations are immutable once merged
- Breaking changes require backward compatibility or explicit data migration scripts
