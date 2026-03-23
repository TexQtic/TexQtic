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
| `check_results` | array | Non-empty list of per-check result objects using canonical check IDs only. |
| `allowlist_scope_checked` | boolean | Must record whether boundary/allowlist validation ran. |
| `correction_order_required` | boolean | Must be `true` on `FAIL`; `false` on `PASS`. |
| `correction_order_reference` | string | Required on retry after a prior `FAIL`; otherwise `not_applicable`. |
| `negative_evidence_required` | boolean | Must be `true` when broad-label retirement, disproval, or scope-blocking review is part of the subject. |
| `broad_claim_under_review` | string | Required when `negative_evidence_required` is `true`; otherwise `not_applicable`. |
| `negative_evidence_references` | array | Required when `negative_evidence_required` is `true`; otherwise empty. |
| `prior_exclusion_references` | array | Required when prior exclusions act as valid negative evidence; otherwise `not_applicable`. |
| `negative_evidence_verdict` | string | Must be `broad_claim_disproved`, `broad_claim_not_proven`, or `not_applicable`. |
| `generated_on` | string | ISO date for the gate-result record. |

## Per-Check Result Object Shape

Each `check_results` entry must contain:

| Field | Type | Requirement |
| --- | --- | --- |
| `check_id` | string | One canonical Sentinel v1 check identifier. |
| `check_name` | string | Exact canonical check name for that identifier. |
| `status` | string | Exactly `PASS` or `FAIL`. |
| `failure_reason` | string | Required on `FAIL`; `not_applicable` on `PASS`. |
| `evidence_refs` | array | Exact references used to support the check verdict. |
| `directive` | string | Exact required next action on failure, or `not_applicable` on pass. |

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

### `check_results[].check_id`

- `SENTINEL-V1-CHECK-001`
- `SENTINEL-V1-CHECK-002`
- `SENTINEL-V1-CHECK-003`
- `SENTINEL-V1-CHECK-004`
- `SENTINEL-V1-CHECK-005`
- `SENTINEL-V1-CHECK-006`
- `SENTINEL-V1-CHECK-007`
- `SENTINEL-V1-CHECK-008`
- `SENTINEL-V1-CHECK-009`

### `negative_evidence_verdict`

- `broad_claim_disproved`
- `broad_claim_not_proven`
- `not_applicable`

## Structural Rules

1. A `FAIL` result is invalid if `checks_failed` is empty.
2. A `PASS` result is invalid if `checks_failed` is non-empty.
3. A retry after `FAIL` is invalid unless `correction_order_reference` points to a bounded
   correction-order artifact.
4. Candidate-bearing work is invalid if `normalization_reference` is omitted.
5. Any result claiming Layer 0 safety is invalid if `layer0_reference` is omitted.
6. `check_results` must cover every mandatory check required by the checkpoint being evaluated.
7. Any `FAIL` in `check_results` must appear in `checks_failed`.
8. If `negative_evidence_required` is `true`, `broad_claim_under_review`,
   `negative_evidence_references`, and `negative_evidence_verdict` are all required.
9. If `negative_evidence_required` is `false`, `negative_evidence_verdict` must be
   `not_applicable`.
10. Every `directive` on a failed check must be exact and bounded, not advisory prose.

## Output Rule

Sentinel v1 must emit exactly one result record per checkpoint run, and that record must conform
to this schema.
