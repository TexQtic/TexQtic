# SOFT-LAUNCH-PRODUCT-DATA-INVENTORY-001

**Packet ID:** SOFT-LAUNCH-PRODUCT-DATA-INVENTORY-C4-MINI-SYNTHESIS  
**Unit ID:** SOFT-LAUNCH-PRODUCT-DATA-INVENTORY-001  
**Status:** GOVERNANCE_SYNTHESIS — no source changes, no production mutation, no supplier/product seeding  
**Date:** 2026-05-21  
**Synthesizes:** C1 schema scan · C2 public projection scan · C3 creation surface scan  
**Authority boundary:** Findings and field inventory only. This unit does not open any family
cycle, authorize any DB write, or change Layer 0 posture.

---

## 1. Synthesis Summary

Three C-series read-only scans have been completed:

| Packet | Scope | Status |
|---|---|---|
| C1 — `SOFT-LAUNCH-PRODUCT-DATA-INVENTORY-C1-SCHEMA-SCAN` | `server/prisma/schema.prisma` — `CatalogItem` model; all textile and visibility fields | COMPLETE |
| C2 — `SOFT-LAUNCH-PRODUCT-DATA-INVENTORY-C2-PUBLIC-PROJECTION-SCAN` | `publicB2CProjection.service.ts`; public browse and detail output shapes; five safety gates | COMPLETE |
| C3 — `SOFT-LAUNCH-PRODUCT-DATA-INVENTORY-C3-CREATION-SURFACE-SCAN` | `server/src/routes/tenant.ts` (create/update routes); `services/catalogService.ts`; `App.tsx` (UI forms); controlled scripts | COMPLETE |

**Key findings before the matrix:**

- A product can be created with full metadata (name, price, imageUrl, description, category,
  material, fabricType, moq, stage attributes) **via the existing tenant UI or API**.
- **`publicationPosture` is constitutionally absent from all API and UI write paths.**
  Every new item is hard-created at `PRIVATE_OR_AUTH_ONLY`. No tenant-facing API field exists
  for posture elevation. Only a controlled DB script can set `publication_posture = 'B2C_PUBLIC'`
  on a catalog item.
- **Four org/tenant-level gate fields must be set before any product becomes publicly visible.**
  None of these are writable via any tenant-facing API. All require admin action or a controlled
  script (modeled on `server/scripts/assign-b2c-public-posture.ts`).
- The public browse projection (`GET /api/public/b2c/products`) surfaces 8 fields from
  `catalog_items`. Eight further fields are read only at detail level. The remaining ~14 schema
  fields are excluded from all public output (Gate E).
- **HD-002 resolution requires a hybrid seeding sequence:** product metadata via UI/API,
  followed by a controlled admin script for posture and gate elevation.

---

## 2. Public Projection Surfaces

Two routes are served by `publicB2CProjection.service.ts`:

| Route | Handler | Output shape |
|---|---|---|
| `GET /api/public/b2c/products` | `listPublicB2CProducts()` | `PublicB2CBrowseResponse` — array of storefronts, each with up to 5 `PublicB2CProductPreviewItem` |
| `GET /api/public/b2c/products/:slug` | `getPublicB2CProductBySlug()` | `PublicB2CProductDetail` |

**Five safety gates (all must pass — fail = product silently excluded):**

| Gate | Column | Required value | Writable via tenant API |
|---|---|---|---|
| A | `tenants.publicEligibilityPosture` | `PUBLICATION_ELIGIBLE` | NO — admin/script only |
| B | `organizations.publication_posture` | `B2C_PUBLIC` or `BOTH` | NO — admin/script only |
| C | `organizations.org_type` | `B2C` | NO — no API surface |
| D | `organizations.status` | `ACTIVE` or `VERIFICATION_APPROVED` | NO — set at onboarding |
| E (item) | `catalog_items.publication_posture` | `B2C_PUBLIC` or `BOTH` | NO — controlled script only |
| E (item) | `catalog_items.active` | `true` | YES — via `PATCH /api/tenant/catalog/items/:id` |

---

## 3. Full Field Inventory Matrix

### 3A — CatalogItem Fields

