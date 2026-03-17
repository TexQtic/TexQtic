# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)
**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-17 (GOV-OS-004 control-plane sync)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: GOV-OS-005
type: GOVERNANCE
title: Decision Ledger Bootstrap — create governance/decisions/ layer
prerequisites_met: true
authorized_by: auto-sequenced (GOV-OS-001 Phase 3 migration plan)
date_authorized: 2026-03-17
notes: |
  Layer 1 installed (governance/units/ — 5 unit records + README, SHA 190936f).
  Layer 2 (governance/decisions/) not yet installed. No product unit is OPEN.
  All units are BLOCKED, DEFERRED, or DESIGN_GATE. No deferred/gated unit may
  proceed without Layer 2 decision records in governance/decisions/.
```
