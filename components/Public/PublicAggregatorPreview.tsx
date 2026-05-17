import React from 'react';

export interface PublicAggregatorPreviewProps {
  readonly onBackToEntry: () => void;
  readonly onSignIn: () => void;
  readonly onExploreB2B: () => void;
  readonly onBrowseProducts: () => void;
  readonly onLearnAboutTrust: () => void;
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

export function PublicAggregatorPreview({
  onBackToEntry,
  onSignIn,
  onExploreB2B,
  onBrowseProducts,
  onLearnAboutTrust,
  onRequestAccess,
}: PublicAggregatorPreviewProps) {
  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
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
          <div className="hidden text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] sm:block">
            TexQtic Aggregator Preview
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        <section className="rounded-[28px] border border-[#d9e5ea] bg-white p-8 shadow-[0_10px_30px_rgba(7,26,47,0.08)] md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#2f8094]">TexQtic Aggregator Preview</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-[#0a2036] md:text-5xl">
            Connect the textile value chain with intelligence and trust.
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-slate-600 md:text-lg">
            TexQtic&apos;s Aggregator brings together supplier discovery, product context, trust signals, sourcing
            intent, and authenticated workflows to help textile businesses find better opportunities.
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Public preview only. Deeper intelligence is available to authenticated TexQtic participants.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ActionButton label="Sign in to Continue" onClick={onSignIn} variant="primary" />
            <ActionButton label="Explore B2B Network" onClick={onExploreB2B} />
            <ActionButton label="Browse Products" onClick={onBrowseProducts} />
            <ActionButton label="Learn About Trust & Origin" onClick={onLearnAboutTrust} />
            <ActionButton label="List Your Business" onClick={onRequestAccess} />
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="aggregator-connect-heading">
          <h2 id="aggregator-connect-heading" className="text-2xl font-bold text-[#0a2036]">
            What the TexQtic Aggregator helps connect
          </h2>
          <p className="max-w-5xl text-sm leading-7 text-slate-600">
            The Aggregator is designed to help textile ecosystem participants move from fragmented discovery to
            structured opportunity matching across suppliers, buyers, products, services, trust signals, and
            sourcing needs.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SectionCard
              title="Suppliers and manufacturers"
              body="Structured supplier discovery across capability, role, jurisdiction, and trust context where published."
            />
            <SectionCard
              title="Buyers and sourcing teams"
              body="Intent-aware pathways that help sourcing teams evaluate fit, timing, and qualification readiness."
            />
            <SectionCard
              title="Product context and trust signals"
              body="Product narratives and trust references linked to provenance and verification context where available."
            />
            <SectionCard
              title="Textile clusters and market context"
              body="Category and ecosystem context to support clearer discovery outcomes across textile value-chain roles."
            />
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="previewed-publicly-heading">
          <h2 id="previewed-publicly-heading" className="text-2xl font-bold text-[#0a2036]">
            What can be previewed publicly?
          </h2>
          <p className="max-w-5xl text-sm leading-7 text-slate-600">
            Public pages explain the Aggregator model and show approved discovery context. Matching, scoring,
            recommendations, and workflow actions are inside authenticated TexQtic experiences.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SectionCard
              title="Public supplier discovery"
              body="Explore textile ecosystem participants through public-safe B2B supplier discovery."
            />
            <SectionCard
              title="Product context and trust signals"
              body="Browse product context and trust-linked details where public-safe data is published."
            />
            <SectionCard
              title="Trust and passport explanation"
              body="Learn how trust and origin narratives work, including passport context where available."
            />
            <SectionCard
              title="Aggregator concept and pathway explanation"
              body="Understand how TexQtic routes discovery toward authenticated intelligence and operational workflows."
            />
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="stays-private-heading">
          <h2 id="stays-private-heading" className="text-2xl font-bold text-[#0a2036]">
            What stays private?
          </h2>
          <p className="max-w-5xl text-sm leading-7 text-slate-600">
            Private matching, scoring, recommendations, buyer intent, supplier intelligence, pricing, negotiations,
            and workflow actions remain inside authenticated TexQtic experiences.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SectionCard
              title="Matching and scoring"
              body="Model-assisted matching logic and scoring signals remain private in authenticated workflows."
            />
            <SectionCard
              title="Buyer intent and sourcing workflows"
              body="Sourcing intent, qualification workflows, and RFQ continuity are accessible only after sign in."
            />
            <SectionCard
              title="Supplier intelligence and ranking"
              body="Supplier scoring, ranking, and business intelligence outputs are not shown publicly."
            />
            <SectionCard
              title="Negotiation, pricing, and commercial terms"
              body="Commercial negotiations, pricing detail, and contract-level terms remain authenticated and private."
            />
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="example-pathways-heading">
          <h2 id="example-pathways-heading" className="text-2xl font-bold text-[#0a2036]">
            Example pathways / use cases
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SectionCard
              title="Buyer sourcing certified organic cotton"
              body="A buyer is sourcing certified organic cotton. TexQtic&apos;s Aggregator helps structure discovery around supplier profiles, trust signals, and DPP context where published."
            />
            <SectionCard
              title="Exporter seeking qualified buyer visibility"
              body="A textile exporter wants visibility with qualified buyers. TexQtic&apos;s Aggregator routes discovery through verified trust context rather than raw contact listings."
            />
            <SectionCard
              title="Sourcing team qualifying suppliers before RFQ"
              body="A sourcing team needs to qualify suppliers before RFQ. TexQtic&apos;s Aggregator supports structured discovery with jurisdiction, role, category, and trust context."
            />
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="public-discovery-link-heading">
          <h2 id="public-discovery-link-heading" className="text-2xl font-bold text-[#0a2036]">
            How Aggregator connects with public discovery
          </h2>
          <p className="max-w-5xl text-sm leading-7 text-slate-600">
            Public TexQtic surfaces support attraction and discovery. Deeper Aggregator intelligence and operational
            actions continue inside authenticated platform experiences.
          </p>
          <div className="flex flex-wrap gap-3">
            <ActionButton label="Explore B2B Network" onClick={onExploreB2B} />
            <ActionButton label="Browse Products" onClick={onBrowseProducts} />
            <ActionButton label="Learn About Trust & Origin" onClick={onLearnAboutTrust} />
          </div>
        </section>

        <section className="rounded-[28px] border border-[#d9e5ea] bg-white p-8 shadow-[0_10px_30px_rgba(7,26,47,0.08)] md:p-10" aria-labelledby="auth-handoff-heading">
          <h2 id="auth-handoff-heading" className="text-2xl font-bold text-[#0a2036]">
            Want to use Aggregator intelligence?
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
            Sign in to access authenticated sourcing workflows, supplier discovery, opportunity matching, business
            tools, and deeper platform intelligence where available.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton label="Sign in to Continue" onClick={onSignIn} variant="primary" />
            <ActionButton label="Explore B2B Network" onClick={onExploreB2B} />
            <ActionButton label="Browse Products" onClick={onBrowseProducts} />
            <ActionButton label="Learn About Trust & Origin" onClick={onLearnAboutTrust} />
            <ActionButton label="List Your Business" onClick={onRequestAccess} />
          </div>
        </section>
      </main>
    </div>
  );
}
