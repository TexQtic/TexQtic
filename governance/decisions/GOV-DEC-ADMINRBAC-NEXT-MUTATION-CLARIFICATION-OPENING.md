# GOV-DEC-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-OPENING

Decision ID: GOV-DEC-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-OPENING
Title: Open one bounded AdminRBAC next mutation child boundary clarification unit and no implementation work
Status: DECIDED
Date: 2026-03-21
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- no implementation unit is currently `OPEN`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` is `CLOSED`
- `GOV-DEC-ADMINRBAC-POST-CLOSE-DISPOSITION` is `DECIDED` and explicitly selected no next AdminRBAC slice

The current AdminRBAC posture is already narrowed in one important way:

- the first truthful child slice was read-only registry visibility only
- the broad parent still must not open directly
- any later AdminRBAC mutation or broader authority work requires a separate bounded child-unit sequencing decision

Current canonical AdminRBAC records also show why a direct mutation opening is not yet truthful:

- invite, revoke/remove, and role assignment/change remain bundled inside the broad parent posture
- invitation transport, account-setup mechanics, session invalidation, token propagation, and audit-shape questions still risk being smuggled into a mutation-first opening unless explicitly bounded
- the security posture remains strict: mutation authority is `SuperAdmin` only, terminology lock is mandatory, and no blanket read-everything inference is authorized

## Problem Statement

TexQtic now needs one explicit governed step that clarifies the next truthful AdminRBAC mutation child after the closed registry-read slice.

Without that clarification, TexQtic would be forced either to:

- reopen the broad parent implicitly, which governance has already rejected
- or open a mutation implementation child against an under-specified boundary, which current AdminRBAC decisions also do not support

The smallest truthful next step is therefore not implementation. It is one bounded governance clarification unit only.

## Decision

TexQtic opens exactly one bounded governance clarification unit:

- `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`
- title: `AdminRBAC next mutation child boundary clarification`

This is the sole authorized next governed unit.

The broad parent `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`.

No AdminRBAC implementation unit is opened by this decision.

## Exact In-Scope Boundary

The opened unit is limited to clarification of:

- which later AdminRBAC mutation child, if any, is the smallest truthful next candidate after the closed registry-read slice
- whether that later child should be invite, revoke/remove, role assignment/change, or explicit no-opening-yet disposition
- the exact in-scope and out-of-scope boundary for that later child
- whether invitation transport, invite acceptance, account setup, session invalidation, refresh-token propagation, token semantics, and audit-model detail belong outside that later child or must be explicitly bounded into it
- the exact posture that must be true before any future AdminRBAC mutation implementation opening may be considered

## Exact Out-of-Scope Boundary

This decision does **not** authorize:

- opening the broad parent `TECS-FBW-ADMINRBAC`
- opening any AdminRBAC implementation unit now
- invite implementation
- revoke/remove implementation
- role assignment/change implementation
- session invalidation implementation
- invitation transport, acceptance, or account-setup implementation
- frontend, backend, test, schema, migration, Prisma, or contract changes
- tenant-plane, white-label, RFQ, routing/domain, QA, or CI broadening

## Implementation Authorization Statement

This decision authorizes exactly one bounded governance clarification unit only:

- `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`

It does **not** authorize implementation work.

## Consequences

- Layer 0 now has exactly one `OPEN` governed unit
- `NEXT-ACTION` moves from `OPERATOR_DECISION_REQUIRED` to `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`
- `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` remains `CLOSED`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- any later AdminRBAC implementation opening must wait for the clarification result and must not be inferred from this opening alone

## Sequencing Impact

- `OPEN-SET.md` must show the new bounded clarification unit as `OPEN`
- `NEXT-ACTION.md` must point to `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`
- `SNAPSHOT.md` must reflect that the bounded clarification step is now the active governed unit
- a new Layer 1 unit record must exist for `TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001`

This decision opens exactly one bounded clarification step and no more.