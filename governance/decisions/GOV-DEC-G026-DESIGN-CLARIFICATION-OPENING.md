# GOV-DEC-G026-DESIGN-CLARIFICATION-OPENING

Decision ID: GOV-DEC-G026-DESIGN-CLARIFICATION-OPENING
Title: Open one bounded G-026 resolver-role discrepancy clarification unit and no routing work
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `TECS-G026-H-001` is `CLOSED`
- the broad G-026 v1 routing stream remains unopened
- `GOV-DEC-G026-POST-CLOSE-DISPOSITION` is `DECIDED`
- `GOV-DEC-G026-DISCREPANCY-DISPOSITION` is `DECIDED`
- the discrepancy posture is blocking until a bounded design-clarification step is completed
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- no implementation-ready unit is currently `OPEN`

The preserved discrepancy posture is already narrowed to one truth question:

- what exact canonical resolver-role posture for `texqtic_service` must be true before any future
  bounded routing opening can be considered

The discrepancy-disposition decision already rejected two stronger moves:

- no routing opening now
- no cleanup unit now

That means the smallest truthful next step is not implementation and not cleanup. It is one bounded
design-clarification unit only.

## Problem Statement

TexQtic now needs one explicit governed step that clarifies the intended target posture for
`texqtic_service` before any routing-opening question can return.

Without that clarification, TexQtic would be forced either to:

- treat unresolved discrepancy notes as implicitly tolerated, which governance has already rejected
- or open cleanup implementation against an undefined target state, which governance has also rejected

## Decision

TexQtic opens exactly one bounded design-clarification unit:

- `TECS-G026-DESIGN-CLARIFICATION-001`
- title: `texqtic_service resolver-role discrepancy posture clarification`

This is the sole authorized next governed unit.

The broad G-026 routing stream remains unopened.

No routing unit is opened by this decision.

No cleanup unit is opened by this decision.

## Exact In-Scope Boundary

The opened unit is limited to clarification of:

- the intended canonical resolver-role posture for `texqtic_service`
- whether the extra `SELECT` grants are acceptable residuals or inconsistent with the target posture
- whether duplicate/equivalent `postgres` membership rows are acceptable or require normalization
- what exact bounded posture must be true before any future routing opening may be considered
- whether a later cleanup unit is required and, if so, its exact bounded scope

## Exact Out-of-Scope Boundary

This decision does **not** authorize:

- broad G-026 opening
- any routing implementation unit
- any cleanup implementation unit
- custom-domain, apex-domain, or DNS-verification scope
- resolver endpoint, middleware, cache, invalidation, or WL domains implementation work
- product code, tests, schema, migrations, routes, or contract changes

## Implementation Authorization Statement

This decision authorizes exactly one bounded design-clarification unit only:

- `TECS-G026-DESIGN-CLARIFICATION-001`

It does **not** authorize implementation work.

## Consequences

- Layer 0 now has exactly one `OPEN` governed unit
- `NEXT-ACTION` moves from `OPERATOR_DECISION_REQUIRED` to `TECS-G026-DESIGN-CLARIFICATION-001`
- broad G-026 remains held and unopened
- discrepancy posture remains unresolved pending the bounded clarification unit
- any later routing opening question must wait for the clarification result

## Sequencing Impact

- `OPEN-SET.md` must show the new bounded clarification unit as `OPEN`
- `NEXT-ACTION.md` must point to `TECS-G026-DESIGN-CLARIFICATION-001`
- `SNAPSHOT.md` must reflect that the bounded clarification step is now the active governed unit
- a new Layer 1 unit record must exist for `TECS-G026-DESIGN-CLARIFICATION-001`

This decision opens exactly one bounded clarification step and no more.