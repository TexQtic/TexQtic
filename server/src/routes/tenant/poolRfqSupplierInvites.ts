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
  NetworkPoolRfqInvalidInputError,
  NetworkPoolRfqSupplierInviteNotFoundError,
  NetworkPoolRfqSupplierInviteInvalidTransitionError,
} from '../../services/networkPoolRfq.service.js';

const inviteIdParamSchema = z.object({
  inviteId: z.string().uuid('inviteId must be a valid UUID'),
});

const acceptBodySchema = z
  .object({
    note: z.string().max(2000, 'note max 2000 chars').nullable().optional(),
  })
  .strict();

const declineBodySchema = z
  .object({
    declineReason: z.string().max(2000, 'declineReason max 2000 chars').nullable().optional(),
  })
  .strict();

function mapSupplierRouteError(reply: Parameters<typeof sendError>[0], err: unknown): boolean {
  if (err instanceof NetworkPoolRfqInvalidInputError) {
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
  return false;
}

function parseStrictBody<T>(
  reply: Parameters<typeof sendError>[0],
  parsed: z.SafeParseReturnType<unknown, T>,
): parsed is z.SafeParseSuccess<T> {
  if (parsed.success) return true;

  const hasUnknownKeys = parsed.error.errors.some(err => err.code === 'unrecognized_keys');
  if (hasUnknownKeys) {
    sendValidationError(reply, parsed.error.errors);
    return false;
  }

  sendError(reply, 'INVALID_INPUT', parsed.error.errors[0]?.message ?? 'Invalid input', 400, parsed.error.errors);
  return false;
}

const poolRfqSupplierInvitesRoutes: FastifyPluginAsync = async fastify => {
  const stateMachine = new StateMachineService(prisma);
  const service = new NetworkPoolRfqService(prisma, stateMachine);

  const supplierOnlyGuards = [
    tenantAuthMiddleware,
    databaseContextMiddleware,
    ncPoolSupplierInviteFeatureGateMiddleware,
  ] as const;

  fastify.get(
    '/supplier-rfq-invites',
    { onRequest: [...supplierOnlyGuards] },
    async (request, reply) => {
      const orgId = request.dbContext?.orgId;
      if (!orgId) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      try {
        const data = await service.listSupplierInvites(orgId);
        return sendSuccess(reply, data, 200);
      } catch (err) {
        if (mapSupplierRouteError(reply, err)) return reply;
        request.log.error({ err }, 'supplier invite list failed');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list supplier invites', 500);
      }
    },
  );

  fastify.get(
    '/supplier-rfq-invites/:inviteId',
    { onRequest: [...supplierOnlyGuards] },
    async (request, reply) => {
      const orgId = request.dbContext?.orgId;
      if (!orgId) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const parsedParams = inviteIdParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return sendValidationError(reply, parsedParams.error.errors);
      }

      try {
        const data = await service.viewInvite(orgId, parsedParams.data.inviteId);
        return sendSuccess(reply, data, 200);
      } catch (err) {
        if (mapSupplierRouteError(reply, err)) return reply;
        request.log.error({ err }, 'supplier invite get failed');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to get supplier invite', 500);
      }
    },
  );

  fastify.post(
    '/supplier-rfq-invites/:inviteId/accept',
    { onRequest: [...supplierOnlyGuards] },
    async (request, reply) => {
      const orgId = request.dbContext?.orgId;
      if (!orgId) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const parsedParams = inviteIdParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return sendValidationError(reply, parsedParams.error.errors);
      }

      const parsedBody = acceptBodySchema.safeParse(request.body ?? {});
      if (!parseStrictBody(reply, parsedBody)) {
        return reply;
      }

      try {
        const data = await service.acceptInvite(
          orgId,
          request.userId ?? null,
          parsedParams.data.inviteId,
          parsedBody.data.note ?? null,
        );
        return sendSuccess(reply, data, 200);
      } catch (err) {
        if (mapSupplierRouteError(reply, err)) return reply;
        request.log.error({ err }, 'supplier invite accept failed');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to accept supplier invite', 500);
      }
    },
  );

  fastify.post(
    '/supplier-rfq-invites/:inviteId/decline',
    { onRequest: [...supplierOnlyGuards] },
    async (request, reply) => {
      const orgId = request.dbContext?.orgId;
      if (!orgId) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const parsedParams = inviteIdParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return sendValidationError(reply, parsedParams.error.errors);
      }

      const parsedBody = declineBodySchema.safeParse(request.body ?? {});
      if (!parseStrictBody(reply, parsedBody)) {
        return reply;
      }

      try {
        const data = await service.declineInvite(
          orgId,
          request.userId ?? null,
          parsedParams.data.inviteId,
          parsedBody.data.declineReason ?? null,
        );
        return sendSuccess(reply, data, 200);
      } catch (err) {
        if (mapSupplierRouteError(reply, err)) return reply;
        request.log.error({ err }, 'supplier invite decline failed');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to decline supplier invite', 500);
      }
    },
  );
};

export default poolRfqSupplierInvitesRoutes;
