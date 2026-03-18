---
unit_id: TECS-FBW-006-B-BE-001
title: Backend Prerequisite — Tenant Resolve Own Escalation Route
type: IMPLEMENTATION
subtype: BACKEND
status: VERIFIED_COMPLETE
wave: W3-residual
plane: BACKEND
opened: 2026-03-18
closed: 2026-03-18
verified: 2026-03-18
commit: "a2d8bfc · d212d0d"
evidence: "VERIFY-TECS-FBW-006-B-BE-001: PASS · VERIFIED_COMPLETE · GOV-CLOSE-TECS-FBW-006-B-BE-001"
prerequisite_for: TECS-FBW-006-B
doctrine_constraints:
  - D-011: org_id must scope the resolve path; tenant can only resolve escalations belonging to their own org
  - D-001: RLS must enforce tenant isolation on the escalation write path
  - D-002: tenant resolve writes audit log in the same Prisma transaction as the resolve mutation
  - D-004: this unit covers the backend route only; frontend wiring belongs in TECS-FBW-006-B
decisions_required:
  - PRODUCT-DEC-ESCALATION-MUTATIONS: DECIDED (2026-03-18, Paresh) — tenant resolve authorized as product target
blockers: []
---

## Unit Summary

TECS-FBW-006-B-BE-001 is the backend prerequisite for TECS-FBW-006-B.
It implements the single missing tenant-plane route:

  POST /api/tenant/escalations/:id/resolve

The route allows a tenant to resolve an escalation they own (i.e., within their own org scope).
The product decision (PRODUCT-DEC-ESCALATION-MUTATIONS) authorizes tenant resolve as a target,
but explicitly conditions it on this backend route being established through governance-approved
sequencing first. This unit satisfies that prerequisite.

The EscalationService already implements `resolveEscalation()` (used by the control-plane route
at `POST /api/control/escalations/:id/resolve`). This unit wires that existing service method
into the tenant route file following the exact same pattern as the existing tenant escalation
routes.

## Acceptance Criteria

- [x] `POST /api/tenant/escalations/:id/resolve` route is implemented in
      `server/src/routes/tenant/escalation.g022.ts`
- [x] Tenant may only resolve escalations belonging to their own org (orgId derived from JWT — D-011)
- [x] RLS via `withDbContext` enforces the org boundary at DB level (D-001)
- [x] Tenant resolve restricted to LEVEL_0 and LEVEL_1 escalations (consistent with create posture)
- [x] Audit log written in the same Prisma transaction as the resolve mutation (D-002)
- [x] TypeScript type-check passes: `cd server ; pnpm typecheck` EXIT 0
- [x] Lint passes: `cd server ; pnpm lint` EXIT 0 (warnings only, 0 errors)
- [x] Server route compiles cleanly; blocker prerequisite satisfied for governance transition

## Files Allowlisted (Modify)

- `server/src/routes/tenant/escalation.g022.ts` — add `POST /:id/resolve` route handler

## Files Read-Only

- `server/src/services/escalation.service.ts` — verify `resolveEscalation()` signature
- `server/src/routes/control/escalation.g022.ts` — reference pattern for resolve path
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/decisions/PRODUCT-DECISIONS.md`

## Evidence Record

- Implementation commit: `a2d8bfc` — `feat(api): add tenant escalation resolve route for TECS-FBW-006-B-BE-001`
- Corrective commit: `d212d0d` — `fix(api): enforce tenant escalation resolve severity guard for TECS-FBW-006-B-BE-001`
- Verification: `VERIFY-TECS-FBW-006-B-BE-001` — Result: `PASS` — Gap Decision: `VERIFIED_COMPLETE`
- Verified blocker resolution facts:
  - `POST /api/tenant/escalations/:id/resolve` exists
  - route is tenant-plane only
  - tenant auth + JWT/RLS org scoping preserved
  - no client `orgId` / `tenantId` accepted
  - tenant resolve explicitly restricted to LEVEL_0 / LEVEL_1
  - severity `> 1` rejected before delegation
  - allowed cases still reuse `EscalationService.resolveEscalation()`
  - no tenant upgrade path added
  - no tenant override path added

## Governance Closure

- Governance close unit: `GOV-CLOSE-TECS-FBW-006-B-BE-001`
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- BLK-006-B-001 resolved on 2026-03-18
- Parent unit `TECS-FBW-006-B` transitioned `BLOCKED` → `OPEN`
- Layer 0, Layer 1, and Layer 3 synchronized by this governance close unit

## Drift Guards

- This unit is backend-only. Do NOT wire frontend mutation controls in this unit.
- Frontend wiring of escalation mutations belongs in TECS-FBW-006-B after this unit is VERIFIED_COMPLETE.
- The existing `POST /api/tenant/escalations` (create) route must not be modified by this unit.
- `freezeRecommendation` must remain informational-only (D-022-C). The resolve route must not
  expose or set this field.
- orgId must come from the JWT (tenantAuthMiddleware + databaseContextMiddleware), never from
  the request body (D-011, D-017-A analog for escalation).

## Closed — No Next Step

This prerequisite unit is **VERIFIED_COMPLETE**. No further implementation or verification
work is authorized on this unit. The next active implementation unit is `TECS-FBW-006-B`.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as OPEN) |
| Why was it created? | `governance/units/TECS-FBW-006-B.md` — blocker BLK-006-B-001 |
| What authorized it? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-ESCALATION-MUTATIONS |
| What does it unblock? | TECS-FBW-006-B — full escalation mutation frontend unit |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-011, D-001, D-002, D-004) |
