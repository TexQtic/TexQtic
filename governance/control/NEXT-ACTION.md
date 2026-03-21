# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-21 (GOVERNANCE-SYNC-TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001
type: GOVERNANCE
title: Close the bounded control-plane AdminRBAC revoke/remove child unit
prerequisites_met: true
authorized_by: GOVERNANCE-SYNC-TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001
date_authorized: 2026-03-21
notes: |
  TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001 is now VERIFIED_COMPLETE after implementation commit d51a2a8
  and bounded verification evidence: focused UI PASS (6 tests), focused backend PASS (4 tests),
  and pnpm validate:contracts PASS.
  TECS-FBW-ADMINRBAC remains DESIGN_GATE.
  Scope remains limited to control-plane revoke/remove authority only: SuperAdmin
  actor only, existing non-SuperAdmin internal control-plane admin target only,
  no self-revoke, no peer-SuperAdmin revoke, next-request authorization failure
  after revoke/remove preserved, refresh-token invalidation preserved, and explicit
  audit traceability required. No invite, role-change, tenant-scope, or broader
  authority expansion was opened. This unit is postured for Close only; no new
  opening is implied.
```
