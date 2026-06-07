/**
 * INVESTIGATE-MAINAPP-INQUIRY-RATELIMIT-STATUS-CODE-01
 *
 * POST /api/public/inquiry/submit — rate-limit status code enforcement
 *
 * Finding: The inquiry route uses config.rateLimit without its own errorResponseBuilder.
 * It inherits the DPP plugin-level errorResponseBuilder registered in public.ts.
 *
 * Before commit 120438da (FIX-MAINAPP-DPP-RATELIMIT-STATUS-CODE-01):
 *   The DPP plugin-level errorResponseBuilder returned a plain object { error: 'rate_limited', retryAfter: N }.
 *   @fastify/rate-limit v10 throws the builder result; the global error handler
 *   (toErrorLike) received a non-Error thrown value with no statusCode → HTTP 500.
 *   The inquiry route, inheriting the same plugin-level builder, would also return HTTP 500.
 *
 * After commit 120438da:
 *   The DPP plugin-level errorResponseBuilder was fixed to:
 *     Object.assign(new Error('Too many requests...'), { statusCode: context.statusCode, code: 'RATE_LIMITED' })
 *   The inquiry route now inherits this corrected builder → returns HTTP 429.
 *
 * Tests (INQ-R = Inquiry public, Rate-limit enforcement group):
 *   INQ-R01 (static): inquiry config.rateLimit has no custom errorResponseBuilder
 *   INQ-R02 (static): DPP plugin-level errorResponseBuilder uses Object.assign(new Error(...))
 *   INQ-R03 (static): DPP plugin-level errorResponseBuilder does NOT return old plain-object pattern
 *   INQ-R04 (live): 21st POST /inquiry/submit → HTTP 429, not 500
 *   INQ-R05 (live): rate-limited response body has success: false
 *   INQ-R06 (live): rate-limited response body has code: RATE_LIMITED
 *   INQ-R07 (live): email notification services NOT called for rate-limited inquiry
 *   INQ-R08 (live): non-rate-limited inquiry reaches handler → HTTP 202 (normal path unaffected)
 */

// ─── Module mocks (hoisted by Vitest) ────────────────────────────────────────

vi.mock('../db/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    membership: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../config/index.js', () => ({
  config: { ADMIN_NOTIFICATION_EMAIL: null as string | null },
}));

vi.mock('../services/email/email.service.js', () => ({
  sendBuyerInquiryAcknowledgementEmail: vi.fn(),
  sendSupplierInquiryNotificationEmail: vi.fn(),
  sendAdminInquiryAlertEmail: vi.fn(),
}));

vi.mock('../services/publicB2BProjection.service.js', () => ({
  listPublicB2BSuppliers: vi.fn(),
  getPublicB2BSupplierBySlug: vi.fn(),
}));

