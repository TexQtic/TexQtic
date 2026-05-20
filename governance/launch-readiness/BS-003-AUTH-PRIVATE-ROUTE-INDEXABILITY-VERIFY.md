# BS-003 — Auth / Private Route Indexability Verification

**Authority:** `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (BS-003, P0 OPEN) ·
**Cross-referenced:** `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (FTR-AUTH-003, G-06-003) ·
**Unit:** `governance/units/BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001.md` ·
**Date:** 2026-07-22 · **Decision:** PARTIAL · **Status:** EVIDENCE_STRONG — GSC production crawl not available in current environment

---

## 1. Executive Summary

This document records verification evidence confirming that auth-gated, private, tenant, and
control-plane routes are not meaningfully reachable to search engine crawlers, are not promoted
in sitemap.xml or via internal link graphs from public pages, and that unauthenticated visitors
landing on these URLs receive only the generic public entry state — not auth-gated content, not
sensitive tenant data, and not private operational information.

**Verification decision: PARTIAL.**

The evidence is sufficient to establish that the current risk profile for BS-003 is LOW, that no
private or sensitive content is served to unauthenticated visitors at private route URLs, and that
the SPA architecture provides a structural barrier against meaningful crawl of auth/private paths.
However, a documented gap exists in the robots.txt Disallow list (auth/private routes are not
explicitly disallowed), and Google Search Console production crawl evidence could not be produced
in the current environment (GSC requires authenticated browser sign-in which is outside this
verification scope). The gap is registered and a follow-up robots.txt update is warranted before
first public backlink or press mention.

---

## 2. Verification Scope

**Routes under verification — Group A (Public Indexable):**
- `/products` — publicly indexed, in sitemap
- `/products/category/:slug` — publicly indexed, in sitemap
- `/collections` — publicly indexed, in sitemap
- `/collections/:slug` — publicly indexed, in sitemap
- `/inquiry` — publicly indexed, in sitemap

**Routes under verification — Group B (Stub / Gated — Disallowed):**
- `/trust` — robots.txt Disallow + JS `noindex, nofollow`
- `/industries` — robots.txt Disallow + JS `noindex, nofollow`
- `/aggregator` — robots.txt Disallow + JS `noindex, nofollow`
- `/supplier/:slug` — robots.txt Disallow + JS `clearPublicPageMeta()`
- `/passport/:id` — robots.txt Disallow + JS `clearPublicPageMeta()`
- `/join/:code` — robots.txt Disallow + JS `clearPublicPageMeta()`
- `/api/` — robots.txt Disallow

**Routes under verification — Group C (Auth / Private — NOT in robots.txt Disallow):**
- `/auth` — not URL-mapped in SPA, no robots Disallow
- `/dashboard` — not URL-mapped in SPA, no robots Disallow
- `/control-plane` — not URL-mapped in SPA, no robots Disallow
- `/tenant` — not URL-mapped in SPA, no robots Disallow
- `/workspace` — not URL-mapped in SPA, no robots Disallow
- `/onboarding` — not URL-mapped in SPA, no robots Disallow
- `/token-handler` — not URL-mapped in SPA, no robots Disallow
- `/login` — not URL-mapped in SPA, no robots Disallow

---

## 3. Authority Documents

- `public/robots.txt` — production-confirmed crawl policy
- `public/sitemap.xml` — production-confirmed sitemap (12 URLs)
- `index.html` — SPA shell served to all routes by Vercel
- `App.tsx` — `resolveInitialAppState()` (URL-to-state mapping) + SEO useEffect (robots meta assignment)
- `utils/publicPageMeta.ts` — `clearPublicPageMeta()` / `applyPublicPageMeta()` implementation
- `vercel.json` — Vercel SPA routing and response header policy
- `middleware.ts` — Vercel Edge Middleware (tenant domain resolution only)

---

## 4. Architecture Context — Why Auth Routes Are Structurally Separate

TexQtic is a pure Client-Side Rendered (CSR) Vite + React SPA. There is no SSR, no pre-rendering,
and no file-based routing. All routing is managed in-memory by `resolveInitialAppState()` in
`App.tsx`. This has the following critical implications for SEO:

