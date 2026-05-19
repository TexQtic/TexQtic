# PUBLIC-SEO-SITEMAP-ROBOTS-JSONLD-STRATEGY-DESIGN-001
## Public SEO Sitemap, Robots, JSON-LD Strategy Design

**Unit ID:** PUBLIC-SEO-SITEMAP-ROBOTS-JSONLD-STRATEGY-DESIGN-001
**Family:** B2C Public Surface / Public SEO Infrastructure
**Status:** DESIGN_COMPLETE
**Date:** 2026-05-19
**Authorized by:** Paresh
**Artifact class:** Governance design — design-only, no runtime changes
**Placement:** `governance/units/`

---

## 1. Unit Summary

This unit produces the authoritative design and strategy for public SEO infrastructure across
the now-complete public attraction surface: `sitemap.xml`, `robots.txt`, JSON-LD structured
data, and canonical URL strategy. It follows the completion of the full public inquiry
context-handoff sequence (`PUBLIC-INQUIRY-CONTEXT-HANDOFF-IMPLEMENTATION-001`) and replaces
all prior deferred SEO infrastructure stubs.

**Prior deferred references resolved by this unit:**
- `PUBLIC-SEO-INFRASTRUCTURE-DECISION-001 §7` — sitemap and JSON-LD deferred
- `D2C-COLLECTION-SEO-GOVERNANCE-001 §8.1` — structured data deferred
- `B2C-SEO-METADATA-EXPANSION-DESIGN-001` — sitemap/JSON-LD deferred post domain strategy
- Multiple tracker sections (24, 26, 33) — sitemap, robots, JSON-LD noted as post domain-strategy

**This unit does NOT implement runtime changes.** Implementation is bounded into
`PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001` (next recommended unit).

---

## 2. Repo-Truth Findings

### 2.1 Architecture

| Dimension | Repo Truth |
|---|---|
| App model | Vite + React 19 SPA — **no SSR, no SSG, no prerendering pipeline** |
| Routing | `resolveInitialAppState()` reads `window.location.pathname` at mount time |
| HTML shell | Single `index.html` — no per-route HTML generation |
| Build output | `dist/` (Vite build) — static SPA bundle |
| Head management | `utils/publicPageMeta.ts` — repo-local DOM utility (no external library) |
| Canonical base domain | `window.location.origin` (runtime-derived from browser, not hardcoded) |
| Production domain | `https://app.texqtic.com` |
| Fastify backend | API routes only; does NOT serve HTML |

### 2.2 Static Files Infrastructure

| File | Location | Status |
|---|---|---|
| `sitemap.xml` | `public/sitemap.xml` (not `dist/`) | **DOES NOT EXIST** |
| `robots.txt` | `public/robots.txt` | **DOES NOT EXIST** |
| DPP JSON-LD context | `public/dpp/v1/context.jsonld` | EXISTS (DPP-specific, not schema.org) |

**Vercel static file serving:** `vercel.json` has `"handle": "filesystem"` before the `/(.*) → /index.html`
SPA fallback. Files placed in `public/` are copied to `dist/` by Vite build and served directly
before the SPA fallback fires. This is the correct and sufficient mechanism for `sitemap.xml`
and `robots.txt` static placement.

### 2.3 Existing SEO Metadata Coverage

`utils/publicPageMeta.ts` Stage 1 utility is wired in `App.tsx` with full `applyPublicPageMeta`
calls for the following states. Fields covered per state: title, description, canonical, robots,
og:title, og:description, og:image, og:url, og:type, twitter:card, twitter:title,
twitter:description, twitter:image.

