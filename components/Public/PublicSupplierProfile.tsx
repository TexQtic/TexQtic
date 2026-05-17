import React, { useEffect, useState } from 'react';
import {
  getPublicSupplierBySlug,
  submitPublicInquiry,
  type PublicB2BSupplierProfile as SupplierProfile,
  type PublicInquiryCategory,
} from '../../services/publicB2BService';

// ROUTE-001 / GAP-ACQ-001
// Public supplier profile page — unauthenticated, read-only.
// PROHIBITED: contact reveal, phone/email, QR code UI, order actions.
// INQUIRY-004: minimal pre-auth inquiry form added (no PII collection, no contact reveal).

interface PublicSupplierProfileProps {
  readonly slug: string;
  readonly source?: string;  // QR-SOURCE-002: optional source attribution param forwarded to backend
  readonly onBack: () => void;
  readonly onSignIn: () => void;
  readonly onRequestAccess?: () => void;
}

export function PublicSupplierProfile({ slug, source, onBack, onSignIn, onRequestAccess }: PublicSupplierProfileProps) {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // INQUIRY-004: pre-auth inquiry form state
  type InquiryStatus = 'idle' | 'submitting' | 'success' | 'error';
  const [inquiryCategory, setInquiryCategory] = useState<PublicInquiryCategory | ''>('');
  const [geoBand, setGeoBand] = useState('');
  const [volumeBand, setVolumeBand] = useState('');
  const [inquiryStatus, setInquiryStatus] = useState<InquiryStatus>('idle');

  async function handleInquirySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inquiryCategory) return;
    setInquiryStatus('submitting');
    try {
      await submitPublicInquiry({
        supplier_slug: slug,
        inquiry_category: inquiryCategory,
        ...(geoBand.trim() ? { geo_band: geoBand.trim() } : {}),
        ...(volumeBand.trim() ? { volume_band: volumeBand.trim() } : {}),
      });
      setInquiryStatus('success');
    } catch {
      setInquiryStatus('error');
    }
  }

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getPublicSupplierBySlug(slug, source)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const status =
            typeof err === 'object' && err !== null && 'status' in err
              ? (err as { status?: number }).status
              : undefined;
          setNotFound(status === 404);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const trustNotice = 'This public profile shows only information approved for public discovery. Connection, negotiation, pricing, documents, orders, and deeper business intelligence are available only through authenticated TexQtic workflows.';

  const toPublicDiscoveryStatus = (eligibilityPosture: string, publicationPosture: string) => {
    if (eligibilityPosture === 'PUBLICATION_ELIGIBLE' && (publicationPosture === 'B2B_PUBLIC' || publicationPosture === 'BOTH')) {
      return 'Discoverable on TexQtic';
    }
    return 'Public-safe profile';
  };

  const toVisibilityLabel = (publicationPosture: string) => {
    if (publicationPosture === 'BOTH') {
      return 'Public B2B and B2C visibility';
    }
    if (publicationPosture === 'B2B_PUBLIC') {
      return 'Public B2B visibility';
    }
    return 'Public-safe visibility';
  };

  const toProfileSummary = (currentProfile: SupplierProfile) => {
    if (currentProfile.taxonomy?.primarySegment) {
      return `A quick view of this participant's public role in the textile ecosystem. ${currentProfile.legalName} is currently discoverable through ${currentProfile.taxonomy.primarySegment.toLowerCase()} capability context.`;
    }
    return 'A quick view of this participant\'s public role in the textile ecosystem.';
  };

  const valueChainStages = [
    'Yarn',
    'Fabric',
    'Garments',
    'Wholesale',
    'Retail',
    'D2C',
  ];

  const stageKeywords: Record<string, string[]> = {
    Yarn: ['yarn', 'fiber', 'fibre'],
    Fabric: ['fabric', 'weaving', 'knitting', 'dyeing', 'finishing', 'processing'],
    Garments: ['garment', 'apparel', 'cut and sew', 'stitching'],
    Wholesale: ['wholesale', 'distribution', 'bulk'],
    Retail: ['retail', 'storefront', 'consumer'],
    D2C: ['d2c', 'direct-to-consumer', 'verified drop'],
  };

  const deriveStageSignals = (currentProfile: SupplierProfile) => {
    const source = [
      currentProfile.orgType,
      currentProfile.taxonomy?.primarySegment ?? '',
      ...(currentProfile.taxonomy?.secondarySegments ?? []),
      ...(currentProfile.taxonomy?.rolePositions ?? []),
      ...currentProfile.offeringPreview.map((item) => item.name),
    ]
      .join(' ')
      .toLowerCase();

    return valueChainStages.filter((stage) => {
      return stageKeywords[stage].some((keyword) => source.includes(keyword));
    });
  };

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

      {/* Loading state */}
      {loading && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f8094]" />
        </div>
      )}

      {/* Not found state */}
      {!loading && notFound && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <h2 className="mt-3 text-2xl font-semibold text-[#071a2f]">
            This supplier profile is not available.
          </h2>
          <p className="mt-3 max-w-md text-sm text-slate-500">
            The business may not have a public TexQtic profile, or its visibility may be limited to authenticated workflows.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
            >
              Back to B2B Discovery
            </button>
            {onRequestAccess && (
              <button
                type="button"
                onClick={onRequestAccess}
                className="inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
              >
                List Your Business
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error state (loaded but no profile and not 404) */}
      {!loading && !notFound && !profile && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Unable to load profile
          </p>
          <h2 className="mt-3 text-xl font-semibold text-[#071a2f]">
            Please try again shortly.
          </h2>
          <button
            type="button"
            onClick={onBack}
            className="mt-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
          >
            Back
          </button>
        </div>
      )}

      {/* Profile content */}
      {!loading && profile && (
        <>
          {/* Hero */}
          <div className="bg-[#071a2f] px-6 py-12">
            <div className="mx-auto max-w-5xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
                Public Textile Profile
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-4xl">
                {profile.legalName}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">
                Explore public-safe business information, capability signals, and trust context for this TexQtic ecosystem participant.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  {profile.orgType}
                </span>
                {profile.jurisdiction && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-200">
                    {profile.jurisdiction}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-200">
                  {toPublicDiscoveryStatus(profile.eligibilityPosture, profile.publicationPosture)}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#071a2f] transition hover:bg-slate-100"
                >
                  Sign in to Connect
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-white/10"
                >
                  Back to B2B Discovery
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <main className="mx-auto max-w-5xl px-6 py-10">
            <section className="rounded-2xl border border-[#d9e5ea] bg-white p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                Public trust notice
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {trustNotice}
              </p>
            </section>

            <section className="mt-6 rounded-2xl border border-[#d9e5ea] bg-white p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                Business snapshot
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {toProfileSummary(profile)}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <article className="rounded-xl border border-[#e1eaee] bg-[#fbfdfe] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Business Type</p>
                  <p className="mt-2 text-sm font-semibold text-[#071a2f]">{profile.orgType}</p>
                </article>
                <article className="rounded-xl border border-[#e1eaee] bg-[#fbfdfe] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Textile Segment</p>
                  <p className="mt-2 text-sm font-semibold text-[#071a2f]">
                    {profile.taxonomy?.primarySegment ?? 'Public textile ecosystem participant'}
                  </p>
                </article>
                <article className="rounded-xl border border-[#e1eaee] bg-[#fbfdfe] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Primary Role</p>
                  <p className="mt-2 text-sm font-semibold text-[#071a2f]">
                    {profile.taxonomy?.rolePositions?.[0] ?? 'Profile role available after sign-in context'}
                  </p>
                </article>
                <article className="rounded-xl border border-[#e1eaee] bg-[#fbfdfe] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Market / Jurisdiction</p>
                  <p className="mt-2 text-sm font-semibold text-[#071a2f]">{profile.jurisdiction || 'Public market context available'}</p>
                </article>
                <article className="rounded-xl border border-[#e1eaee] bg-[#fbfdfe] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Public Discovery Status</p>
                  <p className="mt-2 text-sm font-semibold text-[#071a2f]">
                    {toPublicDiscoveryStatus(profile.eligibilityPosture, profile.publicationPosture)}
                  </p>
                </article>
                <article className="rounded-xl border border-[#e1eaee] bg-[#fbfdfe] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Visibility</p>
                  <p className="mt-2 text-sm font-semibold text-[#071a2f]">
                    {toVisibilityLabel(profile.publicationPosture)}
                  </p>
                </article>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-[#d9e5ea] bg-white p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                Capability highlights
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                These public capability signals help visitors understand where this business fits across textile sourcing, supply, service, or commerce pathways.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {profile.taxonomy?.primarySegment && (
                  <span className="rounded-full border border-[#d6e4e8] bg-[#f5fafb] px-3 py-1 text-xs font-medium text-[#2f8094]">
                    {profile.taxonomy.primarySegment}
                  </span>
                )}
                {profile.taxonomy?.rolePositions.slice(0, 4).map((role) => (
                  <span key={role} className="rounded-full border border-[#d6e4e8] bg-[#f5fafb] px-3 py-1 text-xs font-medium text-[#2f8094]">
                    {role}
                  </span>
                ))}
                {profile.certificationCount > 0 && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Certification signals available
                  </span>
                )}
                {profile.hasTraceabilityEvidence && (
                  <span className="rounded-full border border-[#d6e4e8] bg-[#eef7fa] px-3 py-1 text-xs font-medium text-[#2f8094]">
                    Traceability evidence available
                  </span>
                )}
                {profile.offeringPreview.length > 0 && (
                  <span className="rounded-full border border-[#d6e4e8] bg-[#eef7fa] px-3 py-1 text-xs font-medium text-[#2f8094]">
                    Public offering preview
                  </span>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-[#d9e5ea] bg-[#f9fcfd] p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                Textile value-chain position
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                TexQtic connects the textile value chain from manufacturing to wholesale, semi-wholesale, retail, and verified direct-to-consumer launches.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {valueChainStages.map((stage) => {
                  const activeStages = deriveStageSignals(profile);
                  const isActive = activeStages.includes(stage);
                  return (
                    <span
                      key={stage}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${isActive ? 'border-[#2f8094] bg-[#e8f5f8] text-[#0b2238]' : 'border-[#d6e4e8] bg-white text-slate-500'}`}
                    >
                      {stage}
                    </span>
                  );
                })}
              </div>
            </section>

            <section className="mt-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                Public profile details
              </h2>

            <div className="grid gap-6 md:grid-cols-2">

              {/* Taxonomy */}
              {profile.taxonomy && (
                <section className="rounded-2xl border border-[#d6e4e8] bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                    Segment &amp; Role
                  </h2>
                  {profile.taxonomy.primarySegment && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Primary segment
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#071a2f]">
                        {profile.taxonomy.primarySegment}
                      </p>
                    </div>
                  )}
                  {profile.taxonomy.secondarySegments.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Secondary segments
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {profile.taxonomy.secondarySegments.map((seg) => (
                          <span
                            key={seg}
                            className="rounded-full border border-[#d6e4e8] px-3 py-1 text-xs text-slate-600"
                          >
                            {seg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.taxonomy.rolePositions.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Role positions
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {profile.taxonomy.rolePositions.map((role) => (
                          <span
                            key={role}
                            className="rounded-full border border-[#d6e4e8] px-3 py-1 text-xs text-slate-600"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Certifications + traceability */}
              <section className="rounded-2xl border border-[#d6e4e8] bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                  Trust signals
                </h2>
                <div className="mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Certifications
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#071a2f]">
                    {profile.certificationCount === 0
                      ? 'None on record'
                      : `${profile.certificationCount} verified`}
                  </p>
                  {profile.certificationTypes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.certificationTypes.map((ct) => (
                        <span
                          key={ct}
                          className="rounded-full border border-[#d6e4e8] px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {ct}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Traceability evidence
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#071a2f]">
                    {profile.hasTraceabilityEvidence ? 'Available' : 'Not published'}
                  </p>
                </div>
              </section>
            </div>
            </section>

            <section className="mt-6 rounded-2xl border border-[#d9e5ea] bg-white p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                TexQtic discovery context
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This profile is part of TexQtic public discovery. The page intentionally shows approved public-safe business context only.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#e1eaee] bg-[#fbfdfe] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Profile slug</p>
                  <p className="mt-2 text-sm font-medium text-[#071a2f]">{profile.slug}</p>
                </div>
                <div className="rounded-xl border border-[#e1eaee] bg-[#fbfdfe] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Discovery posture</p>
                  <p className="mt-2 text-sm font-medium text-[#071a2f]">
                    {toPublicDiscoveryStatus(profile.eligibilityPosture, profile.publicationPosture)}
                  </p>
                </div>
              </div>
            </section>

            {/* Offering preview */}
            {profile.offeringPreview.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                  Offering preview
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {profile.offeringPreview.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-2xl border border-[#d6e4e8] bg-white p-4 shadow-sm"
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="mb-3 h-36 w-full rounded-xl object-cover"
                          loading="lazy"
                        />
                      )}
                      <p className="text-sm font-semibold text-[#071a2f]">{item.name}</p>
                      {item.moq != null && item.moq > 0 && (
                        <p className="mt-1 text-xs text-slate-500">MOQ: {item.moq}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* INQUIRY-004: Pre-auth inquiry form (public-safe intent capture) */}
            <section
              className="mt-6 rounded-2xl border border-[#d6e4e8] bg-white p-6 shadow-sm"
              aria-label="Send an inquiry"
            >
              <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                Send an inquiry
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                This captures high-level public interest only. Pricing, negotiation, and transactional workflows remain authenticated.
              </p>

              {inquiryStatus === 'success' ? (
                <p className="rounded-xl bg-[#effaf5] px-4 py-3 text-sm font-medium text-[#1a7a4a]" role="status">
                  Your inquiry has been received.
                </p>
              ) : (
                <form onSubmit={handleInquirySubmit} noValidate>
                  <div className="mb-3">
                    <label htmlFor="inquiry-category" className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Inquiry type <span aria-hidden="true">*</span>
                    </label>
                    <select
                      id="inquiry-category"
                      value={inquiryCategory}
                      onChange={(e) => setInquiryCategory(e.target.value as PublicInquiryCategory | '')}
                      required
                      disabled={inquiryStatus === 'submitting'}
                      className="w-full rounded-xl border border-[#d6e4e8] px-3 py-2 text-sm text-[#071a2f] focus:outline-none focus:ring-2 focus:ring-[#2f8094] disabled:opacity-60"
                    >
                      <option value="">Select a type…</option>
                      <option value="GENERAL">General inquiry</option>
                      <option value="CAPABILITY_FIT">Capability fit</option>
                      <option value="OFFERING_PREVIEW">Offering preview</option>
                      <option value="SOURCING_INTENT">Sourcing intent</option>
                      <option value="QUALIFICATION_CHECK">Qualification check</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="inquiry-geo" className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Geography (optional)
                    </label>
                    <input
                      id="inquiry-geo"
                      type="text"
                      value={geoBand}
                      onChange={(e) => setGeoBand(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. South Asia, EU"
                      disabled={inquiryStatus === 'submitting'}
                      className="w-full rounded-xl border border-[#d6e4e8] px-3 py-2 text-sm text-[#071a2f] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2f8094] disabled:opacity-60"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="inquiry-volume" className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Volume range (optional)
                    </label>
                    <input
                      id="inquiry-volume"
                      type="text"
                      value={volumeBand}
                      onChange={(e) => setVolumeBand(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. 500–1 000 units/month"
                      disabled={inquiryStatus === 'submitting'}
                      className="w-full rounded-xl border border-[#d6e4e8] px-3 py-2 text-sm text-[#071a2f] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2f8094] disabled:opacity-60"
                    />
                  </div>

                  {inquiryStatus === 'error' && (
                    <p className="mb-3 rounded-xl bg-[#fff0f0] px-4 py-3 text-sm font-medium text-[#b91c1c]" role="alert">
                      Unable to submit inquiry. Please try again.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!inquiryCategory || inquiryStatus === 'submitting'}
                    className="inline-flex items-center justify-center rounded-full bg-[#2f8094] px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#256b7c] disabled:opacity-50"
                  >
                    {inquiryStatus === 'submitting' ? 'Sending…' : 'Send inquiry'}
                  </button>
                </form>
              )}
            </section>

            {/* Authenticated handoff panel */}
            <div className="mt-10 rounded-2xl border border-[#d6e4e8] bg-white p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-[#071a2f]">
                Want to connect with this business?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Sign in to TexQtic to request a connection, continue sourcing workflows, or access authenticated business tools where available.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-7 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                >
                  Sign in to Connect
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-7 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
                >
                  Back to B2B Discovery
                </button>
                {onRequestAccess && (
                  <button
                    type="button"
                    onClick={onRequestAccess}
                    className="inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-7 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
                  >
                    List Your Business
                  </button>
                )}
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
