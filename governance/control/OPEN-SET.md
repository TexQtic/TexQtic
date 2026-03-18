# OPEN-SET.md — TexQtic Governed Open Set

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-03-18 (GOVERNANCE-SEQUENCE-SUPPLIER-RFQ-READS-001)
**Max Size:** 50 lines (structural gate)

> This is the canonical list of all non-terminal governed units.  
> Read this file before any sequencing or next-unit-selection decision.  
> For detailed blocker/deferred/gated context, see `BLOCKED.md`.

---

| UNIT-ID | Title | Status | Wave | Last Updated |
|---|---|---|---|---|
| TECS-RFQ-SUPPLIER-READ-001 | Supplier RFQ reads — inbox list + detail API slice | OPEN | W5 | 2026-03-18 |
| TECS-FBW-ADMINRBAC | AdminRBAC invite + revoke authority | DESIGN_GATE | W5 | 2026-03-17 |

---

## Summary

- **OPEN** (implementation-ready): **1**
- **BLOCKED**: 0
- **DEFERRED**: 0
- **DESIGN_GATE**: 1 (TECS-FBW-ADMINRBAC)
- **Total non-terminal units: 2**

TECS-RFQ-READ-001 closed 2026-03-18: implementation commit 49d757d + VERIFY-TECS-RFQ-READ-001 VERIFIED_COMPLETE.
TECS-FBW-013 closed 2026-03-18: implementation commit 060cac7 + corrective commit 7f59a62 + VERIFY-TECS-FBW-013 VERIFIED_COMPLETE.
TECS-FBW-006-B closed 2026-03-18: implementation/corrective/alignment commits d6e5e77 · d2e28ff · a5151a6 · 0f2d212 · a4c7fc9 + VERIFY-TECS-FBW-006-B PASS.
TECS-FBW-003-B closed 2026-03-18: implementation commit 4d71e17 + VERIFY-TECS-FBW-003-B VERIFIED_COMPLETE. GOV-CLOSE-TECS-FBW-003-B.
TECS-FBW-002-B closed 2026-03-17: frontend implementation commit b647092 + VERIFY-TECS-FBW-002-B VERIFIED_COMPLETE.

TECS-RFQ-SUPPLIER-READ-001 is now the single implementation-ready supplier RFQ read follow-on unit after
PRODUCT-DEC-SUPPLIER-RFQ-READS was recorded as DECIDED.
TECS-FBW-ADMINRBAC remains DESIGN_GATE and is not authorized to open.

---

## Recently Closed (for carry-forward context)

| UNIT-ID | Status | Closed | Commit |
|---|---|---|---|
| TECS-RFQ-READ-001 | VERIFIED_COMPLETE | 2026-03-18 | 49d757d |
| TECS-RFQ-DOMAIN-001 | VERIFIED_COMPLETE | 2026-03-18 | 3c8fc31 · db8cc60 |
| TECS-FBW-013 | VERIFIED_COMPLETE | 2026-03-18 | 060cac7 · 7f59a62 |
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
