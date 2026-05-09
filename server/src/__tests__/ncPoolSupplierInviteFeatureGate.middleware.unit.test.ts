/**
 * ncPoolSupplierInviteFeatureGateMiddleware unit tests
 *
 * 11 test cases covering:
 *   --- Layer 1 (global flag) tests ---
 *   TC-001: Happy path — global enabled + tenant override enabled → allows (no 503)
 *   TC-002: Global flag row missing → 503 FEATURE_DISABLED
 *   TC-003: Global flag row exists with enabled=false → 503 FEATURE_DISABLED
 *   TC-004: DB read throws on global flag → 503 FEATURE_DISABLED (fail-closed)
 *   TC-005: Global flag true + no orgId → 503 FEATURE_DISABLED (fail-closed)
 *   TC-006: Correct feature key queried (nc.procurement_pools.supplier_invites.enabled)
 *   TC-007: Parent flag keys NOT queried (nc.procurement_pools.enabled, nc.procurement_pools.rfq.enabled)
 *   --- Layer 2 (per-org TenantFeatureOverride) tests ---
 *   TC-008: Global true, orgId present, no override row → 503 FEATURE_DISABLED
 *   TC-009: Global true, orgId present, override enabled=false → 503 FEATURE_DISABLED
 *   TC-010: Global true, orgId present, override DB throws → 503 FEATURE_DISABLED (fail-closed)
 *   TC-011: Supplier-only provisioning — only supplier_invites override exists (no parent pool
 *           overrides) → allows; confirms gate does NOT require parent flags
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ncPoolSupplierInviteFeatureGateMiddleware } from '../middleware/ncPoolSupplierInviteFeatureGate.middleware.js';

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
    url: '/api/tenant/pool-rfq-invites/invite-id',
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

const INVITE_FLAG_KEY = 'nc.procurement_pools.supplier_invites.enabled';
const ORG_ID = 'bb000000-0000-0000-0000-000000000001';

function makeGlobalFlag(enabled: boolean) {
  return {
    key: INVITE_FLAG_KEY,
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
    key: INVITE_FLAG_KEY,
    enabled,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ncPoolSupplierInviteFeatureGateMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-001: Happy path — both layers pass → no 503
  it('TC-001: allows request when global flag and per-org override are both enabled', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(ORG_ID, true),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

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

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect(reply._sent).toMatchObject({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: 'Network Commerce procurement pool supplier invite is disabled.',
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

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

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

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-005: Global true but no orgId resolvable → 503 (fail-closed — routes are tenant-scoped)
  it('TC-005: returns 503 when global flag is true but no orgId is resolvable', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));

    // No dbContext, no params.orgId
    const request = makeRequest();
    const reply = makeReply();

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
    // Layer 2 must not have been attempted without orgId
    expect(prisma.tenantFeatureOverride.findUnique).not.toHaveBeenCalled();
  });

  // TC-006: Correct feature key queried
  it('TC-006: queries the correct feature flag key (nc.procurement_pools.supplier_invites.enabled)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const reply = makeReply();

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'nc.procurement_pools.supplier_invites.enabled' },
      }),
    );
  });

  // TC-007: Parent flag keys NOT queried
  it('TC-007: does not query parent flag keys (nc.procurement_pools.enabled, nc.procurement_pools.rfq.enabled)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(ORG_ID, true),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

    const allFlagCalls = vi.mocked(prisma.featureFlag.findUnique).mock.calls;
    const queriedKeys = allFlagCalls.map((call) => (call[0] as any)?.where?.key);
    expect(queriedKeys).not.toContain('nc.procurement_pools.enabled');
    expect(queriedKeys).not.toContain('nc.procurement_pools.rfq.enabled');

    const allOverrideCalls = vi.mocked(prisma.tenantFeatureOverride.findUnique).mock.calls;
    const queriedOverrideKeys = allOverrideCalls.map(
      (call) => (call[0] as any)?.where?.tenantId_key?.key,
    );
    expect(queriedOverrideKeys).not.toContain('nc.procurement_pools.enabled');
    expect(queriedOverrideKeys).not.toContain('nc.procurement_pools.rfq.enabled');
  });

  // TC-008: Global true, orgId present, no override row → 503
  it('TC-008: returns 503 when global flag is true but no per-org override row exists', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(null);

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: ORG_ID,
          key: INVITE_FLAG_KEY,
        },
      },
      select: { enabled: true },
    });
  });

  // TC-009: Global true, orgId present, override disabled → 503
  it('TC-009: returns 503 when global flag is true but per-org override is disabled', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(ORG_ID, false),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
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

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-011: Supplier-only provisioning — supplier org has only the invite flag override
  // (no nc.procurement_pools.enabled or nc.procurement_pools.rfq.enabled overrides).
  // The gate must allow the request — parent flags are not checked by this middleware.
  // This test also asserts that ONLY the invite key is queried (no parent key queries).
  it('TC-011: allows supplier org that has only the invite flag override (no parent pool overrides)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(makeGlobalFlag(true));
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(
      makeOverride(ORG_ID, true),
    );

    const request = makeRequest({
      dbContext: { orgId: ORG_ID, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ncPoolSupplierInviteFeatureGateMiddleware(request, reply);

    // Gate must allow
    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);

    // Only the invite key was queried — no parent pool key queries
    const allFlagCalls = vi.mocked(prisma.featureFlag.findUnique).mock.calls;
    expect(allFlagCalls).toHaveLength(1);
    expect((allFlagCalls[0][0] as any)?.where?.key).toBe(INVITE_FLAG_KEY);

    const allOverrideCalls = vi.mocked(prisma.tenantFeatureOverride.findUnique).mock.calls;
    expect(allOverrideCalls).toHaveLength(1);
    expect((allOverrideCalls[0][0] as any)?.where?.tenantId_key?.key).toBe(INVITE_FLAG_KEY);
  });
});
