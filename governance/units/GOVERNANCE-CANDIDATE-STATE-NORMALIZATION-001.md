---
unit_id: GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001
title: Candidate state normalization
type: GOVERNANCE
status: OPEN
delivery_class: DECISION_QUEUE
wave: W5
plane: CONTROL
opened: 2026-03-24
closed: null
verified: 2026-03-24
commit: "7bac1500f108040de13090af9e3fa9ae14dbd7cf"
evidence: "LAYER_0_CONFIRMATION: NEXT-ACTION remains OPERATOR_DECISION_REQUIRED and no ACTIVE_DELIVERY unit is open while this concurrent normalization unit is open only under DECISION_QUEUE posture · OPERATOR_AUDIT_CONFIRMATION: no currently named candidate is cleanly compelled by Layer 0 as the next lawful opening and some candidate records are stale, mixed, or historically consumed · IMPLEMENTATION_RESULT: unambiguous candidate-state defects were corrected in current repo truth by classifying GOV-VERIFY-01 as CLOSED instead of mixed OPEN/CLOSED, by preserving GOV-NAV-01 and GOV-VERIFY-01 openings as consumed historical artifacts rather than current-open posture in SNAPSHOT carry-forward text, and by preserving AdminRBAC revoke/remove history as already-opened and already-closed rather than eligibility-only posture · VERIFICATION_RESULT: read-only verification against implementation commit 7bac1500f108040de13090af9e3fa9ae14dbd7cf confirmed correction accuracy, minimality, remediation-record accuracy, and Layer 0 non-interference across SNAPSHOT.md, EXECUTION-LOG.md, GOV-VERIFY-01.md, and this unit record only · NON_REOPENING_CONFIRMATION: stale READY_FOR_OPENING posture, mixed open/closed text, and consumed opening artifacts must not reopen historical units by implication"
doctrine_constraints:
  - D-004: this is one bounded governance normalization unit only; it must not be merged with any implementation stream, successor opening, or broad governance redesign
  - D-007: no product, server, schema, migration, test, package, CI, hook, watcher, or Sentinel-tooling surface is authorized in this unit
  - D-011: OPERATOR_DECISION_REQUIRED must remain the current Layer 0 posture unless separate lawful governance action changes current truth
  - D-013: consumed historical openings and mixed candidate-state text must not create reopening authority by implication
