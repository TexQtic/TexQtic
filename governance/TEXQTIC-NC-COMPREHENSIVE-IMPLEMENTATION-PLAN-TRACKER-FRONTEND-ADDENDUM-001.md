# TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-FRONTEND-ADDENDUM-001

## 1. Packet Metadata

| Field | Value |
|---|---|
| **Document ID** | TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-FRONTEND-ADDENDUM-001 |
| **Document Type** | FRONTEND_TRACKER_ADDENDUM |
| **Status** | FRONTEND_TRACKER_ADDENDUM_CREATED |
| **Version** | 1.0 |
| **Created** | 2026-05-10 |
| **Author** | Governance agent |
| **Authorized by** | Paresh Patel |
| **Basis audit** | TEXQTIC-NC-UIUX-REPO-TRUTH-AUDIT-001 |
| **Basis audit commit** | `fda8139` — docs(network-commerce): audit frontend uiux planning gap |
| **Basis implementation commit** | `a2699b2` — feat(network-commerce): add supplier invite owner routes (NC Phase 1) |
| **Main tracker updated** | TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md (v1.1 → v1.2) |
| **Active delivery unit** | HOLD_FOR_AUTHORIZATION (unchanged) |
| **DPP launch authorization** | HOLD_FOR_PARESH_DECISION (unchanged) |

### Governance Posture (DO NOT ALTER)

```yaml
active_delivery_unit: HOLD_FOR_AUTHORIZATION
dpp_launch_authorization: HOLD_FOR_PARESH_DECISION
```

---

## 2. Executive Summary

The audit `TEXQTIC-NC-UIUX-REPO-TRUTH-AUDIT-001` confirmed a critical gap: **17 Network Commerce backend routes are implemented, but zero frontend UI/UX surfaces exist for Network Commerce at HEAD `a2699b2`.**

This addendum document serves a single purpose: **restore completeness to the Network Commerce comprehensive tracker by documenting the missing Phase 1 frontend/UI/UX implementation plan.** The comprehensive tracker (v1.1, RECONCILED) contained a thorough backend implementation map but had a structural gap — it did not list any Phase 1 frontend packets or UI/UX work. This addendum closes that gap, making the tracker's Phase 1 plan complete.

### What This Addendum Does

- ✅ Documents the frontend UI/UX baseline (0 NC surfaces at audit time)
- ✅ Maps required Phase 1 frontend surfaces to backend routes
- ✅ Proposes 12 frontend implementation packets (FE-1 through FE-12)
- ✅ Carries forward UI privacy rules and feature-gating rules from the audit
- ✅ Updates the main tracker to include frontend track
- ✅ Preserves all backend tracker content and governance posture
- ❌ Does NOT authorize any frontend implementation
- ❌ Does NOT authorize any backend implementation
- ❌ Does NOT modify any implementation files, schema, or migrations

### Critical Non-Authorization Statement

**This addendum is planning and documentation only.** No frontend code, routes, components, services, or tests are authorized by this document. All 12 frontend packets (FE-1 through FE-12) require explicit Paresh Patel authorization and a fresh TECS opening before any implementation may begin. Similarly, backend Supplier Route implementation remains HOLD_FOR_PARESH_DECISION.

---

## 3. Authority Sources

