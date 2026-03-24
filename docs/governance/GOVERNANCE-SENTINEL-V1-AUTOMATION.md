# GOVERNANCE-SENTINEL-V1-AUTOMATION

Date: 2026-03-23
Status: ACTIVE
Authority: `GOV-DEC-GOVERNANCE-SENTINEL-V1-AUTOMATION-OPENING`

## Purpose

This document explains how to run the bounded local Sentinel v1 automation entrypoint added for
`GOVERNANCE-SENTINEL-V1-AUTOMATION-001`.

The implementation is intentionally narrow:

- one local Node entrypoint
- no package dependency changes beyond one package script
- no CI, hook, plugin, or product integration
- no Layer 0 mutation by implication

## Runtime

- Node 22 LTS compatible
- no new external runtime dependencies
- entrypoint: `scripts/governance/sentinel-v1.js`
- package script: `npm run governance:sentinel:v1 -- <command ...>`

## Supported Commands

### `run`

Evaluates one approved Sentinel v1 checkpoint and emits exactly one gate-result JSON record.

Supported checkpoints:

- `candidate_normalization_progression`
- `opening_progression`
- `governance_sync_progression`
- `close_progression`
- `layer0_next_action_change`
- `clean_governance_review_claim`

Supported checks:

- `SENTINEL-V1-CHECK-001` candidate normalization schema conformance
- `SENTINEL-V1-CHECK-002` delivery class presence
- `SENTINEL-V1-CHECK-003` mirror-check traceability
- `SENTINEL-V1-CHECK-004` negative-evidence review
- `SENTINEL-V1-CHECK-005` Layer 0 consistency
- `SENTINEL-V1-CHECK-006` allowlist boundary conformance
- `SENTINEL-V1-CHECK-007` execution-log linkage applicability
- `SENTINEL-V1-CHECK-008` spec-surface linkage consistency
- `SENTINEL-V1-CHECK-009` correction-order completion

The runner derives the required checks from the approved checkpoint matrix and from the supplied
context flags only. It does not invent additional checks, warning tiers, or checkpoint classes.

## Retry After FAIL

- A rerun after any prior mandatory-gate `FAIL` must include `--retry-from-fail true`.
- Any rerun with `--retry-from-fail true` must also include `--correction-order-reference <path>`.
- The referenced path must already exist in repo truth and must point to a bounded correction-order artifact.
- Sentinel does not invent, infer, or auto-create that artifact during `run`.
- If no lawful correction-order artifact path has been created and approved yet, the retry remains blocked.

### `correction-order`

Emits one YAML correction-order artifact matching the approved template structure.

## Canonical Artifact Handling

- authoritative normalization source:
  - `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md`
- transitional/reference-only normalization source:
  - `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md`
- Layer 0 consistency source set:
  - `governance/control/OPEN-SET.md`
  - `governance/control/NEXT-ACTION.md`
  - `governance/control/SNAPSHOT.md`
- canonical spec surfaces:
  - `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
  - `governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md`
  - `governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md`

## Allowlist Boundary Handling

- `SENTINEL-V1-CHECK-006` validates `--modified-file` inputs against the bounded checkpoint-aware allowlist only.
- The base allowlist covers the canonical Sentinel governance automation surfaces.
- For `close_progression`, the supplied `--unit-file` is treated as one additional explicit lawful close surface because a lawful close of a governed unit necessarily edits that same unit record.
- This close-specific allowance does not widen any other checkpoint and does not authorize arbitrary `governance/units/*` edits.

## Example PASS Run

This example exercises the bounded automation opening posture without altering Layer 0 authority.

```bash
npm run governance:sentinel:v1 -- run \
  --checkpoint opening_progression \
  --subject GOVERNANCE-SENTINEL-V1-AUTOMATION-001 \
  --decision-ref governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-V1-AUTOMATION-OPENING.md \
  --evidence-ref governance/units/GOVERNANCE-SENTINEL-V1-AUTOMATION-001.md \
  --evidence-ref governance/control/OPEN-SET.md \
  --evidence-ref governance/control/NEXT-ACTION.md \
  --evidence-ref governance/control/SNAPSHOT.md \
  --modified-file package.json \
  --modified-file scripts/governance/sentinel-v1.js \
  --modified-file docs/governance/GOVERNANCE-SENTINEL-V1-AUTOMATION.md \
  --modified-file governance/units/GOVERNANCE-SENTINEL-V1-AUTOMATION-001.md
```

Expected behavior:

- checkpoint resolves to the approved opening check set only
- gate result status is binary `PASS` or `FAIL` only
- `allowlist_scope_checked` is `true`
- Layer 0 is read and validated but not modified

## Example Correction-Order Emission

```bash
npm run governance:sentinel:v1 -- correction-order \
  --correction-order-id GOVERNANCE-SENTINEL-V1-AUTOMATION-001-CO-001 \
  --failed-checkpoint governance_sync_progression \
  --failed-subject GOVERNANCE-SENTINEL-V1-AUTOMATION-001 \
  --failed-gate-result sentinel://fail-example \
  --failure-class allowlist_boundary \
  --required-correction "Constrain the changed-file set to the exact implementation allowlist." \
  --owner "governance-operator" \
  --retry-blocked-until "All non-allowlisted file edits are removed." \
  --evidence-required-for-retry governance/units/GOVERNANCE-SENTINEL-V1-AUTOMATION-001.md \
  --pass-fail-recheck-target SENTINEL-V1-CHECK-006 \
  --notes "Sample correction-order emission for local protocol verification."
```

## Retry Requirement Example

The rerun path after a prior `FAIL` is two-step by design:

1. emit or otherwise record one bounded correction-order artifact at an approved repo path
2. rerun the checkpoint with both `--retry-from-fail true` and `--correction-order-reference <that-path>`

Example rerun shape:

```bash
npm run governance:sentinel:v1 -- run \
  --checkpoint close_progression \
  --subject CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 \
  --retry-from-fail true \
  --correction-order-reference <approved-existing-correction-order-path> \
  --decision-ref governance/decisions/GOV-DEC-CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-OPENING.md \
  --evidence-ref governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md
```

If the correction-order artifact does not yet exist at an approved repo path, do not rerun the checkpoint.

## Boundary Notes

- The runner performs deterministic structural and linkage validation only.
- It does not rewrite doctrine to fit the code.
- It does not derive new queue classes, new checks, or warning-only outcomes.
- It does not mutate `OPEN-SET.md`, `NEXT-ACTION.md`, or `SNAPSHOT.md`.
- It does not read env files, generated artifacts, or secret-bearing surfaces.
