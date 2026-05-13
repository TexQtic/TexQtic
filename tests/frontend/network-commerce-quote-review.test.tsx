/**
 * FE-9 frontend tests — QuoteReviewPanel + award allocation service methods
 */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APIError } from '../../services/apiClient';

vi.mock('../../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
  tenantPatch: vi.fn(),
}));

import { tenantGet, tenantPost } from '../../services/tenantApiClient';
import { QuoteReviewPanel } from '../../components/Tenant/NetworkCommerce/QuoteReviewPanel';

const tenantGetMock = vi.mocked(tenantGet);
const tenantPostMock = vi.mocked(tenantPost);

const POOL_ID = 'pppppppp-pppp-pppp-pppp-pppppppppppp';
const RFQ_ID = 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr';
const QUOTE_ID = 'qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq';

function quotesEndpoint(): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/quotes`;
}

function acceptEndpoint(quoteId: string): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/quotes/${quoteId}/accept`;
}

function rejectEndpoint(quoteId: string): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/quotes/${quoteId}/reject`;
}

function makeOwnerQuote(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: QUOTE_ID,
    owner_org_id: 'owner-org',
    supplier_org_id: 'supplier-org',
    rfq_id: RFQ_ID,
    pool_id: POOL_ID,
    invite_id: 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
    quote_ref: 'QUO-901',
    status: 'SUBMITTED',
    quote_amount: '15000.00',
    currency: 'USD',
    validity_until: '2026-08-01T00:00:00.000Z',
    supplier_note: 'Best FOB pricing available',
    submitted_at: '2026-06-15T09:00:00.000Z',
    submitted_by_user_id: null,
    withdrawn_at: null,
    accepted_at: null,
    rejected_at: null,
    reject_reason: null,
    created_at: '2026-06-15T09:00:00.000Z',
    updated_at: '2026-06-15T09:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  tenantGetMock.mockReset();
  tenantPostMock.mockReset();
});

afterEach(() => {
  cleanup();
});

// ─── service endpoint path tests ─────────────────────────────────────────────

describe('FE-9 service: getOwnerQuotesForRfq', () => {
  it('calls the correct GET endpoint path', async () => {
    tenantGetMock.mockResolvedValue([makeOwnerQuote()]);
    const { getOwnerQuotesForRfq } = await import('../../services/networkCommerceService');
    await getOwnerQuotesForRfq(POOL_ID, RFQ_ID);
    expect(tenantGetMock).toHaveBeenCalledWith(quotesEndpoint());
  });
});

describe('FE-9 service: acceptQuoteForRfq', () => {
  it('calls the correct POST endpoint with request_id body', async () => {
    tenantPostMock.mockResolvedValue(makeOwnerQuote({ status: 'ACCEPTED', accepted_at: '2026-06-15T10:00:00.000Z' }));
    const { acceptQuoteForRfq } = await import('../../services/networkCommerceService');
    await acceptQuoteForRfq(POOL_ID, RFQ_ID, QUOTE_ID, 'req-001');
    expect(tenantPostMock).toHaveBeenCalledWith(acceptEndpoint(QUOTE_ID), { request_id: 'req-001' });
  });

  it('sends null request_id when not provided', async () => {
    tenantPostMock.mockResolvedValue(makeOwnerQuote({ status: 'ACCEPTED' }));
    const { acceptQuoteForRfq } = await import('../../services/networkCommerceService');
    await acceptQuoteForRfq(POOL_ID, RFQ_ID, QUOTE_ID);
    expect(tenantPostMock).toHaveBeenCalledWith(acceptEndpoint(QUOTE_ID), { request_id: null });
  });
});

describe('FE-9 service: rejectQuoteForRfq', () => {
  it('calls the correct POST endpoint with reject_reason and request_id', async () => {
    tenantPostMock.mockResolvedValue(makeOwnerQuote({ status: 'REJECTED', reject_reason: 'Price too high', rejected_at: '2026-06-15T11:00:00.000Z' }));
    const { rejectQuoteForRfq } = await import('../../services/networkCommerceService');
    await rejectQuoteForRfq(POOL_ID, RFQ_ID, QUOTE_ID, 'Price too high', 'req-002');
    expect(tenantPostMock).toHaveBeenCalledWith(rejectEndpoint(QUOTE_ID), {
      reject_reason: 'Price too high',
      request_id: 'req-002',
    });
  });

  it('sends null values when reason and requestId are omitted', async () => {
    tenantPostMock.mockResolvedValue(makeOwnerQuote({ status: 'REJECTED' }));
    const { rejectQuoteForRfq } = await import('../../services/networkCommerceService');
    await rejectQuoteForRfq(POOL_ID, RFQ_ID, QUOTE_ID);
    expect(tenantPostMock).toHaveBeenCalledWith(rejectEndpoint(QUOTE_ID), {
      reject_reason: null,
      request_id: null,
    });
  });
});

// ─── QuoteReviewPanel component tests ────────────────────────────────────────

describe('FE-9 QuoteReviewPanel — feature-disabled (503)', () => {
  it('renders feature-disabled state on 503 FEATURE_DISABLED', async () => {
    tenantGetMock.mockRejectedValue(new APIError(503, 'FEATURE_DISABLED', 'Feature disabled'));
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('RFQ Award Review Disabled')).toBeInTheDocument();
    });
  });

  it('does not render accept or reject buttons when feature-disabled', async () => {
    tenantGetMock.mockRejectedValue(new APIError(503, 'FEATURE_DISABLED', 'Feature disabled'));
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('RFQ Award Review Disabled')).toBeInTheDocument();
    });
    expect(screen.queryByText('Accept Quote')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject Quote')).not.toBeInTheDocument();
  });

  it('shows the feature flag name in the disabled banner', async () => {
    tenantGetMock.mockRejectedValue(new APIError(503, 'FEATURE_DISABLED', 'Feature disabled'));
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('nc.procurement_pools.rfq.award.enabled')).toBeInTheDocument();
    });
  });
});

describe('FE-9 QuoteReviewPanel — empty state', () => {
  it('renders empty state when no quotes returned', async () => {
    tenantGetMock.mockResolvedValue([]);
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('No Quotes Yet')).toBeInTheDocument();
    });
  });
});

describe('FE-9 QuoteReviewPanel — submitted quote', () => {
  it('renders a SUBMITTED quote with amount, currency and supplier note', async () => {
    tenantGetMock.mockResolvedValue([makeOwnerQuote()]);
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('QUO-901')).toBeInTheDocument();
    });
    expect(screen.getByText(/15,000/)).toBeInTheDocument();
    expect(screen.getByText('Best FOB pricing available')).toBeInTheDocument();
  });

  it('renders Accept Quote and Reject Quote buttons for SUBMITTED status', async () => {
    tenantGetMock.mockResolvedValue([makeOwnerQuote()]);
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept quote quo-901/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject quote quo-901/i })).toBeInTheDocument();
    });
  });
});

describe('FE-9 QuoteReviewPanel — accepted quote', () => {
  it('renders ACCEPTED quote with Winning Quote badge', async () => {
    tenantGetMock.mockResolvedValue([
      makeOwnerQuote({ status: 'ACCEPTED', accepted_at: '2026-06-15T10:00:00.000Z' }),
    ]);
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('Winning Quote')).toBeInTheDocument();
      expect(screen.getByText('Accepted')).toBeInTheDocument();
    });
  });

  it('does not render accept/reject controls for ACCEPTED quote', async () => {
    tenantGetMock.mockResolvedValue([
      makeOwnerQuote({ status: 'ACCEPTED', accepted_at: '2026-06-15T10:00:00.000Z' }),
    ]);
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('Winning Quote')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /accept quote/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject quote/i })).not.toBeInTheDocument();
  });
});

describe('FE-9 QuoteReviewPanel — rejected quote', () => {
  it('renders REJECTED quote with reject_reason when present', async () => {
    tenantGetMock.mockResolvedValue([
      makeOwnerQuote({
        status: 'REJECTED',
        rejected_at: '2026-06-15T11:00:00.000Z',
        reject_reason: 'Price above budget threshold',
      }),
    ]);
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(screen.getByText('Price above budget threshold')).toBeInTheDocument();
    });
  });
});

describe('FE-9 QuoteReviewPanel — data safety', () => {
  it('does not render metadataInternalJson or withdraw_reason fields', async () => {
    const quoteWithForbiddenFields = {
      ...makeOwnerQuote(),
      metadata_internal_json: '{"internal": "secret"}',
      metadataInternalJson: '{"internal": "secret"}',
      withdraw_reason: 'supplier withdrew for internal reasons',
    };
    tenantGetMock.mockResolvedValue([quoteWithForbiddenFields]);
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('QUO-901')).toBeInTheDocument();
    });
    expect(screen.queryByText(/internal.*secret/i)).not.toBeInTheDocument();
    expect(screen.queryByText('supplier withdrew for internal reasons')).not.toBeInTheDocument();
  });
});

describe('FE-9 QuoteReviewPanel — accept action', () => {
  it('calls acceptQuoteForRfq service and refreshes quote list on success', async () => {
    const submittedQuote = makeOwnerQuote();
    const acceptedQuote = makeOwnerQuote({ status: 'ACCEPTED', accepted_at: '2026-06-15T10:00:00.000Z' });
    tenantGetMock
      .mockResolvedValueOnce([submittedQuote])
      .mockResolvedValueOnce([acceptedQuote]);
    tenantPostMock.mockResolvedValue(acceptedQuote);

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept quote quo-901/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /accept quote quo-901/i }));
    expect(tenantPostMock).toHaveBeenCalledWith(acceptEndpoint(QUOTE_ID), { request_id: null });

    await waitFor(() => {
      expect(screen.getByText('Winning Quote')).toBeInTheDocument();
    });
  });
});

describe('FE-9 QuoteReviewPanel — reject action', () => {
  it('opens reject dialog and calls rejectQuoteForRfq with reason on confirm', async () => {
    const submittedQuote = makeOwnerQuote();
    const rejectedQuote = makeOwnerQuote({
      status: 'REJECTED',
      rejected_at: '2026-06-15T12:00:00.000Z',
      reject_reason: 'Over budget',
    });
    tenantGetMock
      .mockResolvedValueOnce([submittedQuote])
      .mockResolvedValueOnce([rejectedQuote]);
    tenantPostMock.mockResolvedValue(rejectedQuote);

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject quote quo-901/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reject quote quo-901/i }));

    // Dialog opens
    expect(screen.getByRole('dialog', { name: 'Reject quote' })).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Optional reason for rejection');
    fireEvent.change(textarea, { target: { value: 'Over budget' } });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Reject' }));

    expect(tenantPostMock).toHaveBeenCalledWith(rejectEndpoint(QUOTE_ID), {
      reject_reason: 'Over budget',
      request_id: null,
    });

    await waitFor(() => {
      expect(screen.getByText('Over budget')).toBeInTheDocument();
    });
  });
});
