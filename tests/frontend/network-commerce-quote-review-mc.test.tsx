/**
 * MC-FE-01..17 — Maker-Checker Award frontend tests
 * QuoteReviewPanel + MC service methods (TEXQTIC-NC-FRONTEND-AWARD-MAKER-CHECKER-UI-001)
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

vi.mock('../../services/authService', () => ({
  getCurrentUser: vi.fn(),
}));

import { tenantGet, tenantPost } from '../../services/tenantApiClient';
import { getCurrentUser } from '../../services/authService';
import { QuoteReviewPanel } from '../../components/Tenant/NetworkCommerce/QuoteReviewPanel';

const tenantGetMock = vi.mocked(tenantGet);
const tenantPostMock = vi.mocked(tenantPost);
const getCurrentUserMock = vi.mocked(getCurrentUser);

const POOL_ID = 'pppppppp-pppp-pppp-pppp-pppppppppppp';
const RFQ_ID = 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr';
const QUOTE_ID = 'qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq';
const APPROVAL_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MAKER_USER_ID = 'uuuuuuuu-maker-user-id-0000000000000';
const CHECKER_USER_ID = 'cccccccc-checker-user-id-000000000000';

function quotesEndpoint(): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/quotes`;
}

function awardRequestEndpoint(quoteId: string): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/quotes/${quoteId}/award-request`;
}

function approveEndpoint(approvalId: string): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/award-approvals/${approvalId}/approve`;
}

function rejectApprovalEndpoint(approvalId: string): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/award-approvals/${approvalId}/reject`;
}

function approvalsEndpoint(): string {
  return `/api/tenant/network-commerce/pools/${POOL_ID}/rfq/${RFQ_ID}/award-approvals`;
}

function makeOwnerQuote(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: QUOTE_ID,
    owner_org_id: 'owner-org',
    supplier_org_id: 'supplier-org',
    rfq_id: RFQ_ID,
    pool_id: POOL_ID,
    invite_id: 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
    quote_ref: 'QUO-MC-001',
    status: 'SUBMITTED',
    quote_amount: '12000.00',
    currency: 'USD',
    validity_until: '2026-09-01T00:00:00.000Z',
    supplier_note: null,
    submitted_at: '2026-07-01T09:00:00.000Z',
    submitted_by_user_id: null,
    withdrawn_at: null,
    accepted_at: null,
    rejected_at: null,
    reject_reason: null,
    created_at: '2026-07-01T09:00:00.000Z',
    updated_at: '2026-07-01T09:00:00.000Z',
    ...overrides,
  };
}

function makePendingApproval(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: APPROVAL_ID,
    status: 'PENDING',
    expires_at: '2026-07-08T09:00:00.000Z',
    entity_type: 'QUOTE',
    entity_id: QUOTE_ID,
    from_state_key: 'SUBMITTED',
    to_state_key: 'ACCEPTED',
    requested_by_user_id: MAKER_USER_ID,
    request_reason: 'Best price in market',
    created_at: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeCurrentUser(userId: string) {
  return {
    user: { id: userId, email: 'user@example.com', emailVerified: true, createdAt: '2026-01-01T00:00:00.000Z' },
  };
}

/**
 * Sets up mocks for "quotes + approvals + currentUser" trio.
 * approvals defaults to []. currentUserId defaults to CHECKER_USER_ID.
 */
function setupLoadMocks(opts: {
  quotes?: unknown[];
  approvals?: unknown[];
  currentUserId?: string;
  approvalsError?: unknown;
  currentUserError?: unknown;
} = {}) {
  const quotes = opts.quotes ?? [makeOwnerQuote()];
  const approvals = opts.approvals ?? [];
  const currentUserId = opts.currentUserId ?? CHECKER_USER_ID;

  // tenantGet is called twice in sequence: quotes then approvals
  tenantGetMock.mockImplementation((endpoint: string) => {
    if ((endpoint as string).endsWith('/award-approvals')) {
      if (opts.approvalsError) return Promise.reject(opts.approvalsError);
      return Promise.resolve(opts.approvals ?? []);
    }
    return Promise.resolve(quotes);
  });

  if (opts.currentUserError) {
    getCurrentUserMock.mockRejectedValue(opts.currentUserError);
  } else {
    getCurrentUserMock.mockResolvedValue(makeCurrentUser(currentUserId) as never);
  }
}

