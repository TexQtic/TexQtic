/**
 * tenant/documents.ts — Document Intelligence K-1 / K-3 / K-5
 *
 * Fastify plugin — registered at /api/tenant/documents
 *
 * Routes:
 *   POST /api/tenant/documents/:documentId/classify            — K-1: classify document by type
 *   POST /api/tenant/documents/:documentId/extract             — K-3: AI-backed field extraction + draft persistence
 *   POST /api/tenant/documents/:documentId/extraction/review   — K-5: human review submission (approve/reject)
 *
 * Implements TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001, Slices K-1, K-3, and K-5.
 *
 * Constitutional compliance:
 *   D-017-A  orgId ALWAYS derived from JWT/dbContext — NEVER from request body
 *   HOTFIX-MODEL-TX-001: AI call OUTSIDE Prisma tx; DB writes (draft, audit, reasoning, usage) INSIDE tx
 *   humanReviewRequired: true is a structural constant in all responses — cannot be overridden
 *   K-5 scope: review submission + status transition only
 *              - approve: apply field overrides, mark reviewer_edited, status → 'reviewed'
 *              - reject: status → 'rejected', no field promotion
 *              - NO Certification lifecycle mutation (G.4.1)
 *              - NO DPP / public / buyer-facing output
 *              - NO price / payment / escrow / risk / ranking logic
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog } from '../../lib/auditLog.js';
import {
  classifyDocumentType,
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL,
  type DocumentType,
} from '../../services/ai/documentClassificationService.js';
import {
  buildDocumentExtractionPrompt,
  parseDocumentExtractionOutput,
  callGeminiForDocumentExtraction,
  ExtractionParseError,
} from '../../services/ai/documentExtractionService.js';
import { config } from '../../config/index.js';
import {
  loadTenantBudget,
  getUsage,
  enforceBudgetOrThrow,
  upsertUsage,
  estimateCostUSD,
  getMonthKey,
  BudgetExceededError,
} from '../../lib/aiBudget.js';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

const documentIdParamSchema = z.object({
  documentId: uuidSchema,
});

const classifyBodySchema = z.object({
  /**
   * Optional short text snippet from the document (first ~1 000 chars recommended).
   * Primary signal for keyword-based classification.
   */
  textSnippet: z.string().max(2000).trim().optional(),
  /**
   * Optional document title or filename as provided by the uploader.
   */
  documentTitle: z.string().max(500).trim().optional(),
  /**
   * Optional MIME type of the document (e.g. 'application/pdf').
   */
  mimeType: z.string().max(100).trim().optional(),
  /**
   * Optional uploader-provided document type hint string.
   * Treated as an untrusted signal, not authoritative classification.
   */
  typeHint: z.string().max(200).trim().optional(),
  // D-017-A: orgId MUST NOT be in the body
  orgId: z.never({ message: 'orgId must not be set in request body' }).optional(),
});

const extractBodySchema = z.object({
  /**
   * Full document text content to extract fields from (required).
   * Maximum 50 000 characters — covers typical compliance certificate PDF text.
   */
  documentText: z.string().min(1).max(50_000).trim(),
  /**
   * Optional document title — used in prompt context if provided.
   */
  documentTitle: z.string().max(500).trim().optional(),
  /**
   * Optional caller-supplied documentType (e.g. from a prior K-1 classify call).
   * If absent, classification is auto-derived from documentText snippet.
   */
  documentType: z.string().max(100).trim().optional(),
  // D-017-A: orgId MUST NOT be in the body
  orgId: z.never({ message: 'orgId must not be set in request body' }).optional(),
});

