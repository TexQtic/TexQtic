# D2C-COLLECTION-SEO-GOVERNANCE-001
## D2C Collection SEO Governance

**Unit ID:** D2C-COLLECTION-SEO-GOVERNANCE-001
**Family:** D2C Public Projection Governance
**Status:** PROPOSED
**Date:** 2026-05-18
**Authorized by:** Paresh
**Artifact class:** Governance design — planning-only
**Placement:** Repo root (consistent with D2C-ORIGIN-STORYTELLING-GOVERNANCE-001, D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001, PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001, PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001)

---

## 1. Status Summary

| Field | Value |
|---|---|
| Unit ID | D2C-COLLECTION-SEO-GOVERNANCE-001 |
| Status | PROPOSED |
| Scope | SEO metadata, canonical URL, robots, sitemap, structured-data governance for `/collections` and `/collections/:slug` |
| Blocking | None |
| Depends on | PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001, PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001, D2C-ORIGIN-STORYTELLING-GOVERNANCE-001, D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001, COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001 |
| Implementation gate | NOT YET OPEN — governance-only |
| Runtime changes introduced | None |
| Schema changes introduced | None |
| API changes introduced | None |

**Purpose of this unit:**

This unit defines SEO governance rules for the D2C public collection surfaces — `/collections` (list) and `/collections/:slug` (detail). It specifies what metadata, canonical URLs, structured data, sitemap entries, robots directives, and SEO copy may and may not be used, and under what conditions. It constrains future implementation units and must be respected in all collection projection, SEO, and metadata implementation work.

This unit does NOT implement SEO metadata, sitemap generation, structured data emission, robots directives, image handling, or any other runtime or build-time behavior.

---

## 2. Current Repo Truth

### 2.1 Collection Surfaces (Current)

| Surface | Path | App State | Component | Status |
|---|---|---|---|---|
| Collections list | `/collections` | `PUBLIC_COLLECTIONS` | `PublicCollectionsStub` | Stub/concept-only |
| Collection detail | `/collections/:slug` | `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | `PublicCollectionUnavailable` | Safe unavailable placeholder |

- `PublicCollectionsStub` renders safe placeholder copy: "Verified Textile Collections are being prepared as public-safe curated story and showcase previews." No runtime collection list projection is implemented.
- `PublicCollectionUnavailable` renders: "This public collection preview is not currently available." Explicitly states it does not expose private collection data, does not imply collection-level passport or trust coverage, and does not confirm implemented runtime collection semantics.

### 2.2 No SEO Implementation Exists (Current)

- `index.html` carries only a single global title tag: `<title>TexQtic Platform</title>`.
- No per-page metadata tags exist (no `<meta name="description">`, no Open Graph, no Twitter Card).
- No SEO utilities, metadata management libraries, helmet/head managers, or structured-data emission utilities are present in the current codebase.
- No sitemap generation, sitemap files, or sitemap routing exists.
- No `robots.txt` dynamic generation exists.
- No JSON-LD or structured-data injection exists.
- This governance unit introduces no SEO implementation. It defines the rules that govern how SEO must be implemented when implementation units are authorized.

### 2.3 Passport / Projection Baseline (Current)

- No runtime public collection list projection is implemented.
- No collection-owned passport runtime is implemented.
- Product passport behavior remains product-scoped and conditional: CTA renders only when both `hasPassport` and `publicPassportId` are present on an individual product.
- Product-level passport context is authoritative for current public token behavior; it must not be reinterpreted as collection passport status.
- No public passport directory behavior exists; public passport access remains direct-link/QR style via `/api/public/dpp/:publicPassportId`.

### 2.4 No Commerce Behavior on Collection Surfaces (Current)

- No public checkout, cart, wishlist, order, or RFQ behavior exists on collection surfaces.
- No pricing, inventory, or buyer-intent capture exists on collection surfaces.
- No AI/vector recommendation output or Aggregator intelligence output is rendered on collection surfaces.
- No "drops" terminology appears on collection surfaces.

### 2.5 Confirmed Stop Conditions

All stop conditions from the unit instruction are clear:

- `STOP — required prior governance artifacts missing`: PASS. All required prior units are present.
- `STOP — repo truth contradicts stub/unavailable baseline`: PASS. Stub/unavailable confirmed.
- `STOP — product-scoped passport baseline contradicted`: PASS. Product-scoped confirmed.
- `STOP — collection-owned passport runtime unexpectedly exists`: PASS. No such runtime.
- `STOP — public checkout/cart/wishlist/order/RFQ behavior on collection surfaces`: PASS. No such behavior.
- `STOP — more than allowlisted file would need to change`: PASS. Only artifact created.
- `STOP — SEO governance cannot be completed without runtime implementation`: PASS. Governance is planning-only.

---

## 3. SEO Purpose

### 3.1 Primary SEO Purpose

The SEO purpose of D2C public collection surfaces is:

- **Public discovery of curated textile story and showcase content.** Collections are SEO-visible to help visitors find curated textile narratives, material stories, and supplier-context showcases by category, material, and segment taxonomy terms.
- **Safe public attraction.** The public collection surface is a low-friction discovery and attraction entry point. SEO must serve safe exploration rather than transactional conversion.
- **Taxonomy-aligned public education.** Metadata and copy may reference approved INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 vocabulary (segment, material, cluster, fiber) to support relevant search discovery without inventing unsupported factual claims.
- **Conditional trust context signaling.** Where evidence gates pass, public metadata may indicate that trust, origin, or certification context is available for eligible products — with bounded conditional language.

### 3.2 What Collection SEO Is Not

The SEO purpose of D2C public collection surfaces is explicitly NOT:

- Commerce or pricing discovery. No collection SEO surface should index price, availability, inventory state, or purchase opportunity.
- Checkout, cart, order, or RFQ entry. No collection metadata should signal transactional intent.
- Buyer-intent capture or sourcing signal. No collection SEO copy may imply platform-facilitated sourcing, buyer-supplier matching, or RFQ workflow.
- DPP / passport directory behavior. Collections must not appear as a public passport registry or trust certificate index.
- Ranking or recommendation surface. No collection SEO signals, structured data, or copy may imply ranked relevance, AI-curated recommendations, or Aggregator-scored ordering.
- Drop / launch event behavior. Collections must not be positioned as product drops, launch events, or commerce campaigns in SEO copy.
- Universal verification claims. Collections may not use language implying that all products, materials, or suppliers in the collection carry verified certification, DPP coverage, or traceability by default.

---

## 4. Metadata Field Governance

This section defines the governance rules for each metadata field. Implementation units must adhere to these rules.

### 4.1 Title Tag (`<title>`)

| Rule | Detail |
|---|---|
| Source | Collection title field (public-safe) or safe fallback |
| Format | `[Collection Title] — TexQtic Verified Textile Collections` |
| List page format | `Verified Textile Collections — TexQtic` |
| Fallback | `TexQtic Textile Collections` |
| Max length | 60–70 characters recommended |
| Forbidden content | Private IDs, internal IDs, org IDs, `drops`, pricing, inventory, certification universal claims |
| Gate requirement | Only use live collection title when collection has passed public eligibility gates |
| Unavailable state | `Collection Preview Unavailable — TexQtic` |

### 4.2 Meta Description (`<meta name="description">`)

| Rule | Detail |
|---|---|
| Source | Collection summary field (public-safe) or safe editorial fallback |
| List page template | `Explore curated textile story and showcase collections. [Taxonomy/material framing]. Public-safe trust context where available.` |
| Detail page template | `[Collection title]: [summary snippet]. Eligible products may include public trust context where available.` |
| Max length | 155–160 characters recommended |
| Forbidden content | Universal verification claims, `drops`, pricing, inventory, private IDs, certification absolute claims, RFQ/sourcing language |
| Gate requirement | Must follow claim classification model from D2C-ORIGIN-STORYTELLING-GOVERNANCE-001 |
| Unavailable state | Safe neutral fallback. Must not expose why a collection is unavailable. |

### 4.3 Canonical URL

| Rule | Detail |
|---|---|
| List page canonical | `https://[domain]/collections` |
| Detail page canonical | `https://[domain]/collections/[slug]` |
| Slug format | Lowercase, hyphenated, alphanumeric only. No private IDs. |
| Forbidden in canonical | Private IDs, internal IDs, org IDs, auth tokens, `returnTo`, `authRequired`, buyer intent params, RFQ params, inventory params |
| Duplicate slug behavior | Canonical must always point to the authoritative slug. No fallback canonical to product or passport context. |
| Unavailable state | Noindex directive required; canonical may still be set to the slug URL but noindex must accompany it |

