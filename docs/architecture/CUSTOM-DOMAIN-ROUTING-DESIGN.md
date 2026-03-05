# Custom Domain Routing — Design Anchor

**TECS ID:** G-026-CUSTOM-DOMAIN-ROUTING-DESIGN-001  
**Status:** ✅ Design Anchor Complete — Implementation pending (TECS 6C/6D)  
**Date:** 2026-03-05  
**Wave:** 4 — Custom Domain Routing  
**Governance Sync:** GOVERNANCE-SYNC-089  
**Author:** GitHub Copilot — plan-only TECS, no code/schema/RLS changes  
**Depends on:** [docs/architecture/CUSTOM-DOMAIN-ROUTING-DISCOVERY.md](./CUSTOM-DOMAIN-ROUTING-DISCOVERY.md) (commit db6cc7e, GOVERNANCE-SYNC-088)

---

## §1 — Scope

### 1.1 v1 In-Scope

| Capability | Status |
|------------|--------|
| Host-based tenant resolution for **platform subdomains** (`<slug>.texqtic.app`) | ✅ v1 |
| Vercel Edge Middleware extracting slug from hostname | ✅ v1 |
| Backend resolver endpoint (`/api/internal/resolve-domain`) | ✅ v1 |
| Edge→Backend HMAC-signed resolution call | ✅ v1 |
| Tenant context injection via request headers | ✅ v1 |
| Backend header validation (anti-spoofing) | ✅ v1 |
| In-Edge TTL cache (60 s) with invalidation webhook | ✅ v1 |
| WL Domains management panel (`OPS-WLADMIN-DOMAINS-001`) | ✅ v1 (TECS 6D, unblocked by this design) |
| Safe fallback routing (no tenant → platform login) | ✅ v1 |

### 1.2 v1 Out-of-Scope (explicitly deferred)

| Capability | Reason / Future TECS |
|------------|---------------------|
| Custom apex domains (`brand.com`) | Requires G-026-A schema extension: `txt_record`, `verified_at`, `status` columns + DNS verification job. Deferred to v1.1. |
| Custom subdomains (`shop.brand.com`) | Same DNS verification requirement. Deferred to v1.1. |
| TXT record DNS challenge flow | G-026-A not in scope here. Admin sets `verified=true` manually in v1. |
| Multi-domain per tenant (more than one active) | Schema supports it; UI panel deferred to v1.1 once DNS automation exists. |
| Wildcard subdomain routing (`*.brand.com`) | Requires Vercel custom wildcard cert provisioning. Deferred. |
| Geo-aware routing / performance routing | Out of scope. |
| Cross-origin DPP sharing via domain | Out of scope (G-025 dependency). |

### 1.3 Scope Boundary Statement

> **v1 goal:** When a user navigates to `acme.texqtic.app`, the TexQtic platform
> resolves `acme` as a tenant slug, identifies the corresponding `tenant_id`, and
> delivers the correct white-label tenant experience without requiring a tenant
> selector dropdown or hardcoded `SEEDED_TENANTS` list.
>
> v1 does **not** require DNS record configuration by tenants, external domain
> registration, or challenge-response verification. Platform subdomains
> (`*.texqtic.app`) are under TexQtic infrastructure control.

---

## §2 — Terminology

| Term | Definition |
|------|-----------|
| **domain** | A fully qualified hostname string used to reach the TexQtic platform (e.g., `acme.texqtic.app`). Stored in `tenant_domains.domain`. |
| **host** | The value of the HTTP `Host` header on an inbound request, after stripping port (`:443`/`:80`). |
| **platform domain** | TexQtic-controlled domains: `texqtic.app`, `texqtic.com`, and any TexQtic-operated subdomains. No tenant DNS configuration required. |
| **platform subdomain** | A subdomain of a TexQtic platform domain structured as `<slug>.texqtic.app`. The slug is extracted directly from the hostname — no `tenant_domains` table lookup required. |
| **custom domain** | A tenant-owned domain (e.g., `shop.brand.com`) that requires DNS record configuration and verification. Out of scope for v1. |
| **tenant_id** | The UUID primary key of a row in the `tenants` table (same UUID as `organizations.id` per platform Decision-0001). This is the canonical tenant identity for RLS context. |
| **org_id** | Synonym for `tenant_id` in the RLS context. `app.org_id` is the session GUC set by `databaseContextMiddleware`. |
| **tenantSlug** | The `tenants.slug` string (e.g., `acme`). Used to derive `tenant_id` from a platform subdomain. Unique per tenant. |
| **resolver** | The system component (Edge Middleware + backend endpoint) that maps an inbound `host` to a `tenant_id`. |
| **canonical host** | The platform subdomain form of a tenant's address (e.g., `acme.texqtic.app`). Used in redirect rules when a non-canonical host is presented. |
| **resolver chain** | The ordered sequence: Edge slug extraction → backend slug→tenant_id lookup → header injection → backend header validation → tenant auth middleware. |

---

## §3 — Current State Summary

### 3.1 `tenant_domains` Schema Essentials

