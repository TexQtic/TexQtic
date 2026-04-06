---
unit_id: AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001
title: Aggregator discovery verification-surface normalization
type: GOVERNANCE
status: CLOSED
delivery_class: DECISION_QUEUE
wave: W5
plane: CONTROL
opened: 2026-04-05
closed: 2026-04-06
verified: 2026-04-06
commit: 9da32ea
evidence: "BLOCKER_CONFIRMATION: the unit was lawfully opened to isolate the Aggregator backend verification discoverability mismatch only · RESHAPE_CONFIRMATION: the unit was lawfully reshaped to authorize one minimal `server/vitest.config.ts` discovery include adjustment for the exact Aggregator backend integration test path only · DISCOVERABILITY_NORMALIZATION_CONFIRMATION: commit `9da32ea` fulfilled the unit's sole remit by making the approved Aggregator backend verification path discoverable and runnable · HANDOFF_CONFIRMATION: once the remaining blocker was shown to be a truthful slice-local runtime issue, it was correctly handed back to `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` rather than absorbed into this support unit · NON_EXPANSION_CONFIRMATION: this unit never widened into product behavior, broader Vitest cleanup, package/toolchain work, or unrelated repo failures · RESIDUE_SEPARATION_CONFIRMATION: the reproduced `g026-platform-subdomain-routing.spec.ts` typecheck failure remains explicitly unrelated and non-blocking for this unit's closure"
doctrine_constraints:
  - D-004: this is one bounded governance-only verification-support unit only; it must not merge into product implementation or broader testing cleanup
  - D-007: governance-only units must not modify application behavior, schema, package, CI, deployment, or unrelated runtime files
  - D-013: this record completes decision and opening only; normalization implementation, verification, governance sync, and close remain separate phases
  - D-016: one-logical-unit discipline remains mandatory; this support unit must not imply any new product opening or family expansion
decisions_required:
  - GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-OPENING: DECIDED (2026-04-05, Paresh)
  - GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-RESHAPE: DECIDED (2026-04-05, Paresh)
  - GOV-DEC-AGGREGATOR-DISCOVERY-CLOSURE-READINESS: DECIDED (2026-04-06, Paresh)
  - GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE: DECIDED (2026-04-06, Paresh)
blockers: []
---

## Unit Summary

`AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001` is one bounded governance-only verification-support unit.

It exists only to normalize backend test discovery for the existing Aggregator discovery integration test so that backend verification evidence for the open product unit can be produced truthfully.

This unit does not change product behavior.

Current result: `CLOSED`.

## Scope Statement

This unit may normalize only the backend test discovery/execution surface for the already-existing Aggregator discovery integration test.

It may authorize exactly one minimal `server/vitest.config.ts` discovery include adjustment for the Aggregator backend integration test path if that remains the smallest truthful fix surface.

It may not widen into general test-infrastructure cleanup, package/toolchain work, or unrelated failing-spec remediation.

## Files Allowlisted (Modify)

This governance record currently authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-RESHAPE.md`
- `governance/units/AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001.md`

No other files are authorized for edit in this opening step.

## Exact In-Scope Boundary

This unit authorizes only:

1. backend test discovery normalization for `server/src/tests/aggregator-discovery-read.integration.test.ts`
2. one minimal `server/vitest.config.ts` discovery include adjustment for that exact backend test path only, if required
3. the minimum bounded execution-surface alignment needed to make the approved backend verification path truthful
4. focused backend re-verification of that exact Aggregator discovery integration test path only
5. explicit preservation of unrelated verification failures as outside this unit

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- any product or UI behavior change
- any Aggregator discovery feature expansion
- any public-shell, auth, or navigation change
- any package, CI, or toolchain modernization
- any general Vitest or testing-doctrine cleanup
- any unrelated test movement or migration
- any fix to `server/src/__tests__/g026-platform-subdomain-routing.spec.ts`
- any broader Aggregator family work

## Authorized Remediation Surface

The next remediation pass inside this unit may modify only the minimum bounded surface below:

- `server/vitest.config.ts`
- `server/src/tests/aggregator-discovery-read.integration.test.ts`
- `server/src/__tests__/aggregator-discovery-read.integration.test.ts`
- `governance/units/AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001.md`
- `governance/units/AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS.md`

No broader test, package, CI, or application file surface is authorized by this reshape.

## Closure Basis

This unit is now closed as complete because:

- the approved Aggregator backend verification path is discoverable and runnable
- its sole verification-surface remit is fulfilled by the committed `vitest.config.ts` adjustment in `9da32ea`
- the later runtime blocker was correctly handed back to the product unit rather than absorbed here
- the remaining `g026-platform-subdomain-routing.spec.ts` residue is explicitly unrelated and does not block this closure