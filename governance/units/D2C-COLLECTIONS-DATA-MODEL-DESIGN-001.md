# D2C-COLLECTIONS-DATA-MODEL-DESIGN-001
## D2C Collection Data Model Design (Governance Only)

## 1. Status Summary

- Unit mode: Design-only governance artifact.
- Unit status: READY_FOR_REVIEW.
- Why data model design is required first:
  - Collection projection, collection detail, and runtime work cannot be safely designed without a canonical collection object definition.
  - Public/private boundaries, lifecycle gates, and ownership/tenancy rules must be set before API/projection implementation.
  - DPP/trust linkage for collections must be constrained by model design to avoid accidental inheritance and universal claims.

## 2. Current Repo Truth

- `/collections` currently renders a public-safe concept/stub surface.
- `/collections/:slug` currently renders a safe unavailable placeholder surface.
- D2C collection semantics are defined as curated story/showcase objects with optional authenticated continuation.
- Public collection DPP linking design recommends hybrid staged behavior with no product-to-collection inheritance.
- DPP/trust rules require conditionality, evidence gating, fail-closed behavior, public-token-only exposure, and no private IDs.
- B2C product DPP baseline remains product-scoped and conditional (`hasPassport` + `publicPassportId`).
- No collection runtime data model is implemented.
- No collection-level DPP/passport runtime linkage is implemented.

## 3. Design Goal

Define a future collection model as a curated story/showcase object that:

- supports optional product references,
- supports optional supplier references,
- supports optional evidence-gated trust summaries,
- is ready for public-safe list/detail projections,
- supports authenticated continuation handoff,
- does not implement public checkout/cart/wishlist/order behavior,
- does not imply collection-level DPP/passport coverage by default.

## 4. Model Options Considered

### Option A: Collection as static config only

- Advantages:
  - Very low complexity.
  - Minimal risk of runtime drift.
- Risks:
  - Limited extensibility and weak lifecycle governance.
  - Hard to support publication gates and ownership metadata.
- Data implications:
  - Shallow static fields only.
- Projection implications:
  - Works for static pages, weak for future dynamic projection.
- B2C boundary implications:
  - Boundary safe, but weak linkage semantics.
- DPP/trust implications:
  - Can only support copy-level trust references.
- Implementation complexity:
  - Low.

### Option B: Collection as product group

- Advantages:
  - Simple mapping from existing product references.
  - Easy list/detail assembly.
- Risks:
  - Blurs D2C into B2C product grouping.
  - Encourages commerce interpretation and inheritance mistakes.
- Data implications:
  - Product relation-centric model.
- Projection implications:
  - Straightforward product aggregation, weak story semantics.
- B2C boundary implications:
  - Weak boundary; high overlap with B2C browse.
- DPP/trust implications:
  - High risk of implied collection passport status from product status.
- Implementation complexity:
  - Medium.

### Option C: Collection as supplier-led story/showcase

- Advantages:
  - Clear supplier ownership possibility.
  - Strong supplier narrative continuity.
- Risks:
  - Over-commits ownership and publication authority too early.
  - Higher risk of exposing private supplier context or implied guarantees.
- Data implications:
  - Supplier-centric ownership and publishing metadata required.
- Projection implications:
  - Supplier gate complexity increases.
- B2C boundary implications:
  - Better than product-group but can collapse into supplier profile semantics.
- DPP/trust implications:
  - Risk of supplier-level trust being over-attributed to collection.
- Implementation complexity:
  - Medium-high.

### Option D: Collection as platform-curated marketplace story

- Advantages:
  - Aligns with public attraction layer and curation role.
  - Supports multi-supplier and multi-product narrative grouping.
- Risks:
  - If unconstrained, may drift into ranking/recommendation language.
  - Requires explicit guardrails for trust/certification claims.
- Data implications:
  - Platform curation metadata + optional references.
- Projection implications:
  - Good fit for public-safe list/detail projection.
- B2C boundary implications:
  - Strong boundary if product references remain optional and non-commerce.
- DPP/trust implications:
  - Supports conditional trust summary patterns safely.
- Implementation complexity:
  - Medium.

### Option E: Hybrid collection object with product/supplier refs + authenticated continuation

- Advantages:
  - Best match to current semantics and public attraction strategy.
  - Supports story-first public model with bounded structured references.
  - Supports phased trust/passport linkage without inheritance.
- Risks:
  - Requires disciplined publication and field-level safety rules.
  - Requires explicit deferred decisions for collection-owned passport strategy.
- Data implications:
  - Unified collection object with optional refs and gate-aware trust fields.
- Projection implications:
  - Enables collection list/detail plus safe fallback projections.
- B2C boundary implications:
  - Strong; product remains B2C-owned while collection remains D2C story object.
- DPP/trust implications:
  - Compatible with staged linking and no-inheritance rule.
- Implementation complexity:
  - Medium-high.

## 5. Recommended Model Direction

Recommended: Option E (Hybrid collection object).

The future collection object should:

- represent a public-safe curated story/showcase,
- optionally reference eligible public products,
- optionally reference public-safe supplier context,
- optionally include evidence-gated trust summaries,
- include authenticated continuation CTA metadata,
- explicitly exclude public checkout/cart/wishlist/order behavior,
- never imply DPP/passport coverage by default,
- preserve product-level DPP as product-scoped (B2C boundary).

## 6. Conceptual Field Model

Field classification legend:

- public-safe
- evidence-gated
- authenticated-only
- internal-only
- deferred

### Core identity and story fields

- id/internal identifier: internal-only
- publicSlug: public-safe
- title: public-safe
- summary: public-safe
- storyBody: public-safe (copy-governed)
- heroImage: public-safe
- categoryTags: public-safe
- materialTags: public-safe
- segmentTags: public-safe

