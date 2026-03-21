---
unit_id: TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001
title: AdminRBAC revoke/remove opening posture clarification
type: GOVERNANCE
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-21
closed: 2026-03-21
verified: 2026-03-21
commit: 4ede95d
evidence: "GOVERNANCE_RECONCILIATION_CONFIRMATION: revoke/remove opening posture clarified as control-plane only, SuperAdmin-only actor, existing internal control-plane admin target only, no self-revoke, no same-highest-role revoke, immediate privileged-session and refresh-token invalidation required, explicit audit traceability required, and READY_FOR_OPENING recorded for a later separate decision/opening step only · GOVERNANCE_RECONCILIATION_CONFIRMATION: bounded verification confirmed the clarification remains governance-only, READY_FOR_OPENING remains opening-readiness only, revoke/remove implementation is not opened, TECS-FBW-ADMINRBAC remains DESIGN_GATE, governance:lint PASS, and no verification commit was required · GOVERNANCE_RECONCILIATION_CONFIRMATION: bounded closure completed with mandatory post-close audit result DECISION_REQUIRED, the unit remained clarification-only, READY_FOR_OPENING did not open implementation, revoke/remove implementation remained unopened, TECS-FBW-ADMINRBAC remained DESIGN_GATE, and NEXT-ACTION returned to OPERATOR_DECISION_REQUIRED"
doctrine_constraints:
  - D-004: this is one bounded clarification unit only; no implementation, verification, sync, or closure work may be mixed in
  - D-007: governance units must not touch application code, schema, tests, or CI scripts
  - D-002: any future AdminRBAC mutation boundary must preserve explicit and auditable control-plane authority posture
  - D-013: any later close must include mandatory post-close audit output
decisions_required:
  - DESIGN-DEC-ADMINRBAC-PRODUCT: DECIDED (2026-03-20, Paresh)
  - SECURITY-DEC-ADMINRBAC-POSTURE: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-ADMINRBAC-POST-CLOSE-DISPOSITION: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-OPENING: DECIDED (2026-03-21, Paresh)
  - GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-OPENING: DECIDED (2026-03-21, Paresh)
blockers: []
---

## Unit Summary

TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001 is the sole bounded next governed
unit for AdminRBAC.

It is limited to one governance/design question only: what exact posture must be explicitly fixed
before any later control-plane admin access revoke/remove implementation opening may be truthfully
considered.

This unit does not authorize implementation work. It does not reopen
`TECS-FBW-ADMINRBAC-REGISTRY-READ-001`. It does not reopen
`TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`. It does not open the broad parent
`TECS-FBW-ADMINRBAC`.

## Acceptance Criteria

- [x] It is explicitly determined whether a later control-plane admin access revoke/remove child may be truthfully opened at all
- [x] The exact actor/target safety posture for that later child is recorded
- [x] The exact self-revoke or same-highest-role guard posture for that later child is recorded
- [x] The exact active-session and refresh-token invalidation semantics for that later child are recorded as explicit bounded scope rather than ambient assumption
- [x] The exact minimum audit evidence shape for that later child is recorded
- [x] The exact out-of-scope boundary for that later child is recorded and preserves invite, role-change, tenant-scope, and broader authority exclusions
- [x] A bounded opening readiness decision is recorded without opening implementation
- [x] No implementation, verification, governance sync, or closure work is authorized inside this unit

## Files Allowlisted (Modify)

This bounded clarification prompt authorizes modification of these files only:

- `governance/units/TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/log/EXECUTION-LOG.md`

