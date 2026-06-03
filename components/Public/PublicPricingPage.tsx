import React, { useState } from 'react';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';
import {
  ENTITLEMENT_DISPLAY_ROWS,
  UPGRADE_CTA_MAILTO,
  TIER_UPGRADE_COPY,
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

function getAvailabilityBadgeClass(label: AvailabilityLabel): string {
  if (label === 'Included') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (label === 'Coming soon') return 'bg-slate-100 text-slate-500 border-slate-200';
  if (label === 'Contact us') return 'bg-violet-50 text-violet-600 border-violet-200';
  // 'Available in …' labels
  return 'bg-blue-50 text-blue-600 border-blue-200';
}

function AvailabilityCell({ label }: { label: AvailabilityLabel }) {
  const colorClass = getAvailabilityBadgeClass(label);
  const short =
    label === 'Available in STARTER' ? 'Starter+'
    : label === 'Available in PROFESSIONAL' ? 'Pro+'
    : label === 'Available in ENTERPRISE' ? 'Enterprise'
    : label;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}
      title={label}
    >
      {short}
    </span>
  );
}

// Collect unique categories in display order from the rows
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

// ── Tier card config ───────────────────────────────────────────────────────────

interface TierCardConfig {
  tier: Tier;
  label: string;
  tagline: string;
  priceLine: string;
  ctaLabel: string;
  ctaHref?: string;
  ctaIsSignIn?: boolean;
  featured: boolean;
  badgeClass: string;
  cardClass: string;
  ctaClass: string;
}

const TIER_CARDS: readonly TierCardConfig[] = [
  {
    tier: 'FREE',
    label: 'FREE \u2014 Early Access',
    tagline: 'Start building on TexQtic at no cost during the early access period.',
    priceLine: TIER_UPGRADE_COPY['FREE'],
    ctaLabel: 'Get started free',
    ctaIsSignIn: true,
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
    tagline: 'Designed for growing teams. Early adopter pricing opening soon.',
    priceLine: TIER_UPGRADE_COPY['STARTER'],
    ctaLabel: 'Join waitlist',
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

// Highlights: top 3 features to show per tier on the card (display only)
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

// ── Component ──────────────────────────────────────────────────────────────────

export function PublicPricingPage({
  nav,
  onSignIn,
}: PublicPricingPageProps) {
  const [showMatrix, setShowMatrix] = useState(false);
  const categories = getCategories();

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
              TexQtic is free during early access. Paid tiers open later &mdash; reach out to
              be among the first to access STARTER or PROFESSIONAL.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              No checkout. No payment information required. Feature availability is indicative
              and subject to change.
            </p>
          </div>
        </section>

        {/* ── Tier cards ───────────────────────────────────────────────────── */}
        <section
          className="px-6 py-12 lg:px-10"
          aria-label="Plan tiers"
        >
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
                  <p className="mt-3 text-xs font-semibold text-slate-700">{card.priceLine}</p>

                  {/* CTA */}
                  <div className="mt-5">
                    {card.ctaIsSignIn ? (
                      <button
                        type="button"
                        onClick={onSignIn}
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

        {/* ── Feature comparison matrix (collapsible) ──────────────────────── */}
        <section
          className="px-6 pb-14 lg:px-10"
          aria-label="Feature availability comparison"
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-[0.16em]">
                Feature availability
              </h2>
              <button
                type="button"
                onClick={() => setShowMatrix((prev) => !prev)}
                aria-expanded={showMatrix}
                className="rounded-full border border-[#d6e4e8] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600 transition hover:border-[#2f8094] hover:text-[#0a2036]"
              >
                {showMatrix ? 'Hide comparison' : 'Show full comparison'}
              </button>
            </div>

            {showMatrix && (
              <div className="mt-6 overflow-x-auto rounded-2xl border border-[#d6e4e8] bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#d6e4e8] bg-[#f3f8fb]">
                      <th className="px-5 py-3 font-bold text-slate-700 w-1/3">Feature</th>
                      {TIERS.map((t) => (
                        <th key={t} className="px-3 py-3 font-bold text-slate-700 text-center">
                          {t === 'FREE' ? 'FREE' : t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => {
                      const rows = ENTITLEMENT_DISPLAY_ROWS.filter((r) => r.category === cat);
                      return (
                        <React.Fragment key={cat}>
                          <tr>
                            <td
                              colSpan={5}
                              className="bg-[#f3f8fb] px-5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"
                            >
                              {cat}
                            </td>
                          </tr>
                          {rows.map((row) => (
                            <tr
                              key={row.feature}
                              className="border-b border-[#edf4f6] last:border-0 hover:bg-[#f9fcfd]"
                            >
                              <td className="px-5 py-3 text-slate-700">
                                {row.feature}
                                {row.note && (
                                  <span className="ml-1.5 text-[10px] text-slate-400">
                                    ({row.note})
                                  </span>
                                )}
                              </td>
                              {TIERS.map((tier) => (
                                <td key={tier} className="px-3 py-3 text-center">
                                  <AvailabilityCell label={row[tier]} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <p className="border-t border-[#d6e4e8] px-5 py-3 text-[11px] text-slate-400">
                  Feature availability is indicative and subject to change. No checkout or
                  payment is available at this time.
                </p>
              </div>
            )}
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
              TexQtic is free during early access. Sign in or create your workspace today.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onSignIn}
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
