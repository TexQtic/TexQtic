/**
 * G-026 TECS 6D — Cache Invalidation Emitter (Direct Call)
 *
 * Provides `emitCacheInvalidate()` for use by tenant domain CRUD routes
 * (OPS-WLADMIN-DOMAINS-001). Replicates the normalization + logging logic of
 * POST /api/internal/cache-invalidate as a direct function call, avoiding an
 * HTTP round-trip within the same serverless instance.
 *
 * Design decision: direct call is permitted per TECS 6D instructions.
 * Edge TTL (60 s) drives actual cache eviction — this emitter provides the
 * audit trail and emitter contract.
 *
 * Governance: GOVERNANCE-SYNC-093
 */

import { normalizeHost } from './hostNormalize.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvalidationReason = 'domain_crud' | 'tenant_status_change' | 'manual';

/** Minimal logger interface compatible with Fastify's request.log */
export interface EmitterLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
}

// ─── Emitter ─────────────────────────────────────────────────────────────────

/**
 * Emit a cache invalidation for the given hosts.
 *
 * Mirrors steps 4-5 of the POST /api/internal/cache-invalidate handler:
 *   a) Normalize hosts (invalid host strings silently skipped)
 *   b) Log the invalidation event
 *
 * Edge invalidation is TTL-bounded (60 s). This call is best-effort — it
 * will not throw on normalization failures. Caller is responsible for
 * wrapping in try/catch if hard failure semantics are required.
 *
 * @param hosts      Raw host strings from domain CRUD (e.g. ["shop.example.com"])
 * @param reason     Invalidation reason for audit trail
 * @param log        Fastify request logger (request.log)
 * @param requestId  Optional idempotency key
 */
export function emitCacheInvalidate(
  hosts: string[],
  reason: InvalidationReason,
  log: EmitterLogger,
  requestId?: string,
): void {
  // Normalize each host — malformed entries are silently skipped.
  const normalizedHosts: string[] = [];
  for (const rawHost of hosts) {
    const result = normalizeHost(rawHost);
    if (result.ok) normalizedHosts.push(result.host);
  }

  log.info(
    {
      invalidated: normalizedHosts.length,
      reason,
      requestId: requestId ?? null,
      source: 'emitter:direct-call',
    },
    'cache-invalidate: emitter (direct call, TECS 6D)',
  );
}
