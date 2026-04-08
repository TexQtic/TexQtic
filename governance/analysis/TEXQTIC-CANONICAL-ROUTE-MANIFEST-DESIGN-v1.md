# TEXQTIC — Canonical Route Manifest Design v1

Status: Planning and route-manifest design only
Date: 2026-04-08
Basis: Repo truth, code-path truth, accepted planning direction from [TEXQTIC-CANONICAL-OPERATING-MODE-AND-CAPABILITY-ROUTING-MIGRATION-PLAN-v1.md](../../TEXQTIC-CANONICAL-OPERATING-MODE-AND-CAPABILITY-ROUTING-MIGRATION-PLAN-v1.md), and binding schema inputs from [TEXQTIC-CANONICAL-MODE-TYPE-AND-CAPABILITY-SCHEMA-DESIGN-v1.md](TEXQTIC-CANONICAL-MODE-TYPE-AND-CAPABILITY-SCHEMA-DESIGN-v1.md)
Evidence rule: No governance documents used as evidence for runtime claims in this artifact
Implementation scope: None

## 1. Purpose and Decision Context

This artifact defines manifest-backed routing design on top of the already accepted canonical schema contract.

It exists to describe how TexQtic should move from current `App.tsx` runtime coordination and `EXPERIENCE` switching into manifest-backed route families without reopening:

- schema vocabulary
- field ownership
- capability tiering
- unknown-identity hard-stop behavior
- double-truth prevention rules

This pass does not treat the uncommitted state of prior accepted planning artifacts as a blocker. Their accepted contents are binding planning context for this document.

This pass is planning only. It does not create runtime manifests in code and does not modify product files.

## 2. Inputs From The Accepted Schema Contract

The following accepted schema inputs are binding for manifest design:

- `SessionRuntimeDescriptor` is the sole routing authority.
- `operatingMode` is the canonical runtime-family selector.
- `runtimeOverlays` refine routing but do not replace base operating mode.
- `routeManifestKey` is the manifest selection key derived from canonical descriptor truth.
- capability tiers remain separated into `surface`, `feature`, and `platform`.
- unknown or incomplete identity is a hard-stop state and must not select any manifest.
- `publicEntryKind` is a separate pre-session concern, not an authenticated session-routing field.
- `WL_ADMIN` is an overlay on `WL_STOREFRONT`, not a base operating mode.

Manifest design therefore inherits these non-negotiable constraints:

- no slug, name, local storage hint, or bootstrap stub may participate in manifest selection
- no plan-tier language may participate in manifest selection
- no legacy and canonical routing systems may make independent runtime-family decisions at the same time

## 3. Manifest Design Goals

Route manifests must accomplish all of the following:

- replace broad `EXPERIENCE` switching with explicit manifest families
- separate shell selection from client UI state
- separate runtime-family entry from route availability inside a chosen family
- support overlay-aware manifest selection
- preserve a later bridge into module-boundary extraction
- avoid reintroducing double-truth routing

Route manifests are not meant to become a new source of identity truth. They are consumers of the canonical descriptor.

## 4. Exact Manifest Structure Proposal

The route-manifest design should use a structure that preserves tiered capability gating and overlay-aware selection.

```ts
export type ShellFamily =
  | 'SuperAdminShell'
  | 'AggregatorShell'
  | 'B2BShell'
  | 'B2CShell'
  | 'WhiteLabelShell'
  | 'WhiteLabelAdminShell';

export type RouteGroupClassification =
  | 'family-core'
  | 'feature-gated'
  | 'platform-gated'
  | 'overlay-only';

export type RouteGroupKey =
  | 'home_landing'
  | 'catalog_browse'
  | 'cart_commerce'
  | 'rfq_sourcing'
  | 'orders_operations'
  | 'operational_workspace'
  | 'admin_branding_domains'
  | 'control_plane_operations';

export interface RouteCapabilityRule {
  surface?: Array<keyof SurfaceCapabilities>;
  feature?: Array<keyof FeatureCapabilities>;
  platform?: Array<keyof PlatformCapabilities>;
  overlays?: RuntimeOverlay[];
  notes?: string;
}

export interface RouteDefinition {
  key: string;
  group: RouteGroupKey;
  title: string;
  defaultForGroup?: boolean;
  capabilityRule?: RouteCapabilityRule;
  legacyStateMapping?: string[];
}

export interface RouteGroupDefinition {
  key: RouteGroupKey;
  classification: RouteGroupClassification;
  description: string;
  routes: RouteDefinition[];
}

export interface RouteManifestEntry {
  key: RouteManifestKey;
  baseOperatingMode: TenantOperatingMode;
  requiredOverlays: RuntimeOverlay[];
  overlayDriven: boolean;
  shellFamily: ShellFamily;
  defaultRoute: string;
  allowedRouteGroups: RouteGroupKey[];
  requiredSurfaceCapabilities: Array<keyof SurfaceCapabilities>;
  routeGroups: RouteGroupDefinition[];
}

export interface RouteManifestSelectionResult {
  manifestKey: RouteManifestKey | null;
  manifest: RouteManifestEntry | null;
  blockedReason: 'UNRESOLVED_IDENTITY' | 'CAPABILITY_MISMATCH' | null;
}
```

