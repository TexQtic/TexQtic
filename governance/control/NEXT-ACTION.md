# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-22 (IMPERSONATION-SESSION-REHYDRATION-002 close)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: OPERATOR_DECISION_REQUIRED
type: DECISION_REQUIRED
title: Operator decision required after impersonation-session rehydration closure
prerequisites_met: true
authorized_by: IMPERSONATION-SESSION-REHYDRATION-002
date_authorized: 2026-03-22
notes: |
  IMPERSONATION-SESSION-REHYDRATION-002 is now CLOSED after implementation commit `1d9657a`
  and deployed runtime verification PASS on the bounded impersonation-session reload/rehydration
  slice only. The verified truth remains limited to active impersonation surviving reload/remount,
  preservation of the authenticated control-plane actor, preservation of the impersonated tenant
  target, preservation of the actor-target impersonation relationship after reload, fail-closed
  rejection of invalid persisted impersonation state, and non-regression of control-plane
  protection and actor identity truth in the exercised path. New defect candidate identified:
  tenant-experience runtime `500`s during impersonated tenant runtime. That observation is separate
  from impersonation session rehydration and requires separate later sequencing if pursued.
```