| App State | Route | Metadata Status |
|---|---|---|
| `PUBLIC_B2C_BROWSE` | `/products` | ✅ IMPLEMENTED (index, follow) |
| `PUBLIC_B2C_CATEGORY_STORY` (known) | `/products/category/:slug` (4 approved) | ✅ IMPLEMENTED (index, follow) |
| `PUBLIC_B2C_CATEGORY_STORY` (unknown) | `/products/category/:slug` (unapproved) | ✅ noindex/nofollow fallback |
| `PUBLIC_PRODUCT_DETAIL` (loading/found) | `/product/:slug` | ✅ IMPLEMENTED (index, follow) |
| `PUBLIC_PRODUCT_DETAIL` (notFound) | `/product/:slug` | ✅ noindex/nofollow fallback |
| `PUBLIC_COLLECTIONS` | `/collections` | ✅ IMPLEMENTED (index, follow) |
| `PUBLIC_COLLECTION_DETAIL` | `/collections/:slug` (5 approved) | ✅ IMPLEMENTED (index, follow) |
| `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | `/collections/:slug` (unapproved) | ✅ noindex/nofollow fallback |
| `PUBLIC_INQUIRY` | `/inquiry` | ✅ IMPLEMENTED (index, follow) |
| `PUBLIC_TRUST_LANDING` | `/trust` | ❌ NOT IMPLEMENTED |
| `PUBLIC_INDUSTRY_CLUSTER_LANDING` | `/industries` | ❌ NOT IMPLEMENTED |
| `PUBLIC_AGGREGATOR` | `/aggregator` | ❌ NOT IMPLEMENTED |
| `PUBLIC_SUPPLIER_PROFILE` | `/supplier/:slug` | ❌ NOT IMPLEMENTED |
| `PUBLIC_PASSPORT` | `/passport/:id` | ❌ NOT IMPLEMENTED (intentional — see §9) |
| `PUBLIC_REFERRAL_LANDING` | `/join/:referral_code` | ❌ NOT IMPLEMENTED (intentional) |
| `PUBLIC_B2B_DISCOVERY` | state-backed, no fixed path | ❌ NOT IMPLEMENTED (no fixed URL) |
| `PUBLIC_ENTRY` | `/` | ❌ NOT IMPLEMENTED (auth bootstrap, not indexable) |

**JSON-LD:** NONE exists anywhere in the repo. `public/dpp/v1/context.jsonld` is a
DPP-specific semantic vocabulary context file, not a schema.org structured data block.

### 2.4 Static Config Registries

| Registry | File | Status | Records |
|---|---|---|---|
| Category story pages | `config/publicB2CCategoryPages.ts` | STATIC, 4 approved slugs | `garments`, `home-textiles`, `technical-textiles`, `fabrics` |
| Collection projections | `config/publicCollectionsProjection.ts` | STATIC, 5 approved slugs | `natural-fabric-stories`, `garment-supply-chain-context`, `home-textiles-showcase`, `textile-services-ecosystem`, `technical-textiles-context` |

All 4 category slugs are fully registered (`getCategoryPageBySlug` registry). All 5 collection
slugs are `availability: 'AVAILABLE'`. Both registries are safe for static sitemap generation.

### 2.5 Tests for SEO Infrastructure

No tests exist for:
- sitemap.xml URL coverage or validity
- robots.txt allow/disallow directives
- JSON-LD emission or schema validity
- `applyPublicPageMeta` DOM mutations

The existing `public-inquiry-page.test.tsx` covers inquiry page behavior but does not assert
document metadata. This is a documented gap for the implementation unit.

### 2.6 Vite Config

`vite.config.ts` is minimal: `@vitejs/plugin-react` only. No SSR plugin, no sitemap plugin,
no prerender plugin, no head manager library. This confirms the DOM-utility approach is correct
and no build-time HTML injection exists.

---

## 3. Current Route Inventory

| Route | App State | Path Type | Has Canonical SEO Meta | Indexable |
|---|---|---|---|---|
| `/` | `PUBLIC_ENTRY` | Static | No | No — auth bootstrap |
| `/trust` | `PUBLIC_TRUST_LANDING` | Static | No | Stub — noindex pending |
| `/industries` | `PUBLIC_INDUSTRY_CLUSTER_LANDING` | Static | No | Stub — noindex pending |
| `/aggregator` | `PUBLIC_AGGREGATOR` | Static | No | Stub — noindex pending |
| `/products` | `PUBLIC_B2C_BROWSE` | Static | ✅ | ✅ index, follow |
| `/products/category/garments` | `PUBLIC_B2C_CATEGORY_STORY` | Static slug | ✅ | ✅ index, follow |
| `/products/category/home-textiles` | `PUBLIC_B2C_CATEGORY_STORY` | Static slug | ✅ | ✅ index, follow |
| `/products/category/technical-textiles` | `PUBLIC_B2C_CATEGORY_STORY` | Static slug | ✅ | ✅ index, follow |
| `/products/category/fabrics` | `PUBLIC_B2C_CATEGORY_STORY` | Static slug | ✅ | ✅ index, follow |
| `/products/category/:unknown` | `PUBLIC_B2C_CATEGORY_STORY` | Dynamic fallback | noindex | No — excluded |
| `/product/:slug` | `PUBLIC_PRODUCT_DETAIL` | Dynamic | ✅ (found state) | ⚠️ Data-limited — defer |
| `/collections` | `PUBLIC_COLLECTIONS` | Static | ✅ | ✅ index, follow |
| `/collections/natural-fabric-stories` | `PUBLIC_COLLECTION_DETAIL` | Static slug | ✅ | ✅ index, follow |
| `/collections/garment-supply-chain-context` | `PUBLIC_COLLECTION_DETAIL` | Static slug | ✅ | ✅ index, follow |
| `/collections/home-textiles-showcase` | `PUBLIC_COLLECTION_DETAIL` | Static slug | ✅ | ✅ index, follow |
| `/collections/textile-services-ecosystem` | `PUBLIC_COLLECTION_DETAIL` | Static slug | ✅ | ✅ index, follow |
| `/collections/technical-textiles-context` | `PUBLIC_COLLECTION_DETAIL` | Static slug | ✅ | ✅ index, follow |
| `/collections/:unknown` | `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | Dynamic fallback | noindex | No — excluded |
| `/inquiry` | `PUBLIC_INQUIRY` | Static | ✅ | ✅ index, follow |
| `/inquiry?...` | `PUBLIC_INQUIRY` | Query-param variant | noindex canonical | No — canonical to `/inquiry` |
| `/supplier/:slug` | `PUBLIC_SUPPLIER_PROFILE` | Dynamic | No | ⚠️ Decision needed — defer |
| `/passport/:id` | `PUBLIC_PASSPORT` | Dynamic (DPP ID) | No | No — private ID in URL |
| `/join/:referral_code` | `PUBLIC_REFERRAL_LANDING` | Dynamic (code) | No | No — private code in URL |
| `/api/*` | Backend | API | N/A | No |
| `/?token=*` | `TOKEN_HANDLER` / `ONBOARDING` | Query-param | No | No |
| Auth/tenant/admin states | Various | Auth-gated | No | No |

**Total confirmed indexable routes: 11**
`/products` · `/products/category/garments` · `/products/category/home-textiles` ·
`/products/category/technical-textiles` · `/products/category/fabrics` · `/collections` ·
`/collections/natural-fabric-stories` · `/collections/garment-supply-chain-context` ·
`/collections/home-textiles-showcase` · `/collections/textile-services-ecosystem` ·
`/collections/technical-textiles-context`

**Inquiry: conditionally include** — `/inquiry` alone (canonical, no query params). See §4.

---

## 4. Proposed Sitemap Strategy

### 4.1 Generation Approach: Static + Build-Time Script

