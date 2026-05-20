# PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001
## TexQtic SEO Domain Canonical Strategy — Governance Unit

**Unit ID:** `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`
**Unit type:** Strategy / Design / Governance close
**Family:** Public SEO / Launch Readiness
**Status:** STRATEGY_DEFINED
**D-005 status:** CLOSED (by this unit)
**BS-007 status:** RESOLVED (by this unit)
**FTR-SEO-001 status:** STRATEGY_DEFINED — this unit IS the FTR-SEO-001 delivery
**FTR-SEO-007 status:** STRATEGY_RESOLVED — no further implementation gate
**Created:** 2026-07-22
**Updated:** 2026-07-22
**Artifact:** `governance/launch-readiness/PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY.md`

---

### Plan

This unit defines the SEO canonical domain and URL strategy for the TexQtic main app
(`app.texqtic.com`). It translates the locked Option F domain separation architecture into an
explicit canonical URL strategy, redirect policy, sitemap origin, robots.txt policy, and
indexability classification for every public-facing surface.

**Governance items closed by this unit:**
- D-005 (Decision Parking Lot) — SEO Domain Canonical Strategy
- BS-007 (Blind Spot Register) — Live pages indexed under wrong canonical domain

**Governance items promoted by this unit:**
- FTR-SEO-001 — STRATEGY_DEFINED
- FTR-SEO-007 — STRATEGY_RESOLVED (no redirect or sitemap origin change needed)

**No implementation changes.** This is a governance, strategy, and register-update-only unit.
No source files changed.

---

### Findings / Root Cause

**Option F trigger condition satisfied:**

The trigger condition for D-005 was: "Paresh confirms production domain setup (apex vs. www; any
custom domain plan)." This condition was met by the Option F lock in the marketing repository:

- `MARKETING-APP-PUBLIC-PAGES-DOMAIN-SEPARATION-DECISION-LOCK-001`
- Commits: 0bed542, 3246ca4, fa5d54e
- `PLATFORM_APP_URL = https://app.texqtic.com` confirmed as canonical platform origin

**Option F decision outcome for D-005:**

Option F explicitly separates two domains: `texqtic.com` (marketing) and `app.texqtic.com`
(platform app). This means:
- No apex redirect is needed or appropriate
- No cross-domain canonical tags are needed
- The existing canonical implementation is correct
- The existing sitemap origin is correct
- The existing robots.txt is correct

**BS-007 resolution:**

BS-007 stated: "Live public pages already indexed under app.texqtic.com — canonical domain not
yet decided." The risk was that domain authority was being built on the wrong property. Option F
resolves this: `app.texqtic.com` is intentionally the canonical domain for dynamic marketplace
public pages. Organic impressions and GSC authority correctly attributed. No domain migration
needed.

**Repo-truth evidence (inspected 2026-07-22):**

- `public/sitemap.xml`: 12 URLs; all use `https://app.texqtic.com`; no auth/stub routes ✅
- `public/robots.txt`: Disallow rules correct; Sitemap pointer correct ✅
- `App.tsx` SEO useEffect (lines 2980–3520): noindex guards confirmed; clearPublicPageMeta
  for auth states confirmed ✅
- `utils/publicPageMeta.ts` (lines 245–260): clearPublicPageMeta removes all managed meta ✅
- `vercel.json`: No redirect rules; filesystem passthrough confirmed ✅
- `middleware.ts`: Host-based tenant resolver only; no SEO redirect logic ✅
- Live view-source `/trust`: Bare SPA HTML shell; `<link rel="sitemap">` present; no
  server-injected meta tags ✅
- Live `robots.txt` and `sitemap.xml`: Exact match to source files ✅

**CSR architecture finding:**

The app is a Vite + React CSR SPA. The static HTML delivered for all paths is bare. Meta tags
(including canonical, robots, OG) are injected exclusively by App.tsx useEffect at runtime.
Implications:
1. Google renders JS → sees dynamically-set meta tags (including noindex guards)
2. robots.txt Disallow is the primary guard for non-JS crawlers on stub routes
3. Auth/private routes not in robots.txt Disallow (but clearPublicPageMeta removes managed tags)
4. BS-003 (GSC verification) remains an open prerequisite before first public backlink

**Supplier profile indexability finding:**

`PUBLIC_SUPPLIER_PROFILE` app state falls through to `clearPublicPageMeta()` — no explicit
noindex meta is applied. Sole crawler guard is `Disallow: /supplier/` in robots.txt. This is
adequate for current posture but is single-layer. D-010 / FTR-SEO-003 resolution should add an
explicit noindex meta as second layer before any supplier profile promotion.

---

### Files to Change

No source code files changed. Governance only.

