import React from 'react';

export const REFERENCE_SUPPLIER_PROFILE_LABEL = 'Reference supplier profile';
export const REFERENCE_PRODUCT_PREVIEW_LABEL = 'Reference product preview';
export const SAMPLE_COLLECTION_LABEL = 'Sample collection';
export const NOT_LIVE_COMMERCIAL_OFFER_COPY = 'Not a live commercial offer';
export const REFERENCE_PREVIEW_HEADLINE = 'Reference preview - see how this works before your business goes live.';
export const LIVE_PROFILES_AND_PRODUCTS_REPLACE_COPY =
  'Live profiles/products replace examples as businesses onboard.';
export const LIVE_COLLECTIONS_REPLACE_COPY =
  'Live collections replace samples as brands, designers, and suppliers onboard.';

type Tone = 'light' | 'dark';

interface ReferencePreviewBadgeProps {
  readonly label: string;
  readonly tone?: Tone;
}

export function ReferencePreviewBadge({
  label,
  tone = 'light',
}: ReferencePreviewBadgeProps) {
  const className =
    tone === 'dark'
      ? 'inline-flex items-center rounded-full border border-[#7fd5de]/40 bg-[#0d2743] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a6e9f0]'
      : 'inline-flex items-center rounded-full border border-[#f0d8b1] bg-[#fff7eb] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a5a00]';

  return <span className={className}>{label}</span>;
}

interface ReferencePreviewNoticeProps {
  readonly label: string;
  readonly replacementCopy: string;
  readonly tone?: Tone;
  readonly detail?: string;
}

export function ReferencePreviewNotice({
  label,
  replacementCopy,
  tone = 'light',
  detail = NOT_LIVE_COMMERCIAL_OFFER_COPY,
}: ReferencePreviewNoticeProps) {
  const sectionClassName =
    tone === 'dark'
      ? 'rounded-[28px] border border-[#7fd5de]/20 bg-[#0d2743] px-6 py-5 text-white'
      : 'rounded-[28px] border border-[#f0d8b1] bg-[#fff7eb] px-6 py-5';
  const titleClassName = tone === 'dark' ? 'text-white' : 'text-[#0a2036]';
  const bodyClassName = tone === 'dark' ? 'text-slate-200' : 'text-slate-600';
  const footerClassName = tone === 'dark' ? 'text-[#f8d8ab]' : 'text-[#9a5a00]';

  return (
    <section className={sectionClassName} aria-label={label}>
      <div className="flex flex-wrap items-center gap-3">
        <ReferencePreviewBadge label={label} tone={tone} />
        <p className={`text-sm font-semibold ${titleClassName}`}>{REFERENCE_PREVIEW_HEADLINE}</p>
      </div>
      <p className={`mt-3 text-sm leading-6 ${bodyClassName}`}>{detail}</p>
      <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.18em] ${footerClassName}`}>
        {replacementCopy}
      </p>
    </section>
  );
}