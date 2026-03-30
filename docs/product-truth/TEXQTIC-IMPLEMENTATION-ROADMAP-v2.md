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

## Launch Overlay Alignment

This `-v2` roadmap remains the active broad product-truth roadmap.

For launch-specific posture, also see:

- `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
- `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
- `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`

This roadmap is not superseded wholesale; launch-specific interpretation is supplemented by the
launch overlay. Future implementation-design movement for launch-required families must therefore
respect the launch planning split before any fresh design or opening decision. In launch-specific
terms, B2B remains the primary launch anchor, B2C and subscription/commercial packaging remain
normalization-first, Aggregator remains design-gate-first, and platform-admin/control-center
surfaces remain bounded rather than redesign-wide.

## v2 Roadmap Summary Table

| Wave | Name | Posture | Primary Goal | Included Candidate Family | Dependency Reason |
|---|---|---|---|---|---|
| Wave 1 | Tenant Catalog Management Continuity | `CLOSED` | Close the clearest tenant-facing catalog lifecycle completeness gap | `TENANT-CATALOG-MANAGEMENT-CONTINUITY` | Strongest bounded frontend/backend completeness gap; now completed and closed in bounded form |
| Wave 2 | WL RFQ Exposure Continuity | `CLOSED` | Make the reviewed WL storefront/product-detail path truthfully reach RFQ instead of stopping before RFQ begins | `WL-RFQ-EXPOSURE-CONTINUITY` | First lawful split unit from the RFQ design gate; now completed and closed in bounded form |
| Wave 3 | Enterprise RFQ to Negotiation Bridge Continuity | `ACTIVE_DELIVERY` | Bridge the reviewed enterprise responded-RFQ stop point into the existing trade / negotiation continuity without broad redesign | `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` | Second lawful split unit from the RFQ design gate; now opened in bounded form after closure of the WL split unit |
| Wave 4 | Control-Plane Tenant Operations Reality | `READY_LATER` | Make the tenant deep-dive operator surface truthful and materially usable | `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` | Remains separate from the active enterprise RFQ bridge unit and still later-ready |
| Wave 5 | B2C Storefront Continuity | `READY_LATER` | Make bounded B2C browse-entry affordances truthful and materially continuous | `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` | Important public-facing continuity work that remains later and separate after opening of the enterprise RFQ bridge unit |
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

`ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` is now the sole open product-facing
`ACTIVE_DELIVERY` wave in the `-v2` stack. `WL-RFQ-EXPOSURE-CONTINUITY` is now closed after
bounded implementation and successful bounded live production verification established WL RFQ
initiation exposure plus the minimum lawful WL buyer RFQ follow-up continuity on the reviewed
storefront/product-detail path. The separately recorded image-upload finding, WL Add to Cart 500
finding, and RFQ-detail scrollability finding remain separate. `RFQ-NEGOTIATION-CONTINUITY`
remains the preserved family-level design gate for the broader cross-mode chain.

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

## Wave 3 — Enterprise RFQ to Negotiation Bridge Continuity

- Posture: `ACTIVE_DELIVERY`
- Candidate Family: `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY`

### Objective

Resolve the reviewed enterprise RFQ stop point after first response by adding the minimum lawful
bridge from responded RFQ into the existing trade / negotiation continuity that already exists in
repo truth.

### Opening Basis

- The authoritative `RFQ-NEGOTIATION-CONTINUITY-DESIGN-GATE-v1` artifact recommended this exact
  bounded split unit as the second future implementation unit.
- Current repo truth still shows the reviewed enterprise runtime already exposing Request Quote,
  buyer RFQ list/detail, supplier RFQ inbox/detail, and one first response.
- Current repo truth still shows the reviewed frontend stopping before any sufficient bridge into
  the existing Trades workspace and backend `POST /api/tenant/trades/from-rfq` route.
- This unit therefore opens cleanly without reopening WL RFQ exposure work or widening into broad
  negotiation / trade redesign.

### Boundaries

- Do not widen this unit into WL RFQ exposure work.
- Do not widen this unit into broad negotiation redesign, trade redesign, or quote /
  counter-offer redesign.
- Do not merge this unit into image/media continuity, the separately recorded WL Add to Cart 500
  finding, the separately recorded RFQ-detail scrollability finding, search, merchandising, B2C
  storefront continuity, control-plane work, or enterprise redesign.

## Wave 4 — Control-Plane Tenant Operations Reality

- Posture: `READY_LATER`
- Candidate Family: `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`

### Objective

Make the bounded tenant deep-dive control-plane surface truthful and materially usable without
widening into general control-plane modernization.

### Why Later

- It remains a valid later-ready candidate, but the bounded enterprise RFQ bridge now has an
  explicit design-gate-backed opening basis and a more immediate product-facing continuity stop
  point.
- It should remain separate and later than the active enterprise RFQ bridge wave.
- For launch-specific posture, also see the launch overlay, which keeps platform-admin/control-
  center surfaces in launch scope in bounded form and requires a boundary-normalization artifact
  before any broader implementation-design movement is inferred.

## Wave 5 — B2C Storefront Continuity

- Posture: `READY_LATER`
- Candidate Family: `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`

### Objective

Repair the bounded B2C storefront entry and browse continuity gap where primary affordances still
overstate live behavior.

### Why Later

- It is real and launch-relevant, but it remains separate and later than the active enterprise RFQ
  bridge work.
- It should remain separate from tenant catalog lifecycle work and from the RFQ / negotiation
  family.
- For launch-specific posture, also see the launch overlay, which keeps B2C locked in launch scope
  while preserving its normalization-required status before later implementation-design movement.

## Design Gate — Aggregator Operating Mode Scope Truth

- Posture: `DESIGN_GATE_ONLY`
- Candidate Family: `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`

### Objective

Define the exact bounded aggregator operating model that repo truth is expected to support before
any implementation-ready opening is considered.

### Explicit Rule

This candidate must remain design-gate only in the `-v2` cycle until the required bounded outcome
is explicitly defined. It must not be promoted into an implementation wave by implication.

For launch-specific posture, also see the launch overlay, which keeps Aggregator in launch scope
but still requires the design-gate artifact first before any implementation-design movement.

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
- The family-level exact minimally true closure target still remains broader than either split unit,
  so the family itself must stay at design-gate posture even though bounded split-unit openings can
  proceed when separately justified.
- The first lawful split unit from this family is now closed separately as
  `WL-RFQ-EXPOSURE-CONTINUITY`, and the second lawful split unit is now opened separately as
  `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` without collapsing the family-level design
  gate into broad implementation-complete posture.

### Explicit Rule

This candidate must remain design-gate only until the bounded target continuity is explicitly
defined. It must not be promoted into an implementation wave by implication and must remain
separate from catalog continuity, image/media continuity, B2C storefront continuity, control-plane
tenant operations reality, aggregator scope truth, and enterprise redesign.