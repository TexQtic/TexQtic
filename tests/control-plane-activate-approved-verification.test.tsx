/**
 * CONTROL-PLANE-ACTIVATE-APPROVED-VERIFICATION-HARDENING-005
 *
 * Focused tests proving:
 * - Activate Approved Tenant button renders only when guard conditions are met
 *   (tenantStatus !== CLOSED && onboardingStatus === 'VERIFICATION_APPROVED')
 * - Button is absent for REJECTED, NEEDS_MORE_INFO, PENDING_VERIFICATION onboarding statuses
 * - Button is absent for CLOSED tenants even if onboardingStatus is VERIFICATION_APPROVED
 * - Clicking Activate Approved Tenant calls activateApprovedOnboarding(tenant.id)
 * - activateApprovedOnboarding is called exactly once per user click
 * - Button is disabled with loading label while request is in flight
 * - Activation success shows inline notice and removes the Activate button
 * - Activation failure surfaces error message and clears loading state
 * - No success notice is shown after an activation failure
 * - Fallback error message shown when error carries no message
 * - No product code, backend, API, schema, or DB changes
 */

/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantStatus, type TenantConfig } from '../types';
import { APIError } from '../services/apiClient';

vi.mock('../services/controlPlaneService', () => ({
  getTenants: vi.fn(),
  getTenantById: vi.fn(),
  provisionTenant: vi.fn(),
  activateApprovedOnboarding: vi.fn(),
  archiveTenant: vi.fn(),
  recordOnboardingOutcome: vi.fn(),
}));

import { TenantDetails } from '../components/ControlPlane/TenantDetails';
import {
  getTenantById,
  activateApprovedOnboarding,
} from '../services/controlPlaneService';

const getTenantByIdMock = vi.mocked(getTenantById);
const activateApprovedOnboardingMock = vi.mocked(activateApprovedOnboarding);

afterEach(() => {
  cleanup();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTenantConfig(overrides: Partial<TenantConfig> = {}): TenantConfig {
  return {
    id: 'tenant-act-001',
    slug: 'bridge-textiles',
    name: 'Bridge Textiles',
    type: 'B2B',
    status: TenantStatus.ACTIVE,
    onboarding_status: 'VERIFICATION_APPROVED',
    plan: 'PROFESSIONAL',
    theme: {
      primaryColor: '#4F46E5',
      secondaryColor: '#10B981',
      logo: '🏢',
    },
    features: [],
    aiBudget: 1000,
    aiUsage: 120,
    billingStatus: 'CURRENT',
    riskScore: 25,
    tenant_category: 'B2B',
    is_white_label: false,
    ...overrides,
  };
}

function stubMembershipsEmpty() {
  getTenantByIdMock.mockResolvedValue({
    tenant: {
      id: 'tenant-act-001',
      slug: 'bridge-textiles',
      name: 'Bridge Textiles',
      type: 'B2B',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
      onboarding_status: 'VERIFICATION_APPROVED',
      memberships: [],
    },
  });
}

// ─── 1. Activation button guard / visibility ──────────────────────────────────

describe('HARDENING-005 — Activation button guard', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    activateApprovedOnboardingMock.mockReset();
    stubMembershipsEmpty();
  });

  it('renders Activate Approved Tenant button for VERIFICATION_APPROVED non-CLOSED tenant', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: /Activate Approved Tenant/i })).toBeInTheDocument();
  });

  it('does NOT render Activate button for REJECTED onboarding status', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'REJECTED', status: TenantStatus.ACTIVE })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: /Activate Approved Tenant/i })).not.toBeInTheDocument();
  });

  it('does NOT render Activate button for VERIFICATION_NEEDS_MORE_INFO onboarding status', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_NEEDS_MORE_INFO',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: /Activate Approved Tenant/i })).not.toBeInTheDocument();
  });

  it('does NOT render Activate button for PENDING_VERIFICATION onboarding status', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'PENDING_VERIFICATION',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: /Activate Approved Tenant/i })).not.toBeInTheDocument();
  });

  it('does NOT render Activate button for CLOSED tenant even if onboarding_status is VERIFICATION_APPROVED', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.CLOSED,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: /Activate Approved Tenant/i })).not.toBeInTheDocument();
  });

  it('does NOT render Activate button when onboarding status is already ACTIVE', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'ACTIVE', status: TenantStatus.ACTIVE })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: /Activate Approved Tenant/i })).not.toBeInTheDocument();
  });
});

// ─── 2. Activation — success path ────────────────────────────────────────────

