# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-22 (CONTROL-PLANE-AUTH-SHELL-TRANSITION-002)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: CONTROL-PLANE-AUTH-SHELL-TRANSITION-002
type: IMPLEMENTATION
title: Implement bounded control-plane auth-shell transition correction
prerequisites_met: true
authorized_by: CONTROL-PLANE-AUTH-SHELL-TRANSITION-002
date_authorized: 2026-03-22
notes: |
  CONTROL-PLANE-AUTH-SHELL-TRANSITION-002 is now OPEN as one additional bounded implementation
  unit for control-plane auth-shell transition only: post-login shell transition, control-plane
  session rehydration on app mount, and login-success-to-shell-state propagation for the
  control-plane path. CONTROL-PLANE-IDENTITY-TRUTH-002 remains OPEN in VERIFICATION and remains
  blocked by this separate deployed runtime defect until the control-plane shell path becomes
  reachable again. No implementation has been executed by this opening step. Banner identity truth,
  tenant-shell, white-label, IMPERSONATION-STOP-CLEANUP-001, broader impersonation behavior, auth
  redesign, DB/schema, API redesign, and realm-boundary continuation all remain excluded.
```
