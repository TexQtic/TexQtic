/**
 * FE-8 frontend tests — SupplierQuoteSurface + SupplierInviteInbox quote integration
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
import { SupplierQuoteSurface } from '../../components/Tenant/NetworkCommerce/SupplierQuoteSurface';
import { SupplierInviteInbox } from '../../components/Tenant/NetworkCommerce/SupplierInviteInbox';

const tenantGetMock = vi.mocked(tenantGet);
const tenantPostMock = vi.mocked(tenantPost);

const INVITE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function quoteEndpoint(inviteId: string): string {
  return `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/quote`;
}

function listEndpoint(): string {
  return '/api/tenant/network-commerce/supplier-rfq-invites';
}

function makeQuote(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq',
    invite_id: INVITE_ID,
    quote_ref: 'QUO-001',
    status: 'SUBMITTED',
    quote_amount: '12500.00',
    currency: 'USD',
    validity_until: '2026-07-01T00:00:00.000Z',
    supplier_note: 'All prices FOB Mumbai',
    submitted_at: '2026-06-05T10:00:00.000Z',
    submitted_by_user_id: null,
    withdrawn_at: null,
    withdraw_reason: null,
    created_at: '2026-06-05T10:00:00.000Z',
    updated_at: '2026-06-05T10:00:00.000Z',
    ...overrides,
  };
}

function makeInboxItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: INVITE_ID,
    invite_ref: 'INV-007',
    status: 'ACCEPTED',
    invited_at: '2026-05-10T12:00:00.000Z',
    accepted_at: '2026-05-11T08:00:00.000Z',
    declined_at: null,
    expires_at: '2026-06-10T12:00:00.000Z',
    supplier_message: 'Please join this RFQ',
    rfq_ref: 'RFQ-001',
    rfq_version: 1,
    rfq_status: 'ISSUED',
    issued_at: '2026-05-09T10:00:00.000Z',
    response_deadline_at: '2026-05-30T23:59:00.000Z',
    issue_basis: 'DEMAND_SNAPSHOT',
    line_count: 3,
    total_qty: '1500.00',
    qty_unit: 'MT',
    created_at: '2026-05-10T12:00:00.000Z',
    updated_at: '2026-05-11T08:00:00.000Z',
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

describe('FE-8 service: getSupplierQuoteForInvite', () => {
  it('calls the correct GET endpoint path', async () => {
    tenantGetMock.mockResolvedValue(makeQuote());
    const { getSupplierQuoteForInvite } = await import('../../services/networkCommerceService');
    await getSupplierQuoteForInvite(INVITE_ID);
    expect(tenantGetMock).toHaveBeenCalledWith(quoteEndpoint(INVITE_ID));
  });
});

describe('FE-8 service: submitSupplierQuoteForInvite', () => {
  it('calls the correct POST endpoint path with expected body', async () => {
    tenantPostMock.mockResolvedValue(makeQuote());
    const { submitSupplierQuoteForInvite } = await import('../../services/networkCommerceService');
    await submitSupplierQuoteForInvite(INVITE_ID, {
      quote_amount: '12500.00',
      currency: 'USD',
      validity_until: null,
      supplier_note: null,
    });
    expect(tenantPostMock).toHaveBeenCalledWith(quoteEndpoint(INVITE_ID), {
      quote_amount: '12500.00',
      currency: 'USD',
      validity_until: null,
      supplier_note: null,
      request_id: null,
    });
  });
});

// ─── SupplierQuoteSurface component tests ────────────────────────────────────

describe('FE-8 SupplierQuoteSurface — feature-disabled (503)', () => {
  it('renders feature-disabled state on 503 FEATURE_DISABLED', async () => {
    tenantGetMock.mockRejectedValue(
      new APIError(503, 'Feature disabled', 'FEATURE_DISABLED'),
    );
    render(<SupplierQuoteSurface inviteId={INVITE_ID} onBack={vi.fn()} />);
    expect(await screen.findByText('Supplier Quote Submission Disabled')).toBeInTheDocument();
  });
});

describe('FE-8 SupplierQuoteSurface — no quote (404 SUPPLIER_QUOTE_NOT_FOUND)', () => {
  it('renders submit form when no quote exists', async () => {
    tenantGetMock.mockRejectedValue(
      new APIError(404, 'Not found', 'SUPPLIER_QUOTE_NOT_FOUND'),
    );
    render(<SupplierQuoteSurface inviteId={INVITE_ID} onBack={vi.fn()} />);
    expect(await screen.findByText('Submit Your Quote')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. 12500/)).toBeInTheDocument();
  });
});

describe('FE-8 SupplierQuoteSurface — submitted quote read-only view', () => {
  it('renders submitted quote details when quote exists', async () => {
    tenantGetMock.mockResolvedValue(makeQuote());
    render(<SupplierQuoteSurface inviteId={INVITE_ID} onBack={vi.fn()} />);
    expect(await screen.findByText('Quote Submitted')).toBeInTheDocument();
    expect(screen.getByText('QUO-001')).toBeInTheDocument();
    expect(screen.getByText(/12500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/USD/)).toBeInTheDocument();
  });
});

describe('FE-8 SupplierQuoteSurface — submit valid quote', () => {
  it('submits valid form and shows submitted quote', async () => {
    tenantGetMock.mockRejectedValue(
      new APIError(404, 'Not found', 'SUPPLIER_QUOTE_NOT_FOUND'),
    );
    tenantPostMock.mockResolvedValue(makeQuote());

    render(<SupplierQuoteSurface inviteId={INVITE_ID} onBack={vi.fn()} />);
    await screen.findByText('Submit Your Quote');

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12500/), {
      target: { value: '12500.00' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. USD/), {
      target: { value: 'USD' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit Quote/i }));

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalledWith(
        quoteEndpoint(INVITE_ID),
        expect.objectContaining({
          quote_amount: '12500.00',
          currency: 'USD',
        }),
      );
    });

    expect(await screen.findByText('Quote Submitted')).toBeInTheDocument();
  });
});

describe('FE-8 SupplierQuoteSurface — duplicate quote (409)', () => {
  it('renders already-submitted state on 409 QUOTE_ALREADY_SUBMITTED', async () => {
    tenantGetMock.mockRejectedValue(
      new APIError(404, 'Not found', 'SUPPLIER_QUOTE_NOT_FOUND'),
    );
    tenantPostMock.mockRejectedValue(
      new APIError(409, 'Quote already submitted', 'QUOTE_ALREADY_SUBMITTED'),
    );

    render(<SupplierQuoteSurface inviteId={INVITE_ID} onBack={vi.fn()} />);
    await screen.findByText('Submit Your Quote');

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12500/), {
      target: { value: '500.00' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. USD/), {
      target: { value: 'EUR' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Quote/i }));

    expect(await screen.findByText('Quote Already Submitted')).toBeInTheDocument();
  });
});

describe('FE-8 SupplierQuoteSurface — invite not accepted (422)', () => {
  it('renders invite-not-accepted state on 422 INVITE_NOT_ACCEPTED', async () => {
    tenantGetMock.mockRejectedValue(
      new APIError(404, 'Not found', 'SUPPLIER_QUOTE_NOT_FOUND'),
    );
    tenantPostMock.mockRejectedValue(
      new APIError(422, 'Invite not accepted', 'INVITE_NOT_ACCEPTED'),
    );

    render(<SupplierQuoteSurface inviteId={INVITE_ID} onBack={vi.fn()} />);
    await screen.findByText('Submit Your Quote');

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12500/), {
      target: { value: '300.00' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. USD/), {
      target: { value: 'GBP' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Quote/i }));

    expect(await screen.findByText('Invite Not in Accepted State')).toBeInTheDocument();
  });
});

describe('FE-8 SupplierQuoteSurface — client-side validation', () => {
  it('blocks submission when quote_amount is empty', async () => {
    tenantGetMock.mockRejectedValue(
      new APIError(404, 'Not found', 'SUPPLIER_QUOTE_NOT_FOUND'),
    );
    render(<SupplierQuoteSurface inviteId={INVITE_ID} onBack={vi.fn()} />);
    await screen.findByText('Submit Your Quote');

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. USD/), {
      target: { value: 'USD' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Quote/i }));

    expect(await screen.findByText(/Quote amount is required/i)).toBeInTheDocument();
    expect(tenantPostMock).not.toHaveBeenCalled();
  });

  it('blocks submission when quote_amount is invalid (non-numeric)', async () => {
    tenantGetMock.mockRejectedValue(
      new APIError(404, 'Not found', 'SUPPLIER_QUOTE_NOT_FOUND'),
    );
    render(<SupplierQuoteSurface inviteId={INVITE_ID} onBack={vi.fn()} />);
    await screen.findByText('Submit Your Quote');

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12500/), {
      target: { value: 'abc' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. USD/), {
      target: { value: 'USD' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Quote/i }));

    expect(await screen.findByText(/Quote amount must be a positive number/i)).toBeInTheDocument();
    expect(tenantPostMock).not.toHaveBeenCalled();
  });

  it('blocks submission when currency is too short (< 3 chars)', async () => {
    tenantGetMock.mockRejectedValue(
      new APIError(404, 'Not found', 'SUPPLIER_QUOTE_NOT_FOUND'),
    );
    render(<SupplierQuoteSurface inviteId={INVITE_ID} onBack={vi.fn()} />);
    await screen.findByText('Submit Your Quote');

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12500/), {
      target: { value: '500' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. USD/), {
      target: { value: 'US' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Quote/i }));

    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();
    expect(tenantPostMock).not.toHaveBeenCalled();
  });
});

describe('FE-8 SupplierQuoteSurface — forbidden fields not rendered', () => {
  it('does not render metadata_internal_json, owner_org_id, rfq_id, or pool_id', async () => {
    const quoteWithForbidden = {
      ...makeQuote(),
      metadata_internal_json: { secret: 'ops-data' },
      owner_org_id: 'owner-org-secret-id',
      rfq_id: 'rfq-secret-id',
      pool_id: 'pool-secret-id',
    };
    tenantGetMock.mockResolvedValue(quoteWithForbidden);
    render(<SupplierQuoteSurface inviteId={INVITE_ID} onBack={vi.fn()} />);
    await screen.findByText('Quote Submitted');

    expect(screen.queryByText('owner-org-secret-id')).not.toBeInTheDocument();
    expect(screen.queryByText('rfq-secret-id')).not.toBeInTheDocument();
    expect(screen.queryByText('pool-secret-id')).not.toBeInTheDocument();
  });
});

// ─── SupplierInviteInbox quote integration tests ──────────────────────────────

describe('FE-8 SupplierInviteInbox — quote button for accepted invite', () => {
  it('shows Submit / View Quote button for ACCEPTED invite', async () => {
    const acceptedInvite = makeInboxItem({ status: 'ACCEPTED' });
    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) return [acceptedInvite];
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    expect(await screen.findByRole('button', { name: 'Submit / View Quote' })).toBeInTheDocument();
  });

  it('does not show Submit / View Quote button for PENDING invite', async () => {
    const pendingInvite = makeInboxItem({ status: 'PENDING' });
    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) return [pendingInvite];
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    await screen.findByRole('button', { name: 'Accept' });
    expect(screen.queryByRole('button', { name: 'Submit / View Quote' })).not.toBeInTheDocument();
  });

  it('navigates to SupplierQuoteSurface when Submit / View Quote is clicked', async () => {
    const acceptedInvite = makeInboxItem({ status: 'ACCEPTED' });
    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) return [acceptedInvite];
      // quote surface GET call
      if (endpoint === quoteEndpoint(INVITE_ID)) return makeQuote();
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    const quoteBtn = await screen.findByRole('button', { name: 'Submit / View Quote' });
    fireEvent.click(quoteBtn);

    // SupplierQuoteSurface should render (loads quote)
    expect(await screen.findByText('Supplier Quote')).toBeInTheDocument();
    expect(await screen.findByText('Quote Submitted')).toBeInTheDocument();
  });

  it('existing accept/decline tests unaffected — accept still works for PENDING invite', async () => {
    const pendingInvite = makeInboxItem({ status: 'PENDING' });
    const accepted = makeInboxItem({ status: 'ACCEPTED', accepted_at: '2026-05-11T08:00:00.000Z' });

    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) return [pendingInvite];
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });
    tenantPostMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === `/api/tenant/network-commerce/supplier-rfq-invites/${INVITE_ID}/accept`) return accepted;
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    await screen.findByRole('button', { name: 'Accept' });

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalledWith(
        `/api/tenant/network-commerce/supplier-rfq-invites/${INVITE_ID}/accept`,
        { note: null },
      );
    });
    expect(tenantGetMock).toHaveBeenCalledTimes(2);
  });
});
