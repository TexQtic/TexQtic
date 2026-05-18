# TexQtic D2C Collection Semantics Decision

**Decision ID**: D2C-COLLECTION-SEMANTICS-DECISION-001
**Status**: PROPOSED
**Created**: 2026-05-18
**Family**: TexQtic D2C Family
**Depends On**: TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 (commit 0f2c71a), TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001 (commit 2e8af60), INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 (commit d59ffbb)
**Related Verified Work**: D2C-COLLECTIONS-STUB-BASELINE-SYNC-001, B2C-PUBLIC-BROWSE-BASELINE-SYNC-001, B2C-PRODUCT-DETAIL-BASELINE-SYNC-001

---

## 1. Status

**Decision Status**: PROPOSED

This decision is internally consistent and sufficient to govern downstream design units, but it should remain PROPOSED until stakeholder approval confirms the intended public D2C posture.

Use of ACCEPTED status is deferred until product, governance, and stakeholder review confirm that the chosen semantics match TexQtic's intended D2C public attraction role.

No runtime implementation is included.

---

## 2. Purpose

TexQtic must decide what a D2C collection is before any of the following can be designed safely:

- data model design
- public projection design
- collection detail implementation
- DPP collection linking
- early-access and authenticated handoff
- D2C origin storytelling
- D2C SEO expansion

Without a canonical semantic decision, downstream units would risk treating collections as product groups, campaigns, commerce objects, trust containers, or supplier-owned records interchangeably. That would create claim drift, B2C/D2C boundary confusion, and unsafe assumptions about public verification, DPP coverage, early-access flows, and ownership.

This decision therefore establishes the governing semantic model for TexQtic D2C collections as a public attraction object first, while explicitly deferring runtime modeling, projection logic, ownership mechanics, and private workflow implementation.

---

## 3. Current Repo Truth

The current repository state establishes the following baseline:

- `/collections` is a public-safe stub surface only.
- `/collections/:slug` resolves to a safe unavailable placeholder state rather than a runtime collection detail implementation.
- No confirmed public collections projection or API contract is evidenced in the inspected frontend service, backend route, or OpenAPI surfaces.
- No collection-level DPP or passport linkage is implemented or approved.
- B2C owns public product browse and product detail discovery semantics.
- B2C product detail may inform D2C planning, but does not define what a collection is.
- Public navbar includes Collections as a navigation concept and current collection surfaces use the public-safe label "Verified Textile Collections".
- Current collection copy already routes deeper workflows such as saving, checkout, inquiry, early access, private pricing, documents, and continuity into authenticated TexQtic experiences.
- D2C runtime collection semantics, projection behavior, detail rendering, ownership model, and publishing workflow are not implemented.

This means the repo currently supports collection concept framing, not collection runtime semantics.

---

## 4. Decision Options Considered

### Option A: Collection as Product Group

**Advantages**

- Easy to explain using existing public B2C product references.
- Supports simple grouping and browse reuse.
- Could map cleanly to list-detail style projection later.

**Risks**

- Collapses D2C into B2C and weakens the family boundary.
- Encourages treating collections as category pages or merchandised product bundles.
- Increases pressure to add commerce semantics too early.

**Data / model implications**

- Would likely bias future design toward many-to-many product grouping only.
- Supplier story, trust framing, and handoff context would become secondary or awkward.

**Public claim implications**

- Risks overclaiming availability, assortment completeness, or commercial readiness.
- Could imply stable inventory or direct shopping behavior.

**B2C boundary implications**

- Poor boundary. B2C already owns product and category discovery.

**DPP / trust implications**

- May encourage incorrect assumption that grouped products inherit shared trust or passport coverage.

### Option B: Collection as Campaign

**Advantages**

- Supports seasonal or promotional storytelling.
- Allows curation language without strict product taxonomy control.

**Risks**

- "Campaign" implies marketing execution rather than durable object semantics.
- Can drift toward sales-promotion language, launch pressure, or time-bound drops.
- Conflicts with current repo truth, which does not implement promotion or demand-capture runtime.

**Data / model implications**

- Would require schedule, status, launch windows, and campaign ownership semantics early.
- Adds premature marketing lifecycle requirements.

**Public claim implications**

- High risk of implying launch, urgency, or purchasing readiness.

