# GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING

Decision ID: GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING
Title: Open one bounded concurrent governance unit for Sentinel v1 specification artifacts and gate design
Status: DECIDED
Date: 2026-03-23
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001` is `DECIDED`
- Governance Sentinel is already approved at doctrine level as a mandatory binary gate only
- the recommended next governance move was one separate Opening for Sentinel v1 specification only
- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` is already `OPEN`
- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY`
  implementation-ready unit
- `NEXT-ACTION.md` already points to `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`

The doctrine decision already fixed the required content direction for Sentinel v1:

- canonical governance-only artifact set
- AVM-style binary gate posture
- mandatory checkpoint triggers
- correction-order protocol
- mirror-check / negative-evidence review posture
- Layer 0 interaction rule
- no implementation by implication

The remaining gap is now specification shape only. No bounded Sentinel v1 spec unit exists yet to
define the exact artifact surfaces, schema/format expectations, ownership boundaries, ledger
transition posture, or later implementation acceptance boundary.

## Problem Statement

TexQtic now needs one bounded governance-only unit that turns the already-decided Sentinel doctrine
into a canonical v1 specification package without displacing the currently authorized
implementation-ready certification unit.

If this work is not opened, Sentinel remains doctrine-only and underspecified.
If this work is opened too broadly, it could be misread as authorizing Sentinel tooling,
enforcement rollout, CI integration, or product behavior change.

The smallest truthful opening is therefore one concurrent governance-only specification unit while
preserving the current `NEXT-ACTION` and sole `ACTIVE_DELIVERY` posture unchanged.

## Decision

TexQtic opens exactly one bounded concurrent governance-only specification unit:

- `GOVERNANCE-SENTINEL-V1-SPEC-001`
- title: `Sentinel v1 specification artifacts and gate design`

This unit is `OPEN` in Layer 0 as a non-terminal governance unit.

`NEXT-ACTION` does not change.
`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY`
implementation-ready unit.

## Delivery-Class Decision For This Open Governance Unit

`GOVERNANCE-SENTINEL-V1-SPEC-001` carries delivery class `DECISION_QUEUE`.

Reason:

- the unit itself is lawfully opened now for bounded governance-spec work
- any later Sentinel tooling rollout, enforcement rollout, or broader implementation remains
  separately governed
- the open Sentinel unit therefore must not be mistaken for a second `ACTIVE_DELIVERY`
  implementation authorization

## Exact In-Scope Boundary

The opened unit is limited to the following governance-only specification scope:

1. define the canonical Sentinel v1 artifact set and exact file surfaces
2. define the gate-result schema and required pass/fail output structure
3. define the correction-order artifact template and retry protocol
4. define AVM-style binary gate behavior and checkpoint semantics
5. define mandatory trigger behavior for normalization, Opening, sync, Close, and Layer 0 changes
6. define mirror-check and negative-evidence traceability requirements
7. define the machine-checkable versus human-judgment boundary for v1
8. define Layer 0 interaction rules while preserving the current certification `NEXT-ACTION`
9. define ownership boundaries across Layer 0, the normalization ledger, spec surfaces, and later
   implementation
10. define the transitional posture of
   `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md` versus
   `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md`
11. define the acceptance boundary for a later separate Sentinel implementation or rollout unit

## Exact Out-of-Scope Boundary

This decision does **not** authorize:

- Sentinel tooling implementation
- scripts, hooks, or CI integration
- governance-linter engine changes
- package or lockfile changes
- product code changes
- API, UI, contract, schema, migration, Prisma, or RLS changes
- runtime/browser verification tooling
- automatic policy enforcement rollout beyond the governance spec surfaces themselves
- changing `NEXT-ACTION` away from the certification unit
- changing `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` away from sole `ACTIVE_DELIVERY`
- opening any second Sentinel child or broader governance process program

## Canonical Artifact Surfaces Authorized By This Opening

This opening authorizes the Sentinel v1 specification package only on these exact governance
surfaces:

- `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
- `governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md`
- `governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md`

These surfaces define specification only. They do not implement a runnable Sentinel.

## Implementation Authorization Statement

This decision authorizes exactly one bounded governance-only specification unit only:

- `GOVERNANCE-SENTINEL-V1-SPEC-001`

It does **not** authorize Sentinel enforcement tooling, hook wiring, CI rollout, linter rollout,
or product/system behavior changes.

## Consequences

- Layer 0 now has two `OPEN` governed units and one `DESIGN_GATE` unit
- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY`
  implementation-ready unit
- `GOVERNANCE-SENTINEL-V1-SPEC-001` is concurrently `OPEN` with `DECISION_QUEUE` delivery class
- `NEXT-ACTION.md` remains pointed to the certification unit only
- the old Step 2 ledger remains transitional only and the canonical normalization ledger remains
  authoritative

## Sequencing Impact

- `OPEN-SET.md` must show `GOVERNANCE-SENTINEL-V1-SPEC-001` as `OPEN`
- `NEXT-ACTION.md` must preserve the certification unit as the sole `ACTIVE_DELIVERY` action and
  explicitly note the concurrent Sentinel spec unit
- `SNAPSHOT.md` must reflect two open governed units and preserve the same current next action
- a new Layer 1 unit record must exist for `GOVERNANCE-SENTINEL-V1-SPEC-001`
- the canonical Sentinel v1 spec, gate-result schema, and correction-order template must exist on
  the exact authorized governance surfaces listed above

This decision opens exactly one bounded concurrent governance-only Sentinel v1 specification unit
and nothing broader.