| Source Document | Purpose | Status | Reference |
|---|---|---|---|
| `governance/TEXQTIC-NC-UIUX-REPO-TRUTH-AUDIT-001.md` | Authoritative UI/UX repo-truth audit; confirms 0 NC frontend surfaces at HEAD a2699b2 | ACTIVE | Basis audit for this addendum |
| `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` | Network Commerce comprehensive tracker (v1.1, RECONCILED); backend track complete | ACTIVE | Main tracker being updated by this addendum |
| `governance/TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md` | Primary NC design authority; entities, lifecycle, routing intent, phases | ACTIVE | Architecture authority for frontend design decisions |
| `governance/TEXQTIC-NC-REPO-TRUTH-IMPLEMENTATION-AUDIT-001.md` | Repo-truth audit at HEAD 29319f9; confirms 13 backend routes + schema state | ACTIVE | Backend baseline authority |
| `server/prisma/schema.prisma` | Canonical DB schema; NetworkPool, NetworkPoolDemandLine, NetworkPoolRfq, NetworkPoolRfqSupplierInvite, etc. | RUNTIME | Frontend API design depends on these entities |
| `server/src/routes/tenant/pools.ts`, `poolDemandLines.ts`, `poolRfq.ts` | Implemented backend routes (7 + 5 + 4 in owner-route layer) | RUNTIME | Frontend must wire these routes via API client |
| `services/tenantApiClient.ts` | Frontend API client pattern; wraps core apiClient with tenant realm + `X-Texqtic-Realm: tenant` header | RUNTIME | All frontend NC API calls use this client |
| `runtime/sessionRuntimeDescriptor.ts` | Route manifest system; RuntimeLocalRouteKey union, route groups, shell assignment | RUNTIME | Frontend route architecture must align with this |
| `components/Tenant/`, `components/ControlPlane/`, `services/` | Existing frontend architecture; SPA patterns, service file organization, component structure | RUNTIME | Frontend NC surfaces follow existing patterns |

---

## 4. Frontend Gap Baseline

**Status at HEAD `a2699b2` (audit time: 2026-05-31, commit time: 2026-05-28):**

| Metric | Finding |
|---|---|
| **NC components in Tenant shell** | **0** (zero) |
| **NC components in ControlPlane shell** | **0** (zero) |
| **NC service files** (e.g., `networkCommerceService.ts`) | **0** (zero) |
| **NC route keys in `RuntimeLocalRouteKey`** | **0** (zero) |
| **NC navigation entries in any manifest** | **0** (zero) |
| **Backend NC routes implemented** | **17** (7 pools, 5 demand-lines, 4 supplier-invite-owner, 1 RFQ issue) |
| **Backend NC schema entities** | **9** (NetworkPool, NetworkPoolMembership, NetworkPoolDemandLine, NetworkPoolDemandSnapshot, NetworkPoolDemandSnapshotLine, NetworkPoolRfq, NetworkPoolRfqLine, NetworkSupplierInvite — wait, invite schema not started) |

**Verdict:** The frontend NC track is completely absent — not started, not designed, not planned in detail. This is a planned gap that has now become a delivery blocker: the backend is 17 routes ahead of the frontend with zero user-visible surface area.

---

## 5. Required Phase 1 Frontend Surfaces

### Pool Owner/Admin Surfaces (8 surfaces)

| Surface | Backend Route(s) | Feature Gate |
|---|---|---|
| Pool List (owned pools) | GET `/pools` | `nc.procurement_pools.enabled` |
| Pool Create Form | POST `/pools` | `nc.procurement_pools.enabled` |
| Pool Detail Panel (owner view) | GET `/pools/:poolId` | `nc.procurement_pools.enabled` |
| Pool Open Action | POST `/pools/:poolId/open` | `nc.procurement_pools.enabled` |
| Pool Membership View (admin) | GET `/pools/:poolId/membership` | `nc.procurement_pools.enabled` |
| Demand Lines Panel (owner view) | GET `/pools/:poolId/demand-lines` | `nc.procurement_pools.enabled` |
| Lock for RFQ Action | POST `/pools/:poolId/demand-lines/lock-for-rfq` | `nc.procurement_pools.rfq.enabled` |
| RFQ Issue Panel | POST `/pools/:poolId/rfq/issue` | `nc.procurement_pools.rfq.enabled` |

### Pool Member Surfaces (6 surfaces)

| Surface | Backend Route(s) | Feature Gate |
|---|---|---|
| Pool Discovery / Join | GET `/pools`, POST `/pools/:poolId/join` | `nc.procurement_pools.enabled` |
| Joined Pool List | GET `/pools/joined` | `nc.procurement_pools.enabled` |
| Pool Detail (member view) | GET `/pools/:poolId` (member-scoped) | `nc.procurement_pools.enabled` |
| Demand Line Submit Form | POST `/pools/:poolId/demand-lines` | `nc.procurement_pools.enabled` |
| Demand Line Edit | PATCH `/pools/:poolId/demand-lines/:lineId` | `nc.procurement_pools.enabled` |
| Demand Line Cancel | POST `/pools/:poolId/demand-lines/:lineId/cancel` | `nc.procurement_pools.enabled` |

