# FU-002-GSC-CRAWL-EVIDENCE-VERIFY

**Unit type:** Verification (evidence-gathering only — no source/runtime changes) ·
**Register reference:** BS-003 (BLIND-SPOT register, P0 PARTIAL) · FTR-AUTH-003 (FUTURE-TODO register, ROBOTS_GAP_CLOSED/PARTIAL) ·
**Date:** 2026-07-22 · **Decision:** FAIL — Stop Conditions 4 + 5 active · **Commit:** NOT COMMITTED (stop conditions active)

---

## 1. Unit Header

| Field | Value |
|---|---|
| Unit ID | FU-002-GSC-CRAWL-EVIDENCE-VERIFY |
| Unit type | Verification (evidence-gathering only — no source or runtime changes) |
| Starting HEAD | `4d04391` |
| Starting branch | `main` |
| Starting tree status | CLEAN (0 staged, 0 unstaged, 0 untracked) |
| Local ahead of origin | 7 commits — FU-001 (and prior commits) never pushed/deployed |
| Decision | FAIL |
| Stop conditions active | Condition 4 (auth URL indexed) + Condition 5 (live robots.txt lacks FU-001 entries) |
| Commit hash | `c611523` — [TEXQTIC] governance: record FU-002 auth crawl evidence fail |

---

## 2. Objective

Gather public search engine evidence to determine whether auth-gated, private, tenant,
and control-plane routes under `app.texqtic.com` are indexed in search engines.

This unit is the GSC/public-search evidence step prescribed by:

- `BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY.md` §20 FU-002: "Open GSC for `app.texqtic.com`,
  confirm Coverage report shows no private/auth routes indexed"
- `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` BS-003: "Run GSC production coverage check (FU-002)
  to confirm no auth/private routes indexed. Required for VERIFIED_PASS."
- `FUTURE-TODO-REGISTER.md` FTR-AUTH-003: "Remaining gap: GSC production crawl evidence (FU-002
  required for full VERIFIED_PASS)."
- `governance/control/NEXT-ACTION.md` FU-001 closure note: "BS-003 remains PARTIAL: only GSC
  production crawl evidence (FU-002) remains required."

This unit uses only public search engine evidence (DuckDuckGo `site:` operator) because
Google Search Console requires authenticated browser sign-in unavailable in this automated
environment.

No source code, runtime, schema, migration, or configuration files are modified in this unit.

---

## 3. Starting Git State

```
$ git status --short
(no output — clean tree)

$ git log --oneline -5
4d04391 (HEAD -> main) [TEXQTIC] governance: backfill commit hash in FU-001 unit artifact
978ea6f [TEXQTIC] seo: disallow auth private routes in robots
08852e8 [TEXQTIC] governance: backfill commit hash in BS-003 verify unit artifact
ea9de41 [TEXQTIC] governance: verify auth private route indexability
485b12d [TEXQTIC] governance: define public SEO canonical strategy

$ git branch --show-current
main
```

**Pre-flight:** Working tree CLEAN. HEAD at `4d04391`. Branch: `main`.

**Deployment gap noted:** The local branch is 7 commits ahead of `origin/main`. Commits
`978ea6f` (FU-001 robots.txt update) and `4d04391` (FU-001 hash backfill) have never been
pushed to origin and have never been deployed to Vercel. The live production site at
`https://app.texqtic.com` is running an older version of the codebase that does **not** include
the FU-001 robots.txt Disallow entries. This is Stop Condition 5.

---

## 4. Authoritative Documents Inspected

| Document | Key finding |
|---|---|
| `governance/launch-readiness/BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY.md` | FU-002 prescribed at §20; verification scope, FAIL/PASS criteria defined |
| `governance/units/FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE.md` | FU-001 local commit confirmed `978ea6f`; never deployed to production |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | BS-003 PARTIAL; mitigation requires FU-002 GSC evidence for VERIFIED_PASS |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-AUTH-003 ROBOTS_GAP_CLOSED / PARTIAL; FU-002 required for closure |
| `governance/control/NEXT-ACTION.md` | last_closed: FU-001 ROBOTS_GAP_CLOSED; FU-002 named as next required step |

---

## 5. GSC Availability Assessment

**Result: UNAVAILABLE**

Google Search Console (GSC) for `app.texqtic.com` requires authenticated browser sign-in.
This automated verification environment does not have GSC credentials or persistent
browser session. GSC evidence could not be collected.

This is consistent with the expectation documented in the FU-002 spec: "Attempt GSC check;
if unavailable, proceed with public search checks and document the limitation."

**Fallback:** DuckDuckGo `site:` operator queries used as primary public evidence source.
Google and Bing were attempted but blocked by CAPTCHA / anti-automation challenges.

