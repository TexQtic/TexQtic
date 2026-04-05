# GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-OPENING

Decision ID: GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-OPENING
Title: Decide and open one bounded verification-support unit for Aggregator discovery verification-surface normalization
Status: DECIDED
Date: 2026-04-05
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` remains OPEN as the sole current product-facing `ACTIVE_DELIVERY` unit
- the product slice is materially implemented within its bounded scope
- focused frontend verification is already green:
  - `pnpm exec tsc --noEmit` passes
  - `pnpm -C server exec vitest run ../tests/aggregator-discovery-workspace.test.tsx` passes
- backend verification is blocked because the current Aggregator discovery integration test lives at `server/src/tests/aggregator-discovery-read.integration.test.ts`, while the approved command points to that path and the current server `vitest.config.ts` discovery includes only `src/__tests__/**/*` and `../tests/**/*`
- the reproduced `pnpm -C server exec tsc --noEmit` failure remains in `server/src/__tests__/g026-platform-subdomain-routing.spec.ts:31` and is unrelated to the Aggregator discovery slice

The current blocker is therefore not a product-slice defect. It is a verification-surface mismatch between the bounded Aggregator backend test path and the currently discovered server test paths.

## Problem Statement

The open Aggregator discovery product unit cannot produce truthful backend verification evidence with the currently approved command set because the existing backend integration test is not discoverable at its current path.

Leaving this problem inside the product unit would either pressure implementation to absorb test-discovery normalization work outside product scope or would encourage false completion claims. The smallest truthful next move is therefore one separate bounded governance-only follow-up unit for verification-surface normalization only.

## Required Determinations

### 1. Is the blocker real and outside the product slice?

Yes.

The backend integration test exists and is bounded to the Aggregator discovery read route. The blocker is that current server Vitest discovery does not include the test's current path. This is a verification-surface mismatch, not a missing product behavior.

### 2. Can the blocker be solved by one tiny bounded normalization change?

Yes.

The defect is narrow enough to isolate to backend test discovery normalization for the one existing Aggregator discovery integration test only. It does not require feature redesign, public-shell work, package modernization, or broad repo testing cleanup.

### 3. Can that normalization be framed without widening into broader test-infrastructure work?

Yes.

The bounded target is only to align discovery/execution truth for the existing Aggregator backend integration test so the approved verification path becomes truthful. General Vitest doctrine, package/toolchain cleanup, unrelated test movement, and unrelated failing specs remain outside scope.

### 4. Does the unrelated g026 failure remain outside this follow-up?

Yes.

`server/src/__tests__/g026-platform-subdomain-routing.spec.ts:31` remains a reproduced unrelated server typecheck failure and must not be absorbed into this follow-up unit.

## Decision Result

`VERIFICATION_SURFACE_FOLLOWUP_LAWFUL_TO_OPEN`

TexQtic now authorizes one tiny bounded governance-only follow-up unit:

- Unit name: `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001`

Bounded rationale:

The open Aggregator discovery product unit is not blocked by product logic drift. Its remaining blocker is a narrow mismatch between the location of the existing backend integration test and the current server-side test-discovery surface. Opening one tiny governance-only follow-up unit is lawful because it isolates exactly that verification-surface defect, keeps the active product unit intact, avoids package/CI/toolchain widening, and preserves the unrelated g026 failure as non-slice evidence.

Exact in-scope line:

- backend test discovery normalization for the existing Aggregator discovery integration test only
- the minimum bounded changes needed to make that one backend verification path discoverable and executable truthfully
- focused re-verification of that one backend test path only after normalization
- explicit preservation of unrelated g026 failure as outside the unit

Exact out-of-scope line:

- any product or UI behavior change
- any public-shell, auth, or navigation work
- any broader Vitest, package, CI, or tooling cleanup
- any unrelated test migration or path cleanup
- any fix to `g026-platform-subdomain-routing.spec.ts`
- any broader Aggregator family work

## Opening

The following unit is now opened:

- `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001`
- Title: `Aggregator discovery verification-surface normalization`
- Type: `GOVERNANCE`
- Status: `OPEN`
- Delivery Class: `DECISION_QUEUE`

Reason:

- the blocker is real and verification-surface only
- it is separable from the active product slice
- one tiny bounded normalization change can address it without broadening into general test-infrastructure cleanup
- leaving it inside the product unit would create pressure to mix product scope with test-discovery normalization

## Sequence Discipline

This decision and opening authorize only the follow-up unit.

Required sequence for the active product unit remains:

Implementation -> Verification -> Governance Sync -> Close

The new support unit exists only to make the blocked backend verification path truthful. It does not replace or supersede the open Aggregator discovery product unit.