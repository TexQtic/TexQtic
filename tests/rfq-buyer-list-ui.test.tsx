import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
}));

import { BuyerRfqListSurface } from '../components/Tenant/BuyerRfqListSurface';
import { getBuyerRfqs, type BuyerRfqListItem } from '../services/catalogService';
import { tenantGet } from '../services/tenantApiClient';

const tenantGetMock = vi.mocked(tenantGet);

function makeBuyerRfqListItem(overrides: Partial<BuyerRfqListItem> = {}): BuyerRfqListItem {
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
    ...overrides,
  };
}

function renderHtml(rfqs: BuyerRfqListItem[], options?: { loading?: boolean; error?: string | null }) {
  return renderToStaticMarkup(
    <BuyerRfqListSurface
      rfqs={rfqs}
      loading={options?.loading ?? false}
      error={options?.error ?? null}
      onViewDetail={() => undefined}
      onBack={() => undefined}
    />
  );
}

function collectElements(node: React.ReactNode): React.ReactElement[] {
  if (!node) {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectElements);
  }

  if (!React.isValidElement(node)) {
    return [];
  }

  if (typeof node.type === 'function') {
    return collectElements(node.type(node.props));
  }

  return [node, ...collectElements(node.props.children)];
}

describe('TECS-RFQ-BUYER-LIST-READ-001 — buyer RFQ list fetch', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('calls the existing buyer RFQ list endpoint and returns the contract payload', async () => {
    const rfq = makeBuyerRfqListItem();
    tenantGetMock.mockResolvedValue({ rfqs: [rfq], count: 1 });

    const result = await getBuyerRfqs();

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/rfqs');
    expect(result.rfqs).toEqual([rfq]);
    expect(result.count).toBe(1);
  });
});

describe('TECS-RFQ-BUYER-LIST-READ-001 — buyer RFQ list surface', () => {
  it('renders list entries from the existing buyer RFQ list contract', () => {
    const html = renderHtml([
      makeBuyerRfqListItem(),
      makeBuyerRfqListItem({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        status: 'OPEN',
        item_name: 'Organic Linen Blend',
        item_sku: null,
      }),
    ]);

    expect(html).toContain('My RFQs');
    expect(html).toContain('Italian Cotton Twill');
    expect(html).toContain('Organic Linen Blend');
    expect(html).toContain('Status: RESPONDED');
    expect(html).toContain('Status: OPEN');
    expect(html).toContain('SKU unavailable');
    expect(html).toContain('View Detail');
  });

  it('renders a stable empty state when no RFQs exist', () => {
    const html = renderHtml([]);

    expect(html).toContain('No buyer RFQs are available yet. When you submit one, it will appear here for read-only discovery.');
  });

  it('renders a safe error state when the list fetch fails', () => {
    const html = renderHtml([], { error: 'Unable to load your RFQs right now.' });

    expect(html).toContain('Unable to load your RFQs right now.');
    expect(html).toContain('Your RFQ discovery surface is unavailable right now, but no RFQ workflow state has changed.');
  });

  it('invokes the detail callback when a buyer selects a list item', () => {
    const onViewDetail = vi.fn();
    const rfq = makeBuyerRfqListItem();

    const tree = BuyerRfqListSurface({
      rfqs: [rfq],
      loading: false,
      error: null,
      onViewDetail,
      onBack: () => undefined,
    });

    const viewButton = collectElements(tree).find(
      element => element.type === 'button' && element.props.children === 'View Detail'
    );

    expect(viewButton).toBeDefined();
    viewButton?.props.onClick();
    expect(onViewDetail).toHaveBeenCalledWith(rfq.id);
  });

  it('does not render forbidden pricing or negotiation controls', () => {
    const html = renderHtml([makeBuyerRfqListItem()]);

    expect(html).not.toContain('Quote Total');
    expect(html).not.toContain('Accept RFQ');
    expect(html).not.toContain('Counter-offer');
    expect(html).not.toContain('Negotiation');
    expect(html).not.toContain('Message Thread');
  });
});