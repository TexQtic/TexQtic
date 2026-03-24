---
unit_id: GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-001
title: Sentinel close retry blocker remediation
type: GOVERNANCE
status: OPEN
delivery_class: DECISION_QUEUE
wave: W5
plane: CONTROL
opened: 2026-03-24
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 remains the sole ACTIVE_DELIVERY close stream in NEXT-ACTION and remains blocked rather than displaced by this concurrent governance opening · SENTINEL_BLOCKER_CONFIRMATION: the latest mandatory manual Sentinel close_progression run failed before any closure edit on SENTINEL-V1-CHECK-005 and SENTINEL-V1-CHECK-009 while the prior SENTINEL-V1-CHECK-006 blocker now returns PASS · RETRY_POSTURE_CONFIRMATION: correction_order_required returned true, closure proceeded no, and no correction-order reference may be guessed from memory"
doctrine_constraints:
  - D-004: this is one bounded governance remediation unit only; it must not be merged with certification close execution, certification implementation change, or broader Sentinel redesign
  - D-007: no product code, service code, route code, test code, schema, migration, package, CI, hook, or auto-trigger rollout work is authorized in this unit
  - D-011: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 must remain the sole ACTIVE_DELIVERY close stream in NEXT-ACTION unless a separate lawful governance move changes Layer 0 truth
  - D-013: retry posture is not permission to bypass Sentinel; the blocked close remains blocked until CHECK-005 and CHECK-009 are lawfully corrected and close_progression reruns to PASS
decisions_required:
  - GOV-DEC-GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-OPENING: DECIDED (2026-03-24, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-001` is one bounded concurrent governance
remediation unit.

It exists only to resolve the newly surfaced Sentinel close-retry blockers on
`SENTINEL-V1-CHECK-005` and `SENTINEL-V1-CHECK-009` so the blocked certification close can become
lawfully rerunnable later.

This unit is concurrent governance work only. It is not `ACTIVE_DELIVERY` and does not displace
the currently authorized certification Close step in `NEXT-ACTION`.

## Blocker Source Truth

- A lawful close retry for `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` was attempted only
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
- `SENTINEL-V1-CHECK-005` failed with reason `SNAPSHOT does not reflect the current open governed unit count`.
- `SENTINEL-V1-CHECK-009` failed with reason `correction-order-reference is required for retry validation`.
- The prior `SENTINEL-V1-CHECK-006` close allowlist blocker now returns `PASS` and is not the
  current blocker.
- `correction_order_required` returned `true`.
- No certification close was performed.

## Acceptance Criteria

- [ ] Repo truth is inspected to determine why `SNAPSHOT.md` fails the current close gate on
      `SENTINEL-V1-CHECK-005`
- [ ] Repo truth is inspected to determine the lawful correction-order-reference requirement for
      `SENTINEL-V1-CHECK-009`
- [ ] The minimum lawful correction for the CHECK-005 Layer 0 count mismatch is defined
- [ ] The minimum lawful correction for the CHECK-009 retry / correction-order handling is defined
- [ ] Any required correction-order posture for the retry blocker is issued lawfully if repo truth
      requires it
- [ ] The existing blocked certification close state is preserved without performing the close
- [ ] `NEXT-ACTION` preserves the same sole `ACTIVE_DELIVERY` authorization
- [ ] No broad Sentinel rollout, CI integration, hook integration, auto-triggering, certification
      implementation change, or unrelated widening is bundled in

## Files Allowlisted (Modify)

This opening authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/log/EXECUTION-LOG.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-001.md`

No other files are authorized for edit in this decision/opening step.

## Files Read-Only

- `governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md`
- `governance/decisions/GOV-DEC-CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-V1-AUTOMATION-001.md`
- `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
- `governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md`
- `governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md`
- `docs/governance/GOVERNANCE-SENTINEL-V1-AUTOMATION.md`
- `scripts/governance/sentinel-v1.js`

## Exact In-Scope Boundary

This unit may define only:

1. why `SNAPSHOT.md` open governed unit count fails `SENTINEL-V1-CHECK-005` during
   `close_progression`
2. the lawful correction-order-reference requirement for `SENTINEL-V1-CHECK-009` retry validation
3. the minimum lawful correction needed for the CHECK-005 Layer 0 count mismatch
4. the minimum lawful correction needed for the CHECK-009 retry / correction-order handling
5. any required correction-order posture for the retry blocker if repo truth requires it
6. only the minimum governance-tooling, configuration, or documentation correction needed to align
   the close gate with lawful retry and Layer 0 count expectations
7. preservation of the existing certification close prompt intent without performing the close
8. preservation of Layer 0 delivery authority throughout

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- closing `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- any certification product, service, route, test, schema, or migration change
- any DB, Prisma, or SQL execution
- any CI integration
- any git hook or watcher integration
- any auto-trigger rollout
- any broad Sentinel redesign
- any unrelated check-catalog edits beyond the minimum required bounded remediation
- any package.json expansion not strictly required by the bounded retry blocker remediation
- any widening beyond the specific CHECK-005 and CHECK-009 close-retry blockers
- any new follow-on opening by implication

## Current Layer 0 Rule

`GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-001` is open concurrently in Layer 0 with
`DECISION_QUEUE` posture only.

`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY` close stream
in `NEXT-ACTION`, but it remains blocked by the mandatory Sentinel `FAIL` until the retry blockers
are corrected lawfully and `close_progression` reruns to `PASS`.