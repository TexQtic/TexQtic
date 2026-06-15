import React, { useEffect, useState } from 'react';
import {
  DEMO_PILOT_SUPPLIER_HELPER_TEXT,
  DEMO_PILOT_SUPPLIER_LABEL,
  getPublicSupplierBySlug,
  isDemoPilotSupplierSlug,
  submitPublicInquiry,
  type PublicB2BSupplierProfile as SupplierProfile,
  type PublicInquiryCategory,
} from '../../services/publicB2BService';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';
import { getPublicReferenceB2BSupplierBySlug } from '../../config/publicReferenceB2B';
import {
  LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY,
  NOT_LIVE_COMMERCIAL_OFFER_COPY,
  REFERENCE_SUPPLIER_PROFILE_LABEL,
  ReferencePreviewNotice,
} from './ReferencePreviewNotice';

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
  readonly nav: PublicNavbarProps;
}

type SnapshotFact = {
  readonly label: string;
  readonly value: string;
};

const COMPANY_SIZE_BAND_LABELS: Record<string, string> = {
  MICRO: 'Micro (small team)',
  SMALL: 'Small',
  MEDIUM: 'Medium',
  LARGE: 'Large',
  ENTERPRISE: 'Enterprise',
  NOT_DISCLOSED: 'Not disclosed',
};

const CAPACITY_BAND_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  VERY_HIGH: 'Very high',
  NOT_DISCLOSED: 'Not disclosed',
};

