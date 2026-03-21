---
unit_id: TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001
title: AdminRBAC next mutation child boundary clarification
type: GOVERNANCE
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-21
closed: 2026-03-21
verified: 2026-03-21
commit: ec2c614
evidence: "GOVERNANCE_RECONCILIATION_CONFIRMATION: clarification outcome recorded and verified; narrowest truthful next mutation child candidate remains control-plane admin access revoke/remove authority only, with SuperAdmin-only actor posture, explicit audit requirements, session/token invalidation explicitly treated as in-scope boundary rather than deferred ambient behavior, governance:lint PASS, and no implementation child opened or implied"
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
blockers: []
---

## Unit Summary

TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001 is the sole bounded next governed unit for
AdminRBAC.

It is limited to one governance/design question only: what the next truthful AdminRBAC mutation
child would be after the closed registry-read slice, and what exact boundary that later child must
carry before any implementation opening may be considered.

This unit does not authorize implementation work. It does not reopen
`TECS-FBW-ADMINRBAC-REGISTRY-READ-001`. It does not open the broad parent
`TECS-FBW-ADMINRBAC`.

## Acceptance Criteria

- [x] It is explicitly determined whether invite, revoke/remove, role assignment/change, or explicit no-opening-yet is the next truthful AdminRBAC child disposition
- [x] The exact in-scope boundary for that later child is recorded
- [x] The exact out-of-scope boundary for that later child is recorded
- [x] It is explicitly determined whether invitation transport, account setup, session invalidation, token propagation, and audit-model detail must remain outside that later child or be explicitly bounded into it
- [x] It is explicitly determined whether a later implementation opening is justified and, if so, what exact bounded unit it would be
- [x] No implementation, verification, governance sync, or closure work is authorized inside this unit

## Files Allowlisted (Modify)

*To be defined by the later TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001 clarification prompt.*

Expected candidates for the future clarification prompt only:

- `governance/decisions/*.md` — only files strictly required to record the clarification outcome
- `governance/units/TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001.md` — later evidence or closure updates only in the subsequent governance step

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/units/TECS-FBW-ADMINRBAC.md`
- `governance/units/TECS-FBW-ADMINRBAC-REGISTRY-READ-001.md`
- `governance/decisions/DESIGN-DEC-ADMINRBAC-PRODUCT.md`
- `governance/decisions/SECURITY-DEC-ADMINRBAC-POSTURE.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-POST-CLOSE-DISPOSITION.md`

## Evidence Record

- Opening decision: `GOV-DEC-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-OPENING`
- Implementation commit: `ec2c614` — `governance(adminrbac): clarify next mutation child boundary`
- Verification confirmation: governance-only verification completed with `pnpm run governance:lint` PASS and clean worktree; no verification commit required
- Broad parent remains non-open: `TECS-FBW-ADMINRBAC` is still `DESIGN_GATE`
- Closed first child preserved: `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` remains `CLOSED`
- Current mutation question still unresolved at the exact child-boundary level:
  - invite
  - revoke/remove
  - role assignment/change
  - session invalidation and token propagation coupling
  - invitation transport and account-setup coupling
  - exact audit-model boundary for a later mutation child

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

## Clarification Outcome

The narrowest truthful next mutation child candidate is:

- **candidate title:** `Control-plane admin access revoke/remove authority`

This candidate is narrower and more truthful than invite or role assignment/change because:

- it operates only on already-existing internal control-plane admin identities
- it does not require invitation delivery, invite acceptance, or account-bootstrap mechanics
- it does not require multi-role expansion or role-family redesign beyond removing an existing
  bounded admin access posture
- it can remain control-plane only and preserve the already-closed read-only registry slice as a
  separate completed child

This unit does **not** open that candidate. It records only that revoke/remove is the narrowest
truthful next mutation-child candidate currently supported by the existing AdminRBAC governance
truth.

## Exact In-Scope Boundary For The Candidate

If a later separate governance decision/opening ever authorizes this candidate, its exact in-scope
boundary must be limited to:

- removal or revocation of an already-existing internal control-plane admin access posture
- control-plane only scope
- `SuperAdmin` as the acting mutation role only
- explicit bounded targeting of an existing internal control-plane admin identity
- explicit audit capture for the revoke/remove action
- explicit revoke/remove outcome semantics for the affected control-plane access posture
- explicit session / refresh-token / active-privilege invalidation posture as part of the bounded
  child, because current canonical records already classify that coupling as integral rather than
  safely deferrable ambient behavior
- system surfaces limited to the control-plane admin identity store, the control-plane auth/session
  boundary, and the audit boundary required to make the mutation explicit and attributable

## Exact Exclusions

The following remain out of scope for that candidate and must not be bundled into it:

- invite / invitation delivery
- invite acceptance
- account setup or password bootstrap
- creation of new internal admin identities
- role assignment or role change mutation
- self-elevation or self-role widening
- tenant-plane membership changes
- white-label staff / tenant admin / org-plane admin management
- blanket cross-tenant read expansion
- any blanket `SuperAdmin can do everything` posture
- impersonation, step-up authentication redesign, or broader support-mode expansion
- schema, migrations, Prisma, product code, test code, UI code, API code, or auth/session redesign outside the explicit revoke/remove boundary itself

Invite remains separate because it drags invitation transport, acceptance, and account-bootstrap
mechanics that are not required for revoke/remove.

Role assignment/change remains separate because it drags role-delta semantics, possible same-session
privilege transition behavior, and a broader authority-shaping surface than simple access removal.

## Prerequisites And Blocking Conditions

Any later opening for the revoke/remove candidate would still require the later decision/opening to
state all of the following explicitly:

- exact actor/target safety posture, including no self-elevation and no implicit self-widening
- exact self-revoke or same-highest-role guard posture so the candidate does not silently create
  lockout or authority-collapse behavior by assumption
- exact revoke/remove outcome semantics for active sessions and refresh-token or equivalent
  continuing access posture
- exact minimum audit evidence shape required by the security posture
- exact preservation of control-plane-only scope and terminology lock

Until those conditions are explicitly bounded in a later decision/opening, no revoke/remove
implementation opening would be lawful.

## Terminology And Posture Locks Preserved

This clarification preserves all existing AdminRBAC locks:

- `TenantAdmin`, `PlatformAdmin`, and `SuperAdmin` remain distinct terms
- `TenantAdmin` remains out of scope for this control-plane stream
- `SuperAdmin` remains the only mutation actor class for future AdminRBAC mutation work
- the closed read-only child `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` remains truthful and closed
- the broad parent `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- no blanket `SuperAdmin can read everything` or `SuperAdmin can do everything` collapse is authorized
- control-plane-only posture remains mandatory

