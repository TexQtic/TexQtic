# TexQtic D2C Family Repo Truth Design Plan and Tracker

## 1. Status Summary

- Why D2C is now a dedicated family:
  - D2C is a distinct collection and story continuity family, not the same as B2C product browse and product detail.
  - Existing collections pages are public-safe stubs and placeholders, which creates governance risk if future units infer full D2C runtime semantics from current placeholder copy.
  - D2C needs a canonical tracker to prevent drift across collection semantics, origin storytelling, early-access handoff, trust linkage, SEO scale, and B2C boundary decisions.
- Relationship to Public Attraction Layer:
  - D2C currently contributes attraction and concept framing only.
  - It does not currently implement production collection runtime objects, collection commerce flows, or collection-level private workflows.
- Relationship to B2C:
  - B2C remains product and category discovery.
  - D2C remains collection and early-access planning context.
  - B2C and D2C are related but distinct and must not define each other’s object semantics.
- Relationship to Industry and Cluster taxonomy:
  - D2C vocabulary and claims must reuse INDUSTRY-CLUSTER-TAXONOMY-DECISION-001.
  - D2C must not invent origin, artisan, cluster, sustainability, or certification claims.
- Relationship to DPP and Trust:
  - Product-level trust and passport behavior is conditional.
  - Collection-level DPP and passport linkage is not implemented and not approved by current repo truth.
- Relationship to Inquiry:
  - Collection interest or early-access inquiry context can be designed later, but schema-governed boundaries are required first.
- Relationship to SEO:
  - Current D2C SEO support is basic and not sufficient for scalable collection stories and slugs.
- Relationship to authenticated handoff:
  - Public collection surfaces currently point to authenticated continuation for deeper workflows.
- Current status of collection stubs:
  - Public collections list is a stub-only surface.
  - Public collection detail route currently resolves to safe unavailable placeholder behavior.
  - D2C runtime is not yet implemented under current repo truth.

## 2. Current Repo Truth

### D2C and collections public routes and states in App.tsx
- App state includes PUBLIC_COLLECTIONS and PUBLIC_COLLECTION_DETAIL_UNAVAILABLE.
- Path handling includes:
  - /collections -> PUBLIC_COLLECTIONS
  - /collections/:slug -> PUBLIC_COLLECTION_DETAIL_UNAVAILABLE
- Runtime switch includes:
  - PublicCollectionsStub for PUBLIC_COLLECTIONS
  - PublicCollectionUnavailable for PUBLIC_COLLECTION_DETAIL_UNAVAILABLE

### Collections stub component and behavior
- Component: components/Public/PublicCollectionsStub.tsx
- Behavior and posture:
  - Explicitly labels collections as coming soon.
  - Frames surface as public-safe preview and concept language.
  - Explicitly routes deep workflows (saving, checkout, inquiry, early access, private pricing, documents) into authenticated paths.
  - Provides safe action pathways to browse products, explore B2B, sign in, and request/list products.

### Collection unavailable component and behavior
- Component: components/Public/PublicCollectionUnavailable.tsx
- Behavior and posture:
  - Displays safe unavailable placeholder for collection slug detail path.
  - States collection may not be published or may require authenticated workflows.
  - Provides safe handoff buttons to collections list, browse products, sign-in, and optional B2B exploration.

### Existing collection-related service/API/projection references
- No dedicated public collections service contract exists in frontend services for collection list/detail runtime data.
- Public B2C service currently exposes product browse and product detail only.
- Public backend routes include B2C product browse/detail and other public endpoints, but no public collections projection endpoints are evidenced in current inspected route surfaces.

### Existing schema models or fields that may look collection-like
- server/prisma/schema.prisma includes product catalog, cart, and order models, but no canonical collection object semantics are defined in this tracker scope.
- Current schema evidence does not establish a first-class public D2C collection runtime model in current inspected surfaces.

### OpenAPI collection and D2C contract evidence
- shared/contracts/openapi.tenant.json includes public B2C product and public DPP contracts.
- No explicit public collection endpoints were confirmed in this unit’s inspected contract sections.
- Tenant-authenticated cart, checkout, and order contracts exist but are private/authenticated surfaces, not public collection runtime evidence.