Source: `server/prisma/schema.prisma` (TenantDomain model, GOVERNANCE-SYNC-088 confirmed):

| Column | Details | v1 Usage |
|--------|---------|----------|
| `id` | UUID PK | Not used in routing path |
| `tenant_id` | UUID FK → tenants (CASCADE) | **Lookup target** (not needed for platform subdomain v1, needed for custom domain v1.1) |
| `domain` | VARCHAR(255) UNIQUE | Custom domain storage (v1.1) |
| `verified` | BOOLEAN default false | Guards routing activation (v1.1) |
| `primary` | BOOLEAN default false | Selects canonical domain |
| `created_at` | TIMESTAMPTZ | Audit |

**For platform subdomain v1:** The resolver does **not** query `tenant_domains`. It reads
`tenants.slug` directly. `tenant_domains` is used only for custom domain v1.1.

### 3.2 What Currently Breaks (Open Gaps B–G)

| Gap | Status in v1 Design |
|-----|---------------------|
| **G-026-A** — Missing DNS verification columns | 🔵 Deferred (v1.1) |
| **G-026-B** — No public resolver endpoint | ✅ Resolved by D6 (internal resolver, not public) |
| **G-026-C** — No `middleware.ts` | ✅ Resolved by D1 (created in TECS 6C1) |
| **G-026-D** — No slug-subdomain routing | ✅ Resolved by D2 + 6C2 |
| **G-026-E** — RLS bypass for pre-auth lookup | ✅ Resolved by D4 (narrow resolver endpoint) |
| **G-026-F** — No cache infrastructure | ✅ Resolved by D5 (Edge in-memory TTL cache) |
| **G-026-G** — WL Domains management panel | ✅ Unblocked by this design; TECS 6D |

**Remaining open:** G-026-A (schema extension for DNS verification — tracked, not blocking v1).

---

## §4 — Decisions (D1–D8 LOCKED)

---

### D1 — Routing Insertion Point

**Chosen: Option C — Hybrid (Edge resolves → Backend validates)**

| Field | Detail |
|-------|--------|
| **Decision** | Vercel Edge Middleware (`middleware.ts` at repo root) extracts the tenant slug from the hostname, calls the backend resolver endpoint (signed), and injects `x-texqtic-tenant-id` + `x-texqtic-resolver-sig` headers into the downstream Fastify request. Fastify validates the HMAC signature before trusting the injected tenant_id. |
| **Alternatives considered** | Option A (Edge-only): Edge cannot connect to Postgres; domain map must live in KV — introduces external infrastructure. Option B (Fastify-only): Every request gets an extra DB round-trip before auth; no Edge caching; higher cold-start cost. |
| **Rationale** | TexQtic deploys on Vercel (confirmed `vercel.json`). Edge Middleware is the correct interception layer. Backend validation prevents header spoofing from direct Fastify callers. The backend resolver call is cached at Edge (D5), limiting DB load. Two-layer design preserves security-in-depth without adding a separate KV store. |
| **Risk** | Edge Middleware adds one cold-start layer. First uncached resolve requires Edge→Fastify HTTP call (~50 ms). Mitigated by 60 s TTL cache and warm serverless instances. Vercel-specific: self-hosted deployments need an equivalent reverse proxy layer (documented). |
| **Stop condition check** | ✅ Not triggered. No schema change required for platform subdomain v1. |

---

### D2 — v1 Routing Scope

**Chosen: Platform subdomains — `<slug>.texqtic.app` only**

| Field | Detail |
|-------|--------|
| **Decision** | v1 resolves the tenant from the platform subdomain `<slug>.texqtic.app`. The slug is extracted by splitting the hostname on `.` and taking the first segment. No DNS verification, no TXT record, no `tenant_domains` table lookup required. Custom domains (apex and tenant subdomains) deferred to v1.1. |
| **Alternatives considered** | Custom apex domains only: requires G-026-A schema extension and DNS verification infrastructure — too large for v1. All domain types simultaneously: too broad; mixes platform-controlled with tenant-controlled DNS, increasing failure surface. |
| **Rationale** | Platform subdomains are entirely under TexQtic infrastructure control (Vercel wildcard). No tenant action is required. Implementation is a pure slug→tenant_id lookup on `tenants.slug` — no schema changes, no migrations. Unblocks white-label UX immediately while DNS verification infrastructure is designed separately. |
| **Ordering for v1.1 (deferred):** | 1. Custom tenant subdomains (`shop.brand.com`) — requires G-026-A DNS verification columns. 2. Apex custom domains (`brand.com`) — requires Vercel domain add API + A-record management. |
| **Risk** | Tenant slug enumeration via `*.texqtic.app` namespace. Mitigated by rate-limiting resolver endpoint (D4) and returning identical 404 for all non-resolved slugs (§5). |
| **Stop condition check** | ✅ Not triggered. Resolves G-026-A deferral explicitly. |

---

### D3 — Resolver Lookup Strategy

**Chosen: Backend resolver endpoint called from Edge**

