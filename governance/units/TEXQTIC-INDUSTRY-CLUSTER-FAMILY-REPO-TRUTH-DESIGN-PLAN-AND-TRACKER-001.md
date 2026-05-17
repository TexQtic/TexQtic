# TexQtic Industry / Cluster Family Design Plan and Tracker

## Status Summary
- Why this is a major moat:
  - Industry and cluster framing matches how textile MSMEs, buyers, and ecosystem operators think (segment, region, capability, role, value-chain position).
  - It can become a cross-family backbone for B2B discovery, B2C storytelling, trust/origin narrative, DPP continuity, inquiry capture, and authenticated Aggregator handoff.
- Current public-page status:
  - Repo truth has a static public Industry/Cluster landing route state at `/industries` (not dynamic slug pages).
  - Existing public pages already include B2B discovery, B2C browse, Trust landing, public passport path, public supplier profile, and Aggregator preview.
- What exists:
  - Public read APIs for B2B suppliers, B2C products/product detail, supplier profile, inquiry submit, and DPP public/structured data.
  - Public-safe projection fields for segment/category/material/fabric/jurisdiction/role/certification/traceability signals.
- What is missing:
  - No canonical Industry/Cluster taxonomy object model dedicated to cluster-family runtime semantics.
  - No industry or cluster slug routes/pages (`/industries/:slug`, `/clusters/:slug`) and no taxonomy-backed cluster projection.
  - SEO infrastructure is minimal (document title only at runtime); no canonical/meta strategy, sitemap strategy, or robots policy governance for scalable indexability.
- Why this matters before B2C/D2C:
  - Without approved taxonomy/content governance, B2C/D2C pages risk fragmented or unsupported origin/cluster/category claims.
  - Industry/Cluster governance should become the shared truth source before deeper B2C/D2C narrative expansion.

## Current Repo Truth

### Routes and public entry support
- App state includes:
  - `PUBLIC_INDUSTRY_CLUSTER_LANDING`
  - `PUBLIC_B2B_DISCOVERY`
  - `PUBLIC_B2C_BROWSE`
  - `PUBLIC_TRUST_LANDING`
  - `PUBLIC_AGGREGATOR`
  - `PUBLIC_PASSPORT`
  - `PUBLIC_SUPPLIER_PROFILE`
- Path handling includes:
  - `/industries` -> `PUBLIC_INDUSTRY_CLUSTER_LANDING`
  - `/trust` -> trust landing
  - `/aggregator` -> static Aggregator preview
  - `/passport/:id` -> public passport
  - `/supplier/:slug` -> public supplier profile
  - `/product/:slug` and `/collections` paths
- No route evidence found for:
  - `/clusters`
  - `/locations`
  - `/category`
  - `/textile-clusters`
  - industry/cluster dynamic slug routes

### Public projection and API truth
- Public B2B projection (`/api/public/b2b/suppliers`, `/api/public/supplier/:slug`):
  - Public-safe supplier identity: `slug`, `legalName`, `orgType`, `jurisdiction`
  - Taxonomy fields: `primarySegment`, `secondarySegments[]`, `rolePositions[]`
  - Trust fields: `certificationCount`, `certificationTypes[]`, `hasTraceabilityEvidence`
  - Offering preview: `name`, `moq`, `imageUrl` (no private pricing leakage in B2B projection)
  - Eligibility/publication gates enforced in projection service (publication posture + eligibility posture)
- Public B2C projection (`/api/public/b2c/products`, `/api/public/b2c/products/:slug`):
  - Product browse/category signals: `category`, `material`, `fabricType`
  - Supplier association: `publicSupplierName`, `publicSupplierSlug`, supplier `jurisdiction`
  - Trust/passport fields: `hasTraceabilityEvidence`, `hasPassport`, optional `publicPassportId`, `trustSignals[]`
  - Public-safe status labels and related product cards
- Inquiry surface exists:
  - `POST /api/public/inquiry/submit` with public-safe payload and rate limit posture in route comments and OpenAPI contract.

### Schema and taxonomy support
- Found in schema:
  - Organization-level: `jurisdiction`, `primary_segment_key`, `secondary_segments`, `role_positions`, publication posture
  - Catalog-level: `productCategory`, `material`, `fabricType`, `catalogStage`, `stageAttributes`
  - DPP/product detail: origin-related fields such as `country_of_origin` in DPP product detail model
- Not found as canonical, first-class cluster/industry runtime taxonomy models:
  - No dedicated cluster taxonomy model
  - No explicit industry taxonomy registry model
  - No city/state/country decomposition for public cluster routing in organizations model (jurisdiction is present as broad string)

### SEO and metadata support
- Current support:
  - `App.tsx` sets `document.title` by app state (including Industry/Cluster landing title).
  - `index.html` has static title and basic head tags.
  - `vercel.json` is SPA fallback-first, with one special DPP context route header for `/dpp/v1/context.jsonld`.
