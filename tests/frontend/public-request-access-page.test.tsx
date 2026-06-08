/**
 * PublicRequestAccess — unit tests
 * IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-UI-01
 *
 * Authority:  DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01
 * Route:      /request-access
 *
 * Covers:
 *   TRA-001 — form renders with role selector and required fields
 *   TRA-002 — submit disabled while submitting (disabled attr present on pending click)
 *   TRA-003 — validation rejects missing role intent
 *   TRA-004 — validation rejects missing name
 *   TRA-005 — validation rejects when neither email nor phone provided
 *   TRA-006 — valid supplier submit sends expected payload including firstTouchTimestamp
 *   TRA-007 — valid submit with phone only (no email) is accepted
 *   TRA-008 — success state renders after API success
 *   TRA-009 — error panel renders on API error
 *   TRA-010 — 409 duplicate shows correct copy
 *   TRA-011 — 503 service unavailable shows correct copy
 *   TRA-012 — retry button returns to form
 *   TRA-013 — h_trap honeypot field is not visible to screen readers (aria-hidden)
 *   TRA-014 — forbidden fields are NOT present in submitted payload
 *   TRA-015 — firstTouchTimestamp is ISO 8601 datetime
 *   TRA-016 — roleIntent value sent matches exactly one of the API enum values
 *   TRA-017 — no GSTIN, Udyam, payment, or account-creation language on page
 *   TRA-018 — success message does not promise account activation or transactional access
 *   TRA-019 — referralCode prop is forwarded in payload when provided
 *   TRA-020 — submit button text reflects selected role intent
 *
 * Harness: vitest + @testing-library/react + jsdom
 */

import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { PublicRequestAccess } from '../../components/Public/PublicRequestAccess';
import * as tier0Service from '../../services/tier0Service';
import { APIError } from '../../services/apiClient';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../services/tier0Service', () => ({
  submitTier0RequestAccess: vi.fn(),
}));

// APIError is the real class (not mocked) — used to construct error fixtures.

// ─── Nav stub (complete PublicNavbarProps) ────────────────────────────────────

const NAV_STUB = {
  activeSection: 'home' as const,
  onGoHome: () => {},
  onGoB2B: () => {},
  onGoProducts: () => {},
  onGoCollections: () => {},
  onGoIndustry: () => {},
  onGoTrust: () => {},
  onGoAggregator: () => {},
  onGoInquiry: () => {},
  onGoPricing: () => {},
  onSignIn: () => {},
  onRequestAccess: () => {},
  onJoinTexQtic: () => {},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage(extra?: { referralCode?: string }) {
  return render(
    <PublicRequestAccess
      nav={NAV_STUB}
      onBack={() => {}}
      onSignIn={() => {}}
      {...extra}
    />,
  );
}

/** Returns the accessible form element (aria-label="Request access form"). */
function getForm() {
  return screen.getByRole('form', { name: /Request access form/i });
}

/** Returns the form's submit button (scoped to form to avoid navbar 'Request Access' button). */
function getSubmitBtn(namePattern: RegExp = /Request Access/i) {
  return within(getForm()).getByRole('button', { name: namePattern });
}

/** Fill the form with valid data for the given role. */
function fillValidForm(role: 'supplier' | 'buyer' | 'service_provider' | 'unknown' = 'supplier') {
  const roleLabel = { supplier: 'Supplier', buyer: 'Buyer', service_provider: 'Service Provider', unknown: 'Other / Not sure' }[role];
  fireEvent.click(screen.getByLabelText(new RegExp(roleLabel, 'i')));
  // Use selector to disambiguate 'Name' from 'Company or business name'
  fireEvent.change(document.getElementById('tier0-name')!, { target: { value: 'Test User' } });
  fireEvent.change(document.getElementById('tier0-email')!, { target: { value: 'test@example.com' } });
}

const SUCCESS_RESPONSE = {
  requestId: '550e8400-e29b-41d4-a716-446655440000',
  crmReceiptId: 'crm-receipt-abc123',
  status: 'RECEIVED',
  message: "You're on the list. Our team will be in touch.",
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(tier0Service.submitTier0RequestAccess).mockResolvedValue(SUCCESS_RESPONSE);
});

