# GOV-POLICY-HISTORICAL-LAYER1-RECONCILIATION

Decision ID: GOV-POLICY-HISTORICAL-LAYER1-RECONCILIATION
Title: Historical Layer 1 gaps must be corrected only by the minimum truthful governance mechanism
Status: DECIDED
Date: 2026-03-19
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state already records:

- `PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED`
- `PRODUCT-DEC-G026-H-PREREQUISITE-POSTURE`
- `PRODUCT-DEC-G026-V1-FIRST-STREAM-DISPOSITION`
- `GOV-RECONCILE-BOUNDED-G026-V1-HISTORY`

Those records establish that:

- RFQ remains closed at the pre-negotiation cap
- Wave 4 remains ratified and bounded
- bounded G-026 v1 historical implementation evidence exists
- bounded G-026 v1 did not open as a new implementation unit
- bounded G-026 v1 historical truth was reconciled through `SNAPSHOT.md` and `EXECUTION-LOG.md`
- Layer 1 was intentionally not backfilled for bounded G-026 v1 because the proved history spans
  multiple distinct historical subunits and no single truthful replacement unit could be created
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`

Current doctrine already implies several important constraints:

1. Layer 0 is the sole operational truth for what is open and what is next.
2. Layer 3 is append-only historical context and must never override Layer 0, Layer 1, or Layer 2.
3. closed units stay closed and must not be reopened implicitly.
4. governance units must not smuggle implementation authorization.
5. product-deferred and design-gated items must not be forced open merely to make the record look tidy.

However, the doctrine does not yet define the authoritative rule for handling a different class of
drift: when historical implementation reality is provable but canonical Layer 1 unit coverage is
missing, incomplete, or not truthfully reconstructable.

This decision fills that policy gap.

## Problem Statement

TexQtic needs a conservative, reusable rule for deciding among three different responses when
historical implementation evidence exists but Layer 1 coverage is absent or incomplete:

1. backfill the missing historical Layer 1 unit record
2. reconcile historical truth through Layer 0 and Layer 3 only
3. forbid reconstruction entirely because the evidence is too weak or would require fabrication

Without a formal rule, future reconciliation work risks unsafe convenience behavior:

- inventing a false single-unit history from multi-unit evidence
- opening a fake new implementation unit to explain already-present code
- overstating historical certainty from secondary artifacts alone
- understating current Layer 0 truth when proven history materially affects carry-forward context

## Evidence Hierarchy

Historical reconciliation must use the following evidence hierarchy in descending authority:

1. canonical Layer 1 unit records and their exact unit IDs, scopes, statuses, and referenced
   implementation or verification evidence
2. Layer 2 decisions and Layer 0 control-plane records that explicitly describe the same bounded
   scope or its governed disposition
3. Layer 3 execution-log entries recorded by Governance OS units
4. current redaction-safe repository evidence directly showing the installed bounded behavior
5. archived or legacy secondary governance artifacts preserved for historical context only

The hierarchy is directional.

- lower-ranked evidence may support reconciliation
- lower-ranked evidence must never override higher-ranked canonical truth
- secondary artifacts alone are insufficient to invent a precise historical unit identity

## Considered Options

### Option A — Always backfill missing Layer 1 history when any historical implementation evidence exists

Rejected.

Reason:
- this would encourage convenience-driven reconstruction
- it would collapse multi-unit histories into synthetic single records
- it would blur the difference between exact reconstruction and broad historical inference

### Option B — Never backfill Layer 1 and always use snapshot/log reconciliation only

Rejected.

Reason:
- some historical gaps can be corrected exactly and truthfully
- refusing exact backfill when identity, scope, and chronology are provable would preserve an
  avoidable canonical defect

### Option C — Use the minimum truthful correction mechanism based on evidence quality and identity precision

Selected.

Reason:
- this preserves historical truth without inventing replacement history
- it allows exact backfill when exact identity is truly provable
- it prefers Layer 0 plus Layer 3 reconciliation when historical reality is proven but one-to-one
  Layer 1 reconstruction is not truthful
- it forbids action when evidence is too weak to support any authoritative correction

## Decision

TexQtic adopts the following authoritative rule:

**Historical Layer 1 gaps must be corrected only by the minimum truthful governance mechanism that
the available evidence can support.**

This rule means:

1. exact historical Layer 1 backfill is allowed only when the exact canonical historical unit
   identity is provable without invention
2. snapshot/log-only reconciliation is the correct mechanism when historical implementation reality
   is provable but no single truthful Layer 1 reconstruction exists
3. synthetic historical reconstruction is forbidden whenever it would invent a unit, collapse
   multiple units into one, guess chronology, or create hidden implementation authorization
4. no governance reconciliation may open a new implementation unit merely to explain already-
   present code

## Policy Rules

### Rule 1 — Truthfulness Standard

TexQtic must prefer truthful incompleteness over convenient false completeness.

If the record cannot be made exact without invention, the repository must say so explicitly rather
than reconstructing a cleaner but false history.

### Rule 2 — Minimum-Correction Principle

Historical correction must stop at the least powerful mechanism that makes the governed record true.

Allowed correction order:

1. exact Layer 1 backfill when exact identity is provable
2. Layer 0 plus Layer 3 reconciliation when current truth needs correction but exact Layer 1
   reconstruction is not truthful
3. no historical correction claim when evidence remains below threshold

### Rule 3 — Evidence Threshold For Any Historical Layer 1 Backfill

Layer 1 backfill is valid only if all of the following are provable from non-conflicting evidence:

1. the exact historical unit ID or exact canonical unit identity
2. the unit's bounded scope, such that it does not collapse adjacent or later work
3. the unit's terminal historical posture, including enough evidence to support its closed state
4. chronology strong enough to place the unit in governance history without guessing
5. a one-to-one mapping between the historical work and the proposed Layer 1 record

If any of these are missing, exact Layer 1 backfill is not authorized.

### Rule 4 — When Layer 1 Backfill Is Required

Layer 1 backfill is required when all of the Rule 3 conditions are met and the absence of the exact
historical unit record leaves canonical governance materially incomplete or misleading for future
audits, unit dependency reasoning, or closed-unit integrity.

This is Case A.

Exact identity is provable, a bounded historical unit can be reconstructed one-to-one, and the
missing Layer 1 record should be restored rather than replaced by a broader summary.

### Rule 5 — When Layer 1 Backfill Is Optional

Layer 1 backfill is optional when all of the Rule 3 conditions are met but current Layer 0 and
Layer 2 truth are already materially correct and the missing Layer 1 record does not presently
distort sequencing, gating, or audit interpretation.

In that case, a later dedicated reconciliation unit may backfill the exact historical unit for
audit completeness, but snapshot/log-only carry-forward may remain temporarily sufficient.

### Rule 6 — When Layer 1 Backfill Is Forbidden

Layer 1 backfill is forbidden in any of the following conditions:

1. the evidence proves real implementation happened but spans multiple distinct historical subunits
   rather than one exact unit identity
2. the exact historical unit ID, scope, chronology, or terminal posture cannot be proved without
   inference
3. the proposed backfill would merge distinct work into one replacement unit
4. the proposed backfill would invent dates, commits, statuses, or unit IDs
5. the proposed backfill would effectively reopen or newly open implementation scope

This is Case B and also part of Case C.

Bounded G-026 v1 is the governing example of this rule: historical implementation reality was
provable, but the evidence spanned multiple distinct subunits, so a synthetic single Layer 1 record
would have been less truthful than leaving Layer 1 unchanged.

### Rule 7 — When Snapshot/Log Reconciliation Is The Correct Minimum Truthful Mechanism

Snapshot/log-only reconciliation is the correct mechanism when all of the following are true:

1. historical implementation reality is provable at the bounded scope being described
2. current Layer 0 carry-forward truth would be materially understated or misleading without
   correction
3. no exact one-to-one Layer 1 backfill is authorized under Rules 3 through 6

This is Case B and Case D.

Under those conditions, TexQtic must:

1. keep `OPEN-SET.md` unchanged unless a real non-terminal unit is actually changing status
2. keep `NEXT-ACTION.md` unchanged unless the authorized next action truly changes
3. refresh `SNAPSHOT.md` if current carry-forward truth is materially understated
4. append `EXECUTION-LOG.md` with the reconciliation event and the reason Layer 1 remained
   untouched

### Rule 8 — When Neither Backfill Nor Snapshot/Log Reconciliation Should Occur

If evidence is partial, ambiguous, or contradictory, TexQtic must not assert a stronger historical
claim than the evidence can support.

This is Case C.

In that condition:

1. no Layer 1 backfill is authorized
2. no snapshot/log entry may claim historical closure as fact
3. the gap remains unresolved until stronger evidence exists

### Rule 9 — Anti-Fabrication Rule

TexQtic must never fabricate a false single-unit history from multi-unit evidence.

The following are forbidden:

- creating one replacement Layer 1 unit to summarize several distinct historical units
- using a new implementation opening to rationalize old already-present code
- inferring a canonical unit ID from a theme, TECS family, or design topic alone
- using legacy trackers or archive artifacts alone to manufacture exact Layer 1 truth

### Rule 10 — Effect On Future Governance Reconciliation Tasks

All future governance reconciliation tasks must explicitly classify the situation before editing
anything:

1. Case A — exact historical Layer 1 identity is provable
2. Case B — historical implementation is provable but spans multiple distinct subunits
3. Case C — historical evidence is partial or ambiguous
4. Case D — current Layer 0 truth materially understates proven history
5. Case E — the gap could tempt a fake new implementation opening

After classification, the task must apply the minimum truthful mechanism from this decision.
No reconciliation task may treat historical drift as implicit authorization for new work.

## Prohibited Actions

This policy explicitly forbids:

- opening a new implementation unit merely to explain already-present historical code
- reopening a closed unit without a new explicit governance authorization
- fabricating a synthetic historical unit from multi-unit evidence
- guessing dates, commits, or statuses to make Layer 1 look complete
- treating archived secondary sources as operational truth
- changing `OPEN-SET.md` or `NEXT-ACTION.md` when no actual non-terminal state changed

## Consequences

- TexQtic now has a formal policy for this class of governance drift
- future audits can distinguish between exact backfill, snapshot/log reconciliation, and no-action
  due to insufficient evidence
- bounded G-026 v1 becomes the canonical worked example of when synthetic Layer 1 reconstruction is
  forbidden and snapshot/log reconciliation is the truthful minimum correction
- Layer 0 remains protected from misleading simplification, and Layer 1 remains protected from
  convenience-driven fabrication

## Relationship To Prior Reconciliation Work

This decision formalizes the rule that was applied in `GOV-RECONCILE-BOUNDED-G026-V1-HISTORY`.

That reconciliation correctly:

- recognized proven bounded historical implementation reality
- refused to invent a single replacement Layer 1 record from multi-unit evidence
- corrected `SNAPSHOT.md` and `EXECUTION-LOG.md` without changing sequencing
- preserved the non-opening posture and the broader `G-026-A` deferral

This decision does not reopen that work. It records why that reconciliation method was correct and
how the same class of drift must be handled in the future.

## Effect On Future Governance Audits And Reconciliations

Future audits and reconciliations must now ask, in order:

1. Is the exact historical Layer 1 identity provable one-to-one?
2. If not, is historical implementation reality still provable at a bounded level?
3. If yes, does Layer 0 materially understate that proven history?
4. If yes, is snapshot/log-only reconciliation the minimum truthful correction?
5. If not, must the gap remain unresolved because evidence is still too weak?

This policy remains governance-only guidance. It does not authorize product work, schema changes,
test changes, implementation unit opening, or historical unit backfill by implication.