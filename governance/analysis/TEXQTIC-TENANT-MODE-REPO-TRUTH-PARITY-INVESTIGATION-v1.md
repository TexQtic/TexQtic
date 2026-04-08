# TEXQTIC Tenant Mode Repo Truth Parity Investigation v1

Scope: repo-truth and code-only investigation.

Method: traced tenant-mode selection, tenant identity normalization, shell mounting, storefront/home rendering, catalog loading, cart entry, mutation controls, and backend catalog/auth ownership. No governance documents were used as evidence.

## 1. Executive judgment

partly

WL and the non-WL B2B "enterprise-facing" path are materially richer in code than the exact non-WL B2C HOME path, but not for one single reason.

The repo shows two different truths at once:

- some divergence is intentional mode design: WL and non-WL B2B mount different shells and richer management/storefront surfaces than non-WL B2C
- some divergence is a real implementation asymmetry on the exact non-WL B2C HOME path: it depends on active inventory to render cards and suppresses visible authenticated/cart entry controls on that same HOME surface

So parity across tenant modes is overstated if WL, non-WL B2B, and exact non-WL B2C HOME are being treated as equivalent runtime surfaces.

## 2. Mode-by-mode repo truth

### WL

- shell/path truth:
  - `resolveExperienceShell(...)` routes any `is_white_label === true` B2B or B2C tenant to `WhiteLabelShell`
  - `App.tsx` short-circuits HOME before the tenant-category switch: `if (currentTenant.is_white_label && expView === 'HOME') return <WLStorefront ... />`
  - WL owner/admin users with allowed roles are rerouted into `WL_ADMIN` by `canAccessWlAdmin(...)`
- product-bearing truth:
  - `WLStorefront` owns a single `getCatalogItems()` fetch and derives categories, search, grid state, and product detail state client-side from the same fetched array
  - WL admin has a dedicated `PRODUCTS` panel with `+ Add Item` and card-level mutation controls using the same catalog contract
- cart/transaction-entry truth:
  - `WLProductDetailPage` supports both `Request Quote` and live `Add to Cart`
  - `CartProvider` is mounted for `EXPERIENCE`, and WL keeps the visible cart-entry overlay because it is not treated as the non-WL B2C browse-entry surface
- mutation-affordance truth:
  - shopper-facing WL storefront cards do not carry edit/delete
  - mutation controls live in the dedicated `WL_ADMIN` `PRODUCTS` surface
- key data/capability dependencies:
  - authenticated tenant realm
  - active catalog items from `/api/tenant/catalog/items`
  - `is_white_label === true`
  - WL admin access requires one of `TENANT_OWNER`, `TENANT_ADMIN`, `OWNER`, or `ADMIN`

### Enterprise

- shell/path truth:
  - the code's "enterprise" home path is really the default non-WL B2B path, not a separate `plan === ENTERPRISE` branch
  - `isEnterpriseCatalogEntrySurface` is keyed by `tenant_category === B2B && is_white_label !== true`
  - that path mounts `B2BShell`
- product-bearing truth:
  - `App.tsx` owns the B2B HOME catalog fetch through `getCatalogItems()`
  - first paint loads 8 items, then a deferred tail hydration fetch loads more
  - the same HOME surface also exposes `+ Add Item`, so the surface can self-supply inventory
- cart/transaction-entry truth:
  - B2B cards use `Request Quote`, not B2C `Add to Cart`
  - the same HOME surface also exposes `View My RFQs` and `Supplier RFQ Inbox`
  - `CartProvider` and a generic cart toggle are still mounted in `EXPERIENCE`, but the product-card CTA is RFQ-first, not shopper checkout-first
- mutation-affordance truth:
  - `renderB2BCatalogCardFooter(...)` still renders `Edit` and `Delete` plus the RFQ CTA on the same card surface
  - `+ Add Item` lives on the same HOME catalog screen
- key data/capability dependencies:
  - authenticated tenant realm
  - `tenant_category === B2B`
  - `is_white_label !== true`
  - active catalog items from `/api/tenant/catalog/items`
  - OWNER/ADMIN role for create/update/delete catalog mutations

### non-WL B2C

- shell/path truth:
  - `resolveExperienceShell(...)` routes `tenant_category === B2C && is_white_label !== true` to `B2CShell`
  - the exact path under investigation is `appState === 'EXPERIENCE' && expView === 'HOME' && isNonWhiteLabelB2CTenant`
- product-bearing truth:
  - the exact HOME path uses the shared app-owned catalog fetch via `getCatalogItems()`
  - search is debounced and query-driven; visible cards are a slice of the loaded array; load-more depends on `catalogNextCursor`
  - if zero active items return, the exact path renders `No products available.`
- cart/transaction-entry truth:
  - each rendered card gets `B2CAddToCartButton`
  - but exact HOME sets `showB2CHomeAuthenticatedAffordances = !isB2CBrowseEntrySurface`, so this path hides the B2C shell's authenticated nav, hides the shell cart icon, and also hides the extra top-right `CartToggleButton`
  - `CartProvider` and the cart drawer still exist in the tree, but the exact HOME surface has no visible cart-entry affordance
- mutation-affordance truth:
  - exact HOME no longer renders `Edit` or `Delete`
  - it also has no `+ Add Item` and no settings button on that exact surface
