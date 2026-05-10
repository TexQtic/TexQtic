# TEXQTIC-NC-UIUX-REPO-TRUTH-AUDIT-001

## 1. Packet Metadata

| Field | Value |
|---|---|
| **Document ID** | TEXQTIC-NC-UIUX-REPO-TRUTH-AUDIT-001 |
| **Document Type** | AUDIT — READ-ONLY — NO IMPLEMENTATION |
| **Status** | VERIFIED_COMPLETE |
| **Version** | 1.0 |
| **Created** | 2026-05-31 |
| **Author** | Governance agent |
| **Authorized by** | Paresh Patel |
| **HEAD at audit time** | `a2699b2` — `feat(network-commerce): add supplier invite owner routes (NC Phase 1)` |
| **Audit scope** | Frontend (UI/UX) planning gap for Network Commerce Phase 1 CPP |
| **Active delivery unit** | HOLD_FOR_AUTHORIZATION (unchanged — not modified by this packet) |
| **DPP launch authorization** | HOLD_FOR_PARESH_DECISION (unchanged — not modified by this packet) |

### Governance Posture (DO NOT ALTER)

```yaml
active_delivery_unit: HOLD_FOR_AUTHORIZATION
dpp_launch_authorization: HOLD_FOR_PARESH_DECISION
```

### What This Document Is (and Is Not)

- ✅ A read-only audit of the frontend repo truth: what NC UI/UX surfaces exist, what is missing, and what planning is needed
- ✅ An authoritative reference for the frontend planning gap in Network Commerce Phase 1 CPP
- ✅ A forward backlog map of required frontend packets for NC Phase 1 and beyond
- ❌ NOT an authorization to implement any frontend code, route, component, service, API client, or test
- ❌ NOT a design document — it records findings; design decisions require a separate design packet
- ❌ Does NOT modify any implementation file, schema, migration, route, service, middleware, or test
- ❌ Does NOT open any frontend implementation packet
- ❌ Every future frontend packet requires explicit Paresh authorization and a fresh TECS opening

---

## 2. Executive Summary

**Finding: Zero Network Commerce UI/UX surfaces exist in the frontend codebase.**

At HEAD `a2699b2`, the backend has 17 implemented NC routes across 3 route files (`pools.ts`, `poolDemandLines.ts`, `poolRfq.ts`), covering Pool CRUD, Pool Demand Lines, Pool RFQ Issue, and Supplier Invite (owner routes). The frontend (`components/`, `services/`, `runtime/`) contains **no Network Commerce components, no NC API service file, no NC route keys, and no NC navigation entries**.

This is a planned gap — the tracker (`TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md`) never listed frontend surfaces in Phase 1A-1B. However, as the backend Phase 1B (Supplier Invite) route layer is now complete, the gap has become a delivery blocker: the backend is ahead of the frontend by at minimum 3 full surface areas (Pool Owner, Pool Member demand line submission, Supplier Invite inbox). Without a frontend, no end-to-end NC transaction can complete.

**Audit conclusion:** A frontend planning and design packet (`TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001`) must be authorized before any further NC backend route work can yield testable end-to-end value. This audit provides the findings that packet will require.

---

## 3. Why This Audit Was Opened

### Context

The Network Commerce implementation tracker (`TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md`) records 30 planned NC packets, all focused on backend schema, service, and route layers. Frontend surfaces are listed only as Phase 1A-10, B-7, B-8, B-9, C-7, C-8, C-9 — deferred slice labels with no design detail, no component plan, no API client plan, and no route architecture.

At HEAD `a2699b2`:
- Backend Phase 1A (CPP core) — IMPLEMENTED (7 pool routes, 5 demand line routes, 1 RFQ issue route)
- Backend Phase 1B (Supplier Invite owner routes) — IMPLEMENTED (4 invite owner routes)
- Backend Phase 1B (Supplier Invite supplier routes) — NOT_STARTED (HOLD_FOR_PARESH_DECISION)
- Frontend NC surfaces — **ZERO** (not designed, not started, not planned in detail)

### Opening Trigger

This audit was requested by Paresh Patel to close the planning gap before authorizing further backend or frontend work. The packet is audit-only and produces only governance documentation.

---

## 4. Repo-Truth Baseline

### 4.1 Working Tree at Audit Open

```
git status --short
?? vitest-invite-run.txt
?? vitest-regression-1.txt
?? vitest-regression-2.txt
?? vitest-regression-3.txt
```

**Result:** CLEAN (4 untracked temp files; no staged or modified tracked files).

### 4.2 HEAD Commit

```
a2699b2 (HEAD -> main, origin/main) feat(network-commerce): add supplier invite owner routes (NC Phase 1)
```

**Result: HEAD = `a2699b2` ✓**

### 4.3 Backend NC Route Inventory at HEAD

