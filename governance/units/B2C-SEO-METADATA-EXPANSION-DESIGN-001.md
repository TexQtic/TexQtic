# B2C-SEO-METADATA-EXPANSION-DESIGN-001
## B2C Public Surface SEO Metadata Expansion — Design

**Unit ID:** B2C-SEO-METADATA-EXPANSION-DESIGN-001
**Family:** B2C Public Attraction Layer Governance
**Artifact class:** Governance design — design-only, no runtime changes
**Status:** DESIGN_COMPLETE
**Date:** 2026-07-07
**Authorized by:** Paresh
**Tracker reference:** TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001, Section 24

---

## 1. Status Summary

| Field | Value |
|---|---|
| Unit ID | B2C-SEO-METADATA-EXPANSION-DESIGN-001 |
| Status | DESIGN_COMPLETE |
| Scope | B2C public route SEO metadata — browse, product detail, unavailable states |
| Prior unit | B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001 (VERIFIED_COMPLETE) |
| Runtime changes introduced | None (design only) |
| Schema changes introduced | None |
| API changes introduced | None |
| Files modified | Governance artifact created; tracker updated |
| Commit message | `[TEXQTIC] governance: design B2C SEO metadata expansion` |

---

## 2. Current Repo Truth

### 2.1 SEO Infrastructure

- **SEO utility:** `utils/publicPageMeta.ts` — exports `applyPublicPageMeta(input: PublicPageMetaInput)`, `clearPublicPageMeta()`, `PUBLIC_META_OG_FALLBACK_IMAGE = '/brand/texqtic-logo.png'`. Generic and complete — no changes to the utility needed for this expansion.
- **Canonical origin pattern:** `const origin = globalThis.window?.location.origin ?? ''` — produces `https://app.texqtic.com` in production.
- **SEO useEffect location:** `App.tsx` — responsible for all public SEO metadata application.
- **SEO useEffect current deps:** `[appState, publicCollectionSlugFromPath, publicCategorySlugFromPath]`
- **Index HTML:** Only `<title>TexQtic Platform</title>`. No description, OG, canonical, or robots meta tags.
- **Decision authority:** `PUBLIC-SEO-INFRASTRUCTURE-DECISION-001.md` (repo root) — DECIDED, Option E (repo-local DOM utility). Scope expanded from D2C-only to all public surfaces.

### 2.2 Route and State Inventory — Full Public Surface Map

Confirmed by direct inspection of `App.tsx` (routes, resolveInitialAppState, SEO useEffect) and `PUBLIC-FACING-PAGES-SEQUENCE-DECISION-001.md`:

| Route | App State | Path captured? | Metadata applied? | Status |
|---|---|---|---|---|
| `/collections` | `PUBLIC_COLLECTIONS` | N/A (static) | YES — Stage 1 (D2C) | ✅ Done |
| `/collections/:slug` (known) | `PUBLIC_COLLECTION_DETAIL` | `publicCollectionSlugFromPath` | YES — Stage 1 (D2C) | ✅ Done |
| `/collections/:slug` (unknown) | `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | `publicCollectionSlugFromPath` | YES — Stage 1 (D2C) | ✅ Done |
| `/products/category/:slug` (known) | `PUBLIC_B2C_CATEGORY_STORY` | `publicCategorySlugFromPath` | YES — Stage 1 (B2C) | ✅ Done |
| `/products/category/:slug` (unknown) | `PUBLIC_B2C_CATEGORY_STORY` | `publicCategorySlugFromPath` | YES — noindex fallback | ✅ Done |
| `/products` | `PUBLIC_B2C_BROWSE` | N/A (static) | **NO** — `clearPublicPageMeta()` | ❌ Gap |
| `/product/:slug` (found) | `PUBLIC_PRODUCT_DETAIL` | `publicProductSlugFromPath` | **NO** — `clearPublicPageMeta()` | ❌ Gap |
| `/product/:slug` (not found) | `PUBLIC_PRODUCT_DETAIL` | `publicProductSlugFromPath` | **NO** — `clearPublicPageMeta()` | ❌ Gap |
| `/passport/:id` | `PUBLIC_PASSPORT` | `publicPassportIdFromPath` | **NO** — `clearPublicPageMeta()` | Adjacent |
| `/supplier/:slug` | `PUBLIC_SUPPLIER_PROFILE` | `publicSupplierSlugFromPath` | **NO** — `clearPublicPageMeta()` | Adjacent |
| `/trust` | `PUBLIC_TRUST_LANDING` | N/A (static) | **NO** — `clearPublicPageMeta()` | Adjacent |
| `/industries` | `PUBLIC_INDUSTRY_CLUSTER_LANDING` | N/A (static) | **NO** — `clearPublicPageMeta()` | Adjacent |
| `/aggregator` | `PUBLIC_AGGREGATOR` | N/A (static) | **NO** — `clearPublicPageMeta()` | Adjacent |
| `/join/:referral_code` | `PUBLIC_REFERRAL_LANDING` | `publicReferralCodeFromPath` | **NO** — `clearPublicPageMeta()` | Adjacent |
| `/` (unauthenticated) | `PUBLIC_ENTRY` | N/A | **NO** — `clearPublicPageMeta()` | Out of scope |

### 2.3 Product Detail — Async Data Challenge

`PublicProductDetail` (`components/Public/PublicProductDetail.tsx`) manages async data internally:
- Fetches via `getPublicB2CProductBySlug(slug)` from `services/publicB2CService.ts`
- Internal states: `loading` → `product` (found) | `notFound` (404)
- App.tsx SEO useEffect runs **before** this async fetch resolves
- App.tsx only has `publicProductSlugFromPath` (the slug string) when the SEO effect executes

**Key consequence:** App.tsx cannot know at SEO-effect time whether the product is found or not-found, and cannot access product name/description without either lifting the fetch or adding a state-back channel.

### 2.4 Public Product Data Fields Available for Metadata

From `PublicB2CProductDetail` interface in `services/publicB2CService.ts`:

**Safe to use in metadata (public-safe, non-identifying):**
- `slug` — used for canonical URL construction only
- `name` — public product name
- `category` — public-safe industry category
- `material` — public-safe material descriptor
- `fabricType` — public-safe fabric type
- `summary` — public-safe summary (~1-3 sentences)
- `publicSupplierName` — public supplier name
- `publicPriceLabel` — governed public price string (e.g. "Price on Request")
- `publicStatusLabel` — public availability status
- `tags` — public tags array

**Forbidden from metadata:**
- `publicSupplierSlug` — internal routing identifier, not display content
- `trustSignals` — conditional attestation; cannot be asserted in metadata without verification
- `hasTraceabilityEvidence` — boolean conditional; do not assert in metadata
- `hasPassport` — boolean conditional; do not mention
- `publicPassportId` — internal ID
- `relatedProducts` — not metadata content
- `description` — may be longer-form; use `summary` as preferred description source

### 2.5 B2C Browse Component

`components/Public/B2CBrowse.tsx` renders a product grid with filtering. It does not manage or apply any SEO metadata. No metadata-related changes needed in this component for the expansion.

### 2.6 Existing Tests

No unit or integration tests covering `applyPublicPageMeta` or `clearPublicPageMeta` exist in `tests/`. No SEO-scoped test files present. Testing for metadata must be done via browser smoke and production verification.

### 2.7 JSON-LD

`public/dpp/v1/context.jsonld` is the only JSON-LD artifact. It is a DPP vocabulary context file, served as a static asset under `/dpp/v1/context.jsonld`. It is not a general-purpose structured data schema for product pages. No changes to this file are in scope.

### 2.8 Vercel Routing

`vercel.json` routes:
- `/api/**` → `api/index.ts` (serverless)
- `/dpp/v1/context.jsonld` → static serve with JSON-LD headers
- Filesystem fallback, then SPA catch-all `/**` → `index.html`

No changes to `vercel.json` required for SEO metadata expansion (metadata is JS-DOM-managed, no static page variants involved).

---

## 3. Problem Statement

The TexQtic public B2C browse and product detail surfaces (`/products`, `/product/:slug`) currently call `clearPublicPageMeta()` when entered. This means:

1. **`/products`** — no title, no description, no canonical, no OG tags. Googlebot sees a blank SEO signal, reducing discoverability for the top-level B2C browse surface.

2. **`/product/:slug`** — no product-specific title or description. Public textile product pages are indexed (or not indexed) with zero context. Given that these are the highest-value SEO targets (individual product-level signals), this is the most significant gap.

3. **`/product/:slug` not-found** — currently falls through to `clearPublicPageMeta()`, the same as a found product. No `noindex` applied. This means broken/unavailable product URLs may accumulate in search indices without crawl signals to delist them.

Both category story pages and D2C collection pages already have correct Stage 1 metadata. B2C browse and product detail remain unaddressed.

---

## 4. Design Goals

1. **Cover `/products` (B2C browse):** Apply static `index, follow` metadata. One-line useEffect arm. No async data needed.

2. **Cover `/product/:slug` (found state):** Apply product-aware metadata using the best available data at SEO-effect time. Design two stages: Stage 2a (slug-only, immediate) and Stage 2b (rich product metadata via state-back channel, recommended next step).

3. **Cover `/product/:slug` (not-found state):** Apply `noindex, nofollow` with canonical fallback to `/products`. Requires a state-back signal from component to App.tsx.

4. **Maintain architecture discipline:** SEO application stays in App.tsx SEO useEffect. No metadata logic enters individual components. No changes to `publicPageMeta.ts`.

5. **Fail safe on all paths:** Any ambiguous or borderline case gets `noindex, nofollow`. Err toward not indexing over incorrectly indexing.

6. **No private data in metadata:** Enforce public-safety boundary. Only `PublicB2CProductDetail` public fields — no authenticated fields, internal IDs, or conditional trust signals.

7. **No sitemap.xml, robots.txt, JSON-LD, or Search Console** changes in this design. These are explicitly deferred.

---

## 5. Route Inventory and Metadata Coverage

### Routes in Primary Scope (this unit's design)

| Route | AppState | Target State | Metadata Source |
|---|---|---|---|
| `/products` | `PUBLIC_B2C_BROWSE` | `index, follow` | Static copy |
| `/product/:slug` (found) | `PUBLIC_PRODUCT_DETAIL` | `index, follow` | Slug-only (Stage 2a); product fields (Stage 2b) |
| `/product/:slug` (not-found) | `PUBLIC_PRODUCT_DETAIL` | `noindex, nofollow` | Requires found/notFound signal |

### Routes in Adjacent Scope (considered, not in primary implementation)

| Route | AppState | Design Recommendation |
|---|---|---|
| `/passport/:id` | `PUBLIC_PASSPORT` | Defer. Passport ID is dynamic; metadata needs passport fields. Separate design unit. |
| `/supplier/:slug` | `PUBLIC_SUPPLIER_PROFILE` | Defer. Supplier metadata needs supplier-level fields. Separate design unit. |
| `/trust` | `PUBLIC_TRUST_LANDING` | Static landing. Can be addressed in this implementation unit as a low-effort add. |
| `/industries` | `PUBLIC_INDUSTRY_CLUSTER_LANDING` | Static landing. Can be addressed in this implementation unit as a low-effort add. |
| `/aggregator` | `PUBLIC_AGGREGATOR` | Static preview. `noindex, nofollow` until aggregator is public-ready. |

---

## 6. Options Considered — Product Detail Metadata Source

The product detail route is the primary design challenge. Three options considered:

### Option A — Slug-Only Static Metadata (Stage 2a)

Apply generic metadata using only the slug from `publicProductSlugFromPath`.

- **Title:** `"Textile Product Preview — TexQtic"` (same for all product pages)
- **Description:** Generic description about viewing textile products on TexQtic
- **Canonical:** `${origin}/product/${slug}`
- **robots:** `index, follow` (always — cannot distinguish found vs. not-found in App.tsx alone)
- **Limitation:** No product-specific signals; found vs. not-found is indistinguishable from App.tsx perspective; may index broken product URLs

**Verdict:** Acceptable as immediate stopgap. Directly implementable in `B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001` with minimal App.tsx changes.

### Option B — Lift Product Fetch to App.tsx

Move `getPublicB2CProductBySlug(slug)` into App.tsx state.

- **Upside:** App.tsx SEO effect can use product name, description, category, supplier; can distinguish found vs. not-found
- **Downside:** Doubles the fetch (App.tsx + component); couples App.tsx data layer to product detail; out of pattern with existing architecture; significant App.tsx change

**Verdict:** Not recommended. Over-engineering at this stage. Violates minimal-diff discipline.

### Option C — Callback-Based State-Back Channel (Stage 2b) ✅ RECOMMENDED

Add a minimal callback prop to `PublicProductDetail`: `onProductMetaReady: (meta: PublicProductDetailMetaSignal) => void`.

- App.tsx adds a new state: `publicProductDetailMeta: PublicProductDetailMetaSignal | null`
- `PublicProductDetail` calls `onProductMetaReady({ type: 'found', name, category, summary, publicSupplierName } | { type: 'notFound' })` after the async fetch resolves
- App.tsx SEO useEffect watches `publicProductDetailMeta` in addition to existing deps
- SEO effect applies:
  - `type === 'found'` → rich metadata with actual product fields, `index, follow`
  - `type === 'notFound'` → `noindex, nofollow`, canonical `/products`
  - Initial render (before callback fires) → apply slug-only metadata (Stage 2a level) to avoid a gap

**Verdict:** Recommended path. Minimal App.tsx change. Keeps SEO logic in App.tsx. Follows existing pattern. Implementable in a subsequent unit: `B2C-PRODUCT-DETAIL-RICH-SEO-001` (after Stage 2a validates the infrastructure).

### Option D — Apply Metadata in Component (rejected)

Apply `applyPublicPageMeta` inside `PublicProductDetail` after fetch resolves.

**Verdict:** Rejected. Violates the architectural decision that SEO is App.tsx's responsibility. Creates dual SEO authority — component and App.tsx would both manage `<head>`. Introduces ordering bugs when navigating.

---

## 7. Recommended Metadata Model

### 7.1 `/products` — B2C Browse

```
title:              "Explore Textile Products — TexQtic"
description:        "Browse public-safe textile product previews across garments, home textiles, technical textiles, and fabrics on TexQtic."
canonical:          "${origin}/products"
robots:             "index, follow"
ogTitle:            "Explore Textile Products — TexQtic"
ogDescription:      "Browse public-safe textile product previews across garments, home textiles, technical textiles, and fabrics on TexQtic."
ogImage:            PUBLIC_META_OG_FALLBACK_IMAGE
ogUrl:              "${origin}/products"
ogType:             "website"
twitterCard:        "summary_large_image"
twitterTitle:       "Explore Textile Products — TexQtic"
twitterDescription: "Browse public-safe textile product previews across garments, home textiles, technical textiles, and fabrics on TexQtic."
twitterImage:       PUBLIC_META_OG_FALLBACK_IMAGE
```

### 7.2 `/product/:slug` — Stage 2a (Slug-Only)

When `appState === 'PUBLIC_PRODUCT_DETAIL'` and `publicProductSlugFromPath` is a valid slug string:

```
title:              "Textile Product Preview — TexQtic"
description:        "View this public-safe textile product preview on TexQtic. Discover materials, categories, and supply chain context from verified suppliers."
canonical:          "${origin}/product/${publicProductSlugFromPath}"
robots:             "index, follow"
ogTitle:            "Textile Product Preview — TexQtic"
ogDescription:      "View this public-safe textile product preview on TexQtic. Discover materials, categories, and supply chain context from verified suppliers."
ogImage:            PUBLIC_META_OG_FALLBACK_IMAGE
ogUrl:              "${origin}/product/${publicProductSlugFromPath}"
ogType:             "product"
twitterCard:        "summary_large_image"
twitterTitle:       "Textile Product Preview — TexQtic"
twitterDescription: "View this public-safe textile product preview on TexQtic. Discover materials, categories, and supply chain context from verified suppliers."
twitterImage:       PUBLIC_META_OG_FALLBACK_IMAGE
```

**Known limitation:** Stage 2a cannot distinguish found vs. not-found. Both states receive `index, follow`. This is an acceptable temporary state — the not-found product page still displays "Product not found" UI; crawlers may de-index naturally if they receive consistent 200+no-content signals. Stage 2b resolves this.

### 7.3 `/product/:slug` — Stage 2b (Rich, via State-Back Callback)

When `publicProductDetailMeta.type === 'found'`:

```
title:              "${product.name} — TexQtic Textile Products"
                    (fallback if no name: "Textile Product Preview — TexQtic")
description:        product.summary (truncated to 155 chars, trailing "...")
                    (fallback if no summary: "Public-safe ${product.category ?? 'textile'} product from ${product.publicSupplierName ?? 'a verified supplier'}. Browse textile products on TexQtic.")
canonical:          "${origin}/product/${slug}"
robots:             "index, follow"
ogType:             "product"
```

When `publicProductDetailMeta.type === 'notFound'`:

```
title:              "Product Not Found — TexQtic"
description:        "This product is no longer available on TexQtic. Browse all available textile products."
canonical:          "${origin}/products"
robots:             "noindex, nofollow"
ogType:             "website"
```

### 7.4 Adjacent Static Routes (low-effort adds in Implementation Unit)

**`/trust` — `PUBLIC_TRUST_LANDING`:**
```
title:              "Trust & Origin — TexQtic"
description:        "TexQtic's trust layer for textile supply chain transparency. Learn how origin, certifications, and traceability are verified."
canonical:          "${origin}/trust"
robots:             "index, follow"
ogType:             "website"
```

**`/industries` — `PUBLIC_INDUSTRY_CLUSTER_LANDING`:**
```
title:              "Textile Industries — TexQtic"
description:        "Explore TexQtic's textile industry clusters: garments, home textiles, technical textiles, and fabrics. Discover suppliers and products by segment."
canonical:          "${origin}/industries"
robots:             "index, follow"
ogType:             "website"
```

**`/aggregator` — `PUBLIC_AGGREGATOR`:**
```
title:              "TexQtic Aggregator Preview"
description:        "Preview the TexQtic aggregator surface."
canonical:          "${origin}/aggregator"
robots:             "noindex, nofollow"
ogType:             "website"
```

Note: Aggregator is `noindex, nofollow` until the aggregator is production-ready and approved for indexing.

---

## 8. Canonical URL Strategy

No change to the existing canonical URL strategy:

```typescript
const origin = globalThis.window?.location.origin ?? '';
```

- Produces `https://app.texqtic.com` in production
- Produces `http://localhost:5173` (or equivalent) in local dev
- All canonical values are absolute URLs constructed from this pattern

**Domain strategy deferral:** The question of whether `app.texqtic.com` vs. `texqtic.com` is the canonical production domain is **explicitly deferred** — see Section 17.

---

## 9. Robots Policy

### 9.1 Index/Follow Matrix (Stage 2a, post-implementation)

| Route | robots Value | Rationale |
|---|---|---|
| `/products` | `index, follow` | Top-level B2C browse — should be indexed |
| `/product/:slug` (known slug format) | `index, follow` | Product pages are public-facing SEO targets |
| `/products/category/:slug` (known) | `index, follow` | ✅ Already implemented |
| `/products/category/:slug` (unknown) | `noindex, nofollow` | ✅ Already implemented |
| `/collections` | `index, follow` | ✅ Already implemented |
| `/collections/:slug` (known) | `index, follow` | ✅ Already implemented |
| `/collections/:slug` (unknown) | `noindex, nofollow` | ✅ Already implemented |
| `/trust` | `index, follow` | Static landing, indexable |
| `/industries` | `index, follow` | Static landing, indexable |
| `/aggregator` | `noindex, nofollow` | Preview surface, not yet ready for indexing |
| `/passport/:id` | `noindex, nofollow` | Deferred — apply conservative default |
| `/supplier/:slug` | `noindex, nofollow` | Deferred — apply conservative default |

### 9.2 Fail-Safe Rule

Any public surface not explicitly assigned an `index, follow` robots policy **MUST** default to `noindex, nofollow`. This is the existing `clearPublicPageMeta()` behavior for all unaddressed states and is maintained as the fail-safe.

---

## 10. Open Graph / Twitter Card Policy

### 10.1 OG Type Assignment

| Route Category | ogType |
|---|---|
| Browse surfaces (`/products`, `/collections`) | `website` |
| Category story pages (`/products/category/:slug`) | `website` |
| Product detail pages (`/product/:slug`) | `product` |
| Static landing pages (`/trust`, `/industries`) | `website` |
| Not-found / unavailable states | `website` |

### 10.2 OG Image

- All routes use `PUBLIC_META_OG_FALLBACK_IMAGE = '/brand/texqtic-logo.png'` as the OG image for Stage 2a.
- Stage 2b may use product image URLs (`product.imageUrls[0]`) when available, subject to future design review. Not in Stage 2a scope.

### 10.3 OG Image Safety Rule

Product image URLs from `PublicB2CProductDetail.imageUrls` **MUST NOT** be used in OG metadata until it is confirmed that:
1. Image URLs are public and require no auth
2. Image aspect ratios and dimensions meet OG requirements (1.91:1, min 1200×630)
3. Images are served from a stable, SEO-safe CDN

These conditions are not verified at this time. Stage 2a uses the fallback logo universally.

---

## 11. Product Detail Metadata Rules

### 11.1 Field Eligibility Summary

| `PublicB2CProductDetail` field | Metadata use | Rationale |
|---|---|---|
| `slug` | Canonical URL construction only | Not display content |
| `name` | ✅ Title construction | Public product name |
| `category` | ✅ Description construction | Public-safe segment |
| `material` | ✅ Description construction | Public-safe |
| `fabricType` | ✅ Description construction | Public-safe |
| `summary` | ✅ description (preferred) | Public-safe summary |
| `description` | ⚠️ Secondary fallback only | May be long-form; truncate to 155 chars |
| `publicSupplierName` | ✅ Description construction (Stage 2b) | Public supplier name |
| `publicPriceLabel` | ❌ Do not use | Price signals in metadata may be misleading; defer |
| `publicStatusLabel` | ❌ Do not use | Availability labels too granular for metadata |
| `publicSupplierSlug` | ❌ Do not use | Internal identifier, not display content |
| `tags` | ❌ Do not use in visible fields | May leak internal taxonomy terms |
| `trustSignals` | ❌ Do not use | Conditional attestation |
| `hasTraceabilityEvidence` | ❌ Do not use | Boolean conditional |
| `hasPassport` | ❌ Do not use | Boolean conditional |
| `publicPassportId` | ❌ Do not use | Internal ID |
| `relatedProducts` | ❌ Do not use | Not metadata content |
| `imageUrls` | ❌ Do not use in Stage 2a | See OG image safety rule (Section 10.3) |

### 11.2 Title Construction Rules

**Stage 2a:**
```
title = "Textile Product Preview — TexQtic"
```

**Stage 2b:**
```
if (product.name) {
  title = `${product.name} — TexQtic Textile Products`
} else {
  title = "Textile Product Preview — TexQtic"
}
```

### 11.3 Description Construction Rules

**Stage 2a:**
```
description = "View this public-safe textile product preview on TexQtic. Discover materials, categories, and supply chain context from verified suppliers."
```

**Stage 2b:**
```
if (product.summary) {
  description = product.summary.length > 155
    ? product.summary.slice(0, 152) + '...'
    : product.summary
} else {
  const categoryHint = product.category ?? 'textile'
  const supplierHint = product.publicSupplierName ?? 'a verified supplier'
  description = `Public-safe ${categoryHint} product from ${supplierHint}. Browse textile products and supply chain context on TexQtic.`
}
```

---

## 12. Browse Metadata Rules

`PUBLIC_B2C_BROWSE` → `/products` is a static route. Metadata is static copy — no dynamic data required.

```typescript
case 'PUBLIC_B2C_BROWSE': {
  const origin = globalThis.window?.location.origin ?? '';
  applyPublicPageMeta({
    title: 'Explore Textile Products — TexQtic',
    description: 'Browse public-safe textile product previews across garments, home textiles, technical textiles, and fabrics on TexQtic.',
    canonical: `${origin}/products`,
    robots: 'index, follow',
    ogTitle: 'Explore Textile Products — TexQtic',
    ogDescription: 'Browse public-safe textile product previews across garments, home textiles, technical textiles, and fabrics on TexQtic.',
    ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
    ogUrl: `${origin}/products`,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Explore Textile Products — TexQtic',
    twitterDescription: 'Browse public-safe textile product previews across garments, home textiles, technical textiles, and fabrics on TexQtic.',
    twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
  });
  break;
}
```

---

## 13. Category Story Metadata Rules

**Already implemented in Stage 1.** No changes needed.

See: `B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001` (VERIFIED_COMPLETE, commit `7b786a7`).

---

## 14. Unavailable / Unknown Route Metadata Rules

**Already implemented in Stage 1 for D2C collection routes:**
- `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE`: `noindex, nofollow`, canonical `/collections` or `/collections/:slug`
- `PUBLIC_B2C_CATEGORY_STORY` (unknown slug): `noindex, nofollow`, canonical `/products`

**New in this expansion:**

`PUBLIC_PRODUCT_DETAIL` unavailable state (Stage 2b):
- robots: `noindex, nofollow`
- canonical: `${origin}/products`
- title: `"Product Not Found — TexQtic"`
- description: `"This product is no longer available on TexQtic. Browse all available textile products."`

**Stage 2a limitation:** Without the state-back channel, App.tsx cannot distinguish found vs. not-found for product detail at SEO-effect time. Stage 2a applies `index, follow` uniformly for any product slug matching the URL pattern. This is documented as a known limitation and addressed by Stage 2b.

---

## 15. Public / Private Metadata Boundary

This design is scoped entirely to public surfaces. The boundary rules are unchanged from Stage 1:

1. **Only fields from `PublicB2C*` interfaces** may be used in metadata. No authenticated or tenant-scoped fields.

2. **No conditional trust signals in metadata.** `trustSignals`, `hasTraceabilityEvidence`, `hasPassport` are boolean/conditional attestations. Asserting them in metadata without verification is false advertising. These fields are excluded from all metadata.

3. **No supplier internal identifiers.** `publicSupplierSlug` is a routing key, not display content for metadata.

4. **No price signals in metadata (Stage 2a/2b).** `publicPriceLabel` may be misleading without context ("Price on Request" is not useful as a metadata description). Excluded from metadata.

5. **All metadata values must be safe to show to unauthenticated visitors.** Any field that could leak buyer-specific context, pricing logic, or internal classification must be excluded.

---

## 16. Sitemap / JSON-LD / robots.txt Deferrals

These are explicitly deferred and not in scope for this unit or the associated implementation unit:

| Feature | Deferral Reason |
|---|---|
| `sitemap.xml` | Requires stable URL set; product slug inventory may be large/dynamic; depends on domain strategy resolution |
| `robots.txt` | Requires domain strategy decision (app.texqtic.com vs. texqtic.com); overall crawl policy not yet defined |
| Product-level JSON-LD (`schema.org/Product`) | Requires product data projection review; depends on Stage 2b rich metadata decisions |
| `schema.org/WebPage` / `BreadcrumbList` JSON-LD | Useful but not critical; deferred to structured data unit |
| Google Search Console setup | Operational task; not a codebase change |
| `public/dpp/v1/context.jsonld` | DPP vocabulary file only; not general SEO structured data; must not be modified |

---

## 17. Domain Strategy Deferral

The current canonical origin (`https://app.texqtic.com`) is the origin as deployed. A potential future migration to `https://texqtic.com` as the primary public surface would affect all canonical URLs and require a systematic update of:
- All `applyPublicPageMeta` canonical values
- A `301 redirect` map from `app.texqtic.com` to `texqtic.com`
- `robots.txt` and `sitemap.xml` root URL
- Vercel routing configuration

**This domain strategy decision is explicitly deferred.** All canonical URLs in this design use the existing `globalThis.window?.location.origin ?? ''` pattern, which is environment-aware and will naturally pick up any domain change without code modifications. No hardcoded domain strings are introduced.

---

## 18. Implementation Plan

### 18.1 Stage 2a — Immediate (B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001)

**Files to modify:**
1. `App.tsx` — SEO useEffect additions only

**Changes:**
1. Add `publicProductSlugFromPath` to the SEO useEffect deps array
2. Add `case 'PUBLIC_B2C_BROWSE'` arm in the SEO useEffect switch — static metadata
3. Add `case 'PUBLIC_PRODUCT_DETAIL'` arm — slug-based metadata, `index, follow` for valid slug
4. (Optional) Add `case 'PUBLIC_TRUST_LANDING'` arm — static metadata
5. (Optional) Add `case 'PUBLIC_INDUSTRY_CLUSTER_LANDING'` arm — static metadata
6. (Optional) Add `case 'PUBLIC_AGGREGATOR'` arm — `noindex, nofollow`

**No changes to:**
- `utils/publicPageMeta.ts` — no changes needed
- `components/Public/B2CBrowse.tsx` — no changes needed
- `components/Public/PublicProductDetail.tsx` — no changes in Stage 2a
- `index.html` — no changes
- `vercel.json` — no changes
- Any API route, schema, or service file

### 18.2 Stage 2b — Next Unit (B2C-PRODUCT-DETAIL-RICH-SEO-001)

**Files to modify:**
1. `App.tsx` — new `publicProductDetailMeta` state + useEffect dep
2. `components/Public/PublicProductDetail.tsx` — add `onProductMetaReady` prop; call it after fetch resolves

**New type to define:**
```typescript
// In App.tsx or types.ts
type PublicProductDetailMetaSignal =
  | { type: 'found'; name: string; category: string | null; summary: string | null; publicSupplierName: string }
  | { type: 'notFound' };
```

**Scope boundary:** Stage 2b is a separate unit. It is not in scope for `B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001`.

---

## 19. Proposed Implementation Allowlist

For `B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001` (Stage 2a):

### Modify
- `App.tsx` — SEO useEffect only (no other sections)

### Read-only
- `utils/publicPageMeta.ts`
- `config/publicB2CCategoryPages.ts`
- `components/Public/B2CBrowse.tsx`
- `components/Public/PublicProductDetail.tsx`
- `services/publicB2CService.ts`
- `governance/units/B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001.md`
- `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md`

### Create (governance artifact only)
- `governance/units/B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001.md` (tracker record)

### Explicitly Forbidden
- `utils/publicPageMeta.ts` — no modifications
- `components/Public/PublicProductDetail.tsx` — no modifications in Stage 2a
- `index.html`, `vercel.json`, `.env`, any API/schema/server file
- No new npm packages
- No new utility functions or helper files

---

## 20. Verification Plan (for Implementation Unit)

All verification is browser-based and production-smoke-based. No automated tests exist for SEO metadata.

### 20.1 Local Verification Matrix

| Step | Route | Check |
|---|---|---|
| 1 | `/products` | `document.title === "Explore Textile Products — TexQtic"` |
| 2 | `/products` | `meta[name=description]` content matches designed value |
| 3 | `/products` | `meta[name=robots]` content === `"index, follow"` |
| 4 | `/products` | `link[rel=canonical]` href === `http://localhost:5173/products` |
| 5 | `/products` | OG tags present: title, description, image, url, type=website |
| 6 | `/product/[known-slug]` | `document.title === "Textile Product Preview — TexQtic"` |
| 7 | `/product/[known-slug]` | `meta[name=robots]` content === `"index, follow"` |
| 8 | `/product/[known-slug]` | `link[rel=canonical]` href contains the slug |
| 9 | `/product/[known-slug]` | OG type === `"product"` |
| 10 | Navigate: `/products` → `/product/[slug]` → back | Metadata transitions correctly; no residual tags |
| 11 | Navigate: `/products/category/garments` | Category story metadata still correct (no regression) |
| 12 | Navigate: `/collections` | Collection metadata still correct (no regression) |
| 13 | All SEO-tagged elements | Carry `data-texqtic-public-meta="true"` attribute |
| 14 | `/products` then navigate to authenticated state | `clearPublicPageMeta()` fires on authenticated entry |

### 20.2 Regression Tests

All previously verified routes must be regression-checked after each `App.tsx` change:
- `/collections`
- `/collections/:slug` (known)
- `/collections/:slug` (unknown)
- `/products/category/garments`
- `/products/category/home-textiles`
- `/products/category/technical-textiles`
- `/products/category/fabrics`
- `/products/category/unknown-slug`

---

## 21. Production Verification Plan

After implementation is merged and deployed to `https://app.texqtic.com`:

| Step | Action |
|---|---|
| 1 | Navigate to `https://app.texqtic.com/products` |
| 2 | Open DevTools → Elements → `<head>` — verify title, description, robots, canonical, OG tags |
| 3 | Navigate to a known product URL (from seeded data) |
| 4 | Verify product detail title, robots, canonical, OG type |
| 5 | Navigate to `/products/category/garments` — confirm Stage 1 metadata unaffected |
| 6 | Navigate to `/collections` — confirm D2C metadata unaffected |
| 7 | `curl -i https://app.texqtic.com/products` — verify `Content-Type: text/html` (SPA baseline) |
| 8 | Backend health: `GET http://localhost:3001/health` → `{"status":"ok"}` |

---

## 22. Deferred Items

| # | Item | Reason |
|---|---|---|
| D1 | `sitemap.xml` | Requires stable URL inventory and domain strategy |
| D2 | `robots.txt` | Requires domain strategy decision |
| D3 | Product-level JSON-LD (`schema.org/Product`) | Requires Stage 2b decisions |
| D4 | Supplier profile metadata (`/supplier/:slug`) | Separate design unit required |
| D5 | Passport metadata (`/passport/:id`) | Separate design unit required |
| D6 | Product detail not-found `noindex` (Stage 2b) | Requires `B2C-PRODUCT-DETAIL-RICH-SEO-001` |
| D7 | Product detail rich metadata with product name/description (Stage 2b) | Requires `B2C-PRODUCT-DETAIL-RICH-SEO-001` |
| D8 | OG image from product `imageUrls` | Requires image hosting safety review |
| D9 | Domain canonical migration (app.texqtic.com → texqtic.com) | Requires domain strategy decision |
| D10 | Google Search Console setup | Operational, not a codebase task |
| D11 | Aggregator surface indexing | Blocked on aggregator production-readiness |
| D12 | Page 11 public inquiry surface metadata | Blocked on Page 11 design unit |
| D13 | B2C inquiry handoff surface metadata | Blocked on inquiry handoff design unit |
| D14 | Authenticated surface metadata | Out of public surface scope |

---

## 23. Adjacent Findings

1. **`App.tsx` SEO useEffect deps missing `publicProductSlugFromPath`:** Even in current state, if a future arm for `PUBLIC_PRODUCT_DETAIL` is added without adding `publicProductSlugFromPath` to deps, the effect won't re-run correctly on direct slug URL navigation. The implementation unit must add this to deps.

2. **`documentTitle` for `PUBLIC_B2C_BROWSE`:** The `useMemo` computing `documentTitle` in `App.tsx` does not have an explicit entry for `PUBLIC_B2C_BROWSE`. This means the browse page title falls to the default `'TexQtic'`. When `applyPublicPageMeta` is applied, the `<title>` tag in `<head>` is set via DOM manipulation, which overrides the React-managed title. However, the `documentTitle` useMemo remains `'TexQtic'` as its state value — this inconsistency is pre-existing and not in scope to fix here.

3. **`documentTitle` for `PUBLIC_PRODUCT_DETAIL`:** Currently `'TexQtic — Public Product Preview'` (line 2949 of App.tsx). After Stage 2a implementation, `applyPublicPageMeta` will set `<title>` to `"Textile Product Preview — TexQtic"` via DOM. The React-managed `documentTitle` state and the DOM title will diverge. This is a pre-existing architecture pattern (same divergence exists for other SEO states) and is not a blocker.

4. **No automated metadata tests:** There are no unit or integration tests for `publicPageMeta.ts` or any of the SEO metadata arms in App.tsx. The implementation unit should note this gap without requiring test creation (out of scope for Stage 2a).

5. **`vercel.json` catch-all SPA route:** All B2C routes correctly fall through to `index.html` via the `/(.*) → /index.html` catch-all. No changes to routing infrastructure required.

---

## 24. Acceptance Criteria

This unit (`B2C-SEO-METADATA-EXPANSION-DESIGN-001`) is DESIGN_COMPLETE when:

- [x] Full public route inventory established with current metadata coverage status
- [x] Product detail metadata design challenge documented with options evaluated
- [x] Stage 2a (slug-only) and Stage 2b (callback-based) approaches clearly distinguished
- [x] Recommended metadata model defined for all primary in-scope routes
- [x] Field eligibility matrix defined for `PublicB2CProductDetail` — safe vs. forbidden fields
- [x] Public/private metadata boundary rules stated
- [x] Implementation allowlist for `B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001` defined
- [x] Verification plan for implementation unit defined
- [x] All deferrals documented (sitemap, robots.txt, JSON-LD, domain, Stage 2b)
- [x] B2C tracker Section 24 updated
- [x] Governance artifact committed: `[TEXQTIC] governance: design B2C SEO metadata expansion`

---

## 25. Next Unit

**`B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001`**

- Scope: Stage 2a implementation — App.tsx SEO useEffect additions only
- Files to modify: `App.tsx` (SEO useEffect only)
- Validation: browser-based metadata verification matrix (Section 20 of this document)
- Commit: `[TEXQTIC] public: implement B2C SEO metadata expansion`
- Depends on: this design unit (DESIGN_COMPLETE)
