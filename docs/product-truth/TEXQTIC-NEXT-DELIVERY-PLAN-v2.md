# TEXQTIC-NEXT-DELIVERY-PLAN-v2

## Purpose

This document defines the immediate next-cycle delivery ordering for TexQtic after the completed
`-v1` planning stack.

It records the fresh A3 prioritization result without opening a unit by itself. The `-v1` plan
remains historical and complete; this `-v2` plan now records the bounded first delivery as closed
and preserves the remaining next-cycle ordering.

## Immediate Posture

- `WL-RFQ-EXPOSURE-CONTINUITY` is now the sole open product-facing delivery unit.
- `TENANT-CATALOG-MANAGEMENT-CONTINUITY` is now closed after bounded implementation and recorded `VERIFIED_COMPLETE` production verification.
- The currently open unit was lawfully opened from the authoritative RFQ design gate because current repo truth still shows the reviewed WL storefront/product-detail path stopping before RFQ begins.
- Any additional future product-facing opening requires a fresh bounded product decision against the preserved remaining candidates.
- The remaining candidates stay recorded as distinct later-ready or design-gate work.
- `RFQ-NEGOTIATION-CONTINUITY` is now recorded as a separate design-gate candidate rather than an unassigned adjacent finding.

## Delivery Ordering Rules

1. Preserve the candidate-family boundaries established in A2.
2. Do not merge catalog continuity, control-plane tenant operations reality, B2C storefront continuity, and aggregator scope truth into one program.
3. Do not reopen the completed `-v1` units through this new plan.
4. Keep the aggregator candidate at design-gate posture only.

## New Immediate Delivery Sequence

| Order | Candidate Family | Posture | Why It Sits Here |
|---|---|---|---|
| 1 | `WL-RFQ-EXPOSURE-CONTINUITY` | `OPEN / ACTIVE_DELIVERY` | First lawful bounded split unit from the RFQ design gate because the reviewed WL storefront/product-detail path still stops before RFQ begins and the minimum WL target is already defined |
| 2 | `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` | `READY_LATER` | Real later-ready operator truth gap, but not higher priority than the active WL RFQ exposure unit |
| 3 | `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` | `READY_LATER` | Valid public-facing continuity gap that remains separate and later than the active WL RFQ exposure unit |
| 4 | `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` | `DESIGN_GATE_ONLY` | Must remain design-gate only until the exact bounded operating model is defined |

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

## Current Open Delivery

### Candidate Family

`WL-RFQ-EXPOSURE-CONTINUITY`

### Recorded Opening

After the RFQ design-gate artifact defined the lawful split recommendation, the bounded unit
`WL-RFQ-EXPOSURE-CONTINUITY` was opened as the sole product-facing `ACTIVE_DELIVERY` because the
reviewed WL storefront/product-detail path still exposes browse, product detail, add-to-cart, and
cart continuity while stopping before RFQ begins.

### Boundaries

- This unit is limited to WL RFQ initiation exposure on the reviewed storefront/product-detail path
    and the minimum lawful RFQ follow-up entry needed so that path no longer stops before RFQ begins.
- Do not widen this unit into enterprise RFQ-to-negotiation bridge work, negotiation redesign,
    trade redesign, quote/counter-offer redesign, image/media continuity, search, merchandising, B2C
    storefront continuity, control-plane work, or enterprise redesign.

## Later Candidates

### `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`

Keep as the second candidate in order. It remains a real later-ready family, but it should not
displace the first recommendation.

### `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`

Keep as the third candidate in order. It remains bounded and real, but should follow the stronger
catalog continuity candidate and remain separate from it.

### `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`

Keep at design-gate only. This candidate must not be reframed as implementation-ready in the
immediate delivery sequence.

### `RFQ-NEGOTIATION-CONTINUITY`

Keep the broader family at design-gate authority level. Repo truth still supports one bounded
cross-mode RFQ / negotiation continuity family, but only the WL RFQ exposure split unit is now
opened. `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` remains separate and unopened.

## Relationship To v1

The `-v1` delivery plan remains the completed historical record of the prior cycle. This `-v2`
plan starts the next-cycle ordering without rewriting or reopening those completed outcomes.