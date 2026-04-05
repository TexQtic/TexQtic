# GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION

Decision ID: GOV-DEC-AGGREGATOR-DISCOVERY-BACKEND-FAILURE-CLASSIFICATION
Title: Classify the truthful remaining Aggregator backend verification failure after discovery normalization
Status: DECIDED
Date: 2026-04-05
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` remains OPEN as the sole current product-facing `ACTIVE_DELIVERY` unit
- `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001` remains OPEN as a concurrent governance-only support unit
- the discovery-surface blocker has already been neutralized by the committed `server/vitest.config.ts` include adjustment in commit `9da32ea`
- the approved backend verification command now truthfully discovers and runs `src/tests/aggregator-discovery-read.integration.test.ts`
- the remaining backend verification blocker is now a truthful slice-local runtime failure: the Aggregator route executes, returns `200`, and then fails the assertion `expected 0 to be greater than or equal to 1`
- the reproduced `server/src/__tests__/g026-platform-subdomain-routing.spec.ts:31` typecheck failure remains unrelated and out of scope

Current repo truth also shows all of the following:

- the open product unit explicitly authorizes curated discovery entries plus conditional narrow backend read support only if unavoidable
- the frontend Aggregator workspace truth test preserves both a valid curated-entry state and a valid empty state
- the backend integration test does not assert non-empty discovery in the abstract; it seeds one non-white-label `B2B` supplier org with `ACTIVE` status, then expects that seeded eligible org to be surfaced while the current Aggregator org remains excluded
- the runtime path exercised by the test is still exact and bounded:
  - route: `GET /api/tenant/aggregator/discovery`
  - service: `listCounterpartyDiscoveryEntries(currentOrgId, prisma, limit)`
  - current eligibility filter: non-current org, `is_white_label = false`, `org_type in ['B2B']`, `status in ['ACTIVE', 'VERIFICATION_APPROVED']`

The current blocker is therefore no longer a discovery/config problem. The only remaining question is whether the now-failing assertion exposes a runtime defect or a test expectation that outruns repo truth.

## Required Determinations

### 1. Does the failing assertion point more strongly to runtime defect or test-truth mismatch?

It points more strongly to a bounded runtime/read-shaping defect.

Reason:

- TexQtic's product truth does allow a legitimate empty state when there are no eligible counterparties
- however, the failing backend test does not merely assert that discovery should never be empty
- instead, it seeds one exact supplier org that matches the current runtime eligibility filter and then verifies that the current Aggregator org is excluded while the seeded eligible supplier is returned
- because the route executes successfully and the current implementation's own eligibility filter matches the seeded supplier shape, a `count: 0` result is stronger evidence of slice-local backend read/remediation need than of an over-strong test expectation

### 2. Is current repo truth already sufficient to classify the next exact move?

Yes.

No further classification reduction step is required because:

- the discovery-surface blocker is already solved and separated
- the exact runtime path and exact failing assertion are both known
- the open product unit already contains the relevant backend-read boundary
- the remaining failure does not depend on `g026`, package/toolchain work, or broader Aggregator family ambiguity

### 3. What is the smallest lawful next move?

`AGGREGATOR_BACKEND_FAILURE_CLASSIFIED_AS_RUNTIME_REMEDIATION`

The smallest lawful runtime-remediation unit is the already-open product-facing unit:

- `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`

No new follow-up unit is smaller than the existing active unit, because that unit already authorizes the exact bounded surface now implicated by the failing backend verification:

- curated discovery entries/list/cards
- minimum read-only data shaping
- conditional narrow backend read support only if unavoidable

Exact in-scope line for the next remediation pass:

- bounded slice-local remediation of the read-only Aggregator discovery backend path so seeded eligible counterparties surface truthfully through `/api/tenant/aggregator/discovery`, plus focused backend re-verification of that exact path

Exact out-of-scope line for the next remediation pass:

- any UI or product-scope expansion beyond current Aggregator discovery truthfulness
- any ad hoc weakening of the backend assertion without runtime basis
- any broader Aggregator family work
- any general verification-doctrine or Vitest cleanup
- any package, CI, or toolchain change
- any fix to `g026-platform-subdomain-routing.spec.ts`

This is smaller than opening a broader new runtime follow-up because the current active product unit already contains the exact backend read-support boundary and remains the sole product-facing delivery unit.

### 4. What should happen to `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001`?

It is effectively complete pending closure, but it should not be closed in this pass.

Reason:

- its sole truthful remit was to make the approved backend verification path discoverable and runnable
- commit `9da32ea` completed that discovery/config normalization lawfully
- the remaining blocker is no longer a verification-surface problem and should not be absorbed back into that support unit
- ordinary closure/sync can happen later, separately, once the next runtime-remediation handoff is acted on

## Decision Result

`AGGREGATOR_BACKEND_FAILURE_CLASSIFIED_AS_RUNTIME_REMEDIATION`

No new unit is opened by this decision.

This record classifies the blocker and hands the next exact move back to the already-open unit `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`, while preserving `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001` as effectively complete pending later closure and preserving `g026-platform-subdomain-routing.spec.ts` as unrelated.