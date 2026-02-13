/**
 * RLS Context Test Helpers — Gate C.1
 *
 * Creates DatabaseContext objects for testing RLS-enforced queries.
 *
 * DOCTRINE COMPLIANCE:
 * - Uses canonical 6-field context model (DECISION-0001 Section 3)
 * - Generates unique requestId per context (prevents interference)
 * - Defaults to 'tenant' realm (most common test case)
 * - Supports TEST_SEED role for bypass scenarios
 */

import { randomUUID } from 'node:crypto';
import type { DatabaseContext } from '../../lib/database-context.js';

/**
 * makeDbContext — Create test DatabaseContext
 *
 * Generates a complete DatabaseContext suitable for withDbContext() calls
 * in tests. Each call generates a unique requestId to prevent interference.
 *
 * @param options - Context configuration
 * @param options.orgId - Organization UUID (tenant boundary)
 * @param options.actorId - Actor UUID (user/service identity)
 * @param options.realm - Execution realm (default: 'tenant')
 * @param options.roles - Optional role array (e.g., ['TEST_SEED'])
 * @returns Complete DatabaseContext
 *
 * @example
 * ```typescript
 * // Simple tenant context
 * const ctxA = makeDbContext({
 *   orgId: ORG_A_ID,
 *   actorId: USER_A_ID
 * });
 *
 * // Control plane context
 * const ctxControl = makeDbContext({
 *   orgId: PLATFORM_ORG_ID,
 *   actorId: ADMIN_ID,
 *   realm: 'control'
 * });
 *
 * // Test seed context (for bypass scenarios)
 * const ctxSeed = makeDbContext({
 *   orgId: TEST_ORG_ID,
 *   actorId: TEST_USER_ID,
 *   roles: ['TEST_SEED']
 * });
 * ```
 */
export function makeDbContext(options: {
  orgId: string;
  actorId: string;
  realm?: 'tenant' | 'control';
  roles?: string[];
}): DatabaseContext {
  return {
    orgId: options.orgId,
    actorId: options.actorId,
    realm: options.realm ?? 'tenant',
    requestId: randomUUID(), // Unique per call
    roles: options.roles,
  };
}

/**
 * makeTestOrgId — Generate unique org ID for test isolation
 *
 * Creates a deterministic test org ID based on test name/run.
 * Use in beforeEach to ensure each test has its own org.
 *
 * @returns UUID v4
 *
 * @example
 * ```typescript
 * let orgId: string;
 * beforeEach(() => {
 *   orgId = makeTestOrgId();
 * });
 * ```
 */
export function makeTestOrgId(): string {
  return randomUUID();
}

/**
 * makeTestActorId — Generate unique actor ID for test isolation
 *
 * Creates a deterministic test actor ID based on test name/run.
 * Use in beforeEach to ensure each test has its own actor.
 *
 * @returns UUID v4
 *
 * @example
 * ```typescript
 * let actorId: string;
 * beforeEach(() => {
 *   actorId = makeTestActorId();
 * });
 * ```
 */
export function makeTestActorId(): string {
  return randomUUID();
}