**Recommended: Static file in `public/sitemap.xml` generated by a build-time Node/TypeScript
script (`scripts/generate-sitemap.ts`).**

Rationale:
- The TexQtic SPA has no SSR and no per-route HTML generation.
- All indexable public routes are currently backed by either static paths or static config
  registries. No backend API call is needed for sitemap generation in the current phase.
- `vite.config.ts` has no sitemap plugin; adding one is disproportionate overhead for 12 URLs.
- Vite copies `public/` to `dist/` at build time; a generated `public/sitemap.xml` is served
  directly by Vercel's filesystem handler before the SPA catch-all.
- The script reads from `config/publicB2CCategoryPages.ts` and `config/publicCollectionsProjection.ts`
  directly to derive the approved URL set. This is single-source-of-truth safe.

**Alternative considered: Vite plugin or runtime API route.**
- Vite plugin (`vite-plugin-sitemap`): over-engineered; introduces a new dependency.
- Runtime Fastify route (`GET /sitemap.xml`): adds API surface, requires CORS config, serves
  wrong Content-Type unless carefully managed. Rejected — static file is cleaner.

### 4.2 Included Routes

The following 12 canonical URLs must appear in `sitemap.xml` in the initial implementation:

| URL (canonical, no query params) | Rationale |
|---|---|
| `https://app.texqtic.com/products` | B2C browse index — stable, `index,follow` ✅ |
| `https://app.texqtic.com/products/category/garments` | Static approved category slug ✅ |
| `https://app.texqtic.com/products/category/home-textiles` | Static approved category slug ✅ |
| `https://app.texqtic.com/products/category/technical-textiles` | Static approved category slug ✅ |
| `https://app.texqtic.com/products/category/fabrics` | Static approved category slug ✅ |
| `https://app.texqtic.com/collections` | Collections list — static config backed ✅ |
| `https://app.texqtic.com/collections/natural-fabric-stories` | AVAILABLE approved slug ✅ |
| `https://app.texqtic.com/collections/garment-supply-chain-context` | AVAILABLE approved slug ✅ |
| `https://app.texqtic.com/collections/home-textiles-showcase` | AVAILABLE approved slug ✅ |
| `https://app.texqtic.com/collections/textile-services-ecosystem` | AVAILABLE approved slug ✅ |
| `https://app.texqtic.com/collections/technical-textiles-context` | AVAILABLE approved slug ✅ |
| `https://app.texqtic.com/inquiry` | Public inquiry — stable, `index,follow` ✅ |

**Total: 12 URLs.**

### 4.3 Excluded Routes — with Rationale

| Route | Exclusion Reason |
|---|---|
| `/` (root) | Auth bootstrap surface, not a stable indexable content page |
| `/product/:slug` | No public product data available in production; defer to product-data-resolution unit |
| `/supplier/:slug` | Dynamic data; supplier profiles need publication gate decision before indexing |
| `/passport/:id` | DPP/passport IDs are internal identifiers in URL — absolutely forbidden in sitemap |
| `/join/:referral_code` | Referral codes are session/campaign-specific; private data in URL |
| `/trust` | Stub page — indexability decision pending separate unit; noindex in current state |
| `/industries` | Stub page — indexability decision pending separate unit; noindex in current state |
| `/aggregator` | Stub page — indexability decision pending separate unit; noindex in current state |
| `/products/category/:unknown` | Unknown slug fallback — noindex by design |
| `/collections/:unknown` | Unknown/unapproved slug fallback — noindex by design |
| `/inquiry?...` | Query-param variants — must canonicalize to `/inquiry` only |
| All auth/API/admin/tenant routes | Private, auth-gated; must never appear in public sitemap |

### 4.4 Product Detail Routes — Deferral Decision

**DECISION: `/product/:slug` is EXCLUDED from the initial sitemap.**

Rationale:
- No publicly-accessible product detail pages have been verified in production.
- The `PUBLIC_PRODUCT_DETAIL` metadata implementation is correct (Stage 2b), but the
  underlying product data constraint means no product slug can be safely listed.
- Including dynamically unknown slugs in sitemap would require either backend API access
  at build time (not available in static generation) or a hardcoded list of slugs (no
  authoritative source exists currently).
- `B2C-PRODUCT-DETAIL-RICH-SEO-001-VERIFY-CLOSE` (Section 26.8 of tracker) documents
  this as "found path data-limited."

**Required to unblock:** A future unit must verify a live public product slug in production,
then add product detail URLs to the sitemap via the generation script.

### 4.5 Query-Param Variant Handling

- `/inquiry?productSlug=...`, `/inquiry?categorySlug=...`, `/inquiry?collectionSlug=...`,
  `/inquiry?sourceSurface=...` — all excluded from sitemap.
- Only the canonical `https://app.texqtic.com/inquiry` appears.
- The existing `App.tsx` canonical logic already sets `canonical: ${origin}/inquiry` (no
  query params) for all `PUBLIC_INQUIRY` states, consistent with this policy.

### 4.6 `changefreq` and `priority`

Recommended values for the initial static sitemap (conservative; can be tuned after
indexing behavior is observed):

| URL Group | `changefreq` | `priority` |
|---|---|---|
| `/products` | `weekly` | `0.8` |
| `/products/category/:slug` (4 entries) | `weekly` | `0.7` |
| `/collections` | `weekly` | `0.8` |
| `/collections/:slug` (5 entries) | `weekly` | `0.7` |
| `/inquiry` | `monthly` | `0.5` |

---

## 5. Proposed Robots Strategy

### 5.1 Recommended `robots.txt` Content

```
User-agent: *
Allow: /products
Allow: /products/category/
Allow: /collections
Allow: /inquiry

Disallow: /api/
Disallow: /passport/
Disallow: /join/
Disallow: /supplier/
Disallow: /trust
Disallow: /industries
Disallow: /aggregator

Sitemap: https://app.texqtic.com/sitemap.xml
```

