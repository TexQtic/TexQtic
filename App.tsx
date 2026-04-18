import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TenantType, TenantConfig, ImpersonationState, normalizeCommercialPlan } from './types';
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
import { FinanceOps, type FinanceEscrowBridgeTarget } from './components/ControlPlane/FinanceOps';
import { AiGovernance } from './components/ControlPlane/AiGovernance';
import { SystemHealth } from './components/ControlPlane/SystemHealth';
import { FeatureFlags } from './components/ControlPlane/FeatureFlags';
import { ComplianceQueue } from './components/ControlPlane/ComplianceQueue';
import { DisputeCases, type DisputeEscalationBridgeTarget } from './components/ControlPlane/DisputeCases';
import { TradeOversight } from './components/ControlPlane/TradeOversight';
import { AdminRBAC } from './components/ControlPlane/AdminRBAC';
import { EventStream } from './components/ControlPlane/EventStream';
import { getPlatformInsights } from './services/aiService';
import {
  getAggregatorDiscoveryEntries,
  type AggregatorDiscoveryEntry,
} from './services/aggregatorDiscoveryService';
import { createTradeFromRfq } from './services/tradeService';
import {
  getCatalogItems,
  CatalogItem,
  BuyerRfqDetailResponse,
  CreateRfqRequest,
  CreateRfqResponse,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  createRfq,
  getBuyerRfqs,
  getBuyerRfqDetail,
  getSupplierRfqInbox,
  getSupplierRfqDetail,
  submitSupplierRfqResponse,
  BuyerRfqDetail,
  BuyerRfqListItem,
  SupplierRfqDetail,
  SupplierRfqDetailResponse,
  SupplierRfqListItem,
  SupplierRfqListResponse,
  SupplierRfqResponse,
  SubmitSupplierRfqResponseRequest,
  SubmitSupplierRfqResponseResult,
} from './services/catalogService';
import { CartProvider, useCart } from './contexts/CartContext';
import { Cart } from './components/Cart/Cart';
import { AggregatorDiscoveryWorkspace } from './components/Tenant/AggregatorDiscoveryWorkspace';
import { BuyerRfqDetailSurface, SupplierRfqDetailSurface } from './components/Tenant/BuyerRfqDetailSurface';
import { BuyerRfqListSurface, SupplierRfqInboxSurface } from './components/Tenant/BuyerRfqListSurface';
import { getTenants, getTenantById, startImpersonationSession, stopImpersonationSession, Tenant } from './services/controlPlaneService';
import { activateTenant } from './services/tenantService';
import { getCurrentUser } from './services/authService';
import { clearAuth, getCurrentAuthRealm, setImpersonationToken, setStoredAuthRealm, setToken, APIError } from './services/apiClient';
import {
  createControlPlaneSessionRuntimeDescriptor,
  createTenantSessionRuntimeDescriptor,
  getRuntimeLocalRouteRegistration,
  resolveRuntimeAppStateFromDescriptor,
  resolveRuntimeFamilyEntryHandoff,
  resolveRuntimeLocalRouteSelection,
  type RouteManifestKey,
  type RuntimeLocalRouteKey,
} from './runtime/sessionRuntimeDescriptor';

const CONTROL_PLANE_IDENTITY_KEY = 'texqtic_control_plane_identity';
const IMPERSONATION_SESSION_KEY = 'texqtic_impersonation_session';
const REHYDRATION_TRACE_KEY = 'texqtic_rehydration_trace';
const EMPTY_IMPERSONATION_STATE: ImpersonationState = {
  isAdmin: false,
  targetTenantId: null,
  startTime: null,
  impersonationId: null,
  token: null,
  expiresAt: null,
};

type BuyerRfqDialogState = {
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
};

type BuyerRfqDetailViewState = {
  open: boolean;
  source: 'dialog' | 'list' | null;
  rfqId: string | null;
  loading: boolean;
  error: string | null;
  data: BuyerRfqDetail | null;
};

type BuyerRfqDetailSource = Exclude<BuyerRfqDetailViewState['source'], null>;

type SupplierRfqListViewState = {
  loading: boolean;
  error: string | null;
  rfqs: SupplierRfqListItem[];
};

type SupplierRfqDetailViewState = {
  open: boolean;
  rfqId: string | null;
  loading: boolean;
  error: string | null;
  submitLoading: boolean;
  submitError: string | null;
  data: SupplierRfqDetail | null;
  response: SupplierRfqResponse | null;
};

const createInitialBuyerRfqDialogState = (): BuyerRfqDialogState => ({
  open: false,
  product: null,
  quantity: '1',
  buyerMessage: '',
  loading: false,
  error: null,
  success: null,
});

const createInitialBuyerRfqDetailViewState = (): BuyerRfqDetailViewState => ({
  open: false,
  source: null,
  rfqId: null,
  loading: false,
  error: null,
  data: null,
});

const createInitialSupplierRfqListViewState = (): SupplierRfqListViewState => ({
  loading: false,
  error: null,
  rfqs: [],
});

const createInitialSupplierRfqDetailViewState = (): SupplierRfqDetailViewState => ({
  open: false,
  rfqId: null,
  loading: false,
  error: null,
  submitLoading: false,
  submitError: null,
  data: null,
  response: null,
});

const resolveBuyerRfqOpenAction = ({
  product,
  isVerificationBlockedTenantWorkspace,
  verificationBlockedActionMessage,
}: {
  product: CatalogItem;
  isVerificationBlockedTenantWorkspace: boolean;
  verificationBlockedActionMessage: string;
}) => {
  if (isVerificationBlockedTenantWorkspace) {
    return {
      blocked: true as const,
      catalogError: verificationBlockedActionMessage,
      dialog: null,
    };
  }

  return {
    blocked: false as const,
    catalogError: null,
    dialog: {
      ...createInitialBuyerRfqDialogState(),
      open: true,
      product,
      quantity: product.moq ? String(product.moq) : '1',
    },
  };
};

const resolveBuyerRfqCloseState = () => ({
  dialog: createInitialBuyerRfqDialogState(),
  detailView: createInitialBuyerRfqDetailViewState(),
});

const resolveBuyerRfqSubmitPayload = (dialog: BuyerRfqDialogState) => {
  if (!dialog.product) {
    return {
      error: 'A catalog item is required to submit an RFQ.',
      payload: null,
    };
  }

  const quantityInput = dialog.quantity.trim();
  const quantity = Number(quantityInput);
  if (
    quantityInput.length === 0 ||
    Number.isNaN(quantity) ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return {
      error: 'Quantity must be an integer of at least 1.',
      payload: null,
    };
  }

  const buyerMessage = dialog.buyerMessage.trim();

  return {
    error: null,
    payload: {
      catalogItemId: dialog.product.id,
      quantity,
      ...(buyerMessage ? { buyerMessage } : {}),
    } satisfies CreateRfqRequest,
  };
};

const resolveBuyerRfqSubmitSuccess = (response: CreateRfqResponse) => ({
  dialogPatch: {
    loading: false,
    error: null,
    success: {
      rfqId: response.rfq.id,
      quantity: response.rfq.quantity,
    },
  } satisfies Pick<BuyerRfqDialogState, 'loading' | 'error' | 'success'>,
  detailView: {
    ...createInitialBuyerRfqDetailViewState(),
    rfqId: response.rfq.id,
  },
});

const resolveBuyerRfqSubmitError = (error: unknown) => {
  return error instanceof APIError
    ? error.message
    : 'Failed to submit your request for quote. Please try again.';
};

const resolveBuyerRfqDetailOpenAction = ({
  rfqId,
  fallbackRfqId,
  source = 'dialog',
  currentDetailView,
}: {
  rfqId?: string;
  fallbackRfqId?: string | null;
  source?: BuyerRfqDetailSource;
  currentDetailView: BuyerRfqDetailViewState;
}) => {
  const nextRfqId = rfqId ?? fallbackRfqId;
  if (!nextRfqId) {
    return {
      kind: 'noop' as const,
      rfqId: null,
      detailView: null,
    };
  }

  if (
    currentDetailView.rfqId === nextRfqId
    && currentDetailView.data
    && currentDetailView.source === source
  ) {
    return {
      kind: 'reuse' as const,
      rfqId: nextRfqId,
      detailView: {
        ...currentDetailView,
        open: true,
        error: null,
      },
    };
  }

  return {
    kind: 'load' as const,
    rfqId: nextRfqId,
    detailView: {
      open: true,
      source,
      rfqId: nextRfqId,
      loading: true,
      error: null,
      data: null,
    } satisfies BuyerRfqDetailViewState,
  };
};

const resolveBuyerRfqDetailSuccess = ({
  rfqId,
  source,
  response,
}: {
  rfqId: string;
  source: BuyerRfqDetailSource;
  response: BuyerRfqDetailResponse;
}) => ({
  open: true,
  source,
  rfqId,
  loading: false,
  error: null,
  data: response.rfq,
} satisfies BuyerRfqDetailViewState);

const resolveBuyerRfqDetailError = ({
  rfqId,
  source,
  error,
}: {
  rfqId: string;
  source: BuyerRfqDetailSource;
  error: unknown;
}) => ({
  open: true,
  source,
  rfqId,
  loading: false,
  error: error instanceof APIError ? error.message : 'Unable to load RFQ detail right now.',
  data: null,
} satisfies BuyerRfqDetailViewState);

const loadBuyerRfqDetailContinuity = async ({
  rfqId,
  source,
  loadBuyerRfqDetail,
}: {
  rfqId: string;
  source: BuyerRfqDetailSource;
  loadBuyerRfqDetail: (rfqId: string) => Promise<BuyerRfqDetailResponse>;
}) => {
  try {
    const response = await loadBuyerRfqDetail(rfqId);
    return resolveBuyerRfqDetailSuccess({ rfqId, source, response });
  } catch (error) {
    return resolveBuyerRfqDetailError({ rfqId, source, error });
  }
};

const resolveSupplierRfqInboxOpenAction = (currentListView: SupplierRfqListViewState) => ({
  detailView: createInitialSupplierRfqDetailViewState(),
  listView: {
    ...currentListView,
    loading: true,
    error: null,
  } satisfies SupplierRfqListViewState,
});

const loadSupplierRfqInboxContinuity = async ({
  loadSupplierRfqInbox,
}: {
  loadSupplierRfqInbox: () => Promise<SupplierRfqListResponse>;
}) => {
  try {
    const response = await loadSupplierRfqInbox();
    return {
      loading: false,
      error: null,
      rfqs: response.rfqs,
    } satisfies SupplierRfqListViewState;
  } catch (error) {
    return {
      loading: false,
      error: error instanceof APIError ? error.message : 'Unable to load the supplier RFQ inbox right now.',
      rfqs: [],
    } satisfies SupplierRfqListViewState;
  }
};

const resolveSupplierRfqDetailOpenAction = ({
  rfqId,
  currentDetailView,
}: {
  rfqId: string;
  currentDetailView: SupplierRfqDetailViewState;
}) => {
  const existingResponse = currentDetailView.rfqId === rfqId ? currentDetailView.response : null;

  if (currentDetailView.rfqId === rfqId && currentDetailView.data) {
    return {
      kind: 'reuse' as const,
      detailView: {
        ...currentDetailView,
        open: true,
        error: null,
        submitError: null,
      },
    };
  }

  return {
    kind: 'load' as const,
    detailView: {
      open: true,
      rfqId,
      loading: true,
      error: null,
      submitLoading: false,
      submitError: null,
      data: null,
      response: existingResponse,
    } satisfies SupplierRfqDetailViewState,
  };
};

const loadSupplierRfqDetailContinuity = async ({
  rfqId,
  existingResponse,
  loadSupplierRfqDetail,
}: {
  rfqId: string;
  existingResponse: SupplierRfqResponse | null;
  loadSupplierRfqDetail: (rfqId: string) => Promise<SupplierRfqDetailResponse>;
}) => {
  try {
    const response = await loadSupplierRfqDetail(rfqId);
    return {
      open: true,
      rfqId,
      loading: false,
      error: null,
      submitLoading: false,
      submitError: null,
      data: response.rfq,
      response: existingResponse,
    } satisfies SupplierRfqDetailViewState;
  } catch (error) {
    return {
      open: true,
      rfqId,
      loading: false,
      error: error instanceof APIError ? error.message : 'Unable to load supplier RFQ detail right now.',
      submitLoading: false,
      submitError: null,
      data: null,
      response: existingResponse,
    } satisfies SupplierRfqDetailViewState;
  }
};

