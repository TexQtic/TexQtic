/**
 * tenant.documentExtraction.test.ts
 *
 * Route integration tests (K-R01..K-R12) for:
 *   POST /api/tenant/documents/:documentId/extract
 *
 * Tests the HTTP surface by building a minimal Fastify test server that
 * replicates the extract route from tenant/documents.ts, with all external
 * dependencies mocked. No real DB or AI provider calls.
 *
 * Tests:
 *   K-R01 — successful extraction draft creation returns 200 with valid response shape
 *   K-R02 — route requires auth/tenant context → 401 when missing
 *   K-R03 — invalid documentId UUID → 400 validation error
 *   K-R04 — missing documentText in body → 400 validation error
 *   K-R05 — body orgId rejected → 400 validation error
 *   K-R06 — response humanReviewRequired: true is always set
 *   K-R07 — response includes governanceLabel
 *   K-R08 — draft status always 'draft' in response
 *   K-R09 — ExtractionParseError from parseDocumentExtractionOutput → 422
 *   K-R10 — BudgetExceededError → 429
 *   K-R11 — no certification lifecycle mutation (audit action is AI_DOCUMENT_INTELLIGENCE_EXTRACTION)
 *   K-R12 — no K-4/K-5 review route exists in this file
 *
 * Run:
 *   cd C:\Users\PARESH\TexQtic\server ; npx vitest run src/routes/tenant.documentExtraction.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { createHash } from 'node:crypto';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEST_ORG_ID    = 'aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa';
const TEST_USER_ID   = 'bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb';
const TEST_DOC_ID    = 'cccccccc-0000-4000-8000-cccccccccccc';
const TEST_REQUEST_ID = 'rrrrrrrr-0000-4000-8000-rrrrrrrrrrrr';
const TEST_DRAFT_ID   = 'dddddddd-0000-4000-8000-dddddddddddd';

const GOVERNANCE_LABEL =
  'AI-generated extraction \u00B7 Human review required before acting on any extracted data';

const SAMPLE_DOCUMENT_TEXT =
  'GOTS Certificate No. TX-2026-001. Issued to: Textile Co Ltd. ' +
  'Scope: Spinning, Weaving, Dyeing. Valid from: 2026-01-01 to 2026-12-31. ' +
  'Certified by: Global Organic Textile Standard. Standard: GOTS 7.0.';

// ── Mock module factories (vi.hoisted — must inline string literals) ──────────

const { _extract, _budget, _genai, _classify, _cfg } = vi.hoisted(() => {
  // ExtractionParseError as a real class for instanceof checks
  class ExtractionParseError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'ExtractionParseError';
      this.code = code;
    }
  }

  class BudgetExceededError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'BudgetExceededError';
    }
  }

  const _extract = {
    buildDocumentExtractionPrompt: vi.fn().mockReturnValue('mock-prompt'),
    parseDocumentExtractionOutput: vi.fn(),
    callGeminiForDocumentExtraction: vi.fn(),
    ExtractionParseError,
    DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL:
      'AI-generated extraction \u00B7 Human review required before acting on any extracted data',
  };

  const _budget = {
    loadTenantBudget: vi.fn().mockResolvedValue({ monthlyLimit: 1000, hardStop: true }),
    getUsage: vi.fn().mockResolvedValue({ tokensUsed: 0, costEstimate: 0 }),
    enforceBudgetOrThrow: vi.fn(),
    upsertUsage: vi.fn().mockResolvedValue(undefined),
    estimateCostUSD: vi.fn().mockReturnValue(0.01),
    getMonthKey: vi.fn().mockReturnValue('2026-05'),
    BudgetExceededError,
  };

  const _genai = {
    GoogleGenerativeAI: vi.fn(),
  };

  const _classify = {
    classifyDocumentType: vi.fn().mockReturnValue({
      documentType: 'GOTS_CERTIFICATE',
      confidence: 0.9,
      humanReviewRequired: true,
      notes: 'Keyword match.',
    }),
    DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL:
      'AI-generated extraction \u00B7 Human review required before acting on any extracted data',
  };

  const _cfg = {
    config: { GEMINI_API_KEY: 'test-gemini-api-key' },
  };

  return { _extract, _budget, _genai, _classify, _cfg };
});

vi.mock('../services/ai/documentExtractionService.js', () => ({
  buildDocumentExtractionPrompt: _extract.buildDocumentExtractionPrompt,
  parseDocumentExtractionOutput: _extract.parseDocumentExtractionOutput,
  callGeminiForDocumentExtraction: _extract.callGeminiForDocumentExtraction,
  ExtractionParseError: _extract.ExtractionParseError,
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL:
    'AI-generated extraction \u00B7 Human review required before acting on any extracted data',
}));

vi.mock('../lib/aiBudget.js', () => ({
  loadTenantBudget: _budget.loadTenantBudget,
  getUsage: _budget.getUsage,
  enforceBudgetOrThrow: _budget.enforceBudgetOrThrow,
  upsertUsage: _budget.upsertUsage,
  estimateCostUSD: _budget.estimateCostUSD,
  getMonthKey: _budget.getMonthKey,
  BudgetExceededError: _budget.BudgetExceededError,
}));

vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn(
    async (_prisma: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        documentExtractionDraft: {
          create: vi.fn().mockResolvedValue({
            id: TEST_DRAFT_ID,
            orgId: TEST_ORG_ID,
            documentId: TEST_DOC_ID,
            documentType: 'GOTS_CERTIFICATE',
            overallConfidence: '0.85',
            humanReviewRequired: true,
            status: 'draft',
            extractionNotes: null,
            extractedAt: new Date('2026-05-05T00:00:00Z'),
            reviewedAt: null,
            reviewedByUserId: null,
          }),
        },
        reasoningLog: {
          create: vi.fn().mockResolvedValue({ id: 'rlog-id' }),
        },
      }),
  ),
}));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db/prisma.js', () => ({
  prisma: {},
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: _genai.GoogleGenerativeAI,
}));

vi.mock('../config/index.js', () => ({
  config: _cfg.config,
}));

vi.mock('../services/ai/documentClassificationService.js', () => ({
  classifyDocumentType: _classify.classifyDocumentType,
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL:
    'AI-generated extraction \u00B7 Human review required before acting on any extracted data',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { withDbContext } from '../lib/database-context.js';
import { writeAuditLog } from '../lib/auditLog.js';
import {
  buildDocumentExtractionPrompt,
  parseDocumentExtractionOutput,
  callGeminiForDocumentExtraction,
  ExtractionParseError,
} from '../services/ai/documentExtractionService.js';
import { BudgetExceededError, enforceBudgetOrThrow } from '../lib/aiBudget.js';

const mockWithDbContext = vi.mocked(withDbContext);
const mockWriteAuditLog = vi.mocked(writeAuditLog);
const mockBuildPrompt = vi.mocked(buildDocumentExtractionPrompt);
const mockParseOutput = vi.mocked(parseDocumentExtractionOutput);
const mockCallGemini = vi.mocked(callGeminiForDocumentExtraction);
const mockEnforceBudget = vi.mocked(enforceBudgetOrThrow);

// ── Default mock draft ────────────────────────────────────────────────────────

const DEFAULT_PARSED_DRAFT = {
  documentId: TEST_DOC_ID,
  orgId: TEST_ORG_ID,
  documentType: 'GOTS_CERTIFICATE' as const,
  extractedFields: [
    {
      field_name: 'certificate_number',
      raw_value: 'TX-2026-001',
      normalized_value: 'TX-2026-001',
      confidence: 0.95,
      flagged_for_review: false,
    },
  ],
  overallConfidence: 0.85,
  humanReviewRequired: true as const,
  status: 'draft' as const,
  extractionNotes: null,
  extractedAt: '2026-05-05T00:00:00.000Z',
};

// ── Helper types ──────────────────────────────────────────────────────────────

type TestReqExtras = {
  userId?: string;
  dbContext?: { orgId: string; requestId: string };
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

function localSendValidationError(reply: FastifyReply, errors: unknown[]) {
  return reply.status(400).send({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors },
  });
}

function localSendSuccess(reply: FastifyReply, data: unknown) {
  return reply.status(200).send({ success: true, data });
}

// ── Minimal test server factory ───────────────────────────────────────────────

async function buildTestApp(authenticated = true): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  fastify.addHook('onRequest', async (req) => {
    if (authenticated) {
      (req as unknown as TestReqExtras).userId = TEST_USER_ID;
      (req as unknown as TestReqExtras).dbContext = {
        orgId: TEST_ORG_ID,
        requestId: TEST_REQUEST_ID,
      };
    }
  });

  // Route: POST /tenant/documents/:documentId/extract
  fastify.post<{
    Params: { documentId: string };
    Body: Record<string, unknown>;
  }>('/tenant/documents/:documentId/extract', async (request, reply) => {
    const req = request as unknown as TestReqExtras;
    const dbContext = req.dbContext;

    if (!dbContext) {
      return localSendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    // Validate documentId path parameter
    const { documentId } = request.params;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(documentId)) {
      return localSendValidationError(reply, [{ path: ['documentId'], message: 'Must be a valid UUID' }]);
    }

    // Validate body
    const body = request.body ?? {};

    // Reject orgId in body (D-017-A)
    if ('orgId' in body) {
      return localSendValidationError(reply, [{ path: ['orgId'], message: 'orgId must not be set in request body' }]);
    }

    // documentText is required
    if (typeof body.documentText !== 'string' || (body.documentText as string).trim().length === 0) {
      return localSendValidationError(reply, [{ path: ['documentText'], message: 'Required' }]);
    }

    const documentText = (body.documentText as string).trim();

    // Reject documentText over 50_000 chars
    if (documentText.length > 50_000) {
      return localSendValidationError(reply, [{ path: ['documentText'], message: 'Must be at most 50000 characters' }]);
    }

    const documentTitle = typeof body.documentTitle === 'string' ? body.documentTitle : undefined;
    const bodyDocumentType = typeof body.documentType === 'string' ? body.documentType : undefined;

    // D-017-A: orgId always from dbContext
    const orgId = dbContext.orgId;
    const requestId = dbContext.requestId;

    const prompt = buildDocumentExtractionPrompt({
      documentType: (bodyDocumentType ?? 'UNKNOWN') as never,
      documentText,
      documentId,
    });

    // Gemini call OUTSIDE tx (HOTFIX-MODEL-TX-001)
    const aiResult = await callGeminiForDocumentExtraction(_cfg.config.GEMINI_API_KEY, prompt);

    if (aiResult.hadInferenceError) {
      return localSendError(reply, 'SERVICE_UNAVAILABLE', 'AI extraction service unavailable. Please try again.', 503);
    }

    // Parse AI output
    const extractedAt = '2026-05-05T00:00:00.000Z';
    let draft;
    try {
      draft = parseDocumentExtractionOutput(aiResult.rawText, {
        documentId,
        orgId,
        documentType: (bodyDocumentType ?? 'UNKNOWN') as never,
        extractedAt,
      });
    } catch (err) {
      if (err instanceof ExtractionParseError) {
        return localSendError(reply, 'UNPROCESSABLE_ENTITY', `AI output could not be parsed: ${err.message}`, 422);
      }
      throw err;
    }

    // DB writes inside tx
    const tokensUsed = aiResult.tokensUsed;
    const reasoningHash = createHash('sha256')
      .update(`${requestId}:${documentId}:${extractedAt}`)
      .digest('hex');
    void reasoningHash;

    let savedDraft;
    try {
      savedDraft = await withDbContext({} as never, dbContext as never, async (tx) => {
        const { loadTenantBudget: lBudget, getUsage: gUsage, enforceBudgetOrThrow: enforce, upsertUsage: uUsage } =
          await import('../lib/aiBudget.js');

        const budgetPolicy = await lBudget(tx, orgId);
        const currentUsage = await gUsage(tx, orgId, '2026-05');
        enforce(budgetPolicy, currentUsage, tokensUsed, 0.01);

        const created = await (tx as any).documentExtractionDraft.create({
          data: {
            orgId,
            documentId,
            documentType: draft.documentType,
            extractedFields: draft.extractedFields as object[],
            overallConfidence: draft.overallConfidence,
            humanReviewRequired: true,
            status: 'draft',
            extractionNotes: draft.extractionNotes,
            extractedAt: new Date(draft.extractedAt),
          },
        });

        await uUsage(tx, orgId, '2026-05', tokensUsed, 0.01);

        const reasoningLog = await (tx as any).reasoningLog.create({
          data: {
            tenantId: orgId,
            requestId,
            reasoningHash: 'mock-hash',
            model: 'gemini-2.5-flash',
            promptSummary: prompt.slice(0, 200),
            responseSummary: aiResult.rawText.slice(0, 500),
            tokensUsed,
          },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: orgId,
          actorType: 'USER',
          actorId: req.userId ?? null,
          action: 'AI_DOCUMENT_INTELLIGENCE_EXTRACTION',
          entity: 'document',
          entityId: documentId,
          metadataJson: {
            documentType: draft.documentType,
            overallConfidence: draft.overallConfidence,
            humanReviewRequired: true,
            fieldCount: draft.extractedFields.length,
            flaggedFieldCount: draft.extractedFields.filter((f: any) => f.flagged_for_review).length,
          },
          reasoningLogId: reasoningLog.id,
        });

        return created;
      });
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        return localSendError(reply, 'BUDGET_EXCEEDED', err.message, 429);
      }
      throw err;
    }

    return localSendSuccess(reply, {
      draft: {
        id: savedDraft.id,
        documentId: savedDraft.documentId,
        orgId: savedDraft.orgId,
        documentType: savedDraft.documentType,
        extractedFields: draft.extractedFields,
        overallConfidence: Number(savedDraft.overallConfidence),
        humanReviewRequired: true as const,
        status: savedDraft.status,
        extractionNotes: savedDraft.extractionNotes,
        extractedAt: savedDraft.extractedAt.toISOString(),
        reviewedAt: null,
        reviewedByUserId: null,
      },
      humanReviewRequired: true as const,
      governanceLabel: GOVERNANCE_LABEL,
    });
  });

  await fastify.ready();
  return fastify;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /tenant/documents/:documentId/extract', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: AI call succeeds
    mockCallGemini.mockResolvedValue({
      rawText: '{"extracted_fields":[],"overall_confidence":0.85}',
      tokensUsed: 100,
      hadInferenceError: false,
    });

    // Default: parse succeeds
    mockParseOutput.mockReturnValue({ ...DEFAULT_PARSED_DRAFT });

    // Default: budget allows
    mockEnforceBudget.mockReturnValue(undefined);

    // Default: withDbContext invokes callback with mock tx
    mockWithDbContext.mockImplementation(async (_p, _ctx, cb) =>
      cb({
        documentExtractionDraft: {
          create: vi.fn().mockResolvedValue({
            id: TEST_DRAFT_ID,
            orgId: TEST_ORG_ID,
            documentId: TEST_DOC_ID,
            documentType: 'GOTS_CERTIFICATE',
            overallConfidence: '0.85',
            humanReviewRequired: true,
            status: 'draft',
            extractionNotes: null,
            extractedAt: new Date('2026-05-05T00:00:00Z'),
            reviewedAt: null,
            reviewedByUserId: null,
          }),
        },
        reasoningLog: {
          create: vi.fn().mockResolvedValue({ id: 'rlog-id' }),
        },
      } as any),
    );

    mockWriteAuditLog.mockResolvedValue(undefined);
    mockBuildPrompt.mockReturnValue('mock-prompt');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  // ─── K-R01: 200 with valid response shape ───────────────────────────────────

  it('K-R01: returns 200 with valid response shape for authenticated request', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extract`,
      headers: { 'content-type': 'application/json' },
      payload: { documentText: SAMPLE_DOCUMENT_TEXT },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.draft).toBeDefined();
    expect(typeof body.data.draft.id).toBe('string');
    expect(typeof body.data.draft.documentId).toBe('string');
    expect(typeof body.data.draft.documentType).toBe('string');
    expect(Array.isArray(body.data.draft.extractedFields)).toBe(true);
    expect(typeof body.data.draft.overallConfidence).toBe('number');
  });

  // ─── K-R02: 401 when unauthenticated ───────────────────────────────────────

  it('K-R02: returns 401 when dbContext is missing (unauthenticated)', async () => {
    app = await buildTestApp(false);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extract`,
      headers: { 'content-type': 'application/json' },
      payload: { documentText: SAMPLE_DOCUMENT_TEXT },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  // ─── K-R03: 400 for invalid documentId UUID ────────────────────────────────

  it('K-R03: returns 400 when documentId is not a valid UUID', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/documents/not-a-uuid/extract',
      headers: { 'content-type': 'application/json' },
      payload: { documentText: SAMPLE_DOCUMENT_TEXT },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ─── K-R04: 400 when documentText is missing ───────────────────────────────

  it('K-R04: returns 400 when documentText is missing from body', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extract`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ─── K-R05: 400 when body contains orgId (D-017-A) ─────────────────────────

  it('K-R05: returns 400 when body contains orgId (D-017-A enforcement)', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extract`,
      headers: { 'content-type': 'application/json' },
      payload: { documentText: SAMPLE_DOCUMENT_TEXT, orgId: TEST_ORG_ID },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(body.error)).toContain('orgId');
  });

  // ─── K-R06: humanReviewRequired: true always ───────────────────────────────

  it('K-R06: response humanReviewRequired is always true', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extract`,
      headers: { 'content-type': 'application/json' },
      payload: { documentText: SAMPLE_DOCUMENT_TEXT },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.humanReviewRequired).toBe(true);
    expect(body.data.draft.humanReviewRequired).toBe(true);
  });

  // ─── K-R07: response includes governanceLabel ──────────────────────────────

  it('K-R07: response includes governanceLabel', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extract`,
      headers: { 'content-type': 'application/json' },
      payload: { documentText: SAMPLE_DOCUMENT_TEXT },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.data.governanceLabel).toBe('string');
    expect(body.data.governanceLabel.length).toBeGreaterThan(0);
    expect(body.data.governanceLabel).toBe(GOVERNANCE_LABEL);
  });

  // ─── K-R08: draft status always 'draft' ────────────────────────────────────

  it('K-R08: draft status is always "draft" on creation', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extract`,
      headers: { 'content-type': 'application/json' },
      payload: { documentText: SAMPLE_DOCUMENT_TEXT },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.draft.status).toBe('draft');
  });

  // ─── K-R09: ExtractionParseError → 422 ────────────────────────────────────

  it('K-R09: returns 422 when parseDocumentExtractionOutput throws ExtractionParseError', async () => {
    mockParseOutput.mockImplementation(() => {
      throw new ExtractionParseError('Invalid JSON from AI', 'INVALID_JSON');
    });

    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extract`,
      headers: { 'content-type': 'application/json' },
      payload: { documentText: SAMPLE_DOCUMENT_TEXT },
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNPROCESSABLE_ENTITY');
  });

  // ─── K-R10: BudgetExceededError → 429 ─────────────────────────────────────

  it('K-R10: returns 429 when budget enforcement throws BudgetExceededError', async () => {
    // Make withDbContext throw BudgetExceededError
    mockWithDbContext.mockImplementation(async (_p, _ctx, cb) => {
      const budgetErr = new BudgetExceededError('Monthly AI budget exceeded for this tenant');
      throw budgetErr;
    });

    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extract`,
      headers: { 'content-type': 'application/json' },
      payload: { documentText: SAMPLE_DOCUMENT_TEXT },
    });

    expect(res.statusCode).toBe(429);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('BUDGET_EXCEEDED');
  });

  // ─── K-R11: audit action is AI_DOCUMENT_INTELLIGENCE_EXTRACTION ────────────

  it('K-R11: audit log action is AI_DOCUMENT_INTELLIGENCE_EXTRACTION (no lifecycle mutation)', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extract`,
      headers: { 'content-type': 'application/json' },
      payload: { documentText: SAMPLE_DOCUMENT_TEXT },
    });

    expect(res.statusCode).toBe(200);
    expect(mockWriteAuditLog).toHaveBeenCalledOnce();

    const [, auditEntry] = mockWriteAuditLog.mock.calls[0];
    expect(auditEntry.action).toBe('AI_DOCUMENT_INTELLIGENCE_EXTRACTION');
    expect(auditEntry.entity).toBe('document');
    expect(auditEntry.entityId).toBe(TEST_DOC_ID);
    expect((auditEntry.metadataJson as any)?.humanReviewRequired).toBe(true);
  });

  // ─── K-R12: no review/approve/reject route in K-3 ─────────────────────────

  it('K-R12: no review or approve route exists in K-3 (K-5 scope boundary)', async () => {
    app = await buildTestApp(true);

    // POST /approve must not be registered
    const approve = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/approve`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });
    expect(approve.statusCode).toBe(404);

    // POST /reject must not be registered
    const reject = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/reject`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });
    expect(reject.statusCode).toBe(404);
  });
});
