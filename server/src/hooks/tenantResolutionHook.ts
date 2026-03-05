/**
 * G-026 TECS 6C2 — Fastify Tenant Resolution Validation Hook
 *
 * Fastify `onRequest` hook that validates the `x-texqtic-tenant-id` and
 * accompanying HMAC headers injected by Vercel Edge Middleware.
 *
 * Purpose: Enforce the trust boundary between Edge (resolver) and Fastify
 * (backend). Without this hook, any caller could spoof `x-texqtic-tenant-id`
 * and obtain a domain-resolved tenant context without going through the Edge.
 *
 * Design Anchor §D7 (TECS 6C2 — backend validation side):
 *
 *   Trust model:
 *     1. Edge Middleware has already verified the host → tenant mapping.
 *     2. Edge signs the resolved tenant context with TEXQTIC_RESOLVER_SECRET.
 *     3. This hook re-verifies the signature before trusting the header.
 *     4. Invalid signature → 401 (no body, no detail).
 *
 *   Route exclusion:
 *     - /api/internal/* routes are excluded (they validate separately via HMAC).
 *
 *   Backward compatibility:
 *     - If x-texqtic-tenant-id is absent, hook is a no-op (JWT path unchanged).
 *     - No changes to withDbContext or tenantAuthMiddleware.
 *
 *   FastifyRequest augmentation:
 *     - resolvedTenantId?: string  — set when Edge-injected headers are valid.
 *     - tenantSource?: string      — 'subdomain' | 'custom_domain' | 'fallback'.
 *
 * Canonical message verified: "edge:{normalizedHost}:{tenantId}:{tsSeconds}"
 * Secret: process.env.TEXQTIC_RESOLVER_SECRET (min 32 chars, same as Edge).
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/index.js';
import { normalizeHost } from '../lib/hostNormalize.js';
import {
  TENANT_ID_HEADER,
  TENANT_SLUG_HEADER,
  TENANT_SOURCE_HEADER,
  RESOLVER_SIG_HEADER,
  RESOLVER_TS_HEADER,
  edgeCanonicalMessage,
  EDGE_REPLAY_WINDOW_MS,
} from '../lib/tenantHeaders.js';

// ─── FastifyRequest augmentation ─────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Set by tenantResolutionHook when Edge-injected headers pass HMAC validation.
     * Downstream middlewares (tenantAuthMiddleware) may use this as pre-verified
     * tenant context. See TECS 6C2 §D7.
     */
    resolvedTenantId?: string;
    /** 'subdomain' | 'custom_domain' | 'fallback' — forwarded from Edge. */
    tenantSource?: string;
    /** Resolved tenant slug from Edge header (informational). */
    resolvedTenantSlug?: string;
  }
}

// ─── Internal routes prefix ──────────────────────────────────────────────────

const INTERNAL_PREFIX = '/api/internal/';

// ─── HMAC verification ───────────────────────────────────────────────────────

type SigVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'MISSING' | 'INVALID_TS' | 'REPLAY' | 'BAD_HMAC' };

function verifyEdgeSignature(
  normalizedHost: string,
  tenantId: string,
  sigHeader: string | undefined,
  tsHeader: string | undefined,
  secret: string,
): SigVerifyResult {
  if (!sigHeader || !tsHeader) {
    return { ok: false, reason: 'MISSING' };
  }

  const tsSeconds = parseInt(tsHeader, 10);
  if (!Number.isFinite(tsSeconds)) {
    return { ok: false, reason: 'INVALID_TS' };
  }

  // Replay-window check (convert stored epoch-seconds → ms for comparison).
  if (Math.abs(Date.now() - tsSeconds * 1000) > EDGE_REPLAY_WINDOW_MS) {
    return { ok: false, reason: 'REPLAY' };
  }

  const message = edgeCanonicalMessage(normalizedHost, tenantId, tsSeconds);
  const expectedHex = createHmac('sha256', secret).update(message, 'utf8').digest('hex');

  try {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const actualBuf = Buffer.from(sigHeader, 'hex');
    if (expectedBuf.length !== actualBuf.length) {
      return { ok: false, reason: 'BAD_HMAC' };
    }
    return timingSafeEqual(expectedBuf, actualBuf)
      ? { ok: true }
      : { ok: false, reason: 'BAD_HMAC' };
  } catch {
    return { ok: false, reason: 'BAD_HMAC' };
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fastify `onRequest` hook — tenant resolution header validation.
 *
 * Register BEFORE realmHintGuardOnRequest and tenantAuthMiddleware.
 * Usage:
 *   fastify.addHook('onRequest', tenantResolutionHook);
 */
export async function tenantResolutionHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const pathname = request.url.split('?')[0] ?? '';

  // 1. Skip internal routes — validated by their own HMAC mechanism.
  if (pathname.startsWith(INTERNAL_PREFIX)) {
    return;
  }

  const tenantId = request.headers[TENANT_ID_HEADER] as string | undefined;

  // 2. No tenant header → no-op. Let JWT path handle auth normally.
  if (!tenantId) {
    return;
  }

  // 3. Tenant header is present → MUST validate the signature.
  //    Absence of sig/ts alongside the tenant-id is a spoofing attempt.
  const sigHeader = request.headers[RESOLVER_SIG_HEADER] as string | undefined;
  const tsHeader = request.headers[RESOLVER_TS_HEADER] as string | undefined;

  // Normalize the host (Edge used normalized host in its canonical string).
  const rawHost = (request.headers.host as string | undefined) ?? '';
  const hostResult = normalizeHost(rawHost);

  if (!hostResult.ok) {
    request.log.warn(
      { host: rawHost, reason: hostResult.reason, url: request.url },
      'tenantResolutionHook: invalid host header — rejecting spoofed tenant headers',
    );
    reply.code(401).send();
    return;
  }

  const normalizedHost = hostResult.host;
  const result = verifyEdgeSignature(
    normalizedHost,
    tenantId,
    sigHeader,
    tsHeader,
    config.TEXQTIC_RESOLVER_SECRET,
  );

  if (!result.ok) {
    // Security event — log at warn (no signature content, no secret).
    request.log.warn(
      {
        reason: result.reason,
        host: normalizedHost,
        url: request.url,
        hasTenantId: !!tenantId,
        hasSig: !!sigHeader,
        hasTs: !!tsHeader,
      },
      'tenantResolutionHook: Edge header HMAC validation FAILED — possible spoofing attempt',
    );
    reply.code(401).send();
    return;
  }

  // 4. Valid — store resolved context on request for downstream use.
  request.resolvedTenantId = tenantId;
  request.tenantSource = (request.headers[TENANT_SOURCE_HEADER] as string | undefined) ?? 'unknown';
  request.resolvedTenantSlug = (request.headers[TENANT_SLUG_HEADER] as string | undefined);

  request.log.debug(
    {
      host: normalizedHost,
      tenantId,
      tenantSource: request.tenantSource,
    },
    'tenantResolutionHook: Edge headers validated — resolvedTenantId set',
  );
}
