# PUBLIC-DPP-COLLECTION-LINKING-DESIGN-001
## Public-Safe Collection-Level DPP / Passport / Trust Linking Design

## 1. Status Summary

- Unit mode: Design-only (no runtime, schema, OpenAPI, migration, or data mutation work).
- Design status: READY_FOR_REVIEW.
- Why this must be designed separately from product-level linkage:
  - B2C product-level passport behavior is a product-specific conditional CTA (`hasPassport && publicPassportId`).
  - D2C collections are curated story/showcase objects and are not defined as product-group trust containers.
  - Collection-level trust/passport semantics require independent evidence, publication posture, and projection rules.
  - Reusing product-level assumptions at collection scope would create false inheritance and universal-coverage risk.

## 2. Current Repo Truth

- B2C product-level passport CTA rule:
  - Product detail shows passport CTA only when both `hasPassport` and `publicPassportId` are present.
  - Source: `components/Public/PublicProductDetail.tsx`.
- B2C backend projection passport safety gates:
  - Product projection queries `dpp_passport_states` scoped by `org_id`, requires `status='PUBLISHED'` and `public_token != null`, returns fail-closed defaults when unavailable.
  - Source: `server/src/services/publicB2CProjection.service.ts`.
- Public passport fallback behavior:
  - Public passport route handles not-found and errors safely; no private tenant/entity IDs are exposed.
  - Source: `components/Public/PublicPassport.tsx`, `server/src/routes/public.ts`.
- D2C collection stub and fallback behavior:
  - `/collections` renders `PUBLIC_COLLECTIONS` concept/stub surface.
  - `/collections/:slug` resolves to `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` safe placeholder.
  - Sources: `App.tsx`, `components/Public/PublicCollectionsStub.tsx`, `components/Public/PublicCollectionUnavailable.tsx`.
- D2C collection semantics decision:
  - Collections are public-safe curated story/showcase objects; not product-group commerce objects.
  - Source: `governance/decisions/D2C-COLLECTION-SEMANTICS-DECISION-001.md`.
- No current collection-level DPP/passport linkage exists in runtime.
- No approved public passport directory:
  - Trust landing states passports are shared by direct link/QR and are not publicly browsed as a list.
  - Source: `components/Public/PublicTrustLandingStub.tsx`.

## 3. Design Goal

Define a future public-safe collection-level trust/passport direction that:

- remains conditional and evidence-backed,
- does not inherit product-level passport coverage from constituent products,
- protects private data boundaries,
- avoids universal trust/passport claims,
- preserves attraction/discovery/story/handoff positioning,
- avoids public commerce workflow behavior (checkout/cart/wishlist/order).

## 4. Design Options Considered

### Option A: No collection-level DPP linkage for now

- Advantages:
  - Zero overclaim risk.
  - Preserves current safe stub semantics.
  - No new model/projection complexity.
- Risks:
  - Low trust signaling depth on future collection pages.
  - May under-serve public narrative continuity.
- Data/model implications:
  - No new collection trust fields.
- Projection implications:
  - No collection trust/passport projection path.
- Public claim implications:
  - Minimal claim surface; safest posture.
- B2C boundary implications:
  - Strong boundary preserved.
- D2C semantics implications:
  - Keeps collections as story-only concepts.
- Implementation complexity:
  - Low.

### Option B: Collection displays only aggregated product-level "where available" trust summaries

- Advantages:
  - Adds contextual trust framing without direct collection passport claims.
  - Can be represented with bounded summary fields.
- Risks:
  - Risk of accidental implied inheritance if wording is not strict.
  - Requires careful aggregation logic to avoid overstatement.
- Data/model implications:
  - Requires summary-only derived fields.
- Projection implications:
  - Requires safe aggregation layer and fail-closed defaults.
- Public claim implications:
  - Must stay conditional and avoid universal wording.
- B2C boundary implications:
  - Acceptable if product references remain explicit and optional.
- D2C semantics implications:
  - Supports curated story posture.
- Implementation complexity:
  - Medium.

### Option C: Collection has its own collection-level public passport token

- Advantages:
  - Clear, first-class collection trust object.
  - Enables direct collection passport CTA when eligible.