| # | Method | Path (under `/api/tenant/network-commerce`) | File | Status |
|---|---|---|---|---|
| 1 | POST | `/pools` | `pools.ts` | IMPLEMENTED |
| 2 | POST | `/pools/:poolId/open` | `pools.ts` | IMPLEMENTED |
| 3 | POST | `/pools/:poolId/join` | `pools.ts` | IMPLEMENTED |
| 4 | GET | `/pools` | `pools.ts` | IMPLEMENTED |
| 5 | GET | `/pools/joined` | `pools.ts` | IMPLEMENTED |
| 6 | GET | `/pools/:poolId` | `pools.ts` | IMPLEMENTED |
| 7 | GET | `/pools/:poolId/membership` | `pools.ts` | IMPLEMENTED |
| 8 | GET | `/pools/:poolId/demand-lines` | `poolDemandLines.ts` | IMPLEMENTED |
| 9 | POST | `/pools/:poolId/demand-lines` | `poolDemandLines.ts` | IMPLEMENTED |
| 10 | POST | `/pools/:poolId/demand-lines/lock-for-rfq` | `poolDemandLines.ts` | IMPLEMENTED |
| 11 | PATCH | `/pools/:poolId/demand-lines/:lineId` | `poolDemandLines.ts` | IMPLEMENTED |
| 12 | POST | `/pools/:poolId/demand-lines/:lineId/cancel` | `poolDemandLines.ts` | IMPLEMENTED |
| 13 | POST | `/pools/:poolId/rfq/issue` | `poolRfq.ts` | IMPLEMENTED |
| 14 | POST | `/pools/:poolId/rfq/:rfqId/invites` | `poolRfq.ts` | IMPLEMENTED (owner) |
| 15 | GET | `/pools/:poolId/rfq/:rfqId/invites` | `poolRfq.ts` | IMPLEMENTED (owner) |
| 16 | GET | `/pools/:poolId/rfq/:rfqId/invites/:inviteId` | `poolRfq.ts` | IMPLEMENTED (owner) |
| 17 | POST | `/pools/:poolId/rfq/:rfqId/invites/:inviteId/cancel` | `poolRfq.ts` | IMPLEMENTED (owner) |

**Total implemented NC backend routes: 17**

### 4.4 Frontend NC Surface Inventory at HEAD

| Area | Files Found | NC-Relevant Content |
|---|---|---|
| `components/Tenant/` | 22 files | **Zero** NC components |
| `components/ControlPlane/` | 30 files | **Zero** NC components; `FeatureFlags.tsx` manages all flags including future NC flags |
| `components/shared/` | 6 files | Generic shared components (EmptyState, LoadingState, etc.) |
| `services/` | 25 service files | **Zero** NC service file; no `networkCommerceService.ts` or equivalent |
| `runtime/sessionRuntimeDescriptor.ts` | Route manifest | **Zero** NC route keys in `RuntimeLocalRouteKey` union type |
| `App.tsx` | SPA root (~6000 lines) | **Zero** NC imports, NC view conditions, or NC navigation entries |

**Total NC frontend surfaces: 0**

---

## 5. Tracker Gap Confirmation

### 5.1 What the Tracker Records for Frontend

From `TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` §11 (Implementation Phases):

| Phase Slice | Frontend Entry | Status |
|---|---|---|
| Phase 1A-10 (implied) | "Pool admin oversight routes" in Control-Plane Routes | NOT_STARTED |
| Phase 2 / B-7 | Frontend (Tenant): Syndicate coordinator surface | NOT_STARTED |
| Phase 2 / B-8 | Frontend (Tenant): Syndicate member surface | NOT_STARTED |
| Phase 2 / B-9 | Frontend (Admin): Syndicate oversight panel | NOT_STARTED |
| Phase 3 / C-7 | Frontend (Tenant): VCO orchestrator surface | NOT_STARTED |
| Phase 3 / C-8 | Frontend (Tenant): Stage executor surface | NOT_STARTED |
| Phase 3 / C-9 | Frontend (Admin): VCO oversight panel | NOT_STARTED |

**Phase 1 frontend surfaces (Pool Owner, Pool Member, Supplier) are completely absent from the tracker.** The tracker's Phase 1 packet list (30 packets) includes zero frontend implementation packets. The Packet Tracker §12 contains no `TEXQTIC-NC-FRONTEND-*` entries.

### 5.2 Confirmed Gap

The tracker has a structural gap: all 17 implemented backend routes have zero corresponding frontend entry points. The gap covers:

1. **Pool Owner surfaces:** Create pool, open pool, list pools, view pool detail, issue RFQ, send supplier invites, view invite status, cancel invite
2. **Pool Member surfaces:** Join pool, submit demand line, edit demand line, cancel demand line, view pool summary
3. **Supplier surfaces:** View invite inbox (via invited supplier org), accept/decline invite (supplier route — not yet backend-implemented, but requires UI design now)
4. **Admin oversight surface:** NC-specific ControlPlane oversight panel for pool visibility across tenants

---

## 6. Existing Frontend Architecture Findings

### 6.1 SPA Architecture

TexQtic uses **Vite + React SPA** — confirmed. No file-based routing. All routing is managed in `App.tsx` via explicit `expView` / `adminView` view-key switches, controlled by the `runtime/sessionRuntimeDescriptor.ts` manifest system.

### 6.2 Route Manifest System

`sessionRuntimeDescriptor.ts` defines `RuntimeLocalRouteKey` — a union of string literals. Each route key maps to a `RuntimeLocalRouteDefinition` with `stateBinding` (`expView`, `adminView`). These are registered in the manifest (`RuntimeManifestEntry`) under `routeGroups`.

