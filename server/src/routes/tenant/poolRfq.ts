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
import { ncPoolRfqAwardFeatureGateMiddleware } from '../../middleware/ncPoolRfqAwardFeatureGate.middleware.js';
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
  NetworkPoolRfqOwnerQuoteNotFoundError,
  NetworkPoolRfqSupplierQuoteNotInSubmittedError,
  NetworkPoolRfqAwardRequestAlreadyPendingError,
  NetworkPoolRfqApprovalNotFoundError,
  NetworkPoolRfqApprovalAlreadyDecidedError,
  NetworkPoolRfqApprovalExpiredError,
  NetworkPoolRfqMakerCheckerSameActorError,
  NetworkPoolRfqQuoteNoLongerSubmittedError,
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

const rfqQuoteParamSchema = z.object({
  poolId:  z.string().uuid('poolId must be a valid UUID'),
  rfqId:   z.string().uuid('rfqId must be a valid UUID'),
  quoteId: z.string().uuid('quoteId must be a valid UUID'),
});

const approvalParamSchema = z.object({
  poolId:     uuidSchema,
  rfqId:      uuidSchema,
  approvalId: uuidSchema,
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

// POST accept quote body — strict.
const acceptQuoteBodySchema = z
  .object({
    request_id: z.string().max(255, 'request_id max 255 chars').nullable().optional(),
  })
  .strict();

// POST reject quote body — strict.
const rejectQuoteBodySchema = z
  .object({
    reject_reason: z.string().max(5000, 'reject_reason max 5000 chars').nullable().optional(),
    request_id:    z.string().max(255, 'request_id max 255 chars').nullable().optional(),
  })
  .strict();

// POST award-request body — strict. MC-021: maker requests award approval.
const requestAwardBodySchema = z
  .object({
    request_reason: z.string().max(5000, 'request_reason max 5000 chars'),
    request_id:     z.string().max(255, 'request_id max 255 chars').nullable().optional(),
  })
  .strict();

// POST approve award body — strict. MC-021: checker approves award.
const approveAwardBodySchema = z
  .object({
    approve_reason: z.string().max(5000, 'approve_reason max 5000 chars'),
    request_id:     z.string().max(255, 'request_id max 255 chars').nullable().optional(),
  })
  .strict();

// POST reject award approval body — strict. MC-021: checker rejects award.
const rejectAwardApprovalBodySchema = z
  .object({
    reject_reason: z.string().max(5000, 'reject_reason max 5000 chars'),
    request_id:    z.string().max(255, 'request_id max 255 chars').nullable().optional(),
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

// ─── Award Error Mapper ─────────────────────────────────────────────────────
//
// Maps owner quote award service errors to HTTP responses.
// Called by all 3 owner award routes.

function mapAwardRouteError(
  reply: Parameters<typeof sendError>[0],
  err: unknown,
): boolean {
  if (err instanceof NetworkPoolRfqPoolNotFoundError) {
    sendError(reply, 'POOL_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolRfqInvalidPoolStateError) {
    sendError(reply, 'INVALID_STATE', err.message, 422);
    return true;
  }
  if (err instanceof NetworkPoolRfqRfqNotFoundError) {
    sendError(reply, 'RFQ_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolRfqTransitionDeniedError) {
    sendError(reply, 'INVALID_TRANSITION', err.message, 422);
    return true;
  }
  if (err instanceof NetworkPoolRfqOwnerQuoteNotFoundError) {
    sendError(reply, 'QUOTE_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolRfqSupplierQuoteNotInSubmittedError) {
    sendError(reply, 'INVALID_TRANSITION', err.message, 422);
    return true;
  }
  if (err instanceof NetworkPoolRfqConflictError) {
    sendError(reply, 'CONFLICT', err.message, 409);
    return true;
  }
  return false;
}

// ─── Maker-Checker Error Mapper ──────────────────────────────────────────────
//
// Maps MC award service errors to HTTP responses.
// Called by all 4 MC award routes (award-request, approve, reject, list).

function mapMakerCheckerError(
  reply: Parameters<typeof sendError>[0],
  err: unknown,
): boolean {
  if (err instanceof NetworkPoolRfqAwardRequestAlreadyPendingError) {
    sendError(reply, 'AWARD_REQUEST_ALREADY_PENDING', err.message, 409);
    return true;
  }
  if (err instanceof NetworkPoolRfqApprovalNotFoundError) {
    sendError(reply, 'APPROVAL_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof NetworkPoolRfqApprovalAlreadyDecidedError) {
    sendError(reply, 'APPROVAL_ALREADY_DECIDED', err.message, 409);
    return true;
  }
  if (err instanceof NetworkPoolRfqApprovalExpiredError) {
    sendError(reply, 'APPROVAL_EXPIRED', err.message, 409);
    return true;
  }
  if (err instanceof NetworkPoolRfqMakerCheckerSameActorError) {
    sendError(reply, 'MAKER_CHECKER_SAME_ACTOR', err.message, 409);
    return true;
  }
  if (err instanceof NetworkPoolRfqQuoteNoLongerSubmittedError) {
    sendError(reply, 'QUOTE_NO_LONGER_SUBMITTED', err.message, 409);
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

  // ─── Owner Award Routes ───────────────────────────────────────────────────
  //
  // QD-6 / AWARD-ROUTE-001: All three owner award routes require the full 3-gate chain:
  //   ncPoolFeatureGateMiddleware → ncPoolRfqFeatureGateMiddleware
  //   → ncPoolRfqAwardFeatureGateMiddleware
  //
  // Role gate: OWNER + ADMIN only; MEMBER → 403.
  // D-017-A: orgId always from request.dbContext.orgId.
  //          userId always from request.userId.
  //          pool_id / rfq_id / quote_id from path params only.

  const ownerAwardPreHandler = [
    ncPoolFeatureGateMiddleware,
    ncPoolRfqFeatureGateMiddleware,
    ncPoolRfqAwardFeatureGateMiddleware,
  ];

  // GET /:poolId/rfq/:rfqId/quotes — list all owner-facing supplier quotes for an RFQ
  //
  // No body. Returns array of NetworkPoolRfqSupplierQuoteOwnerRecord.
  // QD-8: RFQ direct update path (accepted_at, accepted_by_user_id) confirmed in service.
  fastify.get(
    '/:poolId/rfq/:rfqId/quotes',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerAwardPreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may list quotes', 403);
      }

      const paramResult = rfqParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const { poolId, rfqId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const records = await svc.listOwnerQuotes(orgId, poolId, rfqId);
        return sendSuccess(reply, records, 200);
      } catch (err) {
        if (mapAwardRouteError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.quote.list');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list quotes', 500);
      }
    },
  );

  // POST /:poolId/rfq/:rfqId/quotes/:quoteId/accept — accept a supplier quote
  //
  // Body (strict): request_id? (optional, nullable, max 255).
  // AD-1: mass-reject all other SUBMITTED quotes in the same transaction.
  // AD-4: pool transitions CLOSED_FOR_BIDS → QUOTED → ACCEPTED via SM.
  // Errors: POOL_NOT_FOUND(404), INVALID_STATE(422), RFQ_NOT_FOUND(404),
  //   INVALID_TRANSITION(422), QUOTE_NOT_FOUND(404), CONFLICT(409), INTERNAL_ERROR(500).
  fastify.post(
    '/:poolId/rfq/:rfqId/quotes/:quoteId/accept',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerAwardPreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may accept quotes', 403);
      }

      const paramResult = rfqQuoteParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const body = request.body ?? {};
      const bodyResult = acceptQuoteBodySchema.safeParse(body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { poolId, rfqId, quoteId } = paramResult.data;
      const orgId  = dbContext.orgId;
      const userId = request.userId ?? null;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.acceptQuote(orgId, userId, poolId, rfqId, quoteId, bodyResult.data);
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapAwardRouteError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.quote.accept');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to accept quote', 500);
      }
    },
  );

  // POST /:poolId/rfq/:rfqId/quotes/:quoteId/reject — reject a supplier quote
  //
  // Body (strict): reject_reason? (optional, nullable, max 5000), request_id? (optional, nullable, max 255).
  // AD-5: single-quote reject — no pool/RFQ state change.
  // Errors: POOL_NOT_FOUND(404), INVALID_STATE(422), RFQ_NOT_FOUND(404),
  //   INVALID_TRANSITION(422), QUOTE_NOT_FOUND(404), CONFLICT(409), INTERNAL_ERROR(500).
  fastify.post(
    '/:poolId/rfq/:rfqId/quotes/:quoteId/reject',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerAwardPreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may reject quotes', 403);
      }

      const paramResult = rfqQuoteParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const body = request.body ?? {};
      const bodyResult = rejectQuoteBodySchema.safeParse(body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { poolId, rfqId, quoteId } = paramResult.data;
      const orgId  = dbContext.orgId;
      const userId = request.userId ?? null;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.rejectQuote(orgId, userId, poolId, rfqId, quoteId, bodyResult.data);
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapAwardRouteError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.quote.reject');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to reject quote', 500);
      }
    },
  );

  // ─── Maker-Checker Award Routes ─────────────────────────────────────────────
  //
  // MC-021: 4 routes for the maker-checker award flow.
  //   POST /:poolId/rfq/:rfqId/quotes/:quoteId/award-request
  //   POST /:poolId/rfq/:rfqId/award-approvals/:approvalId/approve
  //   POST /:poolId/rfq/:rfqId/award-approvals/:approvalId/reject
  //   GET  /:poolId/rfq/:rfqId/award-approvals
  //
  // All 4 use ownerAwardPreHandler (3-gate chain).
  // D-017-A: orgId from request.dbContext.orgId; userId from request.userId.
  // Old /accept route preserved unchanged; NOT converted to maker-checker.
  // Feature flag nc.procurement_pools.rfq.award.enabled is absent/false in production
  // → all 4 routes fail closed (503 FEATURE_DISABLED) until explicitly enabled.

  // POST /:poolId/rfq/:rfqId/quotes/:quoteId/award-request — maker requests award
  //
  // Body (strict): request_reason (required, max 5000), request_id? (optional, nullable, max 255).
  // Returns 201 AwardApprovalRequest DTO (no frozenPayload / frozenPayloadHash).
  fastify.post(
    '/:poolId/rfq/:rfqId/quotes/:quoteId/award-request',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerAwardPreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may request an award', 403);
      }

      const paramResult = rfqQuoteParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const body = request.body ?? {};
      const bodyResult = requestAwardBodySchema.safeParse(body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { poolId, rfqId, quoteId } = paramResult.data;
      const orgId  = dbContext.orgId;
      const userId = request.userId;
      if (!userId) return sendError(reply, 'UNAUTHORIZED', 'User identity required for maker-checker actions', 401);

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.requestAward(orgId, userId, poolId, rfqId, quoteId, bodyResult.data);
        return sendSuccess(reply, record, 201);
      } catch (err) {
        if (mapMakerCheckerError(reply, err)) return;
        if (mapAwardRouteError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.award.request');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to request award approval', 500);
      }
    },
  );

  // POST /:poolId/rfq/:rfqId/award-approvals/:approvalId/approve — checker approves award
  //
  // Body (strict): approve_reason (required, max 5000), request_id? (optional, nullable, max 255).
  // poolId/rfqId validated in params; service validates hierarchy via frozen payload.
  // Returns 200 AwardApproved DTO { approval, quote }.
  fastify.post(
    '/:poolId/rfq/:rfqId/award-approvals/:approvalId/approve',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerAwardPreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may approve an award', 403);
      }

      const paramResult = approvalParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const body = request.body ?? {};
      const bodyResult = approveAwardBodySchema.safeParse(body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { approvalId } = paramResult.data;
      const orgId  = dbContext.orgId;
      const userId = request.userId;
      if (!userId) return sendError(reply, 'UNAUTHORIZED', 'User identity required for maker-checker actions', 401);

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.approveAward(orgId, userId, approvalId, bodyResult.data);
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapMakerCheckerError(reply, err)) return;
        if (mapAwardRouteError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.award.approve');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to approve award', 500);
      }
    },
  );

  // POST /:poolId/rfq/:rfqId/award-approvals/:approvalId/reject — checker rejects award
  //
  // Body (strict): reject_reason (required, max 5000), request_id? (optional, nullable, max 255).
  // poolId/rfqId validated in params; service validates hierarchy via frozen payload.
  // Returns 200 AwardRejected DTO { approval }.
  fastify.post(
    '/:poolId/rfq/:rfqId/award-approvals/:approvalId/reject',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerAwardPreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may reject an award', 403);
      }

      const paramResult = approvalParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const body = request.body ?? {};
      const bodyResult = rejectAwardApprovalBodySchema.safeParse(body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { approvalId } = paramResult.data;
      const orgId  = dbContext.orgId;
      const userId = request.userId;
      if (!userId) return sendError(reply, 'UNAUTHORIZED', 'User identity required for maker-checker actions', 401);

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const record = await svc.rejectAwardApproval(orgId, userId, approvalId, bodyResult.data);
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapMakerCheckerError(reply, err)) return;
        if (mapAwardRouteError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.award.reject');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to reject award approval', 500);
      }
    },
  );

  // GET /:poolId/rfq/:rfqId/award-approvals — list owner pending award approvals
  //
  // No body. Returns AwardApprovalRequest[] (no frozenPayload / frozenPayloadHash).
  fastify.get(
    '/:poolId/rfq/:rfqId/award-approvals',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: ownerAwardPreHandler,
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may list award approvals', 403);
      }

      const paramResult = rfqParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const { poolId, rfqId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkPoolRfqService(prisma, new StateMachineService(prisma, null, null));
        const records = await svc.getOwnerPendingAwardApprovals(orgId, poolId, rfqId);
        return sendSuccess(reply, records, 200);
      } catch (err) {
        if (mapMakerCheckerError(reply, err)) return;
        if (mapAwardRouteError(reply, err)) return;
        request.log.error(err, 'network-commerce.pool-rfq.award.list');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list award approvals', 500);
      }
    },
  );
};

export default poolRfqRoutes;