| Field | Detail |
|-------|--------|
| **Decision** | Vercel Edge Middleware calls `GET /api/internal/resolve-domain?host=<normalized_host>` (Fastify serverless). The endpoint is protected by HMAC-SHA256 request signing using a shared secret (`TEXQTIC_RESOLVER_SECRET`). The endpoint queries `tenants.slug` for platform subdomains or `tenant_domains.domain` for custom domains (v1.1). |
| **Alternatives considered** | Direct DB lookup from Edge: Edge Runtime cannot use Prisma or a Postgres driver (V8 isolate, no Node.js native bindings). Not feasible. Precomputed Edge Config/KV map: adds external infrastructure (Vercel Edge Config provisioning, sync job, cache invalidation webhook); over-engineered for v1 where tenant count is bounded. |
| **Rationale** | The backend (Fastify serverless) already has Prisma, connection pooling, and RLS-bypass capability. Reusing it as the domain resolver keeps DB logic centralised. The Edge call is cached at Edge with a 60 s TTL (D5), so DB hit rate is bounded by cache miss rate. HMAC signing prevents the endpoint from being called by arbitrary clients. |
| **Security posture** | Endpoint returns only `{ tenantId, tenantSlug, status }`. Shared secret (`TEXQTIC_RESOLVER_SECRET`) is an env var, never logged or emitted. Endpoint is not accessible in the Swagger/OpenAPI docs. Route prefix: `/api/internal/*` (separate from `/api/tenant/*` and `/api/public/*`). |
| **Risk** | Edge→Fastify latency on cache miss (~50–100 ms). Mitigated by 60 s TTL and Vercel serverless warm path. If backend is down, Edge catches error and routes to fallback (D8). |
| **Stop condition check** | ✅ Not triggered. No direct DB connection from Edge. |

---

### D4 — RLS Bypass Strategy for Pre-Auth Resolution

**Chosen: Signed resolver endpoint using service role (BYPASSRLS) — narrow output only**

| Field | Detail |
|-------|--------|
| **Decision** | The `/api/internal/resolve-domain` Fastify route runs a Prisma query outside the standard `withDbContext` / `tenantAuthMiddleware` path. It uses a dedicated Prisma client instance (or raw query) that connects as `texqtic_service` role (a DB role with BYPASSRLS granted). This query returns **only** `{ tenantId: string, tenantSlug: string }` — nothing else. The route is gated by HMAC signature verification before executing any DB query. |
| **Alternatives considered** | `SECURITY DEFINER` function: would work but complicates schema governance (a new DB function must go through migration ledger). Complexity not justified for a slug lookup. Standard `texqtic_app` role with bypass arm: the RLS RESTRICTIVE guard requires `app.require_org_context()` — PRE-AUTH means `app.org_id` is not set, so guard would block. Edge Config/KV only (no DB hit): no KV provisioned in v1 (D5 uses Edge in-memory); not feasible as sole strategy. |
| **Rationale** | The narrowest possible bypass: single query, single return field, guarded by HMAC before any DB contact. `texqtic_service` role is used **only** in the resolver endpoint — no other route uses it. This upholds the doctrine "tenant RLS remains primary for all application data access" — the resolver does not return application data; it returns only a routing identifier. |
| **Doctrine compliance** | RLS doctrine language: "tenant RLS remains primary for application data access." The resolver returns a routing primitive (`tenant_id`), not application data (orders, DPP, inventory). Doctrine is not violated. |
| **Required governance** | `texqtic_service` role creation must be documented as a migration (separate TECS gate before 6C1 deploy). Role must have SELECT on `tenants(id, slug)` only. BYPASSRLS grant is scoped to this role exclusively. This is a **G-026-H** governance gate (new sub-gap, non-blocking, must be resolved in TECS 6C1). |
| **Risk** | If `TEXQTIC_RESOLVER_SECRET` is leaked, an attacker can call the resolver and enumerate tenant slugs. Mitigated by: (a) HMAC replay protection (timestamp window ≤ 30 s), (b) rate limiting (10 req/s per IP), (c) no application data returned. |
| **Gap registered** | **G-026-H:** `texqtic_service` DB role with BYPASSRLS not yet created. Blocking for TECS 6C1 deploy. Must go through migration ledger (SQL-only, no Prisma schema change). |
| **Stop condition check** | ✅ Not triggered. Narrow output preserved. RLS doctrine intact for all application data routes. |

---

### D5 — Cache Strategy

**Chosen: Edge in-memory cache (per region, TTL = 60 s) with webhook invalidation**

