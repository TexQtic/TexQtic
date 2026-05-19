# PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001
## Public SEO Sitemap and Robots Infrastructure — Implementation

**Unit ID:** PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001
**Family:** B2C Public Surface / Public SEO Infrastructure
**Status:** IMPLEMENTATION_COMPLETE
**Date:** 2026-05-19
**Authorized by:** Paresh
**Artifact class:** Implementation unit
**Placement:** `governance/units/`
**Preceding design unit:** `PUBLIC-SEO-SITEMAP-ROBOTS-JSONLD-STRATEGY-DESIGN-001` (commit `f5c0075`)

---

## 1. Unit Summary

This unit implements the static SEO infrastructure artefacts designed in the preceding
design unit: `public/sitemap.xml`, `public/robots.txt`, a build-time regeneration script
`scripts/generate-sitemap.ts`, sitemap discovery link in `index.html`, and noindex guards
in `App.tsx` for three stub public routes (`/trust`, `/industries`, `/aggregator`).

**Scope (this unit only):**
- Static sitemap.xml and robots.txt creation
- Sitemap discovery link in HTML entry point
- Stub route noindex guards in App.tsx SEO useEffect
- Build-time sitemap regeneration script
- Vitest test coverage for all SEO infrastructure (25 tests)

**Deferred to subsequent units:**
- JSON-LD structured data (`PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001`)
- Custom / apex domain canonical strategy (`PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`)
- Product detail sitemap expansion (`PUBLIC-SEO-PRODUCT-SITEMAP-EXPANSION-001`)
- Supplier profile indexability (`PUBLIC-SEO-SUPPLIER-PROFILE-INDEXABILITY-001`)

---

## 2. Allowlist

| File | Action |
|---|---|
| `public/sitemap.xml` | Created |
| `public/robots.txt` | Created |
| `scripts/generate-sitemap.ts` | Created |
| `index.html` | Modified |
| `App.tsx` | Modified |
| `tests/frontend/seo-sitemap.test.ts` | Created |
| `governance/units/PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001.md` | Created (this file) |
| `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | Modified (Section 35 appended) |

---

## 3. Repo-Truth Verification (Pre-Implementation)

All 12 checks passed before implementation began:

| # | Check | Result |
|---|---|---|
| 1 | `vite.config.ts` — no prerender plugin | PASS |
| 2 | `public/` is served as static root by Vercel | PASS |
| 3 | `index.html` `<head>` structure | PASS |
| 4 | `utils/publicPageMeta.ts` `PublicPageMetaInput` — all 14 fields required | PASS |
| 5 | `PUBLIC_META_OG_FALLBACK_IMAGE` exported from `publicPageMeta.ts` | PASS |
| 6 | App.tsx imports `PUBLIC_META_OG_FALLBACK_IMAGE` at line 91 | PASS |
| 7 | `App.tsx` SEO useEffect — `clearPublicPageMeta()` at end | PASS |
| 8 | `config/publicCollectionsProjection.ts` — 5 AVAILABLE collections | PASS |
| 9 | `config/publicB2CCategoryPages.ts` — `B2C_CATEGORY_PAGE_CONFIGS` export | PASS |
| 10 | `B2C_CATEGORY_PAGE_CONFIGS` — 4 category entries | PASS |
| 11 | `AppState` type includes `PUBLIC_TRUST_LANDING`, `PUBLIC_INDUSTRY_CLUSTER_LANDING`, `PUBLIC_AGGREGATOR` | PASS |
| 12 | `vitest.frontend.config.ts` test root and environment | PASS |

---

## 4. Files Created / Modified

### 4.1 `public/sitemap.xml`

Static XML sitemap served directly from Vercel before SPA catch-all. Contains 12 URLs:
- `/products` — priority 0.8, weekly
- `/products/category/garments` — priority 0.7, weekly
- `/products/category/home-textiles` — priority 0.7, weekly
- `/products/category/technical-textiles` — priority 0.7, weekly
- `/products/category/fabrics` — priority 0.7, weekly
- `/collections` — priority 0.8, weekly
- `/collections/natural-fabric-stories` — priority 0.7, weekly
- `/collections/garment-supply-chain-context` — priority 0.7, weekly
- `/collections/home-textiles-showcase` — priority 0.7, weekly
- `/collections/textile-services-ecosystem` — priority 0.7, weekly
- `/collections/technical-textiles-context` — priority 0.7, weekly
- `/inquiry` — priority 0.5, monthly

Category slugs are derived from `B2C_CATEGORY_PAGE_CONFIGS` in `config/publicB2CCategoryPages.ts`.
Collection slugs are derived from `PUBLIC_COLLECTION_PROJECTIONS` in `config/publicCollectionsProjection.ts`
filtered to `listState.availability === 'AVAILABLE'` (all 5 collections are AVAILABLE).

> **Correction note (PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001-CORRECTION-001, 2026-05-19):**
> The initial governance doc draft for this section incorrectly described the sitemap as
> containing fabricated slugs (`plain-fabrics`, `specialty-fabrics`, `sustainable-materials`,
> `-b2c`-suffixed collections). Those slugs were never in the config registries, never in
> `scripts/generate-sitemap.ts`, and never in the committed `public/sitemap.xml`. The runtime
> files were always correct; only this documentation section was wrong. Corrected above.

Canonical origin: `https://app.texqtic.com`

