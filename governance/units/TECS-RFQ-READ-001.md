---
unit_id: TECS-RFQ-READ-001
title: Buyer RFQ Reads — tenant list + detail API slice
type: IMPLEMENTATION
subtype: BACKEND
status: OPEN
wave: W5
plane: BACKEND
opened: 2026-03-18
doctrine_constraints:
  - D-001: RLS remains mandatory on tenant-scoped RFQ reads
  - D-004: this unit is backend read-only only; no frontend work may be mixed in
  - D-011: buyer RFQ reads must remain scoped by org_id as the canonical owner tenancy boundary
decisions_required:
  - PRODUCT-DEC-RFQ-DOMAIN-MODEL: DECIDED (2026-03-18, Paresh) — RFQ is a first-class entity in rfqs
  - PRODUCT-DEC-BUYER-RFQ-READS: DECIDED (2026-03-18, Paresh) — buyer-side RFQ reads are authorized as a narrow read-only list + detail scope
blockers: []
---

## Unit Summary

TECS-RFQ-READ-001 is the first implementation-ready buyer RFQ read unit after
PRODUCT-DEC-BUYER-RFQ-READS. It covers backend-only, tenant-plane, read-only API support for:

  - buyer RFQ list
  - buyer RFQ detail

This unit must remain scoped to buyer-owned reads only (`org_id = current tenant`) and stop at
the read-only API slice. No frontend UI, supplier inbox, supplier response actions, negotiation,
pricing, order conversion, checkout, settlement, control-plane RFQ reads, AI automation, or Trade
coupling belongs here.

## Acceptance Criteria

- [ ] Buyer RFQ list API exists on the tenant plane
- [ ] Buyer RFQ detail API exists on the tenant plane
- [ ] Reads are limited to RFQs where `org_id = current tenant`
- [ ] List and detail are read-only; no mutation semantics introduced
- [ ] Field projection remains aligned to PRODUCT-DEC-BUYER-RFQ-READS
- [ ] Buyer-visible statuses remain limited to `INITIATED`, `OPEN`, `RESPONDED`, `CLOSED`
- [ ] Basic status filtering is implemented only if required by the final route contract
- [ ] Recency sorting is implemented only if required by the final route contract
- [ ] Basic RFQ id / item name / item sku search is implemented only if required by the final route contract
- [ ] No supplier inbox reads, supplier response actions, negotiation threads, quote pricing,
      order conversion, checkout, settlement, control-plane reads, AI automation, or Trade coupling introduced

## Files Allowlisted (Modify)

- `server/src/routes/tenant.ts` or a dedicated tenant RFQ read route module under `server/src/routes/tenant/`
- `shared/contracts/openapi.tenant.json` — only if required to govern the buyer RFQ list/detail read contract
- `server/tests/**` — only files strictly required to verify buyer RFQ list/detail read behavior and tenant isolation

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/PRODUCT-DECISIONS.md`
- `governance/units/TECS-RFQ-DOMAIN-001.md`
- `governance/units/TECS-FBW-013.md`
- `governance/units/TECS-FBW-013-BE-001.md`

## Allowed Next Step

Implement TECS-RFQ-READ-001 as the single authorized buyer RFQ read follow-on unit.
Work must remain backend-only and read-only, and must stop at tenant-plane buyer RFQ list + detail APIs.

## Forbidden Next Step

- Do **not** add frontend buyer RFQ list or detail UI in this unit
- Do **not** add supplier inbox or supplier response actions in this unit
- Do **not** add negotiation threads, counter-offers, or quote pricing in this unit
- Do **not** add order conversion, checkout, settlement, or control-plane RFQ reads in this unit
- Do **not** add AI automation or Trade coupling in this unit
- Do **not** introduce schema or migration changes unless a separate implementation defect explicitly requires them

## Drift Guards

- Buyer RFQ reads remain owner-scoped by `org_id`; `supplier_org_id` does not authorize buyer cross-tenant discovery
- This unit is read-only and backend-only; any frontend work must be sequenced separately
- Search, filtering, and sorting must remain minimal and bounded to the fields authorized by PRODUCT-DEC-BUYER-RFQ-READS
- If implementation requires wider RFQ read surfaces or supplier-facing behavior, stop and sequence a separate unit

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| What product decision authorizes this scope? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-BUYER-RFQ-READS |
| What domain model does this read from? | `governance/units/TECS-RFQ-DOMAIN-001.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-18 — GOVERNANCE-SEQUENCE-BUYER-RFQ-READS-001. Status: `OPEN`.