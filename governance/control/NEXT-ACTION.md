# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-22 (IMPERSONATION-SESSION-REHYDRATION-002)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: IMPERSONATION-SESSION-REHYDRATION-002
type: IMPLEMENTATION
title: Implement bounded impersonation session rehydration correction
prerequisites_met: true
authorized_by: IMPERSONATION-SESSION-REHYDRATION-001
date_authorized: 2026-03-22
notes: |
  IMPERSONATION-SESSION-REHYDRATION-002 is now the sole OPEN implementation unit for the bounded
  impersonation session reload-loss defect. Scope is limited to persistence across reload,
  restoration of active impersonation state on app mount, and preservation of the authenticated
  control-plane actor plus impersonated tenant relationship after reload only. This opening
  remains separate from `CONTROL-PLANE-IDENTITY-TRUTH-002`, `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`,
  tenant-shell correctness, white-label behavior, impersonation stop cleanup, broader
  impersonation behavior, auth redesign, DB/schema, and API redesign. No implementation has been
  performed by this opening; the next canonical phase is later implementation for
  `IMPERSONATION-SESSION-REHYDRATION-002` only.
```