**State machine, not URL routing:**
The paths `/auth`, `/dashboard`, `/tenant`, `/workspace`, `/control-plane`, `/onboarding`, and
`/token-handler` are NOT URL-based routes. They are application states triggered by auth events
(Supabase session detection, token query parameters, etc.). They have no corresponding URL pattern
in `resolveInitialAppState()` and are never produced by URL-based navigation.

**No URL path created for auth states:**
When a user signs in, the SPA transitions to the `AUTH` state via `setAppState()`. No
`history.pushState('/dashboard')` or similar is performed — the URL does not change. Auth states
are opaque state transitions, not navigable URLs.

**Unauthenticated fallback:**
Any unrecognized URL path (including `/dashboard`, `/control-plane`, etc.) that does not match a
known public path pattern in `resolveInitialAppState()` resolves to:
- `PUBLIC_ENTRY` — if no stored auth session cookie exists (unauthenticated visitor)
- `AUTH` — if a stored auth session exists (returning authenticated user)

This means a crawler hitting `https://app.texqtic.com/dashboard` will receive the PUBLIC_ENTRY
content (the generic "TexQtic Platform Entry" landing page), not any auth-gated content.

---

## 5. Repo Evidence — robots.txt

**File:** `public/robots.txt` · **Production-confirmed** (2026-07-22)

```
User-agent: *
Allow: /products
Allow: /products/category/
Allow: /collections
Allow: /inquiry
Disallow: /api/
Disallow: /passport/
Disallow: /join/
Disallow: /supplier/
Disallow: /trust
Disallow: /industries
Disallow: /aggregator
Sitemap: https://app.texqtic.com/sitemap.xml
```

**What is covered:**
- `/api/` — disallowed ✅
- `/passport/` — disallowed ✅
- `/join/` — disallowed ✅
- `/supplier/` — disallowed ✅
- `/trust` — disallowed ✅ (also gets JS noindex)
- `/industries` — disallowed ✅ (also gets JS noindex)
- `/aggregator` — disallowed ✅ (also gets JS noindex)

**What is NOT covered (documented gap):**
- `/auth` — not disallowed ⚠️
- `/dashboard` — not disallowed ⚠️
- `/control-plane` — not disallowed ⚠️
- `/tenant` — not disallowed ⚠️
- `/workspace` — not disallowed ⚠️
- `/onboarding` — not disallowed ⚠️
- `/token-handler` — not disallowed ⚠️
- `/login` — not disallowed ⚠️

Note: The robots.txt comment header reads "Disallow all API routes, auth-gated paths,
supplier/tenant paths" — but the actual Disallow list does not include the auth/tenant URL
prefixes listed above. This is an implementation gap relative to the documented intent.

---

## 6. Repo Evidence — sitemap.xml

**File:** `public/sitemap.xml` · **Production-confirmed** (2026-07-22) · **12 URLs**

All sitemap entries are from `https://app.texqtic.com`:

| URL | Priority | Changefreq |
|---|---|---|
| `/products` | 0.8 | weekly |
| `/products/category/garments` | 0.7 | weekly |
| `/products/category/home-textiles` | 0.7 | weekly |
| `/products/category/technical-textiles` | 0.7 | weekly |
| `/products/category/fabrics` | 0.7 | weekly |
| `/collections` | 0.8 | weekly |
| `/collections/natural-fabric-stories` | 0.7 | weekly |
| `/collections/garment-supply-chain-context` | 0.7 | weekly |
| `/collections/home-textiles-showcase` | 0.7 | weekly |
| `/collections/textile-services-ecosystem` | 0.7 | weekly |
| `/collections/technical-textiles-context` | 0.7 | weekly |
| `/inquiry` | 0.5 | monthly |

**Finding:** No auth, private, tenant, or control-plane routes appear in sitemap.xml. ✅
No Group C routes are promoted to search engines via the sitemap. ✅

---

## 7. Repo Evidence — App.tsx resolveInitialAppState()

