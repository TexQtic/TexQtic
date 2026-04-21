# TEXQTIC — Public vs Authenticated Surface Boundary Decision v1

Decision ID: TEXQTIC-PUBLIC-VS-AUTHENTICATED-SURFACE-BOUNDARY-DECISION-v1
Status: DECIDED
Scope: Governance / product-truth / boundary classification
Date: 2026-04-21
Authorized by: Paresh
Decision class: Planning-only boundary decision

## 1. Boundary Principle

TexQtic distinguishes public-safe discovery from authenticated ownership by treating public surfaces as projection-only entry and intent surfaces, while authenticated surfaces own tenant-scoped continuity, workflow state, commerce execution, governance actions, and post-entry operational truth.

The controlling rule is:

- `PUBLIC_SAFE` means discovery, trust, and entry context may be shown without authentication only when rendered from public-safe projections and when no workflow, negotiation, transaction, admin, or user-specific continuity is exposed
- `PUBLIC_TRIGGERED` means a public surface may initiate intent, inquiry, wishlist, cart intent, or qualified entry, but it does not own deeper workflow continuity after that trigger
- `AUTH_REQUIRED` means authentication is mandatory before the user may access the surface because continuity, pricing authority, transaction state, user/account state, or workflow ownership begins there
- `EXCLUDED_FROM_PUBLIC` means the surface or behavior must not be exposed publicly at all under this unit's boundary model, either because it is downstream-owned, governance-owned, admin-only, or outside the lawful public boundary of the pillar

Current-truth guardrail:

This artifact is planning authority only. It preserves the already-locked architecture model and does not claim that every target boundary is already live in runtime, especially for anonymous B2B discovery depth.

## 2. Boundary Matrix

### A. B2B Boundary Matrix

Current-truth guardrail:

The B2B matrix defines the lawful public-vs-authenticated boundary for target architecture planning. It does not claim that anonymous B2B marketplace browse is already implemented in runtime.

| Surface / Capability | Boundary Status | Boundary Note |
| --- | --- | --- |
| supplier identity | `PUBLIC_SAFE` | May be shown publicly as projected supplier discovery identity only. |
| capability / capacity summary | `PUBLIC_SAFE` | Public-safe only as bounded capability preview, not as full authenticated commercial depth. |
| certifications / trust signals | `PUBLIC_SAFE` | Public-safe as projected trust evidence and qualification context. |
| category / segment coverage | `PUBLIC_SAFE` | Public-safe as discovery classification and supplier fit context. |
| MOQ range | `PUBLIC_SAFE` | Public-safe only as qualification context, not as negotiated commercial commitment. |
| geography | `PUBLIC_SAFE` | Public-safe as discovery qualification context. |
| product summary | `PUBLIC_SAFE` | Allowed only as bounded non-pricing product or offering summary attached to governed discovery, not as full anonymous marketplace browse depth. |
| public inquiry initiation | `PUBLIC_TRIGGERED` | Public surface may initiate inquiry intent, but authenticated continuity must own the resulting workflow. |
| RFQ-intent initiation | `PUBLIC_TRIGGERED` | Public-safe entry may initiate RFQ intent, but full RFQ handling is not public-owned. |
| RFQ workflow | `AUTH_REQUIRED` | Workflow continuity begins here. |
| pricing visibility | `AUTH_REQUIRED` | Public pricing exposure is not authorized for B2B; pricing continuity belongs after authentication. |
| negotiation | `AUTH_REQUIRED` | Negotiation is authenticated workflow ownership only. |
| messaging thread | `AUTH_REQUIRED` | Thread continuity and participant-specific state require authentication. |
| order workflow | `AUTH_REQUIRED` | Commercial execution continuity is authenticated only. |
| governed trade execution | `AUTH_REQUIRED` | Trade creation and governed downstream execution remain authenticated workflow ownership only. |

### B. B2C Boundary Matrix

Current-truth guardrail:

The B2C matrix preserves current repo truth that B2C supports public-safe browse and entry but that authenticated continuity remains mandatory for checkout and deeper commerce continuity under current authority.