beforeEach(() => {
  tenantGetMock.mockReset();
  tenantPostMock.mockReset();
  getCurrentUserMock.mockReset();
});

afterEach(() => {
  cleanup();
});

// ─── MC-FE-01: Feature-disabled banner renders when award feature unavailable ──

describe('MC-FE-01: feature-disabled banner when award feature unavailable', () => {
  it('renders feature-disabled state on 503 FEATURE_DISABLED and shows flag name', async () => {
    tenantGetMock.mockRejectedValue(new APIError(503, 'FEATURE_DISABLED', 'Feature disabled'));
    getCurrentUserMock.mockResolvedValue(makeCurrentUser(CHECKER_USER_ID) as never);
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('RFQ Award Review Disabled')).toBeInTheDocument();
    });
    expect(screen.getByText('nc.procurement_pools.rfq.award.enabled')).toBeInTheDocument();
  });
});

// ─── MC-FE-02: No MC action controls visible when feature-disabled ────────────

describe('MC-FE-02: no MC action controls when feature-disabled', () => {
  it('does not render Request Award Approval, Approve Award, or Reject Approval when feature-disabled', async () => {
    tenantGetMock.mockRejectedValue(new APIError(503, 'FEATURE_DISABLED', 'Feature disabled'));
    getCurrentUserMock.mockResolvedValue(makeCurrentUser(CHECKER_USER_ID) as never);
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('RFQ Award Review Disabled')).toBeInTheDocument();
    });
    expect(screen.queryByText('Request Award Approval')).not.toBeInTheDocument();
    expect(screen.queryByText('Approve Award')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject Approval')).not.toBeInTheDocument();
    expect(screen.queryByText('Accept Quote')).not.toBeInTheDocument();
  });
});

// ─── MC-FE-03: Submitted quote shows "Request Award Approval" not "Accept" ───

describe('MC-FE-03: SUBMITTED quote shows Request Award Approval button', () => {
  it('renders "Request Award Approval" button for a SUBMITTED quote (not "Accept Quote")', async () => {
    setupLoadMocks({ quotes: [makeOwnerQuote()] });
    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i })).toBeInTheDocument();
    });
    expect(screen.queryByText('Accept Quote')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^accept quote/i })).not.toBeInTheDocument();
  });
});

// ─── MC-FE-04: Clicking Request Award Approval calls award-request not legacy accept ──

describe('MC-FE-04: clicking Request Award Approval calls award-request service', () => {
  it('opens request dialog and calls award-request endpoint (not legacy /accept) on confirm', async () => {
    const pendingApproval = makePendingApproval();
    setupLoadMocks({ quotes: [makeOwnerQuote()], approvals: [] });
    tenantPostMock.mockResolvedValue(pendingApproval);

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i }));

    // Dialog opens
    expect(screen.getByRole('dialog', { name: 'Request award approval' })).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Optional reason for award request');
    fireEvent.change(textarea, { target: { value: 'Best price in market' } });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Request' }));

    expect(tenantPostMock).toHaveBeenCalledWith(awardRequestEndpoint(QUOTE_ID), {
      request_reason: 'Best price in market',
      request_id: null,
    });
    // Legacy /accept must NOT be called
    expect(tenantPostMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/accept'),
      expect.anything(),
    );
  });
});

// ─── MC-FE-05: Successful request displays pending approval state ─────────────

