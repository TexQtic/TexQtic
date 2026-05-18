# B2C Public Category Story Pages — Design

**Unit ID:** B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001
**Date:** 2026-05-18
**Status:** DESIGN_COMPLETE
**Mode:** Safe-Write Governance Design — Design-only; no runtime implementation
**Family:** TexQtic Public / B2C Public Family
**Authorized by:** Paresh
**Commit:** [TEXQTIC] governance: design B2C category story pages

---

## 1. Status Summary

This unit establishes the design authority for B2C public category story pages before any
implementation begins. It is the precondition gate for
`B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001`.

**Preconditions met:**
- `B2C-PUBLIC-BROWSE-BASELINE-SYNC-001` — COMPLETED (commit b40c2b9)
- `B2C-PRODUCT-DETAIL-BASELINE-SYNC-001` — COMPLETED (commits 487582b, 673b185)
- `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` — COMPLETED (commits 221e2bb, fdee365)
- `B2C-DPP-PASSPORT-LINKAGE-SYNC-001` — COMPLETED (commit 0be0dc2)
- `PUBLIC-FACING-PAGES-SEQUENCE-DECISION-001` — CLOSED (commit ef5cb00)
- `INDUSTRY-CLUSTER-TAXONOMY-DECISION-001` — PROPOSED (taxonomy vocabulary is stable; no new
  terms may be added without advancing this decision to ACCEPTED)

**Design scope:** Route model, app state, page IA, taxonomy-backed category set, slug strategy,
static-config / projection strategy, B2C browse integration, public/private boundary, claim rules,
DPP/passport/trust rules, SEO ownership, and implementation plan.

**Not in scope:** Runtime implementation, component creation, route wiring, API changes, schema
changes, SEO metadata implementation, sitemap, JSON-LD, inquiry handoff, authenticated continuation.

---

## 2. Current Repo Truth

### 2.1 Confirmed: Category Story Pages Do Not Exist

Inspection of `components/Public/` confirms the following Public components:
- `B2BDiscovery.tsx`
- `B2CBrowse.tsx`
- `PublicAggregatorPreview.tsx`
- `PublicCollectionDetail.tsx`
- `PublicCollectionsStub.tsx`
- `PublicCollectionUnavailable.tsx`
- `PublicIndustryClusterLanding.tsx`
- `PublicNavbar.tsx`
- `PublicPassport.tsx`
- `PublicProductDetail.tsx`
- `PublicReferralLanding.tsx`
- `PublicSupplierProfile.tsx`
- `PublicTrustLandingStub.tsx`

No `PublicCategoryStory.tsx`, `B2CCategoryPage.tsx`, or equivalent component exists. ✅

### 2.2 App State and Route Inventory (from App.tsx)

Current `AppState` union does NOT include any category story state. Confirmed app states relevant
to B2C public:
- `PUBLIC_B2C_BROWSE` — state-backed (no URL path; resolved from neutral entry)
- `PUBLIC_PRODUCT_DETAIL` — `/product/:slug` (regex: `^\/product\/([a-z0-9-]+)$`)
- `PUBLIC_PASSPORT` — `/passport/:id` (checked first)
- `PUBLIC_COLLECTIONS` — `/collections`
- `PUBLIC_COLLECTION_DETAIL` — `/collections/:slug`
- `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` — `/collections/:slug` (unknown slug)
- `PUBLIC_INDUSTRY_CLUSTER_LANDING` — `/industries` (static)
- `PUBLIC_SUPPLIER_PROFILE` — `/supplier/:slug`
- `PUBLIC_TRUST_LANDING` — `/trust`
- `PUBLIC_AGGREGATOR` — `/aggregator`
- `PUBLIC_REFERRAL_LANDING` — `/join/:referral_code`

**No `/products/` prefix route exists anywhere in App.tsx.** ✅
**No `/categories/` prefix route exists anywhere in App.tsx.** ✅

### 2.3 B2C Browse Category Filter (from B2CBrowse.tsx)

Current B2C browse filter chips use a fixed subset of `IndustrySegment`:
```ts
const B2C_CATEGORY_FILTER_VALUES: ReadonlyArray<IndustrySegment> = [
  'Garments',
  'Home Textiles',
  'Technical Textiles',
  'Fabrics',
];
```
These derive from `config/publicIndustryClusterTaxonomy.ts → INDUSTRY_SEGMENTS`.

Product filtering logic: `p.category === activeCategory` — exact string match against the backend
`category` field. This implies backend category values are expected to align with `IndustrySegment`
string values for the four supported chips.

**Implementation risk noted (Section 20, Finding 1):** The `category` field from the B2C
projection is a raw string from `CatalogItem.productCategory`. Whether all backend values exactly
match `IndustrySegment` enum values must be verified in the implementation unit. This design
assumes the same filter logic will work for category story pages.

### 2.4 Backend Projection Fields Available for Category Story Pages

From `server/src/services/publicB2CProjection.service.ts` and `services/publicB2CService.ts`,
the following public-safe fields are available without any backend changes:
- **Browse endpoint** (`GET /api/public/b2c/products`): all storefront entries with product
  previews including `category`, `material`, `fabricType` fields
