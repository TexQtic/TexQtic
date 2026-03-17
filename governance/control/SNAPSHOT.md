# SNAPSHOT.md — Governance Carry-Forward Context

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Max Size:** 100 lines (structural gate)

> Read this file to restore governance session context without scanning large legacy files.  
> Refresh this file at the end of every governance unit.  
> If this file is missing or >30 days stale, run a governance snapshot unit before implementation work resumes.

---

```yaml
snapshot_date: 2026-03-17
last_unit_closed: GOV-OS-007
last_commit: "086f40a — GOV-OS-007 archive migration (2026-03-17)"
doctrine_version: v1.4
rls_maturity: "5.0 / 5"
migrations_applied: "82 / 82"
governance_os_installed: true
layer_1_installed: true
layer_2_installed: true
layer_3_installed: true
layer_4_installed: true
```

---

## Current Open Set Summary

- **TECS-FBW-002-B** — `BLOCKED` — Trades tenant panel; needs GET /api/tenant/trades backend first
- **TECS-FBW-003-B** — `DEFERRED` — Escrow mutations; future scope; awaiting product authorization
- **TECS-FBW-006-B** — `DEFERRED` — Escalation mutations; future scope; awaiting product authorization
- **TECS-FBW-013** — `DEFERRED` — B2B Request Quote; product-deferred; UI remains visually disabled
- **TECS-FBW-ADMINRBAC** — `DESIGN_GATE` — Admin RBAC; requires explicit product + security decision

**No product unit is currently OPEN (implementation-ready).**

## Current Next Action

`GOV-OS-007` · GOVERNANCE · Archive Migration — move legacy docs to `governance/archive/` (Layer 4)

## Active Blockers

- **TECS-FBW-002-B** — Backend route `GET /api/tenant/trades` not yet designed or implemented

## Active Design Gates

- **TECS-FBW-ADMINRBAC** — Requires explicit product + security decision before any work

## Closed Baseline (must not be reopened)

| Group | Status |
|---|---|
| Wave 0–5 (all FBW units except residuals above) | ALL CLOSED |
| WL storefront tranche (PW5-WL1–7) | ALL CLOSED |
| Auth remediation chain (TECS-FBW-AUTH-001–003 etc.) | ALL CLOSED |
| G-028 slices C1–C6 | ALL VERIFIED_COMPLETE |
| Pre-Wave-5 remediation (PW5-V1–V4, PW5-U1–U3) | ALL CLOSED / PASS |
| GOV-OS-001 | CLOSED |
| GOV-OS-002 | CLOSED |
| GOV-OS-003 | CLOSED |
| GOV-OS-004 | CLOSED |
| GOV-OS-005 | VERIFIED_COMPLETE |
| GOV-OS-006 | CLOSED |

**G-028 C4 vs C6 distinction (preserved):**  
- C4 = `ai.control.*` event-domain contract only  
- C6 = control-plane emitter wiring only  
These are distinct closed units and must not be conflated.

## Session Notes

- Governance OS control plane installed 2026-03-17 by GOV-OS-002
- Canonical operational files: `governance/control/` (5 files — this directory)
- Legacy large files (`gap-register.md`, `IMPLEMENTATION-TRACKER-2026-03.md`, `IMPLEMENTATION-TRACKER-2026-Q2.md`, `2026-03-audit-reconciliation-matrix.md`) have been archived to `governance/archive/` (GOV-OS-007, 2026-03-17) and replaced with pointer stubs; they are NOT operational truth
- Design documents in `docs/governance/control/` (GOV-OS-001-DESIGN.md + README.md)
- Layer 1 unit records installed: `governance/units/` — 5 canonical unit files + README (GOV-OS-003, SHA 190936f, 2026-03-17)
- Layer 2 decision ledger installed: `governance/decisions/` — 4 files (PRODUCT/DESIGN/SECURITY-DECISIONS.md + README) (GOV-OS-005 VERIFIED_COMPLETE, 2026-03-17)
- Layer 3 execution log installed: `governance/log/` — 2 files (EXECUTION-LOG.md + README) (GOV-OS-006, 2026-03-17)
- Layer 4 archive installed: `governance/archive/` — README + 4 ARCHIVED-* files (GOV-OS-007, 2026-03-17)
- All 4 Governance OS layers now installed; no product unit is OPEN
- Future prompts must read Layer 0 → Layer 1 → Layer 2 before consulting Layer 3; see `governance/log/README.md`
- VOCABULARY SEPARATION (operator directive, 2026-03-17 — three vocabularies, never collapse):
  - Unit status: BLOCKED / DEFERRED / DESIGN_GATE / OPEN / VERIFIED_COMPLETE
  - Decision status: OPEN / DECIDED / SUPERSEDED
  - Log event result: CLOSED / VERIFIED_COMPLETE
  Do not let these collapse into one another in future prompts.
- All product work requires blocker resolution or product/design decision before implementation may proceed