No other files are authorized for edit in this clarification step.

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/units/TECS-FBW-ADMINRBAC.md`
- `governance/units/TECS-FBW-ADMINRBAC-REGISTRY-READ-001.md`
- `governance/units/TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001.md`
- `governance/decisions/DESIGN-DEC-ADMINRBAC-PRODUCT.md`
- `governance/decisions/SECURITY-DEC-ADMINRBAC-POSTURE.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-POST-CLOSE-DISPOSITION.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-OPENING.md`

## Evidence Record

- Opening decision: `GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-OPENING`
- Broad parent remains non-open: `TECS-FBW-ADMINRBAC` is still `DESIGN_GATE`
- Closed first child preserved: `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` remains `CLOSED`
- Closed mutation-candidate clarification preserved: `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001` remains `CLOSED`
- This clarification records the exact revoke/remove opening posture as bounded governance truth only; it does not open implementation
- Implementation commit: `4ede95d` — `governance(adminrbac): clarify revoke-remove opening posture`
- Verification confirmation: governance-only verification completed with `pnpm run governance:lint` PASS and clean worktree; no verification commit required

## Current Parent Truth

`TECS-FBW-ADMINRBAC` remains `DESIGN_GATE` because the parent still bundles multiple high-risk
control-plane mutation concerns into one umbrella stream:

- invite / provisioning behavior
- revoke / removal behavior
- role assignment / role change behavior
- audit expectations tied to those actions
- active-session and token-semantics implications for revoke and role change
- invitation transport and account-setup coupling for invite

That parent is still too broad to open directly because doing so would collapse distinct mutation
surfaces and their coupled security mechanics into one implementation-ready stream, which current
canonical AdminRBAC decisions explicitly do not authorize.

## Clarification Target

This unit is limited to the already-identified strongest next candidate only:

- **candidate title:** `Control-plane admin access revoke/remove authority`

This unit does **not** open that candidate. It records only the exact pre-opening posture that
would have to be explicit before any later separate decision/opening could lawfully consider it.

## Clarification Outcome

The revoke/remove candidate is now bounded enough to support a later separate decision/opening
step.

The clarification result is:

- `READY_FOR_OPENING`

`READY_FOR_OPENING` here means only that a later separate governance decision/opening may now
truthfully consider one narrowly bounded revoke/remove implementation child without needing to
guess the safety model.

It does **not** mean implementation is opened now.

## 1. Actor Safety

The only permitted actor for any future revoke/remove child is:

- `SuperAdmin` only

Actor restrictions are mandatory:

- the actor must already hold explicit control-plane `SuperAdmin` authority at action time
- ordinary `PlatformAdmin` roles must not perform revoke/remove
- `TenantAdmin` is always out of scope and can never act here
- delegated support posture, informal operator override, impersonation, or hidden bypass must not
  substitute for explicit `SuperAdmin` authority
- no actor may derive authority for this action from UI visibility alone, app-layer convenience,
  or inferred trust

This preserves the existing security decision that AdminRBAC mutation authority is `SuperAdmin`
only and that no ambient bypass exists.

## 2. Target Safety

The future revoke/remove child may target only:

- an already-existing internal control-plane admin identity
- an identity that currently holds revocable control-plane admin access
- a target that is not being created, invited, converted, or re-scoped as part of the action

Target restrictions are mandatory:

- target scope is control-plane only
- tenant-plane identities, org-scoped staff, white-label staff, and pending invite identities are
  out of scope
- the action must remove control-plane admin access posture, not delete or redesign the entire
  underlying identity model
- the future first child must stay limited to revoking existing bounded admin access, not broader
  lifecycle management

For the first truthful revoke/remove child, the safe target class is limited to existing
non-`SuperAdmin` control-plane admins. Peer `SuperAdmin` removal is excluded from this first child
because it would weaken same-highest-role protections and create a broader authority-governance
problem.

## 3. Self-Revoke / Role Safety

Self-revoke is **not allowed** in the future first revoke/remove child.

Same-highest-role protection is mandatory:

- a `SuperAdmin` actor must not revoke/remove themself
- a `SuperAdmin` actor must not revoke/remove another `SuperAdmin` in the first bounded child
- the first bounded child must not include role-delta semantics, partial downgrade semantics, or
  any multi-step authority reshaping behavior
- the child must remain simple access removal for an existing non-`SuperAdmin` control-plane admin
  target only

This keeps the first candidate narrow and avoids smuggling peer-authority governance or
role-change complexity into a revoke/remove child.

## 4. Session / Token Invalidation

Session and token invalidation are in scope for the future first revoke/remove child and must not
be treated as deferred ambient behavior.

Required bounded semantics:

- revoke/remove success must immediately block any new privileged control-plane access for the
  target
- active privileged control-plane sessions for the target must fail authorization on the next
  control-plane request after a successful revoke/remove
- refresh tokens or equivalent renewal credentials that would continue control-plane admin access
  must be invalidated as part of the same bounded child
- no grace-period assumption, delayed background-only invalidation, or eventual-consistency-only
  posture is acceptable for the future first child
- broader auth redesign, step-up redesign, or session architecture redesign remains out of scope

The future child may implement only the minimum explicit invalidation behavior necessary to make
revocation real and attributable. It must not widen into a generic auth overhaul.

## 5. Audit Requirements

The future revoke/remove child must emit explicit audit evidence for every attempted action,
successful or failed.

Minimum required audit fields:

- unique event identifier
- timestamp
- actor identity
- actor effective role at action time
- target identity
- target effective role/access posture before the action
- action type: `REVOKE_REMOVE_CONTROL_PLANE_ADMIN_ACCESS`
- result: success or failure
- denial or failure reason when applicable
- request or correlation identifier
- invalidation outcome for active privileged session posture
- invalidation outcome for refresh-token or renewal posture

Minimum traceability rules:

- the action must be attributable to one explicit `SuperAdmin` actor
- the target must be uniquely traceable
- the access delta must be reconstructable from the audit trail
- the result must distinguish denied attempt, failed operation, and completed revocation
- audit evidence must remain control-plane specific and must not collapse into generic user-change
  logging

## 6. Exact In-Scope Boundary

If a later separate decision/opening is made, the future first revoke/remove child may include
only the following bounded behavior:

- revoke/remove existing control-plane admin access for an existing non-`SuperAdmin` internal
  control-plane admin target
- `SuperAdmin` actor only
- control-plane only
- no self-revoke
- no peer `SuperAdmin` revoke/remove
- immediate privileged-session invalidation semantics as defined above
- immediate refresh-token or renewal invalidation semantics as defined above
- explicit audit capture as defined above

The future first child must remain an access-removal child only. It must not widen into general
role management, identity lifecycle redesign, or broader control-plane security expansion.

## 7. Explicit Exclusions

The following are explicitly excluded from the future first revoke/remove child:

- invite
- role change
- tenant scope
- account creation
- auth redesign
- broader authority expansion
- invite delivery, acceptance, or account bootstrap
- creation of new internal admin identities
- peer `SuperAdmin` removal
- self-revoke
- tenant-admin, white-label-admin, or org-staff membership management
- blanket cross-tenant read or write expansion
- session architecture redesign beyond the minimum explicit revoke/remove invalidation boundary

## 8. Opening Readiness Decision

Decision: `READY_FOR_OPENING`

Reasoning:

- the actor boundary is explicit: `SuperAdmin` only
- the first safe target boundary is explicit: existing non-`SuperAdmin` internal control-plane
  admin access only
- self-revoke and same-highest-role protections are explicit
- session and refresh-token invalidation semantics are explicit and in scope rather than ambient
- the minimum audit structure and traceability requirements are explicit
- invite, role change, tenant scope, account creation, auth redesign, and broader authority
  expansion remain explicitly excluded

Because those constraints are now explicit, a later separate decision/opening can lawfully ask
whether to open one bounded revoke/remove implementation child without guessing the safety model.

This unit still does **not** open implementation.

## Exact In-Scope Boundary

This unit may clarify only the following questions:

- whether a later revoke/remove child may be truthfully opened at all
- the exact actor/target safety posture for that later child
- the exact self-revoke or same-highest-role guard posture for that later child
- the exact active-session and refresh-token invalidation semantics for that later child
- the exact minimum audit evidence shape required by the security posture for that later child
- the exact preserved exclusions that must remain outside that later child
- the exact readiness decision for whether a later separate opening may be considered

## Exact Exclusions

The following remain out of scope for this clarification unit and must not be bundled into it:

- revoke/remove implementation
- invite / invitation delivery
- invite acceptance
- account setup or password bootstrap
- creation of new internal admin identities
- role assignment or role change mutation
- peer `SuperAdmin` revoke/remove
- self-revoke
- tenant-plane membership changes
- white-label staff / tenant admin / org-plane admin management
- blanket cross-tenant read expansion
- any blanket `SuperAdmin can do everything` posture
- schema, migrations, Prisma, product code, test code, UI code, API code, or auth/session implementation changes

## Allowed Next Step

This unit is now postured for governance close only.

No further implementation, verification, or governance-sync work is authorized inside this unit.

## Forbidden Next Step

- Do **not** implement revoke/remove in this unit
- Do **not** implement invite, role assignment/change, session invalidation, token propagation, or invitation transport in this unit
- Do **not** treat `READY_FOR_OPENING` as implementation authorization
- Do **not** treat governance sync as closure; a separate close step is still required
- Do **not** open the broad parent `TECS-FBW-ADMINRBAC` in this unit
- Do **not** reopen `TECS-FBW-ADMINRBAC-REGISTRY-READ-001`
- Do **not** reopen `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`
- Do **not** imply that this clarification unit authorizes any implementation opening automatically
- Do **not** broaden AdminRBAC into tenant-plane, white-label, RFQ, routing/domain, QA, or CI scope

## Drift Guards

- This unit is clarification-only. If work requires application code, tests, schema, migrations, Prisma, contracts, or runtime verification, stop and return to governance rather than widening scope implicitly.
- `TenantAdmin`, `PlatformAdmin`, and `SuperAdmin` terminology lock remains mandatory.
- `SuperAdmin`-only mutation posture remains mandatory for any later AdminRBAC mutation child.
- No blanket `SuperAdmin can read everything` posture may be inferred.
- Governance sync for this unit is recording only; no implementation opening, no new opening, and no closure is implied by the `VERIFIED_COMPLETE` state.

## Governance Sync

- Governance sync unit: `GOVERNANCE-SYNC-TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001`
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- Next-action posture after sync: `GOV-CLOSE-TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001`
- Sync preserves clarification-only posture, keeps `READY_FOR_OPENING` as opening-readiness only, keeps revoke/remove implementation unopened, preserves the bounded control-plane revoke/remove posture only, preserves `TECS-FBW-ADMINRBAC` as `DESIGN_GATE`, authorizes no invite, role-change, tenant-scope, or broader authority expansion, and implies no new opening

## Governance Closure

- Governance close unit: `GOV-CLOSE-TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001`
- Status transition: `VERIFIED_COMPLETE` → `CLOSED`
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`
- Mandatory post-close audit result: `DECISION_REQUIRED`
- Closure preserves clarification-only posture, keeps `READY_FOR_OPENING` as opening-readiness only, keeps revoke/remove implementation unopened, preserves the bounded control-plane revoke/remove posture only, preserves `TECS-FBW-ADMINRBAC` as `DESIGN_GATE`, authorizes no invite, role-change, tenant-scope, or broader authority expansion, and creates no AdminRBAC implementation opening

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Why is this unit open now? | `governance/decisions/GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-OPENING.md` |
| Why does the broad parent remain non-open? | `governance/units/TECS-FBW-ADMINRBAC.md` |
| Why does the closed registry-read child not authorize continuation? | `governance/decisions/GOV-DEC-ADMINRBAC-POST-CLOSE-DISPOSITION.md` |
| What constrains any future mutation child? | `governance/decisions/SECURITY-DEC-ADMINRBAC-POSTURE.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-21 — `GOV-CLOSE-TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001`.
Status transitioned: `VERIFIED_COMPLETE` → `CLOSED` after the already-recorded
implementation, verification, and governance-sync chain, together with mandatory
post-close audit result `DECISION_REQUIRED`. The unit remained clarification-only,
`READY_FOR_OPENING` remained opening-readiness only, revoke/remove implementation was not
opened, the candidate remained bounded to control-plane revoke/remove posture only,
`TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`, no invite, role-change, tenant-scope, or
broader authority expansion was authorized, and no new opening is implied by this closure.