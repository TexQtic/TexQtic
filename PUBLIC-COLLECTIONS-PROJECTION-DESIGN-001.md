# PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001
## Public Collections List Projection Design

## 1. Status Summary

- Mode: design-only governance artifact.
- Status: READY_FOR_REVIEW.
- Scope boundary: defines future public-safe list projection design for /collections only.
- No runtime, schema, route, OpenAPI, service, or UI implementation is included.

## 2. Current Repo Truth

- /collections currently resolves to a public-safe concept/stub surface.
- /collections/:slug currently resolves to a safe unavailable placeholder surface.
- Current routing maps /collections and /collections/:slug to PUBLIC_COLLECTIONS and PUBLIC_COLLECTION_DETAIL_UNAVAILABLE.
- No runtime public collections list projection is implemented.
- No collection-owned passport runtime is implemented.
- Product passport behavior remains product-scoped and conditional.
- Current product passport context is based on published public token behavior and must not be reinterpreted as collection passport status.

## 3. Projection Purpose

The /collections list projection is a public attraction and discovery projection for curated story/showcase collection objects.

It is not:

- commerce infrastructure,
- ranking or recommendation infrastructure,
- sourcing/RFQ infrastructure,
- buyer intent or negotiation workflow infrastructure,
- checkout/cart/wishlist/order infrastructure.

Primary role:

- show approved public-safe collection cards,
- preserve conditional trust language,
- preserve D2C story posture,
- provide authenticated continuation CTA metadata without transactional semantics.

## 4. Public List Projection Shape

Conceptual payload shape for /collections:

```json
{
  "collections": [
    {
      "publicSlug": "string",
      "title": "string",
      "summary": "string",
      "heroImage": {
        "url": "string",
        "alt": "string"
      },
      "categoryTags": ["string"],
      "materialTags": ["string"],
      "segmentTags": ["string"],
      "collectionStoryType": "string",
      "curatedContextLabel": "string",
      "collectionHasTrustContext": false,
      "trustLabel": "string",
      "eligibleProductPreview": {
        "eligibleProductCount": 0,
        "previewPolicy": "string"
      },
      "supplierContextLabel": "string",
      "authenticatedContinuationCta": {
        "label": "string",
        "action": "AUTH_CONTINUE",
        "target": "/auth",
        "intent": "COLLECTION_CONTINUATION"
      },
      "listState": {
        "availability": "AVAILABLE",
        "fallbackLabel": "string"
      }
    }
  ],
  "meta": {
    "emptyState": false,
    "fallbackMode": "NONE"
  }
}
```

Shape constraints:

- product references are optional for list inclusion,
- supplier context is optional and gate-approved only,
- trust fields are optional and evidence-gated,
- collection-owned passport fields are excluded in this phase.

## 5. Field Classification

### Public-safe

- publicSlug
- title
- summary
- heroImage.url
- heroImage.alt
- categoryTags
- materialTags
- segmentTags
- collectionStoryType
- curatedContextLabel
- authenticatedContinuationCta.label
- authenticatedContinuationCta.action
- authenticatedContinuationCta.target
- authenticatedContinuationCta.intent
- listState.availability
- listState.fallbackLabel

### Evidence-gated

- trustLabel
- supplierContextLabel
- eligibleProductPreview.eligibleProductCount
- eligibleProductPreview.previewPolicy

### Derived or fail-closed

- collectionHasTrustContext
- meta.emptyState
- meta.fallbackMode

### Authenticated-only

- private collection workflow detail
- private continuity payloads
- buyer intent and RFQ payloads
- negotiation and order context

### Internal-only

- ownerOrgId and tenant IDs
- internal collection IDs
- internal linkage IDs
- publication workflow metadata
- internal evidence/linkage metadata

### Forbidden

- private contacts and private documents
- private pricing and inventory
- rankings, scores, recommendations
- AI/vector outputs
- Aggregator intelligence
- checkout/cart/wishlist/order fields
- universal trust/passport/origin/certification/traceability claims
- collection passport fields that imply collection-owned passport runtime

### Deferred

- collection-owned passport fields and token semantics
- collection-owned passport route semantics
- collection-owned passport projection fields
- advanced list personalization and sorting policies

## 6. Eligibility and Publication Gates

Collection list inclusion requires all core gates:

1. collection approved for public-safe published posture.
2. safe slug format and route-safe value.
3. safe copy validation for title and summary.
4. safe hero image policy compliance.
5. safe taxonomy tags only.
6. no forbidden/private fields in projected payload.
7. no commerce workflow semantics in list output.

Conditional gates:

- Product references:
  - optional;
  - if surfaced, only public-safe eligible product context may appear.
