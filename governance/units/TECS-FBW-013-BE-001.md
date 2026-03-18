---
unit_id: TECS-FBW-013-BE-001
title: Backend Prerequisite — Tenant RFQ Submission Route
type: IMPLEMENTATION
subtype: BACKEND
status: OPEN
wave: W5
plane: BACKEND
opened: 2026-03-18
closed: null
verified: null
commit: null
evidence: null
prerequisite_for: TECS-FBW-013
doctrine_constraints:
  - D-011: org_id must scope the RFQ submission path; no cross-tenant quote writes permitted
  - D-001: RLS must enforce tenant isolation on the RFQ write path
  - D-002: RFQ submission must be explicit and audited
  - D-004: this unit covers the backend route only; frontend activation belongs in TECS-FBW-013
decisions_required:
  - PRODUCT-DEC-B2B-QUOTE: DECIDED (2026-03-18, Paresh) — authorized limited tenant-plane RFQ initiation only
blockers: []
---

## Unit Summary

TECS-FBW-013-BE-001 is the backend prerequisite for TECS-FBW-013.
It installs the single missing tenant-plane capability required by PRODUCT-DEC-B2B-QUOTE:

  POST /api/tenant/rfq

This route must support buyer-initiated RFQ submission from the existing B2B Request Quote CTA.
The authorized product scope is limited: non-binding RFQ initiation only, tenant-plane only,
authenticated users only, auditable human-triggered submission only. No seller negotiation,
counter-offers, multi-round workflow, compliance progression, order conversion, checkout,
settlement, AI-autonomous decisions, control-plane quote actions, or public/cross-tenant access
belong in this prerequisite unit.

## Acceptance Criteria

- [ ] `POST /api/tenant/rfq` route is designed and implemented server-side
- [ ] Route requires authenticated tenant users only
- [ ] org_id is derived from authenticated tenant context; no client-supplied orgId or tenantId accepted
- [ ] RFQ submission is auditable and human-triggered only
- [ ] Route implements non-binding RFQ initiation only; no seller workflow or order semantics introduced
- [ ] TypeScript type-check passes for the backend target (EXIT 0)
- [ ] Lint passes for the backend target (EXIT 0)
- [ ] Parent blocker BLK-013-001 is satisfiable from implementation evidence alone

## Files Allowlisted (Modify)
*To be defined by the TECS-FBW-013-BE-001 implementation prompt.*

Expected candidates (for future implementation prompt only):
- `server/src/routes/tenant.ts` or a tenant quote route module — add tenant-plane RFQ submission route
- `shared/contracts/openapi.tenant.json` — add governed tenant RFQ route contract only if needed by the implementation plan
- backend service or audit wiring files strictly required to persist an auditable RFQ submission path

## Files Read-Only

- `App.tsx` — confirm current Request Quote CTA remains disabled / unwired
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md`
- `governance/units/TECS-FBW-013.md`
- `governance/decisions/PRODUCT-DECISIONS.md`

## Evidence Record

*Not yet recorded — unit is OPEN and awaiting implementation.*

## Governance Closure

*Not yet set — unit is OPEN.*

On successful implementation and verification:
- BLK-013-001 may be resolved
- Parent unit `TECS-FBW-013` may be reconsidered for `BLOCKED` → `OPEN`
- A separate governance sequencing / close unit must make that transition explicitly

## Allowed Next Step

Implement this backend prerequisite unit only.

## Forbidden Next Step

- Do **not** activate or wire the frontend Request Quote CTA in this unit
- Do **not** add seller negotiation workflows, counter-offers, or multi-round quote loops
- Do **not** add compliance progression, order conversion, checkout, or settlement semantics
- Do **not** add AI-autonomous quote decisions
- Do **not** add control-plane, public, or cross-tenant quote actions
- Do **not** treat this route as authorization to open the parent unit directly; governance must transition it explicitly

## Drift Guards

- This unit is backend-only. Frontend activation belongs in `TECS-FBW-013` after this unit is VERIFIED_COMPLETE.
- Route semantics must remain non-binding RFQ initiation only.
- org_id must come from the authenticated tenant context, never from request body input.
- If implementation requires a wider contract surface than a single tenant-plane RFQ submission route,
  stop and raise a governance blocker instead of widening scope implicitly.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` |
| Why was it created? | `governance/units/TECS-FBW-013.md` — blocker BLK-013-001 |
| What authorized it? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-B2B-QUOTE |
| What does it unblock? | `TECS-FBW-013` — limited B2B quote parent unit |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-011, D-001, D-002, D-004) |
