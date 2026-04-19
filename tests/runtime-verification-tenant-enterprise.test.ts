import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantDelete: vi.fn(),
  tenantGet: vi.fn(),
  tenantPatch: vi.fn(),
  tenantPost: vi.fn(),
  tenantPut: vi.fn(),
}));

import {
  __B2B_BUYER_RFQ_DETAIL_CLOSE_TESTING__,
  __B2B_BUYER_RFQ_DETAIL_RETURN_TESTING__,
  __B2B_BUYER_RFQ_LIST_TESTING__,
  __B2B_RFQ_DETAIL_TESTING__,
  __B2B_RFQ_INITIATION_TESTING__,
  __B2B_SUPPLIER_DETAIL_TESTING__,
  __B2B_SUPPLIER_INBOX_TESTING__,
  __B2B_SUPPLIER_RESPOND_TESTING__,
  __B2B_TRADE_FROM_RFQ_TESTING__,
} from '../App';
import { listCertifications, type ListCertificationsResponse } from '../services/certificationService';
import {
  createRfq,
  getBuyerRfqs,
  getSupplierRfqDetail,
  getSupplierRfqInbox,
  submitSupplierRfqResponse,
  type BuyerRfqDetail,
  type BuyerRfqDetailResponse,
  type BuyerRfqListItem,
  type BuyerRfqListResponse,
  type CatalogItem,
  type SupplierRfqDetail,
  type SupplierRfqDetailResponse,
  type SupplierRfqListItem,
  type SupplierRfqListResponse,
  type SupplierRfqResponse,
  type SubmitSupplierRfqResponseResult,
} from '../services/catalogService';
import { APIError } from '../services/apiClient';
import { InviteMemberSuccessState } from '../components/Tenant/InviteMemberForm';
import {
  TeamManagement,
  TeamManagementPendingInvitesPanel,
  canInviteMembers,
  getPendingInviteDeliveryOutcomeMessage,
  getInitialRoleSelection,
  getValidInviteRoles,
  getValidNextRoles,
  removePendingInviteById,
  replacePendingInviteById,
} from '../components/Tenant/TeamManagement';
import { AggregatorShell, B2BShell, WhiteLabelAdminShell, WhiteLabelShell } from '../layouts/Shells';
import { listEscalations, type EscalationListResponse } from '../services/escalationService';
import { listEscrows, type EscrowListResponse } from '../services/escrowService';
import {
  createMembership,
  editPendingInvite,
  getMemberships,
  resendPendingInvite,
  revokePendingInvite,
  type InviteEmailDeliveryOutcome,
  type MembershipsResponse,
} from '../services/tenantService';
import {
  createTradeFromRfq,
  createTradeEscrow,
  listTenantTrades,
  type CreateTradeFromRfqResponse,
  type CreateTradeEscrowResponse,
  type TenantTradesListResponse,
} from '../services/tradeService';
import { listEdges, listNodes, type EdgeListResponse, type NodeListResponse } from '../services/traceabilityService';
import { tenantDelete, tenantGet, tenantPatch, tenantPost } from '../services/tenantApiClient';
import { TenantStatus, TenantType, type TenantConfig } from '../types';

const tenantDeleteMock = vi.mocked(tenantDelete);
const tenantGetMock = vi.mocked(tenantGet);
const tenantPatchMock = vi.mocked(tenantPatch);
const tenantPostMock = vi.mocked(tenantPost);

const {
  createInitialBuyerRfqDialogState,
  createInitialBuyerRfqDetailViewState,
  resolveBuyerRfqCloseState,
  resolveBuyerRfqOpenAction,
  resolveBuyerRfqSubmitPayload,
  resolveBuyerRfqSubmitSuccess,
  resolveBuyerRfqSubmitError,
} = __B2B_RFQ_INITIATION_TESTING__;

const {
  createInitialBuyerRfqListViewState,
  resolveBuyerRfqListOpenAction,
  loadBuyerRfqListContinuity,
} = __B2B_BUYER_RFQ_LIST_TESTING__;

const {
  resolveBuyerRfqDetailCloseState,
} = __B2B_BUYER_RFQ_DETAIL_CLOSE_TESTING__;

const {
  resolveBuyerRfqDetailReturnToListState,
} = __B2B_BUYER_RFQ_DETAIL_RETURN_TESTING__;

const {
  resolveBuyerRfqDetailOpenAction,
  loadBuyerRfqDetailContinuity,
} = __B2B_RFQ_DETAIL_TESTING__;

const {
  resolveSupplierRfqInboxCloseState,
  resolveSupplierRfqInboxEntryState,
  resolveSupplierRfqInboxOpenAction,
  loadSupplierRfqInboxContinuity,
} = __B2B_SUPPLIER_INBOX_TESTING__;

const {
  createInitialSupplierRfqDetailViewState,
  resolveSupplierRfqDetailOpenAction,
  resolveSupplierRfqDetailReturnToInboxState,
  resolveSupplierRfqDetailCloseState,
  loadSupplierRfqDetailContinuity,
} = __B2B_SUPPLIER_DETAIL_TESTING__;

const {
  resolveSupplierRfqRespondSubmitAction,
  submitSupplierRfqResponseContinuity,
} = __B2B_SUPPLIER_RESPOND_TESTING__;

const {
  createInitialBuyerRfqTradeBridgeState,
  resolveBuyerRfqTradeFromRfqCreateAction,
  continueBuyerRfqTradeFromRfqCreatePath,
  resolveBuyerRfqTradeFromRfqError,
} = __B2B_TRADE_FROM_RFQ_TESTING__;

function makeTradeResponse(): TenantTradesListResponse {
  return {
    trades: [
      {
        createdAt: '2026-03-21T08:00:00.000Z',
        buyerOrgId: 'buyer-1',
        currency: 'USD',
        escrowId: null,
        grossAmount: 1250,
        id: 'trade-1',
        lifecycleState: { stateKey: 'ACTIVE' },
        sellerOrgId: 'seller-1',
        tenantId: 'tenant-1',
        tradeReference: 'TRD-001',
        updatedAt: '2026-03-21T09:00:00.000Z',
      },
    ],
    count: 1,
  };
}

function makeTradeFromRfqResponse(
  overrides: Partial<CreateTradeFromRfqResponse> = {},
): CreateTradeFromRfqResponse {
  return {
    tradeId: 'trade-rfq-1',
    tradeReference: 'TRD-RFQ-RFQ1',
    rfqId: 'rfq-1',
    ...overrides,
  };
}

function makeEscrowResponse(): EscrowListResponse {
  return {
    escrows: [
      {
        createdAt: '2026-03-21T08:00:00.000Z',
        createdByUserId: 'user-1',
        currency: 'USD',
        id: 'escrow-1',
        lifecycleStateId: 'state-1',
        lifecycleStateKey: 'ACTIVE',
        tenantId: 'tenant-1',
        updatedAt: '2026-03-21T09:00:00.000Z',
      },
    ],
    count: 1,
    limit: 25,
    offset: 0,
  };
}

function makeNodeResponse(): NodeListResponse {
  return {
    rows: [
      {
        batchId: 'BATCH-001',
        createdAt: '2026-03-21T08:00:00.000Z',
        geoHash: null,
        id: 'node-1',
        meta: { stage: 'weaving' },
        nodeType: 'LOT',
        orgId: 'tenant-1',
        updatedAt: '2026-03-21T09:00:00.000Z',
        visibility: 'TENANT',
      },
    ],
    total: 1,
    limit: 20,
    offset: 5,
  };
}

function makeEdgeResponse(): EdgeListResponse {
  return {
    rows: [
      {
        createdAt: '2026-03-21T08:00:00.000Z',
        edgeType: 'BLENDED_FROM',
        fromNodeId: 'node-1',
        id: 'edge-1',
        meta: {},
        orgId: 'tenant-1',
        toNodeId: 'node-2',
        transformationId: 'transform-1',
      },
    ],
    total: 1,
    limit: 10,
    offset: 2,
  };
}

