# COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001
## Product vs Collection Passport Type Discriminator Decision

## 1. Status Summary

- Mode: decision/design only.
- Status: READY_FOR_REVIEW.
- This decision is required before collection projection/detail/runtime DPP work because product-scoped passport behavior already exists and collection-owned passport behavior does not. Without a discriminator decision, future routes/tokens could incorrectly blend product and collection contexts.

## 2. Current Repo Truth

- Product passport behavior exists today and is product-scoped:
  - Product CTA renders only when both hasPassport and publicPassportId are present.
  - Public route is currently token-driven at /api/public/dpp/:publicPassportId.
  - Product surface links to /passport/:publicPassportId when product conditions pass.
- Public token behavior exists today for published product passport context using public_token lookup.
- Collection behavior exists today only as:
  - /collections concept/stub surface.
  - /collections/:slug safe unavailable placeholder.
- Collection-owned passport runtime does not exist today.
- Current product passport semantics are product-scoped and must remain so until explicit future collection-owned passport implementation is approved.

## 3. Problem Statement

- Token/type ambiguity matters now because the current public token route is passport-context based and currently maps to product-scoped passport truth.
- If future collection-owned passport tokens are added without explicit discrimination, a token could be interpreted in the wrong context, causing claim leakage, projection mismatch, or incorrect route resolution.
- Product passport eligibility and collection passport eligibility must remain separate. Collection eligibility cannot inherit from product eligibility.

## 4. Decision Goals

1. Preserve current product-scoped passport behavior unchanged.
2. Prevent accidental product-to-collection passport inheritance.
3. Define a safe discriminator strategy before any collection-owned passport runtime is introduced.
4. Keep projection and route behavior fail-closed on context mismatch.
5. Maintain public/private boundary constraints from existing DPP/trust governance.

## 5. Options Considered

### Option A: No discriminator, reuse current token semantics for all future contexts

- Advantages:
  - Lowest short-term change overhead.
- Risks:
  - High ambiguity risk between product and future collection contexts.
  - Higher claim leakage and misrouting risk.
- Route implications:
  - Shared route resolution without context checks.
- Projection implications:
  - Increased risk of wrong entity projection payload.
- Public/private boundary implications:
  - Elevated risk of boundary mistakes under ambiguous lookups.
- DPP/trust implications:
  - Weakens no-inheritance governance.
- Implementation complexity:
  - Low now, high risk debt later.
- Migration risk:
  - High deferred migration complexity.
- Future compatibility:
  - Poor.

### Option B: Route-level discriminator only

- Advantages:
  - Clear path split possibility.
- Risks:
  - Token context may still be ambiguous if token namespaces overlap.
- Route implications:
  - Requires separate route namespace for entity context.
- Projection implications:
  - Improved selection but still reliant on route correctness only.
- Public/private boundary implications:
  - Better than Option A, still partial if token model not strict.
- DPP/trust implications:
  - Moderate safety.
- Implementation complexity:
  - Medium.
- Migration risk:
  - Medium.
- Future compatibility:
  - Moderate.

### Option C: Token/type discriminator inside public passport context

- Advantages:
  - Strong context integrity at lookup layer.
- Risks:
  - Requires careful token governance and future model implementation.
- Route implications:
  - Existing routes can remain, but lookup must enforce context type.
- Projection implications:
  - High confidence mapping to correct entity projection.
- Public/private boundary implications:
  - Strong boundary preservation via explicit context checks.
- DPP/trust implications:
  - Strong support for no-inheritance and fail-closed behavior.
- Implementation complexity:
  - Medium-high.
- Migration risk:
  - Medium.
- Future compatibility:
  - High.

### Option D: Separate product and collection public passport namespaces

- Advantages:
  - Maximum explicitness and low ambiguity at route/token boundary.
- Risks:
  - Larger implementation footprint and migration coordination.
- Route implications:
  - Distinct route namespace and token namespace.
- Projection implications:
  - Clear projection context segregation.
- Public/private boundary implications:
  - Strongest isolation.
- DPP/trust implications:
  - Strong no-inheritance enforcement.
- Implementation complexity:
  - High.
- Migration risk:
  - Medium-high.
- Future compatibility:
  - High.

### Option E: Deferred collection-owned token support now, product-scoped refs only, reserve discriminator rules for future collection-owned passport

- Advantages:
  - Safest near-term path aligned with current repo truth.
  - Avoids premature runtime/schema changes.
  - Keeps collection projections limited to product-scoped eligible passport references where approved.
- Risks:
  - Requires disciplined adherence in downstream design units.
- Route implications:
  - Keep current product-scoped route behavior for now.
  - Require explicit discriminator design before any collection-owned passport route/token support.
