/**
 * CONTROL-PLANE-IMPERSONATION-APP-INTEGRATION-HARDENING-007
 *
 * Tier 2 — App-level impersonation integration tests (T-IMP-012 through T-IMP-016).
 *
 * Tests proving:
 * - T-IMP-012: Short reason blocks submit (button disabled, startImpersonationSession not called)
 * - T-IMP-013: Empty member list blocks API call (error shown, startImpersonationSession not called)
 * - T-IMP-014: getCurrentUser throws → rollback (stopImpersonationSession called)
 * - T-IMP-015: Mismatched tenant after session start → rollback (stopImpersonationSession called)
 * - T-IMP-016: Exit impersonation stops session and clears active state
 *
 * No product code, backend, API, schema, or DB changes.
 * Family: FTR-CP-001 — OPEN, authorization-gated.
 */

/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/controlPlaneService', () => ({
  getTenants: vi.fn(),
  getTenantById: vi.fn(),
  startImpersonationSession: vi.fn(),
  stopImpersonationSession: vi.fn(),
  provisionTenant: vi.fn(),
  activateApprovedOnboarding: vi.fn(),
  archiveTenant: vi.fn(),
  recordOnboardingOutcome: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  getCurrentUser: vi.fn(),
  resolvePublicEntryDescriptor: vi.fn().mockResolvedValue(null),
}));

import App from '../App';
import { setImpersonationToken } from '../services/apiClient';
import {
  getTenants,
  getTenantById,
  startImpersonationSession,
  stopImpersonationSession,
} from '../services/controlPlaneService';
import { getCurrentUser } from '../services/authService';

// ── Constants ─────────────────────────────────────────────────────────────────

const MOCK_TENANT_ID = 'tenant-1';
const MOCK_ADMIN_ID = 'admin-1';
const MOCK_IMPERSONATION_ID = 'imp-session-001';
const MOCK_IMPERSONATION_TOKEN = 'fake-imp-token';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeFakeAdminJwt = (adminId: string, role = 'SUPER_ADMIN', expiresInSec = 3600) => {
  const payload = btoa(JSON.stringify({
    adminId,
    role,
    exp: Math.floor(Date.now() / 1000) + expiresInSec,
  }));
  return `x.${payload}.x`;
};

const seedControlPlaneAuthState = (adminId = MOCK_ADMIN_ID) => {
  localStorage.setItem('texqtic_admin_token', makeFakeAdminJwt(adminId));
  localStorage.setItem('texqtic_auth_realm', 'CONTROL_PLANE');
  localStorage.setItem('texqtic_control_plane_identity', JSON.stringify({
    id: adminId,
    email: 'admin@texqtic.com',
    role: 'SUPER_ADMIN',
  }));
};

const seedImpersonationRestoreState = (adminId = MOCK_ADMIN_ID) => {
  localStorage.setItem('texqtic_admin_token', makeFakeAdminJwt(adminId));
  localStorage.setItem('texqtic_auth_realm', 'TENANT');
  localStorage.setItem('texqtic_control_plane_identity', JSON.stringify({
    id: adminId,
    email: 'admin@texqtic.com',
    role: 'SUPER_ADMIN',
  }));
  localStorage.setItem('texqtic_impersonation_session', JSON.stringify({
    adminId,
    state: {
      isAdmin: true,
      targetTenantId: MOCK_TENANT_ID,
      startTime: new Date().toISOString(),
      impersonationId: MOCK_IMPERSONATION_ID,
      token: MOCK_IMPERSONATION_TOKEN,
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    },
  }));
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TENANT_LIST_ITEM = {
  id: MOCK_TENANT_ID,
  name: 'Acme Co',
  slug: 'acme',
  type: 'B2B',
  status: 'ACTIVE',
  plan: 'STARTER',
};

const MOCK_TENANT_DETAIL = {
  tenant: {
    id: MOCK_TENANT_ID,
    slug: 'acme',
    name: 'Acme Co',
    type: 'B2B',
    status: 'ACTIVE',
    plan: 'STARTER',
    onboarding_status: 'ACTIVE',
    memberships: [
      {
        id: 'membership-1',
        user: { id: 'user-owner-1', email: 'owner@acme.com', emailVerified: true },
        role: 'OWNER',
        status: 'ACTIVE',
      },
    ],
  },
};

const MOCK_TENANT_DETAIL_EMPTY_MEMBERS = {
  tenant: {
    ...MOCK_TENANT_DETAIL.tenant,
    memberships: [],
  },
};

const MOCK_CURRENT_USER_RESPONSE = {
  user: {
    id: 'user-owner-1',
    email: 'owner@acme.com',
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  tenant: {
    id: MOCK_TENANT_ID,
    slug: 'acme',
    name: 'Acme Co',
    type: 'B2B',
    tenant_category: 'B2B',
    status: 'ACTIVE' as const,
    plan: 'STARTER',
    commercial_plan: 'STARTER',
  },
  role: 'OWNER',
};

const MOCK_CURRENT_USER_WRONG_TENANT = {
  ...MOCK_CURRENT_USER_RESPONSE,
  tenant: {
    ...MOCK_CURRENT_USER_RESPONSE.tenant,
    id: 'tenant-other-999',
  },
};

const MOCK_IMPERSONATION_START_RESULT = {
  impersonationId: MOCK_IMPERSONATION_ID,
  token: MOCK_IMPERSONATION_TOKEN,
  expiresAt: new Date(Date.now() + 1_800_000).toISOString(),
};

// ── Global teardown ────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  setImpersonationToken(null);
});

// ── T-IMP-012 ─────────────────────────────────────────────────────────────────