### Supplier Invite Owner Surfaces (4 surfaces — backend IMPLEMENTED)

| Surface | Backend Route(s) | Feature Gate |
|---|---|---|
| Invite Supplier Form | POST `/pools/:poolId/rfq/:rfqId/invites` | `nc.procurement_pools.supplier_invites.enabled` |
| Invite List Panel | GET `/pools/:poolId/rfq/:rfqId/invites` | `nc.procurement_pools.supplier_invites.enabled` |
| Invite Detail View | GET `/pools/:poolId/rfq/:rfqId/invites/:inviteId` | `nc.procurement_pools.supplier_invites.enabled` |
| Cancel Invite Action | POST `/pools/:poolId/rfq/:rfqId/invites/:inviteId/cancel` | `nc.procurement_pools.supplier_invites.enabled` |

### Supplier Invite Supplier Surfaces (4 surfaces — backend NOT_STARTED)

| Surface | Backend Route(s) | Feature Gate | Status |
|---|---|---|---|
| Invite Inbox | GET (supplier route) | `nc.procurement_pools.supplier_invites.enabled` | Backend route NOT_STARTED |
| Invite Detail (supplier view) | GET (supplier route) | `nc.procurement_pools.supplier_invites.enabled` | Backend route NOT_STARTED |
| Accept Invite Action | POST (supplier route) | `nc.procurement_pools.supplier_invites.enabled` | Backend route NOT_STARTED |
| Decline Invite Action | POST (supplier route) | `nc.procurement_pools.supplier_invites.enabled` | Backend route NOT_STARTED |

### Platform Admin / Control-Plane Surfaces (1 surface)

| Surface | Backend Route(s) | Notes |
|---|---|---|
| NC Pool Oversight Panel | N/A (new ControlPlane route) | Cross-tenant pool visibility; admin role only |

---

## 6. UI Privacy & Non-Leak Rules

Carry forward from audit §12:

| Rule | Surface | Requirement |
|---|---|---|
| **UI-PRIV-1** | Pool Detail (member view) | Show own demand line only; show pool aggregate totals only; never show other members' individual demand data |
| **UI-PRIV-2** | Invite Supplier Form | Show only the consolidated RFQ spec to supplier; never show individual member breakdown |
| **UI-PRIV-3** | Demand Lines Panel (owner view) | Pool admin may see all member demand lines; this is an explicit cross-org read — display must clearly identify source org |
| **UI-PRIV-4** | Supplier Invite Inbox | Supplier sees only invites addressed to their own org; never sees invites to other supplier orgs |
| **UI-PRIV-5** | Settlement / Invoice surfaces | Read-only audit/reporting. No action elements that imply money movement, platform-held funds, or direct withdrawal. (Finance Doctrine) |
| **UI-PRIV-6** | ControlPlane NC Oversight | Admin sees cross-tenant pool data; must clearly separate tenant contexts in UI (tenant name always displayed) |

---

## 7. Feature-Gated UX Rules

Carry forward from audit §13:

| Rule | Description | Implementation Guidance |
|---|---|---|
| **FG-1** | NC Pool surfaces require `nc.procurement_pools.enabled = true` | Navigation item hidden or disabled when flag is off; or backend 403 gracefully handled |
| **FG-2** | NC RFQ surfaces require `nc.procurement_pools.rfq.enabled = true` | Nested within Pool surface; hide RFQ actions when flag is off |
| **FG-3** | NC Supplier Invite surfaces require `nc.procurement_pools.supplier_invites.enabled = true` | Hide invite actions on RFQ panel when flag is off |
| **FG-4** | Flag state must be resolved at session load time | Fetch tenant feature overrides during auth/onboarding; cache in session context |
| **FG-5** | Backend 403 from feature gate must display clear UX | Frontend must distinguish 403 (auth failure) from 403 (feature gate) via error code in response body |
| **FG-6** | Admin oversight panel is not feature-gated | Platform admins always see pool data; no flag check required for ControlPlane NC routes |

---

## 8. Recommended Frontend Route Architecture

Carry forward from audit §14:

### New RuntimeLocalRouteKey Entries (Recommended)

