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

Implementation of the bounded v1 specification package is completed in this unit. This file now
acts as the canonical operating contract for later Sentinel implementation and no broader
automation/tooling behavior is authorized by implication.

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

Runtime correction-order artifacts emitted from the canonical template are stored at the canonical
repo path:

- `governance/correction-orders/<correction_order_id>.yaml`

These runtime correction-order instances are governed evidence artifacts consumed by
`correction_order_reference`. They are not a fourth static specification package file.

No other artifact surface is canonical for Sentinel v1.

## Canonical Check Catalog

Sentinel v1 defines exactly nine mandatory check identifiers.

| Check ID | Canonical Name | Meaning |
| --- | --- | --- |
| `SENTINEL-V1-CHECK-001` | `candidate_normalization_schema_conformance` | Confirms that candidate-bearing artifacts and the canonical normalization reference use required fields, controlled vocabularies, and exact bounded terminology. |
| `SENTINEL-V1-CHECK-002` | `delivery_class_presence` | Confirms that required delivery-class fields exist and use one approved delivery class value on Layer 0 or candidate-bearing artifacts as applicable. |
| `SENTINEL-V1-CHECK-003` | `mirror_check_traceability` | Confirms that the claimed bounded disposition is mirrored across the cited analysis artifact, canonical normalization ledger, and any Layer 0 effect claimed. |
| `SENTINEL-V1-CHECK-004` | `negative_evidence_review` | Confirms that any broad-label retirement, disproval, or scope-blocking claim names exact negative evidence and any still-valid prior exclusions. |
| `SENTINEL-V1-CHECK-005` | `layer0_consistency` | Confirms that `OPEN-SET.md`, `NEXT-ACTION.md`, and `SNAPSHOT.md` remain internally consistent with one another and do not create unauthorized sequencing drift. |
| `SENTINEL-V1-CHECK-006` | `allowlist_boundary_conformance` | Confirms that the bounded unit edits only the exact authorized surfaces and does not drift into non-allowlisted files or broader scope. |
| `SENTINEL-V1-CHECK-007` | `execution_log_linkage_applicability` | Confirms that when a governance move claims execution-log linkage or a normalized row cites an execution-log reference, the cited linkage exists and matches the claimed disposition. |
| `SENTINEL-V1-CHECK-008` | `spec_surface_linkage_consistency` | Confirms that the doctrine decision, Sentinel spec package, Layer 1 unit, and gate-result schema/template remain terminologically and structurally consistent. |
| `SENTINEL-V1-CHECK-009` | `correction_order_completion` | Confirms that a prior failed mandatory gate has an exact correction-order artifact and that all listed retry prerequisites are satisfied before rerun. |

No additional check identifiers are part of Sentinel v1.

## AVM-Style Gate Structure

Sentinel v1 uses one binary gate envelope only:

- `PASS`
- `FAIL`

No advisory pass, partial pass, warning-only pass, or narrative override is sufficient where a
mandatory Sentinel checkpoint applies.

Every gate run must produce one bounded gate-result artifact conforming to the canonical schema.

Each mandatory check is binary only:

- the check itself returns `PASS` or `FAIL`
- the overall gate result returns `PASS` only if every required check returns `PASS`
- the overall gate result returns `FAIL` if any required check returns `FAIL`

There is no warning tier, advisory tier, soft-fail tier, or human narrative override tier in
Sentinel v1.

## Required Gate Inputs

Every Sentinel v1 run must name all of the following inputs:

- checkpoint type
- triggering unit or artifact
- files reviewed
- governing decision references
- Layer 0 snapshot reference
- canonical normalization-ledger reference when candidate-bearing work is involved
- mirror-check inputs when negative-evidence or broad-label retirement is involved

If a required input is absent, the relevant mandatory check fails.

## Mandatory Check Families

Sentinel v1 must be able to evaluate these check families:

1. taxonomy/schema conformance for candidate-bearing artifacts
2. delivery-class presence on Layer 0 and candidate-bearing artifacts where required
3. mirror-check and negative-evidence presence where bounded candidate normalization requires it
4. Layer 0 internal consistency
5. spec-surface / decision / unit linkage consistency
6. allowlist and boundary conformance
7. correction-order completion before retry after a failed mandatory gate

## Exact Per-Check Pass / Fail Semantics

### `SENTINEL-V1-CHECK-001` — `candidate_normalization_schema_conformance`

`PASS` only if:

- the subject uses the canonical normalization ledger when authoritative normalized truth is
  required
- all required normalization fields are present where candidate-bearing content is under review
- every controlled value matches the approved taxonomy/disposition/delivery-class vocabulary
- bounded terminology is exact and no retired broad label is presented as active truth

`FAIL` if any of the above is false.

### `SENTINEL-V1-CHECK-002` — `delivery_class_presence`

