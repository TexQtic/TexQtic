---
unit_id: GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001
title: Sentinel CHECK-005 recount remediation
type: GOVERNANCE
status: OPEN
delivery_class: DECISION_QUEUE
wave: W5
plane: CONTROL
opened: 2026-03-24
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 remains the sole ACTIVE_DELIVERY close stream in NEXT-ACTION and remains blocked rather than displaced by this concurrent governance opening · SENTINEL_BLOCKER_CONFIRMATION: the latest lawful manual Sentinel close_progression rerun failed on SENTINEL-V1-CHECK-005 with reported reason SNAPSHOT does not reflect the current open governed unit count while SENTINEL-V1-CHECK-006, SENTINEL-V1-CHECK-007, SENTINEL-V1-CHECK-008, and SENTINEL-V1-CHECK-009 returned PASS · ROOT_CAUSE_CONFIRMATION: runCheck005 compares SNAPSHOT against the total non-terminal row count in OPEN-SET, while the failing pre-opening SNAPSHOT truth still advertised 7 open governed units against 8 non-terminal OPEN-SET rows · IMPLEMENTATION_RESULT: the minimum lawful correction was Layer 0 truth only, already applied during the bounded opening by reconciling SNAPSHOT and OPEN-SET to the runner's non-terminal recount rule, so no runner or documentation patch was required in this implementation step"
doctrine_constraints:
  - D-004: this is one bounded governance remediation unit only; it must not be merged with certification close execution, certification implementation change, or broader Sentinel redesign
  - D-007: no product code, service code, route code, test code, schema, migration, package, CI, hook, or auto-trigger rollout work is authorized in this unit
  - D-011: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 must remain the sole ACTIVE_DELIVERY close stream in NEXT-ACTION unless a separate lawful governance move changes Layer 0 truth
  - D-013: retry posture is not permission to bypass Sentinel; the blocked close remains blocked until the CHECK-005 recount mismatch is corrected lawfully and close_progression reruns to PASS
