# DPP-TRUST-LINKING-RULES-001
## Canonical Public DPP / Trust Linking Rules

## 1. Status Summary

- Unit mode: Design/governance only.
- Unit status: READY_FOR_REVIEW.
- Why this rules artifact is required now:
  - D2C collection data model and projection units require shared DPP/trust guardrails before they can be designed safely.
  - Product-level DPP behavior already exists and must not be diluted by collection-level assumptions.
  - Public trust/origin language must remain conditional and evidence-gated across all families.
  - Cross-family consistency is required for B2C, D2C, Industry/Cluster, Supplier, Trust, and future inquiry/handoff surfaces.

## 2. Current Repo Truth

- Product-level passport CTA is conditional and requires both `hasPassport` and `publicPassportId`.
- B2C product projection passport gates are fail-closed and require `status='PUBLISHED'` with `public_token` present.
- Public passport route/fallback behavior is safe for not-found and service errors.
- D2C collections are curated story/showcase objects (not product-group commerce, not universal trust containers).
- Public collection linking design recommends a staged hybrid model with no inheritance and no collection passport assumption by default.
- Supplier profile full production verification is currently data-limited due no supplier records passing all publication gates.
- No public passport directory is approved; public passport access remains direct-link/QR style.
- No collection-level DPP runtime linkage is implemented.

## 3. Rule Scope

These rules govern public-safe trust/DPP linking behavior across:

- B2C browse surfaces
- B2C product detail surfaces
- Public passport route and fallback states
- D2C collections concept surfaces
- Future D2C collection detail surfaces
- Public supplier profile surfaces
- Public trust landing surfaces
- Industry/cluster public surfaces
- Future public inquiry/handoff surfaces

## 4. Core Principles

1. Conditionality first: trust, origin, traceability, certification, and passport language must remain conditional.
2. Evidence gating: stronger claims require explicit approved public evidence states.
3. Fail-closed defaults: if evidence or publication gates are missing, return safe no-signal defaults.
4. Public-token-only exposure: never expose private IDs in public payloads.
5. No private IDs: no org_id, tenant_id, user IDs, internal node/evidence IDs in public surfaces.
6. No product-to-collection inheritance: product passport availability does not imply collection passport coverage.
7. No universal claims: never imply "all" products/suppliers/collections are verified/traceable/certified.
8. No public commerce workflows: no checkout/cart/wishlist/order semantics on trust/DPP public surfaces.
9. No Aggregator intelligence exposure: no rankings, scores, recommendations, hidden intelligence language.
10. Authenticated continuation for deeper workflows: private sourcing, inquiry follow-up, negotiation, orders, and private records remain authenticated.

## 5. Product-Level DPP / Passport Rules

### 5.1 Product passport CTA rendering

- Product passport CTA may render only when:
  - `hasPassport === true`, and
  - `publicPassportId` is present.
- If either condition is missing, no passport CTA may render.

### 5.2 Required fields

- Required decision fields:
  - `hasPassport: boolean`
  - `publicPassportId?: string`
  - optional contextual signals: `trustSignals[]`, `hasTraceabilityEvidence`

### 5.3 Product fallback behavior

- Product unavailable state must be safe and non-diagnostic.
- Product fallback may explain that content is unavailable for public discovery or requires authenticated workflow.

### 5.4 Product copy rules

- Allowed:
  - "where available"
  - "public-safe trust context"
  - "approved trust and origin context only"
- Forbidden:
  - "all products verified"
  - "all products have passports"
  - "fully traceable product catalog"

### 5.5 Passport route behavior

- Valid public passport token: show public-safe passport view only.
- Invalid/missing/unpublished token: show safe not-found/unavailable response.
- No internal details in response body.

### 5.6 Public passport directory

- Public passport directory/listing behavior is forbidden unless separately approved by governance decision.
- Current rule: no public passport directory.

## 6. Collection-Level DPP / Passport Rules

### 6.1 No-inheritance baseline

- Product-level passport status never auto-propagates to collection-level passport status.
- Collection-level trust/passport status must be independently defined and gated.

### 6.2 No assumed collection passport

- Collections must default to no collection-level passport claim unless explicitly evidence-gated by a future approved model.

### 6.3 Staged relationship (from PUBLIC-DPP-COLLECTION-LINKING-DESIGN-001)

- Phase 1:
  - Conditional trust copy only.
  - No collection passport CTA.
- Phase 2:
  - Optional eligible product passport references (product-scoped only, where available).
- Phase 3:
  - Collection-owned passport support only after dedicated model/projection decisions and gate definitions.

### 6.4 Product reference behavior

- Product passport references in collections are optional and product-scoped.
- References must not imply collection-wide verification.

### 6.5 Collection fallback behavior

- `/collections/:slug` unavailable states must remain safe, non-diagnostic, and private-data-free.
- Fallback text may indicate unavailability without exposing publication gate internals.

## 7. Supplier Trust Rules

### 7.1 Public supplier trust context allowed

- Public-safe supplier context may include:
  - legal/public name, public role/segment positioning,
  - approved jurisdiction context,
  - high-level trust posture signals where available,
  - approved certification/traceability summaries where available.

### 7.2 Supplier context that must remain private

