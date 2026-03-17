---
unit_id: TECS-FBW-002-B
title: Trades Tenant Panel — backend route prerequisite
type: IMPLEMENTATION
status: OPEN
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
  - none (implementation authorized — BLK-FBW-002-B-001 formally resolved 2026-03-17)
blockers:
  - id: BLK-FBW-002-B-001
    description: GET /api/tenant/trades tenant-plane route not designed or implemented
    registered: 2026-03-07
    resolved: 2026-03-17
    resolved_by: TECS-FBW-002-B-BE-ROUTE-001
    resolution_evidence: "commit 5ffd727 · VERIFY-TECS-FBW-002-B-BE-ROUTE-001: VERIFIED_COMPLETE"
---

## Unit Summary

TECS-FBW-002-B completes the trades surface in the tenant panel by rendering a
[TradesPanel.tsx](../../components/Tenant/) frontend view backed by a real API route.
The parent unit TECS-FBW-002-A (admin control-plane trades view) is already VERIFIED_COMPLETE;
this B-slice cannot begin until a backend GET /api/tenant/trades route is designed and implemented.

## Acceptance Criteria

- [x] Backend `GET /api/tenant/trades` route designed, implemented, and verified (TECS-FBW-002-B-BE-ROUTE-001, commit 5ffd727, VERIFIED_COMPLETE)
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

**Backend prerequisite resolved (2026-03-17):**
- Implementation unit: `TECS-FBW-002-B-BE-ROUTE-001`, commit `5ffd727`
- Verification unit: `VERIFY-TECS-FBW-002-B-BE-ROUTE-001`, result: `VERIFIED_COMPLETE`
- Route: `GET /api/tenant/trades` — tenant-plane, org_id-scoped, RLS-enforced

*Frontend acceptance criteria evidence: not yet recorded — unit is OPEN, not yet IN_PROGRESS.*

## Governance Closure
*Not yet set — unit is BLOCKED and not implementation-ready.*

---

## Allowed Next Step

This unit is **OPEN (implementation-ready)**. A **TECS-FBW-002-B implementation prompt** may
now be issued to implement the TradesPanel.tsx frontend work. The prompt must:
1. Define the allowlist (expected: `components/Tenant/TradesPanel.tsx`, `services/tenantApiClient.ts`)
2. Reference the live backend route `GET /api/tenant/trades` (commit 5ffd727)
3. Implement against the acceptance criteria below (all frontend items remain `[ ]`)
4. Run narrow validation (typecheck + lint)
5. Close with one atomic commit

**Operator authorization is required** to issue that implementation prompt. NEXT-ACTION.md
authorizes TECS-FBW-002-B implementation as the next action.

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
