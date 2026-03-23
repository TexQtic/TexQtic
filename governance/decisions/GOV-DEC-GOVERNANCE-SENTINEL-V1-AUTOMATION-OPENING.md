# GOV-DEC-GOVERNANCE-SENTINEL-V1-AUTOMATION-OPENING

Decision ID: GOV-DEC-GOVERNANCE-SENTINEL-V1-AUTOMATION-OPENING
Title: Open one bounded governance-tooling unit for Sentinel v1 automation implementation
Status: DECIDED
Date: 2026-03-23
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `GOVERNANCE-SENTINEL-V1-SPEC-001` is already `OPEN`
- the bounded Sentinel v1 specification package is already implemented inside that open unit
- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains `OPEN`
- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY`
  implementation-ready unit
- `NEXT-ACTION.md` still points only to `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- the canonical Sentinel v1 doctrine/spec package already fixes:
  - the exact check catalog
  - the exact checkpoint set
  - the exact gate-result schema
  - the exact correction-order protocol
  - the exact Layer 0 interaction rule
  - the exact authoritative-vs-transitional ledger posture

The remaining gap is now not governance specification but a later separate automation
implementation step.

That implementation must not be opened implicitly from an implementation prompt and must not widen
the current certification authorization.

## Problem Statement

TexQtic now needs one lawful opening artifact for the bounded Sentinel v1 automation unit so that a
later implementation prompt may execute against an already-open governed boundary.

Without this opening, any later Sentinel automation implementation prompt would risk opening the
automation work implicitly.

The smallest truthful move is therefore one separate governance-only Opening step that creates the
automation unit explicitly while preserving the current ACTIVE_DELIVERY authorization unchanged.

## Decision

TexQtic opens exactly one bounded governance-tooling unit:

- `GOVERNANCE-SENTINEL-V1-AUTOMATION-001`
- title: `Sentinel v1 automation implementation`

This unit is `OPEN` in Layer 0 as a non-terminal governance-tooling unit.

`NEXT-ACTION` does not change.
`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY`
implementation-ready unit.

## Delivery-Class Decision For This Open Automation Unit

`GOVERNANCE-SENTINEL-V1-AUTOMATION-001` carries delivery class `DECISION_QUEUE`.

Reason:

- the unit is lawfully opened now for one later bounded implementation step
- the unit is not the current authorized implementation next action
- the opening must not be mistaken for a second `ACTIVE_DELIVERY` authorization

## Exact In-Scope Boundary

The opened unit is limited to one later separate local Sentinel v1 automation implementation step
only, and that later implementation may do only the following:

1. implement executable Sentinel v1 automation to the already-approved doctrine/spec package
2. implement only the exact approved check catalog fixed in
   `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
3. implement only the exact approved gate-result artifact shape fixed in
   `governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md`
4. implement only the exact approved correction-order output contract fixed in
   `governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md`
5. implement bounded local execution suitable for later manual invocation only
6. read the canonical governance artifacts required by Sentinel v1 only
7. treat `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md` as authoritative normalized truth
8. treat `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md` as transitional/reference only
9. preserve the existing Layer 0 interaction rule and the current certification ACTIVE_DELIVERY
   authorization

## Exact Out-of-Scope Boundary

This opening does **not** authorize:

- any Sentinel automation implementation in this opening step
- any scripts, hooks, CI, bots, parsers, linters, or executable tooling changes in this opening
  step
- any product/application code
- any certification implementation work
- any DB/schema/migration work
- any contract/OpenAPI work
- any governance doctrine rewrite
- any change to the approved Sentinel v1 check catalog, trigger set, ownership semantics,
  gate-result schema, or correction-order protocol
- any change to the active certification implementation authorization in Layer 0
- any non-standard opening path
- any opportunistic cleanup outside the bounded opening artifacts

## Verification Profile For The Later Implementation Unit

- unit type: bounded governance-tooling implementation
- acceptance boundary:
  - executable Sentinel v1 automation exists and runs locally
  - it implements only the exact approved Sentinel v1 checks and exact approved checkpoint set
  - it reads only the approved governance artifacts needed for validation
  - it emits gate-result outputs consistent with the approved gate-result schema
  - it emits correction-order outputs consistent with the approved correction-order template and
    protocol
  - it enforces binary PASS/FAIL semantics only
  - it treats `CANDIDATE-NORMALIZATION-LEDGER.md` as authoritative normalized truth
  - it treats `STEP2-PENDING-CANDIDATE-LEDGER.md` as transitional/reference only
  - it preserves the existing Layer 0 interaction rule
  - it does not widen into CI/platform/product/package/schema/contract work
  - it does not change the active certification implementation authorization
- required verification modes:
  - repo inspection
  - local execution of the Sentinel v1 entrypoint
  - fixture or sample-run validation against representative governance artifacts
  - output-shape verification against the approved gate-result schema
  - correction-order output verification against the approved correction-order protocol/template
  - changed-file scope verification
  - no-widening verification against the approved Sentinel v1 spec

## Implementation Authorization Statement

This decision authorizes exactly one bounded future implementation unit only:

- `GOVERNANCE-SENTINEL-V1-AUTOMATION-001`

It does **not** implement automation now.
It does **not** authorize a non-standard opening path.
It does **not** alter `NEXT-ACTION`.

## Consequences

- Layer 0 now has three `OPEN` governed units and one `DESIGN_GATE` unit
- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY`
  implementation-ready unit
- `GOVERNANCE-SENTINEL-V1-SPEC-001` remains open as the completed bounded spec package pending
  later verification
- `GOVERNANCE-SENTINEL-V1-AUTOMATION-001` is now concurrently `OPEN` with `DECISION_QUEUE`
  delivery class
- `NEXT-ACTION.md` remains pointed to the certification unit only

## Sequencing Impact

- `OPEN-SET.md` must show `GOVERNANCE-SENTINEL-V1-AUTOMATION-001` as `OPEN`
- `NEXT-ACTION.md` must preserve the certification unit as the sole `ACTIVE_DELIVERY` action and
  explicitly note the concurrent automation unit
- `SNAPSHOT.md` must reflect three open governed units and preserve the same current next action
- a new Layer 1 unit record must exist for `GOVERNANCE-SENTINEL-V1-AUTOMATION-001`

This decision opens exactly one bounded Sentinel v1 automation unit and nothing broader.
