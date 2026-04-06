# SNAPSHOT.md — Governance Carry-Forward Context

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Max Size:** 100 lines (structural gate)

> Read this file only for session restore, dormant context, or strict-path / historical ambiguity.  
> This file is restore-grade only. It does not replace Layer 0 current-state files, Layer 1 unit records, or Layer 3 history.

---

```yaml
snapshot_date: 2026-04-06
snapshot_unit: GOV-DEC-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION-OPENING
governance_model_version: v1.7
reset_ratification: governance/decisions/GOV-DEC-GOVERNANCE-OS-RESET-WRITEBACK-001.md
present_posture_owner: governance/control/
live_product_sequencing_authority: docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md
candidate_truth_authority: docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md
implementation_roadmap_posture: derived_only
current_product_active_delivery_count: 1
current_product_active_delivery_unit: MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION
future_product_opening_requires_fresh_bounded_decision: true
current_open_counts:
  open: 12
  decision_queue: 11
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

- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` is now `OPEN` as the sole
  product-facing `ACTIVE_DELIVERY` unit.
- This unit is bounded to separating authenticated-only shell affordances from the exact non-WL
  B2C `HOME` path while preserving the shared branded entry-facing frame, home return, and
  browse-entry search continuity.
- This opening does not reopen the closed public browse-entry seam, seller/admin separation, or
  settings separation units and does not open orders/cart/checkout continuity or adjacent-family
  redesign.
- `TEXQTIC-NEXT-DELIVERY-PLAN-v2.md` and `TEXQTIC-GAP-REGISTER-v2.md` still preserve B2C at
  broader family resolution; the current exact opening is the narrower fresh bounded decision
  supplied by the newer B2C decision chain.
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
- The reproduced `g026-platform-subdomain-routing.spec.ts` typecheck failure remains explicit,
  unrelated residue outside this B2C opening and does not block it.

## Restore Notes

- Read `OPEN-SET.md`, `NEXT-ACTION.md`, and `BLOCKED.md` first. Read this file only when current context is missing or historically ambiguous.
- Ordinary bounded units now follow a lightweight path: minimum Layer 0 read, one live sequencing surface when product-facing, unit-record updates during work, and one compact close writeback.
- High-risk units keep the strict path with fuller historical context, control-critical Sentinel gating, and separate post-close audit artifacts when doctrine requires them.
- Current open `DECISION_QUEUE` governance records remain valid non-terminal truth, but they do not define the default governance burden for future bounded units.
