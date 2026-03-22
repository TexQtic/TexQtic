# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-22 (IMPERSONATION-SESSION-REHYDRATION-001)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: OPERATOR_DECISION_REQUIRED
type: DECISION_REQUIRED
title: Operator decision required after impersonation-session decision record
prerequisites_met: true
authorized_by: IMPERSONATION-SESSION-REHYDRATION-001
date_authorized: 2026-03-22
notes: |
  IMPERSONATION-SESSION-REHYDRATION-001 is now CLOSED as a bounded decision-only unit with result
  `OPENING_CANDIDATE`. The verified defect is separate from both already-closed implementation
  units: `CONTROL-PLANE-IDENTITY-TRUTH-002` remains closed on bounded actor-truth acceptance, and
  `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` remains closed on bounded baseline shell-transition
  acceptance. The remaining defect family is now classified as impersonation session lifecycle /
  rehydration failure only: during active impersonation, reload returns the app to `AUTH` instead
  of restoring the impersonation session. No implementation opening was created by this decision,
  and `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED` until a separate explicit opening is
  chosen.
```
