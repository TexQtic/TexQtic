/**
 * FE-4 / TEXQTIC-NC-FRONTEND-DEMAND-LINES-UIUX-POLISH-001
 * Frontend tests — DemandLineSurface polish
 *
 * Mocks tenantApiClient (the actual HTTP layer) so the service functions
 * run through their real logic but no network calls are made.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
  tenantPatch: vi.fn(),
}));

import { tenantGet, tenantPost, tenantPatch } from '../../services/tenantApiClient';
import { DemandLineSurface } from '../../components/Tenant/NetworkCommerce/DemandLineSurface';

const tenantGetMock = vi.mocked(tenantGet);
const tenantPostMock = vi.mocked(tenantPost);
const tenantPatchMock = vi.mocked(tenantPatch);

const POOL_ID = 'pppppppp-pppp-pppp-pppp-pppppppppppp';
const LINE_ID = 'llllllll-llll-llll-llll-llllllllllll';

function createEndpoint(): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/demand-lines`;
}

function cancelEndpoint(lineId: string): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/demand-lines/${lineId}/cancel`;
}

function updateEndpoint(lineId: string): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/demand-lines/${lineId}`;
}

function makeLine(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: LINE_ID,
    owner_org_id: 'oooooooo-oooo-oooo-oooo-oooooooooooo',
    pool_id: POOL_ID,
    line_ref: 'LINE-001',
    commodity_category: 'Grains',
    product_category: 'Wheat',
    product_spec_summary: 'Grade A, moisture < 14%',
    qty: '500',
    qty_unit: 'MT',
    quality_requirements_json: null,
    certification_requirements_json: null,
    packaging_requirements_json: null,
    delivery_location: 'Port of Rotterdam',
    delivery_window_start: '2026-09-01T00:00:00.000Z',
    delivery_window_end: '2026-09-30T00:00:00.000Z',
    tolerance_pct: null,
    priority: null,
    status: 'ACTIVE',
    source_type: 'MEMBER_INPUT',
    source_membership_id: null,
    normalized_from_member_input: false,
    revision_no: 1,
    supersedes_line_id: null,
    created_at: '2026-06-01T08:00:00.000Z',
    updated_at: '2026-06-01T08:00:00.000Z',
    locked_at: null,
    ...overrides,
  };
}

function emptyListResponse() {
  return { items: [], pagination: { limit: 50, offset: 0, count: 0, total: 0 } };
}

function listResponse(lines: ReturnType<typeof makeLine>[]) {
  return { items: lines, pagination: { limit: 50, offset: 0, count: lines.length, total: lines.length } };
}

beforeEach(() => {
  tenantGetMock.mockReset();
  tenantPostMock.mockReset();
  tenantPatchMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('DemandLineSurface — loading state', () => {
  it('renders loading spinner on mount', () => {
    // Never resolves during this check
    tenantGetMock.mockImplementation(() => new Promise(() => {}));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(screen.getByText('Loading demand lines...')).toBeInTheDocument();
  });
});

describe('DemandLineSurface — feature-disabled state', () => {
  it('renders disabled banner when backend returns FEATURE_DISABLED error', async () => {
    tenantGetMock.mockRejectedValueOnce(new Error('FEATURE_DISABLED'));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByText('Demand Lines Disabled')).toBeInTheDocument();
    expect(
      screen.getByText(/This feature is currently disabled/i),
    ).toBeInTheDocument();
  });

  it('shows Back to Pool button in feature-disabled state', async () => {
    tenantGetMock.mockRejectedValueOnce(new Error('FEATURE_DISABLED'));
    const onBack = vi.fn();
    render(<DemandLineSurface poolId={POOL_ID} onBack={onBack} />);
    const backBtn = await screen.findByRole('button', { name: /back to pool/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe('DemandLineSurface — error state', () => {
  it('renders error card on generic load failure', async () => {
    tenantGetMock.mockRejectedValueOnce(new Error('Network timeout'));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByText('Unable to Load Demand Lines')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
  });
});

describe('DemandLineSurface — empty state', () => {
  it('renders empty state message when no demand lines exist', async () => {
    tenantGetMock.mockResolvedValueOnce(emptyListResponse());
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByText('No demand lines yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add first demand line/i })).toBeInTheDocument();
  });

  it('shows Back to Pool button in empty state', async () => {
    tenantGetMock.mockResolvedValueOnce(emptyListResponse());
    const onBack = vi.fn();
    render(<DemandLineSurface poolId={POOL_ID} onBack={onBack} />);
    const backBtn = await screen.findByRole('button', { name: /back to pool/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('opens create form when "Add First Demand Line" is clicked', async () => {
    tenantGetMock.mockResolvedValueOnce(emptyListResponse());
    render(<DemandLineSurface poolId={POOL_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: /add first demand line/i }));
    expect(await screen.findByText('New Demand Line')).toBeInTheDocument();
  });
});

describe('DemandLineSurface — ready state with demand lines', () => {
  it('renders demand line card with ref and commodity', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine()]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByText('LINE-001')).toBeInTheDocument();
    expect(screen.getByText('Grains')).toBeInTheDocument();
    expect(screen.getByText('500 MT')).toBeInTheDocument();
  });

  it('renders ACTIVE status badge', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine({ status: 'ACTIVE' })]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByText('Active')).toBeInTheDocument();
  });

  it('renders DRAFT status badge', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine({ status: 'DRAFT' })]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByText('Draft')).toBeInTheDocument();
  });

  it('renders LOCKED_FOR_RFQ status badge', async () => {
    tenantGetMock.mockResolvedValueOnce(
      listResponse([makeLine({ status: 'LOCKED_FOR_RFQ', locked_at: '2026-07-01T00:00:00.000Z' })]),
    );
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByText('Locked for RFQ')).toBeInTheDocument();
  });

  it('renders CANCELLED status badge', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine({ status: 'CANCELLED' })]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
  });

  it('renders product spec summary when present', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine()]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByText('Grade A, moisture < 14%')).toBeInTheDocument();
  });

  it('renders delivery location when present', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine()]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByText('Port of Rotterdam')).toBeInTheDocument();
  });

  it('renders Add Demand Line button in ready state', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine()]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByRole('button', { name: /add demand line/i })).toBeInTheDocument();
  });

  it('renders Lock for RFQ button when ACTIVE lines exist', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine({ status: 'ACTIVE' })]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    expect(await screen.findByRole('button', { name: /lock for rfq/i })).toBeInTheDocument();
  });

  it('does not render Lock for RFQ when no ACTIVE lines exist', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine({ status: 'DRAFT' })]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    await screen.findByText('LINE-001'); // wait for ready
    expect(screen.queryByRole('button', { name: /lock for rfq/i })).toBeNull();
  });

  it('calls onBack when Back button is clicked', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine()]));
    const onBack = vi.fn();
    render(<DemandLineSurface poolId={POOL_ID} onBack={onBack} />);
    fireEvent.click(await screen.findByRole('button', { name: /back to pool/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe('DemandLineSurface — create form', () => {
  it('opens create form when Add Demand Line is clicked', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine()]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: /add demand line/i }));
    expect(await screen.findByText('New Demand Line')).toBeInTheDocument();
  });

  it('renders required field indicators in create form', async () => {
    tenantGetMock.mockResolvedValueOnce(emptyListResponse());
    render(<DemandLineSurface poolId={POOL_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: /add first demand line/i }));
    await screen.findByText('New Demand Line');
    // Line Reference, Commodity Category, Quantity, Unit all required
    expect(screen.getByPlaceholderText(/line-001/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/grains/i)).toBeInTheDocument();
  });

  it('dismisses form when Cancel is clicked', async () => {
    tenantGetMock.mockResolvedValueOnce(emptyListResponse());
    render(<DemandLineSurface poolId={POOL_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: /add first demand line/i }));
    await screen.findByText('New Demand Line');
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByText('New Demand Line')).toBeNull();
  });

  it('calls createDemandLine with correct payload on submit', async () => {
    tenantGetMock.mockResolvedValueOnce(emptyListResponse());

    const createdLine = makeLine({ line_ref: 'LINE-NEW', commodity_category: 'Oilseeds', status: 'DRAFT' });
    tenantPostMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === createEndpoint()) return createdLine;
      return {};
    });
    tenantGetMock.mockResolvedValue(listResponse([createdLine]));

    render(<DemandLineSurface poolId={POOL_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: /add first demand line/i }));
    await screen.findByText('New Demand Line');

    // Fill in required fields
    fireEvent.change(screen.getByPlaceholderText(/line-001/i), {
      target: { name: 'lineRef', value: 'LINE-NEW', type: 'text' },
    });
    fireEvent.change(screen.getByPlaceholderText(/grains/i), {
      target: { name: 'commodityCategory', value: 'Oilseeds', type: 'text' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create demand line/i }));

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalledWith(
        createEndpoint(),
        expect.objectContaining({
          line_ref: 'LINE-NEW',
          commodity_category: 'Oilseeds',
        }),
      );
    });
  });

  it('does not add Activate or Start Aggregating buttons', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine()]));
    render(<DemandLineSurface poolId={POOL_ID} />);
    await screen.findByText('LINE-001');
    expect(screen.queryByRole('button', { name: /activate/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /start aggregat/i })).toBeNull();
  });
});

describe('DemandLineSurface — cancel demand line', () => {
  it('calls cancelDemandLine with pool and line ID on cancel click', async () => {
    tenantGetMock.mockResolvedValue(emptyListResponse());
    tenantPostMock.mockResolvedValueOnce(makeLine({ status: 'CANCELLED' }));

    render(<DemandLineSurface poolId={POOL_ID} />);
    // Seed with one ACTIVE line first
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine()]));
    cleanup();

    // Fresh render with an ACTIVE line
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine()]));
    tenantPostMock.mockResolvedValueOnce(makeLine({ status: 'CANCELLED' }));
    render(<DemandLineSurface poolId={POOL_ID} />);

    const cancelBtn = await screen.findByRole('button', { name: /^cancel$/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalledWith(
        cancelEndpoint(LINE_ID),
        expect.any(Object),
      );
    });
  });
});

describe('DemandLineSurface — edit demand line', () => {
  it('opens edit form with pre-populated fields when Edit is clicked', async () => {
    tenantGetMock.mockResolvedValueOnce(listResponse([makeLine()]));
    render(<DemandLineSurface poolId={POOL_ID} />);

    fireEvent.click(await screen.findByRole('button', { name: /^edit$/i }));
    expect(await screen.findByText('Edit Demand Line')).toBeInTheDocument();
    // Line ref should be disabled in edit mode and pre-filled
    const lineRefInput = screen.getByPlaceholderText(/line-001/i);
    expect(lineRefInput).toBeDisabled();
  });

  it('calls updateDemandLine with correct payload on save', async () => {
    const originalLine = makeLine();
    tenantGetMock.mockResolvedValue(listResponse([originalLine]));
    const updatedLine = makeLine({ commodity_category: 'Pulses' });
    tenantPatchMock.mockResolvedValueOnce(updatedLine);

    render(<DemandLineSurface poolId={POOL_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: /^edit$/i }));
    await screen.findByText('Edit Demand Line');

    fireEvent.change(screen.getByPlaceholderText(/grains/i), {
      target: { name: 'commodityCategory', value: 'Pulses', type: 'text' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(tenantPatchMock).toHaveBeenCalledWith(
        updateEndpoint(LINE_ID),
        expect.objectContaining({ commodity_category: 'Pulses' }),
      );
    });
  });
});

describe('DemandLineSurface — error inline banner', () => {
  it('shows dismissible inline error banner after create failure', async () => {
    tenantGetMock.mockResolvedValueOnce(emptyListResponse());
    tenantPostMock.mockRejectedValueOnce(new Error('Server error on create'));

    render(<DemandLineSurface poolId={POOL_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: /add first demand line/i }));
    await screen.findByText('New Demand Line');

    // Fill required fields minimally and submit
    fireEvent.change(screen.getByPlaceholderText(/line-001/i), {
      target: { name: 'lineRef', value: 'LINE-ERR', type: 'text' },
    });
    fireEvent.change(screen.getByPlaceholderText(/grains/i), {
      target: { name: 'commodityCategory', value: 'Grains', type: 'text' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create demand line/i }));

    expect(await screen.findByText('Server error on create')).toBeInTheDocument();

    // Dismiss clears the banner
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('Server error on create')).toBeNull();
  });
});
