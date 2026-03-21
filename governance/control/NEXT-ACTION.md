# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-21 (GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001
type: GOVERNANCE
title: Implement the bounded control-plane AdminRBAC revoke/remove child unit
prerequisites_met: true
authorized_by: GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING
date_authorized: 2026-03-21
notes: |
  GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING is now DECIDED.
  TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001 is now the sole OPEN implementation-ready unit.
  TECS-FBW-ADMINRBAC remains DESIGN_GATE.
  Scope is limited to control-plane revoke/remove authority only: SuperAdmin
  actor only, existing non-SuperAdmin internal control-plane admin target only,
  no self-revoke, no peer-SuperAdmin revoke, immediate privileged-session and
  refresh-token invalidation in scope, and explicit audit traceability
  required. No invite, role-change, tenant-scope, or broader authority
  expansion was opened.
```