- **Detail endpoint** (`GET /api/public/b2c/products/:slug`): full product detail with trust,
  supplier context, tags, story context

Category story pages can use the **same browse endpoint** with a category pre-filter applied
client-side. **No new backend endpoint is required** for initial implementation.

### 2.5 publicPageMeta.ts Scope

`utils/publicPageMeta.ts` is currently scoped to D2C public collection surfaces only (doc header
states: "Purpose: Manages SEO <head> metadata for D2C public collection surfaces only").

The `applyPublicPageMeta` function accepts a `PublicPageMetaInput` interface with all required
fields. **The function is reusable** by B2C category story pages without modification — it accepts
any caller that provides the `PublicPageMetaInput` shape.

Stage 1 SEO metadata implementation for category story pages would call `applyPublicPageMeta`
from the category story component, just as `PublicCollectionDetail.tsx` does. The utility file
itself would require a doc-header scope update to acknowledge B2C use (minor — deferred to
implementation unit).

### 2.6 SEO Infrastructure Status

`PUBLIC-SEO-INFRASTRUCTURE-DECISION-001` is DECIDED: **Option E — Stage 1 custom DOM utility,
sitemap and JSON-LD deferred.** The `publicPageMeta.ts` utility is the approved implementation
of Option E. Stage 1 scope: title, meta description, canonical, robots, OG/Twitter tags.

Sitemap, JSON-LD, and robots.txt management remain explicitly deferred.

### 2.7 D2C / B2C Separation

`B2CBrowse.tsx` and `PublicProductDetail.tsx` contain no D2C collection service imports. D2C
semantics live in `config/publicCollectionsProjection.ts` and `components/Public/PublicCollectionDetail.tsx`.
The B2C and D2C families are clearly separated.

Category story pages must not import `publicCollectionsProjection.ts`, `PublicCollectionDetail`,
`PublicCollectionsStub`, or any collection semantics.

### 2.8 Inquiry Handoff

No public inquiry route exists in App.tsx (confirmed by `PUBLIC-PAGES-NAVBAR-IA-AUDIT-AND-DESIGN-001`).
Category story pages must not implement inquiry capture. Deferred to future unit.

### 2.9 Authenticated B2C Continuation

No authenticated B2C continuation is implemented. Category story pages must not assume or expose
authenticated state. Sign-in handoff (button → AUTH state) is allowed as an orientation element
matching the pattern in `B2CBrowse.tsx`.

### 2.10 No Public/Private Boundary Issues Found

Inspection confirmed no `org_id`, internal IDs, private supplier records, pricing, inventory,
cart/checkout/order/wishlist, buyer intent, AI/vector outputs, or scoring/ranking signals on any
current B2C public surface. Category story pages must preserve this boundary.

---

## 3. Problem Statement

B2C product browse uses static category filter chips (Garments, Home Textiles, Technical Textiles,
Fabrics) for inline discovery. These chips provide a filter mechanism but not a category story —
there is no dedicated page that contextualises a category with educational copy, use-case
framing, or structured product discovery.

Category story pages provide a route-addressable, SEO-indexable surface for each major textile
product category. They bridge the gap between the "Industries" landing (B2B/supply-chain
orientation) and the product browse grid (product-level discovery), giving B2C visitors an
explanatory entry point before product-level filtering begins.

---

## 4. Design Goals

1. Create URL-addressable, taxonomy-backed category story pages for initial B2C categories.
2. Route must not conflict with existing `/product/:slug` or any other live route.
3. Pages must use only approved `INDUSTRY_SEGMENTS` and `PRODUCT_CATEGORIES` vocabulary.
4. Educational copy must be PUBLIC_SAFE — no evidence-gated or unsupported claims.
5. Trust/passport language must follow the same conditionality rules as browse and product detail.
6. Product cards embedded in category pages use the same projection path as B2C browse.
7. No new backend routes or schema changes required for initial implementation.
8. D2C collection semantics must not enter B2C category pages.
9. Stage 1 SEO metadata (title, description, canonical, robots, OG/Twitter) included in implementation.
10. Sitemap, JSON-LD, and advanced SEO remain deferred to B2C SEO metadata expansion unit.
11. Empty/unavailable category behavior must be safe and non-destructive.
12. Design must remain implementation-ready with a clear allowlist for the next unit.

---

## 5. Options Considered — Route Model

### Option A: `/products/:categorySlug`

**Route regex:** `^\/products\/([a-z0-9-]+)$`

**Pros:**
- Short, clean URL (`/products/garments`)
- Plural "products" signals a product group/category page
- No conflict with `/product/:slug` (singular ≠ plural, and depth matches — both are 2-segment paths)

**Cons:**
- No `/products` landing page exists (would return unmatched state or require a separate landing)
- Ambiguous if a future `/products` (without slug) is added as a products-listing page
- Potential crawler confusion between `/product/some-slug` and `/products/some-slug`

**Conflict risk with existing routes:** NONE. Regex `^\/product\/` (singular) does not match
`/products/` (plural). Verified against App.tsx.

**Verdict:** Safe but creates naming ambiguity in the products/product namespace.

---

### Option B: `/products/category/:categorySlug`

