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
import { ncPoolSupplierInviteFeatureGateMiddleware } from '../../middleware/ncPoolSupplierInviteFeatureGate.middleware.js';
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
  NetworkPoolRfqRfqNotFoundError,
  NetworkPoolRfqSupplierInviteInvalidInputError,
  NetworkPoolRfqSupplierInviteNotFoundError,
  NetworkPoolRfqSupplierInviteAlreadySentError,
  NetworkPoolRfqSupplierInviteInvalidTransitionError,
} from '../../services/networkPoolRfq.service.js';

// ─── Param / Body Schemas ─────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

const poolParamSchema = z.object({
  poolId: uuidSchema,
});

const rfqParamSchema = z.object({
  poolId: uuidSchema,
  rfqId:  uuidSchema,
});

const inviteParamSchema = z.object({
  poolId:   uuidSchema,
  rfqId:    uuidSchema,
  inviteId: uuidSchema,
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

// OD-1: POST create invite body — strict, no system/internal fields.
const sendInviteBodySchema = z
  .object({
    supplier_org_id:          z.string().uuid('supplier_org_id must be a valid UUID'),
    expires_at:               z.string().datetime({ offset: true, message: 'expires_at must be a valid ISO datetime string' }).nullable().optional(),
    supplier_message:         z.string().max(2000, 'supplier_message max 2000 chars').nullable().optional(),
    // Forbidden fields — rejected on presence.
    org_id:                   z.never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) }).optional(),
    owner_org_id:             z.never({ errorMap: () => ({ message: 'owner_org_id must not be provided in request body' }) }).optional(),
    pool_id:                  z.never({ errorMap: () => ({ message: 'pool_id must not be provided in body — use path param' }) }).optional(),
    rfq_id:                   z.never({ errorMap: () => ({ message: 'rfq_id must not be provided in body — use path param' }) }).optional(),
    user_id:                  z.never({ errorMap: () => ({ message: 'user_id must not be provided in request body' }) }).optional(),
    invited_by_user_id:       z.never({ errorMap: () => ({ message: 'invited_by_user_id must not be provided in request body' }) }).optional(),
    invite_ref:               z.never({ errorMap: () => ({ message: 'invite_ref must not be provided in request body' }) }).optional(),
    status:                   z.never({ errorMap: () => ({ message: 'status must not be provided in request body' }) }).optional(),
    accepted_at:              z.never({ errorMap: () => ({ message: 'accepted_at must not be provided in request body' }) }).optional(),
    declined_at:              z.never({ errorMap: () => ({ message: 'declined_at must not be provided in request body' }) }).optional(),
    cancelled_at:             z.never({ errorMap: () => ({ message: 'cancelled_at must not be provided in request body' }) }).optional(),
    metadata_internal_json:   z.never({ errorMap: () => ({ message: 'metadata_internal_json must not be provided in request body' }) }).optional(),
    lifecycle_state_id:       z.never({ errorMap: () => ({ message: 'lifecycle_state_id must not be provided in request body' }) }).optional(),
  })
  .strict();

// POST cancel invite body — strict.
const cancelInviteBodySchema = z
  .object({
    cancel_reason:            z.string().max(2000, 'cancel_reason max 2000 chars').nullable().optional(),
    // Forbidden fields.
    status:                   z.never({ errorMap: () => ({ message: 'status must not be provided in request body' }) }).optional(),
    cancelled_at:             z.never({ errorMap: () => ({ message: 'cancelled_at must not be provided in request body' }) }).optional(),
    metadata_internal_json:   z.never({ errorMap: () => ({ message: 'metadata_internal_json must not be provided in request body' }) }).optional(),
    org_id:                   z.never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) }).optional(),
    owner_org_id:             z.never({ errorMap: () => ({ message: 'owner_org_id must not be provided in request body' }) }).optional(),
    supplier_org_id:          z.never({ errorMap: () => ({ message: 'supplier_org_id must not be provided in request body' }) }).optional(),
    user_id:                  z.never({ errorMap: () => ({ message: 'user_id must not be provided in request body' }) }).optional(),
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

// ─── Invite Error Mapper ─────────────────────────────────────────────────────
//
// Maps invite-specific service errors to HTTP responses.
// Called by all 4 owner invite routes.

