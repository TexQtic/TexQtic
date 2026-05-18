import React, { useEffect, useState } from 'react';
import {
  getPublicB2CProductBySlug,
  type PublicB2CProductCard,
  type PublicB2CProductDetail,
} from '../../services/publicB2CService';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';

// B2C-PRODUCT-DETAIL-RICH-SEO-001: minimal state-back channel for App-level SEO metadata
export type PublicProductDetailMetaSignal =
  | {
      type: 'found';
      name: string;
      category: string | null;
      material: string | null;
      fabricType: string | null;
      summary: string | null;
      description: string | null;
      publicSupplierName: string | null;
    }
  | { type: 'notFound' };

interface PublicProductDetailProps {
  readonly slug: string;
  readonly onBackToBrowse: () => void;
  readonly onSignIn: () => void;
  readonly onViewSupplierProfile?: (supplierSlug: string) => void;
  readonly nav: PublicNavbarProps;
  readonly onProductMetaReady?: (meta: PublicProductDetailMetaSignal) => void;
}

function RelatedProductCard({ product }: { readonly product: PublicB2CProductCard }) {
  return (
    <a
      href={`/product/${encodeURIComponent(product.slug)}`}
      className="block rounded-[20px] border border-[#d9e5ea] bg-white p-4 shadow-[0_8px_24px_rgba(7,26,47,0.06)] transition hover:border-[#b9d1d8]"
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-28 w-full rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-[#eef6f8] text-slate-400">
          No image
        </div>
      )}
      <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-[#0a2036]">{product.name}</h3>
      <p className="mt-1 text-[11px] text-slate-500">{product.category || 'Textile product'}</p>
      {product.price ? <p className="mt-2 text-[12px] font-semibold text-[#2f8094]">{product.price}</p> : null}
    </a>
  );
}

