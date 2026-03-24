---
unit_id: GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001
title: Mandatory manual Sentinel invocation workflow integration
type: GOVERNANCE
status: OPEN
delivery_class: DECISION_QUEUE
wave: W5
plane: CONTROL
opened: 2026-03-24
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 remains the sole ACTIVE_DELIVERY action in NEXT-ACTION, remains postured for separate Close only, and is not displaced by this concurrent governance opening · DOCTRINE_CONFIRMATION: GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001 already fixed the mandatory Sentinel checkpoint doctrine and the repo already ships the bounded local/manual Sentinel v1 runner · GAP_CONFIRMATION: the current gap is workflow discipline, not missing Sentinel capability or missing local/manual invocation support"
doctrine_constraints:
  - D-004: this is one bounded governance-workflow unit only; it must not be merged with auto-trigger rollout, CI integration, hook integration, or broader tooling rollout
  - D-007: no product code, scripts, package expansion, schema, migration, contract, test, or Sentinel spec/package edits are authorized in this unit
  - D-011: the currently authorized ACTIVE_DELIVERY certification Close step must remain authoritative in NEXT-ACTION unless a separate governance move changes it
  - D-013: workflow discipline is not automatic enforcement; manual invocation requirement does not authorize CI, hooks, bots, watchers, or platform-trigger rollout
decisions_required:
  - GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001: DECIDED (2026-03-23, Paresh)
  - GOV-DEC-GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-OPENING: DECIDED (2026-03-24, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001` is one bounded concurrent governance-workflow unit.

It records that manual Sentinel v1 invocation is now mandatory by workflow before governance
progression at the already-decided checkpoints while preserving the existing bounded local/manual
runner as the operative tool.

This unit is concurrent governance work only. It is not `ACTIVE_DELIVERY` and does not displace
the currently authorized certification Close step in `NEXT-ACTION`.

## Acceptance Criteria

- [ ] The mandatory manual Sentinel invocation rule is stated in workflow/governance terms only
- [ ] The exact governance phases and checkpoints requiring manual invocation before progression are fixed
- [ ] The minimum required evidence and reporting posture for a manual Sentinel run is fixed
- [ ] `FAIL` blocking posture plus mandatory correction-order and rerun requirements are fixed
- [ ] `PASS` reporting posture for governance outputs is fixed
- [ ] Layer 0 and Layer 1 wording are aligned to this workflow requirement only
- [ ] The existing bounded local/manual Sentinel runner remains the operative tool
- [ ] `NEXT-ACTION` preserves the same sole `ACTIVE_DELIVERY` authorization
- [ ] No auto-trigger, CI, hook, bot, watcher, script-expansion, product, schema, contract, or test work is bundled in

## Files Allowlisted (Modify)

This opening authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/log/EXECUTION-LOG.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001.md`

No other files are authorized for edit in this decision/opening step.

## Files Read-Only

- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-V1-AUTOMATION-OPENING.md`
- `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
- `docs/governance/GOVERNANCE-SENTINEL-V1-AUTOMATION.md`
- `governance/units/GOVERNANCE-SENTINEL-V1-SPEC-001.md`
- `governance/units/GOVERNANCE-SENTINEL-V1-AUTOMATION-001.md`

## Evidence Record

- Preserved Layer 0 posture on entry: `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY` action, remains postured for separate Close only, and `NEXT-ACTION` remains pointed to that unit
- Doctrine authority: `GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001` already fixed the mandatory checkpoint doctrine for Sentinel before Opening, Governance Sync, Close, Layer 0 next-action change where applicable, and governance reviews claiming clean bounded compliance
- Runner authority: the existing bounded local/manual Sentinel v1 entrypoint remains the operative tool for this workflow discipline
- Opening result: one concurrent governance-workflow unit is now open with `DECISION_QUEUE` posture only
- No authority drift: no second `ACTIVE_DELIVERY` unit is created and `NEXT-ACTION` remains the certification Close step only

## Exact In-Scope Boundary

This unit may define only:

- the mandatory manual Sentinel invocation rule in workflow/governance terms
- which governance phases and checkpoints require manual invocation before progression
- the minimum required evidence and reporting posture for a manual Sentinel run
- how `FAIL` results block progression and require correction-order plus rerun
- how `PASS` results must be reported in governance outputs
- Layer 0 and Layer 1 wording needed to reflect this workflow requirement only
- preservation of the existing bounded local/manual Sentinel runner as the operative tool
- preservation of the current `ACTIVE_DELIVERY` and `NEXT-ACTION` authority

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

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

## Workflow Rule To Integrate

Manual Sentinel v1 invocation is mandatory by workflow before governance progression at these
already-decided checkpoints:

- Opening progression
- Governance Sync progression
- Close progression
- any Layer 0 next-action change not already compelled by an open unit
- any governance review that claims clean bounded compliance

If a required checkpoint produces `FAIL`, progression is blocked and correction-order plus rerun
is mandatory before progression may resume.

If a required checkpoint produces `PASS`, that result must be reported in the governance output for
the bounded step.

## Current Layer 0 Rule

`GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001` is open concurrently in Layer 0 with `DECISION_QUEUE`
posture only.

`NEXT-ACTION` remains the certification Close step only. This preserves the rule that current
`ACTIVE_DELIVERY` authorization remains authoritative unless a separate governance move explicitly
changes it.