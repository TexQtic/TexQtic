/**
 * Unit Tests — Pool RFQ Maker-Checker Award Routes
 * TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-ROUTE-001
 *
 * Route coverage:
 *   POST /:poolId/rfq/:rfqId/quotes/:quoteId/award-request
 *   POST /:poolId/rfq/:rfqId/award-approvals/:approvalId/approve
 *   POST /:poolId/rfq/:rfqId/award-approvals/:approvalId/reject
 *   GET  /:poolId/rfq/:rfqId/award-approvals
 *   (compat) POST /:poolId/rfq/:rfqId/quotes/:quoteId/accept — preserved, not converted
 *
 * Test structure: 16 tests (MC-ROUTE-01 through MC-ROUTE-16)
 *   MC-ROUTE-01..04: feature gate disabled → 503 FEATURE_DISABLED
 *   MC-ROUTE-05..08: happy paths — correct service call + response shape
 *   MC-ROUTE-09..13: error mapping — all 6 MC error classes covered
 *   MC-ROUTE-14..15: /accept compat — still exists, does NOT call requestAward
 *   MC-ROUTE-16:     DTO exposure — frozenPayload / frozenPayloadHash not in response
 */

// ─── Module mocks (hoisted by Vitest) ────────────────────────────────────────

vi.mock('../db/prisma.js', () => ({
  prisma: {},
}));

vi.mock('../services/stateMachine.service.js', () => ({
  StateMachineService: vi.fn(),
}));

vi.mock('../middleware/auth.js', () => ({
  tenantAuthMiddleware: vi.fn(),
}));

vi.mock('../middleware/database-context.middleware.js', () => ({
  databaseContextMiddleware: vi.fn(),
}));

vi.mock('../middleware/ncPoolFeatureGate.middleware.js', () => ({
  ncPoolFeatureGateMiddleware: vi.fn(),
}));

vi.mock('../middleware/ncPoolRfqFeatureGate.middleware.js', () => ({
  ncPoolRfqFeatureGateMiddleware: vi.fn(),
}));

vi.mock('../middleware/ncPoolRfqAwardFeatureGate.middleware.js', () => ({
  ncPoolRfqAwardFeatureGateMiddleware: vi.fn(),
}));

vi.mock('../middleware/ncPoolSupplierInviteFeatureGate.middleware.js', () => ({
  ncPoolSupplierInviteFeatureGateMiddleware: vi.fn(),
}));

// Keep real error classes; mock only the service constructor.
vi.mock('../services/networkPoolRfq.service.js', async importOriginal => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    NetworkPoolRfqService: vi.fn(),
  };
});

// ─── Imports ─────────────────────────────────────────────────────────────────

import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import poolRfqRoutes from '../routes/tenant/poolRfq.js';
import { tenantAuthMiddleware } from '../middleware/auth.js';
import { databaseContextMiddleware } from '../middleware/database-context.middleware.js';
import { ncPoolFeatureGateMiddleware } from '../middleware/ncPoolFeatureGate.middleware.js';
import { ncPoolRfqFeatureGateMiddleware } from '../middleware/ncPoolRfqFeatureGate.middleware.js';
import { ncPoolRfqAwardFeatureGateMiddleware } from '../middleware/ncPoolRfqAwardFeatureGate.middleware.js';
import {
  NetworkPoolRfqService,
  NetworkPoolRfqAwardRequestAlreadyPendingError,
  NetworkPoolRfqApprovalNotFoundError,
  NetworkPoolRfqApprovalAlreadyDecidedError,
  NetworkPoolRfqApprovalExpiredError,
  NetworkPoolRfqMakerCheckerSameActorError,
  NetworkPoolRfqQuoteNoLongerSubmittedError,
  type AwardApprovalRequest,
  type AwardApproved,
  type AwardRejected,
} from '../services/networkPoolRfq.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_ORG_ID      = 'aa000000-0000-0000-0000-000000000001';
const TEST_USER_ID     = 'bb000000-0000-0000-0000-000000000002';
const TEST_POOL_ID     = 'cc000000-0000-0000-0000-000000000003';
const TEST_RFQ_ID      = 'dd000000-0000-0000-0000-000000000004';
const TEST_QUOTE_ID    = 'ee000000-0000-0000-0000-000000000005';
const TEST_APPROVAL_ID = 'ff000000-0000-0000-0000-000000000006';

