/**
 * CatalogPdpSurface â€” Buyer Catalog Product Detail Page shell
 * TECS-B2B-BUYER-CATALOG-PDP-001 P-2 / P-3
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
 * - Compliance notice is a structural constant â€” no AI draft data rendered
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
  BuyerAvailabilitySummary,
  BuyerCatalogMedia,
  BuyerCatalogPdpView,
  BuyerCertificateSummaryItem,
  BuyerPriceDisclosure,
  RecommendedSuppliersResponse,
} from '../../services/catalogService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Canonical compliance notice label.
 * Structural constant â€” must not display AI draft data or confidence scores.
 */
export const CATALOG_PDP_COMPLIANCE_NOTICE =
  'AI-generated extraction \u00B7 Human review required before acting on any extracted data';

/** Copy for the price placeholder section â€” no actual price amount ever disclosed. */
export const CATALOG_PDP_PRICE_PLACEHOLDER_LABEL = 'Price available on request' as const;
export const CATALOG_PDP_PRICE_PLACEHOLDER_SUBLABEL = 'RFQ required for pricing' as const;

/** RFQ entry trigger label â€” no auto-submit, no multi-item basket. */
export const CATALOG_PDP_RFQ_TRIGGER_LABEL = 'Request Quote' as const;

/** Safe loading copy. */
export const CATALOG_PDP_LOADING_COPY = 'Loading item details\u2026' as const;

/** Safe error copy â€” no stack traces, no tenant IDs. */
export const CATALOG_PDP_ERROR_COPY = 'Unable to load item details.' as const;

/** Safe not-found copy. */
export const CATALOG_PDP_NOT_FOUND_COPY = 'Item not found or unavailable.' as const;

// ---------------------------------------------------------------------------
// P-3 rendering constants
// ---------------------------------------------------------------------------

/** Empty state for media gallery when no images are uploaded. */
export const CATALOG_PDP_MEDIA_EMPTY_COPY = 'No images uploaded yet' as const;

/** Fallback for availability fields when the supplier has not yet provided a value. */
export const CATALOG_PDP_AVAILABILITY_FALLBACK = 'Available on request' as const;

/** Empty state for compliance summary when no APPROVED certificates exist. */
export const CATALOG_PDP_COMPLIANCE_EMPTY_COPY =
  'No certification records available for this item.' as const;

// Recommendation surface constants (Slice G — TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001)
export const CATALOG_PDP_RECOMMENDED_HEADING = 'Recommended suppliers' as const;
export const CATALOG_PDP_RECOMMENDED_EMPTY_COPY =
  'No recommended suppliers available at this time.' as const;
export const CATALOG_PDP_RECOMMENDED_LOADING_COPY = 'Finding matching suppliers\u2026' as const;
export const CATALOG_PDP_RECOMMENDED_DISCLAIMER =
  'Suggestions are based on catalog data only. Human review is required before actioning any result.' as const;

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

/**
 * Resolve alt text for a media item.
 * Falls back to itemTitle if altText is null or blank.
 * NEVER returns a raw storage path.
 */
export function resolveMediaAltText(altText: string | null, itemTitle: string): string {
  return altText != null && altText.trim().length > 0 ? altText : itemTitle;
}

/** Format MOQ value+unit for display. Returns fallback when moqValue is null. */
export function resolveMoqDisplay(
  moqValue: number | null,
  moqUnit: string | null,
): string {
  if (moqValue == null) return CATALOG_PDP_AVAILABILITY_FALLBACK;
  return moqUnit != null && moqUnit.trim().length > 0
    ? `${moqValue} ${moqUnit}`
    : `${moqValue}`;
}

/** Format lead time for display. Returns fallback when leadTimeDays is null. */
export function resolveLeadTimeDisplay(leadTimeDays: number | null): string {
  if (leadTimeDays == null) return CATALOG_PDP_AVAILABILITY_FALLBACK;
  return formatLeadTimeDays(leadTimeDays);
}

/** Format capacity indicator for display. Returns fallback when null. */
export function resolveCapacityDisplay(
  capacityIndicator: BuyerAvailabilitySummary['capacityIndicator'],
): string {
  if (capacityIndicator == null) return CATALOG_PDP_AVAILABILITY_FALLBACK;
  return capacityIndicator.replace(/_/g, ' ');
}

/** Derive a media type badge label from BuyerCatalogMedia.mediaType. */
export function resolveMediaTypeBadge(media: BuyerCatalogMedia): string {
  const map: Record<string, string> = {
    image: 'Image',
    swatch: 'Swatch',
    sample: 'Sample',
  };
  return map[media.mediaType] ?? media.mediaType;
}

