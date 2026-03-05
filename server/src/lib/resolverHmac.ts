/**
 * G-026 — Resolver HMAC Authentication Helper
 *
 * Implements HMAC-SHA256 verification for the internal domain resolver endpoint.
 * Protects the endpoint from unauthenticated callers (e.g., port scanners, SSRF).
 *
 * Wire format (per Design Anchor §D7):
 *   Header: x-texqtic-resolver-hmac  — hex-encoded HMAC-SHA256 of the message
 *   Header: x-texqtic-resolver-ts    — Unix timestamp in milliseconds (string)
 *
 *   Message: "resolve:" + normalizedHost + ":" + tsMs
 *   Secret:  TEXQTIC_RESOLVER_SECRET env var (≥ 32 chars)
 *   Replay:  Reject if |now - tsMs| > REPLAY_WINDOW_MS (30 000 ms)
 *
 * Security notes:
 *   - Comparison uses timingSafeEqual to prevent timing side-channels.
 *   - The secret is NEVER logged or returned in error responses.
 *   - Invalid HMAC and expired timestamp both return the same opaque error code
 *     to avoid oracle behaviour.
 */

import { createHmac, timingSafeEqual } from 'crypto';

// 30-second sliding window to protect against replay attacks.
const REPLAY_WINDOW_MS = 30_000;

export type HmacVerifyResult =
  | { valid: true }
  | { valid: false; reason: 'MISSING_HEADERS' | 'INVALID_TS' | 'REPLAY_WINDOW_EXCEEDED' | 'INVALID_HMAC' };

/**
 * Verify the HMAC-SHA256 signature on an incoming resolver request.
 *
 * @param normalizedHost  The host value AFTER normalizeHost() — must be lower-case, port-stripped.
 * @param hmacHeader      Value of x-texqtic-resolver-hmac (hex string).
 * @param tsHeader        Value of x-texqtic-resolver-ts  (ms timestamp string).
 * @param secret          Value of TEXQTIC_RESOLVER_SECRET env var.
 */
export function verifyResolverHmac(
  normalizedHost: string,
  hmacHeader: string | undefined,
  tsHeader: string | undefined,
  secret: string,
): HmacVerifyResult {
  // 1. Headers must both be present.
  if (!hmacHeader || !tsHeader) {
    return { valid: false, reason: 'MISSING_HEADERS' };
  }

  // 2. Timestamp must be a finite integer.
  const tsMs = parseInt(tsHeader, 10);
  if (!Number.isFinite(tsMs)) {
    return { valid: false, reason: 'INVALID_TS' };
  }

  // 3. Replay-window check.
  if (Math.abs(Date.now() - tsMs) > REPLAY_WINDOW_MS) {
    return { valid: false, reason: 'REPLAY_WINDOW_EXCEEDED' };
  }

  // 4. Compute expected MAC.
  const message = `resolve:${normalizedHost}:${tsMs}`;
  const expectedHex = createHmac('sha256', secret).update(message, 'utf8').digest('hex');

  // 5. Timing-safe comparison.
  try {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const actualBuf = Buffer.from(hmacHeader, 'hex');

    // Lengths must match before calling timingSafeEqual (both are fixed-length SHA-256 — 32 bytes).
    if (expectedBuf.length !== actualBuf.length) {
      return { valid: false, reason: 'INVALID_HMAC' };
    }

    return timingSafeEqual(expectedBuf, actualBuf)
      ? { valid: true }
      : { valid: false, reason: 'INVALID_HMAC' };
  } catch {
    // Malformed hex in hmacHeader → treat as invalid.
    return { valid: false, reason: 'INVALID_HMAC' };
  }
}
