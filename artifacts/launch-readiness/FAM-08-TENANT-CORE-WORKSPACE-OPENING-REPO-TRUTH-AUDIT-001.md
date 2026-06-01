# FAM-08-TENANT-CORE-WORKSPACE-OPENING-REPO-TRUTH-AUDIT-001
## Opening Repo-Truth Audit — Tenant Core Workspace

**Governance hub:** `governance/launch-readiness/`
**Family:** FAM-08 — Tenant Core Workspace
**Artifact type:** Read-only repo-truth audit
**Priority:** P0 / LAUNCH_BLOCKER
**Date:** 2026-07-14
**Conducted by:** Copilot / audit agent (safe-write mode, governance exception false)
**Commit basis:** `4aa4bd16` — `docs(launch): point next action to fam-08 audit`

---

## §1 — Unit Summary

This is the opening read-only repo-truth audit for FAM-08 Tenant Core Workspace
(P0 / LAUNCH_BLOCKER / NOT_ASSESSED). The unit was installed as the next nonlegal
launch-readiness candidate by LAUNCH-READINESS-NONLEGAL-POINTER-SYNC-001 (commit `4aa4bd16`)
following the nonlegal selection process of LAUNCH-READINESS-NONLEGAL-NEXT-PACKET-SELECTION-001
(commit `41f3336e`).

This audit produces a classified mapping of current implementation state across all
six dimensions of MVP must-haves §3 (T-1 through T-6), identifies gaps, assesses risks,
and selects a single bounded follow-on packet.

**Scope of this audit:**
- Tenant workspace routing and session architecture
- org_id isolation (constitutional constraint)
- Feature flag provisioning for new tenants
- Subscription / commercial plan metadata resolution
- Admin settings surface accessibility
- Cross-tenant context isolation evidence

**What this audit does NOT do:**
- Does not implement any workspace changes
- Does not weaken org_id isolation
- Does not touch auth/session source code
- Does not create legal authority or advance FAM-07 hold
- Does not close FAM-08 in any tracker (only the opening audit; closure requires follow-on unit)

---

## §2 — Preflight Evidence

### 2.1 Safety checks executed

```
git -C "C:/Users/PARESH/TexQtic" status --short
→ clean tree (no uncommitted changes)

git -C "C:/Users/PARESH/TexQtic" rev-parse --short HEAD
→ 4aa4bd16

git -C "C:/Users/PARESH/TexQtic" merge-base --is-ancestor 4aa4bd16 HEAD
→ exit 0 (no divergence)
```

### 2.2 Artifact path checks

```
Test-Path "C:/Users/PARESH/TexQtic/artifacts/launch-readiness/LAUNCH-READINESS-NONLEGAL-POINTER-SYNC-001.md"
→ True

Test-Path "C:/Users/PARESH/TexQtic/artifacts/launch-readiness/LAUNCH-READINESS-NONLEGAL-NEXT-PACKET-SELECTION-001.md"
→ True

Test-Path "C:/Users/PARESH/TexQtic/governance/legal/fam-07/supplier-onboarding-terms-authority.json"
→ False (expected — legal authority absent, hold preserved)

Test-Path "C:/Users/PARESH/TexQtic/governance/legal/fam-07/"
→ False (expected — fam-07 legal directory absent)
```

### 2.3 Governance pointer confirmed

`governance/control/NEXT-ACTION.md` confirms:
- `next_candidate_unit: FAM-08-TENANT-CORE-WORKSPACE-OPENING-REPO-TRUTH-AUDIT-001`
- `next_candidate_unit_status: READY_AFTER_POINTER_SYNC`
- `active_delivery_unit: LAUNCH-READINESS-NONLEGAL-POINTER-SYNC-001`
- `active_delivery_unit_status: VERIFIED_COMPLETE`

`governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` line 106 confirms:
- `FAM-08 | Tenant Core Workspace | MAIN | NOT_ASSESSED | LAUNCH_BLOCKER | P0 | NO | 7`

**Preflight verdict: PASS. No blockers detected. Audit may proceed.**

---

## §3 — Repo-Truth Sources Inspected

| Source file | Purpose |
|---|---|
| `App.tsx` | SPA state machine; all tenant appState values and route dispatch |
| `runtime/sessionRuntimeDescriptor.ts` | Route manifest, operating mode, capability, shell family definitions |
| `server/src/middleware/auth.ts` | JWT auth middleware (tenantAuthMiddleware, adminAuthMiddleware) |
| `server/src/lib/tenantContext.ts` | Tenant context extraction from authenticated request |
| `server/src/lib/database-context.ts` | Constitutional RLS enforcement via withDbContext / SET LOCAL |
| `server/src/middleware/ncPoolFeatureGate.middleware.ts` | NC pool 2-layer feature gate |
| `server/src/routes/tenant.ts` | Tenant sub-route plugin registration (lines 1–100) |
| `server/src/routes/tenant/` | Directory listing of all tenant sub-route files |
| `server/src/__tests__/` | Full directory listing of all integration/unit tests |
| `server/prisma/schema.prisma` | Prisma schema — Tenant, User, Membership, Invite, FeatureFlag, TenantFeatureOverride, organizations |
| `services/tenantService.ts` | Frontend tenant service — activation, invite, membership calls |
| `services/apiClient.ts` | Base API client |
| `contexts/` | Context files directory |
| `components/Tenant/` | Directory listing — all tenant workspace component files |
| `components/Tenant/NetworkCommerce/` | NC sub-directory listing |
| `layouts/Shells.tsx` | Shell components (AggregatorShell, B2BShell, B2CShell, WhiteLabelShell) |
| `governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md` | Full MVP checklist (T-1 through T-6 baseline) |
| `governance/control/NEXT-ACTION.md` | Layer 0 governance pointer |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-08 family status confirmation |

---

## §4 — FAM-07 Legal Hold Confirmation

| Check | Result |
|---|---|
| `governance/legal/fam-07/` directory exists | **FALSE** — absent |
| `governance/legal/fam-07/supplier-onboarding-terms-authority.json` exists | **FALSE** — absent |
| `FAM_08_AUDIT_BLOCKED_LEGAL_AUTHORITY_PRESENT` trigger | **NOT TRIGGERED** |
| FAM-07 hold state | **HOLD_FOR_HUMAN_LEGAL_INPUTS — PRESERVED** |
| FAM-07L14 | **BLOCKED** — prerequisites unmet |
| FTR-LEGAL-003 | **MVP_CRITICAL / OPEN** |
| `legal_approved_transition_allowed` | **false** |
| FAM-07 status in trackers | **PARTIALLY_IMPLEMENTED** (unchanged) |

