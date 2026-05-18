# PUBLIC-SEO-INFRASTRUCTURE-DECISION-001
## Public SEO Infrastructure Decision

**Unit ID:** PUBLIC-SEO-INFRASTRUCTURE-DECISION-001
**Family:** D2C Public Projection Governance
**Status:** DECIDED
**Date:** 2026-05-18
**Authorized by:** Paresh
**Artifact class:** Governance decision — decision-only, no runtime changes
**Placement:** Repo root (consistent with D2C-COLLECTION-SEO-GOVERNANCE-001, PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001, PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001)

---

## 1. Status Summary

| Field | Value |
|---|---|
| Unit ID | PUBLIC-SEO-INFRASTRUCTURE-DECISION-001 |
| Status | DECIDED |
| Scope | Infrastructure approach for implementing SEO metadata on D2C public collection surfaces (`/collections`, `/collections/:slug`) |
| Blocking | None |
| Depends on | D2C-COLLECTION-SEO-GOVERNANCE-001, PUBLIC-COLLECTION-DETAIL-PROJECTION-IMPLEMENTATION-001 (commit `49219995`) |
| Implementation gate for next unit | OPEN — decision is made; implementation unit may proceed |
| Runtime changes introduced by this unit | None |
| Schema changes introduced | None |
| API changes introduced | None |
| Package changes introduced | None |

---

## 2. Current Repo Truth

### 2.1 Collection Surfaces (As of commit `49219995`)

| Surface | Path | App State | Component | Status |
|---|---|---|---|---|
| Collections list | `/collections` | `PUBLIC_COLLECTIONS` | `PublicCollectionsStub` | Static config-backed stub |
| Collection detail (approved slug) | `/collections/:slug` | `PUBLIC_COLLECTION_DETAIL` | `PublicCollectionDetail` | Live static projection (5 slugs) |
| Collection detail (unknown slug) | `/collections/:slug` | `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | `PublicCollectionUnavailable` | Safe unavailable placeholder |

### 2.2 Current SEO Implementation — Exact Repo State

Verified by direct inspection of `index.html`, `App.tsx`, `package.json`, `vite.config.ts`, and all Public component files:

**`index.html` (repo root):**
```html
<title>TexQtic Platform</title>
```
- Single global static `<title>` tag only.
- No `<meta name="description">`.
- No Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`).
- No Twitter Card tags.
- No `<link rel="canonical">`.
- No `<meta name="robots">` or `<meta name="googlebot">`.
- No JSON-LD `<script type="application/ld+json">` blocks.
- No `<link rel="sitemap">` reference.

**`App.tsx` document title pattern:**
- `document.title` is set via a `useMemo` → `useEffect` pattern.
- Per-state title strings are defined for all current app states including `PUBLIC_COLLECTIONS`, `PUBLIC_COLLECTION_DETAIL`, and `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE`.
- Document title values:
  - `PUBLIC_COLLECTIONS` → `'TexQtic — Verified Textile Collections'`
  - `PUBLIC_COLLECTION_DETAIL` → `'TexQtic — Verified Textile Collection'` (generic; not collection-title-specific)
  - `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` → `'TexQtic — Verified Collection Preview'`
- No per-collection-specific title (e.g., collection name is not wired into the document title for detail pages).
- No meta description, canonical, OG, Twitter Card, or robots directive management exists anywhere in `App.tsx` or any component.

**No SEO libraries or head managers exist in the repo:**
- No `react-helmet`, `react-helmet-async`, `@vueuse/head`, `react-head`, `@unhead/react`, or similar.
- Confirmed absence in `package.json` (root), `package.json` (server), and full repo grep.

**No SEO utilities exist in the repo:**
- No `seo/` directory, no `meta/` directory.
- No `useMetaTags`, `usePageMeta`, `useSeoHead`, `useDocumentMeta`, or similar custom hooks.
- No `insertAdjacentHTML`, `createElement('meta')`, `querySelector('meta')`, or `head.append` patterns anywhere.