// K-5: Review submission body
// action: approve | reject
// fieldOverrides: optional per-field value overrides (approve only; ignored on reject)
// D-017-A: orgId MUST NOT be in the body
const reviewBodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  fieldOverrides: z.record(z.string(), z.union([z.string(), z.null()])).optional(),
  // D-017-A: orgId MUST NOT be in the body
  orgId: z.never({ message: 'orgId must not be set in request body' }).optional(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantDocumentRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /:documentId/classify
   *
   * Classify a document by type using available metadata signals.
   *
   * K-1 scope:
   *   - No DB document lookup (:documentId is UUID-validated future-reference only)
   *   - No AI provider call (keyword/metadata heuristic classification)
   *   - No lifecycle state mutation
   *   - Audit emitted: 'document.classification.triggered'
   *   - humanReviewRequired: true structural constant in all responses
   */
  fastify.post(
    '/:documentId/classify',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;

      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Validate documentId path parameter
      const paramResult = documentIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { documentId } = paramResult.data;

      // Validate optional request body
      const bodyResult = classifyBodySchema.safeParse(request.body ?? {});
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const { textSnippet, documentTitle, mimeType, typeHint } = bodyResult.data;

      // Classify document (pure utility — no IO, no DB, no AI provider call)
      const classificationResult = classifyDocumentType({
        textSnippet: textSnippet ?? null,
        documentTitle: documentTitle ?? null,
        mimeType: mimeType ?? null,
        typeHint: typeHint ?? null,
      });

      // Emit audit log inside withDbContext (best-effort, non-fatal)
      try {
        await withDbContext(prisma, dbContext, async (tx) => {
          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: dbContext.orgId,
            actorType: 'USER',
            actorId: request.userId ?? null,
            action: 'document.classification.triggered',
            entity: 'document',
            entityId: documentId,
            metadataJson: {
              documentId,
              documentType: classificationResult.documentType,
              confidence: classificationResult.confidence,
              humanReviewRequired: true,
            },
          });
        });
      } catch (auditErr) {
        // Best-effort audit: classification result is still returned on audit write failure
        fastify.log.error({ err: auditErr }, '[DocumentClassify] Audit log write failed (non-fatal)');
      }

      // Response — humanReviewRequired: true and governanceLabel are structural constants
      return sendSuccess(reply, {
        documentId,
        documentType: classificationResult.documentType as DocumentType,
        confidence: classificationResult.confidence,
        humanReviewRequired: true as const,
        governanceLabel: DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL,
        notes: classificationResult.notes,
      });
    },
  );

  /**
   * POST /:documentId/extract
   *
   * Trigger AI extraction of fields from document text and persist draft.
   *
   * K-3 scope:
   *   - documentText required in body (no documents table yet — K-3 MVP)
   *   - AI call OUTSIDE Prisma tx (HOTFIX-MODEL-TX-001)
   *   - DB writes inside single tx: draft, auditLog, reasoningLog, aiUsageMeter
   *   - humanReviewRequired: true structural constant — immutable
   *   - status always 'draft' on creation
   *   - No review/approve/reject (K-5 responsibility)
   *   - No certifications mutation (G.4.1 — extraction does NOT change lifecycle)
   */
  fastify.post(
    '/:documentId/extract',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;

      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Validate documentId path parameter
      const paramResult = documentIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { documentId } = paramResult.data;

      // Validate request body
      const bodyResult = extractBodySchema.safeParse(request.body ?? {});
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const { documentText, documentTitle, documentType: bodyDocumentType } = bodyResult.data;

      // D-017-A: orgId always from dbContext — never from body
      const orgId = dbContext.orgId;
      const requestId = dbContext.requestId;

      // Resolve document type: use caller-supplied if valid, else auto-classify from snippet
      let resolvedDocumentType: string;
      if (bodyDocumentType) {
        resolvedDocumentType = bodyDocumentType;
      } else {
        const classified = classifyDocumentType({
          textSnippet: documentText.slice(0, 2000),
          documentTitle: documentTitle ?? null,
          mimeType: null,
          typeHint: null,
        });
        resolvedDocumentType = classified.documentType;
      }

      // Build extraction prompt (pure — no IO)
      const prompt = buildDocumentExtractionPrompt({
        documentType: resolvedDocumentType as DocumentType,
        documentText,
        documentId,
      });

      // ── HOTFIX-MODEL-TX-001: AI call OUTSIDE Prisma transaction ──────────────
      if (!config.GEMINI_API_KEY) {
        return sendError(reply, 'SERVICE_UNAVAILABLE', 'AI service not configured', 503);
      }

      const aiResult = await callGeminiForDocumentExtraction(config.GEMINI_API_KEY, prompt);

      if (aiResult.hadInferenceError) {
        return sendError(reply, 'SERVICE_UNAVAILABLE', 'AI extraction service unavailable. Please try again.', 503);
      }

      // Parse and validate AI output
      const extractedAt = new Date().toISOString();
      let draft;
      try {
        draft = parseDocumentExtractionOutput(aiResult.rawText, {
          documentId,
          orgId,
          documentType: resolvedDocumentType as DocumentType,
          extractedAt,
        });
      } catch (err) {
        if (err instanceof ExtractionParseError) {
          return sendError(reply, 'UNPROCESSABLE_ENTITY', `AI output could not be parsed: ${err.message}`, 422);
        }
        throw err;
      }

      // ── DB writes inside a single Prisma transaction ─────────────────────────
      const tokensUsed = aiResult.tokensUsed;
      const costUSD = estimateCostUSD(tokensUsed, 'gemini-2.5-flash');
      const monthKey = getMonthKey();
      const reasoningHash = createHash('sha256')
        .update(`${requestId}:${documentId}:${extractedAt}`)
        .digest('hex');

      let savedDraft;
      try {
        savedDraft = await withDbContext(prisma, dbContext, async (tx) => {
          // Budget enforcement — pre-flight inside tx so it's consistent
          const budgetPolicy = await loadTenantBudget(tx, orgId);
          const currentUsage = await getUsage(tx, orgId, monthKey);
          enforceBudgetOrThrow(budgetPolicy, currentUsage, tokensUsed, costUSD);

          // 1. Persist extraction draft
          const created = await tx.documentExtractionDraft.create({
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

          // 2. Upsert AI usage meter
          await upsertUsage(tx, orgId, monthKey, tokensUsed, costUSD);

          // 3. Write reasoning log (AI trace)
          const reasoningLog = await tx.reasoningLog.create({
            data: {
              tenantId: orgId,
              requestId,
              reasoningHash,
              model: 'gemini-2.5-flash',
              promptSummary: prompt.slice(0, 200),
              responseSummary: aiResult.rawText.slice(0, 500),
              tokensUsed,
            },
          });

          // 4. Write audit log (non-fatal inside tx — writeAuditLog swallows errors)
          const fieldCount = draft.extractedFields.length;
          const flaggedFieldCount = draft.extractedFields.filter((f) => f.flagged_for_review).length;
          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: orgId,
            actorType: 'USER',
            actorId: request.userId ?? null,
            action: 'AI_DOCUMENT_INTELLIGENCE_EXTRACTION',
            entity: 'document',
            entityId: documentId,
            metadataJson: {
              documentType: draft.documentType,
              overallConfidence: draft.overallConfidence,
              humanReviewRequired: true,
              fieldCount,
              flaggedFieldCount,
            },
            reasoningLogId: reasoningLog.id,
          });

          return created;
        });
      } catch (err) {
        if (err instanceof BudgetExceededError) {
          return sendError(reply, 'BUDGET_EXCEEDED', err.message, 429);
        }
        throw err;
      }

      // Build response — humanReviewRequired and governanceLabel are structural constants
      return sendSuccess(reply, {
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
        governanceLabel: DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL,
      });
    },
  );
  /**
   * POST /:documentId/extraction/review
   *
   * K-5: Human review submission — approve or reject an extraction draft.
   *
   * K-5 scope:
   *   - Locate latest 'draft' status record for documentId scoped to org_id
   *   - approve: apply reviewer field overrides (reviewer_edited: true per field), status → 'reviewed'
   *   - reject:  status → 'rejected', no field promotion
   *   - Set reviewedAt + reviewedByUserId in both cases
   *   - Emit audit event: 'document.extraction.reviewed'
   *   - humanReviewRequired: true structural constant — immutable
   *   - NO Certification lifecycle mutation
   *   - NO DPP / public / buyer-facing output
   *   - NO price / payment / escrow / risk / ranking logic
   */
  fastify.post(
    '/:documentId/extraction/review',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;

      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Validate documentId path parameter
      const paramResult = documentIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { documentId } = paramResult.data;

      // Validate request body
      const bodyResult = reviewBodySchema.safeParse(request.body ?? {});
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const { action, fieldOverrides } = bodyResult.data;

      // D-017-A: orgId always from dbContext — never from body
      const orgId = dbContext.orgId;
      const reviewedByUserId = request.userId ?? null;
      const reviewedAt = new Date();

      // Locate the latest draft record for this document scoped to org
      let existingDraft;
      try {
        existingDraft = await withDbContext(prisma, dbContext, async (tx) => {
          return (tx as typeof prisma).documentExtractionDraft.findFirst({
            where: { documentId, orgId, status: 'draft' },
            orderBy: { createdAt: 'desc' },
          });
        });
      } catch (err) {
        fastify.log.error({ err }, '[DocumentReview] Draft lookup failed');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to locate extraction draft', 500);
      }

      if (!existingDraft) {
        // No draft-status record found — either doesn't exist, wrong tenant, or already reviewed/rejected
        return sendError(reply, 'NOT_FOUND', 'No reviewable extraction draft found for this document', 404);
      }

      // Compute updated extracted fields (approve only — reject does not promote fields)
      const currentFields = existingDraft.extractedFields as Array<Record<string, unknown>>;
      let updatedFields: Array<Record<string, unknown>>;

      if (action === 'approve' && fieldOverrides && Object.keys(fieldOverrides).length > 0) {
        updatedFields = currentFields.map((field) => {
          const fieldName = field.field_name as string;
          if (Object.prototype.hasOwnProperty.call(fieldOverrides, fieldName)) {
            const overrideValue = fieldOverrides[fieldName];
            return {
              ...field,
              raw_value: overrideValue,
              normalized_value: overrideValue,
              reviewer_edited: true,
            };
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

      // Persist the status transition and reviewer metadata inside a single tx
      let updatedDraft;
      try {
        updatedDraft = await withDbContext(prisma, dbContext, async (tx) => {
          const saved = await (tx as typeof prisma).documentExtractionDraft.update({
            where: { id: existingDraft.id },
            data: {
              status: nextStatus,
              reviewedAt,
              reviewedByUserId,
              ...(action === 'approve' ? { extractedFields: updatedFields as object[] } : {}),
              updatedAt: new Date(),
            },
          });

          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: orgId,
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
        fastify.log.error({ err }, '[DocumentReview] Review persistence failed');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to persist extraction review', 500);
      }

      // Build response — humanReviewRequired and governanceLabel are structural constants
      return sendSuccess(reply, {
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
        governanceLabel: DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL,
      });
    },
  );
};

export default tenantDocumentRoutes;
