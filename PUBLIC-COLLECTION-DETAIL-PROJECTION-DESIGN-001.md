# PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001
## Public Collection Detail Projection Design

## 1. Status Summary

- Mode: design-only governance artifact.
- Status: READY_FOR_REVIEW.
- Scope boundary: defines future public-safe detail projection design for /collections/:slug only.
- No runtime, schema, migration, route, OpenAPI, service, or UI implementation is included.
- This unit extends PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001 to detail level only.

## 2. Current Repo Truth

- /collections currently resolves to PUBLIC_COLLECTIONS and renders PublicCollectionsStub — a concept/stub surface only.
- /collections/:slug currently resolves to PUBLIC_COLLECTION_DETAIL_UNAVAILABLE and renders PublicCollectionUnavailable — a safe unavailable placeholder surface only.
- PublicCollectionUnavailable renders a safe message: "This public collection preview is not currently available."
- PublicCollectionUnavailable explicitly states it does not expose private collection data, does not imply collection-level passport or trust coverage, and does not confirm implemented runtime collection semantics.
- No runtime public collection detail projection is implemented.
- No collection-owned passport runtime is implemented.
- Product passport behavior remains product-scoped and conditional:
  - Product passport CTA renders only when both hasPassport and publicPassportId are present.
  - Public token lookup is product-scoped via /api/public/dpp/:publicPassportId.
- Product-level passport context is authoritative for current public token behavior; this must not be reinterpreted as collection passport status.
- No approved public passport directory exists; public passport access remains direct-link/QR style.

## 3. Projection Purpose

The /collections/:slug detail projection is the public story and showcase detail surface for a single approved D2C collection.

It is not:

- commerce infrastructure,
- checkout, cart, wishlist, or order infrastructure,
- sourcing, RFQ, or buyer intent infrastructure,
- ranking, recommendation, or aggregation intelligence infrastructure,
- public passport directory infrastructure.

Primary role:

- present the approved public-safe story body and rich content for one named collection,
- present eligible evidence-gated trust, origin, traceability, and certification summaries conditionally,
- present optional eligible product and supplier context where gate-approved,
- preserve conditional DPP language without implying collection-owned passport status,
- provide authenticated continuation CTA metadata without transactional semantics.

## 4. Public Detail Projection Shape

Conceptual payload shape for /collections/:slug:

```json
{
  "collection": {
    "publicSlug": "string",
    "title": "string",
    "summary": "string",
    "storyBody": "string",
    "heroImage": {
      "url": "string",
      "alt": "string"
    },
    "galleryImages": [
      {
        "url": "string",
        "alt": "string"
      }
    ],
    "categoryTags": ["string"],
    "materialTags": ["string"],
    "segmentTags": ["string"],
    "collectionStoryType": "string",
    "curatedContextLabel": "string",
    "collectionHasTrustContext": false,
    "trustSummary": {
      "present": false,
      "label": "string",
      "conditionStatement": "string"
    },
    "originSummary": {
      "present": false,
      "label": "string",
      "conditionStatement": "string"
    },
    "traceabilitySummary": {
      "present": false,
      "label": "string",
      "conditionStatement": "string"
    },
    "certificationSummary": {
      "present": false,
      "label": "string",
      "conditionStatement": "string"
    },
    "eligibleProductRefs": [
      {
        "publicProductSlug": "string",
        "productTitle": "string",
        "productPreviewLabel": "string",
        "hasPassport": false,
        "publicPassportId": null
      }
    ],
    "supplierContextSummary": {
      "present": false,
      "label": "string",
      "conditionStatement": "string"
    },
    "authenticatedContinuationCta": {
      "label": "string",
      "action": "AUTH_CONTINUE",
      "target": "/auth",
      "intent": "COLLECTION_DETAIL_CONTINUATION"
    },
    "detailState": {
      "availability": "AVAILABLE",
      "fallbackLabel": "string"
    }
  }
}
```

Shape constraints:

- storyBody is public-safe copy-governed text only; no private metadata embedded,
- galleryImages are optional and gate-compliant,
- trust/origin/traceability/certification summaries are optional and evidence-gated,
- eligibleProductRefs are optional and bounded to public-safe display fields,
- product passport refs within eligibleProductRefs appear only where explicitly gate-approved,
- no collection-owned passport fields are included in this phase,
- supplierContextSummary is optional and gate-approved only.

## 5. Field Classification

### Public-safe

