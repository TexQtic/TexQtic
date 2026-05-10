# TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001

## 1) Metadata

- Unit: TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001
- Type: Design Authority (Frontend/UIUX Foundation)
- Scope: Network Commerce Phase 1 frontend authority baseline
- Mode: Planning/Governance only
- Status: VERIFIED_COMPLETE (design artifact only)
- Date: 2026-05-31
- Basis:
  - governance/TEXQTIC-NC-UIUX-REPO-TRUTH-AUDIT-001.md
  - governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-FRONTEND-ADDENDUM-001.md
  - governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md
  - runtime/sessionRuntimeDescriptor.ts
  - layouts/Shells.tsx
  - layouts/SuperAdminShell.tsx
  - services/tenantApiClient.ts
  - services/adminApiClient.ts
  - services/controlPlaneService.ts
  - server/src/routes/tenant/poolRfq.ts
  - server/src/services/networkPoolRfq.service.ts
  - server/src/middleware/ncPoolFeatureGate.middleware.ts
  - server/src/middleware/ncPoolRfqFeatureGate.middleware.ts
  - server/src/middleware/ncPoolSupplierInviteFeatureGate.middleware.ts
- DPP posture: HOLD_FOR_PARESH_DECISION (unchanged)
- Active delivery posture: HOLD_FOR_AUTHORIZATION (unchanged)

## 2) Executive Summary

This packet establishes the definitive frontend/UIUX foundation for Network Commerce Phase 1 with no implementation changes. It converts audit/addendum recommendations into binding frontend design authority for FE-2 through FE-12, including route manifest strategy, shell ownership, component architecture, tenant/admin service boundaries, feature-gate UX behavior, role guard patterns, privacy rules, and FE-2 readiness gates.

Primary decision outcome:
- FE-2 is design-ready and may be opened only upon explicit authorization.
- Supplier-facing invite inbox UI remains backend-blocked at route layer and is therefore phased as deferred-ready, not executable in FE-2.

## 3) Authority and Baseline

This document is authoritative for NC Phase 1 frontend foundation decisions and supersedes provisional language in the frontend addendum where ambiguity existed.

Binding baseline facts:
- Runtime routing is centralized in runtime/sessionRuntimeDescriptor.ts via RouteManifestKey, RouteGroupKey, RuntimeLocalRouteKey, and route group registrations.
- B2B workspace shell navigation is controlled by B2BShell route key visibility logic.
- Control plane shell navigation is controlled by SuperAdminShell route key visibility logic.
- Tenant APIs must use tenantApiClient helpers and tenant realm header semantics.
- Control-plane APIs must use adminApiClient helpers and control realm header semantics.
- Existing backend feature gates return FEATURE_DISABLED and 503 when disabled.

## 4) Frontend Findings (Repo Truth)

- No dedicated NC pool UI component subtree currently exists under components/Tenant/NetworkCommerce.
- No dedicated NC frontend service file currently exists for pool/demand/RFQ/invite flows.
- Runtime manifest currently has no NC-specific route keys or NC-specific route group.
- B2BShell currently has no NC-specific navigation entries.
- SuperAdminShell currently has no NC-specific network-commerce oversight navigation entry.
- Existing app routing and shells prove that runtime-descriptor-driven insertion is the canonical integration path.

## 5) Backend Truth and Constraints

Implemented and available:
- Pool/RFQ owner-side route infrastructure exists under tenant routes.
- Owner supplier invite routes are implemented in server/src/routes/tenant/poolRfq.ts.
- Supplier invite domain methods exist in service layer:
  - listSupplierInvites
  - viewInvite
  - acceptInvite
  - declineInvite
- Feature gates exist:
  - nc.procurement_pools.enabled
  - nc.procurement_pools.rfq.enabled
  - nc.procurement_pools.supplier_invites.enabled

Not yet implemented at route layer:
- Supplier-facing invite route handlers corresponding to supplier inbox/detail/accept/decline are not present in tenant route layer.