function makeEscalationResponse(): EscalationListResponse {
  return {
    escalations: [
      {
        createdAt: '2026-03-21T08:00:00.000Z',
        entityId: 'trade-1',
        entityType: 'TRADE',
        freezeRecommendation: false,
        id: 'escalation-1',
        orgId: 'tenant-1',
        parentEscalationId: null,
        reason: 'Awaiting manual review',
        resolutionReason: null,
        resolvedAt: null,
        resolvedByPrincipal: null,
        severityLevel: 1,
        source: 'TENANT_UI',
        status: 'OPEN',
        triggeredByActorType: 'USER',
        triggeredByPrincipal: 'owner@tenant.test',
      },
    ],
    count: 1,
  };
}

function makeCertificationResponse(): ListCertificationsResponse {
  return {
    items: [
      {
        certificationType: 'GOTS',
        createdAt: '2026-03-21T08:00:00.000Z',
        expiresAt: '2027-03-21T08:00:00.000Z',
        id: 'cert-1',
        issuedAt: '2026-03-21T08:00:00.000Z',
        stateKey: 'SUBMITTED',
        updatedAt: '2026-03-21T09:00:00.000Z',
      },
    ],
    total: 1,
    limit: 10,
    offset: 0,
  };
}

function makeCatalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: 'item-1',
    tenantId: 'supplier-1',
    name: 'Combed Cotton 30s',
    sku: 'COT-30S',
    description: 'Ring-spun cotton yarn',
    price: 18.5,
    active: true,
    createdAt: '2026-03-21T08:00:00.000Z',
    updatedAt: '2026-03-21T09:00:00.000Z',
    moq: 12,
    ...overrides,
  };
}

function makeCreateRfqResponse() {
  return {
    rfq: {
      id: 'rfq-1',
      status: 'INITIATED' as const,
      org_id: 'buyer-1',
      catalog_item_id: 'item-1',
      item_name: 'Combed Cotton 30s',
      item_sku: 'COT-30S',
      quantity: 24,
      supplier_org_id: 'supplier-1',
      created_at: '2026-03-22T08:00:00.000Z',
      updated_at: '2026-03-22T08:00:00.000Z',
      item_unit_price: 18.5,
      buyer_message: 'Need export-grade packing.',
      created_by_user_id: 'user-1',
      supplier_response: null,
      trade_continuity: null,
    },
  };
}

function makeBuyerRfqDetail(overrides: Partial<BuyerRfqDetail> = {}): BuyerRfqDetail {
  return {
    id: 'rfq-1',
    status: 'RESPONDED',
    org_id: 'buyer-1',
    catalog_item_id: 'item-1',
    item_name: 'Combed Cotton 30s',
    item_sku: 'COT-30S',
    quantity: 24,
    supplier_org_id: 'supplier-1',
    created_at: '2026-03-22T08:00:00.000Z',
    updated_at: '2026-03-22T09:00:00.000Z',
    item_unit_price: 18.5,
    buyer_message: 'Need export-grade packing.',
    created_by_user_id: 'user-1',
    supplier_response: null,
    trade_continuity: null,
    ...overrides,
  };
}

function makeBuyerRfqListItem(overrides: Partial<BuyerRfqListItem> = {}): BuyerRfqListItem {
  return {
    id: 'buyer-rfq-1',
    status: 'RESPONDED',
    catalog_item_id: 'item-1',
    item_name: 'Combed Cotton 30s',
    item_sku: 'COT-30S',
    quantity: 24,
    supplier_org_id: 'supplier-1',
    created_at: '2026-03-22T08:00:00.000Z',
    updated_at: '2026-03-22T09:00:00.000Z',
    ...overrides,
  };
}

function makeSupplierRfqListItem(overrides: Partial<SupplierRfqListItem> = {}): SupplierRfqListItem {
  return {
    id: 'supplier-rfq-1',
    status: 'OPEN',
    catalog_item_id: 'item-1',
    item_name: 'Combed Cotton 30s',
    item_sku: 'COT-30S',
    quantity: 24,
    created_at: '2026-03-22T08:00:00.000Z',
    updated_at: '2026-03-22T09:00:00.000Z',
    ...overrides,
  };
}

function makeSupplierRfqDetail(overrides: Partial<SupplierRfqDetail> = {}): SupplierRfqDetail {
  return {
    id: 'supplier-rfq-1',
    status: 'OPEN',
    catalog_item_id: 'item-1',
    item_name: 'Combed Cotton 30s',
    item_sku: 'COT-30S',
    quantity: 24,
    created_at: '2026-03-22T08:00:00.000Z',
    updated_at: '2026-03-22T09:00:00.000Z',
    buyer_message: 'Need export-grade packing.',
    ...overrides,
  };
}

function makeSupplierRfqResponse(overrides: Partial<SupplierRfqResponse> = {}): SupplierRfqResponse {
  return {
    id: 'response-1',
    rfq_id: 'supplier-rfq-1',
    supplier_org_id: 'supplier-1',
    message: 'We can ship next week.',
    submitted_at: '2026-03-22T11:00:00.000Z',
    created_at: '2026-03-22T11:00:00.000Z',
    updated_at: '2026-03-22T11:00:00.000Z',
    created_by_user_id: 'user-2',
    ...overrides,
  };
}

function makeMembershipsResponse(): MembershipsResponse {
  return {
    memberships: [
      {
        id: 'membership-1',
        role: 'OWNER',
        userId: 'user-1',
        tenantId: 'tenant-1',
        createdAt: '2026-03-21T08:00:00.000Z',
        updatedAt: '2026-03-21T09:00:00.000Z',
        user: {
          id: 'user-1',
          email: 'owner@tenant.test',
          emailVerified: true,
        },
      },
    ],
    pendingInvites: [
      {
        id: 'invite-1',
        email: 'new-admin@tenant.test',
        role: 'ADMIN',
        expiresAt: '2026-04-18T00:00:00.000Z',
        createdAt: '2026-04-10T12:00:00.000Z',
      },
      {
        id: 'invite-2',
        email: 'new-member@tenant.test',
        role: 'MEMBER',
        expiresAt: '2026-04-17T00:00:00.000Z',
        createdAt: '2026-04-09T08:00:00.000Z',
      },
    ],
    count: 1,
  };
}

function makeB2BTenant(): TenantConfig {
  return {
    id: 'tenant-1',
    slug: 'qa-b2b',
    name: 'QA B2B',
    type: TenantType.B2B,
    tenant_category: TenantType.B2B,
    is_white_label: false,
    status: TenantStatus.ACTIVE,
    plan: 'PROFESSIONAL',
    theme: {
      primaryColor: '#0f172a',
      secondaryColor: '#1e293b',
      logo: 'Q',
    },
    features: [],
    aiBudget: 0,
    aiUsage: 0,
    billingStatus: 'CURRENT',
    riskScore: 0,
  };
}

function makeAggregatorTenant(): TenantConfig {
  return {
    ...makeB2BTenant(),
    id: 'tenant-agg-1',
    slug: 'qa-aggregator',
    name: 'QA Aggregator',
    type: TenantType.AGGREGATOR,
    tenant_category: TenantType.AGGREGATOR,
  };
}

function makeWhiteLabelTenant(): TenantConfig {
  return {
    ...makeB2BTenant(),
    id: 'tenant-wl-1',
    slug: 'qa-wl',
    name: 'QA WL',
    is_white_label: true,
  };
}

function renderPendingInvitesPanel(
  response: MembershipsResponse,
  options: {
    canEdit?: boolean;
    canRevoke?: boolean;
    canResend?: boolean;
    editingInviteId?: string | null;
    revokingInviteId?: string | null;
    resendingInviteId?: string | null;
    inviteActionNotice?: string | null;
  } = {},
) {
  return renderToStaticMarkup(
    React.createElement(TeamManagementPendingInvitesPanel, {
      pendingInvites: response.pendingInvites,
      canEdit: options.canEdit,
      canRevoke: options.canRevoke,
      canResend: options.canResend,
      editingInviteId: options.editingInviteId,
      revokingInviteId: options.revokingInviteId,
      resendingInviteId: options.resendingInviteId,
      inviteActionNotice: options.inviteActionNotice,
      onEdit: options.canEdit ? vi.fn() : undefined,
      onRevoke: options.canRevoke ? vi.fn() : undefined,
      onResend: options.canResend ? vi.fn() : undefined,
    }),
  );
}