**B2C boundary implications**

- Ambiguous. Campaign framing can overlap with product merchandising and SEO pages.

**DPP / trust implications**

- Campaign semantics do not naturally explain conditional trust or passport linkage.

### Option C: Collection as Capsule / Story

**Advantages**

- Aligns with D2C as story and continuity context rather than anonymous commerce.
- Supports public-safe framing around materials, products, supplier context, and thematic curation.
- Preserves room for authenticated continuation later.

**Risks**

- "Capsule" can sound fashion-specific if left undefined.
- Story language can drift into unsupported origin or artisan claims without governance.

**Data / model implications**

- Supports a future object with narrative fields, product references, and conditional trust references.
- Does not force campaign or commerce lifecycle too early.

**Public claim implications**

- Works well for public-safe concept copy when bounded by taxonomy and evidence rules.

**B2C boundary implications**

- Strong boundary. Products remain products; the collection frames a story around them.

**DPP / trust implications**

- Naturally supports conditional and optional trust references without implying universal coverage.

### Option D: Collection as Supplier-Led Showcase

**Advantages**

- Connects directly to real supplier capability and public supplier context.
- Offers a clear ownership candidate.

**Risks**

- Overcommits the ownership model before governance approval.
- Can imply private supplier records, capability guarantees, or supplier-authored truth.
- Weakens platform curation role and can complicate multi-supplier cases.

**Data / model implications**

- Pushes future design toward supplier-owned publishing, admin workflow, and tenant scoping.

**Public claim implications**

- Raises risk of unsupported supplier capability, verification, origin, or certification claims.

**B2C boundary implications**

- Some separation from B2C, but still risks turning the page into a supplier profile variant.

**DPP / trust implications**

- Encourages implied linkage between supplier records and collection-wide trust posture.

### Option E: Collection as Marketplace Curation

**Advantages**

- Matches TexQtic's public attraction layer and platform curation role.
- Supports cross-supplier or theme-based grouping safely.
- Avoids assuming direct supplier ownership.

**Risks**

- If defined too broadly, can appear editorial only and lose continuity into authenticated follow-up.
- Can drift into ranking, recommendation, or intelligence semantics if not constrained.

**Data / model implications**

- Supports platform-curated references and public-safe metadata.
- Needs explicit guardrails against scores, rankings, and hidden recommendation logic.

**Public claim implications**

- Good fit for public-safe curation claims.
- Must not imply endorsement, completeness, or performance ranking.

**B2C boundary implications**

- Better than product-group semantics, but still needs a clear handoff model.

**DPP / trust implications**

- Allows optional trust references, but must not imply platform-level certification of every item.

### Option F: Collection as Hybrid Public Story + Authenticated Continuation Object

**Advantages**

- Best matches current repo truth and future D2C intent.
- Keeps the public object focused on story, curation, showcase, and attraction.
- Preserves explicit handoff into authenticated TexQtic workflows without exposing those workflows publicly.
- Maintains separation from B2C product/category semantics and from private sourcing or commerce operations.

**Risks**

- Requires disciplined downstream design to avoid expanding the public object into a private workflow record.
- Leaves ownership mechanics intentionally unresolved until a later unit.

**Data / model implications**

- Supports a future collection object with public-safe identity, narrative framing, optional product references, optional supplier context, optional conditional trust references, and continuation CTA semantics.
- Does not force early decisions on schema, tenant ownership, or projection source-of-truth.

**Public claim implications**

- Strong fit for bounded public-safe concept copy, taxonomy-aligned story framing, and authenticated continuation language.

**B2C boundary implications**

- Strong. B2C remains product/category discovery, while D2C owns collection/story/early-access framing.

**DPP / trust implications**

- Strong. Trust and passport references remain optional, conditional, and future-designed rather than assumed.

### Option G: Keep Stub-Only Until Later

**Advantages**

- Avoids premature commitment.
- Low immediate governance risk.

**Risks**

- Blocks every downstream D2C design unit.
- Leaves copy, data model, and handoff work without a semantic anchor.
- Encourages inconsistent assumptions in future units.

**Data / model implications**

- No actionable design direction.

**Public claim implications**

- Safe, but not useful.

**B2C boundary implications**

- Ambiguity remains unresolved.

