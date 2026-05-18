# TexQtic B2C Family Repo Truth Design Plan and Tracker

## 1. Status Summary

- Why B2C is now a dedicated family:
  - B2C public browse and product detail are no longer incidental UI surfaces; they are a distinct public attraction family with their own trust, taxonomy, SEO, inquiry, and D2C boundary dependencies.
  - B2C now requires an explicit governance tracker to prevent drift across category storytelling, product detail claims, trust/passport language, and future handoff paths.
- Relationship to Public Attraction Layer:
  - B2C is a public attraction and discovery surface, not a full anonymous commerce or private workflow surface.
  - B2C must route visitors into authenticated continuity when deeper workflows are needed.
- Relationship to Industry and Cluster taxonomy:
  - B2C must reuse approved taxonomy vocabulary and claim rules from INDUSTRY-CLUSTER-TAXONOMY-DECISION-001.
  - B2C must not invent category, cluster, origin, trust, or certification claims independently.
- Relationship to DPP and Trust:
  - Passport and trust signals are availability-based only.
  - Public passport linking is conditional on publicPassportId presence.
- Relationship to Inquiry:
  - B2C can support context handoff later, but schema-governed inquiry expansion is not yet finalized.
- Relationship to SEO:
  - Current route-level title and static page SEO are limited; scalable metadata, canonical, and sitemap strategy remains pending.
- Relationship to D2C:
  - D2C public collections public-surface slice is now production-verified and closed (2026-05-18). TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 governs the D2C family. D2C post-auth continuation remains deferred.
  - B2C and D2C must stay separate; collection semantics are designed but B2C-D2C-BOUNDARY-DECISION-001 remains pending.
- Current baseline status:
  - B2C public browse baseline: previously verified and closed.
  - Public product detail and preview baseline: previously verified and closed.

## 2. Current Repo Truth

### B2C public routes and states in App.tsx
- App state includes PUBLIC_B2C_BROWSE, PUBLIC_PRODUCT_DETAIL, PUBLIC_COLLECTIONS, PUBLIC_COLLECTION_DETAIL_UNAVAILABLE, PUBLIC_PASSPORT.
- Path handling includes:
  - /product/:slug -> PUBLIC_PRODUCT_DETAIL
  - /collections and /collections/:slug -> PUBLIC_COLLECTIONS or PUBLIC_COLLECTION_DETAIL_UNAVAILABLE
  - /passport/:id -> PUBLIC_PASSPORT
- Runtime state switch renders:
  - B2CBrowsePage for PUBLIC_B2C_BROWSE
  - PublicProductDetail for PUBLIC_PRODUCT_DETAIL
  - PublicCollectionsStub and PublicCollectionUnavailable for collection surfaces

### B2C browse component and behavior
- Component: components/Public/B2CBrowse.tsx
- Behavior:
  - Calls getPublicB2CProducts from services/publicB2CService.ts
  - Builds a flattened product grid from storefront entries and productsPreview arrays
  - Supports search and static category chip filtering
  - Shows safe loading, error, and no-result states
  - Product cards route to /product/:slug
  - Provides sign-in handoff and return/back navigation
- Displayed browse fields include:
  - Product slug, name, image, price, moq
  - Category, material, fabricType
  - Supplier name, supplier slug, jurisdiction

### Product detail and preview component and behavior
- Component: components/Public/PublicProductDetail.tsx
- Behavior:
  - Calls getPublicB2CProductBySlug for slug-based product detail
  - Returns safe unavailable state for missing or non-public products
  - Displays public-safe snapshot, story, textile context, supplier context, trust signals
  - Passport link shown only when hasPassport is true and publicPassportId exists
  - Provides sign-in handoff and browse continuity

### Public B2C frontend service and client
- Service: services/publicB2CService.ts
- Endpoints used:
  - GET /api/public/b2c/products
  - GET /api/public/b2c/products/:slug
- Frontend contracts include:
  - Browse entry and product preview shape
  - Product detail shape with category, material, fabricType, trustSignals, hasTraceabilityEvidence, hasPassport, optional publicPassportId

### Public B2C backend route and API behavior
- Route file: server/src/routes/public.ts
- Exposed B2C endpoints:
  - GET /api/public/b2c/products
  - GET /api/public/b2c/products/:slug
- Behavior:
  - No auth required
  - Invalid params handled via validation errors
  - Missing or non-public product returns safe 404

### Public B2C projection service fields
- Service: server/src/services/publicB2CProjection.service.ts
- Enforces five projection safety gates:
  - Gate A tenant posture eligible
  - Gate B organization publication posture in B2C_PUBLIC or BOTH
  - Gate C org_type B2C
  - Gate D status ACTIVE or VERIFICATION_APPROVED
  - Gate E strict public-safe fields only
- Browse projection includes public-safe:
  - storefront identity: slug, legalName, orgType, jurisdiction
  - products preview: slug, name, moq, nullable price, nullable image, nullable category, nullable material, nullable fabricType
- Detail projection includes public-safe:
  - category, material, fabricType, summary, description, imageUrls
  - publicSupplierName, publicSupplierSlug
  - publicPriceLabel, publicMoqLabel, publicStatusLabel
  - trustSignals, hasTraceabilityEvidence, hasPassport, optional publicPassportId
  - relatedProducts

### OpenAPI public B2C contract status
- Contract file: shared/contracts/openapi.tenant.json
- Explicitly documents:
  - /api/public/b2c/products
  - /api/public/b2c/products/{slug}
- Contract includes trust and passport fields:
  - trustSignals array
  - hasPassport boolean
  - publicPassportId nullable, public token only when hasPassport true

### Product category, material, and fabricType fields in schema
- Schema file: server/prisma/schema.prisma
- CatalogItem includes:
  - productCategory
  - material
  - fabricType
- These align with B2C projection fields used in browse/detail surfaces.

### Trust and passport fields and conditional publicPassportId behavior
- Detail projection sets hasPassport true and publicPassportId only when published public passport token exists.
- Product detail UI links to /passport/:publicPassportId only when both hasPassport and publicPassportId are present.
- No universal passport claim in current flow.

### Evidence of cart, checkout, wishlist, and order exposure on public pages
- Public product detail copy references authenticated continuation for checkout and deeper workflows.
- No public cart or wishlist implementation is present on B2C public browse/detail surfaces in this unit scope.
- Schema contains cart and order models, but those models represent private/authenticated commerce continuity and are not public attraction implementation evidence.

### Relationship to collections and D2C surfaces
- D2C public collections surfaces are now production-verified (closed 2026-05-18).
- `/collections` renders 5 approved public-safe collection cards from `config/publicCollectionsProjection.ts` (static config, no backend API).
- `/collections/:slug` renders `PublicCollectionDetail` for 5 approved slugs; unknown slugs render `PublicCollectionUnavailable`.
- Stage 1 SEO metadata is implemented for all three collection states via `utils/publicPageMeta.ts` (`applyPublicPageMeta`).
- Phase 1 trust/DPP conditional copy is implemented with `trustContextMode: 'CONDITIONAL_PRODUCT_CONTEXT_ONLY'` and `collectionHasTrustContext: false` (fail-closed).
- CTA metadata is formalized; auth trigger opens TENANT modal in-place.
- Post-auth D2C continuation is deferred to the D2C-AUTHENTICATED-COLLECTION-CONTINUATION family.
- Current D2C implementation does not establish B2C product or category semantics; the families remain separate.

## 3. Current B2C Capabilities

- Public product browse:
  - List and search product previews from public-safe B2C projection.
- Public product detail:
  - Slug-based detail page with safe unavailable fallback.
- Product card fields:
  - Name, image, optional price, category, material, fabricType, supplier context.
- Supplier attribution:
  - publicSupplierName and publicSupplierSlug exposed in detail context.
- Category/material/fabricType display:
  - Present in browse filters and detail tags/story context.
- Trust/passport conditionality:
  - hasPassport and optional publicPassportId are availability-based.
- Browse to detail continuity:
  - Product cards route to /product/:slug and detail supports back to browse.
- Invalid product safe unavailable behavior:
  - Not found/non-public slug shows non-destructive unavailable page and sign-in path.
- Neighbor public surfaces:
  - /trust, /industries, /aggregator, /collections, /passport/:id are discoverable adjacent surfaces.

## 4. Current Gaps

- No canonical B2C family tracker existed before this unit.
- Category storytelling pages are not yet governed as a dedicated B2C implementation stream.
- B2C SEO metadata and sitemap strategy are not mature for scalable category/product storytelling expansion.
- Inquiry context handoff from product/category/material is not fully schema-governed yet.
- DPP/passport linkage is conditional and data-limited; not universal.
- D2C family tracker (TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001) is now created and governs the D2C family. D2C public collections public-surface slice is production-verified and closed.
- D2C post-auth continuation (D2C-AUTHENTICATED-COLLECTION-CONTINUATION family) remains deferred and does not affect B2C sequencing.
- No public cart/checkout/wishlist/order flows should be added without separate bounded decisions and implementation units.

## 5. Public and Private Boundary

### Allowed public
- Product slug, product name, and public-safe image data.
- Public-safe category, material, and fabricType context.
- Public supplier name, supplier slug, and jurisdiction context.
- Public-safe trust/passport availability language where available.
- Public-safe product preview and storytelling copy.
- Inquiry handoff context only after approved schema-governed expansion.

### Forbidden public
- Private tenant/org/user/internal IDs.
- Private supplier records and documents.
- Private pricing and inventory unless explicitly approved in public projection policy and implementation.
- Buyer intent and RFQ private payloads.
- Private contact details.
- Rankings, scores, recommendations.
- AI or vector output exposure.
- Aggregator intelligence.
- Unsupported origin, cluster, category, trust, or certification claims.
- Universal DPP/passport coverage claims.
- Public checkout/cart/wishlist/order flow implementation on attraction pages in this unit.

## 6. Industry and Cluster Taxonomy Dependency

B2C must reuse INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 as governing authority.

- Approved category terms:
  - B2C category storytelling must use approved taxonomy terms and approved expansions only.
- Approved material and fabric terms:
  - B2C material/fabric language must map to approved terms and existing projection fields.
- Approved role and segment terms:
  - Any supplier-role or value-chain language shown in B2C context must align with approved role and segment vocabulary.
- Evidence-gated claims:
  - Specific origin, cluster, certification, sustainability, and capability claims require explicit evidence backing.
- Forbidden claims:
  - Unsupported and private claim categories remain prohibited.
- Where available language:
  - Trust/passport text must remain conditional and availability-based.

Also:
- B2C must not invent cluster/origin/category claims.
- B2C category pages must wait for approved static config or approved projection-backed design.
- B2C SEO expansion must align with taxonomy and future SEO foundation.

## 7. DPP and Trust Dependency

- Product passport links are conditional only.
- hasPassport, publicPassportId, and trustSignals must be treated as availability-based fields.
- No universal DPP/passport/trust coverage claims are allowed.
- DPP/trust linkage in B2C should align with future DPP trust linking governance units.

## 8. D2C Relationship

- B2C and D2C are related but distinct families.
- D2C public collections public-surface slice is now production-verified and closed (2026-05-18). This corrects all prior stale references to D2C collections as stub-only.
- TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 is created and governs the D2C family.
- D2C post-auth continuation (D2C-AUTHENTICATED-COLLECTION-CONTINUATION family) remains deferred; that deferral does not affect B2C planning.
- B2C must not implement D2C collection semantics.
- B2C product detail and category context may inform D2C planning, but B2C must not define collection object semantics.

## 9. SEO Relationship

- Current B2C SEO support is limited relative to scalable category/story expansion.
- B2C category and product SEO expansion depends on SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 and taxonomy-aligned route strategy.
- B2C category pages should not be implemented before SEO and taxonomy route strategy are clear.

## 10. Inquiry and Intent Capture Relationship

- B2C can eventually pass product/category/material context into inquiry flows.
- Inquiry context expansion must be schema-governed and bounded.
- B2C inquiry handoff must avoid over-capturing buyer intent.
- Public surfaces must not expose private inquiry contents.

## 11. Recommended B2C Implementation Queue

### 1) B2C-PUBLIC-BROWSE-BASELINE-SYNC-001
- Purpose:
  - Reconfirm and lock current browse baseline against taxonomy and boundary decisions.
- Repo truth:
  - Browse baseline exists and is verified.
- Readiness:
  - COMPLETED — 2026-05-18
- Commit:
  - [TEXQTIC] governance: sync B2C public browse baseline (see section 17)
- Dependencies:
  - INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
- Likely files:
  - components/Public/B2CBrowse.tsx
  - services/publicB2CService.ts
  - governance decision references
- Verification plan:
  - Browse route and rendering continuity
  - Field exposure review against boundary
- Relationship to Industry and D2C:
  - Industry taxonomy dependent; D2C independent

### 2) B2C-PRODUCT-DETAIL-BASELINE-SYNC-001
- Purpose:
  - Reconfirm product detail baseline and safe unavailable behavior.
- Repo truth:
  - Product detail baseline exists and is verified.
- Readiness:
  - COMPLETED — 2026-05-18 (see section 18)
- Commit:
  - [TEXQTIC] governance: sync B2C product detail baseline
- Dependencies:
  - INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
- Likely files:
  - components/Public/PublicProductDetail.tsx
  - services/publicB2CService.ts
- Relationship to Industry and D2C:
  - Industry taxonomy dependent; informs D2C later

### 3) B2C-CATEGORY-TAXONOMY-ALIGNMENT-001
- Purpose:
  - Align all B2C category and material vocabulary to approved taxonomy.
- Repo truth:
  - Partial category cards and tags exist but no dedicated alignment unit completed.
- Readiness:
  - COMPLETED — 2026-05-18
