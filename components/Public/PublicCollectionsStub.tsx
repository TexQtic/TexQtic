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
            Verified Textile Collections are coming soon.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
            TexQtic is preparing public-safe collection experiences that connect textile capability with consumer demand.
          </p>
          <p className="mt-3 text-sm text-slate-300">Where textile capability becomes consumer commerce.</p>
        </section>

        <section className="mt-6 rounded-[24px] border border-[#d9e5ea] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(7,26,47,0.06)]">
          <p className="text-sm leading-6 text-slate-600">
            This public page is a preview of TexQtic's Verified Textile Collections direction. Collection saving, checkout, early access, private pricing, documents, and deeper buyer workflows will remain available only through authenticated TexQtic experiences.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <SectionCard
            title="Textile capability"
            body="Collections begin with real textile manufacturing, sourcing, and product readiness."
          />
          <SectionCard
            title="Public-safe trust"
            body="Only approved discovery information will be shown publicly."
          />
          <SectionCard
            title="Authenticated continuation"
            body="Saving, checkout, inquiry, early access, and deeper workflows continue after sign-in."
          />
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            What Verified Textile Collections will represent
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Market-ready textile collections with public-safe context.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Verified Textile Collections will help public visitors discover market-ready textile collections built from verified ecosystem capability - including product context, supplier or source context, and trust signals where available.
          </p>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#f9fcfd] px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.04)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            Textile capability to consumer commerce bridge
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Public attraction now. Authenticated continuation when ready.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            TexQtic uses public attraction to route visitors toward the right journey without exposing private collection, pricing, campaign, or early-access detail.
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
            Saving, checkout, inquiry, early access, private pricing, and deeper buyer workflows remain authenticated TexQtic experiences.
          </p>
        </section>
      </main>
    </div>
  );
}