describe('HARDENING-005 — Activation success path', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    activateApprovedOnboardingMock.mockReset();
    stubMembershipsEmpty();
  });

  it('clicking Activate button calls activateApprovedOnboarding with tenant.id', async () => {
    activateApprovedOnboardingMock.mockResolvedValueOnce({
      tenant: { id: 'tenant-act-001', name: 'Bridge Textiles', status: 'ACTIVE' },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Activate Approved Tenant/i }));

    await waitFor(() => {
      expect(activateApprovedOnboardingMock).toHaveBeenCalledWith('tenant-act-001');
    });
  });

  it('clicking Activate button calls activateApprovedOnboarding exactly once', async () => {
    activateApprovedOnboardingMock.mockResolvedValueOnce({
      tenant: { id: 'tenant-act-001', name: 'Bridge Textiles', status: 'ACTIVE' },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Activate Approved Tenant/i }));

    await waitFor(() => {
      expect(activateApprovedOnboardingMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows activation success notice after successful activation', async () => {
    activateApprovedOnboardingMock.mockResolvedValueOnce({
      tenant: { id: 'tenant-act-001', name: 'Bridge Textiles', status: 'ACTIVE' },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Activate Approved Tenant/i }));

    await waitFor(() => {
      expect(screen.getByText(/Approved onboarding activation recorded/i)).toBeInTheDocument();
    });
  });

  it('removes Activate button after successful activation (onboarding transitions to ACTIVE)', async () => {
    activateApprovedOnboardingMock.mockResolvedValueOnce({
      tenant: { id: 'tenant-act-001', name: 'Bridge Textiles', status: 'ACTIVE' },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: /Activate Approved Tenant/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Activate Approved Tenant/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Activate Approved Tenant/i }),
      ).not.toBeInTheDocument();
    });
  });
});

// ─── 3. Activation — loading state ───────────────────────────────────────────

describe('HARDENING-005 — Activation loading state', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    activateApprovedOnboardingMock.mockReset();
    stubMembershipsEmpty();
  });

  it('disables Activate button with loading label while activation is in flight', async () => {
    let resolveActivation!: (v: unknown) => void;
    activateApprovedOnboardingMock.mockImplementationOnce(
      () => new Promise(res => { resolveActivation = res; }),
    );

    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Activate Approved Tenant/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Activating Approved Tenant\.\.\./i }),
      ).toBeDisabled();
    });

    resolveActivation({ tenant: { id: 'tenant-act-001', name: 'Bridge Textiles', status: 'ACTIVE' } });

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Activating Approved Tenant\.\.\./i }),
      ).not.toBeInTheDocument();
    });
  });
});

// ─── 4. Activation — error path ───────────────────────────────────────────────

describe('HARDENING-005 — Activation error path', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    activateApprovedOnboardingMock.mockReset();
    stubMembershipsEmpty();
  });

  it('shows error message when activateApprovedOnboarding throws an APIError', async () => {
    activateApprovedOnboardingMock.mockRejectedValueOnce(
      new APIError(409, 'Tenant is not in VERIFICATION_APPROVED state.', 'ONBOARDING_ACTIVATION_CONFLICT'),
    );

    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Activate Approved Tenant/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Tenant is not in VERIFICATION_APPROVED state\./i),
      ).toBeInTheDocument();
    });
  });

  it('clears loading state after activation error', async () => {
    activateApprovedOnboardingMock.mockRejectedValueOnce(
      new APIError(409, 'Tenant is not in VERIFICATION_APPROVED state.', 'ONBOARDING_ACTIVATION_CONFLICT'),
    );

    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Activate Approved Tenant/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Activating Approved Tenant\.\.\./i }),
      ).not.toBeInTheDocument();
    });
  });

  it('does NOT show success notice after activation error', async () => {
    activateApprovedOnboardingMock.mockRejectedValueOnce(
      new APIError(500, 'Internal server error', 'INTERNAL_ERROR'),
    );

    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Activate Approved Tenant/i }));

    await waitFor(() => {
      expect(activateApprovedOnboardingMock).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.queryByText(/Approved onboarding activation recorded/i),
    ).not.toBeInTheDocument();
  });

  it('shows fallback error message when thrown error has no message', async () => {
    activateApprovedOnboardingMock.mockRejectedValueOnce(new Error());

    render(
      <TenantDetails
        tenant={makeTenantConfig({
          onboarding_status: 'VERIFICATION_APPROVED',
          status: TenantStatus.ACTIVE,
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Activate Approved Tenant/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to activate approved onboarding state\./i),
      ).toBeInTheDocument();
    });
  });
});
