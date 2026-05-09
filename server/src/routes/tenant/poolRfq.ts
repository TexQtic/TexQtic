/**
 * Pool RFQ Tenant Routes
 * TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-ROUTE-001
 *
 * Owner-only tenant routes for Network Commerce Pool RFQ issuance.
 *
 * D-017-A: orgId is ALWAYS sourced from request.dbContext.orgId — never from params/query/body.
 *
 * Routes:
 *   POST   /:poolId/rfq/issue   — issue a pool RFQ (AGGREGATING → CLOSED_FOR_BIDS)
 *
 * Design: TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001 (caac5a0)
 * Error mapping: TRANSITION_DENIED → 422 (Q-5 correction from DESIGN-001 §18)
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { ncPoolFeatureGateMiddleware } from '../../middleware/ncPoolFeatureGate.middleware.js';
import { ncPoolRfqFeatureGateMiddleware } from '../../middleware/ncPoolRfqFeatureGate.middleware.js';
import { prisma } from '../../db/prisma.js';
import { sendError, sendSuccess, sendValidationError } from '../../utils/response.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import {
  NetworkPoolRfqService,
  NetworkPoolRfqInvalidInputError,
  NetworkPoolRfqPoolNotFoundError,
  NetworkPoolRfqInvalidPoolStateError,
  NetworkPoolRfqSnapshotNotFoundError,
  NetworkPoolRfqAlreadyIssuedError,
  NetworkPoolRfqTransitionDeniedError,
  NetworkPoolRfqConflictError,
} from '../../services/networkPoolRfq.service.js';

// ─── Param / Body Schemas ─────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

const poolParamSchema = z.object({
  poolId: uuidSchema,
});

const issueRfqBodySchema = z
  .object({
    issue_reason: z.string().max(1000, 'issue_reason max 1000 chars').nullable().optional(),
    response_deadline_at: z
      .string()
      .datetime({ offset: true, message: 'response_deadline_at must be a valid ISO datetime string' })
      .nullable()
      .optional(),
    // Explicitly forbidden fields — rejected with validation error when present
    snapshot_id: z
      .never({ errorMap: () => ({ message: 'snapshot_id must not be provided in request body' }) })
      .optional(),
    rfq_ref: z
      .never({ errorMap: () => ({ message: 'rfq_ref must not be provided in request body' }) })
      .optional(),
    rfq_version: z
      .never({ errorMap: () => ({ message: 'rfq_version must not be provided in request body' }) })
      .optional(),
    owner_org_id: z
      .never({ errorMap: () => ({ message: 'owner_org_id must not be provided in request body' }) })
      .optional(),
    org_id: z
      .never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) })
      .optional(),
    issued_by_user_id: z
      .never({ errorMap: () => ({ message: 'issued_by_user_id must not be provided in request body' }) })
      .optional(),
    user_id: z
      .never({ errorMap: () => ({ message: 'user_id must not be provided in request body' }) })
      .optional(),
    status: z
      .never({ errorMap: () => ({ message: 'status must not be provided in request body' }) })
      .optional(),
    issue_basis: z
      .never({ errorMap: () => ({ message: 'issue_basis must not be provided in request body' }) })
      .optional(),
    supplier_invite_mode: z
      .never({ errorMap: () => ({ message: 'supplier_invite_mode must not be provided in request body' }) })
      .optional(),
    metadata_internal_json: z
      .never({ errorMap: () => ({ message: 'metadata_internal_json must not be provided in request body' }) })
      .optional(),
    lifecycle_state_id: z
      .never({ errorMap: () => ({ message: 'lifecycle_state_id must not be provided in request body' }) })
      .optional(),
  })
  .strict();

// ─── Validation Helpers ───────────────────────────────────────────────────────

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

// ─── Error Mapper ────────────────────────────────────────────────────────────

function mapNetworkPoolRfqServiceError(
  reply: Parameters<typeof sendError>[0],
  err: unknown,
): boolean {
  if (err instanceof NetworkPoolRfqInvalidInputError) {
    sendError(reply, 'INVALID_INPUT', err.message, 400);
    return true;
  }
  if (err instanceof NetworkPoolRfqPoolNotFoundError) {
    sendError(reply, 'POOL_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolRfqInvalidPoolStateError) {
    sendError(reply, 'INVALID_STATE', err.message, 422);
    return true;
  }
  if (err instanceof NetworkPoolRfqSnapshotNotFoundError) {
    sendError(reply, 'SNAPSHOT_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolRfqAlreadyIssuedError) {
    sendError(reply, 'RFQ_ALREADY_ISSUED', err.message, 409);
    return true;
  }
  if (err instanceof NetworkPoolRfqTransitionDeniedError) {
    // Q-5 correction: TRANSITION_DENIED maps to 422, not 409 — see DECISION-RECORD-001 §3 Q-5.
    sendError(reply, 'TRANSITION_DENIED', err.message, 422);
    return true;
  }
  if (err instanceof NetworkPoolRfqConflictError) {
    sendError(reply, 'RFQ_CONFLICT', err.message, 409);
    return true;
  }

  return false;
}

// ─── Route Plugin ────────────────────────────────────────────────────────────

const poolRfqRoutes: FastifyPluginAsync = async fastify => {
  // POST /:poolId/rfq/issue — issue a Pool RFQ
  //
  // Role gate: OWNER + ADMIN only; MEMBER → 403.
  // D-017-A: orgId always from request.dbContext.orgId; userId from request.userId.
  // Body: issue_reason (optional, nullable, max 1000), response_deadline_at (optional, nullable ISO).
  // Forbidden body fields: snapshot_id, rfq_ref, rfq_version, owner_org_id, org_id,
  //   issued_by_user_id, user_id, status, issue_basis, supplier_invite_mode,
  //   metadata_internal_json, lifecycle_state_id, any unknown field.
  fastify.post(
    '/:poolId/rfq/issue',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware, ncPoolRfqFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      // Role gate: OWNER + ADMIN only; MEMBER → 403
      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may issue an RFQ', 403);
      }

      const paramResult = poolParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = issueRfqBodySchema.safeParse(request.body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;
      const userId = request.userId ?? null;

      try {
        const stateMachine = new StateMachineService(prisma, null, null);
        const svc = new NetworkPoolRfqService(prisma, stateMachine);
        const record = await svc.issueRfq(orgId, userId, {
          pool_id: poolId,
          issue_reason: bodyResult.data.issue_reason,
          response_deadline_at: bodyResult.data.response_deadline_at,
        });
        return sendSuccess(reply, record, 201);
      } catch (err) {
        if (mapNetworkPoolRfqServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.issue');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to issue Pool RFQ', 500);
      }
    },
  );
};

export default poolRfqRoutes;