- key data/capability dependencies:
  - authenticated tenant realm
  - active catalog items from `/api/tenant/catalog/items`
  - same-tenant inventory only; the backend catalog route returns `active: true` items inside tenant scope
  - no adjacent self-supply/admin path exists on the exact HOME surface itself

## 3. Exact asymmetry map

- `INTENTIONAL_MODE_DIFFERENCE`
  - WL capability supersedes tenant category on HOME. If `is_white_label` is true, HOME mounts `WLStorefront` before the normal B2B/B2C content switch runs.

- `INTENTIONAL_MODE_DIFFERENCE`
  - WL owner/admin users can enter `WL_ADMIN`, which exposes dedicated `BRANDING`, `STAFF`, `PRODUCTS`, `COLLECTIONS`, `ORDERS`, and `DOMAINS` panels.

- `IMPLEMENTATION_ASYMMETRY`
  - `App.tsx` contains a client-side repo-truth WL override by slug/name (`white-label-co` / `white label co`) that can force `is_white_label` true even before backend identity fully settles.

- `LIKELY_FALSE_PARITY_ASSUMPTION`
  - the so-called enterprise HOME is not keyed by commercial plan `ENTERPRISE`; it is keyed by `tenant_category === B2B && !is_white_label`. The richer B2B management surface is being conflated with a plan-tier distinction.

- `SELLER_ADMIN_DRIFT`
  - non-WL B2B HOME still mixes product display, `+ Add Item`, and `Edit`/`Delete` mutation controls on the same catalog surface.

- `INTENTIONAL_MODE_DIFFERENCE`
  - WL storefront has a richer shopper implementation than non-WL B2C HOME: dedicated storefront component, category rail, client-side search, product detail page, and dual CTAs (`Request Quote` and `Add to Cart`).

- `MISSING_COMMERCIAL_COMPLETENESS_PATH`
  - exact non-WL B2C HOME preserves `Add to Cart` on cards but suppresses the visible authenticated/cart entry controls on that same HOME surface. The cart drawer exists, but the exact HOME path does not surface a visible way to open it.

- `RUNTIME_STATE_DEPENDENCY`
  - all three product-bearing modes ultimately depend on `/api/tenant/catalog/items`, and that backend route returns only `active: true` items. Empty product grids can therefore be pure inventory state, not route failure.

- `EMPTY_STATE_NOT_IMPLEMENTATION_FAILURE`
  - `No products available.` on non-WL B2C HOME is fully explained by zero active tenant-scoped catalog items. The empty state alone does not prove a broken render branch.

- `IMPLEMENTATION_ASYMMETRY`
  - `SETTINGS` is explicitly blocked for the exact non-WL B2C HOME mode (`appState === 'SETTINGS' && !isNonWhiteLabelB2CTenant`), while non-WL B2B and WL retain settings access and a visible settings gear.

## 4. Most important finding

The single most important repo-truth finding is that exact non-WL B2C HOME is not merely a thinner skin over the same commercial path used by WL or non-WL B2B.

It is the only exact shopper-facing HOME path that simultaneously:

1. depends entirely on pre-existing `active` tenant inventory to render any product cards at all, and
2. hides the visible authenticated/cart continuation controls on that same HOME surface even though `Add to Cart` is still wired on each card.

That makes WL and non-WL B2B look materially more complete in runtime even when some lower-level catalog plumbing is shared, because those modes have richer mounted surfaces and adjacent supply/admin routes that non-WL B2C HOME does not.

## 5. Implication

Yes.

Current understanding has likely overstated parity across tenant modes if it treated WL, the non-WL B2B "enterprise-facing" experience, and exact non-WL B2C HOME as equivalent runtime/commercial surfaces.

The repo shows some shared foundations:

- shared tenant auth realm
- shared canonical tenant identity fields
- shared tenant-scoped catalog endpoint

But it does not show parity of:

- shell mounting
- HOME-surface richness
- mutation/control placement
- shopper detail flow
- cart-entry continuity on exact HOME
- adjacent product-supply/admin paths

## 6. Recommended next move

bounded implementation correction

Reason:

Repo truth already shows a real code-level commercial asymmetry on exact non-WL B2C HOME that does not require another runtime-only proof pass to discover. The path keeps `Add to Cart`, but suppresses visible cart continuation controls and has no adjacent self-supply/admin path on the same HOME surface. That is enough to justify a bounded correction pass focused on the non-WL B2C commercial continuity seam.

## Evidence anchors

- `App.tsx`
- `layouts/Shells.tsx`
- `components/Auth/AuthFlows.tsx`
- `components/WL/WLStorefront.tsx`
- `components/WL/WLProductDetailPage.tsx`
- `components/WL/ProductGrid.tsx`
- `components/WL/ProductCard.tsx`
- `components/Tenant/WhiteLabelSettings.tsx`
- `contexts/CartContext.tsx`
- `services/catalogService.ts`
- `services/cartService.ts`
- `services/authService.ts`
- `services/tenantApiClient.ts`
- `server/src/routes/public.ts`
- `server/src/routes/tenant.ts`
- `server/src/routes/auth.ts`
- `server/src/lib/database-context.ts`

REPO_TRUTH_ONLY
NO_GOVERNANCE_DOCS_USED_AS_EVIDENCE
NO_PRODUCT_FILES_TOUCHED