/**
 * ttpFeatureGateMiddleware unit tests — TTP-IMPL-003 Two-Layer Gate
 *
 * 18 test cases covering:
 *   --- Layer 1 (global flag) tests ---
 *   TC-001: Flag row missing → 503 FEATURE_DISABLED
 *   TC-002: Flag row exists with enabled=false → 503 FEATURE_DISABLED
 *   TC-003: DB read throws → 503 FEATURE_DISABLED (fail-closed)
 *   TC-004: Flag true + no orgId on request (aggregated route) → allows (Layer 2 skipped)
 *   TC-005: Middleware does not mutate DB (no write calls)
 *   TC-006: Middleware does not read or modify request body
 *   TC-007: Flag missing → reply.code called with 503
 *   TC-008: Flag true + no orgId → reply.code NOT called (aggregated route passes)
 *   TC-009: Tenant TTP route + global flag false → 503 (Layer 1 blocks before Layer 2)
 *   TC-010: Queries the correct feature flag key (ttp_enabled)
 *   --- Layer 2 (per-org TenantFeatureOverride) tests ---
 *   TC-011: Global true, orgId in dbContext, no override row → 503 FEATURE_DISABLED
 *   TC-012: Global true, orgId in dbContext, override enabled=true → allows
 *   TC-013: Global true, orgId in dbContext, override enabled=false → 503 FEATURE_DISABLED
 *   TC-014: Global true, orgId in dbContext, DB error on override lookup → 503 (fail-closed)
 *   TC-015: Global true, no orgId (aggregated list route) → allows (Layer 2 skipped per OQ-1)
 *   TC-016: Global true, orgId from params only (control-plane :orgId route), override true → allows
 *   TC-017: is_qa_sentinel does NOT affect gate — access decision uses override only
 *   TC-018: Cross-tenant isolation — override for different org does not grant access
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ttpFeatureGateMiddleware } from '../middleware/ttpFeatureGate.middleware.js';

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

// Import after mock so the module receives the mock
import { prisma } from '../db/prisma.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRequest(overrides: Record<string, unknown> = {}): any {
  return {
    url: '/api/tenant/trades/trade-id/ttp-summary',
    method: 'GET',
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ttpFeatureGateMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-001: Row missing → 503
  it('TC-001: returns 503 FEATURE_DISABLED when flag row is missing', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect(reply._sent).toMatchObject({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: 'TradeTrust Pay is not enabled for this platform.',
      },
    });
  });

  // TC-002: Row exists with enabled=false → 503
  it('TC-002: returns 503 FEATURE_DISABLED when flag.enabled is false', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: false,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });

    const request = makeRequest();
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-003: DB throws → 503 (fail-closed)
  it('TC-003: returns 503 FEATURE_DISABLED when DB read throws (fail-closed)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockRejectedValue(
      new Error('Database connection refused'),
    );

    const request = makeRequest();
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-004: Flag enabled=true → allows (returns without sending reply)
  it('TC-004: allows request when flag.enabled is true', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });

    const request = makeRequest();
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    // When allowed, no reply is sent — _sent remains null, _code unchanged
    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
  });

  // TC-005: Middleware does not mutate DB (no write calls)
  it('TC-005: does not call any DB write method', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    // Only featureFlag.findUnique (read) should have been called
    // Global flag is null → returns 503 at Layer 1, no tenantFeatureOverride call
    expect(prisma.featureFlag.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.tenantFeatureOverride.findUnique).not.toHaveBeenCalled();
    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith({
      where: { key: 'ttp_enabled' },
      select: { enabled: true },
    });
  });

  // TC-006: Middleware does not read or modify request body
  it('TC-006: does not access or modify request body', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest({ body: { org_id: 'some-id', secret: 'value' } });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    // Body must remain unchanged
    expect((request as any).body).toEqual({ org_id: 'some-id', secret: 'value' });
  });

  // TC-007: Flag missing → reply.code called with 503
  it('TC-007: calls reply.code(503) when flag is missing', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const codeSpy = vi.fn().mockReturnThis();
    const sendSpy = vi.fn().mockReturnThis();
    const reply = { code: codeSpy, send: sendSpy, _code: 200, _sent: null };

    await ttpFeatureGateMiddleware(request, reply as any);

    expect(codeSpy).toHaveBeenCalledWith(503);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FEATURE_DISABLED' }),
      }),
    );
  });

  // TC-008: Flag true → reply.code NOT called
  it('TC-008: does not call reply.code when flag is enabled', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });

    const request = makeRequest();
    const codeSpy = vi.fn().mockReturnThis();
    const sendSpy = vi.fn().mockReturnThis();
    const reply = { code: codeSpy, send: sendSpy };

    await ttpFeatureGateMiddleware(request, reply as any);

    expect(codeSpy).not.toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  // TC-009: Tenant TTP route + flag false → 503 after auth context present
  it('TC-009: blocks a request that has an authenticated dbContext when flag is false', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: false,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });

    // Simulate a request that has already passed tenantAuthMiddleware
    const request = makeRequest({
      dbContext: {
        orgId: '22222222-2222-2222-2222-222222222222',
        actorId: 'user-id',
        realm: 'tenant',
        requestId: 'req-id',
      },
      userId: 'user-id',
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-010: Confirms middleware reads the correct feature flag key
  it('TC-010: queries the correct feature flag key (ttp_enabled)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'ttp_enabled' },
      }),
    );
  });

  // ─── Layer 2 (per-org TenantFeatureOverride) tests ───────────────────────

  // TC-011: Global true, orgId in dbContext, no override row → 503
  it('TC-011: returns 503 when global flag is true but no per-org override row exists', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(null);

    const request = makeRequest({
      dbContext: {
        orgId: 'aa000000-0000-0000-0000-000000000001',
        actorId: 'user-id',
        realm: 'tenant',
        requestId: 'req-id',
      },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: 'aa000000-0000-0000-0000-000000000001',
          key: 'ttp_enabled',
        },
      },
      select: { enabled: true },
    });
  });

  // TC-012: Global true, orgId in dbContext, override enabled=true → allows
  it('TC-012: allows request when global flag and per-org override are both true', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue({
      id: 'override-id',
      tenantId: 'aa000000-0000-0000-0000-000000000001',
      key: 'ttp_enabled',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = makeRequest({
      dbContext: {
        orgId: 'aa000000-0000-0000-0000-000000000001',
        actorId: 'user-id',
        realm: 'tenant',
        requestId: 'req-id',
      },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    // Both layers passed — no reply sent
    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
  });

  // TC-013: Global true, orgId in dbContext, override enabled=false → 503
  it('TC-013: returns 503 when global flag is true but override is disabled', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue({
      id: 'override-id',
      tenantId: 'aa000000-0000-0000-0000-000000000001',
      key: 'ttp_enabled',
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = makeRequest({
      dbContext: {
        orgId: 'aa000000-0000-0000-0000-000000000001',
        actorId: 'user-id',
        realm: 'tenant',
        requestId: 'req-id',
      },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-014: Global true, orgId in dbContext, DB error on override lookup → 503 (fail-closed)
  it('TC-014: returns 503 when override DB lookup throws (fail-closed)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockRejectedValue(
      new Error('DB connection timeout'),
    );

    const request = makeRequest({
      dbContext: {
        orgId: 'aa000000-0000-0000-0000-000000000001',
        actorId: 'user-id',
        realm: 'tenant',
        requestId: 'req-id',
      },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
  });

  // TC-015: Global true, no orgId on request (aggregated list route) → allows (Layer 2 skipped per OQ-1)
  it('TC-015: allows aggregated list request when global flag is true and no orgId is present', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });

    // No dbContext, no params.orgId — simulates GET /api/control/vpc or GET /api/control/ttp/enrollments
    const request = makeRequest({ url: '/api/control/vpc' });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    // Global gate passed; Layer 2 skipped (no orgId) — allow
    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
    // tenantFeatureOverride must NOT have been queried
    expect(prisma.tenantFeatureOverride.findUnique).not.toHaveBeenCalled();
  });

  // TC-016: Global true, orgId from params only (control-plane :orgId route), override true → allows
  it('TC-016: resolves orgId from request.params when dbContext is absent', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue({
      id: 'override-id',
      tenantId: 'bb000000-0000-0000-0000-000000000001',
      key: 'ttp_enabled',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Simulates control-plane route: POST /api/control/ttp/eligibility/:orgId
    const request = makeRequest({
      url: '/api/control/ttp/eligibility/bb000000-0000-0000-0000-000000000001',
      params: { orgId: 'bb000000-0000-0000-0000-000000000001' },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: 'bb000000-0000-0000-0000-000000000001',
          key: 'ttp_enabled',
        },
      },
      select: { enabled: true },
    });
  });

  // TC-017: is_qa_sentinel does NOT affect gate — decision uses override row only
  it('TC-017: is_qa_sentinel flag on org does not affect access decision', async () => {
    // Global true, override enabled=true (QA sentinel org)
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue({
      id: 'override-id',
      tenantId: 'ee000000-0000-0000-0000-000000000001',
      key: 'ttp_enabled',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = makeRequest({
      dbContext: {
        // QA sentinel org UUID
        orgId: 'ee000000-0000-0000-0000-000000000001',
        actorId: 'user-id',
        realm: 'tenant',
        requestId: 'req-id',
      },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    // Access allowed — based on override row, not on is_qa_sentinel
    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
    // The middleware must NOT have queried organizations table for is_qa_sentinel
    // (only featureFlag and tenantFeatureOverride are queried)
    expect(prisma.featureFlag.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledTimes(1);
  });

  // TC-018: Cross-tenant isolation — orgId in request is used, not a different org's override
  it('TC-018: cross-tenant isolation — override for a different org does not grant access', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });
    // No override exists for the REQUESTING org — only for a different org
    // (tenantFeatureOverride.findUnique is called with the requesting org's ID and returns null)
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(null);

    const requestingOrgId = 'cc000000-0000-0000-0000-000000000001';
    const request = makeRequest({
      dbContext: {
        orgId: requestingOrgId,
        actorId: 'user-id',
        realm: 'tenant',
        requestId: 'req-id',
      },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    // Must be blocked — requesting org has no override, even though another org might
    expect(reply._code).toBe(503);
    expect((reply._sent as any).error.code).toBe('FEATURE_DISABLED');
    // Confirms the lookup used the REQUESTING org's ID, not any other org
    expect(prisma.tenantFeatureOverride.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: requestingOrgId,
          key: 'ttp_enabled',
        },
      },
      select: { enabled: true },
    });
  });
});
