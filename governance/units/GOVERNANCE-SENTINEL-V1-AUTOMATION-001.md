---
unit_id: GOVERNANCE-SENTINEL-V1-AUTOMATION-001
title: Sentinel v1 automation implementation
type: GOVERNANCE
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-23
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 remains OPEN, remains the sole ACTIVE_DELIVERY implementation-ready unit, and NEXT-ACTION still points only to that unit · SPEC_PACKAGE_CONFIRMATION: the bounded Sentinel v1 doctrine/spec package is already implemented and fixes the exact check catalog, exact checkpoint set, exact gate-result schema, exact correction-order protocol, exact Layer 0 interaction rule, and exact authoritative-vs-transitional ledger posture · OPENING_GAP_CONFIRMATION: no lawful automation unit record or automation opening decision existed yet, so any later implementation prompt would otherwise risk implicit opening"
doctrine_constraints:
  - D-004: this is one bounded governance-tooling automation unit only; no second automation child or broader governance/tooling program may be mixed in
  - D-007: no product code, certification code, DB/schema, contract, or broad automation rollout is authorized in this opening step
  - D-011: the currently authorized ACTIVE_DELIVERY certification unit must remain authoritative in NEXT-ACTION throughout this opening unless a separate governance move changes it
  - D-013: opening is not implementation, implementation prompt is not implicit opening, and later automation must implement only the already-approved doctrine/spec package
decisions_required:
  - GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING: DECIDED (2026-03-23, Paresh)
  - GOV-DEC-GOVERNANCE-SENTINEL-V1-AUTOMATION-OPENING: DECIDED (2026-03-23, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-SENTINEL-V1-AUTOMATION-001` is one bounded governance-tooling unit for one later
separate Sentinel v1 automation implementation step.

It is limited to later local automation that must implement only the already-approved Sentinel v1
doctrine/spec package without widening doctrine, changing Layer 0 authorization, or touching
product/application code.

This opening does not implement automation.

## Acceptance Criteria

- [x] A lawful opening decision artifact exists
- [x] A lawful Layer 1 automation unit record exists
- [x] Layer 0 reflects the new open automation unit without displacing `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` as the sole active implementation next action
- [x] The opening clearly states that implementation is separate and not performed here
- [x] The opening is bounded to the already-approved Sentinel v1 automation scope only
- [x] A bounded local Sentinel v1 automation entrypoint exists
- [x] The entrypoint emits gate-result JSON using the approved schema shape
- [x] The entrypoint emits correction-order YAML using the approved template structure
- [x] The entrypoint enforces only the approved checkpoint set and approved check catalog
- [x] The implementation preserves Layer 0 read-only authority and does not displace the certification ACTIVE_DELIVERY authorization
- [x] Minimal local run documentation exists for bounded manual invocation

## Files Allowlisted (Modify)

This opening authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/units/GOVERNANCE-SENTINEL-V1-SPEC-001.md`
- `governance/units/GOVERNANCE-SENTINEL-V1-AUTOMATION-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-V1-AUTOMATION-OPENING.md`
- `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
- `governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md`
- `governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md`
- `docs/governance/`

No other files are authorized for edit in this opening step.

## Files Read-Only

- all application/product source files
- all certification implementation files
- all env files
- all backup files
- all log/output artifacts
- all generated artifacts
- all migration files
- all non-governance product docs unrelated to Sentinel v1 automation opening
- any secret-bearing or copied-secret surface
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`

## Evidence Record

- Spec opening decision id: `GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING`
- Automation opening decision id: `GOV-DEC-GOVERNANCE-SENTINEL-V1-AUTOMATION-OPENING`
- Preserved Layer 0 posture on entry: `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains `OPEN`, remains the sole `ACTIVE_DELIVERY` implementation-ready unit, `NEXT-ACTION` points only to that certification unit, `GOVERNANCE-SENTINEL-V1-SPEC-001` remains concurrently open as bounded governance-only spec work, and the new automation unit is concurrent governance-tooling work with `DECISION_QUEUE` delivery class only

## Exact In-Scope Boundary

This unit may later implement only:

- executable Sentinel v1 automation to the already-approved doctrine/spec package
- the exact approved check catalog fixed in `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
- the exact approved gate-result schema fixed in `governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md`
- the exact approved correction-order protocol fixed in `governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md`
- bounded local execution suitable for later manual invocation
- canonical-governance-artifact loading required by Sentinel v1 only
- authoritative handling of `CANDIDATE-NORMALIZATION-LEDGER.md`
- transitional/reference-only handling of `STEP2-PENDING-CANDIDATE-LEDGER.md`

## Exact Out-of-Scope Boundary

This opening does **not** authorize:

- any Sentinel automation implementation in this opening step
- any scripts, hooks, CI, bots, parsers, linters, or executable tooling changes in this opening step
- any product/application code
- any certification implementation work
- any DB/schema/migration work
- any contract/OpenAPI work
- any governance doctrine rewrite
- any change to the approved Sentinel v1 check catalog, trigger set, ownership semantics, gate-result schema, or correction-order protocol
- any change to the active certification implementation authorization in Layer 0
- any non-standard opening path

## Verification Profile For The Later Implementation Unit

- unit type: bounded governance-tooling implementation
- acceptance boundary:
  - executable Sentinel v1 automation exists and runs locally
  - it implements only the exact approved Sentinel v1 checks and exact approved checkpoint set
  - it reads only the approved governance artifacts needed for validation
  - it emits gate-result outputs consistent with the approved gate-result schema
  - it emits correction-order outputs consistent with the approved correction-order protocol/template
  - it enforces binary PASS/FAIL semantics only
  - it treats `CANDIDATE-NORMALIZATION-LEDGER.md` as authoritative normalized truth
  - it treats `STEP2-PENDING-CANDIDATE-LEDGER.md` as transitional/reference only
  - it preserves the existing Layer 0 interaction rule
  - it does not widen into CI/platform/product/package/schema/contract work
  - it does not change the active certification implementation authorization
- required verification modes:
  - repo inspection
  - local execution of the Sentinel v1 entrypoint
  - fixture or sample-run validation against representative governance artifacts
  - output-shape verification against the approved gate-result schema
  - correction-order output verification against the approved correction-order protocol/template
  - changed-file scope verification
  - no-widening verification against the approved Sentinel v1 spec

## Implementation Result

The bounded Sentinel v1 automation implementation is now delivered for local execution only.

Implemented surfaces:

- `scripts/governance/sentinel-v1.js` — plain Node CLI runner for the exact approved Sentinel v1
  checkpoints and checks only
- `package.json` — bounded local script entrypoint only
- `docs/governance/GOVERNANCE-SENTINEL-V1-AUTOMATION.md` — local execution and boundary notes

Delivered automation behaviors:

- loads only the approved canonical governance artifacts needed for Sentinel v1 validation
- derives required checks from the approved checkpoint matrix only
- emits binary `PASS` / `FAIL` gate-result JSON only
- emits deterministic correction-order YAML only
- treats `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md` as authoritative normalized
  truth
- treats `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md` as transitional/reference only
- validates Layer 0 consistency against `OPEN-SET.md`, `NEXT-ACTION.md`, and `SNAPSHOT.md`
- validates allowlist boundary conformance against the bounded implementation allowlist only

Explicitly not delivered:

- no Layer 0 mutation or sequencing change
- no CI integration
- no product/application code
- no certification implementation work
- no doctrine rewrite or expansion of the approved Sentinel v1 surface

## Purpose

Create one lawful governance opening so that any later Sentinel v1 automation implementation runs
inside an already-open bounded unit instead of being opened implicitly by an implementation prompt.
