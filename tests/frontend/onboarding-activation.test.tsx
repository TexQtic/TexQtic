/**
 * FAM-07D2 — Tenant Onboarding Existing-User Frontend Sign-In Handoff
 * FAM-07D2-TENANT-ONBOARDING-EXISTING-USER-FRONTEND-SIGN-IN-HANDOFF-001
 *
 * Unit:    FAM-07D2-TENANT-ONBOARDING-EXISTING-USER-FRONTEND-SIGN-IN-HANDOFF-001
 * Family:  FAM-07 — Auth: Existing-User Invite Activation Bypass Fix
 * Date:    2026-05-28
 *
 * Covers:
 *   ACT-001  EXISTING_USER_MUST_SIGN_IN: sign-in-first message is shown
 *   ACT-002  EXISTING_USER_MUST_SIGN_IN: generic "Activation failed" is NOT shown
 *   ACT-003  EXISTING_USER_MUST_SIGN_IN: onExistingUserSignIn callback is called when CTA clicked
 *   ACT-004  EXISTING_USER_MUST_SIGN_IN: activate button is hidden (not visible after error)
 *   ACT-005  ALREADY_MEMBER: already-member message is shown
 *   ACT-006  ALREADY_MEMBER: generic "Activation failed" is NOT shown
 *   ACT-007  ALREADY_MEMBER: sign-in CTA is shown
 *   ACT-008  Generic error: submitError message is shown (regression guard)
 *   ACT-009  Generic error: sign-in-first banner is NOT shown (no false positive)
 *   ACT-010  Validation gate fires before onComplete is called (missing fields guard)
 */

/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActivationFlow } from '../../components/Onboarding/OnboardingFlow';
import { ACTIVATION_ERROR_CODES } from '../../services/tenantService';

afterEach(() => {
  cleanup();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Render the form already on step 4 (the submission step) */
function renderAtStep4(props: {
  onComplete: () => Promise<void>;
  onExistingUserSignIn?: () => void;
}) {
  const { container } = render(
    <ActivationFlow
      onComplete={props.onComplete}
      onExistingUserSignIn={props.onExistingUserSignIn}
    />
  );

  // Click Continue 3 times to reach step 4
  const continueBtn = () => screen.getByRole('button', { name: /continue/i });
  fireEvent.click(continueBtn());
  fireEvent.click(continueBtn());
  fireEvent.click(continueBtn());

  return container;
}

/** Fill step-4 required fields and click Submit */
async function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(/registration number/i), {
    target: { value: 'REG-001' },
  });
  fireEvent.change(screen.getByLabelText(/jurisdiction/i), {
    target: { value: 'India' },
  });
  fireEvent.click(screen.getByRole('button', { name: /submit verification/i }));
}

function makeAPIError(code: string, message: string, status = 409) {
  const err: any = new Error(message);
  err.code = code;
  err.status = status;
  err.name = 'APIError';
  return err;
}

// ─── ACT-001 / ACT-002: EXISTING_USER_MUST_SIGN_IN ───────────────────────────

