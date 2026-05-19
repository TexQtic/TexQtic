# PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001
## Safe Managed JSON-LD Structured Data for Public Web Pages — Implementation

**Unit ID:** PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001
**Family:** B2C Public Surface / Public SEO Infrastructure
**Status:** IMPLEMENTED
**Verify-close unit:** `PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001-VERIFY-CLOSE` (pending)
**Date:** 2026-08-08
**Authorized by:** Paresh
**Artifact class:** Implementation unit
**Placement:** `governance/units/`
**Preceding design unit:** `PUBLIC-SEO-SITEMAP-ROBOTS-JSONLD-STRATEGY-DESIGN-001`
**Preceding implementation unit:** `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001` (commit `9b69d88`)

---

## 1. Unit Summary

This unit implements safe managed schema.org JSON-LD structured data for the four public
web page route types identified in the SEO strategy design:

- `PUBLIC_B2C_BROWSE` → `WebPage` block
- `PUBLIC_B2C_CATEGORY_STORY` (known category) → `WebPage` + `BreadcrumbList` blocks
- `PUBLIC_COLLECTIONS` (eligible collections) → `CollectionPage` block
- `PUBLIC_COLLECTION_DETAIL` (known collection) → `WebPage` + `BreadcrumbList` blocks

All other public routes (stub states, not-found fallbacks, inquiry, product detail) receive
no JSON-LD — only the four routes above that represent stable, indexable, content-rich pages.

**Implementation approach:** Extend the existing `publicPageMeta.ts` managed-tag pattern.
A new `JSONLD_MANAGED_ATTR` (`data-texqtic-public-jsonld`) marker is placed on all injected
`<script type="application/ld+json">` tags, enabling targeted cleanup. The extension is
fully backward-compatible: the `jsonLd?` field is optional in `PublicPageMetaInput`.

**Schema.org types used:**
- `WebPage` — general indexable public pages
- `CollectionPage` — the textile collections listing
- `BreadcrumbList` — breadcrumb trail for category and collection detail pages
- `WebSite` — `isPartOf` reference on all above page types
- `ListItem` — individual breadcrumb entries within `BreadcrumbList`

**Forbidden types (explicitly excluded):** `Product`, `Offer`, `AggregateRating`, `Review`,
`Organization`, `FAQPage`, `ContactPage`. No supply-chain or commerce-transaction types are
present. No private identifiers (`org_id`, `tenant_id`, etc.) appear in any JSON-LD block.

---

## 2. Allowlist

| File | Action |
|---|---|
| `utils/publicPageMeta.ts` | Modified — JSON-LD support added |
| `App.tsx` | Modified — 4 SEO useEffect branches now pass `jsonLd` |
| `tests/frontend/public-page-meta.test.ts` | Created — 10 utility unit tests |
| `tests/frontend/seo-jsonld.test.ts` | Created — 20 acceptance tests |
| `governance/units/PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001.md` | Created (this file) |
| `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | Modified (Section 37 appended) |

**Explicitly out of scope (not modified):**
- `public/sitemap.xml`, `public/robots.txt`, `scripts/generate-sitemap.ts` — stable
- `index.html` — no JSON-LD in HTML entry point
- All backend / Fastify / Prisma / schema / RLS files
- OpenAPI contracts, event contracts

---

## 3. Repo-Truth Verification (Pre-Implementation)

All checks passed before implementation began:

| # | Check | Result |
|---|---|---|
| 1 | `utils/publicPageMeta.ts` exports `applyPublicPageMeta` + `clearPublicPageMeta` | PASS |
| 2 | `PublicPageMetaInput` has exactly 13 existing fields (all required) | PASS |
| 3 | `MANAGED_ATTR = 'data-texqtic-public-meta'` marks managed meta/link tags | PASS |
| 4 | `clearPublicPageMeta()` queries `document.head` by managed attribute | PASS |
| 5 | App.tsx SEO useEffect branches: 4 branches confirmed (`PUBLIC_B2C_BROWSE`, `PUBLIC_B2C_CATEGORY_STORY`, `PUBLIC_COLLECTIONS`, `PUBLIC_COLLECTION_DETAIL`) | PASS |
| 6 | App.tsx uses `getB2CCategoryPageBySlug` → `categoryConfig` with `seoTitle`, `seoDescription`, `canonicalPath`, `heroHeading` | PASS |
| 7 | App.tsx uses `getCollectionBySlug` → `collection` with `title`, `summary`, `publicSlug` | PASS |
| 8 | `config/publicCollectionsProjection.ts` — 5 AVAILABLE projections with canonical slugs | PASS |
| 9 | `config/publicB2CCategoryPages.ts` — 4 category configs with SEO fields | PASS |
| 10 | `vitest.frontend.config.ts` test environment: `jsdom` | PASS |
| 11 | `tests/setupTests.ts` imports `@testing-library/jest-dom/vitest` | PASS |
| 12 | TypeScript: `Record<string, unknown>` accepts all nested schema.org inline objects | PASS |

---

## 4. Files Modified / Created

### 4.1 `utils/publicPageMeta.ts`

**New exports:**
```typescript
/** A flexible JSON-LD structured data block. Use only schema.org-approved types. */
export type PublicJsonLdBlock = Record<string, unknown>;
```

**`PublicPageMetaInput` — new optional field added:**
```typescript
/** Optional JSON-LD structured data blocks.
 *  Injected as managed <script type="application/ld+json"> tags. */