**File:** `App.tsx` lines 2017–2159 · **Inspected 2026-07-22**

URL path patterns matched by `resolveInitialAppState()`:

| URL Pattern | App State |
|---|---|
| `/passport/:id` | `PUBLIC_PASSPORT` |
| `/trust` | `PUBLIC_TRUST_LANDING` |
| `/industries` | `PUBLIC_INDUSTRY_CLUSTER_LANDING` |
| `/aggregator` | `PUBLIC_AGGREGATOR` |
| `/supplier/:slug` | `PUBLIC_SUPPLIER_PROFILE` |
| `/product/:slug` | `PUBLIC_PRODUCT_DETAIL` |
| `/products` | `PUBLIC_B2C_BROWSE` |
| `/products/category/:slug` | `PUBLIC_B2C_CATEGORY_STORY` |
| `/collections` | `PUBLIC_COLLECTIONS` |
| `/collections/:slug` | `PUBLIC_COLLECTION_DETAIL` / `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` |
| `/join/:code` | `PUBLIC_REFERRAL_LANDING` |
| `/inquiry` | `PUBLIC_INQUIRY` |
| `?token=...&action=invite` | `ONBOARDING` |
| `?token=...` | `TOKEN_HANDLER` |
| *(any other path)* | `AUTH` (session exists) OR `PUBLIC_ENTRY` (no session) |

**Finding:** No URL pattern exists for `/auth`, `/dashboard`, `/tenant`, `/workspace`,
`/control-plane`, `/onboarding` (path), `/token-handler` (path), or `/login`. All of these fall
through to `PUBLIC_ENTRY` for unauthenticated visitors. ✅ No auth-gated content is served at
these URL paths to unauthenticated (crawlable) visitors.

---

## 8. Repo Evidence — App.tsx SEO useEffect (robots meta assignment)

**File:** `App.tsx` lines 3310–3560 (approx.) · **Inspected 2026-07-22**

States receiving **`robots: 'index, follow'`** (explicitly indexed):
- `PUBLIC_B2C_BROWSE`
- `PUBLIC_PRODUCT_DETAIL` (when product found / loading)
- `PUBLIC_B2C_CATEGORY_STORY` (known slug)
- `PUBLIC_COLLECTIONS`
- `PUBLIC_COLLECTION_DETAIL` (has eligible products)
- `PUBLIC_INQUIRY`

States receiving **`robots: 'noindex, nofollow'`** (explicitly de-indexed via JS):
- `PUBLIC_TRUST_LANDING`
- `PUBLIC_INDUSTRY_CLUSTER_LANDING`
- `PUBLIC_AGGREGATOR`
- `PUBLIC_PRODUCT_DETAIL` (notFound)
- `PUBLIC_B2C_CATEGORY_STORY` (unknown slug)
- `PUBLIC_COLLECTION_DETAIL` (no eligible products)
- `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE`

States receiving **`clearPublicPageMeta()`** (managed meta removed, no noindex injected):
- `PUBLIC_SUPPLIER_PROFILE`
- `PUBLIC_PASSPORT`
- `PUBLIC_REFERRAL_LANDING`
- `AUTH`
- `ONBOARDING`
- `TOKEN_HANDLER`
- `CONTROL_PLANE`
- `EXPERIENCE`
- **`PUBLIC_ENTRY`** ← the state rendered at `/dashboard`, `/control-plane`, etc.
- `TEAM_MGMT`
- `WL_ADMIN`
- All other tenant/workspace states

**Critical finding:** The `PUBLIC_ENTRY` state (rendered when an unauthenticated visitor hits any
unrecognized URL, including `/dashboard`) calls `clearPublicPageMeta()`. This removes any
previously-managed meta elements from the `<head>` but does NOT inject a noindex tag. On initial
page load at a private URL, there are no previously-managed elements to remove, so the effective
server-delivered HTML has no noindex signal at all.

**Layer of protection available:** robots.txt (if the path is disallowed). For Group C auth routes,
this layer is absent (see Section 5 gap). For Group B routes, robots.txt is the primary protection.