describe('HARDENING-007 — T-IMP-012 — reason validation blocks short reason', () => {
  beforeEach(() => {
    seedControlPlaneAuthState();
    vi.mocked(getTenants).mockResolvedValue({ tenants: [MOCK_TENANT_LIST_ITEM] });
  });

  it('T-IMP-012: reason shorter than 10 chars — Start Impersonation button disabled and startImpersonationSession not called', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(screen.getByTitle('Impersonate')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle('Impersonate'));
    });

    expect(screen.getByText('Impersonate Tenant')).toBeInTheDocument();

    const reasonInput = screen.getByLabelText(/reason/i);
    fireEvent.change(reasonInput, { target: { value: 'short' } });

    const submitBtn = screen.getByRole('button', { name: 'Start Impersonation' });
    expect(submitBtn).toBeDisabled();

    expect(startImpersonationSession).not.toHaveBeenCalled();
  });
});

// ── T-IMP-013 ─────────────────────────────────────────────────────────────────

describe('HARDENING-007 — T-IMP-013 — empty member list blocks API call', () => {
  beforeEach(() => {
    seedControlPlaneAuthState();
    vi.mocked(getTenants).mockResolvedValue({ tenants: [MOCK_TENANT_LIST_ITEM] });
    vi.mocked(getTenantById).mockResolvedValue(MOCK_TENANT_DETAIL_EMPTY_MEMBERS);
  });

  it('T-IMP-013: no eligible member — error shown, startImpersonationSession not called', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(screen.getByTitle('Impersonate')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle('Impersonate'));
    });

    const reasonInput = screen.getByLabelText(/reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Valid reason here for support investigation' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Impersonation' }));
    });

    await waitFor(() =>
      expect(screen.getByText('No eligible member found for this tenant.')).toBeInTheDocument()
    );

    expect(startImpersonationSession).not.toHaveBeenCalled();
  });
});

// ── T-IMP-014 ─────────────────────────────────────────────────────────────────

describe('HARDENING-007 — T-IMP-014 — getCurrentUser throws after session start triggers rollback', () => {
  beforeEach(() => {
    seedControlPlaneAuthState();
    vi.mocked(getTenants).mockResolvedValue({ tenants: [MOCK_TENANT_LIST_ITEM] });
    vi.mocked(getTenantById).mockResolvedValue(MOCK_TENANT_DETAIL);
    vi.mocked(startImpersonationSession).mockResolvedValue(MOCK_IMPERSONATION_START_RESULT);
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('network error'));
    vi.mocked(stopImpersonationSession).mockResolvedValue({ ended: true });
  });

  it('T-IMP-014: getCurrentUser throws → rollback: stopImpersonationSession called with started id', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(screen.getByTitle('Impersonate')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle('Impersonate'));
    });

    const reasonInput = screen.getByLabelText(/reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Investigating support ticket for rollback test' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Impersonation' }));
    });

    await waitFor(() =>
      expect(stopImpersonationSession).toHaveBeenCalledWith(
        expect.objectContaining({ impersonationId: MOCK_IMPERSONATION_ID })
      )
    );

    expect(startImpersonationSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText('network error')).toBeInTheDocument();
  });
});

// ── T-IMP-015 ─────────────────────────────────────────────────────────────────

describe('HARDENING-007 — T-IMP-015 — mismatched tenant after session start triggers rollback', () => {
  beforeEach(() => {
    seedControlPlaneAuthState();
    vi.mocked(getTenants).mockResolvedValue({ tenants: [MOCK_TENANT_LIST_ITEM] });
    vi.mocked(getTenantById).mockResolvedValue(MOCK_TENANT_DETAIL);
    vi.mocked(startImpersonationSession).mockResolvedValue(MOCK_IMPERSONATION_START_RESULT);
    vi.mocked(getCurrentUser).mockResolvedValue(MOCK_CURRENT_USER_WRONG_TENANT);
    vi.mocked(stopImpersonationSession).mockResolvedValue({ ended: true });
  });

  it('T-IMP-015: tenant id mismatch → rollback: stopImpersonationSession called, error shown', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(screen.getByTitle('Impersonate')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTitle('Impersonate'));
    });

    const reasonInput = screen.getByLabelText(/reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Investigating tenant mismatch rollback scenario' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Impersonation' }));
    });

    await waitFor(() =>
      expect(stopImpersonationSession).toHaveBeenCalledWith(
        expect.objectContaining({ impersonationId: MOCK_IMPERSONATION_ID })
      )
    );

    expect(startImpersonationSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Tenant context bootstrap returned the wrong tenant.')).toBeInTheDocument();
  });
});

// ── T-IMP-016 ─────────────────────────────────────────────────────────────────

describe('HARDENING-007 — T-IMP-016 — exit impersonation stops session and clears active state', () => {
  beforeEach(() => {
    seedImpersonationRestoreState();
    vi.mocked(getCurrentUser).mockResolvedValue(MOCK_CURRENT_USER_RESPONSE);
    vi.mocked(stopImpersonationSession).mockResolvedValue({ ended: true });
    vi.mocked(getTenants).mockResolvedValue({ tenants: [MOCK_TENANT_LIST_ITEM] });
  });

  it('T-IMP-016: exit impersonation — stopImpersonationSession called, banner cleared, session removed', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Exit Impersonation' })).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Exit Impersonation' }));
    });

    await waitFor(() =>
      expect(stopImpersonationSession).toHaveBeenCalledWith(
        expect.objectContaining({ impersonationId: MOCK_IMPERSONATION_ID })
      )
    );

    expect(localStorage.getItem('texqtic_impersonation_session')).toBeNull();

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Exit Impersonation' })).not.toBeInTheDocument()
    );
  });
});
