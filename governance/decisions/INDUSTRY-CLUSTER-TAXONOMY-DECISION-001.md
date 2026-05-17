# TexQtic Industry / Cluster Taxonomy Decision

**Decision ID**: INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
**Status**: PROPOSED
**Created**: 2026-05-17
**Depends On**: TEXQTIC-INDUSTRY-CLUSTER-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 (commit 38cf6aa), INDUSTRY-CLUSTER-STATIC-LANDING-001 (verified)
**Blocks**: INDUSTRY-CLUSTER-STATIC-CONFIG-001, INDUSTRY-CLUSTER-STATIC-SLUG-PAGES-001, PUBLIC-CLUSTER-PROJECTION-DESIGN-001, TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001, TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001

---

## 1. Status

**Decision Status**: PROPOSED

This decision is complete and internally consistent. It establishes the canonical taxonomy authority that Industry / Cluster, B2C, D2C, SEO, Inquiry, DPP/Trust, and Aggregator handoff units must reuse.

**Recommended next step**: Stakeholder review and approval to move to ACCEPTED status.

No runtime implementation is included. This is governance authority only.

---

## 2. Purpose

**Why Industry / Cluster Taxonomy is Now a Cross-Family Authority**

TexQtic's public attraction layer must speak with one voice about textile industry structure, geographic clusters, supplier roles, and value-chain positioning. Without a shared taxonomy authority, downstream families (B2C storytelling, D2C collections, Inquiry context, SEO scaling, DPP/Trust linking, and Aggregator handoff) risk fragmented claims, unsupported factual assertions, and inconsistent discovery language.

This decision establishes that approved vocabulary:
- Is the single source of truth for public Industry / Cluster pages and future slug-based pages.
- Must be reused, not extended, by B2C category storytelling.
- Must be reused, not extended, by D2C collection framing.
- Must gate inquiry intake context.
- Must inform SEO strategy and sitemap structure.
- Must guide public DPP/Trust linking rules.
- Must bound public Aggregator preview language.

**Dependencies**:
- Public Attraction Layer depends on approved taxonomy for consistency.
- B2C depends on approved taxonomy to avoid invented claims.
- D2C depends on approved taxonomy to avoid collection-level factual errors.
- Inquiry depends on approved taxonomy to avoid over-capturing intent signals.
- SEO depends on approved taxonomy for canonical routing and metadata.
- DPP/Trust depends on approved taxonomy for linking rules.
- Aggregator depends on approved taxonomy for handoff language.

---

## 3. Current Repo Truth Confirmed

### Route and Page Truth
- App state `PUBLIC_INDUSTRY_CLUSTER_LANDING` exists; routes `/industries` to static component.
- Static component at `components/Public/PublicIndustryClusterLanding.tsx` (359 lines) is production-live.
- No dynamic `/industries/:slug`, `/clusters/:slug`, or similar routes exist.
- No canonical cluster/industry/segment taxonomy registry model exists in schema.

### Public B2B Projection (from `services/publicB2BService.ts` and `server/src/services/publicB2BProjection.service.ts`)
Available public-safe signals for B2B discovery:
- `slug`, `legalName`, `orgType`, `jurisdiction`
- `primarySegment` (string, single value)
- `secondarySegments[]` (array, junction-backed)
- `rolePositions[]` (array, junction-backed, e.g., supplier, manufacturer, trader, exporter, etc.)
- `certificationCount`, `certificationTypes[]`
- `hasTraceabilityEvidence` (boolean)
- Offering preview: product name, MOQ, image (no pricing in public B2B)

### Public B2C Projection (from `services/publicB2CService.ts` and `server/src/services/publicB2CProjection.service.ts`)
Available public-safe signals for B2C discovery:
- Product identity: `slug`, `name`, `imageUrl`
- Product category signals: `category`, `material`, `fabricType`
- Supplier context: `publicSupplierName`, `publicSupplierSlug`, supplier `jurisdiction`
- Trust signals: `hasTraceabilityEvidence`, `hasPassport`
- `publicPassportId` (conditional, only if public passport record exists)
- `trustSignals[]` (conditional, only if available)

### DPP / Passport Conditionality
- Public passport linking is conditional: pages must not imply universal coverage.
- Passport links exist only when `publicPassportId` field is populated.
- Trust signals appear only when supplier has marked data as `publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'` AND `publication_posture IN ('B2B_PUBLIC', 'B2C_PUBLIC', 'BOTH')`.

### Public Inquiry Surface
- `POST /api/public/inquiry/submit` endpoint exists with public-safe payload.
- Rate limit: 20 requests per 15 minutes per IP.
- Payload fields are governed by future inquiry schema decision.

