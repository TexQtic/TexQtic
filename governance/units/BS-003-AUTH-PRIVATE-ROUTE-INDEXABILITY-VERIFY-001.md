# BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001

**Unit type:** Verification (no source / runtime changes) ·
**Register reference:** BS-003 (BLIND-SPOT register, P0 OPEN) · FTR-AUTH-003 (FUTURE-TODO register, LAUNCH_DEPENDENCY/P2) ·
**Date:** 2026-07-22 · **Decision:** PARTIAL · **Commit:** TBD

---

## 1. Unit Header

| Field | Value |
|---|---|
| Unit ID | BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001 |
| Unit type | Verification (evidence-gathering only; no source changes) |
| Starting HEAD | `485b12d` |
| Starting branch | `main` |
| Starting tree status | CLEAN (0 staged, 0 unstaged, 0 untracked) |
| Decision | PARTIAL |
| Commit hash | TBD — updated after commit |

---

## 2. Objective

Produce verification evidence confirming that:
1. Auth-gated, private, tenant, and control-plane routes are not appearing in public search results or being promoted as public SEO surfaces
2. The layered SEO defense mechanism (robots.txt + sitemap scoping + link graph isolation + SPA architecture) is functioning as designed
3. Any documented gaps are registered with follow-up units assigned

Cross-referenced by:
- `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (BS-003, P0 OPEN): "SEO noindex on auth/tenant routes has not been explicitly production-verified"
- `FUTURE-TODO-REGISTER.md` (FTR-AUTH-003, LAUNCH_DEPENDENCY/P2): "auth/private-route crawl exclusion verification"
- G-06-003: NON_BLOCKING_FOLLOWUP from `FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001`

---

## 3. Starting Git State

```
$ git status --short
(no output — clean tree)

$ git log --oneline -3
485b12d (HEAD -> main) [TEXQTIC] governance: define public SEO canonical strategy
277c76e [TEXQTIC] governance: backfill commit hash in FAM-06 verify close artifact
50cd5e9 [TEXQTIC] governance: verify close FAM-06 auth session readiness
```

Pre-flight: working tree clean. HEAD at `485b12d` (PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001 governance unit). Branch: `main`.

---

## 4. Governance Register Context

**BS-003 (starting state):**
```
| BS-003 | Auth/tenant pages may be indexed | SEO noindex on auth/tenant routes has not been
  explicitly production-verified. If a search engine indexes /login, /dashboard, or /tenant/...
  pages, this is a trust and data exposure risk. | SEO ranking pollution; potential accidental
  internal URL exposure. | noindex guards exist in App.tsx useEffect; no production crawl
  verification documented | Run a Google Search Console / crawl verification before first public
  backlink or press mention | P0 | OPEN |
```

**FTR-AUTH-003 (starting state):**
```
| FTR-AUTH-003 | Auth/private-route crawl exclusion verification | ... | G-06-003 deferred as
  NON_BLOCKING_FOLLOWUP from FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001;
  code evidence confirmed; production crawl GSC check not yet run |
  FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001 | IMPLEMENTATION_READY | P2 |
  LAUNCH_DEPENDENCY | OPEN |