- Dependencies:
  - INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
- Likely files:
  - components/Public/B2CBrowse.tsx
  - components/Public/PublicProductDetail.tsx
  - future static config surfaces
- Verification plan:
  - Vocabulary cross-check with taxonomy decision
  - Evidence-gated claim scan
- Suggested commit message:
  - [TEXQTIC] public: align b2c category vocabulary to taxonomy
- Relationship to Industry and D2C:
  - Strong Industry dependency; precondition for B2C story pages and D2C boundary clarity

### 4) B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001
- Purpose:
  - Design category storytelling IA, boundaries, and claim patterns.
- Repo truth:
  - No dedicated category story page design artifact yet.
- Readiness:
  - DESIGN_GATED
- Dependencies:
  - B2C-CATEGORY-TAXONOMY-ALIGNMENT-001
  - SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 foundation
- Likely files:
  - governance/units and docs product truth artifacts
- Verification plan:
  - Design completeness
  - Boundary and evidence-gate compliance
- Suggested commit message:
  - [TEXQTIC] governance: design b2c public category story pages
- Relationship to Industry and D2C:
  - Industry taxonomy dependent; informs D2C narrative boundaries

### 5) B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001
- Purpose:
  - Implement approved category story pages with bounded public-safe claims.
- Repo truth:
  - Not implemented.
- Readiness:
  - BLOCKED_ON_DESIGN_AND_SEO
- Dependencies:
  - B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001
  - SEO-SITEMAP-METADATA-STRUCTURED-DATA-001
  - Industry taxonomy and static config alignment