### 4.4 Open Graph Title (`og:title`)

| Rule | Detail |
|---|---|
| List page | `Verified Textile Collections — TexQtic` |
| Detail page | `[Collection Title] — TexQtic Verified Textile Collections` |
| Fallback | `TexQtic Textile Collections` |
| Rules | Must follow all title tag governance rules above |

### 4.5 Open Graph Description (`og:description`)

| Rule | Detail |
|---|---|
| Source | Same as meta description with same governance rules |
| Additional constraint | Must never expose private data that would be revealed by OG preview scraping |

### 4.6 Open Graph Image (`og:image`)

| Rule | Detail |
|---|---|
| Source | Collection hero image (publication-approved only) |
| Fallback | TexQtic platform-level safe OG image fallback |
| Forbidden | Private supplier images not publication-approved, images with embedded text claiming universal certification or DPP coverage, images sourced from private/internal records |
| Alt attribute on OG image | Must follow alt text governance rules in Section 11 |
| Unavailable state | Platform-level fallback only; no collection-specific image for unavailable states |

### 4.7 Twitter/X Card Title

| Rule | Detail |
|---|---|
| Card type | `summary_large_image` preferred for detail pages; `summary` acceptable for list |
| Title | Same governance as `og:title` |

### 4.8 Twitter/X Card Description

| Rule | Detail |
|---|---|
| Source | Same as meta description with same governance rules |

### 4.9 Robots Meta Directive

| Rule | Detail |
|---|---|
| Default for published eligible collections | `index, follow` |
| Gate-failed / unavailable collections | `noindex, nofollow` |
| Staging / preview / development environments | `noindex, nofollow` |
| Empty state (no eligible collections) | `noindex, follow` for list page |
| See Section 12 | Full robots/noindex governance |

### 4.10 Breadcrumb Labels

| Rule | Detail |
|---|---|
| List page | `Home > Collections` |
| Detail page | `Home > Collections > [Collection Title]` |
| Forbidden | Private IDs, org IDs, internal path segments in breadcrumbs |
| Unavailable state | `Home > Collections > Preview Unavailable` — no slug disclosure of private data |

