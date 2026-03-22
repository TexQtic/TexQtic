# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-22 (GOV-CLOSE-CONTROL-PLANE-IDENTITY-TRUTH-002)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: OPERATOR_DECISION_REQUIRED
type: DECISION_REQUIRED
title: Operator decision required after identity-truth closure
prerequisites_met: true
authorized_by: GOV-CLOSE-CONTROL-PLANE-IDENTITY-TRUTH-002
date_authorized: 2026-03-22
notes: |
  CONTROL-PLANE-IDENTITY-TRUTH-002 is now CLOSED after implementation commit `44db73c`,
  deployed identity-truth verification PASS, and the mandatory post-close audit emitted in the
  same closure operation. Verified truth is limited to the bounded control-plane identity slice:
  baseline control-plane identity PASS, impersonation banner identity PASS, baseline actor equals
  banner actor PASS, and no mixed or stale actor identity observed. New defect candidate identified:
  impersonation session rehydration failure. Active impersonation does not persist across reload and
  returns the app to `AUTH`; this observation remains out of scope for the closed identity-truth
  unit and requires separate operator sequencing.
```
