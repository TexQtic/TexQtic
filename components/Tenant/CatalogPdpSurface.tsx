/**
 * CatalogPdpSurface — Buyer Catalog Product Detail Page shell
 * TECS-B2B-BUYER-CATALOG-PDP-001 P-2
 *
 * Renders the PDP layout for an authenticated B2B buyer.
 * Consumes BuyerCatalogPdpView from the P-1 backend read contract.
 *
 * Boundaries:
 * - No actual price disclosure (price placeholder only)
 * - No RFQ prefill / auto-submit / multi-item basket
 * - No AI draft fields / confidence scores
 * - No DPP Passport integration
 * - No relationship access gates
 * - No unauthenticated access
 * - Compliance notice is a structural constant — no AI draft data rendered
 *
 * Test IDs per Section J of design artifact:
 *   buyer-catalog-pdp-page, buyer-catalog-pdp-hero, buyer-catalog-pdp-media-gallery,
 *   buyer-catalog-pdp-item-overview, buyer-catalog-pdp-specifications,
 *   buyer-catalog-pdp-supplier-summary, buyer-catalog-pdp-compliance-summary,
 *   buyer-catalog-pdp-availability-summary, buyer-catalog-pdp-rfq-entry,
 *   buyer-catalog-pdp-price-placeholder, buyer-catalog-pdp-back-button,
 *   buyer-catalog-pdp-compliance-notice
 */

import React from 'react';
import type {
  BuyerCatalogPdpView,
  BuyerCertificateSummaryItem,
} from '../../services/catalogService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Canonical compliance notice label.
 * Structural constant — must not display AI draft data or confidence scores.
 */
export const CATALOG_PDP_COMPLIANCE_NOTICE =
  'AI-generated extraction · Human review required before acting on any extracted data';

/** Copy for the price placeholder section — no actual price ever disclosed. */
export const CATALOG_PDP_PRICE_PLACEHOLDER_LABEL = 'Price available on request' as const;
export const CATALOG_PDP_PRICE_PLACEHOLDER_SUBLABEL = 'RFQ required for pricing' as const;

/** RFQ entry trigger label — no auto-submit, no multi-item basket. */
export const CATALOG_PDP_RFQ_TRIGGER_LABEL = 'Request Quote' as const;

/** Safe loading copy. */
export const CATALOG_PDP_LOADING_COPY = 'Loading item details…' as const;

/** Safe error copy — no stack traces, no tenant IDs. */
export const CATALOG_PDP_ERROR_COPY = 'Unable to load item details.' as const;

/** Safe not-found copy. */
export const CATALOG_PDP_NOT_FOUND_COPY = 'Item not found or unavailable.' as const;

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