describe('MC-FE-05: successful award request shows pending approval state', () => {
  it('shows Award Approval Pending card after successful request', async () => {
    const pendingApproval = makePendingApproval();

    // Initial load: submitted quote, no approvals
    // After request: same quote + pending approval
    let callCount = 0;
    tenantGetMock.mockImplementation((endpoint: string) => {
      callCount++;
      if ((endpoint as string).endsWith('/award-approvals')) {
        // Second round of GET calls (after post): return approval
        return callCount > 2 ? Promise.resolve([pendingApproval]) : Promise.resolve([]);
      }
      return Promise.resolve([makeOwnerQuote()]);
    });
    getCurrentUserMock.mockResolvedValue(makeCurrentUser(CHECKER_USER_ID) as never);
    tenantPostMock.mockResolvedValue(pendingApproval);

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Request' }));

    await waitFor(() => {
      expect(screen.getByText('Award Approval Pending')).toBeInTheDocument();
    });
  });
});

// ─── MC-FE-06: Duplicate pending error shows safe message ────────────────────

describe('MC-FE-06: AWARD_REQUEST_ALREADY_PENDING error shows safe message', () => {
  it('shows safe "already pending" message on AWARD_REQUEST_ALREADY_PENDING error', async () => {
    setupLoadMocks({ quotes: [makeOwnerQuote()] });
    tenantPostMock.mockRejectedValue(
      new APIError(409, 'Already pending', 'AWARD_REQUEST_ALREADY_PENDING'),
    );

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Request' }));

    await waitFor(() => {
      expect(screen.getByText('An approval is already pending for this quote.')).toBeInTheDocument();
    });
  });
});

// ─── MC-FE-07: Pending approvals fetched and displayed ───────────────────────

describe('MC-FE-07: pending approvals fetched and displayed on load', () => {
  it('shows Award Approval Pending card for a quote with a pending approval on initial load', async () => {
    const pendingApproval = makePendingApproval();
    setupLoadMocks({
      quotes: [makeOwnerQuote()],
      approvals: [pendingApproval],
    });

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('Award Approval Pending')).toBeInTheDocument();
    });
  });
});

// ─── MC-FE-08: Pending approval state shows reason + expiry/created metadata ─

describe('MC-FE-08: pending approval shows reason, expires, and requested metadata', () => {
  it('renders request_reason, created_at, and expires_at from pending approval', async () => {
    const pendingApproval = makePendingApproval({
      request_reason: 'Best price in market',
      created_at: '2026-07-01T10:00:00.000Z',
      expires_at: '2026-07-08T09:00:00.000Z',
    });
    setupLoadMocks({
      quotes: [makeOwnerQuote()],
      approvals: [pendingApproval],
    });

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('Award Approval Pending')).toBeInTheDocument();
    });
    expect(screen.getByText('Best price in market')).toBeInTheDocument();
    // Timestamp labels are rendered
    expect(screen.getByText(/Requested:/)).toBeInTheDocument();
    expect(screen.getByText(/Expires:/)).toBeInTheDocument();
  });
});

// ─── MC-FE-09: Pending state prevents duplicate request action ────────────────

describe('MC-FE-09: pending approval prevents duplicate request action button', () => {
  it('does not render Request Award Approval button when approval is already pending', async () => {
    const pendingApproval = makePendingApproval();
    setupLoadMocks({
      quotes: [makeOwnerQuote()],
      approvals: [pendingApproval],
    });

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('Award Approval Pending')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /request award approval for quote/i })).not.toBeInTheDocument();
  });
});

// ─── MC-FE-10: Checker approval UI appears only when role context safely permits ─

