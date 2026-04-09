---
unit_id: TECS-RFQ-READ-001
title: Buyer RFQ Reads — tenant list + detail API slice
type: IMPLEMENTATION
subtype: BACKEND
status: VERIFIED_COMPLETE
wave: W5
plane: BACKEND
opened: 2026-03-18
closed: 2026-03-18
verified: 2026-03-18
commit: "49d757d"
evidence: "VERIFY-TECS-RFQ-READ-001: VERIFIED_COMPLETE"
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

- [x] Buyer RFQ list API exists on the tenant plane
- [x] Buyer RFQ detail API exists on the tenant plane
- [x] Reads are limited to RFQs where `org_id = current tenant`
- [x] List and detail are read-only; no mutation semantics introduced
- [x] Field projection remains aligned to PRODUCT-DEC-BUYER-RFQ-READS
- [x] Buyer-visible statuses remain limited to `INITIATED`, `OPEN`, `RESPONDED`, `CLOSED`
- [x] Basic status filtering is implemented only if required by the final route contract
- [x] Recency sorting is implemented only if required by the final route contract
- [x] Basic RFQ id / item name / item sku search is implemented only if required by the final route contract
- [x] No supplier inbox reads, supplier response actions, negotiation threads, quote pricing,
      order conversion, checkout, settlement, control-plane reads, AI automation, or Trade coupling introduced

## Files Allowlisted (Modify)

- `server/src/routes/tenant.ts` or a dedicated tenant RFQ read route module under `server/src/routes/tenant/`
- `shared/contracts/openapi.tenant.json` — update in the same implementation wave if the buyer RFQ list/detail route contract is newly exposed or its request/response shape changes
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

## Evidence Record

- Implementation commit: `49d757d` — `feat(rfq): add buyer RFQ read endpoints for TECS-RFQ-READ-001`
- Verification result: `VERIFY-TECS-RFQ-READ-001` — `VERIFIED_COMPLETE`
- Verified characteristics:
  - GET `/api/tenant/rfqs` exists in the tenant-plane backend route module
  - GET `/api/tenant/rfqs/:id` exists in the tenant-plane backend route module
  - both routes use `tenantAuthMiddleware` + `databaseContextMiddleware`
  - both routes execute via `withDbContext` with DB-level RLS active
  - buyer ownership is enforced by `orgId = dbContext.orgId`
  - no client-supplied `org_id`, `tenantId`, or authority fields are accepted or trusted
  - status filter is limited to `INITIATED | OPEN | RESPONDED | CLOSED`
  - recency sort is limited to `updated_at_desc | created_at_desc`
  - `q` search is limited to RFQ id, item name, and item sku
  - list query is bounded with fixed `take: 50`; no pagination or broader query surface introduced
  - list/detail projections match PRODUCT-DEC-BUYER-RFQ-READS exactly using stable snake_case fields
  - detail returns only a buyer-owned RFQ row or not-found
  - no unrelated supplier-side data leakage or Trade coupling introduced

## Governance Closure

- Governance sync unit: `GOVERNANCE-SYNC-TECS-RFQ-READ-001`
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`

## Allowed Next Step

This unit is **VERIFIED_COMPLETE**. No further implementation work is authorized on this unit.

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

2026-03-18 — GOVERNANCE-SYNC-TECS-RFQ-READ-001. Status transitioned: `OPEN` → `VERIFIED_COMPLETE`.