- Projection implications:
  - Collection projection may include product-scoped eligible passport refs only.
  - No collection-owned passport projection until discriminator and model units complete.
- Public/private boundary implications:
  - Strong, conservative boundary protection.
- DPP/trust implications:
  - Fully aligned with no-inheritance and conditionality rules.
- Implementation complexity:
  - Low now, staged future complexity.
- Migration risk:
  - Low near-term.
- Future compatibility:
  - High when paired with explicit future discriminator implementation.

## 6. Recommended Decision

Recommended strategy: Option E (conservative staged discriminator decision).

Decision statement:

1. Keep current product passport behavior product-scoped and unchanged.
2. Do not introduce collection-owned passport runtime in current phase.
3. Require explicit type/context discrimination before any future collection-owned public passport token is introduced.
4. Allow collections to reference only eligible product-scoped passport refs where explicitly approved by projection design.
5. Reserve collection-owned passport semantics for later dedicated model/projection/token implementation units.

Rationale:

- This matches current repo truth and existing governance units.
- This prevents premature ambiguity and accidental inheritance.
- This preserves fail-closed behavior and safe public/private boundaries.

## 7. Canonical Rules

### 7.1 Product passport context

- Product passport context is authoritative for current public token behavior.
- Product CTA and linking remain governed by product fields and published token rules.

### 7.2 Collection trust context

- Collection trust context is story/showcase-level and conditional.
- Collection trust must not imply collection-owned passport status.

### 7.3 Eligible product passport references inside collections

- Allowed only as optional product-scoped references where available.
- Must not be interpreted as collection-level passport verification.

### 7.4 Future collection-owned passport context

- Deferred.
- Requires explicit discriminator strategy approval before runtime support.

### 7.5 Route or token discrimination

- Any future collection-owned passport support must include explicit context/entity discrimination at route and/or lookup level.

### 7.6 Fail-closed behavior

- Context mismatch, unknown context, or unresolved context must return safe unavailable/not-found outcomes.
- No fallback to alternate context resolution is allowed.

### 7.7 Forbidden public claims

- No universal trust/passport claims.
- No product-to-collection inheritance claims.
- No collection-owned passport claims prior to explicit implementation approval.

## 8. Public Route / Token Safety

Decision on required future safety controls:

- Future collection-owned support requires explicit discriminator controls.
- At least one of the following must be implemented, and all mismatches must fail closed:
  - entity type field,
  - context type field,
  - token namespace,
  - route namespace,
  - lookup discriminator,
  - projection-level discriminator.
- Current phase decision:
  - keep current product-scoped token behavior,
  - block collection-owned token semantics until discriminator path is approved and implemented.

## 9. Projection Implications

### PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001

- May expose conditional collection trust context.
- May include eligible product-scoped passport references only.
- Must not expose collection-owned passport semantics.

### PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001

- May include product-scoped passport refs where available and approved.
- Must include clear no-inheritance semantics in projection shape and copy.

### PUBLIC-DPP-COLLECTION-LINKING-IMPLEMENTATION-001

- Must not implement collection-owned passport tokens/routes until discriminator decision is carried into model/projection/API implementation plan.
- Must enforce fail-closed context mismatch behavior.

## 10. DPP / Trust Claim Implications

- Product DPP claims remain product-scoped and conditional.
- Collection trust claims remain conditional and evidence-gated.
- Collection passport claims remain deferred unless explicitly approved and implemented with discriminator controls.
- No universal DPP/passport/trust coverage claims are permitted.

## 11. Public / Private Boundary

This decision preserves and reinforces:

- No public exposure of internal IDs, tenant/org IDs, or internal entity linkage IDs.
- No exposure of buyer intent, RFQ payloads, private pricing/inventory, negotiation/order state, or Aggregator intelligence.
- No route/token fallback behavior that could cross context boundaries.

## 12. Deferred Decisions

- Exact discriminator mechanism choice in implementation (field vs namespace vs hybrid).
- Whether future collection-owned passport uses separate route namespace, token namespace, or both.
- Exact schema/model shape for future collection-owned passport records.
- Publishing/admin workflow specifics for collection-owned passport lifecycle.

## 13. Downstream Unit Order

1. PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001
2. PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001
3. PUBLIC-DPP-COLLECTION-LINKING-IMPLEMENTATION-001
4. If collection-owned passport remains in scope before implementation finalization, ensure COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001 is accepted and mapped to explicit implementation controls.

## 14. Acceptance Criteria

Decision is complete only if all are true:

- Product vs collection passport context is explicitly distinguished.
- No product-to-collection passport inheritance is allowed.
- Collection-owned passport remains gated behind explicit future implementation.
- Projection implications are documented.
- Route/token mismatch behavior is fail-closed.
- No runtime changes are made in this unit.