export function formatLeadTimeDays(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

export function resolveCertStatusTone(
  status: BuyerCertificateSummaryItem['status'],
): string {
  if (status === 'EXPIRING_SOON') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

export function formatCategoryBadge(value: string): string {
  return value.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CatalogPdpSurfaceProps = Readonly<{
  item: BuyerCatalogPdpView | null;
  loading: boolean;
  /** null = no error. 'NOT_FOUND' = 404. Any other string = generic error. */
  error: string | null;
  onBack: () => void;
  /**
   * Called when buyer presses "Request Quote".
   * P-2: passes safe handoff descriptor fields only — no prefill, no auto-submit.
   * Full RFQ prefill is deferred to TECS-B2B-BUYER-RFQ-INTEGRATION-001 (P-4).
   */
  onRequestQuote: (payload: { itemId: string; supplierId: string; itemTitle: string }) => void;
}>;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PdpHero({
  item,
}: Readonly<{ item: BuyerCatalogPdpView }>) {
  return (
    <section
      data-testid="buyer-catalog-pdp-hero"
      className="space-y-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">{item.title}</h1>
          <p className="text-sm font-medium text-slate-500">{item.supplierDisplayName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.category != null && (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {formatCategoryBadge(item.category)}
            </span>
          )}
          {item.stage != null && item.stage !== item.category && (
            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              {formatCategoryBadge(item.stage)}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function PdpMediaGallery({
  item,
}: Readonly<{ item: BuyerCatalogPdpView }>) {
  return (
    <section
      data-testid="buyer-catalog-pdp-media-gallery"
      className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden"
    >
      {item.media.length > 0 ? (
        <img
          src={item.media[0]!.signedUrl}
          alt={item.media[0]!.altText ?? item.title}
          className="w-full h-64 object-cover sm:h-80"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-48 items-center justify-center text-sm text-slate-400"
          role="img"
          aria-label={`${item.title} — image not available`}
        >
          No image available
        </div>
      )}
    </section>
  );
}

function PdpItemOverview({
  item,
}: Readonly<{ item: BuyerCatalogPdpView }>) {
  return (
    <section
      data-testid="buyer-catalog-pdp-item-overview"
      className="space-y-2"
    >
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Item Overview</h2>
      {item.description != null ? (
        <p className="text-sm text-slate-700 leading-relaxed">{item.description}</p>
      ) : (
        <p className="text-sm text-slate-400 italic">No description provided.</p>
      )}
    </section>
  );
}

function PdpSpecifications({
  item,
}: Readonly<{ item: BuyerCatalogPdpView }>) {
  const spec = item.specifications;
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: 'Category', value: spec.productCategory },
    { label: 'Fabric Type', value: spec.fabricType },
    { label: 'Material', value: spec.material },
    { label: 'Composition', value: spec.composition },
    { label: 'Color', value: spec.color },
    { label: 'GSM', value: spec.gsm != null ? `${spec.gsm} GSM` : null },
    { label: 'Width', value: spec.widthCm != null ? `${spec.widthCm} cm` : null },
    { label: 'Construction', value: spec.construction },
  ];
  const activeRows = rows.filter(r => r.value != null && r.value !== '');

  return (
    <section
      data-testid="buyer-catalog-pdp-specifications"
      className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-4"
    >
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
        Textile Specifications
      </h2>
      {activeRows.length > 0 ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {activeRows.map(row => (
            <div key={row.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-400 italic">Specification details not available.</p>
      )}
      {spec.certifications != null && spec.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {spec.certifications.map(cert => (
            <span
              key={cert}
              className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700"
            >
              {cert}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function PdpSupplierSummary({
  item,
}: Readonly<{ item: BuyerCatalogPdpView }>) {
  return (
    <section
      data-testid="buyer-catalog-pdp-supplier-summary"
      className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-2"
    >
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Supplier</h2>
      <p className="text-base font-semibold text-slate-900">{item.supplierDisplayName}</p>
      <p className="text-xs text-slate-500">
        Supplier profile and relationship details are managed separately.
      </p>
    </section>
  );
}

function PdpComplianceSummary({
  item,
}: Readonly<{ item: BuyerCatalogPdpView }>) {
  const { complianceSummary } = item;
  return (
    <section
      data-testid="buyer-catalog-pdp-compliance-summary"
      className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-4"
    >
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
        Compliance &amp; Certifications
      </h2>
      {complianceSummary.hasCertifications && complianceSummary.certificates.length > 0 ? (
        <ul className="space-y-2">
          {complianceSummary.certificates.map((cert, idx) => (
            <li
              /* eslint-disable-next-line react/no-array-index-key */
              key={`${cert.certificateType}-${idx}`}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold mr-2 ${resolveCertStatusTone(cert.status)}`}
            >
              {cert.certificateType}
              {cert.status === 'EXPIRING_SOON' && (
                <span className="ml-1.5 text-amber-600">(expiring soon)</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400 italic">
          No certified records on file for this supplier at this time.
        </p>
      )}
      <p
        data-testid="buyer-catalog-pdp-compliance-notice"
        className="text-[11px] text-slate-400 border-t border-slate-100 pt-3"
      >
        {CATALOG_PDP_COMPLIANCE_NOTICE}
      </p>
    </section>
  );
}

function PdpAvailabilitySummary({
  item,
}: Readonly<{ item: BuyerCatalogPdpView }>) {
  const { availabilitySummary } = item;
  return (
    <section
      data-testid="buyer-catalog-pdp-availability-summary"
      className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-4"
    >
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Availability</h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Min. Order</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">
            {availabilitySummary.moqValue != null
              ? `${availabilitySummary.moqValue}${availabilitySummary.moqUnit ? ` ${availabilitySummary.moqUnit}` : ''}`
              : 'On request'}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Lead Time</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">
            {availabilitySummary.leadTimeDays != null
              ? formatLeadTimeDays(availabilitySummary.leadTimeDays)
              : 'On request'}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Capacity</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 capitalize">
            {availabilitySummary.capacityIndicator?.replace(/_/g, ' ') ?? 'On request'}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function PdpPricePlaceholder() {
  return (
    <section
      data-testid="buyer-catalog-pdp-price-placeholder"
      className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 space-y-1"
    >
      <p className="text-base font-semibold text-slate-700">{CATALOG_PDP_PRICE_PLACEHOLDER_LABEL}</p>
      <p className="text-sm text-slate-500">{CATALOG_PDP_PRICE_PLACEHOLDER_SUBLABEL}</p>
    </section>
  );
}

function PdpRfqEntry({
  item,
  onRequestQuote,
}: Readonly<{
  item: BuyerCatalogPdpView;
  onRequestQuote: (payload: { itemId: string; supplierId: string; itemTitle: string }) => void;
}>) {
  return (
    <section
      data-testid="buyer-catalog-pdp-rfq-entry"
      className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-5 space-y-3"
    >
      <div>
        <h2 className="text-base font-bold text-slate-900">Interested in this item?</h2>
        <p className="text-sm text-slate-600 mt-1">
          Submit a request for quote and the supplier will respond with pricing and availability.
        </p>
      </div>
      <button
        type="button"
        onClick={() =>
          onRequestQuote({
            itemId: item.rfqEntry.itemId,
            supplierId: item.rfqEntry.supplierId,
            itemTitle: item.rfqEntry.itemTitle,
          })
        }
        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
      >
        {CATALOG_PDP_RFQ_TRIGGER_LABEL}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CatalogPdpSurface — main export
// ---------------------------------------------------------------------------

export function CatalogPdpSurface({
  item,
  loading,
  error,
  onBack,
  onRequestQuote,
}: CatalogPdpSurfaceProps) {
  // Back button — always visible so user can escape any state.
  const BackButton = (
    <button
      type="button"
      data-testid="buyer-catalog-pdp-back-button"
      onClick={onBack}
      className="text-slate-400 text-sm hover:text-slate-700 transition"
    >
      ← Back to catalog
    </button>
  );

  if (loading) {
    return (
      <div data-testid="buyer-catalog-pdp-page" className="space-y-4 animate-in fade-in duration-300">
        {BackButton}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-600 text-center">
          {CATALOG_PDP_LOADING_COPY}
        </div>
      </div>
    );
  }

  if (error === 'NOT_FOUND' || (error == null && item == null)) {
    return (
      <div data-testid="buyer-catalog-pdp-page" className="space-y-4 animate-in fade-in duration-300">
        {BackButton}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500 text-center">
          {CATALOG_PDP_NOT_FOUND_COPY}
        </div>
      </div>
    );
  }

  if (error != null) {
    return (
      <div data-testid="buyer-catalog-pdp-page" className="space-y-4 animate-in fade-in duration-300">
        {BackButton}
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5 text-sm text-red-700">
          {CATALOG_PDP_ERROR_COPY}
        </div>
      </div>
    );
  }

  // Defensive check — item should be non-null here; caught above otherwise.
  if (item == null) {
    return null;
  }

  return (
    <div
      data-testid="buyer-catalog-pdp-page"
      className="space-y-6 animate-in fade-in duration-500"
    >
      {BackButton}

      <PdpHero item={item} />
      <PdpMediaGallery item={item} />
      <PdpItemOverview item={item} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PdpSpecifications item={item} />
          <PdpComplianceSummary item={item} />
          <PdpAvailabilitySummary item={item} />
        </div>
        <div className="space-y-4">
          <PdpPricePlaceholder />
          <PdpRfqEntry item={item} onRequestQuote={onRequestQuote} />
          <PdpSupplierSummary item={item} />
        </div>
      </div>
    </div>
  );
}