Design implication:
- FE supplier inbox/detail/action surfaces must remain deferred-blocked until backend supplier routes are authorized and implemented.

## 6) Route Decision (Definitive)

Approved RuntimeLocalRouteKey additions:
- nc_pools
- nc_pool_detail
- nc_pool_demand_lines
- nc_pool_rfq
- nc_pool_invite_inbox
- nc_pool_oversight

Approved RouteGroupKey addition:
- network_commerce_pools

Approved RouteGroup classification:
- network_commerce_pools => feature-gated

Manifest placement:
- b2b_workspace manifest:
  - nc_pools
  - nc_pool_detail
  - nc_pool_demand_lines
  - nc_pool_rfq
  - nc_pool_invite_inbox
- control_plane manifest:
  - nc_pool_oversight

Default behavior:
- network_commerce_pools default route: nc_pools
- No NC route keys are added to b2c_storefront, wl_storefront, or wl_admin manifests in Phase 1.

## 7) Shell and Navigation Decision (Definitive)

B2BShell:
- Add NC section entries in this order:
  - NC Pools (nc_pools)
  - Pool Detail (nc_pool_detail; hidden unless pool selected/navigation context exists)
  - Demand Lines (nc_pool_demand_lines; hidden unless pool selected)
  - Pool RFQ (nc_pool_rfq; hidden unless pool selected)
  - Supplier Invite Inbox (nc_pool_invite_inbox; shown only for supplier-role sessions and gate-eligible contexts)
- NC items must use the same hasShellRoute and active route highlighting patterns as existing entries.

SuperAdminShell:
- Add NC Oversight nav item (nc_pool_oversight) in operations-oriented segment.

Shell exclusion:
- No NC nav entries in B2CShell, WhiteLabelShell, or WhiteLabelAdminShell in Phase 1.

## 8) Component Decision (Definitive)

Approved component structure:
- components/Tenant/NetworkCommerce/PoolListSurface.tsx
- components/Tenant/NetworkCommerce/PoolDetailSurface.tsx
- components/Tenant/NetworkCommerce/DemandLineSurface.tsx
- components/Tenant/NetworkCommerce/PoolRfqSurface.tsx
- components/Tenant/NetworkCommerce/SupplierInviteInbox.tsx
- components/ControlPlane/NetworkCommerceOversight.tsx

Composition rules:
- Surfaces are orchestration-first and consume service-layer DTOs directly where safe.
- Shared loading/empty/error primitives should be reused from components/shared.
- No cross-domain data mutation widgets are introduced beyond NC scope.

## 9) Tenant API Service Decision (Definitive)

Approved file:
- services/networkCommerceService.ts

Approved client boundary:
- Must use tenantGet/tenantPost/tenantPatch from services/tenantApiClient.ts only.

Approved function groups:
- Pools: create/open/join/list-owned/list-joined/get-detail/get-membership
- Demand lines: list/create/update/cancel/lock-for-rfq
- RFQ: issue
- Owner invite: send/list/get/cancel
- Supplier invite: list/view/accept/decline (implemented client signatures may exist before backend route readiness, but call sites must remain gated)

Error handling contract:
- Preserve APIError semantics and code-level handling.
- FEATURE_DISABLED must be handled as product-state gating, not generic auth failure.

## 10) Admin Service Decision (Definitive)

Approved file:
- services/networkCommerceAdminService.ts

Client boundary:
- Must use adminGet/adminPost/adminPatch (adminApiClient realm discipline).

Reason for dedicated file:
- Keep NC oversight boundaries explicit and avoid overloading services/controlPlaneService.ts.
- Maintain clear domain separation between generic control plane concerns and NC-specific oversight APIs.

## 11) Feature-Gating Decision (Choose A/B/C)

Chosen strategy: B (Backend-authoritative gates with frontend-aware UX continuity)