```typescript
| 'nc_pools'                          // Pool list (owned + joined) — B2BShell
| 'nc_pool_detail'                    // Pool detail (owner + member view) — B2BShell
| 'nc_pool_demand_lines'              // Demand line management — B2BShell
| 'nc_pool_rfq'                       // RFQ issue + invite management (owner) — B2BShell
| 'nc_pool_invite_inbox'              // Supplier invite inbox (supplier role) — B2BShell
| 'nc_pool_oversight'                 // ControlPlane: cross-tenant pool overview — SuperAdminShell
```

### New RouteGroupKey Entry (Recommended)

```typescript
| 'network_commerce_pools'            // Feature-gated group (requires nc.procurement_pools.enabled)
```

### Route Group Classification

`'network_commerce_pools'` → classification: `'feature-gated'`

### Manifest Assignment

- NC pool surfaces (`nc_pools`, `nc_pool_detail`, `nc_pool_demand_lines`, `nc_pool_rfq`, `nc_pool_invite_inbox`) → `b2b_workspace` manifest (B2B tenant shell)
- NC admin oversight (`nc_pool_oversight`) → `control_plane` manifest (SuperAdmin shell)

---

## 9. Recommended Component Architecture

Carry forward from audit §15:

### New Component Files (Recommended)

| File | Shell | Purpose |
|---|---|---|
| `components/Tenant/NetworkCommerce/PoolListSurface.tsx` | B2BShell | Pool list (owned + joined tabs); entry point |
| `components/Tenant/NetworkCommerce/PoolDetailSurface.tsx` | B2BShell | Pool detail; role-aware (owner vs. member views) |
| `components/Tenant/NetworkCommerce/DemandLineSurface.tsx` | B2BShell | Demand line list + create/edit/cancel; member submission flow |
| `components/Tenant/NetworkCommerce/PoolRfqSurface.tsx` | B2BShell | RFQ issue panel + supplier invite management (owner) |
| `components/Tenant/NetworkCommerce/SupplierInviteInbox.tsx` | B2BShell | Supplier invite inbox + accept/decline (supplier) |
| `components/ControlPlane/NetworkCommerceOversight.tsx` | SuperAdminShell | Cross-tenant pool oversight (admin role) |

### Subdirectory Pattern

Creation of `components/Tenant/NetworkCommerce/` as a dedicated subdirectory keeps NC components isolated and follows the existing pattern used by related feature groupings.

### Shared Utilities (Reuse Existing)

- `components/shared/EmptyState.tsx` — "No pools found"
- `components/shared/LoadingState.tsx` — Async data fetch loading
- `components/shared/ErrorState.tsx` / `components/shared/ErrorBoundary.tsx` — 403 feature gate error + generic error handling

---

## 10. API Integration Strategy

Carry forward from audit §16:

### New Service File Required

A new `services/networkCommerceService.ts` must be created following the existing pattern of domain-specific service files (`escrowService.ts`, `certificationService.ts`, etc.) using `tenantGet`, `tenantPost`, `tenantPatch` from `tenantApiClient.ts`.

### Recommended Service Function Groups

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

// Invite functions (owner — backend IMPLEMENTED)
sendSupplierInvite(poolId, rfqId, input): Promise<SupplierInviteResponse>
listSupplierInvites(poolId, rfqId): Promise<SupplierInviteListResponse>
getSupplierInvite(poolId, rfqId, inviteId): Promise<SupplierInviteResponse>
cancelSupplierInvite(poolId, rfqId, inviteId, input): Promise<SupplierInviteResponse>

