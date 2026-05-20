# FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE

**Unit type:** Implementation (source change: `public/robots.txt` only) ·
**Register reference:** BS-003 (BLIND-SPOT register, P0 PARTIAL) · FTR-AUTH-003 (FUTURE-TODO register, EVIDENCE_STRONG/PARTIAL) ·
**Date:** 2026-07-22 · **Decision:** ROBOTS_GAP_CLOSED / GSC_PENDING · **Commit:** TBD

---

## 1. Unit Header

| Field | Value |
|---|---|
| Unit ID | FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE |
| Unit type | Implementation (minimal source change — `public/robots.txt` only) |
| Starting HEAD | `08852e8` |
| Starting branch | `main` |
| Starting tree status | CLEAN (0 staged, 0 unstaged, 0 untracked) |
| Decision | ROBOTS_GAP_CLOSED / GSC_PENDING |
| Commit hash | TBD — updated after commit |

---

## 2. Objective

Close the robots.txt implementation gap identified by `BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001`.

That unit concluded PARTIAL with the following documented gap:

> The following auth/private URL prefixes are not explicitly disallowed in `public/robots.txt`:
> `/auth`, `/dashboard`, `/control-plane`, `/tenant`, `/workspace`,
> `/onboarding`, `/token-handler`, `/login`

This unit adds explicit `Disallow` entries for all 8 prefixes, aligning the robots.txt implementation
with the policy stated in its own comment header:

> "Disallow all API routes, auth-gated paths, supplier/tenant paths."

No other source or runtime files are modified. The remaining gap after this unit (GSC production
crawl evidence) requires a separate verification unit (FU-002).

Cross-referenced by:
- `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (BS-003, P0 PARTIAL): gap to be closed by this unit
- `FUTURE-TODO-REGISTER.md` (FTR-AUTH-003, EVIDENCE_STRONG/PARTIAL): follow-up implementation unit
- `BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001` §15: this unit is the prescribed next step

---

## 3. Starting Git State

```
$ git status --short
(no output — clean tree)

$ git log --oneline -5
08852e8 (HEAD -> main) [TEXQTIC] governance: backfill commit hash in BS-003 verify unit artifact
ea9de41 [TEXQTIC] governance: verify auth private route indexability
485b12d [TEXQTIC] governance: define public SEO canonical strategy
277c76e [TEXQTIC] governance: backfill commit hash in FAM-06 verify close artifact
50cd5e9 [TEXQTIC] governance: verify close FAM-06 auth session readiness

$ git branch --show-current
main
```

Pre-flight: working tree clean. HEAD at `08852e8`. Branch: `main`.

---

## 4. Authoritative Documents Inspected

| Document | Key finding relevant to this unit |
|---|---|
| `governance/units/BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001.md` | Gap: 8 auth/private prefixes not in robots.txt; §15 names FU-001 as prescribed next unit |
| `governance/launch-readiness/BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY.md` | §10 Finding 4: robots.txt gap; §11: robots.txt update deferred to FU-001 |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | BS-003 action item: "(1) Add Disallow entries for auth/private URL prefixes to `public/robots.txt` (FU-001) before first public backlink or press mention." |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-AUTH-003 Reason Deferred: "FU-001 (robots.txt auth Disallow update, required before backlink/press)" |
| `governance/control/NEXT-ACTION.md` | last_closed_governance_unit: BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001; FU-001 named in closure note |
| `governance/launch-readiness/PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY.md` | Canonical domain confirmed as `https://app.texqtic.com`; no domain-level conflict for robots.txt changes |

---

## 5. Source Files Inspected (Read-Only Except robots.txt)