### Reference fields

- productRefs: public-safe (only eligible public product refs), internal-only for full linkage metadata
- supplierRefs: evidence-gated (public-safe supplier refs only), internal-only for full linkage metadata

### Trust/DPP fields

- collectionHasTrustContext: public-safe (derived, fail-closed)
- trustSummary: evidence-gated
- originSummary: evidence-gated
- traceabilitySummary: evidence-gated
- certificationSummary: evidence-gated
- eligibleProductPassportRefs: evidence-gated (product-scoped only)
- collectionHasPassport: deferred (future model decision)
- collectionPublicPassportId: deferred (future model/token decision)

### Lifecycle and publication fields

- lifecycleStatus: internal-only (public-safe mapped status may be projected)
- publicationPosture: internal-only (gate input)
- visibility: internal-only (gate input)

### Ownership and audit fields

- ownerOrgId / tenant boundary: internal-only
- createdBy / updatedBy: internal-only

### Continuity and fallback fields

- authenticatedContinuationCta: public-safe (bounded CTA metadata)
- unavailableReason: public-safe (safe enum/text only)

### SEO fields

- seoTitle: deferred
- seoDescription: deferred

## 7. Ownership / Tenancy Model

- Likely ownership model:
  - Collection object is owned by an org/tenant boundary with possible platform-curation authority patterns.
  - Ownership must be explicit and immutable enough to enforce tenancy boundaries.
- Publishing authority:
  - Only authorized publishing actors in the owning tenancy (or approved platform governance actor) may move collection to public-published posture.
- RLS/multi-tenant boundary requirements:
  - All runtime access and projection assembly must remain tenant/org scoped.
  - Cross-tenant joins for public projection must be explicitly policy-gated and return only public-safe fields.
- Must never be public:
  - ownerOrgId, internal IDs, internal publish workflow metadata, actor identity metadata, private supplier linkage internals.

## 8. Lifecycle / Publication Gates

### Candidate lifecycle states

- draft
- review
- approved
- published
- archived
- unavailable

### Public exposure gates

Collection may be exposed publicly only when all apply:

1. approved public posture
2. safe slug
3. safe copy pass
4. safe product refs only (if present)
5. safe supplier refs only (if present)
6. trust fields are evidence-gated (if present)
7. private fields excluded
8. no public commerce workflow semantics

Fail-closed rule: if any required gate is missing, collection must resolve to unavailable/no-signal safe projection.

## 9. Product Relationship Rules

- Product references are optional.
- Public collection projections may reference only public-safe eligible products.
- Product passport status never creates collection passport status.
- Missing/invalid/ineligible product references must fail closed (omit or safe fallback), never degrade into private-data leakage.
- Collection object must not require product refs to exist in order to remain a valid story/showcase object.

## 10. Supplier Relationship Rules

- Supplier references are optional.
- Supplier context must be public-safe and publication-gate approved.
- No private contacts, private documents, private pricing, or private workflow data may be projected.
- Current production supplier data-limited status must be treated as a known readiness constraint for downstream verification units.
- Missing/ineligible supplier refs must fail closed to safe omission/fallback.

## 11. DPP / Trust Relationship Rules

- Collection trust summary may exist only as evidence-gated context.
- Product passport references in collections may be product-scoped only.
- Collection-owned passport is deferred and requires explicit model/projection + token strategy decisions.
- No universal DPP/passport/trust coverage claims are allowed.
- Trust/DPP fields must default fail-closed when evidence/publication gates are absent.

## 12. Public Projection Needs

Future projection shapes needed:

1. collection list projection
   - lightweight story fields, tags, optional bounded trust flags, safe CTA metadata.
2. collection detail projection
   - full public story object, optional eligible refs, evidence-gated trust summaries.
3. safe unavailable projection/fallback
   - standardized unavailable envelope with safe reason and continuity CTAs.
4. eligible product reference projection
   - product-scoped reference payload only (slug/title/image/optional product token refs where approved).
5. optional trust summary projection
   - bounded trust/origin/traceability/certification summaries where available.

## 13. Public / Private Boundary

The following are explicitly forbidden in public collection model projections:

- private IDs (org_id, tenant IDs, internal entity IDs, internal evidence IDs)
- private supplier records/documents
- private contacts
- private pricing/inventory
- buyer intent/RFQ payloads
- rankings/scores/recommendations
- AI/vector outputs
- Aggregator intelligence
- checkout/cart/wishlist/order flows
- universal DPP/passport/trust claims

## 14. Dependencies / Downstream Units

Ordered downstream sequence:

1. COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001 (if required)
2. PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001
3. PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001
4. D2C-ORIGIN-STORYTELLING-GOVERNANCE-001
5. D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001
6. PUBLIC-DPP-COLLECTION-LINKING-IMPLEMENTATION-001

## 15. Open Questions / Deferred Decisions

- exact schema/table strategy for collection object(s)
- route strategy for future collection detail runtime
- token/type discriminator strategy for product vs collection passport contexts
- admin/publishing workflow design and authority model
- collection-owned passport decision
- live vs snapshot product reference behavior
- public supplier data readiness for richer collection references
- SEO behavior strategy and canonicalization
- early-access payload model and boundary design

## 16. Acceptance Criteria

Design is complete only if:

- model direction is selected
- fields are classified
- ownership/tenancy model is defined
- lifecycle/publication gates are defined
- product relationship rules are defined
- supplier relationship rules are defined
- DPP/trust relationship rules are defined
- public/private boundary is explicit
- downstream units are ordered
- no runtime implementation is included

## 17. Next Recommended Units

1. COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001 (if route/token ambiguity requires early decision)
2. PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001
3. PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001
4. D2C-ORIGIN-STORYTELLING-GOVERNANCE-001
5. D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001
