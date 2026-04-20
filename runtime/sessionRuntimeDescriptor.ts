import { normalizeCommercialPlan, type CommercialPlan } from '../types';

export type TenantCategory = 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL';

export type RuntimeBaseCategory = 'B2B' | 'B2C' | 'INTERNAL';

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
  identity: SessionRuntimeIdentity;
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
  baseFamily?: string | null;
  aggregatorCapability?: boolean | null;
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

export interface SessionRuntimeIdentity {
  baseCategory: RuntimeBaseCategory | null;
  aggregatorCapability: boolean;
  whiteLabelCapability: boolean;
  commercialPlan: CommercialPlan | null;
}

export type RuntimeAppState = 'CONTROL_PLANE' | 'EXPERIENCE' | 'WL_ADMIN';

export type RuntimeShellFamily =
  | 'SuperAdminShell'
  | 'AggregatorShell'
  | 'B2BShell'
  | 'B2CShell'
  | 'WhiteLabelShell'
  | 'WhiteLabelAdminShell';

export type RouteGroupClassification = 'family-core' | 'feature-gated' | 'platform-gated' | 'overlay-only';

export type RouteGroupKey =
  | 'home_landing'
  | 'catalog_browse'
  | 'cart_commerce'
  | 'rfq_sourcing'
  | 'orders_operations'
  | 'operational_workspace'
  | 'admin_branding_domains'
  | 'control_plane_operations';

export type RuntimeLocalRouteKey =
  | 'home'
  | 'catalog'
  | 'cart'
  | 'orders'
  | 'buyer_rfqs'
  | 'supplier_rfq_inbox'
  | 'dpp'
  | 'escrow'
  | 'escalations'
  | 'settlement'
  | 'certifications'
  | 'traceability'
  | 'audit_logs'
  | 'trades'
  | 'branding'
  | 'staff'
  | 'staff_invite'
  | 'products'
  | 'collections'
  | 'domains'
  | 'tenant_registry'
  | 'tenant_registry_invited'
  | 'tenant_registry_closed'
  | 'tenant_detail'
  | 'tenant_detail_invited'
  | 'tenant_detail_closed'
  | 'flags'
  | 'finance'
  | 'compliance'
  | 'cases'
  | 'ai'
  | 'health'
  | 'cart_summaries'
  | 'escrow_admin'
  | 'settlement_admin'
  | 'maker_checker'
  | 'logs'
  | 'rbac'
  | 'events';

export interface RuntimeLocalRouteStateBinding {
  expView?: string;
  adminView?: string;
  wlAdminView?: string;
  showCart?: boolean;
  wlAdminInviting?: boolean;
  requiresSelectedTenant?: boolean;
}

export interface RuntimeLocalRouteDefinition {
  key: RuntimeLocalRouteKey;
  title: string;
  selectionKey: string;
  stateBinding: RuntimeLocalRouteStateBinding;
  defaultForGroup?: boolean;
}

export interface RuntimeRouteGroupDefinition {
  key: RouteGroupKey;
  classification: RouteGroupClassification;
  routes: RuntimeLocalRouteDefinition[];
}

export interface RuntimeManifestEntry {
  key: RouteManifestKey;
  baseOperatingMode: TenantOperatingMode;
  requiredOverlays: RuntimeOverlay[];
  overlayDriven: boolean;
  shellFamily: RuntimeShellFamily;
  defaultAppState: RuntimeAppState;
  defaultLocalRouteKey: RuntimeLocalRouteKey;
  allowedRouteGroups: RouteGroupKey[];
  routeGroups: RuntimeRouteGroupDefinition[];
  shellNavigation: RuntimeShellNavigationConfig | null;
}

export interface RuntimeRouteGroupSelection {
  manifestKey: RouteManifestKey;
  routeGroupKey: RouteGroupKey;
  viewKey: string | null;
}

export interface RuntimeLocalRouteRegistration {
  manifestKey: RouteManifestKey;
  routeGroupKey: RouteGroupKey;
  route: RuntimeLocalRouteDefinition;
}

export interface RuntimeLocalRouteSelection extends RuntimeRouteGroupSelection {
  routeKey: RuntimeLocalRouteKey;
  route: RuntimeLocalRouteDefinition;
}