| Surface / Capability | Boundary Status | Boundary Note |
| --- | --- | --- |
| storefront landing | `PUBLIC_SAFE` | Public-safe tenant-branded storefront entry is lawful under current truth. |
| product list | `PUBLIC_SAFE` | Public-safe browse surface. |
| product detail | `PUBLIC_SAFE` | Public-safe inspection surface. |
| search / filter / compare | `PUBLIC_SAFE` | Public-safe discovery tooling for bounded storefront browse. |
| public pricing visibility | `PUBLIC_SAFE` | Public product pricing may appear in the B2C storefront boundary as part of lawful browse-entry continuity. |
| cart intent | `PUBLIC_TRIGGERED` | Public surface may capture cart intent, but authenticated downstream continuity owns checkout and persistent order execution. |
| wishlist intent | `PUBLIC_TRIGGERED` | Public surface may capture wishlist intent, but user-bound continuity begins after authentication. |
| authenticated checkout | `AUTH_REQUIRED` | Checkout is the boundary where authenticated commerce ownership becomes mandatory. |
| order history | `AUTH_REQUIRED` | User-specific commercial continuity requires authentication. |
| returns | `AUTH_REQUIRED` | Post-purchase workflow ownership is authenticated only. |
| account continuity | `AUTH_REQUIRED` | Account-bound identity and continuity require authentication. |
| seller / tenant trust signals | `PUBLIC_SAFE` | Public-safe as projected tenant trust context supporting storefront confidence. |

### C. Aggregator Boundary Matrix

Current-truth guardrail:

Current approved truth does not authorize a public Aggregator directory. Aggregator remains an authenticated discovery-intelligence and handoff workspace whose owned loop stops before negotiation, transaction execution, pricing ownership, and fulfillment ownership.

| Surface / Capability | Boundary Status | Boundary Note |
| --- | --- | --- |
| directory / discovery presence | `AUTH_REQUIRED` | Aggregator discovery presence is an authenticated workspace surface, not a public directory. |
| category comparison | `AUTH_REQUIRED` | Comparison context is authenticated Aggregator workspace behavior. |
| supplier comparison | `AUTH_REQUIRED` | Supplier comparison is authenticated Aggregator intelligence behavior. |
| qualification signals | `AUTH_REQUIRED` | Trust and qualification context may be used inside authenticated Aggregator discovery and inspection. |
| requirement capture | `AUTH_REQUIRED` | Aggregator-owned requirement capture begins inside the authenticated workspace, not on a public surface. |
| handoff routing | `AUTH_REQUIRED` | Aggregator may own authenticated handoff launch and confirmation, but not downstream execution ownership. |
| ranking context | `AUTH_REQUIRED` | Ranking or prioritization context belongs, if present, to authenticated discovery intelligence only. |
| transaction entry | `EXCLUDED_FROM_PUBLIC` | Aggregator does not own public transaction entry; any downstream transaction continuity remains separately authenticated and downstream-owned. |
| negotiation | `EXCLUDED_FROM_PUBLIC` | Aggregator does not own public or Aggregator-owned negotiation depth. |
| pricing ownership | `EXCLUDED_FROM_PUBLIC` | Aggregator is not a pricing owner; pricing authority remains outside the public boundary and outside Aggregator ownership. |
| fulfillment ownership | `EXCLUDED_FROM_PUBLIC` | Aggregator does not own fulfillment and must not expose it as a public Aggregator function. |

## 3. Shared Boundary Rules

The following rules apply across B2B, B2C, and Aggregator:

1. A surface is public-safe only when it is rendered from public-safe projections and exposes discovery, trust, qualification, or entry context without exposing raw operational records.
2. A surface is public-triggered when it captures intent or launches qualified entry but stops before user-specific, tenant-specific, or workflow-owned continuity begins.
3. Authentication becomes mandatory when the next user action creates, reads, or continues a user-bound, tenant-bound, RFQ-bound, order-bound, trade-bound, checkout-bound, negotiation-bound, or governance-bound record.
4. Workflow ownership begins when a public or entry action becomes a persisted continuity object or when an authenticated downstream surface becomes the system of record for the next step.
5. Tenant-admin, WL-admin, control-plane, and superadmin surfaces remain outside the lawful public boundary and must not be exposed as public-entry, public-discovery, or public-triggered surfaces.
6. `EXCLUDED_FROM_PUBLIC` in this unit means more than sensitivity. It also marks behaviors that are downstream-owned, governance-owned, or out of the lawful pillar boundary even if they may exist elsewhere after authentication.