### B2C product/detail relationship to collections
- B2C product detail provides product-level trust and conditional passport behavior.
- Collections stub references product browse continuation and concept linkage.
- No approved semantics currently map products into a canonical collection object model.

### DPP/passport/trust relationship to collections
- Product-level passport is conditional when publicPassportId exists.
- No collection-level public passport linkage behavior is implemented or contract-backed in current repo truth.

### Early-access and auth handoff behavior evidence
- Public collections stub contains early-access/auth continuation language and explicit handoff framing.
- Current handoff behavior is narrative plus sign-in/request-access actions; no dedicated early-access runtime flow is implemented.

### Evidence of cart/checkout/wishlist/order exposure on public collection pages
- Public collection pages contain no cart, checkout, wishlist, or order interaction implementation.
- Copy explicitly keeps these workflows in authenticated surfaces.

### SEO metadata and route-title support for collections
- Collections routes exist, but scalable D2C SEO strategy for collection storytelling/slugs is not established in this unit.
- No evidence in this unit of mature collection-specific canonical/sitemap governance.

## 3. Current D2C Capabilities

- Public collection listing stub:
  - Available as a static public-safe concept page.
- Public collection detail unavailable placeholder:
  - Available for /collections/:slug as safe unavailable behavior.
- Back/continuation/handoff behavior:
  - Safe pathway actions to browse, B2B, sign in, request access.
- Public-safe copy boundaries:
  - Explicitly keeps private workflows out of public surface.
- Neighbor public surfaces:
  - Integrates with public product browse, B2B discovery, trust, industry, and aggregator neighbors through existing app-state routes.
- Relationship to B2C product browse/detail:
  - D2C collection concept currently references B2C discovery but does not define product-to-collection semantics.

## 4. Current Gaps

- No canonical D2C family tracker existed before this unit.
- Collection semantics are not decided.
- Collection data model and projection are not decided.
- Collection detail projection is not designed.
- Collection-level DPP/passport linkage is not decided.
- D2C origin and storytelling governance is not formally defined for runtime.
- Early-access/auth continuation governance is not fully specified for implementation.
- D2C SEO metadata and sitemap strategy are not mature.
- D2C inquiry/intent handoff design is not finalized.
- No public cart/checkout/wishlist/order flows should be added without bounded decisions and separate units.

## 5. Public and Private Boundary

### Allowed public
- Static collection placeholder copy.
- Public-safe collection concept language.
- Public-safe product/category/material references only when backed by approved B2C/taxonomy rules.
- Trust/passport language only where available and evidence-backed.
- Early-access/auth handoff language without exposing private workflow details.
- Inquiry handoff context only after schema-governed approval.

### Forbidden public
- Private tenant/org/user/internal identifiers.
- Private supplier records and documents.
- Private pricing/inventory unless explicitly approved in public projection policy.
- Buyer intent or RFQ private payloads.
- Private contacts.
- Rankings/scores/recommendations.
- AI/vector outputs.
- Aggregator intelligence.
- Unsupported origin/cluster/artisan/sustainability/certification claims.
- Universal DPP/passport coverage claims.
- Collection-level verification claims without evidence.
- Checkout/cart/wishlist/order flow implementation on public attraction pages.

## 6. Industry and Cluster Taxonomy Dependency

D2C must reuse INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 rules:

- Approved category terms:
  - D2C collection narrative must use approved category vocabulary only.
- Approved material/fabric terms:
  - D2C material language must map to approved taxonomy and proven product fields.
- Approved role/segment terms:
  - Supplier-role and value-chain references must align with approved taxonomy terms.
- Approved broad cluster language:
  - D2C may use broad cluster framing only; specific factual cluster claims remain evidence-gated.
- Evidence-gated claims:
  - Origin, capability, certification, sustainability, and location claims require approved evidence backing.
- Forbidden claims:
  - Unsupported/private/universal claims remain prohibited.
- Where-available trust/passport language:
  - Trust/passport claims must remain conditional.