| Field | Detail |
|-------|--------|
| **Decision** | Vercel Edge Middleware maintains an in-memory `Map<string, { tenantId, tenantSlug, expiresAt }>` keyed by normalised host. Entries expire after 60 seconds (`expiresAt = Date.now() + 60_000`). On cache miss: call backend resolver (D3), store result. On `tenant_domains` mutation (INSERT/UPDATE/DELETE): Fastify emits a POST to a Vercel Edge webhook (`/api/internal/cache-invalidate`) that flushes the specific host or all entries depending on the event type. |
| **Alternatives considered** | No cache (DB every request): acceptable for very low traffic but unacceptable at scale — every page load hits Fastify with a pre-auth DB round-trip. Edge Config/KV: persistent, cross-region consistent, but requires provisioning, API key management, and sync job. Over-engineered for v1 with bounded tenant count. |
| **Rationale** | In-memory Edge cache is zero-infrastructure for v1. Vercel Edge regions each maintain their own warm cache. 60 s TTL means a deactivated domain is unreachable within one minute, which is acceptable for v1 safety (D8 defines safe fallback). Cache invalidation webhook ensures that domain add/remove events propagate within seconds via an explicit signal rather than relying on TTL expiry. |
| **Invalidation design** | `POST /api/internal/cache-invalidate` — HMAC-protected, same secret as resolver. Payload: `{ host?: string, allHosts?: boolean }`. Called from Fastify's `tenant_domains` CRUD routes after DB write. Response: `200 OK` or `204`. Edge Middleware flushes matching entry (or all entries if `allHosts=true`). |
| **TTL selection rationale** | 60 s: short enough that a deactivated domain stops routing within 1 minute (well within safe window); long enough to absorb burst traffic on the common path (~1,000 requests/minute per region from a single warm cache entry). |
| **Risk** | Multi-region cache inconsistency: each Vercel Edge region has its own in-memory cache. Domain deactivation webhook fires to the Edge function receiving the request, not all regions. Worst case: up to 60 s of stale routing in other regions. Acceptable for v1; upgrade to Edge Config/KV in v1.1 if cross-region consistency is required. |
| **Stop condition check** | ✅ Not triggered. No external KV infrastructure required. |

---

### D6 — Public Resolver Contract

**Chosen: Internal signed endpoint — `GET /api/internal/resolve-domain`**

**Note:** This is **not** a public endpoint. It is called only by Vercel Edge Middleware, protected by HMAC-SHA256.

#### 6.1 Endpoint Definition

```
Method:  GET
Path:    /api/internal/resolve-domain
Auth:    HMAC-SHA256 header (see §6.3)
Caller:  Vercel Edge Middleware only
Output:  JSON
```

#### 6.2 Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `host` | ✅ Yes | Normalized inbound hostname (lowercase, port stripped). Example: `acme.texqtic.app` |

#### 6.3 Request Authentication (HMAC)

Edge Middleware constructs the request with the following header:

```
x-texqtic-resolver-hmac: <HMAC-SHA256(secret, "resolve:" + host + ":" + timestamp_epoch_s)>
x-texqtic-resolver-ts:   <Unix timestamp in seconds (integer)>
```

Backend validates:
1. `x-texqtic-resolver-ts` is within ±30 seconds of server clock (replay protection).
2. Recomputes HMAC. If mismatch → `401 Unauthorized` (no body).
3. If timestamp window exceeded → `401 Unauthorized` (no body).

#### 6.4 Response Shape

**Success (resolved):**

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "tenantId":      "550e8400-e29b-41d4-a716-446655440000",
  "tenantSlug":    "acme",
  "canonicalHost": "acme.texqtic.app",
  "status":        "resolved"
}
```

**Not found:**

```json
HTTP/1.1 404 Not Found
Content-Type: application/json

{ "status": "not_found" }
```

> ⚠️ No detail in the 404 body. Identical response for: slug not found, domain not verified,
> tenant disabled. This prevents tenant enumeration (§5).

**Error (invalid HMAC or timestamp):**

```
HTTP/1.1 401 Unauthorized
(no body)
```

**Error (server fault):**

```
HTTP/1.1 500 Internal Server Error
(no body — logged internally, not emitted to caller)
```

#### 6.5 Host Normalization Rules

Before passing `host` to the resolver (both at Edge and at backend validation), apply:

1. Lowercase the entire string.
2. Strip port suffix (`:443`, `:80`, or any `:\d+`).
3. Strip trailing dot (FQDN trailing dot).
4. Verify the string matches the regex `^[a-z0-9][a-z0-9\-\.]{0,252}[a-z0-9]$` (RFC 1123). Reject (no lookup) if mismatch.
5. Reject bare IP addresses (matches `^\d+\.\d+\.\d+\.\d+$`).

#### 6.6 Platform Subdomain Resolution Logic (v1)

```
host = "acme.texqtic.app"
segments = host.split(".")          // ["acme", "texqtic", "app"]
if (segments.length === 3 AND segments[1] + "." + segments[2] === "texqtic.app"):
  slug = segments[0]
  query: SELECT id, slug FROM tenants WHERE slug = $slug AND active = true LIMIT 1
  if row found: return { tenantId: row.id, tenantSlug: row.slug, ... }
  else: return 404
else:
  return 404   // v1: only platform subdomains supported
