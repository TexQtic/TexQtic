# TEXQTIC — Public Marketplace Architecture and Governed Market-Access Model v1

Decision ID: TEXQTIC-PUBLIC-MARKETPLACE-ARCHITECTURE-DECISION-v1
Status: DECIDED
Scope: Governance / product-truth / public market-access architecture
Date: 2026-04-21
Authorized by: Paresh
Decision class: Planning-only architecture decision

## 1. Decision Summary

TexQtic is planned as a governed market-access infrastructure for trusted textile supply chains, not as two open public marketplaces by default.

Its core platform identity remains a governed operating-system layer. The subordinate market-access pillars are:

- B2B governed exchange
- B2C tenant-branded consumer commerce
- Aggregator curated discovery, comparison, qualification, and intent handoff

This decision preserves marketplace behavior as subordinate to governed workflow, trust, and execution ownership. It formalizes target public-boundary posture without overstating current runtime truth.

## 2. Preserved Structural Truths

The following structural truths remain controlling and must not be contradicted by downstream planning or implementation:

- B2B and B2C are the base commercial families
- INTERNAL is the non-commercial platform category
- white-label is overlay and capability logic, not a peer family
- Aggregator is a cross-family capability, not a peer family
- package and plan remain a separate commercial and entitlement axis
- tenant-admin remains one common core with bounded overlays
- enterprise remains subordinate depth inside B2B, not a peer pillar
- B2B owns the canonical internal textile taxonomy
- Aggregator may consume only the discovery-safe subset of that taxonomy
- current truthful runtime language already preserves B2C as hybrid discovery plus authenticated commerce
- current truthful runtime language still records anonymous B2B marketplace browse as intentionally excluded
- one shared public-facing shell and entry requirement must be preserved

## 3. Platform Principle

TexQtic is a governed market-access infrastructure. Public surfaces exist only to support public-safe discovery, qualified entry, and structured intent handoff. Authenticated surfaces own commerce, workflow, trade execution, governance actions, and tenant-admin continuity.

Expansion of public surface area is lawful only when trust maturity, data quality, and governance readiness justify it. Growth pressure alone is not sufficient authority.

## 4. B2B Public Boundary Decision

Decision:

B2B public surfaces may support discovery and inquiry initiation, but not full anonymous exchange workflow.

Public-safe scope:

- supplier identity
- capabilities
- category coverage
- certification and trust signals
- MOQ range
- geography
- qualification context

Public-triggered scope:

- inquiry initiation
- RFQ-intent initiation

Authenticated scope:

- RFQ workflow
- pricing
- negotiation
- messaging threads
- order workflow
- governed trade execution

Current-truth guardrail:

This is a target architecture decision, not a claim that anonymous B2B marketplace browse is already live. Current canonical truth still records anonymous B2B marketplace browse as intentionally excluded.

## 5. B2C Public Boundary Decision

Decision:

B2C public surfaces may support browse and cart intent, with authenticated checkout and authenticated deeper commerce continuity.

Public-safe scope:

- tenant storefront
- product list and product detail
- search
- filter
- compare
- trust signals

Public-triggered scope:

- cart intent
- wishlist intent
- discovery continuity

Authenticated scope:

- checkout
- order history
- returns
- account continuity

Current-truth guardrail:

This refines current repo truth rather than contradicting it. TexQtic already preserves B2C as hybrid discovery plus authenticated commerce, not anonymous retail-first posture.

## 6. Aggregator Role Decision

Decision:

Aggregator is TexQtic's discovery-intelligence and qualified-handoff layer.

Positive ownership:

- category-level discovery
- comparison context
- supplier qualification signals
- requirement-to-supplier matching
- intent capture and routing

Explicit exclusions:

- transaction ownership
- pricing negotiation ownership
- fulfillment ownership
- downstream execution ownership
- separate full back-office ownership

This sharpens the approved model that already treats Aggregator as cross-family discovery, matching, and intent handoff rather than a peer marketplace family or separate commerce office.

## 7. Visibility-Control Architecture

Decision:

TexQtic uses a two-tier public visibility model.

Tier 1 - tenant eligibility gate:

A tenant must be approved for any public presence. Suggested gating includes verification or compliance status, minimum profile completeness, active listing or service presence, and trust-quality threshold.

Tier 2 - listing or product-level control:

Approved tenants may set each listing or product as:

- B2B public
- B2C public
- both
- private or authenticated only

This visibility model preserves governed publication control without converting public exposure into a default marketplace entitlement.

## 8. Public-Safe Projection Rule

Decision:

No public surface may render directly from raw internal commerce or admin records.

Public surfaces must consume public-safe projected views of:

- tenant identity
- tenant trust signals
- product or listing identity
- capability and category metadata
- eligibility and publication posture

This projection rule protects moderation, governance quality, AI-readiness, and future expansion control.

## 9. Shared Public Shell / Entry Rule

Decision:

TexQtic preserves one shared public-facing entry and shell requirement that owns:

- public tenant resolution
- branded and public entry framing
- truthful public-safe navigation
- coherent transition from public entry into the correct authenticated tenant or user surface
- route and brand context preservation

This rule does not authorize:

- a generic anonymous marketplace navbar
- public B2B marketplace depth by default
- public Aggregator directory depth by default
- white-label admin or control-plane public exposure

## 10. Expansion Rule

Decision:

Expansion into fuller public marketplace behavior is allowed only when maturity gates are met.

Required maturity gates:

- supplier or listing data quality reaches defined thresholds
- trust infrastructure is operationally mature
- governance can sustain quality at scale

This preserves future B2B and B2C expansion rights without forcing premature openness.

## 11. Explicit Non-Goals / Exclusions

This decision does not authorize:

- open anonymous B2B marketplace browse by default
- anonymous B2B pricing exposure
- anonymous B2B negotiation
- full anonymous public retail claims for B2C
- Aggregator as a commerce owner
- Aggregator as a separate full back office
- white-label as a peer marketplace pillar
- enterprise as a separate marketplace pillar
- implementation, schema, runtime, or control-plane mutation in this pass

## 12. Immediate Downstream Planning Units Implied

After authority lock, the next bounded planning units implied by this decision are:

- PUBLIC_VS_AUTHENTICATED_SURFACE_BOUNDARY
- B2B_PUBLIC_DISCOVERY_AND_INQUIRY_MODEL
- B2C_PUBLIC_BROWSE_CART_CHECKOUT_BOUNDARY
- AGGREGATOR_INTELLIGENCE_AND_HANDOFF_OWNERSHIP
- PUBLIC_VISIBILITY_AND_PROJECTION_MODEL
- PUBLIC_SHELL_AND_TRANSITION_ARCHITECTURE

These remain planning implications only. They are not opened or authorized for implementation by this artifact alone.