### 5.2 Rationale Per Directive

| Directive | Rationale |
|---|---|
| `Allow: /products` | B2C browse and category story pages are indexable |
| `Allow: /products/category/` | Approved category story pages; unknown slugs return noindex anyway |
| `Allow: /collections` | Collections list and approved detail pages are indexable |
| `Allow: /inquiry` | Public inquiry page is indexable |
| `Disallow: /api/` | Backend API endpoints — must never be crawled |
| `Disallow: /passport/` | DPP passport IDs are internal identifiers; must not be indexed |
| `Disallow: /join/` | Referral codes are private session data |
| `Disallow: /supplier/` | Supplier profiles lack full SEO metadata and publication gate decision |
| `Disallow: /trust` | Stub page — not ready for indexing |
| `Disallow: /industries` | Stub page — not ready for indexing |
| `Disallow: /aggregator` | Stub page — not ready for indexing |
| `Sitemap:` | Points crawlers to sitemap.xml directly |

### 5.3 Treatment of Auth, Private, and Catch-all Routes

The SPA routes auth/tenant/admin states through the single `index.html` shell. Crawlers
loading the root (`/`) or auth-triggered paths will receive the SPA shell; `document.title`
will be non-indexable titles. The `robots.txt` `Disallow` rules limit discovery, but the
real boundary is enforced by per-state `noindex/nofollow` robots meta tags already
implemented in `utils/publicPageMeta.ts`.

**Defense-in-depth model:**
1. `robots.txt` — disallows crawl of private paths
2. Per-route `<meta name="robots">` — `noindex, nofollow` for all non-public states
   (enforced by `clearPublicPageMeta()` call in App.tsx for non-public states)
3. Canonical URL — only exposes public slugs, never query params or private IDs

### 5.4 Root `/` Treatment

`/` is not explicitly Allowed or Disallowed. Since the SPA serves the `PUBLIC_ENTRY` state
at root (which has no `applyPublicPageMeta` call, so no index/follow directive is set by
the app), crawlers that do land there will receive no robots meta signal.

**Recommendation for implementation unit:** Add a safe noindex robots meta for `PUBLIC_ENTRY`
and `AUTH` states via `applyPublicPageMeta` with `robots: 'noindex, nofollow'`. This is a
minor improvement but not required for sitemap/robots correctness.

---

## 6. Proposed JSON-LD Strategy

### 6.1 Current Phase Decision: DEFER ALL JSON-LD

**DECISION: No JSON-LD will be implemented in `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001`.**

Rationale:
- The `utils/publicPageMeta.ts` utility does not support JSON-LD injection. Adding it requires
  utility extension.
- JSON-LD requires explicit schema selection, claim classification, and governance approval
  per route type. This is separate design work.
- Sitemap and robots.txt are higher-priority and simpler to implement safely.
- `D2C-COLLECTION-SEO-GOVERNANCE-001 §8.2` provides a detailed JSON-LD governance framework
  that must be applied when JSON-LD is eventually implemented.

### 6.2 Route Types and JSON-LD Recommendations (Future Unit)

| Route Type | Recommended Schema Type | Phase | Notes |
|---|---|---|---|
| `/collections` | `WebPage` or `CollectionPage` | Future — low priority | Basic WebPage safe; no product/offer schema |
| `/collections/:slug` | `WebPage` + `BreadcrumbList` | Future — medium priority | Breadcrumb safe; no product/offer/certification schema |
| `/products` | `WebPage` | Future — low priority | No product listing schema until data available |
| `/products/category/:slug` | `WebPage` + `BreadcrumbList` | Future — medium priority | Category breadcrumb safe |
| `/product/:slug` | `Product` (minimal, public-safe fields only) | Future — **DEFERRED** | Requires product data in production and separate evidence gate |
| `/inquiry` | `WebPage` or `ContactPage` | Future — low priority | No form submission schema; no buyer data |
| `/trust`, `/industries`, `/aggregator` | Deferred | Deferred | Stub pages; JSON-LD deferred until content is stable |
| `/supplier/:slug` | Deferred | Deferred | Requires publication gate decision; `Organization` schema possible |

### 6.3 Safe Schema.org Types (Future Reference)

When JSON-LD is eventually implemented, only the following schema.org types are safe to use:

| Schema Type | Allowed | Conditions |
|---|---|---|
| `WebPage` | ✅ | For any stable public content page |
| `CollectionPage` | ✅ | For `/collections` list |
| `BreadcrumbList` | ✅ | For category and collection detail pages where real breadcrumb path exists |
| `Organization` | ✅ | For TexQtic platform attribution only; no tenant/supplier identity |
| `ImageObject` | ✅ | For publication-approved hero images only |
| `Product` | ⚠️ | Only after public product data is available and a separate evidence gate is approved |
| `FAQPage` | ⚠️ | Only for genuine FAQ content; no certification/origin/DPP claims in answers |
| `Offer` | ❌ | Never — no pricing, commerce, or purchase behavior on public surfaces |
| `AggregateRating` | ❌ | Never — no rating/ranking behavior |
| `Certification` | ❌ | Never — no collection-level certification in current phase |

### 6.4 Explicit Claims Forbidden in All JSON-LD

In addition to the forbidden fields defined in `D2C-COLLECTION-SEO-GOVERNANCE-001 §8.2.3`:
- No `org_id`, `tenant_id`, `supplier_id`, internal product ID, internal collection ID
- No pricing, inventory, offer, or purchase signal
- No universal certification, DPP, passport, traceability, or origin claims
- No `AggregateRating` or social proof signals
- No auth handoff state, buyer intent, or sourcing context as structured data properties
- No `referralCode`, `sourceSurface`, `returnTo`, `productSlug` in JSON-LD properties

