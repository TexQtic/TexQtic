# D2C-ORIGIN-STORYTELLING-GOVERNANCE-001
## D2C Origin, Trust, and Storytelling Governance

## 1. Status Summary

- Mode: governance/design-only artifact.
- Status: READY_FOR_REVIEW.
- Scope boundary: defines copy/claims governance rules for D2C collection storytelling across origin, traceability, certification, trust, artisan, supplier, material, and sustainability claim categories.
- No runtime, schema, migration, route, OpenAPI, service, or UI implementation is included.
- This unit governs the language rules that future list/detail projection implementation units must enforce.

## 2. Current Repo Truth

- /collections currently resolves to PublicCollectionsStub — a concept/stub surface only; no runtime list projection is implemented.
- /collections/:slug currently resolves to PublicCollectionUnavailable — a safe unavailable placeholder surface only; no runtime detail projection is implemented.
- PublicCollectionsStub copy states: "Verified Textile Collections are being prepared as public-safe curated story and showcase previews." This language is bounded and already consistent with conditional story posture.
- PublicCollectionUnavailable explicitly states it does not imply collection-level passport or trust coverage.
- No runtime collection-owned passport exists.
- Product passport behavior remains product-scoped and conditional: CTA renders only when both hasPassport and publicPassportId are present.
- List and detail projection governance artifacts exist as design-only units (PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001, PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001).
- Industry/cluster taxonomy decision (INDUSTRY-CLUSTER-TAXONOMY-DECISION-001) establishes approved vocabulary that D2C collection framing must reuse and must not independently extend.
- B2C-CATEGORY-TAXONOMY-ALIGNMENT-001 artifact was not found in the repository; B2C taxonomy alignment remains a separate concern.
- No "drops" terminology, ranking language, commerce urgency, or universal verification language appears in current collection surfaces.
- Current collection copy is already consistent with this governance unit's requirements at the stub level.

## 3. Governance Purpose

D2C origin storytelling governance is required before collection list/detail projection implementation because:

1. Implementation without copy/claims rules risks unsupported origin, artisan, sustainability, or certification assertions being embedded in live public collection surfaces.
2. Without bounded claim language, projection fields such as storyBody, originSummary, traceabilitySummary, certificationSummary, and trustSummary could be populated with over-claims that contradict evidence gate rules.
3. Product passport presence for individual products could be incorrectly interpreted as collection-level verification without explicit language boundaries.
4. Supplier-level evidence could be incorrectly extrapolated into collection-level sustainability or artisan claims.
5. Industry/cluster taxonomy vocabulary must be reused consistently; D2C collections must not invent parallel factual claims about regions, clusters, fiber types, or compliance frameworks.
6. Public trust language must remain conditional to preserve brand integrity, legal safety, and governance compliance across all public surfaces.

This governance unit does not implement copy. It defines the rules that govern how approved copy may be written, validated, and enforced when implementation units are ready.

## 4. Claim Categories

The following claim categories are governed by this unit:

### 4.1 Origin Claims

Claims about where a product, collection, material, or supplier originates geographically or within a supply chain.

- Examples in scope: country or region of manufacture, fiber origin, cluster association, supply chain tier positioning.
- Applies to: storyBody, originSummary, curatedContextLabel, supplierContextSummary.

### 4.2 Artisan / Craft Claims

Claims that assert handcraft quality, artisan skill, craft tradition, or heritage technique.

- Examples in scope: "artisan-made," "handwoven," "heritage craft," "traditional technique."
- Applies to: storyBody, trustSummary, curatedContextLabel.

### 4.3 Supplier / Community Claims

Claims about supplier identity, community sourcing, cooperative structure, or social context.

- Examples in scope: "sourced from supplier clusters," "community supply chain," "small-producer context."
- Applies to: supplierContextSummary, storyBody.

### 4.4 Material / Fiber / Fabric Claims

Claims about material composition, fiber provenance, fabric quality, or textile specification.

- Examples in scope: organic cotton, natural dyes, specific fiber type, weave construction.
- Applies to: materialTags, storyBody, summary.

### 4.5 Sustainability / Environmental Claims

Claims about environmental footprint, sustainable sourcing, ecological certification, or low-impact production.

- Examples in scope: sustainable sourcing, low-impact dyeing, eco-friendly materials, reduced waste claims.
- Applies to: storyBody, trustSummary, certificationSummary, curatedContextLabel.

### 4.6 Certification / Compliance Claims