function renderInviteMemberSuccessState(email: string, emailDelivery: InviteEmailDeliveryOutcome) {
  return renderToStaticMarkup(
    React.createElement(InviteMemberSuccessState, {
      email,
      emailDelivery,
    }),
  );
}

function renderB2BShell() {
  return renderToStaticMarkup(
    React.createElement(
      B2BShell,
      {
        tenant: makeB2BTenant(),
        navigation: {
          surface: {
            activeRouteKey: 'catalog',
            activeNavigationKey: 'HOME',
            defaultRouteKey: 'catalog',
            items: [
              { routeKey: 'catalog', navigationKey: 'HOME', routeGroupKey: 'catalog_browse', active: true },
              { routeKey: 'orders', navigationKey: 'ORDERS', routeGroupKey: 'orders_operations', active: false },
              { routeKey: 'dpp', navigationKey: 'DPP', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'escrow', navigationKey: 'ESCROW', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'escalations', navigationKey: 'ESCALATIONS', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'settlement', navigationKey: 'SETTLEMENT', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'certifications', navigationKey: 'CERTIFICATIONS', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'traceability', navigationKey: 'TRACEABILITY', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'audit_logs', navigationKey: 'AUDIT_LOGS', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'trades', navigationKey: 'TRADES', routeGroupKey: 'operational_workspace', active: false },
            ],
          },
          onNavigateRoute: () => undefined,
          onNavigateTeam: () => undefined,
        },
      },
      React.createElement('section', null, 'Workspace body'),
    ),
  );
}

function renderAggregatorShell() {
  return renderToStaticMarkup(
    React.createElement(
      AggregatorShell,
      {
        tenant: makeAggregatorTenant(),
        navigation: {
          surface: {
            activeRouteKey: 'home',
            activeNavigationKey: 'HOME',
            defaultRouteKey: 'home',
            items: [
              { routeKey: 'home', navigationKey: 'HOME', routeGroupKey: 'home_landing', active: true },
              { routeKey: 'orders', navigationKey: 'ORDERS', routeGroupKey: 'orders_operations', active: false },
              { routeKey: 'certifications', navigationKey: 'CERTIFICATIONS', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'traceability', navigationKey: 'TRACEABILITY', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'audit_logs', navigationKey: 'AUDIT_LOGS', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'trades', navigationKey: 'TRADES', routeGroupKey: 'operational_workspace', active: false },
            ],
          },
          onNavigateRoute: () => undefined,
          onNavigateTeam: () => undefined,
        },
      },
      React.createElement('section', null, 'Aggregator body'),
    ),
  );
}

function renderWhiteLabelShell() {
  return renderToStaticMarkup(
    React.createElement(
      WhiteLabelShell,
      {
        tenant: makeWhiteLabelTenant(),
        navigation: {
          surface: {
            activeRouteKey: 'home',
            activeNavigationKey: 'HOME',
            defaultRouteKey: 'home',
            items: [
              { routeKey: 'home', navigationKey: 'HOME', routeGroupKey: 'home_landing', active: true },
              { routeKey: 'orders', navigationKey: 'ORDERS', routeGroupKey: 'orders_operations', active: false },
              { routeKey: 'escrow', navigationKey: 'ESCROW', routeGroupKey: 'operational_workspace', active: false },
              { routeKey: 'trades', navigationKey: 'TRADES', routeGroupKey: 'operational_workspace', active: false },
            ],
          },
          onNavigateRoute: () => undefined,
          onNavigateTeam: () => undefined,
        },
      },
      React.createElement('section', null, 'White-label storefront body'),
    ),
  );
}

function renderWhiteLabelAdminShell() {
  return renderToStaticMarkup(
    React.createElement(
      WhiteLabelAdminShell,
      {
        tenant: makeWhiteLabelTenant(),
        navigation: {
          activeRouteKey: 'staff',
          activeNavigationKey: 'STAFF',
          defaultRouteKey: 'branding',
          items: [
            { routeKey: 'branding', navigationKey: 'BRANDING', routeGroupKey: 'admin_branding_domains', active: false },
            { routeKey: 'staff', navigationKey: 'STAFF', routeGroupKey: 'admin_branding_domains', active: true },
            { routeKey: 'products', navigationKey: 'PRODUCTS', routeGroupKey: 'catalog_browse', active: false },
            { routeKey: 'orders', navigationKey: 'ORDERS', routeGroupKey: 'orders_operations', active: false },
            { routeKey: 'domains', navigationKey: 'DOMAINS', routeGroupKey: 'admin_branding_domains', active: false },
          ],
        },
        onNavigateRoute: () => undefined,
        onNavigateStorefront: () => undefined,
      },
      React.createElement('section', null, 'White-label admin body'),
    ),
  );
}

function renderTeamManagement() {
  return renderToStaticMarkup(
    React.createElement(TeamManagement, {
      onInvite: () => undefined,
    }),
  );
}