```

#### 6.7 Security requirements summary

- HMAC-SHA256 authentication (shared secret `TEXQTIC_RESOLVER_SECRET` — env var only, never logged)
- 30-second replay window (timestamp `x-texqtic-resolver-ts`)
- Minimum output: `{ tenantId, tenantSlug, canonicalHost, status }` only — no other tenant data
- Rate limit: 10 requests/second per source IP (Edge-level; additional Fastify-level rate limit on the route)
- Route is not registered in OpenAPI/Swagger definitions
- Route returns identical `404` for all non-resolved cases (no timing differentiation)

---

### D7 — Header Signing and Propagation

**Chosen: Three propagation headers with HMAC signature on tenant context**

#### 7.1 Header Definitions

| Header | Set by | Read by | Value |
|--------|--------|---------|-------|
| `x-texqtic-tenant-id` | Vercel Edge Middleware | Fastify `tenantResolutionHook` | UUID string of the resolved tenant |
| `x-texqtic-tenant-source` | Vercel Edge Middleware | Fastify `tenantResolutionHook` (logging) | `subdomain`, `custom_domain`, or `fallback` |
| `x-texqtic-resolver-sig` | Vercel Edge Middleware | Fastify `tenantResolutionHook` | HMAC-SHA256 of `tenantId + ":" + host + ":" + timestamp` |
| `x-texqtic-resolver-ts` | Vercel Edge Middleware | Fastify `tenantResolutionHook` | Unix timestamp (seconds) used for HMAC |

#### 7.2 Trust Boundary

```
INTERNET → Vercel Edge → (strip any x-texqtic-* headers from original request)
                       → (set own x-texqtic-* headers)
                       → Fastify serverless
                              │
                              └─ tenantResolutionHook (fires BEFORE tenantAuthMiddleware)
                                     ├─ If headers present: validate HMAC
                                     │   ├─ VALID: set request.resolvedTenantId, request.tenantSource
                                     │   └─ INVALID: reject 401
                                     └─ If headers absent: continue (JWT path, admin path)
```

**CRITICAL:** Edge Middleware must **strip** the following headers from the original inbound request before injecting its own:
- `x-texqtic-tenant-id`
- `x-texqtic-tenant-source`
- `x-texqtic-resolver-sig`
- `x-texqtic-resolver-ts`

This prevents external callers from injecting tenant context headers that bypass Edge resolution.

#### 7.3 Fastify `tenantResolutionHook` Behavior

The hook fires as an `onRequest` hook, **before** `tenantAuthMiddleware`:

```
1. Check if x-texqtic-tenant-id header present
2. If present:
   a. Validate HMAC (same secret as D3/D6)
   b. Validate timestamp window (≤ 30 s)
   c. If valid: set request.resolvedTenantId = headerValue
   d. If invalid: return 401 (log the anomaly as a security event)
3. If absent: no-op (normal JWT + admin flow)
```

`tenantAuthMiddleware` is modified to:
- If `request.resolvedTenantId` is set AND matches `payload.tenantId` from JWT: allow.
- If `request.resolvedTenantId` is set AND differs from `payload.tenantId`: reject 403 (domain→JWT tenant mismatch — log as security event).
- If `request.resolvedTenantId` is absent: existing JWT-only path unchanged.

#### 7.4 Backward Compatibility

The JWT-only path (used by direct API clients, mobile apps, control-plane tools) is
unchanged. The `tenantResolutionHook` is a no-op when the `x-texqtic-tenant-id` header
is absent. No existing routes are modified in TECS 6C.

---

### D8 — Deactivation and Safety Fallbacks

**Chosen: Immediate cache invalidation + safe platform host redirect**

#### 8.1 Domain Removal

| Event | Behavior |
|-------|----------|
| `tenant_domains` row deleted | Fastify route (CRUD handler) triggers `POST /api/internal/cache-invalidate` with `{ host: deletedDomain }` immediately after DB DELETE. Edge cache entry flushed. Subsequent requests to that host: Edge cache miss → resolver call → `404 not_found` → Edge routes to platform fallback. |
| `tenant_domains.verified` set to `false` | Same invalidation webhook. Resolver also checks `verified = true` before resolving (for custom domains in v1.1). |
| Tenant account suspended/disabled | Resolver query includes `AND tenants.active = true`. Inactive tenant → `{ status: "not_found" }` → safe fallback. |

#### 8.2 Domain Duplicate (Conflict)

Protected at DB level by `UNIQUE (domain)` constraint. A second INSERT with the same
`domain` string raises a PostgreSQL 23505 unique-violation error. Fastify CRUD handler
returns `409 Conflict` to the caller — no routing inconsistency possible.

#### 8.3 Host Points to No Tenant

Resolver returns `{ status: "not_found" }`. Edge Middleware behavior:

```
if resolverStatus === "not_found":
  redirect to "https://texqtic.app/not-found?host=<normalized_host>"
  // normalized_host is double-URL-encoded to prevent open redirect
```

The `/not-found` page on `texqtic.app` displays a generic "site not found" message.
No tenant enumeration information is exposed.

#### 8.4 Backend Resolver Unavailable (HTTP 4xx/5xx or network error)

Edge Middleware catches the error:

```
if resolver throws or returns 5xx:
  redirect to "https://texqtic.app/?resolver_error=1"
  // log: { host, error: "resolver_unavailable", timestamp }
