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
  realm: 'tenant' | 'control' | 'admin';

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

  // Retry configuration for transient transaction acquisition failures
  const maxRetries = 4;
  const baseDelayMs = 200;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute in transaction with bypass context
      return await prisma.$transaction(async tx => {
        // Triple-gate bypass context (Section 6.3)
        await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'on', true)`);

        await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'test', true)`);

        await tx.$executeRawUnsafe(`SELECT set_config('app.roles', 'TEST_SEED', true)`);

        // Run seed operation
        return callback(tx);
      });
    } catch (error: any) {
      lastError = error;

      // Only retry on transient transaction acquisition errors
      const isTransientError =
        error?.code === 'P2028' || // Unable to start transaction
        error?.message?.includes('Transaction not found') ||
        error?.message?.includes('Unable to start a transaction');

      if (!isTransientError || attempt === maxRetries) {
        // Non-transient error or final attempt: fail immediately
        throw error;
      }

      // Calculate exponential backoff with cap
      const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt), 1500);
      console.warn(
        `⚠️  [withBypassForSeed] Transaction acquisition failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
          `retrying in ${delayMs}ms... (${error.code || 'unknown'})`
      );

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Should never reach here due to throw in loop, but TypeScript needs this
  throw lastError;
}

/**
 * ProjectorBypassContext — Explicit context for projector bypass authorization
 *
 * PRODUCTION-SAFE BYPASS:
 * - realm: 'system' (distinguishes from tenant/control operations)
 * - role: 'PROJECTOR' (explicit authorization for projection writes)
 *
 * This context type enforces compile-time contract that projector bypass
 * is ONLY used for system projection operations, not arbitrary writes.
 */
export interface ProjectorBypassContext {
  realm: 'system';
  role: 'PROJECTOR';
}

/**
 * withBypassForProjector — Production-safe RLS bypass for projection writes
 *
 * CONSTITUTIONAL CONSTRAINTS (Gate D.6):
 * - ONLY for system projector execution (event-driven projection handlers)
 * - NEVER for tenant or admin operations
 * - Requires explicit context parameter (compile-time safety)
 *
 * Bypass Authorization:
 * - app.projector_bypass = 'on'
 * - app.realm = 'system'
 * - app.roles = 'PROJECTOR'
 *
 * Enforced by projector_bypass_enabled() SQL function:
 * (current_setting('app.projector_bypass') = 'on'
 *  AND current_setting('app.realm') = 'system'
 *  AND app.has_role('PROJECTOR'))
 *
 * USE CASE:
 * Projection tables (e.g., marketplace_cart_summaries) are written by event
 * handlers running in system context, OUTSIDE tenant request boundaries.
 * RLS policies enforce tenant isolation on reads, but projector writes
 * need bypass to populate rows for all tenants.
 *
 * OPERATIONAL ALERT:
 * - Logs info message (projector execution is expected, not exceptional)
 * - Makes bypass explicit and auditable in production logs
 *
 * @param prisma - Prisma client instance
 * @param context - Explicit projector bypass context (must be { realm: 'system', role: 'PROJECTOR' })
 * @param callback - Async projection write operation
 * @returns Result from callback
 * @throws Error if context is invalid (production safety)
 */
export async function withBypassForProjector<T>(
  prisma: PrismaClient,
  context: ProjectorBypassContext,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  // RUNTIME GUARD: reject a Prisma.TransactionClient being passed as PrismaClient.
  // TypeScript's `as PrismaClient` cast does NOT change the runtime object — a
  // TransactionClient passed here silently lacks $transaction, causing a confusing
  // "prisma.$transaction is not a function" error deep inside this function.
  // Fail loudly with a clear message so callers are immediately directed to the fix.
  if (typeof (prisma as unknown as Record<string, unknown>)['$transaction'] !== 'function') {
    throw new Error(
      '[withBypassForProjector] Received a Prisma.TransactionClient instead of a full PrismaClient. ' +
        'The projector bypass requires a real PrismaClient with $transaction(). ' +
        'Always pass the module-level prismaSingleton — never the `tx` argument from an outer transaction.'
    );
  }

  // CRITICAL: Validate explicit authorization context
  if (context.realm !== 'system') {
    throw new Error(
      'Projector bypass requires realm="system". ' +
        'This bypass is production-safe ONLY for system projector execution. ' +
        'Attempted realm: ' +
        context.realm
    );
  }

  if (context.role !== 'PROJECTOR') {
    throw new Error(
      'Projector bypass requires role="PROJECTOR". ' +
        'This enforces explicit authorization for projection writes. ' +
        'Attempted role: ' +
        context.role
    );
  }

  // Operational visibility (info, not warning — projector bypass is expected)
  console.info(
    '🔧 RLS bypass enabled (projector mode) — authorization: ' +
      'projector_bypass=on + realm=system + role=PROJECTOR'
  );

  // Execute in transaction with projector bypass context
  return prisma.$transaction(async tx => {
    // Projector bypass context (Gate D.6)
    await tx.$executeRawUnsafe(`SELECT set_config('app.projector_bypass', 'on', true)`);

    await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'system', true)`);

    await tx.$executeRawUnsafe(`SELECT set_config('app.roles', 'PROJECTOR', true)`);

    // Run projection operation
    return callback(tx);
  });
}

/**
 * withNoContext — Test-only helper for fail-closed testing
 *
 * Purpose: Test that RLS blocks operations when NO context or bypass is provided
 *
 * Use ONLY in test fail-closed scenarios to verify:
 * - Operations fail when context is missing
 * - Restrictive guard policies block access
 * - Constitutional fail-closed behavior works
 *
 * Implementation:
 * - Sets LOCAL ROLE to texqtic_app (triggers RLS, NO BYPASSRLS)
 * - Does NOT set any GUCs (no context, no bypass)
 * - Operations should be blocked by restrictive guard policies
 *
 * @param prisma - Prisma client instance
 * @param callback - Operation to test (should fail/return empty)
 * @returns Result from callback (typically empty or error)
 */
export async function withNoContext<T>(
  prisma: PrismaClient,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async tx => {
    // Set role to texqtic_app (NO BYPASSRLS) to trigger RLS
    await tx.$executeRawUnsafe(`SET LOCAL ROLE texqtic_app`);

    // NO GUCs set - context is completely empty
    // app.org_id = not set (NULL)
    // app.bypass_rls = not set
    // app.projector_bypass = not set
    // app.realm = not set
    // app.roles = not set

    // Restrictive guard policies should block all operations
    return callback(tx);
  });
}
