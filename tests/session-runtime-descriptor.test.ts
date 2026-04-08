import { describe, expect, it } from 'vitest';

import {
  createControlPlaneSessionRuntimeDescriptor,
  createTenantSessionRuntimeDescriptor,
  getRuntimeLocalRouteRegistration,
  resolveRuntimeAppStateFromDescriptor,
  resolveRuntimeContentFamilyFromDescriptor,
  resolveRuntimeLocalRouteSelection,
  resolveRuntimeManifestEntryFromDescriptor,
  resolveRuntimeManifestKeyFromDescriptor,
  resolveRuntimeRouteGroupSelection,
  resolveRuntimeShellNavigationSurface,
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
    expect(resolveRuntimeLocalRouteSelection(null, { expView: 'HOME' })).toBeNull();
    expect(getRuntimeLocalRouteRegistration(null, 'home')).toBeNull();
    expect(resolveRuntimeShellNavigationSurface(null, null, ['home'])).toBeNull();
    expect(resolveRuntimeRouteGroupSelection(null, { expView: 'HOME' })).toBeNull();
  });

  it('builds normalized shell navigation surfaces from local route registrations', () => {
    const aggregatorDescriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'AGGREGATOR' }),
    );
    const aggregatorEntry = resolveRuntimeManifestEntryFromDescriptor(aggregatorDescriptor ?? null, 'EXPERIENCE');
    const aggregatorSelection = resolveRuntimeLocalRouteSelection(aggregatorEntry, { expView: 'DPP' });
    const aggregatorSurface = resolveRuntimeShellNavigationSurface(aggregatorEntry, aggregatorSelection, ['home', 'orders', 'dpp']);

    expect(aggregatorSurface).toEqual(expect.objectContaining({
      activeRouteKey: 'dpp',
      activeNavigationKey: 'DPP',
      defaultRouteKey: 'home',
    }));
    expect(aggregatorSurface?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ routeKey: 'home', active: false }),
      expect.objectContaining({ routeKey: 'dpp', active: true }),
    ]));

    const wlAdminDescriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'B2B', whiteLabelCapability: true, authenticatedRole: 'TENANT_ADMIN' }),
    );
    const wlAdminEntry = resolveRuntimeManifestEntryFromDescriptor(wlAdminDescriptor ?? null, 'WL_ADMIN');
    const wlAdminSelection = resolveRuntimeLocalRouteSelection(wlAdminEntry, {
      wlAdminView: 'STAFF',
      wlAdminInviting: true,
    });
    const wlAdminSurface = resolveRuntimeShellNavigationSurface(
      wlAdminEntry,
      wlAdminSelection,
      ['branding', 'staff', 'products', 'collections', 'orders', 'domains'],
      'wlAdminView',
    );

    expect(wlAdminSurface).toEqual(expect.objectContaining({
      activeRouteKey: 'staff_invite',
      activeNavigationKey: 'STAFF',
      defaultRouteKey: 'branding',
    }));
    expect(wlAdminSurface?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ routeKey: 'staff', active: true }),
      expect.objectContaining({ routeKey: 'branding', active: false }),
    ]));

    const controlDescriptor = createControlPlaneSessionRuntimeDescriptor({
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      authenticatedRole: 'SUPER_ADMIN',
    });
    const controlEntry = resolveRuntimeManifestEntryFromDescriptor(controlDescriptor ?? null, 'CONTROL_PLANE');
    const controlSelection = resolveRuntimeLocalRouteSelection(controlEntry, {
      adminView: 'TENANTS',
      selectedTenantId: 'tenant-1',
    });
    const controlSurface = resolveRuntimeShellNavigationSurface(
      controlEntry,
      controlSelection,
      ['tenant_registry', 'flags', 'health'],
      'adminView',
    );

    expect(controlSurface).toEqual(expect.objectContaining({
      activeRouteKey: 'tenant_detail',
      activeNavigationKey: 'TENANTS',
      defaultRouteKey: 'tenant_registry',
    }));
    expect(controlSurface?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ routeKey: 'tenant_registry', active: true }),
      expect.objectContaining({ routeKey: 'health', active: false }),
    ]));
  });

  it('maps aggregator and internal tenants to aggregator workspace mode', () => {
    const aggregatorDescriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'AGGREGATOR' }),
    );
    const internalDescriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'INTERNAL' }),
    );
    const aggregatorEntry = resolveRuntimeManifestEntryFromDescriptor(aggregatorDescriptor ?? null, 'EXPERIENCE');

    expect(aggregatorDescriptor?.operatingMode).toBe('AGGREGATOR_WORKSPACE');
    expect(aggregatorDescriptor?.routeManifestKey).toBe('aggregator_workspace');
    expect(aggregatorDescriptor?.capabilities.platform.discovery).toBe(true);
    expect(resolveRuntimeManifestKeyFromDescriptor(aggregatorDescriptor ?? null, 'EXPERIENCE')).toBe('aggregator_workspace');
    expect(aggregatorEntry).toEqual(
      expect.objectContaining({
        key: 'aggregator_workspace',
        shellFamily: 'AggregatorShell',
        defaultLocalRouteKey: 'home',
        allowedRouteGroups: ['home_landing', 'orders_operations', 'rfq_sourcing', 'operational_workspace'],
      }),
    );
    expect(getRuntimeLocalRouteRegistration(aggregatorEntry ?? null, 'home')).toEqual(
      expect.objectContaining({
        routeGroupKey: 'home_landing',
        route: expect.objectContaining({
          selectionKey: 'HOME',
          stateBinding: expect.objectContaining({ expView: 'HOME' }),
        }),
      }),
    );
    expect(resolveRuntimeLocalRouteSelection(aggregatorEntry ?? null, { expView: 'DPP' })).toEqual(
      expect.objectContaining({
        routeKey: 'dpp',
        routeGroupKey: 'operational_workspace',
        viewKey: 'DPP',
      }),
    );
    expect(
      resolveRuntimeRouteGroupSelection(
        aggregatorEntry,
        { expView: 'HOME' },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'home_landing', viewKey: 'HOME' }));
    expect(
      resolveRuntimeRouteGroupSelection(
        aggregatorEntry,
        { expView: 'DPP' },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'operational_workspace', viewKey: 'DPP' }));
    expect(resolveRuntimeContentFamilyFromDescriptor(aggregatorDescriptor ?? null, 'EXPERIENCE')).toBe('aggregator_workspace');
    expect(internalDescriptor?.operatingMode).toBe('AGGREGATOR_WORKSPACE');
    expect(resolveRuntimeContentFamilyFromDescriptor(internalDescriptor ?? null, 'EXPERIENCE')).toBe('aggregator_workspace');
  });

  it('maps non-white-label B2B tenants to workspace routing', () => {
    const descriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'B2B', whiteLabelCapability: false }),
    );
    const entry = resolveRuntimeManifestEntryFromDescriptor(descriptor ?? null, 'EXPERIENCE');

    expect(descriptor?.operatingMode).toBe('B2B_WORKSPACE');
    expect(descriptor?.routeManifestKey).toBe('b2b_workspace');
    expect(descriptor?.runtimeOverlays).toEqual([]);
    expect(descriptor?.capabilities.surface.workspace).toBe(true);
    expect(descriptor?.capabilities.feature.rfq).toBe(true);
    expect(descriptor?.capabilities.feature.sellerCatalog).toBe(true);
    expect(resolveRuntimeAppStateFromDescriptor(descriptor ?? null)).toBe('EXPERIENCE');
    expect(resolveRuntimeManifestKeyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBe('b2b_workspace');
    expect(entry).toEqual(
      expect.objectContaining({
        key: 'b2b_workspace',
        shellFamily: 'B2BShell',
        defaultLocalRouteKey: 'catalog',
        allowedRouteGroups: ['catalog_browse', 'orders_operations', 'rfq_sourcing', 'operational_workspace'],
      }),
    );
    expect(getRuntimeLocalRouteRegistration(entry ?? null, 'catalog')).toEqual(
      expect.objectContaining({
        routeGroupKey: 'catalog_browse',
        route: expect.objectContaining({
          selectionKey: 'HOME',
          stateBinding: expect.objectContaining({ expView: 'HOME' }),
        }),
      }),
    );
    expect(resolveRuntimeLocalRouteSelection(entry ?? null, { expView: 'RFQS' })).toEqual(
      expect.objectContaining({
        routeKey: 'buyer_rfqs',
        routeGroupKey: 'rfq_sourcing',
        viewKey: 'RFQS',
      }),
    );
    expect(
      resolveRuntimeRouteGroupSelection(
        entry,
        { expView: 'HOME' },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'catalog_browse', viewKey: 'HOME' }));
    expect(
      resolveRuntimeRouteGroupSelection(
        entry,
        { expView: 'RFQS' },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'rfq_sourcing', viewKey: 'RFQS' }));
    expect(resolveRuntimeContentFamilyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBe('b2b_workspace');
    expect(resolveRuntimeShellFamilyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBe('B2BShell');
  });

  it('maps non-white-label B2C tenants to storefront routing', () => {
    const descriptor = createTenantSessionRuntimeDescriptor(
      makeTenantInput({ tenantCategory: 'B2C', whiteLabelCapability: false }),
    );
    const entry = resolveRuntimeManifestEntryFromDescriptor(descriptor ?? null, 'EXPERIENCE');

    expect(descriptor?.operatingMode).toBe('B2C_STOREFRONT');
    expect(descriptor?.routeManifestKey).toBe('b2c_storefront');
    expect(descriptor?.capabilities.surface.storefront).toBe(true);
    expect(descriptor?.capabilities.feature.cart).toBe(true);
    expect(descriptor?.capabilities.feature.buyerCatalog).toBe(true);
    expect(resolveRuntimeManifestKeyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBe('b2c_storefront');
    expect(entry).toEqual(
      expect.objectContaining({
        key: 'b2c_storefront',
        shellFamily: 'B2CShell',
        defaultLocalRouteKey: 'home',
        allowedRouteGroups: ['home_landing', 'cart_commerce', 'orders_operations', 'rfq_sourcing', 'operational_workspace'],
      }),
    );
    expect(getRuntimeLocalRouteRegistration(entry ?? null, 'cart')).toEqual(
      expect.objectContaining({
        routeGroupKey: 'cart_commerce',
        route: expect.objectContaining({
          selectionKey: 'CART',
          stateBinding: expect.objectContaining({ expView: 'HOME', showCart: true }),
        }),
      }),
    );
    expect(resolveRuntimeLocalRouteSelection(entry ?? null, { expView: 'HOME', showCart: true })).toEqual(
      expect.objectContaining({
        routeKey: 'cart',
        routeGroupKey: 'cart_commerce',
        viewKey: 'CART',
      }),
    );
    expect(
      resolveRuntimeRouteGroupSelection(
        entry,
        { expView: 'HOME' },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'home_landing', viewKey: 'HOME' }));
    expect(
      resolveRuntimeRouteGroupSelection(
        entry,
        { expView: 'HOME', showCart: true },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'cart_commerce', viewKey: 'CART' }));
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
    const storefrontEntry = resolveRuntimeManifestEntryFromDescriptor(storefrontDescriptor ?? null, 'EXPERIENCE');
    const wlAdminEntry = resolveRuntimeManifestEntryFromDescriptor(wlAdminDescriptor ?? null, 'WL_ADMIN');

    expect(storefrontDescriptor?.operatingMode).toBe('WL_STOREFRONT');
    expect(storefrontDescriptor?.routeManifestKey).toBe('wl_storefront');
    expect(storefrontDescriptor?.runtimeOverlays).toEqual([]);
    expect(resolveRuntimeAppStateFromDescriptor(storefrontDescriptor ?? null)).toBe('EXPERIENCE');
    expect(resolveRuntimeManifestKeyFromDescriptor(storefrontDescriptor ?? null, 'EXPERIENCE')).toBe('wl_storefront');
    expect(storefrontEntry).toEqual(
      expect.objectContaining({
        key: 'wl_storefront',
        shellFamily: 'WhiteLabelShell',
        defaultLocalRouteKey: 'home',
      }),
    );
    expect(getRuntimeLocalRouteRegistration(storefrontEntry ?? null, 'buyer_rfqs')).toEqual(
      expect.objectContaining({
        routeGroupKey: 'rfq_sourcing',
        route: expect.objectContaining({
          selectionKey: 'RFQS',
          stateBinding: expect.objectContaining({ expView: 'RFQS' }),
        }),
      }),
    );
    expect(
      resolveRuntimeRouteGroupSelection(
        storefrontEntry,
        { expView: 'RFQS' },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'rfq_sourcing', viewKey: 'RFQS' }));
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
    expect(wlAdminEntry).toEqual(
      expect.objectContaining({
        key: 'wl_admin',
        shellFamily: 'WhiteLabelAdminShell',
        overlayDriven: true,
        defaultLocalRouteKey: 'branding',
        allowedRouteGroups: ['admin_branding_domains', 'catalog_browse', 'orders_operations'],
      }),
    );
    expect(getRuntimeLocalRouteRegistration(wlAdminEntry ?? null, 'staff_invite')).toEqual(
      expect.objectContaining({
        routeGroupKey: 'admin_branding_domains',
        route: expect.objectContaining({
          selectionKey: 'STAFF_INVITE',
          stateBinding: expect.objectContaining({
            wlAdminView: 'STAFF',
            wlAdminInviting: true,
          }),
        }),
      }),
    );
    expect(resolveRuntimeLocalRouteSelection(wlAdminEntry ?? null, { wlAdminView: 'STAFF', wlAdminInviting: true })).toEqual(
      expect.objectContaining({
        routeKey: 'staff_invite',
        routeGroupKey: 'admin_branding_domains',
        viewKey: 'STAFF_INVITE',
      }),
    );
    expect(
      resolveRuntimeRouteGroupSelection(
        wlAdminEntry,
        { wlAdminView: 'BRANDING' },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'admin_branding_domains', viewKey: 'BRANDING' }));
    expect(
      resolveRuntimeRouteGroupSelection(
        wlAdminEntry,
        { wlAdminView: 'PRODUCTS' },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'catalog_browse', viewKey: 'PRODUCTS' }));
    expect(
      resolveRuntimeRouteGroupSelection(
        wlAdminEntry,
        { wlAdminView: 'ORDERS' },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'orders_operations', viewKey: 'ORDERS' }));
    expect(resolveRuntimeContentFamilyFromDescriptor(wlAdminDescriptor ?? null, 'WL_ADMIN')).toBe('wl_admin');
    expect(resolveRuntimeShellFamilyFromDescriptor(wlAdminDescriptor ?? null, 'WL_ADMIN')).toBe('WhiteLabelAdminShell');
  });

  it('establishes control-plane runtime descriptors separately from tenant routing', () => {
    const descriptor = createControlPlaneSessionRuntimeDescriptor({
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      authenticatedRole: 'SUPER_ADMIN',
    });
    const entry = resolveRuntimeManifestEntryFromDescriptor(descriptor ?? null, 'CONTROL_PLANE');

    expect(descriptor?.realm).toBe('CONTROL_PLANE');
    expect(descriptor?.operatingMode).toBe('CONTROL_PLANE');
    expect(descriptor?.routeManifestKey).toBe('control_plane');
    expect(resolveRuntimeAppStateFromDescriptor(descriptor ?? null)).toBe('CONTROL_PLANE');
    expect(resolveRuntimeManifestKeyFromDescriptor(descriptor ?? null, 'CONTROL_PLANE')).toBe('control_plane');
    expect(entry).toEqual(
      expect.objectContaining({
        key: 'control_plane',
        shellFamily: 'SuperAdminShell',
        defaultLocalRouteKey: 'tenant_registry',
        allowedRouteGroups: ['control_plane_operations'],
      }),
    );
    expect(getRuntimeLocalRouteRegistration(entry ?? null, 'tenant_detail')).toEqual(
      expect.objectContaining({
        routeGroupKey: 'control_plane_operations',
        route: expect.objectContaining({
          selectionKey: 'TENANT_DETAIL',
          stateBinding: expect.objectContaining({
            adminView: 'TENANTS',
            requiresSelectedTenant: true,
          }),
        }),
      }),
    );
    expect(resolveRuntimeLocalRouteSelection(entry ?? null, { adminView: 'TENANTS', selectedTenantId: 'tenant-1' })).toEqual(
      expect.objectContaining({
        routeKey: 'tenant_detail',
        routeGroupKey: 'control_plane_operations',
        viewKey: 'TENANT_DETAIL',
      }),
    );
    expect(
      resolveRuntimeRouteGroupSelection(
        entry,
        { adminView: 'HEALTH' },
      ),
    ).toEqual(expect.objectContaining({ routeGroupKey: 'control_plane_operations', viewKey: 'HEALTH' }));
    expect(resolveRuntimeContentFamilyFromDescriptor(descriptor ?? null, 'CONTROL_PLANE')).toBe('control_plane');
    expect(resolveRuntimeManifestKeyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBeNull();
    expect(resolveRuntimeManifestEntryFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBeNull();
    expect(resolveRuntimeContentFamilyFromDescriptor(descriptor ?? null, 'EXPERIENCE')).toBeNull();
    expect(resolveRuntimeShellFamilyFromDescriptor(descriptor ?? null, 'CONTROL_PLANE')).toBe('SuperAdminShell');
  });
});