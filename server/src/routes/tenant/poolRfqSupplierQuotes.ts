import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { ncPoolSupplierQuoteFeatureGateMiddleware } from '../../middleware/ncPoolSupplierQuoteFeatureGate.middleware.js';
import { prisma } from '../../db/prisma.js';
import { sendError, sendSuccess, sendValidationError } from '../../utils/response.js';
import { isOrgVerificationBlocked } from '../../utils/orgVerificationGuard.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import {
  NetworkPoolRfqService,
  NetworkPoolRfqSupplierInviteNotFoundError,
  NetworkPoolRfqSupplierQuoteNotFoundError,
  NetworkPoolRfqSupplierQuoteConflictError,
  NetworkPoolRfqSupplierQuoteInviteNotAcceptedError,
  NetworkPoolRfqSupplierQuoteInvalidInputError,
} from '../../services/networkPoolRfq.service.js';

const inviteIdParamSchema = z.object({
  inviteId: z.string().uuid('inviteId must be a valid UUID'),
});

// QD-5: forbidden fields are never accepted as input.
// QD-2: no re-submission fields (status, quote_ref) accepted.
const submitQuoteBodySchema = z
  .object({
    quote_amount: z.union([
      z
        .string()
        .min(1, 'quote_amount must be non-empty')
        .regex(/^\d+(\.\d+)?$/, 'quote_amount must be a positive decimal'),
      z.number().positive('quote_amount must be positive'),
    ]),
    currency: z.string().min(3, 'currency min 3 chars').max(10, 'currency max 10 chars'),
    validity_until: z
      .string()
      .datetime({ message: 'validity_until must be an ISO datetime' })
      .nullable()
      .optional(),
    supplier_note: z
      .string()
      .max(5000, 'supplier_note max 5000 chars')
      .nullable()
      .optional(),
    request_id: z.string().max(255, 'request_id max 255 chars').nullable().optional(),
  })
  .strict();

function mapQuoteRouteError(reply: Parameters<typeof sendError>[0], err: unknown): boolean {
  // Non-leaking 404 for missing/wrong-supplier invite.
  if (err instanceof NetworkPoolRfqSupplierInviteNotFoundError) {
    sendError(reply, 'SUPPLIER_INVITE_NOT_FOUND', err.message, 404);
    return true;
  }
  // Missing or wrong-supplier quote.
  if (err instanceof NetworkPoolRfqSupplierQuoteNotFoundError) {
    sendError(reply, 'SUPPLIER_QUOTE_NOT_FOUND', err.message, 404);
    return true;
  }
  // QD-2: duplicate quote (one per invite).
  if (err instanceof NetworkPoolRfqSupplierQuoteConflictError) {
    sendError(reply, 'QUOTE_ALREADY_SUBMITTED', err.message, 409);
    return true;
  }
  // QD-1: invite not in ACCEPTED effective status.
  if (err instanceof NetworkPoolRfqSupplierQuoteInviteNotAcceptedError) {
    sendError(reply, 'INVITE_NOT_ACCEPTED', err.message, 422);
    return true;
  }
  // RFQ not in ISSUED/QUOTED state — invalid state for quote submission.
  if (err instanceof NetworkPoolRfqSupplierQuoteInvalidInputError) {
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

const poolRfqSupplierQuotesRoutes: FastifyPluginAsync = async fastify => {
  const stateMachine = new StateMachineService(prisma);
  const service = new NetworkPoolRfqService(prisma, stateMachine);

  // Quote gate only — no pool/RFQ/invite parent gates (QD-6 / FLAG-COLLISION-INVESTIGATION-001).
  const quoteGuards = [
    tenantAuthMiddleware,
    databaseContextMiddleware,
    ncPoolSupplierQuoteFeatureGateMiddleware,
  ] as const;

  // ─── GET /supplier-rfq-invites/:inviteId/quote ──────────────────────────────
  // Resolved: GET /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote
  // Q-8: supplier GET route for quote included in Phase 1C.
  fastify.get(
    '/supplier-rfq-invites/:inviteId/quote',
    { onRequest: [...quoteGuards] },
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
        const data = await service.getSupplierQuote(orgId, parsedParams.data.inviteId);
        return sendSuccess(reply, data, 200);
      } catch (err) {
        if (mapQuoteRouteError(reply, err)) return reply;
        request.log.error({ err }, 'supplier quote get failed');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to get supplier quote', 500);
      }
    },
  );

  // ─── POST /supplier-rfq-invites/:inviteId/quote ─────────────────────────────
  // Resolved: POST /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote
  // Returns 201 on success — new quote resource created (QD-2: one per invite).
  fastify.post(
    '/supplier-rfq-invites/:inviteId/quote',
    { onRequest: [...quoteGuards] },
    async (request, reply) => {
      const orgId = request.dbContext?.orgId;
      if (!orgId) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      if (await isOrgVerificationBlocked(orgId, reply)) return reply;

      const parsedParams = inviteIdParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return sendValidationError(reply, parsedParams.error.errors);
      }

      const parsedBody = submitQuoteBodySchema.safeParse(request.body ?? {});
      if (!parseStrictBody(reply, parsedBody)) {
        return reply;
      }

      try {
        const data = await service.submitQuote(
          orgId,
          request.userId ?? null,
          parsedParams.data.inviteId,
          {
            quote_amount: parsedBody.data.quote_amount,
            currency:     parsedBody.data.currency,
            validity_until: parsedBody.data.validity_until ?? null,
            supplier_note:  parsedBody.data.supplier_note ?? null,
            request_id:     parsedBody.data.request_id ?? null,
          },
        );
        return sendSuccess(reply, data, 201);
      } catch (err) {
        if (mapQuoteRouteError(reply, err)) return reply;
        request.log.error({ err }, 'supplier quote submit failed');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to submit supplier quote', 500);
      }
    },
  );
};

export default poolRfqSupplierQuotesRoutes;
