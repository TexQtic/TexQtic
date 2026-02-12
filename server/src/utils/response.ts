import type { FastifyReply } from 'fastify';
import type { SuccessResponse, ErrorResponse, Warning } from '../types/index.js';

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode: number = 200
): FastifyReply {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };
  return reply.code(statusCode).send(response);
}

export function sendSuccessWithWarnings<T>(
  reply: FastifyReply,
  data: T,
  warnings: Warning[],
  statusCode: number = 200
): FastifyReply {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
  return reply.code(statusCode).send(response);
}

export function sendError(
  reply: FastifyReply,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: unknown
): FastifyReply {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return reply.code(statusCode).send(response);
}

export function sendUnauthorized(
  reply: FastifyReply,
  message: string = 'Unauthorized'
): FastifyReply {
  return sendError(reply, 'UNAUTHORIZED', message, 401);
}

export function sendForbidden(reply: FastifyReply, message: string = 'Forbidden'): FastifyReply {
  return sendError(reply, 'FORBIDDEN', message, 403);
}

export function sendNotFound(
  reply: FastifyReply,
  message: string = 'Resource not found'
): FastifyReply {
  return sendError(reply, 'NOT_FOUND', message, 404);
}

export function sendValidationError(reply: FastifyReply, details: unknown): FastifyReply {
  return sendError(reply, 'VALIDATION_ERROR', 'Validation failed', 400, details);
}

export function sendRateLimitExceeded(
  reply: FastifyReply,
  retryAfterSeconds: number,
  message: string = 'Too many requests'
): FastifyReply {
  reply.header('Retry-After', retryAfterSeconds.toString());
  return sendError(reply, 'RATE_LIMIT_EXCEEDED', message, 429);
}
