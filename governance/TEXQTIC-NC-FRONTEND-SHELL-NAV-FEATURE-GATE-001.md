# TEXQTIC-NC-FRONTEND-SHELL-NAV-FEATURE-GATE-001

## 1) Metadata

- Unit: TEXQTIC-NC-FRONTEND-SHELL-NAV-FEATURE-GATE-001
- Type: Implementation Unit (Frontend/Shell/Navigation)
- Scope: Network Commerce Phase 1 frontend shell foundation
- Mode: Implementation (frontend only, no backend, no schema, no services)
- Status: EXECUTED
- Date: 2026-05-31
- Authority sources:
  - TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001 (FE-1, Section 17 readiness checklist)
  - governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-FRONTEND-ADDENDUM-001.md
  - governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md (v1.2)
- Paresh authorization: Explicit (FE-2 implementation packet opened)
- Commit: [pending git commit]

## 2) Executive Summary

This packet implements the Network Commerce Phase 1 frontend shell foundation (FE-2) following the design authority in FE-1. No domain UI, backend changes, or schema modifications are made. Scope is strictly limited to:
- Adding 6 runtime route keys to descriptor
- Adding 1 route group (network_commerce_pools) with feature-gated classification
- Wiring B2BShell and SuperAdminShell NC navigation entries
- Adding placeholder/continuity route handlers in App.tsx
- Creating minimal placeholder UI component for NC continuity

Result: Network Commerce is now visible and routable in the frontend shell without implementing domain business logic or requiring backend service implementation.

## 3) Pre-Work Verification

✅ Working tree clean (no uncommitted changes before edits)
✅ HEAD includes 7579b65 (FE-1 design commit)
✅ FE-1 design artifact exists (governance/TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001.md)
✅ FE-1 status: VERIFIED_COMPLETE
✅ DPP posture: HOLD_FOR_PARESH_DECISION (unchanged)
✅ Route descriptor patterns inspected and understood
✅ B2BShell nav patterns inspected and understood
✅ SuperAdminShell nav patterns inspected and understood
✅ App.tsx routing patterns inspected and understood

## 4) Route Descriptor Authority (Section 17, FE-1)

### 4.1) RuntimeLocalRouteKey Additions (6 new)

- `nc_pools`: NC pool registry and workspace entry point
- `nc_pool_detail`: Pool configuration and membership detail
- `nc_pool_demand_lines`: Aggregated member demand visibility
- `nc_pool_rfq`: Owner RFQ issuance and management
- `nc_pool_invite_inbox`: Supplier-side invite receipt (backend-blocked)
- `nc_pool_oversight`: Control-plane aggregated pool oversight

### 4.2) RouteGroupKey Addition (1 new)

- `network_commerce_pools`: feature-gated classification

### 4.3) Route Group Classification

```
network_commerce_pools => feature-gated
```

Classification rationale: NC pools are dependent on `nc.procurement_pools.enabled` backend feature flag. Visibility and functionality degrade gracefully when gate is disabled (503 FEATURE_DISABLED response from backend).

### 4.4) Manifest Placements

#### b2b_workspace manifest

Added to `allowedRouteGroups`:
- `network_commerce_pools`

Route group included in `routeGroups` array as `NETWORK_COMMERCE_ROUTE_GROUP`.

Routable keys within NC group:
- `nc_pools` (default route for group)
- `nc_pool_detail`
- `nc_pool_demand_lines`
- `nc_pool_rfq`
- `nc_pool_invite_inbox`

#### control_plane manifest

Added route `nc_pool_oversight` to existing `control_plane_operations` route group.

No new control-plane route group created; oversight is part of existing admin operations context.

## 5) Shell Navigation Changes

### 5.1) B2BShell (layouts/Shells.tsx)

Added NC section to desktop and mobile navigation menus using existing hasShellRoute pattern and active route highlighting.

NC navigation entries (in order):
1. **NC Pools** (`nc_pools`) — Primary entry point; full visibility
2. **Pool Detail** (`nc_pool_detail`) — Contextual; visible when pool selected
3. **Demand Lines** (`nc_pool_demand_lines`) — Contextual; visible when pool selected
4. **Pool RFQ** (`nc_pool_rfq`) — Contextual; visible when pool selected
5. **Supplier Invites** (`nc_pool_invite_inbox`) — Supplier-role specific; backend-blocked placeholder