Definition:
- Backend remains source of truth for gate enforcement.
- Frontend performs optional gate-aware UX shaping for discoverability and clarity.
- Any backend FEATURE_DISABLED response is treated as canonical and surfaced with explicit disabled messaging.

Rules:
- FG-B1: Never rely solely on client-side hiding for enforcement.
- FG-B2: Client may hide or disable entry actions if gate state is known.
- FG-B3: If unknown/stale client gate state, allow navigation but render backend-driven disabled state on response.
- FG-B4: FEATURE_DISABLED and 503 with gate code map to user-facing disabled-state copy, not retry spam.

## 12) Role Guard Decision (Definitive)

Frontend role posture:
- Owner/Admin experience:
  - Full pool owner workflows where backend routes exist.
- Member experience:
  - Member-safe pool detail and demand-line scoped workflows only.
- Supplier experience:
  - Supplier invite inbox/detail/accept/decline UI remains blocked until supplier route layer is implemented.
- Control plane admins:
  - NC oversight read surfaces through control_plane manifest.

Guarding principle:
- Frontend role gating is UX-level shaping only.
- Backend authorization remains final authority for all protected actions.

## 13) Privacy Contract (Definitive)

The following UI privacy constraints are mandatory:
- UI-PRIV-1: Member view shows own demand lines only; pooled aggregate totals are allowed.
- UI-PRIV-2: Supplier invite UI must expose consolidated RFQ-level information only.
- UI-PRIV-3: Owner/admin views may show multi-member demand breakdown with explicit org labeling.
- UI-PRIV-4: Supplier inbox can only display invites addressed to supplier org context.
- UI-PRIV-5: Finance-adjacent NC surfaces remain read-only; no money-movement affordances.
- UI-PRIV-6: Control-plane oversight must always carry explicit tenant context labels.
- UI-PRIV-7: Internal metadata fields (for example metadataInternalJson) must never be rendered.

## 14) UI State Model (Definitive)

State model layers:
- Session/descriptor layer:
  - routeManifestKey
  - localRouteSelection
  - shellNavigationSurface
- Domain view state per NC surface:
  - loading
  - error
  - empty
  - data
  - action-in-flight
- Context anchors:
  - selectedPoolId
  - selectedRfqId
  - selectedInviteId

Continuity rules:
- Route keys own top-level view switching.
- Selection anchors are reset only when parent context changes.
- Error state copy must distinguish:
  - feature disabled
  - forbidden
  - not found
  - transient failure

## 15) Backend/Frontend Dependency Map

Unblocked now (backend available):
- FE-2 shell/nav/route-foundation
- FE-3 pool owner list/detail
- FE-4 member demand lines
- FE-5 RFQ issue panel
- FE-6 owner supplier invite UI

Backend-dependent blocked paths:
- FE-7 supplier invite inbox/detail/action requires supplier route layer
- FE-8 quote submission requires quote route layer
- FE-9 award/allocation requires award routes
- FE-10 order/invoice/settlement NC-specific flows require dedicated NC backend routes

Parallel candidate:
- FE-11 control-plane NC oversight can proceed after FE-2 route/nav foundation is in place.

## 16) FE-2 through FE-12 Boundaries (Definitive)

- FE-2: runtime route/group additions, shell nav insertion, gate-aware UX scaffolding only.
- FE-3: pool owner list/detail UI + tenant service pool reads/writes.
- FE-4: member demand-line UI + tenant service demand-line APIs.
- FE-5: RFQ issue owner panel + route transition UX.
- FE-6: owner invite send/list/detail/cancel UI.
- FE-7: supplier invite inbox/detail/accept/decline UI (blocked on backend routes).
- FE-8: supplier quote submission UI (blocked on backend quote routes).
- FE-9: owner quote review and award actions (blocked on backend award routes).
- FE-10: NC order/invoice/settlement surfaces with finance doctrine safeguards.
- FE-11: control-plane NC oversight UI and admin service integration.
- FE-12: end-to-end verification and governance close.

