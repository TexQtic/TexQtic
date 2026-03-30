# TEXQTIC-NEXT-DELIVERY-PLAN-v2

## Purpose

This document defines the immediate next-cycle delivery ordering for TexQtic after the completed
`-v1` planning stack.

It records the fresh A3 prioritization result without opening a unit by itself. The `-v1` plan
remains historical and complete; this `-v2` plan now records the bounded first delivery as closed
and preserves the remaining next-cycle ordering.

## Immediate Posture

- `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` is now the sole open product-facing delivery unit.
- `TENANT-CATALOG-MANAGEMENT-CONTINUITY` is now closed after bounded implementation and recorded `VERIFIED_COMPLETE` production verification.
- `WL-RFQ-EXPOSURE-CONTINUITY` is now closed after bounded implementation and successful bounded live production verification established that the reviewed WL storefront/product-detail path no longer stops before RFQ begins.
- The active opening is bounded to the minimum lawful enterprise bridge from responded RFQ into existing trade / negotiation continuity and the reviewed enterprise RFQ stop point after first response only.
- The remaining candidates stay recorded as distinct later-ready or design-gate work.
- `RFQ-NEGOTIATION-CONTINUITY` is now recorded as a separate design-gate candidate rather than an unassigned adjacent finding.

## Delivery Ordering Rules

1. Preserve the candidate-family boundaries established in A2.
2. Do not merge catalog continuity, control-plane tenant operations reality, B2C storefront continuity, and aggregator scope truth into one program.
3. Do not reopen the completed `-v1` units through this new plan.
4. Keep the aggregator candidate at design-gate posture only.

## Launch Overlay Alignment Note

This `-v2` next-delivery plan remains the active broad product-truth delivery pointer, and the
current active delivery posture remains unchanged.

For launch-specific posture, also see:

- `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
- `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
- `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`

This plan is not replaced wholesale; launch-specific interpretation is supplemented by the launch
overlay. Future launch-relevant planning or opening beyond the current active unit must therefore
respect the launch overlay, including the ordered follow-on planning-artifact queue and the
distinction between implementation-design-ready, normalization-first, and design-gate-first
families.

## New Immediate Delivery Sequence

| Order | Candidate Family | Posture | Why It Sits Here |
|---|---|---|---|
| 1 | `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` | `ACTIVE_DELIVERY` | The RFQ design gate already recommended this exact second split unit, the WL split unit is closed, and current repo truth still shows a bounded enterprise stop point after first response with existing trade scaffolding already present |
| 2 | `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` | `READY_LATER` | Remains a valid later-ready candidate but stays separate and later than the active enterprise RFQ bridge unit |
| 3 | `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` | `READY_LATER` | Valid public-facing continuity gap that remains separate and later than the active enterprise RFQ bridge unit |
| 4 | `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` | `DESIGN_GATE_ONLY` | Must remain design-gate only until the exact bounded operating model is defined |
| 5 | `RFQ-NEGOTIATION-CONTINUITY` | `DESIGN_GATE_ONLY` | The broader cross-mode RFQ family remains separate from both split units and still governs family-level scope boundaries |

## Recently Closed First Delivery

### Candidate Family

`TENANT-CATALOG-MANAGEMENT-CONTINUITY`

### Recorded Opening

After the A3 prioritization cycle established the lawful first opening basis, the bounded unit
`TENANT-CATALOG-MANAGEMENT-CONTINUITY` was opened as the sole product-facing `ACTIVE_DELIVERY`,
completed in bounded form, and is now closed after recorded `VERIFIED_COMPLETE` production
verification.

### Boundaries

- Record only the bounded close state.
- Do not treat this plan as implementation authority for any successor opening.
- Do not widen the closed candidate into general marketplace, search, merchandising, B2C redesign,
  image-upload continuity, or RFQ / negotiation continuity.

## Recently Closed Second Delivery

### Candidate Family

