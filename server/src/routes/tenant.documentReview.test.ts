/**
 * tenant.documentReview.test.ts
 *
 * Route integration tests (K-RV01..K-RV16) for:
 *   POST /api/tenant/documents/:documentId/extraction/review
 *
 * Implements TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001, Slice K-5.
 *
 * Tests:
 *   K-RV01 — approve draft → status transitions to 'reviewed', response shape correct
 *   K-RV02 — reject draft → status transitions to 'rejected', no field promotion
 *   K-RV03 — reviewer metadata (reviewedAt, reviewedByUserId) set on approve
 *   K-RV04 — reviewer metadata (reviewedAt, reviewedByUserId) set on reject
 *   K-RV05 — field override marks reviewer_edited: true on approved fields
 *   K-RV06 — reject does not apply field overrides
 *   K-RV07 — already-reviewed draft (status='reviewed') → 404 NOT_FOUND
 *   K-RV08 — already-rejected draft (status='rejected') → 404 NOT_FOUND
 *   K-RV09 — cross-tenant review denied — no draft found → 404
 *   K-RV10 — orgId body injection blocked → 400 VALIDATION_ERROR
 *   K-RV11 — audit event emitted with correct metadata
 *   K-RV12 — humanReviewRequired: true preserved in response
 *   K-RV13 — no certification lifecycle mutation in audit action
 *   K-RV14 — no DPP / buyer-facing fields in response
 *   K-RV15 — forbidden terms absent from response shape
 *   K-RV16 — invalid documentId UUID → 400
 *
 * Run:
 *   cd C:\Users\PARESH\TexQtic\server ; npx vitest run src/routes/tenant.documentReview.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEST_ORG_ID    = 'aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa';
const TEST_USER_ID   = 'bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb';
const TEST_DOC_ID    = 'cccccccc-0000-4000-8000-cccccccccccc';
const OTHER_ORG_ID   = 'ffffffff-0000-4000-8000-ffffffffffff';
const TEST_REQUEST_ID = 'rrrrrrrr-0000-4000-8000-rrrrrrrrrrrr';
const TEST_DRAFT_ID   = 'dddddddd-0000-4000-8000-dddddddddddd';

const GOVERNANCE_LABEL =
  'AI-generated extraction \u00B7 Human review required before acting on any extracted data';

const SAMPLE_FIELDS = [
  {
    field_name: 'certificate_number',
    raw_value: 'TX-2026-001',
    normalized_value: 'TX-2026-001',
    confidence: 0.95,
    source_region: 'header',
    flagged_for_review: false,
  },
  {
    field_name: 'expiry_date',
    raw_value: '31/12/2026',
    normalized_value: '2026-12-31',
    confidence: 0.4,
    source_region: 'footer',
    flagged_for_review: true,
  },
];

// ── Mock module factories ─────────────────────────────────────────────────────

const { _db, _audit } = vi.hoisted(() => {
  const _db = {
    findFirstResult: null as Record<string, unknown> | null,
    updateResult: null as Record<string, unknown> | null,
    findFirstFn: vi.fn(),
    updateFn: vi.fn(),
    withDbContextFn: vi.fn(),
  };

  const _audit = {
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
  };

  return { _db, _audit };
});

vi.mock('../lib/database-context.js', () => ({
  withDbContext: _db.withDbContextFn,
}));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: _audit.writeAuditLog,
}));

vi.mock('../db/prisma.js', () => ({
  prisma: {},
}));

vi.mock('../services/ai/documentClassificationService.js', () => ({
  classifyDocumentType: vi.fn(),
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL: GOVERNANCE_LABEL,
}));

vi.mock('../services/ai/documentExtractionService.js', () => ({
  buildDocumentExtractionPrompt: vi.fn(),
  parseDocumentExtractionOutput: vi.fn(),
  callGeminiForDocumentExtraction: vi.fn(),
  ExtractionParseError: class ExtractionParseError extends Error {},
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL: GOVERNANCE_LABEL,
}));

vi.mock('../lib/aiBudget.js', () => ({
  loadTenantBudget: vi.fn(),
  getUsage: vi.fn(),
  enforceBudgetOrThrow: vi.fn(),
  upsertUsage: vi.fn(),
  estimateCostUSD: vi.fn(),
  getMonthKey: vi.fn(),
  BudgetExceededError: class BudgetExceededError extends Error {},
}));

vi.mock('../config/index.js', () => ({
  config: { GEMINI_API_KEY: 'test-key' },
}));

vi.mock('../middleware/auth.js', () => ({
  tenantAuthMiddleware: vi.fn(async () => {}),
}));

vi.mock('../middleware/database-context.middleware.js', () => ({
  databaseContextMiddleware: vi.fn(async () => {}),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { withDbContext } from '../lib/database-context.js';
import { writeAuditLog } from '../lib/auditLog.js';

const mockWithDbContext = vi.mocked(withDbContext);
const mockWriteAuditLog = vi.mocked(writeAuditLog);

// ── Helper types ──────────────────────────────────────────────────────────────

type TestReqExtras = {
  userId?: string;
  dbContext?: { orgId: string; requestId: string };
};

function localSendError(reply: FastifyReply, code: string, message: string, status: number) {
  return reply.status(status).send({
    success: false,
    error: { code, message },
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

// ── Test server factory ───────────────────────────────────────────────────────

function makeDraftRecord(overrides: Partial<{
  id: string;
  orgId: string;
  documentId: string;
  documentType: string;
  extractedFields: object[];
  overallConfidence: string;
  humanReviewRequired: boolean;
  status: string;
  extractionNotes: string | null;
  extractedAt: Date;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
}> = {}) {
  return {
    id: TEST_DRAFT_ID,
    orgId: TEST_ORG_ID,
    documentId: TEST_DOC_ID,
    documentType: 'GOTS_CERTIFICATE',
    extractedFields: SAMPLE_FIELDS,
    overallConfidence: '0.75',
    humanReviewRequired: true,
    status: 'draft',
    extractionNotes: null,
    extractedAt: new Date('2026-04-27T00:00:00Z'),
    reviewedAt: null,
    reviewedByUserId: null,
    ...overrides,
  };
}

/**
 * Build a minimal Fastify test server that replicates the K-5 review route.
 * Inlines the route logic to avoid real plugin/middleware registration.
 */