Claims about formal third-party certifications, compliance frameworks, audit outcomes, or standards adherence.

- Examples in scope: GOTS, OEKO-TEX, Fair Trade, BCI, organic certification, compliance audit.
- Applies to: certificationSummary, trustSummary, storyBody.

### 4.7 Traceability Claims

Claims about supply chain traceability, provenance verification, chain-of-custody, or ingredient tracking.

- Examples in scope: traced supply chain, fiber provenance, yarn-to-garment trail.
- Applies to: traceabilitySummary, storyBody.

### 4.8 DPP / Passport / Trust Claims

Claims about digital product passport availability, trust verification status, or public trust links.

- Examples in scope: passport availability, trust context, verified origin record, DPP coverage.
- Applies to: trustSummary, eligibleProductRefs, collectionHasTrustContext.

### 4.9 Curation / Story / Editorial Claims

Claims about the curation rationale, collection story, editorial narrative, or platform positioning.

- Examples in scope: "curated for…," "a collection that tells the story of…," "we have selected…."
- Applies to: storyBody, summary, collectionStoryType, curatedContextLabel, title.

## 5. Claim Classification Model

Each claim type is classified as follows. Implementation units must enforce this classification model in content validation gates.

### Always Allowed — Public-Safe Editorial Language

These claim patterns may appear without additional evidence gating:

- Curated story framing that describes what the collection represents editorially.
- General material and taxonomy tags drawn from approved INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 vocabulary.
- Bounded conditional phrases: "where available," "may include," "eligible products may include," "some products in this collection."
- Authenticated continuation language: "continue after sign-in," "authenticated context available."
- Safe unavailability and discovery routing language.

### Conditionally Allowed — Evidence Required

These claim patterns may appear only when approved evidence and publication gates pass:

- Origin summary with bounded language: requires approved origin data in publication posture.
- Trust summary present flag and label: requires approved trust evidence state.
- Traceability summary: requires approved traceability evidence state.
- Certification summary: requires valid, published certification record against approved certification vocabulary.
- Sustainability claim framing: requires approved evidence; no bare assertions.
- Artisan/craft framing: requires approved editorial rationale; no unverified heritage assertions.

### Conditionally Allowed — Product-Scoped Evidence Only

These claim patterns may appear only as bounded product-level context within eligibleProductRefs:

- Product passport reference: hasPassport + publicPassportId per product-scoped gate.
- Product trust signal: per product-level evidence state only.
- Product certification or traceability indicator: per product-level projection scope only.

None of these product-scoped signals may be promoted to collection-level claims.

### Conditionally Allowed — Supplier / Publication Gate Only

These claim patterns may appear only when a supplier passes all supplier publication and public-safe gates:

- Supplier context summary with bounded conditional language.
- Supplier segment or role context where approved.
- Supplier cluster or geographic framing where approved from INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 vocabulary.

### Authenticated-Only

The following claim categories must remain behind authentication:

- Specific supplier identities with private contact information.
- Detailed sourcing terms, pricing, or inventory context.
- Private audit records, certification document links, or compliance file references.
- Buyer intent signals, RFQ intake, negotiation context, or order state.
- Specific private workflow continuation payloads.

### Internal-Only

The following must never appear in public copy or public payloads:

- Internal evidence IDs and audit record identifiers.
- Internal publication workflow status detail.
- Internal gate failure reasons.
- ownerOrgId, tenant identifiers, or internal database IDs.

### Forbidden

The following claim patterns are forbidden in all public collection copy:

- Universal verification claims (see section 7 for explicit examples).
- Collection-owned passport claims or DPP-backed collection assertions in current phase.
- Ranking, recommendation, score, or affinity language.
- Commerce urgency language: pricing, availability, inventory, "limited stock," "on sale," "add to cart."
- "Drops" / "drop" terminology.
- AI/vector output language or Aggregator intelligence language.
- Any claim that implies product-level evidence has been promoted to collection-level truth.

### Deferred

- Collection-level verified claim language that would require collection-owned passport implementation.
- Collection-level sustainability certification language that would require dedicated certification linkage model.
- Advanced provenance/chain-of-custody claim language beyond current approved conditional scope.

## 6. Allowed Language Examples

The following are approved phrase patterns for each claim context. Implementation units must validate copy against these patterns.

### Curated Collection Story Language