const resolveSupplierRfqRespondSubmitAction = ({
  message,
  currentDetailView,
}: {
  message: string;
  currentDetailView: SupplierRfqDetailViewState;
}) => {
  if (!message.trim()) {
    return {
      kind: 'validation-error' as const,
      payload: null,
      detailView: {
        ...currentDetailView,
        submitLoading: false,
        submitError: 'Response message is required.',
      } satisfies SupplierRfqDetailViewState,
    };
  }

  return {
    kind: 'submit' as const,
    payload: {
      message,
    } satisfies SubmitSupplierRfqResponseRequest,
    detailView: {
      ...currentDetailView,
      submitLoading: true,
      submitError: null,
    } satisfies SupplierRfqDetailViewState,
  };
};

const resolveSupplierRfqRespondSuccess = ({
  rfqId,
  currentDetailView,
  currentListView,
  result,
}: {
  rfqId: string;
  currentDetailView: SupplierRfqDetailViewState;
  currentListView: SupplierRfqListViewState;
  result: SubmitSupplierRfqResponseResult;
}) => ({
  detailView: {
    ...currentDetailView,
    submitLoading: false,
    submitError: null,
    data: currentDetailView.data
      ? {
          ...currentDetailView.data,
          status: result.rfq.status,
          updated_at: result.response.updated_at,
        }
      : currentDetailView.data,
    response: result.response,
  } satisfies SupplierRfqDetailViewState,
  listView: {
    ...currentListView,
    rfqs: currentListView.rfqs.map(rfq =>
      rfq.id === rfqId
        ? {
            ...rfq,
            status: result.rfq.status,
            updated_at: result.response.updated_at,
          }
        : rfq
    ),
  } satisfies SupplierRfqListViewState,
});

const resolveSupplierRfqRespondError = ({
  currentDetailView,
  currentListView,
  error,
}: {
  currentDetailView: SupplierRfqDetailViewState;
  currentListView: SupplierRfqListViewState;
  error: unknown;
}) => ({
  detailView: {
    ...currentDetailView,
    submitLoading: false,
    submitError: error instanceof APIError ? error.message : 'Unable to submit the supplier response right now.',
  } satisfies SupplierRfqDetailViewState,
  listView: currentListView,
});

const submitSupplierRfqResponseContinuity = async ({
  rfqId,
  payload,
  currentDetailView,
  currentListView,
  submitResponse,
}: {
  rfqId: string;
  payload: SubmitSupplierRfqResponseRequest;
  currentDetailView: SupplierRfqDetailViewState;
  currentListView: SupplierRfqListViewState;
  submitResponse: (
    rfqId: string,
    payload: SubmitSupplierRfqResponseRequest
  ) => Promise<SubmitSupplierRfqResponseResult>;
}) => {
  try {
    const result = await submitResponse(rfqId, payload);
    return resolveSupplierRfqRespondSuccess({
      rfqId,
      currentDetailView,
      currentListView,
      result,
    });
  } catch (error) {
    return resolveSupplierRfqRespondError({
      currentDetailView,
      currentListView,
      error,
    });
  }
};

const VERIFICATION_BLOCKED_VIEWS = new Set([
  'TRADES',
  'RFQS',
  'SUPPLIER_RFQ_INBOX',
  'ESCROW',
  'SETTLEMENT',
]);
const ENTERPRISE_TRADE_BRIDGE_CURRENCY = 'USD';
const ENTERPRISE_HOME_CATALOG_FIRST_PAINT_LIMIT = 8;
const ENTERPRISE_HOME_CATALOG_TAIL_LIMIT = 12;
const ENTERPRISE_HOME_CATALOG_TAIL_DELAY_MS = 250;
const DEFAULT_DOCUMENT_TITLE = 'TexQtic';
const DOCUMENT_TITLE_HOME_ROUTES = new Set(['Catalog', 'Storefront Home', 'Workspace Home']);

function joinDocumentTitle(...segments: Array<string | null | undefined>) {
  return segments.filter((segment): segment is string => Boolean(segment)).join(' | ');
}

function normalizeDocumentRouteTitle(title: string | null | undefined) {
  if (!title || DOCUMENT_TITLE_HOME_ROUTES.has(title)) {
    return null;
  }

  return title;
}