### Authenticated Aggregator Separation
- Public Aggregator preview exists at `/aggregator` (static stub only).
- Authenticated Aggregator workspace is entirely separate; no public ranking/scoring/intelligence exposure exists.

### Existing Static Landing Vocabulary (from `PublicIndustryClusterLanding.tsx`)
Segment cards (6 categories):
- Yarn & Spinning
- Fabrics
- Garments
- Home Textiles
- Technical Textiles
- Textile Services

Cluster cards (4 broad labels):
- Textile manufacturing hubs
- Export-ready supplier networks
- Regional sourcing ecosystems
- MSME textile clusters

Trust / Origin Context (4 themes):
- Origin context (without specific country/origin claims beyond jurisdiction)
- Verification posture (without universal coverage claims)
- Passport context (with "where available" qualification)
- Protected private workflow (sourcing/negotiation/buyer intent)

Public / Private Boundary (4 clarifications):
- Public discovery (categories, segments, ecosystem direction)
- Authenticated sourcing workflows (deeper discovery, inquiries, business tools)
- Private commercial intelligence (scoring, recommendations, pricing, buyer intent)
- Trust and origin records where available (conditional, not universal)

---

## 4. Approved Taxonomy Layers

The Industry / Cluster taxonomy is structured in the following layers. Each layer represents a conceptual dimension for discovery and routing.

### Layer 1: Industry / Segment
The broad textile value-chain categories.
- Yarn & Spinning
- Fabrics
- Garments
- Home Textiles
- Technical Textiles
- Textile Services

**Governance**: This layer is backed by `organizations.primary_segment_key` and accessible via public B2B projection.

### Layer 2: Product Category
The finished product or service categories available in the textile ecosystem.
- Yarn products
- Fabric products
- Finished garments
- Home textile products
- Technical textile products
- Textile services (testing, consulting, logistics, etc.)

**Governance**: This layer is derived from B2C projection `category` field and existing `CatalogItem.productCategory` schema field.

### Layer 3: Material / Fabric Properties
The material and fabric composition signals.
- Cotton
- Polyester
- Wool
- Blended materials
- Silk
- Linen
- Synthetic fibers
- Natural fibers

**Governance**: This layer is accessible via B2C projection `material` and `fabricType` fields and `CatalogItem.material` schema field.

### Layer 4: Cluster / Region (Broad)
Broad geographic and organizational cluster labels without specific city-level factual claims.
- Textile manufacturing hubs
- Export-ready supplier networks
- Regional sourcing ecosystems
- MSME textile clusters
- Global supplier networks

**Governance**: This layer is reference-only in public pages; no schema model exists. Future units may create runtime cluster pages backed by approved config or projection.

### Layer 5: Role / Value-Chain Position
The supplier role or operational position in the textile value chain.
- Raw material suppliers
- Spinner
- Weaver
- Dyer
- Finisher
- Garment manufacturer
- Exporter
- Trader
- Service provider (testing, consulting, logistics, etc.)

**Governance**: This layer is backed by `organizations.role_positions` junction table and accessible via public B2B projection `rolePositions[]` array.

### Layer 6: Trust / Origin / DPP Evidence Layer
The availability and conditionality of trust, origin, and verification signals.
- Supplier certification status (backed by `certificationCount`, `certificationTypes[]`)
- Traceability posture (backed by `hasTraceabilityEvidence`)
- Public passport availability (backed by `publicPassportId`, conditional)
- Trust signals availability (backed by `trustSignals[]`, conditional)

**Governance**: All signals in this layer MUST be marked "where available" or equivalent on public pages. No claim of universal coverage.

### Layer 7: Public Inquiry Context Layer
The context signals captured in public inquiry intake.
- Industry / segment interest
- Product category interest
- Geographic interest
- Supplier role interest
- Inquiry type (general, sourcing, partnership, information)

**Governance**: Future INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001 unit must define which context fields are approved; no expansion beyond approved schema.

### Layer 8: Authenticated Continuation Layer
The deeper sourcing, negotiation, and commercial workflows available after sign-in.
- Supplier discovery with filtering
- RFQ (request for quote) workflows
- Inquiry follow-up and communication
- Negotiation and contracting
- Order management
- Commercial intelligence and recommendations

**Governance**: Public pages must reference authenticated continuation without exposing private workflows, pricing, scoring, or buyer intent.

---

## 5. Initial Approved Public Vocabulary

This vocabulary is approved for use on public-facing pages without requiring evidence or projection backing beyond the structural terms themselves.