### 4.11 Safe Fallback Metadata

When a collection does not pass public eligibility gates, or when an error occurs during metadata generation, the system must emit safe fallback metadata:

- Title: `TexQtic Textile Collections`
- Description: `Explore curated textile story and showcase collections on TexQtic.`
- No collection-specific title, summary, or copy.
- `noindex` directive required for all gate-failed and unavailable states.
- No diagnostic, error, or internal state information in any fallback metadata.

---

## 5. List Page SEO Rules

These rules govern SEO behavior for `/collections`.

### 5.1 Title and Description

- Title must use the safe list page template from Section 4.1.
- Description must describe the list surface at a platform level without listing specific collection titles, product claims, or supplier names.
- Taxonomy-aligned language from INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 is permitted in the description where it reflects the actual list surface topic (e.g., "textile story and showcase collections").

### 5.2 Content Claim Rules

- No universal verification claims. The list page title and description must not assert that all collections are verified, certified, DPP-backed, or fully traceable.
- No "drops" terminology. "Collections" framing must be used throughout. "Drop," "launch event," "limited release," "campaign" language is forbidden.
- No commerce urgency. No "available now," "limited supply," "on sale," or similar urgency signals in list page metadata.
- No product or passport inheritance. The list page must not inherit title, description, or trust language from individual product passports, product summaries, or product certifications.
- No supplier or private-data claims. No specific supplier name, identity, or private contact should appear in list page SEO metadata.

### 5.3 Empty State Metadata

When no eligible collections exist or when the list surface is in stub/unavailable state:

- Use safe fallback metadata from Section 4.11.
- Apply `noindex` directive.
- Do not expose the reason for emptiness in metadata.
- Do not reference specific unpublished or gate-failed collection titles.

### 5.4 Collection Count or Quantity Claims

- Do not include collection count signals ("14 verified collections," "5 curated collections") in SEO metadata unless supported by live, publication-approved projection data.
- Quantity claims in structured data are forbidden in the current phase (see Section 8).

---

## 6. Detail Page SEO Rules

These rules govern SEO behavior for `/collections/:slug`.

### 6.1 Metadata Source Constraint

- All metadata for a detail page must be derived exclusively from public-safe, eligible, publication-approved collection fields.
- Metadata must not be derived from: private collection records, unpublished collection data, internal collection fields, product passport data at the collection level, supplier private records, or internal workflow status.

### 6.2 Title and Description

- Title must use the detail page template from Section 4.1, sourcing from the public-safe collection `title` field.
- Description must use the detail page template from Section 4.2, sourcing from the public-safe collection `summary` field.
- Both fields must follow all claim classification rules from D2C-ORIGIN-STORYTELLING-GOVERNANCE-001.

### 6.3 Unknown / Unpublished / Gate-Failed Slugs

- If a requested slug does not correspond to a published, public-eligible collection, the page MUST render with:
  - Safe unavailable metadata (Section 4.11).
  - `noindex, nofollow` robots directive.
  - No disclosure of why the collection is unavailable.
  - No disclosure of the private collection record associated with the slug (if any exists).
  - No disclosure of internal IDs, org IDs, or workflow status.
- The system must not reveal whether a collection exists but is unpublished, versus a slug that has never been registered. Fail-closed semantics apply.

### 6.4 Canonical URL for Detail Page

- Canonical URL must be `https://[domain]/collections/[slug]` with no query parameters.
- No private ID may be encoded in the slug or canonical URL.
- If a collection has multiple acceptable slugs (redirect scenarios), the canonical must always point to the authoritative slug.

### 6.5 Conditional Trust / Origin Metadata

- Where a collection passes evidence gates for trust, origin, or certification summary fields, metadata description MAY include bounded conditional trust language consistent with Section 7 and D2C-ORIGIN-STORYTELLING-GOVERNANCE-001 rules.
- Example: "Eligible products may include public trust context where available."
- Forbidden: "Fully verified collection," "DPP-backed collection," "certified supply chain," "all products in this collection are traceable."

---

## 7. SEO Claim Rules

### 7.1 Allowed SEO Claims

The following claim patterns are safe and permitted in collection SEO metadata and copy:

| Claim Type | Example Patterns |
|---|---|
| Curated story and showcase framing | "A curated textile story," "Curated showcase of [material/segment]," "A collection presenting [taxonomy term] textiles" |
| Bounded conditional trust | "Eligible products may include public trust context where available," "Public-safe trust context where available" |
| Approved taxonomy terms | Material tags, segment tags, cluster terms from INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 |
| Safe editorial description | "A curated selection of [material] textiles," "A showcase of [region/segment] textile traditions" |
| Authenticated continuation framing | "Continue after sign-in," "Authenticated context available," "Request access" |
| Safe discovery framing | "Explore curated collections," "Browse textile stories," "Discover [taxonomy-term] collections" |

### 7.2 Conditionally Allowed SEO Claims (Evidence Required)

The following claim patterns MAY appear in SEO metadata only when evidence gates pass and projection data confirms eligibility:

| Claim Type | Condition |
|---|---|
| Origin summary framing | Requires approved origin data in publication posture; bounded language only ("Origin context available for selected products where approved") |
| Certification reference | Requires valid, published certification record; named certification only, not universal claim ("Products in this collection may carry [certification name] certification where applicable") |
| Traceability reference | Requires approved traceability evidence state; bounded language only |
| Sustainability framing | Requires approved evidence; no bare assertions ("Sustainable sourcing context available where approved") |
| Artisan / craft framing | Requires approved editorial rationale; no unverified heritage assertions |
| Supplier-context reference | Requires supplier to pass all supplier publication and public-safe gates; bounded conditional language only |