**Legal hold is fully intact. FAM-08 audit proceeds independently of FAM-07.**

---

## §5 — FAM-08 Scope Definition

FAM-08 covers the Tenant Core Workspace family: the complete lifecycle of a provisioned
tenant accessing and using their TexQtic workspace, from authentication through all
tenanted operational surfaces. The scope is defined by MVP must-haves §3 (T-1 through T-6).

**In scope:**
1. **T-1** — Supplier login and workspace access (auth flow → workspace load)
2. **T-2** — org_id isolation in all tenant routes (constitutional requirement)
3. **T-3** — Feature flag provisioning for new tenants
4. **T-4** — Tenant plan/subscription metadata resolution
5. **T-5** — Admin settings surface accessibility
6. **T-6** — Cross-tenant context isolation (RLS policy gate)

**Out of scope for this audit:**
- FAM-07 legal hold (separate family; hold preserved)
- Control plane surfaces (FAM covered separately in FTR-CP-001)
- Public B2C surfaces (already PRODUCTION_VERIFIED in §5)
- Inquiry/notification flows (FAM covered in B-series)
- DPP Passport Network launch gate (HOLD_FOR_PARESH_DECISION, separate)

---

## §6 — Tenant Workspace Route/State Inventory

### 6.1 Primary App State Machine

`App.tsx` implements a string-state SPA machine. Tenant-scoped states:

| appState | Purpose | Guard condition |
|---|---|---|
| `EXPERIENCE` | Main workspace shell; dispatches on `tenantLocalRouteSelection.routeKey` | `effectiveRealm === 'TENANT'` && `currentTenantId` present |
| `TEAM_MGMT` | Renders `<TeamManagement>` — member list | Authenticated tenant member |
| `INVITE_MEMBER` | Renders `<InviteMemberForm>` — invite flow | OWNER / ADMIN role |
| `SETTINGS` | Read-only workspace profile; or `<WhiteLabelSettings>` for WL tenants | Authenticated tenant member |
| `WL_ADMIN` | White-label admin overlay | `whiteLabelCapability === true` |

**Key guard:** `tenantViewScopeKey` is null when `appState === 'AUTH' || effectiveRealm !== 'TENANT' || !currentTenantId`. This resets all route state on tenant switch, preventing cross-tenant state bleed.

**Verification-blocked guard:** `isVerificationBlockedTenantWorkspace = tenantContentFamily === 'b2b_workspace' && onboardingStatusContinuity !== null` — B2B tenants with pending onboarding status see a blocked UI surface.

**Realm-boundary guard (REALM-BOUNDARY-SHELL-AFFORDANCE-001):** If `appState === 'CONTROL_PLANE'` but `!canAccessControlPlane` → forced back to `EXPERIENCE`.

### 6.2 Runtime Manifest Families (from `runtime/sessionRuntimeDescriptor.ts`)

Five manifest entries define tenant workspace families:

| Family key | Shell | Default appState | Default route | Route groups |
|---|---|---|---|---|
| `aggregator_workspace` | AggregatorShell | EXPERIENCE | home | home_landing, orders_operations, rfq_sourcing, operational_workspace |
| `b2b_workspace` | B2BShell | EXPERIENCE | catalog | catalog_browse, orders_operations, rfq_sourcing, operational_workspace, network_commerce_pools |
| `b2c_storefront` | B2CShell | EXPERIENCE | home | home_landing, cart_commerce, orders_operations, rfq_sourcing, operational_workspace |
| `wl_storefront` | WhiteLabelShell | EXPERIENCE | home | home_landing, cart_commerce, orders_operations, rfq_sourcing, operational_workspace |
| `wl_admin` | WhiteLabelAdminShell | EXPERIENCE | branding | admin_branding_domains (overlay-only), catalog_browse, orders_operations |

**Family determination:** Driven by `tenantCategory` (B2B/B2C/INTERNAL/AGGREGATOR) + `whiteLabelCapability` + `authenticatedRole` via `createTenantSessionRuntimeDescriptor`.

### 6.3 Route Group Classification

| Classification | Route groups |
|---|---|
| `family-core` | home_landing, catalog_browse, control_plane_operations |
| `feature-gated` | cart_commerce, rfq_sourcing, orders_operations, operational_workspace, network_commerce_pools |
| `overlay-only` | admin_branding_domains |

### 6.4 Full RuntimeLocalRouteKey Inventory (tenant scope)

`home`, `catalog`, `buyer_catalog`, `cart`, `orders`, `buyer_rfqs`, `supplier_rfq_inbox`, `dpp`,
`escrow`, `escalations`, `settlement`, `certifications`, `traceability`, `audit_logs`, `trades`,
`gst_verification`, `invoices`, `invoice_approval`, `nc_pools`, `nc_pool_detail`,
`nc_pool_demand_lines`, `nc_pool_rfq`, `nc_pool_invite_inbox`, `branding`, `staff`,
`staff_invite`, `products`, `collections`, `domains`, `dpp_label`

**Count:** 30+ tenant-scoped route keys registered in runtime descriptor.

### 6.5 EXPERIENCE Route Dispatch (App.tsx switch)

Key routes dispatched within EXPERIENCE:

| routeKey | Component rendered |
|---|---|
| `orders` | `<EXPOrdersPanel>` |
| `buyer_rfqs` | `<BuyerRfqListSurface>` / `<BuyerRfqDetailSurface>` |
| `supplier_rfq_inbox` | `<SupplierRfqInboxSurface>` / `<SupplierRfqDetailSurface>` |
| `dpp` | `<DPPPassport>` |
| `escrow` | `<EscrowPanel>` |
| `gst_verification` | `<GstVerificationCard>` |
| `invoices` | `<InvoicesPanel>` |
| `invoice_approval` | `<InvoiceApprovalView>` |
| `escalations` | `<EscalationsPanel>` |
| `settlement` | `<SettlementPreview>` |
| `certifications` | `<CertificationsPanel>` |
| `traceability` | `<TraceabilityPanel>` |
| `audit_logs` | `<TenantAuditLogs>` |
| `trades` | `<TradesPanel>` |
| `nc_pools` | `<PoolListSurface>` |
| `nc_pool_detail` | `<PoolDetailSurface>` |
| `nc_pool_demand_lines` | `<DemandLineSurface>` |
| `nc_pool_rfq` | `<PoolRfqSurface>` |
| `nc_pool_invite_inbox` | `<SupplierInviteInbox>` |
| `catalog` / `home` | Catalog/home entry surfaces (B2B/aggregator/B2C variant) |
| `buyer_catalog` | Buyer catalog browse with supplier picker |