`PASS` only if:

- every reviewed Layer 0 non-terminal unit shows one delivery class
- `NEXT-ACTION.md` shows the currently authorized action's delivery class
- every candidate-bearing artifact under progression review shows delivery class where doctrine
  requires it

`FAIL` if any required delivery class is absent, duplicated, or outside the approved vocabulary.

### `SENTINEL-V1-CHECK-003` — `mirror_check_traceability`

`PASS` only if:

- the disposition claimed in the subject matches the cited analysis artifact
- the cited canonical normalization row matches the same bounded candidate truth
- any Layer 0 effect claimed is mirrored by the actual Layer 0 files

`FAIL` if any cited surface contradicts or omits the claimed bounded result.

### `SENTINEL-V1-CHECK-004` — `negative_evidence_review`

`PASS` only if:

- every broad-label retirement or disproval claim names exact negative evidence
- any still-valid prior governance exclusions are named where relevant
- the review output states whether the broader claim is disproved, merely unproven, or still open

`FAIL` if negative evidence is replaced by silence, implication, or broad prose.

### `SENTINEL-V1-CHECK-005` — `layer0_consistency`

`PASS` only if:

- `OPEN-SET.md`, `NEXT-ACTION.md`, and `SNAPSHOT.md` agree on the current ACTIVE_DELIVERY unit
- concurrent governance-only open units do not implicitly replace `NEXT-ACTION`
- counts, delivery-class summaries, and descriptive text do not contradict the table truth

`FAIL` if Layer 0 creates ambiguity, contradiction, or unauthorized sequencing drift.

### `SENTINEL-V1-CHECK-006` — `allowlist_boundary_conformance`

`PASS` only if:

- every modified file is explicitly allowlisted for the bounded unit
- no out-of-scope artifact or product surface is changed
- no created file invents a vague or non-canonical surface outside the bounded package

`FAIL` if any edit breaches the allowlist or widens scope.

### `SENTINEL-V1-CHECK-007` — `execution_log_linkage_applicability`

`PASS` only if:

- where execution-log linkage is claimed, the cited execution-log reference exists and matches the
  bounded governance result
- where no execution-log linkage is applicable yet, the gate result marks that status explicitly as
  `not_applicable`

`FAIL` if required linkage is missing or if applicability is misrepresented.

### `SENTINEL-V1-CHECK-008` — `spec_surface_linkage_consistency`

`PASS` only if:

- the doctrine decision, opening decision, unit record, spec surface, schema surface, and
  correction-order surface use consistent terminology and scope boundaries
- the spec package does not authorize anything broader than doctrine already allows

`FAIL` if the package contradicts doctrine, widens scope, or leaves internal terms mismatched.

### `SENTINEL-V1-CHECK-009` — `correction_order_completion`

`PASS` only if:

- every prior failed mandatory gate has one exact correction-order artifact
- every listed retry precondition is satisfied before rerun
- the retry cites the completed correction-order artifact explicitly using
  `governance/correction-orders/<correction_order_id>.yaml`

`FAIL` if retry occurs without completed correction-order fulfillment.

## Mandatory Checkpoint Triggers

Sentinel v1 is mandatory before progression at these checkpoints:

1. before canonical candidate-normalization progression is recorded
2. before any Opening moves a candidate into open work
3. before any governance sync claims reconciliation completeness
4. before any Close step
5. before any Layer 0 next-action change not already compelled by the existing open unit
6. before any governance review that claims clean bounded compliance

## Trigger-To-Check Matrix

| Trigger | Required Checks |
| --- | --- |
| `candidate_normalization_progression` | `001`, `002`, `003`, `004`, `006`, `007` when execution-log linkage is claimed, `008` |
| `opening_progression` | `001` when candidate-bearing, `002`, `003` when promotion is candidate-driven, `004` when broad-label retirement or disproval is involved, `005`, `006`, `008` |
| `governance_sync_progression` | `005`, `006`, `007`, `008`, `009` if retry followed a prior fail |
| `close_progression` | `005`, `006`, `007` where applicable, `008`, `009` if retry followed a prior fail |
| `layer0_next_action_change` | `002`, `005`, `006`, `008`, `009` if retry followed a prior fail |
| `clean_governance_review_claim` | `003`, `004`, `005`, `006`, `007` where applicable, `008` |

`001` through `009` above are shorthand references to `SENTINEL-V1-CHECK-001` through
`SENTINEL-V1-CHECK-009`.

## Gate Behavior

If all mandatory checks pass:

- emit one `PASS` result artifact
- allow the bounded governance move to continue

If any mandatory check fails:

- emit one `FAIL` result artifact
- stop progression immediately
- refuse Opening, Sync, Close, or next-action advancement
- require a correction-order artifact before retry