## 4. Handoff Model

TexQtic's public-to-authenticated handoff model is:

- public-safe surfaces own discovery, trust context, brand-safe entry framing, and lawful projection-only preview
- public-triggered surfaces may initiate inquiry, RFQ intent, cart intent, wishlist intent, or qualified route entry, but they do not own the resulting workflow record
- once identity, tenant context, pricing authority, workflow continuity, or post-entry state becomes necessary, control passes to an authenticated surface

Per pillar handoff points:

- B2B: public-safe supplier and capability discovery -> public inquiry or RFQ-intent trigger -> authenticated RFQ, pricing, negotiation, messaging, order, and governed trade continuity
- B2C: public-safe storefront and product browse -> public cart or wishlist intent -> authenticated checkout, order history, returns, and account continuity
- Aggregator: authenticated discovery, comparison, and requirement capture -> authenticated handoff confirmation -> downstream-authenticated RFQ, trade, or human follow-up continuity outside Aggregator-owned workflow depth

Shared shell rule:

The shared public shell may own public tenant resolution, truthful public-safe navigation, and coherent transition into the correct authenticated surface, but it does not own downstream workflow, transaction, negotiation, tenant-admin, WL-admin, or control-plane continuity.

## 5. Non-Goals / Exclusions

This unit does not authorize:

- implementation, runtime mutation, schema mutation, or control-plane mutation
- a public marketplace redesign
- anonymous B2B pricing exposure or anonymous B2B negotiation
- a public Aggregator directory or a public Aggregator transaction surface
- full shell UX design, route design, or visibility projection implementation detail
- full B2B inquiry workflow design
- full B2C checkout or post-purchase model design
- full Aggregator ranking, routing, or ownership model design
- tenant-admin, WL-admin, or control-plane public exposure
- opening any downstream planning or implementation unit by implication

## 6. Downstream Planning Dependencies

This boundary decision is intended to be consumed by the following later bounded units:

| Downstream Unit | What This Boundary Decision Supplies | What That Unit Must Still Decide Separately |
| --- | --- | --- |
| `PUBLIC_VISIBILITY_AND_PROJECTION_MODEL` | exact public-safe vs non-public classification by pillar | projection fields, approval gates, publication posture mechanics, and projection source discipline |
| `B2B_PUBLIC_DISCOVERY_AND_INQUIRY_MODEL` | B2B public-safe vs public-triggered vs authenticated boundary | exact B2B discovery payload, inquiry semantics, RFQ-intent bridge, and target-architecture rollout truth |
| `B2C_PUBLIC_BROWSE_CART_CHECKOUT_BOUNDARY` | B2C browse-entry vs cart-intent vs authenticated checkout boundary | exact cart/wishlist persistence model, checkout authentication threshold, and post-purchase continuity shape |
| `AGGREGATOR_INTELLIGENCE_AND_HANDOFF_OWNERSHIP` | Aggregator authenticated discovery and handoff stop boundary | exact Aggregator discovery data shape, intent-record semantics, downstream handoff targets, and ownership stop enforcement |
| `PUBLIC_SHELL_AND_TRANSITION_ARCHITECTURE` | shared public-entry vs authenticated continuity handoff principle | exact shell transitions, brand preservation, realm resolution, and route continuity behavior |

## 7. Decision Result

`PUBLIC_VS_AUTHENTICATED_SURFACE_BOUNDARY_DRAFTED`

TexQtic now has one bounded decision artifact that classifies the canonical public versus authenticated surface boundary across B2B, B2C, and Aggregator without opening downstream units or overstating current runtime truth.
