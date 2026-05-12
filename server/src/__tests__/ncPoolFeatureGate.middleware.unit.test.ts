/**
 * ncPoolFeatureGateMiddleware unit tests
 *
 * 11 test cases covering:
 *   --- Layer 1 (global flag) tests ---
 *   TC-001: Happy path — global enabled + tenant override enabled → allows (no 503)
 *   TC-002: Global flag row missing → 503 FEATURE_DISABLED
 *   TC-003: Global flag row exists with enabled=false → 503 FEATURE_DISABLED
 *   TC-004: DB read throws on global flag → 503 FEATURE_DISABLED (fail-closed)
 *   TC-005: Global flag true + no orgId → 503 FEATURE_DISABLED (fail-closed)
 *   TC-006: Correct feature key queried (nc.procurement_pools.enabled)
 *   --- Layer 2 (per-org TenantFeatureOverride) tests ---
 *   TC-007: Global true, orgId present, no override row → allow
 *           (global=true + no override = allow; override is an exception, not a requirement)
 *   TC-008: Global true, orgId present, override enabled=false → 503 FEATURE_DISABLED
 *   TC-009: Global true, orgId present, override enabled=true → allow
 *   TC-010: Global true, orgId present, override DB throws → 503 FEATURE_DISABLED (fail-closed)
 *   TC-011: Cross-tenant isolation — explicit disable for authenticated org is respected;
 *           override lookup uses authenticated orgId, not a different org
 *
 * TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001 (Packet 14)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ncPoolFeatureGateMiddleware } from '../middleware/ncPoolFeatureGate.middleware.js';

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
    url: '/api/tenant/network-commerce/pools',
    method: 'GET',
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

const POOL_FLAG_KEY = 'nc.procurement_pools.enabled';
const ORG_ID = 'cc000000-0000-0000-0000-000000000001';

function makeGlobalFlag(enabled: boolean) {
  return {
    key: POOL_FLAG_KEY,
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
    key: POOL_FLAG_KEY,
    enabled,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ncPoolFeatureGateMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-001: Happy path — both layers pass → no 503
  it('TC-001: allows request when global flag is enabled and per-org override is also enabled', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(ORG_ID, true),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolFeatureGateMiddleware(request, reply);

    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
  });

  // TC-002: Global flag row missing → 503
  it('TC-002: returns 503 FEATURE_DISABLED when global flag row is missing', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect(reply._sent).toMatchObject({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: 'Network Commerce procurement pools are disabled.',
      },
    });
    // Layer 2 must not have been attempted
    expect(prisma.tenantFeatureOverride.findUnique).not.toHaveBeenCalled();
  });

  // TC-003: Global flag enabled=false → 503
  it('TC-003: returns 503 FEATURE_DISABLED when global flag.enabled is false', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(false));

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
    expect(prisma.tenantFeatureOverride.findUnique).not.toHaveBeenCalled();
  });

  // TC-004: DB throws on global flag read → 503 (fail-closed)
  it('TC-004: returns 503 FEATURE_DISABLED when global flag DB read throws (fail-closed)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockRejectedValue(
      new Error('Database connection refused'),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-005: Global true but no orgId resolvable → 503 (fail-closed — pool routes are tenant-scoped)
  it('TC-005: returns 503 when global flag is true but no orgId is resolvable', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));

    // No dbContext, no params.orgId
    const request = makeRequest();
    const reply = makeReply();

    await ncPoolFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
    // Layer 2 must not have been attempted without orgId
    expect(prisma.tenantFeatureOverride.findUnique).not.toHaveBeenCalled();
  });

  // TC-006: Correct feature key queried
  it('TC-006: queries the correct feature flag key (nc.procurement_pools.enabled)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const reply = makeReply();

    await ncPoolFeatureGateMiddleware(request, reply);

    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'nc.procurement_pools.enabled' },
      }),
    );
  });

  // TC-007: Global true, orgId present, no override row → allow
  // Canonical semantics: global=true + no per-org override = allow for org.
  // Override is an exception mechanism (explicit disable), not a provisioning requirement.
  it('TC-007: allows request when global flag is true and no per-org override row exists', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(null);

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolFeatureGateMiddleware(request, reply);

    // Must allow — no error sent
    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
    // Override was still queried (to check for explicit disables)
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: ORG_ID,
          key: POOL_FLAG_KEY,
        },
      },
      select: { enabled: true },
    });
  });

  // TC-008: Global true, orgId present, override enabled=false → 503
  it('TC-008: returns 503 when global flag is true but per-org override is explicitly disabled', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(ORG_ID, false),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-009: Global true, orgId present, override enabled=true → allow
  it('TC-009: allows request when global flag is true and per-org override is explicitly enabled', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(ORG_ID, true),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolFeatureGateMiddleware(request, reply);

    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
  });

  // TC-010: Global true, orgId present, override DB throws → 503 (fail-closed)
  it('TC-010: returns 503 when override DB lookup throws (fail-closed)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockRejectedValue(
      new Error('DB connection timeout'),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-011: Cross-tenant isolation — explicit disable for authenticated org is respected;
  // override lookup uses authenticated orgId exactly, not any other tenant's ID.
  it('TC-011: cross-tenant isolation — explicit disable for authenticated org blocks that org; lookup uses authenticated orgId', async () => {
    const AUTHENTICATED_ORG_ID = 'cc000000-0000-0000-0000-000000000001';
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

    await ncPoolFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
    // Override lookup must use the authenticated org's ID exactly
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: AUTHENTICATED_ORG_ID,
          key: POOL_FLAG_KEY,
        },
      },
      select: { enabled: true },
    });
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledTimes(1);
  });
});
