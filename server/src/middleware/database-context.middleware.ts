/**
 * Database Context Middleware — Gate B.1
 * 
 * Attaches validated database context to authenticated requests.
 * 
 * PLACEMENT: After JWT auth middleware, before route handlers
 * 
 * Flow:
 * 1. JWT middleware populates req.user + decorates req.userId/req.tenantId
 * 2. This middleware builds DatabaseContext from those claims
 * 3. Attaches req.dbContext for use in route handlers
 * 4. Returns 401 if context cannot be built (fail-closed)
 * 
 * DOCTRINE COMPLIANCE:
 * - Fail-closed: Missing context → 401 (no silent fallback)
 * - Uses buildContextFromRequest() (single source of truth)
 * - No inline extraction logic (maintains DRY)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { buildContextFromRequest } from '../lib/database-context.js';
import { sendUnauthorized } from '../utils/response.js';

/**
 * databaseContextMiddleware — Extract and attach DB context
 * 
 * Prerequisites:
 * - JWT middleware must run first (populates req.user)
 * - Auth middleware must run first (decorates req.userId/req.tenantId)
 * 
 * Success:
 * - Attaches req.dbContext (DatabaseContext)
 * - Request proceeds to route handler
 * 
 * Failure:
 * - Returns 401 Unauthorized
 * - Logs error for debugging
 * - Prevents route handler execution (fail-closed)
 * 
 * @param request - Authenticated Fastify request
 * @param reply - Fastify reply object
 */
export async function databaseContextMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Build context from JWT claims + request metadata
    const context = buildContextFromRequest(request);
    
    // Attach to request for route handler access
    request.dbContext = context;
    
    // Context successfully attached — proceed to route handler
  } catch (error) {
    // Context extraction failed (missing claims, invalid data)
    // Log for debugging (redact sensitive fields)
    console.error('Database context extraction failed:', {
      path: request.url,
      method: request.method,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Fail-closed: return 401 (no silent fallback, no database access)
    return sendUnauthorized(
      reply,
      'Missing or invalid authentication context for database access'
    );
  }
}
