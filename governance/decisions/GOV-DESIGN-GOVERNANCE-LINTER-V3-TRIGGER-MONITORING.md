# GOV-DESIGN-GOVERNANCE-LINTER-V3-TRIGGER-MONITORING

Decision ID: GOV-DESIGN-GOVERNANCE-LINTER-V3-TRIGGER-MONITORING
Title: Governance-linter evolution must be triggered by monitored evidence rather than instinct
Status: DECIDED
Date: 2026-03-19
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state already records:

- `GOV-POLICY-HISTORICAL-LAYER1-RECONCILIATION`
- `GOV-POLICY-CLOSURE-SEQUENCING-HARDENING`
- `GOV-DESIGN-GOVERNANCE-HARDENING-WORKFLOW`
- `GOV-IMPLEMENT-GOVERNANCE-LINTER-WORKFLOW`
- `GOV-REFINE-GOVERNANCE-LINTER-V2`

Those records establish that:

- the governance linter is installed and operational
- current linter scope remains machine-checkable structural enforcement only
- historical classification, Layer 1 backfill exactness, chronology sufficiency, materiality,
  snapshot/log-only reconciliation judgment, and product or operator sequencing choice remain
  intentionally human-only
- the first refinement already occurred and was justified by observed warning noise and output
  clarity issues rather than by new rule ambition
- `OPEN-SET.md` contains 0 implementation-ready units and `NEXT-ACTION.md` remains
  `OPERATOR_DECISION_REQUIRED`

TexQtic now needs a small monitoring and calibration framework that answers a narrower question:
when should governance-linter v2 be left alone, when should it receive a bounded refinement, and
when would a later v3 design review be justified.

Verification posture for this monitoring design: `GOVERNANCE_RECONCILIATION_CONFIRMATION`.

## Problem Statement

Without an explicit monitoring framework, future governance-linter change decisions risk becoming
instinct-led, annoyance-led, or policy-drift-led.

That would create three avoidable problems:

1. harmless friction could be over-treated as a reason to expand the linter
2. genuine structural blind spots could be under-treated because no one defined what counts as
   enough evidence
3. repeated small complaints could slowly push the linter into human-judgment territory without a
   separate governance decision

TexQtic therefore needs a conservative evidence model for deciding whether governance-linter v2
should remain stable, receive a bounded refinement, or trigger a separate future v3 design review.

## Stability Criteria

Governance-linter v2 is considered stable enough to leave alone when all of the following remain
true across real governance-only usage:

1. repeated governance-only diffs pass or fail for understandable structural reasons
2. no recurring false-positive pattern appears on canonical governance workflows
3. no high-confidence false negative is discovered after merge for a rule that is already
   machine-checkable under the recorded hardening policy
4. maintainers can understand failures and warnings directly from the current output, artifact, and
   maintainer note without repeated explanation
5. CI reruns caused only by linter friction are absent or rare and non-recurring
6. repo governance patterns remain materially the same as the patterns already recognized by the
   installed linter

Bias rule:

**Governance-linter v2 should remain stable by default unless repeated real-world evidence shows
either structural blind spots or recurring operational friction.**

## Refinement Triggers

A future bounded refinement is justified only when one or more of the following are evidenced more
than once in real governance use:

1. repeated false positives on the same valid canonical governance pattern
2. repeated confusing output on the same failure category that causes mis-handling or operator
   delay
3. repeated advisory warning noise that does not improve human review quality
4. repeated governance-only diffs requiring the same manual explanation because the linter output,
   artifact, or maintainer note is not clear enough
5. emergence of a new canonical governance pattern that is policy-backed and machine-checkable,
   but not safely recognized by the current linter
6. high-confidence false negatives where structural drift escaped a check the linter should
   already have been able to express under current policy boundaries

Single isolated annoyance is not enough.
One-off edge cases are not enough.
Instinct that the linter "could be smarter" is not enough.

## Metrics / Signals To Watch

TexQtic should watch the following metrics and qualitative signals after governance-only work:

1. governance-lint pass rate on governance-only diffs
2. governance-lint fail rate on governance-only diffs
3. number of confirmed false positives
4. number of high-confidence false negatives discovered after merge
5. number of CI reruns caused only by governance-lint friction
6. number of governance commits requiring human clarification after a linter result
7. most common failure categories hit by the linter
8. most common advisory warning categories emitted by the linter
9. number of repeated failure-output misunderstandings for the same rule category
10. number of escaped structural drift cases that were machine-checkable and policy-backed but not
    caught