---

## §7 — Session and Tenant-Context Findings

### 7.1 State management architecture

- **No separate `TenantContext.tsx`** — tenant state is managed entirely via `useState` hooks in `App.tsx`.
- `contexts/` directory contains **only `CartContext.tsx`** — no TenantContext, OrgContext, or AuthContext files.
- All tenant-scoped state is local to App.tsx: `currentTenantId`, `tenantConfig`, `effectiveRealm`,
  `tenantLocalRouteSelection`, `whiteLabelCapability`, `tenantContentFamily`, `onboardingStatusContinuity`.

### 7.2 Tenant scope isolation mechanism

`tenantViewScopeKey` is a computed value:
```typescript
// null if: appState === 'AUTH' || effectiveRealm !== 'TENANT' || !currentTenantId
```
When null, all route state (`tenantLocalRouteSelection`) resets. This prevents cross-tenant route
state bleed when switching tenants or signing out.

### 7.3 Implications

- Centralized state in App.tsx is simple and avoids context provider race conditions, but creates
  a large single-file surface for tenant state logic.
- No React Context provider wrapping tenant data means tenant state cannot be accessed by deeply
  nested components without prop drilling or service calls — consistent with the pattern of
  components using service layer calls rather than context reads.
- Session persistence across page refresh: depends on JWT and service calls on mount
  (authService.getCurrentUser pattern). Not directly verified in this audit.

---

## §8 — Frontend Workspace Surface Findings

### 8.1 Tenant component inventory

`components/Tenant/` contains 23 files:

| Component | Surface |
|---|---|
| `TeamManagement.tsx` | Member list (TEAM_MGMT state) |
| `InviteMemberForm.tsx` | Invite flow (INVITE_MEMBER state) |
| `WhiteLabelSettings.tsx` | WL branding/domain management (SETTINGS for WL tenants) |
| `EXPOrdersPanel.tsx` | Orders workspace |
| `DPPPassport.tsx` | DPP passport surface |
| `EscrowPanel.tsx` | TradeTrust ledger surface |
| `EscalationsPanel.tsx` | Escalations panel |
| `SettlementPreview.tsx` | Settlement preview |
| `CertificationsPanel.tsx` | Certifications panel |
| `TraceabilityPanel.tsx` | Traceability panel |
| `TenantAuditLogs.tsx` | Audit log surface |
| `TradesPanel.tsx` | Trades panel |
| `GstVerificationCard.tsx` | GST verification surface |
| `InvoicesPanel.tsx` | Invoices panel |
| `InvoiceApprovalView.tsx` | Invoice approval surface |
| `BuyerRfqListSurface.tsx` | Buyer RFQ list |
| `BuyerRfqDetailSurface.tsx` | Buyer RFQ detail |
| `SupplierRfqInboxSurface.tsx` | Supplier RFQ inbox |
| `SupplierRfqDetailSurface.tsx` | Supplier RFQ detail |
| `CatalogPdpSurface.tsx` | Catalog PDP |
| `AggregatorDiscoveryWorkspace.tsx` | Aggregator discovery |
| `SupplierProfileCompletenessCard.tsx` | Profile completeness indicator |
| `DocumentIntelligenceCard.tsx` | Document intelligence card |
| `TtpEnrollmentBanner.tsx` | TTP enrollment banner |
| `TtpTradeSummaryCard.tsx` | TTP trade summary |

`components/Tenant/NetworkCommerce/` contains 9 files:
`PoolListSurface.tsx`, `PoolDetailSurface.tsx`, `DemandLineSurface.tsx`, `PoolRfqSurface.tsx`,
`SupplierInviteInbox.tsx`, `NetworkCommercePlaceholderSurface.tsx`, `QuoteReviewPanel.tsx`,
`SupplierInviteOwnerSurface.tsx`, `SupplierQuoteSurface.tsx`

### 8.2 Shell implementations

`layouts/Shells.tsx` implements all tenant shells referenced by the runtime descriptor:
- `AggregatorShell` — aggregator workspace navigation
- `B2BShell` — B2B workspace navigation (with `shellMode: 'default' | 'verification-blocked'`)
- `B2CShell` — B2C storefront navigation
- `WhiteLabelShell` — white-label storefront navigation
- `WhiteLabelAdminShell` — white-label admin overlay navigation

Shell props contract: `{ tenant: TenantConfig, children: React.ReactNode, navigation: TenantShellNavigationContract }`
with `TenantShellNavigationContract` including: `surface: RuntimeShellNavigationSurface | null`, `onNavigateRoute`, `onNavigateTeam`, `showAuthenticatedAffordances`.

### 8.3 SETTINGS surface detail

The SETTINGS appState renders:
- **Standard tenants:** Read-only workspace profile (name, status, base family, posture) — no write surface
- **White-label tenants:** `<WhiteLabelSettings>` — branding/domain management with write capability

**Gap:** No write-capable standard tenant admin configuration surface is present (no tenant name edit, plan display, or profile edit for B2B/B2C tenants beyond WL-specific settings).

### 8.4 TEAM_MGMT / INVITE_MEMBER detail

- `<TeamManagement>` renders member list and pending invite list via `getMemberships()` call
- `<InviteMemberForm>` renders invite form, calls `createMembership()`
- Both are standalone `appState` nodes (not routes within EXPERIENCE) — accessible via navigation affordances

---

## §9 — Backend Tenant Route Findings

### 9.1 Middleware chain