**DPP / trust implications**

- Ambiguity remains unresolved.

---

## 5. Recommended Semantic Decision

**Recommended interpretation**: A TexQtic D2C Collection is a public-safe curated story and showcase object that may group eligible products and supplier context, and may offer authenticated continuation or early-access direction, but does not itself create commerce, verification, DPP or passport coverage, or private workflow semantics.

### What a collection is

- A public attraction object.
- A curated narrative or showcase frame for a bounded set of textile products, themes, materials, supplier context, or market-ready concept direction.
- A D2C story layer that can sit above individual products without redefining those products.
- A possible bridge from public discovery into authenticated continuation.
- A TexQtic-governed public publication object, even if future curation inputs may later come from platform, supplier, or hybrid workflows.

### What a collection is not

- Not a checkout, cart, wishlist, order, or anonymous commerce object.
- Not a universal product bundle or product category replacement.
- Not a supplier verification record.
- Not a collection-wide DPP or passport record.
- Not a private buyer intent record, RFQ record, sourcing workflow, or negotiation artifact.
- Not an Aggregator intelligence surface.
- Not a ranking, scoring, or recommendation object.
- Not a guaranteed availability, launch, or demand object.
- Not a "drop" object or urgency mechanic.

### Minimum future conceptual fields

If modeled later, a future collection may conceptually need:

- title
- slug
- summary
- hero image or hero media
- narrative or story body
- taxonomy-aligned category, material, fabric, or segment tags
- product references to public-safe eligible products
- optional supplier references where public-safe and approved
- optional conditional trust or passport references if later approved
- CTA metadata for sign-in, request access, or early-access continuation
- publication posture or visibility state
- SEO metadata if later approved

### What must stay authenticated or private

- RFQ, sourcing, negotiation, and inquiry payload details
- private pricing continuity
- cart, wishlist, checkout, and order behaviors
- supplier documents or private supplier records
- buyer identity continuity and intent capture beyond approved public-safe handoff
- rankings, recommendations, scoring, AI outputs, and Aggregator intelligence
- internal publishing workflow and approval workflow details

### What is deferred

- exact schema and field types
- collection runtime ownership model beyond TexQtic-governed public publication authority
- publishing and lifecycle states
- projection source and API contract
- collection-level DPP or passport mechanics
- early-access payload details
- SEO route strategy

---

## 6. Collection Object Boundaries

The following classifications govern what a future collection may include.

| Element | Classification | Rule |
| --- | --- | --- |
| Title | allowed public | Public-safe naming is allowed. Must avoid unsupported trust, origin, artisan, or certification claims. |
| Slug | allowed public | Public route identity is allowed when later implemented. Slug strategy remains deferred. |
| Summary | allowed public | Public-safe concept or story summary is allowed. Must remain taxonomy-aligned and claim-bounded. |
| Hero image | allowed public | Public-safe imagery is allowed if approved for public publication. No hidden private document semantics. |
| Category or material tags | allowed public | Allowed only when aligned to approved taxonomy and supported public-safe source fields. |
| Product references | allowed public | Allowed only as references to public-safe eligible B2C products. Does not redefine B2C product semantics. |
| Supplier references | evidence-gated | Public supplier context may appear only where public-safe and supported. Must not imply private supplier capability or endorsement. |
| Trust or passport references | evidence-gated | Allowed only as conditional, where-available references after a later design decision. No universal collection-wide coverage claim. |
| Early-access CTA | allowed public | Public CTA language is allowed only as a handoff or continuation concept. No public workflow exposure. |
| Authenticated continuation CTA | allowed public | Sign-in or continue-after-sign-in CTA is allowed. Private workflow remains authenticated. |
| SEO metadata | deferred | SEO fields and canonical route strategy are deferred to a later unit. |

Additional boundary rules:

- Collection may group products, but product references do not make the collection a commerce bundle.
- Collection may include supplier context, but supplier context does not make the collection a supplier-owned record by default.
- Collection may include trust-facing language only when explicitly conditional and evidence-backed.
- Anything that implies private pricing, purchase state, RFQ state, or user-specific continuity remains authenticated-only.

---

## 7. B2C Relationship and Boundary

The B2C and D2C families remain distinct.