readonly jsonLd?: readonly PublicJsonLdBlock[];
```

**New internal constant:**
```typescript
const JSONLD_MANAGED_ATTR = 'data-texqtic-public-jsonld';
```

**New internal function:**
```typescript
function clearManagedJsonLd(): void {
  document.head
    .querySelectorAll(`script[${JSONLD_MANAGED_ATTR}]`)
    .forEach((el) => el.remove());
}
```

**`applyPublicPageMeta` — JSON-LD section appended (before return):**
```typescript
clearManagedJsonLd();
if (input.jsonLd) {
  for (const block of input.jsonLd) {
    const script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute(JSONLD_MANAGED_ATTR, 'true');
    script.textContent = JSON.stringify(block);
    document.head.appendChild(script);
  }
}
```

**`clearPublicPageMeta` — `clearManagedJsonLd()` call appended.**

All changes are additive and backward-compatible. Existing 13 fields and existing meta/link
tag management are unchanged.

### 4.2 `App.tsx` — 4 SEO useEffect Branches

#### `PUBLIC_B2C_BROWSE`
```typescript
jsonLd: [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: browseTitle,
    description: browseDescription,
    url: `${origin}/products`,
    isPartOf: { '@type': 'WebSite', name: 'TexQtic', url: origin },
  },
],
```

#### `PUBLIC_B2C_CATEGORY_STORY` (known category only)
```typescript
jsonLd: [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: categoryConfig.seoTitle,
    description: categoryConfig.seoDescription,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'TexQtic', url: origin },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Products', item: `${origin}/products` },
      { '@type': 'ListItem', position: 2, name: categoryConfig.heroHeading, item: canonical },
    ],
  },
],
```

#### `PUBLIC_COLLECTIONS` (when `hasEligible`)
```typescript
jsonLd: hasEligible
  ? [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: listTitle,
        description: listDescription,
        url: `${origin}/collections`,
        isPartOf: { '@type': 'WebSite', name: 'TexQtic', url: origin },
      },
    ]
  : undefined,
