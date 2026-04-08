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

export interface RuntimeManifestEntry {
  key: RouteManifestKey;
  baseOperatingMode: TenantOperatingMode;
  requiredOverlays: RuntimeOverlay[];
  overlayDriven: boolean;
  shellFamily: RuntimeShellFamily;
  defaultAppState: RuntimeAppState;
}

export type RouteGroupKey =
  | 'home_landing'
  | 'catalog_browse'
  | 'cart_commerce'
  | 'rfq_sourcing'
  | 'orders_operations'
  | 'operational_workspace'
  | 'admin_branding_domains'
  | 'control_plane_operations';

export interface RuntimeRouteGroupSelection {
  manifestKey: RouteManifestKey;
  routeGroupKey: RouteGroupKey;
  viewKey: string | null;
}

export interface RuntimeRouteGroupSelectionInput {
  expView?: string | null;
  adminView?: string | null;
  wlAdminView?: string | null;
  wlAdminInviting?: boolean;
  showCart?: boolean;
  selectedTenantId?: string | null;
}

export type RuntimeShellState = RuntimeAppState | 'TEAM_MGMT' | 'INVITE_MEMBER' | 'SETTINGS' | null | undefined;

const WL_ADMIN_ROLES = new Set(['TENANT_OWNER', 'TENANT_ADMIN', 'OWNER', 'ADMIN']);
const OPERATIONAL_WORKSPACE_EXP_VIEWS = new Set([
  'DPP',
  'ESCROW',
  'ESCALATIONS',
  'SETTLEMENT',
  'CERTIFICATIONS',
  'TRACEABILITY',
  'AUDIT_LOGS',
  'TRADES',
]);
const RFQ_SOURCING_EXP_VIEWS = new Set(['RFQS', 'SUPPLIER_RFQ_INBOX']);
const WL_ADMIN_CATALOG_VIEWS = new Set(['PRODUCTS', 'COLLECTIONS']);
const WL_ADMIN_BRANDING_VIEWS = new Set(['BRANDING', 'STAFF', 'DOMAINS']);

const RUNTIME_MANIFEST_ENTRIES: Record<RouteManifestKey, RuntimeManifestEntry> = {
  control_plane: {
    key: 'control_plane',
    baseOperatingMode: 'CONTROL_PLANE',
    requiredOverlays: [],
    overlayDriven: false,
    shellFamily: 'SuperAdminShell',
    defaultAppState: 'CONTROL_PLANE',
  },
  aggregator_workspace: {
    key: 'aggregator_workspace',
    baseOperatingMode: 'AGGREGATOR_WORKSPACE',
    requiredOverlays: [],
    overlayDriven: false,
    shellFamily: 'AggregatorShell',
    defaultAppState: 'EXPERIENCE',
  },
  b2b_workspace: {
    key: 'b2b_workspace',
    baseOperatingMode: 'B2B_WORKSPACE',
    requiredOverlays: [],
    overlayDriven: false,
    shellFamily: 'B2BShell',
    defaultAppState: 'EXPERIENCE',
  },
  b2c_storefront: {
    key: 'b2c_storefront',
    baseOperatingMode: 'B2C_STOREFRONT',
    requiredOverlays: [],
    overlayDriven: false,
    shellFamily: 'B2CShell',
    defaultAppState: 'EXPERIENCE',
  },
  wl_storefront: {
    key: 'wl_storefront',
    baseOperatingMode: 'WL_STOREFRONT',
    requiredOverlays: [],
    overlayDriven: false,
    shellFamily: 'WhiteLabelShell',
    defaultAppState: 'EXPERIENCE',
  },
  wl_admin: {
    key: 'wl_admin',
    baseOperatingMode: 'WL_STOREFRONT',
    requiredOverlays: ['WL_ADMIN'],
    overlayDriven: true,
    shellFamily: 'WhiteLabelAdminShell',
    defaultAppState: 'WL_ADMIN',
  },
};

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

const getRuntimeManifestEntryByKey = (manifestKey: RouteManifestKey | null): RuntimeManifestEntry | null => {
  if (!manifestKey) {
    return null;
  }

  return RUNTIME_MANIFEST_ENTRIES[manifestKey] ?? null;
};