### 7.3 Forbidden SEO Claims

The following claim patterns are absolutely forbidden in all collection SEO metadata, copy, and structured data:

| Forbidden Claim | Why Forbidden |
|---|---|
| "Verified collection" (universal) | Implies all products/materials/suppliers verified without evidence gate |
| "Certified collection" | Implies collection-level certification — no such concept in current phase |
| "Fully traceable collection" | Implies complete chain-of-custody — unsupported without traceability evidence gate per product |
| "Guaranteed origin" | Absolute origin claim — unsupported |
| "DPP-backed collection" | Collection-owned passport runtime is blocked in current phase |
| "Passported collection" | Same as above |
| "Product passport collection" | Product passports are product-scoped; must not be promoted to collection-level claim |
| "Drops," "drop," "limited drop" | Forbidden terminology across D2C family |
| "Buy," "order," "checkout," "add to cart" | No commerce behavior on collection surfaces |
| "Request a quote," "RFQ," "get pricing" | No RFQ/sourcing behavior on collection surfaces |
| "View pricing," "view inventory" | No pricing/inventory disclosure |
| "Best collections," "top-rated," "most popular" | Ranking/recommendation language — no ranked logic exists |
| "AI-curated," "machine-recommended," "smart collections" | AI/Aggregator intelligence language |
| "Limited stock," "available now," "on sale" | Commerce urgency |
| "All products are verified/certified/traceable" | Universal verification — unsupported |
| Internal failure reasons | Must not appear in metadata |
| Private IDs, org IDs, tenant IDs, internal tokens | Must never appear in any public metadata or URL |

---

## 8. Structured Data Governance

### 8.1 Current Phase Decision

In the current phase (stub/unavailable surface, no runtime collection projection), **no structured data may be emitted** on collection surfaces.

### 8.2 Permitted Future Structured Data (When Projection Is Authorized)

When public collection projection is authorized and implemented, the following structured data governance applies:

#### 8.2.1 What May Be Used

| Schema Type | Condition |
|---|---|
| `WebPage` or `CollectionPage` | Safe when collection passes public eligibility gates; only public-safe fields |
| `BreadcrumbList` | Safe for list and detail pages when real breadcrumb path is available |
| `Organization` | Safe for TexQtic attribution in structured data |
| `ImageObject` | Safe for publication-approved hero/gallery images only |

#### 8.2.2 What Must Not Be Used (Current Phase)

| Schema Type | Reason Forbidden |
|---|---|
| `Product` or `ProductGroup` on collection surface | Product schema on collection surfaces would imply product-level commerce semantics |
| `Offer` | No pricing or purchase behavior on collection surfaces |
| `AggregateRating` | No rating/ranking behavior |
| `ItemList` with product details | May imply commerce listing behavior |
| `Certification` | No collection-level certification exists in current phase |
| Any schema field carrying private IDs | Absolute prohibition |
| Any schema field carrying pricing/inventory | Absolute prohibition |
| `FAQPage` claiming certification/origin/traceability universally | Would create unsupported universal claims |

#### 8.2.3 What May Never Be Used Regardless of Phase

- Any structured data schema field that encodes private IDs, tenant IDs, org IDs, or internal database identifiers.
- Any schema field that implies pricing, inventory, purchase offers, or commerce availability.
- Any schema field that makes absolute certification, traceability, or origin claims not backed by evidence gates.
- Any schema field that discloses auth handoff state, returnTo parameters, buyer intent, or RFQ workflow.

#### 8.2.4 Fallback / Unavailable Page Structured Data

- Pages in unavailable or gate-failed state must NOT emit collection-specific structured data.
- If any structured data is emitted on unavailable pages, it must be scoped only to generic `WebPage` with platform-level attribution.
- No structured data should disclose the existence of a gate-failed or unpublished collection.

### 8.3 Commerce / Offer Schema Authorization Gate

- `Product`, `Offer`, `ItemList` with product schema, and related commerce-adjacent structured data is deferred indefinitely on D2C collection surfaces.
- Any future authorization of commerce schema on collection surfaces requires an explicit separate governance unit approved by Paresh.
- This unit does not authorize any commerce schema usage, even in conditional or future form.

---

## 9. Sitemap and Indexing Governance

### 9.1 Current Phase (No Sitemap Implementation)

- No sitemap exists for D2C collection surfaces in the current phase.
- No sitemap generation for `/collections` or `/collections/:slug` is authorized by this unit.
- This unit defines the governance rules that must govern sitemap inclusion when sitemap implementation is authorized.

### 9.2 List Page (`/collections`) Indexing Rules

- `/collections` may be included in the sitemap and set as indexable only when:
  - At least one public-eligible collection has passed all publication gates and is rendered in a live projection (not stub-only state).
  - SEO metadata implementation has been completed in accordance with this governance unit.
  - The implementation unit that wires up the live projection has been authorized and committed.
- While `/collections` remains stub-only, it should either be excluded from the sitemap or rendered with `noindex`.

### 9.3 Detail Page (`/collections/:slug`) Indexing Rules

Per-slug sitemap inclusion rules:

