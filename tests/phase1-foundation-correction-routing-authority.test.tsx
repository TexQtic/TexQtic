import { beforeEach, describe, expect, it } from 'vitest';

import { __PHASE1_FOUNDATION_CORRECTION_TESTING__ } from '../App';

const {
  readStoredTenantIdentityHints,
  resolveRepoTruthTenantHint,
  normalizeTenantIdentity,
  readStoredTenantJwtClaims,
  resolveBootstrapTenantType,
  buildBootstrapTenantStub,
  buildTenantSnapshot,
  readStoredImpersonationSession,
  resolveCanonicalImpersonationTenant,
  resolveTenantBootstrapAuthView,
  resolveExperienceShell,
} = __PHASE1_FOUNDATION_CORRECTION_TESTING__;

function installStorageMock() {
  const store = new Map<string, string>();
  const sessionStore = new Map<string, string>();

  const localStorageMock = {
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
  };

  const sessionStorageMock = {
    getItem: (key: string) => sessionStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      sessionStore.set(key, value);
    },
    removeItem: (key: string) => {
      sessionStore.delete(key);
    },
    clear: () => {
      sessionStore.clear();
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageMock,
  });

  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: sessionStorageMock,
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
    },
  });

  return store;
}

function makeJwt(payload: Record<string, unknown>) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `header.${encodedPayload}.signature`;
}

function makeCanonicalTenant(
  overrides: Partial<{
    id: string | null;
    slug: string | null;
    name: string | null;
    type: string | null;
    tenant_category: string | null;
    is_white_label: boolean | null;
    status: string | null;
    plan: string | null;
  }> = {},
) {
  return {
    id: 'tenant-1',
    slug: 'tenant-one',
    name: 'Tenant One',
    type: 'B2B',
    tenant_category: 'B2B',
    is_white_label: false,
    status: 'ACTIVE',
    plan: 'PROFESSIONAL',
    ...overrides,
  };
}