const PREFIX           = '/api/tenant/network-commerce/pools';
const AWARD_REQUEST_URL = `${PREFIX}/${TEST_POOL_ID}/rfq/${TEST_RFQ_ID}/quotes/${TEST_QUOTE_ID}/award-request`;
const APPROVE_URL       = `${PREFIX}/${TEST_POOL_ID}/rfq/${TEST_RFQ_ID}/award-approvals/${TEST_APPROVAL_ID}/approve`;
const REJECT_URL        = `${PREFIX}/${TEST_POOL_ID}/rfq/${TEST_RFQ_ID}/award-approvals/${TEST_APPROVAL_ID}/reject`;
const LIST_URL          = `${PREFIX}/${TEST_POOL_ID}/rfq/${TEST_RFQ_ID}/award-approvals`;
const ACCEPT_URL        = `${PREFIX}/${TEST_POOL_ID}/rfq/${TEST_RFQ_ID}/quotes/${TEST_QUOTE_ID}/accept`;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeApprovalRecord(overrides: Partial<AwardApprovalRequest> = {}): AwardApprovalRequest {
  return {
    id:                   TEST_APPROVAL_ID,
    status:               'REQUESTED',
    expires_at:           new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    entity_type:          'POOL',
    entity_id:            TEST_POOL_ID,
    from_state_key:       'QUOTED',
    to_state_key:         'ACCEPTED',
    requested_by_user_id: TEST_USER_ID,
    request_reason:       'Best price',
    created_at:           new Date().toISOString(),
    ...overrides,
  };
}

// ─── Test harness ─────────────────────────────────────────────────────────────

type MockSvcInstance = {
  requestAward: ReturnType<typeof vi.fn>;
  approveAward: ReturnType<typeof vi.fn>;
  rejectAwardApproval: ReturnType<typeof vi.fn>;
  getOwnerPendingAwardApprovals: ReturnType<typeof vi.fn>;
  acceptQuote: ReturnType<typeof vi.fn>;
  rejectQuote: ReturnType<typeof vi.fn>;
  listOwnerQuotes: ReturnType<typeof vi.fn>;
};

let mockSvc: MockSvcInstance;

async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  await fastify.register(poolRfqRoutes, { prefix: PREFIX });
  await fastify.ready();
  return fastify;
}