describe('MC-FE-10: checker UI appears only when current user is different from maker', () => {
  it('shows Approve Award and Reject Approval buttons when currentUser is different from maker', async () => {
    const pendingApproval = makePendingApproval({ requested_by_user_id: MAKER_USER_ID });
    setupLoadMocks({
      quotes: [makeOwnerQuote()],
      approvals: [pendingApproval],
      currentUserId: CHECKER_USER_ID, // different from maker
    });

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject approval for quote quo-mc-001/i })).toBeInTheDocument();
    });
  });

  it('does NOT show Approve/Reject buttons when currentUser is the same as maker (same actor)', async () => {
    const pendingApproval = makePendingApproval({ requested_by_user_id: MAKER_USER_ID });
    setupLoadMocks({
      quotes: [makeOwnerQuote()],
      approvals: [pendingApproval],
      currentUserId: MAKER_USER_ID, // same as maker
    });

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('Award Approval Pending')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /approve award/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject approval/i })).not.toBeInTheDocument();
  });

  it('does NOT show Approve/Reject buttons when currentUserId is null (auth unavailable)', async () => {
    const pendingApproval = makePendingApproval({ requested_by_user_id: MAKER_USER_ID });
    setupLoadMocks({
      quotes: [makeOwnerQuote()],
      approvals: [pendingApproval],
      currentUserError: new Error('auth error'),
    });

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('Award Approval Pending')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /approve award/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject approval/i })).not.toBeInTheDocument();
  });
});

// ─── MC-FE-11: Approve action calls approveAwardApproval and refreshes ────────

describe('MC-FE-11: Approve Award calls approveAwardApproval and refreshes data', () => {
  it('calls approve endpoint with approval id and refreshes quote list', async () => {
    const pendingApproval = makePendingApproval({ requested_by_user_id: MAKER_USER_ID });
    const approvedQuote = makeOwnerQuote({ status: 'ACCEPTED', accepted_at: '2026-07-01T11:00:00.000Z' });
    const approvedApproval = { ...pendingApproval, status: 'APPROVED' };

    let approveHappened = false;
    tenantGetMock.mockImplementation((endpoint: string) => {
      if ((endpoint as string).endsWith('/award-approvals')) {
        return approveHappened ? Promise.resolve([]) : Promise.resolve([pendingApproval]);
      }
      return approveHappened ? Promise.resolve([approvedQuote]) : Promise.resolve([makeOwnerQuote()]);
    });
    getCurrentUserMock.mockResolvedValue(makeCurrentUser(CHECKER_USER_ID) as never);
    tenantPostMock.mockImplementation(() => {
      approveHappened = true;
      return Promise.resolve({ approval: approvedApproval, quote: approvedQuote });
    });

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i }));

    expect(tenantPostMock).toHaveBeenCalledWith(approveEndpoint(APPROVAL_ID), {
      approve_reason: '',
      request_id: null,
    });

    await waitFor(() => {
      expect(screen.getByText('Winning Quote')).toBeInTheDocument();
    });
  });
});

// ─── MC-FE-12: Reject action calls rejectAwardApproval and refreshes ─────────

describe('MC-FE-12: Reject Approval calls rejectAwardApproval and refreshes data', () => {
  it('opens reject approval dialog, sends reason, calls reject endpoint and refreshes', async () => {
    const pendingApproval = makePendingApproval({ requested_by_user_id: MAKER_USER_ID });
    const rejectedApproval = { ...pendingApproval, status: 'REJECTED' };

    let loadRound = 0;
    tenantGetMock.mockImplementation((endpoint: string) => {
      if ((endpoint as string).endsWith('/award-approvals')) {
        loadRound++;
        return loadRound <= 1 ? Promise.resolve([pendingApproval]) : Promise.resolve([]);
      }
      return Promise.resolve([makeOwnerQuote()]);
    });
    getCurrentUserMock.mockResolvedValue(makeCurrentUser(CHECKER_USER_ID) as never);
    tenantPostMock.mockResolvedValue({ approval: rejectedApproval });

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject approval for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reject approval for quote quo-mc-001/i }));

    // Dialog opens
    expect(screen.getByRole('dialog', { name: 'Reject approval' })).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Optional reason for rejecting the approval');
    fireEvent.change(textarea, { target: { value: 'Not approved by finance' } });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Reject' }));

    expect(tenantPostMock).toHaveBeenCalledWith(rejectApprovalEndpoint(APPROVAL_ID), {
      reject_reason: 'Not approved by finance',
      request_id: null,
    });

    await waitFor(() => {
      expect(screen.queryByText('Award Approval Pending')).not.toBeInTheDocument();
    });
  });
});

