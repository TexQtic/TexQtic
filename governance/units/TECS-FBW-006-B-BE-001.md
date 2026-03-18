---
unit_id: TECS-FBW-006-B-BE-001
title: Backend Prerequisite — Tenant Resolve Own Escalation Route
type: IMPLEMENTATION
subtype: BACKEND
status: OPEN
wave: W3-residual
plane: BACKEND
opened: 2026-03-18
closed: null
verified: null
commit: null
evidence: null
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

- [ ] `POST /api/tenant/escalations/:id/resolve` route is implemented in
      `server/src/routes/tenant/escalation.g022.ts`
- [ ] Tenant may only resolve escalations belonging to their own org (orgId derived from JWT — D-011)
- [ ] RLS via `withDbContext` enforces the org boundary at DB level (D-001)
- [ ] Tenant resolve restricted to LEVEL_0 and LEVEL_1 escalations (consistent with create posture)
- [ ] Audit log written in the same Prisma transaction as the resolve mutation (D-002)
- [ ] TypeScript type-check passes: `pnpm --filter server typecheck` EXIT 0
- [ ] Lint passes: `pnpm --filter server lint` EXIT 0
- [ ] Server restarts cleanly; health check `GET /health` returns 200

## Files Allowlisted (Modify)

- `server/src/routes/tenant/escalation.g022.ts` — add `POST /:id/resolve` route handler

## Files Read-Only

- `server/src/services/escalation.service.ts` — verify `resolveEscalation()` signature
- `server/src/routes/control/escalation.g022.ts` — reference pattern for resolve path
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/decisions/PRODUCT-DECISIONS.md`

## Evidence Record

*Not yet recorded — unit is OPEN.*

## Governance Closure

On VERIFIED_COMPLETE of this unit, a governance closure unit must:

1. Update `governance/units/TECS-FBW-006-B-BE-001.md` status → VERIFIED_COMPLETE
2. Transition `governance/units/TECS-FBW-006-B.md` status: BLOCKED → OPEN
   - Remove blocker reference BLK-006-B-001
   - Set `opened` date and update `decisions_required`
3. Update `governance/control/OPEN-SET.md`:
   - Remove TECS-FBW-006-B-BE-001 (now terminal)
   - Update TECS-FBW-006-B status: BLOCKED → OPEN
4. Update `governance/control/NEXT-ACTION.md` → TECS-FBW-006-B
5. Update `governance/control/BLOCKED.md`: remove BLK-006-B-001 from Section 1; add to Section 4 (resolved blockers)
6. Update `governance/control/SNAPSHOT.md`

## Drift Guards

- This unit is backend-only. Do NOT wire frontend mutation controls in this unit.
- Frontend wiring of escalation mutations belongs in TECS-FBW-006-B after this unit is VERIFIED_COMPLETE.
- The existing `POST /api/tenant/escalations` (create) route must not be modified by this unit.
- `freezeRecommendation` must remain informational-only (D-022-C). The resolve route must not
  expose or set this field.
- orgId must come from the JWT (tenantAuthMiddleware + databaseContextMiddleware), never from
  the request body (D-011, D-017-A analog for escalation).

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as OPEN) |
| Why was it created? | `governance/units/TECS-FBW-006-B.md` — blocker BLK-006-B-001 |
| What authorized it? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-ESCALATION-MUTATIONS |
| What does it unblock? | TECS-FBW-006-B — full escalation mutation frontend unit |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-011, D-001, D-002, D-004) |
