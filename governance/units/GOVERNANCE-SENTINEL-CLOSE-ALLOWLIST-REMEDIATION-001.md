---
unit_id: GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001
title: Sentinel close allowlist mismatch remediation
domain: GOVERNANCE
status: OPEN
delivery_class: DECISION_QUEUE
priority: W5
opened_at: 2026-03-24
source_decision: GOV-DEC-GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-OPENING
parent_blocker_subject: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002
blocker_checkpoint: close_progression
blocker_result: FAIL
blocker_check: SENTINEL-V1-CHECK-006
blocker_reason: non-allowlisted file in change scope: governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md
correction_order_required: true
---

# GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001

## Purpose

Resolve the exact Sentinel v1 close allowlist mismatch that blocked lawful closure of `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`.

## Opening Truth

- A lawful close attempt for `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` was made only after the mandatory manual Sentinel v1 workflow gate.
- The `close_progression` run returned `FAIL` on `SENTINEL-V1-CHECK-006`.
- The reported reason was `non-allowlisted file in change scope: governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md`.
- `correction_order_required` was returned as `true`.
- No certification close was performed.

## In Scope

- identify the exact allowlist-boundary mismatch affecting the certification close surface
- define the minimum bounded governance correction needed so the close gate can be lawfully attempted later
- define the required correction-order and rerun posture after correction
- keep Layer 0 truthful while remediation proceeds concurrently

## Out of Scope

- closing `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- changing certification implementation, verification basis, baseline commit, product code, DB/schema, contracts, or runtime behavior
- expanding Sentinel doctrine beyond this exact mismatch
- auto-triggering, CI integration, git hooks, bots, or broader tooling rollout

## Current Layer 0 Posture

- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY` item in `NEXT-ACTION` with `type: CLOSE`
- this remediation unit is concurrent `DECISION_QUEUE` only
- this remediation unit does not displace or supersede the blocked certification close stream

## Implementation Analysis Result

- Exact root cause found in repo truth: `scripts/governance/sentinel-v1.js` enforced `SENTINEL-V1-CHECK-006` through one global `AUTOMATION_ALLOWLIST` for every checkpoint, so `close_progression` had no explicit lawful path for the certification unit file even when that same unit record was necessarily part of the close surface.
- Exact mismatch class: runner implementation allowlist logic only.
- Not the root cause for this blocker: Layer 0 authority, certification implementation scope, spec/schema/template structure, or the certification unit record itself.

## Correction Applied

- `scripts/governance/sentinel-v1.js` now treats the supplied `--unit-file` as one additional explicit allowlisted surface for `close_progression` only.
- The base Sentinel automation allowlist remains unchanged for non-close checkpoints.
- No other checks, checkpoints, Layer 0 files, certification files, product files, schema files, or automation rollout surfaces were changed.
- No Sentinel rerun was performed in this remediation step.

## Completion Standard

This unit may progress only when the exact mismatch is bounded, the minimum lawful correction is defined without scope drift, and the required correction-order posture is explicit for a later remediation implementation/verification flow if needed.