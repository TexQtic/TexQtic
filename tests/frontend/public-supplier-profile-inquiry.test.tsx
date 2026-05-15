/**
 * PublicSupplierProfile — Inquiry form tests (INQUIRY-004)
 *
 * Unit:    MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004
 * Family:  TexQtic public acquisition surfaces
 * Date:    2026-07-06
 *
 * Covers:
 *   PSI-001 — inquiry form renders after profile loads
 *   PSI-002 — submit disabled when no category selected
 *   PSI-003 — valid form submission → shows success state
 *   PSI-004 — submission error → shows error message
 *   PSI-005 — no contact/email/phone fields rendered
 *   PSI-006 — no payment/order/RFQ language in inquiry section
 *   PSI-007 — submitPublicInquiry called with correct payload (no PII)
 *   PSI-008 — success state replaces form (no double-submit path)
 *
 * Harness: vitest + @testing-library/react + jsdom
 */

import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { PublicSupplierProfile } from '../../components/Public/PublicSupplierProfile';
import * as publicB2BService from '../../services/publicB2BService';

// ─── Module mock ──────────────────────────────────────────────────────────────

vi.mock('../../services/publicB2BService', () => ({
  getPublicSupplierBySlug: vi.fn(),
  submitPublicInquiry: vi.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_PROFILE: publicB2BService.PublicB2BSupplierProfile = {
  slug: 'acme-textiles',
  legalName: 'Acme Textiles Ltd',
  orgType: 'B2B',
  jurisdiction: 'IN',
  certificationCount: 2,
  certificationTypes: ['ISO9001'],
  hasTraceabilityEvidence: false,
  taxonomy: {
    primarySegment: 'Textile',
    secondarySegments: [],
    rolePositions: ['Manufacturer'],
  },
  offeringPreview: [],
  publicationPosture: 'B2B_PUBLIC',
  eligibilityPosture: 'PUBLICATION_ELIGIBLE',
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(publicB2BService.getPublicSupplierBySlug).mockResolvedValue(MOCK_PROFILE);
  vi.mocked(publicB2BService.submitPublicInquiry).mockResolvedValue({
    acknowledged: true,
    message: 'Your inquiry has been received.',
  });
});

afterEach(() => {
  cleanup();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function renderAndWaitForProfile() {
  let component: ReturnType<typeof render>;
  await act(async () => {
    component = render(
      <PublicSupplierProfile
        slug="acme-textiles"
        onBack={() => {}}
        onSignIn={() => {}}
      />,
    );
  });
  // Wait for profile to load
  await screen.findByText('Acme Textiles Ltd');
  return component!;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('PublicSupplierProfile — inquiry form (INQUIRY-004)', () => {
  /**
   * PSI-001 — inquiry form renders after profile loads.
   *
   * The "Send an inquiry" section must appear once the profile is loaded.
   */
  it('PSI-001 — inquiry form renders after profile loads', async () => {
    await renderAndWaitForProfile();

    expect(screen.getByText(/Send an inquiry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Inquiry type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send inquiry/i })).toBeInTheDocument();
  });

  /**
   * PSI-002 — submit disabled when no category selected.
   *
   * The submit button must be disabled until an inquiry_category is chosen.
   */
  it('PSI-002 — submit disabled when no category selected', async () => {
    await renderAndWaitForProfile();

    const submitButton = screen.getByRole('button', { name: /Send inquiry/i });
    expect(submitButton).toBeDisabled();
  });

  /**
   * PSI-003 — valid form submission shows success state.
   *
   * Selecting a category and submitting must call submitPublicInquiry and
   * show the success confirmation message.
   */
  it('PSI-003 — valid form submission → shows success state', async () => {
    await renderAndWaitForProfile();

    const categorySelect = screen.getByLabelText(/Inquiry type/i);
    fireEvent.change(categorySelect, { target: { value: 'GENERAL' } });

    const submitButton = screen.getByRole('button', { name: /Send inquiry/i });
    expect(submitButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Your inquiry has been received/i)).toBeInTheDocument();
    });

    expect(publicB2BService.submitPublicInquiry).toHaveBeenCalledOnce();
  });

  /**
   * PSI-004 — submission error shows error message.
   *
   * When submitPublicInquiry rejects, the error message must be shown.
   */
  it('PSI-004 — submission error → shows error message', async () => {
    vi.mocked(publicB2BService.submitPublicInquiry).mockRejectedValueOnce(
      new Error('Network error'),
    );

    await renderAndWaitForProfile();

    const categorySelect = screen.getByLabelText(/Inquiry type/i);
    fireEvent.change(categorySelect, { target: { value: 'SOURCING_INTENT' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Unable to submit inquiry/i)).toBeInTheDocument();
    });
  });

  /**
   * PSI-005 — no contact/email/phone fields rendered.
   *
   * The inquiry form must not expose any PII collection fields.
   */
  it('PSI-005 — no contact/email/phone fields rendered', async () => {
    await renderAndWaitForProfile();

    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/phone/i)).toBeNull();
    expect(screen.queryByLabelText(/contact/i)).toBeNull();
    expect(screen.queryByLabelText(/name/i)).toBeNull();
  });

  /**
   * PSI-006 — no payment/order/RFQ language in inquiry section.
   *
   * The inquiry section must not contain any payment, order, or RFQ workflow language.
   */
  it('PSI-006 — no payment/order/RFQ language in inquiry section', async () => {
    await renderAndWaitForProfile();

    const inquirySection = screen.getByRole('region', { name: /Send an inquiry/i });
    const text = inquirySection.textContent ?? '';
    expect(text).not.toMatch(/\bpayment\b/i);
    expect(text).not.toMatch(/\border\b/i);
    expect(text).not.toMatch(/\bquote\b/i);
    expect(text).not.toMatch(/\bprice\b/i);
    expect(text).not.toMatch(/\bnegotiat/i);
  });

  /**
   * PSI-007 — submitPublicInquiry called with correct payload (no PII).
   *
   * When the form is submitted with optional fields, the payload must
   * contain supplier_slug, inquiry_category, and optional band fields —
   * but no PII (email, phone, buyer name, org UUID).
   */
  it('PSI-007 — submitPublicInquiry called with correct payload (no PII)', async () => {
    await renderAndWaitForProfile();

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
   * PSI-008 — success state replaces form (no double-submit path).
   *
   * After successful submission, the form must be hidden and only
   * the success message shown — preventing double-submit.
   */
  it('PSI-008 — success state replaces form (no double-submit path)', async () => {
    await renderAndWaitForProfile();

    fireEvent.change(screen.getByLabelText(/Inquiry type/i), {
      target: { value: 'GENERAL' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send inquiry/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Your inquiry has been received/i)).toBeInTheDocument();
    });

    // The submit button must no longer be visible
    expect(screen.queryByRole('button', { name: /Send inquiry/i })).toBeNull();
  });
});