**NC impact:** Every NC tenant route surface must have a new `RuntimeLocalRouteKey` literal, a route definition, and a route group entry in the appropriate manifest. This requires editing `sessionRuntimeDescriptor.ts` — a high-impact file.

### 6.3 Shell Architecture

| Shell | Purpose | Manifests |
|---|---|---|
| `B2BShell` | Primary MSME tenant shell | `b2b_workspace` manifest |
| `AggregatorShell` | Aggregator workspace | `aggregator_workspace` manifest |
| `SuperAdminShell` | Control-plane admin | `control_plane` manifest |
| `WhiteLabelShell` | WL storefront | `wl_storefront` manifest |
| `WhiteLabelAdminShell` | WL admin | `wl_admin` manifest |

NC tenant surfaces (Pool Owner, Pool Member, Supplier Invite inbox) belong in `B2BShell` under the `b2b_workspace` manifest. NC admin oversight belongs in `SuperAdminShell` under `control_plane`.

### 6.4 API Client Architecture

The frontend uses a two-layer API client architecture:

| Layer | File | Usage |
|---|---|---|
| Core client | `services/apiClient.ts` | Raw HTTP (get/post/put/patch/del); handles auth headers, token injection, realm-aware errors |
| Tenant realm client | `services/tenantApiClient.ts` | Wraps core client; enforces `TENANT` realm + adds `X-Texqtic-Realm: tenant` header. Exports: `tenantGet`, `tenantPost`, `tenantPatch`, `tenantDel` |
| Admin realm client | `services/adminApiClient.ts` | Wraps core client; enforces `CONTROL_PLANE` realm. Exports: `adminGet`, `adminPost`, `adminPut`, `adminPatch`, `adminDelete` |

**NC impact:** A new `networkCommerceService.ts` (tenant-realm) will use `tenantGet`, `tenantPost`, `tenantPatch`. A new `networkCommerceAdminService.ts` (or extension of `controlPlaneService.ts`) will use `adminGet` for oversight panel data.

### 6.5 Feature Flag UI Architecture

`components/ControlPlane/FeatureFlags.tsx` reads all feature flags from the backend and renders a toggle list. It does not apply client-side feature gating to tenant UI surfaces. **There is no client-side NC feature gate pattern** — the backend gates via middleware (403 response); the frontend does not conditionally render NC surfaces based on tenant feature flags.

**NC impact:** Two design options for NC feature gating on the frontend:
1. **Backend-driven (current pattern):** Render NC navigation/surfaces unconditionally; backend returns 403 if flag is off; frontend shows error state. Simple but creates phantom navigation items for tenants without the flag.
2. **Client-side flag check:** Fetch tenant feature flag state on login; hide NC navigation items if flag is off. Requires a feature flag API client call during session initialization.

This decision must be made in `TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001`.

### 6.6 Role Guard Pattern

`App.tsx` does not use a generic `<PrivateRoute>` or `<RequireAuth>` wrapper component. Role checks are done inline in view-rendering switch logic: the `authenticatedRole` from the session descriptor controls which views are rendered. NC role guards (OWNER, MEMBER, NC_SUPPLIER) will follow this inline pattern.

### 6.7 State Management

No Redux or global state manager. React `useState`/`useEffect` at component level with service call patterns. Data fetching is done directly in component `useEffect` hooks calling service functions. Each surface is self-contained.

---

## 7. Existing Network Commerce Frontend Findings

**Finding: No Network Commerce frontend code exists at HEAD `a2699b2`.**

Confirmed by:
1. `grep_search` across all `.tsx` files for `network.commerce`, `procurement.pool`, `supplier.invite`, `demand.line`, `pool.rfq`, `NetworkCommerce`, `ProcurementPool` — **zero matches**
2. `grep_search` across all `.ts` files for same patterns — **zero matches** (only backend test files match)
3. `list_dir` of `components/Tenant/` — 22 files, none NC-related
4. `list_dir` of `components/ControlPlane/` — 30 files, none NC-related
5. `list_dir` of `services/` — 25 service files, no `networkCommerce*` file
6. `RuntimeLocalRouteKey` union in `sessionRuntimeDescriptor.ts` — no NC route keys present

There are no stubs, no placeholder components, no commented-out NC imports, and no NC-specific routing entries anywhere in the frontend codebase.

---

## 8. Required Phase 1 CPP UI/UX Surfaces (Pool Owner + Pool Member)

The following surfaces are required to enable end-to-end use of the 12 implemented Pool + DemandLine backend routes. These are grouped by actor role.

### 8.1 Pool Owner Surfaces (ADMIN or OWNER role)

| Surface | Actions | Backend Routes |
|---|---|---|
| **Pool List (owned)** | View all pools owned by the org | GET `/pools` |
| **Pool Create Form** | Create new pool (commodity category, target qty, qty unit, open/close dates) | POST `/pools` |
| **Pool Detail Panel** | View pool detail + current lifecycle state + membership count | GET `/pools/:poolId` |
| **Pool Open Action** | Transition DRAFT → OPEN | POST `/pools/:poolId/open` |
| **Pool Membership View** | View own membership in a pool (pool admin view) | GET `/pools/:poolId/membership` |
| **Demand Lines Panel (owner view)** | View all member demand lines for the pool | GET `/pools/:poolId/demand-lines` |
| **Lock for RFQ Action** | Trigger demand lock and CLOSED_FOR_BIDS transition | POST `/pools/:poolId/demand-lines/lock-for-rfq` |
| **RFQ Issue Panel** | Confirm aggregated demand; issue RFQ | POST `/pools/:poolId/rfq/issue` |
| **Supplier Invite Panel** | Send invite to supplier org; view invite list; cancel invite | POST/GET `/pools/:poolId/rfq/:rfqId/invites` + cancel |