**No sitemap exists:**
- No `sitemap.xml` in `public/` or anywhere.
- No sitemap generation scripts or routes.

**No `robots.txt` exists:**
- Not in `public/`, not served from any route.

**No JSON-LD or structured data emission exists:**
- No `<script type="application/ld+json">` in any component, page, or template.

**`vite.config.ts`:**
- Standard `@vitejs/plugin-react` config.
- No SSR plugin, no prerender plugin, no static site generation (SSG) plugin, no `vite-plugin-sitemap`, no head manager integration.

**`@fastify/helmet`:**
- Present in `package.json` (`^13.0.2`). This is a Fastify HTTP security header plugin (Content-Security-Policy, X-Frame-Options, etc.), not a frontend SEO library.
- Irrelevant to frontend `<head>` metadata management.

### 2.3 Architecture Summary

- **SPA (Single-Page Application), client-side routing only.** Vite + React 19. No SSR, no SSG, no prerendering pipeline.
- **Routing:** Module-level `resolveInitialAppState()` reads `window.location.pathname` at app initialization. `document.title` updated via `useEffect` on state change.
- **No server-side HTML injection** of metadata: Fastify backend serves API routes only; HTML is served as the static `index.html` shell.
- **Build output:** `tsc && vite build` — produces static SPA bundle. No server-rendered HTML per route.

---

## 3. Problem Statement

The D2C public collection surfaces now have a live runtime projection (`PUBLIC_COLLECTION_DETAIL` for 5 approved slugs), governance rules for SEO metadata are defined in `D2C-COLLECTION-SEO-GOVERNANCE-001`, but **no mechanism exists to inject per-page SEO metadata** into the browser `<head>` beyond `document.title`.

To implement the metadata fields required by `D2C-COLLECTION-SEO-GOVERNANCE-001` — meta description, canonical URL, Open Graph tags, Twitter Card tags, and robots directives — the codebase needs a defined, safe, repo-local mechanism for managing document `<head>` metadata from React component trees.

This unit decides that mechanism before any implementation unit writes code.

---

## 4. Decision Goals

1. **Minimal footprint.** The infrastructure must be as small as possible. No over-engineering for a capability that currently applies only to public collection surfaces.
2. **No new dependencies unless clearly justified.** Adding an npm package introduces supply-chain risk, version coupling, and maintenance burden. A dependency is only warranted if the manual alternative requires unsafe DOM manipulation at scale.
3. **Public/private boundary safe.** The mechanism must never emit private identifiers, auth state, or internal fields into metadata. Fail-closed behavior is required.
4. **SSR-agnostic decision.** The platform is a Vite SPA. SSR is not planned in the current phase. The infrastructure decision must be valid for the current SPA architecture. If SSR is ever introduced, a separate infrastructure revision is required.
5. **Non-intrusive to existing app state.** The mechanism must not require refactoring `App.tsx` document title behavior, existing app states, or any non-Public component.
6. **Governance-compliant.** Every field emitted must respect `D2C-COLLECTION-SEO-GOVERNANCE-001` claim rules, fallback rules, noindex rules, and canonical URL rules.

---

## 5. Options Considered

### Option A — Manual `document.title` only (extend current pattern)

**Description:** Continue using the existing `useEffect(() => { document.title = ... })` pattern. Add per-collection title wiring (e.g., include collection name in the title string) but make no other metadata changes.

**Assessment:**
- Title is the only head field this approach can manage.
- Provides zero improvement for meta description, canonical, OG, Twitter Card, or robots directives.
- Fails to meet `D2C-COLLECTION-SEO-GOVERNANCE-001` requirement for per-page metadata fields.
- **REJECTED.** Does not satisfy the problem statement.

### Option B — Custom DOM utility / hook (repo-local, no library)

**Description:** Create a small, repo-local utility (e.g., `utils/publicPageMeta.ts`) that directly manipulates `document.head` via standard DOM APIs (`querySelector`, `setAttribute`, `createElement`, `appendChild`). Wrap in a React hook or side-effect function called from the public collection components or `App.tsx`.

