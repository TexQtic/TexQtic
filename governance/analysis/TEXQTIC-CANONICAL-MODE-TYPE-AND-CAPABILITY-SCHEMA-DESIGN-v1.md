# TEXQTIC — Canonical Mode Type And Capability Schema Design v1

Status: Planning and schema-contract design only
Date: 2026-04-08
Basis: Repo truth, code-path truth, and approved planning direction from [TEXQTIC-CANONICAL-OPERATING-MODE-AND-CAPABILITY-ROUTING-MIGRATION-PLAN-v1.md](../../TEXQTIC-CANONICAL-OPERATING-MODE-AND-CAPABILITY-ROUTING-MIGRATION-PLAN-v1.md)
Evidence rule: No governance documents used as evidence for runtime claims in this artifact
Implementation scope: None

## 1. Purpose and Decision Context

This artifact defines the canonical runtime descriptor and field-ownership contract that will replace frontend double-truth routing.

It exists to convert the already-approved migration direction into one exact schema contract that later planning passes can build on without reopening:

- field meaning
- field ownership
- capability grouping
- public-entry modeling direction
- unknown-identity behavior
- double-truth prevention rules

Repo truth already establishes the underlying problem:

- backend canonical identity exists through tenant login payloads and `/api/me`
- frontend runtime entry still accepts a second identity layer built from local hints, provisional bootstrap stubs, and white-label slug or name forcing
- shell selection and HOME surface behavior already encode multiple runtime families

The purpose of this artifact is therefore not to redesign product flows. It is to define the sole routing-authority schema that later foundation correction and route-manifest design must use.

## 2. Canonical Vocabulary

Each term below has one meaning only.

| Term | Meaning | Not allowed to mean |
| --- | --- | --- |
| `commercialPlan` | Billing tier only | Runtime family, shell, or route authority |
| `tenantCategory` | Canonical backend organization family anchor | White-label capability, plan tier, or overlay |
| `whiteLabelCapability` | Canonical backend capability signal for white-label behavior | Tenant category or operating mode by itself |
| `operatingMode` | Canonical runtime family used for shell-selection authority | Billing tier, host-entry kind, or local heuristic |
| `runtimeOverlay` | Additional routing modifier layered on top of a resolved operating mode | General client navigation state |
| `routeManifestKey` | Client manifest selection key derived from canonical runtime truth | Business taxonomy or backend billing concept |
| `publicEntryKind` | Public-entry classification resolved before authenticated session routing | Authenticated tenant family |
| `client UI state` | View-local state such as active tab, modal, drawer, search query, or route-within-surface | Runtime family or shell authority |

Canonical vocabulary decisions:

- `commercialPlan` remains billing-only language.
- `tenantCategory` is the canonical family anchor for authenticated tenant identity.
- `whiteLabelCapability` is a capability signal, not a category.
- `operatingMode` is the canonical runtime-family selector.
- `runtimeOverlay` is reserved for route-shaping overlays only.
- `routeManifestKey` is an internal routing key derived from canonical descriptor truth.
- `publicEntryKind` is not a loose synonym for storefront. It is an entry-resolution concept.
- `TEAM_MGMT`, `SETTINGS`, search, drawers, and tabs belong to client UI state, not runtime overlays.

## 3. Field Ownership Matrix

The categories used in this matrix are strict:

- `backend-owned`
- `frontend adapter derived temporarily from backend fields only`
- `client-only UI state`
- `deprecated compatibility field`

