import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantDelete: vi.fn(),
  tenantGet: vi.fn(),
  tenantPatch: vi.fn(),
  tenantPost: vi.fn(),
  tenantPut: vi.fn(),
}));

import { listCertifications, type ListCertificationsResponse } from '../services/certificationService';
import { listEscalations, type EscalationListResponse } from '../services/escalationService';
import { listEscrows, type EscrowListResponse } from '../services/escrowService';
import { listTenantTrades, type TenantTradesListResponse } from '../services/tradeService';
import { listEdges, listNodes, type EdgeListResponse, type NodeListResponse } from '../services/traceabilityService';
import { tenantGet } from '../services/tenantApiClient';

const tenantGetMock = vi.mocked(tenantGet);

function makeTradeResponse(): TenantTradesListResponse {
  return {
    trades: [
      {
        createdAt: '2026-03-21T08:00:00.000Z',
        id: 'trade-1',
        lifecycleState: { stateKey: 'ACTIVE' },
        tenantId: 'tenant-1',
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

describe('runtime verification - tenant enterprise service contracts', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
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
});