`server/src/routes/tenant.ts` registers all tenant sub-routes under prefix `/api/tenant`.
Middleware chain applied to all tenant routes:
1. `tenantAuthMiddleware` — JWT verification + membership check + `request.tenantId` / `request.userId` / `request.userRole` decoration
2. `databaseContextMiddleware` — `withDbContext` with `buildContextFromRequest` → `SET LOCAL app.org_id`

### 9.2 Auth middleware details (server/src/middleware/auth.ts)

- `tenantAuthMiddleware`: verifies tenant JWT; checks `checkRealmMismatch`; verifies org membership in DB
- `adminAuthMiddleware`: verifies admin JWT; checks `adminUser` DB record; decorates `request.isAdmin`
- X-Tenant-Id header bypass: **REMOVED** (G-W3-A1) — tenant context MUST come from JWT only
- Cross-realm detection: `checkRealmMismatch` (from `realmGuard.ts`) — prevents tenant JWT on admin route and vice versa

### 9.3 Sub-route plugins registered in tenant.ts

20+ sub-route plugin files under `server/src/routes/tenant/`:

| Route file | Domain |
|---|---|
| `escalation.g022.ts` | Escalations |
| `trades.g017.ts` | Trades |
| `escrow.g018.ts` | Escrow/TradeTrust ledger |
| `settlement.ts` | Settlement |
| `certifications.g019.ts` | Certifications |
| `traceability.g016.ts` | Traceability |
| `documents.ts` | Documents |
| `gst-verification.ts` | GST verification |
| `invoices.ts` | Invoices |
| `pools.ts` | Network commerce pools |
| `poolDemandLines.ts` | Pool demand lines |
| `poolRfq.ts` | Pool RFQ |
| `poolRfqSupplierInvites.ts` | Pool RFQ supplier invites |
| `poolRfqSupplierQuotes.ts` | Pool RFQ supplier quotes |
| `networkInvoices.ts` | Network invoices |
| `networkSettlement.ts` | Network settlement |
| `networkLifecycle.ts` | Network lifecycle |
| `invoice-approval.ts` | Invoice approval |
| `ttp-summary.ts` | TTP summary |
| `ttp-enrollment.ts` | TTP enrollment |

Plus tenant-level routes registered directly in `tenant.ts` (activate, memberships, settings, etc.).

### 9.4 Per-route feature gates

- **NC pools**: `ncPoolFeatureGate.middleware.ts` — 2-layer gate (global FeatureFlag + TenantFeatureOverride)
- **TTP routes**: `ttpFeatureGate.middleware.ts` — similar per-feature gate pattern (test file confirmed)
- Feature-gated route groups require capability resolution before rendering in the runtime descriptor

---

## §10 — Tenant API / Service Findings

### 10.1 Frontend tenant service (services/tenantService.ts)

Key exports and their backend targets:

| Function | Backend endpoint | Purpose |
|---|---|---|
| `activateTenant()` | `POST /api/tenant/activate` | Activate pre-provisioned tenant with invite token |
| `acceptAuthenticatedInvite()` | `POST /api/tenant/activate-authenticated` | Accept invite for already-authenticated user |
| `buildLegalPendingScaffoldConsent()` | (local builder) | Construct LEGAL_PENDING consent scaffold |
| `getMemberships()` | `GET /api/tenant/memberships` | Fetch tenant member list and pending invites |
| `createMembership()` | `POST /api/tenant/memberships` | Invite new member (OWNER/ADMIN only) |
| `revokePendingInvite()` | (present in file) | Revoke invite |

### 10.2 Activation error codes

```typescript
ACTIVATION_ERROR_CODES = {
  EXISTING_USER_MUST_SIGN_IN: 'EXISTING_USER_MUST_SIGN_IN',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
}
```
These cover the key onboarding edge cases.

### 10.3 Legal scaffold state

`buildLegalPendingScaffoldConsent()` produces a consent with `legalStatus: 'LEGAL_PENDING'`
and `agreementVersion: 'PENDING_FINAL_LEGAL_PACKAGE'`. This is the FAM-07 legal scaffold
placeholder — in active use for the activation flow. Full legal package is blocked on FAM-07 hold.

### 10.4 Tenant API client

`services/tenantApiClient.ts` provides `tenantGet`, `tenantPost`, `tenantPut`, `tenantPatch`,
`tenantDelete` — all inject the current tenant JWT header into requests to `/api/tenant/*`.

### 10.5 Integration test coverage for activation

- `tenant-activate.integration.test.ts` — tests activation endpoint
- `tenant-provision-approved-onboarding.integration.test.ts` — tests approved-onboarding provisioning
- `tenant-catalog-items.rls.integration.test.ts` — tests RLS on catalog items for tenant

---

## §11 — org_id Isolation and Cross-Tenant Boundary Findings

### 11.1 Constitutional enforcement mechanism

`server/src/lib/database-context.ts` implements the constitutional RLS enforcement:

```typescript
// CONSTITUTIONAL ENFORCEMENT: Set ONLY app.org_id (never app.tenant_id)
await tx.$executeRawUnsafe(`SELECT set_config('app.org_id', $1, true)`, context.orgId);
```

Additional context set per transaction:
- `SET LOCAL ROLE texqtic_app` — switches to NOBYPASSRLS role for the transaction
- `SET LOCAL app.actor_id` — actor identity for audit
- `SET LOCAL app.realm` — 'tenant' or 'control'
- `SET LOCAL app.request_id` — trace UUID
- `SET LOCAL app.bypass_rls = 'off'` — explicit RLS enforcement

All `SET LOCAL` statements are transaction-scoped and auto-revert on transaction end (pooler-safe).

### 11.2 Request-level context extraction

`server/src/lib/tenantContext.ts` — `getTenantContext()`:
- Priority 1: tenant JWT → `realm='tenant'`, `tenantId+userId` from token
- Priority 2: admin realm → `tenantId=null`, `realm='admin'`
- **No X-Tenant-Id fallback** — removed (G-W3-A1), fail-closed

`server/src/lib/database-context.ts` — `buildContextFromRequest()`:
- `orgId` from: `req.tenantId` → `user.tenantId` → `user.orgId`
- **Fails closed** (throws) if orgId cannot be resolved

### 11.3 Schema-level constraint

The `organizations` table has a mandatory 1:1 FK to `tenants`:
```
tenants   Tenant   @relation(fields: [id], references: [id], onDelete: Cascade, onUpdate: NoAction)
```
`organizations.id` = `tenants.id` — every organization record is anchored to a tenant record.
RLS policies enforce `app.org_id` = `organizations.id` for all tenant-scoped queries.

