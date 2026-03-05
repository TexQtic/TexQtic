# Custom Domain Routing — Discovery Document

**TECS ID:** G-026-CUSTOM-DOMAIN-ROUTING-DISCOVERY-001  
**Status:** ✅ Discovery Complete — Pending Design TECS  
**Date:** 2026-03-05  
**Wave:** 4 — Custom Domain Routing  
**Governance Sync:** GOVERNANCE-SYNC-088  
**Author:** GitHub Copilot — investigation only, no schema/code changes

---

## 1. System Context (G-026)

G-026 targets the final white-label capability gap: resolving inbound HTTP requests by
`Host` header to a tenant identity so that a custom domain (e.g., `boutique.acme.com`)
routes to the correct tenant context without a tenant-selector UI element.

**Current state:** All tenant context is JWT-derived. The frontend uses a hardcoded
`SEEDED_TENANTS` dropdown to select a tenant before login. No Host-based resolution
exists anywhere in the request pipeline.

**Prerequisite satisfied:** `tenant_domains` table exists with `ENABLE FORCE ROW LEVEL
SECURITY` applied (supabase_hardening.sql; Wave 3 Tail RLS applied GOVERNANCE-SYNC-054).

This document is the output of the **investigation phase only**. Nothing in this document
represents a schema change, migration, or code change.

---

## 2. Current `tenant_domains` Schema

### 2.1 Prisma Model (authoritative)

Source: `server/prisma/schema.prisma` lines 43–50.

```prisma
model TenantDomain {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  domain    String   @unique @db.VarChar(255)
  verified  Boolean  @default(false)
  primary   Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@map("tenant_domains")
}
```

### 2.2 Column Inventory

| Column | DB Type | Nullable | Default | Notes |
|--------|---------|----------|---------|-------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `tenant_id` | `UUID` | NOT NULL | — | FK → `tenants(id)` ON DELETE CASCADE |
| `domain` | `VARCHAR(255)` | NOT NULL | — | **UNIQUE** — canonical domain→tenant key |
| `verified` | `BOOLEAN` | NOT NULL | `false` | Domain ownership flag |
| `primary` | `BOOLEAN` | NOT NULL | `false` | Marks the tenant's primary custom domain |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | |

**Index:** `INDEX (tenant_id)` — forward lookup (all domains for a tenant).
**Unique:** `UNIQUE (domain)` — one tenant per domain, enforced at DB level.

### 2.3 Suitability for Domain→Tenant Mapping

| Requirement | Available? | Notes |
|-------------|-----------|-------|
| Domain string storage | ✅ Yes | `domain VARCHAR(255) UNIQUE` |
| Tenant FK | ✅ Yes | `tenant_id UUID → tenants(id)` |
| Verification flag | 🟡 Partial | `verified BOOLEAN` — binary; no timestamp or challenge token |
| DNS challenge token | 🔴 No | No `txt_record`, `challenge_token`, or `dns_type` column |
| Verification timestamp | 🔴 No | No `verified_at TIMESTAMPTZ` column |
| Domain status lifecycle | 🔴 No | No `status` column (e.g., PENDING / ACTIVE / FAILED / EXPIRED) |
| Updated-at tracking | 🔴 No | No `updated_at` column |

**Finding:** The table supports the core domain→tenant lookup query
(`SELECT tenant_id FROM tenant_domains WHERE domain = $host AND verified = true`).
However, a production-grade DNS verification flow (TXT record challenge/response, status
tracking, re-verification) **requires schema extension**. This is recorded as
**Schema Gap G-026-A**.

> ⚠️ **STOP CONDITION ASSESSMENT:**  
> The `tenant_domains` table CAN support domain→tenant mapping for the lookup path
> (domain UNIQUE index, tenant_id FK, verified flag present). STOP CONDITION NOT
> TRIGGERED for the routing feature itself.  
> Schema Gap G-026-A (missing DNS verification columns) is registered but does NOT block
> a v1 routing implementation that trusts admin-set `verified=true` without a self-service
> DNS challenge flow.

---

## 3. Current RLS Posture

### 3.1 RLS Enablement

Source: `server/prisma/supabase_hardening.sql` lines 57, 63.

```sql
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains FORCE ROW LEVEL SECURITY;
```

`FORCE ROW LEVEL SECURITY` is confirmed applied. Even postgres superuser (BYPASSRLS)
is subject to RLS when connecting via the `texqtic_app` role, which is Fastify's runtime
DB role.

### 3.2 Policy Inventory

