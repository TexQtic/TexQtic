# GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-ELIGIBILITY

Decision ID: GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-ELIGIBILITY
Title: The closed AdminRBAC revoke/remove clarification chain is sufficient to make one separate bounded revoke/remove opening eligible, but does not itself open revoke/remove work
Status: DECIDED
Date: 2026-03-21
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001` is `CLOSED`
- `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001` is `CLOSED`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- revoke/remove is `READY_FOR_OPENING` only as a closed clarification result and is not yet opened or authorized for implementation

The completed governed AdminRBAC chain now also establishes that:

- the broad parent still must not open directly
- the narrowest truthful next mutation candidate remains control-plane admin access revoke/remove authority only
- the required opening boundary has now been explicitly clarified rather than left ambient or guessed
- closure of the clarification chain did not itself authorize revoke/remove implementation by implication

The decision question is therefore no longer whether the revoke/remove opening boundary is still
under-specified. The decision question is whether the now-closed clarification chain is sufficient
to allow one separate bounded revoke/remove opening step to be considered.

Verification posture for this decision: `GOVERNANCE_RECONCILIATION_CONFIRMATION`.

## Problem Statement

TexQtic now needs one explicit governance determination on whether a later bounded control-plane
revoke/remove implementation opening is sequencing-eligible.

Without that determination, TexQtic would be forced either to:

- infer that the closed clarification result already authorizes implementation, which governance has explicitly rejected
- or remain indefinitely at `OPERATOR_DECISION_REQUIRED` even though the required revoke/remove opening posture is already canonically clarified

The smallest truthful next step is therefore one decision-only eligibility determination.

## Required Determinations

### 1. Is a later bounded revoke/remove implementation opening now sequencing-eligible?

Yes.

The closed clarification chain is now sufficient to make one separate bounded revoke/remove
opening governance-eligible. The previously unresolved questions are no longer ambient:

- actor boundary is explicit
- target boundary is explicit
- self-revoke and same-highest-role protections are explicit
- immediate privileged-session invalidation is explicit
- immediate refresh-token invalidation is explicit
- minimum audit traceability is explicit
- invite, role-change, tenant-scope, and broader authority expansion remain explicitly excluded

### 2. Does this decision itself open revoke/remove work?

No.

TexQtic still preserves the canonical sequence:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

This decision determines eligibility only. It does not create the later opening.

### 3. Is a separate later opening now the next lawful AdminRBAC move?

Yes, if AdminRBAC is separately chosen for continuation.

The next lawful AdminRBAC move is one separate bounded revoke/remove opening artifact only.
That later opening remains optional and still requires a separate explicit governance step.

### 4. What exact constraints remain mandatory if a later opening is ever created?

Any later bounded revoke/remove opening must preserve all of the following:

- control-plane only
- `SuperAdmin` actor only
- existing non-`SuperAdmin` internal admin target only
- no self-revoke
- no peer-`SuperAdmin` revoke
- immediate privileged-session invalidation
- immediate refresh-token invalidation
- explicit audit traceability

### 5. What remains explicitly excluded even if later opening eligibility now exists?

The following remain explicitly excluded unless separately authorized later:

- invite
- role change
- tenant scope
- broader authority expansion

## Decision

`GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-ELIGIBILITY` is now `DECIDED`.

The authoritative disposition is:

1. the closed AdminRBAC revoke/remove clarification chain is sufficient to make one separate
   bounded revoke/remove opening governance-eligible
2. the broad parent `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
3. no revoke/remove work is opened by this decision itself
4. any actual revoke/remove movement still requires a separate explicit opening artifact
5. any later opening must preserve the exact clarified constraints listed above and nothing broader
6. invite, role-change, tenant-scope, and broader authority expansion remain excluded unless separately authorized later

## Non-Authorization Statement

This decision does **not**:

- open any implementation unit
- authorize immediate revoke/remove implementation
- open the broad parent `TECS-FBW-ADMINRBAC`
- authorize invite work
- authorize role-change work
- authorize tenant-scope work
- authorize broader authority expansion
- modify product code, tests, schema, migrations, Prisma, routes, or contracts

## Sequence Discipline

The required sequence remains:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

This decision completes the eligibility judgment only.

If TexQtic chooses to move forward, a separate bounded revoke/remove opening artifact is still
required.

## Boundary Preservation

Any later opening, if separately created, must preserve all of the following:

- control-plane only posture
- `SuperAdmin`-only mutation posture
- existing non-`SuperAdmin` internal admin target only
- no self-revoke or peer-`SuperAdmin` revoke
- immediate privileged-session and refresh-token invalidation
- explicit audit traceability
- no invite, role-change, tenant-scope, or broader authority expansion by implication
- no reopening of the already-closed clarification units

## Consequences

- `governance/control/OPEN-SET.md` remains unchanged
- `governance/control/NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`
- `governance/control/SNAPSHOT.md` is refreshed for carry-forward posture
- both closed AdminRBAC clarification unit records remain unchanged
- no implementation-ready unit is opened by this decision
- the next possible AdminRBAC move, if separately chosen later, is a bounded revoke/remove opening artifact only

## Exact Operator Posture After This Decision

- result class: bounded revoke/remove opening eligible
- broad parent opened now: no
- bounded revoke/remove opening artifact now created: no
- separate opening still required: yes
- resulting `NEXT-ACTION`: `OPERATOR_DECISION_REQUIRED`

Any further AdminRBAC movement still requires a separate later opening artifact that selects at
most one bounded revoke/remove slice and nothing broader.