# TEXQTIC-NC-FRONTEND-RFQ-ISSUE-PANEL-001

## 1. Packet Metadata
- Packet ID: TEXQTIC-NC-FRONTEND-RFQ-ISSUE-PANEL-001
- Packet type: FE-5 frontend implementation
- Scope: RFQ issue panel UI only
- Starting HEAD: `a4cc6a4`
- Required predecessor verified: `a4cc6a4` (feat(network-commerce): add pool member demand line frontend)
- Tracker sync commit verified in history: `ee5aaa1` (docs(network-commerce): sync tracker with completed backend and frontend work)
- Date: 2026-05-10
- DPP posture (unchanged):
  - active_delivery_unit: HOLD_FOR_AUTHORIZATION
  - dpp_launch_authorization: HOLD_FOR_PARESH_DECISION

## 2. Authority Sources
1. Current repo truth
2. `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` (v1.3)
3. `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-CURRENT-STATE-SYNC-001.md`
4. `governance/TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001.md`
5. `governance/TEXQTIC-NC-FRONTEND-SHELL-NAV-FEATURE-GATE-001.md`
6. `governance/TEXQTIC-NC-FRONTEND-POOL-OWNER-LIST-DETAIL-001.md`
7. `governance/TEXQTIC-NC-FRONTEND-POOL-MEMBER-DEMAND-LINES-001.md`
8. Frontend NC files in scope:
   - `App.tsx`
   - `services/networkCommerceService.ts`
   - `components/Tenant/NetworkCommerce/PoolListSurface.tsx`
   - `components/Tenant/NetworkCommerce/PoolDetailSurface.tsx`
   - `components/Tenant/NetworkCommerce/DemandLineSurface.tsx`
   - `components/Tenant/NetworkCommerce/NetworkCommercePlaceholderSurface.tsx`
9. Runtime/shell references inspected (read-only):
   - `runtime/sessionRuntimeDescriptor.ts`
   - `layouts/Shells.tsx`
   - `layouts/SuperAdminShell.tsx`
10. Tenant API client: `services/tenantApiClient.ts`
11. Backend route truth (read-only):
   - `server/src/routes/tenant/poolRfq.ts`
   - `server/src/routes/tenant/poolDemandLines.ts`

## 3. Pre-Work Verification
- `git status --short` before edits: clean (no output)
- `git log --oneline -n 30` confirms required commits present (`a4cc6a4`, `ee5aaa1`, `2ed09bd`, `16c395c`, `7579b65`)
- `git show --stat a4cc6a4` verified predecessor contents
- `git show --stat ee5aaa1` verified tracker sync commit
- FE-4 file existence verified:
  - `components/Tenant/NetworkCommerce/DemandLineSurface.tsx`
  - `governance/TEXQTIC-NC-FRONTEND-POOL-MEMBER-DEMAND-LINES-001.md`
- FE-2 route key `nc_pool_rfq` verified in `runtime/sessionRuntimeDescriptor.ts`
- App placeholder state for `nc_pool_rfq` confirmed before FE-5 edits
- FE-3/FE-4 selected pool state and route handoff verified intact before editing

## 4. Backend Contract Truth Used by FE-5
### RFQ issue route
- Route: `POST /api/tenant/network-commerce/pools/:poolId/rfq/issue`
- Required backend gates: `nc.procurement_pools.enabled`, `nc.procurement_pools.rfq.enabled`
- Owner/admin only at route layer; member returns 403
- Body accepted (strict):
  - `issue_reason?: string | null`
  - `response_deadline_at?: string | null`
- Body forbidden fields enforced by backend zod: `org_id`, `owner_org_id`, `pool_id` body copy, `snapshot_id`, `rfq_ref`, `rfq_version`, `status`, `issue_basis`, `supplier_invite_mode`, `metadata_internal_json`, and other system fields
- Response: RFQ header record (no line payload, no metadata_internal_json)

### Demand lock/readiness route
- Route: `POST /api/tenant/network-commerce/pools/:poolId/demand-lines/lock-for-rfq`
- Response: demand snapshot header (`DemandSnapshotRecord`)
- Readiness source route: `GET /api/tenant/network-commerce/pools/:poolId/demand-lines`

## 5. Service Methods Added
Updated `services/networkCommerceService.ts` with FE-5-safe RFQ issue support:
- Added `IssueRfqInput`
- Added `NetworkPoolRfq`
- Added `issueRfq(poolId, input?)`

Service boundary preserved:
- Uses `tenantGet`, `tenantPost`, `tenantPatch` from `tenantApiClient`
- No direct `apiClient` usage added
- No supplier invite, quote, award, allocation, order, settlement, or oversight methods added

## 6. Components Created/Updated
### Created
- `components/Tenant/NetworkCommerce/PoolRfqSurface.tsx`

### Updated
- `components/Tenant/NetworkCommerce/PoolDetailSurface.tsx`
  - Added optional callback prop: `onNavigateToRfqIssue?: () => void`
  - Activated FE-5 Issue RFQ card as navigable action when callback exists

### Untouched FE-4 behavior
- `components/Tenant/NetworkCommerce/DemandLineSurface.tsx` was not modified for FE-5

