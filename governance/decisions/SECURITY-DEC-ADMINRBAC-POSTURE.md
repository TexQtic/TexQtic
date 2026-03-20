# SECURITY-DEC-ADMINRBAC-POSTURE

Decision ID: SECURITY-DEC-ADMINRBAC-POSTURE
Title: AdminRBAC is security-authorized only under strict TenantAdmin / PlatformAdmin / SuperAdmin separation and bounded explicit-audit control-plane posture
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state is:

- Layer 0 is internally consistent
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- `DESIGN-DEC-ADMINRBAC-PRODUCT` is now `DECIDED`
- the remaining unresolved gate for `TECS-FBW-ADMINRBAC` is the security-side decision
  `SECURITY-DEC-ADMINRBAC-POSTURE`

Repo evidence relevant to the security question is consistent:

1. `governance/control/DOCTRINE.md` locks the governing invariants:
   - DB-level RLS is mandatory
   - admin bypass must be explicit and audited
   - `org_id` remains the canonical tenancy boundary
   - cross-tenant queries are forbidden outside the control-plane super-admin context
2. `governance/units/TECS-FBW-ADMINRBAC.md` classifies AdminRBAC as HIGH risk because there is
   currently no auditable admin provisioning pathway and because no control-plane admin invite /
   revoke implementation is authorized yet.
3. `governance/decisions/DESIGN-DEC-ADMINRBAC-PRODUCT.md` already narrows the product target to a
   bounded control-plane admin invite, revoke, and role-partitioning surface only.
4. `docs/strategy/CONTROL_CENTER_TAXONOMY.md` and `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md`
   treat the control plane as a distinct internal operator realm, not a tenant feature surface.
   They also show that the control-plane actor model is already differentiated, not monolithic.
5. `docs/security/SUPERADMIN-RLS-PLAN.md` and `governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md`
   show that the repo already distinguishes ordinary admin context from `SUPER_ADMIN` context,
   and that route-level SUPER_ADMIN enforcement plus explicit audit coverage exist for high-risk
   control-plane surfaces. They also show why app-layer-only authority is insufficient without
   bounded DB posture.
6. `docs/governance/G-017_DAY1_DESIGN.md` explicitly deferred broad superadmin cross-tenant read
   policy by default, establishing that unrestricted admin visibility is not an ambient right in
   TexQtic.

This decision therefore must resolve only the security posture of the bounded AdminRBAC product
surface. It must not collapse into implementation authorization.

## Problem Statement

AdminRBAC introduces a concentrated authority risk: the surface would control who may enter the
internal control-plane admin realm, who may lose that access, and what level of platform
authority each internal admin role may hold.

Without a security posture decision, future implementation could drift into one or more unsafe
patterns that TexQtic has not authorized:

- collapsing tenant and platform authority into one ambiguous term such as `admin`
- treating all internal control-plane admins as one undifferentiated global role
- assuming a blanket "superadmin can read everything" posture without separate authorization
- allowing hidden or informal bypass behavior that is not explicit and auditable
- weakening tenant isolation by allowing cross-tenant access without deliberate scope boundaries

The security problem to solve now is therefore not implementation detail. It is the canonical
security model for how AdminRBAC may exist at all without dissolving TexQtic's tenancy,
auditability, and least-privilege posture.

## Terminology Lock

### Mandatory rule

`Admin` alone is **not** a valid future governance or implementation term wherever scope could be
ambiguous.

Future artifacts must use one of the following explicit terms only:

- `TenantAdmin`
- `PlatformAdmin`
- `SuperAdmin`

`PlatformAdmin` and `SuperAdmin` must not be used interchangeably.
`TenantAdmin` must remain strictly separate from all control-plane authority.

### TenantAdmin

`TenantAdmin` means an org-scoped tenant-plane administrative role.

Canonical definition:

- scope: tenant / org plane only
- authority: limited to that tenant's own governed surfaces
- no implied control-plane authority
- no implied cross-tenant authority
- no implied platform governance authority
- out of scope for `TECS-FBW-ADMINRBAC`

### PlatformAdmin

`PlatformAdmin` means the umbrella governance term for internal control-plane administrative roles.
It is a **family of bounded roles**, not one omnipotent role.

Canonical definition:

- scope: internal control-plane authority only
- authority: explicitly granted, role-partitioned, and auditable
- no implied unrestricted global read/write authority
- no implied tenant-plane ownership authority
- no implied bypass unless separately and explicitly authorized

This term is the canonical umbrella term for bounded internal operator roles such as support,
analyst, and any future explicitly defined control-plane roles.

### SuperAdmin

`SuperAdmin` remains a distinct internal control-plane role in TexQtic.

Canonical definition:

- scope: highest internal platform authority currently recognized in repo posture
- authority: only for explicitly bounded high-risk control-plane actions
- must always be explicit and auditable
- must not be treated as a casual synonym for `PlatformAdmin`
- does not automatically mean unrestricted read-everything or write-everything

This decision keeps `SuperAdmin` as a real distinct class because the repo already uses
`SUPER_ADMIN` as an explicit role boundary on sensitive control-plane surfaces. However, the
existence of `SuperAdmin` does not itself authorize broad undifferentiated global power.

## Considered Options

### Option A — Treat TenantAdmin, PlatformAdmin, and SuperAdmin as one broad `admin` concept

Rejected.

Reason:
- this would erase tenant versus control-plane separation
- it would create immediate naming drift and hidden authorization risk
- it would conflict with existing repo evidence that already distinguishes control-plane authority
  and SUPER_ADMIN-gated surfaces

### Option B — Authorize AdminRBAC only by assuming SuperAdmin has blanket read-everything and
write-everything authority

Rejected.

Reason:
- repo doctrine allows no silent bypass and no implicit cross-tenant scope
- existing governance evidence shows broad superadmin read posture has historically been treated
  as deliberate and separately bounded, not ambient
- this would authorize more than the bounded AdminRBAC product decision requires

### Option C — Remove or defer SuperAdmin as a distinct class and treat all PlatformAdmins as one
single security role

Rejected.

Reason:
- repo evidence already contains explicit `SUPER_ADMIN` enforcement and context separation
- flattening all internal roles into one class would weaken least-privilege posture
- high-risk control-plane actions already rely on a distinct higher authority concept

### Option D — Approve the bounded AdminRBAC product posture only under strict terminology lock,
least-privilege internal role partitioning, explicit auditability, and no blanket read-everything
assumption

Selected.

Reason:
- this matches doctrine and current control-plane security posture
- it preserves the product decision's bounded scope
- it makes future implementation safer by removing naming ambiguity without authorizing code now

## Decision

`SECURITY-DEC-ADMINRBAC-POSTURE` is now `DECIDED`.

The bounded AdminRBAC product posture is **security-authorizable in principle**, but only under a
strict least-privilege control-plane model with explicit terminology separation, explicit audit,
and no hidden or blanket bypass authority.

The adopted security posture is:

1. `TenantAdmin` is strictly outside this stream.
2. `PlatformAdmin` is a bounded family of internal control-plane roles, not one unlimited role.
3. `SuperAdmin` remains a distinct highest internal control-plane role.
4. AdminRBAC mutation authority is security-approved only for `SuperAdmin`.
5. No blanket "read everything" posture is authorized by this decision.
6. Any cross-tenant visibility must be deliberate, narrow, explicit, and auditable.
7. Any bypass of tenant or role boundaries must be explicit and audited, never ambient.

## Exact Security Posture

The exact security posture adopted for AdminRBAC is:

- control-plane authority must remain strictly separate from tenant-plane authority
- internal control-plane authority must be role-partitioned and least-privilege by default
- high-risk control-plane membership mutations are not ordinary PlatformAdmin actions; they are
  `SuperAdmin` actions only
- any AdminRBAC invite, revoke, or role-change action must be explicit and auditable
- any cross-tenant visibility associated with AdminRBAC must be deliberate, bounded to the
  control-plane use case, and auditable
- no hidden bypass, implicit global read scope, or informal support-mode override is authorized
- RLS remains mandatory and future implementation must preserve repo-governed DB enforcement
- client-supplied tenant / org identity remains untrusted and cannot become the security source of
  truth for control-plane privilege decisions

The minimum mandatory security constraints that must be satisfied before any implementation may
open in a later unit are:

- terminology must remain locked to `TenantAdmin`, `PlatformAdmin`, and `SuperAdmin`
- AdminRBAC mutation actions must remain `SuperAdmin` only
- no self-elevation, self-role-widening, or implicit privilege expansion may be treated as allowed
- audit evidence must exist for every privileged AdminRBAC read or mutation that exposes or changes
  bounded control-plane authority
- audit records must at minimum capture actor identity, actor role, target identity, action type,
  role delta or access delta, timestamp, and success/failure outcome
- any cross-tenant visibility must be explicit to the surface and not broaden into blanket control
  plane visibility by assumption
- no implementation may rely on app-layer-only trust for high-risk authority where repo doctrine
  requires explicit bounded enforcement and audit

## Exact In-Scope Boundary

This decision is in scope only for the following security posture questions:

- explicit role-bound internal control-plane authority for the AdminRBAC surface
- explicit separation between tenant-plane and control-plane roles
- explicit retention of a distinct `SuperAdmin` class for highest-risk control-plane authority
- explicit least-privilege posture for ordinary `PlatformAdmin` roles
- explicit auditability requirements for privileged AdminRBAC visibility and mutation
- explicit rule that no hidden bypass or implicit global scope exists
- explicit rule that cross-tenant visibility, if allowed at all for this surface, must be narrow,
  deliberate, and auditable
- explicit terminology lock to prevent future ambiguity

## Exact Out-of-Scope Boundary

This decision is out of scope for:

- implementation mechanics
- schema, migrations, RLS policy SQL, GUC wiring, middleware, route, endpoint, or service design
- token issuance, invitation expiry, invitation delivery, or session transport detail
- step-up authentication or impersonation flow mechanics
- frontend design or backend implementation
- product scope expansion beyond the bounded product decision
- any blanket platform-wide read-everything authorization
- any new unit opening, sequencing, or implementation allowlist definition
- RFQ, G-026, settlement, or AI boundary changes

## Canonical Distinction Among TenantAdmin, PlatformAdmin, and SuperAdmin

The canonical distinction adopted by this decision is:

- `TenantAdmin`: tenant / org plane only; never a control-plane role; never a cross-tenant role
- `PlatformAdmin`: umbrella term for bounded internal control-plane roles; role family, not a
  single unlimited role
- `SuperAdmin`: explicit highest internal control-plane role for separately bounded high-risk
  authority; distinct from, and not interchangeable with, ordinary `PlatformAdmin` roles

For avoidance of doubt:

- `TenantAdmin` must never be treated as a subtype of `PlatformAdmin`
- `SuperAdmin` must never be used as a generic synonym for all internal admins
- `PlatformAdmin` must never be read as equivalent to unrestricted global authority

## Posture On Any Read-Everything Capability

No blanket read-everything capability is authorized by this decision.

The posture adopted here is:

- `SuperAdmin can read everything` is **not authorized** as a default or ambient rule
- broad unrestricted control-plane visibility is **not** created by this decision
- only surface-specific, deliberate, auditable cross-tenant visibility may exist, and only where
  separately bounded by the control-plane surface and future implementation design
- any request to authorize true blanket platform-wide read-everything authority would require a
  separate explicit governance decision and must not be inferred from the word `SuperAdmin`

## Relationship To TECS-FBW-ADMINRBAC

This decision resolves the second bounded decision gate for `TECS-FBW-ADMINRBAC`.

However:

- `TECS-FBW-ADMINRBAC` does not become `OPEN` by this decision alone
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE` until a separate later governance sequencing/opening
  step truthfully transitions it
- no implementation unit is created here

This decision completes the required decision pair together with
`DESIGN-DEC-ADMINRBAC-PRODUCT`, but it does not collapse decision closure into implementation
authorization.

## Relationship To DESIGN-DEC-ADMINRBAC-PRODUCT

This decision preserves and narrows the already-recorded product posture.

`DESIGN-DEC-ADMINRBAC-PRODUCT` authorized AdminRBAC only as a bounded control-plane invite,
revoke, and role-partitioning surface.

This security decision adds the mandatory security constraints for that exact product scope:

- the surface is control-plane only
- the role model is explicitly separated
- `SuperAdmin` is distinct and required for mutation authority
- no blanket read-everything posture exists
- no implementation authorization is implied

It does not broaden the product decision into generalized superadmin expansion.

## Implementation Authorization Statement

This decision resolves **security posture only**.

It does **not**:

- authorize implementation now
- authorize backend design now
- authorize frontend work now
- authorize database changes now
- authorize a new implementation unit now
- transition `TECS-FBW-ADMINRBAC` from `DESIGN_GATE` to `OPEN`

Implementation remains blocked after this decision because:

1. a separate sequencing/opening unit is still required
2. Layer 0 still records `OPERATOR_DECISION_REQUIRED`
3. no truthful implementation slice, allowlist, or opening plan has yet been authorized

## Consequences

- TexQtic now has a canonical terminology lock preventing future `admin` ambiguity
- the security posture for AdminRBAC is bounded and conservative
- `TenantAdmin`, `PlatformAdmin`, and `SuperAdmin` are now explicitly separated in governance terms
- hidden authorization for blanket superadmin visibility is avoided
- future implementation and audit work can target a narrower, safer posture
- the current broader repo boundaries remain intact: RFQ stays capped, G-026 stays bounded,
  and no unrelated security or product expansion is authorized

## Sequencing Impact

- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- no implementation-ready unit is opened
- the two bounded AdminRBAC gate decisions are now both recorded
- the next valid move, if the operator chooses to continue this stream, is a separate governance
  sequencing/opening decision that defines whether any bounded AdminRBAC implementation unit should
  open and under what constrained allowlist