Failure is directive, not advisory. Sentinel v1 failure means the governance move is not lawfully
progressable until correction order is complete.

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

## Exact Negative-Evidence Review Output Shape

Where `SENTINEL-V1-CHECK-004` applies, the gate-result artifact must record all of the following:

- `negative_evidence_required`: `true`
- `broad_claim_under_review`: exact label being disproved, retired, or bounded
- `negative_evidence_references`: exact artifact paths or unit IDs used to disprove or narrow the
  claim
- `prior_exclusion_references`: exact exclusions still acting as valid negative evidence, or
  `not_applicable`
- `negative_evidence_verdict`: exactly one of `broad_claim_disproved`, `broad_claim_not_proven`,
  or `not_applicable`

If this output shape is incomplete where required, `SENTINEL-V1-CHECK-004` fails.

## Machine-Checkable V1 Boundary

Sentinel v1 is machine-checkable only for these bounded surfaces:

- required field presence
- controlled-value vocabulary conformance
- required cross-reference presence
- Layer 0 delivery-class presence and `NEXT-ACTION` preservation checks
- binary pass/fail result emission
- correction-order presence after a failed mandatory run

## Artifact Classes

### Machine-validated artifacts

- gate-result artifacts conforming to the canonical schema
- correction-order artifacts conforming to the canonical template
- field/vocabulary/linkage presence across the canonical spec package and Layer 0 surfaces

### Human-authored but Sentinel-checked artifacts

- governance decisions
- Layer 1 unit records
- Layer 0 narrative summaries
- candidate analysis artifacts and normalization rows

These remain authored by humans, but Sentinel checks their bounded structure, linkage, and exact
required fields where applicable.

### Later automation/tooling artifacts

- any future runnable validator
- any future hook, CI job, linter integration, or scripted gate runner
- any future machine-generated gate-result emitter

These are not part of the v1 specification package itself and require a separate implementation
unit.

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
- doctrine decisions own governance authority and non-negotiable rule truth
- `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md` owns canonical normalized candidate truth
- `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md` remains transitional reference only
- the Sentinel spec package owns v1 gate definition, check catalog, trigger matrix, result-shape,
  and correction-order truth
- a later separate implementation unit would own runnable enforcement mechanisms

## Transitional Ledger Posture

The old and new normalization ledgers have fixed roles:

- `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md` remains canonical
- `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md` remains transitional only
- Sentinel v1 must read the canonical normalization ledger for authoritative normalized truth
- Sentinel v1 may reference the Step 2 ledger only as migration/history context and must not treat
  it as authoritative for new progression

If a new progression artifact cites the Step 2 ledger as its authoritative normalization source,
`SENTINEL-V1-CHECK-001` fails.

## Exact Candidate-Normalization Validation Requirements

Whenever candidate-bearing work is under review, Sentinel v1 must confirm all of the following:

- the authoritative normalization reference points to
  `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md`
- the cited row contains exact candidate name, candidate kind, disposition, delivery class,
  negative evidence summary, next lawful step, confidence, and last validated marker
- any broad-label retirement claim is mirrored by both the row and the cited analysis artifact
- any execution-log linkage claim named by the row is accurate where such linkage is cited

## Exact Layer 0 Consistency Requirements

Sentinel v1 must validate all of the following whenever Layer 0 is implicated:

- the `OPEN-SET.md` table, summary counts, and descriptive notes do not contradict one another
- `NEXT-ACTION.md` names one currently authorized action only
- concurrent open governance-only units do not implicitly replace the ACTIVE_DELIVERY item
- `SNAPSHOT.md` reflects the same current open-set posture and delivery-steering posture

## Exact Allowlist / Boundary Requirements

Sentinel v1 must fail the boundary check if any of the following occur:

- a non-allowlisted file is edited
- a new file is created outside the bounded canonical package
- the package introduces product code, scripts, CI, hook, or automation behavior
- the package broadens from specification into implementation authority

## Exact Execution-Log Linkage Rule

Execution-log linkage is required only where the reviewed artifact explicitly claims such linkage.

Sentinel v1 must not invent an execution-log requirement for artifacts that are still in
pre-sync/pre-close posture. It must, however, fail any artifact that claims execution-log support
without a matching cited linkage.

## Later Implementation Acceptance Boundary

Any later separate Sentinel implementation or rollout unit must remain bounded to:

- generating the exact gate-result artifact shape defined here
- implementing only the exact check catalog defined here
- enforcing the exact checkpoint set defined here
- consuming the exact canonical artifact set defined here
- preserving the Layer 0 interaction rule defined here

That later unit must not add new check identifiers, new trigger classes, new artifact classes, or
new ownership semantics unless a separate governance decision first changes this specification.

That later unit must not widen into product behavior, DB/schema work, package upgrades, or broad
repo automation without a separate explicit governance decision.
