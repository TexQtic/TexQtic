import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SupplierInquiryInboxSurface,
  type SupplierInquiryInboxItem,
} from '../components/Tenant/TenantAuditLogs';

function makeInquiry(overrides: Partial<SupplierInquiryInboxItem> = {}): SupplierInquiryInboxItem {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    inquiry_category: 'SOURCING_INTENT',
    source_surface: 'SUPPLIER_PROFILE',
    supplier_slug: 'shraddha-industries',
    product_slug: null,
    category_slug: null,
    collection_slug: null,
    geo_band: 'India',
    volume_band: 'pilot',
    inquiry_message: 'Need a pilot lot of cotton weave.',
    submitted_at: '2026-06-11T05:31:37.111Z',
    created_at: '2026-06-11T05:31:37.111Z',
    classification: 'QA_RUNTIME_VERIFICATION',
    ...overrides,
  };
}

function renderSurface(options?: {
  loading?: boolean;
  error?: string | null;
  inquiries?: SupplierInquiryInboxItem[];
  count?: number;
}) {
  return renderToStaticMarkup(
    <SupplierInquiryInboxSurface
      onBack={() => undefined}
      loading={options?.loading ?? false}
      error={options?.error ?? null}
      inquiries={options?.inquiries ?? []}
      count={options?.count ?? (options?.inquiries?.length ?? 0)}
      onRefresh={() => undefined}
    />,
  );
}

describe('SupplierInquiryInboxSurface', () => {
  it('renders loading state and required launch guardrails', () => {
    const html = renderSurface({ loading: true });

    expect(html).toContain('Supplier Inquiry Inbox');
    expect(html).toContain('Loading supplier inquiry inbox…');
    expect(html).toContain('No buyer contact details are collected in this launch version.');
    expect(html).toContain('Reply to buyer is not available in this launch version.');
    expect(html).toContain('QA/demo inquiries must not be treated as commercial leads.');
  });

  it('renders empty state', () => {
    const html = renderSurface({ inquiries: [], count: 0 });

    expect(html).toContain('No supplier inquiries yet');
    expect(html).toContain('Supplier-context inquiries will appear here once public inquiry events are recorded.');
  });

  it('renders error state', () => {
    const html = renderSurface({ error: 'Unable to load inquiry inbox.' });

    expect(html).toContain('Unable to load inquiry inbox.');
  });

  it('renders inquiry rows with classification badges and no reply controls', () => {
    const html = renderSurface({
      inquiries: [
        makeInquiry(),
        makeInquiry({
          id: '22222222-2222-2222-2222-222222222222',
          supplier_slug: 'lt-b2b-001',
          inquiry_category: 'GENERAL',
          classification: 'DEMO_PILOT',
        }),
        makeInquiry({
          id: '33333333-3333-3333-3333-333333333333',
          source_surface: 'PRODUCT_DETAIL',
          classification: 'REAL_BUYER_INTEREST',
          volume_band: 'bulk',
        }),
      ],
      count: 3,
    });

    expect(html).toContain('QA Runtime Verification');
    expect(html).toContain('Demo / Pilot');
    expect(html).toContain('Real Buyer Interest');
    expect(html).toContain('SUPPLIER_PROFILE');
    expect(html).toContain('PRODUCT_DETAIL');

    expect(html).not.toContain('Convert Lead');
    expect(html).not.toContain('Archive');
    expect(html).not.toContain('Mark Spam');
  });
});