| Condition | Sitemap Inclusion | Indexing |
|---|---|---|
| Collection passes all public eligibility gates | Eligible for inclusion | `index, follow` |
| Collection is unpublished | Must be excluded | `noindex` |
| Collection is archived | Must be excluded | `noindex` |
| Collection fails evidence gate | Must be excluded | `noindex` |
| Collection slug is unknown/unregistered | Must be excluded | `noindex, nofollow` |
| Collection is in unavailable/error state | Must be excluded | `noindex, nofollow` |

- Sitemap generation must be driven by the same eligibility gates as the public projection, not by an independent database scan.
- Sitemap must never include slugs that resolve to the `PublicCollectionUnavailable` placeholder.

### 9.4 Passport Directory Prohibition

- Sitemap generation must not function as a public product passport directory.
- Collection-level sitemap entries must not imply or link to product passport records.
- No sitemap entry should expose product `publicPassportId` values, internal product IDs, or DPP token references.

### 9.5 Stale Slug Prevention

- When a collection is unpublished, archived, or gate-failed after having been previously published:
  - Its slug must be removed from the sitemap at the next generation cycle.
  - The URL should return a safe unavailable response with `noindex`.
  - No permanent redirect to an alternative collection page should be created without explicit authorization.

### 9.6 Sitemap Update Cadence

- Exact sitemap update cadence is deferred to the implementation unit (see Section 18).
- Governance requirement: sitemap must never include a slug in an ineligible state, regardless of update cadence lag.

---

## 10. Canonical URL Rules

### 10.1 List Page Canonical

- Canonical URL for the list page: `https://[domain]/collections`
- No query parameters in the canonical URL.
- No pagination state, filter state, or auth state in the canonical URL.

### 10.2 Detail Page Canonical

- Canonical URL for a detail page: `https://[domain]/collections/[slug]`
- The `[slug]` component must be:
  - Lowercase, hyphenated, URL-safe alphanumeric only.
  - Derived from the collection's approved public-safe slug field.
  - Not derived from internal IDs, database record IDs, org IDs, or tenant identifiers.
- No query parameters in the canonical URL.

### 10.3 Forbidden Query Parameters in Canonical

The following query parameters must NEVER appear in a canonical URL for collection surfaces:

| Parameter | Why Forbidden |
|---|---|
| `returnTo`, `return_to` | Auth handoff state — must not be indexed |
| `authRequired`, `auth_required` | Auth gate state |
| `intent`, `sourceSurface` | Auth continuation context |
| `orgId`, `org_id`, `tenantId` | Private tenant identifier |
| `productId`, `passportId`, `nodeId` | Private internal IDs |
| `rfqId`, `quoteId`, `orderId` | Private transaction identifiers |
| `token`, `access_token`, `jwt` | Auth tokens |
| `price`, `inventory`, `stock` | Commerce state |
| `filter`, `sort`, `q` | Session state (acceptable in nav links but not in canonical) |

### 10.4 No Canonical Fallback to Product / Passport Context

- A collection page canonical must never fall back to a product URL, product detail URL, or public passport URL.
- If a collection is unavailable, the canonical should remain on the collection slug path with a `noindex` directive — not redirected to a product page.

### 10.5 Slug Safety Rules

- Slug must be validated against a safe character set before use in any metadata or URL context.
- Slug must not encode the collection's internal database ID even in obfuscated form.
- Slug must not be derivable from private supplier identifiers or product identifiers.

---

## 11. Image and Alt Text SEO Rules

### 11.1 Hero Image Governance

| Rule | Detail |
|---|---|
| Source | Publication-approved collection hero image only |
| Forbidden sources | Private supplier images not publication-approved; internal product images not cleared for public use; images from private audit records |
| Fallback | Platform-level safe image fallback — no collection-specific images for unavailable states |
| File integrity | No image URL should encode private IDs or internal record references in the path or query parameters |

### 11.2 Open Graph Image Governance

| Rule | Detail |
|---|---|
| Source | Same as hero image; publication-approved only |
| Fallback | Platform-level safe OG fallback image |
| Forbidden | Images with embedded text claiming universal certification, DPP coverage, or verified collection status |
| Unavailable state | Platform-level fallback only; no collection-specific OG image for unavailable states |

### 11.3 Gallery Images (Detail Page)

| Rule | Detail |
|---|---|
| Source | Publication-approved gallery images from collection record only |
| Rendering | Only images cleared in publication gate may appear |
| Count | No minimum guarantee in SEO metadata; structured data must not claim gallery presence if gallery is empty |

### 11.4 Alt Text Rules

Alt text must follow all claim governance rules from Section 7 and D2C-ORIGIN-STORYTELLING-GOVERNANCE-001:

| Rule | Detail |
|---|---|
| Descriptive purpose | Describe what is depicted — material, textile type, craft context — without over-claiming |
| Forbidden alt text patterns | "Verified collection," "certified materials," "DPP-linked," "passport-backed," universal certification or traceability claims |
| Allowed alt text patterns | "Handwoven textile with [material] composition," "[Region/material] textile showcase," "Curated collection detail" |
| Private data prohibition | No supplier names, internal IDs, or private product identifiers in alt text |
| Fallback alt text | `"TexQtic textile collection"` for all fallback/placeholder images |
| Empty image prohibition | Alt text must never be empty on content images; `alt=""` only for decorative spacer images |

### 11.5 Supplier Image Attribution

