# BS-005-JSONLD-RICH-RESULTS-VALIDATION-001

## 1. Header

| Field | Value |
|---|---|
| Unit ID | BS-005-JSONLD-RICH-RESULTS-VALIDATION-001 |
| Track | Launch Readiness / Public SEO / JSON-LD Structured Data |
| Type | Blind Spot Verification |
| Date | 2026-05-20 |
| Starting HEAD | `3c5ced8` |
| Starting branch | `main` |
| Starting tree status | CLEAN (main = origin/main) |
| Decision | **PARTIAL — DOM extraction + structural validation PASS; no external tool report** |
| Blind spot closed | BS-005 → PARTIAL (structural validation evidence; external GRT report deferred) |
| Commit hash | `[BACKFILL]` |

---

## 2. Objective

Verify that JSON-LD structured data is correctly injected on live production public surfaces
at `https://app.texqtic.com`. Produce a VERIFIED_PASS / PARTIAL / FAIL decision for
BS-005 in the Blind Spot register.

Scope:
- All appState surfaces that call `applyPublicPageMeta` with a `jsonLd` array
- Governance-allowed schema.org types: `WebPage`, `CollectionPage`, `BreadcrumbList`, `WebSite`, `ListItem`
- Governance-forbidden types: `Product`, `Offer`, `AggregateRating`, `Review`, `Organization`, `FAQPage`, `ContactPage`
- Noindex surfaces: no JSON-LD expected or required

This unit does NOT modify any source code, routes, schema, or configuration.

---

## 3. Authority Documents

| Document | Role |
|---|---|
| `PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001` | Implementation authority; allowed/forbidden types |
| `D2C-COLLECTION-SEO-GOVERNANCE-001` | §9 forbidden metadata; §4 field rules |
| `PUBLIC-SEO-INFRASTRUCTURE-DECISION-001` | Option E DOM utility design |
| `PUBLIC-SEO-SITEMAP-ROBOTS-JSONLD-STRATEGY-DESIGN-001` | Strategy authority |

---

## 4. Source Files Inspected (Read-Only)

| File | Lines read | Purpose |
|---|---|---|
| `utils/publicPageMeta.ts` | 1–260 | Full file — types, constants, `applyPublicPageMeta`, `clearPublicPageMeta` |
| `App.tsx` | 3120–3560 | All `applyPublicPageMeta` call sites with `jsonLd` argument detail |

No source files were modified.

---

## 5. JSON-LD Implementation Findings (Source Code)

### 5.1 Injection Mechanism

`applyPublicPageMeta` (utils/publicPageMeta.ts):
- Calls `clearManagedJsonLd()` on every render cycle (idempotent)
- For each block in `input.jsonLd`, creates `<script type="application/ld+json" data-texqtic-public-jsonld="true">` and appends to `document.head`
- Serialises via `JSON.stringify(block)` — safe, no XSS vector
- Guarded by `if (typeof document === 'undefined') return;` — browser-only, no SSR crash risk

### 5.2 JSON-LD by appState

| appState | Route | jsonLd present | Types injected |
|---|---|---|---|
| PUBLIC_COLLECTIONS | `/collections` | Yes (if eligible) | `CollectionPage`, `WebSite` (isPartOf) |
| PUBLIC_COLLECTION_DETAIL | `/collections/:slug` | Yes (if found) | `WebPage`, `WebSite` (isPartOf), `BreadcrumbList` (2× `ListItem`) |
| PUBLIC_COLLECTION_DETAIL_UNAVAILABLE | `/collections/:slug` (unavail) | No | — |
| PUBLIC_B2C_CATEGORY_STORY | `/products/category/:slug` | Yes (if found) | `WebPage`, `WebSite` (isPartOf), `BreadcrumbList` (2× `ListItem`) |
| PUBLIC_B2C_BROWSE | `/products` | Yes | `WebPage`, `WebSite` (isPartOf) |
| PUBLIC_PRODUCT_DETAIL | `/product/:slug` | No (all states) | — (by design, governance-deferred) |
| PUBLIC_INQUIRY | `/inquiry` | No | — (by design) |
| PUBLIC_TRUST_LANDING | `/trust` | No | noindex, nofollow |
| PUBLIC_INDUSTRY_CLUSTER_LANDING | `/industries` | No | noindex, nofollow |
| PUBLIC_AGGREGATOR | `/aggregator` | No | noindex, nofollow |

Note: `PUBLIC_PRODUCT_DETAIL` has no `jsonLd` in loading, notFound, or found states. This is consistent
with governance deferral of `Product`/`Offer` types. No schema type exists for a generic
public-safe product preview that matches the allowed-type list.

---

## 6. Live Page DOM Extraction

Method: Playwright browser automation, live production `https://app.texqtic.com`.
Extraction: `document.head.querySelectorAll('script[type="application/ld+json"]')` → `.textContent`