### Approved Industry / Segment Terms
- Yarn & Spinning
- Fabrics
- Garments
- Home Textiles
- Technical Textiles
- Textile Services

**Usage rule**: May appear on static landing, slug pages, inquiry context, B2C category pages.
**Constraint**: Must not be extended or qualified without governance approval.

### Approved Product Category Terms
- Yarn products
- Fabric products
- Finished garments
- Home textile products
- Technical textile products
- Textile services

**Usage rule**: May appear on product browse pages, B2C category pages, inquiry context.
**Constraint**: Must align with B2C projection `category` field; no invented categories.

### Approved Material / Fabric Terms
- Cotton
- Polyester
- Wool
- Blended materials
- Silk
- Linen
- Synthetic fibers
- Natural fibers

**Usage rule**: May appear on product browse pages, product detail cards, material filter labels.
**Constraint**: Must align with B2C projection `material`, `fabricType` fields.

### Approved Broad Cluster / Region Labels
- Textile manufacturing hubs
- Export-ready supplier networks
- Regional sourcing ecosystems
- MSME textile clusters
- Global supplier networks

**Usage rule**: May appear on static landing, future slug pages, inquiry context.
**Constraint**: Must NOT include specific city names, country-specific claims, or unsupported factual assertions about cluster composition or capabilities.
**Exception**: Generic references to regions (e.g., "South Asia", "Europe", "Sub-Saharan Africa") are allowed only if corroborated by public supplier jurisdiction data.

### Approved Role / Value-Chain Position Terms
- Raw material suppliers
- Spinner
- Weaver
- Dyer
- Finisher
- Garment manufacturer
- Exporter
- Trader
- Service provider

**Usage rule**: May appear on B2B discovery pages, supplier profiles, inquiry context.
**Constraint**: Must align with `organizations.role_positions` schema; no invented roles.

### Approved Trust / Origin / Verification Language
- "Where available"
- "Public-safe"
- "Verified" (ONLY when `certificationCount > 0` or `hasTraceabilityEvidence === true`)
- "Traceability evidence available" (ONLY when `hasTraceabilityEvidence === true`)
- "Certification status" (ONLY when `certificationCount > 0`)
- "Public passport record" (ONLY when `publicPassportId` is present)

**Usage rule**: All trust/origin language must be paired with evidence qualification or availability condition.
**Constraint**: No universal coverage claims (e.g., "All suppliers are certified" or "Every product has a passport").

### Approved Public Inquiry Context Terms
- Industry of interest
- Product category of interest
- Supplier role of interest
- Geographic region of interest
- Inquiry type (general information, sourcing interest, partnership inquiry)

**Usage rule**: May appear on inquiry intake form context, follow-up communications.
**Constraint**: Must not expand beyond approved schema; no buyer intent capture (e.g., pricing, specifications, private details).

---

## 6. Allowed Public Claims

These claims may appear on public pages without requiring approval beyond this decision or evidence backing beyond the vocabulary rules above.

### Generic Value-Chain Claims
- "TexQtic connects textile discovery across suppliers, products, trust signals, and authenticated workflows."
- "From yarn and fabric to garments, home textiles, services, and consumer-facing commerce."
- "Textile segments help visitors understand how raw materials, fabrication, product categories, and supporting services connect across the broader ecosystem."
- "Clusters provide broad public-safe context for regional and value-chain discovery."

**Rule**: These claims are generic orientation language; they require no evidence.

### Segment / Category Storytelling
- "Yarn & Spinning is the foundation of textile production."
- "Fabrics connect raw materials to finished product pathways."
- "Garments represent the consumer-facing stage of the textile value chain."
- "Home Textiles and Technical Textiles serve specialized market categories."
- "Textile Services support the broader ecosystem."

**Rule**: These claims are educational; they require no evidence.

### Public-Safe Supplier Discovery Claims
- "Suppliers in this industry segment include spinners, weavers, dyers, and garment manufacturers."
- "Export-ready supplier networks are positioned for international sourcing."
- "Regional sourcing ecosystems include participating organizations in [approved geography]."

**Rule**: These claims are discovery orientation; they are general and do not assert specific capability or origin facts.

### Trust / Origin References (with Conditionality)
- "Where available, public-safe trust signals can help visitors understand a product or supplier story."
- "Public passport records show traceability evidence for selected suppliers and products."
- "Certification status and verification context are available for eligible suppliers."

**Rule**: All trust references MUST include "where available", "where applicable", "when available", or equivalent conditional language. No universal coverage claims.

