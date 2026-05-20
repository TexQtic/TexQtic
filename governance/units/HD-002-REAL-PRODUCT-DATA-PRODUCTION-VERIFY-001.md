# HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-001

## 1. Header

| Field | Value |
|---|---|
| Unit ID | HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-001 |
| Track | Launch Readiness / B2C Public Browse / Real Data Readiness |
| Type | Hidden Dependency Verification |
| Date | 2026-05-20 |
| Starting HEAD | `63f5893` |
| Starting branch | `main` |
| Starting tree status | CLEAN (main = origin/main) |
| Decision | **FAIL — Production B2C browse contains QA fixture data only; no real supplier product data present** |
| Hidden dependency closed | HD-002 → VERIFIED_FAIL |
| BS-001 impact | BS-001 CONFIRMED — QA data verified live in production |
| Commit hash | `3482b48` |

---

## 2. Objective

Verify whether `https://app.texqtic.com` currently contains real, production-safe supplier and
product data suitable for public soft-launch discovery and buyer-facing CTA traffic.

Return a VERIFIED_PASS / PARTIAL / FAIL decision for HD-002 in the Blind Spot, Dependency,
and Risk Register.

Scope:
- B2C public browse API: `GET /api/public/b2c/products`
- B2C product detail API: `GET /api/public/b2c/products/:slug`
- Public collections surface: `/collections` and `/collections/:slug` (static config)
- Public category story pages: `/products/category/:slug`
- Live DOM observation of `/products` browse page

This unit does NOT modify any source code, routes, schema, services, database records,
`.env` files, or configuration.

---

## 3. Authority Documents

| Document | Role |
|---|---|
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | HD-002 and BS-001 definitions |
| `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | B2C projection architecture; five safety gates |
| `server/src/services/publicB2CProjection.service.ts` | Production projection logic; gate definitions |
| `config/publicCollectionsProjection.ts` | Collections static config; no live API |

---

## 4. Source Files Inspected (Read-Only)

| File | Purpose |
|---|---|
| `server/src/services/publicB2CProjection.service.ts` | Projection gate definitions; empty-result handling |
| `services/publicB2CService.ts` | Frontend API client; endpoint contracts |
| `config/publicCollectionsProjection.ts` | Collections static projection; 5 approved slugs |
| `config/publicB2CCategoryPages.ts` | Category page static config; 4 approved category pages |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | HD-002/BS-001 current status |
| `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | B2C architecture context |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-01 status; review trigger |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-B2C items; seeding deferred context |

No source files were modified.

---

## 5. Architecture Findings (Source Code)

### 5.1 B2C Public Browse — API-backed (not static)

`GET /api/public/b2c/products` is a live Fastify backend API. It calls
`server/src/services/publicB2CProjection.service.ts` which queries the Supabase-hosted
Postgres DB.

Five projection safety gates (all must pass — fail = silent exclusion):
- **Gate A**: `tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'`
- **Gate B**: `org.publication_posture IN ('B2C_PUBLIC', 'BOTH')`
- **Gate C**: `org.org_type === 'B2C'`
- **Gate D**: `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')`
- **Gate E**: Only allowed public-safe payload fields; prohibited fields never in output

The service itself documents an expected empty state:
> "EMPTY RESULT: Lawful — no B2C-public data has yet been posture-assigned.
> Returns `{ items: [], total: 0, page, limit }` — NOT an error."

This confirms the service was designed with the awareness that no real data may be present.

### 5.2 Collections Surface — Static config (no API)

`/collections` and `/collections/:slug` are backed entirely by
`config/publicCollectionsProjection.ts` — a static TypeScript config. No backend API exists.
There are 5 approved AVAILABLE collections:
1. `natural-fabric-stories` — Material story
2. `garment-supply-chain-context` — Process story
3. `home-textiles-showcase` — Category showcase
4. `textile-services-ecosystem` — Ecosystem showcase
5. `technical-textiles-context` — Category showcase

All collections are **editorial/conceptual ecosystem framing only** — not linked to any
live product inventory or supplier records. `collectionHasTrustContext: false` on all 5.

### 5.3 Category Pages — Static config with live product filter

`/products/category/:slug` pages use static config from `config/publicB2CCategoryPages.ts`
for hero and SEO content. The product grid still calls the live `GET /api/public/b2c/products`
API and filters by `IndustrySegment`. Since all live products have `category: null`,
category-filtered grids show 0 matching products.

---

## 6. Live Production Evidence

Method: Playwright browser automation and direct API fetch, live production
`https://app.texqtic.com`. Verified on 2026-05-20.

