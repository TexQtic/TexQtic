/**
 * Database Context Library — Gate B.1
 *
 * Constitutional RLS enforcement via transaction-local context.
 *
 * CRITICAL DOCTRINE CONSTRAINTS:
 * - Sets ONLY app.org_id (canonical tenant boundary)
 * - NEVER sets app.tenant_id (forbidden by Section 11.3)
 * - Uses transaction-local SET LOCAL (pooler-safe)
 * - Fail-closed: throws on missing context (no silent failures)
 * - Test-only bypass: NODE_ENV=test guard + triple-gate
 */

import type { FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

/**
 * DatabaseContext — 6-field canonical context model
 *
 * Source: DECISION-0001 Section 3 (Context Model)
 */
export interface DatabaseContext {
  /** Organization UUID (tenant boundary) - extracted from JWT orgId/tenantId */
  orgId: string;

  /** Actor UUID (user/service identity) - extracted from JWT sub/userId */
  actorId: string;

  /** Execution realm - derived from route prefix */
  realm: 'tenant' | 'control';

  /** Request trace UUID - generated per-request */
  requestId: string;

  /** Optional auth level metadata (future RBAC) */
  authLevel?: string;

  /** Optional role array (future RBAC) */
  roles?: string[];
}

/**
 * buildContextFromRequest — Extract context from authenticated request
 *
 * Extraction Strategy:
 * - orgId: req.tenantId (decorated by auth middleware) OR req.user.tenantId/orgId
 * - actorId: req.userId (decorated) OR req.user.sub/userId
 * - realm: route prefix detection (/api/control/* → control, else → tenant)
 * - requestId: crypto.randomUUID() (Node 22 built-in)
 *
 * FAIL-CLOSED: Throws error on missing required fields
 *
 * @param req - Authenticated Fastify request with JWT claims
 * @returns Complete DatabaseContext (validated)
 * @throws Error if required claims missing (orgId, actorId)
 */
export function buildContextFromRequest(req: FastifyRequest): DatabaseContext {
  // Extract JWT payload (populated by auth middleware)
  const user = req.user as any;

  // Extract orgId (tenant boundary)
  // Priority: decorated property > JWT claim
  const orgId = req.tenantId || user?.tenantId || user?.orgId;

  // Extract actorId (user identity)
  // Priority: decorated property > JWT sub > JWT userId
  const actorId = req.userId || user?.sub || user?.userId;

  // Fail-closed validation
  if (!orgId || typeof orgId !== 'string') {
    throw new Error(
      'Database context missing orgId (tenant boundary). ' +
        'Request must include authenticated tenant identifier. ' +
        'This is a fail-closed enforcement — no silent fallback.'
    );
  }

  if (!actorId || typeof actorId !== 'string') {
    throw new Error(
      'Database context missing actorId (user identity). ' +
        'Request must include authenticated user identifier. ' +
        'This is a fail-closed enforcement — no silent fallback.'
    );
  }

  // Determine realm from route prefix
  // Control plane: /api/control/*
  // Tenant plane: everything else (default)
  const path = req.url || req.routeOptions?.url || '';
  const realm: 'tenant' | 'control' = path.startsWith('/api/control') ? 'control' : 'tenant';

  // Generate request trace ID
  const requestId = randomUUID();

  return {
    orgId,
    actorId,
    realm,
    requestId,
  };
}

/**
 * withDbContext — Execute database operations with RLS context
 *
 * Execution Strategy:
 * 1. Validate context completeness (fail-fast)
 * 2. Open Prisma transaction
 * 3. Execute SET LOCAL statements (transaction-scoped, pooler-safe)
 * 4. Run user callback with transaction client
 * 5. Auto-clear context on transaction end (SET LOCAL semantics)
 *
 * CONSTITUTIONAL CONSTRAINT (Section 11.3):
 * - Sets ONLY app.org_id (canonical tenant boundary)
 * - NEVER sets app.tenant_id (legacy variable, forbidden)
 *
 * POOLER-SAFE (Section 4.4):
 * - Uses set_config(key, value, true) — true = transaction-local
 * - Context auto-clears when transaction commits/rolls back
 * - No connection state pollution
 *
 * @param prisma - Prisma client instance
 * @param context - Complete database context (from buildContextFromRequest)
 * @param callback - Async operation requiring RLS context
 * @returns Result from callback
 * @throws Error on context validation failure or callback error
 */
export async function withDbContext<T>(
  prisma: PrismaClient,
  context: DatabaseContext,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  // Validate context completeness (fail-fast)
  if (!context.orgId) {
    throw new Error('Invalid context: orgId required');
  }
  if (!context.actorId) {
    throw new Error('Invalid context: actorId required');
  }
  if (!context.realm) {
    throw new Error('Invalid context: realm required');
  }
  if (!context.requestId) {
    throw new Error('Invalid context: requestId required');
  }

  // Execute in transaction with context
  return prisma.$transaction(async tx => {
    // GATE C.3 HARDENING: Use texqtic_app role (NOBYPASSRLS)
    // DATABASE_URL currently connects as postgres (BYPASSRLS=true) due to Supabase pooler constraints
    // SET LOCAL ROLE switches to texqtic_app (BYPASSRLS=false) for this transaction only
    // Transaction scope ensures automatic revert (pooler-safe)
    //
    // ROADMAP: When DATABASE_URL is migrated to use texqtic_app directly, remove this line
    // See: server/prisma/verify-texqtic-app-role.ts for role verification
    await tx.$executeRawUnsafe(`SET LOCAL ROLE texqtic_app`);

    // CONSTITUTIONAL ENFORCEMENT: Set ONLY app.org_id (never app.tenant_id)
    await tx.$executeRawUnsafe(`SELECT set_config('app.org_id', $1, true)`, context.orgId);

    // Set actor context
    await tx.$executeRawUnsafe(`SELECT set_config('app.actor_id', $1, true)`, context.actorId);

    // Set realm context
    await tx.$executeRawUnsafe(`SELECT set_config('app.realm', $1, true)`, context.realm);

    // Set request trace ID
    await tx.$executeRawUnsafe(`SELECT set_config('app.request_id', $1, true)`, context.requestId);

    // Explicitly disable bypass (enforce RLS)
    await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'off', true)`);

    // Optional: Set roles if provided
    if (context.roles && context.roles.length > 0) {
      const rolesCsv = context.roles.join(',');
      await tx.$executeRawUnsafe(`SELECT set_config('app.roles', $1, true)`, rolesCsv);
    }

    // Run user callback with transaction client
    return callback(tx);
  });
}

/**
 * withBypassForSeed — Test-only RLS bypass for seed operations
 *
 * CONSTITUTIONAL CONSTRAINTS (Section 6.3):
 * - ONLY allowed in NODE_ENV=test (enforced via guard)
 * - ONLY for seed/cleanup operations (documented intent)
 * - NEVER in production (throws error + exits)
 *
 * Triple-Gate Bypass:
 * - app.bypass_rls = 'on'
 * - app.realm = 'test'
 * - app.roles = 'TEST_SEED'
 *
 * Enforced by policy:
 * (current_setting('app.bypass_rls') = 'on'
 *  AND current_setting('app.realm') IN ('test', 'service')
 *  AND app.has_role('TEST_SEED'))
 *
 * OPERATIONAL ALERT:
 * - Logs warning to console (visible in test output)
 * - Makes bypass explicit and auditable
 *
 * @param prisma - Prisma client instance
 * @param callback - Async seed operation
 * @returns Result from callback
 * @throws Error if NODE_ENV !== 'test' (production safety)
 */
export async function withBypassForSeed<T>(
  prisma: PrismaClient,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  // CRITICAL: Production safety guard
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'withBypassForSeed() is ONLY allowed in test environment. ' +
        'NODE_ENV must be "test". This is a constitutional enforcement. ' +
        'Production bypass attempts are FORBIDDEN.'
    );
  }

  // Operational visibility
  console.warn(
    '⚠️  RLS bypass enabled (test mode) — triple-gate activated: ' +
      'bypass_rls=on + realm=test + roles=TEST_SEED'
  );

  // Execute in transaction with bypass context
  return prisma.$transaction(async tx => {
    // Triple-gate bypass context (Section 6.3)
    await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'on', true)`);

    await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'test', true)`);

    await tx.$executeRawUnsafe(`SELECT set_config('app.roles', 'TEST_SEED', true)`);

    // Run seed operation
    return callback(tx);
  });
}