| File | Lines read | Inspection finding |
|---|---|---|
| `public/robots.txt` | All (29 lines before edit) | Confirmed exact structure: comment header, User-agent block, 4 Allow entries, 7 Disallow entries, Sitemap. 8 auth/private prefixes absent from Disallow list. |
| `public/sitemap.xml` | All | Confirmed 12 public marketplace URLs only. No auth/private routes. Unchanged by this unit. |
| `App.tsx` | — (read-only; no inspection needed for this unit) | Not inspected; not modified. |
| `utils/publicPageMeta.ts` | — (read-only; no inspection needed for this unit) | Not inspected; not modified. |
| `vercel.json` | — (read-only; no inspection needed for this unit) | Not inspected; not modified. |
| `middleware.ts` | — (read-only; no inspection needed for this unit) | Not inspected; not modified. |

---

## 6. robots.txt Entries Added

The following 8 `Disallow` entries were added to `public/robots.txt`, placed immediately after
the existing `/aggregator` disallow block, with a comment line identifying this unit and date:

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

These entries were inserted between `Disallow: /aggregator` and the `Sitemap:` directive.
Existing Allow entries, existing Disallow entries, and the Sitemap directive are all unchanged.

---

## 7. Validation Commands Run

```
Get-Content public\robots.txt
```

```
Select-String -Path public\robots.txt -Pattern \
  "Disallow: /auth$",     \
  "Disallow: /dashboard", \
  "Disallow: /control-plane", \
  "Disallow: /tenant$",   \
  "Disallow: /workspace", \
  "Disallow: /onboarding", \
  "Disallow: /token-handler", \
  "Disallow: /login",     \
  "Allow: /products$",    \
  "Allow: /products/category/", \
  "Allow: /collections",  \
  "Allow: /inquiry",      \
  "Sitemap:"
```

```
git diff --name-only
```

---

## 8. Validation Results

**Full file after edit (`cat public/robots.txt`):**

```
# TexQtic — robots.txt
#
# Authority:  PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001
# Domain:     https://app.texqtic.com
#
# Policy:
#   - Allow public B2C acquisition surfaces only.
#   - Disallow all API routes, auth-gated paths, supplier/tenant paths.
#   - Stub app states (/trust, /industries, /aggregator) are disallowed
#     here and served with noindex meta tags in App.tsx.
#
# Update this file when a new permanently-indexed public surface is approved
# or a previously-disallowed path is promoted to public indexability.

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

# Auth-gated and private routes — FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE (2026-07-22)
Disallow: /auth
Disallow: /dashboard
Disallow: /control-plane
Disallow: /tenant
Disallow: /workspace
Disallow: /onboarding
Disallow: /token-handler
Disallow: /login

Sitemap: https://app.texqtic.com/sitemap.xml
```

**Grep results (all required entries confirmed present):**

```
public\robots.txt:16:Allow: /products
public\robots.txt:17:Allow: /products/category/
public\robots.txt:18:Allow: /collections
public\robots.txt:19:Allow: /inquiry
public\robots.txt:30:Disallow: /auth
public\robots.txt:31:Disallow: /dashboard
public\robots.txt:32:Disallow: /control-plane
public\robots.txt:33:Disallow: /tenant
public\robots.txt:34:Disallow: /workspace
public\robots.txt:35:Disallow: /onboarding
public\robots.txt:36:Disallow: /token-handler
public\robots.txt:37:Disallow: /login
public\robots.txt:39:Sitemap: https://app.texqtic.com/sitemap.xml
```

**`git diff --name-only` result:**

```
public/robots.txt
```

Only `public/robots.txt` modified. No other files modified. ✅

**Validation status:**

| Check | Result |
|---|---|
| All 8 new Disallow entries present | ✅ PASS (lines 30–37) |
| All 4 existing Allow entries preserved | ✅ PASS (lines 16–19) |
| All 7 existing Disallow entries preserved | ✅ PASS |
| Sitemap directive unchanged | ✅ PASS (line 39) |
| No other source files modified | ✅ PASS |

---

## 9. Register Updates (in this commit)

**BS-003 (BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md):**
- Status updated: PARTIAL → PARTIAL (robots.txt implementation gap closed; GSC production crawl evidence still pending)
- Evidence column updated to note FU-001 completion
- History entry added