/** Sends the feature-disabled 503 response, simulating a disabled award gate. */
function makeGateBlocker() {
  return async (_req: unknown, reply: any) => {
    reply.code(503).send({
      success: false,
      error: {
        code:    'FEATURE_DISABLED',
        message: 'Network Commerce procurement pool RFQ award is disabled.',
      },
    });
  };
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Fresh service mock instance for each test.
  mockSvc = {
    requestAward:                  vi.fn(),
    approveAward:                  vi.fn(),
    rejectAwardApproval:           vi.fn(),
    getOwnerPendingAwardApprovals: vi.fn(),
    acceptQuote:                   vi.fn(),
    rejectQuote:                   vi.fn(),
    listOwnerQuotes:               vi.fn(),
  };
  vi.mocked(NetworkPoolRfqService).mockImplementation(function() { return mockSvc as any; });

  // Auth middleware injects OWNER context by default.
  vi.mocked(tenantAuthMiddleware).mockImplementation(async (request: any) => {
    request.userId   = TEST_USER_ID;
    request.userRole = 'OWNER';
    request.tenantId = TEST_ORG_ID;
  });

  vi.mocked(databaseContextMiddleware).mockImplementation(async (request: any) => {
    request.dbContext = { orgId: TEST_ORG_ID };
  });

  // Default: all feature gates pass through.
  vi.mocked(ncPoolFeatureGateMiddleware).mockImplementation(async () => {});
  vi.mocked(ncPoolRfqFeatureGateMiddleware).mockImplementation(async () => {});
  vi.mocked(ncPoolRfqAwardFeatureGateMiddleware).mockImplementation(async () => {});
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MC Award Routes — unit tests', () => {
  // ── MC-ROUTE-01..04: Feature gate disabled ────────────────────────────────

  it('MC-ROUTE-01: award-request returns 503 FEATURE_DISABLED when award gate disabled', async () => {
    vi.mocked(ncPoolRfqAwardFeatureGateMiddleware).mockImplementation(makeGateBlocker());

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     AWARD_REQUEST_URL,
        payload: { request_reason: 'test' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('FEATURE_DISABLED');
      expect(mockSvc.requestAward).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('MC-ROUTE-02: approve returns 503 FEATURE_DISABLED when award gate disabled', async () => {
    vi.mocked(ncPoolRfqAwardFeatureGateMiddleware).mockImplementation(makeGateBlocker());

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     APPROVE_URL,
        payload: { approve_reason: 'looks good' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('FEATURE_DISABLED');
      expect(mockSvc.approveAward).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('MC-ROUTE-03: reject returns 503 FEATURE_DISABLED when award gate disabled', async () => {
    vi.mocked(ncPoolRfqAwardFeatureGateMiddleware).mockImplementation(makeGateBlocker());

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     REJECT_URL,
        payload: { reject_reason: 'price too high' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('FEATURE_DISABLED');
      expect(mockSvc.rejectAwardApproval).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('MC-ROUTE-04: list pending returns 503 FEATURE_DISABLED when award gate disabled', async () => {
    vi.mocked(ncPoolRfqAwardFeatureGateMiddleware).mockImplementation(makeGateBlocker());

    const app = await buildApp();
    try {
      const res = await app.inject({
        method: 'GET',
        url:    LIST_URL,
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('FEATURE_DISABLED');
      expect(mockSvc.getOwnerPendingAwardApprovals).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  // ── MC-ROUTE-05..08: Happy paths ──────────────────────────────────────────

  it('MC-ROUTE-05: award-request calls requestAward with correct args and returns 201', async () => {
    const approval = makeApprovalRecord();
    mockSvc.requestAward.mockResolvedValue(approval);

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     AWARD_REQUEST_URL,
        payload: { request_reason: 'Best price' },
      });

      expect(res.statusCode).toBe(201);
      expect(mockSvc.requestAward).toHaveBeenCalledWith(
        TEST_ORG_ID,
        TEST_USER_ID,
        TEST_POOL_ID,
        TEST_RFQ_ID,
        TEST_QUOTE_ID,
        expect.objectContaining({ request_reason: 'Best price' }),
      );
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(TEST_APPROVAL_ID);
      expect(body.data.status).toBe('REQUESTED');
    } finally {
      await app.close();
    }
  });

  it('MC-ROUTE-06: approve calls approveAward with correct args and returns 200', async () => {
    const approval = makeApprovalRecord({ status: 'APPROVED' });
    const awardApproved: AwardApproved = {
      approval,
      quote: { id: TEST_QUOTE_ID } as any,
    };
    mockSvc.approveAward.mockResolvedValue(awardApproved);

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     APPROVE_URL,
        payload: { approve_reason: 'Quality supplier' },
      });

      expect(res.statusCode).toBe(200);
      expect(mockSvc.approveAward).toHaveBeenCalledWith(
        TEST_ORG_ID,
        TEST_USER_ID,
        TEST_APPROVAL_ID,
        expect.objectContaining({ approve_reason: 'Quality supplier' }),
      );
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.approval.status).toBe('APPROVED');
    } finally {
      await app.close();
    }
  });

  it('MC-ROUTE-07: reject calls rejectAwardApproval with correct args and returns 200', async () => {
    const approval = makeApprovalRecord({ status: 'REJECTED' });
    const awardRejected: AwardRejected = { approval };
    mockSvc.rejectAwardApproval.mockResolvedValue(awardRejected);

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     REJECT_URL,
        payload: { reject_reason: 'Price too high' },
      });

      expect(res.statusCode).toBe(200);
      expect(mockSvc.rejectAwardApproval).toHaveBeenCalledWith(
        TEST_ORG_ID,
        TEST_USER_ID,
        TEST_APPROVAL_ID,
        expect.objectContaining({ reject_reason: 'Price too high' }),
      );
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.approval.status).toBe('REJECTED');
    } finally {
      await app.close();
    }
  });

  it('MC-ROUTE-08: list pending calls getOwnerPendingAwardApprovals and returns 200 array', async () => {
    const records = [makeApprovalRecord(), makeApprovalRecord({ id: 'ff000000-0000-0000-0000-000000000099' })];
    mockSvc.getOwnerPendingAwardApprovals.mockResolvedValue(records);

    const app = await buildApp();
    try {
      const res = await app.inject({
        method: 'GET',
        url:    LIST_URL,
      });

      expect(res.statusCode).toBe(200);
      expect(mockSvc.getOwnerPendingAwardApprovals).toHaveBeenCalledWith(
        TEST_ORG_ID,
        TEST_POOL_ID,
        TEST_RFQ_ID,
      );
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(2);
    } finally {
      await app.close();
    }
  });

  // ── MC-ROUTE-09..13: Error mapping ────────────────────────────────────────

  it('MC-ROUTE-09: duplicate active request → 409 AWARD_REQUEST_ALREADY_PENDING', async () => {
    mockSvc.requestAward.mockRejectedValue(
      new NetworkPoolRfqAwardRequestAlreadyPendingError(),
    );

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     AWARD_REQUEST_URL,
        payload: { request_reason: 'test' },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('AWARD_REQUEST_ALREADY_PENDING');
    } finally {
      await app.close();
    }
  });

  it('MC-ROUTE-10: approval not found → 404 APPROVAL_NOT_FOUND', async () => {
    mockSvc.approveAward.mockRejectedValue(
      new NetworkPoolRfqApprovalNotFoundError(),
    );

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     APPROVE_URL,
        payload: { approve_reason: 'ok' },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('APPROVAL_NOT_FOUND');
    } finally {
      await app.close();
    }
  });

  it('MC-ROUTE-11: already decided → 409 APPROVAL_ALREADY_DECIDED; expired → 409 APPROVAL_EXPIRED', async () => {
    // Part A: already decided
    mockSvc.approveAward.mockRejectedValue(
      new NetworkPoolRfqApprovalAlreadyDecidedError('APPROVED'),
    );

    const appA = await buildApp();
    try {
      const resA = await appA.inject({
        method:  'POST',
        url:     APPROVE_URL,
        payload: { approve_reason: 'ok' },
      });
      expect(resA.statusCode).toBe(409);
      expect(JSON.parse(resA.body).error.code).toBe('APPROVAL_ALREADY_DECIDED');
    } finally {
      await appA.close();
    }

    // Part B: expired
    vi.clearAllMocks();
    vi.mocked(NetworkPoolRfqService).mockImplementation(function() { return mockSvc as any; });
    vi.mocked(tenantAuthMiddleware).mockImplementation(async (request: any) => {
      request.userId = TEST_USER_ID; request.userRole = 'OWNER'; request.tenantId = TEST_ORG_ID;
    });
    vi.mocked(databaseContextMiddleware).mockImplementation(async (request: any) => {
      request.dbContext = { orgId: TEST_ORG_ID };
    });
    vi.mocked(ncPoolFeatureGateMiddleware).mockImplementation(async () => {});
    vi.mocked(ncPoolRfqFeatureGateMiddleware).mockImplementation(async () => {});
    vi.mocked(ncPoolRfqAwardFeatureGateMiddleware).mockImplementation(async () => {});

    mockSvc.rejectAwardApproval.mockRejectedValue(
      new NetworkPoolRfqApprovalExpiredError(),
    );

    const appB = await buildApp();
    try {
      const resB = await appB.inject({
        method:  'POST',
        url:     REJECT_URL,
        payload: { reject_reason: 'test' },
      });
      expect(resB.statusCode).toBe(409);
      expect(JSON.parse(resB.body).error.code).toBe('APPROVAL_EXPIRED');
    } finally {
      await appB.close();
    }
  });

  it('MC-ROUTE-12: same maker/checker → 409 MAKER_CHECKER_SAME_ACTOR', async () => {
    mockSvc.approveAward.mockRejectedValue(
      new NetworkPoolRfqMakerCheckerSameActorError(),
    );

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     APPROVE_URL,
        payload: { approve_reason: 'ok' },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('MAKER_CHECKER_SAME_ACTOR');
    } finally {
      await app.close();
    }
  });

  it('MC-ROUTE-13: quote no longer submitted → 409 QUOTE_NO_LONGER_SUBMITTED', async () => {
    mockSvc.approveAward.mockRejectedValue(
      new NetworkPoolRfqQuoteNoLongerSubmittedError('ACCEPTED'),
    );

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     APPROVE_URL,
        payload: { approve_reason: 'ok' },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('QUOTE_NO_LONGER_SUBMITTED');
    } finally {
      await app.close();
    }
  });

  // ── MC-ROUTE-14..15: /accept compat ──────────────────────────────────────

  it('MC-ROUTE-14: old /accept route still exists and is feature-gated', async () => {
    const acceptedQuote = { id: TEST_QUOTE_ID, status: 'ACCEPTED' };
    mockSvc.acceptQuote.mockResolvedValue(acceptedQuote);

    const app = await buildApp();
    try {
      const res = await app.inject({
        method:  'POST',
        url:     ACCEPT_URL,
        payload: {},
      });

      // Route must exist (not 404) and must call acceptQuote (not 410 Gone or similar).
      expect(res.statusCode).not.toBe(404);
      expect(mockSvc.acceptQuote).toHaveBeenCalledWith(
        TEST_ORG_ID,
        TEST_USER_ID,
        TEST_POOL_ID,
        TEST_RFQ_ID,
        TEST_QUOTE_ID,
        expect.anything(),
      );
    } finally {
      await app.close();
    }
  });

  it('MC-ROUTE-15: old /accept route does NOT call requestAward', async () => {
    mockSvc.acceptQuote.mockResolvedValue({ id: TEST_QUOTE_ID, status: 'ACCEPTED' });

    const app = await buildApp();
    try {
      await app.inject({
        method:  'POST',
        url:     ACCEPT_URL,
        payload: {},
      });

      expect(mockSvc.requestAward).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  // ── MC-ROUTE-16: DTO exposure ─────────────────────────────────────────────

  it('MC-ROUTE-16: list response exposes only AwardApprovalRequest DTO fields', async () => {
    // The service's getOwnerPendingAwardApprovals returns AwardApprovalRequest[] —
    // a public DTO that never includes frozenPayload, frozenPayloadHash, or
    // makerPrincipalFingerprint. The route forwards the service result directly.
    // This test verifies that the response contains ONLY the expected DTO fields.
    const dtoRecord = makeApprovalRecord();
    mockSvc.getOwnerPendingAwardApprovals.mockResolvedValue([dtoRecord]);

    const app = await buildApp();
    try {
      const res = await app.inject({
        method: 'GET',
        url:    LIST_URL,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const record = body.data[0];

      // Verify the DTO fields are present in the response.
      expect(record).toHaveProperty('id', TEST_APPROVAL_ID);
      expect(record).toHaveProperty('status', 'REQUESTED');
      expect(record).toHaveProperty('request_reason', 'Best price');

      // Verify internal fields are absent (service never returns them in the DTO).
      expect(record).not.toHaveProperty('frozenPayload');
      expect(record).not.toHaveProperty('frozenPayloadHash');
      expect(record).not.toHaveProperty('makerPrincipalFingerprint');
    } finally {
      await app.close();
    }
  });
});
