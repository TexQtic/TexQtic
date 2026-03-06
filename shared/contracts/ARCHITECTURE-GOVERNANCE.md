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

## OpenAPI Contract Governance

- When a frontend-backend contract gap fix modifies request/response shape or newly exposes an endpoint, the corresponding `openapi.tenant.json` or `openapi.control-plane.json` must be updated in the same implementation wave — not as deferred cleanup.
- OpenAPI drift identified by audit (TECS-FBW-OA-001 — tenant plane; TECS-FBW-OA-002 — control plane) is classified as governance debt, not optional documentation.
- Stale or missing OpenAPI paths discovered by audit must be logged in the gap register before the implementing wave closes.
- Enumeration protocol: for each Wave N gap fix, the implementer must confirm whether the affected endpoint already appears in the relevant OpenAPI spec before marking the IMPLEMENTATION-TRACKER-2026-03.md row ✅.