### Authentication / Continuation Handoff Claims
- "Sign in to access authenticated supplier discovery, sourcing workflows, inquiries, business tools, and deeper platform intelligence where available."
- "Deeper supplier discovery, inquiries, and business actions continue after sign in."
- "Protected private workflows for sourcing, negotiation, and commercial intelligence remain in authenticated TexQtic surfaces."

**Rule**: These claims orient visitors to authenticated workflows; they require no evidence.

### Public / Private Boundary Clarifications
- "Public pages explain categories, segments, and ecosystem direction without exposing private records."
- "Scoring, recommendations, pricing, negotiation, and buyer intent remain private."
- "Authenticated surfaces own private workflows and deeper platform intelligence."

**Rule**: These boundary clarifications are editorial transparency; they require no evidence.

---

## 7. Evidence-Gated Claims

These claims require supporting data, public projection backing, or future approved config before public pages may use them. Do NOT use these claims on public pages until the required evidence rule is met.

### Specific Cluster Location Claims
**Claim Type**: "The [City] textile cluster is known for [specific capability]."

**Evidence Required**: 
- A future cluster model or approved static config that names the city.
- Corroborating supplier jurisdiction data showing 3+ public suppliers located in that city.
- No unsupported capability assertions (e.g., "export-ready" must be backed by public supplier `rolePositions` data showing exporters).

**Status**: BLOCKED until INDUSTRY-CLUSTER-STATIC-CONFIG-001 or future cluster model decision.

### Specific Origin Claims
**Claim Type**: "Products from [specific country/region] are known for [specific origin attribute]."

**Evidence Required**:
- Public DPP/passport record(s) with explicit origin metadata from that country/region.
- OR public supplier profile data showing primary suppliers from that region.
- No unsupported quality/sustainability claims without specific certification or traceability backing.

**Status**: BLOCKED until DPP/Trust linking is approved in future unit.

### Supplier Capability Claims
**Claim Type**: "[Named supplier] is a [specific role] in the [segment] segment."

**Evidence Required**:
- Supplier profile public API response showing `rolePositions` array including that role.
- Supplier profile public API response showing `primarySegment_key` matching the stated segment.

**Status**: Allowed ONLY in supplier detail/profile pages powered by public B2B projection API; NOT allowed in static Industry/Cluster pages.

### Certification / Verification Claims
**Claim Type**: "Suppliers in this segment have [specific certification/verification]."

**Evidence Required**:
- Public B2B projection showing `certificationCount > 0` for 5+ suppliers in that segment.
- Public B2B projection showing `certificationTypes[]` array matching the stated certification.
- OR specific supplier profile showing matching certification.

**Status**: Allowed ONLY with "where available" qualification on static pages; specific claims require API backing.

### Traceability / Passport Claims
**Claim Type**: "Products in this category have public passport/traceability records."

**Evidence Required**:
- Public B2C projection showing `publicPassportId` present for 5+ products in that category.
- OR specific product detail showing `publicPassportId` present.

**Status**: Allowed ONLY with "where available" qualification on static pages; specific claims require API backing.

### Export-Readiness Claims
**Claim Type**: "Export-ready supplier networks in [region] are positioned for international trade."

**Evidence Required**:
- Public B2B projection showing 3+ suppliers in region with `rolePositions` array including "Exporter" or "Trader".
- OR future cluster config mapping exporters to region.

**Status**: Allowed ONLY on static Industry/Cluster pages with "broad public-safe context" framing (not specific claims).

### Sustainability / Compliance Claims
**Claim Type**: "Suppliers in this segment are committed to [specific sustainability/compliance standard]."

**Evidence Required**:
- Public DPP record with explicit sustainability/compliance certification.
- OR supplier `certificationTypes[]` array showing matching certification.
- No "committed to" language without specific certification backing.

**Status**: FORBIDDEN on public pages until specific supplier data or DPP certification is available and approved for public display.

---

## 8. Forbidden Public Claims

These claims MUST NEVER appear on public pages, regardless of evidence. They violate TexQtic's public / private boundary or are unsupported by repo truth.

### Private Tenant / Org / User Identifiers
- Any private `tenant_id`, `org_id`, `user_id`, internal reference number, or system-generated UUID.
- Exception: Public `slug` fields may appear in URLs and public profiles (e.g., `/supplier/qa-gmt-d`).

### Private Supplier Documents
- RFQ responses
- Negotiation terms
- Pricing documents
- Technical specifications not in public product detail API
- Certificate files or confidential verification records
- Private supplier registration documents

### Private Buyer Intent
- Buyer contact details or company names
- RFQ content or inquiry specifications
- Private follow-up communications
- Sourcing strategies or budget information
- Purchasing history or order patterns

### RFQ / Inquiry Content
- Specific RFQ parameters or private inquiry details.
- Private request content.
- Buyer identity or organization.