**Assessment:**
- No new npm dependency.
- Full control: only emits what is explicitly defined.
- Auditable: every field is visible in the repo as plain TypeScript.
- Easy to fail-closed: utility function receives a typed struct; unset fields produce safe fallbacks.
- DOM manipulation is safe and idiomatic in SPA architecture (the same pattern that `document.title` uses).
- Cleanup on unmount or route change is achievable via `useEffect` return function.
- Scoped entirely to public collection surfaces; no impact on tenant/auth/B2B states.
- Disadvantage: requires writing and maintaining cleanup logic; potential for stale tags if cleanup is incomplete.
- Risk is manageable with a defined set of managed tag selectors (constant list, always cleaned up on each call).
- **VIABLE.**

### Option C — React Helmet or Helmet Async (`react-helmet-async`)

**Description:** Add `react-helmet-async` (or `react-helmet`) as an npm dependency. Wrap app in `<HelmetProvider>`. Use `<Helmet>` component inside Public components to declare per-page metadata.

**Assessment:**
- `react-helmet-async` is well-maintained and widely used.
- Provides declarative, component-level head management with automatic cleanup.
- Introduces a new npm dependency (package, version pin, supply-chain exposure).
- Adds `<HelmetProvider>` wrapping requirement to `App.tsx` or `index.tsx` — a change outside the public collection scope.
- React 19 compatibility: `react-helmet-async` v2.x supports React 18/19; however, the library uses its own internal context model which may require verification against React 19's concurrent features.
- Overhead for a capability limited to ~5 public collection routes is disproportionate.
- `react-helmet` (unmaintained) is explicitly disqualified.
- `react-helmet-async` is viable but adds unnecessary dependency weight for a problem solvable with ~40 lines of repo-local DOM code.
- **VIABLE but NOT RECOMMENDED** for the current phase.

### Option D — Server / build-time per-page HTML generation (SSR / SSG / prerendering)

**Description:** Introduce a build-time or server-side prerendering step (e.g., `vite-plugin-ssr`, `vite-react-ssg`, `@vitejs/plugin-ssr`) to generate per-route HTML shells with injected metadata.

**Assessment:**
- Provides the best possible SEO signal for search engine crawlers (server-rendered HTML with metadata already present).
- Requires significant architectural change: SSR plugin, build pipeline change, possibly Vercel SSR adapter change.
- Far outside the scope of the current task.
- D2C collection surfaces are a small subset of routes; full SSR pipeline for them requires proportionally high implementation cost.
- **DEFERRED indefinitely.** Not authorized for current phase. Requires a separate infrastructure decision unit if ever pursued.

### Option E — Stage 1 custom DOM utility now + sitemap/JSON-LD deferred

**Description:** Implement Option B (custom repo-local utility) for Stage 1 metadata needs: title, meta description, canonical, robots, OG title/description/image fallback, Twitter title/description/image fallback. Explicitly defer sitemap generation, JSON-LD, and structured data to separate future units.

**Assessment:**
- Minimal footprint for immediate need.
- No new dependency.
- Fully auditable, fully scoped to Public surfaces.
- Deferred scope (sitemap, JSON-LD) is correctly bounded — those require separate governance and implementation work.
- Aligns exactly with what `D2C-COLLECTION-SEO-GOVERNANCE-001` defines as "current phase" scope.
- **RECOMMENDED.** This is the decision.

---

## 6. Decision

**DECIDED: Option E — Repo-local custom DOM utility, Stage 1 metadata only, sitemap and JSON-LD deferred.**

### 6.1 Implementation Model

A single, repo-local, typed utility module — `utils/publicPageMeta.ts` — will manage all public-surface SEO metadata via direct DOM manipulation. No new npm dependency will be added.

The utility will:
1. Accept a typed `PublicPageMetaInput` struct (defined in the same file or co-located types file).
2. Set or update `document.title` (replacing current per-component title logic for public surfaces only).
3. Manage a fixed, explicitly listed set of `<head>` tags via `querySelector` + `setAttribute` or `createElement` + `head.appendChild`.
4. Provide a `clearPublicPageMeta()` function (or cleanup return value from a React hook wrapper) to reset all managed tags to safe defaults or remove them when navigating away from public collection surfaces.
5. Be called from `App.tsx` inside the existing `useEffect` for `documentTitle` (extended), or as a separate `useEffect` keyed on `appState` + the active collection projection.

