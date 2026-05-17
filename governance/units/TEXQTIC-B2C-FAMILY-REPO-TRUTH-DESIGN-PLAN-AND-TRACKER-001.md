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
  - D2C collections remain stub-only.
  - B2C and D2C must stay separate until D2C family planning and collection semantics are decided.
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

### Relationship to collections and D2C stubs
- Public collections routes and components exist as stub and unavailable surfaces.
- Collections pages explicitly communicate coming soon, public-safe preview boundaries, and authenticated continuation.
- Current collections implementation does not establish D2C collection semantics.

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
- D2C relationship is partially implied but not fully governed in a dedicated D2C family tracker.
- Collections remain stub-only and are not a defined D2C object model yet.
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
- D2C collections remain stub-only under current repo truth.
- D2C family tracker must be created separately.
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
  - READY_FOR_SYNC
- Dependencies:
  - INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
- Likely files:
  - components/Public/B2CBrowse.tsx
  - services/publicB2CService.ts
  - governance decision references
- Verification plan:
  - Browse route and rendering continuity
  - Field exposure review against boundary
- Suggested commit message:
  - [TEXQTIC] public: sync b2c browse baseline governance
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
  - Collections are stub-only; D2C semantics unresolved.
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
- D2C is collection/story/early-access family and needs its own tracker.
- Do not implement D2C collection semantics in B2C units.
- D2C tracker should follow immediately after this B2C tracker.

## 14. Future Governance Sync Targets

Potential sync targets after acceptance of this tracker:
- docs/product-truth/*
- docs/governance/*
- governance/decisions/*
- governance/units/*
- governance/units/TEXQTIC-INDUSTRY-CLUSTER-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md
- governance/decisions/INDUSTRY-CLUSTER-TAXONOMY-DECISION-001.md
- future DPP and trust tracker artifacts if introduced
- future TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 artifact

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

Preferred next sequence:
1. TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001
2. B2C-CATEGORY-TAXONOMY-ALIGNMENT-001
3. B2C-DPP-PASSPORT-LINKAGE-SYNC-001
4. B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001
5. SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 or B2C-SEO-METADATA-EXPANSION-DESIGN-001 depending on governance sequencing
6. PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001 or B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001 depending on inquiry sequencing decision

## Governance Notes

- Planning and tracker only; no runtime changes.
- No schema, API, OpenAPI, projection, migration, or data changes are included in this unit.
- This document is the canonical B2C family repo-truth tracker and phased implementation queue anchor.
