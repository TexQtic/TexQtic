---
unit_id: TECS-RFQ-DOMAIN-001
title: RFQ Domain Persistence — canonical entity + write path
type: IMPLEMENTATION
subtype: BACKEND-SCHEMA
status: VERIFIED_COMPLETE
wave: W5
plane: BACKEND
opened: 2026-03-18
closed: 2026-03-18
verified: 2026-03-18
commit: "3c8fc31 · db8cc60"
evidence: "VERIFY-TECS-RFQ-DOMAIN-001: VERIFIED_COMPLETE"
doctrine_constraints:
  - D-001: RLS is mandatory on the tenant-scoped rfqs domain table and any related visibility policy
  - D-003: schema changes must follow manual SQL -> prisma db pull -> prisma generate -> restart; prisma migrate dev and db push remain forbidden
  - D-004: this unit is backend/schema persistence only; no frontend work may be mixed in
  - D-011: org_id remains the canonical buyer-ownership tenancy boundary
decisions_required:
  - PRODUCT-DEC-RFQ-DOMAIN-MODEL: DECIDED (2026-03-18, Paresh) — RFQ is a first-class entity, separate from Trade, with direct-supplier visibility and audit coexistence
  - PRODUCT-DEC-B2B-QUOTE: DECIDED (2026-03-18, Paresh) — existing tenant-plane RFQ initiation behavior remains preserved
blockers: []
---

## Unit Summary

TECS-RFQ-DOMAIN-001 is the first implementation-ready RFQ domain unit after
PRODUCT-DEC-RFQ-DOMAIN-MODEL. It introduced the canonical `rfqs` persistence layer and
updated the existing tenant RFQ initiation write path so RFQ creation is backed by a real
domain entity while preserving current audit behavior.

This unit remained strictly backend/schema scoped. RFQ stayed separate from Trade,
`rfq.RFQ_INITIATED` was preserved, direct supplier visibility is now derived from the
catalog item owner through a narrow transaction-local `texqtic_service` lookup path,
and the work stopped at domain persistence. No seller response logic, frontend list/detail
surfaces, negotiation, pricing, checkout, settlement, or control-plane workflow authority
was introduced.

## Acceptance Criteria

- [x] Canonical `rfqs` table introduced for RFQ persistence
- [x] Canonical `rfq_status` enum introduced with `INITIATED`, `OPEN`, `RESPONDED`, `CLOSED`
- [x] Required RFQ fields implemented: `id`, `org_id`, `supplier_org_id`, `catalog_item_id`,
      `quantity`, `buyer_message`, `status`, `created_by_user_id`, `created_at`, `updated_at`
- [x] Existing RFQ creation path persists a domain row and uses `rfqs.id` as the canonical RFQ identifier
- [x] Existing `rfq.RFQ_INITIATED` audit behavior remains preserved
- [x] Direct supplier is derived from the catalog item owner; no broadcast or multi-supplier routing introduced
- [x] Tenant isolation posture remains buyer-owned by `org_id`, with supplier visibility mediated only by `supplier_org_id`
- [x] RFQ remains separate from Trade; no trade-state coupling introduced
- [x] Minimal write-path contract adaptation is allowed only if required by persistence semantics
- [x] No frontend surfaces, seller responses, thread entities, negotiation logic, pricing,
      order conversion, checkout, settlement, control-plane RFQ workflow authority, or AI automation introduced

## Files Allowlisted (Modify)

- `server/prisma/schema.prisma` — reflect the canonical RFQ model after approved SQL application
- `server/prisma/migrations/**` — RFQ schema / enum / RLS SQL only, if required by the implementation plan
- `server/src/routes/tenant.ts` or a dedicated tenant RFQ route module under `server/src/routes/tenant/`
- `shared/contracts/openapi.tenant.json` — update in the same implementation wave if RFQ persistence changes the exposed tenant RFQ write contract or newly exposes that contract
- `server/tests/**` — only files strictly required to verify RFQ persistence behavior and tenant isolation

## Files Read-Only

- `App.tsx`
- `services/catalogService.ts`
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/PRODUCT-DECISIONS.md`
- `governance/units/TECS-FBW-013.md`
- `governance/units/TECS-FBW-013-BE-001.md`

## Evidence Record

- Implementation commit: `3c8fc31` — canonical RFQ domain persistence
- Corrective commit: `db8cc60` — `fix(rfq): correct supplier owner resolution for TECS-RFQ-DOMAIN-001`
- Verification result: `VERIFY-TECS-RFQ-DOMAIN-001` — `VERIFIED_COMPLETE`
- Verified characteristics:
  - canonical `rfqs` model + `rfq_status` enum remain mapped correctly
  - migration posture remains intact: indexes, trigger, ENABLE RLS, FORCE RLS
  - supplier owner resolution no longer depends on buyer-tenant catalog visibility under ordinary tenant RLS
  - owner lookup is explicit, transaction-local, minimal, and scoped to RFQ creation only
  - general catalog RLS was not broadly weakened
  - RFQ write remains tenant-scoped via `withDbContext`
  - `rfq.RFQ_INITIATED`, canonical `rfq.id`, and non-binding semantics remain preserved

## Governance Closure

- Governance sync unit: `GOVERNANCE-SYNC-TECS-RFQ-DOMAIN-001`
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`

## Allowed Next Step

This unit is **VERIFIED_COMPLETE**. No further implementation work is authorized on this unit.

## Forbidden Next Step

- Do **not** open or implement seller inbox UI, buyer RFQ list UI, or RFQ detail UI in this unit
- Do **not** add seller response or thread entities in this unit
- Do **not** introduce negotiation logic, counter-offers, quote pricing, or order conversion
- Do **not** add checkout, settlement, control-plane RFQ workflows, or AI automation
- Do **not** introduce broadcast routing or multi-supplier matching
- Do **not** collapse RFQ into Trade
- Do **not** mix frontend changes into this unit
- Do **not** reopen this unit (D-008)

## Drift Guards

- `org_id` remains the canonical buyer-owner key; supplier visibility is additive and limited
- `rfqs.id` becomes the canonical persistent RFQ identifier for the write path
- `INITIATED` exists for compatibility, but the model must support stable operational state handling
- Audit remains mandatory evidence; domain persistence becomes the operational source of truth
- The corrective supplier-owner-resolution path is explicit, transaction-local, and bounded to RFQ creation only
- If future RFQ work expands beyond canonical persistence and the existing write path, sequence a separate unit

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit implementation-ready? | `governance/control/OPEN-SET.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |
| What product decision authorizes this scope? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-RFQ-DOMAIN-MODEL |
| What prior RFQ implementation must remain preserved? | `governance/units/TECS-FBW-013.md` and `governance/units/TECS-FBW-013-BE-001.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-18 — GOVERNANCE-SYNC-TECS-RFQ-DOMAIN-001. Status transitioned: `OPEN` → `VERIFIED_COMPLETE`.
