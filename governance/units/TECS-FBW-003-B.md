---
unit_id: TECS-FBW-003-B
title: Escrow Mutations and Detail View — frontend wiring (G-018 tenant endpoints)
type: IMPLEMENTATION
status: VERIFIED_COMPLETE
wave: W3-residual
plane: TENANT
opened: 2026-03-07
closed: 2026-03-18
verified: 2026-03-18
commit: 4d71e17
evidence: "VERIFY-TECS-FBW-003-B PASS · commit 4d71e17 · GOV-CLOSE-TECS-FBW-003-B"
doctrine_constraints:
  - D-010: product-authorized 2026-03-18; PRODUCT-DEC-ESCROW-MUTATIONS DECIDED
  - D-011: org_id must scope all escrow mutations (no cross-tenant write)
  - D-001: RLS must enforce tenant isolation on all escrow write paths
decisions_required:
  - PRODUCT-DEC-ESCROW-MUTATIONS (DECIDED 2026-03-18 — see governance/decisions/PRODUCT-DECISIONS.md)
blockers: []
---

## Unit Summary

TECS-FBW-003-B covers frontend wiring of all G-018 escrow mutation surfaces: detail view,
create escrow account, record transaction, and lifecycle transition in the tenant panel.
The parent unit TECS-FBW-003-A (read-only EscrowPanel.tsx) is VERIFIED_COMPLETE.
This unit is now OPEN following PRODUCT-DEC-ESCROW-MUTATIONS (DECIDED 2026-03-18,
authorized by Paresh). The G-018 backend is fully implemented and tested; this unit is
frontend-only.

## Acceptance Criteria

*Satisfied — unit is VERIFIED_COMPLETE. All criteria met in commit 4d71e17.*

- [x] `GET /api/tenant/escrows/:escrowId` — escrow detail view wired in `EscrowPanel.tsx`
      (derived balance displayed; D-020-B compliant — server-computed SUM, not stored column)
- [x] `POST /api/tenant/escrows` — create escrow account control wired; DRAFT initial state only
- [x] `POST /api/tenant/escrows/:escrowId/transactions` — record ledger entry wired
      HOLD / RELEASE / REFUND available to normal tenant operations users
      ADJUSTMENT restricted to elevated tenant role (tenant-admin / designated ops authority)
      aiTriggered always false (D-020-C; no AI integration in this unit)
      Two-phase confirmation step before any irreversible ledger write
- [x] `POST /api/tenant/escrows/:escrowId/transition` — lifecycle transition wired
      All four result states handled in UI: APPLIED / PENDING_APPROVAL / ESCALATION_REQUIRED / DENIED
      PENDING_APPROVAL surfaces "awaiting approval" feedback (G-021 Maker-Checker)
      ENTITY_FROZEN error handled gracefully (D-022-B/C)
- [x] org_id derived from JWT exclusively; tenantId never in request body (D-017-A)
- [x] `services/escrowService.ts` extended with mutation client functions
- [x] TypeScript type-check passes (EXIT 0)
- [x] Lint passes (EXIT 0)

## Files Allowlisted (Modify)
- `components/Tenant/EscrowPanel.tsx` — extend with detail view and mutation controls
- `services/escrowService.ts` — add mutation client functions (create, recordTransaction, transition)

## Files Read-Only
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` (historical reference)

## Evidence Record
- Implementation commit: `4d71e17` — `feat(tenant): implement TECS-FBW-003-B escrow detail and mutation flows`
- Files changed: `components/Tenant/EscrowPanel.tsx` · `services/escrowService.ts` (exactly 2 allowlisted files)
- Verification: VERIFY-TECS-FBW-003-B — Result: **PASS** — Gap Decision: **VERIFIED_COMPLETE**
- Verification date: 2026-03-18
- TypeScript: EXIT 0 (pre-commit) · ESLint: EXIT 0 (pre-commit)
- All 8 acceptance criteria confirmed satisfied
- Constitutional constraints confirmed: D-017-A · D-020-B · D-020-C · D-022-B/C · G-021

## Governance Closure
- Governance close unit: `GOV-CLOSE-TECS-FBW-003-B` — 2026-03-18
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- All Layer 0 and Layer 1 files updated by GOV-CLOSE-TECS-FBW-003-B
- Unit is terminal. Do not reopen (D-008).

---

## Allowed Next Step

**This unit is VERIFIED_COMPLETE and closed.** No further action on this unit is authorized (D-008).

The remaining portfolio is: TECS-FBW-006-B (DEFERRED) · TECS-FBW-013 (DEFERRED) · TECS-FBW-ADMINRBAC (DESIGN_GATE).
An operator decision is required before any further implementation work may begin.

## Forbidden Next Step

- Do **not** exceed the authorized scope defined in PRODUCT-DEC-ESCROW-MUTATIONS
- Do **not** implement aiTriggered=true mutation paths (not in scope for this unit)
- Do **not** touch `EscrowAdminPanel.tsx` or any control-plane escrow surface
- Do **not** add a balance column to the list view (D-020-B — balance is in detail view only, server-derived)
- Do **not** implement escalation mutation surfaces (separate unit TECS-FBW-006-B)
- Do **not** mix governance file edits with implementation work (D-006/D-007)

## Drift Guards

- Parent TECS-FBW-003-A is VERIFIED_COMPLETE (commit: GOVERNANCE-SYNC-111). That is the
  read-only EscrowPanel.tsx. It does not authorize work on this B-slice.
- D-020-B doctrine applies: no stored balance field assumption. Any future escrow mutation
  design must explicitly address this constraint.
- The tracker records this as "🔵 FUTURE SCOPE" — canonical equivalent: DEFERRED.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as OPEN) |
| What authorized it? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-ESCROW-MUTATIONS (DECIDED 2026-03-18) |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-011, D-001, D-020-B) |
| What is next? | Issue implementation prompt for TECS-FBW-003-B |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` line ~101 |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-18 — GOV-CLOSE-TECS-FBW-003-B. TECS-FBW-003-B VERIFIED_COMPLETE and closed.
Status transitioned: OPEN → VERIFIED_COMPLETE. Implementation commit: 4d71e17.
Verification: VERIFY-TECS-FBW-003-B — PASS.