### 6.2 Managed Metadata Fields (Stage 1)

The following fields constitute the Stage 1 implementation scope. The implementation unit (`PUBLIC-COLLECTION-SEO-METADATA-IMPLEMENTATION-001`) MUST implement all of them.

| Field | HTML Element | Note |
|---|---|---|
| Page title | `<title>` | Per-collection name for detail; list-level for list page |
| Meta description | `<meta name="description">` | From collection `summary`; fallback per Section 4.11 of governance |
| Canonical URL | `<link rel="canonical">` | No private params; slug-only path |
| Robots directive | `<meta name="robots">` | `index, follow` for eligible; `noindex, nofollow` for unavailable |
| OG title | `<meta property="og:title">` | Same rules as `<title>` |
| OG description | `<meta property="og:description">` | Same rules as meta description |
| OG image | `<meta property="og:image">` | Platform-level fallback only in Stage 1 (no per-collection hero image URL exists yet) |
| OG URL | `<meta property="og:url">` | Same as canonical URL |
| OG type | `<meta property="og:type">` | `"website"` |
| Twitter card | `<meta name="twitter:card">` | `"summary_large_image"` for detail; `"summary"` for list |
| Twitter title | `<meta name="twitter:title">` | Same rules as OG title |
| Twitter description | `<meta name="twitter:description">` | Same rules as OG description |
| Twitter image | `<meta name="twitter:image">` | Same fallback as OG image |

### 6.3 Public / Private Boundary for Metadata

The utility must enforce the following boundary. This is non-negotiable and must be validated in the implementation unit:

**Allowed in metadata:**
- Collection `title`, `summary`, `curatedContextLabel`, `taxonomyCategory`, `taxonomyMaterialTags`, `taxonomySegmentTags`, `taxonomyClusterTags` — all from `PublicCollectionProjection` (static config, public-safe by design).
- Platform domain (from `window.location.origin` or a static constant — not from any tenant record).
- Collection `publicSlug` — for canonical URL and OG URL construction only.
- Safe fallback strings (hardcoded or from governance-approved constants).

**Forbidden in metadata (absolute prohibition):**
- Private supplier identifiers of any kind.
- Internal database IDs (`id`, `org_id`, `tenantId`, `productId`, `passportId`, `nodeId`).
- `publicPassportId` — product-scoped only; must not appear in collection metadata.
- Auth state parameters: `returnTo`, `authRequired`, `intent`, `sourceSurface`.
- Transaction parameters: `rfqId`, `quoteId`, `orderId`.
- Auth tokens: `token`, `access_token`, `jwt`.
- Commerce state: `price`, `inventory`, `stock`.
- Any value from authenticated user session, tenant context, or `currentTenant`.
- Any value derived from Supabase Auth state, RLS context, or Fastify session.
- Any value from backend API response (collections are static config-backed; no API call for metadata).

### 6.4 Fail-Closed Behavior

The utility must fail closed:

1. If the `PublicCollectionProjection` for the current detail page is `undefined` at render time — emit only the safe fallback metadata from `D2C-COLLECTION-SEO-GOVERNANCE-001 Section 4.11` plus `noindex, nofollow`.
2. If the app state is `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` — emit safe fallback metadata plus mandatory `noindex, nofollow`.
3. If the app state is not a public collection surface state — the utility must not emit or retain any collection-specific tags. All managed tags must be cleared or removed.
4. The utility must not throw or log sensitive data on any failure path.

### 6.5 Cleanup Requirement

The utility (or its React hook wrapper) must remove or reset all managed `<head>` tags when the user navigates to a non-public-collection app state. Specifically:

