# Public SEO Domain Canonical Strategy

**Unit:** `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`
**Authority:** `governance/launch-readiness/`
**Status:** STRATEGY_DEFINED
**Domain decision:** D-005 CLOSED — `app.texqtic.com` is the canonical domain for all dynamic marketplace public pages
**Marketing domain lock:** Option F — `MARKETING-APP-PUBLIC-PAGES-DOMAIN-SEPARATION-DECISION-LOCK-001`
  (commits 0bed542, 3246ca4, fa5d54e in marketing repo)
**Created:** 2026-07-22
**Updated:** 2026-07-22

---

## 1. Purpose

This document defines the SEO canonical domain and URL strategy for the TexQtic main app
(`app.texqtic.com`). It translates the locked Option F domain separation architecture into an
explicit canonical URL strategy, redirect policy, sitemap origin, robots.txt policy, and
indexability classification for every public-facing surface in the main app.

This is the output of deferred unit `FTR-SEO-001` and formally closes D-005 (SEO Domain Canonical
Strategy) in `DECISION-PARKING-LOT.md`.

---

## 2. Trigger and Authorization

The trigger condition for D-005 was:

> "Paresh confirms production domain setup (apex vs. www; any custom domain plan)."

Option F has been formally locked in the marketing repository via
`MARKETING-APP-PUBLIC-PAGES-DOMAIN-SEPARATION-DECISION-LOCK-001`. That lock establishes:

- `texqtic.com` is the marketing domain: static pages, education, company, resources, SEO
  discovery, supply-network education, role pages, location/niche SEO, trust/compliance concept
  pages, and supplier lead-capture forms.
- `app.texqtic.com` is the platform app domain: dynamic marketplace, product browse, product
  detail, collections, inquiry/workflow, supplier profiles, trust/origin app surfaces,
  aggregator/industry app surfaces, auth entry, issued-link flows, tenant dashboards, and all
  authenticated workflows.
- No redirect from `app.texqtic.com` root to `texqtic.com`.
- No `app.texqtic.com` root configured as login-only/noindex (Option E was rejected).
- `PLATFORM_APP_URL = https://app.texqtic.com` is the confirmed canonical platform origin.

This lock is the functional equivalent of "Paresh confirms production domain setup." D-005
trigger condition is satisfied.

---

## 3. Canonical Domain Declaration

**Canonical domain for the main app:** `https://app.texqtic.com`

This is not a temporary or provisional choice. The following evidence confirms it as correct and
intentional:

| Evidence item | Verified |
|---|---|
| `public/sitemap.xml` — all 12 URLs use `https://app.texqtic.com` as origin | PRODUCTION_VERIFIED |
| `public/robots.txt` — `Sitemap:` points to `https://app.texqtic.com/sitemap.xml` | PRODUCTION_VERIFIED |
| App.tsx SEO useEffect — all canonical tags use `${origin}/…` where `origin = https://app.texqtic.com` in production | REPO_VERIFIED |
| Live server confirms robots.txt and sitemap.xml match source files exactly | LIVE_VERIFIED (2026-07-22) |
| Option F marketing repo lock — no apex redirect, no cross-domain canonical | ARCHITECTURE_LOCKED |

There is no authority split. `app.texqtic.com` is the correct canonical domain for all dynamic
marketplace public pages. Organic impressions and GSC authority accumulated to date are correctly
attributed.

---

## 4. Redirect Policy

**No apex-to-app redirect.** Option F explicitly separates the two domains. `texqtic.com` is the
marketing domain. `app.texqtic.com` is the platform app domain. No redirect from `app.texqtic.com`
to `texqtic.com` or vice versa is required or appropriate.

**No www-to-non-www redirect required.** `app.texqtic.com` has no `www.app.texqtic.com` variant.
Vercel handles http-to-https automatically.

**`vercel.json` inspection confirmed:** No redirect rules exist in vercel.json. Routing is:
1. `/api/(.*)` → backend serverless function
2. DPP JSON-LD content-type header passthrough
3. `handle: filesystem` — serves static files (robots.txt, sitemap.xml, etc.)
4. `/(.*) → /index.html` — SPA fallback for all non-static paths

