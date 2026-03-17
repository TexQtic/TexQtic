---
unit_id: TECS-FBW-003-B
title: Escrow Mutations and Detail View — future scope
type: IMPLEMENTATION
status: DEFERRED
wave: W3-residual
plane: TENANT
opened: 2026-03-07
closed: null
verified: null
commit: null
evidence: null
doctrine_constraints:
  - D-010: product-deferred; must not be treated as a bug or reopened without product authorization
  - D-011: org_id must scope all escrow mutations when authorized (no cross-tenant write)
  - D-001: RLS must enforce tenant isolation on any escrow write path
decisions_required:
  - PRODUCT-DEC-ESCROW-MUTATIONS (not yet made; future product decision required)
blockers: []
---

## Unit Summary

TECS-FBW-003-B covers escrow mutations (create, update, dispute, resolve) and the escrow
detail view in the tenant panel. The parent unit TECS-FBW-003-A (read-only EscrowPanel.tsx)
is already VERIFIED_COMPLETE. This B-slice is intentionally deferred to future scope by
product decision. It must not be implemented until explicit product authorization is granted.

## Acceptance Criteria

*Not yet active — unit is DEFERRED. Acceptance criteria will be defined when product authorizes.*

Expected future criteria (illustrative only; do not treat as active work):
- [ ] Escrow mutation endpoints designed and implemented (server-side)
- [ ] EscrowPanel.tsx extended with mutation controls (create/dispute/resolve)
- [ ] Escrow detail view implemented
- [ ] Two-phase flow / preview step before commit (per D-020-B doctrine)
- [ ] org_id-scoped writes; RLS enforced
- [ ] TypeScript type-check passes (EXIT 0)
- [ ] Lint passes (EXIT 0)

## Files Allowlisted (Modify)
*Not yet defined — pending product authorization.*

## Files Read-Only
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` (historical reference)

## Evidence Record
*Not yet recorded — unit is DEFERRED.*

## Governance Closure
*Not yet set — unit is DEFERRED and not implementation-ready.*

---

## Allowed Next Step

**Nothing.** This unit is DEFERRED.

The only allowed next step is a **product authorization event** recorded in
`governance/decisions/PRODUCT-DECISIONS.md` (Layer 2 — Decision Ledger), followed by
a governance unit that transitions this unit from DEFERRED → OPEN. Until that authorization
exists in the decision ledger, no implementation work may begin.

## Forbidden Next Step

- Do **not** begin any escrow mutation or detail-view implementation
- Do **not** extend EscrowPanel.tsx with write controls without product authorization
- Do **not** treat TECS-FBW-003-A (read-only panel, VERIFIED_COMPLETE) as authorization for mutations
- Do **not** promote this unit to OPEN or IN_PROGRESS without a product decision record
- Do **not** interpret user feedback or UI polish requests as implicit product authorization
- Do **not** treat this as a bug — escrow mutation scope was explicitly deferred, not forgotten

## Drift Guards

- Parent TECS-FBW-003-A is VERIFIED_COMPLETE (commit: GOVERNANCE-SYNC-111). That is the
  read-only EscrowPanel.tsx. It does not authorize work on this B-slice.
- D-020-B doctrine applies: no stored balance field assumption. Any future escrow mutation
  design must explicitly address this constraint.
- The tracker records this as "🔵 FUTURE SCOPE" — canonical equivalent: DEFERRED.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as DEFERRED) |
| Why is it deferred? | `governance/control/BLOCKED.md` — Section 2 |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-010) |
| When can it be reopened? | After product decision in `governance/decisions/PRODUCT-DECISIONS.md` |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` line ~101 |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-17 — GOV-OS-003 Unit Record Migration Batch 1. Status confirmed: DEFERRED.
