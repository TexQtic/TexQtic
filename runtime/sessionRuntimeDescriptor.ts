import { normalizeCommercialPlan, type CommercialPlan } from '../types';

export type TenantCategory = 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL';

export type TenantOperatingMode =
  | 'CONTROL_PLANE'
  | 'AGGREGATOR_WORKSPACE'
  | 'B2B_WORKSPACE'
  | 'B2C_STOREFRONT'
  | 'WL_STOREFRONT';

export type RuntimeOverlay = 'WL_ADMIN';

export type RouteManifestKey =
  | 'control_plane'
  | 'aggregator_workspace'
  | 'b2b_workspace'
  | 'b2c_storefront'
  | 'wl_storefront'
  | 'wl_admin';

export interface SurfaceCapabilities {
  workspace: boolean;
  storefront: boolean;
  wlAdmin: boolean;
}

export interface FeatureCapabilities {
  cart: boolean;
  rfq: boolean;
  sellerCatalog: boolean;
  buyerCatalog: boolean;
}

export interface PlatformCapabilities {
  domains: boolean;
  branding: boolean;
  discovery: boolean;
}

export interface SessionCapabilities {
  surface: SurfaceCapabilities;
  feature: FeatureCapabilities;
  platform: PlatformCapabilities;
}

export interface SessionRuntimeDescriptor {
  realm: 'TENANT' | 'CONTROL_PLANE';
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  authenticatedRole: string | null;
  commercialPlan: CommercialPlan | null;
  tenantCategory: TenantCategory | null;
  whiteLabelCapability: boolean;
  operatingMode: TenantOperatingMode | null;
  runtimeOverlays: RuntimeOverlay[];
  capabilities: SessionCapabilities;
  routeManifestKey: RouteManifestKey | null;
}

export interface TenantRuntimeDescriptorInput {
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  tenantCategory: string | null | undefined;
  whiteLabelCapability: boolean | null | undefined;
  commercialPlan: string | null | undefined;
  authenticatedRole: string | null;
}

export interface ControlPlaneRuntimeDescriptorInput {
  actorId: string | null;
  actorEmail: string | null;
  authenticatedRole: string | null;
}

export type RuntimeAppState = 'CONTROL_PLANE' | 'EXPERIENCE' | 'WL_ADMIN';

export type RuntimeShellFamily =
  | 'SuperAdminShell'
  | 'AggregatorShell'
  | 'B2BShell'
  | 'B2CShell'
  | 'WhiteLabelShell'
  | 'WhiteLabelAdminShell';

export type RuntimeShellState = RuntimeAppState | 'TEAM_MGMT' | 'INVITE_MEMBER' | 'SETTINGS' | null | undefined;

const WL_ADMIN_ROLES = new Set(['TENANT_OWNER', 'TENANT_ADMIN', 'OWNER', 'ADMIN']);

const EMPTY_CAPABILITIES: SessionCapabilities = {
  surface: {
    workspace: false,
    storefront: false,
    wlAdmin: false,
  },
  feature: {
    cart: false,
    rfq: false,
    sellerCatalog: false,
    buyerCatalog: false,
  },
  platform: {
    domains: false,
    branding: false,
    discovery: false,
  },
};

const normalizeTenantCategory = (tenantCategory: string | null | undefined): TenantCategory | null => {
  const normalized = tenantCategory?.trim().toUpperCase();

  switch (normalized) {
    case 'AGGREGATOR':
      return 'AGGREGATOR';
    case 'B2B':
      return 'B2B';
    case 'B2C':
      return 'B2C';
    case 'INTERNAL':
      return 'INTERNAL';
    default:
      return null;
  }
};

const hasWlAdminOverlay = (whiteLabelCapability: boolean, authenticatedRole: string | null) => {
  return whiteLabelCapability && WL_ADMIN_ROLES.has(authenticatedRole?.trim().toUpperCase() ?? '');
};

