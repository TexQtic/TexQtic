import { beforeEach, describe, expect, it } from 'vitest';

import { __PHASE1_FOUNDATION_CORRECTION_TESTING__ } from '../App';
import { TenantType } from '../types';
import {
  createTenantSessionRuntimeDescriptor,
  resolveRuntimeAppStateFromDescriptor,
  resolveRuntimeManifestKeyFromDescriptor,
  resolveRuntimeShellFamilyFromDescriptor,
} from '../runtime/sessionRuntimeDescriptor';

const {
  readStoredTenantJwtClaims,
  buildTenantSnapshot,
  readStoredImpersonationSession,
  resolveCanonicalImpersonationTenant,
  resolveRuntimeTenantSeedFromRecord,
  resolveTenantBootstrapAuthView,
} = __PHASE1_FOUNDATION_CORRECTION_TESTING__;

const buildTenantDescriptor = (
  tenant: ReturnType<typeof buildTenantSnapshot>,
  authenticatedRole = 'OWNER',
) => {
  return createTenantSessionRuntimeDescriptor({
    tenantId: tenant?.id ?? null,
    tenantSlug: tenant?.slug ?? null,
    tenantName: tenant?.name ?? null,
    baseFamily: tenant?.base_family ?? null,
    aggregatorCapability: tenant?.aggregator_capability ?? null,
    tenantCategory: tenant?.tenant_category ?? null,
    whiteLabelCapability: tenant?.white_label_capability ?? tenant?.is_white_label ?? null,
    commercialPlan: tenant?.commercial_plan ?? tenant?.plan ?? null,
    authenticatedRole,
  });
};

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
    base_family: string | null;
    aggregator_capability: boolean | null;
    white_label_capability: boolean | null;
    commercial_plan: string | null;
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
    base_family: 'B2B',
    aggregator_capability: false,
    white_label_capability: false,
    commercial_plan: 'PROFESSIONAL',
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
    const canonicalTenant = buildTenantSnapshot(makeCanonicalTenant({
      slug: 'white-label-co',
      name: 'White Label Co',
      is_white_label: false,
    }));
    const descriptor = buildTenantDescriptor(canonicalTenant);

    expect(canonicalTenant?.is_white_label).toBe(false);
    expect(resolveRuntimeManifestKeyFromDescriptor(descriptor, 'EXPERIENCE')).toBe('b2b_workspace');
    expect(resolveRuntimeShellFamilyFromDescriptor(descriptor, 'EXPERIENCE')).toBe('B2BShell');
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

    const canonicalTenant = buildTenantSnapshot(makeCanonicalTenant({
      type: 'B2C',
      tenant_category: 'B2C',
      is_white_label: false,
      base_family: 'B2B',
      aggregator_capability: true,
      white_label_capability: false,
    }));
    const descriptor = buildTenantDescriptor(canonicalTenant);

    expect(canonicalTenant?.tenant_category).toBe('AGGREGATOR');
    expect(canonicalTenant?.type).toBe(TenantType.AGGREGATOR);
    expect(canonicalTenant?.is_white_label).toBe(false);
    expect(resolveRuntimeManifestKeyFromDescriptor(descriptor, 'EXPERIENCE')).toBe('aggregator_workspace');

    const hintOnlyTenant = buildTenantSnapshot(makeCanonicalTenant({
      type: null,
      tenant_category: null,
      base_family: null,
      aggregator_capability: null,
      is_white_label: null,
      white_label_capability: null,
    }));

    expect(hintOnlyTenant).toBeNull();
  });

  it('removes JWT-only and bootstrap-stub family inference from restore authority', () => {
    localStorage.setItem(
      'texqtic_tenant_token',
      makeJwt({ userId: 'user-1', tenantId: 'tenant-1', role: 'OWNER' }),
    );

    const claims = readStoredTenantJwtClaims();
    const descriptor = createTenantSessionRuntimeDescriptor({
      tenantId: claims?.tenantId ?? null,
      tenantSlug: null,
      tenantName: null,
      tenantCategory: null,
      whiteLabelCapability: null,
      commercialPlan: null,
      authenticatedRole: claims?.role ?? null,
    });

    expect(claims?.tenantId).toBe('tenant-1');
    expect(descriptor).toBeNull();
    expect(resolveRuntimeAppStateFromDescriptor(descriptor)).toBeNull();
  });

  it('builds tenant shell state only from complete canonical tenant truth', () => {
    const completeSnapshot = buildTenantSnapshot(makeCanonicalTenant());
    const completeDescriptor = buildTenantDescriptor(completeSnapshot);

    expect(completeSnapshot?.tenant_category).toBe('B2B');
    expect(resolveRuntimeShellFamilyFromDescriptor(completeDescriptor, 'EXPERIENCE')).toBe('B2BShell');

    const incompleteSnapshot = buildTenantSnapshot(makeCanonicalTenant({
      type: null,
      tenant_category: null,
      base_family: null,
      aggregator_capability: null,
      is_white_label: false,
      white_label_capability: false,
    }));

    expect(incompleteSnapshot).toBeNull();
  });

  it('normalizes list-sourced tenant identity before runtime family resolution', () => {
    const aggregatorSeed = resolveRuntimeTenantSeedFromRecord({
      type: 'AGGREGATOR',
      tenant_category: null,
      is_white_label: null,
      isWhiteLabel: null,
      base_family: 'B2B',
      aggregator_capability: true,
      white_label_capability: false,
      commercial_plan: 'PROFESSIONAL',
    });
    const whiteLabelSeed = resolveRuntimeTenantSeedFromRecord({
      type: 'B2C',
      tenant_category: null,
      is_white_label: null,
      isWhiteLabel: true,
      base_family: 'B2C',
      aggregator_capability: false,
      white_label_capability: true,
      commercial_plan: 'ENTERPRISE',
    });
    const b2bSeed = resolveRuntimeTenantSeedFromRecord({
      type: 'B2B',
      tenant_category: 'B2B',
      is_white_label: false,
      isWhiteLabel: null,
      base_family: 'B2B',
      aggregator_capability: false,
      white_label_capability: false,
      commercial_plan: 'PROFESSIONAL',
    });

    const aggregatorDescriptor = createTenantSessionRuntimeDescriptor({
      tenantId: 'agg-1',
      tenantSlug: 'qa-agg',
      tenantName: 'QA AGG',
      baseFamily: aggregatorSeed.baseFamily,
      aggregatorCapability: aggregatorSeed.aggregatorCapability,
      tenantCategory: aggregatorSeed.tenantCategory,
      whiteLabelCapability: aggregatorSeed.whiteLabelCapability,
      commercialPlan: aggregatorSeed.commercialPlan,
      authenticatedRole: 'OWNER',
    });
    const whiteLabelDescriptor = createTenantSessionRuntimeDescriptor({
      tenantId: 'wl-1',
      tenantSlug: 'qa-wl',
      tenantName: 'QA WL',
      baseFamily: whiteLabelSeed.baseFamily,
      aggregatorCapability: whiteLabelSeed.aggregatorCapability,
      tenantCategory: whiteLabelSeed.tenantCategory,
      whiteLabelCapability: whiteLabelSeed.whiteLabelCapability,
      commercialPlan: whiteLabelSeed.commercialPlan,
      authenticatedRole: 'OWNER',
    });
    const b2bDescriptor = createTenantSessionRuntimeDescriptor({
      tenantId: 'b2b-1',
      tenantSlug: 'qa-b2b',
      tenantName: 'QA B2B',
      baseFamily: b2bSeed.baseFamily,
      aggregatorCapability: b2bSeed.aggregatorCapability,
      tenantCategory: b2bSeed.tenantCategory,
      whiteLabelCapability: b2bSeed.whiteLabelCapability,
      commercialPlan: b2bSeed.commercialPlan,
      authenticatedRole: 'OWNER',
    });

    expect(aggregatorSeed).toEqual({
      baseFamily: 'B2B',
      aggregatorCapability: true,
      tenantCategory: 'AGGREGATOR',
      whiteLabelCapability: false,
      commercialPlan: 'PROFESSIONAL',
    });
    expect(whiteLabelSeed).toEqual({
      baseFamily: 'B2C',
      aggregatorCapability: false,
      tenantCategory: 'B2C',
      whiteLabelCapability: true,
      commercialPlan: 'ENTERPRISE',
    });
    expect(b2bSeed).toEqual({
      baseFamily: 'B2B',
      aggregatorCapability: false,
      tenantCategory: 'B2B',
      whiteLabelCapability: false,
      commercialPlan: 'PROFESSIONAL',
    });
    expect(resolveRuntimeManifestKeyFromDescriptor(aggregatorDescriptor, 'EXPERIENCE')).toBe('aggregator_workspace');
    expect(resolveRuntimeShellFamilyFromDescriptor(aggregatorDescriptor, 'EXPERIENCE')).toBe('AggregatorShell');
    expect(resolveRuntimeManifestKeyFromDescriptor(whiteLabelDescriptor, 'EXPERIENCE')).toBe('wl_storefront');
    expect(resolveRuntimeShellFamilyFromDescriptor(whiteLabelDescriptor, 'EXPERIENCE')).toBe('WhiteLabelShell');
    expect(resolveRuntimeManifestKeyFromDescriptor(b2bDescriptor, 'EXPERIENCE')).toBe('b2b_workspace');
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

    const jwtOnlyDescriptor = createTenantSessionRuntimeDescriptor({
      tenantId: readStoredTenantJwtClaims()?.tenantId ?? null,
      tenantSlug: null,
      tenantName: null,
      tenantCategory: null,
      whiteLabelCapability: null,
      commercialPlan: null,
      authenticatedRole: readStoredTenantJwtClaims()?.role ?? null,
    });
    const canonicalSnapshot = buildTenantSnapshot(makeCanonicalTenant({
      tenant_category: 'B2B',
      is_white_label: false,
    }));
    const canonicalDescriptor = buildTenantDescriptor(canonicalSnapshot);

    expect(jwtOnlyDescriptor).toBeNull();
    expect(canonicalSnapshot?.tenant_category).toBe('B2B');
    expect(canonicalSnapshot?.is_white_label).toBe(false);
    expect(resolveRuntimeManifestKeyFromDescriptor(canonicalDescriptor, 'EXPERIENCE')).toBe('b2b_workspace');
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