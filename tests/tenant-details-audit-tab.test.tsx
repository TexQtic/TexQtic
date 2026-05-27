/**
 * CONTROL-PLANE-TENANT-AUDIT-LOG-TAB-HARDENING-004
 *
 * Focused tests proving:
 * - TenantAuditLogSummary renders loading state on mount
 * - TenantAuditLogSummary renders empty state when no logs are returned
 * - TenantAuditLogSummary renders error state on fetch failure
 * - TenantAuditLogSummary renders populated log entries (action, actor, timestamp)
 * - getAuditLogs is called with tenantId and limit
 * - No mutation buttons/forms/inputs are present in TenantAuditLogSummary
 * - TenantDetails AUDIT tab renders TenantAuditLogSummary instead of the placeholder notice
 * - TenantDetails AUDIT tab passes the selected tenant id to TenantAuditLogSummary
 * - Other TenantDetails tabs are not regressed
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
  getAuditLogs: vi.fn(),
}));

import { TenantAuditLogSummary } from '../components/ControlPlane/TenantAuditLogSummary';
import { TenantDetails } from '../components/ControlPlane/TenantDetails';
import { getAuditLogs, getTenantById } from '../services/controlPlaneService';

const getAuditLogsMock = vi.mocked(getAuditLogs);
const getTenantByIdMock = vi.mocked(getTenantById);

afterEach(() => {
  cleanup();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-audit-test-001';

function makeAuditLog(overrides: Partial<ReturnType<typeof makeAuditLog>> = {}) {
  return {
    id: 'log-abc123',
    realm: null,
    action: 'TENANT_ONBOARDED',
    actorId: 'admin-uuid-9999',
    actorType: 'ADMIN',
    entity: 'tenant',
    entityId: TENANT_ID,
    beforeJson: null,
    afterJson: null,
    metadataJson: { source: 'test' },
    tenantId: TENANT_ID,
    createdAt: '2026-05-01T12:00:00.000Z',
    reasoningLogId: null,
    tenant: { slug: 'acme-textiles', name: 'Acme Textiles' },
    ...overrides,
  };
}

function makeTenantConfig(overrides: Partial<TenantConfig> = {}): TenantConfig {
  return {
    id: TENANT_ID,
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

function stubMembershipsEmpty() {
  getTenantByIdMock.mockResolvedValue({
    tenant: {
      id: TENANT_ID,
      slug: 'acme-textiles',
      name: 'Acme Textiles',
      type: 'B2B',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
      onboarding_status: 'ACTIVE',
      memberships: [],
    },
  });
}

// ─── 1. TenantAuditLogSummary — Loading state ─────────────────────────────────

describe('HARDENING-004 — TenantAuditLogSummary: loading state', () => {
  beforeEach(() => {
    getAuditLogsMock.mockReset();
  });

  it('renders loading skeletons before the fetch resolves', async () => {
    // Never resolves — keeps loading state visible
    getAuditLogsMock.mockReturnValue(new Promise(() => {}));

    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    // Loading means no empty-state message
    expect(screen.queryByText('No audit entries found')).not.toBeInTheDocument();
    // "Read Only" badge is part of the panel header, should be present immediately
    expect(screen.getByText('Read Only')).toBeInTheDocument();
  });

  it('calls getAuditLogs with the provided tenantId and default limit on mount', async () => {
    getAuditLogsMock.mockResolvedValue({ logs: [], count: 0 });

    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      expect(getAuditLogsMock).toHaveBeenCalledWith({ tenantId: TENANT_ID, limit: 25 });
    });
  });

  it('calls getAuditLogs with a custom limit when provided', async () => {
    getAuditLogsMock.mockResolvedValue({ logs: [], count: 0 });

    render(<TenantAuditLogSummary tenantId={TENANT_ID} limit={10} />);

    await waitFor(() => {
      expect(getAuditLogsMock).toHaveBeenCalledWith({ tenantId: TENANT_ID, limit: 10 });
    });
  });
});

// ─── 2. TenantAuditLogSummary — Empty state ───────────────────────────────────

describe('HARDENING-004 — TenantAuditLogSummary: empty state', () => {
  beforeEach(() => {
    getAuditLogsMock.mockReset();
    getAuditLogsMock.mockResolvedValue({ logs: [], count: 0 });
  });

  it('renders empty state when the fetch returns no logs', async () => {
    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      expect(screen.getByText('No audit entries found')).toBeInTheDocument();
    });
  });

  it('does not render any log rows in empty state', async () => {
    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      expect(screen.queryByText(/\[TENANT_ONBOARDED\]/)).not.toBeInTheDocument();
    });
  });
});

// ─── 3. TenantAuditLogSummary — Error state ──────────────────────────────────

describe('HARDENING-004 — TenantAuditLogSummary: error state', () => {
  beforeEach(() => {
    getAuditLogsMock.mockReset();
  });

  it('renders error state when the fetch throws an APIError', async () => {
    const apiErr = new APIError(500, 'Internal error', 'INTERNAL_ERROR');
    getAuditLogsMock.mockRejectedValue(apiErr);

    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      // ErrorState renders the status code as a heading — e.g. "Error 500"
      expect(screen.getByText('Error 500')).toBeInTheDocument();
    });
  });

  it('renders error state when the fetch throws a non-APIError', async () => {
    getAuditLogsMock.mockRejectedValue(new Error('Network failure'));

    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load audit log for this tenant.'),
      ).toBeInTheDocument();
    });
  });
});

// ─── 4. TenantAuditLogSummary — Populated state ──────────────────────────────

describe('HARDENING-004 — TenantAuditLogSummary: populated state', () => {
  beforeEach(() => {
    getAuditLogsMock.mockReset();
  });

  it('renders the action label for each log entry', async () => {
    getAuditLogsMock.mockResolvedValue({ logs: [makeAuditLog()], count: 1 });

    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      expect(screen.getByText('[TENANT_ONBOARDED]')).toBeInTheDocument();
    });
  });

  it('renders the actor label for each log entry', async () => {
    getAuditLogsMock.mockResolvedValue({ logs: [makeAuditLog()], count: 1 });

    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      // actorType:actorId(first 8 chars) → "ADMIN:admin-uu"
      expect(screen.getByText('ADMIN:admin-uu')).toBeInTheDocument();
    });
  });

  it('renders a timestamp for each log entry', async () => {
    getAuditLogsMock.mockResolvedValue({ logs: [makeAuditLog()], count: 1 });

    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      // toLocaleString() output is environment-dependent; just confirm no "(unknown time)"
      expect(screen.queryByText('(unknown time)')).not.toBeInTheDocument();
    });
  });

  it('renders the entry count when logs are returned', async () => {
    getAuditLogsMock.mockResolvedValue({ logs: [makeAuditLog()], count: 1 });

    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      expect(screen.getByText('1 entries')).toBeInTheDocument();
    });
  });

  it('renders multiple log entries', async () => {
    const logs = [
      makeAuditLog({ id: 'log-1', action: 'TENANT_ONBOARDED' }),
      makeAuditLog({ id: 'log-2', action: 'TENANT_ARCHIVED' }),
    ];
    getAuditLogsMock.mockResolvedValue({ logs, count: 2 });

    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      expect(screen.getByText('[TENANT_ONBOARDED]')).toBeInTheDocument();
      expect(screen.getByText('[TENANT_ARCHIVED]')).toBeInTheDocument();
    });
  });
});

// ─── 5. TenantAuditLogSummary — Read-only guardrail ─────────────────────────

describe('HARDENING-004 — TenantAuditLogSummary: read-only guardrail', () => {
  beforeEach(() => {
    getAuditLogsMock.mockReset();
    getAuditLogsMock.mockResolvedValue({ logs: [makeAuditLog()], count: 1 });
  });

  it('renders the Read Only badge', async () => {
    render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    expect(screen.getByText('Read Only')).toBeInTheDocument();
  });

  it('contains no mutation submit buttons', async () => {
    const { container } = render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      // Retry button is allowed (non-mutation read action); check for form/write buttons by text
      const buttons = container.querySelectorAll('button');
      const buttonTexts = Array.from(buttons).map(b => b.textContent?.toLowerCase() ?? '');
      const mutationKeywords = ['submit', 'save', 'archive', 'activate', 'record', 'delete'];
      for (const keyword of mutationKeywords) {
        expect(buttonTexts.some(t => t.includes(keyword))).toBe(false);
      }
    });
  });

  it('contains no form elements', async () => {
    const { container } = render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      expect(container.querySelectorAll('form')).toHaveLength(0);
    });
  });

  it('contains no text inputs or selects', async () => {
    const { container } = render(<TenantAuditLogSummary tenantId={TENANT_ID} />);

    await waitFor(() => {
      expect(container.querySelectorAll('input')).toHaveLength(0);
      expect(container.querySelectorAll('select')).toHaveLength(0);
      expect(container.querySelectorAll('textarea')).toHaveLength(0);
    });
  });
});

// ─── 6. TenantDetails AUDIT tab integration ──────────────────────────────────

describe('HARDENING-004 — TenantDetails: AUDIT tab integration', () => {
  beforeEach(() => {
    getAuditLogsMock.mockReset();
    getTenantByIdMock.mockReset();
    stubMembershipsEmpty();
    getAuditLogsMock.mockResolvedValue({ logs: [], count: 0 });
  });

  const defaultProps = {
    onBack: vi.fn(),
    onImpersonate: vi.fn(),
  };

  it('renders TenantAuditLogSummary content when AUDIT tab is clicked', async () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        {...defaultProps}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /audit log/i }));

    await waitFor(() => {
      // Panel header "Audit Log" is inside TenantAuditLogSummary (as h3)
      expect(screen.getByRole('heading', { name: /audit log/i })).toBeInTheDocument();
    });
  });

  it('does NOT render the old placeholder notice after switching to AUDIT tab', async () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        {...defaultProps}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /audit log/i }));

    await waitFor(() => {
      expect(
        screen.queryByText('Detailed audit review lives in the separate Audit Logs area.'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('This tenant deep-dive does not provide parity with the dedicated read-only audit surface.'),
      ).not.toBeInTheDocument();
    });
  });

  it('passes the tenant id to getAuditLogs when AUDIT tab is clicked', async () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        {...defaultProps}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /audit log/i }));

    await waitFor(() => {
      expect(getAuditLogsMock).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID }),
      );
    });
  });

  it('renders empty state in AUDIT tab when no logs are returned', async () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        {...defaultProps}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /audit log/i }));

    await waitFor(() => {
      expect(screen.getByText('No audit entries found')).toBeInTheDocument();
    });
  });

  it('renders populated log entries in AUDIT tab', async () => {
    getAuditLogsMock.mockResolvedValue({ logs: [makeAuditLog()], count: 1 });

    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        {...defaultProps}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /audit log/i }));

    await waitFor(() => {
      expect(screen.getByText('[TENANT_ONBOARDED]')).toBeInTheDocument();
    });
  });

  it('does not render audit log fetch on OVERVIEW tab (default)', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        {...defaultProps}
      />,
    );

    // Default tab is OVERVIEW — TenantAuditLogSummary is not mounted yet
    expect(getAuditLogsMock).not.toHaveBeenCalled();
  });

  it('other tabs (PLAN) still render their content after AUDIT tab added', async () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig()}
        {...defaultProps}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /plan & ai budget/i }));

    await waitFor(() => {
      // The h3 heading is unique; tab button label also matches so scope to heading role
      expect(screen.getByRole('heading', { name: /Plan & AI Budget/i })).toBeInTheDocument();
    });
  });
});
