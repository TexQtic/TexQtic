---
unit_id: GOVERNANCE-OS-RESET-001
title: Governance OS posture reset
type: GOVERNANCE
status: OPEN
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: CONTROL
opened: 2026-03-25
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: current Layer 0 truth records zero product-facing ACTIVE_DELIVERY units, eight concurrent DECISION_QUEUE governance units, one DESIGN_GATE stream, and OPERATOR_DECISION_REQUIRED as the prior next action · RESET_FINDINGS_CONFIRMATION: completed Phase 1, Phase 2, and Phase 3 findings require a bounded Governance OS reset that preserves anti-drift controls while shrinking governance-local sequencing dominance · BOUNDARY_CONFIRMATION: execution-log integrity cleanup, Sentinel program files, candidate-ledger content, and doctrine/product-plan authority decisions remain out of scope for auto-resolution in this unit"
doctrine_constraints:
  - D-004: this is one bounded governance reset unit only; it must not widen into product implementation, verification, sync, or close of any unrelated unit
  - D-006: no product/application implementation work is authorized in this governance opening
  - D-007: governance work must not touch application code, schema, tests, CI, package, or hook surfaces
  - D-013: closure-truth protection remains mandatory later, but this opening step performs no implementation, verification, sync, or close
decisions_required:
  - GOV-DEC-GOVERNANCE-OS-RESET-OPENING: DECIDED (2026-03-25, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-OS-RESET-001` is one bounded governance-only operating-model reset.

It exists to shrink and re-anchor live Governance OS behavior so governance remains a drift-control
layer around TexQtic platform delivery rather than a portfolio-dominating local sequencing system.
This unit is the sole current `ACTIVE_DELIVERY` because it directly affects live sequencing
behavior, but it does not authorize any product-facing implementation stream.

## Acceptance Criteria

- [ ] The later reset preserves Layer 0 first-read discipline
- [ ] The later reset preserves governance vs implementation separation
- [ ] The later reset preserves exact allowlists and bounded-unit discipline
- [ ] The later reset preserves closure-truth protection without widening governance recursion
- [ ] The later reset narrows Sentinel posture at the live operating level
- [ ] The later reset demotes candidate normalization to exception-only use
- [ ] The later reset reduces `SNAPSHOT.md` to restore-grade carry-forward context
- [ ] The later reset codifies broader-truth consultation before stall posture is returned
- [ ] The later reset remains bounded to exactly these implementation targets: `governance/control/DOCTRINE.md`, `docs/governance/control/GOV-OS-001-DESIGN.md`, `governance/control/OPEN-SET.md`, `governance/control/NEXT-ACTION.md`, and `governance/control/SNAPSHOT.md`

## Files Allowlisted (Modify)

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/log/EXECUTION-LOG.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-OS-RESET-OPENING.md`
- `governance/units/GOVERNANCE-OS-RESET-001.md`

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `docs/governance/control/GOV-OS-001-DESIGN.md`
- `governance/decisions/GOV-POLICY-CLOSURE-SEQUENCING-HARDENING.md`
- `governance/decisions/GOV-DESIGN-GOVERNANCE-HARDENING-WORKFLOW.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001.md`
- `governance/units/GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001.md`
- `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md`
- `governance/analysis/ADDITIONAL-REPO-TRUTH-CANDIDATES-001.md`

## Exact In-Scope Boundary

1. narrow live Governance OS behavior while preserving core anti-drift controls
2. codify the broader-truth consultation rule before governance may return
   `OPERATOR_DECISION_REQUIRED` or equivalent stall posture
3. reduce governance-local sequencing dominance in Layer 0
4. reduce Sentinel burden at the live operating level without abolishing Sentinel as a bounded
   gate
5. demote candidate normalization from default prerequisite to exception-only use
6. reduce `SNAPSHOT.md` to restore-grade carry-forward context
7. revise `OPEN-SET.md` and `NEXT-ACTION.md` behavior so governance-only memorialization work does
   not dominate live sequencing posture by default

## Exact Out-of-Scope Boundary

- opening or selecting the next product-facing unit
- product/application/server implementation work
- schema, DB, Prisma, SQL, CI, hook, or package work
- execution-log cleanup
- rewriting candidate-normalization program artifacts
- rewriting Sentinel spec/program artifacts
- creating a new queue taxonomy
- creating a new standing governance layer
- creating a new Sentinel subsystem
- creating a new candidate-normalization program
- broad doctrine-corpus rewrite outside the exact later five-file reset list
- silently auto-resolving doctrine/product-plan authority decisions

## Preservation Rules

This unit explicitly preserves:

- Layer 0 first-read discipline
- governance vs implementation separation
- exact allowlists / safe-write doctrine
- bounded-unit / no-drift discipline
- closure-truth protection through mandatory post-close audit output

## Reset Targets

Later implementation must explicitly deliver:

- narrower Sentinel posture
- exception-only candidate normalization
- restore-grade `SNAPSHOT.md`
- broader-truth consultation before governance returns stall posture

Execution-log cleanup is separately governed and out of scope here.
Doctrine/product-plan authority decisions remain human-decided and are out of scope for
auto-resolution here.