---

## 9. Repo Evidence — publicPageMeta.ts

**File:** `utils/publicPageMeta.ts` line 251 · **Inspected 2026-07-22**

```typescript
export function clearPublicPageMeta(): void {
  if (typeof document === 'undefined') return;
  document.head.querySelectorAll(`[data-texqtic-public-meta]`).forEach((el) => el.remove());
  clearManagedJsonLd();
}
```

**Finding:** `clearPublicPageMeta()` removes all `data-texqtic-public-meta`-tagged elements from
`<head>`. It does NOT inject `<meta name="robots" content="noindex, nofollow">`. The function is
a cleanup utility, not an explicit de-indexing signal. ✅ (Correct: robots.txt is the intended
primary protection for these routes; JS de-index is secondary/complementary.)

---

## 10. Repo Evidence — vercel.json and middleware.ts

**File:** `vercel.json` · **Inspected 2026-07-22**

```json
{
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.ts" },
    { "src": "/dpp/v1/context\\.jsonld", "headers": {...}, "continue": true },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

**Finding:** No `X-Robots-Tag` response headers are configured. No redirects for auth routes.
The SPA fallback rule `"src": "/(.*)", "dest": "/index.html"` serves the SPA shell for ALL
non-asset, non-API routes — including every Group C auth/private URL. ✅ (Expected for SPA.)

**File:** `middleware.ts` · **Inspected 2026-07-22**

The Vercel Edge Middleware handles tenant custom domain resolution only. It does not inject any
SEO headers, noindex tags, or route-based redirects. Passthrough for `app.texqtic.com`. ✅

---

## 11. Live Route Verification — SPA Shell (Server-Delivered HTML)

**Date:** 2026-07-22 · **Method:** view-source in browser (no JS execution)

The following routes were checked via `view-source:https://app.texqtic.com/<path>`:

| Route | HTTP Status | Title in source | `<meta name="robots">` in source | Size (lines) |
|---|---|---|---|---|
| `/trust` | 200 | `TexQtic Platform` | ABSENT | 34 lines |
| `/supplier/test` | 200 | `TexQtic Platform` | ABSENT | 34 lines |

**Finding (critical for all routes):**
Every route on `app.texqtic.com` serves the identical 34-line SPA shell from Vercel:
- `<title>TexQtic Platform</title>` — generic title (no route-specific content)
- `<link rel="sitemap" type="application/xml" href="/sitemap.xml" />` — only approved public URLs in sitemap
- `<div id="root"></div>` — empty body; all content is JS-rendered
- **NO `<meta name="robots" content="...">` anywhere in the server-delivered HTML**
- **NO `<link rel="canonical">` in the server-delivered HTML**

This means: without JS execution, a crawler visiting ANY URL on `app.texqtic.com` — including
`/dashboard` and `/control-plane` — sees a bare, contentless SPA shell with no indexable content,
no meaningful title, no canonical tag, and no server-injected noindex signal.

---

## 12. Live Route Verification — Production robots.txt

**Date:** 2026-07-22 · **URL:** `https://app.texqtic.com/robots.txt`

Production robots.txt confirmed identical to repo `public/robots.txt`. The production file contains
the authority header referencing `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001`. ✅

---

## 13. Live Route Verification — Auth / Private Routes

**Date:** 2026-07-22 · **Method:** Full browser load (with JS execution) via browser automation

| Route | HTTP Status | JS-rendered title | JS-rendered content | Auth content served? |
|---|---|---|---|---|
| `/dashboard` | 200 | "TexQtic Platform Entry" | PUBLIC_ENTRY state (generic landing page) | ❌ No auth content |
| `/control-plane` | 200 | "TexQtic Platform Entry" | PUBLIC_ENTRY state (generic landing page) | ❌ No auth content |

**Finding:** Both `/dashboard` and `/control-plane` (and by extension all other unmapped private
paths) serve the PUBLIC_ENTRY state to unauthenticated visitors. The rendered content is the
generic "TexQtic Platform Entry" landing page — the same content as the app root `/`. No auth
content, no tenant data, no private operational information is accessible at these URL paths
without authentication. ✅