### 8.2 Pool Member Surfaces (any authenticated MSME tenant)

| Surface | Actions | Backend Routes |
|---|---|---|
| **Pool Discovery / Join** | Browse available pools; join a pool | GET `/pools`, POST `/pools/:poolId/join` |
| **Joined Pool List** | View all pools joined | GET `/pools/joined` |
| **Pool Detail (member view)** | View pool detail; member-facing (no other member demand data) | GET `/pools/:poolId` |
| **Demand Line Submit Form** | Submit own demand line (qty, unit, spec, target date) | POST `/pools/:poolId/demand-lines` |
| **Demand Line Edit** | Update submitted demand line (pre-lock) | PATCH `/pools/:poolId/demand-lines/:lineId` |
| **Demand Line Cancel** | Cancel a submitted demand line | POST `/pools/:poolId/demand-lines/:lineId/cancel` |
| **Demand Lines List (own)** | View own demand lines for the pool | GET `/pools/:poolId/demand-lines` (filtered) |

---

## 9. Required Supplier Invite UI/UX Surfaces

The following surfaces are required once the Supplier Route layer is implemented (HOLD_FOR_PARESH_DECISION). The owner-side invite UI is also needed for the already-implemented owner routes.

### 9.1 Owner-Side Invite Management (backend: IMPLEMENTED)

| Surface | Actions | Backend Routes |
|---|---|---|
| **Invite Supplier Form** | Select supplier org; set expiry; add message | POST `/pools/:poolId/rfq/:rfqId/invites` |
| **Invite List Panel** | View all invites for an RFQ; filter by status | GET `/pools/:poolId/rfq/:rfqId/invites` |
| **Invite Detail View** | View single invite; status; supplier message | GET `/pools/:poolId/rfq/:rfqId/invites/:inviteId` |
| **Cancel Invite Action** | Cancel a PENDING invite with cancel reason | POST `/pools/:poolId/rfq/:rfqId/invites/:inviteId/cancel` |

### 9.2 Supplier-Side Invite Inbox (backend: NOT_STARTED — HOLD_FOR_PARESH_DECISION)

| Surface | Actions | Backend Routes (pending) |
|---|---|---|
| **Invite Inbox** | View all invites received by supplier org | GET (supplier route — not yet implemented) |
| **Invite Detail (supplier view)** | View RFQ spec (consolidated demand); invite terms | GET (supplier route — not yet implemented) |
| **Accept Invite Action** | Accept the invite | POST (supplier route — not yet implemented) |
| **Decline Invite Action** | Decline the invite with reason | POST (supplier route — not yet implemented) |

**Note:** Supplier-side UI design should begin in parallel with backend supplier route design — they are tightly coupled. Deferring supplier UI design until after backend implementation is not recommended.

---

## 10. Future OES/VCO UI/UX Surfaces

These surfaces are out of scope for Phase 1 but are recorded here for completeness of the planning picture.

### 10.1 OES (Phase 2 — B-7, B-8, B-9)

| Actor | Surface | Notes |
|---|---|---|
| Syndicate Coordinator | Syndicate create + lot definition + member invitation + delivery status | Phase 2 |
| Syndicate Member | Lot bid/accept + execution tracking + quality gate response | Phase 2 |
| Platform Admin | Syndicate oversight panel (ControlPlane) | Phase 2 |

### 10.2 VCO (Phase 3 — C-7, C-8, C-9)

| Actor | Surface | Notes |
|---|---|---|
| VCO Orchestrator | Chain definition + stage assignment + traceability view + DPP progress | Phase 3 |
| Stage Executor | Stage input/output + quality gate + handoff confirmation | Phase 3 |
| Platform Admin | VCO chain oversight panel (ControlPlane) | Phase 3 |

---

## 11. Backend-to-Frontend Dependency Map

The following table maps each implemented backend route to its required frontend entry point. "UI Status" reflects the current state.