type PdpPriceDisclosureRenderModel = {
  label: string;
  subLabel: string;
  ctaLabel: string;
  ctaType: BuyerPriceDisclosure['cta_type'];
  eligibilityReason: string | null;
};

const DISCLOSURE_FALLBACK: PdpPriceDisclosureRenderModel = {
  label: CATALOG_PDP_PRICE_PLACEHOLDER_LABEL,
  subLabel: CATALOG_PDP_PRICE_PLACEHOLDER_SUBLABEL,
  ctaLabel: 'Request quote',
  ctaType: 'REQUEST_QUOTE',
  eligibilityReason: null,
};

function isValidDisclosure(disclosure: unknown): disclosure is BuyerPriceDisclosure {
  if (typeof disclosure !== 'object' || disclosure == null) {
    return false;
  }

  const d = disclosure as Partial<BuyerPriceDisclosure>;
  const validPolicy = d.price_display_policy === 'SHOW_VALUE' || d.price_display_policy === 'SUPPRESS_VALUE';
  const validCta =
    d.cta_type === 'VIEW_PRICE'
    || d.cta_type === 'REQUEST_QUOTE'
    || d.cta_type === 'CONTACT_SUPPLIER'
    || d.cta_type === 'LOGIN_TO_VIEW'
    || d.cta_type === 'CHECK_ELIGIBILITY';

  return typeof d.price_label === 'string'
    && typeof d.price_value_visible === 'boolean'
    && validPolicy
    && validCta;
}

export function resolvePdpPriceDisclosureModel(
  disclosure: BuyerPriceDisclosure | null | undefined | unknown,
): PdpPriceDisclosureRenderModel {
  if (!isValidDisclosure(disclosure)) {
    return DISCLOSURE_FALLBACK;
  }

  const ctaLabelMap: Record<BuyerPriceDisclosure['cta_type'], string> = {
    VIEW_PRICE: 'View price state',
    REQUEST_QUOTE: 'Request quote',
    CONTACT_SUPPLIER: 'Contact supplier',
    LOGIN_TO_VIEW: 'Login to view',
    CHECK_ELIGIBILITY: 'Check eligibility',
  };

  const ctaSubLabelMap: Record<BuyerPriceDisclosure['cta_type'], string> = {
    VIEW_PRICE: 'Price visibility state is active',
    REQUEST_QUOTE: CATALOG_PDP_PRICE_PLACEHOLDER_SUBLABEL,
    CONTACT_SUPPLIER: 'Contact supplier for pricing details',
    LOGIN_TO_VIEW: 'Sign in is required before price visibility can be shown',
    CHECK_ELIGIBILITY: 'Buyer eligibility is required before price visibility can be shown',
  };

  if (disclosure.price_display_policy === 'SUPPRESS_VALUE' || !disclosure.price_value_visible) {
    return {
      label: disclosure.price_label || CATALOG_PDP_PRICE_PLACEHOLDER_LABEL,
      subLabel: ctaSubLabelMap[disclosure.cta_type] || CATALOG_PDP_PRICE_PLACEHOLDER_SUBLABEL,
      ctaLabel: ctaLabelMap[disclosure.cta_type] || 'Request quote',
      ctaType: disclosure.cta_type,
      eligibilityReason: disclosure.eligibility_reason,
    };
  }

  // Visible-state readiness in Slice C: do not invent or render amount values.
  return {
    label: disclosure.price_label || CATALOG_PDP_PRICE_PLACEHOLDER_LABEL,
    subLabel: ctaSubLabelMap[disclosure.cta_type],
    ctaLabel: ctaLabelMap[disclosure.cta_type],
    ctaType: disclosure.cta_type,
    eligibilityReason: disclosure.eligibility_reason,
  };
}

// ---------------------------------------------------------------------------
// P-4: RFQ trigger payload type and validator
// ---------------------------------------------------------------------------

export type RfqTriggerPayload = {
  readonly itemId: string;
  readonly supplierId: string;
  readonly itemTitle: string;
  readonly category: string | null;
  readonly stage: string | null;
};

