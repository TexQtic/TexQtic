/**
 * PublicInquiryPage — unit tests (PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001)
 *
 * Unit:    PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001
 * Family:  TexQtic public acquisition surfaces
 * Date:    2026-07-08
 *
 * Covers:
 *   PII-001 — no-context mode renders general inquiry form when supplierSlug is empty
 *   PII-002 — no-context mode renders general inquiry form when supplierSlug is invalid
 *   PII-003 — supplier-context form rendered when valid supplierSlug provided
 *   PII-004 — submit disabled when no category selected
 *   PII-005 — valid submit → success state
 *   PII-006 — submission error → error message with retry
 *   PII-007 — 429 error → rate-limit message
 *   PII-008 — 404 error → supplier unavailable message
 *   PII-009 — no PII fields rendered in supplier form
 *   PII-010 — submitPublicInquiry called with correct supplier payload (no PII)
 *   PII-011 — success state replaces form (no double-submit)
 *   PII-012 — no payment/order/RFQ language on page
 *   PII-013 — general form renders when no supplierSlug
 *   PII-014 — general form has no name/email/phone/company fields
 *   PII-015 — general submit calls submitPublicInquiry without supplier_slug
 *   PII-016 — general submit includes source_surface: GENERAL_PUBLIC
 *   PII-017 — general submit includes message only when provided
 *   PII-018 — general submit without message sends no message field
 *   PII-019 — general success state does not echo message content
 *   PII-020 — 400 PII error shows safe UI copy
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
   * PII-001 — no-context mode renders general inquiry form when supplierSlug is empty.
   */
  it('PII-001 — no-context mode renders general form when supplierSlug is empty', () => {
    renderPage('');
    expect(screen.getByLabelText(/Inquiry type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send inquiry/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Find suppliers/i })).toBeNull();
  });

  /**
   * PII-002 — no-context mode renders general inquiry form when supplierSlug is invalid.
   */
  it('PII-002 — no-context mode renders general form when supplierSlug is invalid', () => {
    renderPage('INVALID Slug!');
    expect(screen.getByLabelText(/Inquiry type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send inquiry/i })).toBeDisabled();
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

  // ── Phase 2: General mode tests ─────────────────────────────────────────────

  /**
   * PII-013 — general inquiry form renders when no supplierSlug.
   */
  it('PII-013 — general inquiry form renders when no supplierSlug', () => {
    renderPage('');
    expect(screen.getByLabelText(/Inquiry type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send inquiry/i })).toBeInTheDocument();
  });

  /**
   * PII-014 — general inquiry form has no name/email/phone/company fields.
   */
  it('PII-014 — general form has no name/email/phone/company fields', () => {
    renderPage('');
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/phone/i)).toBeNull();
    expect(screen.queryByLabelText(/name/i)).toBeNull();
    expect(screen.queryByLabelText(/company/i)).toBeNull();
  });

  /**
   * PII-015 — general submit calls submitPublicInquiry without supplier_slug.
   */
  it('PII-015 — general submit calls submitPublicInquiry without supplier_slug', async () => {
    renderPage('');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'GENERAL' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(publicB2BService.submitPublicInquiry).toHaveBeenCalledOnce();
    });

    const [payload] = vi.mocked(publicB2BService.submitPublicInquiry).mock.calls[0];
    expect(payload.supplier_slug).toBeUndefined();
    expect(payload.inquiry_category).toBe('GENERAL');
  });

  /**
   * PII-016 — general submit includes source_surface: GENERAL_PUBLIC.
   */
  it('PII-016 — general submit includes source_surface GENERAL_PUBLIC', async () => {
    renderPage('');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'SOURCING_INTENT' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(publicB2BService.submitPublicInquiry).toHaveBeenCalledOnce();
    });

    const [payload] = vi.mocked(publicB2BService.submitPublicInquiry).mock.calls[0];
    expect(payload.source_surface).toBe('GENERAL_PUBLIC');
  });

  /**
   * PII-017 — general submit includes message when provided.
   */
  it('PII-017 — general submit includes message when provided', async () => {
    renderPage('');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'GENERAL' },
    });
    fireEvent.change(screen.getByLabelText(/Additional context/i), {
      target: { value: 'Looking for garment suppliers' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(publicB2BService.submitPublicInquiry).toHaveBeenCalledOnce();
    });

    const [payload] = vi.mocked(publicB2BService.submitPublicInquiry).mock.calls[0];
    expect(payload.message).toBe('Looking for garment suppliers');
  });

  /**
   * PII-018 — general submit without message sends no message field.
   */
  it('PII-018 — general submit without message sends no message field', async () => {
    renderPage('');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'GENERAL' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(publicB2BService.submitPublicInquiry).toHaveBeenCalledOnce();
    });

    const [payload] = vi.mocked(publicB2BService.submitPublicInquiry).mock.calls[0];
    expect(payload.message).toBeUndefined();
  });

  /**
   * PII-019 — general success state does not echo message content.
   */
  it('PII-019 — general success state does not echo message content', async () => {
    renderPage('');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'GENERAL' },
    });
    fireEvent.change(screen.getByLabelText(/Additional context/i), {
      target: { value: 'Unique-token-XYZ-9a3f2b' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Your interest has been recorded/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Unique-token-XYZ-9a3f2b/i)).toBeNull();
  });

  /**
   * PII-020 — 400 error (PII in message) shows safe UI copy.
   */
  it('PII-020 — 400 PII error shows safe UI copy', async () => {
    vi.mocked(publicB2BService.submitPublicInquiry).mockRejectedValueOnce(
      Object.assign(new Error('Invalid message content'), { status: 400 }),
    );

    renderPage('');

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'GENERAL' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/do not include contact details/i)).toBeInTheDocument();
    });
  });
});
