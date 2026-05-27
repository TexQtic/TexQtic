/**
 * CONTROL-PLANE-TENANT-ARCHIVE-FRONTEND-TEST-HARDENING-009
 *
 * Focused tests proving:
 * - T-ARC-001: canArchiveTenant is false when reason is empty — button disabled
 * - T-ARC-002: canArchiveTenant is false when slug confirmation does not match — button disabled
 * - T-ARC-003: isProtectedTenantArchiveTarget() returns true — protected notice shown, no archive button
 * - T-ARC-004: tenantStatus === CLOSED (already archived) — archived notice shown, no archive button
 * - T-ARC-005: canArchiveTenant is true when reason + matching slug + non-protected + non-CLOSED — button enabled
 * - T-ARC-006: handleArchiveTenant success — archiveTenant called with correct args, archiveNotice shown
 * - T-ARC-007: handleArchiveTenant error — archiveError shown, loading state cleared
 *
 * No product code, backend, API, schema, or DB changes.
 * Backend archive authorization is already hardened:
 *   - POST /tenants/:id/archive has requireAdminRole('SUPER_ADMIN') preHandler (control.ts line 786)
 *   - 3 existing backend integration tests in control-onboarding-outcome.integration.test.ts
 */

/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantStatus, type TenantConfig } from '../types';

vi.mock('../services/controlPlaneService', () => ({
  getTenants: vi.fn(),
  getTenantById: vi.fn(),
  provisionTenant: vi.fn(),
  activateApprovedOnboarding: vi.fn(),
  archiveTenant: vi.fn(),
  recordOnboardingOutcome: vi.fn(),
}));

import { TenantDetails } from '../components/ControlPlane/TenantDetails';
import { getTenantById, archiveTenant } from '../services/controlPlaneService';

const getTenantByIdMock = vi.mocked(getTenantById);
const archiveTenantMock = vi.mocked(archiveTenant);

afterEach(() => {
  cleanup();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTenantConfig(overrides: Partial<TenantConfig> = {}): TenantConfig {
  return {
    id: 'tenant-arc-001',
    slug: 'bridge-textiles',
    name: 'Bridge Textiles',
    type: 'B2B',
    // Use ACTIVE / 'ACTIVE' so neither the outcome-recording form nor the
    // activate-approved button renders — keeping the archive panel as the
    // sole interactive surface under test.
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

function stubMembershipsEmpty() {
  getTenantByIdMock.mockResolvedValue({
    tenant: {
      id: 'tenant-arc-001',
      slug: 'bridge-textiles',
      name: 'Bridge Textiles',
      type: 'B2B',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
      onboarding_status: 'ACTIVE',
      memberships: [],
    },
  });
}

// ─── 1. Guard — button disabled when reason is empty (T-ARC-001) ──────────────

describe('HARDENING-009 — T-ARC-001: reason empty disables archive button', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    archiveTenantMock.mockReset();
    stubMembershipsEmpty();
  });

  it('T-ARC-001: Archive Tenant To CLOSED button is disabled when reason is empty and slug not filled', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }),
    ).toBeDisabled();
  });

  it('T-ARC-001b: button remains disabled when slug is filled but reason is empty', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'bridge-textiles' },
    });

    expect(
      screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }),
    ).toBeDisabled();
  });
});

// ─── 2. Guard — button disabled when slug does not match (T-ARC-002) ──────────

describe('HARDENING-009 — T-ARC-002: slug mismatch disables archive button', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    archiveTenantMock.mockReset();
    stubMembershipsEmpty();
  });

  it('T-ARC-002: button disabled when reason is filled but slug confirmation does not match', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: 'Decommissioning for test run.' } },
    );
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'wrong-slug' },
    });

    expect(
      screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }),
    ).toBeDisabled();
  });

  it('T-ARC-002b: button disabled when reason filled but slug has wrong case variation', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: 'Decommissioning for test run.' } },
    );
    // The guard uses toLowerCase() comparison — mixed case should match, but
    // a completely different slug must still be rejected.
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'BRIDGE_TEXTILES' },
    });

    expect(
      screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }),
    ).toBeDisabled();
  });
});

