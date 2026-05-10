import React from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APIError } from '../../services/apiClient';

vi.mock('../../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
  tenantPatch: vi.fn(),
}));

import { PoolRfqSurface } from '../../components/Tenant/NetworkCommerce/PoolRfqSurface';
import { issueRfq, type NetworkPoolDemandLine, type NetworkPoolRfq } from '../../services/networkCommerceService';
import { tenantGet, tenantPost } from '../../services/tenantApiClient';

const tenantGetMock = vi.mocked(tenantGet);
const tenantPostMock = vi.mocked(tenantPost);

afterEach(() => {
  cleanup();
});

const POOL_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function makePool(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: POOL_ID,
    org_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    pool_ref: 'POOL-RFQ-001',
    commodity_category: 'Steel',
    target_qty: '2500',
    qty_unit: 'KG',
    lifecycle_state_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    lifecycle_state_key: 'AGGREGATING',
    open_at: '2026-05-01T10:00:00.000Z',
    close_at: '2026-05-30T10:00:00.000Z',
    allocated_at: null,
    settled_at: null,
    metadata: null,
    created_by_user_id: null,
    created_at: '2026-05-01T09:00:00.000Z',
    updated_at: '2026-05-02T09:00:00.000Z',
    ...overrides,
  };
}

function makeDemandLine(overrides: Partial<NetworkPoolDemandLine> = {}): NetworkPoolDemandLine {
  return {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    owner_org_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    pool_id: POOL_ID,
    line_ref: 'DL-001',
    commodity_category: 'Steel',
    product_category: 'Hot Rolled',
    product_spec_summary: 'Hot rolled coils',
    qty: '1000',
    qty_unit: 'KG',
    quality_requirements_json: null,
    certification_requirements_json: null,
    packaging_requirements_json: null,
    delivery_location: 'Dallas, TX',
    delivery_window_start: '2026-05-20T00:00:00.000Z',
    delivery_window_end: '2026-05-27T00:00:00.000Z',
    tolerance_pct: null,
    priority: 1,
    status: 'LOCKED_FOR_RFQ',
    source_type: 'MANUAL',
    source_membership_id: null,
    normalized_from_member_input: false,
    revision_no: 1,
    supersedes_line_id: null,
    created_at: '2026-05-02T08:00:00.000Z',
    updated_at: '2026-05-03T08:00:00.000Z',
    locked_at: '2026-05-04T08:00:00.000Z',
    ...overrides,
  };
}

function makeRfq(overrides: Partial<NetworkPoolRfq> = {}): NetworkPoolRfq {
  return {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    owner_org_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    pool_id: POOL_ID,
    snapshot_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    rfq_ref: 'RFQ-2026-0001',
    rfq_version: 1,
    status: 'ISSUED',
    issue_basis: 'SNAPSHOT_LOCK',
    issued_at: '2026-05-10T12:00:00.000Z',
    issued_by_user_id: '11111111-1111-1111-1111-111111111111',
    issue_reason: 'Need bids this week',
    response_deadline_at: '2026-05-20T12:00:00.000Z',
    supplier_invite_mode: 'OWNER_SELECTED',
    line_count: 1,
    total_qty: '1000',
    qty_unit: 'KG',
    created_at: '2026-05-10T12:00:00.000Z',
    updated_at: '2026-05-10T12:00:00.000Z',
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    owner_org_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    pool_id: POOL_ID,
    snapshot_ref: 'SNAP-2026-0001',
    snapshot_version: 1,
    basis: 'RFQ_ISSUE',
    status: 'CAPTURED',
    captured_at: '2026-05-10T11:00:00.000Z',
    captured_by_user_id: '11111111-1111-1111-1111-111111111111',
    captured_reason: null,
    line_count: 1,
    total_qty: '1000',
    qty_unit: 'KG',
    created_at: '2026-05-10T11:00:00.000Z',
    updated_at: '2026-05-10T11:00:00.000Z',
    ...overrides,
  };
}