### Private Contacts
- Supplier private email addresses or phone numbers.
- Buyer contact details.
- Private communication records.

### Non-Public Pricing or Inventory
- Product prices beyond explicitly approved public B2C projection display.
- Inventory levels or availability status.
- Minimum order quantities (MOQ) beyond public B2B projection field.
- Private rate cards or commercial terms.

### Rankings / Scores / Recommendations
- Supplier quality scores or ratings.
- Product quality rankings.
- AI-generated recommendations or scoring.
- "Top suppliers" or "best products" claims.

### AI / Vector / Recommendation Outputs
- Embedding-based similarity rankings.
- Recommendation algorithms or their outputs.
- Vector search results framed as recommendations.
- Personalized suggestion language implying private intelligence.

### Aggregator Intelligence
- Buyer intent analysis from Aggregator workspace.
- Private supplier scoring or ranking from Aggregator.
- Market trend analysis from private Aggregator data.
- Competitive positioning or recommendation outputs.

### Unsupported Factual Claims
- Claims about specific city/region cluster composition without backing data.
- Claims about supplier quality, capability, or "trustworthiness" without certification/DPP backing.
- Claims about universal coverage (e.g., "All suppliers are verified", "Every product has a passport").
- Specific origin claims without DPP/passport records.
- Specific certification claims without `certificationTypes[]` backing.

### Universal Coverage Claims
- "All textile suppliers in this region are export-ready."
- "Every product in this category has traceability records."
- "All participating organizations are certified."

### Checkout / Cart / Wishlist / Order Flows on Public Attraction Pages
- Public pages MUST NOT include commerce workflows (add to cart, purchase, wishlist).
- Commerce flows are reserved for authenticated tenant/customer workspaces.
- Public inquiry submit is allowed; commerce transactions are not.

### Unsupported Sustainability / Compliance Claims
- "This segment is sustainable" without specific certification backing.
- "This region uses eco-friendly practices" without supplier data backing.
- "Suppliers are committed to fair trade" without specific certification in `certificationTypes[]`.

### D2C Collection Claims
- Collection pages MUST NOT invent cluster/origin/artisan/sustainable claims.
- Collection pages MUST reuse approved vocabulary and evidence-gated rules.
- Collection pages MUST NOT imply DPP/passport coverage beyond what public records show.

---

## 9. B2C Reuse Rules

B2C storytelling must reuse, not extend, the Industry / Cluster taxonomy.

### B2C Category Storytelling
**Rule**: B2C category pages (if created) may use approved segment and category vocabulary without additional governance approval.

**Rule**: B2C category pages MUST NOT invent cluster/origin/capability claims.

**Rule**: B2C category pages MUST use public B2C projection fields (`category`, `material`, `fabricType`, `publicSupplierName`, `publicSupplierSlug`, `jurisdiction`).

**Rule**: B2C category pages MUST respect the same evidence-gated claim rules as Industry/Cluster pages.

### B2C Material / Fabric Storytelling
**Rule**: B2C material/fabric filter labels and content may use approved material / fabric vocabulary.

**Rule**: B2C material/fabric descriptions MUST align with approved generic value-chain claims; no unsupported sustainability claims.

**Rule**: B2C material/fabric pages MUST reuse public B2C projection `material`, `fabricType` fields as source of truth.

### B2C Supplier Context
**Rule**: B2C product cards may display `publicSupplierName`, `publicSupplierSlug`, supplier `jurisdiction` using public B2C projection.

**Rule**: B2C product cards MUST NOT display private supplier details, scoresor non-public contact information.

**Rule**: B2C supplier role or segment references MUST come from public B2B projection `rolePositions[]` or `primarySegment`, not invented roles.

### B2C Trust / Passport Context
**Rule**: B2C product cards may display `hasPassport`, `publicPassportId` (conditional) using public B2C projection.

**Rule**: B2C trust displays MUST include "where available" qualification or equivalent conditional language.

**Rule**: B2C passport links MUST only appear when `publicPassportId` is present; no implication of universal passport coverage.

**Rule**: B2C trust signal displays MUST come from public B2C projection `trustSignals[]` array; no invented trust signals.

### B2C Inquiry Context Carriage
**Rule**: If B2C product cards include inquiry context buttons or metadata, context MUST be drawn from approved Inquiry Context vocabulary.

**Rule**: B2C inquiry context MUST NOT over-capture buyer intent (e.g., pricing, private specifications, budget, sourcing strategy).

### B2C Category Page Dependencies
**Rule**: B2C category pages MUST depend on or consume the output of INDUSTRY-CLUSTER-STATIC-CONFIG-001 or approved projection.

