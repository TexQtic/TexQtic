# GOV-DEC-AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS-OPENING

Decision ID: GOV-DEC-AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS-OPENING
Title: Decide and open one bounded ACTIVE_DELIVERY unit for Aggregator discovery workspace truthfulness
Status: DECIDED
Date: 2026-04-05
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- no `ACTIVE_DELIVERY` unit is currently `OPEN`
- `SNAPSHOT.md` still records `future_product_opening_requires_fresh_bounded_decision: true`
- `LAUNCH-ACCELERATION-OVERLAY-001` now surfaces `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` as the sole current `PASS` contender, but the overlay remains visibility-only and has no opening authority
- the broad `-v2` stack still preserves `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` as a design-gated family and does not by itself open any Aggregator unit
- the direct Aggregator child chain now exists and must control this opening test for the exact child only:
  - `AGGREGATOR-BOUNDED-TECS-OPENING-CANDIDATE-ANALYSIS-v1.md`
  - `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS.md`
  - `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS-BOUNDED-PRODUCT-DECISION-v1.md`

Current repo truth supports a narrower surviving Aggregator candidate than the broad family label:

- the exact child target is `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`
- the child remains limited to Aggregator home/discovery surface truthfulness only
- the child preserves `AGGREGATOR-OWNED`, `READ-FIRST`, and `CONDITIONAL BACKEND SUPPORT ONLY` posture
- the former blocker recorded in the bounded product decision was the old sole-active-delivery posture, not candidate invalidity

## Problem Statement

Layer 0 currently has no open product-facing `ACTIVE_DELIVERY` unit.

Without one fresh bounded opening now, TexQtic would either remain stalled at zero-open product
delivery despite a current exact child candidate with completed bounded-product-decision support, or
would drift back toward reopening the broad Aggregator family as a design-gated umbrella.

The smallest truthful next move is therefore one separate bounded decision and opening for
`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` only.

## Required Determinations

### 1. Is the exact child still exact, bounded, and current?

Yes.

Current repo truth still names the exact child, preserves it as the first lawful Aggregator slice,
keeps it separate from later slices, and shows no superseding open or closed unit for this child.

### 2. Does any hidden blocker remain?

No.

The former blocker in `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS-BOUNDED-PRODUCT-DECISION-v1.md`
was the then-current sole-active-delivery posture. Current Layer 0 now records zero open
product-facing delivery before this decision. The remaining `UNKNOWN / VERIFY IN REPO` read-support
questions are explicit and bounded implementation uncertainties, not hidden opening blockers.

### 3. Are the in-scope and out-of-scope lines explicit enough for lawful opening?

Yes.

The exact in-scope line remains:

- Aggregator home/discovery surface truthfulness only
- curated discovery entries/list/cards
- minimal trust-signaled list-level discovery cues
- minimum read-only data shaping
- conditional narrow backend read support only if unavoidable
- optional secondary AI insight reuse only if subordinate and non-blocking

The exact out-of-scope line remains:

- counterparty detail continuity
- intent capture
- handoff creation
- downstream RFQ/trade/order changes
- negotiation/matching/routing
- broad directory or schema redesign
- settlement/revenue/orchestrator behavior
- broader Aggregator family work

### 4. Is there any current Layer 0 contradiction that prevents lawful opening?

No.

Current Layer 0 records zero open product-facing `ACTIVE_DELIVERY`, no Aggregator blocker is
registered in `BLOCKED.md`, and the fresh bounded product decision requirement remains satisfied by
`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS-BOUNDED-PRODUCT-DECISION-v1.md`.

The broad family remains design-gated and separate. Opening this exact child does not reopen or
override the broad family posture.

## Decision

`GOV-DEC-AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS-OPENING` is now `DECIDED`.

The authoritative decision is:

1. TexQtic authorizes one separate bounded `ACTIVE_DELIVERY` unit for Aggregator discovery
   workspace truthfulness only
2. this is now the sole authorized next product-facing `ACTIVE_DELIVERY` unit
3. this decision explicitly rejects reopening the broader `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`
   family directly because the truthful current defect is narrower than the family label
4. this decision does not authorize counterparty detail continuity, intent capture, handoff
   creation, downstream RFQ/trade/order changes, negotiation/matching/routing, broad directory or
   schema redesign, settlement/revenue/orchestrator behavior, or any broader Aggregator work
5. all future implementation must stay as narrow as possible and use exact repo-relative
   allowlists only

## Opening

The following unit is now opened:

- `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`
- Title: `Aggregator discovery workspace truthfulness`
- Type: `ACTIVE_DELIVERY`
- Status: `OPEN`
- Delivery Class: `ACTIVE_DELIVERY`

Reason:

- it is the exact surviving Aggregator child candidate in current repo truth
- it remains bounded, current, and separable from later Aggregator slices
- the former sole-active-delivery blocker is now resolved in current Layer 0
- opening this child preserves one-logical-unit discipline and keeps broader Aggregator work out of scope

## Exact Future Implementation Boundary

This opening authorizes only the following bounded work:

1. make the existing Aggregator home/discovery surface materially truthful as a curated discovery workspace
2. render bounded curated discovery entries, cards, or equivalent list records
3. add minimal trust-signaled list-level discovery cues
4. perform only the minimum read-only data shaping needed to make the discovery surface truthful
5. add conditional narrow backend read support only if unavoidable and only if it remains read-only and discovery-specific
6. reuse AI insight support only if it remains clearly secondary and non-blocking

## Exact Out-of-Scope Boundary

This opening explicitly forbids:

- counterparty detail continuity
- intent capture
- handoff creation
- downstream RFQ/trade/order changes
- negotiation/matching/routing
- broad directory or schema redesign
- settlement/revenue/orchestrator behavior
- broader Aggregator family redesign
- any non-Aggregator family work

## Sequence Discipline

The required sequence remains:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

This record completes the decision and opening only.