---
unit_id: TECS-RFQ-RESPONSE-001
title: Supplier RFQ Response — first response persistence + submit path
type: IMPLEMENTATION
subtype: BACKEND-SCHEMA
status: VERIFIED_COMPLETE
wave: W5
plane: BACKEND
opened: 2026-03-19
closed: 2026-03-19
verified: 2026-03-19
commit: "7edb891"
evidence: "VERIFY-TECS-RFQ-RESPONSE-001: VERIFIED_COMPLETE"
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

- [x] Canonical supplier response child entity is introduced in a form aligned to PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE
- [x] Relationship from supplier response to `rfqs.id` is implemented correctly
- [x] First slice enforces exactly one supplier response artifact per RFQ
- [x] Authenticated supplier tenant may create a response only for RFQs addressed to `supplier_org_id = current tenant`
- [x] Buyer-side tenants cannot create supplier response artifacts
- [x] First-slice fields remain limited to: `id`, `rfq_id`, `supplier_org_id`, `message`, `submitted_at`, `created_at`, `updated_at`, `created_by_user_id`
- [x] Pricing remains excluded from the schema and write contract in this unit
- [x] Successful first valid supplier response transitions parent RFQ status to `RESPONDED`
- [x] Existing RFQ read posture remains preserved; no broader buyer identity exposure is introduced
- [x] Audit coexistence is preserved and any new response submission evidence remains consistent with established RFQ doctrine
- [x] No negotiation threads, counter-offers, revisions, order conversion, checkout, settlement, control-plane RFQ workflows, AI automation, or Trade coupling are introduced

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

- Implementation commit: `7edb891` — `feat(rfq): add supplier RFQ response foundation for TECS-RFQ-RESPONSE-001`
- Verification result: `VERIFY-TECS-RFQ-RESPONSE-001` — `VERIFIED_COMPLETE`
- Remote migration / operational evidence:
  - prerequisite RFQ domain baseline remote apply succeeded (`20260318010000_tecs_rfq_domain_001`)
  - supplier response remote apply succeeded (`20260319000002_tecs_rfq_response_001`)
  - `prisma migrate resolve --applied` succeeded for both migrations
  - `prisma db pull` succeeded after remote apply
  - `prisma generate` succeeded after remote apply
  - remote verification confirmed `public.rfq_supplier_responses`, unique `rfq_id`, update trigger, ENABLE RLS, FORCE RLS, supplier-scoped `SELECT` / `INSERT` policies, narrow parent `rfqs` update policy for `RESPONDED`, and required grants
- Verified characteristics:
  - `rfq_supplier_responses` is the first-class child entity related to `rfqs` by `rfq_id`
  - first-slice fields are limited to `id`, `rfq_id`, `supplier_org_id`, `message`, `submitted_at`, `created_at`, `updated_at`, `created_by_user_id`
  - one-response-per-RFQ is enforced by unique `rfq_id`
  - pricing remains absent and the response model remains separate from Trade
  - tenant-plane supplier response create endpoint exists and uses `tenantAuthMiddleware` + `databaseContextMiddleware`
  - write path executes under `withDbContext` / tenant-safe DB context and accepts only `message`
  - client `org_id`, `tenantId`, and `supplier_org_id` authority fields are not trusted
  - response create authority is limited to RFQs where `rfq.supplier_org_id = current tenant`
  - buyer-created and cross-tenant supplier responses are blocked by recipient scoping
  - `CLOSED`, already `RESPONDED`, and duplicate-response submissions are rejected
  - first valid supplier response sets parent RFQ status to `RESPONDED`
  - response remains non-binding with no editing, revision history, negotiation threads, counter-offers, pricing, quote acceptance, order conversion, checkout, settlement, AI automation, control-plane RFQ actions, or multi-round negotiation introduced
  - audit evidence is written with action `rfq.RFQ_RESPONDED`, while domain persistence remains the source of truth with coherent RFQ/response linkage

## Governance Closure

- Governance sync unit: `GOVERNANCE-SYNC-TECS-RFQ-RESPONSE-001`
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`

## Allowed Next Step

This unit is **VERIFIED_COMPLETE**. No further implementation work is authorized on this unit.

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

2026-03-19 — GOVERNANCE-SYNC-TECS-RFQ-RESPONSE-001. Status transitioned: `OPEN` → `VERIFIED_COMPLETE`.
