import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { ErrorState } from '../components/shared/ErrorState';
import {
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