| Field | Meaning | Ownership contract | Notes |
| --- | --- | --- | --- |
| `realm` | Authenticated control-plane vs tenant realm | backend-owned | Comes from authenticated session context |
| `tenantId` | Canonical tenant identifier | backend-owned | Required for tenant session routing |
| `tenantSlug` | Canonical display or entry identifier | backend-owned | Display and entry-resolution context only; never shell authority |
| `tenantName` | Canonical display name | backend-owned | Display only; never shell authority |
| `authenticatedRole` | Backend-authenticated role or membership role | backend-owned | Used only through canonical descriptor or adapter rules |
| `commercialPlan` | Billing tier | backend-owned | Never routing authority |
| `tenantCategory` | Canonical family anchor | backend-owned | Canonicalized from `tenant_category`; route-family input |
| `whiteLabelCapability` | Canonical white-label capability signal | backend-owned | Canonicalized from `is_white_label`; not a category |
| `operatingMode` | Canonical runtime-family selector | frontend adapter derived temporarily from backend fields only; target state backend-owned | Temporary adapter inputs may be only `realm`, `tenantCategory`, `whiteLabelCapability`, and backend-authenticated role context where overlay eligibility matters |
| `runtimeOverlay` | Additional route-shaping overlay | frontend adapter derived temporarily from backend fields only | Current confirmed overlay is `WL_ADMIN`; no local hints or UI state may shape it |
| `routeManifestKey` | Client manifest key | frontend adapter derived temporarily from canonical descriptor fields only | Must derive from resolved `operatingMode` plus resolved overlays only |
| `publicEntryKind` | Public-entry resolution kind | backend-owned in a pre-session entry-resolution contract | Not client-inferred; not billing-derived |
| `type` | Legacy family field | deprecated compatibility field | May exist temporarily, but never outranks `tenantCategory` |
| `tenant_category` | Canonical backend family field in current payloads | backend-owned | Current canonical family anchor until a renamed canonical field is emitted |
| `is_white_label` | Current backend capability field in current payloads | backend-owned | Current canonical capability signal |
| `expView`, tabs, search, modals, drawers | View-local navigation state | client-only UI state | Never runtime-family authority |

Operating-mode ownership transition is explicit:

- Temporary migration state: the frontend adapter may derive `operatingMode` from canonical backend fields only.
- Target state: backend emits `operatingMode` directly.

Invalid routing authorities are always forbidden:

- slug as a heuristic
- tenant name as a heuristic
- local storage hints
- plan tier
- provisional bootstrap stubs

## 4. Exact Proposed Types

The proposed types below define the canonical routing-authority schema.

```ts
export type CommercialPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export type TenantCategory = 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL';

export type TenantOperatingMode =
  | 'CONTROL_PLANE'
  | 'AGGREGATOR_WORKSPACE'
  | 'B2B_WORKSPACE'
  | 'B2C_STOREFRONT'
  | 'WL_STOREFRONT';

export type RuntimeOverlay = 'WL_ADMIN';

export type RouteManifestKey =
  | 'control_plane'
  | 'aggregator_workspace'
  | 'b2b_workspace'
  | 'b2c_storefront'
  | 'wl_storefront'
  | 'wl_admin';

export type PublicEntryKind =
  | 'PLATFORM'
  | 'TENANT_SUBDOMAIN'
  | 'TENANT_CUSTOM_DOMAIN';

export interface SurfaceCapabilities {
  workspace: boolean;
  storefront: boolean;
  wlAdmin: boolean;
}

export interface FeatureCapabilities {
  cart: boolean;
  rfq: boolean;
  sellerCatalog: boolean;
  buyerCatalog: boolean;
}

export interface PlatformCapabilities {
  domains: boolean;
  branding: boolean;
  discovery: boolean;
}

export interface SessionCapabilities {
  surface: SurfaceCapabilities;
  feature: FeatureCapabilities;
  platform: PlatformCapabilities;
}

export interface SessionRuntimeDescriptor {
  realm: 'TENANT' | 'CONTROL_PLANE';
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  authenticatedRole: string | null;
  commercialPlan: CommercialPlan | null;
  tenantCategory: TenantCategory | null;
  whiteLabelCapability: boolean;
  operatingMode: TenantOperatingMode | null;
  runtimeOverlays: RuntimeOverlay[];
  capabilities: SessionCapabilities;
  routeManifestKey: RouteManifestKey | null;
}

export interface PublicEntryResolutionDescriptor {
  publicEntryKind: PublicEntryKind | null;
  normalizedHost: string | null;
  resolvedTenantId: string | null;
  resolvedTenantSlug: string | null;
}
```

Type decisions made here:

- `operatingMode` is nullable so unresolved identity cannot be coerced into a runtime family.
- `routeManifestKey` is nullable for the same reason.
- `runtimeOverlays` is an array because overlay presence is additive; `NONE` is represented by an empty array.
- `publicEntryKind` is defined as a separate pre-session concern, not as an authenticated session field in the leading recommended direction.
- `TEAM_MGMT` and `SETTINGS` are intentionally excluded from `RuntimeOverlay`; they belong to client UI state.

## 5. Capability Taxonomy

Capabilities are tiered and must remain tiered.

### 5.1 Surface Capabilities

Surface capabilities gate runtime-family entry.

- `workspace` gates entry into authenticated workspace families such as aggregator and non-WL B2B
- `storefront` gates entry into storefront families such as non-WL B2C and WL storefront
- `wlAdmin` gates entry into the WL admin overlay path

Rule:

- no runtime family may be entered unless the descriptor's `operatingMode` and required surface capability agree

### 5.2 Feature Capabilities

Feature capabilities gate route availability inside a chosen surface.

- `cart`
- `rfq`
- `sellerCatalog`
- `buyerCatalog`

Rule:

- feature capabilities do not choose the shell
- feature capabilities decide which routes or affordances inside an already chosen surface may render

### 5.3 Platform Capabilities

Platform capabilities gate optional platform-managed affordances.

- `domains`
- `branding`
- `discovery`

Rule:

- platform capabilities do not choose runtime-family entry
- platform capabilities gate platform-managed panels, controls, or extension surfaces inside an already valid surface

### 5.4 Capability Consumption Rules

Route-manifest consumption must follow this order:

1. `operatingMode` resolves runtime family
2. `surface` capabilities confirm the family may render
3. `routeManifestKey` selects the manifest for that family and overlay state
4. `feature` capabilities gate route availability inside that manifest
5. `platform` capabilities gate optional platform-managed affordances

Flat capability lists are forbidden in the canonical design.

## 6. Current Runtime Family To Manifest Mapping

| Current runtime family | Current repo-truth basis | Target `operatingMode` | Target `runtimeOverlays` | Target `routeManifestKey` |
| --- | --- | --- | --- | --- |
| control plane | control-plane realm and `SuperAdminShell` branch | `CONTROL_PLANE` | `[]` | `control_plane` |
| aggregator workspace | `tenantCategory` of `AGGREGATOR` or `INTERNAL`, resolved to `AggregatorShell` | `AGGREGATOR_WORKSPACE` | `[]` | `aggregator_workspace` |
| b2b workspace | `tenantCategory = B2B` and `whiteLabelCapability = false` | `B2B_WORKSPACE` | `[]` | `b2b_workspace` |
| b2c storefront | `tenantCategory = B2C` and `whiteLabelCapability = false` | `B2C_STOREFRONT` | `[]` | `b2c_storefront` |
| wl storefront | `whiteLabelCapability = true` with storefront runtime path active | `WL_STOREFRONT` | `[]` | `wl_storefront` |
| wl admin | `whiteLabelCapability = true` and eligible role currently entering `WL_ADMIN` | `WL_STOREFRONT` | `['WL_ADMIN']` | `wl_admin` |

Mapping decisions:

- `INTERNAL` currently maps to the aggregator workspace family because repo truth routes it through `AggregatorShell`.
- WL admin remains an overlay on top of the WL storefront operating mode, not a separate base operating mode.
- `routeManifestKey` may distinguish overlay state even when `operatingMode` does not.

## 7. `publicEntryKind` Decision Frame

There are two valid schema patterns.

### Option A — `publicEntryKind` is absent from the authenticated session descriptor

Model:

- authenticated `SessionRuntimeDescriptor` contains no `publicEntryKind`
- public entry remains entirely outside authenticated session schema

Strength:

- keeps authenticated descriptor minimal

Weakness against current repo posture:

- under-models the host-resolution boundary already present in middleware
- makes future storefront and public-entry separation harder to reason about explicitly

### Option B — `publicEntryKind` exists as a separate pre-session entry-resolution contract

Model:

- `PublicEntryResolutionDescriptor` exists before authenticated session resolution
- authenticated `SessionRuntimeDescriptor` remains focused on authenticated routing authority

Strength against current repo posture:

- matches the existing host-based tenant resolution path in [middleware.ts](../../middleware.ts#L1)
- preserves a clean separation between entry resolution and authenticated runtime identity
- supports later storefront or public-boundary separation without forcing `publicEntryKind` into the authenticated descriptor

Weakness:

- requires a separate contract to be designed and named explicitly in the next planning phase

### Recommended Direction

Option B is the leading recommendation.

Rationale:

- repo truth already shows host-based resolution before authenticated session routing
- storefronts are not yet cleanly separated into a public app, so placing `publicEntryKind` inside authenticated session identity now would mix gateway and authenticated concerns prematurely
- the route-manifest design can proceed cleanly if public entry is modeled as a pre-session contract and authenticated runtime remains modeled by `SessionRuntimeDescriptor`

What remains deferred:

- whether `PublicEntryResolutionDescriptor` must be surfaced to the client explicitly in all cases, or may remain an edge/server contract for some paths
- the exact point where public-entry resolution hands off to authenticated session routing

What is not deferred:

- `publicEntryKind` should not be treated as an unconstrained term
- pre-session entry-resolution is the recommended schema direction unless later repo-truth work disproves it

## 8. Unknown Identity / Incomplete Identity Rule

This rule is non-negotiable.

- unknown or incomplete canonical identity must render neutral loading or error only
- no shell fallback is allowed
- no provisional runtime-family substitution is allowed
- no compatibility inference may act as routing authority
- unresolved identity must leave `operatingMode` unresolved
- unresolved identity must leave `routeManifestKey` unresolved
- unresolved identity must leave `runtimeOverlays` empty

Practical meaning:

- if canonical tenant family or canonical white-label capability is unresolved, the client may not choose another operating family to keep the UI moving
- compatibility fields may assist diagnostics, but they may not produce shell selection

## 9. Migration Compatibility Rules

The migration may temporarily carry legacy fields, but only under strict compatibility rules.

- `type` may temporarily exist as a deprecated compatibility field only.
- `tenant_category` remains the canonical family anchor during migration and must outrank `type` absolutely.
- `is_white_label` remains the canonical capability signal during migration and must never be reinterpreted as a category.
- `enterprise` remains billing-only language and may not be used as runtime shorthand.
- `tenantSlug` and `tenantName` may remain display or entry-resolution data, but are never valid routing authorities.

Compatibility-field rules:

- deprecated fields may backfill diagnostics, observability, or display migration support
- deprecated fields may not shape `operatingMode`
- deprecated fields may not shape `routeManifestKey`
- deprecated fields may not silently change operating family during restore or bootstrap

## 10. Double-Truth Prevention Rules

This section is mandatory and strict.

- one canonical `SessionRuntimeDescriptor` must become the sole routing authority
- compatibility adapters may transform backend truth only
- no legacy normalization path may continue to shape shell selection once canonical descriptor routing is active
- migration phases must not leave both routing systems making independent shell decisions
- slug or name normalization may not survive as a routing input in any descriptor-backed phase
- local storage hints may not survive as a routing input in any descriptor-backed phase
- provisional bootstrap stubs may not survive as a routing input in any descriptor-backed phase
- if compatibility logic remains during migration, it may populate diagnostics only, not shell-selection inputs

The worst failure mode is prolonged double-truth routing where old frontend normalization and new canonical descriptor logic both remain active. That state is not an acceptable transition target.

## 11. Exit Criteria For Moving To Route-Manifest Design

The next route-manifest design artifact may begin only when all items below are fixed by this schema contract and accepted as settled planning inputs:

- vocabulary fixed
- field ownership fixed
- `operatingMode` transition fixed
- `publicEntryKind` direction fixed
- capability tiers fixed
- unknown-identity rule fixed
- double-truth prevention rules fixed
- runtime-family to manifest mapping fixed

If any item above is reopened, the schema-design pass is not complete and route-manifest planning should not start.

## Footer

REPO_TRUTH_AND_RUNTIME_VALIDATION_BASED

NO_GOVERNANCE_DOCS_USED_AS_EVIDENCE

NO_PRODUCT_FILES_TOUCHED