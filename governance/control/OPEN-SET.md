# OPEN-SET.md — TexQtic Governed Open Set

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-03-20 (GOV-CLOSE-TECS-G026-CLEANUP-REMEDIATION-001)
**Max Size:** 50 lines (structural gate)

> This is the canonical list of all non-terminal governed units.  
> Read this file before any sequencing or next-unit-selection decision.  
> For detailed blocker/deferred/gated context, see `BLOCKED.md`.

---

| UNIT-ID | Title | Status | Wave | Last Updated |
|---|---|---|---|---|
| TECS-FBW-ADMINRBAC | AdminRBAC invite + revoke authority | DESIGN_GATE | W5 | 2026-03-17 |

---

## Summary

- **OPEN**: **0**
- **BLOCKED**: 0
- **DEFERRED**: 0
- **DESIGN_GATE**: 1 (TECS-FBW-ADMINRBAC)
- **Total non-terminal units: 1**

TECS-RFQ-BUYER-DETAIL-UI-001 closed 2026-03-19: implementation commit dcb5964 + VERIFY-TECS-RFQ-BUYER-DETAIL-UI-001 VERIFIED_COMPLETE.
TECS-RFQ-BUYER-LIST-READ-001 closed 2026-03-19: implementation commit 64500cf + verified RFQ UI evidence (2 files passed, 11 tests passed) + GOVERNANCE-SYNC-RFQ-002.
TECS-RFQ-BUYER-RESPONSE-READ-001 closed 2026-03-19: implementation commit 211800a + VERIFY-TECS-RFQ-BUYER-RESPONSE-READ-001 VERIFIED_COMPLETE.
TECS-RFQ-RESPONSE-001 closed 2026-03-19: implementation commit 7edb891 + VERIFY-TECS-RFQ-RESPONSE-001 VERIFIED_COMPLETE.
TECS-RFQ-SUPPLIER-READ-001 closed 2026-03-18: implementation commit c5ab120 + VERIFY-TECS-RFQ-SUPPLIER-READ-001 VERIFIED_COMPLETE.
TECS-RFQ-READ-001 closed 2026-03-18: implementation commit 49d757d + VERIFY-TECS-RFQ-READ-001 VERIFIED_COMPLETE.
TECS-FBW-013 closed 2026-03-18: implementation commit 060cac7 + corrective commit 7f59a62 + VERIFY-TECS-FBW-013 VERIFIED_COMPLETE.
TECS-FBW-006-B closed 2026-03-18: implementation/corrective/alignment commits d6e5e77 · d2e28ff · a5151a6 · 0f2d212 · a4c7fc9 + VERIFY-TECS-FBW-006-B PASS.
TECS-FBW-003-B closed 2026-03-18: implementation commit 4d71e17 + VERIFY-TECS-FBW-003-B VERIFIED_COMPLETE. GOV-CLOSE-TECS-FBW-003-B.
TECS-FBW-002-B closed 2026-03-17: frontend implementation commit b647092 + VERIFY-TECS-FBW-002-B VERIFIED_COMPLETE.

TECS-FBW-ADMINRBAC-REGISTRY-READ-001 closed 2026-03-20 after implementation commit 38419b5651ea736c2b569d6182002b9bd25c6eb3, runtime frontend verification commit 50d1e36adacb3a58ae714741193d61d5e65696e5, governance sync commit 82dae2397df9674baa934a5e6610cb447fe741a8, backend runtime proof, frontend runtime proof, and type-level proof.
TECS-G026-H-001 closed 2026-03-20 after implementation commit deef077, governance-sync commit e154f58, authoritative remote Supabase verification PASS, and bounded prerequisite proof. Additional historical `SELECT`-only grants on `catalog_items`, `memberships`, `rfq_supplier_responses`, and `users`, plus duplicate/equivalent `postgres` membership rows, remain preserved as bounded historical observations only and are not treated as resolved work by this closure step.
TECS-G026-DESIGN-CLARIFICATION-001 closed 2026-03-20 after recording the bounded clarification result that future G-026 routing must return to a resolver-only `texqtic_service` posture. The extra grants on `catalog_items`, `memberships`, `rfq_supplier_responses`, and `users` are now classified as separately governed non-routing dependencies that must be removed or re-homed before any routing opening may be considered.
TECS-G026-CLEANUP-REMEDIATION-001 closed 2026-03-20 after implementation commit 0f3d2c3, governance-sync commit f21ef8c, the already-recorded authoritative remote Supabase verification PASS, and a conservative closure step with mandatory post-close audit result `HOLD`. Broad G-026 routing remains unopened and no routing implementation-ready G-026 stream is OPEN.
TECS-FBW-ADMINRBAC remains DESIGN_GATE as the broad non-open parent stream.
No routing implementation-ready G-026 stream is currently OPEN.

---

## Recently Closed (for carry-forward context)

| UNIT-ID | Status | Closed | Commit |
|---|---|---|---|
| TECS-G026-CLEANUP-REMEDIATION-001 | CLOSED | 2026-03-20 | 0f3d2c3 · f21ef8c |
| TECS-G026-DESIGN-CLARIFICATION-001 | CLOSED | 2026-03-20 | see git log |
| TECS-G026-H-001 | CLOSED | 2026-03-20 | deef077 · e154f58 |
| TECS-FBW-ADMINRBAC-REGISTRY-READ-001 | CLOSED | 2026-03-20 | 38419b5 · 50d1e36 |
| TECS-RFQ-BUYER-LIST-READ-001 | VERIFIED_COMPLETE | 2026-03-19 | 64500cf |
| TECS-RFQ-BUYER-DETAIL-UI-001 | VERIFIED_COMPLETE | 2026-03-19 | dcb5964 |
| TECS-RFQ-BUYER-RESPONSE-READ-001 | VERIFIED_COMPLETE | 2026-03-19 | 211800a |
| TECS-RFQ-RESPONSE-001 | VERIFIED_COMPLETE | 2026-03-19 | 7edb891 |
| TECS-RFQ-SUPPLIER-READ-001 | VERIFIED_COMPLETE | 2026-03-18 | c5ab120 |
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