### 6.1 `GET /api/public/b2c/products` — Browse API

**Raw API response (exact):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "slug": "qa-b2c",
        "legalName": "QA B2C",
        "orgType": "B2C",
        "jurisdiction": "US-CA",
        "productsPreview": [
          {
            "slug": "qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10",
            "name": "QA B2C Cotton Scarf",
            "moq": 1,
            "price": "24",
            "imageUrl": "https://placehold.co/1200x900/C2410C/FFFFFF/png?text=QA%20B2C%20Cotton%20Scarf",
            "category": null,
            "material": null,
            "fabricType": null
          },
          {
            "slug": "qa-b2c--qa-b2c-linen-wrap-c48d2bc0ea",
            "name": "QA B2C Linen Wrap",
            "moq": 1,
            "price": "38",
            "imageUrl": "https://placehold.co/1200x900/EA580C/FFFFFF/png?text=QA%20B2C%20Linen%20Wrap",
            "category": null,
            "material": null,
            "fabricType": null
          },
          {
            "slug": "qa-b2c--qa-b2c-silk-pocket-square-1192a1b1f2",
            "name": "QA B2C Silk Pocket Square",
            "moq": 1,
            "price": "18",
            "imageUrl": "https://placehold.co/1200x900/9A3412/FFFFFF/png?text=QA%20B2C%20Silk%20Pocket%20Square",
            "category": null,
            "material": null,
            "fabricType": null
          }
        ],
        "publicationPosture": "B2C_PUBLIC",
        "eligibilityPosture": "PUBLICATION_ELIGIBLE"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

**Analysis:**

| Criterion | Finding | Real data? |
|---|---|---|
| Storefront count | 1 entry | ❌ |
| Supplier name | "QA B2C" | ❌ QA fixture |
| Supplier slug | "qa-b2c" | ❌ QA fixture |
| Jurisdiction | "US-CA" | ❌ Not Surat India |
| Product count | 3 products | ❌ |
| Product names | "QA B2C Cotton Scarf", "QA B2C Linen Wrap", "QA B2C Silk Pocket Square" | ❌ QA-prefixed test names |
| Product images | placehold.co placeholder URLs | ❌ No real images |
| Category | null on all 3 | ❌ Missing metadata |
| Material | null on all 3 | ❌ Missing metadata |
| FabricType | null on all 3 | ❌ Missing metadata |

### 6.2 `GET /api/public/b2c/products/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` — Detail API

**Raw API response (exact):**
```json
{
  "success": true,
  "data": {
    "slug": "qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10",
    "name": "QA B2C Cotton Scarf",
    "category": null,
    "material": null,
    "fabricType": null,
    "summary": "B2C browse proof item one.",
    "description": "B2C browse proof item one.",
    "imageUrls": ["https://placehold.co/1200x900/C2410C/FFFFFF/png?text=QA%20B2C%20Cotton%20Scarf"],
    "publicSupplierName": "QA B2C",
    "publicSupplierSlug": "qa-b2c",
    "publicPriceLabel": "24",
    "publicMoqLabel": "MOQ 1",
    "trustSignals": ["Public-safe projection only"],
    "hasTraceabilityEvidence": false,
    "hasPassport": false,
    "publicStatusLabel": "Publicly discoverable",
    "tags": [],
    "relatedProducts": [
      { "slug": "qa-b2c--qa-b2c-linen-wrap-c48d2bc0ea", "name": "QA B2C Linen Wrap", ... },
      { "slug": "qa-b2c--qa-b2c-silk-pocket-square-1192a1b1f2", "name": "QA B2C Silk Pocket Square", ... }
    ]
  }
}
```

**Analysis:**

| Criterion | Finding | Real data? |
|---|---|---|
| Product name | "QA B2C Cotton Scarf" | ❌ QA test name |
| Summary | "B2C browse proof item one." | ❌ Test/proof copy |
| Description | "B2C browse proof item one." | ❌ Test/proof copy |
| Supplier name | "QA B2C" | ❌ QA fixture |
| Images | placehold.co | ❌ No real images |
| Trust signals | ["Public-safe projection only"] | ❌ Test signal |
| hasTraceabilityEvidence | false | ❌ |
| hasPassport | false | ❌ |
| category / material / fabricType | null | ❌ Missing metadata |
| Related products | 2 other QA fixtures | ❌ |

### 6.3 `/products` Browse Page — DOM Observation