| Backend Route | Required Frontend Surface | UI Status | Blocking? |
|---|---|---|---|
| POST `/pools` | Pool Create Form | NOT_STARTED | Yes — no way to create a pool |
| GET `/pools` | Pool List | NOT_STARTED | Yes — no pool visibility |
| POST `/pools/:poolId/open` | Pool Open Action (in Pool Detail) | NOT_STARTED | Yes |
| GET `/pools/:poolId` | Pool Detail Panel | NOT_STARTED | Yes |
| POST `/pools/:poolId/join` | Pool Join Action | NOT_STARTED | Yes |
| GET `/pools/joined` | Joined Pool List (member) | NOT_STARTED | Yes |
| GET `/pools/:poolId/membership` | Membership view (owner) | NOT_STARTED | Yes |
| GET `/pools/:poolId/demand-lines` | Demand Lines Panel | NOT_STARTED | Yes |
| POST `/pools/:poolId/demand-lines` | Demand Line Submit Form | NOT_STARTED | Yes |
| PATCH `/pools/:poolId/demand-lines/:lineId` | Demand Line Edit | NOT_STARTED | Yes |
| POST `/pools/:poolId/demand-lines/:lineId/cancel` | Demand Line Cancel Action | NOT_STARTED | Yes |
| POST `/pools/:poolId/demand-lines/lock-for-rfq` | Lock for RFQ Action | NOT_STARTED | Yes |
| POST `/pools/:poolId/rfq/issue` | RFQ Issue Panel | NOT_STARTED | Yes |
| POST `/pools/:poolId/rfq/:rfqId/invites` | Invite Supplier Form | NOT_STARTED | Yes |
| GET `/pools/:poolId/rfq/:rfqId/invites` | Invite List Panel | NOT_STARTED | Yes |
| GET `/pools/:poolId/rfq/:rfqId/invites/:inviteId` | Invite Detail View | NOT_STARTED | Yes |
| POST `/pools/:poolId/rfq/:rfqId/invites/:inviteId/cancel` | Cancel Invite Action | NOT_STARTED | Yes |

**All 17 implemented backend routes have no frontend entry point. The NC backend is entirely dark from the user perspective.**

---

## 12. UI Privacy / Non-Leak Rules

The following rules govern what NC data may be displayed on each UI surface. These derive from Foundation §9 (Tenant Isolation & Visibility Rules) and must be enforced by the frontend service layer — not just relied upon from the backend.

| Rule | Surface | Requirement |
|---|---|---|
| **UI-PRIV-1** | Pool Detail (member view) | Show own demand line only; show pool aggregate totals only; never show other members' individual demand data |
| **UI-PRIV-2** | Invite Supplier Form | Show only the consolidated RFQ spec to supplier; never show individual member breakdown |
| **UI-PRIV-3** | Demand Lines Panel (owner view) | Pool admin may see all member demand lines; this is an explicit cross-org read — display must clearly identify source org |
| **UI-PRIV-4** | Supplier Invite Inbox | Supplier sees only invites addressed to their own org; never sees invites to other supplier orgs |
| **UI-PRIV-5** | Settlement / Invoice surfaces | Read-only audit/reporting. No action elements that imply money movement, platform-held funds, or direct withdrawal. (Finance Doctrine) |
| **UI-PRIV-6** | ControlPlane NC Oversight | Admin sees cross-tenant pool data; must clearly separate tenant contexts in UI (tenant name always displayed) |

---

## 13. Feature-Gated UX Rules

NC feature gating must be respected at the UI layer. The following rules apply:

| Rule | Description | Implementation Guidance |
|---|---|---|
| **FG-1** | NC Pool surfaces require `nc.procurement_pools.enabled = true` for the tenant | Navigation item hidden or disabled when flag is off; or backend 403 gracefully handled |
| **FG-2** | NC RFQ surfaces require `nc.procurement_pools.rfq.enabled = true` for the tenant | Nested within Pool surface; hide RFQ actions when flag is off |
| **FG-3** | NC Supplier Invite surfaces require `nc.procurement_pools.supplier_invites.enabled = true` | Hide invite actions on RFQ panel when flag is off |
| **FG-4** | Flag state must be resolved at session load time for navigation rendering | Fetch tenant feature overrides during auth/onboarding; cache in session context |
| **FG-5** | Backend 403 from feature gate must display a clear "Feature not available" UI state, not a generic error | Frontend must distinguish 403 (auth failure) from 403 (feature gate) via error code in response body |
| **FG-6** | Admin oversight panel is not feature-gated; platform admins always see pool data | No flag check required for ControlPlane NC routes |

---

## 14. Recommended Frontend Route Architecture

Based on the existing `sessionRuntimeDescriptor.ts` pattern, the following route keys and groups are recommended for NC Phase 1. These are recommendations only — final design requires `TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001`.

### 14.1 New RuntimeLocalRouteKey entries (recommended)

```typescript
// NC Pool Owner surfaces
| 'nc_pools'                   // Pool list (owned + joined)
| 'nc_pool_detail'             // Pool detail (owner + member view)
| 'nc_pool_demand_lines'       // Demand line management
| 'nc_pool_rfq'                // RFQ issue + invite management
| 'nc_pool_invite_inbox'       // Supplier invite inbox (supplier role)

// NC Admin surfaces
| 'nc_pool_oversight'          // ControlPlane: cross-tenant pool overview
```

### 14.2 New RouteGroupKey entry (recommended)

```typescript
| 'network_commerce_pools'     // Feature-gated group (requires nc.procurement_pools.enabled)
```

### 14.3 Route Group Classification

`'network_commerce_pools'` → classification: `'feature-gated'`

This aligns with the `RouteGroupClassification` type and signals to the shell that this group requires a feature check before rendering its navigation items.

### 14.4 Manifest Assignment

NC pool surfaces → `b2b_workspace` manifest (B2B tenant shell).
NC admin oversight → `control_plane` manifest (SuperAdmin shell).

---

## 15. Recommended Component Architecture

Based on existing `components/Tenant/` patterns (surface panels with internal state, direct service calls in `useEffect`), the following component structure is recommended for NC Phase 1.

### 15.1 Recommended New Component Files

