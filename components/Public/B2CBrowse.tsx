import React, { useEffect, useMemo, useState } from 'react';
import {
  getPublicB2CProducts,
  type PublicB2CStorefrontEntry,
} from '../../services/publicB2CService';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';
import { type IndustrySegment } from '../../config/publicIndustryClusterTaxonomy';
import {
  getPublicReferenceB2CProductPreviews,
} from '../../config/publicReferenceB2C';
import {
  LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY,
  NOT_LIVE_COMMERCIAL_OFFER_COPY,
  REFERENCE_PRODUCT_PREVIEW_LABEL,
  ReferencePreviewBadge,
  ReferencePreviewNotice,
} from './ReferencePreviewNotice';

interface B2CBrowsePageProps {
  readonly onBack: () => void;
  readonly onExploreB2B?: () => void;
  readonly onSignIn: () => void;
  readonly nav: PublicNavbarProps;
}

// â”€â”€ flat product item for browse grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// -- B2C browse category filter chips ----------------------------------
// Values are a subset of INDUSTRY_SEGMENTS (PUBLIC_SAFE).
// Authority: config/publicIndustryClusterTaxonomy.ts > INDUSTRY_SEGMENTS.
// Do not add chip values that are not present in INDUSTRY_SEGMENTS.
const B2C_BROWSE_CHIP_ICONS: Readonly<Partial<Record<IndustrySegment, string>>> = {
  'Garments': '\u{1F455}',
  'Home Textiles': '\u{1F6CF}\uFE0F',
  'Technical Textiles': '\u{1F9E5}',
  'Fabrics': '\u{1F9F5}',
};

// Subset of INDUSTRY_SEGMENTS shown as B2C browse filter chips.
// Filter values must match productCategory values emitted by the public B2C projection.
const B2C_CATEGORY_FILTER_VALUES: ReadonlyArray<IndustrySegment> = [
  'Garments',
  'Home Textiles',
  'Technical Textiles',
  'Fabrics',
];

const CATEGORY_CARDS = B2C_CATEGORY_FILTER_VALUES.map((value) => ({
  label: value,
  value,
  icon: B2C_BROWSE_CHIP_ICONS[value] ?? '',
}));

