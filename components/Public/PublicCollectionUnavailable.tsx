import React from 'react';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';

interface PublicCollectionUnavailableProps {
  readonly collectionSlug?: string;
  readonly onBackToCollections: () => void;
  readonly onBrowseProducts: () => void;
  readonly onSignIn: () => void;
  readonly onExploreB2BNetwork?: () => void;
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

export function PublicCollectionUnavailable({
  collectionSlug,
  onBackToCollections,
  onBrowseProducts,
  onSignIn,
  onExploreB2BNetwork,
  nav,
}: PublicCollectionUnavailableProps) {
  const hasCollectionSlug = Boolean(collectionSlug?.trim());

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      <PublicNavbar {...nav} />
      <div className="px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-12 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
          Verified Collection Preview
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-[#0a2036]">
          This Verified Collection Preview is not available.
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          The collection may not be published for public discovery, or its details may be available only through authenticated TexQtic workflows.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ActionButton label="Back to Collections" onClick={onBackToCollections} variant="primary" />
          <ActionButton label="Browse Products" onClick={onBrowseProducts} />
          <ActionButton label="Sign in to Continue" onClick={onSignIn} />
          {onExploreB2BNetwork && hasCollectionSlug ? (
            <ActionButton label="Explore B2B Network" onClick={onExploreB2BNetwork} />
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
}