Also:
- D2C must not invent cluster/origin/artisan/sustainability claims.
- D2C collection pages must wait for collection semantics and approved config/projection design.
- D2C SEO expansion must align with taxonomy and SEO foundation strategy.

## 7. B2C Relationship and Boundary

- B2C is product/category discovery.
- D2C is collection/story/early-access planning family.
- B2C product detail may inform D2C product association candidates, but cannot define collection semantics.
- D2C must not backfill unapproved B2C category/origin claims.
- B2C-D2C boundary decision remains required where ambiguity persists.

## 8. DPP and Trust Dependency

- Collection-level passport/trust linking is not assumed.
- Product-level passport links are conditional only when publicPassportId exists.
- Collection-level DPP/passport linkage requires a future dedicated decision and design sequence.
- No universal DPP/passport/trust coverage claims are allowed.
- D2C trust-linking behavior must align with future DPP trust linking governance units.

## 9. SEO Relationship

- Current D2C SEO support is limited in current repo truth for scalable collection story expansion.
- D2C collection/story SEO expansion depends on SEO-SITEMAP-METADATA-STRUCTURED-DATA-001.
- Collection slug/story runtime pages should not be implemented before collection semantics and SEO route strategy are clear.

## 10. Inquiry / Early-Access / Auth Handoff Relationship

- D2C can later support collection-interest or early-access handoff.
- Inquiry or early-access context must be schema-governed and bounded.
- Do not over-capture buyer intent.
- Do not expose private inquiry content publicly.
- Authenticated continuation must remain separate from public story claims.

## 11. Recommended D2C Implementation Queue

### 1) D2C-COLLECTIONS-STUB-BASELINE-SYNC-001
- Purpose:
  - Reconfirm and lock public collections stub and unavailable behaviors against current boundaries.
- Repo truth:
  - Stubs exist and are verified.
- Readiness:
  - READY_FOR_SYNC
- Dependencies:
  - INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
  - TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001
- Likely files:
  - components/Public/PublicCollectionsStub.tsx
  - components/Public/PublicCollectionUnavailable.tsx
- Verification plan:
  - Route continuity and copy boundary checks
  - No runtime semantic expansion
- Suggested commit message:
  - [TEXQTIC] public: sync d2c collections stub baseline
- Relationship to Industry/B2C/DPP:
  - Industry and B2C dependent; DPP neutral

### 2) D2C-COLLECTION-SEMANTICS-DECISION-001
- Purpose:
  - Decide what a collection object is (campaign, capsule, product group, supplier story, etc.).
- Repo truth:
  - Semantics currently undefined.
- Readiness:
  - DECISION_GATED
- Dependencies:
  - D2C tracker completion
  - B2C/D2C boundary review