Desktop nav structure:
- Section header: "Network Commerce"
- Individual buttons with emoji icons and active state highlighting
- Same styling as existing workspace operations (e.g., Orders, DPP)

Mobile nav structure:
- Conditional menu items using spread operator + hasShellRoute checks
- Same label and callback structure as existing nav items

### 5.2) SuperAdminShell (layouts/SuperAdminShell.tsx)

Added to `CONTROL_PLANE_NAV` constant:
- **NC Pool Oversight** (`nc_pool_oversight`) — Admin oversight surface

Placement: Operations-oriented segment (alongside Finance, Trades, Settlement Admin)
Icon: 💼 (briefcase)

Added to `AdminView` type union:
- `NC_POOL_OVERSIGHT` (for admin view routing)

## 6) App.tsx Route Handling

### 6.1) EXPERIENCE_VIEWS Extension

Added 5 NC experience view constants:
- `'NC_POOLS'`
- `'NC_POOL_DETAIL'`
- `'NC_POOL_DEMAND_LINES'`
- `'NC_POOL_RFQ'`
- `'NC_POOL_INVITE_INBOX'`

### 6.2) Tenant Experience Route Cases

Added 5 case handlers in the tenant experience switch statement (after `trades` case):

#### nc_pools
- Status: **ready** (foundation in place)
- Renders NetworkCommercePlaceholderSurface with description of pool registry
- onBack navigates to default manifest route

#### nc_pool_detail
- Status: **coming-soon** (awaiting FE-3)
- Renders placeholder describing pool configuration/membership
- onBack navigates to nc_pools

#### nc_pool_demand_lines
- Status: **coming-soon** (awaiting FE-4)
- Renders placeholder describing member demand aggregation
- onBack navigates to nc_pools

#### nc_pool_rfq
- Status: **coming-soon** (awaiting FE-5)
- Renders placeholder describing owner RFQ issuance
- onBack navigates to nc_pools

#### nc_pool_invite_inbox
- Status: **blocked** (backend supplier routes not yet implemented)
- Renders placeholder with "Backend Blocked" badge
- Explicitly states backend supplier route layer required
- onBack navigates to default manifest route

### 6.3) Control-Plane Oversight Route Case

Added case handler `nc_pool_oversight` (after `ttp_enrollment_admin` case):

- Status: **ready** (foundation in place)
- Renders NetworkCommercePlaceholderSurface with admin oversight description
- Read-only admin visibility of all tenant pools

## 7) Placeholder Component

### File Path
`components/Tenant/NetworkCommerce/NetworkCommercePlaceholderSurface.tsx`

### Props Interface
```typescript
export interface NetworkCommercePlaceholderSurfaceProps {
  title: string;
  description: string;
  status?: 'ready' | 'blocked' | 'coming-soon';
  blockedReason?: string;
  onBack?: () => void;
}
```

### Statuses Implemented

1. **ready** (blue):
   - Badge: "Foundation Ready"
   - Use case: nc_pools, nc_pool_oversight
   - Message: Foundation established; domain screens FE-3+

2. **coming-soon** (slate):
   - Badge: "Coming Soon"
   - Use case: nc_pool_detail, nc_pool_demand_lines, nc_pool_rfq
   - Message: Domain screens implemented in later FE packets

3. **blocked** (amber):
   - Badge: "Backend Blocked"
   - Use case: nc_pool_invite_inbox
   - Message: Backend supplier route handlers required; wired but deferred

### UI Elements

- Optional back button (onBack callback)
- Status badge with color-coded context
- Title and description text
- Status-specific content card explaining NC Phase 1 progress
- Feature gate status explanation

## 8) Feature-Gated UX Behavior

Implements FE-1 Strategy B: Backend-authoritative gates with frontend-aware UX continuity.

### Frontend Visibility
- NC routes appear in shell navigation when manifest permits
- No client-side NC flag hydration system added (deferred)
- Network Commerce entry visible regardless of backend gate state

### Backend Enforcement
- Backend feature gates remain source of truth
- Requests to backend NC routes return 503 FEATURE_DISABLED if gate disabled
- Placeholder surfaces inform users about feature gate state when encountered