**Rule**: B2C category pages MUST await B2C family repo-truth unit (TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001) before implementation.

---

## 10. D2C Reuse Rules

D2C collection framing must reuse, not extend, the Industry / Cluster taxonomy. D2C collections are currently stub-only and subject to collection semantics decision.

### D2C Collection Semantics
**Current Status**: D2C collections model (object structure, relationship to products, schema, semantics) is NOT yet decided.

**Rule**: D2C collections MUST await collection semantics decision before adding narrative or claim-laden copy.

**Rule**: When D2C collections are implemented, they MUST reuse approved Industry/Cluster vocabulary for category/segment framing.

**Rule**: D2C collections MUST NOT invent cluster-level, artisan-level, or origin-level claims without:
- Approval in a future D2C taxonomy or collection semantics decision.
- AND evidence backing per this taxonomy decision.

### D2C Collection Storytelling (Future)
**Rule (Forward-Looking)**: D2C collection pages MUST use only approved segment, category, material, role, and cluster vocabulary.

**Rule (Forward-Looking)**: D2C collection pages MUST NOT make unsupported origin claims (e.g., "From the [City] cluster", "Artisanal makers", "Eco-friendly collection").

**Rule (Forward-Looking)**: D2C collection pages MAY link to collection-level DPP or passport records IF a future collection-semantics decision approves DPP/passport grouping and public linking.

### D2C Supplier / Product Attribution
**Rule**: D2C collection pages MUST respect supplier anonymity or public attribution per supplier's `publication_posture`.

**Rule**: D2C collection pages MUST NOT disclose private supplier pricing, inventory, or negotiation terms.

### D2C Early-Access / Auth Handoff
**Rule**: D2C early-access or authentication handoff flows are separate from public claim governance.

**Rule**: D2C auth handoff MUST NOT expose Aggregator intelligence, private scoring, or ranking on public pages.

### D2C Collection Dependencies
**Rule**: D2C collection implementation MUST await D2C family repo-truth unit (TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001).

**Rule**: D2C collection implementation MUST await collection semantics decision (design-gated).

**Rule**: D2C collection public-facing copy MUST NOT be added until collection model, public-claim boundaries, and DPP/trust linkage rules are decided.

---

## 11. Downstream Unit Impact

This taxonomy decision unblocks or informs the following implementation units:

### Immediately Unblocked
- **INDUSTRY-CLUSTER-STATIC-CONFIG-001**: Can now define approved static config using vocabulary from this decision.
- **SEO-SITEMAP-METADATA-STRUCTURED-DATA-001**: Can now build SEO infrastructure informed by taxonomy layers and term governance.
- **INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001**: Can now design inquiry intake context schema using approved Inquiry Context vocabulary.

### Design-Gated (Unblocked but Design Required)
- **INDUSTRY-CLUSTER-STATIC-SLUG-PAGES-001**: Can now define slug page structure and route pattern; content governance established.
- **PUBLIC-CLUSTER-PROJECTION-DESIGN-001**: Can now design projection model informed by evidence-gated claim rules.
- **INDUSTRY-CLUSTER-AGGREGATOR-HANDOFF-001**: Can now design handoff patterns using approved handoff language rules.

### Requires Parallel Decision
- **TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001**: MUST reference this taxonomy decision for category, material, role, and claim reuse rules.
- **TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001**: MUST reference this taxonomy decision and await D2C collection semantics decision.

### Future Cross-Family Alignment
- **DPP / Trust Linking Rules** (future unit): MUST define public passport / trust linking governance using evidence-gated claim framework from this decision.
- **Public Inquiry Schema Decision** (future unit): MUST define inquiry context carriage using approved Inquiry Context vocabulary from this decision.

---

## 12. Open Questions / Deferred Decisions

The following questions remain open and should be addressed in future governance units or product decisions:

### Cluster Geography Scope
**Question**: Should TexQtic support city-specific public cluster pages (e.g., `/industries/yarn-spinning/bangalore-cluster`)?

**Decision Status**: DEFERRED

**Dependencies**:
- Future cluster config or cluster model decision.
- Supplier data quality and geographic accuracy verification.
- SEO strategy alignment on slug coverage and indexing rules.

**Recommendation**: Do NOT add city-specific pages in Phase 0. Start with broad region/category pages, then expand if supplier geographic data is high-confidence and product context supports it.

### Route Family Expansion
**Question**: Should TexQtic create a dedicated `/clusters` route family separate from `/industries`, or consolidate under `/industries/:slug`?

**Decision Status**: DEFERRED

