import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { ncPoolSupplierInviteFeatureGateMiddleware } from '../../middleware/ncPoolSupplierInviteFeatureGate.middleware.js';
import { prisma } from '../../db/prisma.js';
import { sendError, sendSuccess, sendValidationError } from '../../utils/response.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import {
  NetworkPoolRfqService,
  NetworkPoolRfqSupplierInviteInvalidInputError,
  NetworkPoolRfqSupplierInviteNotFoundError,
  NetworkPoolRfqSupplierInviteInvalidTransitionError,
  NetworkPoolRfqConflictError,
} from '../../services/networkPoolRfq.service.js';

const uuidSchema = z.string().uuid('Must be a valid UUID');

const inviteParamSchema = z.object({
  inviteId: uuidSchema,
});

const acceptInviteBodySchema = z
  .object({
    org_id: z.never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) }).optional(),
    owner_org_id: z.never({ errorMap: () => ({ message: 'owner_org_id must not be provided in request body' }) }).optional(),
    supplier_org_id: z.never({ errorMap: () => ({ message: 'supplier_org_id must not be provided in request body' }) }).optional(),
    pool_id: z.never({ errorMap: () => ({ message: 'pool_id must not be provided in request body' }) }).optional(),
    rfq_id: z.never({ errorMap: () => ({ message: 'rfq_id must not be provided in request body' }) }).optional(),
    invite_id: z.never({ errorMap: () => ({ message: 'invite_id must not be provided in request body' }) }).optional(),
    invite_ref: z.never({ errorMap: () => ({ message: 'invite_ref must not be provided in request body' }) }).optional(),
    status: z.never({ errorMap: () => ({ message: 'status must not be provided in request body' }) }).optional(),
    accepted_at: z.never({ errorMap: () => ({ message: 'accepted_at must not be provided in request body' }) }).optional(),
    declined_at: z.never({ errorMap: () => ({ message: 'declined_at must not be provided in request body' }) }).optional(),
    cancelled_at: z.never({ errorMap: () => ({ message: 'cancelled_at must not be provided in request body' }) }).optional(),
    metadata_internal_json: z.never({ errorMap: () => ({ message: 'metadata_internal_json must not be provided in request body' }) }).optional(),
    lifecycle_state_id: z.never({ errorMap: () => ({ message: 'lifecycle_state_id must not be provided in request body' }) }).optional(),
    created_at: z.never({ errorMap: () => ({ message: 'created_at must not be provided in request body' }) }).optional(),
    updated_at: z.never({ errorMap: () => ({ message: 'updated_at must not be provided in request body' }) }).optional(),
  })
  .strict();

const declineInviteBodySchema = z
  .object({
    decline_reason: z.string().max(2000, 'decline_reason max 2000 chars').nullable().optional(),
    org_id: z.never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) }).optional(),
    owner_org_id: z.never({ errorMap: () => ({ message: 'owner_org_id must not be provided in request body' }) }).optional(),
    supplier_org_id: z.never({ errorMap: () => ({ message: 'supplier_org_id must not be provided in request body' }) }).optional(),
    pool_id: z.never({ errorMap: () => ({ message: 'pool_id must not be provided in request body' }) }).optional(),
    rfq_id: z.never({ errorMap: () => ({ message: 'rfq_id must not be provided in request body' }) }).optional(),
    invite_id: z.never({ errorMap: () => ({ message: 'invite_id must not be provided in request body' }) }).optional(),
    invite_ref: z.never({ errorMap: () => ({ message: 'invite_ref must not be provided in request body' }) }).optional(),
    status: z.never({ errorMap: () => ({ message: 'status must not be provided in request body' }) }).optional(),
    accepted_at: z.never({ errorMap: () => ({ message: 'accepted_at must not be provided in request body' }) }).optional(),
    declined_at: z.never({ errorMap: () => ({ message: 'declined_at must not be provided in request body' }) }).optional(),
    cancelled_at: z.never({ errorMap: () => ({ message: 'cancelled_at must not be provided in request body' }) }).optional(),
    metadata_internal_json: z.never({ errorMap: () => ({ message: 'metadata_internal_json must not be provided in request body' }) }).optional(),
    lifecycle_state_id: z.never({ errorMap: () => ({ message: 'lifecycle_state_id must not be provided in request body' }) }).optional(),
    created_at: z.never({ errorMap: () => ({ message: 'created_at must not be provided in request body' }) }).optional(),
    updated_at: z.never({ errorMap: () => ({ message: 'updated_at must not be provided in request body' }) }).optional(),
  })
  .strict();

