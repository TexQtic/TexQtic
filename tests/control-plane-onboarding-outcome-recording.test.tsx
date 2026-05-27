/**
 * CONTROL-PLANE-ONBOARDING-OUTCOME-RECORDING-HARDENING-003
 *
 * Focused tests proving:
 * - Onboarding outcome recording form renders only for eligible statuses
 *   (PENDING_VERIFICATION, VERIFICATION_NEEDS_MORE_INFO)
 * - Form does not render for VERIFICATION_APPROVED, ACTIVE, or CLOSED tenants
 * - Outcome submission calls recordOnboardingOutcome with correct payload
 * - Reason is required for REJECTED; optional for APPROVED and NEEDS_MORE_INFO
 * - Success updates local onboardingStatus and shows inline notice
 * - APPROVED success reveals Activate Approved Tenant path without auto-activation
 * - Failed submission shows error notice
 * - Loading state disables submit button with correct label
 * - Existing archive behavior is preserved and not regressed
 * - No auto-activation of tenant after recording outcome
 * - No AdminRBAC mutation coupling introduced
 * - Existing TenantDetails loading / error / not-found states are not regressed
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
  recordOnboardingOutcome,
} from '../services/controlPlaneService';

const getTenantByIdMock = vi.mocked(getTenantById);
const recordOnboardingOutcomeMock = vi.mocked(recordOnboardingOutcome);
const activateApprovedOnboardingMock = vi.mocked(activateApprovedOnboarding);

afterEach(() => {
  cleanup();
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTenantConfig(overrides: Partial<TenantConfig> = {}): TenantConfig {
  return {
    id: 'tenant-123',
    slug: 'acme-textiles',
    name: 'Acme Textiles',
    type: 'B2B',
    status: TenantStatus.ACTIVE,
    onboarding_status: 'PENDING_VERIFICATION',
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
      id: 'tenant-123',
      slug: 'acme-textiles',
      name: 'Acme Textiles',
      type: 'B2B',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
      onboarding_status: 'PENDING_VERIFICATION',
      memberships: [],
    },
  });
}

// ─── 1. Form visibility ───────────────────────────────────────────────────────

describe('HARDENING-003 — Form visibility', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    recordOnboardingOutcomeMock.mockReset();
    activateApprovedOnboardingMock.mockReset();
    stubMembershipsEmpty();
  });

  it('renders outcome recording form for PENDING_VERIFICATION status', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Record Onboarding Outcome — SUPER_ADMIN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record Onboarding Outcome/i })).toBeInTheDocument();
  });

  it('renders outcome recording form for VERIFICATION_NEEDS_MORE_INFO status', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'VERIFICATION_NEEDS_MORE_INFO' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Record Onboarding Outcome — SUPER_ADMIN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record Onboarding Outcome/i })).toBeInTheDocument();
  });

  it('does not render outcome form for VERIFICATION_APPROVED — shows Activate button instead', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'VERIFICATION_APPROVED', status: TenantStatus.ACTIVE })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.queryByText('Record Onboarding Outcome — SUPER_ADMIN')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activate Approved Tenant/i })).toBeInTheDocument();
  });

  it('does not render outcome form when onboarding status is ACTIVE', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'ACTIVE', status: TenantStatus.ACTIVE })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.queryByText('Record Onboarding Outcome — SUPER_ADMIN')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Record Onboarding Outcome/i })).not.toBeInTheDocument();
  });

  it('does not render outcome form for CLOSED tenants', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'CLOSED', status: TenantStatus.CLOSED })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.queryByText('Record Onboarding Outcome — SUPER_ADMIN')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Record Onboarding Outcome/i })).not.toBeInTheDocument();
  });
});

// ─── 2. Outcome submission ────────────────────────────────────────────────────

describe('HARDENING-003 — Outcome submission', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    recordOnboardingOutcomeMock.mockReset();
    activateApprovedOnboardingMock.mockReset();
    stubMembershipsEmpty();
  });

  it('calls recordOnboardingOutcome with APPROVED payload on submit', async () => {
    recordOnboardingOutcomeMock.mockResolvedValueOnce({
      tenant: { id: 'tenant-123', name: 'Acme Textiles', status: 'VERIFICATION_APPROVED' },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'APPROVED' } });
    fireEvent.click(screen.getByRole('button', { name: /Record Onboarding Outcome/i }));

    await waitFor(() => {
      expect(recordOnboardingOutcomeMock).toHaveBeenCalledWith('tenant-123', { outcome: 'APPROVED' });
    });
  });

  it('calls recordOnboardingOutcome with REJECTED payload including reason', async () => {
    recordOnboardingOutcomeMock.mockResolvedValueOnce({
      tenant: { id: 'tenant-123', name: 'Acme Textiles', status: 'VERIFICATION_REJECTED' },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'REJECTED' } });
    fireEvent.change(screen.getByPlaceholderText(/Document the reason/i), {
      target: { value: 'Incomplete documentation provided.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Record Onboarding Outcome/i }));

    await waitFor(() => {
      expect(recordOnboardingOutcomeMock).toHaveBeenCalledWith('tenant-123', {
        outcome: 'REJECTED',
        reason: 'Incomplete documentation provided.',
      });
    });
  });

  it('calls recordOnboardingOutcome with NEEDS_MORE_INFO payload', async () => {
    recordOnboardingOutcomeMock.mockResolvedValueOnce({
      tenant: { id: 'tenant-123', name: 'Acme Textiles', status: 'VERIFICATION_NEEDS_MORE_INFO' },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'NEEDS_MORE_INFO' } });
    fireEvent.click(screen.getByRole('button', { name: /Record Onboarding Outcome/i }));

    await waitFor(() => {
      expect(recordOnboardingOutcomeMock).toHaveBeenCalledWith('tenant-123', { outcome: 'NEEDS_MORE_INFO' });
    });
  });

  it('shows success notice and lifecycle update on APPROVED submission', async () => {
    recordOnboardingOutcomeMock.mockResolvedValueOnce({
      tenant: { id: 'tenant-123', name: 'Acme Textiles', status: 'VERIFICATION_APPROVED' },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'APPROVED' } });
    fireEvent.click(screen.getByRole('button', { name: /Record Onboarding Outcome/i }));

    await waitFor(() => {
      expect(screen.getByText(/Onboarding outcome recorded: APPROVED/i)).toBeInTheDocument();
    });
  });

  it('APPROVED success reveals Activate Approved Tenant button without auto-activation', async () => {
    recordOnboardingOutcomeMock.mockResolvedValueOnce({
      tenant: { id: 'tenant-123', name: 'Acme Textiles', status: 'VERIFICATION_APPROVED' },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION', status: TenantStatus.ACTIVE })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: /Activate Approved Tenant/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'APPROVED' } });
    fireEvent.click(screen.getByRole('button', { name: /Record Onboarding Outcome/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Activate Approved Tenant/i })).toBeInTheDocument();
    });

    expect(activateApprovedOnboardingMock).not.toHaveBeenCalled();
  });

  it('does not auto-call activate-approved after recording APPROVED outcome', async () => {
    recordOnboardingOutcomeMock.mockResolvedValueOnce({
      tenant: { id: 'tenant-123', name: 'Acme Textiles', status: 'VERIFICATION_APPROVED' },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'APPROVED' } });
    fireEvent.click(screen.getByRole('button', { name: /Record Onboarding Outcome/i }));

    await waitFor(() => {
      expect(recordOnboardingOutcomeMock).toHaveBeenCalledTimes(1);
    });

    expect(activateApprovedOnboardingMock).not.toHaveBeenCalled();
  });
});

// ─── 3. REJECTED reason guard ─────────────────────────────────────────────────

describe('HARDENING-003 — Reason required for REJECTED', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    recordOnboardingOutcomeMock.mockReset();
    stubMembershipsEmpty();
  });

  it('submit button is disabled when no outcome is selected', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: /Record Onboarding Outcome/i })).toBeDisabled();
  });

  it('submit button is disabled for REJECTED when reason is empty', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'REJECTED' } });

    expect(screen.getByRole('button', { name: /Record Onboarding Outcome/i })).toBeDisabled();
  });

  it('submit button is enabled for REJECTED when reason is provided', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'REJECTED' } });
    fireEvent.change(screen.getByPlaceholderText(/Document the reason/i), {
      target: { value: 'Missing compliance docs.' },
    });

    expect(screen.getByRole('button', { name: /Record Onboarding Outcome/i })).not.toBeDisabled();
  });

  it('submit button is enabled for APPROVED without reason', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'APPROVED' } });

    expect(screen.getByRole('button', { name: /Record Onboarding Outcome/i })).not.toBeDisabled();
  });

  it('submit button is enabled for NEEDS_MORE_INFO without reason', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'NEEDS_MORE_INFO' } });

    expect(screen.getByRole('button', { name: /Record Onboarding Outcome/i })).not.toBeDisabled();
  });
});

// ─── 4. Error and loading states ──────────────────────────────────────────────

describe('HARDENING-003 — Error and loading states', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    recordOnboardingOutcomeMock.mockReset();
    stubMembershipsEmpty();
  });

  it('shows error notice when service call fails', async () => {
    recordOnboardingOutcomeMock.mockRejectedValueOnce(
      new APIError(409, 'Tenant onboarding outcome already recorded.', 'ONBOARDING_STATUS_CONFLICT'),
    );

    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'APPROVED' } });
    fireEvent.click(screen.getByRole('button', { name: /Record Onboarding Outcome/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tenant onboarding outcome already recorded\./i)).toBeInTheDocument();
    });
  });

  it('disables submit button with loading label while outcome recording is in progress', async () => {
    let resolveOutcome!: (v: unknown) => void;
    recordOnboardingOutcomeMock.mockImplementationOnce(
      () => new Promise(res => { resolveOutcome = res; }),
    );

    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'APPROVED' } });
    fireEvent.click(screen.getByRole('button', { name: /Record Onboarding Outcome/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Recording Outcome\.\.\./i })).toBeDisabled();
    });

    resolveOutcome({ tenant: { id: 'tenant-123', name: 'Acme Textiles', status: 'VERIFICATION_APPROVED' } });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Recording Outcome\.\.\./i })).not.toBeInTheDocument();
    });
  });
});

// ─── 5. Guardrails ────────────────────────────────────────────────────────────

describe('HARDENING-003 — Guardrails and regression', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    recordOnboardingOutcomeMock.mockReset();
    activateApprovedOnboardingMock.mockReset();
    stubMembershipsEmpty();
  });

  it('archive section is present alongside outcome form for eligible tenants', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Record Onboarding Outcome — SUPER_ADMIN')).toBeInTheDocument();
    expect(screen.getByText('Archive Tenant')).toBeInTheDocument();
  });

  it('"Other lifecycle actions are not available" label is preserved', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'PENDING_VERIFICATION' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Other lifecycle actions are not available in this surface.')).toBeInTheDocument();
  });

  it('existing TenantDetails loading state is not regressed', () => {
    render(
      <TenantDetails
        tenant={null}
        loading
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Loading tenant details...')).toBeInTheDocument();
  });

  it('existing TenantDetails error state is not regressed', () => {
    render(
      <TenantDetails
        tenant={null}
        error="Detail load failed."
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Detail load failed.')).toBeInTheDocument();
  });

  it('existing TenantDetails not-found state is not regressed', () => {
    render(
      <TenantDetails
        tenant={null}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Tenant not found')).toBeInTheDocument();
  });

  it('Activate Approved Tenant button renders for VERIFICATION_APPROVED and outcome form does not', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ onboarding_status: 'VERIFICATION_APPROVED', status: TenantStatus.ACTIVE })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: /Activate Approved Tenant/i })).toBeInTheDocument();
    expect(screen.queryByText('Record Onboarding Outcome — SUPER_ADMIN')).not.toBeInTheDocument();
  });
});