- Likely files:
  - governance/decisions/*
- Verification plan:
  - Decision completeness and non-overlap with B2C semantics
- Suggested commit message:
  - [TEXQTIC] governance: decide d2c collection semantics
- Relationship to Industry/B2C/DPP:
  - Critical for all downstream D2C and DPP linking units

### 3) D2C-COLLECTION-STATIC-CONCEPT-COPY-ALIGNMENT-001
- Purpose:
  - Align collection concept copy with taxonomy claims and evidence-gated constraints.
- Repo truth:
  - Copy exists but should be aligned post-semantics decision.
- Readiness:
  - READY_FOR_ALIGNMENT
- Dependencies:
  - D2C-COLLECTION-SEMANTICS-DECISION-001
  - Industry taxonomy decision
- Likely files:
  - components/Public/PublicCollectionsStub.tsx
  - components/Public/PublicCollectionUnavailable.tsx
- Verification plan:
  - Claim boundary scans
  - Evidence-gate compliance
- Suggested commit message:
  - [TEXQTIC] public: align d2c collection concept copy
- Relationship to Industry/B2C/DPP:
  - Industry and B2C boundary dependent

### 4) D2C-COLLECTIONS-DATA-MODEL-DESIGN-001
- Purpose:
  - Design D2C collection data model and governance attributes.
- Repo truth:
  - Model currently undefined.
- Readiness:
  - DESIGN_GATED
- Dependencies:
  - D2C-COLLECTION-SEMANTICS-DECISION-001
- Likely files:
  - governance docs
  - design artifacts
- Verification plan:
  - model completeness and boundary compliance
- Suggested commit message:
  - [TEXQTIC] design: define d2c collections data model
- Relationship to Industry/B2C/DPP:
  - Enables projection and trust-link design

### 5) PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001
- Purpose:
  - Design public-safe collections list projection contract.
- Repo truth:
  - No current list projection endpoint.
- Readiness:
  - DESIGN_GATED
- Dependencies:
  - D2C-COLLECTIONS-DATA-MODEL-DESIGN-001
  - Industry taxonomy and boundary decisions
- Likely files:
  - server design docs
  - openapi planning artifacts
- Verification plan:
  - projection safety gates and field allowlist
- Suggested commit message:
  - [TEXQTIC] design: define public collections projection
- Relationship to Industry/B2C/DPP:
  - Industry/B2C aligned; DPP optional at list level

### 6) PUBLIC-COLLECTIONS-PROJECTION-IMPLEMENTATION-001
- Purpose:
  - Implement approved public collections list projection.
- Repo truth:
  - Not implemented.
- Readiness:
  - BLOCKED_ON_PROJECTION_DESIGN
- Dependencies:
  - PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001
- Likely files:
  - server/src/routes/public.ts
  - server/src/services/*projection*
  - services/*
  - components/Public/*
- Verification plan:
  - no private leakage
  - route contract compliance
- Suggested commit message:
  - [TEXQTIC] public: implement collections list projection
- Relationship to Industry/B2C/DPP:
  - Must preserve B2C boundary and taxonomy rules

### 7) PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001
- Purpose:
  - Design public collection detail projection semantics and field boundaries.
- Repo truth:
  - Detail path currently unavailable placeholder.
- Readiness:
  - DESIGN_GATED
- Dependencies:
  - D2C-COLLECTIONS-DATA-MODEL-DESIGN-001
  - B2C-D2C-BOUNDARY-DECISION-001
- Likely files:
  - design and governance artifacts
- Verification plan:
  - detail field allowlist and evidence-gated claim map
- Suggested commit message:
  - [TEXQTIC] design: define public collection detail projection
- Relationship to Industry/B2C/DPP:
  - Strong cross-family dependency

### 8) PUBLIC-COLLECTION-DETAIL-PROJECTION-IMPLEMENTATION-001
- Purpose:
  - Implement approved public collection detail projection.
- Repo truth:
  - Not implemented.
- Readiness:
  - BLOCKED_ON_DETAIL_DESIGN
- Dependencies:
  - PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001
- Likely files:
  - server/src/routes/public.ts
  - server/src/services/*projection*
  - components/Public/PublicCollectionUnavailable.tsx
- Verification plan:
  - safe not-found behavior
  - no private leakage
- Suggested commit message:
  - [TEXQTIC] public: implement collection detail projection
- Relationship to Industry/B2C/DPP:
  - Must preserve taxonomy and B2C boundary

### 9) PUBLIC-DPP-COLLECTION-LINKING-DESIGN-001
- Purpose:
  - Design rules for collection-level DPP/passport linkage.
- Repo truth:
  - No collection-level linking currently established.
- Readiness:
  - DESIGN_GATED
- Dependencies:
  - D2C-COLLECTION-SEMANTICS-DECISION-001
  - DPP trust governance decisions
- Likely files:
  - governance decisions and design docs
- Verification plan:
  - conditionality and evidence requirements
- Suggested commit message:
  - [TEXQTIC] design: define d2c collection dpp linking
- Relationship to Industry/B2C/DPP:
  - DPP critical; must preserve no-universal-coverage rule

### 10) PUBLIC-DPP-COLLECTION-LINKING-IMPLEMENTATION-001
- Purpose:
  - Implement approved collection-level DPP/passport linkage.
- Repo truth:
  - Not implemented.
- Readiness:
  - BLOCKED_ON_DPP_LINKING_DESIGN
- Dependencies:
  - PUBLIC-DPP-COLLECTION-LINKING-DESIGN-001
- Likely files:
  - server projections/routes
  - public detail components
  - openapi contracts
- Verification plan:
  - conditional link rendering
  - no universal trust claims
- Suggested commit message:
  - [TEXQTIC] public: implement collection dpp linking
- Relationship to Industry/B2C/DPP:
  - DPP and taxonomy dependent

### 11) D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001
- Purpose:
  - Design bounded early-access and auth-handoff patterns for D2C collections.
- Repo truth:
  - Current handoff exists only as concept copy and generic sign-in actions.
- Readiness:
  - DESIGN_GATED
- Dependencies:
  - D2C-COLLECTION-SEMANTICS-DECISION-001
  - Inquiry/intent governance constraints
- Likely files:
  - governance and design artifacts
- Verification plan:
  - no buyer intent over-capture
  - auth boundary clarity
- Suggested commit message:
  - [TEXQTIC] governance: design d2c early access handoff
- Relationship to Industry/B2C/DPP:
  - B2C boundary and trust dependencies apply

### 12) D2C-EARLY-ACCESS-AUTH-HANDOFF-IMPLEMENTATION-001
- Purpose:
  - Implement approved early-access/auth-handoff surface for collections.
- Repo truth:
  - Not implemented.
- Readiness:
  - BLOCKED_ON_HANDOFF_DESIGN
- Dependencies:
  - D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001
- Likely files:
  - components/Public/*
  - possible auth entry integration points
- Verification plan:
  - safe public handoff
  - no private workflow leakage
- Suggested commit message:
  - [TEXQTIC] public: implement d2c early access auth handoff
- Relationship to Industry/B2C/DPP:
  - Cross-family boundary dependent

### 13) D2C-ORIGIN-STORYTELLING-GOVERNANCE-001
- Purpose:
  - Define D2C origin/artisan/sustainability storytelling governance with evidence gates.
- Repo truth:
  - Not formally defined.
- Readiness:
  - DECISION_GATED
- Dependencies:
  - Industry taxonomy decision
  - D2C collection semantics decision
- Likely files:
  - governance/decisions/*
- Verification plan:
  - explicit allowed/evidence-gated/forbidden claims
- Suggested commit message:
  - [TEXQTIC] governance: define d2c origin storytelling rules
- Relationship to Industry/B2C/DPP:
  - Industry and DPP-dependent

### 14) D2C-SEO-METADATA-EXPANSION-DESIGN-001
- Purpose:
  - Design D2C collection SEO metadata and ownership matrix.
- Repo truth:
  - SEO scale strategy for collections not mature.
- Readiness:
  - DESIGN_GATED
- Dependencies:
  - SEO-SITEMAP-METADATA-STRUCTURED-DATA-001
  - collection semantics decision
- Likely files:
  - governance/docs artifacts
- Verification plan:
  - route-level metadata matrix and canonical strategy
- Suggested commit message:
  - [TEXQTIC] governance: design d2c seo metadata expansion
- Relationship to Industry/B2C/DPP:
  - taxonomy and boundary dependent

### 15) D2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001
- Purpose:
  - Implement approved D2C SEO metadata expansion.
- Repo truth:
  - Not implemented.
- Readiness:
  - BLOCKED_ON_SEO_DESIGN
- Dependencies:
  - D2C-SEO-METADATA-EXPANSION-DESIGN-001
- Likely files:
  - App.tsx
  - index.html
  - SEO utilities
- Verification plan:
  - metadata/canonical/sitemap validation
- Suggested commit message:
  - [TEXQTIC] public: implement d2c seo metadata expansion
- Relationship to Industry/B2C/DPP:
  - taxonomy and SEO dependent

### 16) D2C-PRODUCTION-SMOKE-MATRIX-001
- Purpose:
  - Define recurring D2C production smoke matrix before runtime closure.
- Repo truth:
  - No dedicated D2C smoke matrix artifact yet.
- Readiness:
  - READY_FOR_GOVERNANCE_ARTIFACT
- Dependencies:
  - baseline sync and semantics decision milestones
- Likely files:
  - docs/governance
  - governance/units
- Verification plan:
  - matrix coverage across list/detail/handoff/trust boundaries
- Suggested commit message:
  - [TEXQTIC] governance: define d2c production smoke matrix
- Relationship to Industry/B2C/DPP:
  - cross-family quality gate

### 17) B2C-D2C-BOUNDARY-DECISION-001
- Purpose:
  - Resolve residual B2C vs D2C ownership ambiguity.
- Repo truth:
  - Boundaries are described but still require explicit decision hardening for future runtime.
- Readiness:
  - DECISION_GATED
- Dependencies:
  - TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001
  - D2C-COLLECTION-SEMANTICS-DECISION-001
- Likely files:
  - governance/decisions/*
- Verification plan:
  - no-overlap matrix between product/category and collection/story objects
- Suggested commit message:
  - [TEXQTIC] governance: decide b2c d2c boundary
- Relationship to Industry/B2C/DPP:
  - central cross-family dependency

## 12. Recommended Sequencing

- Immediate:
  - Create D2C tracker (this unit).
  - Run D2C-COLLECTIONS-STUB-BASELINE-SYNC-001.
- Early governance:
  - Run D2C-COLLECTION-SEMANTICS-DECISION-001.
  - Run B2C-D2C-BOUNDARY-DECISION-001 if ambiguity remains.
  - Run D2C-COLLECTION-STATIC-CONCEPT-COPY-ALIGNMENT-001.
- Design before implementation:
  - D2C-COLLECTIONS-DATA-MODEL-DESIGN-001.
  - PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001 and PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001.
- Trust linkage before claim expansion:
  - PUBLIC-DPP-COLLECTION-LINKING-DESIGN-001 before any collection-level DPP claim implementation.
- Early-access before runtime:
  - D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001 before implementation.
- SEO foundation before slug/story scale:
  - SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 then D2C SEO expansion design and implementation.
- Closure discipline:
  - D2C-PRODUCTION-SMOKE-MATRIX-001 before runtime closure declarations.

## 13. B2C / D2C Carry-Forward

- B2C is product/category discovery.
- D2C is collection/story/early-access family.
- D2C must not redefine B2C product/category semantics.
- B2C must not define D2C collection semantics.
- Future runtime units must preserve both boundaries.

## 14. Future Governance Sync Targets

Potential sync targets after acceptance of this tracker:
- docs/product-truth/*
- docs/governance/*
- governance/decisions/*
- governance/units/*
- governance/units/TEXQTIC-INDUSTRY-CLUSTER-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md
- governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md
- future DPP tracker units if introduced
- future SEO tracker units if introduced
- future inquiry tracker units if introduced

## 15. Acceptance Criteria

This tracker is complete only if:
- current D2C repo truth is summarized
- current D2C capabilities are summarized
- D2C gaps are listed
- public/private boundaries are explicit
- Industry/Cluster taxonomy dependency is explicit
- B2C relationship and boundary are explicit
- DPP/trust dependency is explicit
- SEO and inquiry/early-access dependencies are explicit
- implementation queue exists with readiness/dependencies
- no runtime implementation is included

Status for this unit:
- complete and ready for governance use as canonical D2C family tracker.

## 16. Next Recommended Units

Preferred next sequence:
1. D2C-COLLECTIONS-STUB-BASELINE-SYNC-001
2. D2C-COLLECTION-SEMANTICS-DECISION-001
3. B2C-D2C-BOUNDARY-DECISION-001 if repo truth shows ambiguity
4. B2C-CATEGORY-TAXONOMY-ALIGNMENT-001
5. B2C-DPP-PASSPORT-LINKAGE-SYNC-001
6. SEO-SITEMAP-METADATA-STRUCTURED-DATA-001
7. D2C-ORIGIN-STORYTELLING-GOVERNANCE-001

## Governance Notes

- Planning/tracker only; no runtime changes.
- No schema/API/OpenAPI/projection/migration/data changes are included in this unit.
- This document is the canonical D2C family repo-truth tracker and phased implementation queue anchor.
