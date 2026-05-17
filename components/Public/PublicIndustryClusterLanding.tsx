import React from 'react';

export interface PublicIndustryClusterLandingProps {
  readonly onBackToEntry: () => void;
  readonly onExploreB2B: () => void;
  readonly onBrowseProducts: () => void;
  readonly onLearnAboutTrust: () => void;
  readonly onPreviewAggregator: () => void;
  readonly onSignIn: () => void;
  readonly onRequestAccess: () => void;
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

function PillCard({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  return (
    <article className="rounded-[28px] border border-[#dbe6ea] bg-[#fbfdfe] p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#0a2036]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}

const SEGMENT_CARDS = [
  {
    title: 'Yarn & Spinning',
    body: 'Discover supplier roles, categories, and public-safe ecosystem context from material creation onward.',
  },
  {
    title: 'Fabrics',
    body: 'Explore textile product pathways from materials to finished fabric stories where public-safe context is available.',
  },
  {
    title: 'Garments',
    body: 'Continue into authenticated workflows for deeper sourcing, inquiry, and business tools around finished products.',
  },
  {
    title: 'Home Textiles',
    body: 'Use public discovery to understand category context for household textile journeys and related participants.',
  },
  {
    title: 'Technical Textiles',
    body: 'Review broad category and value-chain context for technical textile discovery without exposing private detail.',
  },
  {
    title: 'Textile Services',
    body: 'Find public-safe ecosystem context for testing, consulting, logistics, and other supporting service roles.',
  },
] as const;

const CLUSTER_CARDS = [
  {
    title: 'Textile manufacturing hubs',
    body: 'Public discovery for manufacturing ecosystems where approved context can help visitors understand the segment.',
  },
  {
    title: 'Export-ready supplier networks',
    body: 'Broad public-safe discovery pathways for participants positioned for international sourcing and trade conversations.',
  },
  {
    title: 'Regional sourcing ecosystems',
    body: 'Explore textile ecosystem context by region without adding unsupported city-level factual claims.',
  },
  {
    title: 'MSME textile clusters',
    body: 'Surface small and medium textile ecosystem context through public-safe discovery and authenticated continuation.',
  },
] as const;

const PATHWAY_CARDS = [
  {
    title: 'Explore B2B Network',
    body: 'Move from segment context into supplier discovery and public-safe B2B exploration.',
  },
  {
    title: 'Browse Products',
    body: 'Continue into product discovery across approved categories, materials, and supplier context.',
  },
  {
    title: 'Learn About Trust & Origin',
    body: 'Review public-safe trust, origin, and verification context where available.',
  },
  {
    title: 'Preview Aggregator',
    body: 'Understand the public preview of TexQtic aggregation without exposing private intelligence.',
  },
] as const;

const BOUNDARY_CARDS = [
  {
    title: 'Public discovery',
    body: 'Public pages explain categories, segments, and ecosystem direction without exposing private records.',
  },
  {
    title: 'Authenticated sourcing workflows',
    body: 'Deeper supplier discovery, inquiries, and business tools continue after sign in.',
  },
  {
    title: 'Private commercial intelligence',
    body: 'Scoring, recommendations, pricing, negotiation, and buyer intent remain private.',
  },
  {
    title: 'Trust and origin records where available',
    body: 'Approved trust and passport context can appear where public-safe records exist.',
  },
] as const;

export function PublicIndustryClusterLanding({
  onBackToEntry,
  onExploreB2B,
  onBrowseProducts,
  onLearnAboutTrust,
  onPreviewAggregator,
  onSignIn,
  onRequestAccess,
}: PublicIndustryClusterLandingProps) {
  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans text-slate-900">
      <header className="border-b border-[#d6e4e8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToEntry}
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
          <img src="/brand/texqtic-logo.png" alt="TexQtic" className="h-10 w-auto" loading="eager" />
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
          >
            Sign in
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <section className="rounded-[32px] bg-[#071a2f] px-8 py-10 text-white shadow-[0_18px_50px_rgba(7,26,47,0.12)] md:px-10 md:py-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
            Textile Industry & Cluster Pages
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-5xl">
            Explore textile clusters and industry segments.
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-200 md:text-base">
            TexQtic connects textile discovery across suppliers, products, trust signals, and authenticated workflows — from yarn and fabric to garments, home textiles, services, and consumer-facing commerce.
          </p>
          <p className="mt-3 text-sm text-slate-300">
            Public discovery for textile buyers, suppliers, and ecosystem participants.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ActionButton label="Explore B2B Network" onClick={onExploreB2B} variant="primary" />
            <ActionButton label="Browse Products" onClick={onBrowseProducts} />
            <ActionButton label="Learn About Trust & Origin" onClick={onLearnAboutTrust} />
            <ActionButton label="Preview Aggregator" onClick={onPreviewAggregator} />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="Why textile segments matter"
            body="Textile segments help visitors understand how raw materials, fabrication, product categories, and supporting services connect across the broader ecosystem."
          />
          <SectionCard
            title="About textile clusters"
            body="Clusters provide broad public-safe context for regional and value-chain discovery without turning the page into a live directory or ranking surface."
          />
        </section>

        <section className="mt-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Industry and segment cards
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
              Broad public-safe textile discovery categories.
            </h2>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {SEGMENT_CARDS.map((card) => (
              <PillCard key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Cluster and region cards
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
              Generic cluster context without unsupported factual claims.
            </h2>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {CLUSTER_CARDS.map((card) => (
              <PillCard key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.06)] md:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            How TexQtic helps you continue
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Public discovery routes into existing TexQtic surfaces.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PATHWAY_CARDS.map((card) => (
              <SectionCard key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton label="Explore B2B Network" onClick={onExploreB2B} variant="primary" />
            <ActionButton label="Browse Products" onClick={onBrowseProducts} />
            <ActionButton label="Learn About Trust & Origin" onClick={onLearnAboutTrust} />
            <ActionButton label="Preview Aggregator" onClick={onPreviewAggregator} />
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#f9fcfd] px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.04)] md:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            Trust, origin, and verification context
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Public-safe trust signals with clear limits.
          </h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            <SectionCard
              title="Origin context"
              body="Discover supplier roles, categories, and public-safe ecosystem context without exposing private records."
            />
            <SectionCard
              title="Verification posture"
              body="See where trust and verification context is available without implying universal coverage."
            />
            <SectionCard
              title="Passport context"
              body="Where available, public-safe passport references can help visitors understand a product or record story."
            />
            <SectionCard
              title="Protected private workflow"
              body="Deeper verification, sourcing, and business actions remain in authenticated TexQtic surfaces."
            />
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.06)] md:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            Public vs authenticated boundary
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Public pages attract and route. Authenticated surfaces own private workflows.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {BOUNDARY_CARDS.map((card) => (
              <SectionCard key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#071a2f] px-8 py-10 text-white shadow-[0_18px_50px_rgba(7,26,47,0.12)] md:px-10" aria-labelledby="industry-auth-handoff-heading">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7fd5de]">
            Ready to go deeper?
          </p>
          <h2 id="industry-auth-handoff-heading" className="mt-3 text-2xl font-semibold">
            Sign in to access authenticated supplier discovery, sourcing workflows, inquiries, business tools, and deeper platform intelligence where available.
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton label="Sign in to Continue" onClick={onSignIn} variant="primary" />
            <ActionButton label="List Your Business" onClick={onRequestAccess} />
            <ActionButton label="Explore B2B Network" onClick={onExploreB2B} />
            <ActionButton label="Browse Products" onClick={onBrowseProducts} />
            <ActionButton label="Learn About Trust & Origin" onClick={onLearnAboutTrust} />
          </div>
        </section>
      </main>
    </div>
  );
}