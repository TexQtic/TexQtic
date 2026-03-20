# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)
**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-20 (GOV-DEC-ADMINRBAC-REGISTRY-READ-OPENING)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-FBW-ADMINRBAC-REGISTRY-READ-001
type: IMPLEMENTATION
title: Open the bounded AdminRBAC registry read slice only
prerequisites_met: true
authorized_by: GOV-DEC-ADMINRBAC-REGISTRY-READ-OPENING
date_authorized: 2026-03-20
notes: |
  Both AdminRBAC gate decisions are now resolved and the broad parent stream
  TECS-FBW-ADMINRBAC remains non-open because it is still too broad to truthfully
  open as one first implementation-ready unit. The only authorized first slice is
  TECS-FBW-ADMINRBAC-REGISTRY-READ-001: a bounded read-only control-plane admin
  access registry surface. No invite, revoke, role assignment/change mutation,
  self-elevation, session invalidation, blanket read-everything posture, or
  tenant-plane membership flow is authorized in this first slice.
```