- Likely files:
  - App.tsx
  - components/Public/*
  - optional constants or config files
- Verification plan:
  - Route and rendering checks
  - Claim-boundary and evidence-gate checks
- Suggested commit message:
  - [TEXQTIC] public: implement b2c category story pages
- Relationship to Industry and D2C:
  - Industry and SEO dependent; must not implement D2C semantics

### 6) B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001
- Purpose:
  - Design bounded inquiry handoff from B2C product/category context.
- Repo truth:
  - Inquiry endpoint exists but B2C context carriage is not fully governed.
- Readiness:
  - DESIGN_GATED
- Dependencies:
  - INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001
  - Taxonomy dependency and boundary rules
- Likely files:
  - governance artifacts
  - docs product truth
- Verification plan:
  - Context schema safety and non-overcapture
- Suggested commit message:
  - [TEXQTIC] governance: design b2c inquiry handoff
- Relationship to Industry and D2C:
  - Industry taxonomy dependent; D2C adjacent

### 7) B2C-PUBLIC-INQUIRY-HANDOFF-IMPLEMENTATION-001
- Purpose:
  - Implement approved B2C inquiry handoff with bounded context fields.
- Repo truth:
  - Not implemented.
- Readiness:
  - BLOCKED_ON_INQUIRY_DESIGN
- Dependencies:
  - B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001
  - inquiry schema governance approval
- Likely files:
  - components/Public/*
  - server/src/routes/public.ts
  - shared/contracts/openapi.tenant.json
- Verification plan:
  - request validation and boundary checks
  - no private inquiry payload leakage
- Suggested commit message:
  - [TEXQTIC] public: implement b2c inquiry handoff context
- Relationship to Industry and D2C:
  - Industry taxonomy and inquiry decision dependent; D2C neutral

### 8) B2C-DPP-PASSPORT-LINKAGE-SYNC-001
- Purpose:
  - Synchronize B2C trust and passport language and behavior with conditional data truth.
- Repo truth:
  - Conditional hasPassport/publicPassportId is implemented.
- Readiness:
  - COMPLETED — 2026-05-18
- Dependencies:
  - DPP trust governance decisions
  - taxonomy claim rules
- Likely files:
  - components/Public/PublicProductDetail.tsx
  - server/src/services/publicB2CProjection.service.ts
  - governance decisions
- Verification plan:
  - conditional rendering and copy qualification checks
  - no universal coverage claims
- Suggested commit message:
  - [TEXQTIC] public: sync b2c dpp passport linkage rules
- Relationship to Industry and D2C:
  - Industry and trust dependent; D2C informative

### 9) B2C-SEO-METADATA-EXPANSION-DESIGN-001
- Purpose:
  - Design B2C route-level SEO metadata model and ownership.
- Repo truth:
  - SEO support limited for scalable expansion.
- Readiness:
  - DESIGN_GATED
- Dependencies:
  - SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 foundation
  - taxonomy route strategy decisions
- Likely files:
  - governance and docs artifacts
- Verification plan:
  - metadata matrix and route ownership completeness
- Suggested commit message:
  - [TEXQTIC] governance: design b2c seo metadata expansion
- Relationship to Industry and D2C:
  - Industry taxonomy and SEO dependent; D2C adjacent

### 10) B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001
- Purpose:
  - Implement approved B2C SEO metadata expansion.
- Repo truth:
  - Not implemented.
- Readiness:
  - BLOCKED_ON_SEO_DESIGN
- Dependencies:
  - B2C-SEO-METADATA-EXPANSION-DESIGN-001
  - SEO-SITEMAP-METADATA-STRUCTURED-DATA-001
- Likely files:
  - App.tsx
  - index.html
  - vercel.json
  - SEO utility surfaces
- Verification plan:
  - route metadata checks
  - canonical and sitemap validation
- Suggested commit message:
  - [TEXQTIC] public: implement b2c seo metadata expansion
- Relationship to Industry and D2C:
  - Industry taxonomy and SEO dependent; D2C neutral

### 11) B2C-PRODUCTION-SMOKE-MATRIX-001
- Purpose:
  - Establish recurring production smoke checklist for B2C public surfaces.
- Repo truth:
  - Baselines verified, but no dedicated B2C smoke matrix governance artifact.
- Readiness:
  - READY_FOR_GOVERNANCE_ARTIFACT
- Dependencies:
  - browse/detail sync units
- Likely files:
  - docs/governance
  - governance/units
- Verification plan:
  - matrix completeness across browse/detail/passport/unavailable states
- Suggested commit message:
  - [TEXQTIC] governance: define b2c production smoke matrix
- Relationship to Industry and D2C:
  - Industry and trust adjacent; D2C neutral

### 12) B2C-D2C-BOUNDARY-DECISION-001
- Purpose:
  - Formalize B2C and D2C boundary, including collections semantics ownership.
- Repo truth:
  - D2C collections data model designed (D2C-COLLECTIONS-DATA-MODEL-DESIGN-001 closed). D2C public-surface slice production-verified. Explicit B2C-vs-D2C boundary governance decision remains pending.
- Readiness:
  - DECISION_GATED
- Dependencies:
  - TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001
- Likely files:
  - governance/decisions/*
  - governance/units/*
- Verification plan:
  - decision completeness and non-overlap enforcement
- Suggested commit message:
  - [TEXQTIC] governance: define b2c d2c boundary decision
- Relationship to Industry and D2C:
  - Critical D2C dependency; Industry taxonomy informs claim boundaries

## 12. Recommended Sequencing

Immediate sequence:
- Create B2C tracker (this unit).
- Run baseline sync units:
  - B2C-PUBLIC-BROWSE-BASELINE-SYNC-001
  - B2C-PRODUCT-DETAIL-BASELINE-SYNC-001
- Run taxonomy alignment:
  - B2C-CATEGORY-TAXONOMY-ALIGNMENT-001

Dependency sequence:
- SEO foundation dependency:
  - SEO-SITEMAP-METADATA-STRUCTURED-DATA-001
  - then B2C-SEO-METADATA-EXPANSION-DESIGN-001
- Inquiry design dependency:
  - INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001
  - then B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001

Parallel and boundary sequence:
- Run B2C-DPP-PASSPORT-LINKAGE-SYNC-001 after taxonomy alignment and trust dependency review.
- Run B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001 before any category story implementation.
- Run B2C-D2C-BOUNDARY-DECISION-001 before any D2C runtime collection work.

## 13. B2C and D2C Carry-Forward

- B2C is product and category discovery.
- D2C is collection/story/early-access family. TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 is now created and governs the D2C family.
- Do not implement D2C collection semantics in B2C units.
- D2C public collections public-surface slice is production-verified. D2C post-auth continuation remains deferred.

## 14. Future Governance Sync Targets

Potential sync targets after acceptance of this tracker:
- docs/product-truth/*
- docs/governance/*
- governance/decisions/*
- governance/units/*
- governance/units/TEXQTIC-INDUSTRY-CLUSTER-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md
- governance/decisions/INDUSTRY-CLUSTER-TAXONOMY-DECISION-001.md
- future DPP and trust tracker artifacts if introduced
- TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 (already created; D2C public-surface slice closed 2026-05-18)

## 15. Acceptance Criteria

This tracker is complete only if:
- current B2C repo truth is summarized
- current B2C capabilities are summarized
- B2C gaps are listed
- public/private boundaries are explicit
- Industry taxonomy dependency is explicit
- DPP/trust dependency is explicit
- D2C boundary is explicit
- SEO and inquiry dependencies are explicit
- implementation queue exists with readiness and dependencies
- no runtime implementation is included

Status for this unit:
- complete and ready for governance use as canonical B2C family tracker.

## 16. Next Recommended Units

Preferred next sequence (updated 2026-05-18 after B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001 closure):
1. B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001 (DESIGN_COMPLETE — design artifact ready; implementation blocked until design accepted)
2. SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 or B2C-SEO-METADATA-EXPANSION-DESIGN-001 depending on governance sequencing
3. PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001 or B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001 depending on inquiry sequencing decision

Completed and no longer in queue:
- TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 — CLOSED (D2C public-surface slice production-verified 2026-05-18)
- B2C-PUBLIC-BROWSE-BASELINE-SYNC-001 — COMPLETED 2026-05-18 (see section 17)
- B2C-PRODUCT-DETAIL-BASELINE-SYNC-001 — COMPLETED 2026-05-18 (see section 18)
- B2C-CATEGORY-TAXONOMY-ALIGNMENT-001 — COMPLETED 2026-05-18 (see section 19)
- B2C-DPP-PASSPORT-LINKAGE-SYNC-001 — COMPLETED 2026-05-18 (see section 20)
- B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001 — DESIGN_COMPLETE 2026-05-18 (see section 21)

## Governance Notes

- Planning and tracker only; no runtime changes.
- No schema, API, OpenAPI, projection, migration, or data changes are included in this unit.
- This document is the canonical B2C family repo-truth tracker and phased implementation queue anchor.

---

## 17. B2C Public Browse Baseline Sync — 2026-05-18

**Unit ID:** B2C-PUBLIC-BROWSE-BASELINE-SYNC-001
**Date:** 2026-05-18
**Status:** COMPLETED
**Authorized by:** Paresh
**Commit:** [TEXQTIC] governance: sync B2C public browse baseline (hash: TBD — see git log)

### 17.1 Repo-Truth Inspection Summary

Files inspected:
- `PUBLIC-FACING-PAGES-SEQUENCE-DECISION-001.md` — confirmed Option E decided: complete B2C public family first.
- `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` — this file; stale D2C references corrected in this sync.
- `governance/units/TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` — confirmed section 17 shows D2C public-surface slice production-verified and closed.
- `App.tsx` — confirmed `PUBLIC_B2C_BROWSE` → `B2CBrowsePage`, `PUBLIC_PRODUCT_DETAIL` → `PublicProductDetail`, and all D2C collection states are present and production-wired.
- `components/Public/B2CBrowse.tsx` — confirmed browse component, `getPublicB2CProducts` call, flattenStorefronts, search/filter, product card routing to `/product/:slug`.
- `components/Public/PublicProductDetail.tsx` — confirmed `getPublicB2CProductBySlug`, safe unavailable state, conditional `hasPassport`/`publicPassportId` passport link.
- `services/publicB2CService.ts` — confirmed endpoint shape for `GET /api/public/b2c/products` and `GET /api/public/b2c/products/:slug`; no private fields.
- `server/src/services/publicB2CProjection.service.ts` — confirmed five projection safety gates (A–E); prohibited fields listed; allowed payload categories match boundary decision.
- `shared/contracts/openapi.tenant.json` — confirmed `/api/public/b2c/products` and `/api/public/b2c/products/{slug}` are documented.
- `utils/publicPageMeta.ts` — confirmed Stage 1 scope is D2C collection surfaces only; B2C surfaces do not yet have equivalent SEO metadata expansion.
- `config/publicIndustryClusterTaxonomy.ts` — confirmed INDUSTRY_SEGMENTS, PRODUCT_CATEGORIES, MATERIAL_TYPES, CLUSTER_LABELS, and ClaimSafety types are present and usable for B2C taxonomy alignment.
- No B2C category story page components found. None implemented.
- No B2C inquiry handoff implementation found. None implemented.
- No B2C SEO metadata expansion beyond page-level defaults found. Not implemented.
- No authenticated B2C continuation unexpectedly implemented.
- No public/private boundary violations found on B2C public surfaces.

### 17.2 Current B2C Browse Status

| Surface | App State | Component | Status |
|---|---|---|---|
| B2C Browse (`/products` state-backed) | `PUBLIC_B2C_BROWSE` | `B2CBrowse.tsx` | IMPLEMENTED — production-verified baseline |
| Public Product Detail (`/product/:slug`) | `PUBLIC_PRODUCT_DETAIL` | `PublicProductDetail.tsx` | IMPLEMENTED — production-verified baseline |

**Browse behavior confirmed:**
- Calls `getPublicB2CProducts()` from `services/publicB2CService.ts`.
- Flattens storefronts to product grid; supports text search and static category chip filtering.
- Category chips: `Garments`, `Home Textiles`, `Technical Textiles`, `Fabrics` (static, not yet taxonomy-aligned).
- Product cards route to `/product/:slug`.
- Safe loading, error, and no-result states present.
- Sign-in handoff and back navigation present.
- No private fields, org IDs, or tenant IDs on browse surface.

**Product detail behavior confirmed:**
- `getPublicB2CProductBySlug(slug)` called; safe unavailable state for missing/non-public products.
- Passport link rendered only when `hasPassport === true` AND `publicPassportId` is present (conditional — fail-safe).
- `trustSignals` array rendered without universal coverage claims.
- No checkout, cart, wishlist, or order elements on public detail surface.

### 17.3 Backend Projection Status

- **Five gates confirmed** (Gate A–E) in `server/src/services/publicB2CProjection.service.ts`.
- **Browse projection** returns: `slug`, `legalName`, `orgType`, `jurisdiction`, `publicationPosture`, `eligibilityPosture`, `productsPreview` (each with `slug`, `name`, `moq`, `price?`, `imageUrl?`, `category?`, `material?`, `fabricType?`).
- **Detail projection** returns: `category`, `material`, `fabricType`, `summary`, `description`, `imageUrls`, `publicSupplierName`, `publicSupplierSlug`, `publicPriceLabel`, `publicMoqLabel`, `publicStatusLabel`, `trustSignals`, `hasTraceabilityEvidence`, `hasPassport`, `publicPassportId?`, `relatedProducts`.
- **Confirmed prohibited**: org UUIDs, risk_score, plan, registration_no, external_orchestration_ref, admin/governance fields, negotiation state, order/trade state, draft/unpublished data.

### 17.4 Public/Private Boundary Confirmation

**CONFIRMED CLEAN.** No violations found in current B2C public browse or product detail surfaces.

| Boundary | Status |
|---|---|
| Product slug and name | PUBLIC SAFE |
| Public-safe category, material, fabricType | PUBLIC SAFE — present in both browse and detail |
| Supplier name and slug | PUBLIC SAFE — `publicSupplierName`, `publicSupplierSlug` only |
| Jurisdiction (country-level only) | PUBLIC SAFE |
| Conditional trust/passport language | PUBLIC SAFE — availability-based, fail-closed |
| org_id / internal org UUID | NOT PRESENT on public surfaces |
| Internal supplier/user IDs | NOT PRESENT |
| Private inventory or pricing beyond `publicPriceLabel` | NOT PRESENT |
| RFQ/order/cart/wishlist/checkout | NOT PRESENT |
| Buyer intent capture | NOT PRESENT |
| Unsupported DPP/passport claims | NOT PRESENT |
| AI/vector/ranking claims | NOT PRESENT |

### 17.5 D2C State Correction

The following stale references in this tracker have been corrected in this sync unit:

| Location | Old (stale) | Corrected |
|---|---|---|
| Section 2 — Relationship to collections and D2C stubs | "Public collections routes and components exist as stub and unavailable surfaces" | D2C public collections are production-verified (closed 2026-05-18); 5 approved collection cards on `/collections`; `PublicCollectionDetail` on approved slugs |
| Section 4 — Current Gaps | "Collections remain stub-only and are not a defined D2C object model yet" | D2C public-surface slice is production-verified; D2C family tracker exists; post-auth continuation deferred only |
| Section 8 — D2C Relationship | "D2C collections remain stub-only under current repo truth" / "D2C family tracker must be created separately" | D2C public-surface slice production-verified; family tracker created; post-auth continuation deferred |
| Section 13 — B2C and D2C Carry-Forward | "D2C is collection/story/early-access family and needs its own tracker" | D2C family tracker exists |
| Section 14 — Future Governance Sync Targets | Listed as future artifact | Updated to reflect it exists |
| Section 16 — Next Recommended Units | Listed TEXQTIC-D2C-FAMILY as #1 next unit | Removed from active queue; marked closed; updated queue reflects current B2C sequencing |

### 17.6 Next-Unit Recommendation

**Primary next unit at time of section 17 authoring:** `B2C-PRODUCT-DETAIL-BASELINE-SYNC-001` — NOW COMPLETED (see section 18).

**Current next unit (after section 18 closure):** `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001`
- Precondition for all B2C category story page work.
- `config/publicIndustryClusterTaxonomy.ts` is confirmed present; vocabulary is available.
- Category chips in `B2CBrowse.tsx` (`Garments`, `Home Textiles`, `Technical Textiles`, `Fabrics`) are not yet formally aligned to `INDUSTRY_SEGMENTS` or `PRODUCT_CATEGORIES` in `publicIndustryClusterTaxonomy.ts`. This alignment is the subject of `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001`.

### 17.7 Deferred Items

| Item | Status | Gate |
|---|---|---|
| B2C category story pages | NOT IMPLEMENTED | DESIGN_GATED — requires `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` first |
| B2C SEO metadata expansion | NOT IMPLEMENTED | DESIGN_GATED — requires SEO foundation and taxonomy alignment |
| B2C inquiry handoff | NOT IMPLEMENTED | DESIGN_GATED — requires category/story context definition |
| D2C post-auth continuation | DEFERRED | Separate family (D2C-AUTHENTICATED-COLLECTION-CONTINUATION) |
| JSON-LD / structured data | NOT IMPLEMENTED | Deferred per `PUBLIC-SEO-INFRASTRUCTURE-DECISION-001` |
| B2C authenticated continuation | NOT IMPLEMENTED | Separate authenticated family; must not bleed into public surfaces |

### 17.8 Adjacent Findings

**Finding 1: B2C category chip vocabulary not yet formally aligned to taxonomy**
- Title: B2C browse category chips use display strings not mapped to `publicIndustryClusterTaxonomy.ts`
- Rationale: `CATEGORY_CARDS` in `B2CBrowse.tsx` uses values `['Garments', 'Home Textiles', 'Technical Textiles', 'Fabrics']`; `INDUSTRY_SEGMENTS` in taxonomy config uses `['Yarn & Spinning', 'Fabrics', 'Garments', 'Home Textiles', 'Technical Textiles', 'Textile Services']` and `PRODUCT_CATEGORIES` uses different granularity. The mapping is not formalized.
- Minimum file surface: `components/Public/B2CBrowse.tsx`, `config/publicIndustryClusterTaxonomy.ts`
- Classification: implementation-ready pending taxonomy alignment decision
- Blocks this unit: NO — alignment is the subject of `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001`, not this sync

**Finding 2: `utils/publicPageMeta.ts` scope is D2C-only; B2C browse/detail have no equivalent SEO metadata utility**
- Title: No SEO metadata utility or `applyPublicPageMeta` calls on B2C public browse or product detail routes
- Rationale: `publicPageMeta.ts` is scoped to D2C collection surfaces only (Stage 1). B2C browse (`PUBLIC_B2C_BROWSE`) and product detail (`PUBLIC_PRODUCT_DETAIL`) do not call `applyPublicPageMeta`. This gap is known and design-gated.
- Minimum file surface: `utils/publicPageMeta.ts`, `App.tsx`
- Classification: design-gated — subject of `B2C-SEO-METADATA-EXPANSION-DESIGN-001`
- Blocks this unit: NO

**Finding 3: No dedicated B2C projection tests found**
- Title: `publicB2CProjection.service.ts` has no dedicated unit test file in `/tests/`
- Rationale: Search of `/tests/**` found only `b2c-shell-authenticated-affordance-separation.test.tsx` (not a projection test). Five-gate projection correctness is not covered by dedicated tests under current repo truth.
- Minimum file surface: new test file for `server/src/services/publicB2CProjection.service.ts`
- Classification: verification-gated
- Blocks this unit: NO — baseline sync does not require new test authoring

### 17.9 Validation Evidence

- `git diff --name-only` before this sync: **empty (clean working tree)**
- `git status --short` before this sync: **empty (clean working tree)**
- No runtime code modified. This is a documentation-only governance sync.
- No package scripts required; no runtime validation applicable.
- Governance lint/check script: not present in this repo. No runtime validation was required because this is documentation-only.

### 17.10 Commit Reference

- **Commit message:** `[TEXQTIC] governance: sync B2C public browse baseline`
- **Commit hash:** b40c2b9

---

## 18. B2C Product Detail Baseline Sync — 2026-05-18

**Unit ID:** B2C-PRODUCT-DETAIL-BASELINE-SYNC-001
**Date:** 2026-05-18
**Status:** COMPLETED
**Authorized by:** Paresh
**Commit:** [TEXQTIC] governance: sync B2C product detail baseline (hash: see 18.10)

### 18.1 Repo-Truth Inspection Summary

Files inspected (read-only):
- `PUBLIC-FACING-PAGES-SEQUENCE-DECISION-001.md` — confirmed Option E decision in force; B2C public family is current active family.
- `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` — section 17 browse sync confirmed COMPLETED at b40c2b9; section 17.10 hash corrected to b40c2b9 in this sync.
- `governance/units/TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` — section 17 D2C public-surface slice confirmed COMPLETED; no new D2C changes.
- `App.tsx` — confirmed `PUBLIC_PRODUCT_DETAIL` → `PublicProductDetail` for `/product/:slug`; no unexpected B2C authenticated continuation found.
- `components/Public/PublicProductDetail.tsx` — full inspection confirmed; see 18.2.
- `services/publicB2CService.ts` — confirmed `getPublicB2CProductBySlug(slug)` calls `GET /api/public/b2c/products/:slug`; proper 404 handling; response shape matches `PublicB2CProductDetail` type.
- `server/src/routes/public.ts` — confirmed `/b2c/products/:slug` endpoint; slug regex validation (`/^[a-z0-9-]+(?:--[a-z0-9-]+)?$/`); returns 400 on invalid slug, 404 on not-found; no auth required.
- `server/src/services/publicB2CProjection.service.ts` — confirmed `getPublicB2CProductBySlug` function; five-gate projection; passport fail-closed; field allowlist; see 18.4.
- `shared/contracts/openapi.tenant.json` — confirmed `/api/public/b2c/products/{slug}` documented with trust and passport fields.
- `utils/publicPageMeta.ts` — confirmed Stage 1 scope is D2C collection surfaces only; `PUBLIC_PRODUCT_DETAIL` and `PUBLIC_B2C_BROWSE` are NOT covered.
- `config/publicIndustryClusterTaxonomy.ts` — confirmed present; `PRODUCT_CATEGORIES`, `MATERIAL_TYPES`, `INDUSTRY_SEGMENTS`, `CLUSTER_LABELS` all defined. Vocabulary available for B2C taxonomy alignment unit.
- `tests/` — no dedicated unit tests for `PublicProductDetail`, `getPublicB2CProductBySlug`, safe unavailable behavior, conditional passport link, or `publicB2CProjection.service.ts` detail function found.
- No B2C category story page components found. Not implemented.
- No B2C inquiry handoff implementation found. Not implemented.
- No B2C SEO metadata expansion found for product detail. Not implemented.
- No unexpected authenticated B2C continuation found on public product detail surface.
- No public/private boundary violations found.

### 18.2 Product Detail Component Status

| Dimension | Status | Detail |
|---|---|---|
| App state | IMPLEMENTED | `PUBLIC_PRODUCT_DETAIL` in App.tsx |
| Route | IMPLEMENTED | `/product/:slug` |
| Component | IMPLEMENTED | `components/Public/PublicProductDetail.tsx` |
| Frontend service | IMPLEMENTED | `services/publicB2CService.ts` → `getPublicB2CProductBySlug(slug)` |
| Backend projection | IMPLEMENTED | `server/src/services/publicB2CProjection.service.ts` → `getPublicB2CProductBySlug` |
| OpenAPI contract | DOCUMENTED | `shared/contracts/openapi.tenant.json` |
| Loading state | IMPLEMENTED | Spinner with "Loading product preview..." text; non-destructive |
| Safe unavailable | IMPLEMENTED | `!product \|\| notFound` renders non-destructive unavailable page (see 18.3) |
| Public-safe fields | IMPLEMENTED | Strict public field allowlist enforced (see 18.4 and 18.5) |
| Conditional passport link | IMPLEMENTED | Dual condition: `hasPassport && publicPassportId` (see 18.6) |
| Trust signals | IMPLEMENTED | `trustSignals[]` array; conditional `hasPassport` badge; availability-based copy |
| Related products | IMPLEMENTED | Up to 4 related products from same storefront; rendered as `RelatedProductCard` |
| Supplier attribution | IMPLEMENTED | `publicSupplierName` and `publicSupplierSlug`; optional supplier profile CTA |
| Sign-in handoff | IMPLEMENTED | Authenticated continuation panel with sign-in button; "List Your Products" external CTA |
| Product tags | IMPLEMENTED | `category`, `material`, `fabricType`, and `tags[]` rendered as pill badges (up to 6) |
| Back to browse | IMPLEMENTED | `onBackToBrowse` prop wired to back button in hero and unavailable state |

### 18.3 Safe Unavailable Behavior Confirmation

**CONFIRMED SAFE.**

- **Empty slug guard:** `useEffect` on `[slug]` — if `!slug`, immediately sets `notFound: true`, `loading: false`. Component never calls backend with empty slug.
- **404 path:** `getPublicB2CProductBySlug` throws `{ status: 404 }` on HTTP 404. Component catches it, sets `notFound: true`.
- **Other error path:** Non-404 HTTP errors throw `{ status: N }`. Component catches all errors, sets `loading: false`, `notFound` only for 404. For other errors, `product` remains null, triggering the unavailable render.
- **Unavailable UI:** Non-destructive card with "This public product preview is not available." message, plus "Back to Product Browse" and "Sign in to Continue" CTAs. No error details leaked.
- **Cleanup:** `useEffect` returns cancellation function; `cancelled = true` on unmount prevents state updates after navigation.
- **Backend:** `getPublicB2CProductBySlug` in projection service returns `null` if any gate fails, org not found, or item slug doesn't match. Route handler returns HTTP 404 for null result. No gate-detail leakage.

### 18.4 Backend Projection Field Confirmation

**Five gates confirmed in `publicB2CProjection.service.ts`:**

| Gate | Condition | Enforcement |
|---|---|---|
| Gate A | `tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'` | Post-query filter in detail function |
| Gate B | `org.publication_posture IN ('B2C_PUBLIC', 'BOTH')` | DB `where` clause |
| Gate C | `org.org_type === 'B2C'` | DB `where` clause |
| Gate D | `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')` | DB `where` clause |
| Gate E | Strict public-safe field select only | Prisma `select` — no `id`, no `sku`, no `composition`, no `catalogStage`, no risk/admin fields |

**Allowed payload fields in detail response:**
- `slug`, `name`, `category`, `material`, `fabricType`, `summary`, `description`
- `imageUrls[]`, `publicSupplierName`, `publicSupplierSlug`
- `publicPriceLabel`, `publicMoqLabel`, `publicStatusLabel`
- `trustSignals[]`, `hasTraceabilityEvidence`, `hasPassport`
- `publicPassportId` — only if `hasPassport === true` AND `public_token` is non-null (spread with `...(publicPassportId && { publicPassportId })`)
- `tags[]` (derived from `productCategory`, `material`, `fabricType`)
- `relatedProducts[]` — up to 4 items; each with `slug`, `name`, `imageUrl`, `price`, `category` only

**Confirmed absent from detail response:**
- `org.id` — used internally only; never in output
- `tenantId`, `catalogItem.id` — selected internally only; never in output
- `risk_score`, `plan`, `registration_no`, `external_orchestration_ref` — not selected
- Private pricing beyond `publicPriceLabel`; private inventory; RFQ/order state

### 18.5 Passport Query Fail-Closed Confirmation

Backend query:
```
dpp_passport_states.findMany({ where: { org_id: org.id, status: 'PUBLISHED', public_token: { not: null } } })
```
- `hasPassport` defaults to `false`.
- `publicPassportId` defaults to `undefined`.
- Only set to truthy if: `passportRows.length > 0` AND `passportRows[0].public_token` is truthy.
- Output spread: `...(publicPassportId && { publicPassportId })` — field only present when truthy.
- **If no published passport with non-null public_token exists → `hasPassport: false`, no `publicPassportId` field.** Fail-closed confirmed.

### 18.6 Conditional Passport Link UI Confirmation

From `components/Public/PublicProductDetail.tsx`:

```tsx
{/* Trust badge — hasPassport only */}
{product.hasPassport === true ? (
  <span>Public passport available</span>
) : null}