**Dependencies**:
- Future IA/routing decision.
- SEO/canonical strategy for dual vs. single route family.
- Content distinction (industry-first vs. cluster-first navigation).

**Recommendation**: Start with `/industries` consolidation; evaluate separate `/clusters` family only if content strategist and SEO determine it improves discovery.

### Dynamic Slug Pages
**Question**: Should `/industries/:slug` pages be static (pre-generated from approved config) or dynamic (powered by cluster projection)?

**Decision Status**: DEFERRED

**Dependencies**:
- INDUSTRY-CLUSTER-STATIC-CONFIG-001 (static decision).
- PUBLIC-CLUSTER-PROJECTION-DESIGN-001 (dynamic decision).

**Recommendation**: Start with static pages for faster shipping and lower risk; evaluate dynamic projection only after measurement shows static approach insufficient.

### Projection-Backed Cluster Pages
**Question**: Should cluster pages (if created) be powered by a future cluster projection service that aggregates B2B/B2C data (e.g., "suppliers in Mumbai cluster", "products from Indian home textiles")?

**Decision Status**: DEFERRED

**Dependencies**:
- PUBLIC-CLUSTER-PROJECTION-DESIGN-001 (future implementation unit).
- Evidence-gated claim rules must apply to projection-backed claims.

**Recommendation**: Design projection service to respect evidence-gated rules; support only claims corroborated by public B2B/B2C projection data.

### First-Class Taxonomy Model
**Question**: Should TexQtic create a canonical `Cluster` or `IndustryCategory` model in schema, or continue using static config + existing projections?

**Decision Status**: DEFERRED

**Dependencies**:
- Product decision on cluster/industry entity lifecycle (CRUD, ownership, versioning).
- RLS / tenant scoping decision if clusters become entities.
- Schema governance decision on new model precedent.

**Recommendation**: Do NOT create first-class model in Phase 0. Use static config + projections. Evaluate model creation only after measurement shows scaling need.

### D2C Collection Object Definition
**Question**: Are D2C collections product groups, campaigns, capsules, supplier-led stories, or another object?

**Decision Status**: DEFERRED

**Dependencies**:
- TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 (must define collection object).

**Recommendation**: D2C family unit must resolve collection semantics before public-facing copy is written.

### Collection-Level DPP / Passport Linking
**Question**: Should D2C collection pages link to collection-level DPP or passport records, or only product-level records?

**Decision Status**: DEFERRED

**Dependencies**:
- D2C collection semantics decision.
- Future DPP / Trust linking rules (cross-family unit).

**Recommendation**: Start with product-level linking only. Evaluate collection-level linking only if collection object and aggregate verification semantics are approved.

### SEO Sitemap Generation
**Question**: How should SEO strategy handle future slug pages in sitemap generation? Dynamic or static?

**Decision Status**: DEFERRED

**Dependencies**:
- SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 (must define sitemap approach).

**Recommendation**: Use static sitemap + approved config routes in Phase 0. Evaluate dynamic generation only after slug page scope is finalized.

### Inquiry Schema Expansion
**Question**: Should public inquiry schema include rich context fields (e.g., specific product categories, materials, suppliers, estimated volume) or remain minimal?

**Decision Status**: DEFERRED

**Dependencies**:
- INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001 (must define inquiry payload schema).

**Recommendation**: Start with approved Inquiry Context vocabulary; avoid over-capturing intent signals that expose private buyer strategies.

---

## 13. Acceptance Criteria

This decision is complete and ready for stakeholder review when:

- ✅ Approved vocabulary exists (industry/segment, category, material, role, cluster labels, trust language, inquiry context).
- ✅ Allowed claims are explicit (6 categories of generic, segment, discovery, trust, handoff, boundary claims).
- ✅ Evidence-gated claims are explicit (7 categories: location, origin, supplier, certification, traceability, export, sustainability).
- ✅ Forbidden claims are explicit (12 categories: private IDs, private documents, buyer intent, RFQs, contacts, pricing, rankings, AI, Aggregator, unsupported factual, coverage, commerce).
- ✅ B2C reuse rules are explicit (6 rules covering categories, materials, supplier context, trust/passport, inquiry, dependencies).
- ✅ D2C reuse rules are explicit (5 rules covering collection semantics, storytelling, attribution, auth handoff, dependencies).
- ✅ Downstream unit dependencies are explicit (3 immediately unblocked, 3 design-gated, 2 parallel decisions, future cross-family alignment).
- ✅ Open/deferred decisions are explicit (8 questions deferred to future governance or product decisions).
- ✅ No runtime implementation is included.

