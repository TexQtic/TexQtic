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
  - READY_FOR_SYNC
- Dependencies:
  - INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
- Likely files:
  - components/Public/PublicProductDetail.tsx
  - services/publicB2CService.ts
- Verification plan:
  - Slug resolution and safe 404/unavailable behavior
  - Conditional passport link behavior
- Suggested commit message:
  - [TEXQTIC] public: sync b2c product detail baseline governance
- Relationship to Industry and D2C:
  - Industry taxonomy dependent; informs D2C later

### 3) B2C-CATEGORY-TAXONOMY-ALIGNMENT-001
- Purpose:
  - Align all B2C category and material vocabulary to approved taxonomy.
- Repo truth:
  - Partial category cards and tags exist but no dedicated alignment unit completed.
- Readiness:
  - READY_FOR_GOVERNANCE_ALIGNMENT
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
  - READY_FOR_SYNC
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

Preferred next sequence (updated 2026-05-18 after B2C-PUBLIC-BROWSE-BASELINE-SYNC-001 closure):
1. B2C-PRODUCT-DETAIL-BASELINE-SYNC-001 (READY_FOR_SYNC — may pair with browse sync or run immediately after)
2. B2C-CATEGORY-TAXONOMY-ALIGNMENT-001 (READY_FOR_GOVERNANCE_ALIGNMENT — precondition for all category story work)
3. B2C-DPP-PASSPORT-LINKAGE-SYNC-001
4. B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001 (DESIGN_GATED — requires taxonomy alignment first)
5. SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 or B2C-SEO-METADATA-EXPANSION-DESIGN-001 depending on governance sequencing
6. PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001 or B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001 depending on inquiry sequencing decision

Completed and no longer in queue:
- TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 — CLOSED (D2C public-surface slice production-verified 2026-05-18)
- B2C-PUBLIC-BROWSE-BASELINE-SYNC-001 — COMPLETED 2026-05-18 (see section 17)

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

**Primary next unit:** `B2C-PRODUCT-DETAIL-BASELINE-SYNC-001`
- Status: READY_FOR_SYNC
- Product detail baseline is confirmed implemented and production-verified; this sync unit will formally record it.
- May be run immediately; no additional dependency required.

**After product detail sync:**
- `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` — precondition for all B2C category story page work.
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
- **Commit hash:** TBD — record after commit.