### 11.4 Test coverage for isolation

Integration and unit tests covering org_id isolation:

| Test file | Coverage |
|---|---|
| `gate-d2-carts-rls.integration.test.ts` | Cart RLS gate |
| `gate-d3-audit-event-logs-rls.integration.test.ts` | Audit event log RLS gate |
| `gate-d4-white-label-config-rls.integration.test.ts` | White-label config RLS gate |
| `gate-d5-ai-governance-rls.integration.test.ts` | AI governance RLS gate |
| `gate-d6-marketplace-cart-summaries-rls.integration.test.ts` | Cart summaries RLS gate |
| `gate-d7-impersonation-sessions-rls.integration.test.ts` | Impersonation sessions RLS gate |
| `gate-e-2-cross-realm.integration.test.ts` | Cross-realm JWT rejection |
| `relationshipTenantIsolation.test.ts` | Relationship-level tenant isolation |
| `wave3-rls-negative.spec.ts` | Wave 3 RLS negative cases |
| `wave3-realm-isolation.spec.ts` | Wave 3 realm isolation |
| `tenant-catalog-items.rls.integration.test.ts` | Catalog item RLS |
| `rls-catalog-items.smoke.integration.test.ts` | Catalog RLS smoke |
| `database-context.organization-identity.test.ts` | Org identity context tests |

### 11.5 Finding

org_id isolation architecture is **architecturally sound and comprehensively constrained**:
- Constitutional enforcement via `SET LOCAL` in every transaction
- Fail-closed middleware at every request entry point
- X-Tenant-Id bypass removed
- NOBYPASSRLS role enforced per transaction
- Multiple dedicated integration test suites
- Schema-level 1:1 anchor enforced

Runtime verification of the complete 20-sub-route surface under live conditions has not been
confirmed by this audit.

---

## §12 — Feature Flag / Capability Gate Findings

### 12.1 Schema

```prisma
model FeatureFlag {
  key             String                  @id @db.VarChar(100)
  enabled         Boolean                 @default(false)
  description     String?
  value           String?
  tenantOverrides TenantFeatureOverride[]
  @@map("feature_flags")
}

model TenantFeatureOverride {
  tenantId    String   @map("tenant_id") @db.Uuid
  key         String   @db.VarChar(100)
  enabled     Boolean
  @@unique([tenantId, key])
  @@map("tenant_feature_overrides")
}
```

### 12.2 NC pool gate (2-layer)

`server/src/middleware/ncPoolFeatureGate.middleware.ts` implements:
- **Layer 1:** Global `FeatureFlag` — key `nc.procurement_pools.enabled` must be `true`
- **Layer 2:** `TenantFeatureOverride` — per-tenant override; if no override → global flag is sufficient
- Fails closed if `orgId` cannot be resolved

### 12.3 TTP feature gate

`server/src/middleware/ttpFeatureGate.middleware.ts` — similar per-feature gate pattern.
Unit test confirmed: `ttp-feature-gate.middleware.unit.test.ts`.
Additional TTP gate unit tests: `ncPoolRfqFeatureGate.middleware.unit.test.ts`,
`ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts`,
`ncPoolSupplierQuoteFeatureGate.middleware.unit.test.ts`.

### 12.4 Runtime descriptor capability classification

Route groups are classified as `feature-gated` in the runtime descriptor:
`cart_commerce`, `rfq_sourcing`, `orders_operations`, `operational_workspace`, `network_commerce_pools`

These groups only appear in the shell navigation surface when the corresponding capability is
resolved as provisioned for the tenant.

### 12.5 Gap: new-tenant feature flag seeding

`services/tenantService.ts` does not expose a feature flag seeding operation. The activation
flow (`activateTenant`, `acceptAuthenticatedInvite`) provisions the tenant but the frontend
service layer does not confirm whether feature flags are auto-seeded for new tenants at activation.

The provisioning path for default feature flag state (global `FeatureFlag` table entries +
any initial `TenantFeatureOverride` entries) on new-tenant creation has not been confirmed
in this audit from the backend activation route.

---

## §13 — Subscription / Commercial Gate Findings

### 13.1 Schema — plan fields

Two plan fields exist in the schema:

| Field | Location | Type | Default | Notes |
|---|---|---|---|---|
| `Tenant.plan` | `tenants` table | `TenantPlan` enum (FREE, STARTER, PROFESSIONAL, ENTERPRISE) | FREE | On the Tenant Prisma model |
| `organizations.plan` | `organizations` table | `String` | 'FREE' | Canonical runtime source |

The `organizations` table has a 1:1 FK relationship with `tenants` — both represent the same
business entity, but plan is stored redundantly in both tables.

### 13.2 Canonical plan resolution path

`server/src/lib/database-context.ts` implements `getOrganizationIdentity()`:
1. Reads `organizations.plan` (String) via `withOrgAdminContext` (admin realm, read-only)
2. Passes through `canonicalizeTenantPlan()` → normalizes to TenantPlan enum
3. Exposes as `commercial_plan` and `plan` on `OrganizationIdentity` / `TenantSessionTransportIdentity`
4. `buildTenantSessionTransportIdentity()` builds the transport shape consumed by frontend JWT payload

`canonicalizeTenantPlan` is strict (throws on unknown plan value) — fail-closed.

### 13.3 Gap: dual plan field consistency

`Tenant.plan` (enum) and `organizations.plan` (String) are separate fields on separate tables.
If they drift (e.g., plan updated on one table but not the other), the frontend session transport
identity (derived from `organizations.plan`) would differ from direct `Tenant.plan` reads.

**Risk:** No constraint or trigger confirmed to enforce parity. Whether they are kept in sync by
the provisioning/activation path has not been confirmed in this audit.

### 13.4 No separate Subscription table

There is no `Subscription` or `CommercialPlan` table in the schema. Commercial plan state is
entirely carried by the `plan` field on `tenants` and `organizations`. This is a simpler
model, but means plan changes require coordinated updates to both tables.

### 13.5 TenantPublicEligibilityPosture

