import React, { useState, useEffect, useMemo } from 'react';
import { TenantType, TenantConfig, ImpersonationState } from './types';
import { AggregatorShell, B2BShell, B2CShell, WhiteLabelShell, WhiteLabelAdminShell } from './layouts/Shells';
import {
  SuperAdminShell,
  AdminView,
  type ControlPlaneIdentity,
  formatControlPlaneActorLabel,
} from './layouts/SuperAdminShell';
import { AuthForm } from './components/Auth/AuthFlows';
import { ForgotPassword } from './components/Auth/ForgotPassword';
import { VerifyEmail } from './components/Auth/VerifyEmail';
import { TokenHandler } from './components/Auth/TokenHandler';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import { TeamManagement } from './components/Tenant/TeamManagement';
import { InviteMemberForm } from './components/Tenant/InviteMemberForm';
import { WhiteLabelSettings } from './components/Tenant/WhiteLabelSettings';
import { WLStubPanel } from './components/WhiteLabelAdmin/WLStubPanel';
import { WLOrdersPanel } from './components/WhiteLabelAdmin/WLOrdersPanel';
import { WLCollectionsPanel } from './components/WhiteLabelAdmin/WLCollectionsPanel';
import { WLDomainsPanel } from './components/WhiteLabelAdmin/WLDomainsPanel';
import { EXPOrdersPanel } from './components/Tenant/EXPOrdersPanel';
import { DPPPassport } from './components/Tenant/DPPPassport';
import { EscrowPanel } from './components/Tenant/EscrowPanel';
// TECS-FBW-006-A: G-022 read-only escalation surfaces (tenant + control-plane)
import { EscalationsPanel } from './components/Tenant/EscalationsPanel';
import { EscalationOversight } from './components/ControlPlane/EscalationOversight';
// TECS-FBW-004: G-019 tenant settlement preview-confirm flow
import { SettlementPreview } from './components/Tenant/SettlementPreview';
// TECS-FBW-005: G-019 certification lifecycle panel (tenant) + admin view (control-plane)
import { CertificationsPanel } from './components/Tenant/CertificationsPanel';
import { CertificationsAdmin } from './components/ControlPlane/CertificationsAdmin';
// TECS-FBW-015: G-016 traceability CRUD panel (tenant) + admin read-only view (control-plane)
import { TraceabilityPanel } from './components/Tenant/TraceabilityPanel';
// TECS-FBW-016: tenant audit log read-only panel (EXPERIENCE-only surface)
import { TenantAuditLogs } from './components/Tenant/TenantAuditLogs';
// TECS-FBW-002-B: G-017 tenant trade read-only panel
import { TradesPanel } from './components/Tenant/TradesPanel';
import { TraceabilityAdmin } from './components/ControlPlane/TraceabilityAdmin';
// TECS-FBW-007: marketplace_cart_summaries projection admin panel (read-only)
import { CartSummariesPanel } from './components/ControlPlane/CartSummariesPanel';
// PW5-W2: G-018 cross-tenant escrow admin read panel (D-020-B: no balance)
import { EscrowAdminPanel } from './components/ControlPlane/EscrowAdminPanel';
// PW5-W3-FE: Settlement admin read panel (backend route: 14aea49)
import { SettlementAdminPanel } from './components/ControlPlane/SettlementAdminPanel';
// PW5-W4: G-021 maker-checker approval queue console (read-only)
import { MakerCheckerConsole } from './components/ControlPlane/MakerCheckerConsole';
// PW5-WL1-WIRE: white-label storefront product grid
import { WLStorefront } from './components/WL/WLStorefront';
import { TenantRegistry } from './components/ControlPlane/TenantRegistry';
import { TenantDetails } from './components/ControlPlane/TenantDetails';
import { AuditLogs } from './components/ControlPlane/AuditLogs';
import { FinanceOps } from './components/ControlPlane/FinanceOps';
import { AiGovernance } from './components/ControlPlane/AiGovernance';
import { SystemHealth } from './components/ControlPlane/SystemHealth';
import { FeatureFlags } from './components/ControlPlane/FeatureFlags';
import { ComplianceQueue } from './components/ControlPlane/ComplianceQueue';
import { DisputeCases } from './components/ControlPlane/DisputeCases';
import { TradeOversight } from './components/ControlPlane/TradeOversight';
import { AdminRBAC } from './components/ControlPlane/AdminRBAC';
import { EventStream } from './components/ControlPlane/EventStream';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import { getPlatformInsights } from './services/aiService';
import {
  getCatalogItems,
  CatalogItem,
  createCatalogItem,
  createRfq,
  getBuyerRfqs,
  getBuyerRfqDetail,
  getSupplierRfqInbox,
  getSupplierRfqDetail,
  submitSupplierRfqResponse,
  BuyerRfqDetail,
  BuyerRfqListItem,
  SupplierRfqDetail,
  SupplierRfqListItem,
  SupplierRfqResponse,
} from './services/catalogService';
import { CartProvider, useCart } from './contexts/CartContext';
import { Cart } from './components/Cart/Cart';
import { BuyerRfqDetailSurface, SupplierRfqDetailSurface } from './components/Tenant/BuyerRfqDetailSurface';
import { BuyerRfqListSurface, SupplierRfqInboxSurface } from './components/Tenant/BuyerRfqListSurface';
import { getTenants, getTenantById, startImpersonationSession, stopImpersonationSession, Tenant } from './services/controlPlaneService';
import { activateTenant } from './services/tenantService';
import { getCurrentUser } from './services/authService';
import { clearAuth, getCurrentAuthRealm, setImpersonationToken, setStoredAuthRealm, setToken, APIError } from './services/apiClient';

const CONTROL_PLANE_IDENTITY_KEY = 'texqtic_control_plane_identity';
const IMPERSONATION_SESSION_KEY = 'texqtic_impersonation_session';
const EMPTY_IMPERSONATION_STATE: ImpersonationState = {
  isAdmin: false,
  targetTenantId: null,
  startTime: null,
  impersonationId: null,
  token: null,
  expiresAt: null,
};

type StoredImpersonationSession = {
  adminId: string;
  state: ImpersonationState;
  tenant: Tenant;
};

// B2-REM-3: Canonical shell resolver — explicit policy function (B2-DESIGN locked).
// Returns null for unknown/null tenantCategory — caller MUST render explicit error state (no silent fallback).
function resolveExperienceShell(
  tenantCategory: string | null | undefined,
  isWhiteLabel: boolean | null | undefined
) {
  switch (tenantCategory) {
    case 'AGGREGATOR':
      return AggregatorShell;
    case 'B2B':
      return isWhiteLabel ? WhiteLabelShell : B2BShell;
    case 'B2C':
      return isWhiteLabel ? WhiteLabelShell : B2CShell;
    case 'INTERNAL':
      // Explicit named policy rule (B2-DESIGN locked): INTERNAL → AggregatorShell. Never via silent fallback.
      return AggregatorShell;
    default:
      return null; // Unknown identity — caller renders explicit error; FORBIDDEN to fall back silently.
  }
}

const buildControlPlaneIdentity = (user?: { id?: string; email?: string }, role?: string | null) => {
  if (!user?.id && !user?.email && !role) {
    return null;
  }

  return {
    id: user?.id ?? null,
    email: user?.email ?? null,
    role: role ?? null,
  };
};

const persistControlPlaneIdentity = (identity: ControlPlaneIdentity | null) => {
  if (!identity) {
    localStorage.removeItem(CONTROL_PLANE_IDENTITY_KEY);
    return;
  }

  localStorage.setItem(CONTROL_PLANE_IDENTITY_KEY, JSON.stringify(identity));
};

const readStoredControlPlaneIdentity = (): ControlPlaneIdentity | null => {
  const raw = localStorage.getItem(CONTROL_PLANE_IDENTITY_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ControlPlaneIdentity;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      id: typeof parsed.id === 'string' ? parsed.id : null,
      email: typeof parsed.email === 'string' ? parsed.email : null,
      role: typeof parsed.role === 'string' ? parsed.role : null,
    };
  } catch {
    return null;
  }
};

const readStoredAdminJwtClaims = (): { adminId: string; role: string | null; exp: number | null } | null => {
  const token = localStorage.getItem('texqtic_admin_token');
  if (!token) {
    return null;
  }

  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(window.atob(padded)) as {
      adminId?: unknown;
      role?: unknown;
      exp?: unknown;
    };

    if (typeof decoded.adminId !== 'string') {
      return null;
    }

    return {
      adminId: decoded.adminId,
      role: typeof decoded.role === 'string' ? decoded.role : null,
      exp: typeof decoded.exp === 'number' ? decoded.exp : null,
    };
  } catch {
    return null;
  }
};

const buildTenantSnapshot = (tenant?: {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  type?: string | null;
  tenant_category?: string | null;
  is_white_label?: boolean | null;
  status?: string | null;
  plan?: string | null;
} | null): Tenant | null => {
  if (!tenant?.id || !tenant.slug || !tenant.name || !tenant.type || !tenant.status || !tenant.plan) {
    return null;
  }

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    type: tenant.type,
    tenant_category: tenant.tenant_category ?? null,
    is_white_label: tenant.is_white_label === true,
    status: tenant.status,
    plan: tenant.plan,
    createdAt: '',
    updatedAt: '',
  };
};

const persistImpersonationSession = (session: StoredImpersonationSession | null) => {
  if (!session) {
    localStorage.removeItem(IMPERSONATION_SESSION_KEY);
    return;
  }

  localStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(session));
};

const readStoredImpersonationTenant = (tenant: {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  type?: unknown;
  tenant_category?: unknown;
  is_white_label?: unknown;
  status?: unknown;
  plan?: unknown;
} | undefined) => {
  if (!tenant) {
    return null;
  }

  return buildTenantSnapshot({
    id: typeof tenant.id === 'string' ? tenant.id : null,
    slug: typeof tenant.slug === 'string' ? tenant.slug : null,
    name: typeof tenant.name === 'string' ? tenant.name : null,
    type: typeof tenant.type === 'string' ? tenant.type : null,
    tenant_category:
      typeof tenant.tenant_category === 'string' || tenant.tenant_category === null ? tenant.tenant_category ?? null : null,
    is_white_label: tenant.is_white_label === true,
    status: typeof tenant.status === 'string' ? tenant.status : null,
    plan: typeof tenant.plan === 'string' ? tenant.plan : null,
  });
};