- Gaps:
  - No robust per-page canonical tags
  - No managed meta description strategy by route/content entity
  - No sitemap generation strategy for public route families
  - No explicit robots strategy for future slug scale
  - No public structured data strategy for industry/cluster pages

### Relationship to B2B / B2C / DPP / Aggregator / Inquiry
- B2B: already provides segment/role/jurisdiction/certification/traceability signals useful for industry-family discovery entry pages.
- B2C: already provides category/material/fabricType and supplier context useful for category-family storytelling.
- DPP/Trust:
  - Public trust surface exists at `/trust`.
  - Public passport route exists at `/passport/:id`.
  - No evidence of a public passport directory; linking must remain availability-based, not directory-claimed.
- Aggregator:
  - Public Aggregator preview exists at `/aggregator`.
  - Authenticated Aggregator workspace remains separate and should be handoff-only from public pages.
  - No public ranking/score/recommendation exposure should be introduced.
- Inquiry:
  - Public inquiry submit endpoint exists; future Industry/Cluster pages can pass context fields under approved, public-safe schema.

## Public / Private Boundary

Allowed public:
- Static cluster/industry copy
- Approved taxonomy terms
- Public-safe supplier/product fields
- Trust references where available
- Generic region/category context

Forbidden public:
- Rankings
- Scores
- Private contacts
- Buyer intent
- RFQ data
- Inventory/pricing beyond explicitly approved public projection policy
- Private documents
- Unsupported factual claims
- Aggregator intelligence

## Implementation Queue

### 1) INDUSTRY-CLUSTER-STATIC-LANDING-001
- Purpose:
  - Ship a stable static page-10 family landing shell to anchor industry/cluster narrative in Public Attraction Layer.
- Repo truth:
  - Base route and component already exist (`/industries`, `PublicIndustryClusterLanding`).
- Readiness:
  - READY_FOR_CONTENT_REFINEMENT
- Dependencies:
  - None for static copy governance updates.
- Likely files:
  - `components/Public/PublicIndustryClusterLanding.tsx`
  - `App.tsx` (state/routing continuity)
- Verification plan:
  - Route resolution to `/industries`
  - No new API dependency
  - Boundary-safe copy review
- Suggested commit message:
  - `[TEXQTIC] public: refine static industry cluster landing copy`
- Sequencing vs B2C/D2C:
  - before B2C/D2C

### 2) INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
- Purpose:
  - Define canonical industry/cluster taxonomy and term governance (including allowed claims and evidence posture).
- Repo truth:
  - Segment/category fields exist but no canonical cluster-family taxonomy authority.
- Readiness:
  - READY_FOR_GOVERNANCE_DECISION
- Dependencies:
  - Product/governance sign-off; doctrinal alignment.
- Likely files:
  - `governance/decisions/*`
  - `docs/product-truth/*`
  - optional `shared/contracts/*` if API schema touched later
- Verification plan:
  - Decision doc completeness and accepted vocabulary list
  - Public/private claim boundaries explicitly codified
- Suggested commit message:
  - `[TEXQTIC] governance: decide industry cluster taxonomy authority`
- Sequencing vs B2C/D2C:
  - before B2C/D2C

### 3) INDUSTRY-CLUSTER-STATIC-CONFIG-001
- Purpose:
  - Introduce approved static config (industries, clusters, regions, segment cards, claims) as single source for static pages.
- Repo truth:
  - Existing landing content is static in component constants; no centralized taxonomy config file.
- Readiness:
  - BLOCKED_ON_TAXONOMY_DECISION
- Dependencies:
  - INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
- Likely files:
  - `components/Public/*` and/or `constants.tsx`
  - optional `services/*` for read-only config access
- Verification plan:
  - Config compiles and renders
  - No unsupported factual claims
- Suggested commit message:
  - `[TEXQTIC] public: add approved static industry cluster config`
- Sequencing vs B2C/D2C:
  - before B2C/D2C

### 4) INDUSTRY-CLUSTER-STATIC-SLUG-PAGES-001
- Purpose:
  - Add static slug pages generated from approved config (`/industries/:slug`, optional `/clusters/:slug`) without dynamic DB projection.
- Repo truth:
  - No slug pages exist today.
- Readiness:
  - BLOCKED_ON_STATIC_CONFIG
- Dependencies:
  - INDUSTRY-CLUSTER-STATIC-CONFIG-001
  - SEO routing governance decision
- Likely files:
  - `App.tsx`
  - `components/Public/*`
- Verification plan:
  - Slug route matching
  - 404 handling for unknown slug
  - Boundary-safe content checks
- Suggested commit message:
  - `[TEXQTIC] public: add static industry cluster slug pages`
- Sequencing vs B2C/D2C:
  - during B2C/D2C (if taxonomy is approved early), otherwise design-gated

### 5) SEO-SITEMAP-METADATA-STRUCTURED-DATA-001
- Purpose:
  - Build scalable SEO infrastructure for public families (title/meta/canonical/sitemap/robots/structured data policy).