```prisma
enum TenantPublicEligibilityPosture {
  NO_PUBLIC_PRESENCE
  LIMITED_PUBLIC_PRESENCE
  PUBLICATION_ELIGIBLE
}
```
This field on `Tenant` governs public catalog visibility posture — separate from but related to
the commercial plan. The runtime descriptor surface selection also references `publicEligibilityPosture`.

---

## §14 — Tenant Admin / Settings Findings

### 14.1 Standard tenant SETTINGS surface

`appState === 'SETTINGS'` renders a **read-only** workspace profile:
- Fields displayed: tenant name, status, base family, public eligibility posture
- No form-based write surface for standard B2B/B2C tenants
- No plan display or plan change surface

### 14.2 TEAM_MGMT surface

`appState === 'TEAM_MGMT'` renders `<TeamManagement>`:
- Fetches all memberships and pending invites via `getMemberships()`
- Displays member list with roles
- Navigation affordance to INVITE_MEMBER
- Backend: `GET /api/tenant/memberships` (role-gated: OWNER, ADMIN, MEMBER; VIEWER denied)

### 14.3 INVITE_MEMBER surface

`appState === 'INVITE_MEMBER'` renders `<InviteMemberForm>`:
- Email input + role selector
- Calls `createMembership()` → `POST /api/tenant/memberships`
- OWNER / ADMIN only
- Backend returns invite token + email delivery status

### 14.4 White-label admin settings

For `isWhiteLabel === true` tenants, `appState === 'SETTINGS'` renders `<WhiteLabelSettings>`:
- Branding management (logo, theme JSON via `TenantBranding` table)
- Domain management (via `TenantDomain` table)
- Full write surface for WL-specific configuration

For `whiteLabelCapability === true`, `appState === 'WL_ADMIN'` provides a separate admin overlay.

### 14.5 Finding

The admin settings surface is **partially implemented**:
- Team management (list + invite + revoke): **present**
- White-label branding/domain config: **present** (WL tenants only)
- Read-only workspace profile: **present** (all tenants)
- Write-capable standard tenant config (name, plan, posture, verification data): **absent**

No formal "tenant settings" write surface exists for standard B2B/B2C tenants beyond team management
and WL-specific controls. This maps to T-5 as PARTIALLY_IMPLEMENTED.

---

## §15 — Test Coverage Findings

### 15.1 Tenant workspace integration tests

| Test | Coverage area |
|---|---|
| `tenant-activate.integration.test.ts` | Activation endpoint |
| `tenant-provision-approved-onboarding.integration.test.ts` | Approved-onboarding provisioning |
| `tenant-catalog-items.rls.integration.test.ts` | Catalog RLS under tenant context |
| `tenant-certifications-transition.g019.integration.test.ts` | Certification transitions |
| `orders.integration.test.ts` | Order routes |
| `escrow.g018.integration.test.ts` | Escrow routes |
| `trades.g017.integration.test.ts` | Trades routes |
| `settlement.g019.integration.test.ts` | Settlement routes |

### 15.2 RLS and isolation integration tests

`gate-d2` through `gate-d7` (6 RLS gate tests), `gate-e-1` through `gate-e-4` (auth/realm),
`wave3-realm-isolation.spec.ts`, `wave3-rls-negative.spec.ts`, `wave3-context.regression.spec.ts`,
`relationshipTenantIsolation.test.ts`, `rls-catalog-items.smoke.integration.test.ts`,
`database-context.organization-identity.test.ts`

### 15.3 Feature gate tests

`ncPoolFeatureGate.middleware.unit.test.ts`, `ncPoolRfqFeatureGate.middleware.unit.test.ts`,
`ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts`,
`ncPoolSupplierQuoteFeatureGate.middleware.unit.test.ts`,
`ttp-feature-gate.middleware.unit.test.ts`

### 15.4 Coverage gaps identified

- No unit test file specifically for `tenantContext.ts` (getTenantContext function)
- No dedicated end-to-end test for the full workspace load sequence (JWT → workspace shell render)
- Feature flag new-tenant seeding path not covered by observable test file
- Dual plan field sync (Tenant.plan vs organizations.plan) not covered by observable test file
- Write-capable standard tenant settings routes: not present (therefore not tested)

---

## §16 — MVP Checklist T-1 Through T-6 Mapping

| Item | Description | Priority | Classification | Evidence basis |
|---|---|---|---|---|
| T-1 | Supplier can log in and access workspace | P0 | `REQUIRES_RUNTIME_VERIFICATION` | JWT auth middleware fully implemented; membership check per request; 5 manifest families; 30+ routes; activation endpoint exists; tenant-activate.integration.test.ts present. Architecture sound. Runtime flow (sign-in → JWT → workspace load) not confirmed end-to-end. |
| T-2 | Tenant org_id correctly isolated in all routes | P0 | `REQUIRES_RUNTIME_VERIFICATION` | withDbContext + SET LOCAL app.org_id (constitutional); buildContextFromRequest fail-closed; NOBYPASSRLS role; X-Tenant-Id bypass removed; 13+ RLS/isolation integration tests; wave3 regression suite. Architecture sound. Live route-by-route runtime confirmation needed across all 20 sub-routes. |
| T-3 | Feature flags provision correctly for new tenants | P1 | `PARTIALLY_IMPLEMENTED` | FeatureFlag + TenantFeatureOverride schema present; NC 2-layer gate implemented; TTP gate implemented; route group capability classification present. New-tenant default flag seeding path (at activation time) not confirmed in backend activation route or provisioning test. |
| T-4 | Tenant plan/subscription metadata resolves correctly | P1 | `PARTIALLY_IMPLEMENTED` | TenantPlan enum (FREE/STARTER/PROFESSIONAL/ENTERPRISE); organizations.plan String; canonicalizeTenantPlan (strict); getOrganizationIdentity reads canonical plan; buildTenantSessionTransportIdentity exposes commercial_plan. Dual-table plan field (Tenant.plan vs organizations.plan) drift risk unresolved. No confirmed sync mechanism or constraint. |
| T-5 | Admin settings surface is accessible | P1 | `PARTIALLY_IMPLEMENTED` | Read-only workspace profile (SETTINGS state); TEAM_MGMT + INVITE_MEMBER as dedicated appState nodes; WhiteLabelSettings.tsx for WL tenants; getMemberships/createMembership implemented. No write-capable standard tenant configuration surface (name, plan, posture editing) for B2B/B2C tenants. |
| T-6 | Tenant context does not leak cross-tenant | P0 | `REQUIRES_RUNTIME_VERIFICATION` | SET LOCAL app.org_id (transaction-scoped); SET LOCAL ROLE texqtic_app (NOBYPASSRLS); app.bypass_rls='off' enforced; multiple gate-d* integration tests; wave3-rls-negative.spec.ts; wave3-realm-isolation.spec.ts; X-Tenant-Id removed; fail-closed middleware. Architecture sound. End-to-end cross-tenant negative test under live load not confirmed. |