- "A curated story of textile craft and verified supplier context where available."
- "This collection brings together eligible products that may include public trust context."
- "Curated to showcase [region/segment/material] textiles — trust and origin context available where approved."
- "This collection presents products from suppliers working with [material/segment] textile traditions."

### Conditional Origin Language

- "Origin context may be available for selected products in this collection."
- "Some products in this collection include supplier origin context where publication-approved."
- "Where available, origin context is shown from approved supplier records."
- "Cluster and regional context is directional and conditional where available."

### Conditional Material Language

- "Materials featured in this collection may include [material tag from approved taxonomy]."
- "Products in this collection may feature [fiber/fabric] materials where available."
- "Material context is shown where product records include approved material data."

### Conditional Trust / Passport Language

- "Public trust context may be available for selected products in this collection."
- "Eligible products may include a public trust and origin passport where available."
- "Trust signals are shown where approved for individual products — collection-level trust context is conditional."
- "Where available, individual products in this collection may include verified trust context."

### Supplier Context Language

- "Supplier context is shown only where publication-approved."
- "Some products in this collection are associated with suppliers that include public-safe trust context."
- "Supplier and origin context is conditional and may not be available for all products."

### Authenticated Continuation Language

- "Continue after sign-in for authenticated collection context."
- "Sign in to view detailed sourcing context and supplier information."
- "Authenticated continuation available for eligible workflows."
- "Request access to explore supplier context and sourcing continuity."

## 7. Forbidden Language Examples

The following phrase patterns are explicitly forbidden from appearing in any public D2C collection copy, labels, storyBody, summary, or projection fields.

### Universal Verification Forbids

- "Verified collection"
- "This is a verified collection"
- "All products in this collection are verified"
- "Fully verified textile collection"
- "100% verified source collection"

### Universal Certification Forbids

- "Certified sustainable collection"
- "All products certified"
- "GOTS-certified collection" (without individual product-level certification evidence for each product)
- "Fully certified"
- "Compliance-backed collection"

### Universal Traceability Forbids

- "Fully traceable collection"
- "Complete supply chain traceability"
- "All products are traceable"
- "Fully transparent collection"
- "End-to-end traceability guaranteed"

### Origin Guarantee Forbids

- "Guaranteed origin"
- "Origin-guaranteed collection"
- "Authentically sourced" (as an absolute claim)
- "100% traceable origin"

### Artisan / Craft Over-Claim Forbids

- "Artisan verified"
- "Artisan-certified collection"
- "Handmade-verified"
- "Master craftsperson certified"

### DPP / Passport Collection Claim Forbids

- "DPP-backed collection"
- "Passport for this collection"
- "Collection has a digital passport"
- "Collection-level DPP coverage"
- "This collection is passported"
- collectionHasPassport implied as true without discriminator and model implementation

### Terminology Forbids

- "Drop" / "Drops" in any context
- "Limited drop"
- "Collection drop"
- "Exclusive drop"

### Commerce and Urgency Forbids

- "Add to cart" / "Buy now" / "Checkout" / "Order now"
- "Limited stock" / "Low inventory" / "Only X remaining"
- "On sale" / "Discounted" / "Best price"
- "Wishlist" / "Save for later" (as public-facing commerce action)

### Intelligence and Ranking Forbids

- "Top-rated collection"
- "AI-curated selection"
- "Recommended for you" (as a public collection-level claim)
- "Best match collection"
- "TexQtic recommends this collection"
- Any Aggregator intelligence language or score-based ranking language

## 8. Evidence Gate Rules

These rules govern when a claim category may be surfaced in public projection fields.

### 8.1 Origin Claims

- Approved gate: collection-level origin data is approved for public posture AND origin evidence passes publication gate.
- Fail-closed: if gate fails or evidence is missing, originSummary.present = false; no origin language renders.
- Upgrade forbidden: product-level origin data must not be promoted to a collection-level origin claim.
- Vocabulary constraint: all origin language must use approved region/cluster vocabulary from INDUSTRY-CLUSTER-TAXONOMY-DECISION-001.

### 8.2 Supplier Claims

- Approved gate: supplier must pass full supplier publication and public-safe eligibility gate.
- Fail-closed: if gate fails, supplierContextSummary.present = false; no supplier language renders.
- Data limitation: current production posture means no supplier records pass all publication gates; this is a data state and does not create a rule exception.
- Privacy constraint: supplier private contacts, documents, pricing, inventory, and negotiation records must never appear.

### 8.3 Material Claims