**Route regex:** `^\/products\/category\/([a-z0-9-]+)$`

**Pros:**
- Unambiguously avoids all existing routes (3-segment path; no existing route is this long)
- Explicit `category` infix signals the page type without ambiguity
- Leaves `/products/` prefix available for future product-listing or material story pages
  (e.g., `/products/material/:materialSlug`)
- Clean separation of concerns in URL structure

**Cons:**
- Slightly verbose URL (`/products/category/garments`)
- The `category` infix adds an extra segment that some URL style guides consider verbose

**Conflict risk with existing routes:** NONE.

**Verdict:** Safe and explicit. Recommended if future expansion to material pages is anticipated.

---

### Option C: `/categories/:categorySlug`

**Route regex:** `^\/categories\/([a-z0-9-]+)$`

**Pros:**
- Semantically clean — the page IS a category page
- Consistent with `/collections/:slug` and `/industries` naming pattern (top-level noun prefixes)
- No conflict with any existing route
- `/categories` (without slug) could be a future category index
- Shorter URL than Option B

**Cons:**
- "Categories" is a broad namespace; future use of `/categories/` for non-B2C contexts (e.g.,
  B2B segment categories) could create ambiguity
- Not scoped under "products" — visitors navigating from `/product/:slug` may not expect to land
  on `/categories/garments`

**Conflict risk with existing routes:** NONE.

**Verdict:** Clean and consistent. Secondary recommendation.

---

### Option D: State-backed category pages without direct URL

**Description:** Category pages rendered as an app state transition (e.g., via chip click in
browse) without a unique URL.

**Pros:**
- Zero routing complexity
- No App.tsx changes beyond a new state

**Cons:**
- Not SEO-indexable (no URL, no canonical, no crawlable link)
- Not shareable or bookmarkable
- Contradicts the goal of URL-addressable category story pages
- Breaks the pattern established by product detail (`/product/:slug`) and collections
  (`/collections/:slug`)

**Conflict risk:** NONE, but SEO goal is unmet.

**Verdict:** REJECTED. Contradicts design goal 1 (URL-addressable, SEO-indexable).

---

### Recommendation: Option B — `/products/category/:categorySlug`

**Rationale:**

1. **Unambiguous route differentiation.** No existing App.tsx route uses a 3-segment path under
   `/products/`. Zero collision risk now or with any foreseeable addition.

2. **Namespace clarity.** The `category` infix makes it unambiguous that these are product
   category pages, not a product listing or a material page. This preserves the `/products/`
   prefix for potential future use (`/products/material/:materialSlug`, `/products/origin/:originSlug`).

3. **Validated against App.tsx.** `/product/:slug` uses regex `^\/product\/([a-z0-9-]+)$`
   (singular, 2-segment). `/products/category/:categorySlug` uses a different prefix (plural),
   a different segment count (3), and an intermediate literal segment (`category`). No overlap.

4. **D2C-safe.** No proximity to `/collections/` namespace; category pages are clearly under the
   products discovery namespace.

5. **Future expansion path.** The URL structure accommodates `/products/material/:materialSlug`
   or `/products/origin/:originSlug` if material or origin story pages are approved in a future
   unit.

**Initial slugs:**
| IndustrySegment | Slug |
|---|---|
| Garments | `garments` |
| Home Textiles | `home-textiles` |
| Technical Textiles | `technical-textiles` |
| Fabrics | `fabrics` |

**Full route examples:**
- `/products/category/garments`
- `/products/category/home-textiles`
- `/products/category/technical-textiles`
- `/products/category/fabrics`

---

## 6. Recommended Category Set

### 6.1 Initial Category Story Pages (Phase 1)

| IndustrySegment | Slug | Rationale |
|---|---|---|
| Garments | `garments` | Highest consumer-facing appeal; clear B2C narrative |
| Home Textiles | `home-textiles` | Strong consumer use-case; broad product range |
| Technical Textiles | `technical-textiles` | Differentiating TexQtic positioning; export-relevant |
| Fabrics | `fabrics` | Foundation category; bridges raw material and finished goods |

These four align exactly with the current B2C browse filter chip set in `B2CBrowse.tsx`:
`B2C_CATEGORY_FILTER_VALUES`. This alignment is intentional — category chips in browse can link
directly to the corresponding story page.

### 6.2 Deferred Categories

| IndustrySegment | Defer Rationale |
|---|---|
| Yarn & Spinning | B2B / supply-chain oriented; limited B2C consumer narrative at this stage. Remain as INDUSTRY_SEGMENT in taxonomy; may become a category story page when B2B and B2C families are further developed. |
| Textile Services | Services category, not a product category; no direct B2C product-card discovery path. Deferred to future governance unit when service discovery design is approved. |

### 6.3 Governance Constraint

All four initial categories are `INDUSTRY_SEGMENTS` values with `LAYER_CLAIM_SAFETY:
INDUSTRY_SEGMENTS = 'PUBLIC_SAFE'`. No evidence-gated vocabulary is used for the category
label itself. Educational copy derived from these categories must remain within the approved
claims in `INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 §6`.