```

---

## 5. Documents Inspected (Repo)

| Document | Lines read | Key finding |
|---|---|---|
| `public/robots.txt` | All | Disallows: `/api/`, `/passport/`, `/join/`, `/supplier/`, `/trust`, `/industries`, `/aggregator`. Does NOT disallow: `/auth`, `/dashboard`, `/control-plane`, `/tenant`, `/workspace`, `/onboarding`, `/token-handler`, `/login` |
| `public/sitemap.xml` | All | 12 URLs, all public marketplace pages. No auth/private routes. |
| `index.html` | All (34 lines) | Bare SPA shell. No server-injected `<meta name="robots">`. No canonical tag. Generic title "TexQtic Platform". |
| `App.tsx` | 2017–2159 | `resolveInitialAppState()`: auth/private paths not URL-mapped; fallback is `PUBLIC_ENTRY` (unauthenticated) or `AUTH` (session exists) |
| `App.tsx` | 3310–3560 | SEO useEffect: PUBLIC_ENTRY, AUTH, ONBOARDING, CONTROL_PLANE, TEAM_MGMT, WL_ADMIN all call `clearPublicPageMeta()` — no noindex injected |
| `utils/publicPageMeta.ts` | 251–280 | `clearPublicPageMeta()` removes managed tags only, does NOT inject noindex |
| `vercel.json` | All | No X-Robots-Tag headers; no redirects for auth routes; SPA fallback serves `index.html` for all routes |
| `middleware.ts` | All | Tenant domain resolution only; no SEO logic; passthrough for `app.texqtic.com` |

---

## 6. Live Routes Checked

**Method:** Browser automation (Playwright via VS Code browser tools)
**Date:** 2026-07-22

| Route | Check type | HTTP | Result |
|---|---|---|---|
| `https://app.texqtic.com/robots.txt` | Production text fetch | 200 | Confirmed identical to repo |
| `view-source:https://app.texqtic.com/trust` | Raw server HTML | 200 | Bare SPA shell, 34 lines, NO server-injected robots meta |
| `view-source:https://app.texqtic.com/supplier/test` | Raw server HTML | 200 | Same bare SPA shell, NO server-injected robots meta |
| `https://app.texqtic.com/dashboard` | Full browser (JS) | 200 | PUBLIC_ENTRY rendered — "TexQtic Platform Entry", no auth content |
| `https://app.texqtic.com/control-plane` | Full browser (JS) | 200 | PUBLIC_ENTRY rendered — "TexQtic Platform Entry", no auth content |
| `https://app.texqtic.com/trust` | Full browser (JS) | 200 | PUBLIC_TRUST_LANDING — "TexQtic — Trust & Origin Passport", correct content |
| `https://app.texqtic.com/products` | Full browser (JS) | 200 | PUBLIC_B2C_BROWSE — "Explore Textile Products — TexQtic", correct content |
| `https://app.texqtic.com/inquiry` | Full browser (JS) | 200 | PUBLIC_INQUIRY — "Express Interest — TexQtic", correct content |
| `https://app.texqtic.com/` | Full browser (JS) | 200 | PUBLIC_ENTRY — "TexQtic Platform Entry", correct root content |

---

## 7. Analysis Performed

**A. SPA architecture analysis (URL routing model):**
Confirmed via `resolveInitialAppState()` (App.tsx lines 2017–2159) that auth/private URL paths
(`/auth`, `/dashboard`, `/control-plane`, etc.) are NOT registered as URL patterns in the SPA
router. They fall through to the unauthenticated fallback (`PUBLIC_ENTRY`) for crawlers.

**B. Link graph analysis:**
Searched all source files for anchor `<a href>` patterns pointing to private/auth routes.
Result: 0 matches. All auth navigation is via `setAppState()` through button `onClick` — no crawlable
`<a href>` links exist anywhere in the codebase that point to auth/private routes.

**C. robots.txt coverage gap analysis:**
Compared robots.txt Disallow list against the full set of auth/private URL prefixes. Identified 8
prefixes not covered: `/auth`, `/dashboard`, `/control-plane`, `/tenant`, `/workspace`,
`/onboarding`, `/token-handler`, `/login`. Robots.txt comment header states "Disallow all auth-gated
paths" but the implementation does not match the documented intent.

**D. SPA shell analysis (server-delivered HTML):**
Confirmed via view-source that ALL routes on `app.texqtic.com` serve the identical 34-line SPA
shell with no server-injected robots meta, no canonical tag, and no route-specific content. Without
JS execution, every URL presents the same contentless shell to crawlers.

**E. Unauthenticated content audit at private URLs:**
Confirmed via full browser render (with JS) that `/dashboard` and `/control-plane` serve
PUBLIC_ENTRY state — generic landing page. No auth content, no private data, no tenant records,
no operational information.

---

## 8. GSC / Public Search Evidence

**Google Search Console:** Not available in the current environment. GSC requires authenticated
browser sign-in outside the scope of this automated verification. Evidence: UNAVAILABLE.

**Public search operator checks:** Public Google search for `site:app.texqtic.com/auth` and
`site:app.texqtic.com/dashboard` not performed in this session (browser automation focused on
production URL verification; live Google search results may differ by session/locale/index state).

**GSC evidence classification:** DEFERRED — to be completed manually by operator. This is the
primary remaining evidence gap for upgrading BS-003 from PARTIAL to VERIFIED_PASS.

---

## 9. Results Summary per Route Group

**Group A — Public Indexable:**
All public routes (`/products`, `/collections`, `/inquiry`, `/products/category/:slug`,
`/collections/:slug`) render correctly with JS-applied `index, follow` meta, are included in
sitemap.xml, and are explicitly Allowed in robots.txt. ✅ PASS

