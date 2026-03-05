/**
 * G-026 TECS 6C3 — Internal Cache Invalidation Webhook
 *
 * POST /api/internal/cache-invalidate
 *
 * Signals that one or more host-to-tenant resolution cache entries are stale
 * and should be evicted on the next request. Called by:
 *
 *   - Domain CRUD emitters (TECS 6D, when tenant_domains routes are added)
 *   - Manual ops tooling
 *
 * Governance: GOVERNANCE-SYNC-092
 * Design Anchor §D5 (Edge in-memory TTL cache + webhook invalidation)
 *
 * ─── Auth model (HMAC-only, no JWT) ─────────────────────────────────────────
 *
 *   Headers required:
 *     x-texqtic-resolver-ts    — Unix epoch milliseconds (string)
 *     x-texqtic-resolver-hmac  — hex HMAC-SHA256 of canonical string
 *
 *   Canonical string:
 *     "invalidate:" + tsMs + ":" + sha256Hex(canonicalBodyJson)
 *
 *   canonicalBodyJson:
 *     JSON.stringify({ hosts, reason [, requestId] }) with keys in that order.
 *
 *   Replay window: 30 000 ms (same as resolver endpoint).
 *   Secret: TEXQTIC_RESOLVER_SECRET env var (≥ 32 chars).
 *
 * ─── Body contract ───────────────────────────────────────────────────────────
 *
 *   {
 *     "hosts":     string[]  1..100 items, each max 255 chars
 *     "reason":    "domain_crud" | "tenant_status_change" | "manual"
 *     "requestId": string (optional, for idempotency logging)
 *   }
 *
 * ─── Response ────────────────────────────────────────────────────────────────
 *
 *   200  { "status": "ok", "invalidated": <n> }   — n = hosts processed
 *   400  (body validation failed)
 *   401  (auth failed / replay)
 *
 * ─── Edge invalidation scope ─────────────────────────────────────────────────
 *
 *   This webhook runs in the Fastify Node.js serverless function.
 *   The Edge middleware (middleware.ts) runs in separate Vercel Edge Runtime
 *   V8 isolates — one per region and per instance. There is NO shared memory
 *   between Node.js serverless and Edge isolates.
 *
 *   Effect: All Edge instances will naturally expire stale cache within 60 s
 *   (TTL=60s, §D5). This webhook's primary purpose is to:
 *     a) Trigger invalidation in the SAME serverless instance's resolver cache
 *        (not currently used — resolver is stateless per request).
 *     b) Serve as the authoritative signal contract that TECS 6D domain CRUD
 *        emitters will call.
 *     c) Provide an audit-traceable invalidation op (reason + requestId).
 *
 *   Best-effort note: Documented in GOVERNANCE-SYNC-092 and wave-execution-log.
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createHash } from 'crypto';
import { verifyInvalidateHmac } from '../../lib/resolverHmac.js';
import { config } from '../../config/index.js';
import { normalizeHost } from '../../lib/hostNormalize.js';

// ─── Body schema ─────────────────────────────────────────────────────────────

const VALID_REASONS = ['domain_crud', 'tenant_status_change', 'manual'] as const;
type InvalidationReason = typeof VALID_REASONS[number];

const bodySchema = z.object({
  hosts: z
    .array(z.string().min(1).max(255))
    .min(1, 'At least one host required')
    .max(100, 'Maximum 100 hosts per request'),
  reason: z.enum(VALID_REASONS),
  requestId: z.string().max(128).optional(),
});

// ─── Canonical body serialization ─────────────────────────────────────────────
// Key order must match exactly what callers should sign.

function canonicalBody(
  hosts: string[],
  reason: InvalidationReason,
  requestId?: string,
): string {
  const obj: { hosts: string[]; reason: InvalidationReason; requestId?: string } = {
    hosts,
    reason,
  };
  if (requestId !== undefined) obj.requestId = requestId;
  return JSON.stringify(obj);
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

// ─── Route handler ────────────────────────────────────────────────────────────

async function handleCacheInvalidate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const secret = config.TEXQTIC_RESOLVER_SECRET;

  // 1. Parse and validate body first (needed to compute body hash for HMAC).
  const bodyParse = bodySchema.safeParse(request.body);
  if (!bodyParse.success) {
    return void reply.status(400).send({
      status: 'error',
      code: 'INVALID_BODY',
      issues: bodyParse.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  const { hosts, reason, requestId } = bodyParse.data;

  // 2. Compute canonical body hash for HMAC verification.
  const bodyJson = canonicalBody(hosts, reason, requestId);
  const bodyHash = sha256Hex(bodyJson);

  // 3. Verify HMAC.
  const hmacHeader = request.headers['x-texqtic-resolver-hmac'] as string | undefined;
  const tsHeader = request.headers['x-texqtic-resolver-ts'] as string | undefined;

  const hmacResult = verifyInvalidateHmac(hmacHeader, tsHeader, bodyHash, secret);
  if (!hmacResult.valid) {
    request.log.warn({ reason: hmacResult.reason }, 'cache-invalidate: HMAC auth failed');
    // Identical opaque response for all auth failures (no oracle behaviour).
    return void reply.status(401).send();
  }

  // 4. Normalize each host and count valid ones.
  //    Invalid host strings (bare IP, malformed) are silently skipped.
  const normalizedHosts: string[] = [];
  for (const rawHost of hosts) {
    const result = normalizeHost(rawHost);
    if (result.ok) normalizedHosts.push(result.host);
  }

  // 5. Log invalidation event (no secret data, no host DB lookup).
  request.log.info(
    {
      invalidated: normalizedHosts.length,
      reason,
      requestId: requestId ?? null,
    },
    'cache-invalidate: invalidation request processed',
  );

  // 6. Respond.
  //    Edge invalidation is TTL-bounded (60s max). Best-effort note documented
  //    in GOVERNANCE-SYNC-092. The webhook's primary role is emitter contract
  //    (TECS 6D) and audit trail.
  return void reply.status(200).send({
    status: 'ok',
    invalidated: normalizedHosts.length,
  });
}

// ─── Plugin registration ──────────────────────────────────────────────────────

const cacheInvalidateRoutes: FastifyPluginAsync = async fastify => {
  fastify.post(
    '/cache-invalidate',
    {
      schema: {
        // Minimal schema for Fastify's logger — full validation is done in handler.
        body: {
          type: 'object',
        },
      },
    },
    handleCacheInvalidate,
  );
};

export default cacheInvalidateRoutes;