`WL-RFQ-EXPOSURE-CONTINUITY`

### Recorded Opening

After the RFQ design-gate artifact defined the lawful split recommendation, the bounded unit
`WL-RFQ-EXPOSURE-CONTINUITY` was opened as the sole product-facing `ACTIVE_DELIVERY`, completed in
bounded form, and is now closed after successful bounded live production verification proved that
the reviewed WL storefront/product-detail path now exposes RFQ initiation and the minimum lawful
buyer RFQ follow-up continuity needed so the path no longer stops before RFQ begins.

### Boundaries

- This unit was limited to WL RFQ initiation exposure on the reviewed storefront/product-detail path
    and the minimum lawful RFQ follow-up entry needed so that path no longer stopped before RFQ begins.
- The separately recorded WL Add to Cart 500 finding, RFQ-detail scrollability finding, and
    image/media continuity finding remain outside this close.
- Do not widen this closed unit into enterprise RFQ-to-negotiation bridge work, negotiation redesign,
    trade redesign, quote/counter-offer redesign, search, merchandising, B2C storefront continuity,
    control-plane work, or enterprise redesign.

## Current Active Delivery

### Candidate Family

`ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY`

### Recorded Opening

After the RFQ design-gate artifact defined the lawful split recommendation and the WL split unit
was completed and closed, the bounded unit `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` was
opened as the sole product-facing `ACTIVE_DELIVERY`. The opening basis is the reviewed enterprise
RFQ stop point after first response: current repo truth already exposes Request Quote, buyer RFQ
list/detail, supplier RFQ inbox/detail, one first response, the separate Trades workspace, and
the backend `POST /api/tenant/trades/from-rfq` route, but the reviewed frontend still does not
expose a sufficient bridge from responded RFQ into that existing trade / negotiation continuity.

### Boundaries

- This unit is limited to the minimum lawful bridge from responded RFQ into existing trade /
    negotiation continuity and the reviewed enterprise RFQ stop point after first response only.
- It is not WL RFQ exposure work, not broad negotiation redesign, not trade redesign, not quote /
    counter-offer redesign, not image/media continuity, not the separately recorded WL Add to Cart
    500 finding, not the separately recorded RFQ-detail scrollability finding, not search /
    merchandising / B2C continuity, not control-plane work, and not enterprise redesign.
- `WL-RFQ-EXPOSURE-CONTINUITY` remains closed and separate, and the broader
    `RFQ-NEGOTIATION-CONTINUITY` family remains design-gate authority.

## Later Candidates

### `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`

Keep as the first preserved later-ready candidate in order behind the active enterprise RFQ bridge
unit. It remains a real later-ready family and still requires its own fresh bounded opening
decision.

For launch-specific posture, also see the launch overlay, which treats platform-admin/control-
center surfaces as launch-required in bounded form and routes them through a launch-boundary
normalization artifact before broader movement is inferred.

### `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`

Keep as the second preserved later-ready candidate in order. It remains bounded and real, but
should remain separate from control-plane tenant operations reality and the closed WL RFQ exposure
unit.

For launch-specific posture, also see the launch overlay, which keeps B2C locked in launch scope
while preserving its normalization-required status.

### `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`

Keep at design-gate only. This candidate must not be reframed as implementation-ready in the
immediate delivery sequence.

For launch-specific posture, also see the launch overlay, which keeps Aggregator in launch scope
but still requires the design-gate artifact first.

### `RFQ-NEGOTIATION-CONTINUITY`

Keep the broader family at design-gate authority level. Repo truth still supports one bounded
cross-mode RFQ / negotiation continuity family, the WL RFQ exposure split unit is now closed after
bounded completion, and `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` is now opened separately
without collapsing the family-level design gate.

## Relationship To v1

The `-v1` delivery plan remains the completed historical record of the prior cycle. This `-v2`
plan starts the next-cycle ordering without rewriting or reopening those completed outcomes.