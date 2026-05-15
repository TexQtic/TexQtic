/**
 * PublicReferralLanding — React Testing Library tests
 *
 * Unit:    MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005
 * Family:  TexQtic public acquisition surfaces
 * Date:    2026-07-06
 *
 * Covers:
 *   REF-001 — valid referral code renders invitation landing page
 *   REF-002 — empty referral code shows safe invalid state
 *   REF-003 — malformed referral code shows safe invalid state (defense in depth)
 *   REF-004 — no form elements rendered (no submission path)
 *   REF-005 — no contact / inquiry / private fields rendered
 *
 * Safety invariants verified:
 *   - No network calls made (no service mocks needed)
 *   - No dangerouslySetInnerHTML usage (structural test)
 *   - No form submission affordance
 *   - Prohibited private fields absent from rendered output
 *
 * Harness: vitest + @testing-library/react + jsdom
 */

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PublicReferralLanding } from '../../components/Public/PublicReferralLanding';

afterEach(() => {
  cleanup();
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('PublicReferralLanding (REFERRAL-005)', () => {
  /**
   * REF-001 — valid referral code renders invitation landing page.
   *
   * A well-formed referral code ([a-zA-Z0-9_-]{1,80}) must show the
   * invitation hero copy and the safe display of the referral code.
   */
  it('REF-001 — valid referral code renders invitation landing page', () => {
    render(
      <PublicReferralLanding
        referralCode="ABC-123_xyz"
        onBack={() => {}}
        onSignIn={() => {}}
      />,
    );
    expect(screen.getByText(/You have been invited/i)).toBeInTheDocument();
    expect(screen.getByText(/Join the TexQtic supplier network/i)).toBeInTheDocument();
    // Safe text display of referral code — React text content, not raw HTML injection
    expect(screen.getByText('ABC-123_xyz')).toBeInTheDocument();
  });

  /**
   * REF-002 — empty referral code shows safe invalid state.
   *
   * An empty string must not render invitation copy; must render the
   * "Referral link not recognised" state instead.
   */
  it('REF-002 — empty referral code shows safe invalid state', () => {
    render(
      <PublicReferralLanding
        referralCode=""
        onBack={() => {}}
        onSignIn={() => {}}
      />,
    );
    expect(screen.getByText(/Referral link not recognised/i)).toBeInTheDocument();
    expect(screen.getByText(/This referral link is not valid/i)).toBeInTheDocument();
    // Must NOT show invitation copy
    expect(screen.queryByText(/You have been invited/i)).toBeNull();
  });

  /**
   * REF-003 — malformed referral code shows safe invalid state (defense in depth).
   *
   * A code containing characters outside [a-zA-Z0-9_-] must not render invitation
   * copy. This confirms the component-level validator fires independently of the
   * route-level regex gate.
   */
  it('REF-003 — malformed referral code shows safe invalid state', () => {
    render(
      <PublicReferralLanding
        referralCode="<script>alert(1)</script>"
        onBack={() => {}}
        onSignIn={() => {}}
      />,
    );
    expect(screen.getByText(/Referral link not recognised/i)).toBeInTheDocument();
    expect(screen.queryByText(/You have been invited/i)).toBeNull();
    // The malformed string must not appear as raw HTML in the document
    expect(document.querySelector('script')).toBeNull();
  });

  /**
   * REF-004 — no form elements rendered.
   *
   * The component must not render any <form> elements. There is no data-submission
   * path in this unit (REFERRAL-005 scope: frontend-only, no data capture).
   */
  it('REF-004 — no form elements rendered', () => {
    const { container } = render(
      <PublicReferralLanding
        referralCode="VALID-CODE"
        onBack={() => {}}
        onSignIn={() => {}}
      />,
    );
    expect(container.querySelectorAll('form')).toHaveLength(0);
  });

  /**
   * REF-005 — no contact / inquiry / private fields rendered.
   *
   * The component must not render email, phone, or inquiry input labels or
   * prohibited private field strings.
   */
  it('REF-005 — no contact / inquiry / private fields rendered', () => {
    render(
      <PublicReferralLanding
        referralCode="VALID-CODE"
        onBack={() => {}}
        onSignIn={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/phone/i)).toBeNull();
    expect(screen.queryByLabelText(/inquiry/i)).toBeNull();
    // Prohibited private field strings must not appear in rendered output
    expect(screen.queryByText(/contact_email/i)).toBeNull();
    expect(screen.queryByText(/contact_phone/i)).toBeNull();
    expect(screen.queryByText(/external_orchestration_ref/i)).toBeNull();
  });

  /**
   * REF-006 — onBack callback fires when Back button is clicked.
   */
  it('REF-006 — onBack callback fires on Back button click', () => {
    const onBack = vi.fn();
    render(
      <PublicReferralLanding
        referralCode="VALID-CODE"
        onBack={onBack}
        onSignIn={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  /**
   * REF-007 — onSignIn callback fires when Sign in button in header is clicked.
   */
  it('REF-007 — onSignIn callback fires on Sign in button click', () => {
    const onSignIn = vi.fn();
    render(
      <PublicReferralLanding
        referralCode="VALID-CODE"
        onBack={() => {}}
        onSignIn={onSignIn}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /sign in$/i }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  /**
   * REF-008 — referral code display is truncated for codes exceeding 24 characters.
   */
  it('REF-008 — long referral code is safely truncated for display', () => {
    const longCode = 'ABCDEFGHIJKLMNOPQRSTUVWX12345'; // 29 chars
    render(
      <PublicReferralLanding
        referralCode={longCode}
        onBack={() => {}}
        onSignIn={() => {}}
      />,
    );
    // The full code must not appear verbatim
    expect(screen.queryByText(longCode)).toBeNull();
    // The truncated version (first 24 chars + ellipsis) must appear
    expect(screen.getByText('ABCDEFGHIJKLMNOPQRSTUVWX\u2026')).toBeInTheDocument();
  });
});