| File | Action |
|---|---|
| `governance/launch-readiness/PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY.md` | CREATED (this unit's primary artifact) |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | UPDATED (FTR-SEO-001 status; FTR-SEO-007 status; update history) |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | UPDATED (BS-007 RESOLVED; HD-006 note; update history) |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | UPDATED (D-005 CLOSED; update history) |
| `governance/control/NEXT-ACTION.md` | UPDATED (last_closed_governance_unit pointer; SEO strategy note) |

---

### Changes Made

**1. Created `governance/launch-readiness/PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY.md`**

This is the primary artifact. 20 sections covering:
- §1: Purpose
- §2: Trigger and authorization
- §3: Canonical domain declaration
- §4: Redirect policy
- §5: Sitemap strategy
- §6: robots.txt policy
- §7: Indexability classification (four sub-tiers: acquisition, stub, gated, auth)
- §8: Canonical tag implementation
- §9: CSR architecture note for SEO
- §10: Marketing domain boundary (Option F)
- §11: Open SEO prerequisites
- §12: Resolved items
- §13: Recommended next unit
- §14: Marketing repo decision provenance
- §15: Source-truth evidence summary
- §16: GSC and crawl posture
- §17: Schema.org / JSON-LD posture
- §18: Indexability lifecycle governance
- §19: Dependency register
- §20: Update history

**2. FUTURE-TODO-REGISTER.md updates:**
- FTR-SEO-001 status: OPEN → STRATEGY_DEFINED
- FTR-SEO-007 status: OPEN → STRATEGY_RESOLVED
- Added to §10 Resolved Items history table: FTR-SEO-001 and FTR-SEO-007
- Update history row added

**3. BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md updates:**
- BS-007: OPEN → RESOLVED — Option F lock confirms app.texqtic.com is intentionally canonical;
  no domain authority split; GSC correctly attributed
- HD-006: OPEN → note added: D-005 now resolved; HD-006 canonical strategy gate is satisfied;
  remaining gate for product sitemap expansion is HD-002 (real product data) + D-009 (threshold)

**4. DECISION-PARKING-LOT.md updates:**
- D-005: PARKED → CLOSED — Strategy defined by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`;
  `app.texqtic.com` is canonical for all dynamic marketplace public pages; trigger satisfied
  by Option F marketing repo lock
- Added to §4 Decided Items history table
- Update history row added

**5. NEXT-ACTION.md updates:**
- Added last_closed_governance_unit pointer for this unit (non-implementation governance close)
- SEO strategy close note appended to governance_note section

---

### Validation Run

Governance-only unit. No code changes. No compilation or test validation required.

**Repo-truth verification (performed during planning):**

```
# Confirmed live robots.txt matches public/robots.txt source
# Browser verified: https://app.texqtic.com/robots.txt ✅

# Confirmed live sitemap.xml matches public/sitemap.xml source
# Browser verified: https://app.texqtic.com/sitemap.xml ✅

# Confirmed view-source for /trust — bare SPA shell delivered, no server-injected meta
# Browser verified: view-source:https://app.texqtic.com/trust ✅

# Confirmed vercel.json has no redirect rules
# Filesystem: no redirect rule keys found ✅

# Confirmed middleware.ts is tenant resolver only
# Grep: no redirect/Location/301/302 patterns in middleware ✅

# Confirmed App.tsx noindex guards for stub states
# Grep + read: lines 3458–3520 — PUBLIC_TRUST_LANDING, PUBLIC_INDUSTRY_CLUSTER_LANDING,
# PUBLIC_AGGREGATOR all have robots: 'noindex, nofollow' ✅

# Confirmed PUBLIC_SUPPLIER_PROFILE falls through to clearPublicPageMeta()
# Grep: no applyPublicPageMeta block for PUBLIC_SUPPLIER_PROFILE in SEO useEffect ✅
```

All passes. Governance artifact created. Register updates applied.

---

### Risks / Follow-up

**Remaining open risk after this unit:**

1. **BS-003 (P0):** Auth/private route crawl exclusion not GSC-verified. This is the highest
   priority follow-up SEO action. Required before first public backlink or press mention.

2. **BS-005 (P1):** JSON-LD not validated in Google Rich Results Test. Required before launch.

3. **Supplier profile single-layer crawl guard:** `/supplier/` depends on robots.txt Disallow
   as sole indexability guard. D-010 resolution should add explicit `noindex` meta.

4. **Marketing repo coordination:** `texqtic.com` marketing pages may start linking to
   `app.texqtic.com` for buyer CTAs. This will accelerate indexing of `/products` and
   `/collections`. Ensure HD-002 (real product data) is in place before any such promotion.

5. **No SSR.** All SEO meta is client-side only. If real-user signal or Lighthouse audits flag
   the absence of server-side meta as a concern, SSR/pre-rendering would be a significant
   architectural addition requiring a separate decision unit.

**Items this unit does NOT close:**
- FTR-SEO-002 (product detail sitemap expansion) — gates HD-002 + D-009
- FTR-SEO-003 (supplier profile indexability) — gates D-010
- FTR-SEO-004 through FTR-SEO-006 (stub route content readiness)
- FTR-SEO-008 (product detail JSON-LD expansion)
- FTR-SEO-009 (supplier profile JSON-LD)
- BS-003 (GSC verification)
- BS-005 (JSON-LD validation)
- HD-002 (real product data)
- D-009 (product sitemap threshold)
- D-010 (supplier indexability policy)

---

### Commit Message

```
[TEXQTIC] governance: define SEO canonical strategy — Option F lock closes D-005, resolves BS-007

- PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001 strategy defined
- app.texqtic.com confirmed as canonical domain for all dynamic marketplace public pages
- No redirect policy change needed; existing implementation correct under Option F
- D-005 (Decision Parking Lot) CLOSED
- BS-007 (Blind Spot Register) RESOLVED
- FTR-SEO-001 STRATEGY_DEFINED; FTR-SEO-007 STRATEGY_RESOLVED
- Register updates: FUTURE-TODO-REGISTER.md, BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md,
  DECISION-PARKING-LOT.md, NEXT-ACTION.md
- No source code changes
```
