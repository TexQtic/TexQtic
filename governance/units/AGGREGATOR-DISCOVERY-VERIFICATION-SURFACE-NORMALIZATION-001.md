---
unit_id: AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001
title: Aggregator discovery verification-surface normalization
type: GOVERNANCE
status: OPEN
delivery_class: DECISION_QUEUE
wave: W5
plane: CONTROL
opened: 2026-04-05
closed: null
verified: null
commit: null
evidence: "BLOCKER_CONFIRMATION: current Aggregator discovery verification remains green on frontend typecheck and focused UI test but backend execution is blocked because server/src/tests/aggregator-discovery-read.integration.test.ts is outside current server Vitest discovery while the approved command points at that path · BOUNDEDNESS_CONFIRMATION: the mismatch is verification-surface only and can be isolated to backend test discovery normalization for the one existing Aggregator discovery integration test without changing product behavior · RESHAPE_CONFIRMATION: GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-RESHAPE confirms the former unit boundary was too narrow because no lawful file-only fix could make the approved command truthful while `server/vitest.config.ts` remained forbidden, so the unit now authorizes one minimal `server/vitest.config.ts` discovery include adjustment for this exact Aggregator backend verification path only · NON_EXPANSION_CONFIRMATION: package/toolchain modernization, general Vitest cleanup, unrelated test migration, and the reproduced g026-platform-subdomain-routing.spec.ts typecheck failure remain out of scope · ACTIVE_PRODUCT_PRESERVATION_CONFIRMATION: AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS remains OPEN as the sole product-facing ACTIVE_DELIVERY unit and this support unit does not supersede it"
doctrine_constraints:
  - D-004: this is one bounded governance-only verification-support unit only; it must not merge into product implementation or broader testing cleanup
  - D-007: governance-only units must not modify application behavior, schema, package, CI, deployment, or unrelated runtime files
  - D-013: this record completes decision and opening only; normalization implementation, verification, governance sync, and close remain separate phases
  - D-016: one-logical-unit discipline remains mandatory; this support unit must not imply any new product opening or family expansion
decisions_required:
  - GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-OPENING: DECIDED (2026-04-05, Paresh)
  - GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-RESHAPE: DECIDED (2026-04-05, Paresh)
blockers: []
---

## Unit Summary

`AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001` is one bounded governance-only verification-support unit.

It exists only to normalize backend test discovery for the existing Aggregator discovery integration test so that backend verification evidence for the open product unit can be produced truthfully.

This unit does not change product behavior.

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

## Current Layer 0 Rule

`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` remains OPEN as the sole current product-facing `ACTIVE_DELIVERY` unit.

`AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001` is open concurrently with `DECISION_QUEUE` posture only as a verification-support governance unit.

## Allowed Next Step

The only lawful next work inside this unit is one bounded verification-surface normalization pass for the existing Aggregator backend integration test, including one minimal `server/vitest.config.ts` discovery include adjustment only if that remains necessary.

## Forbidden Next Step

- Do **not** change product behavior
- Do **not** broaden into general test-infrastructure cleanup
- Do **not** fix the unrelated g026 server typecheck failure
- Do **not** modify package, CI, schema, or deployment surfaces