// ─── 3. Protected target guard (T-ARC-003) ────────────────────────────────────

describe('HARDENING-009 — T-ARC-003: protected tenant shows notice, no archive button', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    archiveTenantMock.mockReset();
    getTenantByIdMock.mockResolvedValue({
      tenant: {
        id: 'tenant-qa-b2b',
        slug: 'qa-b2b',
        name: 'QA B2B',
        type: 'B2B',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        onboarding_status: 'ACTIVE',
        memberships: [],
      },
    });
  });

  it('T-ARC-003: protected-keep-set notice is shown for a slug in protectedArchiveSlugs', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ id: 'tenant-qa-b2b', slug: 'qa-b2b', name: 'QA B2B' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(
      screen.getByText(
        /This tenant is on the protected keep-set and cannot be archived from this surface/i,
      ),
    ).toBeInTheDocument();
  });

  it('T-ARC-003b: Archive Tenant To CLOSED button is absent for a protected tenant', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ id: 'tenant-qa-b2b', slug: 'qa-b2b', name: 'QA B2B' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /Archive Tenant To CLOSED/i }),
    ).not.toBeInTheDocument();
  });

  it('T-ARC-003c: protected notice shown for WHITE LABEL CO (protectedArchiveNames match)', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({
          id: 'tenant-wl-co',
          slug: 'white-label-co',
          name: 'WHITE LABEL CO',
        })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(
      screen.getByText(
        /This tenant is on the protected keep-set and cannot be archived from this surface/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Archive Tenant To CLOSED/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── 4. Already-archived guard (T-ARC-004) ───────────────────────────────────

describe('HARDENING-009 — T-ARC-004: CLOSED tenant shows already-archived notice, no archive button', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    archiveTenantMock.mockReset();
    getTenantByIdMock.mockResolvedValue({
      tenant: {
        id: 'tenant-arc-001',
        slug: 'bridge-textiles',
        name: 'Bridge Textiles',
        type: 'B2B',
        status: 'CLOSED',
        plan: 'PROFESSIONAL',
        onboarding_status: 'CLOSED',
        memberships: [],
      },
    });
  });

  it('T-ARC-004: already-archived notice shown when tenant status is CLOSED', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ status: TenantStatus.CLOSED, onboarding_status: 'CLOSED' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(
      screen.getByText(
        /This tenant is already archived with runtime and lifecycle state CLOSED/i,
      ),
    ).toBeInTheDocument();
  });

  it('T-ARC-004b: Archive Tenant To CLOSED button is absent when tenant is already CLOSED', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ status: TenantStatus.CLOSED, onboarding_status: 'CLOSED' })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /Archive Tenant To CLOSED/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── 5. Button enabled when all guard conditions met (T-ARC-005) ──────────────

describe('HARDENING-009 — T-ARC-005: canArchiveTenant true enables archive button', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    archiveTenantMock.mockReset();
    stubMembershipsEmpty();
  });

  it('T-ARC-005: button is enabled when reason is non-empty, slug matches, tenant is ACTIVE and non-protected', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: 'Decommissioning test tenant.' } },
    );
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'bridge-textiles' },
    });

    expect(
      screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }),
    ).not.toBeDisabled();
  });

  it('T-ARC-005b: slug comparison is case-insensitive (mixed-case slug match enables button)', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: 'Decommissioning test tenant.' } },
    );
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'Bridge-Textiles' },
    });

    expect(
      screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }),
    ).not.toBeDisabled();
  });
});

// ─── 6. handleArchiveTenant success path (T-ARC-006) ─────────────────────────