## 7. App.tsx Integration
`App.tsx` FE-5 edits are bounded:
- Added import for `PoolRfqSurface`
- Added optional callback wiring from `PoolDetailSurface`:
  - `onNavigateToRfqIssue={() => navigateTenantManifestRoute('nc_pool_rfq')}`
- Replaced `nc_pool_rfq` placeholder case:
  - when `selectedPoolId` exists → render `PoolRfqSurface`
  - when no selected pool → bounded placeholder prompting selection from NC Pools

Preserved route behavior:
- `nc_pools`, `nc_pool_detail`, `nc_pool_demand_lines` retained existing flow
- `nc_pool_invite_inbox` and `nc_pool_oversight` remain placeholders (no FE-6+ implementation)

## 8. App.tsx Encoding-Safety Verification
Executed `git diff -- App.tsx` after edits.
Observed only intended FE-5 hunks:
- `PoolRfqSurface` import
- `onNavigateToRfqIssue` callback wiring in pool detail render
- narrow `nc_pool_rfq` route-case replacement

No broad rewrite, mojibake, or unrelated string/comment rewrites observed.

## 9. Feature-Gated UX Behavior
`PoolRfqSurface` follows FE-1 Strategy B (backend authoritative):
- `FEATURE_DISABLED` / HTTP 503 → feature-disabled state card
- 403 / `FORBIDDEN` → role-forbidden state card
- invalid-state backend codes (`INVALID_STATE`, `TRANSITION_DENIED`, `RFQ_ALREADY_ISSUED`, `DEMAND_SNAPSHOT_NOT_READY`, etc.) → invalid-state card
- generic failures → generic error state

No client-side feature-flag hydration system added.

## 10. Role Behavior
Owner/admin-oriented action flow:
- lock demand lines for RFQ snapshot
- issue RFQ

Member/non-authorized flow:
- backend 403 surfaced as forbidden UX state
- frontend role checks are UX-level only; backend remains final authority

## 11. Privacy / Non-Leak Behavior
- No rendering of metadata/internal JSON fields
- No supplier-invite data shown in FE-5
- No quote/award/order/settlement data shown
- Demand summary is bounded to backend-provided pool demand data and aggregate fields
- No added cross-tenant identity leakage logic

## 12. RFQ Issue Input / Response Contract Summary
### Input sent by FE-5
`issueRfq` payload is constrained to:
- `issue_reason?: string | null`
- `response_deadline_at?: string | null`

Explicitly not sent by FE-5:
- `org_id`, `owner_org_id`, `pool_id` body field, `snapshot_id`, `rfq_ref`, `rfq_version`, `status`, `issue_basis`, `supplier_invite_mode`, `metadata_internal_json`, lifecycle/system fields

### Response consumed by FE-5
RFQ header fields rendered from backend:
- `rfq_ref`, `status`, `line_count`, `issued_at`, `issue_reason`, `response_deadline_at`, `issue_basis`, `total_qty`, `qty_unit`

## 13. Validation Command Results
### Required pre-work commands
- `git status --short` → clean (no output)
- `git log --oneline -n 30` → required commits present
- `git show --stat a4cc6a4` → predecessor verified
- `git show --stat ee5aaa1` → tracker sync verified

### Typecheck
- `pnpm run typecheck` → PASS

### Frontend tests
- `pnpm run test:frontend` → PASS
  - `tests/frontend/ttp-enrollment-admin.test.tsx` PASS
  - `tests/frontend/network-commerce-rfq-issue-panel.test.tsx` PASS

### Runtime routing focused tests
- `pnpm run test:runtime-routing:focused` → FAIL (1 existing failure)
  - failing file: `tests/session-runtime-descriptor.test.ts`
  - failing case: `maps non-white-label B2B tenants to workspace routing`
  - failure assertion expects descriptor object without `network_commerce_pools`
  - FE-5 packet did not modify `runtime/sessionRuntimeDescriptor.ts` or runtime routing test files

### Required diff checks
- `git diff --name-only` → FE-5 frontend files only
- `git diff -- App.tsx` → narrow intended FE-5 hunks only
- `git diff --name-only -- server` → no output (backend untouched)

## 14. Files Changed
- `services/networkCommerceService.ts`
- `components/Tenant/NetworkCommerce/PoolRfqSurface.tsx` (new)
- `components/Tenant/NetworkCommerce/PoolDetailSurface.tsx`
- `App.tsx`
- `tests/frontend/network-commerce-rfq-issue-panel.test.tsx` (new)

## 15. Scope Compliance Statement
This FE-5 packet implemented frontend RFQ issue only.
Not implemented:
- backend changes
- schema or migrations
- backend services/routes/middleware edits
- FE-6 supplier invite owner UI
- FE-7 supplier invite supplier inbox UI
- quote/award/allocation/order/settlement UI
- control-plane NC oversight implementation

## 16. Known Limitations
- Required runtime-focused routing command has one failing test in `tests/session-runtime-descriptor.test.ts` with an expectation mismatch unrelated to FE-5 edited files.
- FE-5 intentionally does not implement RFQ read/list history surfaces or supplier invite workflows.

## 17. Next Recommended Packet
Frontend next packet:
- `TEXQTIC-NC-FRONTEND-SUPPLIER-INVITE-OWNER-UI-001`

Backend alternative / parallel:
- `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-ROUTE-001`