### No New Systems Introduced
- No client-side flag service added
- No session bootstrap of NC feature state
- No conditional rendering based on client-side flag toggle
- Backend response-driven state changes only

Rationale: Full feature flag client system deferred to later packet. FE-2 uses placeholder messaging and backend 503 responses as continuity mechanism.

## 9) Role & Shell Behavior

### B2BShell (Tenant B2B Workspace)
- All 5 NC tenant routes appear in shell for B2B workspace tenants
- No role-specific hiding at shell level
- Supplier invite inbox visible to all roles; backend determines supplier-only access
- Role guard remains UX-shaping only; backend final authority

### SuperAdminShell (Control Plane)
- NC Pool Oversight appears only in control-plane shell (authRealm === 'CONTROL_PLANE')
- Not visible in tenant shells

### Shell Exclusion
- No NC routes added to B2CShell, WhiteLabelShell, WhiteLabelAdminShell (per FE-1)
- Phase 1 tenant-only and control-plane-only NC visibility

## 10) Validation Results

### TypeScript Compilation
```
pnpm run typecheck
→ ✅ PASS (no type errors in modified files)
```

### Runtime Descriptor Validation
```
✅ 6 new RuntimeLocalRouteKey entries compile
✅ network_commerce_pools RouteGroupKey added
✅ ROUTE_GROUP_CLASSIFICATIONS includes network_commerce_pools
✅ NETWORK_COMMERCE_ROUTE_GROUP defined with 5 routes
✅ B2B_SHELL_ROUTE_KEYS includes all 5 NC tenant keys
✅ CONTROL_PLANE_SHELL_ROUTE_KEYS includes nc_pool_oversight
✅ b2b_workspace manifest updated (allowedRouteGroups + routeGroups)
✅ control_plane manifest allows nc_pool_oversight routing
```

### Frontend Compilation
```
✅ App.tsx compiles with new route cases
✅ Shells.tsx compiles with NC nav entries
✅ SuperAdminShell.tsx compiles with NC oversight item
✅ NetworkCommercePlaceholderSurface.tsx compiles
✅ All imports resolve correctly
```

### Route Resolution
```
✅ All 6 NC route keys resolvable via descriptor
✅ B2BShell renders NC nav items for b2b_workspace
✅ SuperAdminShell renders NC oversight for control_plane
✅ App.tsx switch cases handle all 6 keys
✅ Placeholder surfaces render with correct status badges
```

## 11) Files Changed

### Modified Files
1. `runtime/sessionRuntimeDescriptor.ts`
   - Added 6 RuntimeLocalRouteKey entries
   - Added network_commerce_pools RouteGroupKey
   - Updated ROUTE_GROUP_CLASSIFICATIONS
   - Created NETWORK_COMMERCE_ROUTE_GROUP
   - Updated B2B_SHELL_ROUTE_KEYS (5 keys added)
   - Updated CONTROL_PLANE_SHELL_ROUTE_KEYS (1 key added)
   - Updated CONTROL_PLANE_ROUTE_GROUP (added nc_pool_oversight route)
   - Updated b2b_workspace manifest (allowedRouteGroups + routeGroups)

2. `layouts/Shells.tsx`
   - Updated B2BShell desktop nav (added NC section with 5 items)
   - Updated B2BShell mobile nav (added 5 NC menu items)

3. `layouts/SuperAdminShell.tsx`
   - Updated AdminView type union (added NC_POOL_OVERSIGHT)
   - Updated CONTROL_PLANE_NAV (added nc_pool_oversight item)

4. `App.tsx`
   - Added import: NetworkCommercePlaceholderSurface
   - Extended EXPERIENCE_VIEWS (5 NC views added)
   - Added 5 case handlers: nc_pools, nc_pool_detail, nc_pool_demand_lines, nc_pool_rfq, nc_pool_invite_inbox
   - Added 1 case handler: nc_pool_oversight (control-plane)

### New Files
1. `components/Tenant/NetworkCommerce/NetworkCommercePlaceholderSurface.tsx`
   - 95 lines
   - Exported component and interface
   - Supports 3 status states (ready/coming-soon/blocked)
   - Provides back navigation support