| File | Shell | Purpose |
|---|---|---|
| `components/Tenant/NetworkCommerce/PoolListSurface.tsx` | B2BShell | Pool list (owned + joined tabs) |
| `components/Tenant/NetworkCommerce/PoolDetailSurface.tsx` | B2BShell | Pool detail; role-aware (owner vs. member views) |
| `components/Tenant/NetworkCommerce/DemandLineSurface.tsx` | B2BShell | Demand line list + create/edit/cancel |
| `components/Tenant/NetworkCommerce/PoolRfqSurface.tsx` | B2BShell | RFQ issue panel + supplier invite management (owner) |
| `components/Tenant/NetworkCommerce/SupplierInviteInbox.tsx` | B2BShell | Supplier invite inbox + accept/decline (supplier) |
| `components/ControlPlane/NetworkCommerceOversight.tsx` | SuperAdminShell | Cross-tenant pool oversight (admin) |

### 15.2 Subdirectory Pattern

Creation of `components/Tenant/NetworkCommerce/` as a subdirectory follows the existing pattern used implicitly by related surface groupings (e.g., Cart has `components/Cart/`). This keeps NC components isolated and avoids polluting the flat `components/Tenant/` listing.

### 15.3 Shared Utilities

NC components will reuse `components/shared/`:
- `EmptyState.tsx` — "No pools found" state
- `LoadingState.tsx` — Async data fetch loading
- `ErrorState.tsx` / `ErrorBoundary.tsx` — 403 feature gate error + generic error handling

---

## 16. API Integration Strategy

### 16.1 New Service File Required

A new `services/networkCommerceService.ts` must be created. It will follow the existing pattern of domain-specific service files (`escrowService.ts`, `certificationService.ts`, etc.) using `tenantGet`, `tenantPost`, `tenantPatch` from `tenantApiClient.ts`.

### 16.2 Recommended Service Function Groups

```typescript
// Pool functions
createPool(input): Promise<NetworkPoolResponse>
openPool(poolId): Promise<NetworkPoolResponse>
joinPool(poolId): Promise<NetworkPoolMembershipResponse>
listOwnedPools(): Promise<NetworkPoolListResponse>
listJoinedPools(): Promise<NetworkPoolListResponse>
getPoolDetail(poolId): Promise<NetworkPoolDetailResponse>
getPoolMembership(poolId): Promise<NetworkPoolMembershipResponse>

// Demand line functions
listDemandLines(poolId): Promise<DemandLineListResponse>
createDemandLine(poolId, input): Promise<DemandLineResponse>
updateDemandLine(poolId, lineId, input): Promise<DemandLineResponse>
cancelDemandLine(poolId, lineId): Promise<DemandLineResponse>
lockDemandLinesForRfq(poolId): Promise<LockForRfqResponse>

// RFQ functions
issueRfq(poolId, input): Promise<PoolRfqResponse>

// Invite functions (owner)
sendSupplierInvite(poolId, rfqId, input): Promise<SupplierInviteResponse>
listSupplierInvites(poolId, rfqId): Promise<SupplierInviteListResponse>
getSupplierInvite(poolId, rfqId, inviteId): Promise<SupplierInviteResponse>
cancelSupplierInvite(poolId, rfqId, inviteId, input): Promise<SupplierInviteResponse>

// Invite functions (supplier — pending backend implementation)
listIncomingInvites(): Promise<SupplierInviteListResponse>
viewIncomingInvite(inviteId): Promise<SupplierInviteResponse>
acceptInvite(inviteId): Promise<SupplierInviteResponse>
declineInvite(inviteId, input): Promise<SupplierInviteResponse>
```

### 16.3 TypeScript Response Types

All response types must be defined in `networkCommerceService.ts` (following `catalogService.ts` pattern of co-locating types with service functions). No separate `networkCommerceTypes.ts` unless the type surface becomes very large.

### 16.4 Admin Service Extension

Admin NC oversight will either:
- Extend `controlPlaneService.ts` with NC functions using `adminGet`
- Or create `networkCommerceAdminService.ts`

Decision deferred to `TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001`.

---

## 17. Frontend Validation / Production Verification Strategy

### 17.1 Required Validation Bands for Each NC Frontend Packet

| Band | Command | When Required |
|---|---|---|
| **FV-1 — TypeScript (frontend)** | `pnpm --filter frontend tsc --noEmit` (or project-root equivalent) | Every NC frontend packet |
| **FV-2 — ESLint (frontend)** | `pnpm --filter frontend lint` | Every NC frontend packet |
| **FV-3 — Unit tests (if applicable)** | `pnpm --filter frontend test` (Vitest frontend config) | If component unit tests are added |
| **FV-4 — Runtime render check** | Browser smoke test: navigate to NC surface; confirm render without crash | Every NC route/component packet |
| **FV-5 — Feature gate verification** | With flag OFF: NC nav absent or 403 handled; with flag ON: NC surface renders | Every feature-gated NC surface packet |
| **FV-6 — Role guard verification** | With OWNER role: owner actions present; with MEMBER role: owner actions absent | Every role-sensitive surface |
| **FV-7 — Backend health** | `curl -i http://localhost:3001/health` → 200; NC route smoke test | Every NC frontend packet (server must be running) |