- Supplier references:
  - optional;
  - if surfaced, supplier context must pass publication and public-safe gates.
- Trust context:
  - optional;
  - if surfaced, trust label and trust flag must pass evidence/publication gates.

Fail-closed behavior:

- if core gates fail, omit collection from list output or return safe no-signal list state;
- do not expose internal gate failure reasons;
- do not expose linkage metadata or private identifiers.

## 7. Product Reference Rules

- Product references are optional.
- List projection must not require product references.
- Only public-safe eligible product previews may be counted or referenced.
- Product passport references are allowed only as product-scoped eligible references where explicitly approved.
- Product passport status never creates or implies collection passport status.
- Missing, unpublished, or ineligible product references fail closed to omission.
- No private product linkage identifiers may be exposed.

## 8. Supplier Reference Rules

- Supplier references are optional.
- Public supplier context requires publication and public-safe gate approval.
- No private contacts, private documents, private pricing, private inventory, negotiation, or private workflow data may be exposed.
- Current supplier production data-limited posture is a downstream verification constraint, not a rule exception.
- Missing or ineligible suppliers fail closed to omission.
- No supplier-private linkage metadata may be exposed.

## 9. Trust / DPP Rules

- collectionHasTrustContext may be derived only from approved evidence and publication gates.
- Trust language must remain conditional and bounded.
- No collection verified claim is allowed in this list projection phase.
- No universal all products verified claim is allowed.
- No collection-owned passport field is allowed in list projection for now.
- Product-scoped passport references may appear only as product-scoped eligible context where explicitly approved.
- Product passport state must never be converted into collection passport state.
- No public passport directory behavior is introduced by this list design.

## 10. Authenticated Continuation CTA Rules

Allowed CTA semantics:

- continue after sign-in,
- view authenticated continuation,
- request access or interest continuation where approved.

Required CTA constraints:

- CTA metadata must be non-transactional and public-safe.
- CTA must not imply checkout, cart, wishlist, order, RFQ, or buyer intent submission.
- CTA must not expose private workflow state.
- CTA must preserve attraction to authenticated continuity boundary.

## 11. Empty and Fallback States

Define safe list behavior for:

- No published collections:
  - return safe empty list with public-safe empty-state messaging.
- Data unavailable:
  - return safe fallback mode and no diagnostic internals.
- Partial product references:
  - keep collection visible if core gates pass, omit ineligible product refs.
- Partial supplier references:
  - keep collection visible if core gates pass, omit ineligible supplier context.
- Trust unavailable:
  - set collectionHasTrustContext to false, omit trust label.
- Public route reachable but no eligible records:
  - render safe no-signal state without exposing gate internals.

## 12. Public / Private Boundary

List projection must not expose:

- private IDs,
- ownerOrgId or tenant IDs,
- internal entity linkage IDs,
- internal evidence IDs,
- supplier private documents or contacts,
- private pricing or inventory,
- buyer intent, RFQ, order, or negotiation state,
- rankings, scores, recommendations,
- AI/vector outputs,
- Aggregator intelligence,
- checkout/cart/wishlist/order behavior,
- universal DPP/passport/trust claims.

## 13. Downstream Impact

### PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001

- Must reuse list-level field safety and fail-closed principles.
- May expand detail-safe fields without violating list boundary rules.
- Must preserve no-inheritance and no collection-owned passport assumptions.

### D2C-ORIGIN-STORYTELLING-GOVERNANCE-001

- Must keep origin language conditional and evidence-gated.
- Must align storytelling taxonomy/copy to list projection constraints.

### D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001

- Must align CTA metadata and continuation boundaries.
- Must keep private workflow payloads out of public projection.

### PUBLIC-COLLECTIONS-PROJECTION-IMPLEMENTATION-001

- Must implement only the approved conceptual shape and gates from this design.
- Must preserve fail-closed omissions for ineligible product/supplier/trust references.
- Must not introduce collection-owned passport runtime semantics unless separately approved.

## 14. Deferred Decisions

- Exact runtime contract schema for list endpoint.
- Exact eligibility scoring or ordering policy beyond safe curation posture.
- Exact mechanism for eligible product preview policy encoding.
- Exact supplier context taxonomy labels beyond approved public-safe set.
- Exact future collection-owned passport route/token/projection model.

## 15. Acceptance Criteria

Design is complete only if all are true:

- public list projection shape is defined,
- field classifications are explicit,
- inclusion and publication gates are explicit,
- product reference handling is bounded,
- supplier reference handling is bounded,
- trust and DPP handling is conditional and evidence-gated,
- collection-owned passport remains deferred,
- fallback behavior is fail-closed,
- public and private boundary is explicit,
- no runtime changes are made in this unit.