Structure decisions:

- `RouteManifestEntry` is keyed by `routeManifestKey`, not by legacy app state.
- overlays refine manifest selection through `requiredOverlays`, but `baseOperatingMode` remains stable.
- `requiredSurfaceCapabilities` are manifest-level entry guards.
- route-level gating stays inside `RouteCapabilityRule` and remains tier-aware.
- `legacyStateMapping` exists for planning traceability only. It is not target routing authority.

## 5. Manifest Selection Pipeline

Manifest selection order is fixed.

1. Identity is resolved into `SessionRuntimeDescriptor`.
2. Unknown or incomplete identity gate is checked first.
3. `operatingMode` resolves the base runtime family.
4. `surface` capabilities confirm that family may render.
5. `runtimeOverlays` refine manifest selection where applicable.
6. `routeManifestKey` is selected.
7. `feature` capabilities gate routes within the selected manifest.
8. `platform` capabilities gate optional platform-managed surfaces.

After step 8, client UI state may shape view-local behavior only.

Client UI state does not participate in:

- runtime-family choice
- shell selection
- manifest-family choice
- overlay choice

## 6. Canonical Manifest Families

### 6.1 `control_plane`

- Base `operatingMode`: `CONTROL_PLANE`
- Overlay-driven or base-driven: base-driven
- Shell family: `SuperAdminShell`
- Default route intent: tenant registry or control-plane landing
- Broad route-group responsibilities: tenant registry, oversight, governance, health, finance, events, RBAC
- Capability expectations: no tenant-family surface capability dependency; manifest selected directly from control-plane operating mode
- Outside manifest as client UI state: row detail expansion, modal dialogs, transient filters, scoped panel UI state

### 6.2 `aggregator_workspace`

- Base `operatingMode`: `AGGREGATOR_WORKSPACE`
- Overlay-driven or base-driven: base-driven
- Shell family: `AggregatorShell`
- Default route intent: aggregator home or discovery landing
- Broad route-group responsibilities: discovery-led home, tenant operational workspace panels, workspace navigation
- Capability expectations: requires `surface.workspace`; `platform.discovery` may gate discovery affordances explicitly
- Outside manifest as client UI state: search inputs, panel-local filters, modal forms, local selection state

### 6.3 `b2b_workspace`

- Base `operatingMode`: `B2B_WORKSPACE`
- Overlay-driven or base-driven: base-driven
- Shell family: `B2BShell`
- Default route intent: B2B home or catalog workspace landing
- Broad route-group responsibilities: wholesale catalog, RFQ sourcing, order operations, operational workspace panels
- Capability expectations: requires `surface.workspace`; `feature.sellerCatalog`, `feature.rfq`, and other route rules gate in-family surfaces
- Outside manifest as client UI state: add-item forms, inline edit state, dialogs, pagination, card-local state

### 6.4 `b2c_storefront`

- Base `operatingMode`: `B2C_STOREFRONT`
- Overlay-driven or base-driven: base-driven
- Shell family: `B2CShell`
- Default route intent: storefront landing or browse home
- Broad route-group responsibilities: browse landing, catalog browse, cart-commerce entry points, buyer-facing sourcing where present
- Capability expectations: requires `surface.storefront`; `feature.cart` and `feature.buyerCatalog` gate in-family commerce routes
- Outside manifest as client UI state: hero-scroll state, search query, cart drawer open state, product-card transient state

### 6.5 `wl_storefront`