**Secondary finding — URL does not redirect:** The URL remains as typed (e.g., `/dashboard` stays
as `/dashboard`). The SPA shell is served with HTTP 200 and then JS renders PUBLIC_ENTRY without
redirecting the browser to `/` or `/products`. This creates a potential canonical/duplicate concern
(same content at multiple URLs), but does NOT constitute a private data exposure.

---

## 14. Live Route Verification — Public Indexable Routes

**Date:** 2026-07-22 · **Method:** Full browser load (with JS execution)

| Route | HTTP Status | JS-rendered title | State |
|---|---|---|---|
| `/products` | 200 | "Explore Textile Products — TexQtic" | `PUBLIC_B2C_BROWSE` |
| `/inquiry` | 200 | "Express Interest — TexQtic" | `PUBLIC_INQUIRY` |
| `/trust` | 200 | "TexQtic — Trust & Origin Passport" | `PUBLIC_TRUST_LANDING` |
| `/` (root) | 200 | "TexQtic Platform Entry" | `PUBLIC_ENTRY` |

**Finding:** Public indexable routes render correctly with specific JS-applied titles. ✅
The `/trust` route renders its specific content (it is disallowed in robots.txt, so crawlers should
not index it even if rendered). ✅

---

## 15. Link Graph Analysis — No Links from Public Pages to Private Routes

**Date:** 2026-07-22 · **Method:** Codebase-wide grep for `<a href>` patterns

Search for anchor links targeting private/auth routes in all components:
- Pattern: `href.*\/auth|href.*\/login|href.*\/dashboard|href.*\/tenant|href.*\/control-plane|href.*\/onboarding`
- **Result: 0 matches in any component, layout, or public page file.**

All auth/private state navigation in TexQtic uses React state transitions (`setAppState()` calls
via button `onClick` handlers), not `<a href>` links. This means:
1. No crawlable link graph path exists from public pages to private route URLs
2. Search engine crawlers cannot follow any link to discover `/dashboard`, `/control-plane`, etc.
3. Discovery of these URL paths would only be possible via: direct URL entry by a human,
   external site linking to them, or if they somehow appeared in a public document (they do not).

**Finding:** No inbound link graph path from public pages to private/auth routes. ✅

---

## 16. Route Classification Table

| Route Group | Routes | robots.txt | Sitemap | JS SEO signal | Link graph | Auth content accessible? | Classification |
|---|---|---|---|---|---|---|---|
| Public Indexable | `/products`, `/collections`, `/inquiry`, `/products/category/:slug`, `/collections/:slug` | Explicitly Allowed | Included (12 URLs) | `index, follow` | Internal buttons only | N/A | ✅ PASS |
| Stub Gated | `/trust`, `/industries`, `/aggregator` | Disallow | Not included | `noindex, nofollow` (JS) | None from public pages | N/A | ✅ PASS |
| Profile Gated | `/supplier/:slug`, `/passport/:id`, `/join/:code` | Disallow | Not included | `clearPublicPageMeta()` | None from public pages | N/A | ✅ PASS (robots.txt primary) |
| API | `/api/` | Disallow | Not included | N/A | None | N/A | ✅ PASS |
| Auth / Private | `/auth`, `/dashboard`, `/control-plane`, `/tenant`, `/workspace`, `/onboarding` (path), `/token-handler` (path), `/login` | **Not disallowed** ⚠️ | Not included ✅ | `clearPublicPageMeta()` (no noindex injected) | **None** ✅ | **No** ✅ (PUBLIC_ENTRY only) | ⚠️ PARTIAL |

---

## 17. Findings Summary

**CONFIRMED PROTECTIONS (WORKING):**

