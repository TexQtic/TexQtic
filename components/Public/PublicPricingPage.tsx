import React, { useState } from 'react';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';
import {
  ENTITLEMENT_DISPLAY_ROWS,
  UPGRADE_CTA_MAILTO,
  TIER_UPGRADE_COPY,
  TIER_YEARLY_PRICE_COPY,
  type AvailabilityLabel,
} from '../../config/entitlementDisplay';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PublicPricingPageProps {
  readonly nav: PublicNavbarProps;
  readonly onBack: () => void;
  readonly onSignIn: () => void;
  readonly onRequestAccess: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TIERS = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const;
type Tier = typeof TIERS[number];

const TIER_SHORT_LABELS: Record<Tier, string> = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PROFESSIONAL: 'PRO',
  ENTERPRISE: 'ENT',
};

function getAvailabilityStyle(label: AvailabilityLabel): string {
  if (label === 'Included') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (label === 'Coming soon') return 'bg-slate-100 text-slate-400 border-slate-200';
  if (label === 'Contact us') return 'bg-violet-50 text-violet-600 border-violet-200';
  // 'Available in …' labels
  return 'bg-blue-50 text-blue-600 border-blue-200';
}

function getAvailabilityShortLabel(label: AvailabilityLabel): string {
  if (label === 'Available in STARTER') return 'STARTER+';
  if (label === 'Available in PROFESSIONAL') return 'PRO+';
  if (label === 'Available in ENTERPRISE') return 'ENT only';
  return label;
}

// Collect unique categories in stable display order from the rows
function getCategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of ENTITLEMENT_DISPLAY_ROWS) {
    if (!seen.has(row.category)) {
      seen.add(row.category);
      result.push(row.category);
    }
  }
  return result;

}

const CATEGORIES = getCategories();

// Returns the display price line for a tier given the current billing cycle.
function getPriceLine(tier: Tier, cycle: 'monthly' | 'yearly'): string {
  if (tier === 'STARTER' || tier === 'PROFESSIONAL') {
    return cycle === 'monthly' ? TIER_UPGRADE_COPY[tier] : TIER_YEARLY_PRICE_COPY[tier];
  }
  return TIER_UPGRADE_COPY[tier];
}

// ── Tier card config ───────────────────────────────────────────────────────────

interface TierCardConfig {
  readonly tier: Tier;
  readonly label: string;
  readonly tagline: string;
  readonly priceLine: string;
  readonly ctaLabel: string;
  readonly ctaHref?: string;
  /** true = calls onRequestAccess() */
  readonly ctaIsRequestAccess?: boolean;
  readonly featured: boolean;
  readonly badgeClass: string;
  readonly cardClass: string;
  readonly ctaClass: string;
}

const TIER_CARDS: readonly TierCardConfig[] = [
  {
    tier: 'FREE',
    label: 'FREE \u2014 Early Access',
    tagline: 'Start building on TexQtic at no cost during the early access period.',
    priceLine: TIER_UPGRADE_COPY['FREE'],
    ctaLabel: 'Get started free',
    ctaIsRequestAccess: true,
    featured: true,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    cardClass:
      'relative rounded-2xl border-2 border-[#2f8094] bg-white shadow-[0_8px_32px_rgba(47,128,148,0.13)]',
    ctaClass:
      'inline-flex w-full items-center justify-center rounded-full bg-[#071a2f] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#0d2743]',
  },
  {
    tier: 'STARTER',
    label: 'STARTER',
    tagline: 'Designed for growing teams. Transparent, simple pricing.',
    priceLine: TIER_UPGRADE_COPY['STARTER'],
    ctaLabel: 'Contact us',
    ctaHref: UPGRADE_CTA_MAILTO,
    featured: false,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    cardClass: 'relative rounded-2xl border border-[#d6e4e8] bg-white shadow-sm',
    ctaClass:
      'inline-flex w-full items-center justify-center rounded-full border border-[#2f8094] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2f8094] transition hover:bg-[#eff6f8]',
  },
  {
    tier: 'PROFESSIONAL',
    label: 'PROFESSIONAL',
    tagline: 'Advanced commerce features for professional B2B operations.',
    priceLine: TIER_UPGRADE_COPY['PROFESSIONAL'],
    ctaLabel: 'Contact us',
    ctaHref: UPGRADE_CTA_MAILTO,
    featured: false,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cardClass: 'relative rounded-2xl border border-[#d6e4e8] bg-white shadow-sm',
    ctaClass:
      'inline-flex w-full items-center justify-center rounded-full border border-[#d6e4e8] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]',
  },
  {
    tier: 'ENTERPRISE',
    label: 'ENTERPRISE',
    tagline: 'Custom scale, dedicated support, and full-platform capability.',
    priceLine: TIER_UPGRADE_COPY['ENTERPRISE'],
    ctaLabel: 'Contact sales',
    ctaHref: UPGRADE_CTA_MAILTO,
    featured: false,
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    cardClass:
      'relative rounded-2xl border border-[#d6e4e8] bg-[#f8f9fc] shadow-sm',
    ctaClass:
      'inline-flex w-full items-center justify-center rounded-full border border-[#d6e4e8] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]',
  },
];