describe('runtime verification - tenant enterprise service contracts', () => {
  beforeEach(() => {
    tenantDeleteMock.mockReset();
    tenantGetMock.mockReset();
    tenantPatchMock.mockReset();
    tenantPostMock.mockReset();
  });

  it('uses the existing trades endpoint and preserves the read-only envelope', async () => {
    const response = makeTradeResponse();
    tenantGetMock.mockResolvedValue(response);

    const result = await listTenantTrades({ limit: 50, status: 'ACTIVE' });

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/trades?status=ACTIVE&limit=50');
    expect(result).toEqual(response);
    expect(result.trades[0].lifecycleState?.stateKey).toBe('ACTIVE');
  });

  it('uses the existing escrows endpoint and preserves the list envelope expected by the tenant panel', async () => {
    const response = makeEscrowResponse();
    tenantGetMock.mockResolvedValue(response);

    const result = await listEscrows({ limit: 25, offset: 0 });

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/escrows?limit=25&offset=0');
    expect(result).toEqual(response);
    expect(result.escrows[0].lifecycleStateKey).toBe('ACTIVE');
  });

  it('uses the trade continuity escrow endpoint and preserves the create response envelope', async () => {
    const response: CreateTradeEscrowResponse = {
      tradeId: 'trade-1',
      escrowId: 'escrow-1',
      currency: 'USD',
    };
    tenantPostMock.mockResolvedValue(response);

    const result = await createTradeEscrow('trade-1', { reason: 'Escrow required for controlled release.' });

    expect(tenantPostMock).toHaveBeenCalledWith('/api/tenant/trades/trade-1/escrow', {
      reason: 'Escrow required for controlled release.',
    });
    expect(result).toEqual(response);
  });

  it('uses the existing traceability node and edge endpoints with stable response envelopes', async () => {
    const nodeResponse = makeNodeResponse();
    const edgeResponse = makeEdgeResponse();
    tenantGetMock.mockResolvedValueOnce(nodeResponse).mockResolvedValueOnce(edgeResponse);

    const nodes = await listNodes({ nodeType: 'LOT', limit: 20, offset: 5 });
    const edges = await listEdges({
      edgeType: 'BLENDED_FROM',
      fromNodeId: 'node-1',
      limit: 10,
      offset: 2,
      toNodeId: 'node-2',
    });

    expect(tenantGetMock).toHaveBeenNthCalledWith(
      1,
      '/api/tenant/traceability/nodes?nodeType=LOT&limit=20&offset=5',
    );
    expect(tenantGetMock).toHaveBeenNthCalledWith(
      2,
      '/api/tenant/traceability/edges?edgeType=BLENDED_FROM&fromNodeId=node-1&toNodeId=node-2&limit=10&offset=2',
    );
    expect(nodes.rows[0].batchId).toBe('BATCH-001');
    expect(edges.rows[0].edgeType).toBe('BLENDED_FROM');
  });

  it('uses the existing escalations endpoint and preserves OPEN escalation reads', async () => {
    const response = makeEscalationResponse();
    tenantGetMock.mockResolvedValue(response);

    const result = await listEscalations({ limit: 50, status: 'OPEN' });

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/escalations?status=OPEN&limit=50');
    expect(result).toEqual(response);
    expect(result.escalations[0].status).toBe('OPEN');
  });

  it('uses the existing certifications endpoint and preserves the tenant list envelope', async () => {
    const response = makeCertificationResponse();
    tenantGetMock.mockResolvedValue(response);

    const result = await listCertifications({ limit: 10, offset: 0, stateKey: 'SUBMITTED' });

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/certifications?stateKey=SUBMITTED&limit=10&offset=0');
    expect(result).toEqual(response);
    expect(result.items[0].stateKey).toBe('SUBMITTED');
  });

  it('uses the memberships endpoint and preserves the pending-invite read projection envelope', async () => {
    const response = makeMembershipsResponse();
    tenantGetMock.mockResolvedValue(response);

    const result = await getMemberships();

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/memberships');
    expect(result).toEqual(response);
    expect(result.pendingInvites[0].email).toBe('new-admin@tenant.test');
    expect(result.pendingInvites[1].role).toBe('MEMBER');
  });

  it('uses the invite issuance endpoint and preserves activation handoff plus bounded email delivery outcome', async () => {
    const response = {
      invite: {
        id: 'invite-1',
        email: 'new-admin@tenant.test',
        role: 'ADMIN',
        expiresAt: '2026-04-18T00:00:00.000Z',
      },
      inviteToken: 'invite-token-1',
      emailDelivery: {
        status: 'SENT',
      } satisfies InviteEmailDeliveryOutcome,
    };
    tenantPostMock.mockResolvedValue(response);

    const result = await createMembership({ email: 'new-admin@tenant.test', role: 'ADMIN' });

    expect(tenantPostMock).toHaveBeenCalledWith('/api/tenant/memberships', {
      email: 'new-admin@tenant.test',
      role: 'ADMIN',
    });
    expect(result).toEqual(response);
    expect(result.inviteToken).toBe('invite-token-1');
    expect(result.emailDelivery.status).toBe('SENT');
  });

  it('keeps buyer RFQ initiation open-state continuity inside the Request Quote slice', () => {
    const product = makeCatalogItem();

    const openOutcome = resolveBuyerRfqOpenAction({
      product,
      isVerificationBlockedTenantWorkspace: false,
      verificationBlockedActionMessage: 'Verification approval is required.',
    });

    expect(openOutcome.blocked).toBe(false);
    expect(openOutcome.catalogError).toBeNull();
    expect(openOutcome.dialog).toEqual({
      ...createInitialBuyerRfqDialogState(),
      open: true,
      product,
      quantity: '12',
    });

    const blockedOutcome = resolveBuyerRfqOpenAction({
      product: makeCatalogItem({ moq: undefined }),
      isVerificationBlockedTenantWorkspace: true,
      verificationBlockedActionMessage: 'Verification approval is required.',
    });

    expect(blockedOutcome.blocked).toBe(true);
    expect(blockedOutcome.catalogError).toBe('Verification approval is required.');
    expect(blockedOutcome.dialog).toBeNull();
  });

  it('keeps buyer RFQ dialog close/reset continuity inside the App-owned Request Quote cancel seam', () => {
    const closeState = resolveBuyerRfqCloseState();

    expect(closeState).toEqual({
      dialog: createInitialBuyerRfqDialogState(),
      detailView: createInitialBuyerRfqDetailViewState(),
    });
  });

  it('uses the buyer RFQ create endpoint with trimmed submit payload continuity', async () => {
    const submitResolution = resolveBuyerRfqSubmitPayload({
      ...createInitialBuyerRfqDialogState(),
      open: true,
      product: makeCatalogItem(),
      quantity: ' 24 ',
      buyerMessage: '  Need export-grade packing.  ',
    });

    expect(submitResolution.error).toBeNull();
    expect(submitResolution.payload).toEqual({
      catalogItemId: 'item-1',
      quantity: 24,
      buyerMessage: 'Need export-grade packing.',
    });

    tenantPostMock.mockResolvedValue(makeCreateRfqResponse());
    if (!submitResolution.payload) {
      throw new Error('Expected RFQ submit payload to be present for the continuity check.');
    }

    const result = await createRfq(submitResolution.payload);

    expect(tenantPostMock).toHaveBeenCalledWith('/api/tenant/rfqs', {
      catalogItemId: 'item-1',
      quantity: 24,
      buyerMessage: 'Need export-grade packing.',
    });
    expect(result.rfq.id).toBe('rfq-1');

    const invalidResolution = resolveBuyerRfqSubmitPayload({
      ...createInitialBuyerRfqDialogState(),
      open: true,
      product: makeCatalogItem(),
      quantity: '0',
      buyerMessage: '',
    });

    expect(invalidResolution.payload).toBeNull();
    expect(invalidResolution.error).toBe('Quantity must be an integer of at least 1.');
  });

  it('maps buyer RFQ submit success into the non-binding success state and RFQ detail continuity id', () => {
    const successState = resolveBuyerRfqSubmitSuccess(makeCreateRfqResponse());

    expect(successState.dialogPatch).toEqual({
      loading: false,
      error: null,
      success: {
        rfqId: 'rfq-1',
        quantity: 24,
      },
    });
    expect(successState.detailView).toEqual({
      ...createInitialBuyerRfqDetailViewState(),
      rfqId: 'rfq-1',
    });
  });

  it('maps buyer RFQ submit failures to API and fallback messages without widening the flow', () => {
    expect(resolveBuyerRfqSubmitError(new APIError(422, 'RFQ creation is unavailable.'))).toBe(
      'RFQ creation is unavailable.',
    );
    expect(resolveBuyerRfqSubmitError(new Error('boom'))).toBe(
      'Failed to submit your request for quote. Please try again.',
    );
  });

  it('keeps buyer RFQ list continuity inside the App-owned loading seam', () => {
    const currentRfqs = [makeBuyerRfqListItem()];
    const openAction = resolveBuyerRfqListOpenAction({
      loading: false,
      error: 'stale',
      rfqs: currentRfqs,
    });

    expect(openAction).toEqual({
      loading: true,
      error: null,
      rfqs: currentRfqs,
    });
  });

  it('invokes getBuyerRfqs and maps buyer RFQ list success into App-owned state continuity', async () => {
    const rfqs = [makeBuyerRfqListItem()];
    tenantGetMock.mockResolvedValue({
      rfqs,
      count: rfqs.length,
    } satisfies BuyerRfqListResponse);

    const listView = await loadBuyerRfqListContinuity({
      loadBuyerRfqs: getBuyerRfqs,
    });

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/rfqs');
    expect(listView).toEqual({
      ...createInitialBuyerRfqListViewState(),
      loading: false,
      error: null,
      rfqs,
    });
  });

  it('maps buyer RFQ list fetch failures to API and fallback App-owned error states', async () => {
    const apiErrorView = await loadBuyerRfqListContinuity({
      loadBuyerRfqs: vi.fn(async (): Promise<BuyerRfqListResponse> => {
        throw new APIError(503, 'Buyer RFQ list is unavailable.');
      }),
    });

    expect(apiErrorView).toEqual({
      ...createInitialBuyerRfqListViewState(),
      loading: false,
      error: 'Buyer RFQ list is unavailable.',
      rfqs: [],
    });

    const fallbackErrorView = await loadBuyerRfqListContinuity({
      loadBuyerRfqs: vi.fn(async (): Promise<BuyerRfqListResponse> => {
        throw new Error('boom');
      }),
    });

    expect(fallbackErrorView).toEqual({
      ...createInitialBuyerRfqListViewState(),
      loading: false,
      error: 'Unable to load your RFQs right now.',
      rfqs: [],
    });
  });

  it('keeps buyer RFQ detail continuity inside the App-owned open/loading seam', () => {
    const openAction = resolveBuyerRfqDetailOpenAction({
      fallbackRfqId: 'rfq-1',
      source: 'dialog',
      currentDetailView: createInitialBuyerRfqDetailViewState(),
    });

    expect(openAction.kind).toBe('load');
    expect(openAction.rfqId).toBe('rfq-1');
    expect(openAction.detailView).toEqual({
      ...createInitialBuyerRfqDetailViewState(),
      open: true,
      source: 'dialog',
      rfqId: 'rfq-1',
      loading: true,
    });

    const reuseAction = resolveBuyerRfqDetailOpenAction({
      rfqId: 'rfq-1',
      source: 'dialog',
      currentDetailView: {
        ...createInitialBuyerRfqDetailViewState(),
        open: false,
        source: 'dialog',
        rfqId: 'rfq-1',
        loading: false,
        error: 'stale',
        data: makeBuyerRfqDetail(),
      },
    });

    expect(reuseAction.kind).toBe('reuse');
    expect(reuseAction.detailView).toEqual({
      ...createInitialBuyerRfqDetailViewState(),
      open: true,
      source: 'dialog',
      rfqId: 'rfq-1',
      loading: false,
      error: null,
      data: makeBuyerRfqDetail(),
    });
  });

  it('invokes getBuyerRfqDetail and maps buyer RFQ detail success into App-owned state continuity', async () => {
    const rfq = makeBuyerRfqDetail();
    const getBuyerRfqDetailMock = vi.fn(async (rfqId: string): Promise<BuyerRfqDetailResponse> => ({
      rfq: {
        ...rfq,
        id: rfqId,
      },
    }));

    const detailView = await loadBuyerRfqDetailContinuity({
      rfqId: 'rfq-1',
      source: 'dialog',
      loadBuyerRfqDetail: getBuyerRfqDetailMock,
    });

    expect(getBuyerRfqDetailMock).toHaveBeenCalledWith('rfq-1');
    expect(detailView).toEqual({
      ...createInitialBuyerRfqDetailViewState(),
      open: true,
      source: 'dialog',
      rfqId: 'rfq-1',
      loading: false,
      error: null,
      data: rfq,
    });
  });

  it('maps buyer RFQ detail fetch failures to API and fallback App-owned error states', async () => {
    const apiErrorView = await loadBuyerRfqDetailContinuity({
      rfqId: 'rfq-1',
      source: 'dialog',
      loadBuyerRfqDetail: vi.fn(async (_rfqId: string): Promise<BuyerRfqDetailResponse> => {
        throw new APIError(404, 'RFQ not found.');
      }),
    });

    expect(apiErrorView).toEqual({
      ...createInitialBuyerRfqDetailViewState(),
      open: true,
      source: 'dialog',
      rfqId: 'rfq-1',
      loading: false,
      error: 'RFQ not found.',
      data: null,
    });

    const fallbackErrorView = await loadBuyerRfqDetailContinuity({
      rfqId: 'rfq-2',
      source: 'list',
      loadBuyerRfqDetail: vi.fn(async (_rfqId: string): Promise<BuyerRfqDetailResponse> => {
        throw new Error('boom');
      }),
    });

    expect(fallbackErrorView).toEqual({
      ...createInitialBuyerRfqDetailViewState(),
      open: true,
      source: 'list',
      rfqId: 'rfq-2',
      loading: false,
      error: 'Unable to load RFQ detail right now.',
      data: null,
    });
  });

  it('keeps buyer RFQ detail return-to-list continuity inside the App-owned list-sourced onBack seam', () => {
    const currentTradeBridge = {
      ...createInitialBuyerRfqTradeBridgeState(),
      loading: true,
      error: 'stale trade continuity error',
      initialTradeId: 'trade-1',
    };

    const returnState = resolveBuyerRfqDetailReturnToListState({
      currentTradeBridge,
    });

    expect(returnState).toEqual({
      tradeBridge: {
        ...currentTradeBridge,
        loading: false,
        error: null,
      },
      detailView: createInitialBuyerRfqDetailViewState(),
    });
  });

  it('keeps buyer RFQ detail close continuity inside the App-owned dialog-sourced onBack seam', () => {
    const currentTradeBridge = {
      ...createInitialBuyerRfqTradeBridgeState(),
      loading: true,
      error: 'stale trade continuity error',
      initialTradeId: 'trade-1',
    };
    const currentDetailView = {
      ...createInitialBuyerRfqDetailViewState(),
      open: true,
      source: 'dialog' as const,
      rfqId: 'rfq-1',
      loading: false,
      error: 'stale detail error',
      data: makeBuyerRfqDetail(),
    };

    const closeState = resolveBuyerRfqDetailCloseState({
      currentTradeBridge,
      currentDetailView,
    });

    expect(closeState).toEqual({
      tradeBridge: {
        ...currentTradeBridge,
        loading: false,
        error: null,
      },
      detailView: {
        ...currentDetailView,
        open: false,
      },
    });
  });

  it('keeps buyer trade-from-RFQ continuity inside the App-owned responded create seam', () => {
    const noopAction = resolveBuyerRfqTradeFromRfqCreateAction(
      makeBuyerRfqDetail({ status: 'OPEN' }),
    );

    expect(noopAction).toEqual({
      kind: 'noop',
      tradeBridge: null,
      payload: null,
    });

    const invalidAmountAction = resolveBuyerRfqTradeFromRfqCreateAction(
      makeBuyerRfqDetail({ item_unit_price: 0 }),
    );

    expect(invalidAmountAction).toEqual({
      kind: 'invalid-gross-amount',
      tradeBridge: {
        ...createInitialBuyerRfqTradeBridgeState(),
        error: 'Unable to derive a valid trade amount from the responded RFQ detail.',
      },
      payload: null,
    });

    const createAction = resolveBuyerRfqTradeFromRfqCreateAction(makeBuyerRfqDetail());

    expect(createAction).toEqual({
      kind: 'create-trade',
      tradeBridge: {
        ...createInitialBuyerRfqTradeBridgeState(),
        loading: true,
      },
      payload: {
        rfqId: 'rfq-1',
        tradeReference: 'TRD-RFQ-RFQ1',
        currency: 'USD',
        grossAmount: 444,
        reason: 'Bridge responded RFQ rfq-1 into existing trade continuity.',
      },
    });
  });

  it('invokes createTradeFromRfq and maps trade-from-RFQ success into App-owned continuity', async () => {
    const response = makeTradeFromRfqResponse();
    tenantPostMock.mockResolvedValue(response);

    const rfq = makeBuyerRfqDetail();
    const createAction = resolveBuyerRfqTradeFromRfqCreateAction(rfq);
    expect(createAction.kind).toBe('create-trade');

    if (createAction.kind !== 'create-trade') {
      throw new Error('Expected responded RFQ to enter the create-trade continuity path.');
    }

    const currentDetailView = {
      ...createInitialBuyerRfqDetailViewState(),
      open: true,
      source: 'dialog' as const,
      rfqId: 'rfq-1',
      data: rfq,
    };

    const result = await continueBuyerRfqTradeFromRfqCreatePath({
      payload: createAction.payload,
      currentDetailView,
      createTrade: createTradeFromRfq,
    });

    expect(tenantPostMock).toHaveBeenCalledWith('/api/tenant/trades/from-rfq', createAction.payload);
    expect(result).toEqual({
      kind: 'created',
      detailView: {
        ...currentDetailView,
        open: false,
        data: {
          ...rfq,
          trade_continuity: {
            trade_id: response.tradeId,
            trade_reference: response.tradeReference,
          },
        },
      },
      tradeBridge: {
        ...createInitialBuyerRfqTradeBridgeState(),
        initialTradeId: response.tradeId,
      },
    });
  });

  it('maps trade-from-RFQ create failures to API and fallback App-owned error states', async () => {
    const createAction = resolveBuyerRfqTradeFromRfqCreateAction(makeBuyerRfqDetail());
    expect(createAction.kind).toBe('create-trade');

    if (createAction.kind !== 'create-trade') {
      throw new Error('Expected responded RFQ to enter the create-trade continuity path.');
    }

    const currentDetailView = {
      ...createInitialBuyerRfqDetailViewState(),
      open: true,
      source: 'dialog' as const,
      rfqId: 'rfq-1',
      data: makeBuyerRfqDetail(),
    };

    const apiErrorResult = await continueBuyerRfqTradeFromRfqCreatePath({
      payload: createAction.payload,
      currentDetailView,
      createTrade: vi.fn(async () => {
        throw new APIError(503, 'Trade bridge is unavailable.');
      }),
    });

    expect(apiErrorResult.kind).toBe('error');
    if (apiErrorResult.kind !== 'error') {
      throw new Error('Expected API failure to stay inside the App-owned trade bridge error path.');
    }

    expect(resolveBuyerRfqTradeFromRfqError(apiErrorResult.error)).toEqual({
      ...createInitialBuyerRfqTradeBridgeState(),
      error: 'Trade bridge is unavailable.',
    });

    const fallbackErrorResult = await continueBuyerRfqTradeFromRfqCreatePath({
      payload: createAction.payload,
      currentDetailView,
      createTrade: vi.fn(async () => {
        throw new Error('boom');
      }),
    });

    expect(fallbackErrorResult.kind).toBe('error');
    if (fallbackErrorResult.kind !== 'error') {
      throw new Error('Expected fallback failure to stay inside the App-owned trade bridge error path.');
    }

    expect(resolveBuyerRfqTradeFromRfqError(fallbackErrorResult.error)).toEqual({
      ...createInitialBuyerRfqTradeBridgeState(),
      error: 'Unable to continue this responded RFQ into the existing trade flow right now.',
    });
  });

  it('keeps supplier inbox continuity inside the App-owned open/loading seam', () => {
    const currentRfqs = [makeSupplierRfqListItem()];
    const openAction = resolveSupplierRfqInboxOpenAction({
      loading: false,
      error: 'stale',
      rfqs: currentRfqs,
    });

    expect(openAction.detailView).toEqual({
      open: false,
      rfqId: null,
      loading: false,
      error: null,
      submitLoading: false,
      submitError: null,
      data: null,
      response: null,
    });
    expect(openAction.listView).toEqual({
      loading: true,
      error: null,
      rfqs: currentRfqs,
    });
  });

  it('keeps supplier RFQ inbox entry continuity inside the App-owned route-handoff seam', () => {
    const currentRfqs = [makeSupplierRfqListItem()];
    const entryState = resolveSupplierRfqInboxEntryState({
      loading: false,
      error: 'stale',
      rfqs: currentRfqs,
    });

    expect(entryState).toEqual({
      routeKey: 'supplier_rfq_inbox',
      detailView: createInitialSupplierRfqDetailViewState(),
      listView: {
        loading: true,
        error: null,
        rfqs: currentRfqs,
      },
    });
  });

  it('invokes getSupplierRfqInbox and maps supplier inbox success into App-owned list continuity', async () => {
    const rfqs = [makeSupplierRfqListItem()];
    tenantGetMock.mockResolvedValue({
      rfqs,
      count: rfqs.length,
    } satisfies SupplierRfqListResponse);

    const listView = await loadSupplierRfqInboxContinuity({
      loadSupplierRfqInbox: getSupplierRfqInbox,
    });

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/rfqs/inbox');
    expect(listView).toEqual({
      loading: false,
      error: null,
      rfqs,
    });
  });

  it('maps supplier inbox fetch failures to API and fallback App-owned error states', async () => {
    const apiErrorView = await loadSupplierRfqInboxContinuity({
      loadSupplierRfqInbox: vi.fn(async (): Promise<SupplierRfqListResponse> => {
        throw new APIError(503, 'Supplier inbox is unavailable.');
      }),
    });

    expect(apiErrorView).toEqual({
      loading: false,
      error: 'Supplier inbox is unavailable.',
      rfqs: [],
    });

    const fallbackErrorView = await loadSupplierRfqInboxContinuity({
      loadSupplierRfqInbox: vi.fn(async (): Promise<SupplierRfqListResponse> => {
        throw new Error('boom');
      }),
    });

    expect(fallbackErrorView).toEqual({
      loading: false,
      error: 'Unable to load the supplier RFQ inbox right now.',
      rfqs: [],
    });
  });

  it('keeps supplier RFQ inbox close continuity inside the App-owned onBack reset and default-route handoff seam', () => {
    const closeState = resolveSupplierRfqInboxCloseState();

    expect(closeState).toEqual({
      detailView: createInitialSupplierRfqDetailViewState(),
      navigateToDefaultRoute: true,
    });
  });

  it('keeps supplier RFQ detail continuity inside the App-owned open/loading seam', () => {
    const openAction = resolveSupplierRfqDetailOpenAction({
      rfqId: 'supplier-rfq-1',
      currentDetailView: createInitialSupplierRfqDetailViewState(),
    });

    expect(openAction.kind).toBe('load');
    expect(openAction.detailView).toEqual({
      ...createInitialSupplierRfqDetailViewState(),
      open: true,
      rfqId: 'supplier-rfq-1',
      loading: true,
    });

    const reuseAction = resolveSupplierRfqDetailOpenAction({
      rfqId: 'supplier-rfq-1',
      currentDetailView: {
        ...createInitialSupplierRfqDetailViewState(),
        open: false,
        rfqId: 'supplier-rfq-1',
        loading: false,
        error: 'stale',
        submitError: 'stale submit',
        data: makeSupplierRfqDetail(),
      },
    });

    expect(reuseAction.kind).toBe('reuse');
    expect(reuseAction.detailView).toEqual({
      ...createInitialSupplierRfqDetailViewState(),
      open: true,
      rfqId: 'supplier-rfq-1',
      loading: false,
      error: null,
      submitError: null,
      data: makeSupplierRfqDetail(),
    });
  });

  it('invokes getSupplierRfqDetail and maps supplier RFQ detail success into App-owned state continuity', async () => {
    const rfq = makeSupplierRfqDetail();
    tenantGetMock.mockResolvedValue({
      rfq,
    } satisfies SupplierRfqDetailResponse);

    const detailView = await loadSupplierRfqDetailContinuity({
      rfqId: 'supplier-rfq-1',
      existingResponse: null,
      loadSupplierRfqDetail: getSupplierRfqDetail,
    });

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/rfqs/inbox/supplier-rfq-1');
    expect(detailView).toEqual({
      ...createInitialSupplierRfqDetailViewState(),
      open: true,
      rfqId: 'supplier-rfq-1',
      loading: false,
      error: null,
      data: rfq,
    });
  });

  it('maps supplier RFQ detail fetch failures to API and fallback App-owned error states', async () => {
    const apiErrorView = await loadSupplierRfqDetailContinuity({
      rfqId: 'supplier-rfq-1',
      existingResponse: null,
      loadSupplierRfqDetail: vi.fn(async (): Promise<SupplierRfqDetailResponse> => {
        throw new APIError(404, 'RFQ not found.');
      }),
    });

    expect(apiErrorView).toEqual({
      ...createInitialSupplierRfqDetailViewState(),
      open: true,
      rfqId: 'supplier-rfq-1',
      loading: false,
      error: 'RFQ not found.',
      data: null,
    });

    const fallbackErrorView = await loadSupplierRfqDetailContinuity({
      rfqId: 'supplier-rfq-2',
      existingResponse: null,
      loadSupplierRfqDetail: vi.fn(async (): Promise<SupplierRfqDetailResponse> => {
        throw new Error('boom');
      }),
    });

    expect(fallbackErrorView).toEqual({
      ...createInitialSupplierRfqDetailViewState(),
      open: true,
      rfqId: 'supplier-rfq-2',
      loading: false,
      error: 'Unable to load supplier RFQ detail right now.',
      data: null,
    });
  });

  it('keeps supplier RFQ detail return-to-inbox continuity inside the App-owned onBack reset seam', () => {
    const returnState = resolveSupplierRfqDetailReturnToInboxState();

    expect(returnState).toEqual(createInitialSupplierRfqDetailViewState());
  });

  it('keeps supplier RFQ detail close continuity inside the App-owned onClose reset and default-route handoff seam', () => {
    const closeState = resolveSupplierRfqDetailCloseState();

    expect(closeState).toEqual({
      detailView: createInitialSupplierRfqDetailViewState(),
      navigateToDefaultRoute: true,
    });
  });

  it('keeps supplier RFQ respond validation and submit-loading continuity inside the App-owned submit seam', () => {
    const currentDetailView = {
      ...createInitialSupplierRfqDetailViewState(),
      open: true,
      rfqId: 'supplier-rfq-1',
      data: makeSupplierRfqDetail(),
      submitError: 'stale',
    };

    const validationAction = resolveSupplierRfqRespondSubmitAction({
      message: '   ',
      currentDetailView,
    });

    expect(validationAction).toEqual({
      kind: 'validation-error',
      payload: null,
      detailView: {
        ...currentDetailView,
        submitLoading: false,
        submitError: 'Response message is required.',
      },
    });

    const submitAction = resolveSupplierRfqRespondSubmitAction({
      message: 'We can ship next week.',
      currentDetailView,
    });

    expect(submitAction).toEqual({
      kind: 'submit',
      payload: {
        message: 'We can ship next week.',
      },
      detailView: {
        ...currentDetailView,
        submitLoading: true,
        submitError: null,
      },
    });
  });

  it('invokes submitSupplierRfqResponse and maps supplier RFQ respond success into App-owned continuity', async () => {
    const response = makeSupplierRfqResponse();
    tenantPostMock.mockResolvedValue({
      response,
      rfq: {
        id: 'supplier-rfq-1',
        status: 'RESPONDED',
      },
      non_binding: true,
    } satisfies SubmitSupplierRfqResponseResult);

    const rfq = makeSupplierRfqDetail();
    const currentDetailView = {
      ...createInitialSupplierRfqDetailViewState(),
      open: true,
      rfqId: 'supplier-rfq-1',
      data: rfq,
      submitLoading: true,
    };
    const untouchedListItem = makeSupplierRfqListItem({
      id: 'supplier-rfq-2',
      updated_at: '2026-03-22T09:30:00.000Z',
    });
    const currentListView = {
      loading: false,
      error: null,
      rfqs: [makeSupplierRfqListItem(), untouchedListItem],
    };

    const result = await submitSupplierRfqResponseContinuity({
      rfqId: 'supplier-rfq-1',
      payload: {
        message: 'We can ship next week.',
      },
      currentDetailView,
      currentListView,
      submitResponse: submitSupplierRfqResponse,
    });

    expect(tenantPostMock).toHaveBeenCalledWith('/api/tenant/rfqs/inbox/supplier-rfq-1/respond', {
      message: 'We can ship next week.',
    });
    expect(result).toEqual({
      detailView: {
        ...currentDetailView,
        submitLoading: false,
        submitError: null,
        data: {
          ...rfq,
          status: 'RESPONDED',
          updated_at: response.updated_at,
        },
        response,
      },
      listView: {
        ...currentListView,
        rfqs: [
          {
            ...currentListView.rfqs[0],
            status: 'RESPONDED',
            updated_at: response.updated_at,
          },
          untouchedListItem,
        ],
      },
    });
  });

  it('maps supplier RFQ respond failures to API and fallback App-owned error states', async () => {
    const currentDetailView = {
      ...createInitialSupplierRfqDetailViewState(),
      open: true,
      rfqId: 'supplier-rfq-1',
      data: makeSupplierRfqDetail(),
      submitLoading: true,
    };
    const currentListView = {
      loading: false,
      error: null,
      rfqs: [makeSupplierRfqListItem()],
    };

    const apiErrorResult = await submitSupplierRfqResponseContinuity({
      rfqId: 'supplier-rfq-1',
      payload: {
        message: 'We can ship next week.',
      },
      currentDetailView,
      currentListView,
      submitResponse: vi.fn(async () => {
        throw new APIError(409, 'RFQ already has a response.');
      }),
    });

    expect(apiErrorResult).toEqual({
      detailView: {
        ...currentDetailView,
        submitLoading: false,
        submitError: 'RFQ already has a response.',
      },
      listView: currentListView,
    });

    const fallbackErrorResult = await submitSupplierRfqResponseContinuity({
      rfqId: 'supplier-rfq-1',
      payload: {
        message: 'We can ship next week.',
      },
      currentDetailView,
      currentListView,
      submitResponse: vi.fn(async () => {
        throw new Error('boom');
      }),
    });

    expect(fallbackErrorResult).toEqual({
      detailView: {
        ...currentDetailView,
        submitLoading: false,
        submitError: 'Unable to submit the supplier response right now.',
      },
      listView: currentListView,
    });
  });

  it('uses the pending-invite revoke endpoint and preserves the delete envelope', async () => {
    const response = { deleted: 'invite-1' };
    tenantDeleteMock.mockResolvedValue(response);

    const result = await revokePendingInvite('invite-1');

    expect(tenantDeleteMock).toHaveBeenCalledWith('/api/tenant/memberships/invites/invite-1');
    expect(result).toEqual(response);
  });

  it('uses the pending-invite resend endpoint and preserves the safe invite envelope', async () => {
    const response = {
      invite: {
        ...makeMembershipsResponse().pendingInvites[0],
        expiresAt: '2026-04-21T00:00:00.000Z',
      },
      emailDelivery: {
        status: 'FAILED_NON_FATAL',
      } satisfies InviteEmailDeliveryOutcome,
    };
    tenantPostMock.mockResolvedValue(response);

    const result = await resendPendingInvite('invite-1');

    expect(tenantPostMock).toHaveBeenCalledWith('/api/tenant/memberships/invites/invite-1/resend');
    expect(result).toEqual(response);
    expect(result.invite).not.toHaveProperty('inviteToken');
    expect(result.invite).not.toHaveProperty('tokenHash');
    expect(result.emailDelivery.status).toBe('FAILED_NON_FATAL');
  });

  it('uses the pending-invite edit endpoint and preserves the safe invite envelope', async () => {
    const response = {
      invite: {
        ...makeMembershipsResponse().pendingInvites[0],
        role: 'OWNER',
      },
    };
    tenantPatchMock.mockResolvedValue(response);

    const result = await editPendingInvite('invite-1', { role: 'OWNER' });

    expect(tenantPatch).toHaveBeenCalledWith('/api/tenant/memberships/invites/invite-1', { role: 'OWNER' });
    expect(result).toEqual(response);
  });
});