## 12) Confirmation: No Backend/Schema/Service Implementation

✅ **No backend files modified**: server/ directory untouched
✅ **No schema changes**: Prisma schema.prisma untouched
✅ **No migrations**: No migration files created or modified
✅ **No backend services created**: networkCommerceService.ts NOT created (deferred to FE-3)
✅ **No admin service created**: networkCommerceAdminService.ts NOT created (deferred to FE-3)
✅ **No backend routes changed**: server/src/routes/ untouched
✅ **No middleware changes**: server/src/middleware/ untouched
✅ **No API calls to NC endpoints**: All placeholders are static rendering
✅ **DPP HOLD keys preserved**: active_delivery_unit and dpp_launch_authorization unchanged

## 13) Known Limitations

### Supplier Invite Inbox Backend Blocking
- Supplier invite inbox route (`nc_pool_invite_inbox`) rendered as backend-blocked placeholder
- Rationale: Supplier-facing route handlers (`GET/POST /:poolId/rfq/:rfqId/invites/:inviteId/accept|decline`) not yet implemented at backend route layer
- Service methods exist (listSupplierInvites, viewInvite, acceptInvite, declineInvite) but route handlers missing
- UI is wired correctly; backend supplier routes required before FE-7 can activate full workflow

### Feature Flag Hydration Deferred
- No client-side feature flag state hydration system added
- FE-1 Strategy B (backend-authoritative) implemented using 503 responses + placeholder messaging
- Full flag system deferred to later packet when needed

### Domain UI Not Implemented
- Pool list/detail screens not implemented (FE-3)
- Demand line aggregation UI not implemented (FE-4)
- RFQ issuance UI not implemented (FE-5)
- Owner invite management UI not implemented (FE-6)
- Supplier invite workflows not implemented (FE-7)
- All deferred per FE-1 packet boundaries

## 14) Deferred for Later Packets

- **FE-3**: Pool owner list/detail UI + tenant service integration
- **FE-4**: Member demand-line UI
- **FE-5**: RFQ issue owner panel
- **FE-6**: Owner supplier invite UI
- **FE-7**: Supplier invite inbox/detail/accept/decline UI (blocked on backend supplier routes)
- **FE-8+**: Quote submission, award, settlement, and financial flows

## 15) Next Recommended Packet

**TEXQTIC-NC-FRONTEND-POOL-OWNER-LIST-DETAIL-001 (FE-3)**

Conditions for FE-3 opening:
- FE-2 verification complete (this packet)
- Explicit Paresh authorization required
- Backend NC routes (owner side) confirmed stable
- Network Commerce shell foundation confirmed navigable

## 16) Commit Information

**Commit message:**
```
feat(network-commerce): add frontend shell navigation foundation
```

**Files staged:**
- runtime/sessionRuntimeDescriptor.ts
- layouts/Shells.tsx
- layouts/SuperAdminShell.tsx
- App.tsx
- components/Tenant/NetworkCommerce/NetworkCommercePlaceholderSurface.tsx

**Commit scope:** FE-2 frontend shell/nav foundation only (no backend, no domain UI, no services)

**Atomic commit:** Yes (single logical unit: shell foundation + placeholder continuity)

## 17) Sign-Off

✅ FE-1 design authority (Section 17) fully implemented
✅ All 6 route keys added
✅ Route group created with correct classification
✅ Shell navigation wired for B2BShell and SuperAdminShell
✅ App.tsx route handling complete
✅ Placeholder surfaces render correctly
✅ No backend files modified
✅ No schema changes made
✅ No full domain UI implemented
✅ Supplier inbox correctly marked backend-blocked
✅ DPP HOLD keys preserved
✅ TypeScript compilation clean
✅ Atomic commit ready

**Status:** ✅ READY FOR COMMIT

## 18) Next Steps (Out of Scope for FE-2)

After commit:
1. Await Paresh authorization for FE-3
2. FE-3 will implement pool owner list/detail screens + tenant service integration
3. FE-4+ will follow with demand line, RFQ, invite, and settlement surfaces
4. FE-7 blocked on backend supplier route implementation
5. FE-12 will verify end-to-end NC Phase 1 completeness