describe('EXISTING_USER_MUST_SIGN_IN error handling', () => {
  it('ACT-001: shows sign-in-first message when EXISTING_USER_MUST_SIGN_IN is thrown', async () => {
    const onComplete = vi.fn().mockRejectedValue(
      makeAPIError(ACTIVATION_ERROR_CODES.EXISTING_USER_MUST_SIGN_IN,
        'Existing TexQtic account found. Please sign in to accept this invite.')
    );

    renderAtStep4({ onComplete });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText(/a texqtic account already exists for this email/i)).toBeInTheDocument();
    });
  });

  it('ACT-002: does NOT show generic "Activation failed" for EXISTING_USER_MUST_SIGN_IN', async () => {
    const onComplete = vi.fn().mockRejectedValue(
      makeAPIError(ACTIVATION_ERROR_CODES.EXISTING_USER_MUST_SIGN_IN,
        'Existing TexQtic account found. Please sign in to accept this invite.')
    );

    renderAtStep4({ onComplete });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.queryByText(/activation failed/i)).not.toBeInTheDocument();
    });
  });

  it('ACT-003: calls onExistingUserSignIn when sign-in CTA is clicked', async () => {
    const onComplete = vi.fn().mockRejectedValue(
      makeAPIError(ACTIVATION_ERROR_CODES.EXISTING_USER_MUST_SIGN_IN,
        'Existing TexQtic account found. Please sign in to accept this invite.')
    );
    const onExistingUserSignIn = vi.fn();

    renderAtStep4({ onComplete, onExistingUserSignIn });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in to accept invite/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in to accept invite/i }));
    expect(onExistingUserSignIn).toHaveBeenCalledTimes(1);
  });

  it('ACT-004: submit button is hidden after EXISTING_USER_MUST_SIGN_IN error', async () => {
    const onComplete = vi.fn().mockRejectedValue(
      makeAPIError(ACTIVATION_ERROR_CODES.EXISTING_USER_MUST_SIGN_IN,
        'Existing TexQtic account found. Please sign in to accept this invite.')
    );

    renderAtStep4({ onComplete });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /submit verification/i })).not.toBeInTheDocument();
    });
  });
});

// ─── ACT-005 / ACT-006 / ACT-007: ALREADY_MEMBER ────────────────────────────

describe('ALREADY_MEMBER error handling', () => {
  it('ACT-005: shows already-member message when ALREADY_MEMBER is thrown', async () => {
    const onComplete = vi.fn().mockRejectedValue(
      makeAPIError(ACTIVATION_ERROR_CODES.ALREADY_MEMBER,
        'Membership already exists')
    );

    renderAtStep4({ onComplete });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText(/already a member of this workspace/i)).toBeInTheDocument();
    });
  });

  it('ACT-006: does NOT show generic "Activation failed" for ALREADY_MEMBER', async () => {
    const onComplete = vi.fn().mockRejectedValue(
      makeAPIError(ACTIVATION_ERROR_CODES.ALREADY_MEMBER,
        'Membership already exists')
    );

    renderAtStep4({ onComplete });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.queryByText(/activation failed/i)).not.toBeInTheDocument();
    });
  });

  it('ACT-007: sign-in CTA is shown for ALREADY_MEMBER', async () => {
    const onComplete = vi.fn().mockRejectedValue(
      makeAPIError(ACTIVATION_ERROR_CODES.ALREADY_MEMBER,
        'Membership already exists')
    );
    const onExistingUserSignIn = vi.fn();

    renderAtStep4({ onComplete, onExistingUserSignIn });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onExistingUserSignIn).toHaveBeenCalledTimes(1);
  });
});

// ─── ACT-008 / ACT-009: Generic error (regression guard) ─────────────────────

describe('Generic error handling (regression guard)', () => {
  it('ACT-008: shows generic submitError message for unknown errors', async () => {
    const onComplete = vi.fn().mockRejectedValue(
      new Error('Server is temporarily unavailable')
    );

    renderAtStep4({ onComplete });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText(/server is temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  it('ACT-009: sign-in-first banner is NOT shown for generic errors', async () => {
    const onComplete = vi.fn().mockRejectedValue(
      new Error('Server is temporarily unavailable')
    );

    renderAtStep4({ onComplete });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.queryByText(/a texqtic account already exists/i)).not.toBeInTheDocument();
    });
  });
});

// ─── ACT-010: Validation gate ────────────────────────────────────────────────

describe('Validation gate (step 4 required fields)', () => {
  it('ACT-010: onComplete is NOT called when required fields are empty', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);

    renderAtStep4({ onComplete });

    // Do NOT fill fields — click Submit directly
    fireEvent.click(screen.getByRole('button', { name: /submit verification/i }));

    // onComplete must not have been called
    expect(onComplete).not.toHaveBeenCalled();

    // Validation error shown
    expect(
      screen.getByText(/registration number and jurisdiction are required/i)
    ).toBeInTheDocument();
  });
});
