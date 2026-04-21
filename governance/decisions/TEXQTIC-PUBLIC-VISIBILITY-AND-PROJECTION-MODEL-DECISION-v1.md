# TEXQTIC — Public Visibility and Projection Model Decision v1

Decision ID: TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1
Status: PROPOSED FOR AUTHORITY LOCK
Scope: Governance / product-truth / visibility and projection model
Date: 2026-04-21
Authorized by: Pending authority lock
Decision class: Planning-only visibility/projection decision

## 1. Visibility Principle

TexQtic allows public presence only when a tenant is lawfully eligible for public exposure and when every public surface is rendered from a governed public-safe projection rather than from raw internal operational records.

The controlling rule is:

- no tenant or object appears publicly by default
- public presence is both tenant-gated and object-gated
- public rendering may expose only approved public-safe projection categories aligned to the locked public/auth boundary model
- public publication must never leak workflow continuity, negotiation state, authenticated user continuity, admin/governance state, or raw operational records

Current-truth guardrail:

This artifact is planning authority only. It does not claim that every lawful public-safe projection is already implemented in runtime, and it does not reopen any already-locked boundary exclusions such as anonymous B2B marketplace depth or public Aggregator directory exposure.

## 2. Two-Tier Visibility Model

### 2.1 Tenant Eligibility Gate

Public presence is opt-in and approval-based.

The tenant-level gate is posture-based rather than a flat binary. At minimum, a tenant must be evaluated into one of the following postures:

- `NO_PUBLIC_PRESENCE` — tenant is not eligible for any public presence; all public objects remain `PRIVATE_OR_AUTH_ONLY`
- `LIMITED_PUBLIC_PRESENCE` — tenant may expose only bounded tenant-level public-safe identity and trust context, with object publication still separately constrained
- `PUBLICATION_ELIGIBLE` — tenant may use approved object-level publication posture controls subject to pillar-specific caps and projection discipline

Minimum tenant readiness criteria:

| Readiness Category | Minimum Requirement | Why It Matters |
| --- | --- | --- |
| opt-in posture | Tenant must intentionally seek public presence rather than inheriting it by default | Prevents accidental public exposure |
| identity readiness | Canonical tenant identity, lawful brand/presence context, and public-safe descriptive summary must be reviewable | Public surfaces must not render unresolved identity truth |
| profile completeness | Public-safe profile fields required for the tenant's pillar must be materially complete enough to avoid placeholder or decorative exposure | Prevents empty public shells and false completeness claims |
| trust / compliance posture | Verification, compliance, or equivalent trust posture required for the relevant pillar must be satisfied at the threshold needed for public presence | Public presence is trust-governed, not growth-governed |
| active public-safe inventory or service presence | Tenant must have at least one lawful public-safe object class or approved public-safe identity presence worth exposing | Prevents approval with no truthful public object |
| no live governance exclusion | No current governance block, hold, or public-exposure prohibition may contradict public presence | Layer 0 and later authority still control eligibility |

Family/capability modifiers:

- `B2B` eligibility emphasizes supplier identity readiness, trust/qualification evidence, capability/category coverage, and lawful business-discovery posture
- `B2C` eligibility emphasizes storefront readiness, truthful product-data availability, public merchandising readiness, and customer-facing trust context
- `Aggregator` does not receive general public directory eligibility by default under current authority; any public presence must remain narrower than a public counterparty directory and must not imply public transaction ownership
- white-label remains overlay/capability logic; public eligibility applies to the lawful base family context, not to WL as a peer public marketplace family

### 2.2 Listing / Product Publication Posture

For lawful public-facing objects, the canonical publication posture vocabulary is:

| Publication Posture | Meaning |
| --- | --- |
| `B2B_PUBLIC` | Public-safe object exposure for B2B discovery and inquiry / RFQ-intent entry only |
| `B2C_PUBLIC` | Public-safe object exposure for B2C browse, product inspection, and cart/wishlist entry intent |
| `BOTH` | Object is eligible for both lawful B2B and lawful B2C public-safe exposure |
| `PRIVATE_OR_AUTH_ONLY` | Object is not public and may appear only in authenticated or non-public contexts |