### 6.1 `/collections`

```
robots: index, follow
canonical: https://app.texqtic.com/collections
jsonLdCount: 1
```

Block 1:
```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Verified Textile Collections — TexQtic",
  "description": "Curated textile story and showcase collections on TexQtic. Natural fabrics, garments, home textiles, technical textiles, and ecosystem context.",
  "url": "https://app.texqtic.com/collections",
  "isPartOf": { "@type": "WebSite", "name": "TexQtic", "url": "https://app.texqtic.com" }
}
```

managed attr: `data-texqtic-public-jsonld=true` ✅

### 6.2 `/products`

```
robots: index, follow
canonical: https://app.texqtic.com/products
jsonLdCount: 1
```

Block 1:
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Explore Textile Products — TexQtic",
  "description": "Browse public-safe textile product previews across garments, home textiles, technical textiles, and fabrics on TexQtic.",
  "url": "https://app.texqtic.com/products",
  "isPartOf": { "@type": "WebSite", "name": "TexQtic", "url": "https://app.texqtic.com" }
}
```

managed attr: `data-texqtic-public-jsonld=true` ✅

### 6.3 `/products/category/garments`

```
robots: index, follow
canonical: https://app.texqtic.com/products/category/garments
jsonLdCount: 2
```

Block 1:
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Garments — Browse Textile Products | TexQtic",
  "description": "Explore public-safe garment product previews on TexQtic. Discover finished garments across materials, styles, and supply chain pathways.",
  "url": "https://app.texqtic.com/products/category/garments",
  "isPartOf": { "@type": "WebSite", "name": "TexQtic", "url": "https://app.texqtic.com" }
}
```

Block 2:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Products", "item": "https://app.texqtic.com/products" },
    { "@type": "ListItem", "position": 2, "name": "Garments", "item": "https://app.texqtic.com/products/category/garments" }
  ]
}
```

managed attr: `data-texqtic-public-jsonld=true` ✅ (both blocks)

### 6.4 `/collections/natural-fabric-stories`

```
robots: index, follow
canonical: https://app.texqtic.com/collections/natural-fabric-stories
jsonLdCount: 2
```

Block 1:
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Natural Fabric Stories — TexQtic Verified Textile Collections",
  "description": "Natural Fabric Stories: A curated public showcase of textile stories centred on natura.... Eligible products may include public trust context where available.",
  "url": "https://app.texqtic.com/collections/natural-fabric-stories",
  "isPartOf": { "@type": "WebSite", "name": "TexQtic", "url": "https://app.texqtic.com" }
}
```

Block 2:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Collections", "item": "https://app.texqtic.com/collections" },
    { "@type": "ListItem", "position": 2, "name": "Natural Fabric Stories", "item": "https://app.texqtic.com/collections/natural-fabric-stories" }
  ]
}
```

managed attr: `data-texqtic-public-jsonld=true` ✅ (both blocks)

### 6.5 `/inquiry`

```
robots: index, follow
canonical: https://app.texqtic.com/inquiry
jsonLdCount: 0
```

No JSON-LD. Expected — by design per source code.

### 6.6 `/product/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` (notFound state)

```
robots: noindex, nofollow
canonical: https://app.texqtic.com/products
jsonLdCount: 0
```

No JSON-LD. Expected — `notFound` state applies `noindex, nofollow` and no JSON-LD.
API endpoint for this slug returned `net::ERR_ABORTED` (product not published for public discovery).
Canonical falls back to `/products` list. Correct fail-closed behavior.

### 6.7 Stub states (`/trust`, `/industries`, `/aggregator`)

All three:
```
robots: noindex, nofollow
jsonLdCount: 0
```

No JSON-LD. Expected — stub states are noindexed; no structured data required.

---

## 7. Structural Validation Results

### 7.1 JSON Syntax

All extracted blocks: valid JSON ✅ (parsed successfully by browser `textContent` extraction)

### 7.2 Schema.org Type Compliance

| Type | Governance status | Present | Verdict |
|---|---|---|---|
| `CollectionPage` | ALLOWED | Yes (`/collections`) | ✅ |
| `WebPage` | ALLOWED | Yes (4 pages) | ✅ |
| `WebSite` | ALLOWED | Yes (all, via `isPartOf`) | ✅ |
| `BreadcrumbList` | ALLOWED | Yes (2 pages) | ✅ |
| `ListItem` | ALLOWED | Yes (within BreadcrumbList) | ✅ |
| `Product` | FORBIDDEN | Absent | ✅ |
| `Offer` | FORBIDDEN | Absent | ✅ |
| `AggregateRating` | FORBIDDEN | Absent | ✅ |
| `Review` | FORBIDDEN | Absent | ✅ |
| `Organization` | FORBIDDEN | Absent | ✅ |
| `FAQPage` | FORBIDDEN | Absent | ✅ |
| `ContactPage` | FORBIDDEN | Absent | ✅ |

### 7.3 Required Field Compliance (schema.org)

| Type | Required fields | Status |
|---|---|---|
| `CollectionPage` | No required fields (extends WebPage) | ✅ |
| `WebPage` | No required fields | ✅ |
| `WebSite` | No required fields | ✅ |
| `BreadcrumbList` | `itemListElement` | ✅ present |
| `ListItem` | `position`, `item` (for BreadcrumbList) | ✅ present on all items |

### 7.4 URL Consistency

| Check | Result |
|---|---|
| `url` field matches canonical tag | ✅ all checked pages |
| `isPartOf.url` = `https://app.texqtic.com` | ✅ all checked pages |
| `item` in ListItem = absolute URL | ✅ all BreadcrumbList items |
| `@context` = `https://schema.org` (not `http://`) | ✅ all blocks |

