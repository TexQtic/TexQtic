# DESIGN-DEC-ADMINRBAC-PRODUCT

Decision ID: DESIGN-DEC-ADMINRBAC-PRODUCT
Title: AdminRBAC is product-authorized only as a bounded control-plane admin invite, revoke, and role-partitioning surface
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state is:

- Layer 0 is internally consistent
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` is the only live non-terminal unit and remains `DESIGN_GATE`
- `TECS-FBW-ADMINRBAC` explicitly requires two separate decisions before any implementation may begin:
  - `DESIGN-DEC-ADMINRBAC-PRODUCT`
  - `SECURITY-DEC-ADMINRBAC-POSTURE`

Repo evidence relevant to the product-side question is consistent:

1. `governance/units/TECS-FBW-ADMINRBAC.md` defines the unit as the control-plane AdminRBAC
   surface covering admin invite, revoke, and role-assignment management, and explicitly states
   that the dead-button lock from PW5-U3 is not implementation authorization.
2. `docs/strategy/CONTROL_CENTER_TAXONOMY.md` places Admin RBAC in the control-plane
   Governance & Risk tower, where the SuperAdmin acts as the platform operator rather than as a
   tenant user.
3. `docs/governance/audits/2026-03-copilot-frontend-backend-audit.md` records that the current
   AdminRBAC surface is static and has no backend route, and classifies the gap as both a product
   gap and a security posture gap because there is no auditable admin provisioning path.
4. Current Wave 4 product posture remains bounded. RFQ is capped at pre-negotiation, broader
   G-026-A scope remains deferred, and no decision has authorized hidden expansion into unrestricted
   superadmin behavior, money movement, or implementation by implication.
5. Separate superadmin security/RLS posture work exists elsewhere in repo history, but that work
   does not answer the product question of whether TexQtic should expose a bounded AdminRBAC
   capability at all, nor does it remove the still-open `SECURITY-DEC-ADMINRBAC-POSTURE` gate.

Accordingly, this decision must resolve only the product-side gate: whether AdminRBAC is a real,
bounded product need and what exact product boundary it carries.

## Problem Statement

TexQtic already exposes a control-plane operating model with platform-level governance surfaces
such as compliance, disputes, audit logs, feature flags, and other cross-tenant operator actions.
Those surfaces assume that different platform administrators may hold different levels of authority.

Today, there is no product-authorized, bounded AdminRBAC posture defining how TexQtic should:

- add a new control-plane administrator
- remove or revoke an existing control-plane administrator
- partition control-plane authority across explicit admin roles instead of treating all platform
  administration as one implicit undifferentiated power bucket

Without that product decision, the repo contains only an inert placeholder panel and no truthful,
governed answer to who may be admitted into the control-plane admin realm, who may lose access,
and how role-bounded authority is meant to exist at the product layer.

The product problem is therefore real and supported by repo evidence: TexQtic needs a bounded,
auditable product posture for control-plane admin membership and role partitioning. That need is
distinct from, and not sufficient to resolve, the separate security question of exact enforcement,
session, RLS, and audit mechanics.

## Considered Options

### Option A — Do not product-authorize AdminRBAC

Rejected.

Reason:
- repo strategy and control-center taxonomy already treat Admin RBAC as an intended control-plane
  governance surface
- the audit trail explicitly records the current state as a real product gap, not merely a missing
  cosmetic enhancement
- rejecting AdminRBAC entirely would leave TexQtic with no governed product answer for platform
  admin membership lifecycle despite an established control-plane operator model

### Option B — Product-authorize AdminRBAC broadly as platform-wide superadmin expansion

Rejected.

Reason:
- this would collapse product and security decisions into one hidden authorization
- it would imply broad or implicit bypass behavior, uncontrolled read-everything authority, and
  undefined cross-tenant power that the repo does not authorize here
- it would create hidden implementation scope beyond the bounded unit title of invite, revoke, and
  role assignment management

### Option C — Product-authorize AdminRBAC only as a bounded control-plane admin invite,
revoke, and explicit role-partitioning surface, while leaving security posture and implementation
authorization unresolved

Selected.

Reason:
- this matches the unit record, control-center taxonomy, and audit evidence
- this resolves the real product question conservatively without authorizing implementation by
  implication
- this makes the still-open security decision narrower and clearer rather than muddier

## Decision

`DESIGN-DEC-ADMINRBAC-PRODUCT` is now `DECIDED`.

AdminRBAC is **product-authorized in principle**, but only as a **bounded control-plane admin
membership and authority-partitioning surface**.

This decision authorizes the product need for TexQtic to have an explicit platform-operator
capability that can:

- invite a person into the control-plane admin realm
- revoke or remove a person from that realm
- assign or change that person's control-plane admin role within an explicitly bounded platform
  authority model
- make control-plane admin authority intentional, role-bound, and auditable at the product-posture
  level rather than implicit or ad hoc

This decision does **not** authorize implementation now. It resolves product posture only.

## Exact In-Scope Boundary

The exact in-scope product boundary for AdminRBAC is:

- control-plane admin membership lifecycle only
- invite authority for new control-plane administrators
- revoke or removal authority for existing control-plane administrators
- explicit bounded role assignment and role change for control-plane admin users
- visibility necessary to operate that bounded posture, such as who currently holds control-plane
  admin access and what role-bound authority posture they are intended to hold
- an explicitly governed product posture that admin authority is partitioned rather than treated as
  one implicit all-powerful operator class
- auditable role-based product access posture as a product requirement

This decision is limited to the control-plane admin realm. It is not a tenant membership decision.

## Exact Out-of-Scope Boundary

The exact out-of-scope boundary for this decision is:

- any tenant-plane membership or tenant-org invite lifecycle
- any white-label admin invite or customer-tenant staff management path
- implicit admin bypass models
- uncontrolled or assumed read-everything behavior
- broad superadmin expansion by assumption
- any product authorization for unrestricted cross-tenant visibility beyond what later security and
  implementation governance explicitly define
- security mechanics for invitation expiry, token handling, audit schema, revocation propagation,
  session invalidation, impersonation coupling, or step-up authentication
- database, RLS, GUC, middleware, endpoint, schema, migration, or policy design
- product code, backend code, frontend code, tests, contracts, or implementation sequencing
- opening `TECS-FBW-ADMINRBAC` for implementation by implication
- reopening RFQ or broadening G-026, Wave 4 money posture, or advisory-AI boundaries

## Relationship To TECS-FBW-ADMINRBAC

This decision resolves the **first** bounded gate required by `TECS-FBW-ADMINRBAC`.

After this decision:

- `TECS-FBW-ADMINRBAC` still remains `DESIGN_GATE`
- the unit is **not** `OPEN`
- the dead-button stop-gap remains a stop-gap only
- no implementation unit is created or opened

The unresolved remaining gate is:

- `SECURITY-DEC-ADMINRBAC-POSTURE`

Only after that separate security decision is also resolved may governance consider whether a
separate later sequencing/opening unit is justified.

## Relationship To The Still-Open Security Gate

This product decision does **not** collapse into the security decision.

The still-open security gate remains mandatory because AdminRBAC is a high-risk control-plane
surface involving platform-level authority, possible cross-tenant operational reach, and explicit
audit requirements.

The security-side decision must still determine, at minimum:

- the audit and evidence model for invite, revoke, and role changes
- the authentication/session posture for privileged admin actions
- revocation/session propagation behavior
- exact enforcement boundaries for role assignment and read visibility
- any RLS or backend enforcement implications required to keep the bounded product scope safe

Until that decision exists, product authorization alone is insufficient to open implementation.

## Implementation Authorization Statement

This decision resolves **product posture only**.

It does **not**:

- authorize implementation now
- authorize backend route design now
- authorize frontend wiring now
- authorize database or security changes now
- transition `TECS-FBW-ADMINRBAC` from `DESIGN_GATE` to `OPEN`

Implementation remains prohibited after this decision because:

1. `SECURITY-DEC-ADMINRBAC-POSTURE` is still unresolved
2. Layer 0 still records `OPERATOR_DECISION_REQUIRED`
3. no separate governance sequencing/opening unit has truthfully authorized an implementation slice

## Consequences

- TexQtic now has a clear product answer that AdminRBAC is real and in-bounds in principle
- the product need is narrowed to control-plane admin membership and authority partitioning only
- hidden authorization for broad superadmin expansion is avoided
- the later security decision is easier because it can now design enforcement for a bounded product
  target instead of an undefined platform-power concept
- the current repo posture is preserved: no implementation unit opens, RFQ remains capped, and
  broader Wave 4 boundaries remain intact

## Sequencing Impact

- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- no implementation-ready unit is opened
- the next valid bounded move, if the operator chooses to continue this stream, is the separate
  security-side decision `SECURITY-DEC-ADMINRBAC-POSTURE`
- only after both decisions are resolved may a later governance unit determine whether any bounded
  AdminRBAC implementation unit should open