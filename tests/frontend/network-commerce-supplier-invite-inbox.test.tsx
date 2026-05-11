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
import { SupplierInviteInbox } from '../../components/Tenant/NetworkCommerce/SupplierInviteInbox';

const tenantGetMock = vi.mocked(tenantGet);
const tenantPostMock = vi.mocked(tenantPost);

const INVITE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function makeInboxItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: INVITE_ID,
    invite_ref: 'INV-007',
    status: 'PENDING',
    invited_at: '2026-05-10T12:00:00.000Z',
    accepted_at: null,
    declined_at: null,
    expires_at: '2026-06-10T12:00:00.000Z',
    supplier_message: 'Please join this RFQ',
    rfq_ref: 'RFQ-001',
    rfq_version: 1,
    rfq_status: 'CLOSED_FOR_BIDS',
    issued_at: '2026-05-09T10:00:00.000Z',
    response_deadline_at: '2026-05-30T23:59:00.000Z',
    issue_basis: 'DEMAND_SNAPSHOT',
    line_count: 3,
    total_qty: '1500.00',
    qty_unit: 'MT',
    created_at: '2026-05-10T12:00:00.000Z',
    updated_at: '2026-05-10T12:00:00.000Z',
    ...overrides,
  };
}

function listEndpoint(): string {
  return '/api/tenant/network-commerce/supplier-rfq-invites';
}

function detailEndpoint(inviteId: string): string {
  return `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}`;
}

function acceptEndpoint(inviteId: string): string {
  return `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/accept`;
}

function declineEndpoint(inviteId: string): string {
  return `/api/tenant/network-commerce/supplier-rfq-invites/${inviteId}/decline`;
}

beforeEach(() => {
  tenantGetMock.mockReset();
  tenantPostMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('FE-7 supplier invite inbox', () => {
  it('renders loading state initially', async () => {
    tenantGetMock.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return [];
    });

    render(<SupplierInviteInbox />);
    expect(screen.getByText('Loading supplier invite inbox...')).toBeInTheDocument();
  });

  it('renders empty state when no invites exist', async () => {
    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) {
        return [];
      }
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    expect(await screen.findByText('No pending invitations found.')).toBeInTheDocument();
  });

  it('renders invite list when invites exist', async () => {
    const invite = makeInboxItem();
    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) {
        return [invite];
      }
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    expect(await screen.findByText(/INV-007/)).toBeInTheDocument();
    expect(screen.getByText(/RFQ-001/)).toBeInTheDocument();
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
  });

  it('shows feature-disabled card on 503 FEATURE_DISABLED', async () => {
    tenantGetMock.mockRejectedValue(
      new APIError(503, 'Feature disabled', 'FEATURE_DISABLED'),
    );

    render(<SupplierInviteInbox />);
    expect(await screen.findByText('Supplier Invite Inbox Disabled')).toBeInTheDocument();
  });

  it('shows generic error on unexpected error', async () => {
    tenantGetMock.mockRejectedValue(new Error('Network failure'));

    render(<SupplierInviteInbox />);
    expect(await screen.findByText('Unable to Load Inbox')).toBeInTheDocument();
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  it('calls view detail endpoint when View Detail is clicked', async () => {
    const invite = makeInboxItem();
    const inviteWithRfqDetail = makeInboxItem({
      rfq_ref: 'RFQ-001-DETAIL',
      rfq_status: 'CLOSED_FOR_BIDS',
    });

    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) return [invite];
      if (endpoint === detailEndpoint(INVITE_ID)) return inviteWithRfqDetail;
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    await screen.findByText(/INV-007/);

    const viewBtn = screen.getByRole('button', { name: 'View Detail' });
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(tenantGetMock).toHaveBeenCalledWith(detailEndpoint(INVITE_ID));
    });

    expect(await screen.findByText(/RFQ-001-DETAIL/)).toBeInTheDocument();
  });

  it('calls accept endpoint and refreshes on accept', async () => {
    const invite = makeInboxItem();
    const accepted = makeInboxItem({ status: 'ACCEPTED', accepted_at: '2026-05-11T08:00:00.000Z' });

    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) return [invite];
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    tenantPostMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === acceptEndpoint(INVITE_ID)) return accepted;
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    await screen.findByText(/INV-007/);

    const acceptBtn = screen.getByRole('button', { name: 'Accept' });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalledWith(
        acceptEndpoint(INVITE_ID),
        { note: null },
      );
    });

    // After accept, list is refreshed
    expect(tenantGetMock).toHaveBeenCalledTimes(2);
  });

  it('calls decline endpoint and refreshes on decline', async () => {
    const invite = makeInboxItem();
    const declined = makeInboxItem({ status: 'DECLINED', declined_at: '2026-05-11T08:00:00.000Z' });

    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) return [invite];
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    tenantPostMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === declineEndpoint(INVITE_ID)) return declined;
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    await screen.findByText(/INV-007/);

    const declineBtn = screen.getByRole('button', { name: 'Decline' });
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalledWith(
        declineEndpoint(INVITE_ID),
        { declineReason: null },
      );
    });

    expect(tenantGetMock).toHaveBeenCalledTimes(2);
  });

  it('sends declineReason when provided', async () => {
    const invite = makeInboxItem();
    const declined = makeInboxItem({ status: 'DECLINED' });

    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) return [invite];
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    tenantPostMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === declineEndpoint(INVITE_ID)) return declined;
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    await screen.findByText(/INV-007/);

    // Type a decline reason
    const reasonTextarea = screen.getByPlaceholderText('Reason for declining (optional)');
    fireEvent.change(reasonTextarea, { target: { value: 'Not a fit for our capacity' } });

    const declineBtn = screen.getByRole('button', { name: 'Decline' });
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalledWith(
        declineEndpoint(INVITE_ID),
        { declineReason: 'Not a fit for our capacity' },
      );
    });
  });

  it('shows invalid-state card on 422 INVALID_TRANSITION', async () => {
    const invite = makeInboxItem();

    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) return [invite];
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    tenantPostMock.mockRejectedValue(
      new APIError(422, 'Invite is not in PENDING state', 'INVALID_TRANSITION'),
    );

    render(<SupplierInviteInbox />);
    await screen.findByText(/INV-007/);

    const acceptBtn = screen.getByRole('button', { name: 'Accept' });
    fireEvent.click(acceptBtn);

    expect(await screen.findByText('Invalid Invite Action')).toBeInTheDocument();
  });

  it('calls onBack when Back button is clicked', async () => {
    tenantGetMock.mockResolvedValue([]);
    const onBack = vi.fn();

    render(<SupplierInviteInbox onBack={onBack} />);
    await screen.findByText('No pending invitations found.');

    const backBtn = screen.getByRole('button', { name: 'Back' });
    fireEvent.click(backBtn);

    expect(onBack).toHaveBeenCalledOnce();
  });

  it('does not render owner_org_id, cancel_reason, invited_by_user_id or metadataInternalJson', async () => {
    // These fields are excluded by the backend (OD-5) but verify the component does not reference them
    const invite = makeInboxItem();
    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) return [invite];
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    render(<SupplierInviteInbox />);
    await screen.findByText(/INV-007/);

    // The rendered output must not contain these forbidden field labels
    expect(screen.queryByText(/owner_org_id/i)).toBeNull();
    expect(screen.queryByText(/cancel_reason/i)).toBeNull();
    expect(screen.queryByText(/invited_by_user_id/i)).toBeNull();
    expect(screen.queryByText(/metadataInternalJson/i)).toBeNull();
  });
});
