# GOV-DEC-GOVERNANCE-OS-RESET-OPENING

Date: 2026-03-25
Type: Governance Decision + Opening
Status: Accepted
Unit: GOVERNANCE-OS-RESET-001
Domain: GOVERNANCE
Delivery Class: ACTIVE_DELIVERY

## Decision

TexQtic authorizes one separate bounded Governance OS reset unit,
`GOVERNANCE-OS-RESET-001`, to shrink and re-anchor live governance behavior so governance remains
a drift-control layer around TexQtic platform delivery rather than a portfolio-dominating local
sequencing system.

This decision is controlled by the completed Phase 1, Phase 2, and Phase 3 reset findings.

Those findings establish that:

- Governance OS still contains strong anti-drift controls worth preserving
- Governance OS is over-applied in live use
- governance-local correctness is consuming delivery attention
- Sentinel burden is too broad
- candidate normalization is too heavy as a default precondition
- `OPEN-SET.md`, `NEXT-ACTION.md`, and `SNAPSHOT.md` are too governance-local in current live use
- a separate bounded reset implementation unit is justified

This unit is governance reset only.

It is the sole current `ACTIVE_DELIVERY` because it directly affects live sequencing behavior, and
leaving it in `DECISION_QUEUE` would repeat the same governance-stall pattern being corrected.

This opening does not authorize a product-facing implementation stream, does not authorize
Governance OS elaboration, and does not authorize any new governance subsystem, standing
governance layer, Sentinel subsystem, candidate-normalization program, or queue-taxonomy growth.

This unit exists to make governance smaller, narrower, and more subordinate to broader
product-plan truth while preserving the high-value anti-drift controls that directly protect truth
integrity, bounded scope, production safety, and closure correctness.

No human-decision items are auto-resolved here. In particular, this opening does not decide which
divergent doctrine or product-plan sections remain active, historical, or partially binding, and
it does not resolve whether any broad product-plan section remains strategically controlling beyond
the already-captured Phase 1 / Phase 3 findings.

Execution-log integrity cleanup is separately governed and remains out of scope for this unit.
Sentinel program files and candidate-ledger content remain out of scope for this unit.

## What This Later Reset Will Preserve Unchanged

- Layer 0 as the canonical current-state source
- governance vs implementation separation
- exact allowlists / safe-write doctrine
- bounded-unit / no-drift discipline
- closure-truth protection through mandatory post-close audit output

## What This Later Reset Will Narrow

- Sentinel posture at the live operating level so it remains a bounded gate rather than a default
  generator of governance-local work
- candidate normalization so it becomes exception-only rather than a default prerequisite
- `SNAPSHOT.md` so it returns to restore-grade carry-forward context
- governance-local sequencing dominance in Layer 0

## What This Later Reset Will Freeze

- further Governance OS elaboration by default
- further Sentinel scope expansion by default
- further candidate-normalization expansion by default
- governance-only memorialization patterns that keep generating non-essential open work by default

## What This Later Reset Will Re-Anchor

Before governance may return `OPERATOR_DECISION_REQUIRED` or equivalent stall posture after no
`ACTIVE_DELIVERY` unit remains open, it must perform one bounded broader-truth consultation using:

- current Layer 0 state
- current repo truth
- only the surviving strategically authoritative portions of the broader product-plan corpus

This re-anchor is bounded and does not let broad plan documents override repo truth or Layer 0.

## Opening

TexQtic opens exactly one bounded unit:

- unit id: `GOVERNANCE-OS-RESET-001`
- title: `Governance OS posture reset`
- type: `GOVERNANCE`
- status: `OPEN`
- delivery class: `ACTIVE_DELIVERY`

Reason:

- this reset directly affects live sequencing behavior
- leaving it in `DECISION_QUEUE` would repeat the same governance stall pattern being corrected
- this is a bounded operating-model correction, not a standing governance program

## Exact In-Scope Boundary

This opening authorizes only the following later bounded work:

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

This opening explicitly forbids:

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
- silently auto-resolving the human-decision items identified in Phase 1 and Phase 3

## Later Reset File Boundary

The later reset implementation is bounded to these exact files only:

- `governance/control/DOCTRINE.md`
- `docs/governance/control/GOV-OS-001-DESIGN.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`

No other implementation file set is authorized by implication.