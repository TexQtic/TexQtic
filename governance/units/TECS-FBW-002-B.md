---
unit_id: TECS-FBW-002-B
title: Trades Tenant Panel — backend route prerequisite
type: IMPLEMENTATION
status: BLOCKED
wave: W3-residual
plane: TENANT
opened: 2026-03-07
closed: null
verified: null
commit: null
evidence: null
doctrine_constraints:
  - D-001: RLS must enforce tenant isolation on trades table query (when route implemented)
  - D-011: org_id must scope GET /api/tenant/trades; no cross-tenant leakage permitted
decisions_required:
  - none (implementation authorized once BLK-FBW-002-B-001 is formally resolved)
blockers:
  - id: BLK-FBW-002-B-001
    description: GET /api/tenant/trades tenant-plane route not designed or implemented
    registered: 2026-03-07
---

## Unit Summary

TECS-FBW-002-B completes the trades surface in the tenant panel by rendering a
[TradesPanel.tsx](../../components/Tenant/) frontend view backed by a real API route.
The parent unit TECS-FBW-002-A (admin control-plane trades view) is already VERIFIED_COMPLETE;
this B-slice cannot begin until a backend GET /api/tenant/trades route is designed and implemented.

## Acceptance Criteria

- [ ] Backend `GET /api/tenant/trades` route designed, implemented, and verified (prerequisite unit; not in scope of this unit)
- [ ] `TradesPanel.tsx` (tenant panel) implemented against the live backend route
- [ ] Response scoped by `org_id`; RLS enforced at DB layer
- [ ] Loading, error, and empty states handled in the frontend component
- [ ] TypeScript type-check passes (EXIT 0)
- [ ] Lint passes (EXIT 0)
- [ ] Manual verification: tenant sees only their own trades

## Files Allowlisted (Modify)
*Not yet defined — pending backend design unit authorization.*

Expected candidates (for future implementation prompt only):
- `components/Tenant/TradesPanel.tsx` (NEW or update)
- `services/tenantApiClient.ts` (SUNE — add trades query)
- `shared/contracts/openapi.tenant.json` (SUNE — add GET /api/tenant/trades)
- `server/src/routes/tenant.ts` (NEW endpoint — requires separate backend unit)

## Files Read-Only
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` (historical reference)

## Evidence Record
*Not yet recorded — unit is BLOCKED.*

## Governance Closure
*Not yet set — unit is BLOCKED and not implementation-ready.*

---

## Allowed Next Step

A **new IMPLEMENTATION unit** must be authorized to:
1. Design the tenant-plane `GET /api/tenant/trades` backend route
2. Implement the route (Fastify, org_id-scoped, RLS-enforced)
3. Verify the backend route in isolation

Only after that backend unit is `VERIFIED_COMPLETE` may a follow-on implementation unit
begin the TradesPanel.tsx frontend work.

**Operator authorization is required** to define the backend unit before any code work begins.

## Forbidden Next Step

- Do **not** begin TradesPanel.tsx frontend work while this unit is BLOCKED
- Do **not** mock the backend route in the frontend as a workaround
- Do **not** promote this unit to IN_PROGRESS without first resolving BLK-FBW-002-B-001
- Do **not** treat TECS-FBW-002-A (admin view, VERIFIED_COMPLETE) as unblocking this unit
- Do **not** reopen this unit — it is already OPEN/BLOCKED; only resolve the backend blocker

## Drift Guards

- Parent unit TECS-FBW-002-A is VERIFIED_COMPLETE (commit: GOVERNANCE-SYNC-110). Do not
  conflate the two — 002-A is the admin control-plane trades view; 002-B is the tenant panel.
- This unit was blocked at Wave 3 gate close. It is explicitly not a Wave 3 gate prerequisite.
  Wave 3 closed with this unit BLOCKED by design.
- Doctrine D-017-A applies to the future implementation: `tenantId` must NOT be in the request
  body; it must be derived server-side from the authenticated session.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` |
| What is the blocker? | `governance/control/BLOCKED.md` — Section 1 |
| What doctrine applies? | `governance/control/DOCTRINE.md` |
| What is next overall? | `governance/control/NEXT-ACTION.md` |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` line ~100 |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-17 — GOV-OS-003 Unit Record Migration Batch 1. Status confirmed: BLOCKED.
