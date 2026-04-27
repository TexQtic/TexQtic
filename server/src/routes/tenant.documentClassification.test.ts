/**
 * tenant.documentClassification.test.ts
 *
 * Route integration tests (K-R01..K-R08) for:
 *   POST /api/tenant/documents/:documentId/classify
 *
 * Tests the HTTP surface by building a minimal Fastify test server that
 * replicates the route handler from tenant/documents.ts, with all external
 * dependencies mocked. No real DB or AI provider calls.
 *
 * Tests:
 *   K-R01 — POST with valid auth + body → 200 with valid response shape
 *   K-R02 — POST with valid auth + empty body → 200 with UNKNOWN type
 *   K-R03 — POST unauthenticated (missing dbContext) → 401
 *   K-R04 — POST with invalid UUID documentId → 400 validation error
 *   K-R05 — Response includes humanReviewRequired: true in all 200 responses
 *   K-R06 — Response includes governanceLabel in all 200 responses
 *   K-R07 — Response does not include any forbidden field names
 *   K-R08 — documentId in response matches the path parameter
 *
 * Run:
 *   pnpm --filter server exec vitest run src/routes/tenant.documentClassification.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEST_ORG_ID = 'aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa';
const TEST_USER_ID = 'bbbbbbbb-0000-0000-0000-bbbbbbbbbbbb';
const TEST_DOC_ID  = 'cccccccc-0000-4000-8000-cccccccccccc';

const GOVERNANCE_LABEL =
  'AI-generated extraction \u00B7 Human review required before acting on any extracted data';

// ── Mock module factories ─────────────────────────────────────────────────────

const { _classify } = vi.hoisted(() => {
  const _classify = {
    classifyDocumentType: vi.fn(),
    // Inline the string — vi.hoisted() runs before module-level variables are initialized
    DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL:
      'AI-generated extraction \u00B7 Human review required before acting on any extracted data',
  };
  return { _classify };
});

vi.mock('../services/ai/documentClassificationService.js', () => ({
  classifyDocumentType: _classify.classifyDocumentType,
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL:
    'AI-generated extraction \u00B7 Human review required before acting on any extracted data',
}));

vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn(async (_prisma: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => cb({})),
}));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db/prisma.js', () => ({
  prisma: {},
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { classifyDocumentType } from '../services/ai/documentClassificationService.js';
const mockClassify = vi.mocked(classifyDocumentType);

// ── Helpers ───────────────────────────────────────────────────────────────────

type TestReqExtras = {
  userId?: string;
  dbContext?: { orgId: string };
};

function localSendError(
  reply: FastifyReply,
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return reply.status(status).send({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

function localSendSuccess(reply: FastifyReply, data: unknown) {
  return reply.status(200).send({ success: true, data });
}

// ── Minimal test server factory ───────────────────────────────────────────────
//
// Replicates the documents route handler from tenant/documents.ts so the
// HTTP surface can be tested without loading the full tenant plugin.

async function buildTestApp(authenticated = true): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  // Simulate tenantAuthMiddleware + databaseContextMiddleware
  fastify.addHook('onRequest', async (req) => {
    if (authenticated) {
      (req as unknown as TestReqExtras).userId = TEST_USER_ID;
      (req as unknown as TestReqExtras).dbContext = { orgId: TEST_ORG_ID };
    }
  });

  // Route: POST /tenant/documents/:documentId/classify
  fastify.post<{
    Params: { documentId: string };
    Body: Record<string, unknown>;
  }>('/tenant/documents/:documentId/classify', async (request, reply) => {
    const req = request as unknown as TestReqExtras;
    const dbContext = req.dbContext;

    if (!dbContext) {
      return localSendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    // Validate documentId
    const { documentId } = request.params;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(documentId)) {
      return localSendError(reply, 'VALIDATION_ERROR', 'Validation failed', 400, [
        { path: ['documentId'], message: 'Must be a valid UUID' },
      ]);
    }

    // Parse body (all optional)
    const body = request.body ?? {};
    const textSnippet: string | null = typeof body.textSnippet === 'string' ? body.textSnippet : null;
    const documentTitle: string | null = typeof body.documentTitle === 'string' ? body.documentTitle : null;
    const mimeType: string | null = typeof body.mimeType === 'string' ? body.mimeType : null;
    const typeHint: string | null = typeof body.typeHint === 'string' ? body.typeHint : null;

    // Classify (pure utility — no AI provider)
    const classificationResult = classifyDocumentType({
      textSnippet,
      documentTitle,
      mimeType,
      typeHint,
    });

    return localSendSuccess(reply, {
      documentId,
      documentType: classificationResult.documentType,
      confidence: classificationResult.confidence,
      humanReviewRequired: true as const,
      governanceLabel: GOVERNANCE_LABEL,
      notes: classificationResult.notes,
    });
  });

  await fastify.ready();
  return fastify;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /tenant/documents/:documentId/classify', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    // Default classify mock: returns a GOTS classification result
    mockClassify.mockReturnValue({
      documentType: 'GOTS_CERTIFICATE',
      confidence: 0.87,
      humanReviewRequired: true,
      notes: 'Classified from document metadata (2 keyword signals matched).',
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    vi.clearAllMocks();
  });

  // K-R01 — Authenticated request with body → 200 with valid shape

  it('K-R01: returns 200 with valid response shape for authenticated request', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/classify`,
      headers: { 'content-type': 'application/json' },
      payload: {
        documentTitle: 'GOTS Certificate 2026',
        textSnippet: 'Global Organic Textile Standard certificate confirming organic compliance.',
        mimeType: 'application/pdf',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(typeof body.data.documentId).toBe('string');
    expect(typeof body.data.documentType).toBe('string');
    expect(typeof body.data.confidence).toBe('number');
  });

  // K-R02 — Authenticated with empty body → 200 with UNKNOWN type

  it('K-R02: returns 200 with UNKNOWN type for empty body', async () => {
    mockClassify.mockReturnValue({
      documentType: 'UNKNOWN',
      confidence: 0.0,
      humanReviewRequired: true,
      notes: 'No document metadata provided; classification requires at least one input signal.',
    });

    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/classify`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.documentType).toBe('UNKNOWN');
    expect(body.data.confidence).toBe(0.0);
  });

  // K-R03 — Unauthenticated request → 401

  it('K-R03: returns 401 when dbContext is missing (unauthenticated)', async () => {
    app = await buildTestApp(false);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/classify`,
      headers: { 'content-type': 'application/json' },
      payload: { documentTitle: 'GOTS Certificate' },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  // K-R04 — Invalid UUID documentId → 400

  it('K-R04: returns 400 when documentId is not a valid UUID', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/documents/not-a-uuid/classify',
      headers: { 'content-type': 'application/json' },
      payload: { documentTitle: 'GOTS Certificate' },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  // K-R05 — humanReviewRequired: true in all 200 responses

  it('K-R05: response includes humanReviewRequired: true for classified document', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/classify`,
      headers: { 'content-type': 'application/json' },
      payload: { documentTitle: 'GOTS Certificate' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.humanReviewRequired).toBe(true);
  });

  it('K-R05b: humanReviewRequired is true even for UNKNOWN classification', async () => {
    mockClassify.mockReturnValue({
      documentType: 'UNKNOWN',
      confidence: 0.0,
      humanReviewRequired: true,
    });

    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/classify`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.humanReviewRequired).toBe(true);
  });

  // K-R06 — governanceLabel in 200 response

  it('K-R06: response includes governanceLabel in 200 response', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/classify`,
      headers: { 'content-type': 'application/json' },
      payload: { documentTitle: 'GOTS Certificate' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.governanceLabel).toBe(GOVERNANCE_LABEL);
    expect(body.data.governanceLabel).toContain('Human review required');
  });

  // K-R07 — Forbidden fields absent from response body

  it('K-R07: response does not include any forbidden field names', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/classify`,
      headers: { 'content-type': 'application/json' },
      payload: { documentTitle: 'GOTS Certificate' },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json().data;

    const forbiddenKeys = [
      'price',
      'risk_score',
      'publicationPosture',
      'buyer_ranking',
      'supplier_ranking',
      'escrow',
      'escrowAccount',
      'escrowTransaction',
      'payment',
    ];
    for (const key of forbiddenKeys) {
      expect(data).not.toHaveProperty(key);
    }
  });

  // K-R08 — documentId in response matches the path parameter

  it('K-R08: documentId in response data matches the path parameter', async () => {
    app = await buildTestApp(true);

    const docId = randomUUID();
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${docId}/classify`,
      headers: { 'content-type': 'application/json' },
      payload: { documentTitle: 'GOTS Certificate' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.documentId).toBe(docId);
  });
});