- publicSlug
- title
- summary
- storyBody (copy-governed)
- heroImage.url
- heroImage.alt
- galleryImages[].url
- galleryImages[].alt
- categoryTags
- materialTags
- segmentTags
- collectionStoryType
- curatedContextLabel
- authenticatedContinuationCta.label
- authenticatedContinuationCta.action
- authenticatedContinuationCta.target
- authenticatedContinuationCta.intent
- detailState.availability
- detailState.fallbackLabel
- eligibleProductRefs[].publicProductSlug
- eligibleProductRefs[].productTitle
- eligibleProductRefs[].productPreviewLabel

### Evidence-gated

- collectionHasTrustContext (derived from approved evidence and publication gates)
- trustSummary.present
- trustSummary.label
- trustSummary.conditionStatement
- originSummary.present
- originSummary.label
- originSummary.conditionStatement
- traceabilitySummary.present
- traceabilitySummary.label
- traceabilitySummary.conditionStatement
- certificationSummary.present
- certificationSummary.label
- certificationSummary.conditionStatement
- eligibleProductRefs[].hasPassport (product-scoped only, evidence-gated)
- eligibleProductRefs[].publicPassportId (product-scoped only, evidence-gated)
- supplierContextSummary.present
- supplierContextSummary.label
- supplierContextSummary.conditionStatement

### Derived or fail-closed

- collectionHasTrustContext (derives to false when evidence gates unavailable)
- detailState.availability (derives to UNAVAILABLE when detail gates fail)
- trustSummary.present (derives to false when evidence gates unavailable)
- originSummary.present (derives to false when evidence gates unavailable)
- traceabilitySummary.present (derives to false when evidence gates unavailable)
- certificationSummary.present (derives to false when evidence gates unavailable)
- supplierContextSummary.present (derives to false when supplier gates unavailable)

### Authenticated-only

- private collection workflow detail
- private continuity and sourcing payloads
- private supplier documents and contacts
- buyer intent and RFQ payloads
- negotiation and order context
- private product linkage and sourcing records

### Internal-only

- ownerOrgId and all tenant identifiers
- internal collection database IDs
- internal product/supplier/evidence linkage IDs
- publication workflow metadata and status detail
- internal evidence/approval/linkage audit metadata
- lifecycle status raw values

### Forbidden

- private contacts and private documents
- private pricing and inventory
- rankings, scores, recommendations, or affinity signals
- AI/vector outputs or Aggregator intelligence
- checkout/cart/wishlist/order fields
- universal trust/passport/origin/certification/traceability claims
- collection-owned passport fields or token semantics in this phase
- collectionHasPassport as a direct value
- collectionPublicPassportId in current phase
- any field implying collection-level DPP/passport coverage

### Deferred

- collection-owned passport token and route semantics
- collection-owned passport projection fields
- storyBody rich media embedding beyond approved copy
- advanced gallery ordering or interactive media fields
- advanced product/supplier eligibility scoring

## 6. Detail Eligibility and Publication Gates

Collection detail page must pass all core gates before detail projection is returned:

1. Collection approved for public-safe published posture.
2. Safe slug format and route-safe value confirming the named collection exists.
3. Safe copy validation for title, summary, and storyBody.
4. Safe hero image policy compliance.
5. Gallery images, if present, must each pass safe image policy compliance.
6. Safe taxonomy tags only; no forbidden or private taxonomy values.
7. No forbidden/private fields in projected payload.
8. No commerce workflow semantics in detail output.

Conditional gates:

- Product references:
  - optional;
  - if surfaced, only public-safe eligible product context may appear per product-level gates.
- Supplier references:
  - optional;
  - if surfaced, supplier context summary must pass supplier publication and public-safe gates.
- Trust/origin/traceability/certification summaries:
  - optional;
  - if surfaced, each summary must pass approved evidence and publication gates before rendering.

Fail-closed behavior:

- if the slug is unknown, return safe unavailable projection (see section 11);
- if the collection exists but is unpublished, archived, or gate-failed, return safe unavailable projection;
- do not expose internal gate failure reasons in public detail payload;
- do not expose private linkage metadata in fallback payload;
- do not fall back from collection context into product or passport context;
- fail-closed means: missing or unavailable gates default to false, null, or empty rather than partial exposure.

## 7. Product Reference Rules

- Product references are optional in detail projection.
- Detail projection must not require product references to be considered valid.
- Only public-safe eligible product references may be included.
- Product preview fields must be bounded to public-safe display data: publicProductSlug, productTitle, productPreviewLabel.
- Product passport references (hasPassport, publicPassportId) may appear only as product-scoped eligible references within eligibleProductRefs where explicitly gate-approved.
- Product passport status (hasPassport, publicPassportId) at product level does not create or imply any collection-level passport status.
- Missing, unpublished, or ineligible product references fail closed to omission from eligibleProductRefs.
- No private product database IDs, private product linkage IDs, or internal product node IDs may be exposed in any eligibleProductRefs entry.
- Full product detail (description, pricing, inventory, sourcing terms, private media) is not included in eligibleProductRefs.

