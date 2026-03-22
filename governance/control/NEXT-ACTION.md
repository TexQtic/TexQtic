# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-22 (CONTROL-PLANE-AUTH-SHELL-TRANSITION-001)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: CONTROL-PLANE-IDENTITY-TRUTH-002
type: VERIFICATION
title: Verify bounded control-plane authenticated identity display truth correction
prerequisites_met: true
authorized_by: CONTROL-PLANE-IDENTITY-TRUTH-002
date_authorized: 2026-03-22
notes: |
  CONTROL-PLANE-IDENTITY-TRUTH-002 remains the sole OPEN unit and remains bounded to
  control-plane authenticated identity display truth only: control-plane chrome identity label
  correctness, control-plane persona/user presentation consistency, and control-plane-only state
  used to render displayed identity. Product implementation is complete, but runtime verification
  is currently blocked by the separate deployed runtime defect recorded in
  CONTROL-PLANE-AUTH-SHELL-TRANSITION-001: valid control-plane auth/token/API success occurs while
  the SPA fails to transition into the authenticated control-plane shell. No new implementation
  unit was opened by that decision. Tenant-shell, white-label, IMPERSONATION-STOP-CLEANUP-001,
  stop-path cleanup, auth redesign, DB/schema, API redesign, and realm-boundary continuation all
  remain excluded.
```
