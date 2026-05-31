/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APIError } from '../services/apiClient';

vi.mock('../services/controlPlaneService', () => ({
  getTenants: vi.fn(),
  getTenantById: vi.fn(),
  provisionTenant: vi.fn(),
  activateApprovedOnboarding: vi.fn(),
  archiveTenant: vi.fn(),
}));

import { TenantRegistry } from '../components/ControlPlane/TenantRegistry';
import { TenantDetails } from '../components/ControlPlane/TenantDetails';
import { TenantStatus, type TenantConfig } from '../types';
import {
  getTenantById,
  getTenants,
  provisionTenant,
  type Tenant,
} from '../services/controlPlaneService';
import {
  CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS,
  CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS,
  filterControlPlaneLaunchFacingTenantList,
  getControlPlaneTenantReadSideHideGuardrailReport,
  isControlPlaneTenantExcludedFromLaunchFacingList,
} from '../server/src/config/controlPlaneTenantReadExclusions';

const getTenantsMock = vi.mocked(getTenants);
const getTenantByIdMock = vi.mocked(getTenantById);
const provisionTenantMock = vi.mocked(provisionTenant);

afterEach(() => {
  cleanup();
});

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-1',
    slug: 'acme-textiles',
    name: 'Acme Textiles',
    type: 'B2B',
    status: 'ACTIVE',
    plan: 'PROFESSIONAL',
    isWhiteLabel: false,
    tenant_category: 'B2B',
    has_pending_first_owner_preparation_invite: false,
    aiBudget: {
      id: 'budget-1',
      monthlyLimit: 1000,
      currentUsage: 120,
      lastResetAt: '2026-05-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

function makeTenantConfig(overrides: Partial<TenantConfig> = {}): TenantConfig {
  return {
    id: 'tenant-1',
    slug: 'acme-textiles',
    name: 'Acme Textiles',
    type: 'B2B',
    status: TenantStatus.ACTIVE,
    onboarding_status: 'ACTIVE',
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

describe('CONTROL-PLANE-TENANT-LIST-DETAIL-HARDENING-001 — TenantRegistry read states', () => {
  beforeEach(() => {
    getTenantsMock.mockReset();
    getTenantByIdMock.mockReset();
    provisionTenantMock.mockReset();
  });

  it('renders loading first and then tenant rows on successful read', async () => {
    getTenantsMock.mockResolvedValueOnce({
      tenants: [makeTenant()],
    });

    render(
      <TenantRegistry
        lifecycleView="ACTIVE"
        onSelectTenant={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getAllByText('...').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('Acme Textiles')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Active Tenants').length).toBeGreaterThan(0);
  });

  it('renders stable empty state when no tenants are returned', async () => {
    getTenantsMock.mockResolvedValueOnce({ tenants: [] });

    render(
      <TenantRegistry
        lifecycleView="ACTIVE"
        onSelectTenant={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No tenants found')).toBeInTheDocument();
    });
  });

  it('renders API error and allows retry to recover', async () => {
    getTenantsMock
      .mockRejectedValueOnce(new APIError(500, 'Service temporarily unavailable. Try again.', 'INTERNAL_ERROR'))
      .mockResolvedValueOnce({ tenants: [makeTenant()] });

    render(
      <TenantRegistry
        lifecycleView="ACTIVE"
        onSelectTenant={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Error 500')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(getTenantsMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Acme Textiles')).toBeInTheDocument();
    });
  });

  it('surfaces tenant detail read error when opening tenant detail fails', async () => {
    const onSelectTenant = vi.fn();
    getTenantsMock.mockResolvedValueOnce({ tenants: [makeTenant()] });
    getTenantByIdMock.mockRejectedValueOnce(new APIError(404, 'Tenant not found', 'NOT_FOUND'));

    render(
      <TenantRegistry
        lifecycleView="ACTIVE"
        onSelectTenant={onSelectTenant}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Acme Textiles').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Acme Textiles')[0]);

    await waitFor(() => {
      expect(screen.getByText('Tenant not found')).toBeInTheDocument();
    });

    expect(onSelectTenant).not.toHaveBeenCalled();
  });
});

describe('FAM-07K1 — Provision New Tenant modal dynamicity', () => {
  beforeEach(() => {
    getTenantsMock.mockReset();
    getTenantByIdMock.mockReset();
    provisionTenantMock.mockReset();
    getTenantsMock.mockResolvedValue({ tenants: [makeTenant()] });
  });

  it('opens provision modal and renders selected-value clarity for plan and category', async () => {
    render(
      <TenantRegistry
        lifecycleView="ACTIVE"
        onSelectTenant={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Provision New Tenant' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Provision New Tenant' }));

    expect(screen.getByRole('heading', { name: 'Provision New Tenant' })).toBeInTheDocument();
    expect(screen.getByTestId('provision-modal-panel')).toHaveClass('max-h-[90vh]');
    expect(screen.getByTestId('provision-modal-scroll-area')).toHaveClass('overflow-y-auto');
    expect(screen.getByTestId('provision-category-selected-value')).toHaveTextContent('Selected: B2B');
    expect(screen.getByTestId('provision-plan-selected-value')).toHaveTextContent('Selected: No plan selected');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Provision Tenant' })).toBeInTheDocument();
    expect(screen.getByText('Canonical Provisioning Preview')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Commercial Plan *'), {
      target: { value: 'PROFESSIONAL' },
    });

    expect(screen.getByTestId('provision-plan-selected-value')).toHaveTextContent('Selected: PROFESSIONAL');
    expect(screen.getByTestId('provision-preview-commercial-plan')).toHaveTextContent('PROFESSIONAL');
  });

  it('updates guidance and canonical preview deterministically for category, plan, and white-label', async () => {
    render(
      <TenantRegistry
        lifecycleView="ACTIVE"
        onSelectTenant={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Provision New Tenant' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Provision New Tenant' }));

    fireEvent.change(screen.getByLabelText('Current Runtime Category Input *'), {
      target: { value: 'AGGREGATOR' },
    });
    fireEvent.change(screen.getByLabelText('Commercial Plan *'), {
      target: { value: 'ENTERPRISE' },
    });
    fireEvent.click(screen.getByLabelText('White-label Overlay Posture'));

    expect(screen.getByTestId('provision-category-guidance')).toHaveTextContent(
      'Aggregator runtime category maps to INTERNAL base family with aggregator capability enabled.',
    );
    expect(screen.getByTestId('provision-plan-guidance')).toHaveTextContent(
      'ENTERPRISE is intended for advanced packaged coverage and governance-heavy rollout.',
    );
    expect(screen.getByTestId('provision-white-label-guidance')).toHaveTextContent(
      'White-label overlay is enabled on top of aggregator runtime posture.',
    );

    expect(screen.getByTestId('provision-preview-runtime-category')).toHaveTextContent('AGGREGATOR');
    expect(screen.getByTestId('provision-preview-base-family')).toHaveTextContent('INTERNAL');
    expect(screen.getByTestId('provision-preview-commercial-plan')).toHaveTextContent('ENTERPRISE');
    expect(screen.getByTestId('provision-preview-aggregator-capability')).toHaveTextContent('Enabled');
    expect(screen.getByTestId('provision-preview-white-label-capability')).toHaveTextContent('Enabled');
  });

  it('submits using existing provision service payload shape', async () => {
    provisionTenantMock.mockResolvedValueOnce({
      orgId: 'org-123',
      slug: 'acme-provisioned',
      userId: 'user-123',
      membershipId: 'membership-123',
    });

    render(
      <TenantRegistry
        lifecycleView="ACTIVE"
        onSelectTenant={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Provision New Tenant' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Provision New Tenant' }));

    fireEvent.change(screen.getByLabelText('Org Name *'), {
      target: { value: 'Acme Provisioned Org' },
    });
    fireEvent.change(screen.getByLabelText('Owner Email *'), {
      target: { value: 'owner@acme.example' },
    });
    fireEvent.change(screen.getByLabelText('Owner Password *'), {
      target: { value: 'secret123' },
    });
    fireEvent.change(screen.getByLabelText('Commercial Plan *'), {
      target: { value: 'STARTER' },
    });
    fireEvent.change(screen.getByLabelText('Current Runtime Category Input *'), {
      target: { value: 'B2C' },
    });
    fireEvent.click(screen.getByLabelText('White-label Overlay Posture'));

    fireEvent.click(screen.getByRole('button', { name: 'Provision Tenant' }));

    await waitFor(() => {
      expect(provisionTenantMock).toHaveBeenCalledTimes(1);
    });

    expect(provisionTenantMock).toHaveBeenCalledWith({
      orgName: 'Acme Provisioned Org',
      primaryAdminEmail: 'owner@acme.example',
      primaryAdminPassword: 'secret123',
      plan: 'STARTER',
      tenant_category: 'B2C',
      is_white_label: true,
    });

    await waitFor(() => {
      expect(screen.getByText(/Tenant provisioned/i)).toBeInTheDocument();
    });
  });
});

