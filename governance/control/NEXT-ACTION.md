# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-22 (TENANT-EXPERIENCE-RUNTIME-500-001 decision)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: OPERATOR_DECISION_REQUIRED
type: DECISION_REQUIRED
title: Operator decision required after tenant-runtime 500 defect classification
prerequisites_met: true
authorized_by: TENANT-EXPERIENCE-RUNTIME-500-001
date_authorized: 2026-03-22
notes: |
  TENANT-EXPERIENCE-RUNTIME-500-001 is now CLOSED with result `OPENING_CANDIDATE` only.
  The currently recorded truth remains limited to observed tenant-experience runtime `500` errors
  during impersonated tenant runtime while the impersonation banner and tenant shell restoration
  still succeeded in the exercised path. This observation is now governed as a separate bounded
  defect family and remains explicitly separate from control-plane identity truth,
  control-plane auth-shell transition, impersonation session rehydration, impersonation stop
  cleanup, broader tenant-shell correctness, white-label behavior, broader auth redesign,
  DB/schema work, and API redesign. No implementation unit is opened by this decision.
```
