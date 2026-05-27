/**
 * CONTROL-PLANE-IMPERSONATION-ENTRY-VERIFICATION-HARDENING-006
 *
 * Tier 1 — TenantDetails component + Pure Function tests (T-IMP-001 through T-IMP-011).
 *
 * Tests proving:
 * - "Enter Tenant Context" button renders enabled only for ACTIVE tenants (T-IMP-001 / T-IMP-002)
 * - Click on ACTIVE tenant calls onImpersonate with the lifecycleTenant payload (T-IMP-003)
 * - Click on non-ACTIVE (disabled) tenant does NOT call onImpersonate (T-IMP-004)
 * - resolveCanonicalImpersonationTenant: matching tenant + targetTenantId → non-null snapshot (T-IMP-005)
 * - resolveCanonicalImpersonationTenant: mismatched targetTenantId → null (T-IMP-006)
 * - resolveCanonicalImpersonationTenant: incomplete tenant record → null (T-IMP-007)
 * - readStoredImpersonationSession: valid unexpired session → parsed state (T-IMP-008)
 * - readStoredImpersonationSession: expired expiresAt → null (T-IMP-009)
 * - readStoredImpersonationSession: adminId not a string → null (T-IMP-010)
 * - readStoredImpersonationSession: state.targetTenantId not a string → null (T-IMP-011)
 *
 * Tier 2 (T-IMP-012 through T-IMP-016) — DEFERRED to HARDENING-007.
 * App-level integration tests require rendering the full App component with mocked Supabase auth.
 * No existing test in the repo establishes this pattern; adding it without product code changes
 * for testability is out of scope for this unit.
 *
 * No product code, backend, API, schema, or DB changes.
 */

/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantStatus, type TenantConfig } from '../types';

vi.mock('../services/controlPlaneService', () => ({
  getTenants: vi.fn(),
  getTenantById: vi.fn(),
  provisionTenant: vi.fn(),
  activateApprovedOnboarding: vi.fn(),
  archiveTenant: vi.fn(),
  recordOnboardingOutcome: vi.fn(),
  startImpersonationSession: vi.fn(),
  stopImpersonationSession: vi.fn(),
}));

import { TenantDetails } from '../components/ControlPlane/TenantDetails';
import { getTenantById } from '../services/controlPlaneService';
import { __PHASE1_FOUNDATION_CORRECTION_TESTING__ } from '../App';

const getTenantByIdMock = vi.mocked(getTenantById);

const { readStoredImpersonationSession, resolveCanonicalImpersonationTenant } =
  __PHASE1_FOUNDATION_CORRECTION_TESTING__;

const IMPERSONATION_SESSION_KEY = 'texqtic_impersonation_session';