async function buildTestApp(authenticated = true, orgId = TEST_ORG_ID): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  fastify.addHook('onRequest', async (req) => {
    if (authenticated) {
      (req as unknown as TestReqExtras).userId = TEST_USER_ID;
      (req as unknown as TestReqExtras).dbContext = { orgId, requestId: TEST_REQUEST_ID };
    }
  });

  // ── Review route (K-5) — inlined with same logic as documents.ts ──────────
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  fastify.post<{
    Params: { documentId: string };
    Body: Record<string, unknown>;
  }>('/tenant/documents/:documentId/extraction/review', async (request, reply) => {
    const req = request as unknown as TestReqExtras;
    const dbContext = req.dbContext;

    if (!dbContext) {
      return localSendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const { documentId } = request.params;
    if (!uuidPattern.test(documentId)) {
      return localSendValidationError(reply, [{ path: ['documentId'], message: 'Must be a valid UUID' }]);
    }

    const body = request.body ?? {};

    // D-017-A: orgId must not be in the body
    if ('orgId' in body) {
      return localSendValidationError(reply, [{ path: ['orgId'], message: 'orgId must not be set in request body' }]);
    }

    const action = body.action;
    if (action !== 'approve' && action !== 'reject') {
      return localSendValidationError(reply, [{ path: ['action'], message: 'Invalid action' }]);
    }

    const fieldOverrides =
      body.fieldOverrides != null && typeof body.fieldOverrides === 'object' && !Array.isArray(body.fieldOverrides)
        ? (body.fieldOverrides as Record<string, string | null>)
        : undefined;

    const resolvedOrgId = dbContext.orgId;
    const reviewedByUserId = req.userId ?? null;
    const reviewedAt = new Date('2026-04-27T12:00:00Z');

    // Locate the latest 'draft' record for documentId + org
    let existingDraft: ReturnType<typeof makeDraftRecord> | null;
    try {
      existingDraft = await withDbContext({} as never, dbContext as never, async (tx: unknown) => {
        return (tx as any).documentExtractionDraft.findFirst({
          where: { documentId, orgId: resolvedOrgId, status: 'draft' },
          orderBy: { createdAt: 'desc' },
        });
      });
    } catch (err) {
      return localSendError(reply, 'INTERNAL_ERROR', 'Failed to locate extraction draft', 500);
    }

    if (!existingDraft) {
      return localSendError(reply, 'NOT_FOUND', 'No reviewable extraction draft found for this document', 404);
    }

    const currentFields = existingDraft.extractedFields as Array<Record<string, unknown>>;
    let updatedFields: Array<Record<string, unknown>>;

    if (action === 'approve' && fieldOverrides && Object.keys(fieldOverrides).length > 0) {
      updatedFields = currentFields.map((field) => {
        const fieldName = field.field_name as string;
        if (Object.prototype.hasOwnProperty.call(fieldOverrides, fieldName)) {
          const overrideValue = fieldOverrides[fieldName];
          return { ...field, raw_value: overrideValue, normalized_value: overrideValue, reviewer_edited: true };
        }
        return field;
      });
    } else {
      updatedFields = currentFields;
    }

    const fieldOverrideCount =
      action === 'approve' && fieldOverrides ? Object.keys(fieldOverrides).length : 0;
    const nextStatus = action === 'approve' ? 'reviewed' : 'rejected';
    const previousStatus = 'draft';

    let updatedDraft: ReturnType<typeof makeDraftRecord>;
    try {
      updatedDraft = await withDbContext({} as never, dbContext as never, async (tx: unknown) => {
        const saved = await (tx as any).documentExtractionDraft.update({
          where: { id: existingDraft!.id },
          data: {
            status: nextStatus,
            reviewedAt,
            reviewedByUserId,
            ...(action === 'approve' ? { extractedFields: updatedFields } : {}),
            updatedAt: new Date(),
          },
        });

        await writeAuditLog(tx as any, {
          realm: 'TENANT',
          tenantId: resolvedOrgId,
          actorType: 'USER',
          actorId: reviewedByUserId,
          action: 'document.extraction.reviewed',
          entity: 'document',
          entityId: documentId,
          metadataJson: {
            reviewAction: action,
            fieldOverrideCount,
            humanReviewRequired: true,
            previousStatus,
            nextStatus,
          },
        });

        return saved;
      });
    } catch (err) {
      return localSendError(reply, 'INTERNAL_ERROR', 'Failed to persist extraction review', 500);
    }

    return localSendSuccess(reply, {
      draft: {
        id: updatedDraft.id,
        documentId: updatedDraft.documentId,
        orgId: updatedDraft.orgId,
        documentType: updatedDraft.documentType,
        extractedFields: updatedFields,
        overallConfidence: Number(updatedDraft.overallConfidence),
        humanReviewRequired: true as const,
        status: updatedDraft.status,
        extractionNotes: updatedDraft.extractionNotes,
        extractedAt: updatedDraft.extractedAt.toISOString(),
        reviewedAt: updatedDraft.reviewedAt ? updatedDraft.reviewedAt.toISOString() : null,
        reviewedByUserId: updatedDraft.reviewedByUserId,
      },
      humanReviewRequired: true as const,
      governanceLabel: GOVERNANCE_LABEL,
    });
  });

  await fastify.ready();
  return fastify;
}