## 8. Supplier Reference Rules

- Supplier references are optional in detail projection.
- Supplier context must be represented only as a bounded supplierContextSummary with conditional present flag and public-safe label/conditionStatement.
- Supplier context must pass supplier publication and public-safe gates before surfacing.
- Supplier summary must not expose private contacts, private documents, pricing, inventory, negotiation records, or private workflow data.
- Current supplier production data-limited posture (no supplier records passing all publication gates) is a downstream verification constraint and does not create a rule exception.
- Missing or ineligible supplier references fail closed to supplierContextSummary.present = false and omission of label/conditionStatement.
- No supplier-private linkage metadata, private IDs, or supplier-internal configuration may be exposed.

## 9. Trust / Origin / DPP Rules

- collectionHasTrustContext must be derived from approved evidence and publication gates only; it must default to false when evidence is unavailable.
- trustSummary, originSummary, traceabilitySummary, and certificationSummary must be conditional and evidence-gated; each must default to present = false when evidence gates are unavailable.
- Conditional statement language within each summary must remain bounded:
  - "Some products in this collection may include..." is allowed.
  - "All products in this collection are certified..." is forbidden.
  - "This collection is fully traceable..." is forbidden.
- No "collection verified" claim is allowed unless a future dedicated collection-owned trust/passport implementation explicitly approves it.
- No universal "all products verified" claim is allowed.
- No collection-owned passport field (collectionHasPassport, collectionPublicPassportId, or equivalent) is included in detail projection for this phase.
- Product-scoped passport refs (hasPassport, publicPassportId within eligibleProductRefs) may appear only as product-scoped context where gate-approved; they do not create collection passport status.
- Product passport state must never be converted into collection passport state or collection trust state.
- No public passport directory behavior is introduced by this detail projection design.
- All trust/origin/traceability/certification language must preserve conditionality and avoid over-claim.

## 10. Authenticated Continuation CTA Rules

Allowed CTA semantics for detail level:

- continue after sign-in,
- view authenticated continuation of this collection,
- request access or express interest where explicitly approved,
- inquiry preparation invitation where explicitly approved and non-transactional.

Required CTA constraints:

- CTA metadata must be non-transactional and public-safe.
- CTA must not imply checkout, cart, wishlist, order, RFQ submission, buyer intent submission, negotiation, or private sourcing workflow.
- CTA must not expose private workflow state or private collection context.
- CTA must not expose authenticated pricing, inventory, or sourcing terms.
- CTA must preserve the boundary between public attraction and authenticated continuation.
- Detail CTA intent value should be COLLECTION_DETAIL_CONTINUATION to distinguish from list-level COLLECTION_CONTINUATION intent.

## 11. Empty, Fallback, and Unavailable States

Define safe behavior for each condition:

- Unknown slug:
  - return safe unavailable projection: availability = UNAVAILABLE, safe fallback label, no diagnostic internals.
- Unpublished collection:
  - return safe unavailable projection; do not confirm existence or partial state.
- Archived collection:
  - return safe unavailable projection; do not distinguish archived from unpublished in public payload.
- Unavailable collection (gate-failed or posture-failed):
  - return safe unavailable projection; do not expose internal gate failure reason.
- Collection with no eligible product refs:
  - return full detail projection with eligibleProductRefs = empty array; do not degrade availability.
- Collection with no eligible supplier refs:
  - return detail projection with supplierContextSummary.present = false; do not degrade availability.
- Collection with unavailable trust data:
  - return detail projection with collectionHasTrustContext = false and all summary present flags = false; do not degrade availability.
- Route reachable but no eligible public detail data:
  - return safe unavailable projection with availability = UNAVAILABLE and safe fallback label.
- Safe unavailable projection envelope:
  - must not expose private IDs, internal gate status, private collection metadata, or private linkage data;
  - must not fall back from collection context into product or passport context;
  - may include safe navigation actions back to /collections or to public product/sign-in surfaces.

## 12. Public / Private Boundary

Detail projection must not expose any of the following:

- private IDs of any kind,
- ownerOrgId or tenant identifiers,
- internal collection database IDs,
- internal product or supplier linkage IDs,
- internal evidence/approval/audit IDs,
- supplier private documents, contacts, or communications,
- private pricing or inventory data,
- buyer intent, RFQ, order, or negotiation state,
- private workflow metadata,
- rankings, scores, recommendation outputs, or affinity signals,
- AI/vector outputs or Aggregator intelligence of any kind,
- checkout, cart, wishlist, or order behavior,
- universal DPP, passport, trust, origin, certification, or traceability claims,
- collection-owned passport token or route semantics in current phase.