const canSelectRuntimeManifestEntry = (
  descriptor: SessionRuntimeDescriptor | null,
  entry: RuntimeManifestEntry | null,
) => {
  if (!descriptor?.operatingMode || !entry) {
    return false;
  }

  if (descriptor.operatingMode !== entry.baseOperatingMode) {
    return false;
  }

  return entry.requiredOverlays.every(overlay => descriptor.runtimeOverlays.includes(overlay));
};

const isTenantWorkspaceRuntimeState = (runtimeShellState: RuntimeShellState) => {
  switch (runtimeShellState) {
    case 'EXPERIENCE':
    case 'TEAM_MGMT':
    case 'INVITE_MEMBER':
    case 'SETTINGS':
      return true;
    default:
      return false;
  }
};

const createRouteGroupSelection = (
  manifestKey: RouteManifestKey,
  routeGroupKey: RouteGroupKey,
  viewKey: string | null,
): RuntimeRouteGroupSelection => ({
  manifestKey,
  routeGroupKey,
  viewKey,
});

const resolveStorefrontRouteGroup = (
  manifestKey: 'b2c_storefront' | 'wl_storefront',
  expView: string,
  showCart: boolean,
) => {
  if (showCart && expView === 'HOME') {
    return createRouteGroupSelection(manifestKey, 'cart_commerce', 'CART');
  }

  if (expView === 'ORDERS') {
    return createRouteGroupSelection(manifestKey, 'orders_operations', expView);
  }

  if (RFQ_SOURCING_EXP_VIEWS.has(expView)) {
    return createRouteGroupSelection(manifestKey, 'rfq_sourcing', expView);
  }

  if (OPERATIONAL_WORKSPACE_EXP_VIEWS.has(expView)) {
    return createRouteGroupSelection(manifestKey, 'operational_workspace', expView);
  }

  return createRouteGroupSelection(manifestKey, 'home_landing', expView);
};

const resolveWorkspaceRouteGroupSelection = (
  entry: RuntimeManifestEntry,
  input: RuntimeRouteGroupSelectionInput,
): RuntimeRouteGroupSelection | null => {
  const expView = input.expView ?? 'HOME';

  switch (entry.key) {
    case 'aggregator_workspace':
      if (expView === 'ORDERS') {
        return createRouteGroupSelection(entry.key, 'orders_operations', expView);
      }

      if (RFQ_SOURCING_EXP_VIEWS.has(expView)) {
        return createRouteGroupSelection(entry.key, 'rfq_sourcing', expView);
      }

      if (OPERATIONAL_WORKSPACE_EXP_VIEWS.has(expView)) {
        return createRouteGroupSelection(entry.key, 'operational_workspace', expView);
      }

      return createRouteGroupSelection(entry.key, 'home_landing', expView);
    case 'b2b_workspace':
      if (expView === 'ORDERS') {
        return createRouteGroupSelection(entry.key, 'orders_operations', expView);
      }

      if (RFQ_SOURCING_EXP_VIEWS.has(expView)) {
        return createRouteGroupSelection(entry.key, 'rfq_sourcing', expView);
      }

      if (OPERATIONAL_WORKSPACE_EXP_VIEWS.has(expView)) {
        return createRouteGroupSelection(entry.key, 'operational_workspace', expView);
      }

      return createRouteGroupSelection(entry.key, 'catalog_browse', expView);
    case 'b2c_storefront':
      return resolveStorefrontRouteGroup(entry.key, expView, input.showCart === true);
    case 'wl_storefront':
      return resolveStorefrontRouteGroup(entry.key, expView, input.showCart === true);
    default:
      return null;
  }
};

const resolveWlAdminRouteGroupSelection = (
  entry: RuntimeManifestEntry,
  input: RuntimeRouteGroupSelectionInput,
): RuntimeRouteGroupSelection | null => {
  const wlAdminView = input.wlAdminView ?? 'BRANDING';

  if (input.wlAdminInviting === true) {
    return createRouteGroupSelection(entry.key, 'admin_branding_domains', 'STAFF');
  }

  if (wlAdminView === 'ORDERS') {
    return createRouteGroupSelection(entry.key, 'orders_operations', wlAdminView);
  }

  if (WL_ADMIN_CATALOG_VIEWS.has(wlAdminView)) {
    return createRouteGroupSelection(entry.key, 'catalog_browse', wlAdminView);
  }

  if (WL_ADMIN_BRANDING_VIEWS.has(wlAdminView)) {
    return createRouteGroupSelection(entry.key, 'admin_branding_domains', wlAdminView);
  }

  return null;
};

