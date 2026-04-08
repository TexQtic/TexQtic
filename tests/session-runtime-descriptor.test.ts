import { describe, expect, it } from 'vitest';

import {
  createControlPlaneSessionRuntimeDescriptor,
  createTenantSessionRuntimeDescriptor,
  resolveRuntimeAppStateFromDescriptor,
  resolveRuntimeShellFamilyFromDescriptor,
} from '../runtime/sessionRuntimeDescriptor';

const makeTenantInput = (
  overrides: Partial<Parameters<typeof createTenantSessionRuntimeDescriptor>[0]> = {},
) => ({
  tenantId: 'tenant-1',
  tenantSlug: 'tenant-one',
  tenantName: 'Tenant One',
  tenantCategory: 'B2B',
  whiteLabelCapability: false,
  commercialPlan: 'PROFESSIONAL',
  authenticatedRole: 'OWNER',
  ...overrides,
});

describe('session runtime descriptor', () => {
  it('fails closed when canonical tenant identity is incomplete', () => {
    expect(
      createTenantSessionRuntimeDescriptor(
        makeTenantInput({ tenantCategory: null }),
      ),
    ).toBeNull();

    expect(
      createTenantSessionRuntimeDescriptor(
        makeTenantInput({ whiteLabelCapability: null }),
      ),
    ).toBeNull();
  });

  it('maps aggregator and internal tenants to aggregator workspace mode', () => {
    const aggregatorDescriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'AGGREGATOR' }),
    );
    const internalDescriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'INTERNAL' }),
    );

    expect(aggregatorDescriptor?.operatingMode).toBe('AGGREGATOR_WORKSPACE');
    expect(aggregatorDescriptor?.routeManifestKey).toBe('aggregator_workspace');
    expect(aggregatorDescriptor?.capabilities.platform.discovery).toBe(true);
    expect(internalDescriptor?.operatingMode).toBe('AGGREGATOR_WORKSPACE');
  });

  it('maps non-white-label B2B tenants to workspace routing', () => {
    const descriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'B2B', whiteLabelCapability: false }),
    );

    expect(descriptor?.operatingMode).toBe('B2B_WORKSPACE');
    expect(descriptor?.routeManifestKey).toBe('b2b_workspace');
    expect(descriptor?.runtimeOverlays).toEqual([]);
    expect(descriptor?.capabilities.surface.workspace).toBe(true);
    expect(descriptor?.capabilities.feature.rfq).toBe(true);
    expect(descriptor?.capabilities.feature.sellerCatalog).toBe(true);
    expect(resolveRuntimeAppStateFromDescriptor(descriptor ?? null)).toBe('EXPERIENCE');
    expect(resolveRuntimeShellFamilyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBe('B2BShell');
  });

  it('maps non-white-label B2C tenants to storefront routing', () => {
    const descriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'B2C', whiteLabelCapability: false }),
    );

    expect(descriptor?.operatingMode).toBe('B2C_STOREFRONT');
    expect(descriptor?.routeManifestKey).toBe('b2c_storefront');
    expect(descriptor?.capabilities.surface.storefront).toBe(true);
    expect(descriptor?.capabilities.feature.cart).toBe(true);
    expect(descriptor?.capabilities.feature.buyerCatalog).toBe(true);
    expect(resolveRuntimeShellFamilyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBe('B2CShell');
  });

  it('keeps white-label storefront and wl-admin overlay distinct', () => {
    const storefrontDescriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'B2B', whiteLabelCapability: true, authenticatedRole: 'MEMBER' }),
    );
    const wlAdminDescriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'B2B', whiteLabelCapability: true, authenticatedRole: 'TENANT_ADMIN' }),
    );

    expect(storefrontDescriptor?.operatingMode).toBe('WL_STOREFRONT');
    expect(storefrontDescriptor?.routeManifestKey).toBe('wl_storefront');
    expect(storefrontDescriptor?.runtimeOverlays).toEqual([]);
    expect(resolveRuntimeAppStateFromDescriptor(storefrontDescriptor ?? null)).toBe('EXPERIENCE');
    expect(resolveRuntimeShellFamilyFromDescriptor(storefrontDescriptor ?? null, 'EXPERIENCE')).toBe('WhiteLabelShell');
    expect(resolveRuntimeShellFamilyFromDescriptor(storefrontDescriptor ?? null, 'WL_ADMIN')).toBeNull();

    expect(wlAdminDescriptor?.operatingMode).toBe('WL_STOREFRONT');
    expect(wlAdminDescriptor?.routeManifestKey).toBe('wl_admin');
    expect(wlAdminDescriptor?.runtimeOverlays).toEqual(['WL_ADMIN']);
    expect(wlAdminDescriptor?.capabilities.surface.wlAdmin).toBe(true);
    expect(wlAdminDescriptor?.capabilities.platform.branding).toBe(true);
    expect(wlAdminDescriptor?.capabilities.platform.domains).toBe(true);
    expect(resolveRuntimeAppStateFromDescriptor(wlAdminDescriptor ?? null)).toBe('WL_ADMIN');
    expect(resolveRuntimeShellFamilyFromDescriptor(wlAdminDescriptor ?? null, 'WL_ADMIN')).toBe('WhiteLabelAdminShell');
  });

  it('establishes control-plane runtime descriptors separately from tenant routing', () => {
    const descriptor = createControlPlaneSessionRuntimeDescriptor({
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      authenticatedRole: 'SUPER_ADMIN',
    });

    expect(descriptor?.realm).toBe('CONTROL_PLANE');
    expect(descriptor?.operatingMode).toBe('CONTROL_PLANE');
    expect(descriptor?.routeManifestKey).toBe('control_plane');
    expect(resolveRuntimeAppStateFromDescriptor(descriptor ?? null)).toBe('CONTROL_PLANE');
    expect(resolveRuntimeShellFamilyFromDescriptor(descriptor ?? null, 'CONTROL_PLANE')).toBe('SuperAdminShell');
  });
});