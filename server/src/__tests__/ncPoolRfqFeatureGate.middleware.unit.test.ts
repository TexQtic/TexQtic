/**
 * ncPoolRfqFeatureGateMiddleware unit tests
 *
 * 16 test cases covering:
 *   --- Layer 1 (global flag) tests ---
 *   TC-001: Global flag row missing → 503 FEATURE_DISABLED
 *   TC-002: Global flag row exists with enabled=false → 503 FEATURE_DISABLED
 *   TC-003: DB read throws → 503 FEATURE_DISABLED (fail-closed)
 *   TC-004: Global flag true + no orgId → 503 FEATURE_DISABLED (fail-closed, unlike parent gate)
 *   TC-005: Middleware does not mutate DB (no write calls)
 *   TC-006: Middleware does not read or modify request body
 *   TC-007: Global flag missing → reply.code called with 503
 *   TC-008: Global flag true + orgId present + override true → reply.code NOT called
 *   TC-009: Global flag false even with dbContext → 503 (Layer 1 blocks before Layer 2)
 *   TC-010: Queries the correct feature flag key (nc.procurement_pools.rfq.enabled)
 *   TC-011: Does NOT query parent flag key (nc.procurement_pools.enabled)
 *   --- Layer 2 (per-org TenantFeatureOverride) tests ---
 *   TC-012: Global true, orgId in dbContext, no override row → allow
 *           (global=true + no override = allow; override is an exception, not a requirement)
 *   TC-013: Global true, orgId in dbContext, override enabled=true → allows
 *   TC-014: Global true, orgId in dbContext, override enabled=false → 503 FEATURE_DISABLED
 *   TC-015: Global true, orgId in dbContext, DB error on override lookup → 503 (fail-closed)
 *   TC-016: Cross-tenant isolation — explicit disable for authenticated org is respected;
 *           override lookup uses authenticated orgId, not a different org
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ncPoolRfqFeatureGateMiddleware } from '../middleware/ncPoolRfqFeatureGate.middleware.js';

// ─── Prisma mock ─────────────────────────────────────────────────────────────

vi.mock('../db/prisma.js', () => ({
  prisma: {
    featureFlag: {
      findUnique: vi.fn(),
    },
    tenantFeatureOverride: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../db/prisma.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRequest(overrides: Record<string, unknown> = {}): any {
  return {
    url: '/api/tenant/pools/pool-id/demand-lines/lock-for-rfq',
    method: 'POST',
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    ...overrides,
  };
}

function makeReply(): any {
  const reply: any = {
    _code: 200,
    _sent: null as unknown,
    code(statusCode: number) {
      reply._code = statusCode;
      return reply;
    },
    send(body: unknown) {
      reply._sent = body;
      return reply;
    },
  };
  return reply;
}

const RFQ_FLAG_KEY = 'nc.procurement_pools.rfq.enabled';
const ORG_ID = 'aa000000-0000-0000-0000-000000000001';

function makeGlobalFlag(enabled: boolean) {
  return {
    key: RFQ_FLAG_KEY,
    enabled,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    value: null,
  };
}

function makeOverride(tenantId: string, enabled: boolean) {
  return {
    id: 'override-id',
    tenantId,
    key: RFQ_FLAG_KEY,
    enabled,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ncPoolRfqFeatureGateMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-001: Row missing → 503
  it('TC-001: returns 503 FEATURE_DISABLED when global flag row is missing', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect(reply._sent).toMatchObject({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: 'Network Commerce procurement pool RFQ is disabled.',
      },
    });
  });

  // TC-002: Row exists with enabled=false → 503
  it('TC-002: returns 503 FEATURE_DISABLED when global flag.enabled is false', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(false));

    const request = makeRequest();
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-003: DB throws → 503 (fail-closed)
  it('TC-003: returns 503 FEATURE_DISABLED when global flag DB read throws (fail-closed)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockRejectedValue(
      new Error('Database connection refused'),
    );

    const request = makeRequest();
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-004: Global true, no orgId → 503 (fail-closed — RFQ routes are always tenant-scoped)
  it('TC-004: returns 503 when global flag is true but no orgId is resolvable', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));

    // No dbContext, no params.orgId
    const request = makeRequest({ url: '/api/tenant/pools/pool-id/demand-lines/lock-for-rfq' });
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
    // Layer 2 must not have been attempted without orgId
    expect(prisma.tenantFeatureOverride.findUnique).not.toHaveBeenCalled();
  });

  // TC-005: Middleware does not mutate DB (no write calls)
  it('TC-005: does not call any DB write method', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    // Global flag missing → 503 at Layer 1, tenantFeatureOverride never called
    expect(prisma.featureFlag.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.tenantFeatureOverride.findUnique).not.toHaveBeenCalled();
    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith({
      where: { key: RFQ_FLAG_KEY },
      select: { enabled: true },
    });
  });

  // TC-006: Middleware does not read or modify request body
  it('TC-006: does not access or modify request body', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest({ body: { poolId: 'pool-id', expectedLineIds: ['line-1'] } });
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect((request as any).body).toEqual({ poolId: 'pool-id', expectedLineIds: ['line-1'] });
  });

  // TC-007: Flag missing → reply.code called with 503
  it('TC-007: calls reply.code(503) when global flag is missing', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const codeSpy = vi.fn().mockReturnThis();
    const sendSpy = vi.fn().mockReturnThis();
    const reply = { code: codeSpy, send: sendSpy, _code: 200, _sent: null };

    await ncPoolRfqFeatureGateMiddleware(request, reply as any);

    expect(codeSpy).toHaveBeenCalledWith(503);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FEATURE_DISABLED' }),
      }),
    );
  });

  // TC-008: Global true + orgId + override true → reply.code NOT called (allow)
  it('TC-008: does not call reply.code when both layers pass', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(ORG_ID, true),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const codeSpy = vi.fn().mockReturnThis();
    const sendSpy = vi.fn().mockReturnThis();
    const reply = { code: codeSpy, send: sendSpy };

    await ncPoolRfqFeatureGateMiddleware(request, reply as any);

    expect(codeSpy).not.toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  // TC-009: Global flag false even with dbContext → 503 (Layer 1 blocks before Layer 2)
  it('TC-009: blocks a request with a dbContext when global flag is false', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(false));

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
    // Layer 1 must block before Layer 2
    expect(prisma.tenantFeatureOverride.findUnique).not.toHaveBeenCalled();
  });

  // TC-010: Correct feature flag key queried
  it('TC-010: queries the correct feature flag key (nc.procurement_pools.rfq.enabled)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'nc.procurement_pools.rfq.enabled' },
      }),
    );
  });

  // TC-011: Does NOT query parent flag key
  it('TC-011: does not query parent flag key (nc.procurement_pools.enabled)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    const allCalls = vi.mocked(prisma.featureFlag.findUnique).mock.calls;
    const queriedKeys = allCalls.map((call) => (call[0] as any)?.where?.key);
    expect(queriedKeys).not.toContain('nc.procurement_pools.enabled');
  });

  // ─── Layer 2 (per-org TenantFeatureOverride) tests ───────────────────────

  // TC-012: Global true, orgId, no override row → allow
  // Canonical semantics: global=true + no per-org override = allow.
  // Override is an exception mechanism (explicit disable), not a provisioning requirement.
  it('TC-012: allows request when global flag is true and no per-org override row exists', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(null);

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    // Must allow — no error sent
    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
    // Override was still queried (to check for explicit disables)
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: ORG_ID,
          key: RFQ_FLAG_KEY,
        },
      },
      select: { enabled: true },
    });
  });

  // TC-013: Global true, orgId, override enabled=true → allows
  it('TC-013: allows request when global flag and per-org override are both true', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(ORG_ID, true),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
  });

  // TC-014: Global true, orgId, override disabled → 503
  it('TC-014: returns 503 when global flag is true but override is disabled', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(ORG_ID, false),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-015: Global true, orgId, override lookup throws → 503 (fail-closed)
  it('TC-015: returns 503 when override DB lookup throws (fail-closed)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockRejectedValue(
      new Error('DB connection timeout'),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-016: Cross-tenant isolation — explicit disable for authenticated org is respected;
  // override lookup uses authenticated orgId exactly, not any other tenant's ID.
  it('TC-016: cross-tenant isolation — explicit disable for authenticated org blocks that org; lookup uses authenticated orgId', async () => {
    const AUTHENTICATED_ORG_ID = 'aa000000-0000-0000-0000-000000000001';
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    // Authenticated org has an explicit disable override
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(AUTHENTICATED_ORG_ID, false),
    );

    const request = makeRequest({
      dbContext: {
        orgId: AUTHENTICATED_ORG_ID,
        actorId: 'user-id',
        realm: 'tenant',
        requestId: 'req-id',
      },
    });
    const reply = makeReply();

    await ncPoolRfqFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
    // Override lookup must use the authenticated org's ID exactly
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: AUTHENTICATED_ORG_ID,
          key: RFQ_FLAG_KEY,
        },
      },
      select: { enabled: true },
    });
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledTimes(1);
  });
});
