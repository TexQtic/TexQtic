# TEXQTIC-IMPLEMENTATION-ROADMAP-v2

## Purpose

This document is the fresh implementation roadmap for the next TexQtic product-truth cycle.

It starts after the `-v1` roadmap completed and the fresh A1/A2/A3 cycle identified the next
bounded candidate families. The `-v1` roadmap remains historical and complete; this `-v2` roadmap
defines the next ordered wave structure and now records the bounded first wave as completed and
closed.

## Roadmap North Star

The next cycle prioritizes bounded product-facing continuity work that:

1. closes the strongest frontend/backend completeness gap first
2. preserves distinct candidate-family boundaries
3. keeps fake-complete operator surfaces separate from tenant commerce continuity
4. keeps scope-truth problems at design-gate posture until their target state is defined

## Governing Rules

1. The completed `-v1` roadmap remains historical and is not rewritten here.
2. A recorded recommendation does not itself open a unit; opening requires a separate lawful governance move.
3. Later-ready candidates remain distinct from the current active wave.
4. Design-gate candidates must not be promoted into implementation-ready work without a separate decision.
5. Recently closed WL / tenant-truth units remain closed and separate from this roadmap.

## v2 Roadmap Summary Table

| Wave | Name | Posture | Primary Goal | Included Candidate Family | Dependency Reason |
|---|---|---|---|---|---|
| Wave 1 | Tenant Catalog Management Continuity | `CLOSED` | Close the clearest tenant-facing catalog lifecycle completeness gap | `TENANT-CATALOG-MANAGEMENT-CONTINUITY` | Strongest bounded frontend/backend completeness gap; now completed and closed in bounded form |
| Wave 2 | WL RFQ Exposure Continuity | `CLOSED` | Make the reviewed WL storefront/product-detail path truthfully reach RFQ instead of stopping before RFQ begins | `WL-RFQ-EXPOSURE-CONTINUITY` | First lawful split unit from the RFQ design gate; now completed and closed in bounded form |
| Wave 3 | Control-Plane Tenant Operations Reality | `READY_LATER` | Make the tenant deep-dive operator surface truthful and materially usable | `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` | Remains separate from the closed WL RFQ exposure unit and still requires a fresh bounded opening decision |
| Wave 4 | B2C Storefront Continuity | `READY_LATER` | Make bounded B2C browse-entry affordances truthful and materially continuous | `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` | Important public-facing continuity work that remains later and separate after closure of the WL RFQ exposure unit |
| Design Gate | Aggregator Operating Mode Scope Truth | `DESIGN_GATE_ONLY` | Define the exact bounded aggregator operating model before any implementation opening | `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` | Current repo truth is insufficiently specific to support a lawful implementation opening |
| Design Gate | RFQ / Negotiation Continuity | `DESIGN_GATE_ONLY` | Define the exact bounded cross-mode RFQ-to-negotiation continuity target before any implementation opening | `RFQ-NEGOTIATION-CONTINUITY` | Repo truth proves one bounded family exists, but the exact target continuity between WL exposure, enterprise RFQ depth, and trade continuation is not yet implementation-ready |

## Historical Carry-Forward

The `-v1` roadmap is now the completed historical sequence for:

- enterability
- exchange-core enablement and execution continuity
- ops casework hardening
- WL bounded completeness
- truth-cleanup and tenant-truth reconciliation
- WL blueprint runtime residue closure
- WL admin entry discoverability closure

No `-v1` wave is reopened by this `-v2` roadmap.

There is currently no open product-facing `ACTIVE_DELIVERY` wave in the `-v2` stack.
`WL-RFQ-EXPOSURE-CONTINUITY` is now closed after bounded implementation and successful bounded
live production verification established WL RFQ initiation exposure plus the minimum lawful WL
buyer RFQ follow-up continuity on the reviewed storefront/product-detail path. The separately
recorded image-upload finding, WL Add to Cart 500 finding, and RFQ-detail scrollability finding
remain separate. `RFQ-NEGOTIATION-CONTINUITY` remains the preserved family-level design gate for
the broader cross-mode chain.

## Wave 1 — Tenant Catalog Management Continuity

- Posture: `CLOSED`
- Candidate Family: `TENANT-CATALOG-MANAGEMENT-CONTINUITY`

### Objective

The bounded tenant catalog lifecycle continuity gap is now closed so real tenant-owned product
surfaces are no longer materially create-and-read only when backend lifecycle support already
exists.

### Why First

- This is the strongest evidence-backed frontend/backend completeness gap in the fresh cycle.
- It is safer to open than the control-plane truth gap and more foundational than the B2C
  storefront continuity gap.
