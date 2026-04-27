/**
 * tenant/documents.ts — Document Intelligence K-1: Classify Route
 *
 * Fastify plugin — registered at /api/tenant/documents
 *
 * Routes:
 *   POST /api/tenant/documents/:documentId/classify — classify a document by type
 *
 * Implements TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001, Slice K-1.
 *
 * Constitutional compliance:
 *   D-017-A  orgId ALWAYS derived from JWT/dbContext — NEVER from request body
 *   K-1 scope: classification only; no extraction, no schema change, no lifecycle mutation,
 *              no buyer-facing output, no AI provider call
 *
 * Design:
 *   - :documentId is UUID-validated as a future-reference identifier.
 *     No DB document lookup occurs in K-1 (no documents table exists).
 *   - Classification is driven by the optional body payload only.
 *   - humanReviewRequired: true is a structural constant in all responses.
 *   - Audit emitted via writeAuditLog inside withDbContext (best-effort, non-fatal).
 *   - No AI provider call — pure keyword/metadata heuristic classification.
 *
 * K-2 will add: AI-backed field extraction from document text.
 * K-3 will add: document storage, draft persistence.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
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
};

export default tenantDocumentRoutes;