- Base `operatingMode`: `WL_STOREFRONT`
- Overlay-driven or base-driven: base-driven
- Shell family: `WhiteLabelShell`
- Default route intent: WL storefront landing or products home
- Broad route-group responsibilities: branded storefront browse, product detail, cart-commerce entry points, buyer RFQ entry points
- Capability expectations: requires `surface.storefront`; `feature.cart`, `feature.rfq`, and `platform.branding` matter inside the family
- Outside manifest as client UI state: product-detail local state when not yet routed explicitly, cart drawer state, search/filter transient state

### 6.6 `wl_admin`

- Base `operatingMode`: `WL_STOREFRONT`
- Overlay-driven or base-driven: overlay-driven
- Shell family: `WhiteLabelAdminShell`
- Default route intent: store profile or branding landing
- Broad route-group responsibilities: white-label back office, branding, staff, products, collections, orders, domains
- Capability expectations: requires `surface.wlAdmin`; `platform.branding` and `platform.domains` gate platform-managed panels explicitly
- Outside manifest as client UI state: invite dialog state, form draft state, modal confirmation state, local table interactions

## 7. Route-Group Design By Family

Planning-level route groups below are repo-grounded and intentionally avoid inventing implementation paths.

### 7.1 `control_plane`

- Family-core:
  - `control_plane_operations`
  - responsibilities: tenant registry, audit logs, disputes, trades, health, flags, AI governance, events, RBAC
- Feature-gated:
  - none introduced by schema v1 as tenant feature capability rules
- Platform-gated:
  - control-plane platform management panels may later be grouped explicitly, but current repo truth keeps them inside control-plane operations
- Overlay-only:
  - none

Current repo-grounded admin view anchors include `TENANTS`, `LOGS`, `FINANCE`, `AI`, `HEALTH`, `FLAGS`, `COMPLIANCE`, `CASES`, `TRADES`, `ESCALATIONS`, `CERTIFICATIONS`, `TRACEABILITY`, `CART_SUMMARIES`, `ESCROW_ADMIN`, `SETTLEMENT_ADMIN`, `MAKER_CHECKER`, `RBAC`, and `EVENTS`.

### 7.2 `aggregator_workspace`

- Family-core:
  - `home_landing`
  - `operational_workspace`
  - responsibilities: aggregator discovery home plus current tenant operational panels already coordinated around the workspace shell
- Feature-gated:
  - none required by schema v1 baseline to enter the family
- Platform-gated:
  - `discovery` where explicitly separated later
- Overlay-only:
  - none

Current repo-grounded route anchors include `HOME`, `ORDERS`, `DPP`, `ESCROW`, `ESCALATIONS`, `SETTLEMENT`, `CERTIFICATIONS`, `TRACEABILITY`, `AUDIT_LOGS`, and `TRADES`.

### 7.3 `b2b_workspace`

- Family-core:
  - `home_landing`
  - `orders_operations`
  - `operational_workspace`
- Feature-gated:
  - `catalog_browse` gated by `feature.sellerCatalog`
  - `rfq_sourcing` gated by `feature.rfq`
- Platform-gated:
  - none required for base B2B workspace entry in schema v1
- Overlay-only:
  - none

Current repo-grounded route anchors include `HOME`, `ORDERS`, `RFQS`, `SUPPLIER_RFQ_INBOX`, `DPP`, `ESCROW`, `ESCALATIONS`, `SETTLEMENT`, `CERTIFICATIONS`, `TRACEABILITY`, `AUDIT_LOGS`, and `TRADES`.

### 7.4 `b2c_storefront`

- Family-core:
  - `home_landing`
  - `catalog_browse`
- Feature-gated:
  - `cart_commerce` gated by `feature.cart`
  - `rfq_sourcing` only where buyer-facing sourcing remains valid
- Platform-gated:
  - none required for base storefront entry in schema v1
- Overlay-only:
  - none

Current repo-grounded route anchors are primarily `HOME` and cart-commerce behavior, with browse rendering plus buyer-facing commerce entry points.

### 7.5 `wl_storefront`

- Family-core:
  - `home_landing`
  - `catalog_browse`
- Feature-gated:
  - `cart_commerce` gated by `feature.cart`
  - `rfq_sourcing` gated by `feature.rfq`
- Platform-gated:
  - branded storefront affordances tied to `platform.branding`
- Overlay-only:
  - none in the base storefront manifest

Current repo-grounded route anchors include branded storefront home, product browse, product detail, buyer RFQ entry points, and cart entry points.

### 7.6 `wl_admin`

