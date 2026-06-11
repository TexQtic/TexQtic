import React, { useEffect, useMemo, useState } from 'react';
import {
  DEMO_PILOT_SUPPLIER_HELPER_TEXT,
  DEMO_PILOT_SUPPLIER_LABEL,
  getPublicB2BSuppliers,
  isDemoPilotSupplierSlug,
  type PublicB2BSupplierEntry,
} from '../../services/publicB2BService';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';
import {
  getPublicReferenceB2BSuppliers,
  type PublicReferenceB2BSupplier,
} from '../../config/publicReferenceB2B';
import {
  LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY,
  NOT_LIVE_COMMERCIAL_OFFER_COPY,
  REFERENCE_SUPPLIER_PROFILE_LABEL,
  ReferencePreviewBadge,
  ReferencePreviewNotice,
} from './ReferencePreviewNotice';

interface B2BDiscoveryPageProps {
  readonly onBack: () => void;
  readonly onSignIn: () => void;
  readonly onListBusiness: () => void;
  readonly onViewProfile: (slug: string) => void;
  readonly nav: PublicNavbarProps;
}

type DiscoveryCategory = {
  value: string;
  title: string;
  description: string;
  keywords: string[];
};

type ScrollTarget = {
  scrollIntoView: (options?: Record<string, unknown>) => void;
  focus?: () => void;
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  'fabric-manufacturers': [
    'fabric',
    'fabric manufacturer',
    'fabric manufacturing',
    'fabric processing',
    'textile manufacturer',
    'manufacturer',
    'mill',
    'weaving',
    'dyeing',
    'finishing',
    'processing',
  ],
};

const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
  {
    value: 'yarn-fiber',
    title: 'Yarn & Fiber Suppliers',
    description: 'Discover yarn, fiber, and raw material providers.',
    keywords: ['yarn', 'fiber', 'raw material', 'raw materials', 'fiber supplier', 'yarn supplier'],
  },
  {
    value: 'fabric-manufacturers',
    title: 'Fabric Manufacturers',
    description: 'Explore mills, fabric producers, processors, and finishers.',
    keywords: ['fabric', 'mill', 'processor', 'finisher', 'weaving', 'dyeing', 'finishing'],
  },
  {
    value: 'garment-manufacturers',
    title: 'Garment Manufacturers',
    description: 'Find production partners for apparel and textile products.',
    keywords: ['garment', 'apparel', 'cut and sew', 'manufacturing', 'production partner'],
  },
  {
    value: 'designers-creators',
    title: 'Designers & Product Creators',
    description: 'Connect with fashion, fabric, and product design capability.',
    keywords: ['designer', 'design', 'product creator', 'fashion'],
  },
  {
    value: 'certification-compliance',
    title: 'Certification & Compliance',
    description: 'Discover testing, certification, audit, and compliance partners.',
    keywords: ['certification', 'compliance', 'audit', 'testing', 'quality', 'traceability'],
  },
  {
    value: 'logistics-trade',
    title: 'Logistics & Trade Services',
    description: 'Find logistics, warehousing, export, and trade support.',
    keywords: ['logistics', 'warehousing', 'export', 'trade support', 'shipping', 'distribution'],
  },
  {
    value: 'consultants-services',
    title: 'Consultants & Service Providers',
    description: 'Explore textile consultants and ecosystem specialists.',
    keywords: ['consultant', 'service provider', 'specialist', 'advisor', 'support'],
  },
];