---

## 6. Live robots.txt Check

**URL:** `https://app.texqtic.com/robots.txt` · **Date:** 2026-07-22

**Result: DEPLOYMENT GAP CONFIRMED — Stop Condition 5 active.**

The live production robots.txt does NOT include the 8 FU-001 Disallow entries.

**Live production robots.txt (at time of verification):**
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

**Expected (post-FU-001) robots.txt — ABSENT FROM PRODUCTION:**
```
# Auth-gated and private routes — FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE (2026-07-22)
Disallow: /auth
Disallow: /dashboard
Disallow: /control-plane
Disallow: /tenant
Disallow: /workspace
Disallow: /onboarding
Disallow: /token-handler
Disallow: /login
```

**Root cause:** Local `main` branch is 7 commits ahead of `origin/main`. FU-001 commits
were never pushed (not `git push`-ed to origin/GitHub/Vercel). The live Vercel deployment
reflects the pre-FU-001 state.

This is **Stop Condition 5**: "Live robots.txt does not include FU-001 entries."

---

## 7. Live sitemap.xml Check

**URL:** `https://app.texqtic.com/sitemap.xml` · **Date:** 2026-07-22

**Result: CLEAN — No auth/private routes in sitemap.**

Live sitemap confirms only public marketplace URLs are listed:
- `/products`
- `/products/category/garments`
- `/products/category/home-textiles`
- `/products/category/technical-textiles`
- `/products/category/fabrics`
- (additional public category/collection URLs — consistent with BS-003 prior finding of 12 total)

No auth, dashboard, control-plane, tenant, workspace, onboarding, token-handler, or login
URLs appear in the live sitemap. ✅

---

## 8. Public Search Engine Checks — DuckDuckGo site: Queries

All queries run via DuckDuckGo `site:` operator (fetch_webpage) on 2026-07-22.

### Route Checks

| Query | Expected | Result | Evidence |
|---|---|---|---|
| `site:app.texqtic.com/auth` | No results | **RESULTS FOUND** ❌ | 3 `/auth/login?next=...` URLs indexed |
| `site:app.texqtic.com/dashboard` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com/control-plane` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com/onboarding` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com/tenant` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com/workspace` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com/token-handler` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com/login` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com/supplier` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com/passport` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com/join` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com/api` | No results | No results ✅ | DDG: "No results found" |

### Sensitive-Content Phrase Checks

| Query | Expected | Result | Evidence |
|---|---|---|---|
| `site:app.texqtic.com "Tenant Access"` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com "Staff Control"` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com "Use issued access link"` | No results | No results ✅ | DDG: "No results found" |
| `site:app.texqtic.com "Welcome back"` | No results | **RESULTS FOUND** ❌ | `/auth/login?next=...` — "Sign in to your account to continue" |

### Additional Diagnostic Queries

| Query | Result |
|---|---|
| `site:app.texqtic.com "TexQtic Platform Entry"` | Multiple results — public pages (/, /select-plan, /register, /marketplace, /en/marketplace, /en/profiles, /contact) + **`/auth/login?next=...`** |

---

## 9. Indexed /auth/login URLs — Full Record

The following 3 URLs under the `/auth` prefix were confirmed indexed in DuckDuckGo:

### URL 1
- **URL:** `https://app.texqtic.com/auth/login?next=/select-plan?plan=free&source=pricing`
- **Title:** "TexQtic Platform Entry"
- **Snippet:** Verified textile commerce platform; generic SPA public content
- **Classification:** Auth route — login form (no private/tenant data visible)

### URL 2
- **URL:** `https://app.texqtic.com/auth/login?next=%2Fselect-plan%3Fplan%3Dbusiness`
- **Title:** "Welcome back"
- **Snippet:** "Sign in to your account to continue Email Password Sign In"
- **Classification:** Auth route — login form rendered with page title; no private/tenant data visible

### URL 3
- **URL:** `https://app.texqtic.com/auth/login?next=/onboarding/select-plan?plan=free&source=pricing`
- **Title:** "TexQtic Platform"
- **Classification:** Auth route — login form variant with onboarding redirect parameter

**Common factor:** All 3 URLs are variants of `/auth/login` with `?next=` redirect parameters.
They were likely indexed by crawlers following links from public pages (e.g., "Sign In" or
"Get Started" buttons that redirect through `/auth/login?next=...`).