const resolveControlPlaneRouteGroupSelection = (
  entry: RuntimeManifestEntry,
  input: RuntimeRouteGroupSelectionInput,
) => {
  const viewKey = input.selectedTenantId ? 'TENANT_DETAIL' : input.adminView ?? 'TENANTS';
  return createRouteGroupSelection(entry.key, 'control_plane_operations', viewKey);
};

const resolveTenantWorkspaceManifestKey = (
  descriptor: SessionRuntimeDescriptor,
): RouteManifestKey | null => {
  switch (descriptor.operatingMode) {
    case 'AGGREGATOR_WORKSPACE':
      return descriptor.routeManifestKey === 'aggregator_workspace' ? descriptor.routeManifestKey : null;
    case 'B2B_WORKSPACE':
      return descriptor.routeManifestKey === 'b2b_workspace' ? descriptor.routeManifestKey : null;
    case 'B2C_STOREFRONT':
      return descriptor.routeManifestKey === 'b2c_storefront' ? descriptor.routeManifestKey : null;
    case 'WL_STOREFRONT':
      return descriptor.routeManifestKey === 'wl_storefront' || descriptor.routeManifestKey === 'wl_admin'
        ? 'wl_storefront'
        : null;
    default:
      return null;
  }
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
  const entry = getRuntimeManifestEntryByKey(descriptor?.routeManifestKey ?? null);
  if (!entry || !canSelectRuntimeManifestEntry(descriptor, entry)) {
    return null;
  }

  return entry.defaultAppState;
};

export const resolveRuntimeManifestKeyFromDescriptor = (
  descriptor: SessionRuntimeDescriptor | null,
  runtimeShellState: RuntimeShellState,
): RouteManifestKey | null => {
  if (!descriptor?.operatingMode || !descriptor.routeManifestKey) {
    return null;
  }

  if (descriptor.realm === 'CONTROL_PLANE') {
    return runtimeShellState === 'CONTROL_PLANE' && descriptor.routeManifestKey === 'control_plane'
      ? descriptor.routeManifestKey
      : null;
  }

  if (runtimeShellState === 'WL_ADMIN') {
    return descriptor.routeManifestKey === 'wl_admin' && descriptor.runtimeOverlays.includes('WL_ADMIN')
      ? 'wl_admin'
      : null;
  }

  if (!isTenantWorkspaceRuntimeState(runtimeShellState)) {
    return null;
  }

  return resolveTenantWorkspaceManifestKey(descriptor);
};

export const resolveRuntimeManifestEntryFromDescriptor = (
  descriptor: SessionRuntimeDescriptor | null,
  runtimeShellState: RuntimeShellState,
): RuntimeManifestEntry | null => {
  const manifestKey = resolveRuntimeManifestKeyFromDescriptor(descriptor, runtimeShellState);
  const entry = getRuntimeManifestEntryByKey(manifestKey);

  return canSelectRuntimeManifestEntry(descriptor, entry) ? entry : null;
};

export const resolveRuntimeRouteGroupSelection = (
  manifestEntry: RuntimeManifestEntry | null,
  input: RuntimeRouteGroupSelectionInput,
): RuntimeRouteGroupSelection | null => {
  if (!manifestEntry) {
    return null;
  }

  switch (manifestEntry.key) {
    case 'control_plane':
      return resolveControlPlaneRouteGroupSelection(manifestEntry, input);
    case 'wl_admin':
      return resolveWlAdminRouteGroupSelection(manifestEntry, input);
    case 'aggregator_workspace':
    case 'b2b_workspace':
    case 'b2c_storefront':
    case 'wl_storefront':
      return resolveWorkspaceRouteGroupSelection(manifestEntry, input);
    default:
      return null;
  }
};

export const resolveRuntimeContentFamilyFromDescriptor = (
  descriptor: SessionRuntimeDescriptor | null,
  runtimeShellState: RuntimeShellState,
): RouteManifestKey | null => {
  return resolveRuntimeManifestEntryFromDescriptor(descriptor, runtimeShellState)?.key ?? null;
};

export const resolveRuntimeShellFamilyFromDescriptor = (
  descriptor: SessionRuntimeDescriptor | null,
  runtimeShellState: RuntimeShellState,
): RuntimeShellFamily | null => {
  return resolveRuntimeManifestEntryFromDescriptor(descriptor, runtimeShellState)?.shellFamily ?? null;
};