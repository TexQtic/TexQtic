/**
 * TTP Enrollment Admin — React Testing Library pilot test
 *
 * Unit:    TTP-FRONTEND-TEST-HARNESS-PILOT-001
 * Family:  TexQtic frontend testing infrastructure
 * Date:    2026-05-06
 *
 * Covers:
 *   TC-FEH-001 — loading state on mount
 *   TC-FEH-002 — feature-disabled error copy (FEATURE_DISABLED)
 *   TC-FEH-003 — non-feature-disabled APIError message
 *   TC-FEH-004 — plain Error generic fallback
 *   TC-FEH-005 — successful data render (enrollment table row)
 *
 * Safety invariants preserved:
 *   - No application code modified
 *   - No network calls made
 *   - ttp_enabled=false unchanged
 *   - LEGAL_REVIEW_PENDING unchanged
 *
 * Harness: vitest + @testing-library/react + jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TtpEnrollmentAdmin from '../../components/ControlPlane/TtpEnrollmentAdmin';
import {
  adminListTtpEnrollments,
  adminReviewTtpEnrollment,
} from '../../services/ttpEnrollmentService';
import { APIError } from '../../services/apiClient';

// ─── Module mock ──────────────────────────────────────────────────────────────

vi.mock('../../services/ttpEnrollmentService', () => ({
  adminListTtpEnrollments: vi.fn(),
  adminReviewTtpEnrollment: vi.fn(),
}));

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('TtpEnrollmentAdmin — RTL pilot (TTP-FRONTEND-TEST-HARNESS-PILOT-001)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TC-FEH-001 — renders loading state on mount
   *
   * The component initialises `loading = true` and calls `adminListTtpEnrollments`
   * in a `useEffect`. With a never-resolving promise, the loading indicator
   * remains visible after the initial render.
   */
  it('TC-FEH-001 — renders loading state on mount', () => {
    vi.mocked(adminListTtpEnrollments).mockReturnValue(new Promise(() => {}));
    render(<TtpEnrollmentAdmin />);
    expect(screen.getByText('Loading enrollments…')).toBeInTheDocument();
  });

  /**
   * TC-FEH-002 — renders approved feature-disabled copy on FEATURE_DISABLED error
   *
   * When the service rejects with code FEATURE_DISABLED, the component shows
   * the canonical ttp_enabled=false copy — this is the UI surface validated by
   * the TTP control-plane feature-disabled UX audit.
   */
  it('TC-FEH-002 — renders approved feature-disabled copy', async () => {
    vi.mocked(adminListTtpEnrollments).mockRejectedValue(
      new APIError(503, 'Service temporarily unavailable. Try again.', 'FEATURE_DISABLED'),
    );
    render(<TtpEnrollmentAdmin />);
    await waitFor(() => {
      expect(
        screen.getByText('TradeTrust Pay is not currently enabled on this platform.'),
      ).toBeInTheDocument();
    });
  });

  /**
   * TC-FEH-003 — renders APIError message for non-FEATURE_DISABLED APIError
   *
   * When the service rejects with a non-FEATURE_DISABLED APIError,
   * the component renders err.message directly.
   */
  it('TC-FEH-003 — renders APIError message for non-feature-disabled APIError', async () => {
    vi.mocked(adminListTtpEnrollments).mockRejectedValue(
      new APIError(500, 'Unexpected server error', 'SERVER_ERROR'),
    );
    render(<TtpEnrollmentAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Unexpected server error')).toBeInTheDocument();
    });
  });

  /**
   * TC-FEH-004 — renders generic fallback for plain Error
   *
   * When the service rejects with a plain (non-APIError) Error,
   * the component falls back to the hard-coded generic message.
   */
  it('TC-FEH-004 — renders generic fallback for plain Error', async () => {
    vi.mocked(adminListTtpEnrollments).mockRejectedValue(new Error('boom'));
    render(<TtpEnrollmentAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load enrollments.')).toBeInTheDocument();
    });
  });

  /**
   * TC-FEH-005 — renders enrollment table row on successful service response
   *
   * When the service resolves with a list, the component renders the
   * enrollment table with the trade_reference of the first record.
   * Asserts on stable text content — no class names or implementation details.
   */
  it('TC-FEH-005 — renders enrollment data on successful service response', async () => {
    vi.mocked(adminListTtpEnrollments).mockResolvedValue([
      {
        org_id: 'org-pilot-001',
        trade_id: 'trade-pilot-001',
        seller_org_id: 'seller-pilot-001-xxxx',
        buyer_org_id: 'buyer-pilot-001',
        enrollment_state: 'REQUESTED',
        latest_log_id: null,
        last_updated_at: '2026-05-01T10:00:00Z',
        last_reason: null,
        trade_reference: 'TXN-PILOT-2026-0001',
        currency: 'USD',
        trade_lifecycle_state: 'ACTIVE',
      },
    ]);
    render(<TtpEnrollmentAdmin />);
    await waitFor(() => {
      expect(screen.getByText('TXN-PILOT-2026-0001')).toBeInTheDocument();
    });
  });
});

// ─── Reference: adminReviewTtpEnrollment is mocked to satisfy import ─────────
// It is called only from ReviewDialog which is not opened in this pilot.
void adminReviewTtpEnrollment;