export type RuntimeShellNavigationBindingField = 'expView' | 'adminView' | 'wlAdminView';

export interface RuntimeShellNavigationConfig {
  routeKeys: RuntimeLocalRouteKey[];
  bindingField?: RuntimeShellNavigationBindingField;
}

export interface RuntimeShellNavigationItem {
  routeKey: RuntimeLocalRouteKey;
  navigationKey: string;
  routeGroupKey: RouteGroupKey;
  active: boolean;
}

export interface RuntimeShellNavigationSurface {
  activeRouteKey: RuntimeLocalRouteKey | null;
  activeNavigationKey: string | null;
  defaultRouteKey: RuntimeLocalRouteKey | null;
  items: RuntimeShellNavigationItem[];
}

export interface RuntimeFamilyEntryHandoff {
  manifestKey: RouteManifestKey;
  contentFamily: RouteManifestKey;
  identity: SessionRuntimeIdentity;
  manifestEntry: RuntimeManifestEntry;
  shellFamily: RuntimeShellFamily;
  defaultLocalRouteKey: RuntimeLocalRouteKey;
  localRouteSelection: RuntimeLocalRouteSelection | null;
  navigationSurface: RuntimeShellNavigationSurface | null;
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

interface ResolvedTenantRuntimeAuthority {
  tenantCategory: TenantCategory;
  baseCategory: RuntimeBaseCategory | null;
  aggregatorCapability: boolean;
  whiteLabelCapability: boolean;
  commercialPlan: CommercialPlan | null;
}

const WL_ADMIN_ROLES = new Set(['TENANT_OWNER', 'TENANT_ADMIN', 'OWNER', 'ADMIN']);
const ROUTE_GROUP_CLASSIFICATIONS: Record<RouteGroupKey, RouteGroupClassification> = {
  home_landing: 'family-core',
  catalog_browse: 'family-core',
  cart_commerce: 'feature-gated',
  rfq_sourcing: 'feature-gated',
  orders_operations: 'feature-gated',
  operational_workspace: 'feature-gated',
  admin_branding_domains: 'overlay-only',
  control_plane_operations: 'family-core',
};

const defineRuntimeRoute = (
  key: RuntimeLocalRouteKey,
  title: string,
  selectionKey: string,
  stateBinding: RuntimeLocalRouteStateBinding,
  options: { defaultForGroup?: boolean } = {},
): RuntimeLocalRouteDefinition => ({
  key,
  title,
  selectionKey,
  stateBinding,
  ...options,
});

const defineRuntimeRouteGroup = (
  key: RouteGroupKey,
  routes: RuntimeLocalRouteDefinition[],
): RuntimeRouteGroupDefinition => ({
  key,
  classification: ROUTE_GROUP_CLASSIFICATIONS[key],
  routes,
});

const CONTROL_PLANE_ROUTE_GROUP = defineRuntimeRouteGroup('control_plane_operations', [
  defineRuntimeRoute('tenant_detail', 'Tenant Detail', 'TENANT_DETAIL', {
    adminView: 'TENANTS',
    requiresSelectedTenant: true,
  }),
  defineRuntimeRoute('tenant_registry', 'Active Tenants', 'TENANTS', {
    adminView: 'TENANTS',
    requiresSelectedTenant: false,
  }, { defaultForGroup: true }),
  defineRuntimeRoute('tenant_detail_invited', 'Tenant Detail', 'TENANT_DETAIL', {
    adminView: 'TENANTS_INVITED',
    requiresSelectedTenant: true,
  }),
  defineRuntimeRoute('tenant_registry_invited', 'Invited Tenants', 'TENANTS_INVITED', {
    adminView: 'TENANTS_INVITED',
    requiresSelectedTenant: false,
  }),
  defineRuntimeRoute('tenant_detail_closed', 'Tenant Detail', 'TENANT_DETAIL', {
    adminView: 'TENANTS_CLOSED',
    requiresSelectedTenant: true,
  }),
  defineRuntimeRoute('tenant_registry_closed', 'Closed Tenants', 'TENANTS_CLOSED', {
    adminView: 'TENANTS_CLOSED',
    requiresSelectedTenant: false,
  }),
  defineRuntimeRoute('flags', 'Feature Flags', 'FLAGS', { adminView: 'FLAGS' }),
  defineRuntimeRoute('finance', 'Finance & Fees', 'FINANCE', { adminView: 'FINANCE' }),
  defineRuntimeRoute('trades', 'Trade Oversight', 'TRADES', { adminView: 'TRADES' }),
  defineRuntimeRoute('cart_summaries', 'Cart Summaries', 'CART_SUMMARIES', { adminView: 'CART_SUMMARIES' }),
  defineRuntimeRoute('escrow_admin', 'Escrow Accounts', 'ESCROW_ADMIN', { adminView: 'ESCROW_ADMIN' }),
  defineRuntimeRoute('settlement_admin', 'Settlement Admin', 'SETTLEMENT_ADMIN', { adminView: 'SETTLEMENT_ADMIN' }),
  defineRuntimeRoute('compliance', 'Compliance Queue', 'COMPLIANCE', { adminView: 'COMPLIANCE' }),
  defineRuntimeRoute('cases', 'Disputes', 'CASES', { adminView: 'CASES' }),
  defineRuntimeRoute('escalations', 'Escalations', 'ESCALATIONS', { adminView: 'ESCALATIONS' }),
  defineRuntimeRoute('certifications', 'Cert Lifecycle', 'CERTIFICATIONS', { adminView: 'CERTIFICATIONS' }),
  defineRuntimeRoute('traceability', 'Traceability', 'TRACEABILITY', { adminView: 'TRACEABILITY' }),
  defineRuntimeRoute('maker_checker', 'Maker-Checker', 'MAKER_CHECKER', { adminView: 'MAKER_CHECKER' }),
  defineRuntimeRoute('ai', 'AI Governance', 'AI', { adminView: 'AI' }),
  defineRuntimeRoute('events', 'Live Event Stream', 'EVENTS', { adminView: 'EVENTS' }),
  defineRuntimeRoute('logs', 'Audit Logs', 'LOGS', { adminView: 'LOGS' }),
  defineRuntimeRoute('rbac', 'Access Control', 'RBAC', { adminView: 'RBAC' }),
  defineRuntimeRoute('health', 'Health Status', 'HEALTH', { adminView: 'HEALTH' }),
]);

const WORKSPACE_ORDERS_ROUTE_GROUP = defineRuntimeRouteGroup('orders_operations', [
  defineRuntimeRoute('orders', 'Orders', 'ORDERS', { expView: 'ORDERS' }, { defaultForGroup: true }),
]);

const RFQ_ROUTE_GROUP = defineRuntimeRouteGroup('rfq_sourcing', [
  defineRuntimeRoute('buyer_rfqs', 'Buyer RFQs', 'RFQS', { expView: 'RFQS' }, { defaultForGroup: true }),
  defineRuntimeRoute('supplier_rfq_inbox', 'Supplier RFQ Inbox', 'SUPPLIER_RFQ_INBOX', { expView: 'SUPPLIER_RFQ_INBOX' }),
]);

const OPERATIONAL_WORKSPACE_ROUTE_GROUP = defineRuntimeRouteGroup('operational_workspace', [
  defineRuntimeRoute('dpp', 'DPP Passport', 'DPP', { expView: 'DPP' }),
  defineRuntimeRoute('escrow', 'Escrow', 'ESCROW', { expView: 'ESCROW' }),
  defineRuntimeRoute('escalations', 'Escalations', 'ESCALATIONS', { expView: 'ESCALATIONS' }),
  defineRuntimeRoute('settlement', 'Settlement', 'SETTLEMENT', { expView: 'SETTLEMENT' }),
  defineRuntimeRoute('certifications', 'Certifications', 'CERTIFICATIONS', { expView: 'CERTIFICATIONS' }),
  defineRuntimeRoute('traceability', 'Traceability', 'TRACEABILITY', { expView: 'TRACEABILITY' }),
  defineRuntimeRoute('audit_logs', 'Audit Logs', 'AUDIT_LOGS', { expView: 'AUDIT_LOGS' }),
  defineRuntimeRoute('trades', 'Trades', 'TRADES', { expView: 'TRADES' }),
]);

const WL_ADMIN_MANAGEMENT_ROUTE_GROUP = defineRuntimeRouteGroup('admin_branding_domains', [
  defineRuntimeRoute('branding', 'Store Profile', 'BRANDING', { wlAdminView: 'BRANDING' }, { defaultForGroup: true }),
  defineRuntimeRoute('staff_invite', 'Invite Staff', 'STAFF_INVITE', {
    wlAdminView: 'STAFF',
    wlAdminInviting: true,
  }),
  defineRuntimeRoute('staff', 'Staff', 'STAFF', {
    wlAdminView: 'STAFF',
    wlAdminInviting: false,
  }),
  defineRuntimeRoute('domains', 'Domains', 'DOMAINS', { wlAdminView: 'DOMAINS' }),
]);

const WL_ADMIN_CATALOG_ROUTE_GROUP = defineRuntimeRouteGroup('catalog_browse', [
  defineRuntimeRoute('products', 'Products', 'PRODUCTS', { wlAdminView: 'PRODUCTS' }, { defaultForGroup: true }),
  defineRuntimeRoute('collections', 'Collections', 'COLLECTIONS', { wlAdminView: 'COLLECTIONS' }),
]);

const WL_ADMIN_ORDERS_ROUTE_GROUP = defineRuntimeRouteGroup('orders_operations', [
  defineRuntimeRoute('orders', 'Orders', 'ORDERS', { wlAdminView: 'ORDERS' }, { defaultForGroup: true }),
]);

const AGGREGATOR_SHELL_ROUTE_KEYS: RuntimeLocalRouteKey[] = [
  'home',
  'orders',
  'dpp',
  'escrow',
  'escalations',
  'settlement',
  'certifications',
  'traceability',
  'audit_logs',
  'trades',
];

const B2B_SHELL_ROUTE_KEYS: RuntimeLocalRouteKey[] = [
  'catalog',
  'orders',
  'dpp',
  'escrow',
  'escalations',
  'settlement',
  'certifications',
  'traceability',
  'audit_logs',
  'trades',
];

const B2C_SHELL_ROUTE_KEYS: RuntimeLocalRouteKey[] = [
  'home',
  'orders',
  'dpp',
  'escrow',
  'escalations',
  'settlement',
  'certifications',
  'traceability',
  'audit_logs',
  'trades',
  'cart',
];

const WL_STOREFRONT_SHELL_ROUTE_KEYS: RuntimeLocalRouteKey[] = [
  'home',
  'orders',
  'dpp',
  'escrow',
  'escalations',
  'settlement',
  'certifications',
  'traceability',
  'audit_logs',
  'trades',
];

const WL_ADMIN_SHELL_ROUTE_KEYS: RuntimeLocalRouteKey[] = [
  'branding',
  'staff',
  'products',
  'collections',
  'orders',
  'domains',
];

const CONTROL_PLANE_SHELL_ROUTE_KEYS: RuntimeLocalRouteKey[] = [
  'tenant_registry',
  'tenant_registry_invited',
  'tenant_registry_closed',
  'flags',
  'finance',
  'trades',
  'cart_summaries',
  'escrow_admin',
  'settlement_admin',
  'compliance',
  'cases',
  'escalations',
  'certifications',
  'traceability',
  'maker_checker',
  'ai',
  'events',
  'logs',
  'rbac',
  'health',
];

const RUNTIME_MANIFEST_ENTRIES: Record<RouteManifestKey, RuntimeManifestEntry> = {
  control_plane: {
    key: 'control_plane',
    baseOperatingMode: 'CONTROL_PLANE',
    requiredOverlays: [],
    overlayDriven: false,
    shellFamily: 'SuperAdminShell',
    defaultAppState: 'CONTROL_PLANE',
    defaultLocalRouteKey: 'tenant_registry',
    allowedRouteGroups: ['control_plane_operations'],
    routeGroups: [CONTROL_PLANE_ROUTE_GROUP],
    shellNavigation: {
      routeKeys: CONTROL_PLANE_SHELL_ROUTE_KEYS,
      bindingField: 'adminView',
    },
  },
  aggregator_workspace: {
    key: 'aggregator_workspace',
    baseOperatingMode: 'AGGREGATOR_WORKSPACE',
    requiredOverlays: [],
    overlayDriven: false,
    shellFamily: 'AggregatorShell',
    defaultAppState: 'EXPERIENCE',
    defaultLocalRouteKey: 'home',
    allowedRouteGroups: ['home_landing', 'orders_operations', 'rfq_sourcing', 'operational_workspace'],
    routeGroups: [
      defineRuntimeRouteGroup('home_landing', [
        defineRuntimeRoute('home', 'Workspace Home', 'HOME', { expView: 'HOME' }, { defaultForGroup: true }),
      ]),
      WORKSPACE_ORDERS_ROUTE_GROUP,
      RFQ_ROUTE_GROUP,
      OPERATIONAL_WORKSPACE_ROUTE_GROUP,
    ],
    shellNavigation: {
      routeKeys: AGGREGATOR_SHELL_ROUTE_KEYS,
    },
  },
  b2b_workspace: {
    key: 'b2b_workspace',
    baseOperatingMode: 'B2B_WORKSPACE',
    requiredOverlays: [],
    overlayDriven: false,
    shellFamily: 'B2BShell',
    defaultAppState: 'EXPERIENCE',
    defaultLocalRouteKey: 'catalog',
    allowedRouteGroups: ['catalog_browse', 'orders_operations', 'rfq_sourcing', 'operational_workspace'],
    routeGroups: [
      defineRuntimeRouteGroup('catalog_browse', [
        defineRuntimeRoute('catalog', 'Catalog', 'HOME', { expView: 'HOME' }, { defaultForGroup: true }),
      ]),
      WORKSPACE_ORDERS_ROUTE_GROUP,
      RFQ_ROUTE_GROUP,
      OPERATIONAL_WORKSPACE_ROUTE_GROUP,
    ],
    shellNavigation: {
      routeKeys: B2B_SHELL_ROUTE_KEYS,
    },
  },
  b2c_storefront: {
    key: 'b2c_storefront',
    baseOperatingMode: 'B2C_STOREFRONT',
    requiredOverlays: [],
    overlayDriven: false,
    shellFamily: 'B2CShell',
    defaultAppState: 'EXPERIENCE',
    defaultLocalRouteKey: 'home',
    allowedRouteGroups: ['home_landing', 'cart_commerce', 'orders_operations', 'rfq_sourcing', 'operational_workspace'],
    routeGroups: [
      defineRuntimeRouteGroup('cart_commerce', [
        defineRuntimeRoute('cart', 'Cart Drawer', 'CART', { expView: 'HOME', showCart: true }, { defaultForGroup: true }),
      ]),
      defineRuntimeRouteGroup('home_landing', [
        defineRuntimeRoute('home', 'Storefront Home', 'HOME', { expView: 'HOME', showCart: false }, { defaultForGroup: true }),
      ]),
      WORKSPACE_ORDERS_ROUTE_GROUP,
      RFQ_ROUTE_GROUP,
      OPERATIONAL_WORKSPACE_ROUTE_GROUP,
    ],
    shellNavigation: {
      routeKeys: B2C_SHELL_ROUTE_KEYS,
    },
  },
  wl_storefront: {
    key: 'wl_storefront',
    baseOperatingMode: 'WL_STOREFRONT',
    requiredOverlays: [],
    overlayDriven: false,
    shellFamily: 'WhiteLabelShell',
    defaultAppState: 'EXPERIENCE',
    defaultLocalRouteKey: 'home',
    allowedRouteGroups: ['home_landing', 'cart_commerce', 'orders_operations', 'rfq_sourcing', 'operational_workspace'],
    routeGroups: [
      defineRuntimeRouteGroup('cart_commerce', [
        defineRuntimeRoute('cart', 'Cart Drawer', 'CART', { expView: 'HOME', showCart: true }, { defaultForGroup: true }),
      ]),
      defineRuntimeRouteGroup('home_landing', [
        defineRuntimeRoute('home', 'Storefront Home', 'HOME', { expView: 'HOME', showCart: false }, { defaultForGroup: true }),
      ]),
      WORKSPACE_ORDERS_ROUTE_GROUP,
      RFQ_ROUTE_GROUP,
      OPERATIONAL_WORKSPACE_ROUTE_GROUP,
    ],
    shellNavigation: {
      routeKeys: WL_STOREFRONT_SHELL_ROUTE_KEYS,
    },
  },
  wl_admin: {
    key: 'wl_admin',
    baseOperatingMode: 'WL_STOREFRONT',
    requiredOverlays: ['WL_ADMIN'],
    overlayDriven: true,
    shellFamily: 'WhiteLabelAdminShell',
    defaultAppState: 'WL_ADMIN',
    defaultLocalRouteKey: 'branding',
    allowedRouteGroups: ['admin_branding_domains', 'catalog_browse', 'orders_operations'],
    routeGroups: [
      WL_ADMIN_MANAGEMENT_ROUTE_GROUP,
      WL_ADMIN_CATALOG_ROUTE_GROUP,
      WL_ADMIN_ORDERS_ROUTE_GROUP,
    ],
    shellNavigation: {
      routeKeys: WL_ADMIN_SHELL_ROUTE_KEYS,
      bindingField: 'wlAdminView',
    },
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

const EMPTY_RUNTIME_IDENTITY: SessionRuntimeIdentity = {
  baseCategory: null,
  aggregatorCapability: false,
  whiteLabelCapability: false,
  commercialPlan: null,
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

const normalizeBaseFamily = (baseFamily: string | null | undefined): RuntimeBaseCategory | null => {
  const normalized = baseFamily?.trim().toUpperCase();

  switch (normalized) {
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

const resolveRuntimeBaseCategory = (
  tenantCategory: TenantCategory | null,
): RuntimeBaseCategory | null => {
  switch (tenantCategory) {
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

const resolveTenantCategoryFromAuthority = (
  baseCategory: RuntimeBaseCategory | null,
  aggregatorCapability: boolean,
): TenantCategory | null => {
  if (aggregatorCapability) {
    return 'AGGREGATOR';
  }

  return baseCategory;
};

const resolveTenantRuntimeAuthority = (
  input: TenantRuntimeDescriptorInput,
): ResolvedTenantRuntimeAuthority | null => {
  if (typeof input.whiteLabelCapability !== 'boolean') {
    return null;
  }

  const compatTenantCategory = normalizeTenantCategory(input.tenantCategory);
  const baseCategory = normalizeBaseFamily(input.baseFamily)
    ?? resolveRuntimeBaseCategory(compatTenantCategory);
  const aggregatorCapability = typeof input.aggregatorCapability === 'boolean'
    ? input.aggregatorCapability
    : compatTenantCategory === 'AGGREGATOR';
  const tenantCategory = resolveTenantCategoryFromAuthority(baseCategory, aggregatorCapability);

  if (!tenantCategory) {
    return null;
  }

  return {
    tenantCategory,
    baseCategory,
    aggregatorCapability,
    whiteLabelCapability: input.whiteLabelCapability,
    commercialPlan: input.commercialPlan ? normalizeCommercialPlan(input.commercialPlan) : null,
  };
};

const resolveRuntimeIdentity = ({
  baseCategory,
  aggregatorCapability,
  whiteLabelCapability,
  commercialPlan,
}: {
  baseCategory: RuntimeBaseCategory | null;
  aggregatorCapability: boolean;
  whiteLabelCapability: boolean;
  commercialPlan: CommercialPlan | null;
}): SessionRuntimeIdentity => ({
  baseCategory,
  aggregatorCapability,
  whiteLabelCapability,
  commercialPlan,
});

const resolveOperatingMode = (
  baseCategory: RuntimeBaseCategory | null,
  aggregatorCapability: boolean,
  whiteLabelCapability: boolean,
): TenantOperatingMode | null => {
  if (aggregatorCapability || baseCategory === 'INTERNAL') {
    return 'AGGREGATOR_WORKSPACE';
  }

  switch (baseCategory) {
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

type NormalizedRuntimeRouteInput = {
  expView: string | null;
  adminView: string | null;
  wlAdminView: string | null;
  showCart: boolean;
  wlAdminInviting: boolean;
  selectedTenantId: string | null;
};

const listRuntimeLocalRouteRegistrations = (
  manifestEntry: RuntimeManifestEntry,
): RuntimeLocalRouteRegistration[] => {
  return manifestEntry.routeGroups.flatMap(group => {
    return group.routes.map(route => ({
      manifestKey: manifestEntry.key,
      routeGroupKey: group.key,
      route,
    }));
  });
};

const normalizeRuntimeRouteInput = (
  manifestEntry: RuntimeManifestEntry,
  input: RuntimeRouteGroupSelectionInput,
): NormalizedRuntimeRouteInput => {
  switch (manifestEntry.key) {
    case 'control_plane':
      return {
        expView: null,
        adminView: input.adminView ?? 'TENANTS',
        wlAdminView: null,
        showCart: false,
        wlAdminInviting: false,
        selectedTenantId: input.selectedTenantId ?? null,
      };
    case 'wl_admin':
      return {
        expView: null,
        adminView: null,
        wlAdminView: input.wlAdminView ?? 'BRANDING',
        showCart: false,
        wlAdminInviting: input.wlAdminInviting === true,
        selectedTenantId: null,
      };
    case 'b2c_storefront':
    case 'wl_storefront': {
      const expView = input.expView ?? 'HOME';

      return {
        expView,
        adminView: null,
        wlAdminView: null,
        showCart: input.showCart === true && expView === 'HOME',
        wlAdminInviting: false,
        selectedTenantId: null,
      };
    }
    default:
      return {
        expView: input.expView ?? 'HOME',
        adminView: null,
        wlAdminView: null,
        showCart: false,
        wlAdminInviting: false,
        selectedTenantId: null,
      };
  }
};

const matchesRuntimeLocalRouteBinding = (
  binding: RuntimeLocalRouteStateBinding,
  input: NormalizedRuntimeRouteInput,
) => {
  if (binding.expView !== undefined && binding.expView !== input.expView) {
    return false;
  }

  if (binding.adminView !== undefined && binding.adminView !== input.adminView) {
    return false;
  }

  if (binding.wlAdminView !== undefined && binding.wlAdminView !== input.wlAdminView) {
    return false;
  }

  if (binding.showCart !== undefined && binding.showCart !== input.showCart) {
    return false;
  }

  if (binding.wlAdminInviting !== undefined && binding.wlAdminInviting !== input.wlAdminInviting) {
    return false;
  }

  if (binding.requiresSelectedTenant !== undefined) {
    const hasSelectedTenant = !!input.selectedTenantId;

    if (binding.requiresSelectedTenant !== hasSelectedTenant) {
      return false;
    }
  }

  return true;
};

const resolveRuntimeNavigationKey = (
  route: RuntimeLocalRouteDefinition,
  bindingField?: RuntimeShellNavigationBindingField,
) => {
  if (!bindingField) {
    return route.selectionKey;
  }

  return route.stateBinding[bindingField] ?? route.selectionKey;
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

  const authority = resolveTenantRuntimeAuthority(input);
  if (!authority) {
    return null;
  }

  const operatingMode = resolveOperatingMode(
    authority.baseCategory,
    authority.aggregatorCapability,
    authority.whiteLabelCapability,
  );
  if (!operatingMode) {
    return null;
  }

  const identity = resolveRuntimeIdentity({
    baseCategory: authority.baseCategory,
    aggregatorCapability: authority.aggregatorCapability,
    whiteLabelCapability: authority.whiteLabelCapability,
    commercialPlan: authority.commercialPlan,
  });

  const runtimeOverlays: RuntimeOverlay[] = operatingMode === 'WL_STOREFRONT' && hasWlAdminOverlay(
    authority.whiteLabelCapability,
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
    identity,
    commercialPlan: authority.commercialPlan,
    tenantCategory: authority.tenantCategory,
    whiteLabelCapability: authority.whiteLabelCapability,
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
    identity: EMPTY_RUNTIME_IDENTITY,
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

export const getRuntimeLocalRouteRegistration = (
  manifestEntry: RuntimeManifestEntry | null,
  routeKey: RuntimeLocalRouteKey,
): RuntimeLocalRouteRegistration | null => {
  if (!manifestEntry) {
    return null;
  }

  return listRuntimeLocalRouteRegistrations(manifestEntry).find(registration => {
    return registration.route.key === routeKey;
  }) ?? null;
};

export const resolveRuntimeLocalRouteSelection = (
  manifestEntry: RuntimeManifestEntry | null,
  input: RuntimeRouteGroupSelectionInput,
): RuntimeLocalRouteSelection | null => {
  if (!manifestEntry) {
    return null;
  }

  const normalizedInput = normalizeRuntimeRouteInput(manifestEntry, input);
  const registration = listRuntimeLocalRouteRegistrations(manifestEntry).find(candidate => {
    return matchesRuntimeLocalRouteBinding(candidate.route.stateBinding, normalizedInput);
  });

  if (!registration) {
    return null;
  }

  return {
    manifestKey: registration.manifestKey,
    routeGroupKey: registration.routeGroupKey,
    routeKey: registration.route.key,
    viewKey: registration.route.selectionKey,
    route: registration.route,
  };
};

export const resolveRuntimeShellNavigationSurface = (
  manifestEntry: RuntimeManifestEntry | null,
  localRouteSelection: RuntimeLocalRouteSelection | null,
  routeKeys: RuntimeLocalRouteKey[],
  bindingField?: RuntimeShellNavigationBindingField,
): RuntimeShellNavigationSurface | null => {
  if (!manifestEntry) {
    return null;
  }

  const items = routeKeys.flatMap(routeKey => {
    const registration = getRuntimeLocalRouteRegistration(manifestEntry, routeKey);

    if (!registration) {
      return [];
    }

    return [{
      routeKey,
      navigationKey: resolveRuntimeNavigationKey(registration.route, bindingField),
      routeGroupKey: registration.routeGroupKey,
      active: false,
    }];
  });

  const defaultRegistration = getRuntimeLocalRouteRegistration(
    manifestEntry,
    manifestEntry.defaultLocalRouteKey,
  );
  const activeRouteKey = localRouteSelection?.routeKey ?? defaultRegistration?.route.key ?? null;
  let activeNavigationKey: string | null = null;

  if (localRouteSelection) {
    activeNavigationKey = resolveRuntimeNavigationKey(localRouteSelection.route, bindingField);
  } else if (defaultRegistration) {
    activeNavigationKey = resolveRuntimeNavigationKey(defaultRegistration.route, bindingField);
  }

  return {
    activeRouteKey,
    activeNavigationKey,
    defaultRouteKey: defaultRegistration?.route.key ?? null,
    items: items.map(item => ({
      ...item,
      active: activeNavigationKey === null
        ? item.routeKey === activeRouteKey
        : item.navigationKey === activeNavigationKey,
    })),
  };
};

export const resolveRuntimeFamilyEntryHandoff = (
  descriptor: SessionRuntimeDescriptor | null,
  runtimeShellState: RuntimeAppState,
  input: RuntimeRouteGroupSelectionInput,
): RuntimeFamilyEntryHandoff | null => {
  const manifestEntry = resolveRuntimeManifestEntryFromDescriptor(descriptor, runtimeShellState);
  if (!manifestEntry) {
    return null;
  }

  const localRouteSelection = resolveRuntimeLocalRouteSelection(manifestEntry, input);
  const navigationSurface = manifestEntry.shellNavigation
    ? resolveRuntimeShellNavigationSurface(
        manifestEntry,
        localRouteSelection,
        manifestEntry.shellNavigation.routeKeys,
        manifestEntry.shellNavigation.bindingField,
      )
    : null;

  return {
    manifestKey: manifestEntry.key,
    contentFamily: manifestEntry.key,
    identity: descriptor?.identity ?? EMPTY_RUNTIME_IDENTITY,
    manifestEntry,
    shellFamily: manifestEntry.shellFamily,
    defaultLocalRouteKey: manifestEntry.defaultLocalRouteKey,
    localRouteSelection,
    navigationSurface,
  };
};

export const resolveRuntimeRouteGroupSelection = (
  manifestEntry: RuntimeManifestEntry | null,
  input: RuntimeRouteGroupSelectionInput,
): RuntimeRouteGroupSelection | null => {
  const localRouteSelection = resolveRuntimeLocalRouteSelection(manifestEntry, input);

  if (!localRouteSelection) {
    return null;
  }

  return {
    manifestKey: localRouteSelection.manifestKey,
    routeGroupKey: localRouteSelection.routeGroupKey,
    viewKey: localRouteSelection.viewKey,
  };
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