describe('phase 1 foundation correction - routing authority leaks', () => {
  beforeEach(() => {
    installStorageMock();
  });

  it('removes slug-only and name-only white-label routing authority', () => {
    expect(resolveRepoTruthTenantHint({ slug: 'white-label-co' })).toBeNull();
    expect(resolveRepoTruthTenantHint({ name: 'White Label Co' })).toBeNull();

    const canonicalTenant = normalizeTenantIdentity(makeCanonicalTenant({
      slug: 'white-label-co',
      name: 'White Label Co',
      is_white_label: false,
    }), null, { persist: false });

    expect(canonicalTenant?.is_white_label).toBe(false);
    expect(resolveExperienceShell(canonicalTenant?.tenant_category, canonicalTenant?.is_white_label)).not.toBeNull();
  });

  it('ignores persisted tenant hints as routing authority', () => {
    localStorage.setItem(
      'texqtic_tenant_identity_hints',
      JSON.stringify({
        'tenant-1': {
          id: 'tenant-1',
          slug: 'stale-hint',
          name: 'Stale Hint Tenant',
          type: 'B2C',
          tenant_category: 'B2C',
          is_white_label: true,
          status: 'ACTIVE',
          plan: 'ENTERPRISE',
        },
      }),
    );

    expect(readStoredTenantIdentityHints()).toEqual({});

    const canonicalTenant = normalizeTenantIdentity(makeCanonicalTenant({
      type: 'AGGREGATOR',
      tenant_category: 'AGGREGATOR',
      is_white_label: false,
    }), null, { persist: false });

    expect(canonicalTenant?.tenant_category).toBe('AGGREGATOR');
    expect(canonicalTenant?.is_white_label).toBe(false);

    const hintOnlyTenant = normalizeTenantIdentity(makeCanonicalTenant({
      type: 'B2C',
      tenant_category: null,
      is_white_label: null,
    }), null, { persist: false });

    expect(hintOnlyTenant).toBeNull();
  });

  it('removes JWT-only and bootstrap-stub family inference from restore authority', () => {
    localStorage.setItem(
      'texqtic_tenant_token',
      makeJwt({ userId: 'user-1', tenantId: 'tenant-1', role: 'OWNER' }),
    );

    const claims = readStoredTenantJwtClaims();

    expect(claims?.tenantId).toBe('tenant-1');
    expect(resolveBootstrapTenantType('B2B', 'B2B', true)).toBeNull();
    expect(buildBootstrapTenantStub({ tenantId: claims?.tenantId ?? null })).toBeNull();
  });

  it('builds tenant shell state only from complete canonical tenant truth', () => {
    const completeSnapshot = buildTenantSnapshot(makeCanonicalTenant());
    expect(completeSnapshot?.tenant_category).toBe('B2B');
    expect(resolveExperienceShell(completeSnapshot?.tenant_category, completeSnapshot?.is_white_label)).not.toBeNull();

    const incompleteSnapshot = buildTenantSnapshot(makeCanonicalTenant({
      type: 'B2C',
      tenant_category: null,
      is_white_label: false,
    }));

    expect(incompleteSnapshot).toBeNull();
    expect(resolveExperienceShell(null, false)).toBeNull();
  });

  it('keeps restore and refresh anchored to canonical tenant truth when stale hints exist', () => {
    localStorage.setItem(
      'texqtic_tenant_identity_hints',
      JSON.stringify({
        'tenant-1': {
          id: 'tenant-1',
          slug: 'stale-hint',
          name: 'Stale Hint Tenant',
          type: 'B2C',
          tenant_category: 'B2C',
          is_white_label: true,
          status: 'ACTIVE',
          plan: 'ENTERPRISE',
        },
      }),
    );
    localStorage.setItem(
      'texqtic_tenant_token',
      makeJwt({ userId: 'user-1', tenantId: 'tenant-1', role: 'OWNER' }),
    );

    const refreshCandidate = buildBootstrapTenantStub({
      tenantId: readStoredTenantJwtClaims()?.tenantId ?? null,
    });
    const canonicalSnapshot = buildTenantSnapshot(makeCanonicalTenant({
      tenant_category: 'B2B',
      is_white_label: false,
    }));

    expect(refreshCandidate).toBeNull();
    expect(canonicalSnapshot?.tenant_category).toBe('B2B');
    expect(canonicalSnapshot?.is_white_label).toBe(false);
  });

  it('ignores stored impersonation tenant snapshots until fresh canonical identity is confirmed', () => {
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
          expiresAt: '2099-04-01T00:00:00.000Z',
        },
      }),
    );

    const session = readStoredImpersonationSession();

    expect(session).toEqual({
      adminId: 'admin-1',
      state: expect.objectContaining({
        impersonationId: 'imp-1',
        targetTenantId: 'tenant-1',
      }),
    });
    expect(Object.hasOwn(session ?? {}, 'tenant')).toBe(false);
    expect(resolveCanonicalImpersonationTenant(null, session?.state.targetTenantId)).toBeNull();
  });

  it('requires fresh canonical tenant confirmation for impersonation entry and restore', () => {
    const canonicalTenant = makeCanonicalTenant({
      id: 'tenant-1',
      type: 'B2C',
      tenant_category: 'B2C',
      is_white_label: true,
    });

    expect(resolveCanonicalImpersonationTenant(canonicalTenant, 'tenant-1')?.id).toBe('tenant-1');
    expect(resolveCanonicalImpersonationTenant(canonicalTenant, 'tenant-2')).toBeNull();
  });

  it('surfaces resolving and blocked auth-gate states instead of guessed early shell entry', () => {
    expect(resolveTenantBootstrapAuthView({
      authRealm: 'TENANT',
      tenantRestorePending: true,
      tenantBootstrapBlockedMessage: null,
      tenantProvisionError: null,
    })).toBe('TENANT_RESOLVING');

    expect(resolveTenantBootstrapAuthView({
      authRealm: 'TENANT',
      tenantRestorePending: false,
      tenantBootstrapBlockedMessage: 'Tenant workspace identity could not be confirmed. Please sign in again.',
      tenantProvisionError: null,
    })).toBe('TENANT_BLOCKED');

    expect(resolveTenantBootstrapAuthView({
      authRealm: 'TENANT',
      tenantRestorePending: false,
      tenantBootstrapBlockedMessage: null,
      tenantProvisionError: 'Tenant not provisioned yet. Your workspace is being set up — please try again in a few minutes.',
    })).toBe('TENANT_BLOCKED');
  });
});