# GOV-DEC-GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-OPENING

Decision ID: GOV-DEC-GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-OPENING
Title: Open one bounded governance-workflow unit for mandatory manual Sentinel invocation discipline
Status: DECIDED
Date: 2026-03-24
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001` is already `DECIDED`
- Governance Sentinel is already doctrine-approved as a mandatory binary gate before the fixed
  checkpoints for Opening, Governance Sync, Close, Layer 0 next-action change where applicable,
  and governance reviews claiming clean bounded compliance
- the current repo already has a bounded local/manual Sentinel v1 runner
- Sentinel v1 automation already exists as bounded local/manual invocation only
- CI integration, hook integration, bot integration, and broader platform enforcement remain later
  separately governed scope only
- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY` action in
  `NEXT-ACTION.md` and is postured for separate Close only

The remaining gap is not missing Sentinel capability. The remaining gap is explicit
workflow-discipline enforcement that makes manual invocation mandatory before governance
progression at the already-fixed checkpoints.

## Problem Statement

TexQtic needs one bounded governance-workflow unit that records mandatory manual Sentinel v1
invocation as a required workflow discipline until a later separately governed auto-trigger,
CI, or hook rollout exists.

Without this bounded decision/opening, the repo truth would still have doctrine-approved required
checkpoints and a shipped local/manual runner, but governance workflow could continue to rely on
implicit operator discipline instead of explicit mandatory process.

The smallest truthful move is therefore one concurrent governance-only opening that records the
workflow requirement while preserving the existing local/manual runner and preserving the current
ACTIVE_DELIVERY authorization unchanged.

## Decision

TexQtic decides that until a later separately governed auto-trigger, CI, or hook rollout exists,
Governance Sentinel v1 manual invocation is mandatory by workflow before governance progression at
the checkpoints already fixed by doctrine.

Manual Sentinel invocation is now required before:

- Opening progression
- Governance Sync progression
- Close progression
- any Layer 0 next-action change not already compelled by an open unit
- any governance review that claims clean bounded compliance

The required trigger doctrine already exists and is not being invented here.
The required runner remains the existing bounded local/manual Sentinel v1 entrypoint.
This decision governs workflow discipline only.

This decision does **not**:

- implement automatic trigger wiring
- authorize CI integration
- authorize git hooks, bots, file watchers, or platform enforcement
- alter the currently authorized `ACTIVE_DELIVERY` unit
- change the Sentinel v1 spec package or the Sentinel v1 automation package itself

## Opening

TexQtic opens exactly one bounded concurrent governance-workflow unit:

- `GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001`
- title: `Mandatory manual Sentinel invocation workflow integration`

This unit is `OPEN` in Layer 0 as a concurrent governance-only unit.

`NEXT-ACTION` does not change.
`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY` action.

## Delivery-Class Decision For This Open Governance Unit

`GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001` carries delivery class `DECISION_QUEUE`.

Reason:

- the unit is bounded governance-workflow work only
- it is concurrent governance work and must not be mistaken for `ACTIVE_DELIVERY`
- it must not displace the currently authorized `NEXT-ACTION`

## Exact In-Scope Boundary

The opened unit is limited to the following governance-workflow scope only:

1. define the mandatory manual Sentinel invocation rule in workflow/governance terms
2. define which governance phases and checkpoints require manual Sentinel invocation before progression
3. define the minimum required evidence and reporting posture for a manual Sentinel run
4. define how `FAIL` results block progression and require correction-order plus rerun
5. define how `PASS` results must be reported in governance outputs
6. align Layer 0 and Layer 1 wording to reflect this workflow requirement only
7. preserve the existing bounded local/manual Sentinel entrypoint as the operative tool
8. preserve current `ACTIVE_DELIVERY` and `NEXT-ACTION` authority

## Exact Out-of-Scope Boundary

This decision/opening does **not** authorize:

- hook wiring
- CI wiring
- auto-trigger wiring
- file watchers
- GitHub Actions
- pre-commit or pre-push hooks
- package.json script expansion beyond what is already present
- edits to `scripts/governance/sentinel-v1.js`
- edits to `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
- edits to `governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md`
- edits to `governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md`
- product/application/server/schema/migration/test changes
- any change that reclassifies or displaces the current `ACTIVE_DELIVERY` authorization
- any implicit opening of an auto-trigger rollout unit

## Workflow Consequences

- manual invocation becomes mandatory by process until a later separately governed automation
  rollout exists
- failure to produce a `PASS` gate result at a required checkpoint blocks progression
- correction-order plus rerun is mandatory after `FAIL`
- `PASS` results must be reported in governance outputs when a mandatory checkpoint applies
- Layer 0 must reflect the new concurrent governance unit without changing the current
  `ACTIVE_DELIVERY` authorization

## Sequencing Impact

- `OPEN-SET.md` must show `GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001` as `OPEN`
- `NEXT-ACTION.md` must preserve the certification Close step as the sole `ACTIVE_DELIVERY` action
- `NEXT-ACTION.md` may add a truthful workflow note that manual Sentinel invocation is now
  required before governance progression at the already-decided checkpoints
- `SNAPSHOT.md` must reflect the newly opened concurrent governance unit and preserve the same
  delivery-sequencing authority
- a new Layer 1 unit record must exist for `GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001`

This decision opens exactly one bounded governance-workflow unit and nothing broader.