No new segment terms may be added to the initial set without:
1. The term being present in `INDUSTRY_SEGMENTS` in `config/publicIndustryClusterTaxonomy.ts`
2. `INDUSTRY-CLUSTER-TAXONOMY-DECISION-001` advancing to ACCEPTED for any new addition

---

## 7. Page IA (Information Architecture)

Each category story page follows this structure:

### 7.1 Page Zones

```
┌─────────────────────────────────────────────────────┐
│  PublicNavbar (shared)                               │
├─────────────────────────────────────────────────────┤
│  [A] Category Hero                                   │
│  - Category name (from static config)               │
│  - Educational tagline (PUBLIC_SAFE)                 │
│  - Use-case description (PUBLIC_SAFE, 2-3 sentences)│
│  - "Browse [Category] Products" anchor / scroll CTA │
│  - "Back to All Products" secondary link            │
├─────────────────────────────────────────────────────┤
│  [B] Category Context Band (optional — static copy) │
│  - What types of products belong to this category   │
│  - Textile use-case framing (supply-chain/consumer) │
│  - NO claims about specific suppliers or DPP        │
├─────────────────────────────────────────────────────┤
│  [C] Product Browse Grid (projection-backed)        │
│  - Reuses B2C browse API (category pre-filtered)    │
│  - Same card layout as B2CBrowse.tsx                │
│  - Search within category allowed                   │
│  - "No products in this category yet" safe state   │
│  - Product card routes to /product/:slug            │
├─────────────────────────────────────────────────────┤
│  [D] Trust / Origin Context Band (conditional)      │
│  - "Where available, trust signals and public       │
│    passport records are shown on product pages."    │
│  - No category-level DPP/passport claim             │
│  - Links to product pages for individual signals    │
├─────────────────────────────────────────────────────┤
│  [E] Sign-In Handoff Band                           │
│  - "Explore deeper supplier discovery, sourcing     │
│    workflows, and authenticated tools — sign in."   │
│  - Matches existing B2CBrowse.tsx handoff pattern   │
├─────────────────────────────────────────────────────┤
│  [F] Public Boundary Disclosure (footer or section) │
│  - "This public category page shows only           │
│    information approved for public discovery."      │
│  - Matches boundary disclosure pattern in          │
│    PublicProductDetail.tsx                          │
└─────────────────────────────────────────────────────┘
```

### 7.2 Navigation and Linking

| Action | Target |
|---|---|
| Product card click | `/product/:slug` → `PUBLIC_PRODUCT_DETAIL` |
| Back to All Products | Browse state or `/` (matches existing browse CTA) |
| Sign in | AUTH modal (matches existing `onSignIn()` pattern) |
| Browse chip in hero | `/products/category/:otherSlug` (between category pages) |
| From browse chip click | `/products/category/:categorySlug` (direct link) |

### 7.3 Empty Category State

When the browse API returns zero products for a category:
- Render safe "No products in this category are available for public discovery right now." message
- Do NOT render an error state
- Retain navigation (back to browse, sign-in CTA)
- Do NOT claim the category is unavailable permanently — it may have products in future

### 7.4 Unknown Category Slug State

When the URL slug does not match any approved category in the static config:
- Render a safe "This category is not available for public discovery." state
- Provide navigation back to browse
- Pattern: mirrors `PublicCollectionUnavailable` behavior from D2C surfaces

---

## 8. Static Config / Projection Strategy

### 8.1 Page Copy: Static Config-Backed

Category story page copy (hero text, context band copy, educational descriptions) is
**static-config-backed**. This is the same pattern used by D2C public collection pages
(`config/publicCollectionsProjection.ts`).

A new config file `config/publicB2CCategoryPages.ts` will be created in the implementation unit.

**Fields per category config entry:**
```ts
interface PublicB2CCategoryPageConfig {
  readonly segment: IndustrySegment;           // e.g., 'Garments'
  readonly slug: string;                        // e.g., 'garments'
  readonly heroHeading: string;                 // e.g., 'Garments'
  readonly heroTagline: string;                 // e.g., 'Consumer-facing textile products...'
  readonly heroDescription: string;            // 2-3 sentence PUBLIC_SAFE description
  readonly contextBandCopy?: string;           // Optional: deeper category context
  readonly seoTitle: string;                   // For applyPublicPageMeta title
  readonly seoDescription: string;            // For applyPublicPageMeta description
  readonly canonicalPath: string;             // e.g., '/products/category/garments'
}
```

All copy must comply with `INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 §6` (Allowed Public Claims)
and `§8` (Forbidden Claims).

### 8.2 Product Grid: Projection-Backed

The product grid within each category story page is **projection-backed** via the existing
`GET /api/public/b2c/products` endpoint. The category filter is applied client-side using the
same logic as `B2CBrowse.tsx`:
```ts
products.filter(p => p.category === segment)
```

**No new backend endpoint required for initial implementation.** ✅

### 8.3 Hybrid Model Summary

| Zone | Strategy | Backend change needed |
|---|---|---|
| Hero + copy | Static config | None |
| Product grid | Live projection (browse API) | None |
| Trust/passport band | Static conditional copy | None |
| SEO metadata | Static config + applyPublicPageMeta | None |

---

## 9. B2C Browse and Product Detail Integration

### 9.1 Category Chip to Story Page Links

