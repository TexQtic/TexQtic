# GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-RESHAPE

Decision ID: GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-RESHAPE
Title: Decide whether the open Aggregator verification support unit must be narrowly reshaped to authorize one minimal Vitest discovery adjustment
Status: DECIDED
Date: 2026-04-05
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` remains OPEN as the sole current product-facing `ACTIVE_DELIVERY` unit
- `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001` remains OPEN as a concurrent governance-only support unit
- the Aggregator product slice is materially implemented
- the current backend verification blocker is structural: the approved command targets `src/tests/aggregator-discovery-read.integration.test.ts` while the current server `vitest.config.ts` discovery includes only `src/__tests__/**/*` and `../tests/**/*`
- the previous remediation attempt proved no lawful fix was possible inside the then-current support-unit boundary because both `server/vitest.config.ts` and command-path changes were forbidden
- the reproduced `server/src/__tests__/g026-platform-subdomain-routing.spec.ts:31` failure remains unrelated and out of scope

The current blocker is therefore not a product defect and not a broad tooling problem. It is a structural mismatch between the approved backend verification command and the currently discoverable server test paths.

## Required Determinations

### 1. Is the blocker real and structural?

Yes.

The approved backend verification command targets `src/tests/aggregator-discovery-read.integration.test.ts`. Current server Vitest discovery excludes that path. As long as both the command and `server/vitest.config.ts` remain fixed, no file-only change inside the former support-unit boundary can make the command truthful.

### 2. Is one minimal `server/vitest.config.ts` adjustment the smallest truthful fix surface?

Yes.

The smallest truthful fix surface is one minimal discovery include adjustment in `server/vitest.config.ts` so the exact Aggregator backend integration test path becomes discoverable without moving into broader test-infrastructure cleanup.

### 3. Can that config adjustment be bounded to this exact Aggregator backend verification path only?

Yes.

The adjustment can remain bounded to one exact path family and one already-existing Aggregator integration test. It does not require package changes, CI changes, command redesign, or unrelated test migration.

### 4. Can the support unit be reshaped without widening into broader test/tooling cleanup?

Yes.

The reshape can remain narrow by authorizing exactly one minimal discovery-config change in `server/vitest.config.ts` for the Aggregator backend integration test path only, while explicitly forbidding broader Vitest cleanup, package/toolchain work, unrelated test migration, and any g026 remediation.

## Decision Result

`VERIFICATION_SURFACE_UNIT_RESHAPE_LAWFUL`

Bounded rationale:

The open support unit is currently too narrow to resolve the structural mismatch it was opened to address. A narrow reshape is therefore lawful because one minimal `server/vitest.config.ts` discovery adjustment is now the smallest truthful fix surface. This remains bounded to the exact Aggregator backend verification path, preserves the active product unit unchanged, and avoids widening into general testing, tooling, or unrelated repo cleanup.

Exact reshaped in-scope line:

- one minimal `server/vitest.config.ts` discovery include adjustment for the exact Aggregator backend integration test path only
- minimum aligned path/test-file normalization only if still needed after that exact discovery adjustment
- focused re-verification of the Aggregator backend integration test using the approved command path
- explicit preservation of unrelated `g026-platform-subdomain-routing.spec.ts` failure as outside scope

Exact reshaped out-of-scope line:

- any product or UI behavior change
- any public-shell, auth, or navigation work
- any broader Vitest cleanup or server test-strategy redesign
- any package, CI, workspace, or toolchain modernization
- any unrelated test migration or normalization
- any fix to `g026-platform-subdomain-routing.spec.ts`
- any broader Aggregator family work

## Reshape Writeback

This decision reshapes the already-open unit `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001`.

It does not open a new unit.

`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` remains the sole current product-facing `ACTIVE_DELIVERY` unit.