- When `appState` transitions away from `PUBLIC_COLLECTIONS`, `PUBLIC_COLLECTION_DETAIL`, or `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE`, all managed tags must revert to their default/absent state.
- Meta description, canonical, robots, OG, and Twitter tags are not present in `index.html` by default; they should be removed (not left empty) on cleanup.

### 6.6 Canonical Domain Strategy

- In Stage 1, the canonical domain will be derived from `window.location.origin` at runtime — not hardcoded.
- This avoids hardcoding `https://texqtic.com` in the codebase while keeping the canonical URL accurate.
- The implementation unit must ensure this is safe (i.e., does not expose any tenant/auth/session state — `window.location.origin` is purely the protocol + host).

---

## 7. Required Capability for Next Implementation Unit

The implementation unit `PUBLIC-COLLECTION-SEO-METADATA-IMPLEMENTATION-001` must deliver all of the following, and no more:

| Capability | Required |
|---|---|
| Per-collection `<title>` (using collection name) for `PUBLIC_COLLECTION_DETAIL` | Yes |
| List-level `<title>` for `PUBLIC_COLLECTIONS` | Yes |
| Unavailable-state safe `<title>` for `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | Yes |
| `<meta name="description">` from `summary` field (detail) | Yes |
| `<meta name="description">` editorial fallback (list + unavailable) | Yes |
| `<link rel="canonical">` (slug-only, no private params) | Yes |
| `<meta name="robots">` (`index,follow` / `noindex,nofollow` gated) | Yes |
| `<meta property="og:title">` | Yes |
| `<meta property="og:description">` | Yes |
| `<meta property="og:image">` (platform fallback) | Yes |
| `<meta property="og:url">` | Yes |
| `<meta property="og:type">` | Yes |
| `<meta name="twitter:card">` | Yes |
| `<meta name="twitter:title">` | Yes |
| `<meta name="twitter:description">` | Yes |
| `<meta name="twitter:image">` | Yes |
| Cleanup on non-public-collection state transition | Yes |
| Fail-closed fallback for undefined collection | Yes |
| Per-collection-specific OG image URL | No — deferred (no hero image URLs in static config yet) |
| Per-collection-specific Twitter image URL | No — deferred |
| Sitemap generation (`sitemap.xml`) | No — deferred |
| JSON-LD / structured data emission | No — deferred |
| `robots.txt` modification | No — deferred; separate unit required |
| Any new npm dependency (react-helmet-async or similar) | No — repo-local utility only |
| Any SSR/prerender pipeline change | No — out of scope |
| Any change to Fastify backend routes | No — metadata is frontend-only |
| Any change to OpenAPI contracts | No |
| Any change to Prisma schema | No |
| Any change to `publicCollectionsProjection.ts` data | No (unless adding a field needed for metadata — requires separate pre-auth) |

**Allowlist for implementation unit (modify):**
- `utils/publicPageMeta.ts` — new file; the metadata utility
- `App.tsx` — wire the utility into existing `useEffect` chain for public collection states

**Read-only for implementation unit:**
- `config/publicCollectionsProjection.ts` — read fields available for metadata sourcing
- `components/Public/PublicCollectionDetail.tsx` — read props contract
- `components/Public/PublicCollectionsStub.tsx` — confirm no metadata already emitted
- `components/Public/PublicCollectionUnavailable.tsx` — confirm unavailable behavior
- `index.html` — verify no conflicting static meta tags after change

---

## 8. Explicit Non-Goals

The following are explicitly out of scope for both this decision unit and the next implementation unit. Each requires a separate governance unit or decision before implementation.

| Non-Goal | Reason Deferred |
|---|---|
| Sitemap generation for `/collections` or `/collections/:slug` | `D2C-COLLECTION-SEO-GOVERNANCE-001` §9 defines rules but implementation is deferred; requires a separate sitemap implementation unit |
| JSON-LD / structured data (`WebPage`, `BreadcrumbList`, etc.) | `D2C-COLLECTION-SEO-GOVERNANCE-001` §8 defines rules but structured data is deferred; requires a separate unit |
| `robots.txt` modification | Per governance §12.4, `robots.txt` must not be modified without explicit authorization; per-page `noindex` is the primary mechanism |
| Per-collection hero image OG/Twitter image URL | No hero image URLs exist in `publicCollectionsProjection.ts` yet; static config does not carry image URLs; deferred to a separate data extension unit |
| SSR / prerendering pipeline | Requires architectural decision entirely separate from this decision; not planned |
| React Helmet or Helmet Async adoption | Option C was evaluated and rejected for current phase; revisit if app scales beyond current public surface count |
| Full-repo metadata overhaul (Tenant, Auth, B2B surfaces) | Out of scope; public collection surfaces are the only active scope |
| B2B discovery page metadata | Separate concern; outside D2C family scope |
| Public supplier profile page metadata | Separate concern |
| Public product detail page metadata | Separate concern |
| Breadcrumb structured data | Deferred with JSON-LD |
| Analytics / tracking tags | Not an SEO concern; separate governance required |
| Hreflang / multi-language | Not applicable in current phase |

---

## 9. Relationship to D2C Collection SEO Governance

This decision unit operationalizes `D2C-COLLECTION-SEO-GOVERNANCE-001` (PROPOSED → implementation gate condition).

Key governance rules that bind the implementation unit derived from this decision:

| Governance Rule | Binding Requirement |
|---|---|
| §4.1 Title Tag | Format: `[Collection Title] — TexQtic Verified Textile Collections`; max 60–70 chars |
| §4.2 Meta Description | Detail: `[title]: [summary snippet]. Eligible products may include public trust context where available.`; max 155–160 chars |
| §4.3 Canonical URL | `/collections/[slug]`, no private params, no fallback to product context |
| §4.9 Robots Meta | `index,follow` for eligible; `noindex,nofollow` for unavailable/gate-failed |
| §4.11 Safe Fallback | `TexQtic Textile Collections` / `Explore curated textile story and showcase collections on TexQtic.` for all gate-failed/unavailable states |
| §6.3 Unknown Slugs | Must not reveal why collection is unavailable; must apply `noindex,nofollow` |
| §7.3 Forbidden Claims | Full forbidden claim list applies to all metadata fields |
| §10.3 Forbidden Query Params | `returnTo`, `authRequired`, `intent`, `orgId`, `token`, etc. — never in canonical |
| §12.2 Required Noindex | All unavailable, gate-failed, and error states must emit `noindex,nofollow` |

---

## 10. Relationship to Public Collection Implementations

| Unit | Status | Relationship |
|---|---|---|
| PUBLIC-COLLECTIONS-PROJECTION-IMPLEMENTATION-001 | VERIFIED_COMPLETE (commit `5812d28`) | Implemented list page projection; metadata not yet implemented |
| PUBLIC-COLLECTION-DETAIL-PROJECTION-IMPLEMENTATION-001 | VERIFIED_COMPLETE (commit `49219995`) | Implemented detail projection for 5 slugs; `document.title` only; no meta/OG/canonical |
| D2C-COLLECTION-SEO-GOVERNANCE-001 | PROPOSED | Defines all governance rules that bind this decision and next implementation |
| **PUBLIC-SEO-INFRASTRUCTURE-DECISION-001** (this unit) | DECIDED | Decides infrastructure approach; gates implementation |
| PUBLIC-COLLECTION-SEO-METADATA-IMPLEMENTATION-001 | NOT STARTED — gated on this decision | Next implementation unit; now unblocked |

---

## 11. Public / Private Boundary Summary

This section provides a single authoritative list of what may and may not appear in any metadata field produced by the infrastructure decided here. This list is binding on all implementation units in the D2C SEO family.

### Allowed Sources

| Source | Usage |
|---|---|
| `PublicCollectionProjection.title` | `<title>`, `og:title`, `twitter:title` |
| `PublicCollectionProjection.summary` | `<meta name="description">`, `og:description`, `twitter:description` |
| `PublicCollectionProjection.publicSlug` | Canonical URL path and `og:url` construction only |
| `PublicCollectionProjection.curatedContextLabel` | Optionally in description framing if needed |
| `PublicCollectionProjection.taxonomyCategory`, `taxonomyMaterialTags`, `taxonomySegmentTags`, `taxonomyClusterTags` | Optionally in description framing; taxonomy terms only |
| `window.location.origin` | Domain component of canonical URL and OG URL |
| Hardcoded governance-approved fallback strings | Safe fallback title and description |
| Hardcoded platform-level OG image URL | Fallback OG/Twitter image |
| Hardcoded `og:type = "website"` | OG type field |
| Hardcoded `twitter:card` values | `"summary_large_image"` or `"summary"` |
| `appState` value | To determine `index/noindex` robots directive |

### Forbidden Sources (Absolute Prohibition)

| Forbidden Source | Reason |
|---|---|
| Any value from `currentTenant` | Tenant-scoped private data |
| Any value from `authUser` or Supabase Auth session | Auth-private data |
| Any URL query parameter (any name) | Must not appear in canonical or OG URLs |
| `publicPassportId` (product-level field) | Product-scoped; must not appear in collection metadata |
| Internal database IDs (`id`, `org_id`, etc.) | Private identifiers — absolute prohibition |
| Backend API response values | Collections are static config-backed; no API call for metadata |
| Auth tokens, JWTs, session tokens | Absolute prohibition |
| Commerce state (price, inventory, stock) | No commerce on collection surfaces |
| RFQ / transaction identifiers | Not applicable to collection surfaces |
| `returnTo`, `authRequired`, `intent`, `sourceSurface` parameters | Auth handoff state |
| Any field not in `PublicCollectionProjection` static config | Must come only from static, public-safe projection |

---

## 12. Deferred Decisions

The following decisions are explicitly deferred and each requires a separate governance or decision unit before implementation:

| Deferred Decision | Notes |
|---|---|
| Sitemap generation technology and cadence | Could be static file at build time, API route, or dynamic; requires separate unit after at least one collection is live |
| JSON-LD schema type selection (`WebPage` vs `CollectionPage`) | `D2C-COLLECTION-SEO-GOVERNANCE-001` §8 defines rules; implementation requires a separate structured data unit |
| Per-collection OG/Twitter image strategy | Requires hero image URLs in projection data; data extension required first |
| SSR prerendering feasibility evaluation | Separate architectural decision; not planned |
| `robots.txt` path-level rules for collection surfaces | Separate unit; `D2C-COLLECTION-SEO-GOVERNANCE-001` §12.4 governs |
| Sitemap update cadence and trigger mechanism | Separate sitemap implementation unit |
| Breadcrumb structured data | Deferred with JSON-LD unit |
| Full platform-wide metadata strategy | Out of scope for current D2C collection family; separate decision required when tenant/B2B surfaces need metadata |

---

## 13. Acceptance Criteria

This unit is complete when:

- [x] `D2C-COLLECTION-SEO-GOVERNANCE-001` has been reviewed and confirmed as the governing authority.
- [x] Current repo truth has been verified by direct inspection (no pre-existing SEO infrastructure, no SEO libraries, no sitemap, no JSON-LD, no robots.txt).
- [x] Current `App.tsx` document title pattern has been confirmed.
- [x] All five infrastructure options (A–E) have been evaluated with documented rationale.
- [x] Option E (repo-local custom DOM utility, Stage 1 only) is selected as the decision.
- [x] Implementation model, managed fields list, public/private boundary, fail-closed requirements, and cleanup requirements are all documented.
- [x] Explicit non-goals are documented with deferred status.
- [x] Implementation unit allowlist and required capability list for `PUBLIC-COLLECTION-SEO-METADATA-IMPLEMENTATION-001` are defined.
- [x] This artifact (`PUBLIC-SEO-INFRASTRUCTURE-DECISION-001.md`) is committed to the repo root.
- [x] No runtime, schema, package, or API changes were made by this unit.

---

*This unit introduces no runtime changes. All implementation is deferred to `PUBLIC-COLLECTION-SEO-METADATA-IMPLEMENTATION-001`, which is now unblocked.*
