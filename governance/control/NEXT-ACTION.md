# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)
**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-18 (GOV-CLOSE-TECS-FBW-006-B-BE-001)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-FBW-006-B
type: IMPLEMENTATION
subtype: FRONTEND
title: Escalation mutations — frontend wiring across tenant and control plane
prerequisites_met: true
authorized_by: "PRODUCT-DEC-ESCALATION-MUTATIONS (Paresh, 2026-03-18) + GOV-CLOSE-TECS-FBW-006-B-BE-001"
date_authorized: 2026-03-18
notes: |
  PRODUCT-DEC-ESCALATION-MUTATIONS recorded as DECIDED 2026-03-18.
  TECS-FBW-006-B-BE-001 is VERIFIED_COMPLETE (implementation commits a2d8bfc · d212d0d; verification PASS).
  BLK-006-B-001 is resolved. TECS-FBW-006-B is now OPEN.
  Active scope: frontend mutation wiring only.
  Authorized surfaces: tenant create escalation, tenant resolve own escalation,
  control-plane upgrade / resolve / override.
  Tenant upgrade and tenant override remain out of scope.
```