vi.mock('../services/publicB2CProjection.service.js', () => ({
  listPublicB2CProducts: vi.fn(),
  getPublicB2CProductBySlug: vi.fn(),
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

vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn(),
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
import {
  sendSupplierInquiryNotificationEmail,
  sendAdminInquiryAlertEmail,
} from '../services/email/email.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PREFIX = '/api/public';
const INQUIRY_RATE_LIMIT_MAX = 20;
const INQUIRY_ENDPOINT = `${PREFIX}/inquiry/submit`;

// Minimal valid payload for general inquiry (no supplier_slug — avoids supplier gate,
// keeps mocking simple, exercises the general inquiry code path).
const GENERAL_INQUIRY_BODY = JSON.stringify({ inquiry_category: 'GENERAL' });

// ─── Test harness ─────────────────────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  // Mirror the production setErrorHandler from src/index.ts so that thrown errors
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

// ─── Group INQ-R-Static — source-level assertions ─────────────────────────────

describe('INQ-R Static — inquiry rate-limit inherits plugin-level Error pattern', () => {
  let src: string;

  beforeAll(() => {
    src = readFileSync(resolve(process.cwd(), 'src/routes/public.ts'), 'utf-8');
  });

  it('INQ-R01: inquiry route config.rateLimit does NOT declare its own errorResponseBuilder', () => {
    // The inquiry config block spans from the route registration to the handler body.
    const postIdx = src.indexOf("fastify.post('/inquiry/submit'");
    const handlerBodyIdx = src.indexOf('inquirySubmitBodySchema.safeParse(request.body)');
    const inquiryConfigBlock = src.slice(postIdx, handlerBodyIdx);
    expect(inquiryConfigBlock).not.toMatch(/errorResponseBuilder/);
  });

  it('INQ-R02: DPP plugin-level errorResponseBuilder uses Object.assign(new Error(...))', () => {
    // The DPP plugin-level registration block provides the default errorResponseBuilder
    // that the inquiry route inherits (inquiry config.rateLimit has no custom builder).
    const pluginStart = src.indexOf('// GET /api/public/dpp/:publicPassportId — rate-limited');
    const pluginEnd = src.indexOf("fastify.get('/dpp/:publicPassportId'");
    const pluginBlock = src.slice(pluginStart, pluginEnd);
    expect(pluginBlock).toMatch(/Object\.assign\s*\(\s*new Error/);
    expect(pluginBlock).toMatch(/context\.statusCode/);
    expect(pluginBlock).toMatch(/RATE_LIMITED/);
  });

  it('INQ-R03: DPP plugin-level errorResponseBuilder does NOT return old plain-object pattern', () => {
    const pluginStart = src.indexOf('// GET /api/public/dpp/:publicPassportId — rate-limited');
    const pluginEnd = src.indexOf("fastify.get('/dpp/:publicPassportId'");
    const pluginBlock = src.slice(pluginStart, pluginEnd);
    expect(pluginBlock).not.toMatch(/error\s*:\s*['"]rate_limited['"]/);
    expect(pluginBlock).not.toMatch(/retryAfter\s*:\s*Math\.ceil/);
  });
});

// ─── Group INQ-R-Live — live HTTP rate-limit enforcement ──────────────────────

describe('INQ-R Live — inquiry rate-limit enforcement (HTTP 429, not 500)', () => {
  let rateLimitApp: FastifyInstance;

  beforeAll(async () => {
    rateLimitApp = await buildApp();

    // Exhaust the 20-request limit using the general inquiry path.
    // prisma.$transaction is fire-and-forget; mock it to resolve immediately.
    // config.ADMIN_NOTIFICATION_EMAIL is null (mocked) → no email dispatches → returns 202.
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);

    for (let i = 0; i < INQUIRY_RATE_LIMIT_MAX; i++) {
      await rateLimitApp.inject({
        method: 'POST',
        url: INQUIRY_ENDPOINT,
        headers: { 'Content-Type': 'application/json' },
        payload: GENERAL_INQUIRY_BODY,
      });
    }
  });

  afterAll(async () => {
    await rateLimitApp.close();
  });

  it('INQ-R04: 21st POST /inquiry/submit → HTTP 429, not 500', async () => {
    const res = await rateLimitApp.inject({
      method: 'POST',
      url: INQUIRY_ENDPOINT,
      headers: { 'Content-Type': 'application/json' },
      payload: GENERAL_INQUIRY_BODY,
    });
    expect(res.statusCode).toBe(429);
  });

  it('INQ-R05: rate-limited inquiry response body has success: false', async () => {
    const res = await rateLimitApp.inject({
      method: 'POST',
      url: INQUIRY_ENDPOINT,
      headers: { 'Content-Type': 'application/json' },
      payload: GENERAL_INQUIRY_BODY,
    });
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body.success).toBe(false);
  });

  it('INQ-R06: rate-limited inquiry response body has code: RATE_LIMITED', async () => {
    const res = await rateLimitApp.inject({
      method: 'POST',
      url: INQUIRY_ENDPOINT,
      headers: { 'Content-Type': 'application/json' },
      payload: GENERAL_INQUIRY_BODY,
    });
    const body = JSON.parse(res.body) as { error?: { code?: string } };
    expect(body.error?.code).toBe('RATE_LIMITED');
  });

  it('INQ-R07: email notification services NOT called for rate-limited inquiry', async () => {
    vi.clearAllMocks();
    const res = await rateLimitApp.inject({
      method: 'POST',
      url: INQUIRY_ENDPOINT,
      headers: { 'Content-Type': 'application/json' },
      payload: GENERAL_INQUIRY_BODY,
    });
    expect(res.statusCode).toBe(429);
    // Rate-limiter fires before the handler — email services must not be invoked.
    expect(vi.mocked(sendSupplierInquiryNotificationEmail)).not.toHaveBeenCalled();
    expect(vi.mocked(sendAdminInquiryAlertEmail)).not.toHaveBeenCalled();
  });
});

// ─── Group INQ-R-Normal — non-rate-limited path unchanged ────────────────────

describe('INQ-R Normal — non-rate-limited inquiry reaches handler (normal path)', () => {
  let normalApp: FastifyInstance;

  beforeAll(async () => {
    normalApp = await buildApp();
    // general inquiry path: fire-and-forget prisma.$transaction; returns 202
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);
  });

  afterAll(async () => {
    await normalApp.close();
  });

  it('INQ-R08: first POST is NOT rate-limited — reaches handler, returns 202', async () => {
    const res = await normalApp.inject({
      method: 'POST',
      url: INQUIRY_ENDPOINT,
      headers: { 'Content-Type': 'application/json' },
      payload: GENERAL_INQUIRY_BODY,
    });
    // Not rate-limited (429) and not an internal error (500); handler returns 202.
    expect(res.statusCode).toBe(202);
    expect(res.statusCode).not.toBe(429);
    expect(res.statusCode).not.toBe(500);
  });
});
