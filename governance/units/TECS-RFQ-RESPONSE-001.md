---
unit_id: TECS-RFQ-RESPONSE-001
title: Supplier RFQ Response — first response persistence + submit path
type: IMPLEMENTATION
subtype: BACKEND-SCHEMA
status: OPEN
wave: W5
plane: BACKEND
opened: 2026-03-19
closed: null
verified: null
commit: null
evidence: null
doctrine_constraints:
  - D-001: RLS remains mandatory on all tenant-scoped RFQ response persistence and write paths
  - D-003: schema changes must follow manual SQL -> prisma db pull -> prisma generate -> restart; prisma migrate dev and db push remain forbidden
  - D-004: this unit is backend/schema only; no frontend work may be mixed in
  - D-011: supplier response creation must remain tenant-scoped and recipient-authorized via supplier_org_id
decisions_required:
  - PRODUCT-DEC-RFQ-DOMAIN-MODEL: DECIDED (2026-03-18, Paresh) — RFQ remains a first-class entity separate from Trade with buyer ownership and supplier visibility
  - PRODUCT-DEC-SUPPLIER-RFQ-READS: DECIDED (2026-03-18, Paresh) — supplier-side RFQ recipient reads already exist as the minimal read surface
  - PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE: DECIDED (2026-03-19, Paresh) — first supplier response is a narrow non-binding child artifact with pricing deferred
blockers: []
---

## Unit Summary

TECS-RFQ-RESPONSE-001 is the first implementation-ready supplier RFQ response unit after
PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE. It covers the backend/schema foundation required to
persist one narrow supplier response artifact per RFQ and to expose the authenticated
tenant-plane supplier submission path.

This unit is intentionally constrained to the first response slice only. It may introduce the
separate child response entity, the supplier-authorized create path, the one-response-per-RFQ
constraint, the RFQ lifecycle transition to `RESPONDED`, and aligned audit coexistence where
required by established RFQ doctrine. It must stop before any negotiation, pricing, response
revision history, buyer identity expansion, frontend UI, control-plane RFQ action, or Trade
coupling.

## Acceptance Criteria

- [ ] Canonical supplier response child entity is introduced in a form aligned to PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE
- [ ] Relationship from supplier response to `rfqs.id` is implemented correctly
- [ ] First slice enforces exactly one supplier response artifact per RFQ
- [ ] Authenticated supplier tenant may create a response only for RFQs addressed to `supplier_org_id = current tenant`
- [ ] Buyer-side tenants cannot create supplier response artifacts
- [ ] First-slice fields remain limited to: `id`, `rfq_id`, `supplier_org_id`, `message`, `submitted_at`, `created_at`, `updated_at`, `created_by_user_id`
- [ ] Pricing remains excluded from the schema and write contract in this unit
- [ ] Successful first valid supplier response transitions parent RFQ status to `RESPONDED`
- [ ] Existing RFQ read posture remains preserved; no broader buyer identity exposure is introduced
- [ ] Audit coexistence is preserved and any new response submission evidence remains consistent with established RFQ doctrine
- [ ] No negotiation threads, counter-offers, revisions, order conversion, checkout, settlement, control-plane RFQ workflows, AI automation, or Trade coupling are introduced

## Files Allowlisted (Modify)

- `server/prisma/schema.prisma` — reflect the canonical supplier RFQ response model after approved SQL application
- `server/prisma/migrations/**` — supplier RFQ response schema / constraints / RLS SQL only, if required by the implementation plan
- `server/src/routes/tenant.ts` or a dedicated tenant RFQ response route module under `server/src/routes/tenant/`
- `shared/contracts/openapi.tenant.json` — only if the supplier RFQ response write contract must be governed explicitly
- `server/tests/**` — only files strictly required to verify supplier RFQ response write behavior, RFQ status transition, and tenant isolation

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/PRODUCT-DECISIONS.md`
- `governance/units/TECS-RFQ-DOMAIN-001.md`
- `governance/units/TECS-RFQ-READ-001.md`
- `governance/units/TECS-RFQ-SUPPLIER-READ-001.md`

## Evidence Record

*Not yet recorded — unit is OPEN and implementation has not started.*

## Governance Closure

*Not yet set — unit is OPEN and is now the single implementation-ready next action.*

## Allowed Next Step

Implement this unit only within the allowlisted backend/schema scope above.

## Forbidden Next Step

- Do **not** add frontend supplier response UI in this unit
- Do **not** add negotiation threads, counter-offers, or response revision history in this unit
- Do **not** add pricing, quote terms, or price validity semantics in this unit
- Do **not** add order conversion, checkout, settlement, control-plane RFQ workflows, or AI automation in this unit
- Do **not** broaden buyer identity exposure beyond the current supplier read posture
- Do **not** couple RFQ response behavior to Trade
- Do **not** open any additional response-related unit before this unit is completed or explicitly blocked

## Drift Guards

- Supplier response remains a separate child artifact; do **not** embed response fields directly on `rfqs`
- One response per RFQ is the first-slice rule; do **not** introduce multi-response threading or negotiation structures here
- Pricing is explicitly deferred; do **not** introduce monetary fields, pricing DTOs, or quote-calculation semantics
- Supplier authority is recipient-scoped by `supplier_org_id`; buyer ownership does not authorize supplier write bypass
- Existing supplier RFQ reads define the maximum buyer identity exposure for this slice; do **not** widen it
- RFQ remains separate from Trade; no downstream trade-state coupling belongs here

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit implementation-ready? | `governance/control/OPEN-SET.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |
| What product decisions authorize this scope? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-RFQ-DOMAIN-MODEL, PRODUCT-DEC-SUPPLIER-RFQ-READS, PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE |
| What prior RFQ units must remain preserved? | `governance/units/TECS-RFQ-DOMAIN-001.md`, `governance/units/TECS-RFQ-READ-001.md`, `governance/units/TECS-RFQ-SUPPLIER-READ-001.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-19 — GOVERNANCE-SEQUENCE-SUPPLIER-RFQ-RESPONSE-001. Status confirmed: OPEN.
This unit is the single implementation-ready supplier RFQ response follow-on unit after
PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE was recorded as DECIDED.