**`middleware.ts` inspection confirmed:** Edge middleware is host-based tenant resolver only. No
canonical redirect logic. No SEO-related redirects.

**FTR-SEO-007 scope after this strategy:** The "canonical domain implementation" item in
FUTURE-TODO-REGISTER.md (FTR-SEO-007) was conditional on the canonical strategy outcome. Under
Option F, no redirect policy changes are needed. The existing canonical implementation
(`app.texqtic.com` in all tags) is correct. FTR-SEO-007 scope is narrowed to:
- Verify existing canonical tag implementation is site-wide and consistent (already confirmed)
- No sitemap.xml origin change required (already `https://app.texqtic.com`)
- No redirect rule additions required
FTR-SEO-007 status is STRATEGY_RESOLVED; no further implementation gate.

---

## 5. Sitemap Strategy

**Current sitemap state (PRODUCTION_VERIFIED):**

| URL | changefreq | priority | Notes |
|---|---|---|---|
| `/products` | weekly | 0.8 | B2C browse index — live + indexed |
| `/products/category/garments` | weekly | 0.7 | Category index — live + indexed |
| `/products/category/home-textiles` | weekly | 0.7 | Category index — live + indexed |
| `/products/category/technical-textiles` | weekly | 0.7 | Category index — live + indexed |
| `/products/category/fabrics` | weekly | 0.7 | Category index — live + indexed |
| `/collections` | weekly | 0.8 | D2C collections index — live + indexed |
| `/collections/natural-fabric-stories` | weekly | 0.7 | Collection detail — live + indexed |
| `/collections/garment-supply-chain-context` | weekly | 0.7 | Collection detail — live + indexed |
| `/collections/home-textiles-showcase` | weekly | 0.7 | Collection detail — live + indexed |
| `/collections/textile-services-ecosystem` | weekly | 0.7 | Collection detail — live + indexed |
| `/collections/technical-textiles-context` | weekly | 0.7 | Collection detail — live + indexed |
| `/inquiry` | monthly | 0.5 | Intent capture — live + indexed |

**All 12 URLs use `https://app.texqtic.com` as canonical origin.** This is correct and
consistent with Option F.

**Sitemap expansion gates (unchanged from pre-strategy):**

| Expansion item | Gate condition | FTR ref |
|---|---|---|
| Individual product detail pages (`/product/:slug`) | HD-002 (real product data) + D-009 (threshold decision) | FTR-SEO-002 |
| Supplier profile pages (`/supplier/:slug`) | D-010 (supplier indexability policy) + FTR-SEO-003 | FTR-SEO-003 |
| /trust | FTR-SEO-004 content readiness | FTR-SEO-004 |
| /industries | FTR-SEO-005 content readiness | FTR-SEO-005 |
| /aggregator | FTR-SEO-006 content readiness | FTR-SEO-006 |

This strategy does NOT unblock these expansions. The expansion gates listed above remain open.

---

## 6. robots.txt Policy

**Current robots.txt (PRODUCTION_VERIFIED — `public/robots.txt`):**

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

**Authority:** `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001`

This policy is correct and consistent with Option F. No changes required by this strategy.

**Classification rationale:**

| Rule | Rationale | Status |
|---|---|---|
| `Allow: /products` | B2C browse — public acquisition surface | CORRECT |
| `Allow: /products/category/` | Category index pages — public acquisition surface | CORRECT |
| `Allow: /collections` | D2C collections — public acquisition surface | CORRECT |
| `Allow: /inquiry` | Buyer intent capture — permitted public surface | CORRECT |
| `Disallow: /api/` | Backend routes — never crawlable | CORRECT |
| `Disallow: /passport/` | DPP passport network — HOLD_FOR_PARESH_DECISION | CORRECT |
| `Disallow: /join/` | Referral landing — auth-gated flow | CORRECT |
| `Disallow: /supplier/` | Supplier profile — indexability policy D-010 unresolved | CORRECT |
| `Disallow: /trust` | Trust landing — stub, noindex enforced in App.tsx | CORRECT |
| `Disallow: /industries` | Industry cluster — stub, noindex enforced in App.tsx | CORRECT |
| `Disallow: /aggregator` | Aggregator discovery — stub, noindex enforced in App.tsx | CORRECT |