function mapSupplierInviteServiceError(
  reply: Parameters<typeof sendError>[0],
  err: unknown,
): boolean {
  if (err instanceof NetworkPoolRfqSupplierInviteInvalidInputError) {
    sendError(reply, 'INVALID_INPUT', err.message, 400);
    return true;
  }
  if (err instanceof NetworkPoolRfqPoolNotFoundError) {
    sendError(reply, 'POOL_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolRfqRfqNotFoundError) {
    sendError(reply, 'RFQ_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolRfqSupplierInviteNotFoundError) {
    sendError(reply, 'SUPPLIER_INVITE_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolRfqInvalidPoolStateError) {
    sendError(reply, 'INVALID_STATE', err.message, 422);
    return true;
  }
  if (err instanceof NetworkPoolRfqSupplierInviteAlreadySentError) {
    // OD-1: No re-invite → 409 SUPPLIER_INVITE_ALREADY_SENT
    sendError(reply, 'SUPPLIER_INVITE_ALREADY_SENT', err.message, 409);
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

  // ─── Owner Supplier Invite Routes ──────────────────────────────────────────
  //
  // OD-6: All four owner invite routes require the full 3-gate chain:
  //   ncPoolFeatureGateMiddleware → ncPoolRfqFeatureGateMiddleware
  //   → ncPoolSupplierInviteFeatureGateMiddleware
  //
  // Role gate: OWNER + ADMIN only; MEMBER → 403.
  // D-017-A: orgId always from request.dbContext.orgId.
  //          userId always from request.userId.
  //          pool_id / rfq_id / invite_id from path params only.

  const ownerInvitePreHandler = [
    ncPoolFeatureGateMiddleware,
    ncPoolRfqFeatureGateMiddleware,
    ncPoolSupplierInviteFeatureGateMiddleware,
  ];

  // POST /:poolId/rfq/:rfqId/invites — send supplier invite
  //
  // Body (strict): supplier_org_id (required UUID), expires_at? (ISO), supplier_message? (string).
  // Forbidden: org_id, owner_org_id, pool_id, rfq_id, user_id, invited_by_user_id,
  //   invite_ref, status, accepted_at, declined_at, cancelled_at, metadata_internal_json,
  //   lifecycle_state_id, any unknown field.
  // Errors: INVALID_INPUT(400), POOL_NOT_FOUND(404), RFQ_NOT_FOUND(404),
  //   INVALID_STATE(422), SUPPLIER_INVITE_ALREADY_SENT(409), INTERNAL_ERROR(500).
  fastify.post(
    '/:poolId/rfq/:rfqId/invites',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerInvitePreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may send supplier invites', 403);
      }

      const paramResult = rfqParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = sendInviteBodySchema.safeParse(request.body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { poolId, rfqId } = paramResult.data;
      const orgId  = dbContext.orgId;
      const userId = request.userId ?? null;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.sendInvite(orgId, userId, {
          pool_id:          poolId,
          rfq_id:           rfqId,
          supplier_org_id:  bodyResult.data.supplier_org_id,
          expires_at:       bodyResult.data.expires_at,
          supplier_message: bodyResult.data.supplier_message,
          request_id:       request.id ?? null,
        });
        return sendSuccess(reply, record, 201);
      } catch (err) {
        if (mapSupplierInviteServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.invite.send');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to send supplier invite', 500);
      }
    },
  );

  // GET /:poolId/rfq/:rfqId/invites — list all supplier invites for this RFQ
  //
  // No body. Returns array of owner-safe invite records.
  // OD-5: metadataInternalJson never in response.
  // OD-2: Effective status (may be EXPIRED) returned.
  fastify.get(
    '/:poolId/rfq/:rfqId/invites',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerInvitePreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may list supplier invites', 403);
      }

      const paramResult = rfqParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const { poolId, rfqId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const records = await svc.listInvites(orgId, poolId, rfqId);
        return sendSuccess(reply, records, 200);
      } catch (err) {
        if (mapSupplierInviteServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.invite.list');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list supplier invites', 500);
      }
    },
  );

  // GET /:poolId/rfq/:rfqId/invites/:inviteId — get single supplier invite
  //
  // No body. Returns one owner-safe invite record or 404.
  // Wrong pool/rfq/invite combo → non-leaking 404 SUPPLIER_INVITE_NOT_FOUND.
  fastify.get(
    '/:poolId/rfq/:rfqId/invites/:inviteId',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerInvitePreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may view supplier invites', 403);
      }

      const paramResult = inviteParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const { poolId, rfqId, inviteId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.getInvite(orgId, poolId, rfqId, inviteId);
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapSupplierInviteServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.invite.get');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to get supplier invite', 500);
      }
    },
  );

  // POST /:poolId/rfq/:rfqId/invites/:inviteId/cancel — cancel a PENDING invite
  //
  // Body (strict): cancel_reason? (optional string).
  // Forbidden: status, cancelled_at, metadata_internal_json, org_id, owner_org_id,
  //   supplier_org_id, user_id, any unknown field.
  // Errors: SUPPLIER_INVITE_NOT_FOUND(404), INVALID_TRANSITION(422),
  //   INVALID_STATE(422), INTERNAL_ERROR(500).
  // OD-7: lifecycle log written in service via direct tx.networkLifecycleLog.create —
  //   StateMachineService.transition is NEVER called from this route.
  fastify.post(
    '/:poolId/rfq/:rfqId/invites/:inviteId/cancel',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerInvitePreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may cancel supplier invites', 403);
      }

      const paramResult = inviteParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      // Empty body is allowed (cancel_reason is optional).
      const body = request.body ?? {};
      const bodyResult = cancelInviteBodySchema.safeParse(body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { poolId, rfqId, inviteId } = paramResult.data;
      const orgId  = dbContext.orgId;
      const userId = request.userId ?? null;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.cancelInvite(
          orgId,
          userId,
          poolId,
          rfqId,
          inviteId,
          bodyResult.data.cancel_reason,
        );
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapSupplierInviteServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.invite.cancel');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to cancel supplier invite', 500);
      }
    },
  );
};

export default poolRfqRoutes;
