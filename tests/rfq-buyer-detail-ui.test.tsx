import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
}));

import { BuyerRfqDetailSurface } from '../components/Tenant/BuyerRfqDetailSurface';
import { getBuyerRfqDetail, type BuyerRfqDetail } from '../services/catalogService';
import { tenantGet } from '../services/tenantApiClient';

const tenantGetMock = vi.mocked(tenantGet);

function makeBuyerRfqDetail(overrides: Partial<BuyerRfqDetail> = {}): BuyerRfqDetail {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    status: 'RESPONDED',
    catalog_item_id: '22222222-2222-2222-2222-222222222222',
    item_name: 'Italian Cotton Twill',
    item_sku: 'COT-TWL-001',
    quantity: 240,
    supplier_org_id: '33333333-3333-3333-3333-333333333333',
    created_at: '2026-03-01T10:00:00.000Z',
    updated_at: '2026-03-03T15:30:00.000Z',
    buyer_message: 'Need delivery timing and packaging notes.',
    created_by_user_id: '44444444-4444-4444-4444-444444444444',
    supplier_response: {
      id: '55555555-5555-5555-5555-555555555555',
      supplier_org_id: '33333333-3333-3333-3333-333333333333',
      message: 'We can supply this request within 10 business days.',
      submitted_at: '2026-03-03T15:00:00.000Z',
      created_at: '2026-03-03T15:00:00.000Z',
    },
    ...overrides,
  };
}

function renderHtml(rfq: BuyerRfqDetail | null, options?: { loading?: boolean; error?: string | null }) {
  return renderToStaticMarkup(
    <BuyerRfqDetailSurface
      rfq={rfq}
      loading={options?.loading ?? false}
      error={options?.error ?? null}
      onBack={() => undefined}
      onClose={() => undefined}
    />
  );
}

describe('TECS-RFQ-BUYER-DETAIL-UI-001 — buyer RFQ detail fetch', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('calls the existing buyer RFQ detail endpoint and returns the contract payload', async () => {
    const rfq = makeBuyerRfqDetail();
    tenantGetMock.mockResolvedValue({ rfq });

    const result = await getBuyerRfqDetail(rfq.id);

    expect(tenantGetMock).toHaveBeenCalledWith(`/api/tenant/rfqs/${rfq.id}`);
    expect(result.rfq).toEqual(rfq);
  });
});

describe('TECS-RFQ-BUYER-DETAIL-UI-001 — buyer RFQ detail surface', () => {
  it('renders core RFQ detail fields and bounded supplier response when present', () => {
    const html = renderHtml(makeBuyerRfqDetail());

    expect(html).toContain('RFQ Detail');
    expect(html).toContain('Status: RESPONDED');
    expect(html).toContain('RFQ Reference');
    expect(html).toContain('Supplier Response');
    expect(html).toContain('Response Message');
    expect(html).toContain('Italian Cotton Twill');
    expect(html).toContain('COT-TWL-001');
    expect(html).toContain('Need delivery timing and packaging notes.');
    expect(html).toContain('We can supply this request within 10 business days.');
  });

  it('renders a stable empty state when no supplier response exists', () => {
    const html = renderHtml(makeBuyerRfqDetail({ status: 'OPEN', supplier_response: null }));

    expect(html).toContain('No supplier response has been shared yet. If the supplier replies later, the response will appear here without changing the current RFQ workflow.');
    expect(html).not.toContain('We can supply this request within 10 business days.');
  });

  it('renders safe error state content for absent or forbidden detail reads', () => {
    const html = renderHtml(null, { error: 'RFQ not found.' });

    expect(html).toContain('RFQ not found.');
    expect(html).toContain('The current RFQ detail view is unavailable, but no RFQ workflow state has changed.');
  });

  it('does not render forbidden controls or pricing surfaces', () => {
    const html = renderHtml(makeBuyerRfqDetail());

    expect(html).not.toContain('Accept RFQ');
    expect(html).not.toContain('Counter-offer');
    expect(html).not.toContain('Negotiation');
    expect(html).not.toContain('Quote Total');
  });
});