// ─── MC-FE-13: Approval expired/already decided errors render safe messages ──

describe('MC-FE-13: approval expired and already-decided errors show safe messages', () => {
  it('shows safe message for APPROVAL_EXPIRED error on approve action', async () => {
    const pendingApproval = makePendingApproval({ requested_by_user_id: MAKER_USER_ID });
    setupLoadMocks({ quotes: [makeOwnerQuote()], approvals: [pendingApproval] });
    tenantPostMock.mockRejectedValue(new APIError(422, 'Expired', 'APPROVAL_EXPIRED'));

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i }));

    await waitFor(() => {
      expect(screen.getByText('This approval request has expired.')).toBeInTheDocument();
    });
  });

  it('shows safe message for APPROVAL_ALREADY_DECIDED error on approve action', async () => {
    const pendingApproval = makePendingApproval({ requested_by_user_id: MAKER_USER_ID });
    setupLoadMocks({ quotes: [makeOwnerQuote()], approvals: [pendingApproval] });
    tenantPostMock.mockRejectedValue(new APIError(409, 'Already decided', 'APPROVAL_ALREADY_DECIDED'));

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i }));

    await waitFor(() => {
      expect(screen.getByText('This approval has already been decided.')).toBeInTheDocument();
    });
  });
});

// ─── MC-FE-14: Same maker/checker actor error renders safe message ─────────────

describe('MC-FE-14: MAKER_CHECKER_SAME_ACTOR error renders safe message', () => {
  it('shows safe same-actor message when approve returns MAKER_CHECKER_SAME_ACTOR', async () => {
    const pendingApproval = makePendingApproval({ requested_by_user_id: MAKER_USER_ID });
    setupLoadMocks({ quotes: [makeOwnerQuote()], approvals: [pendingApproval] });
    tenantPostMock.mockRejectedValue(
      new APIError(422, 'Same actor', 'MAKER_CHECKER_SAME_ACTOR'),
    );

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i }));

    await waitFor(() => {
      expect(
        screen.getByText('The same person cannot both request and approve an award.'),
      ).toBeInTheDocument();
    });
  });
});

// ─── MC-FE-15: Quote no longer submitted error renders safe message ───────────

describe('MC-FE-15: QUOTE_NO_LONGER_SUBMITTED error renders safe message', () => {
  it('shows safe message when award request returns QUOTE_NO_LONGER_SUBMITTED', async () => {
    setupLoadMocks({ quotes: [makeOwnerQuote()] });
    tenantPostMock.mockRejectedValue(
      new APIError(409, 'Not submitted', 'QUOTE_NO_LONGER_SUBMITTED'),
    );

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Request' }));

    await waitFor(() => {
      expect(screen.getByText('This quote is no longer in a submitted state.')).toBeInTheDocument();
    });
  });
});

// ─── MC-FE-16: UI/service does not require frozenPayload or frozenPayloadHash ─

describe('MC-FE-16: frozenPayload and frozenPayloadHash are never sent or rendered', () => {
  it('award-request POST body does not include frozenPayload or frozenPayloadHash', async () => {
    setupLoadMocks({ quotes: [makeOwnerQuote()] });
    tenantPostMock.mockResolvedValue(makePendingApproval());

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /request award approval for quote quo-mc-001/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Request' }));

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalledWith(awardRequestEndpoint(QUOTE_ID), {
        request_reason: '',
        request_id: null,
      });
    });

    const callArgs = tenantPostMock.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs).not.toHaveProperty('frozenPayload');
    expect(callArgs).not.toHaveProperty('frozenPayloadHash');
  });

  it('quote approval response with frozenPayload field is not rendered to the DOM', async () => {
    const approvalWithForbiddenFields = {
      ...makePendingApproval(),
      frozenPayload: '{"internal": "secret"}',
      frozenPayloadHash: 'abc123hash',
    };
    setupLoadMocks({
      quotes: [makeOwnerQuote()],
      approvals: [approvalWithForbiddenFields],
    });

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('Award Approval Pending')).toBeInTheDocument();
    });
    expect(screen.queryByText(/internal.*secret/i)).not.toBeInTheDocument();
    expect(screen.queryByText('abc123hash')).not.toBeInTheDocument();
  });
});