describe('runtime verification - tenant membership pending invite surface', () => {
  it('keeps member reads while denying the invite CTA to non-writer roles', () => {
    expect(canInviteMembers('OWNER')).toBe(true);
    expect(canInviteMembers('ADMIN')).toBe(true);
    expect(canInviteMembers('MEMBER')).toBe(false);
    expect(canInviteMembers('VIEWER')).toBe(false);
    expect(canInviteMembers(null)).toBe(false);
  });

  it('renders pending invites in response order using safe invite fields only', () => {
    const html = renderPendingInvitesPanel(makeMembershipsResponse());

    expect(html).toContain('Pending Invitations');
    expect(html).toContain('new-admin@tenant.test');
    expect(html).toContain('new-member@tenant.test');
    expect(html).toContain('ADMIN');
    expect(html).toContain('MEMBER');
    expect(html).toContain('Expires Apr 18, 2026');
    expect(html).toContain('Expires Apr 17, 2026');
    expect(html.indexOf('new-admin@tenant.test')).toBeLessThan(html.indexOf('new-member@tenant.test'));
    expect(html).not.toContain('tokenHash');
    expect(html).not.toContain('inviteToken');
  });

  it('does not render revoke controls for non-writer invite rows', () => {
    const html = renderPendingInvitesPanel(makeMembershipsResponse(), {
      canEdit: false,
      canRevoke: false,
      canResend: false,
    });

    expect(html).not.toContain('Edit Invite');
    expect(html).not.toContain('Cancel Invite');
    expect(html).not.toContain('Cancelling…');
    expect(html).not.toContain('Resend Invite');
    expect(html).not.toContain('Resending…');
  });

  it('renders writer edit controls and keeps the pending row while updating safe fields after edit', () => {
    const response = makeMembershipsResponse();
    const writerHtml = renderPendingInvitesPanel(response, { canEdit: true, canRevoke: true, canResend: true });
    const afterEdit = {
      ...response,
      pendingInvites: replacePendingInviteById(response.pendingInvites, {
        ...response.pendingInvites[0],
        role: 'OWNER',
      }),
    };
    const updatedHtml = renderPendingInvitesPanel(afterEdit, { canEdit: true, canRevoke: true, canResend: true });

    expect(writerHtml).toContain('Edit Invite');
    expect(updatedHtml).toContain('new-admin@tenant.test');
    expect(updatedHtml).toContain('OWNER');
    expect(updatedHtml).not.toContain('inviteToken');
    expect(updatedHtml).not.toContain('tokenHash');
  });

  it('requires an explicit role choice before either role-edit modal can save', () => {
    const response = makeMembershipsResponse();

    expect(getValidInviteRoles(response.pendingInvites[1])).toEqual(['OWNER', 'ADMIN']);
    expect(
      getValidNextRoles(
        {
          role: 'ADMIN',
          userId: 'user-2',
        },
        'user-1',
      ),
    ).toEqual(['OWNER', 'MEMBER']);
    expect(getInitialRoleSelection()).toBeNull();
  });

  it('renders writer resend controls and keeps the pending row while updating safe fields after resend', () => {
    const response = makeMembershipsResponse();
    const writerHtml = renderPendingInvitesPanel(response, { canEdit: true, canRevoke: true, canResend: true });
    const afterResend = {
      ...response,
      pendingInvites: replacePendingInviteById(response.pendingInvites, {
        ...response.pendingInvites[0],
        expiresAt: '2026-04-21T00:00:00.000Z',
      }),
    };
    const updatedHtml = renderPendingInvitesPanel(afterResend, { canEdit: true, canRevoke: true, canResend: true });

    expect(writerHtml).toContain('Edit Invite');
    expect(writerHtml).toContain('Resend Invite');
    expect(writerHtml).toContain('Cancel Invite');
    expect(updatedHtml).toContain('new-admin@tenant.test');
    expect(updatedHtml).toContain('Expires Apr 21, 2026');
    expect(updatedHtml).not.toContain('inviteToken');
  });

  it('renders create invite UI with truthful bounded delivery outcome messaging', () => {
    const sentHtml = renderInviteMemberSuccessState('new-admin@tenant.test', { status: 'SENT' });
    const devLoggedHtml = renderInviteMemberSuccessState('new-admin@tenant.test', { status: 'DEV_LOGGED' });
    const smtpMissingHtml = renderInviteMemberSuccessState('new-admin@tenant.test', { status: 'SKIPPED_SMTP_UNCONFIGURED' });
    const failedHtml = renderInviteMemberSuccessState('new-admin@tenant.test', { status: 'FAILED_NON_FATAL' });

    expect(sentHtml).toContain('Invite Recorded');
    expect(sentHtml).toContain('email dispatch completed successfully');
    expect(devLoggedHtml).toContain('dev-logged only');
    expect(smtpMissingHtml).toContain('SMTP is not configured');
    expect(failedHtml).toContain('failed non-fatally');
    expect(failedHtml).not.toContain('mailbox');
  });

  it('renders pending-invite resend UI with truthful bounded delivery outcome messaging', () => {
    const response = makeMembershipsResponse();
    const sentHtml = renderPendingInvitesPanel(response, {
      canEdit: true,
      canRevoke: true,
      canResend: true,
      inviteActionNotice: getPendingInviteDeliveryOutcomeMessage('new-admin@tenant.test', { status: 'SENT' }),
    });
    const devLoggedHtml = renderPendingInvitesPanel(response, {
      canEdit: true,
      canRevoke: true,
      canResend: true,
      inviteActionNotice: getPendingInviteDeliveryOutcomeMessage('new-admin@tenant.test', { status: 'DEV_LOGGED' }),
    });
    const smtpMissingHtml = renderPendingInvitesPanel(response, {
      canEdit: true,
      canRevoke: true,
      canResend: true,
      inviteActionNotice: getPendingInviteDeliveryOutcomeMessage('new-admin@tenant.test', { status: 'SKIPPED_SMTP_UNCONFIGURED' }),
    });
    const failedHtml = renderPendingInvitesPanel(response, {
      canEdit: true,
      canRevoke: true,
      canResend: true,
      inviteActionNotice: getPendingInviteDeliveryOutcomeMessage('new-admin@tenant.test', { status: 'FAILED_NON_FATAL' }),
    });

    expect(sentHtml).toContain('email dispatch completed successfully');
    expect(devLoggedHtml).toContain('dev-logged only');
    expect(smtpMissingHtml).toContain('SMTP is not configured');
    expect(failedHtml).toContain('failed non-fatally');
    expect(failedHtml).not.toContain('inviteToken');
    expect(failedHtml).not.toContain('tokenHash');
  });

  it('serializes pending invite row actions across the shared panel while a resend is in flight', () => {
    const response = makeMembershipsResponse();
    const html = renderPendingInvitesPanel(response, {
      canEdit: true,
      canRevoke: true,
      canResend: true,
      resendingInviteId: 'invite-1',
    });
    const disabledControls = html.match(/disabled=""/g) ?? [];

    expect(html).toContain('Resending…');
    expect(html).toContain('new-admin@tenant.test');
    expect(html).toContain('new-member@tenant.test');
    expect(disabledControls).toHaveLength(response.pendingInvites.length * 3);
  });

  it('renders writer revoke controls and removes the revoked invite from the pending list state', () => {
    const response = makeMembershipsResponse();
    const writerHtml = renderPendingInvitesPanel(response, { canEdit: true, canRevoke: true, canResend: true });
    const afterRevoke = {
      ...response,
      pendingInvites: removePendingInviteById(response.pendingInvites, 'invite-1'),
    };
    const updatedHtml = renderPendingInvitesPanel(afterRevoke, { canEdit: true, canRevoke: true, canResend: true });

    expect(writerHtml).toContain('Edit Invite');
    expect(writerHtml).toContain('Cancel Invite');
    expect(updatedHtml).not.toContain('new-admin@tenant.test');
    expect(updatedHtml).toContain('new-member@tenant.test');
    expect(updatedHtml).not.toContain('inviteToken');
  });

  it('keeps lower B2B workspace navigation items visible, exposes a scrollable desktop sidebar, and adds a handheld menu fallback', () => {
    const html = renderB2BShell();

    expect(html).toContain('Catalog');
    expect(html).toContain('Traceability');
    expect(html).toContain('Audit Log');
    expect(html).toContain('Trades');
    expect(html).toContain('Team Access');
    expect(html).toContain('sticky top-0 h-screen overflow-y-auto');
    expect(html).toContain('data-mobile-nav="b2b"');
    expect(html).toContain('data-mobile-item-count="11"');
  });

  it('adds handheld menu fallbacks for aggregator, white-label storefront, and white-label admin shells', () => {
    const aggregatorHtml = renderAggregatorShell();
    const storefrontHtml = renderWhiteLabelShell();
    const adminHtml = renderWhiteLabelAdminShell();

    expect(aggregatorHtml).toContain('data-mobile-nav="aggregator"');
    expect(aggregatorHtml).toContain('Companies');
    expect(aggregatorHtml).toContain('Team Access');

    expect(storefrontHtml).toContain('data-mobile-nav="wl-storefront"');
    expect(storefrontHtml).toContain('Portfolio');
    expect(storefrontHtml).toContain('Team Access');

    expect(adminHtml).toContain('data-mobile-nav="wl-admin"');
    expect(adminHtml).toContain('Store Profile');
    expect(adminHtml).toContain('Storefront');
  });

  it('renders the shared tenant-admin destination as the same common-core interpretation', () => {
    const html = renderTeamManagement();

    expect(html).toContain('Team Access');
    expect(html).toContain('shared tenant-admin core');
  });
});