```

No retry on fail-open (fail-closed for security: if resolver is unavailable, do not
guess the tenant). Monitoring alert fires on resolver error rate.

#### 8.5 Platform Domain Passthrough (No Resolution Needed)

```
host === "texqtic.app"      → pass through (no resolution, main platform)
host === "texqtic.com"      → pass through
host === "www.texqtic.app"  → pass through
host === "api.texqtic.app"  → pass through (control plane)
```

Edge Middleware allowlist for platform domains that skip resolution. Configurable via
`TEXQTIC_PLATFORM_DOMAINS` env var (comma-separated list).

#### 8.6 Timing Attack Prevention

All resolver responses (found / not-found / error) complete within a consistent HTTP
round-trip. The 404 response is not short-circuited before DB lookup — lookup always
fires (cannot be observed by timing the response). Rate limiting (D4) provides
additional protection against enumeration via timing.

---

## §5 — Threat Model

| Threat | Attack Vector | Mitigations |
|--------|--------------|-------------|
| **Domain hijacking** | Attacker registers `victim.texqtic.app` — but that slug is not in `tenants`. Attacker creates a tenant with slug `victim` via sign-up and gets routing. | Sign-up must enforce slug uniqueness (existing `UNIQUE (slug)` on `tenants` table). Slug approval gate for slug squatting (admin review of slug registrations — governance policy, not schema). |
| **Host header spoofing** | Attacker sends `Host: victim.texqtic.app` to Fastify directly (bypassing Edge). | Fastify `tenantResolutionHook` only trusts `x-texqtic-tenant-id` if HMAC is validly signed (D7). Without Edge Middleware, no valid HMAC → hook is a no-op → no domain-based tenant context injected. JWT path still works normally. Vercel Deployment Protection (IP allowlist for Fastify origin) recommended. |
| **Tenant enumeration** | Attacker probes `a.texqtic.app`, `b.texqtic.app`, etc. to discover active tenants. | Resolver returns identical `{ status: "not_found" }` and identical HTTP timing for all unresolved slugs (D8, D6 §6.6). Rate limit: 10 req/s per IP (D4). No slug information in error body. |
| **Cache poisoning** | Attacker induces a stale cache entry mapping their host to a victim tenant_id. | Cache is populated only from HMAC-signed resolver backend (not from inbound headers). Cache key is the normalized host. Only the backend can write to the cache (no external cache write path). |
| **Replay attack on resolver** | Attacker captures a valid HMAC-signed Edge→Backend call and replays it. | 30-second timestamp window (D3, D6 §6.3). Replayed request with stale `x-texqtic-resolver-ts` → 401. |
| **HMAC secret leak** | `TEXQTIC_RESOLVER_SECRET` is committed to source or logged. | Secret is env-var only (Vercel dashboard + server env). Never printed in logs (log redaction rule). Never in source code. Rotation process: update env var → restart Edge and Fastify → old requests in transit gracefully fail (tolerable for 1 resolver call). |
| **Downgrade attack** | Attacker removes `x-texqtic-resolver-sig` from inbound request, hoping backend falls back to trusting `x-texqtic-tenant-id` alone. | Fastify `tenantResolutionHook`: if `x-texqtic-tenant-id` present but `x-texqtic-resolver-sig` absent or invalid → 401. No unsigned header is trusted. |
| **Timing attack on resolver** | Attacker times responses to distinguish "slug exists" from "slug not found". | DB query uses `LIMIT 1` with index scan. Constant-time padding not applied (slugs are not secrets — they appear in the subdomain itself). Rate limiting is the primary defence. |
| **Open redirect via `host` | Attacker crafts a host value that becomes a redirect target for the "not found" fallback. | Host normalization rules (D6 §6.5) must pass before any redirect is constructed. Redirect target is always a hardcoded platform domain + URL-encoded `host` query param — never a bare redirect to `host`. |
| **Wildcard subdomain abuse** | Attacker registers `api.texqtic.app`, `www.texqtic.app` as tenant slugs, hijacking platform paths. | Platform domain allowlist (D8 §8.5) bypasses resolution for reserved subdomains. Reserved slugs (`api`, `www`, `static`, `cdn`, `admin`, `app`, `auth`) must be blocked at tenant sign-up (tenant slug blocklist — governance policy). |

**Mitigation mapping to decisions:**

| Decision | Threats mitigated |
|----------|------------------|
| D1 (Hybrid) | Host header spoofing (HMAC required) |
| D3 (HMAC resolver) | Replay attacks, unauthorized resolver calls |
| D4 (Narrow bypass) | Tenant enumeration, data leak |
| D5 (TTL + invalidation) | Cache poisoning (bounded stale window) |
| D6 (Identical 404) | Tenant enumeration, timing attacks |
| D7 (Header stripping) | Host header spoofing, downgrade attacks |
| D8 (Fail-closed) | Resolver unavailability used as attack vector |

---

## §6 — Operational Runbook (v1)

### 6.1 Structured Log Fields

Every request processed by the resolver chain emits a structured log entry:

```json
{
  "event":                "domain_resolution",
  "request_id":           "<uuid>",
  "host":                 "<normalized_host>",
  "resolved_tenant_id":   "<uuid or null>",
  "tenant_source":        "<subdomain|custom_domain|fallback|none>",
  "resolver_latency_ms":  42,
  "cache_hit":            true,
  "resolver_status":      "<resolved|not_found|error|bypass>",
  "edge_region":          "<iad1|lhr1|...>",
  "timestamp":            "2026-03-05T12:34:56.789Z"
}
```

Sensitive fields: `host` is logged (it is a routing address, not a secret).
`resolved_tenant_id` is logged (needed for audit trail). No JWT content, no request
body, no cookie values in this log event.

### 6.2 Monitoring Signals

| Signal | Alert threshold | Action |
|--------|----------------|--------|
| `resolver_status=error` rate | > 1% of requests over 5 min | Page on-call; check Fastify healthcheck |
| `resolver_latency_ms` P99 | > 500 ms | Investigate Fastify cold start / DB pool exhaustion |
| `cache_hit` rate drop | < 50% over 10 min | Check Edge Middleware warm path; verify TTL not reduced |
| `resolver_status=not_found` spike | > 5× baseline over 1 min | Potential enumeration attack; check IP source; trigger rate limit review |
| HMAC validation failure | Any occurrences | Security alert; check for secret leak or spoofing attempt |

### 6.3 Rollback Strategy

Rollback of the domain routing feature requires:

1. Remove `middleware.ts` from repo root (or set `TEXQTIC_DOMAIN_ROUTING_ENABLED=false` kill switch).
2. Redeploy to Vercel (automatic CI trigger on commit).
3. Edge Middleware with kill switch: if env var is `false`, pass all requests through without resolution — falls back to existing JWT-only auth, SEEDED_TENANTS frontend.
4. No DB rollback required (no schema changes in TECS 6C).
5. No RLS rollback required.

**Kill switch design:** Add a single `if (!process.env.TEXQTIC_DOMAIN_ROUTING_ENABLED) return NextResponse.next()` at the top of `middleware.ts`. This is the first line executed by Edge Middleware.

### 6.4 Deployment Checklist for TECS 6C

- [ ] `TEXQTIC_RESOLVER_SECRET` set in Vercel env vars (production + preview)
- [ ] `TEXQTIC_RESOLVER_SECRET` set in server env vars (Fastify process)
- [ ] `TEXQTIC_PLATFORM_DOMAINS` set to `texqtic.app,texqtic.com,www.texqtic.app`
- [ ] `TEXQTIC_DOMAIN_ROUTING_ENABLED` set to `true` (or `false` for staged rollout)
- [ ] `texqtic_service` DB role created (separate migration — G-026-H gate)
- [ ] `tenants.active` column confirmed present (if not: add in TECS 6C1 preflight)
- [ ] Rate limiting configured on `/api/internal/resolve-domain` (Fastify rate-limit plugin or Vercel Rate Limiting)
- [ ] Monitoring + alerting configured before feature flag enabled

---

## §7 — TECS Execution Plan

### TECS 6C1 — Backend Resolver Endpoint

**Goal:** Implement `GET /api/internal/resolve-domain` in Fastify with HMAC auth and narrow DB query.

**Allowlist:**
- `server/src/routes/internal.ts` (NEW — internal route registration)
- `server/src/routes/index.ts` (register internal router)
- `server/src/lib/resolverHmac.ts` (NEW — HMAC helper)
- `prisma/migrations/<timestamp>_g026_service_role/migration.sql` (NEW — `texqtic_service` role, SELECT on tenants only)

**Stop conditions:**
- If `tenants` table does not have `slug` column → STOP, register gap
- If `tenants.active` column absent → STOP, register gap, add as prerequisite
- If DB migration for `texqtic_service` role cannot restrict to `tenants(id, slug)` → STOP, register gap G-026-H-blocker

**Success criteria:**
- `GET /api/internal/resolve-domain?host=acme.texqtic.app` with valid HMAC → `{ tenantId, tenantSlug, status: "resolved" }` in < 100 ms
- Invalid HMAC → `401` (no body)
- Nonexistent slug → `{ status: "not_found" }` (identical timing)
- Server typecheck EXIT 0; lint EXIT 0

---

### TECS 6C2 — Edge Middleware + Tenant Context Injection

**Goal:** Create `middleware.ts` at repo root; add `tenantResolutionHook` to Fastify.

**Allowlist:**
- `middleware.ts` (NEW — Vercel Edge Middleware entry point)
- `server/src/middleware/tenantResolution.ts` (NEW — Fastify onRequest hook)
- `server/src/routes/tenant.ts` (MODIFY — register tenantResolutionHook before tenantAuthMiddleware)
- `vercel.json` (VERIFY — no changes expected; routes already correct)
- `components/Auth/AuthFlows.tsx` (MODIFY — remove SEEDED_TENANTS dropdown for subdomain-resolved requests)

**Stop conditions:**
- If TECS 6C1 is not validated → STOP (resolver must exist before middleware)
- If `middleware.ts` conflicts with existing Vercel route rules → STOP, register gap
- If JWT + domain tenant_id mismatch logic ambiguity → STOP, clarify with D7 §7.3

**Success criteria:**
- Navigation to `acme.texqtic.app` in browser resolves to acme tenant login page
- `x-texqtic-tenant-id` + `x-texqtic-resolver-sig` headers present in Fastify request
- JWT-only path unchanged (existing API clients unaffected)
- Server typecheck EXIT 0; lint EXIT 0; no new RLS policies

---

### TECS 6C3 — Cache Layer (In-Memory TTL + Invalidation Webhook)

**Goal:** Add in-Edge cache map and `/api/internal/cache-invalidate` Fastify endpoint.

**Allowlist:**
- `middleware.ts` (MODIFY — add cache Map + TTL logic)
- `server/src/routes/internal.ts` (MODIFY — add `/api/internal/cache-invalidate` route)
- `server/src/routes/tenant.ts` or domain CRUD routes (MODIFY — emit invalidation webhook after domain CRUD)

**Stop conditions:**
- If TECS 6C2 is not validated → STOP (middleware must exist)
- If invalidation webhook cannot reach Edge Middleware in same Vercel deployment context → STOP, register gap G-026-F-blocker

**Success conditions:**
- Cache hit for second request within 60 s (resolver_latency_ms drops; cache_hit=true in logs)
- Domain deletion triggers cache flush within 1 s
- resolver_status=not_found after deleted domain within 60 s (may be up to TTL if webhook fails)

---

### TECS 6D — OPS-WLADMIN-DOMAINS-001 (WL Domains Management Panel)

**Goal:** Implement the domain management UI for WL Admin: list domains, add platform subdomain, remove domain, set primary.

**Allowlist:**
- `components/WhiteLabelAdmin/Domains.tsx` (NEW — domain management panel)
- `server/src/routes/tenant.ts` or a new `server/src/routes/domains.ts` (MODIFY/NEW — CRUD endpoints for `tenant_domains`)
- `services/tenantApiClient.ts` (MODIFY — add domain CRUD API client methods)

**Stop conditions:**
- If TECS 6C1/6C2 not validated → STOP (resolver must exist before management UI)
- If domain CRUD routes require new RLS policies → STOP, design separately

**Success conditions:**
- WL Admin can view, add, and remove platform subdomains for their tenant
- Add domain validates slug availability before writing
- Remove domain triggers cache invalidation within 1 s
- Typecheck EXIT 0; lint EXIT 0

---

### TECS Sequencing

```
G-026-CUSTOM-DOMAIN-ROUTING-DESIGN-001 (this TECS) ← ✅ COMPLETE
          │
          ▼
     TECS 6C1 (Backend resolver endpoint)
          │
          ▼
     TECS 6C2 (Edge middleware + context injection)
          │
          ▼
     TECS 6C3 (Cache + invalidation webhook)
          │
          ├──────────────────────────────┐
          ▼                              ▼
     TECS 6D (WL Domains UI panel)   [v1.1 — custom domains, G-026-A schema extension]
