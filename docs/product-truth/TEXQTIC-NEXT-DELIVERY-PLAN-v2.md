# TEXQTIC-NEXT-DELIVERY-PLAN-v2

## Purpose

This document defines the immediate next-cycle delivery ordering for TexQtic after the completed
`-v1` planning stack.

It records the fresh A3 prioritization result without opening a unit by itself. The `-v1` plan
remains historical and complete; this `-v2` plan now records the bounded first delivery as closed
and preserves the remaining next-cycle ordering.

## Immediate Posture

- `CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS` is now closed after bounded implementation and the
    complete production proof chain established truthful eligible activation visibility,
    successful real approved activation, truthful post-activation `ACTIVE` state, and clean
    neighbor-path continuity.
- `TENANT-CATALOG-MANAGEMENT-CONTINUITY` is now closed after bounded implementation and recorded `VERIFIED_COMPLETE` production verification.
- `WL-RFQ-EXPOSURE-CONTINUITY` is now closed after bounded implementation and successful bounded live production verification established that the reviewed WL storefront/product-detail path no longer stops before RFQ begins.
- `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` is now closed after bounded implementation and bounded live production verification established that the reviewed enterprise responded-RFQ path now truthfully bridges into the existing trade / negotiation continuity.
- The remaining candidates stay recorded as distinct later-ready or design-gate work.
- `RFQ-NEGOTIATION-CONTINUITY` is now recorded as a separate design-gate candidate rather than an unassigned adjacent finding.

## Delivery Ordering Rules

1. Preserve the candidate-family boundaries established in A2.
2. Do not merge catalog continuity, control-plane tenant operations reality, B2C storefront continuity, and aggregator scope truth into one program.
3. Do not reopen the completed `-v1` units through this new plan.
4. Keep the aggregator candidate at design-gate posture only.

## Launch Overlay Alignment Note

This `-v2` next-delivery plan remains the active broad product-truth delivery pointer, and no
current active delivery is open.

For launch-specific posture, also see:

- `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
- `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
- `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`

This plan is not replaced wholesale; launch-specific interpretation is supplemented by the launch
overlay. Future launch-relevant planning or opening beyond the current closed delivery chain must
therefore respect the launch overlay, including the ordered follow-on planning-artifact queue and the
distinction between implementation-design-ready, normalization-first, and design-gate-first
families.

## New Immediate Delivery Sequence

| Order | Candidate Family | Posture | Why It Sits Here |
|---|---|---|---|
| 1 | `CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS` | `CLOSED` | Bounded control-plane tenant deep-dive truthfulness child now closed after complete production proof |
| 2 | `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` | `READY_LATER` | Valid public-facing continuity gap that remains separate and later than the newly opened control-plane tenant deep-dive unit |
| 3 | `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` | `DESIGN_GATE_ONLY` | Must remain design-gate only until the exact bounded operating model is defined |
| 4 | `RFQ-NEGOTIATION-CONTINUITY` | `DESIGN_GATE_ONLY` | The broader cross-mode RFQ family remains separate from its now-closed split units and still governs family-level scope boundaries |

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

## Recently Closed Third Delivery

### Candidate Family

`ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY`

### Recorded Closure

After the RFQ design-gate artifact defined the lawful split recommendation and the WL split unit
was completed and closed, the bounded unit `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` was
implemented in bounded form and is now closed after bounded live production verification proved
that the reviewed enterprise responded-RFQ path no longer stops after first response: RFQ detail
loads, `Continue to Trade` lands in a persisted trade detail, RFQ re-entry shows linked
continuity, and `Open Existing Trade` reuses the existing trade rather than creating another
bridge.

### Boundaries

- This unit was limited to the minimum lawful bridge from responded RFQ into existing trade /
    negotiation continuity and the reviewed enterprise RFQ stop point after first response only.
- It does not close WL RFQ exposure work, broad negotiation redesign, trade redesign, quote /
    counter-offer redesign, image/media continuity, the separately recorded WL Add to Cart 500
    finding, the separately recorded RFQ-detail scrollability finding, search / merchandising /
    B2C continuity, control-plane work, or enterprise redesign.
- `WL-RFQ-EXPOSURE-CONTINUITY` remains closed and separate, and the broader
    `RFQ-NEGOTIATION-CONTINUITY` family remains design-gate authority.

## Later Candidates

### `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`

The broad family remains preserved, but it should not be opened directly. Its first lawful bounded
opening is now `CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS`, which isolates the tenant deep-dive
truthfulness defect from registry redesign, audit-log depth work, impersonation-program breadth,
billing/risk workflow completion, and AdminRBAC authority work.

For launch-specific posture, also see the launch overlay, which treats platform-admin/control-
center surfaces as launch-required in bounded form and routes them through a launch-boundary
normalization artifact before broader movement is inferred.

### `CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS`

This bounded child is now closed after complete production proof.

It was limited to tenant deep-dive truthfulness only on the reviewed control-plane surface:

- overview truth
- approved-onboarding activation truth
- truthful handling of non-real or under-construction deep tabs
- truthful exclusion of billing/risk/lifecycle/admin-authority depth that repo truth does not
    support

It must remain separate from registry redesign, audit-log search/filter completion, full
impersonation lifecycle work, billing workflow completion, risk-report completion, and all
AdminRBAC invite/revoke/role-partition work.

Close basis now recorded:

- lawful `VERIFICATION_APPROVED` preparation was established on the reviewed proof path
- control-plane read truth was restored so the eligible tenant surfaced truthfully
- the real `Activate Approved Tenant` path completed successfully in production
- post-activation deep-dive truth remained correct as `ACTIVE`
- neighbor-path checks remained clean for shell continuity, registry continuity, bounded
    tenant-context entry continuity, and separate audit posture

Separate notes retained outside this close:

- adjacent finding only: `server/src/routes/control.ts:287` likely still uses the older
    write-context pattern on the onboarding outcome route and may require a separate bounded
    hardening unit if production use of that route needs explicit safety
- cleanup note closed separately: proof tenant `05d7a469-8ec3-4685-8a24-803933a88f79` was
    classified as `EPHEMERAL` and was removed by
    `EPHEMERAL-VERIFICATION-TENANT-CLEANUP-001`

## Recently Closed Fourth Delivery

### Candidate Family

`CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS`

### Recorded Closure

After creation of `PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md`, bounded eligibility
reconciliation, bounded runtime truth restoration, and bounded activation-path repair, the narrowed
unit `CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS` is now closed after complete production proof
on the lawful reviewed tenant path.

### Boundaries

- This unit was limited to truthfulness of the tenant deep-dive surface only.
- It does not authorize registry redesign, audit-log search/filter completion, full impersonation
    lifecycle work, billing workflow completion, risk-report completion, or AdminRBAC invite/revoke/
    role-partition work.
- It does not reopen the broad `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` family as one umbrella
    implementation stream.

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
bounded completion, and `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` is now closed separately
without collapsing the family-level design gate.

## Relationship To v1

The `-v1` delivery plan remains the completed historical record of the prior cycle. This `-v2`
plan starts the next-cycle ordering without rewriting or reopening those completed outcomes.