// Key highlights per tier (display only)
const TIER_CARD_HIGHLIGHTS: Record<Tier, readonly string[]> = {
  FREE: [
    'B2B workspace',
    'Supplier profile & catalog',
    'RFQ & Procurement Pools',
  ],
  STARTER: [
    'Everything in FREE',
    'Extended AI budget',
    'Priority support',
  ],
  PROFESSIONAL: [
    'Everything in STARTER',
    'White-label overlay',
    'Custom integrations (contact us)',
  ],
  ENTERPRISE: [
    'Everything in PROFESSIONAL',
    'Aggregator workspace',
    'Dedicated onboarding',
  ],
};

// ── Feature comparison accordion ──────────────────────────────────────────────

interface CategoryAccordionProps {
  readonly category: string;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

function CategoryAccordion({ category, isOpen, onToggle }: CategoryAccordionProps) {
  const rows = ENTITLEMENT_DISPLAY_ROWS.filter((r) => r.category === category);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d6e4e8] bg-white shadow-sm">
      {/* Category header / toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[#f3f8fb]"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
            {category}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {rows.length} {rows.length === 1 ? 'feature' : 'features'}
          </span>
        </div>
        <span
          aria-hidden="true"
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          &#8964;
        </span>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="border-t border-[#edf4f6]">
          {/* Tier column headers (sticky reference) */}
          <div className="grid grid-cols-[1fr_repeat(4,_auto)] gap-x-3 border-b border-[#edf4f6] bg-[#f9fcfd] px-5 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Feature
            </span>
            {TIERS.map((t) => (
              <span
                key={t}
                className="w-16 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
              >
                {TIER_SHORT_LABELS[t]}
              </span>
            ))}
          </div>