// Invite functions (supplier — backend NOT_STARTED)
listIncomingInvites(): Promise<SupplierInviteListResponse>
viewIncomingInvite(inviteId): Promise<SupplierInviteResponse>
acceptInvite(inviteId): Promise<SupplierInviteResponse>
declineInvite(inviteId, input): Promise<SupplierInviteResponse>
```

### TypeScript Response Types

All response types co-located in `networkCommerceService.ts` (following `catalogService.ts` pattern) unless type surface grows large enough to warrant a separate file.

### Admin Service Extension

Admin NC oversight will either extend `controlPlaneService.ts` with NC functions using `adminGet`, or create `networkCommerceAdminService.ts`. Decision deferred to FE-1 (design packet).

---

## 11. Frontend Validation Bands

Carry forward from audit §17:

| Band | Command | When Required |
|---|---|---|
| **FV-1 — TypeScript (frontend)** | `pnpm --filter frontend tsc --noEmit` | Every NC frontend packet |
| **FV-2 — ESLint (frontend)** | `pnpm --filter frontend lint` | Every NC frontend packet |
| **FV-3 — Unit tests (if applicable)** | `pnpm --filter frontend test` (Vitest frontend config) | If component unit tests added |
| **FV-4 — Runtime render check** | Browser smoke test: navigate to NC surface; confirm render without crash | Every NC route/component packet |
| **FV-5 — Feature gate verification** | With flag OFF: NC nav absent or 403 handled; with flag ON: NC surface renders | Every feature-gated NC surface packet |
| **FV-6 — Role guard verification** | With OWNER role: owner actions present; with MEMBER role: owner actions absent | Every role-sensitive surface |
| **FV-7 — Backend health** | `curl -i http://localhost:3001/health` → 200; NC route smoke test | Every NC frontend packet (server must be running) |

---

## 12. Frontend Packet Backlog

All packets below are HOLD_FOR_PARESH_DECISION and require explicit Paresh authorization before opening.

| # | Packet ID | Type | Scope | Prerequisites | Status |
|---|---|---|---|---|---|
| FE-1 | **TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001** | Design | NC frontend architecture: route manifest design, feature gating strategy, component architecture, API service design, role guard patterns, shell assignment decisions | This audit + addendum complete | HOLD_FOR_PARESH_DECISION |
| FE-2 | **TEXQTIC-NC-FRONTEND-SHELL-NAV-FEATURE-GATE-001** | Implementation | Add NC route keys to `sessionRuntimeDescriptor.ts`; add NC nav items to `B2BShell`; feature gate hook (or backend-driven 403 pattern) | FE-1 design complete | HOLD_FOR_PARESH_DECISION |
| FE-3 | **TEXQTIC-NC-FRONTEND-POOL-OWNER-LIST-DETAIL-001** | Implementation | Pool list + pool detail surfaces (owner view); `PoolListSurface.tsx`, `PoolDetailSurface.tsx`; NC service functions: createPool, openPool, getPoolDetail, listOwnedPools | FE-2 complete | HOLD_FOR_PARESH_DECISION |
| FE-4 | **TEXQTIC-NC-FRONTEND-POOL-MEMBER-DEMAND-LINES-001** | Implementation | Pool member join + demand line surfaces; member view of pool detail; `DemandLineSurface.tsx`; service: joinPool, listJoinedPools, createDemandLine, updateDemandLine, cancelDemandLine, lockDemandLinesForRfq | FE-3 complete (parallel candidate) | HOLD_FOR_PARESH_DECISION |
| FE-5 | **TEXQTIC-NC-FRONTEND-RFQ-ISSUE-PANEL-001** | Implementation | RFQ issue panel; `PoolRfqSurface.tsx` (partial); service: issueRfq, listDemandLines (owner view pre-lock) | FE-4 complete | HOLD_FOR_PARESH_DECISION |
| FE-6 | **TEXQTIC-NC-FRONTEND-SUPPLIER-INVITE-OWNER-UI-001** | Implementation | Supplier invite owner UI: send invite form, invite list, invite detail, cancel invite; `PoolRfqSurface.tsx` (extend); service: sendSupplierInvite, listSupplierInvites, getSupplierInvite, cancelSupplierInvite | FE-5 complete; Backend owner routes IMPLEMENTED ✅ | HOLD_FOR_PARESH_DECISION |
| FE-7 | **TEXQTIC-NC-FRONTEND-SUPPLIER-INVITE-SUPPLIER-INBOX-001** | Implementation | Supplier invite inbox; `SupplierInviteInbox.tsx`; service: listIncomingInvites, viewIncomingInvite | FE-6 complete; Backend supplier list/view routes REQUIRED (HOLD_FOR_PARESH_DECISION) | HOLD_FOR_PARESH_DECISION |
| FE-8 | **TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001** | Implementation | Supplier quote submission UI; quote form; service: submitQuote | FE-7 complete; Backend quote route REQUIRED (NOT_STARTED) | HOLD_FOR_PARESH_DECISION |
| FE-9 | **TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001** | Implementation | Pool owner quote review + accept/reject; allocation display; service: acceptQuote, rejectQuote | FE-8 complete; Backend award routes REQUIRED (NOT_STARTED) | HOLD_FOR_PARESH_DECISION |
| FE-10 | **TEXQTIC-NC-FRONTEND-ORDER-INVOICE-SETTLEMENT-UI-001** | Implementation | Pool order trigger; NC invoice view; settlement preview (read-only); finance doctrine enforced | FE-9 complete; Backend order/invoice/settle routes REQUIRED (NOT_STARTED) | HOLD_FOR_PARESH_DECISION |
| FE-11 | **TEXQTIC-NC-FRONTEND-ADMIN-PROVISIONING-OVERSIGHT-001** | Implementation | ControlPlane NC oversight panel; `NetworkCommerceOversight.tsx`; cross-tenant pool visibility; admin service functions | FE-2 complete (parallel candidate with FE-3 after nav shell established) | HOLD_FOR_PARESH_DECISION |
| FE-12 | **TEXQTIC-NC-FRONTEND-PROD-VERIFY-GOV-CLOSE-001** | Verify+Close | Full NC Phase 1 end-to-end Playwright test suite; governance close; OPEN-SET + GOVERNANCE-CHANGELOG sync | FE-10 + FE-11 complete | HOLD_FOR_PARESH_DECISION |