Publication posture rules:

1. If a tenant is `NO_PUBLIC_PRESENCE`, every object is forced to `PRIVATE_OR_AUTH_ONLY` regardless of any requested object posture.
2. If a tenant is `LIMITED_PUBLIC_PRESENCE`, only the narrow object classes explicitly allowed by that limited posture may be public; all others remain `PRIVATE_OR_AUTH_ONLY`.
3. If a tenant is `PUBLICATION_ELIGIBLE`, each object may be evaluated for one of the controlled public postures above.
4. `BOTH` is lawful only when the same object truthfully satisfies both B2B and B2C public-safe projection requirements without leaking pillar-specific prohibited categories.
5. Default posture remains `PRIVATE_OR_AUTH_ONLY` until a tenant and object have both passed public eligibility review.
6. Aggregator-owned discovery objects do not automatically become a public object class under this vocabulary; under current authority they remain `PRIVATE_OR_AUTH_ONLY` unless a later bounded unit explicitly authorizes a lawful public-safe Aggregator object class.

## 3. Projection Model

### 3.1 Public-Safe Projected Categories

The canonical categories that may appear in public-safe projections are:

| Projection Category | Meaning In This Model | Pillar Notes |
| --- | --- | --- |
| tenant identity | Public-safe tenant, supplier, storefront, or operator identity context suitable for discovery | Allowed for B2B and B2C; Aggregator limited to narrow identity context and not a public directory by default |
| trust / verification signals | Public-safe trust cues, certification summaries, verification posture, and qualification evidence suitable for preview | Allowed when signal is review-safe and not a raw governance record |
| category / capability metadata | Discovery-safe categories, segments, capabilities, offering types, and qualification-facing descriptors | Strong B2B emphasis; Aggregator may use only comparison-safe / discovery-safe subsets |
| public merchandising metadata | Titles, descriptions, preview images, merchandising copy, collections, and browse-facing presentation fields | Strong B2C emphasis; only lawful when materially backed by truthful product-data continuity |
| public-safe pricing posture | Public price or pricing availability posture only when lawful for the pillar | B2C may expose explicit public price; B2B may expose only non-public pricing posture such as price-on-request or post-auth pricing availability |
| publication posture | Whether the tenant/object is public, which public posture applies, and whether the surface is public-safe or private/auth-only | Never a substitute for workflow state |
| geography / MOQ / qualification context | Public-safe trade or discovery qualifiers such as geography, service region, MOQ range, or qualification fit | Strong B2B emphasis |
| preview and entry metadata | Discovery-safe preview context, browse availability, or entry-affordance context that helps a user understand the next lawful step | Must stop before workflow ownership or authenticated continuity begins |

### 3.2 Prohibited Categories

The following categories must never be projected publicly:

| Prohibited Category | Why It Is Prohibited |
| --- | --- |
| raw internal operational records | Public surfaces must not render directly from internal admin or commerce records |
| negotiation state | Negotiation remains authenticated workflow continuity only |
| authenticated user / account continuity | User identity state, account continuity, order continuity, and authenticated session state are not public-safe |
| private workflow / thread / order / RFQ state | RFQ records, order state, messaging threads, trade state, approval state, and similar workflow objects are not public-safe |
| admin-only / governance-only fields | Governance review state, moderation state, admin notes, internal risk flags, and control-plane posture are excluded |
| unpublished or incomplete internal draft data | Internal staging, draft, hidden, or not-yet-approved object state is not a public-safe projection category |
| downstream execution ownership fields | Execution-only lifecycle fields that belong after authentication are excluded from public rendering |

### 3.3 Projection Source Discipline

The canonical source discipline is:

- internal operational records remain the source of truth for tenant, listing, product, workflow, and governance state
- public surfaces must consume a dedicated governed public projection layer rather than reading raw operational records directly
- that public projection layer may be implemented later as a governed read model, a separate projection model, or a publication-layer transformation, but the logical separation is mandatory now

Projection-safe in TexQtic terms means all of the following are true:

1. the tenant-level eligibility gate has been satisfied for the public surface being rendered
2. the object-level publication posture has been satisfied for the record being rendered
3. every rendered field belongs to an approved public-safe projection category
4. no prohibited category is leaked by direct field exposure, derived field exposure, or cross-record joining
5. the rendered surface stops at preview, trust, and lawful entry context rather than crossing into workflow ownership

This unit does not choose a persistence schema or indexing/query strategy. It only fixes the logical rule that public rendering must pass through a governed projection boundary.

## 4. Pillar-Specific Projection Posture

### B2B Projection Posture

B2B public-safe projection emphasizes:

- supplier identity
- trust / verification and qualification context
- category / capability metadata
- geography / MOQ / qualification context
- bounded non-pricing product or offering summary
- inquiry / RFQ-intent eligible preview context

B2B public-safe projection must not expose:

- public transactional pricing
- negotiation state
- messaging continuity
- RFQ workflow state
- order or trade execution state

### B2C Projection Posture

B2C public-safe projection emphasizes:

- storefront identity and branding-safe consumer context
- catalog / product browse and detail continuity
- public merchandising metadata
- public-safe pricing posture including explicit public price where lawful
- trust context suitable for shopper confidence
- browse-entry metadata supporting cart or wishlist intent

B2C public-safe projection must not expose:

- authenticated checkout state
- order or return continuity
- authenticated account state
- seller/admin controls
- private fulfillment or post-purchase workflow state

### Aggregator Projection Posture

Current approved posture does not open a general public Aggregator directory or public transaction surface.

Accordingly:

- default public publication posture for Aggregator-owned discovery objects remains `PRIVATE_OR_AUTH_ONLY`
- if a later bounded unit ever authorizes limited public-safe Aggregator exposure, the lawful emphasis is only curated discovery-intelligence context, comparison-safe preview context, and handoff-safe preview context
- any such later exposure must still exclude public transaction ownership, pricing ownership, negotiation ownership, fulfillment ownership, and public workflow continuity

The current unit therefore preserves Aggregator public projection primarily as a guardrail posture, not as an already-open public object model.

## 5. Non-Goals / Exclusions

This unit does not authorize:

- implementation, runtime mutation, schema mutation, or control-plane mutation
- direct raw-record rendering from internal operational data
- query, indexing, caching, or persistence implementation design
- moderation workflow tooling design
- full B2B inquiry / RFQ execution design
- full B2C cart / checkout / post-purchase workflow design
- Aggregator ranking algorithm, sponsorship model, or intent-record execution design
- shell UX, public routing, or transition design in full
- opening implementation units or downstream planning units by implication

## 6. Downstream Dependencies

This decision is intended to be consumed by the following later bounded units:

| Downstream Unit | What This Decision Supplies | What That Unit Must Still Decide Separately |
| --- | --- | --- |
| `B2B_PUBLIC_DISCOVERY_AND_INQUIRY_MODEL` | lawful B2B public object eligibility and approved projection categories | exact inquiry/RFQ-intent bridge, payload shape, and rollout posture |
| `B2C_PUBLIC_BROWSE_CART_CHECKOUT_BOUNDARY` | lawful B2C public object posture and allowed public-safe pricing / merchandising categories | exact cart/wishlist persistence model, checkout threshold, and post-purchase continuity boundaries |
| `AGGREGATOR_INTELLIGENCE_AND_HANDOFF_OWNERSHIP` | Aggregator default non-public object posture plus future public-safe exposure caps | exact authenticated discovery objects, intent/handoff records, and downstream ownership stop boundary |
| `PUBLIC_SHELL_AND_TRANSITION_ARCHITECTURE` | visibility gate relationship to public entry and authenticated handoff | exact entry resolution, realm continuity, and transition UX behavior |

## 7. Decision Result

`PUBLIC_VISIBILITY_AND_PROJECTION_MODEL_DRAFTED`

TexQtic now has one bounded decision artifact that defines the canonical tenant gate, object publication posture, public-safe projection categories, prohibited projection categories, projection source discipline, and pillar-specific public projection posture without widening into implementation or downstream workflow design.
