import React from 'react';

export interface PublicTrustLandingStubProps {
  readonly onBackToEntry: () => void;
  readonly onBrowseProducts: () => void;
  readonly onExploreB2B: () => void;
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
  eyebrow,
  title,
  body,
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly body: string;
}) {
  return (
    <article className="rounded-[24px] border border-[#d9e5ea] bg-white p-6 shadow-[0_8px_24px_rgba(7,26,47,0.06)]">
      {eyebrow ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#2f8094]">{eyebrow}</p>
      ) : null}
      <h3 className="mt-2 text-lg font-semibold text-[#0a2036]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}

export function PublicTrustLandingStub({
  onBackToEntry,
  onBrowseProducts,
  onExploreB2B,
  onSignIn,
  onRequestAccess,
}: PublicTrustLandingStubProps) {
  const scrollToTrustWorks = () => {
    globalThis.document?.getElementById('trust-how-it-works')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

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
            Trust & Origin Passport
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-5xl">
            Trust and origin behind every textile journey.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200 md:text-base">
            TexQtic connects textile discovery with public-safe trust, origin, traceability,
            and verification context while protecting private business records and authenticated
            workflows.
          </p>
          <p className="mt-3 text-sm text-slate-300">From supplier capability to product confidence.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ActionButton label="Browse Products" onClick={onBrowseProducts} variant="primary" />
            <ActionButton label="Explore B2B Network" onClick={onExploreB2B} />
            <ActionButton label="Learn How Trust Works" onClick={scrollToTrustWorks} />
            <ActionButton label="Sign in to Continue" onClick={onSignIn} />
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-[#d9e5ea] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(7,26,47,0.06)]">
          <p className="text-sm leading-6 text-slate-600">
            A Trust & Origin Passport is a public-safe view of textile context. It can help
            visitors understand product origin, supplier capability, traceability signals,
            certifications, and verification posture where approved for public discovery.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Private documents, internal audits, compliance workflows, and full operational
            records remain protected inside authenticated TexQtic workflows.
          </p>
        </section>

        <section className="mt-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              What can be shown publicly?
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">Public-safe trust signals with clear limits.</h2>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <SectionCard
              eyebrow="Origin context"
              title="Product origin summary"
              body="High-level origin context can describe where a textile product journey starts when approved for public discovery."
            />
            <SectionCard
              eyebrow="Traceability signals"
              title="Traceability evidence"
              body="Visitors can understand whether traceability signals exist without exposing internal supplier records or source files."
            />
            <SectionCard
              eyebrow="Certification summary"
              title="Certification signals"
              body="Public-safe certification summaries can indicate approved trust markers without turning the page into a public document vault."
            />
            <SectionCard
              eyebrow="Verification posture"
              title="Maturity tier"
              body="TexQtic can describe trust posture through public-safe readiness language such as local trust, trade readiness, compliance, and global DPP maturity."
            />
            <SectionCard
              eyebrow="Supplier capability"
              title="Product passport preview"
              body="Individual Trust & Origin Passports can preview context for specific approved textile records without opening deeper operational history."
            />
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#f9fcfd] px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.04)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            What stays protected?
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Private trust workflows remain inside authenticated TexQtic surfaces.
          </h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            <SectionCard
              title="Protected private documents"
              body="Certificate files, audit packs, evidence attachments, and document URLs stay inside authenticated workflows."
            />
            <SectionCard
              title="Protected commercial terms"
              body="Orders, contracts, negotiations, private pricing, and buyer-specific records do not belong on public trust pages."
            />
            <SectionCard
              title="Protected operational workflows"
              body="Compliance review, verification decisions, internal audit state, and supplier operations continue only after authenticated access."
            />
            <SectionCard
              title="Protected identity and tenant data"
              body="Org IDs, tenant IDs, user IDs, internal passport identifiers, and private operational metadata remain out of public view."
            />
          </div>
        </section>

        <section id="trust-how-it-works" className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            How trust connects across TexQtic
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Public context first, authenticated continuation when needed.
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
            TexQtic&apos;s public trust layer connects discovery pages with deeper authenticated
            workflows. Public visitors can understand context; authenticated users can continue
            into verification, sourcing, compliance, and business operations.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <SectionCard
              eyebrow="1"
              title="Discovery"
              body="Public product and supplier pages introduce public-safe trust context."
            />
            <SectionCard
              eyebrow="2"
              title="Trust signals"
              body="Origin, traceability, certification, and verification posture add confidence without oversharing."
            />
            <SectionCard
              eyebrow="3"
              title="Passport access"
              body="Approved passport pages can be opened by direct link or QR code for specific records."
            />
            <SectionCard
              eyebrow="4"
              title="Authenticated continuation"
              body="Deeper trust work continues inside secure TexQtic workflows when the visitor is ready."
            />
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
            How to access a Trust & Origin Passport
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#0a2036]">
            Specific passport records are shared intentionally, not browsed publicly.
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
            TexQtic Trust & Origin Passports are published for specific textile products or
            records when approved for public discovery. They are typically accessed through a
            direct link or QR code, not through a public list.
          </p>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#071a2f] px-8 py-10 text-white shadow-[0_18px_50px_rgba(7,26,47,0.12)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7fd5de]">
            Need deeper verification?
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Continue securely into protected trust workflows.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Sign in to access authenticated trust workflows, supplier verification, compliance
            records, private documents, and deeper product or origin records where available.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton label="Sign in to Continue" onClick={onSignIn} variant="primary" />
            <ActionButton label="List Your Business" onClick={onRequestAccess} />
          </div>
        </section>

        <footer className="mt-8 rounded-[24px] border border-[#d9e5ea] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(7,26,47,0.06)]">
          <p className="text-sm leading-6 text-slate-600">
            TexQtic public pages attract and route. Authenticated surfaces own private DPP
            records, compliance documents, audits, certification files, verification workflows,
            supplier verification, buyer-specific trust records, operational evidence, and
            business continuity.
          </p>
        </footer>
      </main>
    </div>
  );
}