### 17.2 Playwright E2E Consideration

The repo has `playwright.config.ts` and a `tests/` directory. NC E2E tests (full flow: create pool → join → submit demand line → lock → issue RFQ → send invite) should be planned as a dedicated verification packet: `TEXQTIC-NC-FRONTEND-PROD-VERIFY-GOV-CLOSE-001`.

---

## 18. Proposed Frontend Packet Backlog

The following 12 packets are recommended to close the NC frontend planning and implementation gap. Each packet requires explicit Paresh authorization before opening. None are authorized by this audit document.

| # | Packet ID | Type | Scope | Prerequisites |
|---|---|---|---|---|
| FE-1 | **TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001** | Design | NC frontend architecture: route manifest design, feature gating strategy, component architecture, API service design, role guard patterns, shell assignment decisions | This audit complete |
| FE-2 | **TEXQTIC-NC-FRONTEND-SHELL-NAV-FEATURE-GATE-001** | Implementation | Add NC route keys to `sessionRuntimeDescriptor.ts`; add NC nav items to `B2BShell`; feature gate hook (or backend-driven 403 pattern) | FE-1 design complete |
| FE-3 | **TEXQTIC-NC-FRONTEND-POOL-OWNER-LIST-DETAIL-001** | Implementation | Pool list + pool detail surfaces (owner view); `PoolListSurface.tsx`, `PoolDetailSurface.tsx`; NC service functions: createPool, openPool, getPoolDetail, listOwnedPools | FE-2 complete |
| FE-4 | **TEXQTIC-NC-FRONTEND-POOL-MEMBER-DEMAND-LINES-001** | Implementation | Pool member join + demand line surfaces; member view of pool detail; `DemandLineSurface.tsx`; service: joinPool, listJoinedPools, createDemandLine, updateDemandLine, cancelDemandLine, lockDemandLinesForRfq | FE-3 complete (parallel candidate with FE-3) |
| FE-5 | **TEXQTIC-NC-FRONTEND-RFQ-ISSUE-PANEL-001** | Implementation | RFQ issue panel; `PoolRfqSurface.tsx` (partial); service: issueRfq, listDemandLines (owner view pre-lock) | FE-4 complete |
| FE-6 | **TEXQTIC-NC-FRONTEND-SUPPLIER-INVITE-OWNER-UI-001** | Implementation | Supplier invite owner UI: send invite form, invite list, invite detail, cancel invite; `PoolRfqSurface.tsx` (extend); service: sendSupplierInvite, listSupplierInvites, getSupplierInvite, cancelSupplierInvite | FE-5 complete; Backend owner routes IMPLEMENTED ✅ |
| FE-7 | **TEXQTIC-NC-FRONTEND-SUPPLIER-INVITE-SUPPLIER-INBOX-001** | Implementation | Supplier invite inbox; `SupplierInviteInbox.tsx`; service: listIncomingInvites, viewIncomingInvite | FE-6 complete; Backend supplier list/view routes REQUIRED (HOLD_FOR_PARESH_DECISION) |
| FE-8 | **TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001** | Implementation | Supplier quote submission UI; quote form; service: submitQuote | FE-7 complete; Backend quote route REQUIRED (NOT_STARTED) |
| FE-9 | **TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001** | Implementation | Pool owner quote review + accept/reject; allocation display; service: acceptQuote, rejectQuote | FE-8 complete; Backend award routes REQUIRED (NOT_STARTED) |
| FE-10 | **TEXQTIC-NC-FRONTEND-ORDER-INVOICE-SETTLEMENT-UI-001** | Implementation | Pool order trigger; NC invoice view; settlement preview (read-only); finance doctrine enforced | FE-9 complete; Backend order/invoice/settle routes REQUIRED (NOT_STARTED) |
| FE-11 | **TEXQTIC-NC-FRONTEND-ADMIN-PROVISIONING-OVERSIGHT-001** | Implementation | ControlPlane NC oversight panel; `NetworkCommerceOversight.tsx`; cross-tenant pool visibility; admin service functions | FE-2 complete (parallel candidate with FE-3 after nav shell established) |
| FE-12 | **TEXQTIC-NC-FRONTEND-PROD-VERIFY-GOV-CLOSE-001** | Verify+Close | Full NC Phase 1 end-to-end Playwright test suite; governance close; OPEN-SET + GOVERNANCE-CHANGELOG sync | FE-10 + FE-11 complete |

### Packet Dependencies Summary

```
This Audit (TEXQTIC-NC-UIUX-REPO-TRUTH-AUDIT-001)
    └── FE-1: TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001 (design)
            └── FE-2: TEXQTIC-NC-FRONTEND-SHELL-NAV-FEATURE-GATE-001
                    ├── FE-3: TEXQTIC-NC-FRONTEND-POOL-OWNER-LIST-DETAIL-001
                    │       └── FE-4: TEXQTIC-NC-FRONTEND-POOL-MEMBER-DEMAND-LINES-001
                    │               └── FE-5: TEXQTIC-NC-FRONTEND-RFQ-ISSUE-PANEL-001
                    │                       └── FE-6: TEXQTIC-NC-FRONTEND-SUPPLIER-INVITE-OWNER-UI-001
                    │                               └── FE-7: TEXQTIC-NC-FRONTEND-SUPPLIER-INVITE-SUPPLIER-INBOX-001 (needs backend)
                    │                                       └── FE-8: TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001 (needs backend)
                    │                                               └── FE-9: TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001 (needs backend)
                    │                                                       └── FE-10: TEXQTIC-NC-FRONTEND-ORDER-INVOICE-SETTLEMENT-UI-001 (needs backend)
                    │                                                               └── FE-12: TEXQTIC-NC-FRONTEND-PROD-VERIFY-GOV-CLOSE-001
                    └── FE-11: TEXQTIC-NC-FRONTEND-ADMIN-PROVISIONING-OVERSIGHT-001 (parallel after FE-2)
```

