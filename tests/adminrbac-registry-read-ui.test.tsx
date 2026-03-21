import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/adminApiClient', () => ({
  adminDelete: vi.fn(),
  adminGet: vi.fn(),
  adminGetWithHeaders: vi.fn(),
  adminPost: vi.fn(),
  adminPostWithHeaders: vi.fn(),
  adminPut: vi.fn(),
}));

import { AdminRbacRegistrySurface } from '../components/ControlPlane/AdminRBAC';
import {
  getAdminAccessRegistry,
  revokeControlPlaneAdminAccess,
  type ControlPlaneAdminRegistryEntry,
} from '../services/controlPlaneService';
import { adminDelete, adminGet } from '../services/adminApiClient';
import type { APIError } from '../services/apiClient';

const adminDeleteMock = vi.mocked(adminDelete);
const adminGetMock = vi.mocked(adminGet);

function makeRegistryEntry(
  overrides: Partial<ControlPlaneAdminRegistryEntry> = {},
): ControlPlaneAdminRegistryEntry {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'superadmin@texqtic.example',
    role: 'SUPER_ADMIN',
    accessClass: 'SUPER_ADMIN',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-02T10:00:00.000Z',
    ...overrides,
  };
}

function renderHtml(
  admins: ControlPlaneAdminRegistryEntry[],
  options?: { loading?: boolean; error?: APIError | null },
) {
  return renderToStaticMarkup(
    <AdminRbacRegistrySurface
      admins={admins}
      loading={options?.loading ?? false}
      error={options?.error ?? null}
      onRetry={() => undefined}
    />,
  );
}

describe('TECS-FBW-ADMINRBAC-REGISTRY-READ-001 — admin registry fetch', () => {
  beforeEach(() => {
    adminDeleteMock.mockReset();
    adminGetMock.mockReset();
  });

  it('calls the bounded control-plane admin registry endpoint and returns the contract payload', async () => {
    const admin = makeRegistryEntry();
    adminGetMock.mockResolvedValue({ admins: [admin], count: 1 });

    const result = await getAdminAccessRegistry();

    expect(adminGetMock).toHaveBeenCalledWith('/api/control/admin-access-registry');
    expect(result.admins).toEqual([admin]);
    expect(result.count).toBe(1);
  });

  it('calls the bounded revoke/remove endpoint for an existing control-plane admin target', async () => {
    adminDeleteMock.mockResolvedValue({
      revokedAdminId: '22222222-2222-2222-2222-222222222222',
      refreshTokensInvalidated: 2,
    });

    const result = await revokeControlPlaneAdminAccess('22222222-2222-2222-2222-222222222222');

    expect(adminDeleteMock).toHaveBeenCalledWith(
      '/api/control/admin-access-registry/22222222-2222-2222-2222-222222222222'
    );
    expect(result.revokedAdminId).toBe('22222222-2222-2222-2222-222222222222');
    expect(result.refreshTokensInvalidated).toBe(2);
  });
});

describe('TECS-FBW-ADMINRBAC-REGISTRY-READ-001 — admin registry surface', () => {
  it('renders current control-plane identities with SuperAdmin versus PlatformAdmin distinction', () => {
    const html = renderHtml([
      makeRegistryEntry(),
      makeRegistryEntry({
        id: '22222222-2222-2222-2222-222222222222',
        email: 'support@texqtic.example',
        role: 'SUPPORT',
        accessClass: 'PLATFORM_ADMIN',
      }),
    ]);

    expect(html).toContain('Admin Access Registry');
    expect(html).toContain('superadmin@texqtic.example');
    expect(html).toContain('support@texqtic.example');
    expect(html).toContain('SuperAdmin');
    expect(html).toContain('PlatformAdmin');
    expect(html).toContain('SUPER_ADMIN');
    expect(html).toContain('SUPPORT');
  });

  it('renders a stable empty state when no admin identities are returned', () => {
    const html = renderHtml([]);

    expect(html).toContain('No control-plane admin identities found');
    expect(html).toContain('No internal control-plane admins are currently visible in the bounded registry surface. No access posture has changed.');
  });

  it('renders a safe error state when the bounded registry fetch fails', () => {
    const html = renderHtml([], {
      error: {
        status: 403,
        message: 'Forbidden',
        code: 'FORBIDDEN',
      },
    });

    expect(html).toContain('Error 403');
    expect(html).toContain('You don&#x27;t have access to this action.');
  });

  it('renders bounded revoke control only for non-SuperAdmin entries', () => {
    const html = renderHtml([
      makeRegistryEntry(),
      makeRegistryEntry({
        id: '22222222-2222-2222-2222-222222222222',
        email: 'support@texqtic.example',
        role: 'SUPPORT',
        accessClass: 'PLATFORM_ADMIN',
      }),
    ]);

    expect(html).toContain('Revoke Access');
    expect(html).toContain('Protected');
    expect(html).not.toContain('Invite');
    expect(html).not.toContain('Change Role');
    expect(html).not.toContain('TenantAdmin');
    expect(html).not.toContain('Impersonation');
  });
});