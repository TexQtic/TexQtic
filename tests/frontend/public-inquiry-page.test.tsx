/**
 * PublicInquiryPage — unit tests (PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001)
 *
 * Unit:    PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001
 * Family:  TexQtic public acquisition surfaces
 * Date:    2026-07-08
 *
 * Covers:
 *   PII-001 — no-context mode rendered when supplierSlug is empty
 *   PII-002 — no-context mode rendered when supplierSlug is invalid
 *   PII-003 — form rendered when valid supplierSlug provided
 *   PII-004 — submit disabled when no category selected
 *   PII-005 — valid submit → success state
 *   PII-006 — submission error → error message with retry
 *   PII-007 — 429 error → rate-limit message
 *   PII-008 — 404 error → supplier unavailable message
 *   PII-009 — no PII fields rendered
 *   PII-010 — submitPublicInquiry called with correct payload (no PII)
 *   PII-011 — success state replaces form (no double-submit)
 *   PII-012 — no payment/order/RFQ language on page
 *
 * Harness: vitest + @testing-library/react + jsdom
 */

import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { PublicInquiryPage } from '../../components/Public/PublicInquiryPage';
import * as publicB2BService from '../../services/publicB2BService';

// ─── Module mock ──────────────────────────────────────────────────────────────

vi.mock('../../services/publicB2BService', () => ({
  submitPublicInquiry: vi.fn(),
}));

// ─── Nav stub ─────────────────────────────────────────────────────────────────

const NAV_STUB = {
  activeSection: 'inquiry' as const,
  onGoHome: () => {},
  onGoB2B: () => {},
  onGoProducts: () => {},
  onGoCollections: () => {},
  onGoIndustry: () => {},
  onGoTrust: () => {},
  onGoAggregator: () => {},
  onGoInquiry: () => {},
  onSignIn: () => {},
  onRequestAccess: () => {},
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(publicB2BService.submitPublicInquiry).mockResolvedValue({
    acknowledged: true,
    message: 'Your inquiry has been received.',
  });
});

afterEach(() => {
  cleanup();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage(supplierSlug: string) {
  return render(
    <PublicInquiryPage
      supplierSlug={supplierSlug}
      nav={NAV_STUB}
      onBack={() => {}}
      onSignIn={() => {}}
    />,
  );
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('PublicInquiryPage', () => {
  /**
   * PII-001 — no-context mode rendered when supplierSlug is empty.
   */
  it('PII-001 — no-context mode when supplierSlug is empty', () => {
    renderPage('');
    expect(screen.getByText(/Looking for a specific supplier/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find suppliers/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Inquiry type/i)).toBeNull();
  });

  /**
   * PII-002 — no-context mode rendered when supplierSlug is invalid (contains uppercase or spaces).
   */
  it('PII-002 — no-context mode when supplierSlug is invalid', () => {
    renderPage('INVALID Slug!');
    expect(screen.getByText(/Looking for a specific supplier/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Inquiry type/i)).toBeNull();
  });

  /**
   * PII-003 — form rendered when valid supplierSlug provided.
   */
  it('PII-003 — form rendered when valid supplierSlug provided', () => {
    renderPage('acme-textiles');
    expect(screen.getByLabelText(/Inquiry type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send inquiry/i })).toBeInTheDocument();
  });

  /**
   * PII-004 — submit disabled when no category selected.
   */
  it('PII-004 — submit disabled when no category selected', () => {
    renderPage('acme-textiles');
    expect(screen.getByRole('button', { name: /Send inquiry/i })).toBeDisabled();
  });

  /**
   * PII-005 — valid submit → success state.
   */
  it('PII-005 — valid submit → success state', async () => {
    renderPage('acme-textiles');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'GENERAL' },
    });

    const submitBtn = screen.getByRole('button', { name: /Send inquiry/i });
    expect(submitBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Your interest has been recorded/i)).toBeInTheDocument();
    });

    expect(publicB2BService.submitPublicInquiry).toHaveBeenCalledOnce();
  });

  /**
   * PII-006 — generic error → error message with retry.
   */
  it('PII-006 — generic error → error message with retry button', async () => {
    vi.mocked(publicB2BService.submitPublicInquiry).mockRejectedValueOnce(
      new Error('Network error'),
    );

    renderPage('acme-textiles');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'SOURCING_INTENT' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/We could not record your inquiry right now/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
  });

  /**
   * PII-007 — 429 error → rate-limit message.
   */
  it('PII-007 — 429 error → rate-limit message', async () => {
    vi.mocked(publicB2BService.submitPublicInquiry).mockRejectedValueOnce(
      new Error('429 Too Many Requests'),
    );

    renderPage('acme-textiles');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'GENERAL' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Too many submissions/i)).toBeInTheDocument();
    });
  });

  /**
   * PII-008 — 404 error → supplier unavailable message.
   */
  it('PII-008 — 404 error → supplier unavailable message', async () => {
    vi.mocked(publicB2BService.submitPublicInquiry).mockRejectedValueOnce(
      new Error('404 Not Found'),
    );

    renderPage('acme-textiles');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'GENERAL' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/This supplier is not currently available for inquiry/i),
      ).toBeInTheDocument();
    });
  });

  /**
   * PII-009 — no PII fields rendered.
   */
  it('PII-009 — no PII fields rendered', () => {
    renderPage('acme-textiles');
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/phone/i)).toBeNull();
    expect(screen.queryByLabelText(/contact/i)).toBeNull();
    expect(screen.queryByLabelText(/name/i)).toBeNull();
  });

  /**
   * PII-010 — submitPublicInquiry called with correct payload (no PII).
   */
  it('PII-010 — submitPublicInquiry called with correct payload', async () => {
    renderPage('acme-textiles');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'CAPABILITY_FIT' },
    });
    fireEvent.change(screen.getByLabelText(/Geography/i), {
      target: { value: 'South Asia' },
    });
    fireEvent.change(screen.getByLabelText(/Volume range/i), {
      target: { value: '500-1000' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(publicB2BService.submitPublicInquiry).toHaveBeenCalledOnce();
    });

    const [payload] = vi.mocked(publicB2BService.submitPublicInquiry).mock.calls[0];
    expect(payload.supplier_slug).toBe('acme-textiles');
    expect(payload.inquiry_category).toBe('CAPABILITY_FIT');
    expect(payload.geo_band).toBe('South Asia');
    expect(payload.volume_band).toBe('500-1000');
    // No PII fields
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('phone');
    expect(payload).not.toHaveProperty('buyer_name');
    expect(payload).not.toHaveProperty('org_id');
  });

  /**
   * PII-011 — success state replaces form (no double-submit path).
   */
  it('PII-011 — success state replaces form', async () => {
    renderPage('acme-textiles');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'GENERAL' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Your interest has been recorded/i)).toBeInTheDocument();
    });

    // Form is gone — cannot double-submit
    expect(screen.queryByLabelText(/Inquiry type/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Send inquiry/i })).toBeNull();
  });

  /**
   * PII-012 — no payment/order/RFQ language on the page.
   */
  it('PII-012 — no payment/order/RFQ language on inquiry form', () => {
    const { container } = renderPage('acme-textiles');
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\bpayment\b/i);
    expect(text).not.toMatch(/\border\b/i);
    expect(text).not.toMatch(/\bquote\b/i);
    expect(text).not.toMatch(/\bprice\b/i);
    expect(text).not.toMatch(/\bnegotiat/i);
  });
});
