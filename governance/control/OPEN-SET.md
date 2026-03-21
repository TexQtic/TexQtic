# OPEN-SET.md — TexQtic Governed Open Set

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-03-21 (GOVERNANCE-SYNC-GOV-VERIFY-01)
**Max Size:** 50 lines (structural gate)

> This is the canonical list of all non-terminal governed units.  
> Read this file before any sequencing or next-unit-selection decision.  
> For detailed blocker/deferred/gated context, see `BLOCKED.md`.

---

| UNIT-ID | Title | Status | Wave | Last Updated |
|---|---|---|---|---|
| GOV-VERIFY-01 | Mandatory automated verification policy-design child | OPEN | W5 | 2026-03-21 |
| TECS-FBW-ADMINRBAC | AdminRBAC invite + revoke authority | DESIGN_GATE | W5 | 2026-03-17 |

---

## Summary

- **OPEN** (implementation-ready): **1**
- **VERIFIED_COMPLETE** (postured for Close): **0**
- **BLOCKED**: 0
- **DEFERRED**: 0
- **DESIGN_GATE**: 1 (TECS-FBW-ADMINRBAC)
- **Total non-terminal units: 2**

GOV-VERIFY-01 remains OPEN as the sole bounded governance/policy-design unit for the current cycle. Implementation and verification are now canonically recorded as complete within the opened boundary, governance sync is now complete, and the unit is closure-ready only after this sync. Scope remains limited to declared verification profiles at Opening, closure evidence requirements by unit type and acceptance boundary, bounded category expectations, explicit closure-verdict posture, and manual-check advisory posture only. No Playwright implementation, tests, verifier tooling, CI workflows, governance-lint refinement, package changes, product changes, schema changes, AdminRBAC reopening, G-026 reopening, broad QA transformation, broad CI redesign, or repo-wide enforcement rollout is authorized by this sync.
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
TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001 closed 2026-03-21 after implementation commit 0b8fff2085490d32d379e43fc6a2303034563b11, governance-sync commit 963c9359eb551cef076913722071e4577cf7040f, and the mandatory post-close audit result `DECISION_REQUIRED`. Broad G-026 remains unopened, no broader domain authorization was created, resolver-only `texqtic_service` posture remains canonical, and no new routing unit is opened by implication.
TECS-RUNTIME-VERIFICATION-HARDENING-001 closed 2026-03-21 after implementation commit 858505b, governance-sync commit e4b3e1e, and the mandatory post-close audit result `DECISION_REQUIRED`. Scope remained limited to repo-runnable runtime verification for already-implemented tenant-enterprise UI/auth/contract paths and white-label seeded storefront/catalog visibility/data-state paths only; covered runtime failure classes now surface automatically for those bounded slices, and no broad QA, CI, auth, catalog, AdminRBAC, RFQ, or domain-routing program was opened by implication.
TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001 closed 2026-03-21 after implementation commit ec2c614, governance sync commit 6a34e64, and the mandatory post-close audit result `DECISION_REQUIRED`. The unit remained clarification-only, the next mutation child remained candidate-only and limited to control-plane admin access revoke/remove authority, no AdminRBAC implementation unit was opened, and no invite, role-change, tenant-scope, or broader authority expansion was authorized by implication.
TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001 closed 2026-03-21 after implementation commit 4ede95d, governance sync commit 8c58bcd, and the mandatory post-close audit result `DECISION_REQUIRED`. The unit remained clarification-only, `READY_FOR_OPENING` remained opening-readiness only, revoke/remove implementation was not opened, the candidate remained bounded to control-plane revoke/remove posture only, and no invite, role-change, tenant-scope, or broader authority expansion was authorized by implication.
TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001 closed 2026-03-21 after implementation commit d51a2a8, governance-sync commit 794fcd4, focused UI PASS (6 tests), focused backend PASS (4 tests), `pnpm validate:contracts` PASS, and mandatory post-close audit result `DECISION_REQUIRED`. The unit remained bounded to control-plane admin access revoke/remove authority only: `SuperAdmin` actor only, existing non-`SuperAdmin` internal control-plane admin target only, no self-revoke, no peer-`SuperAdmin` revoke, next-request authorization failure after revoke/remove preserved, refresh-token invalidation preserved, and explicit audit traceability required. No invite, role-change, tenant-scope, or broader authority expansion was authorized by implication.
TECS-FBW-ADMINRBAC remains DESIGN_GATE as the broad non-open parent stream.
GOV-VERIFY-01 is the sole OPEN governed unit and is now sync-complete and closure-ready.

---

## Recently Closed (for carry-forward context)

| UNIT-ID | Status | Closed | Commit |
|---|---|---|---|
| TECS-G026-CLEANUP-REMEDIATION-001 | CLOSED | 2026-03-20 | 0f3d2c3 · f21ef8c |
| TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001 | CLOSED | 2026-03-21 | 0b8fff2 · 963c935 |
| TECS-G026-DESIGN-CLARIFICATION-001 | CLOSED | 2026-03-20 | see git log |
| TECS-G026-H-001 | CLOSED | 2026-03-20 | deef077 · e154f58 |
| TECS-FBW-ADMINRBAC-REGISTRY-READ-001 | CLOSED | 2026-03-20 | 38419b5 · 50d1e36 |
| TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001 | CLOSED | 2026-03-21 | d51a2a8 · 794fcd4 |
| TECS-FBW-ADMINRBAC-NEXT-MUTATION-CLARIFICATION-001 | CLOSED | 2026-03-21 | ec2c614 · 6a34e64 |
| TECS-FBW-ADMINRBAC-REVOKE-REMOVE-OPENING-CLARIFICATION-001 | CLOSED | 2026-03-21 | 4ede95d · 8c58bcd |
| TECS-RUNTIME-VERIFICATION-HARDENING-001 | CLOSED | 2026-03-21 | 858505b · e4b3e1e |
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
