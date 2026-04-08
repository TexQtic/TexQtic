# TexQtic Tenant Mode Taxonomy And Commercial Continuity Validation v1

Date: 2026-04-08

## Scope

This validation uses only repo code and live production runtime proof.

Explicitly excluded as evidence:
- governance decision records
- governance unit records
- prior analysis artifacts

Evidence sources used:
- frontend routing and shell code in `App.tsx`, `layouts/Shells.tsx`, `components/WL/WLStorefront.tsx`, and `components/WL/WLProductDetailPage.tsx`
- auth and tenant resolution code in `components/Auth/AuthFlows.tsx`, `services/authService.ts`, `server/src/routes/public.ts`, and `server/src/routes/tenant.ts`
- shared cart plumbing in `contexts/CartContext.tsx`
- live production UI at `https://app.texqtic.com`
- live production tenant-resolution and tenant-session responses
- live control-plane tenant registry and impersonation runtime state

## Executive Verdict

TexQtic does not currently operate as a simple parity model across "enterprise", "white-label", and "B2C" tenants.

The implemented runtime is a mode system with five effective states:
- control plane
- non-white-label B2B workspace
- non-white-label B2C browse storefront
- white-label admin back office
- white-label storefront

The strongest finding from this pass is that white-label runtime behavior is currently not cleanly derived from canonical backend tenant identity alone. In production, `White Label Co` bootstraps into white-label admin and white-label storefront surfaces even though live `/api/me` returned `tenant_category: B2C` and `is_white_label: false`. The client achieves that by applying a repo-truth slug/name override inside `App.tsx`.

That means the current normalization layer is not merely descriptive. It is behavior-shaping.

## Repo Truth

### 1. Shell selection is mode-driven, not plan-driven

`resolveExperienceShell(...)` selects the shell from `tenant_category` plus `is_white_label`:
- `B2B + is_white_label=false` -> `B2BShell`
- `B2C + is_white_label=false` -> `B2CShell`
- `B2B or B2C + is_white_label=true` -> `WhiteLabelShell`
- `AGGREGATOR` and `INTERNAL` -> `AggregatorShell`

Commercial plan is normalized in `types.ts`, but plan is not the shell-routing authority.

### 2. White-label admin is a separate runtime state

`applyTenantBootstrapState(...)` and `canAccessWlAdmin(...)` can place a tenant user into `WL_ADMIN` before the normal `EXPERIENCE` shell renders.

That means white-label is not just a themed storefront branch. It is a separate back-office state with its own navigation and content owner.

### 3. Non-white-label B2B, white-label, and non-white-label B2C do not expose equal commercial continuity

Repo truth shows materially different user journeys:

Non-white-label B2B HOME:
- mounts `B2BShell`
- renders `Wholesale Catalog`
- exposes `Supplier RFQ Inbox`, `View My RFQs`, and `+ Add Item`
- card footer renders `Edit`, `Delete`, and `Request Quote`

White-label storefront HOME:
- short-circuits to `WLStorefront`
- owns its own product fetch path
- exposes category navigation, search, product detail, `View My RFQs`, `Request Quote`, and live `Add to Cart`
- can coexist with `WL_ADMIN`

Non-white-label B2C HOME:
- mounts `B2CShell`
- renders hero plus `New Arrivals`
- uses `B2CAddToCartButton` on product cards
- intentionally suppresses authenticated header affordances on the exact B2C browse entry surface via `showB2CHomeAuthenticatedAffordances = !isB2CBrowseEntrySurface`
- does not expose seller mutation actions on HOME cards

### 4. The white-label normalization layer can override server truth

`App.tsx` contains:
- `WL_REPO_TRUTH_SLUGS = new Set(['white-label-co'])`
- `WL_REPO_TRUTH_NAMES = new Set(['white label co'])`
- `resolveRepoTruthTenantHint(...)`
- `normalizeTenantIdentity(...)`

That path can force `is_white_label = true` from repo-truth slug/name matching even when the live tenant payload does not report white-label capability.

This is the clearest code-path explanation for why production `White Label Co` still enters white-label runtime states despite backend session identity returning non-white-label fields.

## Production Proof

Production proof was collected on 2026-04-08 from `https://app.texqtic.com`.

### A. Non-white-label B2B proof

Entry path:
- tenant login using the seeded Acme owner account
- public tenant-resolution returned a single membership: `Acme Corporation`

Live session truth:
- `/api/me` returned tenant `Acme Corporation`
- `tenant_category: B2B`
- `is_white_label: false`
- `plan: PROFESSIONAL`
- `role: OWNER`

Visible runtime proof:
- header text: `Enterprise Management`
- page title: `Wholesale Catalog`
- visible actions: `Supplier RFQ Inbox`, `View My RFQs`, `+ Add Item`
- visible card affordances: `Edit`, `Delete`, `Request Quote`

Validation result:
- this is a management-heavy wholesale workspace
- it is materially richer than the non-white-label B2C browse HOME
- the label "enterprise" in runtime practice maps to the non-white-label B2B workspace, not to plan `ENTERPRISE`

### B. White-label proof

Entry path:
- tenant login using the seeded White Label owner account
- public tenant-resolution returned a single membership: `White Label Co`