const resolveOperatingMode = (
  tenantCategory: TenantCategory | null,
  whiteLabelCapability: boolean,
): TenantOperatingMode | null => {
  switch (tenantCategory) {
    case 'AGGREGATOR':
    case 'INTERNAL':
      return 'AGGREGATOR_WORKSPACE';
    case 'B2B':
      return whiteLabelCapability ? 'WL_STOREFRONT' : 'B2B_WORKSPACE';
    case 'B2C':
      return whiteLabelCapability ? 'WL_STOREFRONT' : 'B2C_STOREFRONT';
    default:
      return null;
  }
};

const resolveRouteManifestKey = (
  operatingMode: TenantOperatingMode | null,
  runtimeOverlays: RuntimeOverlay[],
): RouteManifestKey | null => {
  if (operatingMode === 'CONTROL_PLANE') {
    return 'control_plane';
  }

  if (runtimeOverlays.includes('WL_ADMIN')) {
    return 'wl_admin';
  }

  switch (operatingMode) {
    case 'AGGREGATOR_WORKSPACE':
      return 'aggregator_workspace';
    case 'B2B_WORKSPACE':
      return 'b2b_workspace';
    case 'B2C_STOREFRONT':
      return 'b2c_storefront';
    case 'WL_STOREFRONT':
      return 'wl_storefront';
    default:
      return null;
  }
};

const resolveCapabilities = (
  operatingMode: TenantOperatingMode | null,
  runtimeOverlays: RuntimeOverlay[],
): SessionCapabilities => {
  const capabilities: SessionCapabilities = {
    surface: { ...EMPTY_CAPABILITIES.surface },
    feature: { ...EMPTY_CAPABILITIES.feature },
    platform: { ...EMPTY_CAPABILITIES.platform },
  };

  switch (operatingMode) {
    case 'AGGREGATOR_WORKSPACE':
      capabilities.surface.workspace = true;
      capabilities.platform.discovery = true;
      break;
    case 'B2B_WORKSPACE':
      capabilities.surface.workspace = true;
      capabilities.feature.rfq = true;
      capabilities.feature.sellerCatalog = true;
      break;
    case 'B2C_STOREFRONT':
      capabilities.surface.storefront = true;
      capabilities.feature.cart = true;
      capabilities.feature.buyerCatalog = true;
      break;
    case 'WL_STOREFRONT':
      capabilities.surface.storefront = true;
      capabilities.feature.cart = true;
      capabilities.feature.rfq = true;
      capabilities.feature.buyerCatalog = true;
      capabilities.platform.branding = true;
      capabilities.platform.domains = true;
      break;
    case 'CONTROL_PLANE':
    default:
      break;
  }

  if (runtimeOverlays.includes('WL_ADMIN')) {
    capabilities.surface.wlAdmin = true;
    capabilities.platform.branding = true;
    capabilities.platform.domains = true;
  }

  return capabilities;
};

export const createTenantSessionRuntimeDescriptor = (
  input: TenantRuntimeDescriptorInput,
): SessionRuntimeDescriptor | null => {
  if (!input.tenantId || !input.tenantSlug || !input.tenantName) {
    return null;
  }

  if (typeof input.whiteLabelCapability !== 'boolean') {
    return null;
  }

  const tenantCategory = normalizeTenantCategory(input.tenantCategory);
  if (!tenantCategory) {
    return null;
  }

  const operatingMode = resolveOperatingMode(tenantCategory, input.whiteLabelCapability);
  if (!operatingMode) {
    return null;
  }

  const runtimeOverlays: RuntimeOverlay[] = hasWlAdminOverlay(
    input.whiteLabelCapability,
    input.authenticatedRole,
  )
    ? ['WL_ADMIN']
    : [];

  return {
    realm: 'TENANT',
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    tenantName: input.tenantName,
    authenticatedRole: input.authenticatedRole,
    commercialPlan: input.commercialPlan ? normalizeCommercialPlan(input.commercialPlan) : null,
    tenantCategory,
    whiteLabelCapability: input.whiteLabelCapability,
    operatingMode,
    runtimeOverlays,
    capabilities: resolveCapabilities(operatingMode, runtimeOverlays),
    routeManifestKey: resolveRouteManifestKey(operatingMode, runtimeOverlays),
  };
};

