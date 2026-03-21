# GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-OPENING

Decision ID: GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-OPENING
Title: Open one bounded AdminRBAC revoke/remove opening posture clarification unit and no implementation work
Status: DECIDED
Date: 2026-03-21
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- no implementation unit is currently `OPEN`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` is `CLOSED`
- `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001` is `CLOSED`
- the closed clarification result preserved revoke/remove as candidate-only and did not open any AdminRBAC implementation unit

The current AdminRBAC posture is already narrowed in one important way:

- the first truthful child slice was read-only registry visibility only
- the broad parent still must not open directly
- the closed clarification result identified control-plane admin access revoke/remove authority as the narrowest truthful next mutation child candidate
- that same clarification also recorded unresolved opening-boundary questions: actor/target safety posture, self-revoke or same-highest-role guard posture, active-session and refresh-token invalidation semantics, and minimum audit evidence shape

Current canonical AdminRBAC records also show why a direct revoke/remove opening is not yet truthful:

- revoke/remove remains candidate-only rather than opened
- the security posture remains strict: mutation authority is `SuperAdmin` only, terminology lock is mandatory, and no blanket read-everything inference is authorized
- the unresolved revoke/remove opening prerequisites still risk being smuggled into a mutation implementation opening unless explicitly bounded first

Verification posture for this opening decision: `GOVERNANCE_RECONCILIATION_CONFIRMATION`.

## Problem Statement

TexQtic now needs one explicit governed step that clarifies the exact posture required before any later revoke/remove implementation opening can be truthfully considered.

Without that clarification, TexQtic would be forced either to:

- infer that the candidate-only revoke/remove result already authorizes an implementation opening, which governance has explicitly rejected
- or open a revoke/remove implementation child against an under-specified safety and audit boundary, which current AdminRBAC decisions also do not support

The smallest truthful next step is therefore not implementation. It is one bounded governance clarification unit only.

## Decision

TexQtic opens exactly one bounded governance clarification unit:

- `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001`
- title: `AdminRBAC revoke/remove opening posture clarification`

This is the sole authorized next governed unit.

The broad parent `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`.

No AdminRBAC implementation unit is opened by this decision.

## Exact In-Scope Boundary

The opened unit is limited to clarification of:

- whether a later control-plane admin access revoke/remove child may be truthfully opened at all
- the exact actor/target safety posture required for that later child
- the exact self-revoke or same-highest-role guard posture required for that later child
- the exact active-session and refresh-token invalidation semantics that must be explicit rather than ambient or assumed
- the exact minimum audit evidence shape required for that later child
- the exact preserved exclusions that must remain outside that later child
- the exact posture that must be true before any future revoke/remove implementation opening may be considered

## Exact Out-of-Scope Boundary

This decision does **not** authorize:

- opening the broad parent `TECS-FBW-ADMINRBAC`
- opening any AdminRBAC implementation unit now
- revoke/remove implementation
- invite implementation
- role assignment/change implementation
- tenant-scope implementation
- broader authority expansion
- frontend, backend, test, schema, migration, Prisma, or contract changes
- white-label, RFQ, routing/domain, QA, or CI broadening

## Implementation Authorization Statement

This decision authorizes exactly one bounded governance clarification unit only:

- `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001`

It does **not** authorize implementation work.

## Consequences

- Layer 0 now has exactly one `OPEN` governed unit
- `NEXT-ACTION` moves from `OPERATOR_DECISION_REQUIRED` to `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001`
- `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001` remains `CLOSED`
- revoke/remove remains candidate-only rather than opened
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- any later AdminRBAC implementation opening must wait for the clarification result and must not be inferred from this opening alone

## Sequencing Impact

- `OPEN-SET.md` must show the new bounded clarification unit as `OPEN`
- `NEXT-ACTION.md` must point to `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001`
- `SNAPSHOT.md` must reflect that the bounded clarification step is now the active governed unit
- a new Layer 1 unit record must exist for `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001`

This decision opens exactly one bounded clarification step and no more.