### 6.5 JSON-LD Implementation Unit (Deferred)

**Recommended future unit ID:** `PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001`

Scope:
1. Extend `utils/publicPageMeta.ts` to support JSON-LD injection (via
   `<script type="application/ld+json">` managed tag).
2. Implement `WebPage` + `BreadcrumbList` JSON-LD for collection detail pages.
3. Implement `WebPage` + `BreadcrumbList` JSON-LD for category story pages.
4. Implement `CollectionPage` JSON-LD for `/collections` list.
5. Add JSON-LD cleanup to `clearPublicPageMeta()`.

Not in scope for that unit: `Product` JSON-LD, `Organization` JSON-LD, `/inquiry`
`ContactPage` JSON-LD.

---

## 7. Canonical Strategy

### 7.1 Current Base Domain Truth

- Production domain: `https://app.texqtic.com`
- Canonical base in `utils/publicPageMeta.ts` / `App.tsx`: `window.location.origin` (runtime)
- This is correct for the SPA runtime. Every `applyPublicPageMeta` call derives origin from
  `globalThis.window?.location.origin ?? ''`.

### 7.2 Static File Canonical Base

`robots.txt` and `sitemap.xml` are static files. They cannot use `window.location.origin`.

**DECISION: Use `https://app.texqtic.com` as the hardcoded canonical base in the static
`sitemap.xml` and `robots.txt` for the current phase.**

Rationale:
- `https://app.texqtic.com` is the verified production domain.
- No custom domain or alternate canonical domain exists in the current phase.
- The build-time generation script (`scripts/generate-sitemap.ts`) will accept the canonical
  base as a configurable constant, making it easy to update if the domain changes.

### 7.3 Query Param Handling

**Policy: Query parameters must NEVER appear in canonical URLs, sitemap entries, or
`<link rel="canonical">` tags.**

This is already implemented correctly:
- `/inquiry` canonical is `${origin}/inquiry` regardless of query params.
- Collection detail canonical is `${origin}/collections/${slug}` — no params.
- Category canonical is `${origin}${categoryConfig.canonicalPath}` — path only, no params.

No changes needed to the existing canonical implementation for this strategy.

### 7.4 White-Label / Custom Domain Future Impact

The TexQtic repo has white-label capability (`tenantHasWhiteLabelCapability`). However, public
SEO surfaces (`PUBLIC_*` states) are **not tenant-scoped** — they render without an active
tenant session. No white-label tenant context exists during public route SEO metadata emission.

**DECISION: Custom domain canonical strategy is DEFERRED to `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`.**

This deferred unit should decide:
- Whether a future `texqtic.com` apex domain replaces `app.texqtic.com` as canonical.
- Whether white-label storefronts need separate canonical strategy for public-facing routes.
- Whether the `generate-sitemap.ts` script should read `CANONICAL_BASE_URL` from an env var.

Until that unit is complete: **use `https://app.texqtic.com`** in all static SEO files.

### 7.5 `<link rel="sitemap">` Reference

The `index.html` shell should include a `<link rel="sitemap" type="application/xml"
href="/sitemap.xml">` tag in `<head>`. This is a minor crawler hint and has no SEO ranking
impact but improves discoverability.

**This is in scope for `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001`.**

---

## 8. Route Indexability Matrix

| Route | Canonical | `robots` meta | Sitemap | JSON-LD | Notes / Risks |
|---|---|---|---|---|---|
| `/products` | `https://app.texqtic.com/products` | `index, follow` | ✅ Include | Deferred | No product data risk — browse index is static UI |
| `/products/category/garments` | `.../products/category/garments` | `index, follow` | ✅ Include | Deferred | Static approved slug |
| `/products/category/home-textiles` | `.../products/category/home-textiles` | `index, follow` | ✅ Include | Deferred | Static approved slug |
| `/products/category/technical-textiles` | `.../products/category/technical-textiles` | `index, follow` | ✅ Include | Deferred | Static approved slug |
| `/products/category/fabrics` | `.../products/category/fabrics` | `index, follow` | ✅ Include | Deferred | Static approved slug |
| `/products/category/:unknown` | `.../products` (fallback) | `noindex, nofollow` | ❌ Exclude | None | Unknown slug; noindex already implemented |
| `/product/:slug` (found) | `.../product/:slug` | `index, follow` | ❌ Defer | ❌ Defer | No production product data; data-limited |
| `/product/:slug` (not found) | `.../products` (fallback) | `noindex, nofollow` | ❌ Exclude | None | Not-found fallback |
| `/collections` | `https://app.texqtic.com/collections` | `index, follow` | ✅ Include | Deferred | Static config-backed |
| `/collections/natural-fabric-stories` | `.../collections/natural-fabric-stories` | `index, follow` | ✅ Include | Deferred | AVAILABLE approved slug |
| `/collections/garment-supply-chain-context` | `.../collections/garment-supply-chain-context` | `index, follow` | ✅ Include | Deferred | AVAILABLE approved slug |
| `/collections/home-textiles-showcase` | `.../collections/home-textiles-showcase` | `index, follow` | ✅ Include | Deferred | AVAILABLE approved slug |
| `/collections/textile-services-ecosystem` | `.../collections/textile-services-ecosystem` | `index, follow` | ✅ Include | Deferred | AVAILABLE approved slug |
| `/collections/technical-textiles-context` | `.../collections/technical-textiles-context` | `index, follow` | ✅ Include | Deferred | AVAILABLE approved slug |
| `/collections/:unknown` | `.../collections` (fallback) | `noindex, nofollow` | ❌ Exclude | None | Unavailable fallback |
| `/inquiry` | `https://app.texqtic.com/inquiry` | `index, follow` | ✅ Include | Deferred | No query params in canonical |
| `/inquiry?...` | `.../inquiry` (canonical) | `index, follow` (canonical) | ❌ Exclude | None | Query-param variants always exclude |
| `/trust` | `.../trust` | Not set (no `applyPublicPageMeta`) | ❌ Exclude | None | Stub — needs metadata + indexability decision |
| `/industries` | `.../industries` | Not set | ❌ Exclude | None | Stub — needs metadata + indexability decision |
| `/aggregator` | `.../aggregator` | Not set | ❌ Exclude | None | Stub — needs metadata + indexability decision |
| `/supplier/:slug` | Not set | Not set | ❌ Defer | ❌ Defer | Publication gate decision needed |
| `/passport/:id` | Not applicable | Not set | ❌ Never | ❌ Never | Private DPP ID in URL — forbidden |
| `/join/:referral_code` | Not applicable | Not set | ❌ Never | ❌ Never | Private referral code in URL |
| `/` | Auth bootstrap | Not set | ❌ Never | None | Auth entry point |
| `/api/*` | Backend | N/A | ❌ Never | None | API routes — must never be crawled |
| Auth/tenant/admin states | Auth-gated | `clearPublicPageMeta()` clears | ❌ Never | None | Non-public states |

