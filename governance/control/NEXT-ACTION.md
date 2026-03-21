# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-21 (GOV-DEC-RUNTIME-VERIFICATION-HARDENING-OPENING)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-RUNTIME-VERIFICATION-HARDENING-001
type: IMPLEMENTATION
title: Executable runtime verification hardening for implemented tenant-enterprise and white-label slices
prerequisites_met: true
authorized_by: GOV-DEC-RUNTIME-VERIFICATION-HARDENING-OPENING
date_authorized: 2026-03-21
notes: |
  This is the sole bounded implementation-ready verification-hardening unit.
  Scope is limited to repo-runnable runtime verification for already-implemented
  tenant-enterprise UI smoke paths, realm/session transitions, affected
  frontend/backend response-envelope checks, and white-label seeded
  storefront/catalog visibility and data-state paths.
  The unit exists because recent bounded implementations passed typecheck and
  bounded verification while real runtime failures still escaped to manual UI
  inspection.
  No broad QA transformation, CI redesign, auth redesign, catalog redesign,
  schema/migration work, product feature work, custom-domain/apex/DNS work,
  AdminRBAC expansion, RFQ expansion, or governance closure is authorized.
```
