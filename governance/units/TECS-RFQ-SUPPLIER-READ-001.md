---
unit_id: TECS-RFQ-SUPPLIER-READ-001
title: Supplier RFQ Reads — inbox list + detail API slice
type: IMPLEMENTATION
subtype: BACKEND
status: OPEN
wave: W5
plane: BACKEND
opened: 2026-03-18
doctrine_constraints:
  - D-001: RLS remains mandatory on tenant-scoped RFQ reads
  - D-004: this unit is backend read-only only; no frontend work may be mixed in
  - D-011: supplier RFQ reads must remain scoped by supplier_org_id as the canonical recipient tenancy boundary
decisions_required:
  - PRODUCT-DEC-RFQ-DOMAIN-MODEL: DECIDED (2026-03-18, Paresh) — RFQ is a first-class entity in rfqs
  - PRODUCT-DEC-SUPPLIER-RFQ-READS: DECIDED (2026-03-18, Paresh) — supplier-side RFQ reads are authorized as a narrow read-only inbox list + detail scope
blockers: []
---

## Unit Summary

TECS-RFQ-SUPPLIER-READ-001 is the first implementation-ready supplier RFQ read unit after
PRODUCT-DEC-SUPPLIER-RFQ-READS. It covers backend-only, tenant-plane, read-only API support for:

  - supplier RFQ inbox list
  - supplier RFQ detail

This unit must remain scoped to recipient reads only (`supplier_org_id = current tenant`) and stop
at the read-only API slice. No frontend UI, supplier response actions, negotiation, pricing,
order conversion, checkout, settlement, control-plane RFQ reads, AI automation, buyer identity
exposure beyond the decided minimal posture, or Trade coupling belongs here.

## Acceptance Criteria

- [ ] Supplier RFQ inbox list API exists on the tenant plane
- [ ] Supplier RFQ detail API exists on the tenant plane
- [ ] Reads are limited to RFQs where `supplier_org_id = current tenant`
- [ ] List and detail are read-only; no mutation semantics introduced
- [ ] Field projection remains aligned to PRODUCT-DEC-SUPPLIER-RFQ-READS
- [ ] Supplier-visible statuses remain limited to `INITIATED`, `OPEN`, `RESPONDED`, `CLOSED`
- [ ] Basic status filtering is implemented only if required by the final route contract
- [ ] Recency sorting is implemented only if required by the final route contract
- [ ] Basic RFQ id / item name / item sku search is implemented only if required by the final route contract
- [ ] Buyer org_id, buyer display label/surrogate, and created_by_user_id remain withheld in this first slice
- [ ] No supplier response actions, negotiation threads, quote pricing, order conversion,
      checkout, settlement, control-plane reads, AI automation, or Trade coupling introduced

## Files Allowlisted (Modify)

- `server/src/routes/tenant.ts` or a dedicated tenant RFQ supplier read route module under `server/src/routes/tenant/`
- `shared/contracts/openapi.tenant.json` — only if required to govern the supplier RFQ list/detail read contract
- `server/tests/**` — only files strictly required to verify supplier RFQ list/detail read behavior and tenant isolation

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/PRODUCT-DECISIONS.md`
- `governance/units/TECS-RFQ-DOMAIN-001.md`
- `governance/units/TECS-RFQ-READ-001.md`

## Allowed Next Step

Implement TECS-RFQ-SUPPLIER-READ-001 as the single authorized supplier RFQ read follow-on unit.
Work must remain backend-only and read-only, and must stop at tenant-plane supplier RFQ inbox
list + detail APIs.

## Forbidden Next Step

- Do **not** add frontend supplier inbox or detail UI in this unit
- Do **not** add supplier response actions in this unit
- Do **not** add negotiation threads, counter-offers, or quote pricing in this unit
- Do **not** add order conversion, checkout, settlement, or control-plane RFQ reads in this unit
- Do **not** add AI automation or Trade coupling in this unit
- Do **not** expose buyer org_id, buyer display label/surrogate, or created_by_user_id in this first slice
- Do **not** introduce schema or migration changes unless a separate implementation defect explicitly requires them

## Drift Guards

- Supplier RFQ reads remain recipient-scoped by `supplier_org_id`; buyer ownership does not authorize cross-tenant supplier discovery
- This unit is read-only and backend-only; any frontend work must be sequenced separately
- Search, filtering, and sorting must remain minimal and bounded to the fields authorized by PRODUCT-DEC-SUPPLIER-RFQ-READS
- If implementation requires response actions, buyer identity exposure, or wider RFQ read surfaces, stop and sequence a separate unit

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| What product decision authorizes this scope? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-SUPPLIER-RFQ-READS |
| What domain model does this read from? | `governance/units/TECS-RFQ-DOMAIN-001.md` |
| What prior buyer read unit must remain preserved? | `governance/units/TECS-RFQ-READ-001.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-18 — GOVERNANCE-SEQUENCE-SUPPLIER-RFQ-READS-001. Status: `OPEN`.