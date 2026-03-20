# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-20 (GOV-CLOSE-TECS-G026-H-001)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-G026-DESIGN-CLARIFICATION-001
type: DESIGN_REFINEMENT
title: Clarify texqtic_service resolver-role discrepancy posture before any routing opening
prerequisites_met: true
authorized_by: GOV-DEC-G026-DESIGN-CLARIFICATION-OPENING
date_authorized: 2026-03-20
notes: |
  TECS-G026-H-001 remains CLOSED.
  This bounded next step is design clarification only.
  Clarify the intended canonical resolver-role posture for texqtic_service,
  including the status of extra SELECT grants and duplicate/equivalent postgres
  membership rows, before any future routing opening may be considered.
  The broad bounded G-026 v1 routing stream is not open.
  No routing unit or cleanup implementation unit is authorized by this opening.
  TECS-FBW-ADMINRBAC remains DESIGN_GATE.
  RFQ remains capped at pre-negotiation.
  Forbidden: no broad G-026 opening, no routing opening, no cleanup implementation,
  no apex/custom-domain scope, no AdminRBAC opening.
```
