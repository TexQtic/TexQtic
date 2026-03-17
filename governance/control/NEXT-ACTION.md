# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)
**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-17 (GOV-SYNC-TECS-FBW-002-B-BLOCKER-RESOLUTION)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-FBW-002-B
type: IMPLEMENTATION
title: Trades tenant panel — frontend TradesPanel.tsx implementation
prerequisites_met: true
authorized_by: GOV-SYNC-TECS-FBW-002-B-BLOCKER-RESOLUTION
date_authorized: 2026-03-17
notes: |
  BLK-FBW-002-B-001 is resolved. Backend GET /api/tenant/trades is implemented
  and verified (commit 5ffd727, VERIFY-TECS-FBW-002-B-BE-ROUTE-001: VERIFIED_COMPLETE).
  TECS-FBW-002-B is now OPEN (implementation-ready).
  Next step: Issue the TECS-FBW-002-B implementation prompt for TradesPanel.tsx
  frontend work, per acceptance criteria in governance/units/TECS-FBW-002-B.md.
  No other product unit is OPEN. DEFERRED and DESIGN_GATE units unchanged.
```
