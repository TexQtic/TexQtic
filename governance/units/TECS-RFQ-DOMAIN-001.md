---
unit_id: TECS-RFQ-DOMAIN-001
title: RFQ Domain Persistence — canonical entity + write path
type: IMPLEMENTATION
subtype: BACKEND-SCHEMA
status: OPEN
wave: W5
plane: BACKEND
opened: 2026-03-18
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
PRODUCT-DEC-RFQ-DOMAIN-MODEL. It introduces the canonical `rfqs` persistence layer and
updates the existing tenant RFQ initiation write path so RFQ creation is backed by a real
domain entity while preserving current audit behavior.

This unit is strictly backend/schema scoped. It must keep RFQ separate from Trade, preserve
`rfq.RFQ_INITIATED`, derive direct supplier visibility from the catalog item owner, and stop
at domain persistence. No seller response logic, frontend list/detail surfaces, negotiation,
pricing, checkout, settlement, or control-plane workflow authority belongs here.

## Acceptance Criteria

- [ ] Canonical `rfqs` table introduced for RFQ persistence
- [ ] Canonical `rfq_status` enum introduced with `INITIATED`, `OPEN`, `RESPONDED`, `CLOSED`
- [ ] Required RFQ fields implemented: `id`, `org_id`, `supplier_org_id`, `catalog_item_id`,
      `quantity`, `buyer_message`, `status`, `created_by_user_id`, `created_at`, `updated_at`
- [ ] Existing RFQ creation path persists a domain row and uses `rfqs.id` as the canonical RFQ identifier
- [ ] Existing `rfq.RFQ_INITIATED` audit behavior remains preserved
- [ ] Direct supplier is derived from the catalog item owner; no broadcast or multi-supplier routing introduced
- [ ] Tenant isolation posture remains buyer-owned by `org_id`, with supplier visibility mediated only by `supplier_org_id`
- [ ] RFQ remains separate from Trade; no trade-state coupling introduced
- [ ] Minimal write-path contract adaptation is allowed only if required by persistence semantics
- [ ] No frontend surfaces, seller responses, thread entities, negotiation logic, pricing,
      order conversion, checkout, settlement, control-plane RFQ workflow authority, or AI automation introduced

## Files Allowlisted (Modify)

- `server/prisma/schema.prisma` — reflect the canonical RFQ model after approved SQL application
- `server/prisma/migrations/**` — RFQ schema / enum / RLS SQL only, if required by the implementation plan
- `server/src/routes/tenant.ts` or a dedicated tenant RFQ route module under `server/src/routes/tenant/`
- `shared/contracts/openapi.tenant.json` — only if the RFQ write-path contract must change to remain correct after persistence
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

## Allowed Next Step

Implement TECS-RFQ-DOMAIN-001 as the single authorized RFQ follow-on unit. Work must remain
backend/schema only and stop at canonical RFQ persistence plus the existing create-path update.

## Forbidden Next Step

- Do **not** open or implement seller inbox UI, buyer RFQ list UI, or RFQ detail UI in this unit
- Do **not** add seller response or thread entities in this unit
- Do **not** introduce negotiation logic, counter-offers, quote pricing, or order conversion
- Do **not** add checkout, settlement, control-plane RFQ workflows, or AI automation
- Do **not** introduce broadcast routing or multi-supplier matching
- Do **not** collapse RFQ into Trade
- Do **not** mix frontend changes into this unit

## Drift Guards

- `org_id` remains the canonical buyer-owner key; supplier visibility is additive and limited
- `rfqs.id` becomes the canonical persistent RFQ identifier for the write path
- `INITIATED` exists for compatibility, but the model must support stable operational state handling
- Audit remains mandatory evidence; domain persistence becomes the operational source of truth
- If implementation scope expands beyond canonical persistence and the existing write path, stop and sequence a separate unit

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit implementation-ready? | `governance/control/OPEN-SET.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |
| What product decision authorizes this scope? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-RFQ-DOMAIN-MODEL |
| What prior RFQ implementation must remain preserved? | `governance/units/TECS-FBW-013.md` and `governance/units/TECS-FBW-013-BE-001.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-18 — GOVERNANCE-SEQUENCE-RFQ-DOMAIN-001. Status: `OPEN`.