**Group B — Stub / Gated Disallowed:**
`/trust`, `/industries`, `/aggregator` — disallowed in robots.txt AND receive JS `noindex, nofollow`.
Dual protection layer functioning. ✅ PASS

**Group C — Profile Gated:**
`/supplier/:slug`, `/passport/:id`, `/join/:code` — disallowed in robots.txt (primary protection).
Receive `clearPublicPageMeta()` (no explicit noindex) but robots.txt Disallow is authoritative. ✅ PASS

**Group D — API:**
`/api/` — disallowed in robots.txt. ✅ PASS

**Group E — Auth / Private:**
`/auth`, `/dashboard`, `/control-plane`, `/tenant`, `/workspace`, `/onboarding`, `/token-handler`,
`/login` — NOT disallowed in robots.txt ⚠️. NOT in sitemap ✅. NOT linked from public pages ✅.
Unauthenticated access renders PUBLIC_ENTRY (no private data) ✅.
Classification: ⚠️ PARTIAL — structural defense is strong; robots.txt gap is documented.

---

## 10. Key Findings

1. **No private data accessible** at any auth/private URL to unauthenticated visitors. ✅
2. **No link graph path** from any public page to any private/auth URL. ✅
3. **No sitemap promotion** of any private/auth URL. ✅
4. **robots.txt gap** — 8 auth/private URL prefixes not explicitly disallowed despite stated policy. ⚠️
5. **No server-side noindex** injected for any route — reliance on robots.txt and JS signals only. ⚠️
6. **GSC production evidence** not available in this environment. ⚠️
7. **`clearPublicPageMeta()` confirmed** as a cleanup function, not an indexing guard. (Expected; robots.txt is the correct primary mechanism.) ✅

---

## 11. Decision

**PARTIAL**

All structural and architectural evidence confirms that the current risk from auth/private route
indexability is LOW. No private data is served to unauthenticated visitors. No link graph path
exists for crawlers. No sitemap promotion. The gap is in robots.txt coverage and the absence of
GSC production evidence. These gaps are documented and follow-up units are assigned.

**This unit does NOT authorize any source code changes.** The robots.txt update required by FU-001
must be performed in a separate, explicitly allowlisted implementation unit.

---

## 12. Files Changed

| File | Action | Description |
|---|---|---|
| `governance/launch-readiness/BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY.md` | CREATE | Full verification artifact with 22 sections |
| `governance/units/BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001.md` | CREATE | This unit artifact |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | UPDATE | BS-003 status → PARTIAL / EVIDENCE_STRONG |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | UPDATE | FTR-AUTH-003 readiness → EVIDENCE_STRONG |
| `governance/control/NEXT-ACTION.md` | UPDATE | last_closed_governance_unit → BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001 |

**Source code files changed: 0** (verification-only unit)

---

## 13. Runtime Non-Change Confirmation

No source code, configuration, schema, migration, or runtime file was modified in this unit.
All changes are governance documentation only. This is a verification-only unit. ✅

Files NOT modified (confirmed):
- `public/robots.txt` — read only; update deferred to FU-001 implementation unit
- `public/sitemap.xml` — no change
- `App.tsx` — no change
- `utils/publicPageMeta.ts` — no change
- `vercel.json` — no change
- `middleware.ts` — no change
- `index.html` — no change
- `server/prisma/schema.prisma` — no change
- `.env` / `.env.local` — no change

---

## 14. Commit Hash

Commit: TBD — `[TEXQTIC] governance: verify auth private route indexability`

*This field will be updated manually after commit.*

---

## 15. Recommended Next Unit

**Priority next (before first backlink/press):**
`FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE` — Add Disallow entries for auth/private URL prefixes to
`public/robots.txt`. This is the minimum change required to close the documented gap and upgrade
BS-003 from PARTIAL to VERIFIED (pending GSC evidence).

**After FU-001:**
`FU-002-GSC-CRAWL-EVIDENCE-VERIFY` — Manual GSC production crawl verification (no code changes;
evidence-gathering only).

**Parallel candidate:**
`BS-005-JSONLD-RICH-RESULTS-VALIDATION-001` — JSON-LD structured data validation via Google Rich
Results Test. Independent of BS-003 resolution; can proceed in parallel.