export function B2BDiscoveryPage({ onBack: _onBack, onSignIn, onListBusiness, onViewProfile, nav }: B2BDiscoveryPageProps) {
  const [items, setItems] = useState<PublicB2BSupplierEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [capabilityFilter, setCapabilityFilter] = useState('all');
  const [certificationFilter, setCertificationFilter] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [resultsSection, setResultsSection] = useState<ScrollTarget | null>(null);
  const referenceItems = useMemo(() => getPublicReferenceB2BSuppliers(), []);

  useEffect(() => {
    let cancelled = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    // Timeout safety: prevent indefinite loading if fetch hangs (15s max)
    const startTimeout = () => {
      timeoutHandle = setTimeout(() => {
        if (!cancelled) {
          setError('Unable to load supplier listings. Please try again.');
          setLoading(false);
        }
      }, 15000);
    };

    const clearTimeout_ = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
    };

    startTimeout();

    getPublicB2BSuppliers()
      .then((data) => {
        clearTimeout_();
        if (!cancelled) {
          setError(null);
          setItems(data.items);
          setLoading(false);
        }
      })
      .catch(() => {
        clearTimeout_();
        if (!cancelled) {
          setError('Unable to load supplier listings. Please try again.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout_();
    };
  }, []);

  const regionOptions = useMemo(() => {
    return Array.from(new Set(items.map((supplier) => supplier.jurisdiction).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  }, [items]);

  const capabilityOptions = useMemo(() => {
    const capabilityValues = new Set<string>();

    items.forEach((supplier) => {
      if (supplier.taxonomy?.primarySegment) {
        capabilityValues.add(supplier.taxonomy.primarySegment);
      }

      supplier.taxonomy?.secondarySegments.forEach((segment) => capabilityValues.add(segment));
      supplier.taxonomy?.rolePositions.forEach((role) => capabilityValues.add(role));
      supplier.offeringPreview.forEach((preview) => capabilityValues.add(preview.name));
      supplier.certificationTypes.forEach((certificationType) => capabilityValues.add(certificationType));
    });

    return Array.from(capabilityValues).sort((left, right) => left.localeCompare(right));
  }, [items]);

  const certificationOptions = useMemo(() => {
    return Array.from(new Set(items.flatMap((supplier) => supplier.certificationTypes))).sort((left, right) => left.localeCompare(right));
  }, [items]);

  const usingReferencePreview = !loading && !error && items.length === 0;
  const displayItems: readonly (PublicB2BSupplierEntry | PublicReferenceB2BSupplier)[] =
    usingReferencePreview ? referenceItems : items;

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return displayItems.filter((supplier) => {
      const categoryAliases = categoryFilter === 'all'
        ? []
        : CATEGORY_ALIASES[categoryFilter] ?? DISCOVERY_CATEGORIES.find((category) => category.value === categoryFilter)?.keywords ?? [];

      const searchBlob = [
        supplier.legalName,
        supplier.orgType,
        supplier.jurisdiction,
        supplier.publicationPosture,
        supplier.eligibilityPosture,
        supplier.taxonomy?.primarySegment ?? '',
        ...(supplier.taxonomy?.secondarySegments ?? []),
        ...(supplier.taxonomy?.rolePositions ?? []),
        ...(supplier.certificationTypes ?? []),
        ...supplier.offeringPreview.map((preview) => preview.name),
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = query.length === 0 || searchBlob.includes(query);

      const matchesCategory =
        categoryFilter === 'all'
        || categoryAliases.some((keyword) => searchBlob.includes(keyword.toLowerCase()));

      const matchesRegion = regionFilter === 'all' || supplier.jurisdiction === regionFilter;

      const matchesCapability =
        capabilityFilter === 'all'
        || supplier.taxonomy?.primarySegment === capabilityFilter
        || supplier.taxonomy?.secondarySegments.includes(capabilityFilter)
        || supplier.taxonomy?.rolePositions.includes(capabilityFilter)
        || supplier.offeringPreview.some((preview) => preview.name === capabilityFilter)
        || supplier.certificationTypes.includes(capabilityFilter);

      const matchesCertification =
        certificationFilter === 'all'
        || (certificationFilter === 'has-certifications' && supplier.certificationCount > 0)
        || supplier.certificationTypes.includes(certificationFilter);

      const matchesVerifiedOnly =
        !verifiedOnly
        || (supplier.eligibilityPosture === 'PUBLICATION_ELIGIBLE'
          && (supplier.publicationPosture === 'B2B_PUBLIC' || supplier.publicationPosture === 'BOTH'));

      return matchesQuery && matchesCategory && matchesRegion && matchesCapability && matchesCertification && matchesVerifiedOnly;
    });
  }, [displayItems, searchQuery, categoryFilter, regionFilter, capabilityFilter, certificationFilter, verifiedOnly]);

  const scrollToResults = () => {
    resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    resultsSection?.focus?.();
  };

  const setCategoryIntent = (nextCategory: string) => {
    setCategoryFilter(nextCategory);
    setSearchQuery('');
    setRegionFilter('all');
    setCapabilityFilter('all');
    setCertificationFilter('all');
    setVerifiedOnly(false);
    scrollToResults();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setRegionFilter('all');
    setCapabilityFilter('all');
    setCertificationFilter('all');
    setVerifiedOnly(false);
  };

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      <PublicNavbar {...nav} />

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
        <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,_#071a2f_0%,_#0d2743_58%,_#123a57_100%)] p-8 text-white shadow-[0_30px_90px_rgba(7,26,47,0.28)] md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
            {usingReferencePreview ? 'Reference textile ecosystem discovery' : 'Public-safe textile ecosystem discovery'}
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-white md:text-5xl">
            {usingReferencePreview
              ? 'Preview how textile supplier discovery can appear on TexQtic.'
              : 'Discover trusted textile partners across the value chain.'}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 md:text-lg">
            {usingReferencePreview
              ? 'Explore clearly labeled reference supplier examples that show how public discovery cards, capability context, and profile pathways can appear before genuine businesses onboard.'
              : 'Explore public-safe profiles of suppliers, manufacturers, service providers, and textile ecosystem participants by category, capability, and region.'}
          </p>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-6 text-[#c9eaf0] md:text-base">
            {usingReferencePreview
              ? LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY
              : 'Public discovery creates confidence. Authenticated journeys enable deeper connection, comparison, and trade.'}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={scrollToResults}
              className="inline-flex items-center justify-center rounded-full bg-[#7fd5de] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#08233a] transition hover:bg-[#98e2e9]"
            >
              Browse Public Profiles
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/8 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-white/14"
            >
              Sign in to Connect
            </button>
            <button
              type="button"
              onClick={onListBusiness}
              className="inline-flex items-center justify-center rounded-full border border-[#7fd5de]/40 bg-transparent px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#a6e9f0] transition hover:border-[#a6e9f0] hover:bg-[#0a334d]"
            >
              List Your Business
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2f8094]">
            Search and filter entry
          </p>

          {categoryFilter !== 'all' && (
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[18px] border border-[#d9e5ea] bg-[#f7fbfc] px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Active category
              </span>
              <span className="rounded-full bg-[#071a2f] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                {DISCOVERY_CATEGORIES.find((category) => category.value === categoryFilter)?.title ?? 'Selected'}
              </span>
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className="rounded-full border border-[#d1dee3] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
              >
                Clear category
              </button>
            </div>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Search by product, service, capability, or company
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by product, service, capability, or company"
                className="w-full rounded-[18px] border border-[#d9e5ea] bg-[#f7fbfc] px-4 py-3 text-sm text-[#0a2036] outline-none transition placeholder:text-slate-400 focus:border-[#2f8094]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Filter by category
              </span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full rounded-[18px] border border-[#d9e5ea] bg-[#f7fbfc] px-4 py-3 text-sm text-[#0a2036] outline-none transition focus:border-[#2f8094]"
              >
                <option value="all">All categories</option>
                {DISCOVERY_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.title}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Filter by region
              </span>
              <select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
                className="w-full rounded-[18px] border border-[#d9e5ea] bg-[#f7fbfc] px-4 py-3 text-sm text-[#0a2036] outline-none transition focus:border-[#2f8094]"
              >
                <option value="all">All regions</option>
                {regionOptions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Filter by capability
              </span>
              <select
                value={capabilityFilter}
                onChange={(event) => setCapabilityFilter(event.target.value)}
                className="w-full rounded-[18px] border border-[#d9e5ea] bg-[#f7fbfc] px-4 py-3 text-sm text-[#0a2036] outline-none transition focus:border-[#2f8094]"
              >
                <option value="all">All capabilities</option>
                {capabilityOptions.map((capability) => (
                  <option key={capability} value={capability}>{capability}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Filter by certification
              </span>
              <select
                value={certificationFilter}
                onChange={(event) => setCertificationFilter(event.target.value)}
                className="w-full rounded-[18px] border border-[#d9e5ea] bg-[#f7fbfc] px-4 py-3 text-sm text-[#0a2036] outline-none transition focus:border-[#2f8094]"
              >
                <option value="all">All certifications</option>
                <option value="has-certifications">Has certifications</option>
                {certificationOptions.map((certification) => (
                  <option key={certification} value={certification}>{certification}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-[18px] border border-[#d9e5ea] bg-[#f7fbfc] px-4 py-3 text-sm text-[#0a2036]">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(event) => setVerifiedOnly(event.target.checked)}
                className="h-4 w-4 accent-[#2f8094]"
              />
              <span>Public profile approved only</span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={scrollToResults}
              className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
            >
              Browse Public Profiles
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2f8094]">
            Participant category cards
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {DISCOVERY_CATEGORIES.map((category) => (
              <article key={category.value} className="rounded-[28px] border border-[#d9e5ea] bg-[#fbfdfe] p-6 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2f8094]">Category</p>
                <h3 className="public-entry-editorial-heading mt-3 text-2xl leading-tight text-[#0a2036]">
                  {category.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-slate-600">{category.description}</p>
                <button
                  type="button"
                  onClick={() => setCategoryIntent(category.value)}
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
                >
                  Explore Category
                </button>
              </article>
            ))}
          </div>
        </section>

        <section
          ref={(node) => setResultsSection(node)}
          tabIndex={-1}
          aria-live="polite"
          className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10 focus:outline-none focus:ring-2 focus:ring-[#7fd5de]"
        >
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2f8094]">
              Public profile results grid
            </p>
            <h2 className="public-entry-editorial-heading mt-4 text-3xl leading-tight text-[#0a2036] md:text-4xl">
              Public-safe textile ecosystem discovery, not public Aggregator intelligence.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Browse public-safe business profiles by category, capability, and region. Sign in when you are ready to compare, connect, negotiate, or trade.
            </p>
          </div>

          {usingReferencePreview && (
            <div className="mt-6">
              <ReferencePreviewNotice
                label={REFERENCE_SUPPLIER_PROFILE_LABEL}
                replacementCopy={LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY}
              />
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d6e4e8] border-t-[#7fd5de]" />
                <p className="text-sm text-slate-500">Loading public textile profiles…</p>
              </div>
            </div>
          )}

          {!loading && error && items.length === 0 && (
            <div className="mt-6 rounded-[28px] border border-red-200 bg-red-50 px-6 py-8 text-center">
              <p className="text-sm font-medium text-red-700">
                We could not load public profiles right now. You can still sign in or request access to continue.
              </p>
            </div>
          )}

          {!loading && !error && filteredItems.length === 0 && (
            <div className="mt-6 rounded-[32px] border border-[#d9e5ea] bg-[#fbfdfe] px-8 py-16 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                {usingReferencePreview ? 'No reference profiles match this view yet.' : 'No public profiles match this view yet.'}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {usingReferencePreview
                  ? 'Try clearing filters to see the reference preview examples again.'
                  : 'Try clearing filters or use sign-in to continue to deeper connection and qualification flows.'}
              </p>
            </div>
          )}

          {!loading && !error && filteredItems.length > 0 && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((supplier) => (
                <SupplierCard
                  key={supplier.slug}
                  supplier={supplier}
                  onViewProfile={onViewProfile}
                  onSignIn={onSignIn}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[32px] bg-[linear-gradient(135deg,_#08233a_0%,_#0e304a_100%)] p-8 text-white shadow-[0_24px_70px_rgba(7,26,47,0.20)] md:p-10">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#83d7e1]">
              How public discovery works
            </p>
            <h2 className="public-entry-editorial-heading mt-4 text-3xl leading-tight text-white md:text-4xl">
              Public discovery first. Authenticated trade when ready.
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <article className="rounded-[28px] border border-white/10 bg-white/8 p-6">
              <h3 className="text-lg font-semibold text-white">Discover</h3>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Browse public-safe textile business profiles by category, capability, and region.
              </p>
            </article>
            <article className="rounded-[28px] border border-white/10 bg-white/8 p-6">
              <h3 className="text-lg font-semibold text-white">Qualify</h3>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Sign in to compare, request more details, or start a serious business journey.
              </p>
            </article>
            <article className="rounded-[28px] border border-white/10 bg-white/8 p-6">
              <h3 className="text-lg font-semibold text-white">Connect</h3>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Authenticated journeys protect private pricing, negotiation, documents, and workflows.
              </p>
            </article>
          </div>

          <p className="mt-6 text-sm leading-6 text-slate-200">
            TexQtic keeps public discovery useful while protecting private business information.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2f8094]">Buyer CTA block</p>
            <h2 className="public-entry-editorial-heading mt-4 text-3xl leading-tight text-[#0a2036] md:text-4xl">
              Looking for textile partners?
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Explore public profiles, then sign in to compare, inquire, and connect with the right suppliers, manufacturers, and service providers.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={scrollToResults}
                className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
              >
                Start Exploring
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
              >
                Sign in to Connect
              </button>
            </div>
          </article>

          <article className="rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2f8094]">Supplier CTA block</p>
            <h2 className="public-entry-editorial-heading mt-4 text-3xl leading-tight text-[#0a2036] md:text-4xl">
              Want your business to be discovered?
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Create a TexQtic presence, showcase your capability, and prepare your business for B2B, B2C, and future D2C opportunities.
            </p>
            <button
              type="button"
              onClick={onListBusiness}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
            >
              List Your Business
            </button>
          </article>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-white p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2f8094]">Public safety / trust notice</p>
          <h2 className="public-entry-editorial-heading mt-4 text-3xl leading-tight text-[#0a2036] md:text-4xl">
            Designed for safe public visibility
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
            Public B2B discovery only shows approved, public-safe business information. Private pricing, negotiation, documents, and detailed business data remain protected inside authenticated workflows.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <article className="rounded-[28px] border border-[#d9e5ea] bg-[#fbfdfe] p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#0a2036]">Public-safe profiles</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Only approved profile information is shown publicly.</p>
            </article>
            <article className="rounded-[28px] border border-[#d9e5ea] bg-[#fbfdfe] p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#0a2036]">Protected business data</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Private pricing, documents, and internal details stay hidden.</p>
            </article>
            <article className="rounded-[28px] border border-[#d9e5ea] bg-[#fbfdfe] p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#0a2036]">Authenticated continuity</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Serious connection, comparison, and trade happen after sign-in.</p>
            </article>
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#d9e5ea] bg-[#f7fbfc] p-8 shadow-[0_18px_50px_rgba(7,26,47,0.08)] md:p-10">
          <h2 className="public-entry-editorial-heading text-3xl leading-tight text-[#0a2036] md:text-4xl">
            Find the right textile partner with confidence.
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
            Start with public discovery. Continue with authenticated connection when you are ready.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={scrollToResults}
              className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
            >
              Browse Public Profiles
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
            >
              Sign in to Connect
            </button>
            <button
              type="button"
              onClick={onListBusiness}
              className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
            >
              List Your Business
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

interface SupplierCardProps {
  readonly supplier: PublicB2BSupplierEntry | PublicReferenceB2BSupplier;
  readonly onViewProfile: (slug: string) => void;
  readonly onSignIn: () => void;
}

function SupplierCard({ supplier, onViewProfile, onSignIn }: SupplierCardProps) {
  const taxonomy = supplier.taxonomy;
  const previewItems = supplier.offeringPreview.slice(0, 3);
  const isReferencePreview = 'isReferencePreview' in supplier && supplier.isReferencePreview;
  const isDemoPilotSupplier = !isReferencePreview && isDemoPilotSupplierSlug(supplier.slug);
  let trustBadge = 'Public-safe profile';
  if (isReferencePreview) {
    trustBadge = REFERENCE_SUPPLIER_PROFILE_LABEL;
  } else if (isDemoPilotSupplier) {
    trustBadge = DEMO_PILOT_SUPPLIER_LABEL;
  } else if (
    supplier.eligibilityPosture === 'PUBLICATION_ELIGIBLE'
    && (supplier.publicationPosture === 'B2B_PUBLIC' || supplier.publicationPosture === 'BOTH')
  ) {
    trustBadge = 'Public profile approved';
  }

  let summary = `A public-safe ${supplier.orgType.toLowerCase()} participant available for discovery.`;
  if (isReferencePreview) {
    summary = 'Reference preview of how a supplier profile can show category fit, capability context, and public-safe storytelling before a business publishes live discovery data.';
  } else if (isDemoPilotSupplier) {
    summary = DEMO_PILOT_SUPPLIER_HELPER_TEXT;
  } else if (taxonomy?.primarySegment) {
    summary = `A ${supplier.orgType.toLowerCase()} participant with ${taxonomy.primarySegment.toLowerCase()} capability available for discovery.`;
  }

  return (
    <article className="rounded-[28px] border border-[#d9e5ea] bg-white p-6 shadow-[0_8px_28px_rgba(7,26,47,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          {isReferencePreview ? (
            <ReferencePreviewBadge label={REFERENCE_SUPPLIER_PROFILE_LABEL} />
          ) : (
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#2f8094]">{supplier.orgType}</p>
          )}
          {isDemoPilotSupplier && (
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a5a00]">
              {DEMO_PILOT_SUPPLIER_HELPER_TEXT}
            </p>
          )}
          <h3 className="mt-1 text-lg font-semibold leading-tight text-[#0a2036]">{supplier.legalName}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-[#d6e4e8] bg-[#f0f8fb] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2f8094]">
          {supplier.jurisdiction}
        </span>
      </div>

      {taxonomy && (
        <div className="mt-4 space-y-1.5">
          <p className="text-xs font-semibold text-[#0a2036]">{taxonomy.primarySegment}</p>
          <p className="text-sm leading-6 text-slate-500">{taxonomy.secondarySegments.slice(0, 3).join(' · ')}</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {taxonomy.rolePositions.slice(0, 4).join(' · ')}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#d6e4e8] bg-[#eef7fa] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2f8094]">
          {trustBadge}
        </span>
        {supplier.certificationCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            {supplier.certificationCount} cert{supplier.certificationCount === 1 ? '' : 's'}
          </span>
        )}
        {supplier.hasTraceabilityEvidence && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#d6e4e8] bg-[#eef7fa] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2f8094]">
            Traceability evidence
          </span>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">{summary}</p>

      {isReferencePreview && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a5a00]">
          {NOT_LIVE_COMMERCIAL_OFFER_COPY}
        </p>
      )}

      {supplier.certificationTypes.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Certification summary</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {supplier.certificationTypes.slice(0, 4).map((certification) => (
              <span
                key={certification}
                className="rounded-full border border-[#d9e5ea] bg-[#f5fafb] px-2.5 py-0.5 text-[10px] font-medium text-[#2f8094]"
              >
                {certification}
              </span>
            ))}
          </div>
        </div>
      )}

      {previewItems.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Product/service examples</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {previewItems.map((item) => (
              <div
                key={item.name}
                className="min-w-[9rem] rounded-[18px] border border-[#d9e5ea] bg-[#f7fbfc] px-3 py-2"
              >
                <p className="text-xs font-semibold text-[#0a2036]">{item.name}</p>
                {isReferencePreview ? (
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">Reference capability example</p>
                ) : (
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">MOQ {item.moq}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onViewProfile(supplier.slug)}
          className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
        >
          {isReferencePreview ? 'View Reference Profile' : 'View Public Profile'}
        </button>
        <button
          type="button"
          onClick={onSignIn}
          className="inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
        >
          Sign in to Connect
        </button>
      </div>
    </article>
  );
}
