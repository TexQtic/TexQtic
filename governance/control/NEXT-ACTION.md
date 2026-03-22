# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-22 (TENANT-EXPERIENCE-RUNTIME-500-002 opening)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TENANT-EXPERIENCE-RUNTIME-500-002
type: IMPLEMENTATION
title: Open the bounded tenant-experience runtime 500 implementation unit
prerequisites_met: true
authorized_by: TENANT-EXPERIENCE-RUNTIME-500-001
date_authorized: 2026-03-22
notes: |
  TENANT-EXPERIENCE-RUNTIME-500-002 is now the sole OPEN implementation unit.
  Scope remains limited to correcting the exact failing tenant-experience request or runtime
  surface that produces the observed runtime `500` in the exercised impersonated-tenant path.
  This opening remains explicitly separate from control-plane identity truth, control-plane
  auth-shell transition, impersonation session rehydration, impersonation stop cleanup,
  broader tenant-shell correctness, white-label behavior, broader auth redesign, DB/schema work,
  and broader API redesign. No implementation has been executed by this opening operation.
```