Currently `B2CBrowse.tsx` uses category chips as in-page filters. In the implementation unit,
each chip should **also** be linkable to its category story page:
- Chip click for filter: existing behavior (no change required for implementation-level compat)
- New: chip label may include an `href` attribute linking to `/products/category/:slug`
- **This is a browse UX decision deferred to the implementation unit.** The design records it
  as a desirable integration but does not mandate it for the initial implementation.

### 9.2 Product Detail Back Navigation

From `/product/:slug`, the existing "back to browse" navigation lands the user in the `PUBLIC_B2C_BROWSE`
state. The implementation unit may consider whether "back" from product detail to a category story
page is desirable (i.e., if the user arrived from a category story page). This is a navigation
UX decision deferred to the implementation unit.

### 9.3 Product Card Behavior

Product cards within category story pages must use the same layout, fields, and click behavior
as `B2CBrowse.tsx`. Do not invent new card layouts. Do not show fields not already in the browse
projection.

---

## 10. How Category Pages Avoid D2C Collection Semantics

| D2C Collection Concept | Category Story Page Equivalent | Separation Rule |
|---|---|---|
| Collection (curated set with editorial story) | Category (taxonomy-backed segment grouping) | Never import `publicCollectionsProjection.ts` |
| `getCollectionBySlug` | Category lookup from `publicB2CCategoryPages.ts` | Separate config, separate lookup |
| `PublicCollectionDetail` | `PublicB2CCategoryPage` (new component) | No component sharing |
| Collection trust context mode | Per-product trust signal (existing `hasPassport`) | No `collectionHasTrustContext` pattern |
| D2C post-auth continuation | B2C sign-in handoff | Separate — no D2C imports |
| `/collections/:slug` | `/products/category/:categorySlug` | Different route namespace |

**Absolute prohibition:** The category story implementation must never import:
- `config/publicCollectionsProjection.ts`
- `components/Public/PublicCollectionDetail.tsx`
- `components/Public/PublicCollectionsStub.tsx`
- `components/Public/PublicCollectionUnavailable.tsx`
- Any D2C collection service

---

## 11. Public / Private Boundary Rules

### 11.1 Allowed on Category Story Pages

| Field / Signal | Source | Condition |
|---|---|---|
| Category name (IndustrySegment) | Static config | Always — PUBLIC_SAFE |
| Educational description | Static config | Always — must use approved vocabulary |
| Use-case framing copy | Static config | Always — no capability claims |
| Product slug, name | Browse projection | Always |
| Product image | Browse projection | Nullable — show fallback if null |
| Product price label | Browse projection | Nullable |
| Product MOQ | Browse projection | Always |
| Product category/material/fabricType tags | Browse projection | Nullable — display if present |
| Supplier name, slug, jurisdiction | Browse projection | Always |
| Trust signal availability ("where available") | Static conditional copy | Always — as qualification only |
| Sign-in handoff CTA | UI copy | Always |
| Back to browse / back to category navigation | UI copy | Always |

### 11.2 Forbidden on Category Story Pages

| Field / Signal | Reason |
|---|---|
| `org_id`, tenant ID, internal supplier IDs | Private identifiers |
| Private supplier records or documents | Private |
| Specific pricing claims or inventory levels | Not in public projection |
| Buyer intent capture | Forbidden — no inquiry form |
| RFQ / order / cart / wishlist / checkout | Authenticated surface only |
| AI/vector output, scoring, rankings | Private intelligence |
| Sustainability/certification claims (universal) | Evidence-gated — not available at category level |
| "All products in this category have passports" | Universal DPP claim — forbidden |
| "All suppliers in this category are verified" | Universal verification claim — forbidden |
| DPP coverage statistics (e.g., "40% of products") | Data not available at category level |
| Origin claims (e.g., "From South Asia") | Evidence-gated — requires projection backing |
| Collection semantics from D2C | Plane separation |

---

## 12. Claim and Evidence Rules

### 12.1 Always-Allowed (PUBLIC_SAFE)

These claims may appear in category page copy without any projection backing:

- "Garments represent the consumer-facing stage of the textile value chain."
- "Home Textiles serve residential and institutional end-use markets."
- "Technical Textiles serve specialized applications beyond conventional use."
- "Fabrics connect raw material inputs to finished textile pathways."
- "TexQtic connects category discovery with the textile ecosystem behind it."
- "Browse public-safe product previews in this category."
- "Sign in to access deeper sourcing, supplier discovery, and business tools."

Source authority: `INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 §6`.

### 12.2 Evidence-Gated (Must Not Appear Without Backing)

| Claim Type | Required Evidence | Current Status |
|---|---|---|
| "Verified [n] products" | `certificationCount > 0` on [n] products in category | NOT AVAILABLE at category level — FORBIDDEN |
| "Traceability records available in this category" | `hasTraceabilityEvidence === true` for majority of products | NOT AVAILABLE at category level — FORBIDDEN |
| "Certified suppliers in this category" | `certificationCount > 0` for 5+ suppliers | NOT AVAILABLE at category level — FORBIDDEN |
| "[Region] cluster represents this category" | Future cluster config or approved static config | DEFERRED |