- Approved gate: material taxonomy values must be drawn from approved INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 vocabulary.
- Fail-closed: unsupported or unapproved material terms must not render.
- No invented taxonomy: D2C collection copy must not introduce material taxonomy terms not present in the approved vocabulary.

### 8.4 Certification / Compliance Claims

- Approved gate: valid certification record must be present, published, and passing public posture gate.
- Gate requirements: certification body, standard name, and scope must be approved for public reference.
- Fail-closed: if certification evidence is missing or unpublished, certificationSummary.present = false; no certification language renders.
- Scope constraint: a certification held by one product in the collection must not be presented as a collection-level certification.

### 8.5 Traceability Claims

- Approved gate: traceability evidence state must be approved and published for the relevant entity (product or supplier).
- Fail-closed: if evidence is missing, traceabilitySummary.present = false; no traceability language renders.
- Product-to-collection upgrade forbidden: product-level traceability signals must not be presented as collection-level traceability coverage.

### 8.6 Sustainability Claims

- Approved gate: sustainability claim must be backed by approved certification evidence or approved editorial scope; bare sustainability assertions are forbidden without evidence.
- Fail-closed: if sustainability evidence is missing, sustainability language must not render in any summary or storyBody.
- Scope constraint: "some eligible products may include sustainable sourcing context where approved" is the safe bounded form; universal sustainability claims are forbidden.

### 8.7 Product Passport References

- Approved gate: individual product within eligibleProductRefs must have hasPassport = true AND publicPassportId present.
- Fail-closed: if either condition is missing, hasPassport = false and publicPassportId = null in that eligibleProductRefs entry.
- Promotion forbidden: the presence of passport refs within eligibleProductRefs must not cause any collection-level claim of verification.
- No new collection trust state: product passport refs are bounded to product-level context only.

### 8.8 Collection Trust Summary

- Approved gate: collectionHasTrustContext may derive to true only when at least one evidence-gated trust, origin, traceability, or certification field passes its own gate.
- Fail-closed: if no trust-relevant gate passes, collectionHasTrustContext = false; trustSummary.present = false.
- Wording constraint: trust summary label and conditionStatement must use bounded conditional language only (see section 6).

### 8.9 Fail-Closed Principle (Universal)

- Evidence missing → omit the claim; do not substitute with softer unfounded assertion.
- Evidence ambiguous → treat as missing; fail closed to no-signal.
- Evidence partial (some products only) → use bounded conditional language ("some," "eligible," "where available"); never upgrade to a universal claim.
- Never upgrade product-level evidence to collection-level proof.
- Never treat supplier-level evidence as collection-level proof unless explicitly modeled and approved in a future unit.

## 9. StoryBody Rules

The future detail `storyBody` field is public-safe copy-governed text. All storyBody content must comply with the following rules:

### 9.1 Allowed Content

- Editorial narrative describing the collection's curation rationale.
- Conditional origin or geographic context using approved taxonomy vocabulary and bounded conditional phrases.
- Conditional material and fiber context using approved material taxonomy vocabulary.
- Conditional trust, sustainability, or artisan framing using approved bounded language (see section 6).
- Authenticated continuation invitation using approved CTA language.
- References to supplier context using conditional, gate-bounded language.

### 9.2 Required Language Behavior

- Any claim about origin, traceability, certification, or trust must use conditional bounded phrases: "where available," "may include," "eligible products may include," "some products in this collection."
- No absolute assertions may appear even in editorial framing.
- Claims must not exceed the evidence available for the collection or its constituent products.

### 9.3 Forbidden Content

- Private supplier data, private contacts, private documents, or private pricing.
- Buyer/supplier negotiation language.
- Pricing, inventory, or availability urgency language.
- Universal verification or certification claims.
- Collection-owned passport implications or DPP-backed language.
- "Drops" terminology.
- Commerce action language: checkout, cart, order, buy, wishlist.
- Rankings, recommendations, scores, affinity signals.
- AI/vector output language.
- Aggregator intelligence language.
- Internal evidence ID references or internal publication workflow references.
- Any language that implies product-level evidence has been converted into collection-level proof.

### 9.4 Length and Structure Constraints

- storyBody content must be bounded to public-safe editorial length; exact length limits are deferred to storyBody copy governance.
- storyBody must not embed structured data, JSON, or technical metadata.
- storyBody must not contain hyperlinks to private resources, authenticated endpoints, or internal tooling.

## 10. Summary Field Rules

### 10.1 summary