describe('HARDENING-009 — T-ARC-006: handleArchiveTenant success path', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    archiveTenantMock.mockReset();
    stubMembershipsEmpty();
  });

  it('T-ARC-006: archiveTenant called with correct tenantId, expectedSlug, and trimmed reason', async () => {
    archiveTenantMock.mockResolvedValueOnce({
      tenant: {
        id: 'tenant-arc-001',
        slug: 'bridge-textiles',
        name: 'Bridge Textiles',
        status: 'CLOSED',
        onboarding_status: 'CLOSED',
      },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: '  Test archive reason.  ' } },
    );
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'bridge-textiles' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }));

    await waitFor(() => {
      expect(archiveTenantMock).toHaveBeenCalledWith('tenant-arc-001', {
        expectedSlug: 'bridge-textiles',
        reason: 'Test archive reason.',
      });
    });

    expect(archiveTenantMock).toHaveBeenCalledTimes(1);
  });

  it('T-ARC-006b: archiveNotice is shown with tenant slug after successful archive', async () => {
    archiveTenantMock.mockResolvedValueOnce({
      tenant: {
        id: 'tenant-arc-001',
        slug: 'bridge-textiles',
        name: 'Bridge Textiles',
        status: 'CLOSED',
        onboarding_status: 'CLOSED',
      },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: 'Decommissioning test tenant.' } },
    );
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'bridge-textiles' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Tenant bridge-textiles archived\. Runtime access and org lifecycle are now CLOSED/i,
        ),
      ).toBeInTheDocument();
    });
  });

  it('T-ARC-006c: archive panel switches to already-archived notice after successful archive', async () => {
    archiveTenantMock.mockResolvedValueOnce({
      tenant: {
        id: 'tenant-arc-001',
        slug: 'bridge-textiles',
        name: 'Bridge Textiles',
        status: 'CLOSED',
        onboarding_status: 'CLOSED',
      },
    });

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: 'Decommissioning test tenant.' } },
    );
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'bridge-textiles' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /This tenant is already archived with runtime and lifecycle state CLOSED/i,
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: /Archive Tenant To CLOSED/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── 7. handleArchiveTenant error path (T-ARC-007) ───────────────────────────

describe('HARDENING-009 — T-ARC-007: handleArchiveTenant error path', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    archiveTenantMock.mockReset();
    stubMembershipsEmpty();
  });

  it('T-ARC-007: archiveError is shown when archiveTenant rejects', async () => {
    archiveTenantMock.mockRejectedValueOnce(new Error('Archive operation failed.'));

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: 'Decommissioning test tenant.' } },
    );
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'bridge-textiles' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }));

    await waitFor(() => {
      expect(screen.getByText('Archive operation failed.')).toBeInTheDocument();
    });
  });

  it('T-ARC-007b: fallback error message shown when rejection carries no message', async () => {
    archiveTenantMock.mockRejectedValueOnce({});

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: 'Decommissioning test tenant.' } },
    );
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'bridge-textiles' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to archive tenant.')).toBeInTheDocument();
    });
  });

  it('T-ARC-007c: loading state clears and button returns to base label after error', async () => {
    archiveTenantMock.mockRejectedValueOnce(new Error('Archive operation failed.'));

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: 'Decommissioning test tenant.' } },
    );
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'bridge-textiles' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }));

    await waitFor(() => {
      // Error shown — confirms loading has cleared
      expect(screen.getByText('Archive operation failed.')).toBeInTheDocument();
    });

    // Button label returns to base (not 'Archiving Tenant...')
    expect(
      screen.queryByRole('button', { name: /Archiving Tenant/i }),
    ).not.toBeInTheDocument();
  });

  it('T-ARC-007d: archiveTenant called exactly once even on error', async () => {
    archiveTenantMock.mockRejectedValueOnce(new Error('Network error.'));

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Document why this tenant should be archived.'),
      { target: { value: 'Decommissioning test tenant.' } },
    );
    fireEvent.change(screen.getByPlaceholderText('bridge-textiles'), {
      target: { value: 'bridge-textiles' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Archive Tenant To CLOSED/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error.')).toBeInTheDocument();
    });

    expect(archiveTenantMock).toHaveBeenCalledTimes(1);
  });
});