**Content at indexed URLs:** Login form only ("Sign in to your account to continue / Email
/ Password / Sign In"). No private data, no tenant data, no operational records visible.
This is consistent with the SPA auth form state — NOT the PUBLIC_ENTRY state.

**Trigger mechanism:** Crawlers likely followed JS-rendered button click events or captured
URL strings from page source. The `?next=` parameter variants suggest the crawler visited
pricing/select-plan flows that produced these auth redirect URLs.

---

## 10. Additional Indexed Pages Observed (Out of BS-003 Scope)

The phrase check `site:app.texqtic.com "TexQtic Platform Entry"` revealed additional indexed
pages not in the approved sitemap. These are outside the BS-003 auth-route scope but warrant
a separate future review:

| URL | Content | Issue |
|---|---|---|
| `https://app.texqtic.com/select-plan` | PUBLIC_ENTRY state | Not in sitemap; indexed |
| `https://app.texqtic.com/register` | PUBLIC_ENTRY state | Not in sitemap; indexed |
| `https://app.texqtic.com/marketplace` | PUBLIC_ENTRY state | Not in sitemap; indexed |
| `https://app.texqtic.com/en/marketplace` | PUBLIC_ENTRY state | Not in sitemap; `/en/` path unexpected |
| `https://app.texqtic.com/en/profiles` | PUBLIC_ENTRY state | Not in sitemap; `/en/` path unexpected |
| `https://app.texqtic.com/contact` | PUBLIC_ENTRY state | Not in sitemap; indexed |

**Assessment:** These pages render the PUBLIC_ENTRY state (generic TexQtic landing page —
no private data). They are not auth/private routes. However, they create duplicate content
(same PUBLIC_ENTRY content at multiple URLs, same title "TexQtic Platform Entry"). This is
a separate SEO hygiene concern and should be addressed in a future unit focused on non-sitemap
URL control (noindex or canonical tags for PUBLIC_ENTRY state at unexpected URL paths).

This finding does NOT affect the BS-003 FAIL decision (which is scoped to auth/private routes).

---

## 11. Findings Summary

### CONFIRMED CLEAN (10/12 route checks)

1. ✅ `/dashboard` — Not indexed
2. ✅ `/control-plane` — Not indexed
3. ✅ `/onboarding` — Not indexed
4. ✅ `/tenant` — Not indexed
5. ✅ `/workspace` — Not indexed
6. ✅ `/token-handler` — Not indexed
7. ✅ `/login` (bare — not `/auth/login`) — Not indexed
8. ✅ `/supplier`, `/passport`, `/join` — Not indexed
9. ✅ `/api` — Not indexed
10. ✅ No sensitive content phrases found ("Tenant Access", "Staff Control", "Use issued access link")
11. ✅ Sitemap contains only approved public marketplace URLs — no private routes

### CONFIRMED FAIL (2/12 — auth route indexed)

12. ❌ `/auth` — INDEXED: 3 `/auth/login?next=...` URL variants found in DuckDuckGo
13. ❌ `"Welcome back"` phrase — found at `/auth/login?next=...` (login form content indexed)

### STOP CONDITIONS ACTIVE

14. 🚨 **Stop Condition 4:** Auth/private URL indexed (`/auth/login`) — confirmed FAIL
15. 🚨 **Stop Condition 5:** Live robots.txt does NOT include FU-001 Disallow entries — deployment gap

---

## 12. Decision: FAIL

**Classification:** FAIL — Auth route `/auth/login` is publicly indexed.

**FAIL criterion met:** "Any auth/private/gated URL is indexed."
— `/auth/login?next=...` URLs fall under the `/auth` prefix. 3 indexed variants confirmed.

**Risk qualification:**
- Content at indexed URLs: login form ONLY — "Sign in to your account to continue / Email / Password / Sign In"
- No private/tenant data, no operational records, no auth-gated content visible
- No indexed URLs under `/dashboard`, `/control-plane`, `/tenant`, `/workspace`, or any other
  post-login private route
- Risk level: **LOW (functional)** — login pages being indexed is common; does not constitute
  data exposure; user clicking on indexed URL sees only the login form
- Governance classification: **FAIL** — literal FAIL criterion met (URL under /auth is indexed)

**Deployment gap impact:**
- FU-001 robots.txt changes would have added `Disallow: /auth` to prevent further crawling
- But FU-001 was never deployed to production — the live robots.txt still allows crawling of /auth
- This means: (a) the /auth/login indexation likely occurred because robots.txt did not disallow it,
  and (b) even after the FU-001 robots.txt update, existing indexed URLs would need to be
  deindexed via crawl re-evaluation over time

**Per FAIL rules:**
- BS-003: Keep PARTIAL / OPEN — add escalation note
- FTR-AUTH-003: Keep ROBOTS_GAP_CLOSED / PARTIAL — add FU-002 FAIL note
- Do not modify code in this unit
- Stop and report without committing

---

## 13. Stop Conditions Active

**Stop Condition 4:** "Any private/gated URL appears indexed and requires remediation."
— `/auth/login` URLs are indexed. ACTIVE.

**Stop Condition 5:** "Live robots.txt does not include FU-001 entries."
— Production robots.txt is pre-FU-001 version (7 local commits never pushed to origin/Vercel). ACTIVE.

**Result:** No commit created. Governance artifacts created as local uncommitted files pending
user decision on whether to commit documentation and/or push/deploy FU-001.

---

## 14. Files Changed

**Governance artifacts created (LOCAL, NOT COMMITTED):**

| File | Change type | Description |
|---|---|---|
| `governance/units/FU-002-GSC-CRAWL-EVIDENCE-VERIFY.md` | CREATED | This unit artifact |
| `governance/launch-readiness/FU-002-GSC-CRAWL-EVIDENCE-VERIFY.md` | CREATED | Verification document |
| `governance/launch-readiness/BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY.md` | UPDATED | §22 history row appended |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | UPDATED | BS-003 row with FU-002 FAIL note |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | UPDATED | FTR-AUTH-003 row with FU-002 FAIL note |
| `governance/control/NEXT-ACTION.md` | UPDATED | last_closed_governance_unit rotated to FU-002 |

**Source code files changed:** NONE
**Runtime/config files changed:** NONE
**Schema/migration files changed:** NONE
**`.env` files changed:** NONE

---

## 15. Recommended Follow-up Units

### IMMEDIATE — Deploy FU-001

**Priority:** P0 — Must happen before any public backlink or press mention.

The 7 local commits (including FU-001 robots.txt update) have never been pushed or deployed.

Required actions:
1. `git push origin main` — pushes all 7 local commits to GitHub/origin
2. Wait for Vercel deployment to complete
3. Verify live `https://app.texqtic.com/robots.txt` includes all 8 FU-001 Disallow entries
4. Confirm deployment succeeded

After FU-001 is deployed, `/auth` will be disallowed for further crawling. Existing indexed
`/auth/login` URLs will be deindexed by search engines after they re-crawl and encounter the
Disallow directive (typically within days to weeks).

### FU-003 — Post-Deployment GSC Re-Verification

**Priority:** P1 (after FU-001 is deployed and sufficient time has passed for re-crawl)

**Scope:** Re-run this verification after FU-001 deployment. Check:
1. Live robots.txt includes all 8 FU-001 Disallow entries
2. Repeat DuckDuckGo `site:app.texqtic.com/auth` — expect no results after re-crawl
3. Check GSC if accessible (authenticated browser review by Paresh)
4. If `/auth/login` still indexed: add `<meta name="robots" content="noindex, nofollow">` to login page as belt-and-suspenders

**Expected outcome:** VERIFIED_PASS after FU-001 deployment + re-crawl interval.

### OPTIONAL — FU-004 (Non-Sitemap URL Control)

**Priority:** P2 — Post-launch SEO hygiene.

**Scope:** Address the additional indexed pages observed in §10 (`/select-plan`, `/register`,
`/marketplace`, `/en/marketplace`, `/en/profiles`, `/contact`). These are all PUBLIC_ENTRY
state (no private content) but create duplicate content at multiple URLs. Options:
- Add noindex meta for PUBLIC_ENTRY state at unexpected URL paths
- Add canonical tags pointing to root `/` for these URL variants
- Add robots.txt Disallow entries for these paths

---

## 16. User Decision Required

**Stop conditions prevent commit. User must choose one of the following actions:**

### Option A — Push and Deploy FU-001 First (Recommended)
```
git push origin main
```
1. Push all 7 local commits to GitHub
2. Verify Vercel deployment completes
3. Verify live robots.txt includes FU-001 entries
4. Then commit these FU-002 governance artifacts
5. Schedule FU-003 to re-verify after re-crawl interval

### Option B — Commit FU-002 Documentation Now (Documentation Only)
If Paresh wants to preserve the evidence record regardless of deployment state:
```
git add governance/units/FU-002-GSC-CRAWL-EVIDENCE-VERIFY.md \
        governance/launch-readiness/FU-002-GSC-CRAWL-EVIDENCE-VERIFY.md \
        governance/launch-readiness/BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY.md \
        governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md \
        governance/launch-readiness/FUTURE-TODO-REGISTER.md \
        governance/control/NEXT-ACTION.md
git commit -m "[TEXQTIC] governance: verify GSC auth route crawl evidence — FAIL (auth/login indexed, FU-001 undeployed)"
```
Then push all commits (including FU-001 and this) to origin/Vercel.

### Option C — Hold Documentation, Address Deployment First
Do not commit anything. Fix the deployment gap first, then re-run verification as FU-003.

**Waiting for Paresh decision.**