- Public-safe condensed description of the collection.
- Must use bounded conditional language for any evidence-dependent context.
- No private data, pricing, inventory, commerce urgency, or universal claims.
- Max scope: editorial positioning only; evidence claims require gated expansion to detail surfaces.

### 10.2 trustSummary

- Must use `present` flag as gate control; renders only when trust evidence gate passes.
- Label must use conditional language: "Public trust context may be available for selected products."
- conditionStatement must be bounded: explains what trust context exists, not a universal claim.
- Forbidden: "verified," "all products have trust context," "collection trust confirmed."

### 10.3 originSummary

- Must use `present` flag as gate control; renders only when origin evidence gate passes.
- Label and conditionStatement must use approved INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 vocabulary.
- Conditional phrase required: "Origin context available for selected products where approved."
- Forbidden: "guaranteed origin," "fully traced origin," "100% verified origin."

### 10.4 traceabilitySummary

- Must use `present` flag as gate control; renders only when traceability evidence gate passes.
- Conditional phrase required: "Traceability context may be available for eligible products."
- Forbidden: "fully traceable," "complete traceability," "end-to-end traceability for this collection."

### 10.5 certificationSummary

- Must use `present` flag as gate control; renders only when valid published certification evidence passes gate.
- Label must name the certification type using approved vocabulary; conditionStatement must be bounded to product-level scope.
- Conditional phrase required: "Certification context may be available for selected products in this collection."
- Forbidden: "certified collection," "GOTS-certified collection" as a universal statement, "all products meet certification standards."

### 10.6 supplierContextSummary

- Must use `present` flag as gate control; renders only when supplier publication gate passes.
- Conditional phrase required: "Supplier context is shown only where publication-approved."
- Must not expose supplier names, contacts, documents, private records, or pricing.
- Forbidden: any language that implies a supplier guarantee, exclusive relationship, or verified partnership as an absolute claim.

### 10.7 curatedContextLabel

- Short public-safe editorial label for the collection's curation framing.
- Must not assert evidence-dependent claims without gating.
- Must not use forbidden terminology (drops, verified, certified, fully traceable).
- Approved examples: "Verified Textile Showcase," "Curated Handloom Context," "Origin Story Collection."

### 10.8 collectionStoryType

- Internal classification value mapped to a public-safe editorial posture.
- Must not expose internal classification identifiers in public payloads.
- Public-facing value may be a safe label only: "origin story," "material showcase," "craft showcase," "supplier context."

## 11. Relationship to Collection Projection Designs

### 11.1 PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001

- This governance unit provides the copy/claims rules that govern the public-safe story metadata, taxonomy tags, trust labels, and supplier context labels defined in the list projection shape.
- List projection trust label (trustLabel), supplierContextLabel, and curatedContextLabel must comply with section 6 allowed language patterns.
- List projection field omission on gate failure (sections 6-8 of PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001) aligns with the fail-closed evidence gate rules in section 8 of this unit.

### 11.2 PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001

- This governance unit provides the copy/claims rules for storyBody, galleryImages alt text, trustSummary, originSummary, traceabilitySummary, certificationSummary, supplierContextSummary, and eligibleProductRefs preview labels.
- Section 9 (StoryBody Rules) of this unit directly governs the storyBody field defined in detail projection section 4.
- Section 10 (Summary Field Rules) of this unit directly governs all summary objects defined in detail projection section 4.
- The conditionStatement values in each summary must comply with allowed language patterns in section 6 and forbidden patterns in section 7 of this unit.

### 11.3 Future Implementation Units

- PUBLIC-COLLECTIONS-PROJECTION-IMPLEMENTATION-001 must enforce this governance as a content validation gate before any collection list record is included in a public response.
- PUBLIC-COLLECTION-DETAIL-PROJECTION-IMPLEMENTATION-001 must enforce this governance as a content validation gate before any storyBody or summary field is surfaced in a public detail response.
- Any content administration or editorial tooling that allows collection storyBody or summary authoring must enforce these rules at authoring time.

## 12. Relationship to DPP / Passport Governance

This unit reaffirms and extends the language constraints from DPP-TRUST-LINKING-RULES-001:

1. Product passport remains product-scoped: eligible product passport refs within eligibleProductRefs are product-level context only and must not generate collection-level trust language.
2. Presence of product passport refs does not make the collection verified, trusted, or DPP-backed.
3. Collection-owned passport is deferred: no collection-owned passport claim, collectionHasPassport assertion, or DPP-backed collection language may appear until discriminator and model units complete and approve it.
4. Trust summaries are conditional and evidence-gated: collectionHasTrustContext defaults to false; trustSummary.present defaults to false.
5. No public passport directory behavior: collection detail pages must not function as passport browsing surfaces.
6. Copy rule extension for collection surfaces (from DPP-TRUST-LINKING-RULES-001 section 8.4):
   - Required canonical wording: "Eligible products may include public trust context where available."
   - This is the approved collection-surface trust pattern; implementations must not deviate without explicit governance approval.

## 13. Relationship to Authenticated Continuation

Safe language for continuation CTAs at collection surfaces:

### Allowed CTA Language

- "Continue after sign-in"
- "Sign in to view authenticated collection context"
- "View full sourcing context with your TexQtic account"
- "Request access to supplier and sourcing detail"
- "Explore authenticated continuation for eligible workflows"
- "Express interest in this collection" (where explicitly approved and non-transactional)

### Forbidden CTA Language

The following language is forbidden in all public collection CTA copy:

- "Checkout" / "Add to cart" / "Buy now" / "Place order" / "Purchase"
- "Wishlist" / "Save to wishlist" / "Add to wishlist"
- "Order" / "Request quote" / "Submit RFQ" (as a public-facing transactional CTA)
- "Get pricing" / "View pricing" (implies exposed private pricing)
- "See inventory" / "Check stock" (implies exposed private inventory)
- "Negotiate" / "Start negotiation" / "Open sourcing dialog" (private workflow leak)
- Any language implying an immediate commerce transaction is available without authentication.

### Boundary Preservation

- The public CTA must always preserve the public attraction → authenticated continuation boundary.
- The public CTA label, action, target, and intent fields must remain non-transactional and public-safe.
- Private workflow payloads, pricing, sourcing terms, and negotiation context must remain entirely behind authentication.

## 14. Public / Private Boundary

Public collection copy must not expose or imply any of the following:

- Private IDs of any kind (internal collection IDs, node IDs, evidence IDs, supplier IDs).
- ownerOrgId or tenant identifiers.
- Internal database identifiers or linkage metadata.
- Internal evidence record identifiers or approval workflow IDs.
- Supplier private documents, contact information, communications, or private records.
- Private pricing, inventory levels, or sourcing terms.
- Buyer intent state, RFQ payloads, negotiation records, or order history.
- Private workflow status or internal publication gate failure reasons.
- Rankings, affinity scores, recommendation outputs, or engagement signals.
- AI-generated outputs or vector search results.
- Aggregator intelligence outputs or hidden scoring metadata.
- Internal publication gate failure reasoning or diagnostic messages.
- Checkout, cart, wishlist, or order behavior.
- Universal DPP, passport, trust, origin, certification, or traceability claims.
- Collection-owned passport token semantics in current phase.

This boundary is constitutional. Any copy that approaches this boundary must fail closed to safe conditional language or omission.

## 15. Deferred Decisions

- Exact storyBody length, word count, and structural template governance.
- Exact approved vocabulary list for curatedContextLabel and collectionStoryType values.
- Exact process for editorial authoring validation and content gate enforcement.
- Exact evidence tier encoding for certificationSummary when multiple certification types apply.
- Exact governance rules for future collection-level sustainability certification claims (blocked on certification linkage model).
- Exact collection-level verified claim language for future post-discriminator collection-owned passport phase.
- Exact language governance for future authenticated continuation payload framing beyond CTA metadata.
- B2C-CATEGORY-TAXONOMY-ALIGNMENT-001 (not found in repository) — if created, its vocabulary alignment rules should be reviewed against the material/fabric/fiber claim rules in section 8.3 of this unit.

## 16. Acceptance Criteria

Governance artifact is complete only if all are true:

- claim categories are defined (section 4),
- claim classification model is explicit for all categories (section 5),
- allowed language examples are provided for each claim context (section 6),
- forbidden language examples are explicitly enumerated (section 7),
- evidence gate rules are defined for all claim categories (section 8),
- storyBody rules are defined (section 9),
- summary field rules are defined for all summary fields in the projection design (section 10),
- relationship to collection projection designs is explicit (section 11),
- DPP/passport no-inheritance rules are reaffirmed (section 12),
- authenticated continuation language rules are defined (section 13),
- public/private boundary is explicitly enumerated (section 14),
- no runtime, schema, migration, route, OpenAPI, service, or UI changes are made in this unit.