const readStoredImpersonationState = (state: Partial<ImpersonationState> | undefined, tenantId: string | undefined) => {
  if (
    state?.isAdmin !== true ||
    typeof state?.targetTenantId !== 'string' ||
    typeof state?.startTime !== 'string' ||
    typeof state?.impersonationId !== 'string' ||
    typeof state?.token !== 'string' ||
    typeof state?.expiresAt !== 'string'
  ) {
    return null;
  }

  const expiry = Date.parse(state.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now() || state.targetTenantId !== tenantId) {
    return null;
  }

  return {
    isAdmin: true,
    targetTenantId: state.targetTenantId,
    startTime: state.startTime,
    impersonationId: state.impersonationId,
    token: state.token,
    expiresAt: state.expiresAt,
  } satisfies ImpersonationState;
};

const readStoredImpersonationSession = (): StoredImpersonationSession | null => {
  const raw = localStorage.getItem(IMPERSONATION_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      adminId?: unknown;
      state?: Partial<ImpersonationState>;
      tenant?: {
        id?: unknown;
        slug?: unknown;
        name?: unknown;
        type?: unknown;
        tenant_category?: unknown;
        is_white_label?: unknown;
        status?: unknown;
        plan?: unknown;
      };
    };

    if (typeof parsed.adminId !== 'string') {
      return null;
    }

    const tenant = readStoredImpersonationTenant(parsed.tenant);
    const state = readStoredImpersonationState(parsed.state, tenant?.id);
    if (!tenant || !state) {
      return null;
    }

    return {
      adminId: parsed.adminId,
      tenant,
      state,
    };
  } catch {
    return null;
  }
};

const clearPersistedImpersonationSession = () => {
  setImpersonationToken(null);
  persistImpersonationSession(null);
};

