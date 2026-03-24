---
unit_id: GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-001
title: Sentinel correction-order reference remediation
type: GOVERNANCE
status: OPEN
delivery_class: DECISION_QUEUE
wave: W5
plane: CONTROL
opened: 2026-03-24
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 remains the sole ACTIVE_DELIVERY close stream in NEXT-ACTION and remains blocked rather than displaced by this concurrent governance opening · SENTINEL_BLOCKER_CONFIRMATION: the remaining controlling manual close gate blocker is SENTINEL-V1-CHECK-009 with reported reason correction-order-reference is required for retry validation while SENTINEL-V1-CHECK-006 now returns PASS and SENTINEL-V1-CHECK-005 has already been remediated in repo truth · RETRY_POSTURE_CONFIRMATION: correction_order_required returned true, closure proceeded no, and no correction-order artifact was created and no path was guessed during the prior bounded remediation step"
doctrine_constraints:
  - D-004: this is one bounded governance remediation unit only; it must not be merged with certification close execution, certification implementation change, or broader Sentinel redesign
  - D-007: no product code, service code, route code, test code, schema, migration, package, CI, hook, or auto-trigger rollout work is authorized in this unit
  - D-011: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 must remain the sole ACTIVE_DELIVERY close stream in NEXT-ACTION unless a separate lawful governance move changes Layer 0 truth
  - D-013: retry posture is not permission to bypass Sentinel; the blocked close remains blocked until the correction-order-reference requirement is lawfully satisfied and close_progression reruns to PASS
decisions_required:
  - GOV-DEC-GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-OPENING: DECIDED (2026-03-24, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-001` is one bounded concurrent
governance remediation unit.

It exists only to resolve the remaining correction-order-reference requirement under
`SENTINEL-V1-CHECK-009` so the blocked certification close can become lawfully rerunnable later.

This unit is concurrent governance work only. It is not `ACTIVE_DELIVERY` and does not displace
the currently authorized certification Close step in `NEXT-ACTION`.

## Blocker Source Truth

- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY` close stream
  in Layer 0.
- A lawful close progression attempt was made only after the mandatory manual Sentinel v1 workflow
  gate.
- The checkpoint was `close_progression`.
- The subject was `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`.
- The remaining controlling blocker is `SENTINEL-V1-CHECK-009`.
- The failure class is `correction_order_completion`.
- The reported failure reason is `correction-order-reference is required for retry validation`.
- `correction_order_required` returned `true`.
- `closure proceeded` returned `no`.
- `SENTINEL-V1-CHECK-006` is already remediated and now returns `PASS`.
- `SENTINEL-V1-CHECK-005` has already been remediated in repo truth.
- No correction-order artifact was created and no path was guessed during the prior bounded
  remediation step.
- No certification close was performed.

## Acceptance Criteria

- [ ] Repo truth is inspected to determine how `SENTINEL-V1-CHECK-009` defines
      correction-order-reference requirements for retry validation
- [ ] Repo truth is inspected to determine whether an exact canonical correction-order artifact path
      already exists for this retry posture
- [ ] The minimum lawful correction needed to satisfy `SENTINEL-V1-CHECK-009` is defined
- [ ] If repo truth requires it, the unit authorizes creation or recovery of exactly one canonical
      correction-order artifact/reference path in a later lawful implementation step
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
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-001.md`

No other files are authorized for edit in this decision/opening step.

## Files Read-Only

- `governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md`
- `governance/decisions/GOV-DEC-CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-OPENING.md`
- `governance/units/GOVERNANCE-SENTINEL-V1-AUTOMATION-001.md`
- `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
- `governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md`
- `governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md`
- `docs/governance/GOVERNANCE-SENTINEL-V1-AUTOMATION.md`
- `scripts/governance/sentinel-v1.js`

## Exact In-Scope Boundary

This unit may define only:

1. how `SENTINEL-V1-CHECK-009` defines correction-order-reference requirements for retry validation
2. whether an exact canonical correction-order artifact path already exists for this retry posture
3. the minimum lawful correction needed to satisfy `SENTINEL-V1-CHECK-009`
4. if required by repo truth, authorization to create or recover exactly one canonical correction-order artifact/reference path
5. preservation of the existing certification close prompt intent without performing the close
6. preservation of Layer 0 delivery authority throughout

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- closing `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- any certification product/service/route/test/schema/migration change
- any DB/Prisma/SQL execution
- any CI integration
- any git hook or watcher integration
- any auto-trigger rollout
- any broad Sentinel redesign
- any unrelated check-catalog edits
- any widening beyond the specific `SENTINEL-V1-CHECK-009` correction-order-reference blocker
- any new follow-on opening by implication

## Current Layer 0 Rule

`GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-001` is open concurrently in Layer 0
with `DECISION_QUEUE` posture only.

`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY` close stream
in `NEXT-ACTION`, but it remains blocked by the mandatory Sentinel `FAIL` until the
correction-order-reference requirement is corrected lawfully and `close_progression` reruns to
`PASS`.