### Packet Dependency Tree

```
This Addendum (TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-FRONTEND-ADDENDUM-001)
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

## 13. Backend-to-Frontend Dependency Map

The following table maps each currently implemented backend route to its required frontend surface and corresponding frontend packet:

| Backend Route | Route Status | Required Frontend Surface | Frontend Packet | Frontend Status |
|---|---|---|---|---|
| POST `/pools` | IMPLEMENTED | Pool Create Form | FE-3 | HOLD_FOR_PARESH_DECISION |
| GET `/pools` | IMPLEMENTED | Pool List (owned + joined) | FE-3 | HOLD_FOR_PARESH_DECISION |
| POST `/pools/:poolId/open` | IMPLEMENTED | Pool Open Action (in Pool Detail) | FE-3 | HOLD_FOR_PARESH_DECISION |
| GET `/pools/:poolId` | IMPLEMENTED | Pool Detail Panel | FE-3 | HOLD_FOR_PARESH_DECISION |
| POST `/pools/:poolId/join` | IMPLEMENTED | Pool Join Action | FE-4 | HOLD_FOR_PARESH_DECISION |
| GET `/pools/joined` | IMPLEMENTED | Joined Pool List (member) | FE-4 | HOLD_FOR_PARESH_DECISION |
| GET `/pools/:poolId/membership` | IMPLEMENTED | Membership view (owner) | FE-3 | HOLD_FOR_PARESH_DECISION |
| GET `/pools/:poolId/demand-lines` | IMPLEMENTED | Demand Lines Panel | FE-4 | HOLD_FOR_PARESH_DECISION |
| POST `/pools/:poolId/demand-lines` | IMPLEMENTED | Demand Line Submit Form | FE-4 | HOLD_FOR_PARESH_DECISION |
| PATCH `/pools/:poolId/demand-lines/:lineId` | IMPLEMENTED | Demand Line Edit | FE-4 | HOLD_FOR_PARESH_DECISION |
| POST `/pools/:poolId/demand-lines/:lineId/cancel` | IMPLEMENTED | Demand Line Cancel Action | FE-4 | HOLD_FOR_PARESH_DECISION |
| POST `/pools/:poolId/demand-lines/lock-for-rfq` | IMPLEMENTED | Lock for RFQ Action | FE-5 | HOLD_FOR_PARESH_DECISION |
| POST `/pools/:poolId/rfq/issue` | IMPLEMENTED | RFQ Issue Panel | FE-5 | HOLD_FOR_PARESH_DECISION |
| POST `/pools/:poolId/rfq/:rfqId/invites` | IMPLEMENTED (owner) | Invite Supplier Form | FE-6 | HOLD_FOR_PARESH_DECISION |
| GET `/pools/:poolId/rfq/:rfqId/invites` | IMPLEMENTED (owner) | Invite List Panel | FE-6 | HOLD_FOR_PARESH_DECISION |
| GET `/pools/:poolId/rfq/:rfqId/invites/:inviteId` | IMPLEMENTED (owner) | Invite Detail View | FE-6 | HOLD_FOR_PARESH_DECISION |
| POST `/pools/:poolId/rfq/:rfqId/invites/:inviteId/cancel` | IMPLEMENTED (owner) | Cancel Invite Action | FE-6 | HOLD_FOR_PARESH_DECISION |

---

## 14. Sequencing Recommendation

Carry forward from audit §20:

**Recommended approach (Option A):** Pause new backend route expansion long enough to complete frontend design and tracker addendum. This produces the earliest visible NC surface and enables parallel convergence.

### Immediate Next Decision Point

The recommended next packet after this addendum is:

**TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001**

This is a design-only packet that establishes:
- Final frontend architecture decisions (route manifest, component structure, API service pattern)
- Feature gating strategy (client-side vs. backend-driven)
- Shell and manifest assignments
- Role guard pattern alignment

Once FE-1 (design) is complete, FE-2 (shell foundation) can be opened, allowing parallel frontend and backend work to proceed.

### Alternative

Backend Supplier Route implementation (`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-ROUTE-001`) may proceed in parallel or immediately after FE-2 lands, but only with explicit Paresh authorization.

---

## 15. Tracker Update Summary

This addendum updates the main comprehensive tracker (`TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md`, version 1.1 → 1.2) with the following changes:

1. **Metadata:** Version incremented to 1.2; status updated to include "FRONTEND_ADDENDUM_ADDED"; basis audit and commit noted
2. **Executive summary:** Added paragraph confirming UI/UX gap and frontend addendum role
3. **Current implementation baseline:** Added 8 frontend baseline rows (all NOT_STARTED)
4. **Implementation phases:** Added Phase 1 frontend track with slices FE0–FE7
5. **Packet tracker:** Added FE-1 through FE-12 packets in dedicated "Frontend Packet Track" subsection
6. **Validation strategy:** Added frontend validation bands FV-1 through FV-7
7. **Drift prevention:** Added frontend-specific drift prevention rules
8. **Immediate next decision:** Set recommended next frontend candidate to TEXQTIC-NC-UIUX-FOUNDATION-DESIGN-001

**All existing backend tracker content preserved.** No backend packet numbers changed. No governance posture altered.

---

## 16. Non-Authorization Statement

This addendum is a governance/planning document only. It does **not** authorize any of the following:

- ❌ Implementation of any frontend component, route, service, API client, or test
- ❌ Modification of `sessionRuntimeDescriptor.ts`, `App.tsx`, `services/`, or any frontend file
- ❌ Implementation of any backend route, service, schema, migration, or middleware
- ❌ Opening of any frontend implementation packet (FE-1 through FE-12)
- ❌ Opening of backend Supplier Route implementation
- ❌ Modification of `TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` for purposes other than documenting frontend track
- ❌ Alteration of `active_delivery_unit` or `dpp_launch_authorization` governance posture
- ❌ Marking any FE packet as ACTIVE or IN_PROGRESS

All items in the FE-1 through FE-12 packet backlog require **explicit Paresh Patel authorization** and a fresh TECS opening before any implementation may begin.

---

## 17. Files Changed by This Packet

This addendum updates governance documentation only:

| File | Change |
|---|---|
| `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-FRONTEND-ADDENDUM-001.md` | NEW — this addendum document |
| `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` | Updated — frontend track added; version 1.1 → 1.2 |
| `governance/control/OPEN-SET.md` | Updated — Last Updated + Operating Note (optional) |
| `governance/control/GOVERNANCE-CHANGELOG.md` | Updated — new entry prepended (optional) |

**Total files changed: 2–4** (1 new, 1 updated mandatory, 2 optional governance control updates).

**No implementation files, frontend files, backend files, schema, migrations, services, routes, middleware, tests, or package scripts were modified.**