```

#### `PUBLIC_COLLECTION_DETAIL` (known collection)
```typescript
jsonLd: [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: detailTitle,
    description: detailDescription,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'TexQtic', url: origin },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Collections', item: `${origin}/collections` },
      { '@type': 'ListItem', position: 2, name: collection.title, item: canonical },
    ],
  },
],
```

**Branches that do NOT receive `jsonLd`:**
- `PUBLIC_B2C_CATEGORY_STORY` unknown-category fallback
- `PUBLIC_COLLECTION_DETAIL` not-found fallback
- `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE`
- `PUBLIC_PRODUCT_DETAIL` (all states)
- `PUBLIC_INQUIRY`
- `PUBLIC_TRUST_LANDING`
- `PUBLIC_INDUSTRY_CLUSTER_LANDING`
- `PUBLIC_AGGREGATOR`
- Fall-through `clearPublicPageMeta()`

### 4.3 `tests/frontend/public-page-meta.test.ts` (new — 10 tests)

| Test ID | Coverage |
|---|---|
| PJLD-001 | No `jsonLd` input → no managed JSON-LD scripts injected |
| PJLD-002 | With `jsonLd: [block]` → 1 script injected |
| PJLD-003 | Injected script has `type="application/ld+json"` |
| PJLD-004 | Injected script has `data-texqtic-public-jsonld="true"` |
| PJLD-005 | Script `textContent` parses as valid JSON with correct `@type` |
| PJLD-006 | Two blocks in `jsonLd` → two script tags injected |
| PJLD-006b | Second call with different blocks replaces prior (not appends) |
| PJLD-007 | Call without `jsonLd` after call with `jsonLd` → scripts cleared |
| PJLD-007b | `clearPublicPageMeta()` removes managed JSON-LD scripts |
| PJLD-008 | `clearPublicPageMeta()` does NOT remove non-managed scripts |

### 4.4 `tests/frontend/seo-jsonld.test.ts` (new — 20 acceptance tests)

| Test ID | Coverage |
|---|---|
| JLDT-001 | `publicPageMeta.ts` exports `PublicJsonLdBlock` type |
| JLDT-002 | `PublicPageMetaInput` has `readonly jsonLd?:` field |
| JLDT-003 | `publicPageMeta.ts` uses `'data-texqtic-public-jsonld'` attribute |
| JLDT-004 | `PUBLIC_B2C_BROWSE` branch: `'@type': 'WebPage'` in `jsonLd` |
| JLDT-005 | `PUBLIC_B2C_CATEGORY_STORY` known: both `WebPage` and `BreadcrumbList` |
| JLDT-006 | Unknown category fallback: no `jsonLd:` key in next 400 chars |
| JLDT-007 | `PUBLIC_COLLECTIONS` branch: `'@type': 'CollectionPage'` in `jsonLd` |
| JLDT-008 | `PUBLIC_COLLECTION_DETAIL` known: both `WebPage` and `BreadcrumbList` |
| JLDT-009 | `PUBLIC_INQUIRY` state: no `jsonLd:` key in next 400 chars |
| JLDT-010 | No forbidden schema types in App.tsx JSON-LD blocks |
| JLDT-011 | No forbidden private identifiers in App.tsx JSON-LD blocks |
| JLDT-012 | BreadcrumbList blocks include `position:`, `name:`, `item:` (≥2 occurrences) |
| JLDT-013 | `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` state: no `jsonLd:` in next 600 chars |
| JLDT-014 | `'@type': 'WebSite'` appears ≥4 times in App.tsx (one `isPartOf` per JSON-LD page) |
| JLDT-015 | `clearPublicPageMeta` source body calls `clearManagedJsonLd` |
| JLDT-016 | DOM: injected script has `type="application/ld+json"` |
| JLDT-017 | DOM: two JSON-LD blocks → two separate script tags with correct `@type`s |
| JLDT-018 | DOM: re-call replaces prior JSON-LD (not appends) |
| JLDT-019 | DOM: call without `jsonLd` clears prior managed JSON-LD |
| JLDT-020 | DOM: `clearPublicPageMeta` does NOT remove non-managed scripts |

---

## 5. TypeScript Validation

```
pnpm exec tsc --noEmit
```
Exit 0, no errors. All inline JSON-LD object literals are compatible with
`Record<string, unknown>` (`PublicJsonLdBlock`). `T[]` is assignable to `readonly T[]`.
No casts added.

---

## 6. Test Validation

```
pnpm test:frontend -- --reporter=verbose tests/frontend/seo-jsonld.test.ts
```
**20 / 20 PASS.** 0 failures.

```
pnpm test:frontend -- --reporter=verbose tests/frontend/public-page-meta.test.ts
```
**10 / 10 PASS.** 0 failures.

Non-regression: `tests/frontend/seo-sitemap.test.ts` — **25 / 25 PASS.** Unchanged.

---

## 7. Risks and Follow-up

### 7.1 SPA-only (no SSR)
JSON-LD is injected by JavaScript after hydration. Googlebot's JavaScript-rendering
pipeline indexes this correctly, but time-to-index is longer than server-rendered JSON-LD.
This is an accepted limitation of the Vite SPA architecture. Addressed in
`PUBLIC-SEO-SITEMAP-ROBOTS-JSONLD-STRATEGY-DESIGN-001`.

### 7.2 Deferred units
- `PUBLIC-SEO-PRODUCT-DETAIL-JSONLD-EXPANSION-001` — product detail pages when data model stabilises
- `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` — custom/apex domain canonical strategy
- `PUBLIC-SEO-SUPPLIER-PROFILE-INDEXABILITY-001` — supplier profile indexability

### 7.3 No `Product` schema on product detail pages
`PUBLIC_PRODUCT_DETAIL` is explicitly excluded until the product data model is confirmed
stable and safe for public-indexable schema attribution. This decision is intentional and
recorded here.

---

## 8. Commit Reference

**Commit message:** `[TEXQTIC] public: add safe JSON-LD for public web pages`
**Branch:** main
**Parent:** `30866a6` — `[TEXQTIC] governance: verify public SEO sitemap robots`
