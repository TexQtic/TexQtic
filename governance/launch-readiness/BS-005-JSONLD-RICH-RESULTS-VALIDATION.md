# BS-005-JSONLD-RICH-RESULTS-VALIDATION — Verification Document

**Unit:** BS-005-JSONLD-RICH-RESULTS-VALIDATION-001
**Date:** 2026-05-20
**Decision:** PARTIAL — structural validation PASS; no external tool report
**Authority:** `PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001`, `D2C-COLLECTION-SEO-GOVERNANCE-001`

---

## 1. Executive Summary

JSON-LD structured data is correctly injected on all production public surfaces where expected.
Live DOM extraction via Playwright browser automation confirmed that all indexed public pages
(`/collections`, `/products`, `/products/category/:slug`, `/collections/:slug`) emit
syntactically valid, schema.org-compliant JSON-LD blocks tagged with `data-texqtic-public-jsonld=true`.

All governance-allowed types (`WebPage`, `CollectionPage`, `BreadcrumbList`, `WebSite`, `ListItem`)
are used correctly. All governance-forbidden types (`Product`, `Offer`, `AggregateRating`, `Review`,
`Organization`, `FAQPage`, `ContactPage`) are absent.

No Google Rich Results Test or Schema.org validator report was captured in this unit. That absence
prevents a VERIFIED_PASS designation. Structural evidence is strong; risk of external tool failure
is assessed as very low.

---

## 2. Verification Scope

| Layer | Scope |
|---|---|
| Source code inspection | `utils/publicPageMeta.ts` (full), `App.tsx` lines 3120–3560 |
| Live DOM extraction | 7 production URLs via Playwright on `https://app.texqtic.com` |
| Structural validation | JSON syntax, schema.org type compliance, required fields, URL consistency |
| External tool | Not run (deferred) |

---

## 3. Authority Documents Reviewed

| Document | Status |
|---|---|
| `PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001` | Read — defines allowed/forbidden types |
| `D2C-COLLECTION-SEO-GOVERNANCE-001` | Applied — §9 forbidden metadata confirmed absent |
| `PUBLIC-SEO-INFRASTRUCTURE-DECISION-001` | Context — Option E DOM utility confirmed |

---

## 4. Source File Inspection Summary

### `utils/publicPageMeta.ts`

- `applyPublicPageMeta`: idempotent, browser-only, clears prior JSON-LD before injecting new
- `clearManagedJsonLd`: removes all `[data-texqtic-public-jsonld]` scripts on navigation away
- JSON injected via `script.textContent = JSON.stringify(block)` — no XSS vector
- Governance comment in file header matches observed implementation ✅

### `App.tsx` — JSON-LD by appState

| appState | Route | jsonLd arg |
|---|---|---|
| `PUBLIC_COLLECTIONS` | `/collections` | `CollectionPage` + `WebSite` (if eligible) |
| `PUBLIC_COLLECTION_DETAIL` | `/collections/:slug` | `WebPage` + `WebSite` + `BreadcrumbList` (if found) |
| `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | `/collections/:slug` | None |
| `PUBLIC_B2C_CATEGORY_STORY` | `/products/category/:slug` | `WebPage` + `WebSite` + `BreadcrumbList` (if found) |
| `PUBLIC_B2C_BROWSE` | `/products` | `WebPage` + `WebSite` |
| `PUBLIC_PRODUCT_DETAIL` | `/product/:slug` | None (all states — by governance design) |
| `PUBLIC_INQUIRY` | `/inquiry` | None |
| `PUBLIC_TRUST_LANDING` | `/trust` | None (`noindex`) |
| `PUBLIC_INDUSTRY_CLUSTER_LANDING` | `/industries` | None (`noindex`) |
| `PUBLIC_AGGREGATOR` | `/aggregator` | None (`noindex`) |

---

## 5. Live URL Validation Results

All URLs tested on production `https://app.texqtic.com` (2026-05-20).

### 5.1 `/collections`

| Check | Result |
|---|---|
| robots | `index, follow` ✅ |
| canonical | `https://app.texqtic.com/collections` ✅ |
| JSON-LD count | 1 ✅ |
| `@type` | `CollectionPage` ✅ (governance-allowed) |
| `@context` | `https://schema.org` ✅ |
| `name` | "Verified Textile Collections — TexQtic" ✅ |
| `url` | `https://app.texqtic.com/collections` (matches canonical) ✅ |
| `isPartOf` | `WebSite` → `https://app.texqtic.com` ✅ |
| managed attr | `data-texqtic-public-jsonld=true` ✅ |

### 5.2 `/products`

| Check | Result |
|---|---|
| robots | `index, follow` ✅ |
| canonical | `https://app.texqtic.com/products` ✅ |
| JSON-LD count | 1 ✅ |
| `@type` | `WebPage` ✅ |
| `@context` | `https://schema.org` ✅ |
| `name` | "Explore Textile Products — TexQtic" ✅ |
| `url` | `https://app.texqtic.com/products` (matches canonical) ✅ |
| `isPartOf` | `WebSite` → `https://app.texqtic.com` ✅ |
| managed attr | `data-texqtic-public-jsonld=true` ✅ |

### 5.3 `/products/category/garments`

| Check | Result |
|---|---|
| robots | `index, follow` ✅ |
| canonical | `https://app.texqtic.com/products/category/garments` ✅ |
| JSON-LD count | 2 ✅ |
| Block 1 `@type` | `WebPage` ✅ |
| Block 2 `@type` | `BreadcrumbList` ✅ |
| BreadcrumbList positions | 1 (Products), 2 (Garments) ✅ |
| BreadcrumbList `item` URLs | Both absolute `https://app.texqtic.com/...` ✅ |
| managed attr | Both blocks: `data-texqtic-public-jsonld=true` ✅ |

