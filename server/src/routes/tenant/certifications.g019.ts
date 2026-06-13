/**
 * G-019 — Tenant Plane Certification Routes
 *
 * Fastify plugin — registered at /api/tenant/certifications
 *
 * Routes:
 *   POST  /api/tenant/certifications                  — create certification (SUBMITTED)
 *   GET   /api/tenant/certifications                  — list certifications (own org)
 *   GET   /api/tenant/certifications/:id              — get certification detail
 *   PATCH /api/tenant/certifications/:id              — update metadata (not state)
 *   POST  /api/tenant/certifications/:id/transition   — advance lifecycle state
 *
 * Constitutional compliance:
 *   D-017-A  orgId ALWAYS derived from JWT/dbContext — NEVER from request body
 *   D-020-C  aiTriggered=true requires "HUMAN_CONFIRMED:" prefix in reason
 *   D-020-D  reason is mandatory for create and transition
 *   Audit written via writeAuditLog (within same withDbContext scope)
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog } from '../../lib/auditLog.js';
import { CertificationService } from '../../services/certification.g019.service.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import { EscalationService } from '../../services/escalation.service.js';
import { SanctionsService } from '../../services/sanctions.service.js';
import {
  CertificateDocumentStorageError,
  createCertificateDocumentSignedUrl,
  deleteCertificateDocumentFromStorage,
  uploadCertificateDocumentToStorage,
  type CertificateDocumentErrorCode,
} from '../../services/storage/certificateDocument.storage.js';

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Proxy that wraps a TransactionClient so that calls to .$transaction(cb)
 * execute cb(tx) within the current open transaction, preserving RLS context
 * while allowing CertificationService to call this.db.$transaction() internally.
 */