// â”€â”€ page component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function B2CBrowsePage({ onBack, onExploreB2B, onSignIn, nav }: B2CBrowsePageProps) {
  const [storefronts, setStorefronts] = useState<PublicB2CStorefrontEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const referenceProducts = useMemo(() => getPublicReferenceB2CProductPreviews(), []);

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

  const usingReferencePreview = !loading && !error && storefronts.length === 0;
  const allProducts = useMemo(
    () => (usingReferencePreview ? [...referenceProducts] : flattenStorefronts(storefronts)),
    [referenceProducts, storefronts, usingReferencePreview],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allProducts.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category?.toLowerCase().includes(q) ?? false) ||
        (p.material?.toLowerCase().includes(q) ?? false) ||
        (p.fabricType?.toLowerCase().includes(q) ?? false) ||
        p.supplierName.toLowerCase().includes(q);
      const matchesCategory = !activeCategory || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allProducts, searchQuery, activeCategory]);

  const handleCategoryToggle = (value: string) => {
    setActiveCategory((prev) => (prev === value ? null : value));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveCategory(null);
  };

  const hasActiveFilter = searchQuery.trim().length > 0 || activeCategory !== null;

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      <PublicNavbar {...nav} />

      {/* Hero */}
      <div className="bg-[#071a2f] px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
            {usingReferencePreview ? 'Reference product discovery' : 'Public product discovery'}
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-5xl">
            {usingReferencePreview
              ? 'Preview how textile product discovery can appear on TexQtic.'
              : 'Browse textile products with trust behind them.'}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            {usingReferencePreview
              ? 'Explore clearly labeled reference product examples that show category, material, and supplier context before genuine products are published for public discovery.'
              : 'Explore public-safe textile product previews across categories, materials, and commerce pathways - from everyday products to textile ecosystem launches where available.'}
          </p>
          <p className="mt-3 text-sm text-slate-400">
            {usingReferencePreview
              ? LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY
              : 'TexQtic connects product discovery with the textile ecosystem behind it.'}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#browse-grid"
              className="inline-flex items-center justify-center rounded-full bg-[#7fd5de] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#071a2f] transition hover:bg-[#a4e0e8]"
            >
              Start Browsing
            </a>
            <button
              type="button"
              onClick={onExploreB2B ?? onBack}
              className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-300 transition hover:border-slate-400 hover:text-white"
            >
              Explore B2B Network
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {/* Search + filter */}
        <div className="mb-8">
          <div className="relative mb-4">
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
              placeholder="Search fabrics, garments, home textiles, technical textiles, or product categories"
              className="w-full rounded-full border border-[#d6e4e8] bg-white py-3 pl-11 pr-5 text-sm text-[#0a2036] placeholder-slate-400 shadow-[0_2px_8px_rgba(7,26,47,0.06)] focus:border-[#7fd5de] focus:outline-none focus:ring-2 focus:ring-[#7fd5de]/30"
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_CARDS.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleCategoryToggle(cat.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
                  activeCategory === cat.value
                    ? 'border-[#2f8094] bg-[#2f8094] text-white'
                    : 'border-[#d6e4e8] bg-white text-[#2f8094] hover:bg-[#eff6f8]'
                }`}
              >
                <span aria-hidden="true">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:bg-slate-50"
              >
                Clear filters
              </button>
            )}
          </div>
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
              Please try again or return to the TexQtic homepage.
            </p>
          </div>
        )}

        {/* Product grid */}
        {!loading && !error && (
          <div id="browse-grid">
            {usingReferencePreview && (
              <div className="mb-6">
                <ReferencePreviewNotice
                  label={REFERENCE_PRODUCT_PREVIEW_LABEL}
                  replacementCopy={LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY}
                />
              </div>
            )}
            {filteredProducts.length === 0 ? (
              <div className="rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-16 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                  No results
                </p>
                <h2 className="mt-3 text-xl font-semibold text-[#0a2036]">
                  {usingReferencePreview ? 'No reference products matched your search.' : 'No public products matched your search.'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {usingReferencePreview
                    ? 'Try a different keyword or explore another reference textile category.'
                    : 'Try a different keyword or explore another textile category.'}
                </p>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="mt-5 inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.key} product={product} onSignIn={onSignIn} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trust / origin section */}
        {!loading && !error && (
          <section className="mt-14 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_8px_28px_rgba(7,26,47,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Trust & origin
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#0a2036]">
              More than a product listing.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              TexQtic product discovery is designed to connect public product previews with the
              textile ecosystem behind them - including origin, supplier context, traceability, and
              trust signals where available.
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

        {/* D2C bridge - positioning only */}
        {!loading && !error && (
          <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#071a2f] px-8 py-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7fd5de]">
              Consumer launch pathways
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              From textile capability to consumer launches.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              TexQtic helps textile ecosystem participants move from manufacturing capability to
              consumer-facing launch pathways where available. Public product browse is the first step in that
              journey.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <span aria-hidden="true">[Protected]</span> Consumer launch pathways are part of TexQtic&apos;s public
              attraction roadmap - coming soon
            </p>
          </section>
        )}

        {/* Authenticated handoff */}
        {!loading && !error && (
          <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Ready to continue?
            </p>
            <h2 className="mt-3 text-xl font-semibold text-[#0a2036]">
              {usingReferencePreview
                ? 'Sign in to see how authenticated product workflows continue after launch-preview.'
                : 'Sign in to save products, review sourcing details, or access authenticated buyer workflows.'}
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
      </main>
    </div>
  );
}

// â”€â”€ ProductCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ProductCardProps {
  readonly product: FlatProductItem;
  readonly onSignIn: () => void;
}

function ProductCard({ product, onSignIn }: ProductCardProps) {
  const tags = [product.category, product.material, product.fabricType].filter(Boolean) as string[];
  const isReferencePreview = product.isReferencePreview === true;

  return (
    <article className="flex flex-col rounded-[28px] border border-[#d9e5ea] bg-white shadow-[0_8px_28px_rgba(7,26,47,0.07)] overflow-hidden">
      {/* Image */}
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
          <span className="text-sm font-medium text-slate-400" aria-hidden="true">No image</span>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {isReferencePreview && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ReferencePreviewBadge label={REFERENCE_PRODUCT_PREVIEW_LABEL} />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a5a00]">
              {NOT_LIVE_COMMERCIAL_OFFER_COPY}
            </span>
          </div>
        )}

        {/* Tags */}
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

        {/* Name */}
        <h3 className="text-base font-semibold leading-snug text-[#0a2036] line-clamp-2">
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

        {/* Supplier */}
        <p className="mt-1 text-[11px] font-medium text-slate-500">
          {product.supplierName}
          {product.jurisdiction ? (
            <span className="ml-1.5 text-slate-400">- {product.jurisdiction}</span>
          ) : null}
        </p>

        {/* Price / MOQ */}
        <div className="mt-3 flex items-center gap-3 text-[11px] font-medium text-slate-600">
          {product.price ? <span className="font-semibold text-[#2f8094]">{product.price}</span> : null}
          {product.moq ? <span className="text-slate-400">MOQ {product.moq}</span> : null}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onSignIn}
          className="mt-auto pt-4 w-full inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
        >
          Sign in to Continue
        </button>
      </div>
    </article>
  );
}