          {/* Feature rows */}
          {rows.map((row, idx) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1fr_repeat(4,_auto)] items-center gap-x-3 px-5 py-3 ${
                idx % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'
              }`}
            >
              <div>
                <span className="text-xs text-slate-700">{row.feature}</span>
                {row.note && (
                  <span className="ml-1.5 text-[10px] text-slate-400">({row.note})</span>
                )}
              </div>
              {TIERS.map((tier) => {
                const label = row[tier];
                const style = getAvailabilityStyle(label);
                const shortLabel = getAvailabilityShortLabel(label);
                return (
                  <div key={tier} className="flex w-16 justify-center">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold leading-tight ${style}`}
                      title={label}
                      aria-label={`${tier}: ${label}`}
                    >
                      {shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PublicPricingPage({
  nav,
  onRequestAccess,
}: PublicPricingPageProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const allOpen = openCategories.size === CATEGORIES.length;

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setOpenCategories(allOpen ? new Set() : new Set(CATEGORIES));
  };

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans text-slate-900">
      <PublicNavbar {...nav} />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          className="bg-[linear-gradient(180deg,_#eef6f8_0%,_#f3f8fb_100%)] px-6 pb-14 pt-14 text-center lg:px-10"
          aria-labelledby="pricing-hero-heading"
        >
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#2f8094]">
              Plans &amp; Pricing
            </p>
            <h1
              id="pricing-hero-heading"
              className="text-3xl font-extrabold tracking-tight text-[#071a2f] sm:text-4xl"
            >
              Start free. Scale when ready.
            </h1>
            <p className="mt-4 text-base text-slate-600">
              TexQtic is free during early access. STARTER and PROFESSIONAL plans are available
              on a contact basis &mdash; reach out to enquire.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              No checkout. No payment information required. Feature availability is indicative
              and subject to change. Prices are shown exclusive of GST.
            </p>
          </div>
        </section>

        {/* ── Tier cards ───────────────────────────────────────────────────── */}
        <section
          className="px-6 py-12 lg:px-10"
          aria-label="Plan tiers"
        >
          {/* Billing cycle toggle */}
          <div className="mx-auto mb-2 flex max-w-xs items-center justify-center rounded-full border border-[#d6e4e8] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              aria-pressed={billingCycle === 'monthly'}
              className={`flex-1 rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                billingCycle === 'monthly'
                  ? 'bg-[#071a2f] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              aria-pressed={billingCycle === 'yearly'}
              className={`flex-1 rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                billingCycle === 'yearly'
                  ? 'bg-[#071a2f] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Yearly
            </button>
          </div>
          {/* GST note */}
          <p className="mb-8 text-center text-[11px] text-slate-400">
            Prices are shown exclusive of GST. 18% GST applies separately.
          </p>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {TIER_CARDS.map((card) => (
              <div key={card.tier} className={card.cardClass}>
                {card.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-[#2f8094] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
                      Current early access plan
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Plan badge */}
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${card.badgeClass}`}
                  >
                    {card.label}
                  </span>

                  {/* Tagline */}
                  <p className="mt-3 text-sm text-slate-600">{card.tagline}</p>

                  {/* Price line */}
                  <p className="mt-3 text-xs font-semibold text-slate-700">{getPriceLine(card.tier, billingCycle)}</p>

                  {/* CTA */}
                  <div className="mt-5">
                    {card.ctaIsRequestAccess ? (
                      <button
                        type="button"
                        onClick={onRequestAccess}
                        className={card.ctaClass}
                      >
                        {card.ctaLabel}
                      </button>
                    ) : (
                      <a
                        href={card.ctaHref}
                        className={card.ctaClass}
                        rel="noopener noreferrer"
                      >
                        {card.ctaLabel}
                      </a>
                    )}
                  </div>

                  {/* Highlights */}
                  <ul className="mt-6 space-y-2" aria-label={`${card.tier} plan highlights`}>
                    {TIER_CARD_HIGHLIGHTS[card.tier].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                        <span aria-hidden="true" className="mt-0.5 flex-shrink-0 text-emerald-500">
                          &#10003;
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature availability — category accordions ────────────────────── */}
        <section
          className="px-6 pb-14 lg:px-10"
          aria-label="Feature availability by category"
        >
          <div className="mx-auto max-w-4xl">
            {/* Section header */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-[#071a2f]">
                  Feature availability
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Indicative comparison across plans. Expand any category to see details.
                  No checkout or payment is available at this time.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAll}
                aria-label={allOpen ? 'Collapse all feature categories' : 'Expand all feature categories'}
                className="self-start rounded-full border border-[#d6e4e8] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600 transition hover:border-[#2f8094] hover:text-[#0a2036] sm:self-auto"
              >
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            </div>

            {/* Tier legend bar */}
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#d6e4e8] bg-white px-5 py-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Tiers:
              </span>
              {TIERS.map((t) => (
                <span key={t} className="text-[10px] font-semibold text-slate-600">
                  <span className="font-bold text-slate-700">{TIER_SHORT_LABELS[t]}</span>
                  {' = '}
                  {t}
                </span>
              ))}
              <span className="ml-auto flex flex-wrap gap-2">
                {(['Included', 'Coming soon', 'Contact us', 'Available in STARTER'] as AvailabilityLabel[]).map((lbl) => (
                  <span
                    key={lbl}
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${getAvailabilityStyle(lbl)}`}
                  >
                    {getAvailabilityShortLabel(lbl)}
                  </span>
                ))}
              </span>
            </div>

            {/* Category accordions */}
            <div className="space-y-3">
              {CATEGORIES.map((cat) => (
                <CategoryAccordion
                  key={cat}
                  category={cat}
                  isOpen={openCategories.has(cat)}
                  onToggle={() => toggleCategory(cat)}
                />
              ))}
            </div>

            <p className="mt-5 text-[11px] text-slate-400">
              Feature availability is indicative and subject to change. No checkout or payment
              is available at this time. Paid tiers are opening soon on a contact basis.
            </p>
          </div>
        </section>

        {/* ── Bottom CTA strip ─────────────────────────────────────────────── */}
        <section
          className="border-t border-[#d6e4e8] bg-white px-6 py-12 text-center lg:px-10"
          aria-label="Get started"
        >
          <div className="mx-auto max-w-xl">
            <h2 className="text-xl font-bold text-[#071a2f]">
              Ready to get started?
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              TexQtic is free during early access. Request access and get your workspace set up today.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onRequestAccess}
                className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-7 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#0d2743]"
              >
                Get started free
              </button>
              <a
                href={UPGRADE_CTA_MAILTO}
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-7 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
              >
                Enquire about paid tiers
              </a>
            </div>
            <p className="mt-5 text-xs text-slate-400">
              No checkout. No credit card. Paid tiers will open later with advance notice.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
