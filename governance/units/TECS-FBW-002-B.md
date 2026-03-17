---
unit_id: TECS-FBW-002-B
title: Trades Tenant Panel — backend route prerequisite
type: IMPLEMENTATION
status: CLOSED
wave: W3-residual
plane: TENANT
opened: 2026-03-07
closed: 2026-03-17
verified: 2026-03-17
commit: b647092
evidence: "VERIFY-TECS-FBW-002-B: VERIFIED_COMPLETE"
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
- [x] `TradesPanel.tsx` (tenant panel) implemented against the live backend route (commit b647092)
- [x] Response scoped by `org_id`; RLS enforced at DB layer (tenantGet() TENANT realm guard; D-017-A compliant)
- [x] Loading, error, and empty states handled in the frontend component
- [x] TypeScript type-check passes (EXIT 0)
- [x] Lint passes (EXIT 0)
- [x] Manual verification: tenant sees only their own trades (org_id scoped at server; D-011 compliant)

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

**Frontend implementation complete (2026-03-17):**
- Implementation unit: `TECS-FBW-002-B`, commit `b647092`
- Files: `components/Tenant/TradesPanel.tsx` (new), `services/tradeService.ts` (new), `App.tsx` (modified), `layouts/Shells.tsx` (modified)
- `listTenantTrades()` calls `GET /api/tenant/trades` via `tenantGet()` — D-017-A compliant (no orgId from client)
- Loading / error / empty / success states all present; tsc EXIT:0

**Verification (2026-03-17):**
- Verification unit: `VERIFY-TECS-FBW-002-B`, result: `VERIFIED_COMPLETE`
- All 9 PASS criteria confirmed; D-017-A posture confirmed; no forbidden files touched

## Governance Closure
- **Closed:** 2026-03-17
- **Closed by:** GOV-CLOSE-TECS-FBW-002-B-TRADES-PANEL
- **Frontend commit:** `b647092` — `components/Tenant/TradesPanel.tsx`, `services/tradeService.ts`, `App.tsx`, `layouts/Shells.tsx`
- **Backend commit:** `5ffd727` — `server/src/routes/tenant.ts` (GET /api/tenant/trades)
- **Verification:** VERIFY-TECS-FBW-002-B: VERIFIED_COMPLETE (all 9 PASS criteria)
- **Status transition:** BLOCKED → OPEN (GOV-SYNC-TECS-FBW-002-B-BLOCKER-RESOLUTION) → CLOSED (this unit)

---

## Closed — No Next Step

This unit is **CLOSED**. All acceptance criteria are met. No further implementation or
verification work is authorized on this unit. Operator must authorize the next action
via `governance/control/NEXT-ACTION.md` before any new work begins.

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

2026-03-17 — GOV-CLOSE-TECS-FBW-002-B-TRADES-PANEL. Status confirmed: CLOSED. All acceptance criteria VERIFIED_COMPLETE.
