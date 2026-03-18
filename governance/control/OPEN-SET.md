# OPEN-SET.md — TexQtic Governed Open Set

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-03-18 (GOVERNANCE-SYNC-TECS-FBW-013-BE-001)
**Max Size:** 50 lines (structural gate)

> This is the canonical list of all non-terminal governed units.  
> Read this file before any sequencing or next-unit-selection decision.  
> For detailed blocker/deferred/gated context, see `BLOCKED.md`.

---

| UNIT-ID | Title | Status | Wave | Last Updated |
|---|---|---|---|---|
| TECS-FBW-013 | B2B Request Quote — product decision + backend | OPEN | W5 | 2026-03-18 |
| TECS-FBW-ADMINRBAC | AdminRBAC invite + revoke authority | DESIGN_GATE | W5 | 2026-03-17 |

---

## Summary

- **OPEN** (implementation-ready): **1** (TECS-FBW-013)
- **BLOCKED**: 0
- **DEFERRED**: 0
- **DESIGN_GATE**: 1 (TECS-FBW-ADMINRBAC)
- **Total non-terminal units: 2**

TECS-FBW-006-B closed 2026-03-18: implementation/corrective/alignment commits d6e5e77 · d2e28ff · a5151a6 · 0f2d212 · a4c7fc9 + VERIFY-TECS-FBW-006-B PASS.
TECS-FBW-003-B closed 2026-03-18: implementation commit 4d71e17 + VERIFY-TECS-FBW-003-B VERIFIED_COMPLETE. GOV-CLOSE-TECS-FBW-003-B.
TECS-FBW-002-B closed 2026-03-17: frontend implementation commit b647092 + VERIFY-TECS-FBW-002-B VERIFIED_COMPLETE.

TECS-FBW-013-BE-001 is VERIFIED_COMPLETE and BLK-013-001 is resolved.
TECS-FBW-013 is now the only OPEN implementation-ready unit.

---

## Recently Closed (for carry-forward context)

| UNIT-ID | Status | Closed | Commit |
|---|---|---|---|
| TECS-FBW-006-B | VERIFIED_COMPLETE | 2026-03-18 | d6e5e77 · d2e28ff · a5151a6 · 0f2d212 · a4c7fc9 |
| TECS-FBW-006-B-BE-001 | VERIFIED_COMPLETE | 2026-03-18 | a2d8bfc · d212d0d |
| TECS-FBW-013-BE-001 | VERIFIED_COMPLETE | 2026-03-18 | 451f45b |
| TECS-FBW-003-B | VERIFIED_COMPLETE | 2026-03-18 | 4d71e17 |
| TECS-FBW-002-B | CLOSED | 2026-03-17 | b647092 (frontend) · 5ffd727 (backend) |
| GOV-SYNC-TECS-FBW-002-B-BLOCKER-RESOLUTION | CLOSED | 2026-03-17 | see git log |
| GOV-OS-002 | CLOSED | 2026-03-17 | see git log |
| GOV-OS-001 | CLOSED | 2026-03-17 | 91031f0 |
| TECS-FBW-012 | VERIFIED_COMPLETE | 2026-03-17 | b7d3c5d · 7f46d54 |

> **Rule:** Do not re-derive the open set from `gap-register.md` or tracker files.  
> If this file is missing or >7 days stale, run a governance maintenance unit before sequencing.