**Note on auth/private routes:** Auth-gated routes (`/auth`, `/tenant`, `/dashboard`,
`/control-plane`, `/onboarding`, `/token-handler`) are not explicitly listed in robots.txt
Disallow. They are not listed in Allow either. Google treats unlisted paths as implicitly
crawlable at Googlebot's discretion, but:
(a) The SPA serves the same initial HTML for all paths — there is no server-side auth gate on the
HTML itself for the crawler.
(b) App.tsx calls `clearPublicPageMeta()` for all non-public app states, which removes any managed
robots meta tag — no explicit `index, follow` signal is present for auth states.
(c) The auth routes require a Supabase session to render authenticated content — crawlers would
not see sensitive data even if they visited these paths.
(d) GSC production crawl verification (FTR-AUTH-003 / BS-003) remains an open prerequisite before
first public backlink or press mention.

---

## 7. Indexability Classification

### §7A — Public Acquisition Surfaces (index, follow)

These surfaces have `robots: 'index, follow'` set in App.tsx via `applyPublicPageMeta` and are
included in `sitemap.xml`. They are the primary SEO acquisition surfaces for the main app.

| Route pattern | App state | robots.txt | sitemap | robots meta | Status |
|---|---|---|---|---|---|
| `/products` | `PUBLIC_B2C_BROWSE` | Allow | ✅ | `index, follow` | LIVE + INDEXED |
| `/products/category/:slug` | `PUBLIC_B2C_BROWSE` + category config | Allow | ✅ (4 slugs) | `index, follow` (known slugs) / `noindex` (unknown) | LIVE + INDEXED |
| `/collections` | `PUBLIC_COLLECTIONS` | Allow | ✅ | `index, follow` | LIVE + INDEXED |
| `/collections/:slug` | `PUBLIC_COLLECTION_DETAIL` | Allow | ✅ (5 slugs) | `index, follow` (found) / `noindex` (unavailable) | LIVE + INDEXED |
| `/inquiry` | `PUBLIC_INQUIRY` | Allow | ✅ | `index, follow` | LIVE + INDEXED |
| `/product/:slug` | `PUBLIC_PRODUCT_DETAIL` | Allow | ❌ (not in sitemap yet) | `index, follow` (found) / `noindex` (not found) | LIVE, NOT IN SITEMAP |

### §7B — Stub Surfaces (noindex, nofollow — triple-layer guard)

These surfaces exist in the app but are not ready for public indexing. They use a
**defence-in-depth triple-layer** indexability guard:

**Layer 1:** `robots.txt Disallow` — crawler-level, immediate, JavaScript-independent.
**Layer 2:** App.tsx `applyPublicPageMeta({ robots: 'noindex, nofollow' })` — JavaScript-runtime
meta robots tag (requires JS rendering; honoured by Google's crawler after rendering).
**Layer 3:** Not included in `sitemap.xml` — no crawler discovery signal.

| Route | App state | robots.txt | sitemap | robots meta | Status |
|---|---|---|---|---|---|
| `/trust` | `PUBLIC_TRUST_LANDING` | Disallow | ❌ | `noindex, nofollow` (JS) | STUB — DO NOT INDEX |
| `/industries` | `PUBLIC_INDUSTRY_CLUSTER_LANDING` | Disallow | ❌ | `noindex, nofollow` (JS) | STUB — DO NOT INDEX |
| `/aggregator` | `PUBLIC_AGGREGATOR` | Disallow | ❌ | `noindex, nofollow` (JS) | STUB — DO NOT INDEX |

### §7C — Gated Surfaces (robots.txt Disallow, no sitemap)

These surfaces are gated pending policy or completeness decisions.

| Route | App state | robots.txt | sitemap | robots meta | Gate |
|---|---|---|---|---|---|
| `/supplier/:slug` | `PUBLIC_SUPPLIER_PROFILE` | Disallow | ❌ | None (clearPublicPageMeta) | D-010 policy + FTR-SEO-003 |
| `/passport/…` | DPP passport | Disallow | ❌ | N/A | HOLD_FOR_PARESH_DECISION |
| `/join/:referral_code` | `PUBLIC_REFERRAL_LANDING` | Disallow | ❌ | None (clearPublicPageMeta) | Referral-only flow |

**Note on `/supplier/:slug`:** When `appState === 'PUBLIC_SUPPLIER_PROFILE'`, App.tsx falls
through to `clearPublicPageMeta()` which removes all managed meta tags (including any prior robots
meta). There is no explicit `noindex` meta tag applied. The primary indexability guard is
`Disallow: /supplier/` in robots.txt. This is adequate for current posture but represents a
single-layer dependency on robots.txt for crawl exclusion. FTR-SEO-003 / D-010 resolution should
add an explicit `noindex` meta as the second layer before any supplier profile promotion.

### §7D — Auth and Platform Routes (not in robots.txt Allow; clearPublicPageMeta)

| Route pattern | App state | robots.txt | robots meta | Notes |
|---|---|---|---|---|
| Root `/` | `PUBLIC_ENTRY` | Not listed | None (clearPublicPageMeta on non-public states) | Entry routing point |
| `/auth` / `/login` | `AUTH` | Not listed | None (clearPublicPageMeta) | Auth views — not explicitly Disallowed |
| `/onboarding` | `ONBOARDING` | Not listed | None (clearPublicPageMeta) | Invite-gated — not indexed in practice |
| `/control-plane/…` | `CONTROL_PLANE` | Not listed | None (clearPublicPageMeta) | Admin surface — not indexed in practice |
| `/tenant/…` or subdomain | Tenant app states | Not listed | None (clearPublicPageMeta) | Authenticated tenant content |

**Architectural note (CSR):** The main app is a Vite + React CSR SPA. The server delivers a
bare HTML shell for all paths. There is no SSR, no pre-rendering, and no server-injected meta
tags. The robots meta tag is injected exclusively by App.tsx useEffect at runtime, after
JavaScript executes. For Googlebot, this means:
- Google renders JavaScript and will see the dynamically-set robots meta tags.
- Non-JS crawlers will see no robots meta tag at all and will default to implicit index/follow
  for all paths not listed in robots.txt Disallow.
- The robots.txt Disallow rules are the primary protection for stub routes against non-JS crawlers.
- BS-003 (auth/private route GSC verification) remains an open prerequisite.

---

## 8. Canonical Tag Implementation

App.tsx implements canonical tags via `applyPublicPageMeta({ canonical: '...' })`. Every
public-acquisition app state sets a canonical URL using the `origin` variable (which resolves to
`https://app.texqtic.com` in production).

**Verified canonical tag patterns:**

| Surface | canonical tag value | Pattern |
|---|---|---|
| `/products` | `https://app.texqtic.com/products` | Static path |
| `/products/category/:slug` | `https://app.texqtic.com/products/category/${slug}` | Dynamic slug |
| `/collections` | `https://app.texqtic.com/collections` | Static path |
| `/collections/:slug` | `https://app.texqtic.com/collections/${slug}` | Dynamic slug |
| `/inquiry` | `https://app.texqtic.com/inquiry` | Static path |
| `/product/:slug` | `https://app.texqtic.com/product/${slug}` | Dynamic slug |
| `/trust` (stub) | `https://app.texqtic.com/trust` | Static path (noindex guard) |
| `/industries` (stub) | `https://app.texqtic.com/industries` | Static path (noindex guard) |
| `/aggregator` (stub) | `https://app.texqtic.com/aggregator` | Static path (noindex guard) |

All canonical URLs consistently use `https://app.texqtic.com` as the origin. This is correct
under Option F. No cross-domain canonical tags to `texqtic.com` are present or required.

---

## 9. CSR Architecture Note for SEO

The main app is a **client-side-rendered (CSR) Vite + React SPA**. All SEO meta tags —
including canonical, robots, OG tags, and JSON-LD structured data — are injected dynamically by
App.tsx useEffect via `utils/publicPageMeta.ts`.

**Implications for SEO strategy:**

1. **Google renders JavaScript.** Google's crawler renders the SPA and will see the dynamically
   set meta tags. This is confirmed by Google's documented JS rendering behavior for Googlebot.

2. **Initial HTML is bare.** The static HTML delivered by the server (confirmed via live
   view-source on `/trust`) contains no meta tags beyond the base `<title>TexQtic Platform</title>`
   and a `<link rel="sitemap">` pointer. No meta description, no canonical, no robots meta.

3. **robots.txt is the primary guard for non-JS crawlers.** For stub routes (/trust,
   /industries, /aggregator) the Disallow rules in robots.txt are the only mechanism that
   prevents non-JS crawlers from indexing these pages.

4. **No SSR available.** Pre-rendering or static generation is not in scope for the current
   architecture. Any future decision to move to SSR/ISR (e.g., for product detail pages) would
   require a separate architecture decision and is out of scope for this strategy.

5. **No server-side canonical injection.** vercel.json has no `headers` entry to inject canonical
   tags at the CDN layer. The SPA's self-injected canonical is the sole canonical signal.

---

## 10. Marketing Domain Boundary (Option F)

Under Option F, the following is the domain allocation boundary:

**`texqtic.com` (marketing repo) owns:**
- Static marketing: homepage, brand, value proposition
- Education: how-it-works, role pages (for-buyers, for-suppliers)
- Supply-network education: supply-network overview, Surat network, manufacturing context
- Resources: articles, blog, case studies
- Company: about, team, contact
- Location/niche SEO: India/Surat/textile-specific landing pages
- Trust/compliance concept pages (marketing-level; not the app-level trust/passport)
- Supplier lead-capture: `/request-access`, `/supply-network/onboarding`

**`app.texqtic.com` (this repo) owns:**
- Dynamic public marketplace: `/products`, `/products/category/:slug`, `/product/:slug`
- D2C collections: `/collections`, `/collections/:slug`
- Buyer intent capture: `/inquiry`
- Supplier profiles: `/supplier/:slug` (gated, pending D-010)
- Trust/origin app surfaces: `/trust` (stub, noindex)
- Aggregator/industry app surfaces: `/industries`, `/aggregator` (stubs, noindex)
- DPP/passport network: `/passport/…` (gated, HOLD_FOR_PARESH_DECISION)
- Auth entry: all auth/tenant/control-plane routes
- Issued-link flows: `/join/:referral_code`
- All tenant dashboards and authenticated workflows

**Cross-domain CTAs:**
- `texqtic.com` may link to `https://app.texqtic.com/products` for buyer bridge CTAs.
  This is approved in principle, gated by HD-002 (real product data).
- `app.texqtic.com` public pages may link to `texqtic.com` for educational context.
- No product listing pages on `texqtic.com`. All product browse/discovery is `app.texqtic.com`.

---

## 11. Open SEO Prerequisites (Pre-Launch Gates)

The following prerequisites remain open after this strategy is defined. This strategy does not
close them.

| ID | Prerequisite | Priority | Launch class | Status |
|---|---|---|---|---|
| BS-003 / FTR-AUTH-003 | Auth/private route crawl exclusion GSC production verification | P0 | LAUNCH_DEPENDENCY | OPEN — required before first public backlink or press mention |
| BS-005 | JSON-LD external tool validation (Google Rich Results Test) | P1 | LAUNCH_DEPENDENCY | OPEN |
| HD-002 | Real product data in production (required before any product page promotion) | P0 | LAUNCH_DEPENDENCY | OPEN |
| FTR-SEO-002 | Product detail sitemap expansion | P2 | LAUNCH_DEPENDENCY | OPEN — gates HD-002 + D-009 |
| FTR-SEO-003 | Supplier profile indexability policy | P2 | LAUNCH_DEPENDENCY | OPEN — gates D-010 |
| FTR-SEO-004 | /trust page SEO metadata | P2 | PILOT_REQUIRED | OPEN |
| FTR-SEO-005 | /industries page SEO metadata | P2 | POST_MVP | OPEN |
| FTR-SEO-006 | /aggregator page SEO metadata | P3 | POST_MVP | OPEN |

---

## 12. Resolved Items (By This Strategy)

| Item | Resolution |
|---|---|
| D-005 (SEO Domain Canonical Strategy) | CLOSED — `app.texqtic.com` is canonical for all dynamic marketplace public pages; no redirect policy change needed; Option F lock satisfies trigger condition |
| FTR-SEO-001 (SEO domain canonical strategy deferred item) | STRATEGY_DEFINED — this unit IS the FTR-SEO-001 delivery; status promoted |
| FTR-SEO-007 (Canonical domain implementation) | STRATEGY_RESOLVED — no redirect or sitemap origin change needed; existing implementation is correct; remaining implementation gate narrowed to existing-site-wide canonical tag verification (already confirmed) |
| BS-007 (Live pages indexed under app.texqtic.com — canonical domain not yet decided) | RESOLVED — `app.texqtic.com` is the correct and intentional canonical domain; organic impressions and GSC authority correctly attributed |

---

## 13. Recommended Next Unit

Based on the SEO risk register after this strategy is defined, the highest-priority next SEO
governance unit is:

**`BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001`**

- Rationale: BS-003 is a P0 launch gate. Code evidence confirms protection mechanisms exist
  (robots.txt Disallow for /api/, /passport/, /supplier/, /join/; App.tsx `clearPublicPageMeta()`
  for non-public states). The missing step is a GSC production crawl verification confirming
  that authenticated/private routes are not appearing in Google's index.
- This unit is `IMPLEMENTATION_READY` (code evidence exists; verification artifact is the output).
- Required before: first public backlink, press mention, or GSC Search Console submission.
- Cross-reference: FTR-AUTH-003 (FUTURE-TODO-REGISTER.md); BS-003 (BLIND-SPOT register).

---

## 14. Marketing Repo Decision Provenance

This strategy depends on the Option F lock in the marketing repository. For audit purposes:

| Item | Reference |
|---|---|
| Marketing repo lock document | `MARKETING-APP-PUBLIC-PAGES-DOMAIN-SEPARATION-DECISION-LOCK-001` |
| Lock commits | 0bed542, 3246ca4, fa5d54e |
| Option F confirmed canonical origin | `PLATFORM_APP_URL = https://app.texqtic.com` |
| Buyer bridge CTA approval | Approved in principle; gated by HD-002 |
| Product listing pages on texqtic.com | REJECTED under Option F |
| No app-root redirect | CONFIRMED under Option F |
| No app-root login-only/noindex | CONFIRMED — Option E rejected |

---

## 15. Source-Truth Evidence Summary

This strategy is grounded in direct repo inspection and live page verification performed on
2026-07-22.

| Source file | Verification method | Finding |
|---|---|---|
| `public/robots.txt` | File read + live URL verification | Matches exactly; Disallow rules correct |
| `public/sitemap.xml` | File read + live URL verification | 12 URLs; all `https://app.texqtic.com`; no auth/stub routes |
| `App.tsx` SEO useEffect | Grep + direct file read (lines 2980–3520) | noindex guards confirmed for PUBLIC_TRUST_LANDING, PUBLIC_INDUSTRY_CLUSTER_LANDING, PUBLIC_AGGREGATOR; clearPublicPageMeta() for PUBLIC_SUPPLIER_PROFILE and all auth states |
| `utils/publicPageMeta.ts` | File read (lines 245–260) | `clearPublicPageMeta()` removes all managed meta tags including robots |
| `vercel.json` | File read | No redirect rules; filesystem passthrough before SPA fallback confirmed |
| `middleware.ts` | File read + grep | Host-based tenant resolver only; no SEO redirect logic |
| Live view-source `/trust` | Browser navigation | Bare SPA HTML shell served; no server-injected meta tags; `<link rel="sitemap">` present |
| Live `robots.txt` | Browser navigation | Exact match to `public/robots.txt` source |
| Live `sitemap.xml` | Browser navigation | Exact match to `public/sitemap.xml` source |

---

## 16. GSC and Crawl Posture (Current)

As of 2026-07-22, the following GSC posture holds:

- Sitemap submitted/discoverable: `https://app.texqtic.com/sitemap.xml` (referenced in robots.txt and in live HTML `<link rel="sitemap">`)
- Canonical domain: `app.texqtic.com` (confirmed by sitemap origin + canonical tags)
- Indexed surfaces: /products, /products/category/* (4 slugs), /collections, /collections/* (5 slugs), /inquiry
- Not indexed (guards in place): /trust, /industries, /aggregator, /supplier/*, /api/*, /passport/*, /join/*
- GSC production crawl verification: PENDING — BS-003 / FTR-AUTH-003 is an open prerequisite

**Pre-GSC-submission gate:** Before formal GSC submission or first press mention, BS-003 must be
verified. Specifically: confirm that no auth-gated or private routes are appearing in Google
index for `site:app.texqtic.com`.

---

## 17. Schema.org / JSON-LD Posture

JSON-LD structured data is implemented via `applyPublicPageMeta({ jsonLd: [...] })` in App.tsx.
Implementation authority: `PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001`.

Current live JSON-LD types:
- `WebPage` — on /products, /products/category/:slug, /collections/:slug
- `BreadcrumbList` — on /products/category/:slug, /collections/:slug
- `WebSite` — on /products (isPartOf reference)
- No `Product`, `Offer`, `Organization`, or `ItemList` types (deferred — FTR-SEO-008, FTR-SEO-009)

Under Option F: all JSON-LD is self-referential to `https://app.texqtic.com`. No cross-domain
`sameAs` or `mainEntityOfPage` references to `texqtic.com` are required. If `texqtic.com`
implements `WebSite` schema for the marketing domain, a `sameAs` link between the two may be
appropriate in a future unit — but this is post-MVP and not required for the current strategy.

BS-005 (JSON-LD external tool validation) remains open.

---

## 18. Indexability Lifecycle Governance

The following rules govern changes to the indexability classification of any route:

1. **To promote a stub route from `noindex` to `index, follow`:**
   - Requires: removal of `Disallow` from robots.txt AND update to App.tsx meta robots AND
     addition to sitemap.xml.
   - Requires: separate governance unit explicitly authorizing the promotion.
   - Example: promoting `/trust` requires FTR-SEO-004 completion + Paresh authorization.

2. **To add a new route to sitemap.xml:**
   - Requires: canonical strategy confirmed (done by this unit) AND route is in robots.txt Allow
     or explicitly not Disallowed AND App.tsx sets `robots: 'index, follow'`.
   - Requires: separate governance unit explicitly authorizing the addition.

3. **To add a new Disallow rule to robots.txt:**
   - Requires: identifying a route that is incorrectly crawlable or at risk of indexing.
   - Requires: corresponding `noindex` meta tag in App.tsx as second layer.
   - Can be done as part of a maintenance unit.

4. **To change the canonical domain from `app.texqtic.com`:**
   - Requires: new Paresh decision to override Option F lock.
   - Requires: full sitemap.xml migration, canonical tag site-wide update, robots.txt update.
   - Requires: Google Search Console domain change notification.
   - THIS IS A SIGNIFICANT OPERATION. Do not do this without explicit multi-step approval.

---

## 19. Dependency Register

| Dependency | Downstream affected items | Current status |
|---|---|---|
| HD-002 (real product data) | FTR-SEO-002 (product sitemap), D-009 (threshold), buyer bridge CTA, BS-001 | OPEN — P0 |
| D-010 (supplier indexability policy) | FTR-SEO-003, FTR-SEO-009, supplier profile JS noindex layer | PARKED |
| D-009 (product sitemap threshold) | FTR-SEO-002 | PARKED — gates D-005 (now resolved), needs HD-002 first |
| BS-003 / FTR-AUTH-003 (GSC verification) | Public backlink approval, press mention approval | OPEN — P0 |
| BS-005 (JSON-LD external validation) | Rich result eligibility | OPEN — P1 |
| FTR-SEO-004 (/trust content readiness) | /trust promotion, trust noindex removal | OPEN — P2 |
| FTR-SEO-005 (/industries content readiness) | /industries promotion | OPEN — P2 |
| FTR-SEO-006 (/aggregator content readiness) | /aggregator promotion | OPEN — P3 |

---

## 20. Update History

| Date | Change | Author |
|---|---|---|
| 2026-07-22 | Document created. Strategy defined. D-005 closed. FTR-SEO-001 delivered. BS-007 resolved. | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` |
