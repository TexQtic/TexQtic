/**
 * CONTROL-PLANE-ORG-MEMBER-VISIBILITY-HARDENING-002
 *
 * Focused tests proving:
 * - ControlPlaneOrgMemberSummary is read-only (no mutation controls)
 * - Summary renders correctly when memberships are present
 * - Empty state renders when memberships are absent or empty
 * - Member role / status / identity fields display correctly
 * - TenantDetails existing loading / error / retry / not-found / success behavior is not regressed
 * - No mutation controls appear in either component
 */

/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantStatus, type TenantConfig } from '../types';

vi.mock('../services/controlPlaneService', () => ({
  getTenants: vi.fn(),
  getTenantById: vi.fn(),
  provisionTenant: vi.fn(),
  activateApprovedOnboarding: vi.fn(),
  archiveTenant: vi.fn(),
}));

import { TenantDetails } from '../components/ControlPlane/TenantDetails';
import { ControlPlaneOrgMemberSummary, type ControlPlaneMembershipEntry } from '../components/ControlPlane/ControlPlaneOrgMemberSummary';
import { getTenantById } from '../services/controlPlaneService';

const getTenantByIdMock = vi.mocked(getTenantById);

afterEach(() => {
  cleanup();
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeMembership(overrides: Partial<ControlPlaneMembershipEntry> = {}): ControlPlaneMembershipEntry {
  return {
    id: 'mem-001',
    role: 'OWNER',
    status: 'ACTIVE',
    user: {
      id: 'user-001',
      email: 'owner@acme-textiles.com',
      emailVerified: true,
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

// ─── ControlPlaneOrgMemberSummary — Direct component tests ───────────────────

describe('CONTROL-PLANE-ORG-MEMBER-VISIBILITY-HARDENING-002 — ControlPlaneOrgMemberSummary direct', () => {
  it('renders loading state when loading prop is true', () => {
    render(<ControlPlaneOrgMemberSummary loading />);
    expect(screen.getByText('Loading membership records...')).toBeInTheDocument();
  });

  it('renders empty state when memberships is undefined', () => {
    render(<ControlPlaneOrgMemberSummary />);
    expect(screen.getByText('No membership records available for this tenant.')).toBeInTheDocument();
  });

  it('renders empty state when memberships is an empty array', () => {
    render(<ControlPlaneOrgMemberSummary memberships={[]} />);
    expect(screen.getByText('No membership records available for this tenant.')).toBeInTheDocument();
  });

  it('renders member email when memberships are present', () => {
    const memberships = [makeMembership({ user: { id: 'u1', email: 'alice@example.com', emailVerified: true } })];
    render(<ControlPlaneOrgMemberSummary memberships={memberships} />);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('renders member role badge for each membership', () => {
    const memberships = [makeMembership({ role: 'OWNER' })];
    render(<ControlPlaneOrgMemberSummary memberships={memberships} />);
    expect(screen.getByText('OWNER')).toBeInTheDocument();
  });

  it('renders member status badge for each membership', () => {
    const memberships = [makeMembership({ status: 'ACTIVE' })];
    render(<ControlPlaneOrgMemberSummary memberships={memberships} />);
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
  });

  it('renders Verified badge for email-verified members', () => {
    const memberships = [makeMembership({ user: { id: 'u1', email: 'verified@example.com', emailVerified: true } })];
    render(<ControlPlaneOrgMemberSummary memberships={memberships} />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders Unverified badge for non-verified members', () => {
    const memberships = [makeMembership({ user: { id: 'u1', email: 'unverified@example.com', emailVerified: false } })];
    render(<ControlPlaneOrgMemberSummary memberships={memberships} />);
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('renders member count label matching the number of memberships provided', () => {
    const memberships = [
      makeMembership({ id: 'm1', user: { id: 'u1', email: 'a@example.com', emailVerified: true } }),
      makeMembership({ id: 'm2', user: { id: 'u2', email: 'b@example.com', emailVerified: false } }),
    ];
    render(<ControlPlaneOrgMemberSummary memberships={memberships} />);
    expect(screen.getByText('2 members on record')).toBeInTheDocument();
  });

  it('renders singular member count label for exactly one membership', () => {
    const memberships = [makeMembership()];
    render(<ControlPlaneOrgMemberSummary memberships={memberships} />);
    expect(screen.getByText('1 member on record')).toBeInTheDocument();
  });

  it('renders all emails when multiple members are present', () => {
    const memberships = [
      makeMembership({ id: 'm1', user: { id: 'u1', email: 'first@example.com', emailVerified: true } }),
      makeMembership({ id: 'm2', user: { id: 'u2', email: 'second@example.com', emailVerified: true } }),
    ];
    render(<ControlPlaneOrgMemberSummary memberships={memberships} />);
    expect(screen.getByText('first@example.com')).toBeInTheDocument();
    expect(screen.getByText('second@example.com')).toBeInTheDocument();
  });

  // READ-ONLY GUARDRAIL TESTS

  it('READ-ONLY: does not render any revoke button', () => {
    const memberships = [makeMembership()];
    render(<ControlPlaneOrgMemberSummary memberships={memberships} />);
    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument();
  });

  it('READ-ONLY: does not render any remove button', () => {
    const memberships = [makeMembership()];
    render(<ControlPlaneOrgMemberSummary memberships={memberships} />);
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('READ-ONLY: does not render any invite button', () => {
    render(<ControlPlaneOrgMemberSummary memberships={[makeMembership()]} />);
    expect(screen.queryByRole('button', { name: /invite/i })).not.toBeInTheDocument();
  });

  it('READ-ONLY: does not render any edit or role-change button', () => {
    render(<ControlPlaneOrgMemberSummary memberships={[makeMembership()]} />);
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /change role/i })).not.toBeInTheDocument();
  });

  it('READ-ONLY: empty state also contains no mutation buttons', () => {
    render(<ControlPlaneOrgMemberSummary memberships={[]} />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  it('READ-ONLY: displays read-only guardrail label in populated state', () => {
    render(<ControlPlaneOrgMemberSummary memberships={[makeMembership()]} />);
    const readOnlyLabels = screen.getAllByText(/read-only/i);
    expect(readOnlyLabels.length).toBeGreaterThan(0);
  });

  it('READ-ONLY: displays read-only guardrail label in empty state', () => {
    render(<ControlPlaneOrgMemberSummary memberships={[]} />);
    const readOnlyLabels = screen.getAllByText(/read-only/i);
    expect(readOnlyLabels.length).toBeGreaterThan(0);
  });
});

// ─── TenantDetails — Integration with org/member summary ─────────────────────

describe('CONTROL-PLANE-ORG-MEMBER-VISIBILITY-HARDENING-002 — TenantDetails integration', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
  });

  it('renders org/member summary section in the success state', async () => {
    getTenantByIdMock.mockResolvedValueOnce({
      tenant: {
        id: 'tenant-1',
        slug: 'acme-textiles',
        name: 'Acme Textiles',
        type: 'B2B',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        memberships: [makeMembership()],
      } as any,
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Org & Member Summary')).toBeInTheDocument();
    });
  });

  it('renders member email in the detail view when memberships are returned', async () => {
    getTenantByIdMock.mockResolvedValueOnce({
      tenant: {
        id: 'tenant-1',
        slug: 'acme-textiles',
        name: 'Acme Textiles',
        type: 'B2B',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        memberships: [
          makeMembership({ user: { id: 'u1', email: 'alice@acme.com', emailVerified: true } }),
        ],
      } as any,
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('alice@acme.com')).toBeInTheDocument();
    });
  });

  it('renders empty membership state when getTenantById returns no memberships', async () => {
    getTenantByIdMock.mockResolvedValueOnce({
      tenant: {
        id: 'tenant-1',
        slug: 'acme-textiles',
        name: 'Acme Textiles',
        type: 'B2B',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        memberships: [],
      } as any,
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No membership records available for this tenant.')).toBeInTheDocument();
    });
  });

  it('renders empty membership state gracefully when getTenantById throws', async () => {
    getTenantByIdMock.mockRejectedValueOnce(new Error('Network error'));

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No membership records available for this tenant.')).toBeInTheDocument();
    });
  });

  it('READ-ONLY: no revoke or remove button appears in the TenantDetails view when memberships are present', async () => {
    getTenantByIdMock.mockResolvedValueOnce({
      tenant: {
        id: 'tenant-1',
        slug: 'acme-textiles',
        name: 'Acme Textiles',
        type: 'B2B',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        memberships: [makeMembership()],
      } as any,
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Org & Member Summary')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /invite/i })).not.toBeInTheDocument();
  });

  // Regression coverage for existing TenantDetails behavior

  it('REGRESSION: loading state still renders while tenant detail is loading', () => {
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

  it('REGRESSION: error state still renders when an error is passed', () => {
    render(
      <TenantDetails
        tenant={null}
        error="Failed to load tenant details."
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Failed to load tenant details.')).toBeInTheDocument();
  });

  it('REGRESSION: not-found state still renders when tenant is null and no loading/error', () => {
    render(
      <TenantDetails
        tenant={null}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(screen.getByText('Tenant not found')).toBeInTheDocument();
  });

  it('REGRESSION: lifecycle boundary labels still render in the success view', async () => {
    getTenantByIdMock.mockResolvedValueOnce({
      tenant: {
        id: 'tenant-1',
        slug: 'acme-textiles',
        name: 'Acme Textiles',
        type: 'B2B',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        memberships: [],
      } as any,
    });

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