function buildTradeReferenceFromRfq(rfqId: string): string {
  return `TRD-RFQ-${rfqId.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

const WL_ADMIN_VIEWS = ['BRANDING', 'STAFF', 'PRODUCTS', 'COLLECTIONS', 'ORDERS', 'DOMAINS'] as const;
type WLAdminView = (typeof WL_ADMIN_VIEWS)[number];

const EXPERIENCE_VIEWS = [
  'HOME',
  'ORDERS',
  'DPP',
  'ESCROW',
  'ESCALATIONS',
  'SETTLEMENT',
  'CERTIFICATIONS',
  'TRACEABILITY',
  'AUDIT_LOGS',
  'TRADES',
  'RFQS',
  'SUPPLIER_RFQ_INBOX',
] as const;
type ExperienceView = (typeof EXPERIENCE_VIEWS)[number];

const normalizeWlAdminView = (view: string): WLAdminView => {
  if ((WL_ADMIN_VIEWS as readonly string[]).includes(view)) {
    return view as WLAdminView;
  }

  return 'BRANDING';
};

const normalizeExperienceView = (view: string): ExperienceView => {
  if ((EXPERIENCE_VIEWS as readonly string[]).includes(view)) {
    return view as ExperienceView;
  }

  return 'HOME';
};

const ONBOARDING_STATUS_CONTINUITY = {
  PENDING_VERIFICATION: {
    title: 'Business Verification In Review',
    detail:
      'Trade, RFQ, escrow, and settlement capabilities stay disabled until your business verification is approved.',
    bannerClassName: 'bg-blue-50 border-b border-blue-200 text-blue-900',
    panelClassName: 'bg-white border border-amber-200',
    badgeClassName: 'text-amber-800 bg-amber-50 border border-amber-200',
    bannerText:
      'Business verification has been submitted and is pending review. Trade and fund operations remain disabled until approval is recorded.',
  },
  VERIFICATION_REJECTED: {
    title: 'Business Verification Not Approved',
    detail:
      'Trade, RFQ, escrow, and settlement capabilities remain disabled because your submitted business verification was rejected.',
    bannerClassName: 'bg-rose-50 border-b border-rose-200 text-rose-900',
    panelClassName: 'bg-white border border-rose-200',
    badgeClassName: 'text-rose-800 bg-rose-50 border border-rose-200',
    bannerText:
      'Your business verification was not approved. Trade and fund operations remain disabled until a new approval outcome is recorded.',
  },
  VERIFICATION_NEEDS_MORE_INFO: {
    title: 'More Verification Information Required',
    detail:
      'Trade, RFQ, escrow, and settlement capabilities remain disabled until additional business verification information is provided and reviewed.',
    bannerClassName: 'bg-amber-50 border-b border-amber-300 text-amber-900',
    panelClassName: 'bg-white border border-amber-300',
    badgeClassName: 'text-amber-900 bg-amber-50 border border-amber-300',
    bannerText:
      'Your business verification requires more information. Trade and fund operations remain disabled until the verification review is completed.',
  },
} as const;

const getOnboardingStatusContinuity = (status: string | null | undefined) => {
  if (!status) {
    return null;
  }

  return ONBOARDING_STATUS_CONTINUITY[status as keyof typeof ONBOARDING_STATUS_CONTINUITY] ?? null;
};

type StoredImpersonationSession = {
  adminId: string;
  state: ImpersonationState;
};

type RehydrationTracePayload = Record<string, unknown>;

const summarizeTenantIdentity = (tenant?: {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  type?: string | null;
  tenant_category?: string | null;
  is_white_label?: boolean | null;
  status?: string | null;
  plan?: string | null;
} | null) => {
  if (!tenant) {
    return null;
  }

  return {
    id: tenant.id ?? null,
    slug: tenant.slug ?? null,
    name: tenant.name ?? null,
    type: tenant.type ?? null,
    tenant_category: tenant.tenant_category ?? null,
    is_white_label: tenant.is_white_label ?? null,
    status: tenant.status ?? null,
    plan: tenant.plan ?? null,
  };
};

const appendRehydrationTrace = (event: string, payload: RehydrationTracePayload = {}) => {
  if (typeof globalThis.window === 'undefined') {
    return;
  }

  const entry = {
    ts: new Date().toISOString(),
    event,
    payload,
  };

  try {
    const existing = window.sessionStorage.getItem(REHYDRATION_TRACE_KEY);
    const parsed = existing ? JSON.parse(existing) : [];
    const next = Array.isArray(parsed) ? [...parsed, entry].slice(-100) : [entry];
    window.sessionStorage.setItem(REHYDRATION_TRACE_KEY, JSON.stringify(next));
    console.info('[rehydration-trace]', entry);
  } catch {
    console.info('[rehydration-trace]', entry);
  }
};

const readStoredTenantJwtClaims = (): { userId: string | null; tenantId: string | null; role: string | null } | null => {
  if (typeof globalThis.window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('texqtic_tenant_token');
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
    const decoded = JSON.parse(globalThis.atob(padded)) as {
      userId?: unknown;
      tenantId?: unknown;
      role?: unknown;
    };

    return {
      userId: typeof decoded.userId === 'string' ? decoded.userId : null,
      tenantId: typeof decoded.tenantId === 'string' ? decoded.tenantId : null,
      role: typeof decoded.role === 'string' ? decoded.role : null,
    };
  } catch {
    return null;
  }
};

const resolveTenantRole = (role: string | null | undefined, tenantId?: string | null) => {
  if (role) {
    return role;
  }

  const claims = readStoredTenantJwtClaims();
  if (!claims) {
    return null;
  }

  if (tenantId && claims.tenantId && claims.tenantId !== tenantId) {
    return null;
  }

  return claims.role;
};

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
    const decoded = JSON.parse(globalThis.atob(padded)) as {
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
  appendRehydrationTrace('buildTenantSnapshot:input', {
    tenant: summarizeTenantIdentity(tenant),
  });

  if (!tenant?.id || !tenant.slug || !tenant.name || !tenant.status || !tenant.plan) {
    appendRehydrationTrace('buildTenantSnapshot:output', {
      tenant: null,
      reason: 'missing_required_fields',
    });
    return null;
  }

  if (!tenant.tenant_category || typeof tenant.is_white_label !== 'boolean') {
    appendRehydrationTrace('buildTenantSnapshot:output', {
      tenant: null,
      reason: 'incomplete_canonical_identity',
    });
    return null;
  }

  const normalizedSnapshot: Tenant = {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    type: (tenant.type ?? tenant.tenant_category) as TenantType,
    tenant_category: tenant.tenant_category,
    is_white_label: tenant.is_white_label,
    status: tenant.status as any,
    plan: normalizeCommercialPlan(tenant.plan),
    createdAt: '',
    updatedAt: '',
  };

  appendRehydrationTrace('buildTenantSnapshot:output', {
    tenant: summarizeTenantIdentity(normalizedSnapshot),
  });

  return normalizedSnapshot;
};

const persistImpersonationSession = (session: StoredImpersonationSession | null) => {
  if (!session) {
    localStorage.removeItem(IMPERSONATION_SESSION_KEY);
    return;
  }

  localStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(session));
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
    };

    if (typeof parsed.adminId !== 'string') {
      return null;
    }

    const targetTenantId =
      typeof parsed.state?.targetTenantId === 'string' ? parsed.state.targetTenantId : undefined;
    const state = readStoredImpersonationState(parsed.state, targetTenantId);
    if (!state) {
      return null;
    }

    return {
      adminId: parsed.adminId,
      state,
    };
  } catch {
    return null;
  }
};

const resolveCanonicalImpersonationTenant = (
  tenant: {
    id?: string | null;
    slug?: string | null;
    name?: string | null;
    type?: string | null;
    tenant_category?: string | null;
    is_white_label?: boolean | null;
    status?: string | null;
    plan?: string | null;
  } | null | undefined,
  targetTenantId: string | null | undefined
) => {
  const snapshot = buildTenantSnapshot(tenant);
  if (!snapshot || !targetTenantId || snapshot.id !== targetTenantId) {
    return null;
  }

  return snapshot;
};

const resolveTenantBootstrapAuthView = ({
  authRealm,
  tenantRestorePending,
  tenantBootstrapBlockedMessage,
  tenantProvisionError,
}: {
  authRealm: 'TENANT' | 'CONTROL_PLANE';
  tenantRestorePending: boolean;
  tenantBootstrapBlockedMessage: string | null;
  tenantProvisionError: string | null;
}) => {
  if (authRealm === 'TENANT' && tenantRestorePending) {
    return 'TENANT_RESOLVING' as const;
  }

  if (authRealm === 'TENANT' && (tenantBootstrapBlockedMessage || tenantProvisionError)) {
    return 'TENANT_BLOCKED' as const;
  }

  return 'AUTH_FORM' as const;
};

export const __PHASE1_FOUNDATION_CORRECTION_TESTING__ = {
  readStoredTenantJwtClaims,
  buildTenantSnapshot,
  readStoredImpersonationSession,
  resolveCanonicalImpersonationTenant,
  resolveTenantBootstrapAuthView,
};

export const __B2B_RFQ_INITIATION_TESTING__ = {
  createInitialBuyerRfqDialogState,
  createInitialBuyerRfqDetailViewState,
  resolveBuyerRfqOpenAction,
  resolveBuyerRfqCloseState,
  resolveBuyerRfqSubmitPayload,
  resolveBuyerRfqSubmitSuccess,
  resolveBuyerRfqSubmitError,
};

export const __B2B_RFQ_DETAIL_TESTING__ = {
  resolveBuyerRfqDetailOpenAction,
  loadBuyerRfqDetailContinuity,
};

export const __B2B_SUPPLIER_INBOX_TESTING__ = {
  resolveSupplierRfqInboxOpenAction,
  loadSupplierRfqInboxContinuity,
};

export const __B2B_SUPPLIER_DETAIL_TESTING__ = {
  createInitialSupplierRfqDetailViewState,
  resolveSupplierRfqDetailOpenAction,
  loadSupplierRfqDetailContinuity,
};

export const __B2B_SUPPLIER_RESPOND_TESTING__ = {
  resolveSupplierRfqRespondSubmitAction,
  submitSupplierRfqResponseContinuity,
};

const clearPersistedImpersonationSession = () => {
  setImpersonationToken(null);
  persistImpersonationSession(null);
};

const App: React.FC = () => {

  useEffect(() => {
    const navigationEntry = window.performance.getEntriesByType('navigation')[0] as
      | { type?: string }
      | undefined;
    const navigationType = navigationEntry?.type ?? 'unknown';

    if (navigationType === 'reload') {
      window.sessionStorage.removeItem(REHYDRATION_TRACE_KEY);
    }

    appendRehydrationTrace('app:mount', {
      navigationType,
      hasTenantToken: !!localStorage.getItem('texqtic_tenant_token'),
      hasAdminToken: !!localStorage.getItem('texqtic_admin_token'),
      storedRealm: getCurrentAuthRealm('TENANT'),
    });
  }, []);

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
  const [authRealm, setAuthRealm] = useState<'TENANT' | 'CONTROL_PLANE'>(
    () => getCurrentAuthRealm('TENANT') ?? 'TENANT'
  );
  const effectiveRealm = useMemo(
    () => (appState === 'AUTH' ? authRealm : getCurrentAuthRealm() ?? 'TENANT'),
    [appState, authRealm]
  );
  const canAccessControlPlane = getCurrentAuthRealm() === 'CONTROL_PLANE';
  // Wave 4 P1: active panel in the WL Store Admin console
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
  const [expView, setExpView] = useState<ExperienceView>('HOME');

  // Tenant management state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [_tenantsLoading, setTenantsLoading] = useState(false);
  const [_tenantsError, setTenantsError] = useState<string | null>(null);
  const [tenantProvisionError, setTenantProvisionError] = useState<string | null>(null);
  const [tenantBootstrapBlockedMessage, setTenantBootstrapBlockedMessage] = useState<string | null>(null);
  const [tenantRestorePending, setTenantRestorePending] = useState(() => {
    const storedRealm = getCurrentAuthRealm('TENANT') ?? 'TENANT';
    return storedRealm === 'TENANT' && !!localStorage.getItem('texqtic_tenant_token');
  });
  const [currentTenantId, setCurrentTenantId] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<TenantConfig | null>(null);
  const [controlPlaneIdentity, setControlPlaneIdentity] = useState<ControlPlaneIdentity | null>(null);
  const [tenantAuthenticatedRole, setTenantAuthenticatedRole] = useState<string | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationState>(EMPTY_IMPERSONATION_STATE);

  /** G-W3-ROUTING-001: Reason-input dialog before API-backed impersonation start */
  const [impersonationDialog, setImpersonationDialog] = useState<{
    open: boolean;
    tenant: TenantConfig | null;
    reason: string;
    loading: boolean;
    error: string | null;
  }>({ open: false, tenant: null, reason: '', loading: false, error: null });

  const [rfqDialog, setRfqDialog] = useState<BuyerRfqDialogState>(createInitialBuyerRfqDialogState);

  const enterWlAdmin = (view: WLAdminView = 'BRANDING') => {
    const nextSelection = resolveRuntimeLocalRouteSelection(tenantWlAdminRuntimeHandoff?.manifestEntry ?? null, {
      wlAdminView: normalizeWlAdminView(view),
      wlAdminInviting: false,
    });

    if (!nextSelection) {
      return;
    }

    navigateWlAdminManifestRoute(nextSelection.routeKey);
  };
  const [rfqDetailView, setRfqDetailView] = useState<BuyerRfqDetailViewState>(createInitialBuyerRfqDetailViewState);
  const [buyerRfqListView, setBuyerRfqListView] = useState<{
    loading: boolean;
    error: string | null;
    rfqs: BuyerRfqListItem[];
  }>({
    loading: false,
    error: null,
    rfqs: [],
  });
  const [supplierRfqListView, setSupplierRfqListView] = useState<SupplierRfqListViewState>(createInitialSupplierRfqListViewState);
  const [supplierRfqDetailView, setSupplierRfqDetailView] = useState<SupplierRfqDetailViewState>(createInitialSupplierRfqDetailViewState);
  const [buyerRfqTradeBridge, setBuyerRfqTradeBridge] = useState<{
    loading: boolean;
    error: string | null;
    initialTradeId: string | null;
  }>({
    loading: false,
    error: null,
    initialTradeId: null,
  });
  const lastTenantViewScopeKeyRef = useRef<string | null>(null);

  const resetTenantScopedRouteState = () => {
    setExpView('HOME');
    setShowCart(false);
    setConfirmedOrderId(null);
    setRfqDialog(createInitialBuyerRfqDialogState());
    setRfqDetailView(createInitialBuyerRfqDetailViewState());
    setBuyerRfqListView({
      loading: false,
      error: null,
      rfqs: [],
    });
    setSupplierRfqListView({
      loading: false,
      error: null,
      rfqs: [],
    });
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
    setBuyerRfqTradeBridge({
      loading: false,
      error: null,
      initialTradeId: null,
    });
  };

  const [aiInsight, setAiInsight] = useState<string>('Loading AI insights...');

  useEffect(() => {
    if (appState === 'AUTH' && authRealm !== effectiveRealm) {
      setAuthRealm(effectiveRealm);
    }
  }, [appState, authRealm, effectiveRealm]);

  const [adminView, setAdminView] = useState<AdminView>('TENANTS');
  const [disputeEscalationBridge, setDisputeEscalationBridge] = useState<DisputeEscalationBridgeTarget | null>(null);
  const [financeEscrowBridge, setFinanceEscrowBridge] = useState<FinanceEscrowBridgeTarget | null>(null);
  const controlPlaneActorLabel = useMemo(() => {
    return formatControlPlaneActorLabel(controlPlaneIdentity);
  }, [controlPlaneIdentity]);

  const enterControlPlane = () => {
    if (getCurrentAuthRealm() !== 'CONTROL_PLANE') {
      setStoredAuthRealm('TENANT');
      setAuthRealm('TENANT');
      setSelectedTenant(null);
      setDisputeEscalationBridge(null);
      setFinanceEscrowBridge(null);
      setAdminView('TENANTS');
      setAppState('EXPERIENCE');
      return;
    }

    setStoredAuthRealm('CONTROL_PLANE');
    setAuthRealm('CONTROL_PLANE');
    setSelectedTenant(null);
    setDisputeEscalationBridge(null);
    setFinanceEscrowBridge(null);
    setAdminView('TENANTS');
    setAppState('CONTROL_PLANE');
  };

  const clearControlPlaneIdentityState = () => {
    persistControlPlaneIdentity(null);
    setControlPlaneIdentity(null);
    setSelectedTenant(null);
    setDisputeEscalationBridge(null);
    setFinanceEscrowBridge(null);
    setAdminView('TENANTS');
  };

  const applyTenantBootstrapState = (tenant: Tenant, role: string | null | undefined) => {
    const resolvedRole = resolveTenantRole(role ?? null, tenant.id);
    const descriptor = createTenantSessionRuntimeDescriptor({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      tenantCategory: tenant.tenant_category,
      whiteLabelCapability: tenant.is_white_label,
      commercialPlan: tenant.plan,
      authenticatedRole: resolvedRole,
    });
    const nextState = resolveRuntimeAppStateFromDescriptor(descriptor);

    setTenants([tenant]);
    setCurrentTenantId(tenant.id);
    setTenantAuthenticatedRole(resolvedRole);

    return {
      resolvedRole,
      descriptor,
      nextState: nextState === 'EXPERIENCE' || nextState === 'WL_ADMIN' ? nextState : null,
    };
  };

  const tenantBootstrapCurrentUserOptions = {
    dedupe: true,
    retry: false,
  } as const;

  const applyControlPlaneShellEntry = (identity: ControlPlaneIdentity) => {
    const descriptor = createControlPlaneSessionRuntimeDescriptor({
      actorId: identity.id,
      actorEmail: identity.email,
      authenticatedRole: identity.role,
    });
    const nextState = resolveRuntimeAppStateFromDescriptor(descriptor);

    if (!nextState) {
      clearControlPlaneIdentityState();
      setStoredAuthRealm('CONTROL_PLANE');
      setAuthRealm('CONTROL_PLANE');
      setAppState('AUTH');
      return;
    }

    persistControlPlaneIdentity(identity);
    setControlPlaneIdentity(identity);
    setTenantAuthenticatedRole(null);
    setStoredAuthRealm('CONTROL_PLANE');
    setAuthRealm('CONTROL_PLANE');
    setSelectedTenant(null);
    setDisputeEscalationBridge(null);
    setFinanceEscrowBridge(null);
    setAdminView('TENANTS');
    setAppState(nextState);
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
  const [catalogNextCursor, setCatalogNextCursor] = useState<string | null>(null);
  const [aggregatorDiscoveryEntries, setAggregatorDiscoveryEntries] = useState<AggregatorDiscoveryEntry[]>([]);
  const [aggregatorDiscoveryLoading, setAggregatorDiscoveryLoading] = useState(false);
  const [aggregatorDiscoveryError, setAggregatorDiscoveryError] = useState<string | null>(null);
  const [aggregatorDiscoveryRefreshKey, setAggregatorDiscoveryRefreshKey] = useState(0);
  const [b2cSearchQuery, setB2cSearchQuery] = useState('');
  const [b2cVisibleCount, setB2cVisibleCount] = useState(8);
  const [b2cLoadingMore, setB2cLoadingMore] = useState(false);
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
  const [editingCatalogItemId, setEditingCatalogItemId] = useState<string | null>(null);
  const [editItemFormData, setEditItemFormData] = useState({ name: '', price: '', sku: '', imageUrl: '' });
  const [editItemLoading, setEditItemLoading] = useState(false);
  const [editItemError, setEditItemError] = useState<string | null>(null);
  const [deleteItemLoadingId, setDeleteItemLoadingId] = useState<string | null>(null);
  const editingCatalogItem = editingCatalogItemId
    ? products.find(product => product.id === editingCatalogItemId) ?? null
    : null;

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

  const activeTenantRecord = useMemo(() => {
    return tenants.find(tenant => tenant.id === currentTenantId) ?? null;
  }, [tenants, currentTenantId]);

  // Convert backend Tenant to TenantConfig for UI compatibility
  const currentTenant: TenantConfig | null = useMemo(() => {
    const tenant = activeTenantRecord;
    if (!tenant) {
      appendRehydrationTrace('currentTenant:resolved', {
        currentTenantId,
        tenant: null,
        availableTenantIds: tenants.map(t => t.id),
      });
      return null;
    }

    const resolvedTenant: TenantConfig = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      type: tenant.type as TenantType,
      tenant_category: tenant.tenant_category ?? tenant.type,
      is_white_label: tenant.is_white_label ?? false,
      status: tenant.status as any,
      plan: normalizeCommercialPlan(tenant.plan),
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

    appendRehydrationTrace('currentTenant:resolved', {
      currentTenantId,
      tenant: summarizeTenantIdentity(resolvedTenant),
    });

    return resolvedTenant;
  }, [activeTenantRecord, currentTenantId, tenants]);
  const tenantRuntimeDescriptor = useMemo(() => {
    if (!activeTenantRecord) {
      return null;
    }

    return createTenantSessionRuntimeDescriptor({
      tenantId: activeTenantRecord.id,
      tenantSlug: activeTenantRecord.slug,
      tenantName: activeTenantRecord.name,
      tenantCategory: activeTenantRecord.tenant_category,
      whiteLabelCapability: activeTenantRecord.is_white_label,
      commercialPlan: activeTenantRecord.plan,
      authenticatedRole: tenantAuthenticatedRole,
    });
  }, [activeTenantRecord, tenantAuthenticatedRole]);
  const controlPlaneRuntimeDescriptor = useMemo(() => {
    if (!controlPlaneIdentity) {
      return null;
    }

    return createControlPlaneSessionRuntimeDescriptor({
      actorId: controlPlaneIdentity.id,
      actorEmail: controlPlaneIdentity.email,
      authenticatedRole: controlPlaneIdentity.role,
    });
  }, [controlPlaneIdentity]);
  const tenantHasWlAdminOverlay = tenantRuntimeDescriptor?.runtimeOverlays.includes('WL_ADMIN') ?? false;
  const tenantWorkspaceRuntimeHandoff = useMemo(() => {
    return resolveRuntimeFamilyEntryHandoff(tenantRuntimeDescriptor, 'EXPERIENCE', {
      expView,
      showCart,
    });
  }, [tenantRuntimeDescriptor, expView, showCart]);
  const tenantWlAdminRuntimeHandoff = useMemo(() => {
    return resolveRuntimeFamilyEntryHandoff(tenantRuntimeDescriptor, 'WL_ADMIN', {
      wlAdminView,
      wlAdminInviting,
    });
  }, [tenantRuntimeDescriptor, wlAdminView, wlAdminInviting]);
  const controlPlaneRuntimeHandoff = useMemo(() => {
    return resolveRuntimeFamilyEntryHandoff(controlPlaneRuntimeDescriptor, 'CONTROL_PLANE', {
      adminView,
      selectedTenantId: selectedTenant?.id ?? null,
    });
  }, [controlPlaneRuntimeDescriptor, adminView, selectedTenant]);
  const tenantRuntimeHandoff = useMemo(() => {
    switch (appState) {
      case 'EXPERIENCE':
      case 'TEAM_MGMT':
      case 'INVITE_MEMBER':
      case 'SETTINGS':
        return tenantWorkspaceRuntimeHandoff;
      case 'WL_ADMIN':
        return tenantWlAdminRuntimeHandoff;
      default:
        return null;
    }
  }, [tenantWorkspaceRuntimeHandoff, tenantWlAdminRuntimeHandoff, appState]);
  const activeControlPlaneRuntimeHandoff = useMemo(() => {
    return appState === 'CONTROL_PLANE'
      ? controlPlaneRuntimeHandoff
      : null;
  }, [controlPlaneRuntimeHandoff, appState]);
  const tenantRuntimeManifestEntry = tenantRuntimeHandoff?.manifestEntry ?? null;
  const controlPlaneRuntimeManifestEntry = activeControlPlaneRuntimeHandoff?.manifestEntry ?? null;
  const tenantContentFamily = tenantRuntimeHandoff?.contentFamily ?? null;
  const controlPlaneContentFamily = activeControlPlaneRuntimeHandoff?.contentFamily ?? null;
  const tenantLocalRouteSelection = tenantWorkspaceRuntimeHandoff?.localRouteSelection ?? null;
  const wlAdminLocalRouteSelection = tenantWlAdminRuntimeHandoff?.localRouteSelection ?? null;
  const controlPlaneLocalRouteSelection = controlPlaneRuntimeHandoff?.localRouteSelection ?? null;
  const currentOnboardingStatusContinuity = useMemo(() => {
    return getOnboardingStatusContinuity(currentTenant?.status);
  }, [currentTenant?.status]);
  const isVerificationBlockedTenantWorkspace = tenantContentFamily === 'b2b_workspace'
    && currentOnboardingStatusContinuity !== null;
  const verificationBlockedActionMessage = currentOnboardingStatusContinuity?.detail
    ?? 'Business verification approval is required before this action is available.';
  const tenantDefaultLocalRouteKey = tenantWorkspaceRuntimeHandoff?.defaultLocalRouteKey ?? null;
  const navigateTenantManifestRoute = (
    routeKey: RuntimeLocalRouteKey,
    options: { resetTradeBridge?: boolean } = {},
  ) => {
    const registration = getRuntimeLocalRouteRegistration(
      tenantWorkspaceRuntimeHandoff?.manifestEntry ?? null,
      routeKey,
    );

    if (!registration) {
      return;
    }

    if (options.resetTradeBridge) {
      setBuyerRfqTradeBridge(view => ({ ...view, initialTradeId: null }));
    }

    setAppState('EXPERIENCE');
    setShowCart(registration.route.stateBinding.showCart === true);

    if (registration.route.stateBinding.expView) {
      setExpView(normalizeExperienceView(registration.route.stateBinding.expView));
    }
  };
  const navigateTenantDefaultManifestRoute = (options: { resetTradeBridge?: boolean } = {}) => {
    if (!tenantDefaultLocalRouteKey) {
      return;
    }

    navigateTenantManifestRoute(tenantDefaultLocalRouteKey, options);
  };
  const navigateWlAdminManifestRoute = (routeKey: RuntimeLocalRouteKey) => {
    const registration = getRuntimeLocalRouteRegistration(
      tenantWlAdminRuntimeHandoff?.manifestEntry ?? null,
      routeKey,
    );

    if (!registration) {
      return;
    }

    setWlAdminView(normalizeWlAdminView(registration.route.stateBinding.wlAdminView ?? 'BRANDING'));
    setWlAdminInviting(registration.route.stateBinding.wlAdminInviting === true);
    setAppState('WL_ADMIN');
  };
  const navigateControlPlaneManifestRoute = (routeKey: RuntimeLocalRouteKey) => {
    const registration = getRuntimeLocalRouteRegistration(
      controlPlaneRuntimeHandoff?.manifestEntry ?? null,
      routeKey,
    );

    if (!registration) {
      return;
    }

    setSelectedTenant(null);

    if (registration.route.stateBinding.adminView) {
      setAdminView(registration.route.stateBinding.adminView as AdminView);
    }

    setAppState('CONTROL_PLANE');
  };
  const controlPlaneShellNavigation = controlPlaneRuntimeHandoff?.navigationSurface ?? null;
  const wlAdminShellNavigation = tenantWlAdminRuntimeHandoff?.navigationSurface ?? null;
  const tenantShellNavigation = tenantWorkspaceRuntimeHandoff?.navigationSurface ?? null;
  const b2cCatalogSectionRef = useRef<globalThis.HTMLElement | null>(null);
  const tenantWorkspaceContentFamily = tenantWorkspaceRuntimeHandoff?.contentFamily ?? null;
  const isNonWhiteLabelB2CTenant = tenantWorkspaceContentFamily === 'b2c_storefront';
  const isB2CBrowseEntrySurface = appState === 'EXPERIENCE'
    && tenantLocalRouteSelection?.routeKey === 'home'
    && isNonWhiteLabelB2CTenant;
  const showB2CHomeAuthenticatedAffordances = !isB2CBrowseEntrySurface;
  const isAggregatorDiscoveryEntrySurface = appState === 'EXPERIENCE'
    && tenantLocalRouteSelection?.routeKey === 'home'
    && tenantWorkspaceContentFamily === 'aggregator_workspace';
  const isEnterpriseCatalogEntrySurface = appState === 'EXPERIENCE'
    && tenantLocalRouteSelection?.routeKey === 'catalog'
    && tenantWorkspaceContentFamily === 'b2b_workspace';
  const isWlAdminProductsSurface = appState === 'WL_ADMIN'
    && wlAdminLocalRouteSelection?.routeKey === 'products'
    && tenantContentFamily === 'wl_admin';
  const shouldLoadAppCatalog = isEnterpriseCatalogEntrySurface
    || isB2CBrowseEntrySurface
    || isWlAdminProductsSurface;
  const tenantShellContract = useMemo(() => {
    return {
      surface: tenantShellNavigation,
      onNavigateRoute: navigateTenantManifestRoute,
      onNavigateTeam: () => {
        if (tenantHasWlAdminOverlay) {
          enterWlAdmin('STAFF');
          return;
        }

        setAppState('TEAM_MGMT');
      },
      showAuthenticatedAffordances: showB2CHomeAuthenticatedAffordances,
      b2cSearchValue: isB2CBrowseEntrySurface ? b2cSearchQuery : '',
      onB2CSearchChange: isB2CBrowseEntrySurface ? setB2cSearchQuery : undefined,
    };
  }, [
    tenantShellNavigation,
    navigateTenantManifestRoute,
    enterWlAdmin,
    tenantHasWlAdminOverlay,
    showB2CHomeAuthenticatedAffordances,
    isB2CBrowseEntrySurface,
    b2cSearchQuery,
  ]);
  const shouldShowTenantUtilityAffordances = (
    showB2CHomeAuthenticatedAffordances || !isNonWhiteLabelB2CTenant
  ) && !isVerificationBlockedTenantWorkspace;

  const documentTitle = useMemo(() => {
    if (appState === 'AUTH') {
      return authRealm === 'CONTROL_PLANE' ? 'TexQtic Admin Sign In' : 'TexQtic Sign In';
    }

    if (appState === 'TOKEN_HANDLER') {
      return 'TexQtic Account Action';
    }

    if (appState === 'ONBOARDING') {
      return currentTenant ? joinDocumentTitle(currentTenant.name, 'TexQtic Onboarding') : 'TexQtic Onboarding';
    }

    if (appState === 'CONTROL_PLANE') {
      return joinDocumentTitle(controlPlaneLocalRouteSelection?.route.title, 'TexQtic Control Plane');
    }

    if (!currentTenant) {
      return DEFAULT_DOCUMENT_TITLE;
    }

    if (tenantContentFamily === 'wl_admin') {
      return joinDocumentTitle(
        normalizeDocumentRouteTitle(wlAdminLocalRouteSelection?.route.title),
        `${currentTenant.name} Admin`,
      );
    }

    if (tenantContentFamily === 'wl_storefront') {
      return joinDocumentTitle(
        normalizeDocumentRouteTitle(tenantLocalRouteSelection?.route.title),
        currentTenant.name,
      );
    }

    if (tenantContentFamily === 'b2b_workspace') {
      if (currentOnboardingStatusContinuity) {
        return joinDocumentTitle(
          currentTenant.name,
          currentOnboardingStatusContinuity.title,
          DEFAULT_DOCUMENT_TITLE,
        );
      }

      return joinDocumentTitle(
        normalizeDocumentRouteTitle(tenantLocalRouteSelection?.route.title),
        currentTenant.name,
        'TexQtic B2B Workspace',
      );
    }

    if (tenantContentFamily === 'b2c_storefront') {
      return joinDocumentTitle(
        normalizeDocumentRouteTitle(tenantLocalRouteSelection?.route.title),
        currentTenant.name,
        'TexQtic Storefront',
      );
    }

    if (tenantContentFamily === 'aggregator_workspace') {
      return joinDocumentTitle(
        normalizeDocumentRouteTitle(tenantLocalRouteSelection?.route.title),
        currentTenant.name,
        'TexQtic Aggregator Workspace',
      );
    }

    return joinDocumentTitle(currentTenant.name, DEFAULT_DOCUMENT_TITLE);
  }, [
    appState,
    authRealm,
    currentTenant,
    tenantContentFamily,
    currentOnboardingStatusContinuity,
    tenantLocalRouteSelection,
    wlAdminLocalRouteSelection,
    controlPlaneLocalRouteSelection,
  ]);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  const tenantViewScopeKey = useMemo(() => {
    if (appState === 'AUTH' || effectiveRealm !== 'TENANT' || !currentTenantId) {
      return null;
    }

    return currentTenantId;
  }, [appState, effectiveRealm, currentTenantId]);

  useEffect(() => {
    const previousTenantViewScopeKey = lastTenantViewScopeKeyRef.current;

    if (tenantViewScopeKey === null) {
      lastTenantViewScopeKeyRef.current = null;
      return;
    }

    if (previousTenantViewScopeKey === tenantViewScopeKey) {
      return;
    }

    resetTenantScopedRouteState();
    lastTenantViewScopeKeyRef.current = tenantViewScopeKey;
  }, [tenantViewScopeKey]);

  useEffect(() => {
    appendRehydrationTrace('app:state', {
      appState,
      authRealm,
      effectiveRealm,
      currentTenantId,
      tenantCount: tenants.length,
      hasTenantToken: !!localStorage.getItem('texqtic_tenant_token'),
      hasAdminToken: !!localStorage.getItem('texqtic_admin_token'),
      currentTenant: summarizeTenantIdentity(currentTenant),
    });
  }, [appState, authRealm, effectiveRealm, currentTenantId, tenants.length, currentTenant]);

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
    if (!currentTenant || !isAggregatorDiscoveryEntrySurface) {
      return;
    }

    let cancelled = false;

    const fetchInsight = async () => {
      setAiInsight('Thinking...');
      const insight = await getPlatformInsights(
        `Provide a brief market trend analysis for a ${currentTenant.type} platform named ${currentTenant.name}.`
      );

      if (!cancelled) {
        setAiInsight(insight || 'No insights available.');
      }
    };

    void fetchInsight();

    return () => {
      cancelled = true;
    };
  }, [currentTenant, isAggregatorDiscoveryEntrySurface]);

  useEffect(() => {
    if (!currentTenant || !isAggregatorDiscoveryEntrySurface) {
      return;
    }

    let cancelled = false;

    const fetchAggregatorDiscovery = async () => {
      setAggregatorDiscoveryLoading(true);
      setAggregatorDiscoveryError(null);

      try {
        const response = await getAggregatorDiscoveryEntries({ limit: 6 });

        if (cancelled) {
          return;
        }

        setAggregatorDiscoveryEntries(response.items);
      } catch (error) {
        console.error('Failed to load aggregator discovery entries:', error);

        if (cancelled) {
          return;
        }

        setAggregatorDiscoveryEntries([]);
        setAggregatorDiscoveryError('Failed to load curated discovery records. Please try again.');
      } finally {
        if (!cancelled) {
          setAggregatorDiscoveryLoading(false);
        }
      }
    };

    void fetchAggregatorDiscovery();

    return () => {
      cancelled = true;
    };
  }, [currentTenant, isAggregatorDiscoveryEntrySurface, aggregatorDiscoveryRefreshKey]);

  // Fetch App-owned catalog items only for views that actually render App-owned product state.
  useEffect(() => {
    if (!shouldLoadAppCatalog) {
      return;
    }

    let cancelled = false;
    let tailHydrationTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const hydrateEnterpriseHomeCatalogTail = async (cursor: string) => {
      try {
        const tailResponse = await getCatalogItems({
          limit: ENTERPRISE_HOME_CATALOG_TAIL_LIMIT,
          cursor,
        });

        if (cancelled) {
          return;
        }

        setProducts(prev => [...prev, ...tailResponse.items]);
        setCatalogNextCursor(tailResponse.nextCursor);
      } catch (error) {
        console.warn('Deferred enterprise home catalog hydration failed:', error);
      }
    };

    const fetchCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError(null);

      try {
        const query = isB2CBrowseEntrySurface ? b2cSearchQuery.trim() : '';
        const initialLimit = isEnterpriseCatalogEntrySurface
          ? ENTERPRISE_HOME_CATALOG_FIRST_PAINT_LIMIT
          : 20;
        const response = await getCatalogItems({
          limit: initialLimit,
          ...(query ? { q: query } : {}),
        });

        if (cancelled) {
          return;
        }

        setProducts(response.items);
        setCatalogNextCursor(response.nextCursor);
        setB2cVisibleCount(query ? response.items.length : Math.min(8, response.items.length || 8));

        if (isEnterpriseCatalogEntrySurface && response.nextCursor) {
          tailHydrationTimer = globalThis.setTimeout(() => {
            void hydrateEnterpriseHomeCatalogTail(response.nextCursor as string);
          }, ENTERPRISE_HOME_CATALOG_TAIL_DELAY_MS);
        }
      } catch (error) {
        console.error('Failed to load catalog:', error);

        if (cancelled) {
          return;
        }

        setCatalogError('Failed to load catalog. Please try again.');
        setProducts([]);
        setCatalogNextCursor(null);
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    };

    if (isB2CBrowseEntrySurface) {
      const debounceId = globalThis.setTimeout(fetchCatalog, 200);
      return () => {
        cancelled = true;
        if (tailHydrationTimer !== null) {
          globalThis.clearTimeout(tailHydrationTimer);
        }
        globalThis.clearTimeout(debounceId);
      };
    }

    void fetchCatalog();

    return () => {
      cancelled = true;
      if (tailHydrationTimer !== null) {
        globalThis.clearTimeout(tailHydrationTimer);
      }
    };
  }, [shouldLoadAppCatalog, isB2CBrowseEntrySurface, isEnterpriseCatalogEntrySurface, b2cSearchQuery, currentTenant?.id]);

  const handleB2CShopNow = () => {
    b2cCatalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleB2CLoadMore = async () => {
    const hasHiddenLoadedProducts = products.length > b2cVisibleCount;
    if (hasHiddenLoadedProducts) {
      setB2cVisibleCount(products.length);
      return;
    }

    if (!catalogNextCursor || b2cLoadingMore) {
      return;
    }

    setB2cLoadingMore(true);
    setCatalogError(null);
    try {
      const query = b2cSearchQuery.trim();
      const response = await getCatalogItems({
        limit: 20,
        cursor: catalogNextCursor,
        ...(query ? { q: query } : {}),
      });
      setProducts(prev => [...prev, ...response.items]);
      setCatalogNextCursor(response.nextCursor);
      setB2cVisibleCount(prev => prev + response.items.length);
    } catch (error) {
      console.error('Failed to load more catalog items:', error);
      setCatalogError('Failed to load more products. Please try again.');
    } finally {
      setB2cLoadingMore(false);
    }
  };

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
      setTenantAuthenticatedRole(null);
      setSelectedTenant(null);
      setAdminView('TENANTS');
      setAuthRealm('CONTROL_PLANE');
      return;
    }

    applyControlPlaneShellEntry(identity);
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
      setTenantRestorePending(true);
      setTenantBootstrapBlockedMessage(null);
      setTenantProvisionError(null);
      setImpersonationToken(storedImpersonation.state.token);
      setStoredAuthRealm('TENANT');
      setAuthRealm('TENANT');

      try {
        const me = await getCurrentUser();
        const tenant = resolveCanonicalImpersonationTenant(me.tenant, storedImpersonation.state.targetTenantId);

        if (!tenant || cancelled) {
          throw new Error('Stored impersonation tenant is invalid.');
        }

        const bootstrapState = applyTenantBootstrapState(tenant, me.role ?? null);

        if (!bootstrapState.nextState) {
          throw new Error('Stored impersonation descriptor is invalid.');
        }

        persistControlPlaneIdentity(actorIdentity);
        setControlPlaneIdentity(actorIdentity);
        setTenantRestorePending(false);
        setTenantProvisionError(null);
        setImpersonation(storedImpersonation.state);
        setAppState(bootstrapState.nextState);
      } catch {
        if (cancelled) {
          return;
        }

        clearPersistedImpersonationSession();
        setImpersonation(EMPTY_IMPERSONATION_STATE);
        setTenantRestorePending(false);
        applyControlPlaneShellEntry(actorIdentity);
      }
    };

    void restoreImpersonationSession();

    return () => {
      cancelled = true;
    };
  }, [appState]);

  useEffect(() => {
    appendRehydrationTrace('tenantRestore:effect_enter', {
      appState,
      authRealm,
      effectiveRealm,
      storedRealm: getCurrentAuthRealm('TENANT'),
      hasTenantToken: !!localStorage.getItem('texqtic_tenant_token'),
    });

    if (appState !== 'AUTH' || authRealm !== 'TENANT') {
      setTenantRestorePending(false);
      appendRehydrationTrace('tenantRestore:effect_skip', {
        reason: 'not_auth_tenant',
        appState,
        authRealm,
      });
      return;
    }

    const storedTenantToken = localStorage.getItem('texqtic_tenant_token');
    if (!storedTenantToken) {
      setTenantRestorePending(false);
      appendRehydrationTrace('tenantRestore:effect_skip', {
        reason: 'missing_tenant_token',
        appState,
        authRealm,
      });
      return;
    }

    let cancelled = false;

    const restoreTenantSession = async () => {
      setTenantRestorePending(true);
      setTenantProvisionError(null);
      setTenantBootstrapBlockedMessage(null);

      let nextState: 'EXPERIENCE' | 'WL_ADMIN' = 'EXPERIENCE';

      const failClosedTenantBootstrap = (
        reason: string,
        details: RehydrationTracePayload = {},
        options?: { blockedMessage?: string | null }
      ) => {
        appendRehydrationTrace('tenantRestore:fail_closed', {
          reason,
          ...details,
        });
        setTenantRestorePending(false);
        clearAuth();
        setTenants([]);
        setCurrentTenantId('');
        setStoredAuthRealm('TENANT');
        setAuthRealm('TENANT');
        setTenantBootstrapBlockedMessage(options?.blockedMessage ?? null);
        setAppState('AUTH');
      };

      try {
        appendRehydrationTrace('tenantRestore:getCurrentUser:start');
        const me = await getCurrentUser(tenantBootstrapCurrentUserOptions);
        const tenant = buildTenantSnapshot(me.tenant);
        const resolvedRole = resolveTenantRole(me.role ?? null, tenant?.id ?? null);
        appendRehydrationTrace('tenantRestore:getCurrentUser:success', {
          role: resolvedRole,
          tenant: summarizeTenantIdentity(me.tenant),
        });

        if (!tenant || cancelled) {
          appendRehydrationTrace('tenantRestore:snapshot_invalid', {
            cancelled,
            tenant: summarizeTenantIdentity(tenant),
          });
          throw new Error('Tenant session could not be rehydrated.');
        }

        const bootstrapState = applyTenantBootstrapState(tenant, me.role ?? null);
        if (!bootstrapState.nextState) {
          throw new Error('Tenant session descriptor is invalid.');
        }

        nextState = bootstrapState.nextState;
        appendRehydrationTrace('tenantRestore:tenant_applied', {
          tenant: summarizeTenantIdentity(tenant),
        });

        appendRehydrationTrace('tenantRestore:next_state', {
          nextState,
          role: bootstrapState.resolvedRole,
          tenant: summarizeTenantIdentity(tenant),
        });
        setTenantRestorePending(false);
        setAppState(nextState);
      } catch (err) {
        if (cancelled) {
          appendRehydrationTrace('tenantRestore:cancelled');
          return;
        }

        appendRehydrationTrace('tenantRestore:getCurrentUser:error', {
          message: err instanceof Error ? err.message : 'unknown_error',
          status: err instanceof APIError ? err.status : null,
        });

        if (err instanceof APIError && err.status === 404 && err.message.includes('Organisation not yet provisioned')) {
          const blockedMessage = 'Tenant not provisioned yet. Your workspace is being set up — please try again in a few minutes.';
          setTenantProvisionError(blockedMessage);
          failClosedTenantBootstrap('provisioning_pending', {
            message: err.message,
            status: err.status,
          }, {
            blockedMessage,
          });
          return;
        }

        failClosedTenantBootstrap('restore_failed', {
          message: err instanceof Error ? err.message : 'unknown_error',
          status: err instanceof APIError ? err.status : null,
        }, {
          blockedMessage:
            err instanceof APIError && err.status === 401
              ? null
              : 'Tenant workspace identity could not be confirmed. Please sign in again.',
        });
      }
    };

    void restoreTenantSession();

    return () => {
      cancelled = true;
    };
  }, [appState, authRealm, effectiveRealm]);

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
    setTenantRestorePending(true);
    setTenantBootstrapBlockedMessage(null);
    setTenantProvisionError(null);

    let nextState: 'EXPERIENCE' | 'WL_ADMIN' = 'EXPERIENCE';

    const failClosedTenantBootstrap = (blockedMessage?: string | null) => {
      setTenantRestorePending(false);
      clearAuth();
      setTenants([]);
      setCurrentTenantId('');
      setTenantAuthenticatedRole(null);
      setStoredAuthRealm('TENANT');
      setAuthRealm('TENANT');
      setTenantBootstrapBlockedMessage(blockedMessage ?? null);
      setAppState('AUTH');
    };

    try {
      const me = await getCurrentUser(tenantBootstrapCurrentUserOptions);
      const canonicalTenant = buildTenantSnapshot(me.tenant);
      if (!canonicalTenant) {
        failClosedTenantBootstrap('Tenant workspace identity could not be confirmed. Please sign in again.');
        return;
      }

      const bootstrapState = applyTenantBootstrapState(canonicalTenant, me.role ?? null);
      if (!bootstrapState.nextState) {
        failClosedTenantBootstrap('Tenant workspace identity could not be confirmed. Please sign in again.');
        return;
      }

      nextState = bootstrapState.nextState;
    } catch (err) {
      if (err instanceof APIError && err.status === 404 && err.message.includes('Organisation not yet provisioned')) {
        const blockedMessage = 'Tenant not provisioned yet. Your workspace is being set up — please try again in a few minutes.';
        setTenantProvisionError(blockedMessage);
        failClosedTenantBootstrap(blockedMessage);
        return;
      }

      failClosedTenantBootstrap(
        err instanceof APIError && err.status === 401
          ? null
          : 'Tenant workspace identity could not be confirmed. Please sign in again.'
      );
      return;
    }

    setTenantRestorePending(false);
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
    let startedImpersonationId: string | null = null;
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
      startedImpersonationId = result.impersonationId;
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

      const me = await getCurrentUser();
      const bootstrappedTenant = resolveCanonicalImpersonationTenant(me.tenant, tenant.id);

      if (!bootstrappedTenant) {
        throw new Error('Tenant context bootstrap returned the wrong tenant.');
      }

      const bootstrapState = applyTenantBootstrapState(bootstrappedTenant, me.role ?? target.role ?? null);

      if (!bootstrapState.nextState) {
        throw new Error('Tenant runtime descriptor could not be established.');
      }

      setTenantProvisionError(null);
      setImpersonation(nextImpersonationState);
      persistImpersonationSession({
        adminId: actorAdminId,
        state: nextImpersonationState,
      });
      setImpersonationDialog({ open: false, tenant: null, reason: '', loading: false, error: null });
      setAppState(bootstrapState.nextState);
    } catch (err: any) {
      if (startedImpersonationId) {
        clearPersistedImpersonationSession();
        setStoredAuthRealm('CONTROL_PLANE');
        setAuthRealm('CONTROL_PLANE');
        try {
          await stopImpersonationSession({
            impersonationId: startedImpersonationId,
            reason: 'Tenant bootstrap failed after impersonation start.',
          });
        } catch (stopError) {
          console.error('[Impersonation] bootstrap cleanup failed:', stopError);
        }
      }
      clearPersistedImpersonationSession();
      setImpersonation(EMPTY_IMPERSONATION_STATE);
      setTenantAuthenticatedRole(null);
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
    const actorIdentity = controlPlaneIdentity ?? readStoredControlPlaneIdentity();

    if (actorIdentity) {
      applyControlPlaneShellEntry(actorIdentity);
      return;
    }

    clearControlPlaneIdentityState();
    setAppState('AUTH');
  };

  /** RU-003: Handle inline catalog item creation */
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isVerificationBlockedTenantWorkspace) {
      setAddItemError(verificationBlockedActionMessage);
      return;
    }

    setAddItemLoading(true);
    setAddItemError(null);
    try {
      const priceVal = parseFloat(addItemFormData.price);
      if (isNaN(priceVal) || priceVal <= 0) throw new Error('Price must be a positive number.');
      if (!addItemFormData.name.trim()) throw new Error('Name is required.');
      const imageUrl = addItemFormData.imageUrl.trim();
      if (imageUrl) {
        try {
          new window.URL(imageUrl);
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

  const resetEditItemState = () => {
    setEditingCatalogItemId(null);
    setEditItemFormData({ name: '', price: '', sku: '', imageUrl: '' });
    setEditItemError(null);
  };

  const handleOpenEditItem = (product: CatalogItem) => {
    if (isVerificationBlockedTenantWorkspace) {
      setCatalogError(verificationBlockedActionMessage);
      return;
    }

    setShowAddItemForm(false);
    setAddItemError(null);
    setCatalogError(null);
    setEditingCatalogItemId(product.id);
    setEditItemFormData({
      name: product.name,
      price: product.price.toString(),
      sku: product.sku || '',
      imageUrl: product.imageUrl || '',
    });
    setEditItemError(null);
  };

  const handleCloseEditItem = () => {
    if (editItemLoading) {
      return;
    }

    resetEditItemState();
  };

  const handleUpdateItem = async () => {

    if (isVerificationBlockedTenantWorkspace) {
      setEditItemError(verificationBlockedActionMessage);
      return;
    }

    if (!editingCatalogItemId) {
      return;
    }

    setEditItemLoading(true);
    setEditItemError(null);

    try {
      const priceVal = Number.parseFloat(editItemFormData.price);
      const trimmedImageUrl = editItemFormData.imageUrl.trim();
      if (Number.isNaN(priceVal) || priceVal <= 0) throw new Error('Price must be a positive number.');
      if (!editItemFormData.name.trim()) throw new Error('Name is required.');
      if (trimmedImageUrl) {
        try {
          new window.URL(trimmedImageUrl);
        } catch {
          throw new Error('Image URL must be a valid URL.');
        }
      }

      const result = await updateCatalogItem(editingCatalogItemId, {
        name: editItemFormData.name.trim(),
        price: priceVal,
        ...(editItemFormData.sku.trim() ? { sku: editItemFormData.sku.trim() } : {}),
        imageUrl: trimmedImageUrl || null,
      });

      setProducts(prev => prev.map(product => (
        product.id === editingCatalogItemId ? result.item : product
      )));
      resetEditItemState();
    } catch (err: any) {
      setEditItemError(err?.message || 'Failed to update item.');
    } finally {
      setEditItemLoading(false);
    }
  };

  const handleDeleteItem = async (product: CatalogItem) => {
    if (isVerificationBlockedTenantWorkspace) {
      setCatalogError(verificationBlockedActionMessage);
      return;
    }

    const confirmed = globalThis.confirm(`Delete ${product.name}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeleteItemLoadingId(product.id);
    setCatalogError(null);

    try {
      await deleteCatalogItem(product.id);
      setProducts(prev => prev.filter(item => item.id !== product.id));

      if (editingCatalogItemId === product.id) {
        resetEditItemState();
      }
    } catch (error) {
      setCatalogError(error instanceof APIError ? error.message : 'Failed to delete item.');
    } finally {
      setDeleteItemLoadingId(null);
    }
  };

  const renderCatalogItemMutationActions = (product: CatalogItem) => {
    const isDeleting = deleteItemLoadingId === product.id;

    return (
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => handleOpenEditItem(product)}
          disabled={editItemLoading || isDeleting}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            void handleDeleteItem(product);
          }}
          disabled={isDeleting}
          className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    );
  };

  const renderB2BCatalogCardFooter = (product: CatalogItem) => {
    return (
      <div className="mt-4 border-t border-slate-100 pt-3 space-y-3">
        {renderCatalogItemMutationActions(product)}
        <B2BAddToCartButton product={product} />
      </div>
    );
  };

  const handleOpenRfqDialog = (product: CatalogItem) => {
    const openOutcome = resolveBuyerRfqOpenAction({
      product,
      isVerificationBlockedTenantWorkspace,
      verificationBlockedActionMessage,
    });

    if (openOutcome.blocked) {
      setCatalogError(openOutcome.catalogError);
      return;
    }

    setRfqDialog(openOutcome.dialog);
  };

  const handleCloseRfqDialog = () => {
    const closeState = resolveBuyerRfqCloseState();
    setRfqDialog(closeState.dialog);
    setRfqDetailView(closeState.detailView);
  };

  const handleSubmitRfq = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rfqDialog.product) return;

    const submitResolution = resolveBuyerRfqSubmitPayload(rfqDialog);
    if (!submitResolution.payload) {
      setRfqDialog(dialog => ({ ...dialog, error: submitResolution.error }));
      return;
    }

    setRfqDialog(dialog => ({ ...dialog, loading: true, error: null }));

    try {
      const response = await createRfq(submitResolution.payload);
      const successState = resolveBuyerRfqSubmitSuccess(response);

      setRfqDialog(dialog => ({
        ...dialog,
        ...successState.dialogPatch,
      }));
      setRfqDetailView(successState.detailView);
    } catch (error) {
      console.error('Failed to submit RFQ:', error);
      setRfqDialog(dialog => ({
        ...dialog,
        loading: false,
        error: resolveBuyerRfqSubmitError(error),
      }));
    }
  };

  const handleOpenBuyerRfqs = async () => {
    navigateTenantManifestRoute('buyer_rfqs');
    setBuyerRfqTradeBridge(view => ({ ...view, error: null, initialTradeId: null }));
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
    const openAction = resolveBuyerRfqDetailOpenAction({
      rfqId,
      fallbackRfqId: rfqDialog.success?.rfqId,
      source,
      currentDetailView: rfqDetailView,
    });

    if (openAction.kind === 'noop') return;

    setBuyerRfqTradeBridge(view => ({ ...view, error: null }));

    if (source === 'list') {
      navigateTenantManifestRoute('buyer_rfqs');
    }

    if (openAction.kind === 'reuse') {
      setRfqDetailView(openAction.detailView);
      return;
    }

    setRfqDetailView(openAction.detailView);

    const detailView = await loadBuyerRfqDetailContinuity({
      rfqId: openAction.rfqId,
      source,
      loadBuyerRfqDetail: getBuyerRfqDetail,
    });
    setRfqDetailView(detailView);
  };

  const handleReturnToBuyerRfqList = () => {
    setBuyerRfqTradeBridge(view => ({ ...view, loading: false, error: null }));
    setRfqDetailView(createInitialBuyerRfqDetailViewState());
  };

  const handleCloseBuyerRfqs = () => {
    handleReturnToBuyerRfqList();
    navigateTenantDefaultManifestRoute();
  };

  const handleCloseRfqDetail = () => {
    setBuyerRfqTradeBridge(view => ({ ...view, loading: false, error: null }));
    setRfqDetailView(view => ({ ...view, open: false }));
  };

  const handleOpenTradeContinuityFromRfq = async () => {
    const rfq = rfqDetailView.data;

    if (rfq?.status !== 'RESPONDED') {
      return;
    }

    if (rfq.trade_continuity) {
      setBuyerRfqTradeBridge({
        loading: false,
        error: null,
        initialTradeId: rfq.trade_continuity.trade_id,
      });
      setRfqDetailView(view => ({ ...view, open: false }));
      navigateTenantManifestRoute('trades');
      return;
    }

    const grossAmount = Number(rfq.item_unit_price) * rfq.quantity;
    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      setBuyerRfqTradeBridge({
        loading: false,
        error: 'Unable to derive a valid trade amount from the responded RFQ detail.',
        initialTradeId: null,
      });
      return;
    }

    setBuyerRfqTradeBridge({
      loading: true,
      error: null,
      initialTradeId: null,
    });

    try {
      const result = await createTradeFromRfq({
        rfqId: rfq.id,
        tradeReference: buildTradeReferenceFromRfq(rfq.id),
        currency: ENTERPRISE_TRADE_BRIDGE_CURRENCY,
        grossAmount,
        reason: `Bridge responded RFQ ${rfq.id} into existing trade continuity.`,
      });

      setRfqDetailView(view => ({
        ...view,
        open: false,
        data: view.data
          ? {
              ...view.data,
              trade_continuity: {
                trade_id: result.tradeId,
                trade_reference: result.tradeReference,
              },
            }
          : view.data,
      }));
      setBuyerRfqTradeBridge({
        loading: false,
        error: null,
        initialTradeId: result.tradeId,
      });
      navigateTenantManifestRoute('trades');
    } catch (error) {
      if (error instanceof APIError && error.code === 'RFQ_ALREADY_CONVERTED') {
        try {
          const refreshed = await getBuyerRfqDetail(rfq.id);
          if (refreshed.rfq.trade_continuity) {
            setRfqDetailView(view => ({
              ...view,
              open: false,
              loading: false,
              error: null,
              data: refreshed.rfq,
            }));
            setBuyerRfqTradeBridge({
              loading: false,
              error: null,
              initialTradeId: refreshed.rfq.trade_continuity.trade_id,
            });
            navigateTenantManifestRoute('trades');
            return;
          }
        } catch {
          // Fall through to the bounded user-facing error below.
        }
      }

      setBuyerRfqTradeBridge({
        loading: false,
        error: error instanceof APIError ? error.message : 'Unable to continue this responded RFQ into the existing trade flow right now.',
        initialTradeId: null,
      });
    }
  };

  const handleOpenSupplierRfqInbox = async () => {
    navigateTenantManifestRoute('supplier_rfq_inbox');
    const openAction = resolveSupplierRfqInboxOpenAction(supplierRfqListView);
    setSupplierRfqDetailView(openAction.detailView);
    setSupplierRfqListView(openAction.listView);

    const listView = await loadSupplierRfqInboxContinuity({
      loadSupplierRfqInbox: getSupplierRfqInbox,
    });
    setSupplierRfqListView(listView);
  };

  const handleOpenSupplierRfqDetail = async (rfqId: string) => {
    const openAction = resolveSupplierRfqDetailOpenAction({
      rfqId,
      currentDetailView: supplierRfqDetailView,
    });

    if (openAction.kind === 'reuse') {
      setSupplierRfqDetailView(openAction.detailView);
      return;
    }

    setSupplierRfqDetailView(openAction.detailView);

    const detailView = await loadSupplierRfqDetailContinuity({
      rfqId,
      existingResponse: openAction.detailView.response,
      loadSupplierRfqDetail: getSupplierRfqDetail,
    });
    setSupplierRfqDetailView(detailView);
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
    navigateTenantDefaultManifestRoute();
  };

  const handleSubmitSupplierRfqResponse = async (message: string) => {
    const rfqId = supplierRfqDetailView.rfqId;
    const currentRfq = supplierRfqDetailView.data;

    if (!rfqId || !currentRfq) {
      return;
    }

    const submitAction = resolveSupplierRfqRespondSubmitAction({
      message,
      currentDetailView: supplierRfqDetailView,
    });

    setSupplierRfqDetailView(submitAction.detailView);

    if (submitAction.kind !== 'submit') {
      return;
    }

    const result = await submitSupplierRfqResponseContinuity({
      rfqId,
      payload: submitAction.payload,
      currentDetailView: submitAction.detailView,
      currentListView: supplierRfqListView,
      submitResponse: submitSupplierRfqResponse,
    });

    setSupplierRfqDetailView(result.detailView);
    setSupplierRfqListView(result.listView);
  };

  /** Wave 4 P1: WL Store Admin — content renderer for back-office panels. */
  const renderWLAdminContent = () => {
    if (!currentTenant || !wlAdminLocalRouteSelection) return null;

    switch (wlAdminLocalRouteSelection.routeKey) {
      case 'staff_invite':
        return <InviteMemberForm onBack={() => navigateWlAdminManifestRoute('staff')} />;
      case 'staff':
        return <TeamManagement onInvite={() => navigateWlAdminManifestRoute('staff_invite')} />;
      case 'domains':
        return <WLDomainsPanel tenantSlug={currentTenant.slug} />;
      case 'branding':
        return (
          <WhiteLabelSettings
            tenant={currentTenant}
            onNavigateDomains={() => navigateWlAdminManifestRoute('domains')}
          />
        );
      case 'collections':
        return <WLCollectionsPanel />;
      case 'products':
        return (
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
                    {renderCatalogItemMutationActions(p)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'orders':
        return <WLOrdersPanel />;
      default:
        return null;
    }
  };

  const renderDescriptorAlignedTenantContentFamily = (
    contentFamily: RouteManifestKey | null,
  ) => {
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

    switch (contentFamily) {
      case 'aggregator_workspace':
        return (
          <AggregatorDiscoveryWorkspace
            tenantName={currentTenant.name}
            entries={aggregatorDiscoveryEntries}
            loading={aggregatorDiscoveryLoading}
            error={aggregatorDiscoveryError}
            aiInsight={currentTenant.is_white_label ? null : aiInsight}
            onRetry={() => setAggregatorDiscoveryRefreshKey(value => value + 1)}
          />
        );
      case 'b2b_workspace':
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
                      {renderB2BCatalogCardFooter(p)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'b2c_storefront': {
        const visibleB2CProducts = products.slice(0, b2cVisibleCount);
        const hasHiddenLoadedProducts = products.length > b2cVisibleCount;
        const canLoadMoreB2CProducts = catalogNextCursor !== null;
        let b2cBrowseActionLabel = 'All Visible';
        if (hasHiddenLoadedProducts) {
          b2cBrowseActionLabel = 'See All';
        } else if (canLoadMoreB2CProducts) {
          b2cBrowseActionLabel = b2cLoadingMore ? 'Loading...' : 'Load More';
        }

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
                <button
                  type="button"
                  onClick={handleB2CShopNow}
                  className="bg-white text-indigo-600 px-8 py-3 rounded-full font-bold shadow-xl hover:bg-indigo-50 transition"
                >
                  Shop Now
                </button>
              </div>
            </section>

            <section ref={b2cCatalogSectionRef}>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold">New Arrivals</h2>
                  {b2cSearchQuery.trim() && !catalogLoading && !catalogError && (
                    <p className="mt-1 text-sm text-slate-500">
                      Showing results for "{b2cSearchQuery.trim()}".
                    </p>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => { void handleB2CLoadMore(); }}
                    disabled={b2cLoadingMore || (!hasHiddenLoadedProducts && !canLoadMoreB2CProducts)}
                    className="text-indigo-600 font-semibold underline underline-offset-4"
                  >
                    {b2cBrowseActionLabel}
                  </button>
                </div>
              </div>

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
                  {visibleB2CProducts.map(p => (
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
      }
      case 'wl_storefront':
        return (
          <WLStorefront
            onRequestQuote={handleOpenRfqDialog}
            onViewBuyerRfqs={handleOpenBuyerRfqs}
          />
        );
      default:
        return <div>Invalid Tenant Configuration</div>;
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

    const onboardingStatusContinuity = currentOnboardingStatusContinuity;

    if (tenantContentFamily === 'b2b_workspace' && onboardingStatusContinuity) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <section className={`rounded-3xl border p-8 shadow-sm space-y-6 ${onboardingStatusContinuity.panelClassName}`}>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4 max-w-3xl">
                <div className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${onboardingStatusContinuity.badgeClassName}`}>
                  Pending verification posture
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-slate-900">{onboardingStatusContinuity.title}</h1>
                  <p className="text-base leading-7 text-slate-600">{onboardingStatusContinuity.detail}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:max-w-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Current status</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  {currentTenant.status.replaceAll('_', ' ')}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  TexQtic will unlock the full workspace after business verification review is completed.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace posture</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">Read-only review state</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This tenant stays blocked from active trading workflows until approval is recorded.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">What remains paused</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">Catalog, RFQ, and trade actions</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Add, edit, delete, quote, escrow, and settlement affordances stay unavailable during review.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Next step</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">Wait for TexQtic review</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Once verification is approved, the full B2B workspace and activation-dependent routes can open normally.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Activation-dependent surfaces</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Normal workspace actions stay suppressed</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                'Catalog management and product edits',
                'Buyer RFQs and supplier RFQ inbox',
                'Trade, escrow, and settlement workflows',
                'Other active B2B management affordances',
              ].map(item => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (onboardingStatusContinuity && VERIFICATION_BLOCKED_VIEWS.has(expView)) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className={`max-w-xl rounded-3xl shadow-xl p-10 text-center space-y-4 ${onboardingStatusContinuity.panelClassName}`}>
            <div className="text-4xl">⏳</div>
            <h2 className="text-2xl font-bold text-slate-900">{onboardingStatusContinuity.title}</h2>
            <p className="text-slate-600">
              {onboardingStatusContinuity.detail}
            </p>
            <p className={`text-sm rounded-xl px-4 py-3 ${onboardingStatusContinuity.badgeClassName}`}>
              Current status: {currentTenant.status}
            </p>
          </div>
        </div>
      );
    }

    if (appState === 'TEAM_MGMT') return <TeamManagement onInvite={() => setAppState('INVITE_MEMBER')} />;
    if (appState === 'INVITE_MEMBER')
      return <InviteMemberForm onBack={() => setAppState('TEAM_MGMT')} />;
    if (appState === 'SETTINGS' && !isNonWhiteLabelB2CTenant) {
      return (
        <WhiteLabelSettings
          tenant={currentTenant}
          onNavigateDomains={tenantHasWlAdminOverlay ? () => enterWlAdmin('DOMAINS') : undefined}
        />
      );
    }
    switch (tenantLocalRouteSelection?.routeKey) {
      case 'orders':
        return <EXPOrdersPanel onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'buyer_rfqs':
        if (rfqDetailView.open && rfqDetailView.source === 'list') {
          return (
            <BuyerRfqDetailSurface
              rfq={rfqDetailView.data}
              loading={rfqDetailView.loading}
              error={rfqDetailView.error}
              onBack={handleReturnToBuyerRfqList}
              onClose={handleCloseBuyerRfqs}
              onOpenTradeContinuity={() => {
                void handleOpenTradeContinuityFromRfq();
              }}
              tradeContinuityLoading={buyerRfqTradeBridge.loading}
              tradeContinuityError={buyerRfqTradeBridge.error}
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
      case 'supplier_rfq_inbox':
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
      case 'dpp':
        return (
          <DPPPassport
            onBack={() => navigateTenantDefaultManifestRoute()}
            title={currentTenant?.is_white_label ? 'DPP Snapshot' : undefined}
            subtitle={
              currentTenant?.is_white_label
                ? 'Read-only supply chain snapshot by traceability node ID.'
                : undefined
            }
          />
        );
      case 'escrow':
        return <EscrowPanel onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'escalations':
        return <EscalationsPanel onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'settlement':
        return <SettlementPreview onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'certifications':
        return <CertificationsPanel onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'traceability':
        return <TraceabilityPanel onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'audit_logs':
        return <TenantAuditLogs onBack={() => navigateTenantDefaultManifestRoute()} />;
      case 'trades':
        return (
          <TradesPanel
            onBack={() => {
              navigateTenantDefaultManifestRoute({ resetTradeBridge: true });
            }}
            initialTradeId={buyerRfqTradeBridge.initialTradeId}
            onInitialTradeHandled={() => {
              setBuyerRfqTradeBridge(view => ({ ...view, initialTradeId: null }));
            }}
          />
        );
      case 'catalog':
      case 'home':
      case 'cart':
        return renderDescriptorAlignedTenantContentFamily(tenantContentFamily);
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white border border-amber-300 rounded-2xl p-8 max-w-md text-center space-y-4">
              <div className="text-3xl">⚠️</div>
              <h2 className="font-bold text-slate-900">Workspace Navigation Unavailable</h2>
              <p className="text-slate-600 text-sm">
                TexQtic could not align this workspace view to a manifest-backed route group.
              </p>
            </div>
          </div>
        );
    }
  };

  const renderAdminView = () => {
    if (!controlPlaneLocalRouteSelection) {
      return null;
    }

    if (
      controlPlaneLocalRouteSelection.routeKey === 'tenant_detail' ||
      controlPlaneLocalRouteSelection.routeKey === 'tenant_detail_invited' ||
      controlPlaneLocalRouteSelection.routeKey === 'tenant_detail_closed'
    ) {
      if (!selectedTenant) {
        return null;
      }

      let backRouteKey: 'tenant_registry' | 'tenant_registry_invited' | 'tenant_registry_closed' =
        'tenant_registry';

      if (controlPlaneLocalRouteSelection.routeKey === 'tenant_detail_invited') {
        backRouteKey = 'tenant_registry_invited';
      } else if (controlPlaneLocalRouteSelection.routeKey === 'tenant_detail_closed') {
        backRouteKey = 'tenant_registry_closed';
      }

      return (
        <TenantDetails
          tenant={selectedTenant}
          onBack={() => navigateControlPlaneManifestRoute(backRouteKey)}
          onImpersonate={handleImpersonate}
        />
      );
    }

    if (
      controlPlaneLocalRouteSelection.routeKey === 'tenant_registry' ||
      controlPlaneLocalRouteSelection.routeKey === 'tenant_registry_invited' ||
      controlPlaneLocalRouteSelection.routeKey === 'tenant_registry_closed'
    ) {
      let lifecycleView: 'ACTIVE' | 'INVITED' | 'CLOSED' = 'ACTIVE';

      if (controlPlaneLocalRouteSelection.routeKey === 'tenant_registry_invited') {
        lifecycleView = 'INVITED';
      } else if (controlPlaneLocalRouteSelection.routeKey === 'tenant_registry_closed') {
        lifecycleView = 'CLOSED';
      }

      return (
        <TenantRegistry
          lifecycleView={lifecycleView}
          onSelectTenant={setSelectedTenant}
          onImpersonate={handleImpersonate}
        />
      );
    }

    switch (controlPlaneLocalRouteSelection.routeKey) {
      case 'logs':
        return <AuditLogs />;
      case 'finance':
        return (
          <FinanceOps
            onOpenEscrowScope={scope => {
              setFinanceEscrowBridge(scope);
              navigateControlPlaneManifestRoute('escrow_admin');
            }}
          />
        );
      case 'ai':
        return <AiGovernance />;
      case 'health':
        return <SystemHealth />;
      case 'flags':
        return <FeatureFlags />;
      case 'compliance':
        return <ComplianceQueue />;
      case 'cases':
        return (
          <DisputeCases
            onOpenEscalationScope={(scope: DisputeEscalationBridgeTarget) => {
              setDisputeEscalationBridge(scope);
              navigateControlPlaneManifestRoute('escalations');
            }}
          />
        );
      case 'trades':
        return <TradeOversight />;
      // TECS-FBW-006-A: G-022 control-plane escalation oversight (read-only; orgId-gated)
      case 'escalations':
        return (
          <EscalationOversight
            initialScope={disputeEscalationBridge}
            onScopeConsumed={() => setDisputeEscalationBridge(null)}
          />
        );
      // TECS-FBW-005: G-019 cross-tenant certification read surface (D-022-C: read-only)
      case 'certifications':
        return <CertificationsAdmin />;
      // TECS-FBW-015: G-016 cross-tenant traceability inspection (Phase A: read-only)
      case 'traceability':
        return <TraceabilityAdmin />;
      // TECS-FBW-007: marketplace_cart_summaries projection admin panel (read-only)
      case 'cart_summaries':
        return <CartSummariesPanel />;
      // PW5-W2: G-018 cross-tenant escrow admin read panel (D-020-B: no balance)
      case 'escrow_admin':
        return (
          <EscrowAdminPanel
            initialScope={financeEscrowBridge}
            onScopeConsumed={() => setFinanceEscrowBridge(null)}
          />
        );
      // PW5-W3-FE: Settlement admin read panel (backend route: 14aea49)
      case 'settlement_admin':
        return <SettlementAdminPanel />;
      // PW5-W4: G-021 maker-checker approval queue console (read-only)
      case 'maker_checker':
        return <MakerCheckerConsole />;
      case 'rbac':
        return <AdminRBAC />;
      case 'events':
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
        className="w-full border border-slate-200 py-2 rounded text-sm font-semibold hover:bg-slate-50 transition"
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
      case 'AUTH': {
        const tenantBootstrapAuthView = resolveTenantBootstrapAuthView({
          authRealm,
          tenantRestorePending,
          tenantBootstrapBlockedMessage,
          tenantProvisionError,
        });

        if (tenantBootstrapAuthView === 'TENANT_RESOLVING') {
          return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white px-8 py-12 text-center shadow-sm">
                <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                <h1 className="text-lg font-semibold text-slate-900">Confirming workspace access</h1>
                <p className="mt-3 text-sm text-slate-500">
                  TexQtic is confirming your tenant session before opening a workspace shell.
                </p>
              </div>
            </div>
          );
        }

        if (tenantBootstrapAuthView === 'TENANT_BLOCKED') {
          const blockedMessage = tenantProvisionError ?? tenantBootstrapBlockedMessage;

          return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
              <div className="w-full max-w-md rounded-3xl border border-amber-300 bg-white px-8 py-12 text-center shadow-sm space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-700">
                  !
                </div>
                <h1 className="text-lg font-semibold text-slate-900">Workspace access blocked</h1>
                <p className="text-sm text-slate-500">{blockedMessage}</p>
                <button
                  onClick={() => {
                    setTenantBootstrapBlockedMessage(null);
                    setTenantProvisionError(null);
                  }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="absolute top-6 flex gap-4">
              <button
                onClick={() => {
                  setTenantBootstrapBlockedMessage(null);
                  setTenantProvisionError(null);
                  setAuthRealm('TENANT');
                }}
                className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${authRealm === 'TENANT' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                Tenant Access
              </button>
              <button
                onClick={() => {
                  setTenantBootstrapBlockedMessage(null);
                  setTenantProvisionError(null);
                  setAuthRealm('CONTROL_PLANE');
                }}
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
      }
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
                      verificationData: {
                        registrationNumber: formData.registrationNumber,
                        jurisdiction: formData.jurisdiction,
                      },
                    }) as any;
                    // Store JWT so all subsequent tenant API calls are authenticated
                    setToken(raw.token, 'TENANT');

                    const me = await getCurrentUser();
                    const canonicalTenant = buildTenantSnapshot(me.tenant);

                    if (!canonicalTenant) {
                      throw new Error('Tenant activation completed but canonical tenant state is unavailable.');
                    }

                    const bootstrapState = applyTenantBootstrapState(canonicalTenant, me.role ?? null);
                    if (!bootstrapState.nextState) {
                      throw new Error('Tenant activation descriptor could not be established.');
                    }

                    setPendingInviteToken(null);
                    setAppState(bootstrapState.nextState);
                } else {
                  setAppState('EXPERIENCE');
                }
              }}
            />
          </div>
        );
      case 'CONTROL_PLANE': {
        if (!canAccessControlPlane) {
          return null;
        }

        const ControlPlaneShell = controlPlaneRuntimeManifestEntry?.shellFamily === 'SuperAdminShell'
          ? SuperAdminShell
          : null;

        if (controlPlaneContentFamily !== 'control_plane' || !ControlPlaneShell) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="bg-white border border-amber-300 rounded-2xl p-8 max-w-md text-center space-y-4">
                <div className="text-3xl">⚠️</div>
                <h2 className="font-bold text-slate-900">Control Plane Unavailable</h2>
                <p className="text-slate-600 text-sm">
                  Control-plane routing truth could not be established for this session.
                </p>
              </div>
            </div>
          );
        }

        return (
          <ControlPlaneShell
            authRealm="CONTROL_PLANE"
            actorIdentity={controlPlaneIdentity}
            navigation={controlPlaneShellNavigation}
            onNavigateRoute={navigateControlPlaneManifestRoute}
          >
            {renderAdminView()}
          </ControlPlaneShell>
        );
      }
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

        const WlAdminShell = tenantRuntimeManifestEntry?.shellFamily === 'WhiteLabelAdminShell'
          ? WhiteLabelAdminShell
          : null;

        if (tenantContentFamily !== 'wl_admin' || !WlAdminShell) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="bg-white border border-amber-300 rounded-2xl p-8 max-w-md text-center space-y-4">
                <div className="text-3xl">⚠️</div>
                <h2 className="font-bold text-slate-900">White-Label Admin Unavailable</h2>
                <p className="text-slate-600 text-sm">
                  This tenant session is missing the canonical white-label admin overlay.
                </p>
              </div>
            </div>
          );
        }

        return (
          <>
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
            <WlAdminShell
              tenant={currentTenant}
              navigation={wlAdminShellNavigation}
              onNavigateRoute={navigateWlAdminManifestRoute}
              onNavigateStorefront={() => navigateTenantDefaultManifestRoute()}
            >
              {renderWLAdminContent()}
            </WlAdminShell>
          </>
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

        if (
          !tenantContentFamily
          || tenantContentFamily === 'control_plane'
          || tenantContentFamily === 'wl_admin'
        ) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="bg-white border border-amber-300 rounded-2xl p-8 max-w-md text-center space-y-4">
                <div className="text-3xl">⚠️</div>
                <h2 className="font-bold text-slate-900">Workspace Content Unavailable</h2>
                <p className="text-slate-600 text-sm">
                  TexQtic could not align this tenant session to a workspace content family.
                </p>
              </div>
            </div>
          );
        }

        const resolvedShellFamily = tenantRuntimeManifestEntry?.shellFamily ?? null;
        let ExperienceShell: typeof AggregatorShell | typeof B2BShell | typeof B2CShell | typeof WhiteLabelShell | null = null;

        switch (resolvedShellFamily) {
          case 'AggregatorShell':
            ExperienceShell = AggregatorShell;
            break;
          case 'B2BShell':
            ExperienceShell = B2BShell;
            break;
          case 'B2CShell':
            ExperienceShell = B2CShell;
            break;
          case 'WhiteLabelShell':
            ExperienceShell = WhiteLabelShell;
            break;
        }

        if (!resolvedShellFamily || !ExperienceShell) {
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
        return (
          <CartProvider
            key={`tenant-shell:${currentTenant.id}`}
            deferInitialRefresh={isEnterpriseCatalogEntrySurface}
          >
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
            {getOnboardingStatusContinuity(currentTenant.status) && (
              <div className={`fixed top-0 left-0 right-0 z-[95] px-4 py-3 text-sm text-center ${getOnboardingStatusContinuity(currentTenant.status)?.bannerClassName}`}>
                {getOnboardingStatusContinuity(currentTenant.status)?.bannerText}
              </div>
            )}
            <ExperienceShell
              tenant={currentTenant}
              navigation={tenantShellContract}
              shellMode={isVerificationBlockedTenantWorkspace ? 'verification-blocked' : 'default'}
              shellLabel={isVerificationBlockedTenantWorkspace ? 'Verification Review' : undefined}
              shellHeaderTitle={isVerificationBlockedTenantWorkspace ? 'TexQtic Verification Review' : undefined}
              shellFooterLabel={isVerificationBlockedTenantWorkspace ? 'v2.4.0 • TexQtic Verification Review' : undefined}
              shellStatusLabel={isVerificationBlockedTenantWorkspace ? currentOnboardingStatusContinuity?.title ?? null : null}
            >
              {shouldShowTenantUtilityAffordances && (
                <div className="absolute top-4 right-4 z-[60] flex gap-2">
                  {showB2CHomeAuthenticatedAffordances && (
                    <CartToggleButton setShowCart={setShowCart} />
                  )}
                  {!isNonWhiteLabelB2CTenant && (
                    <button
                      onClick={() => setAppState('SETTINGS')}
                      className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg shadow-sm hover:text-indigo-600 transition"
                      title="Storefront Settings"
                    >
                      ⚙️
                    </button>
                  )}
                </div>
              )}
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
                    setConfirmedOrderId(null);
                    navigateTenantManifestRoute('orders');
                  }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition"
                >
                  View My Orders
                </button>
                <button
                  onClick={() => {
                    setConfirmedOrderId(null);
                    navigateTenantDefaultManifestRoute();
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
      onOpenTradeContinuity={() => {
        void handleOpenTradeContinuityFromRfq();
      }}
      tradeContinuityLoading={buyerRfqTradeBridge.loading}
      tradeContinuityError={buyerRfqTradeBridge.error}
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
      {editingCatalogItem && !isVerificationBlockedTenantWorkspace && (
        <div className="fixed inset-0 bg-slate-950/45 z-[195] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Edit Catalog Item</h2>
              <p className="text-sm text-slate-500 mt-2">
                Update the existing tenant catalog item without widening into search, storefront, or control-plane work.
              </p>
            </div>

            <form className="space-y-5" onSubmit={event => {
              event.preventDefault();
              void handleUpdateItem();
            }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-3">
                  <label htmlFor="edit-item-name" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Name
                  </label>
                  <input
                    id="edit-item-name"
                    required
                    value={editItemFormData.name}
                    onChange={e => setEditItemFormData(data => ({ ...data, name: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-item-price" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Price
                  </label>
                  <input
                    id="edit-item-price"
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editItemFormData.price}
                    onChange={e => setEditItemFormData(data => ({ ...data, price: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="edit-item-sku" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    SKU
                  </label>
                  <input
                    id="edit-item-sku"
                    value={editItemFormData.sku}
                    onChange={e => setEditItemFormData(data => ({ ...data, sku: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Optional SKU"
                  />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label htmlFor="edit-item-image-url" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Image URL
                  </label>
                  <input
                    id="edit-item-image-url"
                    type="url"
                    value={editItemFormData.imageUrl}
                    onChange={e => setEditItemFormData(data => ({ ...data, imageUrl: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://example.com/product-image.jpg"
                  />
                </div>
              </div>

              {editItemError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                  {editItemError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseEditItem}
                  disabled={editItemLoading}
                  className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editItemLoading}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editItemLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {rfqDialog.open && rfqDialog.product && !isVerificationBlockedTenantWorkspace && (
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
            <div className="glass shadow-2xl rounded-2xl border border-slate-200 p-2 flex gap-2">
              {canAccessControlPlane && !impersonation.isAdmin && (
                <button
                  onClick={() => {
                    if (appState === 'CONTROL_PLANE') {
                      const targetTenant = selectedTenant ?? currentTenant;
                      if (targetTenant) {
                        handleImpersonate(targetTenant);
                      }
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
                  resetTenantScopedRouteState();
                  clearAuth();
                  clearPersistedImpersonationSession();
                  setImpersonation(EMPTY_IMPERSONATION_STATE);
                  setTenantAuthenticatedRole(null);
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