decisions_required:
  - GOV-DEC-GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-OPENING: DECIDED (2026-03-24, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001` is one bounded concurrent governance
remediation unit.

It exists only to determine and resolve the exact remaining `SENTINEL-V1-CHECK-005` recount
mismatch so the blocked certification close can become lawfully rerunnable later.

This unit is concurrent governance work only. It is not `ACTIVE_DELIVERY` and does not displace
the currently authorized certification Close step in `NEXT-ACTION`.

## Blocker Source Truth

- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY` close stream
  in Layer 0.
- A lawful close rerun for `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` was attempted only
  after the mandatory manual Sentinel v1 workflow gate.
- The checkpoint was `close_progression`.
- The subject was `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`.
- Checks exercised were:
  - `SENTINEL-V1-CHECK-005`
  - `SENTINEL-V1-CHECK-006`
  - `SENTINEL-V1-CHECK-008`
  - `SENTINEL-V1-CHECK-007`
  - `SENTINEL-V1-CHECK-009`
- The run returned `FAIL` before any closure edit.
- The exact remaining blocker is `SENTINEL-V1-CHECK-005`.
- The failure class is `layer0_consistency`.
- The reported reason is `SNAPSHOT does not reflect the current open governed unit count`.
- `SENTINEL-V1-CHECK-006` returned `PASS`.
- `SENTINEL-V1-CHECK-007` returned `PASS`.
- `SENTINEL-V1-CHECK-008` returned `PASS`.
- `SENTINEL-V1-CHECK-009` returned `PASS`.
- `correction_order_required` returned `true`.
- No certification close was performed.

## Acceptance Criteria

- [x] Repo truth is inspected to determine why CHECK-005 still reports a SNAPSHOT open governed
  unit count mismatch during `close_progression`
- [x] The mismatch cause is bounded precisely to stale SNAPSHOT truth, stale OPEN-SET truth,
  count-definition mismatch, runner recount logic, inclusion/exclusion of specific
  non-terminal classes, or parsing of current governance records
- [x] The minimum lawful correction needed for the CHECK-005 mismatch is identified
- [x] The existing blocked certification close state is preserved without performing the close
- [x] `NEXT-ACTION` preserves the same sole `ACTIVE_DELIVERY` authorization
- [x] No broad Sentinel rollout, CI integration, hook integration, auto-triggering, certification
  implementation change, or unrelated widening is bundled in

## Files Allowlisted (Modify)

This opening authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/log/EXECUTION-LOG.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001.md`

No other files are authorized for edit in this decision/opening step.

## Files Read-Only

- `governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md`
- `governance/decisions/GOV-DEC-CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-CORRECTION-ORDER-ARTIFACT-EMISSION-001.md`
- `governance/correction-orders/GOVERNANCE-SENTINEL-CORRECTION-ORDER-ARTIFACT-EMISSION-001-CO-001.yaml`
- `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
- `docs/governance/GOVERNANCE-SENTINEL-V1-AUTOMATION.md`
- `scripts/governance/sentinel-v1.js`

## Exact In-Scope Boundary

This unit may define only:

1. why CHECK-005 still reports a SNAPSHOT open governed unit count mismatch during
   `close_progression`
2. whether the mismatch is caused by stale SNAPSHOT truth, stale OPEN-SET truth,
   count-definition mismatch, runner recount logic, inclusion/exclusion of specific non-terminal
   classes, or parsing of current governance records
3. the minimum lawful correction needed for the CHECK-005 mismatch
4. preservation of the existing certification close prompt intent without performing the close
5. preservation of Layer 0 delivery authority throughout

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- closing `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- any certification product, service, route, test, schema, or migration change
- any DB, Prisma, or SQL execution
- any CI integration
- any git hook or watcher integration
- any auto-trigger rollout
- any broad Sentinel redesign
- any unrelated check-catalog edits
- any widening beyond the specific CHECK-005 recount mismatch
- any new follow-on opening by implication

## Evidence Posture

This unit preserves the blocked certification close state only.

The purpose of this unit is to resolve only the remaining CHECK-005 count mismatch in bounded
form.

No certification close, no certification implementation work, and no automation rollout are
authorized here.

## Implementation / Analysis Result

Implementation / analysis completed in bounded form only.

- `runCheck005()` computes the expected SNAPSHOT open governed unit count from
  `OPEN-SET.md` table truth using `openSet.rows.length`, which counts every non-terminal Layer 0
  row rather than only rows with status `OPEN`
- pre-opening repo truth showed a count-definition mismatch in Layer 0 only:
  `OPEN-SET.md` carried 8 non-terminal rows while `SNAPSHOT.md` still advertised
  `**Open governed units: 7**`
- the mismatch therefore came from stale SNAPSHOT truth against the runner's non-terminal recount
  rule, not from remaining runner logic error, not from inclusion/exclusion drift inside the
  current runner, and not from documentation gap
- the minimum lawful correction was Layer 0 truth only
- that bounded Layer 0 correction was already applied during the decision/opening step that opened
  this remediation unit, reconciling current repo truth to 9 non-terminal units after the new
  remediation opening was added
- no further Layer 0 patch was required in this implementation step
- no runner patch was required in this implementation step
- no documentation patch was required in this implementation step
- no Sentinel rerun was performed in this implementation step

This correction should enable a later lawful rerun of `close_progression` for
`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` because the remaining CHECK-005 mismatch has been
reconciled in Layer 0 truth without widening checkpoint semantics.

## Current Layer 0 Rule

`GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001` is open concurrently in Layer 0 with
`DECISION_QUEUE` posture only.

`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY` close stream
in `NEXT-ACTION`, but it is currently blocked by mandatory Sentinel `FAIL` on
`SENTINEL-V1-CHECK-005`.