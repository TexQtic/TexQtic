---
unit_id: TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001
title: Control-plane admin access revoke/remove authority
type: IMPLEMENTATION
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-21
closed: null
verified: null
commit: null
evidence: null
doctrine_constraints:
  - D-002: admin mutation posture must remain explicit, auditable, and control-plane only
  - D-004: this unit is one bounded revoke/remove child slice only; no invite, role-change, tenant-scope, or broader authority work may be mixed in
  - D-011: no tenant-scoped authority may leak into this control-plane mutation surface
decisions_required:
  - DESIGN-DEC-ADMINRBAC-PRODUCT: DECIDED (2026-03-20, Paresh)
  - SECURITY-DEC-ADMINRBAC-POSTURE: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-OPENING: DECIDED (2026-03-21, Paresh)
  - GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-OPENING: DECIDED (2026-03-21, Paresh)
  - GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-ELIGIBILITY: DECIDED (2026-03-21, Paresh)
  - GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING: DECIDED (2026-03-21, Paresh)
blockers: []
---

## Unit Summary

`TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001` is the sole implementation-ready AdminRBAC revoke/remove
child slice.

It is limited to one bounded control-plane mutation surface only:

- revoke/remove existing control-plane admin access only
- existing internal control-plane admin identities only
- existing revocable control-plane admin access only
- `SuperAdmin` actor only
- control-plane only

This unit must remain bounded. It does not authorize invite, role assignment, role change,
tenant-scope admin management, self-revoke, peer-`SuperAdmin` revoke/remove, blanket authority
expansion, impersonation or support bypass expansion, or broad auth redesign.

## Acceptance Criteria

- [ ] Revoke/remove is limited to control-plane admin access only
- [ ] The actor is `SuperAdmin` only at action time
- [ ] The target is limited to already-existing internal non-`SuperAdmin` control-plane admins
- [ ] Self-revoke is blocked
- [ ] Peer-`SuperAdmin` revoke/remove is blocked
- [ ] No hidden downgrade or role-delta semantics are introduced
- [ ] Successful revoke/remove immediately blocks new privileged control-plane access
- [ ] Active privileged control-plane sessions fail authorization on the next control-plane request after success
- [ ] Refresh-token or equivalent renewal invalidation is implemented in the same bounded child
- [ ] Explicit audit capture exists for every attempted revoke/remove, including successful, denied, and failed operations
- [ ] The minimum audit evidence shape remains mandatory
- [ ] No invite, role-change, tenant-scope, white-label admin, or broader authority expansion is introduced

## Files Allowlisted (Modify)

- `server/src/routes/control.ts` or a dedicated control-plane AdminRBAC revoke/remove module under `server/src/routes/control/`
- `services/controlPlaneService.ts` or a dedicated AdminRBAC revoke/remove control-plane service file
- `components/ControlPlane/AdminRBAC.tsx` — only if required to wire the bounded revoke/remove control for the existing control-plane surface
- `shared/contracts/openapi.control-plane.json` — only if required to govern the bounded revoke/remove contract
- `server/src/__tests__/**` or `server/tests/**` — only files strictly required to verify the bounded revoke/remove control-plane behavior
- `tests/**` — only files strictly required to verify the bounded control-plane revoke/remove UI behavior

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/units/TECS-FBW-ADMINRBAC.md`
- `governance/units/TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001.md`
- `governance/units/TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001.md`
- `governance/decisions/DESIGN-DEC-ADMINRBAC-PRODUCT.md`
- `governance/decisions/SECURITY-DEC-ADMINRBAC-POSTURE.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-ELIGIBILITY.md`

## Evidence Record

- Opening evidence class: `GOVERNANCE_RECONCILIATION_CONFIRMATION`
- Opening decision: `GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING`
- Eligibility decision: `GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-ELIGIBILITY`
- Broad parent remains non-open: `TECS-FBW-ADMINRBAC` is still `DESIGN_GATE`
- Closed clarification chain preserved: `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001` and `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001` both remain `CLOSED`
- This unit is the only opened implementation-ready revoke/remove slice and is bounded by the preserved actor, target, invalidation, audit, and exclusion locks

## Exact In-Scope Boundary

The exact in-scope boundary of this unit is:

- revoke/remove existing control-plane admin access only
- control-plane only
- `SuperAdmin` actor only
- already-existing internal control-plane admin identity only
- existing revocable control-plane admin access only
- first safe target class limited to existing non-`SuperAdmin` internal control-plane admins
- no self-revoke
- no peer-`SuperAdmin` revoke/remove
- no hidden downgrade or role-delta semantics
- immediate block on new privileged control-plane access after success
- active privileged control-plane sessions fail authorization on the next control-plane request after success
- refresh-token or equivalent renewal invalidation in the same bounded child
- explicit audit capture for every attempted revoke/remove, including successful, denied, and failed operations

## Exact Exclusions

The exact out-of-scope boundary of this unit is:

- invite
- invitation delivery
- invitation acceptance
- account bootstrap
- account creation
- role assignment
- role change
- tenant scope
- broader authority expansion
- blanket `SuperAdmin` expansion
- impersonation or support-mode expansion
- self-revoke
- peer-`SuperAdmin` revoke/remove
- white-label admin scope
- tenant/org admin management
- broad auth redesign beyond the bounded invalidation behavior required above

## Boundary Locks Preserved

- Control-plane only
- `SuperAdmin` actor only
- existing non-`SuperAdmin` internal target only
- no self-revoke
- no peer-`SuperAdmin` revoke
- immediate privileged-session invalidation remains in scope
- immediate refresh-token invalidation remains in scope
- explicit audit traceability remains mandatory
- invite, role-change, tenant-scope, and broader authority expansion remain excluded

## Allowed Next Step

Implementation work is authorized only inside this bounded unit and only within the exact in-scope
boundary above.

## Forbidden Next Step

- Do **not** broaden this unit into invite work
- Do **not** broaden this unit into role assignment or role change work
- Do **not** broaden this unit into tenant-scope admin management
- Do **not** add self-revoke or peer-`SuperAdmin` revoke/remove behavior
- Do **not** add hidden downgrade or role-delta semantics
- Do **not** broaden into blanket `SuperAdmin` authority, impersonation, or support-mode expansion
- Do **not** redesign auth beyond the bounded invalidation behavior required for revoke/remove truthfulness
- Do **not** open any second AdminRBAC child unit under this step

## Drift Guards

- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`; this child unit does not open the broad parent
- This unit is control-plane only; tenant-plane, white-label, and org-admin scope remain out of scope
- `SuperAdmin` mutation authority remains explicit and auditable; no delegated or ambient bypass may be inferred
- First safe target class remains existing non-`SuperAdmin` internal control-plane admins only
- Invalidation behavior is part of this bounded child and must not be deferred as ambient or eventual-only behavior
- Audit minimums remain mandatory and must cover successful, denied, and failed attempts

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Why is this child unit open now? | `governance/decisions/GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING.md` |
| Why does the broad parent remain non-open? | `governance/units/TECS-FBW-ADMINRBAC.md` |
| What eligibility decision made this opening lawful? | `governance/decisions/GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-ELIGIBILITY.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-21 — `GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING`. Status recorded as `OPEN` as the sole
implementation-ready AdminRBAC revoke/remove child slice, with the broad parent preserved as
`DESIGN_GATE` and all recorded control-plane, actor, target, invalidation, audit, and exclusion
locks carried forward unchanged.