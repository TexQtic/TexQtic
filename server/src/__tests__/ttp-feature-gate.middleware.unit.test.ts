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

  // ─── Structured Pino log event tests (TTP-IMPL-004) ────────────────────────
  //
  //   TC-019: ttp.feature_gate.global_blocked emitted at info when global flag missing
  //   TC-020: ttp.feature_gate.db_error emitted at error on Layer 1 DB failure
  //   TC-021: ttp.feature_gate.org_blocked emitted at info when per-org override missing
  //   TC-022: ttp.feature_gate.db_error emitted at error on Layer 2 DB failure (layer=2)
  //   TC-023: ttp.feature_gate.allowed emitted at debug for tenant-plane allowed path
  //   TC-024: ttp.feature_gate.allowed emitted at info for control-plane allowed path
  //   TC-025: ttp.feature_gate.allowed emitted at info for aggregated route (no orgId)
  //   TC-026: log events do not include request body, auth tokens, or cookies

  // TC-019: Global flag missing → log.info called with ttp.feature_gate.global_blocked
  it('TC-019: emits ttp.feature_gate.global_blocked at info when global flag is missing', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest();
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(request.log.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ttp.feature_gate.global_blocked', feature: 'ttp_enabled' }),
      'ttp.feature_gate.global_blocked',
    );
    // Must not emit allowed or error events on this path
    expect(request.log.debug).not.toHaveBeenCalled();
    expect(request.log.error).not.toHaveBeenCalled();
  });

  // TC-020: Layer 1 DB throws → log.error called with ttp.feature_gate.db_error, layer=1
  it('TC-020: emits ttp.feature_gate.db_error at error on Layer 1 DB failure (layer=1)', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockRejectedValue(
      new Error('connection refused'),
    );

    const request = makeRequest();
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(request.log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ttp.feature_gate.db_error',
        feature: 'ttp_enabled',
        layer: 1,
        errMsg: 'connection refused',
      }),
      'ttp.feature_gate.db_error',
    );
    // Must still return 503 (fail-closed)
    expect(reply._code).toBe(503);
  });

  // TC-021: Global true, orgId present, no override row → log.info with ttp.feature_gate.org_blocked
  it('TC-021: emits ttp.feature_gate.org_blocked at info when per-org override row is missing', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });
    vi.mocked(prisma.tenantFeatureOverride.findUnique).mockResolvedValue(null);

    const OrgId = 'aa000000-0000-0000-0000-000000000001';
    const request = makeRequest({
      dbContext: { orgId: OrgId, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(request.log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ttp.feature_gate.org_blocked',
        feature: 'ttp_enabled',
        orgId: OrgId,
      }),
      'ttp.feature_gate.org_blocked',
    );
    // global_blocked must NOT have been emitted
    const allInfoCalls: Array<[Record<string, unknown>, string]> = request.log.info.mock.calls;
    expect(allInfoCalls.every(([obj]) => obj['event'] !== 'ttp.feature_gate.global_blocked')).toBe(true);
  });

  // TC-022: Global true, orgId present, Layer 2 DB throws → log.error with layer=2
  it('TC-022: emits ttp.feature_gate.db_error at error on Layer 2 DB failure (layer=2)', async () => {
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

    const OrgId = 'aa000000-0000-0000-0000-000000000001';
    const request = makeRequest({
      dbContext: { orgId: OrgId, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(request.log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ttp.feature_gate.db_error',
        feature: 'ttp_enabled',
        layer: 2,
        orgId: OrgId,
        errMsg: 'DB connection timeout',
      }),
      'ttp.feature_gate.db_error',
    );
    expect(reply._code).toBe(503);
  });

  // TC-023: Tenant-plane allowed path → log.debug with ttp.feature_gate.allowed (not info)
  it('TC-023: emits ttp.feature_gate.allowed at debug for tenant-plane route (OQ-3 level policy)', async () => {
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

    const OrgId = 'aa000000-0000-0000-0000-000000000001';
    const request = makeRequest({
      dbContext: { orgId: OrgId, actorId: 'user-id', realm: 'tenant', requestId: 'req-id' },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    // Tenant-plane → debug (not info) per OQ-3
    expect(request.log.debug).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ttp.feature_gate.allowed', orgId: OrgId }),
      'ttp.feature_gate.allowed',
    );
    // Must NOT emit allowed at info level for tenant paths
    const infoAllowedCalls = (request.log.info.mock.calls as Array<[Record<string, unknown>, string]>)
      .filter(([obj]) => obj['event'] === 'ttp.feature_gate.allowed');
    expect(infoAllowedCalls).toHaveLength(0);
    // Request passes through
    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
  });

  // TC-024: Control-plane route with orgId (no dbContext.realm) → log.info with ttp.feature_gate.allowed
  it('TC-024: emits ttp.feature_gate.allowed at info for control-plane route with orgId', async () => {
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

    // Control-plane route: no dbContext, orgId from params
    const OrgId = 'bb000000-0000-0000-0000-000000000001';
    const request = makeRequest({
      url: '/api/control/ttp/eligibility/bb000000-0000-0000-0000-000000000001',
      params: { orgId: OrgId },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    // Control-plane → info (not debug) per OQ-3
    expect(request.log.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ttp.feature_gate.allowed', orgId: OrgId }),
      'ttp.feature_gate.allowed',
    );
    expect(request.log.debug).not.toHaveBeenCalled();
    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
  });

  // TC-025: Aggregated route (no orgId) → log.info with ttp.feature_gate.allowed, orgId null
  it('TC-025: emits ttp.feature_gate.allowed at info for aggregated route with no orgId', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: 'ttp_enabled',
      enabled: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: null,
    });

    const request = makeRequest({ url: '/api/control/ttp/enrollments' });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    expect(request.log.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ttp.feature_gate.allowed', orgId: null }),
      'ttp.feature_gate.allowed',
    );
    // tenantFeatureOverride must not have been queried (Layer 2 skipped)
    expect(prisma.tenantFeatureOverride.findUnique).not.toHaveBeenCalled();
    expect(reply._sent).toBeNull();
    expect(reply._code).toBe(200);
  });

  // TC-026: Log events do not include request body, auth headers, cookies, or other sensitive fields
  it('TC-026: log events do not include request body, authorization header, or cookie', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    const request = makeRequest({
      body: { gstNumber: 'XXXXX1234', secret: 'should-never-appear' },
      headers: { authorization: 'Bearer eyJtoken123', cookie: 'session=abc' },
    });
    const reply = makeReply();

    await ttpFeatureGateMiddleware(request, reply);

    // Inspect every info log call — none should contain body/headers/auth/cookie
    const allLogCalls: Array<[Record<string, unknown>, string]> = [
      ...request.log.info.mock.calls,
      ...request.log.debug.mock.calls,
      ...request.log.warn.mock.calls,
      ...request.log.error.mock.calls,
    ];
    for (const [logObj] of allLogCalls) {
      expect(logObj).not.toHaveProperty('body');
      expect(logObj).not.toHaveProperty('headers');
      expect(logObj).not.toHaveProperty('authorization');
      expect(logObj).not.toHaveProperty('cookie');
      expect(JSON.stringify(logObj)).not.toContain('eyJtoken123');
      expect(JSON.stringify(logObj)).not.toContain('should-never-appear');
    }
  });
});
