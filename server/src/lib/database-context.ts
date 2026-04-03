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

// ── G-006D: Login Context Helper ─────────────────────────────────────────────────────────────────
//
// RATIONALE:
// - During login the actor UUID is not yet known (authentication is not complete).
// - withDbContext fail-closes on missing actorId, so we supply a sentinel that is
//   clearly identifiable in audit logs as a login-flow placeholder, not a real user.
// - orgId = tenantId so RLS correctly scopes users/memberships to the target tenant.

/**
 * LOGIN_SENTINEL_ACTOR — placeholder actor UUID for pre-authentication login flows.
 *
 * During login the actor is not yet known (authentication has not completed).
 * This sentinel satisfies withDbContext's fail-closed actorId requirement while
 * keeping the audit trail honest: the DB context is scoped to the tenantId org
 * boundary, and the actor is identified as the login sentinel, not a real user UUID.
 *
 * DO NOT use this sentinel outside the withLoginContext flow.
 */
export const LOGIN_SENTINEL_ACTOR = '00000000-0000-0000-0000-000000000002';

/**
 * withLoginContext — Execute tenant auth DB operations with canonical RLS context.
 *
 * Used exclusively by the login auth path where the actor UUID is not yet known.
 * Sets orgId = tenantId so RLS policies correctly scope users/memberships to the
 * target tenant. Uses LOGIN_SENTINEL_ACTOR as the actorId placeholder.
 *
 * Replaces the legacy 2-arg withDbContext({ tenantId }, fn) pattern in auth.ts
 * (G-006D closure).
 *
 * @param prismaClient - Prisma client instance (module-level singleton)
 * @param tenantId - Target tenant UUID (= app.org_id boundary for RLS)
 * @param callback - Async DB operation (must use tx, not outer prisma)
 * @returns Result from callback
 */
export async function withLoginContext<T>(
  prismaClient: PrismaClient,
  tenantId: string,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const ctx: DatabaseContext = {
    orgId: tenantId,
    actorId: LOGIN_SENTINEL_ACTOR,
    realm: 'tenant',
    requestId: randomUUID(),
  };
  return withDbContext(prismaClient, ctx, callback);
}

// ── G-015 Phase C: Organization Identity Helper (Option C — admin-context read) ─────────────────
//
// RATIONALE:
// - public.organizations has a RESTRICTIVE guard that allows ONLY admin-realm or bypass reads.
// - Tenant-realm code CANNOT read organizations directly without an RLS policy change.
// - Option C: all org identity reads go through withOrgAdminContext (admin realm, app.is_admin=true).
// - NO RLS policy changes are made. The guard policy remains intact.
// - Tenant realm reads of organizations remain blocked by the guard policy.
//
// Mirrors the withAdminContext pattern established in control.ts (G-004).
//
// DOCTRINE COMPLIANCE:
// - Uses canonical withDbContext (texqtic_app role + tx-local SET LOCAL)
// - app.is_admin = 'true' enables the _admin_all policies that gate organizations SELECT
// - Sentinel orgId used so withDbContext does not fail-closed on orgId validation
// - requestId generated per call for trace auditability

const ORG_ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

/**
 * OrganizationNotFoundError — thrown by getOrganizationIdentity when org record is absent.
 *
 * Stop-loss: never returns null/undefined silently.
 * All callers must handle this error explicitly (no silent zero-row fallback).
 */
export class OrganizationNotFoundError extends Error {
  readonly code = 'ORGANIZATION_NOT_FOUND' as const;
  readonly orgId: string;

  constructor(orgId: string) {
    super(`[G-015] Organization not found: ${orgId}`);
    this.name = 'OrganizationNotFoundError';
    this.orgId = orgId;
  }
}

/**
 * OrganizationIdentity — minimal org identity shape for Phase C canonical reads.
 *
 * Only fields confirmed to exist in the organizations table are included.
 * Do NOT invent columns — schema.prisma is the authoritative source.
 */