This boundary is constitutional and must be enforced by every downstream implementation unit.

## 13. Relationship to List Projection

Detail projection extends the list projection (PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001) with the following expansions:

- storyBody: list uses summary only; detail expands to full story body where public-safe copy is available.
- galleryImages: list does not include a gallery; detail may include optional public-safe gallery images.
- trust/origin/traceability/certification summaries: list uses a single collectionHasTrustContext flag and a bounded trustLabel; detail expands to individual conditional summary objects per domain (trust, origin, traceability, certification).
- eligibleProductRefs: list uses a bounded eligibleProductPreview count/policy; detail expands to an optional array of bounded product reference objects.
- supplierContextSummary: list uses a bounded supplierContextLabel; detail expands to a structured conditional supplierContextSummary object.
- detailState: list uses listState; detail uses detailState with the same fail-closed availability semantics.

Reused from list projection without change:

- same core field safety gates,
- same fail-closed fallback semantics,
- same no-collection-owned-passport assumption,
- same no-product-to-collection-inheritance assumption,
- same public/private boundary rules,
- same forbidden field set,
- same CTA constraint rules (intent value distinguished at detail level).

Constraints on expansion:

- detail must not introduce new field categories that violate list-level safety gates,
- detail must not introduce evidence-gated fields without explicit gate approval at detail level,
- detail must not introduce collection-owned passport semantics before discriminator units approve it.

## 14. Downstream Impact

### D2C-ORIGIN-STORYTELLING-GOVERNANCE-001

- Detail storyBody and origin/traceability summary fields are direct inputs to origin storytelling governance.
- Origin language must remain conditional and evidence-gated as defined in section 9.
- No "fully traceable" or "all products certified" language is allowed in storyBody or summaries.

### D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001

- authenticatedContinuationCta at detail level defines the boundary between public attraction and authenticated continuation.
- Handoff design must align CTA target, intent, and action with this projection's COLLECTION_DETAIL_CONTINUATION semantics.
- Private workflow payloads must remain out of public projection.

### PUBLIC-COLLECTIONS-PROJECTION-IMPLEMENTATION-001 (future)

- Must implement the accepted list projection shape from PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001.
- Must not introduce detail-level fields into the list projection before this design is formally referenced.

### PUBLIC-COLLECTION-DETAIL-PROJECTION-IMPLEMENTATION-001 (future)

- Must implement only the approved conceptual shape and gates from this design.
- Must preserve fail-closed unavailable behavior for unknown/unpublished/gate-failed slugs.
- Must preserve no-inheritance and no-collection-owned-passport assumptions.
- Must not introduce collection-owned passport runtime semantics unless separately approved by discriminator and model units.

### PUBLIC-DPP-COLLECTION-LINKING-IMPLEMENTATION-001 (future)

- Must consume the eligible product passport ref model as defined in section 7.
- Must enforce no collection-owned passport projection until discriminator units complete.
- Must enforce trust/origin/traceability/certification evidence gating as defined in section 9.

## 15. Deferred Decisions

- Exact runtime contract schema for detail endpoint.
- Exact copy/tone governance policy for storyBody length, structure, and language.
- Exact gallery image policy and ordering rules.
- Exact mechanism for encoding originSummary, traceabilitySummary, and certificationSummary evidence tiers.
- Exact eligible product preview ordering/sorting policy within eligibleProductRefs.
- Exact supplier context taxonomy label vocabulary beyond the approved conditional summary model.
- Exact future collection-owned passport route, token, and projection model — blocked on discriminator decision implementation.
- Exact authenticated continuation handoff payload beyond CTA metadata.

## 16. Acceptance Criteria

Design is complete only if all are true:

- public detail projection shape is defined,
- field classifications are explicit for all fields in the conceptual shape,
- detail inclusion and publication gates are explicit,
- product reference handling is bounded and no-inheritance rule is preserved,
- supplier reference handling is bounded and fail-closed,
- trust/origin/traceability/certification handling is conditional and evidence-gated,
- collection-owned passport remains deferred in this phase,
- unavailable/fallback behavior is fail-closed for all named conditions,
- relationship to list projection is explicit with named expansions and reused rules,
- public/private boundary is explicitly enumerated,
- no runtime, schema, migration, route, OpenAPI, service, or UI changes are made in this unit.