- Page title: "Explore Textile Products — TexQtic" ✅ (correct SEO metadata)
- Product grid: Rendered "Loading products..." on multiple observations.
  The live API returns 3 QA products but the browse grid appeared slow to render or
  the B2C browse component rendering pipeline for QA products was stalled.
  Regardless, the 3 products that would load are all QA fixtures.

### 6.4 `/products/category/garments` — Category Page DOM

- Page title: "Garments — Browse Textile Products | TexQtic" ✅
- Hero copy, context band: rendered from static config ✅
- Product grid: "Loading products..." — no category-matched products (all QA products have `category: null`)
- Result: 0 real products per category filter

### 6.5 `/collections` — Collections Page DOM

- Page title: "Verified Textile Collections — TexQtic" ✅
- 5 collection cards rendered correctly from static config ✅
- All collections use `collectionHasTrustContext: false` — editorial framing only
- No live product inventory connected to any collection
- **Collections surface is FUNCTIONAL** but not backed by real product data

### 6.6 `/collections/natural-fabric-stories` — Collection Detail DOM

- Page title: "Natural Fabric Stories — TexQtic Verified Textile Collections" ✅
- Static editorial story body rendered correctly ✅
- Trust context: "conditional, product-scoped only" — correctly conditional
- No product inventory linked
- CTA: "Continue after sign in" (non-transactional, auth-gated) ✅
- **Functionally correct** but not backed by real product data

---

## 7. Forbidden Changes (Confirmed Not Made)

- `App.tsx` — not modified
- Any B2C or D2C component — not modified
- `server/` — not modified
- `config/publicCollectionsProjection.ts` — not modified
- `config/publicB2CCategoryPages.ts` — not modified
- `services/publicB2CService.ts` — not modified
- Supabase schema, RLS, Prisma — not modified
- `.env` — not modified
- `public/sitemap.xml`, `public/robots.txt` — not modified
- Database records — not seeded, modified, or deleted

---

## 8. Verdict

### HD-002 Status: **VERIFIED_FAIL**

**Production B2C public browse contains QA fixture data only. No real supplier product data
is present in the production database with the B2C public projection posture.**

### Evidence Summary

| Data Category | Production State | Required for Soft-Launch |
|---|---|---|
| Supplier entities (B2C_PUBLIC) | 1 QA fixture ("QA B2C", US-CA) | Real Surat India textile suppliers |
| Products with real names | 0 (3 QA-named fixtures) | ≥10 real textile products |
| Products with real descriptions | 0 | Supplier-written descriptions |
| Products with real images | 0 (all placehold.co) | Real product photography |
| Products with category set | 0 (all null) | Populated category, material, fabricType |
| Trust signals | Test-only signal ("Public-safe projection only") | Real trust signals where applicable |
| Collections backed by live products | 0 (all editorial framing) | Not a hard block (conceptual framing is valid) |

### BS-001 Impact

BS-001 is CONFIRMED by this unit. All B2C browse and product detail units were production-
verified using this QA fixture set. The QA data is confirmed to be live in production as of
2026-05-20.

### Required Before Public Outreach

Public buyer-facing CTA traffic MUST NOT be directed to `/products` or `/product/:slug` until:
1. At least one real Surat India textile supplier is onboarded through the full HD-001 invite path
2. That supplier has seeded a real product catalog (≥1 product minimum; ≥10 recommended)
3. All five B2C projection gates pass for real tenant data
4. Product data includes: real name, real description, real image URL, and populated
   category/material/fabricType fields
5. QA fixture data ("QA B2C") has been removed from production B2C public projection posture
   OR the QA org's publication_posture is set to PRIVATE_OR_AUTH_ONLY

---

## 9. Required Next Units

| Condition | Recommended next unit |
|---|---|
| If real supplier onboarding is authorized | HD-001 resolution → supplier seeding → rerun HD-002 |
| If QA data is to be removed from public posture | Separate data remediation unit (set QA org posture to PRIVATE_OR_AUTH_ONLY) |
| If MARKETING-HOMEPAGE-POSITIONING-CTA-ALIGNMENT-001 is planned | BLOCKED by HD-002 FAIL until real data present |

---

## 10. Files Changed

| File | Change |
|---|---|
| `governance/units/HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-001.md` | Created (this document) |
| `governance/launch-readiness/HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY.md` | Created (launch-readiness verification doc) |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | HD-002 row: OPEN → VERIFIED_FAIL; BS-001 Evidence column updated; update history row added |
| `governance/control/NEXT-ACTION.md` | Rotated `last_closed_governance_unit` to HD-002 |
