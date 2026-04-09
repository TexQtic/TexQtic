unit_id: TECS-RFQ-SUPPLIER-READ-001
title: Supplier RFQ Reads — inbox list + detail API slice
type: IMPLEMENTATION
subtype: BACKEND
status: VERIFIED_COMPLETE
wave: W5
plane: BACKEND
opened: 2026-03-18
closed: 2026-03-18
verified: 2026-03-18
commit: "c5ab120"
evidence: "VERIFY-TECS-RFQ-SUPPLIER-READ-001: VERIFIED_COMPLETE"
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

- [x] Supplier RFQ inbox list API exists on the tenant plane
- [x] Supplier RFQ detail API exists on the tenant plane
- [x] Reads are limited to RFQs where `supplier_org_id = current tenant`
- [x] List and detail are read-only; no mutation semantics introduced
- [x] Field projection remains aligned to PRODUCT-DEC-SUPPLIER-RFQ-READS
- [x] Supplier-visible statuses remain limited to `INITIATED`, `OPEN`, `RESPONDED`, `CLOSED`
- [x] Basic status filtering is implemented only if required by the final route contract
- [x] Recency sorting is implemented only if required by the final route contract
- [x] Basic RFQ id / item name / item sku search is implemented only if required by the final route contract
- [x] Buyer org_id, buyer display label/surrogate, and created_by_user_id remain withheld in this first slice
- [x] No supplier response actions, negotiation threads, quote pricing, order conversion,
      checkout, settlement, control-plane reads, AI automation, or Trade coupling introduced

## Evidence Record

- Implementation commit: `c5ab120` — `feat(rfq): add supplier RFQ read endpoints for TECS-RFQ-SUPPLIER-READ-001`
- Verification result: `VERIFY-TECS-RFQ-SUPPLIER-READ-001` — `VERIFIED_COMPLETE`
- Verified characteristics:
  - GET `/api/tenant/rfqs/inbox` exists in the tenant-plane backend route module
  - GET `/api/tenant/rfqs/inbox/:id` exists in the tenant-plane backend route module
  - both routes use `tenantAuthMiddleware` + `databaseContextMiddleware`
  - both routes execute via `withDbContext` with DB-level RLS active
  - supplier recipient scope is enforced by `supplierOrgId = dbContext.orgId`
  - no client-supplied `org_id`, `tenantId`, or authority fields are accepted or trusted
  - status filter is limited to `INITIATED | OPEN | RESPONDED | CLOSED`
  - recency sort is limited to `updated_at_desc | created_at_desc`
  - `q` search is limited to RFQ id, item name, and item sku
  - list query is bounded with fixed `take: 50`; no pagination or broader query surface introduced
  - list/detail projections match PRODUCT-DEC-SUPPLIER-RFQ-READS exactly using stable snake_case fields
  - buyer `org_id`, buyer display label/surrogate, and `created_by_user_id` remain withheld
  - detail returns only a supplier-addressed RFQ row or not-found
  - no unrelated buyer-identity or joined-data leakage is introduced
  - no Trade coupling is introduced

## Governance Closure

- Governance sync unit: `GOVERNANCE-SYNC-TECS-RFQ-SUPPLIER-READ-001`
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`

## Files Allowlisted (Modify)

- `server/src/routes/tenant.ts` or a dedicated tenant RFQ supplier read route module under `server/src/routes/tenant/`
- `shared/contracts/openapi.tenant.json` — update in the same implementation wave if the supplier RFQ inbox/detail contract is newly exposed or its request/response shape changes
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

This unit is **VERIFIED_COMPLETE**. No further implementation work is authorized on this unit.

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
- Current preserved tenant OpenAPI authority does not presently expose a supplier inbox/detail path. This unit's implementation/runtime closure remains preserved history only and must not be cited as current OpenAPI parity.
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

2026-03-18 — GOVERNANCE-SYNC-TECS-RFQ-SUPPLIER-READ-001. Status transitioned: `OPEN` → `VERIFIED_COMPLETE`.