function makeTxBoundPrisma(tx: Prisma.TransactionClient): PrismaClient {
  return new Proxy(tx as unknown as PrismaClient, {
    get(target, prop) {
      if (prop === '$transaction') {
        return (arg: unknown) => {
          if (typeof arg === 'function') {
            return (arg as (client: Prisma.TransactionClient) => Promise<unknown>)(tx);
          }

          if (Array.isArray(arg)) {
            return Promise.all(arg);
          }

          throw new TypeError('Unsupported $transaction usage in makeTxBoundPrisma');
        };
      }
      return (target as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const createCertBodySchema = z.object({
  certificationType:  z.string().min(1).max(100).trim(),
  reason:             z.string().min(1).max(2000).trim(),
  issuedAt:           z.string().datetime({ offset: true }).optional().nullable(),
  expiresAt:          z.string().datetime({ offset: true }).optional().nullable(),
  createdByUserId:    uuidSchema.optional().nullable(),
  // D-017-A: orgId MUST NOT be in the body
  orgId:              z.never({ message: 'orgId must not be set in request body' }).optional(),
});

const updateCertBodySchema = z.object({
  certificationType:  z.string().min(1).max(100).trim().optional(),
  issuedAt:           z.string().datetime({ offset: true }).optional().nullable(),
  expiresAt:          z.string().datetime({ offset: true }).optional().nullable(),
  // D-017-A: orgId MUST NOT be in the body
  orgId:              z.never({ message: 'orgId must not be set in request body' }).optional(),
});

const transitionCertBodySchema = z.object({
  toStateKey:   z.string().min(1).max(100).trim().toUpperCase(),
  reason:       z.string().min(1).max(2000).trim(),
  actorRole:    z.string().min(1).max(100).trim(),
  aiTriggered:  z.boolean().optional().default(false),
  // D-017-A: orgId MUST NOT be in the body
  orgId:        z.never({ message: 'orgId must not be set in request body' }).optional(),
});

const listQuerySchema = z.object({
  stateKey: z.string().max(50).trim().toUpperCase().optional(),
  limit:    z.coerce.number().int().min(1).max(200).optional().default(50),
  offset:   z.coerce.number().int().min(0).optional().default(0),
});

const certIdParamSchema = z.object({ id: uuidSchema });

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantCertificationRoutes: FastifyPluginAsync = async fastify => {

  // ─── POST /api/tenant/certifications ────────────────────────────────────
  /**
   * Create a certification in SUBMITTED lifecycle state.
   * orgId derived exclusively from authenticated JWT (dbContext.orgId).
   */
  fastify.post(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      const bodyResult = createCertBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const txBound = makeTxBoundPrisma(tx);
        const escalationSvc = new EscalationService(txBound);
        const sanctionsSvc  = new SanctionsService(txBound);
        const svc = new CertificationService(
          txBound,
          new StateMachineService(txBound, escalationSvc, sanctionsSvc),
          sanctionsSvc,
        );

        const result = await svc.createCertification({
          orgId:             dbContext.orgId,
          certificationType: body.certificationType,
          reason:            body.reason,
          issuedAt:          body.issuedAt ? new Date(body.issuedAt) : null,
          expiresAt:         body.expiresAt ? new Date(body.expiresAt) : null,
          createdByUserId:   body.createdByUserId ?? userId,
        });

        if (result.status === 'ERROR') {
          const httpStatus =
            result.code === 'REASON_REQUIRED' || result.code === 'INVALID_INPUT' ? 400
            : result.code === 'INVALID_LIFECYCLE_STATE' ? 500
            : 400;
          return sendError(reply, result.code, result.message, httpStatus);
        }

        // Audit: certification created
        await writeAuditLog(tx, {
          realm:       'TENANT',
          tenantId:    dbContext.orgId,
          actorType:   'USER',
          actorId:     userId,
          action:      'CERTIFICATION_CREATED',
          entity:      'certification',
          entityId:    result.certificationId,
          afterJson:   {
            certificationId:   result.certificationId,
            certificationType: body.certificationType,
            stateKey:          result.stateKey,
            reason:            body.reason,
          },
        });

        reply.code(201);
        return sendSuccess(reply, {
          certificationId:   result.certificationId,
          stateKey:          result.stateKey,
          certificationType: body.certificationType.toUpperCase(),
        });
      });
    },
  );

  // ─── GET /api/tenant/certifications ─────────────────────────────────────
  /**
   * List certifications for the authenticated org (tenant-scoped).
   */
  fastify.get(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const queryResult = listQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }
      const query = queryResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const txBound = makeTxBoundPrisma(tx);
        const escalationSvc = new EscalationService(txBound);
        const sanctionsSvc  = new SanctionsService(txBound);
        const svc = new CertificationService(
          txBound,
          new StateMachineService(txBound, escalationSvc, sanctionsSvc),
          sanctionsSvc,
        );

        const result = await svc.listCertifications(dbContext.orgId, {
          stateKey: query.stateKey,
          limit:    query.limit,
          offset:   query.offset,
        });

        if (result.status === 'ERROR') {
          return sendError(reply, result.code, result.message, 500);
        }

        return sendSuccess(reply, {
          items:  result.items,
          total:  result.total,
          limit:  query.limit,
          offset: query.offset,
        });
      });
    },
  );

  // ─── GET /api/tenant/certifications/:id ─────────────────────────────────
  /**
   * Get a single certification by id (tenant-scoped).
   */
  fastify.get(
    '/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const paramResult = certIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id } = paramResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const txBound = makeTxBoundPrisma(tx);
        const escalationSvc = new EscalationService(txBound);
        const sanctionsSvc  = new SanctionsService(txBound);
        const svc = new CertificationService(
          txBound,
          new StateMachineService(txBound, escalationSvc, sanctionsSvc),
          sanctionsSvc,
        );

        const result = await svc.getCertification(id, dbContext.orgId);

        if (result.status === 'ERROR') {
          const httpStatus = result.code === 'NOT_FOUND' ? 404 : 500;
          return sendError(reply, result.code, result.message, httpStatus);
        }

        return sendSuccess(reply, { certification: result.certification });
      });
    },
  );

  // ─── PATCH /api/tenant/certifications/:id ───────────────────────────────
  /**
   * Update certification metadata (certificationType, issuedAt, expiresAt).
   * Lifecycle state is NOT updated via this endpoint — use /transition.
   */
  fastify.patch(
    '/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      const paramResult = certIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id } = paramResult.data;

      const bodyResult = updateCertBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const txBound = makeTxBoundPrisma(tx);
        const escalationSvc = new EscalationService(txBound);
        const sanctionsSvc  = new SanctionsService(txBound);
        const svc = new CertificationService(
          txBound,
          new StateMachineService(txBound, escalationSvc, sanctionsSvc),
          sanctionsSvc,
        );

        const result = await svc.updateCertification({
          certificationId:   id,
          orgId:             dbContext.orgId,
          certificationType: body.certificationType,
          issuedAt:          body.issuedAt !== undefined
            ? (body.issuedAt ? new Date(body.issuedAt) : null)
            : undefined,
          expiresAt:         body.expiresAt !== undefined
            ? (body.expiresAt ? new Date(body.expiresAt) : null)
            : undefined,
        });

        if (result.status === 'ERROR') {
          const httpStatus =
            result.code === 'NOT_FOUND' ? 404
            : result.code === 'INVALID_INPUT' ? 400
            : 500;
          return sendError(reply, result.code, result.message, httpStatus);
        }

        // Audit
        await writeAuditLog(tx, {
          realm:     'TENANT',
          tenantId:  dbContext.orgId,
          actorType: 'USER',
          actorId:   userId,
          action:    'CERTIFICATION_UPDATED',
          entity:    'certification',
          entityId:  id,
          afterJson: body as unknown as import('@prisma/client').Prisma.JsonValue,
        });

        return sendSuccess(reply, { certificationId: result.certificationId });
      });
    },
  );

  // ─── POST /api/tenant/certifications/:id/document/upload ────────────────
  /**
   * Upload or replace a private certificate document.
   * OWNER/ADMIN only. orgId is derived from dbContext; storage path is never public.
   */
  fastify.post(
    '/:id/document/upload',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId, userRole } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can upload certificate documents.', 403);
      }

      const paramResult = certIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id } = paramResult.data;

      const existing = await withDbContext(prisma, dbContext, async tx => {
        return tx.certification.findFirst({
          where: { id, orgId: dbContext.orgId },
          select: { id: true },
        });
      });

      if (!existing) {
        return sendError(reply, 'NOT_FOUND', 'Certification not found.', 404);
      }

      try {
        const file = await request.file();
        if (!file) {
          return sendError(reply, 'FILE_REQUIRED', 'A certificate document file is required.', 400);
        }

        const fileBuffer = await file.toBuffer();
        if ((file.file as NodeJS.ReadableStream & { truncated?: boolean }).truncated) {
          return sendError(reply, 'FILE_TOO_LARGE', 'File exceeds 5 MB upload limit.', 400);
        }

        const uploadResult = await uploadCertificateDocumentToStorage({
          orgId: dbContext.orgId,
          certificationId: id,
          fileBuffer,
          declaredMimeType: file.mimetype,
          originalFilename: file.filename,
        });

        const uploadedAt = new Date();

        await withDbContext(prisma, dbContext, async tx => {
          await tx.certification.update({
            where: { id },
            data: {
              documentStoragePath: uploadResult.storagePath,
              documentOriginalName: uploadResult.originalName,
              documentMimeType: uploadResult.mimeType,
              documentSizeBytes: uploadResult.sizeBytes,
              documentUploadedAt: uploadedAt,
            },
          });

          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: dbContext.orgId,
            actorType: 'USER',
            actorId: userId,
            action: 'CERTIFICATION_DOCUMENT_UPLOADED',
            entity: 'certification',
            entityId: id,
            afterJson: {
              certificationId: id,
              documentOriginalName: uploadResult.originalName,
              documentMimeType: uploadResult.mimeType,
              documentSizeBytes: uploadResult.sizeBytes,
            },
          });
        });

        return sendSuccess(reply, {
          certificationId: id,
          documentOriginalName: uploadResult.originalName,
          documentMimeType: uploadResult.mimeType,
          documentSizeBytes: uploadResult.sizeBytes,
          documentUploadedAt: uploadedAt.toISOString(),
        });
      } catch (error) {
        if (error instanceof CertificateDocumentStorageError) {
          const code: CertificateDocumentErrorCode = error.code;
          return sendError(reply, code, error.message, error.statusCode);
        }

        const message = error instanceof Error ? error.message : 'Certificate document upload failed.';
        if (message.toLowerCase().includes('file too large')) {
          return sendError(reply, 'FILE_TOO_LARGE', 'File exceeds 5 MB upload limit.', 400);
        }

        return sendError(reply, 'UPLOAD_FAILED', 'Certificate document upload failed.', 500);
      }
    },
  );

  // ─── GET /api/tenant/certifications/:id/document ────────────────────────
  /**
   * Return a short-lived signed URL for an uploaded certificate document.
   * Tenant-auth scoped; no public route exposes certificate document storage.
   */
  fastify.get(
    '/:id/document',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const paramResult = certIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id } = paramResult.data;

      const cert = await withDbContext(prisma, dbContext, async tx => {
        return tx.certification.findFirst({
          where: { id, orgId: dbContext.orgId },
          select: {
            id: true,
            documentStoragePath: true,
            documentOriginalName: true,
            documentMimeType: true,
            documentSizeBytes: true,
            documentUploadedAt: true,
          },
        });
      });

      if (!cert) {
        return sendError(reply, 'NOT_FOUND', 'Certification not found.', 404);
      }

      if (!cert.documentStoragePath) {
        return sendError(reply, 'NOT_FOUND', 'Certificate document not found.', 404);
      }

      try {
        const { signedUrl } = await createCertificateDocumentSignedUrl(cert.documentStoragePath);
        return sendSuccess(reply, {
          certificationId: cert.id,
          signedUrl,
          documentOriginalName: cert.documentOriginalName,
          documentMimeType: cert.documentMimeType,
          documentSizeBytes: cert.documentSizeBytes,
          documentUploadedAt: cert.documentUploadedAt,
        });
      } catch (error) {
        if (error instanceof CertificateDocumentStorageError) {
          const code: CertificateDocumentErrorCode = error.code;
          return sendError(reply, code, error.message, error.statusCode);
        }

        return sendError(reply, 'SIGNED_URL_FAILED', 'Certificate document access failed.', 500);
      }
    },
  );

  // ─── DELETE /api/tenant/certifications/:id/document ─────────────────────
  /**
   * Remove a private certificate document and clear safe metadata.
   * OWNER/ADMIN only. orgId is derived from dbContext; storage path is never returned.
   */
  fastify.delete(
    '/:id/document',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId, userRole } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can remove certificate documents.', 403);
      }

      const paramResult = certIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id } = paramResult.data;

      const cert = await withDbContext(prisma, dbContext, async tx => {
        return tx.certification.findFirst({
          where: { id, orgId: dbContext.orgId },
          select: {
            id: true,
            documentStoragePath: true,
            documentOriginalName: true,
            documentMimeType: true,
            documentSizeBytes: true,
          },
        });
      });

      if (!cert) {
        return sendError(reply, 'NOT_FOUND', 'Certification not found.', 404);
      }

      if (!cert.documentStoragePath) {
        return sendError(reply, 'NOT_FOUND', 'Certificate document not found.', 404);
      }

      try {
        await deleteCertificateDocumentFromStorage(cert.documentStoragePath);

        await withDbContext(prisma, dbContext, async tx => {
          const updateResult = await tx.certification.updateMany({
            where: { id, orgId: dbContext.orgId },
            data: {
              documentStoragePath: null,
              documentOriginalName: null,
              documentMimeType: null,
              documentSizeBytes: null,
              documentUploadedAt: null,
            },
          });

          if (updateResult.count !== 1) {
            throw new Error('Certification document metadata delete target changed.');
          }

          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: dbContext.orgId,
            actorType: 'USER',
            actorId: userId,
            action: 'CERTIFICATION_DOCUMENT_REMOVED',
            entity: 'certification',
            entityId: id,
            beforeJson: {
              certificationId: id,
              documentOriginalName: cert.documentOriginalName,
              documentMimeType: cert.documentMimeType,
              documentSizeBytes: cert.documentSizeBytes,
            },
          });
        });

        return sendSuccess(reply, {
          certificationId: id,
          documentOriginalName: null,
          documentMimeType: null,
          documentSizeBytes: null,
          documentUploadedAt: null,
        });
      } catch (error) {
        if (error instanceof CertificateDocumentStorageError) {
          const code: CertificateDocumentErrorCode = error.code;
          return sendError(reply, code, error.message, error.statusCode);
        }

        return sendError(reply, 'DELETE_FAILED', 'Certificate document delete failed.', 500);
      }
    },
  );

  // ─── POST /api/tenant/certifications/:id/transition ─────────────────────
  /**
   * Advance certification lifecycle state via StateMachineService.
   * entity_type='CERTIFICATION' is hard-coded in the service — never caller-supplied.
   */
  fastify.post(
    '/:id/transition',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      const paramResult = certIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id } = paramResult.data;

      const bodyResult = transitionCertBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const txBound = makeTxBoundPrisma(tx);
        const escalationSvc = new EscalationService(txBound);
        const sanctionsSvc  = new SanctionsService(txBound);
        const svc = new CertificationService(
          txBound,
          new StateMachineService(txBound, escalationSvc, sanctionsSvc),
          sanctionsSvc,
        );

        const result = await svc.transitionCertification({
          certificationId: id,
          orgId:           dbContext.orgId,
          toStateKey:      body.toStateKey,
          reason:          body.reason,
          actorRole:       body.actorRole,
          actorUserId:     userId,
          actorAdminId:    null,
          aiTriggered:     body.aiTriggered,
        });

        if (result.status === 'ERROR') {
          const httpStatus =
            result.code === 'NOT_FOUND' ? 404
            : result.code === 'REASON_REQUIRED' || result.code === 'INVALID_INPUT' ? 400
            : result.code === 'TRANSITION_NOT_APPLIED' ? 422
            : 500;
          return sendError(reply, result.code, result.message, httpStatus);
        }

        // Audit
        await writeAuditLog(tx, {
          realm:     'TENANT',
          tenantId:  dbContext.orgId,
          actorType: 'USER',
          actorId:   userId,
          action:    `CERTIFICATION_TRANSITION_${result.status}`,
          entity:    'certification',
          entityId:  id,
          afterJson: {
            certificationId: id,
            toStateKey:      body.toStateKey,
            smStatus:        result.status,
            newStateKey:     result.newStateKey,
            reason:          body.reason,
          },
        });

        return sendSuccess(reply, {
          certificationId: id,
          status:          result.status,
          newStateKey:     result.newStateKey,
        });
      });
    },
  );
};

export default tenantCertificationRoutes;
