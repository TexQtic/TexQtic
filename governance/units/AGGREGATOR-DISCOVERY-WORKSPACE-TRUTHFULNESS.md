---
unit_id: AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS
title: Aggregator discovery workspace truthfulness
type: ACTIVE_DELIVERY
status: OPEN
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: TENANT
opened: 2026-04-05
closed: null
verified: null
commit: null
evidence: "OPENING_DECISION_CONFIRMATION: current Layer 0 returned zero-open product-facing posture and bounded lawful-opening evaluation returned AGGREGATOR_CHILD_LAWFUL_TO_OPEN for this exact unit · TARGET_CONFIRMATION: current repo truth preserves AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS as the exact child candidate separate from the broader design-gated Aggregator family · BOUNDEDNESS_CONFIRMATION: candidate-analysis, opening draft, and bounded product decision all preserve discovery workspace truthfulness as the first lawful Aggregator slice only · BLOCKER_CONFIRMATION: the former sole-active-delivery blocker recorded in the bounded product decision is now resolved because Layer 0 records current_product_active_delivery_count: 0 before this opening · SCOPE_CONFIRMATION: opening remains limited to Aggregator home/discovery truthfulness, curated discovery entries, minimal trust-signaled cues, minimum read-only data shaping, conditional narrow backend read support only if unavoidable, and optional secondary AI insight reuse only if subordinate · NON_EXPANSION_CONFIRMATION: counterparty detail, intent capture, handoff creation, downstream RFQ/trade/order changes, negotiation/matching/routing, broad directory or schema redesign, settlement/revenue/orchestrator behavior, and broader Aggregator family work remain out of scope"
doctrine_constraints:
   - D-004: this is one bounded ACTIVE_DELIVERY unit only; it must not be merged with broader Aggregator family work or any other launch remainder
   - D-013: this record completes decision and opening only; implementation, verification, governance sync, and close remain separate required phases
   - D-014: the opening threshold for this bounded slice is satisfied by current Layer 0 plus the fresh bounded product decision without reopening the broader Aggregator family or requiring design-gate reversal
   - D-016: one-logical-unit discipline remains mandatory; no successor or parallel product opening is implied by this opening
decisions_required:
   - GOV-DEC-AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS-OPENING: DECIDED (2026-04-05, Paresh)
blockers: []
---

## Unit Summary

`AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` is one bounded `ACTIVE_DELIVERY` unit.

It exists only to make the Aggregator home/discovery surface materially truthful as a curated
discovery workspace without widening into broader Aggregator family work.

Current result: `OPEN`.

## Opening Basis

Current repo truth supporting this opening is:

- current Layer 0 returned to zero-open product-facing posture before this opening
- no Aggregator blocker is registered in `BLOCKED.md`
- `AGGREGATOR-BOUNDED-TECS-OPENING-CANDIDATE-ANALYSIS-v1.md` identifies discovery workspace
   truthfulness as the first lawful Aggregator opening candidate
- `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS.md` preserved the exact bounded opening draft and
   recorded `READY FOR LAWFUL OPENING DECISION`
- `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS-BOUNDED-PRODUCT-DECISION-v1.md` provided the fresh
   bounded product decision Layer 0 required for a later opening
- the former blocker recorded in that bounded product decision was the then-current sole-active-
   delivery posture, and that blocker is now resolved in current Layer 0 truth

## Exact In-Scope Boundary

This unit authorizes only the following bounded work:

1. make the Aggregator home/discovery surface materially truthful as a curated discovery workspace
2. render bounded curated discovery entries, cards, or equivalent list records
3. add minimal trust-signaled list-level discovery cues
4. perform only the minimum read-only data shaping needed to make the discovery surface truthful
5. add conditional narrow backend read support only if unavoidable and only if it remains read-
    only and discovery-specific
6. reuse AI insight support only if it remains clearly secondary and non-blocking

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- counterparty detail continuity
- intent capture
- handoff creation
- downstream RFQ/trade/order changes
- negotiation/matching/routing
- broad directory or schema redesign
- settlement/revenue/orchestrator behavior
- broader Aggregator family redesign
- any non-Aggregator family work

## Implementation Separation Guard

No implementation files are modified by this opening writeback alone.

Future implementation must remain `AGGREGATOR-OWNED`, `READ-FIRST`, and `CONDITIONAL BACKEND
SUPPORT ONLY`.

## Explicit Non-Claims

This opening does **not** claim completion of broader Aggregator operating-mode truth, counterparty
inspection, intent capture, downstream handoff visibility, AI contextualization as a primary slice,
or any broader marketplace/orchestrator behavior.