type ParseResult<T> = z.SafeParseReturnType<unknown, T>;

function handleBodyValidation<T>(
  reply: Parameters<typeof sendValidationError>[0],
  parsed: ParseResult<T>,
): parsed is z.SafeParseSuccess<T> {
  if (parsed.success) return true;

  const hasUnknownKeys = parsed.error.errors.some(err => err.code === 'unrecognized_keys');
  if (hasUnknownKeys) {
    sendValidationError(reply, parsed.error.errors);
    return false;
  }

  const firstMessage = parsed.error.errors[0]?.message ?? 'Invalid input';
  sendError(reply, 'INVALID_INPUT', firstMessage, 400, parsed.error.errors);
  return false;
}

function mapSupplierInviteServiceError(
  reply: Parameters<typeof sendError>[0],
  err: unknown,
): boolean {
  if (err instanceof NetworkPoolRfqSupplierInviteInvalidInputError) {
    sendError(reply, 'INVALID_INPUT', err.message, 400);
    return true;
  }
  if (err instanceof NetworkPoolRfqSupplierInviteNotFoundError) {
    sendError(reply, 'SUPPLIER_INVITE_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolRfqSupplierInviteInvalidTransitionError) {
    sendError(reply, 'INVALID_TRANSITION', err.message, 422);
    return true;
  }
  if (err instanceof NetworkPoolRfqConflictError) {
    sendError(reply, 'SUPPLIER_INVITE_CONFLICT', err.message, 409);
    return true;
  }
  return false;
}

const poolRfqSupplierInvitesRoutes: FastifyPluginAsync = async fastify => {
  const supplierInvitePreHandler = [ncPoolSupplierInviteFeatureGateMiddleware];

  // Supplier route namespace intentionally avoids pool/rfq path parameters.
  // Supplier scope is enforced by service methods using supplierOrgId from dbContext.

  fastify.get(
    '/supplier-rfq-invites',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: supplierInvitePreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const supplierOrgId = dbContext.orgId;
      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const records = await svc.listSupplierInvites(supplierOrgId);
        return sendSuccess(reply, records, 200);
      } catch (err) {
        if (mapSupplierInviteServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.supplier-rfq-invites.list');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list supplier invites', 500);
      }
    },
  );

  fastify.get(
    '/supplier-rfq-invites/:inviteId',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: supplierInvitePreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = inviteParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const supplierOrgId = dbContext.orgId;
      const { inviteId } = paramResult.data;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.viewInvite(supplierOrgId, inviteId);
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapSupplierInviteServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.supplier-rfq-invites.view');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to view supplier invite', 500);
      }
    },
  );

  fastify.post(
    '/supplier-rfq-invites/:inviteId/accept',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: supplierInvitePreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = inviteParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = acceptInviteBodySchema.safeParse(request.body ?? {});
      if (!handleBodyValidation(reply, bodyResult)) return;

      const supplierOrgId = dbContext.orgId;
      const userId = request.userId ?? null;
      const { inviteId } = paramResult.data;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.acceptInvite(supplierOrgId, userId, inviteId, null);
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapSupplierInviteServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.supplier-rfq-invites.accept');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to accept supplier invite', 500);
      }
    },
  );

  fastify.post(
    '/supplier-rfq-invites/:inviteId/decline',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: supplierInvitePreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = inviteParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = declineInviteBodySchema.safeParse(request.body ?? {});
      if (!handleBodyValidation(reply, bodyResult)) return;

      const supplierOrgId = dbContext.orgId;
      const userId = request.userId ?? null;
      const { inviteId } = paramResult.data;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.declineInvite(
          supplierOrgId,
          userId,
          inviteId,
          bodyResult.data.decline_reason,
        );
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapSupplierInviteServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.supplier-rfq-invites.decline');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to decline supplier invite', 500);
      }
    },
  );
};

export default poolRfqSupplierInvitesRoutes;