// ── Global teardown ────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeTenantConfig(overrides: Partial<TenantConfig> = {}): TenantConfig {
  return {
    id: 'tenant-imp-001',
    slug: 'impersonation-tenant',
    name: 'Impersonation Tenant',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: 'B2B' as any,
    status: TenantStatus.ACTIVE,
    onboarding_status: 'ACTIVE',
    plan: 'PROFESSIONAL' as TenantConfig['plan'],
    theme: { primaryColor: '#4F46E5', secondaryColor: '#10B981', logo: '🏢' },
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

function makeCanonicalTenant(
  overrides: Partial<{
    id: string | null;
    slug: string | null;
    name: string | null;
    type: string | null;
    tenant_category: string | null;
    is_white_label: boolean | null;
    base_family: string | null;
    aggregator_capability: boolean | null;
    white_label_capability: boolean | null;
    commercial_plan: string | null;
    status: string | null;
    plan: string | null;
  }> = {},
) {
  return {
    id: 'tenant-imp-001',
    slug: 'impersonation-tenant',
    name: 'Impersonation Tenant',
    type: 'B2B',
    tenant_category: 'B2B',
    is_white_label: false,
    base_family: 'B2B',
    aggregator_capability: false,
    white_label_capability: false,
    commercial_plan: 'PROFESSIONAL',
    status: 'ACTIVE',
    plan: 'PROFESSIONAL',
    ...overrides,
  };
}

function stubMembershipsEmpty() {
  getTenantByIdMock.mockResolvedValue({
    tenant: {
      id: 'tenant-imp-001',
      slug: 'impersonation-tenant',
      name: 'Impersonation Tenant',
      type: 'B2B',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
      onboarding_status: 'ACTIVE',
      memberships: [],
    },
  });
}

function futureExpiry() {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

// ── T-IMP-001 through T-IMP-004 — TenantDetails impersonation button guard ───

describe('HARDENING-006 — T-IMP-001 through T-IMP-004 — TenantDetails impersonation button guard', () => {
  beforeEach(() => {
    getTenantByIdMock.mockReset();
    stubMembershipsEmpty();
  });

  it('T-IMP-001: ACTIVE tenant renders enabled Enter Tenant Context button with ACTIVE caption', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ status: TenantStatus.ACTIVE })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    const button = screen.getByRole('button', { name: 'Enter Tenant Context' });
    expect(button).toBeEnabled();
    expect(screen.getByText('ACTIVE tenants only')).toBeInTheDocument();
  });

  it('T-IMP-002: non-ACTIVE (SUSPENDED) tenant renders disabled button with unavailable caption', () => {
    render(
      <TenantDetails
        tenant={makeTenantConfig({ status: TenantStatus.SUSPENDED })}
        onBack={() => undefined}
        onImpersonate={() => undefined}
      />,
    );

    const button = screen.getByRole('button', { name: 'Enter Tenant Context' });
    expect(button).toBeDisabled();
    expect(screen.getByText('Unavailable outside ACTIVE')).toBeInTheDocument();
  });

  it('T-IMP-003: ACTIVE tenant click calls onImpersonate with tenant id and ACTIVE status', () => {
    const onImpersonate = vi.fn();
    const config = makeTenantConfig({ status: TenantStatus.ACTIVE });

    render(
      <TenantDetails
        tenant={config}
        onBack={() => undefined}
        onImpersonate={onImpersonate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enter Tenant Context' }));

    expect(onImpersonate).toHaveBeenCalledTimes(1);
    expect(onImpersonate).toHaveBeenCalledWith(
      expect.objectContaining({ id: config.id, status: TenantStatus.ACTIVE }),
    );
  });

  it('T-IMP-004: non-ACTIVE (SUSPENDED) tenant click does not call onImpersonate', () => {
    const onImpersonate = vi.fn();

    render(
      <TenantDetails
        tenant={makeTenantConfig({ status: TenantStatus.SUSPENDED })}
        onBack={() => undefined}
        onImpersonate={onImpersonate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enter Tenant Context' }));

    expect(onImpersonate).not.toHaveBeenCalled();
  });
});

// ── T-IMP-005 through T-IMP-007 — resolveCanonicalImpersonationTenant ─────────

describe('HARDENING-006 — T-IMP-005 through T-IMP-007 — resolveCanonicalImpersonationTenant', () => {
  it('T-IMP-005: matching tenant record and targetTenantId returns non-null snapshot with correct id', () => {
    const tenant = makeCanonicalTenant({ id: 'tenant-imp-001' });
    const result = resolveCanonicalImpersonationTenant(tenant, 'tenant-imp-001');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('tenant-imp-001');
  });

  it('T-IMP-006: valid tenant record with mismatched targetTenantId returns null', () => {
    const tenant = makeCanonicalTenant({ id: 'tenant-imp-001' });
    const result = resolveCanonicalImpersonationTenant(tenant, 'tenant-other-999');

    expect(result).toBeNull();
  });

  it('T-IMP-007: incomplete tenant record (commercial_plan and plan both null) returns null', () => {
    const tenant = makeCanonicalTenant({ id: 'tenant-imp-001', commercial_plan: null, plan: null });
    const result = resolveCanonicalImpersonationTenant(tenant, 'tenant-imp-001');

    expect(result).toBeNull();
  });
});

// ── T-IMP-008 through T-IMP-011 — readStoredImpersonationSession ──────────────

describe('HARDENING-006 — T-IMP-008 through T-IMP-011 — readStoredImpersonationSession', () => {
  it('T-IMP-008: valid unexpired session in localStorage returns parsed state with all key fields', () => {
    localStorage.setItem(
      IMPERSONATION_SESSION_KEY,
      JSON.stringify({
        adminId: 'admin-001',
        state: {
          isAdmin: true,
          targetTenantId: 'tenant-imp-001',
          startTime: '2026-05-27T00:00:00.000Z',
          impersonationId: 'imp-session-001',
          token: 'fake-impersonation-jwt',
          expiresAt: futureExpiry(),
        },
      }),
    );

    const result = readStoredImpersonationSession();

    expect(result).not.toBeNull();
    expect(result?.adminId).toBe('admin-001');
    expect(result?.state.isAdmin).toBe(true);
    expect(result?.state.targetTenantId).toBe('tenant-imp-001');
    expect(result?.state.impersonationId).toBe('imp-session-001');
  });

  it('T-IMP-009: session with expiresAt in the past returns null', () => {
    localStorage.setItem(
      IMPERSONATION_SESSION_KEY,
      JSON.stringify({
        adminId: 'admin-001',
        state: {
          isAdmin: true,
          targetTenantId: 'tenant-imp-001',
          startTime: '2026-05-27T00:00:00.000Z',
          impersonationId: 'imp-session-001',
          token: 'fake-impersonation-jwt',
          expiresAt: new Date(Date.now() - 5000).toISOString(),
        },
      }),
    );

    expect(readStoredImpersonationSession()).toBeNull();
  });

  it('T-IMP-010: adminId is not a string returns null', () => {
    localStorage.setItem(
      IMPERSONATION_SESSION_KEY,
      JSON.stringify({
        adminId: 12345,
        state: {
          isAdmin: true,
          targetTenantId: 'tenant-imp-001',
          startTime: '2026-05-27T00:00:00.000Z',
          impersonationId: 'imp-session-001',
          token: 'fake-impersonation-jwt',
          expiresAt: futureExpiry(),
        },
      }),
    );

    expect(readStoredImpersonationSession()).toBeNull();
  });

  it('T-IMP-011: state.targetTenantId is not a string (null) returns null', () => {
    localStorage.setItem(
      IMPERSONATION_SESSION_KEY,
      JSON.stringify({
        adminId: 'admin-001',
        state: {
          isAdmin: true,
          targetTenantId: null,
          startTime: '2026-05-27T00:00:00.000Z',
          impersonationId: 'imp-session-001',
          token: 'fake-impersonation-jwt',
          expiresAt: futureExpiry(),
        },
      }),
    );

    expect(readStoredImpersonationSession()).toBeNull();
  });
});