---

## 9. Public / Private Boundary Analysis

### 9.1 Identifiers Safe for Public SEO

The following identifiers may appear in sitemap URLs, canonical URLs, robots.txt Allow paths,
and JSON-LD:
- Public route paths: `/products`, `/collections`, `/inquiry`, `/products/category/`, `/collections/`
- Approved public category slugs: `garments`, `home-textiles`, `technical-textiles`, `fabrics`
- Approved public collection slugs: `natural-fabric-stories`, `garment-supply-chain-context`,
  `home-textiles-showcase`, `textile-services-ecosystem`, `technical-textiles-context`
- Production domain: `https://app.texqtic.com` (public hostname)
- Collection titles, summaries, category names — already validated as `PUBLIC_SAFE` in
  `publicCollectionsProjection.ts` and `publicB2CCategoryPages.ts`

### 9.2 Identifiers Forbidden from All SEO Surfaces

| Identifier | Reason | Risk If Leaked |
|---|---|---|
| `org_id` | Internal tenant boundary key | Exposes tenant structure |
| `tenant_id` | Internal multi-tenant key | Same |
| `supplier_id` | Internal supplier record ID | Exposes supplier topology |
| Internal product ID | Database PK | Exposes product records |
| Internal collection ID | Database PK | Exposes collection records |
| `user_id` | Auth user identity | Privacy violation |
| Session ID / auth token | Authentication state | Auth bypass risk |
| DPP/passport internal ID | See note below | Exposes private DPP topology |
| Referral code | Campaign/session specific | Exposes campaign data |
| Visitor IP | PII | Privacy/GDPR violation |
| Buyer name, email, phone | PII | Privacy/GDPR violation |
| Company name (private) | Tenant private data | Business confidentiality |
| Pricing / inventory | Commerce state | Competitive sensitivity |
| `returnTo`, `authRequired`, `sourceSurface` as page identity | Auth handoff params | Auth bypass risk |

### 9.3 DPP Passport ID Note

`/passport/:id` uses a DPP-specific passport identifier in the URL. This ID is treated as a
**private internal identifier** in the context of SEO and sitemap, even though the route is
publicly accessible. It must NOT appear in `sitemap.xml`. Crawlers discovering `/passport/:id`
URLs via content links is acceptable; explicit sitemap inclusion is not.

### 9.4 Supplier Profile Note

`/supplier/:slug` uses a public slug pattern but lacks:
1. Full SEO metadata implementation (no `applyPublicPageMeta` call)
2. A publication gate decision for which supplier profiles are publicly discoverable
3. A confirmed data source for slug enumeration at build time

Until a supplier publication gate and SEO metadata implementation unit is approved,
`/supplier/:slug` must not appear in sitemap or robots Allow paths.

### 9.5 Stub Pages Note

`/trust`, `/industries`, `/aggregator` are live routes but render stub/placeholder components.
They have no `applyPublicPageMeta` call, meaning no robots directive is set for them.
**Risk:** Crawlers indexing these stubs will receive generic document titles without noindex.

**Recommendation for implementation unit:** Add `applyPublicPageMeta` with `robots: 'noindex, nofollow'`
for `PUBLIC_TRUST_LANDING`, `PUBLIC_INDUSTRY_CLUSTER_LANDING`, and `PUBLIC_AGGREGATOR` states.
This is a minor safety improvement that can be included in `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001`.

---

## 10. Implementation Plan — Bounded Future Units

### Unit A (Recommended Next): `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001`

**Scope:**
1. Create `public/sitemap.xml` with 12 canonical URLs (static file).
2. Create `public/robots.txt` (static file, content per §5.1).
3. Create `scripts/generate-sitemap.ts` — build-time script that reads from
   `config/publicB2CCategoryPages.ts` and `config/publicCollectionsProjection.ts` and
   regenerates `public/sitemap.xml`. Accepts `CANONICAL_BASE` constant (default:
   `https://app.texqtic.com`). Must not access any backend, DB, or environment secrets.
4. Add `<link rel="sitemap" type="application/xml" href="/sitemap.xml">` to `index.html`.
5. Add noindex robots meta for `PUBLIC_TRUST_LANDING`, `PUBLIC_INDUSTRY_CLUSTER_LANDING`,
   and `PUBLIC_AGGREGATOR` states (minor safety improvement, same `applyPublicPageMeta` pattern).
