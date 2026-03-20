# GOV-DEC-ADMINRBAC-REGISTRY-READ-OPENING

Decision ID: GOV-DEC-ADMINRBAC-REGISTRY-READ-OPENING
Title: Split and open the first bounded AdminRBAC child slice as a control-plane admin access registry read surface
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- Layer 0 is internally consistent
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` is the only live non-terminal Layer 0 unit and remains non-open
- `DESIGN-DEC-ADMINRBAC-PRODUCT` is `DECIDED`
- `SECURITY-DEC-ADMINRBAC-POSTURE` is `DECIDED`
- `GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING` is `DECIDED`
- the broad parent stream still must not open as one implementation-ready unit
- the only truthful future first slice previously identified is a read-only control-plane admin access registry surface

Additional repo evidence relevant to the split/opening question is conservative and consistent:

1. `components/ControlPlane/AdminRBAC.tsx` is already a dedicated control-plane view but is static
   and read-only.
2. `constants.tsx` shows that the current AdminRBAC surface is backed by placeholder rows rather
   than a governed backend contract.
3. `server/src/types/index.ts` shows an existing bounded control-plane admin role model:
   `SUPER_ADMIN`, `SUPPORT`, and `ANALYST`.
4. `server/src/routes/auth.ts` already reads from `admin_users`, proving that a real control-plane
   admin identity store exists independently of tenant-plane membership.
5. `docs/governance/audits/2026-03-copilot-frontend-backend-audit.md` records that AdminRBAC has
   no backend route and remains hardcoded, which means the missing delta is a concrete read-surface
   implementation gap rather than an already-shipped capability.

## Problem Statement

The broad parent stream `TECS-FBW-ADMINRBAC` remains too wide to open truthfully as one first
implementation-ready unit. However, the previously recorded sequencing decision already narrowed
the only truthful first slice to a control-plane admin access registry read surface.

This task must decide whether that narrow slice is now specific enough to split out as its own
child unit and open, while preserving the non-open posture of the broad parent and avoiding hidden
mutation scope.

## Parent/Child Split Rationale

The split is justified only if the child is truly narrower than the parent.

That test is satisfied here:

- the parent stream covers invite, revoke/remove, role assignment/change, and broader authority
  boundaries
- the child slice covers only read-only visibility of current control-plane admin access posture
- the child does not require invitation transport, revoke/session propagation, or role-change
  token semantics
- the child can be represented as one bounded logical unit: control-plane backend read support plus
  the existing AdminRBAC surface wired to that bounded read contract

The split therefore improves governance clarity rather than reducing it:

- the parent remains the non-open umbrella for broader AdminRBAC authority work
- the child becomes the only implementation-ready first slice
- no hidden mutation authority is smuggled in under a read-surface label

## Considered Options

### Option A — Keep the parent non-open and do not open any child unit yet

Rejected.

Reason:
- the previous sequencing decision already established that the read-only registry is the only
  truthful first slice supported by repo evidence
- current repo evidence is now specific enough to express that slice as one bounded unit with a
  clear implementation gap
- refusing to open the child now would preserve less clarity, not more

### Option B — Open the broad parent stream directly

Rejected.

Reason:
- the parent remains too broad
- opening it would collapse read-only visibility with mutation and broader authority work
- this would violate the bounded-first-slice posture already recorded

### Option C — Split out and open exactly one read-only child unit while keeping the broad parent non-open

Selected.

Reason:
- the child is truthfully narrower than the parent
- it can stand as one bounded logical unit
- it preserves terminology lock and bounded control-plane visibility posture
- it avoids hidden mutation authorization and avoids any blanket read-everything implication

## Decision

The broad parent `TECS-FBW-ADMINRBAC` remains non-open.

Exactly one bounded child implementation unit is now opened:

- `TECS-FBW-ADMINRBAC-REGISTRY-READ-001`
- title: `Control-plane admin access registry read surface`

Layer 0 should now show:

- the parent `TECS-FBW-ADMINRBAC` still non-open as `DESIGN_GATE`
- the child `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` as the only `OPEN` implementation-ready unit

## Exact Child-Slice In-Scope Boundary

The exact in-scope boundary of the child slice is:

- read-only registry of current internal control-plane admin identities
- display of bounded control-plane role posture only
- minimum visibility necessary to answer who currently has control-plane admin access and what
  bounded role they hold
- control-plane-only scope
- explicit preservation that `TenantAdmin` is not part of this surface
- UI and backend read support only insofar as required to replace the static placeholder surface
  with a real bounded control-plane read surface

## Exact Child-Slice Out-of-Scope Boundary

The exact out-of-scope boundary of the child slice is:

- invite
- revoke/remove
- role assignment/change mutation
- self-elevation
- self-role widening
- invitation delivery or acceptance
- password bootstrap or account setup
- session or token invalidation
- impersonation
- blanket read-everything posture
- unrestricted cross-tenant support visibility
- `TenantAdmin` or tenant membership flows
- white-label staff/admin membership flows
- broader support tooling
- schema, RLS, middleware, or session expansion beyond the minimal read surface

## Terminology Preservation Rule

Future implementation under this child unit must preserve the canonical distinction exactly:

- `TenantAdmin` — tenant/org plane only, out of scope
- `PlatformAdmin` — bounded internal control-plane role family, explicitly granted and auditable
- `SuperAdmin` — distinct highest internal control-plane role, not a synonym for `PlatformAdmin`

No artifact in this child unit may collapse these terms into `Admin`.

## Implementation Authorization Statement

This decision authorizes exactly one implementation-ready unit only:

- `TECS-FBW-ADMINRBAC-REGISTRY-READ-001`

It does **not** authorize:

- opening the broad parent stream
- opening invite, revoke/remove, or role-change mutation work
- opening any second AdminRBAC child unit
- opening blanket read-everything or generalized cross-tenant visibility
- product code outside the bounded child-unit allowlist that later implementation work must define

## Consequences

- Layer 0 now has exactly one `OPEN` implementation-ready unit
- `NEXT-ACTION` should move from `OPERATOR_DECISION_REQUIRED` to `TECS-FBW-ADMINRBAC-REGISTRY-READ-001`
- the broad parent remains non-open, preserving governance clarity
- mutation authority remains bounded and unopened
- no blanket read-everything posture is created
- TenantAdmin / PlatformAdmin / SuperAdmin separation remains explicit

## Sequencing Impact

- `OPEN-SET.md` must show the parent as `DESIGN_GATE` and the child as `OPEN`
- `NEXT-ACTION.md` must point to `TECS-FBW-ADMINRBAC-REGISTRY-READ-001`
- `SNAPSHOT.md` must reflect that one implementation unit is now open
- a new Layer 1 unit record must exist for `TECS-FBW-ADMINRBAC-REGISTRY-READ-001`
- the parent unit record should be clarified as remaining non-open after the split

This decision opens exactly one bounded unit and no more.