---

## 19. Recommended Tracker Addendum Scope

The following additions to `TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` are recommended but NOT made by this packet (tracker updates require a separate governance-sync packet per DPR-6):

1. **Frontend track added to §4 (Current Implementation Baseline):** New rows for each NC frontend surface track (all NOT_STARTED)
2. **Frontend packets added to §12 (Packet Tracker):** FE-1 through FE-12 entries with status NOT_STARTED/HOLD_FOR_PARESH_DECISION
3. **Phase 1A-10 frontend row in §11 (Implementation Phases):** Expand to list specific Phase 1 frontend slices
4. **Frontend validation band (FV-1..FV-7) added to §15 (Validation and Test Strategy)**

These additions should be made in a dedicated `TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-FRONTEND-ADDENDUM-001` packet — which is listed as the immediate next candidate if the recommendation in §20 is followed.

---

## 20. Continue-vs-Pause Recommendation

### Situation

At HEAD `a2699b2`:
- Backend Phase 1A (CPP core + demand lines + RFQ issue): IMPLEMENTED — 13 routes
- Backend Phase 1B (Supplier Invite owner routes): IMPLEMENTED — 4 routes
- Backend Phase 1B (Supplier Invite supplier routes): NOT_STARTED — HOLD_FOR_PARESH_DECISION
- Frontend NC: ZERO surfaces — not started, not designed, not planned in detail

### Options

#### Option A — Pause Backend; Prioritize Frontend Design + Shell Foundation

**Recommended.**

1. Authorize `TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001` (design only — no code)
2. Authorize `TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-FRONTEND-ADDENDUM-001` (tracker update only)
3. Authorize `TEXQTIC-NC-FRONTEND-SHELL-NAV-FEATURE-GATE-001` (shell + nav + route manifest)
4. Authorize `TEXQTIC-NC-FRONTEND-POOL-OWNER-LIST-DETAIL-001` (first tangible NC frontend)
5. **While above is in progress:** authorize backend supplier route packet if Paresh decides to unblock Phase 1B

**Rationale:** Without frontend, the backend is untestable by any human user. The NC feature has zero visible surface. Investing in backend supplier routes before any frontend exists adds depth to an invisible feature. Building the shell foundation first enables parallel progress: backend and frontend can advance simultaneously, converging at FE-7 (supplier inbox requires both backend supplier routes and frontend).

#### Option B — Continue Backend First; Authorize Supplier Route Packet

Continue with `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-ROUTE-001` before any frontend work. Frontend remains at zero until backend Phase 1B (supplier route) is also complete.

**Risk:** Continued backend investment with zero frontend means the feature remains entirely invisible. The gap widens. When frontend work eventually begins, more backend surface must be wired simultaneously.

#### Option C — Simultaneous Backend + Frontend Authorization

Authorize both supplier route packet AND frontend design packet in the same decision. Backend and frontend advance in parallel tracks.

**Feasible** but requires careful packet coordination to avoid frontend depending on backend routes not yet implemented. Sequencing must be explicit.

### Recommendation

**Option A** — Pause new backend route work; authorize frontend design and shell foundation first. This produces the earliest visible NC surface and enables parallel convergence. Backend supplier routes can be authorized in parallel or immediately after the shell foundation packet lands.

---

## 21. Non-Authorization Statement

This document is a read-only audit. It does **not** authorize any of the following:

- Implementation of any frontend component, route, service, API client, or test
- Modification of `sessionRuntimeDescriptor.ts`, `App.tsx`, `services/`, or any frontend file
- Implementation of any backend route, service, schema, migration, or middleware
- Opening of any packet listed in §18 or §19
- Modification of `TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md`
- Alteration of `active_delivery_unit` or `dpp_launch_authorization` governance posture

All items in §18 (Packet Backlog) and §19 (Tracker Addendum) require explicit Paresh Patel authorization and a fresh TECS opening before any implementation may begin.

---

## 22. Files Changed by This Packet

This audit packet modifies only governance documentation files:

| File | Change |
|---|---|
| `governance/TEXQTIC-NC-UIUX-REPO-TRUTH-AUDIT-001.md` | NEW — this audit document |
| `governance/control/OPEN-SET.md` | Updated: Last Updated timestamp + Operating Note prepended |
| `governance/control/GOVERNANCE-CHANGELOG.md` | Updated: new entry prepended |
| `governance/control/NEXT-ACTION.md` | NOT modified (governance posture unchanged) |

**Total files changed: 3** (1 new, 2 updated).

No implementation files, frontend files, backend files, schema, migrations, services, routes, middleware, tests, or package scripts were modified.
