# TENANT-CONTEXT-STATE-RESET-INVESTIGATION-AND-FIX-TRACK-v1

## Status

- Unit: `TENANT-CONTEXT-STATE-RESET-INVESTIGATION-AND-FIX-TRACK`
- Phase: `INVESTIGATION_AND_FIX_TRACK_OPENING`
- State: `OPEN` / bounded track defined
- Delivery posture: bounded frontend/state-reset track only; no implementation authorized by this artifact
- Active-delivery impact: no product-facing `ACTIVE_DELIVERY` unit is open, and this artifact does not create one

## Purpose And Authority

Define one bounded frontend/state-reset investigation and later-fix track for the production-proven
tenant-context presentation defect classified as `CACHE_OR_ROUTE_RESTORE_DEFECT`.

This artifact is governed by the current authority stack in this order:

1. `governance/control/OPEN-SET.md`
2. `governance/control/NEXT-ACTION.md`
3. `governance/control/SNAPSHOT.md`
4. `governance/control/BLOCKED.md`
5. `governance/log/EXECUTION-LOG.md`
6. `TECS.md`
7. `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
8. `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`
9. `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
10. `docs/product-truth/TENANT-CONTEXT-STALE-STATE-PRESENTATION-INVESTIGATION-v1.md`
11. latest production investigation result classifying the issue as `CACHE_OR_ROUTE_RESTORE_DEFECT`

This track is opened to determine the smallest truthful frontend/state-reset fix path for the
production-proven tenant-context restore defect without widening into redesign or security
overstatement.

## Why This Track Is Being Opened

Production investigation already established a bounded classification:

- shell and tenant identity switch correctly between enterprise and WL contexts
- fresh WL-authenticated requests, when they occur, return WL-scoped data
- wrong main-content views can still restore under the new WL shell
- in at least one reproduced case, RFQ content rendered under the WL shell without a fresh RFQ
  request firing

That production evidence points to tenant-context switch reset, route restoration, client cache,
or client store invalidation behavior as the current leading defect family.

This track is therefore opened to isolate the minimum frontend/state-reset surfaces that can
truthfully fix that defect later.

## Why This Is Separate From The Closed Enterprise RFQ Bridge Unit

`ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` remains `CLOSED` in bounded scope after
production proof that the reviewed enterprise responded-RFQ path now truthfully bridges into the
existing trade / negotiation continuity.

This new track is separate because:

- it does not concern enterprise RFQ-to-trade continuity itself
- it concerns tenant/session switching and main-content restoration behavior
- it focuses on shell bootstrap, route restore, cache invalidation, and client store reset
- it does not reopen the closed enterprise bridge unit by implication
- it does not broaden into RFQ-family redesign

## Bounded Problem Statement

The production-proven defect is:

- shell and tenant context switch correctly between enterprise and WL
- fresh WL-authenticated fetches, when they occur, return WL-scoped data
- but the main-content area can restore the wrong previously viewed in-app route or content under
  the new shell
- the defect appears sequence-dependent, reproducible, and recoverable by navigation or reload
- current evidence points to route/store/cache restore behavior rather than proven backend
  isolation failure

## Production Evidence Summary

The latest bounded production investigation established all of the following:

- WL login lands in WL shell context correctly
- WL-authenticated `/api/me` returns WL tenant identity correctly
- WL-authenticated `/api/tenant/trades` returns WL-scoped data correctly when it fires
- wrong main-content views can still appear under WL shell after enterprise-to-WL switching
- normal navigation can clear the mismatch and restore correct WL content
- hard reload can also clear the mismatch
- at least one reproduced mismatch rendered RFQ content under WL shell without a fresh RFQ request
  firing, which supports route/store/cache restore drift rather than fresh cross-tenant retrieval

This evidence is sufficient to open a bounded frontend/state-reset track. It is not sufficient to
reclassify the issue as confirmed cross-tenant data retrieval.

## Current Classification To Preserve

The current classification is:

- `CACHE_OR_ROUTE_RESTORE_DEFECT`

This artifact must preserve the established severity framing:

- this is currently a tenant-context presentation / route-restore defect
- this is not currently a confirmed cross-tenant data-retrieval defect
- backend cross-tenant retrieval is not the current leading hypothesis based on available
  production evidence

## Likely Frontend / State-Reset Hypothesis Set

This track is bounded to the following likely frontend/state-reset hypotheses:

1. persisted route restoration occurs under the wrong tenant shell
2. store reset is omitted during logout/login or admin/storefront switch
3. query-cache hydration survives tenant switch when it should be invalidated
4. stale detail or list state survives tenant switch
5. shell context changes before main-content reset completes
6. tenant-scoped cache keys or store partitions are insufficient
7. route restore logic does not invalidate on tenant change

Backend cross-tenant retrieval is not the current leading hypothesis and must not be elevated back
to that posture without new production proof.

## Allowed Investigation / Fix Surfaces

This track is limited to the minimum likely frontend/state-reset surfaces.

### Client / Session / Shell Surfaces

- login and logout state reset
- tenant switch handling
- storefront/admin transition handling
- shell bootstrap state
- route restoration logic
- persisted view-state restore logic

### Client Store / Cache Surfaces

- React/query cache invalidation
- client store clearing or reset
- tenant-scoped state partitioning
- RFQ, trades, and main-content restoration behavior

### Production Reproduction Surfaces

- production login/logout sequences
- enterprise to WL and WL to enterprise switching flows
- visible route and visible content state before and after switch
- network request presence or absence during restore

No broader surface is authorized unless later bounded evidence proves it strictly necessary.

## Explicit Exclusions

This track does not authorize:

- reopening `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY`
- broader RFQ-family redesign
- trade continuity redesign
- negotiation-thread work
- B2C launch continuity
- Subscription work
- Aggregator work
- control-plane redesign unless later proof shows tenant-context reset lives there
- broad security incident framing without new evidence
- implementation beyond the minimal frontend/state-reset track opened here
- silent merging of unrelated frontend or session issues
- any claim of confirmed cross-tenant data access without new proof

## Required Production Reproduction Scope

The future bounded track must reproduce in production at minimum:

1. enterprise login and an identifiable enterprise view
2. logout and WL login
3. WL admin to storefront transition
4. immediate post-switch shell and tenant context state
5. immediate post-switch main-content state
6. whether wrong route or content restores without a fresh request
7. whether reload or navigation clears the issue
8. whether the issue reproduces across multiple cycles
9. whether the defect appears in both direction changes or only one

## Fix-Track Success Criteria

This track is successful only if it produces one of the following bounded outcomes:

### Investigation Outcome Only

- the exact reset, restore, or cache root cause is identified

### Bounded Fix-Track Ready

- the smallest frontend/state-reset fix surface is identified and bounded clearly enough for a
  later implementation prompt

### Bounded Fix Implemented Later

- tenant switch causes correct main-content reset or restoration
- wrong route or content no longer restores under the new shell
- production reproduction no longer shows mismatched shell and content state

Any later fix must remain bounded and must not widen into broad redesign.

## Completion Checklist

- Confirm this artifact opens one separate bounded frontend/state-reset track only.
- Confirm `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` remains closed and is not reopened.
- Confirm the defect is framed as a route, store, or cache restore defect.
- Confirm confirmed cross-tenant data retrieval is not claimed.
- Confirm production reproduction requirements are explicit.
- Confirm no broader RFQ-family, trade, Subscription, Aggregator, B2C, or control-plane redesign
  is merged into this track without proof.
- Confirm later implementation remains out of scope for this opening step.
- Confirm the track preserves the smallest truthful fix-path objective.

## Boundary Preservation

This artifact opens one separate bounded frontend/state-reset track only. It does not authorize
implementation in this step, does not change Layer 0 posture, does not create a new active
delivery, and does not broaden the severity framing beyond current production evidence.

It preserves the current truthful posture:

- no product-facing `ACTIVE_DELIVERY` unit is currently open
- `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` remains closed in bounded scope
- `RFQ-NEGOTIATION-CONTINUITY` remains the preserved family-level design gate
- the current defect is a tenant-context presentation / route-store-cache restore defect
- confirmed cross-tenant data retrieval is not currently proven
