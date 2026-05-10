# TEXQTIC-NC-FRONTEND-POOL-MEMBER-DEMAND-LINES-001

## Scope
- Prompt ID: FE-4
- Objective: Implement Network Commerce pool member and demand-line frontend surfaces.
- Baseline commit: `ee5aaa1` (tracker v1.3 current-state sync)
- Strict boundaries observed:
  - No backend route changes
  - No server/prisma/schema changes
  - No migrations
  - No middleware/backend service changes
  - No FE-5+ (RFQ issue, supplier invite owner UI, supplier inbox) implementation

## Files Added
- `components/Tenant/NetworkCommerce/DemandLineSurface.tsx`

## Files Updated
- `services/networkCommerceService.ts`
- `components/Tenant/NetworkCommerce/PoolDetailSurface.tsx`
- `App.tsx`

## FE-4 Service Expansion
`services/networkCommerceService.ts` expanded from FE-3 owner-only methods to FE-4 member+demand-line scope.

Added methods:
- `listJoinedPools(params?)`
- `joinPool(poolId, input)`
- `listDemandLines(poolId, params?)`
- `createDemandLine(poolId, input)`
- `updateDemandLine(poolId, lineId, input)`
- `cancelDemandLine(poolId, lineId, input?)`
- `lockDemandLinesForRfq(poolId, input?)`

Added FE-4 types:
- `NetworkPoolDemandLine`
- `DemandLineListPagination`
- `NetworkPoolDemandLineListResponse`
- `CreateDemandLineInput`
- `UpdateDemandLineInput`
- `CancelDemandLineInput`
- `DemandSnapshotRecord`
- `ListDemandLinesParams`
- `JoinPoolInput`
- `LockDemandLinesForRfqInput`

## FE-4 Surface Implemented
### Demand line member/owner surface
`DemandLineSurface.tsx`:
- Loading, empty, error, feature-disabled, and ready states
- Create demand line workflow
- Edit/update workflow for editable lines (`DRAFT`, `ACTIVE`)
- Cancel workflow for cancellable lines (`DRAFT`, `ACTIVE`)
- Lock-for-RFQ action wiring with role-aware backend handling
- Locked badge rendering when `locked_at` is present
- No cross-member identity exposure beyond backend payload

### Pool detail navigation extension
`PoolDetailSurface.tsx`:
- Added optional `onNavigateToDemandLines` callback
- Demand Lines next-step card now conditionally actionable when callback is provided
- Backwards compatibility preserved when callback is omitted

## App Routing Integration
`App.tsx` FE-4-only edits:
- Added `DemandLineSurface` import
- `nc_pool_detail` now passes `onNavigateToDemandLines`
- `nc_pool_demand_lines` now renders:
  - `DemandLineSurface` when `selectedPoolId` exists
  - fallback placeholder when no pool is selected
- FE-5+ placeholders preserved unchanged:
  - `nc_pool_rfq`
  - `nc_pool_invite_inbox`
  - `nc_pool_oversight`

## Verification Evidence
### App.tsx narrow-hunk safety
- `git diff -- App.tsx` shows only FE-4-targeted hunks:
  - DemandLineSurface import
  - `onNavigateToDemandLines` callback wiring
  - `nc_pool_demand_lines` route case replacement
- No mojibake or broad file rewrite observed

### Scope guard
- `git diff --name-only -- server`
- Result: no output (backend untouched)

### Typecheck
- `pnpm run typecheck`
- Result: pass (`tsc --noEmit` at root and server completed)

### Frontend tests
- `pnpm run test:frontend`
- Result: pass (`1` file, `5` tests)

## Notes
- FE-4 is frontend-only and intentionally excludes FE-5/FE-6/FE-7 scope.
- Governance posture remains unchanged:
  - `active_delivery_unit: HOLD_FOR_AUTHORIZATION`
  - `dpp_launch_authorization: HOLD_FOR_PARESH_DECISION`
- No commit performed in this step.
