/**
 * Public Collection Detail — Static Config-Backed Projection
 *
 * Authority:  PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001
 *             PUBLIC-COLLECTION-DETAIL-PROJECTION-IMPLEMENTATION-001
 *             D2C-ORIGIN-STORYTELLING-GOVERNANCE-001
 *             D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001
 *             D2C-COLLECTION-SEO-GOVERNANCE-001
 *             DPP-TRUST-LINKING-RULES-001
 *
 * Purpose:
 *   Renders the public-safe detail projection for an approved static/config-backed
 *   collection slug at /collections/:slug.
 *
 * Governance constraints:
 *   - This component MUST only be rendered when the slug is approved and AVAILABLE.
 *     Unknown or unsupported slugs must be routed to PublicCollectionUnavailable.
 *   - No checkout, cart, wishlist, order, RFQ, or buyer-intent behavior.
 *   - No collection-owned passport or DPP fields.
 *   - No universal trust/certification/origin/traceability claims.
 *   - No product passport status inheritance to collection level.
 *   - Trust context is fail-closed (collectionHasTrustContext: false in this phase).
 *   - No private IDs, org IDs, tenant IDs, or internal linkage IDs.
 *   - storyBody is public-safe editorial copy; no private metadata embedded.
 *   - CTA intent is COLLECTION_DETAIL_CONTINUATION (non-transactional).
 */

import React from 'react';
import { type PublicCollectionProjection } from '../../config/publicCollectionsProjection';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';
import {
  LIVE_COLLECTIONS_REPLACE_COPY,
  SAMPLE_COLLECTION_LABEL,
  ReferencePreviewBadge,
  ReferencePreviewNotice,
} from './ReferencePreviewNotice';

interface PublicCollectionDetailProps {
  readonly collection: PublicCollectionProjection;
  readonly onBackToCollections: () => void;
  readonly onBrowseProducts: () => void;
  readonly onSignIn: () => void;
  readonly onExploreB2BNetwork: () => void;
  readonly onListYourProducts: () => void;
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

export function PublicCollectionDetail({
  collection,
  onBackToCollections,
  onBrowseProducts,
  onSignIn,
  onExploreB2BNetwork,
  onListYourProducts,
  nav,
}: PublicCollectionDetailProps) {
  const allTags = [
    ...collection.segmentTags,
    ...collection.categoryTags,
    ...collection.materialTags,
  ];

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      <PublicNavbar {...nav} />

      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-10">

        {/* Back navigation */}
        <nav aria-label="Collection navigation" className="mb-6">
          <ActionButton
            label="← Back to Collections"
            onClick={onBackToCollections}
          />
        </nav>

        {/* Hero */}
        <section
          className="rounded-[32px] bg-[#071a2f] px-8 py-10 text-white shadow-[0_18px_50px_rgba(7,26,47,0.12)]"
          aria-label={collection.title}
        >
          {/* Hero visual placeholder — no public image hosting in this phase */}
          <div
            className="mb-6 flex h-44 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#0d2743] to-[#163d59]"
            role="img"
            aria-label={collection.heroAlt}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7fd5de] opacity-70">
              {collection.curatedContextLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ReferencePreviewBadge label={SAMPLE_COLLECTION_LABEL} tone="dark" />
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
              {collection.curatedContextLabel}
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-4xl">
            {collection.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
            {collection.summary}
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Reference content for launch preview only.
          </p>
        </section>

        <div className="mt-6">
          <ReferencePreviewNotice
            label={SAMPLE_COLLECTION_LABEL}
            replacementCopy={LIVE_COLLECTIONS_REPLACE_COPY}
          />
        </div>

        {/* Boundary disclosure */}
        <section className="mt-6 rounded-[24px] border border-[#d9e5ea] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(7,26,47,0.06)]">
          <p className="text-sm leading-6 text-slate-600">
            This is a public-safe collection concept showcase. It does not implement collection
            detail runtime, checkout, cart, wishlist, order, or private workflow behavior. Trust,
            passport, traceability, and origin context remain conditional and appear only where
            available at the individual product level — not as a collection-wide claim. No private
            supplier records, buyer data, or commercial terms are exposed here.
          </p>
        </section>

        {/* Story body */}
        <section
          className="mt-8 rounded-[24px] border border-[#d9e5ea] bg-white px-8 py-8 shadow-[0_8px_24px_rgba(7,26,47,0.06)]"
          aria-label="Collection story"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            Collection context
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {collection.storyBody}
          </p>
        </section>

        {/* Taxonomy tags */}
        {allTags.length > 0 && (
          <section
            className="mt-6 rounded-[24px] border border-[#d9e5ea] bg-white px-8 py-6 shadow-[0_8px_24px_rgba(7,26,47,0.06)]"
            aria-label="Collection taxonomy"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Textile context
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <TagPill key={tag} label={tag} />
              ))}
            </div>
          </section>
        )}

        {/* Trust context — fail-closed in this phase */}
        <section
          className="mt-6 rounded-[24px] border border-[#d9e5ea] bg-white px-8 py-6 shadow-[0_8px_24px_rgba(7,26,47,0.06)]"
          aria-label="Trust context"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            Trust &amp; origin context
          </p>
          {collection.trustContextMode === 'CONDITIONAL_PRODUCT_CONTEXT_ONLY' && (
            <>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Eligible products may include public trust context where available.
              </p>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                Trust, passport, and traceability signals are product-scoped. They do not represent
                collection-level certification, collection-owned passport status, or a universal
                claim about all products within this collection theme.
              </p>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                No collection-level passport or verification token is currently available for this
                collection. Unavailable trust context is not an error or gap — it reflects the
                conditional, product-scoped nature of public trust signals on this platform.
              </p>
            </>
          )}
        </section>

        {/* Authenticated continuation CTA */}
        <section
          className="mt-8 rounded-[32px] bg-[#071a2f] px-8 py-10 text-white shadow-[0_18px_50px_rgba(7,26,47,0.12)]"
          aria-label="Authenticated continuation"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
            Authenticated continuation
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-snug">
            Continue this collection context after sign in.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            Deeper authenticated workflows — sourcing, inquiries, business tools, and private
            collection continuity — remain in TexQtic&apos;s authenticated surfaces. This public
            surface does not connect to checkout, cart, or order behavior.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center justify-center rounded-full bg-[#7fd5de] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#071a2f] transition hover:bg-[#a4e0e8]"
            >
              {collection.cta.label}
            </button>

          </div>
        </section>

        {/* Navigation pathways */}
        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            Continue exploring
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Other public-safe surfaces.
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton
              label="Back to Collections"
              onClick={onBackToCollections}
              variant="primary"
            />
            <ActionButton label="Browse Products" onClick={onBrowseProducts} />
            <ActionButton label="Explore B2B Network" onClick={onExploreB2BNetwork} />
            <ActionButton label="Sign in to Continue" onClick={onSignIn} />
            <ActionButton label="List Your Products" onClick={onListYourProducts} />
          </div>
        </section>

      </main>
    </div>
  );
}
