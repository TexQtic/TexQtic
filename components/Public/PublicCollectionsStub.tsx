import React from 'react';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';

interface PublicCollectionsStubProps {
  readonly onBrowseProducts: () => void;
  readonly onExploreB2BNetwork: () => void;
  readonly onSignIn: () => void;
  readonly onListYourProducts: () => void;
  readonly onBackToEntry: () => void;
  readonly nav: PublicNavbarProps;
}

function SectionCard({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  return (
    <article className="rounded-[24px] border border-[#d9e5ea] bg-white p-6 shadow-[0_8px_24px_rgba(7,26,47,0.06)]">
      <h3 className="text-lg font-semibold text-[#0a2036]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
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

export function PublicCollectionsStub({
  onBrowseProducts,
  onExploreB2BNetwork,
  onSignIn,
  onListYourProducts,
  onBackToEntry,
  nav,
}: PublicCollectionsStubProps) {
  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      <PublicNavbar {...nav} />

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <section className="rounded-[32px] bg-[#071a2f] px-8 py-10 text-white shadow-[0_18px_50px_rgba(7,26,47,0.12)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
            Verified Textile Collections
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-4xl">
            Verified Textile Collections are being prepared as public-safe curated story and showcase previews.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
            TexQtic is preparing collection concept surfaces that can frame eligible products, supplier context, and public-safe textile storytelling without implying full runtime collection behavior.
          </p>
          <p className="mt-3 text-sm text-slate-300">Public-safe showcase now. Authenticated continuation when available.</p>
        </section>

        <section className="mt-6 rounded-[24px] border border-[#d9e5ea] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(7,26,47,0.06)]">
          <p className="text-sm leading-6 text-slate-600">
            This public page is a concept preview of TexQtic's Verified Textile Collections direction. It does not currently implement collection detail runtime, checkout, cart, wishlist, order, or private workflow behavior. Trust, passport, traceability, and origin context remain conditional and may appear only where available.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <SectionCard
            title="Curated story and showcase"
            body="Collections are governed as public-safe story and showcase concepts rather than product-group commerce or launch mechanics."
          />
          <SectionCard
            title="Public-safe trust where available"
            body="Only approved public-safe context can be shown, and passport, trust, or origin references remain conditional rather than universal."
          />
          <SectionCard
            title="Authenticated continuation"
            body="Request access, continue after sign-in, and deeper authenticated follow-up can be added later without exposing private workflow detail here."
          />
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            What Verified Textile Collections will represent
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Public-safe curated collection stories with approved product and supplier context.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Verified Textile Collections may eventually group eligible products, material framing, and supplier context into public-safe showcases. Any trust, passport, or origin language must remain conditional, evidence-gated, and shown only where available.
          </p>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#f9fcfd] px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.04)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            Public attraction and continuity framing
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Public-safe collection framing now. Authenticated continuation later.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            TexQtic uses public attraction to route visitors toward the right journey without exposing private collection records, buyer intent, pricing continuity, or authenticated workflow detail.
          </p>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            Current safe pathways
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Continue through existing public-safe surfaces.
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton label="Back to Home" onClick={onBackToEntry} />
            <ActionButton label="Browse Products" onClick={onBrowseProducts} variant="primary" />
            <ActionButton label="Explore B2B Network" onClick={onExploreB2BNetwork} />
            <ActionButton label="Sign in to Continue" onClick={onSignIn} />
            <ActionButton label="List Your Products" onClick={onListYourProducts} />
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#071a2f] px-8 py-10 text-white shadow-[0_18px_50px_rgba(7,26,47,0.12)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7fd5de]">
            Authenticated handoff
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Prepare the public journey, then continue securely.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Request access, continue after sign-in, early-access direction where available, and deeper workflow continuity remain authenticated TexQtic experiences.
          </p>
        </section>
      </main>
    </div>
  );
}