```

**Wave 4 parallelism constraint:** No more than 2 Wave 4 TECS open simultaneously.
6C1 must be sealed before 6C2 opens. 6C2 must be sealed before 6C3 opens.
6D may open in parallel with 6C3 (UI development is parallel-safe with cache layer).

---

## §8 — Open Sub-Gaps (Status after this TECS)

| Gap | Description | Status | Blocks |
|-----|------------|--------|--------|
| **G-026-A** | Missing DNS verification columns (`txt_record`, `verified_at`, `status`) on `tenant_domains` | 🔵 Deferred v1.1 | Custom domain support |
| **G-026-B** | No public domain resolver endpoint | ✅ Resolved by D6 (internal, not public) | — |
| **G-026-C** | No `middleware.ts` | ✅ Resolved by D1 (created in TECS 6C2) | — |
| **G-026-D** | No slug-subdomain routing | ✅ Resolved by D2 + TECS 6C2 | — |
| **G-026-E** | RLS bypass for pre-auth lookup | ✅ Resolved by D4 (narrow resolver endpoint) | — |
| **G-026-F** | No cache infrastructure | ✅ Resolved by D5 (Edge in-memory, TECS 6C3) | — |
| **G-026-G** | WL Domains management panel | ✅ Unblocked — TECS 6D | — |
| **G-026-H** *(new)* | `texqtic_service` DB role with BYPASSRLS not created. Migration required (SQL-only, SELECT on tenants only). | 🔴 Blocking TECS 6C1 deploy | 6C1 deploy gate |

---

*Document produced by: GitHub Copilot — G-026-CUSTOM-DOMAIN-ROUTING-DESIGN-001*  
*No code changes. No schema changes. No migrations. No RLS changes. Plan only.*  
*Governance sync: GOVERNANCE-SYNC-089 — 2026-03-05*
