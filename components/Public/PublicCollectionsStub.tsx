import React from 'react';
import {
  PUBLIC_COLLECTION_PROJECTIONS,
  getEligibleCollections,
  deriveCollectionsListMeta,
  type PublicCollectionProjection,
} from '../../config/publicCollectionsProjection';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';

interface PublicCollectionsStubProps {
  readonly onBrowseProducts: () => void;
  readonly onExploreB2BNetwork: () => void;
  readonly onSignIn: () => void;
  readonly onListYourProducts: () => void;
  readonly onBackToEntry: () => void;
  readonly nav: PublicNavbarProps;
}

function ActionButton({
  label,
  onClick,
  variant = 'secondary',
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly variant?: 'primary' | 'secondary';
}) {
  const className =
    variant === 'primary'
      ? 'inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]'
      : 'inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]';

  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}

function TagPill({ label }: { readonly label: string }) {
  return (
    <span className="inline-block rounded-full border border-[#d6e4e8] bg-[#f0f8fb] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2f8094]">
      {label}
    </span>
  );
}

function CollectionCard({
  collection,
  onSignIn,
}: {
  readonly collection: PublicCollectionProjection;
  readonly onSignIn: () => void;
}) {
  const allTags = [
    ...collection.segmentTags,
    ...collection.categoryTags,
    ...collection.materialTags,
  ];

  return (
    <article
      className="flex flex-col rounded-[24px] border border-[#d9e5ea] bg-white shadow-[0_8px_24px_rgba(7,26,47,0.06)] overflow-hidden"
      aria-label={collection.title}
    >
      {/* Hero visual placeholder — no public image hosting in this phase */}
      <div
        className="flex h-36 items-center justify-center bg-gradient-to-br from-[#e8f4f7] to-[#d0eaf0]"
        role="img"
        aria-label={collection.heroAlt}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#5aafbe] opacity-60">
          {collection.curatedContextLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
          {collection.curatedContextLabel}
        </p>
        <a
          href={`/collections/${encodeURIComponent(collection.publicSlug)}`}
          className="block text-[#0a2036] hover:text-[#2f8094] transition-colors"
        >
          <h2 className="text-lg font-semibold leading-snug">
            {collection.title}
          </h2>
        </a>
        <p className="text-sm leading-6 text-slate-600">{collection.summary}</p>

        {/* Taxonomy tags — public-safe only */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {allTags.map((tag) => (
              <TagPill key={tag} label={tag} />
            ))}
          </div>
        )}

        {/* Trust context — fail-closed in this phase */}
        {collection.trustContextMode === 'CONDITIONAL_PRODUCT_CONTEXT_ONLY' && (
          <p className="text-[11px] leading-5 text-slate-400">
            Eligible products may include public trust context where available.
          </p>
        )}

        {/* Authenticated continuation CTA */}
        <div className="mt-auto pt-3">
          <ActionButton
            label={collection.cta.label}
            onClick={onSignIn}
            variant="secondary"
          />
        </div>
      </div>
    </article>
  );
}

export function PublicCollectionsStub({
  onBrowseProducts,
  onExploreB2BNetwork,
  onSignIn,
  onListYourProducts,
  onBackToEntry,
  nav,
}: PublicCollectionsStubProps) {
  const eligibleCollections = getEligibleCollections(PUBLIC_COLLECTION_PROJECTIONS);
  const listMeta = deriveCollectionsListMeta(PUBLIC_COLLECTION_PROJECTIONS);

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      <PublicNavbar {...nav} />
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">

        {/* Hero */}
        <section className="rounded-[32px] bg-[#071a2f] px-8 py-10 text-white shadow-[0_18px_50px_rgba(7,26,47,0.12)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
            Verified Textile Collections
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-4xl">
            Public-safe curated textile collection stories and showcases.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
            TexQtic collections frame eligible textile stories, material context, and ecosystem positioning
            as public-safe showcases — without exposing private supplier records, buyer workflows, pricing,
            or product-owned passport detail.
          </p>
          <p className="mt-3 text-sm text-slate-300">
            Public-safe showcase. Authenticated continuation after sign in.
          </p>
        </section>

        {/* Boundary disclosure */}
        <section className="mt-6 rounded-[24px] border border-[#d9e5ea] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(7,26,47,0.06)]">
          <p className="text-sm leading-6 text-slate-600">
            These collections are public-safe concept showcases. They do not implement collection detail
            runtime, checkout, cart, wishlist, order, or private workflow behavior. Trust, passport,
            traceability, and origin context remain conditional and appear only where available.
          </p>
        </section>

        {/* Collection list or fallback */}
        {listMeta.emptyState ? (
          <section className="mt-8 rounded-[24px] border border-[#d9e5ea] bg-white px-8 py-12 text-center shadow-[0_8px_24px_rgba(7,26,47,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Collections
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Verified Textile Collections are being prepared as public-safe curated story and showcase previews.
            </p>
          </section>
        ) : (
          <section className="mt-8" aria-label="Verified Textile Collections">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Collections &middot; {eligibleCollections.length} available
            </p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {eligibleCollections.map((collection) => (
                <CollectionCard
                  key={collection.publicSlug}
                  collection={collection}
                  onSignIn={onSignIn}
                />
              ))}
            </div>
          </section>
        )}

        {/* Navigation pathways */}
        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            Continue exploring
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Other public-safe surfaces.
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton label="Back to Home" onClick={onBackToEntry} />
            <ActionButton label="Browse Products" onClick={onBrowseProducts} variant="primary" />
            <ActionButton label="Explore B2B Network" onClick={onExploreB2BNetwork} />
            <ActionButton label="Sign in to Continue" onClick={onSignIn} />
            <ActionButton label="List Your Products" onClick={onListYourProducts} />
          </div>
        </section>

        {/* Authenticated handoff */}
        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#071a2f] px-8 py-10 text-white shadow-[0_18px_50px_rgba(7,26,47,0.12)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7fd5de]">
            Authenticated continuation
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            Prepare the public journey, then continue securely.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Deeper authenticated workflows — sourcing, inquiries, business tools, and private
            collection continuity — remain in TexQtic's authenticated surfaces.
          </p>
          <div className="mt-6">
            <ActionButton label="Sign in to Continue" onClick={onSignIn} variant="primary" />
          </div>
        </section>

      </main>
    </div>
  );
}