export function PublicProductDetail({
  slug,
  onBackToBrowse,
  onSignIn,
  onViewSupplierProfile,
  nav,
  onProductMetaReady,
}: PublicProductDetailProps) {
  const [product, setProduct] = useState<PublicB2CProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setProduct(null);
      setLoading(false);
      setNotFound(true);
      onProductMetaReady?.({ type: 'notFound' });
      return;
    }

    let cancelled = false;
    setProduct(null);
    setLoading(true);
    setNotFound(false);

    getPublicB2CProductBySlug(slug)
      .then((data) => {
        if (!cancelled) {
          setProduct(data);
          setLoading(false);
          onProductMetaReady?.({
            type: 'found',
            name: data.name,
            category: data.category ?? null,
            material: data.material ?? null,
            fabricType: data.fabricType ?? null,
            summary: data.summary ?? null,
            description: data.description ?? null,
            publicSupplierName: data.publicSupplierName ?? null,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const status =
            typeof error === 'object' && error !== null && 'status' in error
              ? (error as { status?: number }).status
              : undefined;
          setNotFound(status === 404);
          setLoading(false);
          onProductMetaReady?.({ type: 'notFound' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, onProductMetaReady]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f8fb] font-sans">
        <PublicNavbar {...nav} />
        <div className="flex items-center justify-center px-6 py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f8094]" />
            <p className="text-sm text-slate-500">Loading product preview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product || notFound) {
    return (
      <div className="min-h-screen bg-[#f3f8fb] font-sans">
        <PublicNavbar {...nav} />
        <div className="px-6 py-16">
          <div className="mx-auto max-w-3xl rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-12 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Public Product Preview
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[#0a2036]">This public product preview is not available.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              The product may not be published for public discovery, or its details may be available only through authenticated TexQtic workflows.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onBackToBrowse}
                className="inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
              >
                Back to Product Browse
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
              >
                Sign in to Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasSupplierProfile = Boolean(product.publicSupplierSlug);
  const productStory =
    product.description ||
    product.summary ||
    'This product is part of TexQtic\'s public textile product discovery layer. Additional buying, saving, and product continuity workflows are available after sign-in.';

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      <PublicNavbar {...nav} />

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <section className="rounded-[32px] bg-[#071a2f] px-8 py-10 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">Public Product Preview</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-4xl">{product.name}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200">
            Explore public-safe product information, textile context, and trust signals before continuing through TexQtic.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {[product.category, product.material, product.fabricType, ...product.tags]
              .filter((v): v is string => Boolean(v))
              .slice(0, 6)
              .map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                >
                  {tag}
                </span>
              ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center justify-center rounded-full bg-[#7fd5de] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#071a2f] transition hover:bg-[#a6e4eb]"
            >
              Sign in to Continue
            </button>
            <button
              type="button"
              onClick={onBackToBrowse}
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-white/10"
            >
              Back to Product Browse
            </button>
          </div>

          {product.imageUrls.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
              <img
                src={product.imageUrls[0]}
                alt={product.name}
                className="h-72 w-full object-cover"
                loading="eager"
              />
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-[24px] border border-[#d9e5ea] bg-white px-6 py-5">
          <p className="text-sm leading-6 text-slate-600">
            This public product preview shows only information approved for public discovery. Checkout, saving, pricing continuity, supplier connection, documents, orders, and deeper product trust records are available only through authenticated TexQtic workflows.
          </p>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[24px] border border-[#d9e5ea] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#0a2036]">Product snapshot</h2>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                {product.publicPriceLabel ? <p><span className="font-semibold text-[#0a2036]">Public price:</span> {product.publicPriceLabel}</p> : null}
                {product.publicMoqLabel ? <p><span className="font-semibold text-[#0a2036]">Public MOQ:</span> {product.publicMoqLabel}</p> : null}
                <p><span className="font-semibold text-[#0a2036]">Status:</span> {product.publicStatusLabel}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#d9e5ea] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#0a2036]">Product story</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{productStory}</p>
            </div>

            <div className="rounded-[24px] border border-[#d9e5ea] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#0a2036]">Material and textile context</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                TexQtic connects product discovery with the textile ecosystem behind it - from materials and manufacturing capability to retail and consumer demand signals where available.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#d9e5ea] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#0a2036]">Trust, origin, and passport signals</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Where available, TexQtic connects product previews with public-safe trust, origin, traceability, or passport signals. Deeper records may require authenticated access.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {product.trustSignals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-[#d6e4e8] bg-[#f0f8fb] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2f8094]"
                  >
                    {signal}
                  </span>
                ))}
                {product.hasPassport === true ? (
                  <span className="rounded-full border border-[#d6e4e8] bg-[#f0f8fb] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2f8094]">
                    Public passport available
                  </span>
                ) : null}
              </div>
              {product.hasPassport && product.publicPassportId ? (
                <div className="mt-5 border-t border-[#d9e5ea] pt-5">
                  <p className="text-sm text-slate-700 mb-3">
                    A public passport is available for this product. It shows approved trust and origin context only.
                  </p>
                  <a
                    href={`/passport/${product.publicPassportId}`}
                    className="inline-flex items-center text-[#2f8094] hover:text-[#1e5a6a] text-sm font-semibold gap-2"
                  >
                    View Trust & Origin Passport
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] border border-[#d9e5ea] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#0a2036]">Supplier and source context</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Public source context helps visitors understand the textile ecosystem participant behind a product preview, where approved for discovery.
              </p>
              <p className="mt-4 text-sm font-medium text-[#0a2036]">{product.publicSupplierName}</p>
              {hasSupplierProfile && onViewSupplierProfile ? (
                <button
                  type="button"
                  onClick={() => onViewSupplierProfile(product.publicSupplierSlug)}
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2f8094] transition hover:bg-[#eff6f8]"
                >
                  View Public Supplier Profile
                </button>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-[#d9e5ea] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#0a2036]">Authenticated continuation</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Sign in to save this product, continue checkout, request details, or access authenticated buyer workflows.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#0d2743]"
                >
                  Sign in to Continue
                </button>
                <a
                  href="https://texqtic.com/request-access"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2f8094] transition hover:bg-[#eff6f8]"
                >
                  List Your Products
                </a>
              </div>
            </div>

            {product.relatedProducts.length > 0 ? (
              <div className="rounded-[24px] border border-[#d9e5ea] bg-white p-6">
                <h2 className="text-lg font-semibold text-[#0a2036]">Related products</h2>
                <div className="mt-4 grid gap-3">
                  {product.relatedProducts.map((related) => (
                    <RelatedProductCard key={related.slug} product={related} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
