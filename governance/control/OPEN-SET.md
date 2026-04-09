# OPEN-SET.md — TexQtic Governed Open Set

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-04-09 (TEXQTIC-OPENING-LAYER-RESET-EXECUTION-2026-04-09)  
**Max Size:** 50 lines (structural gate)

> This file is the canonical list of all non-terminal governed units and current delivery class only.  
> Historical opening truth lives in Layer 1 and Layer 3 and does not compete with Layer 0 as live authority.

---

| UNIT-ID | Title | Status | Delivery Class | Wave | Last Updated |
| --- | --- | --- | --- | --- | --- |
| GOVERNANCE-OS-RESET-001 | Governance OS posture reset | OPEN | DECISION_QUEUE | W5 | 2026-03-25 |
| GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001 | Sentinel CHECK-005 recount remediation | OPEN | DECISION_QUEUE | W5 | 2026-03-24 |
| GOVERNANCE-SENTINEL-CORRECTION-ORDER-ARTIFACT-EMISSION-001 | Sentinel correction-order artifact emission | OPEN | DECISION_QUEUE | W5 | 2026-03-24 |
| GOVERNANCE-SENTINEL-CORRECTION-ORDER-REFERENCE-REMEDIATION-001 | Sentinel correction-order reference remediation | OPEN | DECISION_QUEUE | W5 | 2026-03-24 |
| GOVERNANCE-SENTINEL-CLOSE-RETRY-REMEDIATION-001 | Sentinel close retry blocker remediation | OPEN | DECISION_QUEUE | W5 | 2026-03-24 |
| GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001 | Sentinel close allowlist mismatch remediation | OPEN | DECISION_QUEUE | W5 | 2026-03-24 |
| GOVERNANCE-SENTINEL-MANUAL-WORKFLOW-001 | Mandatory manual Sentinel invocation workflow integration | OPEN | DECISION_QUEUE | W5 | 2026-03-24 |
| GOVERNANCE-SENTINEL-V1-SPEC-001 | Sentinel v1 specification artifacts and gate design | OPEN | DECISION_QUEUE | W5 | 2026-03-23 |
| GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001 | Candidate state normalization | OPEN | DECISION_QUEUE | W5 | 2026-03-24 |
| LAUNCH-ACCELERATION-OVERLAY-RESHAPE-DESIGN-001 | Thin launch-acceleration overlay reshape design | OPEN | DECISION_QUEUE | W5 | 2026-04-05 |
| LAUNCH-ACCELERATION-OVERLAY-001 | Thin launch-acceleration visibility overlay | OPEN | DECISION_QUEUE | W5 | 2026-04-05 |
| TECS-FBW-ADMINRBAC | AdminRBAC invite + revoke authority | DESIGN_GATE | DESIGN_GATE_QUEUE | W5 | 2026-03-17 |
| RFQ-NEGOTIATION-CONTINUITY | RFQ / negotiation continuity remains design-gated across WL and enterprise runtime | DESIGN_GATE | DESIGN_GATE_QUEUE | W5 | 2026-03-30 |

---

## Summary

- **OPEN**: **11**
- **DESIGN_GATE**: **2**
- **BLOCKED**: **0**
- **DEFERRED**: **0**
- **ACTIVE_DELIVERY**: **0**
- **DECISION_QUEUE**: **11**
- **DESIGN_GATE_QUEUE**: **2**
- **Total non-terminal units**: **13**

## Operating Notes

- Layer 0 owns current non-terminal posture only.
- Live opening-layer baseline:
  `governance/analysis/TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09.md`
- Live taxonomy authority:
  `governance/control/TEXQTIC-OPENING-LAYER-TAXONOMY-TRUTH-BASELINE-2026-04-09.md`
- Live opening-layer authority map:
  `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-09.md`
- Live sequencing authority:
  `governance/control/TEXQTIC-OPENING-LAYER-SEQUENCING-AND-NEXT-CYCLE-ENTRY-2026-04-09.md`
- The old `-v2` chain is retained as historical evidence and reconciliation input only, not live
  opening-layer authority.
- Current open product-facing `ACTIVE_DELIVERY`: none.
- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` and
  `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` are now `CLOSED` complete by
  `GOV-DEC-B2C-SHELL-CLOSE-WITH-ADJACENT-FINDING` and
  `GOV-DEC-CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-CLOSE`; no implicit successor
  opening is created by those closures.
- The earlier blocked `REALM_MISMATCH` / `Loading workspace...` / `Starting...` symptom chain no
  longer reproduces.
- The earlier enterprise Orders neighbor-smoke issue did not reproduce on rerun and remains
  excluded from the closed B2C unit and the closed support unit.
- `IMPERSONATION-STOP-CLEANUP-404-001` is now preserved as a separate decision-gated adjacent
  finding only. No opening is implied by that record.
- The broader `-v2` B2C family posture remains preserved at family resolution; this exact opening is the fresh bounded decision now selected from the newer B2C decision chain and does not widen into public-shell redesign, orders/cart/checkout continuity, adjacent-family redesign, or `g026` work.
- Current open `DECISION_QUEUE` governance records remain real non-terminal truth, but they do not define the default governance burden for future bounded units after this reset.