| Field | Source: model / API / form | Required / Optional | Browse output | Detail output | HD-002-critical | Soft-launch minimum value | Manually curatable via UI/API | Validation notes |
|---|---|---|---|---|---|---|---|---|
| `name` | `catalog_items.name` · `POST /api/tenant/catalog/items` (required) · UI add + edit form | **REQUIRED** | YES — display name in product card | YES — primary heading | YES | Real product name (e.g. "240GSM Ring-Spun Cotton Twill") | YES — UI and API | string min(1) max(255); must not be test/placeholder value for soft launch |
| `price` | `catalog_items.price` · `POST` (required positive) · UI add + edit form | **REQUIRED** (API level) | YES — `price` field (nullable serialized Decimal) | YES — `publicPriceLabel` | YES | Real indicative wholesale price; no fake `"1.00"` | YES — UI and API | Decimal(10,2); must be positive; displayed raw to public buyer |
| `moq` | `catalog_items.moq` · `POST` (optional, default 1) · UI add + edit form | optional (defaults to `1`) | YES — `moq` field | YES — `publicMoqLabel` ("MOQ N") | YES | Real MOQ; default of `1` is misleading for industrial fabric | YES — UI and API | int min(1); a default of 1 is technically valid but misrepresents industrial minimums |
| `imageUrl` | `catalog_items.image_url` · `POST` optional · UI add + edit form | optional | YES — product card image | YES — `imageUrls[0]` (array) | **YES — de facto required** | Publicly accessible CDN URL to a real product photograph | YES — UI and API | string url() max(2048); null renders broken card; no placeholder/stock images acceptable; see §5 image requirements |
| `description` | `catalog_items.description` · `POST` optional · UI textarea | optional | NO | YES — `summary` (first 180 chars) + full `description` | YES (for detail richness) | At least 2 honest sentences describing material, use, and supply context | YES — UI and API | Free text; trimmed at 180 chars for browse summary; must not be generic filler |
| `productCategory` | `catalog_items.product_category` · `POST` optional · UI select | optional | YES — `category` field; browse facet | YES — `category` + `tags` array | YES | Must match enum; set to primary category (e.g. `APPAREL_FABRIC`, `HOME_TEXTILE`) | YES — UI and API | enum: `APPAREL_FABRIC` `HOME_TEXTILE` `TECHNICAL_FABRIC` `INDUSTRIAL_FABRIC` `LINING` `INTERLINING` `TRIMMING` `ACCESSORY` `OTHER` |
| `material` | `catalog_items.material` · `POST` optional · UI select | optional | YES — `material` field; browse facet | YES — `material` + `tags` array | YES | Must match enum; set to primary fibre (e.g. `COTTON`, `LINEN`, `POLYESTER`) | YES — UI and API | enum: `COTTON` `POLYESTER` `SILK` `WOOL` `LINEN` `VISCOSE` `MODAL` `TENCEL_LYOCELL` `NYLON` `ACRYLIC` `HEMP` `BAMBOO` `RECYCLED_POLYESTER` `RECYCLED_COTTON` `BLENDED` `OTHER` |
| `fabricType` | `catalog_items.fabric_type` · `POST` optional · UI select | optional | YES — `fabricType` field; browse enrichment | YES — `fabricType` + `tags` array | YES | Set to primary construction type (e.g. `WOVEN`, `KNIT`) | YES — UI and API | enum: `WOVEN` `KNIT` `NON_WOVEN` `LACE` `EMBROIDERED` `TECHNICAL_COMPOSITE` `FLEECE` `OTHER` |
| `publicationPosture` | `catalog_items.publication_posture` · **NO API field** · **NO UI field** | Hard-coded `PRIVATE_OR_AUTH_ONLY` on create; no PATCH path | NO (gate field, excluded from output) | NO (gate field, excluded from output) | **CRITICAL — item-level Gate E** | `B2C_PUBLIC` | **NO — controlled DB script only** | Default `PRIVATE_OR_AUTH_ONLY`; constrained VarChar(30); only writable via direct SQL / controlled script modelled on `server/scripts/assign-b2c-public-posture.ts` |
| `active` | `catalog_items.active` · `PATCH /api/tenant/catalog/items/:id` · UI edit form (implicit via delete) | boolean, default `true` | NO (browse gate: must be `true`) | NO (detail gate: must be `true`) | YES — implicit gate | `true` (default on create) | YES — via PATCH API | bool; default true; inactive items are silently excluded from all public projection |
| `catalogStage` | `catalog_items.catalog_stage` · `POST` optional · UI select | optional | NO | NO (excluded from public projection) | NO | Set for real products where applicable (e.g. `FABRIC_WOVEN`, `YARN`, `GARMENT`) | YES — UI and API | enum(14): `YARN` `FIBER` `FABRIC_WOVEN` `FABRIC_KNIT` `FABRIC_PROCESSED` `GARMENT` `ACCESSORY_TRIM` `CHEMICAL_AUXILIARY` `MACHINE` `MACHINE_SPARE` `PACKAGING` `SERVICE` `SOFTWARE_SAAS` `OTHER`; governs dynamic stage sub-form in UI |
| `stageAttributes` | `catalog_items.stage_attributes` (JSONB) · `POST` optional · UI dynamic sub-form per stage | optional | NO | NO (excluded from public projection) | NO | Set per stage where real technical data is available; not required for soft-launch | YES — UI and API | Per-stage Zod schema; stage-specific sub-fields (yarnType, knitType, garmentType, etc.); validated via `.passthrough()` for unknown stages |
| `sku` | `catalog_items.sku` · `POST` optional · UI add + edit form | optional | NO | NO (excluded from public projection) | NO | Real SKU if available; omission acceptable | YES — UI and API | VarChar(100); not surfaced in any public output |
| `composition` | `catalog_items.composition` · `POST` optional · UI add + edit form | optional | NO | NO (excluded from public projection) | NO | "60% Cotton 40% Polyester" style; useful internally; deferred for soft-launch | YES — UI and API | VarChar(500); not in public projection |
| `color` | `catalog_items.color` · `POST` optional · UI add + edit form | optional | NO | NO (excluded from public projection) | NO | Not surfaced in public output | YES — UI and API | VarChar(100) |
| `gsm` | `catalog_items.gsm` · `POST` optional · UI add + edit form | optional | NO | NO (excluded from public projection) | NO | Not surfaced in public output | YES — UI and API | Decimal(6,1); range 10–2000 |
| `widthCm` | `catalog_items.width_cm` · `POST` optional · UI add + edit form | optional | NO | NO (excluded from public projection) | NO | Not surfaced in public output | YES — UI and API | Decimal(6,2); range 1–999.99 |
| `construction` | `catalog_items.construction` · `POST` optional · UI select | optional | NO | NO (excluded from public projection) | NO | Not surfaced in public output | YES — UI and API | enum(13): `PLAIN_WEAVE` `TWILL` `SATIN` `DOBBY` `JACQUARD` `TERRY` `VELVET` `JERSEY` `RIB` `INTERLOCK` `FLEECE_KNIT` `MESH` `OTHER` |
| `certifications` | `catalog_items.certifications` (JSONB) · `POST` optional · API only (no UI form) | optional | NO | NO (trust signals are org-level, not item-level, in current projection) | NO | Not required for soft-launch; add post-launch | API only | Array of `{standard, certNumber?, issuedBy?, validUntil?}`; not rendered in public detail |
| `catalogVisibilityPolicyMode` | `catalog_items.catalog_visibility_policy_mode` · `POST`/`PATCH` optional · **no UI field** | optional | NO (B2C projection does not gate on this) | NO | NO for B2C scope | NULL / omit for straightforward B2C public | YES — via API only | enum: `PUBLIC` `AUTHENTICATED_ONLY` `APPROVED_BUYER_ONLY` `HIDDEN` `RELATIONSHIP_GATED`; this is a B2B fine-grained access control field; the B2C public projection ignores it |
| `priceDisclosurePolicyMode` | `catalog_items.price_disclosure_policy_mode` · **no API field** in create/update schema | NOT exposed | NO | NO | NO | Not applicable for B2C scope | NO | B2B-specific policy field; not in create or PATCH body schema; not surfaced in public projection |

