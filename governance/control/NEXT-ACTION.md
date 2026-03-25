# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-25 (GOVERNANCE-OS-RESET-001 opening)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: GOVERNANCE-OS-RESET-001
type: IMPLEMENTATION
delivery_class: ACTIVE_DELIVERY
title: Governance OS posture reset
prerequisites_met: true
authorized_by: GOV-DEC-GOVERNANCE-OS-RESET-OPENING
date_authorized: 2026-03-25
notes: |
  GOVERNANCE-OS-RESET-001 is now the sole ACTIVE_DELIVERY unit because it directly affects live
  sequencing behavior and leaving it in DECISION_QUEUE would repeat the governance stall pattern
  being corrected. This opening is based on the completed Phase 1, Phase 2, and Phase 3 reset
  findings and authorizes one bounded governance-only operating-model correction only.
  No reset implementation was performed in this opening step, no product-facing unit was opened,
  and no execution-log cleanup, Sentinel program rewrite, candidate-ledger rewrite, or doctrine /
  product-plan authority auto-resolution was authorized here.
  GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001,
  GOVERNANCE-SENTINEL-CORRECTION-ORDER-ARTIFACT-EMISSION-001,
  GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-001,
  GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-001,
  GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001,
  GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001, and GOVERNANCE-SENTINEL-V1-SPEC-001
  remain open concurrently in Layer 0 with DECISION_QUEUE posture only.
  GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001 now also remains open concurrently in Layer 0 with
  DECISION_QUEUE posture only.
  TECS-FBW-ADMINRBAC remains DESIGN_GATE.
  No additional ACTIVE_DELIVERY unit was created and no product-facing implementation stream is
  authorized by implication.
```
