/**
 * FIX-MAINAPP-DPP-RATELIMIT-STATUS-CODE-01
 *
 * GET /api/public/dpp/:publicPassportId — rate-limit status code enforcement
 *
 * Root cause: @fastify/rate-limit v10 throws the errorResponseBuilder result.
 * The old plain-object builder { error: 'rate_limited', retryAfter: N } had no
 * statusCode property. The global error handler (toErrorLike) saw a non-Error
 * thrown value and defaulted to HTTP 500.
 *
 * Fix: errorResponseBuilder returns Object.assign(new Error(...), { statusCode, code: 'RATE_LIMITED' })
 * — identical pattern to the tier0 fix in commit 0d1c351a.
 *
 * Tests (D17-R = DPP public security, Rate-limit live HTTP group):
 *   D17-R01 (static): DPP errorResponseBuilder uses Error + context.statusCode, not plain object
 *   D17-R02 (static): DPP errorResponseBuilder code is RATE_LIMITED
 *   D17-R03 (static): DPP errorResponseBuilder does not return old { error: 'rate_limited' } plain object
 *   D17-R04: 101st GET /dpp/:id request in same window → HTTP 429 (not 500)
 *   D17-R05: rate-limited DPP response body has success: false
 *   D17-R06: rate-limited DPP response body has code RATE_LIMITED
 *   D17-R07: DB data-fetch function is NOT called for the rate-limited request
 *   D17-R08: structured-data sub-route also returns 429 under same rate-limit plugin
 *   D17-R09: non-rate-limited DPP request reaches the handler (normal path unaffected)
 */

// ─── Module mocks (hoisted by Vitest) ────────────────────────────────────────

vi.mock('../db/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn(),
}));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('../lib/hostNormalize.js', () => ({
  normalizeHost: vi.fn(),
  parsePlatformHost: vi.fn(),
}));

vi.mock('./internal/resolveDomain.js', () => ({
  resolveHostToTenant: vi.fn(),
}));

vi.mock('../services/publicB2BProjection.service.js', () => ({
  listPublicB2BSuppliers: vi.fn(),
  getPublicB2BSupplierBySlug: vi.fn(),
}));

vi.mock('../services/publicB2CProjection.service.js', () => ({
  listPublicB2CProducts: vi.fn(),
  getPublicB2CProductBySlug: vi.fn(),
}));