### 3B — Org/Tenant Gate Fields (NOT on catalog_items — admin/script writes only)

These fields live outside `catalog_items` but are upstream gates for public product visibility.
**None are writable via any tenant-facing API.**

| Field | Table | Required value | Gate | HD-002-critical | Soft-launch minimum | Write path |
|---|---|---|---|---|---|---|
| `publicEligibilityPosture` | `tenants` | `PUBLICATION_ELIGIBLE` | Gate A | **CRITICAL** | `PUBLICATION_ELIGIBLE` | Admin action or controlled script; no tenant-facing API |
| `publication_posture` | `organizations` | `B2C_PUBLIC` or `BOTH` | Gate B | **CRITICAL** | `B2C_PUBLIC` | Controlled script (model: `assign-b2c-public-posture.ts`); no API surface |
| `org_type` | `organizations` | `B2C` | Gate C | **CRITICAL** | `B2C` | Set at provisioning; no API surface to change post-provisioning; Surat B2B suppliers structurally fail this gate — requires a B2C-type supplier account |
| `status` | `organizations` | `ACTIVE` or `VERIFICATION_APPROVED` | Gate D | YES | `ACTIVE` | Set at onboarding activation; no additional action required for active accounts |
| `legal_name` | `organizations` | Real business name | Output field | YES | Real supplier name | Admin-supplied at provisioning; not writable post-provisioning via tenant API |
| `slug` | `organizations` | Stable URL-safe slug | Storefront slug | YES | Derived from legalName at provisioning | System-generated at provisioning; not updatable |

