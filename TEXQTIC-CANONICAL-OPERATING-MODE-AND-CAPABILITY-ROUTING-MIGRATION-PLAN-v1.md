# TEXQTIC — Canonical Operating Mode and Capability Routing Migration Plan v1

Status: Planning and validation only
Date: 2026-04-08
Basis: Repo truth, code-path truth, and runtime behavior already encoded in the repository
Exclusions: No governance documents used as evidence, no implementation changes, no product authority changes opened

## 1. Header

This artifact answers one planning question:

How should TexQtic migrate from the current hardcoded frontend mode and experience system to a canonical operating-mode plus capability-driven routing model, and what is the safest staged path to get there without destabilizing current tenant flows?

Short answer:

- A migration is justified now because backend identity truth already exists, but frontend routing still accepts a second identity source made from local hints, provisional stubs, and repo-truth white-label forcing.
- The safest path is not a rewrite. It is a staged consolidation: canonical session descriptor first, manifest-driven routing second, module extraction third, multi-app decisions later.

## 2. Scope and Method

This pass used repo truth only.

Inspected anchors:

- [App.tsx](App.tsx#L99)
- [layouts/Shells.tsx](layouts/Shells.tsx#L1)
- [components/Auth/AuthFlows.tsx](components/Auth/AuthFlows.tsx#L1)
- [components/WL/WLStorefront.tsx](components/WL/WLStorefront.tsx#L1)
- [components/WL/WLProductDetailPage.tsx](components/WL/WLProductDetailPage.tsx#L1)
- [components/WL/ProductGrid.tsx](components/WL/ProductGrid.tsx#L1)
- [contexts/CartContext.tsx](contexts/CartContext.tsx#L1)
- [services/authService.ts](services/authService.ts#L1)
- [services/tenantApiClient.ts](services/tenantApiClient.ts#L1)
- [services/catalogService.ts](services/catalogService.ts#L1)
- [services/cartService.ts](services/cartService.ts#L1)
- [services/controlPlaneService.ts](services/controlPlaneService.ts#L1)
- [server/src/routes/auth.ts](server/src/routes/auth.ts#L373)
- [server/src/routes/public.ts](server/src/routes/public.ts#L1)
- [server/src/routes/tenant.ts](server/src/routes/tenant.ts#L77)
- [server/src/lib/database-context.ts](server/src/lib/database-context.ts#L567)
- [middleware.ts](middleware.ts#L1)
- [api/index.ts](api/index.ts#L1)
- [types.ts](types.ts#L1)

Method:

1. Trace backend identity payloads from login and `/api/me` into frontend bootstrap and restore flows.
2. Trace shell selection from current tenant identity into `EXPERIENCE`, `WL_ADMIN`, and control-plane branches.
3. Trace how HOME surfaces diverge for aggregator, B2B, B2C, and white-label runtime paths.
4. Check whether repo truth already contains a public-entry or host-resolution direction separate from tenant runtime.
5. Propose a migration model that fits those existing code paths instead of assuming a fresh architecture.

## 3. Current-State Mode/Routing Diagnosis

### 3.1 Backend identity truth already exists

TexQtic already has a canonical backend identity path:

- Tenant login responses include `tenant_category` and `is_white_label` from organization identity reads in [server/src/routes/auth.ts](server/src/routes/auth.ts#L373) and [server/src/routes/auth.ts](server/src/routes/auth.ts#L1070).
- Tenant session restore uses `/api/me`, which returns a canonical tenant identity built by `resolveTenantSessionIdentity` in [server/src/routes/tenant.ts](server/src/routes/tenant.ts#L77) and exposed by [server/src/routes/tenant.ts](server/src/routes/tenant.ts#L396).
- Canonical organization metadata comes from `getOrganizationIdentity` in [server/src/lib/database-context.ts](server/src/lib/database-context.ts#L567).

This means the backend is already capable of being the authority.

### 3.2 The frontend still accepts a second identity authority

The main identity problem is in [App.tsx](App.tsx#L99):

- Hardcoded white-label repo-truth forcing exists via `WL_REPO_TRUTH_SLUGS` and `WL_REPO_TRUTH_NAMES` in [App.tsx](App.tsx#L99).
- `resolveRepoTruthTenantHint` can turn slug or name into `is_white_label: true` in [App.tsx](App.tsx#L283).
- `persistTenantIdentityHint` stores identity hints in local storage and can persist WL truth outside backend payloads in [App.tsx](App.tsx#L298).
- `normalizeTenantIdentity` merges backend data, passed hints, stored hints, and repo-truth hints in [App.tsx](App.tsx#L346).
- `buildBootstrapTenantStub` can create a provisional tenant using JWT claims plus stored hints before `/api/me` returns in [App.tsx](App.tsx#L376).

Result:

- Backend identity is present.
- Frontend still composes a competing identity layer.
- White-label behavior can be activated or preserved by slug or name normalization and persisted hints even when backend truth says otherwise.

### 3.3 Shell selection is centralized but still fed by mixed truth

The shell policy is explicit in `resolveExperienceShell` in [App.tsx](App.tsx#L486):

- `AGGREGATOR` -> `AggregatorShell`
- `B2B` -> `WhiteLabelShell` when `is_white_label`, else `B2BShell`
- `B2C` -> `WhiteLabelShell` when `is_white_label`, else `B2CShell`
- `INTERNAL` -> `AggregatorShell`

That is a real policy function, but it does not solve the identity problem because the inputs can already be client-normalized rather than backend-canonical.

### 3.4 Bootstrap and restore flows can enter the wrong runtime early

The current restore and login paths prioritize provisional runtime entry:

- Tenant restore in [App.tsx](App.tsx#L1566) can create a provisional tenant stub before canonical `/api/me` returns.
- Login success in [App.tsx](App.tsx#L1720) persists resolved tenant hints and uses provisional bootstrap state for first paint.
- `resolveBootstrapTenantType` falls back to `B2B` when white-label is true, otherwise `AGGREGATOR`, if category or type is unknown in [App.tsx](App.tsx#L376).

This is the main source of runtime drift during login, refresh, and impersonation.

### 3.5 `App.tsx` is effectively a God-file runtime coordinator

[App.tsx](App.tsx#L759) currently owns:

- auth realm selection
- app-state switching
- tenant bootstrap and restore
- shell selection
- white-label admin entry
- control-plane entry
- experience subview switching
- catalog loading policy
- cart drawer orchestration
- RFQ routing
- impersonation flow

This is more than route selection. It is the current runtime coordinator for the whole SPA.

### 3.6 Current HOME behavior already maps to distinct runtime families

The repo does not behave like one flat tenant parity model.

Inside `renderExperienceContent` in [App.tsx](App.tsx#L2679), HOME splits into materially different families:

- White-label HOME routes to `WLStorefront` first in [App.tsx](App.tsx#L2827).
- Aggregator and internal HOME route to `AggregatorDiscoveryWorkspace` in [App.tsx](App.tsx#L2842).
- B2B HOME renders a wholesale workspace with catalog management plus RFQ surfaces in [App.tsx](App.tsx#L2852).
- B2C HOME renders a retail-style browse storefront in [App.tsx](App.tsx#L3044).

This effectively means the runtime families are already closer to:

- control plane
- aggregator workspace
- non-WL B2B workspace
- non-WL B2C storefront
- white-label storefront
- white-label admin overlay

### 3.7 White-label admin is an overlay, not a tenant category

`WL_ADMIN` is a separate app state in [App.tsx](App.tsx#L759), entered by role plus white-label capability:

- Access is granted by `canAccessWlAdmin(is_white_label, role)` in [App.tsx](App.tsx#L130).
- The shell is `WhiteLabelAdminShell` in [layouts/Shells.tsx](layouts/Shells.tsx#L160).
- Its content is rendered separately in [App.tsx](App.tsx#L2527).

This is already telling the correct architectural story: WL admin is a role overlay on top of a white-label-capable tenant, not a base tenant category.

### 3.8 Public entry and tenant runtime are not cleanly separated yet

The repository contains host-based tenant resolution in [middleware.ts](middleware.ts#L1) and registers it in the Vercel server entry via [api/index.ts](api/index.ts#L118). That shows a future direction for public-entry routing.

But the current storefront code still runs inside tenant-authenticated runtime:

- `WLStorefront` fetches catalog via tenant-scoped APIs in [components/WL/WLStorefront.tsx](components/WL/WLStorefront.tsx#L1).
- Catalog and cart services both require tenant realm through [services/tenantApiClient.ts](services/tenantApiClient.ts#L1).
- `CartProvider` assumes authenticated cart access in [contexts/CartContext.tsx](contexts/CartContext.tsx#L1).

So the repo already has host-resolution infrastructure, but it does not yet have a clean public storefront app boundary.

### 3.9 Plan tier is present but should not be a routing determinant

Commercial plan exists and is normalized in [types.ts](types.ts#L33), but the runtime language still mixes plan and operating mode:

- `ENTERPRISE` remains a plan.
- `B2BShell` still labels itself as enterprise management in [layouts/Shells.tsx](layouts/Shells.tsx#L53).
- `ENTERPRISE_HOME_*` constants in [App.tsx](App.tsx#L117) actually mean B2B workspace catalog behavior, not plan-tier behavior.

That naming overlap is a taxonomy problem and should be removed.

## 4. Canonical Target Model

The clean target model should separate six concerns that are currently mixed together:

1. Commercial plan
2. Tenant category
3. White-label capability
4. Operating mode
5. Role overlays
6. Public-entry resolution

Recommended target model:

```ts
type CommercialPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

type TenantCategory = 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL';

type TenantOperatingMode =
  | 'CONTROL_PLANE'
  | 'AGGREGATOR_WORKSPACE'
  | 'B2B_WORKSPACE'
  | 'B2C_STOREFRONT'
  | 'WL_STOREFRONT';

type RuntimeOverlay =
  | 'WL_ADMIN'
  | 'TEAM_MANAGEMENT'
  | 'SETTINGS'
  | 'NONE';

type RouteManifestKey =
  | 'control_plane'
  | 'aggregator_workspace'
  | 'b2b_workspace'
  | 'b2c_storefront'
  | 'wl_storefront'
  | 'wl_admin';

interface SessionCapabilities {
  surface: {
    workspace: boolean;
    storefront: boolean;
    wlAdmin: boolean;
  };
  feature: {
    cart: boolean;
    rfq: boolean;
    sellerCatalog: boolean;
    buyerCatalog: boolean;
  };
  platform: {
    domains: boolean;
    branding: boolean;
    discovery: boolean;
  };
}

interface SessionRuntimeDescriptor {
  realm: 'TENANT' | 'CONTROL_PLANE';
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  tenantCategory: TenantCategory | null;
  commercialPlan: CommercialPlan | null;
  isWhiteLabel: boolean;
  operatingMode: TenantOperatingMode | null;
  overlays: RuntimeOverlay[];
  capabilities: SessionCapabilities;
  routeManifestKey: RouteManifestKey | null;
}
```

Target rules:

- The backend should be the authority for session identity now and for operating mode in the target state.
- If the backend does not immediately emit `operatingMode`, the frontend may temporarily derive it in one adapter from canonical backend fields only.
- The frontend must never again derive operating mode from slug, name, local storage hints, plan tier, or provisional bootstrap stubs.
- `type` should become a compatibility alias only, then disappear from routing.
- `is_white_label` remains a capability flag, not a tenant category.
- `WL_ADMIN` remains an overlay, not a base operating mode family.
- Unknown or incomplete canonical identity must leave `operatingMode` and `routeManifestKey` unresolved and may render only a neutral loading or error boundary.

### 4.1 Operating Mode Ownership Contract

Operating mode ownership must be explicit.

- Temporary migration state: a frontend adapter may derive `operatingMode` from canonical backend identity fields only.
- Allowed temporary adapter inputs are backend-authenticated realm, canonical tenant category, white-label capability, and backend-authenticated role context.
- Target state: backend emits `operatingMode` directly as part of the session identity contract.
- Invalid operating-mode authorities are slug, tenant name, local storage hints, commercial plan, and provisional bootstrap stubs.
- This backend-to-adapter-to-backend transition is an intentional migration contract and must not remain implicit.

### 4.2 Public-Entry Modeling Decision Frame

`public` must not remain a loose routing term.

The next schema step must resolve one explicit model:

1. `publicEntryKind` is absent from the authenticated `SessionRuntimeDescriptor`, and public entry remains outside authenticated session modeling.
2. `publicEntryKind` is modeled in a separate pre-session entry-resolution contract that executes before authenticated session resolution.

Current repo truth already supports the second option as the stronger direction because host-based tenant resolution exists before session runtime handling in [middleware.ts](middleware.ts#L1). This artifact does not force final schema execution yet, but it does require the next schema pass to choose explicitly.

This distinction matters because later storefront or public-boundary separation depends on whether public entry is treated as gateway resolution or as part of authenticated runtime identity.

## 5. Taxonomy Cleanup Proposal

The following terms should be separated conceptually and in code:

| Current term | Problem | Target meaning |
| --- | --- | --- |
| `plan` / `ENTERPRISE` | Used informally as runtime shorthand | Billing tier only |
| `type` | Legacy and still used as routing fallback | Compatibility field only; replace with `tenantCategory` |
| `tenant_category` | Correct direction but still mixed with `type` | Canonical organization family |
| `is_white_label` | Sometimes treated like a mode | Capability flag only |
| `EXPERIENCE` | Hides multiple runtime families behind one label | Replace with explicit manifest-backed route groups |
| `enterprise` | Overloaded between plan and B2B workspace | Use `B2B_WORKSPACE` for runtime, `ENTERPRISE` for billing only |
| `storefront` | Used for both public and tenant-authenticated commerce views | Distinguish `public entry storefront` vs `tenant storefront runtime` |
| `workspace` | Mixed with storefront in one `EXPERIENCE` state | Authenticated tenant operational surface only |
| `admin` | Mixed between control-plane staff and WL back office | Separate `CONTROL_PLANE` and `WL_ADMIN` overlay |
| `public` | Not yet modeled as a first-class runtime concern | Entry surface and host-resolution concern only |

Recommended vocabulary:

- `commercialPlan`
- `tenantCategory`
- `whiteLabelCapability`
- `operatingMode`
- `runtimeOverlay`
- `routeManifestKey`
- `publicEntryKind`

## 6. Capability-Driven Routing Proposal

### 6.1 Replace shell switching with descriptor plus manifest resolution

The target routing model should be:

1. Backend returns canonical session descriptor inputs.
2. Frontend builds or receives one `SessionRuntimeDescriptor`.
3. A route resolver selects one manifest from that descriptor.
4. The manifest selects shell, default route, allowed routes, and overlays.
5. UI-only substate remains client-owned, but route authority does not.

Recommended manifest shape:

```ts
interface RouteManifestEntry {
  key: RouteManifestKey;
  shell: 'SuperAdminShell' | 'AggregatorShell' | 'B2BShell' | 'B2CShell' | 'WhiteLabelShell' | 'WhiteLabelAdminShell';
  defaultRoute: string;
  allowedRoutes: string[];
  overlays: RuntimeOverlay[];
  requiredSurfaceCapabilities: Array<keyof SessionCapabilities['surface']>;
  requiredFeatureCapabilities: Array<keyof SessionCapabilities['feature']>;
  requiredPlatformCapabilities: Array<keyof SessionCapabilities['platform']>;
}
```

### 6.2 Tiered Capability Taxonomy

Capabilities should be grouped intentionally rather than kept as one flat ambiguous list.

- Surface capabilities determine which runtime surface may render at all: `workspace`, `storefront`, `wlAdmin`.
- Feature capabilities determine what a valid surface may do once rendered: `cart`, `rfq`, `sellerCatalog`, `buyerCatalog`.
- Platform capabilities determine platform-managed extension surfaces: `domains`, `branding`, `discovery`.

Manifest consumption should follow the same layering:

- Shell and runtime-family selection should read surface capabilities first.
- Route availability inside a chosen surface should read feature capabilities next.
- Optional operational or platform panels should read platform capabilities explicitly.

Route manifests should consume capability groups intentionally. A new flat capability list should not be reintroduced.

### 6.3 What should determine route selection

Route selection should be determined by:

- backend realm
- backend tenant category
- backend white-label capability
- backend or adapter-derived operating mode
- backend role-derived overlays
- backend status when capability gating is required

### 6.4 What can remain client-derived

The client can still own:

- current URL and nested route
- search query
- tab state
- cart drawer open state
- modal state
- optimistic list pagination

These are view states, not identity states.

### 6.5 What must never again be client-inferred

The client must never again infer runtime identity from:

- slug
- tenant name
- persisted local identity hints
- JWT-only bootstrap fallbacks used as routing authority
- commercial plan labels
- provisional runtime stubs that change operating family before canonical identity is complete

### 6.6 Suggested manifest groups

The current repo truth supports these route-manifest families:

- `control_plane`
- `aggregator_workspace`
- `b2b_workspace`
- `b2c_storefront`
- `wl_storefront`
- `wl_admin`

This is a better reflection of current runtime behavior than one large `EXPERIENCE` switch.

### 6.7 Strict Unknown-Identity Rule

Unknown or incomplete canonical identity is a hard routing boundary.

- Unknown or incomplete canonical identity must render only a neutral loading or error boundary.
- No silent fallback shell is allowed.
- No provisional runtime inference may act as routing authority.
- No compatibility fallback may change operating family while canonical identity is unresolved.

This rule is non-negotiable because the migration must remove, not relocate, the current double-truth identity defect.

## 7. Shared vs Separated Module/App Proposal

Recommended near-term shape:

| Surface | Near-term shape | Later option | Why |
| --- | --- | --- | --- |
| Control plane | Distinct module in same repo | Separate deployable app | Already behaviorally separate and realm-separated |
| Aggregator workspace | Distinct tenant module | Remain in workspace app | Shares tenant auth and operational surfaces |
| B2B workspace | Distinct tenant module | Separate workspace app later | Shares tenant auth, catalog, RFQ, cart, orders |
| B2C storefront | Distinct commerce module | Separate storefront app later | Currently tenant-authenticated, not yet a true public app |
| WL storefront | Distinct commerce module | Separate public/storefront app later | Currently uses tenant realm services and cart |
| WL admin | Distinct admin overlay module | Separate app only if later justified | Role overlay on white-label-capable tenants |
| Auth and resolution gateway | Shared module now | Public-entry app or edge gateway later | Host resolution exists but UI boundary is not fully separated yet |
| Shared commerce engine | Shared package | Shared package | Catalog, cart, RFQ, checkout continuity must stay stable |
| Shared UI primitives | Shared package | Shared package | Shells, layout, and controls remain reusable |

Architecture direction supported by repo truth:

- Modular monorepo first
- Multi-app later
- Not an immediate hard split

Reason:

- `App.tsx` still centralizes auth, restore, impersonation, cart, catalog, and runtime selection.
- WL storefront and B2C storefront still depend on tenant-authenticated APIs and shared cart state.
- The repository already contains host-resolution groundwork, but not yet a clean public-entry runtime contract.
- An immediate hard split would force identity cleanup, routing cleanup, service extraction, and auth boundary redesign at the same time.

## 8. Staged Migration Sequence

### Stage 0 — Freeze and name the current runtime model

Goal:

- Stop pretending the app is one flat tenant experience.
- Name the current runtime families explicitly.

Output:

- Canonical runtime map derived from existing code paths.
- No behavioral change.

### Stage 1 — Introduce one canonical session runtime descriptor

Goal:

- Create one typed object that becomes the only routing input.

Actions:

- Define `tenantCategory`, `operatingMode`, `capabilities`, and `runtimeOverlay` types.
- Build an adapter from current backend responses.
- Remove slug or name forcing, stored identity hints, and provisional stub typing from routing authority.
- Keep current shells and components unchanged.

Safety rule:

- Unknown or incomplete canonical identity must render only a neutral loading or error boundary.
- No silent fallback to a different shell is allowed.
- No provisional runtime inference may act as routing authority during the transition.

### Stage 2 — Move shell selection behind the descriptor

Goal:

- Make shell resolution read only from canonical runtime descriptor.

Actions:

- Keep `resolveExperienceShell` policy intent.
- Change its inputs to descriptor values only.
- Turn `WL_ADMIN` into an overlay route group rather than a separately inferred runtime branch.

### Stage 3 — Introduce route manifests without moving product code yet

Goal:

- Break the `App.tsx` God-switch into explicit manifest-backed route groups.

Actions:

- Extract `EXPERIENCE` route families into manifest modules.
- Map current `expView` entries into manifest routes.
- Keep the underlying components unchanged.

Outcome:

- Routing logic becomes explicit before module extraction begins.

### Stage 4 — Extract runtime-family modules

Goal:

- Move each runtime family into its own module boundary.

Actions:

- Extract modules for control plane, aggregator workspace, B2B workspace, B2C storefront, WL storefront, and WL admin.
- Keep shared services for auth, catalog, cart, RFQ, and orders.

Outcome:

- App coordination shrinks.
- Mode-specific ownership becomes visible.

### Stage 5 — Evaluate separate deployables only after routing truth is stable

Goal:

- Decide whether any module should become a separate app.

Recommended order if separation later happens:

1. Control plane app
2. Public-entry or storefront app
3. Tenant workspace app split only if needed

Condition:

- Do not separate deployables until identity, route manifests, and shared commerce services are already stable.

## 9. Risk Map

Non-negotiable guardrail: the worst migration failure mode is prolonged double-truth routing where old frontend normalization and new canonical descriptor logic both remain active.

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Prolonged double-truth routing during migration | Old frontend normalization and new canonical descriptor logic can disagree on shell, overlay, and operating family | Cut routing authority over to one canonical descriptor before manifest rollout; do not run both systems as competing authorities |
| WL regressions while backend truth is inconsistent | Current WL behavior can still be preserved by client forcing | Move compatibility handling to server-side truth or explicit temporary adapter rules |
| Auth and restore regressions | Login, refresh, and impersonation currently rely on provisional bootstrap entry | Replace bootstrap routing authority with neutral restore gate plus canonical session descriptor |
| Cart and RFQ continuity regressions | Storefront and workspace share tenant APIs today | Keep service layer shared while only routing logic changes |
| Taxonomy confusion during rollout | `enterprise`, `type`, `tenant_category`, and WL language already overlap | Publish one canonical vocabulary and remove old runtime labels incrementally |
| Premature public app split | Middleware supports host resolution, but storefronts are still tenant-authenticated | Delay public-entry separation until service and auth contracts are explicit |

The single highest migration risk is a prolonged double-truth period where old frontend identity normalization and new canonical descriptor logic run at the same time.

That failure mode would cause wrong shell entry, wrong white-label behavior, and potentially incorrect WL admin exposure during login, refresh, or impersonation.

## 10. What Should Not Be Done Immediately

The following should not happen in the next step:

- No instant full rewrite of `App.tsx`
- No immediate micro-frontend or hard multi-app split
- No plan-tier-driven routing
- No continued slug or name-based white-label forcing
- No reliance on persisted local identity hints as routing truth
- No mixing public gateway redesign with core routing cleanup in one step
- No extraction of catalog, cart, or RFQ services before route authority is stabilized

## 11. Single Recommended Next Implementation-Planning Move

Recommended next move:

`CANONICAL_MODE_TYPE_AND_CAPABILITY_SCHEMA_DESIGN`

Why this is the right next planning step:

- TexQtic already has backend canonical identity fields, so the next planning bottleneck is not discovering more runtime behavior.
- The missing piece is a precise shared schema that separates `commercialPlan`, `tenantCategory`, `isWhiteLabel`, `operatingMode`, `runtimeOverlay`, and `capabilities`.
- That schema is the prerequisite for both foundation correction and manifest-driven routing.
- If the repo skips this step and goes straight to router or module extraction, it will recreate today’s ambiguity in a new structure.

Expected output of that next planning step:

- exact type model
- exact field ownership by backend vs frontend
- exact temporary adapter rules for current payloads
- exact public-entry modeling decision
- exact capability tier definitions
- exact mapping from current runtime families to manifest keys
- exact unknown-identity handling rule
- exact migration guardrails that prevent double-truth routing

## 12. Footer

REPO_TRUTH_AND_RUNTIME_VALIDATION_BASED

NO_GOVERNANCE_DOCS_USED_AS_EVIDENCE

NO_PRODUCT_FILES_TOUCHED

If committed, use:

`governance: add canonical operating mode migration plan`