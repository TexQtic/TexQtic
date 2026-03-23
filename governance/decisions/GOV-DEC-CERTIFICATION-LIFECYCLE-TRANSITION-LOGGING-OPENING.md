# GOV-DEC-CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-OPENING

Decision ID: GOV-DEC-CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-OPENING
Title: Open one bounded implementation unit for certification transition applicability and lifecycle logging
Status: DECIDED
Date: 2026-03-23
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-001` is `CLOSED` with result `OPENING_CANDIDATE`
- the tenant certification transition surface is already installed
- the backend certification transition path currently cannot apply transitions because
  `certification_lifecycle_logs` does not exist
- certification metadata PATCH UI remains separate and out of scope
- maker-checker mutation work remains separate and out of scope
- broad certification redesign remains out of scope

The current decision authority already established that the truthful candidate is one bounded unit,
not a required split:

- the tenant Certifications UI already exposes a live transition surface
- the frontend transition helper is already installed
- the tenant transition route is already installed
- the backend certification transition service currently routes into a guaranteed
  `CERTIFICATION_LOG_DEFERRED` denial path
- the missing lifecycle-log persistence is the exact root issue blocking application on that
  already-exposed path

The same decision also established that the stale `G-023` deferral framing is no longer the
correct governance owner for this certification-specific gap because `G-023` is an already-closed
reasoning-log stream with a different exact scope.

## Problem Statement

TexQtic now needs one implementation-ready governed unit for the certification transition/logging
gap without widening into adjacent certification, maker-checker, schema-redesign, or unrelated
logging work.

Without this opening, governance would know that the certification transition/logging slice is a
valid opening candidate, but there would still be no canonical implementation-ready unit authorized
to carry that slice through later implementation and verification phases.

## Decision

TexQtic opens exactly one bounded implementation unit:

- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- title: `Open bounded implementation unit for certification transition applicability and lifecycle logging`

This is the sole authorized next governed implementation unit for this defect family.

The unit remains one slice only. It does not split transition applicability away from lifecycle-log
persistence because current repo truth shows one direct causal chain across the already-exposed
tenant transition path.

## Exact Bounded Implementation Objective

Make the currently exposed certification transition path lawfully applicable by providing the
lifecycle-log persistence required for certification transition application in the existing tenant
transition flow.

## Exact In-Scope Boundary

The opened unit is limited to the currently exposed certification transition path only, including:

- tenant Certifications UI transition surface
- frontend certification transition helper
- tenant certification transition route
- backend certification transition service/state-machine path
- certification lifecycle-log persistence required for certification transition application on that
  path
- bounded verification definition for that same end-to-end transition applicability slice

## Exact Out-of-Scope Boundary

This decision does **not** authorize:

- certification metadata PATCH UI
- maker-checker mutation work
- broad certification redesign
- unrelated AI/logging streams
- vector or embedding work
- generic audit-log platform work
- white-label or non-certification transition surfaces
- implementation in this opening operation
- schema edits in this governance step
- code edits in this governance step
- migrations in this governance step
- contract or OpenAPI edits in this governance step
- opening any second child unit

## Exact Verification Profile For The Later Implementation Unit

- unit type: bounded implementation for currently exposed certification transition applicability
  and lifecycle logging
- required verification modes:
  - repo inspection
  - governance history inspection
  - focused implementation verification against the installed certification transition path
- acceptance boundary for the later implementation/verification phases:
  - the currently exposed certification transition path becomes lawfully applicable
  - certification lifecycle-log persistence required by the current state-machine path is present
    and participates in that bounded flow
  - the unit remains one bounded slice end-to-end
  - adjacent certification/admin/maker-checker work remains excluded
- exclusions:
  - no runtime/browser verification is authorized by this opening step itself
  - no implementation is performed by this opening step itself
  - no broader certification redesign or unrelated logging platform work is implied

## Stale G-023 Reference Handling

For this certification-specific gap, the old `G-023` deferral framing is superseded at governance
opening level.

Meaning:

- current code/history may still contain stale `G-023` references
- those references are not the governing owner for this opened certification unit
- the governing owner for the certification transition/logging slice is now
  `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`

This clarification does not edit product code and does not retroactively rewrite historical code
comments. It corrects governance ownership and future sequencing framing only.

## Implementation Authorization Statement

This decision authorizes exactly one implementation-ready unit only:

- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`

It does **not** authorize:

- a second certification child unit
- metadata editing work
- maker-checker mutation work
- broad certification redesign
- unrelated AI/logging stream work

## Consequences

- Layer 0 now has exactly one `OPEN` implementation-ready unit
- `NEXT-ACTION` moves from `OPERATOR_DECISION_REQUIRED` to
  `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- the certification transition/logging candidate remains one bounded slice and does not split by
  implication
- stale `G-023` ownership is superseded for this exact certification stream at governance level

## Sequencing Impact

- `OPEN-SET.md` must show the new certification unit as `OPEN`
- `NEXT-ACTION.md` must point to `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- `SNAPSHOT.md` must reflect that this certification transition/logging slice is now the active
  governed implementation unit
- a new Layer 1 unit record must exist for `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`

This decision opens exactly one bounded implementation unit and nothing broader.