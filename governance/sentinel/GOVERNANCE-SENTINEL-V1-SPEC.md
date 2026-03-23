# GOVERNANCE-SENTINEL-V1-SPEC

Date: 2026-03-23
Status: ACTIVE / CANONICAL_V1_SPEC
Authority: `GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING`
Scope: Governance-only Sentinel v1 specification package. No tooling or product implementation
authorized.

## Purpose

This file is the canonical Sentinel v1 specification surface for TexQtic.

It fixes the exact artifact package, gate behavior, traceability requirements, Layer 0 interaction
rules, and the later implementation acceptance boundary for a separate Sentinel rollout unit.

## Canonical Artifact Set

Sentinel v1 consists of exactly these canonical governance artifacts:

1. `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
2. `governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md`
3. `governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md`

Supporting governance wrappers remain separate:

- Layer 0 control files
- the opening decision and unit record
- `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md`
- `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md`

## AVM-Style Gate Structure

Sentinel v1 uses one binary gate envelope only:

- `PASS`
- `FAIL`

No advisory pass, partial pass, warning-only pass, or narrative override is sufficient where a
mandatory Sentinel checkpoint applies.

Every gate run must produce one bounded gate-result artifact conforming to the canonical schema.

## Required Gate Inputs

Every Sentinel v1 run must name all of the following inputs:

- checkpoint type
- triggering unit or artifact
- files reviewed
- governing decision references
- Layer 0 snapshot reference
- canonical normalization-ledger reference when candidate-bearing work is involved
- mirror-check inputs when negative-evidence or broad-label retirement is involved

## Mandatory Check Families

Sentinel v1 must be able to evaluate these check families:

1. taxonomy/schema conformance for candidate-bearing artifacts
2. delivery-class presence on Layer 0 and candidate-bearing artifacts where required
3. mirror-check and negative-evidence presence where bounded candidate normalization requires it
4. Layer 0 internal consistency
5. spec-surface / decision / unit linkage consistency
6. allowlist and boundary conformance
7. correction-order completion before retry after a failed mandatory gate

## Mandatory Checkpoint Triggers

Sentinel v1 is mandatory before progression at these checkpoints:

1. before canonical candidate-normalization progression is recorded
2. before any Opening moves a candidate into open work
3. before any governance sync claims reconciliation completeness
4. before any Close step
5. before any Layer 0 next-action change not already compelled by the existing open unit
6. before any governance review that claims clean bounded compliance

## Gate Behavior

If all mandatory checks pass:

- emit one `PASS` result artifact
- allow the bounded governance move to continue

If any mandatory check fails:

- emit one `FAIL` result artifact
- stop progression immediately
- refuse Opening, Sync, Close, or next-action advancement
- require a correction-order artifact before retry

## Mirror-Check And Traceability Structure

Where candidate normalization or scope control depends on disproving an over-broad claim, Sentinel
v1 must require traceability across all of the following:

- exact candidate label under review
- positive evidence supporting the bounded claim
- negative evidence disproving the broader or incorrect claim
- prior exclusions that remain valid negative evidence
- exact artifact references for each evidence statement

Mirror-check means the gate must verify that the recorded disposition is mirrored by the cited
analysis artifact, the canonical normalization ledger, and any Layer 0 effect claimed for that
result.

## Machine-Checkable V1 Boundary

Sentinel v1 is machine-checkable only for these bounded surfaces:

- required field presence
- controlled-value vocabulary conformance
- required cross-reference presence
- Layer 0 delivery-class presence and `NEXT-ACTION` preservation checks
- binary pass/fail result emission
- correction-order presence after a failed mandatory run

Sentinel v1 does not replace human judgment for:

- whether the bounded candidate name is semantically truthful
- whether evidence is strong enough to split or merge candidates
- whether a later implementation boundary is product-correct

## Layer 0 Interaction Rule

Sentinel spec/design work may be open concurrently with an ACTIVE_DELIVERY implementation unit.

When that occurs:

- `OPEN-SET.md` must show both non-terminal units
- `NEXT-ACTION.md` must preserve the sole current ACTIVE_DELIVERY authorization unless a separate
  governance move changes it
- `SNAPSHOT.md` must explicitly state the concurrent posture

Sentinel must never infer a new `NEXT-ACTION` from the existence of its own spec artifacts.

## Ownership Boundaries

- Layer 0 owns operational sequencing truth
- `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md` owns canonical normalized candidate truth
- `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md` remains transitional reference only
- the Sentinel spec package owns gate definition and result-shape truth
- a later separate implementation unit would own runnable enforcement mechanisms

## Transitional Ledger Posture

The old and new normalization ledgers have fixed roles:

- `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md` remains canonical
- `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md` remains transitional only
- Sentinel v1 must read the canonical normalization ledger for authoritative normalized truth
- Sentinel v1 may reference the Step 2 ledger only as migration/history context and must not treat
  it as authoritative for new progression

## Later Implementation Acceptance Boundary

Any later separate Sentinel implementation or rollout unit must remain bounded to:

- generating the exact gate-result artifact shape defined here
- enforcing the exact checkpoint set defined here
- consuming the exact canonical artifact set defined here
- preserving the Layer 0 interaction rule defined here

That later unit must not widen into product behavior, DB/schema work, package upgrades, or broad
repo automation without a separate explicit governance decision.