### Classification legend used

| Classification | Meaning |
|---|---|
| `REQUIRES_RUNTIME_VERIFICATION` | Implementation fully present and architecturally sound; live runtime confirmation needed to close |
| `PARTIALLY_IMPLEMENTED` | Core infrastructure present; identified gaps in provisioning, sync, or write surface completeness |

---

## §17 — Gap Classification Table

| Gap ID | Gap description | Item | Severity | Nature |
|---|---|---|---|---|
| GAP-T1-01 | End-to-end sign-in → workspace shell load not runtime-verified | T-1 | P0 | Verification gap |
| GAP-T2-01 | 20 tenant sub-routes not individually runtime-verified for org_id isolation | T-2 | P0 | Verification gap |
| GAP-T3-01 | New-tenant default feature flag seeding path at activation not confirmed | T-3 | P1 | Implementation gap |
| GAP-T4-01 | Dual plan fields (Tenant.plan enum, organizations.plan String) with no confirmed sync mechanism | T-4 | P1 | Schema / sync gap |
| GAP-T5-01 | No write-capable standard tenant config surface (name, plan, posture) for B2B/B2C tenants | T-5 | P1 | Implementation gap |
| GAP-T6-01 | Cross-tenant isolation not runtime-verified under live multi-tenant load | T-6 | P0 | Verification gap |
| GAP-GEN-01 | tenantContext.ts (getTenantContext) has no dedicated unit test | General | P1 | Test coverage gap |
| GAP-GEN-02 | Full workspace load sequence (JWT → shell render) lacks end-to-end test | General | P1 | Test coverage gap |

---

## §18 — Risk Assessment

### R-01 — REQUIRES_RUNTIME_VERIFICATION items at P0 (High)

T-1, T-2, and T-6 are all P0 / LAUNCH_BLOCKER with classification `REQUIRES_RUNTIME_VERIFICATION`.
The implementation architecture is sound and comprehensive test coverage exists, but end-to-end
runtime confirmation under live conditions is needed before these items can be marked PROVEN_READY.

**Risk:** Without runtime verification, these items remain NOT_ASSESSED on the checklist, which
is a hard stop against launch authorization.

### R-02 — Dual plan field drift (Medium)

`Tenant.plan` (enum) and `organizations.plan` (String) are separate fields on separate tables
with no confirmed synchronization constraint or trigger. If provisioning code updates one and
not the other, the `commercial_plan` field in frontend session transport could diverge from
the direct tenant plan read.

**Risk:** Silent plan field drift could cause incorrect feature gating or UI inconsistency for
tenants whose plan has been updated. Needs targeted investigation.

### R-03 — New-tenant feature flag seeding (Medium)

The feature flag provisioning path for new tenants is not confirmed from the activation route
backend code. If flags are not seeded on activation, new tenants may have incorrect access
to feature-gated route groups, or may be incorrectly denied access to core groups.

**Risk:** Feature gate behavior for freshly activated tenants may not match expected provisioning.

### R-04 — Settings surface completeness (Low-Medium for launch)

T-5 is P1. The read-only settings surface and team management are present. However, the absence
of a write-capable standard tenant config surface means tenant admins cannot update their
workspace name or profile fields from within the platform. This is a usability gap.

**Risk:** Minimal for initial Surat pilot launch (settings can be managed via control plane by
platform operator), but should be addressed before scaling to self-serve onboarding.

### R-05 — App.tsx state surface complexity (Low)

Tenant state management concentrated in App.tsx (~8000+ lines) creates a high-risk single
file for future modifications. Any change to tenant auth state logic touches the same file
that drives all routing.

**Risk:** Maintenance risk; not a launch blocker. No immediate action required.

---

## §19 — Candidate Follow-Up Packets A Through E

**Selection basis:** The three P0 T-items (T-1, T-2, T-6) all classify as REQUIRES_RUNTIME_VERIFICATION.
The two P1 items (T-3, T-4) are PARTIALLY_IMPLEMENTED with unresolved gaps. T-5 (P1) is
PARTIALLY_IMPLEMENTED with a clear UI gap.

| Packet | Title | Primary items addressed | Read-only? | Priority |
|---|---|---|---|---|
| A | Tenant Workspace Shell Routing / Access Gate Implementation | T-1 | No — implementation | P0 |
| B | Tenant Context / org_id API Boundary Hardening | T-2, T-6 | No — implementation | P0 |
| C | Tenant Workspace Settings / Admin Surface Implementation | T-5 | No — implementation | P1 |
| D | Feature/Subscription Gate Alignment | T-3, T-4 | No — investigation + implementation | P1 |
| E | Runtime Verification Packet | T-1, T-2, T-6 | Yes — read-only | P0 |

**Packet A (routing/access gate implementation):** Addresses T-1 by verifying and hardening the
workspace load sequence. Requires source mutation — not appropriate as the immediate next bounded
packet before runtime verification establishes baseline.

**Packet B (org_id hardening):** Addresses T-2 and T-6 by implementing additional explicit
per-route org_id assertions. However, the architecture is already sound; hardening without
first verifying baseline may cause unnecessary churn.

**Packet C (settings surface):** Addresses T-5 (P1). Lower priority than P0 items. Not the
right immediate follow-on given 3 unresolved P0 items.

**Packet D (feature/subscription alignment):** Addresses T-3 and T-4 (both P1). Important gaps
but lower urgency than P0 REQUIRES_RUNTIME_VERIFICATION items.

**Packet E (runtime verification):** Addresses T-1, T-2, T-6 (all P0) by running the existing
integration test suites, confirming health check, and producing evidence. Read-only. No source
mutations. Converts REQUIRES_RUNTIME_VERIFICATION to PROVEN_READY (if tests pass) or surfaces
concrete failure evidence for targeted fixes.

