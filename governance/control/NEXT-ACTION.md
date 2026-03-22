# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-22 (GOV-CLOSE-CONTROL-PLANE-AUTH-SHELL-TRANSITION-002)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: CONTROL-PLANE-IDENTITY-TRUTH-002
type: VERIFICATION
title: Resume control-plane authenticated identity display truth verification
prerequisites_met: true
authorized_by: CONTROL-PLANE-IDENTITY-TRUTH-002
date_authorized: 2026-03-22
notes: |
  CONTROL-PLANE-AUTH-SHELL-TRANSITION-002 is now CLOSED after implementation commit `2538901`,
  deployed runtime verification PASS, and the mandatory post-close audit emitted in the same
  closure operation. The control-plane shell path is now reachable again: valid control-plane login
  enters the authenticated shell, valid stored control-plane auth rehydrates that shell on reload,
  invalid stored auth is rejected, unauthenticated control-plane API access remains `401`, and
  tenant-vs-control-plane separation remains intact in exercised paths. CONTROL-PLANE-IDENTITY-
  TRUTH-002 is now unblocked and returns to its bounded `VERIFICATION` phase only. Banner identity
  truth scope remains separate from tenant-shell, white-label, impersonation cleanup, broader auth
  redesign, DB/schema, API redesign, and realm-boundary continuation.
```