1. ✅ `robots.txt` Disallow covers all Group B and Profile Gated routes correctly
2. ✅ `sitemap.xml` contains only 12 approved public marketplace URLs — no private routes
3. ✅ Public indexable routes (Group A) render correctly with JS-applied `index, follow`
4. ✅ Stub routes (Group B) receive both robots.txt Disallow AND JS `noindex, nofollow`
5. ✅ No anchor `<a href>` links from any public component to private/auth routes
6. ✅ All SPA navigation for auth/private states uses `setAppState()` + button `onClick` — no crawlable link graph
7. ✅ Unauthenticated visitors at any private URL receive only PUBLIC_ENTRY content — no private data exposure
8. ✅ No auth content, tenant data, or operational records accessible at private URLs without authentication
9. ✅ Production robots.txt confirmed identical to repo
10. ✅ Server-delivered HTML is bare SPA shell for ALL routes — no route-specific content without JS

**DOCUMENTED GAP:**

11. ⚠️ `/auth`, `/dashboard`, `/control-plane`, `/tenant`, `/workspace`, `/onboarding`, `/token-handler`, `/login` — NOT in `robots.txt` Disallow list despite robots.txt comment header stating "Disallow all API routes, auth-gated paths, supplier/tenant paths"
12. ⚠️ No server-injected `X-Robots-Tag` header for any route (vercel.json has none configured)
13. ⚠️ `clearPublicPageMeta()` for `PUBLIC_ENTRY` removes managed meta but does NOT inject a noindex signal — bare SPA shell is what crawlers see without JS execution
14. ⚠️ GSC production crawl evidence could not be produced in the current environment (GSC requires authenticated browser sign-in outside this verification scope)
15. ⚠️ Visiting `/dashboard` (or any unrecognized path) returns HTTP 200 with SPA shell — no 404/redirect to indicate "not a real URL" to crawlers

---

## 18. Risk Assessment

**Current assessed risk for Group C (Auth / Private) routes:** LOW

**Reasoning:**
- The primary vector for search engine discovery of a URL is: (a) link graph path, or (b) sitemap inclusion, or (c) URL submitted via GSC
- (a): No crawlable link exists from any public page to any auth/private URL ✅
- (b): None of these URLs appear in sitemap.xml ✅
- (c): GSC has not been used to submit private URLs (no evidence of this; would require intentional operator action)
- Even if a crawler DID visit `/dashboard`, it would receive a bare SPA shell (no JS) with generic title "TexQtic Platform" and no content — extremely low likelihood of indexing
- With JS rendering (Googlebot), the unauthenticated visitor gets PUBLIC_ENTRY (generic landing page) — not the "dashboard" content; no private data is served
- The risk from the gap is NOT data exposure (private data is never served to unauthenticated visitors) but rather: duplicate content concern (PUBLIC_ENTRY content at multiple URLs) and URL namespace hygiene

**Pre-backlink / pre-press-mention risk:** MODERATE ← robots.txt gap creates potential for indexing if external link points to a private path

**Recommended mitigation before first public backlink or press mention:**
Add robots.txt Disallow entries for the auth/private URL prefixes. This is a minimal change to
`public/robots.txt` that closes the gap. Requires a separate allowlisted implementation unit.

---

## 19. PARTIAL Decision Rationale

This verification concludes as **PARTIAL** because:

1. **Evidence is strong** — All structural protections (no link graph, no sitemap inclusion, no
   auth content at private URLs) are confirmed by both repo inspection and live browser verification
2. **Gap is documented** — robots.txt does not disallow auth/private URL prefixes; this is a known
   and documented implementation gap relative to the stated policy in the robots.txt comment header
3. **GSC evidence unavailable** — Production Google Search Console evidence of index/no-index status
   for private routes could not be confirmed in the current environment; GSC requires authenticated
   sign-in outside this verification scope
4. **Risk is LOW, not ZERO** — The gap is real but mitigated by architecture; the risk profile is
   low enough to document rather than block on, but a follow-up robots.txt update is warranted

A PASS decision would require either: (a) production GSC evidence confirming no private route
indexing, or (b) robots.txt updated with Disallow entries for all auth/private prefixes.

---

## 20. Follow-up Units Required