describe('CONTROL-PLANE-TENANT-LIST-DETAIL-HARDENING-001 — TenantDetails read states', () => {
  it('renders loading state for tenant detail reads', () => {
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

  it('renders API error state with retry for tenant detail reads', () => {
    const onRetry = vi.fn();

    render(
      <TenantDetails
        tenant={null}
        error="Failed to load tenant details."
        onRetry={onRetry}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Failed to load tenant details.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders not-found state when selected tenant is missing', () => {
    render(
      <TenantDetails
        tenant={null}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Tenant not found')).toBeInTheDocument();
  });

  it('renders bounded lifecycle labels in successful detail view', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Other lifecycle actions are not available in this surface.')).toBeInTheDocument();
    expect(screen.getByText('Unavailable here')).toBeInTheDocument();
    expect(screen.getByText('Reinstate tenant')).toBeInTheDocument();
    expect(screen.getByText('Suspend tenant')).toBeInTheDocument();
    expect(screen.getByText('Delete tenant')).toBeInTheDocument();
  });
});

describe('CONTROL-PLANE-TEST-TENANT-CLEANUP-READ-SIDE-HIDE-IMPLEMENTATION-001', () => {
  it('excludes approved cleanup slugs from launch-facing list output', () => {
    const approvedSlug = CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS[0];
    const preservedSlug = CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS[0];

    const filtered = filterControlPlaneLaunchFacingTenantList([
      makeTenant({ id: 'approved-id', slug: approvedSlug, name: 'Approved Hidden Tenant' }),
      makeTenant({ id: 'preserved-id', slug: preservedSlug, name: 'Preserved Tenant' }),
      makeTenant({ id: 'visible-id', slug: 'explicitly-visible-test-tenant', name: 'Visible Tenant' }),
    ]);

    expect(filtered.map(tenant => tenant.slug)).toEqual([
      preservedSlug,
      'explicitly-visible-test-tenant',
    ]);
    expect(isControlPlaneTenantExcludedFromLaunchFacingList(approvedSlug)).toBe(true);
    expect(isControlPlaneTenantExcludedFromLaunchFacingList(preservedSlug)).toBe(false);
  });

  it('registry guardrails enforce exact count, uniqueness, and preserved overlap safety', () => {
    const report = getControlPlaneTenantReadSideHideGuardrailReport();

    expect(report.expectedApprovedCount).toBe(44);
    expect(report.approvedCount).toBe(44);
    expect(report.approvedUniqueCount).toBe(44);
    expect(report.duplicateApprovedSlugs).toEqual([]);
    expect(report.preservedOverlapSlugs).toEqual([]);
  });
});