- Repo truth:
  - Title updates exist; broader SEO stack absent.
- Readiness:
  - READY_FOR_DESIGN
- Dependencies:
  - Taxonomy decision
  - Public route inventory and ownership
- Likely files:
  - `index.html`
  - `App.tsx`
  - `vercel.json`
  - build/runtime SEO utility files
- Verification plan:
  - Route-level metadata correctness
  - Canonical consistency
  - sitemap content validation
- Suggested commit message:
  - `[TEXQTIC] public: add SEO metadata canonical and sitemap foundation`
- Sequencing vs B2C/D2C:
  - before B2C/D2C for foundation; continue during B2C/D2C for expansion

### 6) PUBLIC-CLUSTER-PROJECTION-DESIGN-001
- Purpose:
  - Design projection model for cluster/industry pages backed by approved fields and governance-safe aggregation logic.
- Repo truth:
  - B2B/B2C projections provide raw ingredients; no dedicated cluster projection.
- Readiness:
  - DESIGN_GATED
- Dependencies:
  - Taxonomy decision
  - SEO strategy
  - projection boundary and claim policy
- Likely files:
  - `server/src/services/*projection*`
  - `server/src/routes/public.ts`
  - `services/*`
  - `shared/contracts/openapi.tenant.json`
- Verification plan:
  - projection safety gate tests
  - no private-field leakage
  - claim verifiability review
- Suggested commit message:
  - `[TEXQTIC] design: define public industry cluster projection model`
- Sequencing vs B2C/D2C:
  - after initial B2C/D2C foundation; design can begin during B2C/D2C

### 7) INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001
- Purpose:
  - Add approved industry/cluster/category context carriage into public inquiry intake and downstream follow-up flows.
- Repo truth:
  - Inquiry submit endpoint already exists and can evolve under schema governance.
- Readiness:
  - PARTIALLY_READY
- Dependencies:
  - taxonomy decision
  - inquiry schema governance updates
- Likely files:
  - `server/src/routes/public.ts`
  - inquiry service layer files
  - `shared/contracts/openapi.tenant.json`
  - frontend public inquiry client/surfaces
- Verification plan:
  - request validation
  - event payload safety
  - no PII over-collection
- Suggested commit message:
  - `[TEXQTIC] public: add industry cluster context to inquiry intake`
- Sequencing vs B2C/D2C:
  - during B2C/D2C (or immediately after if inquiry expansion is deferred)

### 8) INDUSTRY-CLUSTER-AGGREGATOR-HANDOFF-001
- Purpose:
  - Add public-to-authenticated handoff patterns from industry/cluster pages into Aggregator workspace without exposing private intelligence.
- Repo truth:
  - Public Aggregator preview and authenticated Aggregator workspace are already separated.
- Readiness:
  - READY_FOR_HANDOFF_DESIGN
- Dependencies:
  - taxonomy decision
  - authenticated handoff UX and eligibility rules
- Likely files:
  - `components/Public/*`
  - `App.tsx`
  - Aggregator workspace entry/handoff utilities
- Verification plan:
  - handoff route correctness
  - no public ranking/score leakage
- Suggested commit message:
  - `[TEXQTIC] public: add industry cluster to aggregator handoff continuity`
- Sequencing vs B2C/D2C:
  - after B2C/D2C baseline; can start as design-gated during late B2C/D2C

## Recommended Sequencing

Immediately after static Page 10:
- INDUSTRY-CLUSTER-STATIC-LANDING-001 (confirm and harden static baseline)
- INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 (mandatory authority decision)

Before B2C/D2C:
- INDUSTRY-CLUSTER-STATIC-CONFIG-001
- SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 (foundation tier)

During B2C/D2C:
- INDUSTRY-CLUSTER-STATIC-SLUG-PAGES-001 (if taxonomy/config approved)
- INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001 (if inquiry strategy is active)
- SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 (expansion tier)

After B2C/D2C:
- PUBLIC-CLUSTER-PROJECTION-DESIGN-001 to implementation
- INDUSTRY-CLUSTER-AGGREGATOR-HANDOFF-001 runtime integration

Design-gated items:
- PUBLIC-CLUSTER-PROJECTION-DESIGN-001
- INDUSTRY-CLUSTER-AGGREGATOR-HANDOFF-001

## B2C/D2C Carry-Forward
B2C/D2C should not invent cluster/origin/category claims independently. It should reuse approved Industry/Cluster taxonomy and content once defined.

## Future Governance Sync Targets
Potential sync targets after acceptance of this tracker:
- `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md`
- `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` (or successor governance master)
- Relevant public boundary decisions in `governance/decisions/`
- If runtime/API work starts later: `shared/contracts/openapi.tenant.json`

## Governance Notes
- Planning/tracker only; no runtime changes.
- No route/API/projection/schema/migration changes are included in this unit.
- This document records current repo truth and a phased implementation queue so Industry/Cluster family work is preserved and does not get lost inside broader public attraction sequencing.
