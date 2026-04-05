---
unit_id: LAUNCH-ACCELERATION-OVERLAY-001
title: Thin launch-acceleration visibility overlay
type: GOVERNANCE
status: OPEN
delivery_class: DECISION_QUEUE
wave: W5
plane: CONTROL
opened: 2026-04-05
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: current Layer 0 truth still records zero product-facing ACTIVE_DELIVERY units, eleven concurrent OPEN governed units including this one, two DESIGN_GATE units, and preserved result PLANNING_STACK_NEEDS_RESHAPING in current Layer 0 carry-forward context · SOURCE_DESIGN_CONFIRMATION: LAUNCH-ACCELERATION-OVERLAY-RESHAPE-DESIGN-001 remains current and usable as the source of overlay design truth and records THIN_OVERLAY_DESIGN_COMPLETE_AND_LATER_OPENING_POSSIBLE as a design result only · CRITERIA_RETEST_CONFIRMATION: the visibility-gap, non-authority, maintenance-burden, non-duplication, and thinness tests all still pass against current repo truth · OPENING_CONFIRMATION: GOV-DEC-LAUNCH-ACCELERATION-OVERLAY-OPENING opens exactly one bounded concurrent governance/planning visibility-only unit with no product-facing opening authority"
doctrine_constraints:
  - D-004: this is one bounded governance/planning visibility unit only; it must not be merged with product delivery, broad launch-planning redesign, or roadmap authority
  - D-007: governance-only units must not touch application code, schema, tests, CI, package, or deployment surfaces
  - D-016: zero-open product-delivery posture remains under explicit decision control; this unit must not create a product successor by implication
  - D-017: source design lineage informs this unit, but does not grant any broader authority than the bounded visibility surfaces recorded here
decisions_required:
  - GOV-DEC-LAUNCH-ACCELERATION-OVERLAY-OPENING: DECIDED (2026-04-05, Paresh)
blockers: []
---

## Unit Summary

`LAUNCH-ACCELERATION-OVERLAY-001` is one bounded concurrent governance/planning visibility-only unit.

It exists only to maintain one current `Launch Critical Path Register`, one current
`Next-Opening Shortlist Matrix`, and one current `Rolling Launch Window Note`, together with one
embedded stagnation rule and one explicit non-duplication clause.

`LAUNCH-ACCELERATION-OVERLAY-RESHAPE-DESIGN-001` remains the source of overlay design truth.

This unit does not open product delivery, does not replace Layer 0, does not replace current live
product-truth authorities, and does not create roadmap, candidate-state, or forecast-commitment
authority.

## Scope Statement

This unit may maintain only the `Launch Critical Path Register`, the `Next-Opening Shortlist
Matrix`, and the `Rolling Launch Window Note`, plus one embedded stagnation rule and one explicit
non-duplication clause, all derived from current authorities only; it may not widen into a broad
planning stack, implementation-planning subsystem, or new authority surface.

## Entry Criteria

- [x] Zero product-facing `ACTIVE_DELIVERY` remains current in Layer 0
- [x] `LAUNCH-ACCELERATION-OVERLAY-RESHAPE-DESIGN-001` remains the source of overlay design truth
- [x] The source design unit's later-opening criteria still pass against current repo truth
- [x] The overlay still remains bounded to the three approved surfaces plus one rule and one clause only
- [x] No extra artifact family or bridge layer is required

## Exit Criteria

- [ ] The overlay continues to operate within the exact maintenance caps recorded below
- [ ] Every refresh continues to preserve Layer 0 and live product-truth authorities as primary
- [ ] No product-facing `ACTIVE_DELIVERY` opens by implication from any overlay refresh
- [ ] Any request for a fourth surface, a second rule, or additional authority is rejected or routed to a separate bounded refinement decision rather than widening this unit
- [ ] If the overlay later becomes duplicative or unnecessary, a separate bounded close or refinement decision is recorded instead of silent abandonment

## Files Allowlisted (Modify)

This opening authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/GOV-DEC-LAUNCH-ACCELERATION-OVERLAY-OPENING.md`
- `governance/units/LAUNCH-ACCELERATION-OVERLAY-001.md`

No other files are authorized for edit in this opening step.

## Files Read-Only

- `governance/control/BLOCKED.md`
- `governance/units/LAUNCH-ACCELERATION-OVERLAY-RESHAPE-DESIGN-001.md`
- `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
- `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
- `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`

## Exact In-Scope Boundary

This unit may define and refresh only:

1. one bounded `Launch Critical Path Register`
2. one bounded `Next-Opening Shortlist Matrix`
3. one bounded `Rolling Launch Window Note`
4. one embedded stagnation rule only
5. one explicit non-duplication clause only
6. bounded maintenance caps and refresh triggers for those exact surfaces only

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- Governance OS replacement
- doctrine-wide expansion
- roadmap regeneration
- detailed implementation planning
- any new product delivery opening authority
- any candidate-state normalization authority
- any forecast-commitment authority
- any parallel candidate/state system
- any extra overlay surface beyond the approved three
- any application, server, package, database, schema, test, or infra change

## Authority Rule

Primary authority order remains:

1. `governance/control/OPEN-SET.md`
2. `governance/control/NEXT-ACTION.md`
3. `governance/control/BLOCKED.md`
4. `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
5. `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
6. `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md` as derived context only
7. this overlay only after all of the above

Where any tension appears, the authorities above govern.

## Maintenance Caps

- `Launch Critical Path Register`: maximum 7 active rows
- `Next-Opening Shortlist Matrix`: maximum 5 contenders
- `Rolling Launch Window Note`: one note only, with `best_case_window`, `likely_window`, and `risk_adjusted_window`
- `Rolling Launch Window Note` assumptions: maximum 5 explicit assumptions
- refresh only after a product-facing close, a material planning-truth change, or the embedded stagnation rule firing

## Embedded Stagnation Rule

If two consecutive post-close or lawful-narrowing refresh cycles still leave no contender with
`boundedness_verdict: PASS`, set one overlay-only `stagnation_flag: true` marker and require one
launch-review visibility note in the next overlay refresh; this creates review visibility only and
creates no opening, prioritization, or authority shift.

## Explicit Non-Duplication Clause

`The thin Launch Acceleration Overlay may summarize launch-critical-path visibility, shortlist
visibility, and rolling launch-window visibility only. It must not open units, verify units, sync
or close units, normalize candidate state, replace Layer 0 authority, replace the live
product-truth authorities, or act as roadmap or implementation-planning authority. Candidate-state
normalization remains where TexQtic governance already handles it. Where any tension appears,
Layer 0, TEXQTIC-NEXT-DELIVERY-PLAN-v2.md, TEXQTIC-GAP-REGISTER-v2.md, and existing Governance OS
mechanics govern.`

## Current Layer 0 Rule

`LAUNCH-ACCELERATION-OVERLAY-001` is open concurrently in Layer 0 with `DECISION_QUEUE` posture
only.

No product-facing `ACTIVE_DELIVERY` is open.

`LAUNCH-ACCELERATION-OVERLAY-RESHAPE-DESIGN-001` remains the source of overlay design truth.

## Allowed Next Step

The only lawful next work inside this unit is bounded population and refresh of the three approved
visibility surfaces using current authorities only.

## Forbidden Next Step

- Do **not** open a product-facing implementation unit from this unit
- Do **not** add a fourth surface, a second rule, or a second clause
- Do **not** convert the overlay into roadmap, candidate-state, or commitment authority
- Do **not** regenerate broad launch-planning artifacts from this unit