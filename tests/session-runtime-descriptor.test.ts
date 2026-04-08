import { describe, expect, it } from 'vitest';

import {
  createControlPlaneSessionRuntimeDescriptor,
  createTenantSessionRuntimeDescriptor,
  resolveRuntimeAppStateFromDescriptor,
  resolveRuntimeContentFamilyFromDescriptor,
  resolveRuntimeManifestEntryFromDescriptor,
  resolveRuntimeManifestKeyFromDescriptor,
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

    expect(resolveRuntimeContentFamilyFromDescriptor(null, 'EXPERIENCE')).toBeNull();
    expect(resolveRuntimeManifestKeyFromDescriptor(null, 'EXPERIENCE')).toBeNull();
    expect(resolveRuntimeManifestEntryFromDescriptor(null, 'EXPERIENCE')).toBeNull();
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
    expect(resolveRuntimeManifestKeyFromDescriptor(aggregatorDescriptor ?? null, 'EXPERIENCE')).toBe('aggregator_workspace');
    expect(resolveRuntimeManifestEntryFromDescriptor(aggregatorDescriptor ?? null, 'EXPERIENCE')).toEqual(
      expect.objectContaining({
        key: 'aggregator_workspace',
        shellFamily: 'AggregatorShell',
      }),
    );
    expect(resolveRuntimeContentFamilyFromDescriptor(aggregatorDescriptor ?? null, 'EXPERIENCE')).toBe('aggregator_workspace');
    expect(internalDescriptor?.operatingMode).toBe('AGGREGATOR_WORKSPACE');
    expect(resolveRuntimeContentFamilyFromDescriptor(internalDescriptor ?? null, 'EXPERIENCE')).toBe('aggregator_workspace');
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
    expect(resolveRuntimeManifestKeyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBe('b2b_workspace');
    expect(resolveRuntimeManifestEntryFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toEqual(
      expect.objectContaining({
        key: 'b2b_workspace',
        shellFamily: 'B2BShell',
      }),
    );
    expect(resolveRuntimeContentFamilyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBe('b2b_workspace');
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
    expect(resolveRuntimeManifestKeyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBe('b2c_storefront');
    expect(resolveRuntimeManifestEntryFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toEqual(
      expect.objectContaining({
        key: 'b2c_storefront',
        shellFamily: 'B2CShell',
      }),
    );
    expect(resolveRuntimeContentFamilyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBe('b2c_storefront');
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
    expect(resolveRuntimeManifestKeyFromDescriptor(storefrontDescriptor ?? null, 'EXPERIENCE')).toBe('wl_storefront');
    expect(resolveRuntimeManifestEntryFromDescriptor(storefrontDescriptor ?? null, 'EXPERIENCE')).toEqual(
      expect.objectContaining({
        key: 'wl_storefront',
        shellFamily: 'WhiteLabelShell',
      }),
    );
    expect(resolveRuntimeContentFamilyFromDescriptor(storefrontDescriptor ?? null, 'EXPERIENCE')).toBe('wl_storefront');
    expect(resolveRuntimeShellFamilyFromDescriptor(storefrontDescriptor ?? null, 'EXPERIENCE')).toBe('WhiteLabelShell');
    expect(resolveRuntimeManifestKeyFromDescriptor(storefrontDescriptor ?? null, 'WL_ADMIN')).toBeNull();
    expect(resolveRuntimeManifestEntryFromDescriptor(storefrontDescriptor ?? null, 'WL_ADMIN')).toBeNull();
    expect(resolveRuntimeContentFamilyFromDescriptor(storefrontDescriptor ?? null, 'WL_ADMIN')).toBeNull();
    expect(resolveRuntimeShellFamilyFromDescriptor(storefrontDescriptor ?? null, 'WL_ADMIN')).toBeNull();

    expect(wlAdminDescriptor?.operatingMode).toBe('WL_STOREFRONT');
    expect(wlAdminDescriptor?.routeManifestKey).toBe('wl_admin');
    expect(wlAdminDescriptor?.runtimeOverlays).toEqual(['WL_ADMIN']);
    expect(wlAdminDescriptor?.capabilities.surface.wlAdmin).toBe(true);
    expect(wlAdminDescriptor?.capabilities.platform.branding).toBe(true);
    expect(wlAdminDescriptor?.capabilities.platform.domains).toBe(true);
    expect(resolveRuntimeAppStateFromDescriptor(wlAdminDescriptor ?? null)).toBe('WL_ADMIN');
    expect(resolveRuntimeManifestKeyFromDescriptor(wlAdminDescriptor ?? null, 'EXPERIENCE')).toBe('wl_storefront');
    expect(resolveRuntimeManifestEntryFromDescriptor(wlAdminDescriptor ?? null, 'EXPERIENCE')).toEqual(
      expect.objectContaining({
        key: 'wl_storefront',
        shellFamily: 'WhiteLabelShell',
      }),
    );
    expect(resolveRuntimeContentFamilyFromDescriptor(wlAdminDescriptor ?? null, 'EXPERIENCE')).toBe('wl_storefront');
    expect(resolveRuntimeContentFamilyFromDescriptor(wlAdminDescriptor ?? null, 'SETTINGS')).toBe('wl_storefront');
    expect(resolveRuntimeManifestKeyFromDescriptor(wlAdminDescriptor ?? null, 'WL_ADMIN')).toBe('wl_admin');
    expect(resolveRuntimeManifestEntryFromDescriptor(wlAdminDescriptor ?? null, 'WL_ADMIN')).toEqual(
      expect.objectContaining({
        key: 'wl_admin',
        shellFamily: 'WhiteLabelAdminShell',
        overlayDriven: true,
      }),
    );
    expect(resolveRuntimeContentFamilyFromDescriptor(wlAdminDescriptor ?? null, 'WL_ADMIN')).toBe('wl_admin');
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
    expect(resolveRuntimeManifestKeyFromDescriptor(descriptor ?? null, 'CONTROL_PLANE')).toBe('control_plane');
    expect(resolveRuntimeManifestEntryFromDescriptor(descriptor ?? null, 'CONTROL_PLANE')).toEqual(
      expect.objectContaining({
        key: 'control_plane',
        shellFamily: 'SuperAdminShell',
      }),
    );
    expect(resolveRuntimeContentFamilyFromDescriptor(descriptor ?? null, 'CONTROL_PLANE')).toBe('control_plane');
    expect(resolveRuntimeManifestKeyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBeNull();
    expect(resolveRuntimeManifestEntryFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBeNull();
    expect(resolveRuntimeContentFamilyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBeNull();
    expect(resolveRuntimeShellFamilyFromDescriptor(descriptor ?? null, 'CONTROL_PLANE')).toBe('SuperAdminShell');
  });
});