**Acceptance Recommendation**: Move to ACCEPTED status upon stakeholder approval.

---

## 14. Next Recommended Units

### Sequence 1: Continue Industry / Cluster Family
1. **INDUSTRY-CLUSTER-STATIC-CONFIG-001** (READY_FOR_IMPLEMENTATION)
   - Purpose: Introduce approved static config using vocabulary from this decision.
   - Unblocked by: This decision.
   - Duration: 1–2 sprints.

2. **SEO-SITEMAP-METADATA-STRUCTURED-DATA-001** (READY_FOR_DESIGN)
   - Purpose: Build SEO infrastructure informed by taxonomy layers.
   - Unblocked by: This decision.
   - Duration: 1–2 sprints.

3. **INDUSTRY-CLUSTER-STATIC-SLUG-PAGES-001** (DESIGN_GATED)
   - Purpose: Add static slug pages using approved config and vocabulary.
   - Blocked by: INDUSTRY-CLUSTER-STATIC-CONFIG-001.
   - Duration: 1 sprint.

### Sequence 2: Begin B2C / D2C Planning (Parallel with Sequence 1)
1. **TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001** (READY_FOR_PLANNING)
   - Purpose: Audit B2C repo truth and define B2C family implementation queue.
   - Depends on: This taxonomy decision (for category/material/trust reuse rules).
   - Sequencing: Can start in parallel with INDUSTRY-CLUSTER-STATIC-CONFIG-001.
   - Duration: 1 sprint.

2. **TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001** (READY_FOR_PLANNING)
   - Purpose: Audit D2C repo truth and define D2C family implementation queue (including collection semantics decision).
   - Depends on: This taxonomy decision (for reuse rules) + B2C planning (for relationship context).
   - Sequencing: Can follow B2C planning.
   - Duration: 1 sprint.

3. **D2C-COLLECTION-SEMANTICS-DECISION-001** (DECISION_GATED)
   - Purpose: Define collection object model, public-claim rules, and DPP/trust linking for collections.
   - Blocked by: TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.
   - Duration: 1 sprint.

### Sequence 3: Public Inquiry and Cross-Family Integration (After B2C Planning)
1. **INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001** (DESIGN_GATED)
   - Purpose: Define inquiry intake context schema using approved Inquiry Context vocabulary.
   - Unblocked by: This decision.
   - Sequencing: Can start after B2C planning to ensure alignment.
   - Duration: 1 sprint.

2. **PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001** (DESIGN_READY)
   - Purpose: Design public inquiry surface using approved context vocabulary.
   - Depends on: INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001.
   - Duration: 1–2 sprints.

### Sequence 4: DPP / Trust and Aggregator Integration (Later Phase)
1. **DPP-TRUST-LINKING-RULES-001** (DESIGN_GATED)
   - Purpose: Define public passport/trust linking governance using evidence-gated framework from this decision.
   - Unblocked by: This decision.
   - Depends on: DPP/Passport family repo-truth work.
   - Sequencing: Can start after B2C planning; may be parallel with inquiry design.
   - Duration: 1 sprint.

2. **INDUSTRY-CLUSTER-AGGREGATOR-HANDOFF-001** (DESIGN_GATED)
   - Purpose: Design handoff patterns from Industry/Cluster pages into Aggregator using approved language.
   - Unblocked by: This decision.
   - Depends on: Aggregator workspace family repo-truth work.
   - Sequencing: Later phase; not critical for Phase 0.
   - Duration: 1 sprint.

---

## Governance Notes

- **No runtime implementation**: This decision establishes governance authority only. No code, schema, or API changes are included.
- **Cross-family authority**: This decision is the single source of truth for terminology, allowed/forbidden claims, and B2C/D2C reuse rules.
- **Evolvable within framework**: Future vocabulary additions may be approved in family-specific units (B2C, D2C, etc.) using this decision as the framework.
- **Evidence-gated expansion**: Claims beyond the approved vocabulary MUST reference evidence-gated rules or be blocked until future governance approval.
- **Audit trail**: All future Industry/Cluster, B2C, D2C, inquiry, SEO, DPP/Trust, and Aggregator governance units should cite this decision for consistency.

---

## Related Governance Documents

- `TEXQTIC-INDUSTRY-CLUSTER-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001` (commit 38cf6aa)
- `TEXQTIC-INDUSTRY-CLUSTER-SEO-LANDING-STATIC-IMPLEMENTATION-001` (commit 8dbca0c)
- Future: `TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001`
- Future: `TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001`
- Future: `DPP-TRUST-LINKING-RULES-001`
- Future: `D2C-COLLECTION-SEMANTICS-DECISION-001`

