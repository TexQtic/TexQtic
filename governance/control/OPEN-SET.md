# OPEN-SET.md — TexQtic Governed Open Set

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-04-06 (GOV-DEC-B2C-SHELL-CLOSE-WITH-ADJACENT-FINDING)  
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
| CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001 | Control-plane B2C tenant-context entry realm mismatch | VERIFIED_COMPLETE | DECISION_QUEUE | W5 | 2026-04-06 |
| TECS-FBW-ADMINRBAC | AdminRBAC invite + revoke authority | DESIGN_GATE | DESIGN_GATE_QUEUE | W5 | 2026-03-17 |
| RFQ-NEGOTIATION-CONTINUITY | RFQ / negotiation continuity remains design-gated across WL and enterprise runtime | DESIGN_GATE | DESIGN_GATE_QUEUE | W5 | 2026-03-30 |

---

## Summary

- **OPEN**: **11**
- **VERIFIED_COMPLETE**: **1**
- **DESIGN_GATE**: **2**
- **BLOCKED**: **0**
- **DEFERRED**: **0**
- **ACTIVE_DELIVERY**: **0**
- **DECISION_QUEUE**: **12**
- **DESIGN_GATE_QUEUE**: **2**
- **Total non-terminal units**: **14**

## Operating Notes

- Layer 0 owns current non-terminal posture only.
- Live product sequencing authority: `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
- Canonical candidate/family truth: `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
- `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md` is derived planning context only.
- No product-facing `ACTIVE_DELIVERY` unit is currently open.
- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` is now `CLOSED` after
  bounded live production proof on the exact non-WL B2C `HOME` path and a separate close decision
  that preserved the stop-path `404` as a non-blocking adjacent finding only.
- Concurrent support unit `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` is now
  `VERIFIED_COMPLETE` after commit `a637998` removed the separate tenant-context entry blocker
  that had prevented truthful production verification of the now-closed B2C unit, and it remains
  separately close-ready only.
- The earlier blocked `REALM_MISMATCH` / `Loading workspace...` / `Starting...` symptom chain no
  longer reproduces.
- The earlier enterprise Orders neighbor-smoke issue did not reproduce on rerun and remains
  excluded from the closed B2C unit and the support unit.
- The observed impersonation-stop `404` remains a separate adjacent finding only and does not
  block closure of the B2C unit.
- `IMPERSONATION-STOP-CLEANUP-404-001` is now preserved as a separate decision-gated adjacent
  finding only. No opening is implied by that record.
- The broader `-v2` B2C family posture remains preserved at family resolution; this exact opening is the fresh bounded decision now selected from the newer B2C decision chain and does not widen into public-shell redesign, orders/cart/checkout continuity, adjacent-family redesign, or `g026` work.
- Current open `DECISION_QUEUE` governance records remain real non-terminal truth, but they do not define the default governance burden for future bounded units after this reset.