- It does not require a product-scope redesign.

### Opening Posture

This wave was the sole current product-facing `ACTIVE_DELIVERY` and is now closed after bounded
implementation, the bounded B2B surfaced affordance follow-up, and recorded `VERIFIED_COMPLETE`
production verification established tenant catalog item update/delete continuity in bounded form.

### Boundaries

- Do not widen this wave into marketplace redesign, merchandising, search, or broad B2C strategy.
- Do not absorb control-plane tenant operations reality.
- Do not treat this closed wave as a reopen of the completed WL completeness cycle.

## Wave 2 — WL RFQ Exposure Continuity

- Posture: `CLOSED`
- Candidate Family: `WL-RFQ-EXPOSURE-CONTINUITY`

### Objective

Resolved WL RFQ initiation exposure on the reviewed WL storefront/product-detail path and added
the minimum lawful RFQ follow-up entry needed so that reviewed WL path no longer stops before RFQ
begins.

### Closure Basis

- The bounded implementation was completed in commit `d0697f1564d180ac1a4dedf4549b80df9f815a6d`.
- Successful bounded live production verification proved that WL product detail now exposes
  `Request Quote`, RFQ submission succeeds, immediate RFQ follow-up opens the expected buyer RFQ
  detail surface, and storefront re-entry via `View My RFQs` works.
- The WL path no longer stops before RFQ begins, and no active bounded defect remains inside this
  unit itself.
- The separately recorded WL Add to Cart 500 finding, RFQ-detail scrollability finding, and
  image/media continuity finding remain outside this closed unit.

### Boundaries

- Do not widen this unit into enterprise RFQ-to-negotiation bridge work.
- Do not widen this unit into broad negotiation workflow redesign, trade redesign, or
  quote/counter-offer redesign.
- Do not merge this closed unit into image/media continuity, the separately recorded WL Add to Cart
  500 finding, the separately recorded RFQ-detail scrollability finding, search, merchandising,
  B2C storefront continuity, control-plane work, or enterprise redesign.

## Wave 3 — Control-Plane Tenant Operations Reality

- Posture: `READY_LATER`
- Candidate Family: `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`

### Objective

Make the bounded tenant deep-dive control-plane surface truthful and materially usable without
widening into general control-plane modernization.

### Why Later

- It is a valid ready candidate, but it is more supervisory than the first-order tenant catalog
  lifecycle continuity gap.
- It should follow rather than absorb Wave 1.

## Wave 4 — B2C Storefront Continuity

- Posture: `READY_LATER`
- Candidate Family: `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`

### Objective

Repair the bounded B2C storefront entry and browse continuity gap where primary affordances still
overstate live behavior.

### Why Later

- It is real and launch-relevant, but narrower in platform impact than Wave 1.
- It should remain separate from tenant catalog lifecycle work.

## Design Gate — Aggregator Operating Mode Scope Truth

- Posture: `DESIGN_GATE_ONLY`
- Candidate Family: `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`

### Objective

Define the exact bounded aggregator operating model that repo truth is expected to support before
any implementation-ready opening is considered.

### Explicit Rule

This candidate must remain design-gate only in the `-v2` cycle until the required bounded outcome
is explicitly defined. It must not be promoted into an implementation wave by implication.

## Design Gate — RFQ / Negotiation Continuity

- Posture: `DESIGN_GATE_ONLY`
- Candidate Family: `RFQ-NEGOTIATION-CONTINUITY`

### Objective

Define the exact bounded cross-mode RFQ / negotiation continuity target that repo truth should
support before any implementation-ready opening is considered.

### Why Design Gate Only

- Repo truth supports one bounded candidate family rather than two separate openings.
- White-label reviewed runtime lacks evidenced RFQ exposure, enterprise reviewed RFQ surfaces remain
  explicitly pre-negotiation and first-response-only, and the reviewed frontend does not yet show
  a materially continuous RFQ-to-negotiation bridge.
- The exact minimally true closure target therefore still needs definition before implementation
  work can be opened lawfully.
- The first lawful split unit from this family is now opened separately as
  `WL-RFQ-EXPOSURE-CONTINUITY`, but that does not open or define the still-separate future unit
  `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY`.

### Explicit Rule

This candidate must remain design-gate only until the bounded target continuity is explicitly
defined. It must not be promoted into an implementation wave by implication and must remain
separate from catalog continuity, image/media continuity, B2C storefront continuity, control-plane
tenant operations reality, aggregator scope truth, and enterprise redesign.