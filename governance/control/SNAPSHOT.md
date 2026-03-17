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
last_unit_closed: GOV-OS-002
last_commit: GOV-OS-002 bootstrap commit (see git log)
doctrine_version: v1.4
rls_maturity: "5.0 / 5"
migrations_applied: "82 / 82"
governance_os_installed: true
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

`GOV-OS-003` · GOVERNANCE · Unit Record Migration Batch 1 — create `governance/units/` files for open units

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

**G-028 C4 vs C6 distinction (preserved):**  
- C4 = `ai.control.*` event-domain contract only  
- C6 = control-plane emitter wiring only  
These are distinct closed units and must not be conflated.

## Session Notes

- Governance OS control plane installed 2026-03-17 by GOV-OS-002
- Canonical operational files: `governance/control/` (5 files — this directory)
- Legacy large files (`gap-register.md`, `IMPLEMENTATION-TRACKER-2026-03.md`) remain preserved as historical secondary references; they are NOT operational truth
- Design documents in `docs/governance/control/` (GOV-OS-001-DESIGN.md + README.md)
- Layer 1 unit records (`governance/units/`) and Layer 2 decisions (`governance/decisions/`) have not yet been created — that is the scope of GOV-OS-003 and later phases
- All product work requires blocker resolution or product/design decision before implementation may proceed
