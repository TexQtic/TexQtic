---
unit_id: TECS-RFQ-BUYER-LIST-READ-001
title: Buyer RFQ Discovery Surface — minimal read-only list and drill-in reuse
type: IMPLEMENTATION
subtype: FRONTEND
status: VERIFIED_COMPLETE
wave: W5
plane: TENANT
opened: 2026-03-19
closed: 2026-03-19
verified: 2026-03-19
commit: "64500cf"
evidence: "Verified RFQ UI evidence: 2 files passed / 11 tests passed"
doctrine_constraints:
  - D-004: this unit is frontend-only and read-only; no backend redesign or workflow mutation may be mixed in
  - D-011: buyer RFQ discovery must preserve buyer-only visibility and org-scoped access assumptions
  - D-017-A: frontend must consume the existing backend list/detail contracts only; no authority fields are invented in the client
decisions_required:
  - PRODUCT-DEC-BUYER-RFQ-READS: DECIDED (2026-03-18, Paresh) — buyer-side RFQ list discovery and detail visibility are authorized
  - PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE: DECIDED (2026-03-19, Paresh) — bounded supplier response visibility remains authorized through the reused detail surface, with pricing deferred
blockers: []
---

## Unit Summary

TECS-RFQ-BUYER-LIST-READ-001 is the first minimal buyer RFQ discovery surface. It exposes a
read-only buyer-owned RFQ list using the existing buyer RFQ list read contract and lets a buyer
open the existing buyer RFQ detail surface from a selected list item without widening routing,
auth, tenant scope, or workflow boundaries.

This unit remained read-only and pre-negotiation. It renders only bounded list metadata required
for coherent discovery and stable loading, error, and empty states. It does not introduce pricing,
negotiation, acceptance, counter-offers, thread or messaging models, supplier comparison,
dashboard-scale expansion, backend redesign, or workflow mutation scope.

## Acceptance Criteria

- [x] A minimal buyer RFQ discovery list surface exists
- [x] The surface consumes the existing buyer RFQ list backend contract only
- [x] A buyer can open the existing RFQ detail surface from a list item
- [x] Stable loading, error, and empty states render
- [x] Existing RFQ initiation and RFQ detail behavior remain intact
- [x] No pricing, negotiation, acceptance, counter-offers, thread model, supplier comparison, dashboard-scale expansion, backend redesign, or workflow mutation scope introduced

## Files Allowlisted (Modify)

- `App.tsx`
- `services/catalogService.ts`
- `components/Tenant/BuyerRfqListSurface.tsx`
- `tests/rfq-buyer-list-ui.test.tsx`

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/PRODUCT-DECISIONS.md`
- `governance/units/TECS-RFQ-READ-001.md`
- `governance/units/TECS-RFQ-BUYER-DETAIL-UI-001.md`
- `governance/units/TECS-RFQ-BUYER-RESPONSE-READ-001.md`

## Evidence Record

- Implementation commit: `64500cf` — `feat(rfq): add buyer rfq list discovery surface`
- Verification evidence: `.\\server\\node_modules\\.bin\\vitest.cmd --root . run tests/rfq-buyer-detail-ui.test.tsx tests/rfq-buyer-list-ui.test.tsx`
- Verification result: 2 files passed / 11 tests passed
- Verified characteristics:
  - frontend exposes a buyer-owned RFQ discovery list through a narrow local entry point
  - the UI consumes the existing buyer RFQ list and buyer RFQ detail contracts only; no backend redesign was required
  - buyers can open the existing detail surface from the list without widening workflow scope
  - stable loading, error, and empty states are present for the list surface
  - no pricing, negotiation, acceptance, counter-offers, thread model, supplier comparison, dashboard-scale expansion, backend redesign, or workflow mutation scope was introduced

## Governance Closure

- Governance sync unit: `GOVERNANCE-SYNC-RFQ-002`
- Status transition: `VERIFIED_COMPLETE` recorded in Layer 1
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`

## Allowed Next Step

This unit is **VERIFIED_COMPLETE**. No further implementation work is authorized on this unit.

## Forbidden Next Step

- Do **not** add pricing, quote totals, or commercial term expansion in this unit
- Do **not** add negotiation, acceptance, rejection, or counter-offer actions in this unit
- Do **not** add thread, messaging, or supplier comparison surfaces in this unit
- Do **not** add dashboard-scale RFQ management, bulk actions, or analytics in this unit
- Do **not** add backend redesign, workflow mutation, checkout, order conversion, settlement, or Trade coupling in this unit

## Drift Guards

- The buyer RFQ list must continue to consume the existing buyer-owned backend read contract only
- The list entry path remains intentionally narrow and reversible
- RFQ remains pre-negotiation; detail drill-in visibility does not authorize response actions or pricing expansion

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| What product decisions authorize this scope? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-BUYER-RFQ-READS · PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE |
| What backend contracts does this depend on? | `governance/units/TECS-RFQ-READ-001.md` · `governance/units/TECS-RFQ-BUYER-DETAIL-UI-001.md` · `governance/units/TECS-RFQ-BUYER-RESPONSE-READ-001.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-19 — GOVERNANCE-SYNC-RFQ-002. Status confirmed: `VERIFIED_COMPLETE`.