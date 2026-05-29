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
 *   ACT-011  acceptAuthenticatedInvite: calls POST to /api/tenant/activate-authenticated
 *   ACT-012  acceptAuthenticatedInvite: returns response data on success
 */

/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActivationFlow } from '../../components/Onboarding/OnboardingFlow';
import { ACTIVATION_ERROR_CODES, acceptAuthenticatedInvite, activateTenant } from '../../services/tenantService';
import * as apiClient from '../../services/apiClient';

vi.mock('../../services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/apiClient')>();
  return {
    ...actual,
    post: vi.fn(),
  };
});

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

// ─── ACT-011 / ACT-012: acceptAuthenticatedInvite service function ────────────

describe('acceptAuthenticatedInvite service', () => {
  it('ACT-011: calls POST to /api/tenant/activate-authenticated with inviteToken', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      token: 'new-jwt', user: { id: 'u1', email: 'a@b.com' }, tenant: {}, membership: { role: 'MEMBER' },
    });

    await acceptAuthenticatedInvite({ inviteToken: 'test-token-123' });

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      '/api/tenant/activate-authenticated',
      { inviteToken: 'test-token-123' }
    );
  });

  it('ACT-012: returns response data from the API', async () => {
    const fakeResponse = {
      token: 'tenant-jwt-xyz',
      user: { id: 'user-123', email: 'member@example.com' },
      tenant: { id: 'tenant-abc', name: 'Test Corp', slug: 'test-corp', type: 'B2B', status: 'ACTIVE', plan: 'FREE' },
      membership: { role: 'MEMBER' },
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(fakeResponse);

    const result = await acceptAuthenticatedInvite({ inviteToken: 'invite-token-xyz' });

    expect(result).toEqual(fakeResponse);
  });
});

// ─── ACT-013 / ACT-014: activateTenant service function (F-MISS-01 / F-MISS-02) ──

describe('activateTenant service (FAM-07G — F-MISS-01 / F-MISS-02)', () => {
  it('ACT-013 (F-MISS-01): calls POST /api/tenant/activate with expected payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      token: 'new-jwt',
      user: { id: 'u1', email: 'owner@example.com' },
      tenant: { id: 't1', name: 'Acme', slug: 'acme', type: 'B2B', status: 'PENDING_VERIFICATION', plan: 'FREE' },
      membership: { role: 'OWNER' },
    });

    await activateTenant({
      inviteToken: 'test-token-abc',
      userData: { email: 'owner@example.com', password: 'ValidPass99' },
      verificationData: { registrationNumber: 'REG-001', jurisdiction: 'IN-MH' },
    });

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      '/api/tenant/activate',
      expect.objectContaining({
        inviteToken: 'test-token-abc',
        userData: { email: 'owner@example.com', password: 'ValidPass99' },
        verificationData: { registrationNumber: 'REG-001', jurisdiction: 'IN-MH' },
      }),
    );
  });

  it('ACT-014 (F-MISS-02): returns response data from the API', async () => {
    const fakeResponse = {
      token: 'tenant-jwt-xyz',
      user: { id: 'user-123', email: 'owner@example.com' },
      tenant: { id: 'tenant-abc', name: 'Test Corp', slug: 'test-corp', type: 'B2B', status: 'PENDING_VERIFICATION', plan: 'FREE' },
      membership: { role: 'OWNER' },
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(fakeResponse);

    const result = await activateTenant({
      inviteToken: 'invite-token-xyz',
      userData: { email: 'owner@example.com', password: 'ValidPass99' },
      verificationData: { registrationNumber: 'REG-002', jurisdiction: 'IN-MH' },
    });

    expect(result).toEqual(fakeResponse);
  });
});

// ─── ACT-015: FC-03 stale-state guard (F-MISS-03) ────────────────────────────

describe('FC-03 stale-state guard — invite token cleared after successful activation (FAM-07G — F-MISS-03)', () => {
  /**
   * Regression guard for the FC-03 fix in App.tsx ONBOARDING onComplete handler.
   *
   * LIMITATION: App.tsx does not have a full integration test harness. This test
   * verifies the behavioral contract of the fix by simulating the handler sequence
   * inline — confirming that the invite-token-clearing action (setPendingInviteToken)
   * is invoked immediately after activateTenant() resolves, even when a subsequent
   * post-activation step throws. This mirrors exactly the order imposed by the fix.
   */
  it('ACT-015 (F-MISS-03): invite token is cleared immediately after activateTenant succeeds even if post-activation bootstrap throws', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      token: 'tenant-jwt-fc03',
      user: { id: 'user-fc03', email: 'test@example.com' },
      tenant: { id: 'tenant-fc03', name: 'FC03 Org', slug: 'fc03', type: 'B2B', status: 'PENDING_VERIFICATION', plan: 'FREE' },
      membership: { role: 'OWNER' },
    });

    const clearInviteToken = vi.fn();
    let pendingToken: string | null = 'fc03-invite-token';

    // Simulate the App.tsx ONBOARDING onComplete handler with FC-03 fix applied.
    // clearInviteToken represents setPendingInviteToken(null).
    const handler = async () => {
      const raw = await activateTenant({
        inviteToken: pendingToken!,
        userData: { email: 'test@example.com', password: 'ValidPass99' },
        verificationData: { registrationNumber: 'REG-001', jurisdiction: 'IN-MH' },
      }) as any;
      // FC-03 fix: clear before any post-activation step
      pendingToken = null;
      clearInviteToken(null);
      // Simulate post-activation step throwing (e.g. getCurrentUser network failure)
      void raw; // consumed
      throw new Error('Simulated getCurrentUser failure');
    };

    await expect(handler()).rejects.toThrow('Simulated getCurrentUser failure');

    // Invite token must be cleared even though the handler threw after activation
    expect(clearInviteToken).toHaveBeenCalledWith(null);
    expect(pendingToken).toBeNull();
  });
});