---

## §20 — Selected Next Packet

**Selected: Packet E — Runtime Verification Packet**

**Rationale:**
1. T-1, T-2, and T-6 are all P0 / LAUNCH_BLOCKER and all classify as REQUIRES_RUNTIME_VERIFICATION.
   These must be resolved before launch authorization can proceed.
2. The implementation architecture for all three is sound and comprehensive test coverage exists.
   The correct next step is verification, not additional hardening.
3. A read-only verification packet produces evidence that either closes T-1, T-2, T-6 as
   PROVEN_READY (enabling launch progress) or produces targeted failure evidence that scopes
   a precise follow-on implementation packet (A or B).
4. Running source mutations (A or B) before establishing a verified baseline risks masking
   existing issues or introducing new regression vectors.
5. Packet D (T-3, T-4) addresses P1 gaps — lower urgency than P0 verification.

---

## §21 — Proposed Next Unit Title

`FAM-08-TENANT-CORE-WORKSPACE-RUNTIME-VERIFICATION-001`

---

## §22 — Proposed Next Unit Scope

**Read-only runtime verification for T-1, T-2, and T-6.**

The packet will:
1. Run the existing tenant workspace integration test suite targeting T-1 (auth + workspace access)
2. Run the RLS gate integration tests (gate-d2 through gate-d7) and realm isolation tests (wave3) targeting T-2 and T-6
3. Run `tenant-activate.integration.test.ts` and `tenant-provision-approved-onboarding.integration.test.ts`
4. Confirm `GET /health` returns 200
5. Record exact test run output (pass/fail/skip counts, any errors)
6. Classify T-1, T-2, T-6 based on test evidence: PROVEN_READY (all pass) or surface specific failures
7. Produce a single governance artifact recording all evidence

**This packet does NOT:**
- Modify any source files
- Modify any migration files
- Modify any RLS policies
- Advance FAM-07 hold
- Address T-3, T-4, or T-5 (reserved for follow-on Packet D/C after P0 items are closed)

---

## §23 — Proposed Next Unit Allowed Write Files

```
artifacts/launch-readiness/FAM-08-TENANT-CORE-WORKSPACE-RUNTIME-VERIFICATION-001.md
```

Only the artifact file. No source files. No migration files. No governance tracker files.

---

## §24 — Proposed Next Unit Forbidden Actions

| Forbidden action | Reason |
|---|---|
| Modifying any `server/src/` source files | Read-only verification packet |
| Modifying `server/prisma/schema.prisma` | Schema changes require separate authorized unit |
| Modifying `server/prisma/migrations/` | Migration history is immutable |
| Running `prisma migrate dev` or `prisma db push` | Forbidden — see AGENTS.md §6 |
| Modifying RLS policies | Constitutional constraint |
| Modifying `.env` or connection strings | Secrets governance |
| Weakening `org_id` filters | Constitutional |
| Updating governance tracker status (LAUNCH-FAMILY-INDEX.md, NEXT-ACTION.md) | FAM-08 cycle is not closed by the verification packet alone; tracker updates require Paresh authorization |
| Addressing T-3, T-4, or T-5 gaps | Out of scope for this packet |
| Creating any new source files | No file creep |
| Advancing FAM-07 hold or legal authority | FAM-07 hold preserved; legal authority absent |

---

## §25 — Validation Evidence

### Preflight commands executed during this audit

```
git -C "C:/Users/PARESH/TexQtic" status --short
→ clean tree (confirmed)

git -C "C:/Users/PARESH/TexQtic" rev-parse --short HEAD
→ 4aa4bd16 (confirmed)

git -C "C:/Users/PARESH/TexQtic" merge-base --is-ancestor 4aa4bd16 HEAD
→ exit 0 (no divergence)
```

### Files read and verified (key sources)

All files listed in §3 were read directly via `read_file` tool.
No assumptions were made from memory alone.
All schema model names were confirmed against `server/prisma/schema.prisma`.
All appState values were confirmed against `App.tsx` line-range reads.
All route keys were confirmed against `runtime/sessionRuntimeDescriptor.ts`.
All sub-route plugin names were confirmed against `server/src/routes/tenant.ts` and directory listing.
All test file names were confirmed against `server/src/__tests__/` directory listing.

### Governance pointer confirmed

`governance/control/NEXT-ACTION.md` confirms FAM-08 as `READY_AFTER_POINTER_SYNC`.
`governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` confirms FAM-08 status as `NOT_ASSESSED | LAUNCH_BLOCKER`.

### Diff check

This audit creates only one new file:
```
artifacts/launch-readiness/FAM-08-TENANT-CORE-WORKSPACE-OPENING-REPO-TRUTH-AUDIT-001.md
```
No source files were modified. No governance tracker files were modified.
`artifacts/` is git-ignored — `git add -f` required at commit time.

---

## §26 — Status Preservation Statement

The following invariants are confirmed intact as of this audit:

| Invariant | Status |
|---|---|
| FAM-07 status | `PARTIALLY_IMPLEMENTED` — UNCHANGED |
| FAM-07 hold | `HOLD_FOR_HUMAN_LEGAL_INPUTS` — UNCHANGED |
| FTR-LEGAL-003 | `MVP_CRITICAL / OPEN` — UNCHANGED |
| Legal authority file (`governance/legal/fam-07/supplier-onboarding-terms-authority.json`) | ABSENT — UNCHANGED |
| FAM-07L14 | BLOCKED — UNCHANGED |
| FAM-08 status in LAUNCH-FAMILY-INDEX.md | `NOT_ASSESSED` — UNCHANGED (this audit does not close FAM-08) |
| DPP launch gate | `HOLD_FOR_PARESH_DECISION` — UNCHANGED |
| `governance/control/NEXT-ACTION.md` | NOT MODIFIED |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | NOT MODIFIED |
| All source files | NOT MODIFIED |
| All migration files | NOT MODIFIED |
| `PublicSupplierProfile.tsx` | NOT STAGED, NOT MODIFIED |

**This is a read-only audit. No source mutations. No legal authority created. No tracker status advanced.**

---

## §27 — Final Enum

```
FAM_08_TENANT_CORE_WORKSPACE_OPENING_AUDIT_COMPLETE
```