- Private contacts, private documents, private pricing, private buyer/sourcing context, negotiation/order context, and internal evidence records.

### 7.3 Supplier publication gates

- Supplier trust exposure must require approved public posture and eligibility gates.
- Gate failures must fail closed to no-record/no-signal outcomes.

### 7.4 Current production limitation

- Supplier public profile verification remains data-limited because no supplier currently passes all publication gates in production.
- This is a data state, not a rule exception.

### 7.5 Supplier fallback behavior

- No-results or unavailable states must be safe and non-diagnostic.
- Fallback may route users to authenticated continuation or back to discovery.

## 8. Origin / Traceability / Certification Rules

### 8.1 Allowed conditional claims

- "Origin context where available"
- "Traceability signals where available"
- "Certification context where available"
- "Public-safe trust context"

### 8.2 Evidence-gated claims

- A claim about traceability/certification/origin must require corresponding approved public evidence state.
- If evidence is unavailable or unpublished, claim must not render.

### 8.3 Forbidden claims

- Any universal statement implying complete coverage, such as:
  - "fully traceable collection"
  - "certified collection"
  - "all suppliers verified"

### 8.4 Required wording patterns by surface

- Product surfaces:
  - "Where available, this product includes public-safe trust, origin, traceability, or passport context."
- Collection surfaces:
  - "Eligible products may include public trust context where available."
- Supplier surfaces:
  - "This profile shows only public-safe trust context approved for discovery."
- Industry/cluster surfaces:
  - "Taxonomy, trust, and origin context are directional and conditional where available."

## 9. Public Copy Rules

### 9.1 Allowed language

- "where available"
- "public-safe trust context"
- "eligible products may include public trust context"
- "trust and passport context is conditional"
- "continue after sign-in for authenticated workflows"

### 9.2 Forbidden language

- "all products verified"
- "collection verified"
- "collection passport guaranteed"
- "fully traceable collection"
- "certified collection"
- "drop" / "drops"
- checkout/cart/wishlist/order language
- rankings/scores/recommendations language
- Aggregator intelligence language

## 10. Projection / API Safety Rules

- Fail-closed behavior is mandatory for trust/passport fields.
- Tenant/org scoping is mandatory for projection queries.
- Public token only for public passport references.
- Published/approved posture gates required before exposure.
- No private document pointers or private file URLs.
- No private workflow state (buyer intent, RFQ payload, negotiation, order state).
- No internal evidence diagnostic details.
- Safe unavailable reasons only; no gate internals in public responses.

## 11. Fallback / Error State Rules

### 11.1 Product unavailable fallback

- Must state unavailability safely and may suggest authenticated continuation.
- Must not expose publication gate internals.

### 11.2 Passport unavailable fallback

- Must handle not-found and generic errors safely.
- Must not expose internal token resolution diagnostics.

### 11.3 Supplier unavailable fallback

- Must show safe unavailable profile state.
- Must not expose supplier publication gate internals.

### 11.4 Collection unavailable fallback

- Must preserve concept/unavailable posture for non-implemented detail routes.
- Must avoid implied collection-level passport verification.

### 11.5 Continuity CTA guardrails

- Allowed: sign-in, request access, back to discovery, browse other public-safe surfaces.
- Forbidden: checkout/cart/wishlist/order CTAs on these fallback/error surfaces.

## 12. B2C / D2C Boundary Rules

- B2C owns product-level DPP/passport behavior and product CTA conditions.
- D2C owns collection story/showcase framing and optional product-scoped references.
- Product DPP presence does not create collection DPP status.
- Collection-level DPP must be independently modeled, published, and projection-gated.

## 13. Dependencies / Downstream Units

Recommended dependency order:

1. D2C-COLLECTIONS-DATA-MODEL-DESIGN-001
2. PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001
3. PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001
4. COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001
5. D2C-ORIGIN-STORYTELLING-GOVERNANCE-001
6. D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001
7. PUBLIC-DPP-COLLECTION-LINKING-IMPLEMENTATION-001

## 14. Open Questions / Deferred Decisions

- Collection-owned passport model: required or optional?
- Collection/product relationship modeling for trust references.
- Token type discrimination strategy for product vs collection passport contexts.
- Valid public passport data availability in production for stronger verification.
- Supplier public data availability and publication readiness in production.
- Collection trust lifecycle and publication gate ownership.
- Live vs snapshot trust reference behavior.
- Admin/publishing workflow design for collection trust/passport governance.

## 15. Acceptance Criteria

Rules are complete only if all are true:

- Product-level DPP rules are explicit.
- Collection-level DPP rules are explicit.
- Supplier trust rules are explicit.
- Origin/traceability/certification rules are explicit.
- Public copy rules are explicit.
- Projection/API safety rules are explicit.
- Fallback/error rules are explicit.
- B2C/D2C boundary rules are explicit.
- No runtime implementation is included.

## 16. Next Recommended Units

Recommended sequence after this artifact:

1. D2C-COLLECTIONS-DATA-MODEL-DESIGN-001
2. COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001 (if route/token ambiguity must be resolved early)
3. PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001
4. PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001
5. D2C-ORIGIN-STORYTELLING-GOVERNANCE-001
6. D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001