function installStandardTenantMocks(options?: {
  pool?: ReturnType<typeof makePool>;
  demandLines?: NetworkPoolDemandLine[];
  issueResponse?: NetworkPoolRfq;
  snapshotResponse?: ReturnType<typeof makeSnapshot>;
  issueError?: unknown;
}) {
  const pool = options?.pool ?? makePool();
  const demandLines = options?.demandLines ?? [makeDemandLine()];
  const issueResponse = options?.issueResponse ?? makeRfq();
  const snapshotResponse = options?.snapshotResponse ?? makeSnapshot();

  tenantGetMock.mockImplementation(async (endpoint: string) => {
    if (endpoint === `/api/tenant/network-commerce/pools/${POOL_ID}`) {
      return pool as never;
    }

    if (endpoint.startsWith(`/api/tenant/network-commerce/pools/${POOL_ID}/demand-lines`)) {
      return {
        items: demandLines,
        pagination: { limit: 100, offset: 0, count: demandLines.length, total: demandLines.length },
      } as never;
    }

    throw new Error(`Unexpected tenantGet endpoint: ${endpoint}`);
  });

  tenantPostMock.mockImplementation(async (endpoint: string, body?: unknown) => {
    if (endpoint === `/api/tenant/network-commerce/pools/${POOL_ID}/demand-lines/lock-for-rfq`) {
      return snapshotResponse as never;
    }

    if (endpoint === `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/issue`) {
      if (options?.issueError) {
        throw options.issueError;
      }

      return issueResponse as never;
    }

    throw new Error(`Unexpected tenantPost endpoint: ${endpoint} with body ${JSON.stringify(body)}`);
  });
}

describe('FE-5 RFQ issue panel service', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
    tenantPostMock.mockReset();
  });

  it('issues the RFQ using only issue_reason and response_deadline_at', async () => {
    tenantPostMock.mockResolvedValue(makeRfq());

    const result = await issueRfq(POOL_ID, {
      issue_reason: 'Need bids this week',
      response_deadline_at: '2026-05-20T12:00:00.000Z',
    });

    expect(result.rfq_ref).toBe('RFQ-2026-0001');
    expect(tenantPostMock).toHaveBeenCalledWith(
      `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/issue`,
      {
        issue_reason: 'Need bids this week',
        response_deadline_at: '2026-05-20T12:00:00.000Z',
      },
    );
  });
});

describe('FE-5 RFQ issue panel surface', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
    tenantPostMock.mockReset();
  });

  it('renders the empty state when no demand lines exist', async () => {
    installStandardTenantMocks({ demandLines: [] });

    render(<PoolRfqSurface poolId={POOL_ID} onBack={() => undefined} />);

    expect(await screen.findByText('RFQ Issue Panel')).toBeInTheDocument();
    expect(await screen.findByText('No Demand Lines Available')).toBeInTheDocument();
    expect(screen.getByText('Demand Lines')).toBeInTheDocument();
    expect(screen.getByText('Total lines returned by backend')).toBeInTheDocument();
  });

  it('renders feature-disabled copy when the backend gate is off', async () => {
    tenantGetMock.mockImplementation(async () => {
      throw new APIError(503, 'Service temporarily unavailable.', 'FEATURE_DISABLED');
    });

    render(<PoolRfqSurface poolId={POOL_ID} onBack={() => undefined} />);

    expect(await screen.findByText('RFQ Issue Disabled')).toBeInTheDocument();
    expect(screen.getByText('RFQ issuance is currently disabled for this pool.')).toBeInTheDocument();
  });

  it('renders invalid-state copy when the pool is not aggregating', async () => {
    installStandardTenantMocks({ pool: makePool({ lifecycle_state_key: 'OPEN' }) });

    render(<PoolRfqSurface poolId={POOL_ID} onBack={() => undefined} />);

    expect(await screen.findByText('Pool Not Ready for RFQ')).toBeInTheDocument();
    expect(screen.getByText('This pool must be in AGGREGATING state before an RFQ can be issued.')).toBeInTheDocument();
  });

  it('renders forbidden copy when issue authorization is denied', async () => {
    installStandardTenantMocks({
      issueError: new APIError(403, 'Only pool owners and admins may issue an RFQ', 'FORBIDDEN'),
    });

    render(<PoolRfqSurface poolId={POOL_ID} onBack={() => undefined} />);

    expect(await screen.findByText('RFQ Issue Panel')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Issue Reason'), { target: { value: 'Need bids this week' } });
    fireEvent.change(screen.getByLabelText('Response Deadline'), { target: { value: '2026-05-20T12:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue RFQ' }));

    expect(await screen.findByText('Not Authorized')).toBeInTheDocument();
    expect(screen.getByText('Only pool owners and admins may issue an RFQ')).toBeInTheDocument();
  });

  it('renders a success state after issuing the RFQ', async () => {
    installStandardTenantMocks();

    render(<PoolRfqSurface poolId={POOL_ID} onBack={() => undefined} />);

    expect(await screen.findByText('RFQ Issue Panel')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Issue Reason'), { target: { value: 'Need bids this week' } });
    fireEvent.change(screen.getByLabelText('Response Deadline'), { target: { value: '2026-05-20T12:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue RFQ' }));

    expect(await screen.findByText('RFQ Issued Successfully')).toBeInTheDocument();
    expect(screen.getByText('RFQ-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Need bids this week')).toBeInTheDocument();
  });
});