decisions_required:
  - GOV-DEC-GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-OPENING: DECIDED (2026-03-24, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001` is one bounded concurrent governance-only
normalization unit.

It exists only to reconcile stale or mixed candidate-state records so later operator choice and
later openings are based on clean current repo truth rather than consumed historical opening
cycles or ambiguous carry-forward text.

This unit is concurrent governance work only. It is not `ACTIVE_DELIVERY`, does not displace
`OPERATOR_DECISION_REQUIRED`, and does not authorize implementation work.

Implementation/analysis in this unit has now corrected the minimum unambiguous stale candidate-
state records: the mixed `OPEN`/`CLOSED` posture in `GOV-VERIFY-01` and the current-facing
carry-forward wording in `SNAPSHOT.md` that still described consumed `GOV-NAV-01`, `GOV-VERIFY-01`,
and AdminRBAC revoke/remove opening posture as if it were still current. The unit remains `OPEN`
pending any later verification, governance sync, and close steps.

Read-only verification against implementation commit `7bac1500f108040de13090af9e3fa9ae14dbd7cf`
now confirms that the bounded normalization is accurate and minimal: `GOV-VERIFY-01` is closed-
state only, `SNAPSHOT.md` preserves AdminRBAC revoke/remove history truthfully, and `SNAPSHOT.md`
preserves the `GOV-NAV-01` and `GOV-VERIFY-01` openings as consumed historical posture rather
than current-ready posture. The unit remains `OPEN` pending later governance sync and close.

## Acceptance Criteria

- [x] Candidate-related governance records are inspected for stale, mixed, or consumed state
      signals
- [x] Determinable conflicts between Layer 0 carry-forward text and candidate/unit history are
      identified for bounded normalization
- [x] Candidate-state wording is normalized so closed historical openings are not casually reused
      as current-ready openings
- [x] A clean operator-facing picture is produced for candidate classes limited to `CLOSED`
      historical units, `OPEN` concurrent governance units, `READY_FOR_OPENING` only,
      `DESIGN_GATE` only, and governance-eligible only
- [x] `OPERATOR_DECISION_REQUIRED` remains preserved until a later explicit operator choice is made
      from normalized repo truth
- [x] No successor `ACTIVE_DELIVERY`, implementation work, or historical-unit reopening is
      created by implication

## Verification Record

- Verification phase: 2026-03-24 read-only governance verification
- Implementation commit under verification: `7bac1500f108040de13090af9e3fa9ae14dbd7cf`
- Verification surfaces inspected:
  - `governance/control/SNAPSHOT.md`
  - `governance/log/EXECUTION-LOG.md`
  - `governance/units/GOV-VERIFY-01.md`
  - `governance/units/GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001.md`
- Verification verdict: `VERIFIED_COMPLETE`
- Correction accuracy: PASS
- Minimality: PASS — implementation commit changed only `SNAPSHOT.md`, `EXECUTION-LOG.md`,
  `GOV-VERIFY-01.md`, and this unit record
- Remediation-record accuracy: PASS
- Layer 0 non-interference: PASS — `OPEN-SET.md` remained truthful, `NEXT-ACTION.md` remained
  `OPERATOR_DECISION_REQUIRED`, and no new unit was opened or reopened

## Files Allowlisted (Modify)

This opening authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/log/EXECUTION-LOG.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-OPENING.md`
- `governance/units/GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001.md`

No other files are authorized for edit in this decision/opening step.

## Files Read-Only

- `governance/decisions/GOV-DEC-NAVIGATION-LAYER-CHILD-OPENING-DISPOSITION.md`
- `governance/decisions/GOV-DEC-NAVIGATION-LAYER-UPGRADATION-OPENING.md`
- `governance/units/GOV-NAV-01.md`
- `governance/decisions/GOV-DEC-AUTOMATED-VERIFICATION-POLICY-CHILD-OPENING-DISPOSITION.md`
- `governance/decisions/GOV-DEC-AUTOMATED-VERIFICATION-POLICY-OPENING.md`
- `governance/units/GOV-VERIFY-01.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-ELIGIBILITY.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING.md`
- `governance/units/TECS-FBW-ADMINRBAC.md`
- `governance/units/TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001.md`

## Exact In-Scope Boundary

This unit may do only the following:

1. inspect candidate-related governance records for stale, mixed, or consumed state signals
2. reconcile conflicts between Layer 0 carry-forward text and candidate/unit history where current
   repo truth is already determinable
3. normalize candidate-state wording so closed historical openings are not casually reused as
   current-ready openings
4. preserve `OPERATOR_DECISION_REQUIRED` until a later explicit operator choice is made from
   normalized repo truth
5. produce a clean operator-facing picture of candidate classes limited to:
   - `CLOSED` historical units
   - `OPEN` concurrent governance units
   - `READY_FOR_OPENING` only
   - `DESIGN_GATE` only
   - governance-eligible only

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- opening a new `ACTIVE_DELIVERY` unit
- opening any new product/governance child by implication
- reopening `GOV-NAV-01`, `GOV-VERIFY-01`, `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`, or any other
  consumed closed unit
- any certification product/service/route/test/schema/migration change
- any DB/Prisma/SQL execution
- any Sentinel runner/spec/schema/template/package change
- any CI integration
- any git hook or watcher integration
- any auto-trigger rollout
- any broad governance redesign
- any opportunistic cleanup outside the exact candidate-state normalization scope

## Current Layer 0 Rule

`GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001` is open concurrently in Layer 0 with
`DECISION_QUEUE` posture only.

`NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`. No `ACTIVE_DELIVERY` successor is compelled by
this opening, and no historical closed unit is reopened by implication.

## Purpose

Normalize candidate-state truth so future operator decisions are made from clean current
control-plane evidence rather than stale `READY_FOR_OPENING`, mixed open/closed text, or consumed
opening artifacts.