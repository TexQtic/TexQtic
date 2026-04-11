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
import { TeamManagementPendingInvitesPanel, canInviteMembers } from '../components/Tenant/TeamManagement';
import { listEscalations, type EscalationListResponse } from '../services/escalationService';
import { listEscrows, type EscrowListResponse } from '../services/escrowService';
import { getMemberships, type MembershipsResponse } from '../services/tenantService';
import {
  createTradeEscrow,
  listTenantTrades,
  type CreateTradeEscrowResponse,
  type TenantTradesListResponse,
} from '../services/tradeService';
import { listEdges, listNodes, type EdgeListResponse, type NodeListResponse } from '../services/traceabilityService';
import { tenantGet, tenantPost } from '../services/tenantApiClient';

const tenantGetMock = vi.mocked(tenantGet);
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

function renderPendingInvitesPanel(response: MembershipsResponse) {
  return renderToStaticMarkup(
    React.createElement(TeamManagementPendingInvitesPanel, {
      pendingInvites: response.pendingInvites,
    }),
  );
}

describe('runtime verification - tenant enterprise service contracts', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
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
});