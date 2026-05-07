import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { ncPoolFeatureGateMiddleware } from '../../middleware/ncPoolFeatureGate.middleware.js';
import { prisma } from '../../db/prisma.js';
import { sendError, sendSuccess, sendValidationError } from '../../utils/response.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import {
  NetworkPoolService,
  NetworkPoolNotFoundError,
  NetworkPoolInvalidInputError,
  NetworkPoolInvalidStateError,
  NetworkPoolDuplicateMembershipError,
  NetworkPoolTransitionDeniedError,
  NetworkPoolLifecycleStateMissingError,
} from '../../services/networkPool.service.js';

const uuidSchema = z.string().uuid('Must be a valid UUID');
const poolIdParamSchema = z.object({ poolId: uuidSchema });

const createPoolBodySchema = z.object({
  org_id: z
    .never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) })
    .optional(),
  pool_ref: z.string().trim().min(1).max(100, 'pool_ref max 100 chars'),
  commodity_category: z.string().trim().min(1).max(100, 'commodity_category max 100 chars'),
  target_qty: z.number().positive('target_qty must be > 0'),
  qty_unit: z.string().trim().min(1).max(50, 'qty_unit max 50 chars'),
  open_at: z.string().datetime({ offset: true }).optional().nullable(),
  close_at: z.string().datetime({ offset: true }).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

const openPoolBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(2000, 'reason max 2000 chars'),
  })
  .strict();

const joinPoolBodySchema = z
  .object({
    member_org_id: z
      .never({ errorMap: () => ({ message: 'member_org_id must not be provided in request body' }) })
      .optional(),
    org_id: z
      .never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) })
      .optional(),
    declared_qty: z.number().positive('declared_qty must be > 0'),
    qty_unit: z.string().trim().min(1).max(50, 'qty_unit max 50 chars'),
  })
  .strict();

type BodyParseResult<T> = z.SafeParseReturnType<unknown, T>;

function handleBodyValidation<T>(
  reply: Parameters<typeof sendValidationError>[0],
  parsed: BodyParseResult<T>,
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

function deriveActorType(userRole: string | undefined): 'TENANT_USER' | 'TENANT_ADMIN' {
  const normalized = (userRole ?? '').trim().toUpperCase();
  if (normalized.includes('ADMIN') || normalized === 'OWNER') {
    return 'TENANT_ADMIN';
  }
  return 'TENANT_USER';
}

function mapPoolServiceError(
  reply: Parameters<typeof sendError>[0],
  err: unknown,
): boolean {
  if (err instanceof NetworkPoolNotFoundError) {
    sendError(reply, 'POOL_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolInvalidInputError) {
    sendError(reply, 'INVALID_INPUT', err.message, 400);
    return true;
  }
  if (err instanceof NetworkPoolInvalidStateError) {
    sendError(reply, 'INVALID_STATE', err.message, 422);
    return true;
  }
  if (err instanceof NetworkPoolDuplicateMembershipError) {
    sendError(reply, 'DUPLICATE_MEMBERSHIP', err.message, 409);
    return true;
  }
  if (err instanceof NetworkPoolTransitionDeniedError) {
    sendError(reply, 'TRANSITION_DENIED', err.message, 422);
    return true;
  }
  if (err instanceof NetworkPoolLifecycleStateMissingError) {
    sendError(reply, 'INTERNAL_ERROR', err.message, 500);
    return true;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    sendError(reply, 'DUPLICATE_POOL_REF', 'A pool with this reference already exists for this organization', 409);
    return true;
  }

  return false;
}

const poolRoutes: FastifyPluginAsync = async fastify => {
  fastify.post(
    '/',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const bodyResult = createPoolBodySchema.safeParse(request.body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const orgId = dbContext.orgId;
      const userId = request.userId ?? null;

      try {
        const stateMachine = new StateMachineService(prisma, null, null);
        const svc = new NetworkPoolService(prisma, stateMachine);
        const record = await svc.createNetworkPool(orgId, userId, bodyResult.data);

        return sendSuccess(reply, record, 201);
      } catch (err) {
        if (mapPoolServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.pools.create');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to create pool', 500);
      }
    },
  );

  fastify.post(
    '/:poolId/open',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = openPoolBodySchema.safeParse(request.body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;
      const userId = request.userId ?? null;
      const userRole = request.userRole;

      try {
        const ownerScopedRow = await prisma.networkPool.findFirst({
          where: { id: poolId, orgId },
          select: { id: true },
        });

        if (!ownerScopedRow) {
          return sendError(reply, 'POOL_NOT_FOUND', 'Network pool not found', 404);
        }

        const stateMachine = new StateMachineService(prisma, null, null);
        const svc = new NetworkPoolService(prisma, stateMachine);
        const record = await svc.openNetworkPool(orgId, {
          pool_id: poolId,
          actor_user_id: userId,
          actor_admin_id: null,
          actor_type: deriveActorType(userRole),
          actor_role: userRole ?? 'TENANT_MEMBER',
          reason: bodyResult.data.reason,
          request_id: request.id ?? null,
        });

        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapPoolServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.pools.open');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to open pool', 500);
      }
    },
  );

  fastify.post(
    '/:poolId/join',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = joinPoolBodySchema.safeParse(request.body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { poolId } = paramResult.data;
      const memberOrgId = dbContext.orgId;
      const userId = request.userId ?? null;

      try {
        const stateMachine = new StateMachineService(prisma, null, null);
        const svc = new NetworkPoolService(prisma, stateMachine);
        const record = await svc.joinNetworkPool(memberOrgId, userId, {
          pool_id: poolId,
          declared_qty: bodyResult.data.declared_qty,
          qty_unit: bodyResult.data.qty_unit,
        });

        return sendSuccess(reply, record, 201);
      } catch (err) {
        if (mapPoolServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.pools.join');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to join pool', 500);
      }
    },
  );

  fastify.get(
    '/:poolId',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const ownerScopedRow = await prisma.networkPool.findFirst({
          where: { id: poolId, orgId },
          select: { id: true },
        });

        if (!ownerScopedRow) {
          return sendError(reply, 'POOL_NOT_FOUND', 'Network pool not found', 404);
        }

        const stateMachine = new StateMachineService(prisma, null, null);
        const svc = new NetworkPoolService(prisma, stateMachine);
        const record = await svc.getNetworkPoolById(orgId, poolId);

        if (!record) {
          return sendError(reply, 'POOL_NOT_FOUND', 'Network pool not found', 404);
        }

        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapPoolServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.pools.get');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to read pool', 500);
      }
    },
  );

  fastify.get(
    '/:poolId/membership',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const { poolId } = paramResult.data;
      const memberOrgId = dbContext.orgId;

      try {
        const stateMachine = new StateMachineService(prisma, null, null);
        const svc = new NetworkPoolService(prisma, stateMachine);
        const record = await svc.getNetworkPoolMembership(memberOrgId, poolId);

        if (!record) {
          return sendError(reply, 'POOL_MEMBERSHIP_NOT_FOUND', 'Pool membership not found', 404);
        }

        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapPoolServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.pools.membership.get');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to read pool membership', 500);
      }
    },
  );
};

export default poolRoutes;