### 12.3 Copy Pattern Rules

All trust/origin references on category pages must follow the pattern:
- ✅ "Where available, public-safe trust signals are shown on individual product pages."
- ✅ "Public passport records are accessible where provided."
- ✅ "Trust and origin information, where available, is visible on product detail pages."
- ❌ "Products in this category have public passport records."
- ❌ "Trust-verified products in the Garments category."

The conditionality must be present in the sentence — not just in nearby text.

---

## 13. DPP / Passport / Trust Rules

Rules carried forward from `B2C-DPP-PASSPORT-LINKAGE-SYNC-001` (governance: 0be0dc2).

### 13.1 No Category-Level DPP/Passport Claims

Category story pages must not claim any product in the category has a passport. Passport and
traceability signals remain **product-level** signals, visible only on `/product/:slug` detail
pages where `hasPassport === true` and `publicPassportId` is non-null.

### 13.2 Allowed DPP/Passport Language on Category Pages

Category pages may include a static trust band with copy matching:
> "Where available, public-safe trust signals and passport records are shown on individual product
> pages within this category. Deeper records may require authenticated access."

This copy does not assert universal coverage and qualifies with "where available". It follows the
established pattern from `PublicProductDetail.tsx`.

### 13.3 Product Cards Must Not Add New Trust Claims

Product cards embedded in category story pages must NOT add trust signals that are not part of
the browse projection. The browse projection (`GET /api/public/b2c/products`) does not include
`hasPassport` or `trustSignals[]` in the browse preview — those are detail-level fields. This
is correct behavior.

Do not add `hasPassport` badges to product cards in category pages. Trust signals are for
product detail only.

### 13.4 No Collection-Level DPP Semantics

The D2C `trustContextMode` and `collectionHasTrustContext` patterns are collection-level design
choices. They must not be imported into B2C category story pages. B2C trust behavior is product-
level and controlled by `B2C-DPP-PASSPORT-LINKAGE-SYNC-001` governance.

---

## 14. SEO Ownership and Deferrals

### 14.1 Included in Category Story Page Implementation

Category story page implementation (`B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001`) owns:

| SEO Element | Implementation Pattern | Source |
|---|---|---|
| `document.title` | `{Category} Products — TexQtic` | `publicPageMeta.ts → applyPublicPageMeta` |
| `<meta name="description">` | Category-specific copy from static config | `publicPageMeta.ts → applyPublicPageMeta` |
| `<link rel="canonical">` | `https://app.texqtic.com/products/category/{slug}` | `publicPageMeta.ts → applyPublicPageMeta` |
| `<meta name="robots">` | `index, follow` for approved categories | `publicPageMeta.ts → applyPublicPageMeta` |
| `<meta property="og:title">` | Same as document title | `publicPageMeta.ts → applyPublicPageMeta` |
| `<meta property="og:description">` | Category seoDescription from static config | `publicPageMeta.ts → applyPublicPageMeta` |
| `<meta property="og:image">` | `PUBLIC_META_OG_FALLBACK_IMAGE` (brand logo) | `publicPageMeta.ts` |
| Twitter Card equivalents | Same as OG | `publicPageMeta.ts → applyPublicPageMeta` |

**Why SEO metadata is included in implementation (not deferred):**
The `publicPageMeta.ts` utility is already established and approved (Option E decision). Calling
it from a new component adds minimal complexity and is the same pattern as D2C collection pages.
Not including basic SEO metadata would create indexability gaps for B2C category pages.

**Why only this much and no more:**
Category-specific hero images, per-category OG images, and advanced canonical strategies require
image management governance not yet established. Full sitemap inclusion requires the B2C SEO
metadata expansion unit.

### 14.2 Deferred to B2C SEO Metadata Expansion Unit

| SEO Element | Reason for Deferral |
|---|---|
| `sitemap.xml` inclusion | Sitemap generation requires a separate infrastructure unit |
| JSON-LD structured data | Explicitly deferred per PUBLIC-SEO-INFRASTRUCTURE-DECISION-001 |
| Per-category OG image | Image management governance not established |
| `robots.txt` policy | Not category-story-specific; requires domain-level SEO unit |
| Canonical strategy across B2C surfaces | Cross-surface canonicalization requires B2C SEO metadata expansion |
| Hreflang / internationalization | Not applicable at current phase |
| Breadcrumb JSON-LD | Deferred per sitemap/JSON-LD deferral |

### 14.3 Unknown/Unavailable Slug Robots Behavior

For unknown category slugs (404-equivalent state): the robots tag should be `noindex, nofollow`.
This should be handled in the unavailable category state within the component.

### 14.4 `publicPageMeta.ts` Scope Update

The implementation unit must update the doc-header scope comment in `utils/publicPageMeta.ts`
to acknowledge B2C category story page use. This is a doc-only change within the utility file.
The function behavior does not change.

---

## 15. Implementation Plan

This section defines what the next unit (`B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001`)
must build. It does not authorize implementation here.

### 15.1 New Files Required

| File | Purpose |
|---|---|
| `config/publicB2CCategoryPages.ts` | Static config: category entries (slug, segment, copy, SEO fields) |
| `components/Public/PublicB2CCategoryPage.tsx` | Category story page component |