{/* Passport link — BOTH hasPassport AND publicPassportId required */}
{product.hasPassport && product.publicPassportId ? (
  <a href={`/passport/${product.publicPassportId}`}>
    View Trust & Origin Passport
  </a>
) : null}
```

**Confirmed:**
- Trust badge shown when `hasPassport === true` only.
- Passport link rendered when `hasPassport && publicPassportId` — both must be truthy.
- No link if `hasPassport` is false or `publicPassportId` is absent/undefined.
- Passport URL uses `publicPassportId` (public token only — never internal UUID).
- No universal DPP/passport claim; no unverified trust language.

### 18.7 Public/Private Boundary Confirmation

**CONFIRMED CLEAN.** No violations found on B2C public product detail surface.

| Boundary | Status |
|---|---|
| Product slug and name | PUBLIC SAFE |
| Category, material, fabricType, tags | PUBLIC SAFE — nullable; from projection only |
| Summary, description | PUBLIC SAFE — from catalog item `description` only |
| Image URLs | PUBLIC SAFE — `imageUrls[]` from projection |
| Public supplier name and slug | PUBLIC SAFE — `publicSupplierName`, `publicSupplierSlug` only |
| Public price label | PUBLIC SAFE — `publicPriceLabel` (nullable string label) |
| Public MOQ label | PUBLIC SAFE — `publicMoqLabel` (nullable string label) |
| Public status label | PUBLIC SAFE — hardcoded `'Publicly discoverable'` |
| Trust signals array | PUBLIC SAFE — availability-based; no unverified claims |
| Conditional passport link | PUBLIC SAFE — fail-closed; `hasPassport && publicPassportId` required |
| Related products | PUBLIC SAFE — same projection gates; max 4; minimal fields only |
| org_id / internal org UUID | NOT PRESENT on detail response or component |
| Internal catalog item ID | NOT PRESENT in response |
| Private supplier records | NOT PRESENT |
| Private pricing / inventory | NOT PRESENT |
| RFQ / order / cart / wishlist / checkout | NOT PRESENT |
| Buyer intent capture | NOT PRESENT |
| Auth state leakage | NOT PRESENT — only public unauthenticated sign-in CTA |
| Universal DPP/passport claims | NOT PRESENT — fail-closed conditional only |
| AI / vector / ranking claims | NOT PRESENT |

### 18.8 Category/Material/Fabric Taxonomy Status

**Current state:** Product detail renders `category`, `material`, `fabricType`, and `tags` from raw backend projection values. These are CatalogItem field strings — not aligned to vocabulary in `config/publicIndustryClusterTaxonomy.ts`.

**`PRODUCT_CATEGORIES` in taxonomy config:** `['Yarn products', 'Fabric products', 'Finished garments', 'Home textile products', 'Technical textile products', 'Textile services']`

**`MATERIAL_TYPES` in taxonomy config:** `['Cotton', 'Polyester', 'Wool', 'Blended materials', 'Silk', 'Linen', 'Synthetic fibers', 'Natural fibers']`

**Assessment:** B2C product detail display of category/material/fabric strings is passthrough from raw catalog data. Formal vocabulary alignment to taxonomy config is not implemented on the detail surface.

**Gate:** `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` governs this alignment. Must not be implemented before that unit closes.

### 18.9 Not-Implemented Confirmations (Design-Gated)

| Item | Status | Gate |
|---|---|---|
| B2C category story pages | NOT IMPLEMENTED | DESIGN_GATED — awaits `B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001` after `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` |
| B2C SEO metadata for product detail | NOT IMPLEMENTED | DESIGN_GATED — `utils/publicPageMeta.ts` scope is D2C-only; `PUBLIC_PRODUCT_DETAIL` not covered |
| B2C inquiry handoff | NOT IMPLEMENTED | DESIGN_GATED — awaits category/story context and `B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001` |
| B2C authenticated continuation | NOT IMPLEMENTED | Separate authenticated family; only sign-in CTA present |
| JSON-LD / structured data | NOT IMPLEMENTED | Deferred per `PUBLIC-SEO-INFRASTRUCTURE-DECISION-001` |

### 18.10 Next-Unit Recommendation

**Recommended next unit:** `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001`

Rationale:
- Both B2C browse and product detail baseline syncs are now complete.
- Category and material vocabulary on both surfaces uses raw catalog data strings not formally aligned to `config/publicIndustryClusterTaxonomy.ts`.
- `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` is the enabling governance gate for all B2C category story page design, B2C SEO metadata expansion, and B2C inquiry context definition.
- The taxonomy config file is present and stable. The taxonomy decision (`INDUSTRY-CLUSTER-TAXONOMY-DECISION-001`) must be reviewed for current status before proceeding.
- No runtime changes are required to start `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` if it is a governance/alignment unit.

### 18.11 Adjacent Findings

**Finding 1: No dedicated unit tests for product detail surface**
- Title: `PublicProductDetail` component, `getPublicB2CProductBySlug`, safe unavailable behavior, and conditional passport link have no dedicated unit tests
- Rationale: Search of `/tests/**` found only `b2c-shell-authenticated-affordance-separation.test.tsx` (B2CShell test, not product detail). No test covers: slug-based detail fetch, 404 → unavailable render, `hasPassport`/`publicPassportId` conditional link, or backend projection detail gate enforcement.
- Minimum file surface: new test file, likely `tests/b2c-public-product-detail.test.tsx` and/or `server/src/tests/publicB2CProjection.detail.test.ts`
- Classification: verification-gated
- Blocks this unit: NO

**Finding 2: Product detail tags use raw CatalogItem strings; no taxonomy-aligned vocabulary**
- Title: `category`, `material`, `fabricType`, and `tags[]` on detail surface are raw backend strings; not formally aligned to `publicIndustryClusterTaxonomy.ts`
- Rationale: Detail component renders tag pills directly from `product.category`, `product.material`, `product.fabricType`, and `product.tags[]`. No reference to `PRODUCT_CATEGORIES` or `MATERIAL_TYPES` from taxonomy config. Alignment gap is known and design-gated.
- Minimum file surface: `components/Public/PublicProductDetail.tsx`, `config/publicIndustryClusterTaxonomy.ts`
- Classification: design-gated — subject of `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001`
- Blocks this unit: NO

**Finding 3: `publicPageMeta.ts` has no B2C product detail SEO coverage**
- Title: `PUBLIC_PRODUCT_DETAIL` state is not covered by `utils/publicPageMeta.ts`; no per-product title/description/canonical/OG metadata
- Rationale: Stage 1 scope of `publicPageMeta.ts` is explicitly limited to D2C collection surfaces (`PUBLIC_COLLECTIONS`, `PUBLIC_COLLECTION_DETAIL`, `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE`). B2C product detail gets no dynamic SEO head metadata.
- Minimum file surface: `utils/publicPageMeta.ts`, `App.tsx`
- Classification: design-gated — subject of `B2C-SEO-METADATA-EXPANSION-DESIGN-001`
- Blocks this unit: NO

### 18.12 Validation Evidence

- `git status --short` before edits: **empty (clean working tree)**
- `git diff --name-only` before edits: **empty (clean working tree)**
- No runtime code was modified. This is a documentation-only governance sync.
- No package scripts required; no runtime validation applicable.
- Governance lint/check script: not present in this repo.

### 18.13 Commit Reference

- **Commit message:** `[TEXQTIC] governance: sync B2C product detail baseline`
- **Commit hash:** 487582b

---

## 19. B2C Category Taxonomy Alignment — 2026-05-18

**Unit ID:** B2C-CATEGORY-TAXONOMY-ALIGNMENT-001
**Date:** 2026-05-18
**Status:** COMPLETED
**Authorized by:** Paresh
**Commit:** [TEXQTIC] public: align B2C category taxonomy (hash: TBD — see git log)

### 19.1 Objective

Replace hardcoded B2C browse category chip vocabulary in `B2CBrowse.tsx` with terms formally sourced from `config/publicIndustryClusterTaxonomy.ts` (`INDUSTRY_SEGMENTS`, `PUBLIC_SAFE`). No backend, schema, OpenAPI, projection, migration, or D2C changes.

### 19.2 Scope

**Runtime allowlist (Modify):**
- `components/Public/B2CBrowse.tsx`

**Governance allowlist (Modify):**
- `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md`

**Read-only context:**
- `config/publicIndustryClusterTaxonomy.ts`
- `governance/decisions/INDUSTRY-CLUSTER-TAXONOMY-DECISION-001.md`
- `components/Public/PublicProductDetail.tsx`
- `services/publicB2CService.ts`
- `server/src/services/publicB2CProjection.service.ts`

### 19.3 Root Cause / Gap Identified

`B2CBrowse.tsx` defined a module-level `CATEGORY_CARDS` constant with hardcoded string literals: `Garments`, `Home Textiles`, `Technical Textiles`, `Fabrics`. These strings were not imported from nor formally referenced to `config/publicIndustryClusterTaxonomy.ts`. All four values are present in `INDUSTRY_SEGMENTS` (PUBLIC_SAFE). The taxonomy config classifies `INDUSTRY_SEGMENTS` as the authoritative layer for B2B segment alignment and its terms exactly match the chip values in use.

### 19.4 Decision: INDUSTRY_SEGMENTS as Browse Filter Source

The taxonomy config maps two relevant layers:
- `INDUSTRY_SEGMENTS`: authority is `organizations.primary_segment_key`; layer is B2B segment-level; status is `PUBLIC_SAFE`. Contains `Garments`, `Home Textiles`, `Technical Textiles`, `Fabrics` exactly matching current chip values.
- `PRODUCT_CATEGORIES`: authority is `CatalogItem.productCategory`; layer is B2C product-level; status is `PUBLIC_SAFE`. Contains verbose terms (`Finished garments`, `Home textile products`, etc.) that do NOT match current chip filter values and whose DB alignment cannot be verified without live schema inspection.

**Decision:** Chip filter values are aligned to `INDUSTRY_SEGMENTS` terms (exact match, no filter behavior change). Using `PRODUCT_CATEGORIES` terms as chip values would likely break filtering (DB values unknown). `INDUSTRY_SEGMENTS` alignment is PUBLIC_SAFE and formally correct for the surface presented.

Product detail tag rendering (`category`, `material`, `fabricType` passthrough) is NOT changed. Detail tags are raw projection strings; taxonomy normalization of detail tags is design-gated pending `B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001` and further DB truth verification.

### 19.5 Files Changed

| File | Change |
|---|---|
| `components/Public/B2CBrowse.tsx` | Import `type IndustrySegment` from taxonomy; replace hardcoded `CATEGORY_CARDS` constant with `B2C_BROWSE_CHIP_ICONS` + `B2C_CATEGORY_FILTER_VALUES` + derived `CATEGORY_CARDS` |
| `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | Section 11 item 3 readiness → COMPLETED; Section 16 queue updated; Section 19 appended |

### 19.6 Changes Made in B2CBrowse.tsx

**Before:**
```tsx
const CATEGORY_CARDS: { label: string; value: string; icon: string }[] = [
  { label: 'Garments', value: 'Garments', icon: '...' },
  { label: 'Home Textiles', value: 'Home Textiles', icon: '...' },
  { label: 'Technical Textiles', value: 'Technical Textiles', icon: '...' },
  { label: 'Fabrics', value: 'Fabrics', icon: '...' },
];
```

**After:**
```tsx
import { type IndustrySegment } from '../../config/publicIndustryClusterTaxonomy';

const B2C_BROWSE_CHIP_ICONS: Readonly<Partial<Record<IndustrySegment, string>>> = {
  'Garments': '...',
  'Home Textiles': '...',
  'Technical Textiles': '...',
  'Fabrics': '...',
};

const B2C_CATEGORY_FILTER_VALUES: ReadonlyArray<IndustrySegment> = [
  'Garments', 'Home Textiles', 'Technical Textiles', 'Fabrics',
];

const CATEGORY_CARDS = B2C_CATEGORY_FILTER_VALUES.map((value) => ({
  label: value, value, icon: B2C_BROWSE_CHIP_ICONS[value] ?? '',
}));
```

`IndustrySegment` is a union of INDUSTRY_SEGMENTS literal types. `B2C_CATEGORY_FILTER_VALUES: ReadonlyArray<IndustrySegment>` causes a TypeScript error if a non-approved term is added. Filter behavior is identical (same 4 values, same icons).

### 19.7 PublicProductDetail.tsx — No Change

Product detail tag rendering is raw passthrough from projection. No taxonomy normalization was applied. Rationale: DB values for `productCategory`, `material`, `fabricType` are unknown; adding a normalization layer without confirmed DB values could silently suppress valid tags or produce mismatches. Detail tag normalization is deferred to `B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001` after DB truth is verified.

### 19.8 Taxonomy Config — No Change

`config/publicIndustryClusterTaxonomy.ts` was not modified. The governance rule states: "No term may be added or modified without a corresponding update to INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 (status must advance to ACCEPTED)." Decision status is PROPOSED. No additions were made.

### 19.9 Governance Contracts Reviewed

| Contract | File | Status |
|---|---|---|
| Taxonomy authority | `governance/decisions/INDUSTRY-CLUSTER-TAXONOMY-DECISION-001.md` | PROPOSED — alignment uses only existing PUBLIC_SAFE terms |
| B2C tracker | `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | Updated (this section) |
| OpenAPI tenant contract | Not applicable — no API shape changes | N/A |
| Prisma schema | Not applicable — no DB changes | N/A |

### 19.10 Validation Evidence

- `git status --short` before edits: **empty (clean working tree)**
- `git diff --name-only` before edits: **empty (clean working tree)**
- TypeScript: `IndustrySegment` type import resolves cleanly; `B2C_CATEGORY_FILTER_VALUES: ReadonlyArray<IndustrySegment>` type-checked correctly against `INDUSTRY_SEGMENTS` literal union.
- No pre-existing TS errors introduced by this change.
- Runtime behavior unchanged: same 4 chip values, same icons, same `p.category === activeCategory` filter logic.

### 19.11 Adjacent Findings

**Finding 1: Product detail tag normalization is design-gated**
- Product detail tags render raw `category`, `material`, `fabricType` strings from projection.
- Taxonomy normalization of detail tags requires knowing actual DB values for `CatalogItem.productCategory`, `material`, `fabricType`.
- Classification: design-gated — subject of `B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001`.
- Blocks this unit: NO.

**Finding 2: INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 is still PROPOSED**
- The taxonomy decision has not advanced to ACCEPTED. No new terms were added in this unit.
- When the decision advances to ACCEPTED, the taxonomy config may be updated and downstream surfaces (chip filters, detail tags, SEO metadata) should be re-audited.

### 19.12 Commit Reference

- **Commit message:** `[TEXQTIC] public: align B2C category taxonomy`
- **Commit hash:** 221e2bb

---

## 20. B2C DPP Passport Linkage Sync — 2026-05-18

**Unit ID:** B2C-DPP-PASSPORT-LINKAGE-SYNC-001
**Date:** 2026-05-18
**Status:** GOVERNANCE_SYNC_COMPLETE
**Authorized by:** Paresh
**Commit:** [TEXQTIC] governance: sync B2C DPP passport linkage

### 20.1 Objective

Governance-sync audit of B2C trust, DPP, and passport linkage behavior in existing runtime. Confirm that all trust/passport language is conditional and availability-based, that `publicPassportId` is a public token and not an internal ID, and that no universal traceability or certification claims exist in B2C public surfaces. No runtime correction was needed; this unit is governance-only.

### 20.2 Scope

Files inspected (read-only):
- `components/Public/PublicProductDetail.tsx` — full file
- `components/Public/PublicPassport.tsx` — full component
- `services/publicB2CService.ts` — full file
- `server/src/services/publicB2CProjection.service.ts` — full service
- `App.tsx` — passport route wiring section
- `shared/contracts/openapi.tenant.json` — `hasPassport`, `publicPassportId`, `trustSignals` entries
- `server/src/routes/public.ts` — `/api/public/b2c/products`, `/api/public/dpp/:publicPassportId` routes
- `tests/e2e/dpp-passport-network.spec.ts` — DPP E2E test coverage for passport token integrity
- `config/publicIndustryClusterTaxonomy.ts` — TRUST_LANGUAGE and LAYER_CLAIM_SAFETY vocabulary

Governance file updated:
- `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` — this file

**No runtime files changed.**

### 20.3 Repo-Truth Inspection Findings

#### 20.3.1 Trust Signal Rendering — `PublicProductDetail.tsx`

Trust section heading: "Trust, origin, and passport signals"

Introductory copy: _"Where available, TexQtic connects product previews with public-safe trust, origin, traceability, or passport signals. Deeper records may require authenticated access."_ — explicitly qualified with "where available" ✅

Trust signal chips: `product.trustSignals.map(signal => ...)` — array-driven from backend; no hardcoded universal claims ✅

Passport availability badge: `product.hasPassport === true ? <span>Public passport available</span> : null` — conditional ✅

Passport link: `product.hasPassport && product.publicPassportId ? <a href={`/passport/${product.publicPassportId}`}>View Trust & Origin Passport</a> : null` — double-conditional; both fields required ✅

No `hasTraceabilityEvidence` claim in UI copy (used only by backend to gate trust signal content) ✅

#### 20.3.2 Backend Projection Safety Gates — `publicB2CProjection.service.ts`

`hasPassport` default: `false`. Set to `true` ONLY when `dpp_passport_states.status = 'PUBLISHED'` AND `public_token IS NOT NULL`.

`publicPassportId` assignment: `passportRows[0].public_token` — the dedicated public token column, NOT the internal primary key.

Response spread: `...(publicPassportId && { publicPassportId })` — `publicPassportId` only appears in response when non-null ✅

`trustSignals` construction: starts with `['Public-safe projection only']`; adds `'Traceability evidence available'` only when `hasTraceabilityEvidence === true`. No universal sustainability, certification, or DPP maturity claims ✅

Internal ID prohibition: `org.id` used only for DB lookups, never in output. Gate E enforced ✅

Backend guarantee: `hasPassport === true` → `publicPassportId` is non-null (both set together). Frontend double-check is defense-in-depth, not a workaround ✅

#### 20.3.3 `publicPassportId` Token Nature

`publicPassportId` is the `public_token` UUID column in `dpp_passport_states` — a dedicated public-facing token, separate from the primary key (`id`). OpenAPI contract documents this explicitly: _"Public passport token suitable for /passport/{publicPassportId}; only present when hasPassport is true. This is a public token, not an internal ID."_

E2E test `DPP-E2E-11` confirms: `GET /api/public/dpp/:publicPassportId` does NOT echo `publicPassportId` back in the response body (no reverse-mapping leak) ✅

Route validation: `publicPassportId` must be a valid UUID (`z.string().uuid(...)`) ✅

#### 20.3.4 `PublicPassport.tsx` Component Safety

Accepts `publicPassportId` as the route prop (captured from `/passport/:id` in App.tsx) — no internal ID used ✅

Fetches from `/api/public/dpp/${encodeURIComponent(publicPassportId)}` — correct public endpoint ✅

Loading / not-found / error states all handled cleanly ✅

`buildProductStory()` renders only: `manufacturerName`, `manufacturerJurisdiction`, `nodeType`, `batchId`, approved certification types. No internal IDs, org IDs, or private fields ✅

`MATURITY_LABELS` uses bounded display language (`Verified local`, `Trade Ready`, `Certified`, `Export Ready`) without universal unsupported claims ✅

QR code `payloadUrl` resolves to `/passport/${encodeURIComponent(publicPassportId)}` — public URL only ✅

#### 20.3.5 Passport Route Wiring in App.tsx

`/passport/:id` → `PUBLIC_PASSPORT` state → `PublicPassport` component with `publicPassportId={publicPassportIdFromPath}` ✅

Route matched first (before auth-state routing) — QR-code and direct-link visitors bypass auth state entirely ✅

`publicPassportIdFromPath` captured from URL via regex on mount; falls back to empty string (safe) ✅

#### 20.3.6 OpenAPI Contract Alignment

Contract field `publicPassportId`: `{ "type": "string", "nullable": true, "description": "Public passport token suitable for /passport/{publicPassportId}; only present when hasPassport is true. This is a public token, not an internal ID." }` — matches backend behavior ✅

`hasPassport: boolean` ✅ `trustSignals: array` ✅ `hasTraceabilityEvidence: boolean` ✅

#### 20.3.7 B2C / D2C Separation Confirmation

`B2CBrowse.tsx` — no D2C collection service imports ✅
`PublicProductDetail.tsx` — no D2C collection service imports ✅
No D2C semantics (collection, story, early-access) bleed into B2C public surfaces ✅
DPP JSON-LD context file (`public/dpp/v1/context.jsonld`) is present but not linked from B2C product detail surfaces ✅

### 20.4 Assessment: Runtime Correction Required?

**NO.** All trust/passport/DPP linkage behaviors are confirmed safe and consistent with governance doctrine.

| Check | Result |
|---|---|
| Passport link requires both `hasPassport` AND `publicPassportId` | PASS |
| Trust signals are array-driven, not universal claims | PASS |
| "Where available" language present in trust section | PASS |
| `publicPassportId` is a public token, not internal ID | PASS |
| Backend gates `hasPassport`/`publicPassportId` together | PASS |
| No universal traceability or DPP coverage claims | PASS |
| No org_id / internal IDs on public surfaces | PASS |
| B2C / D2C boundary clean | PASS |
| OpenAPI contract matches runtime behavior | PASS |
| E2E test coverage for passport token integrity | PASS |
| `PublicPassport.tsx` uses public token, not internal ID | PASS |

### 20.5 Governance Contracts Reviewed

- `shared/contracts/openapi.tenant.json` — B2C product detail and DPP passport endpoints
- `config/publicIndustryClusterTaxonomy.ts` — `TRUST_LANGUAGE`, `LAYER_CLAIM_SAFETY`, `FORBIDDEN_CLAIM_PATTERNS`
- `AGENTS.md` — B2C public surface and trust governance rules
- `copilot-instructions.md` — projection safety gates and public/private boundary rules

### 20.6 Validation

Governance-only sync — no runtime files changed. Runtime validation (`pnpm typecheck`) not required.

Preflight:
- `git diff --name-only` → no output (clean tree) ✅
- `git status --short` → no output (clean tree) ✅

### 20.7 Adjacent Findings

**Finding 1: `hasTraceabilityEvidence` not surfaced in UI copy**
- Backend sets `hasTraceabilityEvidence: true` when shared traceability nodes exist. The frontend `PublicProductDetail.tsx` does NOT render a dedicated "traceability evidence available" chip separate from the `trustSignals` array. Instead, the backend includes `'Traceability evidence available'` in the `trustSignals` array when the flag is true. This is the correct pattern — the UI surface is trust-signal-array-driven only.
- Classification: confirmed correct pattern; no change needed.

**Finding 2: `public/dpp/v1/context.jsonld` is present but not linked from B2C surfaces**
- DPP JSON-LD context file exists in `public/dpp/v1/context.jsonld`. It is not referenced from B2C product detail, browse, or product detail pages. This is consistent with `PUBLIC-SEO-INFRASTRUCTURE-DECISION-001` deferral of structured data for B2C.
- Classification: confirmed deferred; subject of future SEO/structured-data governance unit. No change needed.

### 20.8 Next-Unit Recommendation

**Primary next unit:** `B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001`
- Precondition (`B2C-CATEGORY-TAXONOMY-ALIGNMENT-001`) is now met.
- Design artifact for B2C category story IA and claim patterns.
- No runtime implementation in this design unit.

### 20.9 Commit Reference

- **Commit message:** `[TEXQTIC] governance: sync B2C DPP passport linkage`
- **Commit hash:** (see git log)

---

## 21. B2C Public Category Story Pages Design — 2026-05-18

**Unit ID:** B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001
**Date:** 2026-05-18
**Status:** DESIGN_COMPLETE
**Authorized by:** Paresh
**Commit:** [TEXQTIC] governance: design B2C category story pages

### 21.1 Objective

Design authority for B2C public category story pages. Defines route model, app state, page IA,
taxonomy-backed category set, slug strategy, static-config / projection strategy, B2C browse
integration, public/private boundary, claim rules, DPP/passport/trust rules, SEO ownership,
and implementation plan. No runtime implementation in this design unit.

### 21.2 Scope

Files inspected (read-only):
- `App.tsx` — AppState union and resolveInitialAppState() route handling
- `config/publicIndustryClusterTaxonomy.ts` — full taxonomy inventory
- `utils/publicPageMeta.ts` — SEO utility scope and interface
- `components/Public/B2CBrowse.tsx` — B2C_CATEGORY_FILTER_VALUES and filter chip logic
- `components/Public/` (directory) — confirmed no category story component exists
- `services/publicB2CService.ts` — projection interface fields
- `server/src/services/publicB2CProjection.service.ts` — projection safety gates
- `governance/decisions/INDUSTRY-CLUSTER-TAXONOMY-DECISION-001.md` — taxonomy authority
- `PUBLIC-SEO-INFRASTRUCTURE-DECISION-001.md` — Option E decided; Stage 1 scope
- `governance/units/PUBLIC-PAGES-NAVBAR-IA-AUDIT-AND-DESIGN-001.md` — page inventory

Governance file created:
- `governance/units/B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001.md` — design artifact

Governance file updated:
- `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` — this file

**No runtime files changed.**

### 21.3 Key Design Decisions

#### 21.3.1 Recommended Route Model

**Decision:** Option B — `/products/category/:categorySlug`

Regex: `^\/products\/category\/([a-z0-9-]+)$`

Rationale: Unambiguously distinct from `/product/:slug` (singular, 2-segment) and all other
existing App.tsx routes. No conflict confirmed by direct regex analysis. The `category` infix
makes the page type explicit and leaves the `/products/` prefix available for potential future
material story pages (`/products/material/:materialSlug`).

New AppState required: `PUBLIC_B2C_CATEGORY_STORY`

#### 21.3.2 Initial Category Set

Four category story pages for Phase 1:

| IndustrySegment | Slug | Status |
|---|---|---|
| Garments | `garments` | Phase 1 |
| Home Textiles | `home-textiles` | Phase 1 |
| Technical Textiles | `technical-textiles` | Phase 1 |
| Fabrics | `fabrics` | Phase 1 |
| Yarn & Spinning | — | DEFERRED (B2B-oriented) |
| Textile Services | — | DEFERRED (service category, not product) |

Alignment with `B2C_CATEGORY_FILTER_VALUES` in `B2CBrowse.tsx` is exact.

#### 21.3.3 Static Config / Projection Strategy

- **Page copy (hero, context band, SEO fields):** Static config (`config/publicB2CCategoryPages.ts`)
- **Product grid:** Live projection via existing `GET /api/public/b2c/products` endpoint
- **No new backend endpoint required** for initial implementation

#### 21.3.4 SEO Ownership

- **Implementation-owned (Stage 1):** title, meta description, canonical, robots, OG/Twitter via `publicPageMeta.ts`
- **Deferred:** sitemap, JSON-LD, per-category OG images, advanced canonicalization

#### 21.3.5 DPP/Passport Rules Confirmed

No category-level DPP/passport claims permitted. Trust band uses "where available" qualification
only, consistent with `B2C-DPP-PASSPORT-LINKAGE-SYNC-001` governance.

### 21.4 Files to Change in Implementation Unit

**Create (new):**
- `config/publicB2CCategoryPages.ts`
- `components/Public/PublicB2CCategoryPage.tsx`

**Modify:**
- `App.tsx` — AppState union, route matching, component wiring
- `utils/publicPageMeta.ts` — doc-header scope comment only (no functional change)

**Optional modify (UX decision at implementation time):**
- `components/Public/B2CBrowse.tsx` — category chip href links

**No backend changes. No schema changes. No OpenAPI changes.**

### 21.5 Adjacent Findings Recorded in Design Artifact

1. `CatalogItem.productCategory` normalization vs IndustrySegment alignment — implementation risk
2. `publicPageMeta.ts` doc-header scope update needed (comment only)
3. No `/products` landing page exists — deliberate decision required in implementation unit
4. `B2C_CATEGORY_FILTER_VALUES` and `publicB2CCategoryPages.ts` must remain in sync

### 21.6 Implementation Gate

`B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001` is BLOCKED until:
- This design artifact (`B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001.md`) is reviewed and accepted
- `INDUSTRY-CLUSTER-TAXONOMY-DECISION-001` is in PROPOSED or ACCEPTED status (currently PROPOSED — acceptable for implementation using existing PUBLIC_SAFE vocabulary only)

### 21.7 Commit Reference

- **Commit message:** `[TEXQTIC] governance: design B2C category story pages`
- **Commit hash:** (see git log)

---

## 22. B2C Public Category Story Pages Implementation — 2026-05-18

**Unit:** `B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001`
**Status:** IMPLEMENTATION_COMPLETE

### 22.1 Summary

Implemented URL-addressable, taxonomy-backed B2C category story pages at `/products/category/:categorySlug` for Garments, Home Textiles, Technical Textiles, and Fabrics. All changes are additive; no existing routes or components were modified.

### 22.2 Files Changed

| File | Action | Notes |
|---|---|---|
| `config/publicB2CCategoryPages.ts` | Created | Static config for 4 category pages + `getCategoryPageBySlug` + `getCategoryPageBySegment` helpers |
| `components/Public/PublicB2CCategoryPage.tsx` | Created | Full category story page component (hero, search, product grid, trust band, sign-in handoff) |
| `App.tsx` | Modified | New import, `AppState` value, 2 new routes in `resolveInitialAppState()`, `publicCategorySlugFromPath` state, SEO useEffect arm, render case |
| `utils/publicPageMeta.ts` | Modified | Doc-header scope list updated to include `PUBLIC_B2C_CATEGORY_STORY surface` |

### 22.3 Key Behaviors

- Route `/products` and `/products/` → `PUBLIC_B2C_BROWSE` (added as defensive explicit path)
- Route `/products/category/:slug` → `PUBLIC_B2C_CATEGORY_STORY`
- Unknown `slug` → `CategoryUnavailable` component (noindex SEO applied)
- Known slug → full hero + search + product grid page (`index, follow` SEO applied)
- Product filter: `p.category === config.segment` (exact-match; intentionally preserved from B2CBrowse behavior per Finding 1 in design artifact)
- SEO ownership: App.tsx useEffect (not the component); consistent with all other public surfaces

### 22.4 Adjacent Finding Confirmed Deferred

B2CBrowse category chip link integration remains deferred. Converting filter-toggle chips to dual-purpose navigation links creates UX ambiguity (filter vs. navigate). Requires a separate design decision unit before implementation.

### 22.5 Validation

- `pnpm exec tsc --noEmit` — PASS (no errors)
- Git staged files confirmed to allowlist only

### 22.6 Commit Reference

- **Commit message:** `[TEXQTIC] public: implement B2C category story pages`
- **Commit hash:** `7b786a751284e880cd83529fd8808aa7bf8cda00`

---

## 23. B2C Category Story Pages — Production Verification Close — 2026-05-18

**Unit:** `B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001-VERIFY-CLOSE`
**Status:** VERIFIED_COMPLETE
**Verification date:** 2026-05-18
**Implementation commit verified:** `7b786a751284e880cd83529fd8808aa7bf8cda00`
**Base URL:** `https://app.texqtic.com`

### 23.1 Routes Verified

| Route | Result | Title | Canonical | Robots |
|---|---|---|---|---|
| `/products/category/garments` | PASS | Garments — Browse Textile Products \| TexQtic | `/products/category/garments` | `index, follow` |
| `/products/category/home-textiles` | PASS | Home Textiles — Browse Textile Products \| TexQtic | `/products/category/home-textiles` | `index, follow` |
| `/products/category/technical-textiles` | PASS | Technical Textiles — Browse Textile Products \| TexQtic | `/products/category/technical-textiles` | `index, follow` |
| `/products/category/fabrics` | PASS | Fabrics — Browse Textile Products \| TexQtic | `/products/category/fabrics` | `index, follow` |
| `/products/category/unknown-slug` | PASS | Category Unavailable — TexQtic | `/products` | `noindex, nofollow` |

### 23.2 Known Category Route Checks (all four categories)

- Page loads successfully
- Category hero (heading, tagline, description) renders
- Copy is public-safe — no private IDs, pricing, inventory, or supplier records visible
- Product grid renders expected empty state ("No [Category] products are available for public discovery right now.") — correct given current catalog state
- No RFQ / order / cart / wishlist / checkout / buyer-intent capture elements present
- No D2C collection terminology or collection semantics
- Trust band renders with "where available" / conditional language on all four pages
- Trust signal chips: "Origin context where available", "Supplier trust signals where available", "Traceability signals where available", "Public-safe projection only"
- No universal DPP/passport/certification/origin/sustainability assertions
- Sign-in handoff renders as "Sign in to Continue" (no buy-intent semantics)
- "List Your Products" links to `https://texqtic.com/request-access`
- Public boundary disclosure footer renders on all four pages
- No console errors on any page
- Context band ("About [Category]") renders with appropriate copy
- Search input renders with category-scoped placeholder

### 23.3 Unknown Slug Fallback Checks

- Safe unavailable state renders
- Heading: "This category is not available for public discovery."
- No private data exposed
- "Browse All Products" button present for navigation back
- Robots: `noindex, nofollow`
- No console errors

### 23.4 SEO Stage 1 Metadata (Garments — full; others confirmed title/canonical/robots)

| Field | Value | Status |
|---|---|---|
| `<title>` | Category-specific title | PASS |
| `meta[name="description"]` | Category-specific description | PASS |
| `link[rel="canonical"]` | `/products/category/:slug` | PASS |
| `meta[name="robots"]` | `index, follow` (known) / `noindex, nofollow` (unknown) | PASS |
| `og:title` | Matches title | PASS |
| `og:description` | Matches meta description | PASS |
| `og:url` | Matches canonical | PASS |
| `og:type` | `website` | PASS |
| `og:image` | `/brand/texqtic-logo.png` | PASS |
| `twitter:card` | `summary_large_image` | PASS |
| `twitter:title` | Matches title | PASS |
| `twitter:description` | Matches meta description | PASS |

### 23.5 Neighbor-Path Smoke Checks

| Route | Result | Notes |
|---|---|---|
| `/products` | PASS | B2C browse renders; category filter chips present |
| `/collections` | PASS | Collection list renders; title correct |
| `/collections/natural-fabric-stories` | PASS | Collection detail renders; trust copy conditional; no checkout/cart |
| Backend `GET /api/health` | PASS | `{"status":"ok"}` |
| `/product/:slug` | N/A | No known public product slug available at time of verification |
| `/passport/:id` | N/A | No known public passport token available at time of verification |

### 23.6 Public / Private Boundary Confirmation

- No private supplier IDs, org IDs, tenant IDs, auth tokens, pricing, or inventory data appeared on any verified page
- All pages render public-safe projections only
- Public boundary disclosure footer present on all known category pages

### 23.7 DPP / Passport / Trust Claim Confirmation

- No universal DPP/passport/trust/traceability/certification/origin/sustainability claims appear
- All trust language is conditional ("where available")
- Trust signals are chip-format with explicit "where available" qualifiers

### 23.8 Deferred Items (no change to deferred scope)

1. B2C SEO metadata expansion beyond Stage 1 (sitemap, JSON-LD, robots.txt, per-category OG images)
2. sitemap.xml implementation
3. JSON-LD structured data
4. robots.txt management
5. Per-category hero OG images (deferred until image management approved)
6. Page 11 inquiry
7. B2C inquiry handoff
8. Authenticated continuation for B2C category surfaces
9. B2C browse chip deep-link to category pages (UX ambiguity deferred — filter vs. navigate; requires separate design unit)
10. Category normalization risk: `p.category === config.segment` exact-match preserved per Finding 1 in design artifact; resolution deferred

### 23.9 Recommended Next Unit

`B2C-SEO-METADATA-EXPANSION-DESIGN-001`

### 23.10 Verification Commit Reference

- **Commit message:** `[TEXQTIC] governance: verify B2C category story pages`
- **Commit hash:** `048f1b5`

---

## 24. B2C SEO Metadata Expansion — Design Close — 2026-07-07

**Unit:** B2C-SEO-METADATA-EXPANSION-DESIGN-001
**Status:** DESIGN_COMPLETE
**Artifact:** `governance/units/B2C-SEO-METADATA-EXPANSION-DESIGN-001.md`

### 24.1 Scope

Design of SEO metadata model for the following B2C public routes not covered by Stage 1:

| Route | AppState | Prior State | Designed State |
|---|---|---|---|
| `/products` | `PUBLIC_B2C_BROWSE` | `clearPublicPageMeta()` | `index, follow` — static copy |
| `/product/:slug` (found) | `PUBLIC_PRODUCT_DETAIL` | `clearPublicPageMeta()` | `index, follow` — slug-only (Stage 2a); rich fields (Stage 2b) |
| `/product/:slug` (not-found) | `PUBLIC_PRODUCT_DETAIL` | `clearPublicPageMeta()` | `noindex, nofollow` — requires Stage 2b state-back channel |
| `/trust` | `PUBLIC_TRUST_LANDING` | `clearPublicPageMeta()` | `index, follow` — static copy |
| `/industries` | `PUBLIC_INDUSTRY_CLUSTER_LANDING` | `clearPublicPageMeta()` | `index, follow` — static copy |
| `/aggregator` | `PUBLIC_AGGREGATOR` | `clearPublicPageMeta()` | `noindex, nofollow` (not yet production-ready) |

### 24.2 Key Design Decisions

1. **No changes to `utils/publicPageMeta.ts`** — the existing utility is generic and complete. Only new callers needed in App.tsx.

2. **Two-stage product detail approach:**
   - **Stage 2a:** Slug-only generic metadata (`index, follow`; same title/description for all product pages). Immediate. Minimal App.tsx change. Known limitation: cannot distinguish found vs. not-found at SEO-effect time.
   - **Stage 2b:** Callback-based state-back channel (`onProductMetaReady` prop on `PublicProductDetail`). Rich product metadata with name, category, summary. Correct `noindex` for not-found. Separate unit: `B2C-PRODUCT-DETAIL-RICH-SEO-001`.

3. **Stage 2a product detail metadata (slug-only):**
   - title: `"Textile Product Preview — TexQtic"`
   - description: `"View this public-safe textile product preview on TexQtic. Discover materials, categories, and supply chain context from verified suppliers."`
   - canonical: `${origin}/product/${publicProductSlugFromPath}`
   - robots: `index, follow`
   - ogType: `product`

4. **Browse metadata (static):**
   - title: `"Explore Textile Products — TexQtic"`
   - description: `"Browse public-safe textile product previews across garments, home textiles, technical textiles, and fabrics on TexQtic."`
   - canonical: `${origin}/products`
   - robots: `index, follow`
   - ogType: `website`

5. **Fail-safe:** Any ambiguous state defaults to `noindex, nofollow`. Existing `clearPublicPageMeta()` fall-through is retained for all unaddressed states.

6. **Canonical origin:** Continues to use `globalThis.window?.location.origin ?? ''`. No domain strategy change.

### 24.3 Public / Private Metadata Boundary

Field eligibility matrix for `PublicB2CProductDetail` defined in design artifact Section 11.1. Key: `name`, `category`, `material`, `fabricType`, `summary`, `publicSupplierName` are safe. `trustSignals`, `hasPassport`, `hasTraceabilityEvidence`, `publicPassportId`, `publicSupplierSlug`, `imageUrls` are forbidden in Stage 2a/2b.

### 24.4 Explicit Deferrals

| Item | Deferred To |
|---|---|
| `sitemap.xml` | Post domain strategy decision |
| `robots.txt` | Post domain strategy decision |
| Product JSON-LD | Post Stage 2b |
| `/passport/:id` metadata | Separate design unit |
| `/supplier/:slug` metadata | Separate design unit |
| Product not-found `noindex` | `B2C-PRODUCT-DETAIL-RICH-SEO-001` |
| Rich product metadata (name, description) | `B2C-PRODUCT-DETAIL-RICH-SEO-001` |
| Domain canonical migration | Domain strategy decision |
| Google Search Console | Operational task |

### 24.5 Implementation Allowlist (for next unit)

**Modify:** `App.tsx` (SEO useEffect only)
**Create:** `governance/units/B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001.md` (tracker record)
**Read-only:** `utils/publicPageMeta.ts`, `components/Public/B2CBrowse.tsx`, `components/Public/PublicProductDetail.tsx`, `services/publicB2CService.ts`
**Forbidden:** Any API, schema, service, or component file modification

### 24.6 Recommended Next Unit

`B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001`

### 24.7 Design Commit Reference

- **Commit message:** `[TEXQTIC] governance: design B2C SEO metadata expansion`
- **Commit hash:** `c71c625`

---

## 25. B2C SEO Metadata Expansion — Implementation Close — 2026-07-07

**Unit:** B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001
**Status:** VERIFIED_COMPLETE
**Verification date:** 2026-05-18
**Stage:** 2a (slug-only generic metadata)

### 25.1 Scope

Implemented Stage 2a SEO metadata in App.tsx for:

| Route | AppState | Prior State | Implemented State |
|---|---|---|---|
| `/products` | `PUBLIC_B2C_BROWSE` | `clearPublicPageMeta()` | `index, follow` — static copy |
| `/product/:slug` (any slug) | `PUBLIC_PRODUCT_DETAIL` | `clearPublicPageMeta()` | `index, follow` — slug-only generic (Stage 2a) |

All other states unchanged. D2C collection metadata and B2C category story metadata verified intact (typecheck pass).

### 25.2 Files Changed

| File | Change |
|---|---|
| `App.tsx` | Added `PUBLIC_B2C_BROWSE` and `PUBLIC_PRODUCT_DETAIL` arms in SEO useEffect; added `publicProductSlugFromPath` to deps array |

No other files modified.

### 25.3 Key Implementation Notes

1. **`ogType` type constraint:** `PublicPageMetaInput.ogType` is typed as `'website'` only. The design artifact specified `ogType: 'product'` for product detail — this was corrected to `'website'` at implementation time to satisfy the type contract. `publicPageMeta.ts` was not modified (on forbidden list).

2. **`publicProductSlugFromPath` guard:** Product detail arm applies `index, follow` metadata only when the slug is non-empty. If slug is empty/falsy, falls through to `clearPublicPageMeta()` as fail-closed default.

3. **All metadata fields from design satisfied:** title, description, canonical, robots, ogTitle, ogDescription, ogImage (`PUBLIC_META_OG_FALLBACK_IMAGE`), ogUrl, ogType (`'website'`), twitterCard, twitterTitle, twitterDescription, twitterImage.

### 25.4 Validation Evidence

- `pnpm run typecheck` — **PASS** (no type errors in UI or server)
- `git diff --name-only` — `App.tsx` only
- Stage 2a known limitation (cannot distinguish found vs. not-found) — accepted per design decision in Section 24.2

### 25.5 Explicit Deferrals

- `PUBLIC_TRUST_LANDING`, `PUBLIC_INDUSTRY_CLUSTER_LANDING`, `PUBLIC_AGGREGATOR` metadata — out of scope for this unit
- Stage 2b (`onProductMetaReady` callback, rich product metadata, not-found `noindex`) — `B2C-PRODUCT-DETAIL-RICH-SEO-001`
- sitemap.xml, robots.txt, JSON-LD — post domain strategy decision
- `ogType` extension to support `'product'` in `PublicPageMetaInput` — separate utility update unit
- Product not-found `noindex` — `B2C-PRODUCT-DETAIL-RICH-SEO-001`
- Rich product metadata (name, description, supplier) — `B2C-PRODUCT-DETAIL-RICH-SEO-001`
- Page 11 inquiry, B2C inquiry handoff, authenticated continuation — separate units

### 25.6 Recommended Next Unit

`B2C-PRODUCT-DETAIL-RICH-SEO-001`

### 25.7 Implementation Commit Reference

- **Commit message:** `[TEXQTIC] public: implement B2C SEO metadata expansion`
- **Commit hash:** `3f1001c`

### 25.8 Production Verification Evidence (2026-05-18)

**Deployment confirmation:** Production runtime behavior reflects Stage 2a implementation. Commit `3f1001c` confirmed deployed via runtime metadata correctness.

**Backend health:** `GET https://app.texqtic.com/api/health` → `{"status":"ok"}` (HTTP 200)

**Primary checks:**

| Route | Check | Result |
|---|---|---|
| `/products` | `<title>` = `Explore Textile Products — TexQtic` | PASS |
| `/products` | `<meta name="description">` = Stage 2a browse description | PASS |
| `/products` | `<link rel="canonical">` = `https://app.texqtic.com/products` | PASS |
| `/products` | `<meta name="robots">` = `index, follow` | PASS |
| `/products` | OG + Twitter tags all present | PASS |
| `/products` | `og:type` = `website` | PASS |
| `/products` | Page renders normally | PASS |
| `/products` | No console errors | PASS |
| `/product/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` | `<title>` = `Textile Product Preview — TexQtic` | PASS |
| `/product/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` | `<meta name="description">` = Stage 2a product description | PASS |
| `/product/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` | `<link rel="canonical">` ends with `/product/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` | PASS |
| `/product/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` | `<meta name="robots">` = `index, follow` | PASS |
| `/product/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` | OG + Twitter tags all present | PASS |
| `/product/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` | `og:type` = `website` (per accepted constraint) | PASS |
| `/product/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` | No private data in metadata | PASS |
| `/product/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` | Page renders graceful not-found state (slug is QA seed; not published) | PASS |

**Note:** The slug `qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` is a QA seed product that is not published in production. The component rendered the graceful not-available fallback. Stage 2a metadata was applied before the product fetch resolved — confirming the SEO useEffect fires correctly for this state. This is the accepted Stage 2a limitation (found vs. not-found cannot yet be distinguished).

**Regression checks:**

| Route | Expected robots | Result |
|---|---|---|
| `/products/category/garments` | `index, follow` | PASS |
| `/products/category/unknown-slug` | `noindex, nofollow` | PASS |
| `/collections` | `index, follow` | PASS |
| `/collections/natural-fabric-stories` | `index, follow` | PASS |
| `/collections/unknown-slug` | `noindex, nofollow` | PASS |

**Public/private metadata boundary:** No org_id, tenant ID, internal supplier IDs, publicPassportId, trustSignals, hasPassport, hasTraceabilityEvidence, product image URLs, pricing, inventory, RFQ/order/cart/wishlist/checkout language, buyer intent, AI/ranking/recommendation claims, or unsupported DPP/passport/trust/traceability/certification/origin/sustainability claims appeared in any metadata verified above.

---

## 26. B2C Product Detail Rich SEO — Stage 2b — Implementation — 2026-07-08

**Unit:** B2C-PRODUCT-DETAIL-RICH-SEO-001
**Status:** VERIFIED_COMPLETE
**Stage:** 2b (rich product metadata with found/notFound signal callback)

### 26.1 Scope

Upgraded Stage 2a generic `PUBLIC_PRODUCT_DETAIL` SEO arm in `App.tsx` to a signal-driven Stage 2b arm that responds to the actual product fetch result. `PublicProductDetail` was extended with an `onProductMetaReady` callback channel.

| Route | AppState | Prior State (Stage 2a) | Implemented State (Stage 2b) |
|---|---|---|---|
| `/product/:slug` — loading | `PUBLIC_PRODUCT_DETAIL` | generic static `index, follow` | unchanged (generic static while fetch resolves) |
| `/product/:slug` — found | `PUBLIC_PRODUCT_DETAIL` | generic static `index, follow` | rich `${name} — TexQtic Textile Products`; description from summary/productDesc (truncated 155 chars) |
| `/product/:slug` — not-found | `PUBLIC_PRODUCT_DETAIL` | `index, follow` (incorrect) | `noindex, nofollow`, canonical → `/products`, title = `Product Not Found — TexQtic` |
| `/products` | `PUBLIC_B2C_BROWSE` | `index, follow` static copy | unchanged |

### 26.2 Files Changed

| File | Change |
|---|---|
| `components/Public/PublicProductDetail.tsx` | Exported `PublicProductDetailMetaSignal` type; added `onProductMetaReady` prop; signal callbacks in all three fetch outcomes (not-slug, found, catch/notFound); updated dep array |
| `App.tsx` | Updated import; added `publicProductDetailMeta` state; added reset useEffect; upgraded `PUBLIC_PRODUCT_DETAIL` SEO arm (loading/found/notFound three-state); added `publicProductDetailMeta` to dep array; passed `onProductMetaReady={setPublicProductDetailMeta}` to `<PublicProductDetail>` |

### 26.3 Key Implementation Notes

1. **State-back channel pattern:** `onProductMetaReady?: (meta: PublicProductDetailMetaSignal) => void` passed from `App.tsx` into `PublicProductDetail`. Component calls it when the fetch resolves. SEO useEffect in `App.tsx` re-runs on `publicProductDetailMeta` change.

2. **Three-state SEO arm:**
   - `null` (loading): generic Stage 2a fallback — crawler sees valid metadata immediately
   - `type === 'notFound'`: `noindex, nofollow`, canonical → `/products` — fixes incorrect Stage 2a indexing of 404 product URLs
   - `type === 'found'`: rich title from `name`; description from `summary` ?? `description` (both truncated to 155 chars) ?? static fallback copy

3. **`ogType` constraint unchanged:** `'website'` only — `'product'` deferred to a separate `publicPageMeta.ts` utility update unit.

4. **Reset useEffect:** `publicProductDetailMeta` reset to `null` on any `appState !== 'PUBLIC_PRODUCT_DETAIL'` transition to prevent stale metadata.

5. **Public/private boundary:** Only `name`, `summary`, `description`, `category`, `material`, `fabricType`, `publicSupplierName` surfaced — all public-safe fields per `publicB2CService.ts` response contract.

### 26.4 Validation Evidence

- `pnpm exec tsc --noEmit` — **PASS** (exit code 0)
- `git diff --name-only` — `App.tsx`, `components/Public/PublicProductDetail.tsx` only (allowlist confirmed)

### 26.5 Explicit Deferrals

- `ogType: 'product'` — requires separate `publicPageMeta.ts` utility extension unit
- Product OG image — product images not available in public B2C surface at this stage
- JSON-LD structured data (`Product`, `BreadcrumbList`) — post domain strategy decision
- sitemap.xml, robots.txt — post domain strategy decision
- `PUBLIC_TRUST_LANDING`, `PUBLIC_INDUSTRY_CLUSTER_LANDING`, `PUBLIC_AGGREGATOR` metadata — separate units
- Page 11 inquiry, B2C inquiry handoff, authenticated continuation — separate units
- Production verification — `B2C-PRODUCT-DETAIL-RICH-SEO-001-VERIFY-CLOSE`

### 26.6 Recommended Next Unit

`B2C-PRODUCT-DETAIL-RICH-SEO-001-VERIFY-CLOSE`

### 26.7 Implementation Commit Reference

- **Commit message:** `[TEXQTIC] public: implement B2C product detail rich SEO`
- **Commit hash (original implementation):** `a548225`
- **Commit hash (SEO useEffect fix — same message):** `057d998`

### 26.8 Production Verification Evidence (2026-07-08)

**Backend health:** `GET https://app.texqtic.com/api/health` → `{"status":"ok"}` HTTP 200 ✅

**Not-found path (Stage 2b):** slug `qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10` → title `Product Not Found — TexQtic`, robots `noindex, nofollow`, canonical `https://app.texqtic.com/products` ✅  
Confirmed on second QA slug — identical result ✅

**Found path (Stage 2b):** Data-limited — no publicly-accessible PDP in production at this time. QA browse products return ERR_ABORTED/404 from PDP API. Found-state verified at TypeScript level (tsc --noEmit PASS) only.

**Regression checks:** `/products` `index,follow` ✅ · `/products/category/garments` `index,follow` ✅ · `/products/category/unknown-slug` `noindex,nofollow` ✅ · `/collections` `index,follow` ✅ · `/collections/natural-fabric-stories` `index,follow` ✅ · `/collections/unknown-slug` `noindex,nofollow` ✅

**Public/private boundary:** No private fields in any verified metadata ✅

**Verification result:** PASS (not-found path fully verified; found path data-limited)

---

## 27. Public Inquiry Intent-Capture Page — Design — 2026-07-08

**Unit ID:** PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001
**Date:** 2026-07-08
**Status:** DESIGN_COMPLETE
**Authorized by:** Paresh

### 27.1 Scope

Design unit for Page 11 — the standalone public inquiry intent-capture page (`/inquiry`). Design-only; no runtime changes in this unit.

### 27.2 Key Findings

Files inspected:
- `App.tsx` — confirmed: no `PUBLIC_INQUIRY` app state, no `/inquiry` route in `resolveInitialAppState()`
- `services/publicB2BService.ts` — confirmed: `submitPublicInquiry` exists; supplier-scoped only; `supplier_slug` required
- `server/src/routes/public.ts` — confirmed: `POST /api/public/inquiry/submit` (INQUIRY-004) is IMPLEMENTED; requires `supplier_slug`; rate-limited to 20 req/15 min/IP
- `shared/contracts/openapi.tenant.json` — confirmed: endpoint documented; no PII fields; `supplier_slug` required
- `config/publicIndustryClusterTaxonomy.ts` — confirmed: Layer 7 inquiry context terms status DEFERRED (`INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001`)
- `governance/units/PUBLIC-PAGES-NAVBAR-IA-AUDIT-AND-DESIGN-001.md` section 9 — confirmed: Page 11 nav treatment: omit until implemented; no "coming soon" link

### 27.3 Design Decisions

| Decision | Value |
|---|---|
| Route | `/inquiry` |
| App state | `PUBLIC_INQUIRY` (new) |
| Component | `components/Public/PublicInquiryPage.tsx` (to be created at implementation) |
| Phase 1 scope | Supplier-context-only; reuses existing `POST /api/public/inquiry/submit` |
| Phase 2 scope | General + multi-context; DEFERRED to `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` |
| SEO | `index, follow`; canonical `/inquiry`; title `Express Interest — TexQtic` |
| PII collection | NONE — no name, email, phone, company in any phase |
| Form fields (Phase 1) | `inquiry_category` (required), `geo_band` (optional), `volume_band` (optional), context summary (read-only) |
| Auth handoff CTA | "Create an account to follow up" → `onSignIn()` |

### 27.4 Backend-Gated Assessment

- **Phase 1:** NOT backend-gated — existing endpoint fully compatible with supplier-context mode.
- **Phase 2:** BACKEND-GATED — `supplier_slug` required by current schema; no `source_surface`, `product_slug`, `category_slug`, `collection_slug`, or `message` fields supported.

### 27.5 B2C Unit 6 Reconciliation

B2C tracker unit 6 (`B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001`, status `DESIGN_GATED`) is **subsumed** by this design unit:
- Page 11 standalone design (this unit) covers the broader scope
- B2C-specific handoff context (product/category context carriage) is the Phase 2 scope, deferred to `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001`
- Unit 6 should be treated as superseded; do not create a separate `B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001` artifact

### 27.6 Recommended Next Units

1. **`PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001`** — implement Phase 1 (supplier-context only; no backend changes)
2. **`PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001`** — design extended endpoint for Phase 2 (parallel; not blocking Phase 1)

### 27.7 Design Commit Reference

- **Commit message:** `[TEXQTIC] governance: design public inquiry intent capture`
- **Commit hash:** ceffea8

---

## 28. Public Inquiry Intent-Capture Page — Implementation — 2026-07-08

**Unit ID:** PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001
**Date:** 2026-07-08
**Status:** IMPLEMENTATION_COMPLETE
**Authorized by:** Paresh

### 28.1 Scope

Phase 1 runtime implementation of the standalone public inquiry intent-capture page (`/inquiry`).
Reuses existing `POST /api/public/inquiry/submit` endpoint (INQUIRY-004). No backend changes.

### 28.2 Files Changed

| File | Action | Description |
|---|---|---|
| `components/Public/PublicInquiryPage.tsx` | Created | Standalone inquiry page component — 4 modes: NO_CONTEXT, FORM, SUCCESS, ERROR |
| `App.tsx` | Modified | Added `PUBLIC_INQUIRY` to AppState union; `/inquiry` route in `resolveInitialAppState()`; `publicInquirySupplierSlugFromQuery` state; SEO arm; documentTitle arm; `onGoInquiry` in publicNavBase; render case |
| `components/Public/PublicNavbar.tsx` | Modified | Added `'inquiry'` to `PublicNavSection`; `onGoInquiry` prop; `{ label: 'Inquire', section: 'inquiry' }` nav entry |
| `tests/frontend/public-inquiry-page.test.tsx` | Created | 12 unit tests (PII-001 through PII-012) covering all page modes, error paths, PII-free assertion, and payload correctness |

### 28.3 AppState Touch Points

- `AppState` union: `'PUBLIC_INQUIRY'` added after `'PUBLIC_REFERRAL_LANDING'`
- `resolveInitialAppState()`: pathname `=== '/inquiry'` returns `'PUBLIC_INQUIRY'` (before query-param token check)
- `publicInquirySupplierSlugFromQuery`: parsed from `?supplierSlug=` on load; validated against `/^[a-z0-9-]+$/`; defaults to `''`
- SEO useEffect: `applyPublicPageMeta` with canonical `/inquiry`, robots `index, follow`, title `Express Interest — TexQtic`
- `documentTitle` useMemo: `'Express Interest — TexQtic'` for `PUBLIC_INQUIRY`
- `publicNavBase`: `onGoInquiry` navigates to `/inquiry` and sets `PUBLIC_INQUIRY`
- Render: `case 'PUBLIC_INQUIRY'` renders `<PublicInquiryPage>` with `activeSection: 'inquiry'`

### 28.4 Phase 2 Deferrals (Recorded)

- General/no-supplier-context endpoint support — deferred to `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001`
- B2C product/category context handoff (`product_slug`, `category_slug`, `source_surface`) — deferred, backend-gated
- Industry cluster inquiry context terms — deferred (`INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001`)
- Message / free-text field — deferred; not in current endpoint schema

### 28.5 Implementation Commit Reference

- **Commit message:** `[TEXQTIC] public: implement public inquiry intent capture`
- **Commit hash:** `3b1971b`

---

## 29. Public Inquiry Intent-Capture Page — Verification Close — 2026-07-08

**Unit ID:** PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001-VERIFY-CLOSE
**Date:** 2026-07-08
**Status:** VERIFIED_COMPLETE
**Verified by:** Paresh
**Implementation commit:** `3b1971b`

### 29.1 Verification Protocol

Production URL: `https://app.texqtic.com`
Backend health: `GET /api/health` → `200 {"status":"ok"}` ✅
Playwright browser automation used for all route and behavior checks.

### 29.2 Verification Results

| Check | Route / Target | Result | Notes |
|---|---|---|---|
| Route loads | `/inquiry` | PASS | No-context mode, "Looking for a specific supplier to enquire about?" |
| SEO metadata | `/inquiry` | PASS | title=`Express Interest — TexQtic`, canonical=`https://app.texqtic.com/inquiry`, robots=`index, follow`, description+OG+Twitter all present |
| Trailing slash | `/inquiry/` | PASS | No-context mode, canonical strips trailing slash |
| Navbar Inquire link | `/inquiry` | PASS | "Inquire" present in mobile hamburger nav |
| Supplier-context form | `/inquiry?supplierSlug=qa-gmt-d&sourceSurface=SUPPLIER_PROFILE` | PASS | Form renders; 3 fields only (`inquiry-category`, `inquiry-geo`, `inquiry-volume`); no PII fields |
| Canonical on supplier URL | `/inquiry?supplierSlug=qa-gmt-d&sourceSurface=SUPPLIER_PROFILE` | PASS | Canonical = `https://app.texqtic.com/inquiry` (no query params) |
| `sourceSurface` exclusion | Live submission | PASS | `sourceSurface` query param correctly ignored; not in POST payload |
| Live submission payload | POST to `/api/public/inquiry/submit` | PASS | `{ supplier_slug: 'qa-gmt-d', inquiry_category: 'GENERAL', geo_band: 'South Asia', volume_band: '500-1000 units' }` — no PII, no forbidden fields |
| Success state | `/inquiry?supplierSlug=qa-gmt-d` | PASS | "Your interest has been recorded." + "Create account to follow up" CTA; form replaced |
| Invalid slug | `/inquiry?supplierSlug=INVALID%20Slug!` | PASS | No-context mode shown (INVALID_SLUG rejected by `/^[a-z0-9-]+$/` regex) |
| `/products` SEO | `/products` | PASS | canonical=`https://app.texqtic.com/products`, robots=`index, follow` |
| `/products/category/garments` | `/products/category/garments` | PASS | canonical=`https://app.texqtic.com/products/category/garments`, robots=`index, follow` |
| Unknown category | `/products/category/unknown-slug` | PASS | robots=`noindex, nofollow` |
| `/collections` SEO | `/collections` | PASS | canonical=`https://app.texqtic.com/collections`, robots=`index, follow` |
| `/collections/natural-fabric-stories` | `/collections/natural-fabric-stories` | PASS | canonical correct, robots=`index, follow` |
| Supplier profile inline inquiry | `/supplier/qa-gmt-d` | PASS | Inline inquiry form present and unaffected; `inquiry-category`, `inquiry-geo`, `inquiry-volume` fields present |
| Console runtime errors | All verified routes | PASS | No runtime errors detected |

### 29.3 Public / Private Boundary

- All public routes served with correct SEO metadata (`index, follow` on valid routes, `noindex, nofollow` on error/unknown paths)
- No PII fields on any public inquiry surface
- No payment, order, checkout, or RFQ language on public surfaces
- `sourceSurface` excluded from all POST payloads
- Auth CTA present on success state; no transactional behavior
- Inline supplier profile inquiry unaffected by standalone page addition

### 29.4 Deferred Items (Not Implemented in This Unit)

- `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` — general/multi-context inquiry endpoint design
- Phase 2: product-context and category-context inquiry (`product_slug`, `category_slug`, `source_surface` backend attribution)
- Message / free-text field — deferred; not in current endpoint schema
- B2C handoff Phase 2 (Page 12 authenticated continuation)
- JSON-LD structured data for inquiry page
- Sitemap entry for `/inquiry`
- Domain strategy (app.texqtic.com vs texqtic.com consolidation)
- Industry cluster inquiry context terms (`INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001`)

### 29.5 Next Unit

`PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001`

---

## 30. Public Inquiry Endpoint Context Extension — Design — 2026-07-08

**Unit ID:** PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001
**Status:** DESIGN_COMPLETE
**Date:** 2026-07-08
**Commit:** (see close commit)
**Artifact:** `governance/units/PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001.md`

### 30.1 Purpose

Defines the Phase 2 extension of `POST /api/public/inquiry/submit` to support general
(non-supplier-scoped) inquiry and multi-context inquiry from product, category, and
collection surfaces. Design-only — no runtime changes in this unit.

### 30.2 Key Design Decisions

| # | Decision |
|---|---|
| 1 | `supplier_slug` becomes OPTIONAL in Phase 2 (was required in Phase 1) |
| 2 | Context exclusivity rule: `supplier_slug` cannot coexist with `product_slug`, `category_slug`, or `collection_slug` |
| 3 | `source_surface` — optional advisory enum; 12 values; server normalizes unknown values to `DIRECT` |
| 4 | `product_slug` — format-validated only; no existence gate (advisory pass-through) |
| 5 | `category_slug` — format-validated + config-checked; unapproved slugs silently dropped (fail-closed, no 404 leak) |
| 6 | `collection_slug` — format-validated + config-checked; unapproved slugs silently dropped |
| 7 | `message` — max 500 chars; email/phone patterns → reject with 400; HTML stripped; never echoed in response |
| 8 | Response schema unchanged (opaque 202) |
| 9 | No schema/migration required — `afterJson` JSONB absorbs new context fields |
| 10 | Rate limit unchanged: 20 req / 15 min / IP |
| 11 | `buyer_inquiry.created.v1` event payload extended with Phase 2 context fields |
| 12 | Phase 1 payloads remain backward-compatible without change |

### 30.3 Implementation Sequencing

1. `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001` — backend / OpenAPI / service / event contract
2. `PUBLIC-INQUIRY-GENERAL-MODE-IMPLEMENTATION-001` — frontend general mode in `PublicInquiryPage`
3. `PUBLIC-INQUIRY-CONTEXT-HANDOFF-IMPLEMENTATION-001` — CTA integration in product/category/collection pages
4. `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-VERIFY-CLOSE` — production verification

### 30.4 Deferred Items

- Layer 7 taxonomy `INQUIRY_CONTEXT_TERMS` — gated on `INDUSTRY-CLUSTER-TAXONOMY-DECISION-001` ACCEPTED
- Authenticated continuation / CRM routing
- Sitemap and JSON-LD for `/inquiry`
- Rate limit differentiation by source_surface

### 30.5 Next Unit

`PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001`
