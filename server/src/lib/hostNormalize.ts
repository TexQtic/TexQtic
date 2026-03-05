/**
 * G-026 — Host Normalization Helper
 *
 * Normalizes and validates incoming host values before they are used
 * in database lookups or HMAC verification.
 *
 * Normalization rules (Design Anchor §D6.5):
 *   1. Lowercase the entire string.
 *   2. Strip the port suffix (`:80`, `:443`, `:\d+`).
 *   3. Strip a trailing FQDN dot (e.g. `example.com.` → `example.com`).
 *   4. Reject bare IPv4 addresses (resolver is domain-only).
 *   5. Validate against an RFC 1123 hostname pattern.
 *
 * Usage:
 *   const result = normalizeHost(request.headers.host ?? '');
 *   if (!result.ok) { reply.code(400).send({ code: result.reason }); return; }
 *   const host = result.host;  // safe, normalized
 */

/** RFC 1123 hostname — lower-case only (we lowercase before checking). */
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9\-.]{0,251}[a-z0-9])?$/;

/** Bare IPv4 address — reject entirely; resolver is domain-only. */
const BARE_IP_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

export type NormalizeResult =
  | { ok: true; host: string }
  | {
      ok: false;
      reason:
        | 'EMPTY_HOST'
        | 'BARE_IP_REJECTED'
        | 'INVALID_HOSTNAME';
    };

/**
 * Normalize and validate a raw HTTP `Host` header value.
 *
 * @param raw  The raw value of the `Host` header (may include port).
 * @returns    A discriminated union: `{ ok: true, host }` on success,
 *             or `{ ok: false, reason }` on failure.
 */
export function normalizeHost(raw: string): NormalizeResult {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, reason: 'EMPTY_HOST' };
  }

  // Step 1 — Lowercase.
  let host = raw.toLowerCase();

  // Step 2 — Strip port suffix.
  host = host.replace(/:\d+$/, '');

  // Step 3 — Strip trailing FQDN dot.
  if (host.endsWith('.')) {
    host = host.slice(0, -1);
  }

  // Early exit for empty result after stripping.
  if (!host) {
    return { ok: false, reason: 'EMPTY_HOST' };
  }

  // Step 4 — Reject bare IPv4 addresses.
  if (BARE_IP_RE.test(host)) {
    return { ok: false, reason: 'BARE_IP_REJECTED' };
  }

  // Step 5 — Validate RFC 1123 hostname.
  if (!HOSTNAME_RE.test(host)) {
    return { ok: false, reason: 'INVALID_HOSTNAME' };
  }

  return { ok: true, host };
}

/**
 * Check whether a normalized host is a TexQtic platform subdomain.
 *
 * Platform pattern (Design Anchor §D6.4):
 *   <slug>.texqtic.app  (exactly 3 labels, second-level = texqtic.app)
 *
 * @param host  A normalized host value (output of normalizeHost).
 * @returns     `{ isPlatform: true, slug }` or `{ isPlatform: false }`.
 */
export function parsePlatformHost(host: string):
  | { isPlatform: true; slug: string }
  | { isPlatform: false } {
  const segments = host.split('.');
  if (segments.length === 3 && segments[1] === 'texqtic' && segments[2] === 'app') {
    const slug = segments[0];
    // Slug must be a valid identifier (non-empty, alphanumeric + hyphens).
    if (slug && /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
      return { isPlatform: true, slug };
    }
  }
  return { isPlatform: false };
}