6. Add tests in `tests/frontend/` verifying:
   - `sitemap.xml` contains all 12 expected URLs
   - `sitemap.xml` contains no forbidden identifiers (org_id, token, passport/, join/)
   - `generate-sitemap.ts` script output matches static sitemap content

**Allowlist (Modify):**
- `public/sitemap.xml` (create)
- `public/robots.txt` (create)
- `scripts/generate-sitemap.ts` (create)
- `index.html` (add sitemap link)
- `App.tsx` (add noindex for 3 stub states only)
- `tests/frontend/seo-sitemap.test.ts` (create)

**Forbidden in this unit:**
- No changes to `utils/publicPageMeta.ts` beyond stub-state noindex additions
- No JSON-LD
- No changes to any component, service, schema, or OpenAPI

### Unit B (Deferred): `PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001`

**Scope:**
1. Extend `utils/publicPageMeta.ts` with JSON-LD injection support.
2. `WebPage` + `BreadcrumbList` for collection detail pages (5 slugs).
3. `CollectionPage` for `/collections` list.
4. `WebPage` + `BreadcrumbList` for category story pages (4 slugs).
5. Cleanup of JSON-LD script tags in `clearPublicPageMeta()`.
6. Tests for JSON-LD structure and claim safety.

**Prerequisite:** This unit is complete (DESIGN_COMPLETE). No additional prerequisite.

**Deferred elements within Unit B:**
- `Product` JSON-LD — requires product data availability
- `Organization` JSON-LD — separate scope
- `/inquiry` `ContactPage` — separate scope

### Unit C (Deferred): `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`

**Scope:**
1. Decide canonical base: `app.texqtic.com` vs future `texqtic.com`.
2. White-label/custom domain public-route SEO impact analysis.
3. If needed: move `CANONICAL_BASE` from hardcoded constant to env-var `VITE_CANONICAL_BASE`.
4. Update `sitemap.xml` generation script and `robots.txt` accordingly.

**Prerequisite:** No blocking dependency on current phase. Can proceed any time.

### Unit D (Deferred): `PUBLIC-SEO-PRODUCT-SITEMAP-EXPANSION-001`

**Scope:**
1. Once public product data is available in production, verify at least one live product slug.
2. Add `/product/:slug` URLs to sitemap via enhanced generation script (backend API call
   or static registry).
3. Add product detail tests.

**Prerequisite:** Public product data available in production.

### Unit E (Deferred): `PUBLIC-SEO-SUPPLIER-PROFILE-INDEXABILITY-001`

**Scope:**
1. Define supplier profile publication gate for SEO indexability.
2. Add `applyPublicPageMeta` for `PUBLIC_SUPPLIER_PROFILE` state.
3. Add supplier slugs to sitemap (generation script reads approved supplier list).

**Prerequisite:** Supplier publication gate decision.

---

## 11. Recommended Next Implementation Unit

**`PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001`**

This is the immediate next unit. It:
- Has no blocking dependencies
- Uses only static files + a build script
- Touches no backend, schema, OpenAPI, or existing component logic
- Is entirely reversible (files can be deleted/regenerated)
- Completes the highest-priority SEO infrastructure gap

---

## 12. Test / Verification Plan

### 12.1 Unit Tests (for Implementation Unit A)

| Test | Description |
|---|---|
| `sitemap-url-coverage` | All 12 expected canonical URLs are present in `public/sitemap.xml` |
| `sitemap-no-forbidden-ids` | No `org_id`, `supplier_id`, `token`, `/passport/`, `/join/` in sitemap |
| `sitemap-no-query-params` | No `?` characters in any sitemap URL |
| `sitemap-canonical-base` | All URLs use `https://app.texqtic.com` as base |
| `sitemap-valid-xml` | `sitemap.xml` is valid XML with correct namespace |
| `generate-sitemap-output-match` | Running `generate-sitemap.ts` produces same content as committed static file |
| `robots-allow-products` | `robots.txt` allows `/products` and `/products/category/` |
| `robots-allow-collections` | `robots.txt` allows `/collections` |
| `robots-disallow-api` | `robots.txt` disallows `/api/` |
| `robots-disallow-passport` | `robots.txt` disallows `/passport/` |
| `robots-sitemap-declaration` | `robots.txt` references `https://app.texqtic.com/sitemap.xml` |
| `stub-state-noindex` | `PUBLIC_TRUST_LANDING`, `PUBLIC_INDUSTRY_CLUSTER_LANDING`, `PUBLIC_AGGREGATOR` emit `noindex, nofollow` robots meta |

### 12.2 Validation Commands (Future Implementation Unit)

```bash
# TypeCheck
pnpm typecheck

# Frontend tests
pnpm test --filter frontend tests/frontend/seo-sitemap.test.ts

# Generate sitemap (build script)
pnpm -C . ts-node scripts/generate-sitemap.ts

# Validate sitemap XML (lightweight)
node -e "const fs = require('fs'); const xml = fs.readFileSync('public/sitemap.xml', 'utf8'); console.log(xml.includes('</urlset>') ? 'VALID' : 'INVALID')"
```

---

## 13. Production Verification Plan

### 13.1 Post-Deployment Checks

