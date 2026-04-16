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

import { listCertifications, type ListCertificationsResponse } from '../services/certificationService';
import { InviteMemberSuccessState } from '../components/Tenant/InviteMemberForm';
import {
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
  createTradeEscrow,
  listTenantTrades,
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
    expect(html).toContain('Members');
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
    expect(aggregatorHtml).toContain('Team');

    expect(storefrontHtml).toContain('data-mobile-nav="wl-storefront"');
    expect(storefrontHtml).toContain('Portfolio');
    expect(storefrontHtml).toContain('Access Control');

    expect(adminHtml).toContain('data-mobile-nav="wl-admin"');
    expect(adminHtml).toContain('Store Profile');
    expect(adminHtml).toContain('Storefront');
  });
});