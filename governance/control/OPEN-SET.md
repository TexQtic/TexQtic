# OPEN-SET.md — TexQtic Governed Open Set

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-03-17 (GOV-OS-002 bootstrap)  
**Max Size:** 50 lines (structural gate)

> This is the canonical list of all non-terminal governed units.  
> Read this file before any sequencing or next-unit-selection decision.  
> For detailed blocker/deferred/gated context, see `BLOCKED.md`.

---

| UNIT-ID | Title | Status | Wave | Last Updated |
|---|---|---|---|---|
| TECS-FBW-002-B | Trades tenant panel — backend route prerequisite | BLOCKED | W3-residual | 2026-03-17 |
| TECS-FBW-003-B | Escrow mutations + detail view | DEFERRED | W3-residual | 2026-03-17 |
| TECS-FBW-006-B | Escalation mutations (upgrade / resolve / override) | DEFERRED | W3-residual | 2026-03-17 |
| TECS-FBW-013 | B2B Request Quote — product decision + backend | DEFERRED | W5 | 2026-03-17 |
| TECS-FBW-ADMINRBAC | AdminRBAC invite + revoke authority | DESIGN_GATE | W5 | 2026-03-17 |

---

## Summary

- **OPEN** (implementation-ready): **0**
- **BLOCKED**: 1 (TECS-FBW-002-B)
- **DEFERRED**: 3 (TECS-FBW-003-B, TECS-FBW-006-B, TECS-FBW-013)
- **DESIGN_GATE**: 1 (TECS-FBW-ADMINRBAC)
- **Total non-terminal units: 5**

No product unit is currently OPEN (implementation-ready). All open product units require
a blocker resolution, product decision, or explicit design authorization before work may begin.

---

## Recently Closed (for carry-forward context)

| UNIT-ID | Status | Closed | Commit |
|---|---|---|---|
| GOV-OS-002 | CLOSED | 2026-03-17 | see git log |
| GOV-OS-001 | CLOSED | 2026-03-17 | 91031f0 |
| TECS-FBW-012 | VERIFIED_COMPLETE | 2026-03-17 | b7d3c5d · 7f46d54 |

> **Rule:** Do not re-derive the open set from `gap-register.md` or tracker files.  
> If this file is missing or >7 days stale, run a governance maintenance unit before sequencing.
