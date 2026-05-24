/**
 * PublicB2CCategoryPage — B2C public category story page component
 *
 * Authority:  B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001
 * Route:      /products/category/:slug
 * AppState:   PUBLIC_B2C_CATEGORY_STORY
 *
 * PURPOSE
 * -------
 * URL-addressable category story pages for the four initial B2C textile
 * categories: Garments, Home Textiles, Technical Textiles, Fabrics.
 *
 * Each page includes:
 *   - Category hero (heading, tagline, description)
 *   - Optional context band
 *   - Product grid (filtered from public B2C browse endpoint by segment)
 *   - Trust band (conditional, "where available" language only)
 *   - Sign-in handoff
 *   - Public boundary disclosure
 *
 * GOVERNANCE RULES
 * ----------------
 * - No DPP/passport badges on product cards (browse projection does not
 *   expose hasPassport; trust claims must use "where available" language).
 * - Product filter uses exact-match: p.category === config.segment.
 *   Normalization risk recorded in Finding 1 of design unit.
 * - SEO metadata is applied via applyPublicPageMeta in App.tsx, not here.
 * - No D2C imports.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  getPublicB2CProducts,
  type PublicB2CStorefrontEntry,
} from '../../services/publicB2CService';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';
import {
  getCategoryPageBySlug,
  type PublicB2CCategoryPageConfig,
} from '../../config/publicB2CCategoryPages';
import {
  getPublicReferenceB2CProductsByCategory,
  type PublicReferenceB2CProductPreview,
} from '../../config/publicReferenceB2C';
import {
  LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY,
  NOT_LIVE_COMMERCIAL_OFFER_COPY,
  REFERENCE_PRODUCT_PREVIEW_LABEL,
  ReferencePreviewBadge,
  ReferencePreviewNotice,
} from './ReferencePreviewNotice';

// ── props ──────────────────────────────────────────────────────────────────

export interface PublicB2CCategoryPageProps {
  readonly slug: string;
  readonly nav: PublicNavbarProps;
  readonly onBack: () => void;
  readonly onSignIn: () => void;
}

// ── flat product item ──────────────────────────────────────────────────────

interface FlatProductItem {
  slug: string;
  key: string;
  name: string;
  imageUrl: string | null;
  price: string | null;
  moq: number | null;
  category: string | null;
  material: string | null;
  fabricType: string | null;
  supplierName: string;
  supplierSlug: string;
  jurisdiction: string;
  isReferencePreview?: boolean;
}

function flattenStorefronts(storefronts: PublicB2CStorefrontEntry[]): FlatProductItem[] {
  const items: FlatProductItem[] = [];
  for (const sf of storefronts) {
    for (const p of sf.productsPreview) {
      items.push({
        slug: p.slug,
        key: `${sf.slug}::${p.name}`,
        name: p.name,
        imageUrl: p.imageUrl,
        price: p.price,
        moq: p.moq,
        category: p.category,
        material: p.material,
        fabricType: p.fabricType,
        supplierName: sf.legalName,
        supplierSlug: sf.slug,
        jurisdiction: sf.jurisdiction,
      });
    }
  }
  return items;
}

// ── unavailable state ──────────────────────────────────────────────────────

function CategoryUnavailable({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f8fb] px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#2f8094]">
        Category unavailable
      </p>
      <h1 className="mt-4 text-center text-2xl font-semibold text-[#0a2036]">
        This category is not available for public discovery.
      </h1>
      <p className="mt-3 max-w-md text-center text-sm leading-6 text-slate-500">
        The category you are looking for is not currently listed for public product discovery.
        Return to browse all available textile products.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
      >
        Browse All Products
      </button>
    </div>
  );
}

// ── product card ───────────────────────────────────────────────────────────

interface ProductCardProps {
  readonly product: FlatProductItem;
  readonly onSignIn: () => void;
}

function CategoryProductCard({ product, onSignIn }: ProductCardProps) {
  const tags = [product.category, product.material, product.fabricType].filter(
    Boolean,
  ) as string[];
  const isReferencePreview = product.isReferencePreview === true;

  return (
    <article className="flex flex-col overflow-hidden rounded-[28px] border border-[#d9e5ea] bg-white shadow-[0_8px_28px_rgba(7,26,47,0.07)]">
      {product.imageUrl ? (
        <div className="h-44 w-full overflow-hidden bg-[#f0f8fb]">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-[#f0f8fb]">
          <span className="text-sm font-medium text-slate-400" aria-hidden="true">
            No image
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {isReferencePreview && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ReferencePreviewBadge label={REFERENCE_PRODUCT_PREVIEW_LABEL} />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a5a00]">
              {NOT_LIVE_COMMERCIAL_OFFER_COPY}
            </span>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#d6e4e8] bg-[#f0f8fb] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2f8094]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[#0a2036]">
          {product.name}
        </h3>

        {product.slug ? (
          <a
            href={`/product/${encodeURIComponent(product.slug)}`}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-[#f8fbfc] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2f8094] transition hover:bg-[#eff6f8]"
          >
            {isReferencePreview ? 'View Reference Preview' : 'View Product Preview'}
          </a>
        ) : null}

        <p className="mt-1 text-[11px] font-medium text-slate-500">
          {product.supplierName}
          {product.jurisdiction ? (
            <span className="ml-1.5 text-slate-400">- {product.jurisdiction}</span>
          ) : null}
        </p>

        <div className="mt-3 flex items-center gap-3 text-[11px] font-medium text-slate-600">
          {product.price !== null ? (
            <span className="font-semibold text-[#2f8094]">{product.price}</span>
          ) : null}
          {product.moq !== null ? <span className="text-slate-400">MOQ {product.moq}</span> : null}
        </div>

        <button
          type="button"
          onClick={onSignIn}
          className="mt-auto w-full inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-4 py-2 pt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
        >
          Sign in to Continue
        </button>
      </div>
    </article>
  );
}

// ── category page content (known category) ────────────────────────────────

interface CategoryPageContentProps {
  readonly config: PublicB2CCategoryPageConfig;
  readonly nav: PublicNavbarProps;
  readonly onBack: () => void;
  readonly onSignIn: () => void;
}

function CategoryPageContent({ config, nav, onBack, onSignIn }: CategoryPageContentProps) {
  const [storefronts, setStorefronts] = useState<PublicB2CStorefrontEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const referenceProducts = useMemo(
    () => getPublicReferenceB2CProductsByCategory(config.segment) as readonly PublicReferenceB2CProductPreview[],
    [config.segment],
  );

  useEffect(() => {
    let cancelled = false;
    getPublicB2CProducts()
      .then((data) => {
        if (!cancelled) {
          setStorefronts(data.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('We could not load public product previews right now.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allProducts = useMemo(() => flattenStorefronts(storefronts), [storefronts]);

  // Filter products by segment using exact-match logic, consistent with
  // B2CBrowse.tsx. See Finding 1 in B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001
  // for productCategory normalization risk.
  const realCategoryProducts = useMemo(() => {
    return allProducts.filter((p) => p.category === config.segment);
  }, [allProducts, config.segment]);

  const usingReferencePreview = !loading && !error && realCategoryProducts.length === 0;

  const categoryProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sourceProducts = usingReferencePreview ? referenceProducts : realCategoryProducts;
    return sourceProducts.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.material?.toLowerCase().includes(q) ?? false) ||
        (p.fabricType?.toLowerCase().includes(q) ?? false) ||
        p.supplierName.toLowerCase().includes(q)
      );
    });
  }, [realCategoryProducts, referenceProducts, searchQuery, usingReferencePreview]);

  const hasSearch = searchQuery.trim().length > 0;
  let emptyStateTitle = `No ${config.heroHeading} products are available for public discovery right now.`;
  let emptyStateDescription = 'This category may have products available in future. Browse all textile products to discover more.';

  if (hasSearch) {
    emptyStateTitle = usingReferencePreview
      ? 'No reference products in this category matched your search.'
      : 'No products in this category matched your search.';
    emptyStateDescription = 'Try a different keyword or browse all products in this category.';
  } else if (usingReferencePreview) {
    emptyStateDescription = 'Reference examples appear here until genuine products are published for this category.';
  }

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      <PublicNavbar {...nav} />

      {/* Hero */}
      <div className="bg-[#071a2f] px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
            {usingReferencePreview ? 'Reference category discovery' : 'B2C category discovery'}
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-5xl">
            {config.heroHeading}
          </h1>
          <p className="mt-3 text-lg font-medium text-[#a4e0e8]">{config.heroTagline}</p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            {usingReferencePreview
              ? `${config.heroDescription} These examples are reference previews only and are clearly labeled until genuine products are published.`
              : config.heroDescription}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#category-browse-grid"
              className="inline-flex items-center justify-center rounded-full bg-[#7fd5de] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#071a2f] transition hover:bg-[#a4e0e8]"
            >
              Browse {config.heroHeading} Products
            </a>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-300 transition hover:border-slate-400 hover:text-white"
            >
              Back to All Products
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {/* Context band */}
        {config.contextBandCopy && (
          <section className="mb-10 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-8 shadow-[0_4px_16px_rgba(7,26,47,0.05)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              About {config.heroHeading}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {config.contextBandCopy}
            </p>
          </section>
        )}

        {/* Search within category */}
        <div className="mb-8">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search within ${config.heroHeading} products`}
              className="w-full rounded-full border border-[#d6e4e8] bg-white py-3 pl-11 pr-5 text-sm text-[#0a2036] placeholder-slate-400 shadow-[0_2px_8px_rgba(7,26,47,0.06)] focus:border-[#7fd5de] focus:outline-none focus:ring-2 focus:ring-[#7fd5de]/30"
            />
          </div>
          {hasSearch && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:bg-slate-50"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d6e4e8] border-t-[#7fd5de]" />
              <p className="text-sm text-slate-500">Loading products...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <p className="mt-1 text-sm text-red-500">
              Please try again or return to browse all products.
            </p>
          </div>
        )}

        {/* Product grid */}
        {!loading && !error && (
          <div id="category-browse-grid">
            {usingReferencePreview && (
              <div className="mb-6">
                <ReferencePreviewNotice
                  label={REFERENCE_PRODUCT_PREVIEW_LABEL}
                  replacementCopy={LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY}
                />
              </div>
            )}
            {categoryProducts.length === 0 ? (
              <div className="rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-16 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                  No products
                </p>
                <h2 className="mt-3 text-xl font-semibold text-[#0a2036]">{emptyStateTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{emptyStateDescription}</p>
                {hasSearch && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-5 inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
                  >
                    Clear search
                  </button>
                )}
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
                  >
                    Browse All Products
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {categoryProducts.map((product) => (
                  <CategoryProductCard key={product.key} product={product} onSignIn={onSignIn} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trust / origin band — "where available" language only, no universal claims */}
        {!loading && !error && (
          <section className="mt-14 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_8px_28px_rgba(7,26,47,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Trust &amp; origin
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#0a2036]">
              Trust context where available.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Where available, public-safe trust signals and passport records are shown on
              individual product pages within this category. Deeper records may require
              authenticated access.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                'Origin context where available',
                'Supplier trust signals where available',
                'Traceability signals where available',
                'Public-safe projection only',
              ].map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e4e8] bg-[#f0f8fb] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2f8094]"
                >
                  <span aria-hidden="true">✓</span> {label}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Sign-in handoff */}
        {!loading && !error && (
          <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Ready to continue?
            </p>
            <h2 className="mt-3 text-xl font-semibold text-[#0a2036]">
              Sign in to access deeper supplier discovery, sourcing workflows, and authenticated
              tools.
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
              >
                Sign in to Continue
              </button>
              <a
                href={`/inquiry?categorySlug=${encodeURIComponent(config.slug)}&sourceSurface=CATEGORY_STORY`}
                className="inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
              >
                Send a sourcing inquiry
              </a>
              <a
                href="https://texqtic.com/request-access"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
              >
                List Your Products
              </a>
            </div>
          </section>
        )}

        {/* Public boundary disclosure */}
        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#f8fbfc] px-8 py-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Public discovery only
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
            This public category page shows only information approved for public discovery. No
            private supplier records, pricing, inventory, or authenticated business information is
            visible on this page. Individual product pages may include additional public context
            where available.
          </p>
            {usingReferencePreview ? (
              <p className="mt-2 max-w-2xl text-xs font-semibold uppercase tracking-[0.18em] text-[#9a5a00]">
                {LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY}
              </p>
            ) : null}
        </section>
      </main>
    </div>
  );
}

// ── main export ────────────────────────────────────────────────────────────

export function PublicB2CCategoryPage({ slug, nav, onBack, onSignIn }: PublicB2CCategoryPageProps) {
  const config = getCategoryPageBySlug(slug);

  if (!config) {
    return <CategoryUnavailable onBack={onBack} />;
  }

  return <CategoryPageContent config={config} nav={nav} onBack={onBack} onSignIn={onSignIn} />;
}
