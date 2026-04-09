---
unit_id: TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001
title: Control-plane admin access revoke/remove authority
type: IMPLEMENTATION
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-21
closed: 2026-03-21
verified: 2026-03-21
commit: d51a2a8
evidence: "TEST_VERIFICATION: tests/adminrbac-registry-read-ui.test.tsx PASS (6 tests) · TEST_VERIFICATION: server/src/__tests__/admin-rbac-revoke-remove.integration.test.ts PASS (4 tests) · CONTRACT_VALIDATION: pnpm validate:contracts PASS · GOVERNANCE_RECONCILIATION_CONFIRMATION: control-plane-only revoke/remove scope, actor/target/self-peer protection locks, next-request authorization failure, refresh-token invalidation, and audit traceability all preserved with no invite, role-change, tenant-scope, schema, migration, or broader auth redesign expansion"
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

`TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001` is the sole bounded AdminRBAC revoke/remove child slice
and is now `CLOSED`.

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

- [x] Revoke/remove is limited to control-plane admin access only
- [x] The actor is `SuperAdmin` only at action time
- [x] The target is limited to already-existing internal non-`SuperAdmin` control-plane admins
- [x] Self-revoke is blocked
- [x] Peer-`SuperAdmin` revoke/remove is blocked
- [x] No hidden downgrade or role-delta semantics are introduced
- [x] Successful revoke/remove immediately blocks new privileged control-plane access
- [x] Active privileged control-plane sessions fail authorization on the next control-plane request after success
- [x] Refresh-token or equivalent renewal invalidation is implemented in the same bounded child
- [x] Explicit audit capture exists for every attempted revoke/remove, including successful, denied, and failed operations
- [x] The minimum audit evidence shape remains mandatory
- [x] No invite, role-change, tenant-scope, white-label admin, or broader authority expansion is introduced

## Files Allowlisted (Modify)

- `server/src/routes/control.ts` or a dedicated control-plane AdminRBAC revoke/remove module under `server/src/routes/control/`
- `services/controlPlaneService.ts` or a dedicated AdminRBAC revoke/remove control-plane service file
- `components/ControlPlane/AdminRBAC.tsx` — only if required to wire the bounded revoke/remove control for the existing control-plane surface
- `shared/contracts/openapi.control-plane.json` — update in the same implementation wave if the bounded revoke/remove endpoint is newly exposed or its request/response contract changes
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
- This unit is the only bounded verified revoke/remove slice and remains bounded by the preserved actor, target, invalidation, audit, and exclusion locks
- Implementation commit: `d51a2a8` — `feat(adminrbac): implement bounded control-plane revoke-remove authority`
- Verification evidence: focused UI PASS (`6` tests), focused backend PASS (`4` tests), and `pnpm validate:contracts` PASS
- Request-time admin-record enforcement now preserves next-request authorization failure after revoke/remove without schema change or broader auth redesign

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

## Governance Sync

- Governance sync unit: `GOVERNANCE-SYNC-TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- Next-action posture after sync: `GOV-CLOSE-TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`
- Governance sync preserves control-plane-only revoke/remove posture, `SuperAdmin`-only actor lock, existing non-`SuperAdmin` internal target lock, self/peer-`SuperAdmin` denial, next-request authorization failure after revoke/remove, refresh-token invalidation, explicit audit traceability, `TECS-FBW-ADMINRBAC` as `DESIGN_GATE`, and no new opening implication

## Governance Closure

- Governance close unit: `GOV-CLOSE-TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`
- Status transition: `VERIFIED_COMPLETE` → `CLOSED`
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`
- Mandatory post-close audit result: `DECISION_REQUIRED`
- Closure preserves control-plane-only revoke/remove posture, `SuperAdmin`-only actor lock, existing non-`SuperAdmin` internal target lock, self/peer-`SuperAdmin` denial, next-request authorization failure after revoke/remove, refresh-token invalidation, explicit audit traceability, `TECS-FBW-ADMINRBAC` as `DESIGN_GATE`, and no invite, role-change, tenant-scope, or broader authority expansion implication

## Allowed Next Step

No further implementation or governance-sync work is authorized inside this closed unit.

## Forbidden Next Step

- Do **not** broaden this unit into invite work
- Do **not** broaden this unit into role assignment or role change work
- Do **not** broaden this unit into tenant-scope admin management
- Do **not** add self-revoke or peer-`SuperAdmin` revoke/remove behavior
- Do **not** add hidden downgrade or role-delta semantics
- Do **not** broaden into blanket `SuperAdmin` authority, impersonation, or support-mode expansion
- Do **not** redesign auth beyond the bounded invalidation behavior required for revoke/remove truthfulness
- Do **not** open any second AdminRBAC child unit under this step
- Do **not** treat governance sync as closure; a separate close step is still required
- Do **not** infer invite opening from this closure
- Do **not** infer role-change opening from this closure
- Do **not** infer tenant-scope expansion from this closure
- Do **not** infer broader authority expansion from this closure

## Drift Guards

- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`; this child unit does not open the broad parent
- This unit is control-plane only; tenant-plane, white-label, and org-admin scope remain out of scope
- `SuperAdmin` mutation authority remains explicit and auditable; no delegated or ambient bypass may be inferred
- First safe target class remains existing non-`SuperAdmin` internal control-plane admins only
- Invalidation behavior is part of this bounded child and must not be deferred as ambient or eventual-only behavior
- Audit minimums remain mandatory and must cover successful, denied, and failed attempts
- Governance sync for this unit is recording only; no new implementation, no new opening, and no closure is implied by the `VERIFIED_COMPLETE` state
- Closure of this bounded unit does not authorize invite, role-change, tenant-scope, or broader AdminRBAC implementation work
- Closure of this bounded unit does not alter `TECS-FBW-ADMINRBAC` from `DESIGN_GATE`

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Why is this child unit open now? | `governance/decisions/GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING.md` |
| Why does the broad parent remain non-open? | `governance/units/TECS-FBW-ADMINRBAC.md` |
| What eligibility decision made this opening lawful? | `governance/decisions/GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-ELIGIBILITY.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-21 — `GOV-CLOSE-TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`. Status transitioned:
`VERIFIED_COMPLETE` → `CLOSED` after implementation commit `d51a2a8`, governance-sync commit
`794fcd4`, focused UI PASS (`6` tests), focused backend PASS (`4` tests), `pnpm validate:contracts`
PASS, and mandatory post-close audit result `DECISION_REQUIRED`. Scope remained bounded to
control-plane admin access revoke/remove authority only, with `SuperAdmin` actor only, existing
non-`SuperAdmin` internal target only, no self-revoke, no peer-`SuperAdmin` revoke, next-request
authorization failure after revoke/remove preserved, refresh-token invalidation preserved, and
explicit audit traceability required. Invite, role-change, tenant-scope, and broader authority
expansion remained excluded, `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`, no broader AdminRBAC
implementation opening was created, and resulting Layer 0 posture returned to
`OPERATOR_DECISION_REQUIRED`.