11. whether recent governance-only diffs still fit the currently recognized canonical patterns
12. whether maintainers are using documentation-only clarification instead of requesting code
    changes

These signals should be tracked by simple governance review notes in the relevant monitoring cycle,
not by creating a new always-on telemetry subsystem.

## Thresholds And Escalation Rules

TexQtic should apply the following conservative decision rules.

### Outcome 1 — No Action

Choose no action when:

1. the linter passes or fails for expected structural reasons
2. friction is isolated, non-recurring, or resolved by existing documentation
3. no confirmed false positive or high-confidence false negative exists

### Outcome 2 — Documentation-Only Clarification

Choose documentation-only clarification when:

1. the linter behavior is correct
2. the same rule is being misunderstood
3. the issue can be resolved by improving the maintainer note, PR guidance, or monitoring notes
4. no rule logic change is required

This path is preferred before code refinement whenever the rule itself is sound.

### Outcome 3 — Bounded Refinement

Choose a bounded refinement only when at least one of the following thresholds is met:

1. the same confirmed false-positive pattern appears in at least 2 separate governance-only cycles
2. the same failure-output misunderstanding appears in at least 2 separate governance-only cycles
   and documentation-only clarification did not remove the friction
3. the same advisory-noise pattern appears in at least 2 separate governance-only cycles and does
   not improve review quality
4. one high-confidence false negative is confirmed in a category that is already machine-checkable,
   policy-backed, and clearly outside the human-only boundary

The resulting refinement must stay small, targeted, and evidence-specific.

### Outcome 4 — v3 Trigger Review

A future v3 design review is justified only when at least one of the following is true:

1. 2 or more distinct bounded refinements would otherwise be needed across different structural
   categories, indicating the current shape of the linter may no longer be sufficient
2. 2 or more high-confidence escaped structural drift events occur after merge in different
   machine-checkable categories
3. repo governance practice introduces a new stable canonical pattern that cannot be covered safely
   through a one-line or one-rule refinement without rethinking linter boundaries or structure
4. recurring friction persists across at least 3 governance-only cycles even after documentation
   clarification and one bounded refinement

v3 trigger review means design review only.
It is not authorization to implement v3 rules.

## Review Cadence

Monitoring should be reviewed at the smallest practical cadence that still reflects real usage:

1. lightweight note after each governance-only cycle that exercises the linter in a meaningful way
2. explicit calibration review after every 5 governance-only commits that touched linter-governed
   files, or after 30 days, whichever comes first
3. immediate review after any escaped structural drift event that appears machine-checkable
4. immediate review after any repeated CI-friction pattern is observed twice

If governance-only traffic is low, the cadence should remain evidence-led rather than calendar-led.
No review should manufacture a problem where no repeated evidence exists.

## Change-Discipline Rules

TexQtic adopts the following discipline for all future governance-linter change requests:

1. no new linter rule without real observed evidence
2. clarity improvement and noise reduction are preferred before rule expansion
3. any proposed change must identify the exact evidence pattern it is addressing
4. any proposed change must be machine-checkable and explicitly supported by recorded policy or
   recorded workflow design
5. any expansion toward historical classification, Layer 1 backfill exactness, chronology,
   materiality, snapshot/log-only reconciliation judgment, or sequencing choice requires a separate
   governance decision before implementation is even considered
6. opportunistic linter growth during unrelated governance work is forbidden
7. one refinement unit must address one bounded problem class only

## Consequences

- governance-linter v2 remains the active implementation posture
- future refinements must be justified by repeated evidence rather than discomfort or preference
- documentation-only clarification is the default first response when the rule is sound
- a later v3 discussion must start from monitored evidence, not from speculative capability desire
- the machine-checkable versus human-only boundary remains preserved
- `NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`

## Relationship To Hardening Workflow And Linter v2

This monitoring design is downstream of `GOV-DESIGN-GOVERNANCE-HARDENING-WORKFLOW` and the
installed governance-linter workflow.

It does not redefine linter scope.
It defines the evidence threshold for deciding whether the installed scope should remain stable or
whether a later change discussion is justified.

It also treats `GOV-REFINE-GOVERNANCE-LINTER-V2` as the first concrete calibration example:
real-world warning noise and output clarity problems justified one bounded refinement without
expanding policy scope.

## Explicit Non-Authorization

This decision is not a v3 implementation authorization.

It does not:

- add a new linter rule
- modify `scripts/governance-lint.ts`
- modify product code, tests, schema, migrations, policies, or seeds
- authorize any expansion into human-only governance judgment
- open any implementation unit
