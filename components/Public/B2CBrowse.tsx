import React, { useEffect, useState } from 'react';
import {
  getPublicB2CProducts,
  type PublicB2CStorefrontEntry,
} from '../../services/publicB2CService';

interface B2CBrowsePageProps {
  readonly onBack: () => void;
  readonly onSignIn: () => void;
}

export function B2CBrowsePage({ onBack, onSignIn }: B2CBrowsePageProps) {
  const [items, setItems] = useState<PublicB2CStorefrontEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPublicB2CProducts()
      .then((data) => {
        if (!cancelled) {
          setItems(data.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load storefronts. Please try again.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      {/* Nav */}
      <header className="border-b border-[#d6e4e8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
          <img
            src="/brand/texqtic-logo.png"
            alt="TexQtic"
            className="h-10 w-auto"
            loading="eager"
          />
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Page heading */}
      <div className="bg-[#071a2f] px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
            Curated products
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-5xl">
            B2C Product Browse
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Explore verified textile storefronts and browse curated products from trusted sellers.
            Account continuity and checkout begin after sign-in.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d6e4e8] border-t-[#7fd5de]" />
              <p className="text-sm text-slate-500">Loading storefronts…</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-16 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              No storefronts listed yet
            </p>
            <h2 className="mt-3 text-xl font-semibold text-[#0a2036]">
              Storefront listings are coming soon
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Verified B2C sellers will appear here once their public storefronts are published.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((storefront) => (
              <StorefrontCard key={storefront.slug} storefront={storefront} />
            ))}
          </div>
        )}

        {/* Sign-in CTA */}
        {!loading && !error && (
          <div className="mt-14 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Ready to shop?
            </p>
            <h2 className="mt-3 text-xl font-semibold text-[#0a2036]">
              Sign in to continue to checkout
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Cart persistence, checkout, and order continuity require an authenticated session.
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
            >
              Sign in to continue
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

interface StorefrontCardProps {
  readonly storefront: PublicB2CStorefrontEntry;
}

function StorefrontCard({ storefront }: StorefrontCardProps) {
  const previewItems = storefront.productsPreview.slice(0, 3);

  return (
    <article className="rounded-[28px] border border-[#d9e5ea] bg-white p-6 shadow-[0_8px_28px_rgba(7,26,47,0.07)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#2f8094]">
            {storefront.orgType}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-tight text-[#0a2036]">
            {storefront.legalName}
          </h3>
        </div>
        <span className="shrink-0 rounded-full border border-[#d6e4e8] bg-[#f0f8fb] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2f8094]">
          {storefront.jurisdiction}
        </span>
      </div>

      {/* Product preview */}
      {previewItems.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Product preview
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {previewItems.map((item) => (
              <div
                key={item.name}
                className="shrink-0 w-28 rounded-[16px] border border-[#e0ebee] bg-[#f8fbfc] overflow-hidden"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-20 w-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="px-2 py-2">
                  <p className="truncate text-[10px] font-semibold text-[#0a2036]">{item.name}</p>
                  {item.price !== null && (
                    <p className="mt-0.5 text-[9px] font-medium text-[#2f8094]">{item.price}</p>
                  )}
                  <p className="mt-0.5 text-[9px] text-slate-400">MOQ {item.moq}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