vi.mock('../services/crmTier0NotifyClient.js', () => ({
  notifyCrmTier0Capture: vi.fn(),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import Fastify, { type FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

import publicRoutes from '../routes/public.js';
import { prisma } from '../db/prisma.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PREFIX = '/api/public';
const DPP_RATE_LIMIT_MAX = 100;
// A well-formed UUID that will be used for the passportId parameter.
// The DB mock returns NOT_FOUND (empty array) for this token, which is fine —
// the rate-limiter fires before the handler for request #101.
const TEST_PASSPORT_ID = '00000000-0000-4000-a000-000000000001';
const DPP_ENDPOINT = `${PREFIX}/dpp/${TEST_PASSPORT_ID}`;
const DPP_SD_ENDPOINT = `${PREFIX}/dpp/${TEST_PASSPORT_ID}/structured-data`;

// ─── Test harness ─────────────────────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  // Mirror the production setErrorHandler from api/index.ts so that thrown errors
  // (e.g. from @fastify/rate-limit) produce the same { success, error } shape.
  fastify.setErrorHandler((error, _request, reply) => {
    const e = error as { statusCode?: number; code?: string; message?: string };
    const statusCode =
      typeof e.statusCode === 'number' && isFinite(e.statusCode) ? e.statusCode : 500;
    reply.code(statusCode).send({
      success: false,
      error: {
        code: e.code || 'INTERNAL_ERROR',
        message: e.message || 'An unexpected error occurred',
      },
    });
  });
  await fastify.register(publicRoutes, { prefix: PREFIX });
  await fastify.ready();
  return fastify;
}

// ─── Group D17-R-Static — source-level assertions ─────────────────────────────

describe('D17-R Static — DPP errorResponseBuilder uses Error pattern (not plain object)', () => {
  let src: string;

  beforeAll(() => {
    src = readFileSync(resolve(process.cwd(), 'src/routes/public.ts'), 'utf-8');
  });

  it('D17-R01: DPP errorResponseBuilder uses Object.assign(new Error(...)) pattern', () => {
    // Isolate the DPP rate-limit registration block only
    const blockStart = src.indexOf('// GET /api/public/dpp/:publicPassportId — rate-limited');
    const blockEnd = src.indexOf("fastify.get('/dpp/:publicPassportId'");
    expect(blockStart).toBeGreaterThan(-1);
    expect(blockEnd).toBeGreaterThan(blockStart);
    const block = src.slice(blockStart, blockEnd);
    expect(block).toMatch(/Object\.assign\s*\(\s*new Error/);
    expect(block).toMatch(/context\.statusCode/);
  });

  it('D17-R02: DPP errorResponseBuilder code is RATE_LIMITED', () => {
    const blockStart = src.indexOf('// GET /api/public/dpp/:publicPassportId — rate-limited');
    const blockEnd = src.indexOf("fastify.get('/dpp/:publicPassportId'");
    const block = src.slice(blockStart, blockEnd);
    expect(block).toMatch(/code\s*:\s*['"]RATE_LIMITED['"]/);
  });

  it('D17-R03: DPP errorResponseBuilder does NOT return old { error: "rate_limited" } plain object', () => {
    const blockStart = src.indexOf('// GET /api/public/dpp/:publicPassportId — rate-limited');
    const blockEnd = src.indexOf("fastify.get('/dpp/:publicPassportId'");
    const block = src.slice(blockStart, blockEnd);
    expect(block).not.toMatch(/error\s*:\s*['"]rate_limited['"]/);
    expect(block).not.toMatch(/retryAfter\s*:\s*Math\.ceil\s*\(\s*context\.ttl/);
  });
});

// ─── Group D17-R-Live — live HTTP rate-limit tests ────────────────────────────

describe('D17-R Live — DPP rate-limit enforcement (HTTP 429, not 500)', () => {
  let rateLimitApp: FastifyInstance;

  beforeAll(async () => {
    rateLimitApp = await buildApp();

    // Exhaust the allowed 100 requests using the same IP (default inject IP).
    // prisma.$transaction returns an empty array → handler returns NOT_FOUND (404).
    // This is intentional: we only need to exhaust the rate limit counter.
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    for (let i = 0; i < DPP_RATE_LIMIT_MAX; i++) {
      await rateLimitApp.inject({
        method: 'GET',
        url: DPP_ENDPOINT,
      });
    }
  });

  afterAll(async () => {
    await rateLimitApp.close();
  });

  it('D17-R04: 101st GET /dpp/:id → HTTP 429, not 500', async () => {
    const res = await rateLimitApp.inject({
      method: 'GET',
      url: DPP_ENDPOINT,
    });
    expect(res.statusCode).toBe(429);
  });

  it('D17-R05: rate-limited DPP response body has success: false', async () => {
    const res = await rateLimitApp.inject({ method: 'GET', url: DPP_ENDPOINT });
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body.success).toBe(false);
  });

  it('D17-R06: rate-limited DPP response body has code RATE_LIMITED', async () => {
    const res = await rateLimitApp.inject({ method: 'GET', url: DPP_ENDPOINT });
    const body = JSON.parse(res.body) as { error?: { code?: string } };
    expect(body.error?.code).toBe('RATE_LIMITED');
  });

  it('D17-R07: DB lookup (prisma.$transaction) not called for rate-limited request', async () => {
    vi.clearAllMocks();
    const res = await rateLimitApp.inject({ method: 'GET', url: DPP_ENDPOINT });
    expect(res.statusCode).toBe(429);
    // The rate-limiter fires before the handler; prisma.$transaction must not be called.
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
  });

  it('D17-R08: structured-data sub-route also returns 429 under same rate-limit plugin instance', async () => {
    // Both /dpp/:id and /dpp/:id/structured-data share the same fastifyRateLimit plugin
    // registration (with global: false). Each route has its own per-IP counter (max 100).
    // Exhaust the structured-data counter independently within this test.
    vi.mocked(prisma.$transaction).mockResolvedValue([]);
    for (let i = 0; i < DPP_RATE_LIMIT_MAX; i++) {
      await rateLimitApp.inject({ method: 'GET', url: DPP_SD_ENDPOINT });
    }
    const res = await rateLimitApp.inject({ method: 'GET', url: DPP_SD_ENDPOINT });
    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body) as { error?: { code?: string } };
    expect(body.error?.code).toBe('RATE_LIMITED');
  });
});

// ─── Group D17-R-Normal — non-rate-limited path unchanged ────────────────────

describe('D17-R Normal — non-rate-limited DPP request reaches handler (normal path)', () => {
  let normalApp: FastifyInstance;

  beforeAll(async () => {
    normalApp = await buildApp();
    // Phase 1: no matching PUBLISHED record → NOT_FOUND path
    vi.mocked(prisma.$transaction).mockResolvedValue([]);
  });

  afterAll(async () => {
    await normalApp.close();
  });

  it('D17-R09: first request is NOT rate-limited — reaches handler, returns 404 for unknown token', async () => {
    const res = await normalApp.inject({
      method: 'GET',
      url: DPP_ENDPOINT,
    });
    // Must not be 429 (rate limited) or 500 (internal error from bad rate-limit shape)
    // Handler receives the request and returns 404 (token not found)
    expect(res.statusCode).toBe(404);
    expect(res.statusCode).not.toBe(429);
    expect(res.statusCode).not.toBe(500);
  });
});