export const createControlPlaneSessionRuntimeDescriptor = (
  input: ControlPlaneRuntimeDescriptorInput,
): SessionRuntimeDescriptor | null => {
  if (!input.actorId && !input.actorEmail && !input.authenticatedRole) {
    return null;
  }

  const runtimeOverlays: RuntimeOverlay[] = [];
  const operatingMode: TenantOperatingMode = 'CONTROL_PLANE';

  return {
    realm: 'CONTROL_PLANE',
    tenantId: null,
    tenantSlug: null,
    tenantName: null,
    authenticatedRole: input.authenticatedRole,
    commercialPlan: null,
    tenantCategory: null,
    whiteLabelCapability: false,
    operatingMode,
    runtimeOverlays,
    capabilities: resolveCapabilities(operatingMode, runtimeOverlays),
    routeManifestKey: resolveRouteManifestKey(operatingMode, runtimeOverlays),
  };
};

export const resolveRuntimeAppStateFromDescriptor = (
  descriptor: SessionRuntimeDescriptor | null,
): RuntimeAppState | null => {
  if (!descriptor?.operatingMode || !descriptor.routeManifestKey) {
    return null;
  }

  if (descriptor.realm === 'CONTROL_PLANE') {
    return 'CONTROL_PLANE';
  }

  if (descriptor.runtimeOverlays.includes('WL_ADMIN')) {
    return 'WL_ADMIN';
  }

  return 'EXPERIENCE';
};

export const resolveRuntimeContentFamilyFromDescriptor = (
  descriptor: SessionRuntimeDescriptor | null,
  runtimeShellState: RuntimeShellState,
): RouteManifestKey | null => {
  if (!descriptor?.operatingMode || !descriptor.routeManifestKey) {
    return null;
  }

  if (descriptor.realm === 'CONTROL_PLANE') {
    return runtimeShellState === 'CONTROL_PLANE' ? 'control_plane' : null;
  }

  if (runtimeShellState === 'WL_ADMIN') {
    return descriptor.runtimeOverlays.includes('WL_ADMIN') ? 'wl_admin' : null;
  }

  switch (descriptor.operatingMode) {
    case 'AGGREGATOR_WORKSPACE':
      return 'aggregator_workspace';
    case 'B2B_WORKSPACE':
      return 'b2b_workspace';
    case 'B2C_STOREFRONT':
      return 'b2c_storefront';
    case 'WL_STOREFRONT':
      return 'wl_storefront';
    default:
      return null;
  }
};

export const resolveRuntimeShellFamilyFromDescriptor = (
  descriptor: SessionRuntimeDescriptor | null,
  runtimeShellState: RuntimeShellState,
): RuntimeShellFamily | null => {
  if (!descriptor?.operatingMode || !descriptor.routeManifestKey) {
    return null;
  }

  if (descriptor.realm === 'CONTROL_PLANE') {
    return runtimeShellState === 'CONTROL_PLANE' ? 'SuperAdminShell' : null;
  }

  if (runtimeShellState === 'WL_ADMIN') {
    return descriptor.runtimeOverlays.includes('WL_ADMIN') ? 'WhiteLabelAdminShell' : null;
  }

  switch (descriptor.operatingMode) {
    case 'AGGREGATOR_WORKSPACE':
      return 'AggregatorShell';
    case 'B2B_WORKSPACE':
      return 'B2BShell';
    case 'B2C_STOREFRONT':
      return 'B2CShell';
    case 'WL_STOREFRONT':
      return 'WhiteLabelShell';
    default:
      return null;
  }
};