- Risks:
  - Requires new semantic model and publication lifecycle.
  - High risk if introduced before governance and data model decisions.
- Data/model implications:
  - Needs collection-passport ownership model, token lifecycle, evidence policy.
- Projection implications:
  - Requires dedicated collection-level projection gates and route semantics.
- Public claim implications:
  - Must avoid implying all child products are passport-covered.
- B2C boundary implications:
  - Strong if modeled independently; weak if conflated with product passport.
- D2C semantics implications:
  - Compatible only after dedicated collection model decision.
- Implementation complexity:
  - High.

### Option D: Collection has curated trust references linking to eligible product passports only

- Advantages:
  - Keeps trust grounded in product-level evidence.
  - Avoids claiming collection-owned passport.
- Risks:
  - Link list may be mistaken for collection-level verification.
  - Requires strict eligibility filtering and copy guardrails.
- Data/model implications:
  - Needs list of eligible product passport refs and display metadata.
- Projection implications:
  - Requires bounded projection for eligible references only.
- Public claim implications:
  - Must say "eligible products may include" and never "collection is verified".
- B2C boundary implications:
  - Good if references are clearly product-scoped.
- D2C semantics implications:
  - Fits curated story/showcase posture.
- Implementation complexity:
  - Medium.

### Option E: Hybrid model (collection trust summary + optional eligible product passport references)

- Advantages:
  - Balanced expressiveness and safety.
  - Supports staged rollout while preserving current semantics.
  - Avoids immediate requirement for collection-owned passport model.
- Risks:
  - More governance rules needed to prevent drift.
  - Requires explicit non-inheritance language everywhere.
- Data/model implications:
  - Summary fields + optional eligible product reference list.
- Projection implications:
  - Requires two bounded projection shapes (summary + optional refs).
- Public claim implications:
  - Conditional-only claims; no universal guarantees.
- B2C boundary implications:
  - Strong if references remain product-scoped and optional.
- D2C semantics implications:
  - Strong fit for curated story/showcase with authenticated continuation.
- Implementation complexity:
  - Medium-to-high (staged).

## 5. Recommended Design Direction

Recommended direction: Option E (Hybrid staged model), implemented in governed phases.

- Phase 1 (default now):
  - Collection copy remains conditional.
  - No direct collection-level passport CTA.
  - Collections remain concept/showcase surfaces.
- Phase 2:
  - Collection may display eligible product passport references where available.
  - References are explicitly product-scoped and optional.
- Phase 3:
  - Collection may support a collection-owned public passport token only after dedicated model/projection design and governance acceptance.

Explicit constraints for all phases:

- Product-level passport is not inherited by collections.
- Collection-level passport is not assumed.
- Trust/passport copy must remain conditional ("where available").
- Collection-level DPP requires independent evidence and publication gates.

## 6. Field / Data Boundary Proposal

Conceptual future fields and classification:

- Allowed public:
  - `collectionHasTrustContext` (boolean)
  - `trustSummary` (bounded text)
  - `originSummary` (bounded text)
  - `authenticatedContinuationCta` (bounded CTA metadata)
  - `unavailableReason` (safe public reason enum/text)
- Evidence-gated:
  - `traceabilitySummary`
  - `certificationSummary`
  - `supplierContext` (public-safe, approved only)
  - `evidenceCount` (coarse count only)
  - `eligibleProductPassportRefs` (public product token/slug references only, no private IDs)
  - `collectionHasPassport` (boolean only when collection-owned model exists)
  - `collectionPublicPassportId` (public token only, phase-gated)
- Authenticated-only:
  - private document links, internal evidence IDs, internal workflow state,
  - supplier private records, negotiation/order context, buyer intent payloads, RFQ payloads.
- Deferred:
  - collection-owned passport structure, collection passport lifecycle state,
  - collection-passport type discriminator strategy,
  - snapshot-vs-live semantics for product passport references.

## 7. Projection Safety Rules

Future collection trust/passport projection rules must include:

- Fail-closed defaults for all trust/passport fields when any gate is unmet.
- Return public tokens only; never return private IDs (`org_id`, internal collection IDs, internal node IDs, user IDs).
- Scope records by owning org/tenant boundary as applicable.
- Require published/approved public posture before exposure.
- Enforce no cross-tenant leakage.
- Never return internal evidence details or private document pointers.
- Never expose buyer intent, RFQ payload, negotiation, or order state.
- Keep summary-level claims bounded and evidence-gated.
- Any unavailable state must render safe fallback copy, not diagnostic internals.

## 8. Public Copy Rules

Allowed language patterns:

- "where available"
- "eligible products may include public trust context"
- "trust and passport context is conditional"
- "continue after sign-in for authenticated workflows"

Forbidden language patterns:

- "all products verified"
- "collection verified"
- "collection passport guaranteed"
- "fully traceable collection"
- "certified collection"
- "drop" / "drops"
- checkout/cart/wishlist/order language
- rankings/scores/recommendations language
- Aggregator intelligence language

## 9. B2C / D2C Boundary

- B2C owns product-level passport CTA behavior and product-level trust linkage.
- D2C collections may reference product-level passports only as eligible product references.
- Product passport availability does not make the collection passport-backed.
- Collection-level trust/passport must be independently designed and evidence-gated.
- D2C collection surfaces remain attraction/story/handoff-first, with authenticated continuation for deeper workflows.

## 10. Public Passport Route Relationship

Design-only proposal:

- Near-term: keep product-passport behavior on existing public passport route (`/passport/:publicPassportId`) for product-scoped records.
- If collection-owned passport is introduced later, do not assume route reuse without type safety.
- A type discriminator (or equivalent deterministic resolver) is likely required before supporting collection passports on the same route.
- Collection passports must wait for dedicated model/projection design units.
- Invalid/unavailable collection-passport states must preserve the same safe fallback posture used by current public passport surfaces.

No implementation is included in this unit.

## 11. DPP / Trust Dependency

This design depends on and feeds:

- `DPP-TRUST-LINKING-RULES-001` for canonical conditionality and evidence gating rules.
- Product-level passport sync truth (`B2C-DPP-PASSPORT-LINKAGE-SYNC-001`) as boundary anchor.
- D2C origin storytelling governance to keep story claims aligned with evidence limits.
- D2C collection data model design to define collection-owned trust/passport semantics.

## 12. Implementation Dependencies

Downstream units and readiness:

- `DPP-TRUST-LINKING-RULES-001` — design-gated (required first).
- `D2C-COLLECTIONS-DATA-MODEL-DESIGN-001` — design-gated.
- `PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001` — design-gated.
- `PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001` — design-gated.
- `PUBLIC-DPP-COLLECTION-LINKING-IMPLEMENTATION-001` — implementation-ready only after all above are accepted.
- `D2C-ORIGIN-STORYTELLING-GOVERNANCE-001` — decision-gated/design-gated.
- `D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001` — design-gated.

## 13. Open Questions / Deferred Decisions

- Should a collection get its own passport model at all?
- If yes, should collection passport reuse `dpp_passport_states` or require a separate typed model?
- How should collection-to-product relationships be modeled for public-safe projection?
- How should supplier context be represented without exposing private supplier records?
- Should product passport references be live-evaluated or publication snapshots?
- What is the collection trust/passport publication lifecycle and gate set?
- How should RLS and multi-tenant ownership be enforced for collection trust/passport projections?
- Can a valid public passport token identify product vs collection context safely without ambiguity?

## 14. Acceptance Criteria

Design is complete only if all are true:

- Product-level vs collection-level boundary is explicit.
- No-inheritance rule is explicit.
- Public fields are classified.
- Projection safety rules are explicit.
- Public copy rules are explicit.
- Forbidden claims and forbidden flows are explicit.
- Implementation dependencies are listed.
- No runtime implementation is included.

## 15. Next Recommended Units

Recommended sequence after this design:

1. `DPP-TRUST-LINKING-RULES-001`
2. `D2C-COLLECTIONS-DATA-MODEL-DESIGN-001`
3. `PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001`
4. `PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001`
5. `D2C-ORIGIN-STORYTELLING-GOVERNANCE-001`
6. `D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001`
