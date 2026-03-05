/**
 * G-026 TECS 6C2 — Vercel Edge Middleware
 *
 * Vercel Edge Middleware for TexQtic host-based tenant resolution.
 * Runs BEFORE routing on every matched request (see `config.matcher`).
 *
 * Design Anchor D1 (Hybrid) + D6 (resolver contract) + D7 (header signing) + D8 (fail-closed)
 * Governance: GOVERNANCE-SYNC-091
 *
 * ─── Resolution flow ────────────────────────────────────────────────────────
 *
 *   1. Strip inbound x-texqtic-* headers (anti-spoofing — D7)
 *   2. Normalize the HTTP Host header
 *   3. Passthrough: platform hosts + localhost + *.vercel.app (no resolution needed)
 *   4. Cache check (in-memory, TTL=60s, max 1,000 entries) — D5
 *   5. Cache miss: call GET /api/internal/resolve-domain with HMAC auth
 *   6. Resolved → inject x-texqtic-* headers via Vercel x-middleware-request-* — D7
 *   7. Not resolved / error → return 404 with generic body (fail-closed — D8)
 *
 * ─── HMAC secrets ───────────────────────────────────────────────────────────
 *
 *   TEXQTIC_RESOLVER_SECRET (env var):
 *     Used for TWO distinct calls:
 *       A) Signing the resolver endpoint call: "resolve:{host}:{tsMs}"
 *       B) Signing the injected Edge→Backend header: "edge:{host}:{tenantId}:{tsSeconds}"
 *     Same secret; different canonical strings; different purposes.
 *
 * ─── Env vars required in Vercel Edge Runtime ───────────────────────────────
 *
 *   TEXQTIC_RESOLVER_SECRET — shared HMAC secret (min 32 chars)
 *   TEXQTIC_PLATFORM_DOMAINS — comma-separated passthrough hosts
 *                              (default: texqtic.app,texqtic.com,www.texqtic.app,www.texqtic.com)
 *
 * ─── Header injection mechanism ─────────────────────────────────────────────
 *
 *   Headers are injected into the downstream serverless function using Vercel's
 *   x-middleware-request-{header-name} convention (infrastructure-level header
 *   forwarding, validated post-deploy on Vercel platform).
 *   A response with { x-middleware-next: '1' } signals pass-through.
 *
 * ─── Execution context note ─────────────────────────────────────────────────
 *
 *   Runs in Vercel Edge Runtime (V8 isolate). Uses Web Crypto API only.
 *   No Node.js crypto module available in this context.
 *   local dev (Vite): middleware.ts does NOT run; tests HMAC directly via server.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResolvedTenant {
  tenantId: string;
  tenantSlug: string;
  canonicalHost: string;
  status: 'resolved';
}

interface CacheEntry {
  tenantId: string;
  tenantSlug: string;
  canonicalHost: string;
  expiresAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 1_000;

// Outbound spoofing-protection: strip these from inbound request before anything.
const INBOUND_STRIP_HEADERS = [
  'x-texqtic-tenant-id',
  'x-texqtic-tenant-slug',
  'x-texqtic-tenant-source',
  'x-texqtic-resolver-sig',
  'x-texqtic-resolver-ts',
  'x-texqtic-resolver-hmac',
];

// ─── In-memory cache (module-scope, per-Edge-instance) ───────────────────────
// Note: Vercel Edge instances are short-lived and regionally isolated.
// Cross-region caches are independent. Invalidation is handled in TECS 6C3.

const resolutionCache = new Map<string, CacheEntry>();

function cacheGet(host: string): CacheEntry | null {
  const entry = resolutionCache.get(host);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    resolutionCache.delete(host);
    return null;
  }
  return entry;
}

function cacheSet(host: string, entry: Omit<CacheEntry, 'expiresAt'>): void {
  // Evict oldest entry if at capacity.
  if (resolutionCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = resolutionCache.keys().next().value;
    if (oldestKey !== undefined) resolutionCache.delete(oldestKey);
  }
  resolutionCache.set(host, { ...entry, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Web Crypto HMAC helper ──────────────────────────────────────────────────

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Host normalization ───────────────────────────────────────────────────────

/** RFC 1123 hostname (lower-case only). */
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9\-.]{0,251}[a-z0-9])?$/;
/** Bare IPv4. */
const BARE_IP_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

type NormHostResult = { ok: true; host: string } | { ok: false };

function normalizeHostEdge(raw: string): NormHostResult {
  if (!raw) return { ok: false };
  let host = raw.toLowerCase().replace(/:\d+$/, '');
  if (host.endsWith('.')) host = host.slice(0, -1);
  if (!host) return { ok: false };
  if (BARE_IP_RE.test(host)) return { ok: false };
  if (!HOSTNAME_RE.test(host)) return { ok: false };
  return { ok: true, host };
}

// ─── Platform passthrough list ────────────────────────────────────────────────

function buildPassthroughSet(): Set<string> {
  const defaults = ['texqtic.app', 'texqtic.com', 'www.texqtic.app', 'www.texqtic.com', 'api.texqtic.app'];
  const custom =
    (typeof process !== 'undefined' && process.env?.TEXQTIC_PLATFORM_DOMAINS)
      ? process.env.TEXQTIC_PLATFORM_DOMAINS.split(',').map(h => h.trim()).filter(Boolean)
      : [];
  return new Set([...defaults, ...custom]);
}

function isDevHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host === '[::1]' ||
    host.endsWith('.localhost')
  );
}

// ─── Resolver call ────────────────────────────────────────────────────────────