| Check | Method | Expected |
|---|---|---|
| `GET /sitemap.xml` | `curl -I https://app.texqtic.com/sitemap.xml` | HTTP 200, Content-Type `application/xml` |
| Sitemap content | `curl https://app.texqtic.com/sitemap.xml` | 12 URLs visible, no private identifiers |
| `GET /robots.txt` | `curl https://app.texqtic.com/robots.txt` | HTTP 200, `User-agent: *` block present |
| Robots disallows API | Contents check | `/api/` in Disallow |
| Robots disallows passport | Contents check | `/passport/` in Disallow |
| Sitemap in robots | Contents check | `Sitemap: https://app.texqtic.com/sitemap.xml` present |
| `/index.html` sitemap link | `curl https://app.texqtic.com/ \| grep sitemap` | `<link rel="sitemap"...>` present |
| Stub page noindex | Navigate to `/trust` | `<meta name="robots" content="noindex, nofollow">` present |
| `/products` still indexed | Navigate to `/products` | `index, follow` robots meta present |
| `/inquiry` still indexed | Navigate to `/inquiry` | `index, follow` robots meta present |
| No private IDs in sitemap | Inspect sitemap content | Confirmed clean |
| Google Search Console validation | Manual, post-submit | No crawl errors, sitemap accepted |

---

## 14. Adjacent Findings

The following items were identified during repo-truth inspection. **Do not implement without
a new prompt/explicit approval.**

### 14.1 Product Detail CTA Production Smoke Test (Carry-Forward)
- No public products exist in production.
- Product detail CTA is covered by PII-021 local test.
- Deferred until public product data exists.
- Related: Unit D (`PUBLIC-SEO-PRODUCT-SITEMAP-EXPANSION-001`).

### 14.2 `PUBLIC-INQUIRY-GENERAL-EVENT-INFRASTRUCTURE-001` (Carry-Forward)
- General public inquiry EventLog emission still deferred.
- No impact on SEO or sitemap strategy.

### 14.3 Supplier Context Message Expansion (Carry-Forward)
- Supplier inquiry form has no message field.
- No impact on sitemap or SEO.

### 14.4 Stub Pages Without SEO Metadata
- `/trust`, `/industries`, `/aggregator` have no `applyPublicPageMeta` calls.
- They render without any robots directive, meaning crawlers receive no noindex signal.
- **Risk rating: LOW** — these are minor stub pages; no high-value content to protect.
- **Recommendation:** Add noindex in `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001` as a
  safety improvement (already in Unit A scope above).

### 14.5 `PUBLIC_ENTRY` and `AUTH` States Without Robots Meta
- `/` and auth paths have no `applyPublicPageMeta` call.
- `clearPublicPageMeta()` is called for all non-public states, which removes managed tags.
- The absence of a `noindex` meta for auth states means crawlers landing there receive no
  explicit directive. In practice, auth states serve an empty/bootstrap UI with generic
  document title and no indexable content.
- **Risk rating: LOW** — `robots.txt` `Allow` rules only allow specific public paths; no
  explicit Allow for `/` means default crawl behavior applies (allowed by default in robots.txt
  spec). Adding explicit noindex for entry/auth states is optional.

### 14.6 `<link rel="sitemap">` Currently Absent from `index.html`
- Noted as in-scope for Unit A implementation.

---

## 15. Stop Conditions for Implementation

Implementation of `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001` must STOP if:

1. **Sitemap/robots conflict found:** A `sitemap.xml` or `robots.txt` already exists in
   `public/` at implementation time. Verify clean state before creating files.
   → Current state: Both absent. ✅ No conflict.

2. **Canonical domain changed:** If a domain change occurs between this design and
   implementation (e.g., apex domain decision), the canonical base constant must be updated
   before generating the sitemap.

3. **New collection slugs added with `availability: 'COMING_SOON'`:** Must not appear in sitemap.
   The generation script must filter `availability === 'AVAILABLE'` only.

4. **Vercel routing conflict:** If a Vercel routing rule is added that intercepts `/sitemap.xml`
   before the filesystem handler, the static file approach breaks. Verify `vercel.json` has
   `"handle": "filesystem"` before the SPA catch-all.
   → Current state: `vercel.json` confirmed correct. ✅ No conflict.

5. **Backend API dependency:** If the generation script requires a backend API call for any
   URL (product slugs, supplier slugs), stop and escalate — this is not in scope for Unit A.

---

## 16. Completion Checklist

### Design Unit (this document)
- [x] Repo-truth inspection complete
- [x] Route inventory complete (20+ routes catalogued)
- [x] Sitemap strategy defined with 12 included URLs
- [x] Excluded routes documented with rationale
- [x] Product detail deferral decision made and justified
- [x] Query-param exclusion policy stated
- [x] `changefreq` and `priority` values recommended
- [x] Robots strategy defined with full directive set
- [x] JSON-LD strategy defined (deferred) with route-type recommendations
- [x] Safe schema.org types enumerated
- [x] Forbidden claims enumerated
- [x] Canonical strategy defined (runtime `window.location.origin` for SPA + hardcoded base for static files)
- [x] White-label/custom domain impact deferred to separate unit
- [x] Route indexability matrix complete
- [x] Public/private boundary analysis complete
- [x] Implementation plan split into 5 bounded units
- [x] Next recommended unit identified
- [x] Test and verification plans complete
- [x] Adjacent findings documented
- [x] Stop conditions defined

### For Implementation Unit A (`PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001`)
- [ ] `public/sitemap.xml` created with 12 canonical URLs
- [ ] `public/robots.txt` created per §5.1
- [ ] `scripts/generate-sitemap.ts` created and functional
- [ ] `index.html` updated with `<link rel="sitemap">`
- [ ] `App.tsx` updated with noindex for 3 stub states
- [ ] Tests created and passing
- [ ] `pnpm typecheck` PASS
- [ ] Production verification complete (all §13.1 checks)
- [ ] No forbidden identifiers in any SEO file
- [ ] Governance commit made and pushed

---

*End of PUBLIC-SEO-SITEMAP-ROBOTS-JSONLD-STRATEGY-DESIGN-001.*
*Date: 2026-05-19 — TexQtic governance corpus, main branch.*