- If a supplier image passes publication gate and is displayed, any attribution must use only publication-approved supplier label — not private supplier record name, internal ID, or contact detail.
- No supplier images from private or internal records may appear on public collection surfaces.

### 11.6 Image Metadata Safety

- No image file URL may encode private IDs, org IDs, or tenant identifiers in the path.
- Image `title` attributes must follow the same claim rules as alt text.

---

## 12. Robots and Noindex Rules

### 12.1 Default Behavior for Eligible Published Collections

- A collection detail page that has passed all public eligibility gates and is rendered in a live projection SHOULD receive `index, follow`.
- The list page `/collections` SHOULD receive `index, follow` when at least one eligible collection is live.

### 12.2 Required Noindex Conditions

The following conditions MUST result in `noindex, nofollow`:

| Condition | Scope |
|---|---|
| Collection fails public eligibility gate | Detail page |
| Collection is unpublished | Detail page |
| Collection is archived | Detail page |
| Unknown/unregistered slug | Detail page |
| Safe unavailable placeholder (`PublicCollectionUnavailable`) | Detail page |
| Empty state (no eligible collections) | List page |
| Stub-only state (current phase) | List page |
| Any error/diagnostic page | Both |
| Staging / preview / non-production environment | Both |

### 12.3 Unavailable Page Noindex Rationale

- Applying `noindex` to gate-failed and unavailable collection pages prevents:
  - Stale "not available" content becoming indexed.
  - Unavailable collection existence being confirmed by search engine crawls.
  - Empty or low-value placeholder pages consuming crawl budget.

### 12.4 Robots.txt Governance

- The global `robots.txt` should not be modified as part of collection SEO implementation without explicit authorization.
- Meta-level `noindex` per page is the primary enforcement mechanism for unavailable collection states.
- Any collection-specific path-level disallow in `robots.txt` requires a separate implementation unit.

### 12.5 Prevent Leak via Noindex

- A `noindex` directive must not itself leak information about why a collection is unavailable.
- The page response for an unavailable collection must be a safe HTTP 200 or 404 with `noindex` — not an error that references internal gate status.
- Recommended behavior: treat unknown/unregistered slugs as HTTP 404 with safe unavailable component and `noindex`.
- Gate-failed but known collections: safe unavailable component, HTTP 200, `noindex` — do not confirm or deny collection existence beyond what the safe placeholder communicates.

---

## 13. Relationship to Collection Projection Designs

### 13.1 PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001

This SEO governance unit constrains the future list projection implementation as follows:

- Every projection field used as a metadata source must be a public-safe field from the approved list projection shape (Section 4 of that unit).
- `title`, `summary`, `heroImage`, `categoryTags`, `materialTags`, `segmentTags`, and `curatedContextLabel` are the permitted metadata sources.
- `collectionHasTrustContext` and `trustLabel` may be used only for conditional trust copy in meta description — with bounded language.
- `listState.availability` and `listState.fallbackLabel` must drive noindex/fallback metadata behavior.
- No field from `authenticatedContinuationCta` may appear in metadata, canonical URLs, or structured data.
- `eligibleProductPreview` fields must not be used as metadata sources for product count claims.

### 13.2 PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001

This SEO governance unit constrains the future detail projection implementation as follows:

- Metadata must be derived from: `title`, `summary`, `storyBody` (for description composition), `heroImage`, `galleryImages`, `categoryTags`, `materialTags`, `segmentTags`, `collectionStoryType`, `curatedContextLabel`.
- `trustSummary`, `originSummary`, `traceabilitySummary`, `certificationSummary` may be used ONLY in bounded conditional meta description language when `present: true`.
- `detailState.availability` must drive noindex/fallback behavior for all gate-failed states.
- No field from `supplierContextSummary` may carry private supplier identity into metadata.
- `authenticatedContinuationCta` fields must never appear in canonical URLs, metadata, or structured data.
- `eligibleProductRefs` product-level signals must not be promoted to collection-level SEO claims.

### 13.3 Implementation Unit Constraint

Any implementation unit that wires up collection SEO/metadata behavior must:

- Declare adherence to this governance unit by referencing D2C-COLLECTION-SEO-GOVERNANCE-001.
- List which projection fields are being used as metadata sources.
- Confirm all claim, noindex, canonical, and structured-data rules from this unit are respected.

---

## 14. Relationship to Origin / Storytelling Governance

### 14.1 SEO Copy Is Governed by D2C-ORIGIN-STORYTELLING-GOVERNANCE-001

All SEO metadata copy — including title tags, meta descriptions, Open Graph descriptions, Twitter card descriptions, alt text, breadcrumb labels, and any structured data text fields — is subject to the claim classification model defined in D2C-ORIGIN-STORYTELLING-GOVERNANCE-001.

The following cross-references apply:

| SEO Field | Governing Claim Class |
|---|---|
| Title tag | "Always Allowed — Public-Safe Editorial Language" |
| Meta description | "Always Allowed" + "Conditionally Allowed — Evidence Required" only when evidence gates pass |
| OG description | Same as meta description |
| Alt text | "Always Allowed" only — no evidence-gated claims in alt text |
| Breadcrumb labels | "Always Allowed" only |
| Structured data text | Same rules as meta description |

### 14.2 Canonical Trust Phrase

The canonical trust wording from D2C-ORIGIN-STORYTELLING-GOVERNANCE-001 must be used verbatim or in approved variation:

**Canonical:** "Eligible products may include public trust context where available."

No SEO copy may substitute a stronger claim (e.g., "products include verified trust context") for this canonical phrase.

### 14.3 Forbidden Language Cross-Reference

All claim patterns listed in Section 5.5 (Forbidden claim patterns) of D2C-ORIGIN-STORYTELLING-GOVERNANCE-001 are also forbidden in SEO metadata. This includes:

- Universal verification claims.
- Collection-owned DPP/passport claims.
- Ranking, recommendation, score language.
- Commerce urgency.
- "Drops" terminology.
- AI/vector/Aggregator output language.

---

## 15. Relationship to Auth Handoff Governance

### 15.1 SEO Metadata Must Not Encode Auth Handoff State

D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001 defines the CTA metadata model for authenticated continuation. This governance unit reaffirms:

- `returnTo`, `authRequired`, `intent`, `sourceSurface`, and all other auth handoff parameters must NEVER appear in:
  - Canonical URLs.
  - Meta description or title copy.
  - Open Graph metadata.
  - Structured data fields.
  - Sitemap entries.
  - Robots meta content.

### 15.2 No CTA Semantics in Indexable Metadata

- The auth continuation CTA label (e.g., "Continue after sign-in," "Request access") MUST NOT appear in `<title>`, `<meta name="description">`, or Open Graph/Twitter card metadata.
- CTA labels are UI-only. They must not be indexed, as they would imply transactional intent to search engines and mislead crawlers about the nature of the page.

### 15.3 No Post-Auth Commerce Implication in SEO Copy

- No SEO copy may imply that authenticating will unlock commerce, checkout, pricing, inventory, RFQ, or order functionality on a collection surface.
- Allowed post-auth implication in SEO copy: "authenticated context," "authenticated continuation," "access more context after sign-in."
- Forbidden post-auth implication: "shop after sign-in," "order after login," "get pricing by logging in."

### 15.4 Target Resolution (Implementation Note)

D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001 documents the gap between the conceptual `target: "/auth"` CTA field and the actual modal-based `openSecondaryAuthenticatedEntry('TENANT')` mechanism. This gap is recorded and deferred. SEO metadata must never expose a `/auth` path as a canonical or indexable URL — it is a programmatic concept target, not a navigable URL.

---

## 16. Relationship to DPP / Passport Governance

### 16.1 Product Passport Remains Product-Scoped

- COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001 establishes that product passport behavior remains product-scoped in the current phase.
- Collection SEO metadata must not imply that a collection carries a DPP, has a collection-level public passport token, or is indexable as a passport directory entry.
- The `publicPassportId` and `hasPassport` fields from product-level projection must not be promoted into collection-level title, description, structured data, or sitemap entries.

### 16.2 Forbidden Passport / DPP SEO Patterns

| Forbidden Pattern | Reason |
|---|---|
| "DPP-backed collection" in title/description | Collection-owned passport runtime blocked in current phase |
| "Passported products collection" as generic claim | Product passport presence per product is conditional and bounded |
| Structured data schema referencing DPP/passport at collection level | No collection-level passport schema exists |
| Sitemap entry framed as passport directory | No public passport directory behavior authorized |
| Alt text claiming DPP coverage for collection image | Unsupported universal claim |

### 16.3 Public Passport Access Pattern

- Public passport access remains: direct-link / QR code style → `/api/public/dpp/:publicPassportId` (product-scoped, token-based).
- No collection SEO surface should reference or link to this endpoint in indexable metadata.
- No SEO implementation should create a pattern that would serve collection pages as a browsable passport directory.

### 16.4 Conditional DPP Language in SEO

- Bounded conditional language referencing product-level passport availability is permitted in meta description when evidence gates pass:
  - Allowed: "Eligible products in this collection may include public digital product passport context where available."
  - Forbidden: "All products include DPP," "Collection is passport-verified," "DPP-certified collection."

---

## 17. Public / Private Boundary

The following data categories must NEVER appear in any SEO metadata, canonical URL, Open Graph property, Twitter card, structured data field, alt text, breadcrumb label, sitemap entry, or robots directive for D2C collection surfaces:

### 17.1 Identifier Categories

| Forbidden Data | Examples |
|---|---|
| Private internal collection IDs | Database UUIDs, record IDs |
| Org / tenant identifiers | `org_id`, `tenantId`, `orgId` |
| Internal publication workflow IDs | Stage IDs, gate record IDs |
| Supplier private record IDs | Internal supplier database IDs |
| Product internal IDs | Database-level product record IDs |
| Node / evidence IDs | `node_id`, evidence record IDs |
| Public passport token values | `public_token`, `publicPassportId` (as raw values) |
| Auth tokens / JWTs / session tokens | Any form of authentication token |

### 17.2 Commerce and Transaction Data

| Forbidden Data | Examples |
|---|---|
| Pricing | Unit price, bulk price, contract price |
| Inventory / stock levels | Available quantity, lead time, stock status |
| Order state | Order IDs, order status, line items |
| RFQ / quote state | RFQ IDs, quote values, negotiation terms |
| Buyer intent signals | Wishlist flags, interest scores, buyer history |
| Negotiation state | Counter-offers, negotiation stage |

### 17.3 Private Workflow and Intelligence Data

