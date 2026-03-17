# NEXT-ACTION.md — Authorized Next Action

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-03-17 (GOV-OS-002 bootstrap)  
**Max Size:** 20 lines (structural gate)

> Exactly one authorized next action. Read this before any work begins.  
> Do not act on a different unit without updating this file first (governance unit required).

---

```yaml
unit_id: GOV-OS-003
type: GOVERNANCE
title: Unit Record Migration — create governance/units/ files for open units
prerequisites_met: true
authorized_by: auto-sequenced (per GOV-OS-001 Phase 2 migration plan)
date_authorized: 2026-03-17
notes: |
  GOV-OS-002 bootstrap complete. Governance control plane is now installed.
  All current product units are BLOCKED, DEFERRED, or DESIGN_GATE — none are OPEN.
  GOV-OS-003 completes Phase 2 of the Governance OS migration (per GOV-OS-001 Section 8).
  Alternative (operator decision required): authorize a backend design unit to resolve
  the TECS-FBW-002-B blocker (design + implement GET /api/tenant/trades route).
```