### FU-001 — robots.txt Auth Route Disallow Update (REQUIRED BEFORE BACKLINK/PRESS)
**Priority:** P0 before first public backlink or press mention
**Scope:** Add Disallow entries for `/auth`, `/dashboard`, `/control-plane`, `/tenant`,
`/workspace`, `/onboarding`, `/token-handler`, `/login` to `public/robots.txt`
**Allowlist:** `public/robots.txt` only
**Effort:** 1–2 lines change; minimal governance footprint

### FU-002 — GSC Production Crawl Verification (REQUIRED FOR FULL PASS)
**Priority:** P1 post-first-backlink
**Scope:** Open GSC for `app.texqtic.com`, confirm Coverage report shows no private/auth routes
indexed, confirm sitemap validated with correct 12-URL set
**Allowlist:** No code changes; evidence-gathering only
**Effort:** Manual GSC review; document evidence in verification artifact

### FU-003 — Server-Side noindex for Unmapped Routes (OPTIONAL / DEFENSE IN DEPTH)
**Priority:** P2 post-launch
**Scope:** Optionally add a `vercel.json` response header rule or middleware injection that adds
`X-Robots-Tag: noindex, nofollow` for routes not in the known public URL pattern set
**Note:** Low value given the current low risk profile; not required before launch

---

## 21. Public-Promotion Readiness Impact

**Impact on launch gates:**
- BS-003 remains OPEN until FU-001 (robots.txt update) AND FU-002 (GSC evidence) are both complete
- FTR-AUTH-003 transitions to EVIDENCE_STRONG — implementation evidence confirmed; GSC
  verification and robots.txt update remain outstanding
- No source code changes authorized by this verification unit (evidence-gathering only)
- First public backlink or press mention should be gated on FU-001 completion at minimum

---

## 22. Update History

| Date | Change | Who |
|---|---|---|
| 2026-07-22 | Initial verification artifact created — repo inspection + live browser verification; PARTIAL decision; gap documented; FU-001 robots.txt update required before backlink/press | `BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001` |
| 2026-07-22 | FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE completed: 8 auth/private Disallow entries added to `public/robots.txt` (`/auth`, `/dashboard`, `/control-plane`, `/tenant`, `/workspace`, `/onboarding`, `/token-handler`, `/login`). robots.txt implementation gap CLOSED. BS-003 updated PARTIAL → PARTIAL (robots.txt gap closed; GSC production crawl evidence still pending). FU-002 (GSC evidence check) remains required for VERIFIED_PASS. | `FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE` |
| 2026-07-22 | FU-002-GSC-CRAWL-EVIDENCE-VERIFY executed — FAIL. DuckDuckGo public search confirmed: 3 `/auth/login?next=...` URL variants are publicly indexed. Content at indexed URLs: login form only, no private/tenant data. All other auth/private routes (dashboard, control-plane, tenant, workspace, onboarding, token-handler, bare /login) confirmed NOT indexed. Sensitive-content phrases not indexed. Stop conditions 4 (auth URL indexed) + 5 (FU-001 deployment gap — live robots.txt lacks FU-001 entries) both ACTIVE. No commit created. Remediation: deploy FU-001 (`git push origin main`), await re-crawl, re-verify as FU-003. BS-003 remains PARTIAL. FTR-AUTH-003 remains ROBOTS_GAP_CLOSED / PARTIAL. | `FU-002-GSC-CRAWL-EVIDENCE-VERIFY` |
| 2026-05-20 | FU-003-ROBOTS-DEPLOYMENT-VERIFY PASS: FU-001 robots.txt changes confirmed deployed to live production. All 8 Disallow entries (`/auth`, `/dashboard`, `/control-plane`, `/tenant`, `/workspace`, `/onboarding`, `/token-handler`, `/login`) confirmed present at `https://app.texqtic.com/robots.txt`. All pre-FU-001 entries intact. Stop Condition 5 (deployment gap) RESOLVED. `/auth/login` deindex pending re-crawl. BS-003 → ROBOTS_DEPLOYED_PENDING_RECRAWL / PARTIAL. Next: FU-004-AUTH-LOGIN-DEINDEX-RECHECK. | `FU-003-ROBOTS-DEPLOYMENT-VERIFY` |