| Forbidden Data | Examples |
|---|---|
| Internal publication failure reasons | Gate failure messages, missing field alerts |
| Private workflow status | Internal publication stage names |
| Ranking / scoring / recommendation outputs | Relevance scores, affinity rankings, match scores |
| AI / vector search outputs | Embedding distances, semantic search scores |
| Aggregator intelligence outputs | Cross-org matching scores, sourcing recommendations |
| Private audit records | Certification document links, audit report IDs |
| Private supplier contact information | Email, phone, address not publication-approved |

### 17.4 Auth and Continuation Context

| Forbidden Data | Examples |
|---|---|
| Auth handoff parameters | `returnTo`, `authRequired`, `intent`, `sourceSurface` |
| Post-auth continuation payloads | Workflow step context, private continuation data |
| Auth state signals | Login/logout state indicators |

---

## 18. Deferred Decisions

The following implementation-level decisions are explicitly deferred to future units:

| # | Deferred Item | Classification |
|---|---|---|
| 1 | Exact metadata implementation location (e.g., helmet/head manager library, server-side rendering, static meta tags) | Implementation-ready when projection is authorized |
| 2 | Exact sitemap generation implementation (static file, dynamic route, build-step generation) | Implementation-ready when live projection is authorized |
| 3 | Exact structured-data type selection for collection list and detail pages (`CollectionPage`, `WebPage`, or other) | Design-gated pending projection authorization |
| 4 | Exact `noindex` policy implementation mechanism (component-level, route-level, server-side header) | Implementation-ready when projection is authorized |
| 5 | Exact Open Graph image fallback strategy (platform fallback image URL, CDN path, placeholder service) | Implementation-ready when image management is established |
| 6 | Exact SEO copy templates and approved copy variants for collection title/description patterns | Design-gated — requires copy review and approval by Paresh |
| 7 | Exact slug canonicalization behavior (redirect rules, slug versioning, canonical update on rename) | Design-gated pending collection model finalization |
| 8 | Exact collection indexing rollout gate (criteria for when `/collections` transitions from `noindex` stub to `index`) | Decision-gated — requires explicit approval from Paresh |
| 9 | Exact `robots.txt` path-level policy for collection routes | Implementation-ready when live projection is authorized |
| 10 | Future Product/Offer schema on collection surfaces if any commerce behavior is ever authorized | Decision-gated — requires explicit separate governance unit |
| 11 | `hreflang` and international/multi-locale SEO behavior | Decision-gated — out of scope for current phase |
| 12 | Breadcrumb structured data type (`BreadcrumbList`) implementation details | Implementation-ready when projection is authorized |
| 13 | OG image dimension and format requirements | Implementation-ready when image management is established |
| 14 | Exact HTTP status code response for unknown slugs (404 vs. 200 with noindex) | Implementation-ready; recommendation in Section 12.5 (404 preferred for unknown slugs) |

---

## 19. Acceptance Criteria

This governance artifact is complete and accepted if all of the following are true:

### 19.1 Scope and Coverage

- [ ] Metadata rules are defined for all required fields (title, description, canonical, OG, Twitter, robots, breadcrumb, fallback).
- [ ] List page SEO rules are defined.
- [ ] Detail page SEO rules are defined.
- [ ] SEO claim rules are explicit — allowed, conditional, and forbidden categories are enumerated.
- [ ] Structured-data governance is defined — current phase prohibition and future constraints are specified.
- [ ] Sitemap and indexing governance is defined.
- [ ] Canonical URL rules are defined — slug safety, forbidden query parameters, no product/passport fallback.
- [ ] Image and alt text SEO rules are defined.
- [ ] Robots and noindex rules are defined.

### 19.2 Governance Relationships

- [ ] Relationship to PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001 is explicitly defined.
- [ ] Relationship to PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001 is explicitly defined.
- [ ] Relationship to D2C-ORIGIN-STORYTELLING-GOVERNANCE-001 is explicitly defined.
- [ ] Relationship to D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001 is explicitly defined.
- [ ] Relationship to COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001 / DPP passport governance is explicitly defined.

### 19.3 Boundary Enforcement

- [ ] Public/private boundary is explicitly enumerated — all forbidden SEO/metadata/sitemap/structured-data exposure categories are listed.
- [ ] No private IDs, org IDs, auth tokens, commerce data, or internal workflow state may appear in any public metadata surface.

### 19.4 No Runtime Changes

- [ ] No runtime code has been created or modified.
- [ ] No schema changes have been made.
- [ ] No migration files have been created.
- [ ] No API routes have been modified.
- [ ] No OpenAPI contracts have been modified.
- [ ] No UI components have been modified.
- [ ] No SEO metadata has been implemented.
- [ ] No sitemap has been generated.
- [ ] No structured data has been injected.
- [ ] Only `D2C-COLLECTION-SEO-GOVERNANCE-001.md` was created.

### 19.5 Consistency with Prior Governance

- [ ] All claim rules are consistent with D2C-ORIGIN-STORYTELLING-GOVERNANCE-001.
- [ ] All auth handoff rules are consistent with D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001.
- [ ] All passport/DPP rules are consistent with COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001.
- [ ] No "drops" terminology appears anywhere in this artifact.
- [ ] No universal verification claims appear anywhere in this artifact.
- [ ] No commerce/checkout/RFQ/pricing/inventory metadata claims appear in this artifact.

---

*D2C-COLLECTION-SEO-GOVERNANCE-001 — D2C Collection SEO Governance*
*TexQtic governance corpus — main branch*
*Last updated: 2026-05-18*