### 15.2 Modified Files Required

| File | Change |
|---|---|
| `App.tsx` | Add `PUBLIC_B2C_CATEGORY_STORY` to AppState union; add route match for `/products/category/:categorySlug`; wire to `PublicB2CCategoryPage` |
| `utils/publicPageMeta.ts` | Doc-header scope update only (no functional change) |

### 15.3 Optional Modified Files (Browse Integration)

| File | Change | Decision |
|---|---|---|
| `components/Public/B2CBrowse.tsx` | Add `href` to category chips linking to `/products/category/:slug` | DEFERRED to implementation unit UX decision |

### 15.4 No New Backend Endpoints Required

The initial implementation uses the existing `GET /api/public/b2c/products` endpoint with
client-side category filtering. No backend changes, schema changes, Prisma changes, or OpenAPI
changes are needed.

### 15.5 No New Tests Required Beyond Standard Unit Tests

The implementation unit should include:
- Unit test: `config/publicB2CCategoryPages.ts` — confirms all 4 category entries exist with
  valid slugs and approved INDUSTRY_SEGMENT values
- Unit test: `PublicB2CCategoryPage.tsx` — confirms unknown slug renders unavailable state,
  confirms empty category renders safe state, confirms product cards render for known category
- E2E test (optional, if existing E2E framework supports): confirms category page renders on known
  slug, confirms unknown slug returns safe state

---

## 16. Proposed Implementation Allowlist

For `B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001`:

**Create (new files):**
- `config/publicB2CCategoryPages.ts`
- `components/Public/PublicB2CCategoryPage.tsx`

**Modify (existing files):**
- `App.tsx` — AppState union + route matching + component wiring
- `utils/publicPageMeta.ts` — doc-header scope comment only

**Optional modify (UX decision at implementation time):**
- `components/Public/B2CBrowse.tsx` — category chip href links (if approved)

**Read-only (do not modify):**
- `config/publicIndustryClusterTaxonomy.ts`
- `services/publicB2CService.ts`
- `server/src/services/publicB2CProjection.service.ts`
- `server/src/routes/public.ts`
- `shared/contracts/openapi.tenant.json`
- `components/Public/PublicProductDetail.tsx`
- `components/Public/B2CBrowse.tsx` (unless browse chip link decision is approved)

**Forbidden in implementation unit:**
- Backend routes/services/schema/migrations/OpenAPI
- D2C collection files
- DPP JSON-LD, passport component
- Auth/session logic
- Any file not listed above

---

## 17. Verification Plan

For `B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001`:

### 17.1 Preflight

```
git diff --name-only          → must be empty (clean tree)
git status --short            → must be empty (clean tree)
```

### 17.2 Implementation Gate

```
git diff --name-only          → must show only allowlisted files
pnpm --filter frontend typecheck    → PASS (no new TypeScript errors)
pnpm --filter frontend lint         → PASS (no new lint errors)
```

### 17.3 Functional Verification

| Check | Method |
|---|---|
| `/products/category/garments` renders category hero | Browser / Playwright |
| `/products/category/home-textiles` renders correctly | Browser / Playwright |
| `/products/category/technical-textiles` renders correctly | Browser / Playwright |
| `/products/category/fabrics` renders correctly | Browser / Playwright |
| `/products/category/unknown-slug` renders safe unavailable state | Browser / Playwright |
| Category page with 0 products renders safe empty state | Unit test / mock |
| Product card click routes to `/product/:slug` | Browser |
| No D2C collection imports in new component | Code review / grep |
| No universal DPP/passport claims in any category page copy | Code review |
| `publicPageMeta.ts` called with governance-compliant inputs | Code review |
| `applyPublicPageMeta` called on mount, `clearPublicPageMeta` called on unmount | Code review |
| `document.title` set to `{Category} Products — TexQtic` | Browser inspect |
| `robots` tag is `index, follow` for known slugs | Browser inspect |
| `robots` tag is `noindex, nofollow` for unknown slugs | Browser inspect |

### 17.4 Claim Boundary Check

A human review pass must confirm:
- No sentence in any category page copy claims universal coverage
- Every trust/passport reference includes "where available" or equivalent
- No D2C terminology (collection, curated, story, early access) appears in B2C category copy
- No pricing, inventory, ranking, scoring, AI-output, or buyer-intent claims

---

## 18. Production Verification Plan

After deployment of `B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001`:

| Check | Method |
|---|---|
| `https://app.texqtic.com/products/category/garments` returns 200 | curl / browser |
| `<title>` tag contains expected value | Browser DevTools |
| `<meta name="description">` contains expected value | Browser DevTools |
| `<link rel="canonical">` present with correct URL | Browser DevTools |
| Product cards populate from live backend | Browser |
| No console errors on page load | Browser DevTools |
| `/products/category/unknown` renders safe state | Browser |
| `GET /health` on backend returns 200 (no regressions) | curl |
| `git show --stat HEAD` confirms only allowlisted files | Terminal |

---

## 19. Deferred Items