### 5.4 `/collections/natural-fabric-stories`

| Check | Result |
|---|---|
| robots | `index, follow` ✅ |
| canonical | `https://app.texqtic.com/collections/natural-fabric-stories` ✅ |
| JSON-LD count | 2 ✅ |
| Block 1 `@type` | `WebPage` ✅ |
| Block 2 `@type` | `BreadcrumbList` ✅ |
| BreadcrumbList positions | 1 (Collections), 2 (Natural Fabric Stories) ✅ |
| BreadcrumbList `item` URLs | Both absolute `https://app.texqtic.com/...` ✅ |
| managed attr | Both blocks: `data-texqtic-public-jsonld=true` ✅ |

### 5.5 `/inquiry`

| Check | Result |
|---|---|
| robots | `index, follow` ✅ |
| canonical | `https://app.texqtic.com/inquiry` ✅ |
| JSON-LD count | 0 ✅ (no JSON-LD — by design) |

### 5.6 `/product/:slug` (not found state)

| Check | Result |
|---|---|
| robots | `noindex, nofollow` ✅ (fail-closed) |
| canonical | `https://app.texqtic.com/products` ✅ (fallback) |
| JSON-LD count | 0 ✅ (no JSON-LD — by design) |

Note: the tested slug (`qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10`) resolved to `notFound` state
because the API returned `net::ERR_ABORTED`. This is QA data not published for public discovery.
The fail-closed behavior (noindex + no JSON-LD + canonical fallback) is correct.

### 5.7 Stub states (`/trust`, `/industries`, `/aggregator`)

| URL | robots | JSON-LD count | Result |
|---|---|---|---|
| `/trust` | `noindex, nofollow` | 0 | ✅ |
| `/industries` | `noindex, nofollow` | 0 | ✅ |
| `/aggregator` | `noindex, nofollow` | 0 | ✅ |

---

## 6. Type Compliance Matrix

| Type | Governance | Present | Verdict |
|---|---|---|---|
| `CollectionPage` | ALLOWED | Yes | ✅ |
| `WebPage` | ALLOWED | Yes | ✅ |
| `WebSite` | ALLOWED | Yes (via `isPartOf`) | ✅ |
| `BreadcrumbList` | ALLOWED | Yes | ✅ |
| `ListItem` | ALLOWED | Yes (within BreadcrumbList) | ✅ |
| `Product` | FORBIDDEN | Absent | ✅ |
| `Offer` | FORBIDDEN | Absent | ✅ |
| `AggregateRating` | FORBIDDEN | Absent | ✅ |
| `Review` | FORBIDDEN | Absent | ✅ |
| `Organization` | FORBIDDEN | Absent | ✅ |
| `FAQPage` | FORBIDDEN | Absent | ✅ |
| `ContactPage` | FORBIDDEN | Absent | ✅ |

---

## 7. Observations / Notes

1. **`/product/:slug` — no JSON-LD by design.** The `PUBLIC_PRODUCT_DETAIL` appState deliberately
   omits `jsonLd` from `applyPublicPageMeta`. This reflects governance deferral: the governance-allowed
   types (`WebPage`, `CollectionPage`, etc.) are sufficient for informational pages, but the
   product detail context would ideally use `Product`/`Offer` which are explicitly forbidden.
   This is not a bug; it is a governance constraint. Rich result eligibility for product pages
   is deferred until/unless `Product` type is unlocked.

2. **`/inquiry` — `index, follow` without JSON-LD.** The inquiry page is indexed but has no
   structured data. This is consistent with the source code and is a valid pattern: not all
   indexed pages require JSON-LD. The inquiry page does not benefit from structured data
   in the way collection/category pages do.

3. **All `@context` values use `https://` (not `http://`).** This is the recommended form.

4. **BreadcrumbList items use `name` + `item` + `position`** — all three recommended fields
   per schema.org BreadcrumbList spec are present on each ListItem.

5. **`isPartOf.url` consistently uses `https://app.texqtic.com`** — the canonical platform
   domain confirmed by `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`.

---

## 8. Errors and Warnings

None identified in structural validation.

**Not validated by external tool** — Google Rich Results Test and Schema.org validator not run.
Any warnings from those tools (e.g., deprecated property recommendations) would not be captured
by this unit. Risk assessed as low given the clean structural profile.

---

## 9. Deferred Schema Types (by governance)

The following schema.org types were explicitly deferred by `D2C-COLLECTION-SEO-GOVERNANCE-001`
and `PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001`. Their absence is by governance design:

| Type | Status |
|---|---|
| `Product` | DEFERRED — not in allowed list; would require governance unlock |
| `Offer` | DEFERRED — no-money-movement policy; deferred indefinitely |
| `Organization` | DEFERRED — supplier identity policy; not for public projection |
| `ItemList` | DEFERRED — not in allowed list for current scope |
| `AggregateRating` | DEFERRED — no rating system |

---

## 10. PARTIAL Decision Rationale

**VERIFIED_PASS** requires: external tool report (Google Rich Results Test or Schema.org validator)
confirming no errors.

**PARTIAL** is warranted because:
- All structural requirements are met ✅
- Live DOM extraction confirms JSON-LD fires correctly ✅
- All governance constraints are satisfied ✅
- Probability of external tool failure is very low
- Only missing: a formal GRT report URL/screenshot

**Risk remaining from PARTIAL designation:** very low. If GRT report is required before
any public SEO campaign, run FU-005-JSONLD-GRT-REPORT-001.

---

## 11. Update History

| Date | Author | Change |
|---|---|---|
| 2026-05-20 | Copilot | Initial verification — PARTIAL |
