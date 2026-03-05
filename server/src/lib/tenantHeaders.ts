/**
 * G-026 — Shared Tenant Header Name Constants
 *
 * These constants define the header names used in the hybrid D1 routing model:
 *   Edge Middleware → Fastify backend
 *
 * Design Anchor §D7 (TECS 6C2).
 *
 * Edge injects:
 *   TENANT_ID_HEADER    — resolved tenant UUID
 *   TENANT_SLUG_HEADER  — resolved tenant slug (informational)
 *   TENANT_SOURCE_HEADER — resolution path (subdomain | custom_domain | fallback)
 *   RESOLVER_SIG_HEADER — HMAC-SHA256 over "edge:{host}:{tenantId}:{ts}"
 *   RESOLVER_TS_HEADER  — Unix epoch seconds (integer string)
 *
 * These constants are used by:
 *   - server/src/hooks/tenantResolutionHook.ts (Fastify validation)
 *   - middleware.ts (Vercel Edge injection)
 *
 * Security note: Never trust these headers without validating RESOLVER_SIG_HEADER.
 */

// ─── Header Names ─────────────────────────────────────────────────────────────

/** Resolved tenant UUID, injected by Edge Middleware. */
export const TENANT_ID_HEADER = 'x-texqtic-tenant-id' as const;

/** Resolved tenant slug, injected by Edge Middleware. */
export const TENANT_SLUG_HEADER = 'x-texqtic-tenant-slug' as const;

/** Resolution source: 'subdomain' | 'custom_domain' | 'fallback'. */
export const TENANT_SOURCE_HEADER = 'x-texqtic-tenant-source' as const;

/** HMAC-SHA256 signature over the canonical "edge:" string (Edge-signed). */
export const RESOLVER_SIG_HEADER = 'x-texqtic-resolver-sig' as const;

/** Unix epoch seconds used in the HMAC canonical string. */
export const RESOLVER_TS_HEADER = 'x-texqtic-resolver-ts' as const;

// ─── Canonical String Helpers ─────────────────────────────────────────────────

/**
 * The canonical message that Edge signs and Fastify verifies.
 *
 * Format: "edge:{normalizedHost}:{tenantId}:{ts}"
 * ts is Unix epoch SECONDS (integer).
 */
export function edgeCanonicalMessage(host: string, tenantId: string, tsSeconds: number): string {
  return `edge:${host}:${tenantId}:${tsSeconds}`;
}

// ─── Security Constants ───────────────────────────────────────────────────────

/** Replay-protection window for Edge→Backend header validation (30 seconds). */
export const EDGE_REPLAY_WINDOW_MS = 30_000;