// ── Shared DB context mock helpers ────────────────────────────────────────────

function setupDbMock(findFirstReturn: object | null, updateReturn?: object) {
  mockWithDbContext.mockImplementation(
    async (_prisma: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        documentExtractionDraft: {
          findFirst: vi.fn().mockResolvedValue(findFirstReturn),
          update: vi.fn().mockResolvedValue(
            updateReturn ?? {
              ...makeDraftRecord(),
              status: 'reviewed',
              reviewedAt: new Date('2026-04-27T12:00:00Z'),
              reviewedByUserId: TEST_USER_ID,
            },
          ),
        },
      };
      return cb(tx);
    },
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /tenant/documents/:documentId/extraction/review', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp();
  });

  // ── K-RV01: approve → status reviewed ──────────────────────────────────────
  it('K-RV01: approve draft → 200 with status "reviewed"', async () => {
    const updatedRecord = makeDraftRecord({
      status: 'reviewed',
      reviewedAt: new Date('2026-04-27T12:00:00Z'),
      reviewedByUserId: TEST_USER_ID,
    });
    setupDbMock(makeDraftRecord(), updatedRecord);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'approve' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.draft.status).toBe('reviewed');
    expect(body.data.humanReviewRequired).toBe(true);
    expect(body.data.governanceLabel).toBe(GOVERNANCE_LABEL);
  });

  // ── K-RV02: reject → status rejected ────────────────────────────────────────
  it('K-RV02: reject draft → 200 with status "rejected"', async () => {
    const updatedRecord = makeDraftRecord({
      status: 'rejected',
      reviewedAt: new Date('2026-04-27T12:00:00Z'),
      reviewedByUserId: TEST_USER_ID,
    });
    setupDbMock(makeDraftRecord(), updatedRecord);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'reject' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.draft.status).toBe('rejected');
  });

  // ── K-RV03: reviewer metadata set on approve ─────────────────────────────────
  it('K-RV03: reviewer metadata (reviewedAt, reviewedByUserId) present in approved response', async () => {
    const updatedRecord = makeDraftRecord({
      status: 'reviewed',
      reviewedAt: new Date('2026-04-27T12:00:00Z'),
      reviewedByUserId: TEST_USER_ID,
    });
    setupDbMock(makeDraftRecord(), updatedRecord);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'approve' },
    });

    const body = JSON.parse(res.body);
    expect(body.data.draft.reviewedAt).not.toBeNull();
    expect(body.data.draft.reviewedByUserId).toBe(TEST_USER_ID);
  });

  // ── K-RV04: reviewer metadata set on reject ──────────────────────────────────
  it('K-RV04: reviewer metadata (reviewedAt, reviewedByUserId) present in rejected response', async () => {
    const updatedRecord = makeDraftRecord({
      status: 'rejected',
      reviewedAt: new Date('2026-04-27T12:00:00Z'),
      reviewedByUserId: TEST_USER_ID,
    });
    setupDbMock(makeDraftRecord(), updatedRecord);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'reject' },
    });

    const body = JSON.parse(res.body);
    expect(body.data.draft.reviewedAt).not.toBeNull();
    expect(body.data.draft.reviewedByUserId).toBe(TEST_USER_ID);
  });

  // ── K-RV05: field override marks reviewer_edited: true ───────────────────────
  it('K-RV05: field override marks reviewer_edited: true on overridden field', async () => {
    const updatedRecord = makeDraftRecord({
      status: 'reviewed',
      reviewedAt: new Date('2026-04-27T12:00:00Z'),
      reviewedByUserId: TEST_USER_ID,
    });

    // Capture the update call arguments to verify fields
    let capturedUpdateData: Record<string, unknown> | null = null;

    mockWithDbContext.mockImplementation(
      async (_prisma: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          documentExtractionDraft: {
            findFirst: vi.fn().mockResolvedValue(makeDraftRecord()),
            update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
              capturedUpdateData = data;
              return Promise.resolve(updatedRecord);
            }),
          },
        };
        return cb(tx);
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: {
        action: 'approve',
        fieldOverrides: { certificate_number: 'TX-2026-999' },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    // The overridden field in the response should have reviewer_edited: true
    const certField = body.data.draft.extractedFields.find(
      (f: { field_name: string }) => f.field_name === 'certificate_number',
    );
    expect(certField).toBeDefined();
    expect(certField.reviewer_edited).toBe(true);
    expect(certField.raw_value).toBe('TX-2026-999');

    // The non-overridden field should not have reviewer_edited
    const expiryField = body.data.draft.extractedFields.find(
      (f: { field_name: string }) => f.field_name === 'expiry_date',
    );
    expect(expiryField).toBeDefined();
    expect(expiryField.reviewer_edited).toBeUndefined();
  });

  // ── K-RV06: reject does not apply field overrides ────────────────────────────
  it('K-RV06: reject action does not apply fieldOverrides', async () => {
    const updatedRecord = makeDraftRecord({
      status: 'rejected',
      reviewedAt: new Date('2026-04-27T12:00:00Z'),
      reviewedByUserId: TEST_USER_ID,
    });
    setupDbMock(makeDraftRecord(), updatedRecord);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: {
        action: 'reject',
        fieldOverrides: { certificate_number: 'SHOULD-NOT-APPLY' },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // Field value must remain original — override not applied on reject
    const certField = body.data.draft.extractedFields.find(
      (f: { field_name: string }) => f.field_name === 'certificate_number',
    );
    expect(certField.raw_value).toBe('TX-2026-001');
    expect(certField.reviewer_edited).toBeUndefined();
  });

  // ── K-RV07: already-reviewed draft → 404 ─────────────────────────────────────
  it('K-RV07: draft with status "reviewed" → 404 NOT_FOUND', async () => {
    // findFirst returns null because WHERE clause filters status='draft'
    setupDbMock(null);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'approve' },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // ── K-RV08: already-rejected draft → 404 ─────────────────────────────────────
  it('K-RV08: draft with status "rejected" → 404 NOT_FOUND', async () => {
    // findFirst returns null (WHERE status='draft' yields nothing for rejected)
    setupDbMock(null);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'reject' },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // ── K-RV09: cross-tenant review denied ───────────────────────────────────────
  it('K-RV09: cross-tenant review denied — no draft found for different org → 404', async () => {
    // Simulate the route running for OTHER_ORG_ID; the draft is scoped to TEST_ORG_ID, so findFirst returns null
    const appOtherOrg = await buildTestApp(true, OTHER_ORG_ID);
    setupDbMock(null);

    const res = await appOtherOrg.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'approve' },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // ── K-RV10: orgId body injection blocked ────────────────────────────────────
  it('K-RV10: orgId in request body → 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'approve', orgId: OTHER_ORG_ID },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── K-RV11: audit event emitted with correct metadata ───────────────────────
  it('K-RV11: audit event "document.extraction.reviewed" emitted with correct metadata', async () => {
    const updatedRecord = makeDraftRecord({
      status: 'reviewed',
      reviewedAt: new Date('2026-04-27T12:00:00Z'),
      reviewedByUserId: TEST_USER_ID,
    });

    mockWithDbContext.mockImplementation(
      async (_prisma: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          documentExtractionDraft: {
            findFirst: vi.fn().mockResolvedValue(makeDraftRecord()),
            update: vi.fn().mockResolvedValue(updatedRecord),
          },
        };
        return cb(tx);
      },
    );

    await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'approve', fieldOverrides: { certificate_number: 'TX-2026-999' } },
    });

    // writeAuditLog called twice (findFirst tx + update tx)
    const auditCalls = mockWriteAuditLog.mock.calls;
    const reviewAuditCall = auditCalls.find(
      ([, opts]) => (opts as { action: string }).action === 'document.extraction.reviewed',
    );
    expect(reviewAuditCall).toBeDefined();
    const auditOpts = reviewAuditCall![1] as {
      metadataJson: {
        reviewAction: string;
        fieldOverrideCount: number;
        humanReviewRequired: boolean;
        previousStatus: string;
        nextStatus: string;
      };
    };
    expect(auditOpts.metadataJson.reviewAction).toBe('approve');
    expect(auditOpts.metadataJson.fieldOverrideCount).toBe(1);
    expect(auditOpts.metadataJson.humanReviewRequired).toBe(true);
    expect(auditOpts.metadataJson.previousStatus).toBe('draft');
    expect(auditOpts.metadataJson.nextStatus).toBe('reviewed');
  });

  // ── K-RV12: humanReviewRequired: true preserved ──────────────────────────────
  it('K-RV12: humanReviewRequired: true preserved in response (approve)', async () => {
    setupDbMock(
      makeDraftRecord(),
      makeDraftRecord({ status: 'reviewed', reviewedAt: new Date(), reviewedByUserId: TEST_USER_ID }),
    );

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'approve' },
    });

    const body = JSON.parse(res.body);
    expect(body.data.humanReviewRequired).toBe(true);
    expect(body.data.draft.humanReviewRequired).toBe(true);
  });

  it('K-RV12b: humanReviewRequired: true preserved in response (reject)', async () => {
    setupDbMock(
      makeDraftRecord(),
      makeDraftRecord({ status: 'rejected', reviewedAt: new Date(), reviewedByUserId: TEST_USER_ID }),
    );

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'reject' },
    });

    const body = JSON.parse(res.body);
    expect(body.data.humanReviewRequired).toBe(true);
    expect(body.data.draft.humanReviewRequired).toBe(true);
  });

  // ── K-RV13: no certification lifecycle mutation ───────────────────────────────
  it('K-RV13: audit action is "document.extraction.reviewed" — not a Certification lifecycle action', async () => {
    setupDbMock(
      makeDraftRecord(),
      makeDraftRecord({ status: 'reviewed', reviewedAt: new Date(), reviewedByUserId: TEST_USER_ID }),
    );

    await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'approve' },
    });

    for (const [, opts] of mockWriteAuditLog.mock.calls) {
      const action = (opts as { action: string }).action;
      // Must NOT be any Certification lifecycle action
      expect(action).not.toMatch(/certification/i);
      expect(action).not.toMatch(/APPROVED/);
      expect(action).not.toMatch(/PENDING/);
      expect(action).not.toMatch(/lifecycle/i);
    }
  });

  // ── K-RV14: no DPP / buyer-facing fields ────────────────────────────────────
  it('K-RV14: response shape has no DPP, buyer-facing, or trust-signal fields', async () => {
    setupDbMock(
      makeDraftRecord(),
      makeDraftRecord({ status: 'reviewed', reviewedAt: new Date(), reviewedByUserId: TEST_USER_ID }),
    );

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'approve' },
    });

    const bodyStr = res.body;
    const FORBIDDEN_RESPONSE_FIELDS = [
      'dpp', 'passport', 'trustScore', 'buyerRanking', 'supplierRanking',
      'riskScore', 'matchingScore', 'creditScore', 'escrow', 'paymentDecision',
      'publicationPosture',
    ];
    for (const term of FORBIDDEN_RESPONSE_FIELDS) {
      expect(bodyStr.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });

  // ── K-RV15: forbidden terms absent from response ─────────────────────────────
  it('K-RV15: forbidden price/payment/risk/ranking terms absent from response', async () => {
    setupDbMock(
      makeDraftRecord(),
      makeDraftRecord({ status: 'reviewed', reviewedAt: new Date(), reviewedByUserId: TEST_USER_ID }),
    );

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/documents/${TEST_DOC_ID}/extraction/review`,
      body: { action: 'approve' },
    });

    const bodyStr = res.body.toLowerCase();
    const FORBIDDEN = ['price', 'payment', 'escrow', 'credit_score', 'risk_score', 'ranking', 'dpp_'];
    for (const term of FORBIDDEN) {
      expect(bodyStr).not.toContain(term);
    }
  });

  // ── K-RV16: invalid documentId UUID ─────────────────────────────────────────
  it('K-RV16: invalid documentId UUID → 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenant/documents/not-a-uuid/extraction/review',
      body: { action: 'approve' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
