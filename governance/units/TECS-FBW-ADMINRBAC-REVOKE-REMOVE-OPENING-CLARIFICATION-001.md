---
unit_id: TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001
title: AdminRBAC revoke/remove opening posture clarification
type: GOVERNANCE
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-21
closed: null
verified: null
commit: null
evidence: "GOVERNANCE_RECONCILIATION_CONFIRMATION: opening recorded as the sole bounded next governed unit; revoke/remove remains candidate-only, no implementation child is opened or implied, and the clarification boundary is limited to actor/target safety posture, self-revoke or same-highest-role guard posture, active-session and refresh-token invalidation semantics, minimum audit evidence shape, and preserved exclusions only"
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

- [ ] It is explicitly determined whether a later control-plane admin access revoke/remove child may be truthfully opened at all
- [ ] The exact actor/target safety posture for that later child is recorded
- [ ] The exact self-revoke or same-highest-role guard posture for that later child is recorded
- [ ] The exact active-session and refresh-token invalidation semantics for that later child are recorded as explicit bounded scope rather than ambient assumption
- [ ] The exact minimum audit evidence shape for that later child is recorded
- [ ] The exact out-of-scope boundary for that later child is recorded and preserves invite, role-change, tenant-scope, and broader authority exclusions
- [ ] No implementation, verification, governance sync, or closure work is authorized inside this unit

## Files Allowlisted (Modify)

*To be defined by the later TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001 clarification prompt.*

Expected candidates for the future clarification prompt only:

- `governance/decisions/*.md` — only files strictly required to record the clarification outcome
- `governance/units/TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001.md` — later evidence or closure updates only in the subsequent governance step

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

## Evidence Record

- Opening decision: `GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-OPENING`
- Broad parent remains non-open: `TECS-FBW-ADMINRBAC` is still `DESIGN_GATE`
- Closed first child preserved: `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` remains `CLOSED`
- Closed mutation-candidate clarification preserved: `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001` remains `CLOSED`
- Current revoke/remove opening question still unresolved at the exact pre-opening posture level:
  - actor/target safety posture
  - self-revoke and same-highest-role guard posture
  - active-session and refresh-token invalidation semantics
  - exact minimum audit evidence shape
  - preserved exclusions for invite, role-change, tenant-scope, and broader authority expansion

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

## Exact In-Scope Boundary

This unit may clarify only the following questions:

- whether a later revoke/remove child may be truthfully opened at all
- the exact actor/target safety posture for that later child
- the exact self-revoke or same-highest-role guard posture for that later child
- the exact active-session and refresh-token invalidation semantics for that later child
- the exact minimum audit evidence shape required by the security posture for that later child
- the exact preserved exclusions that must remain outside that later child

## Exact Exclusions

The following remain out of scope for this clarification unit and must not be bundled into it:

- revoke/remove implementation
- invite / invitation delivery
- invite acceptance
- account setup or password bootstrap
- creation of new internal admin identities
- role assignment or role change mutation
- tenant-plane membership changes
- white-label staff / tenant admin / org-plane admin management
- blanket cross-tenant read expansion
- any blanket `SuperAdmin can do everything` posture
- schema, migrations, Prisma, product code, test code, UI code, API code, or auth/session implementation changes

## Allowed Next Step

Bounded governance clarification only for this unit.

## Forbidden Next Step

- Do **not** implement revoke/remove in this unit
- Do **not** implement invite, role assignment/change, session invalidation, token propagation, or invitation transport in this unit
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

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Why is this unit open now? | `governance/decisions/GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-OPENING.md` |
| Why does the broad parent remain non-open? | `governance/units/TECS-FBW-ADMINRBAC.md` |
| Why does the closed registry-read child not authorize continuation? | `governance/decisions/GOV-DEC-ADMINRBAC-POST-CLOSE-DISPOSITION.md` |
| What constrains any future mutation child? | `governance/decisions/SECURITY-DEC-ADMINRBAC-POSTURE.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**