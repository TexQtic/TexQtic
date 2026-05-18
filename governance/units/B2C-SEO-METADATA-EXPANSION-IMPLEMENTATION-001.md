# B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001

**Unit type:** Runtime Implementation + Governance Sync
**Status:** IMPLEMENTATION_COMPLETE_LOCAL_VALIDATION_PASS
**Date:** 2026-07-07
**Design authority:** `governance/units/B2C-SEO-METADATA-EXPANSION-DESIGN-001.md`
**Tracker section:** Section 25 of `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md`

---

## 1. Objective

Implement Stage 2a SEO metadata for the two B2C public surfaces that were previously falling through to `clearPublicPageMeta()`:

| Route | AppState | Stage |
|---|---|---|
| `/products` | `PUBLIC_B2C_BROWSE` | 2a — static |
| `/product/:slug` | `PUBLIC_PRODUCT_DETAIL` | 2a — slug-only generic |

---

## 2. Files Modified

| File | Modification |
|---|---|
| `App.tsx` | Added two new arms in the SEO useEffect; added `publicProductSlugFromPath` to deps array |

No other files modified. `utils/publicPageMeta.ts`, `components/Public/B2CBrowse.tsx`, and `components/Public/PublicProductDetail.tsx` were NOT modified.

---

## 3. Implementation Detail

### 3.1 SEO useEffect dependency array

Before:
```typescript
}, [appState, publicCollectionSlugFromPath, publicCategorySlugFromPath]);
```

After:
```typescript
}, [appState, publicCollectionSlugFromPath, publicCategorySlugFromPath, publicProductSlugFromPath]);
```

### 3.2 PUBLIC_B2C_BROWSE arm

Added before the final `clearPublicPageMeta()` fallthrough:

```typescript
// B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001: Stage 2a — B2C browse + product detail
if (appState === 'PUBLIC_B2C_BROWSE') {
  const browseTitle = 'Explore Textile Products — TexQtic';
  const browseDescription =
    'Browse public-safe textile product previews across garments, home textiles, technical textiles, and fabrics on TexQtic.';
  applyPublicPageMeta({
    title: browseTitle,
    description: browseDescription,
    canonical: `${origin}/products`,
    robots: 'index, follow',
    ogTitle: browseTitle,
    ogDescription: browseDescription,
    ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
    ogUrl: `${origin}/products`,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: browseTitle,
    twitterDescription: browseDescription,
    twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
  });
  return;
}
```

### 3.3 PUBLIC_PRODUCT_DETAIL arm

```typescript
if (appState === 'PUBLIC_PRODUCT_DETAIL') {
  if (!publicProductSlugFromPath) {
    clearPublicPageMeta();
    return;
  }
  const productTitle = 'Textile Product Preview — TexQtic';
  const productDescription =
    'View this public-safe textile product preview on TexQtic. Discover materials, categories, and supply chain context from verified suppliers.';
  const productCanonical = `${origin}/product/${publicProductSlugFromPath}`;
  applyPublicPageMeta({
    title: productTitle,
    description: productDescription,
    canonical: productCanonical,
    robots: 'index, follow',
    ogTitle: productTitle,
    ogDescription: productDescription,
    ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
    ogUrl: productCanonical,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: productTitle,
    twitterDescription: productDescription,
    twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
  });
  return;
}
```

---

## 4. Design Deviation — ogType

**Design specified:** `ogType: 'product'` for product detail
**Implemented as:** `ogType: 'website'`

**Reason:** `PublicPageMetaInput.ogType` in `utils/publicPageMeta.ts` is typed as `'website'` only. Since `publicPageMeta.ts` is on the forbidden list for this unit, the call was adapted to satisfy the type contract. If `og:type = 'product'` is required in future, the utility interface must be extended in a dedicated unit.

---

## 5. Validation Evidence

| Check | Result |
|---|---|
| `git diff --name-only` | `App.tsx` only |
| `pnpm run typecheck` (UI + server tsc --noEmit) | PASS |
| D2C collection metadata regression | Not regressed (no change to existing arms) |
| B2C category story metadata regression | Not regressed (no change to existing arms) |

---

## 6. Known Limitations (Stage 2a)

1. **Cannot distinguish found vs. not-found:** The SEO useEffect fires before `PublicProductDetail` resolves the product fetch. Both found and not-found slugs receive `index, follow`. Resolution deferred to Stage 2b (`B2C-PRODUCT-DETAIL-RICH-SEO-001`).

2. **Generic title/description for all product URLs:** No product name, category, or supplier context in metadata. Titles are static across all `/product/:slug` URLs. Resolution deferred to Stage 2b.

3. **`ogType: 'website'` instead of `'product'`:** See Section 4.

---

## 7. Explicit Deferrals

| Item | Deferred Unit |
|---|---|
| `PUBLIC_TRUST_LANDING` metadata | Out of scope — separate unit |
| `PUBLIC_INDUSTRY_CLUSTER_LANDING` metadata | Out of scope — separate unit |
| `PUBLIC_AGGREGATOR` metadata | Out of scope — separate unit |
| Stage 2b: `onProductMetaReady` callback | `B2C-PRODUCT-DETAIL-RICH-SEO-001` |
| Product not-found `noindex` | `B2C-PRODUCT-DETAIL-RICH-SEO-001` |
| Rich product metadata (name, description, supplier) | `B2C-PRODUCT-DETAIL-RICH-SEO-001` |
| sitemap.xml | Post domain strategy decision |
| robots.txt | Post domain strategy decision |
| JSON-LD structured data | Post Stage 2b |
| Production verification | `B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001-VERIFY-CLOSE` |
| `ogType` extension in publicPageMeta | Separate utility update unit |

---

## 8. Commit Reference

- **Commit message:** `[TEXQTIC] public: implement B2C SEO metadata expansion`
- **Commit hash:** TBD — filled after commit