export function validateRfqTriggerPayload(
  payload: RfqTriggerPayload,
): { valid: boolean; error: string | null } {
  if (!payload.itemId || payload.itemId.trim().length === 0) {
    return { valid: false, error: 'RFQ trigger requires a valid itemId.' };
  }
  if (!payload.supplierId || payload.supplierId.trim().length === 0) {
    return { valid: false, error: 'RFQ trigger requires a valid supplierId.' };
  }
  if (!payload.itemTitle || payload.itemTitle.trim().length === 0) {
    return { valid: false, error: 'RFQ trigger requires a valid itemTitle.' };
  }
  return { valid: true, error: null };
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
   * P-4: passes full RfqTriggerPayload (5 safe fields) â€” no prefill, no auto-submit.
   * Auto-submit and multi-item basket remain forbidden.
   */
  onRequestQuote: (payload: RfqTriggerPayload) => void;  /** AI-pipeline recommended suppliers. Optional — never required. */
  recommendedSuppliers?: RecommendedSuppliersResponse | null;
  /** True while recommendations are loading. */
  recommendedSuppliersLoading?: boolean;
  /** Non-null = suppressed silently — AI errors are never surfaced to buyers. */
  recommendedSuppliersError?: string | null;}>;

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
  if (item.media.length === 0) {
    return (
      <section
        data-testid="buyer-catalog-pdp-media-gallery"
        className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden"
      >
        <div
          className="flex h-48 items-center justify-center text-sm text-slate-400"
          role="img"
          aria-label={`${item.title} â€” no images uploaded`}
        >
          {CATALOG_PDP_MEDIA_EMPTY_COPY}
        </div>
      </section>
    );
  }

  // Sort by displayOrder before rendering â€” no raw storage paths in DOM.
  const sorted = [...item.media].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <section
      data-testid="buyer-catalog-pdp-media-gallery"
      className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden"
    >
      {/* Primary image */}
      <img
        src={sorted[0]!.signedUrl}
        alt={resolveMediaAltText(sorted[0]!.altText, item.title)}
        className="w-full h-64 object-cover sm:h-80"
        loading="lazy"
      />
      {/* Thumbnail strip for additional media */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3 bg-white border-t border-slate-100">
          {sorted.map((m) => (
            <div
              key={m.mediaId}
              className="relative flex-none w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
            >
              <img
                src={m.signedUrl}
                alt={resolveMediaAltText(m.altText, item.title)}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[9px] font-semibold px-1 py-0.5 text-center truncate">
                {resolveMediaTypeBadge(m)}
              </span>
            </div>
          ))}
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
  const { availabilitySummary } = item;
  return (
    <section
      data-testid="buyer-catalog-pdp-supplier-summary"
      className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-3"
    >
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Supplier</h2>
      <p className="text-base font-semibold text-slate-900">{item.supplierDisplayName}</p>
      <dl className="space-y-1.5 border-t border-slate-100 pt-3">
        <div className="flex justify-between text-sm">
          <dt className="text-slate-500">Min. Order</dt>
          <dd className="font-medium text-slate-900">
            {resolveMoqDisplay(availabilitySummary.moqValue, availabilitySummary.moqUnit)}
          </dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-slate-500">Lead Time</dt>
          <dd className="font-medium text-slate-900">
            {resolveLeadTimeDisplay(availabilitySummary.leadTimeDays)}
          </dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-slate-500">Capacity</dt>
          <dd className="font-medium text-slate-900 capitalize">
            {resolveCapacityDisplay(availabilitySummary.capacityIndicator)}
          </dd>
        </div>
      </dl>
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
          {CATALOG_PDP_COMPLIANCE_EMPTY_COPY}
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
            {resolveMoqDisplay(availabilitySummary.moqValue, availabilitySummary.moqUnit)}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Lead Time</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">
            {resolveLeadTimeDisplay(availabilitySummary.leadTimeDays)}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Capacity</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 capitalize">
            {resolveCapacityDisplay(availabilitySummary.capacityIndicator)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function PdpPriceDisclosurePanel({
  item,
}: Readonly<{ item: BuyerCatalogPdpView }>) {
  const disclosureModel = resolvePdpPriceDisclosureModel(item.priceDisclosure);

  return (
    <section
      data-testid="buyer-catalog-pdp-price-placeholder"
      className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 space-y-1"
    >
      <p
        data-testid="buyer-catalog-pdp-price-disclosure-label"
        className="text-base font-semibold text-slate-700"
      >
        {disclosureModel.label}
      </p>
      <p
        data-testid="buyer-catalog-pdp-price-disclosure-sublabel"
        className="text-sm text-slate-500"
      >
        {disclosureModel.subLabel}
      </p>
      <span
        data-testid="buyer-catalog-pdp-price-disclosure-cta"
        className="inline-flex mt-2 items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
      >
        {disclosureModel.ctaLabel}
      </span>
      {disclosureModel.eligibilityReason != null && disclosureModel.eligibilityReason.length > 0 && (
        <p
          data-testid="buyer-catalog-pdp-price-disclosure-reason"
          className="text-[11px] text-slate-500"
        >
          {disclosureModel.eligibilityReason}
        </p>
      )}
    </section>
  );
}

function PdpRfqEntry({
  item,
  onRequestQuote,
}: Readonly<{
  item: BuyerCatalogPdpView;
  onRequestQuote: (payload: RfqTriggerPayload) => void;
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
            category: item.rfqEntry.category,
            stage: item.rfqEntry.stage,
          })
        }
        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
      >
        {CATALOG_PDP_RFQ_TRIGGER_LABEL}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------// RecommendedSuppliersPanel — Slice G (TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001)
// ---------------------------------------------------------------------------

/**
 * Renders AI-matched supplier recommendations on the buyer PDP surface.
 *
 * Safety boundaries:
 * - Error state → returns null (no AI error exposed to buyers)
 * - Fallback / empty → renders empty copy
 * - Loading → renders loading copy
 * - Items present → renders up to 5 safe supplier cards
 * - NO score, rank, confidence, price, or relationship state in any output
 */
function RecommendedSuppliersPanel({
  data,
  loading,
  error,
}: Readonly<{
  data: RecommendedSuppliersResponse | null | undefined;
  loading: boolean | undefined;
  error: string | null | undefined;
}>) {
  // Loading state
  if (loading === true) {
    return (
      <section
        data-testid="buyer-catalog-recommended-suppliers-panel"
        className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3"
      >
        <h2 className="text-base font-semibold text-slate-800">
          {CATALOG_PDP_RECOMMENDED_HEADING}
        </h2>
        <p className="text-sm text-slate-500">{CATALOG_PDP_RECOMMENDED_LOADING_COPY}</p>
      </section>
    );
  }

  // Error: suppress silently — never surface AI errors to buyers
  if (error != null) {
    return null;
  }

  // Empty / fallback: show placeholder
  if (data == null || data.fallback || data.items.length === 0) {
    return (
      <section
        data-testid="buyer-catalog-recommended-suppliers-panel"
        className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3"
      >
        <h2 className="text-base font-semibold text-slate-800">
          {CATALOG_PDP_RECOMMENDED_HEADING}
        </h2>
        <p className="text-sm text-slate-500">{CATALOG_PDP_RECOMMENDED_EMPTY_COPY}</p>
      </section>
    );
  }

  return (
    <section
      data-testid="buyer-catalog-recommended-suppliers-panel"
      className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
    >
      <h2 className="text-base font-semibold text-slate-800">
        {CATALOG_PDP_RECOMMENDED_HEADING}
      </h2>
      <ul className="space-y-3">
        {data.items.map((supplier, idx) => (
          <li
            key={idx}
            data-testid="buyer-catalog-recommended-supplier-card"
            className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-col gap-2"
          >
            <p
              data-testid="buyer-catalog-recommended-supplier-name"
              className="text-sm font-medium text-slate-800"
            >
              {supplier.supplierDisplayName}
            </p>
            {supplier.matchLabels.length > 0 && (
              <ul
                data-testid="buyer-catalog-recommended-supplier-labels"
                className="flex flex-wrap gap-1.5"
              >
                {supplier.matchLabels.map((label, i) => (
                  <li
                    key={i}
                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            )}
            <span
              data-testid="buyer-catalog-recommended-supplier-cta"
              className="text-xs font-medium text-indigo-600"
            >
              {supplier.cta === 'REQUEST_QUOTE'
                ? 'Request quote'
                : supplier.cta === 'REQUEST_ACCESS'
                  ? 'Request access'
                  : 'View catalog'}
            </span>
          </li>
        ))}
      </ul>
      <p
        data-testid="buyer-catalog-recommended-suppliers-disclaimer"
        className="text-xs text-slate-400 leading-relaxed"
      >
        {CATALOG_PDP_RECOMMENDED_DISCLAIMER}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------// CatalogPdpSurface â€” main export
// ---------------------------------------------------------------------------

export function CatalogPdpSurface({
  item,
  loading,
  error,
  onBack,
  onRequestQuote,
  recommendedSuppliers,
  recommendedSuppliersLoading,
  recommendedSuppliersError,
}: CatalogPdpSurfaceProps) {
  // Back button â€” always visible so user can escape any state.
  const BackButton = (
    <button
      type="button"
      data-testid="buyer-catalog-pdp-back-button"
      onClick={onBack}
      className="text-slate-400 text-sm hover:text-slate-700 transition"
    >
      â† Back to catalog
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

  // Defensive check â€” item should be non-null here; caught above otherwise.
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
          <PdpPriceDisclosurePanel item={item} />
          <PdpRfqEntry item={item} onRequestQuote={onRequestQuote} />
          <PdpSupplierSummary item={item} />
        </div>
      </div>

      <RecommendedSuppliersPanel
        data={recommendedSuppliers}
        loading={recommendedSuppliersLoading}
        error={recommendedSuppliersError}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// P-4 test helpers export
// ---------------------------------------------------------------------------

export const __CATALOG_PDP_RFQ_TESTING__ = {
  validateRfqTriggerPayload,
};