afterEach(() => {
  cleanup();
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('PublicRequestAccess', () => {
  /**
   * TRA-001 — form renders with role selector and required fields.
   */
  it('TRA-001 — form renders with role selector and required fields', () => {
    renderPage();
    // Role selector
    expect(screen.getByText(/I am a/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Supplier/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Buyer/i)).toBeInTheDocument();
    // Required fields — use getElementById to avoid label ambiguity
    expect(document.getElementById('tier0-name')).toBeInTheDocument();
    expect(document.getElementById('tier0-email')).toBeInTheDocument();
    expect(document.getElementById('tier0-phone')).toBeInTheDocument();
    // Submit button exists inside the form
    expect(getSubmitBtn()).toBeInTheDocument();
  });

  /**
   * TRA-002 — submit button disabled while submitting.
   */
  it('TRA-002 — submit button is disabled while submitting', async () => {
    let resolveSubmit!: (v: typeof SUCCESS_RESPONSE) => void;
    vi.mocked(tier0Service.submitTier0RequestAccess).mockImplementation(
      () => new Promise<typeof SUCCESS_RESPONSE>(res => { resolveSubmit = res; }),
    );
    renderPage();
    fillValidForm();
    const btn = screen.getByRole('button', { name: /Request Supplier Access/i });
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
    resolveSubmit(SUCCESS_RESPONSE);
    await waitFor(() => expect(screen.queryByRole('button', { name: /Request Supplier Access/i })).toBeNull());
  });

  /**
   * TRA-003 — validation rejects missing role intent.
   */
  it('TRA-003 — validation rejects missing role intent', async () => {
    renderPage();
    fireEvent.change(document.getElementById('tier0-name')!, { target: { value: 'Test User' } });
    fireEvent.change(document.getElementById('tier0-email')!, { target: { value: 'test@example.com' } });
    fireEvent.click(getSubmitBtn());
    expect(await screen.findByText(/Please select your role/i)).toBeInTheDocument();
    expect(tier0Service.submitTier0RequestAccess).not.toHaveBeenCalled();
  });

  /**
   * TRA-004 — validation rejects missing name.
   */
  it('TRA-004 — validation rejects missing name', async () => {
    renderPage();
    fireEvent.click(screen.getByLabelText(/Supplier/i));
    fireEvent.change(document.getElementById('tier0-email')!, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    expect(await screen.findByText(/Name is required/i)).toBeInTheDocument();
    expect(tier0Service.submitTier0RequestAccess).not.toHaveBeenCalled();
  });

  /**
   * TRA-005 — validation rejects when neither email nor phone provided.
   */
  it('TRA-005 — validation rejects when neither email nor phone provided', async () => {
    renderPage();
    fireEvent.click(screen.getByLabelText(/Supplier/i));
    fireEvent.change(document.getElementById('tier0-name')!, { target: { value: 'Test User' } });
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    expect(await screen.findByText(/Please provide at least one/i)).toBeInTheDocument();
    expect(tier0Service.submitTier0RequestAccess).not.toHaveBeenCalled();
  });

  /**
   * TRA-006 — valid supplier submit sends expected payload including firstTouchTimestamp.
   */
  it('TRA-006 — valid submit sends payload with firstTouchTimestamp ISO string', async () => {
    renderPage();
    fillValidForm('supplier');
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    await waitFor(() => expect(tier0Service.submitTier0RequestAccess).toHaveBeenCalledOnce());
    const [payload] = vi.mocked(tier0Service.submitTier0RequestAccess).mock.calls[0];
    expect(payload.roleIntent).toBe('supplier');
    expect(payload.name).toBe('Test User');
    expect(payload.email).toBe('test@example.com');
    // firstTouchTimestamp must be a valid ISO 8601 datetime string
    expect(typeof payload.firstTouchTimestamp).toBe('string');
    expect(() => new Date(payload.firstTouchTimestamp)).not.toThrow();
    expect(new Date(payload.firstTouchTimestamp).toISOString()).toBe(payload.firstTouchTimestamp);
  });

  /**
   * TRA-007 — valid submit with phone only (no email) is accepted.
   */
  it('TRA-007 — phone-only submit is accepted', async () => {
    renderPage();
    fireEvent.click(screen.getByLabelText(/Buyer/i));
    fireEvent.change(document.getElementById('tier0-name')!, { target: { value: 'Phone User' } });
    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: '+919876543210' } });
    fireEvent.click(screen.getByRole('button', { name: /Request Buyer Access/i }));
    await waitFor(() => expect(tier0Service.submitTier0RequestAccess).toHaveBeenCalledOnce());
    const [payload] = vi.mocked(tier0Service.submitTier0RequestAccess).mock.calls[0];
    expect(payload.roleIntent).toBe('buyer');
    expect(payload.phone).toBe('+919876543210');
    expect(payload.email).toBeUndefined();
  });

  /**
   * TRA-008 — success state renders after API success.
   */
  it('TRA-008 — success state renders after API success', async () => {
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    expect(await screen.findByText(/You're on the list/i)).toBeInTheDocument();
    // No name input visible in success state
    expect(document.getElementById('tier0-name')).toBeNull();
  });

  /**
   * TRA-009 — error panel renders on API error.
   */
  it('TRA-009 — error panel renders on API error', async () => {
    vi.mocked(tier0Service.submitTier0RequestAccess).mockRejectedValueOnce(
      new APIError(500, 'Internal error', 'INTERNAL_ERROR'),
    );
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    // Use heading role to avoid matching the paragraph that also contains the phrase
    expect(screen.getByRole('heading', { name: /Something went wrong/i })).toBeInTheDocument();
  });

  /**
   * TRA-010 — 409 duplicate shows correct copy.
   */
  it('TRA-010 — 409 duplicate shows conflict copy', async () => {
    vi.mocked(tier0Service.submitTier0RequestAccess).mockRejectedValueOnce(
      new APIError(409, 'Conflict', 'DUPLICATE_CONFLICT'),
    );
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    expect(await screen.findByText(/request may already exist/i)).toBeInTheDocument();
  });

  /**
   * TRA-011 — 503 service unavailable shows correct copy.
   */
  it('TRA-011 — 503 service unavailable shows retry-later copy', async () => {
    vi.mocked(tier0Service.submitTier0RequestAccess).mockRejectedValueOnce(
      new APIError(503, 'Service unavailable', 'SERVICE_UNAVAILABLE'),
    );
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    expect(await screen.findByText(/trouble connecting/i)).toBeInTheDocument();
  });

  /**
   * TRA-012 — retry button returns to form.
   */
  it('TRA-012 — retry button returns to form from error state', async () => {
    vi.mocked(tier0Service.submitTier0RequestAccess).mockRejectedValueOnce(
      new APIError(500, 'Internal error'),
    );
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(document.getElementById('tier0-name')).toBeInTheDocument();
  });

  /**
   * TRA-013 — h_trap honeypot field is not visible to screen readers (aria-hidden).
   */
  it('TRA-013 — honeypot container is aria-hidden', () => {
    renderPage();
    // The honeypot's wrapping div has aria-hidden="true"
    const hiddenInput = document.querySelector('input[name="h_trap"]');
    expect(hiddenInput).not.toBeNull();
    const container = hiddenInput!.closest('[aria-hidden="true"]');
    expect(container).not.toBeNull();
  });

  /**
   * TRA-014 — forbidden fields are NOT present in submitted payload.
   */
  it('TRA-014 — forbidden token fields are not sent in payload', async () => {
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    await waitFor(() => expect(tier0Service.submitTier0RequestAccess).toHaveBeenCalledOnce());
    const [payload] = vi.mocked(tier0Service.submitTier0RequestAccess).mock.calls[0];
    const forbidden = [
      'inviteToken', 'mainAppSessionToken', 'sessionToken', 'authToken',
      'accessToken', 'refreshToken', 'idToken', 'privateInviteUrl',
      'inviteUrl', 'token', 'tokenHash', 'mainAppTier0RequestId',
    ];
    for (const field of forbidden) {
      expect(payload).not.toHaveProperty(field);
    }
  });

  /**
   * TRA-015 — firstTouchTimestamp is ISO 8601 datetime.
   */
  it('TRA-015 — firstTouchTimestamp is a valid ISO 8601 UTC string', async () => {
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    await waitFor(() => expect(tier0Service.submitTier0RequestAccess).toHaveBeenCalled());
    const [payload] = vi.mocked(tier0Service.submitTier0RequestAccess).mock.calls[0];
    expect(payload.firstTouchTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // Must round-trip through Date without NaN
    expect(Number.isNaN(new Date(payload.firstTouchTimestamp).getTime())).toBe(false);
  });

  /**
   * TRA-016 — roleIntent value sent matches one of the API enum values.
   */
  it('TRA-016 — roleIntent sent is one of the four API-supported enum values', async () => {
    const VALID_ROLES = ['supplier', 'buyer', 'service_provider', 'unknown'];
    renderPage();
    fillValidForm('buyer');
    fireEvent.click(screen.getByRole('button', { name: /Request Buyer Access/i }));
    await waitFor(() => expect(tier0Service.submitTier0RequestAccess).toHaveBeenCalled());
    const [payload] = vi.mocked(tier0Service.submitTier0RequestAccess).mock.calls[0];
    expect(VALID_ROLES).toContain(payload.roleIntent);
  });

  /**
   * TRA-017 — no GSTIN, Udyam, payment, or account-creation language on page.
   */
  it('TRA-017 — page has no GSTIN/Udyam/payment/account-creation language', () => {
    renderPage();
    const text = document.body.textContent?.toLowerCase() ?? '';
    expect(text).not.toContain('gstin');
    expect(text).not.toContain('udyam');
    expect(text).not.toContain('razorpay');
    expect(text).not.toContain('payment');
    expect(text).not.toContain('subscription');
    // The form footer may say 'does not create an account' — that's correct;
    // we guard against affirmative account-activation language only
    expect(text).not.toContain('your account is ready');
    expect(text).not.toContain('account activated');
    expect(text).not.toContain('verified supplier');
    expect(text).not.toContain('rfq');
    expect(text).not.toContain('place an order');
  });

  /**
   * TRA-018 — success message does not promise account activation or transactional access.
   */
  it('TRA-018 — success message does not promise account or transactional access', async () => {
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    await screen.findByText(/You're on the list/i);
    const successText = document.body.textContent?.toLowerCase() ?? '';
    // Guard against positive/affirmative activation language only
    // (The panel may say 'no account has been created' as an explicit disclaimer — that's correct)
    expect(successText).not.toContain('your account has been created');
    expect(successText).not.toContain('account is ready');
    expect(successText).not.toContain('access granted');
    expect(successText).not.toContain('approved');
    expect(successText).not.toContain('now you can');
  });

  /**
   * TRA-019 — referralCode prop is forwarded in payload when provided.
   */
  it('TRA-019 — referralCode prop is forwarded in payload', async () => {
    renderPage({ referralCode: 'REF-ABC123' });
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /Request Supplier Access/i }));
    await waitFor(() => expect(tier0Service.submitTier0RequestAccess).toHaveBeenCalled());
    const [payload] = vi.mocked(tier0Service.submitTier0RequestAccess).mock.calls[0];
    expect(payload.referralCode).toBe('REF-ABC123');
  });

  /**
   * TRA-020 — submit button text reflects selected role intent.
   */
  it('TRA-020 — submit button text changes to reflect selected role', () => {
    renderPage();
    // Default: generic label scoped to form
    expect(getSubmitBtn(/Request Access/i)).toBeInTheDocument();
    // After selecting 'Buyer'
    fireEvent.click(screen.getByLabelText(/Buyer/i));
    expect(screen.getByRole('button', { name: /Request Buyer Access/i })).toBeInTheDocument();
    // After selecting 'Service Provider'
    fireEvent.click(screen.getByLabelText(/Service Provider/i));
    expect(screen.getByRole('button', { name: /Request Service Provider Access/i })).toBeInTheDocument();
  });
});