const toOptionalText = (value?: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const toFallbackBandLabel = (value: string): string => {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const getCompanySizeBandLabel = (value?: string | null): string | null => {
  const normalized = toOptionalText(value);
  if (!normalized) {
    return null;
  }

  const key = normalized.toUpperCase();
  return COMPANY_SIZE_BAND_LABELS[key] ?? toFallbackBandLabel(normalized);
};

const getCapacityBandLabel = (value?: string | null): string | null => {
  const normalized = toOptionalText(value);
  if (!normalized) {
    return null;
  }

  const key = normalized.toUpperCase();
  return CAPACITY_BAND_LABELS[key] ?? toFallbackBandLabel(normalized);
};

const isSnapshotFact = (fact: SnapshotFact | null): fact is SnapshotFact => {
  return fact !== null;
};

export function PublicSupplierProfile({ slug, source, onBack, onSignIn, onRequestAccess, nav }: PublicSupplierProfileProps) {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [notFound, setNotFound] = useState(false);

  // INQUIRY-004: pre-auth inquiry form state
  type InquiryStatus = 'idle' | 'submitting' | 'success' | 'error';
  const [inquiryCategory, setInquiryCategory] = useState<PublicInquiryCategory | ''>('');
  const [geoBand, setGeoBand] = useState('');
  const [volumeBand, setVolumeBand] = useState('');
  const [inquiryStatus, setInquiryStatus] = useState<InquiryStatus>('idle');

  async function handleInquirySubmit(e: React.SyntheticEvent) {
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
      return;
    }
    let cancelled = false;
    const referenceProfile = getPublicReferenceB2BSupplierBySlug(slug);

    void Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setNotFound(false);
        setProfile(null);
      }
    });

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
          if (status === 404 && referenceProfile) {
            setProfile(referenceProfile);
            setNotFound(false);
          } else {
            setNotFound(status === 404);
          }
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, source]);

  const missingSlug = !slug;

  const isReferencePreview =
    typeof profile === 'object' && profile !== null && 'isReferencePreview' in profile && profile.isReferencePreview === true;
  const isDemoPilotSupplier = Boolean(profile && !isReferencePreview && isDemoPilotSupplierSlug(profile.slug));

  const trustNotice = (() => {
    if (isReferencePreview) {
      return 'This reference supplier profile illustrates how TexQtic can present public-safe business context before your business goes live. It is not a live commercial offer and it does not represent a genuine onboarded supplier.';
    }
    if (isDemoPilotSupplier) {
      return DEMO_PILOT_SUPPLIER_HELPER_TEXT;
    }
    return 'This public profile shows only information approved for public discovery. Connection, negotiation, pricing, documents, orders, and deeper business intelligence are available only through authenticated TexQtic workflows.';
  })();

  const heroProfileLabel = (() => {
    if (isReferencePreview) {
      return REFERENCE_SUPPLIER_PROFILE_LABEL;
    }
    if (isDemoPilotSupplier) {
      return DEMO_PILOT_SUPPLIER_LABEL;
    }
    return 'Public Textile Profile';
  })();

  const heroProfileDescription = (() => {
    if (isReferencePreview) {
      return 'Explore a clearly labeled reference supplier example that shows how public-safe business information and capability context can appear before genuine businesses onboard.';
    }
    if (isDemoPilotSupplier) {
      return DEMO_PILOT_SUPPLIER_HELPER_TEXT;
    }
    return 'Explore public-safe business information, capability signals, and trust context for this TexQtic ecosystem participant.';
  })();

  const toPublicDiscoveryStatus = (eligibilityPosture: string, publicationPosture: string) => {
    if (isReferencePreview) {
      return REFERENCE_SUPPLIER_PROFILE_LABEL;
    }
    if (isDemoPilotSupplier) {
      return DEMO_PILOT_SUPPLIER_LABEL;
    }
    if (eligibilityPosture === 'PUBLICATION_ELIGIBLE' && (publicationPosture === 'B2B_PUBLIC' || publicationPosture === 'BOTH')) {
      return 'Discoverable on TexQtic';
    }
    return 'Public-safe profile';
  };

  const toVisibilityLabel = (publicationPosture: string) => {
    if (isReferencePreview) {
      return 'Reference preview visibility';
    }
    if (publicationPosture === 'BOTH') {
      return 'Public B2B and B2C visibility';
    }
    if (publicationPosture === 'B2B_PUBLIC') {
      return 'Public B2B visibility';
    }
    return 'Public-safe visibility';
  };

  const toProfileSummary = (currentProfile: SupplierProfile) => {
    if (isReferencePreview) {
      return 'This reference supplier profile shows how TexQtic can frame capability, category, and textile ecosystem context before a business publishes genuine public discovery data.';
    }
    if (isDemoPilotSupplier) {
      return DEMO_PILOT_SUPPLIER_HELPER_TEXT;
    }
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

  const publicTagline = !isReferencePreview && !isDemoPilotSupplier
    ? toOptionalText(profile?.tagline)
    : null;
  const publicDescription = !isReferencePreview && !isDemoPilotSupplier
    ? toOptionalText(profile?.description)
    : null;
  const primarySegment = toOptionalText(profile?.taxonomy?.primarySegment);
  const primaryRole = toOptionalText(profile?.taxonomy?.rolePositions?.[0]);
  const jurisdictionLabel = toOptionalText(profile?.jurisdiction);
  const orgTypeLabel = toOptionalText(profile?.orgType);
  const companySizeLabel = getCompanySizeBandLabel(profile?.companySizeBand);
  const capacityLabel = getCapacityBandLabel(profile?.capacityBand);
  const activeValueChainStages = profile ? deriveStageSignals(profile) : [];

  const heroCapabilitySummary = (() => {
    if (!profile || isReferencePreview || isDemoPilotSupplier) {
      return null;
    }

    const capability = [primarySegment, primaryRole].filter(Boolean).join(' / ');
    if (capability && jurisdictionLabel) {
      return `${capability} in ${jurisdictionLabel}`;
    }
    return capability || jurisdictionLabel;
  })();

  const businessSnapshotFacts = profile
    ? [
        orgTypeLabel ? { label: 'Business Type', value: orgTypeLabel } : null,
        primarySegment ? { label: 'Textile Segment', value: primarySegment } : null,
        primaryRole ? { label: 'Primary Role', value: primaryRole } : null,
        jurisdictionLabel ? { label: 'Market / Jurisdiction', value: jurisdictionLabel } : null,
        {
          label: 'Public Discovery Status',
          value: toPublicDiscoveryStatus(profile.eligibilityPosture, profile.publicationPosture),
        },
        {
          label: 'Visibility',
          value: toVisibilityLabel(profile.publicationPosture),
        },
        companySizeLabel ? { label: 'Company Size', value: companySizeLabel } : null,
        capacityLabel ? { label: 'Capacity Band', value: capacityLabel } : null,
      ].filter(isSnapshotFact)
    : [];

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      <PublicNavbar {...nav} />

      {/* Loading state */}
      {loading && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f8094]" />
        </div>
      )}

      {/* Not found state */}
      {!loading && (notFound || missingSlug) && (
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
      {!loading && !notFound && !missingSlug && !profile && (
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
      {!loading && !missingSlug && profile && (
        <>
          {/* Hero */}
          <div className="bg-[#071a2f] px-6 py-12">
            <div className="mx-auto max-w-6xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
                {heroProfileLabel}
              </p>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight text-white md:text-5xl">
                {profile.legalName}
              </h1>
              {publicTagline && (
                <p className="mt-3 max-w-3xl text-lg font-medium leading-snug text-[#7fd5de]">
                  {publicTagline}
                </p>
              )}
              {heroCapabilitySummary && (
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {heroCapabilitySummary}
                </p>
              )}
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">
                {heroProfileDescription}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  {profile.orgType}
                </span>
                {jurisdictionLabel && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-200">
                    {jurisdictionLabel}
                  </span>
                )}
                {primarySegment && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-200">
                    {primarySegment}
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
              {isReferencePreview && (
                <div className="mb-6">
                  <ReferencePreviewNotice
                    label={REFERENCE_SUPPLIER_PROFILE_LABEL}
                    replacementCopy={LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY}
                  />
                </div>
              )}
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                Public trust notice
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {trustNotice}
              </p>
              {isReferencePreview && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a5a00]">
                  {NOT_LIVE_COMMERCIAL_OFFER_COPY}
                </p>
              )}
            </section>

            {publicDescription && (
              <section className="mt-6 rounded-2xl border border-[#d9e5ea] bg-white p-6 shadow-sm">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                  About this business
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {publicDescription.slice(0, 1200)}
                </p>
              </section>
            )}

            <section className="mt-6 rounded-2xl border border-[#d9e5ea] bg-white p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                Business snapshot
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {toProfileSummary(profile)}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {businessSnapshotFacts.map((fact) => (
                  <article key={`${fact.label}:${fact.value}`} className="rounded-xl border border-[#e1eaee] bg-[#fbfdfe] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{fact.label}</p>
                    <p className="mt-2 text-sm font-semibold text-[#071a2f]">{fact.value}</p>
                  </article>
                ))}
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
                {profile.taxonomy?.secondarySegments.slice(0, 4).map((segment) => (
                  <span key={segment} className="rounded-full border border-[#d6e4e8] bg-[#f5fafb] px-3 py-1 text-xs font-medium text-[#2f8094]">
                    {segment}
                  </span>
                ))}
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
                  const isActive = activeValueChainStages.includes(stage);
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
                    Segment & Role
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
                <div className="mt-4 rounded-xl border border-[#d6e4e8] bg-[#f7fbfc] p-4">
                  <p className="text-xs leading-6 text-slate-600">
                    TexQtic shows only public-safe trust context here. Deeper verification, documents, and compliance workflows remain available through authenticated TexQtic experiences.
                  </p>
                  <a
                    href="/trust"
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2f8094] transition hover:bg-[#eff6f8]"
                  >
                    Learn about Trust & Origin Passports
                  </a>
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
                <p className="mb-4 max-w-2xl text-sm leading-6 text-slate-600">
                  Public offering previews are shown only from the existing approved discovery projection.
                </p>
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
                        <p className="mt-2 inline-flex rounded-full bg-[#f5fafb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          MOQ {item.moq}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* INQUIRY-004: Pre-auth inquiry form (public-safe intent capture) */}
            {!isReferencePreview && (
            <section
              className="mt-6 rounded-2xl border border-[#d6e4e8] bg-white p-6 shadow-sm"
              aria-label="Send an inquiry"
            >
              <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                Send an inquiry
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                This captures high-level public interest only. Pricing and transactional workflows remain authenticated.
              </p>

              {inquiryStatus === 'success' ? (
                <output className="block rounded-xl bg-[#effaf5] px-4 py-3 text-sm font-medium text-[#1a7a4a]" aria-live="polite">
                  Your inquiry has been received.
                </output>
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
            )}

            {/* Authenticated handoff panel */}
            <div className="mt-10 rounded-2xl border border-[#d6e4e8] bg-white p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-[#071a2f]">
                {isReferencePreview
                  ? 'Want to see how authenticated supplier workflows continue?'
                  : 'Want to connect with this business?'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {isReferencePreview
                  ? 'Sign in to see how authenticated supplier discovery, sourcing, and business workflows continue after this launch-preview experience.'
                  : 'Sign in to TexQtic to request a connection, continue sourcing workflows, or access authenticated business tools where available.'}
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