export interface OrganizationIdentity {
  id: string;
  slug: string;
  legal_name: string;
  status: string;
  org_type: string;
  is_white_label: boolean;
  jurisdiction: string;
  registration_no: string | null;
  risk_score: number;
  plan: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * withOrgAdminContext — run a callback in admin realm to read the organizations table.
 *
 * CONSTITUTIONAL CONSTRAINT (G-015 Phase C / GAP-AUTH-ORG-RLS-REALM-001):
 * - The live RLS policy organizations_control_plane_select requires:
 *     app.current_realm() = 'admin'
 *   Therefore realm MUST be set to 'admin', not 'control'.
 *   Setting realm='control' causes 0 visible rows under texqtic_app (NOBYPASSRLS),
 *   which makes getOrganizationIdentity() throw OrganizationNotFoundError.
 * - app.is_admin = 'true' is also set in the callback below, but it is NOT currently
 *   evaluated by any live organizations RLS policy. It is retained for forward-compat.
 * - NO RLS policies are changed by this helper. The guard remains intact.
 * - Use ONLY for read operations on the organizations table.
 *
 * @param prismaClient - PrismaClient instance (module-level singleton)
 * @param callback - async operation (should only read organizations)
 * @returns Result from callback
 */
export async function withOrgAdminContext<T>(
  prismaClient: PrismaClient,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const ctx: DatabaseContext = {
    orgId: ORG_ADMIN_SENTINEL_ID,
    actorId: ORG_ADMIN_SENTINEL_ID,
    realm: 'admin',
    requestId: randomUUID(),
  };
  return withDbContext(prismaClient, ctx, async tx => {
    // Admin RLS bypass flag: checked by _admin_all policies on organizations
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
    return callback(tx);
  });
}

/**
 * getOrganizationIdentity — canonical org identity read via admin-context (G-015 Phase C).
 *
 * USAGE:
 * - Call this instead of prisma.tenant.findUnique() wherever org identity metadata
 *   (legal_name, slug, org_type, jurisdiction, status, plan) is needed.
 * - Uses withOrgAdminContext so the organizations RESTRICTIVE guard allows the SELECT.
 * - Safe to call from tenant-plane request handlers (admin elevation is scoped to this tx only).
 *
 * STOP-LOSS:
 * - Throws OrganizationNotFoundError if org is absent (never silent zero-row).
 * - Callers must handle OrganizationNotFoundError explicitly.
 *
 * @param orgId - UUID of the organization (= tenants.id per TexQtic schema: organizations.id FK tenants.id)
 * @param prismaClient - PrismaClient instance (module-level singleton)
 * @returns OrganizationIdentity record
 * @throws OrganizationNotFoundError if organization does not exist
 */
export async function getOrganizationIdentity(
  orgId: string,
  prismaClient: PrismaClient
): Promise<OrganizationIdentity> {
  return withOrgAdminContext(prismaClient, async tx => {
    const org = await tx.organizations.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        slug: true,
        legal_name: true,
        status: true,
        org_type: true,
        is_white_label: true,
        jurisdiction: true,
        registration_no: true,
        risk_score: true,
        plan: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (!org) {
      throw new OrganizationNotFoundError(orgId);
    }
    return org;
  });
}

// ── G-006C: Admin Context Helper ───────────────────────────────────────────────────────────────────
//
// RATIONALE:
// - Control-plane admin routes need cross-tenant RLS access (app.is_admin = 'true').
// - withDbContext fail-closes on missing orgId, so a sentinel is used.
// - This shadows / exports the local pattern established in control.ts (G-004)
//   so it can be consumed by any route without duplicating the helper.

/**
 * ADMIN_SENTINEL_ID — placeholder org/actor UUID for admin-realm operations.
 *
 * Admin operations are cross-tenant (no meaningful orgId). This sentinel
 * satisfies withDbContext's fail-closed orgId/actorId requirements.
 */
export const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

/**
 * withAdminContext — Execute DB operations in admin realm with RLS bypass.
 *
 * Sets app.is_admin = 'true' in the transaction-local GUC so that:
 * - admin_select RLS policies grant cross-tenant SELECT
 * - restrictive_guard admin arm passes
 *
 * Canonical replacement for the legacy 2-arg withDbContext({ isAdmin: true }, fn)
 * pattern in admin routes (G-006C closure).
 *
 * @param prismaClient - Prisma client instance (module-level singleton)
 * @param callback - Async DB operation (must use tx, not outer prisma)
 * @returns Result from callback
 */
export async function withAdminContext<T>(
  prismaClient: PrismaClient,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const ctx: DatabaseContext = {
    orgId:     ADMIN_SENTINEL_ID,
    actorId:   ADMIN_SENTINEL_ID,
    realm:     'control',
    requestId: randomUUID(),
  };
  return withDbContext(prismaClient, ctx, async tx => {
    // Admin RLS bypass flag: checked by admin_select policies and restrictive_guard admin arm
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
    return callback(tx);
  });
}

// ── OPS-SUPERADMIN-CAPABILITY-001: Superadmin Context Helper ─────────────────────────────────────
//
// RATIONALE:
// - Superadmin is a privilege tier above Platform Admin.
// - Runtime-distinguishable from Platform Admin via two transaction-local GUCs:
//     app.is_admin = 'true'      (shared with Platform Admin — no RLS changes needed)
//     app.is_superadmin = 'true' (superadmin-only; NOT set by withAdminContext)
// - withDbContext MUST NOT set/clear app.is_superadmin (left tx-local only).
// - withAdminContext MUST NOT set app.is_superadmin.
// - No RLS policies use app.is_superadmin yet (future wave).
// - No renaming of app.is_admin in this TECS.

/**
 * withSuperAdminContext — Execute DB operations in superadmin realm.
 *
 * Sets BOTH transaction-local GUCs:
 *   app.is_admin = 'true'       — satisfies existing admin_select policies
 *   app.is_superadmin = 'true'  — superadmin capability flag (future RLS use)
 *
 * Reuses ADMIN_SENTINEL_ID (no separate superadmin sentinel needed).
 * realm = 'control' (same plane as Platform Admin).
 *
 * CONSTRAINTS:
 * - withDbContext does NOT set/clear app.is_superadmin (tx-local only here)
 * - withAdminContext does NOT set app.is_superadmin
 * - No existing RLS policies are modified by this helper
 *
 * @param prismaClient - Prisma client instance (module-level singleton)
 * @param callback - Async DB operation (must use tx, not outer prisma)
 * @returns Result from callback
 */
export async function withSuperAdminContext<T>(
  prismaClient: PrismaClient,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const ctx: DatabaseContext = {
    orgId:     ADMIN_SENTINEL_ID,
    actorId:   ADMIN_SENTINEL_ID,
    realm:     'control',
    requestId: randomUUID(),
  };
  return withDbContext(prismaClient, ctx, async tx => {
    // Platform Admin flag (satisfies existing _admin_all RLS policies)
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
    // Superadmin capability flag (tx-local; no RLS policies use this yet)
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_superadmin', 'true', true)`);
    return callback(tx);
  });
}