**FTR-AUTH-003 (FUTURE-TODO-REGISTER.md):**
- Readiness updated: EVIDENCE_STRONG → ROBOTS_GAP_CLOSED
- Status remains: PARTIAL (GSC evidence still required for full closure)
- History entry added

**BS-003 verification artifact (BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY.md):**
- §22 Update History: FU-001 completion row appended

**NEXT-ACTION.md:**
- Header timestamp updated to 2026-07-22
- `last_closed_governance_unit` rotated: BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001 → FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE

---

## 10. Remaining GSC Evidence Gap

The robots.txt implementation gap is now closed. The remaining open item for upgrading BS-003 to
VERIFIED_PASS is:

**FU-002: GSC Production Crawl Evidence Verification**

Requirement: Use Google Search Console to confirm:
1. No auth/private route URLs (`/auth`, `/dashboard`, `/control-plane`, `/tenant`, `/workspace`,
   `/onboarding`, `/token-handler`, `/login`) appear in the GSC Coverage report as indexed.
2. The sitemap shows exactly 12 approved public marketplace URLs.
3. No blocked-by-robots.txt errors for intentionally public routes.

Until FU-002 is completed, BS-003 remains PARTIAL (robots.txt gap closed; GSC pending). The
structural risk from the gap documented in BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY-001
remains LOW regardless: no private data is served to unauthenticated visitors, no link graph path
exists from public pages to private routes, and no private routes are in sitemap.xml.

---

## 11. Runtime Non-Change Confirmation

No routing code, App.tsx, sitemap, Vercel config, middleware, auth logic, canonical tags,
X-Robots-Tag headers, redirects, tenant logic, or any other runtime/source files were modified.

The only runtime-affecting change is the addition of 8 Disallow lines to `public/robots.txt`.
This change affects only robot crawl directives — it does not affect app routing, auth behavior,
user sessions, or data access.

Files confirmed NOT modified (read-only in this unit):
- `public/sitemap.xml` ✅
- `App.tsx` ✅
- `utils/publicPageMeta.ts` ✅
- `vercel.json` ✅
- `middleware.ts` ✅
- `index.html` ✅
- `server/prisma/schema.prisma` ✅
- `.env` / `.env.local` ✅

---

## 12. Files Changed

| File | Action | Description |
|---|---|---|
| `public/robots.txt` | MODIFY | Added 8 Disallow entries for auth/private URL prefixes |
| `governance/units/FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE.md` | CREATE | This unit artifact |
| `governance/launch-readiness/BS-003-AUTH-PRIVATE-ROUTE-INDEXABILITY-VERIFY.md` | UPDATE | §22 Update History: FU-001 result appended |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | UPDATE | BS-003 status → PARTIAL (robots.txt gap closed; GSC pending) |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | UPDATE | FTR-AUTH-003 readiness → ROBOTS_GAP_CLOSED |
| `governance/control/NEXT-ACTION.md` | UPDATE | last_closed_governance_unit → FU-001-ROBOTS-TXT-AUTH-DISALLOW-UPDATE |

**Source code files changed: 1** (`public/robots.txt` — crawl directive only, no runtime behavior change)

---

## 13. Commit Hash

Commit: TBD — updated after commit

---

## 14. Recommended Next Unit

**FU-002-GSC-CRAWL-EVIDENCE-VERIFY (P0 — required for VERIFIED_PASS on BS-003)**

Purpose: Use Google Search Console to confirm no auth/private route URLs are indexed; confirm
sitemap shows correct 12-URL set; confirm no blocked robots.txt errors for public routes.
Allowlist: no code changes; governance evidence artifact only.
Trigger: Completes BS-003 resolution from PARTIAL → VERIFIED_PASS.

**Parallel candidate (can proceed independently):**

**BS-005-JSONLD-RICH-RESULTS-VALIDATION-001 (P1)**

Purpose: Validate existing JSON-LD structured data implementation via Google Rich Results Test
and Schema.org validator. Independent of BS-003 / FU-002 resolution chain.