---

## 4. Minimum Viable Product Counts

### Minimum for HD-002 VERIFIED_PASS

| Criterion | Minimum | Recommended |
|---|---|---|
| Suppliers with all 4 org/tenant gates passing | 1 | 2–3 |
| Products per supplier with `publicationPosture = 'B2C_PUBLIC'` | 1 | 5 (fills MAX_PRODUCT_PREVIEW) |
| Products with `name` + `price` + `imageUrl` + `productCategory` + `material` + `fabricType` | 1 | 5 |
| Products with `description` (non-empty) | 1 | 5 |

**Hard minimum for a non-embarrassing soft-launch browse experience:**
3 products per supplier, each with: real name, real price, real imageUrl, productCategory,
material, fabricType, and a description of at least 1 sentence.
5 products per supplier to reach the `MAX_PRODUCT_PREVIEW = 5` cap and present a credible
storefront to first buyers.

### Recommended count for HD-002 recheck

| Scope | Count | Reason |
|---|---|---|
| Real B2C-type supplier accounts | ≥ 1 | Gate C requires `org_type = 'B2C'`; existing Surat B2B pilot suppliers do not qualify |
| Products per supplier in public browse | 5 | Fills storefront preview (MAX_PRODUCT_PREVIEW); demonstrates catalog depth |
| Total public-posture-assigned products | ≥ 5 | Minimum browse surface; 10–15 recommended for a credible early buyer signal |

---

## 5. Minimum Image Requirements

| Requirement | Specification |
|---|---|
| Image count per product | ≥ 1 (projection renders `imageUrls[0]` from `imageUrl`) |
| Hosting | Publicly accessible CDN URL (not localhost, not Supabase Storage private URL) |
| Format | JPEG or PNG; minimum 600 × 600px recommended for card display |
| URL max length | 2048 characters (Zod constraint on `imageUrl` field) |
| URL format | Absolute URL; must not require authentication to fetch |
| Acceptable sources | Supplier-provided product photography or public-safe stock imagery matching the real product type |
| Not acceptable | `null` (renders broken card), `placeholder.com` or generic stock images, `localhost:*`, `127.0.0.1`, private Supabase Storage authenticated URLs, fake product images that do not match the product name |

---

## 6. Fields That Must Not Be Fake or Placeholder

The following fields are either rendered directly to public buyers or are used in SEO metadata.
They must contain real, truthful, supplier-agreed content before soft-launch.

| Field | Soft-launch constraint | Why |
|---|---|---|
| `name` | Real product name; no "Test Fabric 1", "Sample Product", "Product 001" | Displayed as product heading in browse card and detail page |
| `price` | Real indicative wholesale price; no "1.00" or "0.01" filler | Displayed as `publicPriceLabel`; misleads buyers |
| `imageUrl` | Real product photograph hosted on public CDN | Displayed in browse card; null = broken card |
| `description` | Honest summary of product (material, use, sourcing context); no lorem ipsum or generic copy | Used as detail page summary; buyer-facing trust signal |
| `productCategory` | Correct classification from enum; not `OTHER` if a more specific value applies | Drives browse facet display and SEO tags |
| `material` | Correct primary fibre from enum | Drives browse facet display and SEO tags |
| `fabricType` | Correct construction type from enum | Drives browse enrichment |
| `organizations.legal_name` | Real registered business name of supplier | Rendered as `publicSupplierName` on product detail page |
| `moq` | Real minimum order quantity; not `1` for industrial fabrics unless genuinely correct | Rendered as `publicMoqLabel`; incorrect MOQ misleads B2B-aware buyers on the B2C surface |

---

## 7. Whether Current Create/Edit Path Supports Seeding