Live session truth from `/api/me`:
- tenant `White Label Co`
- `tenant_category: B2C`
- `is_white_label: false`
- `plan: ENTERPRISE`
- `role: OWNER`

Visible runtime proof immediately after login:
- app entered `Store Admin`
- visible admin navigation: `Store Profile`, `Staff`, `Products`, `Collections`, `Orders`, `Domains`
- visible admin content: `Storefront Configuration`, `Custom Domain`, `Visual Identity`

Visible storefront proof from the same live session:
- `Storefront` navigation returned a `Maison de Commerce` storefront
- storefront exposed `Products`, `View My RFQs`, search, category navigation, and a product detail route
- product detail exposed both `Request Quote` and `Add to Cart`

Validation result:
- white-label runtime continuity is real and materially broader than either non-white-label B2B HOME or non-white-label B2C HOME because it includes both storefront commerce and a separate admin back office
- however, the activation path is currently normalization-dependent rather than cleanly canonical from backend tenant identity

### C. Exact non-white-label B2C proof

Entry path:
- control-plane login using the seeded super-admin account
- `Tenant Registry` row-level impersonation into `B2C Browse Proof 20260402080229`

Live registry and impersonation truth:
- control-plane row showed `ACTIVE`, `FREE`, `B2C`
- impersonation session metadata stored in browser state resolved:
  - name: `B2C Browse Proof 20260402080229`
  - slug: `b2c-browse-proof-20260402080229`
  - `type: B2C`
  - `tenant_category: B2C`
  - `is_white_label: false`
  - `plan: FREE`

Visible runtime proof:
- impersonation banner showed staff was impersonating the exact B2C proof tenant
- B2C hero rendered: `Spring 2024 Collections.`
- browse section rendered: `New Arrivals`
- exact runtime state rendered: `No products available.`
- authenticated header affordances were absent on HOME, matching the intentional B2C browse entry gating

Validation result:
- the non-white-label B2C storefront shell is mounted and reachable in production
- the exact proof tenant is currently runtime-blocked by empty live catalog inventory
- because no cards rendered, `Add to Cart` could not be truthfully exercised on the exact proof tenant during this pass
- repo truth still shows that when B2C products do render, the HOME cards mount `B2CAddToCartButton`

## Taxonomy Findings

### 1. The current model is mode-first, not plan-first

The user-facing taxonomy is easiest to understand if treated as:
- control plane
- tenant workspace or storefront mode derived from `tenant_category` plus `is_white_label`
- optional white-label admin overlay for eligible roles

This is more accurate than any statement that implies plan tier alone controls the experience.

### 2. "Enterprise" is overloaded and should not be used as the taxonomy root

In live proof:
- Acme ran the `Enterprise Management` B2B workspace while carrying plan `PROFESSIONAL`
- White Label Co carried plan `ENTERPRISE` while backend `/api/me` still reported `B2C` and `is_white_label: false`

So `ENTERPRISE` plan and the non-white-label B2B enterprise-style workspace are not the same thing.

### 3. Shared plumbing does not imply parity

Shared tenant APIs exist for auth, catalog, and cart, but surfaced continuity diverges sharply:
- B2B emphasizes supplier management and RFQ initiation
- white-label exposes branded storefront commerce plus separate admin tooling
- non-white-label B2C is intentionally thinner at HOME and suppresses authenticated header actions on the browse entry surface

This repo does not support any honest claim that WL, non-WL B2B, and non-WL B2C are commercially equivalent modes.

### 4. The non-white-label B2C exact-path issue is runtime-state-sensitive, not pure feature absence

The exact proof tenant did not fail because the shell was missing.
It failed to yield a card-level commerce proof because the live catalog was empty.

That matters because it separates two different statements:
- true: non-white-label B2C HOME is thinner than WL and B2B
- also true: the exact proof tenant's inability to show `Add to Cart` at runtime was caused by no rendered products, not by the button having been removed from the B2C card code path

### 5. The normalization layer is now a primary taxonomy risk

`White Label Co` is the critical proof case.

Backend session truth said:
- `tenant_category: B2C`
- `is_white_label: false`

Frontend runtime still produced:
- `WL_ADMIN`
- `WhiteLabelShell`
- white-label storefront detail with `Request Quote` and `Add to Cart`

The direct implication is that mode reasoning can be wrong if it assumes `/api/me` alone explains the rendered experience. The client-side normalization layer currently has the power to rewrite mode identity based on slug/name repo truth.

## Final Conclusion

TexQtic's current tenant-mode model is not a flat parity system. It is a layered runtime model with materially different continuity by mode.

Validated end state from this pass:
- non-white-label B2B is a richer management workspace than non-white-label B2C HOME
- white-label is the richest commercial mode because it combines a separate admin back office with a branded storefront and product-detail commerce flow
- non-white-label B2C HOME remains intentionally thinner and, on the exact proof tenant used here, was runtime-blocked by empty inventory
- the biggest taxonomy hazard is the frontend normalization layer that can upgrade a server-reported non-white-label B2C tenant into white-label runtime behavior

The correct high-level reading is therefore:

TexQtic has shared commerce plumbing, but it does not have tenant-mode parity. It has distinct tenant operating modes, and the current white-label normalization layer can obscure canonical identity boundaries if not treated explicitly.