### 7.5 `data-texqtic-public-jsonld` Managed Attribute

All injected `<script type="application/ld+json">` tags carry `data-texqtic-public-jsonld="true"`.
This confirms the idempotent cleanup mechanism is correctly applied. ✅

---

## 8. External Tool Validation Status

| Tool | Status | Reason |
|---|---|---|
| Google Rich Results Test (`search.google.com/test/rich-results`) | NOT RUN | Browser automation for external form submission not attempted in this unit |
| Schema.org Validator (`validator.schema.org`) | NOT RUN | Same — external tool form submission not attempted |

External tool reports are deferred. Structural evidence (DOM extraction + type compliance) is
sufficient for PARTIAL decision. A future FU (e.g. FU-005-JSONLD-GRT-REPORT) should capture a
formal Google Rich Results Test report before any public SEO campaign launch.

Note: For a Vite + React CSR SPA, Google Rich Results Test renders the page via Googlebot (JS-enabled),
so it would see the same dynamically injected JSON-LD confirmed above. No prerender mismatch risk.

---

## 9. Decision

**PARTIAL**

Rationale:
- All JSON-LD injections confirmed live via DOM extraction ✅
- All injected types governance-compliant ✅
- All forbidden types absent ✅
- BreadcrumbList structure correct ✅
- URL consistency confirmed ✅
- JSON syntax valid ✅
- No external Google Rich Results Test report (deferred) — prevents VERIFIED_PASS

BS-005 risk is **significantly mitigated** by this validation. The probability that Google Rich
Results Test would surface errors is very low given the structural quality confirmed above.

---

## 10. Register Updates

| Register | Field | Before | After |
|---|---|---|---|
| BLIND-SPOT-DEPENDENCY-RISK-REGISTER | BS-005 Status | `OPEN` | `PARTIAL` |
| BLIND-SPOT-DEPENDENCY-RISK-REGISTER | BS-005 Evidence | implementation unit / test coverage only | + DOM extraction + structural validation (this unit) |
| NEXT-ACTION.md | `last_closed_governance_unit` | `FU-003-ROBOTS-DEPLOYMENT-VERIFY` | `BS-005-JSONLD-RICH-RESULTS-VALIDATION-001` |

FUTURE-TODO-REGISTER: no JSON-LD specific FTR entry — no update required.

---

## 11. Runtime Non-Change Confirmation

No source code files were modified in this unit.
No schema, migration, frontend, `.env`, or configuration files were changed.
No feature flags activated or deactivated.
Governance artifacts only.

---

## 12. Files Changed

```
A  governance/units/BS-005-JSONLD-RICH-RESULTS-VALIDATION-001.md   ← this file
A  governance/launch-readiness/BS-005-JSONLD-RICH-RESULTS-VALIDATION.md
M  governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md
M  governance/control/NEXT-ACTION.md
```

---

## 13. Commit

Primary commit message:
```
[TEXQTIC] governance: validate JSON-LD rich results readiness — partial
```

Backfill commit (after hash known):
```
[TEXQTIC] governance: backfill commit hash in JSON-LD validation artifact
```

---

## 14. Recommended Next Unit

If GRT report is desired before public SEO campaign:
→ **FU-005-JSONLD-GRT-REPORT-001**: Navigate to Google Rich Results Test, submit each indexable URL,
  capture pass/warning/error report. Upgrade BS-005 to VERIFIED_PASS if no errors.

If real product data is prioritised first:
→ **HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-001**: Verify that real supplier product data
  is seeded and visible on /products and /product/:slug.

Current P0 open items that should precede any public promotion:
- BS-001 (real data QA), BS-002 (inquiry notification), HD-001 (invite-token), HD-002 (real data)

---

## 15. Update History

| Date | Author | Change |
|---|---|---|
| 2026-05-20 | Copilot | Initial unit — PARTIAL decision — DOM extraction + structural validation |