// ─── MC-FE-17: Legacy accept method is not called by maker-checker UI ─────────

describe('MC-FE-17: legacy /accept is never called by MC UI', () => {
  it('does not call the legacy /accept endpoint at any point in the MC flow', async () => {
    const pendingApproval = makePendingApproval({ requested_by_user_id: MAKER_USER_ID });
    setupLoadMocks({ quotes: [makeOwnerQuote()], approvals: [pendingApproval] });
    tenantPostMock.mockResolvedValue({ approval: pendingApproval, quote: makeOwnerQuote() });

    render(<QuoteReviewPanel poolId={POOL_ID} rfqId={RFQ_ID} onBack={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /approve award for quote quo-mc-001/i }));

    await waitFor(() => {
      expect(tenantPostMock).toHaveBeenCalled();
    });

    for (const call of tenantPostMock.mock.calls) {
      expect(call[0]).not.toContain('/accept');
    }
  });

  it('MC service methods test: requestAwardApprovalForQuote calls award-request endpoint, not /accept', async () => {
    tenantPostMock.mockResolvedValue(makePendingApproval());
    const { requestAwardApprovalForQuote } = await import('../../services/networkCommerceService');
    await requestAwardApprovalForQuote(POOL_ID, RFQ_ID, QUOTE_ID, { request_reason: 'test', request_id: null });
    expect(tenantPostMock).toHaveBeenCalledWith(awardRequestEndpoint(QUOTE_ID), {
      request_reason: 'test',
      request_id: null,
    });
    expect(tenantPostMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/accept'),
      expect.anything(),
    );
  });
});

// ─── MC service endpoint path tests ──────────────────────────────────────────

describe('MC service: approveAwardApproval calls correct endpoint', () => {
  it('calls approve endpoint with approve_reason and request_id', async () => {
    tenantPostMock.mockResolvedValue({ approval: makePendingApproval(), quote: makeOwnerQuote() });
    const { approveAwardApproval } = await import('../../services/networkCommerceService');
    await approveAwardApproval(POOL_ID, RFQ_ID, APPROVAL_ID, { approve_reason: 'looks good', request_id: 'req-x' });
    expect(tenantPostMock).toHaveBeenCalledWith(approveEndpoint(APPROVAL_ID), {
      approve_reason: 'looks good',
      request_id: 'req-x',
    });
  });
});

describe('MC service: rejectAwardApproval calls correct endpoint', () => {
  it('calls reject approval endpoint with reject_reason', async () => {
    tenantPostMock.mockResolvedValue({ approval: makePendingApproval() });
    const { rejectAwardApproval } = await import('../../services/networkCommerceService');
    await rejectAwardApproval(POOL_ID, RFQ_ID, APPROVAL_ID, { reject_reason: 'no budget', request_id: null });
    expect(tenantPostMock).toHaveBeenCalledWith(rejectApprovalEndpoint(APPROVAL_ID), {
      reject_reason: 'no budget',
      request_id: null,
    });
  });
});

describe('MC service: getPendingAwardApprovalsForRfq calls correct endpoint', () => {
  it('calls award-approvals GET endpoint', async () => {
    tenantGetMock.mockResolvedValue([makePendingApproval()]);
    const { getPendingAwardApprovalsForRfq } = await import('../../services/networkCommerceService');
    await getPendingAwardApprovalsForRfq(POOL_ID, RFQ_ID);
    expect(tenantGetMock).toHaveBeenCalledWith(approvalsEndpoint());
  });
});