- Family-core:
  - none outside overlay-specific responsibilities
- Feature-gated:
  - product and order management where they depend on catalog or order feature availability
- Platform-gated:
  - `admin_branding_domains` gated by `platform.branding` and `platform.domains`
- Overlay-only:
  - `admin_branding_domains`
  - staff management
  - products
  - collections
  - orders

Current repo-grounded WL admin anchors are `BRANDING`, `STAFF`, `PRODUCTS`, `COLLECTIONS`, `ORDERS`, and `DOMAINS`.

## 8. Overlay Handling Rules

Overlay handling is fixed by manifest design.

- `WL_ADMIN` is an overlay on `WL_STOREFRONT`, not a base operating mode.
- overlays may change `routeManifestKey` and allowed route groups.
- overlays must not rewrite base `operatingMode`.
- overlays may change shell family only through overlay-aware manifest selection.
- client navigation state must not be modeled as overlay.
- `TEAM_MGMT`, `SETTINGS`, invite flows, modal dialogs, search state, and drawer state are not overlays.

Overlay-aware selection rule:

- when `operatingMode = WL_STOREFRONT` and `runtimeOverlays = ['WL_ADMIN']`, the selected manifest key is `wl_admin`
- when `operatingMode = WL_STOREFRONT` and no overlay is present, the selected manifest key is `wl_storefront`

No other overlay family is introduced by this artifact.

## 9. Unknown Identity And Fallback Rules

The schema hard-stop rule applies directly to manifest design.

- no manifest selection is allowed on unresolved identity
- no fallback shell is allowed
- no provisional family substitution is allowed
- no compatibility inference may produce manifest choice
- unresolved identity must leave `routeManifestKey` unresolved
- unresolved identity must block shell-family resolution

Manifest design must therefore treat unresolved descriptor state as pre-manifest, not as an opportunity for compatibility routing.

## 10. Compatibility And Migration Rules

Route-manifest design coexists with current runtime only as a planning translation layer.

- manifest design assumes canonical descriptor authority
- current `EXPERIENCE` switch is legacy structure to be replaced, not preserved as co-authority
- migration must not let old `App.tsx` routing and new manifest routing make independent family decisions
- legacy constructs may be mapped for planning traceability, but not treated as target truth

Planning translation rules:

- `appState`, `expView`, `adminView`, and `wlAdminView` may be mapped into planning route groups to explain current behavior
- those legacy values are not valid future routing authorities
- no manifest family may be defined from legacy values alone

## 11. `App.tsx` Decomposition Implications

This section defines responsibility boundaries only. It is not an implementation plan.

### 11.1 Manifest-layer responsibilities

- shell-family selection from `routeManifestKey`
- default-route selection within a chosen family
- route-group registration by family
- route-to-capability gating
- overlay-aware manifest selection

### 11.2 Session-resolution responsibilities

- build `SessionRuntimeDescriptor` from backend truth and allowed temporary adapter rules
- enforce unknown-identity hard-stop before any manifest selection
- hand off from pre-session public-entry resolution to authenticated descriptor resolution

### 11.3 Client UI state responsibilities

- search text
- modal and drawer state
- pagination and card-local expansion state
- transient form state
- view-local filters and selections

### 11.4 Service And Data Concerns Outside Route Manifests

- auth flows and session restore
- tenant resolution and impersonation services
- catalog, cart, RFQ, and order data services
- control-plane data services
- fetch orchestration and persistence

Route manifests should not absorb service orchestration concerns.

## 12. Public-Entry Boundary Note

`publicEntryKind` remains a separate pre-session concern.

Manifest design may note only one handoff point:

- pre-session entry resolution determines public-entry context
- authenticated session resolution determines `SessionRuntimeDescriptor`
- route-manifest selection begins only after authenticated descriptor truth is available

This artifact does not redesign gateway or edge behavior in detail.

## 13. Route-Manifest Acceptance Criteria

This planning artifact is complete only if all of the following are true:

- all manifest families are defined
- the selection pipeline is fixed
- overlay handling is fixed
- route-group boundaries are fixed at planning level
- capability gating rules are fixed
- unknown-identity behavior is fixed
- no schema-contract question is reopened
- no double-truth routing loophole is introduced

## Footer

REPO_TRUTH_AND_RUNTIME_VALIDATION_BASED

NO_GOVERNANCE_DOCS_USED_AS_EVIDENCE

NO_PRODUCT_FILES_TOUCHED