- B2C owns product and category discovery.
- D2C owns collection, story, and early-access framing.
- Product references reused inside a collection must come only from public-safe B2C product data or future public-safe equivalents approved for that purpose.
- A collection may frame or contextualize products, but must not redefine product category semantics, product detail semantics, or product trust semantics.
- B2C product detail may inform future collection composition decisions, but B2C does not define the meaning of a collection.
- B2C must not become the fallback semantic model for D2C collections.

This preserves the rule that B2C is discovery at the product layer, while D2C is discovery and attraction at the story and curated-continuity layer.

---

## 8. Industry / Cluster Taxonomy Dependency

D2C collection language must reuse the approved Industry / Cluster taxonomy authority.

- Category, material, fabric, and segment terms must remain taxonomy-aligned.
- Broad contextual textile language is allowed only when it stays within approved vocabulary.
- Specific origin, cluster, artisan, sustainability, certification, verification, or supplier capability claims remain evidence-gated.
- Collections must not invent unsupported regional, artisan, heritage, or sustainability narratives.
- No universal or platform-wide factual claims may be made on the basis of collection framing alone.
- Collections may use broad public-safe context such as material, product category, or segment direction only when supported by approved terminology.

This decision inherits the taxonomy decision as a governing authority, not as an optional style guide.

---

## 9. DPP / Trust Dependency

Collection-level DPP or passport linkage is not assumed.

- Product-level passport linkage remains conditional only.
- A collection does not inherit DPP, passport, traceability, certification, or verification semantics merely because it references products or suppliers.
- Collection-level trust or passport references require a future dedicated design decision.
- Public collection copy may use "where available" trust language only when it does not imply universal coverage and only when later projection design supports it.
- No collection may claim that all referenced products are covered by trust records, passports, origin records, traceability records, or certifications unless future evidence-backed implementation explicitly supports that claim.

This keeps trust dependency conditional and prevents the collection object from becoming a false verification wrapper.

---

## 10. Early-Access / Auth Handoff Semantics

Collections may support public early-access or authenticated continuation language, but only as bounded handoff semantics.

### Allowed public posture

- "Continue after sign-in"
- "Request access"
- "Early access when available"
- "Explore more through authenticated TexQtic workflows"

### Private workflow remains authenticated

- collection-specific follow-up
- RFQ or sourcing submission
- buyer intent payloads
- saved collection behavior
- access approval logic
- private pricing, availability, and document continuity
- account-linked progression

### Additional rules

- No buyer intent over-capture on the public page.
- No public RFQ, order, checkout, cart, or wishlist flow.
- No public implication that early-access enrollment is guaranteed.
- No exposure of private supplier, buyer, or tenant workflow state.

The public collection may invite continuation, but it may not expose or simulate the private workflow itself.

---

## 11. Allowed Public Claims

The following claim categories are allowed on future collection surfaces, subject to public-safe wording and later implementation approval:

- public-safe concept or story copy
- taxonomy-aligned product, category, material, and fabric framing
- bounded supplier context where public-safe and supported
- curated showcase language
- "where available" trust language
- authenticated continuation language
- non-guaranteed early-access language such as "when available"
- non-guaranteed availability language that does not promise stock, publication permanence, or active sale

Examples of allowed posture:

- "A curated textile collection built around public-safe product and material context."
- "Explore related products and continue through authenticated TexQtic workflows."
- "Trust and passport context may be shown where available."
- "Availability, trust coverage, and follow-up pathways may vary."

---

## 12. Evidence-Gated Claims

The following claim categories are not allowed by default and require evidence-backed future approval before public use:

- origin claims
- artisan claims
- sustainability claims
- certification claims
- verification claims
- supplier capability claims
- cluster or location claims beyond approved broad taxonomy usage
- collection-level DPP claims
- collection-level passport claims
- collection-level traceability claims
- statements implying every item in a collection shares the same trust or sourcing posture

Any future unit using these claims must identify the evidence source, public projection rule, and copy constraint explicitly.

---

## 13. Forbidden Claims / Flows

The following are forbidden under this decision:

- use of "drops" terminology unless a later decision explicitly approves it
- public checkout claims or flows
- public cart claims or flows
- public wishlist claims or flows
- public order claims or flows
- exposure of private supplier records or documents
- exposure of private buyer intent or RFQ payloads
- exposure of private contact details
- rankings, scores, or recommendation claims
- AI or vector output exposure
- Aggregator intelligence exposure
- universal passport, trust, certification, verification, or traceability claims
- unsupported origin, cluster, artisan, sustainability, or certification claims
- claims that a collection is fully verified merely by being published
- claims that publication implies marketplace endorsement, guaranteed supply, or guaranteed continuation

This decision does not authorize Page 11 or Page 12 style active links or hidden runtime paths.

---

## 14. Downstream Unit Impact

### D2C-COLLECTION-STATIC-CONCEPT-COPY-ALIGNMENT-001

- Classification: implementation-ready
- Impact: may align existing stub and placeholder copy to this decision.

### D2C-COLLECTIONS-DATA-MODEL-DESIGN-001

- Classification: design-gated
- Impact: may now design a future conceptual model using story/showcase semantics rather than product-group or campaign-only semantics.

### PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001

- Classification: design-gated
- Impact: projection must expose only public-safe story, product reference, and conditional trust fields consistent with this decision.

### PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001

- Classification: design-gated
- Impact: detail design must preserve placeholder-safe posture and avoid private workflow leakage.

### PUBLIC-DPP-COLLECTION-LINKING-DESIGN-001

- Classification: decision-gated
- Impact: must treat collection-level DPP and passport linkage as unresolved and optional, not assumed.

### D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001

- Classification: design-gated
- Impact: may design bounded continuation semantics without exposing public RFQ, cart, checkout, or buyer-intent flows.

### D2C-ORIGIN-STORYTELLING-GOVERNANCE-001

- Classification: decision-gated
- Impact: must inherit evidence-gated rules for origin, artisan, cluster, sustainability, and certification claims.

### D2C-SEO-METADATA-EXPANSION-DESIGN-001

- Classification: design-gated
- Impact: may define SEO structure only after this collection meaning is used as the canonical route-content anchor.

### B2C-D2C-BOUNDARY-DECISION-001

- Classification: decision-gated
- Impact: still useful if any ambiguity remains around ownership, product reuse, or copy boundaries, but this decision already establishes the collection-side semantic posture.

---

## 15. Open Questions / Deferred Decisions

The following remain intentionally deferred:

- exact schema and data model
- whether a collection is supplier-owned, platform-curated, buyer-facing, or hybrid at runtime
- collection-to-product relationship cardinality
- collection-to-supplier relationship cardinality
- collection-level passport semantics
- collection-level trust signal semantics
- early-access payload schema
- SEO route and slug strategy
- collection lifecycle states
- admin and publishing workflow
- moderation and approval workflow
- RLS and multi-tenant ownership if a runtime model is introduced later
- whether collections can be cross-supplier, single-supplier, or both
- whether product references are static snapshots or live references

These questions are deferred by design so this decision can define semantics without prematurely locking implementation architecture.

---

## 16. Acceptance Criteria

This decision is complete only if all of the following are true:

- collection meaning is defined
- what a collection is not is defined
- B2C boundary is explicit
- taxonomy dependency is explicit
- DPP and trust dependency is explicit
- allowed public claims are explicit
- evidence-gated claims are explicit
- forbidden claims and flows are explicit
- downstream unit impact is explicit
- deferred decisions are explicit
- no runtime implementation is included

This document satisfies those criteria at the governance level.

---

## 17. Next Recommended Units

Recommended next sequence:

1. B2C-D2C-BOUNDARY-DECISION-001 if ownership or reuse ambiguity remains.
2. D2C-COLLECTION-STATIC-CONCEPT-COPY-ALIGNMENT-001.
3. D2C-COLLECTIONS-DATA-MODEL-DESIGN-001.
4. D2C-ORIGIN-STORYTELLING-GOVERNANCE-001.
5. PUBLIC-DPP-COLLECTION-LINKING-DESIGN-001.
6. D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001.

---

## Summary Decision Statement

TexQtic D2C collections are governed as public-safe curated story and showcase objects with optional authenticated continuation, not as commerce objects, universal trust containers, or private workflow records. Products may appear within collections, but B2C still owns product discovery semantics. Trust, DPP, passport, origin, artisan, sustainability, certification, and supplier capability claims remain conditional or deferred unless explicitly evidenced and approved later.