**Excluded routes (not in sitemap):**
- `/trust`, `/industries`, `/aggregator` — stub/not ready for indexing
- All authenticated tenant routes (`/supplier/`, `/join/`, `/passport/`)
- `/api/` — server routes

### 4.2 `public/robots.txt`

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

Defence-in-depth: stub routes are `Disallow` listed AND receive `noindex, nofollow` robots
meta tag in App.tsx AND are excluded from sitemap.xml. All three layers are independent.

### 4.3 `scripts/generate-sitemap.ts`

Build-time regeneration script. Reads:
- `config/publicB2CCategoryPages.ts` → `B2C_CATEGORY_PAGE_CONFIGS` (4 entries)
- `config/publicCollectionsProjection.ts` → `PUBLIC_COLLECTION_PROJECTIONS` filtered to `availability === 'AVAILABLE'`

Writes `public/sitemap.xml`. Run via:
```
node --import tsx scripts/generate-sitemap.ts
```

**Purpose:** Keep sitemap in sync when AVAILABLE collection set changes. Must be run
manually before deployment when collection availability changes.

### 4.4 `index.html`

Added sitemap discovery link inside `<head>`:
```html
<link rel="sitemap" type="application/xml" href="/sitemap.xml" />
```

### 4.5 `App.tsx`

Added 3 stub state noindex guards in the SEO `useEffect`, before the final
`clearPublicPageMeta()` fallback. Each guard:
- Calls `applyPublicPageMeta` with all 14 required `PublicPageMetaInput` fields
- Sets `robots: 'noindex, nofollow'`
- Uses `PUBLIC_META_OG_FALLBACK_IMAGE` for `ogImage` / `twitterImage`
- Sets `twitterCard: 'summary'` (appropriate for stub/placeholder pages)
- Returns early to prevent `clearPublicPageMeta()` from running

States guarded:
- `PUBLIC_TRUST_LANDING` → canonical `/trust`
- `PUBLIC_INDUSTRY_CLUSTER_LANDING` → canonical `/industries`
- `PUBLIC_AGGREGATOR` → canonical `/aggregator`

### 4.6 `tests/frontend/seo-sitemap.test.ts`

25 Vitest tests across 5 describe blocks:

| Block | Tests | Approach |
|---|---|---|
| `sitemap.xml — structure and content` | 10 | File-system read, XML parse, URL assertions |
| `robots.txt — directives` | 7 | File-system read, line-by-line directive assertions |
| `index.html — sitemap discovery link` | 2 | File-system read, regex |
| `App.tsx — stub state noindex guards` | 3 | Source code regex (state + applyPublicPageMeta + noindex pattern within 550 chars) |
| `generate-sitemap.ts — config-driven URL count` | 3 | Import config modules, count AVAILABLE collections + 4 categories |

All 25 tests pass.

---

## 5. TypeScript Validation

```
pnpm exec tsc --noEmit
```
Exit 0, no errors. App.tsx stub state `applyPublicPageMeta` calls include all 14 required
fields from `PublicPageMetaInput`.

---

## 6. Test Validation

```
pnpm test:frontend -- --reporter=verbose
```
25 / 25 PASS. 0 failures.

---

## 7. SEO Defence-in-Depth Summary

For the three stub routes (`/trust`, `/industries`, `/aggregator`):

| Layer | Mechanism | Status |
|---|---|---|
| 1 | `robots.txt` `Disallow` | ✅ Implemented |
| 2 | `noindex, nofollow` robots meta in App.tsx | ✅ Implemented |
| 3 | Excluded from `sitemap.xml` | ✅ Implemented |

For indexable public routes:
| Route | sitemap.xml | robots.txt | App.tsx |
|---|---|---|---|
| `/products` | ✅ | Allow | `index, follow` |
| `/products/category/*` | ✅ (4 URLs) | Allow prefix | `index, follow` |
| `/collections` | ✅ | Allow | `index, follow` |
| `/collections/:slug` (AVAILABLE) | ✅ (5 URLs) | (no Disallow) | `index, follow` |
| `/inquiry` | ✅ | Allow | `index, follow` |

---

## 8. Risks and Follow-up

| Risk / Item | Severity | Action |
|---|---|---|
| `generate-sitemap.ts` must be re-run when collection availability changes | Low | Document in release runbook |
| `public/sitemap.xml` is static — does not auto-update at build time | Medium | Add `node --import tsx scripts/generate-sitemap.ts` to pre-deploy step |
| JSON-LD structured data not yet implemented | Medium | Deferred: `PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001` |
| Canonical origin hardcoded as `https://app.texqtic.com` | Low | Reassess under `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` |
| Product detail pages not yet in sitemap | Low | Deferred: `PUBLIC-SEO-PRODUCT-SITEMAP-EXPANSION-001` |

---

## 9. Commit

```
[TEXQTIC] public: add sitemap and robots SEO infrastructure
```

Files committed:
- `public/sitemap.xml`
- `public/robots.txt`
- `scripts/generate-sitemap.ts`
- `index.html`
- `App.tsx`
- `tests/frontend/seo-sitemap.test.ts`
- `governance/units/PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001.md`
- `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md`