const App: React.FC = () => {

  // Production-grade State Machine
  const [appState, setAppState] = useState<
    | 'AUTH'
    | 'FORGOT_PASSWORD'
    | 'VERIFY_EMAIL'
    | 'TOKEN_HANDLER'
    | 'ONBOARDING'
    | 'EXPERIENCE'
    | 'TEAM_MGMT'
    | 'INVITE_MEMBER'
    | 'SETTINGS'
    | 'CONTROL_PLANE'
    | 'WL_ADMIN'
    // TECS-FBW-014: post-checkout confirmation state
    | 'ORDER_CONFIRMED'
  >('AUTH');
  const [authRealm, setAuthRealm] = useState<'TENANT' | 'CONTROL_PLANE'>('TENANT');
  const effectiveRealm = useMemo(
    () => getCurrentAuthRealm(appState === 'AUTH' ? authRealm : null) ?? 'TENANT',
    [appState, authRealm]
  );
  const canAccessControlPlane = getCurrentAuthRealm() === 'CONTROL_PLANE';
  // Wave 4 P1: active panel in the WL Store Admin console
  type WLAdminView = 'BRANDING' | 'STAFF' | 'PRODUCTS' | 'COLLECTIONS' | 'ORDERS' | 'DOMAINS';
  const [wlAdminView, setWlAdminView] = useState<WLAdminView>('BRANDING');
  // TECS-FBW-020: WL-admin-local invite substate — keeps invite inside WhiteLabelAdminShell;
  // prevents INVITE_MEMBER appState from falling into the EXPERIENCE case group.
  const [wlAdminInviting, setWlAdminInviting] = useState(false);
  // RCP-1 TECS 3: sub-view for EXPERIENCE Orders panel (OPS-EXPERIENCE-ORDERS-UX-001)
  // G-025 TECS 4D: 'DPP' added for DPP Passport view (G-025-DPP-SNAPSHOT-UI-EXPORT-001)
  // TECS-FBW-003-A: 'ESCROW' added for tenant escrow read panel (G-018)
  // TECS-FBW-006-A: 'ESCALATIONS' added for tenant escalation read panel (G-022)
  // TECS-FBW-004: 'SETTLEMENT' added for G-019 tenant settlement preview-confirm flow
  // TECS-FBW-005: 'CERTIFICATIONS' added for G-019 tenant certification lifecycle panel
  // TECS-FBW-015: 'TRACEABILITY' added for G-016 traceability CRUD panel
  // TECS-FBW-016: 'AUDIT_LOGS' added for tenant audit log read-only panel
  // TECS-FBW-002-B: 'TRADES' added for G-017 tenant trade read-only panel
  const [expView, setExpView] = useState<'HOME' | 'ORDERS' | 'DPP' | 'ESCROW' | 'ESCALATIONS' | 'SETTLEMENT' | 'CERTIFICATIONS' | 'TRACEABILITY' | 'AUDIT_LOGS' | 'TRADES' | 'RFQS' | 'SUPPLIER_RFQ_INBOX'>('HOME');

  // Tenant management state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [_tenantsLoading, setTenantsLoading] = useState(false);
  const [_tenantsError, setTenantsError] = useState<string | null>(null);
  const [tenantProvisionError, setTenantProvisionError] = useState<string | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<TenantConfig | null>(null);
  const [controlPlaneIdentity, setControlPlaneIdentity] = useState<ControlPlaneIdentity | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationState>(EMPTY_IMPERSONATION_STATE);

  /** G-W3-ROUTING-001: Reason-input dialog before API-backed impersonation start */
  const [impersonationDialog, setImpersonationDialog] = useState<{
    open: boolean;
    tenant: TenantConfig | null;
    reason: string;
    loading: boolean;
    error: string | null;
  }>({ open: false, tenant: null, reason: '', loading: false, error: null });

  const [rfqDialog, setRfqDialog] = useState<{
    open: boolean;
    product: CatalogItem | null;
    quantity: string;
    buyerMessage: string;
    loading: boolean;
    error: string | null;
    success: {
      rfqId: string;
      quantity: number;
    } | null;
  }>({
    open: false,
    product: null,
    quantity: '1',
    buyerMessage: '',
    loading: false,
    error: null,
    success: null,
  });
  const [rfqDetailView, setRfqDetailView] = useState<{
    open: boolean;
    source: 'dialog' | 'list' | null;
    rfqId: string | null;
    loading: boolean;
    error: string | null;
    data: BuyerRfqDetail | null;
  }>({
    open: false,
    source: null,
    rfqId: null,
    loading: false,
    error: null,
    data: null,
  });
  const [buyerRfqListView, setBuyerRfqListView] = useState<{
    loading: boolean;
    error: string | null;
    rfqs: BuyerRfqListItem[];
  }>({
    loading: false,
    error: null,
    rfqs: [],
  });
  const [supplierRfqListView, setSupplierRfqListView] = useState<{
    loading: boolean;
    error: string | null;
    rfqs: SupplierRfqListItem[];
  }>({
    loading: false,
    error: null,
    rfqs: [],
  });
  const [supplierRfqDetailView, setSupplierRfqDetailView] = useState<{
    open: boolean;
    rfqId: string | null;
    loading: boolean;
    error: string | null;
    submitLoading: boolean;
    submitError: string | null;
    data: SupplierRfqDetail | null;
    response: SupplierRfqResponse | null;
  }>({
    open: false,
    rfqId: null,
    loading: false,
    error: null,
    submitLoading: false,
    submitError: null,
    data: null,
    response: null,
  });

  const [aiInsight, setAiInsight] = useState<string>('Loading AI insights...');
  const [showArchitecture, setShowArchitecture] = useState(false);

  useEffect(() => {
    if (appState === 'AUTH' && authRealm !== effectiveRealm) {
      setAuthRealm(effectiveRealm);
    }
  }, [appState, authRealm, effectiveRealm]);

  const [adminView, setAdminView] = useState<AdminView>('TENANTS');
  const controlPlaneActorLabel = useMemo(() => {
    return formatControlPlaneActorLabel(controlPlaneIdentity);
  }, [controlPlaneIdentity]);

  const enterControlPlane = () => {
    if (getCurrentAuthRealm() !== 'CONTROL_PLANE') {
      setStoredAuthRealm('TENANT');
      setAuthRealm('TENANT');
      setSelectedTenant(null);
      setAdminView('TENANTS');
      setAppState('EXPERIENCE');
      return;
    }

    setStoredAuthRealm('CONTROL_PLANE');
    setAuthRealm('CONTROL_PLANE');
    setSelectedTenant(null);
    setAdminView('TENANTS');
    setAppState('CONTROL_PLANE');
  };

  const clearControlPlaneIdentityState = () => {
    persistControlPlaneIdentity(null);
    setControlPlaneIdentity(null);
    setSelectedTenant(null);
    setAdminView('TENANTS');
  };

  const applyControlPlaneShellEntry = (identity: ControlPlaneIdentity) => {
    persistControlPlaneIdentity(identity);
    setControlPlaneIdentity(identity);
    setStoredAuthRealm('CONTROL_PLANE');
    setAuthRealm('CONTROL_PLANE');
    setSelectedTenant(null);
    setAdminView('TENANTS');
    setAppState('CONTROL_PLANE');
  };

  const resolveControlPlaneIdentity = async (data?: any) => {
    try {
      const me = await getCurrentUser();
      return buildControlPlaneIdentity(
        me.user,
        me.role ?? data?.admin?.role ?? data?.user?.role ?? null
      );
    } catch {
      return buildControlPlaneIdentity(
        data?.admin ?? data?.user,
        data?.admin?.role ?? data?.user?.role ?? null
      );
    }
  };

  // Catalog state
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  // TECS-FBW-014: stores orderId from successful checkout for ORDER_CONFIRMED display
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  // RU-001: pending invite token (set when ?action=invite is detected in URL)
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);

  // RU-003: inline add-item form toggle (B2B/B2C catalog)
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [addItemFormData, setAddItemFormData] = useState({ name: '', price: '', sku: '', imageUrl: '' });
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);

  // Fetch tenants from backend (for tenant picker in bottom-right)
  // GUARD: Only load control-plane tenants when in Staff Control Plane view
  useEffect(() => {
    // Skip if not in control plane view or wrong realm
    if (appState !== 'CONTROL_PLANE' || !canAccessControlPlane) {
      return;
    }

    const fetchTenants = async () => {
      setTenantsLoading(true);
      setTenantsError(null);
      try {
        const response = await getTenants();
        setTenants(response.tenants);
        if (response.tenants.length > 0) {
          setCurrentTenantId(prev => prev ?? response.tenants[0].id);
        }
      } catch (error) {
        console.error('Failed to load tenants:', error);
        setTenantsError('Failed to load tenants');
        setTenants([]);
      } finally {
        setTenantsLoading(false);
      }
    };
    fetchTenants();
  }, [appState, canAccessControlPlane]);

  // Helper to normalize plan string to strict union type
  const normalizePlan = (plan: string | null | undefined): 'TRIAL' | 'PAID' | 'ENTERPRISE' => {
    if (plan === 'TRIAL' || plan === 'PAID' || plan === 'ENTERPRISE') return plan;
    if (plan === 'PROFESSIONAL') return 'PAID'; // Map PROFESSIONAL -> PAID
    return 'TRIAL'; // Safe default
  };

  // Convert backend Tenant to TenantConfig for UI compatibility
  const currentTenant: TenantConfig | null = useMemo(() => {
    const tenant = tenants.find(t => t.id === currentTenantId);
    if (!tenant) return null;

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      type: tenant.type as TenantType,
      status: tenant.status as any,
      plan: normalizePlan(tenant.plan),
      theme: {
        primaryColor: tenant.branding?.primaryColor || '#4F46E5',
        secondaryColor: '#10B981',
        logo: tenant.branding?.logoUrl || '🏢',
      },
      features: [],
      aiBudget: tenant.aiBudget?.monthlyLimit || 0,
      aiUsage: 0, // No longer tracked in mock format
      billingStatus: 'CURRENT',
      riskScore: 0,
    };
  }, [tenants, currentTenantId]);

  // Check URL for token-based actions on mount (password reset, email verification, invite)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const action = params.get('action');
    if (token && action === 'invite') {
      // Invite activation: preserve token and go directly to onboarding
      setPendingInviteToken(token);
      setAppState('ONBOARDING');
    } else if (token) {
      setAppState('TOKEN_HANDLER');
    }
  }, []);

  useEffect(() => {
    if ((appState === 'EXPERIENCE' || appState === 'SETTINGS') && currentTenant) {
      const fetchInsight = async () => {
        setAiInsight('Thinking...');
        const insight = await getPlatformInsights(
          `Provide a brief market trend analysis for a ${currentTenant.type} platform named ${currentTenant.name}.`
        );
        setAiInsight(insight || 'No insights available.');
      };
      fetchInsight();
    }
  }, [currentTenant, appState]);

  // Fetch catalog items when entering experience mode (or WL_ADMIN Products panel)
  useEffect(() => {
    if (appState === 'EXPERIENCE' || appState === 'TEAM_MGMT' || appState === 'SETTINGS' || appState === 'WL_ADMIN') {
      const fetchCatalog = async () => {
        setCatalogLoading(true);
        setCatalogError(null);
        try {
          const response = await getCatalogItems({ limit: 20 });
          setProducts(response.items);
        } catch (error) {
          console.error('Failed to load catalog:', error);
          setCatalogError('Failed to load catalog. Please try again.');
          setProducts([]);
        } finally {
          setCatalogLoading(false);
        }
      };
      fetchCatalog();
    }
  }, [appState]);

  // REALM-BOUNDARY-SHELL-AFFORDANCE-001:
  // Tenant sessions must never remain in control-plane state.
  // Normalize immediately back to a tenant-safe landing before any control-plane shell can persist.
  useEffect(() => {
    if (appState !== 'CONTROL_PLANE' || canAccessControlPlane) {
      return;
    }

    setStoredAuthRealm('TENANT');
    setAuthRealm('TENANT');
    setSelectedTenant(null);
    setAdminView('TENANTS');
    setAppState('EXPERIENCE');
  }, [appState, canAccessControlPlane]);

  useEffect(() => {
    if (appState !== 'AUTH' || getCurrentAuthRealm() !== 'CONTROL_PLANE') {
      return;
    }

    const claims = readStoredAdminJwtClaims();
    const storedIdentity = readStoredControlPlaneIdentity();

    const identity = (() => {
      if (!claims?.adminId || !storedIdentity?.id) {
        return null;
      }

      if (claims.exp && claims.exp * 1000 <= Date.now()) {
        return null;
      }

      if (claims.adminId !== storedIdentity.id) {
        return null;
      }

      return {
        ...storedIdentity,
        role: claims.role ?? storedIdentity.role ?? null,
      };
    })();

    if (!identity) {
      clearAuth();
      clearPersistedImpersonationSession();
      setImpersonation(EMPTY_IMPERSONATION_STATE);
      persistControlPlaneIdentity(null);
      setControlPlaneIdentity(null);
      setSelectedTenant(null);
      setAdminView('TENANTS');
      setAuthRealm('CONTROL_PLANE');
      return;
    }

    persistControlPlaneIdentity(identity);
    setControlPlaneIdentity(identity);
    setStoredAuthRealm('CONTROL_PLANE');
    setAuthRealm('CONTROL_PLANE');
    setSelectedTenant(null);
    setAdminView('TENANTS');
    setAppState('CONTROL_PLANE');
  }, [appState]);

  useEffect(() => {
    if (appState !== 'AUTH' || getCurrentAuthRealm() === 'CONTROL_PLANE') {
      return;
    }

    const claims = readStoredAdminJwtClaims();
    const storedIdentity = readStoredControlPlaneIdentity();
    const storedImpersonation = readStoredImpersonationSession();

    if (!claims?.adminId || !storedIdentity?.id || !storedImpersonation) {
      clearPersistedImpersonationSession();
      return;
    }

    if (
      (claims.exp && claims.exp * 1000 <= Date.now()) ||
      claims.adminId !== storedIdentity.id ||
      claims.adminId !== storedImpersonation.adminId
    ) {
      clearPersistedImpersonationSession();
      setImpersonation(EMPTY_IMPERSONATION_STATE);
      return;
    }

    const actorIdentity = {
      ...storedIdentity,
      role: claims.role ?? storedIdentity.role ?? null,
    };

    let cancelled = false;

    const restoreImpersonationSession = async () => {
      setImpersonationToken(storedImpersonation.state.token);
      setStoredAuthRealm('TENANT');
      setAuthRealm('TENANT');

      try {
        const me = await getCurrentUser();
        const tenant = buildTenantSnapshot(me.tenant) ?? storedImpersonation.tenant;

        if (tenant?.id !== storedImpersonation.state.targetTenantId || cancelled) {
          throw new Error('Stored impersonation tenant is invalid.');
        }

        persistControlPlaneIdentity(actorIdentity);
        setControlPlaneIdentity(actorIdentity);
        setTenants([tenant]);
        setCurrentTenantId(tenant.id);
        setTenantProvisionError(null);
        setImpersonation(storedImpersonation.state);
        setAppState('EXPERIENCE');
      } catch {
        if (cancelled) {
          return;
        }

        clearPersistedImpersonationSession();
        setImpersonation(EMPTY_IMPERSONATION_STATE);
      }
    };

    void restoreImpersonationSession();

    return () => {
      cancelled = true;
    };
  }, [appState]);

  const handleAuthSuccess = async (data: any) => {
    const nextRealm = getCurrentAuthRealm(authRealm) ?? 'TENANT';

    if (nextRealm === 'CONTROL_PLANE') {
      clearPersistedImpersonationSession();
      setImpersonation(EMPTY_IMPERSONATION_STATE);
      const identity = await resolveControlPlaneIdentity(data);

      if (!identity) {
        clearAuth();
        clearPersistedImpersonationSession();
        clearControlPlaneIdentityState();
        setAuthRealm('CONTROL_PLANE');
        setAppState('AUTH');
        return;
      }

      applyControlPlaneShellEntry(identity);
      return;
    }

    clearPersistedImpersonationSession();
    setImpersonation(EMPTY_IMPERSONATION_STATE);
    clearControlPlaneIdentityState();
    setStoredAuthRealm('TENANT');
    setAuthRealm('TENANT');

    // TENANT realm: call /api/me to hydrate tenant context before transitioning.
    // This prevents the "Loading workspace..." hang caused by tenants[] being empty
    // when currentTenant is derived (tenants[] is only fetched for CONTROL_PLANE otherwise).
    // Clear any previous provision error from a prior login attempt.
    setTenantProvisionError(null);

    // B2-REM-3: Parse canonical identity fields first; fall back to legacy compat bridge.
    // tenant_category is the authoritative routing identity (B2-REM-2 backend emits this).
    // tenantType is retained as compatibility fallback only — NOT the canonical routing signal.
    const rawCategory: string | null = (data?.tenant_category as string) ?? (data?.tenantType as string) ?? null;
    const rawIsWhiteLabel: boolean = typeof data?.is_white_label === 'boolean' ? data.is_white_label : false;

    // G-WL-TYPE-MISMATCH Wave4-P1: roles that default to the WL Store Admin console.
    // Buyer/Seller/Staff continue to land in the storefront (EXPERIENCE).
    const WL_ADMIN_ROLES = new Set(['TENANT_OWNER', 'TENANT_ADMIN', 'OWNER', 'ADMIN']);
    let nextState: 'EXPERIENCE' | 'WL_ADMIN' = 'EXPERIENCE';

    try {
      const me = await getCurrentUser();
      if (me.tenant) {
        const t = me.tenant;
        setTenants([{
          id: t.id,
          slug: t.slug,
          name: t.name,
          type: t.type,
          // B2-REM-3: persist canonical identity fields; fall back to legacy type for compat
          tenant_category: t.tenant_category ?? t.type,
          is_white_label: t.is_white_label ?? false,
          status: t.status,
          plan: t.plan,
          createdAt: '',
          updatedAt: '',
        } as Tenant]);
        setCurrentTenantId(t.id);
        // B2-REM-3: WL routing uses is_white_label boolean — not type === WHITE_LABEL
        if ((t.is_white_label === true) && WL_ADMIN_ROLES.has(me.role ?? '')) {
          nextState = 'WL_ADMIN';
        }
      } else {
        // /api/me returned no tenant — seed stub so currentTenant is never null
        const tenantId = data?.membership?.tenantId || data?.user?.tenantId;
        if (tenantId) {
          setTenants([{ id: tenantId, slug: tenantId, name: 'Workspace', type: rawCategory ?? 'AGGREGATOR', tenant_category: rawCategory, is_white_label: rawIsWhiteLabel, status: 'ACTIVE', plan: 'TRIAL', createdAt: '', updatedAt: '' } as Tenant]);
          setCurrentTenantId(tenantId);
        }
        // B2-REM-3: WL admin routing uses is_white_label boolean — not stubType === WHITE_LABEL
        if (rawIsWhiteLabel === true && WL_ADMIN_ROLES.has((data?.user?.role as string) ?? '')) {
          nextState = 'WL_ADMIN';
        }
      }
    } catch (err) {
      // /api/me failed — seed stub tenant so UI never hangs on Loading workspace spinner
      const tenantId = data?.membership?.tenantId || data?.user?.tenantId;
      if (tenantId) {
        setTenants([{ id: tenantId, slug: tenantId, name: 'Workspace', type: rawCategory ?? 'AGGREGATOR', tenant_category: rawCategory, is_white_label: rawIsWhiteLabel, status: 'ACTIVE', plan: 'TRIAL', createdAt: '', updatedAt: '' } as Tenant]);
        setCurrentTenantId(tenantId);
      }
      // B2-REM-3: WL admin routing uses is_white_label boolean — not stubType === WHITE_LABEL
      if (rawIsWhiteLabel === true && WL_ADMIN_ROLES.has((data?.user?.role as string) ?? '')) {
        nextState = 'WL_ADMIN';
      }
      // Show deterministic error banner for unprovisioned tenant (404)
      if (err instanceof APIError && err.status === 404 && err.message.includes('Organisation not yet provisioned')) {
        setTenantProvisionError('Tenant not provisioned yet. Your workspace is being set up — please try again in a few minutes.');
      }
    }

    setAppState(nextState);
  };

  /** G-W3-ROUTING-001: Open reason dialog — API call deferred to handleImpersonateConfirm */
  const handleImpersonate = (tenant: TenantConfig) => {
    setImpersonationDialog({ open: true, tenant, reason: '', loading: false, error: null });
  };

  /** G-W3-ROUTING-001: Confirm impersonation — fetch member userId, call server, store token */
  const handleImpersonateConfirm = async () => {
    const tenant = impersonationDialog.tenant;
    if (!tenant) return;
    const reason = impersonationDialog.reason.trim();
    if (reason.length < 10) {
      setImpersonationDialog(d => ({ ...d, error: 'Reason must be at least 10 characters.' }));
      return;
    }
    setImpersonationDialog(d => ({ ...d, loading: true, error: null }));
    try {
      const actorAdminId = controlPlaneIdentity?.id ?? readStoredAdminJwtClaims()?.adminId;
      if (!actorAdminId) {
        throw new Error('Control-plane actor identity unavailable.');
      }

      // Fetch tenant details to find an eligible member userId
      const detail = await getTenantById(tenant.id);
      const members = detail.tenant.memberships ?? [];
      const target =
        members.find(m => m.role === 'OWNER' && m.status === 'ACTIVE') ||
        members.find(m => m.role === 'ADMIN' && m.status === 'ACTIVE') ||
        members.find(m => m.status === 'ACTIVE') ||
        members[0];
      if (!target) {
        setImpersonationDialog(d => ({ ...d, loading: false, error: 'No eligible member found for this tenant.' }));
        return;
      }
      const result = await startImpersonationSession({
        orgId: tenant.id,
        userId: target.user.id,
        reason,
      });
      const nextImpersonationState: ImpersonationState = {
        isAdmin: true,
        targetTenantId: tenant.id,
        startTime: new Date().toISOString(),
        impersonationId: result.impersonationId,
        token: result.token,
        expiresAt: result.expiresAt,
      };

      // Apply impersonation JWT — admin token in localStorage is untouched
      setImpersonationToken(result.token);
      setStoredAuthRealm('TENANT');
      setAuthRealm('TENANT');
      setCurrentTenantId(tenant.id);
      setImpersonation(nextImpersonationState);
      persistImpersonationSession({
        adminId: actorAdminId,
        state: nextImpersonationState,
        tenant:
          buildTenantSnapshot({
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            type: String(tenant.type),
            tenant_category: tenant.tenant_category ?? null,
            is_white_label: tenant.is_white_label ?? false,
            status: String(tenant.status),
            plan: String(tenant.plan),
          })!,
      });
      setImpersonationDialog({ open: false, tenant: null, reason: '', loading: false, error: null });
      setAppState('EXPERIENCE');
    } catch (err: any) {
      const msg = err?.message || 'Failed to start impersonation session.';
      setImpersonationDialog(d => ({ ...d, loading: false, error: msg }));
    }
  };

  /** G-W3-ROUTING-001: Stop impersonation via server API, then restore admin session */
  const handleExitImpersonation = async () => {
    setStoredAuthRealm('CONTROL_PLANE');
    setAuthRealm('CONTROL_PLANE');

    if (impersonation.impersonationId) {
      try {
        await stopImpersonationSession({
          impersonationId: impersonation.impersonationId,
          reason: 'Admin exited impersonation session via UI.',
        });
      } catch (err) {
        // Log but don't block exit — state must be cleared regardless
        console.error('[Impersonation] stop error (ignored, clearing state):', err);
      }
    }
    // Clear impersonation token override — admin JWT in localStorage is restored automatically
    clearPersistedImpersonationSession();
    setImpersonation(EMPTY_IMPERSONATION_STATE);
    setAppState('CONTROL_PLANE');
  };

  /** RU-003: Handle inline catalog item creation */
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddItemLoading(true);
    setAddItemError(null);
    try {
      const priceVal = parseFloat(addItemFormData.price);
      if (isNaN(priceVal) || priceVal <= 0) throw new Error('Price must be a positive number.');
      if (!addItemFormData.name.trim()) throw new Error('Name is required.');
      const imageUrl = addItemFormData.imageUrl.trim();
      if (imageUrl) {
        try {
          new URL(imageUrl);
        } catch {
          throw new Error('Image URL must be a valid URL.');
        }
      }
      const result = await createCatalogItem({
        name: addItemFormData.name.trim(),
        sku: addItemFormData.sku.trim() || undefined,
        imageUrl: imageUrl || undefined,
        price: priceVal,
      });
      setProducts(prev => [result.item, ...prev]);
      setAddItemFormData({ name: '', price: '', sku: '', imageUrl: '' });
      setShowAddItemForm(false);
    } catch (err: any) {
      setAddItemError(err?.message || 'Failed to create item.');
    } finally {
      setAddItemLoading(false);
    }
  };

  const handleOpenRfqDialog = (product: CatalogItem) => {
    setRfqDialog({
      open: true,
      product,
      quantity: product.moq ? String(product.moq) : '1',
      buyerMessage: '',
      loading: false,
      error: null,
      success: null,
    });
  };

  const handleCloseRfqDialog = () => {
    setRfqDialog({
      open: false,
      product: null,
      quantity: '1',
      buyerMessage: '',
      loading: false,
      error: null,
      success: null,
    });
    setRfqDetailView({
      open: false,
      source: null,
      rfqId: null,
      loading: false,
      error: null,
      data: null,
    });
  };

  const handleSubmitRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfqDialog.product) return;

    const quantityInput = rfqDialog.quantity.trim();
    const quantity = Number(quantityInput);
    if (
      quantityInput.length === 0 ||
      Number.isNaN(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      setRfqDialog(dialog => ({ ...dialog, error: 'Quantity must be an integer of at least 1.' }));
      return;
    }

    const buyerMessage = rfqDialog.buyerMessage.trim();
    setRfqDialog(dialog => ({ ...dialog, loading: true, error: null }));

    try {
      const response = await createRfq({
        catalogItemId: rfqDialog.product.id,
        quantity,
        ...(buyerMessage ? { buyerMessage } : {}),
      });

      setRfqDialog(dialog => ({
        ...dialog,
        loading: false,
        error: null,
        success: {
          rfqId: response.rfq.id,
          quantity: response.rfq.quantity,
        },
      }));
      setRfqDetailView({
        open: false,
        source: null,
        rfqId: response.rfq.id,
        loading: false,
        error: null,
        data: null,
      });
    } catch (error) {
      console.error('Failed to submit RFQ:', error);
      setRfqDialog(dialog => ({
        ...dialog,
        loading: false,
        error: error instanceof APIError ? error.message : 'Failed to submit your request for quote. Please try again.',
      }));
    }
  };

  const handleOpenBuyerRfqs = async () => {
    setExpView('RFQS');
    setRfqDetailView(view =>
      view.source === 'list'
        ? {
            open: false,
            source: null,
            rfqId: null,
            loading: false,
            error: null,
            data: null,
          }
        : view
    );
    setBuyerRfqListView(view => ({
      ...view,
      loading: true,
      error: null,
    }));

    try {
      const response = await getBuyerRfqs();
      setBuyerRfqListView({
        loading: false,
        error: null,
        rfqs: response.rfqs,
      });
    } catch (error) {
      setBuyerRfqListView({
        loading: false,
        error: error instanceof APIError ? error.message : 'Unable to load your RFQs right now.',
        rfqs: [],
      });
    }
  };

  const handleOpenRfqDetail = async (rfqId?: string, source: 'dialog' | 'list' = 'dialog') => {
    const nextRfqId = rfqId ?? rfqDialog.success?.rfqId;
    if (!nextRfqId) return;

    if (source === 'list') {
      setExpView('RFQS');
    }

    if (rfqDetailView.rfqId === nextRfqId && rfqDetailView.data && rfqDetailView.source === source) {
      setRfqDetailView(view => ({ ...view, open: true, error: null }));
      return;
    }

    setRfqDetailView({
      open: true,
      source,
      rfqId: nextRfqId,
      loading: true,
      error: null,
      data: null,
    });

    try {
      const response = await getBuyerRfqDetail(nextRfqId);
      setRfqDetailView({
        open: true,
        source,
        rfqId: nextRfqId,
        loading: false,
        error: null,
        data: response.rfq,
      });
    } catch (error) {
      setRfqDetailView({
        open: true,
        source,
        rfqId: nextRfqId,
        loading: false,
        error: error instanceof APIError ? error.message : 'Unable to load RFQ detail right now.',
        data: null,
      });
    }
  };

  const handleReturnToBuyerRfqList = () => {
    setRfqDetailView({
      open: false,
      source: null,
      rfqId: null,
      loading: false,
      error: null,
      data: null,
    });
  };

  const handleCloseBuyerRfqs = () => {
    handleReturnToBuyerRfqList();
    setExpView('HOME');
  };

  const handleCloseRfqDetail = () => {
    setRfqDetailView(view => ({ ...view, open: false }));
  };

  const handleOpenSupplierRfqInbox = async () => {
    setExpView('SUPPLIER_RFQ_INBOX');
    setSupplierRfqDetailView({
      open: false,
      rfqId: null,
      loading: false,
      error: null,
      submitLoading: false,
      submitError: null,
      data: null,
      response: null,
    });
    setSupplierRfqListView(view => ({
      ...view,
      loading: true,
      error: null,
    }));

    try {
      const response = await getSupplierRfqInbox();
      setSupplierRfqListView({
        loading: false,
        error: null,
        rfqs: response.rfqs,
      });
    } catch (error) {
      setSupplierRfqListView({
        loading: false,
        error: error instanceof APIError ? error.message : 'Unable to load the supplier RFQ inbox right now.',
        rfqs: [],
      });
    }
  };

  const handleOpenSupplierRfqDetail = async (rfqId: string) => {
    const existingResponse = supplierRfqDetailView.rfqId === rfqId ? supplierRfqDetailView.response : null;

    if (supplierRfqDetailView.rfqId === rfqId && supplierRfqDetailView.data) {
      setSupplierRfqDetailView(view => ({
        ...view,
        open: true,
        error: null,
        submitError: null,
      }));
      return;
    }

    setSupplierRfqDetailView({
      open: true,
      rfqId,
      loading: true,
      error: null,
      submitLoading: false,
      submitError: null,
      data: null,
      response: existingResponse,
    });

    try {
      const response = await getSupplierRfqDetail(rfqId);
      setSupplierRfqDetailView({
        open: true,
        rfqId,
        loading: false,
        error: null,
        submitLoading: false,
        submitError: null,
        data: response.rfq,
        response: existingResponse,
      });
    } catch (error) {
      setSupplierRfqDetailView({
        open: true,
        rfqId,
        loading: false,
        error: error instanceof APIError ? error.message : 'Unable to load supplier RFQ detail right now.',
        submitLoading: false,
        submitError: null,
        data: null,
        response: existingResponse,
      });
    }
  };

  const handleReturnToSupplierRfqList = () => {
    setSupplierRfqDetailView({
      open: false,
      rfqId: null,
      loading: false,
      error: null,
      submitLoading: false,
      submitError: null,
      data: null,
      response: null,
    });
  };

  const handleCloseSupplierRfqInbox = () => {
    handleReturnToSupplierRfqList();
    setExpView('HOME');
  };

  const handleSubmitSupplierRfqResponse = async (message: string) => {
    const rfqId = supplierRfqDetailView.rfqId;
    const currentRfq = supplierRfqDetailView.data;

    if (!rfqId || !currentRfq) {
      return;
    }

    if (!message.trim()) {
      setSupplierRfqDetailView(view => ({
        ...view,
        submitError: 'Response message is required.',
      }));
      return;
    }

    setSupplierRfqDetailView(view => ({
      ...view,
      submitLoading: true,
      submitError: null,
    }));

    try {
      const result = await submitSupplierRfqResponse(rfqId, { message });
      setSupplierRfqDetailView(view => ({
        ...view,
        submitLoading: false,
        submitError: null,
        data: view.data
          ? {
              ...view.data,
              status: result.rfq.status,
              updated_at: result.response.updated_at,
            }
          : view.data,
        response: result.response,
      }));
      setSupplierRfqListView(view => ({
        ...view,
        rfqs: view.rfqs.map(rfq =>
          rfq.id === rfqId
            ? {
                ...rfq,
                status: result.rfq.status,
                updated_at: result.response.updated_at,
              }
            : rfq
        ),
      }));
    } catch (error) {
      setSupplierRfqDetailView(view => ({
        ...view,
        submitLoading: false,
        submitError: error instanceof APIError ? error.message : 'Unable to submit the supplier response right now.',
      }));
    }
  };

  /** Wave 4 P1: WL Store Admin — content renderer for back-office panels. */
  const renderWLAdminContent = () => {
    if (!currentTenant) return null;
    // TECS-FBW-020: render InviteMemberForm in-shell; onBack returns to STAFF without leaving WL_ADMIN.
    if (wlAdminInviting) return <InviteMemberForm onBack={() => setWlAdminInviting(false)} />;
    switch (wlAdminView) {
      // TECS-FBW-008: pass onNavigateDomains so WL Settings routes to real Domains panel
      case 'BRANDING':    return <WhiteLabelSettings tenant={currentTenant} onNavigateDomains={() => setWlAdminView('DOMAINS')} />;
      case 'STAFF':       return <TeamManagement onInvite={() => setWlAdminInviting(true)} />;
      case 'PRODUCTS': return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Product Catalog</h2>
              <p className="text-slate-500 text-sm mt-0.5">Manage your store inventory.</p>
            </div>
            <button
              onClick={() => setShowAddItemForm(v => !v)}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-700 transition"
            >
              + Add Item
            </button>
          </div>

          {showAddItemForm && (
            <form onSubmit={handleCreateItem} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800">New Catalog Item</h3>
              {addItemError && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{addItemError}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor="wl-add-name" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Name *</label>
                  <input
                    id="wl-add-name"
                    required
                    value={addItemFormData.name}
                    onChange={e => setAddItemFormData(d => ({ ...d, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Product name"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="wl-add-price" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Price *</label>
                  <input
                    id="wl-add-price"
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={addItemFormData.price}
                    onChange={e => setAddItemFormData(d => ({ ...d, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="wl-add-sku" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">SKU</label>
                  <input
                    id="wl-add-sku"
                    value={addItemFormData.sku}
                    onChange={e => setAddItemFormData(d => ({ ...d, sku: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Optional SKU"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={addItemLoading}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition disabled:opacity-50"
                >
                  {addItemLoading ? 'Saving...' : 'Save Item'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddItemForm(false); setAddItemError(null); }}
                  className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {catalogLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800 mx-auto"></div>
              <p className="mt-4 text-slate-500 text-sm">Loading catalog...</p>
            </div>
          )}

          {catalogError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm">{catalogError}</div>
          )}

          {!catalogLoading && !catalogError && products.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">No products yet. Add your first item above.</div>
          )}

          {!catalogLoading && !catalogError && products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{p.category || 'General'}</div>
                  <div className="font-semibold text-slate-800">{p.name}</div>
                  {p.sku && <div className="text-xs text-slate-400">SKU: {p.sku}</div>}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-emerald-700 font-bold text-sm">${p.price}</span>
                    <span className="text-xs text-slate-400">MOQ: {p.moq || 1}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
      case 'COLLECTIONS': return <WLCollectionsPanel />;
      case 'ORDERS':      return <WLOrdersPanel />;
      case 'DOMAINS':     return <WLDomainsPanel tenantSlug={currentTenant.slug} />;
      default:            return <WLStubPanel title="Coming Soon" description="This panel is under construction." />;
    }
  };

  const renderExperienceContent = () => {
    if (!currentTenant) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-slate-500">Loading tenant data...</p>
          </div>
        </div>
      );
    }

    if (appState === 'TEAM_MGMT') return <TeamManagement onInvite={() => setAppState('INVITE_MEMBER')} />;
    if (appState === 'INVITE_MEMBER')
      return <InviteMemberForm onBack={() => setAppState('TEAM_MGMT')} />;
    if (appState === 'SETTINGS') return <WhiteLabelSettings tenant={currentTenant} />;
    // RCP-1 TECS 3: Orders panel — rendered before the tenant-type switch so it
    // overlays any tenant type's home view. Reset to HOME via onBack / onNavigateHome.
    // G-025 TECS 4D: DPP Passport view (G-025-DPP-SNAPSHOT-UI-EXPORT-001)
    if (expView === 'DPP') return <DPPPassport onBack={() => setExpView('HOME')} />;
    if (expView === 'ORDERS') return <EXPOrdersPanel onBack={() => setExpView('HOME')} />;
    if (expView === 'RFQS') {
      if (rfqDetailView.open && rfqDetailView.source === 'list') {
        return (
          <BuyerRfqDetailSurface
            rfq={rfqDetailView.data}
            loading={rfqDetailView.loading}
            error={rfqDetailView.error}
            onBack={handleReturnToBuyerRfqList}
            onClose={handleCloseBuyerRfqs}
          />
        );
      }

      return (
        <BuyerRfqListSurface
          rfqs={buyerRfqListView.rfqs}
          loading={buyerRfqListView.loading}
          error={buyerRfqListView.error}
          onViewDetail={rfqId => {
            void handleOpenRfqDetail(rfqId, 'list');
          }}
          onBack={handleCloseBuyerRfqs}
        />
      );
    }
    if (expView === 'SUPPLIER_RFQ_INBOX') {
      if (supplierRfqDetailView.open) {
        return (
          <SupplierRfqDetailSurface
            rfq={supplierRfqDetailView.data}
            response={supplierRfqDetailView.response}
            loading={supplierRfqDetailView.loading}
            error={supplierRfqDetailView.error}
            submitLoading={supplierRfqDetailView.submitLoading}
            submitError={supplierRfqDetailView.submitError}
            onBack={handleReturnToSupplierRfqList}
            onClose={handleCloseSupplierRfqInbox}
            onSubmitResponse={message => {
              void handleSubmitSupplierRfqResponse(message);
            }}
          />
        );
      }

      return (
        <SupplierRfqInboxSurface
          rfqs={supplierRfqListView.rfqs}
          loading={supplierRfqListView.loading}
          error={supplierRfqListView.error}
          onViewDetail={rfqId => {
            void handleOpenSupplierRfqDetail(rfqId);
          }}
          onBack={handleCloseSupplierRfqInbox}
        />
      );
    }
    // TECS-FBW-003-A: G-018 tenant escrow read surface (D-020-B: no balance; D-017-A: no tenantId in body)
    if (expView === 'ESCROW') return <EscrowPanel onBack={() => setExpView('HOME')} />;
    // TECS-FBW-006-A: G-022 tenant escalation read surface (read-only; D-017-A compliant)
    if (expView === 'ESCALATIONS') return <EscalationsPanel onBack={() => setExpView('HOME')} />;
    // TECS-FBW-004: G-019 tenant settlement preview-confirm flow (D-017-A / D-020-B compliant)
    if (expView === 'SETTLEMENT') return <SettlementPreview onBack={() => setExpView('HOME')} />;
    // TECS-FBW-005: G-019 tenant certification lifecycle panel (D-017-A / D-020-C / D-020-D compliant)
    if (expView === 'CERTIFICATIONS') return <CertificationsPanel onBack={() => setExpView('HOME')} />;
    // TECS-FBW-015: G-016 traceability CRUD panel (D-017-A compliant; Phase A: create+read only)
    if (expView === 'TRACEABILITY') return <TraceabilityPanel onBack={() => setExpView('HOME')} />;
    // TECS-FBW-016: tenant audit log read-only panel (EXPERIENCE-only; no filters/pagination; server take:50)
    if (expView === 'AUDIT_LOGS') return <TenantAuditLogs onBack={() => setExpView('HOME')} />;
    // TECS-FBW-002-B: G-017 tenant trade read-only panel (D-017-A / D-020-B compliant)
    if (expView === 'TRADES') return <TradesPanel onBack={() => setExpView('HOME')} />;

    // PW5-WL1-WIRE: WL storefront HOME — renders ProductGrid for is_white_label tenants.
    // tenantId is NEVER passed by the client. Server resolves tenant scope from JWT (D-017-A compliant).
    // Must stay above the category switch so WL tenants don't fall through to B2B/B2C content.
    if (currentTenant.is_white_label && expView === 'HOME') return <WLStorefront />;

    // B2-REM-3: Content switch reads canonical tenant_category with legacy type as compat fallback.
    switch (currentTenant.tenant_category ?? currentTenant.type) {
      case TenantType.INTERNAL:
        // B2-REM-3: INTERNAL → AggregatorShell content (explicit named policy rule, B2-DESIGN locked).
        // Falls through to AGGREGATOR content intentionally.
        // eslint-disable-next-line no-fallthrough
      case TenantType.AGGREGATOR:
        return (
          <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h1 className="text-4xl font-bold mb-4">Discover Verified Global Suppliers</h1>
              <p className="text-slate-600 max-w-2xl text-lg mb-8">
                Access over 50,000 manufacturers and wholesalers across 120 countries with deep
                capability profiles and trust indicators.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Manufacturers', count: '12,400+', color: 'blue' },
                  { label: 'Wholesalers', count: '38,200+', color: 'emerald' },
                  { label: 'Trading Houses', count: '4,100+', color: 'amber' },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <div className={`text-2xl font-bold text-slate-900`}>{stat.count}</div>
                    <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Trending Industries</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    'Industrial Chemicals',
                    'Solar Infrastructure',
                    'Agricultural Tech',
                    'Bio-Plastics',
                  ].map((cat, i) => (
                    <div
                      key={i}
                      className="group cursor-pointer bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 transition-all"
                    >
                      <div className="font-semibold group-hover:text-blue-600">{cat}</div>
                      <div className="text-xs text-slate-400">120+ Active Leads</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-blue-900 text-white p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span>🤖</span> AI Market Analysis
                </h3>
                <div className="text-sm leading-relaxed text-blue-100 font-serif italic">
                  "{aiInsight}"
                </div>
              </div>
            </section>
          </div>
        );
      case TenantType.B2B:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold">Wholesale Catalog</h1>
                <p className="text-slate-500">Tiered pricing and MOQ enforcement active.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleOpenSupplierRfqInbox();
                  }}
                  className="bg-white text-slate-700 px-4 py-2 rounded-lg font-medium border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm"
                >
                  Supplier RFQ Inbox
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleOpenBuyerRfqs();
                  }}
                  className="bg-white text-slate-700 px-4 py-2 rounded-lg font-medium border border-slate-200 shadow-sm hover:bg-slate-50 transition text-sm"
                >
                  View My RFQs
                </button>
                <button
                  onClick={() => setShowAddItemForm(v => !v)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition text-sm"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* RU-003: Inline Add Item form */}
            {showAddItemForm && (
              <form onSubmit={handleCreateItem} className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-slate-800">New Catalog Item</h3>
                {addItemError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{addItemError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-name" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Name *</label>
                    <input
                      id="b2b-add-name"
                      required
                      value={addItemFormData.name}
                      onChange={e => setAddItemFormData(d => ({ ...d, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Product name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-price" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Price *</label>
                    <input
                      id="b2b-add-price"
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={addItemFormData.price}
                      onChange={e => setAddItemFormData(d => ({ ...d, price: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="b2b-add-sku" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">SKU</label>
                    <input
                      id="b2b-add-sku"
                      value={addItemFormData.sku}
                      onChange={e => setAddItemFormData(d => ({ ...d, sku: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Optional SKU"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="b2b-add-image-url" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Image URL</label>
                  <input
                    id="b2b-add-image-url"
                    type="url"
                    value={addItemFormData.imageUrl}
                    onChange={e => setAddItemFormData(d => ({ ...d, imageUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://example.com/product-image.jpg"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={addItemLoading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {addItemLoading ? 'Saving...' : 'Save Item'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddItemForm(false); setAddItemError(null); }}
                    className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {catalogLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-4 text-slate-500">Loading catalog...</p>
              </div>
            )}

            {catalogError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                {catalogError}
              </div>
            )}

            {!catalogLoading && !catalogError && products.length === 0 && (
              <div className="text-center py-12 text-slate-500">No products available.</div>
            )}

            {!catalogLoading && !catalogError && products.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {products.map(p => (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden group shadow-sm"
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                        alt={p.name}
                      />
                    ) : (
                      <div
                        className="w-full h-40 bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-400"
                        aria-label={`${p.name} image unavailable`}
                        role="img"
                      >
                        Image unavailable
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <div className="text-xs text-slate-400 font-bold uppercase">
                        {p.category || 'General'}
                      </div>
                      <h3 className="font-bold">{p.name}</h3>
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-emerald-600 font-bold">${p.price}/unit</div>
                        <div className="text-xs text-slate-400">MOQ: {p.moq || 1}</div>
                      </div>
                      <B2BAddToCartButton product={p} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case TenantType.B2C:
        return (
          <div className="space-y-12 animate-in fade-in duration-500">
            <section className="relative h-[400px] rounded-3xl overflow-hidden flex items-center px-12">
              <img
                src="https://picsum.photos/seed/retail/1200/600"
                className="absolute inset-0 w-full h-full object-cover brightness-50"
                alt="Spring 2024 retail collections hero banner"
              />
              <div className="relative z-10 text-white max-w-lg space-y-4">
                <h1 className="text-5xl font-black leading-tight">Spring 2024 Collections.</h1>
                <p className="text-lg opacity-90">
                  Sustainably sourced, ethically manufactured. Delivered to your door.
                </p>
                <button className="bg-white text-indigo-600 px-8 py-3 rounded-full font-bold shadow-xl hover:bg-indigo-50 transition">
                  Shop Now
                </button>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">New Arrivals</h2>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => setShowAddItemForm(v => !v)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 transition"
                  >
                    + Add Item
                  </button>
                  <button
                    type="button"
                    className="text-indigo-600 font-semibold underline underline-offset-4"
                  >
                    See All
                  </button>
                </div>
              </div>

              {/* RU-003: Inline Add Item form */}
              {showAddItemForm && (
                <form onSubmit={handleCreateItem} className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4 mb-8">
                  <h3 className="font-bold text-slate-800">New Catalog Item</h3>
                  {addItemError && (
                    <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{addItemError}</div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="b2c-add-name" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Name *</label>
                      <input
                        id="b2c-add-name"
                        required
                        value={addItemFormData.name}
                        onChange={e => setAddItemFormData(d => ({ ...d, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Product name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="b2c-add-price" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Price *</label>
                      <input
                        id="b2c-add-price"
                        required
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={addItemFormData.price}
                        onChange={e => setAddItemFormData(d => ({ ...d, price: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="b2c-add-sku" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">SKU</label>
                      <input
                        id="b2c-add-sku"
                        value={addItemFormData.sku}
                        onChange={e => setAddItemFormData(d => ({ ...d, sku: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Optional SKU"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={addItemLoading}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {addItemLoading ? 'Saving...' : 'Save Item'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddItemForm(false); setAddItemError(null); }}
                      className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {catalogLoading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-4 text-slate-500">Loading products...</p>
                </div>
              )}

              {catalogError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                  {catalogError}
                </div>
              )}

              {!catalogLoading && !catalogError && products.length === 0 && (
                <div className="text-center py-12 text-slate-500">No products available.</div>
              )}

              {!catalogLoading && !catalogError && products.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {products.slice(0, 8).map(p => (
                    <div key={p.id} className="space-y-3">
                      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            className="w-full h-full object-cover hover:scale-110 transition duration-700"
                            alt={p.name}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-400"
                            aria-label={`${p.name} image unavailable`}
                            role="img"
                          >
                            Image unavailable
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">{p.name}</h4>
                        <div className="text-slate-500 font-bold">${p.price}.00</div>
                      </div>
                      <B2CAddToCartButton product={p} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        );
        // PW5-U2: TenantType.WHITE_LABEL dead storefront case removed.
        // WHITE_LABEL is a @deprecated enum value superseded by is_white_label boolean flag (B2-REM-3/B2-REM-5).
        // No tenant has tenant_category='WHITE_LABEL' post-canonicalization; this case was unreachable
        // and rendered a decorative "Explore the Collection" button with no onClick handler — a false affordance.
        // Removed 2026-03-10 (PW5-U2 dead UI gating tranche).
      default:
        return <div>Invalid Tenant Configuration</div>;
    }
  };

  const renderAdminView = () => {
    if (selectedTenant) {
      return (
        <TenantDetails
          tenant={selectedTenant}
          onBack={() => setSelectedTenant(null)}
          onImpersonate={handleImpersonate}
        />
      );
    }

    switch (adminView) {
      case 'TENANTS':
        return (
          <TenantRegistry onSelectTenant={setSelectedTenant} onImpersonate={handleImpersonate} />
        );
      case 'LOGS':
        return <AuditLogs />;
      case 'FINANCE':
        return <FinanceOps />;
      case 'AI':
        return <AiGovernance />;
      case 'HEALTH':
        return <SystemHealth />;
      case 'FLAGS':
        return <FeatureFlags />;
      case 'COMPLIANCE':
        return <ComplianceQueue />;
      case 'CASES':
        return <DisputeCases />;
      case 'TRADES':
        return <TradeOversight />;
      // TECS-FBW-006-A: G-022 control-plane escalation oversight (read-only; orgId-gated)
      case 'ESCALATIONS':
        return <EscalationOversight />;
      // TECS-FBW-005: G-019 cross-tenant certification read surface (D-022-C: read-only)
      case 'CERTIFICATIONS':
        return <CertificationsAdmin />;
      // TECS-FBW-015: G-016 cross-tenant traceability inspection (Phase A: read-only)
      case 'TRACEABILITY':
        return <TraceabilityAdmin />;
      // TECS-FBW-007: marketplace_cart_summaries projection admin panel (read-only)
      case 'CART_SUMMARIES':
        return <CartSummariesPanel />;
      // PW5-W2: G-018 cross-tenant escrow admin read panel (D-020-B: no balance)
      case 'ESCROW_ADMIN':
        return <EscrowAdminPanel />;
      // PW5-W3-FE: Settlement admin read panel (backend route: 14aea49)
      case 'SETTLEMENT_ADMIN':
        return <SettlementAdminPanel />;
      // PW5-W4: G-021 maker-checker approval queue console (read-only)
      case 'MAKER_CHECKER':
        return <MakerCheckerConsole />;
      case 'RBAC':
        return <AdminRBAC />;
      case 'EVENTS':
        return <EventStream />;
      default:
        return null;
    }
  };

  // Cart toggle button with item count badge
  const CartToggleButton: React.FC<{ setShowCart: (show: boolean) => void }> = ({
    setShowCart,
  }) => {
    const { itemCount } = useCart();
    return (
      <button
        onClick={() => setShowCart(true)}
        className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg shadow-sm hover:text-indigo-600 transition relative"
        title="Shopping Cart"
      >
        🛒
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {itemCount}
          </span>
        )}
      </button>
    );
  };

  // Cart-aware Add to Cart button components
  const B2BAddToCartButton: React.FC<{ product: CatalogItem }> = ({ product }) => {
    return (
      <button
        type="button"
        onClick={() => handleOpenRfqDialog(product)}
        className="w-full mt-4 border border-slate-200 py-2 rounded text-sm font-semibold hover:bg-slate-50 transition"
      >
        Request Quote
      </button>
    );
  };

  const B2CAddToCartButton: React.FC<{ product: CatalogItem }> = ({ product }) => {
    const { addToCart } = useCart();
    const [adding, setAdding] = useState(false);
    // TECS-FBW-MOQ: surface add-to-cart errors (e.g. MOQ_NOT_MET 422) to user
    const [addError, setAddError] = useState<string | null>(null);

    const handleAddToCart = async () => {
      setAdding(true);
      setAddError(null);
      try {
        await addToCart(product.id, 1);
      } catch (error) {
        console.error('Failed to add to cart:', error);
        if (error instanceof APIError) {
          setAddError(error.message);
        } else {
          setAddError('Failed to add item. Please try again.');
        }
      } finally {
        setAdding(false);
      }
    };

    return (
      <div className="w-full">
        <button
          onClick={handleAddToCart}
          disabled={adding}
          className="w-full mt-2 bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {adding ? 'Adding...' : 'Add to Cart'}
        </button>
        {addError && (
          <p className="mt-1 text-xs text-rose-600 font-medium">{addError}</p>
        )}
      </div>
    );
  };

  const renderCurrentState = () => {
    switch (appState) {
      case 'AUTH':
        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="absolute top-6 flex gap-4">
              <button
                onClick={() => setAuthRealm('TENANT')}
                className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${authRealm === 'TENANT' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                Tenant Access
              </button>
              <button
                onClick={() => setAuthRealm('CONTROL_PLANE')}
                className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${authRealm === 'CONTROL_PLANE' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                Staff Control Plane
              </button>
            </div>
            <AuthForm realm={authRealm} onSuccess={handleAuthSuccess} />
            <button
              onClick={() => setAppState('FORGOT_PASSWORD')}
              className="mt-4 text-[10px] font-bold uppercase text-slate-400 hover:text-indigo-600 tracking-widest"
            >
              Forgot Password?
            </button>
          </div>
        );
      case 'FORGOT_PASSWORD':
        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <ForgotPassword onBack={() => setAppState('AUTH')} />
          </div>
        );
      case 'VERIFY_EMAIL':
        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <VerifyEmail onVerified={() => setAppState('ONBOARDING')} />
          </div>
        );
      case 'TOKEN_HANDLER':
        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <TokenHandler onComplete={() => setAppState('AUTH')} />
          </div>
        );
      case 'ONBOARDING':
        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <OnboardingFlow
              inviteToken={pendingInviteToken ?? undefined}
              onComplete={async (formData: any) => {
                if (pendingInviteToken) {
                  const raw = await activateTenant({
                      inviteToken: pendingInviteToken,
                      userData: {
                        email: formData.email,
                        password: formData.password,
                      },
                      tenantData: {
                        name: formData.orgName || undefined,
                        industry: formData.industry || undefined,
                      },
                    }) as any;
                    // Store JWT so all subsequent tenant API calls are authenticated
                    setToken(raw.token, 'TENANT');
                    // Seed tenant state from activation response (use server-returned type)
                    setTenants([{
                      id: raw.tenant.id,
                      slug: raw.tenant.slug,
                      name: raw.tenant.name,
                      type: (raw.tenant.type ?? 'B2B') as TenantType,
                      status: 'ACTIVE',
                      plan: 'TRIAL',
                      createdAt: '',
                      updatedAt: '',
                    } as Tenant]);
                    setCurrentTenantId(raw.tenant.id);
                    setPendingInviteToken(null);
                    setAppState('EXPERIENCE');
                } else {
                  setAppState('EXPERIENCE');
                }
              }}
            />
          </div>
        );
      case 'CONTROL_PLANE':
        if (!canAccessControlPlane) {
          return null;
        }

        return (
          <SuperAdminShell
            authRealm="CONTROL_PLANE"
            actorIdentity={controlPlaneIdentity}
            activeView={adminView}
            onViewChange={setAdminView}
          >
            {renderAdminView()}
          </SuperAdminShell>
        );
      case 'WL_ADMIN': {
        if (!currentTenant) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-slate-500">Loading workspace...</p>
              </div>
            </div>
          );
        }
        return (
          <CartProvider>
            {tenantProvisionError && (
              <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-300 px-4 py-3 text-amber-800 text-sm text-center">
                ⚠️ {tenantProvisionError}
                <button
                  className="ml-4 text-amber-600 underline text-xs"
                  onClick={() => setTenantProvisionError(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
            <WhiteLabelAdminShell
              tenant={currentTenant}
              activeView={wlAdminView}
              onViewChange={(v) => { setWlAdminView(v as WLAdminView); setWlAdminInviting(false); }}
              onNavigateStorefront={() => setAppState('EXPERIENCE')}
            >
              {renderWLAdminContent()}
            </WhiteLabelAdminShell>
          </CartProvider>
        );
      }
      case 'TEAM_MGMT':
      case 'INVITE_MEMBER':
      case 'SETTINGS':
      case 'EXPERIENCE': {
        if (!currentTenant) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-slate-500">Loading workspace...</p>
              </div>
            </div>
          );
        }

        const props = {
          tenant: currentTenant,
          onNavigateTeam: () => setAppState('TEAM_MGMT'),
          onNavigateHome: () => { setAppState('EXPERIENCE'); setExpView('HOME'); },
          onNavigateOrders: () => setExpView('ORDERS'),
          onNavigateDpp: () => setExpView('DPP'),
          onNavigateEscrow: () => setExpView('ESCROW'),
          // TECS-FBW-006-A: G-022 tenant escalation read panel (read-only)
          onNavigateEscalations: () => setExpView('ESCALATIONS'),
          // TECS-FBW-004: G-019 tenant settlement panel navigation
          onNavigateSettlement: () => setExpView('SETTLEMENT'),
          // TECS-FBW-005: G-019 tenant certification lifecycle panel navigation
          onNavigateCertifications: () => setExpView('CERTIFICATIONS'),
          // TECS-FBW-015: G-016 traceability CRUD panel navigation
          onNavigateTraceability: () => setExpView('TRACEABILITY'),
          // TECS-FBW-016: tenant audit log read-only panel navigation
          onNavigateAuditLogs: () => setExpView('AUDIT_LOGS'),
          // TECS-FBW-002-B: G-017 tenant trade read-only panel navigation
          onNavigateTrades: () => setExpView('TRADES'),
          // B3-REM-1: wire B2CShell header cart icon to same cart-open action as CartToggleButton
          onNavigateCart: () => setShowCart(true),
        };
        // B2-REM-3: Shell resolution via canonical policy function — no silent default fallback.
        const resolvedShell = resolveExperienceShell(
          currentTenant.tenant_category ?? currentTenant.type,
          currentTenant.is_white_label
        );
        if (resolvedShell === null) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="bg-white border border-amber-300 rounded-2xl p-8 max-w-md text-center space-y-4">
                <div className="text-3xl">⚠️</div>
                <h2 className="font-bold text-slate-900">Workspace Configuration Error</h2>
                <p className="text-slate-600 text-sm">
                  Unrecognized tenant identity type. Please contact platform support.
                </p>
              </div>
            </div>
          );
        }
        const ExperienceShell = resolvedShell;
        return (
          <CartProvider>
            {tenantProvisionError && (
              <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-300 px-4 py-3 text-amber-800 text-sm text-center">
                ⚠️ {tenantProvisionError}
                <button
                  className="ml-4 text-amber-600 underline text-xs"
                  onClick={() => setTenantProvisionError(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
            <ExperienceShell {...props}>
              <div className="absolute top-4 right-4 z-[60] flex gap-2">
                <CartToggleButton setShowCart={setShowCart} />
                <button
                  onClick={() => setAppState('SETTINGS')}
                  className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg shadow-sm hover:text-indigo-600 transition"
                  title="Storefront Settings"
                >
                  ⚙️
                </button>
              </div>
              {renderExperienceContent()}
            </ExperienceShell>
            {showCart && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70] animate-in fade-in duration-200">
                <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300">
                  <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold">Your Cart</h2>
                    <button
                      onClick={() => setShowCart(false)}
                      className="text-slate-400 hover:text-slate-600 transition text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  <div className="h-[calc(100%-5rem)] overflow-y-auto">
                    {/* TECS-FBW-014: propagate checkout success to App-level ORDER_CONFIRMED state */}
                    <Cart onCheckoutSuccess={(result) => {
                      setConfirmedOrderId(result.orderId);
                      setShowCart(false);
                      setAppState('ORDER_CONFIRMED');
                    }} />
                  </div>
                </div>
              </div>
            )}
          </CartProvider>
        );
      }
      // TECS-FBW-014: post-checkout confirmation — rendered after successful checkout.
      // appState stays ORDER_CONFIRMED until user navigates away; orderId preserved in confirmedOrderId.
      case 'ORDER_CONFIRMED':
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center space-y-6">
              <div className="text-5xl">✅</div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">Order Placed!</h1>
                {confirmedOrderId && (
                  <p className="text-sm text-slate-500">
                    Order{' '}
                    <span className="font-mono font-bold text-slate-700">
                      {confirmedOrderId.slice(0, 8)}…
                    </span>{' '}
                    has been received.
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  You’ll receive a confirmation once it’s confirmed.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setExpView('ORDERS');
                    setConfirmedOrderId(null);
                    setAppState('EXPERIENCE');
                  }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition"
                >
                  View My Orders
                </button>
                <button
                  onClick={() => {
                    setExpView('HOME');
                    setConfirmedOrderId(null);
                    setAppState('EXPERIENCE');
                  }}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <div>Invalid System State</div>;
    }
  };

  const rfqSuccessContent = rfqDetailView.open ? (
    <BuyerRfqDetailSurface
      rfq={rfqDetailView.data}
      loading={rfqDetailView.loading}
      error={rfqDetailView.error}
      onBack={handleCloseRfqDetail}
      onClose={handleCloseRfqDialog}
    />
  ) : (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 text-sm text-emerald-800">
        Your request for quote was submitted for {rfqDialog.success?.quantity} unit(s). It remains non-binding until a separate quote workflow is provided.
      </div>
      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        RFQ ID: {rfqDialog.success?.rfqId}
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            void handleOpenRfqDetail();
          }}
          className="px-5 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
        >
          View RFQ Detail
        </button>
        <button
          type="button"
          onClick={handleCloseRfqDialog}
          className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative font-sans">
      {rfqDialog.open && rfqDialog.product && (
        <div className="fixed inset-0 bg-slate-950/45 z-[190] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Request Quote</h2>
              <p className="text-sm text-slate-500 mt-2">
                Submit a non-binding request for quote for <strong>{rfqDialog.product.name}</strong>.
                This starts an RFQ only and does not create an order or checkout commitment.
              </p>
            </div>

            {rfqDialog.success ? rfqSuccessContent : (
              <form className="space-y-5" onSubmit={handleSubmitRfq}>
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start">
                  <div>
                    <label htmlFor="rfq-quantity" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Quantity
                    </label>
                    <input
                      id="rfq-quantity"
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={rfqDialog.quantity}
                      onChange={e => setRfqDialog(dialog => ({ ...dialog, quantity: e.target.value, error: null }))}
                      className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <p className="mt-2 text-[11px] text-slate-500">
                      Minimum 1 unit. Default is 1 unless you set a higher amount.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="rfq-message" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Buyer Message (optional)
                    </label>
                    <textarea
                      id="rfq-message"
                      rows={4}
                      maxLength={1000}
                      value={rfqDialog.buyerMessage}
                      onChange={e => setRfqDialog(dialog => ({ ...dialog, buyerMessage: e.target.value, error: null }))}
                      placeholder="Add context such as target delivery timing, fabric preferences, or packaging needs."
                      className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <p className="mt-2 text-[11px] text-slate-500">
                      Keep it specific. This message supports RFQ initiation only and is not a purchase commitment.
                    </p>
                  </div>
                </div>

                {rfqDialog.error && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                    {rfqDialog.error}
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={handleCloseRfqDialog}
                    disabled={rfqDialog.loading}
                    className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rfqDialog.loading}
                    className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {rfqDialog.loading ? 'Submitting...' : 'Submit RFQ'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* G-W3-ROUTING-001: Impersonation reason dialog */}
      {impersonationDialog.open && impersonationDialog.tenant && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 space-y-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-bold">Impersonate Tenant</h2>
              <p className="text-sm text-slate-500 mt-1">
                You are about to impersonate{' '}
                <strong>{impersonationDialog.tenant.name}</strong>. A time-bounded session
                will be created with a 30-minute expiry.
              </p>
            </div>
            <div className="space-y-1">
              <label htmlFor="impersonation-reason" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                Reason (required, min 10 chars)
              </label>
              <textarea
                id="impersonation-reason"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-rose-500 outline-none"
                rows={3}
                placeholder="e.g. Investigating tenant support ticket #1234..."
                value={impersonationDialog.reason}
                onChange={e => setImpersonationDialog(d => ({ ...d, reason: e.target.value }))}
              />
              {impersonationDialog.reason.length > 0 && impersonationDialog.reason.length < 10 && (
                <p className="text-[10px] text-amber-600">
                  {10 - impersonationDialog.reason.length} more character(s) required.
                </p>
              )}
            </div>
            {impersonationDialog.error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                {impersonationDialog.error}
              </div>
            )}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() =>
                  setImpersonationDialog({ open: false, tenant: null, reason: '', loading: false, error: null })
                }
                className="flex-1 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImpersonateConfirm}
                disabled={impersonationDialog.loading || impersonationDialog.reason.trim().length < 10}
                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {impersonationDialog.loading ? 'Starting...' : 'Start Impersonation'}
              </button>
            </div>
          </div>
        </div>
      )}
      {impersonation.isAdmin &&
        currentTenant &&
        (appState === 'EXPERIENCE' || appState === 'TEAM_MGMT' || appState === 'SETTINGS' || appState === 'WL_ADMIN') && (
          <div className="bg-rose-600 text-white px-6 py-2 sticky top-0 z-[100] flex justify-between items-center shadow-lg border-b border-rose-700 animate-in slide-in-from-top duration-300">
            <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              Staff Active: {controlPlaneActorLabel} impersonating {currentTenant.name} ({currentTenant.id})
              {impersonation.expiresAt && (
                <span className="text-rose-200 font-normal normal-case tracking-normal">
                  — expires {new Date(impersonation.expiresAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <button
              onClick={handleExitImpersonation}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-[10px] font-black uppercase transition"
            >
              Exit Impersonation
            </button>
          </div>
        )}

      {renderCurrentState()}

      {appState !== 'AUTH' &&
        appState !== 'FORGOT_PASSWORD' &&
        appState !== 'VERIFY_EMAIL' &&
        appState !== 'ONBOARDING' && (
          <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-3">
            {showArchitecture && (
              <div className="mb-4 w-[600px] animate-in slide-in-from-bottom-4 duration-300">
                <ArchitectureDiagram />
              </div>
            )}
            <div className="glass shadow-2xl rounded-2xl border border-slate-200 p-2 flex gap-2">
              {canAccessControlPlane && !impersonation.isAdmin && (
                <button
                  onClick={() => {
                    if (appState === 'CONTROL_PLANE') {
                      setSelectedTenant(null);
                      setAppState('EXPERIENCE');
                      return;
                    }

                    enterControlPlane();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition uppercase tracking-tighter ${appState === 'CONTROL_PLANE' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  {appState === 'CONTROL_PLANE' ? 'App Shells' : 'Control Plane'}
                </button>
              )}
              <button
                onClick={() => {
                  clearAuth();
                    clearPersistedImpersonationSession();
                    setImpersonation(EMPTY_IMPERSONATION_STATE);
                  clearControlPlaneIdentityState();
                  setAppState('AUTH');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition"
              >
                Logout
              </button>
              {appState !== 'CONTROL_PLANE' && (
                <>
                  <div className="h-8 w-px bg-slate-200 my-auto mx-1"></div>
                  <button
                    onClick={() => setShowArchitecture(!showArchitecture)}
                    className="px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition"
                  >
                    Blueprint
                  </button>
                  {!impersonation.isAdmin && tenants.length > 0 && (
                    <select
                      title="tenant-picker"
                      value={currentTenantId}
                      onChange={e => {
                        setCurrentTenantId(e.target.value);
                        setAppState('EXPERIENCE');
                      }}
                      className="bg-transparent text-[10px] font-bold border-none focus:ring-0 cursor-pointer px-4 uppercase tracking-wider"
                    >
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default App;
