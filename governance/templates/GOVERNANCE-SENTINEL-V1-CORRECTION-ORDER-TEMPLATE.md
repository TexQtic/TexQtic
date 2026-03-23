# GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE

Date: 2026-03-23
Status: ACTIVE / CANONICAL_V1_TEMPLATE
Authority: `GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING`

## Purpose

This template fixes the minimum artifact shape required after a failed mandatory Sentinel v1 gate
and before retry.

## Template

```yaml
correction_order_id: <bounded-id>
sentinel_version: v1
failed_checkpoint: <checkpoint>
failed_subject: <unit-id-or-artifact>
failed_gate_result: <artifact-ref>
failure_class:
  - taxonomy_schema
  - delivery_class_presence
  - mirror_check_traceability
  - layer0_consistency
  - linkage_consistency
  - allowlist_boundary
  - other_bounded
required_corrections:
  - <exact correction item>
owners:
  - <human or governed role>
retry_blocked_until:
  - <exact condition>
evidence_required_for_retry:
  - <artifact-ref-or-proof>
notes: <bounded explanatory note>
```

## Required Rules

1. The correction order must cite the failed gate-result artifact exactly.
2. The correction order must name the exact failure class, not a broad umbrella summary.
3. The correction order must define the evidence required for retry.
4. Retry is invalid until all listed required corrections are completed.
5. The correction order does not itself change Layer 0, open work, close work, or authorize
   implementation.