| Operation | Supported via UI/API | Evidence |
|---|---|---|
| Create product with name, price, moq, imageUrl, description | YES | `POST /api/tenant/catalog/items`; all these fields in Zod body schema and UI add form |
| Set productCategory, material, fabricType | YES | All in Zod body schema and UI select dropdowns |
| Set catalogStage and stageAttributes | YES | Zod body schema + dynamic stage sub-form in `App.tsx` |
| Set sku, color, gsm, widthCm, composition | YES | Optional fields in Zod body + UI form inputs |
| Edit any product field post-creation | YES | `PATCH /api/tenant/catalog/items/:id`; all content fields patchable |
| Set `publicationPosture = 'B2C_PUBLIC'` | **NO** | Not in create or PATCH body schema; hard-coded to `PRIVATE_OR_AUTH_ONLY` on create; no API field exists |
| Set org-level Gate A–D fields | **NO** | Admin-only or provisioning-time fields; no tenant API surface |

**Conclusion:** The create/edit path fully supports curating all public-facing content fields.
It cannot complete the seeding sequence because posture elevation is intentionally gated behind
admin/script control. A separate controlled script is required for the final step.

---

## 8. Recommended Seeding Sequence for HD-002 Resolution

The following sequence, if executed in full, is sufficient to resolve HD-002 VERIFIED_FAIL and
yield a VERIFIED_PASS on the next recheck run.

```
Step 1 (prerequisite — blocked by HD-001):
  Provision a real B2C-type supplier account (org_type = 'B2C').
  Existing Surat B2B pilot suppliers cannot pass Gate C.
  Gate: HD-001 invite-token onboarding must be functional.

Step 2 (admin action — no API):
  Set tenants.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE' for the new supplier.
  Write path: direct SQL or admin script.

Step 3 (admin action — no API):
  Set organizations.publication_posture = 'B2C_PUBLIC' for the supplier org.
  Write path: direct SQL or controlled script modelled on
              server/scripts/assign-b2c-public-posture.ts.

Step 4 (UI/API — fully supported):
  Create 5 products via the tenant UI or POST /api/tenant/catalog/items.
  Required for each: name (real), price (real), imageUrl (real CDN URL),
    productCategory, material, fabricType, description (≥ 2 sentences).
  Recommended: moq (real), catalogStage.

Step 5 (controlled script — no API):
  Set catalog_items.publication_posture = 'B2C_PUBLIC' for the 5 products.
  Write path: new controlled script modelled on
              server/scripts/assign-b2c-public-posture.ts.
  No existing script targets a real (non-QA) supplier; a new script is required.

Step 6 (verification):
  Run GET /api/public/b2c/products and confirm supplier and products appear.
  Confirm browse card fields: name, price, imageUrl, category, material, fabricType.
  Confirm detail fields: description, publicMoqLabel, publicSupplierName, tags.
  Issue HD-002 VERIFIED_PASS unit.
```

---

## 9. Required Public Product Fields (Summary)

Fields that must be present on every product before it can pass the HD-002 quality bar:

1. `name` — real product name (not placeholder)
2. `price` — real indicative price (positive Decimal)
3. `moq` — real minimum order quantity (integer ≥ 1; not `1` for industrial products)
4. `imageUrl` — publicly accessible CDN URL to a real product photograph
5. `productCategory` — correct enum value
6. `material` — correct enum value
7. `fabricType` — correct enum value
8. `description` — real editorial description (≥ 2 sentences)
9. `publicationPosture = 'B2C_PUBLIC'` — set via controlled script (not via API)
10. `active = true` — default on create; no action required unless previously deactivated

---

## 10. Optional / Deferred Fields

Fields that are optional for soft-launch and do not affect public browse or detail quality:

| Field | Defer to |
|---|---|
| `sku` | Internal ops; not in public output |
| `composition` | Detail enrichment; deferred post-launch |
| `color` | Not in public projection |
| `gsm` | Not in public projection |
| `widthCm` | Not in public projection |
| `construction` | Not in public projection |
| `certifications` | Deferred; required for trust-signal evolution but not in current projection |
| `stageAttributes` | Technical detail; useful for B2B but not in public output |
| `catalogVisibilityPolicyMode` | B2B-only gate mechanism; not used in B2C projection |
| `priceDisclosurePolicyMode` | B2B-only; not in any public path |

---

## 11. No Source Changes Confirmation

No source files were modified by this synthesis.  
No database records were mutated.  
No supplier or product records were seeded.  
This document is the only artifact produced by the C4 task.
