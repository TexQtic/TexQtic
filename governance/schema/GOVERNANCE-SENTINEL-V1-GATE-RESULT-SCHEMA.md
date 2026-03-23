# GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA

Date: 2026-03-23
Status: ACTIVE / CANONICAL_V1_SCHEMA
Authority: `GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING`

## Purpose

This file fixes the required structure for every Sentinel v1 gate-result artifact.

## Required Fields

| Field | Type | Requirement |
| --- | --- | --- |
| `sentinel_version` | string | Must equal `v1`. |
| `checkpoint` | string | One exact checkpoint label from the v1 trigger set. |
| `subject` | string | Unit ID or artifact path under review. |
| `status` | string | Must be exactly `PASS` or `FAIL`. |
| `checks_run` | array | Non-empty list of exact check identifiers executed. |
| `checks_failed` | array | Empty on `PASS`; non-empty on `FAIL`. |
| `layer0_reference` | string | Required when Layer 0 interaction is relevant. |
| `normalization_reference` | string | Required for candidate-bearing work. |
| `decision_references` | array | Non-empty when the subject is governance-gated by decision. |
| `evidence_references` | array | Exact artifact paths or unit IDs used for proof. |
| `allowlist_scope_checked` | boolean | Must record whether boundary/allowlist validation ran. |
| `correction_order_required` | boolean | Must be `true` on `FAIL`; `false` on `PASS`. |
| `correction_order_reference` | string | Required on retry after a prior `FAIL`; otherwise `not_applicable`. |
| `generated_on` | string | ISO date for the gate-result record. |

## Controlled Values

### `checkpoint`

- `candidate_normalization_progression`
- `opening_progression`
- `governance_sync_progression`
- `close_progression`
- `layer0_next_action_change`
- `clean_governance_review_claim`

### `status`

- `PASS`
- `FAIL`

## Structural Rules

1. A `FAIL` result is invalid if `checks_failed` is empty.
2. A `PASS` result is invalid if `checks_failed` is non-empty.
3. A retry after `FAIL` is invalid unless `correction_order_reference` points to a bounded
   correction-order artifact.
4. Candidate-bearing work is invalid if `normalization_reference` is omitted.
5. Any result claiming Layer 0 safety is invalid if `layer0_reference` is omitted.

## Output Rule

Sentinel v1 must emit exactly one result record per checkpoint run, and that record must conform
to this schema.
