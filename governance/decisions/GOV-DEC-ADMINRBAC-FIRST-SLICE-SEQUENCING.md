# GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING

Decision ID: GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING
Title: TECS-FBW-ADMINRBAC does not open yet; the only truthful first slice is a bounded control-plane admin access registry read surface
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- Layer 0 is internally consistent
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` is the only live non-terminal Layer 0 unit and is still recorded as `DESIGN_GATE`
- `DESIGN-DEC-ADMINRBAC-PRODUCT` is now `DECIDED`
- `SECURITY-DEC-ADMINRBAC-POSTURE` is now `DECIDED`
- the canonical terminology lock is now explicit: `TenantAdmin`, `PlatformAdmin`, and `SuperAdmin` are distinct terms and must not collapse into `Admin`
- no blanket `SuperAdmin can read everything` posture is authorized
- RFQ remains capped at pre-negotiation
- bounded G-026 v1 did not open as a new implementation unit and broader `G-026-A` scope remains deferred

For this sequencing decision, the evidence posture is conservative and redaction-safe:

1. Canonical Layer 0 files show that no implementation unit is currently `OPEN` and that any change to
   sequencing must be explicit.
2. `governance/units/TECS-FBW-ADMINRBAC.md` still defines the broad stream as control-plane admin
   invite, revoke, and role-assignment authority, and therefore remains broader than a read-only
   access-visibility slice.
3. `governance/decisions/DESIGN-DEC-ADMINRBAC-PRODUCT.md` and
   `governance/decisions/SECURITY-DEC-ADMINRBAC-POSTURE.md` both explicitly state that gate
   completion does not itself authorize implementation and that a separate later sequencing/opening
   step must still prove one truthful bounded slice.
4. `components/ControlPlane/AdminRBAC.tsx` is a static control-plane table today. It exposes only a
   list-style surface for current internal admins and does not wire invite, revoke, or role-change
   behavior.
5. `constants.tsx` shows the current AdminRBAC UI is backed by placeholder admin rows rather than a
   real governed API contract.
6. `server/src/routes/auth.ts` and `server/src/types/index.ts` show that TexQtic already has a real
   control-plane admin identity model (`admin_users`) and an existing bounded admin role set
   (`SUPER_ADMIN`, `SUPPORT`, `ANALYST`).
7. `docs/strategy/CONTROL_CENTER_TAXONOMY.md`, `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md`, and
   `docs/governance/audits/2026-03-copilot-frontend-backend-audit.md` consistently treat AdminRBAC
   as a control-plane governance surface, but also show that the currently implemented repo surface
   is static and has no backend route.
8. Existing control-plane evidence such as `components/ControlPlane/EscalationOversight.tsx` shows a
   repo pattern where read visibility may remain broader than mutation authority, while
   `SuperAdmin`-only mutation posture stays explicit.

## Problem Statement

Both required AdminRBAC gate decisions are now resolved, which makes AdminRBAC eligible for
sequencing review in principle. That is not the same as saying the current broad stream may now be
opened automatically.

The sequencing question is whether TexQtic can now truthfully open exactly one bounded first
AdminRBAC implementation slice without hidden scope expansion, terminology collapse, or an implied
blanket read-everything posture.

The difficulty is that the current broad stream definition still combines multiple high-risk
concerns:

- control-plane admin access visibility
- invite / provisioning behavior
- revoke / removal behavior
- role assignment / role change behavior
- audit expectations tied to those actions
- active-session and token-semantics implications for revoke and role change

The first four concerns do not all appear equally sequencing-ready from current repo evidence.
Opening the broad stream as one implementation-ready unit now would risk collapsing a bounded
decision pair into a blob that silently includes invitation delivery, revocation propagation,
session invalidation, and role-change token semantics that were not resolved by the gate decisions
themselves.

## Considered Options

### Option A — Open `TECS-FBW-ADMINRBAC` now as one broad implementation-ready authority stream

Rejected.

Reason:
- the current parent unit title still bundles invite, revoke, and role-assignment authority
- repo evidence does not prove those mutation paths can be implemented as one safe first slice
  without also deciding invitation transport, revocation/session behavior, and role-change active
  token semantics
- this would create hidden scope expansion and weaken the sequencing discipline that the new gate
  decisions explicitly preserved

### Option B — Open a mutation-first slice now: invite, revoke, or role change

Rejected.

Reason:
- each mutation path depends on security-sensitive details that are not yet reduced to one clearly
  bounded implementation delta in the current repo record
- revoke and role change in particular intersect with active admin sessions and refresh-token
  posture already present in `server/src/routes/auth.ts`
- invite also risks smuggling in invitation transport or setup mechanics that are not required to be
  decided by the gate files and are not yet proven as a minimal first slice

### Option C — Open only a bounded control-plane admin access registry read surface first

Plausible in principle, but not opened by this decision.

Reason:
- this is the only candidate slice the current repo evidence cleanly supports
- the repo already has a static AdminRBAC list surface and an existing control-plane admin identity
  model, so a read-only access registry is the smallest truthful delta
- this slice preserves the terminology lock, avoids blanket read-everything posture, and does not
  require immediate invite/revoke/session semantics
- however, the current live parent unit `TECS-FBW-ADMINRBAC` is not named or scoped as a read-only
  access-registry slice, and opening a new child unit would require a separate explicit split
  decision rather than silently repurposing the parent

### Option D — Keep `TECS-FBW-ADMINRBAC` non-open and record the sequencing answer now

Selected.

Reason:
- this preserves the distinction between gate completion and implementation opening
- it avoids forcing the broad parent open when the only proven first slice is narrower than the
  current unit definition
- it records the exact future first slice that appears truthful without opening more than one unit
  or smuggling in mutation mechanics

## Decision

`TECS-FBW-ADMINRBAC` does **not** open now as an implementation-ready stream.

The required product and security gate decisions are now resolved, so the stream is sequencing-
eligible in principle. However, current repo and governance evidence do **not** prove that the
current broad `TECS-FBW-ADMINRBAC` authority stream can be opened as one bounded first
implementation unit without hidden scope expansion.

This decision records the following authoritative sequencing answer:

1. both required AdminRBAC gate decisions are complete
2. implementation does **not** automatically open as a result
3. the broad parent stream must not be opened as-is
4. the only truthful first slice supported by current repo evidence is a narrower read-only
   control-plane admin access registry surface
5. because that narrower slice is not identical to the currently named parent stream, no
   implementation unit is opened by this decision

Accordingly, the sequencing answer is:

- **gate completion achieved:** yes
- **open `TECS-FBW-ADMINRBAC` now:** no
- **open a new bounded implementation unit now:** no

## Exact Phase-1 In-Scope Boundary

If AdminRBAC is later split and opened truthfully, the exact first bounded phase-1 slice must be
limited to a **control-plane admin access registry read surface only**.

That exact in-scope boundary is:

- list the current internal control-plane admin users from the existing admin identity model
- display each current user's bounded control-plane role using canonical terminology that preserves
  `PlatformAdmin` versus `SuperAdmin`
- expose only the minimum access-visibility posture needed to answer who currently has control-
  plane access and what bounded role family or explicit highest role they hold
- preserve that `TenantAdmin` is out of scope and never shown as part of the control-plane AdminRBAC
  surface
- preserve explicit audit visibility posture for this control-plane access view only insofar as the
  surface must be attributable and governance-safe
- remain control-plane only and avoid tenant membership, white-label staff membership, or org-plane
  membership behavior

This phase-1 slice is intentionally read-only.

## Exact Phase-1 Out-of-Scope Boundary

The following are explicitly out of scope for the first truthful phase-1 slice and are therefore
not authorized to open now:

- control-plane admin invite
- control-plane admin revoke or remove
- control-plane admin role assignment or role change mutation
- self-elevation or self-role widening behavior of any kind
- invitation delivery, invite acceptance, password bootstrap, or account-setup mechanics
- revocation propagation, refresh-token invalidation, or active-session invalidation mechanics
- step-up authentication design
- impersonation expansion
- blanket cross-tenant read posture
- any claim that `SuperAdmin` automatically implies unrestricted read-everything authority
- tenant membership flows, `TenantAdmin` flows, white-label staff flows, or tenant-org RBAC
- schema, migration, RLS policy, middleware, endpoint, or session transport expansion beyond the
  minimal read surface
- RFQ reopening, Wave 4 broadening, G-026 broadening, AI broadening, or finance/posture changes

## Terminology Preservation Rule

Future implementation must preserve the following canonical distinction exactly:

- `TenantAdmin` = tenant / org plane only; not part of this control-plane stream
- `PlatformAdmin` = bounded internal control-plane role family; explicitly granted,
  role-partitioned, and auditable
- `SuperAdmin` = distinct highest internal control-plane role; not a synonym for
  `PlatformAdmin`; mutation authority remains separately bounded

`Admin` alone is not a valid future implementation or governance term wherever scope could be
ambiguous.

## Implementation Authorization Statement

This decision authorizes **no implementation unit**.

It does **not**:

- transition `TECS-FBW-ADMINRBAC` from `DESIGN_GATE` to `OPEN`
- create a new `OPEN` AdminRBAC child unit
- authorize invite, revoke, or role-change implementation
- authorize backend, frontend, schema, migration, policy, or test work

The broad parent remains non-open because the current record still combines multiple authority and
session-sensitive mutation concerns into one stream that is wider than the only proven first slice.

If a later operator chooses to proceed, the next truthful governance move would be a separate split
decision that opens exactly one new bounded implementation unit for a read-only control-plane admin
access registry surface and nothing more.

## Consequences

- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- no implementation-ready unit is opened
- no hidden blanket read-everything posture is created
- `SuperAdmin` mutation authority remains bounded and does not expand by implication
- the distinction among `TenantAdmin`, `PlatformAdmin`, and `SuperAdmin` is preserved
- the repo now has a canonical sequencing answer distinguishing gate completion from opening
- invite, revoke, and role-change mutation scope remain deferred until a later bounded split proves
  they can open without dragging in broader session or transport mechanics

## Sequencing Impact

- Layer 0 remains unchanged by this decision
- `OPEN-SET.md` remains unchanged
- `NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` remains non-open
- no new Layer 1 implementation unit is created now

The exact future first slice, if later opened, must be:

- **bounded first slice candidate:** control-plane admin access registry read surface only
- **not authorized now:** yes, still not opened by this decision

## Relationship To Prior Decisions

This decision preserves and depends on:

- `DESIGN-DEC-ADMINRBAC-PRODUCT`
- `SECURITY-DEC-ADMINRBAC-POSTURE`
- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`
- `PRODUCT-DEC-G026-V1-FIRST-STREAM-DISPOSITION`
- governance hardening and sequencing-safety policy already recorded in Layer 2

It records the sequencing answer without reopening RFQ, broadening G-026, or authorizing any
blanket control-plane bypass posture.