Wave 3 Tail pattern applied (GOVERNANCE-SYNC-054: `20260315000003_g006c_p2_tenant_domains_rls_unify`).
Canonical end state:

| Policy Name | Type | Command | Predicate (USING / WITH CHECK) |
|-------------|------|---------|-------------------------------|
| `tenant_domains_guard` | RESTRICTIVE | FOR ALL TO `texqtic_app` | `app.require_org_context() OR app.bypass_enabled() OR app.is_admin='true'` |
| `tenant_domains_tenant_select` | PERMISSIVE | SELECT | `tenant_id = app.current_org_id() OR app.bypass_enabled()` |
| `tenant_domains_tenant_insert` | PERMISSIVE | INSERT | `app.require_org_context() AND tenant_id = app.current_org_id() OR bypass` |
| `tenant_domains_tenant_update` | PERMISSIVE | UPDATE | USING + WITH CHECK same; admin arm: `is_admin='true'` |
| `tenant_domains_tenant_delete` | PERMISSIVE | DELETE | `is_admin='true'` (admin-only delete) |

**Critical note for G-026:** The RESTRICTIVE guard requires `app.require_org_context()`,
which returns true only if `app.org_id` is set in the current session. This means
**the domain→tenant lookup query CANNOT go through the normal `withDbContext` path**:
the lookup happens BEFORE a tenant is known, so `app.org_id` cannot be set yet.

**Required approach:** The domain lookup query must use one of:
- `app.bypass_enabled()` arm (admin-context or bypass mode), or  
- A database function with `SECURITY DEFINER` that bypasses RLS for this specific lookup, or  
- A service-account connection (BYPASSRLS role) used exclusively for the domain lookup, or  
- A pre-auth public endpoint that reads `tenant_domains` via the bypass arm.

This is the central RLS constraint that the Design TECS must resolve. See §6.

---

## 4. Existing Tenant Resolution (Current State)

### 4.1 Current Request Flow

```
Client Request
    │
    ▼
Fastify (api/index.ts or server/src/*)
    │
    ├─ realmHintGuardOnRequest (reads X-Texqtic-Realm header)
    │
    ├─ tenantAuthMiddleware (reads JWT from Authorization header or cookie)
    │      └─ Extracts payload.tenantId (= org_id / tenants.id)
    │      └─ Verifies membership (prisma.membership.findFirst)
    │      └─ Sets request.tenantId, request.userId, request.userRole
    │
    ├─ databaseContextMiddleware (builds DatabaseContext from request)
    │      └─ Sets app.org_id, app.actor_id, app.realm, app.is_admin GUCs (tx-local)
    │
    └─ Route handler
           └─ withDbContext(prisma, request.dbContext, ...) → RLS-scoped queries
```

### 4.2 JWT-Derived Tenant Context

`server/src/middleware/auth.ts`:

```typescript
// tenantAuthMiddleware extracts tenant from JWT payload only
const payload = request.user as { userId?: string; tenantId?: string };
request.tenantId = payload.tenantId;   // ← the only tenant resolution mechanism
```

`server/src/lib/tenantContext.ts`:

```typescript
// Priority order for tenant context:
// 1. JWT payload (tenantId + userId) — preferred
// 2. Admin realm (isAdmin) — cross-tenant
// 3. X-Tenant-Id header — REMOVED (G-W3-A1 cleanup)
// No domain/host-based resolution exists
```

### 4.3 Frontend Tenant Selection

`components/Auth/AuthFlows.tsx`:

```tsx
{/* TODO: Replace with dynamic tenant resolver once GET /api/public/tenants/resolve exists */}
<select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)}>
  {SEEDED_TENANTS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
</select>
```

A `GET /api/public/tenants/resolve?slug=<slug>` endpoint is documented as a known
TODO in the codebase (`docs/audits/G-W3-AUDIT-001-ui-routing-contract.md`). It does not
yet exist. G-026 should implement the Host-based equivalent.

### 4.4 MiddlewareScaffold.tsx — Aspirational Stub

`components/ControlPlane/MiddlewareScaffold.tsx` renders a UI code panel showing
aspirational Next.js middleware that reads `hostname` and calls `resolveTenant()`.
This is **documentation/UI display only** — it is not actual routing logic. No
`src/middleware.ts` (Vercel Edge Middleware entry point) exists in the repo.

### 4.5 Vercel Deployment Architecture

`vercel.json`:

```json
{
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.ts" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

- All `/api/*` routes go to `api/index.ts` (Fastify serverless function).
- Static SPA assets served from `dist/` via filesystem handler.
- Frontend (`/index.html`) catches all non-API, non-asset routes (SPA fallback).
- **No `vercel/middleware.ts` (Edge Runtime) entry point exists.** Vercel Edge
  Middleware would be the natural insertion point for Host→tenant resolution before
  the Fastify serverless function receives the request.

---

## 5. Domain Lookup Strategy Candidates

### Option A — Vercel Edge Middleware (Recommended for Vercel deployments)

**Design:** Create `middleware.ts` at repo root. Vercel executes this at the Edge
(V8 isolate, global CDN) before the serverless function.

```typescript
// middleware.ts (aspirational — illustrative)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.split(':')[0];  // strip port
  if (!host || host.endsWith('.vercel.app') || host === 'texqtic.com') {
    return NextResponse.next();  // skip for platform domains
  }
  // Lookup: host → tenant_id (via edge KV or API call)
  const tenantId = await resolveDomainToTenant(host);
  if (!tenantId) {
    return new Response('Domain not recognized', { status: 404 });
  }
  // Inject tenant context as header for backend
  const headers = new Headers(req.headers);
  headers.set('X-Texqtic-Tenant-Id', tenantId);
  return NextResponse.next({ request: { headers } });
}
```

| Dimension | Assessment |
|-----------|-----------|
| Latency | ✅ Edge execution — sub-millisecond before serverless cold start |
| Tenant context propagation | Pass `X-Tenant-Id` header to Fastify (backend must validate and trust) |
| Caching | ✅ Can cache domain→tenant map in Vercel KV or Edge Config |
| DB lookup | 🟡 Edge cannot connect to Postgres directly; requires API call or KV cache |
| Complexity | Medium — requires Edge Config or separate KV store sync |
| RLS bypass need | ✅ Domain lookup happens outside RLS boundary (Edge Runtime) |
| Vercel-specific | 🔴 Does not apply to self-hosted or Docker deployments |
| New file | `middleware.ts` at repo root (Vercel convention) |

**DB access pattern:** Edge cannot use Prisma/Postgres. Two sub-options:
- **A1:** Vercel Edge Config (key-value store, ~0ms reads) — domain→tenant_id map synced on domain CRUD events.
- **A2:** Upstream API call to `GET /api/internal/resolve-domain?host=...` — adds ~50–100ms latency.

---

### Option B — Fastify Middleware (Backend-only, deployment-agnostic)

**Design:** Add a Fastify `onRequest` hook that fires before `tenantAuthMiddleware`.
Reads `request.hostname` (from `Host` header), looks up `tenant_domains`, and injects
`X-Texqtic-Resolved-Tenant` into the request for downstream handlers.

```typescript
// In api/index.ts or a new preAuth hook
fastify.addHook('onRequest', async (request, reply) => {
  const host = request.hostname;
  if (!isCustomDomain(host)) return;     // skip platform domains
  const row = await lookupDomainBypass(host);   // bypass-context Prisma query
  if (!row) return reply.code(404).send({ error: 'Unknown domain' });
  request.resolvedTenantId = row.tenant_id;     // augment request
});
```

| Dimension | Assessment |
|-----------|-----------|
| Latency | 🟡 Adds one DB round-trip per request (unless cached) |
| Tenant context propagation | Augment `FastifyRequest` with `resolvedTenantId` |
| Caching | Requires in-process LRU cache (e.g., `lru-cache`) to avoid per-request DB hit |
| DB lookup | Uses Prisma with bypass-enabled context (see §3.2 RLS note) |
| Complexity | Low — pure TypeScript, no new infrastructure |
| RLS bypass need | 🔴 Must use `withBypassForSeed` / bypass-enabled context (governance review required) |
| Deployment portability | ✅ Works on any Node.js host (Docker, serverless, self-hosted) |
| New file | New pre-auth hook or augmentation to existing Fastify setup |

**RLS concern:** The lookup requires reading `tenant_domains` before `app.org_id` is
set. Must use admin-context or bypass arm. Governance constraint: bypass context must
not leak to downstream handlers.

---

### Option C — Hybrid: Edge Resolves + Backend Validates

**Design:** Vercel Edge Middleware resolves domain→tenant_id (from Edge Config cache)
and injects `X-Texqtic-Tenant-Id` header. Fastify backend validates the header against
`tenant_domains` before trusting it (defence-in-depth, prevents header spoofing).

```
Client → Edge Middleware (resolve: host → tenant_id, inject header)
       → Fastify onRequest hook (validate header against tenant_domains)
       → tenantAuthMiddleware (JWT verification — tenant_domains lookup superseded by JWT)
       → Route handler
```

| Dimension | Assessment |
|-----------|-----------|
| Latency | ✅ Edge resolution from cache — fast path |
| Security | ✅ Backend validation prevents header spoofing from non-Edge callers |
| Complexity | High — two resolution layers; cache sync required |
| Cache invalidation | 🔴 Must propagate domain CRUD events to Edge Config |
| Deployment portability | 🔴 Edge layer is Vercel-specific |
| RLS bypass need | 🟡 Validation query can use admin-context; bypass arm not required for validation |

---

### Comparison Matrix

| Criterion | Option A (Edge Middleware) | Option B (Fastify Hook) | Option C (Hybrid) |
|-----------|--------------------------|------------------------|-------------------|
| Implementation complexity | Medium | Low | High |
| Deployment portability | 🔴 Vercel-specific | ✅ Universal | 🔴 Vercel-specific |
| Latency overhead | ✅ Minimal (Edge cache) | 🟡 +DB round-trip | ✅ Minimal |
| RLS bypass required | No (Edge is outside Postgres) | 🔴 Yes (pre-auth hook) | 🟡 Partial (validation only) |
| Cache infrastructure | Requires Vercel KV/Edge Config | Requires in-process LRU | Requires Vercel KV/Edge Config |
| Security | 🟡 Header injection (trust Edge) | ✅ DB-authoritative | ✅ Double-validated |
| Recommended for v1 | ✅ If Vercel-native | ✅ If portability needed | ❌ Too complex for v1 |

> **No recommendation is made in this TECS** — strategy selection is the responsibility
> of the Design TECS (G-026). However, the TexQtic stack is deployed to Vercel (vercel.json
> present), making Option A or C the natural fit.

---

## 6. DNS Architecture

### 6.1 Expected DNS Pattern

For a tenant with a custom domain `boutique.acme.com` pointing to TexQtic:

**CNAME pattern (recommended for subdomains):**

```
boutique.acme.com.  IN  CNAME  texqtic.com.
```

or if using Vercel's infrastructure directly:

```
boutique.acme.com.  IN  CNAME  cname.vercel-dns.com.
```

**A-record pattern (for apex domains — requires Vercel A record):**

```
acme.com.  IN  A  76.76.21.21   (Vercel IP — changes; use their current docs)
```

**Wildcard subdomain (platform operator wildcard, not per-tenant):**

```
*.texqtic.com.  IN  A  <Vercel IP>
```
Used for `<slug>.texqtic.com` subdomains (no custom domain required). Resolution:
parse slug from hostname → look up `tenants.slug`.

### 6.2 DNS Verification Flow (TXT Record Challenge)

The standard self-service flow for domain ownership verification:

```
1. Tenant submits domain via WL Admin Domains panel UI
2. Backend generates a unique challenge token (e.g., UUID or HMAC)
3. Backend stores token in tenant_domains (column: txt_record — MISSING, see G-026-A)
4. UI instructs tenant to add TXT record:
      _texqtic-verify.boutique.acme.com  IN  TXT  "texqtic-verify=<token>"
5. Verification job (cron or webhook): DNS TXT lookup → compare token → set verified=true
6. Once verified, domain is active for routing
```

> ⚠️ **Schema Gap G-026-A:** Steps 3–5 require columns not present in `tenant_domains`.
> See §9 for gap registration.

### 6.3 Platform Subdomain Pattern (No DNS Verification Required)

A simpler v1 path: `<slug>.texqtic.com` subdomain routing, resolved entirely by the
platform. No DNS verification needed — slug is read from the hostname.

```
api.texqtic.com             → control plane
<slug>.texqtic.com          → tenant slug lookup → tenant_id
<slug>.texqtic.com/api/*    → Fastify (with resolved tenant context)
```

This is implementable with the current schema (no gap) and enables the WL Domains panel
before custom domain support is added.

---

## 7. Security Considerations

### 7.1 Domain Hijack

**Risk:** A malicious actor registers a domain in `tenant_domains` before the legitimate
owner, gaining routing access to that hostname.

**Mitigations required:**
- Domain verification MUST be enforced before routing is activated (`verified = true`).
- DNS ownership challenge (TXT record) is the standard mechanism (requires G-026-A).
- Duplicate domain registration must be blocked at DB level — `UNIQUE (domain)` ✅ already
  present. First registration wins; attacker cannot re-register an already-claimed domain.
- Admin-only domain approval gate (optional for high-risk domains).

### 7.2 Cache Poisoning

**Risk:** If domain→tenant resolution is cached (Edge Config or in-process LRU), a stale
cache entry could route requests to the wrong tenant after a domain transfer or deletion.

**Mitigations required:**
- Cache TTL must be short (≤ 60 seconds) or invalidated on `tenant_domains` mutations.
- Cache must be keyed by `domain` (not tenant_id) and validate the `verified` flag.
- Domain deactivation (admin sets `verified = false` or deletes row) must propagate to
  cache within TTL window. Edge Config invalidation events should trigger cache flush.

### 7.3 Tenant Enumeration

**Risk:** An attacker probes `*.texqtic.com` or injects arbitrary `Host` headers to
enumerate valid tenant slugs or org IDs from response differences.

**Mitigations required:**
- Unknown hostname: return identical `404` for all unresolved domains (no timing
  differentiation).
- `tenant_id` must not be exposed in error responses from the domain resolver.
- Rate-limit the domain resolution endpoint (Edge or Fastify).
- Slug-based subdomains: validate slug format before lookup (alphanumeric + hyphens only).

### 7.4 Header Spoofing (Option A / C)

**Risk:** If Fastify trusts an `X-Texqtic-Tenant-Id` header injected by Edge Middleware,
a direct caller (bypassing Edge) could inject a fabricated tenant_id.

**Mitigations required:**
- Backend must validate the injected header against `tenant_domains` before trusting it
  (Option C double-validation).
- Alternatively, add a shared signing secret: Edge signs the header with `HMAC-SHA256`,
  backend verifies signature before parsing tenant_id.
- Firewall direct access to Fastify origin URL (Vercel: use deployment protection).

### 7.5 Wildcard Certificate Management

**Risk:** Each custom domain requires a TLS certificate. Wildcard certs (`*.texqtic.com`)
do not cover custom apex or subdomain domains (`boutique.acme.com`).

**Mitigations required:**
- Vercel automatically provisions Let's Encrypt certificates for domains added to a
  project via the Vercel Domains API. This is handled at the hosting layer.
- For self-hosted: use `cert-manager` (Kubernetes) or `caddy` (automatic ACME).
- Certificate provisioning should be decoupled from routing activation — cert must be
  provisioned (or confirmed) before `verified = true` is set, otherwise HTTPS requests
  fail before reaching the app.

### 7.6 DNS TTL and Propagation Lag

**Risk:** After domain removal, DNS caches may still route traffic to the old tenant
for up to the TTL window (typically 5 minutes – 24 hours).

**Mitigations required:**
- Advise tenants to use low TTL (300s) before CNAME change.
- Backend must check `verified = true` AND `tenant_id` FK validity on every request
  (active routing) even if resolution is cached at Edge.
- Domain deletion should immediately set `verified = false` in the database to blacklist
  further routing, even if DNS propagation is still in progress.

---

## 8. Known Gaps

| Gap ID | Category | Description | Blocking for v1? |
|--------|----------|-------------|-----------------|
| **G-026-A** | Missing columns | `tenant_domains` has no `txt_record`, `verified_at`, `status`, `updated_at`, or `dns_challenge_type` column. TXT-record DNS verification workflow cannot be implemented without schema extension. | 🟡 Medium — v1 can use admin-set `verified=true`; self-service DNS challenge deferred |
| **G-026-B** | Missing public endpoint | No `GET /api/public/resolve-domain?host=...` endpoint exists. The domain→tenant lookup for pre-auth use (login page resolution) has no API surface. Known TODO in `AuthFlows.tsx`. | 🔴 Yes — required for both Edge and Fastify routing options |
| **G-026-C** | No Edge Middleware | No `middleware.ts` at repo root. Vercel Edge layer is entirely absent. Option A requires this file. | 🔴 Yes for Option A |
| **G-026-D** | No slug-based subdomain routing | `<slug>.texqtic.com` subdomain parsing is not implemented at any layer. Platform subdomains are not currently distinctive from the main domain. | 🔴 Yes for subdomain routing v1 |
| **G-026-E** | RLS bypass for pre-auth lookup | Domain→tenant lookup must happen before `app.org_id` is set. Current RLS guard (`require_org_context()`) blocks this. A bypass-context lookup or SECURITY DEFINER function is required. Governance review mandatory before any bypass-arm extension. | 🔴 Yes for Option B |
| **G-026-F** | Cache invalidation infrastructure | No Vercel Edge Config or KV store is provisioned. Domain map caching (Option A/C) requires either Edge Config API or a separate KV service. | 🔴 Yes for Option A/C |
| **G-026-G** | WL Domains panel (`OPS-WLADMIN-DOMAINS-001`) | UI panel for domain management (add, verify, set primary) does not exist beyond WLStubPanel. Blocked on G-026 design. | 🟡 Medium — stub functional; full panel is G-026 follow-on |

---

## 9. Gap Registration — G-026-A (Schema)

The following gap is registered from this discovery:

**G-026-A — Missing DNS Verification Columns on `tenant_domains`**

Required columns for a production DNS verification flow:

```sql
-- Required schema extension (NOT APPLIED — registered only)
ALTER TABLE public.tenant_domains
  ADD COLUMN IF NOT EXISTS txt_record          TEXT,           -- DNS challenge token
  ADD COLUMN IF NOT EXISTS dns_challenge_type  TEXT DEFAULT 'TXT',
  ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status              TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT now();

-- Optional: status CHECK constraint
ALTER TABLE public.tenant_domains
  ADD CONSTRAINT tenant_domains_status_check
  CHECK (status IN ('PENDING', 'ACTIVE', 'FAILED', 'EXPIRED', 'REVOKED'));
```

**Blocking for v1:** No — a v1 implementation can skip self-service DNS verification by
having admins manually set `verified = true` via the control plane after confirming DNS
externally. Schema extension is required only for self-service WL tenant domain management.

---

## 10. Inputs Required for Design TECS (G-026)

The following decisions must be made in the G-026 Design TECS:

1. **Routing insertion point (Option A / B / C)**  
   Choose where Host→tenant resolution occurs: Vercel Edge, Fastify pre-auth hook, or hybrid.
   → Determines new files and deployment infrastructure required.

2. **Platform subdomain vs. custom domain — v1 scope**  
   Decide whether v1 ships `<slug>.texqtic.com` subdomain routing (no DNS verification needed)
   or full custom domain routing (requires G-026-A schema extension).

3. **RLS bypass strategy for domain lookup**  
   For Option B: choose between SECURITY DEFINER function, admin-context bypass, or a
   dedicated service-level connection without RLS. Must pass governance review.
   → Resolves G-026-E.

4. **Cache strategy**  
   Decide between: no cache (DB-authoritative, +latency), in-process LRU (Option B),
   or Vercel Edge Config/KV (Option A/C). Define TTL and invalidation trigger.

5. **DNS verification UX**  
   Decide whether v1 requires self-service TXT challenge or relies on admin-set `verified=true`.
   → Determines whether G-026-A schema extension is in scope for v1.

6. **Public resolver endpoint scope**  
   Define `GET /api/public/resolve-domain?host=...` response shape.
   Must not expose `tenant_id` or `org_id` in the response (enumeration risk).
   May return only a `{ slug, name, loginUrl }` safe subset.
   → Resolves G-026-B and unblocks `AuthFlows.tsx` TODO.

7. **Header signing for Option A/C**  
   Decide whether Edge injects `X-Texqtic-Tenant-Id` with HMAC signature or uses a
   separate lookup on the backend. Shared secret lifecycle must be documented.

8. **Domain deactivation flow**  
   Define what happens when a domain is deleted or `verified` is set to `false`.
   Cache flush, routing blacklist, and re-verification flow must be specified.

---

## 11. Recommended TECS Sequence (from this discovery)

```
G-026 TECS 1 (Design Anchor) — decisions D1–D8 locked; v1 scope defined
G-026 TECS 2A — Public resolver endpoint (GET /api/public/resolve-domain)
G-026 TECS 2B — Platform subdomain routing (<slug>.texqtic.com via Edge or Fastify hook)
G-026 TECS 2C — Custom domain routing + DNS verification (if G-026-A in scope for v1)
G-026 TECS 2D — OPS-WLADMIN-DOMAINS-001 (WL Domains management UI panel)
```

Each TECS must be atomic. TECS 2A can proceed without the Design Anchor if D6 (public endpoint
scope) is approved separately.

---

*Document produced by: GitHub Copilot — G-026-CUSTOM-DOMAIN-ROUTING-DISCOVERY-001*  
*No schema changes. No view creation. No migrations. Investigation only.*  
*Governance sync: GOVERNANCE-SYNC-088 — 2026-03-05*
