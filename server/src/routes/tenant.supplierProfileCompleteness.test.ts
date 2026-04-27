/**
 * tenant.supplierProfileCompleteness.test.ts
 *
 * Route integration tests (K-026..K-032) for:
 *   POST /api/tenant/supplier-profile/ai-completeness
 *
 * Tests route-level HTTP surface by building a minimal Fastify server that
 * replicates the exact route handler from tenant.ts, with all external
 * dependencies mocked. No real DB or AI calls.
 *
 * Tests:
 *   K-026 — POST with valid auth → 200 with valid report shape
 *   K-027 — POST unauthenticated (missing dbContext) → treated as unauthorized
 *   K-028 — POST with AI parse error (mocked) → 422 with reportParseError: true
 *   K-029 — POST with budget exceeded (mocked) → 429
 *   K-030 — Response includes reasoningLogId and auditLogId per call
 *   K-031 — Response includes hadInferenceError in 200 shape
 *   K-032 — Idempotency key forwarded to service on repeat call
 *
 * Run:
 *   pnpm --filter server exec vitest run src/routes/tenant.supplierProfileCompleteness.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { SupplierProfileCompletenessReport } from '../services/ai/supplierProfileCompletenessRubric.js';
import type {
  SupplierProfileCompletenessServiceOk,
  SupplierProfileCompletenessServiceParseError,
} from '../services/ai/supplierProfileCompletenessService.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEST_ORG_ID = 'aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa';
const TEST_USER_ID = 'bbbbbbbb-0000-0000-0000-bbbbbbbbbbbb';
const TEST_AUDIT_ID = 'cccccccc-0000-0000-0000-cccccccccccc';
const TEST_REASONING_ID = 'dddddddd-0000-0000-0000-dddddddddddd';
const TEST_MONTH_KEY = '2026-04';

// ── Mock module factories ─────────────────────────────────────────────────────

const { _svc } = vi.hoisted(() => {
  const _svc = {
    runSupplierProfileCompletenessInference: vi.fn() as ReturnType<typeof vi.fn>,
  };
  return { _svc };
});

vi.mock('../services/ai/supplierProfileCompletenessService.js', () => ({
  runSupplierProfileCompletenessInference: _svc.runSupplierProfileCompletenessInference,
}));

vi.mock('../lib/aiBudget.js', () => ({
  getMonthKey: vi.fn().mockReturnValue('2026-04'),
  BudgetExceededError: class BudgetExceededError extends Error {
    constructor(msg?: string) { super(msg ?? 'Budget exceeded'); this.name = 'BudgetExceededError'; }
  },
}));

vi.mock('../services/ai/inferenceService.js', () => ({
  AiRateLimitExceededError: class AiRateLimitExceededError extends Error {
    constructor(msg?: string) { super(msg ?? 'Rate limit exceeded'); this.name = 'AiRateLimitExceededError'; }
  },
}));

vi.mock('../../../config/index.js', () => ({
  config: { GEMINI_API_KEY: 'test-key' },
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { runSupplierProfileCompletenessInference } from '../services/ai/supplierProfileCompletenessService.js';
import { BudgetExceededError, getMonthKey } from '../lib/aiBudget.js';
import { AiRateLimitExceededError } from '../services/ai/inferenceService.js';

// ── Minimal Fastify test server ───────────────────────────────────────────────
//
// This replicates EXACTLY the route handler from tenant.ts so we can test the
// HTTP surface in isolation without loading the massive tenant plugin.

function sendError(
  reply: FastifyReply,
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return reply.status(status).send({ error: code, message, ...extra });
}

// Using a plain object type to avoid conflicts with FastifyRequest's dbContext declaration
type TestReqExtras = {
  userId?: string;
  dbContext?: { orgId: string };
};

async function buildTestApp(authenticated = true): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  // Inject auth context via hook (simulates tenantAuthMiddleware + databaseContextMiddleware)
  fastify.addHook('onRequest', async (req) => {
    if (authenticated) {
      (req as unknown as TestReqExtras).userId = TEST_USER_ID;
      (req as unknown as TestReqExtras).dbContext = { orgId: TEST_ORG_ID };
    }
    // If not authenticated, dbContext is not set — the route handler will handle it
  });

  // Register the route handler (exact replica from tenant.ts)
  fastify.post('/tenant/supplier-profile/ai-completeness', async (request, reply) => {
    const req = request as unknown as TestReqExtras;
    const { userId } = req;
    const dbContext = req.dbContext;

    if (!dbContext) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Database context missing' });
    }

    const requestId = randomUUID();
    const monthKey = getMonthKey();

    try {
      const serviceResult = await runSupplierProfileCompletenessInference({
        orgId: dbContext.orgId,
        monthKey,
        requestId,
        idempotencyKey: (request.headers['x-idempotency-key'] as string | undefined) ?? undefined,
        userId: userId ?? null,
        prisma: {} as never,
        dbContext: dbContext as unknown as never,
      });

      if (!serviceResult.ok) {
        return sendError(
          reply,
          'PARSE_ERROR',
          'AI response could not be parsed as a completeness report',
          422,
          {
            reportParseError: true,
            humanReviewRequired: true,
            auditLogId: serviceResult.auditLogId,
          }
        );
      }

      return reply.status(200).send({
        report: serviceResult.report,
        humanReviewRequired: true,
        reasoningLogId: serviceResult.reasoningLogId,
        auditLogId: serviceResult.auditLogId,
        hadInferenceError: serviceResult.hadInferenceError,
      });
    } catch (err) {
      if (err instanceof BudgetExceededError || err instanceof AiRateLimitExceededError) {
        return sendError(reply, 'RATE_LIMIT_EXCEEDED', 'AI inference rate limit or budget exceeded', 429);
      }
      throw err;
    }
  });

  await fastify.ready();
  return fastify;
}

// ── Fixture builders ──────────────────────────────────────────────────────────

function makeDeterministicReport(): SupplierProfileCompletenessReport {
  return {
    overallCompleteness: 0.65,
    categoryScores: {
      profileIdentity: 0.9,
      businessCapability: 0.7,
      catalogCoverage: 0.5,
      catalogAttributeQuality: 0.4,
      stageTaxonomy: 0.3,
      certificationsDocuments: 0.8,
      rfqResponsiveness: 0.6,
      serviceCapabilityClarity: 0.5,
      aiReadiness: 0.4,
      buyerDiscoverability: 0.7,
    },
    missingFields: [
      { category: 'catalog', field: 'sku', priority: 'HIGH' },
    ],
    improvementActions: [
      { action: 'Add catalog items with complete attributes', category: 'catalogCoverage', priority: 'HIGH' },
    ],
    trustSignalWarnings: [
      { warning: 'No active catalog items found', severity: 'CRITICAL', affectedCategory: 'catalogCoverage' },
    ],
    reasoningSummary: 'Profile needs catalog improvements.',
    humanReviewRequired: true,
  };
}

function makeOkResult(): SupplierProfileCompletenessServiceOk {
  return {
    ok: true,
    report: makeDeterministicReport(),
    reasoningLogId: TEST_REASONING_ID,
    auditLogId: TEST_AUDIT_ID,
    tokensUsed: 350,
    costEstimateUSD: 0.00007,
    monthKey: TEST_MONTH_KEY,
    hadInferenceError: false,
    humanReviewRequired: true,
  };
}

function makeParseErrorResult(): SupplierProfileCompletenessServiceParseError {
  return {
    ok: false,
    reportParseError: true,
    report: makeDeterministicReport(),
    reasoningLogId: TEST_REASONING_ID,
    auditLogId: TEST_AUDIT_ID,
    hadInferenceError: true,
    humanReviewRequired: true,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('K-026: POST /tenant/supplier-profile/ai-completeness → 200 with valid report shape', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    _svc.runSupplierProfileCompletenessInference.mockResolvedValue(makeOkResult());
    app = await buildTestApp(true);
  });

  afterEach(async () => { await app.close(); });

  it('returns 200 with report, humanReviewRequired, reasoningLogId, auditLogId, hadInferenceError', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenant/supplier-profile/ai-completeness',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.humanReviewRequired).toBe(true);
    expect(body.reasoningLogId).toBe(TEST_REASONING_ID);
    expect(body.auditLogId).toBe(TEST_AUDIT_ID);
    expect(body.hadInferenceError).toBe(false);
    expect(body.report).toBeDefined();
    expect(body.report.humanReviewRequired).toBe(true);
    expect(body.report.overallCompleteness).toBeGreaterThanOrEqual(0);
    expect(body.report.categoryScores).toBeDefined();
    expect(body.report.improvementActions).toBeInstanceOf(Array);
    expect(body.report.trustSignalWarnings).toBeInstanceOf(Array);
  });

  it('calls runSupplierProfileCompletenessInference with orgId from dbContext', async () => {
    await app.inject({ method: 'POST', url: '/tenant/supplier-profile/ai-completeness' });
    expect(vi.mocked(runSupplierProfileCompletenessInference)).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: TEST_ORG_ID, userId: TEST_USER_ID })
    );
  });
});

describe('K-027: POST unauthenticated → 401', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(false);
  });

  afterEach(async () => { await app.close(); });

  it('returns 401 when dbContext is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenant/supplier-profile/ai-completeness',
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('does not call the service when unauthenticated', async () => {
    await app.inject({ method: 'POST', url: '/tenant/supplier-profile/ai-completeness' });
    expect(vi.mocked(runSupplierProfileCompletenessInference)).not.toHaveBeenCalled();
  });
});

describe('K-028: POST with AI parse error → 422 with reportParseError: true', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    _svc.runSupplierProfileCompletenessInference.mockResolvedValue(makeParseErrorResult());
    app = await buildTestApp(true);
  });

  afterEach(async () => { await app.close(); });

  it('returns 422 with reportParseError: true and humanReviewRequired: true', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenant/supplier-profile/ai-completeness',
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.error).toBe('PARSE_ERROR');
    expect(body.reportParseError).toBe(true);
    expect(body.humanReviewRequired).toBe(true);
    expect(body.auditLogId).toBe(TEST_AUDIT_ID);
  });
});

describe('K-029: POST with budget exceeded → 429', () => {
  let app: FastifyInstance;

  afterEach(async () => { await app.close(); });

  it('returns 429 when BudgetExceededError is thrown', async () => {
    vi.clearAllMocks();
    _svc.runSupplierProfileCompletenessInference.mockRejectedValue(
      new BudgetExceededError('test-org', { tokens: 1000, cost: 0.01 }, { tokens: 1001, cost: 0.011 }, '2026-05-01')
    );
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/supplier-profile/ai-completeness',
    });

    expect(res.statusCode).toBe(429);
    const body = res.json();
    expect(body.error).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 429 when AiRateLimitExceededError is thrown', async () => {
    vi.clearAllMocks();
    _svc.runSupplierProfileCompletenessInference.mockRejectedValue(
      new AiRateLimitExceededError('Rate limit exceeded')
    );
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/supplier-profile/ai-completeness',
    });

    expect(res.statusCode).toBe(429);
    const body = res.json();
    expect(body.error).toBe('RATE_LIMIT_EXCEEDED');
  });
});

describe('K-030: reasoningLogId and auditLogId present per call', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    _svc.runSupplierProfileCompletenessInference.mockResolvedValue(makeOkResult());
    app = await buildTestApp(true);
  });

  afterEach(async () => { await app.close(); });

  it('200 response always includes reasoningLogId and auditLogId', async () => {
    const res = await app.inject({ method: 'POST', url: '/tenant/supplier-profile/ai-completeness' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.reasoningLogId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.auditLogId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('K-031: hadInferenceError present in 200 shape', () => {
  let app: FastifyInstance;

  afterEach(async () => { await app.close(); });

  it('hadInferenceError: false in normal case', async () => {
    vi.clearAllMocks();
    _svc.runSupplierProfileCompletenessInference.mockResolvedValue(makeOkResult());
    app = await buildTestApp(true);

    const res = await app.inject({ method: 'POST', url: '/tenant/supplier-profile/ai-completeness' });
    expect(res.statusCode).toBe(200);
    expect(res.json().hadInferenceError).toBe(false);
  });

  it('hadInferenceError: true when service signals degraded AI output', async () => {
    vi.clearAllMocks();
    _svc.runSupplierProfileCompletenessInference.mockResolvedValue({
      ...makeOkResult(),
      hadInferenceError: true,
    });
    app = await buildTestApp(true);

    const res = await app.inject({ method: 'POST', url: '/tenant/supplier-profile/ai-completeness' });
    expect(res.statusCode).toBe(200);
    expect(res.json().hadInferenceError).toBe(true);
  });
});

describe('K-032: idempotency key forwarded to service', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    _svc.runSupplierProfileCompletenessInference.mockResolvedValue(makeOkResult());
    app = await buildTestApp(true);
  });

  afterEach(async () => { await app.close(); });

  it('forwards x-idempotency-key header to service input', async () => {
    const idempotencyKey = 'idem-key-k032-test';

    await app.inject({
      method: 'POST',
      url: '/tenant/supplier-profile/ai-completeness',
      headers: { 'x-idempotency-key': idempotencyKey },
    });

    expect(vi.mocked(runSupplierProfileCompletenessInference)).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey })
    );
  });

  it('idempotencyKey is undefined when header is absent', async () => {
    await app.inject({
      method: 'POST',
      url: '/tenant/supplier-profile/ai-completeness',
    });

    expect(vi.mocked(runSupplierProfileCompletenessInference)).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: undefined })
    );
  });
});
