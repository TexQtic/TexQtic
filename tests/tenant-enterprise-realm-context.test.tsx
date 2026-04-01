import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { ErrorState } from '../components/shared/ErrorState';
import {
  getAuthRealm,
  getToken,
  setImpersonationToken,
  setStoredAuthRealm,
  setToken,
} from '../services/apiClient';

function installStorageMock() {
  const store = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  });
}

function persistImpersonationSession(expiresAt: string) {
  localStorage.setItem(
    'texqtic_impersonation_session',
    JSON.stringify({
      adminId: 'admin-1',
      tenant: {
        id: 'tenant-1',
        slug: 'white-label-co',
        name: 'White Label Co',
        type: 'B2C',
        tenant_category: 'B2C',
        is_white_label: true,
        status: 'ACTIVE',
        plan: 'ENTERPRISE',
      },
      state: {
        isAdmin: true,
        targetTenantId: 'tenant-1',
        startTime: '2026-04-01T00:00:00.000Z',
        impersonationId: 'imp-1',
        token: 'tenant-impersonation-jwt',
        expiresAt,
      },
    })
  );
}

describe('tenant-enterprise realm context hotfix', () => {
  beforeEach(() => {
    installStorageMock();
    setImpersonationToken(null);
  });

  it('uses the impersonation token only while the stored realm is TENANT and restores the admin token for control-plane calls', () => {
    setToken('admin-jwt', 'CONTROL_PLANE');
    setImpersonationToken('tenant-impersonation-jwt');

    setStoredAuthRealm('TENANT');
    expect(getToken()).toBe('tenant-impersonation-jwt');

    setStoredAuthRealm('CONTROL_PLANE');
    expect(getToken()).toBe('admin-jwt');
  });

  it('recovers a tenant-only session when the tenant token exists but the stored realm key is missing', () => {
    setToken('tenant-jwt', 'TENANT');

    localStorage.removeItem('texqtic_auth_realm');

    expect(getAuthRealm()).toBe('TENANT');
    expect(getToken()).toBe('tenant-jwt');
  });

  it('preserves tenant realm during active impersonation when the stored realm key is missing', () => {
    setToken('admin-jwt', 'CONTROL_PLANE');
    persistImpersonationSession('2099-04-01T00:00:00.000Z');

    localStorage.removeItem('texqtic_auth_realm');

    expect(getAuthRealm()).toBe('TENANT');
  });

  it('does not infer tenant realm from an expired impersonation session', () => {
    setToken('admin-jwt', 'CONTROL_PLANE');
    persistImpersonationSession('2000-04-01T00:00:00.000Z');

    localStorage.removeItem('texqtic_auth_realm');

    expect(getAuthRealm()).toBe('CONTROL_PLANE');
  });

  it('surfaces explicit realm mismatch messages instead of collapsing them into a generic network error', () => {
    const html = renderToStaticMarkup(
      <ErrorState
        error={{
          message: 'REALM_MISMATCH: Tenant endpoint requires TENANT realm, got CONTROL_PLANE',
        }}
      />,
    );

    expect(html).toContain('REALM_MISMATCH: Tenant endpoint requires TENANT realm, got CONTROL_PLANE');
    expect(html).not.toContain('Network error. Please check your connection.');
  });
});