| Item | Status | Gate |
|---|---|---|
| Yarn & Spinning category story page | DEFERRED | B2B/B2C narrative design decision |
| Textile Services category story page | DEFERRED | Service discovery design decision |
| Category chip → story page links in B2CBrowse | DEFERRED | UX decision at implementation time |
| Back navigation from product detail to category page | DEFERRED | UX decision at implementation time |
| sitemap.xml inclusion for category pages | DEFERRED | B2C SEO metadata expansion unit |
| JSON-LD structured data | DEFERRED | Per PUBLIC-SEO-INFRASTRUCTURE-DECISION-001 |
| Per-category OG image | DEFERRED | Image management governance |
| Material story pages (`/products/material/:materialSlug`) | DEFERRED | Design unit required |
| Origin story pages | DEFERRED | Evidence-gated (requires cluster config or DPP data) |
| Category-level inquiry handoff | DEFERRED | Page 11 public inquiry design unit |
| Authenticated B2C continuation from category pages | DEFERRED | D2C/B2C authenticated families |

---

## 20. Adjacent Findings

### Finding 1: `CatalogItem.productCategory` normalization alignment with IndustrySegment values

**Title:** B2C projection `category` field may not exactly match `IndustrySegment` enum values
for all live products.

**Rationale:** `B2CBrowse.tsx` filter uses `p.category === activeCategory` where `activeCategory`
is an `IndustrySegment` string. The backend `publicB2CProjection.service.ts` returns
`CatalogItem.productCategory` as-is. If any supplier has entered a `productCategory` value that
does not exactly match `INDUSTRY_SEGMENTS` (e.g., "garment" vs "Garments"), the filter and
category story page product grid will silently return zero results for that product.

**Likely file surface:** `server/src/services/publicB2CProjection.service.ts` (normalization
logic), potentially `server/prisma/schema.prisma` (if an enum constraint is added).

**Classification:** IMPLEMENTATION-READY — can be addressed as a normalization validation in
the implementation unit without schema changes if handled server-side in projection output.

**Blocks this unit?** NO. Recorded for the implementation unit.

### Finding 2: `publicPageMeta.ts` doc-header describes D2C-only scope

**Title:** `utils/publicPageMeta.ts` doc-header limits stated scope to D2C public collection
surfaces, but the utility is generically reusable.

**Rationale:** The function signature and implementation are generic. The doc-header is the
only thing that needs updating. This finding confirms the utility does NOT need functional
modification — only a scope comment update.

**Likely file surface:** `utils/publicPageMeta.ts` (doc comment only).

**Classification:** IMPLEMENTATION-READY — include in implementation unit allowlist.

**Blocks this unit?** NO.

### Finding 3: No `/products` (plural) landing page exists

**Title:** Choosing Option B route (`/products/category/:categorySlug`) creates a namespace
under `/products/` without a `/products` base page.

**Rationale:** Crawlers following links to `/products/category/garments` may attempt to crawl
`/products/` (without path). This will resolve to an unmatched state in App.tsx (likely falling
through to `PUBLIC_ENTRY` or similar). Until a `/products` landing page exists, this URL would
return the default state rather than a 404.

**Likely file surface:** `App.tsx` — add an explicit route match for `/products` redirecting
to B2C browse state, OR accept the current fallback behavior and add to deferred items.

**Classification:** DESIGN-GATED — consider whether `/products` needs an explicit route state.
Not a blocker for category story pages but should be addressed in the implementation unit as a
deliberate decision.

**Blocks this unit?** NO. Design record only.

### Finding 4: `B2C_CATEGORY_FILTER_VALUES` in `B2CBrowse.tsx` is separate from category story config

**Title:** Two separate arrays define the approved B2C category set:
`B2C_CATEGORY_FILTER_VALUES` (in browse) and the proposed `publicB2CCategoryPages.ts` config.
These must remain in sync.

**Rationale:** If a new category is added to category story pages but not to browse filter chips
(or vice versa), the two surfaces will diverge. Consider whether the implementation unit should
derive both from the same config source (e.g., `publicB2CCategoryPages.ts` exports the slug
set, and `B2CBrowse.tsx` imports from it).

**Classification:** IMPLEMENTATION-READY — architectural decision for the implementation unit.

**Blocks this unit?** NO.

---

## 21. Acceptance Criteria

This design artifact is accepted when:

1. ✅ Route model is recommended with conflict analysis against App.tsx — DONE (Option B)
2. ✅ Initial category set is defined with deferred categories documented — DONE (4 categories)
3. ✅ Page IA is defined with all zones, navigation, empty states, and unknown slug behavior — DONE
4. ✅ Static config / projection hybrid strategy is defined — DONE
5. ✅ D2C separation rules are explicit — DONE
6. ✅ Public/private boundary rules are explicit — DONE
7. ✅ Claim and evidence rules are explicit — DONE
8. ✅ DPP/passport/trust rules are explicitly carried forward — DONE
9. ✅ SEO ownership (implementation-owned vs deferred) is decided — DONE
10. ✅ Implementation allowlist is proposed — DONE
11. ✅ Verification plan defined — DONE
12. ✅ No runtime files changed in this unit — CONFIRMED
13. ✅ Adjacent findings documented — DONE
14. ✅ Deferred items documented — DONE
15. ✅ B2C tracker updated — PENDING (done in tracker update section)
