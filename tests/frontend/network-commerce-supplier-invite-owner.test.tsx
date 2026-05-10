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
import { SupplierInviteOwnerSurface } from '../../components/Tenant/NetworkCommerce/SupplierInviteOwnerSurface';

const tenantGetMock = vi.mocked(tenantGet);
const tenantPostMock = vi.mocked(tenantPost);

const POOL_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const RFQ_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function makeInvite(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    owner_org_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    supplier_org_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    rfq_id: RFQ_ID,
    pool_id: POOL_ID,
    invite_ref: 'INV-001',
    status: 'PENDING',
    invited_at: '2026-05-10T12:00:00.000Z',
    invited_by_user_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    accepted_at: null,
    declined_at: null,
    cancelled_at: null,
    expires_at: '2026-06-10T12:00:00.000Z',
    supplier_message: 'Please participate',
    decline_reason: null,
    cancel_reason: null,
    created_at: '2026-05-10T12:00:00.000Z',
    updated_at: '2026-05-10T12:00:00.000Z',
    ...overrides,
  };
}

function listEndpoint(): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/invites`;
}

function detailEndpoint(inviteId: string): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/invites/${inviteId}`;
}

function cancelEndpoint(inviteId: string): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/invites/${inviteId}/cancel`;
}

function sendEndpoint(): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/invites`;
}

beforeEach(() => {
  tenantGetMock.mockReset();
  tenantPostMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('FE-6 supplier invite owner surface', () => {
  it('renders RFQ context required state when rfqId is missing', async () => {
    render(<SupplierInviteOwnerSurface poolId={POOL_ID} rfqId={null} />);

    expect(await screen.findByText('RFQ Context Required')).toBeInTheDocument();
    expect(screen.getByText('Issue or select an RFQ first, then open Supplier Invite Owner UI.')).toBeInTheDocument();
  });

  it('renders loading then empty state when no invites exist', async () => {
    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) {
        return [] as never;
      }
      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    render(<SupplierInviteOwnerSurface poolId={POOL_ID} rfqId={RFQ_ID} />);

    expect(await screen.findByText('Invite List')).toBeInTheDocument();
    expect(screen.getByText('No supplier invites created for this RFQ yet.')).toBeInTheDocument();
  });

  it('renders feature-disabled state when backend gate returns FEATURE_DISABLED', async () => {
    tenantGetMock.mockRejectedValue(new APIError(503, 'Service temporarily unavailable.', 'FEATURE_DISABLED'));

    render(<SupplierInviteOwnerSurface poolId={POOL_ID} rfqId={RFQ_ID} />);

    expect(await screen.findByText('Supplier Invite Disabled')).toBeInTheDocument();
    expect(screen.getByText('Supplier invites are currently disabled for this tenant.')).toBeInTheDocument();
  });

  it('renders forbidden state on 403/FORBIDDEN', async () => {
    tenantGetMock.mockRejectedValue(new APIError(403, 'Only pool owners and admins may list supplier invites', 'FORBIDDEN'));

    render(<SupplierInviteOwnerSurface poolId={POOL_ID} rfqId={RFQ_ID} />);

    expect(await screen.findByText('Not Authorized')).toBeInTheDocument();
    expect(screen.getByText('Only pool owners and admins may list supplier invites')).toBeInTheDocument();
  });

  it('send invite form posts only allowed fields', async () => {
    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) {
        return [] as never;
      }
      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    tenantPostMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === sendEndpoint()) {
        return makeInvite() as never;
      }
      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    render(<SupplierInviteOwnerSurface poolId={POOL_ID} rfqId={RFQ_ID} />);

    await screen.findByText('Invite List');

    fireEvent.change(screen.getByLabelText('Supplier Org ID'), {
      target: { value: '99999999-9999-9999-9999-999999999999' },
    });
    fireEvent.change(screen.getByLabelText('Expires At (optional)'), {
      target: { value: '2026-07-01T08:30' },
    });
    fireEvent.change(screen.getByLabelText('Supplier Message (optional)'), {
      target: { value: 'Please respond quickly' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalledWith(
        sendEndpoint(),
        expect.objectContaining({
          supplier_org_id: '99999999-9999-9999-9999-999999999999',
          supplier_message: 'Please respond quickly',
        }),
      );
    });

    const payload = tenantPostMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload['org_id']).toBeUndefined();
    expect(payload['owner_org_id']).toBeUndefined();
    expect(payload['pool_id']).toBeUndefined();
    expect(payload['rfq_id']).toBeUndefined();
    expect(payload['invite_ref']).toBeUndefined();
    expect(payload['metadata_internal_json']).toBeUndefined();
    expect(payload['status']).toBeUndefined();
  });

  it('maps SUPPLIER_INVITE_ALREADY_SENT to duplicate state', async () => {
    tenantGetMock.mockResolvedValue([] as never);
    tenantPostMock.mockRejectedValue(new APIError(409, 'Invite exists', 'SUPPLIER_INVITE_ALREADY_SENT'));

    render(<SupplierInviteOwnerSurface poolId={POOL_ID} rfqId={RFQ_ID} />);

    await screen.findByText('Invite List');

    fireEvent.change(screen.getByLabelText('Supplier Org ID'), {
      target: { value: '99999999-9999-9999-9999-999999999999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    expect(await screen.findByText('Duplicate Invite')).toBeInTheDocument();
  });

  it('cancel invite posts cancel_reason and refreshes list', async () => {
    const row = makeInvite();
    let listCalls = 0;

    tenantGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === listEndpoint()) {
        listCalls += 1;
        return [row] as never;
      }
      if (endpoint === detailEndpoint(String(row.id))) {
        return row as never;
      }
      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    tenantPostMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === cancelEndpoint(String(row.id))) {
        return makeInvite({ status: 'CANCELLED', cancelled_at: '2026-05-11T10:00:00.000Z' }) as never;
      }
      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    render(<SupplierInviteOwnerSurface poolId={POOL_ID} rfqId={RFQ_ID} />);

    await screen.findByText('Invite List');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Invite' }));

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalledWith(cancelEndpoint(String(row.id)), {
        cancel_reason: 'Cancelled from FE-6 owner UI',
      });
    });

    expect(listCalls).toBeGreaterThanOrEqual(2);
  });

  it('does not render internal metadata or member-demand identity fields', async () => {
    const row = makeInvite({
      metadata_internal_json: { internal: true },
      metadataInternalJson: { internal: true },
      source_membership_id: 'leak-membership-id',
      owner_member_identity: 'leak-member',
      per_member_qty: '99999',
      rfq_lines: [{ id: 'line-1' }],
    });

    tenantGetMock.mockResolvedValue([row] as never);

    render(<SupplierInviteOwnerSurface poolId={POOL_ID} rfqId={RFQ_ID} />);

    await screen.findByText('Invite List');

    expect(screen.queryByText('metadata_internal_json')).not.toBeInTheDocument();
    expect(screen.queryByText('metadataInternalJson')).not.toBeInTheDocument();
    expect(screen.queryByText('leak-membership-id')).not.toBeInTheDocument();
    expect(screen.queryByText('leak-member')).not.toBeInTheDocument();
    expect(screen.queryByText('99999')).not.toBeInTheDocument();
    expect(screen.queryByText('line-1')).not.toBeInTheDocument();
  });
});