async function fetchResolvedTenant(
  baseUrl: string,
  normalizedHost: string,
  secret: string,
): Promise<ResolvedTenant | null> {
  // Resolver HMAC: "resolve:{host}:{tsMs}" (epoch milliseconds)
  const tsMs = Date.now();
  const resolverHmac = await hmacSha256Hex(secret, `resolve:${normalizedHost}:${tsMs}`);

  const url = `${baseUrl}/api/internal/resolve-domain?host=${encodeURIComponent(normalizedHost)}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'GET',
      headers: {
        'x-texqtic-resolver-hmac': resolverHmac,
        'x-texqtic-resolver-ts': String(tsMs),
      },
    });
  } catch {
    // Network error — fail-closed (D8)
    return null;
  }

  if (resp.status === 404) return null;
  if (!resp.ok) return null;

  try {
    const body = await resp.json() as ResolvedTenant;
    if (body.status !== 'resolved') return null;
    return body;
  } catch {
    return null;
  }
}

// ─── 404 response (doctrine: identical for all unresolved — D6/D8) ───────────

function notFoundResponse(): Response {
  return new Response(JSON.stringify({ status: 'not_found' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
}

// ─── Main middleware ──────────────────────────────────────────────────────────

export default async function middleware(request: Request): Promise<Response> {
  const secret =
    (typeof process !== 'undefined' && process.env?.TEXQTIC_RESOLVER_SECRET) ?? '';

  if (!secret || secret.length < 32) {
    // TEXQTIC_RESOLVER_SECRET missing or too short — fail-closed, log.
    console.error('[middleware] TEXQTIC_RESOLVER_SECRET missing or < 32 chars. Blocking request.');
    return new Response('Service configuration error', { status: 503 });
  }

  // 1. Strip all inbound x-texqtic-* headers (anti-spoofing — D7).
  const headers = new Headers(request.headers);
  for (const name of INBOUND_STRIP_HEADERS) {
    headers.delete(name);
  }

  // 2. Normalize hostname.
  const rawHost = headers.get('host') ?? new URL(request.url).hostname;
  const hostResult = normalizeHostEdge(rawHost);
  if (!hostResult.ok) {
    // Invalid hostname — not a platform request, fail-closed.
    return notFoundResponse();
  }
  const normalizedHost = hostResult.host;

  // 3. Passthrough: dev hosts + platform domains + *.vercel.app deployment URLs.
  //
  //   *.vercel.app hosts are Vercel's own deployment/preview URLs
  //   (e.g. texqtic-cc54b2jv7-tex-qtic.vercel.app). They are not custom tenant
  //   domains, so they never need resolver resolution — pass straight through.
  //   This check runs before the resolver call; it does NOT affect custom domain
  //   routing (those still go through the resolver and remain fail-closed — D8).
  //
  //   OPS-EDGE-VERCELAPP-PASSTHROUGH-001
  const platformHosts = buildPassthroughSet();
  if (
    isDevHost(normalizedHost) ||
    platformHosts.has(normalizedHost) ||
    normalizedHost.endsWith('.vercel.app')
  ) {
    return new Response(null, {
      status: 200,
      headers: { 'x-middleware-next': '1' },
    });
  }

  // 4. Cache lookup.
  const cached = cacheGet(normalizedHost);
  if (cached) {
    return buildInjectedPassthrough(normalizedHost, cached.tenantId, cached.tenantSlug, secret);
  }

  // 5. Cache miss → call backend resolver.
  const requestUrl = new URL(request.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  const resolved = await fetchResolvedTenant(baseUrl, normalizedHost, secret);

  if (!resolved) {
    // Not found or resolver error — fail-closed (D8): return generic 404.
    return notFoundResponse();
  }

  // 6. Store in cache.
  cacheSet(normalizedHost, {
    tenantId: resolved.tenantId,
    tenantSlug: resolved.tenantSlug,
    canonicalHost: resolved.canonicalHost,
  });

  // 7. Inject headers and pass through.
  return buildInjectedPassthrough(normalizedHost, resolved.tenantId, resolved.tenantSlug, secret);
}

// ─── Header injection helper ─────────────────────────────────────────────────

async function buildInjectedPassthrough(
  normalizedHost: string,
  tenantId: string,
  tenantSlug: string,
  secret: string,
): Promise<Response> {
  // Edge→Backend signature: "edge:{host}:{tenantId}:{tsSeconds}"
  const tsSeconds = Math.floor(Date.now() / 1000);
  const edgeSig = await hmacSha256Hex(
    secret,
    `edge:${normalizedHost}:${tenantId}:${tsSeconds}`,
  );

  // Vercel x-middleware-request-* convention:
  // These headers are forwarded as request headers to the downstream serverless function.
  // The x-middleware-next: '1' signals Vercel to pass the request through (not return this response).
  return new Response(null, {
    status: 200,
    headers: {
      'x-middleware-next': '1',
      'x-middleware-request-x-texqtic-tenant-id': tenantId,
      'x-middleware-request-x-texqtic-tenant-slug': tenantSlug,
      'x-middleware-request-x-texqtic-tenant-source': 'subdomain',
      'x-middleware-request-x-texqtic-resolver-sig': edgeSig,
      'x-middleware-request-x-texqtic-resolver-ts': String(tsSeconds),
    },
  });
}

// ─── Matcher config ───────────────────────────────────────────────────────────
//
// Excludes:
//   /api/internal/*  — resolver + internal routes validate separately; must never
//                      be intercepted or the Edge would call itself (recursion).
//   /_next/*         — Next.js assets (if ever used)
//   /favicon.ico, /assets/* — static assets
//   /health, /api/health — healthcheck endpoints

export const config = {
  matcher: [
    '/((?!api/internal|_next/static|_next/image|favicon\\.ico|assets/).*)',
  ],
};