## Recommended Later Governance Step

The exact shape of a possible later governance step, if later chosen, should be:

- one separate decision/opening step only
- one bounded candidate only: `Control-plane admin access revoke/remove authority`
- one explicit statement that session / refresh-token invalidation posture is in-scope and not
  ambient or deferred by assumption
- one explicit statement that invite, role change, transport, acceptance, account setup, tenant
  scope, and broader authority expansion remain out of scope

This unit does **not** perform that decision/opening.

## Governance Sync

- Governance sync unit: `GOVERNANCE-SYNC-TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- Next-action posture after sync: `GOV-CLOSE-TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`
- Sync preserves clarification-only posture, keeps the next mutation child candidate-only, and does not open any AdminRBAC implementation unit

## Governance Closure

- Governance close unit: `GOV-CLOSE-TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`
- Status transition: `VERIFIED_COMPLETE` → `CLOSED`
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`
- Mandatory post-close audit result: `DECISION_REQUIRED`
- Closure preserves clarification-only posture, keeps revoke/remove candidate-only and not opened, preserves `TECS-FBW-ADMINRBAC` as `DESIGN_GATE`, and creates no AdminRBAC implementation opening

## Allowed Next Step

No further implementation or governance-sync work is authorized inside this closed unit.

No further action is authorized inside this closed child unit.

## Forbidden Next Step

- Do **not** implement invite, revoke/remove, role assignment/change, session invalidation, token propagation, or invitation transport in this unit
- Do **not** open the broad parent `TECS-FBW-ADMINRBAC` in this unit
- Do **not** reopen `TECS-FBW-ADMINRBAC-REGISTRY-READ-001`
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
| Why is this unit open now? | `governance/decisions/GOV-DEC-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-OPENING.md` |
| Why does the broad parent remain non-open? | `governance/units/TECS-FBW-ADMINRBAC.md` |
| Why does the closed registry-read child not authorize continuation? | `governance/decisions/GOV-DEC-ADMINRBAC-POST-CLOSE-DISPOSITION.md` |
| What constrains any future mutation child? | `governance/decisions/SECURITY-DEC-ADMINRBAC-POSTURE.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-21 — `GOV-CLOSE-TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`. Status
transitioned: `VERIFIED_COMPLETE` → `CLOSED` after the already-recorded implementation,
verification, and governance-sync chain, together with mandatory post-close audit result
`DECISION_REQUIRED`. The unit remained clarification-only, the next mutation child
remained candidate-only and limited to control-plane admin access revoke/remove
authority, no AdminRBAC implementation unit was opened, TECS-FBW-ADMINRBAC remains
`DESIGN_GATE`, and no new opening is implied by this closure.