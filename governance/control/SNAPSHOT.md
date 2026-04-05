# SNAPSHOT.md — Governance Carry-Forward Context

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Max Size:** 100 lines (structural gate)

> Read this file only for session restore, dormant context, or strict-path / historical ambiguity.  
> This file is restore-grade only. It does not replace Layer 0 current-state files, Layer 1 unit records, or Layer 3 history.

---

```yaml
snapshot_date: 2026-04-05
snapshot_unit: GOV-DEC-AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-RESHAPE
governance_model_version: v1.7
reset_ratification: governance/decisions/GOV-DEC-GOVERNANCE-OS-RESET-WRITEBACK-001.md
present_posture_owner: governance/control/
live_product_sequencing_authority: docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md
candidate_truth_authority: docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md
implementation_roadmap_posture: derived_only
current_product_active_delivery_count: 1
current_product_active_delivery_unit: AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS
future_product_opening_requires_fresh_bounded_decision: true
current_open_counts:
  open: 13
  decision_queue: 12
  design_gate: 2
  blocked: 0
  deferred: 0
current_open_governance_units:
  - GOVERNANCE-OS-RESET-001
  - GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001
  - GOVERNANCE-SENTINEL-CORRECTION-ORDER-ARTIFACT-EMISSION-001
  - GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-001
  - GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-001
  - GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001
  - GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001
  - GOVERNANCE-SENTINEL-V1-SPEC-001
  - GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001
  - LAUNCH-ACCELERATION-OVERLAY-RESHAPE-DESIGN-001
  - LAUNCH-ACCELERATION-OVERLAY-001
  - AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001
current_design_gates:
  - TECS-FBW-ADMINRBAC
  - RFQ-NEGOTIATION-CONTINUITY
normal_path_reset_active: true
strict_path_required_for: DB/RLS/auth/sequencing-authority/control-plane rebases/cross-family shifts/production-critical entry truth
candidate_normalization_mode: exception_only
sentinel_mode: control_critical_only
routine_close_audit_mode: compact_in_close_writeback
historical_truth_owner: governance/units/ + governance/log/
```

## Current Product Delivery Note

- `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` is now OPEN as the sole current product-facing
  `ACTIVE_DELIVERY` unit.
- The opened unit remains bounded to Aggregator home/discovery surface truthfulness, curated
  discovery entries, minimal trust-signaled discovery cues, minimum read-only data shaping,
  conditional narrow backend read support only if unavoidable, and optional secondary AI insight
  reuse only if subordinate.
- This opening does not reopen the broader design-gated Aggregator family and does not authorize
  counterparty detail continuity, intent capture, handoff creation, downstream RFQ/trade/order
  changes, negotiation/matching/routing, broad directory or schema redesign, settlement/revenue/
  orchestrator behavior, or any successor opening.
- Preserved governance investigation outcome: `PLANNING_STACK_NEEDS_RESHAPING`.
- The underlying need remains valid for a thin launch-acceleration overlay above governance, but
  the currently framed broad Launch Acceleration Planning Stack is not lawful to open as proposed.
- `LAUNCH-ACCELERATION-OVERLAY-RESHAPE-DESIGN-001` is now OPEN as a concurrent governance-only
  design unit to shape that thin overlay only.
- `LAUNCH-ACCELERATION-OVERLAY-001` is now OPEN as a concurrent governance/planning visibility-
  only unit bounded to the Launch Critical Path Register, Next-Opening Shortlist Matrix, and
  Rolling Launch Window Note, plus one embedded stagnation rule and one explicit non-duplication
  clause only.
- This opening does not authorize a broad planning stack, roadmap regeneration, product-facing
  opening, candidate-state authority, forecast commitment, or any new overlay opening authority
  beyond the bounded visibility unit recorded here.
- `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001` is now OPEN as one concurrent
  governance-only verification-support unit bounded to backend test discovery normalization for the
  existing Aggregator discovery integration test only.
- This concurrent support unit does not change product scope, does not authorize package/CI/tooling
  modernization, and does not absorb the unrelated `g026-platform-subdomain-routing.spec.ts`
  typecheck failure.
- The unit is now narrowly reshaped so that one minimal `server/vitest.config.ts` discovery include
  adjustment may be authorized for the exact Aggregator backend integration test path only, while
  broader Vitest cleanup, package/toolchain changes, unrelated test migration, and `g026` remain
  out of scope.

## Restore Notes

- Read `OPEN-SET.md`, `NEXT-ACTION.md`, and `BLOCKED.md` first. Read this file only when current context is missing or historically ambiguous.
- Ordinary bounded units now follow a lightweight path: minimum Layer 0 read, one live sequencing surface when product-facing, unit-record updates during work, and one compact close writeback.
- High-risk units keep the strict path with fuller historical context, control-critical Sentinel gating, and separate post-close audit artifacts when doctrine requires them.
- Current open `DECISION_QUEUE` governance records remain valid non-terminal truth, but they do not define the default governance burden for future bounded units.
