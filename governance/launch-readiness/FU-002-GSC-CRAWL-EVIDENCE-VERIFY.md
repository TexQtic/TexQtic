# FU-002 — GSC Crawl Evidence Verification

**Authority:** `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (BS-003, P0 PARTIAL) ·
**Cross-referenced:** `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (FTR-AUTH-003) ·
**Unit:** `governance/units/FU-002-GSC-CRAWL-EVIDENCE-VERIFY.md` ·
**Date:** 2026-07-22 · **Decision:** FAIL · **Status:** AUTH_LOGIN_INDEXED / DEPLOYMENT_GAP

---

## 1. Executive Summary

This document records the evidence-gathering verification for FU-002, the prescribed follow-up
to FU-001 (robots.txt auth route Disallow update). The objective was to confirm via Google Search
Console and/or public search engine evidence that no auth-gated, private, tenant, or control-plane
routes under `app.texqtic.com` are publicly indexed.

**Verification decision: FAIL.**

**Primary finding:** 3 URLs under the `/auth/login` path are publicly indexed in DuckDuckGo.
All 3 are variants of `/auth/login?next=...` (plan pricing and onboarding redirect flows).
Content at indexed URLs: login form only ("Sign in to your account to continue / Email / Password
/ Sign In"). No private data, no tenant data, no operational records visible.

**Secondary finding (blocking):** FU-001 has never been deployed to production. The local `main`
branch is 7 commits ahead of `origin/main`. The live production `robots.txt` at
`https://app.texqtic.com/robots.txt` is the pre-FU-001 version and does NOT include the 8
auth/private Disallow entries added by FU-001. This is Stop Condition 5.

**Good news:** All other auth/private routes (dashboard, control-plane, tenant, workspace,
onboarding, token-handler, bare /login) are confirmed NOT indexed. Sensitive-content phrases
("Tenant Access", "Staff Control", "Use issued access link") are confirmed NOT indexed.
The sitemap contains only approved public marketplace URLs — no private routes.

**Risk assessment:** FUNCTIONAL risk is LOW. The `/auth/login` page being indexed is common
for web platforms; it shows only a generic login form. No sensitive data is exposed. However,
the governance FAIL criterion ("any auth/private/gated URL indexed") is technically met.

**Remediation path:** Deploy FU-001 (`git push origin main`) → `/auth` will be disallowed for
further crawling → existing indexed URLs will be deindexed over time → re-verify as FU-003.

---

## 2. Verification Scope

This unit checks for public indexation of the following route categories:

**Group A — Auth Routes (must NOT be indexed):**
- `/auth` / `/auth/login?*` — auth flow entry
- `/dashboard` — tenant dashboard
- `/control-plane` — super-admin surface
- `/tenant` — tenant-plane routes
- `/workspace` — workspace routes
- `/onboarding` — onboarding flow (path-based)
- `/token-handler` — token processing path
- `/login` — bare login path

**Group B — Gated / API Routes (must NOT be indexed):**
- `/api/` — API routes
- `/supplier/:slug`, `/passport/:id`, `/join/:code`

**Content checks (sensitive phrases that must NOT appear):**
- "Tenant Access"
- "Staff Control"
- "Use issued access link"
- "Welcome back" (auth login page heading)

**Sitemap check:**
- Live sitemap must contain only approved public marketplace URLs

---

## 3. Evidence Sources Used

| Source | Status | Notes |
|---|---|---|
| Google Search Console (GSC) | UNAVAILABLE | Requires authenticated browser sign-in; outside automated scope |
| Google site: operator | UNAVAILABLE | Blocked by reCAPTCHA / anti-automation challenge |
| Bing site: operator | UNAVAILABLE | Blocked by challenge screen |
| DuckDuckGo site: operator | ✅ AVAILABLE | All route checks executed via fetch_webpage |
| Live robots.txt fetch | ✅ AVAILABLE | `https://app.texqtic.com/robots.txt` |
| Live sitemap.xml fetch | ✅ AVAILABLE | `https://app.texqtic.com/sitemap.xml` (partial render) |

---

## 4. Live Production State — robots.txt

**URL:** `https://app.texqtic.com/robots.txt` · **Fetched:** 2026-07-22

**DEPLOYMENT GAP CONFIRMED — Stop Condition 5 active.**

Live production `robots.txt` is the **pre-FU-001 version**. The 8 auth/private Disallow entries
added by FU-001 commit `978ea6f` are absent from the live production file.

**Live file (production):**
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

The following 8 entries are **absent from production** (present only in local branch HEAD `978ea6f`):
```
Disallow: /auth
Disallow: /dashboard
Disallow: /control-plane
Disallow: /tenant
Disallow: /workspace
Disallow: /onboarding
Disallow: /token-handler
Disallow: /login
```

**Root cause:** Local `main` branch is 7 commits ahead of `origin/main`. Commits were never
pushed to GitHub / deployed to Vercel. Live Vercel deployment reflects pre-FU-001 codebase.

---

## 5. Live Production State — sitemap.xml

**URL:** `https://app.texqtic.com/sitemap.xml` · **Fetched:** 2026-07-22

**Result: CLEAN — No auth/private URLs in sitemap. ✅**

Live sitemap contains only public marketplace URLs:
- `/products` (priority 0.8, weekly)
- `/products/category/garments` (priority 0.7, weekly)
- `/products/category/home-textiles` (priority 0.7, weekly)
- `/products/category/technical-textiles` (priority 0.7, weekly)
- `/products/category/fabrics` (priority 0.7, weekly)
- Additional public category and collection URLs (consistent with prior BS-003 count of 12 URLs)

No auth, dashboard, control-plane, tenant, workspace, onboarding, or token-handler URLs. ✅
Sitemap unchanged from BS-003 prior verification (same structure, same namespace). ✅

---

## 6. Public Search Evidence — Full Results Table

**Date:** 2026-07-22 · **Search engine:** DuckDuckGo (site: operator)

### Route Coverage

| Route category | Query | Result | Pass/Fail |
|---|---|---|---|
| Auth entry | `site:app.texqtic.com/auth` | **3 results — /auth/login?next=... variants** | ❌ FAIL |
| Dashboard | `site:app.texqtic.com/dashboard` | No results | ✅ PASS |
| Control plane | `site:app.texqtic.com/control-plane` | No results | ✅ PASS |
| Onboarding (path) | `site:app.texqtic.com/onboarding` | No results | ✅ PASS |
| Tenant plane | `site:app.texqtic.com/tenant` | No results | ✅ PASS |
| Workspace | `site:app.texqtic.com/workspace` | No results | ✅ PASS |
| Token handler | `site:app.texqtic.com/token-handler` | No results | ✅ PASS |
| Bare login | `site:app.texqtic.com/login` | No results | ✅ PASS |
| Supplier gated | `site:app.texqtic.com/supplier` | No results | ✅ PASS |
| Passport gated | `site:app.texqtic.com/passport` | No results | ✅ PASS |
| Invite gated | `site:app.texqtic.com/join` | No results | ✅ PASS |
| API routes | `site:app.texqtic.com/api` | No results | ✅ PASS |

### Sensitive Content Phrase Checks

| Phrase | Query | Result | Pass/Fail |
|---|---|---|---|
| "Tenant Access" | `site:app.texqtic.com "Tenant Access"` | No results | ✅ PASS |
| "Staff Control" | `site:app.texqtic.com "Staff Control"` | No results | ✅ PASS |
| "Use issued access link" | `site:app.texqtic.com "Use issued access link"` | No results | ✅ PASS |
| "Welcome back" (login heading) | `site:app.texqtic.com "Welcome back"` | **1 result — /auth/login?next=...** | ❌ FAIL |

### Summary Score

**Checks PASSED:** 14/16 · **Checks FAILED:** 2/16 (both relating to `/auth/login`)

---

## 7. Indexed /auth/login URL Record

Three `/auth/login` URL variants are publicly indexed in DuckDuckGo:

| # | URL | Title indexed | Content visible | Risk level |
|---|---|---|---|---|
| 1 | `https://app.texqtic.com/auth/login?next=/select-plan?plan=free&source=pricing` | "TexQtic Platform Entry" | Generic SPA content | LOW |
| 2 | `https://app.texqtic.com/auth/login?next=%2Fselect-plan%3Fplan%3Dbusiness` | "Welcome back" | Login form: "Sign in to your account to continue / Email / Password / Sign In" | LOW |
| 3 | `https://app.texqtic.com/auth/login?next=/onboarding/select-plan?plan=free&source=pricing` | "TexQtic Platform" | Generic SPA content | LOW |

**Content assessment:**
- URL 1: Indexed with PUBLIC_ENTRY generic meta title (SPA shell before JS load). No private content.
- URL 2: Indexed with "Welcome back" JS-rendered login heading. Shows login form — email, password fields.
  No private data, no tenant data, no auth tokens visible. This is a standard login page.
- URL 3: Indexed with generic "TexQtic Platform" title. No private content.

**Trigger mechanism (probable):** Crawlers likely followed links from pricing or onboarding flows
that produce `/auth/login?next=...` redirect URLs. The `?next=` parameters point to plan selection
and onboarding pages — public flows that a crawler would have been able to follow.

**Sensitive data exposure:** NONE. The login form itself is not sensitive content.
Functional impact of these URLs being indexed: LOW. Users clicking on an indexed result see the
standard login form — no worse than navigating to `/auth/login` directly.

---

## 8. Route Classification Table — Updated

| Route Group | Routes | robots.txt (LIVE) | robots.txt (FU-001 local) | Sitemap | Indexed? | Private content exposed? | Classification |
|---|---|---|---|---|---|---|---|
| Public Indexable | `/products`, `/collections`, `/inquiry`, `/products/category/:slug`, `/collections/:slug` | Allow | Allow | Included | Yes — expected | N/A | ✅ PASS |
| Stub Gated | `/trust`, `/industries`, `/aggregator` | Disallow | Disallow | Not included | No | No | ✅ PASS |
| Profile Gated | `/supplier/:slug`, `/passport/:id`, `/join/:code` | Disallow | Disallow | Not included | No | No | ✅ PASS |
| API | `/api/` | Disallow | Disallow | Not included | No | No | ✅ PASS |
| Auth / Private | `/auth/login?next=...` | **Not disallowed** ⚠️ | Disallowed ✅ (undeployed) | Not included ✅ | **YES — 3 URLs** ❌ | No (login form only) | ❌ FAIL |
| Auth / Private | `/dashboard`, `/control-plane`, `/tenant`, `/workspace`, `/onboarding`, `/token-handler`, `/login` | Not disallowed ⚠️ | Disallowed ✅ (undeployed) | Not included ✅ | No ✅ | No | ⚠️ PARTIAL |

---

## 9. Findings Summary

### Confirmed Clean (10/12 route categories)

1. ✅ `/dashboard` — Not indexed
2. ✅ `/control-plane` — Not indexed
3. ✅ `/onboarding` — Not indexed
4. ✅ `/tenant` — Not indexed
5. ✅ `/workspace` — Not indexed
6. ✅ `/token-handler` — Not indexed
7. ✅ `/login` (bare) — Not indexed
8. ✅ `/supplier`, `/passport`, `/join` — Not indexed
9. ✅ `/api` — Not indexed
10. ✅ No sensitive-content phrases indexed ("Tenant Access", "Staff Control", "Use issued access link")
11. ✅ Sitemap contains only approved public marketplace URLs

### Confirmed Fail (Auth route indexed)

12. ❌ `/auth/login?next=...` — 3 URL variants indexed in DuckDuckGo
13. ❌ "Welcome back" phrase indexed at `/auth/login?next=...`

### Blocking Conditions

14. 🚨 **Stop Condition 4 (ACTIVE):** Auth URL indexed — `/auth/login`
15. 🚨 **Stop Condition 5 (ACTIVE):** Live robots.txt does not include FU-001 entries (deployment gap)

---

## 10. FAIL Decision Rationale

**Decision: FAIL**

FAIL criterion met: "Any auth/private/gated URL is indexed."

The `/auth/login?next=...` URL family falls under the `/auth` prefix — a route group designated
as auth/gated in the BS-003 scope and now (locally) Disallowed by FU-001.

**Mitigating factors (do not change classification):**
1. Content at indexed URLs is login form only — no private/sensitive data
2. No dashboard, control-plane, tenant, workspace, or post-login pages indexed
3. Login pages being indexed is common and not inherently harmful
4. No "Tenant Access", "Staff Control", or any sensitive operational content visible
5. After FU-001 deployment, `/auth` will be Disallowed — crawlers will stop indexing new auth URLs

**Why PASS is not warranted:**
The FAIL criterion is defined at the URL level (any auth URL indexed), not the content level.
The intent of the criterion is to ensure the auth namespace is excluded from search indices —
a state that has not yet been confirmed achieved.

**Deployment gap impact:**
FU-001 is the primary mitigation for this finding. Its non-deployment is why the `/auth` prefix
remains crawlable in production. Once deployed, `Disallow: /auth` will prevent future indexation.
The already-indexed URLs will be deindexed after search engines re-crawl and observe the Disallow
directive (typically within days to weeks after deployment).

---

## 11. Risk Assessment

**Functional risk from `/auth/login` indexation:** LOW

- No private content exposed
- Login form only — standard expected behavior for unauthenticated users
- No tenant data, no operational records, no credentials visible
- SPA architecture means no server-side content leakage is possible
- The prior BS-003 verification confirmed that even with JS, auth routes serve only PUBLIC_ENTRY

**Governance risk:** FAIL — must be remediated before VERIFIED_PASS can be recorded.

**Pre-backlink/pre-press risk:** MODERATE to HIGH — with FU-001 undeployed, crawlers can
continue to index any new `/auth/login?next=...` URLs that surface (e.g., via new pricing
links or onboarding flows added in future commits).

**Post-deployment risk (after FU-001 pushed and deployed):** LOW — robots.txt `Disallow: /auth`
will prevent new crawling; existing URLs will be deindexed within the standard re-crawl cycle.

---

## 12. Comparison to BS-003 Prior Findings

| Finding | BS-003 (2026-07-22) | FU-002 (2026-07-22) |
|---|---|---|
| Auth URLs in sitemap | No ✅ | No ✅ (unchanged) |
| robots.txt covers auth routes | No ⚠️ (gap documented) | No ⚠️ (FU-001 undeployed) |
| Link graph from public pages to auth | None ✅ | None ✅ (unchanged) |
| Auth content at private URLs (JS) | No ✅ (PUBLIC_ENTRY) | No ✅ |
| Auth URLs indexed in search | Unknown (GSC unavailable) | **YES — /auth/login ❌** |
| `/dashboard`, `/control-plane` etc. indexed | Unknown | No ✅ |
| Sensitive content phrases indexed | Unknown | No ✅ |
| robots.txt deployed with FU-001 entries | N/A | No ⚠️ (deployment gap) |

---

## 13. Remediation Path to VERIFIED_PASS

**Step 1 (IMMEDIATE P0) — Deploy FU-001:**
```
git push origin main
```
Pushes all 7 local commits (including FU-001 robots.txt update) to GitHub/Vercel.
Verify live `https://app.texqtic.com/robots.txt` shows 8 FU-001 Disallow entries.

**Step 2 (P0, concurrent) — Monitor re-crawl:**
After FU-001 is deployed, search engines will re-crawl `app.texqtic.com` and encounter
`Disallow: /auth`. Existing indexed `/auth/login` URLs will be removed from search index.
Typical timeline: days to weeks.

**Step 3 (P1, post re-crawl) — FU-003 re-verification:**
Re-run DuckDuckGo `site:app.texqtic.com/auth` check. Expect no results.
If GSC is accessible to Paresh: check Coverage report for remaining auth URL entries.
If clean: close BS-003 as VERIFIED_PASS, close FTR-AUTH-003 as VERIFIED_PASS.

**Optional Step 4 (P2) — Belt-and-suspenders noindex:**
Add `<meta name="robots" content="noindex, nofollow">` to the login page component
as defense-in-depth. Low priority given deployment of Disallow would be sufficient.

---

## 14. Update History

| Date | Change | Who |
|---|---|---|
| 2026-07-22 | FU-002 verification executed — DuckDuckGo public search checks completed; /auth/login indexed (3 URLs); live robots.txt deployment gap confirmed; FAIL decision recorded; stop conditions 4 + 5 active; no commit created | `FU-002-GSC-CRAWL-EVIDENCE-VERIFY` |