Boundary rule:
- No FE packet may silently absorb scope from subsequent FE packets.

## 17) FE-2 Readiness (Executable Authority)

FE-2 objective:
- Establish runtime and shell foundation for NC navigation and route selection without implementing full domain screens.

FE-2 exact route additions:
- RuntimeLocalRouteKey:
  - nc_pools
  - nc_pool_detail
  - nc_pool_demand_lines
  - nc_pool_rfq
  - nc_pool_invite_inbox
  - nc_pool_oversight
- RouteGroupKey:
  - network_commerce_pools (classification feature-gated)

FE-2 exact manifest additions:
- b2b_workspace route group network_commerce_pools:
  - default route: nc_pools
  - include nc_pool_detail, nc_pool_demand_lines, nc_pool_rfq, nc_pool_invite_inbox
- control_plane route groups:
  - add nc_pool_oversight under control-plane operations group

FE-2 exact shell changes:
- layouts/Shells.tsx:
  - add NC nav entries in B2BShell
- layouts/SuperAdminShell.tsx:
  - add NC oversight nav entry

FE-2 exact app routing behavior:
- App.tsx:
  - add route-key handlers for new NC keys
  - render placeholder/continuity surfaces for keys not yet fully implemented
  - for supplier inbox key, render backend-blocked continuity state until supplier routes exist

FE-2 exact allowed file set:
- runtime/sessionRuntimeDescriptor.ts
- layouts/Shells.tsx
- layouts/SuperAdminShell.tsx
- App.tsx
- components/Tenant/NetworkCommerce/NetworkCommercePlaceholderSurface.tsx (or equivalent minimal placeholder location)
- governance docs only if governance sync is explicitly required

FE-2 validation command set (narrow-first):
- pnpm run test:runtime-routing:focused
- pnpm run test:frontend
- pnpm run typecheck

FE-2 completion gate:
- New route keys compile and resolve via runtime descriptor.
- B2BShell and SuperAdminShell show route-key-correct NC entries.
- Route navigation does not break existing non-NC routes.
- Supplier inbox route is visibly marked blocked/deferred where backend route dependency remains unmet.

## 18) Validation and Production Verification Policy

For this design packet:
- Documentation-only validation is sufficient.
- No runtime/test execution is required to claim packet completion.

For implementation packets:
- Validate at packet boundary with narrow-first command strategy.
- Do not claim production readiness from FE-2 through FE-11.
- Production verification authority is FE-12 only.

## 19) Open Questions and Deferred Decisions

- OQ-1: Exact backend endpoint shape for supplier invite inbox/detail/accept/decline routes once authorized.
- OQ-2: Whether feature-flag hydration will be explicit session bootstrap or implicit backend-response-driven only.
- OQ-3: Final admin API path contract for nc_pool_oversight data source.
- OQ-4: Whether nc_pool_invite_inbox remains in FE-2 route set as blocked placeholder or is activated only in FE-7.

Deferred by design:
- Any schema or migration work.
- Any backend route authoring.
- Any middleware modifications.
- Any tests authored for this packet.

## 20) Non-Authorization Statement

This packet does not authorize implementation.

Specifically not authorized by this packet:
- Frontend implementation changes outside this design artifact.
- Backend implementation changes.
- Schema changes, migrations, RLS edits, or database operations.
- Service or route implementation.
- Middleware changes.
- Test additions/modifications.

All FE implementation packets (FE-2 through FE-12) remain HOLD_FOR_PARESH_DECISION until explicitly opened.

## 21) Next Recommended Packet

Recommended next packet:
- TEXQTIC-NC-FRONTEND-SHELL-NAV-FEATURE-GATE-001 (FE-2)

Opening condition:
- Explicit Paresh authorization.

Execution notes for next packet:
- Apply FE-2 exact route/group/shell/app changes defined in Section 17.
- Keep supplier inbox behavior in deferred-blocked continuity mode until supplier backend routes are implemented and authorized.
